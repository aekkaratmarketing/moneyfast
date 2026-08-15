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
console.log('✅ Sync www ครบ ' + copied + '/' + FILES.length + ' ไฟล์ →', WWW);
