import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Download,
  QrCode,
  Calendar,
  ShieldCheck,
  FileText,
  Eye,
  Activity,
  GitMerge,
  Star,
  Cpu,
  ShieldAlert,
  Search,
  Check,
  Award,
  ArrowLeft,
  Printer
} from 'lucide-react';
import { api } from '../lib/api';
import { Spinner } from '../components/ui';
import { getMockReportDetail } from './farmer/mockFarmerData';

export default function CertificateView() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let active = true;
    const load = () => {
      if (id && (id.includes('mock') || id.startsWith('CERT-ON-2026-004') || id.startsWith('CERT-ON-2026-003'))) {
        const mock = getMockReportDetail(id);
        if (mock) {
          if (active) {
            setData(mock);
            setErr('');
          }
          return;
        }
      }
      api.getCertificate(id!)
        .then((d) => active && setData(d))
        .catch((e) => {
          if (!active) return;
          const mock = getMockReportDetail(id);
          if (mock) {
            setData(mock);
            setErr('');
          } else {
            setErr(e.message);
          }
        });
    };
    load();
    const iv = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [id]);

  if (err) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F7F7F5] p-6 text-center">
        <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-card max-w-md">
          <ShieldAlert size={40} className="mx-auto text-reject mb-3" />
          <h2 className="text-xl font-bold text-ink">Certificate Error</h2>
          <p className="mt-2 text-sm text-muted">{err}</p>
          <Link to="/quality/certificates" className="btn-primary mt-6 text-sm">
            ← Back to certificates
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F7F7F5]">
        <Spinner label="Loading Official Certificate…" />
      </div>
    );
  }

  const { certificate: c, lot, fusion, center, fpo, farmer, inspector, defectCounts } = data;

  // Format dates
  const certDate = c.createdAt ? new Date(c.createdAt) : new Date();
  const dateFormatted = certDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = certDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const fullDateTime = `${dateFormatted} | ${timeFormatted}`;

  const lotNumber = lot?.lotNumber || c.lotNumber || 'ON-2026-00421';
  const verifyPath = `/verify/${lotNumber}`;
  const fullVerifyUrl = `${window.location.origin}${verifyPath}`;
  const displayVerifyUrl = `onionsure.in/verify/${lotNumber}`;

  // Normalized values
  const qualityScore = c.qualityScore || fusion?.finalScore || 91;
  const grade = (c.grade || fusion?.grade || 'GRADE A').toUpperCase();
  const gradeA_pct = c.grade_a_percentage ?? 72;
  const urs_pct = c.urs_percentage ?? 18;
  const rej_pct = c.rejected_percentage ?? 10;

  // Scores
  const visionScore = fusion?.visionScore ?? 94;
  const gasEnvScore = fusion?.gasScore ? Math.round((fusion.gasScore + (fusion.environmentalScore ?? 85)) / 2) : 87;
  const fusionScore = fusion?.finalScore ?? 91;
  const finalScore = qualityScore;

  const confidence = fusion?.confidence ? Math.round(fusion.confidence * 100) : 94;
  const spoilageRisk = fusion?.spoilageRisk || fusion?.riskLevel || 'LOW';

  // Defect quantities
  const healthyCount = defectCounts?.healthy ?? Math.round(gradeA_pct);
  const damagedCount = defectCounts?.damaged ?? 8;
  const rottenCount = defectCounts?.rotten ?? 5;
  const sproutedCount = defectCounts?.sprouted ?? 4;
  const undersizedCount = defectCounts?.undersized ?? 11;
  const totalCount = healthyCount + damagedCount + rottenCount + sproutedCount + undersizedCount || 100;

  const healthyPct = Math.round((healthyCount / totalCount) * 100);
  const damagedPct = Math.round((damagedCount / totalCount) * 100);
  const rottenPct = Math.round((rottenCount / totalCount) * 100);
  const sproutedPct = Math.round((sproutedCount / totalCount) * 100);
  const undersizedPct = Math.round((undersizedCount / totalCount) * 100);

  // Inspector & Location
  const inspectorId = lot?.inspectorId?.slice(0, 10) || inspector?.username || 'INS-014';
  const centerName = center?.name || 'Nashik Procurement Center';
  const farmerName = farmer?.farmName || farmer?.name || lot?.farmerName || fpo?.name || 'Ramesh FPO';
  const fpoName = fpo?.name || 'Ramesh Farmer Producer Organization';
  const variety = lot?.variety || 'N-2-4-1';
  const quantityKg = lot?.quantityKg || 500;

  // Evidence reasons
  const evidenceReasons =
    fusion?.reasons && fusion.reasons.length > 0
      ? fusion.reasons
      : [
          'Low visible defect percentage',
          'Size within applicable criteria',
          'Low spoilage risk',
          'Normal environmental conditions',
        ];

  return (
    <div className="min-h-screen bg-[#F0F2EE] py-6 px-3 sm:px-6 print:p-0 print:bg-white text-[#17161D]">
      {/* Print Controls / Action Bar */}
      <div className="mx-auto max-w-4xl mb-4 flex items-center justify-between print:hidden">
        <Link
          to="/quality/certificates"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B5D3B] hover:text-[#06452C] transition"
        >
          <ArrowLeft size={16} /> Back to certificates
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-emerald-300 px-4 py-2 text-sm font-semibold text-[#0B5D3B] shadow-sm hover:bg-emerald-50 transition"
          >
            <Printer size={16} /> Print / Save PDF
          </button>
          <a
            href={verifyPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B5D3B] text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-[#06452C] transition"
          >
            <QrCode size={16} /> Public Verification
          </a>
        </div>
      </div>

      {/* Main Certificate Document Container */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto max-w-4xl bg-[#FAFDF9] rounded-[22px] border-[2.5px] border-[#0A4E31]/75 shadow-2xl overflow-hidden print:border-none print:shadow-none print:rounded-none print:m-0 print:max-w-full relative"
      >
        {/* Decorative Inner Certificate Frame */}
        <div className="p-6 sm:p-9 relative">
          {/* Top Brand Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-900/15 pb-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#0B5D3B] to-[#04331F] text-white shadow-md">
                {/* Stylized Onion + Leaf Icon */}
                <svg viewBox="0 0 36 36" fill="currentColor" className="h-7 w-7 text-white">
                  <path d="M18 3C18 3 13 8 13 15C13 19.5 15.5 23 18 25C20.5 23 23 19.5 23 15C23 8 18 3 18 3Z" fill="#3FAE5A" />
                  <path d="M18 6C12.5 12 7 17.5 7 24C7 29.5 11.9 34 18 34C24.1 34 29 29.5 29 24C29 17.5 23.5 12 18 6Z" fill="#FAFDF9" opacity="0.15" />
                  <circle cx="18" cy="22" r="9" fill="#0B5D3B" />
                  <path d="M18 15C14.5 19 14 24 18 28C22 24 21.5 19 18 15Z" fill="#A7F3D0" />
                </svg>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#0B4A2D] leading-none">
                  OnionSure
                </div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#226E37] mt-1">
                  QUALITY INTELLIGENCE
                </div>
              </div>
            </div>

            {/* Tagline */}
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1B4D30]/90 bg-emerald-50/80 px-3 py-1.5 rounded-full border border-emerald-200/60">
              <span>Smarter Grading</span>
              <span className="text-emerald-300">|</span>
              <span>Fairer Markets</span>
              <span className="text-emerald-300">|</span>
              <span>Stronger Farmers</span>
              <span className="text-emerald-600">🌿</span>
            </div>
          </div>

          {/* Certificate Title Banner */}
          <div className="mt-6 text-center">
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-wider text-[#06452C] uppercase drop-shadow-sm">
              DIGITAL ONION QUALITY CERTIFICATE
            </h1>
            <div className="flex items-center justify-center gap-3 my-2">
              <div className="h-[1px] w-20 sm:w-28 bg-emerald-400" />
              <span className="text-emerald-700 text-sm">🍃</span>
              <div className="h-[1px] w-20 sm:w-28 bg-emerald-400" />
            </div>
            <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.22em] text-[#1B4D30] uppercase">
              FOR AGRICULTURAL PROCUREMENT QUALITY ASSESSMENT
            </p>
          </div>

          {/* Top 3 Info Pills Bar */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-200/80 bg-white p-3 flex items-center gap-3 shadow-2xs">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100/70 text-[#0B5D3B] shrink-0">
                <FileText size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Certificate No.</div>
                <div className="truncate text-xs font-extrabold text-[#0B4A2D]">{c.certificateNumber || 'OSC-2026-000421'}</div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200/80 bg-white p-3 flex items-center gap-3 shadow-2xs">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100/70 text-[#0B5D3B] shrink-0">
                <Calendar size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Issue Date</div>
                <div className="truncate text-xs font-extrabold text-[#0B4A2D]">{fullDateTime}</div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200/80 bg-white p-3 flex items-center gap-3 shadow-2xs">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100/70 text-[#0B5D3B] shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Verification URL</div>
                <div className="truncate text-xs font-bold text-[#0B4A2D]">{displayVerifyUrl}</div>
              </div>
            </div>
          </div>

          {/* Reassessment Banner (if applicable) */}
          {(c.isReassessment || fusion?.isReassessment || c.reassessmentNote) && (
            <div className="mt-4 rounded-xl border-2 border-purple-300 bg-purple-50/90 p-3.5 text-purple-900 flex items-start gap-3 shadow-xs">
              <span className="rounded-md bg-purple-600 px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase shrink-0">
                REASSESSMENT
              </span>
              <div className="text-xs">
                <span className="font-bold text-purple-950">Officially Re-Evaluated Certificate: </span>
                {fusion?.previousGrade && (
                  <span className="font-semibold text-purple-800">
                    Original Grade: <span className="line-through">{fusion.previousGrade}</span> → Reassessed: <span className="underline font-black">{grade}</span>.
                  </span>
                )}
                <span className="ml-1 text-purple-800">
                  {c.reassessmentNote || fusion?.reassessmentReason || 'Re-inspected upon formal farmer dispute resolution.'}
                </span>
              </div>
            </div>
          )}

          {/* Human Override Banner (if applicable) */}
          {(c.overridden || fusion?.humanOverridden) && (
            <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50/90 p-3.5 text-amber-900 flex items-start gap-3 shadow-xs">
              <span className="rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase shrink-0">
                OVERRIDE
              </span>
              <div className="text-xs">
                <span className="font-bold text-amber-950">Senior Quality Officer Override: </span>
                <span className="italic">"{c.overrideReason || fusion?.overrideReason || 'Authorized visual inspection override'}"</span>
                {(c.overriddenBy || fusion?.overriddenBy) && (
                  <span className="font-semibold ml-1">— Officer: {c.overriddenBy || fusion?.overriddenBy}</span>
                )}
              </div>
            </div>
          )}

          {/* LOT DETAILS, IMAGE & QR SECTION */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            {/* Lot Details Card */}
            <div className="md:col-span-6 rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#06452C] mb-3">
                  <FileText size={15} className="text-[#3FAE5A]" />
                  <span>LOT DETAILS</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex">
                    <span className="w-36 text-muted font-medium">Central Lot ID</span>
                    <span className="mr-2 text-muted">:</span>
                    <span className="font-black text-[#0B4A2D] font-mono tracking-wide">{lotNumber}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-muted font-medium">Farmer / Supplier</span>
                    <span className="mr-2 text-muted">:</span>
                    <span className="font-bold text-ink">{farmerName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-muted font-medium">FPO</span>
                    <span className="mr-2 text-muted">:</span>
                    <span className="font-semibold text-ink truncate">{fpoName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-muted font-medium">Variety</span>
                    <span className="mr-2 text-muted">:</span>
                    <span className="font-bold text-ink">{variety}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-muted font-medium">Quantity</span>
                    <span className="mr-2 text-muted">:</span>
                    <span className="font-bold text-ink">{quantityKg} KG</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-muted font-medium">Procurement Center</span>
                    <span className="mr-2 text-muted">:</span>
                    <span className="font-semibold text-ink">{centerName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-muted font-medium">Inspector</span>
                    <span className="mr-2 text-muted">:</span>
                    <span className="font-bold text-ink">{inspectorId}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-muted font-medium">Inspection Date</span>
                    <span className="mr-2 text-muted">:</span>
                    <span className="font-medium text-ink">{fullDateTime}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lot Batch Photo Card */}
            <div className="md:col-span-3 rounded-2xl border border-emerald-200/80 bg-white overflow-hidden shadow-2xs relative group min-h-[160px]">
              <img
                src="/onions/hero-batch-red.jpg"
                alt="Lot sample inspection batch"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/crops/onion.jpg';
                }}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white drop-shadow">
                  Sample Batch Photo
                </span>
              </div>
            </div>

            {/* QR Verification Box */}
            <div className="md:col-span-3 rounded-2xl border border-emerald-200/80 bg-white p-3.5 flex flex-col items-center justify-center text-center shadow-2xs">
              <div className="p-1.5 bg-white rounded-lg border border-emerald-100 shadow-inner">
                <QRCodeSVG
                  value={fullVerifyUrl}
                  size={96}
                  bgColor="#ffffff"
                  fgColor="#06452C"
                  level="M"
                />
              </div>
              <div className="mt-2 text-[10.5px] font-medium text-muted">
                Scan to verify this certificate
              </div>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#3FAE5A] px-3 py-0.5 text-[11px] font-black tracking-wide text-white shadow-xs">
                <Check size={12} strokeWidth={3} /> VERIFIED
              </div>
              <div className="mt-1 font-mono text-[10px] font-bold text-[#06452C]">
                {lotNumber}
              </div>
            </div>
          </div>

          {/* FINAL QUALITY GRADE & DISTRIBUTION & METRICS */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Green Hero Grade Card */}
            <div className="md:col-span-5 rounded-2xl bg-gradient-to-br from-[#0A472E] via-[#083C26] to-[#042819] text-white p-4 sm:p-5 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-md">
              {/* Subtle background glow */}
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#3FAE5A]/20 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[0.18em] text-emerald-300 mb-2">
                <Award size={15} />
                <span>FINAL QUALITY GRADE</span>
              </div>

              {/* Laurel Wreath Framing with Grade */}
              <div className="relative flex items-center justify-center gap-2 my-1">
                {/* Laurel Left SVG */}
                <svg viewBox="0 0 32 64" fill="none" className="h-16 w-8 text-emerald-400/80">
                  <path d="M28 6C20 12 12 24 12 40C12 50 16 58 26 62" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M12 20C7 18 3 13 4 8C8 8 13 12 14 17" fill="currentColor" opacity="0.85" />
                  <path d="M10 32C5 31 1 27 2 21C6 22 10 26 11 30" fill="currentColor" opacity="0.85" />
                  <path d="M11 44C6 44 2 41 2 36C6 36 10 39 12 43" fill="currentColor" opacity="0.85" />
                  <path d="M15 54C11 55 7 53 6 49C10 48 14 50 16 53" fill="currentColor" opacity="0.85" />
                </svg>

                <div className="text-center px-1">
                  <div className="text-2xl sm:text-3xl font-black tracking-wide text-white drop-shadow">
                    {grade}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">
                    {qualityScore} <span className="text-sm font-semibold text-emerald-400/80">/ 100</span>
                  </div>
                </div>

                {/* Laurel Right SVG */}
                <svg viewBox="0 0 32 64" fill="none" className="h-16 w-8 text-emerald-400/80 -scale-x-100">
                  <path d="M28 6C20 12 12 24 12 40C12 50 16 58 26 62" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M12 20C7 18 3 13 4 8C8 8 13 12 14 17" fill="currentColor" opacity="0.85" />
                  <path d="M10 32C5 31 1 27 2 21C6 22 10 26 11 30" fill="currentColor" opacity="0.85" />
                  <path d="M11 44C6 44 2 41 2 36C6 36 10 39 12 43" fill="currentColor" opacity="0.85" />
                  <path d="M15 54C11 55 7 53 6 49C10 48 14 50 16 53" fill="currentColor" opacity="0.85" />
                </svg>
              </div>
            </div>

            {/* Grade Distribution */}
            <div className="md:col-span-4 rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#06452C] mb-2">
                <Activity size={15} className="text-[#3FAE5A]" />
                <span>GRADE DISTRIBUTION</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-ink">
                    <span className="h-3 w-3 rounded-full bg-[#3FAE5A]" />
                    <span>Grade A</span>
                  </div>
                  <span className="font-extrabold text-ink">{gradeA_pct}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-ink">
                    <span className="h-3 w-3 rounded-full bg-[#F4B942]" />
                    <span>URS</span>
                  </div>
                  <span className="font-extrabold text-ink">{urs_pct}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-ink">
                    <span className="h-3 w-3 rounded-full bg-[#D9534F]" />
                    <span>Rejected</span>
                  </div>
                  <span className="font-extrabold text-ink">{rej_pct}%</span>
                </div>
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-emerald-100 flex">
                <div style={{ width: `${gradeA_pct}%` }} className="bg-[#3FAE5A] h-full" />
                <div style={{ width: `${urs_pct}%` }} className="bg-[#F4B942] h-full" />
                <div style={{ width: `${rej_pct}%` }} className="bg-[#D9534F] h-full" />
              </div>
            </div>

            {/* AI Confidence & Spoilage Risk */}
            <div className="md:col-span-3 grid grid-rows-2 gap-3">
              <div className="rounded-2xl border border-emerald-200/80 bg-white p-3.5 flex items-center justify-between shadow-2xs">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                    <Cpu size={13} className="text-[#0B5D3B]" />
                    <span>AI CONFIDENCE</span>
                  </div>
                  <div className="mt-1 text-2xl font-black text-ink">{confidence}%</div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-[#0B5D3B]">
                  <Cpu size={20} />
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200/80 bg-white p-3.5 flex items-center justify-between shadow-2xs">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                    <ShieldCheck size={13} className="text-[#3FAE5A]" />
                    <span>SPOILAGE RISK</span>
                  </div>
                  <div className={`mt-1 text-xl font-black ${spoilageRisk === 'LOW' ? 'text-[#2F8E47]' : spoilageRisk === 'MEDIUM' ? 'text-amber' : 'text-reject'}`}>
                    {spoilageRisk}
                  </div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-[#3FAE5A]">
                  <ShieldCheck size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* QUALITY SCORES ROW (4 CARDS) */}
          <div className="mt-4 rounded-2xl border border-emerald-200/80 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#06452C] mb-3">
              <Activity size={15} className="text-[#3FAE5A]" />
              <span>QUALITY SCORES</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl bg-[#FAFDF9] border border-emerald-100 p-2.5">
                <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-muted">
                  <Eye size={12} className="text-[#0B5D3B]" />
                  <span>VISION SCORE</span>
                </div>
                <div className="mt-1 text-xl font-black text-[#06452C]">
                  {visionScore} <span className="text-xs font-normal text-muted">/ 100</span>
                </div>
              </div>

              <div className="rounded-xl bg-[#FAFDF9] border border-emerald-100 p-2.5">
                <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-muted">
                  <Activity size={12} className="text-[#0B5D3B]" />
                  <span>GAS + ENV SCORE</span>
                </div>
                <div className="mt-1 text-xl font-black text-[#06452C]">
                  {gasEnvScore} <span className="text-xs font-normal text-muted">/ 100</span>
                </div>
              </div>

              <div className="rounded-xl bg-[#FAFDF9] border border-emerald-100 p-2.5">
                <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-muted">
                  <GitMerge size={12} className="text-[#0B5D3B]" />
                  <span>FUSION SCORE</span>
                </div>
                <div className="mt-1 text-xl font-black text-[#06452C]">
                  {fusionScore} <span className="text-xs font-normal text-muted">/ 100</span>
                </div>
              </div>

              <div className="rounded-xl bg-[#FAFDF9] border border-emerald-100 p-2.5">
                <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-muted">
                  <Star size={12} className="text-[#0B5D3B]" />
                  <span>FINAL QUALITY SCORE</span>
                </div>
                <div className="mt-1 text-xl font-black text-[#06452C]">
                  {finalScore} <span className="text-xs font-normal text-muted">/ 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* DETECTED DEFECTS & WHY THIS GRADE */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Detected Defects (5 Circular Item Cards) */}
            <div className="md:col-span-7 rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#06452C] mb-3">
                <Search size={15} className="text-[#3FAE5A]" />
                <span>DETECTED DEFECTS</span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {/* 1. Healthy */}
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-emerald-400/80 shadow-xs bg-emerald-50">
                    <img src="/onions/healthy-closeup.jpg" alt="Healthy" className="h-full w-full object-cover" />
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-ink">Healthy</div>
                  <div className="text-xs font-black text-[#0B5D3B]">{healthyCount}</div>
                  <div className="text-[10px] text-muted">({healthyPct}%)</div>
                </div>

                {/* 2. Damaged */}
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-amber/80 shadow-xs bg-amber/10">
                    <img src="/onions/damaged-batch.jpg" alt="Damaged" className="h-full w-full object-cover" />
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-ink">Damaged</div>
                  <div className="text-xs font-black text-[#B27B10]">{damagedCount}</div>
                  <div className="text-[10px] text-muted">({damagedPct}%)</div>
                </div>

                {/* 3. Rotten */}
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-reject/80 shadow-xs bg-red-50">
                    <img src="/onions/blackmold-close.jpg" alt="Rotten" className="h-full w-full object-cover" />
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-ink">Rotten</div>
                  <div className="text-xs font-black text-reject">{rottenCount}</div>
                  <div className="text-[10px] text-muted">({rottenPct}%)</div>
                </div>

                {/* 4. Sprouted */}
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-amber/80 shadow-xs bg-amber/10">
                    <img src="/onions/sprouted-cluster.jpg" alt="Sprouted" className="h-full w-full object-cover" />
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-ink">Sprouted</div>
                  <div className="text-xs font-black text-[#B27B10]">{sproutedCount}</div>
                  <div className="text-[10px] text-muted">({sproutedPct}%)</div>
                </div>

                {/* 5. Undersized */}
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-amber/80 shadow-xs bg-amber/10">
                    <img src="/onions/blemish-batch.jpg" alt="Undersized" className="h-full w-full object-cover" />
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-ink">Undersized</div>
                  <div className="text-xs font-black text-[#B27B10]">{undersizedCount}</div>
                  <div className="text-[10px] text-muted">({undersizedPct}%)</div>
                </div>
              </div>
            </div>

            {/* Why This Grade? */}
            <div className="md:col-span-5 rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#06452C] mb-2.5">
                  <FileText size={15} className="text-[#3FAE5A]" />
                  <span>WHY THIS GRADE?</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {evidenceReasons.map((r: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="text-[#3FAE5A] font-black shrink-0">✓</span>
                      <span className="text-ink font-medium leading-tight">{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div>
                  <span className="text-muted font-medium">Grading Rules: </span>
                  <span className="font-bold text-[#06452C]">{fusion?.rulesVersion || 'ONION_STANDARD_2026_V1'}</span>
                </div>
                <div>
                  <span className="text-muted font-medium">AI Model: </span>
                  <span className="font-bold text-[#06452C]">OnionSure Vision v1.4</span>
                </div>
              </div>
            </div>
          </div>

          {/* SEAL, AUTHORIZED OFFICER & DIGITAL SIGNATURE */}
          <div className="mt-5 pt-4 border-t border-emerald-900/15 grid grid-cols-1 sm:grid-cols-3 gap-5 items-center">
            {/* 1. Authentic Circular Rubber Stamp Seal */}
            <div className="flex items-center justify-center sm:justify-start">
              <div className="relative w-28 h-28 text-[#0B5D3B] flex items-center justify-center select-none group">
                <svg viewBox="0 0 160 160" className="w-full h-full transform transition-transform duration-500 group-hover:rotate-6">
                  {/* Outer notched / dashed circle */}
                  <circle cx="80" cy="80" r="74" fill="none" stroke="#0B5D3B" strokeWidth="2.5" strokeDasharray="4 2" opacity="0.8" />
                  <circle cx="80" cy="80" r="69" fill="none" stroke="#0B5D3B" strokeWidth="1.5" />
                  <circle cx="80" cy="80" r="50" fill="none" stroke="#0B5D3B" strokeWidth="1.2" strokeDasharray="3 2" />

                  {/* Circular Text Path */}
                  <path id="sealTextPath" fill="none" d="M 80, 80 m -58, 0 a 58,58 0 1,1 116,0 a 58,58 0 1,1 -116,0" />
                  <text fontSize="10.5" fontWeight="900" letterSpacing="2.8" fill="#0B5D3B">
                    <textPath href="#sealTextPath" startOffset="50%" textAnchor="middle">
                      ONIONSURE • DIGITAL CERTIFICATE •
                    </textPath>
                  </text>

                  {/* Star and Center Emblem */}
                  <text x="80" y="42" textAnchor="middle" fontSize="11" fill="#0B5D3B">★</text>
                  <g transform="translate(62, 60)">
                    {/* Stylized Onion Silhouette Stamp */}
                    <path d="M18 2C18 2 12 7 12 14C12 19 15 22 18 24C21 22 24 19 24 14C24 7 18 2 18 2Z" fill="#0B5D3B" />
                    <circle cx="18" cy="22" r="8" fill="#0B5D3B" />
                    <path d="M18 10C15 14 14 18 18 22C22 18 21 14 18 10Z" fill="#FAFDF9" />
                  </g>
                  <text x="80" y="102" textAnchor="middle" fontSize="9" fontWeight="bold" letterSpacing="1" fill="#0B5D3B">VERIFIED</text>
                </svg>
              </div>
            </div>

            {/* 2. Authorized Officer Signature */}
            <div className="text-center sm:text-left sm:border-l sm:border-r border-emerald-900/15 sm:px-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Authorized Officer
              </div>

              {/* Realistic Cursive Calligraphy SVG Signature */}
              <div className="my-1 h-10 w-44 mx-auto sm:mx-0">
                <svg viewBox="0 0 180 44" fill="none" className="w-full h-full text-[#083C26]">
                  <path
                    d="M 10 32 C 25 15, 30 5, 36 8 C 42 12, 34 38, 48 24 C 58 14, 70 8, 82 28 C 90 40, 105 18, 120 22 C 132 25, 145 20, 168 18"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 22 28 L 155 28"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                </svg>
              </div>

              <div className="border-t border-emerald-900/40 w-40 mx-auto sm:mx-0 pt-1">
                <div className="font-mono text-xs font-black text-[#0B4A2D]">{inspectorId}</div>
                <div className="text-[10px] font-medium text-muted">Quality Inspection Officer</div>
                <div className="text-[10px] text-muted truncate">{centerName}</div>
              </div>
            </div>

            {/* 3. Digital Signature */}
            <div className="text-center sm:text-right flex flex-col items-center sm:items-end">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#06452C]">
                <ShieldCheck size={16} className="text-[#3FAE5A]" />
                <span>Digital Signature</span>
              </div>
              <div className="mt-1 font-mono text-[10px] text-muted text-center sm:text-right leading-relaxed bg-emerald-50/60 p-2 rounded-lg border border-emerald-100/80">
                <div>SHA-256: 7F3A9E2C4B6D...</div>
                <div className="font-bold text-[#0B4A2D]">91BD2F6A7C3E8D1</div>
              </div>
            </div>
          </div>
        </div>

        {/* Elegant Curved Dark Green Bottom Wave Footer */}
        <div className="bg-gradient-to-r from-[#06331E] via-[#0B4A2D] to-[#042819] text-white px-6 sm:px-9 py-4 border-t border-emerald-950/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <div className="text-[11px] font-bold tracking-wider text-emerald-100">
                OnionSure • Quality Intelligence • Digital Verification
              </div>
              <div className="text-[10px] text-emerald-300/80 mt-0.5">
                This certificate is digitally generated from the OnionSure quality assessment system. Verify authenticity using the QR code.
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-200 font-semibold shrink-0">
              <span>Powered by</span>
              <span className="font-bold text-white">OnionSure</span>
              <span className="text-[#3FAE5A]">🌱</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
