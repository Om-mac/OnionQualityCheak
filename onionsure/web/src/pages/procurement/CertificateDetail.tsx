/**
 * CertificateDetail.tsx — Dynamic Certificate Detail Page
 * Renders complete certificate from inspection data
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Share2, Printer, CheckCircle2, Award, QrCode, Calendar, User, MapPin, Package, Thermometer, Camera, Brain } from 'lucide-react';
import { Card } from '../../components/ui';
import { PageTransition } from '../../components/motion';
import { QRCodeSVG } from 'qrcode.react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface Certificate {
  certificateNumber: string;
  inspectionNumber: string;
  farmerName: string;
  farmerContact?: string;
  location: string;
  quantity: number;
  quantityUnit: string;
  grade: string;
  qualityScore: number;
  visualScore?: number;
  sensorScore?: number;
  riskLevel: string;
  healthyCount: number;
  damagedCount: number;
  rottenCount: number;
  sproutedCount: number;
  undersizedCount: number;
  totalDetections: number;
  gradeAPercentage: number;
  ursPercentage: number;
  rejectedPercentage: number;
  sensorData?: any;
  aiData?: any;
  certifiedBy: string;
  certificationDate: string;
  validUntil: string;
  qrData: string;
  status: string;
}

const GRADE_COLORS: Record<string, string> = {
  'GRADE_A': 'text-green-600 bg-green-50 border-green-300',
  'URS': 'text-amber-600 bg-amber-50 border-amber-300',
  'REJECTED': 'text-red-600 bg-red-50 border-red-300',
};

export default function CertificateDetail() {
  const { certificateNumber } = useParams<{ certificateNumber: string }>();
  const nav = useNavigate();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (certificateNumber) {
      loadCertificate();
    }
  }, [certificateNumber]);

  const loadCertificate = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/certificates/${certificateNumber}/verify`,
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      );
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
      setCertificate(data.certificate);
    } catch (err: any) {
      setError(err?.message || 'Failed to load certificate');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <PageTransition className="space-y-5">
        <Card className="p-8 text-center">
          <div className="text-muted">Loading certificate...</div>
        </Card>
      </PageTransition>
    );
  }

  if (error || !certificate) {
    return (
      <PageTransition className="space-y-5">
        <Card className="p-8 text-center">
          <h3 className="text-lg font-bold text-ink mb-2">Certificate Not Found</h3>
          <p className="text-sm text-muted mb-4">{error || 'The certificate could not be found.'}</p>
          <button onClick={() => nav('/quality/certificates')} className="btn-primary">
            Back to Certificates
          </button>
        </Card>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-5">
      {/* Header Actions */}
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-2xl font-extrabold text-ink">Quality Certificate</h2>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-ghost flex items-center gap-2">
            <Printer size={16} /> Print
          </button>
          <button onClick={() => nav('/quality/certificates')} className="btn-ghost">
            Back
          </button>
        </div>
      </div>

      {/* Certificate Card */}
      <div className="bg-white rounded-lg border-2 border-forest/20 shadow-lg p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pb-6 border-b-2 border-forest/10">
          <div className="text-sm font-bold text-forest uppercase tracking-wider mb-2">
            OnionSure Quality Platform
          </div>
          <h1 className="text-3xl font-extrabold text-ink mb-2">Quality Certificate</h1>
          <div className="font-mono text-lg font-bold text-forest">
            {certificate.certificateNumber}
          </div>
        </div>

        {/* Grade Badge */}
        <div className="flex justify-center mb-8">
          <div className={`px-8 py-4 rounded-2xl border-2 ${GRADE_COLORS[certificate.grade]}`}>
            <div className="flex items-center gap-3">
              <Award size={32} />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-1">Grade</div>
                <div className="text-2xl font-extrabold">{certificate.grade.replace(/_/g, ' ')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Score */}
        <div className="text-center mb-8">
          <div className="text-5xl font-extrabold text-forest mb-2">
            {certificate.qualityScore.toFixed(1)}
          </div>
          <div className="text-sm text-muted">Quality Score (out of 100)</div>
        </div>

        {/* Inspection Details Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <div className="text-xs text-muted mb-1">Inspection Number</div>
            <div className="font-mono font-semibold text-ink">{certificate.inspectionNumber}</div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Certification Date</div>
            <div className="font-semibold text-ink">
              {new Date(certificate.certificationDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Farmer</div>
            <div className="font-semibold text-ink">{certificate.farmerName}</div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Location</div>
            <div className="font-semibold text-ink">{certificate.location}</div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Quantity</div>
            <div className="font-semibold text-ink">
              {certificate.quantity} {certificate.quantityUnit}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Risk Level</div>
            <div className="font-semibold text-ink">{certificate.riskLevel}</div>
          </div>
        </div>

        {/* Quality Distribution */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-ink mb-3">Quality Distribution</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-xs text-green-600 font-semibold mb-1">Grade A</div>
              <div className="text-xl font-bold text-green-700">
                {certificate.gradeAPercentage.toFixed(1)}%
              </div>
              <div className="text-xs text-muted">{certificate.healthyCount} onions</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="text-xs text-amber-600 font-semibold mb-1">URS</div>
              <div className="text-xl font-bold text-amber-700">
                {certificate.ursPercentage.toFixed(1)}%
              </div>
              <div className="text-xs text-muted">
                {certificate.damagedCount + certificate.sproutedCount} onions
              </div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-xs text-red-600 font-semibold mb-1">Rejected</div>
              <div className="text-xl font-bold text-red-700">
                {certificate.rejectedPercentage.toFixed(1)}%
              </div>
              <div className="text-xs text-muted">
                {certificate.rottenCount + certificate.undersizedCount} onions
              </div>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-ink mb-3">Score Breakdown</h3>
          <div className="space-y-2">
            {certificate.visualScore !== undefined && (
              <div className="flex justify-between">
                <span className="text-sm text-muted">Visual Score</span>
                <span className="text-sm font-semibold text-ink">{certificate.visualScore.toFixed(1)}/100</span>
              </div>
            )}
            {certificate.sensorScore !== undefined && certificate.sensorScore !== null && (
              <div className="flex justify-between">
                <span className="text-sm text-muted">Sensor Score</span>
                <span className="text-sm font-semibold text-ink">{certificate.sensorScore.toFixed(1)}/100</span>
              </div>
            )}
          </div>
        </div>

        {/* Certification Footer */}
        <div className="pt-6 border-t-2 border-forest/10">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted mb-1">Certified By</div>
              <div className="font-semibold text-ink">{certificate.certifiedBy}</div>
              <div className="text-xs text-muted mt-2">Valid Until</div>
              <div className="text-sm font-semibold text-ink">
                {certificate.validUntil ? new Date(certificate.validUntil).toLocaleDateString() : '—'}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block rounded-lg bg-white p-1.5 border-2 border-gray-200">
                <QRCodeSVG
                  value={`${window.location.origin}/verify/${certificate.certificateNumber}`}
                  size={88}
                  bgColor="#ffffff"
                  fgColor="#0B5D3B"
                  level="M"
                />
              </div>
              <div className="text-xs text-muted mt-2">Scan to Verify</div>
              <a
                href={`/verify/${certificate.certificateNumber}`}
                className="text-[11px] font-semibold text-forest hover:underline"
              >
                Open verification page →
              </a>
            </div>
          </div>
        </div>

        {/* Verification Note */}
        <div className="mt-6 p-4 bg-forest/5 border border-forest/20 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-forest">
            <CheckCircle2 size={16} />
            <span className="font-semibold">
              This certificate is digitally verified and traceable
            </span>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
