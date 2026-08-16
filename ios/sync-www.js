/* คัดลอกไฟล์เว็บจาก root โปรเจกต์ไปยัง ios/www (สำหรับ Capacitor)
   ใช้ตอน build .ipa ทั้งในเครื่องและใน GitHub Actions */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WWW = path.join(__dirname, 'www');
const FILES = [
  'admin.html',
  'manifest.json',
  'sw.js',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
];
/* โฟลเดอร์ที่ต้องคัดลอกทั้งชุด (Firebase SDK + ฟอนต์ที่ self-host แล้ว) */
const DIRS = [
  'vendor/firebase',
  'vendor/fonts',
];

fs.mkdirSync(WWW, { recursive: true });
let copied = 0;
for (const f of FILES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) {
    console.warn('⚠️ ไม่พบไฟล์ (ข้าม):', f);
    continue;
  }
  fs.copyFileSync(src, path.join(WWW, f));
  copied++;
}
for (const d of DIRS) {
  const srcDir = path.join(ROOT, d);
  if (!fs.existsSync(srcDir)) {
    console.warn('⚠️ ไม่พบโฟลเดอร์ (ข้าม):', d);
    continue;
  }
  fs.mkdirSync(path.join(WWW, d), { recursive: true });
  for (const f of fs.readdirSync(srcDir)) {
    fs.copyFileSync(path.join(srcDir, f), path.join(WWW, d, f));
    copied++;
  }
}
/* Capacitor กำหนด entry point ต้องเป็น index.html — คัดลอก admin.html เป็น index.html ด้วย */
fs.copyFileSync(path.join(ROOT, 'admin.html'), path.join(WWW, 'index.html'));
copied++;
console.log('✅ Sync www ครบ ' + copied + ' ไฟล์ →', WWW);
