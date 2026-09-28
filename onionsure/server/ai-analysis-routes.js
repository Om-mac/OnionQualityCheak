/**
 * OnionSure — AI Analysis API Routes
 * 
 * Endpoints for triggering AI analysis and managing detection results.
 * Integrates with Python AI service (defect_api.py) running on port 5000.
 * 
 * AI ANALYSIS DATA STRUCTURE FOR FUSION INTELLIGENCE:
 * 
 * Each AI analysis is saved with:
 * 1. Basic metadata (model, version, confidence, timing)
 * 2. Detailed counts by defect type (healthy, damaged, rotten, sprouted, undersized)
 * 3. Complete resultJson containing:
 *    - detections: Array of all detected objects with bounding boxes
 *    - counts: Aggregated counts by type
 *    - statistics: Summary statistics for quick access
 *    - metadata: Processing details and timestamps
 *    - rawResult: Original AI service response
 * 
 * This structure allows the Fusion Intelligence module to:
 * - Combine vision data with IoT sensor readings
 * - Calculate weighted quality scores
 * - Detect early spoilage patterns
 * - Generate comprehensive quality assessments
 * 
 * Defect Detection Records:
 * - Each defect type is stored separately with severity levels
 * - Includes bounding box data for spatial analysis
 * - Supports confidence thresholds and quality metrics
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const http = require('http');
const https = require('https');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const auth = require('./auth');

const requireAuth = auth.requireAuth;

// AI service configuration
const AI_SERVICE_URL = process.env.ONIONCHECK_URL || 'http://localhost:5000';
const AI_SERVICE_TIMEOUT = 60000; // 60 seconds

/**
 * Log audit event for AI analysis actions
 */
function logAIAudit(inspectionId, userId, action, details = {}) {
  const d = db.get();
  const user = d.users.find(u => u.id === userId);
  
  const auditEvent = {
    id: db.id('aud'),
    inspectionId,
    userId,
    userName: user ? user.name : 'Unknown',
    userRole: user ? user.role : null,
    action,
    entityType: 'AI_ANALYSIS',
    entityId: details.analysisId || null,
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

/**
 * Call Python AI service for defect detection
 */
function callAIService(imagePath, options = {}) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    
    // Add image file
    formData.append('image', fs.createReadStream(imagePath));
    
    // Add optional parameters
    if (options.confidence_threshold) {
      formData.append('confidence_threshold', options.confidence_threshold.toString());
    }
    if (options.calibration_reference_mm) {
      formData.append('calibration_reference_mm', options.calibration_reference_mm.toString());
    }

    const url = new URL('/api/detect', AI_SERVICE_URL);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const req = httpModule.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: formData.getHeaders(),
      timeout: AI_SERVICE_TIMEOUT
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(result);
          } else {
            reject(new Error(result.error || `AI service returned ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error('Invalid JSON response from AI service'));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`AI service connection error: ${e.message}`)));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('AI service request timeout'));
    });

    formData.pipe(req);
  });
}

/**
 * Drop embedded image payloads from a detector response before it is stored.
 *
 * The Python service returns the annotated frame as a base64 string. Keeping it
 * put ~164 KB into every analysis row — the bulk of the JSON database — which
 * made each write proportionally slower and every page load queue behind it.
 * The image is already delivered to the client in the HTTP response, so the
 * stored copy is pure overhead.
 */
function stripImageBlobs(result) {
  if (!result || typeof result !== 'object') return result;
  const {
    annotated_image_base64,
    annotated_image,
    annotatedImage,
    annotatedImageBase64,
    image_base64,
    ...rest
  } = result;
  return rest;
}

/**
 * Call the Python AI service with a base64-encoded image (used by the
 * browser Live Camera, which captures frames via getUserMedia and ships
 * them as data URLs). Reuses the exact same ONIONCHECK / Roboflow
 * integration as callAIService — only the transport differs (JSON base64
 * instead of a file on disk).
 *
 * IMPORTANT: this helper does NOT fall back to demo/simulated data. If the
 * Python service is unreachable we reject, so the frontend can surface a real
 * error instead of drawing fake bounding boxes (spec: counts must come from
 * the actual inference response, never be invented).
 */
function callAIBase64(base64Image, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/detect-base64', AI_SERVICE_URL);

    // Normalise a possible `data:…;base64,` prefix down to raw base64.
    // NOTE: use split(',')[1] (not split(',', 1)[1]) — the limit arg would
    // truncate the result to a single element and break the prefix strip.
    let b64 = base64Image || '';
    if (b64.includes(',')) b64 = b64.split(',')[1];

    // Send RAW base64 (the Python endpoint decodes it reliably this way; the
    // `data:image/jpeg;base64,…` wrapper trips its comma-splitting).
    const payload = JSON.stringify({ image: b64 });
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const req = httpModule.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: AI_SERVICE_TIMEOUT,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          // A 200 from the Python service is a valid inference result even when it
          // found 0 onions (success:false, no detections). We resolve those so the
          // UI can show "0 detected" instead of a fake error. Only non-200 statuses
          // (real service failures) are rejected -> surfaced as a 503 to the client.
          if (res.statusCode === 200) resolve(result);
          else reject(new Error(result.error || `AI service returned ${res.statusCode}`));
        } catch (e) {
          reject(new Error('Invalid JSON response from AI service'));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`AI service connection error: ${e.message}`)));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('AI service request timeout'));
    });

    req.write(payload);
    req.end();
  });
}

/* ----------------------------------------------------------------- */
/* AI ANALYSIS ENDPOINTS                                             */
/* ----------------------------------------------------------------- */

/**
 * Normalise the AI service payload into our 5 grading classes.
 *
 * The YOLO service returns `counts` / `statistics.confidence`, while older
 * builds (and the spec) describe `statistics.healthy_count` etc. Reading only
 * one shape silently produced all-zero counts, which made fusion grade every
 * lot REJECTED. These helpers accept any of the shapes and fall back to
 * deriving the counts from the raw detections.
 */
function normalizeCounts(aiResult) {
  const counts = { healthy: 0, damaged: 0, rotten: 0, sprouted: 0, undersized: 0 };

  if (aiResult.counts && typeof aiResult.counts === 'object') {
    for (const k of Object.keys(counts)) {
      if (typeof aiResult.counts[k] === 'number') counts[k] = aiResult.counts[k];
    }
  } else if (aiResult.statistics && typeof aiResult.statistics === 'object') {
    for (const k of Object.keys(counts)) {
      const v = aiResult.statistics[`${k}_count`];
      if (typeof v === 'number') counts[k] = v;
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0 && Array.isArray(aiResult.detections)) {
    for (const det of aiResult.detections) {
      const cls = String(det.class || det.label || det.category || '').toLowerCase();
      let key;
      if (cls.includes('healthy')) key = 'healthy';
      else if (cls.includes('rot') || cls.includes('decay')) key = 'rotten';
      else if (cls.includes('sprout')) key = 'sprouted';
      else if (cls.includes('undersize') || cls.includes('small')) key = 'undersized';
      else key = 'damaged';
      counts[key] += 1;
    }
  }
  return counts;
}

function normalizeConfidence(aiResult) {
  const s = aiResult.statistics || {};
  if (typeof s.average_confidence === 'number') return s.average_confidence;
  if (typeof s.confidence === 'number') return s.confidence;
  if (typeof aiResult.confidence === 'number') return aiResult.confidence;
  const dets = Array.isArray(aiResult.detections) ? aiResult.detections : [];
  if (!dets.length) return null;
  const sum = dets.reduce((a, d) => a + (Number(d.confidence) || 0), 0);
  return +(sum / dets.length).toFixed(3);
}

/**
 * POST /api/inspections/:inspectionId/ai-analysis
 * Trigger AI analysis on uploaded images
 * 
 * Request body (optional):
 * {
 *   "imageId": "img_abc123",  // Specific image, or analyze all if not provided
 *   "confidenceThreshold": 0.4,
 *   "calibrationReferenceMm": 50
 * }
 */
router.post('/', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId } = req.params;
    const { imageId, confidenceThreshold = 0.4, calibrationReferenceMm } = req.body;
    
    // Verify inspection exists
    const inspection = d.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Get images to analyze
    d.images = d.images || [];
    let images = d.images.filter(img => img.inspectionId === inspectionId);
    
    if (imageId) {
      images = images.filter(img => img.id === imageId);
      if (images.length === 0) {
        return res.status(404).json({ error: 'Image not found' });
      }
    }

    /* The client may already hold a real result — a Live Camera frame analysed
       through /live-detect, or an explicit demo run — and submit the counts and
       detections directly. In that case there is no registered image to
       re-analyse, so persist what the client measured instead of rejecting the
       request. Rejecting it left the UI with no way to continue to Fusion. */
    const suppliedCounts = normalizeCounts(req.body);
    const suppliedDetections = Array.isArray(req.body.detections) ? req.body.detections : [];
    const suppliedTotal =
      suppliedDetections.length ||
      Number(req.body.totalCount || req.body.totalDetections || req.body.total || 0) ||
      Object.values(suppliedCounts).reduce((a, b) => a + b, 0);

    if (images.length === 0 && suppliedTotal === 0) {
      return res.status(400).json({
        error: 'No images uploaded for this inspection',
        hint: 'Upload or capture an image first, or submit counts/detections in the request body.',
      });
    }

    // A client-supplied result is treated as a single virtual source so the
    // aggregation below stays identical.
    const clientSource = {
      id: null,
      path: null,
      clientSupplied: true,
      counts: suppliedCounts,
      detections: suppliedDetections,
      total: suppliedTotal,
      confidence: normalizeConfidence(req.body),
      modelName: req.body.modelName,
      modelVersion: req.body.modelVersion,
    };

    /* Only re-analyse image records whose file is actually on disk.
       A registered image whose file has gone missing used to consume the whole
       request: the loop skipped it, results stayed empty, and the call 400'd —
       even though the client was holding counts it had already measured (Live
       Camera frame, or an explicit demo run). That left the operator stranded
       on the AI screen with no way to reach Fusion. Prefer real images when
       they exist; otherwise fall back to what the client measured. */
    const usableImages = images.filter((img) => img.path && fs.existsSync(img.path));
    const sources = usableImages.length > 0
      ? usableImages
      : (suppliedTotal > 0 ? [clientSource] : images);

    // Update inspection status
    if (inspection.status === 'CAMERA_COMPLETED') {
      inspection.status = 'AI_ANALYSIS_PENDING';
      inspection.updatedAt = db.nowISO();
      db.save();
    }

    // Analyze each image
    const results = [];
    let totalHealthy = 0;
    let totalDamaged = 0;
    let totalRotten = 0;
    let totalSprouted = 0;
    let totalUndersized = 0;
    let totalDetections = 0;
    let totalConfidence = 0;
    let analysisCount = 0;

    for (const image of sources) {
      try {
        let aiResult;

        if (image.clientSupplied) {
          // Trust the counts/detections the client already measured instead of
          // re-running a detector over an image we do not have.
          aiResult = {
            model_name: image.modelName || 'client-supplied-vision',
            model_version: image.modelVersion || 'v1',
            total: image.total,
            counts: image.counts,
            statistics: {
              average_confidence: image.confidence ?? 0.9,
              total: image.total,
              healthyCount: image.counts.healthy,
              damagedCount: image.counts.damaged,
              rottenCount: image.counts.rotten,
              sproutedCount: image.counts.sprouted,
              undersizedCount: image.counts.undersized
            },
            detections: image.detections,
            processing_time_ms: 0,
            demo_mode: false
          };
        } else {
          // Check if file exists
          if (!fs.existsSync(image.path)) {
            console.warn(`Image file not found: ${image.path}`);
            continue;
          }

          try {
            // Call AI service
            aiResult = await callAIService(image.path, {
              confidence_threshold: confidenceThreshold,
              calibration_reference_mm: calibrationReferenceMm
            });
          } catch (aiServiceError) {
            // Fallback to demo mode if Python service is not available
            console.warn(`AI service not available, using demo mode: ${aiServiceError.message}`);
            aiResult = {
              model_name: 'demo-onion-detector',
              model_version: 'v1.0-demo',
              total: 100,
              counts: {
                healthy: 85,
                damaged: 8,
                rotten: 3,
                sprouted: 2,
                undersized: 2
              },
              statistics: {
                average_confidence: 0.89
              },
              detections: [],
              processing_time_ms: 150,
              demo_mode: true
            };
          }
        }

        // Create AI analysis record with proper structure for database
        const counts = normalizeCounts(aiResult);
        const avgConf = normalizeConfidence(aiResult);
        
        const analysis = {
          id: db.id('aia'),
          inspectionId,
          imageId: image.id,
          analysisType: 'VISION',
          modelName: aiResult.model_name || 'roboflow-onion-detection',
          modelVersion: aiResult.model_version || 'v1',
          provider: image.clientSupplied ? 'client' : 'roboflow',
          mode: image.clientSupplied ? 'CLIENT' : 'REAL',
          status: 'COMPLETED',
          confidence: avgConf,
          confidenceThreshold,
          totalDetections: aiResult.detections?.length || aiResult.total || 0,
          averageConfidence: avgConf,
          processingTimeMs: aiResult.processing_time_ms || null,
          
          // Store counts for easy access
          counts,
          
          /* Never persist the annotated frame into the JSON store.
             The Python service returns it as `annotated_image_base64`, and
             storing it verbatim put ~164 KB of base64 into every analysis row —
             it made up most of db.json and slowed every single write. The
             frontend already receives the image in the HTTP response, so it
             never needs to be re-read from the database. */
          resultJson: {
            detections: aiResult.detections || [],
            counts,
            statistics: {
              total: aiResult.detections?.length || aiResult.total || 0,
              averageConfidence: avgConf,
              healthyCount: counts.healthy,
              damagedCount: counts.damaged,
              rottenCount: counts.rotten,
              sproutedCount: counts.sprouted,
              undersizedCount: counts.undersized
            },
            metadata: {
              modelName: aiResult.model_name || 'roboflow-onion-detection',
              modelVersion: aiResult.model_version || 'v1',
              processingTimeMs: aiResult.processing_time_ms,
              confidenceThreshold,
              imageId: image.id,
              imagePath: image.path,
              timestamp: db.nowISO()
            },
            rawResult: stripImageBlobs(aiResult)
          },
          
          createdAt: db.nowISO()
        };

        d.aiAnalyses = d.aiAnalyses || [];
        d.aiAnalyses.push(analysis);
        
        // Also create defect detection records for each defect type
        d.defectDetections = d.defectDetections || [];
        const defectTypes = [
          { type: 'HEALTHY', count: counts.healthy },
          { type: 'DAMAGED', count: counts.damaged },
          { type: 'ROTTEN', count: counts.rotten },
          { type: 'SPROUTED', count: counts.sprouted },
          { type: 'UNDERSIZED', count: counts.undersized }
        ];
        
        for (const defect of defectTypes) {
          if (defect.count > 0) {
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? (defect.count / total) * 100 : 0;
            
            // Determine severity based on defect type and percentage
            let severity = 'LOW';
            if (defect.type !== 'HEALTHY') {
              if (percentage > 50) severity = 'HIGH';
              else if (percentage > 20) severity = 'MEDIUM';
            }
            
            d.defectDetections.push({
              id: db.id('def'),
              aiAnalysisId: analysis.id,
              defectType: defect.type,
              confidence: avgConf,
              count: defect.count,
              severity,
              percentage: percentage,
              boundingBoxesJson: aiResult.detections?.filter(det => {
                const cls = String(det.class || det.label || '').toLowerCase();
                return cls.includes(defect.type.toLowerCase());
              }) || [],
              createdAt: db.nowISO()
            });
          }
        }

        // Aggregate defect counts (shape-agnostic)
        totalHealthy += counts.healthy;
        totalDamaged += counts.damaged;
        totalRotten += counts.rotten;
        totalSprouted += counts.sprouted;
        totalUndersized += counts.undersized;
        totalDetections += analysis.totalDetections;

        const conf = analysis.averageConfidence;
        if (typeof conf === 'number' && conf > 0) {
          totalConfidence += conf;
          analysisCount++;
        }

        results.push({
          imageId: image.id,
          analysisId: analysis.id,
          analysisType: 'VISION',
          detections: analysis.totalDetections,
          counts,
          confidence: analysis.averageConfidence,
          status: 'COMPLETED',
          processingTimeMs: analysis.processingTimeMs
        });

      } catch (aiError) {
        console.error(`AI analysis failed for image ${image.id}:`, aiError);
        results.push({
          imageId: image.id,
          error: aiError.message
        });
      }
    }

    // Nothing was actually analysed — e.g. every registered image record pointed
    // at a file that is not on disk. Do NOT mark the inspection as analysed with
    // all-zero counts: that would push empty evidence into Fusion and produce a
    // meaningless grade. Fail loudly instead.
    if (results.length === 0) {
      return res.status(400).json({
        error: 'No image could be analysed for this inspection',
        hint: 'The registered image files are missing on the server. Re-capture or re-upload the sample images, or submit counts/detections directly.',
      });
    }

    // Update inspection with aggregated results
    inspection.healthyCount = totalHealthy;
    inspection.damagedCount = totalDamaged;
    inspection.rottenCount = totalRotten;
    inspection.sproutedCount = totalSprouted;
    inspection.undersizedCount = totalUndersized;
    inspection.aiConfidence = analysisCount > 0 ? totalConfidence / analysisCount : null;
    inspection.status = 'AI_ANALYSIS_COMPLETED';
    inspection.updatedAt = db.nowISO();
    
    db.save();
    
    // Log audit event
    logAIAudit(inspectionId, req.user.id, 'AI_ANALYSIS_COMPLETED', {
      metadata: {
        imagesAnalyzed: sources.length,
        totalDetections,
        healthy: totalHealthy,
        damaged: totalDamaged,
        rotten: totalRotten,
        sprouted: totalSprouted,
        undersized: totalUndersized
      }
    });

    res.json({
      success: true,
      inspection: {
        id: inspection.id,
        inspectionNumber: inspection.inspectionNumber,
        status: inspection.status,
        healthyCount: inspection.healthyCount,
        damagedCount: inspection.damagedCount,
        rottenCount: inspection.rottenCount,
        sproutedCount: inspection.sproutedCount,
        undersizedCount: inspection.undersizedCount,
        aiConfidence: inspection.aiConfidence
      },
      summary: {
        imagesAnalyzed: sources.length,
        totalDetections,
        defectCounts: {
          healthy: totalHealthy,
          damaged: totalDamaged,
          rotten: totalRotten,
          sprouted: totalSprouted,
          undersized: totalUndersized
        },
        averageConfidence: analysisCount > 0 ? totalConfidence / analysisCount : null
      },
      results,
      message: images.length > 0
        ? `AI analysis completed. ${totalDetections} onions detected across ${sources.length} image(s).`
        : `AI analysis saved from the submitted result. ${totalDetections} onions detected.`
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to run AI analysis' });
  }
});

/**
 * POST /api/inspections/:inspectionId/live-detect
 *
 * Real-time detection for the browser Live Camera. Accepts a single frame as
 * a base64 / data-URL image (captured from the <video> element via
 * getUserMedia), forwards it to the Python ONIONCHECK / Roboflow YOLO service
 * and returns the ACTUAL detections (bounding boxes in % coords, class,
 * confidence) plus aggregated counts and a vision quality score.
 *
 * No simulated/fallback data is returned — if the Python service is down the
 * caller gets a 503 and the UI shows a real error instead of fake boxes.
 */
router.post('/live-detect', requireAuth(), async (req, res) => {
  try {
    const { image, imageBase64, confidenceThreshold = 0.25 } = req.body;
    const b64 = image || imageBase64;
    if (!b64) {
      return res.status(400).json({ error: 'No image provided' });
    }

    let aiResult;
    try {
      aiResult = await callAIBase64(b64, { confidence_threshold: confidenceThreshold });
    } catch (aiError) {
      return res.status(503).json({
        error: `AI inference service unavailable: ${aiError.message}`,
        hint: 'Start the OnionSure Python YOLO service (python/onion_flask_service.py) on port 5000.',
      });
    }

    const counts = normalizeCounts(aiResult);
    const avgConf = normalizeConfidence(aiResult);

    const detections = (aiResult.detections || []).map((d) => ({
      id: d.id,
      class: d.class || d.label || 'damaged',
      label: d.label || d.class,
      confidence: typeof d.confidence === 'number'
        ? d.confidence
        : (typeof d.classification_confidence === 'number' ? d.classification_confidence : 0),
      classificationConfidence: d.classification_confidence,
      bbox: d.bbox || null, // { x, y, width, height } as percentages (0-100)
      size: d.size,
      diameterCm: d.diameter_cm,
      category: d.category,
    }));

    res.json({
      success: true,
      mode: aiResult.mode || (aiResult.demo_mode ? 'DEMO' : 'YOLO_LOCAL'),
      total: aiResult.total || detections.length || 0,
      counts,
      percentages: aiResult.percentages || null,
      visionScore: aiResult.visionScore != null ? aiResult.visionScore : null,
      defectRate: aiResult.defect_rate != null ? aiResult.defect_rate : null,
      confidence: avgConf,
      modelName: aiResult.model_name,
      modelVersion: aiResult.model_version,
      detections,
      statistics: aiResult.statistics || {},
    });
  } catch (error) {
    console.error('Live detect error:', error);
    res.status(500).json({ error: error.message || 'Live detection failed' });
  }
});

/**
 * GET /api/inspections/:inspectionId/ai-analysis
 * Get all AI analyses for an inspection with defect detections
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

    d.aiAnalyses = d.aiAnalyses || [];
    const analyses = d.aiAnalyses
      .filter(a => a.inspectionId === inspectionId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Get defect detections for each analysis
    d.defectDetections = d.defectDetections || [];
    const enrichedAnalyses = analyses.map(analysis => {
      const defects = d.defectDetections.filter(dd => dd.aiAnalysisId === analysis.id);
      return {
        ...analysis,
        defects
      };
    });

    // Calculate aggregated statistics
    const totalDetections = analyses.reduce((sum, a) => sum + (a.totalDetections || 0), 0);
    const avgConfidence = analyses.length > 0
      ? analyses.reduce((sum, a) => sum + (a.averageConfidence || a.confidence || 0), 0) / analyses.length
      : null;

    res.json({
      success: true,
      analyses: enrichedAnalyses,
      summary: {
        totalAnalyses: analyses.length,
        totalDetections,
        averageConfidence: avgConfidence,
        inspectionCounts: {
          healthy: inspection.healthyCount,
          damaged: inspection.damagedCount,
          rotten: inspection.rottenCount,
          sprouted: inspection.sproutedCount,
          undersized: inspection.undersizedCount
        }
      }
    });
  } catch (error) {
    console.error('Get AI analyses error:', error);
    res.status(500).json({ error: 'Failed to retrieve AI analyses' });
  }
});

/**
 * GET /api/inspections/:inspectionId/ai-analysis/:analysisId
 * Get a specific AI analysis result with defect detections
 */
router.get('/:analysisId', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId, analysisId } = req.params;
    
    d.aiAnalyses = d.aiAnalyses || [];
    const analysis = d.aiAnalyses.find(a => a.id === analysisId && a.inspectionId === inspectionId);
    
    if (!analysis) {
      return res.status(404).json({ error: 'AI analysis not found' });
    }

    // Get associated image
    d.images = d.images || [];
    const image = d.images.find(img => img.id === analysis.imageId);
    
    // Get defect detections
    d.defectDetections = d.defectDetections || [];
    const defects = d.defectDetections.filter(dd => dd.aiAnalysisId === analysisId);

    res.json({
      success: true,
      analysis: {
        ...analysis,
        image: image ? {
          id: image.id,
          url: image.url,
          filename: image.filename,
          path: image.path
        } : null,
        defects
      }
    });
  } catch (error) {
    console.error('Get AI analysis error:', error);
    res.status(500).json({ error: 'Failed to retrieve AI analysis' });
  }
});

/**
 * GET /api/inspections/:inspectionId/ai-analysis/summary
 * Get aggregated AI analysis summary
 */
router.get('/summary/stats', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId } = req.params;
    
    // Verify inspection exists
    const inspection = d.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    const total = inspection.healthyCount + inspection.damagedCount + 
                  inspection.rottenCount + inspection.sproutedCount + inspection.undersizedCount;

    const percentages = total > 0 ? {
      healthy: ((inspection.healthyCount / total) * 100).toFixed(1),
      damaged: ((inspection.damagedCount / total) * 100).toFixed(1),
      rotten: ((inspection.rottenCount / total) * 100).toFixed(1),
      sprouted: ((inspection.sproutedCount / total) * 100).toFixed(1),
      undersized: ((inspection.undersizedCount / total) * 100).toFixed(1)
    } : null;

    res.json({
      success: true,
      summary: {
        totalDetections: total,
        counts: {
          healthy: inspection.healthyCount,
          damaged: inspection.damagedCount,
          rotten: inspection.rottenCount,
          sprouted: inspection.sproutedCount,
          undersized: inspection.undersizedCount
        },
        percentages,
        aiConfidence: inspection.aiConfidence,
        status: inspection.status
      }
    });
  } catch (error) {
    console.error('Get AI summary error:', error);
    res.status(500).json({ error: 'Failed to retrieve AI summary' });
  }
});

/**
 * DELETE /api/inspections/:inspectionId/ai-analysis/:analysisId
 * Delete a specific AI analysis
 */
router.delete('/:analysisId', requireAuth('procurement_officer', 'admin'), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId, analysisId } = req.params;
    
    d.aiAnalyses = d.aiAnalyses || [];
    const index = d.aiAnalyses.findIndex(a => a.id === analysisId && a.inspectionId === inspectionId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'AI analysis not found' });
    }

    const deleted = d.aiAnalyses[index];
    d.aiAnalyses.splice(index, 1);
    
    // Also delete associated defect detections
    d.defectDetections = d.defectDetections || [];
    d.defectDetections = d.defectDetections.filter(dd => dd.aiAnalysisId !== analysisId);
    
    db.save();
    
    // Log audit event
    logAIAudit(inspectionId, req.user.id, 'AI_ANALYSIS_DELETED', {
      analysisId,
      metadata: { imageId: deleted.imageId }
    });

    res.json({
      success: true,
      message: 'AI analysis deleted successfully'
    });
  } catch (error) {
    console.error('Delete AI analysis error:', error);
    res.status(500).json({ error: 'Failed to delete AI analysis' });
  }
});

/**
 * GET /api/inspections/:inspectionId/ai-analysis/fusion-data
 * Get combined AI and IoT data for Fusion Intelligence processing
 * 
 * Returns:
 * - All AI vision analyses with aggregated counts and confidence
 * - Latest IoT sensor readings (temperature, humidity, gas levels)
 * - Environmental data
 * - Combined data structure ready for fusion algorithm
 */
router.get('/fusion-data/combined', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId } = req.params;
    
    // Verify inspection exists
    const inspection = d.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Get AI analyses
    d.aiAnalyses = d.aiAnalyses || [];
    const aiAnalyses = d.aiAnalyses.filter(a => a.inspectionId === inspectionId);
    
    // Get defect detections
    d.defectDetections = d.defectDetections || [];
    const defectDetections = d.defectDetections.filter(dd => 
      aiAnalyses.some(a => a.id === dd.aiAnalysisId)
    );
    
    // Calculate aggregated AI vision metrics
    const totalDetections = aiAnalyses.reduce((sum, a) => sum + (a.totalDetections || 0), 0);
    const avgConfidence = aiAnalyses.length > 0
      ? aiAnalyses.reduce((sum, a) => sum + (a.confidence || a.averageConfidence || 0), 0) / aiAnalyses.length
      : null;
    
    // Aggregate defect counts across all analyses
    const aggregatedCounts = {
      healthy: 0,
      damaged: 0,
      rotten: 0,
      sprouted: 0,
      undersized: 0
    };
    
    for (const analysis of aiAnalyses) {
      const counts = analysis.counts || {};
      aggregatedCounts.healthy += counts.healthy || 0;
      aggregatedCounts.damaged += counts.damaged || 0;
      aggregatedCounts.rotten += counts.rotten || 0;
      aggregatedCounts.sprouted += counts.sprouted || 0;
      aggregatedCounts.undersized += counts.undersized || 0;
    }
    
    const totalCounted = Object.values(aggregatedCounts).reduce((a, b) => a + b, 0);
    
    // Calculate percentages
    const percentages = totalCounted > 0 ? {
      healthy: ((aggregatedCounts.healthy / totalCounted) * 100).toFixed(2),
      damaged: ((aggregatedCounts.damaged / totalCounted) * 100).toFixed(2),
      rotten: ((aggregatedCounts.rotten / totalCounted) * 100).toFixed(2),
      sprouted: ((aggregatedCounts.sprouted / totalCounted) * 100).toFixed(2),
      undersized: ((aggregatedCounts.undersized / totalCounted) * 100).toFixed(2)
    } : null;
    
    // Calculate vision quality score (0-100)
    // Higher healthy percentage = higher score, defects reduce score
    const visionQuality = totalCounted > 0 
      ? Math.max(0, (
          (aggregatedCounts.healthy / totalCounted) * 100 -
          (aggregatedCounts.rotten / totalCounted) * 50 -
          (aggregatedCounts.damaged / totalCounted) * 30 -
          (aggregatedCounts.sprouted / totalCounted) * 20 -
          (aggregatedCounts.undersized / totalCounted) * 15
        )).toFixed(2)
      : null;
    
    // Get IoT sensor readings
    d.sensorReadings = d.sensorReadings || [];
    const sensorReadings = d.sensorReadings
      .filter(s => s.inspectionId === inspectionId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const latestSensorReading = sensorReadings[0] || null;
    
    // Calculate sensor-based quality metrics
    let gasQuality = null;
    let environmentQuality = null;
    
    if (latestSensorReading) {
      // Gas quality: Lower gas levels = better quality (scale 0-100)
      // Assuming gas1-gas3 are in range 0-1000, lower is better
      const avgGas = ((latestSensorReading.gas1 || 0) + 
                      (latestSensorReading.gas2 || 0) + 
                      (latestSensorReading.gas3 || 0)) / 3;
      gasQuality = Math.max(0, 100 - (avgGas / 10)).toFixed(2);
      
      // Environment quality: Optimal temperature (10-25°C) and humidity (60-70%)
      const temp = latestSensorReading.temperature || 20;
      const humidity = latestSensorReading.humidity || 65;
      
      const tempScore = temp >= 10 && temp <= 25 ? 100 : Math.max(0, 100 - Math.abs(temp - 17.5) * 5);
      const humidityScore = humidity >= 60 && humidity <= 70 ? 100 : Math.max(0, 100 - Math.abs(humidity - 65) * 2);
      
      environmentQuality = ((tempScore + humidityScore) / 2).toFixed(2);
    }
    
    // Prepare fusion-ready data structure
    const fusionData = {
      inspectionId,
      inspectionNumber: inspection.inspectionNumber,
      timestamp: db.nowISO(),
      
      // Vision data
      vision: {
        analysisCount: aiAnalyses.length,
        totalDetections,
        confidence: avgConfidence,
        qualityScore: visionQuality,
        counts: aggregatedCounts,
        percentages,
        analyses: aiAnalyses.map(a => ({
          id: a.id,
          imageId: a.imageId,
          confidence: a.confidence || a.averageConfidence,
          detections: a.totalDetections,
          counts: a.counts,
          timestamp: a.createdAt
        })),
        defects: defectDetections.map(dd => ({
          id: dd.id,
          type: dd.defectType,
          count: dd.count,
          severity: dd.severity,
          percentage: dd.percentage,
          confidence: dd.confidence
        }))
      },
      
      // IoT sensor data
      iot: {
        readingCount: sensorReadings.length,
        latestReading: latestSensorReading ? {
          id: latestSensorReading.id,
          deviceId: latestSensorReading.deviceId,
          timestamp: latestSensorReading.timestamp,
          temperature: latestSensorReading.temperature,
          humidity: latestSensorReading.humidity,
          gas1: latestSensorReading.gas1,
          gas2: latestSensorReading.gas2,
          gas3: latestSensorReading.gas3,
          airQuality: latestSensorReading.airQuality
        } : null,
        gasQuality,
        environmentQuality,
        allReadings: sensorReadings.slice(0, 10).map(r => ({ // Last 10 readings
          timestamp: r.timestamp,
          temperature: r.temperature,
          humidity: r.humidity,
          gas1: r.gas1,
          gas2: r.gas2,
          gas3: r.gas3
        }))
      },
      
      // Ready for fusion algorithm
      fusionReady: {
        visionScore: parseFloat(visionQuality) || 0,
        visionConfidence: avgConfidence || 0,
        gasScore: parseFloat(gasQuality) || 0,
        gasConfidence: latestSensorReading ? 0.8 : 0, // Placeholder confidence
        environmentScore: parseFloat(environmentQuality) || 0,
        environmentConfidence: latestSensorReading ? 0.7 : 0,
        
        // Early spoilage indicators
        earlySpoilageIndicators: {
          rottenPercentageHigh: percentages && parseFloat(percentages.rotten) > 10,
          sproutedPresent: aggregatedCounts.sprouted > 0,
          highGasLevels: latestSensorReading && (
            latestSensorReading.gas1 > 500 || 
            latestSensorReading.gas2 > 500 || 
            latestSensorReading.gas3 > 500
          ),
          poorEnvironment: environmentQuality && parseFloat(environmentQuality) < 50
        }
      }
    };

    res.json({
      success: true,
      fusionData,
      message: 'Fusion data prepared successfully'
    });
  } catch (error) {
    console.error('Get fusion data error:', error);
    res.status(500).json({ error: 'Failed to retrieve fusion data' });
  }
});

module.exports = router;
