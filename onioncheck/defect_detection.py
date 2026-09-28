"""
YOLO-Based Defect Detection System with Size Estimation
========================================================

This module provides comprehensive defect detection for onion quality assessment:
- Multiple defect class detection (black smut, staining, double split, etc.)
- Bounding box visualization with confidence scores
- Size estimation (area, dimensions, weight approximation)
- Defect severity classification
- Batch processing capabilities

"""

import os
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import cv2
import numpy as np
from dotenv import load_dotenv
from inference_sdk import InferenceHTTPClient


# ==========================================================================
# CONFIGURATION
# ==========================================================================

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

API_KEY = os.getenv("ROBOFLOW_API_KEY")
if not API_KEY:
    raise ValueError("ROBOFLOW_API_KEY not found in .env")

API_KEY = API_KEY.strip()
MODEL_ID = "veg1-hcqsf-2/4"

# Initialize Roboflow client
CLIENT = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=API_KEY
)


# ==========================================================================
# DEFECT CLASSIFICATION SYSTEM
# ==========================================================================

DEFECT_CLASSES = {
    # HEALTHY
    "onion": {
        "category": "healthy",
        "severity": 0,
        "color": (0, 255, 0),  # Bright Green (BGR)
        "description": "Good quality onion"
    },
    
    # MINOR DEFECTS
    "staining": {
        "category": "minor_defect",
        "severity": 1,
        "color": (0, 255, 255),  # Bright Yellow (BGR)
        "description": "Surface staining, cosmetic issue"
    },
    
    # MODERATE DEFECTS
    "sprouted": {
        "category": "moderate_defect",
        "severity": 2,
        "color": (0, 165, 255),  # Bright Orange (BGR)
        "description": "Onion has sprouted"
    },
    "double split": {
        "category": "moderate_defect",
        "severity": 2,
        "color": (0, 165, 255),  # Bright Orange (BGR)
        "description": "Double growth/split defect"
    },
    "double_split": {
        "category": "moderate_defect",
        "severity": 2,
        "color": (0, 165, 255),  # Bright Orange (BGR)
        "description": "Double growth/split defect"
    },
    "damaged": {
        "category": "moderate_defect",
        "severity": 2,
        "color": (0, 140, 255),  # Deep Orange (BGR)
        "description": "Mechanical damage / bruising"
    },
    "undersized": {
        "category": "minor_defect",
        "severity": 1,
        "color": (211, 0, 148),  # Purple (BGR)
        "description": "Bulb size below standard"
    },
    "healthy": {
        "category": "healthy",
        "severity": 0,
        "color": (0, 255, 0),    # Bright Green (BGR)
        "description": "Good quality onion"
    },
    
    # SEVERE DEFECTS
    "black smut": {
        "category": "severe_defect",
        "severity": 3,
        "color": (0, 0, 255),  # Bright Red (BGR)
        "description": "Fungal disease - black smut"
    },
    "black_smut": {
        "category": "severe_defect",
        "severity": 3,
        "color": (0, 0, 255),  # Bright Red (BGR)
        "description": "Fungal disease - black smut"
    },
    "spoiled": {
        "category": "severe_defect",
        "severity": 3,
        "color": (0, 0, 255),  # Bright Red (BGR)
        "description": "Spoiled/rotten onion"
    },
    "unhealthy": {
        "category": "severe_defect",
        "severity": 3,
        "color": (0, 0, 255),  # Bright Red (BGR)
        "description": "Unhealthy/diseased onion"
    },
    "rotten": {
        "category": "severe_defect",
        "severity": 3,
        "color": (0, 0, 255),  # Bright Red (BGR)
        "description": "Rotten onion"
    },
    
    # NEEDS REVIEW
    "manual review": {
        "category": "needs_review",
        "severity": 2,
        "color": (255, 0, 255),  # Magenta (BGR)
        "description": "Requires manual inspection"
    },
    "manual_review": {
        "category": "needs_review",
        "severity": 2,
        "color": (255, 0, 255),  # Magenta (BGR)
        "description": "Requires manual inspection"
    },
}


# ==========================================================================
# SIZE ESTIMATION PARAMETERS
# ==========================================================================

# Average onion specifications for calibration
# These should be calibrated based on your specific setup
AVG_ONION_DIAMETER_CM = 7.0  # cm
AVG_ONION_WEIGHT_G = 150.0   # grams
PIXELS_PER_CM = 20.0         # Default, should be calibrated

# Size categories
SIZE_CATEGORIES = {
    "very_small": (0, 4),      # < 4 cm diameter
    "small": (4, 6),           # 4-6 cm
    "medium": (6, 8),          # 6-8 cm
    "large": (8, 10),          # 8-10 cm
    "very_large": (10, 100)    # > 10 cm
}


# ==========================================================================
# HELPER FUNCTIONS
# ==========================================================================

def get_defect_info(class_name: str) -> Dict:
    """Get defect information for a detected class."""
    class_key = str(class_name).lower().strip()
    return DEFECT_CLASSES.get(class_key, {
        "category": "unknown",
        "severity": 3,
        "color": (128, 128, 128),  # Gray
        "description": f"Unknown class: {class_name}"
    })


def calculate_real_size(
    pixel_width: int,
    pixel_height: int,
    pixels_per_cm: float = PIXELS_PER_CM
) -> Dict:
    """
    Estimate real-world size from pixel dimensions.
    
    Returns:
        Dictionary with width_cm, height_cm, diameter_cm, area_cm2
    """
    width_cm = pixel_width / pixels_per_cm
    height_cm = pixel_height / pixels_per_cm
    
    # Approximate diameter as average of width and height
    diameter_cm = (width_cm + height_cm) / 2
    
    # Approximate circular area
    radius_cm = diameter_cm / 2
    area_cm2 = np.pi * (radius_cm ** 2)
    
    return {
        "width_cm": round(width_cm, 2),
        "height_cm": round(height_cm, 2),
        "diameter_cm": round(diameter_cm, 2),
        "area_cm2": round(area_cm2, 2)
    }


def estimate_weight(diameter_cm: float) -> float:
    """
    Estimate onion weight based on diameter.
    
    Uses a simplified cubic relationship:
    weight ∝ diameter³
    """
    # Calibration based on average onion
    weight_g = AVG_ONION_WEIGHT_G * (
        (diameter_cm / AVG_ONION_DIAMETER_CM) ** 3
    )
    return round(weight_g, 1)


def categorize_size(diameter_cm: float) -> str:
    """Categorize onion size based on diameter."""
    for category, (min_size, max_size) in SIZE_CATEGORIES.items():
        if min_size <= diameter_cm < max_size:
            return category
    return "unknown"


def calculate_advanced_features(image_roi: np.ndarray) -> Dict:
    """
    Calculate advanced visual features for defect analysis.
    
    Features:
    - Color distribution (BGR mean/std)
    - Texture analysis (local std deviation)
    - Shape regularity (circularity, solidity)
    - Surface uniformity
    """
    if image_roi is None or image_roi.size == 0:
        return {}
    
    features = {}
    
    try:
        # Color features
        for i, channel in enumerate(['B', 'G', 'R']):
            features[f'{channel}_mean'] = round(float(np.mean(image_roi[:, :, i])), 2)
            features[f'{channel}_std'] = round(float(np.std(image_roi[:, :, i])), 2)
        
        # Convert to grayscale for texture analysis
        gray = cv2.cvtColor(image_roi, cv2.COLOR_BGR2GRAY)
        
        # Texture: local standard deviation
        kernel_size = 5
        mean_kernel = np.ones((kernel_size, kernel_size)) / (kernel_size ** 2)
        local_mean = cv2.filter2D(gray.astype(float), -1, mean_kernel)
        local_sq_mean = cv2.filter2D((gray.astype(float) ** 2), -1, mean_kernel)
        local_std = np.sqrt(np.maximum(local_sq_mean - local_mean ** 2, 0))
        features['texture_std'] = round(float(np.mean(local_std)), 2)
        
        # Shape features
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(largest_contour)
            perimeter = cv2.arcLength(largest_contour, True)
            
            if perimeter > 0:
                # Circularity: 1.0 = perfect circle
                features['circularity'] = round(
                    4 * np.pi * area / (perimeter ** 2), 3
                )
            
            # Solidity: ratio of contour area to convex hull area
            hull = cv2.convexHull(largest_contour)
            hull_area = cv2.contourArea(hull)
            if hull_area > 0:
                features['solidity'] = round(area / hull_area, 3)
        
        # Surface uniformity (coefficient of variation)
        mean_brightness = np.mean(gray)
        if mean_brightness > 0:
            features['uniformity'] = round(
                1.0 - (np.std(gray) / mean_brightness), 3
            )
        
    except Exception as e:
        print(f"Warning: Feature calculation error: {e}")
    
    return features


def detect_specific_defects(image_roi: np.ndarray, defect_type: str) -> Dict:
    """
    Perform specialized detection for specific defect types.
    
    Args:
        image_roi: Cropped onion region
        defect_type: Type of defect to analyze
        
    Returns:
        Dictionary with defect-specific metrics
    """
    if image_roi is None or image_roi.size == 0:
        return {}
    
    defect_metrics = {}
    
    try:
        # Convert to different color spaces
        hsv = cv2.cvtColor(image_roi, cv2.COLOR_BGR2HSV)
        gray = cv2.cvtColor(image_roi, cv2.COLOR_BGR2GRAY)
        
        if defect_type in ["black_smut", "black smut"]:
            # Detect dark/black regions
            _, dark_mask = cv2.threshold(gray, 60, 255, cv2.THRESH_BINARY_INV)
            dark_ratio = cv2.countNonZero(dark_mask) / (image_roi.shape[0] * image_roi.shape[1])
            defect_metrics['dark_region_ratio'] = round(dark_ratio, 4)
            defect_metrics['severity_score'] = min(dark_ratio * 10, 1.0)
        
        elif defect_type == "sprouted":
            # Detect green sprouting regions
            lower_green = np.array([30, 25, 25])
            upper_green = np.array([100, 255, 255])
            green_mask = cv2.inRange(hsv, lower_green, upper_green)
            green_ratio = cv2.countNonZero(green_mask) / (image_roi.shape[0] * image_roi.shape[1])
            defect_metrics['green_ratio'] = round(green_ratio, 4)
            defect_metrics['sprouting_severity'] = "high" if green_ratio > 0.01 else "low"
        
        elif defect_type == "staining":
            # Detect brown/yellow discoloration
            lower_brown = np.array([10, 50, 50])
            upper_brown = np.array([30, 255, 255])
            stain_mask = cv2.inRange(hsv, lower_brown, upper_brown)
            stain_ratio = cv2.countNonZero(stain_mask) / (image_roi.shape[0] * image_roi.shape[1])
            defect_metrics['stain_coverage'] = round(stain_ratio, 4)
        
        elif defect_type in ["spoiled", "unhealthy"]:
            # General quality degradation indicators
            brightness = np.mean(gray)
            std_dev = np.std(gray)
            defect_metrics['brightness_level'] = round(brightness, 2)
            defect_metrics['texture_irregularity'] = round(std_dev, 2)
            defect_metrics['degradation_level'] = "high" if brightness < 80 else "moderate"
        
    except Exception as e:
        print(f"Warning: Defect-specific detection error: {e}")
    
    return defect_metrics


# ==========================================================================
# MAIN DEFECT DETECTION FUNCTION
# ==========================================================================

_LOCAL_DETECTOR = None
_LOCAL_CLASSIFIER = None

def get_local_models():
    global _LOCAL_DETECTOR, _LOCAL_CLASSIFIER
    if _LOCAL_DETECTOR is None:
        try:
            from ultralytics import YOLO
            det_p = BASE_DIR / "models" / "onion_detector_best.pt"
            if not det_p.exists():
                det_p = BASE_DIR / "runs" / "onion_detector_v3" / "weights" / "best.pt"
            if det_p.exists():
                _LOCAL_DETECTOR = YOLO(str(det_p))
        except Exception as e:
            print(f"Warning: Could not load local detector: {e}")
    if _LOCAL_CLASSIFIER is None:
        try:
            from ultralytics import YOLO
            cls_p = BASE_DIR / "models" / "onion_multiclass_best.pt"
            if not cls_p.exists():
                cls_p = BASE_DIR / "runs" / "multiclass" / "onion_quality_5cls" / "weights" / "best.pt"
            if cls_p.exists():
                _LOCAL_CLASSIFIER = YOLO(str(cls_p))
        except Exception as e:
            print(f"Warning: Could not load local classifier: {e}")
    return _LOCAL_DETECTOR, _LOCAL_CLASSIFIER


def detect_defects_with_sizing(
    image_path: str,
    pixels_per_cm: float = PIXELS_PER_CM,
    confidence_threshold: float = 0.28,
    prefer_local: bool = True
) -> Dict:
    """
    Complete defect detection pipeline with size estimation.
    Supports both trained local YOLO models (fast, offline) and Roboflow cloud API.
    """
    # Load image
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Could not load image: {image_path}")
    
    original_image = image.copy()
    image_height, image_width = image.shape[:2]
    
    predictions = []
    
    # 1. Try local model first if preferred or available
    if prefer_local:
        det_m, cls_m = get_local_models()
        if det_m is not None:
            try:
                res = det_m(image, conf=confidence_threshold, iou=0.45, verbose=False)[0]
                if res.boxes is not None:
                    for b in res.boxes:
                        xyxy = b.xyxy[0].cpu().numpy().astype(int)
                        bx1, by1, bx2, by2 = xyxy
                        bw = bx2 - bx1
                        bh = by2 - by1
                        if bw < 20 or bh < 20:
                            continue
                        cx = (bx1 + bx2) / 2.0
                        cy = (by1 + by2) / 2.0
                        det_c = float(b.conf[0])
                        
                        # Classify quality
                        top_label = "onion"
                        if cls_m is not None:
                            crop = image[max(0, by1):min(image_height, by2), max(0, bx1):min(image_width, bx2)]
                            if crop.size > 0:
                                c_out = cls_m(crop, verbose=False)[0]
                                if c_out.probs is not None:
                                    top_idx = int(c_out.probs.top1)
                                    top_label = cls_m.names.get(top_idx, "onion")
                        
                        predictions.append({
                            "class": top_label,
                            "confidence": det_c,
                            "x": cx,
                            "y": cy,
                            "width": float(bw),
                            "height": float(bh)
                        })
            except Exception as e:
                print(f"[!] Local inference fallback error: {e}")

    # 2. Fallback to Roboflow if local yielded no predictions or wasn't preferred
    if not predictions and CLIENT is not None:
        try:
            result = CLIENT.infer(image, model_id=MODEL_ID)
            predictions = result.get("predictions", [])
        except Exception as e:
            print(f"[!] Roboflow infer error: {e}")
            # Try local as last resort if not tried yet
            if not prefer_local:
                det_m, cls_m = get_local_models()
                if det_m is not None:
                    res = det_m(image, conf=confidence_threshold, iou=0.45, verbose=False)[0]
                    if res.boxes is not None:
                        for b in res.boxes:
                            xyxy = b.xyxy[0].cpu().numpy().astype(int)
                            bx1, by1, bx2, by2 = xyxy
                            predictions.append({
                                "class": "onion",
                                "confidence": float(b.conf[0]),
                                "x": (bx1 + bx2) / 2.0,
                                "y": (by1 + by2) / 2.0,
                                "width": float(bx2 - bx1),
                                "height": float(by2 - by1)
                            })
    
    # Initialize counters
    defect_counts = {}
    severity_counts = {"healthy": 0, "minor": 0, "moderate": 0, "severe": 0, "unknown": 0}
    detections = []
    
    # Process each detection
    for idx, prediction in enumerate(predictions, start=1):
        
        # Extract basic detection info
        detected_class = str(prediction.get("class", "unknown"))
        confidence = float(prediction.get("confidence", 0))
        
        # Skip low confidence detections
        if confidence < confidence_threshold:
            continue
        
        # Get bounding box (Roboflow format: center x, y + width, height)
        center_x = float(prediction.get("x", 0))
        center_y = float(prediction.get("y", 0))
        box_width = float(prediction.get("width", 0))
        box_height = float(prediction.get("height", 0))
        
        # Convert to corner coordinates
        x1 = int(center_x - box_width / 2)
        y1 = int(center_y - box_height / 2)
        x2 = int(center_x + box_width / 2)
        y2 = int(center_y + box_height / 2)
        
        # Clamp to image boundaries
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(image_width, x2), min(image_height, y2)
        
        # Extract ROI
        onion_roi = original_image[y1:y2, x1:x2]
        
        # Get defect information
        defect_info = get_defect_info(detected_class)
        category = defect_info["category"]
        severity = defect_info["severity"]
        color = defect_info["color"]
        description = defect_info["description"]
        
        # Calculate size
        pixel_dims = {"width": x2 - x1, "height": y2 - y1}
        size_info = calculate_real_size(
            pixel_dims["width"],
            pixel_dims["height"],
            pixels_per_cm
        )
        
        # Estimate weight
        estimated_weight = estimate_weight(size_info["diameter_cm"])
        size_category = categorize_size(size_info["diameter_cm"])
        
        # Calculate advanced features
        features = calculate_advanced_features(onion_roi)
        
        # Detect specific defect characteristics
        defect_metrics = detect_specific_defects(onion_roi, detected_class)
        
        # Update counters
        defect_counts[detected_class] = defect_counts.get(detected_class, 0) + 1
        
        if category == "healthy":
            severity_counts["healthy"] += 1
        elif severity == 1:
            severity_counts["minor"] += 1
        elif severity == 2:
            severity_counts["moderate"] += 1
        elif severity == 3:
            severity_counts["severe"] += 1
        else:
            severity_counts["unknown"] += 1
        
        # Draw bounding box with thicker lines
        cv2.rectangle(image, (x1, y1), (x2, y2), color, 4)
        
        # Create detailed label
        label_lines = [
            f"{detected_class.upper()}",
            f"Conf: {confidence:.2f}",
            f"Size: {size_category}",
            f"D: {size_info['diameter_cm']}cm",
            f"~{estimated_weight}g"
        ]
        
        # Draw multi-line label with background
        y_offset = y1 - 10
        for line in reversed(label_lines):
            if y_offset < 20:
                y_offset = y2 + 20
            
            # Get text size for background
            (text_width, text_height), _ = cv2.getTextSize(
                line, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
            )
            
            # Draw black background rectangle
            cv2.rectangle(
                image, 
                (x1 - 2, y_offset - text_height - 2), 
                (x1 + text_width + 2, y_offset + 2),
                (0, 0, 0), 
                -1
            )
            
            # Draw white text on black background
            cv2.putText(
                image, line, (x1, y_offset),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2
            )
            y_offset -= 22
        
        # Draw severity indicator with background
        severity_text = f"Severity: {severity}/3"
        (text_width, text_height), _ = cv2.getTextSize(
            severity_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
        )
        
        # Background for severity
        cv2.rectangle(
            image,
            (x1 - 2, y2 + 5),
            (x1 + text_width + 2, y2 + text_height + 22),
            (0, 0, 0),
            -1
        )
        
        cv2.putText(
            image, severity_text, (x1, y2 + 20),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2
        )
        
        # Store detection result
        detection_result = {
            "id": idx,
            "class": detected_class,
            "category": category,
            "severity": severity,
            "confidence": round(confidence, 3),
            "description": description,
            "bounding_box": {
                "x1": x1, "y1": y1,
                "x2": x2, "y2": y2,
                "width_px": pixel_dims["width"],
                "height_px": pixel_dims["height"]
            },
            "size_estimation": {
                **size_info,
                "size_category": size_category,
                "estimated_weight_g": estimated_weight
            },
            "visual_features": features,
            "defect_metrics": defect_metrics
        }
        
        detections.append(detection_result)
    
    # Calculate statistics
    total_detected = len(detections)
    
    statistics = {
        "total_onions": total_detected,
        "healthy_count": severity_counts["healthy"],
        "defective_count": total_detected - severity_counts["healthy"],
        "defect_rate": round(
            (total_detected - severity_counts["healthy"]) / max(total_detected, 1) * 100, 2
        ),
        "average_size_cm": round(
            float(np.mean([d["size_estimation"]["diameter_cm"] for d in detections]))
            if detections else 0.0, 2
        ),
        "total_estimated_weight_g": round(
            float(sum(d["size_estimation"]["estimated_weight_g"] for d in detections)), 1
        )
    }
    
    # Add summary text to image with better visibility
    summary_y = 35
    summary_texts = [
        f"Total Detected: {total_detected}",
        f"Healthy: {severity_counts['healthy']} | Defective: {statistics['defective_count']}",
        f"Defect Rate: {statistics['defect_rate']}%",
        f"Avg Size: {statistics['average_size_cm']}cm | Total Weight: ~{statistics['total_estimated_weight_g']}g"
    ]
    
    for text in summary_texts:
        # Get text size
        (text_width, text_height), _ = cv2.getTextSize(
            text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2
        )
        
        # Draw black background
        cv2.rectangle(
            image, 
            (5, summary_y - text_height - 5), 
            (text_width + 15, summary_y + 5), 
            (0, 0, 0), 
            -1
        )
        
        # Draw white text
        cv2.putText(
            image, text, (10, summary_y),
            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2
        )
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
        }
    }


# ==========================================================================
# CALIBRATION HELPER
# ==========================================================================

def calibrate_size_detection(
    image_path: str,
    known_diameter_cm: float,
    bbox_coords: Tuple[int, int, int, int] = None
) -> float:
    """
    Calibrate pixels_per_cm ratio using a reference onion with known size.
    
    Args:
        image_path: Path to calibration image
        known_diameter_cm: Actual diameter of reference onion in cm
        bbox_coords: Optional (x1, y1, x2, y2) if manually specified
        
    Returns:
        Calculated pixels_per_cm ratio
    """
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Could not load calibration image: {image_path}")
    
    if bbox_coords is None:
        # Auto-detect using Roboflow
        result = CLIENT.infer(image, model_id=MODEL_ID)
        predictions = result.get("predictions", [])
        
        if not predictions:
            raise ValueError("No onions detected in calibration image")
        
        # Use first detection
        pred = predictions[0]
        center_x = pred.get("x", 0)
        center_y = pred.get("y", 0)
        width = pred.get("width", 0)
        height = pred.get("height", 0)
        
        pixel_diameter = (width + height) / 2
    else:
        x1, y1, x2, y2 = bbox_coords
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


if __name__ == "__main__":
    # Example usage
    test_image = BASE_DIR / "test" / "images" / "Onion13364_jpg.rf.Ulf8LXLw2grOxarqqnHX.jpg"
    
    if test_image.exists():
        print("Running defect detection with size estimation...")
        results = detect_defects_with_sizing(test_image)
        
        # Save annotated image
        output_path = BASE_DIR / "defect_detection_result.jpg"
        cv2.imwrite(str(output_path), results["annotated_image"])
        
        print(f"\nResults saved to: {output_path}")
        print(f"\nDetection Summary:")
        print(f"Total detected: {results['total_detected']}")
        print(f"Statistics: {results['statistics']}")
    else:
        print(f"Test image not found: {test_image}")
