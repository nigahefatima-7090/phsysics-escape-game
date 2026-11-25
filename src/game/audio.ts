import { GameSettings } from './types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private settings: GameSettings = {
    sfxVolume: 0.7,
    musicVolume: 0.35,
    muted: false,
    showTouchControls: 'auto',
  };
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicPlaying = false;

  public setSettings(next: GameSettings) {
    this.settings = { ...next };
    if (this.settings.muted || this.settings.musicVolume <= 0.01) {
      this.stopMusic();
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private get sfxGain(): number {
    if (this.settings.muted) return 0;
    return Math.max(0, Math.min(1, this.settings.sfxVolume));
  }

  private get musicGain(): number {
    if (this.settings.muted) return 0;
    return Math.max(0, Math.min(1, this.settings.musicVolume));
  }

  public startMusic() {
    if (this.musicPlaying || this.musicGain <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.musicPlaying = true;
    // Gentle futuristic ambient arpeggio in D minor / Dorian
    const scale = [146.83, 174.61, 220.0, 261.63, 293.66, 329.63, 392.0, 440.0];
    const pattern = [0, 2, 4, 3, 1, 4, 5, 2];

    const playStep = () => {
      if (!this.musicPlaying) return;
      const vol = this.musicGain * 0.06;
      if (vol > 0.001 && this.ctx && this.ctx.state === 'running') {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(620, now);

        const note = scale[pattern[this.musicStep % pattern.length]];
        this.musicStep++;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
      }
      this.musicTimer = window.setTimeout(playStep, 520);
    };
    playStep();
  }

  public stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'sine',
    volumeScale = 0.18
  ) {
    const vol = this.sfxGain * volumeScale;
    if (vol <= 0.001) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playJump() {
    this.playTone(240, 520, 0.16, 'sine', 0.16);
  }

  public playLand() {
    this.playTone(130, 55, 0.09, 'triangle', 0.14);
  }

  public playClick() {
    this.playTone(680, 420, 0.06, 'sine', 0.12);
  }

  public playSwitch() {
    this.playTone(440, 880, 0.14, 'triangle', 0.18);
  }

  public playGravityFlip(up: boolean) {
    if (up) {
      this.playTone(220, 740, 0.34, 'sawtooth', 0.12);
    } else {
      this.playTone(740, 200, 0.34, 'sawtooth', 0.12);
    }
  }

  public playLaserActivate() {
    this.playTone(580, 1160, 0.22, 'sine', 0.16);
  }

  public playMagnetPulse(attract: boolean) {
    this.playTone(attract ? 320 : 180, attract ? 180 : 380, 0.2, 'square', 0.08);
  }

  public playStar() {
    const vol = this.sfxGain * 0.16;
    if (vol <= 0.001) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    });
  }

  public playCheckpoint() {
    this.playTone(440, 660, 0.18, 'triangle', 0.15);
    setTimeout(() => this.playTone(660, 880, 0.22, 'triangle', 0.15), 90);
  }

  public playDamage() {
    this.playTone(190, 65, 0.26, 'sawtooth', 0.18);
  }

  public playDoorUnlock() {
    this.playTone(330, 660, 0.25, 'triangle', 0.18);
    setTimeout(() => this.playTone(660, 990, 0.3, 'sine', 0.18), 140);
  }

  public playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, f * 1.02, 0.28, 'triangle', 0.18), idx * 95);
    });
  }

  public playScan() {
    this.playTone(760, 1120, 0.12, 'sine', 0.12);
  }
}

export const soundEngine = new SoundEngine();
