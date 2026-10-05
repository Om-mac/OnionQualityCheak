"""Temporary diagnostic: does the server-side confidence param change recall?"""
import base64
import json
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE = Path(r"c:\Users\darak\Downloads\onionsure\onioncheck")
load_dotenv(BASE / ".env")
KEY = os.getenv("ROBOFLOW_API_KEY").strip()
URL = f"https://serverless.roboflow.com/{os.getenv('ROBOFLOW_MODEL_ID')}"

IMAGES = [
    BASE / "test_image" / "Onion07060_jpg.rf.PhNY2oC8HGrtlsbxi9D9.jpg",
    BASE.parent / "bright_boxes_test.jpg",
]

for img_path in IMAGES:
    b64 = base64.b64encode(img_path.read_bytes()).decode()
    print(f"\n=== {img_path.name}")
    for params in (
        {},
        {"confidence": 1},
        {"confidence": 10},
        {"confidence": 5, "iou": 0.5},
        {"confidence": 5, "stacking": "true"},
    ):
        p = {"api_key": KEY, **params}
        r = requests.post(URL, params=p, data=b64, timeout=90)
        j = r.json()
        preds = j.get("predictions", [])
        classes = sorted({x["class"] for x in preds})
        top = max((x["confidence"] for x in preds), default=0)
        print(f"  {str(params):<45} n={len(preds):<3} topConf={top:.3f} classes={classes}")
        print("      raw:", r.text[:300])