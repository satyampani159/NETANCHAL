import Phaser from 'phaser';
import {
  ALLIANCES,
  ALLIANCE_IDS,
  type AllianceId,
  type CharacterId,
  CHARACTER_IDS,
  CHARACTERS,
  type FxEvent,
  type InputMsg,
  MAP,
  type Ping,
  type Snapshot,
} from '@netanchal/shared';
import { gameAudio } from '../../game/audio';
import { eventBus } from '../../game/EventBus';
import type { GameContext, TouchInput } from '../context';
import { Character, focus } from '../entities/Character';
import { GateGuard } from '../entities/GateGuard';
import { Booth } from '../entities/Booth';
import { drawClutter, drawGround, drawObstacle, makeTower } from '../mapArt';
import { SpecialFx, makeScroll } from '../specialsFx';
import type { HUDScene } from './HUDScene';

/** inputs go out the instant they change; this is the heartbeat that repeats them while held */
const INPUT_HEARTBEAT_HZ = 30;
/** never send faster than this, however jittery a joystick is */
const INPUT_MIN_GAP = 1 / 60;
const FONT = 'Teko, Impact, sans-serif';

// the effect that starts each special: that is when the character shouts
const SPECIAL_FX: Partial<Record<FxEvent['kind'], CharacterId>> = {
  dash: 'vikas_veer',
  volley: 'chanakya_rao',
  speed_wave: 'sadak_kumar',
  bulldoze: 'kila_singh',
  fish: 'toofan_rani',
  lightning: 'bijli_babu',
  book: 'pandit_shabdkosh',
  quake: 'dharna_dada',
};

/** The only scene allowed to touch the room. Renders snapshots, sends input. */
export class MatchScene extends Phaser.Scene {
  private ctx!: GameContext;
  private snap!: Snapshot;
  private characters = new Map<string, Character>();
  private projectiles = new Map<number, Phaser.GameObjects.Container>();
  private fx!: SpecialFx;
  private slowZones = new Map<number, Phaser.GameObjects.Container>();
  private guards = new Map<AllianceId, GateGuard>();
  private booths = new Map<string, Booth>();
  private hqRings = new Map<AllianceId, Phaser.GameObjects.Graphics>();
  private mediaVan!: Phaser.GameObjects.Container;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private sendAcc = 0;
  private lastSentKey = '';
  private specialLatch = false;
  private mouseAttack = false;
  private lastHp = -1;
  private offs: Array<() => void> = [];

  constructor() {
    super('match');
  }

  get me() {
    return this.snap.players.find((p) => p.id === this.ctx.mySlot) ?? null;
  }

  get snapshot() {
    return this.snap;
  }

  create() {
    this.ctx = this.registry.get('ctx') as GameContext;
    this.snap = this.ctx.room.latest.snapshot ?? this.ctx.initialState;

    this.fx = new SpecialFx(this);
    this.drawMap();
    const perSide: Record<string, number> = {};
    for (const b of this.snap.zones.booths) {
      const n = (perSide[b.home] = (perSide[b.home] ?? 0) + 1);
      this.booths.set(b.id, new Booth(this, b, n));
    }
    for (const g of this.snap.guards) this.guards.set(g.alliance, new GateGuard(this, g));
    this.mediaVan = this.makeMediaVan().setVisible(false);

    this.cameras.main.setBounds(-200, -200, MAP.width + 400, MAP.height + 400).setBackgroundColor('#3a2f27');
    this.applySnapshot(this.snap);
    const me = this.characters.get(this.ctx.mySlot);
    if (me) {
      this.cameras.main.startFollow(me, true, 0.12, 0.12);
      this.cameras.main.centerOn(me.x, me.y);
    }
    this.fitZoom();
    this.scale.on('resize', this.fitZoom, this);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,J,K,E,SHIFT') as Record<string, Phaser.Input.Keyboard.Key>;
    for (const k of ['K', 'E', 'SHIFT']) this.keys[k].on('down', () => (this.specialLatch = true));

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch || (this.scene.get('hud') as HUDScene).isOverControl(p)) return;
      if (p.rightButtonDown()) this.specialLatch = true;
      else this.mouseAttack = true;
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!p.leftButtonDown()) this.mouseAttack = false;
    });

    const room = this.ctx.room;
    this.offs.push(
      room.on('snapshot', (s) => this.applySnapshot(s)),
      room.on('round_ended', (r) => eventBus.emit('game:round-ended', r)),
      room.on('match_ended', (m) => eventBus.emit('game:match-ended', m)),
      room.on('ping', (p) => this.showPing(p)),
      eventBus.on('ui:ping', (p) => room.send('ping', p)),
      eventBus.on('coach:target', (t) => (this.coachTarget = t)),
    );
    // `?debug` lets a test (or a curious designer) play any effect on demand
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug')) {
      (window as unknown as Record<string, unknown>).__playFx = (f: FxEvent) => this.playFx(f);
      (window as unknown as Record<string, unknown>).__me = () => this.me;
      (window as unknown as Record<string, unknown>).__coachTarget = () => this.coachTarget;
      (window as unknown as Record<string, unknown>).__game = this.game;
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.offs.forEach((off) => off()));
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.offs.forEach((off) => off()));
  }

  private fitZoom() {
    const { width, height } = this.scale;
    this.cameras.main.setZoom(Phaser.Math.Clamp(Math.min(width / 1050, height / 620), 0.42, 1.25));
  }

  // ---------------- static map ----------------

  private drawMap() {
    const g = this.add.graphics().setDepth(0);
    const gate = MAP.obstacles.find((o) => o.kind === 'gate')!;
    drawGround(g, MAP.width, MAP.height, { cx: gate.x + gate.w / 2, cy: gate.y + gate.h / 2 });

    // each party's tower stands in its capture circle
    for (const a of ALLIANCE_IDS) {
      const hq = MAP.hq[a];
      const color = ALLIANCES[a].color;
      g.fillStyle(color, 0.22).fillCircle(hq.x, hq.y, hq.r);
      g.lineStyle(4, color, 0.9).strokeCircle(hq.x, hq.y, hq.r);
      makeTower(this, hq.x, hq.y - 20, a);
      this.add
        .text(hq.x, hq.y + hq.r + 6, 'POLITICAL TOWER', { fontFamily: FONT, fontSize: '19px', color: '#1F1A17' })
        .setOrigin(0.5, 0)
        .setDepth(1);
      this.hqRings.set(a, this.add.graphics().setDepth(7));
    }

    // walkable scenery: sandbags, crates, trees, lamps, bunting
    drawClutter(this, this.add.graphics().setDepth(1), MAP);

    const art = this.add.graphics().setDepth(2);
    // lower things first so overlapping edges stack sensibly
    [...MAP.obstacles].sort((a, c) => a.y + a.h - (c.y + c.h)).forEach((o) => drawObstacle(this, art, o));
  }

  private makeMediaVan() {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25).fillEllipse(0, 26, 110, 20);
    g.fillStyle(0xf7f5f0).fillRoundedRect(-50, -24, 100, 44, 8).lineStyle(3, 0x1f1a17).strokeRoundedRect(-50, -24, 100, 44, 8);
    g.fillStyle(0x1f1a17).fillCircle(-30, 22, 9).fillCircle(30, 22, 9);
    g.fillStyle(0xc8102e).fillRect(-10, -40, 4, 18).fillCircle(-8, -42, 6);
    const t = this.add.text(0, -2, 'MEDIA', { fontFamily: FONT, fontSize: '17px', color: '#C8102E' }).setOrigin(0.5);
    return this.add.container(0, 0, [g, t]).setDepth(4);
  }

  // ---------------- snapshots ----------------

  private applySnapshot(s: Snapshot) {
    this.snap = s;
    const seen = new Set<string>();
    for (const p of s.players) {
      seen.add(p.id);
      let c = this.characters.get(p.id);
      if (!c) {
        c = new Character(this, p, CHARACTERS[p.characterId].radius, p.id === this.ctx.mySlot);
        this.characters.set(p.id, c);
      } else c.setView(p);
      if (p.id === this.ctx.mySlot && p.hp !== this.lastHp) {
        this.lastHp = p.hp;
        eventBus.emit('game:hp-changed', { playerId: p.id, hp: p.hp, maxHp: p.maxHp });
      }
    }

    const live = new Set<number>();
    for (const pr of s.projectiles) {
      live.add(pr.id);
      let o = this.projectiles.get(pr.id);
      if (!o) {
        if (pr.big) o = makeScroll(this, ALLIANCES[pr.alliance].color).setPosition(pr.x, pr.y);
        else {
          o = this.add.container(pr.x, pr.y, [this.add.circle(0, 0, 7, ALLIANCES[pr.alliance].color).setStrokeStyle(3, 0x1f1a17)]).setDepth(20);
        }
        o.setData('big', !!pr.big);
        this.projectiles.set(pr.id, o);
      }
      o.setData('tx', pr.x).setData('ty', pr.y);
    }
    for (const [id, o] of this.projectiles) if (!live.has(id)) (o.destroy(), this.projectiles.delete(id));

    const zones = new Set<number>();
    for (const z of s.slowZones) {
      zones.add(z.id);
      if (!this.slowZones.has(z.id)) {
        const ring = this.add.circle(0, 0, z.r, 0x7a5c3a, 0.35).setStrokeStyle(4, 0x1f1a17, 0.6);
        const stripes = this.add.graphics();
        stripes.fillStyle(0xffd23f, 0.9);
        for (let i = -2; i <= 2; i++) stripes.fillRect(-z.r * 0.7, i * 18 - 4, z.r * 1.4, 8);
        const label = this.add.text(0, 0, 'SPEED BREAKER', { fontFamily: FONT, fontSize: '14px', color: '#1F1A17' }).setOrigin(0.5);
        this.slowZones.set(z.id, this.add.container(z.x, z.y, [ring, stripes, label]).setDepth(2).setAlpha(0.85));
      }
    }
    for (const [id, o] of this.slowZones) if (!zones.has(id)) (o.destroy(), this.slowZones.delete(id));

    for (const g of s.guards) this.guards.get(g.alliance)?.setView(g);
    for (const b of s.zones.booths) this.booths.get(b.id)?.setView(b);
    for (const a of ALLIANCE_IDS) {
      const ring = this.hqRings.get(a)!;
      const hq = MAP.hq[a];
      ring.clear();
      const p = s.zones.hqCapture[a];
      if (p > 0) {
        const enemy = a === 'rashtra_morcha' ? 'jan_ekta' : 'rashtra_morcha';
        ring.lineStyle(12, ALLIANCES[enemy].color, 1).beginPath();
        ring.arc(hq.x, hq.y, hq.r - 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
        ring.strokePath();
      }
    }
    if (s.mediaVan) this.mediaVan.setPosition(s.mediaVan.x, s.mediaVan.y - 70).setVisible(true);
    else this.mediaVan.setVisible(false);

    for (const f of s.fx) this.playFx(f);
  }

  // ---------------- effects ----------------

  /** where the first-match coach wants you to go */
  private coachTarget: { x: number; y: number; r: number } | null = null;
  private coachArrow?: Phaser.GameObjects.Graphics;
  private lastFloat = 0;
  private floatText(x: number, y: number, text: string, color: string) {
    // one pop-up at a time reads better than a pile
    if (this.time.now - this.lastFloat < 350) return;
    this.lastFloat = this.time.now;
    const t = this.add
      .text(x, y, text, { fontFamily: FONT, fontSize: '15px', color, stroke: '#1F1A17', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(40);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  private ring(x: number, y: number, r: number, color: number, fill = 0.25, duration = 450) {
    const c = this.add.circle(x, y, r, color, fill).setStrokeStyle(5, color, 0.9).setDepth(30).setScale(0.2);
    this.tweens.add({ targets: c, scale: 1, alpha: 0, duration, ease: 'Cubic.easeOut', onComplete: () => c.destroy() });
  }

  private playFx(f: FxEvent) {
    const color = ALLIANCES[f.alliance].color;
    const caster = SPECIAL_FX[f.kind];
    if (caster) {
      const mine = this.me?.characterId === caster;
      // other players' shouts only when they're on screen
      if (mine || this.cameras.main.worldView.contains(f.x, f.y)) gameAudio.playSpecial(caster, mine);
    }
    if ((f.kind === 'ko' || f.kind === 'booth_flip') && this.cameras.main.worldView.contains(f.x, f.y)) gameAudio.sfx(f.kind === 'ko' ? 'ko' : 'flip');
    switch (f.kind) {
      case 'hit': {
        const c = this.add.circle(f.x, f.y, f.r * 0.6, 0xffffff, 0.9).setDepth(30);
        this.tweens.add({ targets: c, scale: 1.6, alpha: 0, duration: 180, onComplete: () => c.destroy() });
        break;
      }
      case 'melee': {
        const g = this.add.graphics().setDepth(30);
        const ang = Math.atan2(f.ty ?? 0, f.tx ?? 1);
        g.lineStyle(8, 0xffffff, 0.9).beginPath();
        g.arc(f.x - (f.tx ?? 0) * f.r * 0.8, f.y - (f.ty ?? 0) * f.r * 0.8, f.r * 1.4, ang - 1, ang + 1);
        g.strokePath();
        this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
        break;
      }
      case 'dash': {
        // the quick streak behind Vikas as he launches; the scissors arrive when he lands
        const g = this.add.graphics().setDepth(5);
        g.fillStyle(0xc8102e, 0.6).fillRect(-6, -4, f.r * 10, 8);
        g.setPosition(f.x, f.y).setRotation(Math.atan2(f.ty ?? 0, f.tx ?? 1));
        this.tweens.add({ targets: g, alpha: 0, duration: 450, onComplete: () => g.destroy() });
        break;
      }
      case 'ko': {
        for (let i = 0; i < 8; i++) {
          const d = this.add.image(f.x, f.y, 'dot').setTint(color).setDepth(31).setScale(1.2);
          const a = (i / 8) * Math.PI * 2;
          this.tweens.add({ targets: d, x: f.x + Math.cos(a) * 60, y: f.y + Math.sin(a) * 60, alpha: 0, scale: 0.2, duration: 500, onComplete: () => d.destroy() });
        }
        this.floatText(f.x, f.y - 30, 'KO!', '#FFFFFF');
        break;
      }
      case 'sweep': {
        this.floatText(f.x, f.y - 110, 'SWEEP! +80', '#FFFFFF');
        this.cameras.main.shake(180, 0.004);
        break;
      }
      case 'booth_flip':
        this.ring(f.x, f.y, f.r + 40, color, 0.35, 700);
        this.floatText(f.x, f.y - 70, `${f.retake ? 'RETAKE' : 'BOOTH!'} +${f.value ?? 0}`, '#FFD23F');
        break;
      case 'guard_shot': {
        const g = this.add.graphics().setDepth(29);
        g.lineStyle(3, color, 0.9).lineBetween(f.x, f.y - 20, f.tx ?? f.x, f.ty ?? f.y);
        this.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
        break;
      }
      default: {
        // the big special effects; shake and flash only for what is on screen
        const near = this.cameras.main.worldView.contains(f.x, f.y);
        this.fx.play(f, near);
      }
    }
  }

  private showPing(p: Ping) {
    const label = { attack: 'ATTACK!', defend: 'DEFEND!', help: 'NEED HELP', 'enemy-hidden': 'ENEMY HIDING' }[p.type];
    const color = { attack: 0xe5484d, defend: 0x7cc4ff, help: 0x4cc38a, 'enemy-hidden': 0xffd23f }[p.type];
    const c = this.add.circle(p.x, p.y, 40, color, 0.2).setStrokeStyle(5, color).setDepth(35);
    this.tweens.add({ targets: c, scale: 1.8, alpha: 0, duration: 700, repeat: 2, onComplete: () => c.destroy() });
    this.floatText(p.x, p.y - 50, `${p.from}: ${label}`, '#FFFFFF');
    (this.scene.get('hud') as HUDScene).addMinimapPing(p.x, p.y, color);
  }

  // ---------------- per frame ----------------

  private buildInput(): InputMsg {
    const k = this.keys;
    let mx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let my = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const touch = this.registry.get('touch') as TouchInput;
    if (mx === 0 && my === 0) {
      mx = touch.mx;
      my = touch.my;
    }
    const msg: InputMsg = {
      mx,
      my,
      attack: k.SPACE.isDown || k.J.isDown || this.mouseAttack || touch.attack,
      special: this.specialLatch || touch.special,
    };
    // mouse aims; keyboard and touch auto-aim at the nearest enemy
    const me = this.characters.get(this.ctx.mySlot);
    const ptr = this.input.activePointer;
    if (me && (this.mouseAttack || (this.specialLatch && !ptr.wasTouch && ptr.rightButtonDown()))) {
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      msg.ax = wp.x - me.x;
      msg.ay = wp.y - me.y;
    }
    return msg;
  }

  private captions: { t: Phaser.GameObjects.Text; base: number }[] | null = null;
  private captionTick = 0;

  /** map captions would be unreadable under the HUD, so they fade out there and come back elsewhere */
  private fadeCaptions(dt: number) {
    this.captionTick += dt;
    if (!this.captions) this.captions = this.children.list.filter((o): o is Phaser.GameObjects.Text => o.type === 'Text' && (o as Phaser.GameObjects.Text).depth <= 2).map((t) => ({ t, base: t.alpha }));
    const hud = this.scene.get('hud') as { reservedRects?: () => { x: number; y: number; w: number; h: number }[] } | undefined;
    const rects = hud?.reservedRects?.() ?? [];
    const cam = this.cameras.main;
    const k = 1 - Math.exp(-dt * 10);
    for (const c of this.captions) {
      if (!c.t.active) continue;
      const b = c.t.getBounds();
      const sx = (b.x - cam.worldView.x) * cam.zoom;
      const sy = (b.y - cam.worldView.y) * cam.zoom;
      const sw = b.width * cam.zoom;
      const sh = b.height * cam.zoom;
      const hit = rects.some((r) => sx < r.x + r.w && sx + sw > r.x && sy < r.y + r.h && sy + sh > r.y);
      c.t.setAlpha(c.t.alpha + ((hit ? 0 : c.base) - c.t.alpha) * k);
    }
  }

  /** a bobbing arrow beside you and a pulsing ring on the target */
  private drawCoachArrow() {
    const g = (this.coachArrow ??= this.add.graphics().setDepth(45));
    g.clear();
    const me = this.characters.get(this.ctx.mySlot);
    const t = this.coachTarget;
    if (!me || !t) return;
    const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 220);
    g.lineStyle(6, 0xffd23f, 0.6 + 0.4 * pulse).strokeCircle(t.x, t.y, t.r + pulse * 10);
    const ang = Math.atan2(t.y - me.y, t.x - me.x);
    const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d < t.r) return;
    const off = 90 + pulse * 12;
    const ax = me.x + Math.cos(ang) * off;
    const ay = me.y + Math.sin(ang) * off;
    g.fillStyle(0xffd23f, 1).lineStyle(4, 0x1f1a17, 1);
    g.beginPath();
    g.moveTo(ax + Math.cos(ang) * 28, ay + Math.sin(ang) * 28);
    g.lineTo(ax + Math.cos(ang + 2.5) * 24, ay + Math.sin(ang + 2.5) * 24);
    g.lineTo(ax + Math.cos(ang - 2.5) * 24, ay + Math.sin(ang - 2.5) * 24);
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  update(_time: number, deltaMs: number) {
    const dt = Math.min(0.1, deltaMs / 1000);
    this.drawCoachArrow();
    this.fadeCaptions(dt);
    const mine = this.characters.get(this.ctx.mySlot);
    if (mine) {
      focus.x = mine.x;
      focus.y = mine.y;
      focus.set = true;
    }
    for (const c of this.characters.values()) c.tick(dt);
    const k = 1 - Math.exp(-dt * 20);
    for (const o of this.projectiles.values()) {
      const dx = (o.getData('tx') as number) - o.x;
      const dy = (o.getData('ty') as number) - o.y;
      o.x += dx * k;
      o.y += dy * k;
      if (o.getData('big') && Math.hypot(dx, dy) > 3) o.setRotation(Math.atan2(dy, dx));
    }

    this.sendAcc += dt;
    if (this.snap.phase === 'playing') {
      const input = this.buildInput();
      const key = `${input.mx.toFixed(2)},${input.my.toFixed(2)},${input.attack ? 1 : 0},${input.special ? 1 : 0},${Math.round(input.ax ?? 0)},${Math.round(input.ay ?? 0)}`;
      const changed = key !== this.lastSentKey;
      // changed -> send now (rate-capped); unchanged -> repeat at the heartbeat so the server never goes stale
      if ((changed && this.sendAcc >= INPUT_MIN_GAP) || this.sendAcc >= 1 / INPUT_HEARTBEAT_HZ) {
        this.sendAcc = 0;
        this.lastSentKey = key;
        this.ctx.room.send('input', input);
        this.specialLatch = false;
        (this.registry.get('touch') as TouchInput).special = false;
      }
    }
  }
}
