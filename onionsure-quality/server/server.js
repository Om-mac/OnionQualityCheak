const express = require('express');
const cors = require('cors');
const multer = require('multer');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const PYTHON_SERVICE = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';

function forwardToPython(buffer, filename, cb) {
  const boundary = '----onionsure' + Date.now();
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const url = new URL(`${PYTHON_SERVICE}/api/detect`);
  const req = http.request({
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
  }, (resp) => {
    let data = '';
    resp.on('data', (c) => (data += c));
    resp.on('end', () => {
      try { cb(null, JSON.parse(data)); } catch (e) { cb(new Error('Invalid response from AI service')); }
    });
  });
  req.on('error', (e) => cb(e));
  req.setTimeout(60000, () => { req.destroy(new Error('AI service timeout')); });
  req.write(body);
  req.end();
}

app.post('/api/detect', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  forwardToPython(req.file.buffer, req.file.originalname || 'upload.jpg', (err, result) => {
    if (err) return res.status(502).json({ error: err.message });
    res.json(result);
  });
});

app.post('/api/detect-base64', express.json({ limit: '15mb' }), (req, res) => {
  try {
    const b64 = req.body.image || req.body.image_base64;
    if (!b64) return res.status(400).json({ error: 'Missing image field' });

    const payload = JSON.stringify({ image: b64 });
    const url = new URL(`${PYTHON_SERVICE}/api/detect-base64`);
    const req2 = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (resp) => {
      let data = '';
      resp.on('data', (c) => (data += c));
      resp.on('end', () => {
        try { res.json(JSON.parse(data)); } catch (e) { res.status(502).json({ error: 'Invalid AI response' }); }
      });
    });
    req2.on('error', (e) => res.status(502).json({ error: e.message }));
    req2.setTimeout(60000, () => { req2.destroy(new Error('AI service timeout')); });
    req2.write(payload);
    req2.end();
  } catch (e) {
    res.status(400).json({ error: 'Invalid request' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'onionsure-quality', pythonService: PYTHON_SERVICE });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n  OnionSure Quality API running on http://localhost:${PORT}`);
  console.log(`  Python AI service: ${PYTHON_SERVICE}\n`);
});
