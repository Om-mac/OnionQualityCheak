import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ArrowRight, AlertTriangle, CheckCircle2, Search, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { Badge, Spinner } from '../../components/ui';
import { PageTransition } from '../../components/motion';
import { FarmerSelector } from '../../components/FarmerSelector';

import { useInspection } from '../../context/InspectionContext';
import { WorkflowHeader } from '../../components/procurement/WorkflowHeader';

const CROPS = ['Onion', 'Potato', 'Tomato', 'Garlic', 'Chilli'];

export default function NewInspection() {
  const nav = useNavigate();
  const { createInspection, activeInspection } = useInspection();
  const [centers, setCenters] = useState<any[]>([]);
  const [fpos, setFpos] = useState<any[]>([]);
  const [form, setForm] = useState({
    farmerId: '', farmerDetails: null as any, fpoId: '', crop: 'Onion',
    variety: 'Nashik Red', quantityKg: 1000, procurementCenterId: '', centralLotId: '',
  });
  const [lookupLotId, setLookupLotId] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.getCenters().then(setCenters).catch(() => {});
    api.getFpos().then(setFpos).catch(() => {});
  }, []);

  const isValid = form.farmerId && form.crop && form.quantityKg > 0 && form.procurementCenterId;

  const handleLookup = async () => {
    if (!lookupLotId.trim()) return;
    setLookupLoading(true); setErr(''); setLookupResult(null);
    try {
      const r = await api.lookupLot(lookupLotId.trim());
      setLookupResult(r);
      if (r.lot) setForm(f => ({
        ...f, farmerId: r.lot.farmerId || '', fpoId: r.lot.fpoId || '',
        crop: r.lot.crop || 'Onion', variety: r.lot.variety || 'Nashik Red',
        quantityKg: r.lot.quantityKg || 1000, centralLotId: r.lot.lotNumber || lookupLotId.trim(),
      }));
    } catch (e: any) { setErr(e.message || 'Lot not found.'); }
    finally { setLookupLoading(false); }
  };

  const handleSubmit = async () => {
    if (!isValid) { setErr('Please complete all required fields.'); return; }
    setBusy(true); setErr('');
    try {
      const selectedCenter = centers.find(c => c.id === form.procurementCenterId);
      const selectedFpo = fpos.find(f => f.id === form.fpoId);
      const farmerName = form.farmerDetails?.fullName || form.farmerDetails?.name || 'Ramesh Patil';

      const rec = await createInspection({
        farmerId: form.farmerId,
        farmerName,
        fpoId: form.fpoId,
        fpoName: selectedFpo?.name || 'Nashik Farmers Producer Co.',
        procurementCenterId: form.procurementCenterId,
        centreId: form.procurementCenterId,
        centreName: selectedCenter?.name || 'Nashik Central Mandi',
        crop: form.crop,
        variety: form.variety,
        quantity: Number(form.quantityKg),
        unit: 'KG',
        lotId: form.centralLotId,
      });

      // Store current inspection ID for Fusion page
      localStorage.setItem('onionsure_current_inspection_id', rec.id);

      nav(`/quality/live-sensor?inspectionId=${rec.id}`);
    } catch (e: any) { setErr(e.message || 'Failed to create lot inspection'); }
    finally { setBusy(false); }
  };

  return (
    <PageTransition className="space-y-5">
      <WorkflowHeader />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest via-[#0e6b44] to-darkgreen p-6 text-white shadow-card"
      >
        <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><ClipboardList size={22} /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">Operations</p>
            <h1 className="text-2xl font-extrabold">New Inspection</h1>
            <p className="text-sm text-white/75">Register a lot and start a standardized quality assessment.</p>
          </div>
        </div>
      </motion.div>

      {err && (
        <div className="flex items-center gap-2 rounded-xl border border-reject/20 bg-reject/5 px-4 py-3 text-sm font-medium text-reject">
          <AlertTriangle size={16} /> {err}
        </div>
      )}

      {/* Main form card */}
      <div className="rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[rgba(20,20,25,0.06)]">
          <div>
            <h3 className="font-extrabold text-ink">Lot Identity</h3>
            <p className="text-xs text-muted mt-0.5">One physical lot = one Central Lot ID</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-3 py-1 text-xs font-bold text-forest">
            <Leaf size={11} /> Central Lot System
          </span>
        </div>

        {/* Lookup section */}
        <div className="mb-6 rounded-xl border border-forest/15 bg-mint/30 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-forest mb-2">Lookup existing lot</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text" placeholder="ON-2026-00421"
                className="input pl-9 font-mono uppercase bg-white"
                value={lookupLotId}
                onChange={(e) => setLookupLotId(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              />
            </div>
            <button className="btn-ghost" disabled={!lookupLotId || lookupLoading} onClick={handleLookup}>
              {lookupLoading ? <Spinner label="…" /> : 'Lookup'}
            </button>
          </div>
          {lookupResult && (
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-forest">
                <CheckCircle2 size={14} /> Found: {lookupResult.lot.lotNumber} · {lookupResult.lot.quantityKg}kg {lookupResult.lot.variety}
              </div>
              {lookupResult.resultVariationDetected && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-800">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Result variation across centers detected</p>
                    <p className="mt-0.5">{lookupResult.variationDetails}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Two-column form */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="label">Farmer *</label>
              <FarmerSelector
                value={form.farmerId}
                onChange={(id, farmer) => setForm(f => ({ ...f, farmerId: id, farmerDetails: farmer, fpoId: farmer.fpoId || '' }))}
                fpos={fpos}
              />
            </div>
            <div>
              <label className="label">FPO <span className="text-muted font-normal">(optional)</span></label>
              <select className="input" value={form.fpoId} onChange={(e) => setForm(f => ({ ...f, fpoId: e.target.value }))}>
                <option value="">None / Individual Farmer</option>
                {fpos.map((fpo) => <option key={fpo.id} value={fpo.id}>{fpo.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Crop *</label>
                <select className="input" value={form.crop} onChange={(e) => setForm(f => ({ ...f, crop: e.target.value }))}>
                  {CROPS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Variety</label>
                <input className="input" value={form.variety} onChange={(e) => setForm(f => ({ ...f, variety: e.target.value }))} placeholder="Nashik Red" />
              </div>
            </div>
            <div>
              <label className="label">Quantity (kg) *</label>
              <input type="number" min={1} className="input" value={form.quantityKg} onChange={(e) => setForm(f => ({ ...f, quantityKg: +e.target.value }))} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Procurement Center *</label>
              <select className="input" value={form.procurementCenterId} onChange={(e) => setForm(f => ({ ...f, procurementCenterId: e.target.value }))}>
                <option value="">Select center…</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.location}</option>)}
              </select>
            </div>
            {form.farmerDetails && (
              <div className="rounded-xl border border-forest/15 bg-mint/30 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-forest">Origin / Village</p>
                <p className="mt-1 font-semibold text-ink">{form.farmerDetails.village}</p>
              </div>
            )}
            {form.centralLotId && (
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Central Lot ID</p>
                <p className="mt-1 font-mono text-lg font-bold text-purple-900">{form.centralLotId}</p>
              </div>
            )}
            <div className="rounded-xl border border-[rgba(20,20,25,0.07)] bg-bg p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Inspection Date</p>
              <p className="mt-1 font-semibold text-ink">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-[rgba(20,20,25,0.06)] pt-5">
          <p className={`text-xs ${isValid ? 'text-forest font-semibold' : 'text-muted'}`}>
            {isValid ? '✓ Ready to start assessment' : 'Complete all required fields to continue'}
          </p>
          <button className="btn-primary" disabled={busy || !isValid} onClick={handleSubmit}>
            {busy ? <Spinner label="Creating lot…" /> : <><span>Save Lot & Continue</span><ArrowRight size={16} /></>}
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
