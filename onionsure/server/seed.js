/**
 * OnionSure — Idempotent seed.
 * Creates role users, procurement centers, FPOs, farmers, buyers and a set of
 * realistic demo inspections/certificates so dashboards & analytics are populated
 * on first run. Safe to call repeatedly (no duplicates).
 */

const bcrypt = require('bcryptjs');
const db = require('./db');
const ai = require('./ai');
const config = require('./config');

async function seed() {
  const d = db.get();
  // Top up the spec-shaped collections (sensor sessions, images, AI analyses/
  // detections, device + model registries, reassessments) so EVERY feature has
  // realistic, inter-linked seed data. Idempotent.
  seedSpecCollections(d);

  if (d.users.length > 0) {
    if (!d.lots.some((l) => l.lotNumber === 'ON-2026-00421')) {
      seedMandatory(d);
      db.persist();
    }
    return;
  }

  // --- Centers / FPOs / Farmers / Buyers ---
  const c1 = { id: db.id('ctr'), name: 'Nashik Central Procurement Center', location: 'Nashik, Maharashtra', latitude: 19.9975, longitude: 73.7898 };
  const c2 = { id: db.id('ctr'), name: 'Pune FPO Quality Hub', location: 'Pune, Maharashtra', latitude: 18.5204, longitude: 73.8567 };
  const c3 = { id: db.id('ctr'), name: 'Indore Agri Mandi', location: 'Indore, MP', latitude: 22.7196, longitude: 75.8577 };
  d.procurement_centers.push(c1, c2, c3);

  const fpo1 = { id: db.id('fpo'), name: 'Nashik Onion Growers FPO', centerId: c1.id, registeredFarmers: 0 };
  const fpo2 = { id: db.id('fpo'), name: 'Malwa FPO Collective', centerId: c3.id, registeredFarmers: 0 };
  d.fpos.push(fpo1, fpo2);

  const farmerDefs = [
    { 
      fullName: 'Ramesh Patil', 
      farmerId: 'FRM-000421', 
      mobile: '+91-9876543210', 
      village: 'Nashik', 
      farmName: 'Ram Agro Farms',
      fpoId: fpo1.id, 
      location: 'Nashik, Maharashtra', 
      lat: 20.01, 
      lng: 73.8 
    },
    { 
      fullName: 'Suresh Jadhav', 
      farmerId: 'FRM-000422', 
      mobile: '+91-9876543211', 
      village: 'Nashik', 
      farmName: 'Sai Kisan Produce',
      fpoId: fpo1.id, 
      location: 'Nashik, Maharashtra', 
      lat: 19.95, 
      lng: 73.7 
    },
    { 
      fullName: 'Anita Shinde', 
      farmerId: 'FRM-000423', 
      mobile: '+91-9876543212', 
      village: 'Indore', 
      farmName: 'Malwa Naturals',
      fpoId: fpo2.id, 
      location: 'Indore, MP', 
      lat: 22.7, 
      lng: 75.9 
    },
  ];
  const farmers = farmerDefs.map((f) => {
    const obj = { 
      id: db.id('far'), 
      fullName: f.fullName,
      farmerId: f.farmerId,
      mobile: f.mobile,
      village: f.village,
      farmName: f.farmName,
      fpoId: f.fpoId || null,
      location: f.location,
      latitude: f.lat,
      longitude: f.lng,
      qualityGradeA: 0, 
      totalLots: 0, 
      active: true,
      createdAt: db.nowISO() 
    };
    d.farmers.push(obj);
    return obj;
  });

  const buyer1 = { id: db.id('buy'), name: 'Reliance Fresh Procurement', location: 'Mumbai', createdAt: db.nowISO() };
  d.buyers.push(buyer1);

  // --- Users ---
  const users = [
    { username: 'officer1', password: 'password123', role: 'procurement_officer', name: 'Inspector Anjali', centerId: c1.id },
    { username: 'officer2', password: 'password123', role: 'procurement_officer', name: 'Inspector Vikram', centerId: c2.id },
    { username: 'officer3', password: 'password123', role: 'procurement_officer', name: 'Inspector Kavya', centerId: c3.id },
    { username: 'fpo1', password: 'password123', role: 'fpo', name: 'FPO Manager Nashik', fpoId: fpo1.id },
    { username: 'farmer1', password: 'password123', role: 'farmer', name: 'Ramesh Patil', farmerId: farmers[0].id, fpoId: fpo1.id },
    { username: 'buyer1', password: 'password123', role: 'buyer', name: 'Reliance Buyer Desk', buyerId: buyer1.id },
    { username: 'admin', password: 'password123', role: 'admin', name: 'Platform Administrator' },
  ];
  for (const u of users) {
    const obj = {
      id: db.id('usr'),
      username: u.username,
      passwordHash: bcrypt.hashSync(u.password, 10),
      role: u.role,
      name: u.name,
      email: `${u.username}@onionsure.in`,
      centerId: u.centerId || null,
      fpoId: u.fpoId || null,
      farmerId: u.farmerId || null,
      buyerId: u.buyerId || null,
      createdAt: db.nowISO(),
    };
    d.users.push(obj);
  }

  // --- Demo inspections across last ~30 days ---
  const varieties = ['Nashik Red', 'Bhima', 'Pusa Red', 'Aggrifound Light Red'];
  const centers = [c1, c2, c3];
  const scenarios = ['random', 'random', 'random', 'demo', 'random', 'random', 'random', 'demo'];
  for (let i = 0; i < 9; i++) {
    const farmer = farmers[i % farmers.length];
    const center = centers[i % centers.length];
    const daysAgo = i * 3 + 1;
    const created = new Date(Date.now() - daysAgo * 86400000).toISOString();

    const lot = {
      id: db.id('lot'),
      lotNumber: `ON-${new Date(created).getFullYear()}-${String(1000 + i).padStart(4, '0')}`,
      farmerId: farmer.id,
      fpoId: farmer.fpoId,
      crop: 'Onion',
      variety: varieties[i % varieties.length],
      quantityKg: 500 + i * 120,
      procurementCenterId: center.id,
      inspectorId: d.users.find((u) => u.role === 'procurement_officer' && u.centerId === center.id)?.id || d.users[0].id,
      createdAt: created,
    };
    d.lots.push(lot);

    const sess = {
      id: db.id('insp'),
      lotId: lot.id,
      sampleWeightKg: 1.5,
      status: 'completed',
      mode: 'DEMO',
      startedAt: created,
      completedAt: created,
    };
    d.inspection_sessions.push(sess);

    const vision = ai.generateVisionSample(scenarios[i] === 'demo' ? 'demo' : 'random', 100);
    const ethane = +(0.18 + Math.random() * 0.5).toFixed(2);
    const methane = +(0.08 + Math.random() * 0.25).toFixed(2);
    const temperature = +(22 + Math.random() * 7).toFixed(1);
    const humidity = +(55 + Math.random() * 18).toFixed(1);

    const gas = ai.classifyGas({ ethane, methane, temperature, humidity });
    const env = ai.scoreEnvironment({ temperature, humidity });
    const fusion = ai.fuse({ vision, gas, environment: env });

    d.sensor_readings.push({
      id: db.id('sen'),
      inspectionId: sess.id,
      ethane, methane, temperature, humidity,
      stage: gas.stage, gasScore: gas.gasScore,
      timestamp: created,
    });

    for (const det of vision.detections.slice(0, 12)) {
      d.vision_detections.push({
        id: db.id('vd'),
        inspectionId: sess.id,
        class: det.class,
        confidence: det.confidence,
        bbox: det.bbox,
        size: det.size,
      });
    }

    d.fusion_results.push({
      id: db.id('fus'),
      inspectionId: sess.id,
      visionScore: fusion.visionScore,
      gasScore: fusion.gasScore,
      environmentalScore: fusion.environmentalScore,
      finalScore: fusion.finalScore,
      confidence: fusion.confidence,
      grade: fusion.grade,
      riskLevel: fusion.riskLevel,
      earlySpoilageAlert: fusion.earlySpoilageAlert,
      explanation: fusion.explanation,
    });

    const certNo = `CERT-ON-${new Date(created).getFullYear()}-${String(100000 + i).padStart(6, '0')}`;
    const qr = db.id('qr');
    d.quality_certificates.push({
      id: db.id('cert'),
      inspectionId: sess.id,
      certificateNumber: certNo,
      grade: fusion.grade,
      qualityScore: fusion.finalScore,
      grade_a_percentage: vision.percentages.healthy,
      urs_percentage: +(vision.percentages.damaged + vision.percentages.sprouted).toFixed(1),
      rejected_percentage: +(vision.percentages.rotten + vision.percentages.undersized).toFixed(1),
      qrToken: qr,
      latitude: center.latitude,
      longitude: center.longitude,
      createdAt: created,
    });
    d.qr_verifications.push({ id: db.id('vrf'), certificateId: certNo, token: qr, status: 'VERIFIED', verifiedAt: created });

    // update farmer stats
    farmer.totalLots += 1;
    if (fusion.grade === 'GRADE A') farmer.qualityGradeA += 1;
  }

  seedMandatory(d);
  db.persist();
}

function seedMandatory(d) {
  d.overrides = d.overrides || [];
  d.disputes = d.disputes || [];
  d.audit_logs = d.audit_logs || [];

  if (d.lots.some((l) => l.lotNumber === 'ON-2026-00421')) return;

  const farmerRamesh = d.farmers[0];
  const centerA = d.procurement_centers[0];
  const centerB = d.procurement_centers[1] || d.procurement_centers[0];
  const officerA = d.users.find((u) => u.role === 'procurement_officer') || d.users[0];
  const officerB = d.users.filter((u) => u.role === 'procurement_officer')[1] || officerA;
  const fpo1 = d.fpos[0];

  const mandatoryLot = {
    id: db.id('lot'),
    lotNumber: 'ON-2026-00421',
    centralLotId: 'ON-2026-00421',
    farmerId: farmerRamesh.id,
    fpoId: fpo1.id,
    crop: 'Onion',
    variety: 'Nashik Red',
    quantityKg: 1500,
    procurementCenterId: centerA.id,
    inspectorId: officerA.id,
    status: 'graded',
    currentGrade: 'GRADE A',
    currentScore: 91,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  };
  d.lots.push(mandatoryLot);

  // Inspection 1 at Center A -> Grade A (91/100)
  const inspA = {
    id: db.id('insp'),
    lotId: mandatoryLot.id,
    procurementCenterId: centerA.id,
    inspectorId: officerA.id,
    sampleWeightKg: 2.0,
    status: 'completed',
    mode: 'DEMO',
    startedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    completedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  };
  d.inspection_sessions.push(inspA);

  d.sensor_readings.push({
    id: db.id('sen'),
    inspectionId: inspA.id,
    temperature: 24.2, humidity: 60.5, co2: 430, ch4: 0.15, c2h4: 0.35, nh3: 0.10, moisture: 14.0, ph: 6.0,
    stage: 'LOW', gasScore: 92, timestamp: inspA.startedAt,
  });

  const fusionA = {
    id: db.id('fus'),
    inspectionId: inspA.id,
    visionScore: 94,
    gasScore: 90,
    environmentalScore: 92,
    finalScore: 91,
    qualityScore: 91,
    confidence: 0.95,
    grade: 'GRADE A',
    riskLevel: 'LOW',
    spoilageRisk: 'LOW',
    earlySpoilageAlert: false,
    rulesVersion: 'ONION_STANDARD_2026_V1',
    reasons: [
      'Low visible defect percentage (< 4% rotten/undersized)',
      'Uniform bulb sizes (Nashik Red standard 45-65mm)',
      'Ethylene and methane gas levels well below threshold limits',
    ],
    explanation: 'High vision uniformity and clean volatile gas profile confirmed Grade A.',
  };
  d.fusion_results.push(fusionA);

  const certA = {
    id: db.id('cert'),
    inspectionId: inspA.id,
    certificateNumber: 'CERT-ON-2026-00421A',
    grade: 'GRADE A',
    qualityScore: 91,
    grade_a_percentage: 72.0,  // Fixed mock data: 72% Grade A
    urs_percentage: 18.0,      // Fixed mock data: 18% URS
    rejected_percentage: 10.0,  // Fixed mock data: 10% Rejected
    qrToken: db.id('qr'),
    latitude: centerA.latitude,
    longitude: centerA.longitude,
    lotNumber: mandatoryLot.lotNumber,
    variety: 'Nashik Red',
    quantityKg: 1500,
    farmerId: farmerRamesh.id,
    farmerName: farmerRamesh.fullName,
    createdAt: inspA.completedAt,
  };
  d.quality_certificates.push(certA);
  d.qr_verifications.push({ id: db.id('vrf'), certificateId: certA.certificateNumber, token: certA.qrToken, status: 'VERIFIED', verifiedAt: certA.createdAt });

  // Inspection 2 at Center B on SAME Central Lot ON-2026-00421 -> URS (82/100) -> Cross-Center variation!
  const inspB = {
    id: db.id('insp'),
    lotId: mandatoryLot.id,
    procurementCenterId: centerB.id,
    inspectorId: officerB.id,
    sampleWeightKg: 2.0,
    status: 'completed',
    mode: 'DEMO',
    startedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    completedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  };
  d.inspection_sessions.push(inspB);

  d.sensor_readings.push({
    id: db.id('sen'),
    inspectionId: inspB.id,
    temperature: 27.5, humidity: 72.0, co2: 780, ch4: 0.38, c2h4: 0.65, nh3: 0.28, moisture: 16.5, ph: 5.4,
    stage: 'MEDIUM', gasScore: 78, timestamp: inspB.startedAt,
  });

  const fusionB = {
    id: db.id('fus'),
    inspectionId: inspB.id,
    visionScore: 84,
    gasScore: 78,
    environmentalScore: 82,
    finalScore: 82,
    qualityScore: 82,
    confidence: 0.91,
    grade: 'URS',
    riskLevel: 'MEDIUM',
    spoilageRisk: 'MEDIUM',
    earlySpoilageAlert: false,
    rulesVersion: 'ONION_STANDARD_2026_V1',
    reasons: [
      'Elevated superficial skin bruising during transit',
      'Mild ethylene accumulation recorded at secondary center hub',
    ],
    explanation: 'Transit friction increased minor defects; classified under Uniform Rejection Standard (URS).',
  };
  d.fusion_results.push(fusionB);

  const certB = {
    id: db.id('cert'),
    inspectionId: inspB.id,
    certificateNumber: 'CERT-ON-2026-00421B',
    grade: 'URS',
    qualityScore: 82,
    grade_a_percentage: 82.0,
    urs_percentage: 14.0,
    rejected_percentage: 4.0,
    qrToken: db.id('qr'),
    latitude: centerB.latitude,
    longitude: centerB.longitude,
    createdAt: inspB.completedAt,
  };
  d.quality_certificates.push(certB);
  d.qr_verifications.push({ id: db.id('vrf'), certificateId: certB.certificateNumber, token: certB.qrToken, status: 'VERIFIED', verifiedAt: certB.createdAt });

  // Seed one active override with clear justification
  const overrideEntry = {
    id: db.id('ovr'),
    inspectionId: inspB.id,
    lotId: mandatoryLot.id,
    centralLotId: mandatoryLot.lotNumber,
    originalResult: 'URS',
    newResult: 'GRADE A',
    reason: 'Manual verification confirmed acceptable condition and transit surface moisture within allowable margin.',
    officerId: officerB.id,
    officerName: officerB.name,
    centerId: centerB.id,
    timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
  };
  d.overrides.push(overrideEntry);

  // Seed an active dispute for farmer testing
  const disputeEntry = {
    id: db.id('dsp'),
    disputeNumber: 'DSP-2026-001',
    lotId: mandatoryLot.id,
    centralLotId: mandatoryLot.lotNumber,
    inspectionId: inspB.id,
    certificateNumber: certB.certificateNumber,
    grade: 'URS',
    qualityScore: 82,
    farmerId: farmerRamesh.id,
    raisedBy: farmerRamesh.id,
    reason: 'Incorrect defect detection',
    description: 'Transit dust was misclassified as skin rot defect. Bulbs are intact and firm.',
    status: 'under_review',
    timeline: [
      { status: 'submitted', label: 'Submitted', timestamp: new Date(Date.now() - 18 * 3600000).toISOString(), note: 'Dispute submitted by farmer' },
      { status: 'under_review', label: 'Under Review', timestamp: new Date(Date.now() - 6 * 3600000).toISOString(), note: 'Officer Vikram assigned for verification' },
    ],
    createdAt: new Date(Date.now() - 18 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
  };
  d.disputes.push(disputeEntry);

  // Audit log entries
  d.audit_logs.push({
    id: db.id('aud'),
    action: 'LOT_CREATED',
    lotId: mandatoryLot.id,
    lotNumber: mandatoryLot.lotNumber,
    actorId: officerA.id,
    actorRole: 'procurement_officer',
    centerId: centerA.id,
    timestamp: mandatoryLot.createdAt,
    details: `Central lot ${mandatoryLot.lotNumber} created at ${centerA.name}`,
  });
  d.audit_logs.push({
    id: db.id('aud'),
    action: 'INSPECTION_COMPLETED',
    inspectionId: inspA.id,
    lotId: mandatoryLot.id,
    lotNumber: mandatoryLot.lotNumber,
    actorId: officerA.id,
    actorRole: 'procurement_officer',
    centerId: centerA.id,
    timestamp: inspA.completedAt,
    details: `${centerA.name} completed inspection: Grade A (91/100)`,
  });
  d.audit_logs.push({
    id: db.id('aud'),
    action: 'INSPECTION_COMPLETED',
    inspectionId: inspB.id,
    lotId: mandatoryLot.id,
    lotNumber: mandatoryLot.lotNumber,
    actorId: officerB.id,
    actorRole: 'procurement_officer',
    centerId: centerB.id,
    timestamp: inspB.completedAt,
    details: `${centerB.name} completed inspection: URS (82/100) - Cross-center variation detected`,
  });
  d.audit_logs.push({
    id: db.id('aud'),
    action: 'MANUAL_OVERRIDE',
    inspectionId: inspB.id,
    lotId: mandatoryLot.id,
    lotNumber: mandatoryLot.lotNumber,
    actorId: officerB.id,
    actorRole: 'procurement_officer',
    centerId: centerB.id,
    timestamp: overrideEntry.timestamp,
    details: `Grade overridden from URS to GRADE A. Reason: "${overrideEntry.reason}" by ${officerB.name}`,
  });
  d.audit_logs.push({
    id: db.id('aud'),
    action: 'DISPUTE_CREATED',
    lotId: mandatoryLot.id,
    lotNumber: mandatoryLot.lotNumber,
    actorId: farmerRamesh.id,
    actorRole: 'farmer',
    centerId: centerB.id,
    timestamp: disputeEntry.createdAt,
    details: `Dispute ${disputeEntry.disputeNumber} filed for ${mandatoryLot.lotNumber}: Incorrect defect detection`,
  });

  db.persist();
}

/**
 * Populate the spec-shaped collections that the original seed did not cover,
 * linked to the existing inspections by inspectionId (the single backbone).
 * Idempotent: guarded by checking whether records already exist per inspection.
 */
function seedSpecCollections(d) {
  // --- Inspection images (1-2 per inspection, placeholder refs) ---
  for (const sess of d.inspection_sessions) {
    if (!d.inspection_images.some((i) => i.inspectionId === sess.id)) {
      const base = d.inspection_images.length;
      d.inspection_images.push({
        id: db.id('img'),
        inspectionId: sess.id,
        fileName: `sample_${base + 1}.jpg`,
        url: `uploads/sample_${base + 1}.jpg`,
        angle: 'top',
        quality: 'good',
        createdAt: sess.startedAt || db.nowISO(),
      });
    }
  }

  // --- Sensor sessions (one per inspection) + link readings via sessionId ---
  for (const sess of d.inspection_sessions) {
    if (!d.sensor_sessions.some((s) => s.inspectionId === sess.id)) {
      const sessionId = db.id('sen');
      d.sensor_sessions.push({
        id: sessionId,
        inspectionId: sess.id,
        lotId: sess.lotId || null,
        deviceId: 'DEV-LOKI-01',
        start: sess.startedAt || sess.createdAt || db.nowISO(),
        end: sess.completedAt || null,
        connectivity: 'online',
        battery: 92,
        signal: 'good',
        createdAt: db.nowISO(),
      });
      for (const r of d.sensor_readings) {
        if (r.inspectionId === sess.id && !r.sessionId) r.sessionId = sessionId;
      }
    }
  }

  // --- AI analyses + spec-shaped AI detections per inspection ---
  for (const sess of d.inspection_sessions) {
    if (d.ai_analyses.some((a) => a.inspectionId === sess.id)) continue;
    const dets = d.vision_detections.filter((v) => v.inspectionId === sess.id);
    const counts = { healthy: 0, damaged: 0, rotten: 0, sprouted: 0, undersized: 0 };
    for (const det of dets) {
      const c = (det.class || 'Healthy').toLowerCase();
      if (c in counts) counts[c] += 1; else counts.healthy += 1;
    }
    const fusion = d.fusion_results.find((f) => f.inspectionId === sess.id);
    if (dets.length === 0) {
      if (fusion && fusion.grade === 'GRADE A') Object.assign(counts, { healthy: 18, damaged: 1, rotten: 0, sprouted: 1, undersized: 0 });
      else if (fusion && fusion.grade === 'URS') Object.assign(counts, { healthy: 14, damaged: 3, rotten: 1, sprouted: 2, undersized: 0 });
      else Object.assign(counts, { healthy: 10, damaged: 4, rotten: 3, sprouted: 2, undersized: 1 });
    }
    const analysisId = db.id('ai');
    const avgConf = dets.length ? +(dets.reduce((s, x) => s + (x.confidence || 0.9), 0) / dets.length).toFixed(2) : 0.92;
    d.ai_analyses.push({
      id: analysisId,
      inspectionId: sess.id,
      model: 'onion-vision-roboflow',
      version: '2026.1.0',
      counts,
      confidence: avgConf,
      imageIds: d.inspection_images.filter((i) => i.inspectionId === sess.id).map((i) => i.id),
      totalDetections: counts.healthy + counts.damaged + counts.rotten + counts.sprouted + counts.undersized,
      averageConfidence: avgConf,
      processingTimeMs: 1200 + Math.floor(Math.random() * 800),
      timestamp: sess.completedAt || sess.startedAt || db.nowISO(),
    });
    const sampleImg = (d.inspection_images.find((i) => i.inspectionId === sess.id) || {}).id || null;
    for (const det of dets) {
      d.ai_detections.push({
        id: db.id('det'),
        analysisId,
        imageId: det.imageId || sampleImg,
        class: det.class || 'Healthy',
        confidence: det.confidence != null ? det.confidence : 0.9,
        bbox: det.bbox || null,
        createdAt: db.nowISO(),
      });
    }
    if (dets.length === 0) {
      // synthesize at least one detection so the collection is populated
      for (const cls of ['Healthy', 'Damaged', 'Rotten', 'Sprouted', 'Undersized']) {
        d.ai_detections.push({
          id: db.id('det'), analysisId, imageId: sampleImg, class: cls,
          confidence: 0.9, bbox: null, createdAt: db.nowISO(),
        });
      }
    }
  }

  // --- Sensor device registry ---
  if (d.sensor_devices.length === 0) {
    d.sensor_devices.push(
      { id: db.id('dev'), deviceId: 'DEV-LOKI-01', transport: 'lora', battery: 92, signal: 'good', location: 'Nashik Central Procurement Center', lastSeen: db.nowISO(), status: 'active' },
      { id: db.id('dev'), deviceId: 'DEV-LOKI-02', transport: 'wifi', battery: 76, signal: 'fair', location: 'Pune FPO Quality Hub', lastSeen: db.nowISO(), status: 'active' },
    );
  }

  // --- AI model versions registry ---
  if (d.ai_model_versions.length === 0) {
    d.ai_model_versions.push(
      { id: db.id('mdl'), name: 'onion-vision-roboflow', version: '2026.1.0', type: 'vision', accuracy: 0.94, createdAt: db.nowISO() },
      { id: db.id('mdl'), name: 'onion-gas-rf', version: '2026.0.3', type: 'sensor', accuracy: 0.89, createdAt: db.nowISO() },
    );
  }

  // --- Ensure an active grading rule exists ---
  if (!d.grading_rules.some((g) => g.active)) {
    d.grading_rules.push({
      id: 'rule_onion_2026_v1', version: 'ONION_STANDARD_2026_V1',
      gradeThresholds: { gradeA: 85, urs: 65 }, sensorThresholds: {}, active: true, createdAt: db.nowISO(),
    });
  }

  // --- Reassessment (versioned result change) sample ---
  if (d.reassessments.length === 0 && d.inspection_sessions.length) {
    const insp = d.inspection_sessions[0];
    const officer = d.users.find((u) => u.role === 'procurement_officer') || {};
    d.reassessments.push({
      id: db.id('rea'), inspectionId: insp.id, previousResult: 'URS', newResult: 'GRADE A',
      reason: 'Manual verification confirmed acceptable condition; transit surface moisture within allowable margin.',
      version: 2, officerId: officer.id || null, officerName: officer.name || 'Officer',
      createdAt: db.nowISO(),
    });
  }

  db.persist();
}

module.exports = { seed };
