/* ============================================================
   ย้ายข้อมูลเดิมจาก data/apps.json ขึ้น Firebase Realtime Database
   (เขียนทั้งลิสต์ที่ path /apps — ตรงกับที่ Cloud Functions ใช้)

   เตรียม:
     1) ดาวน์โหลด Service Account Key ของโปรเจกต์ Firebase
        (โปรเจกต์ตั้งค่า → บัญชีบริการ → สร้างคีย์ใหม่ → JSON)
     2) ติดตั้ง dependency ของ functions:  cd functions && npm install

   วิธีใช้ (โหมด B — ไม่ต้องมี Cloud Functions):
     node tools/migrate-firebase.js --key=path/to/serviceAccountKey.json --admin=admin@example.com:รหัสผ่าน
     node tools/migrate-firebase.js --key=key.json --url=https://PROJECT-default-rtdb.firebasedatabase.app
     node tools/migrate-firebase.js --key=key.json --file=data/apps.json --path=/apps --dry-run

   ตัวเลือก:
     --key=...    ไฟล์ Service Account (หรือตั้ง env GOOGLE_APPLICATION_CREDENTIALS)
     --url=...    URL ฐานข้อมูล (ค่าเริ่มต้น: https://<project_id>-default-rtdb.firebaseio.com)
     --file=...   ไฟล์ข้อมูลต้นทาง (ค่าเริ่มต้น: data/apps.json)
     --path=...   path ใน RTDB (ค่าเริ่มต้น: /apps)
     --admin=...  สร้างบัญชีแอดมิน Firebase Auth ด้วย (รูปแบบ email:password, รหัส ≥ 6 ตัว)
     --dry-run    แสดงตัวอย่างโดยไม่เขียนจริง
   ============================================================ */
const fs = require('fs');
const path = require('path');

function arg(name, def) {
  const found = process.argv.find((a) => a.startsWith('--' + name + '='));
  return found ? found.split('=').slice(1).join('=') : def;
}

async function main() {
  const ROOT = path.join(__dirname, '..');
  const keyFile = arg('key', process.env.GOOGLE_APPLICATION_CREDENTIALS || '');
  const dataFile = path.join(ROOT, arg('file', 'data/apps.json'));
  const dbPath = arg('path', '/apps');
  const dryRun = process.argv.includes('--dry-run');
  const adminArg = arg('admin', '');

  if (!keyFile) {
    console.error('❌ ไม่พบ Service Account Key — ใช้ --key=path/to/serviceAccountKey.json');
    process.exit(1);
  }
  if (!fs.existsSync(keyFile)) {
    console.error('❌ ไม่พบไฟล์ key:', keyFile);
    process.exit(1);
  }
  if (!fs.existsSync(dataFile)) {
    console.error('❌ ไม่พบไฟล์ข้อมูล:', dataFile, '(ว่างเปล่า → ไม่มีอะไรให้ย้าย)');
    process.exit(1);
  }

  /* ใช้ firebase-admin จาก node_modules ของ functions/ */
  const admin = require(path.join(ROOT, 'functions', 'node_modules', 'firebase-admin'));

  const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
  const projectId = serviceAccount.project_id;
  const databaseURL =
    arg('url', '') ||
    (serviceAccount.database_url
      ? serviceAccount.database_url
      : `https://${projectId}-default-rtdb.firebaseio.com`);

  const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const list = Array.isArray(raw) ? raw : Array.isArray(raw.list) ? raw.list : null;
  if (!list) {
    console.error('❌ ข้อมูลใน', dataFile, 'ไม่ใช่ array — ตรวจสอบไฟล์');
    process.exit(1);
  }

  console.log('==========================================');
  console.log('โปรเจกต์ Firebase :', projectId);
  console.log('ฐานข้อมูล (RTDB)  :', databaseURL);
  console.log('path ปลายทาง      :', dbPath);
  console.log('จำนวนลูกค้า       :', list.length, 'รายการ');
  if (list.length) {
    console.log('ตัวอย่างรายแรก    :', list[0].name || list[0].first + ' ' + list[0].last || '(ไม่มีชื่อ)');
  }
  console.log('==========================================');

  if (dryRun) {
    console.log('🔎 โหมด dry-run — ยังไม่เขียนข้อมูลจริง');
    return;
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL });
  await admin.database().ref(dbPath).set(list);
  console.log('✅ ย้ายข้อมูลสำเร็จ —', list.length, 'รายการ ถูกเขียนที่', dbPath);

  /* สร้างบัญชีแอดมิน Firebase Auth (ถ้าใส่ --admin=email:password) */
  if (adminArg) {
    const idx = adminArg.indexOf(':');
    const email = idx > 0 ? adminArg.slice(0, idx).trim() : '';
    const password = idx > 0 ? adminArg.slice(idx + 1) : '';
    if (!email || !password) {
      console.error('❌ --admin ต้องเป็นรูปแบบ email:password');
      process.exit(1);
    }
    if (password.length < 6) {
      console.error('❌ รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      process.exit(1);
    }
    try {
      const rec = await admin.auth().createUser({ email, password });
      console.log('✅ สร้างบัญชีแอดมิน Firebase Auth:', email, '(UID: ' + rec.uid + ')');
    } catch (e) {
      console.error('❌ สร้างบัญชีแอดมินไม่สำเร็จ:', e.message, '— ไปสร้างเองที่คอนโซล → Authentication → Users ได้');
      process.exit(1);
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ เกิดข้อผิดพลาด:', e.message);
  process.exit(1);
});
