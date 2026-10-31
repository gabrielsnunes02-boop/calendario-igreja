// Manequim 3D estilizado, montado por código (sem arquivos de modelo).
// Unidade de medida interna = "cabeças" (proporção usada em croqui de moda).
import * as THREE from 'three';

export type JointName =
  | 'pelvis' | 'spine' | 'neck' | 'head'
  | 'shoulderL' | 'elbowL' | 'wristL' | 'shoulderR' | 'elbowR' | 'wristR'
  | 'hipL' | 'kneeL' | 'ankleL' | 'hipR' | 'kneeR' | 'ankleR';

export type Pose = Partial<Record<JointName, [number, number, number]>>; // graus

export interface BodySpec {
  heads: number;          // altura total em cabeças (para enquadramento)
  lowerTorso: number;     // gancho → cintura
  upperTorso: number;     // cintura → base do pescoço
  neck: number;
  thigh: number; shin: number;
  upperArm: number; forearm: number; hand: number;
  shoulderHalf: number;   // meia largura dos ombros
  waistR: number; hipR: number; chestR: number; ribR: number;
  hipJoint: number;       // distância da articulação do quadril ao centro
  limb: number;           // espessura geral dos membros
  bust: number;           // 0 = sem busto
  depth: number;          // achatamento frente/costas do tronco
  headW: number;
}

const BASE: BodySpec = {
  heads: 8, lowerTorso: 1.15, upperTorso: 1.65, neck: 0.42,
  thigh: 1.95, shin: 1.85, upperArm: 1.45, forearm: 1.25, hand: 0.62,
  shoulderHalf: 0.92, waistR: 0.55, hipR: 0.88, chestR: 0.74, ribR: 0.66,
  hipJoint: 0.45, limb: 1, bust: 1, depth: 0.62, headW: 1,
};

export const BODY_SPECS: Record<string, BodySpec> = {
  classic: BASE,
  fashion: {
    ...BASE, heads: 9.2, thigh: 2.45, shin: 2.4, upperArm: 1.6, forearm: 1.4, upperTorso: 1.75,
    waistR: 0.5, hipR: 0.8, chestR: 0.7, ribR: 0.6, limb: 0.86, neck: 0.5, shoulderHalf: 0.9,
  },
  curvy: {
    ...BASE, heads: 8, waistR: 0.66, hipR: 1.06, chestR: 0.86, ribR: 0.78, limb: 1.22,
    hipJoint: 0.52, bust: 1.35, depth: 0.7, shoulderHalf: 0.98,
  },
  masc: {
    ...BASE, heads: 8.2, shoulderHalf: 1.12, waistR: 0.68, hipR: 0.78, chestR: 0.88, ribR: 0.82,
    bust: 0, limb: 1.18, thigh: 2.0, shin: 1.95, upperArm: 1.5, forearm: 1.32, neck: 0.4,
    hipJoint: 0.42, depth: 0.66, headW: 1.05,
  },
};

const D = THREE.MathUtils.degToRad;

export const POSE_PRESETS: Record<string, Pose> = {
  stand: {
    shoulderL: [0, 0, 7], shoulderR: [0, 0, -7], elbowL: [-6, 0, 0], elbowR: [-6, 0, 0],
    hipL: [0, 0, 2], hipR: [0, 0, -2],
  },
  contrapposto: {
    pelvis: [0, 6, 5], spine: [0, -4, -8], neck: [0, 0, 4], head: [0, -8, 6],
    shoulderL: [4, 0, 9], shoulderR: [-4, 0, -6], elbowL: [-12, 0, 0], elbowR: [-8, 0, 0],
    hipL: [0, 0, -5], hipR: [-10, -6, 2], kneeR: [20, 0, 0], ankleR: [-6, 0, 0],
  },
  runway: {
    pelvis: [0, 4, -3], spine: [0, -6, 4], head: [-4, 4, 0],
    shoulderL: [-14, 0, 8], shoulderR: [16, 0, -8], elbowL: [-18, 0, 0], elbowR: [-10, 0, 0],
    hipL: [-14, 0, -6], kneeL: [12, 0, 0], ankleL: [6, 0, 0], hipR: [6, 0, 3], kneeR: [4, 0, 0],
  },
  hip: {
    pelvis: [0, 10, 6], spine: [0, -6, -9], head: [0, -12, 8],
    shoulderL: [0, -10, 38], elbowL: [0, 0, -100], wristL: [0, 0, -10],
    shoulderR: [0, 0, -9], elbowR: [-10, 0, 0],
    hipL: [0, 0, -4], hipR: [-12, -10, 4], kneeR: [22, 0, 0], ankleR: [-8, 0, 0],
  },
  cover: {
    pelvis: [0, 14, 8], spine: [-4, -10, -10], neck: [0, 0, 6], head: [-6, -18, 10],
    shoulderL: [0, -10, 38], elbowL: [0, 0, -100], wristL: [0, 0, -10],
    shoulderR: [0, 0, -150], elbowR: [0, 0, -100],
    hipL: [-4, 0, -5], hipR: [-16, -12, 6], kneeR: [26, 0, 0], ankleR: [-12, 0, 0],
  },
  walk: {
    pelvis: [0, 8, 2], spine: [-3, -10, -2], head: [-2, 4, 0],
    shoulderL: [22, 0, 7], shoulderR: [-24, 0, -7], elbowL: [-10, 0, 0], elbowR: [-28, 0, 0],
    hipL: [-26, 0, -2], kneeL: [10, 0, 0], ankleL: [12, 0, 0],
    hipR: [18, 0, 2], kneeR: [30, 0, 0], ankleR: [-14, 0, 0],
  },
  open: {
    spine: [-4, 0, 0], head: [-14, 0, 0], neck: [-6, 0, 0],
    shoulderL: [-10, 0, 105], shoulderR: [-10, 0, -105], elbowL: [0, 0, 12], elbowR: [0, 0, -12],
    hipL: [0, 0, 7], hipR: [0, 0, -7],
  },
};

/** Gera uma peça arredondada girando um perfil (raio por altura) em torno do eixo Y. */
function lathe(profile: [number, number][], segments = 28): THREE.BufferGeometry {
  // profile: [raio, y] — y crescente para as normais apontarem para fora
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y));
  const g = new THREE.LatheGeometry(pts, segments);
  g.computeVertexNormals();
  return g;
}

/** Membro afunilado que desce a partir da articulação (y=0 até y=-len). */
function limbGeo(len: number, rTop: number, rMid: number, rBot: number, bulgeAt = 0.3) {
  const prof: [number, number][] = [];
  const n = 14;
  for (let i = n; i >= 0; i--) {
    const t = i / n; // 0 = topo, 1 = base
    const r = t < bulgeAt
      ? THREE.MathUtils.lerp(rTop, rMid, Math.sin((t / bulgeAt) * Math.PI / 2))
      : THREE.MathUtils.lerp(rMid, rBot, (t - bulgeAt) / (1 - bulgeAt));
    prof.push([r, -t * len]);
  }
  return lathe(prof);
}

function toonGradient(): THREE.DataTexture {
  const data = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 235, 235, 235, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Material de contorno (casca invertida) — dá cara de desenho ao manequim. */
function outlineMaterial(color: number, thickness: number) {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\n transformed += normalize(normal) * ${thickness.toFixed(4)};`,
    );
  };
  return m;
}

export class Mannequin {
  root = new THREE.Group();          // gira e fica no chão
  body = new THREE.Group();          // escala para unidades do mundo
  joints = {} as Record<JointName, THREE.Group>;
  rest = {} as Record<JointName, THREE.Euler>;
  pickables: THREE.Mesh[] = [];
  spec: BodySpec;
  material: THREE.MeshToonMaterial;
  outline: THREE.MeshBasicMaterial;
  private grad = toonGradient();
  private pose: Pose = {};

  constructor(bodyId = 'classic', color = 0xead9cc) {
    this.spec = BODY_SPECS[bodyId];
    this.material = new THREE.MeshToonMaterial({ color, gradientMap: this.grad });
    this.outline = outlineMaterial(0x3a2a30, 0.035);
    this.root.add(this.body);
    this.build();
  }

  setBody(bodyId: string) {
    this.spec = BODY_SPECS[bodyId];
    const keep = this.pose;
    this.body.clear();
    this.pickables = [];
    this.build();
    this.applyPose(keep);
  }

  setColor(color: number) { this.material.color.setHex(color); }
  setOutline(visible: boolean) { this.outline.visible = visible; }

  private mesh(geo: THREE.BufferGeometry, parent: THREE.Object3D, joint: JointName, outline = true) {
    const m = new THREE.Mesh(geo, this.material);
    m.castShadow = true;
    m.userData.joint = joint;
    parent.add(m);
    this.pickables.push(m);
    if (outline) {
      const o = new THREE.Mesh(geo, this.outline);
      m.add(o);
    }
    return m;
  }

  private joint(name: JointName, parent: THREE.Object3D, x: number, y: number, z = 0) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    this.joints[name] = g;
    this.rest[name] = g.rotation.clone();
    return g;
  }

  private ball(r: number, parent: THREE.Object3D, joint: JointName) {
    return this.mesh(new THREE.SphereGeometry(r, 20, 14), parent, joint);
  }

  private build() {
    const s = this.spec;
    const L = s.limb;
    const legLen = s.thigh + s.shin;
    const ankleH = 0.22;
    const crotchY = legLen + ankleH;

    // Pélvis / quadril
    const pelvis = this.joint('pelvis', this.body, 0, crotchY + 0.1);
    const lower = this.mesh(lathe([
      [0.35 * s.hipR / 0.88, -0.25],
      [s.hipR * 0.92, 0.0],
      [s.hipR, 0.25],
      [THREE.MathUtils.lerp(s.hipR, s.waistR, 0.5), s.lowerTorso * 0.6],
      [s.waistR, s.lowerTorso],
    ]), pelvis, 'pelvis');
    lower.scale.z = s.depth * 1.08;

    // Tronco superior
    const spine = this.joint('spine', pelvis, 0, s.lowerTorso);
    const T = s.upperTorso;
    const upper = this.mesh(lathe([
      [s.waistR, -0.05],
      [s.waistR * 1.02, T * 0.12],
      [s.ribR, T * 0.4],
      [s.chestR, T * 0.68],
      [s.chestR * 0.98, T * 0.84],
      [s.chestR * 0.72, T * 0.98],
      [0.3, T * 1.04],
    ]), spine, 'spine');
    upper.scale.z = s.depth;
    // Ombros (tampa arredondada que liga o tronco aos braços)
    const yoke = this.mesh(new THREE.CapsuleGeometry(0.22 * L, s.shoulderHalf * 1.55, 6, 16), spine, 'spine');
    yoke.rotation.z = Math.PI / 2;
    yoke.position.set(0, T * 0.9, -0.02);
    yoke.scale.set(1, 1, 0.9);
    if (s.bust > 0) {
      for (const side of [-1, 1]) {
        const b = this.mesh(new THREE.SphereGeometry(0.27 * s.bust, 18, 14), spine, 'spine');
        b.position.set(side * 0.27, T * 0.6, s.chestR * s.depth * 0.62);
        b.scale.set(1, 0.92, 0.85);
      }
    }

    // Pescoço e cabeça
    const neck = this.joint('neck', spine, 0, T * 0.98);
    const neckM = this.mesh(new THREE.CylinderGeometry(0.17, 0.2, s.neck + 0.15, 16), neck, 'neck');
    neckM.position.y = s.neck / 2;
    const head = this.joint('head', neck, 0, s.neck);
    const headM = this.mesh(new THREE.SphereGeometry(0.5, 28, 20), head, 'head');
    headM.position.set(0, 0.47, 0.03);
    headM.scale.set(0.74 * s.headW, 1, 0.86);
    const chin = this.mesh(new THREE.SphereGeometry(0.26, 18, 14), head, 'head', false);
    chin.position.set(0, 0.17, 0.14);
    chin.scale.set(1, 1.1, 1);

    // Braços
    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1;
      const sh = this.joint(`shoulder${side}`, spine, sx * s.shoulderHalf, T * 0.88);
      this.ball(0.2 * L, sh, `shoulder${side}`);
      this.mesh(limbGeo(s.upperArm, 0.19 * L, 0.18 * L, 0.13 * L, 0.25), sh, `shoulder${side}`);
      const el = this.joint(`elbow${side}`, sh, 0, -s.upperArm);
      this.ball(0.13 * L, el, `elbow${side}`);
      this.mesh(limbGeo(s.forearm, 0.13 * L, 0.145 * L, 0.09 * L, 0.3), el, `elbow${side}`);
      const wr = this.joint(`wrist${side}`, el, 0, -s.forearm);
      const hand = this.mesh(new THREE.SphereGeometry(0.5, 16, 12), wr, `wrist${side}`);
      hand.scale.set(0.2 * L, s.hand, 0.11 * L);
      hand.position.y = -s.hand * 0.45;
    }

    // Pernas
    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1;
      const hip = this.joint(`hip${side}`, pelvis, sx * s.hipJoint, 0);
      this.mesh(limbGeo(s.thigh, 0.36 * L, 0.33 * L, 0.18 * L, 0.18), hip, `hip${side}`);
      const knee = this.joint(`knee${side}`, hip, 0, -s.thigh);
      this.ball(0.175 * L, knee, `knee${side}`);
      this.mesh(limbGeo(s.shin, 0.18 * L, 0.2 * L, 0.095 * L, 0.3), knee, `knee${side}`);
      const ankle = this.joint(`ankle${side}`, knee, 0, -s.shin);
      const foot = this.mesh(new THREE.SphereGeometry(0.5, 18, 12), ankle, `ankle${side}`);
      foot.scale.set(0.22 * L, 0.2, 0.75);
      foot.position.set(0, -0.14, 0.2);
    }

    // Escala para o mundo: altura total ≈ 2 unidades
    const sc = 2 / s.heads;
    this.body.scale.setScalar(sc);
  }

  applyPose(pose: Pose) {
    this.pose = JSON.parse(JSON.stringify(pose));
    for (const name of Object.keys(this.joints) as JointName[]) {
      const r = pose[name] ?? [0, 0, 0];
      this.joints[name].rotation.set(D(r[0]), D(r[1]), D(r[2]));
    }
    this.ground();
  }

  /** Mistura duas poses (t entre 0 e 1) — usado para a animação de troca de pose. */
  blendPose(a: Pose, b: Pose, t: number) {
    const out: Pose = {};
    for (const name of Object.keys(this.joints) as JointName[]) {
      const ra = a[name] ?? [0, 0, 0];
      const rb = b[name] ?? [0, 0, 0];
      out[name] = [0, 1, 2].map((i) => ra[i] + (rb[i] - ra[i]) * t) as [number, number, number];
    }
    this.applyPose(out);
  }

  getPose(): Pose { return JSON.parse(JSON.stringify(this.pose)); }

  /** Rotação manual de uma articulação (ajuste fino). */
  nudge(name: JointName, dx: number, dz: number) {
    const cur = this.pose[name] ?? [0, 0, 0];
    const lim = (v: number) => THREE.MathUtils.clamp(v, -170, 170);
    this.pose[name] = [lim(cur[0] + dx), cur[1], lim(cur[2] + dz)];
    this.applyPose(this.pose);
  }

  /** Mantém o pé mais baixo encostado no chão. */
  ground() {
    this.body.position.y = 0;
    this.root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const m of this.pickables) box.expandByObject(m);
    this.body.position.y = this.root.position.y - box.min.y;
  }

  dispose() {
    this.root.traverse((o) => {
      if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose();
    });
    this.material.dispose();
    this.outline.dispose();
    this.grad.dispose();
  }
}
