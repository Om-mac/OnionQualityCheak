import React from 'react';
import { motion } from 'framer-motion';
import { Quote, Star } from 'lucide-react';

const REVIEWS = [
  {
    quote: 'OnionSure gave our 300+ farmer members objective leverage. When we present the digital certificate at the Lasalgaon APMC, there is no arguing with the grade.',
    name: 'Ramesh Patil',
    role: 'Managing Director, Nashik Kisan FPO',
    location: 'Nashik, Maharashtra',
    stars: 5,
  },
  {
    quote: 'Before OnionSure, unseen internal rot in transit cost us over 12% in seasonal margins. The IoT gas monitoring alert alone saved three multi-ton containers this monsoon.',
    name: 'Anil Deshmukh',
    role: 'Procurement Head, Western Agri Logistics',
    location: 'Pune Regional Hub',
    stars: 5,
  },
  {
    quote: 'Instant smartphone scanning changed how we inspect at receiving. Truck turnaround time reduced from 4 hours to 20 minutes with zero manual dispute delays.',
    name: 'Pooja Kulkarni',
    role: 'Quality Assurance Director, AgroRetail India',
    location: 'Navi Mumbai',
    stars: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="bg-[#FDFBF7] py-24 sm:py-32 overflow-hidden border-t border-[#EAE5DC]" id="testimonials">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#B45309]">
            Field Testimonials
          </div>
          <h2 className="mt-4 text-[36px] sm:text-[48px] font-extrabold leading-[1.1] tracking-tight text-[#1C1917]">
            Trusted across Indian mandis, <br />
            <span className="text-[#D97706]">pack-houses & FPOs.</span>
          </h2>
          <p className="mt-4 text-[16px] text-[#57534E]">
            Real impact from agricultural leaders using OnionSure to eliminate disputes and unlock true harvest value.
          </p>
        </div>

        {/* 3 Testimonial Cards */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((r, i) => (
            <motion.div
              key={r.name}
              className="group relative flex flex-col justify-between rounded-3xl border border-[#EAE5DC] bg-white p-8 shadow-[0_4px_24px_rgba(180,160,130,0.06)] transition-all duration-300 hover:border-amber-400 hover:shadow-[0_12px_36px_rgba(217,119,6,0.1)] hover:-translate-y-1"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
            >
              <div>
                {/* Quote Icon & Stars */}
                <div className="flex items-center justify-between">
                  <div className="text-[#D97706]">
                    <Quote size={24} className="rotate-180 opacity-85" />
                  </div>
                  <div className="flex items-center gap-1 text-[#D97706]">
                    {Array.from({ length: r.stars }).map((_, idx) => (
                      <Star key={idx} size={14} fill="currentColor" />
                    ))}
                  </div>
                </div>

                <p className="mt-6 text-[15.5px] leading-relaxed text-[#1C1917] font-medium">
                  &ldquo;{r.quote}&rdquo;
                </p>
              </div>

              <div className="mt-8 pt-5 border-t border-[#EAE5DC]">
                <div className="text-[15px] font-bold text-[#1C1917] tracking-tight">
                  {r.name}
                </div>
                <div className="text-[12.5px] font-medium text-[#8C827A] mt-0.5">
                  {r.role} &bull; <span className="text-[#57534E]">{r.location}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
