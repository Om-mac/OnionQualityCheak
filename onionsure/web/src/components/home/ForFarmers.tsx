import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { DollarSign, ShieldCheck, FileCheck, Zap, ArrowRight } from 'lucide-react';

const CARDS = [
  {
    title: 'Fair pricing',
    desc: 'Eliminate arbitrary price cuts at the mandi by presenting certified Grade A percentages backed by calibrated computer vision data.',
    icon: DollarSign,
  },
  {
    title: 'Transparent grading',
    desc: 'Understand exactly how your produce is evaluated, with visible defect bounding boxes and size classification metrics.',
    icon: ShieldCheck,
  },
  {
    title: 'Digital proof',
    desc: 'Carry permanent cryptographic proof of lot quality directly on your smartphone to negotiate confidently with multiple buyers.',
    icon: FileCheck,
  },
  {
    title: 'Faster inspection',
    desc: 'Complete full lot sampling in under 60 seconds, drastically reducing waiting lines and physical handling damage during unloading.',
    icon: Zap,
  },
];

export default function ForFarmers() {
  return (
    <section className="relative bg-[#FDFBF7] py-24 sm:py-32 overflow-hidden border-t border-[#EAE5DC]" id="farmers">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#B45309]">
            Built for Farmers
          </div>
          
          <h2 className="mt-4 text-[40px] sm:text-[54px] lg:text-[62px] font-extrabold leading-[1.04] tracking-tight text-[#1C1917]">
            Better grading. <br />
            <span className="text-[#D97706]">Better prices.</span> <br />
            Better decisions.
          </h2>

          <p className="mt-5 text-[16px] sm:text-[18px] leading-relaxed text-[#57534E]">
            OnionSure democratizes export-grade quality inspection for every farmer.
            Walk into any APMC marketplace or FPO collection center backed by unshakeable proof of your produce quality.
          </p>
        </div>

        {/* 4 Feature Cards */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.title}
                className="group relative flex flex-col justify-between rounded-2xl border border-[#EAE5DC] bg-white p-7 shadow-[0_4px_20px_rgba(180,160,130,0.06)] transition-all duration-300 hover:border-amber-400 hover:shadow-[0_12px_30px_rgba(217,119,6,0.1)] hover:-translate-y-1"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div>
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#FAF7F0] text-[#D97706] border border-[#EAE5DC] transition-colors group-hover:bg-[#FEF3C7] group-hover:border-amber-300">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-6 text-[19px] font-bold text-[#1C1917] transition-colors group-hover:text-[#D97706]">
                    {c.title}
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-[#57534E]">
                    {c.desc}
                  </p>
                </div>
                <div className="mt-6 h-px w-full bg-[#EAE5DC]" />
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 flex items-center justify-start">
          <Link
            to="/login"
            className="group inline-flex items-center gap-2 rounded-full bg-[#D97706] hover:bg-[#C26707] px-8 py-4 text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(217,119,6,0.25)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Your Inspection
            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

      </div>
    </section>
  );
}
