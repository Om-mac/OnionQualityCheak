@echo off
REM ============================================================
REM  OnionSure - Start Flask API Server (Camera + Video Analysis)
REM  Run this script to start the backend on http://localhost:5000
REM ============================================================
cd /d "C:\Users\darak\Desktop\onion zip\onioncheck"
echo Starting OnionSure Flask API Server...
echo Access at: http://localhost:5000
"C:\Users\darak\AppData\Local\Programs\Python\Python311\python.exe" -u defect_api.py
pause
