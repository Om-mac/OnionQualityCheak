/**
 * Repro: certificate generation + QR verification for the CURRENT lot.
 * Usage: node repro_cert_flow.mjs
 */
const BASE = 'http://localhost:4000/api';

async function j(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { status: res.status, data };
}

const log = (label, v) => console.log(label, JSON.stringify(v).slice(0, 300));

async function main() {
  // 1. login
  const login = await j('POST', '/auth/login', null, { username: 'officer1', password: 'password123' });
  console.log('1. login:', login.status);
  const token = login.data?.token;
  if (!token) return console.log('LOGIN FAILED', login.data);

  // 2. list lots, pick one
  const lots = await j('GET', '/lots', token);
  console.log('2. lots:', lots.status, 'count=', lots.data?.length);
  const lot = lots.data?.[0];
  log('   first lot:', lot);

  // 3. start inspection
  const insp = await j('POST', '/inspection/start', token, { lotId: lot?.id, sampleWeightKg: 1.5, mode: 'DEMO' });
  console.log('3. inspection/start:', insp.status);
  const inspId = insp.data?.id || insp.data?.inspection?.id;
  console.log('   inspectionId:', inspId, 'full:', JSON.stringify(insp.data).slice(0, 200));

  // 4. sensors
  const sensors = await j('POST', `/inspection/${inspId}/sensors`, token, {
    temperature: 24, humidity: 60, co2: 450, ch4: 0.2, c2h4: 0.4, nh3: 0.12, moisture: 14, ph: 6,
  });
  console.log('4. sensors:', sensors.status, JSON.stringify(sensors.data).slice(0, 120));

  // 5. analyze
  const analyze = await j('POST', `/inspection/${inspId}/analyze`, token, { scenario: 'demo' });
  console.log('5. analyze:', analyze.status, JSON.stringify(analyze.data).slice(0, 200));

  // 6. fusion calculate + commit
  const fusion = await j('POST', '/fusion/calculate', token, {
    vision: { visionScore: 78, confidence: 0.9, total: 20, counts: { healthy: 15, damaged: 2, rotten: 1, sprouted: 1, undersized: 1 }, percentages: { healthy: 75, damaged: 10, rotten: 5, sprouted: 5, undersized: 5 } },
    gas: { stage: 'LOW', gasScore: 88, confidence: 0.85, readings: { temperature: 24, humidity: 60 } },
    environment: { environmentScore: 88, confidence: 0.9, temperature: 24, humidity: 60 },
    forceDegraded: false,
    isPreliminary: false,
  });
  console.log('6. fusion/calculate:', fusion.status, JSON.stringify(fusion.data).slice(0, 200));
  if (fusion.data?.finalScore != null) {
    const commit = await j('POST', '/fusion/commit', token, { inspectionId: inspId, lotId: lot?.id, fusionResult: fusion.data });
    console.log('6b. fusion/commit:', commit.status, JSON.stringify(commit.data).slice(0, 160));
  }

  // 7. generate certificate
  const cert = await j('POST', '/certificates/generate', token, { inspectionId: inspId });
  console.log('7. certificates/generate:', cert.status);
  log('   cert:', cert.data);
  const certNo = cert.data?.certificateNumber;
  const qrToken = cert.data?.qrToken;
  const certId = cert.data?.id;

  // 8. verify via cert number (public)
  if (certNo) {
    const v1 = await j('GET', `/verify/${certNo}`, null);
    console.log('8. verify by number:', v1.status, JSON.stringify(v1.data).slice(0, 220));
  }
  // 9. verify via qr token (public)
  if (qrToken) {
    const v2 = await j('GET', `/verify/${qrToken}`, null);
    console.log('9. verify by qrToken:', v2.status, JSON.stringify(v2.data).slice(0, 220));
  }
  // 10. verify via cert id (public)
  if (certId) {
    const v3 = await j('GET', `/verify/${certId}`, null);
    console.log('10. verify by id:', v3.status, JSON.stringify(v3.data).slice(0, 220));
  }
  // 11. authed certificate detail (what the certificate page uses)
  if (certId) {
    const d1 = await j('GET', `/certificates/${certId}`, token);
    console.log('11. GET /certificates/:id:', d1.status, JSON.stringify(d1.data).slice(0, 160));
  }
  // 12. verify via LOT NUMBER (what the printed certificate QR encodes)
  if (lot?.lotNumber) {
    const v4 = await j('GET', `/verify/${lot.lotNumber}`, null);
    console.log('12. verify by lotNumber:', v4.status, JSON.stringify(v4.data).slice(0, 200));
  }
  // 13. camera-only lot: /vision/analyze (multipart) → generate WITHOUT fusion/analyze
  const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
  const buf = Buffer.from(pngB64, 'base64');
  const fd = new FormData();
  fd.append('image', new Blob([buf], { type: 'image/png' }), 'frame.jpg');
  fd.append('inspectionId', inspId);
  const vision = await fetch(BASE + '/vision/analyze', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const visionData = await vision.json().catch(() => ({}));
  console.log('13. vision/analyze (camera frame):', vision.status, 'source=', visionData.source, 'total=', visionData.total);
  // new inspection on the same lot — skip sensors/analyze/fusion entirely
  const insp2 = await j('POST', '/inspection/start', token, { lotId: lot?.id, sampleWeightKg: 1.5, mode: 'DEMO' });
  const inspId2 = insp2.data?.id;
  const fd2 = new FormData();
  fd2.append('image', new Blob([buf], { type: 'image/png' }), 'frame.jpg');
  fd2.append('inspectionId', inspId2);
  const vision2 = await fetch(BASE + '/vision/analyze', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd2,
  });
  console.log('13b. vision for camera-only insp:', vision2.status, (await vision2.json())?.source);
  const cert2 = await j('POST', '/certificates/generate', token, { inspectionId: inspId2 });
  console.log('13c. certificate for CAMERA-ONLY lot:', cert2.status, JSON.stringify({
    cert: cert2.data?.certificateNumber, grade: cert2.data?.grade, score: cert2.data?.qualityScore, error: cert2.data?.error,
  }));
  // 14. QR code /verify/<certNo>/verify detail endpoint (used by certificate detail page)
  if (certNo) {
    const d2 = await j('GET', `/certificates/${certNo}/verify`, null);
    console.log('14. /certificates/:no/verify:', d2.status, 'valid=', d2.data?.valid, 'certNo=', d2.data?.certificate?.certificateNumber, 'gradeA%=', d2.data?.certificate?.gradeAPercentage);
  }
}

main().catch((e) => console.error('FATAL', e));
