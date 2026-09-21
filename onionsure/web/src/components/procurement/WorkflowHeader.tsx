import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useInspection } from '../../context/InspectionContext';
import { CheckCircle2, Circle, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

interface StepItem {
  id: string;
  num: string;
  label: string;
  path: string;
  requiredStatus: string;
}

const STEPS: StepItem[] = [
  { id: 'lot', num: '01', label: 'Lot Details', path: '/procurement/new', requiredStatus: 'CREATED' },
  { id: 'sensor', num: '02', label: 'Sensor', path: '/quality/live-sensor', requiredStatus: 'SENSOR_COMPLETED' },
  { id: 'ai', num: '03', label: 'AI Analysis', path: '/quality/ai-analysis', requiredStatus: 'AI_ANALYSIS_COMPLETED' },
  { id: 'fusion', num: '04', label: 'Fusion', path: '/quality/fusion', requiredStatus: 'FUSION_COMPLETED' },
  { id: 'cert', num: '05', label: 'Certificate', path: '/quality/certificates', requiredStatus: 'CERTIFICATE_GENERATED' },
];

export const WorkflowHeader: React.FC = () => {
  const { activeInspection } = useInspection();
  const navigate = useNavigate();
  const location = useLocation();

  if (!activeInspection) return null;

  const currentPath = location.pathname;

  const getStepStatus = (step: StepItem) => {
    const isCurrent = currentPath === step.path;
    const statusOrder: Record<string, number> = {
      DRAFT: 0,
      LOT_CREATED: 1,
      SENSOR_PENDING: 1,
      SENSOR_COMPLETED: 2,
      CAMERA_PENDING: 2,
      CAMERA_COMPLETED: 3,
      AI_ANALYSIS_PENDING: 3,
      AI_ANALYSIS_COMPLETED: 4,
      FUSION_PENDING: 4,
      FUSION_COMPLETED: 5,
      GRADE_ASSIGNED: 6,
      CERTIFICATE_GENERATED: 7,
      COMPLETED: 7,
    };

    const currentStatusLevel = statusOrder[activeInspection.status] || 1;
    const stepRequiredLevel = statusOrder[step.requiredStatus] || 1;

    const isCompleted = currentStatusLevel >= stepRequiredLevel;

    return { isCurrent, isCompleted };
  };

  return (
    <div className="mb-6 rounded-2xl border border-forest/15 bg-gradient-to-r from-emerald-950 via-forest to-emerald-900 p-4 text-white shadow-lg">
      {/* Header Info Line */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
            <span className="text-white/60">Inspection ID:</span>
            <span className="font-mono text-sm font-extrabold text-fresh">
              {activeInspection.inspectionNumber || activeInspection.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-white/60">Lot:</span>
            <span className="font-mono font-bold text-emerald-200">
              {activeInspection.lotNumber || activeInspection.lotId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-white/60">Farmer:</span>
            <span className="font-bold text-white">{activeInspection.farmerName}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-white/60">Variety:</span>
            <span className="font-medium text-emerald-200">{activeInspection.variety} ({activeInspection.quantity} KG)</span>
          </div>
        </div>

        {/* Workflow Status Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-fresh/20 px-3 py-1 text-xs font-bold text-fresh border border-fresh/30">
            <Clock size={13} className="animate-spin" />
            {activeInspection.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Progress Bar / Steps */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{STEPS.map((step) => {
          const { isCurrent, isCompleted } = getStepStatus(step);
          return (
            <button
              key={step.id}
              onClick={() => navigate(`${step.path}?inspectionId=${activeInspection.id}`)}
              className={clsx(
                'flex items-center gap-2 rounded-xl p-2 text-left transition-all',
                isCurrent
                  ? 'bg-white text-emerald-950 font-extrabold shadow-md scale-[1.02]'
                  : isCompleted
                  ? 'bg-white/10 text-emerald-100 hover:bg-white/15'
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
              )}
            >
              <div className="shrink-0">
                {isCompleted ? (
                  <CheckCircle2 size={16} className={isCurrent ? 'text-forest' : 'text-fresh'} />
                ) : isCurrent ? (
                  <Clock size={16} className="text-forest animate-pulse" />
                ) : (
                  <Circle size={16} className="text-white/30" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className={clsx('text-[10px] font-bold uppercase tracking-wider', isCurrent ? 'text-forest' : 'text-white/50')}>
                  {step.num}
                </div>
                <div className="truncate text-xs leading-tight font-medium">
                  {step.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
