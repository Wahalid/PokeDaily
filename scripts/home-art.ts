/**
 * Generates the Home game covers into public/home/covers/<id>.png: one pixel-art
 * cover per playable game, each showing its mechanic. (public/home/landscape.png,
 * the hub background, is a hand-picked image: this script never touches it.)
 *
 * Low-resolution PNGs drawn pixel by pixel and shown with `image-rendering: pixelated`.
 * Pokémon come from the PokéAPI sprite repository (the dataset's own sprite source), so
 * the script needs network access. Output is deterministic: re-run after editing.
 *
 *   npm run home:art
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

type RGB = readonly [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

// ---------------------------------------------------------------- image

class Img {
  readonly data: Uint8ClampedArray;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }
  alpha(x: number, y: number): number {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.data[(y * this.w + x) * 4 + 3];
  }
  get(x: number, y: number): RGB {
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2]];
  }
  set(x: number, y: number, c: RGB, a = 1) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const keep = this.data[i + 3] ? 1 - a : 0;
    for (let k = 0; k < 3; k++) this.data[i + k] = Math.round(c[k] * (1 - keep) + this.data[i + k] * keep);
    this.data[i + 3] = 255;
  }
  rect(x: number, y: number, w: number, h: number, c: RGB, a = 1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c, a);
  }
  /** Rectangle with a 1px border and an optional lighter top rim. */
  box(x: number, y: number, w: number, h: number, fill: RGB, border: RGB, rim?: RGB) {
    this.rect(x, y, w, h, border);
    this.rect(x + 1, y + 1, w - 2, h - 2, fill);
    if (rim) this.rect(x + 1, y + 1, w - 2, 1, rim);
  }
  disc(cx: number, cy: number, r: number, c: RGB) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * 0.6) this.set(x, y, c);
  }
  /** Draws `src` with its top-left at (x, y); transparent pixels are skipped. */
  blit(src: Img, x: number, y: number, opts: { tint?: RGB; clip?: [number, number, number, number] } = {}) {
    for (let j = 0; j < src.h; j++)
      for (let i = 0; i < src.w; i++) {
        const a = src.alpha(i, j);
        if (a < 128) continue;
        const px = x + i, py = y + j;
        if (opts.clip) {
          const [cx, cy, cw, ch] = opts.clip;
          if (px < cx || py < cy || px >= cx + cw || py >= cy + ch) continue;
        }
        this.set(px, py, opts.tint ?? src.get(i, j));
      }
  }
}

// ---------------------------------------------------------------- PNG encode / decode

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** Opaque image → indexed PNG (pixel art has few colors), or RGB when it has more than 256. */
function encodePng(img: Img): Buffer {
  const index = new Map<number, number>();
  for (let i = 0; i < img.w * img.h && index.size <= 256; i++) {
    const key = (img.data[i * 4] << 16) | (img.data[i * 4 + 1] << 8) | img.data[i * 4 + 2];
    if (!index.has(key)) index.set(key, index.size);
  }
  const indexed = index.size <= 256;
  const bpp = indexed ? 1 : 3;
  const raw = Buffer.alloc((img.w * bpp + 1) * img.h);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const i = (y * img.w + x) * 4;
      const o = y * (img.w * bpp + 1) + 1 + x * bpp;
      if (indexed) raw[o] = index.get((img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2])!;
      else for (let k = 0; k < 3; k++) raw[o + k] = img.data[i + k];
    }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.w, 0);
  ihdr.writeUInt32BE(img.h, 4);
  ihdr[8] = 8;
  ihdr[9] = indexed ? 3 : 2;
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr)];
  if (indexed) {
    const plte = Buffer.alloc(index.size * 3);
    for (const [key, i] of index) plte.set([key >> 16, (key >> 8) & 255, key & 255], i * 3);
    parts.push(chunk("PLTE", plte));
  }
  parts.push(chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", new Uint8Array()));
  return Buffer.concat(parts);
}

/** Minimal non-interlaced PNG decoder (gray, RGB, indexed, gray+alpha, RGBA; 1–16 bit). */
function decodePng(buf: Buffer): Img {
  let p = 8, w = 0, h = 0, depth = 8, type = 6;
  let palette: Buffer | null = null, trns: Buffer | null = null;
  const idat: Buffer[] = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const t = buf.toString("ascii", p + 4, p + 8);
    const d = buf.subarray(p + 8, p + 8 + len);
    p += 12 + len;
    if (t === "IHDR") {
      [w, h, depth, type] = [d.readUInt32BE(0), d.readUInt32BE(4), d[8], d[9]];
      if (d[12]) throw new Error("interlaced PNG not supported");
    } else if (t === "PLTE") palette = d;
    else if (t === "tRNS") trns = d;
    else if (t === "IDAT") idat.push(d);
    else if (t === "IEND") break;
  }
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[type];
  const bpp = Math.max(1, (channels * depth) >> 3);
  const stride = Math.ceil((w * channels * depth) / 8);
  const raw = inflateSync(Buffer.concat(idat));
  const img = new Img(w, h);
  let prev = Buffer.alloc(stride);
  const max = (1 << Math.min(depth, 8)) - 1;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let x = line[i];
      if (f === 1) x += a;
      else if (f === 2) x += b;
      else if (f === 3) x += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        x += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = x & 255;
    }
    const sample = (n: number) =>
      depth === 16 ? cur[n * 2] : depth === 8 ? cur[n] : (cur[(n * depth) >> 3] >> (8 - depth - ((n * depth) & 7))) & max;
    for (let x = 0; x < w; x++) {
      let rgba: [number, number, number, number];
      if (type === 3) {
        const i = sample(x);
        rgba = [palette![i * 3], palette![i * 3 + 1], palette![i * 3 + 2], trns && i < trns.length ? trns[i] : 255];
      } else if (type === 6) rgba = [sample(x * 4), sample(x * 4 + 1), sample(x * 4 + 2), sample(x * 4 + 3)];
      else if (type === 2) rgba = [sample(x * 3), sample(x * 3 + 1), sample(x * 3 + 2), 255];
      else {
        const g = (sample(x * channels) * 255) / (depth === 16 ? 255 : max);
        rgba = [g, g, g, type === 4 ? sample(x * 2 + 1) : 255];
      }
      img.data.set(rgba, (y * w + x) * 4);
    }
    prev = cur;
  }
  return img;
}

// ---------------------------------------------------------------- helpers

/** 4×4 ordered dithering: true when this pixel should take the second color at mix t (0..1). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dither = (x: number, y: number, t: number) => t * 16 > BAYER[(y & 3) * 4 + (x & 3)] + 0.5;

/** Dithered two-color steps between gradient stops. */
function gradient(stops: [number, RGB][], v: number, x: number, y: number): RGB {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i], [p1, c1] = stops[i + 1];
    if (v <= p1) return dither(x, y, (v - p0) / (p1 - p0)) ? c1 : c0;
  }
  return stops[stops.length - 1][1];
}

/** Pixel maps: one character per pixel, mapped to colors (`.` = transparent). */
function pixmap(rows: string[], colors: Record<string, RGB>): Img {
  const img = new Img(rows[0].length, rows.length);
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== "." && img.set(x, y, colors[ch])));
  return img;
}

// 3×5 pixel font (only the glyphs the covers use).
const FONT: Record<string, string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["##.", "..#", ".#.", "#..", "###"],
  "3": ["##.", "..#", ".#.", "..#", "##."],
  "?": ["##.", "..#", ".#.", "...", ".#."],
  "!": [".#.", ".#.", ".#.", "...", ".#."],
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  E: ["###", "#..", "##.", "#..", "###"],
  G: [".##", "#..", "#.#", "#.#", ".##"],
  K: ["#.#", "#.#", "##.", "#.#", "#.#"],
  N: ["#.#", "###", "###", "#.#", "#.#"],
  S: [".##", "#..", ".#.", "..#", "##."],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  U: ["#.#", "#.#", "#.#", "#.#", "###"],
  V: ["#.#", "#.#", "#.#", "#.#", ".#."],
  Z: ["###", "..#", ".#.", "#..", "###"],
};
function text(img: Img, s: string, x: number, y: number, c: RGB, scale = 1) {
  [...s].forEach((ch, n) =>
    FONT[ch].forEach((row, j) =>
      [...row].forEach((v, i) => v === "#" && img.rect(x + n * 4 * scale + i * scale, y + j * scale, scale, scale, c)),
    ),
  );
}

// ---------------------------------------------------------------- palette

const C = {
  night: hex("#0b1533"),
  navy: hex("#12204a"),
  panel: hex("#1a2c5f"),
  line: hex("#2c4590"),
  blue: hex("#3d63f0"),
  blueLight: hex("#8fa9ff"),
  yellow: hex("#ffc928"),
  yellowLight: hex("#ffe27a"),
  red: hex("#e5484d"),
  redLight: hex("#ff8a8e"),
  green: hex("#3fae6a"),
  greenLight: hex("#7fdc9b"),
  violet: hex("#7a52d6"),
  violetLight: hex("#b39bff"),
  grey: hex("#3a4370"),
  white: hex("#f4f6ff"),
  ink: hex("#0a1029"),
};

// ---------------------------------------------------------------- sprites

const SPRITE_URL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

/** Downloads a sprite (or its small menu icon) and crops it to its visible pixels. */
async function sprite(id: number, kind: "sprite" | "icon" = "sprite"): Promise<Img> {
  const res = await fetch(kind === "icon" ? `${SPRITE_URL}/versions/generation-vii/icons/${id}.png` : `${SPRITE_URL}/${id}.png`);
  if (!res.ok) throw new Error(`sprite ${id}: HTTP ${res.status}`);
  const full = decodePng(Buffer.from(await res.arrayBuffer()));
  let x0 = full.w, y0 = full.h, x1 = 0, y1 = 0;
  for (let y = 0; y < full.h; y++)
    for (let x = 0; x < full.w; x++)
      if (full.alpha(x, y) >= 128) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
  const out = new Img(x1 - x0 + 1, y1 - y0 + 1);
  out.blit(full, -x0, -y0);
  return out;
}

/** Nearest-neighbour 2× upscale (keeps hard pixel edges). */
function double(src: Img): Img {
  const out = new Img(src.w * 2, src.h * 2);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) if (src.alpha(x >> 1, y >> 1) >= 128) out.set(x, y, src.get(x >> 1, y >> 1));
  return out;
}

/** Flat silhouette with a 1px outline so it reads on the dark covers. */
function silhouette(src: Img, fill: RGB, outline: RGB): Img {
  const out = new Img(src.w + 2, src.h + 2);
  for (let y = -1; y <= src.h; y++)
    for (let x = -1; x <= src.w; x++) {
      if (src.alpha(x, y) >= 128) out.set(x + 1, y + 1, fill);
      else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => src.alpha(x + dx, y + dy) >= 128)) out.set(x + 1, y + 1, outline);
    }
  return out;
}

/** Draws a sprite with its bottom-center at (cx, bottom). */
const place = (img: Img, s: Img, cx: number, bottom: number, opts?: Parameters<Img["blit"]>[3]) =>
  img.blit(s, Math.round(cx - s.w / 2), bottom - s.h, opts);

// ---------------------------------------------------------------- covers (160×96, 5:3)

const CW = 160, CH = 96;

/** Shared backdrop for the collection: night gradient + a dark floor band. */
function coverBase(top: string, bottom: string, floor = 82): Img {
  const img = new Img(CW, CH);
  const stops: [number, RGB][] = [[0, hex(top)], [floor, hex(bottom)]];
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) img.set(x, y, y >= floor ? (y === floor ? C.line : C.night) : gradient(stops, y, x, y));
  return img;
}

const ICON_COLORS: Record<string, RGB> = { r: C.red, y: C.yellow, o: hex("#ff9a3c"), b: C.blue, w: C.blueLight, g: C.green, l: C.greenLight, v: C.violetLight };
const ICONS = {
  fire: ["...r....", "..rr....", "..rrr.r.", ".rrorrr.", ".royyrr.", "rroyyorr", "rroyyorr", ".rroorr."],
  drop: ["...w....", "...b....", "..bbb...", "..bwb...", ".bbwbb..", ".bbbbb..", ".bbbbb..", "..bbb..."],
  leaf: [".....gg.", "...gggg.", "..gglgg.", ".gglggg.", ".glggg..", ".lggg...", "l.......", "l......."],
  bolt: ["....yy..", "...yy...", "..yy....", ".yyyyy..", "...yy...", "..yy....", ".yy.....", "yy......"],
  star: ["...y....", "..yyy...", "yyyyyyy.", ".yyyyy..", "..yyy...", ".yy.yy..", ".y...y..", "........"],
  moon: ["..vvv...", ".vv.....", "vv......", "vv......", "vv......", ".vv.....", "..vvv...", "........"],
};
const icon = (name: keyof typeof ICONS) => pixmap(ICONS[name], ICON_COLORS);

const POKEBALL = double(pixmap(
  [
    ".....kkkkkk.....", "...kkrrrrrrkk...", "..krrrrrrrrrrk..", ".krrwrrrrrrrrrk.", ".krwwrrrrrrrrrk.", "krrrrrrrrrrrrrrk",
    "krrrrrkkkkrrrrrk", "kkkkkkkwwkkkkkkk", "kwwwwwkwwkwwwwwk", "kwwwwwwkkwwwwwwk", ".kwwwwwwwwwwwwk.", ".kwwwwwwwwwwwwk.",
    "..kwwwwwwwwwwk..", "...kkwwwwwwkk...", ".....kkkkkk.....",
  ],
  { k: C.ink, r: C.red, w: C.white },
));

async function covers(): Promise<Record<string, Img>> {
  const out: Record<string, Img> = {};

  // Grid: 3×3 board, condition icons on the edges, Pikachu peeking out of one cell.
  {
    const img = coverBase("#15296a", "#0c1840");
    const x0 = 56, y0 = 22, cell = 20, gap = 3;
    (["fire", "drop", "leaf"] as const).forEach((n, i) => img.blit(icon(n), x0 + i * (cell + gap) + 6, 8));
    (["bolt", "star", "moon"] as const).forEach((n, i) => img.blit(icon(n), x0 - 14, y0 + i * (cell + gap) + 6));
    const pikachu = await sprite(25);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        const x = x0 + c * (cell + gap), y = y0 + r * (cell + gap);
        const solved = (r === 0 && c === 0) || (r === 2 && c === 1);
        img.box(x, y, cell, cell, solved ? hex("#173b4a") : C.night, solved ? C.green : C.line, solved ? hex("#1f5560") : hex("#16245a"));
        if (solved) img.blit(pixmap(["......l", ".....ll", "l...ll.", "ll.ll..", ".lll...", "..l...."], ICON_COLORS), x + 7, y + 7);
        else if (!(r === 1 && c === 2)) text(img, "?", x + 8, y + 8, C.line);
      }
    const cx = x0 + 2 * (cell + gap), cy = y0 + 1 * (cell + gap);
    img.box(cx, cy, cell, cell, hex("#2a3b86"), C.yellow);
    img.blit(pikachu, cx + 1, cy + 4, { clip: [cx + 1, cy + 1, cell - 2, cell - 2] });
    out.grid = img;
  }

  // Guess: mystery silhouette, a big "?", and clue chips (type, generation, height).
  {
    const img = coverBase("#1c2470", "#0d1642");
    place(img, silhouette(await sprite(94), hex("#241c5c"), C.violetLight), 52, 82);
    text(img, "?", 104, 8, C.yellow, 4);
    const chip = (x: number, y: number, fill: RGB, border: RGB) => img.box(x, y, 16, 14, fill, border, shade(border, 1.1));
    chip(92, 46, hex("#3a1830"), C.red);
    img.blit(icon("fire"), 96, 49);
    chip(111, 46, hex("#173b2c"), C.green);
    text(img, "G1", 114, 51, C.greenLight);
    chip(130, 46, hex("#3a3216"), C.yellow);
    img.blit(pixmap(["..y..", ".yyy.", "yyyyy", "..y..", "..y..", "..y.."], ICON_COLORS), 136, 50);
    chip(92, 64, hex("#173b2c"), C.green);
    img.blit(icon("moon"), 96, 67);
    chip(111, 64, C.night, C.line);
    text(img, "?", 117, 69, C.line);
    chip(130, 64, C.night, C.line);
    text(img, "?", 136, 69, C.line);
    out.guess = img;
  }

  // Cuartetos: four colored groups, one Pokémon each.
  {
    const img = coverBase("#13245e", "#0b163c");
    const groups: [number, string, string][] = [[54, "#e0b52a", "#f5d76a"], [1, "#3a9f62", "#71d495"], [7, "#3d63f0", "#8fa9ff"], [92, "#7a52d6", "#b39bff"]];
    for (const [i, [id, fill, light]] of groups.entries()) {
      const x = 10 + (i % 2) * 72, y = 6 + Math.floor(i / 2) * 38;
      img.box(x, y, 68, 34, shade(hex(fill), 0.55), hex(fill), hex(light));
      img.rect(x + 1, y + 1, 66, 3, shade(hex(fill), 0.75));
      for (let k = 0; k < 4; k++) img.rect(x + 6 + k * 6, y + 26, 4, 4, hex(light));
      place(img, await sprite(id), x + 48, y + 33, { clip: [x + 1, y + 1, 66, 32] });
    }
    out.connections = img;
  }

  // PokéBingo: a card of squares with Pokémon silhouettes, and the Pokémon in hand pointing at its square.
  {
    const img = coverBase("#18296b", "#0c1840");
    img.box(8, 8, 98, 74, C.panel, C.line, hex("#25397a"));
    const icons = await Promise.all([16, 19, 41, 74, 43].map((id) => sprite(id, "icon")));
    const spots = [0, 3, 5, 8, 10];
    const marked = new Set([0, 5, 10]);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++) {
        const i = r * 4 + c, x = 13 + c * 23, y = 13 + r * 23;
        img.box(x, y, 20, 20, marked.has(i) ? hex("#173b4a") : C.night, marked.has(i) ? C.green : C.line);
        const s = icons[spots.indexOf(i)];
        if (s) place(img, marked.has(i) ? s : silhouette(s, hex("#2b3f8e"), C.blueLight), x + 10, y + 19, { clip: [x + 1, y + 1, 18, 18] });
      }
    img.box(116, 18, 36, 50, hex("#fff4cc"), C.yellow);
    img.rect(119, 21, 30, 30, hex("#cfe0ff"));
    place(img, await sprite(39), 134, 50, { clip: [119, 21, 30, 30] });
    img.rect(119, 55, 22, 2, C.ink);
    img.rect(119, 60, 14, 2, C.grey);
    // Arrow from the Pokémon in hand towards the card.
    img.blit(pixmap(["..y...", ".yy...", "yyyyyy", ".yy...", "..y..."], ICON_COLORS), 108, 41);
    out.bingo = img;
  }

  // Top 10: podium 2-1-3 with the champion on top.
  {
    const img = coverBase("#1a2a6e", "#0d1844");
    const podium: [number, number, string, RGB, number][] = [[20, 18, "2", C.blueLight, 104], [58, 26, "1", C.yellow, 133], [96, 14, "3", hex("#e08a5a"), 175]];
    for (const [x, h, n, c, id] of podium) {
      img.box(x, 82 - h, 36, h, hex("#22357a"), C.line, shade(c, 0.9));
      text(img, n, x + 15, 82 - h + (h >= 18 ? 4 : 2), c, 2);
      place(img, await sprite(id), x + 18, 82 - h);
    }
    // A short ranking list on the side: #1 highlighted.
    for (let i = 0; i < 4; i++) {
      img.rect(134, 14 + i * 9, 3, 5, i === 0 ? C.yellow : C.line);
      img.rect(139, 14 + i * 9, 16 - i * 2, 5, i === 0 ? C.yellow : C.grey);
    }
    out.top10 = img;
  }

  // PokéWordle: lettered tiles with green / yellow / grey feedback.
  {
    const img = coverBase("#16286a", "#0c1840");
    const G = C.green, Y = hex("#d9a521"), N = C.grey, R = hex("#b8455a");
    const rows: [string, RGB[]][] = [
      ["ZUBAT", [N, N, R, Y, N]],
      ["EKANS", [G, N, Y, N, N]],
      ["EEVEE", [G, G, G, G, G]],
    ];
    const tile = 16, gap = 3, x0 = Math.round((CW - (5 * tile + 4 * gap)) / 2), y0 = 6;
    rows.forEach(([word, colors], r) =>
      [...word].forEach((ch, i) => {
        const x = x0 + i * (tile + gap), y = y0 + r * (tile + gap);
        img.box(x, y, tile, tile, colors[i], shade(colors[i], 1.35), shade(colors[i], 1.2));
        text(img, ch, x + 5, y + 3, C.white, 2);
      }),
    );
    for (let i = 0; i < 5; i++) img.box(x0 + i * (tile + gap), y0 + 3 * (tile + gap), tile, tile, C.night, C.line);
    out.wordle = img;
  }

  // PokéImpostor: a line-up of look-alikes with one clearly different.
  {
    const img = coverBase("#15276a", "#0c1840");
    const [look, odd] = await Promise.all([sprite(7), sprite(4)]);
    for (let i = 0; i < 4; i++) {
      const impostor = i === 2;
      const cx = 23 + i * 38;
      place(img, silhouette(impostor ? odd : look, impostor ? hex("#7a2232") : hex("#21357f"), impostor ? C.redLight : C.blueLight), cx, 81);
      img.rect(cx - 14, 82, 28, 1, impostor ? C.red : C.line);
      if (impostor) {
        img.box(cx - 5, 12, 11, 13, C.red, C.redLight);
        text(img, "!", cx - 1, 16, C.white);
      }
    }
    out.impostor = img;
  }

  // PokéCry: a Poké Ball sending sound waves to a mystery silhouette.
  {
    const img = coverBase("#1a2470", "#0d1642");
    const bx = 34, by = 46;
    img.blit(POKEBALL, bx - 16, by - 16);
    for (const [rad, c] of [[22, C.blueLight], [30, hex("#6d86e0")], [38, hex("#4b5fb8")]] as const)
      for (let a = -0.75; a <= 0.75; a += 0.01) img.set(bx + Math.cos(a) * rad, by + Math.sin(a) * rad, c);
    const bars = [3, 6, 10, 5, 12, 8, 4, 9, 6, 3];
    bars.forEach((h, i) => img.rect(15 + i * 4, 72 - Math.round(h / 2), 2, h, i % 3 === 0 ? C.yellow : C.blueLight));
    place(img, silhouette(await sprite(25), hex("#241c5c"), C.violetLight), 122, 81);
    text(img, "?", 134, 8, C.yellow, 3);
    out.cry = img;
  }
  return out;
}

// ---------------------------------------------------------------- main

(async () => {
  const dir = join(process.cwd(), "public", "home");
  mkdirSync(join(dir, "covers"), { recursive: true });
  const write = (file: string, img: Img) => {
    const png = encodePng(img);
    writeFileSync(join(dir, file), png);
    console.log(`  ${file}  ${img.w}×${img.h}  ${(png.length / 1024).toFixed(1)} KB`);
  };
  for (const [id, img] of Object.entries(await covers())) write(`covers/${id}.png`, img);
})();
