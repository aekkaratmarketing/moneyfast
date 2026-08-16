/* สร้างโฟลเดอร์ deploy-ready สำหรับ Cloudflare Pages → dist/cloudflare/
   ใช้: npm run build  (vite build แล้วรันสคริปต์นี้ต่อ)
   คัดลอก static assets + Pages Functions + _headers/_redirects เข้า dist/cloudflare
*/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist', 'cloudflare');
const APP = path.join(ROOT, 'dist', 'app'); // ผล build ของ vite

/* ไฟล์ static ที่ต้อง deploy (vite สร้าง index.html + assets/ + public/ ให้แล้ว — manifest/icon อยู่ใน public/) */
const FILES = [
  'sw.js',
];
const DIRS = [];
/* Pages Functions — หลังบ้าน /api/* */
const FUNCS_DIR = 'functions';

/* ล้างโฟลเดอร์เก่า (กันไฟล์ค้างจาก build ก่อน) — ถ้าโฟลเดอร์ถูกล็อกให้พยายามลบเนื้อหาข้างในแทน */
function cleanDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); return; } catch (e) { /* busy */ }
  try {
    for (const f of fs.readdirSync(dir)) {
      fs.rmSync(path.join(dir, f), { recursive: true, force: true });
    }
  } catch (e) { /* ignore */ }
}

cleanDir(OUT);
fs.mkdirSync(OUT, { recursive: true });

let count = 0;
/* คัดลอกผล build ของ vite (index.html + assets/) เข้า dist/cloudflare */
if (fs.existsSync(APP)) {
  const walkApp = (dir, rel) => {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      const r = path.join(rel, f);
      if (fs.statSync(full).isDirectory()) {
        fs.mkdirSync(path.join(OUT, r), { recursive: true });
        walkApp(full, r);
      } else {
        fs.copyFileSync(full, path.join(OUT, r));
        count++;
      }
    }
  };
  walkApp(APP, '');
} else {
  console.warn('⚠️ ไม่พบผล build ของ vite (dist/app) — รัน npm run build ใหม่');
}

for (const f of FILES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) { console.warn('⚠️ ไม่พบ:', f); continue; }
  fs.copyFileSync(src, path.join(OUT, f));
  count++;
}
for (const d of DIRS) {
  const srcDir = path.join(ROOT, d);
  if (!fs.existsSync(srcDir)) { console.warn('⚠️ ไม่พบโฟลเดอร์:', d); continue; }
  fs.mkdirSync(path.join(OUT, d), { recursive: true });
  for (const f of fs.readdirSync(srcDir)) {
    fs.copyFileSync(path.join(srcDir, f), path.join(OUT, d, f));
    count++;
  }
}
/* คัดลอก functions/ (Pages Functions — หลังบ้าน /api/*) */
const srcFuncs = path.join(ROOT, FUNCS_DIR);
if (fs.existsSync(srcFuncs)) {
  const walk = (dir, rel) => {
    fs.mkdirSync(path.join(OUT, rel), { recursive: true });
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      const r = path.join(rel, f);
      if (fs.statSync(full).isDirectory()) walk(full, r);
      else { fs.copyFileSync(full, path.join(OUT, r)); count++; }
    }
  };
  walk(srcFuncs, FUNCS_DIR);
}

/* _headers — sw.js ห้าม cache (ต้องได้เวอร์ชันใหม่เสมอ) + static cache ยาว */
fs.writeFileSync(path.join(OUT, '_headers'), [
  '/*',
  '  X-Frame-Options: SAMEORIGIN',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '/sw.js',
  '  Cache-Control: no-cache, no-store, must-revalidate',
  '/manifest.json',
  '  Cache-Control: public, max-age=3600',
  '/index.html',
  '  Cache-Control: no-cache',
  '/assets/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '/fonts/fonts.css',
  '  Cache-Control: no-cache',
  '/fonts/*.woff2',
  '  Cache-Control: public, max-age=31536000, immutable',
  '/vendor/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '/icon-*.png',
  '  Cache-Control: public, max-age=31536000, immutable',
  '/apple-touch-icon.png',
  '  Cache-Control: public, max-age=31536000, immutable',
  '',
].join('\n'));

/* _redirects — เสิร์ฟ index.html ที่ root + /admin (API /api/* รันผ่าน Pages Functions) */
fs.writeFileSync(path.join(OUT, '_redirects'), [
  '/ /index.html 200',
  '/admin /index.html 200',
  '/admin/ /index.html 200',
  '/admin.html / 301',
  '',
].join('\n'));

console.log('✅ ประกอบโฟลเดอร์ deploy-ready:', OUT);
console.log('   ไฟล์ทั้งหมด:', count, 'ไฟล์ + _headers + _redirects');
