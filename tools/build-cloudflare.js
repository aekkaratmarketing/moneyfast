/* สร้างโฟลเดอร์ deploy-ready สำหรับ Cloudflare Pages → dist/cloudflare/
   ใช้: node tools/build-cloudflare.js
   แล้วลากไฟล์ใน dist/cloudflare/ ขึ้น Cloudflare Pages (หรือต่อ GitHub)
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'cloudflare');

/* ไฟล์ที่ต้อง deploy (เหมือนที่ Firebase Hosting เสิร์ฟ) */
const FILES = [
  'admin.html',
  'manifest.json',
  'sw.js',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
];
const DIRS = [
  'vendor/fonts',
];
/* Pages Functions — หลังบ้าน /api/* (รันบน Cloudflare เดียวกันกับหน้าเว็บ) */
const FUNCS_DIR = 'functions';

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let count = 0;
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
  '/admin.html',
  '  Cache-Control: no-cache',
  '/vendor/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '/icon-*.png',
  '  Cache-Control: public, max-age=31536000, immutable',
  '/apple-touch-icon.png',
  '  Cache-Control: public, max-age=31536000, immutable',
  '',
].join('\n'));

/* _redirects — เสิร์ฟ admin.html ที่ root (API /api/* รันผ่าน Pages Functions ไม่ต้อง proxy) */
fs.writeFileSync(path.join(OUT, '_redirects'), '/ /admin.html 200\n');

console.log('✅ สร้างโฟลเดอร์ deploy-ready:', OUT);
console.log('   ไฟล์ทั้งหมด:', count, 'ไฟล์ + _headers + _redirects');
console.log('');
console.log('วิธี deploy:');
console.log('  1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Upload assets');
console.log('  2. ลากโฟลเดอร์ dist/cloudflare/ ไปวาง → Deploy');
console.log('  3. ตั้ง Project name เช่น moneyfast → ได้ลิงก์ https://moneyfast.pages.dev');
