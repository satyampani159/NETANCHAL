// Character art as SVG strings. The same markup is used by the website (as
// <img> data URIs) and by Phaser (rasterised into textures in BootScene), so
// the roster, lobby and in-game tokens always match.
// Drop the real character-art pack into this folder and swap `portraitSvg` for
// file imports when it is available.
import type { CharacterId } from '@netanchal/shared';

interface Look {
  skin: string;
  outfit: string;
  trim: string;
  hair: string;
  head: 'short' | 'bald_tuft' | 'hardhat' | 'turban' | 'bun' | 'spiky' | 'side_part' | 'cap';
  face: Array<'beard' | 'full_beard' | 'mustache' | 'glasses' | 'bindi' | 'tilak' | 'white_beard'>;
  prop?: 'ribbon' | 'scroll' | 'cone' | 'lathi' | 'megaphone' | 'bolt' | 'book' | 'placard';
  brow: 'calm' | 'fierce' | 'raised';
}

const LOOKS: Record<CharacterId, Look> = {
  vikas_veer: { skin: '#C68A5C', outfit: '#F7F0E3', trim: '#F28C28', hair: '#D9D4CC', head: 'short', face: ['beard'], prop: 'ribbon', brow: 'fierce' },
  chanakya_rao: { skin: '#B57A4F', outfit: '#FFFFFF', trim: '#B85A0B', hair: '#2A211C', head: 'bald_tuft', face: ['glasses', 'tilak'], prop: 'scroll', brow: 'raised' },
  sadak_kumar: { skin: '#A66A42', outfit: '#F28C28', trim: '#FFD23F', hair: '#2A211C', head: 'hardhat', face: ['mustache'], prop: 'cone', brow: 'calm' },
  kila_singh: { skin: '#9C6440', outfit: '#8C6A3F', trim: '#F28C28', hair: '#1D1714', head: 'turban', face: ['full_beard'], prop: 'lathi', brow: 'fierce' },
  toofan_rani: { skin: '#BF8259', outfit: '#1E9E6A', trim: '#FFFFFF', hair: '#1D1714', head: 'bun', face: ['bindi'], prop: 'megaphone', brow: 'fierce' },
  bijli_babu: { skin: '#AE784F', outfit: '#FFFFFF', trim: '#1E9E6A', hair: '#1D1714', head: 'spiky', face: ['mustache'], prop: 'bolt', brow: 'raised' },
  pandit_shabdkosh: { skin: '#C48D61', outfit: '#FFFFFF', trim: '#1E9E6A', hair: '#6B625A', head: 'side_part', face: ['glasses', 'tilak'], prop: 'book', brow: 'calm' },
  dharna_dada: { skin: '#8E5A37', outfit: '#F7F5F0', trim: '#1E9E6A', hair: '#EDEAE4', head: 'cap', face: ['white_beard'], prop: 'placard', brow: 'calm' },
};

const INK = '#1F1A17';

function head(l: Look): string {
  switch (l.head) {
    case 'short':
      return `<path d="M64 74c2-26 22-38 36-38s34 12 36 38c-8-10-20-14-36-14S72 64 64 74z" fill="${l.hair}"/>`;
    case 'bald_tuft':
      return `<path d="M98 34c-4-8 2-14 8-12-4 3-2 8 0 12z" fill="${l.hair}"/><path d="M64 84c-2-6-2-10 0-14M136 84c2-6 2-10 0-14" stroke="${l.hair}" stroke-width="6" stroke-linecap="round"/>`;
    case 'hardhat':
      return `<path d="M58 70c0-24 18-38 42-38s42 14 42 38z" fill="${l.trim}"/><rect x="50" y="66" width="100" height="10" rx="5" fill="${l.trim}"/><path d="M100 34v32" stroke="#E0B12E" stroke-width="5"/>`;
    case 'turban':
      return `<path d="M58 78c-4-30 16-48 42-48s46 18 42 48c-10-8-24-12-42-12s-32 4-42 12z" fill="${l.trim}"/><path d="M62 62c16-12 52-16 76 0M64 50c20-10 46-10 70 4" stroke="#C86A12" stroke-width="5" fill="none"/><circle cx="100" cy="48" r="6" fill="#FFD23F"/>`;
    case 'bun':
      return `<circle cx="100" cy="30" r="16" fill="${l.hair}"/><path d="M62 82c-2-30 16-46 38-46s40 16 38 46c-6-14-20-22-38-22s-32 8-38 22z" fill="${l.hair}"/><path d="M62 82c-4 18-2 30 4 40M138 82c4 18 2 30-4 40" stroke="${l.hair}" stroke-width="8" stroke-linecap="round"/>`;
    case 'spiky':
      return `<path d="M62 72l4-24 10 12 6-24 10 16 8-22 8 22 10-16 6 24 10-12 4 24c-10-8-24-12-38-12s-28 4-38 12z" fill="${l.hair}"/>`;
    case 'side_part':
      return `<path d="M64 76c0-26 16-40 36-40 22 0 38 14 36 40-6-14-18-20-30-20-4 0-6-2-8-6-6 10-20 14-34 26z" fill="${l.hair}"/>`;
    case 'cap':
      return `<path d="M64 62l8-20h56l8 20z" fill="#FFFFFF" stroke="#D8D2C6" stroke-width="2"/><path d="M64 72c0-6 2-10 4-12M136 72c0-6-2-10-4-12" stroke="${l.hair}" stroke-width="6" stroke-linecap="round"/>`;
  }
}

function face(l: Look): string {
  const brows = {
    calm: '<path d="M78 82h14M108 82h14"/>',
    fierce: '<path d="M76 78l16 6M124 78l-16 6"/>',
    raised: '<path d="M76 80q8-6 16 0M108 80q8-6 16 0"/>',
  }[l.brow];
  let out = `<g stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none">${brows}</g>`;
  out += `<circle cx="85" cy="93" r="4" fill="${INK}"/><circle cx="115" cy="93" r="4" fill="${INK}"/>`;
  out += `<path d="M100 96l-4 12h6" stroke="${INK}" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  out += `<path d="M90 118q10 6 20 0" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  for (const f of l.face) {
    if (f === 'glasses')
      out += `<g stroke="${INK}" stroke-width="3" fill="#FFFFFF" fill-opacity=".25"><circle cx="85" cy="93" r="10"/><circle cx="115" cy="93" r="10"/><path d="M95 93h10"/></g>`;
    if (f === 'mustache') out += `<path d="M84 112q16-10 32 0q-16 4-32 0z" fill="${INK}"/>`;
    if (f === 'beard') out += `<path d="M72 102c2 26 14 38 28 38s26-12 28-38c-6 10-16 14-28 14s-22-4-28-14z" fill="${l.hair}"/><path d="M86 112q14-8 28 0" stroke="${l.hair}" stroke-width="6" fill="none"/>`;
    if (f === 'white_beard') out += `<path d="M70 100c0 34 14 48 30 48s30-14 30-48c-6 12-16 16-30 16s-24-4-30-16z" fill="${l.hair}"/><path d="M84 112q16-10 32 0" stroke="${l.hair}" stroke-width="7" fill="none"/>`;
    if (f === 'full_beard') out += `<path d="M68 96c0 36 14 50 32 50s32-14 32-50c-6 14-18 20-32 20s-26-6-32-20z" fill="${l.hair}"/><path d="M84 112q16-10 32 0" stroke="${l.hair}" stroke-width="7" fill="none"/>`;
    if (f === 'bindi') out += `<circle cx="100" cy="76" r="4" fill="#C8102E"/>`;
    if (f === 'tilak') out += `<path d="M96 66v12M104 66v12" stroke="#E25822" stroke-width="3"/><circle cx="100" cy="76" r="3" fill="#C8102E"/>`;
  }
  return out;
}

function prop(l: Look): string {
  switch (l.prop) {
    case 'ribbon':
      return `<path d="M140 168l30-24 6 8-30 24z" fill="#C8102E"/><circle cx="168" cy="146" r="7" fill="none" stroke="${INK}" stroke-width="3"/><circle cx="178" cy="156" r="7" fill="none" stroke="${INK}" stroke-width="3"/>`;
    case 'scroll':
      return `<rect x="142" y="140" width="34" height="46" rx="4" fill="#F3E2B3" stroke="#B88A3A" stroke-width="3" transform="rotate(-14 159 163)"/><path d="M150 152h20M150 160h16M150 168h18" stroke="#B88A3A" stroke-width="2" transform="rotate(-14 159 163)"/>`;
    case 'cone':
      return `<path d="M152 190l14-48 14 48z" fill="#F28C28"/><path d="M157 172h18M161 158h10" stroke="#FFFFFF" stroke-width="5"/>`;
    case 'lathi':
      return `<path d="M150 200L182 112" stroke="#7A4E25" stroke-width="8" stroke-linecap="round"/><path d="M176 128l8 3" stroke="#C9A35C" stroke-width="8"/>`;
    case 'megaphone':
      return `<path d="M144 160l26-20v40z" fill="#FFFFFF" stroke="${INK}" stroke-width="3"/><rect x="134" y="154" width="12" height="14" rx="3" fill="${INK}"/><path d="M178 150l10-6M180 160h12M178 170l10 6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    case 'bolt':
      return `<path d="M168 128l-18 32h14l-10 30 26-40h-14l10-22z" fill="#FFD23F" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    case 'book':
      return `<path d="M136 150h22l4 4 4-4h22v40h-22l-4 4-4-4h-22z" fill="#7B2D26"/><path d="M162 154v40" stroke="#F3E2B3" stroke-width="2"/>`;
    case 'placard':
      return `<path d="M162 200v-50" stroke="#7A4E25" stroke-width="6"/><rect x="138" y="118" width="48" height="36" rx="3" fill="#FFFFFF" stroke="${INK}" stroke-width="3"/><path d="M146 130h32M146 140h24" stroke="#1E9E6A" stroke-width="4"/>`;
    default:
      return '';
  }
}

export function portraitSvg(id: CharacterId, opts: { bg?: string; ring?: string } = {}): string {
  const l = LOOKS[id];
  const bg = opts.bg ? `<circle cx="100" cy="100" r="98" fill="${opts.bg}"/>` : '';
  const ring = opts.ring ? `<circle cx="100" cy="100" r="94" fill="none" stroke="${opts.ring}" stroke-width="8"/>` : '';
  const clipId = `c-${id}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
<defs><clipPath id="${clipId}"><circle cx="100" cy="100" r="98"/></clipPath></defs>
${bg}<g clip-path="${opts.bg ? `url(#${clipId})` : 'none'}">
<path d="M30 206c4-44 30-62 70-62s66 18 70 62z" fill="${l.outfit}" stroke="${INK}" stroke-opacity=".15" stroke-width="2"/>
<path d="M78 150l22 26 22-26" fill="none" stroke="${l.trim}" stroke-width="8" stroke-linejoin="round"/>
<path d="M30 206c4-30 14-46 30-54" stroke="${l.trim}" stroke-width="6" fill="none"/>
<rect x="88" y="124" width="24" height="26" fill="${l.skin}"/>
<ellipse cx="100" cy="94" rx="36" ry="40" fill="${l.skin}"/>
<ellipse cx="63" cy="96" rx="6" ry="9" fill="${l.skin}"/><ellipse cx="137" cy="96" rx="6" ry="9" fill="${l.skin}"/>
${head(l)}${face(l)}${prop(l)}
</g>${ring}</svg>`;
}

export function portraitDataUri(id: CharacterId, opts?: { bg?: string; ring?: string }): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(portraitSvg(id, opts))}`;
}
