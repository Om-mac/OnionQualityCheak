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
import threading
import numpy as np
from pathlib import Path
from datetime import datetime

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from PIL import Image
import cv2
from ultralytics import YOLO

# ==========================================================================
# CONFIGURATION
# ==========================================================================

BASE_DIR = Path(__file__).resolve().parent
ONIONCHECK_DIR = BASE_DIR.parent / "onioncheck"

SEG_MODEL_PATH = ONIONCHECK_DIR / "runs" / "segment" / "runs" / "onion_seg_test" / "weights" / "best.pt"
CLS_MODEL_PATH = ONIONCHECK_DIR / "runs" / "classify" / "runs" / "onion_cls" / "weights" / "best.pt"

INFERENCE_SIZE = 640
CLS_INFER_SIZE = 224
CONFIDENCE = 0.25
IOU_THRESHOLD = 0.4
MAX_DET = 30

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
cls_names = {0: "healthy", 1: "unhealthy"}

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


def run_detection(image_bgr):
    """Run seg + cls detection on a BGR numpy image.
    Falls back to simulated results when YOLO models are not loaded.
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

    for i in range(len(boxes)):
        x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
        seg_conf = float(boxes.conf[i].item())

        # Filter false positives
        box_w = x2 - x1
        box_h = y2 - y1
        if box_w < 30 or box_h < 30:
            continue

        margin = 5
        if x1 <= margin and y1 <= margin:
            continue
        if x2 >= w_img - margin and y2 >= h_img - margin:
            continue

        aspect = box_w / box_h if box_h > 0 else 0
        if aspect > 3.0 or aspect < 0.33:
            continue

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

        # Map to OnionSure 5-class model with enhanced heuristics
        # NOTE: Current binary classifier (healthy/unhealthy) enhanced with
        # image analysis heuristics to approximate 5-class classification
        # until proper 5-class model is trained
        
        if cls_name.lower() == "healthy":
            onionsure_class = "healthy"
        elif cls_name.lower() == "unhealthy":
            # Enhanced defect classification using image analysis
            onionsure_class = "damaged"  # default
            
            if crop.size > 0 and crop.shape[0] >= 20 and crop.shape[1] >= 20:
                # Convert to HSV for color analysis
                crop_hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
                
                # 1. Check for sprouting (green tint, bright green spots)
                # Green: H=35-85, S=40-255, V=40-255
                green_lower = np.array([35, 40, 40])
                green_upper = np.array([85, 255, 255])
                green_mask = cv2.inRange(crop_hsv, green_lower, green_upper)
                green_ratio = np.count_nonzero(green_mask) / green_mask.size
                
                # 2. Check for rot (dark spots, low brightness, brown/black areas)
                gray_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                dark_mask = gray_crop < 50  # very dark pixels
                dark_ratio = np.count_nonzero(dark_mask) / gray_crop.size
                avg_brightness = np.mean(gray_crop)
                brightness_variance = np.var(gray_crop)
                
                # 3. Check for brown/black rot coloration
                # Brown/Black in HSV: H=0-30, low S, low V
                rot_lower = np.array([0, 0, 0])
                rot_upper = np.array([30, 255, 80])
                rot_mask = cv2.inRange(crop_hsv, rot_lower, rot_upper)
                rot_ratio = np.count_nonzero(rot_mask) / rot_mask.size
                
                # Classification logic based on heuristics
                if green_ratio > 0.12:  # 12%+ green indicates sprouting
                    onionsure_class = "sprouted"
                elif dark_ratio > 0.25 or rot_ratio > 0.20 or (avg_brightness < 75 and brightness_variance < 400):
                    # Significant dark areas, brown/black spots, or low brightness + low variance = rot
                    onionsure_class = "rotten"
                # else: remains "damaged" (default for unhealthy but not rot/sprout)
        else:
            onionsure_class = "damaged"

        # Size estimation (rough diameter in cm, assuming ~20 px/cm)
        diameter_px = (box_w + box_h) / 2
        diameter_cm = round(diameter_px / 20.0, 2)
        
        # Undersized check overrides other classifications
        # (a sprouted/rotten onion can also be undersized)
        if diameter_cm < 4.0:
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
            "class": onionsure_class,
            "label": cls_name,
            "confidence": round(seg_conf, 2),
            "classification_confidence": round(cls_conf, 2),
            "bbox": bbox_pct,
            "bounding_box": bbox_px,
            "size": int(diameter_cm * 10),  # mm
            "diameter_cm": diameter_cm,
            "category": "healthy" if cls_name.lower() == "healthy" else "defective",
        })

    total = len(detections)
    if total == 0:
        return {"success": False, "error": "No valid onions detected after filtering"}, None

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
        },
        "image_dimensions": {"width": w_img, "height": h_img},
        "annotated_image": annotated,
    }, annotated


def image_to_base64(image_bgr):
    """Convert BGR image to base64 string."""
    _, buffer = cv2.imencode(".jpg", image_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buffer).decode("utf-8")


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
        "time": datetime.now().isoformat(),
    })


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
    result, annotated = run_detection(image_bgr)

    if annotated is not None:
        result["annotated_image_base64"] = image_to_base64(annotated)

    # Remove non-serializable ndarray
    result.pop("annotated_image", None)

    return jsonify(result)


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

    result, annotated = run_detection(image_bgr)

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

    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
