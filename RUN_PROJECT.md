# 🚀 OnionSure - Quick Start Guide

## Prerequisites
- Node.js installed
- Python 3.x installed
- All dependencies installed

## Run All Services

### 1. Frontend (Port 3000)
```powershell
cd "c:\Users\darak\Desktop\onion zip\onionsure\web"
npm run dev
```
**Access:** http://localhost:3000

### 2. Backend API (Port 4000)
```powershell
cd "c:\Users\darak\Desktop\onion zip\onionsure\server"
node server.js
```
**Access:** http://localhost:4000

### 3. AI Service (Port 5000)
```powershell
cd "c:\Users\darak\Desktop\onion zip\onionsure\python"
python onion_flask_service.py
```
**Access:** http://localhost:5000

## Login Credentials

**All passwords:** `password123`

- **officer1** - Procurement Officer (Full access)
- **fpo1** - FPO Manager
- **farmer1** - Farmer
- **buyer1** - Buyer
- **admin** - Administrator

## Quick Health Check

```powershell
# Check all services
Invoke-WebRequest http://localhost:3000
Invoke-WebRequest http://localhost:4000/api/health
Invoke-WebRequest http://localhost:5000/api/health
```

## Stop Services

Press `Ctrl+C` in each terminal window.

## Troubleshooting

**Port Already in Use:**
```powershell
# Find process on port
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

# Kill process by PID
Stop-Process -Id <PID> -Force
```

**Services Not Starting:**
- Check if dependencies are installed
- Verify ports are available
- Check error messages in terminal

---

**That's it!** Open http://localhost:3000 and login with `officer1` / `password123`
