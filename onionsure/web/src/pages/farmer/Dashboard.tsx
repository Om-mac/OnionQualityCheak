import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tractor, Award, Leaf, ShieldAlert, PlusCircle, Package,
  CheckCircle2, ArrowRight, Star, BarChart2, FileText,
  Sprout, ChevronRight, MapPin, Eye, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { GradeBadge, ProgressBar, EmptyState } from '../../components/ui';
import { gradeLabel } from '../../lib/grades';
import { Donut } from '../../components/charts';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_CERTIFICATES } from '../../lib/events';
import { useAuth } from '../../lib/auth';

export default function FarmerDashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [showLotForm, setShowLotForm] = useState(false);
  const [lotForm, setLotForm] = useState({ crop: 'Onion', variety: 'Nashik Red', quantityKg: 1000, village: '', notes: '' });
  const [lotBusy, setLotBusy] = useState(false);
  const [lotErr, setLotErr] = useState('');
  const [createdLot, setCreatedLot] = useState<any>(null);

  const { data, loading } = useLiveData<any[]>(() => api.getCertificates(), { events: EV_CERTIFICATES, pollMs: 20000 });
  const { data: lotsData } = useLiveData<any[]>(() => api.getLots(), { events: EV_CERTIFICATES, pollMs: 20000 });

  const certs = data || [];
  const lots  = lotsData || [];
  const hasActiveLot = lots.length > 0;
  const hasCerts     = certs.length > 0;

  if (loading && !data) return (
    <PageTransition className="space-y-4">
      <div className="skeleton h-40 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0,1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      <div className="skeleton h-72 rounded-xl" />
    </PageTransition>
  );

  const gradeCounts = { 'GRADE A': 0, URS: 0, REJECTED: 0 };
  certs.forEach(c => { gradeCounts[c.grade as keyof typeof gradeCounts]++; });
  const avg = certs.length ? Math.round(certs.reduce((a, c) => a + c.qualityScore, 0) / certs.length) : 0;
  const gradeData = Object.entries(gradeCounts).map(([k, v]) => ({
    name: k, value: v,
    color: k === 'GRADE A' ? '#0B5D3B' : k === 'URS' ? '#F59E0B' : '#EF4444',
  }));

  const handleCreateLot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLotErr('');
    if (!lotForm.crop || !lotForm.quantityKg || lotForm.quantityKg <= 0) { setLotErr('Crop and quantity are required'); return; }
    setLotBusy(true);
    try {
      const centers = await api.getCenters();
      const lot = await api.createLot({ crop: lotForm.crop, variety: lotForm.variety || 'Nashik Red', quantityKg: lotForm.quantityKg, procurementCenterId: centers[0]?.id });
      setCreatedLot(lot);
      setShowLotForm(false);
      setLotForm({ crop: 'Onion', variety: 'Nashik Red', quantityKg: 1000, village: '', notes: '' });
    } catch (e: any) { setLotErr(e.message || 'Failed'); }
    finally { setLotBusy(false); }
  };

  return (
    <PageTransition className="space-y-4">

      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-xl text-white"
        style={{ minHeight: 165, boxShadow: '0 4px 20px rgba(11,67,42,0.25)' }}>
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/onions/healthy-deep.jpg')" }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(11,70,42,0.94) 0%, rgba(11,70,42,0.78) 50%, rgba(11,70,42,0.50) 100%)' }} />
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

        <div className="relative px-6 py-5">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-3">
            <span className="badge-green text-[10px]"><span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />Active Farmer</span>
            {user?.name && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/60">
                <MapPin size={10} /> Nashik, Maharashtra
              </span>
            )}
          </div>

          {/* Title */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[13px] text-white/65 font-medium mb-0.5">Good Morning, Farmer 🌱</p>
              <h1 className="text-[26px] sm:text-[30px] font-black tracking-tight leading-tight">
                {user?.name || 'My Farm Dashboard'}
              </h1>
              <p className="mt-1 text-[13px] text-white/65 font-medium">
                Your lot quality — transparent, fair &amp; digital.
              </p>
            </div>
            {/* Stats strip */}
            {certs.length > 0 && (
              <div className="flex items-center gap-5 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-5 py-3">
                {[
                  { label: 'Certificates', value: certs.length },
                  { label: 'Avg Score', value: `${avg}/100` },
                  { label: 'Grade A', value: gradeCounts['GRADE A'] },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-[18px] font-black text-white leading-none">{s.value}</p>
                    <p className="text-[10px] text-white/55 font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => nav('/farmer/inspection')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-white/20">
              <Leaf size={13} /> Pre-Check Onions
            </button>
            <button onClick={() => setShowLotForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-fresh/80 border border-fresh/50 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-fresh">
              <PlusCircle size={13} /> Submit New Lot
            </button>
            <button onClick={() => nav('/farmer/dispute')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-rose-500/70 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-rose-500">
              <ShieldAlert size={13} /> Raise Dispute
            </button>
          </div>
        </div>
      </div>

      {/* ── Lot registered success ── */}
      <AnimatePresence>
        {createdLot && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-green-600 text-white shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[11px] font-black text-green-800 uppercase tracking-wider">Lot Registered!</p>
              <p className="font-black text-gray-900 font-mono text-[15px] mt-0.5">{createdLot.lotNumber || createdLot.centralLotId}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Central Lot ID — present this at the procurement center.</p>
            </div>
            <button onClick={() => setCreatedLot(null)} className="ml-auto text-gray-400 hover:text-gray-600">
              <RefreshCw size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KPI TILES ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'My Certificates', value: certs.length,             icon: Award,      bg: 'bg-green-50',  ic: 'text-green-700',  sub: 'issued to date' },
          { label: 'Avg Quality',     value: avg,                       icon: BarChart2,   bg: 'bg-blue-50',   ic: 'text-blue-700',   sub: '/100 avg score', suffix: '/100' },
          { label: 'Grade A Lots',    value: gradeCounts['GRADE A'],    icon: Star,        bg: 'bg-amber-50',  ic: 'text-amber-700',  sub: 'premium lots' },
          { label: 'Rejected',        value: gradeCounts.REJECTED,      icon: ShieldAlert, bg: 'bg-red-50',    ic: 'text-red-700',    sub: 'raise if wrong' },
        ].map((k) => (
          <motion.div key={k.label} whileHover={{ y: -1 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-white rounded-xl border border-black/[0.07] p-4"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.03)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className={`grid h-9 w-9 place-items-center rounded-lg ${k.bg} ${k.ic}`}><k.icon size={16} /></div>
            </div>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-[28px] font-black text-gray-900 leading-none"><AnimatedNumber value={k.value} /></span>
              {k.suffix && <span className="text-[13px] text-gray-400 mb-0.5">{k.suffix}</span>}
            </div>
            <p className="text-[12px] font-semibold text-gray-500">{k.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Active lot / submit form ── */}
      {hasActiveLot && hasCerts ? (
        /* Latest result */
        <div className="bg-white rounded-xl border border-black/[0.07] p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-lg bg-[#1B4332] text-white px-3 py-0.5 text-[11px] font-bold font-mono">
                  {certs[0].lotNumber || lots[0]?.lotNumber || 'ON-2026-00421'}
                </span>
                <span className="badge-green text-[10px]"><CheckCircle2 size={10} /> Graded</span>
              </div>
              <p className="text-[12px] text-gray-500">Latest Grade</p>
              <div className="flex items-end gap-2 mt-0.5">
                <span className="text-[34px] font-black text-[#1B4332] leading-none">{gradeLabel(certs[0].grade)}</span>
                <span className="mb-1 text-[18px] font-black text-gray-900">{certs[0].qualityScore}<span className="text-[12px] text-gray-400">/100</span></span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono mt-1">{certs[0].certificateNumber}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => nav(`/farmer/report/${certs[0].id}`)} className="btn-primary text-[12px] py-2">
                <FileText size={13} /> Report
              </button>
              <button onClick={() => nav(`/certificate/${certs[0].id}`)} className="btn-ghost text-[12px] py-2">
                <Award size={13} /> Certificate
              </button>
              <button onClick={() => nav('/farmer/dispute')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700 hover:bg-red-100 transition">
                <ShieldAlert size={12} /> Dispute
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t border-gray-100">
            {[
              { label: 'Grade A', val: Number(certs[0].grade_a_percentage) || 0, color: 'bg-[#1B4332]', tc: 'text-[#1B4332]' },
              { label: 'URS', val: Number(certs[0].urs_percentage) || 0, color: 'bg-amber-500', tc: 'text-amber-600' },
              { label: 'Rejected', val: Number(certs[0].rejected_percentage) || 0, color: 'bg-red-500', tc: 'text-red-600' },
            ].map(b => (
              <div key={b.label}>
                <div className="flex justify-between text-[12px] mb-1.5">
                  <span className="text-gray-500">{b.label}</span>
                  <span className={`font-bold ${b.tc}`}>{b.val}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <motion.div className={`h-full rounded-full ${b.color}`}
                    initial={{ width: 0 }} animate={{ width: `${b.val}%` }}
                    transition={{ duration: 0.8 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : hasActiveLot && !hasCerts ? (
        /* Awaiting inspection */
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-600"><Package size={20} /></div>
              <div>
                <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">Awaiting Inspection</span>
                <p className="mt-1 font-bold text-gray-900">{lots[0]?.crop} · {lots[0]?.variety} · {lots[0]?.quantityKg} KG</p>
                <p className="text-[12px] text-gray-500">Lot <span className="font-mono font-semibold">{lots[0]?.lotNumber}</span></p>
              </div>
            </div>
            <button onClick={() => nav('/farmer/inspection')} className="btn-primary text-sm">
              <Leaf size={14} /> Pre-Check
            </button>
          </div>
        </div>
      ) : !showLotForm ? (
        /* No lot */
        <div className="rounded-xl border-2 border-dashed border-[#1B4332]/20 bg-green-50/40 py-12 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-green-100 text-[#1B4332]">
            <Sprout size={28} />
          </div>
          <p className="text-[15px] font-bold text-gray-900">No Lot Submitted Yet</p>
          <p className="mt-1.5 text-[13px] text-gray-500 max-w-xs mx-auto">Submit your onion lot to get a Central Lot ID and start grading.</p>
          <button onClick={() => setShowLotForm(true)} className="btn-primary mt-4 text-sm">
            <PlusCircle size={14} /> Submit My Lot
          </button>
        </div>
      ) : (
        /* Lot form */
        <div className="bg-white rounded-xl border border-black/[0.07] p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">Register New Lot</h3>
              <p className="text-[12px] text-gray-500 mt-0.5">Fill in your onion lot details</p>
            </div>
            <button onClick={() => setShowLotForm(false)} className="btn-ghost text-[12px] py-1.5 px-3">Cancel</button>
          </div>
          <form onSubmit={handleCreateLot} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Crop *</label><input className="input" value={lotForm.crop} onChange={e => setLotForm({ ...lotForm, crop: e.target.value })} /></div>
              <div><label className="label">Variety</label><input className="input" value={lotForm.variety} onChange={e => setLotForm({ ...lotForm, variety: e.target.value })} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Quantity (KG) *</label><input type="number" className="input" value={lotForm.quantityKg} onChange={e => setLotForm({ ...lotForm, quantityKg: Number(e.target.value) })} /></div>
              <div><label className="label">Village</label><input className="input" value={lotForm.village} onChange={e => setLotForm({ ...lotForm, village: e.target.value })} placeholder="Nashik" /></div>
            </div>
            {lotErr && <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-[13px] text-red-700">{lotErr}</p>}
            <button type="submit" disabled={lotBusy} className="btn-primary w-full py-2.5">
              {lotBusy ? 'Submitting…' : <><PlusCircle size={14} /> Submit Lot</>}
            </button>
          </form>
        </div>
      )}

      {/* ── Grade History + Certificates ── */}
      <Stagger className="grid gap-4 lg:grid-cols-3" gap={0.06}>
        <StaggerItem>
          <div className="bg-white rounded-xl border border-black/[0.07] p-5 h-full"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p className="text-[14px] font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart2 size={15} className="text-[#1B4332]" /> Grade History
            </p>
            <div className="flex items-center justify-center">
              {certs.length > 0
                ? <Donut data={gradeData} height={180} />
                : <div className="py-8 text-center"><p className="text-3xl">🧅</p><p className="text-[13px] text-gray-400 mt-2">No grades yet</p></div>
              }
            </div>
            {certs.length > 0 && (
              <div className="mt-3 space-y-2 pt-3 border-t border-gray-100">
                {gradeData.map(g => (
                  <div key={g.name} className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: g.color }} />
                      <span className="text-gray-500">{g.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{g.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </StaggerItem>

        <StaggerItem className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-black/[0.07] p-5 h-full"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
                <Award size={15} className="text-[#1B4332]" /> My Certificates
              </p>
              <button onClick={() => nav('/farmer/certificates')} className="text-[12px] font-semibold text-[#1B4332] hover:underline flex items-center gap-1">
                All <ChevronRight size={12} />
              </button>
            </div>
            {certs.length === 0
              ? <EmptyState title="No certificates yet" hint="Certificates appear after your lot is graded." icon={Award} />
              : (
                <div className="space-y-2">
                  {certs.slice(0, 5).map(c => (
                    <motion.div key={c.id} whileHover={{ x: 2 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 cursor-pointer hover:border-[#1B4332]/20 hover:bg-green-50/30 transition-all"
                      onClick={() => nav(`/certificate/${c.id}`)}>
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-green-100 text-[#1B4332] shrink-0"><Award size={14} /></div>
                        <div>
                          <p className="text-[12px] font-bold text-[#1B4332] font-mono">{c.certificateNumber}</p>
                          <p className="text-[11px] text-gray-400">{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <GradeBadge grade={c.grade} />
                        <span className="text-[15px] font-black text-gray-900">{c.qualityScore}<span className="text-[11px] text-gray-400">/100</span></span>
                        <ArrowRight size={13} className="text-gray-400" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            }
          </div>
        </StaggerItem>
      </Stagger>

      {/* ── Quick actions ── */}
      <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" gap={0.04}>
        {[
          { label: 'Pre-Check Onions', desc: 'Snap a photo before center', icon: Leaf,       path: '/farmer/inspection',   bg: 'bg-green-100', ic: 'text-[#1B4332]' },
          { label: 'My Lots',          desc: 'View all submitted lots',    icon: Package,     path: '/farmer/inspections',  bg: 'bg-blue-100',  ic: 'text-blue-700' },
          { label: 'Certificates',     desc: 'Download & share grades',    icon: Award,       path: '/farmer/certificates', bg: 'bg-amber-100', ic: 'text-amber-700' },
          { label: 'Raise Dispute',    desc: 'Challenge incorrect grade',  icon: ShieldAlert, path: '/farmer/dispute',      bg: 'bg-red-100',   ic: 'text-red-700' },
        ].map(a => (
          <StaggerItem key={a.label}>
            <motion.button whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={() => nav(a.path)}
              className="group w-full flex items-center gap-3 rounded-xl bg-white border border-black/[0.07] p-4 text-left hover:border-[#1B4332]/25 hover:shadow-soft transition-all"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${a.bg} ${a.ic}`}><a.icon size={18} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-gray-900">{a.label}</p>
                <p className="text-[11px] text-gray-500 truncate">{a.desc}</p>
              </div>
              <ChevronRight size={14} className="text-gray-400 group-hover:text-[#1B4332] transition-colors shrink-0" />
            </motion.button>
          </StaggerItem>
        ))}
      </Stagger>

    </PageTransition>
  );
}
