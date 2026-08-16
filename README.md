# MoneyFast — ระบบหลังบ้านแอดมิน 💰

ระบบจัดการเงินกู้รายย่อย (สกุลกีบ) สำหรับแอดมิน — บันทึกลูกค้า คิดดอกเบี้ย 20% ต่อสัปดาห์แบบทบ รับชำระ คำนวณกำไร ดูสถิติ/กราฟ ส่งออก CSV รองรับภาษาไทย/ລາວ และโหมดมืด — เขียนด้วย **Vue 3 + Vite** (หน้าเว็บ) + **Cloudflare Pages Functions / KV** (หลังบ้าน)

---

## 🚀 เริ่มใช้งาน (เครื่องตัวเอง)

ต้องมี **Node.js 18+** (แนะนำ 20+ — โปรเจกต์ใช้ Vite 6 / Vue 3)

### 1) ติดตั้ง dependencies (ครั้งแรก)

```bash
npm install
```

### 2) รันแบบ dev (แก้โค้ดแล้วเห็นผลทันที)

```bash
npm run dev
```

เปิดเบราว์เซอร์: **http://localhost:5173**

- `npm run dev` = Vite dev server — แก้โค้ดใน `src/` แล้วหน้าเว็บอัปเดตให้อัตโนมัติ (hot-reload)
- Vite ส่งต่อคำขอ `/api/*` ไป `http://127.0.0.1:8321` ให้อัตโนมัติ (ตั้งค่าใน `vite.config.js`)
- เปิดจากมือถือในวง WiFi เดียวกัน: `npm run dev -- --host` แล้วเปิด `http://<IP-คอม>:5173`

### 3) รันแบบเต็มรูปแบบ (เหมือน production — มีล็อกอิน + ข้อมูลใน KV)

ล็อกอินและข้อมูลลูกค้าทำงานผ่าน **Pages Functions + Cloudflare KV** — รันในเครื่องได้ด้วย wrangler:

```bash
npm run build            # สร้าง dist/app (vite) + dist/cloudflare (deploy-ready)
npx wrangler pages dev   # เสิร์ฟ dist/cloudflare + หลังบ้าน /api/* + KV → http://localhost:8788
```

- wrangler อ่าน `wrangler.toml` → เสิร์ฟ `dist/cloudflare` + รัน `functions/api/[[path]].js` + KV ในเครื่อง
- หลังบ้านต้องมีบัญชีแอดมินใน KV ก่อน (สร้างด้วย `tools/setup-cloudflare-kv.js` — ดูหัวข้อ ☁️ ด้านล่าง)

### 4) Build (สำหรับ deploy)

```bash
npm run build
```

- `vite build` → หน้าเว็บไปที่ `dist/app`
- `tools/build-cloudflare.js` ประกอบต่อ → `dist/cloudflare/` (static + functions + `_headers`/`_redirects`) — โฟลเดอร์นี้คือสิ่งที่ deploy ขึ้น Cloudflare Pages
- ทดสอบผล build ในเครื่อง: `npm run preview`

> ℹ️ `server.js` และ `admin.html` คือเวอร์ชันเก่า เก็บไว้เป็นไฟล์อ้างอิงเท่านั้น — ตัวระบบจริงอยู่ที่ `index.html` + `src/` (ดูหัวข้อ 🗂 โครงสร้างไฟล์)

---

## 📱 ใช้บนมือถือ (ภายในบ้าน/WiFi เดียวกัน)

- **ทดสอบระหว่างพัฒนา:** รัน `npm run dev -- --host` แล้วเปิด `http://<IP-คอม>:5173` จากมือถือ — หา IP ได้จาก `cmd` → `ipconfig` → **IPv4 Address** (เช่น `192.168.1.50`)
- **ใช้งานจริง:** เปิดจากเว็บออนไลน์ (HTTPS) แล้วติดตั้ง **PWA** — ใช้ได้จากทุกที่ ไม่ต้องต่อ WiFi วงเดียวกัน (ดูหัวข้อถัดไป)

> ⚠️ คอมต้องเชื่อมต่อ WiFi วงเดียวกับมือถือ และอาจต้องอนุญาตไฟร์วอลล์ Windows ให้พอร์ตนั้นผ่าน

---

## ☁️ เว็บออนไลน์ (ใช้งานจากทุกที่)

เว็บแอดมิน deploy บน **Cloudflare Pages** — URL หลัก: **https://moneyfast.pages.dev**

| ส่วน | ใช้ | หมายเหตุ |
|---|---|---|
| หน้าเว็บ (Vue 3 + PWA) | **Cloudflare Pages** | ฟรี + HTTPS + deploy อัตโนมัติจาก GitHub |
| ข้อมูลลูกค้า | **Cloudflare KV** | ข้อมูลในคลาวด์ ซิงค์ทุกเครื่อง |
| ล็อกอินแอดมิน | **Cloudflare Pages Functions** (username/รหัส) | ปลอดภัย (PBKDF2) เปลี่ยนรหัสได้ที่หน้า UI |

คำขอ `/api/*` รันผ่าน **Pages Functions** (`functions/api/[[path]].js`) บนโดเมนเดียวกันกับหน้าเว็บ — ทุกอย่างอยู่ใน Cloudflare หมด ไม่มี Firebase

### ตั้งค่า backend (ครั้งแรกครั้งเดียว)

1. สร้าง KV namespace ที่ Cloudflare Dashboard → Workers & Pages → KV → Create
2. เอา namespace id ใส่ใน `wrangler.toml` (`kv_namespaces`)
3. ผูก binding กับโปรเจกต์ Pages: Dashboard → โปรเจกต์ → Settings → Functions → KV namespace bindings → เพิ่ม `MONEYFAST_KV` (หรือผ่าน API)
4. เขียนบัญชีแอดมิน + ย้ายข้อมูล: `CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... KV_NAMESPACE_ID=... node tools/setup-cloudflare-kv.js`

> ล็อกอินเริ่มต้น: `admin` / `123456` — เปลี่ยนได้ที่หน้า UI (⚙️ ตั้งค่ารหัสผ่าน)

### อัปเดตเว็บ (อัตโนมัติ)

- **push โค้ดขึ้น GitHub (main)** → workflow `Deploy to Cloudflare Pages` build + deploy ให้อัตโนมัติ
- หรือ manual: `npm run build` → ลาก `dist/cloudflare/` ขึ้น Cloudflare Pages

### โดเมนของตัวเอง (ไม่บังคับ)

- Cloudflare → โปรเจกต์ → **Custom domains** → ใส่โดเมน (เช่น `admin.moneyfast.la`) → ตั้ง DNS — ฟรี
- ⚠️ เปลี่ยนลิงก์/โดเมนแล้ว ต้องติดตั้ง PWA ใหม่ (Add to Home Screen อีกครั้ง)

---
## 📲 ติดตั้ง PWA ลง iPhone (ทีละขั้น)

> ทำหลังเว็บอัปโหลดขึ้นอินเทอร์เน็ตแล้ว (HTTPS)

1. เปิด **Safari** บน iPhone
2. พิมพ์ URL หน้าแอดมิน: `https://moneyfast.pages.dev`
3. ล็อกอินให้เห็นหน้าแอดมิน (หน้าไหนก็ได้)
4. แตะปุ่ม **Share** (กล่องสี่เหลี่ยมมีลูกศรขึ้น — แถวล่างกลางจอ)
5. เลื่อนหา **Add to Home Screen** (เพิ่มไปยังหน้าจอโฮม) แล้วแตะ
6. ตั้งชื่อ เช่น `MoneyFast` → แตะ **Add** (เพิ่ม)
7. กลับไปหน้าจอโฮม → เห็นไอคอน ⚡ MoneyFast → แตะเปิด

**ผลลัพธ์:** เปิดเหมือน app จริง — เต็มจอ ไม่มีแถบ address bar ใช้ได้แม้เน็ตขาด (โหลดจาก cache)

> การติดตั้ง PWA ลง iPhone **ไม่ต้องใช้ Mac / Xcode / บัญชีนักพัฒนา** — ไม่ต้องจ่ายเงิน

---

## 🐙 อัปโหลดขึ้น GitHub (สำหรับ deploy อัตโนมัติ)

> โฟลเดอร์นี้ต่อกับ GitHub ไว้สำหรับ **deploy เว็บขึ้น Cloudflare Pages อัตโนมัติ** (ดูหัวข้อ Cloudflare ด้านบน) — push โค้ดขึ้น main เมื่อไหร่ build + deploy ให้ทันที

**ขั้นที่ 1 — สร้าง repo บน GitHub** (ในเบราว์เซอร์)

1. ไปที่ https://github.com/new
2. ตั้งชื่อ repo เช่น `moneyfast`
3. เลือก **Public** หรือ Private ก็ได้
4. **อย่า**ติ๊ก "Add a README / .gitignore" (มีในโฟลเดอร์แล้ว) → กด **Create repository**

**ขั้นที่ 2 — push โฟลเดอร์โปรเจกต์ขึ้น repo** (รันในโฟลเดอร์โปรเจกต์)

```bash
git init
git add -A
git commit -m "MoneyFast admin + PWA"
git branch -M main
git remote add origin https://github.com/<ชื่อคุณ>/moneyfast.git
git push -u origin main
```

> 🔒 `.gitignore` ปิดของสำคัญอัตโนมัติแล้ว: `data/` (ข้อมูลลูกค้า), ไฟล์คีย์ Service Account, `node_modules/` — ตรวจก่อน push ได้ด้วยคำสั่ง `git status`

---

## 🔧 การใช้งานแอดมินเบื้องต้น

| ฟังก์ชัน | วิธีใช้ |
|---|---|
| ➕ เพิ่มลูกค้า | ปุ่ม "เพิ่มลูกค้า" → กรอกชื่อ/เบอร์/รูปทะเบียนบ้าน/ยอดกู้ → ยืนยัน |
| 💰 รับชำระ | ปุ่ม "หักลบเงิน" → เลือก คืนดอก / คืนระบุจำนวน / คืนทั้งหมด → ระบบคำนวณให้อัตโนมัติ |
| ✏️ แก้ไข / 🗑 ลบ | ปุ่มบนการ์ดลูกค้า (ลบมีหน้าต่างยืนยัน) |
| 📊 สถิติ/กราฟ | ดูยอดกู้ ยอดคืน กำไรจริง + กราฟรายวัน เลือกช่วง 7/30/90 วัน/กำหนดเอง |
| 📥 ส่งออก CSV | ปุ่ม "ส่งออกรายงาน CSV" |
| 🌙 โหมดมืด / ไทย-ລາວ | ปุ่มแถวบนสุด |
| ⚙️ ตั้งรหัสผ่าน | เปลี่ยนรหัสล็อกอินจากหน้า UI |

---

## 🗂 โครงสร้างไฟล์

```
├── index.html                  # entry ของ Vite — โหลด src/main.js (หน้าเดียวกับที่ deploy)
├── vite.config.js              # คอนฟิก Vite: dev server (พอร์ต 5173, proxy /api → 8321) + build → dist/app
├── package.json                # สคริปต์: dev / build / preview (Vue 3 + Vite)
├── src/                        # ⭐ โค้ด Vue 3 — ตัวระบบทั้งหมด
│   ├── main.js                 # entry: สร้าง Vue app + ธีมมืด/สว่าง + ภาษา + ลงทะเบียน Service Worker
│   ├── App.vue                 # component ราก: navbar / ล็อกอิน / dashboard / modal ต่าง ๆ
│   ├── store.js                # global reactive state (แชร์ระหว่าง component)
│   ├── api.js                  # เรียก API หลังบ้าน (/api/login, me, apps, password)
│   ├── apps.js                 # จัดการข้อมูลลูกค้า: ซิงค์เซิร์ฟเวอร์ + สำรอง localStorage ตอน offline
│   ├── i18n.js                 # ข้อความภาษาไทย/ລາວ (สลับได้จากแถบบนสุด)
│   ├── logic.js                # คิดดอก 20%/สัปดาห์แบบทบ + ฟอร์แมตเงิน + สถิติ/กราฟ/CSV
│   ├── styles.css              # สไตล์ทั้งหมด (ธีมสว่าง/มืด, responsive)
│   └── components/             # UI แยกตามฟีเจอร์
│       ├── LoginScreen.vue     #   หน้าล็อกอิน
│       ├── Dashboard.vue       #   แผงควบคุม: สถิติ/กราฟ/ค้นหา/รายการลูกค้า
│       ├── CustomerCard.vue    #   การ์ดลูกค้า 1 ราย (ยอด/ดอก/กำไร + ปุ่มรับชำระ/แก้ไข/ลบ)
│       ├── AddEditModal.vue    #   เพิ่ม/แก้ไขลูกค้า (+ อัพรูปทะเบียนบ้าน)
│       ├── PayModal.vue        #   รับชำระ: คืนดอก / ระบุจำนวน / คืนทั้งหมด
│       ├── PassModal.vue       #   เปลี่ยนรหัสผ่าน
│       ├── ConfirmModal.vue    #   กล่องยืนยัน (ลบ / บันทึก)
│       ├── LoginOkModal.vue    #   แจ้งล็อกอินสำเร็จ
│       ├── Lightbox.vue        #   ดูรูปเต็มจอ
│       └── Toast.vue           #   แจ้งเตือนสั้น ๆ
├── functions/api/[[path]].js   # Pages Function — หลังบ้าน /api/* (login/me/apps/password) บน Cloudflare
├── wrangler.toml               # คอนฟิก Pages + KV binding (local dev / deploy)
├── manifest.json               # PWA manifest
├── sw.js                       # Service Worker (offline + ติดตั้งลงหน้าจอ)
├── icon-192.png / icon-512.png # ไอคอน PWA
├── apple-touch-icon.png        # ไอคอนสำหรับ iPhone
├── public/fonts/               # ฟอนต์ Prompt + Noto Sans Lao (self-host — โหลดจาก /fonts/ ไม่ผ่าน bundle)
├── vendor/fonts/               # ฟอนต์ Kanit ชุดเก่า (ของ admin.html เวอร์ชัน legacy — ไม่ได้ deploy แล้ว)
├── tools/
│   ├── build-cloudflare.js     # ประกอบ deploy-ready → dist/cloudflare (static + functions + _headers/_redirects)
│   ├── setup-cloudflare-kv.js  # สร้างบัญชีแอดมิน (PBKDF2) + ย้ายข้อมูลขึ้น KV
│   ├── make-icons.js           # สร้างไอคอนใหม่ (node tools/make-icons.js)
│   ├── vendor-assets.js        # ดาวน์โหลดฟอนต์/asset ใหม่ → public/fonts
│   └── verify-loancalc.mjs     # ตรวจสอบผล loanCalc เทียบกับเวอร์ชันเดิม
├── server.js                   # (legacy) เซิร์ฟเวอร์ Node แบบเก่า — เก็บไว้เป็นอ้างอิง
├── admin.html                  # (legacy) หน้าแอดมินแบบเดิม — เก็บไว้เป็นอ้างอิง (ไม่ได้ deploy แล้ว)
└── data/apps.json              # ข้อมูลลูกค้า (ใช้กับ server.js แบบเก่าเท่านั้น)
```

---

## 💾 สำรองข้อมูล

- ข้อมูลทั้งหมดอยู่ใน **Cloudflare KV** (key `apps`) — สำรองได้ด้วย: Cloudflare Dashboard → Workers & Pages → KV → namespace → Export (หรือกดปุ่มส่งออก CSV ในหน้าแอดมิน)
- (ระบบเก่า `server.js` เก็บข้อมูลใน `data/apps.json` — ไม่ได้ใช้แล้ว)

---

## ⚠️ ข้อควรรู้

- ข้อมูลซิงค์ข้ามเครื่องผ่าน Cloudflare (ล่าสุดชนะ) — เหมาะกับแอดมินคนเดียวใช้หลายเครื่อง
- ถ้าเน็ตขัดข้อง หน้าแอดมินจะใช้ข้อมูล cache ในเครื่องนั้นแทน พร้อมแจ้งเตือน 🔴
- ใช้งานบนมือถือ: แนะนำติดตั้ง **PWA** (Safari → Add to Home Screen) — ไม่หมดอายุ ไม่ต้องเสียบสาย
