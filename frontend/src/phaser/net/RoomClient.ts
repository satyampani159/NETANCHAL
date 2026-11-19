// One interface over two transports: a Socket.io connection to the authoritative
// server (online) and an in-browser Web Worker running the same MatchSim (solo).
// Only MatchScene, the lobby and the game screen talk to it.
import type { ClientMessages, Difficulty, LobbyView, ServerMessages, Snapshot } from '@netanchal/shared';
import type { Socket } from 'socket.io-client';

type Listener<K extends keyof ServerMessages> = (msg: ServerMessages[K]) => void;

/** connected: normal. reconnecting: the connection dropped and is being re-established. closed: gone for good. */
export type RoomStatus = 'connected' | 'reconnecting' | 'closed';

export interface GameRoom {
  readonly solo: boolean;
  send<K extends keyof ClientMessages>(type: K, msg: ClientMessages[K]): void;
  on<K extends keyof ServerMessages>(type: K, fn: Listener<K>): () => void;
  /** latest values, for screens that mount after the message arrived */
  readonly latest: { welcome?: ServerMessages['welcome']; lobby?: LobbyView; snapshot?: Snapshot };
  readonly status: RoomStatus;
  onStatus(fn: (status: RoomStatus) => void): () => void;
  leave(): void;
}

abstract class BaseRoom implements GameRoom {
  abstract readonly solo: boolean;
  latest: GameRoom['latest'] = {};
  status: RoomStatus = 'connected';
  private listeners = new Map<string, Set<(m: unknown) => void>>();
  private statusListeners = new Set<(s: RoomStatus) => void>();

  abstract send<K extends keyof ClientMessages>(type: K, msg: ClientMessages[K]): void;
  abstract leave(): void;

  on<K extends keyof ServerMessages>(type: K, fn: Listener<K>) {
    let set = this.listeners.get(type);
    if (!set) this.listeners.set(type, (set = new Set()));
    set.add(fn as (m: unknown) => void);
    return () => void set!.delete(fn as (m: unknown) => void);
  }

  onStatus(fn: (s: RoomStatus) => void) {
    this.statusListeners.add(fn);
    return () => void this.statusListeners.delete(fn);
  }

  protected setStatus(status: RoomStatus) {
    if (this.status === status) return;
    this.status = status;
    for (const fn of [...this.statusListeners]) fn(status);
  }

  protected dispatch(type: string, msg: unknown) {
    if (type === 'welcome') this.latest.welcome = msg as ServerMessages['welcome'];
    if (type === 'lobby') this.latest.lobby = msg as LobbyView;
    if (type === 'snapshot' || type === 'match_start') this.latest.snapshot = msg as Snapshot;
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn(msg);
  }
}

// ---------------------------------------------------------------------------
// Solo: the same simulation, in a Web Worker
// ---------------------------------------------------------------------------

class SoloRoom extends BaseRoom {
  readonly solo = true;
  private worker: Worker;

  constructor(name: string, difficulty: Difficulty) {
    super();
    this.worker = new Worker(new URL('./soloWorker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent<{ type: string; msg: unknown }>) => this.dispatch(e.data.type, e.data.msg);
    // ?round=30 shortens solo rounds (handy for testing the full match flow)
    const roundSeconds = Number(new URLSearchParams(location.search).get('round')) || undefined;
    this.worker.postMessage({ kind: 'init', name, difficulty, roundSeconds });
  }

  send<K extends keyof ClientMessages>(type: K, msg: ClientMessages[K]) {
    this.worker.postMessage({ kind: 'msg', type, msg });
  }

  leave() {
    this.worker.terminate();
  }
}

export async function joinSolo(name: string, difficulty: Difficulty): Promise<GameRoom> {
  return new SoloRoom(name, difficulty);
}

// ---------------------------------------------------------------------------
// Online: Socket.io to the authoritative server
// ---------------------------------------------------------------------------

interface JoinAck {
  ok: boolean;
  error?: string;
  roomId?: string;
  /** 'viewer': joined a running match and has not picked a character yet */
  role?: 'player' | 'viewer';
}

/** Free hosts put idle servers to sleep, so a configured server gets long enough to cold-start. */
export const CONNECT_TIMEOUT_MS = 75_000;
/** A guessed address (the page's own origin) that does not answer is not worth waiting for. */
export const FALLBACK_TIMEOUT_MS = 8_000;

const CLIENT_ID_KEY = 'netanchal-client-id';
let memoryClientId: string | null = null;

/** A stable id for this browser, so a reload or a dropped connection can reclaim the same seat. */
export function getClientId(): string {
  try {
    const saved = localStorage.getItem(CLIENT_ID_KEY);
    if (saved && /^[A-Za-z0-9_-]{8,64}$/.test(saved)) return saved;
  } catch {
    /* storage blocked: fall through to the in-memory id */
  }
  if (!memoryClientId) {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    memoryClientId = Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 32);
  }
  try {
    localStorage.setItem(CLIENT_ID_KEY, memoryClientId);
  } catch {
    /* ignore */
  }
  return memoryClientId;
}

/** `?server=` for testing, then `VITE_SERVER_URL`, then the page's own origin. */
export function serverConfig(): { url: string; configured: boolean } {
  const fromQuery = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('server') : null;
  const configured = fromQuery || (import.meta.env.VITE_SERVER_URL as string | undefined) || '';
  const raw = configured || (typeof location !== 'undefined' ? location.origin : '');
  // socket.io-client wants http(s); accept ws(s) in the setting too
  return { url: raw.replace(/^ws/i, 'http').replace(/\/+$/, ''), configured: !!configured };
}

/** Fire-and-forget request that wakes a sleeping server while the player is still reading the page. */
export function wakeServer(serverUrl: string) {
  fetch(`${serverUrl}/health`, { cache: 'no-store', mode: 'cors' }).catch(() => {});
}

class SocketRoom extends BaseRoom {
  readonly solo = false;
  private everJoined = false;
  private closed = false;

  constructor(
    private socket: Socket,
    private clientId: string,
    private name: string,
    private difficulty: Difficulty,
  ) {
    super();
    // every game message from the server goes straight to the listeners
    socket.onAny((type: string, msg: unknown) => this.dispatch(type, msg));
    socket.on('disconnect', (reason) => {
      if (this.closed) return;
      // "io server disconnect" means the server kicked us: reconnecting would not help
      if (reason === 'io server disconnect') this.shutdown();
      else this.setStatus('reconnecting');
    });
    socket.io.on('reconnect_failed', () => this.shutdown('Lost connection to the server.'));
  }

  /** resolves once the server has put us in a room; rejects if it refuses or does not answer in time */
  connect(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.closed = true;
        this.socket.close();
        reject(new Error(`Server did not answer in ${Math.round(timeoutMs / 1000)} seconds`));
      }, timeoutMs);

      this.socket.on('connect', () => {
        this.join().then((ack) => {
          if (!this.everJoined) {
            clearTimeout(timer);
            if (!ack.ok) {
              this.closed = true;
              this.socket.close();
              reject(new Error(ack.error ?? 'The server refused the connection'));
              return;
            }
            this.everJoined = true;
            resolve();
            return;
          }
          // a reconnect: we only got our seat back if the server says we are a player again
          if (ack.ok && ack.role === 'player') this.setStatus('connected');
          else this.shutdown('Your seat was given to someone else while you were offline.');
        });
      });
      this.socket.on('connect_error', () => {
        /* socket.io keeps retrying; the timeout above decides when to give up */
      });
    });
  }

  private join(): Promise<JoinAck> {
    return new Promise((resolve) => {
      this.socket.timeout(10_000).emit('join', { clientId: this.clientId, name: this.name, difficulty: this.difficulty }, (err: Error | null, ack: JoinAck) => {
        resolve(err ? { ok: false, error: 'The server did not answer the join request.' } : ack);
      });
    });
  }

  /** inputs are sent the instant they change; anything sent while offline is dropped, not queued */
  send<K extends keyof ClientMessages>(type: K, msg: ClientMessages[K]) {
    if (this.closed || !this.socket.connected) return;
    this.socket.emit(type, msg);
  }

  private shutdown(message?: string) {
    if (this.closed) return;
    this.closed = true;
    if (message) this.dispatch('error', { message });
    this.socket.close();
    this.setStatus('closed');
  }

  leave() {
    if (this.closed) return;
    this.closed = true;
    // tell the server first so the seat is freed straight away for the next player
    if (this.socket.connected) this.socket.emit('leave');
    setTimeout(() => this.socket.close(), 150);
    this.setStatus('closed');
  }
}

export async function joinOnline(serverUrl: string, name: string, difficulty: Difficulty, timeoutMs = CONNECT_TIMEOUT_MS): Promise<GameRoom> {
  // loaded lazily so solo players never download the network client
  const { io } = await import('socket.io-client');
  const socket = io(serverUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 25,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    timeout: 10_000,
  });
  const room = new SocketRoom(socket, getClientId(), name, difficulty);
  await room.connect(timeoutMs);
  return room;
}
