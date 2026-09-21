/**
 * OnionSure — Unified Inspection Workflow API Routes
 * 
 * Central inspection CRUD operations and workflow management.
 * Every inspection flows through: New Inspection → Sensor → Camera → AI → Fusion → Certificate
 */

const express = require('express');
const router = express.Router();
const db = require('./db');
const auth = require('./auth');
const sensorRoutes = require('./sensor-routes');
const imageRoutes = require('./image-routes');
const aiAnalysisRoutes = require('./ai-analysis-routes');
const fusionRoutes = require('./fusion-routes');
const certificateRoutes = require('./certificate-routes');

const requireAuth = auth.requireAuth;

// Mount sensor routes under /api/inspections/:inspectionId/sensor-readings
router.use('/:inspectionId/sensor-readings', sensorRoutes);

// Mount image routes under /api/inspections/:inspectionId/images
router.use('/:inspectionId/images', imageRoutes);

// Mount AI analysis routes under /api/inspections/:inspectionId/ai-analysis
router.use('/:inspectionId/ai-analysis', aiAnalysisRoutes);

// Mount fusion routes under /api/inspections/:inspectionId/fusion
router.use('/:inspectionId/fusion', fusionRoutes);

// Mount certificate routes under /api/inspections/:inspectionId/certificate
router.use('/:inspectionId/certificate', certificateRoutes);

/**
 * Generate unique inspection number
 * Format: INS-YYYY-NNNNNN
 */
function generateInspectionNumber() {
  const d = db.get();
  const year = new Date().getFullYear();
  const prefix = `INS-${year}-`;
  
  // Find max number for this year
  const maxNum = d.inspections
    .filter(i => i.inspectionNumber && i.inspectionNumber.startsWith(prefix))
    .reduce((max, i) => {
      const num = parseInt(i.inspectionNumber.split('-')[2]);
      return num > max ? num : max;
    }, 0);
  
  return `${prefix}${String(maxNum + 1).padStart(6, '0')}`;
}

/**
 * Log audit event
 */
function logAuditEvent(inspectionId, userId, action, details = {}) {
  const d = db.get();
  const user = d.users.find(u => u.id === userId);
  
  const auditEvent = {
    id: db.id('aud'),
    inspectionId,
    userId,
    userName: user ? user.name : 'Unknown',
    userRole: user ? user.role : null,
    action,
    entityType: 'INSPECTION',
    entityId: inspectionId,
    oldValue: details.oldValue || null,
    newValue: details.newValue || null,
    metadata: details.metadata || null,
    ipAddress: null,
    userAgent: null,
    timestamp: db.nowISO(),
    createdAt: db.nowISO()
  };
  
  d.auditEvents = d.auditEvents || [];
  d.auditEvents.push(auditEvent);
  db.save();
  
  return auditEvent;
}

/* ----------------------------------------------------------------- */
/* INSPECTION CRUD OPERATIONS                                        */
/* ----------------------------------------------------------------- */

/**
 * POST /api/inspections
 * Create new inspection (from New Inspection page)
 * 
 * Request body:
 * - farmerId
 * - farmerName
 * - fpoId
 * - fpoName
 * - centreId
 * - centreName
 * - crop (default: "ONION")
 * - variety
 * - quantity
 * - unit (default: "KG")
 * - officerId (from auth)
 */
router.post('/', requireAuth('procurement_officer', 'admin'), async (req, res) => {
  try {
    const d = db.get();
    const {
      farmerId,
      farmerName,
      farmerContact,
      fpoId,
      fpoName,
      centreId,
      centreName,
      procurementCenterId, // New unified format
      crop = 'ONION',
      variety,
      quantity,
      quantityUnit,
      unit = 'KG',
      lotId,
      lotNumber,
      location
    } = req.body;

    // Support both old and new field names
    const actualCentreId = centreId || procurementCenterId;
    const actualQuantity = quantity;
    const actualUnit = quantityUnit || unit;
    const actualLotNumber = lotId || lotNumber;

    // Validation
    if (!farmerName) {
      return res.status(400).json({ error: 'Farmer name is required' });
    }
    if (!actualCentreId) {
      return res.status(400).json({ error: 'Procurement center is required' });
    }
    if (!actualQuantity || actualQuantity <= 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    // Find or create lot
    let lot;
    if (actualLotNumber) {
      lot = d.lots.find(l => l.lotNumber === actualLotNumber);
    }
    
    if (!lot) {
      // Generate new lot number
      const year = new Date().getFullYear();
      const prefix = `ON-${year}-`;
      const maxLotNum = d.lots
        .filter(l => l.lotNumber && l.lotNumber.startsWith(prefix))
        .reduce((max, l) => {
          const num = parseInt(l.lotNumber.split('-')[2]);
          return num > max ? num : max;
        }, 0);
      
      const newLotNumber = `${prefix}${String(maxLotNum + 1).padStart(5, '0')}`;
      
      lot = {
        id: db.id('lot'),
        lotNumber: newLotNumber,
        centralLotId: newLotNumber,
        farmerId: farmerId || null,
        farmerName: farmerName || null,
        fpoId: fpoId || null,
        centreId: actualCentreId || null,
        // Canonical field used across the app for centre joins.
        procurementCenterId: actualCentreId || null,
        crop,
        variety: variety || null,
        quantity: actualQuantity,
        quantityKg: actualQuantity,
        unit: actualUnit,
        harvestDate: null,
        status: 'registered',
        createdAt: db.nowISO(),
        updatedAt: db.nowISO()
      };
      d.lots.push(lot);
    }

    // Get center name if we have a center
    let centerName = centreName;
    if (!centerName && actualCentreId) {
      const center = d.centers.find(c => c.id === actualCentreId);
      centerName = center ? center.name : 'Unknown Center';
    }

    // Generate inspection number
    const inspectionNumber = generateInspectionNumber();

    // Create inspection record
    const inspection = {
      // The Inspection ID *is* the backbone: use INS-YYYY-NNNNNN as the record
      // id so every module, screen and lookup uses one single identifier.
      id: inspectionNumber,
      inspectionNumber,
      // lotId is the lot's internal id (how every other module joins), and the
      // human-readable ON-YYYY-NNNNN code is carried separately as lotNumber.
      lotId: lot.id,
      lotNumber: lot.lotNumber,
      centralLotId: lot.centralLotId || lot.lotNumber,
      farmerId: farmerId || null,
      farmerName,
      farmerContact: farmerContact || null,
      fpoId: fpoId || null,
      centerId: actualCentreId,
      centerName: centerName || 'Unknown Center',
      procurementCenterId: actualCentreId, // For compatibility
      crop,
      variety: variety || 'Unknown',
      quantity: actualQuantity,
      quantityUnit: actualUnit,
      location: location || 'N/A',
      status: 'LOT_CREATED',
      
      // Initialize counts to 0
      healthyCount: 0,
      damagedCount: 0,
      rottenCount: 0,
      sproutedCount: 0,
      undersizedCount: 0,
      
      // Initialize scores
      visualScore: null,
      sensorScore: null,
      qualityScore: null,
      aiConfidence: null,
      
      // Initialize grade
      grade: null,
      riskLevel: null,
      
      // Initialize percentages
      gradeAPercentage: null,
      ursPercentage: null,
      rejectedPercentage: null,
      
      // Certificate
      certificateId: null,
      certificateNumber: null,
      
      createdAt: db.nowISO(),
      updatedAt: db.nowISO(),
      createdBy: req.user.id,
      officerId: req.user.id
    };
    
    d.inspections.push(inspection);
    db.save();
    
    // Log audit event
    logAuditEvent(inspection.id, req.user.id, 'INSPECTION_CREATED', {
      newValue: { inspectionNumber, lotId: lot.lotNumber, status: 'LOT_CREATED' }
    });
    
    res.json({ inspection, lot, success: true });
  } catch (error) {
    console.error('Failed to create inspection:', error);
    res.status(500).json({ error: error.message || 'Failed to create inspection' });
  }
});

/**
 * GET /api/inspections/:id
 * Get inspection by ID with all related data
 */
router.get('/:id', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const inspection = d.inspections.find(i => i.id === req.params.id);

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Resolve the lot by its internal id, falling back to the lot number.
    const lot = (d.lots || []).find(l => l.id === inspection.lotId)
      || (d.lots || []).find(l => l.lotNumber === inspection.lotNumber || l.lotNumber === inspection.lotId);
    const farmer = (d.farmers || []).find(f => f.id === inspection.farmerId);
    const fpo = (d.fpos || []).find(f => f.id === inspection.fpoId);
    const centre = (d.centers || []).find(c => c.id === inspection.centerId || c.id === inspection.procurementCenterId);
    const officer = (d.users || []).find(u => u.id === inspection.officerId || u.id === inspection.createdBy);

    // Get sensor readings
    const sensorReadings = (d.sensorReadings || []).filter(s => s.inspectionId === inspection.id);
    
    // Get images
    const images = (d.images || []).filter(img => img.inspectionId === inspection.id);
    
    // Get AI analyses
    const aiAnalyses = (d.aiAnalyses || []).filter(a => a.inspectionId === inspection.id);
    
    // Get fusion result
    const fusionResult = (d.fusionResults || []).find(f => f.inspectionId === inspection.id);
    
    // Get certificates
    const certificates = (d.certificates || []).filter(c => c.inspectionId === inspection.id);
    
    // Get audit events
    const auditEvents = (d.auditEvents || []).filter(a => a.inspectionId === inspection.id);

    res.json({
      success: true,
      inspection: {
        ...inspection,
        lot,
        farmer,
        fpo,
        centre,
        officer: officer ? { id: officer.id, name: officer.name, username: officer.username } : null,
        sensorReadings,
        images,
        aiAnalyses,
        fusionResult,
        certificates,
        auditEvents
      }
    });
  } catch (error) {
    console.error('Get inspection error:', error);
    res.status(500).json({ error: 'Failed to retrieve inspection' });
  }
});

/**
 * GET /api/inspections
 * List all inspections with filters
 * Query params:
 * - status
 * - centreId
 * - farmerId
 * - grade
 * - startDate
 * - endDate
 */
router.get('/', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { status, centreId, farmerId, grade, startDate, endDate } = req.query;
    
    let inspections = d.inspections || [];
    
    // Apply filters
    if (status) {
      inspections = inspections.filter(i => i.status === status);
    }
    if (centreId) {
      inspections = inspections.filter(i => i.centreId === centreId);
    }
    if (grade) {
      inspections = inspections.filter(i => i.grade === grade);
    }
    if (startDate) {
      inspections = inspections.filter(i => new Date(i.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      inspections = inspections.filter(i => new Date(i.createdAt) <= new Date(endDate));
    }
    
    // Filter by farmer if provided
    if (farmerId) {
      const farmerLots = d.lots.filter(l => l.farmerId === farmerId).map(l => l.id);
      inspections = inspections.filter(i => farmerLots.includes(i.lotId));
    }
    
    // Sort by creation date (newest first)
    inspections.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Enrich with basic lot/farmer info
    const enriched = inspections.map(inspection => {
      const lot = d.lots.find(l => l.id === inspection.lotId);
      return {
        ...inspection,
        lotNumber: lot ? lot.lotNumber : null
      };
    });

    res.json({
      success: true,
      inspections: enriched,
      total: enriched.length
    });
  } catch (error) {
    console.error('List inspections error:', error);
    res.status(500).json({ error: 'Failed to list inspections' });
  }
});

/**
 * PATCH /api/inspections/:id/status
 * Update inspection status (workflow progression)
 * 
 * Request body:
 * - status: new status (e.g., "SENSOR_COMPLETED", "CAMERA_COMPLETED")
 * - metadata: optional additional data
 */
router.patch('/:id/status', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const inspection = d.inspections.find(i => i.id === req.params.id);
    
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    const { status, metadata } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Validate status transition
    const validStatuses = [
      'DRAFT', 'LOT_CREATED', 'SENSOR_PENDING', 'SENSOR_COMPLETED',
      'CAMERA_PENDING', 'CAMERA_COMPLETED', 'AI_ANALYSIS_PENDING',
      'AI_ANALYSIS_COMPLETED', 'FUSION_PENDING', 'FUSION_COMPLETED',
      'GRADE_ASSIGNED', 'CERTIFICATE_GENERATED', 'COMPLETED', 'DISPUTED', 'CLOSED'
    ];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const oldStatus = inspection.status;
    inspection.status = status;
    inspection.updatedAt = db.nowISO();
    
    // Update completion timestamp if completed
    if (status === 'COMPLETED' && !inspection.completedAt) {
      inspection.completedAt = db.nowISO();
    }
    
    db.save();
    
    // Log audit event
    logAuditEvent(inspection.id, req.user.id, `STATUS_CHANGED_TO_${status}`, {
      oldValue: oldStatus,
      newValue: status,
      metadata
    });

    res.json({
      success: true,
      inspection,
      message: `Inspection status updated to ${status}`
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update inspection status' });
  }
});

/**
 * PUT /api/inspections/:id
 * Update inspection fields
 */
router.put('/:id', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const inspection = d.inspections.find(i => i.id === req.params.id);
    
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Allow updating specific fields
    const updatableFields = [
      'variety', 'quantity', 'unit', 'qualityScore', 'visualScore',
      'sensorScore', 'aiConfidence', 'grade', 'riskLevel',
      'gradeAPercentage', 'ursPercentage', 'rejectedPercentage',
      'healthyCount', 'damagedCount', 'rottenCount', 'sproutedCount',
      'undersizedCount', 'earlySpoilage'
    ];
    
    const updates = {};
    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
        inspection[field] = req.body[field];
      }
    }
    
    inspection.updatedAt = db.nowISO();
    db.save();
    
    // Log audit event
    if (Object.keys(updates).length > 0) {
      logAuditEvent(inspection.id, req.user.id, 'INSPECTION_UPDATED', {
        metadata: { fields: Object.keys(updates) }
      });
    }

    res.json({
      success: true,
      inspection,
      message: 'Inspection updated successfully'
    });
  } catch (error) {
    console.error('Update inspection error:', error);
    res.status(500).json({ error: 'Failed to update inspection' });
  }
});

/**
 * DELETE /api/inspections/:id
 * Delete inspection (admin only, for cleanup)
 */
router.delete('/:id', requireAuth('admin'), async (req, res) => {
  try {
    const d = db.get();
    const index = d.inspections.findIndex(i => i.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    const inspection = d.inspections[index];
    d.inspections.splice(index, 1);
    
    // Clean up related data
    if (d.sensorReadings) {
      d.sensorReadings = d.sensorReadings.filter(s => s.inspectionId !== req.params.id);
    }
    if (d.images) {
      d.images = d.images.filter(img => img.inspectionId !== req.params.id);
    }
    if (d.aiAnalyses) {
      d.aiAnalyses = d.aiAnalyses.filter(a => a.inspectionId !== req.params.id);
    }
    if (d.fusionResults) {
      d.fusionResults = d.fusionResults.filter(f => f.inspectionId !== req.params.id);
    }
    if (d.auditEvents) {
      d.auditEvents = d.auditEvents.filter(a => a.inspectionId !== req.params.id);
    }
    
    db.save();
    
    // Log audit event
    logAuditEvent(null, req.user.id, 'INSPECTION_DELETED', {
      metadata: { inspectionNumber: inspection.inspectionNumber }
    });

    res.json({
      success: true,
      message: 'Inspection deleted successfully'
    });
  } catch (error) {
    console.error('Delete inspection error:', error);
    res.status(500).json({ error: 'Failed to delete inspection' });
  }
});

module.exports = router;
