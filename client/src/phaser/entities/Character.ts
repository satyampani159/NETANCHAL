import { equippedCosmetic } from '../../app/state/profileStore';
import Phaser from 'phaser';
import { ALLIANCES, type PlayerView } from '@netanchal/shared';

const SMOOTH = 18;

/** Where the local player is, so far-away characters can drop their name tags. */
export const focus = { x: 0, y: 0, set: false };

export class Character extends Phaser.GameObjects.Container {
  view: PlayerView;
  private token: Phaser.GameObjects.Image;
  private facing: Phaser.GameObjects.Triangle;
  private hpBar: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private status: Phaser.GameObjects.Graphics;
  private meRing?: Phaser.GameObjects.Arc;
  private readyRing?: Phaser.GameObjects.Arc;
  private readonly radius: number;
  private t = 0;

  private isMine: boolean;

  constructor(scene: Phaser.Scene, view: PlayerView, radius: number, isMe: boolean) {
    super(scene, view.x, view.y);
    this.isMine = isMe;
    this.view = view;
    this.radius = radius;
    const color = ALLIANCES[view.alliance].color;

    const shadow = scene.add.ellipse(0, radius * 0.75, radius * 2, radius * 0.8, 0x000000, 0.22);
    if (isMe) {
      this.meRing = scene.add.circle(0, 0, radius + 10, 0xffffff, 0).setStrokeStyle(3, 0xffffff, 0.9);
      scene.tweens.add({ targets: this.meRing, scale: 1.15, alpha: 0.4, yoyo: true, repeat: -1, duration: 700 });
    }
    this.status = scene.add.graphics();
    this.facing = scene.add.triangle(0, 0, 0, -7, 14, 0, 0, 7, color).setStrokeStyle(2, 0x1f1a17);
    this.token = scene.add.image(0, 0, `tok-${view.characterId}`).setDisplaySize(radius * 2.4, radius * 2.4);
    this.hpBar = scene.add.graphics();
    this.label = scene.add
      .text(0, radius + 12, isMe ? `${view.name} (YOU)` : view.name, {
        fontFamily: 'Teko, Impact, sans-serif',
        fontSize: isMe ? '15px' : '12px',
        color: isMe ? (equippedCosmetic('plate')?.color ?? '#ffffff') : '#ffffff',
        stroke: '#1F1A17',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0);
    if (isMe) {
      // glows while your special is ready, so you know without looking at the button
      this.readyRing = scene.add.circle(0, 0, radius + 18, color, 0).setStrokeStyle(4, 0xffd23f, 0.95).setVisible(false);
      scene.tweens.add({ targets: this.readyRing, scale: 1.25, alpha: 0.35, yoyo: true, repeat: -1, duration: 420 });
    }

    const parts: Phaser.GameObjects.GameObject[] = [shadow];
    if (this.meRing) parts.push(this.meRing);
    if (this.readyRing) parts.push(this.readyRing);
    parts.push(this.status, this.facing, this.token, this.hpBar, this.label);
    // a hat for you only (looks, not stats)
    const hat = isMe ? equippedCosmetic('hat') : null;
    if (hat) parts.push(drawHat(scene, hat.id, hat.color, radius));
    this.add(parts);
    scene.add.existing(this);
    this.setDepth(10);
  }

  setView(v: PlayerView) {
    const jumped = Phaser.Math.Distance.Between(this.x, this.y, v.x, v.y) > 220;
    this.view = v;
    if (jumped) this.setPosition(v.x, v.y);
  }

  tick(dt: number) {
    const v = this.view;
    this.t += dt;
    const k = 1 - Math.exp(-dt * SMOOTH);
    this.x += (v.x - this.x) * k;
    this.y += (v.y - this.y) * k;
    this.setDepth(10 + this.y / 10000);

    this.setAlpha(v.alive ? 1 : 0.28);
    const ang = Math.atan2(v.fy, v.fx);
    this.facing.setPosition(Math.cos(ang) * (this.radius + 10), Math.sin(ang) * (this.radius + 10)).setRotation(ang).setVisible(v.alive);
    this.token.setScale((this.radius * 2.4) / this.token.width, (this.radius * 2.4) / this.token.height);
    this.readyRing?.setVisible(v.alive && v.specialCd <= 0);
    // names only for you and for people close enough to matter; everyone else is just a coloured ring
    const near = !focus.set || Math.hypot(this.x - focus.x, this.y - focus.y) < 320;
    this.label.setVisible(this.isMine || near);

    const g = this.hpBar;
    g.clear();
    if (v.alive) {
      const w = this.radius * 2.2;
      const y = -this.radius - 16;
      g.fillStyle(0x1f1a17, 0.85).fillRoundedRect(-w / 2 - 2, y - 2, w + 4, 10, 3);
      const frac = v.hp / v.maxHp;
      g.fillStyle(frac > 0.5 ? 0x4cc38a : frac > 0.25 ? 0xffc145 : 0xe5484d).fillRoundedRect(-w / 2, y, w * frac, 6, 2);
    }

    const s = this.status;
    s.clear();
    if (!v.alive) return;
    // taking less damage: a golden shimmer
    if (v.braced) s.lineStyle(5, 0xffd23f, 0.6 + 0.4 * Math.sin(this.t * 12)).strokeCircle(0, 0, this.radius + 8);
    if (v.slowed) s.fillStyle(0x7a5c3a, 0.35).fillCircle(0, 0, this.radius + 4);
    if (v.stunned)
      for (let i = 0; i < 3; i++) {
        const a = this.t * 6 + (i * Math.PI * 2) / 3;
        s.fillStyle(0xffd23f).fillCircle(Math.cos(a) * this.radius * 0.8, -this.radius - 4 + Math.sin(a) * 5, 4);
      }
  }
}

/** tiny hats drawn with shapes, sitting on top of the token */
function drawHat(scene: Phaser.Scene, id: string, color: string, r: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const c = Phaser.Display.Color.HexStringToColor(color).color;
  const ink = 0x1f1a17;
  const top = -r * 1.05;
  g.lineStyle(2.5, ink, 1).fillStyle(c, 1);
  if (id === 'hat-topi') {
    g.fillEllipse(0, top, r * 1.5, r * 0.55).strokeEllipse(0, top, r * 1.5, r * 0.55);
  } else if (id === 'hat-pagdi') {
    g.fillEllipse(0, top - 3, r * 1.4, r * 0.9).strokeEllipse(0, top - 3, r * 1.4, r * 0.9);
    g.lineStyle(2, ink, 0.8).beginPath().moveTo(-r * 0.6, top).lineTo(r * 0.6, top - 6).strokePath();
  } else if (id === 'hat-crown') {
    g.beginPath().moveTo(-r * 0.6, top + 6).lineTo(-r * 0.6, top - 10).lineTo(-r * 0.3, top - 2).lineTo(0, top - 14).lineTo(r * 0.3, top - 2).lineTo(r * 0.6, top - 10).lineTo(r * 0.6, top + 6).closePath().fillPath().strokePath();
  } else if (id === 'hat-helmet') {
    g.beginPath().arc(0, top + 6, r * 0.7, Math.PI, 0).closePath().fillPath().strokePath();
    g.fillStyle(0xffffff, 1).fillRect(-r * 0.7, top + 4, r * 1.4, 4);
  } else if (id === 'hat-garland') {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.15 + (0.7 * i) / 6);
      g.fillStyle(i % 2 ? 0xff8a1a : c, 1).fillCircle(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, 4.5).lineStyle(1.5, ink, 1).strokeCircle(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, 4.5);
    }
  }
  return g;
}
