@echo off
cd /d "C:\Users\darak\Desktop\onion zip\onioncheck"

set "PY=C:\Users\darak\AppData\Local\Programs\Python\Python311\python.exe"

if not exist "%PY%" (
    echo ERROR: Python 3.11 not found at %PY%
    echo Install Python 3.11 or update the PY path above.
    exit /b 1
)

netstat -ano | findstr /R ":5000 " >nul 2>&1
if not errorlevel 1 (
    echo WARNING: Port 5000 is already in use.
    echo Another instance of defect_api.py is likely already running.
    echo Open http://localhost:5000 instead, or stop the other instance first.
    exit /b 1
)

echo Starting Defect Detection API with Python 3.11 ...
echo Access at: http://localhost:5000  - press Ctrl+C to stop
"%PY%" defect_api.py
