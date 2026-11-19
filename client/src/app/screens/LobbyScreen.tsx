import { useEffect, useRef, useState } from 'react';
import { ALLIANCES, type CharacterId, type LobbyView, LOBBY_SECONDS } from '@netanchal/shared';
import { gameAudio } from '../../game/audio';
import { requestFullscreen } from '../../game/fullscreen';
import { CharacterGrid } from '../../lobby/CharacterGrid';
import { CountdownRing } from '../../lobby/CountdownRing';
import { RoomCodeCard } from '../../lobby/RoomCodeCard';
import { SlotList } from '../../lobby/SlotList';
import { FALLBACK_TIMEOUT_MS, type GameRoom, CONNECT_TIMEOUT_MS, joinOnline, joinSolo } from '../../phaser/net/RoomClient';
import { HAS_SERVER_CONFIG, matchStore, SERVER_URL } from '../state/matchStore';
import { navigationStore } from '../state/navigationStore';
import { profileStore } from '../state/profileStore';

/** Joins on mount, leaves on unmount unless the room was handed to the game. */
function useJoinedRoom() {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const handedOff = useRef(false);
  useEffect(() => {
    let cancelled = false;
    let joined: GameRoom | null = null;
    const { mode, playerName, difficulty, setNotice, roomIntent, setRoomIntent } = matchStore.getState();
    // the intent is used once: a reload or Back then Play goes to a normal quick match
    setRoomIntent({ mode: 'quick', code: '' });
    (async () => {
      try {
        // the very first match is a short guided practice against easy bots (unless they came to join a friend's room)
        const coaching = !profileStore.getState().profile.tutorialDone && roomIntent.mode === 'quick';
        matchStore.getState().setCoaching(coaching);
        if (coaching) {
          setNotice('First time? A quick practice match with a coach. Skip it any time.');
          joined = await joinSolo(playerName, 'easy', true);
        } else
        joined =
          mode === 'online'
            ? await joinOnline(SERVER_URL, playerName, difficulty, HAS_SERVER_CONFIG ? CONNECT_TIMEOUT_MS : FALLBACK_TIMEOUT_MS, roomIntent)
            : await joinSolo(playerName, difficulty);
      } catch (err) {
        if (roomIntent.mode !== 'quick' && !(err as Error).message.startsWith('Server did not answer')) {
          // the server answered and said no (wrong code, full room): tell them, do not silently start a solo game
          setNotice((err as Error).message);
          navigationStore.getState().goTo({ name: 'landing' });
          return;
        }
        setNotice(
          HAS_SERVER_CONFIG
            ? 'The game server did not answer. It may be waking up (free servers sleep when idle), or this site is not on its allowed list. Playing against bots for now. Tap Retry in a minute.'
            : 'Online play needs a game server and this site does not have one connected yet. Playing against bots instead.',
        );
        joined = await joinSolo(playerName, difficulty);
      }
      if (cancelled) joined.leave();
      else setRoom(joined);
    })();
    return () => {
      cancelled = true;
      if (joined && !handedOff.current) joined.leave();
    };
  }, []);
  return { room, handOff: () => (handedOff.current = true) };
}

function useLobbyState(room: GameRoom | null) {
  const [lobby, setLobby] = useState<LobbyView | null>(room?.latest.lobby ?? null);
  const [me, setMe] = useState<string | null>(room?.latest.welcome?.playerId ?? null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!room) return;
    if (room.latest.lobby) setLobby(room.latest.lobby);
    if (room.latest.welcome) setMe(room.latest.welcome.playerId);
    const offs = [
      room.on('lobby', setLobby),
      room.on('welcome', (w) => {
        setMe(w.playerId);
        matchStore.getState().setAlliance(w.alliance);
      }),
      room.on('error', (e) => setError(e.message)),
    ];
    return () => offs.forEach((off) => off());
  }, [room]);
  const mySlot = lobby?.slots.find((s) => s.playerId === me) ?? null;
  return { lobby, me, mySlot, error };
}

export function LobbyScreen() {
  const { room, handOff } = useJoinedRoom();
  const { lobby, me, mySlot, error } = useLobbyState(room);
  const notice = matchStore((s) => s.notice);
  const mode = matchStore((s) => s.mode);

  useEffect(() => {
    if (!room) return;
    return room.on('match_start', (state) => {
      const slot = room.latest.lobby?.slots.find((s) => s.playerId === room.latest.welcome?.playerId);
      handOff();
      navigationStore.getState().goTo({ name: 'game', room, initialState: state, mySlot: slot?.slotId ?? '' });
    });
  }, [room, handOff]);

  const pick = (id: CharacterId) => {
    requestFullscreen();
    gameAudio.unlock();
    room?.send('pick', { characterId: id });
  };
  const ready = () => {
    requestFullscreen();
    gameAudio.unlock();
    gameAudio.sfx('success');
    room?.send('ready', {});
  };
  const back = () => {
    matchStore.getState().setNotice(null);
    navigationStore.getState().goTo({ name: 'landing' });
  };

  // the seat you're given on join is provisional; your pick decides the side
  const alliance = mySlot?.characterId ? mySlot.alliance : null;
  const secondsLeft = lobby?.secondsLeft ?? LOBBY_SECONDS;
  const startingNow = !!lobby && lobby.secondsLeft <= 0.05;
  const [seatsOpen, setSeatsOpen] = useState(false);
  const inProgress = !!lobby?.inProgress;
  const freeSeats = lobby ? lobby.slots.filter((s) => s.isBot).length : 0;

  return (
    <main className="lobby-main min-h-[100svh] flex flex-col bg-pop-paper text-nb relative">
      <div className="absolute inset-0 halftone opacity-30 pointer-events-none" aria-hidden="true" />
      <header className="relative gutter pt-[max(10px,env(safe-area-inset-top))] sm:pt-[max(16px,env(safe-area-inset-top))] pb-2 sm:pb-4 flex items-center gap-3 sm:gap-4">
        <button type="button" onClick={back} className="min-h-[44px] px-4 rounded-full border-[3px] border-nb bg-pop-paper font-semibold nb-press shadow-nb-sm">
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-tag uppercase tracking-[0.2em] leading-none text-nb/60">{room?.solo === false ? (lobby?.isPrivate ? 'Private room' : 'Online match') : 'Solo vs bots'}</p>
          <h1 className="font-brut uppercase text-lg sm:text-3xl leading-tight">
            {alliance ? (
              <>
                You're with{' '}
                <span className="inline-block rounded-md border-[3px] border-nb px-2 -rotate-1 shadow-nb-sm" style={{ background: ALLIANCES[alliance].css, color: alliance === 'jan_ekta' ? '#fff' : '#111' }}>
                  {ALLIANCES[alliance].name}
                </span>
              </>
            ) : inProgress ? (
              'Match in progress. Take over a bot.'
            ) : lobby ? (
              'Pick any neta. Your side follows.'
            ) : (
              'Finding you a seat…'
            )}
          </h1>
        </div>
      </header>

      {lobby?.isPrivate && lobby.code && (
        <RoomCodeCard code={lobby.code} isHost={lobby.hostId === me} canStart={!!mySlot?.characterId} onStart={() => room?.send('start_now', {})} />
      )}

      {notice && (
        <div className="relative gutter mx-4 mb-3 rounded-lg bg-nb text-pop-paper px-4 py-2 text-sm flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1">{notice}</p>
          {HAS_SERVER_CONFIG && notice.includes('Tap Retry') && (
            <button
              type="button"
              onClick={() => {
                // leave the solo fallback and come back, so the lobby tries the server again
                matchStore.getState().setNotice(null);
                matchStore.getState().setMode('online');
                navigationStore.getState().goTo({ name: 'landing' });
                setTimeout(() => navigationStore.getState().goTo({ name: 'lobby' }), 50);
              }}
              className="shrink-0 rounded-lg border-2 border-pop-paper bg-pop-yellow text-nb px-3 py-1 font-brut uppercase text-xs nb-press"
            >
              Retry online
            </button>
          )}
        </div>
      )}

      <div className="relative gutter flex-1 pb-[max(24px,env(safe-area-inset-bottom))] max-lg:pb-40 grid gap-4 sm:gap-6 lg:grid-cols-[1fr_auto] lg:items-start max-w-7xl w-full mx-auto">
        <section aria-labelledby="pick-title" className="min-w-0">
          <h2 id="pick-title" className="font-tag uppercase tracking-widest text-sm sm:text-lg leading-none mb-2 sm:mb-3">
            {inProgress
              ? 'Pick any neta nobody else is playing. The bot hands over straight away.'
              : mySlot?.characterId
                ? 'You can still switch, even across alliances'
                : 'All eight are open · bots take whoever is left'}
          </h2>
          {lobby ? (
            <CharacterGrid slots={lobby.slots} me={me} onPick={pick} inProgress={inProgress} />
          ) : (
            <div className="rounded-xl border-[3px] border-nb bg-pop-paper p-5 shadow-nb-sm">
              <p className="font-brut uppercase text-lg">{room ? 'Joining…' : mode === 'online' ? 'Connecting to the server…' : 'Starting…'}</p>
              {!room && mode === 'online' && HAS_SERVER_CONFIG && (
                <p className="mt-1 text-sm text-nb/75">Free servers sleep when nobody is playing. If this is the first game in a while it can take up to a minute to wake up.</p>
              )}
              <div className="mt-3 h-3 rounded-full border-2 border-nb bg-white overflow-hidden">
                <div className="h-full w-1/3 bg-pop-yellow animate-[slide_1.1s_ease-in-out_infinite]" />
              </div>
            </div>
          )}
          {error && <p className="mt-3 font-semibold text-[#B3261E]">{error}</p>}
        </section>

        <aside className="max-lg:hidden flex flex-col items-center gap-4 lg:w-[340px]">
          {inProgress && lobby ? (
            <div className="w-full nb-card bg-pop-yellow p-4 text-center">
              <p className="font-tag uppercase tracking-widest text-sm leading-none">Match in progress</p>
              <p className="font-brut uppercase text-2xl leading-tight mt-1">Round {Math.max(1, lobby.round)}</p>
              <p className="font-sfx text-4xl tracking-wider leading-none tabular mt-1">
                {lobby.score.rashtra_morcha} – {lobby.score.jan_ekta}
              </p>
              <p className="text-sm mt-2 font-semibold">{freeSeats > 0 ? `${freeSeats} bot${freeSeats === 1 ? '' : 's'} can be taken over` : 'Every seat is taken by a person right now'}</p>
            </div>
          ) : (
            <>
              <CountdownRing seconds={secondsLeft} total={lobby?.total ?? LOBBY_SECONDS}>
                <div className="text-center">
                  <p className="font-display text-5xl leading-none tabular">{Math.ceil(secondsLeft)}</p>
                  <p className="font-tag uppercase tracking-widest text-sm leading-none mt-2">{startingNow ? 'Starting' : 'Bots fill in'}</p>
                </div>
              </CountdownRing>
              <button
                type="button"
                onClick={ready}
                disabled={!mySlot?.characterId || mySlot.ready}
                className="w-full min-h-[60px] rounded-2xl border-[3px] border-nb bg-pop-yellow font-sfx text-3xl tracking-wide pt-1 shadow-nb nb-press disabled:opacity-40 disabled:shadow-none disabled:translate-x-1 disabled:translate-y-1"
              >
                {mySlot?.ready ? 'Ready' : mySlot?.characterId ? "I'm ready" : 'Pick a neta first'}
              </button>
              <p className="text-sm text-nb/70 text-center">Empty seats are filled by bots when the ring runs out, so a match always starts.</p>
            </>
          )}
          <div className="w-full">{lobby && <SlotList slots={lobby.slots} me={me} inProgress={inProgress} />}</div>
        </aside>
      </div>

      {/* phones: countdown, Ready and the seat list live in a bar at the bottom, so the whole lobby fits one screen */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-nb bg-pop-paper px-3 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] flex items-center gap-3">
        {inProgress && lobby ? (
          <div className="flex-1 min-w-0 rounded-xl border-[3px] border-nb bg-pop-yellow px-3 py-1.5 leading-tight">
            <p className="font-tag uppercase tracking-widest text-xs leading-none">Match in progress</p>
            <p className="font-brut uppercase text-sm truncate">
              Round {Math.max(1, lobby.round)} · {lobby.score.rashtra_morcha}–{lobby.score.jan_ekta} · {freeSeats} bot{freeSeats === 1 ? '' : 's'} open
            </p>
          </div>
        ) : (
          <>
            <CountdownRing seconds={secondsLeft} total={lobby?.total ?? LOBBY_SECONDS} className="w-14 h-14">
              <p className="font-display text-xl leading-none tabular">{Math.ceil(secondsLeft)}</p>
            </CountdownRing>
            <button
              type="button"
              onClick={ready}
              disabled={!mySlot?.characterId || mySlot.ready}
              className="flex-1 min-h-[52px] rounded-xl border-[3px] border-nb bg-pop-yellow font-sfx text-2xl tracking-wide pt-1 shadow-nb-sm nb-press disabled:opacity-40 disabled:shadow-none"
            >
              {mySlot?.ready ? 'Ready' : mySlot?.characterId ? "I'm ready" : 'Pick a neta'}
            </button>
          </>
        )}
        <button type="button" onClick={() => setSeatsOpen(true)} className="min-h-[52px] rounded-xl border-[3px] border-nb bg-pop-paper px-3 font-brut uppercase text-xs shadow-nb-sm nb-press">
          Seats
        </button>
      </div>

      {seatsOpen && lobby && (
        <div className="lg:hidden fixed inset-0 z-40 bg-nb/60 grid place-items-end" role="dialog" aria-label="Seats" onClick={() => setSeatsOpen(false)}>
          <div className="w-full max-h-[80svh] overflow-y-auto rounded-t-2xl border-[3px] border-nb bg-pop-paper p-4 pb-[max(16px,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-brut uppercase text-lg">Who is playing</p>
              <button type="button" onClick={() => setSeatsOpen(false)} className="w-10 h-10 rounded-full border-[3px] border-nb bg-pop-yellow nb-press" aria-label="Close seats">
                ✕
              </button>
            </div>
            <SlotList slots={lobby.slots} me={me} inProgress={inProgress} />
          </div>
        </div>
      )}
    </main>
  );
}
