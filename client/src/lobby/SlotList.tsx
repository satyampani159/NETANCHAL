import { ALLIANCES, ALLIANCE_IDS, CHARACTERS, type SlotView, styleOf } from '@netanchal/shared';
import { Portrait } from '../ui/Portrait';
import { StyleIcon } from '../ui/StyleBadge';

function BotIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-label="Bot">
      <path d="M11 2h2v3h4a3 3 0 013 3v8a3 3 0 01-3 3H7a3 3 0 01-3-3V8a3 3 0 013-3h4zM9 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM8 21h8v1H8z" fill="currentColor" />
    </svg>
  );
}

export function SlotList({ slots, me, inProgress = false }: { slots: SlotView[]; me: string | null; inProgress?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
      {ALLIANCE_IDS.map((a) => (
        <div key={a}>
          <p className="font-tag uppercase tracking-widest leading-none pt-1 mb-2" style={{ color: ALLIANCES[a].accent }}>
            {ALLIANCES[a].name}
          </p>
          <ul className="grid gap-1.5">
            {slots
              .filter((s) => s.alliance === a)
              .map((s, i) => {
                const c = s.characterId ? CHARACTERS[s.characterId] : null;
                return (
                  <li key={s.slotId} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${s.playerId === me ? 'bg-ink text-chalk' : 'bg-white/70'}`}>
                    {c ? (
                      <Portrait id={c.id} bg={a === 'rashtra_morcha' ? '#F28C28' : '#D6F0E4'} className="w-8 h-8" />
                    ) : (
                      <span className="w-8 h-8 rounded-full border-2 border-dashed border-current opacity-40 grid place-items-center text-xs">{i + 1}</span>
                    )}
                    <span className="flex-1 min-w-0 leading-tight">
                      <span className="block truncate font-semibold">{c ? c.name : 'Waiting for a player…'}</span>
                      {s.playerId && s.name && c && s.name !== c.name && (
                        <span className="block truncate text-xs opacity-70">
                          {s.playerId === me ? 'You' : s.reserved ? `${s.name} · reconnecting` : s.name}
                        </span>
                      )}
                    </span>
                    {c && <StyleIcon fightStyle={styleOf(c)} className="w-4 h-4 opacity-70" />}
                    {s.isBot && s.characterId && <BotIcon />}
                    {inProgress && s.isBot && s.characterId && <span className="font-tag uppercase text-sm leading-none pt-0.5">Open</span>}
                    {s.ready && <span className="font-tag uppercase text-sm leading-none pt-0.5">Ready</span>}
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}
