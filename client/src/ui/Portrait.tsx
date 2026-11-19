import { useMemo } from 'react';
import type { CharacterId } from '@netanchal/shared';
import { CHARACTER_ART } from '../assets/characters/art';
import { portraitDataUri } from '../assets/characters/portraits';

/**
 * `full` shows the whole character (cards, sheets, hero); `token` is the round
 * badge used in lists. Small circles with a `bg` default to the token.
 */
export function Portrait({
  id,
  bg,
  ring,
  className,
  alt,
  variant,
}: {
  id: CharacterId;
  bg?: string;
  ring?: string;
  className?: string;
  alt?: string;
  variant?: 'full' | 'token';
}) {
  const art = CHARACTER_ART[id];
  const kind = variant ?? (bg ? 'token' : 'full');
  const src = useMemo(() => (art ? art[kind] : portraitDataUri(id, { bg, ring })), [art, kind, id, bg, ring]);
  return <img src={src} alt={alt ?? ''} className={`${art && kind === 'full' ? 'object-contain' : ''} ${className ?? ''}`} draggable={false} />;
}
