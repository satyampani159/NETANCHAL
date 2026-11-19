import { CHARACTER_IDS, CHARACTERS, type CharacterDef } from '@netanchal/shared';

/** Derived numbers for the strength showcase, all from the live game constants. */
export function strength(c: CharacterDef) {
  const dps = c.basic.damage / c.basic.cooldown;
  return { hp: c.hp, speed: c.speed, dps: Math.round(dps * 10) / 10, range: c.basic.kind === 'melee' ? c.basic.range : c.basic.range };
}

const all = CHARACTER_IDS.map((id) => strength(CHARACTERS[id]));
export const MAX = {
  hp: Math.max(...all.map((s) => s.hp)),
  speed: Math.max(...all.map((s) => s.speed)),
  dps: Math.max(...all.map((s) => s.dps)),
  range: Math.max(...all.map((s) => s.range)),
};

/** A single 0–100 "power" rating for the comic panel. */
export function power(c: CharacterDef) {
  const s = strength(c);
  const score = (s.hp / MAX.hp) * 0.32 + (s.speed / MAX.speed) * 0.2 + (s.dps / MAX.dps) * 0.28 + (s.range / MAX.range) * 0.2;
  return Math.round(55 + score * 45);
}
