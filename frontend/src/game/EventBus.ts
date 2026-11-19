// The one channel between React and Phaser. Neither side reaches into the
// other's internals; UI scenes and React never touch the room directly.
import type { AllianceId, MatchEnded, PingType, RoundEnded } from '@netanchal/shared';

export type GameEvents = {
  'ui:exit-requested': void;
  'ui:ping': { type: PingType; x: number; y: number };
  'game:round-ended': RoundEnded;
  'game:match-ended': MatchEnded;
  'game:hp-changed': { playerId: string; hp: number; maxHp: number };
  'game:alliance': { alliance: AllianceId };
};

type Handler<T> = (payload: T) => void;

class TypedEventEmitter<E extends Record<string, unknown>> {
  private handlers = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(type: K, fn: Handler<E[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => this.off(type, fn);
  }

  off<K extends keyof E>(type: K, fn: Handler<E[K]>) {
    this.handlers.get(type)?.delete(fn as Handler<never>);
  }

  emit<K extends keyof E>(type: K, ...payload: E[K] extends void ? [] : [E[K]]) {
    for (const fn of [...(this.handlers.get(type) ?? [])]) (fn as Handler<E[K]>)(payload[0] as E[K]);
  }

  clear() {
    this.handlers.clear();
  }
}

export const eventBus = new TypedEventEmitter<GameEvents>();
