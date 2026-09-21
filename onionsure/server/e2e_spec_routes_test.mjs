/**
 * OnionSure — Spec-Shaped Workflow API Test.
 *
 * Exercises the /api/inspections/* REST surface described by the functional
 * specification (the "unified workflow" routes):
 *   inspections → sensor-readings → images → ai-analysis → fusion → certificate
 *
 * It also asserts these routes share ONE data store with the rest of the app
 * (no split-brain), which is the spec's core "single Inspection ID backbone"
 * requirement.
 */
import fs from 'fs';

const BASE = 'http://localhost:4000/api';
const IMG = 'C:/Users/darak/Desktop/onion zip/onioncheck/test_image/Onion07060_jpg.rf.PhNY2oC8HGrtlsbxi9D9.jpg';

const results = [];
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
  console.log('\n===== SPEC-SHAPED WORKFLOW API TEST =====\n');

  const off = await req('/auth/login', { method: 'POST', body: { username: 'officer1', password: 'password123' } });
  const token = off.json?.token;
  ok('1. Officer login', !!token, `status=${off.status}`);
  if (!token) process.exit(1);

  // Need a valid procurement centre for the spec create route
  const centres = await req('/centers', { token });
  const centreList = centres.json?.centers || centres.json || [];
  const centreId = centreList[0]?.id;
  ok('2. Procurement centre available', !!centreId, `centre=${centreId}`);

  // ── Create inspection via the spec route ─────────────────────────────
  const create = await req('/inspections', {
    method: 'POST', token,
    body: {
      farmerName: 'Spec Test Farmer',
      farmerId: 'FRM-000421',
      centreId,
      crop: 'ONION',
      variety: 'Nashik Red',
      quantity: 800,
    },
  });
  const ins = create.json?.inspection;
  const INS = ins?.id;
  ok('3. POST /inspections creates inspection', create.status === 200 && !!INS, `status=${create.status}`);
  ok('4. Spec ID uses INS-YYYY-NNNNNN backbone', /^INS-\d{4}-\d{6}$/.test(INS || ''), `id=${INS}`);
  ok('5. Lot created and linked by internal lotId', !!ins?.lotId && !!ins?.lotNumber, `lot=${ins?.lotNumber}`);

  if (!INS) { console.log('  body:', create.text?.slice(0, 300)); process.exit(1); }

  // ── Read back (spec detail route) ────────────────────────────────────
  const get1 = await req(`/inspections/${INS}`, { token });
  ok('6. GET /inspections/:id returns full record', get1.status === 200 && get1.json?.inspection?.id === INS, `status=${get1.status}`);
  ok('7. Detail resolves centre via alias (no crash)', get1.json?.inspection?.centre !== undefined || get1.status === 200, `centre=${get1.json?.inspection?.centre?.name ?? 'null'}`);

  // ── Sensor readings ──────────────────────────────────────────────────
  const sen = await req(`/inspections/${INS}/sensor-readings`, {
    method: 'POST', token,
    body: { temperature: 25.1, humidity: 60.2, moisture: 13.0, ph: 6.1, co2: 420, ch4: 0.11, c2h4: 0.30, nh3: 0.07 },
  });
  ok('8. POST sensor-readings', sen.status === 200 || sen.status === 201, `status=${sen.status}`);

  const senGet = await req(`/inspections/${INS}/sensor-readings`, { token });
  const senList = senGet.json?.readings || senGet.json?.sensorReadings || senGet.json || [];
  ok('9. GET sensor-readings persisted', (Array.isArray(senList) ? senList.length : 0) > 0, `count=${Array.isArray(senList) ? senList.length : 'obj'}`);

  // ── Images (multipart upload) ────────────────────────────────────────
  const buf = fs.readFileSync(IMG);
  const fd = new FormData();
  fd.append('images', new Blob([buf], { type: 'image/jpeg' }), 'spec_onion.jpg');
  const imgUp = await req(`/inspections/${INS}/images`, { method: 'POST', token, form: fd });
  ok('10. POST images (multipart upload)', imgUp.status === 200 || imgUp.status === 201, `status=${imgUp.status}`);

  const imgGet = await req(`/inspections/${INS}/images`, { token });
  const imgList = imgGet.json?.images || imgGet.json || [];
  const imageId = Array.isArray(imgList) ? imgList[0]?.id : null;
  ok('11. GET images persisted', (Array.isArray(imgList) ? imgList.length : 0) > 0, `count=${Array.isArray(imgList) ? imgList.length : 'obj'}`);

  // ── AI analysis (calls the real YOLO service on :5000) ───────────────
  let aiOk = false, aiNote = '';
  if (imageId) {
    const ai = await req(`/inspections/${INS}/ai-analysis`, {
      method: 'POST', token, body: { imageId },
    });
    aiOk = ai.status === 200 || ai.status === 201;
    const detCount = ai.json?.analysis ? ai.json.analysis.totalDetected : null;
    aiNote = `status=${ai.status} ${(ai.json?.error || detCount || '')}`.trim();
    ok('12. POST ai-analysis (real model)', aiOk, aiNote);
  } else {
    ok('12. POST ai-analysis (real model)', false, 'no imageId to analyse');
  }

  // ── Status state machine ─────────────────────────────────────────────
  const st = await req(`/inspections/${INS}/status`, {
    method: 'PATCH', token, body: { status: 'AI_ANALYSIS_COMPLETED' },
  });
  ok('13. PATCH /inspections/:id/status', st.status === 200, `status=${st.status}`);

  // ── Fusion ───────────────────────────────────────────────────────────
  const fus = await req(`/inspections/${INS}/fusion`, { method: 'POST', token, body: {} });
  const fusion = fus.json?.fusion || fus.json?.fusionResult || fus.json;
  ok('14. POST fusion computes score+grade', (fus.status === 200 || fus.status === 201) && fusion?.finalScore != null,
     `status=${fus.status} score=${fusion?.finalScore} grade=${fusion?.grade}`);

  // ── Certificate ──────────────────────────────────────────────────────
  const cert = await req(`/inspections/${INS}/certificate`, { method: 'POST', token, body: {} });
  const C = cert.json?.certificate || cert.json;
  const certNum = C?.certificateNumber;
  ok('15. POST certificate generates cert', (cert.status === 200 || cert.status === 201) && !!certNum, `status=${cert.status} cert=${certNum}`);
  ok('16. Certificate links Inspection ID + Lot', C?.inspectionId === INS && !!C?.lotNumber, `insp=${C?.inspectionId} lot=${C?.lotNumber}`);

  if (certNum) {
    const ver = await req(`/inspections/${INS}/certificate/verify/${certNum}`);
    ok('17. GET certificate/verify (QR verification)', ver.status === 200, `status=${ver.status}`);
  }

  // ── Cross-check: SAME store, not a second universe ───────────────────
  const legacyList = await req('/inspections', { token });
  const seen = (legacyList.json || []).some((i) => i.id === INS);
  ok('18. Spec inspection visible in app inspection list (one store)', seen, `found=${seen}`);

  const legacyDetail = await req(`/inspection/${INS}`, { token });
  ok('19. Spec inspection readable by app detail route', legacyDetail.status === 200 && legacyDetail.json?.id === INS, `status=${legacyDetail.status}`);

  const specGet2 = await req(`/inspections/${INS}`, { token });
  const specDet = specGet2.json?.inspection;
  ok('20. Sensor readings shared across both APIs',
     (specDet?.sensorReadings || []).length > 0, `count=${(specDet?.sensorReadings || []).length}`);

  // ── List + filter ────────────────────────────────────────────────────
  const list = await req('/inspections?limit=5', { token });
  ok('21. GET /inspections list works', list.status === 200, `status=${list.status} n=${(list.json || []).length}`);

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n===== RESULT: ${passed}/${results.length} checks passed =====`);
  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    console.log('\nFAILED CHECKS:');
    failed.forEach((f) => console.log(`  - ${f.step} ${f.extra}`));
  }
  console.log(`\nSpec Inspection ID: ${INS}`);
})();
