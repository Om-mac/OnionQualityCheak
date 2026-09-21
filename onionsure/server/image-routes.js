/**
 * OnionSure — Image Upload API Routes
 * 
 * Endpoints for uploading and managing inspection images.
 * Supports multiple images per inspection with metadata tracking.
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./db');
const auth = require('./auth');

const requireAuth = auth.requireAuth;

// Create uploads directory if it doesn't exist
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'inspections');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { inspectionId } = req.params;
    const inspectionDir = path.join(UPLOADS_DIR, inspectionId);
    
    // Create inspection-specific directory
    if (!fs.existsSync(inspectionDir)) {
      fs.mkdirSync(inspectionDir, { recursive: true });
    }
    
    cb(null, inspectionDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-original
    const timestamp = Date.now();
    const random = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${random}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});

/**
 * Log audit event for image actions
 */
function logImageAudit(inspectionId, userId, action, details = {}) {
  const d = db.get();
  const user = d.users.find(u => u.id === userId);
  
  const auditEvent = {
    id: db.id('aud'),
    inspectionId,
    userId,
    userName: user ? user.name : 'Unknown',
    userRole: user ? user.role : null,
    action,
    entityType: 'IMAGE',
    entityId: details.imageId || null,
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
/* IMAGE UPLOAD ENDPOINTS                                            */
/* ----------------------------------------------------------------- */

/**
 * POST /api/inspections/:inspectionId/images
 * Upload one or multiple images for an inspection
 * 
 * Form data:
 * - image: File (can be multiple)
 * - description: Optional description
 * - captureDevice: Camera/device info
 * - imageType: "sample" | "defect" | "general"
 */
router.post('/', requireAuth(), upload.array('images', 10), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId } = req.params;
    
    // Verify inspection exists
    const inspection = d.inspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const { description, captureDevice, imageType = 'sample' } = req.body;
    
    d.images = d.images || [];
    const uploadedImages = [];

    // Process each uploaded file
    for (const file of req.files) {
      const imageRecord = {
        id: db.id('img'),
        inspectionId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        relativePath: path.relative(UPLOADS_DIR, file.path),
        url: `/uploads/inspections/${inspectionId}/${file.filename}`,
        description: description || null,
        captureDevice: captureDevice || null,
        imageType,
        width: null, // Can be populated later with image processing
        height: null,
        uploadedBy: req.user.id,
        uploadedAt: db.nowISO(),
        createdAt: db.nowISO()
      };
      
      d.images.push(imageRecord);
      uploadedImages.push(imageRecord);
    }

    // Update inspection status if this is first image
    const existingImages = d.images.filter(img => img.inspectionId === inspectionId);
    if (existingImages.length === uploadedImages.length && inspection.status === 'SENSOR_COMPLETED') {
      inspection.status = 'CAMERA_PENDING';
      inspection.updatedAt = db.nowISO();
    }
    
    db.save();
    
    // Log audit event
    logImageAudit(inspectionId, req.user.id, 'IMAGES_UPLOADED', {
      metadata: {
        count: uploadedImages.length,
        filenames: uploadedImages.map(img => img.filename),
        totalSize: uploadedImages.reduce((sum, img) => sum + img.size, 0)
      }
    });

    res.status(201).json({
      success: true,
      images: uploadedImages,
      count: uploadedImages.length,
      message: `${uploadedImages.length} image(s) uploaded successfully`
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload images' });
  }
});

/**
 * GET /api/inspections/:inspectionId/images
 * Get all images for an inspection
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

    d.images = d.images || [];
    const images = d.images
      .filter(img => img.inspectionId === inspectionId)
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    // Calculate total size
    const totalSize = images.reduce((sum, img) => sum + (img.size || 0), 0);

    res.json({
      success: true,
      images,
      count: images.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    });
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({ error: 'Failed to retrieve images' });
  }
});

/**
 * GET /api/inspections/:inspectionId/images/:imageId
 * Get a specific image by ID
 */
router.get('/:imageId', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId, imageId } = req.params;
    
    d.images = d.images || [];
    const image = d.images.find(img => img.id === imageId && img.inspectionId === inspectionId);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({
      success: true,
      image
    });
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({ error: 'Failed to retrieve image' });
  }
});

/**
 * GET /api/inspections/:inspectionId/images/:imageId/download
 * Download/serve the actual image file
 */
router.get('/:imageId/download', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId, imageId } = req.params;
    
    d.images = d.images || [];
    const image = d.images.find(img => img.id === imageId && img.inspectionId === inspectionId);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Check if file exists
    if (!fs.existsSync(image.path)) {
      return res.status(404).json({ error: 'Image file not found on disk' });
    }

    // Serve the file
    res.sendFile(image.path);
  } catch (error) {
    console.error('Download image error:', error);
    res.status(500).json({ error: 'Failed to download image' });
  }
});

/**
 * DELETE /api/inspections/:inspectionId/images/:imageId
 * Delete an image
 */
router.delete('/:imageId', requireAuth('procurement_officer', 'admin'), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId, imageId } = req.params;
    
    d.images = d.images || [];
    const index = d.images.findIndex(img => img.id === imageId && img.inspectionId === inspectionId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = d.images[index];
    
    // Delete file from disk
    try {
      if (fs.existsSync(image.path)) {
        fs.unlinkSync(image.path);
      }
    } catch (err) {
      console.warn('Failed to delete image file:', err);
    }
    
    // Remove from database
    d.images.splice(index, 1);
    db.save();
    
    // Log audit event
    logImageAudit(inspectionId, req.user.id, 'IMAGE_DELETED', {
      imageId,
      metadata: { filename: image.filename }
    });

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

/**
 * POST /api/inspections/:inspectionId/images/complete
 * Mark image capture as complete
 * Updates inspection status to CAMERA_COMPLETED
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

    // Check if there are any images
    d.images = d.images || [];
    const images = d.images.filter(img => img.inspectionId === inspectionId);
    
    if (images.length === 0) {
      return res.status(400).json({ error: 'No images uploaded yet' });
    }

    // Update inspection status
    const oldStatus = inspection.status;
    inspection.status = 'CAMERA_COMPLETED';
    inspection.updatedAt = db.nowISO();
    
    db.save();
    
    // Log audit event
    logImageAudit(inspectionId, req.user.id, 'CAMERA_CAPTURE_COMPLETED', {
      oldValue: oldStatus,
      newValue: 'CAMERA_COMPLETED',
      metadata: { imageCount: images.length }
    });

    res.json({
      success: true,
      inspection,
      message: `Image capture completed. ${images.length} image(s) recorded.`
    });
  } catch (error) {
    console.error('Complete image capture error:', error);
    res.status(500).json({ error: 'Failed to complete image capture' });
  }
});

/**
 * PATCH /api/inspections/:inspectionId/images/:imageId
 * Update image metadata (description, type)
 */
router.patch('/:imageId', requireAuth(), async (req, res) => {
  try {
    const d = db.get();
    const { inspectionId, imageId } = req.params;
    const { description, imageType } = req.body;
    
    d.images = d.images || [];
    const image = d.images.find(img => img.id === imageId && img.inspectionId === inspectionId);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Update fields
    if (description !== undefined) image.description = description;
    if (imageType !== undefined) image.imageType = imageType;
    
    db.save();
    
    // Log audit event
    logImageAudit(inspectionId, req.user.id, 'IMAGE_UPDATED', {
      imageId,
      metadata: { description, imageType }
    });

    res.json({
      success: true,
      image,
      message: 'Image updated successfully'
    });
  } catch (error) {
    console.error('Update image error:', error);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

module.exports = router;
