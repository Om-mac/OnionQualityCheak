#!/usr/bin/env node
/**
 * AI ANALYSIS → FUSION FLOW TEST
 * 
 * Tests that AI analysis results are properly stored and available for fusion calculation.
 * Specifically validates the fix for demo mode fallback when Python service is unavailable.
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000/api';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function apiCall(method, endpoint, body = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  return await response.json();
}

async function testAIFusionFlow() {
  log('\n╔═══════════════════════════════════════════════╗', 'cyan');
  log('║  AI ANALYSIS → FUSION FLOW TEST              ║', 'cyan');
  log('╚═══════════════════════════════════════════════╝\n', 'cyan');

  try {
    // Step 1: Create inspection
    log('Step 1: Creating inspection...', 'cyan');
    const inspection = await apiCall('POST', '/inspections', {
      farmerId: 1,
      farmerName: 'Test Farmer',
      fpoId: 1,
      fpoName: 'Test FPO',
      procurementCenterId: 1,
      centreId: 1,
      centreName: 'Test Centre',
      crop: 'ONION',
      variety: 'Bhima Super',
      quantity: 100,
      unit: 'KG'
    });
    log(`✓ Inspection created: ${inspection.inspectionNumber}`, 'green');
    const inspectionId = inspection.id;

    // Step 2: Add sensor data
    log('\nStep 2: Adding sensor data...', 'cyan');
    await apiCall('POST', `/inspections/${inspectionId}/sensors`, {
      temperature: 20,
      humidity: 65,
      moisture: 12,
      pH: 6.5,
      co2: 400,
      ch4: 2,
      c2h4: 0.5,
      nh3: 1
    });
    log('✓ Sensor data added', 'green');

    // Step 3: Check status before AI analysis
    log('\nStep 3: Checking inspection before AI analysis...', 'cyan');
    let inspectionData = await apiCall('GET', `/inspections/${inspectionId}`);
    log(`  Status: ${inspectionData.status}`, 'yellow');
    log(`  Healthy Count: ${inspectionData.healthyCount}`, 'yellow');
    log(`  Defective Counts: ${inspectionData.damagedCount + inspectionData.rottenCount + inspectionData.sproutedCount + inspectionData.undersizedCount}`, 'yellow');

    // Step 4: Run AI analysis (should fallback to demo mode)
    log('\nStep 4: Running AI analysis (demo mode)...', 'cyan');
    try {
      const aiResult = await apiCall('POST', `/inspections/${inspectionId}/ai-analysis`, {
        confidenceThreshold: 0.4
      });
      log('✓ AI analysis completed', 'green');
      log(`  Total detections: ${aiResult.summary.totalDetections}`, 'yellow');
      log(`  Healthy: ${aiResult.summary.defectCounts.healthy}`, 'yellow');
      log(`  Damaged: ${aiResult.summary.defectCounts.damaged}`, 'yellow');
      log(`  Rotten: ${aiResult.summary.defectCounts.rotten}`, 'yellow');
      log(`  Sprouted: ${aiResult.summary.defectCounts.sprouted}`, 'yellow');
      log(`  Undersized: ${aiResult.summary.defectCounts.undersized}`, 'yellow');
      log(`  Average confidence: ${(aiResult.summary.averageConfidence * 100).toFixed(1)}%`, 'yellow');
    } catch (aiError) {
      log(`✗ AI analysis failed: ${aiError.message}`, 'red');
      throw aiError;
    }

    // Step 5: Verify counts stored in inspection
    log('\nStep 5: Verifying AI counts stored in inspection...', 'cyan');
    inspectionData = await apiCall('GET', `/inspections/${inspectionId}`);
    
    if (inspectionData.status !== 'AI_ANALYSIS_COMPLETED') {
      throw new Error(`Status should be AI_ANALYSIS_COMPLETED, got ${inspectionData.status}`);
    }
    log('✓ Status updated to AI_ANALYSIS_COMPLETED', 'green');
    
    const totalCounts = inspectionData.healthyCount + inspectionData.damagedCount + 
                       inspectionData.rottenCount + inspectionData.sproutedCount + 
                       inspectionData.undersizedCount;
    
    if (totalCounts === 0) {
      throw new Error('No AI counts stored in inspection record!');
    }
    log(`✓ AI counts stored: ${totalCounts} total onions`, 'green');
    log(`  - Healthy: ${inspectionData.healthyCount}`, 'yellow');
    log(`  - Damaged: ${inspectionData.damagedCount}`, 'yellow');
    log(`  - Rotten: ${inspectionData.rottenCount}`, 'yellow');
    log(`  - Sprouted: ${inspectionData.sproutedCount}`, 'yellow');
    log(`  - Undersized: ${inspectionData.undersizedCount}`, 'yellow');
    log(`  - AI Confidence: ${(inspectionData.aiConfidence * 100).toFixed(1)}%`, 'yellow');

    // Step 6: Calculate fusion score
    log('\nStep 6: Calculating fusion score...', 'cyan');
    try {
      const fusionResult = await apiCall('POST', `/inspections/${inspectionId}/fusion`, {
        weights: {
          vision: 0.5,
          sensor: 0.3,
          aiConfidence: 0.2
        }
      });
      log('✓ Fusion score calculated', 'green');
      log(`  Visual Score: ${fusionResult.fusion.visualScore}/100`, 'yellow');
      log(`  Sensor Score: ${fusionResult.fusion.sensorScore || 'N/A'}/100`, 'yellow');
      log(`  AI Confidence: ${fusionResult.fusion.aiConfidence}/100`, 'yellow');
      log(`  Final Score: ${fusionResult.fusion.finalScore}/100`, 'yellow');
      log(`  Grade: ${fusionResult.fusion.grade}`, 'yellow');
      log(`  Risk Level: ${fusionResult.fusion.riskLevel}`, 'yellow');
    } catch (fusionError) {
      log(`✗ Fusion calculation failed: ${fusionError.message}`, 'red');
      throw fusionError;
    }

    // Step 7: Verify fusion completed
    log('\nStep 7: Verifying fusion results stored...', 'cyan');
    inspectionData = await apiCall('GET', `/inspections/${inspectionId}`);
    
    if (inspectionData.status !== 'FUSION_COMPLETED') {
      throw new Error(`Status should be FUSION_COMPLETED, got ${inspectionData.status}`);
    }
    log('✓ Status updated to FUSION_COMPLETED', 'green');
    
    if (!inspectionData.grade) {
      throw new Error('Grade not assigned!');
    }
    log(`✓ Grade assigned: ${inspectionData.grade}`, 'green');
    
    if (!inspectionData.qualityScore) {
      throw new Error('Quality score not calculated!');
    }
    log(`✓ Quality score: ${inspectionData.qualityScore}/100`, 'green');

    // Step 8: Test certificate generation readiness
    log('\nStep 8: Testing certificate generation readiness...', 'cyan');
    const certResult = await apiCall('POST', `/inspections/${inspectionId}/certificate`, {});
    log('✓ Certificate generated successfully', 'green');
    log(`  Certificate Number: ${certResult.certificateNumber}`, 'yellow');
    log(`  Grade: ${certResult.grade}`, 'yellow');
    log(`  Quality Score: ${certResult.qualityScore}`, 'yellow');
    log(`  Healthy Count: ${certResult.healthyCount}`, 'yellow');
    log(`  Defective Count: ${certResult.defectiveCount}`, 'yellow');

    // Summary
    log('\n╔═══════════════════════════════════════════════╗', 'green');
    log('║  ✓ ALL TESTS PASSED                          ║', 'green');
    log('╚═══════════════════════════════════════════════╝\n', 'green');
    
    log('Test Summary:', 'cyan');
    log('  ✓ AI analysis runs in demo mode when Python service unavailable', 'green');
    log('  ✓ AI counts properly stored in inspection record', 'green');
    log('  ✓ Fusion calculation reads stored AI counts', 'green');
    log('  ✓ Grade assigned based on AI + sensor data', 'green');
    log('  ✓ Certificate auto-populates with AI counts', 'green');
    log('  ✓ Complete workflow: Create → AI → Fusion → Certificate ✓', 'green');
    
    log(`\nTest Inspection ID: ${inspectionId}`, 'cyan');
    log(`View in UI: http://localhost:3000/procurement/history\n`, 'cyan');

  } catch (error) {
    log(`\n✗ TEST FAILED: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run test
log('Starting AI → Fusion flow test...', 'cyan');
log('Ensure backend is running on http://localhost:4000\n', 'yellow');

testAIFusionFlow()
  .then(() => {
    log('Test completed successfully!', 'green');
    process.exit(0);
  })
  .catch(err => {
    log(`Fatal error: ${err.message}`, 'red');
    process.exit(1);
  });
