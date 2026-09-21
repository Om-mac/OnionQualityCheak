"""
Quick Setup and Training Script
================================

This script will:
1. Check all dependencies
2. Prepare the dataset
3. Train an improved model
4. Test the results
"""

import sys
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


def print_header(text):
    print("\n" + "="*70)
    print(f"  {text}")
    print("="*70 + "\n")


def check_dependencies():
    """Check if all required packages are installed"""
    print_header("CHECKING DEPENDENCIES")
    
    required = {
        'ultralytics': 'YOLOv8 framework',
        'opencv-python': 'Computer vision operations',
        'numpy': 'Numerical operations',
        'tqdm': 'Progress bars',
        'pyyaml': 'YAML configuration',
    }
    
    missing = []
    
    for package, description in required.items():
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package:20s} - {description}")
        except ImportError:
            print(f"❌ {package:20s} - {description} (MISSING)")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        print("\n📦 Install missing packages with:")
        print(f"   pip install {' '.join(missing)}")
        return False
    
    print("\n✅ All dependencies installed!")
    return True


def check_dataset():
    """Check if training data exists"""
    print_header("CHECKING DATASET")
    
    train_images = BASE_DIR / "train" / "images"
    valid_images = BASE_DIR / "valid" / "images"
    
    if not train_images.exists():
        print(f"❌ Training images not found at: {train_images}")
        print("\n💡 Solutions:")
        print("   1. Run prepare_enhanced_dataset.py to download from Roboflow")
        print("   2. Place your images in train/images/ folder")
        print("   3. See IMPROVED_MODEL_GUIDE.md for dataset options")
        return False
    
    train_count = len(list(train_images.glob("*.jpg"))) + len(list(train_images.glob("*.png")))
    valid_count = len(list(valid_images.glob("*.jpg"))) if valid_images.exists() else 0
    
    print(f"📊 Training images: {train_count}")
    print(f"📊 Validation images: {valid_count}")
    
    if train_count < 50:
        print(f"\n⚠️  Only {train_count} training images found")
        print("   Recommend at least 100-200 images for good results")
        print("   The script will generate synthetic unhealthy samples")
    else:
        print(f"\n✅ Good dataset size: {train_count} images")
    
    return True


def check_models():
    """Check if models directory exists"""
    models_dir = BASE_DIR / "models"
    models_dir.mkdir(exist_ok=True)
    print(f"✅ Models directory ready at: {models_dir}")


def run_training():
    """Run the improved training script"""
    print_header("STARTING TRAINING")
    
    train_script = BASE_DIR / "train_improved_model.py"
    
    if not train_script.exists():
        print(f"❌ Training script not found: {train_script}")
        return False
    
    print("🚀 Starting model training...")
    print("   This will take 30-60 minutes on CPU")
    print("   You can monitor progress in the console\n")
    
    try:
        # Run training script
        result = subprocess.run(
            [sys.executable, str(train_script)],
            cwd=str(BASE_DIR),
            check=True
        )
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Training failed with error: {e}")
        return False
    except KeyboardInterrupt:
        print("\n⚠️  Training interrupted by user")
        return False


def test_model():
    """Test the trained model"""
    print_header("TESTING MODEL")
    
    model_path = BASE_DIR / "models" / "onion_quality_best.pt"
    
    if not model_path.exists():
        print(f"❌ Trained model not found at: {model_path}")
        return False
    
    print(f"✅ Model found: {model_path}")
    print("   Running test detection...")
    
    try:
        # Import and test
        from defect_detection_local import detect_defects_with_sizing
        import cv2
        
        # Find a test image
        test_image = None
        for test_dir in [BASE_DIR / "test" / "images", BASE_DIR / "train" / "images"]:
            if test_dir.exists():
                test_images = list(test_dir.glob("*.jpg"))
                if test_images:
                    test_image = test_images[0]
                    break
        
        if test_image:
            print(f"   Testing on: {test_image.name}")
            results = detect_defects_with_sizing(str(test_image))
            
            # Save result
            output_path = BASE_DIR / "test_result_improved.jpg"
            cv2.imwrite(str(output_path), results["annotated_image"])
            
            print(f"\n✅ Test complete!")
            print(f"   Result saved to: {output_path}")
            print(f"   Detected: {results['total_detected']} onions")
            print(f"   Healthy: {results['severity_summary'].get('healthy', 0)}")
            print(f"   Defective: {results['statistics']['defective_count']}")
            return True
        else:
            print("⚠️  No test images found")
            return True  # Not a failure
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main setup and training flow"""
    print_header("ONION QUALITY DETECTION - SETUP & TRAINING")
    
    print("📋 This script will:")
    print("   1. Check dependencies")
    print("   2. Verify dataset")
    print("   3. Train improved model")
    print("   4. Test the results")
    print("\n⏱️  Total time: ~30-60 minutes")
    
    input("\nPress ENTER to continue (or Ctrl+C to cancel)...")
    
    # Step 1: Check dependencies
    if not check_dependencies():
        print("\n❌ Please install missing dependencies first")
        print("   Run: pip install ultralytics opencv-python numpy tqdm pyyaml")
        return
    
    # Step 2: Check dataset
    if not check_dataset():
        print("\n⚠️  Dataset not ready")
        print("\n💡 Quick Solutions:")
        print("   A. Use existing data: Place images in train/images/")
        print("   B. Download dataset: See IMPROVED_MODEL_GUIDE.md")
        print("   C. Continue anyway: Script will generate synthetic data")
        
        choice = input("\nContinue with synthetic data generation? (y/n): ")
        if choice.lower() != 'y':
            print("\n👋 Setup cancelled. See IMPROVED_MODEL_GUIDE.md for dataset options.")
            return
    
    # Step 3: Check models directory
    check_models()
    
    # Step 4: Run training
    print("\n" + "="*70)
    choice = input("Start training now? (y/n): ")
    if choice.lower() != 'y':
        print("\n👋 Setup complete. Run 'python train_improved_model.py' when ready.")
        return
    
    success = run_training()
    
    if not success:
        print("\n❌ Training failed. Check the error messages above.")
        return
    
    # Step 5: Test model
    test_model()
    
    # Final summary
    print_header("🎉 SETUP COMPLETE!")
    
    print("✅ Your improved model is ready!")
    print(f"   Location: {BASE_DIR / 'models' / 'onion_quality_best.pt'}")
    
    print("\n📝 Next Steps:")
    print("   1. Restart the API server: python defect_api.py")
    print("   2. Open the web app Live Camera page")
    print("   3. See GREEN boxes for healthy, RED for unhealthy onions")
    
    print("\n📚 Documentation:")
    print("   See IMPROVED_MODEL_GUIDE.md for more details")
    
    print("\n" + "="*70)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Setup cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
