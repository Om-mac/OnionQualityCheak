# OnionSure End-to-End Test Guide

## Overview

The `test_e2e_inspection_flow.mjs` file provides comprehensive end-to-end testing of the OnionSure platform as **ONE integrated system** with the Inspection ID backbone connecting all modules.

## What It Tests

### Complete Inspection Workflow

1. **Inspection Creation** → Generates unique IDs (INS-YYYY-NNNNNN + Lot ON-YYYY-NNNNN)
2. **Sensor Readings** → Persists 8 environmental parameters
3. **Image Upload** → Saves to disk with inspection-specific folders
4. **AI Analysis** → Normalizes counts from Python service
5. **Fusion Score** → Calculates weighted vision + IoT grade
6. **Certificate Generation** → Auto-populates all fields from inspection
7. **QR Verification** → Public endpoint validates certificates
8. **History/Analytics** → Lists and aggregates real backend data
9. **Data Persistence** → Verifies survival across page refresh/reload
10. **Inspection ID Backbone** → Confirms every module connects to ONE inspection

### Key Validations

✅ **Unique ID Generation**: INS-YYYY-NNNNNN format for inspections, ON-YYYY-NNNNN for lots, CERT-ON-YYYY-NNNNNN for certificates

✅ **Status Progression**: CREATED → SENSOR_COMPLETED → CAMERA_COMPLETED → AI_ANALYSIS_COMPLETED → FUSION_COMPLETED → CERTIFICATE_GENERATED

✅ **Data Enrichment**: GET endpoints return complete objects with all relationships resolved

✅ **Auto-Population**: Certificates automatically pull inspection data, lot details, farmer info, AI counts, sensor readings

✅ **Prerequisite Enforcement**: Each workflow stage requires previous stage completion

✅ **Persistence**: All data survives page refresh, browser reload, and system restart

✅ **Single Source of Truth**: ONE Inspection ID connects lots, sensors, images, AI, fusion, certificates, audit trail

## Prerequisites

### 1. Backend Server Running

```bash
cd onionsure/server
npm install
npm run dev
# Server should be running on http://localhost:3001
```

### 2. Database Initialized

Ensure PostgreSQL is running with the OnionSure schema:

```bash
psql -U postgres -d onionsure -f database/schema.sql
```

### 3. Node Fetch Library

```bash
npm install node-fetch@2 form-data
```

## Running the Tests

### Basic Usage

```bash
cd onionsure
node test_e2e_inspection_flow.mjs
```

### With Custom API URL

```bash
API_URL=http://localhost:3001 node test_e2e_inspection_flow.mjs
```

### Expected Output

```
╔════════════════════════════════════════════════════════════╗
║        ONIONSURE E2E INSPECTION FLOW TEST SUITE           ║
╚════════════════════════════════════════════════════════════╝

============================================================
TEST 1: CREATE INSPECTION
============================================================
ℹ POST /inspections
✓ Inspection created: INS-2026-000123
✓ Lot ID assigned: 456
✓ Initial status: CREATED
✓ All count fields initialized to 0
✓ Stored inspection ID: 789

============================================================
TEST 2: GET INSPECTION (ENRICHED)
============================================================
ℹ GET /inspections/789
✓ Lot relationship resolved
✓ Lot number: ON-2026-00456
✓ All relationship arrays present

[... additional test output ...]

============================================================
TEST 11: ONE INSPECTION ID BACKBONE
============================================================
✓ ALL MODULES CONNECTED TO INSPECTION INS-2026-000123:
ℹ   → Lot (ID: 456)
ℹ   → Sensors (1 readings)
ℹ   → Images (1 files)
ℹ   → AI Analysis (1 runs)
ℹ   → Fusion Score
ℹ   → Certificates (1 generated)
ℹ   → Audit Trail (7 events)
✓ ✓ ONE INSPECTION ID BACKBONE VERIFIED

============================================================
TEST SUMMARY
============================================================
Total Tests: 11
Passed: 11

✓✓✓ ALL TESTS PASSED ✓✓✓
OnionSure is functioning as ONE integrated platform!
```

## Test Breakdown

### Test 1: Create Inspection
- Calls POST `/api/inspections`
- Verifies INS-YYYY-NNNNNN format
- Confirms lot creation with ON-YYYY-NNNNN
- Checks initial status = CREATED
- Validates all count fields initialized to 0

### Test 2: Get Inspection (Enriched)
- Calls GET `/api/inspections/:id`
- Verifies lot relationship resolved
- Checks all arrays present: sensorReadings, images, aiAnalyses, certificates, auditEvents

### Test 3: Add Sensor Readings
- Calls POST `/api/inspections/:id/sensors`
- Sends all 8 parameters: temperature, humidity, moisture, pH, CO2, CH4, C2H4, NH3
- Verifies status update to SENSOR_COMPLETED

### Test 4: Upload Images
- Calls POST `/api/inspections/:id/images` (multipart/form-data)
- Verifies file saved with inspection ID in path
- Checks status update to CAMERA_COMPLETED

### Test 5: AI Analysis
- Calls POST `/api/inspections/:id/ai-analysis`
- Tests normalization of counts (total, healthy, defective, defect types)
- Verifies status update to AI_ANALYSIS_COMPLETED
- Confirms prerequisite: requires CAMERA_COMPLETED

### Test 6: Fusion Score
- Calls POST `/api/inspections/:id/fusion`
- Validates weighted score calculation: (vision × weight) + (IoT × weight)
- Checks grade assignment: GRADE A / URS / REJECTED
- Verifies status update to FUSION_COMPLETED
- Confirms prerequisite: requires AI_ANALYSIS_COMPLETED

### Test 7: Generate Certificate
- Calls POST `/api/inspections/:id/certificate`
- Verifies CERT-ON-YYYY-NNNNNN format
- Checks QR verification code generation
- Validates auto-population: inspection data, lot, farmer, AI counts, sensors
- Verifies status update to CERTIFICATE_GENERATED
- Confirms prerequisite: requires FUSION_COMPLETED

### Test 8: QR Verification
- Calls GET `/api/certificates/verify/:qrCode`
- Tests public endpoint accessibility
- Verifies certificate and inspection data returned

### Test 9: Inspection History
- Calls GET `/api/inspections`
- Verifies list returns array
- Confirms test inspection appears in history
- Checks lot number enrichment

### Test 10: Data Persistence
- Re-fetches inspection after all operations
- Verifies all data still present: lot, sensors, images, AI, fusion, certificates
- Simulates "page refresh" scenario

### Test 11: Inspection ID Backbone
- Fetches complete inspection with all relationships
- Validates EVERY module references same inspection ID
- Confirms: lot, sensors, images, AI analyses, fusion, certificates, audit events
- **Critical verification**: ONE inspection connects ALL data

## Integration Points Tested

### Backend Routes Verified
- `/api/inspections` - POST (create), GET (list)
- `/api/inspections/:id` - GET (enriched)
- `/api/inspections/:id/sensors` - POST
- `/api/inspections/:id/images` - POST (multipart)
- `/api/inspections/:id/ai-analysis` - POST
- `/api/inspections/:id/fusion` - POST
- `/api/inspections/:id/certificate` - POST
- `/api/certificates/verify/:qrCode` - GET (public)

### Database Tables Verified
- `inspections` - Main inspection record
- `lots` - Lot creation and linkage
- `sensor_readings` - 8-parameter IoT data
- `images` - Image upload and storage
- `ai_analyses` - Vision analysis results
- `defect_detections` - Defect breakdown
- `fusion_results` - Combined scoring
- `certificates` - Auto-generated certificates
- `audit_events` - Audit trail

### Status Flow Verified
```
CREATED 
  ↓ (add sensors)
SENSOR_COMPLETED
  ↓ (upload images)
CAMERA_COMPLETED
  ↓ (run AI analysis)
AI_ANALYSIS_COMPLETED
  ↓ (calculate fusion)
FUSION_COMPLETED
  ↓ (generate certificate)
CERTIFICATE_GENERATED
```

## Troubleshooting

### Test Fails: "Connection refused"
- Ensure backend server is running: `npm run dev` in `onionsure/server`
- Check API_URL matches your server port (default: 3001)

### Test Fails: "Database error"
- Verify PostgreSQL is running
- Check database schema is loaded
- Confirm connection string in backend `.env`

### Test Fails: "Image not found"
- Test looks for images in: `onioncheck/onion_detection_result.jpg`, `bright_boxes_test.jpg`, `image.png`
- If none exist, image upload test will be skipped (not a failure)

### Test Fails: Status prerequisites
- This is **EXPECTED BEHAVIOR** - demonstrates workflow enforcement
- Fusion requires AI analysis complete
- Certificate requires fusion complete
- Tests verify these prerequisites are enforced

### Partial Test Pass
- Some tests show ⚠ warnings (yellow) instead of failures
- Example: "No sensor readings found (may not have been added)"
- This indicates conditional success based on workflow stage

## Success Criteria

✅ **All 11 tests pass** = OnionSure is functioning as ONE integrated platform

The test validates:
1. Unique ID generation for inspections, lots, and certificates
2. Complete workflow status progression
3. Data persistence across page refresh/reload
4. Auto-population of certificates from inspection data
5. Prerequisite enforcement (can't skip workflow stages)
6. **ONE Inspection ID backbone connecting ALL modules**

## Next Steps After Test Pass

1. **Manual UI Testing**: Navigate through web interface to verify UX
2. **Multi-User Testing**: Test concurrent inspections from different users
3. **Load Testing**: Create multiple inspections to test performance
4. **Farmer Portal**: Verify farmers can see their inspection data
5. **Analytics Dashboard**: Confirm aggregations work with real data
6. **QR Code Scanning**: Test physical QR code scanning workflow

## System Architecture Confirmed

```
┌─────────────────────────────────────────────────────────┐
│           ONE INSPECTION ID (INS-YYYY-NNNNNN)           │
└──────────────────────┬──────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
   ┌───▼───┐      ┌───▼────┐     ┌───▼────┐
   │  Lot  │      │Sensors │     │ Images │
   │ON-... │      │8 params│     │ /disk  │
   └───────┘      └────────┘     └────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
   ┌───▼────┐     ┌───▼─────┐    ┌───▼────────┐
   │   AI   │     │ Fusion  │    │Certificate │
   │ counts │     │  score  │    │CERT-ON-... │
   └────────┘     └─────────┘    └────────────┘
                       │
                 ┌─────▼─────┐
                 │   Audit   │
                 │   Trail   │
                 └───────────┘
```

**Every piece of data connects to ONE Inspection ID.**

Data persists. Workflow enforced. System integrated. ✓
