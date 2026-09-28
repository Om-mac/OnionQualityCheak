/**
 * OnionSure — Flat Certificates API
 *
 * The frontend calls:
 *   POST /api/certificates/generate
 *   GET  /api/certificates
 *   GET  /api/certificates/:id
 */

const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const db       = require('./db');
const auth     = require('./auth');

const requireAuth = auth.requireAuth;

function generateCertificateNumber() {
  const d = db.get();
  const year = new Date().getFullYear();
  const prefix = `CERT-ON-${year}-`;
  d.qualityCertificates = d.qualityCertificates || [];
  const maxNum = d.qualityCertificates
    .filter(c => c.certificateNumber && c.certificateNumber.startsWith(prefix))
    .reduce((max, c) => {
      const parts = String(c.certificateNumber).split('-');
      const num = parseInt(parts[parts.length - 1]);
      return Number.isFinite(num) && num > max ? num : max;
    }, 0);
  return `${prefix}${String(maxNum + 1).padStart(6, '0')}`;
}

/* POST /api/certificates/generate */
router.post('/generate', requireAuth(), (req, res) => {
  try {
    const d = db.get();
    const { inspectionId, certifiedBy, remarks } = req.body || {};

    if (!inspectionId) return res.status(400).json({ error: 'inspectionId is required' });

    const inspection = (d.inspections || []).find(i => i.id === inspectionId);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });

    // Must have fusion done
    const readyStatuses = ['FUSION_COMPLETED','GRADE_ASSIGNED','CERTIFICATE_GENERATED','COMPLETED'];
    if (!readyStatuses.includes(inspection.status) && !inspection.grade) {
      return res.status(400).json({
        error: 'Fusion analysis must be completed before generating a certificate.',
        currentStatus: inspection.status,
        hint: 'Run Fusion Intelligence first and commit the result.',
      });
    }

    // Idempotent: return existing cert if already generated
    d.qualityCertificates = d.qualityCertificates || [];
    const existing = d.qualityCertificates.find(c => c.inspectionId === inspectionId);
    if (existing) {
      return res.json({ success: true, certificate: existing, id: existing.id, certificateNumber: existing.certificateNumber });
    }

    const lot = (d.lots || []).find(l => l.id === inspection.lotId)
              || (d.lots || []).find(l => l.lotNumber === inspection.lotNumber);

    const sensorReadings = (d.sensorReadings || []).filter(s => s.inspectionId === inspectionId);
    const images         = (d.images         || []).filter(i => i.inspectionId === inspectionId);
    const aiAnalyses     = (d.aiAnalyses     || []).filter(a => a.inspectionId === inspectionId);
    const fusionResult   = (d.fusionResults  || []).find(f => f.inspectionId === inspectionId);

    const certificateNumber = generateCertificateNumber();
    const verificationCode  = crypto.randomBytes(16).toString('hex').toUpperCase();
    const baseUrl = process.env.PUBLIC_URL || 'https://onionsure.com';
    const qrData  = `${baseUrl}/verify/${certificateNumber}?code=${verificationCode}`;

    const certificate = {
      id: db.id('cert'),
      certificateNumber,
      verificationCode,
      qrData,
      inspectionId,
      inspectionNumber:    inspection.inspectionNumber    || inspection.id,
      lotId:               inspection.lotId               || null,
      lotNumber:           inspection.lotNumber           || (lot && lot.lotNumber) || null,
      centralLotId:        inspection.centralLotId        || (lot && lot.centralLotId) || null,
      farmerId:            inspection.farmerId             || null,
      fpoId:               inspection.fpoId               || null,
      procurementCenterId: inspection.procurementCenterId || inspection.centerId || null,
      crop:                inspection.crop                || null,
      variety:             inspection.variety             || null,
      farmerName:          inspection.farmerName,
      farmerContact:       inspection.farmerContact,
      location:            inspection.location,
      quantity:            inspection.quantity,
      quantityUnit:        inspection.quantityUnit,
      grade:               inspection.grade,
      qualityScore:        inspection.qualityScore,
      visualScore:         inspection.visualScore,
      sensorScore:         inspection.sensorScore,
      riskLevel:           inspection.riskLevel,
      healthyCount:        inspection.healthyCount    || 0,
      damagedCount:        inspection.damagedCount    || 0,
      rottenCount:         inspection.rottenCount     || 0,
      sproutedCount:       inspection.sproutedCount   || 0,
      undersizedCount:     inspection.undersizedCount  || 0,
      totalDetections: (inspection.healthyCount||0)+(inspection.damagedCount||0)+
                       (inspection.rottenCount||0)+(inspection.sproutedCount||0)+
                       (inspection.undersizedCount||0),
      gradeAPercentage:   inspection.gradeAPercentage,
      ursPercentage:      inspection.ursPercentage,
      rejectedPercentage: inspection.rejectedPercentage,
      sensorData: sensorReadings.length > 0 ? {
        temperature: sensorReadings[sensorReadings.length-1].temperature,
        humidity:    sensorReadings[sensorReadings.length-1].humidity,
        moisture:    sensorReadings[sensorReadings.length-1].moisture,
        ph:          sensorReadings[sensorReadings.length-1].ph,
        co2:         sensorReadings[sensorReadings.length-1].co2,
        ch4:         sensorReadings[sensorReadings.length-1].ch4,
        c2h4:        sensorReadings[sensorReadings.length-1].c2h4,
        nh3:         sensorReadings[sensorReadings.length-1].nh3,
        readingCount: sensorReadings.length,
      } : null,
      aiData: aiAnalyses.length > 0 ? {
        modelName:         aiAnalyses[0].modelName,
        modelVersion:      aiAnalyses[0].modelVersion,
        averageConfidence: inspection.aiConfidence,
        imagesAnalyzed:    images.length,
        analysisCount:     aiAnalyses.length,
      } : null,
      fusionData: fusionResult ? {
        weights:      fusionResult.weights,
        calculations: fusionResult.calculations,
      } : null,
      certifiedBy:       certifiedBy || (req.user && req.user.name) || 'Quality Officer',
      certifierId:       req.user ? req.user.id : null,
      certificationDate: db.nowISO(),
      validUntil:        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      remarks:           remarks || null,
      status:            'ACTIVE',
      isRevoked:         false,
      createdAt:         db.nowISO(),
      updatedAt:         db.nowISO(),
    };

    d.qualityCertificates.push(certificate);

    // Also mirror into d.certificates for backward compat with existing screens
    d.certificates = d.certificates || [];
    d.certificates.push(certificate);

    inspection.status            = 'CERTIFICATE_GENERATED';
    inspection.certificateId     = certificate.id;
    inspection.certificateNumber = certificate.certificateNumber;
    inspection.updatedAt         = db.nowISO();

    db.save();

    res.json({
      success: true,
      certificate,
      id:                certificate.id,
      certificateNumber: certificate.certificateNumber,
      message: `Certificate ${certificateNumber} generated successfully`,
    });
  } catch (err) {
    console.error('certificates/generate error:', err);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

/* GET /api/certificates */
router.get('/', requireAuth(), (req, res) => {
  try {
    const d = db.get();
    const certs = [...(d.qualityCertificates || []), ...(d.certificates || [])];
    // Dedupe by id
    const seen = new Set();
    const unique = certs.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
    unique.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(unique);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list certificates' });
  }
});

/* GET /api/certificates/:id */
router.get('/:id', requireAuth(), (req, res) => {
  try {
    const d = db.get();
    const { id } = req.params;
    const all = [...(d.qualityCertificates || []), ...(d.certificates || [])];
    const cert = all.find(c => c.id === id || c.certificateNumber === id);
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });
    res.json({ success: true, certificate: cert, ...cert });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve certificate' });
  }
});

/* GET /api/certificates/:id/pdf — returns JSON stub (no PDF engine) */
router.get('/:id/pdf', requireAuth(), (req, res) => {
  try {
    const d = db.get();
    const { id } = req.params;
    const all = [...(d.qualityCertificates || []), ...(d.certificates || [])];
    const cert = all.find(c => c.id === id || c.certificateNumber === id);
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });
    res.json({ success: true, message: 'PDF generation not available in demo mode', certificate: cert });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve certificate PDF' });
  }
});

module.exports = router;
