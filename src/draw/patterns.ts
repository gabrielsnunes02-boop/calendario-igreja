// Texturas de tecido geradas por código, tingidas com a cor escolhida.

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

type Painter = (g: CanvasRenderingContext2D, s: number, c: string) => void;

const painters: Record<string, Painter> = {
  stripes(g, s, c) {
    g.fillStyle = c; g.fillRect(0, 0, s, s);
    g.fillStyle = shade(c, 0.75);
    for (let x = 0; x < s; x += s / 4) g.fillRect(x, 0, s / 10, s);
  },
  denim(g, s, c) {
    g.fillStyle = c; g.fillRect(0, 0, s, s);
    const r = rng(7);
    g.lineWidth = 1.2;
    for (let i = -s; i < s * 2; i += 3) {
      g.strokeStyle = r() > 0.5 ? shade(c, 0.25) : shade(c, -0.25);
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s, s); g.stroke();
    }
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.25})`;
      g.fillRect(r() * s, r() * s, 2, 1);
    }
  },
  dots(g, s, c) {
    g.fillStyle = c; g.fillRect(0, 0, s, s);
    g.fillStyle = shade(c, 0.85);
    const d = s / 2;
    for (const [x, y] of [[0, 0], [d, d], [s, 0], [0, s], [s, s]]) {
      g.beginPath(); g.arc(x, y, s / 9, 0, Math.PI * 2); g.fill();
    }
  },
  plaid(g, s, c) {
    g.fillStyle = c; g.fillRect(0, 0, s, s);
    g.globalAlpha = 0.45;
    g.fillStyle = shade(c, -0.55);
    g.fillRect(0, s * 0.15, s, s * 0.25); g.fillRect(s * 0.15, 0, s * 0.25, s);
    g.fillStyle = shade(c, 0.6);
    g.fillRect(0, s * 0.65, s, s * 0.06); g.fillRect(s * 0.65, 0, s * 0.06, s);
    g.globalAlpha = 0.8;
    g.fillStyle = shade(c, -0.7);
    g.fillRect(0, s * 0.86, s, 1.5); g.fillRect(s * 0.86, 0, 1.5, s);
    g.globalAlpha = 1;
  },
  leopard(g, s, c) {
    g.fillStyle = c; g.fillRect(0, 0, s, s);
    const r = rng(42);
    const spots: [number, number][] = [];
    for (let i = 0; i < 7; i++) spots.push([r() * s, r() * s]);
    for (const [x, y] of spots) {
      for (const [ox, oy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) {
        const rad = s * (0.07 + r() * 0.05);
        g.fillStyle = shade(c, -0.25);
        g.beginPath(); g.ellipse(x + ox, y + oy, rad, rad * 0.8, r() * 3, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#2a1a12'; g.lineWidth = s * 0.03; g.lineCap = 'round';
        g.beginPath(); g.arc(x + ox, y + oy, rad * 1.25, r() * 6, r() * 6 + 4.2); g.stroke();
      }
    }
  },
  lace(g, s, c) {
    g.clearRect(0, 0, s, s);
    g.strokeStyle = c; g.lineWidth = 1.4;
    const q = s / 2;
    for (const [x, y] of [[q, q], [0, 0], [s, 0], [0, s], [s, s]]) {
      g.beginPath(); g.arc(x, y, s * 0.2, 0, Math.PI * 2); g.stroke();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        g.beginPath(); g.arc(x + Math.cos(a) * s * 0.28, y + Math.sin(a) * s * 0.28, s * 0.07, 0, Math.PI * 2); g.stroke();
      }
    }
    g.globalAlpha = 0.5;
    for (let i = 0; i <= s; i += s / 8) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(0, i); g.stroke();
      g.beginPath(); g.moveTo(s - i, s); g.lineTo(s, s - i); g.stroke();
    }
    g.globalAlpha = 1;
  },
};

const cache = new Map<string, HTMLCanvasElement>();

export function patternTile(id: string, color: string, size = 48): HTMLCanvasElement {
  const key = `${id}|${color}|${size}`;
  let t = cache.get(key);
  if (!t) {
    t = document.createElement('canvas');
    t.width = t.height = size;
    painters[id](t.getContext('2d')!, size, color);
    cache.set(key, t);
  }
  return t;
}

export function makePattern(ctx: CanvasRenderingContext2D, id: string, color: string, scale = 1): CanvasPattern {
  return ctx.createPattern(patternTile(id, color, Math.round(48 * scale)), 'repeat')!;
}

/** Textura granulada para o lápis. */
export function grainTile(color: string): HTMLCanvasElement {
  const key = `grain|${color}`;
  let t = cache.get(key);
  if (!t) {
    t = document.createElement('canvas');
    t.width = t.height = 64;
    const g = t.getContext('2d')!;
    const r = rng(3);
    g.fillStyle = color;
    for (let i = 0; i < 1500; i++) {
      g.globalAlpha = 0.25 + r() * 0.75;
      g.fillRect(Math.floor(r() * 64), Math.floor(r() * 64), 1, 1);
    }
    cache.set(key, t);
  }
  return t;
}
