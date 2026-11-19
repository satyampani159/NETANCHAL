import Phaser from 'phaser';
import { ALLIANCES, type PlayerView } from '@netanchal/shared';

const SMOOTH = 18;

export class Character extends Phaser.GameObjects.Container {
  view: PlayerView;
  private token: Phaser.GameObjects.Image;
  private facing: Phaser.GameObjects.Triangle;
  private hpBar: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private status: Phaser.GameObjects.Graphics;
  private meRing?: Phaser.GameObjects.Arc;
  private dharnaText: Phaser.GameObjects.Text;
  private readonly radius: number;
  private t = 0;

  constructor(scene: Phaser.Scene, view: PlayerView, radius: number, isMe: boolean) {
    super(scene, view.x, view.y);
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
      .text(0, radius + 16, isMe ? `${view.name} (YOU)` : view.name, {
        fontFamily: 'Teko, Impact, sans-serif',
        fontSize: isMe ? '22px' : '18px',
        color: '#ffffff',
        stroke: '#1F1A17',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0);
    this.dharnaText = scene.add
      .text(0, -radius - 34, 'धरना', { fontFamily: 'Rozha One, serif', fontSize: '20px', color: '#ffffff', stroke: '#0F6B46', strokeThickness: 5 })
      .setOrigin(0.5)
      .setVisible(false);

    const parts: Phaser.GameObjects.GameObject[] = [shadow];
    if (this.meRing) parts.push(this.meRing);
    parts.push(this.status, this.facing, this.token, this.hpBar, this.label, this.dharnaText);
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
    this.token.setScale((this.radius * 2.4) / this.token.width * (v.dharna ? 0.92 : 1), (this.radius * 2.4) / this.token.height * (v.dharna ? 0.82 : 1));
    this.dharnaText.setVisible(v.dharna);

    const g = this.hpBar;
    g.clear();
    if (v.alive) {
      const w = this.radius * 2.2;
      const y = -this.radius - 16;
      g.fillStyle(0x1f1a17, 0.85).fillRoundedRect(-w / 2 - 2, y - 2, w + 4, 10, 3);
      const frac = v.hp / v.maxHp;
      g.fillStyle(frac > 0.5 ? 0x4cc38a : frac > 0.25 ? 0xffc145 : 0xe5484d).fillRoundedRect(-w / 2, y, w * frac, 6, 2);
      if (v.shield > 0) g.fillStyle(0x7cc4ff).fillRect(-w / 2, y - 4, Math.min(w, (w * v.shield) / v.maxHp), 3);
    }

    const s = this.status;
    s.clear();
    if (!v.alive) return;
    if (v.shield > 0) s.lineStyle(4, 0x7cc4ff, 0.9).strokeCircle(0, 0, this.radius + 6);
    if (v.buffed) s.lineStyle(3, 0xffd23f, 0.6 + 0.4 * Math.sin(this.t * 10)).strokeCircle(0, 0, this.radius + 11);
    if (v.slowed) s.fillStyle(0x7a5c3a, 0.35).fillCircle(0, 0, this.radius + 4);
    if (v.stunned)
      for (let i = 0; i < 3; i++) {
        const a = this.t * 6 + (i * Math.PI * 2) / 3;
        s.fillStyle(0xffd23f).fillCircle(Math.cos(a) * this.radius * 0.8, -this.radius - 4 + Math.sin(a) * 5, 4);
      }
  }
}
