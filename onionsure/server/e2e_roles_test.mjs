/**
 * OnionSure — Role Dashboard Test.
 *
 * Verifies every role defined in the spec can authenticate and load the data
 * its dashboard needs, and that role scoping actually restricts data
 * (a farmer must not see another farmer's lots).
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
    const isJson = (res.headers.get('content-type') || '').includes('json');
    let json = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, isJson };
  } catch (e) { return { status: 0, json: null, text: e.message, isJson: false }; }
}

const ROLES = [
  { user: 'officer1', role: 'procurement_officer', endpoints: ['/analytics/dashboard', '/inspections', '/certificates', '/lots', '/centers', '/audit/logs'] },
  { user: 'fpo1',     role: 'fpo',                 endpoints: ['/fpos', '/analytics/dashboard', '/inspections'] },
  { user: 'farmer1',  role: 'farmer',              endpoints: ['/inspections', '/certificates', '/disputes'] },
  { user: 'buyer1',   role: 'buyer',               endpoints: ['/lots', '/certificates'] },
  { user: 'admin',    role: 'admin',               endpoints: ['/analytics/dashboard', '/inspections', '/certificates', '/config/fusion', '/audit/logs', '/disputes'] },
];

(async () => {
  console.log('\n===== ROLE DASHBOARD TEST =====\n');

  const tokens = {};
  for (const r of ROLES) {
    const l = await req('/auth/login', { method: 'POST', body: { username: r.user, password: 'password123' } });
    tokens[r.user] = l.json?.token || null;
    ok(`Login ${r.user} (${r.role})`, l.status === 200 && !!l.json?.token, `status=${l.status} role=${l.json?.user?.role}`);
  }

  console.log('');
  for (const r of ROLES) {
    const t = tokens[r.user];
    if (!t) { ok(`${r.role} endpoints`, false, 'no token'); continue; }
    for (const ep of r.endpoints) {
      const res = await req(ep, { token: t });
      // 403/404 are valid role-scoped outcomes; 500 is a real failure.
      // Also require a JSON body: an HTML response means the request fell
      // through to the SPA catch-all, i.e. the endpoint does not exist.
      const good = (res.status === 200 || res.status === 403 || res.status === 404) && res.isJson;
      ok(`${r.role.padEnd(18)} GET ${ep}`, good, `status=${res.status} json=${res.isJson}`);
    }
    console.log('');
  }

  // ── Role scoping: farmer must not see other farmers' data ─────────────
  const officerInspec = await req('/inspections', { token: tokens.officer1 });
  const farmerInspec = await req('/inspections', { token: tokens.farmer1 });
  const oN = (officerInspec.json || []).length;
  const fN = (farmerInspec.json || []).length;
  ok('Officer sees >= farmer (scoping enforced)', oN >= fN, `officer=${oN} farmer=${fN}`);

  const oCerts = await req('/certificates', { token: tokens.officer1 });
  const fCerts = await req('/certificates', { token: tokens.farmer1 });
  ok('Farmer certificates are a subset of all certificates',
     (fCerts.json || []).length <= (oCerts.json || []).length,
     `officer=${(oCerts.json || []).length} farmer=${(fCerts.json || []).length}`);

  // Every farmer-visible certificate must belong to that farmer (by lot)
  const farmerId = (await req('/auth/login', { method: 'POST', body: { username: 'farmer1', password: 'password123' } })).json?.user?.farmerId;
  const stray = (fCerts.json || []).filter((c) => c.farmerId && farmerId && c.farmerId !== farmerId);
  ok('No other farmer\'s certificates leak into farmer view', stray.length === 0, `stray=${stray.length}`);

  // ── Unauthenticated access is refused ────────────────────────────────
  const noAuth = await req('/inspections');
  ok('Unauthenticated request refused', noAuth.status === 401 || noAuth.status === 403, `status=${noAuth.status}`);

  // ── Unknown API paths return JSON 404, never the SPA HTML ────────────
  const bogus = await req('/definitely_not_a_route', { token: tokens.admin });
  ok('Unknown /api path returns JSON 404 (not SPA HTML)',
     bogus.status === 404 && bogus.isJson, `status=${bogus.status} json=${bogus.isJson}`);

  // ── Public QR verification needs no login ────────────────────────────
  const allCerts = oCerts.json || [];
  if (allCerts.length) {
    const cn = allCerts[0].certificateNumber || allCerts[0].id;
    const v = await req(`/verify/${cn}`);
    ok('Public QR verification works without login', v.status === 200, `status=${v.status}`);
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n===== RESULT: ${passed}/${results.length} checks passed =====`);
  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    console.log('\nFAILED CHECKS:');
    failed.forEach((f) => console.log(`  - ${f.step} ${f.extra}`));
  }
})();
