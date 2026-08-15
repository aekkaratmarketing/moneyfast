#!/usr/bin/env bash
# ============================================================
# สร้าง MoneyFast.ipa (unsigned) — ใช้บน Mac ที่ลง Xcode
#   .ipa ตัวนี้เอาไป Sideload ฟรีด้วย Sideloadly / AltStore
#   (หมดอายุทุก 7 วัน ต้องลงใหม่) — ถ้าอยากได้แบบถาวร ต้อง
#   Apple Developer ($99/ปี) + ใส่ signing secrets ใน workflow
# ============================================================
set -e
cd "$(dirname "$0")"

echo "▶ 1/4 คัดลอกไฟล์เว็บ → www"
node sync-www.js

echo "▶ 2/4 ติดตั้ง Capacitor"
npm install

echo "▶ 3/4 สร้าง iOS platform + sync"
npx cap add ios 2>/dev/null || true
npx cap sync ios

echo "▶ 4/4 Build .ipa (unsigned)"
cd ios
xcodebuild -workspace App.xcworkspace -scheme App -configuration Release \
  -sdk iphoneos -derivedDataPath build CODE_SIGNING_ALLOWED=NO build

APP="build/Build/Products/Release-iphoneos/App.app"
rm -rf Payload && mkdir -p Payload && cp -r "$APP" Payload/
rm -f MoneyFast.ipa
zip -qr MoneyFast.ipa Payload/

echo ""
echo "✅ เสร็จ: $(pwd)/MoneyFast.ipa (unsigned)"
echo "   เอาไปลง iPhone ด้วย Sideloadly/AltStore (Apple ID ฟรี) — ใช้ได้ 7 วัน"
