import { PhysicsGameEngine } from './engine';
import { LevelWorld } from './worldTypes';

export function renderGameCanvas(
  ctx: CanvasRenderingContext2D,
  game: PhysicsGameEngine,
  viewW: number,
  viewH: number,
  nowSec: number
) {
  const world = game.world;
  const camX = game.camera.x;

  ctx.save();
  // Base background gradient (deep futuristic lab midnight)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, viewH);
  if (world.levelId === 3) {
    // Dark optics room
    bgGrad.addColorStop(0, '#050814');
    bgGrad.addColorStop(1, '#0B1228');
  } else {
    bgGrad.addColorStop(0, '#080E21');
    bgGrad.addColorStop(0.55, '#0D1633');
    bgGrad.addColorStop(1, '#111B3D');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, viewW, viewH);

  // Parallax Layer 1: Distant lab arches & blueprint grid (0.2x camera)
  drawParallaxBackdrop(ctx, world, camX, viewW, viewH, nowSec);

  // World-space transform (camera + vertical scale to fit 720px height cleanly)
  const scaleY = viewH / world.height;
  ctx.save();
  ctx.scale(scaleY, scaleY);
  ctx.translate(-camX, 0);

  // Parallax Layer 2: Midground lab pillars, glowing tanks & conduits (world space)
  drawLabArchitecture(ctx, world, camX, viewW / scaleY, nowSec);

  // Hazards (glowing plasma / voltage trenches)
  for (const hz of world.hazards) {
    drawHazard(ctx, hz.x, hz.y, hz.w, hz.h, hz.label, nowSec);
  }

  // Static Platforms & Ramps & Glass Blocks
  for (const { body, def } of world.staticBodies) {
    if (def.x < -20 || def.x >= world.width) continue;
    if (def.isGlass) {
      drawGlassBlock(ctx, def.x, def.y, def.w, def.h, def.refractiveIndex ?? 1.5);
    } else if (def.angle) {
      drawRotatedPlatform(ctx, body.position.x, body.position.y, def.w, def.h, def.angle, def.surface ?? 'normal');
    } else {
      drawPlatform(ctx, def.x, def.y, def.w, def.h, def.surface ?? 'normal');
    }
  }

  // Moving Platforms
  for (const mp of world.movingPlatforms) {
    drawMovingPlatform(ctx, mp.body.position.x, mp.body.position.y, mp.w, mp.h, nowSec);
  }

  // Movable Ramps (Level 5)
  for (const ramp of world.movableRamps) {
    const hovered = game.hoveredWorldEntityId === ramp.id;
    drawMovableRamp(ctx, ramp.x, ramp.y, ramp.w, ramp.h, ramp.angles[ramp.angleIndex], hovered);
  }

  // Gates
  for (const gate of world.gates) {
    drawGate(ctx, gate.body.position.x, gate.body.position.y, gate.w, gate.h, gate.color, gate.open);
  }

  // Checkpoints
  for (const cp of world.checkpoints) {
    drawCheckpoint(ctx, cp.x, cp.y, cp.reached, nowSec);
  }

  // Exit Door
  drawExitDoor(ctx, world, nowSec);

  // Pressure Switches
  for (const sw of world.switches) {
    drawPressureSwitch(ctx, sw, nowSec);
  }

  // Gravity Machines
  for (const gm of world.gravityMachines) {
    drawGravityMachine(ctx, gm.x, gm.y, gm.w, gm.h, world.gravityDir, game.hoveredWorldEntityId === gm.id, nowSec);
  }

  // Force Pushers
  for (const fp of world.forcePushers) {
    drawForcePusher(ctx, fp.x, fp.y, fp.w, fp.h, fp.pistonExtend, fp.forceNewtons, game.hoveredWorldEntityId === fp.id);
  }

  // Electromagnets & Animated Magnetic Field Lines
  for (const mag of world.magnets) {
    drawElectromagnet(ctx, mag, world.boxes, game.hoveredWorldEntityId === mag.id, nowSec);
  }

  // Ball Dispensers
  for (const disp of world.dispensers) {
    drawBallDispenser(ctx, disp.x, disp.y, disp.heightMeters, disp.ballMassKg, game.hoveredWorldEntityId === disp.id);
  }

  // Laser Emitters, Receivers & Mirrors (Level 3)
  for (const rec of world.laserReceivers) {
    drawLaserReceiver(ctx, rec.x, rec.y, rec.radius, rec.hit, rec.label, nowSec);
  }
  for (const emit of world.laserEmitters) {
    drawLaserEmitter(ctx, emit.x, emit.y, emit.angleDeg, emit.color);
  }
  for (const seg of world.laserSegments) {
    drawLaserBeam(ctx, seg.x1, seg.y1, seg.x2, seg.y2, seg.color, seg.inGlass, nowSec);
  }
  for (const mir of world.mirrors) {
    drawMirror(ctx, mir.x, mir.y, mir.length, mir.angleDeg, game.hoveredWorldEntityId === mir.id);
  }

  // Dynamic Boxes, Carts & Energy Balls
  for (const box of world.boxes) {
    drawDynamicBox(ctx, box, game.hoveredWorldEntityId === box.id, world.scientist.carryingBoxId === box.id, nowSec);
  }

  // Collectible Science Stars
  for (const star of world.stars) {
    if (!star.collected) {
      drawScienceStar(ctx, star.x, star.y + Math.sin(star.bobOffset) * 5, nowSec);
    }
  }

  // Cartoon Scientist Character
  drawScientist(ctx, world, nowSec);

  // Particles
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();
  ctx.restore();
}

function drawParallaxBackdrop(
  ctx: CanvasRenderingContext2D,
  world: LevelWorld,
  camX: number,
  viewW: number,
  viewH: number,
  nowSec: number
) {
  // Subtle blueprint grid
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.055)';
  ctx.lineWidth = 1;
  const gridSize = 48;
  const offsetX = -(camX * 0.25) % gridSize;
  for (let x = offsetX; x < viewW; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, viewH);
    ctx.stroke();
  }
  for (let y = 0; y < viewH; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(viewW, y);
    ctx.stroke();
  }

  // Distant futuristic laboratory domes & vertical light columns (0.2x parallax)
  const spacing = 360;
  const startIdx = Math.floor((camX * 0.2) / spacing) - 1;
  const endIdx = startIdx + Math.ceil(viewW / spacing) + 3;
  for (let i = startIdx; i <= endIdx; i++) {
    const px = i * spacing - camX * 0.2;
    ctx.fillStyle = 'rgba(30, 41, 82, 0.35)';
    ctx.fillRect(px + 60, viewH * 0.14, 150, viewH * 0.72);

    // Glowing vertical neon light strip
    const pulse = 0.25 + 0.12 * Math.sin(nowSec * 1.8 + i);
    ctx.fillStyle = world.levelId === 3 ? `rgba(168, 85, 247, ${pulse})` : `rgba(34, 211, 238, ${pulse})`;
    ctx.fillRect(px + 132, viewH * 0.16, 4, viewH * 0.65);

    // Overhead skylight arch
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px + 135, viewH * 0.22, 95, Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLabArchitecture(
  ctx: CanvasRenderingContext2D,
  world: LevelWorld,
  camX: number,
  visW: number,
  nowSec: number
) {
  // Midground laboratory tanks & pipes along the back wall
  const step = 480;
  const first = Math.max(0, Math.floor(camX / step) * step);
  for (let x = first; x < camX + visW + step; x += step) {
    if (x > world.width - 120) continue;
    // Overhead conduit pipe
    ctx.fillStyle = '#182246';
    ctx.fillRect(x + 40, 72, 340, 14);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.fillRect(x + 40, 76, 340, 3);

    // Bubbling lab containment tank
    const tx = x + 190;
    const ty = 490;
    ctx.fillStyle = 'rgba(15, 23, 52, 0.75)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(tx, ty, 52, 120, 10);
    ctx.fill();
    ctx.stroke();

    const bubbleY = ty + 100 - ((nowSec * 28 + x) % 85);
    ctx.fillStyle = 'rgba(34, 211, 238, 0.35)';
    ctx.beginPath();
    ctx.arc(tx + 26, bubbleY, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlatform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  surface: 'normal' | 'rubber' | 'ice'
) {
  ctx.save();
  if (surface === 'ice') {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#38BDF8');
    grad.addColorStop(0.25, '#0284C7');
    grad.addColorStop(1, '#0F172A');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#BAE6FD';
    ctx.fillRect(x, y, w, 5);
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#E0F2FE';
    ctx.fillText('CRYO-ICE (LOW FRICTION)', x + 12, y + 22);
  } else if (surface === 'rubber') {
    ctx.fillStyle = '#2E1065';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#F59E0B';
    for (let rx = x + 6; rx < x + w - 10; rx += 18) {
      ctx.fillRect(rx, y, 10, 5);
    }
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#FDE68A';
    ctx.fillText('HIGH FRICTION', x + 10, y + 22);
  } else {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#1E2B58');
    grad.addColorStop(1, '#111936');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#33417A';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    // Top neon trim
    ctx.fillStyle = '#22D3EE';
    ctx.fillRect(x, y, w, 3);
  }
  ctx.restore();
}

function drawRotatedPlatform(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  angle: number,
  surface: 'normal' | 'rubber' | 'ice'
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  drawPlatform(ctx, -w / 2, -h / 2, w, h, surface);
  ctx.restore();
}

function drawGlassBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  n: number
) {
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, 'rgba(103, 232, 249, 0.22)');
  grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.12)');
  grad.addColorStop(1, 'rgba(168, 85, 247, 0.22)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#67E8F9';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.font = '600 11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#CFFAFE';
  ctx.fillText(`GLASS n=${n}`, x + 10, y + 20);
  ctx.restore();
}

function drawMovingPlatform(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  nowSec: number
) {
  ctx.save();
  ctx.fillStyle = '#1E3A8A';
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 6);
  ctx.fill();
  ctx.stroke();

  const glow = 0.6 + 0.4 * Math.sin(nowSec * 5);
  ctx.fillStyle = `rgba(34, 211, 238, ${glow})`;
  ctx.fillRect(cx - w / 2 + 8, cy + h / 2 - 4, w - 16, 3);
  ctx.restore();
}

function drawMovableRamp(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  angle: number,
  hovered: boolean
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = hovered ? '#0E7490' : '#1D4ED8';
  ctx.strokeStyle = hovered ? '#67E8F9' : '#38BDF8';
  ctx.lineWidth = hovered ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Center pivot gear
  ctx.save();
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = '#22D3EE';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawGate(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  color: string,
  open: boolean
) {
  ctx.save();
  ctx.fillStyle = open ? 'rgba(16, 185, 129, 0.25)' : '#1E293B';
  ctx.strokeStyle = open ? '#10B981' : color;
  ctx.lineWidth = 2.5;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);

  // Energy bars inside barrier
  ctx.fillStyle = open ? '#10B981' : color;
  for (let y = cy - h / 2 + 14; y < cy + h / 2 - 10; y += 24) {
    ctx.fillRect(cx - w / 2 + 5, y, w - 10, 5);
  }
  ctx.restore();
}

function drawHazard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  nowSec: number
) {
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, 'rgba(239, 68, 68, 0.85)');
  grad.addColorStop(1, 'rgba(127, 29, 29, 0.95)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Electric wave along top
  ctx.strokeStyle = '#FCA5A5';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let px = x; px <= x + w; px += 12) {
    const py = y + Math.sin(nowSec * 9 + px * 0.08) * 3;
    if (px === x) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#FEE2E2';
  ctx.textAlign = 'center';
  ctx.fillText(label.toUpperCase(), x + w / 2, y + 26);
  ctx.restore();
}

function drawCheckpoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  reached: boolean,
  nowSec: number
) {
  ctx.save();
  const color = reached ? '#10B981' : '#64748B';
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(x - 16, y + 32, 32, 10);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + 32);
  ctx.lineTo(x, y - 16);
  ctx.stroke();

  const pulse = reached ? 0.85 + 0.15 * Math.sin(nowSec * 5) : 0.4;
  ctx.fillStyle = reached ? `rgba(16, 185, 129, ${pulse})` : 'rgba(100, 116, 139, 0.45)';
  ctx.beginPath();
  ctx.arc(x, y - 20, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawExitDoor(ctx: CanvasRenderingContext2D, world: LevelWorld, nowSec: number) {
  const { x, y, w, h, openAnim } = world.door;
  const unlocked = world.locks.every(Boolean);

  ctx.save();
  // Door frame
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = unlocked ? '#10B981' : '#6366F1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x - 6, y - 8, w + 12, h + 8, [12, 12, 0, 0]);
  ctx.fill();
  ctx.stroke();

  // Swirling portal when unlocked
  if (unlocked) {
    const grad = ctx.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, w * 0.7);
    grad.addColorStop(0, '#ECFEFF');
    grad.addColorStop(0.45, '#22D3EE');
    grad.addColorStop(1, '#4F46E5');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, 18 + Math.sin(nowSec * 6) * 4, 34, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Sliding door shutters
  const slide = openAnim * (w / 2);
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(x, y, Math.max(0, w / 2 - slide), h);
  ctx.fillRect(x + w / 2 + slide, y, Math.max(0, w / 2 - slide), h);

  // 3 Lock indicator lights above door
  for (let i = 0; i < 3; i++) {
    const lx = x + 14 + i * 22;
    const ly = y - 20;
    ctx.fillStyle = world.locks[i] ? '#10B981' : '#EF4444';
    ctx.beginPath();
    ctx.arc(lx, ly, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.fillStyle = unlocked ? '#6EE7B7' : '#CBD5E1';
  ctx.textAlign = 'center';
  ctx.fillText(unlocked ? 'EXIT OPEN' : 'LOCKED', x + w / 2, y - 34);
  ctx.restore();
}

function drawPressureSwitch(
  ctx: CanvasRenderingContext2D,
  sw: LevelWorld['switches'][0],
  nowSec: number
) {
  ctx.save();
  const color = sw.activated ? '#10B981' : '#F59E0B';
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(sw.x, sw.y, sw.w, sw.h);
  ctx.fillStyle = color;
  const padOffset = sw.activated ? (sw.inverted ? -3 : 3) : 0;
  ctx.fillRect(sw.x + 6, sw.y + padOffset, sw.w - 12, 6);

  if (sw.activated) {
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 10 + Math.sin(nowSec * 6) * 4;
  }
  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.fillStyle = sw.activated ? '#6EE7B7' : '#FDE68A';
  ctx.textAlign = 'center';
  const labelY = sw.inverted ? sw.y + 28 : sw.y - 10;
  ctx.fillText(sw.label, sw.x + sw.w / 2, labelY);
  ctx.restore();
}

function drawGravityMachine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  gDir: 1 | -1,
  hovered: boolean,
  nowSec: number
) {
  ctx.save();
  ctx.fillStyle = hovered ? '#164E63' : '#1E293B';
  ctx.strokeStyle = gDir === -1 ? '#C084FC' : '#22D3EE';
  ctx.lineWidth = hovered ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  // Spinning anti-grav core
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(nowSec * (gDir === -1 ? -3 : 2));
  ctx.strokeStyle = gDir === -1 ? '#E879F9' : '#38BDF8';
  ctx.lineWidth = 2;
  ctx.strokeRect(-10, -10, 20, 20);
  ctx.restore();

  // Direction arrow
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '700 14px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(gDir === -1 ? '▲' : '▼', cx, cy + 5);
  ctx.font = '600 9px "JetBrains Mono", monospace';
  ctx.fillStyle = '#A5F3FC';
  ctx.fillText('GRAV', cx, y - 6);
  ctx.restore();
}

function drawForcePusher(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  extend: number,
  forceN: number,
  hovered: boolean
) {
  ctx.save();
  ctx.fillStyle = hovered ? '#1E40AF' : '#1E293B';
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = hovered ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  // Piston rod
  const extPx = extend * 38;
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(x + w, y + h / 2 - 5, 10 + extPx, 10);
  ctx.fillStyle = '#22D3EE';
  ctx.fillRect(x + w + 10 + extPx, y + 6, 8, h - 12);

  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#BAE6FD';
  ctx.textAlign = 'center';
  ctx.fillText(`${forceN}N`, x + w / 2, y + h / 2 + 4);
  ctx.restore();
}

function drawElectromagnet(
  ctx: CanvasRenderingContext2D,
  mag: LevelWorld['magnets'][0],
  boxes: LevelWorld['boxes'],
  hovered: boolean,
  nowSec: number
) {
  ctx.save();
  // Animated magnetic field lines!
  if (mag.active) {
    const isAttract = mag.polarity === 'attract';
    const fieldColor = isAttract ? 'rgba(34, 211, 238, 0.45)' : 'rgba(192, 132, 252, 0.48)';
    ctx.strokeStyle = fieldColor;
    ctx.lineWidth = 2;

    for (let r = 1; r <= 3; r++) {
      const phase = ((nowSec * 1.4 + r * 0.33) % 1);
      const radius = isAttract ? (1 - phase) * 140 + 25 : phase * 140 + 25;
      ctx.globalAlpha = (1 - phase) * 0.6;
      ctx.beginPath();
      ctx.arc(mag.x, mag.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Field lines connected to nearby magnetic boxes
    for (const box of boxes) {
      if (!box.isMagnetic) continue;
      const dist = Math.hypot(box.body.position.x - mag.x, box.body.position.y - mag.y);
      if (dist < mag.range) {
        ctx.strokeStyle = isAttract ? 'rgba(34, 211, 238, 0.55)' : 'rgba(192, 132, 252, 0.55)';
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = isAttract ? nowSec * 40 : -nowSec * 40;
        ctx.beginPath();
        ctx.moveTo(mag.x, mag.y);
        ctx.lineTo(box.body.position.x, box.body.position.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // Magnet coil housing
  ctx.fillStyle = mag.active
    ? mag.polarity === 'attract'
      ? '#0E7490'
      : '#6B21A8'
    : '#1E293B';
  ctx.strokeStyle = hovered ? '#FFFFFF' : mag.active ? '#22D3EE' : '#64748B';
  ctx.lineWidth = hovered ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(mag.x - mag.w / 2, mag.y - mag.h / 2, mag.w, mag.h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#F8FAFC';
  ctx.textAlign = 'center';
  ctx.fillText(mag.active ? mag.polarity.toUpperCase() : 'MAG OFF', mag.x, mag.y + 4);
  ctx.restore();
}

function drawBallDispenser(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hMeters: number,
  massKg: number,
  hovered: boolean
) {
  ctx.save();
  ctx.fillStyle = hovered ? '#0E7490' : '#1E293B';
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = hovered ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(x - 22, y - 22, 44, 44, 8);
  ctx.fill();
  ctx.stroke();

  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#FDE68A';
  ctx.textAlign = 'center';
  ctx.fillText(`h=${hMeters}m`, x, y - 2);
  ctx.fillText(`${massKg}kg`, x, y + 12);
  ctx.restore();
}

function drawLaserEmitter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleDeg: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-16, -12, 32, 24, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(10, -4, 8, 8);
  ctx.restore();
}

function drawMirror(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angleDeg: number,
  hovered: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);

  // Mirror backing
  ctx.fillStyle = '#334155';
  ctx.fillRect(-length / 2, 1, length, 6);

  // Reflective cyan-silver face
  ctx.strokeStyle = hovered ? '#FFFFFF' : '#67E8F9';
  ctx.lineWidth = hovered ? 5 : 3.5;
  ctx.beginPath();
  ctx.moveTo(-length / 2, 0);
  ctx.lineTo(length / 2, 0);
  ctx.stroke();

  // Center pivot
  ctx.fillStyle = '#22D3EE';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#A5F3FC';
  ctx.textAlign = 'center';
  ctx.fillText(`${angleDeg}°`, x, y + 24);
  ctx.restore();
}

function drawLaserReceiver(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  hit: boolean,
  label: string,
  nowSec: number
) {
  ctx.save();
  const color = hit ? '#10B981' : '#EF4444';
  ctx.fillStyle = hit ? 'rgba(16, 185, 129, 0.25)' : 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = hit ? `rgba(52, 211, 153, ${0.7 + 0.3 * Math.sin(nowSec * 8)})` : '#7F1D1D';
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.48, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.fillStyle = hit ? '#6EE7B7' : '#FCA5A5';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y - radius - 8);
  ctx.restore();
}

function drawLaserBeam(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  inGlass: boolean,
  nowSec: number
) {
  ctx.save();
  ctx.lineCap = 'round';
  // Outer glow
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.35 + 0.1 * Math.sin(nowSec * 12);
  ctx.lineWidth = inGlass ? 10 : 8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Inner bright core
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = '#ECFEFF';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawDynamicBox(
  ctx: CanvasRenderingContext2D,
  box: LevelWorld['boxes'][0],
  hovered: boolean,
  carried: boolean,
  nowSec: number
) {
  const { x, y } = box.body.position;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(box.body.angle);

  if (box.isEnergyBall && box.radius) {
    const grad = ctx.createRadialGradient(-5, -5, 3, 0, 0, box.radius);
    grad.addColorStop(0, '#FEF08A');
    grad.addColorStop(0.5, box.color);
    grad.addColorStop(1, '#1E3A8A');
    ctx.fillStyle = grad;
    ctx.strokeStyle = hovered ? '#FFFFFF' : '#BAE6FD';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, box.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (box.isCart || box.isMirrorCart) {
    // Lab Cart body
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = hovered ? '#FFFFFF' : box.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-box.w / 2, -box.h / 2, box.w, box.h - 8, 6);
    ctx.fill();
    ctx.stroke();
    // Wheels
    ctx.fillStyle = box.color;
    ctx.beginPath();
    ctx.arc(-box.w / 3, box.h / 2 - 4, 7, 0, Math.PI * 2);
    ctx.arc(box.w / 3, box.h / 2 - 4, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Crate
    ctx.fillStyle = carried ? 'rgba(56, 189, 248, 0.35)' : '#172554';
    ctx.strokeStyle = hovered ? '#FFFFFF' : box.color;
    ctx.lineWidth = hovered ? 3 : 2.2;
    ctx.beginPath();
    ctx.roundRect(-box.w / 2, -box.h / 2, box.w, box.h, 6);
    ctx.fill();
    ctx.stroke();

    // Diagonal cross brace
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-box.w / 2 + 5, -box.h / 2 + 5);
    ctx.lineTo(box.w / 2 - 5, box.h / 2 - 5);
    ctx.stroke();

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#E0F2FE';
    ctx.textAlign = 'center';
    ctx.fillText(`${box.massKg}kg`, 0, 4);

    if (box.isMagnetic) {
      ctx.fillStyle = '#C084FC';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillText('MAG', 0, -box.h / 2 + 12);
    }
  }
  ctx.restore();

  // Real-time PE/KE energy bar above Energy Balls (Level 5!)
  if (box.isEnergyBall) {
    const heightM = Math.max(0, (660 - y - box.h / 2) / 50);
    const speedMs = (Math.hypot(box.body.velocity.x, box.body.velocity.y) * 60) / 50;
    const pe = box.massKg * 9.8 * heightM;
    const ke = 0.5 * box.massKg * speedMs * speedMs;
    const total = Math.max(1, pe + ke);

    const barW = 54;
    const bx = x - barW / 2;
    const by = y - (box.radius ?? 20) - 24;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(bx, by, barW, 8);
    const peW = (pe / total) * barW;
    ctx.fillStyle = '#A855F7'; // Potential Energy
    ctx.fillRect(bx, by, peW, 8);
    ctx.fillStyle = '#22D3EE'; // Kinetic Energy
    ctx.fillRect(bx + peW, by, barW - peW, 8);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, 8);

    ctx.font = '600 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#E2E8F0';
    ctx.textAlign = 'center';
    ctx.fillText(`PE:${Math.round(pe)}J KE:${Math.round(ke)}J`, x, by - 4);
    ctx.restore();
  }

  // Visual acceleration arrow when accelerating noticeably!
  if (Math.abs(box.body.velocity.x) > 0.7 && !box.isEnergyBall) {
    const dir = Math.sign(box.body.velocity.x);
    const len = Math.min(48, Math.abs(box.body.velocity.x) * 8);
    ctx.save();
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y - box.h / 2 - 10);
    ctx.lineTo(x + dir * len, y - box.h / 2 - 10);
    ctx.stroke();
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(x + dir * len, y - box.h / 2 - 10, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  void nowSec;
}

function drawScienceStar(ctx: CanvasRenderingContext2D, x: number, y: number, nowSec: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(nowSec * 2.5) * 0.15);

  ctx.shadowColor = '#FBBF24';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#FBBF24';
  ctx.strokeStyle = '#FEF3C7';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 14 : 6;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawScientist(ctx: CanvasRenderingContext2D, world: LevelWorld, nowSec: number) {
  const sci = world.scientist;
  const { x, y } = sci.body.position;
  const t = sci.animTime;

  ctx.save();
  ctx.translate(x, y);

  // Blink gently if invulnerable after damage
  if (sci.invulnTimer > 0 && Math.floor(nowSec * 14) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  // Flip vertically if gravity is inverted, and horizontally by facing direction
  ctx.scale(sci.facing, world.gravityDir);

  // Squash / stretch & lean by animation state
  let scaleX = 1;
  let scaleY = 1;
  let bodyLean = 0;
  let bobY = 0;
  let legSwing = 0;
  let armAngle = 0;

  switch (sci.anim) {
    case 'idle':
      bobY = Math.sin(t * 3.5) * 1.5;
      armAngle = Math.sin(t * 3.5) * 0.06;
      break;
    case 'walk':
      bobY = Math.abs(Math.sin(t * 9)) * -2;
      legSwing = Math.sin(t * 9) * 0.45;
      armAngle = -Math.sin(t * 9) * 0.35;
      bodyLean = 0.05;
      break;
    case 'run':
      bobY = Math.abs(Math.sin(t * 14)) * -3;
      legSwing = Math.sin(t * 14) * 0.65;
      armAngle = -Math.sin(t * 14) * 0.55;
      bodyLean = 0.14;
      break;
    case 'jump':
      scaleX = 0.92;
      scaleY = 1.08;
      armAngle = -1.1;
      legSwing = 0.3;
      break;
    case 'fall':
      scaleX = 0.96;
      scaleY = 1.04;
      armAngle = -0.65;
      legSwing = -0.25;
      break;
    case 'land':
      scaleX = 1.12;
      scaleY = 0.88;
      bobY = 3;
      break;
    case 'push':
      bodyLean = 0.22;
      legSwing = Math.sin(t * 8) * 0.35;
      armAngle = -1.25;
      break;
    case 'interact':
      armAngle = -1.35;
      bobY = -1;
      break;
    case 'victory':
      bobY = Math.abs(Math.sin(t * 10)) * -7;
      armAngle = -2.2 + Math.sin(t * 12) * 0.25;
      break;
  }

  ctx.translate(0, bobY);
  ctx.rotate(bodyLean);
  ctx.scale(scaleX, scaleY);

  // 1. Scientific Equipment Backpack (behind coat)
  ctx.fillStyle = '#334155';
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-16, -8, 10, 22, 4);
  ctx.fill();
  ctx.stroke();
  // Glowing cyan power cell on backpack
  ctx.fillStyle = '#22D3EE';
  ctx.fillRect(-14, -3, 5, 10);
  // Antenna
  ctx.strokeStyle = '#94A3B8';
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.lineTo(-14, -18);
  ctx.stroke();
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath();
  ctx.arc(-14, -18, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // 2. Blue Trousers & Boots (Legs)
  ctx.save();
  ctx.translate(-3, 10);
  ctx.rotate(legSwing);
  ctx.fillStyle = '#1D4ED8';
  ctx.fillRect(-4, 0, 7, 13);
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-4, 11, 9, 5);
  ctx.restore();

  ctx.save();
  ctx.translate(4, 10);
  ctx.rotate(-legSwing);
  ctx.fillStyle = '#2563EB';
  ctx.fillRect(-3, 0, 7, 13);
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-3, 11, 9, 5);
  ctx.restore();

  // 3. White Laboratory Coat Torso
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-9, -9, 18, 23, 5);
  ctx.fill();
  ctx.stroke();
  // Coat lapel & cyan badge
  ctx.fillStyle = '#3B82F6';
  ctx.fillRect(2, -4, 4, 6);

  // 4. Head & Messy Scientist Hair
  ctx.fillStyle = '#FDE68A';
  ctx.beginPath();
  ctx.arc(1, -17, 9.5, 0, Math.PI * 2);
  ctx.fill();

  // Hair tuft
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(-1, -22, 8.5, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, -24);
  ctx.lineTo(-2, -30);
  ctx.lineTo(3, -25);
  ctx.lineTo(7, -29);
  ctx.lineTo(9, -22);
  ctx.fill();

  // 5. Glowing Cyan Science Goggles
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-3, -21, 13, 7);
  ctx.fillStyle = '#22D3EE';
  ctx.fillRect(3, -19.5, 6, 4);
  ctx.fillStyle = '#ECFEFF';
  ctx.fillRect(5, -19, 2, 1.5);

  // 6. Arm (White coat sleeve + hand)
  ctx.save();
  ctx.translate(2, -5);
  ctx.rotate(armAngle);
  ctx.fillStyle = '#F1F5F9';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-3, 0, 6, 13, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FDE68A';
  ctx.beginPath();
  ctx.arc(0, 14, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Interaction scan beam visual
  if (sci.anim === 'interact') {
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, -5);
    ctx.lineTo(34, -14);
    ctx.lineTo(34, 6);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}
