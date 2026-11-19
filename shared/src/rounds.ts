// Each round is a political event; this is the copy the round-break card shows.
import type { AllianceId } from './characters';
import type { PlayerTally, RoundReason } from './protocol';

export const INTERMISSION_SECONDS = 8;
/** the closing stretch of a round, when booth flips and KOs pay double */
export const COUNTING_HOUR_SECONDS = 30;

export interface RoundTheme { title: string; tagline: string }

export const ROUND_THEMES: RoundTheme[] = [
  { title: 'Nomination Day', tagline: 'Files are in. Grab the booths before the counting starts.' },
  { title: 'Rally Season', tagline: 'The ruling party guards its gate harder. The opposition has a media van.' },
  { title: 'Counting Day', tagline: 'One round left. Whoever wins this forms the government.' },
];

export const themeFor = (round: number): RoundTheme => ROUND_THEMES[Math.min(Math.max(round, 1), ROUND_THEMES.length) - 1];

export function headlineFor(party: string, reason: RoundReason, margin: number): { kicker: string; headline: string } {
  if (reason === 'hq_captured') return { kicker: 'Breaking news', headline: `${party} storms the Secretariat and takes the tower!` };
  if (reason === 'votes') return { kicker: 'Mandate declared', headline: `${party} wins the round by ${Math.max(1, Math.round(margin))} votes` };
  return { kicker: 'Photo finish', headline: `Booth count decides it: ${party} takes the round` };
}

export const newTally = (): PlayerTally => ({ kills: 0, deaths: 0, damage: 0, captureSeconds: 0, assists: 0, boothFlips: 0, gateDamage: 0, gateBreaks: 0, towerCaptures: 0 });

/** One number for "who mattered": fighting, objectives (holding booths and the tower, breaking the gate), and not dying. */
export function mvpScore(t: PlayerTally): number {
  return (
    t.damage + t.kills * 120 + t.assists * 50 + t.captureSeconds * 15 + t.boothFlips * 30 + t.gateDamage * 0.5 + t.gateBreaks * 150 + t.towerCaptures * 250 - t.deaths * 40
  );
}

export const ALLIANCE_NAME_HINT: Record<AllianceId, string> = { rashtra_morcha: 'Rashtra Morcha', jan_ekta: 'Jan Ekta Gathbandhan' };
