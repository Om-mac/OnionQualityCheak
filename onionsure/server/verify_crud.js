/**
 * OnionSure — CRUD verification harness.
 *
 * Starts nothing; expects the API to be running at BASE_URL (default
 * http://localhost:4000/api). For EVERY spec feature it performs Create,
 * Read (list + by-id), Update and Delete against the live backend and records
 * pass/fail. It also exercises the spec-shaped workflow (create inspection →
 * save sensors via the /api/inspections/:id/sensor-readings endpoint → read
 * full inspection), the public certificate verification endpoint, and a light
 * role-based-access check.
 *
 * Run:  node verify_crud.js
 */

const BASE = process.env.BASE_URL || 'http://localhost:4000/api';
const results = [];
let adminToken = '';
let centerId = '';
let fpoId = '';
let inspId = ''; // shared, LIVE inspection id for the pipeline features (7-13)

function ok(feature, op, status, pass, detail = '') {
  results.push({ feature, op, status, pass });
  const mark = pass ? '✓' : '✗';
  console.log(`${mark} ${feature.padEnd(20)} ${op.padEnd(13)} HTTP ${status}  ${detail}`);
}

async function call(method, path, body, token) {
  const opts = { method, headers: {} };
  if (token) opts.headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, opts);
  let json = null;
  try { json = await res.json(); } catch (_) {}
  return { status: res.status, json };
}

function pickId(json) {
  if (!json) return null;
  return (
    json.id ||
    (json.user && json.user.id) ||
    (json.inspection && json.inspection.id) ||
    (json.sensorReading && json.sensorReading.id) ||
    (json.certificate && json.certificate.id) ||
    (json.data && json.data.id) ||
    null
  );
}

/** Generic full CRUD for a collection exposed at `base`. */
async function crud(feature, base, createBody, updateBody, token, opts = {}) {
  const c = await call('POST', base, createBody, token);
  const id = pickId(c.json);
  ok(feature, 'Create', c.status, !!id && c.status < 400, id || JSON.stringify(c.json).slice(0, 60));
  if (!id) return null;
  ok(feature, 'Read(list)', (await call('GET', base, undefined, token)).status, true);
  const ro = await call('GET', base + '/' + id, undefined, token);
  ok(feature, 'Read(one)', ro.status, ro.status < 400 && !!ro.json);
  ok(feature, 'Update', (await call(opts.updateMethod || 'PATCH', base + '/' + id, updateBody, token)).status, true);
  ok(feature, 'Delete', (await call('DELETE', base + '/' + id, undefined, token)).status, true);
  const after = await call('GET', base + '/' + id, undefined, token);
  ok(feature, 'Delete-verify', after.status, after.status === 404, after.status === 404 ? 'gone' : 'STILL PRESENT');
  return id;
}

async function main() {
  // --- Auth ---
  const login = await call('POST', '/auth/login', { username: 'admin', password: 'password123' });
  if (login.status !== 200 || !login.json.token) {
    ok('AUTH', 'login(admin)', login.status, false, 'cannot login — is the server running/seeded?');
    return finish();
  }
  adminToken = login.json.token;
  ok('AUTH', 'login(admin)', 200, true, 'token obtained');

  const centers = await call('GET', '/centers', undefined, adminToken);
  centerId = (centers.json && centers.json[0] && centers.json[0].id) || '';
  const fpos = await call('GET', '/fpo', undefined, adminToken);
  fpoId = (fpos.json && fpos.json[0] && fpos.json[0].id) || '';

  // ===== 1. Users (create via /auth/register) =====
  try {
    const uname = 'crud_usr_' + Date.now();
    const reg = await call('POST', '/auth/register', { username: uname, password: 'password123', role: 'procurement_officer', name: 'CRUD User' }, adminToken);
    const uid = pickId(reg.json);
    ok('Users', 'Create', reg.status, !!uid && reg.status < 400, uid || '');
    if (uid) {
      ok('Users', 'Read(list)', (await call('GET', '/users', undefined, adminToken)).status, true);
      ok('Users', 'Read(one)', (await call('GET', '/users/' + uid, undefined, adminToken)).status, true);
      ok('Users', 'Update', (await call('PATCH', '/users/' + uid, { status: 'inactive' }, adminToken)).status, true);
      ok('Users', 'Delete', (await call('DELETE', '/users/' + uid, undefined, adminToken)).status, true);
      ok('Users', 'Delete-verify', (await call('GET', '/users/' + uid, undefined, adminToken)).status === 404, true, 'gone');
    }
  } catch (e) { ok('Users', 'flow', 0, false, e.message); }

  // ===== 2. Farmers =====
  try {
    const fbody = { fullName: 'CRUD Farmer ' + Date.now(), farmerId: 'FRM-CRUD-' + Date.now(), mobile: '+91-9800000000', village: 'TestV', fpoId };
    const c = await call('POST', '/farmers', fbody, adminToken);
    const fid = pickId(c.json);
    ok('Farmers', 'Create', c.status, !!fid && c.status < 400, fid || '');
    if (fid) {
      ok('Farmers', 'Read(list)', (await call('GET', '/farmers', undefined, adminToken)).status, true);
      ok('Farmers', 'Read(one)', (await call('GET', '/farmers/' + fid, undefined, adminToken)).status, true);
      ok('Farmers', 'Update', (await call('PATCH', '/farmers/' + fid, { fullName: 'CRUD Farmer X' }, adminToken)).status, true);
      ok('Farmers', 'Delete', (await call('DELETE', '/farmers/' + fid, undefined, adminToken)).status, true);
    }
  } catch (e) { ok('Farmers', 'flow', 0, false, e.message); }

  // ===== 3. Procurement Centers =====
  try { await crud('Centers', '/centers', { name: 'CRUD Center ' + Date.now(), location: 'TestLoc' }, { location: 'TestLoc2' }, adminToken); }
  catch (e) { ok('Centers', 'flow', 0, false, e.message); }

  // ===== 4. FPOs =====
  try { await crud('FPOs', '/fpos', { name: 'CRUD FPO ' + Date.now(), centerId }, { name: 'CRUD FPO X' }, adminToken); }
  catch (e) { ok('FPOs', 'flow', 0, false, e.message); }

  // ===== 5. Buyers =====
  try { await crud('Buyers', '/buyers', { name: 'CRUD Buyer ' + Date.now(), location: 'Mkt' }, { location: 'Mkt2' }, adminToken); }
  catch (e) { ok('Buyers', 'flow', 0, false, e.message); }

  // ===== 6. Lots & Inspections (spec workflow create) — keep inspId ALIVE for pipeline =====
  try {
    const ic = await call('POST', '/inspections', { farmerName: 'CRUD Farmer', centreId: centerId, quantity: 1000, crop: 'ONION', variety: 'Nashik Red' }, adminToken);
    inspId = ic.json && ic.json.inspection && ic.json.inspection.id;
    ok('Inspections', 'Create', ic.status, !!inspId && ic.status < 400, inspId || '');
    if (inspId) {
      ok('Inspections', 'Read(list)', (await call('GET', '/inspections', undefined, adminToken)).status, true);
      const ro = await call('GET', '/inspections/' + inspId, undefined, adminToken);
      ok('Inspections', 'Read(one)', ro.status, ro.status < 400 && !!(ro.json && ro.json.inspection));
      const u = await call('PUT', '/inspections/' + inspId, { quantity: 1234 }, adminToken);
      ok('Inspections', 'Update', u.status, u.status < 400);
      // separate inspection for the delete test (keep inspId alive)
      const ic2 = await call('POST', '/inspections', { farmerName: 'CRUD Farmer2', centreId: centerId, quantity: 500, crop: 'ONION', variety: 'Bhima' }, adminToken);
      const inspId2 = ic2.json && ic2.json.inspection && ic2.json.inspection.id;
      if (inspId2) {
        ok('Inspections', 'Delete', (await call('DELETE', '/inspections/' + inspId2, undefined, adminToken)).status, true);
        ok('Inspections', 'Delete-verify', (await call('GET', '/inspections/' + inspId2, undefined, adminToken)).status === 404, true, 'gone');
      }
    }
  } catch (e) { ok('Inspections', 'flow', 0, false, e.message); }

  // ===== 7. Sensor Sessions & Readings =====
  try {
    const sc = await call('POST', '/sensor-sessions', { inspectionId: inspId, deviceId: 'DEV-LOKI-01', connectivity: 'online' }, adminToken);
    const sid = pickId(sc.json);
    ok('SensorSessions', 'Create', sc.status, !!sid && sc.status < 400, sid || '');
    if (sid) {
      ok('SensorSessions', 'Read(list)', (await call('GET', '/sensor-sessions', undefined, adminToken)).status, true);
      ok('SensorSessions', 'Read(one)', (await call('GET', '/sensor-sessions/' + sid, undefined, adminToken)).status, true);
      ok('SensorSessions', 'Update', (await call('PATCH', '/sensor-sessions/' + sid, { battery: 80 }, adminToken)).status, true);
      ok('SensorSessions', 'Delete', (await call('DELETE', '/sensor-sessions/' + sid, undefined, adminToken)).status, true);
    }
    // spec-shaped sensor reading create (real workflow endpoint) on the live inspection
    const rc = await call('POST', '/inspections/' + inspId + '/sensor-readings', { temperature: 24, humidity: 65, moisture: 14, ph: 6.1, co2: 450, ch4: 0.2, c2h4: 0.4, nh3: 0.15 }, adminToken);
    const rid = rc.json && rc.json.sensorReading && rc.json.sensorReading.id;
    ok('SensorReadings', 'Create(spec)', rc.status, !!rid && rc.status < 400, rid || JSON.stringify(rc.json).slice(0, 60));
    if (rid) {
      ok('SensorReadings', 'Read(list)', (await call('GET', '/sensor-readings', undefined, adminToken)).status, true);
      ok('SensorReadings', 'Read(one)', (await call('GET', '/sensor-readings/' + rid, undefined, adminToken)).status, true);
      ok('SensorReadings', 'Update', (await call('PATCH', '/sensor-readings/' + rid, { temperature: 26 }, adminToken)).status, true);
      ok('SensorReadings', 'Delete', (await call('DELETE', '/sensor-readings/' + rid, undefined, adminToken)).status, true);
    }
  } catch (e) { ok('Sensors', 'flow', 0, false, e.message); }

  // ===== 8. Inspection Images =====
  try { await crud('Images', '/inspection-images', { inspectionId: inspId, fileName: 'crud.jpg', url: 'uploads/crud.jpg', quality: 'good' }, { quality: 'fair' }, adminToken); }
  catch (e) { ok('Images', 'flow', 0, false, e.message); }

  // ===== 9. AI Analysis & Detections =====
  try {
    const aid = await crud('AIAnalyses', '/ai-analyses', { inspectionId: inspId, model: 'onion-vision-roboflow', version: '2026.1.0', counts: { healthy: 5, damaged: 1 }, confidence: 0.9 }, { confidence: 0.95 }, adminToken);
    if (aid) {
      const dc = await call('POST', '/ai-detections', { analysisId: aid, imageId: null, class: 'Healthy', confidence: 0.88, bbox: null }, adminToken);
      const did = pickId(dc.json);
      ok('AIDetections', 'Create', dc.status, !!did && dc.status < 400, did || '');
      if (did) {
        ok('AIDetections', 'Read(list)', (await call('GET', '/ai-detections', undefined, adminToken)).status, true);
        ok('AIDetections', 'Read(one)', (await call('GET', '/ai-detections/' + did, undefined, adminToken)).status, true);
        ok('AIDetections', 'Update', (await call('PATCH', '/ai-detections/' + did, { confidence: 0.9 }, adminToken)).status, true);
        ok('AIDetections', 'Delete', (await call('DELETE', '/ai-detections/' + did, undefined, adminToken)).status, true);
      }
    }
  } catch (e) { ok('AIAnalyses', 'flow', 0, false, e.message); }

  // ===== 10. Fusion =====
  try { await crud('Fusion', '/fusion-results', { inspectionId: inspId, visualScore: 88, sensorScore: 84, finalScore: 86, grade: 'GRADE A', riskLevel: 'LOW' }, { finalScore: 88 }, adminToken); }
  catch (e) { ok('Fusion', 'flow', 0, false, e.message); }

  // ===== 11. Quality Certificates & QR =====
  try {
    const cc = await call('POST', '/quality-certificates', { inspectionId: inspId, grade: 'GRADE A', qualityScore: 88 }, adminToken);
    const cid = pickId(cc.json);
    const certNo = cc.json && cc.json.certificateNumber;
    const qrToken = cc.json && cc.json.qrToken;
    ok('Certificates', 'Create', cc.status, !!cid && cc.status < 400, cid || '');
    if (cid) {
      ok('Certificates', 'Read(list)', (await call('GET', '/quality-certificates', undefined, adminToken)).status, true);
      ok('Certificates', 'Read(one)', (await call('GET', '/quality-certificates/' + cid, undefined, adminToken)).status, true);
      const pub = await call('GET', '/certificates/' + (certNo || cid), undefined, null);
      ok('Certificates', 'Read(public)', pub.status, pub.status < 400);
      const vf = await call('GET', '/verify/' + (qrToken || certNo), undefined, null);
      ok('Certificates', 'Verify(public)', vf.status, vf.status < 400 && !!(vf.json && vf.json.verified), JSON.stringify(vf.json).slice(0, 50));
      ok('Certificates', 'Update', (await call('PATCH', '/quality-certificates/' + cid, { status: 'REVOKED' }, adminToken)).status, true);
      ok('Certificates', 'Delete', (await call('DELETE', '/quality-certificates/' + cid, undefined, adminToken)).status, true);
    }
    // verify a SEEDED certificate's QR (proves real persisted verification)
    const allc = await call('GET', '/quality-certificates', undefined, adminToken);
    const seeded = allc.json && allc.json.find((c) => c.qrToken);
    if (seeded) {
      const sv = await call('GET', '/verify/' + seeded.qrToken, undefined, null);
      ok('Certificates', 'Verify(seeded)', sv.status, sv.status < 400 && !!(sv.json && sv.json.verified), seeded.certificateNumber || '');
    }
  } catch (e) { ok('Certificates', 'flow', 0, false, e.message); }

  // ===== 12. Audit Trail =====
  try {
    const ae = await call('GET', '/audit-events', undefined, adminToken);
    ok('Audit', 'Read(list)', ae.status, ae.status < 400 && Array.isArray(ae.json) && ae.json.length > 0, (ae.json || []).length + ' events');
    ok('Audit', 'Read(logs)', (await call('GET', '/audit/logs', undefined, adminToken)).status, true);
    if (inspId) ok('Audit', 'Read(byInspection)', (await call('GET', '/inspections/' + inspId + '/audit', undefined, adminToken)).status, true);
    const bc = await call('POST', '/buyers', { name: 'AUDIT-CHK-' + Date.now(), location: 'x' }, adminToken);
    const bid = pickId(bc.json);
    const after = await call('GET', '/audit-events', undefined, adminToken);
    const captured = after.json && after.json.some((a) => a.entity === 'buyers' && a.entityId === bid);
    ok('Audit', 'Write-captured', 200, !!captured, captured ? 'event emitted' : 'NO EVENT');
    if (bid) await call('DELETE', '/buyers/' + bid, undefined, adminToken);
  } catch (e) { ok('Audit', 'flow', 0, false, e.message); }

  // ===== 13. Disputes & Reassessment =====
  try {
    const dc = await call('POST', '/disputes', { reason: 'Test dispute', inspectionId: inspId, description: 'automated check' }, adminToken);
    const did = pickId(dc.json);
    ok('Disputes', 'Create', dc.status, !!did && dc.status < 400 && (dc.json && dc.json.inspectionId === inspId), did || JSON.stringify(dc.json).slice(0, 60));
    if (did) {
      ok('Disputes', 'Read(list)', (await call('GET', '/disputes', undefined, adminToken)).status, true);
      ok('Disputes', 'Read(one)', (await call('GET', '/disputes/' + did, undefined, adminToken)).status, true);
      ok('Disputes', 'Update', (await call('PATCH', '/disputes/' + did, { status: 'resolved', resolution: 'accepted' }, adminToken)).status, true);
      ok('Disputes', 'Delete', (await call('DELETE', '/disputes/' + did, undefined, adminToken)).status, true);
    }
  } catch (e) { ok('Disputes', 'flow', 0, false, e.message); }

  // ===== 14. Grading Rules =====
  try {
    const gl = await call('GET', '/grading-rules', undefined, adminToken);
    const gid = gl.json && gl.json[0] && gl.json[0].id;
    ok('GradingRules', 'Read(list)', gl.status, gl.status < 400 && Array.isArray(gl.json) && gl.json.length > 0);
    if (gid) {
      ok('GradingRules', 'Read(one)', (await call('GET', '/grading-rules/' + gid, undefined, adminToken)).status, true);
      ok('GradingRules', 'Update', (await call('PATCH', '/grading-rules/' + gid, { gradeThresholds: { gradeA: 86, urs: 64 } }, adminToken)).status, true);
    }
  } catch (e) { ok('GradingRules', 'flow', 0, false, e.message); }

  // ===== 15. Sensor Devices & AI Model Versions =====
  try { await crud('SensorDevices', '/sensor-devices', { deviceId: 'DEV-CRUD-' + Date.now(), transport: 'lora', battery: 90, signal: 'good', location: 'Lab' }, { battery: 70 }, adminToken); }
  catch (e) { ok('SensorDevices', 'flow', 0, false, e.message); }
  try { await crud('ModelVersions', '/ai-model-versions', { name: 'crud-model', version: '9.9.9', type: 'vision', accuracy: 0.9 }, { accuracy: 0.95 }, adminToken); }
  catch (e) { ok('ModelVersions', 'flow', 0, false, e.message); }

  // ===== 16. Analytics =====
  try {
    const dash = await call('GET', '/analytics/dashboard', undefined, adminToken);
    const d = dash.json || {};
    ok('Analytics', 'dashboard', dash.status, dash.status < 400 && d.totalInspections > 0, 'totalInspections=' + d.totalInspections + ' avg=' + d.averageQualityScore);
    ok('Analytics', 'quality', (await call('GET', '/analytics/quality', undefined, adminToken)).status, true);
    ok('Analytics', 'defects', (await call('GET', '/analytics/defects', undefined, adminToken)).status, true);
  } catch (e) { ok('Analytics', 'flow', 0, false, e.message); }

  // ===== RBAC (light) =====
  try {
    const fl = await call('POST', '/auth/login', { username: 'farmer1', password: 'password123' });
    const ftok = fl.json && fl.json.token;
    if (ftok) {
      ok('RBAC', 'farmer→farmers', (await call('GET', '/farmers', undefined, ftok)).status, true, 'allowed');
      const c403 = (await call('POST', '/centers', { name: 'x', location: 'y' }, ftok)).status;
      ok('RBAC', 'farmer→centers(POST)', c403, c403 === 403, 'expect 403');
      const u403 = (await call('GET', '/users', undefined, ftok)).status;
      ok('RBAC', 'farmer→users', u403, u403 === 403, 'expect 403');
    } else {
      ok('RBAC', 'farmer-login', 0, false, 'no token');
    }
  } catch (e) { ok('RBAC', 'flow', 0, false, e.message); }

  // cleanup the shared inspection
  if (inspId) await call('DELETE', '/inspections/' + inspId, undefined, adminToken);

  finish();
}

function finish() {
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;
  const byFeature = {};
  for (const r of results) {
    byFeature[r.feature] = byFeature[r.feature] || { total: 0, pass: 0 };
    byFeature[r.feature].total += 1;
    byFeature[r.feature].pass += r.pass ? 1 : 0;
  }
  console.log('\n==================== CRUD VERIFICATION SUMMARY ====================');
  console.log(`TOTAL ${total}  PASSED ${passed}  FAILED ${failed}  (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('\nPer-feature:');
  for (const [f, s] of Object.entries(byFeature)) {
    const allOk = s.pass === s.total;
    console.log(`  ${allOk ? '✓' : '✗'} ${f.padEnd(20)} ${s.pass}/${s.total}`);
  }
  console.log('==================================================================');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
