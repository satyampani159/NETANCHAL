import Phaser from 'phaser';
import { ALLIANCES, type AllianceId, CHARACTERS, MAP, otherAlliance } from '@netanchal/shared';
import { eventBus } from '../../game/EventBus';
import { type TouchInput, TOUCH_UI } from '../context';
import type { MatchScene } from './MatchScene';

const FONT = 'Teko, Impact, sans-serif';
const INK = 0x1f1a17;

interface Control {
  x: number;
  y: number;
  r: number;
}

interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** The phone's safe areas (notch, rounded corners, home bar), measured from CSS env(). */
function readSafeInsets(): Insets {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const v = (s: string) => parseFloat(s) || 0;
  const out = { top: v(cs.paddingTop), right: v(cs.paddingRight), bottom: v(cs.paddingBottom), left: v(cs.paddingLeft) };
  probe.remove();
  return out;
}

/**
 * Everything drawn over the match that tracks in-canvas state at 60fps. Laid out for a phone held
 * sideways: the scoreboard sits top-centre with the objective on its left and the booths on its right,
 * the health bar runs up the screen edge on your team's side, and the controls sit in the bottom corners.
 * Nothing big is drawn in the middle of the screen. The exit cross is NOT here; it lives in the DOM.
 */
export class HUDScene extends Phaser.Scene {
  private top!: Phaser.GameObjects.Graphics;
  private texts: Record<string, Phaser.GameObjects.Text> = {};
  private mini!: Phaser.GameObjects.Graphics;
  private miniPings: { x: number; y: number; color: number; ttl: number }[] = [];
  private pad!: Phaser.GameObjects.Graphics;
  private controls: Record<'attack' | 'special', Control> = {} as never;
  /** the joystick never moves: this is its fixed base, and `joyGrab` is how close a touch has to land to take hold of it */
  private joyBase: Control = { x: 0, y: 0, r: 50 };
  private joyGrab = 90;
  private joyPointer: Phaser.Input.Pointer | null = null;
  private joyKnob = { x: 0, y: 0 };
  private attackPointer: number | null = null;
  private touchUi = TOUCH_UI();
  private insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  /** a size factor so everything shrinks on small phones and grows a little on big screens */
  private u = 1;
  private toastText = '';
  private toastColor = '#F7F5F0';
  private toastUntil = 0;

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
    this.input.addPointer(3);
    const t = (key: string, size: number, color = '#F7F5F0', origin: [number, number] = [0.5, 0.5], stroke = 3) =>
      (this.texts[key] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#1F1A17', strokeThickness: stroke }).setOrigin(origin[0], origin[1]));
    t('scoreL', 30);
    t('scoreR', 30);
    t('timer', 24);
    t('round', 10);
    t('votesL', 12);
    t('votesR', 12);
    t('status', 13, '#F7F5F0', [1, 0]);
    t('toast', 12, '#F7F5F0', [1, 0]);
    t('respawn', 16, '#FFC145', [1, 0]);
    t('booths', 11, '#F7F5F0', [0, 0]);
    t('ruling', 11, '#FFD23F', [0, 0]);
    t('hp', 13, '#FFFFFF', [0.5, 1]);
    t('hpMax', 11, '#F7F5F0', [0.5, 0], 2);
    t('special', 12, '#F7F5F0', [0.5, 1]);
    t('hint', 11, '#F7F5F0', [0.5, 1]);
    for (const k of ['attackLbl', 'specialLbl', 'specialCd']) t(k, k === 'specialCd' ? 20 : 10);

    this.layout();
    this.scale.on('resize', this.layout, this);

    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);
  }

  private toast(text: string, color: string, ms: number) {
    this.toastText = text;
    this.toastColor = color;
    this.toastUntil = this.time.now + ms;
  }

  private layout() {
    const { width: w, height: h } = this.scale;
    this.insets = readSafeInsets();
    const u = (this.u = Math.min(1.2, Math.max(0.72, Math.min(w / 900, h / 470))));
    const { right, bottom, left } = this.insets;
    const attackR = (this.touchUi ? 44 : 54) * u;
    this.controls.attack = { x: w - right - 24 - attackR, y: h - bottom - 20 - attackR, r: attackR };
    const spR = (this.touchUi ? 38 : 46) * u;
    this.controls.special = { x: this.controls.attack.x - attackR - 44 * u, y: h - bottom - 20 - spR, r: spR };
    this.joyBase = { x: left + 54 + 56 * u, y: h - bottom - 24 - 56 * u, r: 52 * u };
    this.joyGrab = this.joyBase.r * 1.9;
    this.joyKnob = { x: this.joyBase.x, y: this.joyBase.y };
    const f = (base: number) => `${Math.round(base * u)}px`;
    this.texts.scoreL.setFontSize(f(30));
    this.texts.scoreR.setFontSize(f(30));
    this.texts.timer.setFontSize(f(24));
    this.texts.round.setFontSize(f(10));
    this.texts.votesL.setFontSize(f(12));
    this.texts.votesR.setFontSize(f(12));
    this.texts.status.setFontSize(f(13));
    this.texts.toast.setFontSize(f(12));
    this.texts.respawn.setFontSize(f(16));
    this.texts.booths.setFontSize(f(11));
    this.texts.ruling.setFontSize(f(11));
    this.texts.hint.setText('WASD move · Space / click attack · E / right-click special').setFontSize(f(11)).setVisible(!this.touchUi);
  }

  /** screen areas the HUD owns; map captions (BOOTH 1, INDIA GATE ...) fade out when they would sit under them */
  reservedRects(): { x: number; y: number; w: number; h: number }[] {
    const { width: w, height: h } = this.scale;
    const u = this.u;
    const ins = this.insets;
    const pad = 8;
    const out: { x: number; y: number; w: number; h: number }[] = [];
    out.push({ x: w / 2 - 113 * u - pad, y: 0, w: 226 * u + pad * 2, h: ins.top + 8 + 46 * u + 40 * u }); // scoreboard, margin bar and the vote counts
    const mw = this.miniWidth();
    out.push({ x: ins.left, y: ins.top, w: mw + 16, h: (MAP.height * mw) / MAP.width + 16 });
    out.push({ x: w - ins.right - 130, y: 0, w: 130, h: ins.top + 70 }); // mute and exit
    for (const c of [this.controls.attack, this.controls.special]) out.push({ x: c.x - c.r - pad, y: c.y - c.r - pad, w: c.r * 2 + pad * 2, h: c.r * 2 + pad * 2 });
    if (this.touchUi) out.push({ x: this.joyBase.x - this.joyBase.r - pad, y: this.joyBase.y - this.joyBase.r - pad, w: this.joyBase.r * 2 + pad * 2, h: this.joyBase.r * 2 + pad * 2 });
    out.push({ x: 0, y: h * 0.3 - 26, w: ins.left + 40, h: Math.max(120, h * 0.44) + 52 }); // health bar, left edge
    out.push({ x: w - ins.right - 40, y: h * 0.3 - 26, w: ins.right + 40, h: Math.max(120, h * 0.44) + 52 }); // health bar, right edge
    return out;
  }

  private miniWidth() {
    return this.touchUi ? Math.min(120, Math.max(84, this.scale.height * 0.27)) : Math.min(170, Math.max(96, this.scale.height * 0.36));
  }

  /** is this point on a button or the joystick? (the match scene uses it so a tap there is not also an attack) */
  isOverControl(p: Phaser.Input.Pointer) {
    const near = (c: Control, extra = 16) => Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) <= c.r + extra;
    return near(this.controls.attack) || near(this.controls.special) || (this.touchUi && Phaser.Math.Distance.Between(p.x, p.y, this.joyBase.x, this.joyBase.y) <= this.joyGrab);
  }

  addMinimapPing(x: number, y: number, color: number) {
    this.miniPings.push({ x, y, color, ttl: 3 });
  }

  // ---------------- touch / click controls ----------------

  private touch() {
    return this.registry.get('touch') as TouchInput;
  }

  private onDown(p: Phaser.Input.Pointer) {
    const near = (c: Control) => Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) <= c.r + 16;
    if (near(this.controls.attack)) {
      this.attackPointer = p.id;
      this.touch().attack = true;
    } else if (near(this.controls.special)) this.touch().special = true;
    else if (this.touchUi && this.joyPointer === null && Phaser.Math.Distance.Between(p.x, p.y, this.joyBase.x, this.joyBase.y) <= this.joyGrab) {
      // take hold of the stick; the base stays where it is and only the knob follows the finger
      this.joyPointer = p;
    }
  }

  private onUp(p: Phaser.Input.Pointer) {
    if (this.joyPointer && p.id === this.joyPointer.id) {
      this.joyPointer = null;
      this.joyKnob = { x: this.joyBase.x, y: this.joyBase.y };
      const t = this.touch();
      t.mx = 0;
      t.my = 0;
    }
    if (p.id === this.attackPointer) {
      this.attackPointer = null;
      this.touch().attack = false;
    }
  }

  /** read straight from the pointer every frame, so a dragged stick never waits for a move event */
  private updateJoystick() {
    const p = this.joyPointer;
    if (!p) return;
    if (!p.isDown) return this.onUp(p);
    const dx = p.x - this.joyBase.x;
    const dy = p.y - this.joyBase.y;
    const len = Math.hypot(dx, dy);
    const k = len > this.joyBase.r ? this.joyBase.r / len : 1;
    this.joyKnob = { x: this.joyBase.x + dx * k, y: this.joyBase.y + dy * k };
    const dead = this.joyBase.r * 0.14;
    const t = this.touch();
    t.mx = len > dead ? (dx * k) / this.joyBase.r : 0;
    t.my = len > dead ? (dy * k) / this.joyBase.r : 0;
  }

  // ---------------- per frame ----------------

  update(_t: number, deltaMs: number) {
    const match = this.match;
    if (!match?.snapshot) return;
    this.updateJoystick();
    const s = match.snapshot;
    const me = match.me;
    const mine: AllianceId = me?.alliance ?? 'rashtra_morcha';
    const { width: w, height: h } = this.scale;
    const u = this.u;
    const g = this.top;
    g.clear();

    // ---- scoreboard, top centre, small ----
    const cx = w / 2;
    const bw = 226 * u;
    const bh = 46 * u;
    const by = this.insets.top + 8;
    g.fillStyle(INK, 0.85).fillRoundedRect(cx - bw / 2, by, bw, bh, 12 * u);
    g.fillStyle(ALLIANCES.rashtra_morcha.color).fillRoundedRect(cx - bw / 2 + 4, by + 4, 50 * u, bh - 8, 9 * u);
    g.fillStyle(ALLIANCES.jan_ekta.color).fillRoundedRect(cx + bw / 2 - 4 - 50 * u, by + 4, 50 * u, bh - 8, 9 * u);
    this.texts.scoreL.setPosition(cx - bw / 2 + 4 + 25 * u, by + bh / 2).setText(String(s.score.rashtra_morcha));
    this.texts.scoreR.setPosition(cx + bw / 2 - 4 - 25 * u, by + bh / 2).setText(String(s.score.jan_ekta));
    const secs = Math.ceil(s.timeLeft);
    this.texts.timer.setPosition(cx, by + bh * 0.38).setText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`).setColor(secs <= 20 ? '#FFC145' : '#F7F5F0');
    this.texts.round.setPosition(cx, by + bh * 0.8).setText(`R${s.round} · BEST OF 3`);
    this.texts.votesL.setPosition(cx - bw / 2 + 29 * u, by + bh + 16 * u).setText(`${s.votes.rashtra_morcha} votes`);
    this.texts.votesR.setPosition(cx + bw / 2 - 29 * u, by + bh + 16 * u).setText(`${s.votes.jan_ekta} votes`);

    // ---- left of the scoreboard: what is happening to you ----
    const leftEdge = cx - bw / 2 - 12;
    const heldMine = s.zones.booths.filter((b) => b.owner === mine).length;
    let status = '';
    const myHq = s.zones.hqCapture[mine];
    const theirHq = s.zones.hqCapture[otherAlliance(mine)];
    const taking = s.zones.booths.filter((b) => b.progress > 0.02);
    const takingByThem = taking.find((b) => b.owner === mine);
    const takingByMe = taking.find((b) => b.owner !== mine);
    if (myHq > 0) status = `Your tower is falling ${Math.round(myHq * 100)}%`;
    else if (theirHq > 0) status = `Taking their tower ${Math.round(theirHq * 100)}%`;
    else if (takingByThem) status = `They are taking your booth ${Math.round(takingByThem.progress * 100)}%`;
    else if (takingByMe) status = `Taking their booth ${Math.round(takingByMe.progress * 100)}%`;
    // the left cluster stops short of the minimap
    const room = Math.max(110, leftEdge - (this.insets.left + 8 + this.miniWidth() + 16));
    this.texts.status.setPosition(leftEdge, by).setWordWrapWidth(room).setAlign('right').setText(status).setColor(myHq > 0 || takingByThem ? '#FF8A80' : '#F7F5F0');
    const toastLive = this.time.now < this.toastUntil;
    this.texts.toast
      .setPosition(leftEdge, by + 8 * u + this.texts.status.height)
      .setWordWrapWidth(room)
      .setAlign('right')
      .setText(toastLive ? this.toastText : '')
      .setColor(this.toastColor);
    this.texts.respawn.setPosition(leftEdge, by + 8 * u + this.texts.status.height + (toastLive ? this.texts.toast.height + 2 : 0)).setText(me && !me.alive ? `Back in ${Math.ceil(me.respawnIn)}s` : '');

    // ---- right of the scoreboard: one small chip (the minimap already shows who owns which booth) ----
    const rightEdge = cx + bw / 2 + 12;
    this.texts.booths.setPosition(rightEdge, by).setText(s.counting ? 'FINAL 30s · DOUBLE VOTES' : `Booths ${heldMine}-${6 - heldMine}${s.ruling ? ` · ${ALLIANCES[s.ruling].short} rules` : ''}`).setColor(s.counting ? '#FFD23F' : '#F7F5F0');
    // who is ahead and by how much, drawn as a thin bar under the scoreboard
    const vr = s.votes.rashtra_morcha;
    const vj = s.votes.jan_ekta;
    const share = vr + vj > 0 ? vr / (vr + vj) : 0.5;
    const barY = by + bh + 2;
    g.fillStyle(INK, 0.85).fillRoundedRect(cx - bw / 2, barY, bw, 6 * u, 3);
    g.fillStyle(ALLIANCES.rashtra_morcha.color).fillRoundedRect(cx - bw / 2, barY, Math.max(4, bw * share), 6 * u, 3);
    g.fillStyle(ALLIANCES.jan_ekta.color).fillRoundedRect(cx - bw / 2 + Math.max(4, bw * share), barY, Math.max(0, bw - Math.max(4, bw * share)), 6 * u, 3);
    g.fillStyle(0xf7f5f0, 0.9).fillRect(cx - 1, barY - 1, 2, 6 * u + 2);
    this.texts.ruling.setText('');

    this.drawMinimap(deltaMs / 1000);
    this.drawControls();

    // ---- your health: a tall bar on the edge of your team's side ----
    if (me) {
      const def = CHARACTERS[me.characterId];
      const barW = 16 * u;
      const barH = Math.max(120, h * 0.44);
      const y0 = h * 0.3;
      const left = me.alliance === 'rashtra_morcha';
      const x0 = left ? this.insets.left + 6 : w - this.insets.right - 6 - barW;
      g.fillStyle(INK, 0.85).fillRoundedRect(x0 - 3, y0 - 3, barW + 6, barH + 6, 8);
      g.fillStyle(0x3a2f27).fillRoundedRect(x0, y0, barW, barH, 6);
      const frac = Math.max(0, me.hp / me.maxHp);
      g.fillStyle(frac > 0.5 ? 0x4cc38a : frac > 0.25 ? 0xffc145 : 0xe5484d).fillRoundedRect(x0, y0 + barH * (1 - frac), barW, barH * frac, 6);
      // a thin outline in your team colour so it is obvious whose bar it is
      g.lineStyle(2, ALLIANCES[me.alliance].color).strokeRoundedRect(x0 - 3, y0 - 3, barW + 6, barH + 6, 8);
      this.texts.hp.setPosition(x0 + barW / 2, y0 - 8).setText(String(me.hp));
      this.texts.hpMax.setPosition(x0 + barW / 2, y0 + barH + 8).setText(`/${me.maxHp}`);
      this.texts.special.setPosition(cx, h - this.insets.bottom - 24).setText(this.touchUi ? '' : `${def.name} · ${def.special.name} ${me.specialCd > 0 ? `${Math.ceil(me.specialCd)}s` : 'READY (E)'}`);
      this.texts.hint.setPosition(cx, h - this.insets.bottom - 6);
    }
  }

  private drawControls() {
    const g = this.pad;
    g.clear();
    const me = this.match.me;
    const def = me ? CHARACTERS[me.characterId] : null;
    const u = this.u;

    const a = this.controls.attack;
    g.fillStyle(INK, 0.55).fillCircle(a.x, a.y, a.r);
    g.lineStyle(4, 0xf7f5f0, this.touch().attack ? 1 : 0.6).strokeCircle(a.x, a.y, a.r);
    this.texts.attackLbl.setPosition(a.x, a.y).setText(def ? def.basic.name.toUpperCase() : 'ATTACK').setWordWrapWidth(a.r * 1.6).setAlign('center');

    const sp = this.controls.special;
    const ready = me ? me.specialCd <= 0 && me.alive : false;
    const col = me ? ALLIANCES[me.alliance].color : 0xffd23f;
    if (ready) {
      // a pulsing halo says "your special is ready" without looking at the button
      const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 160);
      g.lineStyle(5, 0xffd23f, 0.35 + 0.5 * pulse).strokeCircle(sp.x, sp.y, sp.r + 6 + pulse * 5);
    }
    g.fillStyle(ready ? col : INK, ready ? 0.95 : 0.55).fillCircle(sp.x, sp.y, sp.r);
    g.lineStyle(4, 0xf7f5f0, ready ? 1 : 0.6).strokeCircle(sp.x, sp.y, sp.r);
    if (me && def && !ready && me.specialCd > 0) {
      g.lineStyle(6, 0xf7f5f0, 0.9).beginPath();
      g.arc(sp.x, sp.y, sp.r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - me.specialCd / def.special.cooldown));
      g.strokePath();
    }
    this.texts.specialLbl.setPosition(sp.x, sp.y).setText(ready && def ? def.special.name.toUpperCase() : '').setWordWrapWidth(sp.r * 1.7).setAlign('center').setVisible(ready);
    this.texts.specialCd.setPosition(sp.x, sp.y).setText(me && !ready ? String(Math.ceil(me.specialCd)) : '').setVisible(!ready);

    // the joystick: its base is always there and never moves
    if (this.touchUi) {
      const b = this.joyBase;
      g.fillStyle(0xf7f5f0, 0.12).fillCircle(b.x, b.y, b.r).lineStyle(3, 0xf7f5f0, 0.55).strokeCircle(b.x, b.y, b.r);
      g.lineStyle(2, 0xf7f5f0, 0.18).strokeCircle(b.x, b.y, b.r * 0.5);
      g.fillStyle(0xf7f5f0, this.joyPointer ? 0.8 : 0.45).fillCircle(this.joyKnob.x, this.joyKnob.y, 26 * u);
    }
  }

  private drawMinimap(dt: number) {
    const s = this.match.snapshot;
    const g = this.mini;
    g.clear();
    const mw = this.miniWidth();
    const k = mw / MAP.width;
    const mh = MAP.height * k;
    const ox = this.insets.left + 8;
    const oy = this.insets.top + 8;
    g.fillStyle(INK, 0.5).fillRoundedRect(ox - 4, oy - 4, mw + 8, mh + 8, 8);
    g.fillStyle(0xd9c7a3, 0.6).fillRect(ox, oy, mw, mh);
    g.fillStyle(0x8c7a66);
    for (const o of MAP.obstacles) g.fillRect(ox + o.x * k, oy + o.y * k, Math.max(2, o.w * k), Math.max(2, o.h * k));
    for (const a of ['rashtra_morcha', 'jan_ekta'] as const) {
      const hq = MAP.hq[a];
      g.lineStyle(2, ALLIANCES[a].color).strokeCircle(ox + hq.x * k, oy + hq.y * k, hq.r * k);
    }
    for (const bt of s.zones.booths) {
      g.fillStyle(ALLIANCES[bt.owner].color).fillCircle(ox + bt.x * k, oy + bt.y * k, 3.5).lineStyle(1.5, INK).strokeCircle(ox + bt.x * k, oy + bt.y * k, 3.5);
    }
    for (const gd of s.guards) if (gd.alive) g.fillStyle(INK).fillRect(ox + gd.x * k - 3, oy + gd.y * k - 3, 6, 6);
    for (const p of s.players) {
      if (!p.alive) continue;
      const isMe = p.id === this.match.me?.id;
      g.fillStyle(isMe ? 0xffffff : ALLIANCES[p.alliance].color).fillCircle(ox + p.x * k, oy + p.y * k, isMe ? 4 : 2.8);
      if (isMe) g.lineStyle(1.5, INK).strokeCircle(ox + p.x * k, oy + p.y * k, 4);
    }
    this.miniPings = this.miniPings.filter((p) => (p.ttl -= dt) > 0);
    for (const p of this.miniPings) g.lineStyle(2, p.color, p.ttl / 3).strokeCircle(ox + p.x * k, oy + p.y * k, 6 + (3 - p.ttl) * 4);
  }
}
