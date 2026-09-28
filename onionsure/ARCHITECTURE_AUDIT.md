# OnionSure — Repository Audit & Evolution Plan

> Source repo audited: `onionsure.zip` (extracted to `onionsure/`).
> Target: **OnionSure** — AI + IoT + Computer-Vision Onion Quality Assessment, Grading & Transparent Digital Procurement (SIH 2026).

## 1. Existing Frontend Structure
- **None.** The repo ships only `templates/index.html` (a placeholder SPA shell). There is no React/Angular/Vue codebase, no `package.json` for a frontend, no component library, no charts library.
- Conclusion: the entire frontend for OnionSure must be **built fresh** (React + TypeScript + Tailwind + Framer Motion + Recharts, per spec).

## 2. Existing Backend Structure
- **Django 4.2.11 + Django REST Framework 3.14** (Token auth, SQLite default, CORS).
- Apps: `farmers`, `buyers`, `products`, `orders`, `smartcontracts` (Web3 blockchain proof-of-quality).
- `manage.py`, `settings.py`, `onionsure/urls.py`, `onionsure/wsgi.py/asgi.py`.
- Heavy optional infra in `requirements.txt`: `boto3`, `web3`, `celery`, `redis`, `psycopg2-binary`, `gunicorn`.

## 3. Existing API Routes
- DRF ViewSets under each app `urls.py` (farmers, buyers, products, orders, smartcontracts). Token-auth REST endpoints for marketplace CRUD + order placement + on-chain record.

## 4. Existing Authentication
- DRF `TokenAuthentication` with Django `User`. Roles were implicit (no explicit role table).
- **Reused concept:** JWT-based, role-aware auth. OnionSure implements explicit roles: `procurement_officer`, `fpo`, `farmer`, `buyer`, `admin` with role-based redirects.

## 5. Existing Database Schema
- SQLite (`db.sqlite3`). Models: `Farmer` (farm_name, location, lat/lng, certification, capacity, rating…), `FarmProduct` (quality_grade A/B/C, price, qty…), `Buyer`, `Product`, `Order`, `SmartContract`.
- **Reused domain model:** farmers, FPOs, buyers, procurement centers, lots/products, orders. OnionSure extends with inspection/sensor/vision/fusion/certificate tables.

## 6. Existing YOLO / Image Analysis
- **None.** No computer-vision code, no `models/`, no YOLO weights, no OpenCV. The "grape-quality" framing in the prompt was aspirational; the actual repo has none.
- **Action:** Build a clearly-labeled **DEMO/MOCK vision pipeline** (`vision_service.py` + JS mirror) that returns bounding-box-style detections for healthy/damaged/rotten/sprouted/undersized. Real YOLOv8 integration is documented as the upgrade path.

## 7. Existing IoT Implementation
- **None.** No ESP32/Arduino code, no gas/temp/humidity sensors, no BLE/WiFi.
- **Action:** Build an **IoT Simulation Mode** (`simulateSensor()`) plus a real ingestion endpoint (`POST /api/iot/readings`) + `sensor_devices` table. Hardware hook is documented.

## 8. Existing Dashboard Components
- **None** (no frontend). Marketplace dashboards were never built.

## 9. Existing Reusable Components
- Domain models & marketplace business logic, blockchain proof-of-quality *idea*, `.env`/`.env.example` pattern, Dockerfile/docker-compose scaffolding.

## 10. Existing Marketplace Functionality
- Farmer product listings, buyer ordering, FPO/cooperative structure, blockchain-backed quality record.
- OnionSure keeps the **marketplace concept** (Farmer → FPO → Buyer, lots, orders) and layers quality intelligence on top.

---

## Decision: Build vs. Reuse
| Layer | Decision | Rationale |
|-------|----------|-----------|
| Frontend | **Build fresh** (React+TS+Tailwind) | No frontend existed |
| Backend API | **Build fresh** (Node/Express) | Guarantees a runnable, testable system without Django+Celery+Web3 infra; reuses onionsure's domain model & REST conventions |
| Auth | **Build fresh** JWT + roles | onionsure used DRF tokens; we need explicit roles |
| AI vision | **DEMO/MOCK** (labeled) | No model/weights exist; honesty required by spec |
| Gas/Env AI | **RF-style demo** (labeled) | No dataset; thresholds configurable, REAL-MODEL path documented |
| Fusion | **Build fresh** (configurable) | Core innovation; implemented in `ai.js` + `fusion_service.py` |
| DB | JSON store by default + **PostgreSQL schema.sql** provided | Runs with zero setup; prod schema included |
| Original onionsure | **Preserved** in `onionsure/` | Not deleted; referenced for domain model |

## What can be REUSED
- Domain entities (farmer, FPO, buyer, center, lot/product, order) and their relationships.
- `.env` configuration pattern; Docker scaffolding as reference.
- Blockchain "quality proof" *concept* → realized as immutably-stored, QR-verifiable digital certificates.

## What must be MODIFIED / CREATED
- Entire frontend (16-section homepage + 5 role dashboards + inspection wizard + fusion/AI/live-sensor/certificate/QR pages).
- Entire quality backend (lots, inspection sessions, sensor readings, vision detections, gas analysis, fusion results, certificates, QR verification, analytics).
- Python AI services (vision demo, gas RF demo, fusion service).
- PostgreSQL schema + migrations + seed.

## Known Limitations (honest)
- Vision & gas models are **DEMO/MOCK** modes with clearly-labeled simulated data; not trained on real onion datasets.
- No physical ESP32 integration in this build; IoT uses Simulation Mode with a real ingestion API for hardware later.
- Default DB is a JSON file store for zero-config local runs; PostgreSQL schema is provided for deployment.
