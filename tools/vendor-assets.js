/* ดาวน์โหลด asset ที่เคยโหลดจาก CDN ภายนอก มาไว้ในโปรเจกต์เอง
   - Firebase JS SDK 11.6.0 (app/auth/database compat) → vendor/firebase/
   - ฟอนต์ Kanit + Noto Sans Lao (CSS + WOFF2) → public/fonts/  (vite คัดลอก public/ เข้า build อัตโนมัติ)
   ใช้: node tools/vendor-assets.js
*/
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function get(url, acceptGzip = false) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'GET', headers: { 'User-Agent': UA, ...(acceptGzip ? { 'Accept-Encoding': 'gzip' } : {}) } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        let buf = Buffer.concat(chunks);
        if (res.headers['content-encoding'] === 'gzip') buf = zlib.gunzipSync(buf);
        resolve({ status: res.statusCode, body: buf, type: res.headers['content-type'] });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function save(dir, name, data) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), data);
}

(async () => {
  /* ===== 1. Firebase SDK ===== */
  const fbDir = path.join(ROOT, 'vendor', 'firebase');
  const fbFiles = [
    'firebase-app-compat.js',
    'firebase-auth-compat.js',
    'firebase-database-compat.js',
  ];
  for (const f of fbFiles) {
    const url = `https://www.gstatic.com/firebasejs/11.6.0/${f}`;
    const r = await get(url, true);
    if (r.status !== 200) { console.log('❌ SDK ล้ม:', f, r.status); continue; }
    save(fbDir, f, r.body);
    console.log('✅ SDK', f, (r.body.length / 1024).toFixed(0) + 'KB');
  }

  /* ===== 2. ฟอนต์ ===== */
  const fontDir = path.join(ROOT, 'public', 'fonts');
  const cssUrl = 'https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&family=Noto+Sans+Lao:wght@300;400;500;600;700;800&display=swap';
  const css = await get(cssUrl);
  if (css.status !== 200) { console.log('❌ ฟอนต์ CSS ล้ม:', css.status); process.exit(1); }
  const cssText = css.body.toString('utf8');

  // หา URL ฟอนต์ทั้งหมด + เปลี่ยนเป็นชื่อไฟล์ท้องถิ่น
  const urlRe = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g;
  const urls = [...cssText.matchAll(urlRe)].map((m) => m[1]);
  console.log('พบฟอนต์', urls.length, 'ไฟล์ — กำลังดาวน์โหลด...');

  let newCss = cssText;
  for (const u of urls) {
    const name = u.split('/').pop();
    const r = await get(u);
    if (r.status !== 200) { console.log('❌ ฟอนต์ล้ม:', name, r.status); continue; }
    save(fontDir, name, r.body);
    newCss = newCss.replace(u, `./${name}`);
    console.log('✅ ฟอนต์', name, (r.body.length / 1024).toFixed(0) + 'KB');
  }
  // ย้าย @font-face ไปไว้ใน CSS ไฟล์เดียว (ตัด comment ของ Google ออก)
  newCss = newCss
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
  save(fontDir, 'fonts.css', newCss);
  console.log('✅ fonts.css (' + (newCss.length / 1024).toFixed(0) + 'KB) — มี @font-face', (newCss.match(/@font-face/g) || []).length, 'ชุด');
  console.log('\nเสร็จสิ้น — ไฟล์อยู่ใน vendor/ ครับ');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
