'use strict';

/**
 * Netanchal: authoritative real-time multiplayer server (Express + Socket.io).
 *
 * - The server owns the whole match. Clients send intent (movement vector, attack,
 *   special, ping) and never positions, damage or captures.
 * - Each room runs one MatchSim (see sim.bundle.js, built from ../shared) on a fixed
 *   timestep and broadcasts a snapshot to the room at a fixed rate.
 * - People can join a match that is already running: they see the lobby and may take
 *   over any character that no other human is playing.
 *
 * Environment:
 *   PORT              port to listen on (default 3000)
 *   ALLOWED_ORIGINS   comma-separated browser origins allowed to connect, e.g.
 *                     "https://netanchal.vercel.app,https://*.vercel.app".
 *                     Unset = allow every origin (fine for testing, set it in production).
 *   TICK_RATE         simulation ticks per second (default 30, 10-60)
 *   SNAPSHOT_RATE     snapshots per second sent to clients (default = TICK_RATE)
 *   MAX_ROOMS         maximum concurrent rooms (default 50)
 *   MAX_CONN_PER_IP   maximum simultaneous sockets from one address (default 12)
 *   TRUST_PROXY       set to 1 when behind a proxy (Render, Railway) to read the client address
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { MatchSim, CHARACTERS, DIFFICULTY } = require('./sim.bundle.js');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PORT) || 3000;
const TICK_HZ = clampInt(process.env.TICK_RATE, 10, 60, 30);
const SNAPSHOT_HZ = clampInt(process.env.SNAPSHOT_RATE, 5, TICK_HZ, TICK_HZ);
const DT = 1 / TICK_HZ;
const SNAPSHOT_EVERY = Math.max(1, Math.round(TICK_HZ / SNAPSHOT_HZ));
const MAX_CATCH_UP_STEPS = 3;
const MAX_ROOMS = clampInt(process.env.MAX_ROOMS, 1, 1000, 50);
const MAX_CONN_PER_IP = clampInt(process.env.MAX_CONN_PER_IP, 1, 1000, 12);
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

/** how long a dropped player's seat is held, and how long an empty room lives (ms) */
const RECONNECT_GRACE_S = 30;
const EMPTY_ROOM_TTL_MS = 40_000;
const FINISHED_ROOM_TTL_MS = 20_000;

const ENABLE_ALL_ORIGINS = !process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS.trim() === '*';
const ORIGIN_PATTERNS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s && s !== '*')
  .map(originToRegExp);

function clampInt(value, min, max, fallback) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/** "https://*.vercel.app" -> /^https:\/\/[a-z0-9.-]+\.vercel\.app$/i ; "*" matches one or more host characters */
function originToRegExp(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9.-]+');
  return new RegExp(`^${escaped}$`, 'i');
}

/** requests without an Origin header (curl, health checks, other servers) are not browsers and are let through */
function originAllowed(origin) {
  if (!origin) return true;
  if (ENABLE_ALL_ORIGINS) return true;
  return ORIGIN_PATTERNS.some((re) => re.test(origin));
}

const corsOptions = {
  origin: (origin, callback) => callback(null, originAllowed(origin)),
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: false,
  maxAge: 86400,
};

// ---------------------------------------------------------------------------
// Input validation and rate limiting (server-side: never trust the client)
// ---------------------------------------------------------------------------

const CLIENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const PING_TYPES = new Set(['attack', 'defend', 'help', 'enemy-hidden']);
const DIFFICULTIES = new Set(Object.keys(DIFFICULTY));

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function cleanName(value) {
  if (typeof value !== 'string') return 'Neta';
  const name = value.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 20);
  return name || 'Neta';
}

function parseJoin(payload) {
  if (!isObject(payload)) return null;
  if (typeof payload.clientId !== 'string' || !CLIENT_ID_RE.test(payload.clientId)) return null;
  const difficulty = DIFFICULTIES.has(payload.difficulty) ? payload.difficulty : 'normal';
  return { clientId: payload.clientId, name: cleanName(payload.name), difficulty };
}

function parseInput(payload) {
  if (!isObject(payload)) return null;
  if (!isFiniteNumber(payload.mx) || !isFiniteNumber(payload.my)) return null;
  const input = {
    mx: clamp(payload.mx, -1, 1),
    my: clamp(payload.my, -1, 1),
    attack: payload.attack === true,
    special: payload.special === true,
  };
  if (isFiniteNumber(payload.ax) && isFiniteNumber(payload.ay)) {
    input.ax = clamp(payload.ax, -5000, 5000);
    input.ay = clamp(payload.ay, -5000, 5000);
  }
  return input;
}

function parsePick(payload) {
  if (!isObject(payload) || typeof payload.characterId !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(CHARACTERS, payload.characterId) ? { characterId: payload.characterId } : null;
}

function parsePing(payload) {
  if (!isObject(payload) || !PING_TYPES.has(payload.type)) return null;
  // coordinates are ignored: the room uses the sender's position from the simulation
  return { type: payload.type, x: 0, y: 0 };
}

/** events per second (steady rate) and burst size, per socket */
const LIMITS = {
  join: { rate: 2, burst: 4 },
  input: { rate: 90, burst: 120 },
  pick: { rate: 5, burst: 8 },
  ready: { rate: 2, burst: 4 },
  ping: { rate: 2, burst: 4 },
  leave: { rate: 2, burst: 4 },
};
const VIOLATION_WINDOW_MS = 10_000;
const VIOLATIONS_BEFORE_KICK = 300;

/** token bucket; a socket that keeps blowing through its limits is disconnected */
function allow(socket, event) {
  const limit = LIMITS[event];
  const now = Date.now();
  const buckets = socket.data.buckets;
  const bucket = buckets[event] || (buckets[event] = { tokens: limit.burst, at: now });
  bucket.tokens = Math.min(limit.burst, bucket.tokens + ((now - bucket.at) / 1000) * limit.rate);
  bucket.at = now;
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  if (now - socket.data.violationWindow > VIOLATION_WINDOW_MS) {
    socket.data.violationWindow = now;
    socket.data.violations = 0;
  }
  if (++socket.data.violations > VIOLATIONS_BEFORE_KICK) {
    log('kicking abusive socket', socket.id);
    socket.disconnect(true);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

/** @type {Map<string, Room>} */
const rooms = new Map();
/** clientId -> roomId, so a reconnecting or reloaded player finds their seat again */
const clientRoom = new Map();
let nextRoomNumber = 1;

class Room {
  constructor(io, difficulty) {
    this.io = io;
    this.id = `room-${nextRoomNumber++}`;
    /** clientId -> socket for everyone currently connected */
    this.sockets = new Map();
    this.sim = new MatchSim((to, type, msg) => this.send(to, type, msg), { solo: false, difficulty });
    this.lastTick = process.hrtime.bigint();
    this.accumulator = 0;
    this.ticks = 0;
    this.emptySince = null;
    this.finishedAt = null;
    this.timer = setInterval(() => this.tick(), 1000 / TICK_HZ);
  }

  /** the simulation addresses people by clientId; '*' means everyone in the room */
  send(to, type, msg) {
    if (to === '*') this.io.to(this.id).emit(type, msg);
    else this.sockets.get(to)?.emit(type, msg);
  }

  attach(socket, clientId) {
    const previous = this.sockets.get(clientId);
    if (previous && previous !== socket) {
      // the same player opened a second tab: the newest connection wins
      previous.emit('error', { message: 'You joined from another tab or device.' });
      previous.leave(this.id);
      previous.data.roomId = null;
      previous.data.clientId = null;
    }
    this.sockets.set(clientId, socket);
    socket.data.clientId = clientId;
    socket.data.roomId = this.id;
    socket.join(this.id);
    clientRoom.set(clientId, this.id);
    this.emptySince = null;
  }

  /** the connection dropped: a bot plays on, and the seat is held for a while */
  detach(socket) {
    const clientId = socket.data.clientId;
    if (!clientId || this.sockets.get(clientId) !== socket) return;
    this.sockets.delete(clientId);
    this.sim.removePlayer(clientId, RECONNECT_GRACE_S);
  }

  /** deliberate leave: the seat is freed at once for someone else */
  leave(socket) {
    const clientId = socket.data.clientId;
    if (!clientId || this.sockets.get(clientId) !== socket) return;
    this.sockets.delete(clientId);
    this.sim.removePlayer(clientId, 0);
    clientRoom.delete(clientId);
    socket.leave(this.id);
    socket.data.roomId = null;
  }

  /** fixed-timestep loop: the simulation always advances in equal steps, however late the timer fires */
  tick() {
    try {
      const now = process.hrtime.bigint();
      this.accumulator += Number(now - this.lastTick) / 1e9;
      this.lastTick = now;
      let steps = 0;
      while (this.accumulator >= DT && steps < MAX_CATCH_UP_STEPS) {
        this.sim.update(DT);
        this.accumulator -= DT;
        steps++;
        this.ticks++;
        const phase = this.sim.phase;
        // volatile: if a client's connection is backed up it skips this frame instead of queueing stale ones
        if ((phase === 'playing' || phase === 'round_over') && this.ticks % SNAPSHOT_EVERY === 0) {
          this.io.to(this.id).volatile.emit('snapshot', this.sim.snapshot());
        }
      }
      // after a long stall, drop the backlog instead of spiralling
      if (this.accumulator > DT * MAX_CATCH_UP_STEPS) this.accumulator = 0;

      const now2 = Date.now();
      if (this.sim.phase === 'match_over') this.finishedAt = this.finishedAt || now2;
      if (this.sim.peopleCount === 0) this.emptySince = this.emptySince || now2;
      else this.emptySince = null;
      const emptyTooLong = this.emptySince !== null && now2 - this.emptySince > EMPTY_ROOM_TTL_MS;
      const finishedTooLong = this.finishedAt !== null && now2 - this.finishedAt > FINISHED_ROOM_TTL_MS;
      if (emptyTooLong || finishedTooLong) this.destroy('idle');
    } catch (err) {
      console.error(`[${this.id}] simulation error`, err);
      this.io.to(this.id).emit('error', { message: 'The match crashed. Please rejoin.' });
      this.destroy('error');
    }
  }

  destroy(reason) {
    clearInterval(this.timer);
    rooms.delete(this.id);
    for (const [clientId, roomId] of clientRoom) if (roomId === this.id) clientRoom.delete(clientId);
    for (const socket of this.sockets.values()) {
      socket.data.roomId = null;
      socket.leave(this.id);
    }
    this.sockets.clear();
    log(`room ${this.id} closed (${reason}); ${rooms.size} room(s) left`);
  }
}

/**
 * Picks a room for a new arrival:
 *  1. a lobby that is already filling (most humans first), so matches start with people in them;
 *  2. otherwise a running match that has a character no human is playing;
 *  3. otherwise a fresh room.
 */
function findRoom(io, difficulty) {
  let best = null;
  let bestScore = -1;
  for (const room of rooms.values()) {
    const sim = room.sim;
    if (!sim.joinable() || sim.openSeats() === 0) continue;
    const score = sim.phase === 'lobby' ? 1000 + sim.humanCount : sim.openSeats();
    if (score > bestScore) {
      best = room;
      bestScore = score;
    }
  }
  if (best) return best;
  if (rooms.size >= MAX_ROOMS) return null;
  const room = new Room(io, difficulty);
  rooms.set(room.id, room);
  log(`room ${room.id} created; ${rooms.size} room(s)`);
  return room;
}

// ---------------------------------------------------------------------------
// HTTP + Socket.io
// ---------------------------------------------------------------------------

const app = express();
app.disable('x-powered-by');
if (TRUST_PROXY) app.set('trust proxy', 1);
app.use(cors(corsOptions));

app.get('/health', (_req, res) => {
  res.set('Cache-Control', 'no-store').json({ ok: true, game: 'netanchal' });
});

app.get('/', (_req, res) => {
  let players = 0;
  for (const room of rooms.values()) players += room.sockets.size;
  res.set('Cache-Control', 'no-store').json({
    game: 'netanchal',
    ok: true,
    rooms: rooms.size,
    players,
    tickRate: TICK_HZ,
    snapshotRate: SNAPSHOT_HZ,
    uptimeSeconds: Math.round(process.uptime()),
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
  // browsers do not apply CORS to WebSocket upgrades, so the origin is checked here as well
  allowRequest: (req, callback) => callback(null, originAllowed(req.headers.origin)),
  maxHttpBufferSize: 4 * 1024,
  perMessageDeflate: false,
  pingInterval: 10_000,
  pingTimeout: 15_000,
  transports: ['websocket', 'polling'],
});

const connectionsByAddress = new Map();

function addressOf(socket) {
  if (TRUST_PROXY) {
    const forwarded = String(socket.handshake.headers['x-forwarded-for'] || '').split(',');
    const last = forwarded[forwarded.length - 1].trim();
    if (last) return last;
  }
  return socket.handshake.address;
}

io.on('connection', (socket) => {
  const address = addressOf(socket);
  const open = (connectionsByAddress.get(address) || 0) + 1;
  if (open > MAX_CONN_PER_IP) {
    socket.emit('error', { message: 'Too many connections from your address.' });
    socket.disconnect(true);
    return;
  }
  connectionsByAddress.set(address, open);

  socket.data = { clientId: null, roomId: null, buckets: {}, violations: 0, violationWindow: Date.now() };
  const room = () => rooms.get(socket.data.roomId) || null;

  socket.on('join', (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    if (!allow(socket, 'join')) return reply({ ok: false, error: 'Slow down.' });
    const request = parseJoin(payload);
    if (!request) return reply({ ok: false, error: 'Bad join request.' });

    // a reload or reconnect finds the player's existing room; everyone else is matchmade
    const existing = rooms.get(clientRoom.get(request.clientId));
    // (a finished match is never rejoined: whoever reloads on the results screen gets a fresh game)
    const resumable = existing && existing.sim.phase !== 'match_over' && existing.sim.hasPlayer(request.clientId);
    const target = resumable ? existing : findRoom(io, request.difficulty);
    if (!target) return reply({ ok: false, error: 'The server is full. Try again in a minute.' });

    if (socket.data.roomId && socket.data.roomId !== target.id) room()?.leave(socket);
    // bind the socket before the simulation sends its first messages to this player
    target.attach(socket, request.clientId);
    const seat = target.sim.addPlayer(request.clientId, request.name);
    if (seat === null) {
      target.sockets.delete(request.clientId);
      socket.leave(target.id);
      socket.data.roomId = null;
      clientRoom.delete(request.clientId);
      return reply({ ok: false, error: 'That match cannot be joined right now.' });
    }
    reply({ ok: true, roomId: target.id, playerId: request.clientId, role: seat === 'viewer' ? 'viewer' : 'player' });
  });

  socket.on('pick', (payload) => {
    if (!allow(socket, 'pick')) return;
    const pick = parsePick(payload);
    const r = room();
    if (!pick || !r) return;
    r.sim.handle(socket.data.clientId, 'pick', pick);
  });

  socket.on('ready', () => {
    if (!allow(socket, 'ready')) return;
    room()?.sim.handle(socket.data.clientId, 'ready', {});
  });

  socket.on('input', (payload) => {
    if (!allow(socket, 'input')) return;
    const input = parseInput(payload);
    const r = room();
    if (!input || !r) return;
    r.sim.handle(socket.data.clientId, 'input', input);
  });

  socket.on('ping', (payload) => {
    if (!allow(socket, 'ping')) return;
    const ping = parsePing(payload);
    const r = room();
    if (!ping || !r) return;
    r.sim.handle(socket.data.clientId, 'ping', ping);
  });

  socket.on('leave', () => {
    if (!allow(socket, 'leave')) return;
    room()?.leave(socket);
  });

  socket.on('disconnect', () => {
    room()?.detach(socket);
    const left = (connectionsByAddress.get(address) || 1) - 1;
    if (left <= 0) connectionsByAddress.delete(address);
    else connectionsByAddress.set(address, left);
  });
});

// ---------------------------------------------------------------------------
// Start and shut down
// ---------------------------------------------------------------------------

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

server.listen(PORT, '0.0.0.0', () => {
  log(`Netanchal server listening on port ${PORT} (tick ${TICK_HZ} Hz, snapshots ${SNAPSHOT_HZ} Hz)`);
  if (ENABLE_ALL_ORIGINS) log('ALLOWED_ORIGINS is not set: accepting connections from every origin. Set it in production.');
  else log(`Allowed origins: ${process.env.ALLOWED_ORIGINS}`);
});

function shutdown(signal) {
  log(`${signal} received, shutting down`);
  io.emit('error', { message: 'The server is restarting. Please rejoin in a moment.' });
  for (const room of rooms.values()) clearInterval(room.timer);
  io.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => console.error('unhandled rejection', err));
