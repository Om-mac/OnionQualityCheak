import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Cpu, Radio, Brain, FileBarChart, Sparkles } from 'lucide-react';
import { Reveal, SectionHeading } from './primitives';

const NODES = [
  { Icon: Cpu, k: 'Computer Vision', d: 'Trained CNN + YOLO for defect & grade classification.', color: '#42D17B' },
  { Icon: Radio, k: 'IoT Sensing', d: 'Temperature, humidity, ethylene, CO₂ in real time.', color: '#F2C75C' },
  { Icon: Brain, k: 'AI Analytics', d: 'Weighted fusion across vision, gas & environment.', color: '#F2C75C' },
  { Icon: FileBarChart, k: 'Digital Reporting', d: 'QR-verifiable, AI-signed quality certificates.', color: '#42D17B' },
];

function FlowDiagram() {
  const reduce = useReducedMotion();
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[36px] bg-emerald/10 blur-2xl" />

      <div className="glass-strong relative rounded-[28px] border-white/12 p-5 shadow-card sm:p-7">
        {/* Inputs row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {NODES.map(({ Icon, k, d, color }, i) => (
            <motion.div
              key={k}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-center"
            >
              <span
                className="mx-auto grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: `${color}1A`, color }}
              >
                <Icon size={16} strokeWidth={2.2} />
              </span>
              <div className="mt-2.5 text-[12px] font-extrabold tracking-tight text-cream">{k}</div>
              <div className="mt-1 text-[10.5px] leading-snug text-cream-muted">{d}</div>
              <span
                className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full ring-2 ring-ink"
                style={{ background: color }}
              />
            </motion.div>
          ))}
        </div>

        {/* Connecting lines */}
        <svg
          className="pointer-events-none absolute left-0 right-0 hidden sm:block"
          style={{ top: 'calc(100% - 60px)', height: 60 }}
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
          aria-hidden
        >
          {[
            { from: 12.5, to: 50 },
            { from: 37.5, to: 50 },
            { from: 62.5, to: 50 },
            { from: 87.5, to: 50 },
          ].map((l, i) => (
            <motion.path
              key={i}
              d={`M${l.from} 0 L${l.to} 60`}
              stroke="#F2C75C"
              strokeWidth="0.6"
              strokeOpacity="0.35"
              strokeDasharray="2 3"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.0, delay: 0.5 + i * 0.15, ease: 'easeInOut' }}
            />
          ))}
        </svg>

        {/* Equal sign / hub */}
        <div className="mt-12 flex flex-col items-center sm:mt-16">
          <motion.div
            initial={{ opacity: 0, scale: reduce ? 1 : 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
            className="grid place-items-center rounded-full border border-gold/40 bg-ink-800 px-4 py-2 shadow-glass"
          >
            <span className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-gold">Fusion</span>
          </motion.div>

          <div className="mt-2 flex items-center gap-1.5 text-gold/70">
            <span className="text-[14px] font-extrabold">+</span>
            <span className="text-[14px] font-extrabold">+</span>
            <span className="text-[14px] font-extrabold">+</span>
            <span className="text-[14px] font-extrabold">+</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.55, delay: 1.2 }}
            className="mt-2 rounded-full bg-gold-grad px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-ink shadow-goldGlow"
          >
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={12} strokeWidth={2.4} />
              Quality Intelligence
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function Technology() {
  return (
    <section
      className="relative overflow-hidden bg-ink-900 py-20 sm:py-24 lg:py-28"
      id="technology"
    >
      {/* subtle dotted grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 72%)',
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-5 sm:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="The Technology"
            align="center"
            title={<>Computer vision + IoT + AI +<br />digital reporting.</>}
            sub="OnionSure combines four technology layers into one explainable platform — so every grade, every score, and every report can be traced back to its inputs."
          />
        </Reveal>

        <div className="mt-14">
          <FlowDiagram />
        </div>
      </div>
    </section>
  );
}
