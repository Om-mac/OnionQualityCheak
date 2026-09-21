"""
Local YOLO-Based Defect Detection System
==========================================

This version uses a local YOLO model trained for onion quality detection.
Much faster than Roboflow API and works offline.

Features:
- Real-time detection with local YOLO model
- Detects healthy (green) vs unhealthy (red) onions
- Size estimation
- No API calls - works offline
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List
from ultralytics import YOLO


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "onion_quality_best.pt"

# Fallback to default model if custom model doesn't exist
if not MODEL_PATH.exists():
    print(f"⚠️ Custom model not found at {MODEL_PATH}")
    print("   Using default YOLOv8n model. Train custom model with train_improved_model.py")
    MODEL_PATH = "yolov8n.pt"

# Load model once at module level for faster inference
try:
    MODEL = YOLO(str(MODEL_PATH))
    print(f"✅ Loaded model: {MODEL_PATH}")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    MODEL = None


# Class definitions
CLASS_INFO = {
    0: {  # Healthy
        "name": "healthy",
        "category": "healthy",
        "severity": 0,
        "color": (0, 255, 0),  # Bright Green (BGR)
        "description": "Good quality onion"
    },
    1: {  # Unhealthy
        "name": "unhealthy",
        "category": "severe_defect",
        "severity": 3,
        "color": (0, 0, 255),  # Bright Red (BGR)
        "description": "Defective or diseased onion"
    },
    2: {  # Damaged
        "name": "damaged",
        "category": "moderate_defect",
        "severity": 2,
        "color": (0, 165, 255),  # Orange (BGR)
        "description": "Damaged onion"
    },
    3: {  # Rotten
        "name": "rotten",
        "category": "severe_defect",
        "severity": 3,
        "color": (0, 0, 200),  # Dark Red (BGR)
        "description": "Rotten onion"
    },
    4: {  # Sprouted
        "name": "sprouted",
        "category": "moderate_defect",
        "severity": 2,
        "color": (0, 200, 200),  # Yellow (BGR)
        "description": "Sprouted onion"
    },
    5: {  # Undersized
        "name": "undersized",
        "category": "minor_defect",
        "severity": 1,
        "color": (255, 100, 0),  # Blue (BGR)
        "description": "Undersized onion"
    }
}

# Size estimation parameters
AVG_ONION_DIAMETER_CM = 7.0
PIXELS_PER_CM = 20.0


def get_class_info(class_id: int) -> Dict:
    """Get information for detected class"""
    return CLASS_INFO.get(class_id, {
        "name": "unknown",
        "category": "unknown",
        "severity": 3,
        "color": (128, 128, 128),
        "description": f"Unknown class {class_id}"
    })


def calculate_real_size(pixel_width: int, pixel_height: int, pixels_per_cm: float = PIXELS_PER_CM) -> Dict:
    """Estimate real-world size from pixel dimensions"""
    width_cm = pixel_width / pixels_per_cm
    height_cm = pixel_height / pixels_per_cm
    diameter_cm = (width_cm + height_cm) / 2
    radius_cm = diameter_cm / 2
    area_cm2 = np.pi * (radius_cm ** 2)
    
    return {
        "width_cm": round(width_cm, 2),
        "height_cm": round(height_cm, 2),
        "diameter_cm": round(diameter_cm, 2),
        "area_cm2": round(area_cm2, 2)
    }


def estimate_weight(diameter_cm: float) -> float:
    """Estimate onion weight based on diameter"""
    weight_g = 150.0 * ((diameter_cm / AVG_ONION_DIAMETER_CM) ** 3)
    return round(weight_g, 1)


def detect_defects_with_sizing(
    image_path: str,
    pixels_per_cm: float = PIXELS_PER_CM,
    confidence_threshold: float = 0.4
) -> Dict:
    """
    Run defect detection using local YOLO model
    
    Args:
        image_path: Path to image or numpy array
        pixels_per_cm: Calibration factor
        confidence_threshold: Minimum confidence
        
    Returns:
        Dictionary with detection results
    """
    
    if MODEL is None:
        raise RuntimeError("Model not loaded")
    
    # Load image
    if isinstance(image_path, (str, Path)):
        image = cv2.imread(str(image_path))
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
    else:
        image = image_path  # Already a numpy array
    
    original_image = image.copy()
    image_height, image_width = image.shape[:2]
    
    # Run YOLO inference
    results = MODEL.predict(
        image,
        conf=confidence_threshold,
        imgsz=640,
        verbose=False
    )
    
    # Process detections
    detections = []
    defect_counts = {}
    severity_counts = {"healthy": 0, "minor": 0, "moderate": 0, "severe": 0}
    
    for result in results:
        boxes = result.boxes
        
        for i, box in enumerate(boxes):
            # Extract box data
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            
            # Skip low confidence
            if confidence < confidence_threshold:
                continue
            
            # Get bounding box coordinates
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            
            # Clamp to image boundaries
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(image_width, x2), min(image_height, y2)
            
            # Get class info
            class_info = get_class_info(class_id)
            class_name = class_info["name"]
            category = class_info["category"]
            severity = class_info["severity"]
            color = class_info["color"]
            
            # Calculate size
            pixel_width = x2 - x1
            pixel_height = y2 - y1
            size_info = calculate_real_size(pixel_width, pixel_height, pixels_per_cm)
            weight = estimate_weight(size_info["diameter_cm"])
            
            # Update counts
            defect_counts[class_name] = defect_counts.get(class_name, 0) + 1
            
            if category == "healthy":
                severity_counts["healthy"] += 1
            elif severity == 1:
                severity_counts["minor"] += 1
            elif severity == 2:
                severity_counts["moderate"] += 1
            elif severity == 3:
                severity_counts["severe"] += 1
            
            # Draw bounding box with thick lines
            cv2.rectangle(image, (x1, y1), (x2, y2), color, 3)
            
            # Prepare label
            label_text = f"{class_name.upper()} {confidence:.2f}"
            size_text = f"{size_info['diameter_cm']}cm {weight}g"
            
            # Draw label background
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.6
            thickness = 2
            
            # Main label
            (label_w, label_h), _ = cv2.getTextSize(label_text, font, font_scale, thickness)
            cv2.rectangle(image, (x1, y1 - label_h - 10), (x1 + label_w + 10, y1), (0, 0, 0), -1)
            cv2.putText(image, label_text, (x1 + 5, y1 - 5), font, font_scale, (255, 255, 255), thickness)
            
            # Size label
            (size_w, size_h), _ = cv2.getTextSize(size_text, font, 0.5, 1)
            cv2.rectangle(image, (x1, y2), (x1 + size_w + 10, y2 + size_h + 10), (0, 0, 0), -1)
            cv2.putText(image, size_text, (x1 + 5, y2 + size_h + 5), font, 0.5, color, 1)
            
            # Store detection
            detections.append({
                "id": i + 1,
                "class": class_name,
                "category": category,
                "severity": severity,
                "confidence": round(confidence, 3),
                "label": class_name,
                "bounding_box": {
                    "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                    "width_px": pixel_width, "height_px": pixel_height
                },
                "size": size_info["diameter_cm"],
                "bbox": [x1, y1, x2 - x1, y2 - y1],
                "description": class_info["description"]
            })
    
    # Calculate statistics
    total_detected = len(detections)
    healthy_count = severity_counts["healthy"]
    defective_count = total_detected - healthy_count
    
    statistics = {
        "total_onions": total_detected,
        "healthy_count": healthy_count,
        "defective_count": defective_count,
        "defect_rate": round((defective_count / max(total_detected, 1)) * 100, 2),
        "average_size_cm": round(
            np.mean([d["size"] for d in detections]) if detections else 0, 2
        )
    }
    
    # Add summary to image
    summary_y = 30
    summary_texts = [
        f"Total: {total_detected} | Healthy: {healthy_count} | Defective: {defective_count}",
        f"Defect Rate: {statistics['defect_rate']}% | Avg Size: {statistics['average_size_cm']}cm"
    ]
    
    for text in summary_texts:
        (text_w, text_h), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
        cv2.rectangle(image, (5, summary_y - text_h - 5), (text_w + 15, summary_y + 5), (0, 0, 0), -1)
        cv2.putText(image, text, (10, summary_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        summary_y += 35
    
    return {
        "total_detected": total_detected,
        "defect_summary": defect_counts,
        "severity_summary": severity_counts,
        "detections": detections,
        "annotated_image": image,
        "statistics": statistics,
        "calibration": {
            "pixels_per_cm": pixels_per_cm,
            "confidence_threshold": confidence_threshold
        },
        "success": True,
        "image_dimensions": {"width": image_width, "height": image_height}
    }


def calibrate_size_detection(image_path: str, known_diameter_cm: float) -> float:
    """Calibrate pixels_per_cm ratio"""
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Could not load calibration image: {image_path}")
    
    # Run detection
    results = MODEL.predict(image, conf=0.3, verbose=False)
    
    if len(results[0].boxes) == 0:
        raise ValueError("No onions detected in calibration image")
    
    # Use first detection
    box = results[0].boxes[0]
    x1, y1, x2, y2 = map(int, box.xyxy[0])
    
    pixel_width = x2 - x1
    pixel_height = y2 - y1
    pixel_diameter = (pixel_width + pixel_height) / 2
    
    pixels_per_cm = pixel_diameter / known_diameter_cm
    
    print(f"\n{'='*60}")
    print(f"CALIBRATION COMPLETE")
    print(f"{'='*60}")
    print(f"Known diameter: {known_diameter_cm} cm")
    print(f"Measured pixel diameter: {pixel_diameter:.1f} px")
    print(f"Calibrated ratio: {pixels_per_cm:.2f} pixels/cm")
    print(f"{'='*60}\n")
    
    return round(pixels_per_cm, 2)


# Keep the same module-level exports for compatibility
DEFECT_CLASSES = {info["name"]: info for info in CLASS_INFO.values()}
SIZE_CATEGORIES = {
    "very_small": (0, 4),
    "small": (4, 6),
    "medium": (6, 8),
    "large": (8, 10),
    "very_large": (10, 100)
}


if __name__ == "__main__":
    # Test the model
    test_image = BASE_DIR / "test" / "images"
    if test_image.exists():
        test_images = list(test_image.glob("*.jpg"))
        if test_images:
            print(f"Testing model on {test_images[0]}...")
            results = detect_defects_with_sizing(str(test_images[0]))
            
            output_path = BASE_DIR / "local_detection_result.jpg"
            cv2.imwrite(str(output_path), results["annotated_image"])
            print(f"\n✅ Result saved to: {output_path}")
            print(f"   Detected: {results['total_detected']} onions")
            print(f"   Defect rate: {results['statistics']['defect_rate']}%")
