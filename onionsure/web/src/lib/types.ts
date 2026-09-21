export type Role = 'procurement_officer' | 'fpo' | 'farmer' | 'buyer' | 'admin';

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
  email?: string;
  centerId?: string | null;
  fpoId?: string | null;
  farmerId?: string | null;
  buyerId?: string | null;
}

export interface Center {
  id: string;
  name: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}

export interface Fpo {
  id: string;
  name: string;
  centerId?: string;
  registeredFarmers?: number;
}

export interface Farmer {
  id: string;
  name: string;
  fpoId?: string;
  location?: string;
  qualityGradeA?: number;
  totalLots?: number;
}

export interface Lot {
  id: string;
  lotNumber: string;
  centralLotId?: string;
  farmerId?: string;
  fpoId?: string;
  crop?: string;
  variety?: string;
  quantityKg?: number;
  procurementCenterId?: string;
  inspectorId?: string;
  status?: string;
  currentGrade?: string;
  currentScore?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface VisionResult {
  mode: string;
  total: number;
  counts: Record<string, number>;
  percentages: Record<string, number>;
  visionScore: number;
  confidence: number;
  detections: Detection[];
}

export interface Detection {
  id: string;
  class: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  size: number;
}

export interface GasResult {
  mode: string;
  stage: 'LOW' | 'MEDIUM' | 'HIGH';
  gasScore: number;
  confidence: number;
  flags?: Record<string, boolean>;
  parameters?: Record<string, SensorParameter>;
  readings: { 
    ethane?: number; 
    methane?: number; 
    temperature: number; 
    humidity: number;
    co2?: number;
    ch4?: number;
    c2h4?: number;
    nh3?: number;
    moisture?: number;
    ph?: number;
  };
}

export interface EnvResult {
  environmentScore: number;
  confidence: number;
  temperature: number;
  humidity: number;
}

export interface SensorParameter {
  value: number;
  unit: string;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface SensorReading {
  id?: string;
  inspectionId?: string;
  temperature: number;
  humidity: number;
  co2?: number;
  ch4?: number;
  c2h4?: number;
  nh3?: number;
  moisture?: number;
  ph?: number;
  ethane?: number;
  methane?: number;
  timestamp?: string;
}

export interface OverrideLog {
  id: string;
  inspectionId: string;
  lotId?: string;
  centralLotId?: string;
  originalResult: string;
  newResult: string;
  reason: string;
  officerId: string;
  officerName?: string;
  centerId?: string;
  timestamp: string;
}

export interface DisputeTimeline {
  status: 'submitted' | 'under_review' | 'reinspection' | 'resolved';
  label: string;
  timestamp: string;
  note?: string;
}

export interface Dispute {
  id: string;
  disputeNumber: string;
  lotId: string;
  centralLotId: string;
  inspectionId?: string;
  certificateNumber?: string;
  grade: string;
  qualityScore?: number;
  farmerId?: string;
  reason: string;
  description?: string;
  status: 'submitted' | 'under_review' | 'reinspection' | 'resolved';
  timeline: DisputeTimeline[];
  createdAt: string;
  updatedAt: string;
}

export interface RuleTraceItem {
  id: string;
  title: string;
  standard: string;
  actual: string;
  passed: boolean;
  status: 'PASSED' | 'WARNING' | 'FAILED' | 'URS_QUALIFIED';
  impact: string;
}

export interface CalculationTrace {
  formula: string;
  effectiveVisionWeightPct: number;
  effectiveSensorWeightPct: number;
  baseVisionWeightPct: number;
  baseSensorWeightPct: number;
  numerator: number;
  denominator: number;
  dynamicFallbackApplied: boolean;
  fallbackMode: string;
  fallbackReason: string;
}

export interface FarmerExplanation {
  summary: string;
  bulbQuality: string;
  internalFreshness: string;
  fairPriceImpact: string;
  storageAdvice: string;
}

export interface SensorValidationResult {
  status: 'VALID' | 'DEGRADED' | 'INVALID';
  valid: boolean;
  message: string;
  channelChecks?: Record<string, { val?: number; min?: number; max?: number; valid: boolean; note?: string }>;
}

export interface FusionResult {
  visionScore: number;
  gasScore: number;
  environmentalScore: number;
  sensorScore?: number;
  visionConfidence: number;
  gasConfidence?: number;
  environmentalConfidence?: number;
  sensorConfidence?: number;
  finalScore: number;
  qualityScore?: number;
  confidence: number;
  grade: 'GRADE A' | 'URS' | 'REJECTED' | string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  spoilageRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
  earlySpoilageAlert: boolean;
  reasons?: string[];
  rulesVersion?: string;
  rulesTrace?: RuleTraceItem[];
  explanation: string;
  officerExplanation?: string;
  farmerExplanation?: FarmerExplanation;
  calculationTrace?: CalculationTrace;
  sensorValidation?: SensorValidationResult;
  weights?: Record<string, number>;
  gradeAPercentage?: number;
  ursPercentage?: number;
  rejectedPercentage?: number;
  totalDefectsPercentage?: number;
  defectBreakdown?: Record<string, number>;
  isPreliminary?: boolean;
  humanOverridden?: boolean;
  originalGrade?: string;
  overrideReason?: string;
  overriddenBy?: string;
  persistedAt?: string;
  persistedBy?: string;
  persistedByName?: string;
}

export type InspectionSession = any;

export interface FusionContextResponse {
  centralLotId: string;
  inspectionNumber: string;
  inspectionId: string;
  lot: Lot;
  session: InspectionSession;
  sensor: SensorReading;
  gas: GasResult;
  environment: EnvResult;
  vision: {
    mode: string;
    total: number;
    counts: Record<string, number>;
    percentages: Record<string, number>;
    visionScore: number;
    confidence: number;
    bulbAvgMm?: number;
    modelVersion?: string;
  };
  storedFusion?: FusionResult | null;
  overrides?: OverrideLog[];
  rulesVersion: string;
  aiModel: string;
  timestamp: string;
}

export interface GradingResult {
  grade: string;
  qualityScore: number;
  visionScore: number;
  gasScore: number;
  environmentalScore: number;
  fusionScore: number;
  confidence: number;
  spoilageRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
  rulesVersion: string;
  isPreliminary?: boolean;
  defectBreakdown: Record<string, number>;
  gradeAPercentage: number;
  ursPercentage: number;
  rejectedPercentage: number;
  evaluatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  inspectionId?: string;
  lotId?: string;
  lotNumber?: string;
  actorId: string;
  actorRole: Role;
  centerId?: string;
  timestamp: string;
  details: string;
}

export interface LotLookupResult {
  lot: Lot;
  inspections: Array<{
    id: string;
    centerId: string;
    centerName: string;
    status: string;
    grade: string;
    qualityScore: number | null;
    date: string;
  }>;
  resultVariationDetected: boolean;
  variationDetails?: string | null;
  crossCenterSummary: {
    totalInspections: number;
    uniqueCenters: number;
    uniqueGrades: number;
    scoreVariance: number;
    centerNames: string[];
  };
}

export interface Certificate {
  id: string;
  inspectionId: string;
  certificateNumber: string;
  grade: string;
  qualityScore: number;
  grade_a_percentage: number;
  urs_percentage: number;
  rejected_percentage: number;
  qrToken: string;
  latitude?: number;
  longitude?: number;
  isReassessment?: boolean;
  reassessmentNote?: string;
  overridden?: boolean;
  overrideReason?: string;
  createdAt: string;
}

export interface DashboardStats {
  todayInspections: number;
  pendingInspections: number;
  gradeALots: number;
  ursLots: number;
  rejectedLots: number;
  totalLots: number;
  totalInspections: number;
  totalFarmers: number;
  totalFPOs: number;
  totalBuyers: number;
  averageQualityScore: number;
}
