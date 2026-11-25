import { AchievementDef, GameSettings, LevelMeta, SaveProgress } from './types';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'gravity_genius',
    title: 'Gravity Genius',
    description: 'Mastered gravity, mass, and acceleration in the Gravity Chamber.',
    levelId: 1,
    iconName: 'atom',
  },
  {
    id: 'force_master',
    title: 'Force Master',
    description: "Conquered Newton's laws, friction, and carts in the Force & Motion Lab.",
    levelId: 2,
    iconName: 'zap',
  },
  {
    id: 'light_expert',
    title: 'Light Expert',
    description: 'Guided laser beams with reflection and refraction in the Laser & Light Room.',
    levelId: 3,
    iconName: 'sun',
  },
  {
    id: 'magnet_master',
    title: 'Magnet Master',
    description: 'Controlled magnetic attraction and repulsion in Magnetic Mystery.',
    levelId: 4,
    iconName: 'magnet',
  },
  {
    id: 'energy_champion',
    title: 'Energy Champion',
    description: 'Balanced potential and kinetic energy to unlock Energy Escape.',
    levelId: 5,
    iconName: 'flame',
  },
  {
    id: 'ultimate_scientist',
    title: 'Ultimate Physics Scientist',
    description: 'Escaped all five chambers of the Physics Laboratory!',
    iconName: 'award',
  },
];

export const LEVELS_META: LevelMeta[] = [
  {
    id: 1,
    title: 'Level 1: Gravity Chamber',
    subtitle: 'Gravity, Mass & Acceleration',
    concept: 'Gravity, Weight (W = mg) & Gravitational Acceleration',
    formula: 'W = m · g   |   v = u + a · t',
    objective: 'Activate all 3 gravity pressure locks to open the chamber exit door.',
    hints: [
      'Physics Concept: Gravity pulls every object toward the source of gravity with constant acceleration (g = 9.8 m/s²), while Weight depends on mass (W = m · g). Heavy objects press heavy switches harder!',
      'Puzzle Clue: Push the heavy steel crate (20 kg) onto the Heavy Floor Switch on the left. Then use the cyan Gravity Inverter Switch to flip gravity upward so you and the floating crate can reach the ceiling!',
      'Direct Clue: For the third lock, carry or push the upper crate over the right-side shaft while gravity is flipped, then restore normal gravity so it drops directly onto the gated bottom switch!',
    ],
    learning: {
      topic: 'Gravity, Mass & Acceleration',
      explanation:
        'Gravity is a force that attracts objects toward Earth (or whichever direction the Gravity Chamber pulls!). While all falling objects accelerate at the same rate (g ≈ 9.8 m/s²) regardless of mass in a vacuum, their weight force (W = m × g) increases with mass.',
      formula: 'W = m · g   &   v = u + a · t',
      formulaNote: 'W = Weight (Newtons), m = Mass (kg), g = Gravity (9.8 m/s²), v = Final velocity.',
      realWorldExample:
        'Astronauts float on the Moon with 1/6th of Earth’s gravity—their mass stays the same, but their weight becomes six times smaller!',
      questions: [
        {
          question: 'A 20 kg lab crate rests on a platform where g = 9.8 m/s². What is its weight?',
          options: ['196 N', '20 N', '2.04 N', '98 N'],
          correctIndex: 0,
          explanation: 'Using W = m · g, W = 20 kg × 9.8 m/s² = 196 Newtons.',
        },
        {
          question: 'If a crate drops from rest (u = 0) under gravity (a = 9.8 m/s²) for 2 seconds, what is its velocity?',
          options: ['9.8 m/s', '19.6 m/s', '4.9 m/s', '29.4 m/s'],
          correctIndex: 1,
          explanation: 'Using v = u + a · t, v = 0 + (9.8 × 2) = 19.6 m/s.',
        },
        {
          question: 'When the Gravity Inverter flips direction, what changes for the crate?',
          options: [
            'Its mass becomes negative',
            'The direction of gravitational force and acceleration reverses',
            'Its density disappears',
            'Friction drops to zero',
          ],
          correctIndex: 1,
          explanation: 'Mass is constant, but gravity is a vector force—flipping its direction reverses acceleration.',
        },
      ],
    },
    achievementId: 'gravity_genius',
    parTimeSeconds: 180,
  },
  {
    id: 2,
    title: 'Level 2: Force & Motion Lab',
    subtitle: "Newton's Laws, Force & Friction",
    concept: "Newton's Second Law (F = ma) & Surface Friction",
    formula: 'F = m · a   |   F_net = F_push − F_friction',
    objective: 'Engage all 3 motion switches using boxes, carts, ramps, and cryo-ice.',
    hints: [
      'Physics Concept: By Newton’s Second Law (a = F / m), heavier objects accelerate more slowly for the same push. Rough rubber slows objects via high friction, while smooth cryo-ice lets objects glide!',
      'Puzzle Clue: Push the Light Crate across the ramp onto Switch 1. Use the Pneumatic Force Pusher (click or press E) to launch the Lab Cart up the incline onto Switch 2!',
      'Direct Clue: For Switch 3, push the Heavy 25 kg Steel Block across the slippery blue Cryo-Ice bridge—once it gains velocity, low friction carries it right onto the final switch!',
    ],
    learning: {
      topic: "Newton's Laws, Force & Friction",
      explanation:
        "Newton's First Law says objects keep moving unless a force like friction stops them. Newton's Second Law (F = m · a) shows that larger mass requires a larger force to reach the same acceleration. Different surfaces exert different amounts of friction!",
      formula: 'F = m · a',
      formulaNote: 'F = Net Force (Newtons), m = Mass (kg), a = Acceleration (m/s²).',
      realWorldExample:
        'An ice hockey puck slides far across smooth ice (low friction), while a heavy suitcase on carpet stops immediately (high friction + large mass).',
      questions: [
        {
          question: 'If you push a 5 kg cart with a net force of 25 N, what is its acceleration?',
          options: ['125 m/s²', '5 m/s²', '20 m/s²', '0.2 m/s²'],
          correctIndex: 1,
          explanation: 'Rearranging F = m · a gives a = F / m = 25 N / 5 kg = 5 m/s².',
        },
        {
          question: 'Why did the 25 kg block glide easily across the blue Cryo-Ice track?',
          options: [
            'Its mass shrank on ice',
            'Gravity turned off on the bridge',
            'Cryo-ice has a very low coefficient of friction',
            'Air pressure pushed it forward',
          ],
          correctIndex: 2,
          explanation: 'Low surface friction produces very little opposing force, so momentum keeps the block moving.',
        },
        {
          question: 'Which object accelerates faster when pushed with the exact same force?',
          options: ['A 4 kg light box', 'A 25 kg steel block', 'Both accelerate equally', 'Neither moves'],
          correctIndex: 0,
          explanation: 'Since a = F / m, smaller mass produces greater acceleration for the same force.',
        },
      ],
    },
    achievementId: 'force_master',
    parTimeSeconds: 200,
  },
  {
    id: 3,
    title: 'Level 3: Laser & Light Room',
    subtitle: 'Reflection & Refraction Optics',
    concept: 'Law of Reflection (θi = θr) & Snell’s Law of Refraction',
    formula: 'θ_incident = θ_reflected   |   n₁ sin(θ₁) = n₂ sin(θ₂)',
    objective: 'Route the laser beams to power all 3 Optical Receivers.',
    hints: [
      'Physics Concept: Mirrors reflect light so the angle of incidence equals the angle of reflection. Glass refraction blocks bend light rays as they slow down inside glass (n = 1.5)!',
      'Puzzle Clue: Click or press E on Mirror 1 to rotate it until the cyan beam hits Receiver 1 (opening the first barrier). Look at how the Glass Block shifts the second beam path!',
      'Direct Clue: Rotate Mirror 2 to catch the refracted beam and bounce it into Receiver 2 (starting the elevator). Ride up, push/position Mirror 3, and angle Mirror 3 & 4 into Receiver 3!',
    ],
    learning: {
      topic: 'Reflection & Refraction of Light',
      explanation:
        'Light travels in straight lines until it meets a surface. On a mirror, it reflects cleanly at the exact opposite angle (θᵢ = θᵣ). When light enters transparent glass at an angle, it slows down and bends—a phenomenon called refraction.',
      formula: 'θᵢ = θᵣ   &   n₁ sin θ₁ = n₂ sin θ₂',
      formulaNote: 'θᵢ = Incident angle, θᵣ = Reflected angle, n = Refractive index (Air ≈ 1.0, Glass ≈ 1.5).',
      realWorldExample:
        'Fiber-optic internet cables bounce laser light off internal glass walls using reflection, while eyeglasses and camera lenses bend light using refraction.',
      questions: [
        {
          question: 'A laser beam strikes a flat mirror at a 35° angle to the normal. At what angle does it reflect?',
          options: ['70°', '35°', '55°', '90°'],
          correctIndex: 1,
          explanation: 'By the Law of Reflection, the angle of reflection always equals the angle of incidence (35°).',
        },
        {
          question: 'Why does a laser beam bend when it enters a glass block at an angle?',
          options: [
            'Glass absorbs half the beam',
            'Light changes speed when moving from air into denser glass',
            'Gravity pulls photons sideways',
            'Mirrors inside the glass spin the light',
          ],
          correctIndex: 1,
          explanation: 'Refraction occurs because light travels slower in glass (n = 1.5) than in air (n = 1.0).',
        },
        {
          question: 'If a mirror is rotated by 22.5°, how much does the reflected laser ray rotate?',
          options: ['11.25°', '22.5°', '45°', '90°'],
          correctIndex: 2,
          explanation: 'Rotating a mirror by θ rotates the reflected ray by 2θ (2 × 22.5° = 45°).',
        },
      ],
    },
    achievementId: 'light_expert',
    parTimeSeconds: 210,
  },
  {
    id: 4,
    title: 'Level 4: Magnetic Mystery',
    subtitle: 'Magnetic Attraction & Repulsion',
    concept: 'Electromagnetism, Polarity & Inverse-Square Force',
    formula: 'F_mag ∝ (m₁ · m₂) / r²',
    objective: 'Power all 3 Magnetic Receptors using electromagnet ON/OFF and polarity controls.',
    hints: [
      'Physics Concept: Opposite magnetic poles ATTRACT and pull ferromagnetic steel boxes closer. Like poles REPEL and push metal objects away—stronger when closer (1/r²)!',
      'Puzzle Clue: Turn Electromagnet 1 ON in ATTRACT mode to pull the steel crate across the gap onto Magnetic Switch 1. Use the HUD Magnet Console or click directly on any magnet!',
      'Direct Clue: Switch Electromagnet 2 to REPEL to launch the steel core upward onto the upper Magnetic Gate Switch, then alternate ATTRACT/REPEL on Magnet 3 to guide the final core into Receptor 3!',
    ],
    learning: {
      topic: 'Magnetic Attraction & Repulsion',
      explanation:
        'Electromagnets create controllable magnetic fields using electric current. Unlike permanent magnets, you can turn them ON or OFF and reverse their polarity. Attraction pulls magnetic metals closer, while repulsion pushes them away—and force grows rapidly as distance shrinks.',
      formula: 'F_mag ∝ 1 / r²',
      formulaNote: 'r = Distance between the magnet and magnetic object. Halving distance multiplies force by 4!',
      realWorldExample:
        'Maglev bullet trains use powerful alternating electromagnets to levitate above tracks with zero rail friction and accelerate to over 500 km/h!',
      questions: [
        {
          question: 'What happens if you bring a metal core twice as close to an active electromagnet?',
          options: [
            'Magnetic force becomes roughly 4 times stronger',
            'Magnetic force becomes half as strong',
            'Magnetic force stays identical',
            'Polarity automatically flips',
          ],
          correctIndex: 0,
          explanation: 'Because magnetic force follows an inverse-square relationship (1/r²), halving distance quadruples strength.',
        },
        {
          question: 'Which setting lets an electromagnet push a magnetized metal core upward away from it?',
          options: ['OFF mode', 'ATTRACT polarity', 'REPEL polarity', 'Zero gravity'],
          correctIndex: 2,
          explanation: 'Like poles repel, exerting an outward pushing force on the magnetic core.',
        },
        {
          question: 'Why does a plastic or wooden crate NOT react to the laboratory electromagnets?',
          options: [
            'Wood is too heavy',
            'Plastic and wood are non-ferromagnetic materials',
            'Magnets only work on liquids',
            'Wood cancels out gravity',
          ],
          correctIndex: 1,
          explanation: 'Only ferromagnetic materials like iron, nickel, cobalt, and steel strongly respond to magnetic fields.',
        },
      ],
    },
    achievementId: 'magnet_master',
    parTimeSeconds: 210,
  },
  {
    id: 5,
    title: 'Level 5: Energy Escape',
    subtitle: 'Kinetic, Potential & Conservation of Energy',
    concept: 'Conservation of Mechanical Energy (PE + KE = Constant)',
    formula: 'PE = m · g · h   |   KE = ½ · m · v²',
    objective: 'Guide Energy Spheres through all 3 energy turbines to unlock the Final Escape Portal!',
    hints: [
      'Physics Concept: At the top of a ramp, a ball stores Gravitational Potential Energy (PE = mgh). As it rolls down, PE transforms into Kinetic Energy (KE = ½mv²)—speeding up!',
      'Puzzle Clue: For Challenge 1, drop the Energy Sphere from the HIGH release chute (greater height h = greater PE = enough KE to climb the opposing ramp to Turbine 1)!',
      'Direct Clue: Click or press E on the glowing Bridge Ramps to align the middle track for Turbine 2, then combine the Gravity Booster & Kinetic Ramp in the upper-right finale to trigger Turbine 3!',
    ],
    learning: {
      topic: 'Kinetic Energy, Potential Energy & Conservation',
      explanation:
        'Energy cannot be created or destroyed—it transforms! Raising a ball to height h stores Potential Energy (PE = mgh). Releasing it converts that stored energy into Kinetic Energy of motion (KE = ½mv²), letting it climb ramps and activate mechanical switches.',
      formula: 'PE = m · g · h   &   KE = ½ · m · v²',
      formulaNote: 'm = Mass (kg), g = 9.8 m/s², h = Height (m), v = Speed (m/s). Total E ≈ PE + KE.',
      realWorldExample:
        'Roller coasters are lifted to one tall first hill to gain maximum Potential Energy—from there, gravity converts PE to KE and back again all the way to the finish!',
      questions: [
        {
          question: 'A 2 kg steel ball is held 5 m above the floor (g = 9.8 m/s²). What is its Potential Energy?',
          options: ['19.6 J', '98 J', '49 J', '10 J'],
          correctIndex: 1,
          explanation: 'Using PE = m · g · h, PE = 2 × 9.8 × 5 = 98 Joules.',
        },
        {
          question: 'If a ball’s speed doubles, what happens to its Kinetic Energy (KE = ½mv²)?',
          options: [
            'It doubles (2×)',
            'It stays the same',
            'It quadruples (4×)',
            'It drops by half',
          ],
          correctIndex: 2,
          explanation: 'Velocity is squared in KE = ½mv², so doubling v multiplies KE by 2² = 4.',
        },
        {
          question: 'Why couldn’t the ball released from the low platform climb over the tall hill?',
          options: [
            'Its initial Potential Energy was less than the energy needed to reach the top of the hill',
            'Steel balls lose mass while rolling',
            'Potential energy only works upside down',
            'Kinetic energy reverses gravity',
          ],
          correctIndex: 0,
          explanation: 'By Conservation of Energy, a rolling ball cannot climb higher than its starting height without extra energy added.',
        },
      ],
    },
    achievementId: 'energy_champion',
    parTimeSeconds: 240,
  },
];

const SAVE_KEY = 'physics_escape_save_v1';
const SETTINGS_KEY = 'physics_escape_settings_v1';

export const DEFAULT_SAVE: SaveProgress = {
  unlockedLevel: 1,
  completedLevels: [],
  bestScores: {},
  bestStars: {},
  bestTimes: {},
  achievements: [],
  totalScore: 0,
};

export const DEFAULT_SETTINGS: GameSettings = {
  sfxVolume: 0.7,
  musicVolume: 0.35,
  muted: false,
  showTouchControls: 'auto',
};

export function loadSaveProgress(): SaveProgress {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<SaveProgress>;
    return {
      unlockedLevel: Math.max(1, Math.min(5, parsed.unlockedLevel ?? 1)),
      completedLevels: Array.isArray(parsed.completedLevels) ? parsed.completedLevels : [],
      bestScores: parsed.bestScores ?? {},
      bestStars: parsed.bestStars ?? {},
      bestTimes: parsed.bestTimes ?? {},
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      totalScore: parsed.totalScore ?? 0,
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function writeSaveProgress(save: SaveProgress): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearSaveProgress(): SaveProgress {
  const fresh = { ...DEFAULT_SAVE };
  writeSaveProgress(fresh);
  return fresh;
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      sfxVolume: typeof parsed.sfxVolume === 'number' ? parsed.sfxVolume : 0.7,
      musicVolume: typeof parsed.musicVolume === 'number' ? parsed.musicVolume : 0.35,
      muted: Boolean(parsed.muted),
      showTouchControls: parsed.showTouchControls ?? 'auto',
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}
