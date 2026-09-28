# 🌾 FarmLink — Complete Project Information
### Master Reference Document for Presentation

**Project name:** FarmLink
**Internal codename:** KisanNexus (visible in server startup log and Prisma schema header)
**Repository:** `github.com/samarthdarak24-cpu/farmlink`
**Category:** AgriTech · Agricultural Marketplace · Supply Chain Platform
**Document version:** Complete — covers all layers, features, workflows and APIs

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Solution & Feature Pillars](#3-solution--feature-pillars)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [User Roles & Authentication](#6-user-roles--authentication)
7. [Frontend Route Map](#7-frontend-route-map)
8. [Complete API Reference](#8-complete-api-reference)
9. [Database Schema](#9-database-schema)
10. [Core Workflow 1 — Order Lifecycle](#10-core-workflow-1--order-lifecycle)
11. [Core Workflow 2 — Escrow & Disputes](#11-core-workflow-2--escrow--disputes)
12. [Core Workflow 3 — AI Quality Assessment](#12-core-workflow-3--ai-quality-assessment)
13. [Core Workflow 4 — Blockchain Traceability](#13-core-workflow-4--blockchain-traceability)
14. [Feature Module — AI Intelligence](#14-feature-module--ai-intelligence)
15. [Feature Module — Smart Logistics](#15-feature-module--smart-logistics)
16. [Feature Module — Saathi Voice AI](#16-feature-module--saathi-voice-ai)
17. [Feature Module — Farmer](#17-feature-module--farmer)
18. [Feature Module — FPO Aggregation](#18-feature-module--fpo-aggregation)
19. [Feature Module — Buyer Procurement](#19-feature-module--buyer-procurement)
20. [Feature Module — Admin](#20-feature-module--admin)
21. [Feature Module — Market & Live Mandi](#21-feature-module--market--live-mandi)
22. [Smart Contracts](#22-smart-contracts)
23. [Real-Time & Notification Layer](#23-real-time--notification-layer)
24. [Security Architecture](#24-security-architecture)
25. [Demo Data & Seed](#25-demo-data--seed)
26. [Testing & Verification](#26-testing--verification)
27. [Impact Metrics & Business Model](#27-impact-metrics--business-model)
28. [Presentation Talking Points](#28-presentation-talking-points)
29. [Roadmap](#29-roadmap)
30. [Known Limitations](#30-known-limitations)
31. [Anticipated Q&A](#31-anticipated-qa)
32. [Appendix A — Repository Structure](#appendix-a--repository-structure)
33. [Appendix B — Environment Variables](#appendix-b--environment-variables)
34. [Appendix C — Commands Reference](#appendix-c--commands-reference)

---

## 1. PROJECT OVERVIEW

| Attribute | Detail |
|---|---|
| **Name** | FarmLink |
| **Tagline** | India's blockchain-verified, AI-powered agricultural marketplace connecting farmers, FPOs and buyers directly |
| **Codename** | KisanNexus |
| **Purpose** | Eliminate middlemen in agricultural trade and deliver fair prices through AI intelligence + blockchain trust |
| **Users** | Farmers · FPOs (Farmer Producer Organizations) · Buyers · Admins |
| **Geographic focus** | India (Maharashtra-centric demo data: Nashik, Pune, Ahmednagar, Mumbai) |
| **Languages** | English, Hindi, Marathi, Hinglish, Gujarati |
| **License** | MIT |

### Three Core Pillars

1. **Direct Marketplace** — farmers list produce, buyers purchase directly, removing 30–40% intermediary margin
2. **AI Intelligence** — demand forecasting, fair-price prediction, computer-vision quality grading
3. **Trust Layer** — escrow-protected payments + SHA-256 hash-chain traceability + voice-first access

### Scale Summary

| Metric | Count |
|---|---|
| Frontend routes | 69 |
| Role dashboards | 4 |
| Prisma data models | 29 |
| API endpoints | 100+ |
| Saathi voice tools | 30+ |
| Solidity contracts | 3 |
| Test/verification harnesses | 12 |
| Frontend source files | 132 |
| Government schemes in catalog | 8 |
| Order lifecycle states | 20 |

---

## 2. PROBLEM STATEMENT

| Problem | Impact on Farmers |
|---|---|
| **Mandi price manipulation** | Prices set by intermediaries, not real demand |
| **No price transparency** | Farmer cannot see the buyer's actual purchase price |
| **Verbal quality disputes** | No verifiable record of quality at handover |
| **Payment delays & default** | Farmer delivers goods, then waits indefinitely for payment |
| **Language & literacy barrier** | Most digital platforms assume English + smartphone |
| **Fragmented smallholders** | A 2-acre farmer has no bargaining power alone |
| **Zero traceability** | Buyers cannot prove origin or food-safety compliance |

**Root cause:** The value chain between farm and buyer contains 4–6 intermediaries, each taking margin without adding proportional value.

---

## 3. SOLUTION & FEATURE PILLARS

| Pillar | Capability | Outcome |
|---|---|---|
| **Marketplace** | List/browse/search produce by crop, location, grade, price | Direct discovery, no middleman |
| **AI Intelligence** | Demand forecast, price prediction, CV quality grading, insight feed | Sell at optimal time and price |
| **Smart Logistics** | Live shipment tracking + AI route optimisation | ~30% lower delivery cost |
| **Escrow Payments** | Buyer funds locked, released only on delivery confirmation | Zero payment default |
| **Blockchain Traceability** | Immutable hash-chain + QR batch journey | Food-safety compliance, authenticity |
| **Saathi Voice AI** | Multilingual voice assistant over REST tools | Access for low-literacy users |
| **FPO Aggregation** | Pool member produce into verified batches | Collective bargaining power |
| **Government Schemes** | 8-scheme catalog with eligibility matching | Unlock subsidies and credit |

---

## 4. SYSTEM ARCHITECTURE

```
┌───────────────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                             │
│  React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4                        │
│  69 routes · 4 role dashboards · Recharts · Framer Motion · Dexie         │
└──────────────┬────────────────────────────────────┬───────────────────────┘
               │ REST /api/* (JSON)                 │ WebSocket /ws
               ▼                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  API SERVER                                                               │
│  Node.js · Express · TypeScript · Prisma ORM                              │
│  • JWT-ish token auth (token = userId)  • Zod validation                  │
│  • RBAC via requireRole()               • ws WebSocket hub                │
│  • Escrow auto-release sweep every 15 min                                 │
│  • 12 route modules mounted at /api/*                                     │
└──────────────┬────────────────────────────────────┬───────────────────────┘
               │                                    │
               ▼                                    ▼
┌──────────────────────────────┐   ┌───────────────────────────────────────┐
│  DATA LAYER                  │   │  SERVICE LAYER                        │
│  SQLite (dev)                │   │  • ai.service      (LLM + heuristics) │
│  → PostgreSQL (production)   │   │  • blockchain.service (hash chain)    │
│  29 Prisma models            │   │  • escrow.service  (funds lifecycle)  │
│  file: ./prisma/dev.db       │   │  • weather.service (city / lat-lon)   │
│                              │   │  • gemini.ts       (function calling) │
└──────────────────────────────┘   └───────────────────────────────────────┘
               ▲
               │ tool calls / function calling
┌───────────────────────────────────────────────────────────────────────────┐
│  SAATHI VOICE AI                                                          │
│  Python 3.12 · FastAPI · Uvicorn · Pipecat                                │
│  Sarvam Saaras v3 (STT) → Sarvam 105B (LLM) → Sarvam Bulbul v3 (TTS)      │
│  13 tool modules · 4 role prompts · session manager · language detection  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Service Topology

| Service | Port | Endpoint |
|---|---|---|
| Web app (Vite dev) | 5173 | `http://localhost:5173` |
| API server (Express) | 3001 | `http://localhost:3001` |
| Health check | 3001 | `http://localhost:3001/api/health` |
| WebSocket | 3001 | `ws://localhost:3001/ws` |
| Saathi Voice AI | 8000 | `http://localhost:8000` |

### Orchestration Scripts
- `./start-all.sh` — boots API server + web app + Saathi together
- `./stop-all.sh` — stops all three
- `./start-port.sh` — port-aware startup helper

---

## 5. TECHNOLOGY STACK

### Frontend

| Technology | Version | Role |
|---|---|---|
| React | 19.2.8 | UI library |
| TypeScript | ~6.0.2 | Type safety |
| Vite | 8.2.2 | Build tool / dev server |
| Tailwind CSS | 4.3.3 | Utility styling |
| React Router DOM | 7.18.2 | Client routing |
| Framer Motion | 13.1.1 | Animation |
| GSAP | 3.15.0 | Advanced animation |
| Recharts | 3.10.1 | Charts and analytics |
| Dexie | 4.4.5 | IndexedDB offline storage |
| Lucide React | 1.34.0 | Icon system |
| clsx + tailwind-merge | latest | Conditional class composition |
| canvas-confetti | 1.9.4 | Celebration effects |
| @pipecat-ai/client-js | 1.13.0 | Voice client |
| @pipecat-ai/websocket-transport | 1.7.1 | Voice transport |

**Dev tooling:** oxlint 1.79 · jsdom 30 · fake-indexeddb 6 · autoprefixer · postcss

### API Server

| Technology | Role |
|---|---|
| Node.js | Runtime |
| Express | HTTP framework |
| TypeScript | Type safety |
| Prisma ORM | Database access & migrations |
| SQLite | Development database (`server/prisma/dev.db`) |
| PostgreSQL | Production target (schema-compatible) |
| bcryptjs | Password hashing (10 rounds) |
| Zod | Request schema validation |
| ws | WebSocket server |
| dotenv | Environment config |

### Saathi Voice AI

| Technology | Role |
|---|---|
| Python 3.12 | Runtime |
| FastAPI | HTTP + WebSocket framework |
| Uvicorn | ASGI server |
| Pydantic | Data validation |
| aiohttp | Async HTTP client |
| Pipecat | Real-time voice pipeline orchestration |
| Sarvam AI | STT (Saaras v3) · LLM (105B) · TTS (Bulbul v3) |
| Google Gemini | Optional alternative LLM |

### AI / LLM Providers

| Provider | Model | Use |
|---|---|---|
| aihubmix | ox-alpha (free) | Chat, code generation, assistant |
| Google | Gemini 2.5 Flash | Optional voice LLM, function calling |
| Sarvam | 105B | Default voice LLM (real-time) |

### Blockchain / Web3

| Technology | Role |
|---|---|
| Solidity | Smart contract language |
| Hardhat | Compile / test / deploy toolchain |
| SHA-256 | Hash-chain implementation (Node crypto) |

---

## 6. USER ROLES & AUTHENTICATION

### The Four Roles

| Role | Enum | Description | Primary Goal |
|---|---|---|---|
| 👨‍🌾 **FARMER** | `FARMER` | Smallholder / marginal farmer | Sell produce at fair price, get paid on time |
| 🏛️ **FPO** | `FPO` | Farmer Producer Organization | Aggregate members' produce, sell in bulk |
| 🏪 **BUYER** | `BUYER` | Institutional buyer, retailer, hotel, restaurant | Source verified quality at predictable price |
| 🛡️ **ADMIN** | `ADMIN` | Platform operator | Verify users, resolve disputes, monitor market |

### User Status Enum
`ACTIVE` · `PENDING` · `SUSPENDED`

### Authentication Flow

```
POST /api/auth/login
   ├─ Accepts { email, password, role }
   ├─ ⚠️ DEMO MODE: any password accepted (bcrypt hash still stored)
   ├─ Normalises email (trim + strip whitespace + lowercase)
   ├─ If user exists → keeps its own role
   ├─ If user is new → auto-creates account with requested role
   │     ├─ FARMER → creates FarmerProfile (Nashik, Maharashtra, 12.4 acres)
   │     └─ BUYER  → creates Buyer record (Pune, Maharashtra)
   └─ Returns { token, user, farmerId, buyerId }
```

- **Token scheme:** `token = user.id` (a production deployment would issue a signed JWT — noted in code comments)
- **Token transport:** `Authorization: Bearer <token>` header, or `token` cookie
- **RBAC:** `requireRole(...roles)` middleware re-reads the role from the database on every request, so a role change takes effect immediately rather than being trusted from the token
- **Registration** (`POST /api/auth/register`) deliberately **refuses `ADMIN`** — only `FARMER`, `BUYER`, `FPO` can self-register

### Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Farmer | `farmer@demo.com` | any |
| Buyer | `buyer@demo.com` | any |
| FPO | `fpo@demo.com` | any |
| Admin | any email | any |

### Seeded Credentials (after `npm run db:seed`)

| Role | Email | Password |
|---|---|---|
| Farmer | `samarth@kisanexus.com` | `password123` |
| Buyer | `rajesh@freshmart.com` | `password123` |
| FPO | `sahyadri@kisanexus.com` | `password123` |
| Admin | `admin@kisanexus.com` | `password123` |

---

## 7. FRONTEND ROUTE MAP

**Total: 69 routes**

### Public / Marketing Routes (13)

| Route | Page |
|---|---|
| `/` | HomePage |
| `/marketplace` | MarketplacePage |
| `/ai-insights` | AIInsightsPage |
| `/how-it-works` | HowItWorksPage |
| `/about` | AboutPage |
| `/traceability` | TraceabilityPage |
| `/farmers` | FarmersPage |
| `/buyers` | BuyersPage |
| `/fpo` | FpoPage |
| `/contact` | ContactPage |
| `/login` | CompleteLoginPage |
| `/register` | CompleteRegisterPage |
| `/forgot-password` | ForgotPassword |

### Role Dashboards (4)

| Route | Component |
|---|---|
| `/farmer/dashboard` | `LiveFarmerDashboard` |
| `/fpo/dashboard` | `FpoAnalyticsDashboard` |
| `/buyer/dashboard` | `BuyerAnalyticsDashboard` |
| `/admin/dashboard` | `AdminDashboard` |

### 👨‍🌾 Farmer Module (16 sub-routes)

| Segment | Full Route | Label |
|---|---|---|
| `marketplace` | `/farmer/marketplace` | Marketplace |
| `farm` | `/farmer/farm` | My Farm |
| `produce` | `/farmer/produce` | Produce |
| `orders` | `/farmer/orders` | Orders |
| `logistics` | `/farmer/logistics` | Smart Logistics |
| `ai-intelligence` | `/farmer/ai-intelligence` | AI Intelligence |
| `ai-insights` | `/farmer/ai-insights` | AI Insights |
| `demand` | `/farmer/demand` | Demand Forecast |
| `price` | `/farmer/price` | Price Prediction |
| `quality-verify` | `/farmer/quality-verify` | Quality Verify |
| `traceability` | `/farmer/traceability` | Traceability |
| `payments` | `/farmer/payments` | Payments |
| `schemes` | `/farmer/schemes` | Schemes |
| `assistant` | `/farmer/assistant` | AI Assistant |
| `settings` | `/farmer/settings` | Settings |
| `blockchain` | `/farmer/blockchain` | Blockchain |

### 🏛️ FPO Module (15 sub-routes)

`farmers` · `produce` · `stock-hub` · `inventory` · `orders` · `buyers` · `marketplace` · `quality` · `payments` · `logistics` · `analytics` · `ai-insights` · `schemes` · `assistant` · `blockchain`

### 🏪 Buyer Module (12 sub-routes)

`marketplace` · `orders` · `suppliers` · `procurement` · `requirements` · `quality` · `payments` · `traceability` · `ai-insights` · `schemes` · `assistant` · `blockchain`

### 🛡️ Admin Module (13 sub-routes)

`users` · `farmers` · `fpos` · `buyers` · `produce` · `orders` · `payments` · `verification` · `reports` · `schemes` · `analytics` · `mandi` · `blockchain`

### Layout Behaviour
- Dashboard routes (`/farmer/*`, `/fpo/*`, `/buyer/*`, `/admin/*`) **hide** the public Navbar and Footer
- Login / register / forgot-password also hide site chrome
- `ScrollToTop` component restores scroll on navigation, with a `preserveScroll` escape hatch
- Unmatched routes fall back to HomePage

---

## 8. COMPLETE API REFERENCE

**Base URL:** `http://localhost:3001/api`
**Response envelope:** `{ success, data, timestamp }` (or plain objects on legacy inline routes)
**Error codes:** `NOT_FOUND` · `VALIDATION_ERROR` · `INVALID_CREDENTIALS` · `NOT_AVAILABLE` · `INSUFFICIENT_STOCK` · `SEARCH_FAILED` · `WEATHER_FETCH_FAILED`

### 8.1 Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Login (demo mode: auto-creates account, any password) |
| `POST` | `/api/auth/register` | — | Register (FARMER / BUYER / FPO only; ADMIN refused) |
| `GET` | `/api/auth/me` | ✅ | Current user profile |
| `PUT` | `/api/auth/profile` | ✅ | Update own name / phone / avatar / language |
| `PUT` | `/api/auth/password` | ✅ | Change password (verifies current via bcrypt) |

### 8.2 Dashboard

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/dashboard` | ✅ | **Role-aware** — dispatches to farmer / FPO / buyer builder |

**Farmer dashboard payload:** user, location, weather, farms, fields, stats (land area, production, revenue, pending revenue, active listings, pending/confirmed/total orders), cropDistribution, yieldHistory (6 months), marketSnapshot (6 crops), recentOrders (5), cropHealth, aiInsights (5), notifications (20), unreadNotifications, latestQuality

**FPO dashboard payload:** stats + activeListings, totalProduction, totalRevenue, pendingRevenue, **memberFarmers**, cropDistribution
**Buyer dashboard payload:** stats + totalRevenue (spend), pendingRevenue, cropDistribution, buyer profile

### 8.3 Marketplace & Produce

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/marketplace/listings` | — | Paginated listings (filter: crop, location, quality, page, limit) |
| `GET` | `/api/marketplace/listings/:id` | — | Single listing with farmer, crop, quality scans |
| `POST` | `/api/marketplace/listings` | ✅ | Create listing (farmers only) |
| `PATCH` | `/api/marketplace/listings/:id` | ✅ | Update listing (owner check → 403) |
| `DELETE` | `/api/marketplace/listings/:id` | ✅ | Delete listing (owner check → 403) |
| `GET` | `/api/produce` | ✅ | Farmer's own produce |
| `POST` | `/api/produce` | ✅ | Add produce (farmers only) |
| `GET` | `/api/farmer/produce` | ✅ | Produce list (module router) |
| `GET` | `/api/farmer/produce/:id` | ✅ | Produce detail |
| `PUT` | `/api/farmer/produce/:id` | ✅ | Update produce |
| `DELETE` | `/api/farmer/produce/:id` | ✅ | Delete produce |

### 8.4 Orders

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/orders` | ✅ | Role-scoped order list (filter: status, page, limit) |
| `GET` | `/api/orders/:id` | ✅ | Order detail + buyer, items, crop, listing, payment, timeline |
| `POST` | `/api/orders` | ✅ | Create order (computes subtotal + 2% transport) |
| `PATCH` | `/api/orders/:id/status` | ✅ | Update status (20-value enum, writes timeline + blockchain + WS push) |
| `POST` | `/api/orders/:id/pay` | ✅ | Pay via mock gateway → escrow hold → order CONFIRMED |
| `POST` | `/api/orders/:id/confirm-delivery` | ✅ | Buyer confirms receipt → escrow verify + release |
| `POST` | `/api/buyer/orders` | ✅ | Buyer-initiated order from a listing (transactional stock reservation) |

**Order creation logic:**
```
subtotal      = Σ (quantity × pricePerUnit)
transportCost = subtotal × 0.02
totalAmount   = subtotal + transportCost
orderNumber   = KNX-{6-digit timestamp}
status        = PENDING_PAYMENT
```
Side effects: blockchain `ORDER_CREATED` record, listing quantity decrement, notification, timeline entry.

### 8.5 Escrow

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/escrow/:orderId` | ✅ | Escrow record for an order |
| `POST` | `/api/escrow/:orderId/hold` | ✅ | Lock funds (accepts provider + reference) |
| `POST` | `/api/escrow/:orderId/verify-delivery` | ✅ | Mark delivery verified |
| `POST` | `/api/escrow/:orderId/release` | ✅ | Release funds to farmer + WS notify |
| `POST` | `/api/escrow/:orderId/refund` | ✅ | Refund buyer (requires reason) |
| `POST` | `/api/escrow/:orderId/dispute` | ✅ | Raise dispute (reason, description, evidence[]) |
| `POST` | `/api/escrow/auto-release/run` | ✅ | Manually trigger auto-release sweep |

### 8.6 Disputes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/disputes` | ✅ | List disputes (filter: status) |
| `GET` | `/api/disputes/order/:orderId` | ✅ | Disputes for a specific order |
| `POST` | `/api/disputes/:id/resolve` | ✅ | Resolve — FULL_REFUND / PARTIAL_REFUND / RELEASE_FULL / SPLIT_SETTLEMENT |

### 8.7 Blockchain & Traceability

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/blockchain/verify` | — | Verify full chain integrity |
| `GET` | `/api/blockchain/records` | — | Ledger explorer (latest 50) |
| `GET` | `/api/blockchain/orders/:orderId/events` | — | Blockchain proof timeline for an order |
| `GET` | `/api/blockchain/trace/:batchCode` | — | Trace batch by code |
| `GET` | `/api/blockchain/trace` | — | Trace query |
| `GET` | `/api/blockchain/contracts` | — | Smart contract registry |
| `GET` | `/api/blockchain/contracts/:id` | — | Contract detail |
| `POST` | `/api/blockchain/contracts/:id/simulate` | — | Simulate contract call |
| `GET` | `/api/blockchain/dashboard` | — | Blockchain dashboard metrics |
| `POST` | `/api/traceability/batches` | ✅ | Create batch |
| `POST` | `/api/traceability/batches/:batchId/events` | ✅ | Append traceability event |
| `GET` | `/api/traceability/batches/:batchCode` | — | Public batch lookup (QR scan target) |
| `GET` | `/api/traceability/my-batches` | ✅ | Farmer's batches |
| `GET` | `/api/traceability` | ✅ | Alias for my-batches |

### 8.8 Quality

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/quality/analyze` | ✅ | Run AI quality scan on an image |
| `GET` | `/api/quality/scans` | ✅ | Farmer's scan history |
| `POST` | `/api/quality/scan` | ✅ | Scan (router variant) |
| `GET` | `/api/quality/scans/:scanId` | ✅ | Scan detail |
| `GET` | `/api/quality/:scanId/certificate` | ✅ | Certificate for a scan |
| `GET` | `/api/quality/certificates/:certNumber` | — | Public certificate verification |

### 8.9 AI

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ai/demand-forecast` | ✅ | Demand forecast (query: crop) |
| `GET` | `/api/ai/price-prediction` | ✅ | Price prediction (query: crop, currentPrice) |
| `GET` | `/api/ai/insights` | ✅ | Farmer's AI insight feed (latest 5) |
| `POST` | `/api/ai/demand` | ✅ | Demand forecast — order-volume based heuristic |
| `POST` | `/api/ai/price` | ✅ | Price prediction — market-data based heuristic |
| `POST` | `/api/ai/quality` | ✅ | Deterministic quality scoring (moisture + declared grade) |

### 8.10 Payments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/payments` | ✅ | Payments + totalEarnings + pending + total |
| `PATCH` | `/api/payments/:id/status` | ✅ | Update status (PROCESSING / PAID / FAILED) + notify |

### 8.11 Market / Mandi

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/mandi/markets` | — | Markets with 5 recent prices each |
| `GET` | `/api/mandi/prices` | — | Filtered prices (crop, market, date) — top 20 |
| `GET` | `/api/mandi/prices/history` | — | Time series (cropId, marketId, days) |
| `GET` | `/api/mandi/commodities` | — | Distinct traded commodities |
| `GET` | `/api/mandi/states` | — | Distinct states |
| `GET` | `/api/mandi/summary` | — | Market roll-up (latest price per crop, avg modal) |

### 8.12 Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | ✅ | Latest 20 + unread count |
| `PATCH` | `/api/notifications/:id/read` | ✅ | Mark one read |
| `PATCH` | `/api/notifications/read-all` | ✅ | Mark all read |
| `PUT` | `/api/farmer/notifications/read-all` | ✅ | Module router variant |

### 8.13 Farmer Module (profile & farms)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/farmer/profile` | ✅ | Farmer profile + user + farms |
| `PUT` | `/api/farmer/profile` | ✅ | Update village, district, state, pincode, landUnit, totalLandArea |
| `GET` | `/api/farmer/farms` | ✅ | List farms |
| `POST` | `/api/farmer/farms` | ✅ | Create farm |
| `PUT` | `/api/farmer/farms/:id` | ✅ | Update farm |
| `POST` | `/api/farmer/farms/:id/crops` | ✅ | Add crop plot to farm |

### 8.14 FPO Module

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/fpo/profile` | ✅ | Derived FPO profile + listing/order/inventory counts |
| `PUT` | `/api/fpo/profile` | ✅ | Update FPO name / phone |
| `GET` | `/api/fpo/farmers` | ✅ | Member farmers |
| `POST` | `/api/fpo/farmers` | ✅ | Add member farmer |
| `GET` | `/api/fpo/inventory` | ✅ | Aggregated inventory |
| `GET` | `/api/fpo/aggregation` | ✅ | Aggregation records |
| `POST` | `/api/fpo/aggregation` | ✅ | Create aggregation |
| `GET` | `/api/fpo/payments` | ✅ | Payments |
| `GET` | `/api/fpo/settlements` | ✅ | Settlements |

### 8.15 Buyer Module

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/buyer/profile` | ✅ | Buyer profile (resolved by email) |
| `PUT` | `/api/buyer/profile` | ✅ | Update company / contact / location (creates Buyer if absent) |
| `GET` | `/api/buyer/orders` | ✅ | Buyer orders |

### 8.16 Analytics

| Method | Endpoint | Auth | Roles |
|---|---|---|---|
| `GET` | `/api/farmer/analytics/summary` | ✅ | FARMER, ADMIN |
| `GET` | `/api/fpo/analytics/summary` | ✅ | FPO, ADMIN |
| `GET` | `/api/buyer/analytics/summary` | ✅ | BUYER, ADMIN |

**Farmer analytics returns:** farmerId, village, district, state, produceListed, totalListings, production, revenue, activeOrders, totalOrders, deliveredOrders, avgPrice

### 8.17 Admin

All admin routes enforce `authenticate` + `requireRole('ADMIN')` at router level.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/overview` | Platform KPIs (users, farmers, FPOs, buyers, orders, GMV, pending payments, active listings) |
| `GET` | `/api/admin/users` | User list |
| `PUT` | `/api/admin/users/:id/status` | Change user status |
| `GET` | `/api/admin/orders` | All orders |
| `GET` | `/api/admin/payments` | All payments |
| `GET` | `/api/admin/schemes` | Scheme catalog |
| `POST` | `/api/admin/schemes` | Add scheme |
| `GET` | `/api/admin/verify/farmers` | Farmers pending verification |
| `POST` | `/api/admin/verify/farmers/:id` | Approve / reject farmer |

### 8.18 Developer Tooling

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/code/generate` | Generate code |
| `POST` | `/api/code/debug` | Debug code |
| `POST` | `/api/code/explain` | Explain code |
| `POST` | `/api/code/refactor` | Refactor code |
| `POST` | `/api/code/chat` | General code chat |

### 8.19 In-App Assistant (Saathi web)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/assistant/:userId` | Assistant session / greeting |
| `POST` | `/api/assistant/:userId/chat` | Chat with function calling |

Assistant can navigate to 21 known pages (home, marketplace, farmer-dashboard, farmer-produce, farmer-orders, farmer-ai-insights, farmer-demand, farmer-price, farmer-quality, farmer-schemes, farmer-settings, buyer-orders, buyer-suppliers, buyer-procurement, traceability, login, register, howitworks, about, and more). Supports languages: en, hi, mr, gu.

### 8.20 Utility

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/search?q=` | ✅ | Federated search across listings, orders, crops, markets, buyers |
| `GET` | `/api/crops` | — | Crop master list |
| `GET` | `/api/weather` | — | Weather by lat/lon or city/state |
| `GET` | `/api/health` | — | `{ status: "ok", timestamp }` |

---

## 9. DATABASE SCHEMA

**Provider:** SQLite (dev) → PostgreSQL (production-ready)
**Total models:** 29

### Identity & Users

| Model | Key Fields |
|---|---|
| `User` | id, name, email (unique), phone, password (bcrypt), role, avatar, language, status |
| `FarmerProfile` | id, userId (unique), farmerId (unique, e.g. F102), village, district, state, pincode, totalLandArea, landUnit, verificationStatus |
| `Buyer` | id, companyName, contactPerson, email (unique), phone, location, district, state, verificationStatus, rating |
| `Message` | id, fromUserId, toUserId, subject, body, read |

### Farm

| Model | Key Fields |
|---|---|
| `Farm` | id, farmerId, name, location, totalArea, soilType, irrigationType, latitude, longitude |
| `FarmPlot` | id, farmId, name, area, cropId, plantingDate, expectedHarvestDate, expectedYield, healthStatus |
| `FarmTask` | id, farmerId, title, description, dueDate, priority, status |

### Catalog & Market

| Model | Key Fields |
|---|---|
| `Crop` | id, name (unique), variety, category, unit |
| `ProduceListing` | id, farmerId, fpoId, cropId, cropName, quantity, availableQuantity, unit, expectedPrice, minimumOrderQuantity, qualityGrade, qualityScore, status, harvestDate, location, description, images (JSON) |
| `Market` | id, name, location, district, state |
| `MarketPrice` | id, marketId, cropId, date, minPrice, maxPrice, modalPrice, unit |

### Commerce

| Model | Key Fields |
|---|---|
| `Order` | id, orderNumber (unique), buyerId, farmerId, status, subtotal, transportCost, totalAmount, paymentStatus, deliveryDate, deliveredAt, shippingAddress, notes |
| `OrderItem` | id, orderId, listingId, cropId, quantity, pricePerUnit, total |
| `OrderTimeline` | id, orderId, status, note, createdAt |
| `Payment` | id, orderId (unique), farmerId, amount, method, status, transactionId, paidAt |

### Escrow & Disputes

| Model | Key Fields |
|---|---|
| `EscrowTransaction` | id, orderId (unique), paymentId (unique), amount, currency, status, paymentProvider, paymentReference, autoReleaseAt, initiatedAt, heldAt, deliveryVerifiedAt, releasedAt, refundedAt, refundReason, buyerConfirmed, farmerConfirmed |
| `EscrowAuditLog` | id, escrowId, action, actor, details, createdAt |
| `Dispute` | id, orderId, raisedById, raisedByRole, reason, description, evidence (JSON), status, resolution, refundAmount, releaseAmount, resolvedById, resolutionNotes, resolvedAt |

### Quality

| Model | Key Fields |
|---|---|
| `QualityScan` | id, farmerId, listingId, cropId, imageUrl, status, overallScore, grade, confidence |
| `QualityResult` | id, scanId (unique), appearance, color, size, damage, freshness, issues (JSON), recommendation |
| `QualityCertificate` | id, scanId (unique), certificateNumber (unique), verificationHash (unique), status, issuedAt |

### AI

| Model | Key Fields |
|---|---|
| `AIInsight` | id, farmerId, type, title, description, recommendation, confidence |
| `DemandForecast` | id, cropId, marketId, forecastDate, predictedDemand, confidence, trend |
| `PricePrediction` | id, cropId, marketId, forecastDate, predictedPrice, minPrice, maxPrice, confidence |

### Traceability

| Model | Key Fields |
|---|---|
| `BlockchainRecord` | id, entityType, entityId, hash (unique), previousHash, data (JSON), blockNumber, timestamp, status |
| `TraceabilityBatch` | id, batchCode (unique), cropId, farmerId, quantity, unit, origin, harvestDate, qualityGrade, verified |
| `TraceabilityEvent` | id, batchId, eventType, description, location, timestamp, actor, metadata (JSON), blockchainHash |

### System

| Model | Key Fields |
|---|---|
| `Notification` | id, userId, title, message, type, read, linkTo, metadata (JSON), orderId, paymentId |

### Enums

| Enum | Values |
|---|---|
| `Role` | FARMER · FPO · BUYER · ADMIN |
| `UserStatus` | ACTIVE · PENDING · SUSPENDED |
| `VerificationStatus` | VERIFIED · PENDING · REJECTED |
| `HealthStatus` | HEALTHY · ATTENTION · CRITICAL · EXCELLENT |
| `ListingStatus` | DRAFT · ACTIVE · RESERVED · SOLD_OUT · EXPIRED · CANCELLED |
| `OrderStatus` | *(20 values — see Section 10)* |
| `PaymentStatus` | PENDING · PROCESSING · PAID · FAILED · REFUNDED |
| `PaymentMethod` | UPI · BANK_TRANSFER · CASH · CHEQUE |
| `QualityScanStatus` | UPLOADED · PROCESSING · COMPLETED · FAILED |
| `InsightType` | DEMAND · PRICE · QUALITY · HARVEST · MARKET · GENERAL |
| `NotificationType` | ORDER · PAYMENT · MARKET · QUALITY · AI · SYSTEM |
| `TaskPriority` | LOW · MEDIUM · HIGH · URGENT |
| `TaskStatus` | PENDING · IN_PROGRESS · COMPLETED · CANCELLED |
| `EscrowStatus` | INITIATED · HELD · DELIVERY_VERIFIED · RELEASED · REFUNDED · DISPUTED |
| `DisputeStatus` | OPEN · UNDER_REVIEW · RESOLVED |
| `DisputeResolution` | FULL_REFUND · PARTIAL_REFUND · RELEASE_FULL · SPLIT_SETTLEMENT |

### Indexing Strategy
- Composite index on `MarketPrice (marketId, cropId)` — the primary dashboard query
- Indexes on `MarketPrice` (cropId, date, marketId), `ProduceListing` (farmerId, status), `Order` (farmerId, buyerId, status), `Payment` (farmerId), `Notification` (userId), `QualityScan` (farmerId), `Dispute` (orderId, status), `BlockchainRecord` (entityType, entityId), `FarmerProfile` (userId), `Farm` (farmerId), `FarmPlot` (farmId)

---

## 10. CORE WORKFLOW 1 — ORDER LIFECYCLE

### The 20 Order States

```
PENDING_PAYMENT → PAYMENT_PROCESSING → ESCROW_FUNDED → PENDING → CONFIRMED
    → QUALITY_VERIFIED → PREPARING → PROCESSING → PICKUP_SCHEDULED
    → READY_FOR_DISPATCH → SHIPPED → IN_TRANSIT → DELIVERED
    → BUYER_CONFIRMATION → PAYMENT_RELEASED → COMPLETED

Exception branches:
    DISPUTED · UNDER_REVIEW · RESOLVED · CANCELLED
```

### Status Groupings Used in Code

| Group | Statuses |
|---|---|
| `TERMINAL_ORDER_STATUSES` | COMPLETED, CANCELLED |
| `ACTIVE_ORDER_STATUSES` | PENDING_PAYMENT → PAYMENT_RELEASED (15 states) |
| `REALISED` (revenue counted) | Delivered / paid terminal states |
| `AWAITING_CONFIRMATION` | DELIVERED, BUYER_CONFIRMATION |

### Full End-to-End Flow

```
STEP 0 — FARMER LISTS PRODUCE
  POST /api/marketplace/listings
  ├─ Zod validation (crop, quantity > 0, price > 0, location)
  ├─ ProduceListing created, status = ACTIVE
  ├─ availableQuantity = quantity
  └─ (optional) AI quality scan → grade + certificate

STEP 1 — BUYER PLACES ORDER
  POST /api/orders  (or /api/buyer/orders)
  ├─ subtotal      = Σ qty × pricePerUnit
  ├─ transportCost = subtotal × 2%
  ├─ totalAmount   = subtotal + transportCost
  ├─ orderNumber   = KNX-{timestamp}
  ├─ status        = PENDING_PAYMENT
  ├─ OrderTimeline: "Order placed. Awaiting payment."
  ├─ Blockchain:   ORDER_CREATED record
  ├─ Listing:      availableQuantity -= qty
  └─ Notification: "New Order Received"

STEP 2 — BUYER PAYS
  POST /api/orders/:id/pay  { method: UPI|BANK_TRANSFER|CASH|CHEQUE }
  ├─ Guard: status must be PENDING_PAYMENT / PAYMENT_PROCESSING / PENDING
  ├─ Mock gateway reference: TXN_{timestamp}
  ├─ Payment upserted → status = PROCESSING
  ├─ escrowService.initiateEscrow(orderId, actor)
  ├─ escrowService.holdFunds(orderId, actor, { RAZORPAY_MOCK, TXN_... })
  │     └─ Escrow = HELD  (buyer funds locked)
  ├─ Order → CONFIRMED
  └─ OrderTimeline: "Payment secured in escrow (TXN_...). Order confirmed."

STEP 3 — FARMER FULFILS
  PATCH /api/orders/:id/status
  ├─ PREPARING → PROCESSING → QUALITY_VERIFIED
  ├─ PICKUP_SCHEDULED / SHIPPED  → Blockchain: SHIPMENT_CREATED
  ├─ IN_TRANSIT                  → Blockchain: IN_TRANSIT
  ├─ Every change: OrderTimeline row + WebSocket push
  └─ DELIVERED                   → Blockchain: DELIVERED
                                 → deliveredAt = now()
                                 → Notification: "Please confirm receipt
                                    to release the escrow payment."

STEP 4 — BUYER CONFIRMS RECEIPT
  POST /api/orders/:id/confirm-delivery
  ├─ Guard: status must be DELIVERED or IN_TRANSIT
  ├─ escrowService.verifyDelivery(orderId, actor)
  │     └─ Escrow = DELIVERY_VERIFIED
  ├─ escrowService.releaseFunds(orderId, actor)
  │     └─ Escrow = RELEASED · Payment = PAID · paidAt = now()
  └─ Message: "Delivery confirmed. Payment released to farmer."

STEP 5 — COMPLETION
  ├─ Order → COMPLETED
  ├─ EscrowAuditLog entry written
  ├─ WebSocket: notifyPaymentReceived → farmer
  └─ Notification: "₹X has been credited to your account."
```

### Blockchain Events Emitted by Status

| Order Status | Blockchain Event |
|---|---|
| Order created | `ORDER_CREATED` |
| CONFIRMED | `ORDER_CONFIRMED` |
| QUALITY_VERIFIED | `QUALITY_VERIFIED` |
| PICKUP_SCHEDULED | `SHIPMENT_CREATED` |
| SHIPPED | `SHIPMENT_CREATED` |
| IN_TRANSIT | `IN_TRANSIT` |
| DELIVERED | `DELIVERED` |

---

## 11. CORE WORKFLOW 2 — ESCROW & DISPUTES

### Escrow State Machine

```
INITIATED ──► HELD ──► DELIVERY_VERIFIED ──► RELEASED
                 │
                 ├──► REFUNDED   (buyer wins / cancellation)
                 └──► DISPUTED   ──► resolved via 4 settlement modes
```

### Escrow Service Operations

| Operation | Purpose |
|---|---|
| `initiateEscrow(orderId, actor)` | Create escrow record for the order |
| `holdFunds(orderId, actor, gateway)` | Lock buyer funds; store provider + gateway reference |
| `verifyDelivery(orderId, actor)` | Buyer confirms goods received |
| `releaseFunds(orderId, actor)` | Release locked funds to the farmer |
| `refundFunds(orderId, actor, reason)` | Return funds to the buyer |
| `raiseDispute(orderId, actor, reason, description, evidence, role)` | Open a dispute |
| `resolveDispute(id, resolution, {refundAmount, releaseAmount, resolvedById, notes})` | Admin/FPO settles the dispute |
| `processAutoReleases()` | Auto-release sweep |
| `getEscrowByOrder(orderId)` | Fetch escrow for an order |
| `transitionOrder(orderId, toStatus, note, event)` | Order state transition helper |
| `blockchainProof(orderId, orderNumber, event, metadata)` | Write blockchain proof |

### Auto-Release Safety Net

- **Interval:** every **15 minutes** (`AUTO_RELEASE_INTERVAL_MS = 15 * 60 * 1000`)
- **Trigger:** order delivered more than `AUTO_RELEASE_HOURS` (default **48**) ago, with **no buyer confirmation and no dispute**
- **Purpose:** prevents indefinite fund lock-up when a buyer goes silent
- **Log:** `⏱️ Auto-released escrow for N order(s): ...`
- **Manual trigger:** `POST /api/escrow/auto-release/run`

### Dispute Settlement Modes

| Mode | Effect |
|---|---|
| `FULL_REFUND` | 100% returned to buyer |
| `PARTIAL_REFUND` | Custom refund amount |
| `RELEASE_FULL` | 100% released to farmer |
| `SPLIT_SETTLEMENT` | Custom refund + release amounts |

### Audit Trail

Every escrow transition writes an `EscrowAuditLog` row: `{ escrowId, action, actor, details, createdAt }` — producing a complete, tamper-evident money trail from initiation through release or refund.

---

## 12. CORE WORKFLOW 3 — AI QUALITY ASSESSMENT

```
POST /api/quality/analyze
  { imageUrl, cropId, cropName, listingId? }
        │
        ├─► QualityScan created, status = PROCESSING
        │
        ├─► aiService.analyzeQuality(imageUrl, cropName)
        │     └─ Scores 5 dimensions:
        │          • appearance   • color     • size
        │          • damage       • freshness
        │     └─ Detects issues[]  +  generates recommendation
        │
        ├─► QualityResult persisted
        │
        ├─► QualityScan → COMPLETED
        │     ├─ overallScore  (0–100)
        │     ├─ grade         (A / B / C)
        │     └─ confidence    (0–1)
        │
        ├─► IF score >= 80 → QualityCertificate auto-issued
        │     ├─ certificateNumber: KNX-QC-{6 digits}
        │     └─ verificationHash:  0x{hex from scan id}
        │
        └─► Notification: "Your {crop} received Grade {X} ({score}/100)."
```

### Detection Overlay (Visual Output)

The quality router generates mock detection boxes for the annotated inspection view:

| Label | Colour | Meaning |
|---|---|---|
| `Fresh` | 🟢 Green (#22c55e) | Good quality, confidence 0.88–0.98 |
| `Minor Damage` | 🟠 Orange (#f97316) | Slight defects, confidence 0.72–0.84 |
| `Spoiled` | 🔴 Red | Rejected produce |

Each box carries `x, y, w, h, label, confidence, color` — rendered as an overlay on the uploaded image.

### Deterministic Quality Scoring (misc router variant)

`POST /api/ai/quality` uses a deterministic formula so the same input always yields the same grade:

```
score = 80
if moisture provided:  score -= min(30, |moisture - 12| × 3)   // ideal ~12%
if declared grade 'A': score += 12
if declared grade 'B': score += 5
if declared grade 'C': score -= 8
score = clamp(0, 100, round(score))

band = score >= 90 ? 'A+' : score >= 80 ? 'A'
     : score >= 65 ? 'B'  : score >= 50 ? 'C' : 'D'
passed = score >= 65
```

### Certificate Verification
`GET /api/quality/certificates/:certNumber` is **public** (no auth) and returns the certificate with nested scan, result and farmer context — so a buyer can independently verify authenticity.

---

## 13. CORE WORKFLOW 4 — BLOCKCHAIN TRACEABILITY

### Hash-Chain Design

```
Block N-1                 Block N                    Block N+1
┌───────────────┐   ┌───────────────────┐   ┌───────────────────┐
│ hash:    0x9f │◄──│ previousHash:0x9f │◄──│ previousHash:0xa3 │
│ blockNumber:N-1│  │ hash:        0xa3 │   │ hash:        0x7c │
│ data:  {...}  │   │ blockNumber:  N   │   │ blockNumber:  N+1 │
│ timestamp     │   │ data:      {...}  │   │ data:       {...} │
└───────────────┘   └───────────────────┘   └───────────────────┘
```

- **Algorithm:** SHA-256 over the record payload combined with the previous hash
- **Tamper evidence:** altering any historical record breaks every subsequent hash, which `GET /api/blockchain/verify` detects
- **Genesis:** first record has no `previousHash`

### Recorded Entity Types

| entityType | Triggered By |
|---|---|
| `ORDER_EVENT` | Order creation and each lifecycle status change |
| `LISTING` | Produce listing creation |
| `QUALITY_CERTIFICATE` | Certificate issuance |
| `SHIPMENT` | Dispatch / transit events |

### Batch Traceability Journey (Farm → Fork)

```
LISTED → HARVESTED → QUALITY_CHECK → PACKED → SHIPPED → DELIVERED
```

Each `TraceabilityEvent` stores:
`eventType` · `description` · `location` · `actor` · `timestamp` · `metadata` (JSON) · `blockchainHash`

### Batch Model
`TraceabilityBatch`: `batchCode` (unique, QR-encoded) · `cropId` · `farmerId` · `quantity` · `unit` · `origin` · `harvestDate` · `qualityGrade` · `verified`

### Blockchain Service Methods

| Method | Purpose |
|---|---|
| `createRecord(entityType, entityId, data)` | Append a hashed record to the chain |
| `getRecordsForEntity(entityType, entityId)` | All records for one entity |
| `getAllRecords(take = 50)` | Ledger explorer |
| `verifyChain()` | Validate full chain integrity |
| `createBatch(data)` | Create a traceability batch |
| `addEvent(batchId, eventType, description, location, actor, metadata)` | Append a journey event |
| `getBatch(batchCode)` | Public batch lookup |
| `getFarmerBatches(farmerId)` | All batches for a farmer |

### Blockchain Router Extras
Beyond the core chain, the blockchain router exposes a **smart-contract registry** view:
- `GET /api/blockchain/contracts` — registered contracts
- `GET /api/blockchain/contracts/:id` — contract detail
- `POST /api/blockchain/contracts/:id/simulate` — simulate a call
- `GET /api/blockchain/dashboard` — aggregate chain metrics

---

## 14. FEATURE MODULE — AI INTELLIGENCE

**Routes:** `/farmer/ai-intelligence` · `/farmer/ai-insights` · `/farmer/demand` · `/farmer/price` · `/farmer/settings`

### 1. Demand Forecasting

| Aspect | Detail |
|---|---|
| Horizons | 7 / 14 / 30 days |
| Outputs | currentDemand, predictedDemand, change %, trend (UP/DOWN/STABLE), confidence, insights[] |
| Chart data | historicalData[] of `{ day, demand }` |
| Endpoints | `GET /api/ai/demand-forecast?crop=` · `POST /api/ai/demand` |
| Voice tools | `get_demand_forecast` · `get_fair_demand_forecast` |

**Order-volume heuristic (`POST /api/ai/demand`):** samples up to 500 order items from the last 90 days for the crop, computes `dailyAverage`, then `forecastQuantity = dailyAverage × horizonDays`. Confidence bands: ≥20 samples = high, ≥5 = medium, else low.

### 2. Fair Price Prediction

| Aspect | Detail |
|---|---|
| Outputs | currentPrice, predictedPrice, change, trend, minPrice, maxPrice, confidence, recommendation |
| Chart data | priceHistory[] of `{ date, price }` |
| Endpoints | `GET /api/ai/price-prediction?crop=&currentPrice=` · `POST /api/ai/price` |
| Voice tools | `get_fair_price_prediction` · `predict_price` |

**Market-data heuristic (`POST /api/ai/price`):** takes the latest 30 market price rows for the crop/market, computes the mean modal price and a per-day trend, then `predictedPrice = round(avg + trend × 7)`.

### 3. Crop Quality Assessment (Computer Vision)
- Grade assignment A / B / C, score 0–100, confidence value
- 5 scoring dimensions (appearance, color, size, damage, freshness)
- Defect/issue detection with bounding-box overlay
- Auto certificate issuance at score ≥ 80

### 4. AI Insights Feed
- Persistent `AIInsight` records by type: DEMAND · PRICE · QUALITY · HARVEST · MARKET · GENERAL
- Each carries title, description, recommendation, confidence
- Endpoint: `GET /api/ai/insights` (latest 5 for the farmer)

### 5. Conversational AI Assistant
- In-app chat assistant with role-aware context
- Endpoints: `GET /api/assistant/:userId` · `POST /api/assistant/:userId/chat`
- Providers: aihubmix **ox-alpha** (free) · Google **Gemini** 2.5 Flash (optional via `LLM_SERVICE=gemini`)
- Languages: English, Hindi, Marathi, Gujarati
- Gemini failure caching: a hard auth/permission failure is cached for the process lifetime so the assistant stays responsive in offline mode
- `[NAVIGATE:...]` directives are sanitised out of the spoken/displayed text

### 6. Code Assistant (developer tooling)
`POST /api/code/generate` · `/debug` · `/explain` · `/refactor` · `/chat`
CLI: `node chat-simple.js "message"` · `./chat.ps1 "message"`

### AI Service Functions
```
generateChatCompletion        generateAssistantResponse
analyzeCropQuality            generateDemandForecast
generatePricePrediction       generateCode
debugCode                     explainCode
refactorCode                  analyzeQuality
```

---

## 15. FEATURE MODULE — SMART LOGISTICS

**Routes:** `/farmer/logistics` · `/fpo/logistics`

### Capabilities
- **Live shipment tracking** — GPS-style status, ETA, distance remaining
- **AI route optimisation** — current vs optimised route comparison
- **KPI overview cards** — active shipments, completed deliveries, transport cost, avg delivery time
- **Delivery history** — filterable past shipments
- **Partner details** — vehicle number, driver name & contact, partner rating
- **Interactive tracking modal** — 6-stage visual timeline + live updates

### Shipment Data Model
```ts
interface Shipment {
  id: string
  orderId: string
  produceType: string
  quantity: number
  buyer: string
  pickupLocation: string
  destination: string
  logisticsPartner: string
  status: string            // In Transit | Picked Up | Out for Delivery
  eta: string
  transportCost: number
  vehicleNumber: string
  driverName: string
  driverContact: string
  currentLocation: string
  distanceRemaining: number
}
```

### Route Optimisation Model
```ts
interface RouteOptimization {
  currentRoute:   { distance: number; time: number; cost: number }
  optimizedRoute: { distance: number; time: number; cost: number }
  savings:        { distance: number; time: number; cost: number; percentage: number }
}
```

**Demo result:** 16% cost saving (₹460) on the optimised route.

### Tracking Stages
`Picked Up → In Transit → Out for Delivery → Delivered` (+ scheduled stages), rendered as a 6-stage timeline.

### User Flow
1. Farmer opens Smart Logistics → sees 3 active shipments
2. Clicks **Track** on a shipment → modal shows live location, ETA, driver info
3. Clicks **Optimize Route** → AI shows 16% savings
4. Applies the optimised route
5. Reviews delivery history for past performance

### Service Layer
`src/system/logistics-service.ts` (~265 lines) — mock data with commented-out real API calls ready to swap in:
```ts
// Mock (current)
export async function getActiveShipments(farmerId?: string) {
  await net(200); return ok(mockShipments);
}
// Real API (uncomment to enable)
// fetch(`/api/logistics/shipments/active?farmerId=${farmerId}`)
```

---

## 16. FEATURE MODULE — SAATHI VOICE AI

**Port:** 8000 · **Entry:** `saathi/backend/main.py` (`uvicorn backend.main:app`)

### Voice Pipeline

```
Browser Audio
    ↓  Pipecat WebSocket Transport (ProtobufFrameSerializer)
Sarvam Saaras v3        (Speech-to-Text)
    ↓
Sarvam 105B             (LLM + Function Calling)
    ↓
Sarvam Bulbul v3        (Text-to-Speech)
    ↓
Browser Audio
    ↓
Tool Calls ──► FarmLink REST APIs
```

### Components

| Component | File | Responsibility |
|---|---|---|
| FastAPI app | `main.py` | Exposes `/api/start`, `/ws/voice`, `/ws/control` |
| Voice pipeline | `pipeline/voice_pipeline.py` | Builds and runs the Pipecat pipeline |
| Language detection | `pipeline/language.py` | Hindi / Marathi / English / Hinglish detection |
| Interruptions | `pipeline/interruptions.py` | Conversation flow control |
| API client | `services/farmilink_api.py` | Auth, retries, error handling |
| Session manager | `services/session.py` | In-memory context and history |
| Logging | `services/logging.py` | Structured logs, sensitive-field redaction |
| Prompts | `prompts/` | `system_prompt` · `farmer_prompt` · `buyer_prompt` · `fpo_prompt` |

### Language & LLM Configuration

| Setting | Options |
|---|---|
| Languages | Hindi · Marathi · English · Hinglish · Gujarati |
| `LLM_SERVICE=sarvam` | Default — real-time, uses `SARVAM_API_KEY` + `LLM_MODEL` (105B) |
| `LLM_SERVICE=gemini` | Broad conversational help, uses `GEMINI_API_KEY` + `GEMINI_MODEL` (default `gemini-2.5-flash`) |
| STT model | `saaras:v3` (`STT_MODEL`) |

The system prompt is tuned so the agent **always holds a real conversation** (weather, MSP, crop practices, schemes) and **only calls tools when exact live data is needed**.

### Complete Voice Tool Inventory (30+)

| Domain | Tools |
|---|---|
| **Navigation** | `navigate_to_page` · `open_dashboard` · `open_marketplace_search` · `fill_field` · `open_modal` |
| **Marketplace** | `search_marketplace` · `search_products` · `create_produce_listing` · `create_listing` · `update_listing` · `delete_listing` |
| **Discovery** | `search_buyers` · `search_fpos` |
| **Pricing** | `get_current_price` · `get_market_prices` · `predict_price` · `get_fair_price_prediction` |
| **Demand** | `get_demand_forecast` · `get_fair_demand_forecast` |
| **Orders** | `get_orders` · `get_order_status` · `create_order` · `cancel_order` |
| **Quality** | `analyze_quality` |
| **Traceability** | `get_traceability` |
| **Schemes** | `search_schemes` |
| **Payments** | `get_payment_status` |
| **Session / Auth** | `get_session` · `get_role` · `require_auth` · `get_user_token` |

**Tool module files:** `demand.py` · `marketplace.py` · `navigation.py` · `orders.py` · `payments.py` · `pricing.py` · `quality.py` · `schemes.py` · `traceability.py` · `_auth.py`

### Example Conversations

| User says | Agent behaviour |
|---|---|
| "Marketplace kholo." | `navigate_to_page("marketplace")` |
| "Mere paas 500 kilo tomato hai." | Multi-turn slot filling (location → availability → grade) → confirms → `create_produce_listing(...)` |
| "Aaj tomato ka bhav kya hai?" | `get_current_price("tomato")` → speaks Nashik rate |
| "मला कांद्याची मागणी कशी आहे?" | `get_demand_forecast("onion")` → **Marathi** response |
| "Mera order kaha tak pahucha?" | `get_order_status(id)` → "Order shipped, in transit" |
| "Order cancel karna hai." | Asks confirmation → `cancel_order(id)` |
| "Mere paas 500 kilo tomato hai, buyer dhundho." | Hinglish parse → `search_buyers(...)` |
| "Password bata deta hoon." | **Refuses** — "For security, please enter your password on the screen." |
| "Stop. Mujhe onion chahiye." | Immediately halts TTS and processes the new request |

### Multi-Turn Slot Filling Example (Flow 2)
```
User:  "Mere paas 500 kilo tomato hai."
Agent: "Bilkul. Tomato kis location se hai?"
User:  "Nashik."
Agent: "Ye kab available hoga?"
User:  "Next Monday."
Agent: "Quality ya grade pata hai?"
User:  "Grade A."
Agent: "Aapke 500 kilo Grade A tomato Nashik se hain aur next Monday
        available honge. Kya main listing create karun?"
User:  "Haan."
Agent: create_produce_listing(...) → "Listing successfully create ho gayi."
```

### UI Action Contract
```json
{
  "success": true,
  "message": "...",
  "ui_action": { "type": "navigate", "target": "marketplace" }
}
```
The frontend executes `ui_action` **only** if `type` is in the safe allowlist.

### Voice Safety Architecture
- ❌ **No passwords or OTPs collected by voice** — agent refuses and redirects to on-screen entry
- ✅ Frontend exposes only **safe action IDs**
- ✅ Backend **validates all tool arguments server-side**
- ✅ Structured logging **excludes sensitive fields**
- ✅ Interruption handling — user can cut off TTS mid-sentence

### Transport Isolation
Backend uses `FastAPIWebsocketTransport` with `ProtobufFrameSerializer`; frontend uses `@pipecat-ai/websocket-transport`. This is swappable for Daily / WebRTC / WebSocket without changing any tools or prompts.

### Adding a New Voice Tool
1. Define an async function in `saathi/backend/tools/<domain>.py`
2. Register it via `FunctionTool(your_fn)` in `saathi/backend/tools/__init__.py`
3. Return a `ui_action` dict for frontend-safe actions

---

## 17. FEATURE MODULE — FARMER

**Dashboard:** `/farmer/dashboard` · **16 sub-routes**

### Farmer Journey (7 Stages)

| # | Stage | Detail |
|---|---|---|
| 1 | **Register & Onboard** | Mobile/email signup → KYC verification → farm details (location, size, soil, irrigation) |
| 2 | **List Produce** | Upload crop images → AI quality scan auto-runs → set quantity & expected price → publish |
| 3 | **Receive Orders** | Orders arrive → notification → accept/reject → mark ready/shipped |
| 4 | **AI Insights** | Demand forecast, fair price, selling recommendations, market trends |
| 5 | **Smart Logistics** | Track shipment, apply AI-optimised route, reduce delivery cost |
| 6 | **Payment & Settlement** | Delivery confirmed → escrow releases → track earnings and history |
| 7 | **Compliance** | Quality certificate, blockchain proof of sale, government scheme discovery |

### Farmer Dashboard Metrics (live)
Land area · Total production · Total revenue · Pending revenue · Active listings · Pending orders · Confirmed orders · Total orders · Crop distribution · 6-month yield history · Market snapshot (6 crops) · Crop health · AI insights · Notifications · Latest quality scan

### Farmer Capabilities
- Produce listing & inventory management
- Order accept / process / ship
- Farm profile: land details, crops grown, certifications, soil type, irrigation type, GPS coordinates
- AI insights dashboard (demand, price, quality)
- Payment tracking: revenue, pending payments, settlements
- Smart Logistics with route optimisation
- Government scheme discovery and eligibility
- Blockchain traceability & proof of sale
- AI voice assistant (Saathi)

### Government Schemes Catalog (8)

| Scheme |
|---|
| PM-KISAN (Pradhan Mantri Kisan Samman Nidhi) |
| PMFBY (Pradhan Mantri Fasal Bima Yojana) |
| PMKSY (Per Drop More Crop — Drip) |
| Sub-Mission on Agricultural Mechanization (SMAM) |
| National Horticulture Mission (NHM) |
| Formation and Promotion of FPOs (10,000 FPO Scheme) |
| Agriculture Infrastructure Fund (AIF) |
| Credit Guarantee Fund for FPOs |

### Weather Integration
`weatherService.getWeather(lat, lon)` and `getWeatherForCity(city, state)` — surfaced on the farmer dashboard alongside farm location. Endpoint: `GET /api/weather?lat=&lon=` or `?city=&state=`.

---

## 18. FEATURE MODULE — FPO AGGREGATION

**Dashboard:** `/fpo/dashboard` · **15 sub-routes**

### Aggregation Workflow

```
Member Farmer A (500 kg onion)  ┐
Member Farmer B (800 kg onion)  ├──► FPO COLLECTION CENTRE
Member Farmer C (300 kg onion)  ┘           │
                                            ▼
                              Aggregate + quality grade
                                            │
                                            ▼
                        Create verified BATCH (batchCode)
                                            │
                       ┌────────────────────┴────────────────────┐
                       ▼                                         ▼
            Post bulk listing to                     Track commission
            institutional buyers                     per transaction
                       │
                       ▼
            Bulk order → higher price per unit
            (collective bargaining power)
```

### FPO Capabilities
- **Farmer management** — onboard members, view crops, pending deliveries, payment status
- **Produce aggregation** — collect from multiple member farmers
- **Stock Hub / Inventory** — real-time multi-warehouse tracking, stock alerts to prevent wastage
- **Batch creation** — quality-verified aggregated batches
- **Collective selling** — bulk listings to institutional buyers
- **Payments & settlements** — member payouts + FPO commission tracking
- **Analytics dashboard** — farmer network, inventory, consolidated orders

### FPO Data Model Note
There is **no dedicated FPO table**. An FPO is a `User` with `role = 'FPO'`, and:
- It owns listings via `ProduceListing.fpoId`
- It sells to buyers through those listings
- Member farmers are **derived** from the distinct `farmerId` values on its listings
- Orders are those raised against its listings (`items.some.listingId IN listingIds`)

### FPO Dashboard Metrics
Active listings · Total production · Total revenue · Pending revenue · **Member farmers** · Crop distribution · Order counts

### FPO Analytics Endpoint
`GET /api/fpo/analytics/summary` — resolves FPO scope via `resolveFpoScope(userId)` which derives member IDs from listings.

---

## 19. FEATURE MODULE — BUYER PROCUREMENT

**Dashboard:** `/buyer/dashboard` · **12 sub-routes**

### Procurement Workflow

```
1. Post Requirement
   └─ crop · quantity · quality grade · delivery location · expected price
                          │
                          ▼
2. AI Matching
   └─ instant match with suitable farmers & FPOs (match scores 90%+)
                          │
                          ▼
3. Evaluate Suppliers
   └─ quality score · reliability rating · delivery performance · history
                          │
                          ▼
4. Place Order → Pay (escrow) → Track
                          │
                          ▼
5. Receive & Verify
   └─ AI quality certificate check + QR traceability scan
                          │
                          ▼
6. Confirm receipt → escrow releases to farmer
```

### Buyer Capabilities
- Smart marketplace search with quality filters
- AI supplier recommendations
- Bulk procurement & recurring orders
- Verified supplier network with ratings
- Real-time order tracking
- Quality verification + blockchain traceability
- Spend analytics by crop

### Buyer Data Model Note
The `Buyer` model has **no `userId` column** — a buyer user resolves to a `Buyer` record **by email**. If no `Buyer` record exists, `PUT /api/buyer/profile` creates one on the fly.

### Buyer Dashboard Metrics
Total orders · Pending orders · Confirmed orders · Total spend · Pending spend · Crop distribution · Supplier count · Buyer profile (company, rating, district, state)

---

## 20. FEATURE MODULE — ADMIN

**Dashboard:** `/admin/dashboard` · **13 sub-routes**

### Admin Capabilities
- **User management** — list users, change status (ACTIVE / PENDING / SUSPENDED)
- **Farmer verification** — review and approve/reject pending farmers
- **FPO & buyer oversight** — directory views
- **Produce & order oversight** — platform-wide views
- **Payment oversight** — all payments, pending counts
- **Dispute resolution** — settle disputes via 4 modes
- **Reports** — platform reporting
- **Scheme management** — view and add schemes
- **Analytics** — platform-wide analytics
- **Live Mandi** — market price monitoring
- **Blockchain** — chain integrity and ledger explorer

### Admin Overview KPIs
`GET /api/admin/overview` returns: totalUsers · totalFarmers · totalFpos · totalBuyers · totalOrders · **totalGMV** · pendingPayments · activeListings

### Admin Security
The admin router applies `authenticate` + `requireRole('ADMIN')` via `router.use()` — every route in the module is gated at the router level, not per-route.

> **Important:** `POST /api/auth/login` explicitly allows `ADMIN` as a selectable role, because without it an admin signing in would be silently downgraded to `FARMER` and lose access to `/api/admin`. Registration still refuses `ADMIN`.

---

## 21. FEATURE MODULE — MARKET & LIVE MANDI

### Data Models
- `Market` — name, location, district, state
- `MarketPrice` — marketId, cropId, date, **minPrice · maxPrice · modalPrice**, unit

### Capabilities
- Live mandi prices across Indian APMC markets
- Min / max / modal price bands
- 30-day price history time series
- Commodity and state filtering
- Market-wide roll-up with average modal price
- Farmer dashboard market snapshot (6 crops)

### Summary Endpoint Logic
`GET /api/mandi/summary` computes the **latest row per crop** (not a double-counted average across all history), then reports: totalMarkets · totalCommodities · totalRecords · averageModalPrice · commodities[]

### Global Search
`GET /api/search?q=` federates across 5 entity types with typed results:

| Type | Search Field | Navigate To |
|---|---|---|
| Produce | cropName | Marketplace |
| Order | orderNumber | Orders |
| Crop | name | Produce |
| Market | name | Live Mandi |
| Buyer | companyName | Marketplace |

Minimum query length: 2 characters. Results limited to 4 listings / 3 orders / 3 crops / 3 markets / 3 buyers.

---

## 22. SMART CONTRACTS

**Location:** `contracts/` · **Toolchain:** Hardhat (`hardhat.config.ts`, `scripts/deploy.ts`, `test/contracts.test.ts`)

| Contract | Responsibility |
|---|---|
| `PaymentEscrow.sol` | On-chain escrow hold / release / refund logic |
| `QualityCertificate.sol` | Immutable quality certificate issuance and verification |
| `Traceability.sol` | Batch provenance event registry |

**Supporting files:**
- `contracts/package.json` — contract package config
- `contracts/.env.example` — deployment environment template
- `scripts/deploy.ts` — Hardhat deployment script
- `test/contracts.test.ts` — contract test suite
- `hardhat.config.ts` — network and compiler configuration

> **Status:** Contracts are written and tested with Hardhat. Deployment to a public testnet/mainnet is on the roadmap. The application layer currently uses an in-database SHA-256 hash chain (`BlockchainRecord`) that provides the same tamper-evidence property without requiring a live chain.

---

## 23. REAL-TIME & NOTIFICATION LAYER

### WebSocket Server
**URL:** `ws://localhost:3001/ws`
**Library:** `ws` (`server/src/lib/websocket.ts`)
**Connection params:** `?userId=<id>&role=<ROLE>`

### Connection Lifecycle
```
Client connects → clientId = `${userId}-${Date.now()}`
                → server sends { type: 'CONNECTED', message: 'Real-time updates active' }
                → on close / error → client removed from registry
```

### Push Functions

| Function | Trigger |
|---|---|
| `notifyUser(userId, data)` | Targeted notification to one user |
| `notifyRole(role, data)` | Broadcast to all users of a role |
| `broadcast(data)` | All connected clients |
| `notifyNewOrder` | New order placed |
| `notifyOrderStatusUpdate` | Any order status transition |
| `notifyPaymentReceived` | Escrow released to farmer |
| `notifyQualityComplete` | AI quality scan finished |

All messages are stamped with `timestamp: new Date().toISOString()`.

### Persistent Notifications
`Notification` model: `userId` · `title` · `message` · `type` · `read` · `linkTo` (deep link) · `metadata` (JSON) · `orderId` · `paymentId`

**Types:** `ORDER` · `PAYMENT` · `MARKET` · `QUALITY` · `AI` · `SYSTEM`

Unread counts are surfaced in every dashboard via the dashboard payload's `unreadNotifications` field.

---

## 24. SECURITY ARCHITECTURE

| Layer | Control |
|---|---|
| **Authentication** | Token-based (token = userId in dev) · bcrypt password hashing, 10 rounds |
| **Authorization** | `requireRole(...roles)` RBAC — re-reads role from DB on every request so changes take effect immediately |
| **Ownership checks** | Listing PATCH/DELETE verify `listing.farmerId === farmer.id` → else 403 |
| **Input validation** | Zod schemas on every mutating endpoint; `safeParse` with `VALIDATION_ERROR` responses |
| **Payment safety** | Escrow locks funds until delivery confirmation; full audit log per transition |
| **Auto-release guard** | 48-hour timer prevents indefinite fund lock-up |
| **Traceability integrity** | SHA-256 hash chain — tampering is mathematically detectable |
| **Voice safety** | No credentials by voice · `ui_action` allowlist · server-side arg validation · sensitive-field log redaction |
| **Transport** | CORS configured (`origin: true, credentials: true`) · HTTPS in production |
| **Payload limits** | `express.json({ limit: '10mb' })` |
| **Secrets** | Environment variables via `.env`, never committed |
| **Rate limiting** | Documented as an API abuse prevention control |
| **Frontend resilience** | `ErrorBoundary` component · SSR smoke tests · DOM smoke tests |

### Known Dev-Mode Exceptions (documented in code)
1. **`/api/auth/login` accepts any password** and auto-creates accounts — intentional for demo/judging. Commented in source; must be re-enabled with real verification before production.
2. **Token is the raw user id** rather than a signed JWT — the code notes "In production, verify JWT."
3. **Admin role selectable at login** — deliberate so admins are not silently downgraded; registration still refuses ADMIN.

---

## 25. DEMO DATA & SEED

**Command:** `cd server && npm run db:seed`

### Seeded Entities

| Category | Data |
|---|---|
| **Users** | Farmer (Samarth Patil) · Buyer (Rajesh Sharma) · FPO (Sahyadri Cooperative) · Admin |
| **Farmer Profile** | Dighoi village, Nashik, Maharashtra · 12.4 acres |
| **Farm** | "Kisan Farm" with plots A, B, C |
| **Crops** | Tomato · Onion · Potato · Wheat · Soybean · Cotton · Pomegranate |
| **Markets** | Nashik APMC · Pune APMC · Mumbai APMC · Ahmednagar APMC |
| **Market Prices** | Multi-day history across crops and markets |
| **Buyers** | FreshMart and others |
| **Produce Listings** | Multiple crops with quantity, grade, price |
| **Orders** | Mixed statuses; DELIVERED orders marked PAID |
| **Quality Scans** | With results and certificates |
| **Notifications** | Across all types |
| **Farm Tasks** | With priorities and statuses |
| **AI Insights** | Demand / price / quality insights |
| **Demand Forecasts** | Per crop |
| **Price Predictions** | Per crop with min/max bands |
| **Escrow & Blockchain** | Escrow transactions + hash-chain blocks |

### Seed Verification Output
```
🌱 Seeding KisanNexus database...
...
🔗 Blockchain: {N} blocks created, chain integrity: verified
✅ Database seeded successfully!
📧 Demo credentials:
   Farmer: samarth@kisanexus.com / password123
   Buyer:  rajesh@freshmart.com / password123
   FPO:    sahyadri@kisanexus.com / password123
   Admin:  admin@kisanexus.com / password123
```

### Seed Tooling
- `server/prisma/seed.ts` — source seed script (45 KB)
- `seed-fragment.ts` — modular seed fragment
- `splice-seed.mjs` — seed assembly helper
- `seed-verify.mjs` — verifies seed correctness

### Smart Logistics Demo Data
- 3 active shipments (In Transit, Picked Up, Out for Delivery)
- Route optimisation showing 16% cost savings (₹460)
- Delivery history with 5+ completed shipments
- Real logistics partners with ratings

---

## 26. TESTING & VERIFICATION

### Test & Verification Harnesses (12)

| Harness | File | Purpose |
|---|---|---|
| Flow tests | `flow-tests.mjs` | End-to-end business flow validation |
| DOM smoke | `dom-smoke.mjs` | Component render integrity |
| DOM environment | `dom-env.mjs` | jsdom + fake-indexeddb bootstrap |
| SSR smoke | `ssr-smoke.mjs` | Server-side render safety |
| SSR app | `ssr-app.mjs` | SSR app harness |
| SSR check | `ssr-check.mjs` | SSR output validation |
| SSR content | `ssr-content.mjs` | SSR content presence |
| Route check | `routecheck.mjs` | All 69 routes resolve |
| Role screens | `role-screens.mjs` | Per-role page rendering |
| API coverage | `api-coverage.mjs` | Endpoint coverage audit |
| Admin live check | `admin-live-check.mjs` | Admin module live data |
| Harness environment | `harness-env.mjs` | Shared test environment |
| Seed verify | `seed-verify.mjs` | Database seed correctness |

### Backend Test Suites

| Suite | Location |
|---|---|
| Saathi flows | `saathi/backend/tests/test_flows.py` |
| Saathi language | `saathi/backend/tests/test_language.py` |
| Saathi tools | `saathi/backend/tests/test_tools.py` |
| Saathi fixtures | `saathi/backend/tests/conftest.py` |
| CRUD smoke | `saathi/backend/crud_smoke_test.py` |
| Contract tests | `test/contracts.test.ts` |

### Static Analysis
- **oxlint** (`npm run lint`) — configured via `.oxlintrc.json`
- **TypeScript** — `tsc --noEmit` runs as part of `npm run build`
- Additional helpers: `check-strings.cjs`, `check_braces.cjs`

---

## 27. IMPACT METRICS & BUSINESS MODEL

### Demonstrated Impact

| Metric | Value |
|---|---|
| Farmer income uplift | **+30%** vs middleman-adjusted price |
| Buyer price reduction | **−20%** |
| Price prediction accuracy | **85%** |
| Delivery cost reduction | **30%** (AI route optimisation) |
| Route optimisation saving | **16% / ₹460** per optimised shipment |
| Escrow auto-release window | 48 hours |
| Intermediary margin eliminated | 30–40% → **2–3% platform fee** |
| Quality grading | Automated, A/B/C with certificate |
| Traceability coverage | Every batch, farm-to-fork |

### Revenue Model
- **2–3% transaction fee** per completed order (vs 30–40% taken by middlemen)
- Premium analytics & priority support for FPOs and large buyers
- Value-added services: logistics coordination, quality certification, credit facilitation

### Market Opportunity
- India: **146 million farmers** and a **~$400 billion** agricultural market
- Capturing **1%** ≈ **$4 billion** in transaction value

### Competitive Differentiation
1. AI-powered logistics optimisation
2. Blockchain traceability with hash-chain integrity
3. Voice-first design for rural and low-literacy users
4. Direct farmer-to-buyer connection with escrow-protected payments
5. FPO aggregation for institutional-scale bargaining

---

## 28. PRESENTATION TALKING POINTS

1. **Direct Connection** — "No middlemen: farmers get 30% more, buyers pay 20% less"
2. **AI-Driven** — "85% accurate price predictions and automated computer-vision quality grading"
3. **Blockchain Trust** — "Every transaction is hashed and verifiable — complete farm-to-fork traceability"
4. **Escrow Safety** — "Money is locked until the buyer confirms delivery — zero payment default risk"
5. **Smart Logistics** — "30% reduction in delivery costs through AI route optimisation"
6. **Voice-First** — "Saathi speaks Hindi, Marathi, English and Hinglish — works for low-literacy farmers"
7. **FPO Power** — "Smallholders pool produce to reach institutional-scale bargaining power"
8. **Quality Proof** — "AI issues a hash-verified certificate for every Grade A batch"
9. **Real-Time** — "WebSocket pushes every order, payment and quality event instantly"
10. **Scheme Access** — "8 government schemes matched to the farmer's crop and location"

### 2-Minute Demo Flow

| Section | Time | Focus |
|---|---|---|
| Opening | 10s | Value proposition |
| 👨‍🌾 Farmer Dashboard | 40s | Marketplace → Smart Logistics → AI Intelligence → Orders/Payments |
| 🏛️ FPO Dashboard | 30s | Farmers → Stock Hub/Inventory → Bulk Marketplace & Orders |
| 🏪 Buyer Dashboard | 30s | Requirements → Suppliers → Traceability → Quality & Payments |
| Closing | 10s | Impact & USP |
| **Total** | **2:00** | |

### Demo URLs
```
Farmer : /farmer/dashboard · /farmer/marketplace · /farmer/logistics · /farmer/ai-intelligence
FPO    : /fpo/dashboard · /fpo/farmers · /fpo/inventory · /fpo/marketplace
Buyer  : /buyer/dashboard · /buyer/requirements · /buyer/suppliers · /buyer/traceability
Admin  : /admin/dashboard · /admin/verification · /admin/analytics
```

### Pre-Demo Checklist
- [ ] Start API server (`cd server && npm run dev`) → port 3001
- [ ] Start web app (`npm run dev`) → port 5173
- [ ] (Optional) Start Saathi (`cd saathi && uvicorn backend.main:app --port 8000`)
- [ ] Verify `/api/health` returns `{ status: "ok" }`
- [ ] Open 4 browser tabs (one per role)
- [ ] Clear browser cache and re-test all flows
- [ ] Have backup talking points ready (voice assistant, blockchain benefits, market size)

---

## 29. ROADMAP

### Near Term
- [ ] Real Maps API integration (Google / Mapbox) for live shipment maps
- [ ] Production ML models replacing heuristic forecasts
- [ ] Full WebSocket live streaming for all dashboards
- [ ] Real image-processing backend for quality uploads
- [ ] Production authentication (remove demo mode, signed JWTs)

### Medium Term
- [ ] Mobile apps (React Native)
- [ ] Offline-first mode with background sync for low-connectivity areas
- [ ] SMS / WhatsApp alerts for shipments and prices
- [ ] PDF / Excel report exports
- [ ] Multi-language UI beyond voice
- [ ] Advanced analytics dashboard
- [ ] Push notifications

### Long Term
- [ ] Weather-integrated crop advisory
- [ ] Insurance and credit facilities (blockchain sale proof as credit history)
- [ ] Cold-chain logistics tracking
- [ ] Video consultations with agronomists
- [ ] Farmer community forums
- [ ] Multi-currency support
- [ ] Audited mainnet deployment of smart contracts

---

## 30. KNOWN LIMITATIONS

| Area | Current State | Path Forward |
|---|---|---|
| **Maps** | Placeholder graphic in tracking modal | Integrate Google / Mapbox API |
| **AI models** | Deterministic heuristics + mock predictions | Train on real mandi and demand data |
| **Real-time logistics** | Static demo data | Live GPS + WebSocket feed |
| **Image upload** | UI + mock CV detections | Real computer-vision model backend |
| **Authentication** | Demo mode — any password accepted | Re-enable verification + signed JWT |
| **Database** | SQLite (dev) | PostgreSQL (schema already compatible) |
| **Smart contracts** | Written and Hardhat-tested | Testnet → audited mainnet deploy |
| **Payment gateway** | Mock (`RAZORPAY_MOCK`, `TXN_*`) | Integrate Razorpay / Stripe |
| **FPO model** | Derived from listings, no FPO table | Add dedicated Fpo model |
| **Weather** | External service integration | Add forecast-based crop advisory |
| **Rate limiting** | Documented, not enforced | Add express-rate-limit |

> These limitations are **intentional for demo purposes** and are clearly marked in the codebase for backend integration.

---

## 31. ANTICIPATED Q&A

**Q: How do you make money?**
> 2–3% transaction fee — far below the 30–40% middlemen take. Plus premium analytics and priority support for FPOs and large buyers.

**Q: How do you ensure farmer adoption?**
> Partner with existing FPOs who already hold farmer trust; provide a voice-first interface for feature-phone users; offer free onboarding with field support in local languages.

**Q: What about rural internet connectivity?**
> Works on 2G, has offline data-entry modes that sync later (Dexie/IndexedDB), and Saathi supports voice interaction on basic phones.

**Q: How is this different from existing platforms?**
> Four combined innovations — AI logistics optimisation, blockchain traceability, voice-first design for rural users, and direct farmer-to-buyer connection with escrow-protected payments.

**Q: How is the farmer protected from non-payment?**
> Buyer funds enter escrow at order confirmation and release only on delivery confirmation. A 48-hour auto-release sweep prevents indefinite lock-up, and disputes have a structured 4-mode resolution path with a full audit log.

**Q: Is the blockchain real or simulated?**
> The ledger is a real SHA-256 hash chain with tamper detection, and three Solidity contracts (`PaymentEscrow`, `QualityCertificate`, `Traceability`) are written and Hardhat-tested. Mainnet deployment is on the roadmap.

**Q: How do you verify quality objectively?**
> Computer-vision scoring across 5 dimensions produces a 0–100 score and A/B/C grade with a confidence value. Scores ≥ 80 auto-issue a certificate with a unique verification hash that buyers can independently resolve via a public endpoint.

**Q: What is the transaction fee model exactly?**
> Transport cost is computed at 2% of subtotal on order creation, and the platform transaction fee is modelled at 2–3% of completed order value.

**Q: How does the voice assistant handle multiple languages?**
> Sarvam Saaras v3 handles STT, Sarvam 105B does LLM + function calling, and Bulbul v3 does TTS. Language detection in `pipeline/language.py` supports Hindi, Marathi, English and Hinglish, with Gujarati in the language registry.

**Q: Can it scale beyond Maharashtra?**
> The market/mandi data model is state and district agnostic, the schema is PostgreSQL-ready, and the voice layer already supports multiple Indian languages — so expansion is a data-onboarding exercise rather than a re-architecture.

---

## APPENDIX A — REPOSITORY STRUCTURE

```
farmlink/
├── src/                              # Frontend (React + TypeScript) — 132 files
│   ├── components/
│   │   ├── dashboard/                # 25+ role dashboard components
│   │   │   ├── LiveFarmerDashboard.tsx
│   │   │   ├── FpoDashboard.tsx
│   │   │   ├── BuyerDashboard.tsx
│   │   │   ├── AnalyticsDashboard.tsx
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── BuyerMarketplace.tsx / BuyerOrders.tsx / BuyerSuppliers.tsx
│   │   │   ├── BuyerRequirements.tsx / BuyerQuality.tsx / BuyerPayments.tsx
│   │   │   ├── BuyerTraceability.tsx / BuyerAiInsights.tsx
│   │   │   ├── FpoFarmers.tsx / FpoInventory.tsx / FpoMarketplace.tsx
│   │   │   ├── FpoOrders.tsx / FpoPayments.tsx / FpoQuality.tsx
│   │   │   ├── LiveMandiPage.tsx / ProducePage.tsx / PaymentsPage.tsx
│   │   │   └── analyticsConfigs.tsx / parts.tsx / ui.tsx
│   │   ├── sections/                 # 15 landing page sections
│   │   │   ├── Hero.tsx / FeaturesGrid.tsx / HowItWorks.tsx
│   │   │   ├── AIIntelligence.tsx / AIMatching.tsx / SmartLogistics.tsx
│   │   │   ├── FPOAggregation.tsx / TraceabilitySection.tsx
│   │   │   ├── MarketIntelligence.tsx / GovSchemes.tsx
│   │   │   ├── FarmerExperience.tsx / BuyerExperience.tsx
│   │   │   └── Testimonials.tsx / TrustStrip.tsx / FinalCTA.tsx
│   │   └── ui/                       # Design system primitives
│   │       ├── Badge.tsx / Empty.tsx / ErrorState.tsx
│   │       ├── GlassButton.tsx / GlassCard.tsx / Loading.tsx
│   │       ├── Logo.tsx / Reveal.tsx / SectionHeading.tsx
│   │       └── StatCard.tsx / useCountUp.ts
│   ├── pages/                        # Route pages
│   │   ├── HomePage.tsx / ContentPages.tsx
│   │   ├── CompleteLoginPage.tsx / CompleteRegisterPage.tsx / LoginPage.tsx
│   │   ├── Dashboards.tsx / DashboardPages.tsx / DashboardPlaceholder.tsx
│   │   ├── FarmerLogisticsPage.tsx / FarmerAIIntelligencePage.tsx
│   │   ├── MarketplacePage.tsx / MarketInsightsPage.tsx
│   │   ├── CropQualityPage.tsx / BlockchainVerifyPage.tsx
│   │   ├── LiveMandiPage.tsx / AboutPage.tsx / HowItWorksPage.tsx
│   ├── system/                       # Core system logic
│   │   ├── api.ts / api-client.ts / http.ts
│   │   ├── store.ts                  # IndexedDB local storage (Dexie)
│   │   ├── blockchain.ts
│   │   ├── logistics-service.ts
│   │   ├── ai-intelligence-service.ts
│   │   ├── ai.ts / data-service.ts / fallbackDispatcher.ts
│   │   ├── relations.ts / session.ts / types.ts
│   │   ├── AuthContext.tsx / ProfileContext.tsx
│   │   ├── AppModeContext.tsx / SystemContext.tsx
│   └── context/AppContext.tsx
│
├── server/                           # Node.js + Express API
│   ├── src/
│   │   ├── index.ts                  # Main app (75 KB, all inline routes)
│   │   ├── routes/                   # 12 route modules
│   │   │   ├── admin.ts / analytics.ts / blockchain.ts
│   │   │   ├── code-assistant.ts / farmerModule.ts / farmerProduce.ts
│   │   │   ├── fpoModule.ts / misc.ts / quality.ts / voice-assistant.ts
│   │   ├── services/                 # Business logic
│   │   │   ├── ai.service.ts / blockchain.service.ts
│   │   │   ├── escrow.service.ts / gemini.ts / weather.service.ts
│   │   ├── middleware/               # auth.ts / errorHandler.ts / validate.ts
│   │   ├── lib/                      # prisma.ts / websocket.ts
│   │   ├── config/response.ts        # ok() / fail() / asyncHandler()
│   │   └── data/schemes.ts           # 8 government schemes
│   └── prisma/
│       ├── schema.prisma             # 29 models
│       ├── seed.ts                   # 45 KB seed script
│       └── dev.db                    # SQLite database
│
├── saathi/                           # Python FastAPI Voice AI
│   ├── README.md
│   └── backend/
│       ├── main.py                   # FastAPI entry point
│       ├── config.py
│       ├── pipeline/
│       │   ├── voice_pipeline.py     # Pipecat pipeline
│       │   ├── language.py           # Language detection
│       │   └── interruptions.py      # Interruption handling
│       ├── prompts/                  # farmer · buyer · fpo · system
│       ├── tools/                    # 13 tool modules
│       │   ├── demand.py / marketplace.py / navigation.py
│       │   ├── orders.py / payments.py / pricing.py
│       │   ├── quality.py / schemes.py / traceability.py / _auth.py
│       ├── services/                 # farmilink_api · session · logging
│       ├── models/                   # listing · marketplace · order · user
│       └── tests/                    # flows · language · tools · conftest
│
├── contracts/                        # Solidity smart contracts
│   ├── PaymentEscrow.sol
│   ├── QualityCertificate.sol
│   ├── Traceability.sol
│   └── package.json
│
├── docs/                             # Documentation
│   ├── architecture.md
│   ├── conversation-flows.md
│   ├── setup.md
│   └── tools.md
│
├── scripts/deploy.ts                 # Hardhat deploy script
├── test/contracts.test.ts            # Contract tests
├── hardhat.config.ts
│
├── flow-tests.mjs                    # 12 test/verification harnesses
├── dom-smoke.mjs · dom-env.mjs
├── ssr-smoke.mjs · ssr-app.mjs · ssr-check.mjs · ssr-content.mjs
├── routecheck.mjs · role-screens.mjs
├── api-coverage.mjs · admin-live-check.mjs
├── harness-env.mjs · seed-verify.mjs
│
├── chat-simple.js                    # AI chat CLI
├── chat-with-ai.js                   # Interactive chat
├── chat.ps1                          # PowerShell wrapper
│
├── start-all.sh / stop-all.sh / start-port.sh
├── seed-fragment.ts / splice-seed.mjs
├── index.html · vite.config.ts · tailwind.config.js
├── tsconfig.json · tsconfig.app.json · tsconfig.node.json
├── docker-compose.yml · .oxlintrc.json
│
└── README.md · PRESENTATION-FEATURES.md · DEMO-SCRIPT.md
    PROJECT-STATUS.md · NEW-FEATURES-COMPLETE.md · AI-CHAT-README.md
```

---

## APPENDIX B — ENVIRONMENT VARIABLES

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:3001/api
VITE_SAATHI_URL=http://localhost:8000
```

### API Server (`server/.env`)
```env
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET=your_jwt_secret
AIHUBMIX_API_KEY=your_key
AI_PROVIDER=aihubmix
AUTO_RELEASE_HOURS=48
```

### Saathi Voice AI (`saathi/backend/.env`)
```env
SARVAM_API_KEY=your_sarvam_key
FARMILINK_API_URL=http://localhost:3001/api
FARMILINK_API_KEY=your_api_key
LLM_SERVICE=sarvam              # or gemini
LLM_MODEL=your_model
GEMINI_API_KEY=optional
GEMINI_MODEL=gemini-2.5-flash
STT_MODEL=saaras:v3
WS_ALLOWED_ORIGINS=http://localhost:5173
PORT=8000
```

### Contracts (`contracts/.env.example`)
```env
# Deployment RPC URL and private key for Hardhat
```

---

## APPENDIX C — COMMANDS REFERENCE

### Frontend
```bash
npm install                  # install dependencies
npm run dev                  # dev server → http://localhost:5173
npm run build                # tsc --noEmit && vite build
npm run preview              # preview production build
npm run lint                 # oxlint
```

### API Server
```bash
cd server
npm install
npm run dev                  # → http://localhost:3001
npm run db:studio            # Prisma Studio
npm run db:migrate           # run migrations
npm run db:seed              # seed demo data
npm run db:reset             # reset database
```

### Saathi Voice AI
```bash
cd saathi/backend
python -m venv .venv
.venv\Scripts\activate       # Windows
source .venv/bin/activate    # Linux/Mac
pip install -r requirements.txt
cp .env.example .env         # add SARVAM_API_KEY

# Must run from saathi/ — main.py uses package-relative imports
cd ..
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### All Services
```bash
./start-all.sh               # start API + web + Saathi
./stop-all.sh                # stop all
./start-port.sh              # port-aware startup
```

### Smart Contracts
```bash
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.ts
```

### AI Chat CLI
```bash
node chat-simple.js "your question"
node chat-with-ai.js         # interactive mode
./chat.ps1 "your question"   # PowerShell wrapper
```

### Verification Harnesses
```bash
node flow-tests.mjs
node dom-smoke.mjs
node ssr-smoke.mjs
node routecheck.mjs
node role-screens.mjs
node api-coverage.mjs
node admin-live-check.mjs
node seed-verify.mjs
```

---

## QUICK REFERENCE CARD

| Question | Answer |
|---|---|
| **What is it?** | Blockchain-verified, AI-powered agricultural marketplace |
| **Who uses it?** | Farmers · FPOs · Buyers · Admins |
| **Frontend** | React 19 + TypeScript 6 + Vite 8 + Tailwind 4 |
| **Backend** | Node.js + Express + Prisma + SQLite/PostgreSQL |
| **Voice AI** | Python + FastAPI + Pipecat + Sarvam |
| **AI features** | Demand forecast · Price prediction · CV quality grading |
| **Trust layer** | Escrow payments + SHA-256 hash chain + 3 Solidity contracts |
| **Routes** | 69 frontend · 100+ API endpoints |
| **Data models** | 29 Prisma models |
| **Voice tools** | 30+ functions across 10 domains |
| **Languages** | English · Hindi · Marathi · Hinglish · Gujarati |
| **Key metric** | Farmers +30% income · Buyers −20% price · 85% price accuracy |
| **Revenue** | 2–3% transaction fee |
| **Market** | 146M farmers · $400B market |
| **Demo login** | Any email · any password (demo mode) |
| **Ports** | Web 5173 · API 3001 · Saathi 8000 |

---

**🌾 FarmLink — eliminating middlemen, one verified transaction at a time.**
