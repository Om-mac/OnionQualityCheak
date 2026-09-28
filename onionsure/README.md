# OnionSure — AI + IoT + Computer-Vision Onion Quality Assessment

**AI-Powered Quality. Trusted Agricultural Trade.**

A Smart India Hackathon 2026 platform for transparent onion procurement. It fuses
**computer vision** (defect detection) with **IoT gas/environmental sensing** to
detect visible defects *and* early-stage internal spoilage that cameras alone miss —
then issues an immutable, QR-verifiable digital quality certificate.

> Core idea: *See the defect. Sense the hidden risk. Fuse the evidence. Grade with confidence.*

---

## 1. Project Overview

OnionSure digitises onion procurement at the collection centre. An officer registers a
farmer's lot, captures images and runs it through a sensor pod, then the platform fuses
three independent signals — **vision**, **gas**, and **environment** — into a single
confidence-weighted quality score, a grade (Grade A / URS / Rejected), and a risk level.
The outcome is written to a **digital certificate** that any buyer can verify by QR code.

The platform serves five roles on one shared data model. Each role gets a dedicated
dashboard scoped to its slice of the procurement chain.

### Roles at a glance

| Role | Username | Lands on | Scope |
|---|---|---|---|
| Procurement Officer | `officer1` | `/quality/dashboard` | Runs inspections, grading, certificates |
| FPO | `fpo1` | `/fpo/dashboard` | Cooperative-level quality overview |
| Farmer | `farmer1` | `/farmer/dashboard` | Own lots, grades, certificates |
| Buyer | `buyer1` | `/buyer/dashboard` | Verified lots, sourcing, QR verification |
| Administrator | `admin` | `/admin/dashboard` | Platform-wide oversight & configuration |

> All demo accounts use the password `password123`.

---

## 2. The Four Dashboards

The four operational dashboards follow one lot through the chain: the **officer** grades it,
the **FPO** monitors it, the **farmer** owns it, and the **buyer** verifies it. (An
**Administrator** dashboard adds platform-wide oversight — see §2.5.)

### 2.1 Procurement Officer — Quality Operations Dashboard

**Route:** `/quality/dashboard` · **Entry point:** "New Inspection" wizard

**Purpose.** The operational command centre for a procurement centre. It gives the officer a
live view of grading throughput and quality outcomes, and is the launch point for every new
inspection.

**Features.**
- Five KPI cards: today's inspections, pending inspections, Grade A lots, URS lots, rejected lots.
- Live quality overview donut — Grade A / URS / Rejected split with a colour legend.
- Quality trend line chart — average score over recent days.
- Defect distribution bar chart — frequency per defect class.
- Recent certificates table (number, grade, score, risk badge, issue date) linking to each certificate.
- Live data indicator plus a "New Inspection" primary action.

**How it works.** On load the dashboard fetches four endpoints in parallel
(`analytics/dashboard`, `analytics/quality`, `analytics/defects`, `certificates`) and
re-renders from cached data while showing skeleton placeholders. It then keeps itself current
by polling every 15 s and reacting to dashboard refresh events pushed over the realtime channel.

The **main user flow** is the six-step New Inspection wizard (`/quality/new-inspection`):

1. **Lot Details** — select/create the lot (farmer, FPO, crop, quantity).
2. **Sample & IoT Pod** — assign the sample and bind a sensor device.
3. **Sensor Stabilization** — a countdown while the pod stabilises and streams readings.
4. **Image Capture** — capture/upload the sample images.
5. **AI Analysis** — run vision analysis and fusion; review the fused score and grade.
6. **Result** — generate the certificate and QR code, or start another inspection.

From there the officer can drill into Live Sensor, AI Analysis, Fusion Intelligence,
Certificates, QR Verification, History, Analytics, Centres, and Settings.

---

### 2.2 FPO — Quality Overview Dashboard

**Route:** `/fpo/dashboard`

**Purpose.** Gives a Farmer Producer Organisation a cooperative-wide view of its registered
farmers and the quality of lots flowing through its procurement centres, so it can advise
farmers and negotiate from evidence.

**Features.**
- Four KPI cards: registered farmers, total inspections, Grade A lots, average quality score.
- Grade distribution donut — cooperative-level Grade A / URS / Rejected mix.
- Incoming certificates table (certificate number, grade, score, Grade A percentage) with a
  "Register new lot" shortcut into the officer wizard.
- "Inspect Lot" primary action.

**How it works.** The dashboard loads dashboard analytics, certificates, and the farmer roster
in parallel, then polls every 15 s for updates. Grade distribution is derived from the
certificate set; the KPI row blends the analytics payload with the live farmer count. The FPO
shares the officer's certificate and analytics screens, so it can register lots and inspect
results without leaving its own navigation scope.

**Main user flow.** Review the cooperative's grade mix and average score → open an incoming
certificate to check a specific lot → register a new lot or inspect a lot → advise the farmer
using the recorded evidence.

---

### 2.3 Farmer — My Quality Intelligence Dashboard

**Route:** `/farmer/dashboard`

**Purpose.** Gives an individual farmer transparent, tamper-evident evidence for every lot
they submit, so grading is auditable and disputes are resolvable.

**Features.**
- "My Onion Lot" summary card with Grade A / URS / Rejected progress bars.
- Four KPI cards: my certificates, average quality score, Grade A lots, rejected lots.
- Grade history donut chart.
- Quality certificates list — each row shows certificate number, grade badge, score, and an
  "Open" link to the full certificate.
- "New Inspection" action for self-inspection.

**How it works.** The dashboard loads the farmer's certificates and refreshes them every 20 s
(or on certificate events). Percentages, averages, and the grade donut are all computed
client-side from the certificate list, so the view stays consistent with the certificate
record rather than a separate aggregate. When no certificates exist, empty states prompt the
farmer to submit a lot.

**Main user flow.** Submit a lot at the centre (or start a self-inspection) → the officer's
grading produces a certificate → the farmer sees the grade, score, and split on this dashboard
→ opens the certificate for the full record and shares its QR with buyers.

---

### 2.4 Buyer — Verified Lots Dashboard

**Route:** `/buyer/dashboard`

**Purpose.** Lets a buyer source with confidence by browsing quality-verified lots and
independently confirming any certificate before purchase.

**Features.**
- Search box filtering by certificate number or grade.
- Grade filter chips — All / Grade A / URS / Rejected.
- Verified-lot cards in a responsive grid, each showing certificate number, grade badge,
  quality score out of 100, and the Grade A / URS / Rejected percentage breakdown.
- Two actions per lot: **View** (full certificate) and **Scan QR** (public verification page).

**How it works.** The dashboard loads all certificates and refreshes every 20 s or on
certificate events. Filtering is a purely client-side pass over the loaded set — the grade chip
matches the grade exactly, the search box matches certificate number or grade
case-insensitively — so filtering is instant with no round trip. Cards animate in with a
staggered transition.

**Main user flow.** Browse or search verified lots → filter to the grades of interest → open a
lot's certificate to review score and composition → scan its QR to confirm authenticity on the
public verification page before committing to a purchase.

---

### 2.5 Administrator — Platform Overview (additional)

**Route:** `/admin/dashboard`

**Purpose.** Platform-wide oversight across every centre, user, and lot.

**Features.** A dark overview card (total lots registered, inspection count, live area chart);
quality distribution cards for Grade A / URS / Rejected; KPI cards for total farmers, FPOs,
buyers, and average score; an inspection flow line chart; a procurement centres table; recent
inspections; and a system status panel.

**How it works.** Loads dashboard and quality analytics in parallel and polls every 15 s.
Beyond oversight, the admin role uniquely manages users, tunes grading thresholds and fusion
weights (`PATCH /api/config/fusion`), and generates reports.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS 3, Framer Motion 11 |
| **Frontend libraries** | Recharts 2 (charts), lucide-react (icons), react-router-dom 6 (routing), qrcode.react (QR), clsx |
| **Backend** | Node.js, Express 4 |
| **Backend libraries** | jsonwebtoken (JWT auth), bcryptjs (password hashing), multer (image upload), ws (WebSocket realtime), cors |
| **Database** | JSON file store by default (`server/data/db.json`); PostgreSQL schema provided in `database/schema.sql` for production |
| **AI / Vision** | Python 3 — `vision_service.py` (Roboflow YOLO defect detection) |
| **AI / Gas** | Python 3 — `gas_quality_detector.py` (threshold/RF-style classifier) |
| **Fusion engine** | Python 3 — `fusion_service.py` (confidence-weighted multimodal fusion) |
| **IoT** | ESP32/Arduino simulation stream plus real ingestion via `POST /api/iot/readings` |
| **Styling / build tools** | PostCSS, autoprefixer, npm |

**Key architectural notes.**
- The frontend dev server (port 3000) proxies `/api` to the Express backend (port 4000); in
  production the backend serves the built bundle from the same origin.
- The backend can call the Python AI services instead of its built-in JavaScript
  implementations by setting `USE_PYTHON=true`.
- Fusion is confidence-weighted: `final = Σ(wₖ · confₖ · qualityₖ) / Σ(wₖ · confₖ)`. If vision
  looks healthy but gas risk is medium/high, the engine raises an **early spoilage alert** and
  forces a high risk level rather than trusting the camera.

---

## 4. Setup & Installation

### Prerequisites
- **Node.js 18+**
- **Python 3.10+** (only required for the optional Python AI bridge)

### Backend
```bash
cd onionsure/server
npm install
npm start          # http://localhost:4000 — demo data seeds automatically
```

### Frontend
```bash
cd onionsure/web
npm install
npm run dev        # http://localhost:3000 — proxies /api → :4000
```

### Python AI services (optional)
```bash
cd onionsure/python
python gas_quality_detector.py '{"ethane":0.42,"methane":0.18,"temperature":25,"humidity":63}'
python vision_service.py '{"scenario":"demo","total":100}'
python fusion_service.py '{"vision":{"visionScore":94,"confidence":0.95},"gas":{"stage":"MEDIUM","gasScore":76,"confidence":0.86},"environment":{"environmentScore":91,"confidence":0.95}}'
```
Set `USE_PYTHON=true` to have the Node backend call these services instead of its own JS implementations.

### Production database (optional)
```bash
psql -U <user> -d onionsure -f database/schema.sql
```

### Sign in
Open `http://localhost:3000`, pick a role, and sign in with any credential pair from the table
in §1 (password `password123`).

---

## 5. Folder Structure

```
onionsure/
├── server/                  # Node/Express backend
│   ├── server.js            # entrypoint (CORS, route mount, seed)
│   ├── api.js               # all REST routes
│   ├── auth.js               # JWT issuing + role middleware
│   ├── ai.js                # vision / gas / fusion implementations (JS fallback)
│   ├── config.js            # configurable fusion weights & grading thresholds
│   ├── db.js                # zero-config JSON data store
│   ├── realtime.js          # WebSocket realtime channel
│   ├── seed.js              # idempotent demo data (users, centres, FPOs, farmers, buyers)
│   └── data/db.json         # runtime JSON store
├── web/                     # React frontend
│   └── src/
│       ├── lib/             # api client, auth context, realtime, types, events
│       ├── components/      # Layout, ui, charts, animations, toast, realtime status
│       ├── hooks/           # useLiveData polling hook
│       └── pages/           # Home, Login, Verify, Demo, CertificateView
│           ├── procurement/ # Procurement Officer screens (dashboard, inspection wizard, …)
│           ├── fpo/         # FPO dashboard + lot inspection
│           ├── farmer/      # Farmer dashboard, inspections, certificates
│           ├── buyer/       # Buyer verified-lots dashboard
│           └── admin/       # Admin overview, analytics, users, reports
├── python/                  # Python AI services
│   ├── vision_service.py
│   ├── gas_quality_detector.py
│   └── fusion_service.py
├── database/schema.sql      # PostgreSQL production schema
├── ARCHITECTURE_AUDIT.md    # Audit of the original onionsure.zip + evolution plan
└── README.md
```

---

## 6. Sharing & Support

- **Login page** (`/login`) — role-selection chips, username/password, show-password toggle,
  remember-me, and a demo-credentials hint card.
- **Public certificate verification** (`/verify/:certId`) — no login required; proves a
  certificate is authentic.
- **Demo mode** (`/demo`) — runs a scripted end-to-end pipeline, including an early-spoilage
  scenario that shows the platform's core novelty.

---

## 7. Known Limitations

- **Vision and gas models run in demo/mock mode** with clearly labelled simulated data — no
  trained YOLO weights or labelled classifier dataset are bundled. The Python service I/O
  contracts are production-shaped, so real models drop in without frontend changes.
- **IoT runs in simulation mode** by default; real ESP32 streams are accepted through
  `POST /api/iot/readings`.
- The default store is a JSON file for zero-config runs; `database/schema.sql` targets
  PostgreSQL for deployment.
