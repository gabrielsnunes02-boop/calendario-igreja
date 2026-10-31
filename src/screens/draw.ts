// Tela 2: desenhar o croqui com o dedo por cima da silhueta congelada.
import { session } from '../session';
import { nav, Screen } from '../nav';
import { button, confirmBox, h, lockBadge, modal, toast } from '../ui';
import { GLITTER_LEVEL, TEXTURES, isUnlocked, levelIndex } from '../game/state';
import { grainTile, makePattern, patternTile } from '../draw/patterns';
import { floodMask } from '../draw/floodfill';
import { sfx } from '../audio';
import { runwayScreen, RunwayInput } from './runway';
import { pick } from '../game/content';

type ToolId = 'pencil' | 'pen' | 'marker' | 'water' | 'fabric' | 'glitter' | 'fill' | 'eraser';
type LayerId = 'color' | 'ink';

interface Tool { id: ToolId; icon: string; label: string; layer: LayerId; size: number; min: number; max: number; level?: number }

const TOOLS: Tool[] = [
  { id: 'pencil', icon: '✏️', label: 'Lápis', layer: 'ink', size: 4, min: 1, max: 14 },
  { id: 'pen', icon: '🖋️', label: 'Caneta', layer: 'ink', size: 7, min: 2, max: 20 },
  { id: 'marker', icon: '🖍️', label: 'Marcador', layer: 'color', size: 18, min: 4, max: 60 },
  { id: 'water', icon: '💧', label: 'Aquarela', layer: 'color', size: 30, min: 8, max: 90 },
  { id: 'fabric', icon: '🧵', label: 'Tecido', layer: 'color', size: 28, min: 6, max: 90 },
  { id: 'glitter', icon: '✨', label: 'Glitter', layer: 'color', size: 20, min: 6, max: 60, level: GLITTER_LEVEL },
  { id: 'fill', icon: '🪣', label: 'Balde', layer: 'color', size: 0, min: 0, max: 0 },
  { id: 'eraser', icon: '🧽', label: 'Borracha', layer: 'ink', size: 22, min: 4, max: 90 },
];

const PALETTE = [
  '#151313', '#ffffff', '#6b5a55', '#c4142c', '#f06aa8', '#ffb3c7', '#ff7a1a', '#f3d97a',
  '#c9a23a', '#18805b', '#9fe0c4', '#6b7a3a', '#1f3fbf', '#a9cdef', '#b7a3e0', '#6e1f34',
  '#b9763a', '#f2ece0',
];

const LOOK_NAMES = ['Aurora', 'Brisa', 'Cetim', 'Dália', 'Estrela', 'Flor de Lis', 'Gardênia', 'Íris', 'Jasmim', 'Lua', 'Magnólia', 'Noite', 'Orquídea', 'Pérola', 'Rubi', 'Seda', 'Tulipa', 'Violeta'];

interface UndoRect { layer: LayerId; x: number; y: number; data: ImageData }

export function drawScreen(): Screen {
  const sil = session.silhouette!;
  const W = sil.width, H = sil.height;

  // ---------- Camadas ----------
  const mk = (cls: string) => {
    const c = h('canvas', { class: 'layer ' + cls, width: W, height: H });
    return c;
  };
  const silC = mk('sil');
  silC.getContext('2d')!.drawImage(sil, 0, 0);
  const layers: Record<LayerId, HTMLCanvasElement> = { color: mk('color'), ink: mk('ink') };
  const ctxOf = (l: LayerId) => layers[l].getContext('2d', { willReadFrequently: true })!;
  const strokeC = mk('stroke');
  const sctx = strokeC.getContext('2d')!;
  const board = h('div', { class: 'board' }, silC, layers.color, layers.ink);
  board.style.width = W + 'px';
  board.style.height = H + 'px';
  const stage = h('div', { class: 'stage' }, board);

  // ---------- Estado ----------
  let tool = TOOLS[1];
  const sizes: Record<string, number> = Object.fromEntries(TOOLS.map((t) => [t.id, t.size]));
  let color = '#151313';
  let fabric = 'stripes';
  let fillWith = 'solid';
  let eraseWhat: 'all' | 'color' | 'ink' = 'all';
  let symmetry = false;
  let silOpacity = 0.7;
  const stats = { colors: new Set<string>(), textures: new Set<string>(), strokes: 0, symmetry: false };
  const undo: UndoRect[][] = [];
  const redo: UndoRect[][] = [];
  silC.style.opacity = String(silOpacity);

  // ---------- Interface ----------
  const undoBtn = button('↶', () => doUndo(), 'icon-btn');
  const redoBtn = button('↷', () => doRedo(), 'icon-btn');
  const symBtn = button('🪞', () => {
    symmetry = !symmetry;
    symBtn.classList.toggle('on', symmetry);
    guide.classList.toggle('show', symmetry);
    toast(symmetry ? 'Simetria ligada: desenhe de um lado, aparece do outro 🪞' : 'Simetria desligada');
  }, 'icon-btn');
  const guide = h('div', { class: 'sym-guide' });
  board.append(guide);
  const layersBtn = button('👁️', () => openLayers(), 'icon-btn');

  const toolbar = h('div', { class: 'toolbar' });
  const options = h('div', { class: 'tool-options' });
  const sizeInput = h('input', { type: 'range', class: 'size', min: 1, max: 10, value: 5 }) as HTMLInputElement;
  const sizeDot = h('span', { class: 'size-dot' });
  const sizeRow = h('div', { class: 'size-row' }, h('span', {}, 'Tamanho'), sizeInput, sizeDot);
  const paletteEl = h('div', { class: 'palette' });

  const el = h('div', { class: 'draw-screen' },
    h('header', { class: 'topbar' },
      button('←', () => nav.back(), 'icon-btn'),
      undoBtn, redoBtn, symBtn, layersBtn,
      button('⤢', () => fitView(), 'icon-btn'),
      button('Pronto ✓', () => finish(), 'btn primary small'),
    ),
    session.brief ? h('div', { class: 'brief-chip' }, `🎯 ${session.brief.text}`) : null,
    stage,
    h('div', { class: 'draw-panel' }, options, sizeRow, paletteEl, toolbar),
  );

  function renderToolbar() {
    toolbar.innerHTML = '';
    const lvl = levelIndex();
    for (const t of TOOLS) {
      const locked = t.level !== undefined && lvl < t.level;
      const b = h('button', { class: 'tool' + (t === tool ? ' on' : '') + (locked ? ' locked' : '') },
        h('span', { class: 'ti' }, t.icon), h('small', {}, locked ? lockBadge(t.level!) : t.label));
      b.addEventListener('click', () => {
        if (locked) { sfx.lock(); toast(`O Glitter desbloqueia no nível ${t.level! + 1} ✨`); return; }
        sfx.tap(); tool = t; renderToolbar(); renderOptions();
      });
      toolbar.append(b);
    }
  }

  function renderOptions() {
    options.innerHTML = '';
    sizeRow.style.display = tool.max ? '' : 'none';
    if (tool.max) {
      sizeInput.min = String(tool.min); sizeInput.max = String(tool.max);
      sizeInput.value = String(sizes[tool.id]);
      updateDot();
    }
    if (tool.id === 'fabric' || tool.id === 'fill') {
      const list = tool.id === 'fill' ? [{ id: 'solid', label: 'Cor lisa', level: 0 }, ...TEXTURES] : TEXTURES;
      for (const t of list) {
        const locked = !isUnlocked(t);
        const cur = tool.id === 'fill' ? fillWith : fabric;
        const sw = h('button', { class: 'fab' + (cur === t.id ? ' on' : '') + (locked ? ' locked' : '') });
        if (t.id === 'solid') sw.style.background = color;
        else sw.style.backgroundImage = `url(${patternTile(t.id, color, 48).toDataURL()})`;
        sw.append(h('small', {}, locked ? '🔒' : t.label));
        sw.addEventListener('click', () => {
          if (locked) { sfx.lock(); toast(`${t.label} desbloqueia no nível ${t.level + 1}`); return; }
          sfx.tap();
          if (tool.id === 'fill') fillWith = t.id; else fabric = t.id;
          renderOptions();
        });
        options.append(sw);
      }
    } else if (tool.id === 'eraser') {
      for (const [id, label] of [['all', 'Apagar tudo'], ['color', 'Só a cor'], ['ink', 'Só o traço']] as const) {
        options.append(button(label, () => { eraseWhat = id; renderOptions(); }, 'chip' + (eraseWhat === id ? ' on' : '')));
      }
    } else {
      options.append(h('div', { class: 'tool-tip' }, {
        pencil: 'Lápis de rascunho — vai na camada de traço.',
        pen: 'Caneta nanquim: rápido = fino, devagar = grosso.',
        marker: 'Marcador: pinta por baixo do traço sem borrar a linha.',
        water: 'Aquarela: suave e transparente, ótimo para sombras.',
        glitter: 'Brilho de lantejoula ✨',
      }[tool.id as string] ?? ''));
    }
  }

  function updateDot() {
    const v = Number(sizeInput.value);
    sizeDot.style.width = sizeDot.style.height = Math.max(4, Math.min(36, v * 0.6)) + 'px';
    sizeDot.style.background = color;
  }
  sizeInput.addEventListener('input', () => { sizes[tool.id] = Number(sizeInput.value); updateDot(); });

  function renderPalette() {
    paletteEl.innerHTML = '';
    const colors = [...PALETTE];
    const cc = session.brief?.color?.hex;
    if (cc && !colors.includes(cc)) colors.unshift(cc);
    for (const c of colors) {
      const s = h('button', { class: 'swatch' + (c === color ? ' on' : '') + (c === cc ? ' star' : ''), style: `background:${c}` });
      s.addEventListener('click', () => { sfx.tap(); color = c; renderPalette(); updateDot(); if (tool.id === 'fabric' || tool.id === 'fill') renderOptions(); });
      paletteEl.append(s);
    }
    const custom = h('input', { type: 'color', class: 'swatch custom', value: color }) as HTMLInputElement;
    custom.addEventListener('input', () => { color = custom.value; updateDot(); });
    custom.addEventListener('change', () => { renderPalette(); if (tool.id === 'fabric' || tool.id === 'fill') renderOptions(); });
    paletteEl.append(h('label', { class: 'custom-wrap', title: 'Outra cor' }, '🎨', custom));
  }

  // ---------- Zoom / enquadramento ----------
  const view = { s: 1, tx: 0, ty: 0 };
  let fitS = 1;
  function applyView() { board.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.s})`; }
  function fitView() {
    const r = stage.getBoundingClientRect();
    if (!r.width) return;
    fitS = Math.min(r.width / W, r.height / H);
    view.s = fitS;
    view.tx = (r.width - W * fitS) / 2;
    view.ty = (r.height - H * fitS) / 2;
    applyView();
  }
  const ro = new ResizeObserver(() => fitView());
  ro.observe(stage);

  // ---------- Desenho ----------
  interface P { x: number; y: number; t: number }
  let active: null | {
    pts: P[]; lastMid: { x: number; y: number }; lastW: number; start: number;
    minX: number; minY: number; maxX: number; maxY: number; eraseSnap?: Record<LayerId, ImageData>;
  } = null;
  const pointers = new Map<number, { x: number; y: number }>();
  let gesture: null | { d: number; mx: number; my: number; s: number; tx: number; ty: number } = null;

  function toBoard(cx: number, cy: number) {
    const r = board.getBoundingClientRect();
    return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H };
  }

  const toolAlpha = () => ({ marker: 0.6, water: 0.38, pencil: 0.85 } as Record<string, number>)[tool.id] ?? 1;
  const curSize = () => sizes[tool.id];

  function strokeStyleFor(ctx: CanvasRenderingContext2D): string | CanvasPattern {
    if (tool.id === 'pencil') return ctx.createPattern(grainTile(color), 'repeat')!;
    if (tool.id === 'fabric') return makePattern(ctx, fabric, color, W / 700);
    return color;
  }

  function eraseTargets(): LayerId[] { return eraseWhat === 'all' ? ['color', 'ink'] : [eraseWhat]; }

  function grow(x: number, y: number, r: number) {
    if (!active) return;
    const xs = symmetry ? [x, W - x] : [x];
    for (const xx of xs) {
      active.minX = Math.min(active.minX, xx - r); active.maxX = Math.max(active.maxX, xx + r);
      active.minY = Math.min(active.minY, y - r); active.maxY = Math.max(active.maxY, y + r);
    }
  }

  function paintSeg(ctx: CanvasRenderingContext2D, a: { x: number; y: number }, ctrl: { x: number; y: number }, b: { x: number; y: number }, w: number) {
    const draw = (m: (x: number) => number) => {
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(m(a.x), a.y);
      ctx.quadraticCurveTo(m(ctrl.x), ctrl.y, m(b.x), b.y);
      ctx.stroke();
    };
    draw((x) => x);
    if (symmetry) draw((x) => W - x);
  }

  function glitterAt(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    const n = 3;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * r;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      const sz = 1 + Math.random() * r * 0.12;
      const light = Math.random() < 0.35;
      for (const xx of symmetry ? [px, W - px] : [px]) {
        ctx.fillStyle = light ? '#ffffff' : color;
        ctx.globalAlpha = 0.6 + Math.random() * 0.4;
        if (Math.random() < 0.15) { // estrelinha
          ctx.fillRect(xx - sz * 2, py - 0.6, sz * 4, 1.2);
          ctx.fillRect(xx - 0.6, py - sz * 2, 1.2, sz * 4);
        } else {
          ctx.beginPath(); ctx.arc(xx, py, sz, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function begin(cx: number, cy: number) {
    const p = { ...toBoard(cx, cy), t: performance.now() };
    if (tool.id === 'fill') { doFill(p.x, p.y); return; }
    active = { pts: [p], lastMid: p, lastW: curSize(), start: p.t, minX: p.x, minY: p.y, maxX: p.x, maxY: p.y };
    const r = curSize();
    grow(p.x, p.y, r * 2 + 4);
    if (tool.id === 'eraser') {
      active.eraseSnap = {} as Record<LayerId, ImageData>;
      for (const l of eraseTargets()) active.eraseSnap[l] = ctxOf(l).getImageData(0, 0, W, H);
      for (const l of eraseTargets()) {
        const c = ctxOf(l);
        c.save(); c.globalCompositeOperation = 'destination-out'; dot(c, p.x, p.y, r / 2); c.restore();
      }
      return;
    }
    // A pincelada é desenhada numa camada temporária logo acima da camada de destino
    layers[tool.layer].after(strokeC);
    strokeC.style.opacity = String(toolAlpha());
    strokeC.style.filter = tool.id === 'water' ? `blur(${Math.max(1, r * 0.06)}px)` : 'none';
    sctx.clearRect(0, 0, W, H);
    sctx.lineCap = 'round'; sctx.lineJoin = 'round';
    sctx.strokeStyle = strokeStyleFor(sctx);
    sctx.fillStyle = sctx.strokeStyle;
    if (tool.id === 'glitter') glitterAt(sctx, p.x, p.y, r);
    else dot(sctx, p.x, p.y, widthFor(0) / 2);
  }

  function dot(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
    for (const xx of symmetry ? [x, W - x] : [x]) { c.beginPath(); c.arc(xx, y, Math.max(0.5, r), 0, Math.PI * 2); c.fill(); }
  }

  function widthFor(speed: number) {
    const s = curSize();
    switch (tool.id) {
      case 'pen': return Math.max(s * 0.5, s * (1.4 - Math.min(0.9, speed * 0.6)));
      case 'marker': return s;
      case 'water': return s;
      case 'fabric': return s;
      default: return s;
    }
  }

  function move(cx: number, cy: number) {
    if (!active) return;
    const p = { ...toBoard(cx, cy), t: performance.now() };
    const prev = active.pts[active.pts.length - 1];
    const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
    if (dist < 1.2) return;
    active.pts.push(p);
    const mid = { x: (prev.x + p.x) / 2, y: (prev.y + p.y) / 2 };
    const r = curSize();
    grow(p.x, p.y, r * 2 + 4);

    if (tool.id === 'eraser') {
      for (const l of eraseTargets()) {
        const c = ctxOf(l);
        c.save(); c.globalCompositeOperation = 'destination-out';
        c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#000';
        paintSeg(c, active.lastMid, prev, mid, r);
        c.restore();
      }
    } else if (tool.id === 'glitter') {
      const steps = Math.ceil(dist / (r * 0.35));
      for (let i = 1; i <= steps; i++) glitterAt(sctx, prev.x + (p.x - prev.x) * (i / steps), prev.y + (p.y - prev.y) * (i / steps), r);
    } else {
      const speed = dist / Math.max(1, p.t - prev.t); // px por ms
      const target = widthFor(speed * (900 / W));
      const w = active.lastW + (target - active.lastW) * 0.35;
      active.lastW = w;
      paintSeg(sctx, active.lastMid, prev, mid, w);
    }
    active.lastMid = mid;
  }

  function rectOf(a: { minX: number; minY: number; maxX: number; maxY: number }) {
    const x = Math.max(0, Math.floor(a.minX)), y = Math.max(0, Math.floor(a.minY));
    const x2 = Math.min(W, Math.ceil(a.maxX)), y2 = Math.min(H, Math.ceil(a.maxY));
    return { x, y, w: Math.max(1, x2 - x), h: Math.max(1, y2 - y) };
  }

  function pushUndo(entry: UndoRect[]) {
    undo.push(entry);
    if (undo.length > 25) undo.shift();
    redo.length = 0;
    refreshUndo();
  }

  function end(cancel = false) {
    if (!active) return;
    const a = active;
    // completa o último pedacinho do traço (do ponto médio até o dedo)
    const lastP = a.pts[a.pts.length - 1];
    if (!cancel && a.pts.length > 1) {
      if (tool.id === 'eraser') {
        for (const l of eraseTargets()) {
          const c = ctxOf(l);
          c.save(); c.globalCompositeOperation = 'destination-out';
          c.lineCap = 'round'; c.strokeStyle = '#000';
          paintSeg(c, a.lastMid, lastP, lastP, curSize());
          c.restore();
        }
      } else if (tool.id !== 'glitter') {
        paintSeg(sctx, a.lastMid, lastP, lastP, a.lastW);
      }
    }
    active = null;
    const R = rectOf(a);
    if (tool.id === 'eraser') {
      const snaps = a.eraseSnap!;
      if (cancel) {
        for (const l of Object.keys(snaps) as LayerId[]) ctxOf(l).putImageData(snaps[l], 0, 0);
        return;
      }
      const entry: UndoRect[] = [];
      for (const l of Object.keys(snaps) as LayerId[]) {
        const tmp = new OffscreenCanvasLike(snaps[l]);
        entry.push({ layer: l, x: R.x, y: R.y, data: tmp.crop(R.x, R.y, R.w, R.h) });
      }
      pushUndo(entry);
      stats.strokes++;
      return;
    }
    if (cancel) { sctx.clearRect(0, 0, W, H); strokeC.remove(); return; }
    const c = ctxOf(tool.layer);
    pushUndo([{ layer: tool.layer, x: R.x, y: R.y, data: c.getImageData(R.x, R.y, R.w, R.h) }]);
    c.save();
    c.globalAlpha = toolAlpha();
    if (tool.id === 'water') c.filter = `blur(${Math.max(1, curSize() * 0.06)}px)`;
    c.drawImage(strokeC, 0, 0);
    c.restore();
    sctx.clearRect(0, 0, W, H);
    strokeC.remove();
    stats.strokes++;
    stats.colors.add(color);
    if (tool.id === 'fabric') stats.textures.add(fabric);
    if (symmetry) stats.symmetry = true;
  }

  function doFill(x: number, y: number) {
    const comp = document.createElement('canvas');
    comp.width = W; comp.height = H;
    const g = comp.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(layers.color, 0, 0); g.drawImage(layers.ink, 0, 0);
    const res = floodMask(g.getImageData(0, 0, W, H), x, y, Math.max(2, Math.round(W / 300)), Math.round(W / 300) + 1);
    if (!res) return;
    const area = (res.maxX - res.minX + 1) * (res.maxY - res.minY + 1);
    const R = { x: res.minX, y: res.minY, w: res.maxX - res.minX + 1, h: res.maxY - res.minY + 1 };
    // pinta a máscara
    const paint = document.createElement('canvas');
    paint.width = W; paint.height = H;
    const pg = paint.getContext('2d')!;
    pg.fillStyle = fillWith === 'solid' ? color : makePattern(pg, fillWith, color, W / 700);
    pg.fillRect(R.x, R.y, R.w, R.h);
    const pd = pg.getImageData(R.x, R.y, R.w, R.h);
    for (let yy = 0; yy < R.h; yy++) {
      for (let xx = 0; xx < R.w; xx++) {
        if (!res.mask[(yy + R.y) * W + xx + R.x]) pd.data[(yy * R.w + xx) * 4 + 3] = 0;
      }
    }
    pg.clearRect(0, 0, W, H);
    pg.putImageData(pd, R.x, R.y);
    const c = ctxOf('color');
    pushUndo([{ layer: 'color', x: R.x, y: R.y, data: c.getImageData(R.x, R.y, R.w, R.h) }]);
    c.drawImage(paint, 0, 0);
    stats.strokes++;
    stats.colors.add(color);
    if (fillWith !== 'solid') stats.textures.add(fillWith);
    sfx.pop();
    if (area > W * H * 0.9) toast('Pintou tudo? Feche bem as linhas — ou toque em ↶ para desfazer');
  }

  function swap(entry: UndoRect[]): UndoRect[] {
    return entry.map((u) => {
      const c = ctxOf(u.layer);
      const cur = c.getImageData(u.x, u.y, u.data.width, u.data.height);
      c.putImageData(u.data, u.x, u.y);
      return { ...u, data: cur };
    });
  }
  function doUndo() { const e = undo.pop(); if (!e) return; redo.push(swap(e)); refreshUndo(); }
  function doRedo() { const e = redo.pop(); if (!e) return; undo.push(swap(e)); refreshUndo(); }
  function refreshUndo() { undoBtn.disabled = !undo.length; redoBtn.disabled = !redo.length; }
  refreshUndo();

  // ---------- Toques ----------
  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      begin(e.clientX, e.clientY);
    } else if (pointers.size === 2) {
      // segundo dedo: vira gesto de zoom (cancela a pincelada se ela acabou de começar)
      if (active) end(active.pts.length < 10 || performance.now() - active.start < 250);
      const [a, b] = [...pointers.values()];
      gesture = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, s: view.s, tx: view.tx, ty: view.ty };
    }
  });
  stage.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (gesture && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const s = Math.min(fitS * 6, Math.max(fitS * 0.7, gesture.s * (d / gesture.d)));
      const sr = stage.getBoundingClientRect();
      const ox = gesture.mx - sr.left, oy = gesture.my - sr.top;
      view.s = s;
      view.tx = ox - (ox - gesture.tx) * (s / gesture.s) + (mx - gesture.mx);
      view.ty = oy - (oy - gesture.ty) * (s / gesture.s) + (my - gesture.my);
      applyView();
    } else if (active) {
      const evs = (e as PointerEvent).getCoalescedEvents?.() ?? [e];
      for (const ev of evs.length ? evs : [e]) move(ev.clientX, ev.clientY);
    }
  });
  const up = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (active && pointers.size === 0) end(e.type === 'pointercancel');
    if (pointers.size < 2) gesture = null;
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);

  // ---------- Camadas / silhueta ----------
  function openLayers() {
    const op = h('input', { type: 'range', min: 0, max: 100, value: Math.round(silOpacity * 100) }) as HTMLInputElement;
    op.addEventListener('input', () => { silOpacity = Number(op.value) / 100; silC.style.opacity = String(silOpacity); });
    const toggle = (l: LayerId, label: string) => {
      const cb = h('input', { type: 'checkbox' }) as HTMLInputElement;
      cb.checked = layers[l].style.visibility !== 'hidden';
      cb.addEventListener('change', () => { layers[l].style.visibility = cb.checked ? 'visible' : 'hidden'; });
      return h('label', { class: 'check' }, cb, label);
    };
    modal({
      title: 'Camadas',
      body: h('div', { class: 'layers-box' },
        h('label', {}, 'Transparência da silhueta'), op,
        toggle('ink', 'Mostrar traço (lápis e caneta)'),
        toggle('color', 'Mostrar cor (marcador, aquarela, tecido…)'),
        h('p', { class: 'muted' }, 'Dica: o traço fica sempre por cima da cor, então você pode pintar sem medo de borrar as linhas.'),
      ),
      actions: [{ label: 'Fechar', primary: true }],
    });
  }

  // ---------- Finalizar ----------
  function compose(withWhite: boolean, silAlpha: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d')!;
    if (withWhite) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); }
    if (silAlpha > 0) { g.globalAlpha = silAlpha; g.drawImage(silC, 0, 0); g.globalAlpha = 1; }
    if (layers.color.style.visibility !== 'hidden') g.drawImage(layers.color, 0, 0);
    if (layers.ink.style.visibility !== 'hidden') g.drawImage(layers.ink, 0, 0);
    return c;
  }

  function finish() {
    if (stats.strokes === 0) { toast('Desenhe alguma coisa primeiro ✏️'); return; }
    const suggestion = `Look ${pick(LOOK_NAMES)}`;
    const input = h('input', { class: 'text-input', value: suggestion, maxlength: 40 }) as HTMLInputElement;
    modal({
      title: 'Que nome tem esse look?',
      body: h('div', {}, input, h('p', { class: 'muted' }, 'Depois ele desfila na passarela e o júri dá as notas! 🌟')),
      actions: [
        { label: 'Continuar desenhando' },
        { label: 'Desfilar! 💃', primary: true, onClick: () => go(input.value.trim() || suggestion) },
      ],
    });
    setTimeout(() => input.select(), 50);
  }

  function go(name: string) {
    const final = compose(true, silC.style.opacity === '0' ? 0 : silOpacity);
    const sprite = compose(false, 1);
    const cc = session.brief?.color?.hex;
    const usedChallengeColor = !!cc && [...stats.colors].some((c) => colorDist(c, cc) < 60);
    const input: RunwayInput = {
      name, final, sprite,
      stats: { colors: stats.colors.size, textures: stats.textures.size, strokes: stats.strokes, symmetry: stats.symmetry, usedChallengeColor },
    };
    dirty = false;
    nav.replace(() => runwayScreen(input));
  }

  let dirty = true;
  renderToolbar(); renderOptions(); renderPalette();
  requestAnimationFrame(fitView);

  return {
    el,
    back() {
      if (dirty && stats.strokes > 0) {
        confirmBox('Sair do croqui?', 'O desenho ainda não foi salvo. Quer mesmo voltar para a pose?', 'Sair', () => { dirty = false; nav.pop(); }, 'Ficar');
        return true;
      }
      return false;
    },
    destroy() { ro.disconnect(); },
  };
}

function colorDist(a: string, b: string) {
  const p = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

/** Recorta um pedaço de um ImageData sem precisar de canvas. */
class OffscreenCanvasLike {
  constructor(private img: ImageData) {}
  crop(x: number, y: number, w: number, h: number): ImageData {
    const out = new ImageData(w, h);
    const src = this.img.data, W = this.img.width;
    for (let r = 0; r < h; r++) {
      const s = ((y + r) * W + x) * 4;
      out.data.set(src.subarray(s, s + w * 4), r * w * 4);
    }
    return out;
  }
}
