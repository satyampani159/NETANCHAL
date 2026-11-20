// Analytics: a passive observer. It only READS existing stores, the event bus and DOM clicks, and pushes
// events to window.dataLayer for Google Tag Manager (GTM-TH748BDF -> GA4). It never changes state, never
// touches the DOM and never stops an event. Every handler is wrapped so a failure here cannot affect the game.
// Never sent: player names, client ids, room codes, coordinates.
import { CHARACTERS, type AllianceId, type CharacterId } from '@netanchal/shared';
import { eventBus } from './game/EventBus';
import { levelInfo } from './game/progression';
import { HAS_SERVER_CONFIG, matchStore } from './app/state/matchStore';
import { navigationStore, type Screen } from './app/state/navigationStore';
import { profileStore } from './app/state/profileStore';
import type { GameRoom, RoomStatus } from './phaser/net/RoomClient';

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

type Params = Record<string, string | number | boolean | null | undefined>;

const usedKeys = new Set<string>();

/** Push one event. Keys from the previous event are cleared first so GTM variables never carry stale values. */
export function track(event: string, params: Params = {}) {
  try {
    const dl = (window.dataLayer = window.dataLayer || []);
    if (usedKeys.size) {
      const reset: Record<string, undefined> = {};
      usedKeys.forEach((k) => (reset[k] = undefined));
      dl.push(reset);
      usedKeys.clear();
    }
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      clean[k] = typeof v === 'string' ? v.slice(0, 100) : v;
      usedKeys.add(k);
    }
    dl.push({ event, ...clean });
    if (import.meta.env.DEV) console.debug('[analytics]', event, clean);
  } catch {
    /* analytics must never break the game */
  }
}

/** Runs fn and swallows anything it throws. */
const safe =
  <A extends unknown[]>(fn: (...a: A) => void) =>
  (...a: A) => {
    try {
      fn(...a);
    } catch {
      /* ignore */
    }
  };

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const secs = (since: number) => Math.round((now() - since) / 1000);
const other = (a: AllianceId): AllianceId => (a === 'rashtra_morcha' ? 'jan_ekta' : 'rashtra_morcha');

function matchesBucket(n: number) {
  if (n <= 0) return '0';
  if (n === 1) return '1';
  if (n <= 3) return '2-3';
  if (n <= 9) return '4-9';
  return '10+';
}

const NAME_TO_ID = new Map<string, CharacterId>(Object.entries(CHARACTERS).map(([id, c]) => [c.name.toLowerCase(), id as CharacterId]));

// ---------------------------------------------------------------------------
// session state (read-only mirrors of what the game is doing)
// ---------------------------------------------------------------------------

let started = false;
let lobbyEnteredAt = 0;
let lobbyFrom: Screen['name'] | null = null;
let currentIntent: string = 'quick';
let lastClickAt = 0;
let suppressNavUntil = 0;
let errorCount = 0;

interface MatchCtx {
  startedAt: number;
  mySlot: string;
  alliance: AllianceId | null;
  characterId: CharacterId | null;
  modeActual: 'solo' | 'online';
  privateRoom: boolean;
  coaching: boolean;
  round: number;
  pings: number;
  ended: boolean;
  status: RoomStatus;
  offlineSince: number;
  offs: Array<() => void>;
}
let match: MatchCtx | null = null;

function endMatchCtx() {
  if (!match) return;
  match.offs.forEach((off) => {
    try {
      off();
    } catch {
      /* ignore */
    }
  });
  match = null;
}

function pushUserProps() {
  const p = profileStore.getState().profile;
  track('user_props', {
    matches_bucket: matchesBucket(p.matches),
    preferred_mode: matchStore.getState().mode,
    day_streak: p.dayStreak,
  });
}

// ---------------------------------------------------------------------------
// screens
// ---------------------------------------------------------------------------

function onScreenChange(screen: Screen, prev: Screen) {
  if (screen === prev) return;
  const from = prev.name;
  const to = screen.name;
  if (from === to) return;
  const suppressed = now() < suppressNavUntil;

  track('game_screen', { screen_name: to, previous_screen: from });

  const ms = matchStore.getState();

  // landing -> lobby: the player pressed Play (or a shared link / Create / Join sent them in)
  if (to === 'lobby') {
    lobbyEnteredAt = now();
    lobbyFrom = from;
    if (from === 'landing' && !suppressed) {
      currentIntent = ms.roomIntent.mode;
      track('play_click', { mode: ms.mode, difficulty: ms.difficulty, room_intent: currentIntent });
    }
    if (from === 'results') track('rematch_click', {});
  }

  if (from === 'lobby' && to === 'landing' && !suppressed) {
    track('lobby_abandon', { seconds_in_lobby: secs(lobbyEnteredAt), reason: ms.notice ? 'notice' : 'back' });
  }

  if (to === 'game' && screen.name === 'game') startMatch(screen.room, screen.initialState, screen.mySlot, from);

  if (from === 'game' && to === 'lobby' && match && !match.ended) {
    track('match_quit', {
      seconds_played: secs(match.startedAt),
      round: match.round,
      reason: match.status === 'closed' ? 'disconnected' : 'exit',
      character_id: match.characterId ?? undefined,
      mode_actual: match.modeActual,
      difficulty: ms.difficulty,
      coaching: match.coaching,
    });
  }

  if (to === 'results' && screen.name === 'results') endMatch(screen.result, screen.mySlot);

  if (from === 'results' && to === 'landing') track('exit_click', {});

  if (from === 'game') endMatchCtx();

  if (to === 'landing') setTimeout(safe(watchLanding), 400);
  else unwatchLanding();
}

function startMatch(room: GameRoom, initial: { players: Array<{ id: string; characterId: CharacterId; alliance: AllianceId }> }, mySlot: string, from: Screen['name']) {
  endMatchCtx();
  const me = initial.players.find((p) => p.id === mySlot);
  const ms = matchStore.getState();
  match = {
    startedAt: now(),
    mySlot,
    alliance: me?.alliance ?? null,
    characterId: me?.characterId ?? null,
    modeActual: room.solo ? 'solo' : 'online',
    privateRoom: !!room.latest.lobby?.isPrivate,
    coaching: ms.coaching,
    round: 1,
    pings: 0,
    ended: false,
    status: room.status,
    offlineSince: 0,
    offs: [],
  };
  const ctx = match;
  ctx.offs.push(
    room.onStatus(
      safe((s: RoomStatus) => {
        if (s === 'reconnecting') {
          ctx.offlineSince = now();
          track('connection_lost', { round: ctx.round });
        } else if (s === 'connected' && ctx.status === 'reconnecting') {
          track('connection_restored', { seconds_offline: secs(ctx.offlineSince) });
        } else if (s === 'closed' && !ctx.ended) {
          track('disconnected', { seconds_offline: ctx.offlineSince ? secs(ctx.offlineSince) : 0, round: ctx.round });
        }
        ctx.status = s;
      }),
    ),
  );
  track('match_start', {
    mode_requested: ms.mode,
    mode_actual: ctx.modeActual,
    private_room: ctx.privateRoom,
    room_intent: currentIntent,
    difficulty: ms.difficulty,
    coaching: ctx.coaching,
    character_id: ctx.characterId ?? undefined,
    alliance: ctx.alliance ?? undefined,
    joined_in_progress: !!room.latest.lobby?.inProgress,
    is_rematch: lobbyFrom === 'results',
    lobby_seconds: lobbyEnteredAt ? secs(lobbyEnteredAt) : undefined,
    came_from: from,
  });
}

function endMatch(result: { winner: AllianceId; mvp: string; score: Record<AllianceId, number>; stats: Array<{ id: string; alliance: AllianceId; characterId: CharacterId; kills: number; deaths: number; assists: number; damage: number; captureSeconds: number; boothFlips: number; gateBreaks: number; towerCaptures: number }> }, mySlot: string) {
  const me = result.stats.find((s) => s.id === mySlot);
  const ms = matchStore.getState();
  const ctx = match;
  if (ctx) ctx.ended = true;
  const mine = me?.alliance ?? ctx?.alliance ?? null;
  track('match_end', {
    won: mine ? mine === result.winner : undefined,
    winner: result.winner,
    score_diff: mine ? result.score[mine] - result.score[other(mine)] : undefined,
    rounds_won: mine ? result.score[mine] : undefined,
    was_mvp: result.mvp === mySlot,
    character_id: me?.characterId ?? ctx?.characterId ?? undefined,
    alliance: mine ?? undefined,
    mode_actual: ctx?.modeActual,
    difficulty: ms.difficulty,
    coaching: ctx?.coaching,
    private_room: ctx?.privateRoom,
    duration_s: ctx ? secs(ctx.startedAt) : undefined,
    kills: me?.kills,
    deaths: me?.deaths,
    assists: me?.assists,
    damage: me?.damage,
    capture_seconds: me?.captureSeconds,
    booth_flips: me?.boothFlips,
    gate_breaks: me?.gateBreaks,
    tower_captures: me?.towerCaptures,
    pings_sent: ctx?.pings,
  });

  const g = profileStore.getState().lastGains;
  if (g) {
    if (g.levelAfter > g.levelBefore) track('level_up', { level: g.levelAfter });
    if (g.challengeJustCompleted) track('challenge_complete', { challenge: g.challenge.id });
    if (g.unlocked.length) track('unlock', { item_count: g.unlocked.length, kind: g.unlocked[0]?.kind });
    track('streak', { day_streak: g.dayStreak, extended: g.streakExtended });
  }
  pushUserProps();
}

// ---------------------------------------------------------------------------
// landing page: sections seen, character sheet / profile opened
// ---------------------------------------------------------------------------

const seenSections = new Set<string>();
let sectionObserver: IntersectionObserver | null = null;
let dialogObserver: MutationObserver | null = null;

function watchLanding() {
  if (navigationStore.getState().screen.name !== 'landing') return;
  unwatchLanding();
  if (typeof IntersectionObserver !== 'undefined') {
    sectionObserver = new IntersectionObserver(
      safe((entries: IntersectionObserverEntry[]) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).id;
          if (e.isIntersecting && id && !seenSections.has(id)) {
            seenSections.add(id);
            track('section_view', { section: id });
          }
        }
      }),
      { threshold: 0.5 },
    );
    for (const id of ['hero', 'strength', 'how', 'instagram', 'play']) {
      const el = document.getElementById(id);
      if (el && !seenSections.has(id)) sectionObserver.observe(el);
    }
  }
  if (typeof MutationObserver !== 'undefined') {
    dialogObserver = new MutationObserver(
      safe((records: MutationRecord[]) => {
        for (const r of records) {
          r.addedNodes.forEach((n) => {
            if (!(n instanceof HTMLElement)) return;
            const sheet = n.matches('dialog') ? n : n.querySelector('dialog');
            const title = sheet?.querySelector('#sheet-title')?.textContent?.trim();
            if (title) track('character_view', { character_id: NAME_TO_ID.get(title.toLowerCase()) ?? undefined, character_name: title });
            const profile = n.matches('[aria-label="Your profile"]') ? n : n.querySelector('[aria-label="Your profile"]');
            if (profile) track('profile_open', {});
          });
        }
      }),
    );
    const root = document.getElementById('root') ?? document.body;
    dialogObserver.observe(root, { childList: true, subtree: true });
  }
}

function unwatchLanding() {
  sectionObserver?.disconnect();
  sectionObserver = null;
  dialogObserver?.disconnect();
  dialogObserver = null;
}

// ---------------------------------------------------------------------------
// clicks (capture phase, passive: we look, we never interfere)
// ---------------------------------------------------------------------------

function onClick(ev: MouseEvent) {
  lastClickAt = now();
  const target = ev.target as Element | null;
  const el = target?.closest?.('a,button') as HTMLElement | null;
  if (!el) return;
  const screen = navigationStore.getState().screen.name;

  if (el instanceof HTMLAnchorElement) {
    const href = el.href || '';
    if (/instagram\.com/i.test(href)) track('social_click', { network: 'instagram', location: screen });
    return;
  }

  if ((el as HTMLButtonElement).disabled) return;
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();

  // lobby character card: the name span carries title={character name}
  const nameEl = el.querySelector('[title]');
  if (screen === 'lobby' && nameEl) {
    const id = NAME_TO_ID.get((nameEl.getAttribute('title') || '').toLowerCase());
    if (id) {
      track('character_pick', { character_id: id, alliance: CHARACTERS[id].alliance, seconds_in_lobby: secs(lobbyEnteredAt) });
      return;
    }
  }

  if (text.startsWith('play now')) {
    const location = el.closest('nav') ? 'nav' : el.closest('#play') ? 'cta' : 'hero';
    track('play_button', { location });
  } else if (text === 'create room') track('room_create_click', {});
  else if (text === 'join' && (el as HTMLButtonElement).type === 'submit') track('room_join_click', {});
  else if (screen === 'results' && (text.startsWith('invite') || text.startsWith('friends'))) track('invite_click', { location: screen });
  else if (text === 'retry online') {
    track('retry_online_click', {});
    // the retry hops landing -> lobby on its own; don't count that as Back + Play
    suppressNavUntil = now() + 1500;
  } else if (text === 'share') track('share_click', { location: screen });
  else if (text === "i'm ready") track('ready_click', { seconds_in_lobby: secs(lobbyEnteredAt) });
  else if (text === 'seats') track('seats_open', {});
  else if (text === 'go fullscreen') track('fullscreen_prompt_click', {});
}

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------

export function initAnalytics() {
  if (started || typeof window === 'undefined') return;
  started = true;

  // capture the URL before the landing page strips ?play= / ?room= (keeps UTM tags and the entry type)
  const search = new URLSearchParams(location.search);
  const entry = search.get('play') === '1' ? 'play_link' : search.get('room') ? 'room_link' : 'direct';
  let original = location.href;
  if (search.has('room')) {
    // the room code is not personal, but it is high-cardinality noise: drop it
    const u = new URL(location.href);
    u.searchParams.delete('room');
    original = u.toString();
  }
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ original_page_location: original });

  const p = profileStore.getState().profile;
  const standalone = typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches;
  track('app_boot', {
    entry,
    display_mode: standalone ? 'standalone' : 'browser',
    has_touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    returning: p.matches > 0,
    matches_bucket: matchesBucket(p.matches),
    level: levelInfo(p.xp).level,
    tutorial_done: p.tutorialDone,
    server_configured: HAS_SERVER_CONFIG,
  });
  pushUserProps();
  track('game_screen', { screen_name: navigationStore.getState().screen.name, previous_screen: 'none' });
  setTimeout(safe(watchLanding), 800);

  navigationStore.subscribe(safe((s, prev) => onScreenChange(s.screen, prev.screen)));

  matchStore.subscribe(
    safe((s, prev) => {
      const byUser = now() - lastClickAt < 1000 && navigationStore.getState().screen.name === 'landing';
      if (s.mode !== prev.mode && byUser) track('mode_select', { value: s.mode });
      if (s.difficulty !== prev.difficulty && byUser) track('difficulty_select', { value: s.difficulty });
      if (s.notice && s.notice !== prev.notice) {
        if (s.notice.startsWith('The game server did not answer') || s.notice.startsWith('Online play needs a game server')) {
          track('server_fallback', { waited_ms: Math.round(now() - lobbyEnteredAt), server_configured: HAS_SERVER_CONFIG });
        } else if (currentIntent !== 'quick' && !s.notice.startsWith('First time?')) {
          track('room_join_failed', { room_intent: currentIntent });
        }
      }
      if (prev.coaching && !s.coaching && navigationStore.getState().screen.name === 'game') {
        track('coach_end', { match_finished: !!match?.ended, seconds_played: match ? secs(match.startedAt) : undefined });
      }
    }),
  );

  profileStore.subscribe(
    safe((s, prev) => {
      const a = s.profile;
      const b = prev.profile;
      if (a === b) return;
      if (a.tutorialDone && !b.tutorialDone) track('tutorial_complete', {});
      if (a.shares > b.shares) track('share', { method: 'result_card' });
      if (a.name !== b.name) track('profile_rename', {});
      for (const kind of Object.keys(a.equipped) as Array<keyof typeof a.equipped>) {
        if (a.equipped[kind] !== b.equipped[kind]) track('cosmetic_equip', { kind, item_id: a.equipped[kind] });
      }
    }),
  );

  eventBus.on(
    'game:round-ended',
    safe((r) => {
      const mine = match?.alliance ?? null;
      if (match) match.round = r.round + 1;
      track('round_end', {
        round: r.round,
        winner: r.winner,
        reason: r.reason,
        won: mine ? mine === r.winner : undefined,
        score_rm: r.score.rashtra_morcha,
        score_je: r.score.jan_ekta,
        votes_diff: mine ? r.votes[mine] - r.votes[other(mine)] : undefined,
        round_mvp_is_me: !!match && r.mvp?.id === match.mySlot,
        character_id: match?.characterId ?? undefined,
      });
    }),
  );
  eventBus.on(
    'game:match-ended',
    safe(() => {
      if (match) match.ended = true;
    }),
  );
  eventBus.on(
    'ui:ping',
    safe((p) => {
      if (match) match.pings++;
      track('ping_used', { ping_type: p.type });
    }),
  );

  document.addEventListener('click', safe(onClick), { capture: true, passive: true });

  window.addEventListener(
    'error',
    safe((e: ErrorEvent) => {
      if (errorCount++ >= 5) return;
      track('js_error', { message: String(e.message || 'error'), screen_name: navigationStore.getState().screen.name });
    }),
  );
  window.addEventListener(
    'unhandledrejection',
    safe((e: PromiseRejectionEvent) => {
      if (errorCount++ >= 5) return;
      const reason = e.reason instanceof Error ? e.reason.message : String(e.reason);
      track('js_error', { message: `promise: ${reason}`, screen_name: navigationStore.getState().screen.name });
    }),
  );
}
