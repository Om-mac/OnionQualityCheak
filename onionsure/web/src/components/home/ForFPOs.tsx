import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Users, BarChart3, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { CountUp } from './primitives';

const FPO_STATS = [
  { label: 'Active Batches', value: 48, icon: Layers },
  { label: 'Registered Farmers', value: 340, icon: Users },
  { label: 'Grade A Realization', value: 86.4, suffix: '%', icon: BarChart3 },
  { label: 'Verified Reports', value: 1240, icon: FileSpreadsheet },
];

const RECENT_INSPECTIONS = [
  { id: 'ON-2025-0824-001', farmer: 'Ramesh Patil', lotSize: '4.2 MT', grade: 'Grade A', score: 91, status: 'Export Certified' },
  { id: 'ON-2025-0824-002', farmer: 'Suresh Kulkarni', lotSize: '2.8 MT', grade: 'Grade A', score: 88, status: 'Ready for Mandi' },
  { id: 'ON-2025-0824-003', farmer: 'Mahesh Deshmukh', lotSize: '5.5 MT', grade: 'Grade A', score: 94, status: 'Export Certified' },
  { id: 'ON-2025-0824-004', farmer: 'Vikas Joshi', lotSize: '3.1 MT', grade: 'Grade B', score: 79, status: 'Domestic Processing' },
];

export default function ForFPOs() {
  return (
    <section className="bg-[#FAF7F0] py-24 sm:py-32 overflow-hidden border-t border-[#EAE5DC]" id="fpos">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 grid gap-12 lg:grid-cols-[1fr_1.15fr] items-center">
        
        {/* Left Copy */}
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#B45309]">
            Cooperative Enterprise
          </div>
          
          <h2 className="mt-4 text-[36px] sm:text-[48px] lg:text-[54px] font-extrabold leading-[1.08] tracking-tight text-[#1C1917]">
            A centralized command center <br />
            <span className="text-[#D97706]">for your entire FPO network.</span>
          </h2>

          <p className="mt-5 text-[16px] sm:text-[18px] leading-relaxed text-[#57534E]">
            Manage hundreds of farmer member submissions, track regional grade distribution,
            and aggregate bulk institutional lots with real-time auditability.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {FPO_STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl border border-[#EAE5DC] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-[#D97706]">
                    <Icon size={18} />
                    <span className="text-[10px] uppercase font-bold text-[#8C827A]">METRIC</span>
                  </div>
                  <div className="mt-2 font-mono text-[24px] font-extrabold text-[#1C1917]">
                    <CountUp value={s.value} decimals={s.suffix ? 1 : 0} duration={1400} />
                    {s.suffix}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[#57534E]">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Dashboard Mockup Visualization */}
        <div className="rounded-3xl border border-[#EAE5DC] bg-white p-5 sm:p-7 shadow-[0_16px_40px_rgba(180,160,130,0.08)]">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#EAE5DC]">
            <div>
              <div className="text-[14px] font-bold text-[#1C1917] tracking-tight">Kisan Samriddhi FPO &bull; Batch Manager</div>
              <div className="text-[11.5px] text-[#8C827A]">Live Nashik Collection Cluster</div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11.5px] font-bold text-[#92400E]">
              <TrendingUp size={13} />
              Season Peak Realization
            </span>
          </div>

          {/* Table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-[#EAE5DC] text-[10px] uppercase tracking-wider text-[#8C827A]">
                  <th className="pb-3 font-bold">Lot ID</th>
                  <th className="pb-3 font-bold">Farmer</th>
                  <th className="pb-3 font-bold">Volume</th>
                  <th className="pb-3 font-bold">Grade</th>
                  <th className="pb-3 font-bold text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE5DC]">
                {RECENT_INSPECTIONS.map((row) => (
                  <tr key={row.id} className="group transition-colors hover:bg-[#FAF8F5]">
                    <td className="py-3.5 font-mono text-[12px] text-[#57534E]">{row.id}</td>
                    <td className="py-3.5 font-semibold text-[#1C1917]">{row.farmer}</td>
                    <td className="py-3.5 text-[#57534E]">{row.lotSize}</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                        row.score >= 90
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {row.grade}
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-mono font-bold text-[#1C1917]">{row.score}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Aggregate Summary */}
          <div className="mt-5 pt-4 border-t border-[#EAE5DC] flex items-center justify-between text-[12px] text-[#57534E]">
            <span>Showing 4 of 48 active seasonal lots</span>
            <span className="text-[#D97706] font-bold cursor-pointer hover:underline">Download Comprehensive CSV &rarr;</span>
          </div>

        </div>

      </div>
    </section>
  );
}
