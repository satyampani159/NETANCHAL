import { ALLIANCES, CHARACTERS, type MatchEnded, type RoundEnded, headlineFor, themeFor } from '@netanchal/shared';
import { equippedCosmetic, profileStore } from '../app/state/profileStore';
import { levelInfo } from './progression';
import type { CardOptions } from './shareCard';
import { siteLink } from '../ui/ShareButton';

function common() {
  const p = profileStore.getState().profile;
  return { level: levelInfo(p.xp).level, dayStreak: p.dayStreak, banner: equippedCosmetic('banner'), frame: equippedCosmetic('frame'), link: siteLink(), name: p.name };
}

export function roundCard(r: RoundEnded, mySlot: string, myCharacter: keyof typeof CHARACTERS | null): CardOptions {
  const c = common();
  const win = ALLIANCES[r.winner];
  const { headline } = headlineFor(win.name, r.reason, Math.abs(r.votes.rashtra_morcha - r.votes.jan_ekta));
  const m = r.mvp;
  void mySlot;
  return {
    kicker: `Round ${r.round} · ${themeFor(r.round).title}`,
    headline,
    winner: r.winner,
    score: r.score,
    detail: `Votes ${r.votes.rashtra_morcha} to ${r.votes.jan_ekta}`,
    mvp: { characterId: m.characterId, label: m.losingSide ? 'Opposition MVP' : 'Round MVP', line: `${m.damage} damage · ${m.kills} KO · ${m.assists} assists · ${m.captureSeconds}s holding` },
    me: myCharacter ? { characterId: myCharacter, name: c.name, line: 'Playing Netanchal' } : null,
    level: c.level,
    dayStreak: c.dayStreak,
    banner: c.banner,
    frame: c.frame,
    link: c.link,
  };
}

export function matchCard(result: MatchEnded, mySlot: string): CardOptions {
  const c = common();
  const win = ALLIANCES[result.winner];
  const me = result.stats.find((s) => s.id === mySlot);
  const mvp = result.stats.find((s) => s.id === result.mvp) ?? result.stats[0];
  const youWon = me?.alliance === result.winner;
  return {
    kicker: 'Match result',
    headline: youWon ? `${win.name} forms the government!` : `${win.name} wins the election`,
    winner: result.winner,
    score: result.score,
    detail: me ? `${me.kills} KOs · ${me.damage} damage · ${me.captureSeconds}s holding` : undefined,
    mvp: { characterId: mvp.characterId, label: 'Match MVP', line: `${mvp.damage} damage · ${mvp.kills} KO · ${mvp.assists} assists · ${mvp.captureSeconds}s holding` },
    me: me ? { characterId: me.characterId, name: c.name, line: youWon ? 'Formed the government' : 'Led the opposition' } : null,
    level: c.level,
    dayStreak: c.dayStreak,
    banner: c.banner,
    frame: c.frame,
    link: c.link,
  };
}
