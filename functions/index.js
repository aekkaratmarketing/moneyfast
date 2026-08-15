/* ============================================================
   MoneyFast — Cloud Functions (Firebase)
   แทนที่ server.js: REST API /api/apps อ่าน-เขียน Realtime Database
   (ข้อมูลอยู่ที่ path /apps ใน RTDB — บันทึกทั้งชุดเหมือน apps.json เดิม)

   ใช้ Cloud Functions v1 (classic) → deploy ได้บนแผนฟรี Spark
   (v2 ต้องใช้แผน Blaze เพราะรันบน Cloud Run)

   การ deploy:  firebase deploy --only functions
   URL ฐานข้อมูลตรวจจับอัตโนมัติ (รองรับ .firebaseio.com และ .firebasedatabase.app)
   — กรณีพิเศษที่ต้องบังคับเอง ตั้ง env:  firebase functions:secrets:set DATABASE_URL
   ============================================================ */
const functions = require('firebase-functions');
const admin = require('firebase-admin');

const DB_PATH = '/apps';

/* กัน initialize ซ้ำ (ตอน test ในเครื่อง module อาจถูก require หลายรอบ) */
if (admin.apps.length === 0) {
  try {
    if (process.env.DATABASE_URL) {
      /* กรณีพิเศษ: บังคับ URL เอง (เช่น ย้ายฐานข้อมูล หรือใช้ database ตัวอื่น) */
      admin.initializeApp({ databaseURL: process.env.DATABASE_URL });
    } else {
      /* ปกติ: ใช้ FIREBASE_CONFIG ที่ Cloud Functions ตั้งให้อัตโนมัติ
         — รองรับ URL แบบ .firebaseio.com และ .firebasedatabase.app (region-specific) */
      admin.initializeApp();
    }
  } catch (e) {
    /* ปล่อยผ่าน — เปิดให้ import ไป test ฟังก์ชัน pure ได้โดยไม่มี credentials */
  }
}

/* ------------------------------------------------------------------
   RTDB เก็บ array เป็น object { "0": {...}, "1": {...} } — แปลงกลับ
   เป็น array เรียงตาม key (เพื่อให้ admin.html ได้รับ array เดิม)
   ------------------------------------------------------------------ */
function toArray(val) {
  if (val == null) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') {
    const keys = Object.keys(val).sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b);
    });
    return keys.map((k) => val[k]);
  }
  return [];
}

const appsRef = () => (admin.apps.length ? admin.database().ref(DB_PATH) : null);

exports.api = functions
  .region('asia-southeast1') /* สิงคโปร์ — ใกล้ไทย/ลาว และใกล้ RTDB ของโปรเจกต์ */
  .https.onRequest(async (req, res) => {
    /* CORS — เผื่อเรียก URL functions ตรง ๆ (ปกติผ่าน hosting rewrite เดิมอยู่แล้ว) */
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    /* hosting rewrite ส่งทุกคำขอ /api/** มายัง function นี้ — รับเฉพาะ /api/apps */
    const full = String(req.path || req.url || '').split('?')[0];
    const isApps = full === '/api/apps' || full.endsWith('/api/apps');
    if (!isApps) {
      res.status(404).json({ error: 'not found' });
      return;
    }

    try {
      const ref = appsRef();
      if (!ref) {
        res.status(500).json({ error: 'database not initialized' });
        return;
      }

      if (req.method === 'GET') {
        const snap = await ref.get();
        res.json(toArray(snap.val()));
        return;
      }

      if (req.method === 'PUT' || req.method === 'POST') {
        const body = req.body || {};
        const list = Array.isArray(body) ? body : Array.isArray(body.list) ? body.list : null;
        if (!list) {
          res.status(400).json({ error: 'expected an array' });
          return;
        }
        await ref.set(list);
        res.json(toArray((await ref.get()).val()));
        return;
      }

      res.status(405).json({ error: 'method not allowed' });
    } catch (e) {
      console.error('api error:', e);
      res.status(500).json({ error: 'internal error' });
    }
  });

/* เปิดให้ test ฟังก์ชัน pure ในเครื่อง */
module.exports.toArray = toArray;
