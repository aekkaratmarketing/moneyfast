# MoneyFast — ระบบหลังบ้านแอดมิน 💰

ระบบจัดการเงินกู้รายย่อย (สกุลกีบ) สำหรับแอดมิน — บันทึกลูกค้า คิดดอกเบี้ย 20% ต่อสัปดาห์แบบทบ รับชำระ คำนวณกำไร ดูสถิติ/กราฟ ส่งออก CSV รองรับภาษาไทย/ລາວ และโหมดมืด

---

## 🚀 เริ่มใช้งาน (เครื่องตัวเอง)

ต้องมี **Node.js** (เวอร์ชัน 14+ ขึ้นไป) แล้วรัน:

```bash
node server.js
```

เปิดเบราว์เซอร์: **http://localhost:8321/admin.html**

- ข้อมูลลูกค้าเก็บบนเซิร์ฟเวอร์ในไฟล์ `data/apps.json` — ซิงค์ข้ามเครื่องอัตโนมัติ
- ล็อกอินเริ่มต้น: ชื่อผู้ใช้ `admin` รหัสผ่าน `admin` (เปลี่ยนได้ในเมนู ⚙️)
- เปลี่ยนพอร์ตได้: `PORT=9000 node server.js`

---

## 📱 ให้ iPhone ใช้ (ภายในบ้าน/WiFi เดียวกัน)

1. รันเซิร์ฟเวอร์บนคอมเครื่องที่เปิดตลอด
2. หา IP ของคอมเครื่องนั้น เช่น เปิด `cmd` แล้วพิมพ์ `ipconfig` หา **IPv4 Address** (เช่น `192.168.1.50`) — หรือดูจากข้อความที่ server.js พิมพ์ขึ้นตอนรัน (บรรทัด `LAN:`)
3. บน iPhone เปิด Safari → พิมพ์: `http://192.168.1.50:8321/admin.html`
4. เจอหน้าแอดมิน = เรียบร้อย — iPhone เครื่องนี้กับคอมเห็นข้อมูลชุดเดียวกัน

> ⚠️ คอมต้องเชื่อมต่อ WiFi วงเดียวกับ iPhone และอาจต้องอนุญาตไฟร์วอลล์ Windows ให้ port 8321 ผ่าน

---

## ☁️ เว็บออนไลน์ (ใช้งานจากทุกที่)

เว็บแอดมิน deploy บน **Cloudflare Pages** — URL หลัก: **https://moneyfast.pages.dev**

| ส่วน | ใช้ | หมายเหตุ |
|---|---|---|
| หน้าเว็บ (admin.html + PWA) | **Cloudflare Pages** | ฟรี + HTTPS + deploy อัตโนมัติจาก GitHub |
| ข้อมูลลูกค้า | **Cloudflare KV** (Worker) | ข้อมูลในคลาวด์ ซิงค์ทุกเครื่อง |
| ล็อกอินแอดมิน | **Cloudflare Worker** (username/รหัส) | ปลอดภัย (PBKDF2) เปลี่ยนรหัสได้ที่หน้า UI |

คำขอ `/api/*` บนหน้าเว็บจะถูก proxy ไปที่ Cloudflare Worker (`moneyfast-api`) — ทุกอย่างอยู่ใน Cloudflare หมด ไม่มี Firebase

### ตั้งค่า backend (ครั้งแรกครั้งเดียว)

1. สร้าง Cloudflare Worker + KV namespace (ดู `worker/`)
2. deploy Worker: `cd worker && npx wrangler deploy`
3. เขียนบัญชีแอดมิน + ย้ายข้อมูล: `node tools/setup-cloudflare-kv.js`
4. `_redirects` ใน `tools/build-cloudflare.js` ชี้ `/api/*` ไปที่ Worker แล้ว

> ล็อกอินเริ่มต้น: `admin` / `123456` — เปลี่ยนได้ที่หน้า UI (⚙️ ตั้งค่ารหัสผ่าน)

### อัปเดตเว็บ (อัตโนมัติ)

- **push โค้ดขึ้น GitHub (main)** → workflow `Deploy to Cloudflare Pages` build + deploy ให้อัตโนมัติ
- หรือ manual: `node tools/build-cloudflare.js` → ลาก `dist/cloudflare/` ขึ้น Cloudflare Pages

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
├── admin.html          # หน้าแอดมิน (ตัวระบบทั้งหมด — ข้อมูล/ล็อกอินผ่าน Cloudflare API)
├── server.js           # เซิร์ฟเวอร์ Node ใช้รันในเครื่อง (ทดสอบ) — ข้อมูลลง data/apps.json
├── data/apps.json      # ฐานข้อมูลลูกค้า (ใช้กับ server.js ในเครื่องเท่านั้น)
├── worker/             # หลังบ้าน Cloudflare: Worker + wrangler.toml
│   ├── wrangler.toml   # คอนฟิก Worker + KV binding
│   └── src/index.js    # API: login / me / apps / password (PBKDF2 + session token)
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker (offline + ติดตั้งหน้าจอ)
├── icon-192.png        # ไอคอน PWA
├── icon-512.png        # ไอคอน PWA
├── apple-touch-icon.png# ไอคอนสำหรับ iPhone
├── tools/build-cloudflare.js # สร้างโฟลเดอร์ deploy-ready → dist/cloudflare (รวม proxy /api/*)
├── tools/setup-cloudflare-kv.js # เขียนบัญชีแอดมิน + ย้ายข้อมูลขึ้น KV
└── tools/make-icons.js # สคริปต์สร้างไอคอนใหม่ (node tools/make-icons.js)
```

---

## 💾 สำรองข้อมูล

- ข้อมูลทั้งหมดอยู่ใน **Cloudflare KV** (key `apps`) — สำรองได้ด้วย: Cloudflare Dashboard → Workers & Pages → KV → namespace → Export (หรือกดปุ่มส่งออก CSV ในหน้าแอดมิน)
- ถ้าใช้ server.js ในเครื่อง: ข้อมูลอยู่ใน `data/apps.json`

---

## ⚠️ ข้อควรรู้

- ข้อมูลซิงค์ข้ามเครื่องผ่าน Cloudflare (ล่าสุดชนะ) — เหมาะกับแอดมินคนเดียวใช้หลายเครื่อง
- ถ้าเน็ตขัดข้อง หน้าแอดมินจะใช้ข้อมูล cache ในเครื่องนั้นแทน พร้อมแจ้งเตือน 🔴
- ใช้งานบนมือถือ: แนะนำติดตั้ง **PWA** (Safari → Add to Home Screen) — ไม่หมดอายุ ไม่ต้องเสียบสาย
