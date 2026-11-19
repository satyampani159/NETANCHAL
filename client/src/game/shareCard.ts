// Draws a result card as a PNG with the canvas API (no server, nothing uploaded) so players can share it.
import { ALLIANCES, type AllianceId, CHARACTERS, type CharacterId } from '@netanchal/shared';
import { CHARACTER_ART } from '../assets/characters/art';
import { portraitDataUri } from '../assets/characters/portraits';
import type { Cosmetic } from './progression';

export interface CardOptions {
  /** e.g. "Round 2 · Rally Season" or "Match result" */
  kicker: string;
  headline: string;
  winner: AllianceId;
  score: Record<AllianceId, number>;
  /** the votes line under the score, optional */
  detail?: string;
  mvp: { characterId: CharacterId; label: string; line: string };
  me?: { characterId: CharacterId; name: string; line: string } | null;
  level: number;
  dayStreak: number;
  banner: Cosmetic | null;
  frame: Cosmetic | null;
  link: string;
}

export const CARD_W = 1080;
export const CARD_H = 1350;
const FONT_BIG = "'Archivo Black', Impact, 'Arial Black', sans-serif";
const FONT_TAG = "Teko, 'Arial Narrow', Impact, sans-serif";
const FONT_BODY = "Hind, system-ui, sans-serif";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, stroke = '#111', lw = 8, shadow = 12, r = 22) {
  ctx.save();
  ctx.fillStyle = stroke;
  ctx.beginPath();
  ctx.roundRect(x + shadow, y + shadow, w, h, r);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

async function art(id: CharacterId, kind: 'full' | 'token') {
  const a = CHARACTER_ART[id];
  return loadImage(a ? a[kind] : portraitDataUri(id));
}

export async function renderShareCard(o: CardOptions): Promise<Blob> {
  // make sure the page fonts are ready so the card matches the site
  try {
    await Promise.all([document.fonts.load(`40px 'Archivo Black'`), document.fonts.load('40px Teko'), document.fonts.load('30px Hind')]);
  } catch {
    /* fall back to system fonts */
  }
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;
  const party = ALLIANCES[o.winner];
  const ink = '#111111';
  const frameColor = o.frame?.color || ink;

  // background: the winning party's colour with sunburst rays
  ctx.fillStyle = party.css;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.save();
  ctx.translate(CARD_W / 2, 520);
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1600, -90);
    ctx.lineTo(1600, 90);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // frame
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = 28;
  ctx.strokeRect(14, 14, CARD_W - 28, CARD_H - 28);

  // kicker and wordmark
  ctx.textBaseline = 'alphabetic';
  box(ctx, 60, 60, 520, 74, '#FFD60A', ink, 6, 8, 14);
  ctx.fillStyle = ink;
  ctx.font = `46px ${FONT_TAG}`;
  ctx.fillText(o.kicker.toUpperCase().slice(0, 34), 82, 114);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFBF0';
  ctx.font = `64px ${FONT_BIG}`;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';
  ctx.strokeText('NETANCHAL', CARD_W - 70, 118);
  ctx.fillText('NETANCHAL', CARD_W - 70, 118);
  ctx.textAlign = 'left';

  // headline card
  box(ctx, 60, 190, CARD_W - 120, 330, '#FFFBF0', ink, 8, 14);
  ctx.fillStyle = ink;
  let size = 76;
  let lines: string[] = [];
  do {
    ctx.font = `${size}px ${FONT_BIG}`;
    lines = wrap(ctx, o.headline.toUpperCase(), CARD_W - 200);
    size -= 4;
  } while (lines.length > 3 && size > 40);
  const lh = size * 1.12 + 6;
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, 100, 270 + i * lh));
  ctx.font = `34px ${FONT_BODY}`;
  ctx.fillStyle = 'rgba(17,17,17,0.7)';
  if (o.detail) ctx.fillText(o.detail.slice(0, 70), 100, 490);

  // score
  const sy = 570;
  for (const [i, a] of (['rashtra_morcha', 'jan_ekta'] as const).entries()) {
    const x = i === 0 ? 60 : CARD_W / 2 + 60;
    box(ctx, x, sy, CARD_W / 2 - 120, 150, ALLIANCES[a].css, ink, 8, 10, 18);
    ctx.fillStyle = a === 'jan_ekta' ? '#fff' : ink;
    ctx.font = `38px ${FONT_TAG}`;
    ctx.fillText(ALLIANCES[a].short.toUpperCase(), x + 26, sy + 54);
    ctx.font = `92px ${FONT_BIG}`;
    ctx.fillText(String(o.score[a]), x + 26, sy + 134);
  }
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.font = `56px ${FONT_BIG}`;
  ctx.fillText('VS', CARD_W / 2, sy + 98);
  ctx.textAlign = 'left';

  // MVP panel with the portrait
  const my = 770;
  box(ctx, 60, my, CARD_W - 120, 300, '#111111', ink, 8, 12);
  const mvpImg = await art(o.mvp.characterId, 'full');
  if (mvpImg) {
    const h = 270;
    const w = (mvpImg.width / mvpImg.height) * h;
    ctx.drawImage(mvpImg, 90, my + 15, Math.min(w, 250), h);
  }
  ctx.fillStyle = '#FFD60A';
  ctx.font = `46px ${FONT_TAG}`;
  ctx.fillText(`★ ${o.mvp.label.toUpperCase()}`, 380, my + 80);
  ctx.fillStyle = '#FFFBF0';
  ctx.font = `60px ${FONT_BIG}`;
  ctx.fillText(CHARACTERS[o.mvp.characterId].name.toUpperCase(), 380, my + 150);
  ctx.font = `36px ${FONT_BODY}`;
  ctx.fillStyle = 'rgba(255,251,240,0.85)';
  wrap(ctx, o.mvp.line, 620).slice(0, 3).forEach((l, i) => ctx.fillText(l, 380, my + 205 + i * 44));

  // my line: banner, name, level, streak
  const by = 1110;
  if (o.me) {
    box(ctx, 60, by, CARD_W - 120, 130, o.banner?.color || '#FFFBF0', ink, 8, 10, 18);
    const tok = await art(o.me.characterId, 'token');
    if (tok) ctx.drawImage(tok, 84, by + 20, 90, 90);
    ctx.fillStyle = ink;
    ctx.font = `44px ${FONT_BIG}`;
    ctx.fillText(o.me.name.toUpperCase().slice(0, 14), 196, by + 62);
    ctx.font = `32px ${FONT_BODY}`;
    ctx.fillText(o.me.line.slice(0, 54), 196, by + 104);
    ctx.textAlign = 'right';
    ctx.font = `44px ${FONT_TAG}`;
    ctx.fillText(`LV ${o.level}${o.dayStreak > 1 ? `   🔥 ${o.dayStreak}` : ''}`, CARD_W - 90, by + 76);
    ctx.textAlign = 'left';
    if (o.banner && o.banner.id !== 'banner-none') {
      ctx.save();
      ctx.translate(CARD_W - 110, by - 6);
      ctx.rotate(0.06);
      box(ctx, -250, -26, 250, 58, o.banner.color, ink, 5, 6, 10);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = `34px ${FONT_BIG}`;
      ctx.fillText(o.banner.name, -125, 16);
      ctx.restore();
      ctx.textAlign = 'left';
    }
  }

  // footer
  ctx.fillStyle = ink;
  ctx.font = `38px ${FONT_TAG}`;
  ctx.fillText('A FICTIONAL ELECTION · @NETANCHAL', 70, 1290);
  ctx.textAlign = 'right';
  ctx.font = `42px ${FONT_BIG}`;
  ctx.fillText(o.link.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 26), CARD_W - 70, 1290);
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the card'))), 'image/png'));
}
