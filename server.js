/* ============================================================
   MoneyFast Backend — Node.js (ไม่มี dependency ติดตั้งเพิ่ม)
   เสิร์ฟหน้าแอดมิน + REST API เก็บข้อมูลใน data/apps.json
   วิธีรัน:  node server.js   (พอร์ต default 8321, ใช้ PORT env ได้)
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.PORT) || 8321;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'apps.json');
const MAX_BODY = 60 * 1024 * 1024; // รองรับรูป base64 หลายใบ

function loadApps() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { return []; }
}
function persistApps(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > MAX_BODY) { req.destroy(); reject(new Error('too large')); }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  try {
    /* ---------- REST API ---------- */
    if (p === '/api/apps') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(loadApps()));
        return;
      }
      if (req.method === 'PUT' || req.method === 'POST') {
        const body = await readBody(req);
        const list = Array.isArray(body) ? body : (Array.isArray(body.list) ? body.list : loadApps());
        persistApps(list);
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(list));
        return;
      }
      res.writeHead(405, { 'content-type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }

    /* ---------- static files ---------- */
    let f = path.join(ROOT, (p === '/' || p === '/admin' || p === '/admin/') ? 'admin.html' : p);
    if (!f.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
    fs.readFile(f, (err, data) => {
      if (err) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
      res.end(data);
    });
  } catch (e) {
    res.writeHead(400, { 'content-type': 'text/plain' });
    res.end('Bad request');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('===== MoneyFast Server =====');
  console.log('  Local:   http://localhost:' + PORT + '/admin.html');
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach((k) => {
    (nets[k] || []).forEach((n) => {
      if (n.family === 'IPv4' && !n.internal) {
        console.log('  LAN:     http://' + n.address + ':' + PORT + '/admin.html');
      }
    });
  });
  console.log('  Data:    ' + DATA_FILE);
});
