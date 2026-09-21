/**
 * Fusion.tsx — Fusion Intelligence
 *
 * Entry:  /quality/fusion   (sidebar link, no URL param)
 *         /quality/fusion/:inspectionId  (direct link from history/assessment)
 *
 * Current-inspection resolution (in order):
 *   1. URL param :inspectionId        — direct link, highest priority
 *   2. localStorage onionsure_current_inspection_id — set by NewInspection.tsx
 *   3. Most recent inspection from API — fallback if neither is available
 *
 * The InspectionPicker list is GONE. The officer sees only the CURRENT inspection.
 *
 * Evidence cases (all resolved server-side via GET /fusion/evidence/:id):
 *   CASE 0 — no vision, no IoT   → "Awaiting Evidence"  — button disabled
 *   CASE 1 — IoT only            → IoT-based assessment
 *   CASE 2 — Vision only         → Vision-based assessment
 *   CASE 3 — Both                → Full multimodal fusion
 *
 * Processing: 5–6 s sequential stage animation while backend runs in parallel.
 * Idempotency: /fusion/commit is an upsert — re-runs overwrite, never duplicate.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitMerge, Eye, Wind, CheckCircle2, AlertTriangle, ShieldCheck,
  Loader2, ArrowRight, RefreshCw, Info, AlertCircle, Zap, Package,
  User, MapPin, Leaf, Award
} from 'lucide-react';
import { api } from '../../lib/api';
import { Card, Spinner } from '../../components/ui';
import type { FusionResult } from '../../lib/types';
import { useInspection } from '../../context/InspectionContext';
import { WorkflowHeader } from '../../components/procurement/WorkflowHeader';

/* ─── localStorage key (written by NewInspection.tsx) ───────────── */
const LS_INSP_KEY = 'onionsure_current_inspection_id';

/* ─── Evidence type ──────────────────────────────────────────────── */
type EvidenceResp = Awaited<ReturnType<typeof api.getFusionEvidence>>;
type Phase = 'resolving' | 'loading' | 'ready' | 'processing' | 'done' | 'error';

/* ─── Processing stages  ~5–6 s total ───────────────────────────── */
const STAGES = [
  { label: 'Verifying current inspection',     ms: 900  },
  { label: 'Loading Vision evidence',           ms: 900  },
  { label: 'Loading IoT evidence',              ms: 900  },
  { label: 'Applying grading rules',            ms: 1000 },
  { label: 'Computing quality assessment',      ms: 900  },
  { label: 'Assessment complete',               ms: 600  },
] as const;

function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

/* ─── Grade helpers ──────────────────────────────────────────────── */
const gradeColor = (g = '') =>
  g.includes('GRADE A') ? 'text-forest' : g.includes('URS') ? 'text-amber-600' : 'text-reject';

const gradeBorder = (g = '') =>
  g.includes('GRADE A')
    ? 'border-forest/30 bg-gradient-to-br from-mint/40 to-white'
    : g.includes('URS')
    ? 'border-amber/35 bg-gradient-to-br from-amber-50/50 to-white'
    : 'border-reject/30 bg-gradient-to-br from-rose-50/50 to-white';

/* ════════════════════════════════════════════════════════════════════
   Root component — resolves current inspectionId then delegates
════════════════════════════════════════════════════════════════════ */
export default function Fusion() {
  const { inspectionId: paramId } = useParams<{ inspectionId?: string }>();

  // Priority 1 — URL param (direct link from history / SmartAssessment)
  // Priority 2 — localStorage written by NewInspection.tsx
  // Priority 3 — LOCKED (no fallback to old inspections)
  const resolvedId = paramId || localStorage.getItem(LS_INSP_KEY) || null;

  if (!resolvedId) {
    return (
      <div className="space-y-5">
        <PageHeader />
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-muted/20 bg-gray-50">
            <GitMerge size={28} className="text-muted/40" />
          </div>
          <h3 className="text-base font-bold text-ink">Fusion Intelligence Locked</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            No active inspection found. Start a new inspection to enable quality assessment.
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
            Fusion will never use previous inspection data.
          </p>
          <Link to="/quality/new-inspection" className="btn-primary mt-5 inline-flex items-center gap-2">
            <ArrowRight size={15} /> Start New Inspection
          </Link>
        </Card>
      </div>
    );
  }

  return <FusionWorkspace inspectionId={resolvedId} />;
}

/* ─── Reusable page heading ──────────────────────────────────────── */
function PageHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">
        <GitMerge size={13} /> Fusion Intelligence
      </div>
      <h1 className="mt-1 text-xl font-extrabold text-ink md:text-2xl">
        Quality Assessment Fusion
      </h1>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   FusionWorkspace — the entire page scoped to one inspectionId
════════════════════════════════════════════════════════════════════ */
function FusionWorkspace({ inspectionId }: { inspectionId: string }) {
  const nav = useNavigate();
  const { activeInspection, saveFusionResult } = useInspection();

  const [phase,       setPhase]      = useState<Phase>('loading');
  const [evidence,    setEvidence]   = useState<EvidenceResp | null>(null);
  const [fusion,      setFusion]     = useState<FusionResult | null>(null);
  const [stageIdx,    setStageIdx]   = useState(-1);
  const [errMsg,      setErrMsg]     = useState('');
  const [committing,  setCommitting] = useState(false);
  const [committed,   setCommitted]  = useState<{ recordId: string; at: string } | null>(null);
  const [certBusy,    setCertBusy]   = useState(false);

  /* ── Generate the quality certificate for this inspection ────── */
  const generateCert = async () => {
    setCertBusy(true);
    setErrMsg('');
    try {
      const cert = await api.generateCertificate({ inspectionId });
      const certId = cert?.id || cert?.certificate?._id || cert?.certificateNumber;
      nav(certId ? `/certificate/${certId}` : '/quality/certificates');
    } catch (e: any) {
      setErrMsg(e.message || 'Failed to generate certificate.');
    } finally {
      setCertBusy(false);
    }
  };

  /* ── Load evidence on mount / inspectionId change ────────────── */
  useEffect(() => {
    let alive = true;
    setPhase('loading');
    setEvidence(null);
    setFusion(null);
    setCommitted(null);
    setErrMsg('');

    api.getFusionEvidence(inspectionId)
      .then((ev) => {
        if (!alive) return;
        setEvidence(ev);
        if (ev.storedFusion) {
          const sf = ev.storedFusion as any;
          setFusion(sf);
          if (sf.persistedAt) setCommitted({ recordId: sf.id || 'committed', at: sf.persistedAt });
          setPhase('done');
        } else {
          setPhase('ready');
        }
      })
      .catch((e: any) => {
        if (!alive) return;
        setErrMsg(e.message || 'Failed to load inspection evidence.');
        setPhase('error');
      });

    return () => { alive = false; };
  }, [inspectionId]);

  /* ── Derived ─────────────────────────────────────────────────── */
  const hasVision = evidence?.hasVision ?? false;
  const hasIoT    = evidence?.hasIoT    ?? false;
  const caseNum   = !hasVision && !hasIoT ? 0
                  : !hasVision && hasIoT  ? 1
                  : hasVision  && !hasIoT ? 2
                  : 3;

  /* ── Run fusion ──────────────────────────────────────────────── */
  const handleRun = async () => {
    if (!evidence || caseNum === 0) return;
    setPhase('processing');
    setFusion(null);
    setErrMsg('');
    setStageIdx(0);

    const activeStages = STAGES.filter((_, i) => {
      if (i === 1 && !hasVision) return false;
      if (i === 2 && !hasIoT)   return false;
      return true;
    });

    // Fire backend call immediately — runs in parallel with the animation
    const backendCall = runFusionBackend(evidence);

    for (let i = 0; i < activeStages.length; i++) {
      setStageIdx(i);
      await delay(activeStages[i].ms);
    }

    try {
      const result = await backendCall;
      setFusion(result);
      setPhase('done');
    } catch (e: any) {
      setErrMsg(e.message || 'Fusion calculation failed. Please try again.');
      setPhase('ready');
    }
  };

  /* ── Commit ──────────────────────────────────────────────────── */
  const handleCommit = async () => {
    if (!fusion || !evidence) return;
    setCommitting(true);
    try {
      const res = await api.commitFusion(inspectionId, evidence.lotId ?? undefined, fusion);
      setCommitted({ recordId: res.recordId, at: res.persistedAt });
    } catch (e: any) {
      setErrMsg(e.message || 'Failed to commit fusion result.');
    } finally {
      setCommitting(false);
    }
  };

  const progressPct = stageIdx < 0
    ? 0
    : Math.round(((stageIdx + 1) / STAGES.length) * 100);

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5">

      {/* ── Page heading ──────────────────────────────────────── */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">
          <GitMerge size={13} /> Fusion Intelligence
        </div>
        <h1 className="mt-1 text-xl font-extrabold text-ink md:text-2xl">
          Quality Assessment Fusion
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          Current Inspection
        </p>
      </div>

      {/* ── Inspection identity card ───────────────────────────── */}
      {evidence && (
        <InspectionCard evidence={evidence} inspectionId={inspectionId} />
      )}

      {/* ── Error ─────────────────────────────────────────────── */}
      {errMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-reject/25 bg-reject/5 px-4 py-3 text-sm font-medium text-reject">
          <AlertCircle size={15} className="mt-0.5 shrink-0" /> {errMsg}
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────── */}
      {phase === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={15} className="animate-spin text-forest" />
          Loading inspection evidence…
        </div>
      )}

      {/* ── Evidence panel ────────────────────────────────────── */}
      {(phase === 'ready' || phase === 'done' || phase === 'processing') && evidence && (
        <EvidencePanel evidence={evidence} caseNum={caseNum} />
      )}

      {/* ── Case 0: no evidence ───────────────────────────────── */}
      {phase === 'ready' && caseNum === 0 && (
        <Card className="p-6 text-center">
          <Info className="mx-auto mb-3 text-muted/35" size={32} />
          <h3 className="text-sm font-bold text-ink">Awaiting Evidence</h3>
          <p className="mt-1.5 max-w-sm mx-auto text-sm text-muted">
            No Vision or IoT results found for this inspection.
            Complete the <strong>AI Analysis</strong> or <strong>IoT Sensor</strong> step first.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link to="/quality/ai-analysis" className="btn-secondary text-xs flex items-center gap-1.5">
              <Eye size={13} /> AI Analysis
            </Link>
            <Link to="/quality/live-sensor" className="btn-secondary text-xs flex items-center gap-1.5">
              <Wind size={13} /> IoT Sensor
            </Link>
          </div>
        </Card>
      )}

      {/* ── Run button ────────────────────────────────────────── */}
      {phase === 'ready' && caseNum > 0 && (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-fresh">
                Ready to analyse
              </div>
              <h3 className="mt-1 text-lg font-extrabold text-ink">
                {caseNum === 3
                  ? 'Multimodal Fusion Analysis'
                  : caseNum === 2
                  ? 'Vision-Based Assessment'
                  : 'IoT-Based Assessment'}
              </h3>
              <p className="mt-1 max-w-md text-sm text-muted">
                {caseNum === 3
                  ? 'Combine Vision + IoT evidence using the grading engine for a final quality grade.'
                  : caseNum === 2
                  ? 'Vision evidence only — assessment based on visual inspection results.'
                  : 'IoT evidence only — assessment based on environmental sensor data.'}
              </p>
            </div>
            <button
              onClick={handleRun}
              className="flex items-center gap-2 rounded-xl bg-forest px-7 py-3.5 text-[14px] font-extrabold text-white shadow-[0_4px_16px_-4px_rgba(11,93,59,0.45)] transition hover:bg-darkgreen"
            >
              <Zap size={17} /> Run Fusion Analysis
            </button>
          </div>
        </Card>
      )}

      {/* ── Processing animation ──────────────────────────────── */}
      <AnimatePresence>
        {phase === 'processing' && (
          <motion.div key="proc"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
          >
            <Card className="p-7">
              <div className="flex flex-col items-center gap-6">
                <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-fresh/30 bg-sb-50">
                  <Loader2 size={30} className="animate-spin text-forest" />
                </div>
                <div className="text-center">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">
                    Fusion Intelligence
                  </div>
                  <h3 className="mt-1 text-lg font-extrabold text-ink">
                    Running Fusion Analysis…
                  </h3>
                </div>

                <div className="w-full max-w-md space-y-2">
                  {STAGES.filter((_, i) => {
                    if (i === 1 && !hasVision) return false;
                    if (i === 2 && !hasIoT)   return false;
                    return true;
                  }).map((s, i) => {
                    const done    = i < stageIdx;
                    const current = i === stageIdx;
                    return (
                      <motion.div key={s.label}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={[
                          'flex items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] font-semibold',
                          done    ? 'bg-forest/5 text-forest'
                          : current ? 'border border-forest/20 bg-sb-50 text-ink'
                          :           'text-muted',
                        ].join(' ')}
                      >
                        {done    ? <CheckCircle2 size={15} className="shrink-0 text-forest" />
                        : current ? <Loader2 size={15} className="shrink-0 animate-spin text-forest" />
                        :           <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-border" />}
                        {s.label}
                      </motion.div>
                    );
                  })}
                </div>

                <div className="w-full max-w-md">
                  <div className="mb-1 flex justify-between text-[11px] font-semibold text-muted">
                    <span>Processing</span><span>{progressPct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-sb-100">
                    <motion.div
                      className="h-full rounded-full bg-forest"
                      initial={{ width: '0%' }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result ────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === 'done' && fusion && (
          <motion.div key="result"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            {/* Grade card */}
            <div className={`overflow-hidden rounded-2xl border-2 ${gradeBorder(fusion.grade)}`}>
              <div className={`h-1.5 w-full ${fusion.grade?.includes('GRADE A') ? 'bg-forest' : fusion.grade?.includes('URS') ? 'bg-amber' : 'bg-reject'}`} />
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                      {caseNum === 3 ? 'Multimodal Fusion Result' : caseNum === 2 ? 'Vision Assessment Result' : 'IoT Assessment Result'}
                    </div>
                    <div className={`mt-1 text-3xl font-extrabold tracking-tight ${gradeColor(fusion.grade)}`}>
                      {fusion.grade}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm font-semibold text-ink">
                      <span>Score: <b className="font-mono text-lg text-forest">{fusion.finalScore ?? fusion.qualityScore}/100</b></span>
                      <span className="text-muted">·</span>
                      <span>Confidence: <b>{Math.round((fusion.confidence ?? 0) * 100)}%</b></span>
                      <span className="text-muted">·</span>
                      <span>Risk: <b className={fusion.spoilageRisk === 'HIGH' ? 'text-reject' : fusion.spoilageRisk === 'MEDIUM' ? 'text-amber-600' : 'text-forest'}>{fusion.spoilageRisk ?? fusion.riskLevel ?? 'LOW'}</b></span>
                    </div>
                  </div>

                  {!committed ? (
                    <button
                      onClick={handleCommit}
                      disabled={committing}
                      className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-darkgreen disabled:opacity-60"
                    >
                      {committing ? <Spinner label="Saving…" /> : <><CheckCircle2 size={15} /> Commit to Registry</>}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-forest/20 bg-mint/40 px-4 py-2.5 text-[12px] font-bold text-forest">
                      <CheckCircle2 size={14} /> Committed · {new Date(committed.at).toLocaleTimeString()}
                    </div>
                  )}
                </div>

                {fusion.earlySpoilageAlert && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber/30 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                    <span><strong>Early Spoilage Alert</strong> — Visual appearance acceptable but IoT signals indicate internal spoilage risk.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Score breakdown */}
            <div className={`grid gap-4 ${caseNum === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
              {hasVision && (
                <ScoreCard
                  label="Vision Score" icon={<Eye size={15} />}
                  score={fusion.visionScore}
                  confidence={fusion.visionConfidence}
                  desc="AI defect detection across onion sample"
                />
              )}
              {hasIoT && (
                <ScoreCard
                  label="IoT / Gas Score" icon={<Wind size={15} />}
                  score={fusion.gasScore ?? (fusion as any).sensorScore}
                  confidence={(fusion as any).sensorConfidence ?? fusion.gasConfidence}
                  desc="Environmental & spoilage gas analysis"
                />
              )}
              <ScoreCard
                label={caseNum === 3 ? 'Fusion Score' : 'Quality Score'}
                icon={<GitMerge size={15} />}
                score={fusion.finalScore ?? fusion.qualityScore}
                confidence={fusion.confidence}
                desc={caseNum === 3 ? 'Confidence-weighted multimodal result' : 'Single-source quality result'}
                highlight
              />
            </div>

            {/* Grade distribution */}
            {fusion.gradeAPercentage != null && (
              <Card className="p-5">
                <h3 className="mb-3 text-sm font-bold text-ink">Grade Distribution</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-forest/5 px-3 py-2.5">
                    <div className="text-xl font-extrabold text-forest">{fusion.gradeAPercentage?.toFixed(1)}%</div>
                    <div className="text-xs text-muted">Grade A</div>
                  </div>
                  <div className="rounded-xl bg-amber/5 px-3 py-2.5">
                    <div className="text-xl font-extrabold text-amber-600">{fusion.ursPercentage?.toFixed(1)}%</div>
                    <div className="text-xs text-muted">URS</div>
                  </div>
                  <div className="rounded-xl bg-reject/5 px-3 py-2.5">
                    <div className="text-xl font-extrabold text-reject">{fusion.rejectedPercentage?.toFixed(1)}%</div>
                    <div className="text-xs text-muted">Rejected</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Why this grade */}
            {fusion.reasons && fusion.reasons.length > 0 && (
              <Card className="p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
                  <Info size={14} className="text-forest" /> Why This Grade
                </h3>
                <ul className="space-y-2">
                  {fusion.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-ink">
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-forest" /> {r}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Officer explanation */}
            {(fusion.officerExplanation || fusion.explanation) && (
              <Card className="p-5">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
                  <ShieldCheck size={14} className="text-forest" /> Assessment Summary
                </h3>
                <p className="text-[13px] leading-relaxed text-muted">
                  {fusion.officerExplanation || fusion.explanation}
                </p>
              </Card>
            )}

            {/* Generate Certificate + Re-run */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {committed && (
                <button
                  onClick={() => void generateCert()}
                  disabled={certBusy}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-forest to-darkgreen px-5 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
                >
                  {certBusy ? <Loader2 size={15} className="animate-spin" /> : <Award size={15} />}
                  Generate Certificate
                </button>
              )}
              <div className="flex justify-end ml-auto">
                <button
                  onClick={() => { setPhase('ready'); setFusion(null); setCommitted(null); }}
                  className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted transition hover:text-forest hover:underline underline-offset-2"
                >
                  <RefreshCw size={13} /> Re-run analysis
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Inspection identity card ───────────────────────────────────── */
function InspectionCard({ evidence, inspectionId }: { evidence: EvidenceResp; inspectionId: string }) {
  const { lot, session } = evidence;
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">
          Current Inspection
        </div>
        <span className="rounded-full bg-sb-50 border border-sb-200 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-forest">
          {inspectionId.slice(-10)}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-[13px]">
        {lot.centralLotId && (
          <InfoRow icon={<Package size={13} />} label="Central Lot ID" value={lot.centralLotId} />
        )}
        {lot.variety && (
          <InfoRow icon={<Leaf size={13} />} label="Variety" value={`${lot.crop || 'Onion'} · ${lot.variety}`} />
        )}
        {lot.quantityKg && (
          <InfoRow icon={<Package size={13} />} label="Quantity" value={`${lot.quantityKg} kg`} />
        )}
        {session?.startedAt && (
          <InfoRow icon={<MapPin size={13} />} label="Started" value={new Date(session.startedAt).toLocaleTimeString()} />
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted shrink-0">{icon}</span>
      <div>
        <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{label}</div>
        <div className="font-semibold text-ink">{value}</div>
      </div>
    </div>
  );
}

/* ─── Evidence availability panel ───────────────────────────────── */
function EvidencePanel({ evidence, caseNum }: { evidence: EvidenceResp; caseNum: number }) {
  return (
    <Card className="p-5">
      <h3 className="mb-3 text-sm font-bold text-ink">Evidence Available</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <EvidenceTile
          icon={<Eye size={15} />}
          label="Vision Analysis"
          available={evidence.hasVision}
          detail={evidence.vision
            ? `${evidence.vision.total} onions · Score ${evidence.vision.visionScore}/100`
            : 'Not completed'}
        />
        <EvidenceTile
          icon={<Wind size={15} />}
          label="IoT Assessment"
          available={evidence.hasIoT}
          detail={evidence.iot
            ? `${evidence.iot.conditionLabel} · Score ${evidence.iot.gasScore}/100`
            : 'Not completed'}
        />
      </div>
      {(caseNum === 1 || caseNum === 2) && (
        <p className="mt-3 text-[12px] font-medium text-amber-700">
          Only {caseNum === 1 ? 'IoT' : 'Vision'} evidence available — single-source assessment will be used.
        </p>
      )}
    </Card>
  );
}

function EvidenceTile({ icon, label, available, detail }: {
  icon: React.ReactNode; label: string; available: boolean; detail: string;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3.5 transition-all ${
      available ? 'border-forest/20 bg-forest/5' : 'border-border bg-gray-50 opacity-60'
    }`}>
      <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
        available ? 'bg-forest text-white' : 'bg-gray-200 text-gray-500'
      }`}>
        {icon}
      </div>
      <div>
        <div className={`flex items-center gap-1.5 text-[12.5px] font-bold ${available ? 'text-forest' : 'text-muted'}`}>
          {available && <CheckCircle2 size={11} />} {label}
        </div>
        <div className="mt-0.5 text-[11.5px] text-muted">{detail}</div>
      </div>
    </div>
  );
}

/* ─── Score card ──────────────────────────────────────────────────── */
function ScoreCard({ label, icon, score, confidence, desc, highlight = false }: {
  label: string; icon: React.ReactNode;
  score?: number; confidence?: number;
  desc: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${
      highlight ? 'border-forest/30 bg-gradient-to-br from-mint/40 to-white' : 'border-border bg-white'
    }`}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted">
        {icon} {label}
      </div>
      <div className="mt-2 font-mono text-3xl font-extrabold text-forest">
        {score ?? '—'}<span className="text-sm font-semibold text-muted"> / 100</span>
      </div>
      {confidence != null && (
        <div className="mt-1 text-[12px] font-medium text-muted">Confidence: {Math.round(confidence * 100)}%</div>
      )}
      <p className="mt-1.5 text-[11.5px] text-muted">{desc}</p>
    </div>
  );
}

/* ─── Backend fusion calculation ─────────────────────────────────── */
async function runFusionBackend(ev: EvidenceResp): Promise<FusionResult> {
  const vision = ev.hasVision && ev.vision ? {
    visionScore: ev.vision.visionScore,
    confidence:  ev.vision.confidence,
    counts:      ev.vision.counts,
    percentages: ev.vision.percentages,
    total:       ev.vision.total,
  } : {
    visionScore: 0, confidence: 0, total: 0,
    counts:      { healthy: 0, damaged: 0, rotten: 0, sprouted: 0, undersized: 0 },
    percentages: { healthy: 0, damaged: 0, rotten: 0, sprouted: 0, undersized: 0 },
  };

  const gas = ev.hasIoT && ev.iot ? {
    stage:      ev.iot.stage,
    gasScore:   ev.iot.gasScore,
    confidence: ev.iot.confidence,
    readings:   { temperature: 24.2, humidity: 60.5 },
  } : {
    stage: 'LOW' as const,
    gasScore: 0, confidence: 0,
    readings: { temperature: 24.2, humidity: 60.5 },
  };

  return api.calculateFusion({
    vision,
    gas,
    environment: { environmentScore: ev.iot?.environmentScore ?? 88, confidence: 0.90, temperature: 24.2, humidity: 60.5 },
    forceDegraded: !ev.hasVision || !ev.hasIoT,
    isPreliminary: false,
  });
}
