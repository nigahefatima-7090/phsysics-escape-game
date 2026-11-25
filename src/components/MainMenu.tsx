import React, { useEffect, useRef } from 'react';
import { Atom, Award, BookOpen, Play, RotateCcw, Settings, ShieldCheck, Star } from 'lucide-react';
import { ACHIEVEMENTS } from '../game/data';
import { SaveProgress } from '../game/types';

interface MainMenuProps {
  save: SaveProgress;
  onStartNew: () => void;
  onContinue: () => void;
  onLevelSelect: () => void;
  onHowToPlay: () => void;
  onSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  save,
  onStartNew,
  onContinue,
  onLevelSelect,
  onHowToPlay,
  onSettings,
}) => {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasProgress = save.completedLevels.length > 0 || save.unlockedLevel > 1;
  const totalStars = Object.values(save.bestStars).reduce((a, b) => a + b, 0);

  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const nodes = Array.from({ length: 34 }, (_, i) => ({
      x: Math.random() * 1440,
      y: Math.random() * 900,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      r: 2 + (i % 3),
      color: i % 2 === 0 ? '#22D3EE' : '#A855F7',
    }));

    const formulas = ['F = ma', 'W = mg', 'v = u + at', 'KE = ½mv²', 'PE = mgh', 'θᵢ = θᵣ'];

    const draw = (time: number) => {
      const w = (canvas.width = window.innerWidth);
      const h = (canvas.height = window.innerHeight);
      const t = time * 0.001;

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#060A17');
      grad.addColorStop(0.5, '#0C1530');
      grad.addColorStop(1, '#131D42');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle blueprint grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 56) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 56) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Animated lab portal rings
      ctx.save();
      ctx.translate(w * 0.72, h * 0.48);
      for (let ring = 0; ring < 3; ring++) {
        ctx.rotate(t * (ring % 2 === 0 ? 0.15 : -0.18));
        ctx.strokeStyle = ring === 1 ? 'rgba(168, 85, 247, 0.22)' : 'rgba(34, 211, 238, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([18, 14]);
        ctx.beginPath();
        ctx.arc(0, 0, 120 + ring * 58, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // Floating physics particles & connections
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x = (n.x + n.vx + w) % w;
        n.y = (n.y + n.vy + h) % h;
        ctx.fillStyle = n.color;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const d = Math.hypot(n.x - m.x, n.y - m.y);
          if (d < 130) {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
            ctx.globalAlpha = 1 - d / 130;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      // Subtle floating formulas in background
      ctx.font = '600 13px "JetBrains Mono", monospace';
      formulas.forEach((f, idx) => {
        const fx = ((w * 0.55 + idx * 140 + Math.sin(t * 0.4 + idx) * 26) % (w - 100));
        const fy = 120 + ((idx * 115 + t * 14) % (h - 180));
        ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.fillText(f, fx, fy);
      });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-y-auto flex items-center justify-center p-4 sm:p-8">
      <canvas ref={bgCanvasRef} className="fixed inset-0 w-full h-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left column: Game Title & Main Actions */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono-tech text-cyan-300 tracking-wider">
              <Atom className="w-4 h-4 text-cyan-400" />
              <span>2D PHYSICS PUZZLE ADVENTURE</span>
              <span aria-hidden="true">·</span>
              <span>5 LABORATORY CHAMBERS</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.06] text-balance">
              PHYSICS ESCAPE
              <span className="block text-2xl sm:text-3xl font-bold text-cyan-400 mt-1.5">
                The Science Adventure
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
              Trapped inside a futuristic science facility, use real gravity, Newton’s laws, laser optics,
              electromagnetism, and energy conservation to unlock all five rooms and escape.
            </p>
          </div>

          {/* Primary Menu Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            {hasProgress && (
              <button
                onClick={onContinue}
                className="sm:col-span-2 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-base transition-colors cursor-pointer whitespace-nowrap"
              >
                <Play className="w-5 h-5 fill-current" />
                CONTINUE (LEVEL {save.unlockedLevel})
              </button>
            )}

            <button
              onClick={onStartNew}
              className={`${
                hasProgress
                  ? 'bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600/70'
                  : 'sm:col-span-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950'
              } flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-display font-bold text-base transition-colors cursor-pointer whitespace-nowrap`}
            >
              {hasProgress ? <RotateCcw className="w-4 h-4" /> : <Play className="w-5 h-5 fill-current" />}
              START GAME
            </button>

            <button
              onClick={onLevelSelect}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              LEVEL SELECT
            </button>

            <button
              onClick={onHowToPlay}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 text-purple-400" />
              HOW TO PLAY
            </button>

            <button
              onClick={onSettings}
              className="sm:col-span-2 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              SETTINGS
            </button>
          </div>
        </div>

        {/* Right column: Lab Progress & Achievements Summary */}
        <div className="lg:col-span-5 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Scientist Dossier</h2>
              <p className="text-xs text-slate-400">Progress saved locally in browser</p>
            </div>
            <div className="text-right font-mono-tech">
              <div className="text-xl font-bold text-cyan-400">{save.totalScore.toLocaleString()}</div>
              <div className="text-xs text-slate-400">TOTAL SCORE</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400 mb-1">Science Stars</div>
              <div className="flex items-center gap-1.5 font-mono-tech text-lg font-bold text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{totalStars} / 15</span>
              </div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400 mb-1">Rooms Escaped</div>
              <div className="font-mono-tech text-lg font-bold text-emerald-400">
                {save.completedLevels.length} / 5
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Achievement Badges</span>
              <span className="font-mono-tech">{save.achievements.length} / {ACHIEVEMENTS.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ACHIEVEMENTS.map((ach) => {
                const earned = save.achievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs ${
                      earned
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-500'
                    }`}
                    title={ach.description}
                  >
                    <Award className={`w-3.5 h-3.5 shrink-0 ${earned ? 'text-amber-400' : 'text-slate-600'}`} />
                    <span className="truncate font-medium">{ach.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
