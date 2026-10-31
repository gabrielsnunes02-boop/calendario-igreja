// Sons sintetizados na hora (Web Audio) — nada de arquivos, funciona offline.
import { state } from './game/state';

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (!state.sound) return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, when = 0, slideTo?: number) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

let noiseBuf: AudioBuffer | null = null;
function noise(dur: number, vol: number, when = 0, hp = 4000, q = 0.7) {
  const a = ac(); if (!a) return;
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = a.currentTime + when;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = hp; f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
}

export const sfx = {
  tap() { tone(880, 0.06, 'triangle', 0.05); },
  pop() { tone(520, 0.12, 'sine', 0.12, 0, 900); },
  lock() { tone(220, 0.15, 'square', 0.04); tone(180, 0.18, 'square', 0.04, 0.08); },
  shutter() { noise(0.05, 0.25, 0, 3000, 1); noise(0.04, 0.2, 0.07, 5000, 1); },
  freeze() { tone(660, 0.1, 'triangle', 0.1); tone(990, 0.18, 'triangle', 0.1, 0.08); noise(0.08, 0.15, 0.02, 6000); },
  star(i: number) { tone(700 + i * 160, 0.25, 'triangle', 0.1); tone(1400 + i * 320, 0.2, 'sine', 0.04, 0.03); },
  levelUp() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, 'triangle', 0.1, i * 0.09)); },
  achievement() { [784, 988, 1175].forEach((f, i) => tone(f, 0.3, 'sine', 0.12, i * 0.07)); },
  applause(sec = 3) {
    for (let i = 0; i < sec * 40; i++) noise(0.03 + Math.random() * 0.03, 0.05 + Math.random() * 0.08, Math.random() * sec, 1500 + Math.random() * 2500, 1.5);
  },
};

/** Batida de passarela simples (120 bpm). Retorna função para parar. */
export function runwayBeat(): () => void {
  const a = ac(); if (!a) return () => {};
  let step = 0;
  const bass = [55, 55, 65.4, 55, 49, 49, 58.3, 49];
  const id = window.setInterval(() => {
    const s = step % 16;
    if (s % 4 === 0) tone(110, 0.25, 'sine', 0.35, 0, 40);          // bumbo
    if (s % 4 === 2) noise(0.05, 0.07, 0, 8000, 0.8);              // chimbal
    if (s % 8 === 4) noise(0.12, 0.12, 0, 1800, 0.6);              // caixa
    if (s % 2 === 0) tone(bass[(step >> 1) % 8], 0.2, 'sawtooth', 0.05);
    if (s === 14) tone(880, 0.1, 'triangle', 0.03);
    step++;
  }, 125);
  return () => clearInterval(id);
}
