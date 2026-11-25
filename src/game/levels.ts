import Matter from 'matter-js';
import {
  BallDispenserState,
  CheckpointState,
  DynamicBoxState,
  ElectromagnetState,
  ForcePusherState,
  GateState,
  GravityMachineState,
  HazardZone,
  LaserEmitterState,
  LaserReceiverState,
  LevelWorld,
  MirrorState,
  MovableRampState,
  MovingPlatformState,
  PlatformDef,
  PressureSwitchState,
  StarState,
} from './worldTypes';

const { Bodies, Body, Composite } = Matter;

function addStaticPlatform(
  engine: Matter.Engine,
  list: { body: Matter.Body; def: PlatformDef }[],
  def: PlatformDef
) {
  const frictionMap = {
    normal: 0.35,
    rubber: 0.95,
    ice: 0.008,
  };
  const body = Bodies.rectangle(def.x + def.w / 2, def.y + def.h / 2, def.w, def.h, {
    isStatic: true,
    angle: def.angle ?? 0,
    friction: frictionMap[def.surface ?? 'normal'],
    restitution: 0.05,
    isSensor: def.isGlass ? true : false,
    label: def.isGlass ? 'glass_block' : 'platform',
  });
  Composite.add(engine.world, body);
  list.push({ body, def });
}

function addRamp(
  engine: Matter.Engine,
  list: { body: Matter.Body; def: PlatformDef }[],
  cx: number,
  cy: number,
  w: number,
  h: number,
  angleDeg: number,
  surface: 'normal' | 'rubber' | 'ice' = 'normal'
) {
  const angle = (angleDeg * Math.PI) / 180;
  const frictionMap = { normal: 0.12, rubber: 0.9, ice: 0.008 };
  const body = Bodies.rectangle(cx, cy, w, h, {
    isStatic: true,
    angle,
    friction: frictionMap[surface],
    restitution: 0.05,
    label: 'ramp',
  });
  Composite.add(engine.world, body);
  list.push({
    body,
    def: { x: cx - w / 2, y: cy - h / 2, w, h, angle, surface },
  });
}

function createBox(
  engine: Matter.Engine,
  opts: {
    id: string;
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
    massKg: number;
    color: string;
    concept: string;
    formula: string;
    explanation: string;
    carryable?: boolean;
    isMagnetic?: boolean;
    isCart?: boolean;
    isMirrorCart?: boolean;
    friction?: number;
    restitution?: number;
  }
): DynamicBoxState {
  const body = Bodies.rectangle(opts.x, opts.y, opts.w, opts.h, {
    mass: opts.massKg,
    friction: opts.friction ?? (opts.isCart ? 0.015 : 0.45),
    frictionAir: opts.isCart ? 0.004 : 0.012,
    restitution: opts.restitution ?? 0.08,
    inertia: opts.isCart || opts.isMirrorCart ? Infinity : undefined,
    label: `box:${opts.id}`,
  });
  Body.setMass(body, opts.massKg);
  Composite.add(engine.world, body);
  return {
    id: opts.id,
    name: opts.name,
    body,
    w: opts.w,
    h: opts.h,
    massKg: opts.massKg,
    isMagnetic: opts.isMagnetic,
    isCart: opts.isCart,
    isMirrorCart: opts.isMirrorCart,
    carryable: opts.carryable ?? false,
    color: opts.color,
    concept: opts.concept,
    formula: opts.formula,
    explanation: opts.explanation,
    appliedForceN: 0,
    lastVel: { x: 0, y: 0 },
    accelMs2: 0,
    spawnPos: { x: opts.x, y: opts.y },
  };
}

export function createEnergyBall(
  engine: Matter.Engine,
  opts: {
    id: string;
    name: string;
    x: number;
    y: number;
    radius: number;
    massKg: number;
    color: string;
  }
): DynamicBoxState {
  const body = Bodies.circle(opts.x, opts.y, opts.radius, {
    mass: opts.massKg,
    friction: 0.004,
    frictionAir: 0.001,
    restitution: 0.35,
    label: `box:${opts.id}`,
  });
  Body.setMass(body, opts.massKg);
  Composite.add(engine.world, body);
  return {
    id: opts.id,
    name: opts.name,
    body,
    w: opts.radius * 2,
    h: opts.radius * 2,
    radius: opts.radius,
    massKg: opts.massKg,
    isEnergyBall: true,
    isMagnetic: true,
    carryable: false,
    color: opts.color,
    concept: 'Conservation of Energy (PE ↔ KE)',
    formula: 'PE = mgh  |  KE = ½mv²',
    explanation:
      'As this sphere rolls downward, stored Gravitational Potential Energy (mgh) converts directly into Kinetic Energy of motion (½mv²).',
    appliedForceN: 0,
    lastVel: { x: 0, y: 0 },
    accelMs2: 0,
    spawnPos: { x: opts.x, y: opts.y },
  };
}

function createGate(
  engine: Matter.Engine,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  openOffsetY = -150,
  color = '#22D3EE'
): GateState {
  const body = Bodies.rectangle(x + w / 2, y + h / 2, w, h, {
    isStatic: true,
    friction: 0.3,
    label: `gate:${id}`,
  });
  Composite.add(engine.world, body);
  return {
    id,
    body,
    closedX: x + w / 2,
    closedY: y + h / 2,
    openOffsetY,
    w,
    h,
    open: false,
    color,
  };
}

function createScientist(engine: Matter.Engine, x: number, y: number): LevelWorld['scientist'] {
  const body = Bodies.rectangle(x, y, 32, 52, {
    mass: 65,
    inertia: Infinity,
    friction: 0.02,
    frictionAir: 0.015,
    restitution: 0.0,
    chamfer: { radius: 8 },
    label: 'scientist',
  });
  Body.setMass(body, 65);
  Composite.add(engine.world, body);
  return {
    body,
    facing: 1,
    grounded: false,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    anim: 'idle',
    animTime: 0,
    landTimer: 0,
    interactTimer: 0,
    pushing: false,
    carryingBoxId: null,
    invulnTimer: 0,
    lastVel: { x: 0, y: 0 },
    accelMs2: 0,
  };
}

export function buildLevelWorld(levelId: number, engine: Matter.Engine): LevelWorld {
  const width = levelId === 5 ? 2600 : 2400;
  const height = 720;

  const staticBodies: { body: Matter.Body; def: PlatformDef }[] = [];
  const movingPlatforms: MovingPlatformState[] = [];
  const boxes: DynamicBoxState[] = [];
  const switches: PressureSwitchState[] = [];
  const gates: GateState[] = [];
  const gravityMachines: GravityMachineState[] = [];
  const forcePushers: ForcePusherState[] = [];
  const laserEmitters: LaserEmitterState[] = [];
  const mirrors: MirrorState[] = [];
  const laserReceivers: LaserReceiverState[] = [];
  const magnets: ElectromagnetState[] = [];
  const dispensers: BallDispenserState[] = [];
  const movableRamps: MovableRampState[] = [];
  const stars: StarState[] = [];
  const checkpoints: CheckpointState[] = [];
  const hazards: HazardZone[] = [];

  // Perimeter walls & ceiling
  addStaticPlatform(engine, staticBodies, { x: -40, y: 0, w: 40, h: height });
  addStaticPlatform(engine, staticBodies, { x: width, y: 0, w: 40, h: height });
  addStaticPlatform(engine, staticBodies, { x: 0, y: 0, w: width, h: 40 });

  let spawn = { x: 110, y: 600 };
  let door = { x: width - 130, y: 564, w: 72, h: 96, openAnim: 0 };

  if (levelId === 1) {
    // =========================================================================
    // LEVEL 1: GRAVITY CHAMBER
    // =========================================================================
    addStaticPlatform(engine, staticBodies, { x: 0, y: 660, w: 780, h: 60 });
    addStaticPlatform(engine, staticBodies, { x: 1160, y: 660, w: 1240, h: 60 });

    // Stepping ledge for heavy crate + star 1
    addStaticPlatform(engine, staticBodies, { x: 260, y: 565, w: 180, h: 24 });
    addStaticPlatform(engine, staticBodies, { x: 300, y: 455, w: 130, h: 20 });

    // Ceiling guard steps so ceiling run feels crisp
    addStaticPlatform(engine, staticBodies, { x: 750, y: 40, w: 60, h: 24 });
    addStaticPlatform(engine, staticBodies, { x: 1300, y: 40, w: 40, h: 48 });

    // Mid stepping platform over plasma hazard (allows walking OR ceiling gravity!)
    addStaticPlatform(engine, staticBodies, { x: 880, y: 540, w: 140, h: 22 });
    addStaticPlatform(engine, staticBodies, { x: 670, y: 560, w: 120, h: 20 });
    addStaticPlatform(engine, staticBodies, { x: 1170, y: 550, w: 180, h: 22 });

    // Upper chamber deck for Challenge 3 (Gravity drop shaft)
    addStaticPlatform(engine, staticBodies, { x: 1690, y: 310, w: 280, h: 24 });
    // Funnel walls guiding dropped crate onto Switch 3
    addStaticPlatform(engine, staticBodies, { x: 1965, y: 310, w: 20, h: 250 });
    addStaticPlatform(engine, staticBodies, { x: 2115, y: 200, w: 20, h: 460 });

    // Hazard pit
    hazards.push({ x: 780, y: 664, w: 380, h: 56, label: 'Plasma Pit' });

    // Gate 1 blocks corridor until Heavy Switch 1 is pressed
    gates.push(createGate(engine, 'l1_gate1', 605, 510, 24, 150, -155, '#38BDF8'));
    // Gate 2 protects drop zone until Ceiling Switch 2 is pressed
    gates.push(createGate(engine, 'l1_gate2', 1370, 510, 24, 150, -155, '#A855F7'));

    // Boxes
    boxes.push(
      createBox(engine, {
        id: 'l1_light_box',
        name: 'Aluminum Lab Box',
        x: 200,
        y: 625,
        w: 42,
        h: 42,
        massKg: 5,
        color: '#38BDF8',
        carryable: true,
        concept: 'Mass & Weight (W = mg)',
        formula: 'W = m · g = 5 × 9.8 = 49 N',
        explanation: 'Light 5 kg crate—easy to carry, but too light to trigger the 15 kg Heavy Switch alone!',
      })
    );
    boxes.push(
      createBox(engine, {
        id: 'l1_heavy_box',
        name: 'Lead-Core Heavy Crate',
        x: 340,
        y: 520,
        w: 50,
        h: 50,
        massKg: 20,
        color: '#6366F1',
        carryable: false,
        concept: 'Weight & Gravitational Force',
        formula: 'W = m · g = 20 × 9.8 = 196 N',
        explanation: 'High mass produces 196 N of downward weight force—enough to depress the Heavy Floor Switch.',
      })
    );
    boxes.push(
      createBox(engine, {
        id: 'l1_ceil_box',
        name: 'Anti-Grav Test Cube',
        x: 730,
        y: 520,
        w: 44,
        h: 44,
        massKg: 10,
        color: '#22D3EE',
        carryable: true,
        concept: 'Gravitational Acceleration',
        formula: 'v = u + a · t',
        explanation: 'When the Gravity Inverter flips direction, this cube accelerates upward at 9.8 m/s² just like you!',
      })
    );
    boxes.push(
      createBox(engine, {
        id: 'l1_drop_box',
        name: 'Drop-Test Mass Block',
        x: 1810,
        y: 265,
        w: 48,
        h: 48,
        massKg: 16,
        color: '#A855F7',
        carryable: true,
        concept: 'Free Fall & Weight',
        formula: 'W = m · g = 16 × 9.8 = 156.8 N',
        explanation: 'Push or drop this 16 kg block down the gravity shaft to smash onto Lock Switch 3 below.',
      })
    );

    // Switches
    switches.push({
      id: 'l1_sw1',
      label: 'Heavy Switch (≥15 kg)',
      x: 490,
      y: 648,
      w: 76,
      h: 12,
      minMassKg: 15,
      activated: false,
      lockIndex: 0,
      opensGateId: 'l1_gate1',
      currentLoadKg: 0,
    });
    switches.push({
      id: 'l1_sw2',
      label: 'Ceiling Gravity Switch',
      x: 1080,
      y: 40,
      w: 84,
      h: 12,
      minMassKg: 8,
      inverted: true,
      activated: false,
      lockIndex: 1,
      opensGateId: 'l1_gate2',
      currentLoadKg: 0,
    });
    switches.push({
      id: 'l1_sw3',
      label: 'Shaft Drop Switch',
      x: 2010,
      y: 648,
      w: 84,
      h: 12,
      minMassKg: 10,
      activated: false,
      lockIndex: 2,
      currentLoadKg: 0,
    });

    // Gravity inverter machines
    gravityMachines.push(
      { id: 'grav_1', name: 'Gravity Inverter α', x: 700, y: 612, w: 46, h: 48, cooldown: 0 },
      { id: 'grav_2', name: 'Ceiling Reset Switch', x: 1220, y: 40, w: 46, h: 48, cooldown: 0 },
      { id: 'grav_3', name: 'Gravity Inverter β', x: 1500, y: 612, w: 46, h: 48, cooldown: 0 }
    );

    // Moving elevator platform to reach upper drop shaft
    const elev = Bodies.rectangle(1615, 580, 120, 22, { isStatic: true, friction: 0.5, label: 'moving_platform' });
    Composite.add(engine.world, elev);
    movingPlatforms.push({
      id: 'l1_elev',
      body: elev,
      startX: 1615,
      startY: 600,
      endX: 1615,
      endY: 325,
      speed: 0.35,
      progress: 0,
      dir: 1,
      w: 120,
      h: 22,
    });

    // Stars
    stars.push(
      { id: 'l1_s1', x: 365, y: 410, collected: false, bobOffset: 0 },
      { id: 'l1_s2', x: 960, y: 110, collected: false, bobOffset: 1.5 },
      { id: 'l1_s3', x: 1830, y: 145, collected: false, bobOffset: 3.1 }
    );

    // Checkpoints
    checkpoints.push(
      { id: 'l1_cp1', x: 665, y: 618, reached: false },
      { id: 'l1_cp2', x: 1440, y: 618, reached: false }
    );
  } else if (levelId === 2) {
    // =========================================================================
    // LEVEL 2: FORCE AND MOTION LAB
    // =========================================================================
    // Floor segments with friction materials!
    addStaticPlatform(engine, staticBodies, { x: 0, y: 660, w: 1090, h: 60, surface: 'normal' });
    addStaticPlatform(engine, staticBodies, { x: 1320, y: 660, w: 380, h: 60, surface: 'normal' });
    // High-friction rubber pad
    addStaticPlatform(engine, staticBodies, { x: 1700, y: 660, w: 130, h: 60, surface: 'rubber' });
    // Low-friction cryo-ice bridge!
    addStaticPlatform(engine, staticBodies, { x: 1830, y: 660, w: 350, h: 60, surface: 'ice' });
    // Final floor
    addStaticPlatform(engine, staticBodies, { x: 2180, y: 660, w: 220, h: 60, surface: 'normal' });

    // Zone 1 ramp + upper switch shelf
    addRamp(engine, staticBodies, 480, 595, 220, 22, -26, 'normal');
    addStaticPlatform(engine, staticBodies, { x: 570, y: 540, w: 210, h: 24 });
    addStaticPlatform(engine, staticBodies, { x: 420, y: 430, w: 120, h: 20 });

    // Zone 2 cart ramp + elevated switch platform
    addRamp(engine, staticBodies, 1140, 595, 210, 22, -24, 'ice');
    addStaticPlatform(engine, staticBodies, { x: 1225, y: 545, w: 250, h: 24 });
    addStaticPlatform(engine, staticBodies, { x: 1465, y: 465, w: 22, h: 104 }); // backstop wall for cart

    // Zone 3 upper platform for Star 3
    addStaticPlatform(engine, staticBodies, { x: 1920, y: 440, w: 150, h: 22 });

    hazards.push({ x: 1090, y: 664, w: 230, h: 56, label: 'Laser Trench' });

    gates.push(createGate(engine, 'l2_gate1', 790, 510, 24, 150, -155, '#38BDF8'));
    gates.push(createGate(engine, 'l2_gate2', 1530, 510, 24, 150, -155, '#22D3EE'));

    // Boxes & Cart
    boxes.push(
      createBox(engine, {
        id: 'l2_light_crate',
        name: 'Polymer Crate (4 kg)',
        x: 240,
        y: 625,
        w: 44,
        h: 44,
        massKg: 4,
        color: '#22D3EE',
        carryable: true,
        concept: "Newton's Second Law (F = ma)",
        formula: 'a = F / m = F / 4 kg',
        explanation: 'Low mass (4 kg) means high acceleration when pushed up the inclined ramp!',
      })
    );
    boxes.push(
      createBox(engine, {
        id: 'l2_cart',
        name: 'Low-Friction Lab Cart',
        x: 960,
        y: 628,
        w: 64,
        h: 36,
        massKg: 8,
        isCart: true,
        color: '#38BDF8',
        friction: 0.012,
        concept: 'Force Impulse & Ramp Acceleration',
        formula: 'F = m · a',
        explanation: 'Trigger the Pneumatic Force Pusher to launch this 8 kg cart up the cryo-ramp onto Switch 2!',
      })
    );
    boxes.push(
      createBox(engine, {
        id: 'l2_heavy_steel',
        name: 'Heavy Steel Block (25 kg)',
        x: 1730,
        y: 615,
        w: 54,
        h: 54,
        massKg: 25,
        color: '#818CF8',
        carryable: false,
        friction: 0.18,
        concept: 'Inertia & Surface Friction',
        formula: 'F_net = F_push − F_friction',
        explanation: 'Heavy 25 kg mass resists motion on rubber, but glides smoothly once it hits the slippery Cryo-Ice bridge!',
      })
    );

    forcePushers.push({
      id: 'l2_pusher1',
      name: 'Pneumatic Force Pusher',
      x: 865,
      y: 610,
      w: 54,
      h: 50,
      dirX: 1,
      dirY: -0.08,
      forceNewtons: 185,
      cooldown: 0,
      pistonExtend: 0,
    });

    switches.push({
      id: 'l2_sw1',
      label: 'Ramp Force Switch',
      x: 640,
      y: 528,
      w: 76,
      h: 12,
      minMassKg: 3,
      activated: false,
      lockIndex: 0,
      opensGateId: 'l2_gate1',
      currentLoadKg: 0,
    });
    switches.push({
      id: 'l2_sw2',
      label: 'Cart Track Switch',
      x: 1330,
      y: 533,
      w: 84,
      h: 12,
      minMassKg: 6,
      activated: false,
      lockIndex: 1,
      opensGateId: 'l2_gate2',
      currentLoadKg: 0,
    });
    switches.push({
      id: 'l2_sw3',
      label: 'Cryo-Ice Terminal Switch',
      x: 2090,
      y: 648,
      w: 82,
      h: 12,
      minMassKg: 15,
      activated: false,
      lockIndex: 2,
      currentLoadKg: 0,
    });

    // Moving platforms
    const mp1 = Bodies.rectangle(1160, 410, 120, 20, { isStatic: true, friction: 0.4, label: 'moving_platform' });
    Composite.add(engine.world, mp1);
    movingPlatforms.push({
      id: 'l2_mp1',
      body: mp1,
      startX: 1020,
      startY: 420,
      endX: 1280,
      endY: 420,
      speed: 0.4,
      progress: 0,
      dir: 1,
      w: 120,
      h: 20,
    });

    const mp2 = Bodies.rectangle(1830, 560, 100, 20, { isStatic: true, friction: 0.4, label: 'moving_platform' });
    Composite.add(engine.world, mp2);
    movingPlatforms.push({
      id: 'l2_mp2',
      body: mp2,
      startX: 1830,
      startY: 590,
      endX: 1830,
      endY: 455,
      speed: 0.42,
      progress: 0,
      dir: 1,
      w: 100,
      h: 20,
    });

    stars.push(
      { id: 'l2_s1', x: 480, y: 380, collected: false, bobOffset: 0.2 },
      { id: 'l2_s2', x: 1150, y: 345, collected: false, bobOffset: 1.8 },
      { id: 'l2_s3', x: 1995, y: 390, collected: false, bobOffset: 3.3 }
    );

    checkpoints.push(
      { id: 'l2_cp1', x: 835, y: 618, reached: false },
      { id: 'l2_cp2', x: 1610, y: 618, reached: false }
    );
  } else if (levelId === 3) {
    // =========================================================================
    // LEVEL 3: LASER AND LIGHT ROOM
    // =========================================================================
    addStaticPlatform(engine, staticBodies, { x: 0, y: 660, w: width, h: 60 });

    // Optics Chamber Architecture
    // Challenge 1 platforms & wall
    addStaticPlatform(engine, staticBodies, { x: 260, y: 550, w: 160, h: 20 });
    addStaticPlatform(engine, staticBodies, { x: 280, y: 420, w: 140, h: 20 });
    addStaticPlatform(engine, staticBodies, { x: 440, y: 520, w: 150, h: 20 });

    // Divider wall in Zone 1 (beam bounces under/over!)
    addStaticPlatform(engine, staticBodies, { x: 400, y: 260, w: 24, h: 190 });

    // Challenge 2 Glass Refraction Block (bends laser downward!)
    addStaticPlatform(engine, staticBodies, {
      x: 940,
      y: 250,
      w: 130,
      h: 170,
      isGlass: true,
      refractiveIndex: 1.5,
    });
    // Platform to reach Mirror 2 & Glass Block top
    addStaticPlatform(engine, staticBodies, { x: 780, y: 540, w: 150, h: 20 });
    addStaticPlatform(engine, staticBodies, { x: 1090, y: 480, w: 160, h: 20 });
    addStaticPlatform(engine, staticBodies, { x: 930, y: 230, w: 150, h: 18 }); // walkway over glass block

    // Challenge 3 Divider Pillar + Upper Mirror Deck
    addStaticPlatform(engine, staticBodies, { x: 1760, y: 200, w: 28, h: 280 });
    addStaticPlatform(engine, staticBodies, { x: 1590, y: 430, w: 140, h: 20 });
    addStaticPlatform(engine, staticBodies, { x: 1920, y: 460, w: 160, h: 20 });
    addStaticPlatform(engine, staticBodies, { x: 1960, y: 310, w: 150, h: 20 });

    gates.push(createGate(engine, 'l3_gate1', 640, 510, 24, 150, -155, '#22D3EE'));
    gates.push(createGate(engine, 'l3_gate2', 1390, 510, 24, 150, -155, '#A855F7'));

    // Laser Emitters
    laserEmitters.push(
      // Emitter 1 fires RIGHT at y=490 -> hits Mirror 1 at (510, 490)
      { id: 'emit1', x: 120, y: 490, angleDeg: 0, color: '#22D3EE' },
      // Emitter 2 fires down-right (22.5 deg) through Glass Block (940..1070, 250..420)
      { id: 'emit2', x: 790, y: 255, angleDeg: 22.5, color: '#A855F7' },
      // Emitter 3 fires RIGHT at y=380 -> hits Mirror 3 at (1660, 380) -> down to Mirror 4 -> under pillar -> Cart Mirror 5 -> Receiver 3
      { id: 'emit3', x: 1480, y: 380, angleDeg: 0, color: '#38BDF8' }
    );

    // Movable Mirror Cart for Challenge 3!
    boxes.push(
      createBox(engine, {
        id: 'l3_mirror_cart',
        name: 'Mobile Mirror Cart',
        x: 1850,
        y: 625,
        w: 62,
        h: 42,
        massKg: 10,
        isMirrorCart: true,
        color: '#38BDF8',
        friction: 0.08,
        concept: 'Optical Alignment & Reflection',
        formula: 'θ_incident = θ_reflected',
        explanation: 'Push this mirror cart horizontally under Receiver γ, then click or press E on its mirror to bounce the laser beam straight up!',
      })
    );

    // Mirrors (rotatable in 15° steps; target angles carefully aligned!)
    mirrors.push(
      { id: 'mir1', name: 'Optic Mirror α', x: 510, y: 490, length: 68, angleDeg: 90, rotatable: true },
      { id: 'mir2', name: 'Refraction Mirror β', x: 1170, y: 393, length: 74, angleDeg: 105, rotatable: true },
      { id: 'mir3', name: 'Relay Mirror γ', x: 1660, y: 380, length: 68, angleDeg: 0, rotatable: true },
      { id: 'mir4', name: 'Floor Relay Mirror', x: 1660, y: 600, length: 68, angleDeg: 45, rotatable: true },
      { id: 'mir5', name: 'Cart-Mounted Mirror', x: 1850, y: 600, length: 72, angleDeg: 90, attachedBoxId: 'l3_mirror_cart', rotatable: true }
    );

    // Receivers
    laserReceivers.push(
      { id: 'rec1', label: 'Receiver α', x: 510, y: 170, radius: 28, hit: false, lockIndex: 0, opensGateId: 'l3_gate1' },
      { id: 'rec2', label: 'Receiver β', x: 1200, y: 170, radius: 28, hit: false, lockIndex: 1, opensGateId: 'l3_gate2' },
      { id: 'rec3', label: 'Receiver γ', x: 1975, y: 185, radius: 30, hit: false, lockIndex: 2 }
    );

    // Moving elevator in Zone 2 after Gate 2
    const mp = Bodies.rectangle(1310, 560, 100, 20, { isStatic: true, friction: 0.4, label: 'moving_platform' });
    Composite.add(engine.world, mp);
    movingPlatforms.push({
      id: 'l3_elev',
      body: mp,
      startX: 1310,
      startY: 590,
      endX: 1310,
      endY: 290,
      speed: 0.36,
      progress: 0,
      dir: 1,
      w: 100,
      h: 20,
    });

    stars.push(
      { id: 'l3_s1', x: 350, y: 365, collected: false, bobOffset: 0 },
      { id: 'l3_s2', x: 1005, y: 180, collected: false, bobOffset: 1.4 },
      { id: 'l3_s3', x: 2030, y: 260, collected: false, bobOffset: 2.9 }
    );

    checkpoints.push(
      { id: 'l3_cp1', x: 700, y: 618, reached: false },
      { id: 'l3_cp2', x: 1450, y: 618, reached: false }
    );
  } else if (levelId === 4) {
    // =========================================================================
    // LEVEL 4: MAGNETIC MYSTERY
    // =========================================================================
    addStaticPlatform(engine, staticBodies, { x: 0, y: 660, w: 380, h: 60 });
    addStaticPlatform(engine, staticBodies, { x: 560, y: 660, w: 1040, h: 60 });
    addStaticPlatform(engine, staticBodies, { x: 1780, y: 660, w: 620, h: 60 });

    // Zone 1 bridge/stepping ledge over gap
    addStaticPlatform(engine, staticBodies, { x: 420, y: 530, w: 100, h: 20 });
    // Narrow metal-glide rail (non-blocking for player jump, supports box attraction across gap? Wait: let's add a raised magnetic bridge rail or let strong magnet pull box smoothly!)
    addStaticPlatform(engine, staticBodies, { x: 380, y: 642, w: 180, h: 12, surface: 'ice' });

    // Zone 2 Vertical Repulsion Shaft & Upper Switch Ledge
    addStaticPlatform(engine, staticBodies, { x: 960, y: 360, w: 22, h: 240 });
    addStaticPlatform(engine, staticBodies, { x: 1125, y: 360, w: 200, h: 22 });
    addStaticPlatform(engine, staticBodies, { x: 890, y: 520, w: 70, h: 20 });
    addStaticPlatform(engine, staticBodies, { x: 1245, y: 260, w: 22, h: 122 }); // stop wall

    // Zone 3 Overhead Magnetic Corridor
    addStaticPlatform(engine, staticBodies, { x: 1620, y: 525, w: 130, h: 20 });
    addStaticPlatform(engine, staticBodies, { x: 1820, y: 470, w: 150, h: 20 });

    hazards.push({ x: 1600, y: 664, w: 180, h: 56, label: 'High-Voltage Trench' });

    gates.push(createGate(engine, 'l4_gate1', 750, 510, 24, 150, -155, '#22D3EE'));
    gates.push(createGate(engine, 'l4_gate2', 1360, 510, 24, 150, -155, '#A855F7'));

    boxes.push(
      createBox(engine, {
        id: 'l4_mag_box1',
        name: 'Ferromagnetic Crate α',
        x: 240,
        y: 625,
        w: 46,
        h: 46,
        massKg: 10,
        isMagnetic: true,
        color: '#38BDF8',
        friction: 0.08,
        concept: 'Magnetic Attraction',
        formula: 'F_mag ∝ 1 / r²',
        explanation: 'This iron-core crate is strongly attracted to Electromagnet α across the cryo-rail!',
      })
    );
    boxes.push(
      createBox(engine, {
        id: 'l4_mag_sphere',
        name: 'Magnetized Launch Core',
        x: 1045,
        y: 565,
        w: 44,
        h: 44,
        massKg: 6,
        isMagnetic: true,
        color: '#A855F7',
        friction: 0.05,
        concept: 'Magnetic Repulsion',
        formula: 'F_repel = +k / r²',
        explanation: 'Switch Electromagnet β to REPEL mode to launch this magnetic core upward onto the upper switch!',
      })
    );
    boxes.push(
      createBox(engine, {
        id: 'l4_mag_core3',
        name: 'Electromagnetic Relay Cube',
        x: 1520,
        y: 625,
        w: 46,
        h: 46,
        massKg: 8,
        isMagnetic: true,
        color: '#22D3EE',
        friction: 0.12,
        concept: 'Dual-Polarity Steering',
        formula: 'F_net = F_mag + W',
        explanation: 'Use the overhead magnet to lift this cube over the voltage trench, then attract or repel it onto Receptor 3!',
      })
    );

    magnets.push(
      {
        id: 'mag1',
        name: 'Electromagnet α',
        x: 685,
        y: 590,
        w: 56,
        h: 56,
        active: false,
        polarity: 'attract',
        strength: 0.95,
        range: 540,
      },
      {
        id: 'mag2',
        name: 'Floor Repulsor β',
        x: 1045,
        y: 632,
        w: 74,
        h: 28,
        active: false,
        polarity: 'repel',
        strength: 1.35,
        range: 400,
        dirX: 0.22,
        dirY: -1,
      },
      {
        id: 'mag3',
        name: 'Crane Magnet γ',
        x: 1710,
        y: 260,
        w: 64,
        h: 52,
        active: false,
        polarity: 'attract',
        strength: 1.15,
        range: 520,
      },
      {
        id: 'mag4',
        name: 'Terminal Puller δ',
        x: 2070,
        y: 590,
        w: 56,
        h: 56,
        active: false,
        polarity: 'attract',
        strength: 0.95,
        range: 460,
      }
    );

    switches.push(
      {
        id: 'l4_sw1',
        label: 'Magnetic Receptor α',
        x: 595,
        y: 648,
        w: 76,
        h: 12,
        minMassKg: 6,
        requiresMagnetic: true,
        activated: false,
        lockIndex: 0,
        opensGateId: 'l4_gate1',
        currentLoadKg: 0,
      },
      {
        id: 'l4_sw2',
        label: 'Upper Magnetic Switch β',
        x: 1150,
        y: 348,
        w: 84,
        h: 12,
        minMassKg: 4,
        requiresMagnetic: true,
        activated: false,
        lockIndex: 1,
        opensGateId: 'l4_gate2',
        currentLoadKg: 0,
      },
      {
        id: 'l4_sw3',
        label: 'Final Magnetic Receptor γ',
        x: 1965,
        y: 648,
        w: 88,
        h: 12,
        minMassKg: 6,
        requiresMagnetic: true,
        activated: false,
        lockIndex: 2,
        currentLoadKg: 0,
      }
    );

    const mp = Bodies.rectangle(1895, 390, 110, 20, { isStatic: true, friction: 0.4, label: 'moving_platform' });
    Composite.add(engine.world, mp);
    movingPlatforms.push({
      id: 'l4_mp',
      body: mp,
      startX: 1895,
      startY: 420,
      endX: 1895,
      endY: 280,
      speed: 0.4,
      progress: 0,
      dir: 1,
      w: 110,
      h: 20,
    });

    stars.push(
      { id: 'l4_s1', x: 470, y: 400, collected: false, bobOffset: 0 },
      { id: 'l4_s2', x: 1185, y: 245, collected: false, bobOffset: 1.2 },
      { id: 'l4_s3', x: 1895, y: 215, collected: false, bobOffset: 2.7 }
    );

    checkpoints.push(
      { id: 'l4_cp1', x: 825, y: 618, reached: false },
      { id: 'l4_cp2', x: 1430, y: 618, reached: false }
    );
  } else {
    // =========================================================================
    // LEVEL 5: ENERGY ESCAPE (PE, KE & Conservation of Energy)
    // =========================================================================
    addStaticPlatform(engine, staticBodies, { x: 0, y: 660, w: width, h: 60 });

    // Zone 1: Dual Height Energy Chute + Opposing Hill
    // Climbing platforms for scientist
    addStaticPlatform(engine, staticBodies, { x: 80, y: 545, w: 120, h: 20 });
    addStaticPlatform(engine, staticBodies, { x: 130, y: 425, w: 120, h: 20 });
    addStaticPlatform(engine, staticBodies, { x: 80, y: 305, w: 150, h: 20 });

    // Downhill roller chute (ice friction so energy conservation shines!)
    addRamp(engine, staticBodies, 365, 360, 270, 18, 34, 'ice');
    addRamp(engine, staticBodies, 535, 515, 220, 18, 16, 'ice');
    // Opposing uphill climb! Needs high PE from top dispenser (y=240) to reach y=410!
    addRamp(engine, staticBodies, 690, 495, 190, 18, -28, 'ice');
    addStaticPlatform(engine, staticBodies, { x: 755, y: 440, w: 120, h: 20 });

    // Zone 2: Movable Ramp Track
    addStaticPlatform(engine, staticBodies, { x: 960, y: 300, w: 110, h: 20 });
    addStaticPlatform(engine, staticBodies, { x: 960, y: 520, w: 110, h: 20 });
    addStaticPlatform(engine, staticBodies, { x: 1275, y: 445, w: 140, h: 20 }); // bridge shelf
    addStaticPlatform(engine, staticBodies, { x: 1555, y: 645, w: 145, h: 15 });

    // Movable Ramps (click or press E to align!)
    const ramp1Body = Bodies.rectangle(1165, 375, 190, 18, {
      isStatic: true,
      angle: -0.35, // misaligned initially!
      friction: 0.008,
      label: 'movable_ramp',
    });
    Composite.add(engine.world, ramp1Body);
    movableRamps.push({
      id: 'ramp1',
      name: 'Kinetic Bridge Ramp α',
      body: ramp1Body,
      x: 1165,
      y: 375,
      w: 190,
      h: 18,
      angles: [-0.35, 0.36], // angle 1 aligns downward toward bridge!
      angleIndex: 0,
    });

    const ramp2Body = Bodies.rectangle(1485, 515, 200, 18, {
      isStatic: true,
      angle: -0.28, // misaligned initially!
      friction: 0.008,
      label: 'movable_ramp',
    });
    Composite.add(engine.world, ramp2Body);
    movableRamps.push({
      id: 'ramp2',
      name: 'Kinetic Bridge Ramp β',
      body: ramp2Body,
      x: 1485,
      y: 515,
      w: 200,
      h: 18,
      angles: [-0.28, 0.38],
      angleIndex: 0,
    });

    // Zone 3: Grand Finale Rollercoaster
    addStaticPlatform(engine, staticBodies, { x: 1880, y: 280, w: 160, h: 20 });
    addRamp(engine, staticBodies, 2070, 385, 240, 18, 30, 'ice');
    addRamp(engine, staticBodies, 2245, 525, 210, 18, 22, 'ice');
    addStaticPlatform(engine, staticBodies, { x: 2320, y: 585, w: 110, h: 20 });

    gates.push(createGate(engine, 'l5_gate1', 880, 510, 24, 150, -155, '#22D3EE'));
    gates.push(createGate(engine, 'l5_gate2', 1700, 510, 24, 150, -155, '#A855F7'));

    // Dispensers
    dispensers.push(
      {
        id: 'disp_low',
        name: 'Low-PE Dispenser (h = 2.5 m)',
        x: 245,
        y: 485,
        heightMeters: 2.5,
        ballMassKg: 4,
        cooldown: 0,
        activeBallId: null,
      },
      {
        id: 'disp_high',
        name: 'High-PE Dispenser (h = 8.4 m)',
        x: 245,
        y: 235,
        heightMeters: 8.4,
        ballMassKg: 4,
        cooldown: 0,
        activeBallId: null,
      },
      {
        id: 'disp_mid',
        name: 'Track-2 Sphere Dispenser',
        x: 1015,
        y: 240,
        heightMeters: 8.2,
        ballMassKg: 5,
        cooldown: 0,
        activeBallId: null,
      },
      {
        id: 'disp_final',
        name: 'Mega Energy Core Dispenser',
        x: 1930,
        y: 220,
        heightMeters: 8.8,
        ballMassKg: 10,
        cooldown: 0,
        activeBallId: null,
      }
    );

    // Magnetic Kinetic Booster in Zone 3
    magnets.push({
      id: 'l5_booster',
      name: 'Kinetic Accelerator Coil',
      x: 2150,
      y: 350,
      w: 58,
      h: 48,
      active: false,
      polarity: 'attract',
      strength: 1.25,
      range: 420,
    });

    switches.push(
      {
        id: 'l5_sw1',
        label: 'Energy Turbine α',
        x: 785,
        y: 428,
        w: 76,
        h: 12,
        minMassKg: 2,
        requiresEnergyBall: true,
        activated: false,
        lockIndex: 0,
        opensGateId: 'l5_gate1',
        currentLoadKg: 0,
      },
      {
        id: 'l5_sw2',
        label: 'Energy Turbine β',
        x: 1585,
        y: 633,
        w: 84,
        h: 12,
        minMassKg: 2,
        requiresEnergyBall: true,
        activated: false,
        lockIndex: 1,
        opensGateId: 'l5_gate2',
        currentLoadKg: 0,
      },
      {
        id: 'l5_sw3',
        label: 'Main Reactor Turbine γ',
        x: 2335,
        y: 573,
        w: 84,
        h: 12,
        minMassKg: 4,
        requiresEnergyBall: true,
        activated: false,
        lockIndex: 2,
        currentLoadKg: 0,
      }
    );

    // Moving elevator in Zone 3
    const elev = Bodies.rectangle(1805, 570, 100, 20, { isStatic: true, friction: 0.4, label: 'moving_platform' });
    Composite.add(engine.world, elev);
    movingPlatforms.push({
      id: 'l5_elev',
      body: elev,
      startX: 1805,
      startY: 590,
      endX: 1805,
      endY: 295,
      speed: 0.36,
      progress: 0,
      dir: 1,
      w: 100,
      h: 20,
    });

    stars.push(
      { id: 'l5_s1', x: 420, y: 230, collected: false, bobOffset: 0 },
      { id: 'l5_s2', x: 1345, y: 365, collected: false, bobOffset: 1.5 },
      { id: 'l5_s3', x: 2150, y: 205, collected: false, bobOffset: 3.0 }
    );

    checkpoints.push(
      { id: 'l5_cp1', x: 920, y: 618, reached: false },
      { id: 'l5_cp2', x: 1740, y: 618, reached: false }
    );
  }

  const scientist = createScientist(engine, spawn.x, spawn.y);

  return {
    levelId,
    width,
    height,
    spawn,
    respawn: { ...spawn },
    door,
    gravityDir: 1,
    staticBodies,
    movingPlatforms,
    boxes,
    switches,
    gates,
    gravityMachines,
    forcePushers,
    laserEmitters,
    mirrors,
    laserReceivers,
    laserSegments: [],
    magnets,
    dispensers,
    movableRamps,
    stars,
    checkpoints,
    hazards,
    locks: [false, false, false],
    scientist,
  };
}
