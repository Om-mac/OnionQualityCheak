import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ScanSearch, BadgeCheck, Tag, Radio, FileText, BarChart3,
  History, Users, Layers,
} from 'lucide-react';
import { Reveal, SectionHeading } from './primitives';

const FEATURES = [
  { Icon: ScanSearch, t: 'AI Defect Detection', d: 'Detects healthy, damaged, rotten, sprouted and undersized onions in seconds.' },
  { Icon: BadgeCheck, t: 'Computer Vision Grading', d: 'Standardized Grade A / B / C classification with confidence scores.' },
  { Icon: Tag, t: 'Grade & Market Value', d: 'Translates quality score into an estimated market value range.' },
  { Icon: Radio, t: 'IoT Spoilage Monitoring', d: 'Sensors detect spoilage risk before it shows on the surface.' },
  { Icon: FileText, t: 'Digital Quality Reports', d: 'QR-verifiable, timestamped, shareable quality certificates.' },
  { Icon: Layers, t: 'Batch Analytics', d: 'Compare grade mix, defect rate and value across lots and centers.' },
  { Icon: History, t: 'Traceability', d: 'Track every lot back to farmer, center and inspection timestamp.' },
  { Icon: BarChart3, t: 'Quality History', d: 'Season-on-season trend analysis for procurement planning.' },
  { Icon: Users, t: 'FPO Dashboard', d: 'Centralized dashboard for cooperative-scale operations.' },
];

export default function Features() {
  const reduce = useReducedMotion();
  return (
    <section
      className="relative overflow-hidden bg-ink py-20 sm:py-24 lg:py-28"
      id="features"
    >
      <div className="pointer-events-none absolute left-1/4 bottom-0 h-72 w-72 rounded-full bg-orb-gold opacity-25 blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-[1280px] px-5 sm:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Everything in one platform"
            align="center"
            title="A complete quality intelligence stack."
            sub="Every module is built to make quality decisions faster, fairer and fully traceable — from a single bulb to an entire cooperative."
          />
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {FEATURES.map(({ Icon, t, d }, i) => (
            <Reveal key={t} delay={0.05 + (i % 3) * 0.08}>
              <motion.article
                whileHover={reduce ? undefined : { y: -4 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="group card-ivory-hover relative h-full overflow-hidden rounded-2xl border-white/10 bg-white/[0.03] p-5 shadow-soft"
              >
                {/* subtle gradient accent */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gold/20 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                />
                <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-gold/10 ring-1 ring-gold/30">
                  <Icon size={16} className="text-gold" strokeWidth={2.2} />
                </span>
                <h3 className="relative mt-4 text-[15px] font-extrabold tracking-tight text-cream">
                  {t}
                </h3>
                <p className="relative mt-1.5 text-[12.5px] leading-relaxed text-cream-muted">
                  {d}
                </p>
                <div className="relative mt-5 inline-flex items-center gap-1 text-[11px] font-bold text-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  Learn more
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
