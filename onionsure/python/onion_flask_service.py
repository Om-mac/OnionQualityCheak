#!/usr/bin/env python3
"""
OnionSure - Local YOLO Flask Service
====================================
Flask API server that runs the trained YOLOv8 models locally:
  1. YOLOv8-seg (onion detection)
  2. YOLOv8-cls (healthy/unhealthy classification)

Endpoints:
  GET  /api/health               - health check
  POST /api/detect               - upload image, get detection results
  POST /api/detect-base64        - send base64 image, get detection results

  --- Live Camera (used by LiveCamera.tsx) ---
  GET  /api/camera/status        - probe whether a camera is available (does NOT open it)
  POST /api/camera/start         - open the camera (turns on LED)
  GET  /api/camera/frame         - get one frame
                                   ?detect=false&format=image  -> plain JPEG bytes
                                   ?detect=true&format=json   -> JSON with annotated base64 + detections
  POST /api/camera/stop          - release the camera (turns off LED)

Response format matches what OnionSure's ai.js mapOnionCheckToVision expects.
"""

import io
import base64
import os
import sys
import threading
import numpy as np
from pathlib import Path
from datetime import datetime

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from PIL import Image
import cv2
from ultralytics import YOLO

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "onioncheck"))
from roboflow_ai_analysis import analyze as analyze_with_roboflow

# ==========================================================================
# CONFIGURATION
# ==========================================================================

BASE_DIR = Path(__file__).resolve().parent
ONIONCHECK_DIR = BASE_DIR.parent / "onioncheck"

SEG_MODEL_PATH = ONIONCHECK_DIR / "runs" / "segment" / "runs" / "onion_seg_test" / "weights" / "best.pt"
# Prefer the 5-class multi-class model; fall back to the binary healthy/unhealthy model
CLS_MODEL_PATH_5CLS = ONIONCHECK_DIR / "models" / "onion_multiclass_best.pt"
CLS_MODEL_PATH_BIN  = ONIONCHECK_DIR / "runs" / "classify" / "runs" / "onion_cls" / "weights" / "best.pt"
CLS_MODEL_PATH = CLS_MODEL_PATH_5CLS if CLS_MODEL_PATH_5CLS.exists() else CLS_MODEL_PATH_BIN
CLS_MULTICLASS = CLS_MODEL_PATH_5CLS.exists()  # True when 5-class model is loaded

INFERENCE_SIZE = 640
CLS_INFER_SIZE = 224
CONFIDENCE = 0.25
IOU_THRESHOLD = 0.4
MAX_DET = 30

# Size rules. A pixel->cm scale is only trustworthy when the caller supplies a
# calibration reference, so the nominal constant below is used for DISPLAY only
# and never drives the undersized decision when no calibration is available.
UNDERSIZED_CM = 4.0          # absolute cutoff, used when px_per_cm is known
UNDERSIZED_RELATIVE = 0.45   # uncalibrated: bulb < 45% of the frame median
UNDERSIZED_MIN_CONF = 0.60   # ...and only on a confidently-SEGMENTED bulb
NOMINAL_PX_PER_CM = 20.0     # display-only estimate

# A binary-head `unhealthy` verdict below this confidence is treated as
# "cannot judge" rather than a defect: it is routed to manual review and kept
# out of the graded tally, so a near-coin-flip call cannot decide a lot's grade.
DEFECT_MIN_CONF = 0.70

CLASSES = ["healthy", "damaged", "rotten", "sprouted", "undersized"]

# Quality weights for vision score calculation
QUALITY_WEIGHT = {
    "healthy": 1.0,
    "undersized": 0.7,
    "damaged": 0.6,
    "sprouted": 0.3,
    "rotten": 0.0,
}

app = Flask(__name__)
CORS(app)

# Load models once at startup — graceful fallback if weights are missing
print("=" * 60)
print("  OnionSure Local YOLO Flask Service")
print("=" * 60)

seg_model = None
cls_model = None
seg_names = {0: "onion"}
cls_names = {0: "healthy", 1: "unhealthy"}  # overwritten if 5-class model loads

print(f"  Checking segmentation model: {SEG_MODEL_PATH}")
if not SEG_MODEL_PATH.exists():
    print("  [WARNING] Seg model not found — YOLO detection will use simulated fallback.")
else:
    try:
        seg_model = YOLO(str(SEG_MODEL_PATH))
        seg_names = seg_model.names if hasattr(seg_model, "names") else seg_names
        print(f"  Seg classes: {seg_names}")
    except Exception as e:
        print(f"  [WARNING] Failed to load seg model: {e} — using fallback.")

print(f"  Checking classification model: {CLS_MODEL_PATH}")
if not CLS_MODEL_PATH.exists():
    print("  [WARNING] Cls model not found — YOLO detection will use simulated fallback.")
else:
    try:
        cls_model = YOLO(str(CLS_MODEL_PATH))
        cls_names = cls_model.names if hasattr(cls_model, "names") else cls_names
        print(f"  Cls classes: {cls_names}")
    except Exception as e:
        print(f"  [WARNING] Failed to load cls model: {e} — using fallback.")

MODELS_LOADED = seg_model is not None and cls_model is not None
print(f"  YOLO models loaded: {MODELS_LOADED}")
print("=" * 60)


# ==========================================================================
# DETECTION LOGIC
# ==========================================================================

def _fallback_detection():
    """Simulated detection result used when YOLO weights are not installed."""
    import random
    random.seed()
    counts = {"healthy": 82, "damaged": 8, "rotten": 4, "sprouted": 3, "undersized": 3}
    total  = sum(counts.values())
    defect_count = total - counts["healthy"]
    defect_rate  = round(defect_count / total * 100, 1)
    vision_score = max(0, round(100 - defect_rate))
    detections = []
    for cls, n in counts.items():
        for i in range(n):
            detections.append({
                "id":         f"det_{cls}_{i}",
                "class":      cls,
                "label":      cls,
                "confidence": round(0.75 + random.random() * 0.2, 2),
                "classification_confidence": round(0.75 + random.random() * 0.2, 2),
                "bbox": {
                    "x":      round(random.uniform(5, 60), 1),
                    "y":      round(random.uniform(5, 60), 1),
                    "width":  round(random.uniform(15, 35), 1),
                    "height": round(random.uniform(15, 35), 1),
                },
                "size":     random.randint(40, 70),
                "category": "healthy" if cls == "healthy" else "defective",
            })
    return {
        "success":     True,
        "mode":        "FALLBACK_SIMULATION",
        "total":       total,
        "counts":      counts,
        "percentages": {c: round(counts[c] / total * 100, 1) for c in CLASSES},
        "visionScore": vision_score,
        "defect_rate": defect_rate,
        "confidence":  0.85,
        "detections":  detections,
        "statistics": {
            "total_detected": total,
            "defect_rate":    defect_rate,
            "vision_score":   vision_score,
            "confidence":     0.85,
        },
    }


def run_detection(image_bgr, px_per_cm=None):
    """Run seg + cls detection on a BGR numpy image.
    Falls back to simulated results when YOLO models are not loaded.

    px_per_cm: optional pixels-per-centimetre scale for this capture. Supply it
    only when the frame carries a known-size calibration reference; when it is
    omitted the undersized test falls back to a scale-free comparison against
    the median bulb in the same frame.
    """
    if not MODELS_LOADED:
        return _fallback_detection(), None

    h_img, w_img = image_bgr.shape[:2]

    # Step 1: Segmentation
    seg_results = seg_model(
        image_bgr,
        conf=CONFIDENCE,
        imgsz=INFERENCE_SIZE,
        iou=IOU_THRESHOLD,
        max_det=MAX_DET,
        verbose=False,
        retina_masks=True,
    )

    if not seg_results or len(seg_results) == 0:
        return {"success": False, "error": "No results"}, None

    result = seg_results[0]
    if result.boxes is None or len(result.boxes) == 0:
        return {"success": False, "error": "No onions detected"}, None

    boxes = result.boxes
    masks = result.masks if result.masks is not None else None

    detections = []
    counts = {"healthy": 0, "damaged": 0, "rotten": 0, "sprouted": 0, "undersized": 0}
    flagged_for_review = 0

    # ---- Pass 1: geometry filtering -------------------------------------
    # Reject bulbs clipped by a frame edge, plus implausible boxes. A partial
    # crop gives the classifier a truncated view and it reads the cut face as
    # a defect — the single largest source of false "damaged" calls on
    # otherwise clean batches. An onion we cannot see in full cannot be graded.
    #
    # NOTE: the previous test used `and`, so a bulb clipped on only ONE axis
    # (e.g. sitting on the top edge but centred horizontally) slipped through
    # and was classified from a truncated crop. Any edge contact now disqualifies.
    margin = 5
    valid = []
    excluded_edge = 0
    excluded_small = 0
    excluded_aspect = 0
    for i in range(len(boxes)):
        x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
        box_w = x2 - x1
        box_h = y2 - y1
        if box_w < 30 or box_h < 30:
            excluded_small += 1
            continue
        if x1 <= margin or y1 <= margin or x2 >= w_img - margin or y2 >= h_img - margin:
            excluded_edge += 1
            continue
        aspect = box_w / box_h if box_h > 0 else 0
        if aspect > 3.0 or aspect < 0.33:
            excluded_aspect += 1
            continue
        valid.append((i, x1, y1, x2, y2, box_w, box_h))

    # Median bulb size in THIS frame — a scale-free reference used when the
    # caller supplies no calibration.
    _sizes = sorted((bw + bh) / 2.0 for (_, _, _, _, _, bw, bh) in valid)
    median_px = _sizes[len(_sizes) // 2] if _sizes else 0.0

    # ---- Pass 2: classification -----------------------------------------
    for (i, x1, y1, x2, y2, box_w, box_h) in valid:
        seg_conf = float(boxes.conf[i].item())

        # Step 2: Classification
        pad = int(min(box_w, box_h) * 0.1)
        cx1 = max(0, x1 - pad)
        cy1 = max(0, y1 - pad)
        cx2 = min(w_img, x2 + pad)
        cy2 = min(h_img, y2 + pad)

        crop = image_bgr[cy1:cy2, cx1:cx2]

        cls_name = "unknown"
        cls_conf = 0.0
        if crop.size > 0 and crop.shape[0] >= 10 and crop.shape[1] >= 10:
            cls_results = cls_model(crop, imgsz=CLS_INFER_SIZE, verbose=False)
            if cls_results and len(cls_results) > 0:
                cls_result = cls_results[0]
                if cls_result.probs is not None:
                    probs = cls_result.probs
                    top1_idx = int(probs.top1)
                    cls_name = cls_names.get(top1_idx, f"class_{top1_idx}")
                    cls_conf = float(probs.top1conf)

        # Map to the OnionSure 5-class model.
        # When the 5-class model (onion_multiclass_best.pt) is loaded, its
        # direct top-1 prediction is already one of the 5 quality classes, so
        # no heuristics are needed.  The old binary model path falls back to
        # colour/shape heuristics to approximate the split.
        #
        # `None` means "not asserted" — a near-coin-flip call on the binary
        # head is routed to manual review instead.
        onionsure_class = None

        if CLS_MULTICLASS:
            # ── 5-class model: direct prediction ──────────────────────────
            cls_lower = cls_name.lower()
            if cls_lower in ("healthy", "damaged", "rotten", "sprouted", "undersized"):
                onionsure_class = cls_lower
            elif cls_conf < DEFECT_MIN_CONF:
                onionsure_class = None  # low-confidence -> review
            else:
                onionsure_class = "damaged"  # safety fallback
        else:
            # ── Binary model: heuristic split ──────────────────────────────
            if cls_name.lower() == "healthy":
                onionsure_class = "healthy"
            elif cls_name.lower() == "unhealthy":
                if cls_conf >= DEFECT_MIN_CONF:
                    onionsure_class = "damaged"  # default
                    if crop.size > 0 and crop.shape[0] >= 20 and crop.shape[1] >= 20:
                        crop_hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
                        green_mask = cv2.inRange(crop_hsv,
                                                 np.array([35, 40, 40]),
                                                 np.array([85, 255, 255]))
                        green_ratio = np.count_nonzero(green_mask) / green_mask.size
                        gray_crop   = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                        dark_ratio  = np.count_nonzero(gray_crop < 50) / gray_crop.size
                        rot_mask    = cv2.inRange(crop_hsv,
                                                  np.array([0, 0, 0]),
                                                  np.array([30, 255, 80]))
                        rot_ratio   = np.count_nonzero(rot_mask) / rot_mask.size
                        avg_brightness     = np.mean(gray_crop)
                        brightness_variance = np.var(gray_crop)
                        if green_ratio > 0.12:
                            onionsure_class = "sprouted"
                        elif dark_ratio > 0.25 or rot_ratio > 0.20 or \
                             (avg_brightness < 75 and brightness_variance < 400):
                            onionsure_class = "rotten"
                # else: below DEFECT_MIN_CONF -> left as None, routed to review

        # Size estimation. The reported size uses the caller's calibration when
        # present, otherwise a nominal px/cm approximation kept for display.
        diameter_px = (box_w + box_h) / 2
        diameter_cm = round(diameter_px / (px_per_cm or NOMINAL_PX_PER_CM), 2)

        if onionsure_class is None:
            flagged_for_review += 1
        else:
            # The undersized DECISION never trusts that nominal constant — it
            # drifts with camera distance and image resolution. With a real
            # calibration we apply an absolute 4.0 cm rule; without one we fall
            # back to a strict relative test against the median bulb in this frame.
            if px_per_cm:
                size_says_undersized = diameter_cm < UNDERSIZED_CM
            else:
                size_says_undersized = (
                    median_px > 0 and diameter_px < median_px * UNDERSIZED_RELATIVE
                )

            # Either way the bulb must be a CONFIDENT SEGMENTATION. A weakly
            # segmented blob is usually a gap between bulbs, a fragment or a
            # shadow; letting one drive a size-based grading decision is how a
            # stray 8%-wide speck became a defect and dragged a clean lot down a
            # band. (Gate on the segmenter, not the classifier: the classifier
            # reports high confidence even for a crop that is not really an onion.)
            is_undersized = size_says_undersized and seg_conf >= UNDERSIZED_MIN_CONF

            # Undersized downgrades a bulb the classifier called healthy. A bulb
            # already called rotten or sprouted keeps that more severe label —
            # relabelling it "undersized" (quality weight 0.7 vs 0.0) would
            # silently inflate the vision score.
            if is_undersized and onionsure_class == "healthy":
                onionsure_class = "undersized"

            counts[onionsure_class] += 1

        # Bounding box in percentage for frontend overlay
        bbox_pct = {
            "x": round((x1 / w_img) * 100, 2),
            "y": round((y1 / h_img) * 100, 2),
            "width": round((box_w / w_img) * 100, 2),
            "height": round((box_h / h_img) * 100, 2),
        }

        # Pixel coordinates for backend processing
        bbox_px = {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "width_px": box_w, "height_px": box_h}

        detections.append({
            "id": f"det_{i}",
            "class": onionsure_class if onionsure_class is not None else "uncertain",
            "label": cls_name,
            "confidence": round(seg_conf, 2),
            "classification_confidence": round(cls_conf, 2),
            "bbox": bbox_pct,
            "bounding_box": bbox_px,
            "size": int(diameter_cm * 10),  # mm
            "diameter_cm": diameter_cm,
            "category": "healthy" if cls_name.lower() == "healthy" else "defective",
            # True when the head was not confident enough to assert a verdict.
            # Excluded from `counts`/`total` and surfaced for manual review.
            "review": onionsure_class is None,
        })

    # Only asserted verdicts are graded. A bulb sent to review is neither a
    # defect nor a pass, so it must not appear in the denominator either.
    total = sum(counts.values())
    if total == 0:
        return {
            "success": False,
            "error": "No onions could be confidently graded",
            "hint": (
                f"All {flagged_for_review} detected bulb(s) fell below the "
                f"{DEFECT_MIN_CONF} confidence floor and were routed to manual review. "
                "Re-capture with better lighting/framing."
            ),
            "flagged_for_review": flagged_for_review,
        }, None

    # Calculate percentages
    percentages = {c: round((counts[c] / total) * 100, 1) for c in CLASSES}

    # Vision score: weighted average of quality classes
    weighted = sum(counts[c] * QUALITY_WEIGHT[c] for c in CLASSES)
    vision_score = round(100 * (weighted / total))

    # Defect rate
    defect_count = total - counts["healthy"]
    defect_rate = round((defect_count / total) * 100, 1)

    # Draw annotated image
    annotated = image_bgr.copy()
    for det in detections:
        bx = det["bounding_box"]
        x1, y1 = bx["x1"], bx["y1"]
        x2, y2 = bx["x2"], bx["y2"]
        color = (255, 0, 0) if det["class"] == "healthy" else (0, 0, 255)  # blue=healthy, red=defective
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 3)
        label = f"#{det['id'].split('_')[1]} {det['label']} {det['classification_confidence']:.2f}"
        cv2.putText(annotated, label, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

    return {
        "success": True,
        "mode": "YOLO_LOCAL",
        "total": total,
        "counts": counts,
        "percentages": percentages,
        "visionScore": vision_score,
        "defect_rate": defect_rate,
        "confidence": 0.95,
        "detections": detections,
        "statistics": {
            "total_detected": total,
            "defect_rate": defect_rate,
            "vision_score": vision_score,
            "confidence": 0.95,
            # Bulbs the detector saw but could not grade. Surfaced so a small
            # graded sample is never mistaken for a small lot.
            "excluded": {
                "edge_clipped": excluded_edge,
                "too_small": excluded_small,
                "bad_aspect": excluded_aspect,
                "total": excluded_edge + excluded_small + excluded_aspect,
            },
            # Bulbs that were segmented but whose verdict the head could not
            # assert. They are neither defects nor passes.
            "flagged_for_review": flagged_for_review,
        },
        "flagged_for_review": [
            d["id"] for d in detections if d.get("review")
        ],
        "image_dimensions": {"width": w_img, "height": h_img},
        "annotated_image": annotated,
    }, annotated


def image_to_base64(image_bgr):
    """Convert BGR image to base64 string."""
    _, buffer = cv2.imencode(".jpg", image_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buffer).decode("utf-8")


def _parse_px_per_cm(value):
    """Coerce an optional pixels-per-centimetre calibration into a float.

    Returns None when absent or unusable, which makes run_detection fall back
    to the scale-free relative undersized test rather than trusting a guess.
    """
    if value is None or value == "":
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    return v if v > 0 else None


# ==========================================================================
# API ENDPOINTS
# ==========================================================================

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "onionsure-yolo-local",
        "mode": "YOLO_LOCAL",
        "models": {
            "segmentation": str(SEG_MODEL_PATH.name),
            "classification": str(CLS_MODEL_PATH.name),
        },
        "multiclass": CLS_MULTICLASS,
        "classes": list(CLASSES),
        "time": datetime.now().isoformat(),
    })


@app.route("/api/reload-model", methods=["POST"])
def reload_model():
    """Hot-swap the classifier to the 5-class model after training completes.
    Call this endpoint once train_multiclass_quality.py has finished.
    No restart required.
    """
    global cls_model, cls_names, CLS_MULTICLASS, MODELS_LOADED
    target = CLS_MODEL_PATH_5CLS
    if not target.exists():
        return jsonify({
            "success": False,
            "error": f"5-class model not found at {target}. "
                     "Run onioncheck/train_multiclass_quality.py first.",
        }), 404
    try:
        new_model = YOLO(str(target))
        cls_model  = new_model
        cls_names  = new_model.names
        CLS_MULTICLASS = True
        MODELS_LOADED  = seg_model is not None and cls_model is not None
        print(f"[reload-model] Loaded 5-class model: {target}")
        print(f"[reload-model] Classes: {cls_names}")
        return jsonify({
            "success": True,
            "model": str(target.name),
            "classes": cls_names,
            "multiclass": True,
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/detect", methods=["POST"])
def detect():
    """Upload an image file and get detection results."""
    if "image" not in request.files:
        return jsonify({"success": False, "error": "No image file provided"}), 400

    file = request.files["image"]
    if not file or file.filename == "":
        return jsonify({"success": False, "error": "Empty file"}), 400

    # Read image
    in_memory = io.BytesIO()
    file.save(in_memory)
    in_memory.seek(0)

    try:
        pil_image = Image.open(in_memory).convert("RGB")
        image_bgr = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    except Exception as e:
        return jsonify({"success": False, "error": f"Invalid image: {e}"}), 400

    # Run detection
    result, annotated = run_detection(
        image_bgr, px_per_cm=_parse_px_per_cm(request.form.get("px_per_cm"))
    )

    if annotated is not None:
        result["annotated_image_base64"] = image_to_base64(annotated)

    # Remove non-serializable ndarray
    result.pop("annotated_image", None)

    return jsonify(result)


@app.route("/api/roboflow-detect", methods=["POST"])
def roboflow_detect():
    """Run the configured Roboflow model for the AI Analysis upload only."""
    if "image" not in request.files:
        return jsonify({"success": False, "error": "No image file provided"}), 400

    file = request.files["image"]
    try:
        image_bytes = file.read()
        image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
        return jsonify(analyze_with_roboflow(image))
    except (RuntimeError, ValueError) as error:
        return jsonify({"success": False, "error": str(error)}), 503
    except Exception as error:
        print(f"[roboflow] AI Analysis inference failed: {error}")
        return jsonify({"success": False, "error": "Roboflow inference failed"}), 502


@app.route("/api/detect-base64", methods=["POST"])
def detect_base64():
    """Send a base64-encoded image and get detection results."""
    data = request.get_json(force=True, silent=True) or {}
    b64 = data.get("image") or data.get("image_base64")
    if not b64:
        return jsonify({"success": False, "error": "No image_base64 field"}), 400

    try:
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        img_bytes = base64.b64decode(b64)
        pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        image_bgr = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    except Exception as e:
        return jsonify({"success": False, "error": f"Invalid base64 image: {e}"}), 400

    result, annotated = run_detection(
        image_bgr, px_per_cm=_parse_px_per_cm(data.get("px_per_cm"))
    )

    if annotated is not None:
        result["annotated_image_base64"] = image_to_base64(annotated)

    # Remove non-serializable ndarray
    result.pop("annotated_image", None)

    return jsonify(result)


# ==========================================================================
# LIVE CAMERA STATE
# ==========================================================================

_cam_lock   = threading.Lock()
_cam_cap    = None   # cv2.VideoCapture when open, else None
_cam_index  = int(os.environ.get("CAMERA_INDEX", "0"))  # configurable camera index

# Camera state machine so the HTTP API never blocks on the (slow) open call.
#   'closed' | 'opening' | 'open' | 'error'
_cam_state  = "closed"
_cam_error  = None


def _cam_is_open() -> bool:
    """Return True if the camera is currently open."""
    return _cam_cap is not None and _cam_cap.isOpened()


def _probe_camera() -> bool:
    """Try to open and immediately close camera to see if one exists."""
    try:
        cap = cv2.VideoCapture(_cam_index)
        ok  = cap.isOpened()
        cap.release()
        return ok
    except Exception:
        return False


def _open_camera_worker() -> None:
    """
    Open the camera in the background. Opening can take 10-20s (or briefly hang)
    on Windows with the MSMF backend; doing it off-request keeps the REST call
    instant so the frontend never trips its timeout.
    """
    global _cam_cap, _cam_state, _cam_error
    _cam_state = "opening"
    _cam_error = None
    cap = None
    try:
        cap = cv2.VideoCapture(_cam_index)
        if not cap.isOpened():
            # one retry (some drivers need a second attempt)
            cap = cv2.VideoCapture(_cam_index)
        if not cap.isOpened():
            _cam_state = "error"
            _cam_error = "Could not open camera. Is a webcam connected to index %d?" % _cam_index
            return
        # Sensible defaults for a local webcam
        cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS,          30)
        # Read one frame to confirm the pipeline is actually live.
        ret, _ = cap.read()
        if not ret:
            _cam_state = "error"
            _cam_error = "Camera opened but produced no frames."
            cap.release()
            return
        _cam_cap = cap
        _cam_state = "open"
    except Exception as exc:
        _cam_state = "error"
        _cam_error = "Error opening camera: %s" % exc
        if cap is not None:
            try: cap.release()
            except Exception: pass



# ==========================================================================
# CAMERA ENDPOINTS
# ==========================================================================

@app.route("/api/camera/status", methods=["GET"])
def camera_status():
    """
    Return the camera state. Does NOT open the camera (the open happens
    asynchronously in the background after /api/camera/start).
    Returns: { available, open, state, message }
    """
    global _cam_state, _cam_error
    with _cam_lock:
        state = _cam_state
        err   = _cam_error
        is_open = _cam_is_open()

    # Reconcile: if the handle died unexpectedly, reflect that.
    if state == "open" and not is_open:
        state = "closed"
        is_open = False

    if state == "open":
        return jsonify({"available": True, "open": True, "state": "open",
                        "message": "Camera is open and streaming."})
    if state == "opening":
        return jsonify({"available": False, "open": False, "state": "opening",
                        "message": "Camera is opening…"})
    if state == "error":
        return jsonify({"available": False, "open": False, "state": "error",
                        "message": err or "Camera error."})
    # closed -> do a lightweight probe so the UI can show "ready to start"
    try:
        available = _probe_camera()
    except Exception:
        available = False
    return jsonify({"available": available, "open": False, "state": "closed",
                    "message": "Camera detected. Ready to start." if available
                               else f"No camera detected on index {_cam_index}."})


@app.route("/api/camera/start", methods=["POST"])
def camera_start():
    """
    Open the camera. Kicks off the (slow) open in a background thread and
    returns immediately, so the client never waits on the device.
    The client should poll /api/camera/status until state == "open".
    Returns: { success, state, message }
    """
    global _cam_state
    with _cam_lock:
        if _cam_state == "open":
            return jsonify({"success": True, "state": "open", "message": "Camera already open."})
        if _cam_state == "opening":
            return jsonify({"success": True, "state": "opening", "message": "Camera is already opening."})

    # closed or error -> (re)start the background open
    t = threading.Thread(target=_open_camera_worker, daemon=True)
    t.start()
    return jsonify({"success": True, "state": "opening", "message": "Opening camera…"})


@app.route("/api/camera/stop", methods=["POST"])
def camera_stop():
    """
    Release the camera. Idempotent — safe to call if already closed.
    Returns: { success, message }
    """
    global _cam_cap, _cam_state
    with _cam_lock:
        if _cam_cap is not None:
            _cam_cap.release()
            _cam_cap = None
        _cam_state = "closed"
    return jsonify({"success": True, "message": "Camera released."})


@app.route("/api/camera/frame", methods=["GET"])
def camera_frame():
    """
    Return one frame from the open camera.

    Query params:
      detect  = "true" | "false"  (default false)
      format  = "image" | "json"  (default image)

    If detect=false OR format=image  ->  plain JPEG response (Content-Type: image/jpeg)
    If detect=true  AND format=json  ->  JSON with annotated base64 frame + detections
    """
    want_detect = request.args.get("detect", "false").lower() == "true"
    want_json   = request.args.get("format",  "image").lower() == "json"

    with _cam_lock:
        if not _cam_is_open():
            if _cam_state == "opening":
                msg = "Camera is still opening. Please wait a moment and retry."
            else:
                msg = "Camera is not open. Call /api/camera/start first."
            if want_json:
                return jsonify({"success": False, "error": msg}), 503
            else:
                return Response(b"", status=503, headers={"X-Camera-Error": msg})

        ret, frame_bgr = _cam_cap.read()

    if not ret or frame_bgr is None:
        if want_json:
            return jsonify({"success": False, "error": "Failed to read frame from camera."}), 500
        return Response(b"", status=500)

    # ── Plain JPEG path (fast, no YOLO) ──────────────────────────────
    if not want_detect or not want_json:
        _, jpeg_buf = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 80])
        return Response(
            jpeg_buf.tobytes(),
            mimetype="image/jpeg",
            headers={"Cache-Control": "no-cache, no-store"}
        )

    # ── YOLO detection path ───────────────────────────────────────────
    try:
        result, annotated = run_detection(frame_bgr)
    except Exception as exc:
        result    = {"success": False, "error": str(exc)}
        annotated = None

    if not result.get("success") or annotated is None:
        # Return plain frame with empty detections on detection failure
        b64_plain = image_to_base64(frame_bgr)
        return jsonify({
            "success":    True,
            "image":      f"data:image/jpeg;base64,{b64_plain}",
            "detections": [],
            "statistics": {"defect_rate": 0, "vision_score": None, "total_detected": 0},
            "note":       result.get("error", "No onions detected in frame."),
        })

    b64_annotated = image_to_base64(annotated)

    return jsonify({
        "success":    True,
        "image":      f"data:image/jpeg;base64,{b64_annotated}",
        "detections": result.get("detections", []),
        "statistics": result.get("statistics",  {}),
        "total":      result.get("total",        0),
        "counts":     result.get("counts",       {}),
        "visionScore":result.get("visionScore",  None),
    })


# ==========================================================================
# MAIN
# ==========================================================================

if __name__ == "__main__":
    print("\n  Starting OnionSure YOLO Flask Service on port 5000...")
    print("  Endpoints:")
    print("    GET  /api/health")
    print("    POST /api/detect            (multipart file upload)")
    print("    POST /api/detect-base64      (JSON base64 image)")
    print("    GET  /api/camera/status      (camera state: closed|opening|open|error)")
    print("    POST /api/camera/start       (opens camera in background; poll status)")
    print("    GET  /api/camera/frame       (get frame / YOLO)")
    print("    POST /api/camera/stop        (release camera)")
    print("\n  Waiting for requests...\n")

    # Pre-warm the camera so the first user-triggered start is instant.
    # Runs in the background; if no camera exists it will simply settle in
    # the 'error' state and a later /api/camera/start will retry.
    threading.Thread(target=_open_camera_worker, daemon=True).start()

    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PYTHON_PORT", "5000")),
        debug=False,
        threaded=True,
    )
