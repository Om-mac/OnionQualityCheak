"""
Live Onion Quality Inspection - Local YOLO Model
=================================================
Real-time onion detection using locally trained YOLOv8 segmentation model
with OpenCV. No internet or API key needed.

NOTE: The local model was trained on a dataset that only has class 0 (onion)
segmentation labels. It detects onions with high accuracy (97.7% mAP) but
does NOT classify healthy vs unhealthy. For quality classification, use
live_onion_combined.py with Roboflow or Hybrid mode.

Features:
- Live video stream with segmentation masks + bounding boxes
- Real-time onion detection
- Frame-by-frame analysis with confidence scores
- Snapshot capture with annotations
- Statistics overlay (FPS, counts, defect rate)
- Keyboard controls

Usage:
    python live_onion_local.py
    python live_onion_local.py --model runs/segment/runs/onion_seg_test/weights/best.pt
    python live_onion_local.py --camera 0 --conf 0.4

Controls:
    SPACE - Capture current frame & save annotated image
    Q     - Quit application
    S     - Toggle statistics display
    C     - Toggle confidence display
    F     - Toggle FPS counter
    M     - Toggle mask overlay
"""

import argparse
import cv2
import time
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from ultralytics import YOLO


# ==========================================================================
# CONFIGURATION
# ==========================================================================

BASE_DIR = Path(__file__).resolve().parent

# Default model path - tries best.pt, falls back to last.pt, then base model
DEFAULT_MODEL_PATHS = [
    BASE_DIR / "runs" / "segment" / "runs" / "onion_seg_test" / "weights" / "best.pt",
    BASE_DIR / "runs" / "segment" / "runs" / "onion_seg_test" / "weights" / "last.pt",
    BASE_DIR / "runs" / "onion_seg_test" / "weights" / "best.pt",
    BASE_DIR / "runs" / "onion_seg_test" / "weights" / "last.pt",
    BASE_DIR / "yolov8n-seg.pt",  # Fallback to pretrained
]

# Camera configuration
CAMERA_INDEX = 0
FRAME_WIDTH = 1280
FRAME_HEIGHT = 720
INFERENCE_SIZE = 640
DEFAULT_CONFIDENCE = 0.4

# Output directory for captured images
CAPTURES_DIR = BASE_DIR / "live_captures"
CAPTURES_DIR.mkdir(exist_ok=True)

# Class names (must match data.yaml)
# NOTE: dataset only has class 0 (onion) - no unhealthy labels
CLASS_NAMES = {0: "onion"}

# Quality assessment colors (BGR for OpenCV)
CLASS_COLORS = {
    0: (255, 0, 0),      # onion - blue
}

# Mask colors (BGR)
MASK_COLORS = {
    0: (255, 0, 0),      # onion mask - blue
}

# Quality info per class
QUALITY_INFO = {
    0: {"label": "ONION", "color": (255, 0, 0), "status": "DETECTED", "severity": 0},
}


def find_model_path(custom_path: Optional[str] = None) -> Path:
    """Find the best available model file."""
    if custom_path:
        p = Path(custom_path)
        if p.exists():
            return p
        else:
            print(f"Warning: specified model not found: {p}")

    for p in DEFAULT_MODEL_PATHS:
        if p.exists():
            return p

    raise FileNotFoundError(
        "No model found! Train the model first:\n"
        "  python train_onion_seg.py\n"
        "Or download: yolov8n-seg.pt"
    )


# ==========================================================================
# LIVE CAMERA INSPECTION CLASS
# ==========================================================================

class LiveOnionInspector:
    """
    Real-time onion quality inspection using local YOLO model.
    """

    def __init__(
        self,
        model_path: Path,
        camera_index: int = CAMERA_INDEX,
        confidence_threshold: float = DEFAULT_CONFIDENCE,
    ):
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold

        # Load YOLO model
        print(f"Loading model: {model_path}")
        self.model = YOLO(str(model_path))
        self.class_names = self.model.names if hasattr(self.model, 'names') else CLASS_NAMES
        print(f"Model loaded! Classes: {self.class_names}")

        # Initialize camera
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

        print(f"Camera: {self.frame_width}x{self.frame_height} @ {self.fps}fps")

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

        # Window name
        self.window_name = "OnionSure - Live Quality Inspection (Local Model)"

    def run_inference(self, frame: np.ndarray) -> List[Dict]:
        """Run YOLO segmentation inference on frame."""
        results = self.model(
            frame,
            conf=self.confidence_threshold,
            imgsz=INFERENCE_SIZE,
            verbose=False,
            retina_masks=True,
        )

        detections = []
        if results and len(results) > 0:
            result = results[0]

            # Get bounding boxes
            if result.boxes is not None:
                boxes = result.boxes
                for i in range(len(boxes)):
                    cls_id = int(boxes.cls[i].item())
                    conf = float(boxes.conf[i].item())
                    x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
                    detections.append({
                        "class_id": cls_id,
                        "class_name": self.class_names.get(cls_id, f"class_{cls_id}"),
                        "confidence": conf,
                        "bbox": [int(x1), int(y1), int(x2), int(y2)],
                    })

            # Get segmentation masks
            if result.masks is not None and self.show_masks:
                masks = result.masks
                for i in range(len(masks)):
                    if i < len(detections):
                        mask_data = masks.data[i].cpu().numpy()
                        h, w = frame.shape[:2]
                        mask_resized = cv2.resize(mask_data, (w, h))
                        detections[i]["mask"] = mask_resized

        return detections

    def draw_masks(self, frame: np.ndarray, detections: List[Dict]) -> np.ndarray:
        """Draw a light mask tint + crisp contour so the video stays clearly visible.
        Masks are OFF by default (toggle with M)."""
        if not self.show_masks:
            return frame

        overlay = frame.copy()
        for det in detections:
            if "mask" not in det:
                continue
            cls_id = det["class_id"]
            color = MASK_COLORS.get(cls_id, (128, 128, 128))
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

    def draw_detection(
        self, frame: np.ndarray, det: Dict, det_id: int
    ) -> None:
        """Draw bounding box and label for single detection."""
        cls_id = det["class_id"]
        class_name = det["class_name"]
        conf = det["confidence"]
        x1, y1, x2, y2 = det["bbox"]

        # Clamp to frame
        x1 = max(0, min(x1, self.frame_width))
        y1 = max(0, min(y1, self.frame_height))
        x2 = max(0, min(x2, self.frame_width))
        y2 = max(0, min(y2, self.frame_height))

        info = QUALITY_INFO.get(cls_id, {
            "label": class_name.upper(),
            "color": (128, 128, 128),
            "status": "UNKNOWN",
            "severity": 2,
        })
        color = info["color"]

        # Draw bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)

        # Label text
        if self.show_confidence:
            label = f"#{det_id} {info['label']} {conf:.2f}"
        else:
            label = f"#{det_id} {info['label']}"

        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)

        # Label background
        ly = y1 - 10 if y1 - 10 > 20 else y2 + 20
        cv2.rectangle(frame, (x1, ly - th - 5), (x1 + tw + 10, ly + 5), (0, 0, 0), -1)
        cv2.putText(frame, label, (x1 + 5, ly), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        # Status badge (PASS/FAIL)
        status_text = info["status"]
        (sw, sh), _ = cv2.getTextSize(status_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
        sy = y2 + 18
        cv2.rectangle(frame, (x1, sy - sh - 3), (x1 + sw + 10, sy + 3), (0, 0, 0), -1)
        cv2.putText(frame, status_text, (x1 + 5, sy), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Detection ID circle
        center = (x2 - 20, y1 + 20)
        cv2.circle(frame, center, 15, color, -1)
        cv2.putText(frame, str(det_id), (center[0] - 7, center[1] + 7),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    def draw_statistics(self, frame: np.ndarray, detections: List[Dict]) -> None:
        """Draw statistics overlay."""
        healthy = sum(1 for d in detections if d["class_id"] == 0)
        unhealthy = sum(1 for d in detections if d["class_id"] == 1)
        total = len(detections)
        defect_rate = (unhealthy / total * 100) if total > 0 else 0

        lines = [
            f"LIVE ONION INSPECTION - Frame #{self.frame_count}",
            f"Model: {self.model_path.name}",
            f"Detected: {total} onions",
            f"Healthy: {healthy} | Unhealthy: {unhealthy}",
            f"Defect Rate: {defect_rate:.1f}%",
            "",
            f"Session Total: {self.total_detections} detections",
            f"  Healthy: {self.total_healthy}",
            f"  Unhealthy: {self.total_unhealthy}",
            f"Captures Saved: {self.capture_count}",
        ]

        if self.show_fps:
            lines.insert(1, f"FPS: {self.current_fps:.1f}")

        # Semi-transparent background
        overlay = frame.copy()
        cv2.rectangle(overlay, (10, 10), (420, 50 + len(lines) * 28), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)

        y = 40
        for line in lines:
            if line:
                cv2.putText(frame, line, (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
            y += 28

    def draw_controls(self, frame: np.ndarray) -> None:
        """Draw control instructions."""
        controls = "SPACE: Capture | Q: Quit | S: Stats | C: Confidence | F: FPS | M: Masks"
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, self.frame_height - 35), (self.frame_width, self.frame_height), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        cv2.putText(frame, controls, (20, self.frame_height - 12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    def save_capture(self, frame: np.ndarray, detections: List[Dict]) -> str:
        """Save annotated frame."""
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"onion_live_{ts}_{len(detections)}det.jpg"
        filepath = CAPTURES_DIR / filename

        watermark = f"OnionSure Live - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        cv2.putText(frame, watermark, (self.frame_width - 420, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        cv2.imwrite(str(filepath), frame)
        self.capture_count += 1
        print(f"  Captured: {filename}")
        return str(filepath)

    def update_fps(self) -> None:
        """Update FPS counter."""
        self.fps_counter += 1
        elapsed = time.time() - self.fps_start_time
        if elapsed > 1.0:
            self.current_fps = self.fps_counter / elapsed
            self.fps_counter = 0
            self.fps_start_time = time.time()

    def run(self) -> None:
        """Main inspection loop."""
        print("\n" + "=" * 60)
        print("  LIVE ONION QUALITY INSPECTION (LOCAL MODEL)")
        print("=" * 60)
        print(f"  Camera: {self.frame_width}x{self.frame_height}")
        print(f"  Model: {self.model_path.name}")
        print(f"  Confidence: {self.confidence_threshold}")
        print(f"  Classes: {self.class_names}")
        print(f"  Mask overlay: {'ON' if self.show_masks else 'OFF'}")
        print("\n  Controls:")
        print("    SPACE - Capture frame")
        print("    Q     - Quit")
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

                # Run inference
                detections = self.run_inference(frame)

                # Update session stats
                self.total_detections += len(detections)
                for d in detections:
                    if d["class_id"] == 0:
                        self.total_healthy += 1
                    else:
                        self.total_unhealthy += 1

                # Draw masks (under boxes)
                frame = self.draw_masks(frame, detections)

                # Draw detections
                for idx, det in enumerate(detections, start=1):
                    self.draw_detection(frame, det, idx)

                # Overlays
                if self.show_stats:
                    self.draw_statistics(frame, detections)
                self.draw_controls(frame)

                # FPS
                self.update_fps()

                # Show
                cv2.imshow(self.window_name, frame)

                # Keyboard
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q') or key == ord('Q'):
                    print("\nQuitting...")
                    break
                elif key == ord(' '):
                    self.save_capture(frame.copy(), detections)
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
            print(f"  Unhealthy: {self.total_unhealthy}")
            print(f"  Captures Saved: {self.capture_count}")
            print(f"  Captures Dir: {CAPTURES_DIR}")
            print("=" * 60)


# ==========================================================================
# MAIN
# ==========================================================================

def main():
    parser = argparse.ArgumentParser(description="Live Onion Quality Inspection (Local YOLO)")
    parser.add_argument("--model", type=str, default=None, help="Path to .pt model file")
    parser.add_argument("--camera", type=int, default=CAMERA_INDEX, help="Camera index (0=default)")
    parser.add_argument("--conf", type=float, default=DEFAULT_CONFIDENCE, help="Confidence threshold")
    args = parser.parse_args()

    print("\n" + "=" * 50)
    print("  OnionSure - Local Live Inspection")
    print("=" * 50 + "\n")

    try:
        model_path = find_model_path(args.model)
        inspector = LiveOnionInspector(
            model_path=model_path,
            camera_index=args.camera,
            confidence_threshold=args.conf,
        )
        inspector.run()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()

    print("\nInspection ended.\n")


if __name__ == "__main__":
    main()
