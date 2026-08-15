/* Generate MoneyFast PWA icons: green rounded square + gold lightning bolt */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---- CRC32 ---- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

/* ---- geometry ---- */
const BOLT = [[0.55, 0.10], [0.20, 0.55], [0.40, 0.55], [0.30, 0.90], [0.70, 0.45], [0.45, 0.45]];
function inPoly(x, y) {
  let inside = false;
  for (let i = 0, j = BOLT.length - 1; i < BOLT.length; j = i++) {
    const xi = BOLT[i][0], yi = BOLT[i][1], xj = BOLT[j][0], yj = BOLT[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* ---- render ---- */
const GREEN = [14, 122, 60];
const GOLD = [245, 179, 1];
function makeIcon(size, outPath) {
  const radius = size * 0.16;
  const pad = size * 0.08; // padding around bolt inside icon
  const px = Buffer.alloc(size * size * 4);
  const SS = 3; // supersample per axis
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let goldHits = 0, total = 0;
      let inside = false; // inside rounded rect?
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = (x + (sx + 0.5) / SS) / size;
          const fy = (y + (sy + 0.5) / SS) / size;
          // rounded rect test
          const cx = Math.max(radius / size, Math.min(1 - radius / size, fx));
          const cy = Math.max(radius / size, Math.min(1 - radius / size, fy));
          const dx = (fx - cx) * size, dy = (fy - cy) * size;
          if (dx * dx + dy * dy <= radius * radius) {
            inside = true;
            total++;
            // bolt: scale normalized coords to padded area
            const bx = (fx - pad / size) / (1 - 2 * pad / size);
            const by = (fy - pad / size) / (1 - 2 * pad / size);
            if (inPoly(bx, by)) goldHits++;
          }
        }
      }
      const i = (y * size + x) * 4;
      if (!inside) { px[i + 3] = 0; continue; }
      const g = goldHits / total;
      const r = Math.round(GREEN[0] + (GOLD[0] - GREEN[0]) * g);
      const gg = Math.round(GREEN[1] + (GOLD[1] - GREEN[1]) * g);
      const b = Math.round(GREEN[2] + (GOLD[2] - GREEN[2]) * g);
      px[i] = r; px[i + 1] = gg; px[i + 2] = b; px[i + 3] = 255;
    }
  }
  // build scanlines (filter 0)
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(outPath, png);
  console.log('wrote', outPath, size + 'x' + size);
}

const dir = path.join(__dirname, '..');
makeIcon(512, path.join(dir, 'icon-512.png'));
makeIcon(192, path.join(dir, 'icon-192.png'));
makeIcon(180, path.join(dir, 'apple-touch-icon.png'));
