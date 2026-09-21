import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Scale, QrCode, Award, CheckCircle2 } from 'lucide-react';

const BENEFITS = [
  {
    title: 'Verified quality',
    desc: 'Never accept sight-unseen shipments again. Every lot arrives with photographic defect proof and calibrated sizing percentages.',
    icon: ShieldCheck,
  },
  {
    title: 'Transparent grading',
    desc: 'Uniform computer vision benchmarks eliminate regional grading variance and subjective interpretation.',
    icon: Scale,
  },
  {
    title: 'Batch traceability',
    desc: 'Trace every single bag back to the harvesting farm, FPO collection hub, and historical cold chain temperatures.',
    icon: QrCode,
  },
  {
    title: 'Consistent standards',
    desc: 'Receive predictable produce specifications tailored directly to your export, retail, or food-processing requirements.',
    icon: Award,
  },
];

export default function ForBuyers() {
  return (
    <section className="bg-[#F5F1E8] py-24 sm:py-32 overflow-hidden border-t border-[#111614]/[0.08]" id="buyers">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B28A32]/30 bg-[#B28A32]/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#B28A32]">
            Wholesale & Retail Procurement
          </div>
          
          <h2 className="mt-4 text-[36px] sm:text-[48px] lg:text-[54px] font-extrabold leading-[1.08] tracking-tight text-[#111614]">
            Predictable procurement <br />
            <span className="text-[#B28A32]">without quality surprises.</span>
          </h2>

          <p className="mt-5 text-[16px] sm:text-[18px] leading-relaxed text-[#59615B]">
            Whether you are sourcing for modern retail supermarket chains, export containers, or bulk processing,
            OnionSure gives institutional buyers complete confidence in every metric.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                className="group relative flex flex-col justify-between rounded-2xl border border-[#111614]/[0.08] bg-white p-7 shadow-[0_4px_24px_rgba(20,24,22,0.04)] transition-all duration-300 hover:border-[#B28A32]/60 hover:shadow-[0_12px_32px_rgba(178,138,50,0.1)] hover:-translate-y-1"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div>
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#F5F1E8] text-[#B28A32] transition-colors duration-300 group-hover:bg-[#B28A32] group-hover:text-white">
                    <Icon size={20} />
                  </div>

                  <h3 className="mt-6 text-[19px] font-bold tracking-tight text-[#111614]">
                    {b.title}
                  </h3>

                  <p className="mt-3 text-[14px] leading-relaxed text-[#59615B]">
                    {b.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#111614]/[0.06] flex items-center gap-1.5 text-[12px] font-bold text-[#B28A32]">
                  <CheckCircle2 size={13} />
                  <span>Guaranteed Standard</span>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
