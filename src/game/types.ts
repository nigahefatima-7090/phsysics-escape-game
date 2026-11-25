export type ScreenState =
  | 'MAIN_MENU'
  | 'LEVEL_SELECT'
  | 'HOW_TO_PLAY'
  | 'SETTINGS'
  | 'PLAYING'
  | 'PAUSED'
  | 'LEVEL_LEARNING'
  | 'GAME_ENDING';

export type ScientistAnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'land'
  | 'push'
  | 'interact'
  | 'victory';

export interface GameSettings {
  sfxVolume: number; // 0 to 1
  musicVolume: number; // 0 to 1
  muted: boolean;
  showTouchControls: 'auto' | 'always' | 'never';
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  levelId?: number;
  iconName: 'atom' | 'zap' | 'sun' | 'magnet' | 'flame' | 'award';
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LevelMeta {
  id: number;
  title: string;
  subtitle: string;
  concept: string;
  formula: string;
  objective: string;
  hints: [string, string, string];
  learning: {
    topic: string;
    explanation: string;
    formula: string;
    formulaNote: string;
    realWorldExample: string;
    questions: QuizQuestion[];
  };
  achievementId: string;
  parTimeSeconds: number;
}

export interface SaveProgress {
  unlockedLevel: number; // 1..5
  completedLevels: number[];
  bestScores: Record<number, number>;
  bestStars: Record<number, number>;
  bestTimes: Record<number, number>;
  achievements: string[];
  totalScore: number;
}

export interface ScannerData {
  id: string;
  name: string;
  massKg: number;
  appliedForceN: number;
  velocityMs: number;
  accelerationMs2: number;
  concept: string;
  formula: string;
  formulaLiveValue: string;
  explanation: string;
  extraMetrics?: { label: string; value: string }[];
}

export interface HUDState {
  levelId: number;
  levelTitle: string;
  objective: string;
  lives: number;
  maxLives: number;
  score: number;
  starsCollected: number;
  totalStars: number;
  elapsedSeconds: number;
  locksSolved: number;
  totalLocks: number;
  doorUnlocked: boolean;
  gravityDir: 1 | -1;
  activeHintLevel: number; // 0..3
  toastMessage: string | null;
  nearbyPrompt: string | null;
  carryingLabel: string | null;
  magnetStatus: { id: string; label: string; active: boolean; polarity: 'attract' | 'repel' } | null;
}

export interface LevelCompletionSummary {
  levelId: number;
  levelScore: number;
  starsCollected: number;
  timeSeconds: number;
  hintsUsed: number;
  unlockedAchievement: AchievementDef | null;
}
