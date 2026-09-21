/* End-to-end test for the Live Camera real-time detection pipeline. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const BASE = 'http://localhost:4000';
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
      let out = ''; res.on('data', (c) => (out += c));
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(out) }); } catch { resolve({ status: res.statusCode, body: out }); } });
    });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}

(async () => {
  const login = await req('POST', '/api/auth/login', { username: 'officer1', password: 'password123' });
  const token = login.body.token;
  console.log('login:', login.status, login.body.user ? login.body.user.username : login.body.error);

  // pick a seeded inspection
  const insp = await req('GET', '/api/inspections?limit=1', null, token);
  const list = insp.body.data || insp.body.inspections || insp.body || [];
  const firstId = Array.isArray(list) ? (list[0] && (list[0].id || list[0].inspectionNumber)) : null;
  console.log('inspection list len:', Array.isArray(list) ? list.length : 'n/a', '| using:', firstId);

  // generate a test image (solid color is fine — validates pipeline; YOLO may find 0 onions)
  const tmp = path.join(__dirname, '_test_frame.jpg');
  execSync(`python3 -c "from PIL import Image; Image.new('RGB',(640,480),(120,90,60)).save('${tmp.replace(/\\/g, '/')}')"`);
  const b64 = fs.readFileSync(tmp).toString('base64');
  const dataUrl = `data:image/jpeg;base64,${b64}`;

  // LIVE DETECT
  const ld = await req('POST', `/api/inspections/${firstId}/ai-analysis/live-detect`, { image: dataUrl, confidenceThreshold: 0.25 }, token);
  console.log('\n[live-detect]', ld.status, ld.body.error || '');
  console.log('  mode:', ld.body.mode, '| total:', ld.body.total, '| counts:', JSON.stringify(ld.body.counts));
  console.log('  detections:', Array.isArray(ld.body.detections) ? ld.body.detections.length : 'n/a', '| confidence:', ld.body.confidence, '| visionScore:', ld.body.visionScore);

  // UPLOAD FRAME (multipart)
  const boundary = '----onionsuretest';
  const fileHead = `--${boundary}\r\nContent-Disposition: form-data; name="images"; filename="frame.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`;
  const fileTail = `\r\n--${boundary}--\r\n`;
  const payload = Buffer.concat([Buffer.from(fileHead, 'utf8'), fs.readFileSync(tmp), Buffer.from(fileTail, 'utf8')]);
  const up = await new Promise((resolve, reject) => {
    const r = http.request(BASE + `/api/inspections/${firstId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, Authorization: `Bearer ${token}`, 'Content-Length': payload.length },
    }, (res) => { let o = ''; res.on('data', (c) => (o += c)); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(o) }); } catch { resolve({ status: res.statusCode, body: o }); } }); });
    r.on('error', reject); r.write(payload); r.end();
  });
  const imgId = up.body.images && up.body.images[0] && up.body.images[0].id;
  console.log('\n[upload image]', up.status, '| imageId:', imgId);

  // AI ANALYSIS (real inference on the uploaded file)
  const ai = await req('POST', `/api/inspections/${firstId}/ai-analysis`, { imageId: imgId, confidenceThreshold: 0.25 }, token);
  console.log('[ai-analysis]', ai.status);
  console.log('  summary:', JSON.stringify(ai.body.summary));

  fs.unlinkSync(tmp);
  console.log('\nDONE');
})().catch((e) => { console.error('TEST ERROR:', e); process.exit(1); });
