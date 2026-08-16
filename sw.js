/* MoneyFast PWA Service Worker (Vue app)
   หน้าเว็บ: network-first (ได้เวอร์ชันใหม่เสมอ)
   ไฟล์ static: cache-first (โหลดเร็ว + ใช้ offline ได้) */
/* v12: ย้ายจาก v11 — ล้าง cache เก่าทุกเครื่อง (iOS ที่ค้าง cache เก่าจะได้โหลดใหม่) */
const CACHE = 'moneyfast-v12';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './fonts/fonts.css',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // คำขอ API: ไม่ cache (ต้องได้ข้อมูลสดเสมอ)
  if (req.url.includes('/api/')) return;

  // หน้าเว็บ: network-first — อัปเดตใหม่เสมอ ถ้า offline ค่อยใช้ cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          // เก็บ cache เฉพาะหน้าที่สำเร็จ (ไม่ให้ 404 ติดค้าง)
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match('./index.html'))
        )
    );
    return;
  }

  // ไฟล์ static: cache-first — โหลดเร็ว + offline
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
