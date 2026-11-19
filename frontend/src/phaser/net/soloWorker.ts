/// <reference lib="webworker" />
// Solo mode: the identical MatchSim the server runs, hosted in a Web Worker so
// the simulation never forks between solo and online.
import { type ClientMessages, type Difficulty, MatchSim, SNAPSHOT_HZ, TICK_HZ } from '@netanchal/shared';

declare const self: DedicatedWorkerGlobalScope;

const ME = 'me';
let sim: MatchSim | null = null;

self.onmessage = (e: MessageEvent) => {
  const data = e.data as { kind: 'init'; name: string; difficulty: Difficulty; roundSeconds?: number } | { kind: 'msg'; type: keyof ClientMessages; msg: never };
  if (data.kind === 'init') {
    sim = new MatchSim((_to, type, msg) => self.postMessage({ type, msg }), { solo: true, difficulty: data.difficulty, roundSeconds: data.roundSeconds });
    sim.addPlayer(ME, data.name);
    start();
  } else if (sim) sim.handle(ME, data.type, data.msg);
};

function start() {
  let last = performance.now();
  let snapAcc = 0;
  setInterval(() => {
    if (!sim) return;
    const now = performance.now();
    // clamp so a backgrounded tab doesn't fast-forward the match
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    sim.update(dt);
    snapAcc += dt;
    if (sim.phase !== 'lobby' && snapAcc >= 1 / SNAPSHOT_HZ) {
      snapAcc = 0;
      self.postMessage({ type: 'snapshot', msg: sim.snapshot() });
    }
  }, 1000 / TICK_HZ);
}
