# 🔍 YOLO Defect Detection System - Complete Guide

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Usage](#usage)
5. [Calibration](#calibration)
6. [API Integration](#api-integration)
7. [Django Integration](#django-integration)
8. [Advanced Features](#advanced-features)

---

## Overview

This is a comprehensive **YOLO-based defect detection system** specifically designed for onion quality assessment with:

- **Multi-class defect detection**: Black smut, sprouted, staining, double split, spoiled, etc.
- **Bounding box visualization**: Color-coded boxes based on severity
- **Size estimation**: Real-world dimensions (cm) and weight approximation (grams)
- **Severity classification**: 0 (Healthy) to 3 (Severe defects)
- **Batch processing**: Analyze multiple images simultaneously
- **Export capabilities**: CSV, JSON, and annotated images

---

## Features

### 1. Defect Classification

#### Severity Levels:
- **Level 0 (Healthy)** 🟢
  - Clean, unblemished onions
  - Good for premium markets
  
- **Level 1 (Minor)** 🟡
  - Cosmetic issues (staining)
  - Suitable for processing
  
- **Level 2 (Moderate)** 🟠
  - Sprouted onions
  - Double split defects
  - Reduced market value
  
- **Level 3 (Severe)** 🔴
  - Black smut (fungal disease)
  - Spoiled/rotten
  - Unhealthy/diseased
  - Should be rejected

### 2. Size Estimation

Automatic measurement of:
- **Diameter** (cm)
- **Width x Height** (cm)
- **Circular area** (cm²)
- **Weight approximation** (grams)

Size categories:
- Very Small: < 4 cm
- Small: 4-6 cm
- Medium: 6-8 cm
- Large: 8-10 cm
- Very Large: > 10 cm

### 3. Visual Analysis

Advanced feature extraction:
- Color distribution (BGR channels)
- Texture analysis
- Circularity measurement
- Surface uniformity
- Solidity calculation

### 4. Defect-Specific Detection

Specialized analysis for:
- **Black smut**: Dark region detection
- **Sprouting**: Green pixel analysis
- **Staining**: Discoloration measurement
- **Spoilage**: Degradation indicators

---

## Installation

### Prerequisites
```bash
# Python 3.8+ required
python --version
```

### Install Dependencies
```bash
cd "C:\Users\darak\Desktop\onion zip\onioncheck"

# Install required packages
pip install -r requirements.txt

# Additional dependencies for defect detection
pip install inference-sdk python-dotenv
```

### Environment Setup
Create `.env` file with your Roboflow API key:
```bash
ROBOFLOW_API_KEY=your_api_key_here
```

---

## Usage

### Option 1: Streamlit Web Interface

```bash
# Launch the defect detection dashboard
streamlit run defect_detection_app.py --server.port 8502
```

Access at: http://localhost:8502

**Features:**
- Upload single or multiple images
- Real-time detection with visualization
- Interactive calibration tools
- Export reports in CSV/JSON
- Batch processing with statistics

### Option 2: Python API

```python
from defect_detection import detect_defects_with_sizing

# Analyze an image
results = detect_defects_with_sizing(
    image_path="path/to/onion_image.jpg",
    pixels_per_cm=20.0,  # Calibration factor
    confidence_threshold=0.4
)

# Access results
print(f"Total detected: {results['total_detected']}")
print(f"Defect rate: {results['statistics']['defect_rate']}%")

# Save annotated image
import cv2
cv2.imwrite("output.jpg", results["annotated_image"])

# Export to JSON
import json
with open("results.json", "w") as f:
    json.dump(results["detections"], f, indent=2)
```

### Option 3: Command Line

```python
# Run the defect detection module directly
python defect_detection.py
```

---

## Calibration

### Why Calibrate?

Size estimation requires knowing the **pixels-to-centimeter ratio** for your camera setup. Calibration ensures accurate measurements.

### Calibration Methods

#### Method 1: Using the Web Interface

1. Go to **Sidebar → Calibration Tool**
2. Upload an image with a known onion
3. Enter the actual diameter (cm)
4. Click **"Calibrate"**
5. System calculates `pixels_per_cm` automatically

#### Method 2: Using Python API

```python
from defect_detection import calibrate_size_detection

# Calibrate using a reference onion
pixels_per_cm = calibrate_size_detection(
    image_path="calibration_image.jpg",
    known_diameter_cm=7.5  # Measured with ruler
)

print(f"Calibrated: {pixels_per_cm} pixels/cm")

# Use this value in future detections
results = detect_defects_with_sizing(
    "test_image.jpg",
    pixels_per_cm=pixels_per_cm
)
```

#### Method 3: Manual Calculation

```python
# If you have bounding box coordinates
pixels_per_cm = calibrate_size_detection(
    image_path="calibration_image.jpg",
    known_diameter_cm=7.5,
    bbox_coords=(100, 50, 250, 200)  # (x1, y1, x2, y2)
)
```

### Calibration Best Practices

1. **Use a ruler or caliper** to measure actual onion diameter
2. **Consistent camera distance**: Calibrate at same distance as production setup
3. **Good lighting**: Ensure clear onion boundaries
4. **Average multiple measurements**: Calibrate with 3-5 reference onions
5. **Re-calibrate** if camera setup changes

---

## API Integration

### REST API for Django (Flask Example)

Create `defect_api.py`:

```python
from flask import Flask, request, jsonify
from defect_detection import detect_defects_with_sizing
import tempfile
import os

app = Flask(__name__)

@app.route('/api/detect-defects', methods=['POST'])
def detect_defects():
    """
    Endpoint for defect detection
    
    Request:
        - image: File upload
        - pixels_per_cm: Float (optional, default 20.0)
        - confidence_threshold: Float (optional, default 0.4)
    
    Response:
        - JSON with detection results
    """
    
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    image_file = request.files['image']
    pixels_per_cm = float(request.form.get('pixels_per_cm', 20.0))
    confidence = float(request.form.get('confidence_threshold', 0.4))
    
    # Save temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
        image_file.save(tmp.name)
        temp_path = tmp.name
    
    try:
        # Run detection
        results = detect_defects_with_sizing(
            temp_path,
            pixels_per_cm=pixels_per_cm,
            confidence_threshold=confidence
        )
        
        # Remove image data (too large for JSON)
        results.pop('annotated_image', None)
        
        return jsonify(results), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.route('/api/calibrate', methods=['POST'])
def calibrate():
    """Calibration endpoint"""
    
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    image_file = request.files['image']
    known_diameter = float(request.form.get('known_diameter_cm', 7.0))
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
        image_file.save(tmp.name)
        temp_path = tmp.name
    
    try:
        from defect_detection import calibrate_size_detection
        
        pixels_per_cm = calibrate_size_detection(temp_path, known_diameter)
        
        return jsonify({
            "pixels_per_cm": pixels_per_cm,
            "known_diameter_cm": known_diameter
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

Run the API:
```bash
python defect_api.py
```

Test with cURL:
```bash
# Detect defects
curl -X POST http://localhost:5000/api/detect-defects \
  -F "image=@test_onion.jpg" \
  -F "pixels_per_cm=20.0" \
  -F "confidence_threshold=0.4"

# Calibrate
curl -X POST http://localhost:5000/api/calibrate \
  -F "image=@calibration_onion.jpg" \
  -F "known_diameter_cm=7.5"
```

---

## Django Integration

### Step 1: Create Django App

```bash
cd onionsure
python manage.py startapp quality_inspection
```

### Step 2: Create Models

`quality_inspection/models.py`:

```python
from django.db import models
from farmers.models import FarmProduct

class QualityInspection(models.Model):
    """Quality inspection results for farm products"""
    
    SEVERITY_CHOICES = [
        (0, 'Healthy'),
        (1, 'Minor Defect'),
        (2, 'Moderate Defect'),
        (3, 'Severe Defect'),
    ]
    
    farm_product = models.ForeignKey(
        FarmProduct,
        on_delete=models.CASCADE,
        related_name='inspections'
    )
    
    inspection_date = models.DateTimeField(auto_now_add=True)
    image = models.ImageField(upload_to='inspections/')
    
    # Detection summary
    total_detected = models.IntegerField(default=0)
    healthy_count = models.IntegerField(default=0)
    defective_count = models.IntegerField(default=0)
    defect_rate = models.FloatField(default=0.0)  # Percentage
    
    # Size estimation
    average_diameter_cm = models.FloatField(null=True, blank=True)
    total_estimated_weight_g = models.FloatField(null=True, blank=True)
    
    # Calibration
    pixels_per_cm = models.FloatField(default=20.0)
    
    # Full results (JSON)
    detailed_results = models.JSONField(null=True, blank=True)
    
    class Meta:
        ordering = ['-inspection_date']
    
    def __str__(self):
        return f"Inspection {self.id} - {self.farm_product.name}"


class DefectDetection(models.Model):
    """Individual defect detection within an inspection"""
    
    inspection = models.ForeignKey(
        QualityInspection,
        on_delete=models.CASCADE,
        related_name='detections'
    )
    
    detection_id = models.IntegerField()  # ID within the image
    defect_class = models.CharField(max_length=100)
    category = models.CharField(max_length=100)
    severity = models.IntegerField(choices=QualityInspection.SEVERITY_CHOICES)
    confidence = models.FloatField()
    
    # Size
    diameter_cm = models.FloatField()
    estimated_weight_g = models.FloatField()
    size_category = models.CharField(max_length=50)
    
    # Bounding box
    bbox_x1 = models.IntegerField()
    bbox_y1 = models.IntegerField()
    bbox_x2 = models.IntegerField()
    bbox_y2 = models.IntegerField()
    
    # Features
    visual_features = models.JSONField(null=True, blank=True)
    defect_metrics = models.JSONField(null=True, blank=True)
    
    class Meta:
        ordering = ['detection_id']
    
    def __str__(self):
        return f"{self.defect_class} - Severity {self.severity}"
```

### Step 3: Create Serializers

`quality_inspection/serializers.py`:

```python
from rest_framework import serializers
from .models import QualityInspection, DefectDetection

class DefectDetectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DefectDetection
        fields = '__all__'


class QualityInspectionSerializer(serializers.ModelSerializer):
    detections = DefectDetectionSerializer(many=True, read_only=True)
    
    class Meta:
        model = QualityInspection
        fields = '__all__'


class InspectionCreateSerializer(serializers.Serializer):
    """Serializer for creating new inspection"""
    
    farm_product_id = serializers.IntegerField()
    image = serializers.ImageField()
    pixels_per_cm = serializers.FloatField(default=20.0)
    confidence_threshold = serializers.FloatField(default=0.4)
```

### Step 4: Create Views

`quality_inspection/views.py`:

```python
import os
import sys
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings

from .models import QualityInspection, DefectDetection
from .serializers import (
    QualityInspectionSerializer,
    DefectDetectionSerializer,
    InspectionCreateSerializer
)

# Add onioncheck to Python path
ONIONCHECK_PATH = os.path.join(
    settings.BASE_DIR.parent,
    'onioncheck'
)
sys.path.insert(0, ONIONCHECK_PATH)

from defect_detection import detect_defects_with_sizing


class QualityInspectionViewSet(viewsets.ModelViewSet):
    """API endpoints for quality inspection"""
    
    queryset = QualityInspection.objects.all()
    serializer_class = QualityInspectionSerializer
    
    @action(detail=False, methods=['post'])
    def run_inspection(self, request):
        """
        Run defect detection on uploaded image
        
        POST /api/quality-inspection/run_inspection/
        Body:
            - farm_product_id: int
            - image: file
            - pixels_per_cm: float (optional)
            - confidence_threshold: float (optional)
        """
        
        serializer = InspectionCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = serializer.validated_data
        
        # Get farm product
        from farmers.models import FarmProduct
        try:
            farm_product = FarmProduct.objects.get(
                id=data['farm_product_id']
            )
        except FarmProduct.DoesNotExist:
            return Response(
                {"error": "Farm product not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Save uploaded image
        image_file = data['image']
        inspection = QualityInspection.objects.create(
            farm_product=farm_product,
            image=image_file,
            pixels_per_cm=data.get('pixels_per_cm', 20.0)
        )
        
        try:
            # Run defect detection
            image_path = inspection.image.path
            
            results = detect_defects_with_sizing(
                image_path,
                pixels_per_cm=data.get('pixels_per_cm', 20.0),
                confidence_threshold=data.get('confidence_threshold', 0.4)
            )
            
            # Update inspection
            inspection.total_detected = results['total_detected']
            inspection.healthy_count = results['severity_summary']['healthy']
            inspection.defective_count = results['statistics']['defective_count']
            inspection.defect_rate = results['statistics']['defect_rate']
            inspection.average_diameter_cm = results['statistics']['average_size_cm']
            inspection.total_estimated_weight_g = results['statistics']['total_estimated_weight_g']
            inspection.detailed_results = results
            inspection.save()
            
            # Create individual detections
            for det in results['detections']:
                DefectDetection.objects.create(
                    inspection=inspection,
                    detection_id=det['id'],
                    defect_class=det['class'],
                    category=det['category'],
                    severity=det['severity'],
                    confidence=det['confidence'],
                    diameter_cm=det['size_estimation']['diameter_cm'],
                    estimated_weight_g=det['size_estimation']['estimated_weight_g'],
                    size_category=det['size_estimation']['size_category'],
                    bbox_x1=det['bounding_box']['x1'],
                    bbox_y1=det['bounding_box']['y1'],
                    bbox_x2=det['bounding_box']['x2'],
                    bbox_y2=det['bounding_box']['y2'],
                    visual_features=det['visual_features'],
                    defect_metrics=det['defect_metrics']
                )
            
            return Response(
                QualityInspectionSerializer(inspection).data,
                status=status.HTTP_201_CREATED
            )
        
        except Exception as e:
            inspection.delete()
            return Response(
                {"error": f"Detection failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def download_report(self, request, pk=None):
        """Download inspection report as CSV"""
        
        inspection = self.get_object()
        
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="inspection_{pk}_report.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Class', 'Category', 'Severity',
            'Confidence', 'Diameter (cm)', 'Weight (g)',
            'Size Category'
        ])
        
        for det in inspection.detections.all():
            writer.writerow([
                det.detection_id,
                det.defect_class,
                det.category,
                det.severity,
                det.confidence,
                det.diameter_cm,
                det.estimated_weight_g,
                det.size_category
            ])
        
        return response
```

### Step 5: URLs

`quality_inspection/urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QualityInspectionViewSet

router = DefaultRouter()
router.register(r'inspections', QualityInspectionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
```

Add to main `onionsure/urls.py`:

```python
urlpatterns = [
    # ... existing patterns ...
    path('api/quality/', include('quality_inspection.urls')),
]
```

### Step 6: Settings

Add to `onionsure/settings.py`:

```python
INSTALLED_APPS = [
    # ... existing apps ...
    'quality_inspection',
]

# Media files (for inspection images)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

### Step 7: Migrate

```bash
python manage.py makemigrations quality_inspection
python manage.py migrate
```

### Step 8: Usage

```bash
# Run inspection
curl -X POST http://localhost:8000/api/quality/inspections/run_inspection/ \
  -F "farm_product_id=1" \
  -F "image=@test_onion.jpg" \
  -F "pixels_per_cm=20.0" \
  -F "confidence_threshold=0.4" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get all inspections
curl http://localhost:8000/api/quality/inspections/

# Get specific inspection
curl http://localhost:8000/api/quality/inspections/1/

# Download report
curl http://localhost:8000/api/quality/inspections/1/download_report/ > report.csv
```

---

## Advanced Features

### 1. Batch Processing

```python
from defect_detection import detect_defects_with_sizing
import glob

# Process all images in a folder
image_files = glob.glob("images/*.jpg")

for image_path in image_files:
    results = detect_defects_with_sizing(image_path)
    print(f"{image_path}: {results['statistics']['defect_rate']}% defects")
```

### 2. Real-time Processing

```python
import cv2
from defect_detection import detect_defects_with_sizing

# Capture from webcam
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    # Save frame temporarily
    cv2.imwrite("temp_frame.jpg", frame)
    
    # Run detection
    results = detect_defects_with_sizing("temp_frame.jpg")
    
    # Display annotated frame
    cv2.imshow("Defect Detection", results["annotated_image"])
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
```

### 3. Custom Defect Classes

Modify `defect_detection.py`:

```python
DEFECT_CLASSES = {
    # Add your custom classes
    "my_custom_defect": {
        "category": "custom",
        "severity": 2,
        "color": (128, 0, 128),
        "description": "Custom defect type"
    },
    # ... existing classes ...
}
```

---

## Troubleshooting

### Issue: Low accuracy

**Solution:**
1. Calibrate properly
2. Ensure good lighting
3. Adjust confidence threshold
4. Check Roboflow model version

### Issue: Size estimation inaccurate

**Solution:**
1. Re-calibrate with multiple reference onions
2. Maintain consistent camera distance
3. Use ruler/caliper for accurate measurements

### Issue: API timeout

**Solution:**
1. Reduce image size before upload
2. Increase timeout settings
3. Use batch processing for multiple images

---

## Support & Resources

- **Documentation**: This file
- **Model Info**: MODEL_DOCUMENTATION.md
- **Roboflow API**: https://docs.roboflow.com/
- **OpenCV Docs**: https://docs.opencv.org/

---

**Version**: 2.0  
**Last Updated**: September 2026  
**Developed for**: onionsure Agricultural Platform
