import Phaser from 'phaser';
import type { GameContext } from './context';
import { BootScene } from './scenes/BootScene';
import { HUDScene } from './scenes/HUDScene';
import { MatchScene } from './scenes/MatchScene';

export function createPhaserGame(parent: HTMLElement, ctx: GameContext): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#3a2f27',
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth || 960, height: parent.clientHeight || 540 },
    input: { activePointers: 4 },
    disableContextMenu: true,
    render: { antialias: true, roundPixels: false },
    banner: false,
    audio: { noAudio: true }, // all sound goes through game/audio.ts
    scene: [BootScene, MatchScene, HUDScene],
  });
  game.registry.set('ctx', ctx);
  game.registry.set('touch', { mx: 0, my: 0, attack: false, special: false });
  return game;
}
