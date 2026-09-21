@echo off
echo ================================================================
echo   ONION QUALITY DETECTION - IMPROVED MODEL TRAINING
echo ================================================================
echo.
echo This will train a model to detect:
echo   - Healthy onions (GREEN boxes)
echo   - Unhealthy onions (RED boxes)
echo.
echo Estimated time: 30-60 minutes on CPU
echo.
echo ================================================================
echo.
pause

python setup_and_train.py

echo.
echo ================================================================
echo.
pause
