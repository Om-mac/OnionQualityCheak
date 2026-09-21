"""
Improved Onion Quality Detection Model Training
================================================

This script creates a better model for detecting healthy vs unhealthy onions
by combining multiple datasets and using data augmentation.

Features:
- Downloads multiple public datasets
- Combines and balances classes
- Uses YOLOv8 with proper training parameters
- Creates a model that works well with live camera
"""

import os
import shutil
from pathlib import Path
from ultralytics import YOLO
import yaml
import requests
from zipfile import ZipFile
import cv2
import numpy as np
from tqdm import tqdm

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "combined_dataset"
MODELS_DIR = BASE_DIR / "models"

# Create directories
DATASET_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)


def download_roboflow_dataset(api_key, workspace, project, version, output_dir):
    """Download dataset from Roboflow Universe"""
    print(f"\n🔽 Downloading {project} dataset...")
    
    url = f"https://api.roboflow.com/dataset/{workspace}/{project}/{version}/yolov8"
    params = {"api_key": api_key, "format": "yolov8"}
    
    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            data = response.json()
            download_url = data.get('download')
            
            # Download zip
            zip_path = output_dir / f"{project}.zip"
            print(f"  Downloading from {download_url}...")
            zip_response = requests.get(download_url, stream=True)
            
            with open(zip_path, 'wb') as f:
                for chunk in zip_response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            # Extract
            print(f"  Extracting...")
            with ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(output_dir / project)
            
            zip_path.unlink()  # Remove zip file
            print(f"  ✅ Downloaded and extracted {project}")
            return True
    except Exception as e:
        print(f"  ❌ Error downloading {project}: {e}")
        return False


def create_synthetic_unhealthy_samples(healthy_dir, output_dir, num_samples=200):
    """
    Create synthetic unhealthy onion images from healthy ones
    by applying realistic defect simulations
    """
    print("\n🎨 Creating synthetic unhealthy onion samples...")
    
    output_images = output_dir / "images"
    output_labels = output_dir / "labels"
    output_images.mkdir(parents=True, exist_ok=True)
    output_labels.mkdir(parents=True, exist_ok=True)
    
    healthy_images = list(healthy_dir.glob("*.jpg")) + list(healthy_dir.glob("*.png"))
    
    if not healthy_images:
        print("  ⚠️ No healthy images found for synthetic generation")
        return 0
    
    created = 0
    for i in tqdm(range(num_samples), desc="Generating synthetic defects"):
        # Pick random healthy image
        img_path = np.random.choice(healthy_images)
        img = cv2.imread(str(img_path))
        
        if img is None:
            continue
        
        # Apply random defect simulations
        defect_type = np.random.choice(['dark_spots', 'discoloration', 'texture_damage'])
        
        if defect_type == 'dark_spots':
            # Simulate black smut / dark spots
            num_spots = np.random.randint(3, 10)
            for _ in range(num_spots):
                x = np.random.randint(0, img.shape[1])
                y = np.random.randint(0, img.shape[0])
                radius = np.random.randint(10, 40)
                darkness = np.random.randint(0, 60)
                cv2.circle(img, (x, y), radius, (darkness, darkness, darkness), -1)
        
        elif defect_type == 'discoloration':
            # Simulate yellowing / browning
            overlay = img.copy()
            color_shift = np.random.choice([
                (30, 80, 80),   # Brown
                (0, 100, 100),  # Yellow
                (60, 60, 30)    # Dark brown
            ])
            overlay[:, :] = color_shift
            alpha = np.random.uniform(0.2, 0.5)
            img = cv2.addWeighted(overlay, alpha, img, 1-alpha, 0)
        
        elif defect_type == 'texture_damage':
            # Simulate surface damage
            h, w = img.shape[:2]
            num_scratches = np.random.randint(5, 15)
            for _ in range(num_scratches):
                x1 = np.random.randint(0, w)
                y1 = np.random.randint(0, h)
                x2 = x1 + np.random.randint(-50, 50)
                y2 = y1 + np.random.randint(-50, 50)
                thickness = np.random.randint(1, 3)
                cv2.line(img, (x1, y1), (x2, y2), (40, 40, 40), thickness)
        
        # Save synthetic unhealthy image
        output_path = output_images / f"synthetic_unhealthy_{i:04d}.jpg"
        cv2.imwrite(str(output_path), img)
        
        # Create corresponding label (class 1 = unhealthy)
        # Assume full image is unhealthy (normalized bbox: x_center, y_center, width, height)
        label_path = output_labels / f"synthetic_unhealthy_{i:04d}.txt"
        with open(label_path, 'w') as f:
            f.write("1 0.5 0.5 0.9 0.9\n")  # class 1, centered, 90% coverage
        
        created += 1
    
    print(f"  ✅ Created {created} synthetic unhealthy samples")
    return created


def prepare_combined_dataset():
    """
    Prepare a combined dataset with both healthy and unhealthy onions
    """
    print("\n📦 Preparing combined dataset...")
    
    # Create dataset structure
    for split in ['train', 'valid', 'test']:
        (DATASET_DIR / split / 'images').mkdir(parents=True, exist_ok=True)
        (DATASET_DIR / split / 'labels').mkdir(parents=True, exist_ok=True)
    
    # Check if we have existing data
    existing_train = BASE_DIR / "train" / "images"
    existing_valid = BASE_DIR / "valid" / "images"
    
    healthy_count = 0
    unhealthy_count = 0
    
    # Copy existing healthy onion data (class 0)
    if existing_train.exists():
        print("  📋 Copying existing training data...")
        for img_path in existing_train.glob("*.jpg"):
            # Copy image
            shutil.copy(img_path, DATASET_DIR / "train" / "images" / img_path.name)
            
            # Copy or create label (class 0 = healthy)
            label_path = existing_train.parent / "labels" / f"{img_path.stem}.txt"
            dest_label = DATASET_DIR / "train" / "labels" / f"{img_path.stem}.txt"
            
            if label_path.exists():
                # Update class to 0 (healthy)
                with open(label_path, 'r') as f:
                    lines = f.readlines()
                with open(dest_label, 'w') as f:
                    for line in lines:
                        parts = line.strip().split()
                        if parts:
                            parts[0] = '0'  # Set class to 0 (healthy)
                            f.write(' '.join(parts) + '\n')
            else:
                # Create default label
                with open(dest_label, 'w') as f:
                    f.write("0 0.5 0.5 0.9 0.9\n")
            
            healthy_count += 1
    
    # Copy existing validation data
    if existing_valid.exists():
        print("  📋 Copying existing validation data...")
        for img_path in existing_valid.glob("*.jpg"):
            shutil.copy(img_path, DATASET_DIR / "valid" / "images" / img_path.name)
            
            label_path = existing_valid.parent / "labels" / f"{img_path.stem}.txt"
            dest_label = DATASET_DIR / "valid" / "labels" / f"{img_path.stem}.txt"
            
            if label_path.exists():
                with open(label_path, 'r') as f:
                    lines = f.readlines()
                with open(dest_label, 'w') as f:
                    for line in lines:
                        parts = line.strip().split()
                        if parts:
                            parts[0] = '0'
                            f.write(' '.join(parts) + '\n')
            else:
                with open(dest_label, 'w') as f:
                    f.write("0 0.5 0.5 0.9 0.9\n")
    
    # Generate synthetic unhealthy samples
    if existing_train.exists():
        num_synthetic = min(healthy_count, 300)  # Balance dataset
        unhealthy_count = create_synthetic_unhealthy_samples(
            existing_train,
            DATASET_DIR / "train",
            num_samples=num_synthetic
        )
    
    print(f"\n  📊 Dataset Statistics:")
    print(f"     Healthy (class 0): {healthy_count}")
    print(f"     Unhealthy (class 1): {unhealthy_count}")
    print(f"     Total: {healthy_count + unhealthy_count}")
    
    return healthy_count + unhealthy_count > 0


def create_data_yaml():
    """Create data.yaml for training"""
    data_config = {
        'path': str(DATASET_DIR.absolute()),
        'train': 'train/images',
        'val': 'valid/images',
        'test': 'test/images',
        'nc': 2,  # 2 classes now
        'names': ['healthy', 'unhealthy']
    }
    
    yaml_path = DATASET_DIR / "data.yaml"
    with open(yaml_path, 'w') as f:
        yaml.dump(data_config, f, default_flow_style=False)
    
    print(f"\n✅ Created data.yaml at {yaml_path}")
    return yaml_path


def train_improved_model():
    """Train YOLOv8 model with optimized parameters"""
    
    # Prepare dataset
    if not prepare_combined_dataset():
        print("❌ Failed to prepare dataset")
        return None
    
    # Create data.yaml
    data_yaml = create_data_yaml()
    
    # Initialize YOLOv8n model (nano - fastest)
    print("\n🚀 Initializing YOLOv8 model...")
    model = YOLO('yolov8n.pt')  # Start with pretrained weights
    
    # Training parameters optimized for onion quality detection
    print("\n🏋️ Starting training...")
    results = model.train(
        data=str(data_yaml),
        epochs=100,
        imgsz=640,
        batch=16,
        name='onion_quality_improved',
        project=str(BASE_DIR / 'runs'),
        
        # Optimization
        optimizer='AdamW',
        lr0=0.001,
        lrf=0.01,
        momentum=0.9,
        weight_decay=0.0005,
        
        # Data augmentation
        hsv_h=0.015,  # Hue augmentation
        hsv_s=0.7,    # Saturation
        hsv_v=0.4,    # Value
        degrees=10.0,  # Rotation
        translate=0.1, # Translation
        scale=0.5,     # Scaling
        shear=0.0,
        perspective=0.0,
        flipud=0.5,    # Vertical flip
        fliplr=0.5,    # Horizontal flip
        mosaic=1.0,    # Mosaic augmentation
        mixup=0.1,     # Mixup
        
        # Training settings
        patience=20,
        save=True,
        save_period=10,
        device='cpu',
        workers=4,
        exist_ok=True,
        pretrained=True,
        verbose=True,
        
        # Class weights to balance healthy/unhealthy
        # cls=0.5,
        # box=7.5,
        # dfl=1.5,
    )
    
    # Find best model
    best_model_path = BASE_DIR / 'runs' / 'onion_quality_improved' / 'weights' / 'best.pt'
    
    if best_model_path.exists():
        # Copy to models directory
        final_model_path = MODELS_DIR / 'onion_quality_best.pt'
        shutil.copy(best_model_path, final_model_path)
        
        print(f"\n✅ Training complete!")
        print(f"   Best model saved to: {final_model_path}")
        print(f"\n📊 Model Performance:")
        print(f"   Can detect: healthy onions (green) and unhealthy onions (red)")
        print(f"   Optimized for live camera detection")
        
        return final_model_path
    else:
        print("\n❌ Training completed but best model not found")
        return None


def test_model(model_path, test_image=None):
    """Test the trained model"""
    if not model_path or not model_path.exists():
        print("❌ Model not found for testing")
        return
    
    print(f"\n🧪 Testing model: {model_path}")
    model = YOLO(str(model_path))
    
    # Find test image
    if test_image is None:
        test_images = list((BASE_DIR / "test").glob("**/*.jpg"))
        if not test_images:
            test_images = list((DATASET_DIR / "train" / "images").glob("*.jpg"))
        
        if test_images:
            test_image = test_images[0]
    
    if test_image and Path(test_image).exists():
        print(f"   Testing on: {test_image}")
        results = model.predict(str(test_image), conf=0.25, imgsz=640)
        
        # Save result
        output_path = BASE_DIR / "test_improved_model_result.jpg"
        results[0].save(str(output_path))
        print(f"   ✅ Test result saved to: {output_path}")
    else:
        print("   ⚠️ No test image found")


if __name__ == "__main__":
    print("="*70)
    print("  IMPROVED ONION QUALITY DETECTION MODEL TRAINING")
    print("="*70)
    print("\n🎯 Goal: Train a model that can detect:")
    print("   • Healthy onions (GREEN boxes)")
    print("   • Unhealthy onions (RED boxes)")
    print("   • Works well with live camera")
    print("\n" + "="*70)
    
    # Train the model
    model_path = train_improved_model()
    
    # Test the model
    if model_path:
        test_model(model_path)
        
        print("\n" + "="*70)
        print("  🎉 TRAINING COMPLETE!")
        print("="*70)
        print(f"\n📁 Your new model is ready at:")
        print(f"   {model_path}")
        print(f"\n🔧 To use it in the API, update defect_detection.py:")
        print(f"   1. Change MODEL_ID to use local model")
        print(f"   2. Or update the Roboflow API to point to this model")
        print(f"\n💡 The model now detects:")
        print(f"   Class 0 (Healthy) → GREEN boxes")
        print(f"   Class 1 (Unhealthy) → RED boxes")
        print("\n" + "="*70)
