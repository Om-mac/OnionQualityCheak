import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useInspection } from '../../context/InspectionContext';
import { WorkflowHeader } from '../../components/procurement/WorkflowHeader';
import { PageHeader, StatGrid, StatTile } from '../../components/PageHeader';
import { Card, Badge, ProgressBar, Button } from '../../components/ui';
import { Award, CheckCircle2, AlertTriangle, FileCheck, ArrowRight, ShieldCheck, Sparkles, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FinalResult() {
  const { activeInspection, generateCertificate } = useInspection();
  const navigate = useNavigate();

  if (!activeInspection) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">No active inspection selected</h2>
        <p className="text-muted mt-2">Start a new inspection from the New Inspection page.</p>
        <button
          className="btn btn-primary mt-4"
          onClick={() => navigate('/quality/new-inspection')}
        >
          Start New Inspection
        </button>
      </div>
    );
  }

  const ai = activeInspection.aiAnalysis || {
    healthyCount: 12,
    damagedCount: 3,
    rottenCount: 2,
    sproutedCount: 1,
    undersizedCount: 2,
    totalDetected: 20,
    averageConfidence: 94,
  };

  const sensor = activeInspection.sensorData || {
    temperature: 27.4,
    humidity: 68.2,
    moisture: 86.5,
    ph: 6.2,
    co2: 450,
    ch4: 12,
    c2h4: 0.4,
    nh3: 2.1,
  };

  const fusion = activeInspection.fusionResult || {
    visualScore: 85,
    sensorScore: 88,
    aiConfidence: 94,
    finalQualityScore: activeInspection.qualityScore || 86,
    grade: activeInspection.finalGrade || 'GRADE A',
    riskLevel: 'LOW',
  };

  const handleGenerateCert = async () => {
    await generateCertificate();
    navigate(`/quality/certificates?inspectionId=${activeInspection.id}`);
  };

  return (
    <div className="space-y-6">
      <WorkflowHeader />

      <PageHeader
        icon={<Award size={24} />}
        eyebrow="Stage 06: Quality Assessment Result"
        title={`Final Assessment — ${fusion.grade}`}
        subtitle={`Central Inspection Record ${activeInspection.inspectionNumber || activeInspection.id}`}
        actions={
          <Button
            onClick={handleGenerateCert}
            className="btn btn-primary gap-2 bg-gradient-to-r from-emerald-500 to-fresh text-white font-bold px-6 py-3 shadow-lg"
          >
            <Award size={18} />
            Generate Quality Certificate
            <ArrowRight size={18} />
          </Button>
        }
      />

      {/* Main Score Banner */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 p-6 bg-gradient-to-br from-emerald-950 via-forest to-emerald-900 text-white relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase font-bold text-fresh tracking-widest">Calculated Quality Score</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-6xl font-black text-white">{fusion.finalQualityScore}</span>
                <span className="text-2xl text-emerald-200 font-semibold">/ 100</span>
              </div>
              <p className="mt-2 text-sm text-emerald-100 max-w-md">
                Combined visual AI defect detection, IoT gas/temperature sensors, and storage spoilage risk algorithms.
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs uppercase font-bold text-emerald-200 tracking-wider">Final Assigned Grade</div>
              <div className="mt-2 inline-block rounded-2xl bg-white px-6 py-3 text-3xl font-black text-forest shadow-xl">
                {fusion.grade}
              </div>
              <div className="mt-2 text-xs font-semibold text-fresh flex items-center justify-end gap-1">
                <ShieldCheck size={14} /> Spoilage Risk: {fusion.riskLevel}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between border-emerald-200">
          <div>
            <h3 className="text-sm font-extrabold text-ink uppercase tracking-wider mb-4">Inspection Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted font-medium">Farmer:</span>
                <span className="font-bold text-ink">{activeInspection.farmerName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted font-medium">Center:</span>
                <span className="font-bold text-ink">{activeInspection.centreName || activeInspection.centerName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted font-medium">Variety:</span>
                <span className="font-bold text-ink">{activeInspection.variety}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted font-medium">Quantity:</span>
                <span className="font-bold text-ink">{activeInspection.quantity} KG</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Breakdown Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* AI Detection Breakdown */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
              <Sparkles size={18} className="text-forest" />
              AI Visual Inspection Results
            </h3>
            <Badge tone="fresh">AI Confidence: {ai.averageConfidence}%</Badge>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="text-xl font-bold text-forest">{ai.healthyCount}</div>
              <div className="text-[11px] font-semibold text-emerald-800">Healthy</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
              <div className="text-xl font-bold text-amber-700">{ai.damagedCount}</div>
              <div className="text-[11px] font-semibold text-amber-800">Damaged</div>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
              <div className="text-xl font-bold text-rose-700">{ai.rottenCount}</div>
              <div className="text-[11px] font-semibold text-rose-800">Rotten</div>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
              <div className="text-xl font-bold text-purple-700">{ai.sproutedCount}</div>
              <div className="text-[11px] font-semibold text-purple-800">Sprouted</div>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="text-xl font-bold text-gray-700">{ai.undersizedCount}</div>
              <div className="text-[11px] font-semibold text-gray-800">Undersized</div>
            </div>
          </div>
        </Card>

        {/* Sensor Analysis Breakdown */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
              <Activity size={18} className="text-forest" />
              IoT Sensor Analysis
            </h3>
            <Badge tone="forest">Sensor Score: {fusion.sensorScore}/100</Badge>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border">
              <div className="text-muted">Temp</div>
              <div className="font-extrabold text-ink">{sensor.temperature} °C</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border">
              <div className="text-muted">Humidity</div>
              <div className="font-extrabold text-ink">{sensor.humidity} %</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border">
              <div className="text-muted">Moisture</div>
              <div className="font-extrabold text-ink">{sensor.moisture} %</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border">
              <div className="text-muted">CO2</div>
              <div className="font-extrabold text-ink">{sensor.co2} ppm</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quality Factors & Approval */}
      <Card className="p-6 bg-emerald-50/50 border border-emerald-100">
        <h3 className="text-sm font-extrabold text-ink uppercase tracking-wider mb-3">Quality Determination Reasons</h3>
        <div className="grid gap-2 sm:grid-cols-2 text-xs font-semibold text-emerald-950">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-forest" />
            High percentage of healthy onions ({Math.round(((ai.healthyCount || 12) / (ai.totalDetected || 20)) * 100)}%)
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-forest" />
            Low defect percentage ({Math.round((((ai.damagedCount || 3) + (ai.rottenCount || 2)) / (ai.totalDetected || 20)) * 100)}%)
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-forest" />
            Acceptable sensor readings & moisture levels
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-forest" />
            Low spoilage risk score ({fusion.riskLevel})
          </div>
        </div>
      </Card>
    </div>
  );
}
