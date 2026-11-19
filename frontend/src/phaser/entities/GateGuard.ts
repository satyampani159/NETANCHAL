import Phaser from 'phaser';
import { ALLIANCES, type GuardView } from '@netanchal/shared';

/** The guard post in front of each HQ: a sandbagged booth that shoots intruders. */
export class GateGuard extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private bar: Phaser.GameObjects.Graphics;
  private view: GuardView;

  constructor(scene: Phaser.Scene, view: GuardView) {
    super(scene, view.x, view.y);
    this.view = view;
    this.gfx = scene.add.graphics();
    this.bar = scene.add.graphics();
    const label = scene.add
      .text(0, 40, 'CRPF GATE', { fontFamily: 'Teko, Impact, sans-serif', fontSize: '16px', color: '#1F1A17' })
      .setOrigin(0.5, 0)
      .setAlpha(0.7);
    this.add([this.gfx, this.bar, label]);
    scene.add.existing(this);
    this.setDepth(9);
    this.draw();
  }

  setView(v: GuardView) {
    const changed = v.alive !== this.view.alive || v.maxHp !== this.view.maxHp;
    this.view = v;
    if (changed) this.draw();
    this.drawBar();
  }

  private draw() {
    const g = this.gfx;
    const v = this.view;
    const color = ALLIANCES[v.alliance].color;
    g.clear();
    g.fillStyle(0x000000, 0.2).fillEllipse(0, 22, 70, 22);
    if (!v.alive) {
      g.fillStyle(0x8a7f72).fillCircle(-12, 10, 12).fillCircle(10, 14, 10).fillCircle(0, 2, 9);
      return;
    }
    // sandbags
    g.fillStyle(0xc9b68a).lineStyle(2, 0x1f1a17, 0.6);
    for (let i = 0; i < 5; i++) {
      g.fillRoundedRect(-30 + i * 12, 6, 14, 12, 4).strokeRoundedRect(-30 + i * 12, 6, 14, 12, 4);
    }
    // booth
    g.fillStyle(0xf7f5f0).fillRect(-16, -26, 32, 34).lineStyle(3, 0x1f1a17).strokeRect(-16, -26, 32, 34);
    g.fillStyle(color).fillRect(-20, -34, 40, 10).strokeRect(-20, -34, 40, 10);
    g.fillStyle(0x1f1a17).fillRect(-9, -18, 18, 10);
    if (v.maxHp > 500) g.fillStyle(0xffd23f).fillTriangle(-8, -36, 0, -48, 8, -36); // ruling party upgrade
    // CRPF jawan standing at the gate: olive uniform, helmet, rifle
    g.fillStyle(0x4f5f2f).fillRoundedRect(22, -10, 14, 24, 4).lineStyle(2, 0x1f1a17).strokeRoundedRect(22, -10, 14, 24, 4);
    g.fillStyle(0xd9a778).fillCircle(29, -16, 6).lineStyle(2, 0x1f1a17).strokeCircle(29, -16, 6);
    g.fillStyle(0x3d4a24).fillEllipse(29, -20, 16, 9).lineStyle(2, 0x1f1a17).strokeEllipse(29, -20, 16, 9);
    g.lineStyle(3, 0x1f1a17).lineBetween(38, -12, 38, 16);
    this.drawBar();
  }

  private drawBar() {
    const b = this.bar;
    const v = this.view;
    b.clear();
    if (!v.alive) return;
    b.fillStyle(0x1f1a17, 0.85).fillRect(-30, -58, 60, 8);
    b.fillStyle(ALLIANCES[v.alliance].color).fillRect(-29, -57, 58 * (v.hp / v.maxHp), 6);
  }
}
