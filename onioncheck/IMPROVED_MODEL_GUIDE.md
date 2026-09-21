# Improved Onion Quality Detection Model - Training Guide

## 🎯 Goal
Train a YOLO model that can accurately detect:
- **Healthy onions** → GREEN boxes
- **Unhealthy onions** → RED boxes
- Works well with live camera for real-time detection

## 📋 Current Issue
The existing model doesn't properly classify healthy vs unhealthy onions with colored bounding boxes.

## 🔧 Solution Steps

### Step 1: Train Improved Model
We've created a training script that will:
1. Use your existing onion images as "healthy" samples
2. Generate synthetic "unhealthy" samples with simulated defects
3. Train a YOLOv8 model to distinguish between them

**Run the training:**
```bash
cd "c:\Users\darak\Desktop\onion zip\onioncheck"
python train_improved_model.py
```

**Training time:** ~30-60 minutes on CPU
**Output:** `models/onion_quality_best.pt`

### Step 2: Test the Model
After training completes, test it:
```bash
python defect_detection_local.py
```

This will run the model on a test image and show you the results.

### Step 3: Use the Model in Production
The system will automatically use the new local model when you restart the API server:
```bash
python defect_api.py
```

## 📊 Better Dataset Options

If the synthetic data doesn't work well, here are real dataset sources:

### Option 1: Roboflow Universe (Recommended)
Search for onion/vegetable quality datasets:
https://universe.roboflow.com/search?q=onion

Good alternatives:
- "Potato Quality Detection" - similar defect patterns
- "Fruit Quality Inspection" - transfer learning works well
- "Vegetable Defect Detection" - various defects

### Option 2: Kaggle Datasets
1. **Plant Disease Dataset**
   - URL: https://www.kaggle.com/datasets/vipoooool/new-plant-diseases-dataset
   - Has healthy vs diseased images
   - Good for transfer learning

2. **Fruit Quality Dataset**
   - URL: https://www.kaggle.com/datasets/sriramr/fruits-fresh-and-rotten-for-classification
   - Fresh vs rotten classification
   - Similar visual patterns to onions

### Option 3: Create Your Own Dataset
**Collect 200-500 images:**
- 100+ healthy onions (various angles, lighting)
- 100+ unhealthy onions (damaged, rotten, sprouted, discolored)

**Annotation tool:**
- Use Roboflow: https://roboflow.com/
- Or LabelImg: https://github.com/heartexlabs/labelImg

**Classes to label:**
- Class 0: `healthy`
- Class 1: `unhealthy`

**Tips:**
- Variety of lighting conditions
- Different backgrounds
- Multiple onions per image
- Close-up and far shots

## 🔄 Download and Use External Datasets

### Method 1: Roboflow Dataset
```python
# Add this to train_improved_model.py

# Get API key from: https://app.roboflow.com/settings/api
API_KEY = "your_api_key_here"

# Example: Download a potato defect dataset
download_roboflow_dataset(
    api_key=API_KEY,
    workspace="your-workspace",
    project="potato-quality",
    version=1,
    output_dir=DATASET_DIR
)
```

### Method 2: Kaggle Dataset
```bash
# Install Kaggle CLI
pip install kaggle

# Download dataset
kaggle datasets download -d sriramr/fruits-fresh-and-rotten-for-classification
unzip fruits-fresh-and-rotten-for-classification.zip -d dataset/
```

## 🎨 Improve Synthetic Data Generation

The script includes defect simulation. You can enhance it by adding:

1. **More realistic defects:**
   - Black smut patterns
   - Rotting textures
   - Sprouting greens
   - Surface mold

2. **Better augmentation:**
   - Lighting variations
   - Perspective changes
   - Blur effects
   - Noise addition

## 🚀 Quick Start (Recommended Path)

### Path A: Use Synthetic Data (Fastest)
```bash
# Step 1: Train with synthetic data
python train_improved_model.py

# Step 2: Test the model
python defect_detection_local.py

# Step 3: Restart API server
# (It will automatically use the new model)
```

### Path B: Download External Dataset
```bash
# Step 1: Get Roboflow API key from https://app.roboflow.com/settings/api

# Step 2: Find a good dataset at https://universe.roboflow.com/

# Step 3: Modify train_improved_model.py to download it

# Step 4: Run training
python train_improved_model.py
```

### Path C: Collect Your Own Data
```bash
# Step 1: Take 200-500 photos of onions (healthy and unhealthy)

# Step 2: Upload to Roboflow and annotate
#         - Label healthy onions as class 0
#         - Label unhealthy onions as class 1

# Step 3: Export as YOLOv8 format

# Step 4: Extract to combined_dataset/ folder

# Step 5: Run training
python train_improved_model.py
```

## 📈 Expected Results

After training, your model should:
- ✅ Detect healthy onions with **GREEN** bounding boxes
- ✅ Detect unhealthy onions with **RED** bounding boxes
- ✅ Work in real-time on live camera (2-5 FPS)
- ✅ Provide confidence scores (0.0 - 1.0)
- ✅ Estimate onion size and weight

## 🔍 Troubleshooting

### Model not detecting anything
- **Solution:** Lower confidence threshold in LiveCamera.tsx (line 155): `confidence_threshold=0.25`

### All onions showing same class
- **Solution:** Need more diverse training data - collect real unhealthy onion images

### Slow performance on camera
- **Solution:** Model is already optimized for speed. Consider:
  - Reducing image size (imgsz=416 instead of 640)
  - Using GPU if available
  - Reducing detection frequency

### Color boxes not showing correctly
- **Solution:** Check defect_detection_local.py CLASS_INFO (lines 30-66)
  - Class 0 should be GREEN (0, 255, 0)
  - Class 1 should be RED (0, 0, 255)

## 📚 Additional Resources

- **YOLOv8 Documentation:** https://docs.ultralytics.com/
- **Roboflow Tutorials:** https://blog.roboflow.com/
- **Computer Vision Dataset:** https://universe.roboflow.com/
- **Data Augmentation Guide:** https://blog.roboflow.com/image-augmentation/

## 🎯 Next Steps

1. ✅ Run `python train_improved_model.py`
2. ✅ Wait for training to complete (~30-60 min)
3. ✅ Test with `python defect_detection_local.py`
4. ✅ Restart API: `python defect_api.py`
5. ✅ Open Live Camera in web app
6. ✅ See GREEN (healthy) and RED (unhealthy) boxes!

---

**Need Help?** Check the console output during training for progress and any errors.
