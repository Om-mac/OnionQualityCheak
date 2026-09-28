/* One-off migration: move embedded image blobs out of db.json.
 *
 * Background
 * ----------
 * Analysis rows were storing annotated frames inline as base64. Two paths did it:
 *   1. api.js persistVision()        -> record.annotatedImage          (~457 KB as a data: URL)
 *   2. ai-analysis-routes.js         -> record.resultJson.rawResult.annotated_image_base64 (~164 KB)
 * Together they accounted for ~4.6 MB of a 6.8 MB database. Because persist()
 * rewrote the whole file synchronously on every mutation, that bloat is what
 * made the API slow enough to stall page loads.
 *
 * Both writers are now fixed. This script cleans up the rows already on disk:
 *   - a data: URL in `annotatedImage` is written to uploads/ and replaced by its URL
 *   - redundant base64 copies under resultJson.rawResult are dropped
 *
 * Safe to re-run: it only rewrites records that still carry blobs, and it backs
 * up db.json first.
 *
 * Usage:  node server/_migrate_strip_blobs.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, 'data', 'db.json');
const UPLOADS = path.join(__dirname, 'uploads', 'inspections');

const BLOB_KEYS = [
  'annotated_image_base64',
  'annotated_image',
  'annotatedImageBase64',
  'image_base64',
];

function persistDataUrl(inspectionId, dataUrl) {
  const m = /^data:image\/(\w+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
  const dir = path.join(UPLOADS, inspectionId || 'unassigned');
  fs.mkdirSync(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-annotated.${ext}`;
  fs.writeFileSync(path.join(dir, name), Buffer.from(m[2], 'base64'));
  return `/uploads/inspections/${inspectionId || 'unassigned'}/${name}`;
}

function main() {
  const before = fs.statSync(DATA_FILE).size;
  const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  // Back up before touching anything.
  const backup = `${DATA_FILE}.bak-${Date.now()}`;
  fs.copyFileSync(DATA_FILE, backup);

  const rows = db.ai_analyses || [];
  let extracted = 0;
  let dropped = 0;
  let reclaimed = 0;

  for (const row of rows) {
    // 1. Inline annotatedImage data URL -> file on disk.
    if (typeof row.annotatedImage === 'string' && row.annotatedImage.startsWith('data:')) {
      const size = row.annotatedImage.length;
      const url = persistDataUrl(row.inspectionId, row.annotatedImage);
      if (url) {
        row.annotatedImage = url;
        extracted++;
        reclaimed += size - url.length;
      } else {
        row.annotatedImage = null;
        dropped++;
        reclaimed += size;
      }
    }

    // 2. Redundant base64 copies nested in the stored detector response.
    const raw = row.resultJson && row.resultJson.rawResult;
    if (raw && typeof raw === 'object') {
      for (const k of BLOB_KEYS) {
        if (typeof raw[k] === 'string' && raw[k].length > 1000) {
          reclaimed += raw[k].length;
          delete raw[k];
          dropped++;
        }
      }
    }
  }

  // Keep it readable without inflating the file the way `null, 2` did.
  fs.writeFileSync(DATA_FILE, JSON.stringify(db));

  const after = fs.statSync(DATA_FILE).size;
  console.log('--- blob migration ---');
  console.log(`  analysis rows scanned : ${rows.length}`);
  console.log(`  images written to disk: ${extracted}`);
  console.log(`  blobs dropped         : ${dropped}`);
  console.log(`  approx reclaimed      : ${Math.round(reclaimed / 1024)} KB`);
  console.log(`  db.json               : ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB`);
  console.log(`  backup                : ${path.basename(backup)}`);
}

main();
