// Tela 1: escolher corpo, pose e ângulo do manequim 3D, e "congelar" para desenhar.
import * as THREE from 'three';
import { Mannequin, POSE_PRESETS, JointName } from '../three/mannequin';
import { BODIES, POSES, isUnlocked } from '../game/state';
import { session } from '../session';
import { nav, Screen } from '../nav';
import { button, h, lockBadge, toast } from '../ui';
import { sfx } from '../audio';
import { drawScreen } from './draw';

const SKINS = [
  { name: 'Papel', hex: 0xffffff }, { name: 'Areia', hex: 0xead9cc }, { name: 'Mel', hex: 0xd2a77e },
  { name: 'Canela', hex: 0x9a6443 }, { name: 'Ébano', hex: 0x55372b }, { name: 'Grafite', hex: 0xcfd0d6 },
];

const JOINT_LABEL: Partial<Record<JointName, string>> = {
  pelvis: 'Quadril', spine: 'Tronco', neck: 'Pescoço', head: 'Cabeça',
  shoulderL: 'Braço esq.', shoulderR: 'Braço dir.', elbowL: 'Antebraço esq.', elbowR: 'Antebraço dir.',
  wristL: 'Mão esq.', wristR: 'Mão dir.', hipL: 'Coxa esq.', hipR: 'Coxa dir.',
  kneeL: 'Perna esq.', kneeR: 'Perna dir.', ankleL: 'Pé esq.', ankleR: 'Pé dir.',
};

export function poseScreen(): Screen {
  const viewport = h('div', { class: 'viewport' });
  const hint = h('div', { class: 'hint' }, '👆 Arraste para girar · 🤏 pinça para zoom');
  viewport.append(hint);
  const tabsEl = h('div', { class: 'tabs' });
  const chips = h('div', { class: 'chips' });
  const panel = h('div', { class: 'panel' }, tabsEl, chips);

  const el = h('div', { class: 'pose-screen' },
    h('header', { class: 'topbar' },
      button('←', () => nav.back(), 'icon-btn'),
      h('div', { class: 'topbar-title' }, 'Monte a pose'),
      button('?', () => toast('Escolha corpo e pose, gire o manequim e toque em Congelar ✨'), 'icon-btn'),
    ),
    session.brief ? h('div', { class: 'brief-chip' }, `🎯 ${session.brief.title}: ${session.brief.text}`) : null,
    viewport,
    panel,
    h('div', { class: 'cta-row' }, button('❄️ Congelar e desenhar', () => freeze(), 'btn primary big')),
  );

  // ---------- Cena 3D ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  viewport.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const bg = new THREE.Color(0xf6ece6);
  scene.background = bg;
  const camera = new THREE.PerspectiveCamera(30, 0.6, 0.1, 50);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c2b8, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(2.5, 5, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1 });
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.ShadowMaterial({ opacity: 0.18 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.0, 64), new THREE.MeshBasicMaterial({ color: 0xe0567f, transparent: true, opacity: 0.35 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.002;
  scene.add(ring);

  const man = new Mannequin(session.body, session.skin);
  man.applyPose(session.pose);
  man.root.rotation.y = session.yaw;
  scene.add(man.root);

  let dist = 5.0;
  let lookY = 1.02;
  function placeCamera() {
    camera.position.set(0, lookY + 0.15, dist);
    camera.lookAt(0, lookY, 0);
  }
  placeCamera();

  function resize() {
    const r = viewport.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(viewport);

  // Animação suave entre poses
  let anim: { from: ReturnType<Mannequin['getPose']>; to: typeof session.pose; t: number } | null = null;
  let yawTarget: number | null = null;
  let running = true;
  let last = performance.now();
  function loop(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (anim) {
      anim.t = Math.min(1, anim.t + dt * 3.5);
      const e = 1 - Math.pow(1 - anim.t, 3);
      man.blendPose(anim.from, anim.to, e);
      if (anim.t >= 1) anim = null;
    }
    if (yawTarget !== null) {
      const d = yawTarget - man.root.rotation.y;
      man.root.rotation.y += d * Math.min(1, dt * 8);
      if (Math.abs(d) < 0.002) { man.root.rotation.y = yawTarget; yawTarget = null; }
      session.yaw = man.root.rotation.y;
    }
    ring.rotation.z += dt * 0.2;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ---------- Toque: girar, zoom e ajuste fino ----------
  let adjust = false;
  let selected: { joint: JointName; meshes: THREE.Mesh[] } | null = null;
  const selMat = new THREE.MeshToonMaterial({ color: 0xf7a8c4 });
  const ray = new THREE.Raycaster();
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchStart = 0, distStart = dist, midStartY = 0, lookStart = lookY;
  let draggingJoint = false;

  function pickJoint(cx: number, cy: number): JointName | null {
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(man.pickables, false)[0];
    return hit ? (hit.object.userData.joint as JointName) : null;
  }
  function select(j: JointName | null) {
    if (selected) selected.meshes.forEach((m) => (m.material = man.material));
    selected = null;
    if (!j) return;
    const meshes = man.pickables.filter((m) => m.userData.joint === j);
    meshes.forEach((m) => (m.material = selMat));
    selected = { joint: j, meshes };
    hint.textContent = `✋ ${JOINT_LABEL[j]} — arraste para mover`;
  }

  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    hint.classList.add('fade');
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
      distStart = dist; midStartY = (a.y + b.y) / 2; lookStart = lookY;
      draggingJoint = false;
    } else if (adjust) {
      const j = pickJoint(e.clientX, e.clientY);
      if (j) { select(j); draggingJoint = true; sfx.pop(); } else draggingJoint = false;
    }
  });
  cv.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      dist = THREE.MathUtils.clamp(distStart * (pinchStart / d), 2.2, 8);
      const mid = (a.y + b.y) / 2;
      lookY = THREE.MathUtils.clamp(lookStart + (mid - midStartY) * 0.004 * (dist / 5), 0.2, 1.9);
      placeCamera();
    } else if (draggingJoint && selected) {
      // Arrasto horizontal = abrir/fechar; vertical = frente/trás
      // (a parte acompanha o dedo; de costas o sentido inverte)
      const facing = Math.cos(man.root.rotation.y) >= 0 ? 1 : -1;
      man.nudge(selected.joint, dy * 0.6, dx * 0.6 * facing);
      session.pose = man.getPose();
      session.poseId = 'custom';
    } else {
      yawTarget = null;
      man.root.rotation.y += dx * 0.012;
      session.yaw = man.root.rotation.y;
    }
  });
  const up = (e: PointerEvent) => { pointers.delete(e.pointerId); if (pointers.size === 0) draggingJoint = false; };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);

  // ---------- Painel ----------
  type Tab = 'pose' | 'body' | 'skin' | 'adjust' | 'view';
  let tab: Tab = 'pose';
  const TABS: [Tab, string][] = [['pose', 'Pose'], ['body', 'Corpo'], ['view', 'Ângulo'], ['skin', 'Pele'], ['adjust', 'Ajuste fino']];

  function renderTabs() {
    tabsEl.innerHTML = '';
    for (const [id, label] of TABS) {
      tabsEl.append(button(label, () => { tab = id; setAdjust(id === 'adjust'); renderTabs(); renderChips(); }, 'tab' + (tab === id ? ' on' : '')));
    }
  }

  function chip(label: string, on: boolean, locked: number | null, onClick: () => void, extra?: string) {
    const b = h('button', { class: 'chip' + (on ? ' on' : '') + (locked !== null ? ' locked' : ''), style: extra }, label);
    if (locked !== null) b.append(h('small', {}, lockBadge(locked)));
    b.addEventListener('click', () => {
      if (locked !== null) { sfx.lock(); toast(`Desbloqueia no nível ${locked + 1}. Continue criando! ✨`); return; }
      sfx.tap();
      onClick();
    });
    return b;
  }

  function renderChips() {
    chips.innerHTML = '';
    if (tab === 'pose') {
      for (const p of POSES) {
        chips.append(chip(p.label, session.poseId === p.id, isUnlocked(p) ? null : p.level, () => {
          session.poseId = p.id;
          anim = { from: man.getPose(), to: POSE_PRESETS[p.id], t: 0 };
          session.pose = POSE_PRESETS[p.id];
          renderChips();
        }));
      }
    } else if (tab === 'body') {
      for (const b of BODIES) {
        chips.append(chip(b.label, session.body === b.id, isUnlocked(b) ? null : b.level, () => {
          session.body = b.id;
          man.setBody(b.id);
          select(null);
          renderChips();
        }));
      }
    } else if (tab === 'skin') {
      for (const s of SKINS) {
        const c = '#' + s.hex.toString(16).padStart(6, '0');
        chips.append(chip(s.name, session.skin === s.hex, null, () => {
          session.skin = s.hex;
          man.setColor(s.hex);
          renderChips();
        }, `--sw:${c}`));
      }
      chips.querySelectorAll('.chip').forEach((c) => c.classList.add('swatch-chip'));
    } else if (tab === 'view') {
      const views: [string, number][] = [['Frente', 0], ['¾ esquerda', Math.PI / 5], ['Perfil', Math.PI / 2], ['Costas', Math.PI], ['¾ direita', -Math.PI / 5]];
      for (const [label, yaw] of views) {
        chips.append(chip(label, false, null, () => {
          // menor caminho até o ângulo
          const cur = man.root.rotation.y;
          const k = Math.round((cur - yaw) / (Math.PI * 2));
          yawTarget = yaw + k * Math.PI * 2;
        }));
      }
    } else {
      chips.append(h('p', { class: 'chips-note' }, 'Toque numa parte do corpo e arraste para ajustar a pose.'));
      chips.append(chip('↺ Voltar à pose original', false, null, () => {
        const id = session.poseId === 'custom' ? 'stand' : session.poseId;
        anim = { from: man.getPose(), to: POSE_PRESETS[id], t: 0 };
        session.pose = POSE_PRESETS[id];
        session.poseId = id;
      }));
    }
  }

  function setAdjust(v: boolean) {
    adjust = v;
    if (!v) { select(null); hint.textContent = '👆 Arraste para girar · 🤏 pinça para zoom'; }
    else hint.textContent = '✋ Toque numa parte do corpo';
    hint.classList.remove('fade');
  }

  renderTabs();
  renderChips();

  // ---------- Congelar ----------
  function freeze() {
    select(null);
    sfx.freeze();
    const r = viewport.getBoundingClientRect();
    const W = Math.min(900, Math.round(r.width * Math.min(devicePixelRatio, 2)));
    const H = Math.round(W * (r.height / r.width));
    floor.visible = false; ring.visible = false;
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.render(scene, camera);
    const snap = document.createElement('canvas');
    snap.width = W; snap.height = H;
    snap.getContext('2d')!.drawImage(renderer.domElement, 0, 0);
    session.silhouette = snap;
    session.pose = man.getPose();

    // flash
    const flash = h('div', { class: 'flash' });
    el.append(flash);
    setTimeout(() => nav.push(drawScreen), 260);
  }

  return {
    el,
    destroy() {
      running = false;
      ro.disconnect();
      man.dispose();
      selMat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
