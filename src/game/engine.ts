import Matter from 'matter-js';
import { soundEngine } from './audio';
import { LEVELS_META } from './data';
import { buildLevelWorld, createEnergyBall } from './levels';
import { HUDState, ScannerData } from './types';
import {
  DynamicBoxState,
  ElectromagnetState,
  LaserSegment,
  LevelWorld,
  MirrorState,
  Particle,
} from './worldTypes';

const { Engine, Body, Composite } = Matter;

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HUDState) => void;
  onScannerUpdate: (data: ScannerData | null) => void;
  onLevelComplete: (summary: {
    levelId: number;
    score: number;
    stars: number;
    timeSeconds: number;
    hintsUsed: number;
  }) => void;
  onGameOver: () => void;
}

const PX_PER_METER = 50;
const GRAVITY_ACCEL = 9.8;

export class PhysicsGameEngine {
  public engine: Matter.Engine;
  public world: LevelWorld;
  public particles: Particle[] = [];
  public camera = { x: 0, y: 0 };
  public hoveredWorldEntityId: string | null = null;

  private callbacks: EngineCallbacks;
  private input: InputState = { left: false, right: false, jump: false };
  private prevJump = false;

  private score = 0;
  private lives = 3;
  private readonly maxLives = 3;
  private elapsedSeconds = 0;
  private hintsUsed = 0;
  private activeHintLevel = 0;
  private toastMessage: string | null = null;
  private toastTimer = 0;

  private scannedEntity: { type: 'box' | 'magnet' | 'mirror' | 'pusher' | 'gravity' | 'ramp' | 'dispenser'; id: string } | null = null;
  private activeMagnetId: string | null = null;
  private levelCompleted = false;
  private completionAnimTimer = 0;
  private hudSyncTimer = 0;
  private ballCounter = 0;

  constructor(levelId: number, callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
    this.engine = Engine.create({
      gravity: { x: 0, y: 1.0, scale: 0.001 },
      positionIterations: 8,
      velocityIterations: 6,
    });
    this.world = buildLevelWorld(levelId, this.engine);

    if (this.world.magnets.length > 0) {
      this.activeMagnetId = this.world.magnets[0].id;
    }

    this.showToast(`Entered ${LEVELS_META[levelId - 1].title}`);
    this.emitHud();
  }

  public destroy() {
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }

  public setInput(next: Partial<InputState>) {
    Object.assign(this.input, next);
  }

  public triggerJump() {
    this.world.scientist.jumpBufferTimer = 0.14;
  }

  public useHint(): string | null {
    const meta = LEVELS_META[this.world.levelId - 1];
    if (this.activeHintLevel < 3) {
      this.activeHintLevel++;
      this.hintsUsed = Math.max(this.hintsUsed, this.activeHintLevel);
      soundEngine.playClick();
      this.emitHud();
    }
    return meta.hints[this.activeHintLevel - 1] ?? null;
  }

  public getActiveHintText(): string | null {
    if (this.activeHintLevel <= 0) return null;
    const meta = LEVELS_META[this.world.levelId - 1];
    return meta.hints[this.activeHintLevel - 1] ?? null;
  }

  public toggleActiveMagnetPower() {
    const mag = this.world.magnets.find((m) => m.id === this.activeMagnetId) ?? this.world.magnets[0];
    if (!mag) return;
    mag.active = !mag.active;
    soundEngine.playMagnetPulse(mag.polarity === 'attract');
    this.showToast(`${mag.name}: ${mag.active ? `ON (${mag.polarity.toUpperCase()})` : 'OFF'}`);
    this.scannedEntity = { type: 'magnet', id: mag.id };
    this.emitScanner();
    this.emitHud();
  }

  public flipActiveMagnetPolarity() {
    const mag = this.world.magnets.find((m) => m.id === this.activeMagnetId) ?? this.world.magnets[0];
    if (!mag) return;
    mag.polarity = mag.polarity === 'attract' ? 'repel' : 'attract';
    if (!mag.active) mag.active = true;
    soundEngine.playMagnetPulse(mag.polarity === 'attract');
    this.showToast(`${mag.name} Polarity: ${mag.polarity.toUpperCase()}`);
    this.scannedEntity = { type: 'magnet', id: mag.id };
    this.emitScanner();
    this.emitHud();
  }

  public closeScanner() {
    this.scannedEntity = null;
    this.callbacks.onScannerUpdate(null);
  }

  public showToast(msg: string, duration = 2.6) {
    this.toastMessage = msg;
    this.toastTimer = duration;
  }

  public spawnParticles(x: number, y: number, color: string, count = 12, speed = 3.2) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const spd = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        size: 2.5 + Math.random() * 3.5,
        color,
      });
    }
  }

  // Interact / Scan nearest object (E key or Touch Interact)
  public handleInteract() {
    if (this.levelCompleted) return;
    const sci = this.world.scientist;
    const sx = sci.body.position.x;
    const sy = sci.body.position.y;
    sci.interactTimer = 0.28;

    // 1. Check nearby interactive devices first
    const best = this.findNearestInteractive(sx, sy, 86);
    if (best) {
      this.activateEntity(best.type, best.id, true);
      return;
    }

    // 2. If carrying a box and nothing closer to activate, drop it cleanly
    if (sci.carryingBoxId) {
      this.dropCarriedBox();
      return;
    }

    // 3. Check nearby boxes/carts/balls to scan (and carry if carryable!)
    let closestBox: DynamicBoxState | null = null;
    let closestDist = 92;
    for (const box of this.world.boxes) {
      const d = Math.hypot(box.body.position.x - sx, box.body.position.y - sy);
      if (d < closestDist) {
        closestDist = d;
        closestBox = box;
      }
    }
    if (closestBox) {
      this.scannedEntity = { type: 'box', id: closestBox.id };
      soundEngine.playScan();
      this.emitScanner();
      if (closestBox.carryable) {
        this.pickUpBox(closestBox);
      } else {
        this.showToast(`Scanned ${closestBox.name}`);
      }
      return;
    }

    // 4. Otherwise scan scientist!
    this.showToast('Move closer to a lab device or object and press E to scan & interact.');
  }

  public handleDropOrPick() {
    const sci = this.world.scientist;
    if (sci.carryingBoxId) {
      this.dropCarriedBox();
      return;
    }
    const sx = sci.body.position.x;
    const sy = sci.body.position.y;
    for (const box of this.world.boxes) {
      if (!box.carryable) continue;
      if (Math.hypot(box.body.position.x - sx, box.body.position.y - sy) < 88) {
        this.pickUpBox(box);
        this.scannedEntity = { type: 'box', id: box.id };
        this.emitScanner();
        return;
      }
    }
  }

  private pickUpBox(box: DynamicBoxState) {
    this.world.scientist.carryingBoxId = box.id;
    soundEngine.playClick();
    this.showToast(`Picked up ${box.name} (Press E or F to drop)`);
    this.emitHud();
  }

  private dropCarriedBox() {
    const sci = this.world.scientist;
    if (!sci.carryingBoxId) return;
    const box = this.world.boxes.find((b) => b.id === sci.carryingBoxId);
    if (box) {
      const dropX = Math.max(40, Math.min(this.world.width - 40, sci.body.position.x + sci.facing * 42));
      const dropY = sci.body.position.y - 6 * this.world.gravityDir;
      Body.setPosition(box.body, { x: dropX, y: dropY });
      Body.setVelocity(box.body, { x: sci.body.velocity.x * 0.6, y: 0 });
    }
    sci.carryingBoxId = null;
    soundEngine.playClick();
    this.emitHud();
  }

  public handleCanvasClick(worldX: number, worldY: number) {
    if (this.levelCompleted) return;
    const hit = this.findEntityAtPoint(worldX, worldY);
    if (!hit) return;
    this.activateEntity(hit.type, hit.id, false);
  }

  public updateHover(worldX: number, worldY: number) {
    const hit = this.findEntityAtPoint(worldX, worldY);
    this.hoveredWorldEntityId = hit ? hit.id : null;
  }

  private findNearestInteractive(sx: number, sy: number, maxRange: number): {
    type: 'gravity' | 'pusher' | 'mirror' | 'magnet' | 'ramp' | 'dispenser';
    id: string;
    dist: number;
  } | null {
    type InteractiveHit = {
      type: 'gravity' | 'pusher' | 'mirror' | 'magnet' | 'ramp' | 'dispenser';
      id: string;
      dist: number;
    };
    const candidates: InteractiveHit[] = [];
    for (const g of this.world.gravityMachines) {
      candidates.push({ type: 'gravity', id: g.id, dist: Math.hypot(g.x + g.w / 2 - sx, g.y + g.h / 2 - sy) });
    }
    for (const p of this.world.forcePushers) {
      candidates.push({ type: 'pusher', id: p.id, dist: Math.hypot(p.x + p.w / 2 - sx, p.y + p.h / 2 - sy) });
    }
    for (const m of this.world.mirrors) {
      candidates.push({ type: 'mirror', id: m.id, dist: Math.hypot(m.x - sx, m.y - sy) });
    }
    for (const m of this.world.magnets) {
      candidates.push({ type: 'magnet', id: m.id, dist: Math.hypot(m.x - sx, m.y - sy) });
    }
    for (const r of this.world.movableRamps) {
      candidates.push({ type: 'ramp', id: r.id, dist: Math.hypot(r.x - sx, r.y - sy) });
    }
    for (const d of this.world.dispensers) {
      candidates.push({ type: 'dispenser', id: d.id, dist: Math.hypot(d.x - sx, d.y - sy) });
    }

    let best: InteractiveHit | null = null;
    for (const c of candidates) {
      if (c.dist <= maxRange && (!best || c.dist < best.dist)) {
        best = c;
      }
    }
    return best;
  }

  private findEntityAtPoint(wx: number, wy: number): {
    type: 'box' | 'magnet' | 'mirror' | 'pusher' | 'gravity' | 'ramp' | 'dispenser';
    id: string;
  } | null {
    for (const m of this.world.mirrors) {
      if (Math.hypot(wx - m.x, wy - m.y) < 42) return { type: 'mirror', id: m.id };
    }
    for (const d of this.world.dispensers) {
      if (Math.hypot(wx - d.x, wy - d.y) < 42) return { type: 'dispenser', id: d.id };
    }
    for (const g of this.world.gravityMachines) {
      if (wx >= g.x - 10 && wx <= g.x + g.w + 10 && wy >= g.y - 10 && wy <= g.y + g.h + 10) {
        return { type: 'gravity', id: g.id };
      }
    }
    for (const p of this.world.forcePushers) {
      if (wx >= p.x - 10 && wx <= p.x + p.w + 10 && wy >= p.y - 10 && wy <= p.y + p.h + 10) {
        return { type: 'pusher', id: p.id };
      }
    }
    for (const m of this.world.magnets) {
      if (Math.hypot(wx - m.x, wy - m.y) < 48) return { type: 'magnet', id: m.id };
    }
    for (const r of this.world.movableRamps) {
      if (Math.hypot(wx - r.x, wy - r.y) < 95) return { type: 'ramp', id: r.id };
    }
    for (const b of this.world.boxes) {
      const halfW = b.w / 2 + 10;
      const halfH = b.h / 2 + 10;
      if (
        wx >= b.body.position.x - halfW &&
        wx <= b.body.position.x + halfW &&
        wy >= b.body.position.y - halfH &&
        wy <= b.body.position.y + halfH
      ) {
        return { type: 'box', id: b.id };
      }
    }
    return null;
  }

  private activateEntity(
    type: 'box' | 'magnet' | 'mirror' | 'pusher' | 'gravity' | 'ramp' | 'dispenser',
    id: string,
    fromKeyboard: boolean
  ) {
    this.scannedEntity = { type, id };
    soundEngine.playScan();

    if (type === 'gravity') {
      const gm = this.world.gravityMachines.find((g) => g.id === id);
      if (gm && gm.cooldown <= 0) {
        gm.cooldown = 0.5;
        this.world.gravityDir = this.world.gravityDir === 1 ? -1 : 1;
        this.engine.gravity.y = this.world.gravityDir;
        // Nudge resting bodies slightly so Matter.js wakes them up immediately
        for (const b of this.world.boxes) {
          Body.setVelocity(b.body, { x: b.body.velocity.x, y: b.body.velocity.y + this.world.gravityDir * 0.4 });
        }
        Body.setVelocity(this.world.scientist.body, {
          x: this.world.scientist.body.velocity.x,
          y: this.world.scientist.body.velocity.y + this.world.gravityDir * 0.6,
        });
        soundEngine.playGravityFlip(this.world.gravityDir === -1);
        this.spawnParticles(gm.x + gm.w / 2, gm.y + gm.h / 2, '#22D3EE', 18, 4.2);
        this.showToast(
          this.world.gravityDir === -1
            ? 'Gravity Flipped UP! (g = -9.8 m/s²)'
            : 'Gravity Restored DOWN! (g = +9.8 m/s²)'
        );
      }
    } else if (type === 'pusher') {
      const fp = this.world.forcePushers.find((p) => p.id === id);
      if (fp && fp.cooldown <= 0) {
        fp.cooldown = 0.7;
        fp.pistonExtend = 1.0;
        let pushedAny = false;
        for (const box of this.world.boxes) {
          const dx = box.body.position.x - (fp.x + fp.w / 2);
          const dy = box.body.position.y - (fp.y + fp.h / 2);
          if (Math.hypot(dx, dy) < 165) {
            const impulseScale = fp.forceNewtons * 0.0046;
            Body.applyForce(box.body, box.body.position, {
              x: fp.dirX * impulseScale,
              y: fp.dirY * impulseScale,
            });
            box.appliedForceN = fp.forceNewtons;
            pushedAny = true;
            this.spawnParticles(box.body.position.x, box.body.position.y, '#38BDF8', 14, 3.8);
          }
        }
        soundEngine.playSwitch();
        this.showToast(
          pushedAny
            ? `Applied F = ${fp.forceNewtons} N impulse! Observe acceleration (a = F/m)`
            : 'Pneumatic Pusher fired! Place a cart or crate in front of it.'
        );
      }
    } else if (type === 'mirror') {
      const mir = this.world.mirrors.find((m) => m.id === id);
      if (mir && mir.rotatable) {
        mir.angleDeg = (mir.angleDeg + 15) % 180;
        soundEngine.playClick();
        this.spawnParticles(mir.x, mir.y, '#22D3EE', 8, 2.2);
        this.showToast(`${mir.name} rotated to ${mir.angleDeg}°`);
      }
    } else if (type === 'magnet') {
      const mag = this.world.magnets.find((m) => m.id === id);
      if (mag) {
        this.activeMagnetId = mag.id;
        // Cycle: OFF -> ON (ATTRACT) -> ON (REPEL) -> OFF
        if (!mag.active) {
          mag.active = true;
        } else if (mag.polarity === 'attract') {
          mag.polarity = 'repel';
        } else {
          mag.active = false;
          mag.polarity = 'attract';
        }
        soundEngine.playMagnetPulse(mag.polarity === 'attract');
        this.spawnParticles(mag.x, mag.y, mag.polarity === 'attract' ? '#22D3EE' : '#C084FC', 14, 3.5);
        this.showToast(`${mag.name}: ${mag.active ? `ON · ${mag.polarity.toUpperCase()}` : 'OFF'}`);
      }
    } else if (type === 'ramp') {
      const ramp = this.world.movableRamps.find((r) => r.id === id);
      if (ramp) {
        ramp.angleIndex = (ramp.angleIndex + 1) % ramp.angles.length;
        Body.setAngle(ramp.body, ramp.angles[ramp.angleIndex]);
        soundEngine.playSwitch();
        this.spawnParticles(ramp.x, ramp.y, '#38BDF8', 12, 2.5);
        const deg = Math.round((ramp.angles[ramp.angleIndex] * 180) / Math.PI);
        this.showToast(`${ramp.name} tilted to ${deg}°`);
      }
    } else if (type === 'dispenser') {
      const disp = this.world.dispensers.find((d) => d.id === id);
      if (disp && disp.cooldown <= 0) {
        disp.cooldown = 0.6;
        // Remove previous ball from this dispenser so arena stays clean
        if (disp.activeBallId) {
          const oldIdx = this.world.boxes.findIndex((b) => b.id === disp.activeBallId);
          if (oldIdx !== -1) {
            Composite.remove(this.engine.world, this.world.boxes[oldIdx].body);
            this.world.boxes.splice(oldIdx, 1);
          }
        }
        this.ballCounter++;
        const ballId = `${disp.id}_ball_${this.ballCounter}`;
        const ball = createEnergyBall(this.engine, {
          id: ballId,
          name: `Energy Sphere (${disp.ballMassKg} kg)`,
          x: disp.x + 18,
          y: disp.y + 24,
          radius: disp.ballMassKg >= 8 ? 22 : 18,
          massKg: disp.ballMassKg,
          color: disp.ballMassKg >= 8 ? '#F59E0B' : '#22D3EE',
        });
        this.world.boxes.push(ball);
        disp.activeBallId = ballId;
        this.scannedEntity = { type: 'box', id: ballId };
        soundEngine.playSwitch();
        this.spawnParticles(disp.x + 18, disp.y + 24, '#FBBF24', 14, 3.2);
        const pe = Math.round(disp.ballMassKg * GRAVITY_ACCEL * disp.heightMeters);
        this.showToast(`Released ${disp.ballMassKg} kg sphere · Initial PE = ${pe} J`);
      }
    } else if (type === 'box') {
      const box = this.world.boxes.find((b) => b.id === id);
      if (box) {
        if (fromKeyboard && box.carryable) {
          this.pickUpBox(box);
        } else {
          this.showToast(`Inspecting ${box.name} in Physics Scanner`);
        }
      }
    }

    this.emitScanner();
    this.emitHud();
  }

  public step(dtSeconds: number, viewportWidth: number) {
    const dt = Math.min(0.033, Math.max(0.008, dtSeconds));

    if (!this.levelCompleted) {
      this.elapsedSeconds += dt;
    } else {
      this.completionAnimTimer += dt;
      this.world.door.openAnim = Math.min(1, this.world.door.openAnim + dt * 2.2);
      if (this.completionAnimTimer >= 1.35) {
        this.callbacks.onLevelComplete({
          levelId: this.world.levelId,
          score: this.score,
          stars: this.world.stars.filter((s) => s.collected).length,
          timeSeconds: Math.round(this.elapsedSeconds),
          hintsUsed: this.hintsUsed,
        });
        return;
      }
    }

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastMessage = null;
    }

    // Cooldowns
    this.world.gravityMachines.forEach((g) => (g.cooldown = Math.max(0, g.cooldown - dt)));
    this.world.forcePushers.forEach((p) => {
      p.cooldown = Math.max(0, p.cooldown - dt);
      p.pistonExtend = Math.max(0, p.pistonExtend - dt * 3.5);
    });
    this.world.dispensers.forEach((d) => (d.cooldown = Math.max(0, d.cooldown - dt)));

    // 1. Update Moving Platforms & carry scientist/boxes resting on them
    for (const mp of this.world.movingPlatforms) {
      if (mp.requiresLockId) {
        // Optional lock gating
      }
      const prevX = mp.body.position.x;
      const prevY = mp.body.position.y;
      mp.progress += mp.dir * mp.speed * dt;
      if (mp.progress >= 1) {
        mp.progress = 1;
        mp.dir = -1;
      } else if (mp.progress <= 0) {
        mp.progress = 0;
        mp.dir = 1;
      }
      // Smooth ease-in-out
      const t = 0.5 - 0.5 * Math.cos(mp.progress * Math.PI);
      const nx = mp.startX + (mp.endX - mp.startX) * t;
      const ny = mp.startY + (mp.endY - mp.startY) * t;
      Body.setPosition(mp.body, { x: nx, y: ny });

      const dx = nx - prevX;
      const dy = ny - prevY;
      // Carry scientist if standing on this moving platform
      const sciPos = this.world.scientist.body.position;
      if (
        Math.abs(sciPos.x - nx) <= mp.w / 2 + 12 &&
        Math.abs(sciPos.y + 26 * this.world.gravityDir - ny) <= mp.h / 2 + 10
      ) {
        Body.translate(this.world.scientist.body, { x: dx, y: dy });
      }
      // Carry boxes resting on it
      for (const box of this.world.boxes) {
        if (
          Math.abs(box.body.position.x - nx) <= mp.w / 2 + 10 &&
          Math.abs(box.body.position.y + (box.h / 2) * this.world.gravityDir - ny) <= mp.h / 2 + 10
        ) {
          Body.translate(box.body, { x: dx, y: dy });
        }
      }
    }

    // 2. Update Gates smooth open/close
    for (const gate of this.world.gates) {
      const targetY = gate.open ? gate.closedY + gate.openOffsetY : gate.closedY;
      const curY = gate.body.position.y;
      if (Math.abs(targetY - curY) > 0.5) {
        const ny = curY + (targetY - curY) * Math.min(1, dt * 6);
        Body.setPosition(gate.body, { x: gate.closedX, y: ny });
      }
    }

    // 3. Apply Magnetic Forces (Level 4 & Level 5)
    for (const mag of this.world.magnets) {
      if (!mag.active) continue;
      for (const box of this.world.boxes) {
        if (!box.isMagnetic || box.id === this.world.scientist.carryingBoxId) continue;
        const dx = mag.x - box.body.position.x;
        const dy = mag.y - box.body.position.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 16 || dist > mag.range) continue;

        const normDist = Math.max(0.28, dist / 180);
        const sign = mag.polarity === 'attract' ? 1 : -1;
        let fx = (dx / dist) * sign;
        let fy = (dy / dist) * sign;

        if (mag.dirX !== undefined && mag.dirY !== undefined && mag.polarity === 'repel') {
          fx = mag.dirX;
          fy = mag.dirY;
        }

        const forceMag = (mag.strength * box.massKg * 0.0018) / (normDist * normDist);
        Body.applyForce(box.body, box.body.position, {
          x: fx * forceMag,
          y: fy * forceMag,
        });
        box.appliedForceN = Math.round(forceMag * 42000);
      }
    }

    // 4. Scientist Grounded Check & Controls
    this.updateScientist(dt);

    // 5. Carry Box Positioning
    if (this.world.scientist.carryingBoxId) {
      const box = this.world.boxes.find((b) => b.id === this.world.scientist.carryingBoxId);
      if (box) {
        const sci = this.world.scientist;
        const holdX = sci.body.position.x + sci.facing * 26;
        const holdY = sci.body.position.y - 24 * this.world.gravityDir;
        Body.setPosition(box.body, { x: holdX, y: holdY });
        Body.setVelocity(box.body, { x: 0, y: 0 });
        Body.setAngularVelocity(box.body, 0);
      }
    }

    // 6. Step Matter.js Physics (fixed 16.66ms substep for deterministic platforming)
    Engine.update(this.engine, 1000 / 60);

    // 7. Update box telemetry (acceleration & synced mirror carts)
    for (const box of this.world.boxes) {
      const vx = box.body.velocity.x;
      const vy = box.body.velocity.y;
      const dvx = (vx - box.lastVel.x) * (60 / PX_PER_METER) * 60;
      const dvy = (vy - box.lastVel.y) * (60 / PX_PER_METER) * 60;
      const rawAccel = Math.hypot(dvx, dvy);
      box.accelMs2 = box.accelMs2 * 0.75 + rawAccel * 0.25;
      box.lastVel = { x: vx, y: vy };
      if (!box.isMagnetic) {
        box.appliedForceN = box.appliedForceN * 0.88;
      }

      // Sync cart-mounted mirror
      if (box.isMirrorCart) {
        const attached = this.world.mirrors.find((m) => m.attachedBoxId === box.id);
        if (attached) {
          attached.x = box.body.position.x;
          attached.y = box.body.position.y - 25;
        }
      }

      // Check if box fell into a hazard pit -> respawn safely!
      for (const hz of this.world.hazards) {
        if (
          box.body.position.x > hz.x &&
          box.body.position.x < hz.x + hz.w &&
          box.body.position.y > hz.y - 10
        ) {
          Body.setPosition(box.body, box.spawnPos);
          Body.setVelocity(box.body, { x: 0, y: 0 });
          this.spawnParticles(box.spawnPos.x, box.spawnPos.y, '#22D3EE', 14, 3);
          this.showToast(`${box.name} teleported back to lab pad!`);
        }
      }
    }

    // 8. Laser Raytracing (Level 3)
    if (this.world.laserEmitters.length > 0) {
      this.updateLasers();
    }

    // 9. Pressure Switches & Locks
    this.updateSwitches();

    // 10. Stars, Checkpoints, Hazards, Exit Door
    this.updateCollectiblesAndHazards(dt);

    // 11. Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // 12. Camera Tracking (smooth follow)
    const targetCamX = Math.max(
      0,
      Math.min(this.world.width - viewportWidth, this.world.scientist.body.position.x - viewportWidth * 0.38)
    );
    this.camera.x += (targetCamX - this.camera.x) * Math.min(1, dt * 7);

    // 13. Periodic HUD & live Scanner telemetry sync
    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.08) {
      this.hudSyncTimer = 0;
      this.emitHud();
      if (this.scannedEntity) {
        this.emitScanner();
      }
    }
  }

  private updateScientist(dt: number) {
    const sci = this.world.scientist;
    sci.animTime += dt;
    sci.landTimer = Math.max(0, sci.landTimer - dt);
    sci.interactTimer = Math.max(0, sci.interactTimer - dt);
    sci.invulnTimer = Math.max(0, sci.invulnTimer - dt);

    const pos = sci.body.position;
    const gDir = this.world.gravityDir;

    // Grounded probe just below feet (or above head when gravity inverted)
    const footY = pos.y + 27 * gDir;
    const probeBodies: Matter.Body[] = [
      ...this.world.staticBodies.filter((s) => !s.def.isGlass).map((s) => s.body),
      ...this.world.movingPlatforms.map((m) => m.body),
      ...this.world.movableRamps.map((r) => r.body),
      ...this.world.gates.filter((g) => !g.open).map((g) => g.body),
      ...this.world.boxes.filter((b) => b.id !== sci.carryingBoxId).map((b) => b.body),
    ];

    const hitsLeft = Matter.Query.point(probeBodies, { x: pos.x - 11, y: footY });
    const hitsCenter = Matter.Query.point(probeBodies, { x: pos.x, y: footY });
    const hitsRight = Matter.Query.point(probeBodies, { x: pos.x + 11, y: footY });
    const wasGrounded = sci.grounded;
    sci.grounded = hitsLeft.length > 0 || hitsCenter.length > 0 || hitsRight.length > 0;

    if (sci.grounded && !wasGrounded) {
      sci.landTimer = 0.14;
      soundEngine.playLand();
      this.spawnParticles(pos.x, footY, '#94A3B8', 5, 1.8);
    }

    if (sci.grounded) {
      sci.coyoteTimer = 0.11;
    } else {
      sci.coyoteTimer = Math.max(0, sci.coyoteTimer - dt);
    }

    // Jump input edge + buffer
    if (this.input.jump && !this.prevJump) {
      sci.jumpBufferTimer = 0.12;
    }
    this.prevJump = this.input.jump;
    sci.jumpBufferTimer = Math.max(0, sci.jumpBufferTimer - dt);

    // Horizontal movement
    const moveDir = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    if (moveDir !== 0) sci.facing = moveDir > 0 ? 1 : -1;

    const maxSpeed = 4.9;
    const accelRate = sci.grounded ? 0.85 : 0.55;
    let vx = sci.body.velocity.x;
    if (moveDir !== 0) {
      vx += (moveDir * maxSpeed - vx) * accelRate;
    } else {
      vx *= sci.grounded ? 0.72 : 0.92;
      if (Math.abs(vx) < 0.08) vx = 0;
    }

    let vy = sci.body.velocity.y;
    if (sci.jumpBufferTimer > 0 && sci.coyoteTimer > 0) {
      vy = -11.4 * gDir;
      sci.jumpBufferTimer = 0;
      sci.coyoteTimer = 0;
      sci.grounded = false;
      soundEngine.playJump();
      this.spawnParticles(pos.x, footY, '#38BDF8', 7, 2.2);
    }

    Body.setVelocity(sci.body, { x: vx, y: vy });

    // Check if pushing a box horizontally
    sci.pushing = false;
    if (moveDir !== 0 && sci.grounded) {
      for (const box of this.world.boxes) {
        if (box.id === sci.carryingBoxId) continue;
        const dx = box.body.position.x - pos.x;
        const dy = Math.abs(box.body.position.y - pos.y);
        if (Math.sign(dx) === moveDir && Math.abs(dx) < box.w / 2 + 24 && dy < box.h / 2 + 22) {
          sci.pushing = true;
          // Apply gentle assistive push force scaled naturally so heavy vs light boxes feel distinct!
          const pushForceNewtons = 95;
          box.appliedForceN = pushForceNewtons;
          const matterForce = (pushForceNewtons * 0.000018) * moveDir;
          Body.applyForce(box.body, box.body.position, { x: matterForce, y: 0 });
        }
      }
    }

    // Acceleration telemetry
    const dvx = (vx - sci.lastVel.x) * (60 / PX_PER_METER) * 60;
    const dvy = (vy - sci.lastVel.y) * (60 / PX_PER_METER) * 60;
    sci.accelMs2 = sci.accelMs2 * 0.8 + Math.hypot(dvx, dvy) * 0.2;
    sci.lastVel = { x: vx, y: vy };

    // Choose Scientist Animation State
    if (this.levelCompleted) {
      sci.anim = 'victory';
    } else if (sci.interactTimer > 0) {
      sci.anim = 'interact';
    } else if (!sci.grounded) {
      sci.anim = vy * gDir < -0.5 ? 'jump' : 'fall';
    } else if (sci.landTimer > 0) {
      sci.anim = 'land';
    } else if (sci.pushing) {
      sci.anim = 'push';
    } else if (Math.abs(vx) > 3.2) {
      sci.anim = 'run';
    } else if (Math.abs(vx) > 0.35) {
      sci.anim = 'walk';
    } else {
      sci.anim = 'idle';
    }
  }

  private updateLasers() {
    const segments: LaserSegment[] = [];
    this.world.laserReceivers.forEach((r) => (r.hit = false));

    const glassBlocks = this.world.staticBodies.filter((s) => s.def.isGlass);
    const solidBlocks = [
      ...this.world.staticBodies.filter((s) => !s.def.isGlass).map((s) => s.body.bounds),
      ...this.world.gates.filter((g) => !g.open).map((g) => g.body.bounds),
      ...this.world.boxes.map((b) => b.body.bounds),
    ];

    for (const emitter of this.world.laserEmitters) {
      let ox = emitter.x;
      let oy = emitter.y;
      let rad = (emitter.angleDeg * Math.PI) / 180;
      let dx = Math.cos(rad);
      let dy = Math.sin(rad);
      let inGlass = false;

      for (let bounce = 0; bounce < 10; bounce++) {
        let closestT = 2200;
        let hitType: 'none' | 'wall' | 'mirror' | 'receiver' | 'glass_enter' | 'glass_exit' = 'none';
        let hitMirror: MirrorState | null = null;
        let hitReceiverIdx = -1;
        let hitNormal = { x: 0, y: 0 };

        // 1. Check mirrors
        for (const mir of this.world.mirrors) {
          const mRad = (mir.angleDeg * Math.PI) / 180;
          const mx = Math.cos(mRad) * (mir.length / 2);
          const my = Math.sin(mRad) * (mir.length / 2);
          const t = raySegmentIntersect(ox, oy, dx, dy, mir.x - mx, mir.y - my, mir.x + mx, mir.y + my);
          if (t !== null && t > 2 && t < closestT) {
            closestT = t;
            hitType = 'mirror';
            hitMirror = mir;
            hitNormal = { x: -Math.sin(mRad), y: Math.cos(mRad) };
          }
        }

        // 2. Check glass block boundaries (Snell's Law refraction!)
        for (const gb of glassBlocks) {
          const b = gb.body.bounds;
          const res = rayAABBIntersect(ox, oy, dx, dy, b.min.x, b.min.y, b.max.x, b.max.y);
          if (res && res.t > 2 && res.t < closestT) {
            closestT = res.t;
            hitType = inGlass ? 'glass_exit' : 'glass_enter';
            hitNormal = res.normal;
          }
        }

        // 3. Check solid walls / gates / boxes
        for (const b of solidBlocks) {
          const res = rayAABBIntersect(ox, oy, dx, dy, b.min.x, b.min.y, b.max.x, b.max.y);
          if (res && res.t > 2 && res.t < closestT) {
            closestT = res.t;
            hitType = 'wall';
            hitNormal = res.normal;
          }
        }

        // 4. Check receivers
        for (let idx = 0; idx < this.world.laserReceivers.length; idx++) {
          const rec = this.world.laserReceivers[idx];
          const t = rayCircleIntersect(ox, oy, dx, dy, rec.x, rec.y, rec.radius);
          if (t !== null && t > 2 && t < closestT) {
            closestT = t;
            hitType = 'receiver';
            hitReceiverIdx = idx;
          }
        }

        const ex = ox + dx * closestT;
        const ey = oy + dy * closestT;
        segments.push({ x1: ox, y1: oy, x2: ex, y2: ey, inGlass, color: emitter.color });

        if (hitType === 'receiver' && hitReceiverIdx >= 0) {
          this.world.laserReceivers[hitReceiverIdx].hit = true;
          break;
        } else if (hitType === 'mirror' && hitMirror) {
          // Reflect direction: r = d - 2(d·n)n
          const dot = dx * hitNormal.x + dy * hitNormal.y;
          dx = dx - 2 * dot * hitNormal.x;
          dy = dy - 2 * dot * hitNormal.y;
          ox = ex + dx * 2;
          oy = ey + dy * 2;
        } else if (hitType === 'glass_enter' || hitType === 'glass_exit') {
          // Snell's Law: eta = n1 / n2 (air 1.0 -> glass 1.5 or reverse)
          const eta = hitType === 'glass_enter' ? 1.0 / 1.5 : 1.5 / 1.0;
          let nx = hitNormal.x;
          let ny = hitNormal.y;
          let cosI = -(dx * nx + dy * ny);
          if (cosI < 0) {
            nx = -nx;
            ny = -ny;
            cosI = -cosI;
          }
          const k = 1 - eta * eta * (1 - cosI * cosI);
          if (k >= 0) {
            dx = eta * dx + (eta * cosI - Math.sqrt(k)) * nx;
            dy = eta * dy + (eta * cosI - Math.sqrt(k)) * ny;
            const len = Math.hypot(dx, dy) || 1;
            dx /= len;
            dy /= len;
            inGlass = hitType === 'glass_enter';
          }
          ox = ex + dx * 2.5;
          oy = ey + dy * 2.5;
        } else {
          break;
        }
      }
    }

    this.world.laserSegments = segments;

    // Unlock gates/locks from hit receivers
    for (const rec of this.world.laserReceivers) {
      if (rec.hit && !this.world.locks[rec.lockIndex]) {
        this.unlockLock(rec.lockIndex, rec.opensGateId, `${rec.label} Powered!`);
        soundEngine.playLaserActivate();
        this.spawnParticles(rec.x, rec.y, '#10B981', 20, 4);
      }
    }
  }

  private updateSwitches() {
    for (const sw of this.world.switches) {
      let loadKg = 0;
      for (const box of this.world.boxes) {
        if (box.id === this.world.scientist.carryingBoxId) continue;
        if (sw.requiresEnergyBall && !box.isEnergyBall) continue;
        if (sw.requiresMagnetic && !box.isMagnetic) continue;

        const bx = box.body.position.x;
        const by = box.body.position.y;
        const halfH = box.h / 2;
        const contactY = sw.inverted ? by - halfH : by + halfH;
        const onX = Math.abs(bx - (sw.x + sw.w / 2)) <= sw.w / 2 + box.w / 2 - 4;
        const onY = sw.inverted
          ? Math.abs(contactY - (sw.y + sw.h)) <= 22
          : Math.abs(contactY - sw.y) <= 22;

        if (onX && onY) {
          loadKg += box.massKg;
        }
      }
      sw.currentLoadKg = loadKg;

      if (!sw.activated && loadKg >= sw.minMassKg) {
        sw.activated = true;
        this.unlockLock(sw.lockIndex, sw.opensGateId, `${sw.label} Activated!`);
        soundEngine.playSwitch();
        this.spawnParticles(sw.x + sw.w / 2, sw.y, '#10B981', 18, 3.8);
      }
    }
  }

  private unlockLock(lockIndex: number, gateId: string | undefined, message: string) {
    if (!this.world.locks[lockIndex]) {
      this.world.locks[lockIndex] = true;
      this.score += 150;
      this.showToast(message);
    }
    if (gateId) {
      const gate = this.world.gates.find((g) => g.id === gateId);
      if (gate && !gate.open) {
        gate.open = true;
        this.spawnParticles(gate.closedX, gate.closedY, gate.color, 16, 3.5);
      }
    }
    if (this.world.locks.every(Boolean)) {
      soundEngine.playDoorUnlock();
      this.showToast('All Locks Released! Proceed to the glowing Exit Door!', 4.0);
    }
  }

  private updateCollectiblesAndHazards(dt: number) {
    const sci = this.world.scientist;
    const sx = sci.body.position.x;
    const sy = sci.body.position.y;

    // Stars
    for (const star of this.world.stars) {
      star.bobOffset += dt * 3;
      if (!star.collected && Math.hypot(sx - star.x, sy - star.y) < 38) {
        star.collected = true;
        this.score += 200;
        soundEngine.playStar();
        this.spawnParticles(star.x, star.y, '#FBBF24', 18, 4.2);
        this.showToast('Collected Science Star! (+200 pts)');
        this.emitHud();
      }
    }

    // Checkpoints
    for (const cp of this.world.checkpoints) {
      if (!cp.reached && Math.hypot(sx - cp.x, sy - cp.y) < 46) {
        cp.reached = true;
        this.world.respawn = { x: cp.x, y: cp.y - 18 };
        if (this.lives < this.maxLives) this.lives++;
        soundEngine.playCheckpoint();
        this.spawnParticles(cp.x, cp.y, '#10B981', 16, 3.5);
        this.showToast('Checkpoint Saved!');
        this.emitHud();
      }
    }

    // Hazards
    if (sci.invulnTimer <= 0 && !this.levelCompleted) {
      for (const hz of this.world.hazards) {
        if (sx > hz.x + 8 && sx < hz.x + hz.w - 8 && sy + 20 > hz.y) {
          this.lives--;
          sci.invulnTimer = 1.4;
          soundEngine.playDamage();
          this.spawnParticles(sx, sy, '#EF4444', 20, 4.5);

          if (this.lives <= 0) {
            this.callbacks.onGameOver();
            return;
          }

          // Restore normal gravity if stuck & respawn at checkpoint
          if (this.world.gravityDir === -1) {
            this.world.gravityDir = 1;
            this.engine.gravity.y = 1;
          }
          Body.setPosition(sci.body, this.world.respawn);
          Body.setVelocity(sci.body, { x: 0, y: 0 });
          this.showToast(`Hazard Hit! Respawned at Checkpoint (${this.lives} lives left)`);
          this.emitHud();
          break;
        }
      }
    }

    // Exit Door
    const door = this.world.door;
    const allUnlocked = this.world.locks.every(Boolean);
    if (allUnlocked) {
      door.openAnim = Math.min(1, door.openAnim + dt * 2.5);
      if (
        !this.levelCompleted &&
        Math.abs(sx - (door.x + door.w / 2)) < 44 &&
        Math.abs(sy - (door.y + door.h / 2)) < 56
      ) {
        this.levelCompleted = true;
        this.completionAnimTimer = 0;
        const meta = LEVELS_META[this.world.levelId - 1];
        const speedBonus = Math.max(0, Math.round((meta.parTimeSeconds - this.elapsedSeconds) * 4));
        const noHintBonus = this.hintsUsed === 0 ? 300 : 0;
        this.score += 500 + speedBonus + noHintBonus;
        soundEngine.playVictory();
        this.spawnParticles(door.x + door.w / 2, door.y + door.h / 2, '#22D3EE', 32, 5.5);
        this.emitHud();
      }
    }
  }

  private emitHud() {
    const meta = LEVELS_META[this.world.levelId - 1];
    const sci = this.world.scientist;
    const sx = sci.body.position.x;
    const sy = sci.body.position.y;

    let nearbyPrompt: string | null = null;
    const nearest = this.findNearestInteractive(sx, sy, 86);
    if (nearest) {
      if (nearest.type === 'gravity') nearbyPrompt = '[E] Flip Gravity & Scan';
      else if (nearest.type === 'pusher') nearbyPrompt = '[E] Fire Force Pusher & Scan';
      else if (nearest.type === 'mirror') nearbyPrompt = '[E] Rotate Mirror (+15°) & Scan';
      else if (nearest.type === 'magnet') nearbyPrompt = '[E] Toggle Magnet & Scan';
      else if (nearest.type === 'ramp') nearbyPrompt = '[E] Tilt Ramp & Scan';
      else if (nearest.type === 'dispenser') nearbyPrompt = '[E] Release Energy Ball & Scan';
    } else {
      for (const box of this.world.boxes) {
        if (Math.hypot(box.body.position.x - sx, box.body.position.y - sy) < 88) {
          nearbyPrompt = box.carryable ? `[E] Pick Up / Scan ${box.name}` : `[E] Scan ${box.name}`;
          break;
        }
      }
    }

    const activeMag = this.world.magnets.find((m) => m.id === this.activeMagnetId) ?? this.world.magnets[0] ?? null;
    const carryingBox = sci.carryingBoxId
      ? this.world.boxes.find((b) => b.id === sci.carryingBoxId)?.name ?? null
      : null;

    this.callbacks.onHudUpdate({
      levelId: this.world.levelId,
      levelTitle: meta.title,
      objective: meta.objective,
      lives: this.lives,
      maxLives: this.maxLives,
      score: this.score,
      starsCollected: this.world.stars.filter((s) => s.collected).length,
      totalStars: this.world.stars.length,
      elapsedSeconds: Math.floor(this.elapsedSeconds),
      locksSolved: this.world.locks.filter(Boolean).length,
      totalLocks: 3,
      doorUnlocked: this.world.locks.every(Boolean),
      gravityDir: this.world.gravityDir,
      activeHintLevel: this.activeHintLevel,
      toastMessage: this.toastMessage,
      nearbyPrompt,
      carryingLabel: carryingBox,
      magnetStatus: activeMag
        ? { id: activeMag.id, label: activeMag.name, active: activeMag.active, polarity: activeMag.polarity }
        : null,
    });
  }

  private emitScanner() {
    if (!this.scannedEntity) {
      this.callbacks.onScannerUpdate(null);
      return;
    }

    const { type, id } = this.scannedEntity;
    if (type === 'box') {
      const box = this.world.boxes.find((b) => b.id === id);
      if (!box) {
        this.callbacks.onScannerUpdate(null);
        return;
      }
      const speedMs = (Math.hypot(box.body.velocity.x, box.body.velocity.y) * 60) / PX_PER_METER;
      const heightM = Math.max(0, (660 - box.body.position.y - box.h / 2) / PX_PER_METER);
      const pe = box.massKg * GRAVITY_ACCEL * heightM;
      const ke = 0.5 * box.massKg * speedMs * speedMs;
      const weightN = box.massKg * GRAVITY_ACCEL;

      this.callbacks.onScannerUpdate({
        id: box.id,
        name: box.name,
        massKg: box.massKg,
        appliedForceN: Math.round(box.appliedForceN || weightN),
        velocityMs: Number(speedMs.toFixed(2)),
        accelerationMs2: Number(box.accelMs2.toFixed(2)),
        concept: box.concept,
        formula: box.formula,
        formulaLiveValue: box.isEnergyBall
          ? `PE = ${pe.toFixed(1)} J  |  KE = ${ke.toFixed(1)} J`
          : `W = ${weightN.toFixed(1)} N  |  v = ${speedMs.toFixed(2)} m/s`,
        explanation: box.explanation,
        extraMetrics: box.isEnergyBall
          ? [
              { label: 'Height (h)', value: `${heightM.toFixed(2)} m` },
              { label: 'Potential Energy', value: `${pe.toFixed(1)} J` },
              { label: 'Kinetic Energy', value: `${ke.toFixed(1)} J` },
              { label: 'Total Mech. Energy', value: `${(pe + ke).toFixed(1)} J` },
            ]
          : undefined,
      });
    } else if (type === 'gravity') {
      const gm = this.world.gravityMachines.find((g) => g.id === id);
      if (!gm) return;
      this.callbacks.onScannerUpdate({
        id: gm.id,
        name: gm.name,
        massKg: 65,
        appliedForceN: Math.round(65 * GRAVITY_ACCEL),
        velocityMs: Number(((Math.hypot(this.world.scientist.body.velocity.x, this.world.scientist.body.velocity.y) * 60) / PX_PER_METER).toFixed(2)),
        accelerationMs2: this.world.gravityDir * GRAVITY_ACCEL,
        concept: 'Gravity Vector Inversion',
        formula: 'W = m · g   |   v = u + a · t',
        formulaLiveValue: `g = ${this.world.gravityDir === 1 ? '+9.8' : '-9.8'} m/s² (${this.world.gravityDir === 1 ? 'DOWN' : 'UP'})`,
        explanation: 'Reverses the laboratory gravitational field vector so all masses accelerate upward or downward at 9.8 m/s².',
      });
    } else if (type === 'pusher') {
      const fp = this.world.forcePushers.find((p) => p.id === id);
      if (!fp) return;
      this.callbacks.onScannerUpdate({
        id: fp.id,
        name: fp.name,
        massKg: 8,
        appliedForceN: fp.forceNewtons,
        velocityMs: 0,
        accelerationMs2: Number((fp.forceNewtons / 8).toFixed(2)),
        concept: "Newton's Second Law (F = ma)",
        formula: 'F = m · a',
        formulaLiveValue: `${fp.forceNewtons} N ÷ 8 kg = ${(fp.forceNewtons / 8).toFixed(1)} m/s²`,
        explanation: 'Delivers a calibrated horizontal pneumatic force impulse. Lighter carts gain much higher acceleration!',
      });
    } else if (type === 'mirror') {
      const mir = this.world.mirrors.find((m) => m.id === id);
      if (!mir) return;
      this.callbacks.onScannerUpdate({
        id: mir.id,
        name: mir.name,
        massKg: 2.5,
        appliedForceN: 0,
        velocityMs: 0,
        accelerationMs2: 0,
        concept: 'Law of Reflection',
        formula: 'θ_incident = θ_reflected',
        formulaLiveValue: `Mirror Angle = ${mir.angleDeg}°`,
        explanation: 'Flat optical mirror that reflects incoming laser rays at an equal opposite angle relative to its surface normal.',
      });
    } else if (type === 'magnet') {
      const mag: ElectromagnetState | undefined = this.world.magnets.find((m) => m.id === id);
      if (!mag) return;
      this.callbacks.onScannerUpdate({
        id: mag.id,
        name: mag.name,
        massKg: 45,
        appliedForceN: mag.active ? Math.round(mag.strength * 240) : 0,
        velocityMs: 0,
        accelerationMs2: 0,
        concept: 'Magnetic Attraction & Repulsion',
        formula: 'F_mag ∝ 1 / r²',
        formulaLiveValue: `${mag.active ? 'ACTIVE' : 'OFF'} · ${mag.polarity.toUpperCase()}`,
        explanation: 'Controllable electromagnetic coil. ATTRACT pulls steel objects toward the core; REPEL pushes them away!',
      });
    } else if (type === 'ramp') {
      const ramp = this.world.movableRamps.find((r) => r.id === id);
      if (!ramp) return;
      const deg = Math.round((ramp.angles[ramp.angleIndex] * 180) / Math.PI);
      this.callbacks.onScannerUpdate({
        id: ramp.id,
        name: ramp.name,
        massKg: 30,
        appliedForceN: 0,
        velocityMs: 0,
        accelerationMs2: Number((GRAVITY_ACCEL * Math.abs(Math.sin(ramp.angles[ramp.angleIndex]))).toFixed(2)),
        concept: 'Inclined Plane & Energy Conversion',
        formula: 'a = g · sin(θ)   |   PE → KE',
        formulaLiveValue: `Tilt = ${deg}° · a = ${(GRAVITY_ACCEL * Math.abs(Math.sin(ramp.angles[ramp.angleIndex]))).toFixed(2)} m/s²`,
        explanation: 'Tilting the ramp changes its slope angle θ, guiding rolling spheres and controlling how quickly PE turns into KE.',
      });
    } else if (type === 'dispenser') {
      const disp = this.world.dispensers.find((d) => d.id === id);
      if (!disp) return;
      const pe = disp.ballMassKg * GRAVITY_ACCEL * disp.heightMeters;
      this.callbacks.onScannerUpdate({
        id: disp.id,
        name: disp.name,
        massKg: disp.ballMassKg,
        appliedForceN: Math.round(disp.ballMassKg * GRAVITY_ACCEL),
        velocityMs: 0,
        accelerationMs2: GRAVITY_ACCEL,
        concept: 'Gravitational Potential Energy',
        formula: 'PE = m · g · h',
        formulaLiveValue: `PE = ${disp.ballMassKg} × 9.8 × ${disp.heightMeters} = ${pe.toFixed(1)} J`,
        explanation: 'Releases a steel sphere at height h. Higher release height stores more Potential Energy to climb taller hills!',
      });
    }
  }
}

// Geometry helpers for real-time laser optics
function raySegmentIntersect(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number | null {
  const sx = x2 - x1;
  const sy = y2 - y1;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-6) return null;
  const qpx = x1 - ox;
  const qpy = y1 - oy;
  const t = (qpx * sy - qpy * sx) / denom;
  const u = (qpx * dy - qpy * dx) / denom;
  if (t > 0 && u >= 0 && u <= 1) return t;
  return null;
}

function rayCircleIntersect(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  cx: number,
  cy: number,
  r: number
): number | null {
  const fx = ox - cx;
  const fy = oy - cy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * c;
  if (disc < 0) return null;
  const sqrtD = Math.sqrt(disc);
  const t1 = (-b - sqrtD) / 2;
  const t2 = (-b + sqrtD) / 2;
  if (t1 > 0) return t1;
  if (t2 > 0) return t2;
  return null;
}

function rayAABBIntersect(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): { t: number; normal: { x: number; y: number } } | null {
  const invX = dx !== 0 ? 1 / dx : 1e9;
  const invY = dy !== 0 ? 1 / dy : 1e9;

  const t1 = (minX - ox) * invX;
  const t2 = (maxX - ox) * invX;
  const t3 = (minY - oy) * invY;
  const t4 = (maxY - oy) * invY;

  const tminX = Math.min(t1, t2);
  const tmaxX = Math.max(t1, t2);
  const tminY = Math.min(t3, t4);
  const tmaxY = Math.max(t3, t4);

  const tEnter = Math.max(tminX, tminY);
  const tExit = Math.min(tmaxX, tmaxY);

  if (tExit < 0 || tEnter > tExit) return null;

  // Determine whether ray hits entry (outside) or exit (inside)
  if (tEnter > 2) {
    const normal =
      tminX > tminY
        ? { x: dx > 0 ? -1 : 1, y: 0 }
        : { x: 0, y: dy > 0 ? -1 : 1 };
    return { t: tEnter, normal };
  }
  if (tExit > 2) {
    const normal =
      tmaxX < tmaxY
        ? { x: dx > 0 ? 1 : -1, y: 0 }
        : { x: 0, y: dy > 0 ? 1 : -1 };
    return { t: tExit, normal };
  }
  return null;
}
