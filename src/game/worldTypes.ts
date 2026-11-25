import type Matter from 'matter-js';
import { ScientistAnimState } from './types';

export interface PlatformDef {
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number; // radians
  surface?: 'normal' | 'rubber' | 'ice';
  color?: string;
  isGlass?: boolean; // Level 3 refraction block
  refractiveIndex?: number;
}

export interface MovingPlatformState {
  id: string;
  body: Matter.Body;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  speed: number;
  progress: number;
  dir: 1 | -1;
  w: number;
  h: number;
  requiresLockId?: string;
}

export interface DynamicBoxState {
  id: string;
  name: string;
  body: Matter.Body;
  w: number;
  h: number;
  radius?: number;
  massKg: number;
  isMagnetic?: boolean;
  isCart?: boolean;
  isEnergyBall?: boolean;
  isMirrorCart?: boolean;
  carryable: boolean;
  color: string;
  concept: string;
  formula: string;
  explanation: string;
  appliedForceN: number;
  lastVel: { x: number; y: number };
  accelMs2: number;
  spawnPos: { x: number; y: number };
}

export interface PressureSwitchState {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minMassKg: number;
  inverted?: boolean; // ceiling switch
  activated: boolean;
  requiresEnergyBall?: boolean;
  requiresMagnetic?: boolean;
  lockIndex: number; // 0, 1, 2
  opensGateId?: string;
  currentLoadKg: number;
}

export interface GateState {
  id: string;
  body: Matter.Body;
  closedX: number;
  closedY: number;
  openOffsetY: number;
  w: number;
  h: number;
  open: boolean;
  color: string;
}

export interface GravityMachineState {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cooldown: number;
}

export interface ForcePusherState {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  dirX: number;
  dirY: number;
  forceNewtons: number;
  cooldown: number;
  pistonExtend: number;
}

export interface LaserEmitterState {
  id: string;
  x: number;
  y: number;
  angleDeg: number;
  color: string;
}

export interface MirrorState {
  id: string;
  name: string;
  x: number;
  y: number;
  length: number;
  angleDeg: number; // surface angle in degrees
  attachedBoxId?: string; // moves with a cart!
  rotatable: boolean;
}

export interface LaserReceiverState {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  hit: boolean;
  lockIndex: number;
  opensGateId?: string;
}

export interface LaserSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  inGlass: boolean;
  color: string;
}

export interface ElectromagnetState {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
  polarity: 'attract' | 'repel';
  strength: number;
  range: number;
  dirX?: number; // optional directional cone
  dirY?: number;
}

export interface BallDispenserState {
  id: string;
  name: string;
  x: number;
  y: number;
  heightMeters: number;
  ballMassKg: number;
  cooldown: number;
  activeBallId: string | null;
}

export interface MovableRampState {
  id: string;
  name: string;
  body: Matter.Body;
  x: number;
  y: number;
  w: number;
  h: number;
  angles: number[]; // radians options
  angleIndex: number;
}

export interface StarState {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  bobOffset: number;
}

export interface CheckpointState {
  id: string;
  x: number;
  y: number;
  reached: boolean;
}

export interface HazardZone {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface LevelWorld {
  levelId: number;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  respawn: { x: number; y: number };
  door: { x: number; y: number; w: number; h: number; openAnim: number };
  gravityDir: 1 | -1;
  staticBodies: { body: Matter.Body; def: PlatformDef }[];
  movingPlatforms: MovingPlatformState[];
  boxes: DynamicBoxState[];
  switches: PressureSwitchState[];
  gates: GateState[];
  gravityMachines: GravityMachineState[];
  forcePushers: ForcePusherState[];
  laserEmitters: LaserEmitterState[];
  mirrors: MirrorState[];
  laserReceivers: LaserReceiverState[];
  laserSegments: LaserSegment[];
  magnets: ElectromagnetState[];
  dispensers: BallDispenserState[];
  movableRamps: MovableRampState[];
  stars: StarState[];
  checkpoints: CheckpointState[];
  hazards: HazardZone[];
  locks: [boolean, boolean, boolean];
  scientist: {
    body: Matter.Body;
    facing: 1 | -1;
    grounded: boolean;
    coyoteTimer: number;
    jumpBufferTimer: number;
    anim: ScientistAnimState;
    animTime: number;
    landTimer: number;
    interactTimer: number;
    pushing: boolean;
    carryingBoxId: string | null;
    invulnTimer: number;
    lastVel: { x: number; y: number };
    accelMs2: number;
  };
}
