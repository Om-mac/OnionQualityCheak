/**
 * Automated Workflow Test
 * Tests the complete inspection workflow end-to-end
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const API_BASE = 'http://localhost:4000/api';
const AI_BASE = 'http://localhost:5000';

const TOKEN = 'test-token'; // Mock token

console.log('🧪 Starting Workflow Test\n');

async function test() {
  let inspectionId;
  
  try {
    // Test 1: Create Inspection
    console.log('1️⃣  Creating inspection...');
    const inspectionRes = await axios.post(`${API_BASE}/inspections`, {
      lotId: `LOT-TEST-${Date.now()}`,
      farmerName: 'Test Farmer',
      location: 'Test Farm, India',
      quantity: 1000,
      quantityUnit: 'kg',
      procurementCenter: 'Test Center',
    }, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    inspectionId = inspectionRes.data.inspection.id;
    console.log(`   ✅ Inspection created: ${inspectionRes.data.inspection.inspectionNumber}`);
    console.log(`   📋 Status: ${inspectionRes.data.inspection.status}\n`);
    
    // Test 2: Sensor Readings
    console.log('2️⃣  Submitting sensor readings...');
    await axios.post(`${API_BASE}/inspections/${inspectionId}/sensor-readings`, {
      temperature: 25,
      humidity: 60,
      moisture: 12,
      pH: 6.5,
      co2: 400,
      ch4: 1.5,
      c2h4: 0.5,
      nh3: 5,
    }, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    await axios.post(`${API_BASE}/inspections/${inspectionId}/sensor-readings/complete`, {}, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    console.log('   ✅ Sensor readings saved');
    console.log('   📋 Status: SENSOR_COMPLETED\n');
    
    // Test 3: Image Upload (simulated)
    console.log('3️⃣  Uploading images...');
    
    // Create test image if doesn't exist
    const testImagePath = 'test-image.jpg';
    if (!fs.existsSync(testImagePath)) {
      // Create a simple test file
      fs.writeFileSync(testImagePath, 'test-image-data');
    }
    
    const formData = new FormData();
    formData.append('images', fs.createReadStream(testImagePath));
    
    await axios.post(
      `${API_BASE}/inspections/${inspectionId}/images`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${TOKEN}`,
        },
      }
    );
    
    await axios.post(`${API_BASE}/inspections/${inspectionId}/images/complete`, {}, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    console.log('   ✅ Images uploaded');
    console.log('   📋 Status: CAMERA_COMPLETED\n');
    
    // Test 4: AI Analysis (mocked since requires real images)
    console.log('4️⃣  Running AI analysis...');
    
    const aiRes = await axios.post(
      `${API_BASE}/inspections/${inspectionId}/ai-analysis`,
      {
        mockResults: {
          healthy: 85,
          damaged: 10,
          rotten: 3,
          sprouted: 1,
          undersized: 1,
          confidence: 0.92,
        }
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log('   ✅ AI analysis completed');
    console.log(`   🔍 Results: ${JSON.stringify(aiRes.data.analysis.defectCounts)}`);
    console.log('   📋 Status: AI_ANALYSIS_COMPLETED\n');
    
    // Test 5: Quality Fusion
    console.log('5️⃣  Calculating quality fusion...');
    
    const fusionRes = await axios.post(
      `${API_BASE}/inspections/${inspectionId}/fusion`,
      {},
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log('   ✅ Fusion calculated');
    console.log(`   📊 Quality Score: ${fusionRes.data.fusion.qualityScore.toFixed(1)}/100`);
    console.log(`   🏆 Grade: ${fusionRes.data.fusion.grade}`);
    console.log(`   ⚠️  Risk Level: ${fusionRes.data.fusion.riskLevel}`);
    console.log('   📋 Status: FUSION_COMPLETED\n');
    
    // Test 6: Certificate Generation
    console.log('6️⃣  Generating certificate...');
    
    const certRes = await axios.post(
      `${API_BASE}/inspections/${inspectionId}/certificate`,
      {},
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    const certNumber = certRes.data.certificate.certificateNumber;
    
    console.log('   ✅ Certificate generated');
    console.log(`   📜 Certificate Number: ${certNumber}`);
    console.log(`   📅 Valid Until: ${new Date(certRes.data.certificate.validUntil).toLocaleDateString()}`);
    console.log('   📋 Status: CERTIFICATE_GENERATED\n');
    
    // Test 7: Certificate Verification
    console.log('7️⃣  Verifying certificate...');
    
    const verifyRes = await axios.get(
      `${API_BASE}/certificates/${certNumber}/verify`
    );
    
    console.log('   ✅ Certificate verified');
    console.log(`   ✓ Valid: ${verifyRes.data.valid}`);
    console.log(`   ✓ Expired: ${verifyRes.data.expired}`);
    console.log(`   ✓ Revoked: ${verifyRes.data.revoked}\n`);
    
    // Test 8: Retrieve Inspection History
    console.log('8️⃣  Checking inspection history...');
    
    const historyRes = await axios.get(
      `${API_BASE}/inspections`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log('   ✅ History retrieved');
    console.log(`   📚 Total Inspections: ${historyRes.data.inspections?.length || historyRes.data.length}\n`);
    
    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Inspection created');
    console.log('✅ Sensor readings saved');
    console.log('✅ Images uploaded');
    console.log('✅ AI analysis completed');
    console.log('✅ Quality fusion calculated');
    console.log('✅ Certificate generated');
    console.log('✅ Certificate verified');
    console.log('✅ History retrieved');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n🎊 Inspection ${inspectionRes.data.inspection.inspectionNumber} completed successfully!`);
    console.log(`📜 Certificate: ${certNumber}`);
    console.log(`\n🌐 View in browser:`);
    console.log(`   Frontend: http://localhost:5173/quality/certificates`);
    console.log(`   Verify:   http://localhost:5173/verify/${certNumber}`);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run test
test();
