/**
 * OnionSure — Sensor Data API Routes
 * 
 * Endpoints for saving and retrieving sensor readings for inspections.
 * Supports environmental sensors (temp, humidity, moisture, pH) and gas sensors (CO2, CH4, C2H4, NH3).
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // To access :inspectionId from parent route
const db = require('./db');
const auth = require('./auth');

const requireAuth = auth.requireAuth;

/**
 * Log audit event for sensor actions
 */
function logSensorAudit(inspectionId, userId, action, details = {}) {
  const d = db.get();
  const user = d.users.find(u => u.id === userId);
  
  const auditEvent = {
    id: db.id('aud'),
    inspectionId,
    userId,
    userName: user ? user.name : 'Unknown',
    userRole: user ? user.role : null,
    action,
    entityType: 'SENSOR',
    entityId: details.sensorReadingId || null,
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
/* SENSOR DATA ENDPOINTS                                             */
/* ----------------------------------------------------------------- */

/**
 * POST /api/inspections/:inspectionId/sensor-readings
 * Save sensor readings for an inspection
 * 
 * Request body:
 * {
 *   "temperature": 27.4,     // °C
 *   "humidity": 68.5,        // %
 *   "moisture": 87.2,        // %
 *   "ph": 6.1,               // pH level
 *   "co2": 450,              // ppm
 *   "ch4": 80,               // ppm
 *   "c2h4": 0.8,             // ppm (ethylene - spoilage indicator)
 *   "nh3": 15,               // ppm
 *   "sensorId": "SENSOR-001",
 *   "deviceId": "device_xyz",
 *   "batteryLevel": 85,      // %
 *   "connectivity": "ONLINE"
 * }
 */
router.post('/', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId } = req.params;
    
    // Verify inspection exists
    const inspection = d.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    const {
      temperature,
      humidity,
      moisture,
      ph,
      co2,
      ch4,
      c2h4,
      nh3,
      sensorId,
      deviceId,
      batteryLevel,
      connectivity,
      rawPayload
    } = req.body;

    // Create sensor reading record
    const sensorReading = {
      id: db.id('sen'),
      inspectionId,
      deviceId: deviceId || null,
      timestamp: db.nowISO(),
      
      // Environmental sensors
      temperature: temperature !== undefined ? parseFloat(temperature) : null,
      humidity: humidity !== undefined ? parseFloat(humidity) : null,
      moisture: moisture !== undefined ? parseFloat(moisture) : null,
      ph: ph !== undefined ? parseFloat(ph) : null,
      
      // Gas sensors
      co2: co2 !== undefined ? parseFloat(co2) : null,
      ch4: ch4 !== undefined ? parseFloat(ch4) : null,
      c2h4: c2h4 !== undefined ? parseFloat(c2h4) : null,
      nh3: nh3 !== undefined ? parseFloat(nh3) : null,
      
      // Metadata
      sensorId: sensorId || null,
      batteryLevel: batteryLevel !== undefined ? parseFloat(batteryLevel) : null,
      connectivity: connectivity || 'UNKNOWN',
      
      rawPayload: rawPayload || null,
      createdAt: db.nowISO()
    };

    d.sensorReadings = d.sensorReadings || [];
    d.sensorReadings.push(sensorReading);
    
    // Update inspection status if this is first sensor reading
    const existingReadings = d.sensorReadings.filter(s => s.inspectionId === inspectionId);
    if (existingReadings.length === 1 && inspection.status === 'LOT_CREATED') {
      inspection.status = 'SENSOR_PENDING';
      inspection.updatedAt = db.nowISO();
    }
    
    db.save();
    
    // Log audit event
    logSensorAudit(inspectionId, req.user.id, 'SENSOR_DATA_SAVED', {
      sensorReadingId: sensorReading.id,
      metadata: {
        sensorId,
        temperature,
        humidity,
        connectivity
      }
    });

    res.status(201).json({
      success: true,
      sensorReading,
      message: 'Sensor data saved successfully'
    });
  } catch (error) {
    console.error('Save sensor reading error:', error);
    res.status(500).json({ error: 'Failed to save sensor data' });
  }
});

/**
 * GET /api/inspections/:inspectionId/sensor-readings
 * Get all sensor readings for an inspection
 */
router.get('/', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId } = req.params;
    
    // Verify inspection exists
    const inspection = d.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Get all sensor readings for this inspection
    d.sensorReadings = d.sensorReadings || [];
    const readings = d.sensorReadings
      .filter(s => s.inspectionId === inspectionId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first

    // Calculate statistics
    const stats = {
      totalReadings: readings.length,
      latestReading: readings[0] || null,
      averages: null
    };

    if (readings.length > 0) {
      const sum = (arr) => arr.reduce((a, b) => a + b, 0);
      const avg = (arr) => arr.length > 0 ? sum(arr) / arr.length : null;
      
      const temps = readings.map(r => r.temperature).filter(v => v !== null);
      const humidities = readings.map(r => r.humidity).filter(v => v !== null);
      const moistures = readings.map(r => r.moisture).filter(v => v !== null);
      const phs = readings.map(r => r.ph).filter(v => v !== null);
      const co2s = readings.map(r => r.co2).filter(v => v !== null);
      const ch4s = readings.map(r => r.ch4).filter(v => v !== null);
      const c2h4s = readings.map(r => r.c2h4).filter(v => v !== null);
      const nh3s = readings.map(r => r.nh3).filter(v => v !== null);
      
      stats.averages = {
        temperature: avg(temps),
        humidity: avg(humidities),
        moisture: avg(moistures),
        ph: avg(phs),
        co2: avg(co2s),
        ch4: avg(ch4s),
        c2h4: avg(c2h4s),
        nh3: avg(nh3s)
      };
    }

    res.json({
      success: true,
      readings,
      statistics: stats
    });
  } catch (error) {
    console.error('Get sensor readings error:', error);
    res.status(500).json({ error: 'Failed to retrieve sensor data' });
  }
});

/**
 * GET /api/inspections/:inspectionId/sensor-readings/latest
 * Get the most recent sensor reading
 */
router.get('/latest', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId } = req.params;
    
    // Verify inspection exists
    const inspection = d.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    d.sensorReadings = d.sensorReadings || [];
    const readings = d.sensorReadings
      .filter(s => s.inspectionId === inspectionId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const latest = readings[0] || null;

    if (!latest) {
      return res.status(404).json({ error: 'No sensor readings found for this inspection' });
    }

    res.json({
      success: true,
      sensorReading: latest
    });
  } catch (error) {
    console.error('Get latest sensor reading error:', error);
    res.status(500).json({ error: 'Failed to retrieve latest sensor data' });
  }
});

/**
 * POST /api/inspections/:inspectionId/sensor-readings/complete
 * Mark sensor data collection as complete
 * Updates inspection status to SENSOR_COMPLETED
 */
router.post('/complete', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId } = req.params;
    
    // Verify inspection exists
    const inspection = d.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Check if there are any sensor readings
    d.sensorReadings = d.sensorReadings || [];
    const readings = d.sensorReadings.filter(s => s.inspectionId === inspectionId);
    
    if (readings.length === 0) {
      return res.status(400).json({ error: 'No sensor data recorded yet' });
    }

    // Update inspection status
    const oldStatus = inspection.status;
    inspection.status = 'SENSOR_COMPLETED';
    inspection.updatedAt = db.nowISO();
    
    db.save();
    
    // Log audit event
    logSensorAudit(inspectionId, req.user.id, 'SENSOR_COLLECTION_COMPLETED', {
      oldValue: oldStatus,
      newValue: 'SENSOR_COMPLETED',
      metadata: { totalReadings: readings.length }
    });

    res.json({
      success: true,
      inspection,
      message: `Sensor data collection completed. ${readings.length} readings recorded.`
    });
  } catch (error) {
    console.error('Complete sensor collection error:', error);
    res.status(500).json({ error: 'Failed to complete sensor data collection' });
  }
});

/**
 * DELETE /api/inspections/:inspectionId/sensor-readings/:readingId
 * Delete a specific sensor reading (admin/officer only)
 */
router.delete('/:readingId', requireAuth('procurement_officer', 'admin'), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId, readingId } = req.params;
    
    d.sensorReadings = d.sensorReadings || [];
    const index = d.sensorReadings.findIndex(s => s.id === readingId && s.inspectionId === inspectionId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Sensor reading not found' });
    }

    const deleted = d.sensorReadings[index];
    d.sensorReadings.splice(index, 1);
    db.save();
    
    // Log audit event
    logSensorAudit(inspectionId, req.user.id, 'SENSOR_DATA_DELETED', {
      sensorReadingId: readingId,
      metadata: { timestamp: deleted.timestamp }
    });

    res.json({
      success: true,
      message: 'Sensor reading deleted successfully'
    });
  } catch (error) {
    console.error('Delete sensor reading error:', error);
    res.status(500).json({ error: 'Failed to delete sensor reading' });
  }
});

/**
 * GET /api/inspections/:inspectionId/sensor-readings/analysis
 * Get sensor analysis and status check
 * Returns whether sensor values are within normal/critical ranges
 */
router.get('/analysis', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId } = req.params;
    
    // Verify inspection exists
    const inspection = d.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Get grading rules for thresholds
    const gradingRule = d.grading_rules ? d.grading_rules.find(r => r.active) : null;
    const thresholds = gradingRule ? gradingRule.sensorThresholds : {};

    // Get latest sensor reading
    d.sensorReadings = d.sensorReadings || [];
    const readings = d.sensorReadings
      .filter(s => s.inspectionId === inspectionId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (readings.length === 0) {
      return res.status(404).json({ error: 'No sensor readings found' });
    }

    const latest = readings[0];
    
    // Analyze each sensor value
    const checkValue = (value, threshold) => {
      if (value === null || !threshold) return { status: 'UNKNOWN', message: 'No data' };
      
      if (threshold.critical_min !== undefined && value < threshold.critical_min) {
        return { status: 'CRITICAL_LOW', message: `Critical: Below ${threshold.critical_min}${threshold.unit}` };
      }
      if (threshold.critical_max !== undefined && value > threshold.critical_max) {
        return { status: 'CRITICAL_HIGH', message: `Critical: Above ${threshold.critical_max}${threshold.unit}` };
      }
      if (threshold.min !== undefined && value < threshold.min) {
        return { status: 'WARNING_LOW', message: `Warning: Below ${threshold.min}${threshold.unit}` };
      }
      if (threshold.max !== undefined && value > threshold.max) {
        return { status: 'WARNING_HIGH', message: `Warning: Above ${threshold.max}${threshold.unit}` };
      }
      return { status: 'NORMAL', message: 'Within normal range' };
    };

    const analysis = {
      temperature: { value: latest.temperature, ...checkValue(latest.temperature, thresholds.temperature) },
      humidity: { value: latest.humidity, ...checkValue(latest.humidity, thresholds.humidity) },
      moisture: { value: latest.moisture, ...checkValue(latest.moisture, thresholds.moisture) },
      ph: { value: latest.ph, ...checkValue(latest.ph, thresholds.ph) },
      co2: { value: latest.co2, ...checkValue(latest.co2, thresholds.co2) },
      ch4: { value: latest.ch4, ...checkValue(latest.ch4, thresholds.ch4) },
      c2h4: { value: latest.c2h4, ...checkValue(latest.c2h4, thresholds.c2h4) },
      nh3: { value: latest.nh3, ...checkValue(latest.nh3, thresholds.nh3) }
    };

    // Overall status
    const statuses = Object.values(analysis).map(a => a.status);
    const overallStatus = statuses.includes('CRITICAL_LOW') || statuses.includes('CRITICAL_HIGH') ? 'CRITICAL' :
                          statuses.includes('WARNING_LOW') || statuses.includes('WARNING_HIGH') ? 'WARNING' :
                          'NORMAL';

    res.json({
      success: true,
      analysis,
      overallStatus,
      timestamp: latest.timestamp,
      readingId: latest.id
    });
  } catch (error) {
    console.error('Sensor analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze sensor data' });
  }
});

module.exports = router;
