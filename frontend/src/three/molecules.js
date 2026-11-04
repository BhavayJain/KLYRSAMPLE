import * as THREE from "three";

const SIZE = 512;
const texCache = new Map();
const urlCache = new Map();

function setup(color) {
  const c = document.createElement("canvas");
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext("2d");
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.font = "700 40px 'Space Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  return [c, ctx];
}

function bond(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function dbl(ctx, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ox = (-dy / len) * 6, oy = (dx / len) * 6;
  bond(ctx, x1 + ox, y1 + oy, x2 + ox, y2 + oy);
  bond(ctx, x1 - ox, y1 - oy, x2 - ox, y2 - oy);
}

function label(ctx, txt, x, y, size = 40) {
  ctx.font = `700 ${size}px 'Space Mono', monospace`;
  ctx.fillText(txt, x, y);
}

function polygon(ctx, cx, cy, r, sides, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.stroke();
  return pts;
}

function dashed(ctx, x1, y1, x2, y2) {
  ctx.save();
  ctx.setLineDash([8, 10]);
  ctx.lineWidth = 3;
  bond(ctx, x1, y1, x2, y2);
  ctx.restore();
}

function circleLabel(ctx, txt, x, y, r = 46) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.lineWidth = 7;
  label(ctx, txt, x, y, 30);
}

const DRAW = {
  taurine(ctx) {
    label(ctx, "H2N", 92, 300);
    bond(ctx, 140, 290, 195, 258);
    bond(ctx, 195, 258, 252, 296);
    bond(ctx, 252, 296, 310, 258);
    label(ctx, "S", 340, 246);
    dbl(ctx, 330, 218, 300, 160);
    dbl(ctx, 360, 218, 396, 160);
    label(ctx, "O", 296, 140);
    label(ctx, "O", 402, 140);
    bond(ctx, 372, 258, 420, 296);
    label(ctx, "OH", 448, 310);
  },
  ltheanine(ctx) {
    label(ctx, "H2N", 86, 210);
    bond(ctx, 134, 218, 188, 252);
    bond(ctx, 188, 252, 244, 218);
    dbl(ctx, 244, 218, 244, 150);
    label(ctx, "O", 244, 128);
    bond(ctx, 244, 218, 302, 252);
    label(ctx, "OH", 330, 262, 34);
    bond(ctx, 188, 252, 188, 322);
    label(ctx, "HN", 188, 352);
    bond(ctx, 216, 352, 272, 322);
    bond(ctx, 272, 322, 328, 352);
    bond(ctx, 328, 352, 384, 322);
  },
  bcomplex(ctx) {
    polygon(ctx, 256, 256, 108, 6);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(256, 256, 58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 7;
    label(ctx, "B", 256, 256, 52);
    const pts = [[364, 256], [158, 138], [158, 374]];
    const subs = ["6", "1", "12"];
    pts.forEach(([x, y], i) => {
      const dx = x - 256, dy = y - 256;
      const ex = x + (dx / Math.hypot(dx, dy)) * 46;
      const ey = y + (dy / Math.hypot(dx, dy)) * 46;
      bond(ctx, x, y, ex, ey);
      label(ctx, subs[i], ex + 16, ey - 8, 30);
    });
  },
  electrolytes(ctx) {
    label(ctx, "O", 256, 268, 46);
    bond(ctx, 232, 244, 196, 200);
    bond(ctx, 282, 244, 316, 200);
    label(ctx, "H", 184, 182, 32);
    label(ctx, "H", 330, 182, 32);
    const ions = [
      ["Na+", 96, 96], ["K+", 416, 96], ["Mg2+", 90, 416],
      ["Ca2+", 422, 416], ["Cl-", 256, 452],
    ];
    ions.forEach(([t, x, y]) => {
      circleLabel(ctx, t, x, y, t.length > 3 ? 50 : 42);
      dashed(ctx, 256, 268, x, y);
    });
  },
  vitaminc(ctx) {
    const pts = polygon(ctx, 250, 268, 105, 5, -Math.PI / 2 + 0.63);
    label(ctx, "O", 250, 163, 36);
    const [top, ur, br, bl, ul] = pts;
    dbl(ctx, ur[0], ur[1], ur[0] + 66, ur[1] - 40);
    label(ctx, "O", ur[0] + 92, ur[1] - 52);
    bond(ctx, bl[0], bl[1], bl[0] - 60, bl[1] + 46);
    label(ctx, "OH", bl[0] - 84, bl[1] + 62, 32);
    bond(ctx, ul[0], ul[1], ul[0] - 66, ul[1] - 20);
    label(ctx, "OH", ul[0] - 92, ul[1] - 26, 32);
    bond(ctx, ur[0], ur[1], ur[0] + 40, ur[1] + 74);
    label(ctx, "OH", ur[0] + 66, ur[1] + 104, 30);
  },
  zerosugar(ctx) {
    polygon(ctx, 256, 250, 118, 6);
    ctx.lineWidth = 12;
    bond(ctx, 130, 390, 382, 110);
    ctx.lineWidth = 7;
    label(ctx, "0 G", 256, 250, 64);
    label(ctx, "SUGAR", 256, 448, 30);
  },
  caffeine(ctx) {
    const hex = polygon(ctx, 196, 256, 96, 6, 0);
    const pent = polygon(ctx, 340, 246, 76, 5, -Math.PI / 2);
    label(ctx, "N", 340, 170, 34);
    label(ctx, "N", 408, 296, 34);
    label(ctx, "N", 196, 352, 34);
    label(ctx, "N", 120, 210, 34);
    dbl(ctx, hex[1][0], hex[1][1], hex[1][0] - 60, hex[1][1] - 66);
    label(ctx, "O", hex[1][0] - 76, hex[1][1] - 88);
    dbl(ctx, 196, 352, 130, 404);
    label(ctx, "O", 112, 424);
    bond(ctx, 340, 146, 340, 92);
    label(ctx, "CH3", 340, 66, 30);
    bond(ctx, 434, 296, 480, 296);
    label(ctx, "CH3", 500, 330, 26);
    bond(ctx, 120, 186, 76, 142);
    label(ctx, "CH3", 60, 116, 30);
  },
};

function drawMolecule(key, color) {
  const [canvas, ctx] = setup(color);
  (DRAW[key] || DRAW.taurine)(ctx);
  return canvas;
}

export function moleculeDataURL(key, color = "#1B2330") {
  const id = `${key}:${color}`;
  if (!urlCache.has(id)) urlCache.set(id, drawMolecule(key, color).toDataURL("image/png"));
  return urlCache.get(id);
}

export function makeMoleculeTexture(key, color = "#1B2330") {
  const id = `${key}:${color}`;
  if (!texCache.has(id)) {
    const tex = new THREE.CanvasTexture(drawMolecule(key, color));
    tex.anisotropy = 4;
    texCache.set(id, tex);
  }
  return texCache.get(id);
}
