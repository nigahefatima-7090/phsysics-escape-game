import React, { useEffect, useRef } from 'react';
import { Award, CheckCircle2, Clock, Home, RotateCcw, Star, Trophy } from 'lucide-react';
import { ACHIEVEMENTS, LEVELS_META } from '../game/data';
import { SaveProgress } from '../game/types';

interface FinalEndingScreenProps {
  save: SaveProgress;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export const FinalEndingScreen: React.FC<FinalEndingScreenProps> = ({
  save,
  onPlayAgain,
  onMainMenu,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalStars = Object.values(save.bestStars).reduce((a, b) => a + b, 0);
  const totalTimeSec = Object.values(save.bestTimes).reduce((a, b) => a + b, 0);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles = Array.from({ length: 75 }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 1.6,
      vy: -0.6 - Math.random() * 1.4,
      size: 2.5 + (i % 4),
      color: ['#22D3EE', '#A855F7', '#FBBF24', '#10B981'][i % 4],
    }));

    let raf = 0;
    const render = () => {
      const w = (canvas.width = window.innerWidth);
      const h = (canvas.height = window.innerHeight);

      ctx.fillStyle = '#070B18';
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        p.x = (p.x + p.vx + w) % w;
        p.y -= Math.abs(p.vy);
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-y-auto flex items-center justify-center p-4 sm:p-8">
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl bg-slate-900/90 backdrop-blur-md border border-cyan-400/50 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/50 flex items-center justify-center animate-float-slow">
            <Trophy className="w-9 h-9 text-amber-400" />
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight text-balance">
            CONGRATULATIONS, SCIENTIST!
          </h1>
          <p className="font-display text-xl sm:text-2xl font-bold text-cyan-400">
            YOU HAVE ESCAPED THE PHYSICS LAB!
          </p>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono-tech">
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-xs text-slate-400 mb-1">TOTAL SCORE</div>
            <div className="text-2xl font-bold text-cyan-300">{save.totalScore.toLocaleString()}</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-xs text-slate-400 mb-1">TOTAL STARS</div>
            <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-amber-400">
              <Star className="w-5 h-5 fill-amber-400" />
              <span>{totalStars} / 15</span>
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-xs text-slate-400 mb-1">TOTAL TIME</div>
            <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-emerald-400">
              <Clock className="w-5 h-5" />
              <span>{formatTime(totalTimeSec)}</span>
            </div>
          </div>
        </div>

        {/* Completed Topics & Final Achievement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h2 className="font-display font-bold text-base text-white">Completed Physics Topics</h2>
            <ul className="space-y-2.5 text-sm text-slate-300">
              {LEVELS_META.map((lvl) => (
                <li key={lvl.id} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong className="text-white">{lvl.subtitle}</strong>
                    <span className="text-slate-400"> · {lvl.formula.split('|')[0].trim()}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-br from-cyan-950/50 to-purple-950/50 border border-cyan-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-mono-tech text-amber-300">FINAL ACHIEVEMENT BADGE</div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/60 flex items-center justify-center shrink-0">
                  <Award className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <div className="font-display text-lg font-bold text-white">Ultimate Physics Scientist</div>
                  <div className="text-xs text-slate-300">
                    Escaped all five chambers of the Physics Laboratory!
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
              {ACHIEVEMENTS.filter((a) => save.achievements.includes(a.id)).map((a) => (
                <span key={a.id} className="text-cyan-200 font-medium">
                  · {a.title}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={onPlayAgain}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-base transition-colors cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            PLAY AGAIN
          </button>
          <button
            onClick={onMainMenu}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-display font-bold text-base transition-colors cursor-pointer"
          >
            <Home className="w-5 h-5" />
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
};
