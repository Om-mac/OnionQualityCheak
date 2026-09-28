import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, LinkIcon, AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import InspectionStudio from '../../components/InspectionStudio';
import { api } from '../../lib/api';
import { useInspection } from '../../context/InspectionContext';
import { WorkflowHeader } from '../../components/procurement/WorkflowHeader';

export default function AIAnalysis() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeInspection, setActiveInspectionId, saveAiAnalysis } = useInspection();

  const [savedToInspection, setSavedToInspection] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  /* Bulbs the detector segmented but could not confidently judge. They are
     excluded from the graded counts, so the operator needs to see them — a
     9-bulb tally from a 10-bulb frame is not the same as a 9-bulb frame. */
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    const urlId = searchParams.get('inspectionId');
    if (urlId && urlId !== activeInspection?.id) {
      setActiveInspectionId(urlId);
    }
  }, [searchParams, activeInspection?.id, setActiveInspectionId]);

  const handleVisionResult = async (result: any) => {
    setSavedToInspection(false);
    setSaveErr('');

    /* Counts must reflect what the detector actually saw.
       `counts.healthy || 12` style defaulting was wrong twice over: a genuine 0
       is falsy, so `undersized: 0` silently became 2 and `sprouted: 0` became 1;
       and a missing count invented bulbs that were never in the frame. Both
       corrupt the grade and the audit trail. Read each count with Number(), and
       fall back only to a real tally of the detections we were handed. */
    const num = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };
    const raw = result.counts || {};
    const dets: any[] = Array.isArray(result.detections) ? result.detections : [];

    const tally = (key: string) =>
      dets.filter((d) => String(d?.class || '').toLowerCase() === key).length;
    const pick = (upper: string, lower: string, key: string) =>
      raw[upper] != null || raw[lower] != null
        ? num(raw[upper] ?? raw[lower])
        : tally(key);

    const healthyCount = pick('Healthy', 'healthy', 'healthy');
    const damagedCount = pick('Damaged', 'damaged', 'damaged');
    const rottenCount = pick('Rotten', 'rotten', 'rotten');
    const sproutedCount = pick('Sprouted', 'sprouted', 'sprouted');
    const undersizedCount = pick('Undersized', 'undersized', 'undersized');

    const counted = healthyCount + damagedCount + rottenCount + sproutedCount + undersizedCount;
    const totalDetected = num(result.total) || counted;

    // Bulbs the detector would not commit to. Reported, never graded.
    setReviewCount(
      num(result.flaggedForReview) ||
      dets.filter((d) => d?.review === true).length,
    );

    /* Confidence comes from the model or is averaged from the detections —
       never from a hardcoded constant. */
    const detConf = dets.length
      ? dets.reduce((a, d) => a + (Number(d?.confidence) || 0), 0) / dets.length
      : 0;
    const confidence = result.confidence
      ? Math.round(result.confidence * 100)
      : Math.round(detConf * 100);

    try {
      await saveAiAnalysis({
        totalDetected,
        healthyCount,
        damagedCount,
        rottenCount,
        sproutedCount,
        undersizedCount,
        averageConfidence: confidence,
        modelName: result.modelName || 'OnionCheck YOLOv8 Detector',
        modelVersion: 'v2.4',
        detections: result.detections || [],
      });
      setSavedToInspection(true);
    } catch (e: any) {
      setSaveErr(e.message || 'Could not save vision result to current inspection.');
    }
  };

  const handleRunDemoAnalysis = async () => {
    if (!activeInspection) {
      setSaveErr('No active inspection. Please create an inspection first.');
      return;
    }

    setIsRunning(true);
    setSaveErr('');
    setSavedToInspection(false);
    setReviewCount(0);

    try {
      // Use demo data - simulates AI analysis
      await saveAiAnalysis({
        totalDetected: 100,
        healthyCount: 85,
        damagedCount: 8,
        rottenCount: 3,
        sproutedCount: 2,
        undersizedCount: 2,
        averageConfidence: 89,
        modelName: 'OnionSure Demo AI',
        modelVersion: 'v1.0-demo',
        detections: [],
      });
      setSavedToInspection(true);
    } catch (e: any) {
      setSaveErr(e.message || 'Failed to run AI analysis');
    } finally {
      setIsRunning(false);
    }
  };

  const handleContinue = () => {
    if (activeInspection) {
      navigate(`/quality/fusion/${activeInspection.id}`);
    } else {
      navigate('/quality/fusion');
    }
  };

  /* "Continue to Fusion Intelligence" must not hinge on a single transient flag.
     If an analysis already exists for this inspection — saved on an earlier
     visit, or the session is already past the AI step — the operator has to be
     able to move on. Otherwise a page reload, or an analysis persisted by the
     live camera, would strand them on this screen with a dead button. */
  const ANALYSIS_DONE = [
    'AI_ANALYSIS_COMPLETED', 'FUSION_PENDING', 'FUSION_COMPLETED',
    'GRADE_ASSIGNED', 'CERTIFICATE_GENERATED', 'COMPLETED',
  ];
  const analysisReady =
    savedToInspection ||
    Boolean(activeInspection?.aiAnalysis) ||
    ANALYSIS_DONE.includes(String(activeInspection?.status || ''));

  return (
    <div className="space-y-5">
      <WorkflowHeader />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl">
            <Sparkles size={22} className="text-fresh" /> AI Computer Vision Analysis
          </h1>
          <p className="text-sm text-muted">Classify onions into Healthy, Damaged, Rotten, Sprouted, and Undersized.</p>
        </div>

        {activeInspection ? (
          <div className="flex items-center gap-1.5 rounded-xl border border-forest/20 bg-sb-50 px-3 py-1.5 text-[12px] font-semibold text-forest">
            <LinkIcon size={12} />
            Inspection <code className="font-mono text-[11px] font-bold">{activeInspection.inspectionNumber || activeInspection.id}</code>
            {savedToInspection && <span className="ml-1 text-forest font-bold">· Saved ✓</span>}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-xl border border-amber/30 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700">
            <AlertCircle size={12} />
            No active inspection selected
          </div>
        )}
      </div>

      {saveErr && (
        <div className="rounded-xl border border-reject/25 bg-reject/5 px-4 py-2.5 text-sm font-medium text-reject">
          {saveErr}
        </div>
      )}

      {reviewCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber/30 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>
            <strong>{reviewCount}</strong> bulb{reviewCount === 1 ? '' : 's'} could not be confidently
            graded and {reviewCount === 1 ? 'is' : 'are'} excluded from the counts below. Inspect
            {reviewCount === 1 ? ' it' : ' them'} by hand — a low-confidence call is neither a pass nor a defect.
          </span>
        </div>
      )}

      <InspectionStudio
        role="officer"
        title="AI Vision Inspection"
        subtitle="Upload or capture an onion photo — the detector scans for defects in real time."
        onResult={handleVisionResult}
      />

      {/* Action Footer */}
      <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-950">
          <CheckCircle2 size={16} className="text-forest" />
          {analysisReady ? 'AI Analysis saved successfully.' : 'Run analysis using uploaded images or demo mode.'}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRunDemoAnalysis}
            disabled={isRunning || !activeInspection}
            className="flex items-center gap-2 rounded-xl border-2 border-forest bg-white px-5 py-2.5 text-sm font-bold text-forest shadow-sm hover:bg-forest/5 transition disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Run Demo Analysis
              </>
            )}
          </button>

          <button
            onClick={handleContinue}
            disabled={!analysisReady}
            title={analysisReady ? 'Go to Fusion Intelligence' : 'Run or save an AI analysis first'}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-forest to-darkgreen px-6 py-3 text-sm font-extrabold text-white shadow-md hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Fusion Intelligence <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
