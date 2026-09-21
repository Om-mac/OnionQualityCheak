import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TrendingUp, BadgeCheck, Coins } from 'lucide-react';
import { CountUp, Reveal, SectionHeading } from './primitives';

const GRADES = [
  {
    label: 'Grade A',
    badge: 'Premium export',
    pct: 64,
    color: '#F2C75C',
    softColor: 'rgba(242,199,92,0.10)',
    desc: 'Export-quality onions — uniform size, no visible defects, premium market access.',
    value: '₹28 — ₹34 / kg',
    delta: '+18%',
  },
  {
    label: 'Grade B',
    badge: 'Domestic premium',
    pct: 25,
    color: '#42D17B',
    softColor: 'rgba(66,209,123,0.10)',
    desc: 'Suitable for domestic retail. Light surface blemishes, no rot, normal shelf life.',
    value: '₹18 — ₹24 / kg',
    delta: '+6%',
  },
  {
    label: 'Grade C',
    badge: 'Processing',
    pct: 11,
    color: '#EF4444',
    softColor: 'rgba(239,68,68,0.10)',
    desc: 'Suitable only for processing or quick consumption. Higher spoilage risk.',
    value: '₹8 — ₹14 / kg',
    delta: '-4%',
  },
];

export default function MarketValue() {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden bg-ink-800 py-20 sm:py-24 lg:py-28" id="market">
      <div className="pointer-events-none absolute -right-40 top-32 h-80 w-80 rounded-full bg-gold/8 blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <Reveal>
            <SectionHeading
              eyebrow="Grade & Market Value"
              title="From quality score to fairer market decisions."
              sub="A clear grade is not just a label. It maps to a transparent market value range — so farmers, FPOs and buyers negotiate with the same numbers."
              className="max-w-xl"
            />
          </Reveal>

          <Reveal delay={0.1}>
            <div className="grid grid-cols-2 gap-3 lg:max-w-md">
              <div className="rounded-2xl border border-white/10 bg-ink-700 p-4 shadow-soft">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
                  <TrendingUp size={11} strokeWidth={2.4} />
                  Avg. value uplift
                </div>
                <div className="mt-2 flex items-baseline gap-0.5">
                  <span className="font-display text-[28px] font-extrabold tracking-tight text-cream">
                    <CountUp value={22} duration={1500} />
                  </span>
                  <span className="text-[14px] font-bold text-gold">%</span>
                </div>
                <p className="mt-1.5 text-[11px] text-cream-dim">vs. unverified lots</p>
              </div>
              <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/15 to-ink-700 p-4 text-cream shadow-soft">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
                  <Coins size={11} strokeWidth={2.4} />
                  Verified lots
                </div>
                <div className="mt-2 flex items-baseline gap-0.5">
                  <span className="font-display text-[28px] font-extrabold tracking-tight">
                    <CountUp value={1248} duration={1700} />
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-cream-muted">inspected this season</p>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          <div className="mt-12 rounded-[28px] border border-white/10 bg-ink-700 p-5 shadow-card sm:p-6">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cream-muted">Batch Distribution</div>
              <div className="font-mono text-[10px] text-cream-dim">Season · 2025-26</div>
            </div>

            <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-white/10">
              {GRADES.map((g, i) => (
                <motion.div
                  key={g.label}
                  className="h-full"
                  style={{ background: g.color }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${g.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.2 + i * 0.18, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-3">
              {GRADES.map((g, i) => (
                <motion.div
                  key={g.label}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 p-4"
                  style={{ background: g.softColor }}
                  initial={{ opacity: 0, y: reduce ? 0 : 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.55, delay: 0.3 + i * 0.12 }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: g.color }}>
                        {g.label}
                      </div>
                      <div className="mt-1 text-[18px] font-extrabold tracking-tight text-cream">
                        {g.value}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-ink-800 px-2 py-1 text-[10px] font-bold text-cream shadow-soft">
                      <BadgeCheck size={11} strokeWidth={2.4} />
                      {g.pct}%
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] leading-relaxed text-cream-muted">
                    {g.desc}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cream-dim">
                      {g.badge}
                    </span>
                    <span className="font-mono text-[11px] font-bold" style={{ color: g.color }}>
                      {g.delta}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}