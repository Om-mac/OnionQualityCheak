import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CountUp, DemoNote, Reveal, SectionHeading } from './primitives';
import { Thermometer, Droplets, Wind, Activity, AlertCircle, Radio } from 'lucide-react';

/* Illustrative sensor data */
const TREND = [
  { t: '0h',  v: 22 },
  { t: '6h',  v: 24 },
  { t: '12h', v: 26 },
  { t: '18h', v: 28 },
  { t: '24h', v: 27 },
  { t: '30h', v: 30 },
  { t: '36h', v: 32 },
  { t: '42h', v: 31 },
];

// All gold/amber/champagne tones — no blue, no green
const SENSORS = [
  { Icon: Thermometer, k: 'Temperature', v: 24.8, unit: '°C',  decimals: 1, tone: '#D6A84F' },
  { Icon: Droplets,    k: 'Humidity',    v: 62,   unit: '%',   decimals: 0, tone: '#E8C978' },
  { Icon: Wind,        k: 'Ethylene',    v: 0.42, unit: 'ppm', decimals: 2, tone: '#C49040' },
  { Icon: Activity,    k: 'CO₂',         v: 612,  unit: 'ppm', decimals: 0, tone: '#B8883A' },
];

// Pod status — warm amber tones only
const POD_STATUS = [
  { k: 'Sensor link', v: 'Stable',      c: '#D6A84F' },
  { k: 'Battery',     v: '78%',         c: '#E8C978' },
  { k: 'Calibration', v: 'On schedule', c: '#D6A84F' },
  { k: 'Last sync',   v: '2 min ago',   c: '#E8C978' },
];

function SparkLine() {
  const reduce = useReducedMotion();
  const W = 280, H = 90, PAD = 10;
  const max = Math.max(...TREND.map((d) => d.v));
  const min = Math.min(...TREND.map((d) => d.v));
  const pts = TREND.map((d, i) => {
    const x = PAD + (i / (TREND.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((d.v - min) / (max - min)) * (H - PAD * 2);
    return { x, y, ...d };
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${path} L${pts[pts.length - 1].x.toFixed(1)},${H - PAD} L${pts[0].x.toFixed(1)},${H - PAD} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[90px] w-full" aria-hidden>
      <defs>
        <linearGradient id="iotFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#D6A84F" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#D6A84F" stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((g) => {
        const y = PAD + (g / 2) * (H - PAD * 2);
        return <line key={g} x1={PAD} x2={W - PAD} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="2 4" />;
      })}
      <motion.path d={area} fill="url(#iotFill)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.6 }} />
      <motion.path
        d={path}
        fill="none"
        stroke="#D6A84F"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: reduce ? 1 : 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: 'easeInOut' }}
      />
      {pts.map((p, i) => (
        <motion.circle
          key={p.t}
          cx={p.x}
          cy={p.y}
          r="3"
          fill="#101722"
          stroke="#D6A84F"
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 1.1 + i * 0.12 }}
        />
      ))}
    </svg>
  );
}

export default function IoTDashboard() {
  const reduce = useReducedMotion();

  return (
    <section
      className="relative overflow-hidden py-20 sm:py-24 lg:py-28"
      id="iot"
      style={{ background: '#F7F5EF' }}
    >
      {/* Gold ambient glow */}
      <div
        className="pointer-events-none absolute right-0 top-1/3 -translate-y-1/2 rounded-full opacity-35"
        style={{ width: 450, height: 450, background: 'radial-gradient(circle, rgba(214,168,79,0.18) 0%, transparent 70%)', filter: 'blur(60px)' }}
        aria-hidden
      />

      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <Reveal>
            <div className="max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.22em]" style={{ color: '#D6A84F' }}>
                <span className="h-px w-7" style={{ background: 'rgba(214,168,79,0.55)' }} />
                IoT + Environment
                <span className="h-px w-7" style={{ background: 'rgba(214,168,79,0.55)' }} />
              </div>
              <h2 className="font-display text-display-lg" style={{ color: '#111820' }}>
                Quality doesn't stop<br />at inspection.
              </h2>
              <p className="mt-5 text-[15.5px] leading-[1.65]" style={{ color: '#59636D' }}>
                Storage conditions quietly decide whether your onions stay Grade A or slip into
                spoilage. OnionSure listens to that story — continuously.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {/* Gold "LIVE" status — not green */}
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em]"
                style={{ border: '1px solid rgba(214,168,79,0.30)', background: 'rgba(214,168,79,0.10)', color: '#D6A84F' }}
              >
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#D6A84F' }} />
                Live · sensor pod online
              </span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.18}>
          <div className="mt-14 grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:gap-6">

            {/* Main sensor dashboard card */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.3 }}
              className="rounded-[28px] p-5 shadow-card sm:p-6"
              style={{ background: '#FFFFFF', border: '1px solid rgba(16,23,34,0.09)', boxShadow: '0 1px 3px rgba(16,23,34,0.05), 0 18px 50px -16px rgba(16,23,34,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: '#D6A84F' }}
                  >
                    <Radio size={11} strokeWidth={2.4} />
                    IoT Quality Pod
                  </div>
                  <h3 className="mt-2 text-[20px] font-extrabold tracking-tight" style={{ color: '#111820' }}>
                    Storage environment · last 42 hours
                  </h3>
                </div>
                <span
                  className="rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ border: '1px solid rgba(214,168,79,0.35)', background: 'rgba(214,168,79,0.10)', color: '#D6A84F' }}
                >
                  Demo
                </span>
              </div>

              {/* Sensor grid — all gold/warm tones */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {SENSORS.map(({ Icon, k, v, unit, decimals, tone }, i) => (
                  <motion.div
                    key={k}
                    whileHover={{ scale: 1.03, y: -2 }}
                    transition={{ duration: 0.22 }}
                    className="rounded-2xl p-3 cursor-default"
                    style={{ background: '#F7F5EF', border: '1px solid rgba(16,23,34,0.08)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon size={12} style={{ color: tone }} strokeWidth={2.4} />
                      <span className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: '#59636D' }}>{k}</span>
                    </div>
                    <div className="mt-1.5 font-mono text-[18px] font-extrabold leading-none" style={{ color: '#111820' }}>
                      <CountUp value={v} decimals={decimals} duration={1000 + i * 120} />
                      <span className="ml-0.5 text-[10px] font-bold" style={{ color: '#59636D' }}>{unit}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Temperature trend chart */}
              <div
                className="mt-5 rounded-2xl px-3 py-3"
                style={{ background: '#F7F5EF', border: '1px solid rgba(16,23,34,0.08)' }}
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#59636D' }}>Temperature Trend</span>
                  <span className="font-mono text-[10px]" style={{ color: '#B8C3CE' }}>22.0 — 32.4 °C</span>
                </div>
                <SparkLine />
              </div>
              <DemoNote>
                Illustrative demo trend shown for explanation. Values are not measurements
                from a specific lot or installation.
              </DemoNote>
            </motion.div>

            {/* Right side cards */}
            <div className="flex flex-col gap-5">

              {/* Spoilage risk */}
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.28 }}
                className="rounded-[24px] p-5 shadow-card sm:p-6 cursor-default"
                style={{
                  background: 'linear-gradient(135deg, rgba(214,168,79,0.14) 0%, #FFFFFF 60%)',
                  border: '1px solid rgba(214,168,79,0.30)',
                  boxShadow: '0 1px 3px rgba(16,23,34,0.05), 0 18px 50px -16px rgba(16,23,34,0.10)',
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(214,168,79,0.80)' }}>Spoilage Risk</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-[44px] font-extrabold leading-none tracking-tight" style={{ color: '#111820' }}>
                    <CountUp value={18} duration={1500} />
                  </span>
                  <span className="text-[14px] font-bold" style={{ color: '#59636D' }}>%</span>
                </div>
                <p className="mt-3 text-[11.5px] leading-relaxed" style={{ color: '#59636D' }}>
                  Based on temperature, humidity and ethylene trends over the last 36 hours.
                  OnionSure raises this risk automatically.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[10.5px] font-bold" style={{ color: '#D6A84F' }}>
                  <AlertCircle size={12} strokeWidth={2.4} />
                  Action: check airflow · 4 hr window
                </div>
              </motion.div>

              {/* Pod status — all warm amber, no green */}
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.28 }}
                className="rounded-[24px] p-5 shadow-card cursor-default"
                style={{ background: '#FFFFFF', border: '1px solid rgba(16,23,34,0.09)' }}
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#59636D' }}>Pod Status</div>
                <ul className="mt-3 space-y-2.5">
                  {POD_STATUS.map((r) => (
                    <li
                      key={r.k}
                      className="flex items-center justify-between border-b pb-1.5 last:border-b-0 last:pb-0"
                      style={{ borderColor: 'rgba(16,23,34,0.07)' }}
                    >
                      <span className="text-[11.5px]" style={{ color: '#59636D' }}>{r.k}</span>
                      <span className="font-mono text-[11.5px] font-bold" style={{ color: r.c }}>
                        {r.v}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}