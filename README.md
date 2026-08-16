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

## ☁️ อัปโหลดขึ้นอินเทอร์เน็ต (ใช้ได้จากทุกที่)

### วิธีที่ 1: Render.com (ฟรี ง่ายสุด)

1. สมัคร https://render.com (ใช้บัญชี GitHub ได้)
2. กด **New → Web Service** → เชื่อมต่อ repo GitHub ที่มีโฟลเดอร์นี้ (หรือ **Upload** ไฟล์ทั้งหมด)
3. ตั้งค่า:
   - **Name:** `moneyfast`
   - **Root Directory:** `(ว่าง)`
   - **Build Command:** `(เว้นว่าง — ไม่ต้อง build)`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
4. กด **Deploy** รอ 2–3 นาที → ได้ลิงก์ `https://moneyfast.onrender.com`
5. เปิด `https://moneyfast.onrender.com/admin.html`

### วิธีที่ 2: VPS / เซิร์ฟเวอร์ตัวเอง

1. อัปโหลดทุกไฟล์ในโฟลเดอร์นี้ (รวม `server.js`, `admin.html`, `sw.js`, `manifest.json`, ไอคอน) ไปที่เซิร์ฟเวอร์
2. รัน: `node server.js`
3. ตั้ง reverse proxy (nginx) ชี้โดเมน/HTTPS มาที่พอร์ต 8321 — **PWA จำเป็นต้องใช้ HTTPS** (ยกเว้น localhost)

### วิธีที่ 3: Firebase (แนะนำ — ฟรี 100% ไม่ต้องมี backend) ⭐

สถาปัตยกรรม: หน้าแอดมินคุยกับ **Realtime Database ตรง ๆ** ผ่าน Firebase JS SDK + **ล็อกอินด้วย Firebase Authentication** — ไม่ต้องใช้ Cloud Functions (แผนฟรี Spark ใช้ได้ ไม่ผูกบัตร)

**1) สร้างโปรเจกต์** ที่ https://console.firebase.google.com → Add project

**2) เปิด Realtime Database:** Build → Realtime Database → Create Database → เลือก region `asia-southeast1` (สิงคโปร์ ใกล้ไทย/ลาว)

**3) เปิด Authentication:** Build → Authentication → **Get started** → Sign-in method → เปิด **Email/Password** → Save

**4) สร้างแอป Web เพื่อเอา Firebase config:** ตั้งค่าโปรเจกต์ ⚙ → ทั่วไป → แอปของคุณ → กด `</>` (Web) → ตั้งชื่อ (เช่น `moneyfast-web`) → ลงทะเบียน → จะเห็นค่า `apiKey, authDomain, databaseURL, projectId, ...` → **คัดลอกมาใส่ในไฟล์ `admin.html`** ตรงบล็อก `FB_CONFIG` (ช่อง `apiKey` ต้องเป็นค่าจริง — พอใส่แล้วระบบจะสลับเป็นโหมด Firebase อัตโนมัติ)

**5) ติดตั้งเครื่องมือ + login:**

```bash
npm install -g firebase-tools
firebase login
```

**6) เลือกโปรเจกต์ในโฟลเดอร์นี้** (ผูกไว้แล้วที่ `.firebaserc` — ถ้าโปรเจกต์อื่นใช้ `firebase use --add`):

```bash
firebase use moneyfast-b0ac0
```

**7) Deploy หน้าเว็บ + กฎความปลอดภัย (ครั้งเดียวจบ ไม่มี functions):**

```bash
firebase deploy
```

**8) ย้ายข้อมูลเดิม + สร้างบัญชีแอดมิน** (ทำครั้งเดียว):

- ดาวน์โหลด Service Account Key: ตั้งค่าโปรเจกต์ ⚙ → บัญชีบริการ → สร้างคีย์ใหม่ → JSON

```bash
node tools/migrate-firebase.js --key=path/to/serviceAccountKey.json --admin=อีเมลของคุณ:รหัสผ่าน
```

  (ถ้าไม่ใช้ `--admin` ก็สร้างบัญชีที่คอนโซล → Authentication → Users → Add user ได้)

**9) เปิดใช้งาน:** `https://<project>.web.app/` → **ล็อกอินด้วยอีเมล + รหัสผ่านที่ตั้งไว้** → ข้อมูลซิงค์ข้ามเครื่องผ่าน Firebase ทันที

> 💡 **หมายเหตุ:**
> - `data/apps.json`, `server.js`, `tools/`, `functions/` จะ**ไม่ถูกอัปโหลดขึ้น Hosting** (ตั้งค่า ignore ไว้กันข้อมูลลูกค้าหลุด) — ยังใช้ `node server.js` รันในเครื่องเพื่อทดสอบได้ตามเดิม (โหมดเครื่องเดียว ล็อกอิน `admin/admin`)
> - ถ้ายังไม่ใส่ `apiKey` จริงใน `FB_CONFIG` → หน้าเว็บเป็นโหมดเครื่องเดียว (localStorage) — พอใส่ค่าแล้วจะเข้าโหมด Firebase อัตโนมัติ
> - **ความปลอดภัย:** กฎ RTDB อนุญาตเฉพาะผู้ที่ล็อกอินแล้ว (rules ใน `database.rules.json`) — อยากล็อกให้เฉพาะอีเมลแอดมินคนเดียว เปลี่ยน `auth != null` เป็น `auth.token.email == 'อีเมลคุณ'` ในไฟล์ rules แล้ว deploy ใหม่
> - ปุ่ม "⚙️ ตั้งค่ารหัสผ่าน" ในหน้าแอดมินจะซ่อนอัตโนมัติในโหมด Firebase (รหัสจัดการผ่าน Firebase Auth) — ลืมรหัส ใช้คอนโซล → Authentication → Reset password
> - โฟลเดอร์ `functions/` เก็บไว้เผื่ออนาคตอัปเกรดเป็นแผน Blaze แล้วอยากใช้ Cloud Functions (โค้ดพร้อม)

> 💡 ถ้าใช้เน็ตมือถือ/ต่างสถานที่ ต้องใช้วิธี cloud — WiFi วงเดียวใช้ได้แค่ในบ้าน

---

## ☁️ ทางเลือก: ย้ายไป Cloudflare Pages (ฟรี เร็วในไทย/ลาว)

> Firebase Hosting คือที่เก็บไฟล์เว็บเท่านั้น — ข้อมูล/ล็อกอินยังอยู่ที่ Firebase (RTDB + Auth) เหมือนเดิม ย้ายได้ไม่ต้องแก้โค้ด

**ขั้นที่ 1 — สร้างโฟลเดอร์ deploy-ready**

```bash
node tools/build-cloudflare.js
```

ได้โฟลเดอร์ `dist/cloudflare/` (มี `_headers` ให้ sw.js ไม่ cache + `_redirects` เสิร์ฟ admin.html ที่ root ครบ)

**ขั้นที่ 2 — สร้างโปรเจกต์บน Cloudflare** (ในเบราว์เซอร์)

1. ไปที่ https://dash.cloudflare.com → **Workers & Pages → Create → Pages**
2. เลือก **Upload assets** → ตั้งชื่อโปรเจกต์ เช่น `moneyfast`
3. **ลากโฟลเดอร์ `dist/cloudflare/`** ไปวาง → **Deploy**
4. ได้ลิงก์ `https://moneyfast.pages.dev` — เปิดแล้วเห็นหน้าแอดมิน (ล็อกอินด้วยอีเมล Firebase เดิม)

**ขั้นที่ 3 (แนะนำ) — ต่อกับ GitHub เพื่อ deploy อัตโนมัติ**

- ในหน้าโปรเจกต์ Cloudflare → **Settings → Builds & deployments → Connect to Git** → เลือก repo `moneyfast`
- Build command: `node tools/build-cloudflare.js` / Build output directory: `dist/cloudflare`
- ตั้งค่า Environment variables ถ้าเป็น private repo (ไม่จำเป็นสำหรับ public)
- จากนี้ push ทุกครั้ง → Cloudflare build + deploy ให้อัตโนมัติ

**ขั้นที่ 4 — ใช้โดเมนของตัวเอง (ไม่บังคับ)**

- Cloudflare → โปรเจกต์ → **Custom domains** → ใส่โดเมน (เช่น `admin.moneyfast.la`) → ตั้ง DNS ตามที่บอก — ฟรีไม่เสียเงิน

> ⚠️ หมายเหตุ: PWA ลงหน้าจอ iPhone ต้องเปิดผ่าน HTTPS (Cloudflare ให้ฟรี) — ถ้าเปลี่ยนโดเมน/ลิงก์ใหม่ ต้องติดตั้ง PWA จากลิงก์ใหม่ (Add to Home Screen อีกครั้ง)

---

## 📲 ติดตั้ง PWA ลง iPhone (ทีละขั้น)

> ทำหลังเว็บอัปโหลดขึ้นอินเทอร์เน็ตแล้ว (HTTPS)

1. เปิด **Safari** บน iPhone
2. พิมพ์ URL หน้าแอดมิน เช่น `https://moneyfast.onrender.com/admin.html`
3. ล็อกอินให้เห็นหน้าแอดมิน (หน้าไหนก็ได้)
4. แตะปุ่ม **Share** (กล่องสี่เหลี่ยมมีลูกศรขึ้น — แถวล่างกลางจอ)
5. เลื่อนหา **Add to Home Screen** (เพิ่มไปยังหน้าจอโฮม) แล้วแตะ
6. ตั้งชื่อ เช่น `MoneyFast` → แตะ **Add** (เพิ่ม)
7. กลับไปหน้าจอโฮม → เห็นไอคอน ⚡ MoneyFast → แตะเปิด

**ผลลัพธ์:** เปิดเหมือน app จริง — เต็มจอ ไม่มีแถบ address bar ใช้ได้แม้เน็ตขาด (โหลดจาก cache)

> การติดตั้ง PWA ลง iPhone **ไม่ต้องใช้ Mac / Xcode / บัญชีนักพัฒนา** — ไม่ต้องจ่ายเงิน

---

## 🐙 อัปโหลดขึ้น GitHub + build .ipa อัตโนมัติ (ฟรี)

> ใช้ **GitHub Actions** — GitHub มีเครื่อง Mac ให้ build ฟรี (โฟลเดอร์ส่วนตัว 2,000 นาที/เดือน, โฟลเดอร์สาธารณะไม่จำกัด) ไม่ต้องมี Mac เอง

**ขั้นที่ 1 — สร้าง repo บน GitHub** (ในเบราว์เซอร์)

1. ไปที่ https://github.com/new
2. ตั้งชื่อ repo เช่น `moneyfast`
3. เลือก **Public** (ได้ build ไม่จำกัดนาที) — หรือ Private ก็ได้ (ฟรี 2,000 นาที/เดือน)
4. **อย่า**ติ๊ก "Add a README / .gitignore" (มีในโฟลเดอร์แล้ว) → กด **Create repository**

**ขั้นที่ 2 — push โฟลเดอร์โปรเจกต์ขึ้น repo** (รันในโฟลเดอร์โปรเจกต์)

```bash
git init
git add -A
git commit -m "MoneyFast admin + PWA + iOS build workflow"
git branch -M main
git remote add origin https://github.com/<ชื่อคุณ>/moneyfast.git
git push -u origin main
```

> 🔒 `.gitignore` ปิดของสำคัญอัตโนมัติแล้ว: `data/` (ข้อมูลลูกค้า), ไฟล์คีย์ Service Account, `node_modules/`, `.ipa` — ตรวจก่อน push ได้ด้วยคำสั่ง `git status`

**ขั้นที่ 3 — รอ workflow build .ipa (อัตโนมัติ ~5-8 นาที)**

- เปิด repo บน GitHub → แถบ **Actions** → เห็นงาน `Build iOS .ipa` รันอยู่ → รอจนเป็น ✅
- workflow ทำงานอัตโนมัติทุกครั้งที่แก้ `admin.html` / `sw.js` / `manifest.json` / ไอคอน / `ios/**` แล้ว push — หรือกดปุ่ม **Run workflow** เองก็ได้

**ขั้นที่ 4 — ดาวน์โหลด .ipa**

1. ในหน้าของงานที่ ✅ → เลื่อนลงล่างสุด → หัวข้อ **Artifacts**
2. กดดาวน์โหลด `MoneyFast-ipa` → ได้ zip → แตกได้ไฟล์ `MoneyFast.ipa`

**ขั้นที่ 5 — ลง iPhone (sideload ฟรี)**

- ใช้ **Sideloadly** (Windows/Mac) หรือ **AltStore** — เสียบ iPhone กับคอม → ลาก `.ipa` ไปวาง → ใส่ Apple ID → ลงได้เลย
- ⚠️ วิธีฟรีลงได้ **7 วัน** หมดอายุต้องเสียบสายต่ออายุใหม่ — ถ้าอยากได้แบบถาวร/App Store ต้อง Apple Developer ($99/ปี) + เพิ่ม signing certificate ใน workflow

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
├── admin.html          # หน้าแอดมิน (ตัวระบบทั้งหมด — รองรับทั้งโหมดเครื่องเดียว/โหมด Firebase)
├── server.js           # เซิร์ฟเวอร์ Node ใช้รันในเครื่อง (ทดสอบ/บ้าน) — ข้อมูลลง data/apps.json
├── data/apps.json      # ฐานข้อมูลลูกค้า (ใช้กับ server.js เท่านั้น)
├── firebase.json       # คอนฟิก deploy ขึ้น Firebase (hosting + กฎ RTDB)
├── database.rules.json # กฎ Realtime Database (เฉพาะผู้ล็อกอินแล้วเข้าถึง /apps)
├── functions/          # (สำรอง) Cloud Functions — ใช้เมื่ออัปเกรดเป็น Blaze เท่านั้น
│   └── index.js
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker (offline + ติดตั้งหน้าจอ)
├── icon-192.png        # ไอคอน PWA
├── icon-512.png        # ไอคอน PWA
├── apple-touch-icon.png# ไอคอนสำหรับ iPhone
├── tools/make-icons.js # สคริปต์สร้างไอคอนใหม่ (node tools/make-icons.js)
└── tools/migrate-firebase.js # สคริปต์ย้ายข้อมูล apps.json ขึ้น Firebase
```

---

## 💾 สำรองข้อมูล

- **ใช้ server.js ในเครื่อง:** ข้อมูลทั้งหมดอยู่ในไฟล์เดียว `data/apps.json` — คัดลอกไฟล์นี้ไว้เป็น backup ก็พอ (หรือกดปุ่มส่งออก CSV)
- **ใช้ Firebase:** ข้อมูลอยู่ใน Realtime Database — ดาวน์โหลดได้จากคอนโซล Firebase (Realtime Database → Export JSON) หรือกดส่งออก CSV ในหน้าแอดมิน

---

## ⚠️ ข้อควรรู้

- ข้อมูลซิงค์ข้ามเครื่องผ่านเซิร์ฟเวอร์ (ล่าสุดชนะ) — เหมาะกับแอดมินคนเดียวใช้หลายเครื่อง
- ถ้าเซิร์ฟเวอร์ล่ม หน้าแอดมินจะสลับเป็น "โหมดเครื่องเดียว" (เก็บในเครื่องนั้น) อัตโนมัติ พร้อมแจ้งเตือน 🔴
- ต้องการ .ipa: build ฟรีได้ผ่าน GitHub Actions (ดูหัวข้ออัปโหลดขึ้น GitHub) แต่ลง iPhone แบบฟรีหมดอายุทุก 7 วัน (Sideloadly/AltStore) — แบบถาวร/App Store ต้อง Apple Developer ($99/ปี)
