/**
 * OnionSure — Governance & Integrity Test.
 * Covers the remaining spec functions not exercised by the other two suites:
 * dispute lifecycle, human override with mandatory reason, audit trail, and
 * configurable fusion/grading rules.
 */
const BASE = 'http://localhost:4000/api';
const results = [];
function ok(step, cond, extra = '') {
  results.push({ step, pass: !!cond, extra });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${step}${extra ? '  — ' + extra : ''}`);
}
async function req(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  try {
    const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  } catch (e) { return { status: 0, json: null, text: e.message }; }
}

(async () => {
  console.log('\n===== GOVERNANCE & INTEGRITY TEST =====\n');

  const off = await req('/auth/login', { method: 'POST', body: { username: 'officer1', password: 'password123' } });
  const offT = off.json?.token;
  const farm = await req('/auth/login', { method: 'POST', body: { username: 'farmer1', password: 'password123' } });
  const farmT = farm.json?.token;
  const farmerId = farm.json?.user?.farmerId;
  const adm = await req('/auth/login', { method: 'POST', body: { username: 'admin', password: 'password123' } });
  const admT = adm.json?.token;
  ok('1. Officer + farmer + admin login', !!offT && !!farmT && !!admT, `status=${off.status}/${farm.status}/${adm.status}`);
  if (!offT) process.exit(1);

  // Build a graded inspection OWNED BY farmer1 so the dispute is legitimate
  const start = await req('/inspection/start', {
    method: 'POST', token: offT,
    body: { crop: 'Onion', quantity: 500, farmerId: farmerId || 'FRM-000421' },
  });
  const INS = start.json?.id;
  ok('2. Create inspection', start.status === 201 && !!INS, `id=${INS}`);
  if (!INS) process.exit(1);

  await req(`/inspection/${INS}/sensors`, {
    method: 'POST', token: offT,
    body: { temperature: 24.0, humidity: 62, moisture: 13, ph: 6.0, co2: 410, ch4: 0.1, c2h4: 0.3, nh3: 0.05 },
  });
  await req(`/inspection/${INS}/images`, { method: 'POST', token: offT, body: { angle: 'front', fileName: 'gov.jpg' } });
  const ana = await req(`/inspection/${INS}/analyze`, { method: 'POST', token: offT, body: {} });
  ok('3. Grade produced', !!ana.json?.fusion?.grade, `grade=${ana.json?.fusion?.grade}`);

  const cert = await req('/certificates/generate', { method: 'POST', token: offT, body: { inspectionId: INS } });
  ok('4. Certificate issued', cert.status === 201, `cert=${cert.json?.certificateNumber}`);

  // ── Dispute lifecycle ────────────────────────────────────────────────
  const d1 = await req('/disputes', {
    method: 'POST', token: farmT,
    body: { inspectionId: INS, reason: 'GRADE_DISPUTE', description: 'Governance test dispute' },
  });
  const DID = d1.json?.id;
  ok('5. Farmer raises dispute by Inspection ID', d1.status === 201 && !!DID, `status=${d1.status} id=${DID}`);

  if (DID) {
    const rev = await req(`/disputes/${DID}/review`, { method: 'POST', token: offT, body: { note: 'Reviewing' } });
    ok('6. Officer reviews dispute', rev.status === 200, `status=${rev.status}`);

    const rein = await req(`/disputes/${DID}/reinspect`, { method: 'POST', token: offT, body: { note: 'Re-inspection' } });
    ok('7. Officer orders re-inspection', rein.status === 200, `status=${rein.status}`);

    const acc = await req(`/disputes/${DID}/accept`, {
      method: 'POST', token: offT, body: { newGrade: 'GRADE A', note: 'Upheld' },
    });
    ok('8. Dispute resolved (accept)', acc.status === 200, `status=${acc.status}`);

    const got = await req(`/disputes/${DID}`, { token: offT });
    const tl = got.json?.dispute?.timeline || [];
    ok('9. Dispute timeline records every step', tl.length >= 3, `steps=${tl.length}`);
  }

  // ── Human override requires a reason ─────────────────────────────────
  const noReason = await req(`/inspections/${INS}/override`, {
    method: 'POST', token: offT, body: { newGrade: 'GRADE A' },
  });
  ok('10. Override rejected without reason (integrity)', noReason.status === 400, `status=${noReason.status}`);

  const ovr = await req(`/inspections/${INS}/override`, {
    method: 'POST', token: offT, body: { newGrade: 'GRADE A', reason: 'Verified manually by senior inspector' },
  });
  ok('11. Override accepted with reason', ovr.status === 200, `status=${ovr.status}`);

  // ── Audit trail ──────────────────────────────────────────────────────
  const aud = await req(`/inspections/${INS}/audit`, { token: offT });
  const ev = aud.json?.events || aud.json || [];
  ok('12. Audit timeline populated', aud.status === 200 && (Array.isArray(ev) ? ev.length : 1) > 0, `count=${Array.isArray(ev) ? ev.length : 'obj'}`);

  // ── Configurable rules ───────────────────────────────────────────────
  // Fusion rules are admin-governed: officer must be refused, admin allowed.
  const cfgOff = await req('/config/fusion', { token: offT });
  ok('13. Officer denied fusion config (governance)', cfgOff.status === 403, `status=${cfgOff.status}`);

  const cfg = await req('/config/fusion', { token: admT });
  ok('14. Admin reads fusion config', cfg.status === 200, `status=${cfg.status}`);

  const patch = await req('/config/fusion', {
    method: 'PATCH', token: admT,
    body: { weights: { vision: 0.5, gas: 0.3, environment: 0.2 } },
  });
  ok('15. Admin updates fusion config', patch.status === 200, `status=${patch.status}`);

  // ── Analytics ────────────────────────────────────────────────────────
  for (const [name, path] of [['dashboard', '/analytics/dashboard'], ['quality', '/analytics/quality'], ['defects', '/analytics/defects']]) {
    const r = await req(path, { token: offT });
    ok(`16. Analytics ${name}`, r.status === 200, `status=${r.status}`);
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n===== RESULT: ${passed}/${results.length} checks passed =====`);
  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    console.log('\nFAILED CHECKS:');
    failed.forEach((f) => console.log(`  - ${f.step} ${f.extra}`));
  }
})();
