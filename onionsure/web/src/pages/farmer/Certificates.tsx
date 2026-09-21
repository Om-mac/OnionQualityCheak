import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, QrCode, FileDown, ShieldCheck, TrendingUp, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { GradeBadge, ProgressBar } from '../../components/ui';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { MOCK_FARMER_CERTIFICATES } from './mockFarmerData';

export default function FarmerCertificates() {
  const nav = useNavigate();
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);

  useEffect(() => {
    api.getCertificates()
      .then((data) => {
        if (data && data.length > 0) {
          setCerts(data);
          setIsUsingMock(false);
        } else {
          setCerts(MOCK_FARMER_CERTIFICATES);
          setIsUsingMock(true);
        }
      })
      .catch(() => {
        setCerts(MOCK_FARMER_CERTIFICATES);
        setIsUsingMock(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageTransition className="space-y-5">
        <div className="h-32 animate-pulse rounded-2xl bg-mint/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0,1,2,3,4,5].map((i) => <div key={i} className="h-52 animate-pulse rounded-2xl bg-mint/60" />)}</div>
      </PageTransition>
    );
  }

  const avg = certs.length ? Math.round(certs.reduce((a, c) => a + (Number(c.qualityScore) || 0), 0) / certs.length) : 0;
  const gradeA = certs.filter((c) => c.grade === 'GRADE A').length;

  return (
    <PageTransition className="space-y-5">
      {/* Header banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest via-[#0e6b44] to-darkgreen p-6 text-white shadow-card"
      >
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-16 bottom-0 h-28 w-28 rounded-full bg-fresh/10 pointer-events-none" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><Award size={18} /></div>
              <span className="text-sm font-bold text-emerald-200 uppercase tracking-wider">My Farm</span>
            </div>
            <h1 className="text-2xl font-extrabold">My Quality Certificates</h1>
            <p className="mt-1 text-sm text-emerald-100/80">
              {certs.length > 0
                ? `${certs.length} digital certificate${certs.length > 1 ? 's' : ''} — scan QR to verify anytime.`
                : 'Certificates will appear here after your lot is inspected and graded.'}
            </p>
          </div>
          {isUsingMock && (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-3.5 py-1 text-xs font-semibold text-emerald-100">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Sample Demo Data Active
            </span>
          )}
        </div>
      </motion.div>

      {certs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-14 text-center">
          <Award size={40} className="mx-auto text-emerald-300 mb-3" />
          <p className="text-base font-bold text-emerald-800">No certificates yet</p>
          <p className="text-sm text-muted mt-1">Certificates are generated automatically once your lot passes quality inspection.</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <Stagger className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Certificates', value: certs.length, sub: 'issued to date', icon: Award, color: 'from-forest to-[#0e6b44]', light: 'bg-forest/10 text-forest' },
              { label: 'Avg Quality', value: avg, sub: 'out of 100', icon: TrendingUp, color: 'from-sb-500 to-sb-700', light: 'bg-sb-100 text-sb-700', suffix: '/100' },
              { label: 'Grade A Certs', value: gradeA, sub: 'premium quality', icon: ShieldCheck, color: 'from-amber-400 to-amber-600', light: 'bg-amber-50 text-amber-600' },
            ].map((s) => (
              <StaggerItem key={s.label}>
                <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-soft">
                  <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br opacity-10 ${s.color}`} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">{s.label}</span>
                    <span className={`rounded-xl p-2 ${s.light}`}><s.icon size={16} /></span>
                  </div>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-3xl font-extrabold text-ink"><AnimatedNumber value={s.value} /></span>
                    {(s as any).suffix && <span className="mb-0.5 text-base text-muted">{(s as any).suffix}</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted">{s.sub}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          {/* Certificate cards */}
          <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" gap={0.05}>
            {certs.map((c) => (
              <StaggerItem key={c.id} className="h-full">
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-soft hover:shadow-card transition-shadow"
                >
                  {/* Grade stripe at top */}
                  <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${c.grade === 'GRADE A' ? 'bg-forest' : c.grade === 'URS' ? 'bg-amber' : 'bg-reject'}`} />

                  <div className="flex items-center justify-between pt-2">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-forest/10 text-forest">
                      <ShieldCheck size={22} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {c.isReassessment && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">Reassessed</span>
                      )}
                      <GradeBadge grade={c.grade} />
                    </div>
                  </div>

                  <div className="mt-4 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Certificate</p>
                    <p className="font-bold text-forest font-mono text-sm mt-0.5 truncate">{c.certificateNumber}</p>
                    {c.lotNumber && (
                      <p className="text-xs font-semibold text-ink mt-0.5">Lot: <span className="font-mono">{c.lotNumber}</span></p>
                    )}
                    <p className="text-xs text-muted mt-1">{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>

                  {/* Score display */}
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-muted">Quality Score</p>
                      <p className="text-4xl font-extrabold text-ink leading-none">
                        {c.qualityScore}
                        <span className="text-base text-muted">/100</span>
                      </p>
                    </div>
                    <div className="text-right text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="h-2 w-2 rounded-full bg-forest" />
                        <span className="text-muted">Grade A</span>
                        <span className="font-bold text-ink">{c.grade_a_percentage ?? '—'}%</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="h-2 w-2 rounded-full bg-amber" />
                        <span className="text-muted">URS</span>
                        <span className="font-bold text-ink">{c.urs_percentage ?? '—'}%</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="h-2 w-2 rounded-full bg-reject" />
                        <span className="text-muted">Rejected</span>
                        <span className="font-bold text-ink">{c.rejected_percentage ?? '—'}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Grade bar */}
                  <div className="mt-3 flex h-2 overflow-hidden rounded-full">
                    <div className="bg-forest" style={{ width: `${c.grade_a_percentage || 0}%` }} />
                    <div className="bg-amber" style={{ width: `${c.urs_percentage || 0}%` }} />
                    <div className="bg-reject" style={{ width: `${c.rejected_percentage || 0}%` }} />
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-2 pt-3 border-t border-border">
                    <button
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-forest px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-darkgreen"
                      onClick={() => nav(`/certificate/${c.id}`)}
                    >
                      <QrCode size={14} /> View & Verify
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold text-forest transition hover:bg-mint/40"
                      onClick={() => nav(`/certificate/${c.id}`)}
                    >
                      <FileDown size={14} /> PDF
                    </button>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        </>
      )}
    </PageTransition>
  );
}
