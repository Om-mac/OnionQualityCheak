/**
 * OnionSure — Express server entrypoint.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const api = require('./api');
const { seed } = require('./seed');
const realtime = require('./realtime');
const inspectionRoutes = require('./inspection-routes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'onionsure', mode: config.usePython ? 'python' : 'js', time: new Date().toISOString() }));

// API
app.use('/api', api);

/* Spec-shaped workflow API (POST/GET/PATCH/PUT/DELETE /api/inspections …).
   Mounted AFTER the original router on purpose: Express matches in
   registration order, so every path the app already serves keeps its current
   handler and only genuinely new spec paths are added. This exposes the full
   unified workflow (inspections → sensor-readings → images → ai-analysis →
   fusion → certificate) without breaking any existing screen.
   Collection aliases in db.js ensure these routes read and write the SAME
   records as the rest of the system — one backbone, one source of truth. */
app.use('/api/inspections', inspectionRoutes);

// Consolidated management CRUD (fills the gaps so every spec entity has full
// Create/Read/Update/Delete). Mounted after the original router so existing
// paths keep their handlers and only new paths are added.
const crudRoutes = require('./crud-routes');
app.use('/api', crudRoutes);

// Flat fusion endpoints called by Fusion.tsx
// GET  /api/fusion/evidence/:inspectionId
// GET  /api/fusion/context
// POST /api/fusion/calculate
// POST /api/fusion/commit
const flatFusionRoutes = require('./flat-fusion-routes');
app.use('/api/fusion', flatFusionRoutes);

// Flat certificate endpoints called by the UI
// POST /api/certificates/generate
// GET  /api/certificates
// GET  /api/certificates/:id
const flatCertRoutes = require('./flat-cert-routes');
app.use('/api/certificates', flatCertRoutes);

/* Unknown /api/* paths must return a JSON 404 — NOT the SPA's index.html.
   Without this, the catch-all SPA fallback below answers every unmatched API
   route with HTML and a 200, so the client tries to parse "<!doctype html>"
   as JSON and surfaces a confusing "Unexpected token '<'" error instead of a
   clean "endpoint not found". */
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// Serve captured inspection images (server/image-routes.js stores them under
// server/uploads/inspections/<inspectionId>/ and exposes the /uploads URL).
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve built frontend if present (production single-server deploy)
const webDist = path.join(__dirname, '..', 'web', 'dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

// Seed then listen
seed().then(() => {
  const httpServer = app.listen(config.port, () => {
    console.log(`\n  OnionSure API listening on http://localhost:${config.port}`);
    console.log(`  Mode: ${config.usePython ? 'Python AI bridge ENABLED' : 'JS DEMO AI (set USE_PYTHON=true for Python services)'}`);
    console.log('  Demo logins (password: password123): officer1, fpo1, farmer1, buyer1, admin\n');
  });

  // Real-time fan-out on the same port, so the browser needs no extra config.
  realtime.initRealtime(httpServer);
}).catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
