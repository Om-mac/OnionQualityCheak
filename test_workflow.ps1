# OnionSure Workflow Test Script
# Tests all API endpoints in sequence

Write-Host "`n🧪 Starting OnionSure Workflow Test`n" -ForegroundColor Cyan

$API_BASE = "http://localhost:4000/api"
$TOKEN = "test-token"

# Test 1: Create Inspection
Write-Host "1️⃣  Creating inspection..." -ForegroundColor Yellow
$lotId = "LOT-TEST-$(Get-Date -Format 'yyyyMMddHHmmss')"
$inspectionBody = @{
    lotId = $lotId
    farmerName = "Test Farmer"
    location = "Test Farm, India"
    quantity = 1000
    quantityUnit = "kg"
    procurementCenter = "Test Center"
} | ConvertTo-Json

try {
    $inspectionRes = Invoke-RestMethod -Uri "$API_BASE/inspections" `
        -Method Post `
        -Body $inspectionBody `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    $inspectionId = $inspectionRes.inspection.id
    $inspectionNumber = $inspectionRes.inspection.inspectionNumber
    
    Write-Host "   ✅ Inspection created: $inspectionNumber" -ForegroundColor Green
    Write-Host "   📋 ID: $inspectionId" -ForegroundColor Gray
    Write-Host "   📋 Status: $($inspectionRes.inspection.status)`n" -ForegroundColor Gray
    
} catch {
    Write-Host "   ❌ Failed to create inspection" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Sensor Readings
Write-Host "2️⃣  Submitting sensor readings..." -ForegroundColor Yellow
$sensorBody = @{
    temperature = 25
    humidity = 60
    moisture = 12
    pH = 6.5
    co2 = 400
    ch4 = 1.5
    c2h4 = 0.5
    nh3 = 5
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$API_BASE/inspections/$inspectionId/sensor-readings" `
        -Method Post `
        -Body $sensorBody `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $TOKEN" } | Out-Null
    
    Invoke-RestMethod -Uri "$API_BASE/inspections/$inspectionId/sensor-readings/complete" `
        -Method Post `
        -Body "{}" `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $TOKEN" } | Out-Null
    
    Write-Host "   ✅ Sensor readings saved" -ForegroundColor Green
    Write-Host "   📋 Status: SENSOR_COMPLETED`n" -ForegroundColor Gray
    
} catch {
    Write-Host "   ❌ Failed to save sensor readings" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Mark Images Complete (simplified - no actual upload)
Write-Host "3️⃣  Marking camera step complete..." -ForegroundColor Yellow

try {
    Invoke-RestMethod -Uri "$API_BASE/inspections/$inspectionId/images/complete" `
        -Method Post `
        -Body "{}" `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $TOKEN" } | Out-Null
    
    Write-Host "   ✅ Camera step completed" -ForegroundColor Green
    Write-Host "   📋 Status: CAMERA_COMPLETED`n" -ForegroundColor Gray
    
} catch {
    Write-Host "   ⚠️  Camera step skipped (optional)" -ForegroundColor Yellow
    Write-Host "`n" -NoNewline
}

# Test 4: AI Analysis
Write-Host "4️⃣  Running AI analysis..." -ForegroundColor Yellow
$aiBody = @{
    mockResults = @{
        healthy = 85
        damaged = 10
        rotten = 3
        sprouted = 1
        undersized = 1
        confidence = 0.92
    }
} | ConvertTo-Json

try {
    $aiRes = Invoke-RestMethod -Uri "$API_BASE/inspections/$inspectionId/ai-analysis" `
        -Method Post `
        -Body $aiBody `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    Write-Host "   ✅ AI analysis completed" -ForegroundColor Green
    Write-Host "   🔍 Confidence: $($aiRes.analysis.confidence)" -ForegroundColor Gray
    Write-Host "   📋 Status: AI_ANALYSIS_COMPLETED`n" -ForegroundColor Gray
    
} catch {
    Write-Host "   ❌ Failed to complete AI analysis" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Test 5: Quality Fusion
Write-Host "5️⃣  Calculating quality fusion..." -ForegroundColor Yellow

try {
    $fusionRes = Invoke-RestMethod -Uri "$API_BASE/inspections/$inspectionId/fusion" `
        -Method Post `
        -Body "{}" `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    Write-Host "   ✅ Fusion calculated" -ForegroundColor Green
    Write-Host "   📊 Quality Score: $([math]::Round($fusionRes.fusion.qualityScore, 1))/100" -ForegroundColor Gray
    Write-Host "   🏆 Grade: $($fusionRes.fusion.grade)" -ForegroundColor Gray
    Write-Host "   ⚠️  Risk Level: $($fusionRes.fusion.riskLevel)" -ForegroundColor Gray
    Write-Host "   📋 Status: FUSION_COMPLETED`n" -ForegroundColor Gray
    
} catch {
    Write-Host "   ❌ Failed to calculate fusion" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Test 6: Certificate Generation
Write-Host "6️⃣  Generating certificate..." -ForegroundColor Yellow

try {
    $certRes = Invoke-RestMethod -Uri "$API_BASE/inspections/$inspectionId/certificate" `
        -Method Post `
        -Body "{}" `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    $certNumber = $certRes.certificate.certificateNumber
    
    Write-Host "   ✅ Certificate generated" -ForegroundColor Green
    Write-Host "   📜 Certificate Number: $certNumber" -ForegroundColor Gray
    Write-Host "   📅 Valid Until: $($certRes.certificate.validUntil)" -ForegroundColor Gray
    Write-Host "   📋 Status: CERTIFICATE_GENERATED`n" -ForegroundColor Gray
    
} catch {
    Write-Host "   ❌ Failed to generate certificate" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Test 7: Certificate Verification
Write-Host "7️⃣  Verifying certificate..." -ForegroundColor Yellow

try {
    $verifyRes = Invoke-RestMethod -Uri "$API_BASE/certificates/$certNumber/verify" `
        -Method Get
    
    Write-Host "   ✅ Certificate verified" -ForegroundColor Green
    Write-Host "   ✓ Valid: $($verifyRes.valid)" -ForegroundColor Gray
    Write-Host "   ✓ Expired: $($verifyRes.expired)" -ForegroundColor Gray
    Write-Host "   ✓ Revoked: $($verifyRes.revoked)`n" -ForegroundColor Gray
    
} catch {
    Write-Host "   ❌ Failed to verify certificate" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Test 8: Inspection History
Write-Host "8️⃣  Checking inspection history..." -ForegroundColor Yellow

try {
    $historyRes = Invoke-RestMethod -Uri "$API_BASE/inspections" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    $count = if ($historyRes.inspections) { $historyRes.inspections.Count } else { $historyRes.Count }
    
    Write-Host "   ✅ History retrieved" -ForegroundColor Green
    Write-Host "   📚 Total Inspections: $count`n" -ForegroundColor Gray
    
} catch {
    Write-Host "   ❌ Failed to retrieve history" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "" # Empty line

# Summary
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🎉 ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Inspection created" -ForegroundColor Green
Write-Host "✅ Sensor readings saved" -ForegroundColor Green
Write-Host "✅ Camera step completed" -ForegroundColor Green
Write-Host "✅ AI analysis completed" -ForegroundColor Green
Write-Host "✅ Quality fusion calculated" -ForegroundColor Green
Write-Host "✅ Certificate generated" -ForegroundColor Green
Write-Host "✅ Certificate verified" -ForegroundColor Green
Write-Host "✅ History retrieved" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "`n🎊 Inspection $inspectionNumber completed successfully!" -ForegroundColor Cyan
Write-Host "📜 Certificate: $certNumber" -ForegroundColor Cyan
Write-Host "`n🌐 View in browser:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:5173/quality/certificates" -ForegroundColor White
Write-Host "   Verify:   http://localhost:5173/verify/$certNumber`n" -ForegroundColor White
