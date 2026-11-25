import React, { useState } from 'react';
import { ArrowRight, Award, BookOpen, CheckCircle2, Globe, Star, XCircle } from 'lucide-react';
import { soundEngine } from '../game/audio';
import { LEVELS_META } from '../game/data';
import { LevelCompletionSummary } from '../game/types';

interface LevelLearningScreenProps {
  summary: LevelCompletionSummary;
  onContinue: (quizBonusScore: number) => void;
}

export const LevelLearningScreen: React.FC<LevelLearningScreenProps> = ({ summary, onContinue }) => {
  const meta = LEVELS_META[summary.levelId - 1];
  const { learning } = meta;

  // Track chosen answer index per question (0..2)
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const answeredCount = Object.keys(answers).length;
  const correctCount = learning.questions.reduce(
    (acc, q, idx) => (answers[idx] === q.correctIndex ? acc + 1 : acc),
    0
  );
  const quizBonus = correctCount * 100;

  const handleSelectOption = (qIdx: number, optIdx: number) => {
    if (answers[qIdx] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
    if (optIdx === learning.questions[qIdx].correctIndex) {
      soundEngine.playStar();
    } else {
      soundEngine.playClick();
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070B18] overflow-y-auto p-4 sm:p-8 flex justify-center">
      <div className="w-full max-w-4xl space-y-6 my-auto py-4">
        {/* Header Summary */}
        <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono-tech text-emerald-400 font-semibold">
              CHAMBER {summary.levelId} CLEARED
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">{meta.title}</h1>
            {summary.unlockedAchievement && (
              <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold pt-1">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Achievement Unlocked: {summary.unlockedAchievement.title}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-5 font-mono-tech text-sm">
            <div>
              <div className="text-[11px] text-slate-400">STARS</div>
              <div className="flex items-center gap-1 text-amber-400 font-bold">
                {[1, 2, 3].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= summary.starsCollected ? 'fill-amber-400' : 'text-slate-700'}`} />
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">TIME</div>
              <div className="text-white font-bold">{summary.timeSeconds}s</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">SCORE</div>
              <div className="text-cyan-300 font-bold">{summary.levelScore + quizBonus}</div>
            </div>
          </div>
        </div>

        {/* Science Concept Briefing */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-7 bg-slate-900/85 border border-slate-700 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-display font-bold text-lg">
              <BookOpen className="w-5 h-5" />
              <span>Physics Topic: {learning.topic}</span>
            </div>
            <p className="text-slate-200 text-sm sm:text-base leading-relaxed">{learning.explanation}</p>

            <div className="bg-slate-950/75 border border-cyan-500/30 rounded-xl p-4 space-y-1">
              <div className="text-[11px] font-mono-tech text-cyan-400">KEY FORMULA</div>
              <div className="font-mono-tech text-lg font-bold text-white">{learning.formula}</div>
              <div className="text-xs text-slate-400">{learning.formulaNote}</div>
            </div>
          </div>

          <div className="md:col-span-5 bg-slate-900/85 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-purple-300 font-display font-bold text-base">
                <Globe className="w-5 h-5" />
                <span>Real-World Example</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{learning.realWorldExample}</p>
            </div>
            <div className="text-xs text-slate-400 border-t border-slate-800 pt-3">
              Answer the 3 quick lab check questions below (+100 bonus points each) to unlock the next chamber!
            </div>
          </div>
        </div>

        {/* 3 Interactive Multiple-Choice Questions */}
        <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="font-display text-lg font-bold text-white">Lab Knowledge Check</h2>
            <span className="font-mono-tech text-xs text-cyan-300">
              {answeredCount}/3 Answered · {correctCount} Correct (+{quizBonus} pts)
            </span>
          </div>

          <div className="space-y-6">
            {learning.questions.map((q, qIdx) => {
              const chosen = answers[qIdx];
              const isAnswered = chosen !== undefined;
              const isCorrect = chosen === q.correctIndex;

              return (
                <div key={qIdx} className="space-y-3">
                  <div className="font-semibold text-sm sm:text-base text-white">
                    {qIdx + 1}. {q.question}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, optIdx) => {
                      let btnStyle =
                        'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200 cursor-pointer';
                      if (isAnswered) {
                        if (optIdx === q.correctIndex) {
                          btnStyle = 'bg-emerald-500/20 border-emerald-400 text-emerald-200 cursor-default';
                        } else if (optIdx === chosen) {
                          btnStyle = 'bg-rose-500/20 border-rose-400 text-rose-200 cursor-default';
                        } else {
                          btnStyle = 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-default';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={isAnswered}
                          onClick={() => handleSelectOption(qIdx, optIdx)}
                          className={`text-left px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-colors flex items-center justify-between gap-2 ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {isAnswered && optIdx === q.correctIndex && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          {isAnswered && optIdx === chosen && optIdx !== q.correctIndex && (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && (
                    <div
                      className={`text-xs px-3.5 py-2.5 rounded-lg border ${
                        isCorrect
                          ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                          : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                      }`}
                    >
                      <strong>{isCorrect ? 'Correct!' : 'Not quite:'}</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Continue Button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              soundEngine.playClick();
              onContinue(quizBonus);
            }}
            className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-base transition-colors cursor-pointer"
          >
            <span>{summary.levelId < 5 ? `Enter Level ${summary.levelId + 1}` : 'Finish Lab Escape!'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
