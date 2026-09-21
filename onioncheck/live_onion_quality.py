"""
Live Onion Quality Inspection - 100% Local (Seg + Classification)
==================================================================
Uses TWO local YOLO models together - no internet needed:

  1. YOLOv8-seg (best.pt) - detects WHERE onions are in the frame
  2. YOLOv8-cls (best.pt) - classifies each onion as healthy or unhealthy

Workflow per frame:
  - Segmentation model finds onion bounding boxes + masks
  - Filters false positives (tiny boxes, edge artifacts, bad aspect ratios)
  - For each valid onion, crop with padding and run classification
  - Display: blue box = healthy, red box = unhealthy
  - Show segmentation masks, confidence scores, statistics

Usage:
    python live_onion_quality.py
    python live_onion_quality.py --camera 0 --conf 0.5
    python live_onion_quality.py --mode single   (single onion, classify full frame)

Controls:
    SPACE - Capture current frame & save annotated image
    Q     - Quit application
    S     - Toggle statistics display
    C     - Toggle confidence display
    F     - Toggle FPS counter
    M     - Toggle mask overlay
    D     - Toggle debug info (show all detection details)
"""

import argparse
import cv2
import time
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from ultralytics import YOLO

# ==========================================================================
# CONFIGURATION
# ==========================================================================

BASE_DIR = Path(__file__).resolve().parent

# Segmentation model (detects onions)
SEG_MODEL_PATHS = [
    BASE_DIR / "runs" / "segment" / "runs" / "onion_seg_test" / "weights" / "best.pt",
    BASE_DIR / "runs" / "segment" / "runs" / "onion_seg_test" / "weights" / "last.pt",
    BASE_DIR / "yolov8n-seg.pt",
]

# Classification model (healthy vs unhealthy)
CLS_MODEL_PATHS = [
    BASE_DIR / "runs" / "classify" / "runs" / "onion_cls" / "weights" / "best.pt",
    BASE_DIR / "runs" / "classify" / "runs" / "onion_cls" / "weights" / "last.pt",
    BASE_DIR / "yolov8n-cls.pt",
]

# Camera
CAMERA_INDEX = 0
FRAME_WIDTH = 1280
FRAME_HEIGHT = 720
INFERENCE_SIZE = 640
CLS_INFER_SIZE = 224
DEFAULT_CONFIDENCE = 0.25
IOU_THRESHOLD = 0.4

# Output
CAPTURES_DIR = BASE_DIR / "live_captures"
CAPTURES_DIR.mkdir(exist_ok=True)

# Colors (BGR)
COLOR_HEALTHY = (255, 0, 0)     # blue (green removed so the video stays clear)
COLOR_UNHEALTHY = (0, 0, 255)    # red
COLOR_UNKNOWN = (128, 128, 128)  # gray


def find_model(paths: list, name: str) -> Path:
    for p in paths:
        if p.exists():
            print(f"  {name}: {p}")
            return p
    raise FileNotFoundError(f"No {name} found!")


# ==========================================================================
# LIVE INSPECTION
# ==========================================================================

class LocalOnionQualityInspector:

    def __init__(
        self,
        seg_model_path: Path,
        cls_model_path: Path,
        camera_index: int = CAMERA_INDEX,
        confidence: float = DEFAULT_CONFIDENCE,
    ):
        self.confidence = confidence

        # Load both models
        print(f"\n  Loading segmentation model...")
        self.seg_model = YOLO(str(seg_model_path))
        self.seg_names = self.seg_model.names if hasattr(self.seg_model, 'names') else {0: "onion"}
        print(f"  Seg classes: {self.seg_names}")

        print(f"  Loading classification model...")
        self.cls_model = YOLO(str(cls_model_path))
        self.cls_names = self.cls_model.names if hasattr(self.cls_model, 'names') else {0: "healthy", 1: "unhealthy"}
        print(f"  Cls classes: {self.cls_names}")

        # Camera
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

        # Stats
        self.frame_count = 0
        self.total_healthy = 0
        self.total_unhealthy = 0
        self.capture_count = 0

        # Toggles
        self.show_stats = True
        self.show_confidence = True
        self.show_fps = True
        self.show_masks = False  # masks OFF by default so the live video isn't covered in green
        self.show_debug = False

        # FPS
        self.fps_counter = 0
        self.fps_start = time.time()
        self.current_fps = 0.0

        self.window_name = "OnionSure - Local Quality Inspection (Seg+Cls)"

    def run_inference(self, frame: np.ndarray) -> List[Dict]:
        """Step 1: segment onions, Step 2: classify each onion."""
        h_img, w_img = frame.shape[:2]

        # Step 1: Segmentation - use lower conf to catch all onions
        seg_results = self.seg_model(
            frame,
            conf=self.confidence,
            imgsz=INFERENCE_SIZE,
            iou=IOU_THRESHOLD,     # Better NMS to avoid overlapping boxes
            max_det=30,            # Allow more detections
            verbose=False,
            retina_masks=True,
        )

        detections = []
        if not seg_results or len(seg_results) == 0:
            return detections

        result = seg_results[0]
        if result.boxes is None:
            return detections

        boxes = result.boxes
        masks = result.masks if result.masks is not None else None

        for i in range(len(boxes)):
            x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
            seg_conf = float(boxes.conf[i].item())

            # --- FILTER: skip boxes that are too small (false positives) ---
            box_w = x2 - x1
            box_h = y2 - y1
            if box_w < 30 or box_h < 30:
                continue

            # --- FILTER: skip boxes that touch image edges (artifacts) ---
            margin = 5
            if x1 <= margin and y1 <= margin:
                continue  # corner artifact
            if x2 >= w_img - margin and y2 >= h_img - margin:
                continue  # corner artifact

            # --- FILTER: skip very wide/aspect ratio boxes (not onions) ---
            aspect = box_w / box_h if box_h > 0 else 0
            if aspect > 3.0 or aspect < 0.33:
                continue

            # Step 2: Add padding to crop (helps classification model)
            pad = int(min(box_w, box_h) * 0.1)  # 10% padding
            cx1 = max(0, x1 - pad)
            cy1 = max(0, y1 - pad)
            cx2 = min(w_img, x2 + pad)
            cy2 = min(h_img, y2 + pad)

            crop = frame[cy1:cy2, cx1:cx2]

            cls_name = "unknown"
            cls_conf = 0.0

            if crop.size > 0 and crop.shape[0] >= 10 and crop.shape[1] >= 10:
                cls_results = self.cls_model(
                    crop,
                    imgsz=CLS_INFER_SIZE,
                    verbose=False,
                )
                if cls_results and len(cls_results) > 0:
                    cls_result = cls_results[0]
                    if cls_result.probs is not None:
                        probs = cls_result.probs
                        top1_idx = int(probs.top1)
                        cls_name = self.cls_names.get(top1_idx, f"class_{top1_idx}")
                        cls_conf = float(probs.top1conf)

            det = {
                "class_name": cls_name,
                "seg_confidence": seg_conf,
                "cls_confidence": cls_conf,
                "bbox": [x1, y1, x2, y2],
                "healthy": cls_name.lower() == "healthy",
            }

            # Get mask
            if masks is not None and self.show_masks:
                mask_data = masks.data[i].cpu().numpy()
                h, w = frame.shape[:2]
                det["mask"] = cv2.resize(mask_data, (w, h))

            detections.append(det)

        return detections

    def draw_masks(self, frame, detections):
        """Draw a light mask tint + crisp contour so the video stays clearly visible.
        Masks are OFF by default (toggle with M)."""
        if not self.show_masks:
            return frame
        overlay = frame.copy()
        for det in detections:
            if "mask" not in det:
                continue
            color = COLOR_HEALTHY if det["healthy"] else COLOR_UNHEALTHY
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

    def draw_detection(self, frame, det, idx):
        x1, y1, x2, y2 = det["bbox"]
        x1 = max(0, min(x1, self.frame_width))
        y1 = max(0, min(y1, self.frame_height))
        x2 = max(0, min(x2, self.frame_width))
        y2 = max(0, min(y2, self.frame_height))

        color = COLOR_HEALTHY if det["healthy"] else COLOR_UNHEALTHY
        label_text = "HEALTHY" if det["healthy"] else "UNHEALTHY"
        status = "PASS" if det["healthy"] else "FAIL"

        # Box
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)

        # Label
        if self.show_confidence:
            label = f"#{idx} {label_text} {det['cls_confidence']:.2f}"
        else:
            label = f"#{idx} {label_text}"

        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
        ly = y1 - 12 if y1 - 12 > 20 else y2 + 22
        cv2.rectangle(frame, (x1, ly - th - 6), (x1 + tw + 12, ly + 6), (0, 0, 0), -1)
        cv2.putText(frame, label, (x1 + 6, ly), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

        # Status badge
        (sw, sh), _ = cv2.getTextSize(status, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
        sy = y2 + 22
        cv2.rectangle(frame, (x1, sy - sh - 4), (x1 + sw + 12, sy + 4), (0, 0, 0), -1)
        cv2.putText(frame, status, (x1 + 6, sy), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Large ID number circle (clear count visibility)
        center = ((x1 + x2) // 2, y1 - 5 if y1 - 5 > 15 else y1 + 15)
        if center[1] < 15:
            center = (center[0], y2 + 15)
        cv2.circle(frame, center, 18, color, -1)
        cv2.circle(frame, center, 18, (0, 0, 0), 2)
        cv2.putText(frame, str(idx), (center[0] - 9, center[1] + 7),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

        # Seg confidence (small, bottom right of box)
        seg_label = f"seg:{det['seg_confidence']:.2f}"
        (sw2, sh2), _ = cv2.getTextSize(seg_label, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
        cv2.rectangle(frame, (x2 - sw2 - 8, y2 - sh2 - 8), (x2, y2), (0, 0, 0), -1)
        cv2.putText(frame, seg_label, (x2 - sw2 - 5, y2 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)

    def draw_stats(self, frame, detections):
        healthy = sum(1 for d in detections if d["healthy"])
        unhealthy = sum(1 for d in detections if not d["healthy"])
        total = len(detections)
        rate = (unhealthy / total * 100) if total > 0 else 0

        lines = [
            f"ONION COUNT: {total}",
            f"  Healthy: {healthy} | Unhealthy: {unhealthy}",
            f"  Defect Rate: {rate:.1f}%",
            "",
            f"Frame #{self.frame_count}",
            f"Session Totals:",
            f"  Healthy: {self.total_healthy}",
            f"  Unhealthy: {self.total_unhealthy}",
            f"  Captures: {self.capture_count}",
        ]

        if self.show_fps:
            lines.insert(1, f"FPS: {self.current_fps:.1f}")

        overlay = frame.copy()
        cv2.rectangle(overlay, (10, 10), (420, 50 + len(lines) * 28), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)

        y = 40
        for idx, line in enumerate(lines):
            if line:
                color = (255, 255, 255)
                if idx == 0:
                    color = (0, 255, 255)  # yellow for count
                elif "Healthy" in line and "Unhealthy" in line:
                    color = (200, 200, 200)
                elif "Unhealthy" in line and "0" != line.split(":")[-1].strip().split("|")[0].strip():
                    pass
                cv2.putText(frame, line, (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)
            y += 28

    def draw_controls(self, frame):
        controls = "SPACE:Capture | Q:Quit | S:Stats | C:Conf | F:FPS | M:Masks | D:Debug"
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, self.frame_height - 35), (self.frame_width, self.frame_height), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        cv2.putText(frame, controls, (20, self.frame_height - 12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    def draw_debug(self, frame, detections):
        """Draw debug info for each detection."""
        y = self.frame_height - 80
        for i, det in enumerate(detections):
            x1, y1, x2, y2 = det["bbox"]
            box_w = x2 - x1
            box_h = y2 - y1
            line = f"#{i+1} seg={det['seg_confidence']:.3f} cls={det['class_name']}({det['cls_confidence']:.3f}) box={box_w}x{box_h} at({x1},{y1})"
            cv2.putText(frame, line, (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
            y -= 15

    def save_capture(self, frame, detections):
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"onion_quality_{ts}_{len(detections)}det.jpg"
        filepath = CAPTURES_DIR / filename
        watermark = f"OnionSure Local - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        cv2.putText(frame, watermark, (self.frame_width - 420, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        cv2.imwrite(str(filepath), frame)
        self.capture_count += 1
        print(f"  Captured: {filename}")

    def update_fps(self):
        self.fps_counter += 1
        elapsed = time.time() - self.fps_start
        if elapsed > 1.0:
            self.current_fps = self.fps_counter / elapsed
            self.fps_counter = 0
            self.fps_start = time.time()

    def run(self):
        print("\n" + "=" * 60)
        print("  LOCAL ONION QUALITY INSPECTION (Seg + Cls)")
        print("=" * 60)
        print(f"  Camera: {self.frame_width}x{self.frame_height}")
        print(f"  Seg model: onion detection")
        print(f"  Cls model: healthy/unhealthy classification")
        print(f"  Confidence: {self.confidence}")
        print(f"  Masks: {'ON' if self.show_masks else 'OFF'}")
        print("\n  Controls:")
        print("    SPACE - Capture frame")
        print("    Q     - Quit")
        print("    S     - Toggle stats")
        print("    C     - Toggle confidence")
        print("    F     - Toggle FPS")
        print("    M     - Toggle masks")
        print("    D     - Toggle debug info")
        print("=" * 60 + "\n")

        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    print("Failed to read frame")
                    break

                self.frame_count += 1
                detections = self.run_inference(frame)

                # Session stats
                for d in detections:
                    if d["healthy"]:
                        self.total_healthy += 1
                    else:
                        self.total_unhealthy += 1

                # Draw
                frame = self.draw_masks(frame, detections)
                for idx, det in enumerate(detections, 1):
                    self.draw_detection(frame, det, idx)
                if self.show_stats:
                    self.draw_stats(frame, detections)
                self.draw_controls(frame)
                if self.show_debug:
                    self.draw_debug(frame, detections)
                self.update_fps()

                cv2.imshow(self.window_name, frame)

                key = cv2.waitKey(1) & 0xFF
                if key == ord('q') or key == ord('Q'):
                    break
                elif key == ord(' '):
                    self.save_capture(frame.copy(), detections)
                elif key == ord('s') or key == ord('S'):
                    self.show_stats = not self.show_stats
                elif key == ord('c') or key == ord('C'):
                    self.show_confidence = not self.show_confidence
                elif key == ord('f') or key == ord('F'):
                    self.show_fps = not self.show_fps
                elif key == ord('m') or key == ord('M'):
                    self.show_masks = not self.show_masks
                elif key == ord('d') or key == ord('D'):
                    self.show_debug = not self.show_debug

        except KeyboardInterrupt:
            print("\nInterrupted")

        finally:
            self.cap.release()
            cv2.destroyAllWindows()
            print("\n" + "=" * 60)
            print("  SESSION SUMMARY")
            print("=" * 60)
            print(f"  Frames: {self.frame_count}")
            print(f"  Healthy: {self.total_healthy}")
            print(f"  Unhealthy: {self.total_unhealthy}")
            print(f"  Captures: {self.capture_count}")
            print("=" * 60)


# ==========================================================================
# MAIN
# ==========================================================================

def main():
    parser = argparse.ArgumentParser(description="Local Onion Quality Inspection")
    parser.add_argument("--camera", type=int, default=CAMERA_INDEX)
    parser.add_argument("--conf", type=float, default=DEFAULT_CONFIDENCE)
    args = parser.parse_args()

    print("\n" + "=" * 50)
    print("  OnionSure - Local Quality (Seg + Classification)")
    print("=" * 50)

    seg_path = find_model(SEG_MODEL_PATHS, "segmentation model")
    cls_path = find_model(CLS_MODEL_PATHS, "classification model")

    inspector = LocalOnionQualityInspector(
        seg_model_path=seg_path,
        cls_model_path=cls_path,
        camera_index=args.camera,
        confidence=args.conf,
    )
    inspector.run()
    print("\nDone.\n")


if __name__ == "__main__":
    main()
