/* ตั้งค่า KV ครั้งแรก: สร้างบัญชีแอดมิน (PBKDF2) + ย้ายข้อมูลจาก Firebase RTDB ขึ้น KV
   ใช้: node tools/setup-cloudflare-kv.js
   ต้องมี env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, KV_NAMESPACE_ID
*/
const https = require('https');

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCT = process.env.CLOUDFLARE_ACCOUNT_ID;
const NS = process.env.KV_NAMESPACE_ID;
const ADMIN_USER = 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '123456';

async function hashPassword(password, saltHex, iterations = 100000) {
  const salt = Buffer.from(saltHex, 'hex');
  const enc = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return Buffer.from(bits).toString('hex');
}

function kvPut(key, value) {
  return new Promise((resolve, reject) => {
    const url = `https://api.cloudflare.com/client/v4/accounts/${ACCT}/storage/kv/namespaces/${NS}/values/${encodeURIComponent(key)}`;
    const req = https.request(url, { method: 'PUT', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/octet-stream' } }, (r) => {
      let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => resolve({ status: r.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(value);
    req.end();
  });
}

function post(url, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (r) => {
      let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => resolve({ status: r.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

(async () => {
  if (!TOKEN || !ACCT || !NS) { console.log('❌ ต้องตั้ง env CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / KV_NAMESPACE_ID'); process.exit(1); }

  /* 1. สร้าง admin record */
  const salt = crypto.randomUUID().replace(/-/g, '');
  const passwordHash = await hashPassword(ADMIN_PASS, salt);
  const admin = { username: ADMIN_USER, salt, passwordHash };
  const r1 = await kvPut('admin', JSON.stringify(admin));
  console.log('✅ เขียน admin ลง KV:', r1.status, '| user:', ADMIN_USER, '/ pass:', ADMIN_PASS);

  /* 2. ย้ายข้อมูลจาก Firebase RTDB (ถ้ามี) — ใช้บัญชี admin@moneyfast.local ที่ตั้งไว้ */
  let apps = [];
  try {
    const apiKey = process.env.FB_API_KEY;
    if (apiKey) {
      const tok = JSON.parse((await post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, { email: 'admin@moneyfast.local', password: ADMIN_PASS, returnSecureToken: true })).body);
      const idToken = tok.idToken;
      if (idToken) {
        const r = await post(`https://moneyfast-b0ac0-default-rtdb.asia-southeast1.firebasedatabase.app/apps.json?auth=${idToken}`, {});
        // GET via POST? no — need GET. Use https.get instead.
        const raw = await new Promise((resolve, reject) => {
          https.get(`https://moneyfast-b0ac0-default-rtdb.asia-southeast1.firebasedatabase.app/apps.json?auth=${idToken}`, (res) => {
            let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => resolve(d));
          }).on('error', reject);
        });
        const parsed = JSON.parse(raw);
        apps = Array.isArray(parsed) ? parsed : [];
        console.log('📦 อ่านข้อมูลจาก Firebase RTDB:', apps.length, 'รายการ');
      } else {
        console.log('⚠️ ไม่ได้ token Firebase (ข้ามการย้าย)');
      }
    } else {
      console.log('ℹ️ ไม่มี FB_API_KEY — ข้ามการย้ายข้อมูล Firebase (เริ่มจากว่าง)');
    }
  } catch (e) {
    console.log('⚠️ ย้ายข้อมูล Firebase ไม่สำเร็จ (ข้าม):', e.message);
  }

  /* 3. เขียนข้อมูลลง KV */
  const r2 = await kvPut('apps', JSON.stringify(apps));
  console.log('✅ เขียน apps ลง KV:', r2.status, '| จำนวน:', apps.length);

  console.log('\nเสร็จสิ้น! ทดสอบ: curl -X POST https://moneyfast-api.moneyfast-app.workers.dev/api/login ...');
})().catch((e) => { console.error('ERR', e); process.exit(1); });
