# OnionSure Quality — AI Onion Detection

A complete, self-contained onion quality detection system. Upload an image or use your camera — the AI counts, classifies, and grades every onion in real-time.

## Features

- 📸 **Image Upload** — Upload any onion photo for instant analysis
- 📷 **Live Camera** — Capture directly from your device camera
- 🔍 **YOLOv8 Detection** — Real AI model detects and counts every onion
- 📊 **Live Results** — See counts, confidence scores, and quality grades instantly
- 🎯 **Quality Grading** — Automatic GRADE A / B / C / REJECT classification
- 📦 **Export JSON** — Download detection results for records

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- pip

### 1. Start the AI Service (Python/Flask)

```bash
cd python
pip install -r requirements.txt
python onion_flask_service.py
```

The AI service runs on `http://localhost:5000`.

### 2. Start the Backend (Node/Express)

```bash
cd server
npm install
npm start
```

The API runs on `http://localhost:4000`.

### 3. Start the Frontend (React)

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## How to Use

1. Open the app in your browser
2. Either upload an onion image or open your camera
3. Click **"Capture & Detect"** or the detection will run automatically
4. View results:
   - **Total onions detected**
   - **Breakdown** by class (Healthy, Damaged, Rotten, Sprouted, Undersized)
   - **Quality Score** (0-100)
   - **Defect Rate** percentage
   - **Grade** (GRADE A, B, C, or REJECT)
5. Download results as JSON

## Project Structure

```
onionsure-quality/
├── python/
│   ├── onion_flask_service.py   # YOLOv8 AI detection service
│   └── requirements.txt
├── server/
│   ├── server.js                # Express API (proxies to Python)
│   └── package.json
├── web/
│   ├── src/
│   │   ├── pages/Quality/       # Main detection page
│   │   ├── lib/                 # API client + types
│   │   ├── main.tsx             # Entry point
│   │   └── index.css            # Styles
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
└── README.md
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/detect` | POST | Upload image for detection |
| `/api/detect-base64` | POST | Send base64 image for detection |

## Detection Classes

| Class | Color | Description |
|-------|-------|-------------|
| Healthy | 🟢 Green | Good quality onion |
| Damaged | 🟡 Yellow | Surface damage, splits, stains |
| Rotten | 🔴 Red | Soft rot, black smut, spoiled |
| Sprouted | 🟣 Purple | Sprouted onions |
| Undersized | 🔵 Cyan | Diameter < 40mm |

## Grading Logic

- **GRADE A**: Score ≥ 85 AND defect rate ≤ 10%
- **GRADE B**: Score ≥ 70 AND defect rate ≤ 25%
- **GRADE C**: Score ≥ 50 AND defect rate ≤ 35%
- **REJECT**: Score < 50 OR defect rate > 35%

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **AI**: Python + Flask + YOLOv8 (Ultralytics)
- **Vision**: OpenCV + PIL

## Troubleshooting

**"AI Engine Offline"**
- Make sure the Python service is running on port 5000
- Check that model files exist in `onioncheck/runs/`

**"Camera access denied"**
- Allow camera permissions in your browser
- Use the upload option instead

**Detection returns 0 onions**
- Ensure the image clearly shows onions
- Try adjusting camera angle or lighting
- Check that YOLO models are loaded correctly

## Notes

- The AI models are stored in the `onioncheck/` folder (YOLOv8 segmentation + classification)
- Images are not stored permanently — all processing happens in memory
- The backend proxies requests to the Python AI service for CORS compatibility

## License

Built for Smart India Hackathon 2026
