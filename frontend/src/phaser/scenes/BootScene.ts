import Phaser from 'phaser';
import { ALLIANCES, CHARACTER_IDS, CHARACTERS } from '@netanchal/shared';
import { CHARACTER_ART } from '../../assets/characters/art';
import { portraitSvg } from '../../assets/characters/portraits';

const TOKEN_PX = 128;

function rasterise(scene: Phaser.Scene, key: string, src: string, size: number) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const tex = scene.textures.createCanvas(key, size, size);
      if (tex) {
        tex.context.drawImage(img, 0, 0, size, size);
        tex.refresh();
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'Counting votes…', { fontFamily: 'Teko, sans-serif', fontSize: '32px', color: '#F7F5F0' }).setOrigin(0.5);

    const dot = this.make.graphics({}, false);
    dot.fillStyle(0xffffff).fillCircle(8, 8, 8);
    dot.generateTexture('dot', 16, 16);
    dot.destroy();

    Promise.all(
      CHARACTER_IDS.map((id) => {
        const art = CHARACTER_ART[id];
        if (art) return rasterise(this, `tok-${id}`, art.token, TOKEN_PX);
        const a = ALLIANCES[CHARACTERS[id].alliance];
        const bg = CHARACTERS[id].alliance === 'rashtra_morcha' ? '#FCE3C8' : '#FFFFFF';
        const svg = portraitSvg(id, { bg, ring: a.css });
        return rasterise(this, `tok-${id}`, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, TOKEN_PX);
      }),
    ).then(() => {
      this.scene.start('match');
      this.scene.launch('hud');
    });
  }
}
