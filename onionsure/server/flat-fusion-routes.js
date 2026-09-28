/**
 * OnionSure — Flat Fusion Intelligence API
 *
 * The Fusion.tsx page calls these "flat" endpoints:
 *   GET  /api/fusion/evidence/:inspectionId  — load vision + IoT evidence
 *   GET  /api/fusion/context                  — (legacy) lot-level context
 *   POST /api/fusion/calculate                — compute fusion score
 *   POST /api/fusion/commit                   — persist fusion result to inspection
 *
 * All reads/writes use the same db collections as the nested
 * /api/inspections/:id/fusion route so there is one source of truth.
 */

const express = require('express');
const router  = express.Router();
const db      = require('./db');
const auth    = require('./auth');

const requireAuth = auth.requireAuth;

/* --- Grade thresholds --- */
const GRADE_A_MIN  = 85;
const URS_MIN      = 65;

function determineGrade(score) {
  if (score >= GRADE_A_MIN) return 'GRADE_A';
  if (score >= URS_MIN)     return 'URS';
  return 'REJECTED';
}

function determineRiskLevel(score, defectPct) {
  if (score < 50 || defectPct > 40) return 'CRITICAL';
  if (score < 70 || defectPct > 25) return 'HIGH';
  if (score < 85 || defectPct > 15) return 'MEDIUM';
  return 'LOW';
}

/* GET /api/fusion/evidence/:inspectionId */
router.get('/evidence/:inspectionId', requireAuth(), (req, res) => {
  try {
    const d = db.get();
    const { inspectionId } = req.params;

    const inspection = (d.inspections || []).find(i => i.id === inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    const lot = (d.lots || []).find(l => l.id === inspection.lotId)
              || (d.lots || []).find(l => l.lotNumber === inspection.lotNumber);

    const aiAnalyses = (d.aiAnalyses || []).filter(a => a.inspectionId === inspectionId);
    const total = (inspection.healthyCount || 0) + (inspection.damagedCount || 0) +
                  (inspection.rottenCount  || 0) + (inspection.sproutedCount || 0) +
                  (inspection.undersizedCount || 0);
    const hasVision = aiAnalyses.length > 0 || total > 0;

    let vision = null;
    if (hasVision) {
      const counts = {
        healthy:    inspection.healthyCount    || 0,
        damaged:    inspection.damagedCount    || 0,
        rotten:     inspection.rottenCount     || 0,
        sprouted:   inspection.sproutedCount   || 0,
        undersized: inspection.undersizedCount || 0,
      };
      const percentages = {};
      for (const k of Object.keys(counts)) {
        percentages[k] = total > 0 ? parseFloat(((counts[k] / total) * 100).toFixed(2)) : 0;
      }
      const defectCount = counts.damaged + counts.rotten + counts.sprouted + counts.undersized;
      const visionScore = total > 0 ? Math.max(0, 100 - (defectCount / total) * 100) : 0;
      const confidence  = aiAnalyses.length > 0
        ? (aiAnalyses.reduce((s, a) => s + (a.confidence || inspection.aiConfidence || 0.85), 0) / aiAnalyses.length)
        : (inspection.aiConfidence || 0.85);

      vision = {
        source: aiAnalyses.length > 0 ? 'ai_analysis' : 'inspection_counts',
        total,
        counts,
        percentages,
        visionScore: parseFloat(visionScore.toFixed(2)),
        confidence:  parseFloat(confidence.toFixed(4)),
      };
    }

    const sensorReadings = (d.sensorReadings || []).filter(s => s.inspectionId === inspectionId);
    const hasIoT = sensorReadings.length > 0;
    let iot = null;
    if (hasIoT) {
      const latest = sensorReadings[sensorReadings.length - 1];
      let gasScore = 100;
      if (latest.co2  > 2000) gasScore -= 20;
      if (latest.ch4  > 100)  gasScore -= 15;
      if (latest.nh3  > 50)   gasScore -= 20;
      if (latest.c2h4 > 10)   gasScore -= 10;
      gasScore = Math.max(0, gasScore);
      const stage = gasScore >= 80 ? 'LOW' : gasScore >= 60 ? 'MEDIUM' : 'HIGH';
      const condition = gasScore >= 70 ? 'EXCELLENT' : 'GOOD';
      iot = {
        source: 'sensor_readings',
        gasScore: parseFloat(gasScore.toFixed(2)),
        stage, condition,
        conditionLabel: condition === 'EXCELLENT' ? 'Excellent' : 'Good',
        confidence: 0.90,
        environmentScore: gasScore,
        timestamp: latest.recordedAt || latest.createdAt || db.nowISO(),
      };
    }

    const storedFusion = ((d.fusionResults || []).find(f => f.inspectionId === inspectionId)) || null;

    res.json({
      inspectionId,
      lotId:        inspection.lotId        || null,
      lotNumber:    inspection.lotNumber     || null,
      centralLotId: inspection.centralLotId  || (lot && lot.centralLotId) || null,
      hasVision, hasIoT, vision, iot, storedFusion,
      session: {
        status:        inspection.status      || 'UNKNOWN',
        workflowState: inspection.status      || 'UNKNOWN',
        startedAt:     inspection.createdAt   || db.nowISO(),
        completedAt:   inspection.completedAt || null,
      },
      lot: {
        lotNumber:           lot ? lot.lotNumber           : null,
        centralLotId:        lot ? lot.centralLotId         : null,
        variety:             lot ? lot.variety              : null,
        crop:                lot ? lot.crop                 : null,
        quantityKg:          lot ? (lot.quantityKg || lot.quantity) : null,
        farmerId:            lot ? lot.farmerId             : null,
        fpoId:               lot ? lot.fpoId                : null,
        procurementCenterId: lot ? (lot.procurementCenterId || lot.centreId) : null,
      },
    });
  } catch (err) {
    console.error('fusion/evidence error:', err);
    res.status(500).json({ error: 'Failed to load fusion evidence' });
  }
});

/* GET /api/fusion/context */
router.get('/context', requireAuth(), (req, res) => {
  try {
    const d = db.get();
    const { lotNumber } = req.query;
    const lot = lotNumber
      ? (d.lots || []).find(l => l.lotNumber === lotNumber || l.centralLotId === lotNumber)
      : null;
    const gradingRule = (d.grading_rules || []).find(r => r.active) || null;
    res.json({
      success: true, lot: lot || null, gradingRule,
      weights: { vision: 0.50, sensor: 0.30, aiConfidence: 0.20 },
      gradeThresholds: { GRADE_A: GRADE_A_MIN, URS: URS_MIN },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load fusion context' });
  }
});

/* POST /api/fusion/calculate */
router.post('/calculate', requireAuth(), (req, res) => {
  try {
    const { vision = {}, gas = {}, environment = {}, forceDegraded = false } = req.body || {};

    const visionScore = vision.visionScore ?? 0;
    const visionConf  = vision.confidence  ?? 0;
    const gasScore    = gas.gasScore       ?? 0;
    const gasConf     = gas.confidence     ?? 0;
    const envScore    = environment.environmentScore ?? 88;

    const hasVision = visionScore > 0;
    const hasIoT    = gasScore    > 0;

    let finalScore, confidence;
    if (hasVision && hasIoT) {
      finalScore = (visionScore * 0.50) + (gasScore * 0.30) + (envScore * 0.20);
      confidence = (visionConf * 0.60) + (gasConf * 0.40);
    } else if (hasVision) {
      finalScore = (visionScore * 0.70) + (envScore * 0.30);
      confidence = visionConf;
    } else if (hasIoT) {
      finalScore = (gasScore * 0.70) + (envScore * 0.30);
      confidence = gasConf;
    } else {
      finalScore = 0; confidence = 0;
    }

    if (forceDegraded) finalScore = Math.min(finalScore, 79.9);
    finalScore = parseFloat(finalScore.toFixed(2));

    const counts = vision.counts || {};
    const total  = vision.total  || 0;
    const defectCount = (counts.damaged||0)+(counts.rotten||0)+(counts.sprouted||0)+(counts.undersized||0);
    const defectPct = total > 0 ? (defectCount / total) * 100 : 0;

    const grade     = determineGrade(finalScore);
    const riskLevel = determineRiskLevel(finalScore, defectPct);

    const gradeAPercentage   = total > 0 ? parseFloat(((counts.healthy||0)/total*100).toFixed(2)) : null;
    const ursPercentage      = total > 0 ? parseFloat((((counts.damaged||0)+(counts.sprouted||0))/total*100).toFixed(2)) : null;
    const rejectedPercentage = total > 0 ? parseFloat((((counts.rotten||0)+(counts.undersized||0))/total*100).toFixed(2)) : null;

    const reasons = [];
    if (hasVision) {
      const hp = total > 0 ? ((counts.healthy||0)/total*100).toFixed(1) : '0.0';
      reasons.push(`Visual analysis: ${hp}% healthy onions detected from ${total} samples`);
      if (defectPct > 15) reasons.push(`Defect level ${defectPct.toFixed(1)}% exceeds Grade A threshold`);
    }
    if (hasIoT) reasons.push(`IoT sensor score: ${gasScore}/100 — ${gas.stage||'LOW'} spoilage gas stage`);
    if (!hasVision || !hasIoT) reasons.push('Single-source assessment (only partial evidence available)');

    const officerExplanation =
      grade === 'GRADE_A' ? 'Onion lot meets premium export quality standards.' :
      grade === 'URS'     ? 'Lot meets Uniform Reference Standard but shows some quality concerns.' :
                            'Lot does not meet minimum quality standards and is recommended for rejection.';

    const earlySpoilageAlert = hasVision && hasIoT && visionScore >= 75 && gasScore < 60;

    res.json({
      grade, finalScore, qualityScore: finalScore,
      visionScore:      hasVision ? parseFloat(visionScore.toFixed(2)) : null,
      visionConfidence: hasVision ? parseFloat(visionConf.toFixed(4))  : null,
      gasScore:         hasIoT   ? parseFloat(gasScore.toFixed(2))    : null,
      sensorScore:      hasIoT   ? parseFloat(gasScore.toFixed(2))    : null,
      gasConfidence:    hasIoT   ? parseFloat(gasConf.toFixed(4))     : null,
      confidence: parseFloat(confidence.toFixed(4)),
      riskLevel, spoilageRisk: riskLevel,
      gradeAPercentage, ursPercentage, rejectedPercentage,
      earlySpoilageAlert, reasons, officerExplanation,
      counts: vision.counts || null, total,
      calculatedAt: db.nowISO(),
    });
  } catch (err) {
    console.error('fusion/calculate error:', err);
    res.status(500).json({ error: 'Failed to calculate fusion score' });
  }
});

/* POST /api/fusion/commit */
router.post('/commit', requireAuth(), (req, res) => {
  try {
    const d = db.get();
    const { inspectionId, fusionResult } = req.body || {};

    if (!inspectionId) return res.status(400).json({ error: 'inspectionId is required' });
    if (!fusionResult)  return res.status(400).json({ error: 'fusionResult is required' });

    const inspection = (d.inspections || []).find(i => i.id === inspectionId);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });

    d.fusionResults = (d.fusionResults || []).filter(f => f.inspectionId !== inspectionId);

    const persistedAt = db.nowISO();
    const record = {
      id: db.id('fus'),
      inspectionId,
      ...fusionResult,
      persistedAt,
      committedBy: req.user ? req.user.id : null,
      createdAt: persistedAt,
    };
    d.fusionResults.push(record);

    inspection.qualityScore       = fusionResult.finalScore       ?? fusionResult.qualityScore ?? null;
    inspection.visualScore        = fusionResult.visionScore      ?? null;
    inspection.sensorScore        = fusionResult.gasScore         ?? fusionResult.sensorScore  ?? null;
    inspection.grade              = fusionResult.grade            ?? null;
    inspection.riskLevel          = fusionResult.riskLevel        ?? null;
    inspection.gradeAPercentage   = fusionResult.gradeAPercentage ?? null;
    inspection.ursPercentage      = fusionResult.ursPercentage    ?? null;
    inspection.rejectedPercentage = fusionResult.rejectedPercentage ?? null;
    inspection.aiConfidence       = fusionResult.confidence       ?? inspection.aiConfidence;

    const postFusion = ['FUSION_COMPLETED','GRADE_ASSIGNED','CERTIFICATE_GENERATED','COMPLETED'];
    if (!postFusion.includes(inspection.status)) inspection.status = 'FUSION_COMPLETED';
    inspection.updatedAt = persistedAt;

    db.save();

    res.json({
      success: true,
      recordId: record.id,
      persistedAt,
      grade: inspection.grade,
      score: inspection.qualityScore,
      message: `Fusion committed. Grade: ${inspection.grade}, Score: ${inspection.qualityScore}/100`,
    });
  } catch (err) {
    console.error('fusion/commit error:', err);
    res.status(500).json({ error: 'Failed to commit fusion result' });
  }
});

module.exports = router;
