import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Cpu,
  Heart,
  Lightbulb,
  Magnet,
  Pause,
  RotateCcw,
  ScanLine,
  Star,
  X,
} from 'lucide-react';
import { soundEngine } from '../game/audio';
import { LEVELS_META } from '../game/data';
import { PhysicsGameEngine } from '../game/engine';
import { renderGameCanvas } from '../game/renderer';
import { GameSettings, HUDState, ScannerData } from '../game/types';

interface GamePlayViewProps {
  levelId: number;
  restartNonce: number;
  paused: boolean;
  settings: GameSettings;
  onPause: () => void;
  onLevelComplete: (summary: {
    levelId: number;
    score: number;
    stars: number;
    timeSeconds: number;
    hintsUsed: number;
  }) => void;
  onRestartLevel: () => void;
  onExitToMenu: () => void;
}

export const GamePlayView: React.FC<GamePlayViewProps> = ({
  levelId,
  restartNonce,
  paused,
  settings,
  onPause,
  onLevelComplete,
  onRestartLevel,
  onExitToMenu,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PhysicsGameEngine | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const [hud, setHud] = useState<HUDState>({
    levelId,
    levelTitle: LEVELS_META[levelId - 1].title,
    objective: LEVELS_META[levelId - 1].objective,
    lives: 3,
    maxLives: 3,
    score: 0,
    starsCollected: 0,
    totalStars: 3,
    elapsedSeconds: 0,
    locksSolved: 0,
    totalLocks: 3,
    doorUnlocked: false,
    gravityDir: 1,
    activeHintLevel: 0,
    toastMessage: null,
    nearbyPrompt: null,
    carryingLabel: null,
    magnetStatus: null,
  });

  const [scanner, setScanner] = useState<ScannerData | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
  }, []);

  // Initialize PhysicsGameEngine & Animation Loop
  useEffect(() => {
    setGameOver(false);
    setScanner(null);
    setHintOpen(false);
    setHintText(null);

    const game = new PhysicsGameEngine(levelId, {
      onHudUpdate: (nextHud) => setHud(nextHud),
      onScannerUpdate: (data) => setScanner(data),
      onLevelComplete: (summary) => onLevelComplete(summary),
      onGameOver: () => setGameOver(true),
    });
    engineRef.current = game;

    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const rect = canvas.getBoundingClientRect();
        const targetW = Math.max(320, Math.floor(rect.width * dpr));
        const targetH = Math.max(240, Math.floor(rect.height * dpr));
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          const logicalW = rect.width;
          const logicalH = rect.height;
          const scaleY = logicalH / game.world.height;
          const viewWorldW = logicalW / scaleY;

          if (!pausedRef.current && !gameOver) {
            game.step(dt, viewWorldW);
          }

          ctx.save();
          ctx.scale(dpr, dpr);
          renderGameCanvas(ctx, game, logicalW, logicalH, now * 0.001);
          ctx.restore();
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      game.destroy();
      engineRef.current = null;
    };
  }, [levelId, restartNonce, onLevelComplete]);

  // Keyboard Controls
  useEffect(() => {
    const keysDown = new Set<string>();

    const syncMovement = () => {
      const game = engineRef.current;
      if (!game) return;
      const left = keysDown.has('ArrowLeft') || keysDown.has('KeyA');
      const right = keysDown.has('ArrowRight') || keysDown.has('KeyD');
      const jump = keysDown.has('ArrowUp') || keysDown.has('KeyW') || keysDown.has('Space');
      game.setInput({ left, right, jump });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Escape') {
        if (scanner) {
          engineRef.current?.closeScanner();
          setScanner(null);
        } else {
          onPause();
        }
        return;
      }
      if (pausedRef.current || gameOver) return;

      if (!e.repeat) {
        if (e.code === 'KeyE') {
          engineRef.current?.handleInteract();
        } else if (e.code === 'KeyF') {
          engineRef.current?.handleDropOrPick();
        } else if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
          engineRef.current?.triggerJump();
        }
      }
      keysDown.add(e.code);
      syncMovement();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
      syncMovement();
    };

    const onBlur = () => {
      keysDown.clear();
      syncMovement();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [onPause, gameOver, scanner]);

  const toWorldCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const game = engineRef.current;
    if (!canvas || !game) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleY = rect.height / game.world.height;
    return {
      wx: (clientX - rect.left) / scaleY + game.camera.x,
      wy: (clientY - rect.top) / scaleY,
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (paused || gameOver) return;
    const pt = toWorldCoords(e.clientX, e.clientY);
    if (pt) {
      engineRef.current?.handleCanvasClick(pt.wx, pt.wy);
    }
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = toWorldCoords(e.clientX, e.clientY);
    if (pt && engineRef.current) {
      engineRef.current.updateHover(pt.wx, pt.wy);
      e.currentTarget.style.cursor = engineRef.current.hoveredWorldEntityId ? 'pointer' : 'default';
    }
  };

  const handleShowHint = () => {
    const game = engineRef.current;
    if (!game) return;
    if (!hintOpen) {
      const text = game.getActiveHintText() ?? game.useHint();
      setHintText(text);
      setHintOpen(true);
    } else {
      const text = game.useHint();
      setHintText(text);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const showTouch =
    settings.showTouchControls === 'always' ||
    (settings.showTouchControls === 'auto' && isTouchDevice);

  return (
    <div className="relative w-full h-screen bg-[#070B16] overflow-hidden select-none flex flex-col">
      {/* TOP GAME HUD */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950/90 border-b border-slate-800/90 backdrop-blur-md">
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <div className="font-display font-bold text-sm sm:text-base text-white truncate">
              {hud.levelTitle}
            </div>
            <div className="text-xs text-cyan-300/90 truncate max-w-md">{hud.objective}</div>
          </div>
        </div>

        {/* Center Telemetry Strip (Lives, Locks, Stars, Score, Timer) */}
        <div className="flex items-center gap-4 sm:gap-5 text-xs font-mono-tech">
          <div className="flex items-center gap-1" title="Lives">
            {Array.from({ length: hud.maxLives }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 ${i < hud.lives ? 'text-rose-400 fill-rose-400' : 'text-slate-700'}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-slate-200">
            <span className="text-slate-400">LOCKS</span>
            <span className={hud.doorUnlocked ? 'text-emerald-400 font-bold' : 'text-cyan-300 font-bold'}>
              {hud.locksSolved}/{hud.totalLocks}
            </span>
          </div>

          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Star className="w-4 h-4 fill-amber-400" />
            <span>
              {hud.starsCollected}/{hud.totalStars}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-200">
            <span className="text-slate-400">SCORE</span>
            <span className="text-white font-bold">{hud.score}</span>
          </div>

          <div className="text-slate-300">{formatTime(hud.elapsedSeconds)}</div>
        </div>

        {/* Action Buttons: Hint, Scanner, Pause */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleShowHint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Hint {hud.activeHintLevel > 0 ? `(${hud.activeHintLevel}/3)` : ''}</span>
          </button>

          <button
            onClick={() => {
              if (scanner) {
                engineRef.current?.closeScanner();
                setScanner(null);
              } else {
                engineRef.current?.handleInteract();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap ${
              scanner
                ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-cyan-300'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Scanner [E]</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playClick();
              onPause();
            }}
            aria-label="Pause Game"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Pause className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pause</span>
          </button>
        </div>
      </header>

      {/* MAIN GAMEPLAY CANVAS */}
      <div className="relative flex-1 w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMove}
          className="w-full h-full block"
        />

        {/* Subtle Gravity Indicator on Level 1 when inverted */}
        {hud.gravityDir === -1 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none px-4 py-1.5 rounded-lg bg-purple-950/90 border border-purple-400/60 text-purple-200 text-xs font-mono-tech font-bold">
            GRAVITY INVERTED (g = -9.8 m/s² UP)
          </div>
        )}

        {/* Toast Feedback Banner */}
        {hud.toastMessage && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none px-4 py-2 rounded-xl bg-slate-900/90 border border-cyan-400/50 text-cyan-100 text-xs sm:text-sm font-medium shadow-lg text-center max-w-md">
            {hud.toastMessage}
          </div>
        )}

        {/* Nearby Interactive Prompt */}
        {(hud.nearbyPrompt || hud.carryingLabel) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/90 border border-slate-700 text-xs font-mono-tech text-cyan-300 shadow-lg">
            {hud.nearbyPrompt && <span>{hud.nearbyPrompt}</span>}
            {hud.carryingLabel && (
              <span className="text-amber-300">Carrying: {hud.carryingLabel} ([F] Drop)</span>
            )}
          </div>
        )}

        {/* 3-Tier Hint Drawer */}
        {hintOpen && hintText && (
          <div className="absolute top-3 left-3 z-30 w-80 sm:w-96 bg-slate-900/95 border border-amber-500/50 rounded-xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-display font-bold text-sm">
                <Lightbulb className="w-4 h-4" />
                <span>Lab Hint {hud.activeHintLevel} of 3</span>
              </div>
              <button
                onClick={() => setHintOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
                aria-label="Close Hint"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{hintText}</p>
            {hud.activeHintLevel < 3 && (
              <button
                onClick={handleShowHint}
                className="w-full py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold cursor-pointer"
              >
                Reveal Next Clue ({hud.activeHintLevel + 1}/3)
              </button>
            )}
          </div>
        )}

        {/* PHYSICS SCANNER OVERLAY PANEL */}
        {scanner && (
          <aside className="absolute top-3 right-3 z-30 w-76 sm:w-84 bg-slate-950/92 backdrop-blur-md border border-cyan-400/50 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono-tech text-cyan-400">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>PHYSICS SCANNER</span>
                </div>
                <h3 className="font-display font-bold text-base text-white">{scanner.name}</h3>
              </div>
              <button
                onClick={() => {
                  engineRef.current?.closeScanner();
                  setScanner(null);
                }}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
                aria-label="Close Scanner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono-tech">
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                <div className="text-slate-400 text-[10px]">MASS</div>
                <div className="text-white font-bold">{scanner.massKg} kg</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                <div className="text-slate-400 text-[10px]">APPLIED FORCE</div>
                <div className="text-cyan-300 font-bold">{scanner.appliedForceN} N</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                <div className="text-slate-400 text-[10px]">VELOCITY</div>
                <div className="text-white font-bold">{scanner.velocityMs} m/s</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                <div className="text-slate-400 text-[10px]">ACCELERATION</div>
                <div className="text-purple-300 font-bold">{scanner.accelerationMs2} m/s²</div>
              </div>
            </div>

            {scanner.extraMetrics && (
              <div className="grid grid-cols-2 gap-2 text-xs font-mono-tech">
                {scanner.extraMetrics.map((m) => (
                  <div key={m.label} className="bg-slate-900/80 border border-slate-800 rounded-lg p-2">
                    <div className="text-slate-400 text-[10px]">{m.label}</div>
                    <div className="text-amber-300 font-bold">{m.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-2.5 space-y-1">
              <div className="text-[11px] font-semibold text-cyan-300">{scanner.concept}</div>
              <div className="font-mono-tech text-xs font-bold text-white">{scanner.formula}</div>
              <div className="font-mono-tech text-[11px] text-cyan-200">{scanner.formulaLiveValue}</div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{scanner.explanation}</p>
          </aside>
        )}

        {/* LEVEL 4 / 5 ELECTROMAGNET QUICK CONSOLE */}
        {hud.magnetStatus && (
          <div className="absolute bottom-4 right-4 z-20 bg-slate-900/92 border border-purple-500/50 rounded-xl p-3 shadow-xl flex items-center gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-200">
                <Magnet className="w-3.5 h-3.5 text-purple-400" />
                <span>{hud.magnetStatus.label}</span>
              </div>
              <div className="text-[11px] font-mono-tech text-slate-400">
                Click any magnet or use controls
              </div>
            </div>
            <button
              onClick={() => engineRef.current?.toggleActiveMagnetPower()}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                hud.magnetStatus.active
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {hud.magnetStatus.active ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => engineRef.current?.flipActiveMagnetPolarity()}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                hud.magnetStatus.polarity === 'attract'
                  ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-200'
                  : 'bg-purple-500/25 border border-purple-400 text-purple-200'
              }`}
            >
              {hud.magnetStatus.polarity === 'attract' ? 'ATTRACT' : 'REPEL'}
            </button>
          </div>
        )}

        {/* MOBILE / TOUCH CONTROLS */}
        {showTouch && !paused && !gameOver && (
          <div className="absolute inset-x-0 bottom-3 z-20 px-4 flex items-end justify-between pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              <button
                onPointerDown={() => engineRef.current?.setInput({ left: true })}
                onPointerUp={() => engineRef.current?.setInput({ left: false })}
                onPointerCancel={() => engineRef.current?.setInput({ left: false })}
                onPointerLeave={() => engineRef.current?.setInput({ left: false })}
                aria-label="Move Left"
                className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-cyan-400/50 text-white flex items-center justify-center active:bg-cyan-500/40"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <button
                onPointerDown={() => engineRef.current?.setInput({ right: true })}
                onPointerUp={() => engineRef.current?.setInput({ right: false })}
                onPointerCancel={() => engineRef.current?.setInput({ right: false })}
                onPointerLeave={() => engineRef.current?.setInput({ right: false })}
                aria-label="Move Right"
                className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-cyan-400/50 text-white flex items-center justify-center active:bg-cyan-500/40"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-3 pointer-events-auto">
              <button
                onPointerDown={() => engineRef.current?.handleInteract()}
                aria-label="Interact and Scan"
                className="w-14 h-14 rounded-2xl bg-purple-600/80 border border-purple-300/60 text-white font-display font-bold text-sm flex items-center justify-center active:bg-purple-500"
              >
                E
              </button>
              <button
                onPointerDown={() => {
                  engineRef.current?.setInput({ jump: true });
                  engineRef.current?.triggerJump();
                }}
                onPointerUp={() => engineRef.current?.setInput({ jump: false })}
                onPointerCancel={() => engineRef.current?.setInput({ jump: false })}
                aria-label="Jump"
                className="w-16 h-16 rounded-2xl bg-cyan-500/85 border border-cyan-200 text-slate-950 flex items-center justify-center active:bg-cyan-300"
              >
                <ArrowUp className="w-7 h-7 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER MODAL */}
        {gameOver && (
          <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-2xl p-6 text-center space-y-5 shadow-2xl">
              <h2 className="font-display text-2xl font-bold text-white">Lab Hazard Overload!</h2>
              <p className="text-sm text-slate-300">
                Your suit’s protective shield ran out of energy. Retry the chamber and watch out for high-energy hazards!
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onRestartLevel}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry Chamber
                </button>
                <button
                  onClick={onExitToMenu}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm cursor-pointer"
                >
                  Main Menu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
