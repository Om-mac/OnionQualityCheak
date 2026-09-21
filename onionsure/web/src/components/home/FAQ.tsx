import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { Reveal, SectionHeading } from './primitives';

const FAQ_ITEMS = [
  {
    q: 'How does OnionSure inspect onions?',
    a: 'OnionSure captures photos of onion lots via phone, tablet or center cameras. Our computer vision pipeline classifies each onion (healthy, damaged, rotten, sprouted, undersized) and combines that with optional IoT sensor data (temperature, humidity, ethylene, CO₂) into a single explainable grade.',
  },
  {
    q: 'How accurate is AI grading?',
    a: 'Our models are trained on a curated dataset of Indian onion varieties and benchmarked across multiple procurement centers. Accuracy varies by defect type and lighting — OnionSure always reports its own confidence and surfaces low-confidence lots for human review rather than guessing silently.',
  },
  {
    q: 'Can farmers use it directly?',
    a: 'Yes. Farmers can capture onion photos via the OnionSure mobile experience, get an instant grade + value range, and share a verifiable QR report with any buyer. No specialized hardware is required.',
  },
  {
    q: 'Can FPOs manage multiple lots?',
    a: 'Absolutely. The FPO command center lets cooperatives register hundreds of farmer lots, track grade distribution per season, compare procurement centers and export verifiable reports — all from a single dashboard.',
  },
  {
    q: 'Does OnionSure support IoT sensors?',
    a: 'Yes. OnionSure integrates with environmental and gas sensors (temperature, humidity, ethylene, CO₂) and raises automatic spoilage-risk warnings when storage conditions drift outside healthy bands.',
  },
  {
    q: 'Can buyers verify reports?',
    a: 'Every digital quality report carries a unique QR code and AI-signed hash. Buyers can scan it to confirm the lot ID, score, grade and inputs — making quality claims auditable end-to-end.',
  },
  {
    q: 'How is market value estimated?',
    a: 'Value ranges are computed from the AI quality grade combined with recent regional price benchmarks. Ranges — not point estimates — are returned so farmers and buyers can negotiate within a transparent band.',
  },
  {
    q: 'Can reports be exported?',
    a: 'Yes. Reports can be downloaded as branded PDFs and shared via QR or link. Verification hashes remain valid regardless of how the report is forwarded.',
  },
];

function Item({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-soft transition-all duration-300 hover:border-gold/25 hover:shadow-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-[14.5px] font-extrabold tracking-tight text-cream">
          {q}
        </span>
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors duration-300 ${
            open ? 'bg-gold text-ink' : 'bg-white/[0.06] text-gold ring-1 ring-gold/25'
          }`}
        >
          {open ? <Minus size={13} strokeWidth={2.6} /> : <Plus size={13} strokeWidth={2.6} />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={reduce ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 1 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="border-t border-white/10 px-5 pb-5 pt-3 text-[13.5px] leading-relaxed text-cream-muted">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section
      className="relative overflow-hidden bg-ink py-20 sm:py-24 lg:py-28"
      id="faq"
    >
      <div className="relative mx-auto max-w-[1080px] px-5 sm:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Frequently asked"
            align="center"
            title="Everything you might want to ask."
            sub="A quick reference for farmers, FPOs, buyers and partners evaluating OnionSure."
          />
        </Reveal>

        <div className="mt-12 space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <Reveal key={item.q} delay={0.05 + i * 0.04}>
              <Item
                q={item.q}
                a={item.a}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
