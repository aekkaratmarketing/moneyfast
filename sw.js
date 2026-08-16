/* MoneyFast PWA Service Worker
   ໜ້າເວັບ: network-first (ໄດ້ເວີຊັນໃໝ່ສະເໝີ)
   ໄຟລ໌ static: cache-first (ໂຫຼດໄວ + ໃຊ້ງານ offline ໄດ້)
   หน้าเว็บ: network-first (ได้เวอร์ชันใหม่เสมอ) / ไฟล์ static: cache-first (โหลดเร็ว + ใช้ offline ได้) */
const CACHE = 'moneyfast-v4';
const CORE = [
  './',
  './admin.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './vendor/firebase/firebase-app-compat.js',
  './vendor/firebase/firebase-auth-compat.js',
  './vendor/firebase/firebase-database-compat.js',
  './vendor/fonts/fonts.css',
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
  // ຄຳຂໍ API/RTDB: ບໍ່ cache (ຕ້ອງໄດ້ຂໍ້ມູນສົດສະເໝີ) / คำขอ API/RTDB: ไม่ cache (ต้องได้ข้อมูลสดเสมอ)
  if (req.url.includes('/api/') || req.url.includes('firebasedatabase.app')) return;

  // หน้าเว็บ: network-first — อัปเดตใหม่เสมอ ถ้า offline ค่อยใช้ cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match('./admin.html'))
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
