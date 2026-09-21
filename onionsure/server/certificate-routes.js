/**
 * OnionSure — Quality Certificate Generation API Routes
 * Generates quality certificates with QR codes for verification
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('./db');
const auth = require('./auth');
const crypto = require('crypto');

const requireAuth = auth.requireAuth;

function logCertificateAudit(inspectionId, userId, action, details = {}) {
  const d = db.get();
  const user = d.users.find(u => u.id === userId);
  
  const auditEvent = {
    id: db.id('aud'),
    inspectionId,
    userId,
    userName: user ? user.name : 'Unknown',
    userRole: user ? user.role : null,
    action,
    entityType: 'CERTIFICATE',
    entityId: details.certificateId || null,
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

function generateCertificateNumber() {
  const d = db.get();
  const year = new Date().getFullYear();
  // Spec format: CERT-ON-YYYY-NNNNNN (kept identical to the certificate
  // numbers issued by the main API so both flows share one numbering scheme).
  const prefix = `CERT-ON-${year}-`;

  d.qualityCertificates = d.qualityCertificates || [];
  const maxNum = d.qualityCertificates
    .filter(c => c.certificateNumber && c.certificateNumber.startsWith(prefix))
    .reduce((max, c) => {
      // Parse the trailing sequence regardless of how many "-ON-" parts exist.
      const parts = String(c.certificateNumber).split('-');
      const num = parseInt(parts[parts.length - 1]);
      return Number.isFinite(num) && num > max ? num : max;
    }, 0);

  return `${prefix}${String(maxNum + 1).padStart(6, '0')}`;
}

function generateVerificationCode() {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

function generateQRData(certificateNumber, verificationCode) {
  // QR code contains URL for public verification
  const baseUrl = process.env.PUBLIC_URL || 'https://onionsure.com';
  return `${baseUrl}/verify/${certificateNumber}?code=${verificationCode}`;
}

/**
 * POST /api/inspections/:inspectionId/certificate
 * Generate quality certificate
 */
router.post('/', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId } = req.params;
    const { certifiedBy, remarks } = req.body;
    
    const inspection = d.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Check prerequisites
    if (inspection.status !== 'FUSION_COMPLETED') {
      return res.status(400).json({ 
        error: 'Cannot generate certificate. Fusion analysis must be completed first.',
        currentStatus: inspection.status
      });
    }

    // Check if certificate already exists
    d.qualityCertificates = d.qualityCertificates || [];
    const existingCert = d.qualityCertificates.find(c => c.inspectionId === inspectionId);
    if (existingCert) {
      return res.status(400).json({ 
        error: 'Certificate already exists for this inspection',
        certificate: existingCert
      });
    }

    // Get all related data
    d.sensorReadings = d.sensorReadings || [];
    d.images = d.images || [];
    d.aiAnalyses = d.aiAnalyses || [];
    d.fusionResults = d.fusionResults || [];
    
    const sensorReadings = d.sensorReadings.filter(s => s.inspectionId === inspectionId);
    const images = d.images.filter(img => img.inspectionId === inspectionId);
    const aiAnalyses = d.aiAnalyses.filter(ai => ai.inspectionId === inspectionId);
    const fusionResult = d.fusionResults.find(f => f.inspectionId === inspectionId);
    // Resolve the lot so the certificate can carry the full chain.
    const lot = (d.lots || []).find(l => l.id === inspection.lotId)
      || (d.lots || []).find(l => l.lotNumber === inspection.lotNumber);

    // Generate certificate
    const certificateNumber = generateCertificateNumber();
    const verificationCode = generateVerificationCode();
    const qrData = generateQRData(certificateNumber, verificationCode);

    const certificate = {
      id: db.id('cert'),
      certificateNumber,
      verificationCode,
      qrData,
      inspectionId,
      inspectionNumber: inspection.inspectionNumber,
      
      // Basic info — full Inspection-ID → Lot → Farmer chain so QR
      // verification and the farmer/buyer screens need no second lookup.
      lotId: inspection.lotId,
      lotNumber: inspection.lotNumber || (lot && lot.lotNumber) || null,
      centralLotId: inspection.centralLotId || (lot && lot.centralLotId) || inspection.lotNumber || null,
      farmerId: inspection.farmerId || null,
      fpoId: inspection.fpoId || null,
      procurementCenterId: inspection.procurementCenterId || inspection.centerId || null,
      crop: inspection.crop || null,
      variety: inspection.variety || null,
      farmerName: inspection.farmerName,
      farmerContact: inspection.farmerContact,
      location: inspection.location,
      quantity: inspection.quantity,
      quantityUnit: inspection.quantityUnit,
      
      // Results
      grade: inspection.grade,
      qualityScore: inspection.qualityScore,
      visualScore: inspection.visualScore,
      sensorScore: inspection.sensorScore,
      riskLevel: inspection.riskLevel,
      
      // Detection summary
      healthyCount: inspection.healthyCount,
      damagedCount: inspection.damagedCount,
      rottenCount: inspection.rottenCount,
      sproutedCount: inspection.sproutedCount,
      undersizedCount: inspection.undersizedCount,
      totalDetections: inspection.healthyCount + inspection.damagedCount + 
                       inspection.rottenCount + inspection.sproutedCount + inspection.undersizedCount,
      
      // Percentages
      gradeAPercentage: inspection.gradeAPercentage,
      ursPercentage: inspection.ursPercentage,
      rejectedPercentage: inspection.rejectedPercentage,
      
      // Sensor summary (latest reading)
      sensorData: sensorReadings.length > 0 ? {
        temperature: sensorReadings[sensorReadings.length - 1].temperature,
        humidity: sensorReadings[sensorReadings.length - 1].humidity,
        moisture: sensorReadings[sensorReadings.length - 1].moisture,
        ph: sensorReadings[sensorReadings.length - 1].ph,
        co2: sensorReadings[sensorReadings.length - 1].co2,
        ch4: sensorReadings[sensorReadings.length - 1].ch4,
        c2h4: sensorReadings[sensorReadings.length - 1].c2h4,
        nh3: sensorReadings[sensorReadings.length - 1].nh3,
        readingCount: sensorReadings.length
      } : null,
      
      // AI summary
      aiData: aiAnalyses.length > 0 ? {
        modelName: aiAnalyses[0].modelName,
        modelVersion: aiAnalyses[0].modelVersion,
        averageConfidence: inspection.aiConfidence,
        imagesAnalyzed: images.length,
        analysisCount: aiAnalyses.length
      } : null,
      
      // Fusion data
      fusionData: fusionResult ? {
        weights: fusionResult.weights,
        calculations: fusionResult.calculations
      } : null,
      
      // Certification
      certifiedBy: certifiedBy || req.user.name,
      certifierId: req.user.id,
      certificationDate: db.nowISO(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      remarks: remarks || null,
      
      // Status
      status: 'ACTIVE',
      isRevoked: false,
      
      createdAt: db.nowISO(),
      updatedAt: db.nowISO()
    };

    d.qualityCertificates.push(certificate);

    // Update inspection status
    inspection.status = 'CERTIFICATE_GENERATED';
    inspection.certificateId = certificate.id;
    inspection.certificateNumber = certificate.certificateNumber;
    inspection.updatedAt = db.nowISO();

    db.save();

    logCertificateAudit(inspectionId, req.user.id, 'CERTIFICATE_GENERATED', {
      certificateId: certificate.id,
      metadata: { 
        certificateNumber, 
        grade: inspection.grade, 
        qualityScore: inspection.qualityScore 
      }
    });

    res.json({
      success: true,
      certificate,
      message: `Quality certificate ${certificateNumber} generated successfully`
    });
  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

/**
 * GET /api/inspections/:inspectionId/certificate
 * Get certificate for inspection
 */
router.get('/', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId } = req.params;
    
    const inspection = d.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    d.qualityCertificates = d.qualityCertificates || [];
    const certificate = d.qualityCertificates.find(c => c.inspectionId === inspectionId);
    
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({
      success: true,
      certificate
    });
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ error: 'Failed to retrieve certificate' });
  }
});

/**
 * GET /api/certificates/:certificateNumber/verify
 * Public verification endpoint (no auth required)
 */
router.get('/verify/:certificateNumber', async (req, res) => {
  try {
    const d = db.get();
    const { certificateNumber } = req.params;
    const { code } = req.query;
    
    d.qualityCertificates = d.qualityCertificates || [];
    const certificate = d.qualityCertificates.find(c => c.certificateNumber === certificateNumber);
    
    if (!certificate) {
      return res.status(404).json({ 
        valid: false,
        error: 'Certificate not found' 
      });
    }

    // Verify code if provided
    if (code && code !== certificate.verificationCode) {
      return res.status(400).json({ 
        valid: false,
        error: 'Invalid verification code' 
      });
    }

    // Check if revoked
    if (certificate.isRevoked) {
      return res.json({
        valid: false,
        revoked: true,
        error: 'Certificate has been revoked',
        certificateNumber: certificate.certificateNumber,
        revocationReason: certificate.revocationReason
      });
    }

    // Check expiry
    const isExpired = new Date(certificate.validUntil) < new Date();
    
    res.json({
      valid: !isExpired,
      expired: isExpired,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        inspectionNumber: certificate.inspectionNumber,
        grade: certificate.grade,
        qualityScore: certificate.qualityScore,
        certificationDate: certificate.certificationDate,
        validUntil: certificate.validUntil,
        farmerName: certificate.farmerName,
        location: certificate.location,
        quantity: certificate.quantity,
        quantityUnit: certificate.quantityUnit
      }
    });
  } catch (error) {
    console.error('Certificate verification error:', error);
    res.status(500).json({ 
      valid: false,
      error: 'Verification failed' 
    });
  }
});

/**
 * PATCH /api/inspections/:inspectionId/certificate/revoke
 * Revoke a certificate
 */
router.patch('/revoke', requireAuth(['ADMIN', 'QUALITY_INSPECTOR']), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId } = req.params;
    const { reason } = req.body;
    
    const inspection = d.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    d.qualityCertificates = d.qualityCertificates || [];
    const certificate = d.qualityCertificates.find(c => c.inspectionId === inspectionId);
    
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    if (certificate.isRevoked) {
      return res.status(400).json({ error: 'Certificate is already revoked' });
    }

    certificate.isRevoked = true;
    certificate.revokedBy = req.user.id;
    certificate.revokedByName = req.user.name;
    certificate.revocationDate = db.nowISO();
    certificate.revocationReason = reason || 'No reason provided';
    certificate.status = 'REVOKED';
    certificate.updatedAt = db.nowISO();

    db.save();

    logCertificateAudit(inspectionId, req.user.id, 'CERTIFICATE_REVOKED', {
      certificateId: certificate.id,
      metadata: { reason }
    });

    res.json({
      success: true,
      certificate,
      message: 'Certificate revoked successfully'
    });
  } catch (error) {
    console.error('Certificate revocation error:', error);
    res.status(500).json({ error: 'Failed to revoke certificate' });
  }
});

module.exports = router;
