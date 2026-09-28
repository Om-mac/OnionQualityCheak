"""
Quick Camera Test Script
========================
Tests if camera is available and displays preview.

Usage:
    python test_camera.py
"""

import cv2
import sys

def test_camera(camera_index=0):
    """Test if camera is working."""
    
    print(f"\n{'='*60}")
    print(f"Testing Camera {camera_index}")
    print('='*60)
    
    # Try to open camera
    cap = cv2.VideoCapture(camera_index)
    
    if not cap.isOpened():
        print(f"[X] ERROR: Cannot open camera {camera_index}")
        print("\nTroubleshooting:")
        print("1. Check if camera is connected")
        print("2. Close other apps using camera (Zoom, Teams, etc.)")
        print("3. Try different camera index (0, 1, 2)")
        print("4. Check camera permissions in Windows Settings")
        return False
    
    # Get camera properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    
    print(f"[OK] Camera {camera_index} opened successfully!")
    print(f"  Resolution: {width}x{height}")
    print(f"  FPS: {fps}")
    print("\nPress 'Q' to quit preview...")
    print('='*60 + '\n')
    
    # Show live preview
    frame_count = 0
    try:
        while True:
            ret, frame = cap.read()
            
            if not ret:
                print("Failed to read frame")
                break
            
            frame_count += 1
            
            # Add frame counter
            cv2.putText(
                frame, f"Frame: {frame_count}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                1, (0, 255, 0), 2
            )
            
            # Add instructions
            cv2.putText(
                frame, "Press 'Q' to quit",
                (10, height - 20),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7, (255, 255, 255), 2
            )
            
            # Display
            cv2.imshow(f"Camera {camera_index} Test", frame)
            
            # Check for 'Q' key
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    
    except KeyboardInterrupt:
        print("\nInterrupted by user")
    
    finally:
        cap.release()
        cv2.destroyAllWindows()
    
    print(f"\n[OK] Camera test completed. Processed {frame_count} frames.\n")
    return True


if __name__ == "__main__":
    # Test default camera (0)
    success = test_camera(0)
    
    if not success:
        # Try camera 1 if 0 failed
        print("\nTrying camera index 1...")
        test_camera(1)
