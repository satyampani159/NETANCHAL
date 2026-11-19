// Big, readable art for the eight specials, drawn with Phaser graphics (no image files).
// Every special is a visible prop: scissors, bulldozer, fish, lightning, speed breakers, a flying scroll
// volley, a falling dictionary and a ground-cracking quake. Delayed strikes (lightning, the dictionary)
// show a warning circle first so players can step out of them.
import Phaser from 'phaser';
import { ALLIANCES, type FxEvent } from '@netanchal/shared';

const INK = 0x1f1a17;
const FONT = 'Teko, Impact, sans-serif';

type Pt = { x: number; y: number };

const poly = (g: Phaser.GameObjects.Graphics, pts: Array<[number, number]>) => {
  g.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
  g.closePath();
};

export class SpecialFx {
  constructor(private scene: Phaser.Scene) {}

  /** Plays the effect for one special event. Returns false for events that are not specials. */
  play(f: FxEvent, near: boolean) {
    switch (f.kind) {
      case 'cut':
        this.scissors(f, near);
        return true;
      case 'bulldoze':
        this.bulldozer(f);
        return true;
      case 'fish':
        this.fish(f, near);
        return true;
      case 'lightning':
        this.lightning(f, near);
        return true;
      case 'speed_wave':
        this.speedBreakers(f, near);
        return true;
      case 'volley':
        this.volleyFlash(f);
        return true;
      case 'book':
        this.dictionary(f, near);
        return true;
      case 'quake':
        this.quake(f, near);
        return true;
      case 'heal':
        this.healPlus(f);
        return true;
      default:
        return false;
    }
  }

  private shake(near: boolean, ms: number, power: number) {
    if (near) this.scene.cameras.main.shake(ms, power);
  }

  private dust(x: number, y: number, n = 6, spread = 40, color = 0xd9c7a3) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = this.scene.add.circle(x, y, 8 + Math.random() * 10, color, 0.7).setDepth(34);
      this.scene.tweens.add({
        targets: d,
        x: x + Math.cos(a) * spread * (0.4 + Math.random()),
        y: y + Math.sin(a) * spread * (0.4 + Math.random()) - 8,
        scale: 1.8,
        alpha: 0,
        duration: 450 + Math.random() * 250,
        onComplete: () => d.destroy(),
      });
    }
  }

  // ---------- Vikas Veer: giant scissors cut the ribbon ----------

  private scissors(f: FxEvent, near: boolean) {
    const s = this.scene;
    const ang = Math.atan2(f.ty ?? 0, f.tx ?? 1);
    const L = f.r * 1.1;
    const root = s.add.container(f.x, f.y).setDepth(42).setRotation(ang);

    const blade = (sign: 1 | -1) => {
      const c = s.add.container(0, 0);
      const g = s.add.graphics();
      g.fillStyle(0xe9eff6);
      poly(g, [[-6, sign * -4], [L, sign * -1], [L, sign * 7], [-6, sign * 12]]);
      g.fillPath();
      g.lineStyle(5, INK, 1).strokePath();
      g.lineStyle(3, 0xffffff, 0.9).lineBetween(8, sign * 3, L - 10, sign * 2);
      // pivot screw and the red ring handle
      g.fillStyle(0x8a94a0).fillCircle(0, 0, 8).lineStyle(3, INK).strokeCircle(0, 0, 8);
      g.lineStyle(11, 0xc8102e).strokeCircle(-40, sign * 6, 19);
      g.lineStyle(4, INK).strokeCircle(-40, sign * 6, 25).strokeCircle(-40, sign * 6, 13);
      c.add(g);
      return c;
    };
    const top = blade(1);
    const bottom = blade(-1);
    root.add([bottom, top]);
    top.setRotation(1.15);
    bottom.setRotation(-1.15);
    root.setScale(0.7);

    // open wide, then SNAP
    s.tweens.add({ targets: root, scale: 1, duration: 120, ease: 'Back.easeOut' });
    s.tweens.add({ targets: top, rotation: 0.05, duration: 120, delay: 130, ease: 'Cubic.easeIn' });
    s.tweens.add({
      targets: bottom,
      rotation: -0.05,
      duration: 120,
      delay: 130,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.shake(near, 140, 0.006);
        // the ribbon falls in two pieces and a star of light flashes at the tip
        const tip: Pt = { x: f.x + Math.cos(ang) * L, y: f.y + Math.sin(ang) * L };
        for (const side of [-1, 1]) {
          const rb = s.add.rectangle(tip.x, tip.y, 46, 12, 0xc8102e).setStrokeStyle(2, INK).setDepth(43).setRotation(ang);
          s.tweens.add({ targets: rb, x: tip.x + Math.cos(ang + side * 1.5) * 70, y: tip.y + Math.sin(ang + side * 1.5) * 70, rotation: ang + side * 2.2, alpha: 0, duration: 650, ease: 'Cubic.easeOut', onComplete: () => rb.destroy() });
        }
        const star = s.add.graphics().setDepth(44).setPosition(tip.x, tip.y);
        star.lineStyle(6, 0xffffff, 1);
        for (let i = 0; i < 8; i++) star.lineBetween(0, 0, Math.cos((i * Math.PI) / 4) * 46, Math.sin((i * Math.PI) / 4) * 46);
        s.tweens.add({ targets: star, scale: 1.6, alpha: 0, duration: 320, onComplete: () => star.destroy() });
      },
    });
    s.tweens.add({ targets: root, alpha: 0, duration: 260, delay: 520, onComplete: () => root.destroy() });
  }

  // ---------- Kila Singh: bulldozer ----------

  private bulldozer(f: FxEvent) {
    const s = this.scene;
    const toX = f.tx ?? f.x;
    const toY = f.ty ?? f.y;
    const dir = toX >= f.x ? 1 : -1;
    const dur = (f.dur ?? 0.6) * 1000;
    const c = s.add.container(f.x, f.y).setDepth(9).setScale(1.5 * dir, 1.5);
    const g = s.add.graphics();
    // tracks and wheels
    g.fillStyle(INK).fillRoundedRect(-58, 10, 116, 26, 12);
    g.fillStyle(0x6b6b6b);
    for (const wx of [-40, -14, 14, 40]) g.fillCircle(wx, 23, 9);
    // body, hood and cab
    g.fillStyle(0xf6c91f).fillRect(-46, -20, 92, 34).lineStyle(4, INK).strokeRect(-46, -20, 92, 34);
    g.fillStyle(0xf6c91f).fillRect(-44, -56, 44, 38).lineStyle(4, INK).strokeRect(-44, -56, 44, 38);
    g.fillStyle(0xcfe7f2).fillRect(-38, -50, 30, 24).lineStyle(3, INK).strokeRect(-38, -50, 30, 24);
    g.fillStyle(INK).fillRect(-30, -68, 8, 14);
    g.fillStyle(0xe0a800).fillRect(4, -8, 38, 8);
    // the blade at the front
    g.fillStyle(0x9aa3ad);
    poly(g, [[52, -34], [68, -38], [68, 30], [52, 26]]);
    g.fillPath();
    g.lineStyle(4, INK).strokePath();
    g.lineStyle(5, INK).lineBetween(40, -4, 54, -4);
    c.add(g);

    const puff = s.time.addEvent({
      delay: 45,
      loop: true,
      callback: () => {
        const d = s.add.circle(c.x - dir * 60, c.y + 22, 10 + Math.random() * 10, 0xd9c7a3, 0.8).setDepth(8);
        s.tweens.add({ targets: d, scale: 2.2, alpha: 0, y: d.y - 12, duration: 420, onComplete: () => d.destroy() });
        const k = s.add.circle(c.x - dir * 38, c.y - 78, 6, 0x555555, 0.7).setDepth(11);
        s.tweens.add({ targets: k, y: k.y - 26, scale: 2, alpha: 0, duration: 380, onComplete: () => k.destroy() });
      },
    });
    s.tweens.add({
      targets: c,
      x: toX,
      y: toY,
      duration: dur,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        puff.remove();
        s.tweens.add({ targets: c, alpha: 0, duration: 200, onComplete: () => c.destroy() });
      },
    });
  }

  // ---------- Toofan Rani: a giant fish, swung all the way round ----------

  private fish(f: FxEvent, near: boolean) {
    const s = this.scene;
    const facing = Math.atan2(f.ty ?? 0, f.tx ?? 1);
    const dur = (f.dur ?? 0.45) * 1000;
    const c = s.add.container(f.x, f.y).setDepth(41);
    const g = s.add.graphics();
    const len = Math.max(150, f.r * 1.05);
    const cx = 36 + len / 2;
    // body: silver hilsa with a darker back and a pale belly
    g.fillStyle(0x7f94aa).fillEllipse(cx, -4, len, 58);
    g.fillStyle(0xd9e2ec).fillEllipse(cx, 6, len * 0.96, 40);
    g.fillStyle(0xf4f8fb).fillEllipse(cx, 16, len * 0.8, 20);
    g.lineStyle(5, INK).strokeEllipse(cx, 0, len, 58);
    // scales
    g.lineStyle(2, 0x7f94aa, 0.8);
    for (let i = 0; i < 5; i++) for (let j = -1; j <= 1; j++) g.strokeCircle(cx - len * 0.3 + i * 20, j * 14, 10);
    // tail (held in her hand), fins, gill and the face
    g.fillStyle(0x9fb4c8);
    poly(g, [[44, 0], [4, -34], [4, 34]]);
    g.fillPath();
    g.lineStyle(4, INK).strokePath();
    g.fillStyle(0x9fb4c8);
    poly(g, [[cx - 10, -28], [cx + 24, -52], [cx + 34, -26]]);
    g.fillPath();
    g.lineStyle(4, INK).strokePath();
    g.lineStyle(4, INK).beginPath().arc(cx + len * 0.2, 0, 26, -1.1, 1.1).strokePath();
    g.fillStyle(0xffffff).fillCircle(cx + len * 0.36, -8, 11).lineStyle(3, INK).strokeCircle(cx + len * 0.36, -8, 11);
    g.fillStyle(INK).fillCircle(cx + len * 0.38, -8, 5);
    g.lineStyle(4, INK).lineBetween(cx + len * 0.46, 8, cx + len * 0.36, 12);
    c.add(g);

    // swing round once, with a streak behind it
    const start = facing - 1.35;
    const trail = s.add.graphics().setDepth(40).setPosition(f.x, f.y);
    s.tweens.addCounter({
      from: 0,
      to: 1,
      duration: dur,
      ease: 'Cubic.easeOut',
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        const a = start + k * Math.PI * 2;
        c.setRotation(a);
        trail.clear();
        trail.lineStyle(26, 0xffffff, 0.5 * (1 - k * 0.6)).beginPath().arc(0, 0, f.r * 0.72, start, a).strokePath();
        trail.lineStyle(10, 0xbfe3ff, 0.7 * (1 - k * 0.6)).beginPath().arc(0, 0, f.r * 0.72, Math.max(start, a - 1.6), a).strokePath();
      },
      onComplete: () => {
        this.shake(near, 140, 0.005);
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = s.add.circle(f.x + Math.cos(a) * f.r * 0.6, f.y + Math.sin(a) * f.r * 0.6, 6, 0x8fd3ff, 0.9).setDepth(42);
          s.tweens.add({ targets: d, x: f.x + Math.cos(a) * f.r * 1.15, y: f.y + Math.sin(a) * f.r * 1.15, alpha: 0, duration: 380, onComplete: () => d.destroy() });
        }
        s.tweens.add({ targets: [c, trail], alpha: 0, duration: 180, onComplete: () => (c.destroy(), trail.destroy()) });
      },
    });
    const ring = s.add.circle(f.x, f.y, f.r, ALLIANCES[f.alliance].color, 0.18).setStrokeStyle(5, 0xffffff, 0.8).setDepth(30).setScale(0.3);
    s.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: dur + 150, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  // ---------- Bijli Babu: red circle, then lightning ----------

  private lightning(f: FxEvent, near: boolean) {
    const s = this.scene;
    const dur = (f.dur ?? 0.6) * 1000;
    // the warning: a red circle that closes in
    const warn = s.add.circle(f.x, f.y, f.r, 0xe5484d, 0.22).setStrokeStyle(5, 0xe5484d, 0.95).setDepth(31);
    const inner = s.add.circle(f.x, f.y, f.r, 0xffffff, 0).setStrokeStyle(4, 0xffffff, 0.9).setDepth(31);
    s.tweens.add({ targets: inner, scale: 0.15, duration: dur, ease: 'Linear' });
    s.tweens.add({ targets: warn, alpha: 0.5, yoyo: true, repeat: 3, duration: dur / 8 });
    const cloud = s.add.ellipse(f.x, f.y - 340, f.r * 3, 60, 0x2a3140, 0.5).setDepth(41);
    s.tweens.add({ targets: cloud, alpha: 0.85, duration: dur });

    s.time.delayedCall(dur, () => {
      warn.destroy();
      inner.destroy();
      const topY = f.y - 760;
      const pts: Pt[] = [{ x: f.x + (Math.random() - 0.5) * 80, y: topY }];
      const steps = 9;
      for (let i = 1; i < steps; i++) pts.push({ x: f.x + (Math.random() - 0.5) * 60, y: topY + ((f.y - topY) * i) / steps });
      pts.push({ x: f.x, y: f.y });
      const bolt = s.add.graphics().setDepth(45);
      const stroke = (w: number, col: number, a: number) => {
        bolt.lineStyle(w, col, a).beginPath().moveTo(pts[0].x, pts[0].y);
        for (const p of pts.slice(1)) bolt.lineTo(p.x, p.y);
        bolt.strokePath();
      };
      stroke(34, 0x7cc4ff, 0.3);
      stroke(18, 0xfff3a8, 0.75);
      stroke(7, 0xffffff, 1);
      // a couple of branches
      for (const i of [3, 6]) {
        bolt.lineStyle(6, 0xfff3a8, 0.9).beginPath().moveTo(pts[i].x, pts[i].y).lineTo(pts[i].x + (Math.random() < 0.5 ? -1 : 1) * 70, pts[i].y + 70).strokePath();
      }
      const scorch = s.add.circle(f.x, f.y, f.r * 0.75, 0x1f1a17, 0.4).setDepth(3);
      const flash = s.add.circle(f.x, f.y, f.r * 1.2, 0xffffff, 0.8).setDepth(44);
      this.shake(near, 160, 0.008);
      if (near) s.cameras.main.flash(90, 255, 255, 255);
      this.dust(f.x, f.y, 6, f.r, 0xfff3a8);
      s.tweens.add({ targets: [bolt, flash, cloud], alpha: 0, duration: 260, onComplete: () => (bolt.destroy(), flash.destroy(), cloud.destroy()) });
      s.tweens.add({ targets: scorch, alpha: 0, duration: 1800, delay: 500, onComplete: () => scorch.destroy() });
    });
  }

  // ---------- Sadak Kumar: a row of speed breakers ----------

  private speedBreakers(f: FxEvent, near: boolean) {
    const s = this.scene;
    const tx = f.tx ?? f.x;
    const ty = f.ty ?? f.y;
    const len = Math.hypot(tx - f.x, ty - f.y) || 1;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const n = Math.max(3, Math.floor(len / 54));
    for (let i = 0; i < n; i++) {
      const d = 50 + ((len - 50) * i) / Math.max(1, n - 1);
      const x = f.x + Math.cos(ang) * d;
      const y = f.y + Math.sin(ang) * d;
      const hump = s.add.container(x, y).setDepth(4).setRotation(ang + Math.PI / 2).setScale(1, 0);
      const g = s.add.graphics();
      const w = f.r * 2;
      g.fillStyle(0x2b2b2b).fillRoundedRect(-w / 2, -16, w, 32, 16);
      g.fillStyle(0xf6c91f);
      for (let k = 0; k < 6; k++) g.fillRoundedRect(-w / 2 + 6 + k * (w / 6), -12, w / 12 + 4, 24, 4);
      g.lineStyle(4, INK).strokeRoundedRect(-w / 2, -16, w, 32, 16);
      g.fillStyle(0xffffff, 0.35).fillRoundedRect(-w / 2 + 10, -14, w - 20, 7, 3);
      hump.add(g);
      s.tweens.add({ targets: hump, scaleY: 1, duration: 200, delay: i * 55, ease: 'Back.easeOut', onStart: () => this.dust(x, y, 3, 36) });
      // they stay as the slow strip for a few seconds, then sink back
      s.tweens.add({ targets: hump, alpha: 0, duration: 500, delay: 2500 + i * 55, onComplete: () => hump.destroy() });
    }
    this.shake(near, 220, 0.004);
  }

  // ---------- Chanakya Rao: the volley itself is drawn as big scrolls; this is the cast flash ----------

  private volleyFlash(f: FxEvent) {
    const ang = Math.atan2(f.ty ?? 0, f.tx ?? 1);
    const g = this.scene.add.graphics().setDepth(41).setPosition(f.x, f.y).setRotation(ang);
    g.fillStyle(0xf3e2b3, 0.55);
    g.beginPath().moveTo(0, 0).arc(0, 0, 90, -0.46, 0.46).closePath().fillPath();
    g.lineStyle(4, INK, 0.6).beginPath().arc(0, 0, 90, -0.46, 0.46).strokePath();
    this.scene.tweens.add({ targets: g, alpha: 0, scale: 1.5, duration: 280, onComplete: () => g.destroy() });
  }

  // ---------- Pandit Shabdkosh: a giant dictionary slams down ----------

  private dictionary(f: FxEvent, near: boolean) {
    const s = this.scene;
    const dur = (f.dur ?? 0.4) * 1000;
    const warn = s.add.circle(f.x, f.y, f.r, 0xffd23f, 0.2).setStrokeStyle(5, 0xffd23f, 0.95).setDepth(31);
    s.tweens.add({ targets: warn, alpha: 0.55, yoyo: true, repeat: 2, duration: dur / 6 });

    const book = s.add.container(f.x, f.y - 520).setDepth(46).setScale(1.5).setRotation(-0.25);
    const g = s.add.graphics();
    g.fillStyle(0x000000, 0.25).fillRoundedRect(-62, -42, 140, 104, 8);
    g.fillStyle(0xf3ead3).fillRect(-70, 38, 140, 14).lineStyle(3, INK).strokeRect(-70, 38, 140, 14);
    g.fillStyle(0x7b2d26).fillRoundedRect(-72, -52, 144, 96, 8).lineStyle(5, INK).strokeRoundedRect(-72, -52, 144, 96, 8);
    g.fillStyle(0x5a1f1a).fillRect(-72, -52, 20, 96);
    g.lineStyle(4, 0xffc233).strokeRect(-40, -38, 100, 68).strokeRect(-34, -32, 88, 56);
    g.fillStyle(0xffc233).fillRect(-26, -22, 64, 8).fillRect(-26, -6, 64, 5).fillRect(-26, 6, 48, 5);
    g.fillStyle(0xc8102e).fillRect(40, 44, 10, 26);
    book.add(g);
    book.add(s.add.text(6, -10, 'SHABDKOSH', { fontFamily: FONT, fontSize: '16px', color: '#FFC233' }).setOrigin(0.5));
    s.tweens.add({
      targets: book,
      y: f.y - 6,
      scale: 1.05,
      rotation: 0,
      duration: dur,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.shake(near, 170, 0.009);
        warn.destroy();
        const ring = s.add.circle(f.x, f.y, f.r * 0.4, 0xffffff, 0.35).setStrokeStyle(6, 0xffffff, 0.9).setDepth(33);
        s.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
        this.dust(f.x, f.y, 8, f.r);
        // letters fly out of the pages
        for (const ch of ['A', 'अ', 'B', 'क', 'Z', 'ब', '?', '!']) {
          const a = Math.random() * Math.PI * 2;
          const t = s.add.text(f.x, f.y, ch, { fontFamily: FONT, fontSize: `${28 + Math.random() * 18}px`, color: '#FFFFFF', stroke: '#1F1A17', strokeThickness: 5 }).setOrigin(0.5).setDepth(47);
          s.tweens.add({ targets: t, x: f.x + Math.cos(a) * (f.r + 40), y: f.y + Math.sin(a) * (f.r + 40) - 30, rotation: (Math.random() - 0.5) * 4, alpha: 0, duration: 650, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
        }
        s.tweens.add({ targets: book, alpha: 0, duration: 400, delay: 350, onComplete: () => book.destroy() });
      },
    });
  }

  // ---------- Dharna Dada: the quake ----------

  private quake(f: FxEvent, near: boolean) {
    const s = this.scene;
    this.shake(near, 260, 0.009);
    const color = ALLIANCES[f.alliance].color;
    for (const [delay, scaleTo] of [[0, 1], [110, 0.7]] as const) {
      const ring = s.add.circle(f.x, f.y, f.r, color, 0.2).setStrokeStyle(8, 0xffffff, 0.85).setDepth(32).setScale(0.15);
      s.tweens.add({ targets: ring, scale: scaleTo, alpha: 0, duration: 520, delay, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
    // cracks fan out of the spot he slammed
    const cracks = s.add.graphics().setDepth(3).setPosition(f.x, f.y);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + Math.random() * 0.3;
      let px = 0;
      let py = 0;
      cracks.lineStyle(7, 0x1f1a17, 0.85).beginPath().moveTo(0, 0);
      const segs = 5;
      for (let k = 1; k <= segs; k++) {
        const d = (f.r * k) / segs;
        px = Math.cos(a) * d + (Math.random() - 0.5) * 22;
        py = Math.sin(a) * d + (Math.random() - 0.5) * 22;
        cracks.lineTo(px, py);
      }
      cracks.strokePath();
    }
    s.tweens.add({ targets: cracks, alpha: 0, duration: 1600, delay: 700, onComplete: () => cracks.destroy() });
    this.dust(f.x, f.y, 12, f.r);
  }

  // ---------- healing at the tower ----------

  private healPlus(f: FxEvent) {
    const s = this.scene;
    for (let i = 0; i < 3; i++) {
      const t = s.add.text(f.x + (Math.random() - 0.5) * 40, f.y - 10, '+', { fontFamily: FONT, fontSize: '34px', color: '#7CF0B0', stroke: '#0F6B46', strokeThickness: 5 }).setOrigin(0.5).setDepth(40);
      s.tweens.add({ targets: t, y: t.y - 50 - Math.random() * 20, alpha: 0, duration: 700, delay: i * 120, onComplete: () => t.destroy() });
    }
  }
}

/** A big flying scroll for Chanakya's volley. Returns a container that MatchScene moves and rotates. */
export function makeScroll(scene: Phaser.Scene, color: number) {
  const c = scene.add.container(0, 0).setDepth(21);
  const g = scene.add.graphics();
  g.fillStyle(0xf3e2b3).fillRoundedRect(-24, -8, 48, 16, 4).lineStyle(3, INK).strokeRoundedRect(-24, -8, 48, 16, 4);
  g.fillStyle(0xd8bd7c).fillCircle(-24, 0, 10).fillCircle(24, 0, 10);
  g.lineStyle(3, INK).strokeCircle(-24, 0, 10).strokeCircle(24, 0, 10);
  g.lineStyle(2, 0x9a7a3a).lineBetween(-14, -3, 12, -3).lineBetween(-14, 3, 8, 3);
  g.fillStyle(color).fillCircle(0, 0, 6).lineStyle(2, INK).strokeCircle(0, 0, 6);
  c.add(g);
  return c;
}
