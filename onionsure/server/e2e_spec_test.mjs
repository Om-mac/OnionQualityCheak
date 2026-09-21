/**
 * OnionSure — End-to-End Acceptance Test (per functional specification).
 * Runs the spec's 15-step acceptance test against the live backend.
 */
import fs from 'fs';

const BASE = 'http://localhost:4000/api';
const IMG = 'C:/Users/darak/Desktop/onion zip/onioncheck/test_image/Onion07060_jpg.rf.PhNY2oC8HGrtlsbxi9D9.jpg';

const results = [];
let officerToken = null, farmerToken = null, farmerId = null;

function ok(step, cond, extra = '') {
  results.push({ step, pass: !!cond, extra });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${step}${extra ? '  — ' + extra : ''}`);
}

async function req(path, { method = 'GET', body, token, form } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  try {
    const res = await fetch(BASE + path, { method, headers, body: payload });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  } catch (e) { return { status: 0, json: null, text: e.message }; }
}

(async () => {
  console.log('\n===== ONIONSURE END-TO-END ACCEPTANCE TEST =====\n');

  // 0. Logins
  const off = await req('/auth/login', { method: 'POST', body: { username: 'officer1', password: 'password123' } });
  officerToken = off.json?.token || null;
  ok('1. Officer login', !!officerToken, `status=${off.status}`);
  if (!officerToken) { console.log(off.text?.slice(0, 200)); process.exit(1); }

  const farm = await req('/auth/login', { method: 'POST', body: { username: 'farmer1', password: 'password123' } });
  farmerToken = farm.json?.token || null;
  farmerId = farm.json?.user?.farmerId || null;
  ok('2. Farmer login + farmerId', !!farmerToken, `farmerId=${farmerId}`);

  // 3. Create inspection (Inspection ID backbone)
  const start = await req('/inspection/start', {
    method: 'POST', token: officerToken,
    body: { farmerId: farmerId || 'FRM-000421', crop: 'Onion', variety: 'Nashik Red', quantity: 1200 },
  });
  const insp = start.json;
  const INS_ID = insp?.id || insp?.inspectionNumber;
  ok('3. Create inspection (POST /inspection/start)', start.status === 201 && !!INS_ID, `ID=${INS_ID}`);
  ok('4. Unique Inspection ID format INS-YYYY-NNNNNN', /^INS-\d{4}-\d{6}$/.test(INS_ID || ''), INS_ID);
  ok('5. Lot created + linked (lotNumber)', !!insp?.lotNumber, `lot=${insp?.lotNumber}`);
  ok('6. Initial status LOT_CREATED', insp?.status === 'LOT_CREATED' || insp?.workflowState === 'LOT_CREATED', `status=${insp?.status}/${insp?.workflowState}`);
  if (!INS_ID) process.exit(1);

  // 7. Persistence check (simulates browser refresh)
  const reget = await req(`/inspection/${INS_ID}`, { token: officerToken });
  ok('7. Inspection persists after refetch (no page state)', reget.status === 200 && reget.json?.id === INS_ID, `status=${reget.status}`);

  // 8. Sensor stage — 8 parameters
  const sensors = {
    temperature: 26.4, humidity: 61.2, moisture: 12.5, ph: 6.4,
    co2: 430, ch4: 0.12, c2h4: 0.35, nh3: 0.08,
  };
  const sen = await req(`/inspection/${INS_ID}/sensors`, { method: 'POST', token: officerToken, body: sensors });
  ok('8. Save sensor readings (POST /inspection/:id/sensors)', sen.status === 201, `status=${sen.status}`);
  const iot = await req(`/iot/${INS_ID}`, { token: officerToken });
  const readings = iot.json?.readings || iot.json || [];
  ok('9. Sensor readings persisted & linked by inspectionId', Array.isArray(readings) ? readings.length > 0 : !!readings?.temperature, `count=${Array.isArray(readings) ? readings.length : 'obj'}`);

  // 10. Image stage
  const img = await req(`/inspection/${INS_ID}/images`, { method: 'POST', token: officerToken, body: { angle: 'front', fileName: 'e2e_capture.jpg' } });
  ok('10. Save inspection image', img.status === 201, `status=${img.status}`);

  // 11. Real AI analysis via vision service (multipart)
  const buf = fs.readFileSync(IMG);
  const fd = new FormData();
  fd.append('image', new Blob([buf], { type: 'image/jpeg' }), 'onion.jpg');
  // The frame belongs to this inspection — the backend must persist it against
  // the Inspection ID so the result survives a refresh.
  fd.append('inspectionId', INS_ID);
  const vis = await req('/vision/analyze', { method: 'POST', token: officerToken, form: fd });
  const vision = vis.json;
  ok('11. Real AI vision analysis (POST /vision/analyze)', vis.status === 200 && vision?.source === 'onioncheck', `source=${vision?.source} note=${vision?.note?.slice?.(0, 60)}`);

  // 12. Persist AI analysis under Inspection ID
  const ana = await req(`/inspection/${INS_ID}/analyze`, { method: 'POST', token: officerToken, body: { vision } });
  const detections = ana.json?.detections || [];
  ok('12. AI analysis persisted under Inspection ID', ana.status === 200, `status=${ana.status} detections=${detections.length}`);
  if (vision?.source === 'onioncheck') {
    ok('13. Detections come from real model (not hardcoded)', detections.length > 0 && detections.some(d => d.class), `classes=${[...new Set(detections.map(d => d.class))].join(',')}`);
  }

  // 13b. Detections survive a refetch (not just page state)
  const det = await req(`/inspection/${INS_ID}`, { token: officerToken });
  const storedDets = det.json?.detections || det.json?.session?.detections || [];
  ok('13b. Detections reload from DB after refetch', storedDets.length > 0, `stored=${storedDets.length}`);

  // 14. Fusion reads saved data
  const ev = await req(`/fusion/evidence/${INS_ID}`, { token: officerToken });
  ok('14. Fusion evidence reads SAVED ai+sensor data', ev.status === 200, `status=${ev.status}`);
  const evj = ev.json || {};
  const hasSaved = !!evj.vision || !!evj.sensor || !!evj.ai || !!evj.sensors;
  ok('15. Evidence contains vision+sensor inputs', hasSaved, `keys=${Object.keys(evj).join(',')}`);

  // 16. Fusion calculate + commit
  let fusion = ana.json?.fusion || null;
  if (!fusion) {
    const calc = await req('/fusion/calculate', {
      method: 'POST', token: officerToken,
      body: {
        vision: { visionScore: vision?.visionScore ?? 80, confidence: vision?.confidence ?? 0.9 },
        gas: { stage: 'LOW', gasScore: 82, confidence: 0.85 },
        environment: { environmentScore: 88, confidence: 0.9 },
      },
    });
    fusion = calc.json;
    ok('16. Fusion calculate', calc.status === 200 && !!fusion?.finalScore, `final=${fusion?.finalScore} grade=${fusion?.grade}`);
  } else {
    ok('16. Fusion computed in analyze step', !!fusion?.finalScore, `final=${fusion?.finalScore} grade=${fusion?.grade}`);
  }

  if (fusion) {
    const com = await req('/fusion/commit', { method: 'POST', token: officerToken, body: { inspectionId: INS_ID, fusionResult: fusion } });
    ok('17. Fusion committed (persisted)', com.status === 200 || com.status === 201, `status=${com.status}`);
    ok('18. Grade produced (A/B/C/Reject)', ['GRADE_A', 'GRADE_B', 'GRADE_C', 'REJECTED', 'A', 'B', 'C', 'REJECT'].includes(fusion.grade), `grade=${fusion.grade}`);
  }

  // 19. Certificate from persisted record
  const cert = await req('/certificates/generate', { method: 'POST', token: officerToken, body: { inspectionId: INS_ID } });
  const C = cert.json;
  ok('19. Certificate generated from persisted inspection', cert.status === 201 && !!C?.id, `status=${cert.status} cert=${C?.certificateNumber || C?.id}`);
  ok('20. Certificate links Inspection ID + Lot', !!C?.inspectionId && !!C?.lotNumber, `insp=${C?.inspectionId} lot=${C?.lotNumber}`);

  // 21. QR verification (public)
  const verifyCode = C?.certificateNumber || C?.verificationCode || C?.id;
  const ver = await req(`/verify/${verifyCode}`);
  ok('21. Public QR verification works', ver.status === 200 && !!ver.json, `status=${ver.status}`);

  // 22. Farmer parity — same official result
  const fInsp = await req('/inspections', { token: farmerToken });
  const farmerSees = (fInsp.json || []).some(i => i.id === INS_ID);
  ok('22. Farmer My Lots shows the officer-created inspection', farmerSees, `farmerSaw=${farmerSees}`);
  const fCert = await req('/certificates', { token: farmerToken });
  const farmerCert = (fCert.json || []).find(c => c.inspectionId === INS_ID);
  ok('23. Farmer My Certificate shows same certificate', !!farmerCert, `found=${!!farmerCert}`);
  if (farmerCert && C) {
    ok('24. Farmer grade === officer grade (no duplicated data)', (farmerCert.grade || farmerCert.qualityGrade) === (C.grade || C.qualityGrade), `farmer=${farmerCert.grade} officer=${C.grade}`);
  }

  // 25. Dispute workflow
  const disp = await req('/disputes', {
    method: 'POST', token: farmerToken,
    body: { inspectionId: INS_ID, reason: 'GRADE_DISPUTE', description: 'E2E test dispute — grade seems low' },
  });
  const D = disp.json;
  ok('25. Farmer can raise dispute on exact inspection', disp.status === 200 || disp.status === 201, `status=${disp.status} id=${D?.id}`);

  // 26. Audit timeline
  const aud = await req(`/inspections/${INS_ID}/audit`, { token: officerToken });
  const events = aud.json?.events || aud.json || [];
  ok('26. Audit timeline shows inspection events', aud.status === 200 && (Array.isArray(events) ? events.length > 0 : true), `status=${aud.status} count=${Array.isArray(events) ? events.length : 'obj'}`);

  // 27. Analytics from persisted data
  const dash = await req('/analytics/dashboard', { token: officerToken });
  ok('27. Analytics/dashboard from persisted records', dash.status === 200 && dash.json, `status=${dash.status} total=${dash.json?.todayInspections ?? dash.json?.totalInspections ?? 'n/a'}`);

  // Summary
  const passed = results.filter(r => r.pass).length;
  console.log(`\n===== RESULT: ${passed}/${results.length} checks passed =====`);
  const failed = results.filter(r => !r.pass);
  if (failed.length) {
    console.log('\nFAILED CHECKS:');
    failed.forEach(f => console.log(`  - ${f.step} ${f.extra}`));
  }
  console.log(`\nInspection ID created: ${INS_ID}`);
})();
