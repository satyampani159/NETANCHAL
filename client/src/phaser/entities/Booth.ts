import Phaser from 'phaser';
import { ALLIANCES, type AllianceId, type BoothView, otherAlliance } from '@netanchal/shared';

const INK = 0x1f1a17;
const FONT = 'Teko, Impact, sans-serif';

/** A vote booth: small polling-station building, a CRPF jawan, and an ownership ring that fills while it is being taken. */
export class Booth extends Phaser.GameObjects.Container {
  private zone: Phaser.GameObjects.Arc;
  private ring: Phaser.GameObjects.Graphics;
  private building: Phaser.GameObjects.Graphics;
  private pct: Phaser.GameObjects.Text;
  private drawnOwner: AllianceId | null = null;
  private readonly r: number;

  constructor(scene: Phaser.Scene, view: BoothView, index: number) {
    super(scene, view.x, view.y);
    this.r = view.r;
    this.zone = scene.add.circle(0, 0, view.r, 0xffffff, 0.16).setStrokeStyle(3, 0xffffff, 0.55);
    this.ring = scene.add.graphics();
    this.building = scene.add.graphics();
    this.pct = scene.add.text(0, -view.r - 8, '', { fontFamily: FONT, fontSize: '22px', color: '#fff', stroke: '#1F1A17', strokeThickness: 5 }).setOrigin(0.5, 1);
    const label = scene.add
      .text(0, view.r + 4, `BOOTH ${index}`, { fontFamily: FONT, fontSize: '20px', color: '#1F1A17' })
      .setOrigin(0.5, 0)
      .setAlpha(0.85);
    this.add([this.zone, this.ring, this.building, this.pct, label]);
    scene.add.existing(this);
    this.setDepth(3);
    this.setView(view);
  }

  setView(v: BoothView) {
    const color = ALLIANCES[v.owner].color;
    const taker = ALLIANCES[otherAlliance(v.owner)].color;
    if (this.drawnOwner !== v.owner) {
      this.drawnOwner = v.owner;
      this.drawBuilding(v.owner);
    }
    this.zone.setFillStyle(color, 0.2).setStrokeStyle(3, color, 0.85);
    const g = this.ring;
    g.clear();
    if (v.progress > 0.01) {
      g.lineStyle(10, taker, 0.95).beginPath();
      g.arc(0, 0, this.r - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v.progress);
      g.strokePath();
    }
    this.pct.setText(v.progress > 0.01 ? `${Math.round(v.progress * 100)}%` : '');
  }

  private drawBuilding(owner: AllianceId) {
    const g = this.building;
    const col = ALLIANCES[owner].color;
    g.clear();
    g.fillStyle(0x000000, 0.22).fillEllipse(0, 26, 82, 18);
    // polling booth: little tiled-roof house with the tricolour
    g.fillStyle(0xe8d9b5).fillRect(-26, -14, 52, 38).lineStyle(3, INK, 0.9).strokeRect(-26, -14, 52, 38);
    g.fillStyle(col).fillTriangle(-34, -14, 34, -14, 0, -40).lineStyle(3, INK, 0.9).strokeTriangle(-34, -14, 34, -14, 0, -40);
    g.fillStyle(0x3a2a22).fillRoundedRect(-9, 2, 18, 22, { tl: 9, tr: 9, bl: 0, br: 0 });
    g.lineStyle(2, INK).lineBetween(0, -40, 0, -58);
    g.fillStyle(0xf28c28).fillRect(0, -58, 18, 4).fillStyle(0xffffff).fillRect(0, -54, 18, 4).fillStyle(0x1e9e6a).fillRect(0, -50, 18, 4);
    // ballot box in front
    g.fillStyle(col).fillRect(14, 12, 14, 12).lineStyle(2, INK).strokeRect(14, 12, 14, 12);
    // CRPF jawan standing guard beside the booth: olive uniform, helmet, rifle
    const jx = -44;
    const jy = 10;
    g.fillStyle(0x4f5f2f).fillRoundedRect(jx - 7, jy, 14, 22, 4).lineStyle(2, INK).strokeRoundedRect(jx - 7, jy, 14, 22, 4);
    g.fillStyle(0xd9a778).fillCircle(jx, jy - 5, 6).lineStyle(2, INK).strokeCircle(jx, jy - 5, 6);
    g.fillStyle(0x3d4a24).fillEllipse(jx, jy - 9, 16, 9).lineStyle(2, INK).strokeEllipse(jx, jy - 9, 16, 9);
    g.lineStyle(3, INK).lineBetween(jx + 8, jy - 2, jx + 8, jy + 24);
  }
}
