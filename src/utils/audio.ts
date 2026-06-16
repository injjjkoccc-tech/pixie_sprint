/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private bgmInterval: any = null;
  private isBgmPlaying: boolean = false;

  constructor() {
    // AudioContext is lazily initialized on user interaction to comply with browser autoplay policies.
  }

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  setBgmEnabled(enabled: boolean) {
    if (!enabled) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
  }

  // Cute Whistle sound for race starting/countdown
  playWhistle() {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;

    // High pitched whistle slide
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.4);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.2);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Sharp whistle for "GO!"
  playGoWhistle() {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;

    // Two-tone sharp whistle
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(1500, now);
    osc1.frequency.setValueAtTime(1800, now + 0.1);
    
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1510, now);
    osc2.frequency.setValueAtTime(1810, now + 0.1);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.setValueAtTime(0.15, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  }

  // Pikmin Jump Sound: cute upward pitch slide
  playJump() {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.18);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Pikmin break obstacle: smash/rumble sound
  playSmash() {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const noise = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.25);

    noise.type = "triangle";
    noise.frequency.setValueAtTime(90, now);
    noise.frequency.linearRampToValueAtTime(10, now + 0.3);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    noise.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.3);
    noise.stop(now + 0.3);
  }

  // Sweet ding sound on picking fruit
  playCollectFruit(type: "white" | "red" | "blue") {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const frequencies = {
      white: 880, // A5
      red: 1046.5, // C6
      blue: 1318.5 // E6
    };
    const freq = frequencies[type] || 880;

    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.12);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  // Buff Collect sound
  playCollectBuff() {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523, now); // C5
    osc1.frequency.setValueAtTime(659, now + 0.08); // E5
    osc1.frequency.setValueAtTime(784, now + 0.16); // G5
    osc1.frequency.setValueAtTime(1046, now + 0.24); // C6

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(525, now);
    osc2.frequency.exponentialRampToValueAtTime(1050, now + 0.32);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.24);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.42);
    osc2.stop(now + 0.42);
  }

  // Collision with obstacles/traps: sad buzzer
  playHurt() {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.3);

    // distortion filter node for a crunchier sound
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Level Complete theme (fanfare)
  playCelebration() {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;

    const notes = [
      { f: 523, t: 0.1 },  // C5
      { f: 587, t: 0.1 },  // D5
      { f: 659, t: 0.1 },  // E5
      { f: 784, t: 0.15 }, // G5
      { f: 659, t: 0.1 },  // E5
      { f: 784, t: 0.3 }   // G5
    ];

    let accum = 0;
    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(note.f, now + accum);
      
      gain.gain.setValueAtTime(0.06, now + accum);
      gain.gain.exponentialRampToValueAtTime(0.001, now + accum + note.t);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + accum);
      osc.stop(now + accum + note.t);

      accum += note.t - 0.02;
    });
  }

  // Game Over Sad melody
  playGameOver() {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;

    const notes = [
      { f: 392, t: 0.2 },  // G4
      { f: 349, t: 0.2 },  // F4
      { f: 311, t: 0.2 },  // Eb4
      { f: 261, t: 0.5 }   // C4
    ];

    let accum = 0;
    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(note.f, now + accum);
      
      gain.gain.setValueAtTime(0.08, now + accum);
      gain.gain.exponentialRampToValueAtTime(0.001, now + accum + note.t);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + accum);
      osc.stop(now + accum + note.t);

      accum += note.t - 0.05;
    });
  }

  // Procedural cute retro 4-bar background loop
  // Keeps it low level, lightweight
  startBGM() {
    if (this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    
    const scale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C major
    // A beautiful cheerful melody
    const melody = [
      2, 4, 5, 4, 2, 4, 2, 0, // Measure 1
      3, 5, 6, 5, 4, 2, 0, 1, // Measure 2
      4, 6, 7, 6, 4, 6, 4, 2, // Measure 3
      3, 1, 2, 0, 4, 3, 2, 1  // Measure 4
    ];
    let noteIndex = 0;

    const playNextBgmNote = () => {
      if (!this.soundEnabled || !this.isBgmPlaying) return;
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Soft cute bass lines
      if (noteIndex % 4 === 0) {
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = "sine";
        const bassFreq = scale[melody[noteIndex] % scale.length] / 2;
        bassOsc.frequency.setValueAtTime(bassFreq, now);
        bassGain.gain.setValueAtTime(0.03, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        bassOsc.connect(bassGain);
        bassGain.connect(ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.6);
      }

      // Soft triangle lead bubble-note
      const leadOsc = ctx.createOscillator();
      const leadGain = ctx.createGain();
      leadOsc.type = "triangle";
      const noteOffset = melody[noteIndex % melody.length];
      const leadFreq = scale[noteOffset % scale.length];

      leadOsc.frequency.setValueAtTime(leadFreq, now);
      leadGain.gain.setValueAtTime(0.02, now);
      leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      leadOsc.connect(leadGain);
      leadGain.connect(ctx.destination);

      leadOsc.start(now);
      leadOsc.stop(now + 0.25);

      noteIndex = (noteIndex + 1) % melody.length;
    };

    // Beats at 220 ms (approx 136 BPM)
    this.bgmInterval = setInterval(playNextBgmNote, 300);
  }

  stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const gameAudio = new AudioEngine();
export default gameAudio;
