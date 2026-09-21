# 🚀 OnionSure - Quick Start Guide

## ✅ Project is Running!

### 🌐 Access Points

**Frontend (Web Interface)**
- URL: http://localhost:3000
- Built with: React + Vite + TypeScript + Tailwind CSS
- Features: Inspection workflow, certificates, farmer portal, analytics

**Backend (API Server)**
- URL: http://localhost:4000
- Built with: Node.js + Express
- WebSocket: ws://localhost:4000/ws (real-time updates)

### 🔐 Demo Login Credentials

| Role | Username | Password | Access |
|------|----------|----------|--------|
| **Procurement Officer** | `officer1` | `password123` | Create inspections, full workflow |
| **FPO Manager** | `fpo1` | `password123` | Manage farmer data, view reports |
| **Farmer** | `farmer1` | `password123` | View inspections, certificates, raise disputes |
| **Buyer** | `buyer1` | `password123` | Browse certified lots, quality reports |
| **Admin** | `admin` | `password123` | Full system access, analytics |

### 📍 Key Pages to Explore

#### Procurement Officer Workflow
1. **Dashboard** - `/procurement/dashboard` - Overview and quick actions
2. **New Inspection** - `/procurement/new` - Start quality assessment
3. **Live Sensor** - `/quality/live-sensor` - Add 8 environmental parameters
4. **Live Camera** - `/quality/live-camera` - Upload onion images
5. **AI Analysis** - `/quality/ai-analysis` - Run computer vision detection
6. **Fusion Score** - `/quality/fusion` - Calculate weighted grade
7. **Certificates** - `/procurement/certificates` - Generate and view certificates
8. **History** - `/procurement/history` - All past inspections

#### Farmer Portal
1. **Dashboard** - `/farmer/dashboard` - Personal inspection overview
2. **My Inspections** - `/farmer/inspections` - List of all inspections
3. **Quality Report** - `/farmer/report/:id` - Detailed inspection results
4. **Disputes** - `/farmer/disputes` - Raise quality concerns

#### Analytics & Admin
1. **Analytics Dashboard** - `/analytics` - System-wide metrics and trends
2. **QR Verification** - `/verify/:qrCode` - Public certificate verification

### 🧪 Test the Complete Workflow

#### Quick Test (5 minutes)
1. Open http://localhost:3000
2. Login as `officer1` / `password123`
3. Click "New Inspection"
4. Fill form (use example data):
   - Farmer: Select any farmer
   - FPO: Select any FPO
   - Centre: Select any centre
   - Crop: ONION
   - Variety: Bhima Super
   - Quantity: 500 KG
5. Submit → You'll get INS-YYYY-NNNNNN inspection ID
6. Add sensor readings (any values)
7. Upload images (skip if none available)
8. Run AI analysis → See defect counts
9. Calculate fusion score → Get grade (GRADE A / URS / REJECTED)
10. Generate certificate → See auto-populated certificate

#### Verify Data Persistence
1. Complete an inspection (steps above)
2. Press F5 to refresh browser
3. Go to History page
4. Click on your inspection
5. ✅ All data should still be there!

### 🗂️ Project Structure

```
onionsure/
├── server/              # Backend API (Port 4000)
│   ├── server.js        # Main server entry
│   ├── api.js           # Route aggregator
│   ├── inspection-routes.js
│   ├── image-routes.js
│   ├── ai-analysis-routes.js
│   ├── fusion-routes.js
│   ├── certificate-routes.js
│   ├── sensor-routes.js
│   ├── auth-routes.js
│   └── uploads/         # Image storage
│
├── web/                 # Frontend (Port 3000)
│   ├── src/
│   │   ├── pages/       # All page components
│   │   ├── components/  # Reusable UI components
│   │   ├── context/     # InspectionContext (state mgmt)
│   │   ├── lib/         # API client, utilities
│   │   └── App.tsx      # Main app + routing
│   └── public/          # Static assets
│
└── database/
    └── schema.sql       # PostgreSQL schema
```

### 🛠️ Development Commands

#### Start/Stop Servers

**Start Both Servers** (already running):
```bash
# Backend
cd onionsure/server
npm run dev

# Frontend (separate terminal)
cd onionsure/web
npm run dev
```

**Stop Servers**:
- Press `Ctrl+C` in each terminal
- Or close the terminal windows

**Restart Servers**:
```bash
# Just run the start commands again
```

#### Install Dependencies

If you need to reinstall:
```bash
# Backend
cd onionsure/server
npm install

# Frontend
cd onionsure/web
npm install
```

#### Build for Production

```bash
# Frontend production build
cd onionsure/web
npm run build

# Preview production build
npm run preview
```

### 🧪 Run E2E Tests

```bash
cd onionsure
node test_e2e_inspection_flow.mjs
```

Expected output: ✅ 11/11 tests passing

### 🔧 Configuration

#### Backend Environment Variables

Create `onionsure/server/.env` (optional):
```env
PORT=4000
USE_PYTHON=false          # true to use Python AI service
PYTHON_AI_URL=http://localhost:5000
JWT_SECRET=your-secret-key
```

#### Frontend API Configuration

File: `onionsure/web/src/lib/api.ts`
```typescript
const BASE_URL = 'http://localhost:4000/api';
```

Change if backend runs on different port.

### 📊 Current Mode: Demo AI

The system is running in **JS DEMO AI mode**:
- Mock AI analysis results
- No Python service required
- Perfect for testing workflow

To enable **real Python AI service**:
1. Set `USE_PYTHON=true` in backend `.env`
2. Start Python service: `cd onioncheck && python app.py`
3. Restart backend server

### 🗄️ Database

Currently using **in-memory storage** (demo mode):
- Data persists during server runtime
- Resets when server restarts
- Good for testing

To enable **PostgreSQL persistence**:
1. Install PostgreSQL
2. Create database: `createdb onionsure`
3. Load schema: `psql -d onionsure -f database/schema.sql`
4. Configure connection in backend
5. Restart server

### 🐛 Troubleshooting

#### "Port already in use"
```bash
# Find and kill process on port 4000 (backend)
netstat -ano | findstr :4000
taskkill /F /PID <PID>

# Find and kill process on port 3000 (frontend)
netstat -ano | findstr :3000
taskkill /F /PID <PID>
```

#### "Cannot find module"
```bash
# Reinstall dependencies
cd onionsure/server
npm install

cd onionsure/web
npm install
```

#### "Network error" in frontend
- Check backend is running on port 4000
- Verify `http://localhost:4000/api/health` returns OK
- Check browser console for CORS errors

#### Images not uploading
- Check `onionsure/server/uploads/` folder exists
- Verify file size < 10MB
- Check console for multer errors

### 📱 Browser Support

**Recommended Browsers**:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

**Mobile**: Responsive design works on phones/tablets

### 🎯 Key Features to Test

✅ **Inspection Creation**
- Unique ID generation (INS-YYYY-NNNNNN)
- Automatic lot creation (ON-YYYY-NNNNN)

✅ **Sensor Data**
- 8 environmental parameters
- Real-time validation

✅ **Image Upload**
- Multiple images per inspection
- Preview before upload
- Organized by inspection ID

✅ **AI Analysis**
- Defect detection
- Count normalization
- Confidence scoring

✅ **Fusion Scoring**
- Vision + IoT weighted combination
- Automatic grade assignment
- Risk level calculation

✅ **Certificate Generation**
- Auto-populate all fields
- QR code generation
- Printable PDF-ready format

✅ **Data Persistence**
- Survives page refresh
- Navigate back from History
- Resume incomplete inspections

✅ **Farmer Portal**
- See own inspections
- View certificates
- Raise disputes

✅ **Analytics**
- System-wide metrics
- Grade distribution
- Defect trends

### 📚 Additional Documentation

- `INTEGRATION_COMPLETE.md` - Full integration details
- `E2E_TEST_GUIDE.md` - Testing documentation
- `API_DOCUMENTATION.md` - API endpoint reference
- `ARCHITECTURE_AUDIT.md` - System architecture
- `FRONTEND_BACKEND_CONTRACT.md` - API contracts

### 🎉 Success Indicators

You'll know everything is working when:

1. ✅ Backend shows: `OnionSure API listening on http://localhost:4000`
2. ✅ Frontend shows: `Local: http://localhost:3000/`
3. ✅ You can login with `officer1` / `password123`
4. ✅ You can create an inspection and see INS-YYYY-NNNNNN
5. ✅ Data persists after page refresh
6. ✅ Certificate auto-generates with all fields populated
7. ✅ History page shows your inspections

### 🚀 Next Actions

**For Testing**:
1. Run through complete workflow (creation → certificate)
2. Test data persistence (refresh browser)
3. Test farmer view (login as farmer1)
4. Run E2E test suite: `node test_e2e_inspection_flow.mjs`

**For Development**:
1. Explore API endpoints: http://localhost:4000/api/inspections
2. Check WebSocket: ws://localhost:4000/ws
3. Review code in `onionsure/server/` and `onionsure/web/src/`
4. Modify and see hot-reload in action

**For Production**:
1. Set up PostgreSQL database
2. Configure environment variables
3. Build frontend: `npm run build`
4. Deploy to hosting (Vercel, Heroku, AWS, etc.)

---

## 🌟 You're All Set!

**Access the app**: http://localhost:3000

**Default login**: `officer1` / `password123`

**Start testing**: Create your first inspection! 🧅

---

*For questions or issues, check the troubleshooting section or review the integration documentation.*
