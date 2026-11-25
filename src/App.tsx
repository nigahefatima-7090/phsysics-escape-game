import { useCallback, useEffect, useState } from 'react';
import { FinalEndingScreen } from './components/FinalEndingScreen';
import { GamePlayView } from './components/GamePlayView';
import { LevelLearningScreen } from './components/LevelLearningScreen';
import { MainMenu } from './components/MainMenu';
import { HowToPlayScreen, LevelSelectScreen, PauseModal, SettingsScreen } from './components/MenuModals';
import { soundEngine } from './game/audio';
import {
  ACHIEVEMENTS,
  clearSaveProgress,
  LEVELS_META,
  loadSaveProgress,
  loadSettings,
  writeSaveProgress,
  writeSettings,
} from './game/data';
import { GameSettings, LevelCompletionSummary, SaveProgress, ScreenState } from './game/types';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('MAIN_MENU');
  const [settingsReturnTo, setSettingsReturnTo] = useState<'MAIN_MENU' | 'PAUSED'>('MAIN_MENU');
  const [save, setSave] = useState<SaveProgress>(() => loadSaveProgress());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());

  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [restartNonce, setRestartNonce] = useState<number>(0);
  const [pendingSummary, setPendingSummary] = useState<LevelCompletionSummary | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  // Sync audio engine settings
  useEffect(() => {
    soundEngine.setSettings(settings);
    writeSettings(settings);
  }, [settings]);

  // Smooth transition helper between screens/levels
  const navigateWithTransition = useCallback((nextScreen: ScreenState, afterFade?: () => void) => {
    setTransitioning(true);
    setTimeout(() => {
      if (afterFade) afterFade();
      setScreen(nextScreen);
      setTimeout(() => setTransitioning(false), 140);
    }, 180);
  }, []);

  const launchLevel = useCallback(
    (levelId: number) => {
      soundEngine.playClick();
      soundEngine.startMusic();
      navigateWithTransition('PLAYING', () => {
        setCurrentLevel(levelId);
        setRestartNonce((n) => n + 1);
      });
    },
    [navigateWithTransition]
  );

  const handleStartNew = () => {
    launchLevel(1);
  };

  const handleContinue = () => {
    launchLevel(save.unlockedLevel);
  };

  const handleLevelComplete = useCallback(
    (raw: { levelId: number; score: number; stars: number; timeSeconds: number; hintsUsed: number }) => {
      const meta = LEVELS_META[raw.levelId - 1];
      const newlyUnlockedAch = !save.achievements.includes(meta.achievementId)
        ? ACHIEVEMENTS.find((a) => a.id === meta.achievementId) ?? null
        : null;

      setPendingSummary({
        levelId: raw.levelId,
        levelScore: raw.score,
        starsCollected: raw.stars,
        timeSeconds: raw.timeSeconds,
        hintsUsed: raw.hintsUsed,
        unlockedAchievement: newlyUnlockedAch,
      });

      navigateWithTransition('LEVEL_LEARNING');
    },
    [save.achievements, navigateWithTransition]
  );

  const handleLearningContinue = (quizBonusScore: number) => {
    if (!pendingSummary) return;
    const lvl = pendingSummary.levelId;
    const finalLevelScore = pendingSummary.levelScore + quizBonusScore;
    const meta = LEVELS_META[lvl - 1];

    const updatedCompleted = save.completedLevels.includes(lvl)
      ? save.completedLevels
      : [...save.completedLevels, lvl];

    const bestScores = {
      ...save.bestScores,
      [lvl]: Math.max(save.bestScores[lvl] ?? 0, finalLevelScore),
    };
    const bestStars = {
      ...save.bestStars,
      [lvl]: Math.max(save.bestStars[lvl] ?? 0, pendingSummary.starsCollected),
    };
    const prevTime = save.bestTimes[lvl];
    const bestTimes = {
      ...save.bestTimes,
      [lvl]: prevTime === undefined ? pendingSummary.timeSeconds : Math.min(prevTime, pendingSummary.timeSeconds),
    };

    const nextAchievements = [...save.achievements];
    if (!nextAchievements.includes(meta.achievementId)) {
      nextAchievements.push(meta.achievementId);
    }
    if (lvl === 5 && !nextAchievements.includes('ultimate_scientist')) {
      nextAchievements.push('ultimate_scientist');
    }

    const totalScore = Object.values(bestScores).reduce((a, b) => a + b, 0);
    const nextUnlocked = Math.max(save.unlockedLevel, Math.min(5, lvl + 1));

    const nextSave: SaveProgress = {
      unlockedLevel: nextUnlocked,
      completedLevels: updatedCompleted,
      bestScores,
      bestStars,
      bestTimes,
      achievements: nextAchievements,
      totalScore,
    };

    setSave(nextSave);
    writeSaveProgress(nextSave);
    setPendingSummary(null);

    if (lvl < 5) {
      launchLevel(lvl + 1);
    } else {
      soundEngine.playVictory();
      navigateWithTransition('GAME_ENDING');
    }
  };

  const handleUpdateSettings = (next: GameSettings) => {
    setSettings(next);
    if (!next.muted && next.musicVolume > 0.01 && (screen === 'PLAYING' || screen === 'PAUSED')) {
      soundEngine.startMusic();
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-[#070B16] text-slate-100">
      {screen === 'MAIN_MENU' && (
        <MainMenu
          save={save}
          onStartNew={handleStartNew}
          onContinue={handleContinue}
          onLevelSelect={() => {
            soundEngine.playClick();
            navigateWithTransition('LEVEL_SELECT');
          }}
          onHowToPlay={() => {
            soundEngine.playClick();
            navigateWithTransition('HOW_TO_PLAY');
          }}
          onSettings={() => {
            soundEngine.playClick();
            setSettingsReturnTo('MAIN_MENU');
            navigateWithTransition('SETTINGS');
          }}
        />
      )}

      {screen === 'LEVEL_SELECT' && (
        <LevelSelectScreen
          save={save}
          onSelectLevel={launchLevel}
          onBack={() => {
            soundEngine.playClick();
            navigateWithTransition('MAIN_MENU');
          }}
        />
      )}

      {screen === 'HOW_TO_PLAY' && (
        <HowToPlayScreen
          onBack={() => {
            soundEngine.playClick();
            navigateWithTransition('MAIN_MENU');
          }}
        />
      )}

      {screen === 'SETTINGS' && (
        <SettingsScreen
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResetSave={() => {
            soundEngine.playClick();
            setSave(clearSaveProgress());
          }}
          onBack={() => {
            soundEngine.playClick();
            setScreen(settingsReturnTo);
          }}
        />
      )}

      {(screen === 'PLAYING' || screen === 'PAUSED') && (
        <GamePlayView
          levelId={currentLevel}
          restartNonce={restartNonce}
          paused={screen === 'PAUSED'}
          settings={settings}
          onPause={() => setScreen((prev) => (prev === 'PAUSED' ? 'PLAYING' : 'PAUSED'))}
          onLevelComplete={handleLevelComplete}
          onRestartLevel={() => {
            soundEngine.playClick();
            setRestartNonce((n) => n + 1);
            setScreen('PLAYING');
          }}
          onExitToMenu={() => {
            soundEngine.playClick();
            soundEngine.stopMusic();
            navigateWithTransition('MAIN_MENU');
          }}
        />
      )}

      {screen === 'PAUSED' && (
        <PauseModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResume={() => {
            soundEngine.playClick();
            setScreen('PLAYING');
          }}
          onRestart={() => {
            soundEngine.playClick();
            setRestartNonce((n) => n + 1);
            setScreen('PLAYING');
          }}
          onOpenSettings={() => {
            soundEngine.playClick();
            setSettingsReturnTo('PAUSED');
            setScreen('SETTINGS');
          }}
          onMainMenu={() => {
            soundEngine.playClick();
            soundEngine.stopMusic();
            navigateWithTransition('MAIN_MENU');
          }}
        />
      )}

      {screen === 'LEVEL_LEARNING' && pendingSummary && (
        <LevelLearningScreen summary={pendingSummary} onContinue={handleLearningContinue} />
      )}

      {screen === 'GAME_ENDING' && (
        <FinalEndingScreen
          save={save}
          onPlayAgain={() => launchLevel(1)}
          onMainMenu={() => {
            soundEngine.playClick();
            soundEngine.stopMusic();
            navigateWithTransition('MAIN_MENU');
          }}
        />
      )}

      {/* Smooth Level/Screen Transition Curtain */}
      <div
        className={`fixed inset-0 z-[100] bg-[#050814] pointer-events-none transition-opacity duration-200 ${
          transitioning ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
