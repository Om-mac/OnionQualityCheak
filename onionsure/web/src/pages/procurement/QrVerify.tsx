import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Search, ScanLine, CheckCircle2, AlertTriangle, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../lib/api';
import { Spinner, GradeBadge } from '../../components/ui';
import { PageHeader } from '../../components/PageHeader';

export default function QrVerify() {
  const nav = useNavigate();
  const [input, setInput]   = useState('');
  const [data, setData]     = useState<any>(null);
  const [err, setErr]       = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const run = async (id: string) => {
    if (!id.trim()) { setErr('Enter a certificate number.'); setData(null); return; }
    setErr(''); setLoading(true);
    try { setData(await api.verify(id.trim())); }
    catch (e: any) { setData(null); setErr(e.message || 'Certificate not found'); }
    finally { setLoading(false); }
  };

  const loadSample = async () => {
    try {
      const certs = await api.getCertificates();
      if (certs?.length) { setInput(certs[0].certificateNumber); setTouched(true); run(certs[0].certificateNumber); }
      else setErr('No certificates yet — run a New Inspection first.');
    } catch { setErr('Could not load sample.'); }
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={<QrCode size={22} />} eyebrow="Quality & Trust" title="QR Verification" subtitle="Confirm any certificate's authenticity by number or scanned QR token." />

      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        {/* Left */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-5 shadow-soft">
            <label className="label">Certificate Number / QR Token</label>
            <div className="flex gap-2 mt-1.5">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className={`input pl-9 ${touched && !input.trim() ? '!border-reject' : ''}`}
                  placeholder="CERT-ON-2026-xxxxxx"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setTouched(true); if (err) setErr(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && run(input)}
                />
              </div>
              <button className="btn-primary" onClick={() => run(input)} disabled={loading || !input.trim()}>
                {loading ? <Spinner label="…" /> : 'Verify'}
              </button>
            </div>
            <button className="btn-ghost mt-3 w-full justify-center text-sm" onClick={loadSample} disabled={loading}>
              <ScanLine size={15} /> Load latest certificate
            </button>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-mint/40 border border-forest/15 px-3 py-2.5 text-sm text-forest">
              <ScanLine size={15} className="mt-0.5 shrink-0" />
              <span>Certificates include a QR that links to <code className="rounded bg-white/80 px-1 text-xs">/verify/:id</code> for instant buyer verification.</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2 font-bold text-ink mb-3">
              <ShieldCheck size={17} className="text-forest" /> How verification works
            </div>
            <ol className="space-y-3 text-sm text-muted">
              {['Scan the QR code or paste the certificate number.', 'The backend checks it against the issued record.', 'A verified result shows the lot, grade, score and center.'].map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest text-[11px] font-bold text-white">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Right — result panel */}
        <div className="lg:sticky lg:top-5 lg:self-start">
          {loading ? (
            <div className="grid h-64 place-items-center rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white shadow-soft">
              <Spinner label="Verifying…" />
            </div>
          ) : err ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-2xl border border-reject/20 bg-white p-5 shadow-soft"
            >
              <div className="flex items-start gap-3 text-reject">
                <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Verification failed</p>
                  <p className="mt-1 text-sm text-muted">{err}</p>
                </div>
              </div>
            </motion.div>
          ) : data ? (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border-2 border-forest/25 bg-white shadow-soft overflow-hidden"
            >
              <div className="h-1 bg-forest w-full" />
              <div className="p-5">
                <div className="flex items-center gap-2 text-fresh mb-4">
                  <CheckCircle2 size={18} />
                  <span className="font-bold text-forest">VERIFIED CERTIFICATE</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { l: 'Lot Number', v: data.lotNumber },
                    { l: 'Grade', v: <GradeBadge grade={data.grade} /> },
                    { l: 'Quality Score', v: `${data.qualityScore}/100` },
                    { l: 'Inspection Date', v: new Date(data.inspectionDate).toLocaleDateString() },
                    { l: 'Procurement Center', v: data.procurementCenter },
                    { l: 'Status', v: <span className="font-bold text-forest">{data.status}</span> },
                  ].map(({ l, v }) => (
                    <div key={l}>
                      <p className="text-xs text-muted">{l}</p>
                      <div className="font-bold text-ink mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-mint/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">QR Code — scan to verify</p>
                  <div className="inline-block rounded-lg bg-white p-2 border border-forest/15">
                    <QRCodeSVG
                      value={`${window.location.origin}/verify/${data.certificateNumber}`}
                      size={112}
                      bgColor="#ffffff"
                      fgColor="#0B5D3B"
                      level="M"
                    />
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-muted break-all">
                    {`${window.location.origin}/verify/${data.certificateNumber}`}
                  </p>
                </div>
                <button className="btn-ghost mt-4 w-full justify-center text-sm" onClick={() => nav(`/verify/${data.certificateNumber}`)}>
                  Open public page <ArrowUpRight size={14} />
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="grid h-64 place-items-center rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white shadow-soft text-center">
              <div>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-mint text-forest"><QrCode size={26} /></div>
                <p className="mt-3 font-bold text-ink">Awaiting certificate</p>
                <p className="mt-1 max-w-[200px] mx-auto text-sm text-muted">Enter a number or load the latest certificate to verify here.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

