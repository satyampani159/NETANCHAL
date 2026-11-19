// Hand-drawn character art, used everywhere (website and game). A character
// missing from RAW falls back to the generated SVG portrait in portraits.ts.
// To add one: drop <id>.svg (512x640 full body, head centred around x256 y200)
// into this folder and add it to RAW below. The round token is cropped from the
// same file, so there is only one drawing per character to maintain.
import { ALLIANCES, CHARACTERS, type CharacterId } from '@netanchal/shared';
import bijli from './bijli_babu.svg?raw';
import chanakya from './chanakya_rao.svg?raw';
import dharna from './dharna_dada.svg?raw';
import kila from './kila_singh.svg?raw';
import pandit from './pandit_shabdkosh.svg?raw';
import sadak from './sadak_kumar.svg?raw';
import toofan from './toofan_rani.svg?raw';
import vikas from './vikas_veer.svg?raw';

const RAW: Partial<Record<CharacterId, string>> = {
  bijli_babu: bijli,
  chanakya_rao: chanakya,
  dharna_dada: dharna,
  kila_singh: kila,
  pandit_shabdkosh: pandit,
  sadak_kumar: sadak,
  toofan_rani: toofan,
  vikas_veer: vikas,
};

export interface CharacterArt {
  full: string;
  token: string;
}

const dataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Head-and-shoulders crop of the full drawing inside an alliance-coloured ring. */
function tokenSvg(id: CharacterId, raw: string): string {
  const alliance = CHARACTERS[id].alliance;
  const bg = alliance === 'rashtra_morcha' ? '#FCE3C8' : '#E3F4EA';
  const ring = ALLIANCES[alliance].css;
  // re-open the drawing as a nested <svg> that only shows the head region
  const inner = raw.replace(/<svg[^>]*>/, '<svg x="0" y="0" width="200" height="200" viewBox="66 36 380 380" preserveAspectRatio="xMidYMid slice">');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
<defs><clipPath id="tok-clip"><circle cx="100" cy="100" r="92"/></clipPath></defs>
<circle cx="100" cy="100" r="96" fill="${bg}"/>
<g clip-path="url(#tok-clip)">${inner}</g>
<circle cx="100" cy="100" r="91" fill="none" stroke="${ring}" stroke-width="10"/>
<circle cx="100" cy="100" r="97" fill="none" stroke="#1F1A17" stroke-width="4"/>
<circle cx="100" cy="100" r="85" fill="none" stroke="#1F1A17" stroke-width="2.5"/>
</svg>`;
}

export const CHARACTER_ART: Partial<Record<CharacterId, CharacterArt>> = Object.fromEntries(
  (Object.entries(RAW) as [CharacterId, string][]).map(([id, raw]) => [id, { full: dataUri(raw), token: dataUri(tokenSvg(id, raw)) }]),
);
