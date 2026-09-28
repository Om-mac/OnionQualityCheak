@echo off
title OnionSure - Live Camera Quality Inspection
cd /d "%~dp0"

echo ============================================================
echo   OnionSure - Real-Time AI Camera Quality Inspection
echo ============================================================
echo   Starting trained models...
echo   Detector:   models/onion_detector_best.pt (80 epochs)
echo   Classifier: models/onion_multiclass_best.pt (5 classes)
echo.
echo   Controls:
echo     SPACE   - Capture snapshot + report
echo     + / -   - Increase/decrease sensitivity (detect ALL onions)
echo     C       - Switch camera device (0, 1, 2)
echo     S       - Toggle HUD stats
echo     Q / ESC - Exit
echo ============================================================
echo.

if not exist ".venv\Scripts\python.exe" (
    echo [!] Virtual environment not found. Running with system python...
    python live_camera_inspection.py
) else (
    .venv\Scripts\python.exe live_camera_inspection.py
)

pause
