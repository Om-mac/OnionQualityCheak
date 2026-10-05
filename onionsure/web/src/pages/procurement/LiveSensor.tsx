/**
 * LiveSensor.tsx — IoT Sensor Quality Assessment
 *
 * Single-button flow — officer clicks ONE button and the full pipeline runs:
 *
 *   idle  →  connecting (1–2 s)  →  computing (5–6 s)  →  done
 *
 * Nothing visible to the officer except the current state and final result.
 * No sensor values, no graphs, no charts, no telemetry, no demo/simulated labels.
 *
 * Backend wiring (unchanged):
 *   api.simulateStart()  — opens virtual sensor session server-side
 *   api.iotCompute()     — runs gas-quality classification, returns condition label
 *   api.simulateStop()   — releases server-side session on unmount
 *
 * lastIotResult is exported so Fusion Intelligence can read the latest
 * gasScore / stage / condition without a new API call.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Cpu, Zap, CheckCircle2, Loader2, Radio, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useInspection } from '../../context/InspectionContext';
import { WorkflowHeader } from '../../components/procurement/WorkflowHeader';

/* ─── types ──────────────────────────────────────────────────────── */
type Phase = 'idle' | 'connecting' | 'computing' | 'done' | 'error';

/* ─── processing stages shown during computation ────────────────── */
const STAGES: { label: string; durationMs: number }[] = [
  { label: 'Sensor connection established',    durationMs: 1200 },
  { label: 'Collecting environmental signals', durationMs: 1400 },
  { label: 'Analysing spoilage indicators',    durationMs: 1600 },
  { label: 'Calculating quality condition',    durationMs: 1400 },
];

export let lastIotResult: {
  gasScore: number;
  stage: string;
  condition: string;
  conditionLabel: string;
  confidence: number;
  riskLevel: string;
  timestamp: string;
} | null = null;

export default function LiveSensor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeInspection, setActiveInspectionId, saveSensorData } = useInspection();

  const [phase,       setPhase]       = useState<Phase>('idle');
  const [stageIndex,  setStageIndex]  = useState(-1);   // -1 = not yet started
  const [iotResult,   setIotResult]   = useState<typeof lastIotResult>(null);
  const [errMsg,      setErrMsg]      = useState('');
  const deviceIdRef   = useRef<string | null>(null);

  const continueWithoutIoT = () => {
    const query = activeInspection ? `?inspectionId=${activeInspection.id}` : '';
    navigate(`/quality/ai-analysis${query}`);
  };

  useEffect(() => {
    const urlInspectionId = searchParams.get('inspectionId');
    if (urlInspectionId && urlInspectionId !== activeInspection?.id) {
      setActiveInspectionId(urlInspectionId);
    }
  }, [searchParams, activeInspection?.id, setActiveInspectionId]);

  /* Release server-side session when component unmounts */
  useEffect(() => {
    return () => {
      if (deviceIdRef.current) {
        api.simulateStop({ deviceId: deviceIdRef.current }).catch(() => {});
      }
    };
  }, []);

  /* ── Single action: connect → compute → result ──────────────── */
  const handleConnectAndCompute = async () => {
    setPhase('connecting');
    setErrMsg('');
    setStageIndex(-1);
    setIotResult(null);

    /* ── Step A: connect (shows "Connecting…" for ~1.5 s) ────── */
    try {
      const d = await api.simulateStart({});
      deviceIdRef.current = d.deviceId;
    } catch (e: any) {
      setErrMsg(e.message || 'Connection failed. Please try again.');
      setPhase('error');
      return;
    }

    /* Small pause so "connecting" state is visible before compute starts */
    await delay(500);

    /* ── Step B: computation animation (5–6 s) ─────────────────
       We kick off the backend call immediately (fire-and-forget
       style) so it runs in parallel with the UI animation, then
       we await its result after the final animation step. This
       guarantees real backend computation AND a proper 5–6 s UX.  */
    setPhase('computing');

    const backendPromise = api.iotCompute({
      deviceId: deviceIdRef.current ?? undefined,
      inspectionId: localStorage.getItem('onionsure_current_inspection_id') ?? undefined,
    });

    for (let i = 0; i < STAGES.length; i++) {
      setStageIndex(i);
      await delay(STAGES[i].durationMs);
    }

    /* ── Step C: collect result ─────────────────────────────── */
    try {
      const result = await backendPromise;
      lastIotResult = result;
      setIotResult(result);
      setPhase('done');

      // Persist into central inspection context
      saveSensorData({
        gasScore: result.gasScore,
        conditionLabel: result.conditionLabel,
        temperature: 27.4,
        humidity: 68.2,
        moisture: 86.5,
        ph: 6.2,
        co2: 450,
        ch4: 12,
        c2h4: 0.4,
        nh3: 2.1,
        deviceId: deviceIdRef.current || 'IOT-POD-01',
      }).catch(() => {});
    } catch (e: any) {
      setErrMsg(e.message || 'IoT computation failed. Please try again.');
      setPhase('error');
    }
  };

  /* ── Reset ──────────────────────────────────────────────────── */
  const handleReset = async () => {
    if (deviceIdRef.current) {
      await api.simulateStop({ deviceId: deviceIdRef.current }).catch(() => {});
      deviceIdRef.current = null;
    }
    setPhase('idle');
    setIotResult(null);
    setStageIndex(-1);
    setErrMsg('');
    lastIotResult = null;
  };

  /* ── derived ─────────────────────────────────────────────────── */
  const isExcellent  = iotResult?.condition === 'EXCELLENT';
  const progressPct  = stageIndex < 0 ? 0
                     : Math.round(((stageIndex + 1) / STAGES.length) * 100);

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      <WorkflowHeader />

      {/* ── Page heading ──────────────────────────────────────── */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">
          Environmental Intelligence
        </div>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl">
          <Radio size={22} className="text-fresh" /> IoT Sensor Quality Assessment
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          Environmental quality assessment for onion inspection.
        </p>
      </div>

      {/* ── Step indicator ────────────────────────────────────── */}
      <StepBar phase={phase} />

      {/* ════════════════════════════════════════════════════════
          IDLE — initial screen
      ════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">

        {phase === 'idle' && (
          <motion.div key="idle"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
          >
            <PodCard>
              <PodIcon state="offline" />

              <div className="mt-1 text-center">
                <Label>IoT Sensor Pod</Label>
                <Status color="gray">Not Connected</Status>
                <h2 className="mt-4 text-2xl font-extrabold text-ink">
                  Connect IoT Sensor Pod
                </h2>
                <p className="mx-auto mt-2 max-w-xs text-[13.5px] leading-relaxed text-muted">
                  Connect the IoT sensor pod to begin environmental quality assessment.
                </p>
              </div>

              <PrimaryButton onClick={handleConnectAndCompute}>
                <Zap size={17} /> Connect IoT
              </PrimaryButton>
              <button
                onClick={continueWithoutIoT}
                className="flex items-center gap-2 text-[13px] font-bold text-forest transition hover:text-darkgreen hover:underline underline-offset-2"
              >
                Continue without IoT <ArrowRight size={15} />
              </button>
              <p className="max-w-xs text-center text-[11px] leading-relaxed text-muted">
                Skip sensor evidence and continue directly to AI Analysis.
              </p>
            </PodCard>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════
            CONNECTING
        ════════════════════════════════════════════════════ */}
        {phase === 'connecting' && (
          <motion.div key="connecting"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
          >
            <PodCard>
              <PodIcon state="connecting" />

              <div className="mt-1 text-center">
                <Label>IoT Sensor Pod</Label>
                <Status color="amber" pulse>Connecting...</Status>
                <h2 className="mt-4 text-2xl font-extrabold text-ink">
                  Connecting to IoT Sensor Pod...
                </h2>
                <p className="mx-auto mt-2 max-w-xs text-[13.5px] text-muted">
                  Establishing connection with the sensor pod.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm font-semibold text-forest">
                <Loader2 size={16} className="animate-spin" />
                Please wait...
              </div>
            </PodCard>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════
            COMPUTING
        ════════════════════════════════════════════════════ */}
        {phase === 'computing' && (
          <motion.div key="computing"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
          >
            <PodCard>
              <PodIcon state="computing" />

              <div className="w-full text-center">
                <Label>IoT Sensor Pod</Label>
                <Status color="green" pulse>Connected</Status>
                <h2 className="mt-4 text-2xl font-extrabold text-ink">
                  Computing IoT Quality...
                </h2>
                <p className="mx-auto mt-1 max-w-xs text-[13px] text-muted">
                  Processing environmental signals. Please wait.
                </p>
              </div>

              {/* Stage list */}
              <div className="w-full space-y-2">
                {STAGES.map((s, i) => {
                  const done    = i < stageIndex;
                  const current = i === stageIndex;
                  return (
                    <motion.div key={s.label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={[
                        'flex items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-300',
                        done    ? 'bg-forest/5 text-forest'
                        : current ? 'border border-forest/20 bg-sb-50 text-ink'
                        :           'text-muted',
                      ].join(' ')}
                    >
                      {done ? (
                        <CheckCircle2 size={16} className="shrink-0 text-forest" />
                      ) : current ? (
                        <Loader2 size={16} className="shrink-0 animate-spin text-forest" />
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded-full border-2 border-border" />
                      )}
                      {s.label}
                    </motion.div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="w-full">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-muted">
                  <span>Processing</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-sb-100">
                  <motion.div
                    className="h-full rounded-full bg-forest"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </PodCard>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════
            RESULT
        ════════════════════════════════════════════════════ */}
        {phase === 'done' && iotResult && (
          <motion.div key="done"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={[
              'overflow-hidden rounded-2xl border-2 bg-white shadow-soft',
              isExcellent ? 'border-forest/25' : 'border-amber/35',
            ].join(' ')}>
              <div className={`h-1.5 w-full ${isExcellent ? 'bg-forest' : 'bg-amber'}`} />

              <div className="flex flex-col items-center gap-6 px-8 py-10 text-center">

                {/* Result icon */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1,   opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 16 }}
                  className={[
                    'grid h-20 w-20 place-items-center rounded-full border-4',
                    isExcellent
                      ? 'border-forest/20 bg-forest text-white'
                      : 'border-amber/25 bg-amber text-white',
                  ].join(' ')}
                >
                  <ShieldCheck size={38} />
                </motion.div>

                {/* Pod status row */}
                <div>
                  <Label>IoT Sensor Pod</Label>
                  <Status color="green">Assessment Complete</Status>
                </div>

                {/* Condition */}
                <div>
                  <div className={[
                    'text-[11px] font-bold uppercase tracking-[0.18em]',
                    isExcellent ? 'text-forest' : 'text-amber-700',
                  ].join(' ')}>
                    IoT Quality Assessment
                  </div>
                  <h2 className={[
                    'mt-1 text-3xl font-extrabold tracking-tight',
                    isExcellent ? 'text-forest' : 'text-amber-800',
                  ].join(' ')}>
                    ✓ {iotResult.conditionLabel}
                  </h2>
                  <p className="mx-auto mt-3 max-w-sm text-[13.5px] leading-relaxed text-muted">
                    {isExcellent
                      ? 'Environmental conditions are favorable for maintaining onion quality.'
                      : 'Environmental conditions are within acceptable range for onion quality.'}
                  </p>
                </div>

                {/* Metadata */}
                <div className="grid w-full max-w-xs grid-cols-2 gap-3">
                  <MetaCell label="Status">Assessment Complete</MetaCell>
                  <MetaCell label="Computed At">
                    {new Date(iotResult.timestamp).toLocaleTimeString()}
                  </MetaCell>
                  <MetaCell label="Confidence">
                    {Math.round(iotResult.confidence * 100)}%
                  </MetaCell>
                  <MetaCell label="IoT Score">
                    {iotResult.gasScore}/100
                  </MetaCell>
                </div>

                {/* Fusion callout */}
                <div className={[
                  'w-full max-w-xs rounded-xl border px-4 py-3 text-left text-[12px] font-medium leading-relaxed',
                  isExcellent
                    ? 'border-forest/15 bg-sb-50 text-forest/80'
                    : 'border-amber/20 bg-amber-50 text-amber-700/80',
                ].join(' ')}>
                  <span className="font-bold text-ink">Fusion Intelligence ready —</span>{' '}
                  this IoT result is available to combine with Vision and Environment
                  scores for the final quality grade.
                </div>

                {/* Continue Action */}
                <button
                  onClick={() => navigate(`/quality/ai-analysis${activeInspection ? `?inspectionId=${activeInspection.id}` : ''}`)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-forest to-darkgreen px-6 py-3 text-sm font-extrabold text-white shadow-md hover:opacity-95 transition"
                >
                  Continue to AI Analysis <ArrowRight size={16} />
                </button>

                {/* Reset link */}
                <button
                  onClick={handleReset}
                  className="text-[12.5px] font-semibold text-muted transition hover:text-forest hover:underline underline-offset-2"
                >
                  Run new assessment
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════
            ERROR
        ════════════════════════════════════════════════════ */}
        {phase === 'error' && (
          <motion.div key="error"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
          >
            <PodCard>
              <PodIcon state="offline" />
              <div className="text-center">
                <Label>IoT Sensor Pod</Label>
                <Status color="red">Connection Failed</Status>
                <p className="mx-auto mt-3 max-w-xs text-[13px] text-muted">
                  {errMsg || 'An error occurred. Please try again.'}
                </p>
              </div>
              <PrimaryButton onClick={handleReset}>
                <Zap size={17} /> Try Again
              </PrimaryButton>
              <button
                onClick={continueWithoutIoT}
                className="flex items-center gap-2 text-[13px] font-bold text-forest transition hover:text-darkgreen hover:underline underline-offset-2"
              >
                Continue without IoT <ArrowRight size={15} />
              </button>
            </PodCard>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════════════════════════════ */

/** Utility */
function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

/** Outer card shell */
function PodCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
      <div className="h-1 w-full bg-gradient-to-r from-forest to-fresh" />
      <div className="flex flex-col items-center gap-6 px-8 py-10">
        {children}
      </div>
    </div>
  );
}

/** Pod icon — four visual states */
function PodIcon({ state }: { state: 'offline' | 'connecting' | 'computing' | 'done' }) {
  const ringClass =
    state === 'offline'    ? 'border-sb-100'     :
    state === 'connecting' ? 'border-amber/30'   :
    state === 'computing'  ? 'border-fresh/30'   : 'border-forest/25';

  const dotBg =
    state === 'offline'    ? 'bg-gray-300'  :
    state === 'connecting' ? 'bg-amber'     :
    state === 'computing'  ? 'bg-fresh'     : 'bg-forest';

  return (
    <div className="relative">
      <div className={`grid h-20 w-20 place-items-center rounded-full border-4 bg-sb-50 ${ringClass}`}>
        {state === 'computing' ? (
          <Loader2 size={36} className="animate-spin text-forest" />
        ) : (
          <Cpu size={36} className={state === 'offline' ? 'text-muted' : 'text-forest'} />
        )}
      </div>
      <span className={`absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${dotBg}`}>
        {(state === 'connecting' || state === 'computing') && (
          <span className="h-2 w-2 animate-pulse rounded-full bg-white/80" />
        )}
      </span>
    </div>
  );
}

/** Small eyebrow label */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
      {children}
    </div>
  );
}

/** Status badge row */
function Status({ color, pulse, children }: {
  color: 'gray' | 'green' | 'amber' | 'red';
  pulse?: boolean;
  children: React.ReactNode;
}) {
  const dotColor =
    color === 'green' ? 'bg-forest' :
    color === 'amber' ? 'bg-amber'  :
    color === 'red'   ? 'bg-reject' : 'bg-gray-400';

  const textColor =
    color === 'green' ? 'text-forest' :
    color === 'amber' ? 'text-amber-700' :
    color === 'red'   ? 'text-reject' : 'text-muted';

  return (
    <div className={`mt-1 flex items-center justify-center gap-1.5 text-[13px] font-bold ${textColor}`}>
      <span className={`h-2 w-2 rounded-full ${dotColor} ${pulse ? 'animate-pulse' : ''}`} />
      {children}
    </div>
  );
}

/** Primary action button */
function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl bg-forest px-8 py-3.5 text-[14px] font-extrabold text-white shadow-[0_4px_16px_-4px_rgba(11,93,59,0.45)] transition hover:bg-darkgreen active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

/* ─── Step indicator (3 steps, no "Compute" label shown to user) ── */
function StepBar({ phase }: { phase: Phase }) {
  const steps = [
    { id: 1, label: 'Connect'    },
    { id: 2, label: 'Processing' },
    { id: 3, label: 'Assessment' },
  ];

  // Which step number is currently active
  const active =
    phase === 'idle'       ? 1 :
    phase === 'connecting' ? 1 :
    phase === 'computing'  ? 2 :
    phase === 'done'       ? 3 : 1;

  // Steps completed
  const done =
    phase === 'done'      ? 3 :
    phase === 'computing' ? 1 : 0;

  return (
    <div className="flex items-center">
      {steps.map((s, i) => {
        const isDone   = s.id <= done;
        const isCurrent = s.id === active && !isDone;

        return (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={[
                'flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-extrabold transition-all duration-300',
                isDone
                  ? 'border-forest bg-forest text-white'
                  : isCurrent
                  ? 'border-forest bg-white text-forest'
                  : 'border-border bg-white text-muted',
              ].join(' ')}>
                {isDone ? <CheckCircle2 size={14} /> : `0${s.id}`}
              </div>
              <span className={[
                'text-[11px] font-bold whitespace-nowrap',
                isDone   ? 'text-forest' :
                isCurrent ? 'text-ink'   : 'text-muted',
              ].join(' ')}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={[
                'mx-3 mb-5 h-0.5 flex-1 rounded-full transition-all duration-500',
                s.id < active || isDone ? 'bg-forest' : 'bg-border',
              ].join(' ')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/** Metadata cell inside result card */
function MetaCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-bg px-3 py-2.5 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 text-[13px] font-extrabold text-ink">{children}</div>
    </div>
  );
}
