import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Gamepad2,
  Home,
  Lock,
  Play,
  RotateCcw,
  Settings,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LEVELS_META } from '../game/data';
import { GameSettings, SaveProgress } from '../game/types';

interface LevelSelectProps {
  save: SaveProgress;
  onSelectLevel: (levelId: number) => void;
  onBack: () => void;
}

export const LevelSelectScreen: React.FC<LevelSelectProps> = ({ save, onSelectLevel, onBack }) => {
  return (
    <div className="min-h-screen w-full bg-[#080D1E] overflow-y-auto p-6 sm:p-10 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Menu
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Select Laboratory Chamber</h1>
          <div className="w-24 hidden sm:block" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LEVELS_META.map((lvl) => {
            const unlocked = lvl.id <= save.unlockedLevel;
            const completed = save.completedLevels.includes(lvl.id);
            const stars = save.bestStars[lvl.id] ?? 0;
            const bestScore = save.bestScores[lvl.id] ?? 0;
            const bestTime = save.bestTimes[lvl.id];

            return (
              <div
                key={lvl.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                  unlocked
                    ? 'bg-slate-900/90 border-slate-700 hover:border-cyan-400/70'
                    : 'bg-slate-950/60 border-slate-800/80 opacity-65'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono-tech">
                    <span className="text-cyan-400">ROOM 0{lvl.id}</span>
                    {completed ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ESCAPED
                      </span>
                    ) : !unlocked ? (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Lock className="w-3.5 h-3.5" /> LOCKED
                      </span>
                    ) : (
                      <span className="text-amber-300">READY</span>
                    )}
                  </div>

                  <h2 className="font-display text-lg font-bold text-white">{lvl.title.replace(/^Level \d+: /, '')}</h2>
                  <p className="text-xs text-slate-400">{lvl.subtitle}</p>
                  <div className="text-xs font-mono-tech text-purple-300 pt-1">{lvl.formula}</div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono-tech">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3].map((s) => (
                        <Star key={s} className={`w-4 h-4 ${s <= stars ? 'fill-amber-400' : 'text-slate-700'}`} />
                      ))}
                    </div>
                    <span>{bestScore > 0 ? `${bestScore} pts` : 'No score'}</span>
                    {bestTime !== undefined && <span>{bestTime}s</span>}
                  </div>

                  <button
                    disabled={!unlocked}
                    onClick={() => onSelectLevel(lvl.id)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-colors ${
                      unlocked
                        ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {completed ? 'Replay Chamber' : unlocked ? 'Enter Chamber' : 'Complete Previous Level'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const HowToPlayScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen w-full bg-[#080D1E] overflow-y-auto p-6 sm:p-10 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Menu
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">How To Play</h1>
          <div className="w-24 hidden sm:block" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-display font-bold text-lg">
              <Gamepad2 className="w-5 h-5" />
              <span>Controls</span>
            </div>
            <div className="space-y-2.5 text-sm text-slate-300">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span>Move Left / Right</span>
                <span className="font-mono-tech text-cyan-300">A / D or ← / →</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span>Jump</span>
                <span className="font-mono-tech text-cyan-300">W / ↑ / Space</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span>Interact & Physics Scanner</span>
                <span className="font-mono-tech text-cyan-300">E</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span>Pick Up / Drop Portable Boxes</span>
                <span className="font-mono-tech text-cyan-300">E or F</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span>Activate Switches / Mirrors / Magnets</span>
                <span className="font-mono-tech text-cyan-300">Mouse Click</span>
              </div>
              <div className="flex justify-between">
                <span>Pause Game</span>
                <span className="font-mono-tech text-cyan-300">ESC</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 pt-1">
              On touch devices, responsive Left, Right, Jump, and Interact buttons appear automatically.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-6 space-y-4">
            <h2 className="font-display font-bold text-lg text-purple-300">Science Lab Survival Guide</h2>
            <ul className="space-y-3 text-sm text-slate-300 list-disc pl-5">
              <li>
                <strong className="text-white">Unlock 3 Locks per Room:</strong> Solve all 3 physics challenges in a room to open the glowing Exit Door.
              </li>
              <li>
                <strong className="text-white">Use the Physics Scanner:</strong> Approach any crate, ball, mirror, or machine and press <span className="font-mono-tech text-cyan-300">E</span> (or click it) to view real-time mass, force, velocity, acceleration, and formulas!
              </li>
              <li>
                <strong className="text-white">Collect Science Stars:</strong> Grab all 3 golden stars in each room for bonus points and mastery.
              </li>
              <li>
                <strong className="text-white">3-Tier Hints:</strong> Stuck on a puzzle? Use the Hint button for Concept, Puzzle, and Direct Solution clues.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SettingsScreenProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onResetSave: () => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onResetSave,
  onBack,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="min-h-screen w-full bg-[#080D1E] overflow-y-auto p-6 sm:p-10 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="font-display text-2xl font-bold text-white">Settings</h1>
          <div className="w-20" />
        </div>

        <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">Master Audio</div>
              <div className="text-xs text-slate-400">Mute or unmute all laboratory sound effects and music</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ ...settings, muted: !settings.muted })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer ${
                settings.muted ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              }`}
            >
              {settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {settings.muted ? 'Muted' : 'Sound On'}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-200">Sound Effects Volume</span>
              <span className="font-mono-tech text-cyan-300">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.sfxVolume}
              onChange={(e) => onUpdateSettings({ ...settings, sfxVolume: Number(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-200">Ambient Lab Music Volume</span>
              <span className="font-mono-tech text-purple-300">{Math.round(settings.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.musicVolume}
              onChange={(e) => onUpdateSettings({ ...settings, musicVolume: Number(e.target.value) })}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-sm font-semibold text-white">On-Screen Touch Controls</div>
            <div className="grid grid-cols-3 gap-2">
              {(['auto', 'always', 'never'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onUpdateSettings({ ...settings, showTouchControls: mode })}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold capitalize cursor-pointer border ${
                    settings.showTouchControls === mode
                      ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Saved Lab Progress</div>
              <div className="text-xs text-slate-400">Clear unlocked rooms, stars, and achievements</div>
            </div>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="px-4 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-xs font-semibold cursor-pointer"
              >
                Reset Progress
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onResetSave();
                    setConfirmReset(false);
                  }}
                  className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                >
                  Confirm Reset
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  settings,
  onUpdateSettings,
  onResume,
  onRestart,
  onOpenSettings,
  onMainMenu,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="text-center space-y-1">
          <h2 className="font-display text-2xl font-bold text-white">Simulation Paused</h2>
          <p className="text-xs text-slate-400">Press ESC or Resume to return to the laboratory</p>
        </div>

        {/* Quick volume & music controls inside Pause Menu */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">SFX Volume</span>
            <span className="font-mono-tech text-cyan-300">{Math.round(settings.sfxVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.sfxVolume}
            onChange={(e) => onUpdateSettings({ ...settings, sfxVolume: Number(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer"
          />

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-300 font-semibold">Music Volume</span>
            <span className="font-mono-tech text-purple-300">{Math.round(settings.musicVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.musicVolume}
            onChange={(e) => onUpdateSettings({ ...settings, musicVolume: Number(e.target.value) })}
            className="w-full accent-purple-400 cursor-pointer"
          />
        </div>

        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume
          </button>
          <button
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Restart Level
          </button>
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={onMainMenu}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-sm cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
