# OnionSure — Running Now

All three services are up and verified (as of this run).

| Tier | URL | Status | Notes |
|---|---|---|---|
| Frontend (React/Vite) | http://localhost:3000 | ✅ HTTP 200 | Login page |
| Backend (Node/Express) | http://localhost:4000 | ✅ ok | `/api/health` healthy; mode `python` |
| YOLO AI (Python/Flask) | http://localhost:5000 | ✅ ok | Real trained weights loaded (`best.pt` seg + cls); live `/api/detect` returns 9 detections |

## Access
Open **http://localhost:3000** and sign in with any demo account (password `password123`):

| Role | Username | Lands on |
|---|---|---|
| Procurement Officer | `officer1` | `/quality/dashboard` |
| FPO Manager | `fpo1` | `/fpo/dashboard` |
| Farmer | `farmer1` | `/farmer/dashboard` |
| Buyer | `buyer1` | `/buyer/dashboard` |
| Admin | `admin` | `/admin/dashboard` |

## Start command (backend, with the real AI bridge)
```bash
cd onionsure/server
USE_PYTHON=true PYTHON_BIN="C:/Users/darak/AppData/Local/Programs/Python/Python311/python.exe" node server.js
```
The system Python 3.11 interpreter has `ultralytics` + `torch` (CPU); the default `python` on PATH does not.

## Acceptance tests — 98/98 passing
Run from `onionsure/server`:

| Suite | Checks | Covers |
|---|---|---|
| `node e2e_spec_test.mjs` | 28/28 | Core workflow: inspection → unique ID → sensors → image → real AI → fusion → grade → certificate → QR verify → farmer parity → dispute → audit → analytics |
| `node e2e_spec_routes_test.mjs` | 21/21 | Spec-shaped REST workflow `/api/inspections/*` (sensor-readings, images, ai-analysis, fusion, certificate, status) + cross-check that both APIs share ONE store |
| `node e2e_governance_test.mjs` | 18/18 | Dispute lifecycle, human override (reason mandatory), audit trail, admin-gated fusion config, analytics |
| `node e2e_roles_test.mjs` | 31/31 | All five roles log in and load their dashboard data; role scoping (farmer sees only own lots/certificates, 0 leakage); unauthenticated refused; public QR works without login; unknown `/api` paths return JSON 404 |

## Architecture notes

### One Inspection ID backbone
Every record hangs off `INS-YYYY-NNNNNN`: lot (`ON-YYYY-NNNNN`), images, sensor readings, AI detections, fusion, grade, certificate (`CERT-ON-YYYY-NNNNNN`), QR verification and disputes. Nothing depends on page state — grades are recomputed from stored data, so a refresh shows identical results.

### Single source of truth (collection aliases)
The spec-shaped route modules were written against different collection names
(`inspections`, `sensorReadings`, `images`, `aiAnalyses`, `fusionResults`,
`certificates`, `qualityCertificates`, `centers`, `auditEvents`). Mounting them
naively would have created a **second, disconnected data store** with two
conflicting histories per lot.

`server/db.js` now maps every one of those names onto the canonical collection
(`inspection_sessions`, `sensor_readings`, `inspection_images`, `ai_analyses`,
`fusion_results`, `quality_certificates`, `procurement_centers`, `audit_logs`)
via **non-enumerable** accessors, so:
- all routes read and write the same records, and
- `JSON.stringify` never persists duplicate copies into `db.json`.

A migration in `ensure()` folds any pre-existing legacy array into its canonical
collection and deletes the old key.

### Route mounting (non-breaking)
`server.js` mounts `inspection-routes` at `/api/inspections` **after** the
original `api.js` router. Express matches in registration order, so every path
the app already served keeps its existing handler and only genuinely new spec
paths are added.

## Fixes applied this run
1. **Certificates had no lot linkage** — `buildCertificate()` and the spec
   certificate route now carry `lotId`, `lotNumber`, `centralLotId`, `farmerId`,
   `procurementCenterId`, crop/variety, so QR verification needs no second lookup.
2. **Disputes couldn't be raised by Inspection ID** — `POST /disputes` now
   accepts `inspectionId`, `lotId`/`lotNumber` or `certificateId` (previously
   `lotId` was mandatory, so the spec's ID-first flow returned 400).
3. **Real detections weren't persisted** — `POST /vision/analyze` now writes
   `ai_analyses` + `vision_detections` under the Inspection ID, and
   `POST /inspection/:id/analyze` prefers stored real results over the demo
   sample and returns detections at the top level.
4. **`db.remove()` only deleted the first match** — added `db.removeAll()`;
   re-analysis was duplicating detections (9 → 17) and leaving stale fusion rows.
5. **`inspection-routes.js` had a syntax error** (truncated `GET /:id` handler)
   and called `db.save()`, which didn't exist — both fixed; added `db.save()`.
6. **AI counts were always zero** — the YOLO service returns `counts` /
   `statistics.confidence`, not `statistics.healthy_count`. Added shape-agnostic
   normalisation; grades went from a bogus `26.25 REJECTED` to `73.03 URS` with
   real `healthy 5 / damaged 4` counts.
7. **Missing dependency** `form-data` installed.
8. **Certificate numbers broke the spec format** — the spec route emitted
   `CERT-2026-000003`; it now emits `CERT-ON-2026-NNNNNN`, matching the main
   API and the spec.
9. **Unknown `/api/*` paths returned the SPA's `index.html` with HTTP 200.**
   The catch-all SPA fallback swallowed every unmatched API route, so the
   client received `<!doctype html>` where it expected JSON and failed with a
   confusing `Unexpected token '<'`. Added a `/api` JSON-404 handler *before*
   the SPA fallback (deep links like `/quality/dashboard` still serve HTML).

## Frontend / backend contract
Every endpoint the UI calls was extracted from `web/src` and verified to exist
on the backend — no missing routes. The full list is covered by
`e2e_roles_test.mjs`, which fails if any response comes back as HTML (the
signal that a route fell through to the SPA fallback).

## Logs
- Python YOLO service: `onionsure/python_yolo_service.log`
- Backend / frontend: see their respective running terminals.

## Notes / caveats
- First detection call after a cold start can take a few seconds (model warm-up); subsequent calls are fast.
- IoT and gas sensors run in simulated mode by default (per project README); `USE_PYTHON=true` also routes gas/fusion through the Python bridge.
- The live-video scripts in `../onioncheck/` no longer paint a green mask over the feed: segmentation masks are off by default, healthy/onion boxes are blue, and any mask uses a light tint + outline.
