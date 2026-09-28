"""
Onion Multi-Class Quality Classifier Training
=============================================
Trains a YOLOv8 classification model with 5 granular quality classes:
  0: healthy     - good quality, no defects
  1: damaged     - mechanical damage, bruising, cracks
  2: rotten      - decay, mold, soft spots
  3: sprouted    - green shoots emerging
  4: undersized  - small bulbs below grade standard

Strategy:
  The existing dataset only has 2 classes (healthy / unhealthy). We create a
  5-class superset by:
  1. Copying all "healthy" images into the new class 0 folder.
  2. Splitting "unhealthy" images into 4 defect bins using distinctive
     color / texture augmentations that mimic real-world defect appearances.

Output model: models/onion_multiclass_best.pt
"""

import random
import shutil
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR    = Path(__file__).resolve().parent
SRC_DATASET = BASE_DIR / "quality_dataset_two"
DST_DATASET = BASE_DIR / "multiclass_dataset"
MODELS_DIR  = BASE_DIR / "models"
PRETRAINED  = BASE_DIR / "yolov8n-cls.pt"

CLASSES = ["healthy", "damaged", "rotten", "sprouted", "undersized"]
SPLITS  = ["train", "val"]

random.seed(42)
np.random.seed(42)

# ---------------------------------------------------------------------------
# Augmentation helpers (produce visually distinct defect appearances)
# ---------------------------------------------------------------------------

def aug_damaged(img):
    """Simulate mechanical damage: brownish-red bruising + local erosion."""
    out = img.copy().astype(np.float32)
    out[:, :, 2] = np.clip(out[:, :, 2] * 1.35, 0, 255)
    out[:, :, 1] = np.clip(out[:, :, 1] * 0.75, 0, 255)
    h, w = img.shape[:2]
    cx = random.randint(w // 4, 3 * w // 4)
    cy = random.randint(h // 4, 3 * h // 4)
    r  = random.randint(w // 8, w // 4)
    mask = np.zeros((h, w), dtype=np.float32)
    cv2.circle(mask, (cx, cy), r, 1.0, -1)
    mask = cv2.GaussianBlur(mask, (51, 51), 15)
    for c in range(3):
        out[:, :, c] -= mask * 60
    out = np.clip(out, 0, 255).astype(np.uint8)
    kernel = np.ones((3, 3), np.uint8)
    return cv2.erode(out, kernel, iterations=1)


def aug_rotten(img):
    """Simulate rot: yellow-brown hue shift + noise."""
    out = img.copy().astype(np.float32)
    out[:, :, 2] = np.clip(out[:, :, 2] * 1.20 + 30, 0, 255)
    out[:, :, 1] = np.clip(out[:, :, 1] * 1.10 + 15, 0, 255)
    out[:, :, 0] = np.clip(out[:, :, 0] * 0.60, 0, 255)
    noise = np.random.randint(-25, 25, out.shape, dtype=np.int16)
    out   = np.clip(out.astype(np.int16) + noise, 0, 255).astype(np.float32)
    h, w  = img.shape[:2]
    spot_x = random.choice([0, w - 1])
    spot_y = random.choice([0, h - 1])
    r  = random.randint(w // 5, w // 3)
    mask = np.zeros((h, w), dtype=np.float32)
    cv2.circle(mask, (spot_x, spot_y), r, 1.0, -1)
    mask = cv2.GaussianBlur(mask, (41, 41), 12)
    for c in range(3):
        out[:, :, c] = np.clip(out[:, :, c] - mask * 80, 0, 255)
    return out.astype(np.uint8)


def aug_sprouted(img):
    """Simulate sprouting: green channel boost + bright vertical streak."""
    out = img.copy().astype(np.float32)
    out[:, :, 1] = np.clip(out[:, :, 1] * 1.40 + 20, 0, 255)
    out[:, :, 0] = np.clip(out[:, :, 0] * 0.80, 0, 255)
    out[:, :, 2] = np.clip(out[:, :, 2] * 0.85, 0, 255)
    out = np.clip(out, 0, 255).astype(np.uint8)
    h, w  = img.shape[:2]
    sx = random.randint(w // 3, 2 * w // 3)
    streak = np.zeros((h, w, 3), dtype=np.float32)
    cv2.line(streak, (sx, h // 2), (sx + random.randint(-5, 5), 0),
             (0, 200, 0), random.randint(3, 8))
    streak = cv2.GaussianBlur(streak, (7, 7), 3)
    return np.clip(out.astype(np.float32) + streak, 0, 255).astype(np.uint8)


def aug_undersized(img):
    """Simulate undersized bulb: scale to 55 pct then pad back."""
    h, w   = img.shape[:2]
    scale  = random.uniform(0.45, 0.60)
    sh, sw = max(10, int(h * scale)), max(10, int(w * scale))
    small  = cv2.resize(img, (sw, sh))
    bg     = tuple(int(c) for c in img[0, 0])
    canvas = np.full((h, w, 3), bg, dtype=np.uint8)
    y0     = (h - sh) // 2
    x0     = (w - sw) // 2
    canvas[y0:y0 + sh, x0:x0 + sw] = small
    return canvas


AUG_FN = {
    "damaged":    aug_damaged,
    "rotten":     aug_rotten,
    "sprouted":   aug_sprouted,
    "undersized": aug_undersized,
}

# ---------------------------------------------------------------------------
# Build multi-class dataset
# ---------------------------------------------------------------------------

def build_dataset():
    print("\n" + "=" * 60)
    print("  BUILDING 5-CLASS DATASET")
    print("=" * 60)

    if DST_DATASET.exists():
        shutil.rmtree(DST_DATASET)

    for split in SPLITS:
        for cls in CLASSES:
            (DST_DATASET / split / cls).mkdir(parents=True, exist_ok=True)

    defect_classes = ["damaged", "rotten", "sprouted", "undersized"]

    for split in SPLITS:
        src_healthy   = SRC_DATASET / split / "healthy"
        src_unhealthy = SRC_DATASET / split / "unhealthy"
        dst_healthy   = DST_DATASET / split / "healthy"

        healthy_imgs   = sorted(src_healthy.glob("*.jpg"))   + sorted(src_healthy.glob("*.png"))
        unhealthy_imgs = sorted(src_unhealthy.glob("*.jpg")) + sorted(src_unhealthy.glob("*.png"))
        random.shuffle(unhealthy_imgs)

        print(f"\n  [{split}] Copying {len(healthy_imgs)} healthy images...")
        for p in healthy_imgs:
            shutil.copy2(p, dst_healthy / p.name)

        n     = len(unhealthy_imgs)
        chunk = max(1, n // len(defect_classes))
        remaining = list(unhealthy_imgs)

        print(f"  [{split}] Augmenting {n} unhealthy images into 4 defect classes...")
        for idx, dcls in enumerate(defect_classes):
            bucket    = remaining[:chunk] if idx < len(defect_classes) - 1 else remaining
            remaining = remaining[chunk:]
            dst_cls   = DST_DATASET / split / dcls
            print(f"    {dcls}: {len(bucket)} images")
            for p in bucket:
                img = cv2.imread(str(p))
                if img is None:
                    continue
                img_aug  = AUG_FN[dcls](img)
                out_name = dcls + "_" + p.stem + p.suffix
                cv2.imwrite(str(dst_cls / out_name), img_aug)
                shutil.copy2(p, dst_cls / p.name)

    print("\n  Dataset summary:")
    for split in SPLITS:
        print(f"  [{split}]")
        for cls in CLASSES:
            n = len(list((DST_DATASET / split / cls).glob("*")))
            print(f"    {cls:<12s}: {n}")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Train
# ---------------------------------------------------------------------------

def train():
    print("\n" + "=" * 60)
    print("  TRAINING 5-CLASS ONION QUALITY CLASSIFIER")
    print("=" * 60)

    model   = YOLO(str(PRETRAINED))
    results = model.train(
        data=str(DST_DATASET),
        epochs=30,
        batch=16,
        imgsz=224,
        device="cpu",
        workers=4,
        patience=10,
        save=True,
        save_period=10,
        project=str(BASE_DIR / "runs" / "multiclass"),
        name="onion_quality_5cls",
        exist_ok=True,
        pretrained=True,
        optimizer="auto",
        lr0=0.005,
        lrf=0.01,
        momentum=0.937,
        weight_decay=0.0005,
        warmup_epochs=3.0,
        warmup_momentum=0.8,
        warmup_bias_lr=0.1,
        hsv_h=0.010,
        hsv_s=0.5,
        hsv_v=0.3,
        degrees=20.0,
        translate=0.1,
        scale=0.4,
        flipud=0.0,
        fliplr=0.5,
        erasing=0.3,
        auto_augment="randaugment",
        verbose=True,
        seed=42,
        deterministic=True,
    )

    best_src = BASE_DIR / "runs" / "multiclass" / "onion_quality_5cls" / "weights" / "best.pt"
    if best_src.exists():
        MODELS_DIR.mkdir(exist_ok=True)
        dst = MODELS_DIR / "onion_multiclass_best.pt"
        shutil.copy2(best_src, dst)
        print(f"\n  Model saved: {dst}")
    else:
        print(f"\n  WARNING: could not find best.pt at {best_src}")

    return results


# ---------------------------------------------------------------------------
# Validate
# ---------------------------------------------------------------------------

def validate():
    model_path = MODELS_DIR / "onion_multiclass_best.pt"
    if not model_path.exists():
        print("  Skipping validation - model not found.")
        return
    print("\n" + "=" * 60)
    print("  VALIDATION")
    print("=" * 60)
    model = YOLO(str(model_path))
    print(f"  Classes: {model.names}")
    metrics = model.val(data=str(DST_DATASET), imgsz=224, device="cpu")
    print(f"  Top-1: {getattr(metrics, 'top1', '?')}")
    print(f"  Top-5: {getattr(metrics, 'top5', '?')}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("\nONION MULTI-CLASS QUALITY CLASSIFIER TRAINING")
    print("5 classes: healthy | damaged | rotten | sprouted | undersized\n")
    build_dataset()
    train()
    validate()
    print("\nDONE! Model saved to: models/onion_multiclass_best.pt")
