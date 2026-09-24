import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'src', 'assets', 'icons');
const PRIMARY = [0x1a, 0x73, 0xe8, 0xff];   // #1a73e8
const WHITE   = [0xff, 0xff, 0xff, 0xff];

const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function inRoundedRectAbs(x, y, left, top, size, radius) {
  const r = Math.min(radius, size / 2);
  const cx = Math.max(left + r, Math.min(x, left + size - r));
  const cy = Math.max(top + r, Math.min(y, top + size - r));
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function makeIcon(size, { rounded = true } = {}) {
  const radius = size * 0.22;
  const buf = Buffer.alloc(size * size * 4);
  const innerSize = size * 0.52;          // tarjeta blanca central
  const innerRadius = innerSize * 0.2;
  const innerTop = size * 0.24;
  const innerLeft = (size - innerSize) / 2;
  const dotRadius = size * 0.085;         // punto azul central
  const dotCx = size / 2;
  const dotCy = size * 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let col = [0, 0, 0, 0];
      const outer = rounded ? inRoundedRectAbs(x + 0.5, y + 0.5, 0, 0, size, radius) : true;
      if (outer) {
        const inside = inRoundedRectAbs(x + 0.5, y + 0.5, innerLeft, innerTop, innerSize, innerRadius);
        const dot = (x - dotCx) ** 2 + (y - dotCy) ** 2 <= dotRadius * dotRadius;
        col = inside ? (dot ? PRIMARY : WHITE) : PRIMARY;
      }
      buf[(y * size + x) * 4] = col[0];
      buf[(y * size + x) * 4 + 1] = col[1];
      buf[(y * size + x) * 4 + 2] = col[2];
      buf[(y * size + x) * 4 + 3] = col[3];
    }
  }
  return buf;
}

mkdirSync(OUT, { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(join(OUT, `icon-${size}.png`), png(size, size, makeIcon(size, { rounded: true })));
  writeFileSync(join(OUT, `icon-${size}-maskable.png`), png(size, size, makeIcon(size, { rounded: false })));
  console.log(`generated icon-${size}.png + icon-${size}-maskable.png`);
}