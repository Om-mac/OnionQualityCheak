"""
Live Onion Quality Inspection - Combined (Local + Roboflow + Hybrid)
=====================================================================
Real-time onion detection and quality assessment using three modes:
  1. Local YOLOv8 segmentation model (no internet needed, fastest)
     - Detects onions with segmentation masks
     - Does NOT classify healthy vs unhealthy (dataset only has class 0)
  2. Roboflow cloud API (more defect categories, needs internet + API key)
     - Full defect classification: staining, sprouted, black_smut, etc.
  3. Hybrid mode (best of both worlds)
     - Local YOLO for fast onion detection + segmentation masks
     - Roboflow cloud for quality classification on each detected onion
     - Slower but most accurate for quality assessment

Switch between modes at runtime with the 'T' key (local -> roboflow -> hybrid -> local).

Features:
- Live video stream with segmentation masks + bounding boxes
- Real-time onion detection and quality classification
- Frame-by-frame analysis with confidence scores
- Snapshot capture with annotations
- Statistics overlay (FPS, counts, defect rate)
- Mode toggle: Local YOLO / Roboflow / Hybrid
- Keyboard controls

Usage:
    python live_onion_combined.py
    python live_onion_combined.py --mode local
    python live_onion_combined.py --mode roboflow
    python live_onion_combined.py --mode hybrid
    python live_onion_combined.py --model runs/segment/runs/onion_seg_test/weights/best.pt --camera 0 --conf 0.4

Controls:
    SPACE - Capture current frame & save annotated image
    Q     - Quit application
    T     - Toggle mode: Local -> Roboflow -> Hybrid -> Local
    S     - Toggle statistics display
    C     - Toggle confidence display
    F     - Toggle FPS counter
    M     - Toggle mask overlay (local/hybrid mode only)
"""

import argparse
import os
import cv2
import time
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from ultralytics import YOLO

# Try to import Roboflow SDK
try:
    from dotenv import load_dotenv
    from inference_sdk import InferenceHTTPClient
    ROBOFLOW_AVAILABLE = True
except ImportError:
    ROBOFLOW_AVAILABLE = False


# ==========================================================================
# CONFIGURATION
# ==========================================================================

BASE_DIR = Path(__file__).resolve().parent

# Default local model paths (tries best.pt, then last.pt, then base)
DEFAULT_MODEL_PATHS = [
    BASE_DIR / "runs" / "segment" / "runs" / "onion_seg_test" / "weights" / "best.pt",
    BASE_DIR / "runs" / "segment" / "runs" / "onion_seg_test" / "weights" / "last.pt",
    BASE_DIR / "runs" / "onion_seg_test" / "weights" / "best.pt",
    BASE_DIR / "runs" / "onion_seg_test" / "weights" / "last.pt",
    BASE_DIR / "yolov8n-seg.pt",
]

# Camera configuration
CAMERA_INDEX = 0
FRAME_WIDTH = 1280
FRAME_HEIGHT = 720
INFERENCE_SIZE = 640
DEFAULT_CONFIDENCE = 0.4

# Roboflow config
ROBOFLOW_MODEL_ID = "veg1-hcqsf-2/4"

# Output directory
CAPTURES_DIR = BASE_DIR / "live_captures"
CAPTURES_DIR.mkdir(exist_ok=True)

# Local model class names
# The YOLO seg dataset only has class 0 (onion) labels.
# The local model detects onions; quality assessment is done via Roboflow.
LOCAL_CLASS_NAMES = {0: "onion"}

# Quality assessment colors (BGR)
CLASS_COLORS = {
    "healthy":      (255, 0, 0),    # blue
    "unhealthy":     (0, 0, 255),    # red
    "onion":        (255, 0, 0),    # blue
    "staining":     (0, 255, 255),  # yellow
    "sprouted":     (0, 165, 255),  # orange
    "double_split": (0, 165, 255),  # orange
    "double split": (0, 165, 255),  # orange
    "black_smut":   (0, 0, 255),    # red
    "black smut":   (0, 0, 255),    # red
    "spoiled":      (0, 0, 255),    # red
    "rotten":       (0, 0, 255),    # red
    "manual_review":(255, 0, 255),  # magenta
    "manual review":(255, 0, 255),  # magenta
}

QUALITY_INFO = {
    "healthy":       {"label": "HEALTHY",   "status": "PASS",    "severity": 0},
    "unhealthy":      {"label": "UNHEALTHY", "status": "FAIL",    "severity": 3},
    "onion":          {"label": "HEALTHY",   "status": "PASS",    "severity": 0},
    "staining":       {"label": "STAINING",  "status": "REVIEW",  "severity": 1},
    "sprouted":       {"label": "SPROUTED",  "status": "REVIEW",  "severity": 2},
    "double_split":   {"label": "D_SPLIT",   "status": "REVIEW",  "severity": 2},
    "double split":   {"label": "D_SPLIT",   "status": "REVIEW",  "severity": 2},
    "black_smut":     {"label": "BLACK_SMUT","status": "FAIL",    "severity": 3},
    "black smut":     {"label": "BLACK_SMUT","status": "FAIL",    "severity": 3},
    "spoiled":        {"label": "SPOILED",   "status": "FAIL",    "severity": 3},
    "rotten":         {"label": "ROTTEN",    "status": "FAIL",    "severity": 3},
    "manual_review":  {"label": "REVIEW",    "status": "REVIEW",  "severity": 2},
    "manual review":  {"label": "REVIEW",    "status": "REVIEW",  "severity": 2},
}


def get_quality_info(class_name: str) -> Dict:
    key = str(class_name).lower().strip()
    info = QUALITY_INFO.get(key)
    if info is None:
        info = {"label": class_name.upper(), "status": "UNKNOWN", "severity": 2}
    color = CLASS_COLORS.get(key, (128, 128, 128))
    info["color"] = color
    return info


def find_model_path(custom_path: Optional[str] = None) -> Path:
    if custom_path:
        p = Path(custom_path)
        if p.exists():
            return p
        print(f"  Warning: model not found: {p}")
    for p in DEFAULT_MODEL_PATHS:
        if p.exists():
            return p
    raise FileNotFoundError(
        "No local model found! Train first:\n  python train_onion_seg.py"
    )


# ==========================================================================
# LIVE INSPECTION CLASS
# ==========================================================================

class LiveOnionInspector:
    """
    Real-time onion quality inspection.
    Supports both local YOLO model and Roboflow cloud API.
    """

    def __init__(
        self,
        model_path: Path,
        camera_index: int = CAMERA_INDEX,
        confidence_threshold: float = DEFAULT_CONFIDENCE,
        mode: str = "local",
    ):
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.mode = mode  # "local" or "roboflow"

        # --- Load local YOLO model ---
        print(f"  Loading local model: {model_path.name}")
        self.local_model = YOLO(str(model_path))
        self.local_class_names = (
            self.local_model.names if hasattr(self.local_model, 'names')
            else LOCAL_CLASS_NAMES
        )
        print(f"  Local model classes: {self.local_class_names}")

        # --- Initialize Roboflow client (optional) ---
        self.roboflow_client = None
        self.roboflow_model_id = ROBOFLOW_MODEL_ID
        if ROBOFLOW_AVAILABLE:
            load_dotenv(BASE_DIR / ".env")
            api_key = os.getenv("ROBOFLOW_API_KEY", "").strip()
            if api_key:
                self.roboflow_client = InferenceHTTPClient(
                    api_url="https://serverless.roboflow.com",
                    api_key=api_key,
                )
                print(f"  Roboflow client ready (model: {ROBOFLOW_MODEL_ID})")
            else:
                print("  Roboflow: no API key found in .env")
        else:
            print("  Roboflow SDK not installed (pip install inference-sdk dotenv)")

        # --- Initialize camera ---
        self.camera_index = camera_index
        self.cap = cv2.VideoCapture(camera_index)
        if not self.cap.isOpened():
            raise RuntimeError(f"Cannot open camera {camera_index}")

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
        self.cap.set(cv2.CAP_PROP_FPS, 30)

        self.frame_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.frame_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.fps = int(self.cap.get(cv2.CAP_PROP_FPS))
        print(f"  Camera: {self.frame_width}x{self.frame_height} @ {self.fps}fps")

        # Statistics
        self.frame_count = 0
        self.total_detections = 0
        self.total_healthy = 0
        self.total_unhealthy = 0
        self.capture_count = 0

        # Display toggles
        self.show_stats = True
        self.show_confidence = True
        self.show_fps = True
        self.show_masks = False  # masks OFF by default so the live video isn't covered in green

        # FPS calculation
        self.fps_counter = 0
        self.fps_start_time = time.time()
        self.current_fps = 0.0

        self.window_name = "OnionSure - Live Quality Inspection"

    # ======================================================================
    # INFERENCE
    # ======================================================================

    def run_inference(self, frame: np.ndarray) -> List[Dict]:
        """Run inference using current mode (local, roboflow, or hybrid)."""
        if self.mode == "local":
            return self._infer_local(frame)
        elif self.mode == "roboflow":
            return self._infer_roboflow(frame)
        else:  # hybrid
            return self._infer_hybrid(frame)

    def _infer_hybrid(self, frame: np.ndarray) -> List[Dict]:
        """
        Hybrid inference: local YOLO detects onions + gets segmentation masks,
        then Roboflow cloud classifies quality on each detected onion region.
        """
        # Step 1: Local YOLO detection
        local_dets = self._infer_local(frame)

        if not local_dets or self.roboflow_client is None:
            # Fallback: just return local detections
            return local_dets

        # Step 2: For each detected onion, crop the region and send to Roboflow
        try:
            # Send full frame to Roboflow (it will detect all onions + classify)
            result = self.roboflow_client.infer(frame, model_id=self.roboflow_model_id)
            predictions = result.get("predictions", [])

            # Build a map of Roboflow predictions by approximate center
            rf_dets = []
            for pred in predictions:
                if pred.get("confidence", 0) < self.confidence_threshold:
                    continue
                cx = float(pred.get("x", 0))
                cy = float(pred.get("y", 0))
                bw = float(pred.get("width", 0))
                bh = float(pred.get("height", 0))
                x1 = int(cx - bw / 2)
                y1 = int(cy - bh / 2)
                x2 = int(cx + bw / 2)
                y2 = int(cy + bh / 2)
                rf_dets.append({
                    "class_id": -1,
                    "class_name": pred.get("class", "unknown"),
                    "confidence": float(pred.get("confidence", 0)),
                    "bbox": [x1, y1, x2, y2],
                    "source": "roboflow",
                    "center": (cx, cy),
                })

            # Step 3: Match local detections with Roboflow predictions by IoU/center
            matched = []
            used_rf = set()
            for ld in local_dets:
                lx1, ly1, lx2, ly2 = ld["bbox"]
                lc = ((lx1 + lx2) / 2, (ly1 + ly2) / 2)

                best_dist = float('inf')
                best_rf = None
                for ri, rd in enumerate(rf_dets):
                    if ri in used_rf:
                        continue
                    rc = rd.get("center", (0, 0))
                    dist = ((lc[0] - rc[0]) ** 2 + (lc[1] - rc[1]) ** 2) ** 0.5
                    if dist < best_dist:
                        best_dist = dist
                        best_rf = ri

                if best_rf is not None and best_dist < 100:
                    used_rf.add(best_rf)
                    rd = rf_dets[best_rf]
                    # Keep local mask, use Roboflow classification
                    det = ld.copy()
                    det["class_name"] = rd["class_name"]
                    det["class_id"] = rd["class_id"]
                    det["confidence"] = rd["confidence"]
                    det["source"] = "hybrid"
                    matched.append(det)
                else:
                    # No Roboflow match, keep local detection as "onion"
                    matched.append(ld)

            return matched

        except Exception as e:
            print(f"  [Hybrid] Roboflow error: {e}, falling back to local")
            return local_dets

    def _infer_local(self, frame: np.ndarray) -> List[Dict]:
        """Run local YOLO segmentation inference."""
        results = self.local_model(
            frame,
            conf=self.confidence_threshold,
            imgsz=INFERENCE_SIZE,
            verbose=False,
            retina_masks=True,
        )

        detections = []
        if results and len(results) > 0:
            result = results[0]

            if result.boxes is not None:
                boxes = result.boxes
                for i in range(len(boxes)):
                    cls_id = int(boxes.cls[i].item())
                    conf = float(boxes.conf[i].item())
                    x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
                    det = {
                        "class_id": cls_id,
                        "class_name": self.local_class_names.get(cls_id, f"class_{cls_id}"),
                        "confidence": conf,
                        "bbox": [int(x1), int(y1), int(x2), int(y2)],
                        "source": "local",
                    }
                    if result.masks is not None and self.show_masks:
                        mask_data = result.masks.data[i].cpu().numpy()
                        h, w = frame.shape[:2]
                        det["mask"] = cv2.resize(mask_data, (w, h))
                    detections.append(det)

        return detections

    def _infer_roboflow(self, frame: np.ndarray) -> List[Dict]:
        """Run Roboflow cloud inference."""
        if self.roboflow_client is None:
            print("  [Roboflow] No client available, switching to local")
            self.mode = "local"
            return self._infer_local(frame)

        try:
            result = self.roboflow_client.infer(frame, model_id=self.roboflow_model_id)
            predictions = result.get("predictions", [])

            detections = []
            for pred in predictions:
                if pred.get("confidence", 0) < self.confidence_threshold:
                    continue
                cx = float(pred.get("x", 0))
                cy = float(pred.get("y", 0))
                bw = float(pred.get("width", 0))
                bh = float(pred.get("height", 0))
                x1 = int(cx - bw / 2)
                y1 = int(cy - bh / 2)
                x2 = int(cx + bw / 2)
                y2 = int(cy + bh / 2)
                detections.append({
                    "class_id": -1,
                    "class_name": pred.get("class", "unknown"),
                    "confidence": float(pred.get("confidence", 0)),
                    "bbox": [x1, y1, x2, y2],
                    "source": "roboflow",
                })
            return detections

        except Exception as e:
            print(f"  [Roboflow] Error: {e}")
            return []

    # ======================================================================
    # DRAWING
    # ======================================================================

    def draw_masks(self, frame: np.ndarray, detections: List[Dict]) -> np.ndarray:
        """Draw a light mask tint + crisp contour so the video stays clearly visible.
        Masks are OFF by default (toggle with M)."""
        if not self.show_masks or self.mode not in ("local", "hybrid"):
            return frame

        overlay = frame.copy()
        for det in detections:
            if "mask" not in det:
                continue
            color = get_quality_info(det["class_name"])["color"]
            mask = det["mask"]
            mask_bool = mask > 0.5
            # Very light 15% fill — onion clearly visible underneath
            overlay[mask_bool] = cv2.addWeighted(
                overlay[mask_bool], 0.85,
                np.full_like(frame[mask_bool], color), 0.15, 0
            )
            # Crisp outline for clear boundaries without covering the view
            mask_u8 = (mask_bool.astype(np.uint8)) * 255
            contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cv2.drawContours(overlay, contours, -1, color, 2)
        return overlay

    def draw_detection(self, frame: np.ndarray, det: Dict, det_id: int) -> None:
        """Draw bounding box and label."""
        class_name = det["class_name"]
        conf = det["confidence"]
        x1, y1, x2, y2 = det["bbox"]

        x1 = max(0, min(x1, self.frame_width))
        y1 = max(0, min(y1, self.frame_height))
        x2 = max(0, min(x2, self.frame_width))
        y2 = max(0, min(y2, self.frame_height))

        info = get_quality_info(class_name)
        color = info["color"]
        label_text = info["label"]
        status = info["status"]

        # Bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)

        # Label
        if self.show_confidence:
            label = f"#{det_id} {label_text} {conf:.2f}"
        else:
            label = f"#{det_id} {label_text}"

        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        ly = y1 - 10 if y1 - 10 > 20 else y2 + 20
        cv2.rectangle(frame, (x1, ly - th - 5), (x1 + tw + 10, ly + 5), (0, 0, 0), -1)
        cv2.putText(frame, label, (x1 + 5, ly), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        # Status badge
        (sw, sh), _ = cv2.getTextSize(status, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
        sy = y2 + 18
        cv2.rectangle(frame, (x1, sy - sh - 3), (x1 + sw + 10, sy + 3), (0, 0, 0), -1)
        cv2.putText(frame, status, (x1 + 5, sy), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Detection ID circle
        center = (x2 - 20, y1 + 20)
        cv2.circle(frame, center, 15, color, -1)
        cv2.putText(frame, str(det_id), (center[0] - 7, center[1] + 7),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    def draw_statistics(self, frame: np.ndarray, detections: List[Dict]) -> None:
        """Draw statistics overlay."""
        healthy = 0
        unhealthy = 0
        for d in detections:
            info = get_quality_info(d["class_name"])
            if info["severity"] == 0:
                healthy += 1
            else:
                unhealthy += 1

        total = len(detections)
        defect_rate = (unhealthy / total * 100) if total > 0 else 0

        mode_label = "LOCAL YOLO" if self.mode == "local" else ("ROBOFLOW CLOUD" if self.mode == "roboflow" else "HYBRID (LOCAL+RF)")

        lines = [
            f"LIVE ONION INSPECTION [{mode_label}] - Frame #{self.frame_count}",
            f"Model: {self.model_path.name if self.mode == 'local' else self.roboflow_model_id}",
            f"Detected: {total} onions",
            f"Healthy: {healthy} | Defective: {unhealthy}",
            f"Defect Rate: {defect_rate:.1f}%",
            "",
            f"Session Total: {self.total_detections} detections",
            f"  Healthy: {self.total_healthy}",
            f"  Defective: {self.total_unhealthy}",
            f"Captures Saved: {self.capture_count}",
        ]

        if self.show_fps:
            lines.insert(1, f"FPS: {self.current_fps:.1f}")

        overlay = frame.copy()
        cv2.rectangle(overlay, (10, 10), (450, 50 + len(lines) * 28), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)

        y = 40
        for line in lines:
            if line:
                cv2.putText(frame, line, (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
            y += 28

    def draw_controls(self, frame: np.ndarray) -> None:
        """Draw control instructions."""
        controls = "SPACE:Capture | Q:Quit | T:CycleMode | S:Stats | C:Conf | F:FPS | M:Masks"
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, self.frame_height - 35), (self.frame_width, self.frame_height), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        cv2.putText(frame, controls, (20, self.frame_height - 12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    def save_capture(self, frame: np.ndarray, detections: List[Dict]) -> str:
        """Save annotated frame."""
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        mode_tag = "local" if self.mode == "local" else "rf"
        filename = f"onion_{mode_tag}_{ts}_{len(detections)}det.jpg"
        filepath = CAPTURES_DIR / filename

        watermark = f"OnionSure Live [{mode_tag.upper()}] - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        cv2.putText(frame, watermark, (self.frame_width - 420, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        cv2.imwrite(str(filepath), frame)
        self.capture_count += 1
        print(f"  Captured: {filename}")
        return str(filepath)

    def update_fps(self) -> None:
        self.fps_counter += 1
        elapsed = time.time() - self.fps_start_time
        if elapsed > 1.0:
            self.current_fps = self.fps_counter / elapsed
            self.fps_counter = 0
            self.fps_start_time = time.time()

    def toggle_mode(self) -> None:
        """Switch between local, roboflow, and hybrid modes."""
        if self.mode == "local":
            if self.roboflow_client is not None:
                self.mode = "roboflow"
                print("  >> Switched to ROBOFLOW CLOUD mode")
            else:
                print("  >> Roboflow not available, staying on LOCAL")
        elif self.mode == "roboflow":
            if self.roboflow_client is not None:
                self.mode = "hybrid"
                print("  >> Switched to HYBRID mode (local detect + roboflow classify)")
            else:
                self.mode = "local"
                print("  >> Roboflow not available, switching to LOCAL")
        else:  # hybrid -> local
            self.mode = "local"
            print("  >> Switched to LOCAL YOLO mode")

    # ======================================================================
    # MAIN LOOP
    # ======================================================================

    def run(self) -> None:
        print("\n" + "=" * 60)
        print("  LIVE ONION QUALITY INSPECTION (COMBINED)")
        print("=" * 60)
        print(f"  Camera: {self.frame_width}x{self.frame_height}")
        print(f"  Mode: {'LOCAL YOLO' if self.mode == 'local' else ('ROBOFLOW CLOUD' if self.mode == 'roboflow' else 'HYBRID (LOCAL+RF)')}")
        print(f"  Confidence: {self.confidence_threshold}")
        if self.mode == "local":
            print(f"  Model: {self.model_path.name}")
            print(f"  Classes: {self.local_class_names}")
        print(f"  Roboflow: {'available' if self.roboflow_client else 'not available'}")
        print(f"  Mask overlay: {'ON' if self.show_masks else 'OFF'}")
        print("\n  Controls:")
        print("    SPACE - Capture frame")
        print("    Q     - Quit")
        print("    T     - Toggle mode: Local -> Roboflow -> Hybrid")
        print("    S     - Toggle statistics")
        print("    C     - Toggle confidence")
        print("    F     - Toggle FPS counter")
        print("    M     - Toggle mask overlay")
        print("=" * 60 + "\n")

        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    print("Failed to read frame from camera")
                    break

                self.frame_count += 1

                # Inference
                detections = self.run_inference(frame)

                # Session stats
                self.total_detections += len(detections)
                for d in detections:
                    info = get_quality_info(d["class_name"])
                    if info["severity"] == 0:
                        self.total_healthy += 1
                    else:
                        self.total_unhealthy += 1

                # Draw
                frame = self.draw_masks(frame, detections)
                for idx, det in enumerate(detections, start=1):
                    self.draw_detection(frame, det, idx)
                if self.show_stats:
                    self.draw_statistics(frame, detections)
                self.draw_controls(frame)
                self.update_fps()

                cv2.imshow(self.window_name, frame)

                # Keyboard
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q') or key == ord('Q'):
                    print("\nQuitting...")
                    break
                elif key == ord(' '):
                    self.save_capture(frame.copy(), detections)
                elif key == ord('t') or key == ord('T'):
                    self.toggle_mode()
                elif key == ord('s') or key == ord('S'):
                    self.show_stats = not self.show_stats
                    print(f"  Statistics: {'ON' if self.show_stats else 'OFF'}")
                elif key == ord('c') or key == ord('C'):
                    self.show_confidence = not self.show_confidence
                    print(f"  Confidence: {'ON' if self.show_confidence else 'OFF'}")
                elif key == ord('f') or key == ord('F'):
                    self.show_fps = not self.show_fps
                    print(f"  FPS: {'ON' if self.show_fps else 'OFF'}")
                elif key == ord('m') or key == ord('M'):
                    self.show_masks = not self.show_masks
                    print(f"  Masks: {'ON' if self.show_masks else 'OFF'}")

        except KeyboardInterrupt:
            print("\nInterrupted by user")

        finally:
            self.cap.release()
            cv2.destroyAllWindows()
            print("\n" + "=" * 60)
            print("  SESSION SUMMARY")
            print("=" * 60)
            print(f"  Frames Processed: {self.frame_count}")
            print(f"  Total Detections: {self.total_detections}")
            print(f"  Healthy: {self.total_healthy}")
            print(f"  Defective: {self.total_unhealthy}")
            print(f"  Captures Saved: {self.capture_count}")
            print(f"  Captures Dir: {CAPTURES_DIR}")
            print("=" * 60)


# ==========================================================================
# MAIN
# ==========================================================================

def main():
    parser = argparse.ArgumentParser(description="Live Onion Quality Inspection (Combined)")
    parser.add_argument("--model", type=str, default=None, help="Path to local .pt model")
    parser.add_argument("--camera", type=int, default=CAMERA_INDEX, help="Camera index")
    parser.add_argument("--conf", type=float, default=DEFAULT_CONFIDENCE, help="Confidence threshold")
    parser.add_argument("--mode", type=str, default="local", choices=["local", "roboflow", "hybrid"],
                        help="Initial inference mode")
    args = parser.parse_args()

    print("\n" + "=" * 50)
    print("  OnionSure - Live Quality Inspection (Combined)")
    print("=" * 50 + "\n")

    try:
        model_path = find_model_path(args.model)
        inspector = LiveOnionInspector(
            model_path=model_path,
            camera_index=args.camera,
            confidence_threshold=args.conf,
            mode=args.mode,
        )
        inspector.run()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()

    print("\nInspection ended.\n")


if __name__ == "__main__":
    main()
