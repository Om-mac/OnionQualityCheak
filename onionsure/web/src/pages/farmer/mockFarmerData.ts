export interface MockFarmerInspection {
  id: string;
  inspectionNumber: string;
  lotId: string;
  certificateNumber: string;
  lotNumber: string;
  crop: string;
  variety: string;
  farmerName: string;
  grade: 'GRADE A' | 'URS' | 'REJECTED';
  qualityScore: number;
  finalScore: number;
  visionScore: number;
  gasScore: number;
  environmentalScore: number;
  status: string;
  workflowState: string;
  createdAt: string;
  quantityKg: number;
  isReassessment?: boolean;
  previousGrade?: string;
  reassessmentReason?: string;
  grade_a_percentage: number;
  urs_percentage: number;
  rejected_percentage: number;
  reasons: string[];
  rulesVersion?: string;
  sensor: {
    temperature: number;
    humidity: number;
    co2: number;
    ch4: number;
    methane?: number;
    c2h4: number;
    ethane?: number;
    nh3: number;
    moisture: number;
    ph: number;
  };
}

export const MOCK_FARMER_INSPECTIONS: MockFarmerInspection[] = [
  {
    id: 'insp_mock_001',
    inspectionNumber: 'INSP-2026-08421',
    lotId: 'lot_mock_001',
    certificateNumber: 'CERT-ON-2026-004281',
    lotNumber: 'ON-2026-1042',
    crop: 'Onion',
    variety: 'Nashik Red',
    farmerName: 'Ramesh Patil',
    grade: 'GRADE A',
    qualityScore: 94,
    finalScore: 94,
    visionScore: 95,
    gasScore: 93,
    environmentalScore: 94,
    status: 'completed',
    workflowState: 'CERTIFIED',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    quantityKg: 1200,
    grade_a_percentage: 93.5,
    urs_percentage: 5.2,
    rejected_percentage: 1.3,
    rulesVersion: 'ONION_STANDARD_2026_V1',
    reasons: [
      'Vision model confirmed >93% healthy skin integrity with uniform bulb shape and dry scales',
      'Gas biomarker sensor detected ultra-low ethylene (0.19 ppm) and methane, indicating zero decay',
      'Storage microclimate optimal at 22.4°C and 62.1% relative humidity',
    ],
    sensor: {
      temperature: 22.4,
      humidity: 62.1,
      co2: 410,
      ch4: 0.08,
      methane: 0.08,
      c2h4: 0.19,
      ethane: 0.19,
      nh3: 0.04,
      moisture: 13.2,
      ph: 6.1,
    },
  },
  {
    id: 'insp_mock_002',
    inspectionNumber: 'INSP-2026-08390',
    lotId: 'lot_mock_002',
    certificateNumber: 'CERT-ON-2026-004192',
    lotNumber: 'ON-2026-1038',
    crop: 'Onion',
    variety: 'Aggrifound Light Red',
    farmerName: 'Ramesh Patil',
    grade: 'GRADE A',
    qualityScore: 88,
    finalScore: 88,
    visionScore: 89,
    gasScore: 86,
    environmentalScore: 90,
    status: 'completed',
    workflowState: 'CERTIFIED',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    quantityKg: 850,
    grade_a_percentage: 88.0,
    urs_percentage: 9.5,
    rejected_percentage: 2.5,
    rulesVersion: 'ONION_STANDARD_2026_V1',
    reasons: [
      'Visual defect classification confirmed <10% minor superficial skin peeling within Grade A threshold',
      'Multi-gas volatile readings within safe non-decay range (C₂H₄ 0.28 ppm)',
      'Standardized calibration verified under ONION_STANDARD_2026_V1',
    ],
    sensor: {
      temperature: 23.8,
      humidity: 64.5,
      co2: 435,
      ch4: 0.12,
      methane: 0.12,
      c2h4: 0.28,
      ethane: 0.28,
      nh3: 0.07,
      moisture: 14.0,
      ph: 5.9,
    },
  },
  {
    id: 'insp_mock_003',
    inspectionNumber: 'INSP-2026-08315',
    lotId: 'lot_mock_003',
    certificateNumber: 'CERT-ON-2026-004055',
    lotNumber: 'ON-2026-1025',
    crop: 'Onion',
    variety: 'Bhima Super',
    farmerName: 'Ramesh Patil',
    grade: 'GRADE A',
    isReassessment: true,
    previousGrade: 'URS',
    reassessmentReason: 'Dispute accepted following FPO committee physical sample verification. Surface blemishes re-classified as superficial dry outer scale peeling, not internal rot.',
    qualityScore: 86,
    finalScore: 86,
    visionScore: 87,
    gasScore: 84,
    environmentalScore: 88,
    status: 'completed',
    workflowState: 'REASSESSED',
    createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
    quantityKg: 1500,
    grade_a_percentage: 86.2,
    urs_percentage: 11.0,
    rejected_percentage: 2.8,
    rulesVersion: 'ONION_STANDARD_2026_V1',
    reasons: [
      'Re-inspection confirmed inner flesh sound and uninfected',
      'Multi-gas volatile fingerprint remains in stable pre-decay band',
      'Secondary assessment ratified by Quality Officer Anjali under protocol V1',
    ],
    sensor: {
      temperature: 24.1,
      humidity: 66.0,
      co2: 450,
      ch4: 0.14,
      methane: 0.14,
      c2h4: 0.32,
      ethane: 0.32,
      nh3: 0.09,
      moisture: 14.4,
      ph: 5.8,
    },
  },
  {
    id: 'insp_mock_004',
    inspectionNumber: 'INSP-2026-08240',
    lotId: 'lot_mock_004',
    certificateNumber: 'CERT-ON-2026-003980',
    lotNumber: 'ON-2026-1014',
    crop: 'Onion',
    variety: 'Pusa Red',
    farmerName: 'Ramesh Patil',
    grade: 'URS',
    qualityScore: 74,
    finalScore: 74,
    visionScore: 72,
    gasScore: 75,
    environmentalScore: 78,
    status: 'completed',
    workflowState: 'CERTIFIED',
    createdAt: new Date(Date.now() - 17 * 86400000).toISOString(),
    quantityKg: 2000,
    grade_a_percentage: 68.5,
    urs_percentage: 24.0,
    rejected_percentage: 7.5,
    rulesVersion: 'ONION_STANDARD_2026_V1',
    reasons: [
      'Superficial bruising and early sprouting exceed Grade A tolerances (24% URS band)',
      'Slightly elevated ethylene detection indicates onset of physiological sprouting',
      'Cleared for secondary commercial processing and dehydration procurement',
    ],
    sensor: {
      temperature: 25.5,
      humidity: 71.0,
      co2: 490,
      ch4: 0.22,
      methane: 0.22,
      c2h4: 0.48,
      ethane: 0.48,
      nh3: 0.15,
      moisture: 15.6,
      ph: 5.6,
    },
  },
  {
    id: 'insp_mock_005',
    inspectionNumber: 'INSP-2026-08180',
    lotId: 'lot_mock_005',
    certificateNumber: 'CERT-ON-2026-003850',
    lotNumber: 'ON-2026-1008',
    crop: 'Onion',
    variety: 'Nashik Red (Garwa)',
    farmerName: 'Ramesh Patil',
    grade: 'GRADE A',
    qualityScore: 91,
    finalScore: 91,
    visionScore: 92,
    gasScore: 90,
    environmentalScore: 91,
    status: 'completed',
    workflowState: 'CERTIFIED',
    createdAt: new Date(Date.now() - 24 * 86400000).toISOString(),
    quantityKg: 1100,
    grade_a_percentage: 91.0,
    urs_percentage: 7.2,
    rejected_percentage: 1.8,
    rulesVersion: 'ONION_STANDARD_2026_V1',
    reasons: [
      'Excellent curing and dry scale retention across entire batch sample',
      'Volatile gases well below baseline danger thresholds',
      'Eligible for premium export grading and institutional procurement',
    ],
    sensor: {
      temperature: 21.8,
      humidity: 59.2,
      co2: 395,
      ch4: 0.07,
      methane: 0.07,
      c2h4: 0.18,
      ethane: 0.18,
      nh3: 0.03,
      moisture: 12.8,
      ph: 6.2,
    },
  },
  {
    id: 'insp_mock_006',
    inspectionNumber: 'INSP-2026-08110',
    lotId: 'lot_mock_006',
    certificateNumber: 'CERT-ON-2026-003712',
    lotNumber: 'ON-2026-0994',
    crop: 'Onion',
    variety: 'Bhima Dark Red',
    farmerName: 'Ramesh Patil',
    grade: 'URS',
    qualityScore: 68,
    finalScore: 68,
    visionScore: 66,
    gasScore: 70,
    environmentalScore: 71,
    status: 'completed',
    workflowState: 'CERTIFIED',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    quantityKg: 900,
    grade_a_percentage: 62.0,
    urs_percentage: 28.5,
    rejected_percentage: 9.5,
    rulesVersion: 'ONION_STANDARD_2026_V1',
    reasons: [
      'Blemish and undersized percentages exceed primary retail standard',
      'Microclimate humidity logged at 73.5% during transit',
      'Eligible for local mandi and value-added onion paste processing',
    ],
    sensor: {
      temperature: 26.2,
      humidity: 73.5,
      co2: 510,
      ch4: 0.25,
      methane: 0.25,
      c2h4: 0.52,
      ethane: 0.52,
      nh3: 0.18,
      moisture: 16.2,
      ph: 5.5,
    },
  },
];

export const MOCK_FARMER_CERTIFICATES = MOCK_FARMER_INSPECTIONS.map((i) => ({
  id: i.certificateNumber,
  inspectionId: i.id,
  certificateNumber: i.certificateNumber,
  lotNumber: i.lotNumber,
  lotId: i.lotId,
  crop: i.crop,
  variety: i.variety,
  quantityKg: i.quantityKg,
  farmerName: i.farmerName,
  grade: i.grade,
  qualityScore: i.qualityScore,
  grade_a_percentage: i.grade_a_percentage,
  urs_percentage: i.urs_percentage,
  rejected_percentage: i.rejected_percentage,
  isReassessment: i.isReassessment || false,
  reassessmentNote: i.reassessmentReason,
  qrToken: `qr_${i.certificateNumber.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
  createdAt: i.createdAt,
}));

export function getMockReportDetail(idOrNumber?: string) {
  if (!idOrNumber) return null;
  const needle = String(idOrNumber).trim().toLowerCase();
  const match =
    MOCK_FARMER_INSPECTIONS.find(
      (m) =>
        m.id.toLowerCase() === needle ||
        m.inspectionNumber.toLowerCase() === needle ||
        m.certificateNumber.toLowerCase() === needle ||
        m.lotNumber.toLowerCase() === needle,
    ) || MOCK_FARMER_INSPECTIONS[0];

  return {
    certificate: {
      id: match.certificateNumber,
      inspectionId: match.id,
      certificateNumber: match.certificateNumber,
      grade: match.grade,
      qualityScore: match.qualityScore,
      grade_a_percentage: match.grade_a_percentage,
      urs_percentage: match.urs_percentage,
      rejected_percentage: match.rejected_percentage,
      isReassessment: match.isReassessment || false,
      reassessmentNote: match.reassessmentReason,
      createdAt: match.createdAt,
      lotNumber: match.lotNumber,
    },
    inspection: match,
    lot: {
      id: match.lotId,
      lotNumber: match.lotNumber,
      crop: match.crop,
      variety: match.variety,
      quantityKg: match.quantityKg,
      status: match.isReassessment ? 'Reassessed' : 'Graded',
      farmerName: match.farmerName,
      procurementCenterId: 'ctr_nashik_01',
    },
    fusion: {
      grade: match.grade,
      finalScore: match.finalScore,
      visionScore: match.visionScore,
      gasScore: match.gasScore,
      environmentalScore: match.environmentalScore,
      confidence: 0.94,
      riskLevel: match.grade === 'GRADE A' ? 'LOW' : match.grade === 'URS' ? 'MEDIUM' : 'HIGH',
      reasons: match.reasons,
      rulesVersion: match.rulesVersion || 'ONION_STANDARD_2026_V1',
      isReassessment: match.isReassessment || false,
      previousGrade: match.previousGrade,
      reassessmentReason: match.reassessmentReason,
    },
    sensors: [
      {
        id: `sen_${match.id}`,
        inspectionId: match.id,
        ...match.sensor,
        timestamp: match.createdAt,
      },
    ],
    defectCounts: {
      healthy: Math.round(match.grade_a_percentage),
      damaged: Math.round(match.urs_percentage * 0.6),
      sprouted: Math.round(match.urs_percentage * 0.4),
      rotten: Math.round(match.rejected_percentage * 0.7),
      undersized: Math.round(match.rejected_percentage * 0.3),
    },
    center: {
      name: 'Nashik Main Procurement Center',
      location: 'Nashik APMC Market Yard',
    },
    fpo: {
      name: 'Nashik Onion Growers FPO',
    },
    farmer: {
      name: match.farmerName,
      farmName: 'Ram Agro Farms, Nashik',
    },
    inspector: {
      username: 'Inspector Anjali (INS-014)',
    },
  };
}
