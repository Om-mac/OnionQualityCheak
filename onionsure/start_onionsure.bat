@echo off
cd /d "C:\Users\darak\Desktop\onion zip\onionsure"

set "NODE=node"

REM ---- YOLO AI Service (port 5000) ------------------------------------------
netstat -ano | findstr /R ":5000 " >nul 2>&1
if not errorlevel 1 (
    echo [skip] YOLO AI Service already running on :5000
) else (
    echo [start] YOLO AI Service on :5000 ...
    start "OnionSure YOLO AI :5000" /D "%CD%" cmd /c "python python\onion_flask_service.py"
)

REM ---- Backend API (port 4000) -------------------------------------------
netstat -ano | findstr /R ":4000 " >nul 2>&1
if not errorlevel 1 (
    echo [skip] Backend already running on :4000
) else (
    if not exist "server\node_modules" (
        echo ERROR: server\node_modules missing - run "npm install" in server\ first.
    ) else (
        echo [start] Backend API on :4000 ...
        start "OnionSure API :4000" /D "%CD%\server" cmd /c "node server.js"
    )
)

REM ---- Frontend (Vite dev, port 3000) -------------------------------------
if not exist "web\node_modules" (
    echo ERROR: web\node_modules missing - run "npm install" in web\ first.
    goto :done
)
netstat -ano | findstr /R ":3000 " >nul 2>&1
if not errorlevel 1 (
    echo [skip] Frontend already running on :3000
) else (
    echo [start] Frontend on :3000 ...
    start "OnionSure Web :3000" /D "%CD%\web" cmd /c "npm run dev"
)

:done
echo.
echo ============================================================
echo  OnionSure is up:
echo    Frontend : http://localhost:3000   (login page)
echo    Backend  : http://localhost:4000   (/api/health)
echo    YOLO AI  : http://localhost:5000   (/api/health)
echo.
echo  Demo logins (password: password123):
echo    officer1  - Procurement Officer  -> /quality/dashboard
echo    fpo1      - FPO Manager         -> /fpo/dashboard + /fpo/inspection
echo    farmer1   - Farmer              -> /farmer/dashboard
echo    buyer1    - Buyer               -> /buyer/dashboard
echo    admin     - Admin               -> /admin/dashboard
echo ============================================================
echo.
pause
