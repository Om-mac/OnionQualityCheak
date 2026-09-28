/* End-to-end grade verification against the LIVE stack.
 *
 * Proves the frame-edge fix on the real HTTP path, not just the Flask service:
 *   login -> create inspection -> upload a REAL onion photo -> run AI analysis
 *   (server-side YOLO) -> read fusion evidence -> calculate fusion -> assert grade.
 *
 * Two fixtures, because a fix that only makes clean lots pass is worthless if it
 * also lets rotten lots through:
 *   hero-batch-red.jpg  (clean red-onion batch)  -> expect GRADE A
 *   moldy-tray.jpg      (heavily mouldy tray)    -> expect REJECTED
 *
 * Run with the API on :4000 and the YOLO service on :5000:
 *   node server/_verify_grade_e2e.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE = 'http://localhost:4000';
const PUBLIC_ONIONS = path.join(__dirname, '..', 'web', 'public', 'onions');

function req(method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(BASE + p, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let out = '';
      res.on('data', (c) => (out += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(out) }); }
        catch { resolve({ status: res.statusCode, body: out }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function uploadImage(inspectionId, filePath, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----onionsuregradecheck';
    const head = `--${boundary}\r\nContent-Disposition: form-data; name="images"; filename="${path.basename(filePath)}"\r\nContent-Type: image/jpeg\r\n\r\n`;
    const tail = `\r\n--${boundary}--\r\n`;
    const payload = Buffer.concat([
      Buffer.from(head, 'utf8'), fs.readFileSync(filePath), Buffer.from(tail, 'utf8'),
    ]);
    const r = http.request(BASE + `/api/inspections/${inspectionId}/images`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${token}`,
        'Content-Length': payload.length,
      },
    }, (res) => {
      let o = '';
      res.on('data', (c) => (o += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(o) }); }
        catch { resolve({ status: res.statusCode, body: o }); }
      });
    });
    r.on('error', reject);
    r.write(payload);
    r.end();
  });
}

const readDb = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'db.json'), 'utf8'));

async function scenario(label, imageFile, token, centre, expectGrade) {
  console.log('\n' + '='.repeat(72));
  console.log(`${label}  (${imageFile})`);
  console.log('='.repeat(72));

  const created = await req('POST', '/api/inspections', {
    farmerName: 'Grade Verification Farmer',
    farmerContact: '9000000000',
    fpoName: 'Verification FPO',
    procurementCenterId: centre.id,
    centreName: centre.name,
    crop: 'ONION',
    variety: 'Nashik Red',
    quantity: 500,
    quantityUnit: 'KG',
  }, token);

  const sess = created.body.inspection || created.body.session || created.body;
  const inspectionId = sess.id || sess.inspectionNumber;
  console.log('  created inspection:', inspectionId, `(HTTP ${created.status})`);
  if (!inspectionId) { console.log('  BODY:', JSON.stringify(created.body).slice(0, 300)); return null; }

  const up = await uploadImage(inspectionId, path.join(PUBLIC_ONIONS, imageFile), token);
  const imgId = up.body.images && up.body.images[0] && up.body.images[0].id;
  console.log('  uploaded image:', imgId, `(HTTP ${up.status})`);
  if (!imgId) { console.log('  BODY:', JSON.stringify(up.body).slice(0, 300)); return null; }

  // Real server-side inference over the stored file.
  const ai = await req('POST', `/api/inspections/${inspectionId}/ai-analysis`, {
    imageId: imgId, confidenceThreshold: 0.25,
  }, token);
  console.log('  ai-analysis HTTP', ai.status);
  const summary = ai.body.summary || ai.body;
  console.log('    counts:', JSON.stringify(summary.counts || summary));
  if (ai.body.flaggedForReview) console.log('    flagged for manual review:', ai.body.flaggedForReview);
  if (ai.status !== 200) { console.log('    BODY:', JSON.stringify(ai.body).slice(0, 300)); }

  // What Fusion actually sees.
  const ev = await req('GET', `/api/fusion/evidence/${inspectionId}`, null, token);
  const e = ev.body || {};
  console.log('  fusion evidence: hasVision=' + e.hasVision, 'hasIoT=' + e.hasIoT);
  console.log('    visionScore:', e.vision?.visionScore, '| counts:', JSON.stringify(e.vision?.counts));

  // Mirror the mapping the Fusion workspace uses (evidence exposes `iot`, the
  // calculate endpoint wants `gas` + `environment`).
  const visionPayload = e.hasVision && e.vision ? {
    visionScore: e.vision.visionScore,
    confidence: e.vision.confidence,
    counts: e.vision.counts,
    percentages: e.vision.percentages,
    total: e.vision.total,
  } : {
    visionScore: 0, confidence: 0, total: 0,
    counts: { healthy: 0, damaged: 0, rotten: 0, sprouted: 0, undersized: 0 },
    percentages: { healthy: 0, damaged: 0, rotten: 0, sprouted: 0, undersized: 0 },
  };
  const gasPayload = e.hasIoT && e.iot ? {
    stage: e.iot.stage,
    gasScore: e.iot.gasScore,
    confidence: e.iot.confidence,
    readings: { temperature: 24.2, humidity: 60.5 },
  } : {
    stage: 'LOW', gasScore: 0, confidence: 0,
    readings: { temperature: 24.2, humidity: 60.5 },
  };

  const fusion = await req('POST', '/api/fusion/calculate', {
    vision: visionPayload,
    gas: gasPayload,
    environment: {
      environmentScore: (e.iot && e.iot.environmentScore) ?? 88,
      confidence: 0.90, temperature: 24.2, humidity: 60.5,
    },
    forceDegraded: !e.hasVision || !e.hasIoT,
  }, token);

  const f = fusion.body || {};
  if (fusion.status !== 200) {
    console.log('  fusion HTTP', fusion.status, 'BODY:', JSON.stringify(fusion.body).slice(0, 400));
  }
  console.log('  FUSION -> grade:', f.grade, '| score:', f.finalScore, '| conf:', f.confidence, '| risk:', f.spoilageRisk);
  console.log('    defects%:', f.totalDefectsPercentage, '| trace:', (f.rulesTrace || []).map((r) => r.id + ':' + r.status).join(' '));

  const ok = String(f.grade || '').includes(expectGrade);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  expected grade to include "${expectGrade}", got "${f.grade}"`);
  return { inspectionId, grade: f.grade, ok };
}

(async () => {
  const login = await req('POST', '/api/auth/login', { username: 'officer1', password: 'password123' });
  const token = login.body.token;
  if (!token) { console.error('login failed:', JSON.stringify(login.body)); process.exit(1); }
  console.log('login:', login.status, login.body.user ? login.body.user.username : '');

  const db = readDb();
  const centre = (db.procurement_centers || [])[0];
  if (!centre) { console.error('no procurement centre found'); process.exit(1); }
  console.log('using centre:', centre.id, centre.name);

  const results = [];
  results.push(await scenario('CLEAN BATCH (was wrongly REJECTED before the fix)', 'hero-batch-red.jpg', token, centre, 'GRADE A'));
  results.push(await scenario('CLEAN BATCH with one ambiguous bulb (uncertainty band)', 'healthy-cluster.jpg', token, centre, 'GRADE A'));
  results.push(await scenario('ROTTEN BATCH (must stay REJECTED)', 'moldy-tray.jpg', token, centre, 'REJECTED'));

  console.log('\n' + '='.repeat(72));
  console.log('ASSERTIONS');
  let allPass = true;
  for (const r of results) {
    if (!r) { allPass = false; continue; }
    if (!r.ok) allPass = false;
  }
  console.log(allPass ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
  process.exit(allPass ? 0 : 1);
})().catch((e) => { console.error('TEST ERROR:', e); process.exit(1); });
