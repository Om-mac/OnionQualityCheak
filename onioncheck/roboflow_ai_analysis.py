"""Roboflow inference adapter used by the OnionSure AI Analysis upload flow."""

import base64
import os
from datetime import datetime

import cv2
from dotenv import load_dotenv
from inference_sdk import InferenceHTTPClient


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

MODEL_ID = os.getenv("ROBOFLOW_MODEL_ID", "veg1-hcqsf-2/4")
API_URL = os.getenv("ROBOFLOW_API_URL", "https://serverless.roboflow.com")


def _client():
    api_key = os.getenv("ROBOFLOW_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "ROBOFLOW_API_KEY is not configured. Add it to onioncheck/.env "
            "before running AI Analysis."
        )
    return InferenceHTTPClient(api_url=API_URL, api_key=api_key)


def _quality_class(label):
    name = str(label or "").lower().strip().replace("_", " ")
    if name in {"onion", "healthy"}:
        return "healthy"
    if "sprout" in name:
        return "sprouted"
    if "small" in name or "under" in name:
        return "undersized"
    if any(word in name for word in ("rotten", "spoiled", "smut", "mold", "decay")):
        return "rotten"
    return "damaged"


def _annotate(image, detections):
    annotated = image.copy()
    colors = {
        "healthy": (0, 180, 0),
        "damaged": (0, 165, 255),
        "rotten": (0, 0, 220),
        "sprouted": (220, 70, 180),
        "undersized": (220, 140, 0),
    }
    for detection in detections:
        box = detection["bounding_box"]
        key = detection["class"]
        color = colors[key]
        x1, y1, x2, y2 = box["x1"], box["y1"], box["x2"], box["y2"]
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 3)
        label = f'{key} {detection["confidence"]:.0%}'
        cv2.putText(
            annotated,
            label,
            (x1, max(20, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            color,
            2,
            cv2.LINE_AA,
        )
    return annotated


def analyze(image):
    """Run the configured Roboflow model and return the OnionSure AI payload."""
    if image is None:
        raise ValueError("Could not decode uploaded image")

    height, width = image.shape[:2]
    raw = _client().infer(image, model_id=MODEL_ID)
    predictions = raw.get("predictions", []) if isinstance(raw, dict) else []
    detections = []
    counts = {
        "healthy": 0,
        "damaged": 0,
        "rotten": 0,
        "sprouted": 0,
        "undersized": 0,
    }

    for index, prediction in enumerate(predictions, start=1):
        confidence = float(prediction.get("confidence", 0))
        center_x = float(prediction.get("x", 0))
        center_y = float(prediction.get("y", 0))
        box_width = float(prediction.get("width", 0))
        box_height = float(prediction.get("height", 0))
        x1 = max(0, int(center_x - box_width / 2))
        y1 = max(0, int(center_y - box_height / 2))
        x2 = min(width, int(center_x + box_width / 2))
        y2 = min(height, int(center_y + box_height / 2))
        quality_class = _quality_class(prediction.get("class"))
        counts[quality_class] += 1
        detections.append({
            "id": index,
            "class": quality_class,
            "label": prediction.get("class"),
            "source_class": prediction.get("class"),
            "confidence": round(confidence, 4),
            "bounding_box": {
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
                "width_px": max(0, x2 - x1),
                "height_px": max(0, y2 - y1),
            },
        })

    total = len(detections)
    average_confidence = (
        round(sum(item["confidence"] for item in detections) / total, 4)
        if total else 0
    )
    defect_rate = round(
        100 * (total - counts["healthy"]) / total, 2
    ) if total else 0
    quality_weights = {
        "healthy": 1.0,
        "undersized": 0.7,
        "damaged": 0.6,
        "sprouted": 0.3,
        "rotten": 0.0,
    }
    vision_score = round(
        100 * sum(counts[key] * quality_weights[key] for key in counts) / total
    ) if total else 0

    annotated = _annotate(image, detections)
    success, encoded = cv2.imencode(".jpg", annotated)
    if not success:
        raise RuntimeError("Could not encode Roboflow annotated image")

    return {
        "success": True,
        "model_name": f"Roboflow {MODEL_ID}",
        "model_version": MODEL_ID.rsplit("/", 1)[-1],
        "provider": "roboflow",
        "mode": "ROBOFLOW",
        "total": total,
        "counts": counts,
        "detections": detections,
        "statistics": {
            "total_onions": total,
            "average_confidence": average_confidence,
            "defect_rate": defect_rate,
            "vision_score": vision_score,
            "healthy_count": counts["healthy"],
        },
        "visionScore": vision_score,
        "image_dimensions": {"width": width, "height": height},
        "annotated_image_base64": base64.b64encode(encoded).decode("ascii"),
        "processing_time_ms": None,
        "timestamp": datetime.now().isoformat(),
    }
