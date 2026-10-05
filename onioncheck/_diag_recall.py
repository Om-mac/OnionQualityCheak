"""Temporary diagnostic: measure real Roboflow recall + class distribution."""
import os
import sys
from pathlib import Path

import cv2
import numpy as np
from dotenv import load_dotenv
from inference_sdk import InferenceHTTPClient

BASE = Path(r"c:\Users\darak\Downloads\onionsure\onioncheck")
load_dotenv(BASE / ".env")
KEY = os.getenv("ROBOFLOW_API_KEY").strip()
MODEL = os.getenv("ROBOFLOW_MODEL_ID", "veg1-hcqsf-2/4")
client = InferenceHTTPClient(api_url="https://serverless.roboflow.com", api_key=KEY)

IMAGES = [
    BASE / "test_image" / "Onion07060_jpg.rf.PhNY2oC8HGrtlsbxi9D9.jpg",
    BASE.parent / "bright_boxes_test.jpg",
    BASE.parent / "8d36be38-b7e8-45ad-b44a-7c65c9b44350.png",
]

seen_classes = {}
for img_path in IMAGES:
    img = cv2.imread(str(img_path))
    if img is None:
        print("skip", img_path)
        continue
    h, w = img.shape[:2]
    print(f"\n=== {img_path.name}  {w}x{h}")
    for conf in (0.05, 0.1, 0.2, 0.3, 0.4):
        res = client.infer(img, model_id=MODEL)
        preds = res.get("predictions", [])
        keep = [p for p in preds if p.get("confidence", 0) >= conf]
        for p in keep:
            seen_classes[p["class"]] = seen_classes.get(p["class"], 0) + 1
        area = [p["width"] * p["height"] / float(w * h) for p in keep]
        big = sum(1 for a in area if a > 0.25)
        print(
            f"  conf>={conf:<5} n={len(keep):<3} "
            f"maxAreaFrac={max(area) if area else 0:.2f} giant(>25%)={big}"
        )
    # Print raw detail once
    res = client.infer(img, model_id=MODEL)
    for p in res.get("predictions", []):
        print(f"     {p['class']:<12} conf={p['confidence']:.3f} "
              f"cx={p['x']:.0f} cy={p['y']:.0f} w={p['width']:.0f} h={p['height']:.0f}")

print("\nCLASSES SEEN:", seen_classes)