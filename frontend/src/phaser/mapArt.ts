// Procedural art for the "Kartavya Path" map. Everything is drawn with Phaser
// graphics so there are no image assets to load.
import Phaser from 'phaser';
import { ALLIANCES, type AllianceId, type Obstacle } from '@netanchal/shared';

const INK = 0x1f1a17;
const FONT = 'Teko, Impact, sans-serif';

export function drawGround(g: Phaser.GameObjects.Graphics, w: number, h: number, gate: { cx: number; cy: number }) {
  g.fillStyle(0xd9c7a3).fillRect(0, 0, w, h);
  g.lineStyle(1, 0xc8b48d, 0.55);
  for (let x = 0; x <= w; x += 100) g.lineBetween(x, 0, x, h);
  for (let y = 0; y <= h; y += 100) g.lineBetween(0, y, w, y);

  // Kartavya Path: the broad road between the two towers
  g.fillStyle(0x8f8576).fillRect(0, 540, w, 120);
  g.fillStyle(0xf7f5f0, 0.85);
  for (let x = 20; x < w; x += 80) g.fillRect(x, 597, 40, 6);
  // two side lanes so the fight is not only on one road
  g.fillStyle(0xb7a684).fillRect(0, 170, w, 70).fillRect(0, 960, w, 70);

  // lawns either side of the path, like the real thing
  g.fillStyle(0x9fb37a, 0.9);
  g.fillRoundedRect(560, 420, 340, 100, 14).fillRoundedRect(560, 680, 340, 100, 14);
  g.fillRoundedRect(1100, 420, 340, 100, 14).fillRoundedRect(1100, 680, 340, 100, 14);

  // roundabout around India Gate
  g.fillStyle(0x8f8576).fillCircle(gate.cx, gate.cy, 250);
  g.fillStyle(0xa9b98a).fillCircle(gate.cx, gate.cy, 190);
  g.lineStyle(4, 0xf7f5f0, 0.5).strokeCircle(gate.cx, gate.cy, 220);

  g.lineStyle(10, 0x6b5a48).strokeRect(0, 0, w, h);
}

function shadow(g: Phaser.GameObjects.Graphics, o: Obstacle, dx = 10, dy = 12) {
  g.fillStyle(0x000000, 0.2).fillRect(o.x + dx, o.y + dy, o.w, o.h);
}

export function drawObstacle(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, o: Obstacle) {
  switch (o.kind) {
    case 'gate':
      return drawIndiaGate(scene, g, o);
    case 'auto':
      return drawAuto(g, o);
    case 'barricade':
      return drawBarricade(g, o);
    case 'stall':
      return drawStall(scene, g, o);
    case 'wall':
      shadow(g, o);
      g.fillStyle(0x9a8a78).fillRect(o.x, o.y, o.w, o.h).lineStyle(3, INK, 0.8).strokeRect(o.x, o.y, o.w, o.h);
      g.lineStyle(2, 0x6b5a48, 0.6);
      for (let y = o.y + 20; y < o.y + o.h; y += 20) g.lineBetween(o.x, y, o.x + o.w, y);
  }
}

function drawIndiaGate(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, o: Obstacle) {
  const cx = o.x + o.w / 2;
  shadow(g, o, 14, 16);
  // plinth steps
  g.fillStyle(0xb98a5e).fillRect(o.x - 8, o.y + o.h - 30, o.w + 16, 30).lineStyle(3, INK, 0.8).strokeRect(o.x - 8, o.y + o.h - 30, o.w + 16, 30);
  // body of the arch
  g.fillStyle(0xd6a173).fillRect(o.x, o.y + 18, o.w, o.h - 40).lineStyle(4, INK, 0.85).strokeRect(o.x, o.y + 18, o.w, o.h - 40);
  // cornice and the little dome on top
  g.fillStyle(0xc98b5e).fillRect(o.x - 6, o.y + 6, o.w + 12, 20).lineStyle(3, INK, 0.85).strokeRect(o.x - 6, o.y + 6, o.w + 12, 20);
  g.fillStyle(0xa86a3e).fillRect(cx - 28, o.y - 2, 56, 10).lineStyle(3, INK, 0.85).strokeRect(cx - 28, o.y - 2, 56, 10);
  // the great arch
  g.fillStyle(0x3a2a22).fillRoundedRect(cx - 38, o.y + 52, 76, o.h - 82, { tl: 38, tr: 38, bl: 0, br: 0 });
  g.lineStyle(4, INK).strokeRoundedRect(cx - 38, o.y + 52, 76, o.h - 82, { tl: 38, tr: 38, bl: 0, br: 0 });
  g.fillStyle(0xf28c28).fillCircle(cx, o.y + 106, 6); // amar jawan jyoti glow
  // chhatri windows either side
  g.fillStyle(0x8a5a38);
  for (const sx of [o.x + 22, o.x + o.w - 22 - 20]) g.fillRoundedRect(sx, o.y + 60, 20, 44, { tl: 10, tr: 10, bl: 0, br: 0 });
  // tricolour band
  g.fillStyle(0xf28c28).fillRect(o.x + 6, o.y + 30, o.w - 12, 6);
  g.fillStyle(0xffffff).fillRect(o.x + 6, o.y + 36, o.w - 12, 6);
  g.fillStyle(0x1e9e6a).fillRect(o.x + 6, o.y + 42, o.w - 12, 6);
  scene.add.text(cx, o.y + o.h + 18, 'INDIA GATE', { fontFamily: FONT, fontSize: '26px', color: '#1F1A17' }).setOrigin(0.5).setDepth(1);
}

/** Green-and-yellow auto-rickshaw, seen from above and a little to the side. */
function drawAuto(g: Phaser.GameObjects.Graphics, o: Obstacle) {
  const dir = o.flip ? -1 : 1;
  const x = o.x;
  const y = o.y;
  g.fillStyle(0x000000, 0.22).fillEllipse(x + o.w / 2 + 4, y + o.h + 3, o.w, 12);
  // wheels
  g.fillStyle(INK);
  g.fillCircle(x + (dir > 0 ? o.w - 14 : 14), y + o.h - 4, 8);
  g.fillCircle(x + (dir > 0 ? 18 : o.w - 18), y + o.h - 4, 8).fillCircle(x + (dir > 0 ? 34 : o.w - 34), y + o.h - 4, 8);
  // green lower body
  g.fillStyle(0x2e8b4f).fillRoundedRect(x + 4, y + 16, o.w - 8, o.h - 22, 6).lineStyle(3, INK, 0.9).strokeRoundedRect(x + 4, y + 16, o.w - 8, o.h - 22, 6);
  // yellow canopy
  g.fillStyle(0xf6c91f).fillRoundedRect(x + (dir > 0 ? 10 : 22), y + 2, o.w - 32, 18, 7).lineStyle(3, INK, 0.9).strokeRoundedRect(x + (dir > 0 ? 10 : 22), y + 2, o.w - 32, 18, 7);
  // windscreen at the front
  const fx = dir > 0 ? x + o.w - 24 : x + 8;
  g.fillStyle(0xcfe7f2).fillRect(fx, y + 10, 16, 14).lineStyle(2, INK, 0.9).strokeRect(fx, y + 10, 16, 14);
  // headlight
  g.fillStyle(0xfff3a8).fillCircle(dir > 0 ? x + o.w - 4 : x + 4, y + 28, 4);
}

function drawBarricade(g: Phaser.GameObjects.Graphics, o: Obstacle) {
  shadow(g, o, 6, 8);
  g.fillStyle(0xf6c91f).fillRect(o.x, o.y, o.w, o.h);
  g.fillStyle(INK);
  const vertical = o.h > o.w;
  const len = vertical ? o.h : o.w;
  for (let t = 0; t < len; t += 24) {
    const seg = Math.min(12, len - t);
    if (vertical) g.fillRect(o.x, o.y + t, o.w, seg);
    else g.fillRect(o.x + t, o.y, seg, o.h);
  }
  g.lineStyle(3, INK).strokeRect(o.x, o.y, o.w, o.h);
  // blue Delhi Police plate in the middle
  const px = o.x + o.w / 2;
  const py = o.y + o.h / 2;
  g.fillStyle(0x2956a5).fillRect(px - 9, py - 7, 18, 14).lineStyle(2, 0xffffff).strokeRect(px - 9, py - 7, 18, 14);
}

function drawStall(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, o: Obstacle) {
  shadow(g, o);
  g.fillStyle(0xa0523d).fillRect(o.x, o.y, o.w, o.h).lineStyle(3, INK, 0.85).strokeRect(o.x, o.y, o.w, o.h);
  // striped awning
  const n = Math.round(o.w / 20);
  for (let i = 0; i < n; i++) g.fillStyle(i % 2 ? 0xffffff : 0xf28c28).fillRect(o.x + (i * o.w) / n, o.y, o.w / n, 24);
  g.lineStyle(3, INK, 0.85).strokeRect(o.x, o.y, o.w, 24);
  if (o.label) scene.add.text(o.x + o.w / 2, o.y + o.h / 2 + 12, o.label, { fontFamily: FONT, fontSize: '22px', color: '#F7F5F0' }).setOrigin(0.5).setDepth(1);
}

/**
 * Political tower: five tiers with lit arched windows, corner chhatris, a
 * golden kalash, marigold garlands, a party badge, loudspeakers, blinking fairy
 * lights and a waving flag. Returns the container; the flag and lights animate.
 */
export function makeTower(scene: Phaser.Scene, x: number, y: number, alliance: AllianceId) {
  const col = ALLIANCES[alliance].color;
  const dark = alliance === 'rashtra_morcha' ? 0xb85a0b : 0x0f6b46;
  const light = alliance === 'rashtra_morcha' ? 0xffb35c : 0x5fd1a0;
  const g = scene.add.graphics();

  // ground glow and shadow
  g.fillStyle(col, 0.18).fillEllipse(0, 52, 230, 64);
  g.fillStyle(0x000000, 0.24).fillEllipse(0, 58, 170, 32);

  // stepped plinth
  g.fillStyle(0xc9b68a).fillRect(-76, 40, 152, 16).fillStyle(0xdccba0).fillRect(-68, 30, 136, 12);
  g.lineStyle(3, INK, 0.9).strokeRect(-76, 40, 152, 16).strokeRect(-68, 30, 136, 12);

  const tiers = [
    { w: 112, h: 46, y: -16 },
    { w: 98, h: 42, y: -58 },
    { w: 84, h: 40, y: -98 },
    { w: 70, h: 38, y: -136 },
    { w: 56, h: 34, y: -170 },
  ];
  tiers.forEach((t, i) => {
    const body = i % 2 ? col : dark;
    g.fillStyle(body).fillRect(-t.w / 2, t.y, t.w, t.h);
    // light edge on the left, shade on the right, for a bit of volume
    g.fillStyle(light, 0.55).fillRect(-t.w / 2, t.y, 8, t.h);
    g.fillStyle(0x000000, 0.18).fillRect(t.w / 2 - 12, t.y, 12, t.h);
    // cornice
    g.fillStyle(0xf3e3c3).fillRect(-t.w / 2 - 5, t.y - 5, t.w + 10, 7).lineStyle(2, INK, 0.9).strokeRect(-t.w / 2 - 5, t.y - 5, t.w + 10, 7);
    g.lineStyle(3, INK, 0.9).strokeRect(-t.w / 2, t.y, t.w, t.h);
    // lit arched windows with a jali cross-bar
    for (let k = -1; k <= 1; k++) {
      const wx = k * (t.w / 3.2) - 8;
      g.fillStyle(0xffe08a).fillRoundedRect(wx, t.y + 8, 16, t.h - 14, { tl: 8, tr: 8, bl: 0, br: 0 });
      g.fillStyle(0xfff3c4, 0.8).fillRoundedRect(wx + 3, t.y + 11, 5, t.h - 22, { tl: 3, tr: 3, bl: 0, br: 0 });
      g.lineStyle(2, INK, 0.9).strokeRoundedRect(wx, t.y + 8, 16, t.h - 14, { tl: 8, tr: 8, bl: 0, br: 0 });
      g.lineStyle(1.5, INK, 0.7).lineBetween(wx, t.y + 8 + (t.h - 14) / 2, wx + 16, t.y + 8 + (t.h - 14) / 2);
    }
    // marigold garland swag on every other tier
    if (i % 2 === 0) {
      for (let k = 0; k <= 12; k++) {
        const u = k / 12;
        const px = -t.w / 2 + 4 + u * (t.w - 8);
        const py = t.y + t.h - 4 + Math.sin(u * Math.PI) * 9;
        g.fillStyle(k % 2 ? 0xffb703 : 0xf28c28).fillCircle(px, py, 3.2);
      }
    }
  });

  // grand door at the base
  g.fillStyle(0x3a2a22).fillRoundedRect(-14, 6, 28, 30, { tl: 14, tr: 14, bl: 0, br: 0 });
  g.fillStyle(0xffe08a, 0.9).fillRoundedRect(-9, 12, 18, 24, { tl: 9, tr: 9, bl: 0, br: 0 });
  g.lineStyle(3, INK).strokeRoundedRect(-14, 6, 28, 30, { tl: 14, tr: 14, bl: 0, br: 0 });

  // corner chhatris on the top tier
  for (const side of [-1, 1]) {
    const cx = side * 36;
    g.fillStyle(0xf3e3c3).fillRect(cx - 4, -190, 8, 20).lineStyle(2, INK).strokeRect(cx - 4, -190, 8, 20);
    g.fillStyle(col).fillEllipse(cx, -194, 20, 14).lineStyle(2, INK).strokeEllipse(cx, -194, 20, 14);
    g.fillStyle(0xffd23f).fillCircle(cx, -203, 2.5);
  }

  // main dome with a golden kalash
  g.fillStyle(0xe8d9b5).fillEllipse(0, -176, 54, 44).fillStyle(light, 0.5).fillEllipse(-9, -183, 22, 18);
  g.lineStyle(3, INK, 0.9).strokeEllipse(0, -176, 54, 44);
  g.fillStyle(0xffc233).fillRect(-3, -206, 6, 12).fillCircle(0, -210, 6).fillTriangle(-4, -214, 4, -214, 0, -226);
  g.lineStyle(2, INK, 0.9).strokeCircle(0, -210, 6);

  // loudspeaker horns
  for (const side of [-1, 1]) {
    g.fillStyle(0xf7f5f0).lineStyle(3, INK, 0.95);
    g.fillTriangle(side * 30, -160, side * 70, -180, side * 70, -142).strokeTriangle(side * 30, -160, side * 70, -180, side * 70, -142);
    g.fillStyle(INK).fillRect(side * 24 - 4, -166, 8, 12);
    g.lineStyle(2, INK, 0.6).lineBetween(side * 74, -168, side * 82, -172).lineBetween(side * 74, -160, side * 84, -160).lineBetween(side * 74, -152, side * 82, -148);
  }

  // party badge on the middle tier
  g.fillStyle(0xf7f5f0).fillCircle(0, -78, 15).lineStyle(3, INK).strokeCircle(0, -78, 15);
  g.fillStyle(col).fillCircle(0, -78, 10);
  scene.add.text(0, -78, ALLIANCES[alliance].short, { fontFamily: FONT, fontSize: '13px', color: alliance === 'rashtra_morcha' ? '#1F1A17' : '#FFFFFF' }).setOrigin(0.5).setName('badge');

  // hanging banners with fringe
  for (const side of [-1, 1]) {
    const bx = side * 66 - 8;
    g.fillStyle(col).fillRect(bx, -92, 16, 46).fillStyle(0xf7f5f0).fillRect(bx, -92, 16, 5).fillRect(bx, -52, 16, 5);
    g.lineStyle(2, INK).strokeRect(bx, -92, 16, 46);
    g.fillStyle(0xffc233).fillCircle(bx + 8, -69, 4);
  }

  // fairy lights along the plinth that blink in turn
  const bulbs: Phaser.GameObjects.Arc[] = [];
  for (let k = 0; k < 12; k++) {
    const u = k / 11;
    const b = scene.add.circle(-72 + u * 144, 56 + Math.sin(u * Math.PI) * 5, 3.5, k % 3 === 0 ? 0xff5d73 : k % 3 === 1 ? 0xffd23f : 0x6ee7b7);
    b.setStrokeStyle(1, INK, 0.8);
    bulbs.push(b);
  }
  scene.tweens.addCounter({
    from: 0,
    to: 3,
    duration: 900,
    repeat: -1,
    onUpdate: (tw) => {
      const phase = Math.floor(tw.getValue() ?? 0);
      bulbs.forEach((b, k) => b.setAlpha(k % 3 === phase ? 1 : 0.35));
    },
  });

  // flag on the pole, waving
  const pole = scene.add.graphics();
  pole.lineStyle(3, INK).lineBetween(0, -226, 0, -262);
  const flag = scene.add.graphics();
  const drawFlag = (t: number) => {
    flag.clear();
    flag.fillStyle(col);
    flag.beginPath();
    flag.moveTo(0, -262);
    for (let k = 0; k <= 8; k++) flag.lineTo(2 + k * 5, -262 + Math.sin(t + k * 0.7) * 3);
    for (let k = 8; k >= 0; k--) flag.lineTo(2 + k * 5, -242 + Math.sin(t + k * 0.7) * 3);
    flag.closePath().fillPath();
    flag.lineStyle(2, INK, 0.9).strokePath();
    flag.fillStyle(0xf7f5f0).fillCircle(14, -252 + Math.sin(t + 0.7 * 3) * 2, 3.5);
  };
  drawFlag(0);
  scene.tweens.addCounter({ from: 0, to: Math.PI * 2, duration: 1400, repeat: -1, onUpdate: (tw) => drawFlag(tw.getValue() ?? 0) });

  const badge = scene.children.getByName('badge') as Phaser.GameObjects.Text | null;
  const parts: Phaser.GameObjects.GameObject[] = [g, ...bulbs, pole, flag];
  if (badge) parts.push(badge);
  return scene.add.container(x, y, parts).setDepth(6);
}

// ---------------- clutter ----------------

function rngFrom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** one sandbag lying on its side */
function bag(g: Phaser.GameObjects.Graphics, x: number, y: number, rot = 0, tone = 0) {
  const fill = [0xc9b27c, 0xbfa56a, 0xd3be8c][tone % 3];
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(rot);
  g.fillStyle(0x000000, 0.18).fillEllipse(2, 4, 28, 13);
  g.fillStyle(fill).fillEllipse(0, 0, 28, 14).lineStyle(2, INK, 0.75).strokeEllipse(0, 0, 28, 14);
  g.lineStyle(1.5, 0x8c7544, 0.8).lineBetween(-6, -2, 4, 2).lineBetween(-2, -4, 8, 0);
  g.restore();
}

/** a stack of bags: `rows` rows, each one shorter, like a proper barrier */
function sandbagWall(g: Phaser.GameObjects.Graphics, x: number, y: number, len: number, rows: number, vertical = false) {
  for (let r = 0; r < rows; r++) {
    const n = len - r;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 25 + (r % 2 ? 6 : 0);
      const lift = -r * 9;
      if (vertical) bag(g, x + lift, y + off, Math.PI / 2, i + r);
      else bag(g, x + off, y + lift, 0, i + r);
    }
  }
}

function crate(g: Phaser.GameObjects.Graphics, x: number, y: number, s = 22) {
  g.fillStyle(0x000000, 0.2).fillRect(x - s / 2 + 3, y - s / 2 + 4, s, s);
  g.fillStyle(0xb8864a).fillRect(x - s / 2, y - s / 2, s, s).lineStyle(2, INK, 0.85).strokeRect(x - s / 2, y - s / 2, s, s);
  g.lineStyle(2, 0x7d5a2f).lineBetween(x - s / 2, y - s / 2, x + s / 2, y + s / 2).lineBetween(x + s / 2, y - s / 2, x - s / 2, y + s / 2);
}

function tyres(g: Phaser.GameObjects.Graphics, x: number, y: number) {
  for (const [dx, dy] of [[0, 0], [11, 3], [4, -9]]) {
    g.fillStyle(INK).fillCircle(x + dx, y + dy, 9).fillStyle(0x6b6b6b).fillCircle(x + dx, y + dy, 4);
  }
}

function tree(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number) {
  g.fillStyle(0x000000, 0.2).fillCircle(x + 6, y + 8, r);
  g.fillStyle(0x4f7a3a).fillCircle(x, y, r).fillStyle(0x62924a).fillCircle(x - r * 0.25, y - r * 0.25, r * 0.7).fillStyle(0x7bad5c, 0.8).fillCircle(x - r * 0.4, y - r * 0.4, r * 0.35);
  g.lineStyle(2.5, INK, 0.7).strokeCircle(x, y, r);
}

function lamp(g: Phaser.GameObjects.Graphics, x: number, y: number) {
  g.fillStyle(0x000000, 0.18).fillEllipse(x + 4, y + 6, 14, 6);
  g.lineStyle(4, 0x4a4a4a).lineBetween(x, y + 4, x, y - 22);
  g.fillStyle(0xffe08a).fillCircle(x, y - 24, 6).lineStyle(2, INK, 0.9).strokeCircle(x, y - 24, 6);
}

function cone(g: Phaser.GameObjects.Graphics, x: number, y: number) {
  g.fillStyle(0xf26a1b).fillTriangle(x - 7, y + 8, x + 7, y + 8, x, y - 10).fillStyle(0xffffff).fillRect(x - 4, y - 1, 8, 4);
  g.lineStyle(2, INK, 0.8).strokeTriangle(x - 7, y + 8, x + 7, y + 8, x, y - 10);
}

function chaiCups(g: Phaser.GameObjects.Graphics, x: number, y: number) {
  g.fillStyle(0xe8d9b5).fillRect(x - 12, y - 4, 24, 8).lineStyle(2, INK, 0.8).strokeRect(x - 12, y - 4, 24, 8);
  for (const dx of [-6, 6]) g.fillStyle(0xb5562b).fillCircle(x + dx, y, 3.2);
}

function bunting(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number) {
  g.lineStyle(2, INK, 0.7).lineBetween(x0, y0, x1, y1);
  const n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / 22);
  const cols = [0xf28c28, 0xffffff, 0x1e9e6a, 0xffd23f];
  for (let i = 1; i < n; i++) {
    const u = i / n;
    const px = x0 + (x1 - x0) * u;
    const py = y0 + (y1 - y0) * u;
    g.fillStyle(cols[i % cols.length]).fillTriangle(px - 6, py, px + 6, py, px, py + 13).lineStyle(1.5, INK, 0.6).strokeTriangle(px - 6, py, px + 6, py, px, py + 13);
  }
}

/**
 * Scenery that does not block anyone: sandbag emplacements around every CRPF
 * post, scattered props along the lanes, trees on the lawns, and bunting.
 * Positions come from a fixed seed, so every client draws the same street.
 */
export function drawClutter(
  scene: Phaser.Scene,
  g: Phaser.GameObjects.Graphics,
  map: {
    width: number;
    height: number;
    obstacles: Obstacle[];
    booths: Record<AllianceId, { x: number; y: number; r: number }[]>;
    hq: Record<AllianceId, { x: number; y: number; r: number }>;
    guardPosts: Record<AllianceId, { x: number; y: number }>;
  },
) {
  const rng = rngFrom(20261030);
  const boothList = [...map.booths.rashtra_morcha, ...map.booths.jan_ekta];

  // keep scatter props off buildings, booths, towers, gates and the main road
  const free = (x: number, y: number, pad = 28) => {
    if (x < 30 || y < 30 || x > map.width - 30 || y > map.height - 30) return false;
    if (map.obstacles.some((o) => x > o.x - pad && x < o.x + o.w + pad && y > o.y - pad && y < o.y + o.h + pad)) return false;
    if (boothList.some((b) => Math.hypot(x - b.x, y - b.y) < b.r + 40)) return false;
    for (const a of ['rashtra_morcha', 'jan_ekta'] as const) {
      if (Math.hypot(x - map.hq[a].x, y - map.hq[a].y) < map.hq[a].r + 60) return false;
      if (Math.hypot(x - map.guardPosts[a].x, y - map.guardPosts[a].y) < 80) return false;
    }
    if (y > 520 && y < 680) return false;
    return true;
  };

  // sandbag horseshoes around each booth's CRPF jawan and a sandbag nest by each tower gate
  for (const b of boothList) {
    sandbagWall(g, b.x - 44, b.y + 16, 3, 2, true);
    sandbagWall(g, b.x - 44, b.y + 44, 2, 1);
  }
  for (const a of ['rashtra_morcha', 'jan_ekta'] as const) {
    const gp = map.guardPosts[a];
    sandbagWall(g, gp.x, gp.y - 52, 4, 2);
    sandbagWall(g, gp.x, gp.y + 70, 4, 2);
  }

  // sandbag lines at the edges of the road and lane mouths
  for (const x of [610, 880, 1120, 1390]) {
    sandbagWall(g, x, 524, 3, 2);
    sandbagWall(g, x + 20, 700, 3, 2);
  }

  // loose props, rejection-sampled
  const place = (count: number, fn: (x: number, y: number) => void, pad = 28) => {
    let placed = 0;
    for (let tries = 0; tries < count * 40 && placed < count; tries++) {
      const x = 40 + rng() * (map.width - 80);
      const y = 40 + rng() * (map.height - 80);
      if (!free(x, y, pad)) continue;
      fn(x, y);
      placed++;
    }
  };
  place(16, (x, y) => bag(g, x, y, (rng() - 0.5) * 1.2, Math.floor(rng() * 3)));
  place(10, (x, y) => sandbagWall(g, x, y, 2 + Math.floor(rng() * 2), 1 + Math.floor(rng() * 2), rng() < 0.4));
  place(9, (x, y) => crate(g, x, y, 18 + rng() * 10));
  place(6, (x, y) => tyres(g, x, y));
  place(9, (x, y) => cone(g, x, y));
  place(5, (x, y) => chaiCups(g, x, y));
  place(9, (x, y) => lamp(g, x, y), 40);
  place(12, (x, y) => tree(g, x, y, 22 + rng() * 14), 46);

  // litter and puddles
  place(24, (x, y) => g.fillStyle(0xf3ead3, 0.9).fillRect(x, y, 6 + rng() * 5, 4 + rng() * 4).lineStyle(1, INK, 0.4).strokeRect(x, y, 6, 4), 10);
  place(7, (x, y) => g.fillStyle(0x8eb4c4, 0.45).fillEllipse(x, y, 40 + rng() * 30, 18 + rng() * 10), 20);

  // bunting across the lane mouths, in the tricolour and festival yellow
  bunting(g, 560, 170, 1440, 170);
  bunting(g, 560, 1030, 1440, 1030);
  scene.add.text(map.width / 2, 78, 'KARTAVYA PATH', { fontFamily: FONT, fontSize: '40px', color: '#8f7a55' }).setOrigin(0.5).setDepth(1).setAlpha(0.45);
}
