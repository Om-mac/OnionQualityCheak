# OnionSure — Complete Project Analysis & System Flow

**Date:** 2026-09-07  
**Auditor:** Kilo  
**Scope:** Entire `onionsure/` folder, all pages, components, routes, APIs, databases, services, AI/Roboflow/IoT integrations, and data flows.

---

## 1. Project Structure Overview

```
onionsure/
├── server/                    ← ACTIVE BACKEND (Node/Express, port 4000, JSON store)
│   ├── server.js              ← Entrypoint, seeds DB, mounts WS
│   ├── api.js                 ← Main REST router (~1980 lines)
│   ├── auth.js                ← JWT auth + role middleware
│   ├── ai.js                  ← JS AI engine (vision demo + gas classifier + fusion)
│   ├── config.js              ← Runtime config (fusion weights, grading thresholds)
│   ├── db.js                  ← JSON-file data store with transaction + WS emit
│   ├── realtime.js            ← WebSocket server (/ws) with throttling
│   ├── seed.js                ← Idempotent seed (users, centers, farmers, demo data)
│   ├── inspection-routes.js   ← Unified inspection CRUD + workflow status machine
│   ├── sensor-routes.js       ← Sensor reading routes
│   ├── image-routes.js        ← Image asset routes
│   ├── ai-analysis-routes.js  ← AI analysis routes (calls Python service)
│   └── fusion-routes.js       ← Fusion calculation routes
├── web/                       ← FRONTEND (React + TypeScript + Vite + Tailwind)
│   ├── src/
│   │   ├── App.tsx            ← Route map (5 role dashboards + public pages)
│   │   ├── lib/
│   │   │   ├── api.ts         ← Typed API client (~239 lines)
│   │   │   ├── auth.tsx       ← AuthProvider with session TTL
│   │   │   ├── types.ts       ← TypeScript interfaces
│   │   │   ├── events.ts      ← WebSocket event constants
│   │   │   └── realtime.ts    ← WS hook
│   │   ├── components/
│   │   │   ├── Layout.tsx     ← Role-scoped sidebar navigation
│   │   │   ├── InspectionStudio.tsx ← Reusable AI vision upload component
│   │   │   ├── FarmerSelector.tsx   ← Farmer search/select
│   │   │   └── ...
│   │   └── pages/
│   │       ├── procurement/   ← 15 procurement officer pages
│   │       ├── farmer/        ← 5 farmer pages
│   │       ├── fpo/           ← 2 FPO pages
│   │       ├── buyer/         ← 1 buyer page
│   │       └── admin/         ← 4 admin pages
│   └── ...
├── python/                    ← Python AI Services
│   ├── onion_flask_service.py ← Flask service (port 5000) — YOLOv8 seg+cls
│   ├── vision_service.py      ← Roboflow/demo vision wrapper
│   ├── gas_quality_detector.py ← Gas classification (demo/RF-style)
│   └── fusion_service.py      ← Confidence-weighted multimodal fusion
├── onionsure-backend/         ← SEPARATE UNUSED BACKEND (TypeScript + Prisma + Postgres)
│   ├── prisma/
│   │   ├── schema.prisma      ← Rich relational model (~693 lines)
│   │   └── seed.ts
│   ├── src/
│   │   ├── routes/            ← REST API (different from server/api.js)
│   │   └── ...
│   └── ...
└── database/
    └── schema.sql             ← PostgreSQL production schema (~179 lines)
```

### CRITICAL ARCHITECTURAL FACT: TWO BACKENDS

There are **two completely separate backends** in this repo:

| Backend | Location | Stack | DB | Used by Frontend? |
|---------|----------|-------|-----|-------------------|
| **Active** | `onionsure/server/` | Node/Express, in-memory JSON file | `server/data/db.json` | ✅ YES |
| **Unused** | `onionsure/onionsure-backend/` | TypeScript, Prisma, PostgreSQL | Postgres via DATABASE_URL | ❌ NO |

The `web/` frontend proxies `/api` → `http://localhost:4000` (see `web/vite.config.ts`). It **never** calls `onionsure-backend/`.

**Implication:** `onionsure-backend/` and `database/schema.sql` are reference/deployment artifacts. All actual running logic lives in `server/`.

---

## 2. Data Models (Active Backend — `server/db.js`)

The JSON store (`db.json`) contains these collections:

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | Auth, roles | id, username, passwordHash, role, centerId, fpoId, farmerId, buyerId |
| `procurement_centers` | Physical centers | id, name, location, latitude, longitude |
| `fpos` | Farmer Producer Organizations | id, name, centerId |
| `farmers` | Farmer profiles | id, fullName, farmerId, mobile, village, fpoId |
| `buyers` | Buyer profiles | id, name, location |
| `lots` | Central lot identity | id, lotNumber, farmerId, fpoId, crop, quantityKg, procurementCenterId, status |
| `inspection_sessions` | Inspection workflow | id, lotId, status, workflowState, visionMode, startedAt, completedAt |
| `inspection_images` | Image metadata (NOT binary) | id, inspectionId, angle, fileName |
| `sensor_readings` | IoT/gas readings | id, inspectionId, temperature, humidity, co2, ch4, c2h4, nh3, moisture, ph |
| `vision_detections` | AI defect detections | id, inspectionId, class, confidence, bbox, size |
| `fusion_results` | Final quality decision | id, inspectionId, visionScore, gasScore, finalScore, grade, riskLevel, explanation |
| `quality_certificates` | Issued certificates | id, inspectionId, certificateNumber, grade, qualityScore, qrToken |
| `qr_verifications` | QR token records | id, certificateId, token, status |
| `audit_logs` | Immutable audit trail | id, action, lotId, actorId, centerId, timestamp, details |
| `overrides` | Human overrides | id, inspectionId, originalResult, newResult, reason |
| `disputes` | Farmer disputes | id, disputeNumber, lotId, status, timeline |

---

## 3. Authentication & Roles

- **JWT-based** with 12-hour expiry (configurable)
- **5 roles:** `procurement_officer`, `fpo`, `farmer`, `buyer`, `admin`
- **Role-scoped data access:**
  - `farmer` → only lots where `farmerId` matches
  - `fpo` → only lots where `fpoId` matches
  - `procurement_officer` → all lots
  - `buyer` → all lots
  - `admin` → everything
- **No refresh token** or revocation (documented in contract)
- **Demo users** (password: `password123`): `officer1`, `fpo1`, `farmer1`, `buyer1`, `admin`

---

## 4. AI / Roboflow / IoT Integration Status

### 4.1 Vision Analysis

**Two paths exist, only one is wired into the main flow:**

#### Path A: `server/api.js` → `POST /api/vision/analyze` (USED by InspectionStudio)
1. Client uploads image via `multipart/form-data`
2. Backend forwards to **OnionCheck Flask service** at `localhost:5000/api/detect`
3. If OnionCheck responds → maps detections via `ai.buildVisionFromOnionCheck()`
4. If OnionCheck fails → falls back to `ai.demoVision()` (simulated)
5. Returns `{ mode, counts, percentages, visionScore, detections, annotatedImage, originalImage }`

**Status:** OnionCheck service is **NOT RUNNING** by default. Vision analysis silently falls back to DEMO mode. The UI shows a "DEMO MODE" badge.

#### Path B: `LiveCamera.tsx` → `localhost:5000` directly (BYPASSES BACKEND)
- `LiveCamera.tsx` calls Flask endpoints directly:
  - `POST /api/detect-base64` — browser webcam frames
  - `POST /api/video/analyze` — video file analysis
  - `GET /api/camera/frame` — hardware station camera polling
  - `POST /api/camera/start` / `/stop` — camera control
- When AI backend is offline, falls back to `runFallbackDetection()` (hardcoded 5 simulated detections)

**Status:** Completely bypasses the Node.js backend's `/api/vision/analyze` endpoint. No images are persisted to inspection sessions from LiveCamera (only metadata via "Log to Active Lot").

#### Path C: `onion_flask_service.py` (Python YOLO Service)
- Real Flask service at port 5000 with YOLOv8 segmentation + classification
- Endpoints: `/api/detect`, `/api/detect-base64`, `/api/video/analyze`, `/api/camera/*`
- Requires model weights at `onioncheck/runs/segment/.../best.pt` and `onioncheck/runs/classify/.../best.pt`
- **Not running by default** — weights path may not exist

### 4.2 Gas / Environmental Analysis

**`server/ai.js` → `classifySensors()`** (DEMO mode):
- 8-parameter classification: temperature, humidity, CO2, CH4, C2H4, NH3, moisture, pH
- Returns `{ stage: LOW|MEDIUM|HIGH, gasScore, confidence, parameters }`
- Threshold-based with deterministic hash jitter
- **No real Random Forest model** — clearly labeled DEMO

**`python/gas_quality_detector.py`** (same logic, Python):
- Identical threshold-based classification
- Can be invoked via `USE_PYTHON=true` but falls back to JS

### 4.3 Fusion Engine

**`server/ai.js` → `gradingEngine.evaluate()`**:
- Confidence-weighted multimodal fusion:
  ```
  qualityScore = (wV * cV * vScore + wS * cS * sScore) / (wV * cV + wS * cS)
  ```
- Dynamic graceful degradation:
  - Sensor invalid → 90% Vision / 10% Sensor weight
  - Vision confidence < 0.60 → 20% Vision / 80% Sensor weight
- Early spoilage alert: `visionScore >= 78 AND gasStage == HIGH`
- Grading: `>= 85 → GRADE A`, `>= 65 → URS`, else `REJECTED`
- Produces `rulesTrace[]` (5 rules), `farmerExplanation`, `officerExplanation`

**`python/fusion_service.py`** (Python mirror):
- Same formula, can be invoked via `USE_PYTHON=true`

### 4.4 IoT Simulation

**`server/api.js` IoT endpoints:**
- `POST /api/iot/simulate/start` — creates virtual ESP32 device in memory
- `POST /api/iot/simulate/tick` — returns next drifting reading (8 channels)
- `POST /api/iot/compute` — computes gas quality, returns condition label, optionally persists
- `POST /api/iot/readings` — persists raw sensor reading

**Simulation modes:**
- Default: readings drift within normal ranges
- `"spoilage"` scenario: C2H4, CH4, CO2, NH3 drift toward high-risk values

**Status:** Fully simulated. No real ESP32/BLE/WiFi integration exists.

---

## 5. Existing Data Flow (What Actually Works)

### 5.1 Procurement Officer Flow

```
NewInspection.tsx
  ├── POST /api/lots → creates lot
  ├── POST /api/inspection/start → creates inspection session
  ├── localStorage.setItem('onionsure_current_inspection_id', ...)
  └── navigate → /quality/assessment/:inspectionId (SmartAssessment.tsx)

SmartAssessment.tsx (unified workflow)
  ├── Step 0: Lot details (read-only)
  ├── Step 1: Connect IoT Pod (api.simulateStart)
  ├── Step 2: Stabilization countdown (api.simulateTick)
  ├── Step 3: Image capture (api.addImage — metadata only)
  └── Step 4: Run AI Analysis
        └── api.analyzeInspection(inspectionId, {...})
              ├── Uses ai.generateVisionSample() OR provided vision
              ├── Uses latest sensor reading OR provided sensor data
              ├── Runs gas classification + environment scoring + fusion
              ├── Persists vision_detections + fusion_results
              ├── Updates inspection status → 'analyzed'
              └── Returns { vision, gas, environment, fusion }

  └── Step 5: Result + Override
        ├── api.overrideInspection() (optional)
        └── api.generateCertificate() → creates certificate + QR token

LiveCamera.tsx (independent page, NOT in SmartAssessment flow)
  ├── Direct calls to localhost:5000 (bypasses backend)
  ├── Browser webcam / hardware camera / video upload / snapshot
  ├── Real-time YOLO detection with bounding box overlay
  ├── Fallback simulation when AI offline
  └── "Log to Active Lot" → api.analyzeInspection() (saves to current inspection)

AIAnalysis.tsx
  ├── Uses InspectionStudio component
  ├── Calls api.visionAnalyzeImage() → POST /api/vision/analyze
  ├── OnionCheck live OR DEMO fallback
  └── onResult → api.analyzeInspection() (saves detections to inspection)

Fusion.tsx
  ├── GET /fusion/evidence/:inspectionId → scoped evidence
  ├── Dispatches to api.calculateFusion() → POST /fusion/calculate
  └── api.commitFusion() → POST /fusion/commit (upsert)

Certificates.tsx
  ├── GET /api/certificates (role-scoped)
  └── navigate → /certificate/:id

QrVerify.tsx
  ├── GET /api/verify/:certificateId (PUBLIC endpoint)
  └── navigate → /verify/:certId (public page)

AuditDisputes.tsx
  ├── GET /api/audit/logs
  ├── GET /api/disputes
  ├── POST /api/inspections/:id/override
  ├── POST /api/disputes/:id/review
  ├── POST /api/disputes/:id/reinspect
  ├── POST /api/disputes/:id/accept
  ├── POST /api/disputes/:id/reject
  └── GET /api/audit/lot/:lotNumber
```

### 5.2 Farmer Flow

```
FarmerDashboard.tsx
  ├── GET /api/lots (scoped to farmerId)
  ├── GET /api/certificates (scoped)
  ├── Create lot (inline form) → POST /api/lots
  └── Navigate → /farmer/dispute, /farmer/inspection, /certificate/:id

FarmerInspection.tsx (Pre-Check)
  └── InspectionStudio (role=farmer, NO onResult — not saved to inspection)

FarmerDispute.tsx
  ├── GET /api/inspections (for lot selector)
  ├── GET /api/disputes
  └── POST /api/disputes (creates dispute, marks lot as 'disputed')
```

---

## 6. Missing, Broken, Duplicated, Hardcoded, or Disconnected Functionality

### 🔴 CRITICAL ISSUES

#### 1. TWO BACKENDS — `onionsure-backend/` is completely disconnected
- `onionsure-backend/` (Prisma + PostgreSQL + TypeScript) is a **separate, unused backend**
- The web frontend only talks to `onionsure/server/` (Node/Express + JSON file)
- `onionsure-backend/prisma/schema.prisma` has a richer model but is never consulted
- `onionsure-backend/src/routes/` defines completely different endpoints
- **Impact:** All code in `onionsure-backend/` is dead code relative to the running system

#### 2. `inspection-routes.js` (in `onionsure-backend/`) is never mounted
- `onionsure-backend/src/routes/inspection.routes.ts` exists but is not imported by the active backend
- The active backend's `server/api.js` has its own inspection routes inline
- The `server/inspection-routes.js` file exists but is **not imported** by `server/api.js`
- **Impact:** The unified inspection CRUD in `server/inspection-routes.js` (with status machine, audit logging, etc.) is dead code

#### 3. `LiveCamera.tsx` bypasses the main backend API entirely
- Calls `http://localhost:5000` directly (Flask YOLO service)
- Never uses `POST /api/vision/analyze` from `server/api.js`
- "Log to Active Lot" calls `api.analyzeInspection()` which triggers fusion directly (not just saving vision)
- **Impact:** Camera → AI → Fusion flow is disconnected from the standard inspection pipeline; images are never truly persisted

#### 4. OnionCheck / YOLO Service dependency is unsatisfied
- `server/api.js` `forwardToOnionCheck()` calls `localhost:5000/api/detect`
- `python/onion_flask_service.py` serves this but requires model weights at `onioncheck/runs/...`
- The `onioncheck/` directory is **not present** in the repo
- **Impact:** Vision analysis always falls back to DEMO mode with simulated data

### 🟡 SIGNIFICANT ISSUES

#### 5. Hardcoded lot ID in `/fusion/context`
- `server/api.js` line 1039: `const lotQuery = req.query.lotNumber || 'ON-2026-00421';`
- Falls back to hardcoded demo lot if no query param
- **Impact:** Fusion Intelligence page could show wrong data if called without params
- **Mitigation:** `Fusion.tsx` now uses `GET /fusion/evidence/:id` (scoped) instead, so this is partially bypassed

#### 6. IoT result stored in module-level variable
- `LiveSensor.tsx` exports `lastIotResult` as a mutable module-level variable
- `Fusion.tsx` reads this variable directly instead of fetching from API
- **Impact:** Fragile state sharing; result lost on page refresh

#### 7. Images are NOT persisted — only metadata
- `POST /api/inspection/:id/images` stores `{ angle, fileName }` only
- No binary image storage in the backend
- `LiveCamera.tsx` "Log to Active Lot" sends vision detections but not the actual image
- **Impact:** No image archive; certificates and audit trails lack visual evidence

#### 8. `onionsure-backend/server/fusion-routes.js` has a syntax error
- Line 174: `sprouted Count` (space in variable name — JavaScript will throw)
- **Impact:** That backend wouldn't start even if it were used

#### 9. Duplicate/conflicting data models
- `server/db.js` uses `inspection_sessions`, `sensor_readings`, `fusion_results`
- `onionsure-backend/prisma/schema.prisma` uses `Inspection`, `SensorReading`, `FusionResult` with different shapes
- `database/schema.sql` uses yet another naming convention (`inspection_sessions`, `sensor_readings`)
- **Impact:** Any attempt to unify the backends requires careful migration

#### 10. Inconsistent workflow state machines
- `server/api.js` uses `workflowState`: `LOT_CREATED` → `IOT_CONNECTED` → `SAMPLE_CAPTURED` → `FUSION_COMPLETED` → `CERTIFICATE_ISSUED`
- `server/inspection-routes.js` (dead code) uses: `LOT_CREATED` → `SENSOR_PENDING` → `SENSOR_COMPLETED` → `CAMERA_PENDING` → `CAMERA_COMPLETED` → `AI_ANALYSIS_PENDING` → `AI_ANALYSIS_COMPLETED` → `FUSION_PENDING` → `FUSION_COMPLETED` → `GRADE_ASSIGNED` → `CERTIFICATE_GENERATED` → `COMPLETED`
- **Impact:** If the dead `inspection-routes.js` were ever mounted, it would conflict with the active API

### 🟡 MEDIUM ISSUES

#### 11. No real persistence of LiveCamera captures
- Session captures in `LiveCamera.tsx` are stored in React state only
- Exported as JSON download, but not saved to backend
- **Impact:** Capture history is lost on page refresh

#### 12. Buyer dashboard is a placeholder
- `BuyerDashboard.tsx` exists but has no buyer-specific features
- Just shows generic lot/certificate lists
- **Impact:** Buyer role is not functionally distinct

#### 13. Admin user management not implemented
- `AdminUsers.tsx` exists but no backend endpoints for user CRUD beyond `POST /api/auth/register` (admin only)
- No user list/edit/delete endpoints in active backend
- **Impact:** Admin cannot manage users through the UI

#### 14. `InspectionStudio` overlay only renders for `source === 'onioncheck'`
- In `InspectionStudio.tsx` line 194: `{baseImage && view === 'overlay' && live && detections.map(...)}`
- `live` is `source === 'onioncheck'`
- **Impact:** When OnionCheck is down (DEMO mode), bounding boxes are never drawn on the overlay, even though detections exist

#### 15. Certificate PDF is client-side only
- `GET /api/certificates/:id/pdf` returns `{ note: "Render the certificate page and use the browser Print → Save as PDF action." }`
- No server-side PDF generation
- **Impact:** Certificate download relies on browser print dialog

### 🟢 LOW ISSUES

#### 16. No token refresh mechanism
- JWT expires in 12 hours; no refresh token endpoint
- User must re-login after expiry
- Documented in contract but not implemented

#### 17. No pagination
- `GET /api/lots`, `GET /api/certificates`, `GET /api/inspections` return all records
- **Impact:** Performance degradation with large datasets

#### 18. Duplicate user check in `farmer-signup`
- `server/api.js` lines 114-125: duplicate mobile and username checks are written twice (copy-paste error)
- No functional impact (second check is redundant)

---

## 7. Recommended End-to-End System Flow

Based on what actually exists, here is the correct connection map:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. NEW INSPECTION                                                   │
│    NewInspection.tsx → POST /api/lots + POST /api/inspection/start  │
│    Creates: lot + inspection_session                                │
│    Stores: onionsure_current_inspection_id in localStorage          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. IOT SENSOR                                                       │
│    LiveSensor.tsx → POST /api/iot/simulate/start + /iot/compute     │
│    Creates: sensor_reading (persisted if inspectionId provided)     │
│    Returns: { gasScore, stage, condition, confidence }              │
│    Shared: lastIotResult (module-level variable)                    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. CAMERA / AI VISION                                               │
│    TWO PATHS:                                                        │
│    A) InspectionStudio → POST /api/vision/analyze → OnionCheck      │
│       Returns: detections, visionScore, annotatedImage              │
│       Falls back to DEMO if OnionCheck offline                      │
│    B) LiveCamera.tsx → localhost:5000 directly (bypasses backend)   │
│       Returns: detections, visionScore (real-time or fallback)      │
│    Persist: POST /api/inspection/:id/analyze (saves detections)     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. FUSION                                                           │
│    Fusion.tsx → GET /fusion/evidence/:inspectionId (scoped)        │
│                 → POST /fusion/calculate (or /fusion/commit)       │
│    Inputs: vision + gas + environment                               │
│    Outputs: { finalScore, grade, riskLevel, reasons, trace }       │
│    Persists: fusion_results + updates inspection + lot status      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. GRADE                                                           │
│    Part of fusion result: GRADE A / URS / REJECTED                  │
│    Written to: fusion_results.grade, lot.currentGrade              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. CERTIFICATE                                                      │
│    SmartAssessment.tsx or Certificates.tsx                         │
│    → POST /api/certificates/generate (idempotent)                  │
│    Creates: quality_certificate + qr_verification                  │
│    Updates: inspection → CERTIFICATE_ISSUED / completed            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. QR CODE                                                          │
│    Embedded in certificate (qrToken)                                │
│    Public verification: GET /api/verify/:certificateId              │
│    No auth required; exposes: grade, score, lot, center, FPO       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. FARMER NOTIFICATION / VIEW                                       │
│    FarmerDashboard.tsx → GET /api/certificates (scoped)            │
│    Farmer sees: lot status, grade, certificate, dispute button     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 9. DISPUTE / AUDIT                                                  │
│    FarmerDispute.tsx → POST /api/disputes                          │
│    → lot.status = 'disputed'                                        │
│    AuditDisputes.tsx → review → reinspect → accept → resolve       │
│    Reassessment creates: new inspection + new certificate           │
│    All actions logged to: audit_logs + overrides                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. How the Existing System Should Be Systematically Connected

### Current Connection Status

| Step | Component | Backend Endpoint | Data Persisted | Working? |
|------|-----------|-----------------|----------------|----------|
| New Inspection | `NewInspection.tsx` | `POST /api/lots`, `POST /api/inspection/start` | lot + inspection_session | ✅ |
| IoT | `LiveSensor.tsx` | `POST /api/iot/compute` (+ simulate) | sensor_reading | ✅ |
| Camera | `LiveCamera.tsx` | **Direct to localhost:5000** (bypasses backend) | **None** | ⚠️ |
| AI Analysis | `InspectionStudio` → `POST /api/vision/analyze` | OnionCheck or DEMO fallback | vision_detections (via analyzeInspection) | ✅ (demo mode) |
| Fusion | `Fusion.tsx` | `GET /fusion/evidence/:id`, `POST /fusion/calculate`, `POST /fusion/commit` | fusion_results | ✅ |
| Grade | Part of fusion | — | fusion_results.grade | ✅ |
| Certificate | `SmartAssessment.tsx`, `Certificates.tsx` | `POST /api/certificates/generate` | quality_certificate + qr_verification | ✅ |
| QR Verify | `QrVerify.tsx`, `/verify/:id` | `GET /api/verify/:id` (public) | — | ✅ |
| Farmer View | `FarmerDashboard.tsx` | `GET /api/certificates` (scoped) | — | ✅ |
| Dispute/Audit | `FarmerDispute.tsx`, `AuditDisputes.tsx` | `POST /api/disputes`, override endpoints | disputes + audit_logs + overrides | ✅ |

### Recommended Fixes to Make the Flow Fully Connected

#### Fix 1: Unify the backends or formally deprecate `onionsure-backend/`
- **Option A:** Delete or archive `onionsure-backend/` since it's unused
- **Option B:** Migrate `server/` to use Prisma + PostgreSQL (referencing `database/schema.sql`)
- **Option C:** Clearly document that `onionsure-backend/` is a deployment target and `server/` is the dev backend

#### Fix 2: Wire LiveCamera through the backend
- Create `POST /api/vision/analyze-image` that accepts base64/multipart
- Backend forwards to OnionCheck, stores result, returns mapped detections
- Remove direct `localhost:5000` calls from `LiveCamera.tsx`
- Persist captured images to `inspection_images` with actual binary storage or S3 reference

#### Fix 3: Make OnionCheck dependency explicit and optional
- Add a toggle in the UI: "Live Detection" vs "Demo Mode"
- Show clear status: "YOLO Engine: Offline — Simulation Active"
- Document the OnionCheck setup steps in README

#### Fix 4: Fix the IoT state sharing
- Replace module-level `lastIotResult` with a proper API fetch in `Fusion.tsx`
- `Fusion.tsx` already calls `GET /fusion/evidence/:id` which includes IoT data — use that instead of the module variable

#### Fix 5: Persist images
- Add `imageAssets` table/collection with binary storage or file paths
- Update `POST /api/inspection/:id/images` to accept multipart upload
- Store images in `uploads/` directory and reference by path

#### Fix 6: Remove hardcoded fallbacks
- Remove `'ON-2026-00421'` default from `/fusion/context` (or deprecate that endpoint)
- Ensure all pages require an explicit `inspectionId` from localStorage or URL params

#### Fix 7: Fix dead code conflicts
- Either mount `server/inspection-routes.js` in `server/api.js` or delete it
- Fix syntax error in `onionsure-backend/server/fusion-routes.js` line 174 (`sprouted Count` → `sproutedCount`)
- Remove duplicate checks in `farmer-signup` (lines 114-125)

#### Fix 8: Complete buyer and admin features
- Add buyer-specific marketplace features (lot ordering, price discovery)
- Implement user management CRUD in admin panel
- Add role-switching or impersonation for testing

---

## 9. API Contract Summary (Active Backend)

### Base URL
- Development: `http://localhost:4000/api` (Vite proxy)
- Production: Configurable via `VITE_API_BASE_URL`

### Key Endpoints

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/auth/login` | JWT login | No |
| POST | `/auth/farmer-signup` | Farmer self-registration | No |
| POST | `/auth/register` | Admin user creation | admin |
| GET | `/lots` | List lots (role-scoped) | Yes |
| POST | `/lots` | Create lot | Yes |
| GET | `/lots/lookup/:lotNumber` | Cross-center lot lookup | Yes |
| POST | `/inspection/start` | Start inspection session | Yes |
| GET | `/inspection/:id` | Get inspection details | Yes |
| POST | `/inspection/:id/images` | Record image capture | Yes |
| POST | `/inspection/:id/sensors` | Record sensor reading | Yes |
| POST | `/inspection/:id/analyze` | Run full AI analysis | Yes |
| PATCH | `/inspection/:id/step` | Update workflow step | Yes |
| POST | `/inspections/:id/override` | Human override grade | officer, admin |
| POST | `/vision/analyze` | Vision analysis (image upload) | Yes |
| POST | `/iot/readings` | Submit sensor reading | Yes |
| POST | `/iot/simulate/start` | Start virtual ESP32 | Yes |
| POST | `/iot/simulate/tick` | Next simulated reading | Yes |
| POST | `/iot/compute` | Compute IoT quality condition | Yes |
| GET | `/fusion/evidence/:id` | Scoped fusion evidence | Yes |
| GET | `/fusion/context` | Fusion context (hardcoded fallback) | Yes |
| POST | `/fusion/calculate` | Manual fusion calculation | Yes |
| POST | `/fusion/commit` | Commit fusion to registry | officer, admin |
| POST | `/certificates/generate` | Generate certificate | Yes |
| GET | `/certificates` | List certificates (scoped) | Yes |
| GET | `/certificates/:id` | Certificate details | Yes |
| GET | `/verify/:certificateId` | **PUBLIC** verification | No |
| GET | `/analytics/dashboard` | Dashboard stats | Yes |
| GET | `/analytics/quality` | Quality analytics | Yes |
| GET | `/disputes` | List disputes | Yes |
| POST | `/disputes` | Create dispute | Yes |
| POST | `/disputes/:id/review` | Review dispute | officer, admin |
| POST | `/disputes/:id/reinspect` | Reassess dispute | officer, admin |
| POST | `/disputes/:id/accept` | Accept dispute | officer, admin |
| POST | `/disputes/:id/reject` | Reject dispute | officer, admin |
| GET | `/config/fusion` | Get fusion config | admin |
| PATCH | `/config/fusion` | Update fusion config | admin |
| POST | `/demo/run` | One-click demo (auth) | Yes |
| POST | `/demo/public` | One-click demo (public) | No |

### WebSocket Events
- **URL:** `ws://localhost:4000/ws`
- **Events:** `db:<collection>` (insert/update/remove), `db:changed`, throttled sensor events
- **Client:** `web/src/lib/realtime.ts`, `web/src/hooks/useLiveData.ts`

---

## 10. Frontend Route Map

| Route | Component | Role | Status |
|-------|-----------|------|--------|
| `/` | `Home` | Public | ✅ |
| `/login` | `Login` | Public | ✅ |
| `/verify/:certId` | `Verify` | Public | ✅ |
| `/demo` | `Demo` | Public | ✅ |
| `/quality/dashboard` | `ProcDashboard` | procurement_officer | ✅ |
| `/quality/new-inspection` | `NewInspection` | procurement_officer | ✅ |
| `/quality/assessment/:id` | `SmartAssessment` | procurement_officer | ✅ |
| `/quality/live-sensor` | `LiveSensor` | procurement_officer | ✅ |
| `/quality/ai-analysis` | `AIAnalysis` | procurement_officer | ✅ |
| `/quality/live-camera` | `LiveCamera` | procurement_officer | ✅ |
| `/quality/fusion` | `Fusion` | procurement_officer | ✅ |
| `/quality/certificates` | `Certificates` | All | ✅ |
| `/quality/qr-verify` | `QrVerify` | All | ✅ |
| `/quality/history` | `History` | procurement_officer | ✅ |
| `/quality/audit` | `AuditDisputes` | procurement_officer | ✅ |
| `/quality/analytics` | `Analytics` | All | ✅ |
| `/quality/centers` | `Centers` | procurement_officer | ✅ |
| `/farmer/dashboard` | `FarmerDashboard` | farmer | ✅ |
| `/farmer/inspection` | `FarmerInspection` | farmer | ✅ |
| `/farmer/inspections` | `FarmerInspections` | farmer | ✅ |
| `/farmer/certificates` | `FarmerCertificates` | farmer | ✅ |
| `/farmer/report` | `FarmerReport` | farmer | ✅ |
| `/farmer/dispute` | `FarmerDispute` | farmer | ✅ |
| `/fpo/dashboard` | `FpoDashboard` | fpo | ✅ |
| `/fpo/inspection` | `FpoInspection` | fpo | ✅ |
| `/buyer/dashboard` | `BuyerDashboard` | buyer | ⚠️ Placeholder |
| `/admin/dashboard` | `AdminDashboard` | admin | ✅ |
| `/admin/users` | `AdminUsers` | admin | ⚠️ No CRUD |

---

## 11. Summary of What Exists vs. What Is Connected

| Feature | Exists in Code | Backend Connected | Frontend Connected | End-to-End Working |
|---------|---------------|-------------------|-------------------|-------------------|
| Lot creation | ✅ | ✅ | ✅ | ✅ |
| Inspection start | ✅ | ✅ | ✅ | ✅ |
| IoT simulation | ✅ | ✅ | ✅ | ✅ |
| AI Vision (DEMO) | ✅ | ✅ | ✅ | ✅ |
| AI Vision (OnionCheck) | ✅ | ✅ | ✅ | ⚠️ (service not running) |
| Live Camera (bypass) | ✅ | ❌ (bypasses) | ✅ | ⚠️ (not persisted) |
| Fusion calculation | ✅ | ✅ | ✅ | ✅ |
| Grade assignment | ✅ | ✅ | ✅ | ✅ |
| Certificate generation | ✅ | ✅ | ✅ | ✅ |
| QR verification | ✅ | ✅ | ✅ | ✅ |
| Farmer dashboard | ✅ | ✅ | ✅ | ✅ |
| Farmer dispute | ✅ | ✅ | ✅ | ✅ |
| Audit trail | ✅ | ✅ | ✅ | ✅ |
| Human override | ✅ | ✅ | ✅ | ✅ |
| Reassessment | ✅ | ✅ | ✅ | ✅ |
| Buyer features | ⚠️ Partial | ✅ | ⚠️ Placeholder | ❌ |
| Admin user management | ⚠️ Partial | ⚠️ Limited | ⚠️ UI only | ❌ |
| Real YOLO inference | ✅ (code) | ❌ (not running) | ✅ (calls it) | ❌ |
| Real ESP32 IoT | ❌ | ❌ | ❌ | ❌ |

---

## 12. Key Files to Read for Future Development

| File | Purpose | Lines |
|------|---------|-------|
| `server/api.js` | Main REST API — all routes | ~1980 |
| `server/ai.js` | AI engine — vision, gas, fusion | ~719 |
| `server/db.js` | JSON store + transaction + WS emit | ~219 |
| `server/auth.js` | JWT auth + role middleware | ~89 |
| `server/config.js` | Tunable fusion weights + grading | ~61 |
| `web/src/lib/api.ts` | Typed API client | ~239 |
| `web/src/lib/types.ts` | TypeScript interfaces | ~353 |
| `web/src/components/Layout.tsx` | Role-scoped sidebar nav | ~331 |
| `web/src/components/InspectionStudio.tsx` | Reusable AI vision upload | ~294 |
| `onionsure-backend/prisma/schema.prisma` | Rich relational model (reference) | ~693 |
| `database/schema.sql` | PostgreSQL schema (reference) | ~179 |
| `python/onion_flask_service.py` | YOLO Flask service (requires weights) | ~808 |
| `python/fusion_service.py` | Python fusion mirror | ~92 |

---

## 13.结论 (Conclusion)

The OnionSure project has a **functional but fragile** active system:

**What works end-to-end:**
- Lot creation → Inspection → IoT → AI (DEMO) → Fusion → Certificate → QR → Farmer view → Dispute/Audit
- All core procurement officer and farmer workflows are operational
- Role-based auth, real-time updates via WebSocket, and audit logging are implemented

**What is broken or disconnected:**
1. **Two backends** — `onionsure-backend/` is completely isolated from the running system
2. **LiveCamera bypasses the backend** — direct Flask service calls, no persistence
3. **OnionCheck/YOLO service** — not running, always falls back to DEMO
4. **No real image persistence** — only metadata is stored
5. **IoT result in module variable** — fragile cross-component state sharing
6. **Dead code conflicts** — `inspection-routes.js` not mounted, duplicate state machines
7. **Buyer and Admin features** — incomplete/placeholder

**Recommended immediate action:**
1. Decide: keep `server/` (JSON) or migrate to `onionsure-backend/` (PostgreSQL)
2. Wire LiveCamera through the backend API for proper persistence
3. Either start OnionCheck service or make DEMO mode the explicit default with clear UI labeling
4. Fix the IoT state sharing (use API instead of module variable)
5. Add real image storage (filesystem or S3)
