import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CountUp, DetectBox, Reveal, SectionHeading } from './primitives';
import { Cpu, ScanLine, Zap, CheckCircle2 } from 'lucide-react';

const DETECTIONS = [
  { label: 'Healthy',    conf: 96, tone: 'healthy'    as const, style: { left: '5%',  top: '12%', width: '26%', height: '34%' }, delay: 0.25 },
  { label: 'Damaged',    conf: 91, tone: 'damaged'    as const, style: { left: '37%', top: '20%', width: '24%', height: '30%' }, delay: 0.40 },
  { label: 'Rotten',     conf: 94, tone: 'rotten'     as const, style: { left: '67%', top: '10%', width: '26%', height: '32%' }, delay: 0.55 },
  { label: 'Sprouted',   conf: 88, tone: 'sprouted'   as const, style: { left: '13%', top: '54%', width: '24%', height: '32%' }, delay: 0.70 },
  { label: 'Undersized', conf: 85, tone: 'undersized' as const, style: { left: '51%', top: '58%', width: '23%', height: '30%' }, delay: 0.85 },
];

const SUMMARY = [
  { v: 128, l: 'Detected' },
  { v: 105, l: 'Healthy' },
  { v: 9,   l: 'Damaged' },
  { v: 5,   l: 'Rotten' },
  { v: 4,   l: 'Sprouted' },
  { v: 5,   l: 'Undersized' },
];

// All gold/amber/champagne — no blue, no green
const SIGNALS = [
  { Icon: Cpu,      k: 'Vision',     v: 94, c: '#D6A84F' },
  { Icon: Zap,      k: 'Inference',  v: 96, c: '#E8C978' },
  { Icon: ScanLine, k: 'Scan Speed', v: 92, c: '#C49040' },
];

export default function AIInspection() {
  const reduce = useReducedMotion();

  return (
    <section
      className="relative overflow-hidden py-20 sm:py-24 lg:py-28"
      id="ai-inspection"
      style={{ background: '#101722' }}
    >
      {/* Gold ambient glow */}
      <div
        className="pointer-events-none absolute right-0 top-1/3 -translate-y-1/2 rounded-full opacity-20"
        style={{ width: 480, height: 480, background: 'radial-gradient(circle, rgba(214,168,79,0.22) 0%, transparent 70%)', filter: 'blur(60px)' }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1280px] px-5 sm:px-8">
        {/* Header row */}
        <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <Reveal>
            <div className="max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.22em]" style={{ color: '#D6A84F' }}>
                <span className="h-px w-7" style={{ background: 'rgba(214,168,79,0.60)' }} />
                AI Computer Vision
                <span className="h-px w-7" style={{ background: 'rgba(214,168,79,0.60)' }} />
              </div>
              <h2 className="font-display text-display-lg" style={{ color: '#FFFFFF' }}>
                Computer vision that<br />sees beyond the surface.
              </h2>
              <p className="mt-5 text-[15.5px] leading-[1.65]" style={{ color: '#B8C3CE' }}>
                Our trained models detect five quality signals per onion — visible defects, surface
                rot, sprouting, undersized bulbs and grading class — in seconds.
              </p>
            </div>
          </Reveal>

          {/* Signal chips — all gold tones */}
          <Reveal delay={0.1}>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {SIGNALS.map(({ Icon, k, v, c }) => (
                <motion.div
                  key={k}
                  whileHover={{ y: -2, scale: 1.03 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2 rounded-full px-3 py-1.5 cursor-default"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <Icon size={13} style={{ color: c }} strokeWidth={2.2} />
                  <span className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: '#B8C3CE' }}>{k}</span>
                  <span className="font-mono text-[12px] font-extrabold" style={{ color: '#FFFFFF' }}>{v}</span>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Showcase */}
        <Reveal delay={0.18}>
          <div className="mt-14 grid gap-5 lg:grid-cols-[1.55fr_1fr] lg:gap-6">

            {/* Detection plate */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              transition={{ duration: 0.35 }}
              className="relative overflow-hidden rounded-[28px] p-3 shadow-card"
              style={{ background: '#111B2B', border: '1px solid rgba(255,255,255,0.09)' }}
            >
              <div className="relative overflow-hidden rounded-2xl bg-black/40">
                <img
                  src="/onions/spotted-batch.jpg"
                  alt="Onion batch under computer vision analysis"
                  loading="lazy"
                  decoding="async"
                  className="aspect-[16/10] w-full object-cover"
                />
                {/* Gold scan sweep — no green */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div
                    className="absolute inset-x-0 h-1/2 animate-scan"
                    style={{ background: 'linear-gradient(to bottom, transparent, rgba(214,168,79,0.18), transparent)' }}
                  />
                </div>
                {/* CV bounding boxes */}
                {DETECTIONS.map((d) => (
                  <DetectBox key={d.label} {...d} />
                ))}
                {/* Status pill — gold instead of green */}
                <div
                  className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold backdrop-blur"
                  style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.14)', color: '#FFFFFF' }}
                >
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#D6A84F' }} />
                  Vision model · v3.2
                </div>
              </div>
            </motion.div>

            {/* Right panel */}
            <div className="flex flex-col gap-5">

              {/* Detection summary */}
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.28 }}
                className="rounded-[24px] p-5 shadow-card"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#B8C3CE' }}>Detection Summary</div>
                  <div className="font-mono text-[10px]" style={{ color: '#667085' }}>Lot · ON-2025-00421</div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {SUMMARY.map((s, i) => (
                    <div key={s.l}>
                      <div className="font-mono text-[22px] font-extrabold leading-none" style={{ color: '#FFFFFF' }}>
                        <CountUp value={s.v} duration={900 + i * 100} />
                      </div>
                      <div className="mt-1 text-[9.5px] font-medium uppercase tracking-wide" style={{ color: '#667085' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Vision score — gold bar, no green */}
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.28 }}
                className="rounded-[24px] p-5 shadow-card"
                style={{
                  background: 'linear-gradient(135deg, rgba(214,168,79,0.10) 0%, rgba(17,27,43,1) 50%, rgba(17,27,43,1) 100%)',
                  border: '1px solid rgba(214,168,79,0.22)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#D6A84F' }}>Vision Score</span>
                  {/* Gold "Confirmed" badge — no green */}
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
                    style={{ background: 'rgba(214,168,79,0.15)', color: '#D6A84F', border: '1px solid rgba(214,168,79,0.35)' }}
                  >
                    <CheckCircle2 size={11} strokeWidth={2.4} />
                    Confirmed
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-[44px] font-extrabold leading-none tracking-tight" style={{ color: '#FFFFFF' }}>
                    <CountUp value={94} duration={1500} />
                  </span>
                  <span className="text-[14px] font-bold" style={{ color: '#B8C3CE' }}>/ 100</span>
                </div>
                {/* Gold progress bar — no green */}
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #C49040 0%, #D6A84F 50%, #E8C978 100%)' }}
                    initial={{ width: 0 }}
                    whileInView={{ width: '94%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <p className="mt-4 text-[11.5px] leading-relaxed" style={{ color: '#B8C3CE' }}>
                  Confidence-weighted across all classes. The model reports its own uncertainty
                  so that downstream decisions stay honest.
                </p>
              </motion.div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
