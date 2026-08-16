/* MoneyFast backend — Cloudflare Pages Function (ข้อมูลใน Cloudflare KV — ไม่มี Firebase)
   ไฟล์นี้รันที่เส้นทาง /api/* บนโดเมนเดียวกันกับหน้าเว็บ (Pages Functions)

   - POST /api/login    {username, password} → {token, expiresAt}  (เซสชัน 30 วัน)
   - GET  /api/me       ตรวจ token ว่ายังใช้ได้
   - GET  /api/apps     → JSON array
   - PUT  /api/apps     body = array (บันทึกทั้งชุด)
   - POST /api/password {current, next} เปลี่ยนรหัส (ต้องล็อกอิน)
*/
const SESSION_TTL = 30 * 86400; // วินาที
const newToken = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

/* ---------- hex helpers (ไม่ใช้ Buffer — Pages Function runtime ไม่มี Buffer) ---------- */
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function bytesToHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

/* ---------- PBKDF2 hash ---------- */
async function hashPassword(password, saltHex, iterations = 100000) {
  const salt = hexToBytes(saltHex);
  const enc = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

const K_ADMIN = 'admin';
const K_APPS = 'apps';
const K_SESSION = (t) => 'session:' + t;

/* ---------- CORS ---------- */
function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0] || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Vary': 'Origin',
  };
}
function json(res, status = 200, cors = {}) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors },
  });
}
async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}

/* ---------- main (Pages Function — จับทุกเส้นทาง /api/*) ---------- */
export async function onRequest(context) {
  const { request, env } = context;
  const cors = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const url = new URL(request.url);
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  /* --- ล็อกอิน --- */
  if (url.pathname === '/api/login' && request.method === 'POST') {
    const body = await readJson(request);
    const username = String((body && body.username) || '').trim().toLowerCase();
    const password = String((body && body.password) || '');
    if (!username || !password) return json({ error: 'missing' }, 400, cors);
    const admin = JSON.parse((await env.MONEYFAST_KV.get(K_ADMIN)) || 'null');
    if (!admin || admin.username !== username) return json({ error: 'wrong' }, 401, cors);
    const hash = await hashPassword(password, admin.salt);
    if (hash !== admin.passwordHash) return json({ error: 'wrong' }, 401, cors);
    const t = newToken();
    await env.MONEYFAST_KV.put(K_SESSION(t), JSON.stringify({ username }), { expirationTtl: SESSION_TTL });
    return json({ ok: true, token: t, expiresAt: Date.now() + SESSION_TTL * 1000 }, 200, cors);
  }

  /* --- ตรวจ token --- */
  const session = token ? JSON.parse((await env.MONEYFAST_KV.get(K_SESSION(token))) || 'null') : null;

  if (url.pathname === '/api/me' && request.method === 'GET') {
    if (!session) return json({ error: 'unauthorized' }, 401, cors);
    return json({ ok: true, username: session.username }, 200, cors);
  }

  /* --- ข้อมูลลูกค้า --- */
  if (url.pathname === '/api/apps') {
    if (!session) return json({ error: 'unauthorized' }, 401, cors);
    if (request.method === 'GET') {
      const raw = await env.MONEYFAST_KV.get(K_APPS);
      return json(JSON.parse(raw || '[]'), 200, cors);
    }
    if (request.method === 'PUT') {
      const body = await readJson(request);
      if (!Array.isArray(body)) return json({ error: 'not-array' }, 400, cors);
      await env.MONEYFAST_KV.put(K_APPS, JSON.stringify(body));
      return json({ ok: true, count: body.length }, 200, cors);
    }
    return json({ error: 'method' }, 405, cors);
  }

  /* --- เปลี่ยนรหัสผ่าน (ต้องล็อกอิน) --- */
  if (url.pathname === '/api/password' && request.method === 'POST') {
    if (!session) return json({ error: 'unauthorized' }, 401, cors);
    const body = await readJson(request);
    const admin = JSON.parse((await env.MONEYFAST_KV.get(K_ADMIN)) || 'null');
    if (!admin) return json({ error: 'wrong' }, 401, cors);
    const cur = await hashPassword(String((body && body.current) || ''), admin.salt);
    if (cur !== admin.passwordHash) return json({ error: 'wrong-current' }, 401, cors);
    const next = String((body && body.next) || '');
    if (next.length < 4) return json({ error: 'too-short' }, 400, cors);
    const salt = newToken();
    admin.passwordHash = await hashPassword(next, salt);
    admin.salt = salt;
    await env.MONEYFAST_KV.put(K_ADMIN, JSON.stringify(admin));
    return json({ ok: true }, 200, cors);
  }

  return json({ error: 'not-found' }, 404, cors);
}
