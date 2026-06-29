/**
 * Generates QuestPic's app icon + splash assets with zero image dependencies.
 *
 * Rasterizes the QuestPic mark — a neon diamond compass (the "quest" sigil) on
 * the Obsidian theme's true black — straight to PNG via a tiny RGBA encoder.
 * Run: `node scripts/gen-assets.mjs`
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const ACCENT = [0xd6, 0xff, 0x3d]; // neon lime
const CYAN = [0x5e, 0xe6, 0xff];
const BLACK = [0x00, 0x00, 0x00];

/* ---- minimal PNG (RGBA, 8-bit) encoder ---- */
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // rows with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---- draw the QuestPic mark ---- */
function blend(out, i, color, a) {
  out[i] = Math.round(out[i] * (1 - a) + color[0] * a);
  out[i + 1] = Math.round(out[i + 1] * (1 - a) + color[1] * a);
  out[i + 2] = Math.round(out[i + 2] * (1 - a) + color[2] * a);
  out[i + 3] = 255;
}

function drawMark(size, { bg }) {
  const buf = Buffer.alloc(size * size * 4);
  // background
  for (let p = 0; p < size * size; p++) {
    const i = p * 4;
    if (bg) {
      buf[i] = bg[0];
      buf[i + 1] = bg[1];
      buf[i + 2] = bg[2];
      buf[i + 3] = 255;
    } else {
      buf[i + 3] = 0; // transparent
    }
  }
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.30; // diamond radius
  const stroke = size * 0.035;
  const innerR = size * 0.115;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const i = (y * size + x) * 4;

      // outer diamond outline: |dx| + |dy| = R
      const dDiamond = Math.abs(Math.abs(dx) + Math.abs(dy) - R);
      if (dDiamond < stroke) {
        const a = 1 - dDiamond / stroke;
        blend(buf, i, ACCENT, Math.min(1, a + 0.25));
        continue;
      }
      // inner filled diamond (cyan) with soft edge
      const inner = Math.abs(dx) + Math.abs(dy);
      if (inner < innerR) {
        blend(buf, i, CYAN, 1);
        continue;
      }
      if (inner < innerR + stroke) {
        blend(buf, i, CYAN, 1 - (inner - innerR) / stroke);
      }
    }
  }
  return buf;
}

const outDir = new URL('../assets/', import.meta.url);
mkdirSync(outDir, { recursive: true });

function save(name, size, opts) {
  const png = encodePng(size, size, drawMark(size, opts));
  writeFileSync(new URL(name, outDir), png);
  console.log(`wrote assets/${name} (${size}×${size})`);
}

// iOS/store icon — opaque black background (App Store requires no alpha icon,
// but Expo flattens; keeping bg solid is safest).
save('icon.png', 1024, { bg: BLACK });
// Android adaptive foreground — transparent, mark sits in the safe zone.
save('adaptive-icon.png', 1024, { bg: null });
// Splash mark — transparent; background color comes from app config.
save('splash-icon.png', 1024, { bg: null });
// Web favicon.
save('favicon.png', 48, { bg: BLACK });
