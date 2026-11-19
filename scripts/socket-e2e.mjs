// End-to-end test of the Socket.io server: starts its own copy of server/server.js and plays
// through two players, a mid-match joiner, input abuse, bad payloads, a reconnect, and CORS.
// Usage: npm run e2e:socket
import { spawn } from 'node:child_process';
import http from 'node:http';
import { io } from 'socket.io-client';

const PORT = 3199;
const BASE = `http://localhost:${PORT}`;
const ALLOWED = 'https://netanchal.vercel.app,https://*.vercel.app';

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- start the server under test ----
const server = spawn('node', ['server.js'], {
  cwd: new URL('../server/', import.meta.url),
  env: { ...process.env, PORT: String(PORT), ALLOWED_ORIGINS: ALLOWED, MAX_CONN_PER_IP: '40' },
  stdio: ['ignore', 'pipe', 'inherit'],
});
let booted = false;
server.stdout.on('data', (d) => {
  if (String(d).includes('listening')) booted = true;
});
for (let i = 0; i < 50 && !booted; i++) await sleep(100);
if (!booted) {
  console.error('server did not start');
  process.exit(1);
}

// ---- helpers ----
function client(clientId, extra = {}) {
  const socket = io(BASE, { transports: ['websocket'], reconnection: false, forceNew: true, ...extra });
  const seen = [];
  socket.onAny((type, msg) => seen.push({ type, msg, at: Date.now() }));
  const waitFor = (type, pred = () => true, ms = 5000) =>
    new Promise((resolve, reject) => {
      const hit = seen.find((m) => m.type === type && pred(m.msg));
      if (hit) return resolve(hit.msg);
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${type}`)), ms);
      socket.onAny((t, m) => {
        if (t === type && pred(m)) {
          clearTimeout(timer);
          resolve(m);
        }
      });
    });
  const join = (name, difficulty = 'normal', extra = {}) =>
    new Promise((resolve) => socket.emit('join', { clientId, name, difficulty, ...extra }, resolve));
  const count = (type) => seen.filter((m) => m.type === type).length;
  return { socket, seen, waitFor, join, count, clientId };
}

function request(method, path, origin) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE}${path}`, { method, headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' } }, (res) => {
      res.resume();
      resolve({ status: res.statusCode, allow: res.headers['access-control-allow-origin'] });
    });
    req.on('error', reject);
    req.end();
  });
}

try {
  // ---- CORS ----
  const good = await request('OPTIONS', '/health', 'https://my-game.vercel.app');
  check('CORS: a *.vercel.app origin is allowed', good.allow === 'https://my-game.vercel.app', String(good.allow));
  const exact = await request('GET', '/health', 'https://netanchal.vercel.app');
  check('CORS: the exact configured origin is allowed', exact.allow === 'https://netanchal.vercel.app');
  const bad = await request('GET', '/health', 'https://evil.example');
  check('CORS: an unlisted origin gets no allow header', bad.allow === undefined);
  const evil = io(BASE, { transports: ['polling'], reconnection: false, forceNew: true, extraHeaders: { Origin: 'https://evil.example' } });
  const evilResult = await new Promise((resolve) => {
    evil.on('connect', () => resolve('connected'));
    evil.on('connect_error', () => resolve('refused'));
    setTimeout(() => resolve('timeout'), 3000);
  });
  evil.close();
  check('CORS: a socket from an unlisted origin is refused', evilResult === 'refused', evilResult);

  // ---- two players start a match ----
  const A = client('client-alice-0001');
  const B = client('client-bala-00002');
  const ackA = await A.join('Alice');
  const ackB = await B.join('Bala');
  check('two players are matched into the same room', ackA.ok && ackB.ok && ackA.roomId === ackB.roomId, ackA.roomId);
  check('they join as seated players', ackA.role === 'player' && ackB.role === 'player');

  A.socket.emit('pick', { characterId: 'vikas_veer' });
  B.socket.emit('pick', { characterId: 'toofan_rani' });
  await A.waitFor('lobby', (l) => l.slots.some((s) => s.characterId === 'toofan_rani'));
  A.socket.emit('ready', {});
  B.socket.emit('ready', {});
  const start = await A.waitFor('match_start', () => true, 6000);
  check('the match starts with all 8 characters', start.players.length === 8 && start.phase === 'playing');
  await sleep(1000);
  const before = A.count('snapshot');
  await sleep(1000);
  const rate = A.count('snapshot') - before;
  check('snapshots stream at about 30 per second', rate >= 22 && rate <= 36, `${rate}/s`);

  // inputs drive the right character, server-side
  const aliceBefore = (await A.waitFor('snapshot')).players.find((p) => p.characterId === 'vikas_veer');
  A.socket.emit('input', { mx: 1, my: 0, attack: false, special: false });
  await sleep(700);
  const aliceAfter = [...A.seen].reverse().find((m) => m.type === 'snapshot').msg.players.find((p) => p.characterId === 'vikas_veer');
  check('input moves the character on the server', aliceAfter.x > aliceBefore.x + 20, `${Math.round(aliceBefore.x)} -> ${Math.round(aliceAfter.x)}`);

  // ---- a third person joins the RUNNING match ----
  const C = client('client-chitra-003');
  const ackC = await C.join('Chitra');
  check('a newcomer is matched into the running game', ackC.ok && ackC.roomId === ackA.roomId, ackC.roomId);
  check('as a viewer with no seat yet', ackC.role === 'viewer');
  const welcomeC = await C.waitFor('welcome');
  const lobbyC = await C.waitFor('lobby');
  check('they see the lobby, marked in progress, with all 8 seats', welcomeC.alliance === null && lobbyC.inProgress === true && lobbyC.slots.length === 8 && lobbyC.round === 1);
  check('the lobby shows who is human and who is a bot', lobbyC.slots.filter((s) => !s.isBot).length === 2 && lobbyC.slots.filter((s) => s.isBot).length === 6);

  C.socket.emit('pick', { characterId: 'vikas_veer' });
  const refused = await C.waitFor('error', (e) => /someone else/.test(e.message));
  check('a character another human is playing is refused', !!refused);

  const botSeat = lobbyC.slots.find((s) => s.isBot && s.alliance === 'jan_ekta');
  C.socket.emit('pick', { characterId: botSeat.characterId });
  const welcomeC2 = await C.waitFor('welcome', (w) => w.alliance !== null);
  const startC = await C.waitFor('match_start');
  check('picking a bot character takes it over and drops them into the match', welcomeC2.alliance === 'jan_ekta' && startC.phase === 'playing');
  const lobbyAfter = await A.waitFor('lobby', (l) => l.slots.find((s) => s.characterId === botSeat.characterId)?.isBot === false);
  check('everyone else sees that seat locked', !!lobbyAfter);
  await sleep(500);
  check('the newcomer now receives live snapshots', C.count('snapshot') > 5, `${C.count('snapshot')} frames`);

  // ---- abuse and bad payloads ----
  const D = client('client-dev-000004');
  await D.join('Dev');
  const baddies = [
    ['input', 'not an object'],
    ['input', { mx: 'a', my: 1 }],
    ['input', { mx: NaN, my: 0 }],
    ['pick', { characterId: '__proto__' }],
    ['pick', { characterId: 12 }],
    ['ping', { type: 'nuke' }],
    ['ready', null],
  ];
  for (const [event, payload] of baddies) D.socket.emit(event, payload);
  await sleep(300);
  const health = await request('GET', '/health', 'https://netanchal.vercel.app');
  check('garbage payloads do not crash the server', health.status === 200 && D.socket.connected);
  const badJoin = await new Promise((resolve) => client('x').socket.emit('join', { clientId: '../../etc', name: 5 }, resolve));
  check('a malformed join is rejected', badJoin.ok === false);

  const spam = client('client-spam-00005');
  await spam.join('Spam');
  let accepted = 0;
  const startSpam = Date.now();
  for (let i = 0; i < 1500 && spam.socket.connected; i++) spam.socket.emit('input', { mx: 1, my: 0, attack: true, special: false });
  await sleep(1500);
  check('a socket flooding inputs is cut off', spam.socket.connected === false, `${Date.now() - startSpam} ms`);
  const stillUp = await request('GET', '/health', 'https://netanchal.vercel.app');
  check('and the server keeps running for everyone else', stillUp.status === 200 && A.socket.connected);

  // ---- reconnect inside the grace window reclaims the seat ----
  // the latest welcome: B's alliance can change when they pick a character from the other party
  const bAlliance = [...B.seen].reverse().find((m) => m.type === 'welcome').msg.alliance;
  B.socket.disconnect();
  await sleep(400);
  const lobbyWhileGone = await A.waitFor('lobby', (l) => l.slots.some((s) => s.reserved));
  check('a dropped player\'s seat is held, not given away', !!lobbyWhileGone);
  const B2 = client('client-bala-00002');
  const ackB2 = await B2.join('Bala');
  const welcomeB2 = await B2.waitFor('welcome');
  const startB2 = await B2.waitFor('match_start');
  check('reconnecting with the same id returns to the same seat', ackB2.ok && ackB2.roomId === ackA.roomId && welcomeB2.alliance === bAlliance && startB2.phase === 'playing');
  const lobbyBack = await A.waitFor('lobby', (l) => l.slots.every((s) => !s.reserved));
  check('and the reservation is cleared', !!lobbyBack);

  // ---- leaving frees the seat for someone else ----
  C.socket.emit('leave');
  await A.waitFor('lobby', (l) => l.slots.find((s) => s.characterId === botSeat.characterId)?.isBot === true);
  const E = client('client-esha-000006');
  const ackE = await E.join('Esha');
  check('a new arrival lands in the running match again', ackE.roomId === ackA.roomId && ackE.role === 'viewer');
  E.socket.emit('pick', { characterId: botSeat.characterId });
  const welcomeE = await E.waitFor('welcome', (w) => w.alliance !== null);
  check('and can take the seat that was freed', welcomeE.alliance === 'jan_ekta');


  // ---- private rooms with share codes ----
  const H = client('client-host-000010');
  const ackH = await H.join('Host', 'normal', { mode: 'create' });
  check('a player can create a private room', ackH.ok && ackH.role === 'player', ackH.roomId);
  const lobbyH = await H.waitFor('lobby', (l) => !!l.code);
  check('the lobby carries a 4-letter code, private flag and the host', /^[A-HJ-NP-Z2-9]{4}$/.test(lobbyH.code) && lobbyH.isPrivate === true && lobbyH.hostId === 'client-host-000010', lobbyH.code);
  const wrong = await client('client-wrong-00011').join('Nobody', 'normal', { mode: 'join', code: 'ZZZZ' });
  check('a wrong code is refused with a clear error', wrong.ok === false && /No room/.test(wrong.error), wrong.error);
  const G = client('client-guest-00012');
  const ackG = await G.join('Guest', 'normal', { mode: 'join', code: lobbyH.code.toLowerCase() });
  check('a friend joins the same room by code (any letter case)', ackG.ok && ackG.roomId === ackH.roomId);
  const lobbyG = await G.waitFor('lobby', (l) => l.slots.filter((s) => !s.isBot).length === 2);
  check('the guest sees the code and the same host', lobbyG.code === lobbyH.code && lobbyG.hostId === 'client-host-000010');
  const Q = client('client-quick-00013');
  const ackQ = await Q.join('Quick');
  check('quick play never lands in a private room', ackQ.ok && ackQ.roomId !== ackH.roomId, ackQ.roomId);
  H.socket.emit('pick', { characterId: 'kila_singh' });
  G.socket.emit('pick', { characterId: 'bijli_babu' });
  await H.waitFor('lobby', (l) => l.slots.some((s) => s.characterId === 'bijli_babu'));
  const gStartsBefore = H.count('match_start');
  G.socket.emit('start_now', {});
  await sleep(1200);
  check('only the host can start the match early', H.count('match_start') === gStartsBefore && H.count('match_start') === 0);
  H.socket.emit('start_now', {});
  const privStart = await G.waitFor('match_start', () => true, 5000);
  check('the host starting now begins the match for everyone', privStart.phase === 'playing' && privStart.players.length === 8);
  for (const c of [H, G, Q]) c.socket.close();

  for (const c of [A, B2, C, D, E]) c.socket.close();
} catch (err) {
  console.error(err);
  failed++;
} finally {
  server.kill('SIGTERM');
}

console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
