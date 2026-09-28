# 🚀 GET STARTED - AI Vision Defect Detection

## Quick Start in 3 Steps

### Step 1: Install Dependencies (2 minutes)

```bash
cd "C:\Users\darak\Desktop\onion zip\onioncheck"

# Create virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate

# Install everything
pip install -r requirements.txt
```

### Step 2: Configure API Key (1 minute)

Create `.env` file:
```bash
echo ROBOFLOW_API_KEY=zstkHHBPCjRLMGhYOGpQ > .env
```

Or use your existing key from the working `roboflow_grading.py`.

### Step 3: Launch Application (30 seconds)

**Option A: Web Dashboard (Recommended)**
```bash
streamlit run defect_detection_app.py --server.port 8502
```
Open: http://localhost:8502

**Option B: REST API**
```bash
python defect_api.py
```
Open: http://localhost:5000

**Option C: Windows Quick Launcher**
```bash
run_defect_detection.bat
```

---

## ✅ Verify Installation

Run the test suite:
```bash
python test_defect_system.py
```

This will check:
- ✓ All modules installed
- ✓ API key configured
- ✓ Detection working
- ✓ Export functions
- ✓ Applications loadable

---

## 🎯 What You Get

### 1. Enhanced Defect Detection
- **Old system**: Basic healthy/rotten/sprouted
- **New system**: 
  - 7+ defect classes
  - 4-level severity (0-3)
  - Size estimation (cm, weight)
  - Visual feature analysis
  - Defect-specific metrics

### 2. Multiple Interfaces
- **Streamlit Dashboard**: Interactive web UI
- **REST API**: For integrations
- **Python Module**: Direct code access
- **Django Integration**: Ready to add to onionsure

### 3. Professional Features
- Calibration tools
- Batch processing
- CSV/JSON export
- Annotated images
- Comprehensive reports

---

## 📊 Key Improvements Over Original System

| Feature | Original (roboflow_grading.py) | New (defect_detection.py) |
|---------|-------------------------------|---------------------------|
| Defect Classes | 3 (Healthy/Rotten/Sprouted) | 7+ classes |
| Severity Levels | Binary (Good/Bad) | 4-level (0-3) |
| Size Estimation | ❌ No | ✅ Yes (cm + weight) |
| Bounding Boxes | ✅ Basic | ✅ Enhanced with labels |
| Visual Features | Basic | Advanced (color, texture, etc.) |
| Defect Analysis | Generic | Defect-specific metrics |
| Calibration | ❌ No | ✅ Yes |
| API | ❌ No | ✅ REST API |
| Batch Processing | Limited | Full support |
| Export | Basic CSV | CSV + JSON + Images |

---

## 🎨 User Interface Comparison

### Original App (app.py)
```
Simple interface:
- Upload image
- View results
- Basic metrics
```

### New Defect Detection App (defect_detection_app.py)
```
Professional dashboard:
- 3 tabs (Single/Batch/Analytics)
- Calibration tools
- Severity breakdown
- Size distribution
- Export multiple formats
- Batch statistics
- Configuration panel
```

---

## 🔗 Integration with onionsure Django

### Quick Integration Steps

1. **Copy detection module to Django project:**
```bash
cp defect_detection.py "../onionsure/farmers/"
```

2. **Add to Django app** (see DEFECT_DETECTION_GUIDE.md for full details):
```python
# In views.py
from defect_detection import detect_defects_with_sizing

@api_view(['POST'])
def inspect_product(request):
    image = request.FILES['image']
    results = detect_defects_with_sizing(image.path)
    
    # Save to database
    Inspection.objects.create(
        product_id=request.data['product_id'],
        defect_rate=results['statistics']['defect_rate'],
        results_json=results
    )
    
    return Response(results)
```

3. **Create API endpoint:**
```python
# urls.py
path('api/inspect/', inspect_product)
```

4. **Use in frontend:**
```javascript
// Upload and inspect
const formData = new FormData();
formData.append('image', imageFile);
formData.append('product_id', productId);

fetch('/api/inspect/', {
    method: 'POST',
    body: formData
}).then(res => res.json())
  .then(data => {
      console.log(`Defect rate: ${data.statistics.defect_rate}%`);
  });
```

---

## 📁 File Guide

### Start Here
1. **README_DEFECT_DETECTION.md** - Complete user guide
2. **GET_STARTED.md** - This file (quick start)
3. **test_defect_system.py** - Verify installation

### For Integration
4. **DEFECT_DETECTION_GUIDE.md** - Django integration
5. **SYSTEM_OVERVIEW.md** - Architecture details
6. **defect_api.py** - REST API reference

### Core Code
7. **defect_detection.py** - Main detection engine
8. **defect_detection_app.py** - Streamlit dashboard

### Keep Using
9. **roboflow_grading.py** - Your original system (still works!)
10. **app.py** - Your original Streamlit app (still works!)

---

## 🎓 Usage Examples

### Example 1: Inspect Single Image

**Web Dashboard:**
1. Open http://localhost:8502
2. Upload onion image
3. Click "Analyze Defects"
4. View results and download report

**Python:**
```python
from defect_detection import detect_defects_with_sizing

results = detect_defects_with_sizing("onion_photo.jpg")

print(f"Total onions: {results['total_detected']}")
print(f"Defect rate: {results['statistics']['defect_rate']}%")
print(f"Average size: {results['statistics']['average_size_cm']} cm")
```

**API:**
```bash
curl -X POST http://localhost:5000/api/detect \
  -F "image=@onion_photo.jpg" \
  | jq '.statistics'
```

### Example 2: Batch Inspection

**Python:**
```python
import glob
from defect_detection import detect_defects_with_sizing

for img in glob.glob("images/*.jpg"):
    results = detect_defects_with_sizing(img)
    print(f"{img}: {results['statistics']['defect_rate']}% defects")
```

**API:**
```bash
curl -X POST http://localhost:5000/api/batch \
  -F "images=@img1.jpg" \
  -F "images=@img2.jpg" \
  -F "images=@img3.jpg"
```

### Example 3: Calibrate for Your Setup

```python
from defect_detection import calibrate_size_detection

# Measure one onion with a ruler (e.g., 7.5 cm)
# Take photo with your camera
pixels_per_cm = calibrate_size_detection(
    "reference_onion.jpg",
    known_diameter_cm=7.5
)

print(f"Use this value: {pixels_per_cm}")

# Now use it for all detections
results = detect_defects_with_sizing(
    "batch_photo.jpg",
    pixels_per_cm=pixels_per_cm
)
```

---

## 🐛 Common Issues & Solutions

### Issue: "Module not found"
```bash
# Make sure virtual environment is activated
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Reinstall dependencies
pip install -r requirements.txt
```

### Issue: "ROBOFLOW_API_KEY not found"
```bash
# Check .env file exists
dir .env  # Windows
ls -la .env  # Mac/Linux

# Recreate if missing
echo ROBOFLOW_API_KEY=your_key_here > .env
```

### Issue: "No onions detected"
**Solutions:**
- Check image quality (lighting, focus)
- Lower confidence threshold
- Ensure onions are visible
- Verify API key is working

### Issue: "Size estimation inaccurate"
**Solutions:**
- Run calibration properly
- Measure reference onion accurately
- Maintain consistent camera distance
- Re-calibrate if setup changed

---

## 📞 Next Steps

### For Testing
1. Run `python test_defect_system.py`
2. Try the web dashboard
3. Test with your onion images
4. Calibrate for your camera setup

### For Development
1. Read DEFECT_DETECTION_GUIDE.md
2. Review defect_detection.py code
3. Check SYSTEM_OVERVIEW.md for architecture
4. Explore Django integration examples

### For Production
1. Set up proper database
2. Add authentication
3. Configure CORS properly
4. Set up monitoring
5. Use production WSGI server (gunicorn)

---

## 💡 Tips

### Get Best Results
- ✅ Use good lighting
- ✅ Clear, focused images
- ✅ Onions clearly visible
- ✅ Consistent camera angle
- ✅ Calibrate properly

### Optimize Performance
- ✅ Reduce image size before upload
- ✅ Use batch processing for multiple images
- ✅ Cache calibration settings
- ✅ Close other applications
- ✅ Use good internet connection (for API)

### Save Time
- ✅ Use `run_defect_detection.bat` launcher
- ✅ Keep `.env` file backed up
- ✅ Save calibration value for reuse
- ✅ Use batch processing
- ✅ Export reports for records

---

## 📚 Documentation Quick Links

- **User Guide**: [README_DEFECT_DETECTION.md](./README_DEFECT_DETECTION.md)
- **Integration**: [DEFECT_DETECTION_GUIDE.md](./DEFECT_DETECTION_GUIDE.md)
- **Architecture**: [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)
- **Original Model**: [MODEL_DOCUMENTATION.md](./MODEL_DOCUMENTATION.md)

---

## ✨ What Makes This Different

### vs Original roboflow_grading.py
- ✅ More defect classes
- ✅ Severity levels
- ✅ Size estimation
- ✅ Better visualization
- ✅ Advanced features
- ✅ API available

### vs Commercial Solutions
- ✅ Open source
- ✅ Customizable
- ✅ No per-image fees
- ✅ On-premise deployment
- ✅ Full data ownership
- ✅ Integration ready

---

## 🎉 You're Ready!

Your AI Vision Defect Detection system is now set up and ready to use.

**Launch the dashboard:**
```bash
streamlit run defect_detection_app.py --server.port 8502
```

**Or launch the API:**
```bash
python defect_api.py
```

**Or use the quick launcher:**
```bash
run_defect_detection.bat
```

Happy detecting! 🔍🧅

---

**Need Help?**
- Check documentation files
- Run test suite: `python test_defect_system.py`
- Review troubleshooting in README_DEFECT_DETECTION.md
- Examine example code in this guide

**Version**: 2.0  
**Created**: September 3, 2026  
**Platform**: onionsure Agricultural Supply Chain
