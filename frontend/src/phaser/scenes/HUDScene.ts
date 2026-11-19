import Phaser from 'phaser';
import { ALLIANCES, type AllianceId, CHARACTERS, MAP, type PingType, otherAlliance } from '@netanchal/shared';
import { eventBus } from '../../game/EventBus';
import { type TouchInput, TOUCH_UI } from '../context';
import type { MatchScene } from './MatchScene';

const FONT = 'Teko, Impact, sans-serif';
const INK = 0x1f1a17;
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

interface Control {
  x: number;
  y: number;
  r: number;
}

/**
 * Everything drawn over the match that tracks in-canvas state at 60fps:
 * scoreboard, timer, capture bars, minimap, ability buttons, joystick, pings.
 * The exit cross is NOT here; it lives in the DOM (FullscreenChrome).
 */
export class HUDScene extends Phaser.Scene {
  private top!: Phaser.GameObjects.Graphics;
  private texts: Record<string, Phaser.GameObjects.Text> = {};
  private mini!: Phaser.GameObjects.Graphics;
  private miniPings: { x: number; y: number; color: number; ttl: number }[] = [];
  private pad!: Phaser.GameObjects.Graphics;
  private banner!: Phaser.GameObjects.Container;
  private controls: Record<'attack' | 'special', Control> = {} as never;
  private pings: Record<PingType, Control> = {} as never;
  private joyPointer: number | null = null;
  private joyBase = { x: 0, y: 0 };
  private joyKnob = { x: 0, y: 0 };
  private attackPointer: number | null = null;
  private touchUi = TOUCH_UI();

  constructor() {
    super('hud');
  }

  private get match() {
    return this.scene.get('match') as MatchScene;
  }

  create() {
    this.top = this.add.graphics();
    this.mini = this.add.graphics();
    this.pad = this.add.graphics();
    const t = (key: string, size: number, color = '#F7F5F0', origin = 0.5) =>
      (this.texts[key] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#1F1A17', strokeThickness: 4 }).setOrigin(origin, 0.5));
    t('scoreL', 40);
    t('scoreR', 40);
    t('timer', 34);
    t('round', 18);
    t('votesL', 20);
    t('votesR', 20);
    t('ruling', 18, '#FFD23F');
    t('status', 22);
    t('hp', 20);
    t('special', 18);
    t('respawn', 44);
    t('hint', 16, '#F7F5F0');
    for (const k of ['attackLbl', 'specialLbl', 'specialCd']) t(k, k === 'specialCd' ? 30 : 18);

    this.banner = this.add.container(0, 0).setVisible(false).setDepth(100);

    this.layout();
    this.scale.on('resize', this.layout, this);

    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);

    const offs = [
      eventBus.on('game:round-ended', (r) => {
        const name = ALLIANCES[r.winner].name;
        const why = r.reason === 'hq_captured' ? 'captured the HQ' : r.reason === 'votes' ? 'won on votes' : 'held on in a hung assembly';
        const done = Math.max(r.score.rashtra_morcha, r.score.jan_ekta) >= 2;
        this.showBanner(`${name} ${why}`, done ? 'Final count coming in…' : `Round ${r.round + 1}: ${name} forms the government`, ALLIANCES[r.winner].color);
      }),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => offs.forEach((o) => o()));
    this.events.once(Phaser.Scenes.Events.DESTROY, () => offs.forEach((o) => o()));

    this.time.delayedCall(250, () => this.showBanner('Round 1', 'Capture their booths. Break the CRPF gate. Take their tower.', 0xf7f5f0));
  }

  private layout() {
    const { width: w, height: h } = this.scale;
    const s = Math.min(1, Math.max(0.7, h / 600));
    const bottom = h - 24;
    this.controls.attack = { x: w - 90 * s, y: bottom - 70 * s, r: 58 * s };
    this.controls.special = { x: w - 200 * s, y: bottom - 40 * s, r: 42 * s };
    const pingTypes: PingType[] = ['attack', 'defend', 'help', 'enemy-hidden'];
    pingTypes.forEach((p, i) => (this.pings[p] = { x: w - 34 * s, y: 100 + i * 56 * s, r: 24 * s }));
    this.texts.hint.setPosition(w / 2, h - 16).setVisible(!this.touchUi);
    this.texts.hint.setText('WASD move · Space / click attack · E / right-click special');
  }

  isOverControl(p: Phaser.Input.Pointer) {
    return [...Object.values(this.controls), ...Object.values(this.pings)].some((c) => Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) <= c.r + 6);
  }

  addMinimapPing(x: number, y: number, color: number) {
    this.miniPings.push({ x, y, color, ttl: 3 });
  }

  // ---------------- touch / click controls ----------------

  private touch() {
    return this.registry.get('touch') as TouchInput;
  }

  private hit(p: Phaser.Input.Pointer): 'attack' | 'special' | `ping:${PingType}` | null {
    const near = (c: Control) => Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) <= c.r + 6;
    if (near(this.controls.attack)) return 'attack';
    if (near(this.controls.special)) return 'special';
    for (const [k, c] of Object.entries(this.pings)) if (near(c)) return `ping:${k as PingType}`;
    return null;
  }

  private onDown(p: Phaser.Input.Pointer) {
    const target = this.hit(p);
    if (target === 'attack') {
      this.attackPointer = p.id;
      this.touch().attack = true;
    } else if (target === 'special') this.touch().special = true;
    else if (target) {
      const me = this.match.me;
      if (me) eventBus.emit('ui:ping', { type: target.slice(5) as PingType, x: me.x, y: me.y });
    } else if (this.touchUi && p.x < this.scale.width * 0.5 && this.joyPointer === null) {
      this.joyPointer = p.id;
      this.joyBase = { x: p.x, y: p.y };
      this.joyKnob = { x: p.x, y: p.y };
    }
  }

  private onMove(p: Phaser.Input.Pointer) {
    if (p.id !== this.joyPointer) return;
    const max = 60;
    const dx = p.x - this.joyBase.x;
    const dy = p.y - this.joyBase.y;
    const len = Math.hypot(dx, dy);
    const k = len > max ? max / len : 1;
    this.joyKnob = { x: this.joyBase.x + dx * k, y: this.joyBase.y + dy * k };
    const t = this.touch();
    t.mx = len > 8 ? (dx * k) / max : 0;
    t.my = len > 8 ? (dy * k) / max : 0;
  }

  private onUp(p: Phaser.Input.Pointer) {
    if (p.id === this.joyPointer) {
      this.joyPointer = null;
      const t = this.touch();
      t.mx = 0;
      t.my = 0;
    }
    if (p.id === this.attackPointer) {
      this.attackPointer = null;
      this.touch().attack = false;
    }
  }

  // ---------------- banner ----------------

  private showBanner(title: string, sub: string, color: number) {
    const { width: w, height: h } = this.scale;
    this.banner.removeAll(true);
    const bg = this.add.rectangle(0, 0, w, 120, INK, 0.82);
    const stripe = this.add.rectangle(0, -60, w, 6, color);
    const t1 = this.add.text(0, -14, title, { fontFamily: 'Rozha One, Georgia, serif', fontSize: `${Math.min(46, w / 16)}px`, color: hex(color === 0xf7f5f0 ? 0xf7f5f0 : color) }).setOrigin(0.5);
    const t2 = this.add.text(0, 32, sub, { fontFamily: FONT, fontSize: '24px', color: '#F7F5F0' }).setOrigin(0.5);
    this.banner.add([bg, stripe, t1, t2]).setPosition(w / 2, h * 0.38).setVisible(true).setAlpha(0).setScale(1, 0.6);
    this.tweens.killTweensOf(this.banner);
    this.tweens.chain({
      targets: this.banner,
      tweens: [
        { alpha: 1, scaleY: 1, duration: 250, ease: 'Back.easeOut' },
        { alpha: 0, duration: 400, delay: 2600 },
      ],
      onComplete: () => this.banner.setVisible(false),
    });
  }

  // ---------------- per frame ----------------

  update(_t: number, deltaMs: number) {
    const match = this.match;
    if (!match?.snapshot) return;
    const s = match.snapshot;
    const me = match.me;
    const mine: AllianceId = me?.alliance ?? 'rashtra_morcha';
    const { width: w, height: h } = this.scale;
    const g = this.top;
    g.clear();

    // ---- scoreboard ----
    const cx = w / 2;
    g.fillStyle(INK, 0.85).fillRoundedRect(cx - 170, 8, 340, 64, 14);
    g.fillStyle(ALLIANCES.rashtra_morcha.color).fillRoundedRect(cx - 166, 12, 70, 56, 10);
    g.fillStyle(ALLIANCES.jan_ekta.color).fillRoundedRect(cx + 96, 12, 70, 56, 10);
    this.texts.scoreL.setPosition(cx - 131, 40).setText(String(s.score.rashtra_morcha));
    this.texts.scoreR.setPosition(cx + 131, 40).setText(String(s.score.jan_ekta));
    const secs = Math.ceil(s.timeLeft);
    this.texts.timer.setPosition(cx, 34).setText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`).setColor(secs <= 20 ? '#FFC145' : '#F7F5F0');
    this.texts.round.setPosition(cx, 60).setText(`ROUND ${s.round} · BEST OF 3`);
    this.texts.votesL.setPosition(cx - 131, 88).setText(`${s.votes.rashtra_morcha} votes`);
    this.texts.votesR.setPosition(cx + 131, 88).setText(`${s.votes.jan_ekta} votes`);
    this.texts.ruling.setPosition(s.ruling === 'rashtra_morcha' ? cx - 131 : cx + 131, 108).setText(s.ruling ? 'RULING' : '').setVisible(!!s.ruling);

    // ---- booths: six pips, three per party's territory, coloured by who holds each ----
    const by = 122;
    const pipR = 9;
    const gap = 26;
    const homes: AllianceId[] = ['rashtra_morcha', 'jan_ekta'];
    g.fillStyle(INK, 0.75).fillRoundedRect(cx - 3 * gap - 10, by - pipR - 5, 6 * gap + 20, pipR * 2 + 10, 10);
    homes.forEach((home, hi) => {
      s.zones.booths
        .filter((b) => b.home === home)
        .forEach((b, i) => {
          const px = cx + (hi * 3 + i - 2.5) * gap + (hi ? 6 : -6);
          g.fillStyle(ALLIANCES[b.owner].color).fillCircle(px, by, pipR).lineStyle(2, 0xf7f5f0, b.owner === home ? 0.35 : 1).strokeCircle(px, by, pipR);
          if (b.progress > 0.01) {
            g.lineStyle(3, ALLIANCES[otherAlliance(b.owner)].color).beginPath();
            g.arc(px, by, pipR + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * b.progress);
            g.strokePath();
          }
        });
    });
    const heldMine = s.zones.booths.filter((b) => b.owner === mine).length;
    let status = `Booths held: you ${heldMine} · them ${6 - heldMine}`;
    const myHq = s.zones.hqCapture[mine];
    const theirHq = s.zones.hqCapture[otherAlliance(mine)];
    const taking = s.zones.booths.filter((b) => b.progress > 0.02);
    const takingByThem = taking.find((b) => b.owner === mine);
    const takingByMe = taking.find((b) => b.owner !== mine);
    if (myHq > 0) status = `Your tower is falling ${Math.round(myHq * 100)}%`;
    else if (theirHq > 0) status = `Capturing their tower ${Math.round(theirHq * 100)}%`;
    else if (takingByThem) status = `They are taking your booth ${Math.round(takingByThem.progress * 100)}%`;
    else if (takingByMe) status = `Capturing their booth ${Math.round(takingByMe.progress * 100)}%`;
    this.texts.status.setPosition(cx, by + 30).setText(status).setColor(myHq > 0 || takingByThem ? '#FF8A80' : '#F7F5F0');

    this.drawMinimap(deltaMs / 1000);
    this.drawControls();

    // ---- my character ----
    if (me) {
      const def = CHARACTERS[me.characterId];
      const hx = this.touchUi ? w / 2 - 110 : 20;
      const hy = h - (this.touchUi ? 30 : 46);
      g.fillStyle(INK, 0.8).fillRoundedRect(hx - 6, hy - 18, 232, 36, 10);
      g.fillStyle(0x3a2f27).fillRoundedRect(hx, hy - 10, 160, 20, 6);
      const frac = me.hp / me.maxHp;
      g.fillStyle(frac > 0.5 ? 0x4cc38a : frac > 0.25 ? 0xffc145 : 0xe5484d).fillRoundedRect(hx, hy - 10, 160 * frac, 20, 6);
      this.texts.hp.setOrigin(0, 0.5).setPosition(hx + 166, hy + 1).setText(`${me.hp}/${me.maxHp}`);
      this.texts.special.setOrigin(0, 0.5).setPosition(hx, hy - 30).setText(`${def.name} · ${def.special.name} ${me.specialCd > 0 ? `${Math.ceil(me.specialCd)}s` : 'READY'}`);
      this.texts.respawn.setPosition(cx, h / 2).setText(me.alive ? '' : `Back in ${Math.ceil(me.respawnIn)}…`);
    }
  }

  private drawControls() {
    const g = this.pad;
    g.clear();
    const me = this.match.me;
    const def = me ? CHARACTERS[me.characterId] : null;

    const a = this.controls.attack;
    g.fillStyle(INK, 0.55).fillCircle(a.x, a.y, a.r);
    g.lineStyle(4, 0xf7f5f0, this.touch().attack ? 1 : 0.6).strokeCircle(a.x, a.y, a.r);
    this.texts.attackLbl.setPosition(a.x, a.y).setText(def ? def.basic.name.toUpperCase() : 'ATTACK').setWordWrapWidth(a.r * 1.7).setAlign('center');

    const sp = this.controls.special;
    const ready = me ? me.specialCd <= 0 : false;
    g.fillStyle(ready ? (me ? ALLIANCES[me.alliance].color : 0xffd23f) : INK, ready ? 0.9 : 0.55).fillCircle(sp.x, sp.y, sp.r);
    if (me && def && !ready) {
      g.lineStyle(6, 0xf7f5f0, 0.9).beginPath();
      g.arc(sp.x, sp.y, sp.r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - me.specialCd / def.special.cooldown));
      g.strokePath();
    }
    this.texts.specialLbl.setPosition(sp.x, sp.y).setText(ready ? 'SPECIAL' : '').setVisible(ready);
    this.texts.specialCd.setPosition(sp.x, sp.y).setText(me && !ready ? String(Math.ceil(me.specialCd)) : '').setVisible(!ready);

    const icons: Record<PingType, [number, string]> = { attack: [0xe5484d, '⚔'], defend: [0x7cc4ff, '⛨'], help: [0x4cc38a, '+'], 'enemy-hidden': [0xffd23f, '?'] };
    for (const [k, [color]] of Object.entries(icons)) {
      const c = this.pings[k as PingType];
      g.fillStyle(INK, 0.6).fillCircle(c.x, c.y, c.r).lineStyle(3, color, 0.95).strokeCircle(c.x, c.y, c.r);
      g.fillStyle(color).fillCircle(c.x, c.y, c.r * 0.32);
    }

    if (this.touchUi && this.joyPointer !== null) {
      g.fillStyle(0xf7f5f0, 0.15).fillCircle(this.joyBase.x, this.joyBase.y, 64).lineStyle(3, 0xf7f5f0, 0.5).strokeCircle(this.joyBase.x, this.joyBase.y, 64);
      g.fillStyle(0xf7f5f0, 0.7).fillCircle(this.joyKnob.x, this.joyKnob.y, 28);
    } else if (this.touchUi) {
      const { height: h } = this.scale;
      g.lineStyle(3, 0xf7f5f0, 0.25).strokeCircle(110, h - 110, 64);
    }
  }

  private drawMinimap(dt: number) {
    const s = this.match.snapshot;
    const g = this.mini;
    g.clear();
    const mw = Math.min(200, this.scale.width * 0.24);
    const k = mw / MAP.width;
    const mh = MAP.height * k;
    const ox = 12;
    const oy = 12;
    g.fillStyle(INK, 0.75).fillRoundedRect(ox - 4, oy - 4, mw + 8, mh + 8, 8);
    g.fillStyle(0xd9c7a3, 0.9).fillRect(ox, oy, mw, mh);
    g.fillStyle(0x8c7a66);
    for (const o of MAP.obstacles) g.fillRect(ox + o.x * k, oy + o.y * k, Math.max(2, o.w * k), Math.max(2, o.h * k));
    for (const a of ['rashtra_morcha', 'jan_ekta'] as const) {
      const hq = MAP.hq[a];
      g.lineStyle(2, ALLIANCES[a].color).strokeCircle(ox + hq.x * k, oy + hq.y * k, hq.r * k);
    }
    for (const bt of s.zones.booths) {
      g.fillStyle(ALLIANCES[bt.owner].color).fillCircle(ox + bt.x * k, oy + bt.y * k, 4).lineStyle(1.5, INK).strokeCircle(ox + bt.x * k, oy + bt.y * k, 4);
    }
    for (const gd of s.guards) if (gd.alive) g.fillStyle(INK).fillRect(ox + gd.x * k - 3, oy + gd.y * k - 3, 6, 6);
    for (const p of s.players) {
      if (!p.alive) continue;
      const isMe = p.id === this.match.me?.id;
      g.fillStyle(isMe ? 0xffffff : ALLIANCES[p.alliance].color).fillCircle(ox + p.x * k, oy + p.y * k, isMe ? 4.5 : 3.2);
      if (isMe) g.lineStyle(1.5, INK).strokeCircle(ox + p.x * k, oy + p.y * k, 4.5);
    }
    this.miniPings = this.miniPings.filter((p) => (p.ttl -= dt) > 0);
    for (const p of this.miniPings) g.lineStyle(2, p.color, p.ttl / 3).strokeCircle(ox + p.x * k, oy + p.y * k, 6 + (3 - p.ttl) * 4);
  }
}
