// Estado do jogo (XP, níveis, conquistas, desafios) salvo no aparelho.
import {
  ACHIEVEMENTS, CHALLENGE_COLORS, CLIENT_NAMES, CLIENT_OCCASIONS, CLIENT_STYLES,
  LEVELS, NamedColor, PIECES, THEMES, pick, seeded,
} from './content';

export interface Client { name: string; occasion: string; style: string }

export interface GameState {
  xp: number;
  looks: number;
  clientsDone: number;
  achievements: string[];
  streak: number;
  lastChallengeDay: string; // YYYY-MM-DD
  client: Client | null;
  sound: boolean;
  seenIntro: boolean;
}

const KEY = 'atelie-state-v1';

const DEFAULT: GameState = {
  xp: 0, looks: 0, clientsDone: 0, achievements: [], streak: 0,
  lastChallengeDay: '', client: null, sound: true, seenIntro: false,
};

function load(): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { /* sem armazenamento: começa do zero */ }
  return { ...DEFAULT };
}

export const state: GameState = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignora */ }
}

// ---------- Níveis ----------
export function levelIndex(xp = state.xp): number {
  let i = 0;
  for (let k = 0; k < LEVELS.length; k++) if (xp >= LEVELS[k].xp) i = k;
  return i;
}

export function levelProgress(): { idx: number; name: string; pct: number; next: number | null } {
  const idx = levelIndex();
  const cur = LEVELS[idx];
  const nxt = LEVELS[idx + 1];
  if (!nxt) return { idx, name: cur.name, pct: 1, next: null };
  return { idx, name: cur.name, pct: (state.xp - cur.xp) / (nxt.xp - cur.xp), next: nxt.xp };
}

// ---------- Desbloqueáveis ----------
export interface Unlockable { id: string; label: string; level: number }

export const POSES: Unlockable[] = [
  { id: 'stand', label: 'Em pé', level: 0 },
  { id: 'contrapposto', label: 'Contraposto', level: 0 },
  { id: 'runway', label: 'Passarela', level: 0 },
  { id: 'hip', label: 'Mão na cintura', level: 1 },
  { id: 'cover', label: 'Capa de revista', level: 3 },
  { id: 'walk', label: 'Andando', level: 5 },
  { id: 'open', label: 'Braços abertos', level: 7 },
];

export const BODIES: Unlockable[] = [
  { id: 'classic', label: 'Clássico', level: 0 },
  { id: 'fashion', label: 'Fashion alongado', level: 0 },
  { id: 'masc', label: 'Masculino', level: 0 },
  { id: 'curvy', label: 'Curvilíneo', level: 2 },
];

export const TEXTURES: Unlockable[] = [
  { id: 'stripes', label: 'Listras', level: 0 },
  { id: 'denim', label: 'Jeans', level: 0 },
  { id: 'dots', label: 'Poá', level: 1 },
  { id: 'plaid', label: 'Xadrez', level: 2 },
  { id: 'leopard', label: 'Oncinha', level: 4 },
  { id: 'lace', label: 'Renda', level: 6 },
];

export const RUNWAYS: Unlockable[] = [
  { id: 'classic', label: 'Clássica', level: 0 },
  { id: 'beach', label: 'Praia', level: 3 },
  { id: 'neon', label: 'Neon', level: 5 },
  { id: 'paris', label: 'Paris', level: 6 },
];

export const GLITTER_LEVEL = 4;

export const isUnlocked = (u: { level: number }) => levelIndex() >= u.level;

// ---------- Desafio do dia ----------
export function today(d = new Date()): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export interface Challenge { day: string; theme: string; color: NamedColor; piece: string }

export function dailyChallenge(): Challenge {
  const day = today();
  const seed = Number(day.replace(/-/g, ''));
  const rnd = seeded(seed * 7919);
  return { day, theme: pick(THEMES, rnd), color: pick(CHALLENGE_COLORS, rnd), piece: pick(PIECES, rnd) };
}

export const challengeDoneToday = () => state.lastChallengeDay === today();

export function newClient(): Client {
  state.client = { name: pick(CLIENT_NAMES), occasion: pick(CLIENT_OCCASIONS), style: pick(CLIENT_STYLES) };
  save();
  return state.client;
}

// ---------- Recompensas ----------
export type Mode = 'free' | 'challenge' | 'client';

export interface LookStats {
  colors: number;
  textures: number;
  strokes: number;
  symmetry: boolean;
  usedChallengeColor: boolean;
}

export interface Reward {
  xp: number;
  lines: string[];
  newAchievements: string[];
  levelUp: number | null;
}

export function unlockAchievement(id: string, out?: string[]) {
  if (state.achievements.includes(id)) return;
  state.achievements.push(id);
  out?.push(id);
}

export function grantReward(mode: Mode, stats: LookStats, stars: number): Reward {
  const before = levelIndex();
  const lines: string[] = [];
  const ach: string[] = [];
  let xp = 40;
  lines.push('Look criado: +40 XP');
  const starXp = stars * 6;
  xp += starXp;
  lines.push(`Estrelas do júri: +${starXp} XP`);

  state.looks++;
  if (mode === 'challenge' && !challengeDoneToday()) {
    const yesterday = today(new Date(Date.now() - 864e5));
    state.streak = state.lastChallengeDay === yesterday ? state.streak + 1 : 1;
    state.lastChallengeDay = today();
    const bonus = 60 + Math.min(state.streak, 10) * 10;
    xp += bonus;
    lines.push(`Desafio do dia (sequência ${state.streak} 🔥): +${bonus} XP`);
    unlockAchievement('challenge', ach);
    if (state.streak >= 3) unlockAchievement('streak3', ach);
    if (state.streak >= 7) unlockAchievement('streak7', ach);
  }
  if (mode === 'client' && state.client) {
    xp += 80;
    lines.push(`Pedido de ${state.client.name}: +80 XP`);
    state.clientsDone++;
    state.client = null;
    unlockAchievement('client', ach);
    if (state.clientsDone >= 5) unlockAchievement('clients5', ach);
  }

  if (state.looks >= 1) unlockAchievement('first', ach);
  if (state.looks >= 5) unlockAchievement('five', ach);
  if (state.looks >= 10) unlockAchievement('ten', ach);
  if (state.looks >= 25) unlockAchievement('twentyfive', ach);
  if (stats.colors >= 6) unlockAchievement('colors', ach);
  if (stats.textures >= 3) unlockAchievement('textures', ach);
  if (stats.symmetry) unlockAchievement('symmetry', ach);
  if (stars >= 15) unlockAchievement('stars5', ach);
  const h = new Date().getHours();
  if (h >= 0 && h < 5) unlockAchievement('night', ach);

  xp += ach.length * 25;
  if (ach.length) lines.push(`Conquistas novas: +${ach.length * 25} XP`);

  state.xp += xp;
  const after = levelIndex();
  save();
  return { xp, lines, newAchievements: ach, levelUp: after > before ? after : null };
}

export const achievementById = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!;
