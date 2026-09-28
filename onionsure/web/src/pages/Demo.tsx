import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { PlayCircle, RotateCcw, AlertTriangle, CheckCircle2, Radio, ScanLine, GitMerge, Award, Tractor, FlaskConical } from 'lucide-react';
import { api } from '../lib/api';
import { gradeLabel } from '../lib/grades';
import { Logo } from '../components/Brand';

const STEPS = ['Lot Registration', 'Sample Collection', 'IoT Pod Sensing', 'Image Capture', 'AI Analysis', 'Fusion Intelligence', 'Digital Certificate'];

export default function Demo() {
  const [scenario, setScenario] = useState<'standard' | 'spoilage'>('standard');
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [result, setResult] = useState<any>(null);
  const [count, setCount] = useState(60);
  const timers = useRef<number[]>([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const start = async (sc: 'standard' | 'spoilage') => {
    clearTimers();
    setScenario(sc); setRunning(true); setStep(0); setResult(null); setCount(60);
    try {
      const r = await api.demoPublic({ scenario: sc });
      setResult(r);
      // Sensor countdown
      const cd = setInterval(() => setCount((c) => (c <= 1 ? 0 : c - 1)), 1000);
      timers.current.push(cd as any);
      // Advance steps
      for (let i = 1; i <= STEPS.length - 1; i++) {
        const t = window.setTimeout(() => setStep(i), 2500 + i * 2300);
        timers.current.push(t);
      }
      const done = window.setTimeout(() => setRunning(false), 2500 + (STEPS.length - 1) * 2300 + 800);
      timers.current.push(done);
    } catch (e) { setRunning(false); }
  };

  useEffect(() => () => clearTimers(), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-darkgreen via-forest to-emerald-900 text-white">
      <header className="border-b border-white/10 px-5 py-4"><div className="mx-auto max-w-5xl"><Logo /></div></header>

      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="text-center">
          <div className="chip bg-white/15 mx-auto w-fit"><FlaskConical size={14} /> SIH 2026 Demo Mode</div>
          <h1 className="mt-3 text-4xl font-extrabold">Run Demo Inspection</h1>
          <p className="mt-2 text-emerald-100/80">Watch the full multimodal pipeline — no hardware required.</p>
        </div>

        {!result && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <button className="btn-primary bg-white text-forest hover:bg-emerald-50" onClick={() => start('standard')}><PlayCircle size={18} /> Run Standard Batch</button>
            <button className="btn-ghost border-white/40 bg-white/10 text-white hover:bg-white/20" onClick={() => start('spoilage')}><AlertTriangle size={16} /> Run Early-Spoilage Scenario</button>
          </div>
        )}

        {result && (
          <div className="mt-8">
            {/* Stepper */}
            <div className="flex flex-wrap justify-center gap-2">
              {STEPS.map((s, i) => (
                <div key={s} className={`chip ${i <= step ? 'bg-white text-forest' : 'bg-white/10 text-emerald-100/70'}`}>{i < step ? <CheckCircle2 size={13} /> : i === step ? <span className="h-2 w-2 animate-pulse rounded-full bg-forest" /> : null}{s}</div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
                {step === 0 && <StepLot r={result} />}
                {step === 1 && <StepSample />}
                {step === 2 && <StepSensor r={result} count={count} />}
                {step === 3 && <StepCapture />}
                {step === 4 && <StepAnalysis r={result} />}
                {step === 5 && <StepFusion r={result} />}
                {step === 6 && <StepCert r={result} />}
              </motion.div>
            </AnimatePresence>

            {!running && step >= STEPS.length - 1 && (
              <div className="mt-8 flex justify-center gap-3">
                <button className="btn-ghost border-white/40 bg-white/10 text-white" onClick={() => start(scenario)}><RotateCcw size={16} /> Replay</button>
                <Link to="/login" className="btn-primary bg-white text-forest hover:bg-emerald-50">Sign in to platform <Award size={16} /></Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Panel({ icon: I, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-2 text-fresh"><I size={18} /><span className="font-bold">{title}</span></div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function StepLot({ r }: { r: any }) {
  return <Panel icon={Tractor} title="Step 1 · Lot Registration">
    <div className="grid grid-cols-2 gap-3 text-sm">
      <Row k="Lot ID" v={r.lot.lotNumber} /><Row k="Crop" v={r.lot.crop} /><Row k="Variety" v={r.lot.variety} />
      <Row k="Quantity" v={`${r.lot.quantityKg} kg`} /><Row k="FPO" v="Nashik Onion Growers FPO" /><Row k="Center" v="Nashik Central" />
    </div>
  </Panel>;
}
function StepSample() {
  return <Panel icon={FlaskConical} title="Step 2 · Sample Collection">
    <p className="text-emerald-100/80">Place a 1–2 kg representative onion sample inside the enclosed low-cost sensor chamber.</p>
    <div className="mt-3 rounded-xl bg-white/10 p-4 text-center text-sm">Sample weight: <b>1.5 kg</b> · Representative batch selected</div>
  </Panel>;
}
function StepSensor({ r, count }: { r: any; count: number }) {
  const s = r.gas.readings;
  return <Panel icon={Radio} title="Step 3 · IoT Pod Sensing">
    <div className="text-center text-xs text-emerald-100/70">Sensor stabilization</div>
    <div className="text-center text-5xl font-extrabold tabular-nums">{String(count).padStart(2, '0')}</div>
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <Row k="Ethane" v={`${s.ethane} ppm`} /><Row k="Methane" v={`${s.methane} ppm`} />
      <Row k="Temperature" v={`${s.temperature}°C`} /><Row k="Humidity" v={`${s.humidity}%`} />
    </div>
    {r.gas.stage !== 'LOW' && <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber/20 px-3 py-2 text-sm text-amber-200"><AlertTriangle size={15} /> Gas risk: {r.gas.stage}</div>}
  </Panel>;
}
function StepCapture() {
  const slots = ['Front', 'Top', 'Side', 'Close-up'];
  return <Panel icon={ScanLine} title="Step 4 · Image Capture">
    <div className="grid grid-cols-2 gap-3">
      {slots.map((s) => <div key={s} className="relative grid h-24 place-items-center rounded-xl bg-gradient-to-br from-fresh/30 to-forest"><ScanLine size={22} className="text-white/80" /><span className="absolute bottom-1 right-2 text-xs text-white/80">{s}</span></div>)}
    </div>
  </Panel>;
}
function StepAnalysis({ r }: { r: any }) {
  const c = r.vision.counts;
  return <Panel icon={ScanLine} title="Step 5 · AI Analysis">
    <ul className="space-y-1 text-sm">
      <li>✓ Detecting defects (YOLO-class)</li><li>✓ Estimating onion size</li><li>✓ Analyzing gas signature</li><li>✓ Calculating fusion score</li>
    </ul>
    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
      <Row k="Healthy" v={c.healthy} /><Row k="Damaged" v={c.damaged} /><Row k="Rotten" v={c.rotten} /><Row k="Sprouted" v={c.sprouted} /><Row k="Undersized" v={c.undersized} />
    </div>
    <div className="mt-2 text-sm">Vision Score: <b>{r.vision.visionScore}/100</b></div>
  </Panel>;
}
function StepFusion({ r }: { r: any }) {
  const f = r.fusion;
  return <Panel icon={GitMerge} title="Step 6 · Fusion Intelligence">
    <div className="grid grid-cols-3 gap-2 text-center text-sm">
      <div className="rounded-lg bg-white/10 p-3"><div className="text-xs">VISION</div><div className="text-xl font-bold">{f.visionScore}%</div></div>
      <div className="rounded-lg bg-white/10 p-3"><div className="text-xs">GAS</div><div className="text-xl font-bold">{f.gasScore}%</div></div>
      <div className="rounded-lg bg-white/10 p-3"><div className="text-xs">ENV</div><div className="text-xl font-bold">{f.environmentalScore}%</div></div>
    </div>
    <div className="mt-4 rounded-xl bg-white px-4 py-4 text-center text-emerald-950">
      <div className="text-xs uppercase tracking-widest text-emerald-600">Final Quality Score</div>
      <div className="text-4xl font-extrabold">{f.finalScore}/100</div>
      <div className="mt-1 font-bold">{gradeLabel(f.grade)}</div>
    </div>
    {f.earlySpoilageAlert && <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber/20 px-3 py-2 text-sm text-amber-200"><AlertTriangle size={16} /> {f.explanation}</div>}
  </Panel>;
}
function StepCert({ r }: { r: any }) {
  const url = `${window.location.origin}/verify/${r.certificate.certificateNumber}`;
  return <Panel icon={Award} title="Step 7 · Digital Certificate">
    <div className="flex items-center gap-5">
      <QRCodeSVG value={url} size={120} bgColor="#ffffff" fgColor="#0B5D3B" />
      <div className="flex-1 text-sm">
        <div className="text-xs text-emerald-100/70">Certificate</div>
        <div className="font-bold">{r.certificate.certificateNumber}</div>
        <div className="mt-2">Grade: <b>{gradeLabel(r.certificate.grade)}</b> · Score: <b>{r.certificate.qualityScore}/100</b></div>
        <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-fresh underline">Open public verification →</a>
      </div>
    </div>
  </Panel>;
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between border-b border-white/10 pb-1"><span className="text-emerald-100/70">{k}</span><span className="font-semibold">{v}</span></div>;
}
