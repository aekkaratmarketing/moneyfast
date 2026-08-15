/* Decode RGBA8 PNG → bilinear downscale → encode PNGs (no dependencies) */
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

/* ---- decode ---- */
function decodePNG(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.slice(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8 || colorType !== 6) throw new Error('only RGBA8 supported, got depth=' + bitDepth + ' type=' + colorType);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const px = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const line = Buffer.from(raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? px[y * stride + x - 4] : 0; // reconstructed left pixel
      const b = prev[x];
      const c = x >= 4 ? prev[x - 4] : 0;
      let v = line[x];
      if (f === 1) v = (v + a) & 0xff;
      else if (f === 2) v = (v + b) & 0xff;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 0xff;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
      px[y * stride + x] = v;
    }
    prev = line;
  }
  return { width, height, px };
}

/* ---- bilinear downscale ---- */
function downscale(src, w, h, tw, th) {
  const out = Buffer.alloc(tw * th * 4);
  const sx = w / tw, sy = h / th;
  for (let ty = 0; ty < th; ty++) {
    const y0 = Math.floor(ty * sy);
    const y1 = Math.min(h - 1, y0 + 1);
    const fy = ty * sy - y0;
    for (let tx = 0; tx < tw; tx++) {
      const x0 = Math.floor(tx * sx);
      const x1 = Math.min(w - 1, x0 + 1);
      const fx = tx * sx - x0;
      for (let ch = 0; ch < 4; ch++) {
        const i00 = (y0 * w + x0) * 4 + ch;
        const i10 = (y0 * w + x1) * 4 + ch;
        const i01 = (y1 * w + x0) * 4 + ch;
        const i11 = (y1 * w + x1) * 4 + ch;
        const top = src[i00] * (1 - fx) + src[i10] * fx;
        const bot = src[i01] * (1 - fx) + src[i11] * fx;
        out[(ty * tw + tx) * 4 + ch] = Math.round(top * (1 - fy) + bot * fy);
      }
    }
  }
  return out;
}

/* ---- encode ---- */
function encodePNG(size, px) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---- main ---- */
const ROOT = path.join(__dirname, '..');
const src = path.join(ROOT, process.argv[2] || 'icon-512.png');
const targets = process.argv.slice(3);
const { width, height, px } = decodePNG(src);
console.log('decoded', src, width + 'x' + height);
if (!targets.length) targets.push('192:icon-192.png', '180:apple-touch-icon.png');
targets.forEach((spec) => {
  const [sizeStr, name] = spec.split(':');
  const size = Number(sizeStr);
  const out = downscale(px, width, height, size, size);
  fs.writeFileSync(path.join(ROOT, name), encodePNG(size, out));
  console.log('wrote', name, size + 'x' + size);
});
