@echo off
REM ============================================================
REM  OnionSure - Live Quality Inspection Launcher
REM ============================================================

cd /d "C:\Users\darak\Desktop\onion zip\onioncheck"

echo ============================================================
echo   OnionSure - Live Quality Inspection
echo ============================================================
echo.
echo   Select mode:
echo   [1] SMART AI Camera (Detect ALL Onions + 5-Class Quality: Healthy, Rotten, Damaged...) [RECOMMENDED]
echo   [2] Local YOLO (Onion detection only, high speed)
echo   [3] Roboflow Cloud API (Remote inference)
echo   [4] Seg + Cls Legacy Mode
echo.
set /p choice="Enter choice (1/2/3/4) [default: 1]: "

if "%choice%"=="1" (
    echo Starting SMART AI CAMERA (Detect ALL + 5-Class Quality)...
    .venv\Scripts\python live_camera_inspection.py
) else if "%choice%"=="2" (
    echo Starting LOCAL DETECTION mode...
    .venv\Scripts\python live_camera_inspection.py --mode local_detect
) else if "%choice%"=="3" (
    echo Starting ROBOFLOW Cloud mode...
    .venv\Scripts\python live_camera_inspection.py --mode roboflow
) else if "%choice%"=="4" (
    echo Starting LEGACY SEG+CLS mode...
    .venv\Scripts\python live_onion_quality.py
) else (
    echo Starting SMART AI CAMERA (Detect ALL + 5-Class Quality)...
    .venv\Scripts\python live_camera_inspection.py
)

pause
