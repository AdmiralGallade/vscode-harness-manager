#!/usr/bin/env node
// Generates media/harness-icon.png (128x128) from scratch using only Node built-ins.
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const W = 128, H = 128;
// RGBA pixel buffer
const px = Buffer.alloc(W * H * 4);
const BG = [0, 0, 0, 0];           // fully transparent
const FG = [255, 255, 255, 255];   // white strokes

function setPixel(x, y, c) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = c[0]; px[i+1] = c[1]; px[i+2] = c[2]; px[i+3] = c[3];
}

// Fill background
for (let i = 0; i < W * H; i++) {
  const o = i * 4;
  px[o] = BG[0]; px[o+1] = BG[1]; px[o+2] = BG[2]; px[o+3] = BG[3];
}

// Thick line using Bresenham + 2px radius circle stamp
function dot(x, y) {
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++)
      if (dx*dx + dy*dy <= 4) setPixel(x+dx, y+dy, FG);
}
function line(x0, y0, x1, y1) {
  x0=Math.round(x0); y0=Math.round(y0); x1=Math.round(x1); y1=Math.round(y1);
  const dx=Math.abs(x1-x0), dy=Math.abs(y1-y0);
  const sx=x0<x1?1:-1, sy=y0<y1?1:-1;
  let err=dx-dy;
  for (;;) {
    dot(x0, y0);
    if (x0===x1 && y0===y1) break;
    const e2=2*err;
    if (e2>-dy){err-=dy; x0+=sx;}
    if (e2< dx){err+=dx; y0+=sy;}
  }
}

const s = W / 24;

// Star: M12,2 l3,5 h5 l-4,4 l1,5 l-5,-3 l-5,3 l1,-5 l-4,-4 h5 z
const star = [
  [12,2],[15,7],[20,7],[16,11],[17,16],[12,13],[7,16],[8,11],[4,7],[9,7]
].map(([x,y]) => [x*s, y*s]);

for (let i = 0; i < star.length; i++) {
  const [x0,y0] = star[i];
  const [x1,y1] = star[(i+1) % star.length];
  line(x0, y0, x1, y1);
}

// Circle cx=12 cy=18 r=2
const [cx, cy, r] = [12*s, 18*s, 2*s];
const steps = 80;
for (let i = 0; i < steps; i++) {
  const a1 = 2*Math.PI*i/steps, a2 = 2*Math.PI*(i+1)/steps;
  line(cx + r*Math.cos(a1), cy + r*Math.sin(a1),
       cx + r*Math.cos(a2), cy + r*Math.sin(a2));
}

// ── Build PNG ───────────────────────────────────────────────────────────────
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  let crc = 0xffffffff;
  for (const b of body) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = (crc & 1) ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  crc ^= 0xffffffff;
  const c = Buffer.alloc(4); c.writeUInt32BE(crc >>> 0);
  return Buffer.concat([len, body, c]);
}

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8]=8; ihdr[9]=2; // 8-bit RGB (no alpha needed; background is opaque)
// Actually use RGBA (color type 6) so it's transparent-friendly
ihdr[9]=6; // RGBA
ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;

// Raw scanlines: filter byte (0) + RGBA rows
const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W*4)] = 0; // filter: None
  for (let x = 0; x < W; x++) {
    const src = (y * W + x) * 4;
    const dst = y * (1 + W*4) + 1 + x*4;
    raw[dst]   = px[src];
    raw[dst+1] = px[src+1];
    raw[dst+2] = px[src+2];
    raw[dst+3] = px[src+3];
  }
}

const compressed = zlib.deflateSync(raw, { level: 9 });

const sig  = Buffer.from([137,80,78,71,13,10,26,10]);
const png  = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);

const out = path.join(__dirname, '..', 'media', 'harness-icon.png');
fs.writeFileSync(out, png);
console.log('Written:', out, `(${png.length} bytes)`);
