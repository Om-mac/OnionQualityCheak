/**
 * OnionSure — Lightweight JSON-file data store.
 *
 * Purpose: zero-config local runs (no Postgres/Celery/Redis required) while
 * preserving the exact relational shape described in the spec. The PostgreSQL
 * production schema mirroring these collections lives in ../database/schema.sql.
 *
 * For production, set DATABASE_URL=postgres://... and swap this module for the
 * pg-backed implementation referenced in docs/DEPLOY.md.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const realtime = require('./realtime');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const EMPTY = {
  users: [],
  fpos: [],
  farmers: [],
  buyers: [],
  procurement_centers: [],
  lots: [],
  inspections: [],
  inspection_sessions: [],
  inspection_images: [],
  ai_analyses: [],
  vision_detections: [],
  ai_detections: [], // spec-shaped detections (analysisId, imageId, class, bbox)
  defectDetections: [], // written by the /api/inspections AI route family
  sensor_readings: [], // gas_analysis folded in
  sensor_sessions: [], // session-level IoT capture (deviceId, connectivity)
  sensor_devices: [], // device registry
  ai_model_versions: [], // AI model registry
  fusion_results: [],
  quality_certificates: [],
  qr_verifications: [],
  audit_logs: [],
  auditEvents: [],
  disputes: [],
  overrides: [],
  reassessments: [],
  grading_rules: [
    {
      id: 'rule_onion_2026_v1',
      version: 'ONION_STANDARD_2026_V1',
      defectClasses: ['Healthy', 'Damaged', 'Rotten', 'Sprouted', 'Undersized'],
      gradeThresholds: {
        gradeA: { minScore: 85, maxDefect: 10, spoilageRisk: 'LOW' },
        urs: { minScore: 65, maxDefect: 25, spoilageRisk: 'MEDIUM' },
        rejected: { maxDefect: 25, spoilageRisk: 'HIGH' }
      },
      sensorThresholds: {
        temperature: { min: 10, max: 15, critical_min: 5, critical_max: 20, unit: '°C' },
        humidity: { min: 65, max: 75, critical_min: 50, critical_max: 85, unit: '%' },
        co2: { max: 5, critical_max: 10, unit: '%' },
        ch4: { max: 100, critical_max: 500, unit: 'ppm' },
        c2h4: { max: 1, critical_max: 5, unit: 'ppm' },
        nh3: { max: 25, critical_max: 50, unit: 'ppm' },
        moisture: { min: 85, max: 90, critical_min: 80, critical_max: 95, unit: '%' },
        ph: { min: 5.5, max: 6.5, critical_min: 5.0, critical_max: 7.0, unit: 'pH' }
      },
      active: true,
      createdAt: new Date().toISOString()
    }
  ],
  config: {
    fusion: { weights: { vision: 0.45, gas: 0.35, environment: 0.20 } },
    grading: { gradeA: 85, urs: 65, rulesVersion: 'ONION_STANDARD_2026_V1' },
  },
};

let cache = null;

/**
 * Collection aliases.
 *
 * Several route modules were written against slightly different collection
 * names than the ones actually seeded (e.g. `inspections` vs
 * `inspection_sessions`, `centers` vs `procurement_centers`). Left alone they
 * would silently create a SECOND, disconnected data store — two "sources of
 * truth" for the same inspection, which directly violates the spec's single
 * Inspection-ID backbone.
 *
 * These aliases make every name resolve to the one canonical collection, so
 * all routes operate on the same records. They are defined non-enumerable so
 * `JSON.stringify` never writes duplicate copies into db.json.
 */
const ALIASES = {
  inspections: 'inspection_sessions',
  sensorReadings: 'sensor_readings',
  images: 'inspection_images',
  aiAnalyses: 'ai_analyses',
  fusionResults: 'fusion_results',
  certificates: 'quality_certificates',
  qualityCertificates: 'quality_certificates',
  centers: 'procurement_centers',
  // One audit trail, not two: these modules logged to `auditEvents` while the
  // rest of the app used `audit_logs`. Unify so the timeline is complete.
  auditEvents: 'audit_logs',
};

/**
 * If a legacy collection was ever created as its own array, fold its records
 * into the canonical collection (deduped by id) and delete the legacy key so
 * the alias can take over. Without this, an older db.json keeps two lists of
 * inspections and the app shows two conflicting histories.
 */
function migrateLegacyCollections(target) {
  let changed = false;
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (canonical === 'users') continue; // never touch users
    if (!Object.prototype.hasOwnProperty.call(target, alias)) continue;
    const legacy = target[alias];
    if (!Array.isArray(legacy)) continue;
    if (!Array.isArray(target[canonical])) target[canonical] = [];
    const seen = new Set(target[canonical].map((r) => r && r.id));
    for (const rec of legacy) {
      if (rec && rec.id && !seen.has(rec.id)) {
        target[canonical].push(rec);
        seen.add(rec.id);
      }
    }
    delete target[alias];
    changed = true;
  }
  return changed;
}

function applyAliases(target) {
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (Object.prototype.hasOwnProperty.call(target, alias)) {
      // Still own property: safest fallback is to alias anyway on a duplicate
      // key name so reads/writes hit canonical data.
      const existing = target[alias];
      delete target[alias];
      if (Array.isArray(existing) && existing.length && Array.isArray(target[canonical]) && !target[canonical].length) {
        target[canonical] = existing;
      }
    }
    Object.defineProperty(target, alias, {
      enumerable: false,
      configurable: true,
      get() { return target[canonical]; },
      set(v) { target[canonical] = v; },
    });
  }
  return target;
}

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    cache = JSON.parse(JSON.stringify(EMPTY));
    persist();
  } else if (!cache) {
    cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }
  // Backfill: an older db.json won't know about collections added later
  // (e.g. ai_analyses). Seed them as empty arrays so routes never crash.
  let backfilled = false;
  for (const [key, value] of Object.entries(EMPTY)) {
    if (cache[key] === undefined) {
      cache[key] = JSON.parse(JSON.stringify(value));
      backfilled = true;
    }
  }
  if (migrateLegacyCollections(cache)) backfilled = true;
  if (backfilled) persist();
  return applyAliases(cache);
}

function persist() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2));
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function nowISO() {
  return new Date().toISOString();
}

/**
 * Build a small, JSON-safe summary of a record for real-time broadcast.
 * We deliberately whitelist short scalar fields — never push large blobs
 * (annotated images, detection arrays) over the socket.
 */
const SUMMARY_FIELDS = [
  'id', 'lotId', 'inspectionId', 'farmerId', 'fpoId', 'centerId', 'procurementCenterId',
  'status', 'grade', 'lotNumber', 'certificateNumber', 'qualityScore', 'finalScore',
  'riskLevel', 'stage', 'username', 'role', 'name', 'crop', 'variety', 'createdAt',
];

function summarize(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const k of SUMMARY_FIELDS) {
    const v = obj[k];
    if (v == null) continue;
    if (typeof v === 'string' && v.length > 120) continue; // skip data URLs etc.
    out[k] = v;
  }
  return out;
}

/** Emit `<collection>:<op>` plus a generic `db:<collection>` event. */
function emit(col, op, obj) {
  const payload = { collection: col, op, ...summarize(obj) };
  realtime.broadcast(`db:${col}`, payload);
  realtime.broadcast(`${col}:${op}`, payload);
  // Catch-all so dashboards can simply listen for "something changed".
  realtime.broadcast('db:changed', { collection: col, op });
}

module.exports = {
  EMPTY,
  get: () => ensure(),
  persist,
  // Several route modules call db.save(); it is just persist() under another
  // name. Without this alias those handlers throw "db.save is not a function".
  save: () => persist(),
  id,
  nowISO,
  // Generic helpers
  all: (col) => ensure()[col],
  find: (col, fn) => ensure()[col].find(fn),
  filter: (col, fn) => ensure()[col].filter(fn),
  insert: (col, obj) => {
    const db = ensure();
    db[col].push(obj);
    persist();
    emit(col, 'insert', obj);
    return obj;
  },
  update: (col, fn, patch) => {
    const db = ensure();
    const item = db[col].find(fn);
    if (!item) return null;
    Object.assign(item, patch);
    persist();
    emit(col, 'update', item);
    return item;
  },
  remove: (col, fn) => {
    const db = ensure();
    const i = db[col].findIndex(fn);
    if (i >= 0) {
      const [gone] = db[col].splice(i, 1);
      persist();
      emit(col, 'remove', gone);
    }
  },
  /** Remove EVERY matching record. `remove()` only drops the first match. */
  removeAll: (col, fn) => {
    const db = ensure();
    const keep = [];
    const gone = [];
    for (const item of db[col]) (fn(item) ? gone : keep).push(item);
    if (!gone.length) return 0;
    db[col] = keep;
    persist();
    gone.forEach((g) => emit(col, 'remove', g));
    return gone.length;
  },
  
  /**
   * Transaction support for atomic multi-collection updates
   * Example: db.transaction((tx) => {
   *   tx.insert('overrides', override);
   *   tx.update('inspection_sessions', ...);
   *   tx.insert('audit_logs', audit);
   * });
   */
  transaction: (fn) => {
    const db = ensure();
    const ops = [];
    
    const tx = {
      insert: (col, obj) => {
        db[col].push(obj);
        ops.push({ col, op: 'insert', obj });
        return obj;
      },
      update: (col, findFn, patch) => {
        const item = db[col].find(findFn);
        if (!item) throw new Error(`Transaction update failed: item not found in ${col}`);
        Object.assign(item, patch);
        ops.push({ col, op: 'update', obj: item });
        return item;
      },
      remove: (col, findFn) => {
        const i = db[col].findIndex(findFn);
        if (i >= 0) {
          const [gone] = db[col].splice(i, 1);
          ops.push({ col, op: 'remove', obj: gone });
        }
      }
    };
    
    try {
      fn(tx);
      persist();
      // Emit all events after successful transaction
      ops.forEach(({ col, op, obj }) => emit(col, op, obj));
    } catch (err) {
      // Rollback by reloading from file
      cache = null;
      ensure();
      throw err;
    }
  },
  
  /** Exposed so routes can broadcast non-DB events (e.g. live sensor ticks). */
  emit,
};
