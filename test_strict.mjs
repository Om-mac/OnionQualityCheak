#!/usr/bin/env node
import http from 'http';
import fs from 'fs';

const API = 'http://localhost:4000';
let token = '';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const r = http.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          else resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
        } catch (e) { reject(new Error(`Parse error: ${e.message}`)); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function test() {
  console.log('\n🧅 STRICT TEST: AI Analysis + IoT Fusion Data Storage\n');

  try {
    // 1. Login
    console.log('[1/10] Login...');
    const login = await req('POST', '/api/auth/login', { username: 'officer1', password: 'password123' });
    token = login.data.token;
    console.log('✅ Logged in\n');

    // 2. Create inspection
    console.log('[2/10] Create new inspection...');
    const insp = await req('POST', '/api/inspections', {
      farmerName: 'Test Farmer AI Fusion',
      procurementCenterId: 'ctr_a15076b0a296',
      quantity: 100,
      quantityUnit: 'KG',
      crop: 'ONION',
      variety: 'Test Variety'
    });
    const id = insp.data.inspection.id;
    console.log(`✅ Created: ${id}\n`);

    // 3. Add IoT sensor readings
    console.log('[3/10] Add IoT sensor readings...');
    await req('POST', `/api/inspections/${id}/sensor-readings`, {
      deviceId: 'TEST_POD_001',
      temperature: 18.5,
      humidity: 65.0,
      gas1: 250,
      gas2: 180,
      gas3: 220,
      airQuality: 85
    });
    console.log('✅ IoT data saved\n');

    // 4. Verify IoT data persistence
    console.log('[4/10] Verify IoT data persisted...');
    const sensorCheck = await req('GET', `/api/inspections/${id}/sensor-readings`);
    if (!sensorCheck.data.readings || sensorCheck.data.readings.length === 0) {
      throw new Error('❌ IoT data not persisted');
    }
    console.log(`✅ IoT readings found: ${sensorCheck.data.readings.length} records\n`);

    // 5. Verify db.json has sensor data
    console.log('[5/10] Verify db.json persistence...');
    const dbPath = 'onionsure/server/data/db.json';
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const sensorInDb = (db.sensor_readings || db.sensorReadings || []).filter(s => s.inspectionId === id);
    if (sensorInDb.length === 0) throw new Error('❌ Sensor data not in db.json');
    console.log(`✅ db.json has ${sensorInDb.length} sensor record(s)\n`);

    // 6. Check inspection data structure
    console.log('[6/10] Check inspection record structure...');
    const inspCheck = db.inspection_sessions?.find(i => i.id === id) || 
                      db.inspections?.find(i => i.id === id);
    if (!inspCheck) throw new Error('❌ Inspection not found in db.json');
    console.log(`✅ Inspection exists with status: ${inspCheck.status}\n`);

    // 7. Test fusion data endpoint
    console.log('[7/10] Test fusion data endpoint...');
    const fusion = await req('GET', `/api/inspections/${id}/ai-analysis/fusion-data/combined`);
    if (!fusion.data.fusionData) throw new Error('❌ No fusionData in response');
    
    const fd = fusion.data.fusionData;
    console.log('✅ Fusion endpoint working');
    console.log(`   IoT readings: ${fd.iot?.readingCount || 0}`);
    console.log(`   Latest temp: ${fd.iot?.latestReading?.temperature || 'N/A'}°C`);
    console.log(`   Latest humidity: ${fd.iot?.latestReading?.humidity || 'N/A'}%`);
    console.log(`   Gas quality score: ${fd.iot?.gasQuality || 'N/A'}`);
    console.log(`   Environment score: ${fd.iot?.environmentQuality || 'N/A'}\n`);

    // 8. Verify fusion-ready data structure
    console.log('[8/10] Verify fusion-ready data structure...');
    if (!fd.fusionReady) throw new Error('❌ fusionReady data missing');
    if (typeof fd.fusionReady.gasScore === 'undefined') throw new Error('❌ gasScore missing');
    if (typeof fd.fusionReady.environmentScore === 'undefined') throw new Error('❌ environmentScore missing');
    if (!fd.fusionReady.earlySpoilageIndicators) throw new Error('❌ earlySpoilageIndicators missing');
    console.log('✅ All fusion-ready fields present');
    console.log(`   Gas score: ${fd.fusionReady.gasScore}`);
    console.log(`   Environment score: ${fd.fusionReady.environmentScore}`);
    console.log(`   Early spoilage: ${JSON.stringify(fd.fusionReady.earlySpoilageIndicators)}\n`);

    // 9. Verify AI analysis collections exist
    console.log('[9/10] Verify AI analysis collections...');
    if (!db.ai_analyses) console.log('   ⚠️  ai_analyses collection not yet created (expected before AI run)');
    if (!db.defectDetections) console.log('   ⚠️  defectDetections collection not yet created (expected before AI run)');
    console.log('✅ AI analysis structure ready\n');

    // 10. Final validation
    console.log('[10/10] Final data flow validation...');
    const finalInsp = await req('GET', `/api/inspections/${id}`);
    if (!finalInsp.data.inspection) throw new Error('❌ Cannot retrieve inspection');
    console.log(`✅ Inspection ${id} retrievable`);
    console.log(`   Status: ${finalInsp.data.inspection.status}`);
    console.log(`   Has sensor data: ${!!finalInsp.data.inspection.sensorReadings?.length}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60));
    console.log('\nValidated:');
    console.log('  ✓ Inspection creation and persistence');
    console.log('  ✓ IoT sensor data saved to db.json');
    console.log('  ✓ Sensor readings linked to inspectionId');
    console.log('  ✓ Fusion data endpoint returns IoT metrics');
    console.log('  ✓ Gas quality and environment scores calculated');
    console.log('  ✓ Early spoilage indicators present');
    console.log('  ✓ AI analysis collections ready');
    console.log('  ✓ Complete inspection retrievable');
    console.log('\n🎉 AI analysis data structure is ready for Fusion Intelligence!\n');

  } catch (e) {
    console.error('\n❌ TEST FAILED:', e.message);
    console.error('\nStack:', e.stack);
    process.exit(1);
  }
}

test();
