/**
 * OnionSure — Fusion Intelligence API Routes
 * Combines sensor data + AI results to calculate final quality score and grade
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('./db');
const auth = require('./auth');

const requireAuth = auth.requireAuth;

// Default fusion weights
const DEFAULT_WEIGHTS = {
  vision: 0.50,      // Visual/AI analysis weight
  sensor: 0.30,      // Sensor data weight
  aiConfidence: 0.20 // AI confidence weight
};

// Grade thresholds
const GRADE_THRESHOLDS = {
  GRADE_A: 85,
  URS: 65,
  REJECTED: 0
};

function logFusionAudit(inspectionId, userId, action, details = {}) {
  const d = db.get();
  const user = d.users.find(u => u.id === userId);
  
  const auditEvent = {
    id: db.id('aud'),
    inspectionId,
    userId,
    userName: user ? user.name : 'Unknown',
    userRole: user ? user.role : null,
    action,
    entityType: 'FUSION',
    entityId: details.fusionId || null,
    oldValue: details.oldValue || null,
    newValue: details.newValue || null,
    metadata: details.metadata || null,
    timestamp: db.nowISO(),
    createdAt: db.nowISO()
  };
  
  d.auditEvents = d.auditEvents || [];
  d.auditEvents.push(auditEvent);
  db.save();
}

function calculateVisualScore(inspection) {
  const total = inspection.healthyCount + inspection.damagedCount + 
                inspection.rottenCount + inspection.sproutedCount + inspection.undersizedCount;
  
  if (total === 0) return 0;
  
  const healthyPercent = (inspection.healthyCount / total) * 100;
  const defectPercent = ((inspection.damagedCount + inspection.rottenCount + 
                          inspection.sproutedCount + inspection.undersizedCount) / total) * 100;
  
  // Score: 100 for 100% healthy, decreasing as defects increase
  const visualScore = Math.max(0, 100 - defectPercent);
  return visualScore;
}

function calculateSensorScore(sensorReadings, thresholds) {
  if (!sensorReadings || sensorReadings.length === 0) return null;
  
  const latest = sensorReadings[sensorReadings.length - 1];
  let penalties = 0;
  let checks = 0;
  
  const checkValue = (value, threshold) => {
    if (value === null || !threshold) return;
    checks++;
    
    if (threshold.critical_min !== undefined && value < threshold.critical_min) penalties += 30;
    else if (threshold.critical_max !== undefined && value > threshold.critical_max) penalties += 30;
    else if (threshold.min !== undefined && value < threshold.min) penalties += 10;
    else if (threshold.max !== undefined && value > threshold.max) penalties += 10;
  };
  
  checkValue(latest.temperature, thresholds.temperature);
  checkValue(latest.humidity, thresholds.humidity);
  checkValue(latest.moisture, thresholds.moisture);
  checkValue(latest.ph, thresholds.ph);
  checkValue(latest.co2, thresholds.co2);
  checkValue(latest.ch4, thresholds.ch4);
  checkValue(latest.c2h4, thresholds.c2h4);
  checkValue(latest.nh3, thresholds.nh3);
  
  if (checks === 0) return null;
  
  const avgPenalty = penalties / checks;
  return Math.max(0, 100 - avgPenalty);
}

function determineGrade(finalScore) {
  if (finalScore >= GRADE_THRESHOLDS.GRADE_A) return 'GRADE_A';
  if (finalScore >= GRADE_THRESHOLDS.URS) return 'URS';
  return 'REJECTED';
}

function determineRiskLevel(finalScore, defectPercent) {
  if (finalScore < 50 || defectPercent > 40) return 'CRITICAL';
  if (finalScore < 70 || defectPercent > 25) return 'HIGH';
  if (finalScore < 85 || defectPercent > 15) return 'MEDIUM';
  return 'LOW';
}

/**
 * POST /api/inspections/:inspectionId/fusion
 * Calculate fusion score and assign grade
 */
router.post('/', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId } = req.params;
    const { weights = DEFAULT_WEIGHTS } = req.body;
    
    const inspection = d.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Check prerequisites
    if (inspection.status !== 'AI_ANALYSIS_COMPLETED') {
      return res.status(400).json({ 
        error: 'Cannot calculate fusion score. AI analysis must be completed first.',
        currentStatus: inspection.status
      });
    }

    // Get sensor readings
    d.sensorReadings = d.sensorReadings || [];
    const sensorReadings = d.sensorReadings.filter(s => s.inspectionId === inspectionId);
    
    // Get grading rule thresholds
    const gradingRule = d.grading_rules ? d.grading_rules.find(r => r.active) : null;
    const thresholds = gradingRule ? gradingRule.sensorThresholds : {};

    // Calculate scores
    const visualScore = calculateVisualScore(inspection);
    const sensorScore = calculateSensorScore(sensorReadings, thresholds);
    const aiConfidence = (inspection.aiConfidence || 0) * 100;

    // Calculate weighted final score
    let finalScore;
    if (sensorScore !== null) {
      finalScore = (visualScore * weights.vision) + 
                   (sensorScore * weights.sensor) + 
                   (aiConfidence * weights.aiConfidence);
    } else {
      // No sensor data - use visual + AI only
      const adjustedWeights = {
        vision: weights.vision / (weights.vision + weights.aiConfidence),
        aiConfidence: weights.aiConfidence / (weights.vision + weights.aiConfidence)
      };
      finalScore = (visualScore * adjustedWeights.vision) + 
                   (aiConfidence * adjustedWeights.aiConfidence);
    }

    const total = inspection.healthyCount + inspection.damagedCount + 
                  inspection.rottenCount + inspection.sproutedCount + inspection.undersizedCount;
    const defectPercent = total > 0 ? 
      ((inspection.damagedCount + inspection.rottenCount + inspection.sproutedCount + inspection.undersizedCount) / total) * 100 : 0;

    const grade = determineGrade(finalScore);
    const riskLevel = determineRiskLevel(finalScore, defectPercent);

    // Calculate percentages
    const gradeAPercent = (inspection.healthyCount / Math.max(total, 1)) * 100;
    const ursPercent = ((inspection.damagedCount + inspection.sproutedCount) / Math.max(total, 1)) * 100;
    const rejectedPercent = ((inspection.rottenCount + inspection.undersizedCount) / Math.max(total, 1)) * 100;

    // Create fusion result
    const fusionResult = {
      id: db.id('fus'),
      inspectionId,
      visualScore: parseFloat(visualScore.toFixed(2)),
      sensorScore: sensorScore ? parseFloat(sensorScore.toFixed(2)) : null,
      aiConfidence: parseFloat(aiConfidence.toFixed(2)),
      finalScore: parseFloat(finalScore.toFixed(2)),
      grade,
      riskLevel,
      weights,
      calculations: {
        totalDetections: total,
        defectPercent: parseFloat(defectPercent.toFixed(2)),
        gradeAPercent: parseFloat(gradeAPercent.toFixed(2)),
        ursPercent: parseFloat(ursPercent.toFixed(2)),
        rejectedPercent: parseFloat(rejectedPercent.toFixed(2))
      },
      createdAt: db.nowISO()
    };

    d.fusionResults = d.fusionResults || [];
    d.fusionResults.push(fusionResult);

    // Update inspection with fusion results
    inspection.visualScore = fusionResult.visualScore;
    inspection.sensorScore = fusionResult.sensorScore;
    inspection.qualityScore = fusionResult.finalScore;
    inspection.grade = grade;
    inspection.riskLevel = riskLevel;
    inspection.gradeAPercentage = fusionResult.calculations.gradeAPercent;
    inspection.ursPercentage = fusionResult.calculations.ursPercent;
    inspection.rejectedPercentage = fusionResult.calculations.rejectedPercent;
    inspection.status = 'FUSION_COMPLETED';
    inspection.updatedAt = db.nowISO();

    db.save();

    logFusionAudit(inspectionId, req.user.id, 'FUSION_CALCULATED', {
      fusionId: fusionResult.id,
      metadata: { finalScore: finalScore.toFixed(2), grade, riskLevel }
    });

    res.json({
      success: true,
      fusion: fusionResult,
      inspection: {
        id: inspection.id,
        inspectionNumber: inspection.inspectionNumber,
        status: inspection.status,
        grade,
        qualityScore: inspection.qualityScore
      },
      message: `Fusion analysis complete. Grade: ${grade}, Quality Score: ${finalScore.toFixed(1)}/100`
    });
  } catch (error) {
    console.error('Fusion calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate fusion score' });
  }
});

/**
 * GET /api/inspections/:inspectionId/fusion
 * Get fusion result
 */
router.get('/', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId } = req.params;
    
    const inspection = d.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    d.fusionResults = d.fusionResults || [];
    const fusion = d.fusionResults.find(f => f.inspectionId === inspectionId);
    
    if (!fusion) {
      return res.status(404).json({ error: 'Fusion result not found' });
    }

    res.json({
      success: true,
      fusion,
      inspection: {
        id: inspection.id,
        inspectionNumber: inspection.inspectionNumber,
        grade: inspection.grade,
        qualityScore: inspection.qualityScore,
        status: inspection.status
      }
    });
  } catch (error) {
    console.error('Get fusion error:', error);
    res.status(500).json({ error: 'Failed to retrieve fusion result' });
  }
});

module.exports = router;
