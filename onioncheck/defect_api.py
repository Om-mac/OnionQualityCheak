"""
Flask REST API for Defect Detection System
===========================================

Provides HTTP endpoints for:
- Defect detection on uploaded images
- Size calibration
- Batch processing
- Report generation

Usage:
    python defect_api.py
    
Access at: http://localhost:5000
"""

import os
import io
import tempfile
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import cv2
import numpy as np

from defect_detection import (
    detect_defects_with_sizing,
    calibrate_size_detection,
    DEFECT_CLASSES,
    SIZE_CATEGORIES
)


# ==========================================================================
# APPLICATION SETUP
# ==========================================================================

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure upload folder
UPLOAD_FOLDER = Path(__file__).parent / "temp_uploads"
UPLOAD_FOLDER.mkdir(exist_ok=True)

app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}


# ==========================================================================
# HELPER FUNCTIONS
# ==========================================================================

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def cleanup_temp_file(filepath: str):
    """Remove temporary file"""
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        print(f"Warning: Could not delete temp file {filepath}: {e}")


def save_upload(file) -> str:
    """Save uploaded file and return path"""
    if not file or not allowed_file(file.filename):
        raise ValueError("Invalid file or file type")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"upload_{timestamp}.jpg"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    file.save(filepath)
    return filepath


# ==========================================================================
# API ENDPOINTS
# ==========================================================================

@app.route('/')
def index():
    """API information endpoint"""
    return jsonify({
        "name": "Onion Defect Detection API",
        "version": "2.0",
        "endpoints": {
            "POST /api/detect": "Run defect detection on image",
            "POST /api/calibrate": "Calibrate size detection",
            "POST /api/batch": "Process multiple images",
            "GET /api/info": "Get system information",
            "GET /api/classes": "List defect classes",
            "GET /health": "Health check"
        },
        "status": "operational"
    })


@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy"}), 200


@app.route('/api/info')
def api_info():
    """Get system information"""
    return jsonify({
        "model": {
            "type": "YOLO",
            "provider": "Roboflow",
            "model_id": "veg1-hcqsf-2/4"
        },
        "features": {
            "defect_detection": True,
            "size_estimation": True,
            "severity_classification": True,
            "batch_processing": True,
            "calibration": True
        },
        "supported_formats": list(ALLOWED_EXTENSIONS),
        "max_file_size_mb": 16
    })


@app.route('/api/classes')
def get_classes():
    """Get list of defect classes"""
    return jsonify({
        "defect_classes": DEFECT_CLASSES,
        "size_categories": SIZE_CATEGORIES
    })


@app.route('/api/detect', methods=['POST'])
def detect_defects():
    """
    Run defect detection on uploaded image
    
    Request:
        - image: File (required)
        - pixels_per_cm: Float (optional, default 20.0)
        - confidence_threshold: Float (optional, default 0.4)
        - return_image: Bool (optional, default false)
    
    Response:
        JSON with detection results
    """
    
    # Validate request
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    image_file = request.files['image']
    
    if image_file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
    
    # Get parameters
    pixels_per_cm = float(request.form.get('pixels_per_cm', 20.0))
    confidence_threshold = float(request.form.get('confidence_threshold', 0.4))
    return_image = request.form.get('return_image', 'false').lower() == 'true'
    
    # Validate parameters
    if not (1.0 <= pixels_per_cm <= 100.0):
        return jsonify({"error": "pixels_per_cm must be between 1.0 and 100.0"}), 400
    
    if not (0.1 <= confidence_threshold <= 1.0):
        return jsonify({"error": "confidence_threshold must be between 0.1 and 1.0"}), 400
    
    filepath = None
    
    try:
        # Save uploaded file
        filepath = save_upload(image_file)
        
        # Run detection
        results = detect_defects_with_sizing(
            filepath,
            pixels_per_cm=pixels_per_cm,
            confidence_threshold=confidence_threshold
        )

        # Source image dimensions — lets downstream clients convert pixel
        # bounding boxes into percentage overlays.
        _img = cv2.imread(filepath)
        image_dimensions = {}
        if _img is not None:
            image_dimensions = {"width": _img.shape[1], "height": _img.shape[0]}
        
        # Prepare response
        response_data = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "total_detected": results["total_detected"],
            "defect_summary": results["defect_summary"],
            "severity_summary": results["severity_summary"],
            "statistics": results["statistics"],
            "detections": results["detections"],
            "calibration": results["calibration"],
            "image_dimensions": image_dimensions
        }
        
        # Optionally include base64 encoded image
        if return_image:
            _, buffer = cv2.imencode('.jpg', results["annotated_image"])
            import base64
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            response_data["annotated_image_base64"] = img_base64
        
        return jsonify(response_data), 200
    
    except ValueError as e:
        return jsonify({"error": f"Validation error: {str(e)}"}), 400
    
    except Exception as e:
        return jsonify({"error": f"Detection failed: {str(e)}"}), 500
    
    finally:
        if filepath:
            cleanup_temp_file(filepath)


@app.route('/api/calibrate', methods=['POST'])
def calibrate():
    """
    Calibrate size detection using reference onion
    
    Request:
        - image: File (required)
        - known_diameter_cm: Float (required)
    
    Response:
        JSON with calibrated pixels_per_cm ratio
    """
    
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    image_file = request.files['image']
    
    if 'known_diameter_cm' not in request.form:
        return jsonify({"error": "known_diameter_cm parameter required"}), 400
    
    try:
        known_diameter = float(request.form['known_diameter_cm'])
    except ValueError:
        return jsonify({"error": "known_diameter_cm must be a number"}), 400
    
    if not (1.0 <= known_diameter <= 20.0):
        return jsonify({"error": "known_diameter_cm must be between 1.0 and 20.0 cm"}), 400
    
    filepath = None
    
    try:
        filepath = save_upload(image_file)
        
        pixels_per_cm = calibrate_size_detection(
            filepath,
            known_diameter
        )
        
        return jsonify({
            "success": True,
            "pixels_per_cm": pixels_per_cm,
            "known_diameter_cm": known_diameter,
            "message": "Calibration successful"
        }), 200
    
    except Exception as e:
        return jsonify({"error": f"Calibration failed: {str(e)}"}), 500
    
    finally:
        if filepath:
            cleanup_temp_file(filepath)


@app.route('/api/batch', methods=['POST'])
def batch_process():
    """
    Process multiple images in batch
    
    Request:
        - images: Multiple file uploads
        - pixels_per_cm: Float (optional, default 20.0)
        - confidence_threshold: Float (optional, default 0.4)
    
    Response:
        JSON array with results for each image
    """
    
    if 'images' not in request.files:
        return jsonify({"error": "No images provided"}), 400
    
    files = request.files.getlist('images')
    
    if len(files) == 0:
        return jsonify({"error": "No images in request"}), 400
    
    if len(files) > 50:
        return jsonify({"error": "Maximum 50 images per batch"}), 400
    
    pixels_per_cm = float(request.form.get('pixels_per_cm', 20.0))
    confidence_threshold = float(request.form.get('confidence_threshold', 0.4))
    
    batch_results = []
    processed_files = []
    
    try:
        for idx, file in enumerate(files):
            
            if not allowed_file(file.filename):
                batch_results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": "Invalid file type"
                })
                continue
            
            filepath = None
            
            try:
                filepath = save_upload(file)
                processed_files.append(filepath)
                
                results = detect_defects_with_sizing(
                    filepath,
                    pixels_per_cm=pixels_per_cm,
                    confidence_threshold=confidence_threshold
                )
                
                batch_results.append({
                    "filename": file.filename,
                    "success": True,
                    "total_detected": results["total_detected"],
                    "statistics": results["statistics"],
                    "severity_summary": results["severity_summary"]
                })
            
            except Exception as e:
                batch_results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": str(e)
                })
        
        # Calculate aggregate statistics
        successful_results = [r for r in batch_results if r.get("success")]
        
        aggregate_stats = {
            "total_images": len(files),
            "successful": len(successful_results),
            "failed": len(files) - len(successful_results),
            "total_onions_detected": sum(
                r.get("total_detected", 0) for r in successful_results
            ),
            "average_defect_rate": np.mean([
                r["statistics"]["defect_rate"] 
                for r in successful_results
            ]) if successful_results else 0
        }
        
        return jsonify({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "aggregate_statistics": aggregate_stats,
            "results": batch_results
        }), 200
    
    except Exception as e:
        return jsonify({"error": f"Batch processing failed: {str(e)}"}), 500
    
    finally:
        # Cleanup all temporary files
        for filepath in processed_files:
            cleanup_temp_file(filepath)


@app.route('/api/detect-annotated', methods=['POST'])
def detect_with_image():
    """
    Run detection and return annotated image file
    
    Request:
        - image: File (required)
        - pixels_per_cm: Float (optional, default 20.0)
        - confidence_threshold: Float (optional, default 0.4)
    
    Response:
        Image file (JPEG) with bounding boxes and labels
    """
    
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    image_file = request.files['image']
    pixels_per_cm = float(request.form.get('pixels_per_cm', 20.0))
    confidence_threshold = float(request.form.get('confidence_threshold', 0.4))
    
    filepath = None
    output_path = None
    
    try:
        filepath = save_upload(image_file)
        
        results = detect_defects_with_sizing(
            filepath,
            pixels_per_cm=pixels_per_cm,
            confidence_threshold=confidence_threshold
        )
        
        # Save annotated image
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(
            app.config['UPLOAD_FOLDER'],
            f"annotated_{timestamp}.jpg"
        )
        
        cv2.imwrite(output_path, results["annotated_image"])
        
        return send_file(
            output_path,
            mimetype='image/jpeg',
            as_attachment=True,
            download_name='defect_detection_result.jpg'
        )
    
    except Exception as e:
        return jsonify({"error": f"Detection failed: {str(e)}"}), 500
    
    finally:
        if filepath:
            cleanup_temp_file(filepath)
        if output_path:
            # Schedule cleanup after response is sent
            @app.after_request
            def cleanup(response):
                cleanup_temp_file(output_path)
                return response


# ==========================================================================
# ERROR HANDLERS
# ==========================================================================

@app.errorhandler(413)
def file_too_large(e):
    return jsonify({"error": "File too large. Maximum size is 16MB"}), 413


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error"}), 500


# ==========================================================================
# LIVE CAMERA  — open-on-demand, close-on-stop
# ==========================================================================
#
# Design:
#   • Camera is opened ONLY when the frontend calls /api/camera/start
#     (or the first /api/camera/frame after a start).
#   • Camera is RELEASED immediately when the frontend calls
#     POST /api/camera/stop — the physical LED goes off.
#   • A background thread grabs frames at ~30 FPS so each HTTP request
#     just copies the latest frame (no per-request open/close latency).
#   • YOLO/Roboflow detection is OPTIONAL per frame request.
#     The frontend skips it on most frames (plain video) and runs it
#     only on a slower schedule to avoid the Roboflow network timeout.
# ==========================================================================

import threading
import time as _time
import tempfile
import base64 as _b64

_cam_lock   = threading.Lock()   # protects _cap and _latest_frame
_cam_thread = None               # background grab thread
_cap        = None               # cv2.VideoCapture instance (None = closed)
_latest_frame = None             # most recent raw numpy frame
_cam_running  = False            # grab-loop sentinel


def _grab_loop():
    """Background thread: drain camera buffer continuously at ~30 FPS."""
    global _cap, _latest_frame, _cam_running
    while _cam_running:
        with _cam_lock:
            if _cap and _cap.isOpened():
                ret, frame = _cap.read()
                if ret and frame is not None:
                    _latest_frame = frame
                else:
                    # Camera disconnected mid-stream
                    _cam_running = False
        _time.sleep(0.033)


def _open_camera():
    """
    Open camera index 0 (or 1 as fallback), start grab thread.
    Returns True on success.  Must be called with NO lock held.
    """
    global _cap, _latest_frame, _cam_running, _cam_thread
    with _cam_lock:
        if _cap is not None:
            return True   # already open

    # Try index 0 then 1
    for idx in (0, 1):
        cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap.release()
            continue
        cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS,           30)
        cap.set(cv2.CAP_PROP_BUFFERSIZE,     1)
        # Confirm we can read at least one frame
        ok, frame = cap.read()
        if not ok or frame is None:
            cap.release()
            continue
        # Success
        with _cam_lock:
            _cap          = cap
            _latest_frame = frame
            _cam_running  = True
        _cam_thread = threading.Thread(target=_grab_loop, daemon=True)
        _cam_thread.start()
        return True

    return False   # no camera found


def _close_camera():
    """
    Stop grab thread and release camera.  Camera LED goes off.
    Safe to call even if camera is already closed.
    """
    global _cap, _latest_frame, _cam_running
    _cam_running = False          # signal loop to exit
    _time.sleep(0.06)             # let the loop finish its current iteration
    with _cam_lock:
        if _cap is not None:
            try:
                _cap.release()
            except Exception:
                pass
            _cap = None
        _latest_frame = None
    print("[camera] Released — LED should be off now.")


def _get_frame():
    """Return a copy of the latest captured frame, or None."""
    with _cam_lock:
        if _latest_frame is not None:
            return _latest_frame.copy()
    return None


def _camera_open():
    """True if the camera is currently open."""
    with _cam_lock:
        return _cap is not None and _cap.isOpened()


# --------------------------------------------------------------------------

@app.route('/api/camera/start', methods=['POST'])
def camera_start():
    """
    Open the physical camera and start the background grab thread.
    Must be called before requesting frames.
    """
    try:
        if _camera_open():
            info = _cam_info()
            return jsonify({
                "success": True,
                "message": "Camera already open",
                "resolution": f"{info['width']}x{info['height']}",
                "fps": info["fps"]
            }), 200

        opened = _open_camera()
        if opened:
            info = _cam_info()
            return jsonify({
                "success":    True,
                "message":    "Camera opened successfully",
                "resolution": f"{info['width']}x{info['height']}",
                "fps":        info["fps"]
            }), 200
        else:
            return jsonify({
                "success": False,
                "message": "No camera found. Connect a USB / built-in camera and try again."
            }), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/camera/stop', methods=['POST'])
def camera_stop():
    """
    Release the camera and stop the grab thread.
    The physical camera LED turns off after this call.
    """
    try:
        _close_camera()
        return jsonify({"success": True, "message": "Camera released"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


def _cam_info():
    with _cam_lock:
        if _cap and _cap.isOpened():
            return {
                "width":  int(_cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                "height": int(_cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
                "fps":    int(_cap.get(cv2.CAP_PROP_FPS)) or 30,
            }
    return {"width": 640, "height": 480, "fps": 30}


@app.route('/api/camera/status', methods=['GET'])
def camera_status():
    """
    Report whether the camera is currently open + basic info.
    Does NOT open or close the camera.
    """
    try:
        open_ = _camera_open()
        if open_:
            info = _cam_info()
            return jsonify({
                "available":  True,
                "open":       True,
                "resolution": f"{info['width']}x{info['height']}",
                "fps":        info["fps"],
                "message":    "Camera is open and streaming"
            }), 200
        else:
            # Probe whether a camera exists without opening it permanently
            probe = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            exists = probe.isOpened()
            probe.release()
            return jsonify({
                "available": exists,
                "open":      False,
                "message":   "Camera available — call /api/camera/start to open it"
                             if exists else
                             "No camera detected. Connect a camera and refresh."
            }), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({
            "available": False, "open": False,
            "error": str(e), "message": "Camera check failed"
        }), 200


@app.route('/api/camera/frame', methods=['GET'])
def get_camera_frame():
    """
    Return one JPEG frame from the open camera.

    Query params:
        detect = true | false   (default false)
                 When true, runs Roboflow YOLO on the frame — adds ~2-5 s.
                 The frontend should call this sparingly (e.g. every 5 s)
                 and stream plain frames in between.
        format = image | json   (default image)
    """
    if not _camera_open():
        return jsonify({
            "error":   "Camera is not open. Call POST /api/camera/start first.",
            "success": False
        }), 503

    run_detection   = request.args.get('detect', 'false').lower() == 'true'
    response_format = request.args.get('format',  'image')

    frame = _get_frame()
    if frame is None:
        return jsonify({"error": "No frame captured yet — retry in a moment.", "success": False}), 503

    detections = []
    statistics = {}
    tmp_path   = None

    try:
        if run_detection:
            fd, tmp_path = tempfile.mkstemp(suffix='.jpg')
            os.close(fd)
            cv2.imwrite(tmp_path, frame)
            result     = detect_defects_with_sizing(tmp_path, confidence_threshold=0.4)
            frame      = result["annotated_image"]
            detections = result.get("detections", [])
            statistics = result.get("statistics",  {})

        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 82])
        if not ret:
            return jsonify({"error": "Frame encode failed", "success": False}), 500

        if response_format == 'json':
            img_b64 = _b64.b64encode(buffer).decode('utf-8')
            return jsonify({
                "success":    True,
                "image":      f"data:image/jpeg;base64,{img_b64}",
                "detections": detections,
                "statistics": statistics,
                "timestamp":  datetime.now().isoformat()
            }), 200

        return send_file(
            io.BytesIO(buffer.tobytes()),
            mimetype='image/jpeg',
            as_attachment=False
        )

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e), "success": False}), 500

    finally:
        if tmp_path:
            cleanup_temp_file(tmp_path)


@app.route('/api/detect-base64', methods=['POST'])
def detect_base64():
    """
    Run defect detection on base64 encoded image (for live camera)
    
    Request JSON:
        - image: String (base64 encoded image, required)
        - pixels_per_cm: Float (optional, default 20.0)
        - confidence_threshold: Float (optional, default 0.4)
    
    Response:
        JSON with detection results
    """
    import base64
    
    # Get JSON data
    data = request.get_json()
    
    if not data or 'image' not in data:
        return jsonify({"error": "No image data provided"}), 400
    
    base64_image = data['image']
    
    # Remove data URL prefix if present
    if ',' in base64_image:
        base64_image = base64_image.split(',')[1]
    
    # Get parameters
    pixels_per_cm = float(data.get('pixels_per_cm', 20.0))
    confidence_threshold = float(data.get('confidence_threshold', 0.4))
    
    # Validate parameters
    if not (1.0 <= pixels_per_cm <= 100.0):
        return jsonify({"error": "pixels_per_cm must be between 1.0 and 100.0"}), 400
    
    if not (0.1 <= confidence_threshold <= 1.0):
        return jsonify({"error": "confidence_threshold must be between 0.1 and 1.0"}), 400
    
    filepath = None
    
    try:
        # Decode base64 image
        image_data = base64.b64decode(base64_image)
        
        # Save to temp file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"upload_base64_{timestamp}.jpg"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        with open(filepath, 'wb') as f:
            f.write(image_data)
        
        # Run detection
        results = detect_defects_with_sizing(
            filepath,
            pixels_per_cm=pixels_per_cm,
            confidence_threshold=confidence_threshold
        )
        
        # Get image dimensions
        _img = cv2.imread(filepath)
        image_dimensions = {}
        if _img is not None:
            image_dimensions = {"width": _img.shape[1], "height": _img.shape[0]}
        
        # Prepare response
        response_data = {
            "success": True,
            "source": "onioncheck",
            "timestamp": datetime.now().isoformat(),
            "total_detected": results["total_detected"],
            "defect_summary": results["defect_summary"],
            "severity_summary": results["severity_summary"],
            "statistics": results["statistics"],
            "detections": results["detections"],
            "calibration": results["calibration"],
            "image_dimensions": image_dimensions
        }
        
        return jsonify(response_data), 200
    
    except ValueError as e:
        return jsonify({"error": f"Validation error: {str(e)}"}), 400
    
    except Exception as e:
        return jsonify({"error": f"Detection failed: {str(e)}"}), 500
    
    finally:
        if filepath:
            cleanup_temp_file(filepath)


# ==========================================================================
# MAIN
# ==========================================================================

if __name__ == '__main__':
    print("\n" + "="*60)
    print("Defect Detection API Server")
    print("="*60)
    print("\nEndpoints:")
    print("  POST /api/detect              - Run defect detection")
    print("  POST /api/calibrate           - Calibrate size estimation")
    print("  POST /api/batch               - Batch processing")
    print("  POST /api/detect-annotated    - Get annotated image")
    print("  POST /api/camera/start        - Open camera (LED on)")
    print("  POST /api/camera/stop         - Release camera (LED off)")
    print("  GET  /api/camera/status       - Check camera availability")
    print("  GET  /api/camera/frame        - Get single camera frame")
    print("  GET  /api/info                - System information")
    print("  GET  /api/classes             - List defect classes")
    print("  GET  /health                  - Health check")
    print("\nStarting server on http://0.0.0.0:5000")
    print("="*60 + "\n")
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )


@app.route('/api/detect-base64', methods=['POST'])
def detect_base64():
    """
    Run defect detection on base64 encoded image (for live camera)
    
    Request JSON:
        - image: String (base64 encoded image, required)
        - pixels_per_cm: Float (optional, default 20.0)
        - confidence_threshold: Float (optional, default 0.4)
    
    Response:
        JSON with detection results
    """
    import base64
    
    # Get JSON data
    data = request.get_json()
    
    if not data or 'image' not in data:
        return jsonify({"error": "No image data provided"}), 400
    
    base64_image = data['image']
    
    # Remove data URL prefix if present
    if ',' in base64_image:
        base64_image = base64_image.split(',')[1]
    
    # Get parameters
    pixels_per_cm = float(data.get('pixels_per_cm', 20.0))
    confidence_threshold = float(data.get('confidence_threshold', 0.4))
    
    # Validate parameters
    if not (1.0 <= pixels_per_cm <= 100.0):
        return jsonify({"error": "pixels_per_cm must be between 1.0 and 100.0"}), 400
    
    if not (0.1 <= confidence_threshold <= 1.0):
        return jsonify({"error": "confidence_threshold must be between 0.1 and 1.0"}), 400
    
    filepath = None
    
    try:
        # Decode base64 image
        image_data = base64.b64decode(base64_image)
        
        # Save to temp file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"upload_base64_{timestamp}.jpg"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        with open(filepath, 'wb') as f:
            f.write(image_data)
        
        # Run detection
        results = detect_defects_with_sizing(
            filepath,
            pixels_per_cm=pixels_per_cm,
            confidence_threshold=confidence_threshold
        )
        
        # Get image dimensions
        _img = cv2.imread(filepath)
        image_dimensions = {}
        if _img is not None:
            image_dimensions = {"width": _img.shape[1], "height": _img.shape[0]}
        
        # Prepare response
        response_data = {
            "success": True,
            "source": "onioncheck",
            "timestamp": datetime.now().isoformat(),
            "total_detected": results["total_detected"],
            "defect_summary": results["defect_summary"],
            "severity_summary": results["severity_summary"],
            "statistics": results["statistics"],
            "detections": results["detections"],
            "calibration": results["calibration"],
            "image_dimensions": image_dimensions
        }
        
        return jsonify(response_data), 200
    
    except ValueError as e:
        return jsonify({"error": f"Validation error: {str(e)}"}), 400
    
    except Exception as e:
        return jsonify({"error": f"Detection failed: {str(e)}"}), 500
    
    finally:
        if filepath:
            cleanup_temp_file(filepath)
