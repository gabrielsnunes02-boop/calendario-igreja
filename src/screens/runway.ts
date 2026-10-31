// Tela 3: o croqui desfila na passarela 3D, o júri dá as notas e ela ganha XP.
import * as THREE from 'three';
import { nav, Screen } from '../nav';
import { button, confetti, confirmBox, h, lockBadge, modal, toast } from '../ui';
import { sfx, runwayBeat } from '../audio';
import { session } from '../session';
import {
  LookStats, RUNWAYS, achievementById, grantReward, isUnlocked, levelProgress, state, save, unlockAchievement,
} from '../game/state';
import { JURY, JURY_COMMENTS, LEVELS, pick } from '../game/content';
import { saveLook } from '../db';
import { ASSINATURA, MENSAGEM_SECRETA } from '../config';
import { homeScreen } from './home';
import { lookbookScreen } from './lookbook';
import { poseScreen } from './pose';

export interface RunwayInput {
  name: string;
  final?: HTMLCanvasElement;
  sprite: HTMLCanvasElement;
  stats?: LookStats;
  replay?: boolean;
}

const LAST_RUNWAY_KEY = 'atelie-last-runway';

export function runwayScreen(input: RunwayInput): Screen {
  const stageEl = h('div', { class: 'runway-stage' });
  const overlay = h('div', { class: 'runway-overlay' });
  const title = h('div', { class: 'runway-title' }, h('small', {}, 'Desfilando agora'), h('div', {}, input.name));
  const el = h('div', { class: 'runway-screen' }, stageEl, title, overlay);

  // ---------- Cena ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  stageEl.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 0.6, 0.1, 120);
  camera.position.set(0, 1.35, 6);
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };

  const sprite = cropToContent(input.sprite);
  const tex = track(new THREE.CanvasTexture(sprite));
  tex.colorSpace = THREE.SRGBColorSpace;
  const mh = 2.2;
  const mw = mh * (sprite.width / sprite.height);
  const model = new THREE.Group();
  const card = new THREE.Mesh(track(new THREE.PlaneGeometry(mw, mh)), track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.04, side: THREE.DoubleSide })));
  card.position.y = mh / 2;
  model.add(card);
  const shadow = new THREE.Mesh(track(new THREE.CircleGeometry(0.42, 32)), track(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.y = 0.45;
  shadow.position.y = 0.012;
  model.add(shadow);
  scene.add(model);

  const flashes: THREE.Mesh[] = [];
  let themeGroup = new THREE.Group();
  scene.add(themeGroup);
  const spot = new THREE.SpotLight(0xffffff, 60, 20, 0.45, 0.6);
  spot.position.set(0, 7, 3);
  spot.target = model;
  scene.add(spot, new THREE.AmbientLight(0xffffff, 0.35));

  function buildTheme(id: string) {
    scene.remove(themeGroup);
    themeGroup.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
    themeGroup = new THREE.Group();
    flashes.length = 0;
    const g = themeGroup;
    const T = THEMES[id] ?? THEMES.classic;
    scene.background = new THREE.Color(T.bg);
    scene.fog = new THREE.Fog(T.bg, 10, 30);

    const runwayMat = new THREE.MeshStandardMaterial({ color: T.runway, roughness: T.rough, metalness: 0.1 });
    const runway = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 26), runwayMat);
    runway.position.set(0, -0.125, -10);
    g.add(runway);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: T.floor, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.25;
    g.add(floor);
    if (T.edge) {
      for (const sx of [-1, 1]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 26), new THREE.MeshBasicMaterial({ color: sx < 0 ? T.edge[0] : T.edge[1] }));
        strip.position.set(sx * 0.92, 0.01, -10);
        g.add(strip);
      }
    }
    if (id === 'neon') {
      const grid = new THREE.GridHelper(60, 60, 0xff3ea5, 0x3a1a5a);
      grid.position.y = -0.24;
      g.add(grid);
    }
    // Fundo pintado
    const back = new THREE.Mesh(new THREE.PlaneGeometry(64, 32), new THREE.MeshBasicMaterial({ map: backdrop(id), fog: false }));
    back.position.set(0, 12, -40);
    g.add(back);
    // Plateia
    const seat = new THREE.MeshBasicMaterial({ color: T.crowd });
    const bodyGeo = new THREE.CapsuleGeometry(0.22, 0.5, 4, 8);
    const headGeo = new THREE.SphereGeometry(0.17, 10, 8);
    for (const sx of [-1, 1]) {
      for (let row = 0; row < 3; row++) {
        for (let z = -18; z < 3; z += 0.8) {
          if (Math.random() < 0.12) continue;
          const x = sx * (2.0 + row * 0.75) + (Math.random() - 0.5) * 0.15;
          const y = row * 0.3;
          const b = new THREE.Mesh(bodyGeo, seat); b.position.set(x, y + 0.25, z + (Math.random() - 0.5) * 0.2);
          const hd = new THREE.Mesh(headGeo, seat); hd.position.set(b.position.x, y + 0.82, b.position.z);
          g.add(b, hd);
          if (Math.random() < 0.3) {
            const f = new THREE.Mesh(new THREE.CircleGeometry(0.09, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false }));
            f.position.set(b.position.x - sx * 0.2, y + 0.75, b.position.z + 0.15);
            f.lookAt(camera.position);
            g.add(f);
            flashes.push(f);
          }
        }
      }
    }
    // Luzes de cor do cenário
    for (const [i, c] of T.lights.entries()) {
      const l = new THREE.PointLight(c, 18, 14);
      l.position.set(i % 2 ? 2.5 : -2.5, 3, -2 - i * 5);
      g.add(l);
    }
    scene.add(g);
  }

  function resize() {
    const r = stageEl.getBoundingClientRect();
    if (!r.width) return;
    renderer.setSize(r.width, r.height);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stageEl);

  // ---------- Animação ----------
  let phase: 'idle' | 'walk' | 'pose' | 'done' = 'idle';
  let t = 0;
  const WALK = 6.5;
  const START_Z = -15, END_Z = 1.6;
  model.position.z = START_Z;
  let running = true;
  let last = performance.now();
  let flashRate = 0.6;
  let stopBeat: () => void = () => {};

  function loop(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    if (phase === 'walk') {
      const k = Math.min(1, t / WALK);
      const e = k < 0.85 ? k / 0.85 * 0.9 : 0.9 + (1 - Math.pow(1 - (k - 0.85) / 0.15, 2)) * 0.1;
      model.position.z = START_Z + (END_Z - START_Z) * e;
      const step = t * Math.PI * 2 * 1.05;
      const amp = k < 0.97 ? 1 : 0;
      card.position.y = mh / 2 + Math.abs(Math.sin(step)) * 0.06 * amp;
      card.rotation.z = Math.sin(step) * 0.035 * amp;
      card.position.x = Math.sin(step) * 0.05 * amp;
      shadow.scale.x = 1 - Math.abs(Math.sin(step)) * 0.12 * amp;
      if (k >= 1) { phase = 'pose'; t = 0; onPose(); }
    } else if (phase === 'pose' || phase === 'done') {
      card.rotation.z *= 0.9;
      card.position.x *= 0.9;
      card.position.y = mh / 2 + Math.sin(t * 2) * 0.01;
    }
    // câmera acompanha
    const tz = model.position.z + 6.2;
    camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 2.5);
    camera.position.x = Math.sin(now / 2200) * 0.25;
    camera.lookAt(0, 1.05, model.position.z);
    spot.position.z = model.position.z + 3;
    // flashes da plateia
    for (const f of flashes) {
      const m = f.material as THREE.MeshBasicMaterial;
      if (m.opacity > 0) m.opacity = Math.max(0, m.opacity - dt * 7);
      else if (phase !== 'idle' && Math.random() < dt * flashRate * 0.25) { m.opacity = 1; if (Math.random() < 0.08) sfx.shutter(); }
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  // ---------- Fluxo ----------
  let theme = localStorage.getItem(LAST_RUNWAY_KEY) ?? 'classic';
  if (!isUnlocked(RUNWAYS.find((r) => r.id === theme) ?? RUNWAYS[0])) theme = 'classic';
  buildTheme(theme);
  requestAnimationFrame(loop);

  function showThemePicker() {
    overlay.innerHTML = '';
    const row = h('div', { class: 'chips center' });
    for (const r of RUNWAYS) {
      const locked = !isUnlocked(r);
      const b = h('button', { class: 'chip dark' + (theme === r.id ? ' on' : '') + (locked ? ' locked' : '') }, r.label);
      if (locked) b.append(h('small', {}, lockBadge(r.level)));
      b.addEventListener('click', () => {
        if (locked) { sfx.lock(); toast(`Cenário ${r.label} desbloqueia no nível ${r.level + 1}`); return; }
        sfx.tap(); theme = r.id; try { localStorage.setItem(LAST_RUNWAY_KEY, theme); } catch { /* */ }
        buildTheme(theme); showThemePicker();
      });
      row.append(b);
    }
    overlay.append(h('div', { class: 'runway-start' },
      h('p', {}, 'Escolha o cenário do desfile'), row,
      button('▶ Começar o desfile', () => startWalk(), 'btn primary big')));
  }

  function startWalk() {
    overlay.innerHTML = '';
    phase = 'walk'; t = 0;
    stopBeat = runwayBeat();
    title.classList.add('show');
  }

  function onPose() {
    flashRate = 14;
    sfx.applause(3.5);
    for (let i = 0; i < 6; i++) setTimeout(() => sfx.shutter(), i * 180 + Math.random() * 120);
    setTimeout(() => { flashRate = 1.5; }, 1800);
    setTimeout(() => { stopBeat(); input.replay ? showReplayEnd() : showJury(); }, 1600);
  }

  function showReplayEnd() {
    phase = 'done';
    overlay.innerHTML = '';
    overlay.append(h('div', { class: 'result-card' },
      h('h2', {}, '👏 Que desfile!'),
      h('div', { class: 'result-actions' },
        button('Desfilar de novo', () => restart(), 'btn ghost'),
        button('Voltar', () => nav.pop(), 'btn primary'),
      )));
  }

  function restart() {
    overlay.innerHTML = '';
    model.position.z = START_Z;
    camera.position.z = START_Z + 6.2;
    phase = 'idle';
    title.classList.remove('show');
    showThemePicker();
  }

  // ---------- Júri ----------
  function scoreJudges(stats: LookStats) {
    const feats: [keyof typeof JURY_COMMENTS, number][] = [
      ['colors', stats.colors >= 4 ? 1 : stats.colors >= 3 ? 0.5 : 0],
      ['textures', stats.textures >= 2 ? 1 : stats.textures >= 1 ? 0.6 : 0],
      ['detail', stats.strokes >= 60 ? 1 : stats.strokes >= 25 ? 0.5 : 0],
      ['challenge', session.mode === 'challenge' && stats.usedChallengeColor ? 1.2 : 0],
      ['minimal', stats.strokes < 18 && stats.colors <= 2 ? 0.8 : 0],
    ];
    const bonus = feats.reduce((a, [, v]) => a + v, 0) * 0.55;
    const sorted = [...feats].sort((a, b) => b[1] - a[1]);
    return JURY.map((j, i) => {
      const raw = 3 + bonus + (Math.random() * 1.6 - 0.4);
      const stars = Math.max(3, Math.min(5, Math.round(raw)));
      const cat = sorted[i] && sorted[i][1] > 0 && Math.random() < 0.8 ? sorted[i][0] : 'general';
      return { ...j, stars, comment: pick(JURY_COMMENTS[cat]) };
    });
  }

  let busy = false;
  async function showJury() {
    phase = 'done';
    busy = true;
    const stats = input.stats!;
    const judges = scoreJudges(stats);
    const total = judges.reduce((a, j) => a + j.stars, 0);
    overlay.innerHTML = '';
    const box = h('div', { class: 'jury' }, h('h2', {}, 'O júri decidiu…'));
    overlay.append(box);
    for (const [i, j] of judges.entries()) {
      const stars = h('div', { class: 'stars' });
      const cardEl = h('div', { class: 'judge' },
        h('div', { class: 'judge-face' }, j.emoji),
        h('div', {}, h('b', {}, j.name), stars, h('p', { class: 'comment' }, `“${j.comment}”`)));
      box.append(cardEl);
      await wait(350);
      cardEl.classList.add('in');
      for (let s = 0; s < 5; s++) {
        await wait(170);
        const on = s < j.stars;
        stars.append(h('span', { class: on ? 'on' : '' }, '★'));
        if (on) sfx.star(s + i);
      }
      await wait(200);
    }
    await wait(500);

    // salva e dá a recompensa
    const reward = grantReward(session.mode, stats, total);
    const final = input.final!;
    const [img, spr] = await Promise.all([toBlob(final), toBlob(input.sprite)]);
    const subtitle = session.brief ? `${session.brief.title}: ${session.brief.text}` : 'Criação livre';
    await saveLook({ id: crypto.randomUUID?.() ?? String(Date.now()), name: input.name, created: Date.now(), mode: session.mode, subtitle, stars: total, image: img, sprite: spr }).catch(() => toast('Não consegui salvar no Lookbook 😕'));

    busy = false;
    box.append(button('Ver minhas recompensas ✨', () => showReward(reward, total), 'btn primary big'));
  }

  function showReward(reward: ReturnType<typeof grantReward>, total: number) {
    overlay.innerHTML = '';
    const lp = levelProgress();
    const bar = h('div', { class: 'xpbar' }, h('i', { style: `width:${Math.round(lp.pct * 100)}%` }));
    const lines = h('ul', { class: 'xp-lines' });
    const xpNum = h('div', { class: 'xp-big' }, '+0 XP');
    overlay.append(h('div', { class: 'result-card' },
      h('div', { class: 'total-stars' }, `${'★'.repeat(Math.round(total / 3))} ${total}/15`),
      xpNum, lines,
      h('div', { class: 'level-line' }, h('b', {}, lp.name), lp.next ? h('small', {}, ` ${state.xp}/${lp.next} XP`) : h('small', {}, ' nível máximo!')),
      bar,
      h('div', { class: 'result-actions' },
        button('🏠 Início', () => nav.reset(homeScreen), 'btn ghost'),
        button('📖 Lookbook', () => { nav.reset(homeScreen); nav.push(lookbookScreen); }, 'btn ghost'),
        button('✏️ Novo croqui', () => { nav.reset(homeScreen); nav.push(poseScreen); }, 'btn primary'),
      )));
    // contagem animada
    let shown = 0;
    const id = setInterval(() => {
      shown = Math.min(reward.xp, shown + Math.ceil(reward.xp / 30));
      xpNum.textContent = `+${shown} XP`;
      if (shown >= reward.xp) clearInterval(id);
    }, 30);
    reward.lines.forEach((l, i) => setTimeout(() => { lines.append(h('li', {}, l)); sfx.pop(); }, 300 + i * 260));

    const after = 300 + reward.lines.length * 260 + 300;
    reward.newAchievements.forEach((a, i) => setTimeout(() => {
      const ach = achievementById(a);
      sfx.achievement();
      toast(`${ach.icon} Conquista: ${ach.name}!`);
    }, after + i * 2600));
    if (reward.levelUp !== null) {
      const lvl = reward.levelUp;
      setTimeout(() => {
        sfx.levelUp(); confetti(120);
        modal({
          title: `🎉 Subiu de nível!`,
          body: h('div', { class: 'levelup' },
            h('div', { class: 'lvl-name' }, LEVELS[lvl].name),
            LEVELS[lvl].unlock ? h('p', {}, `Desbloqueado: ${LEVELS[lvl].unlock}`) : null),
          actions: [{ label: 'Uhuul!', primary: true, onClick: () => { if (lvl === LEVELS.length - 1) showSecret(); } }],
        });
      }, after + reward.newAchievements.length * 2600);
    } else if (total >= 14) {
      setTimeout(() => confetti(60), after);
    }
  }

  showThemePicker();

  return {
    el,
    back() {
      if (phase === 'walk' || busy) return true;
      if (input.replay) return false;
      if (phase === 'idle') {
        confirmBox('Sair sem desfilar?', 'O look só é salvo no Lookbook depois do desfile.', 'Sair', () => nav.reset(homeScreen), 'Ficar');
        return true;
      }
      nav.reset(homeScreen);
      return true;
    },
    destroy() {
      running = false;
      stopBeat();
      ro.disconnect();
      themeGroup.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

export function showSecret() {
  unlockAchievement('secret');
  save();
  confetti(100);
  sfx.levelUp();
  modal({
    title: '💌 Uma mensagem pra você',
    body: h('div', { class: 'secret' }, h('p', {}, MENSAGEM_SECRETA), h('p', { class: 'sign' }, ASSINATURA)),
    actions: [{ label: '❤️', primary: true }],
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/png'));

function cropToContent(src: HTMLCanvasElement): HTMLCanvasElement {
  const g = src.getContext('2d')!;
  const { width: W, height: H } = src;
  const d = g.getImageData(0, 0, W, H).data;
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 10) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return src;
  const pad = 6;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
  const out = document.createElement('canvas');
  out.width = maxX - minX + 1; out.height = maxY - minY + 1;
  out.getContext('2d')!.drawImage(src, -minX, -minY);
  return out;
}

interface Theme { bg: number; runway: number; floor: number; rough: number; crowd: number; lights: number[]; edge?: [number, number] }

const THEMES: Record<string, Theme> = {
  classic: { bg: 0x120c10, runway: 0xf2ece8, floor: 0x0d090b, rough: 0.25, crowd: 0x07050a, lights: [0xffc9a8, 0xffffff, 0xffb0c8, 0xffffff] },
  beach: { bg: 0xf59a7a, runway: 0xc59468, floor: 0xe8cf9f, rough: 0.8, crowd: 0x5a3550, lights: [0xffd27a, 0xff9fb0, 0xffd27a] },
  neon: { bg: 0x07020f, runway: 0x0d0a14, floor: 0x050208, rough: 0.15, crowd: 0x1a0a2a, lights: [0xff2fa0, 0x2ff0ff, 0xb44dff, 0x2ff0ff], edge: [0xff2fa0, 0x2ff0ff] },
  paris: { bg: 0x141c3a, runway: 0xd9d6de, floor: 0x10162c, rough: 0.35, crowd: 0x060914, lights: [0xffe2a8, 0xa8c4ff, 0xffe2a8] },
};

function backdrop(id: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d')!;
  const grad = (stops: [number, string][]) => {
    const gr = g.createLinearGradient(0, 0, 0, 512);
    stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  };
  if (id === 'beach') {
    grad([[0, '#6b4aa8'], [0.45, '#f57e8e'], [0.7, '#ffc77a'], [0.72, '#2f7fb8'], [1, '#1e5a8a']]);
    g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(512, 360, 70, Math.PI, 0); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 1024, 370 + Math.random() * 140, 30 + Math.random() * 60, 2);
    palm(g, 120, 470, 1); palm(g, 900, 470, -1);
  } else if (id === 'neon') {
    grad([[0, '#05010c'], [1, '#1a0630']]);
    g.strokeStyle = '#ff2fa0'; g.lineWidth = 6; g.shadowColor = '#ff2fa0'; g.shadowBlur = 25;
    g.beginPath(); g.arc(512, 300, 150, Math.PI, 0); g.stroke();
    g.strokeStyle = '#2ff0ff'; g.shadowColor = '#2ff0ff';
    g.font = 'bold 72px sans-serif'; g.textAlign = 'center';
    g.strokeText('FASHION', 512, 450);
  } else if (id === 'paris') {
    grad([[0, '#0a1028'], [1, '#2a3566']]);
    g.fillStyle = '#fff';
    for (let i = 0; i < 160; i++) { g.globalAlpha = Math.random(); g.fillRect(Math.random() * 1024, Math.random() * 380, 2, 2); }
    g.globalAlpha = 1;
    eiffel(g, 512, 512);
    g.fillStyle = '#0a0e1e';
    for (let x = 0; x < 1024; x += 40 + Math.random() * 40) g.fillRect(x, 430 + Math.random() * 40, 36, 100);
  } else {
    grad([[0, '#1c1218'], [1, '#2a1a22']]);
    g.fillStyle = 'rgba(255,220,200,.08)';
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(80 + i * 110, 0); g.lineTo(40 + i * 110, 512); g.lineTo(140 + i * 110, 512); g.fill(); }
    g.font = 'italic 64px serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,230,220,.35)';
    g.fillText('Semana de Moda', 512, 260);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function palm(g: CanvasRenderingContext2D, x: number, y: number, dir: number) {
  g.strokeStyle = '#2a1830'; g.lineWidth = 12; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + dir * 30, y - 120, x + dir * 10, y - 240); g.stroke();
  g.fillStyle = '#2a1830';
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55;
    g.save(); g.translate(x + dir * 10, y - 240); g.rotate(a);
    g.beginPath(); g.ellipse(60, 0, 70, 12, 0.3, 0, Math.PI * 2); g.fill(); g.restore();
  }
}

function eiffel(g: CanvasRenderingContext2D, cx: number, base: number) {
  g.fillStyle = '#05070f';
  g.beginPath();
  g.moveTo(cx - 110, base); g.quadraticCurveTo(cx - 40, base - 140, cx - 12, base - 380);
  g.lineTo(cx - 4, base - 470); g.lineTo(cx + 4, base - 470); g.lineTo(cx + 12, base - 380);
  g.quadraticCurveTo(cx + 40, base - 140, cx + 110, base);
  g.lineTo(cx + 60, base); g.quadraticCurveTo(cx, base - 90, cx - 60, base); g.closePath(); g.fill();
  g.fillRect(cx - 62, base - 160, 124, 10);
  g.fillRect(cx - 34, base - 300, 68, 8);
  g.fillStyle = 'rgba(255,214,120,.9)';
  for (let i = 0; i < 40; i++) g.fillRect(cx - 50 + Math.random() * 100, base - Math.random() * 400, 2, 2);
}
