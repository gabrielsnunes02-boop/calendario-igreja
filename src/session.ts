// Dados do look que está sendo criado agora (vive só na memória).
import type { Mode } from './game/state';
import type { Pose } from './three/mannequin';
import { POSE_PRESETS } from './three/mannequin';

export interface Brief { title: string; text: string; color?: { name: string; hex: string } }

export const session = {
  mode: 'free' as Mode,
  brief: null as Brief | null,
  body: 'fashion',
  poseId: 'contrapposto',
  pose: POSE_PRESETS.contrapposto as Pose,
  yaw: 0,
  skin: 0xead9cc,
  silhouette: null as HTMLCanvasElement | null,
};

export function startSession(mode: Mode, brief: Brief | null) {
  session.mode = mode;
  session.brief = brief;
  session.silhouette = null;
}
