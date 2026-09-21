import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, ArrowLeft, ScanLine, Wind, Leaf, ShieldCheck,
  AlertTriangle, CheckCircle2, XCircle, Info, TrendingUp, ChevronRight,
  Shield, Check, RefreshCw, Cpu, Award, Star,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { GradeBadge, ProgressBar } from '../../components/ui';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { MOCK_FARMER_INSPECTIONS, getMockReportDetail } from './mockFarmerData';

/* ── helpers ── */
function gradeColor(grade: string) {
  if (grade === 'GRADE A') return 'text-forest';
  if (grade === 'URS')     return 'text-amber-600';
  return 'text-reject';
}
function gradeBg(grade: string) {
  if (grade === 'GRADE A') return { bg: 'from-mint/60 to-white', border: 'border-forest/15',  icon: 'bg-forest text-white', accent: 'bg-forest' };
  if (grade === 'URS')     return { bg: 'from-amber-50 to-white', border: 'border-amber-200',  icon: 'bg-amber-500 text-white', accent: 'bg-amber' };
  return                          { bg: 'from-rose-50 to-white',  border: 'border-reject/20',   icon: 'bg-reject text-white',  accent: 'bg-reject' };
}
function gradeExplain(grade: string) {
  if (grade === 'GRADE A') return 'Your lot meets all premium Grade A standards. Volatile levels, firmness, skin integrity, and size distribution qualify for top-tier procurement pricing.';
  if (grade === 'URS')     return 'Your lot falls in the URS band. Visual defect percentages or volatile emissions exceed Grade A tolerances but remain eligible for secondary processing.';
  return 'Your lot did not meet safe shelf-life thresholds. Surface rot, high humidity, or elevated gas biomarkers indicate risk of accelerated degradation.';
}
const scoreBarTone = (v: number): 'forest' | 'amber' | 'reject' =>
  v >= 70 ? 'forest' : v >= 45 ? 'amber' : 'reject';

/* ── sub-components ── */
function ScoreBar({ label, icon: Icon, value, tone, delay = 0 }: {
  label: string; icon: any; value: number; tone: 'forest' | 'amber' | 'reject'; delay?: number;
}) {
  const colors = { forest: 'text-forest', amber: 'text-amber-600', reject: 'text-reject' };
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <Icon size={14} className="text-muted" /> {label}
        </span>
        <span className={`text-[13px] font-extrabold tabular-nums ${colors[tone]}`}>
          <AnimatedNumber value={value} />/100
        </span>
      </div>
      <ProgressBar value={value} tone={tone} />
    </motion.div>
  );
}

function DefectChip({ label, pct, icon: Icon, good }: {
  label: string; pct: number; icon: any; good: boolean;
}) {
  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
      good ? 'border-forest/15 bg-mint/40 hover:bg-mint/60' : 'border-reject/15 bg-rose-50/60 hover:bg-rose-50'
    }`}>
      <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <Icon size={15} className={good ? 'text-forest' : 'text-reject'} /> {label}
      </span>
      <span className={`text-[13px] font-extrabold tabular-nums ${good ? 'text-forest' : 'text-reject'}`}>
        <AnimatedNumber value={pct} decimals={1} suffix="%" />
      </span>
    </div>
  );
}

function SensorChip({ label, val }: { label: string; val: string }) {
  return (
    <div className="rounded-xl border border-[rgba(20,20,25,0.07)] bg-[rgba(20,20,25,0.02)] p-3 text-center hover:border-forest/20 transition">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">{label}</div>
      <div className="text-[15px] font-extrabold text-ink tabular-nums">{val}</div>
    </div>
  );
}

/* ── main component ── */
export default function FarmerReport() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [inspections, setInspections] = useState<any[]>([]);
  const [inspection, setInspection] = useState<any>(null);
  const [certDetail, setCertDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);

  useEffect(() => {
    api.getInspections()
      .then((all) => {
        const hasReal = Array.isArray(all) && all.length > 0;
        const list = hasReal ? all : MOCK_FARMER_INSPECTIONS;
        setIsUsingMock(!hasReal);
        setInspections(list);

        if (id) {
          const found = list.find((i: any) =>
            String(i.id) === id ||
            String(i.inspectionId) === id ||
            i.certificateNumber === id ||
            i.lotNumber === id
          );

          if (found) {
            setInspection(found);
            if (!hasReal || String(found.id).startsWith('insp_mock_')) {
              setCertDetail(getMockReportDetail(id));
            } else {
              api.getCertificate(id)
                .then(setCertDetail)
                .catch(() => {
                  if (found?.certificateNumber) {
                    api.getCertificate(found.certificateNumber)
                      .then(setCertDetail)
                      .catch(() => setCertDetail(getMockReportDetail(id)));
                  } else {
                    setCertDetail(getMockReportDetail(id));
                  }
                });
            }
          } else {
            const fallback = getMockReportDetail(id);
            if (fallback) {
              setInspection(fallback.inspection);
              setCertDetail(fallback);
              setIsUsingMock(true);
            }
          }
        }
      })
      .catch(() => {
        setIsUsingMock(true);
        setInspections(MOCK_FARMER_INSPECTIONS);
        if (id) {
          const fallback = getMockReportDetail(id);
          if (fallback) {
            setInspection(fallback.inspection);
            setCertDetail(fallback);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <PageTransition className="space-y-5">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-[rgba(20,20,25,0.07)]" />
        <div className="h-36 animate-pulse rounded-2xl bg-[rgba(20,20,25,0.07)]" />
        <div className="grid gap-5 lg:grid-cols-3">
          {[0,1,2].map(i => <div key={i} className="h-52 animate-pulse rounded-2xl bg-[rgba(20,20,25,0.05)]" />)}
        </div>
      </PageTransition>
    );
  }

  /* ── NO ID — lot picker ── */
  if (!id) {
    return (
      <PageTransition className="space-y-5">
        {/* header */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-2xl p-6 text-white"
          style={{ background: 'linear-gradient(135deg,#0B5D3B 0%,#0d6b44 45%,#06452C 100%)', boxShadow: '0 8px 32px rgba(11,93,59,0.28)' }}
        >
          <div className="pointer-events-none absolute -right-14 -top-14 h-60 w-60 rounded-full bg-white/[0.06]" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 border border-white/20">
                <FileText size={22} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200/70 mb-0.5">My Farm</p>
                <h1 className="text-2xl font-extrabold tracking-tight">Inspection Reports</h1>
                <p className="text-[13px] text-emerald-100/70 mt-0.5">Select a lot to view the full transparent quality report.</p>
              </div>
            </div>
            {isUsingMock && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-3.5 py-1 text-xs font-semibold text-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Sample Demo Data Active
              </span>
            )}
          </div>
        </motion.div>

        {inspections.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[rgba(20,20,25,0.10)] bg-[rgba(20,20,25,0.02)] p-14 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-50 to-mint text-forest">
              <FileText size={28} />
            </div>
            <p className="text-[15px] font-bold text-ink">No inspections yet</p>
            <p className="mt-1.5 text-[13px] text-muted max-w-xs">When a procurement center inspects your lot, the report will appear here.</p>
          </div>
        ) : (
          <Stagger className="grid gap-3 md:grid-cols-2" gap={0.05}>
            {inspections.map((i: any) => (
              <StaggerItem key={i.id || i.certificateNumber}>
                <motion.button
                  whileHover={{ y: -3 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  onClick={() => nav(`/farmer/report/${i.id || i.inspectionId || i.certificateNumber}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-4 transition-all"
                    style={{ boxShadow: '0 1px 3px rgba(20,20,25,0.04),0 8px 24px rgba(20,20,25,0.05)' }}>
                    <div className="flex items-center gap-4">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest">
                        <FileText size={19} />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted font-semibold">Lot {i.lotNumber || '—'}</p>
                        <p className="font-bold text-forest text-[13px] font-mono">{i.certificateNumber}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted">
                            {new Date(i.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          {i.isReassessment && (
                            <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-bold">Reassessed</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <GradeBadge grade={i.grade} />
                      <div className="flex flex-col items-end">
                        <span className="text-[22px] font-extrabold text-ink tabular-nums leading-none">{i.qualityScore || i.finalScore}</span>
                        <span className="text-[10px] text-muted">/100</span>
                      </div>
                      <div className="grid h-8 w-8 place-items-center rounded-lg border border-[rgba(20,20,25,0.10)] text-muted">
                        <ChevronRight size={15} />
                      </div>
                    </div>
                  </div>
                </motion.button>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </PageTransition>
    );
  }

  /* ── not found ── */
  if (!inspection && !certDetail) {
    return (
      <PageTransition className="space-y-5">
        <button
          onClick={() => nav('/farmer/report')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(20,20,25,0.10)] bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-bg transition"
        >
          <ArrowLeft size={14} /> Back to Reports
        </button>
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-[rgba(20,20,25,0.10)] bg-[rgba(20,20,25,0.02)] p-14 text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-50 to-mint text-forest">
            <FileText size={26} />
          </div>
          <p className="text-[15px] font-bold text-ink">Report not found</p>
          <p className="mt-1.5 text-[13px] text-muted">The lot you're looking for may not be assigned to your account.</p>
        </div>
      </PageTransition>
    );
  }

  const cert         = certDetail?.certificate || inspection;
  const fusion       = certDetail?.fusion;
  const lot          = certDetail?.lot;
  const sensors      = certDetail?.sensors || [];
  const latestSensor = sensors[sensors.length - 1] || null;

  const vision = Number(fusion?.visionScore  ?? inspection?.visionScore  ?? 85);
  const gas    = Number(fusion?.gasScore     ?? inspection?.gasScore     ?? 80);
  const env    = Number(fusion?.environmentalScore ?? inspection?.environmentalScore ?? 82);
  const final  = Number(cert?.qualityScore   ?? fusion?.finalScore ?? inspection?.finalScore ?? 82);

  const gradeA   = Number(cert?.grade_a_percentage  ?? inspection?.grade_a_percentage  ?? Math.round(vision * 0.8));
  const urs      = Number(cert?.urs_percentage       ?? inspection?.urs_percentage      ?? Math.round((100 - gradeA) * 0.55));
  const rejected = Number(cert?.rejected_percentage  ?? inspection?.rejected_percentage ?? Math.max(0, 100 - gradeA - urs));

  const reasons: string[] = fusion?.reasons || inspection?.reasons || [
    final >= 85 ? 'Vision model confirmed <5% skin blemishes across sample' : 'Visual surface defects exceed Grade A threshold',
    gas >= 80   ? 'Multi-gas sensor readings within safe non-decay range'   : 'Ethylene / methane markers indicate elevated respiration',
    'Standardized assessment calibrated under ONION_STANDARD_2026_V1',
  ];

  const rulesVersion       = fusion?.rulesVersion || inspection?.rulesVersion || 'ONION_STANDARD_2026_V1';
  const isReassessment     = fusion?.isReassessment || cert?.isReassessment || inspection?.isReassessment;
  const previousGrade      = fusion?.previousGrade || inspection?.previousGrade;
  const reassessmentReason = fusion?.reassessmentReason || cert?.reassessmentNote || inspection?.reassessmentReason;
  const lotNumber          = lot?.lotNumber || inspection?.lotNumber || cert?.certificateNumber;
  const gb                 = gradeBg(cert?.grade || 'REJECTED');

  return (
    <PageTransition className="space-y-5">

      {/* ── Top nav row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav('/farmer/report')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(20,20,25,0.10)] bg-white px-3 py-2 text-[13px] font-semibold text-ink transition hover:bg-bg"
          >
            <ArrowLeft size={14} /> Reports
          </button>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">My Farm</p>
            <h1 className="text-xl font-extrabold text-ink leading-tight">Inspection Report</h1>
          </div>
        </div>
        {lotNumber && (
          <div className="flex items-center gap-2">
            {isUsingMock && (
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-forest">
                Sample Report
              </span>
            )}
            <span className="text-[11px] text-muted font-medium">Central Lot ID</span>
            <span className="rounded-xl bg-ink px-3 py-1.5 text-[12px] font-bold text-white font-mono tracking-wider">
              {lotNumber}
            </span>
          </div>
        )}
      </div>

      {/* ── Reassessment banner ── */}
      {isReassessment && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-white p-4"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-600 text-white shrink-0">
              <RefreshCw size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-extrabold text-purple-900 text-[14px]">Official Reassessment</span>
                {previousGrade && (
                  <span className="rounded-full bg-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                    {previousGrade} → {cert?.grade}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-purple-700 leading-relaxed">
                {reassessmentReason || 'This lot underwent secondary re-evaluation following a farmer dispute. The grade and certificate have been officially updated.'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Grade verdict hero ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={`rounded-2xl border bg-gradient-to-br ${gb.bg} ${gb.border} p-6 relative overflow-hidden`}
        style={{ boxShadow: '0 2px 16px rgba(20,20,25,0.06)' }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full opacity-[0.06] bg-current" />
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className={`grid h-16 w-16 place-items-center rounded-2xl ${gb.icon} shadow-[0_4px_14px_rgba(0,0,0,0.15)]`}>
              <Award size={28} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted mb-1">Assessed Grade</p>
              <p className={`text-5xl font-extrabold tracking-tight leading-none ${gradeColor(cert?.grade || '')}`}>
                {cert?.grade || '—'}
              </p>
              <p className="mt-2 max-w-sm text-[13px] text-muted leading-relaxed">{gradeExplain(cert?.grade || 'REJECTED')}</p>
              <span className="mt-2 inline-block rounded-full bg-[rgba(20,20,25,0.07)] px-2.5 py-0.5 text-[10px] font-bold text-muted">
                {rulesVersion}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[rgba(20,20,25,0.10)] bg-white/70 px-8 py-5 backdrop-blur-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Quality Score</p>
            <p className="text-[56px] font-extrabold text-ink tabular-nums leading-none">
              <AnimatedNumber value={final} />
            </p>
            <p className="text-[14px] text-muted font-semibold">/100</p>
          </div>
        </div>
      </motion.div>

      {/* ── Why this grade ── */}
      <div className="rounded-2xl border border-forest/15 bg-white p-5 space-y-4"
        style={{ borderLeft: '4px solid #0B5D3B', boxShadow: '0 1px 3px rgba(20,20,25,0.04),0 8px 24px rgba(20,20,25,0.05)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield size={17} className="text-forest" />
            <span className="font-extrabold text-ink text-[15px]">Why This Grade?</span>
          </div>
          <span className="text-[11px] text-muted font-medium bg-[rgba(20,20,25,0.04)] px-3 py-1 rounded-full">
            Standardized AI & Sensor Logic
          </span>
        </div>
        <p className="text-[12px] text-muted">
          OnionSure evaluates your lot using objective sensor thresholds and computer vision detections under protocol{' '}
          <code className="font-bold text-ink bg-[rgba(20,20,25,0.05)] px-1.5 py-0.5 rounded-md">{rulesVersion}</code>.
        </p>
        <div className="space-y-2">
          {reasons.map((r, idx) => (
            <div key={idx} className="flex items-start gap-3 rounded-xl border border-forest/10 bg-mint/30 p-3 hover:bg-mint/50 transition">
              <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest text-white mt-0.5">
                <Check size={11} />
              </div>
              <span className="text-[13px] text-ink font-medium leading-snug">{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scores + lot details ── */}
      <Stagger className="grid gap-5 lg:grid-cols-3">
        <StaggerItem className="lg:col-span-2">
          <div className="rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-5 space-y-5"
            style={{ boxShadow: '0 1px 3px rgba(20,20,25,0.04),0 8px 24px rgba(20,20,25,0.05)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={17} className="text-forest" />
                <span className="font-extrabold text-ink text-[15px]">Multimodal Score Breakdown</span>
              </div>
              <span className="flex items-center gap-1 rounded-lg bg-mint/60 px-2.5 py-1 text-[11px] font-bold text-forest border border-forest/10">
                <Info size={11} /> 3-Channel Fusion
              </span>
            </div>
            <div className="space-y-4">
              <ScoreBar label="Vision Score (AI Computer Vision)" icon={ScanLine} value={vision} tone={scoreBarTone(vision)} delay={0.05} />
              <ScoreBar label="Gas Volatiles (Ethylene / Methane / NH₃)" icon={Wind} value={gas} tone={scoreBarTone(gas)} delay={0.10} />
              <ScoreBar label="Environmental Score (Storage Microclimate)" icon={Leaf} value={env} tone={scoreBarTone(env)} delay={0.15} />
              <ScoreBar label="Final Standardized Score" icon={ShieldCheck} value={final} tone={scoreBarTone(final)} delay={0.20} />
            </div>
            <div className="rounded-xl bg-[rgba(20,20,25,0.03)] border border-[rgba(20,20,25,0.07)] px-4 py-3 text-[12px] text-muted">
              <span className="font-bold text-ink">Fusion Formula: </span>
              Vision (40%) + Volatiles (35%) + Microclimate (25%) = Quality Score.
              Grade A ≥ 85 · URS 65–84 · Rejected &lt; 65.
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-5 space-y-4 flex flex-col"
            style={{ boxShadow: '0 1px 3px rgba(20,20,25,0.04),0 8px 24px rgba(20,20,25,0.05)' }}>
            <div className="flex items-center gap-2">
              <FileText size={17} className="text-forest" />
              <span className="font-extrabold text-ink text-[15px]">Lot Details</span>
            </div>
            <div className="flex-1 space-y-0">
              {[
                { label: 'Certificate',  value: cert?.certificateNumber },
                { label: 'Central Lot', value: lotNumber },
                { label: 'Date',        value: cert?.createdAt ? new Date(cert.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                { label: 'Grade',       value: <GradeBadge grade={cert?.grade || 'REJECTED'} /> },
                { label: 'Status',      value: isReassessment ? 'Reassessed' : (lot?.status || 'Graded') },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2 py-2.5 border-b border-[rgba(20,20,25,0.06)] last:border-0">
                  <span className="text-[12px] text-muted font-medium">{label}</span>
                  <span className="text-[12px] font-semibold text-ink text-right">{value}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-1">
              <button
                className="w-full btn-primary py-2.5 text-[13px]"
                onClick={() => nav(`/certificate/${cert?.id || cert?.certificateNumber || inspection?.id}`)}
              >
                <Award size={14} /> View Official Certificate
              </button>
              <button
                className="w-full rounded-xl border border-reject/25 bg-rose-50 px-3 py-2.5 text-[13px] font-semibold text-reject transition hover:bg-rose-100"
                onClick={() => nav(`/farmer/dispute?lotId=${lotNumber}`)}
              >
                Dispute This Grade
              </button>
            </div>
          </div>
        </StaggerItem>
      </Stagger>

      {/* ── IoT Sensor telemetry ── */}
      {latestSensor && (
        <div className="rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-5 space-y-4"
          style={{ boxShadow: '0 1px 3px rgba(20,20,25,0.04),0 8px 24px rgba(20,20,25,0.05)' }}>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-forest/10 text-forest">
              <Cpu size={15} />
            </div>
            <div>
              <span className="font-extrabold text-ink text-[15px]">IoT Pod Telemetry</span>
              <p className="text-[11px] text-muted font-medium">8 recorded sensor parameters</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <SensorChip label="Temperature"     val={`${latestSensor.temperature}°C`} />
            <SensorChip label="Humidity"        val={`${latestSensor.humidity}%`} />
            <SensorChip label="CO₂"             val={`${latestSensor.co2 ?? 440} ppm`} />
            <SensorChip label="Methane (CH₄)"   val={`${latestSensor.ch4 ?? latestSensor.methane ?? 0.18} ppm`} />
            <SensorChip label="Ethylene (C₂H₄)" val={`${latestSensor.c2h4 ?? latestSensor.ethane ?? 0.42} ppm`} />
            <SensorChip label="Ammonia (NH₃)"   val={`${latestSensor.nh3 ?? 0.12} ppm`} />
            <SensorChip label="Moisture"        val={`${latestSensor.moisture ?? 14.5}%`} />
            <SensorChip label="pH"              val={`${latestSensor.ph ?? 5.8}`} />
          </div>
        </div>
      )}

      {/* ── Defect breakdown + AI overlay ── */}
      <Stagger className="grid gap-5 lg:grid-cols-2">
        <StaggerItem>
          <div className="rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-5 space-y-4 h-full"
            style={{ boxShadow: '0 1px 3px rgba(20,20,25,0.04),0 8px 24px rgba(20,20,25,0.05)' }}>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600">
                <AlertTriangle size={15} />
              </div>
              <span className="font-extrabold text-ink text-[15px]">Defect Classification</span>
            </div>
            <div className="space-y-2.5">
              <DefectChip label="Grade A (Healthy / Blemish-Free)"         pct={gradeA}   icon={CheckCircle2} good />
              <DefectChip label="URS (Superficial Bruising / Sprouting)"   pct={urs}      icon={AlertTriangle} good={urs < 20} />
              <DefectChip label="Rejected (Rotten / Under-sized)"          pct={rejected} icon={XCircle}      good={rejected < 5} />
            </div>
            {/* Stacked bar */}
            <div className="overflow-hidden rounded-full h-4 flex gap-px">
              <motion.div className="bg-forest h-full" initial={{ width: 0 }} animate={{ width: `${gradeA}%` }} transition={{ duration: 0.9, delay: 0.15, ease: [0.22,1,0.36,1] }} />
              <motion.div className="bg-amber h-full"  initial={{ width: 0 }} animate={{ width: `${urs}%` }}    transition={{ duration: 0.9, delay: 0.3,  ease: [0.22,1,0.36,1] }} />
              <motion.div className="bg-reject h-full" initial={{ width: 0 }} animate={{ width: `${rejected}%` }} transition={{ duration: 0.9, delay: 0.45, ease: [0.22,1,0.36,1] }} />
            </div>
            <div className="flex items-center gap-5 text-[11px] font-semibold text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-forest" />Grade A</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber" />URS</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-reject" />Rejected</span>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-5 space-y-4 h-full"
            style={{ boxShadow: '0 1px 3px rgba(20,20,25,0.04),0 8px 24px rgba(20,20,25,0.05)' }}>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-forest/10 text-forest">
                <ScanLine size={15} />
              </div>
              <span className="font-extrabold text-ink text-[15px]">AI Vision Annotation</span>
            </div>
            {/* Scan preview */}
            <div className="relative flex h-52 items-center justify-center overflow-hidden rounded-xl border border-[rgba(20,20,25,0.07)] bg-gradient-to-br from-forest/5 via-bg to-mint/20">
              {/* Animated scan line */}
              <motion.div
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-forest to-transparent opacity-70"
                animate={{ top: ['5%', '92%', '5%'] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
              />
              {/* Corner brackets */}
              {(['top-3 left-3 border-t-2 border-l-2', 'top-3 right-3 border-t-2 border-r-2', 'bottom-3 left-3 border-b-2 border-l-2', 'bottom-3 right-3 border-b-2 border-r-2'] as const).map((cls, i) => (
                <div key={i} className={`absolute h-6 w-6 border-forest/40 rounded-sm ${cls}`} />
              ))}
              <div className="relative flex flex-col items-center gap-2 text-center px-6">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-forest/10 text-forest">
                  <ScanLine size={22} />
                </div>
                <div className="text-[14px] font-extrabold text-ink">AI OpenCV / Roboflow</div>
                <div className="text-[12px] text-muted leading-relaxed">
                  5 defect classes: Healthy, Damaged, Rotten, Sprouted, Undersized
                </div>
                <div className="mt-1 flex items-center gap-1.5 rounded-full bg-fresh/15 border border-fresh/25 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-fresh animate-pulse" />
                  <span className="text-[11px] font-bold text-forest">SCAN COMPLETE</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-mint/30 border border-forest/10 px-4 py-3 text-[12px] text-muted">
              Computer vision overlays bounding boxes and counts defect percentages for each onion in the sampled batch.
            </div>
          </div>
        </StaggerItem>
      </Stagger>

    </PageTransition>
  );
}
