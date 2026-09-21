@echo off
cd /d "C:\Users\darak\Desktop\onion zip\onioncheck"

set "PY=C:\Users\darak\AppData\Local\Programs\Python\Python311\python.exe"

if not exist "%PY%" (
    echo ERROR: Python 3.11 not found at %PY%
    echo Install Python 3.11 or update the PY path above.
    pause
    exit /b 1
)

REM --- Block if either service port is already taken --------------------
netstat -ano | findstr /R ":5000 " >nul 2>&1
if not errorlevel 1 (
    echo WARNING: Port 5000 already in use (API likely running).
    echo Stop the existing instance first, then re-run this.
    pause
    exit /b 1
)
netstat -ano | findstr /R ":8502 " >nul 2>&1
if not errorlevel 1 (
    echo WARNING: Port 8502 already in use (Dashboard likely running).
    echo Stop the existing instance first, then re-run this.
    pause
    exit /b 1
)

echo Starting ALL services with Python 3.11 ...
echo   - Backend API   -^> http://localhost:5000   (opens new window)
echo   - Frontend Dash -^> http://localhost:8502   (opens new window)
echo.

start "Defect API :5000" "%PY%" defect_api.py
start "Defect Dash :8502" "%PY%" -m streamlit run defect_detection_app.py --server.port 8502 --server.address 0.0.0.0

echo Done. Two windows opened. Close them to stop the services.
echo If a window shows a port error, that service was already running.
