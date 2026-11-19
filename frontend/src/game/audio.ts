// Match audio: an original rally-style background track synthesised live with
// Web Audio (dhol, shaker, bass, harmonium pad, shehnai-ish lead), plus the
// voice clip each character shouts when they fire their special.
import type { CharacterId } from '@netanchal/shared';
import bijli from '../assets/audio/bijli_babu.mp3';
import chanakya from '../assets/audio/chanakya_rao.mp3';
import kila from '../assets/audio/kila_singh.mp3';
import majaAaya from '../assets/audio/maja_aaya.mp3';
import pandit from '../assets/audio/pandit_shabdkosh.mp3';
import sadak from '../assets/audio/sadak_kumar.mp3';
import toofan from '../assets/audio/toofan_rani.mp3';
import vikas from '../assets/audio/vikas_veer.mp3';

/** Dharna Dada has no clip of his own yet and shares "maja aaya". */
export const SPECIAL_CLIPS: Record<CharacterId, string> = {
  vikas_veer: vikas,
  chanakya_rao: chanakya,
  sadak_kumar: sadak,
  kila_singh: kila,
  toofan_rani: toofan,
  bijli_babu: bijli,
  pandit_shabdkosh: pandit,
  dharna_dada: majaAaya,
};

const STORAGE_KEY = 'netanchal-sound';
const MUSIC_LEVEL = 0.32;
const DUCKED_LEVEL = 0.07;

// ---- composition (D Khamaj-flavoured, 116 bpm, 16th-note grid) ----
const BPM = 116;
const STEP = 60 / BPM / 4;
const D3 = 146.83;
const hz = (semi: number, base = D3) => base * 2 ** (semi / 12);
// bass roots per bar (semitones from D2) over an 8-bar loop
const BASS = [0, 0, -2, -2, 5, 5, 3, 7];
// lead phrases: [step within 2 bars (0-31), semitones from D4, length in steps]
type Note = [number, number, number];
const PHRASE_A: Note[] = [[0, 7, 2], [2, 9, 2], [4, 12, 4], [8, 11, 2], [10, 9, 2], [12, 7, 4], [16, 4, 2], [18, 5, 2], [20, 7, 6], [28, 9, 2], [30, 7, 2]];
const PHRASE_B: Note[] = [[0, 12, 3], [3, 14, 1], [4, 12, 2], [6, 10, 2], [8, 9, 4], [12, 7, 4], [16, 9, 2], [18, 7, 2], [20, 5, 2], [22, 4, 2], [24, 2, 6], [30, 0, 2]];
const PHRASE_C: Note[] = [[0, 0, 2], [2, 2, 2], [4, 4, 2], [6, 7, 2], [8, 9, 3], [11, 7, 1], [12, 9, 4], [16, 12, 2], [18, 10, 2], [20, 9, 2], [22, 7, 2], [24, 9, 8]];
const SECTIONS = [PHRASE_A, PHRASE_B, PHRASE_A, PHRASE_C];
const KICK = [0, 3, 8, 11];
const SLAP = [4, 12, 14];
const TA = [2, 6, 10, 15];

class GameAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private noise!: AudioBuffer;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private clip: HTMLAudioElement | null = null;
  private clipOwnerIsMe = false;
  private clips = new Map<string, HTMLAudioElement>();
  muted = false;
  private listeners = new Set<(muted: boolean) => void>();

  constructor() {
    try {
      this.muted = localStorage.getItem(STORAGE_KEY) === 'off';
    } catch {
      /* storage blocked */
    }
  }

  /** Call from a user gesture (lobby taps) so the browser allows sound. */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.music.gain.value = MUSIC_LEVEL;
      this.music.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    // warm the clip cache so the first special isn't late
    for (const url of new Set(Object.values(SPECIAL_CLIPS))) this.getClip(url);
  }

  onChange(fn: (muted: boolean) => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? 'off' : 'on');
    } catch {
      /* ignore */
    }
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
    if (muted) this.clip?.pause();
    this.listeners.forEach((fn) => fn(muted));
  }

  startMusic() {
    this.unlock();
    if (!this.ctx || this.timer !== null) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.music.gain.cancelScheduledValues(this.ctx.currentTime);
    this.music.gain.setTargetAtTime(MUSIC_LEVEL, this.ctx.currentTime, 0.3);
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stopMusic() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    if (this.ctx) this.music.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    this.clip?.pause();
    this.clip = null;
  }

  /**
   * Plays a character's special clip. The local player's clip always wins;
   * other players' clips only play when nothing else is talking.
   */
  playSpecial(characterId: CharacterId, mine: boolean) {
    if (this.muted) return;
    const busy = this.clip && !this.clip.paused && !this.clip.ended;
    if (busy && (!mine || this.clipOwnerIsMe)) return;
    this.clip?.pause();
    const el = this.getClip(SPECIAL_CLIPS[characterId]);
    el.currentTime = 0;
    el.volume = mine ? 1 : 0.75;
    this.clip = el;
    this.clipOwnerIsMe = mine;
    this.duck(true);
    el.onended = el.onpause = () => {
      if (this.clip === el) this.duck(false);
    };
    el.play().catch(() => this.duck(false));
  }

  private getClip(url: string) {
    let el = this.clips.get(url);
    if (!el) {
      el = new Audio(url);
      el.preload = 'auto';
      this.clips.set(url, el);
    }
    return el;
  }

  private duck(on: boolean) {
    if (!this.ctx || this.timer === null) return;
    this.music.gain.setTargetAtTime(on ? DUCKED_LEVEL : MUSIC_LEVEL, this.ctx.currentTime, on ? 0.05 : 0.4);
  }

  // ---------------- sequencer ----------------

  private schedule() {
    const ctx = this.ctx!;
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step = (this.step + 1) % (32 * SECTIONS.length);
    }
  }

  private playStep(step: number, t: number) {
    const inBar = step % 16;
    const bar = Math.floor(step / 16) % BASS.length;
    const section = Math.floor(step / 32) % SECTIONS.length;
    const inPhrase = step % 32;
    // a short drum fill at the end of every 8 bars
    const fill = step % 128 >= 120;

    if (KICK.includes(inBar) || (fill && inBar % 2 === 0)) this.dha(t);
    if (SLAP.includes(inBar)) this.slap(t);
    if (TA.includes(inBar) || fill) this.ta(t, fill ? 0.5 : 0.35);
    this.shaker(t, inBar % 2 ? 0.05 : 0.12);

    if (inBar === 0 || inBar === 6 || inBar === 10) this.bass(hz(BASS[bar] - 12, D3 / 2), t, inBar === 0 ? STEP * 5 : STEP * 3);
    if (inBar === 0) this.pad(hz(BASS[bar]), t, STEP * 16);

    for (const [s, semi, len] of SECTIONS[section]) if (s === inPhrase) this.lead(hz(semi, D3 * 2), t, len * STEP);
  }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private dha(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
    this.env(g, t, 0.9, 0.005, 0.28);
    o.connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.32);
  }

  private noiseHit(t: number, freq: number, q: number, peak: number, decay: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, peak, 0.002, decay);
    src.connect(f).connect(g).connect(this.music);
    src.start(t, Math.random() * 0.5);
    src.stop(t + decay + 0.02);
  }

  private slap(t: number) {
    this.noiseHit(t, 900, 1.2, 0.55, 0.12);
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
    this.env(g, t, 0.3, 0.003, 0.1);
    o.connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.12);
  }

  private ta(t: number, peak: number) {
    this.noiseHit(t, 3200, 4, peak, 0.06);
  }

  private shaker(t: number, peak: number) {
    this.noiseHit(t, 8000, 1, peak, 0.035);
  }

  private bass(freq: number, t: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(700, t);
    f.frequency.exponentialRampToValueAtTime(180, t + dur);
    const g = ctx.createGain();
    this.env(g, t, 0.35, 0.01, dur);
    o.connect(f).connect(g).connect(this.music);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** harmonium-ish drone: root + fifth, slow swell */
  private pad(freq: number, t: number, dur: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.25);
    g.gain.setValueAtTime(0.06, t + dur - 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1400;
    f.connect(g).connect(this.music);
    for (const [mult, detune] of [[1, -6], [1.5, 5], [2, 0]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq * mult;
      o.detune.value = detune;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  /** reedy lead with a touch of vibrato */
  private lead(freq: number, t: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(freq * 0.97, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.04); // little meend into the note
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 5.5;
    lfoGain.gain.value = freq * 0.012;
    lfo.connect(lfoGain).connect(o.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2200;
    f.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.03);
    g.gain.setValueAtTime(0.09, t + Math.max(0.05, dur - 0.06));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    o.connect(f).connect(g).connect(this.music);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.1);
    lfo.stop(t + dur + 0.1);
  }
}

export const gameAudio = new GameAudio();
