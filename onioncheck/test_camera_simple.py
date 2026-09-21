"""Simple camera test with timeout"""
import cv2
import threading
import time

def test_open():
    """Try to open camera"""
    result = {"cap": None, "done": False}
    
    def _open():
        try:
            print("Opening camera...")
            cap = cv2.VideoCapture(0)
            if cap and cap.isOpened():
                ret, frame = cap.read()
                if ret:
                    print(f"SUCCESS! Frame size: {frame.shape}")
                    result["cap"] = cap
                else:
                    print("Camera opened but couldn't read frame")
                    cap.release()
            else:
                print("Camera could not be opened")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            result["done"] = True
    
    t = threading.Thread(target=_open, daemon=True)
    t.start()
    t.join(timeout=5.0)
    
    if not result["done"]:
        print("❌ TIMEOUT - Camera opening is hanging!")
        print("   Another app is likely using the camera")
        return None
    
    return result["cap"]

cap = test_open()
if cap:
    print("✅ Camera is working!")
    cap.release()
else:
    print("❌ Camera test failed")
