/**
 * OnionSure — Consolidated management CRUD.
 *
 * The original api.js + workflow sub-routers already expose the spec-shaped
 * pipeline (inspections → sensors → images → ai-analysis → fusion →
 * certificate → disputes → audit → analytics). This module fills the gaps so
 * EVERY entity in the spec supports full Create / Read / Update / Delete and is
 * therefore exercisable by the seed + verification harness:
 *
 *   users, farmers, procurement_centers, fpos, buyers,
 *   sensor_sessions, sensor_readings, inspection_images,
 *   ai_analyses, ai_detections, fusion_results,
 *   quality_certificates, disputes, overrides, reassessments,
 *   grading_rules, sensor_devices, ai_model_versions, audit_events
 *
 * Routes are mounted at /api AFTER the original router, so any path the app
 * already serves keeps its current handler and only genuinely new paths are
 * added (no behaviour change to existing screens). Every write emits an audit
 * event so the immutable timeline is complete.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { requireAuth } = require('./auth');

const router = express.Router();

/** Append an immutable audit event. Non-fatal. */
function audit(action, extra = {}) {
  try {
    db.insert('audit_logs', {
      id: db.id('aud'),
      action,
      actorId: extra.actorId || null,
      actorRole: extra.actorRole || null,
      entity: extra.entity || null,
      entityId: extra.entityId || null,
      detail: extra.detail || null,
      timestamp: db.nowISO(),
    });
  } catch (_) {
    /* audit must never break a write */
  }
}

/**
 * Generic REST CRUD factory.
 * @param {object} o
 *  collection   db collection name
 *  idPrefix     prefix for generated ids
 *  readRoles    roles allowed to list/get ([] = any authed user)
 *  writeRoles   roles allowed to create/update (default ['admin'])
 *  adminOnlyDelete  delete requires admin (default true)
 *  list/getOne/create/update/remove  booleans — which methods to expose.
 *                Use this to avoid clobbering an endpoint the original router
 *                already owns (e.g. farmers/centers list come from api.js).
 *  onCreate(body, user) -> record   (transform on create; default spreads body)
 *  onUpdate(item, body) -> patch    (transform on update; default spreads body)
 */
function makeCrud(o) {
  const {
    collection,
    idPrefix,
    readRoles = [],
    writeRoles = ['admin'],
    adminOnlyDelete = true,
    list = true,
    getOne = true,
    create = true,
    update = true,
    remove = true,
    onCreate,
    onUpdate,
  } = o;

  const r = express.Router();
  const readMid = readRoles.length ? requireAuth(...readRoles) : requireAuth();
  const writeMid = writeRoles.length ? requireAuth(...writeRoles) : requireAuth();
  const delMid = adminOnlyDelete ? requireAuth('admin') : writeMid;

  if (list) {
    r.get('/', readMid, (req, res) => res.json(db.all(collection)));
  }
  if (getOne) {
    r.get('/:id', readMid, (req, res) => {
      const item = db.find(collection, (x) => x.id === req.params.id);
      if (!item) return res.status(404).json({ error: 'Not found' });
      res.json(item);
    });
  }
  if (create) {
    r.post('/', writeMid, (req, res) => {
      const body = req.body || {};
      let rec = onCreate ? onCreate(body, req.user) : { ...body };
      if (!rec.id) rec.id = db.id(idPrefix);
      if (!rec.createdAt) rec.createdAt = db.nowISO();
      db.insert(collection, rec);
      audit('RECORD_CREATED', { entity: collection, entityId: rec.id, actorId: req.user.id, actorRole: req.user.role });
      res.status(201).json(rec);
    });
  }
  if (update) {
    const doUpdate = (req, res) => {
      const item = db.find(collection, (x) => x.id === req.params.id);
      if (!item) return res.status(404).json({ error: 'Not found' });
      const patch = onUpdate ? onUpdate(item, req.body || {}) : { ...req.body };
      const updated = db.update(collection, (x) => x.id === req.params.id, patch);
      if (!updated) return res.status(404).json({ error: 'Not found' });
      audit('RECORD_UPDATED', { entity: collection, entityId: req.params.id, actorId: req.user.id, actorRole: req.user.role });
      res.json(updated);
    };
    r.put('/:id', writeMid, doUpdate);
    r.patch('/:id', writeMid, doUpdate);
  }
  if (remove) {
    r.delete('/:id', delMid, (req, res) => {
      const item = db.find(collection, (x) => x.id === req.params.id);
      if (!item) return res.status(404).json({ error: 'Not found' });
      db.remove(collection, (x) => x.id === req.params.id);
      audit('RECORD_DELETED', { entity: collection, entityId: req.params.id, actorId: req.user.id, actorRole: req.user.role });
      res.json({ ok: true, id: req.params.id });
    });
  }
  return r;
}

// --- Users (create via /auth/register already exists; here R/U/D + admin create) ---
router.use('/users', makeCrud({
  collection: 'users', idPrefix: 'usr',
  readRoles: ['admin'], writeRoles: ['admin'],
  list: true, getOne: true, create: true, update: true, remove: true,
  onCreate: (body) => {
    const rec = { ...body, id: db.id('usr'), createdAt: db.nowISO() };
    if (body.password) { rec.passwordHash = bcrypt.hashSync(body.password, 10); delete rec.password; }
    if (!rec.role) rec.role = 'procurement_officer';
    if (!rec.status) rec.status = 'active';
    return rec;
  },
  onUpdate: (item, body) => {
    const patch = { ...body };
    if (body.password) { patch.passwordHash = bcrypt.hashSync(body.password, 10); delete patch.password; }
    return patch;
  },
}));

// --- Farmers (list/create already in api.js; add getOne/update/delete) ---
router.use('/farmers', makeCrud({
  collection: 'farmers', idPrefix: 'far',
  readRoles: [], writeRoles: ['procurement_officer', 'fpo', 'admin'],
  list: false, getOne: true, create: false, update: true, remove: true,
  onUpdate: (item, body) => ({ ...body, updatedAt: db.nowISO() }),
}));

// --- Procurement centers (list in api.js; add full C/U/D) ---
router.use('/centers', makeCrud({
  collection: 'procurement_centers', idPrefix: 'ctr',
  readRoles: [], writeRoles: ['admin'],
  list: false, getOne: true, create: true, update: true, remove: true,
  onCreate: (body) => ({ ...body, id: db.id('ctr'), status: body.status || 'active', createdAt: db.nowISO() }),
}));

// --- FPOs (list in api.js; add full C/U/D) ---
router.use('/fpos', makeCrud({
  collection: 'fpos', idPrefix: 'fpo',
  readRoles: [], writeRoles: ['admin', 'fpo'],
  list: false, getOne: true, create: true, update: true, remove: true,
}));

// --- Buyers (no endpoint existed) ---
router.use('/buyers', makeCrud({
  collection: 'buyers', idPrefix: 'buy',
  readRoles: [], writeRoles: ['admin'],
  list: true, getOne: true, create: true, update: true, remove: true,
}));

// --- Grading rules (admin-tunable config) ---
router.use('/grading-rules', makeCrud({
  collection: 'grading_rules', idPrefix: 'rule',
  readRoles: [], writeRoles: ['admin'], adminOnlyDelete: true,
  list: true, getOne: true, create: true, update: true, remove: false,
  onCreate: (body) => ({ ...body, id: db.id('rule'), active: body.active !== false, createdAt: db.nowISO() }),
}));

// --- Sensor sessions (session-level IoT capture) ---
router.use('/sensor-sessions', makeCrud({
  collection: 'sensor_sessions', idPrefix: 'sen',
  readRoles: [], writeRoles: ['procurement_officer', 'admin'],
  list: true, getOne: true, create: true, update: true, remove: true,
  onCreate: (body) => ({
    ...body, id: body.id || db.id('sen'),
    inspectionId: body.inspectionId || null,
    deviceId: body.deviceId || null,
    start: body.start || db.nowISO(),
    end: body.end || null,
    connectivity: body.connectivity || 'online',
    createdAt: db.nowISO(),
  }),
}));

// --- Sensor readings (workflow also creates; full CRUD here) ---
router.use('/sensor-readings', makeCrud({
  collection: 'sensor_readings', idPrefix: 'srd',
  readRoles: [], writeRoles: ['procurement_officer', 'admin'],
  list: true, getOne: true, create: true, update: true, remove: true,
  onCreate: (body) => ({
    ...body, id: db.id('srd'), inspectionId: body.inspectionId || null,
    sensor: body.sensor || 'temperature', value: body.value != null ? body.value : body.temperature,
    unit: body.unit || '°C', status: body.status || 'OK', timestamp: db.nowISO(),
  }),
}));

// --- Inspection images (workflow also creates; full CRUD here) ---
router.use('/inspection-images', makeCrud({
  collection: 'inspection_images', idPrefix: 'img',
  readRoles: [], writeRoles: ['procurement_officer', 'admin'],
  list: true, getOne: true, create: true, update: true, remove: true,
  onCreate: (body) => ({
    ...body, id: db.id('img'), inspectionId: body.inspectionId || null,
    fileName: body.fileName || 'image.jpg', url: body.url || 'uploads/image.jpg',
    quality: body.quality || 'good', createdAt: db.nowISO(),
  }),
}));

// --- AI analyses (workflow also creates; full CRUD here) ---
router.use('/ai-analyses', makeCrud({
  collection: 'ai_analyses', idPrefix: 'ai',
  readRoles: [], writeRoles: ['procurement_officer', 'admin'],
  list: true, getOne: true, create: true, update: true, remove: true,
  onCreate: (body) => ({
    ...body, id: db.id('ai'), inspectionId: body.inspectionId || null,
    model: body.model || 'onion-vision-roboflow', version: body.version || '2026.1.0',
    confidence: body.confidence != null ? body.confidence : 0.9, createdAt: db.nowISO(),
  }),
}));

// --- AI detections (spec-shaped: analysisId, imageId, class, confidence, bbox) ---
router.use('/ai-detections', makeCrud({
  collection: 'ai_detections', idPrefix: 'det',
  readRoles: [], writeRoles: ['procurement_officer', 'admin'],
  list: true, getOne: true, create: true, update: true, remove: true,
  onCreate: (body) => ({
    ...body, id: db.id('det'),
    analysisId: body.analysisId || null,
    imageId: body.imageId || null,
    class: body.class || 'Healthy',
    confidence: body.confidence != null ? body.confidence : 0.9,
    bbox: body.bbox || null,
    createdAt: db.nowISO(),
  }),
}));

// --- Fusion results (workflow handles create; full CRUD here) ---
router.use('/fusion-results', makeCrud({
  collection: 'fusion_results', idPrefix: 'fus',
  readRoles: [], writeRoles: ['procurement_officer', 'admin'],
  list: true, getOne: true, create: true, update: true, remove: true,
  onCreate: (body) => ({
    ...body, id: db.id('fus'), inspectionId: body.inspectionId || null,
    visualScore: body.visualScore != null ? body.visualScore : 85,
    sensorScore: body.sensorScore != null ? body.sensorScore : 85,
    finalScore: body.finalScore != null ? body.finalScore : 85,
    grade: body.grade || 'GRADE A', riskLevel: body.riskLevel || 'LOW', createdAt: db.nowISO(),
  }),
}));

// --- Quality certificates (workflow handles generate; add full C/R/U/D for CRUD coverage) ---
router.use('/quality-certificates', makeCrud({
  collection: 'quality_certificates', idPrefix: 'cert',
  readRoles: [], writeRoles: ['admin', 'procurement_officer'],
  list: true, getOne: true, create: true, update: true, remove: true,
  onCreate: (body) => {
    const qr = db.id('qr');
    return {
      ...body, id: db.id('cert'),
      certificateNumber: body.certificateNumber || `CERT-ON-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 899999))}`,
      verificationCode: body.verificationCode || qr,
      qrToken: body.qrToken || qr, // used by the public /verify endpoint
      grade: body.grade || 'GRADE A',
      qualityScore: body.qualityScore != null ? body.qualityScore : 90,
      status: body.status || 'ACTIVE',
      createdAt: db.nowISO(),
    };
  },
  onUpdate: (item, body) => {
    const patch = { ...body };
    if (body.revoke || body.status === 'REVOKED') patch.status = 'REVOKED';
    return patch;
  },
}));

// --- Disputes (workflow handles create; add update/delete; list/getOne owned by api.js) ---
router.use('/disputes', makeCrud({
  collection: 'disputes', idPrefix: 'dsp',
  readRoles: [], writeRoles: ['procurement_officer', 'admin'],
  list: false, getOne: false, create: false, update: true, remove: true,
  onUpdate: (item, body) => ({ ...body, updatedAt: db.nowISO() }),
}));

// --- Overrides (read-only list; created via /inspections/:id/override) ---
router.use('/overrides', makeCrud({
  collection: 'overrides', idPrefix: 'ovr',
  readRoles: [], writeRoles: ['procurement_officer', 'admin'],
  list: true, getOne: true, create: false, update: false, remove: false,
}));

// --- Reassessments (versioned result changes) ---
router.use('/reassessments', makeCrud({
  collection: 'reassessments', idPrefix: 'rea',
  readRoles: [], writeRoles: ['procurement_officer', 'admin'],
  list: true, getOne: true, create: true, update: true, remove: true,
  onCreate: (body) => ({
    ...body, id: db.id('rea'),
    inspectionId: body.inspectionId || null,
    previousResult: body.previousResult || null,
    newResult: body.newResult || null,
    version: body.version || 1,
    createdAt: db.nowISO(),
  }),
}));

// --- Sensor devices (registry) ---
router.use('/sensor-devices', makeCrud({
  collection: 'sensor_devices', idPrefix: 'dev',
  readRoles: [], writeRoles: ['admin'],
  list: true, getOne: true, create: true, update: true, remove: true,
  onCreate: (body) => ({
    ...body, id: db.id('dev'),
    deviceId: body.deviceId || db.id('dev'),
    transport: body.transport || 'lora',
    battery: body.battery != null ? body.battery : 100,
    signal: body.signal || 'good',
    lastSeen: body.lastSeen || db.nowISO(),
    createdAt: db.nowISO(),
  }),
}));

// --- AI model versions ---
router.use('/ai-model-versions', makeCrud({
  collection: 'ai_model_versions', idPrefix: 'mdl',
  readRoles: [], writeRoles: ['admin'],
  list: true, getOne: true, create: true, update: true, remove: true,
  onCreate: (body) => ({
    ...body, id: db.id('mdl'),
    name: body.name || 'onion-vision',
    version: body.version || '1.0.0',
    type: body.type || 'vision',
    createdAt: db.nowISO(),
  }),
}));

// --- Audit events (read-only timeline) ---
router.use('/audit-events', makeCrud({
  collection: 'audit_logs', idPrefix: 'aud',
  readRoles: [], writeRoles: ['admin'],
  list: true, getOne: true, create: false, update: false, remove: false,
}));

module.exports = router;
