# OnionQualityCheak - Render Deployment Guide

## Quick Deploy Steps

### 1. Environment Variables (Required)

Add these in your Render Dashboard → Service → Environment:

#### Essential Variables (REQUIRED)
```
NODE_ENV=production
PORT=10000
USE_PYTHON=true
PYTHON_PORT=5000
ONIONCHECK_URL=http://127.0.0.1:5000
JWT_SECRET=[Click "Generate Value"]
JWT_EXPIRES_IN=2h
CORS_ORIGINS=https://onionsure.onrender.com,https://onionqualitycheak.onrender.com
```

#### AI/ML Configuration (Optional but Recommended)
```
ROBOFLOW_API_KEY=[Your API Key - keep secret]
ROBOFLOW_MODEL_ID=veg1-hcqsf-2/4
ROBOFLOW_API_URL=https://serverless.roboflow.com
```

#### Grading Thresholds (Optional - has defaults)
```
GRADE_A_THRESHOLD=85
URS_THRESHOLD=65
```

#### Fusion Weights (Optional - has defaults)
```
FUSION_WEIGHT_VISION=0.45
FUSION_WEIGHT_GAS=0.35
FUSION_WEIGHT_ENV=0.20
```

### 2. Service Settings

In Render Dashboard:

- **Name**: onionsure (or your choice)
- **Region**: Oregon (or closest to your users)
- **Branch**: main
- **Build Command**: (Auto from Dockerfile)
- **Health Check Path**: `/api/health`
- **Dockerfile Path**: `./Dockerfile`
- **Docker Context**: `.`
- **Auto-Deploy**: Yes

### 3. Post-Deployment Verification

Once deployed, test these endpoints:

```bash
# Health check - Should return {"status":"ok","mode":"python"}
curl https://your-app.onrender.com/api/health

# Main application - Should load the UI
curl https://your-app.onrender.com
```

**Important**: Check that `"mode":"python"` (not `"mode":"js"`) in health response!

### 4. Default Login Credentials

All passwords: `password123`

- **officer1** - Procurement Officer (Full access)
- **fpo1** - FPO Manager
- **farmer1** - Farmer
- **buyer1** - Buyer
- **admin** - Administrator

### 5. Common Issues

#### Issue: Service shows "mode":"js" instead of "python"
**Solution**: Add `USE_PYTHON=true` to environment variables and redeploy

#### Issue: Build timeout on Free plan
**Solution**: Upgrade to Starter plan ($7/month) or use pre-built images

#### Issue: CORS errors in browser
**Solution**: Update `CORS_ORIGINS` to include your actual Render URL

#### Issue: AI features not working
**Solution**: 
1. Verify `USE_PYTHON=true` is set
2. Check Python service starts (view logs)
3. Ensure YOLO models are loading correctly

### 6. Build Optimization

The Dockerfile uses multi-stage builds:
- **Stage 1**: Builds frontend (Node 18 Alpine)
- **Stage 2**: Runtime with Python 3.11 + Node.js + all dependencies

Build time: ~5-8 minutes on Free plan

### 7. Monitoring

Check these in Render Dashboard:
- **Logs**: Real-time application logs
- **Metrics**: CPU, Memory usage
- **Events**: Deployments, health checks

### 8. Scaling

Free plan limitations:
- Spins down after 15 min inactivity
- 750 hours/month free
- Limited resources

For production use:
- Upgrade to **Starter** ($7/month minimum)
- Enables persistent instances
- Better resources for AI/ML workloads

### 9. Architecture

```
[Browser] → [Render] → [Node.js Express :10000]
                              ↓
                        [Python Flask :5000]
                              ↓
                        [YOLO Models + OpenCV]
```

### 10. Support

- Render Docs: https://render.com/docs
- GitHub Issues: https://github.com/Om-mac/OnionQualityCheak/issues

---

**Last Updated**: October 2026
**Render Version**: Latest
**Docker**: Multi-stage build optimized
