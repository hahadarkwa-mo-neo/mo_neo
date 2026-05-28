/**
 * sounds.js - Procedural sound effects using Web Audio API
 * No external audio files needed!
 */

const Sounds = (() => {
  let audioCtx = null;
  let enabled = true;
  let volume = 0.3;

  function getCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, duration, type = 'sine', vol = volume) {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Silently fail if audio not available
    }
  }

  function playNoise(duration, vol = volume * 0.5) {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(ctx.currentTime);
    } catch (e) {}
  }

  return {
    get enabled() { return enabled; },
    set enabled(val) { enabled = val; },

    init() {
      // Initialize audio context on first user gesture
      getCtx();
    },

    // Card play sound - quick whoosh
    cardPlay() {
      playTone(800, 0.1, 'sine', volume * 0.4);
      setTimeout(() => playTone(600, 0.08, 'sine', volume * 0.3), 30);
    },

    // Card draw sound - paper flip
    cardDraw() {
      playNoise(0.08, volume * 0.3);
      playTone(1200, 0.05, 'sine', volume * 0.2);
    },

    // Explosion! Dramatic boom
    explosion() {
      playNoise(0.8, volume * 0.8);
      playTone(80, 0.6, 'sawtooth', volume * 0.6);
      setTimeout(() => {
        playTone(60, 0.4, 'sawtooth', volume * 0.4);
        playNoise(0.5, volume * 0.5);
      }, 100);
      setTimeout(() => playTone(40, 0.5, 'sine', volume * 0.3), 300);
    },

    // Defuse sound - relief / success
    defuse() {
      playTone(523, 0.15, 'sine', volume * 0.4);
      setTimeout(() => playTone(659, 0.15, 'sine', volume * 0.4), 100);
      setTimeout(() => playTone(784, 0.2, 'sine', volume * 0.5), 200);
      setTimeout(() => playTone(1047, 0.3, 'sine', volume * 0.3), 300);
    },

    // Skip sound - swish
    skip() {
      playTone(400, 0.1, 'triangle', volume * 0.3);
      setTimeout(() => playTone(600, 0.08, 'triangle', volume * 0.2), 50);
    },

    // Attack sound - aggressive
    attack() {
      playTone(200, 0.15, 'sawtooth', volume * 0.4);
      setTimeout(() => playTone(400, 0.1, 'sawtooth', volume * 0.5), 80);
      setTimeout(() => playTone(150, 0.2, 'sawtooth', volume * 0.3), 150);
    },

    // Nope sound - buzzer
    nope() {
      playTone(200, 0.3, 'square', volume * 0.3);
      playTone(190, 0.3, 'square', volume * 0.3);
    },

    // Shuffle sound - card shuffling
    shuffle() {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          playNoise(0.04, volume * 0.2);
          playTone(800 + Math.random() * 400, 0.03, 'sine', volume * 0.1);
        }, i * 50);
      }
    },

    // See future - mystical
    seeFuture() {
      playTone(440, 0.2, 'sine', volume * 0.3);
      setTimeout(() => playTone(554, 0.2, 'sine', volume * 0.3), 150);
      setTimeout(() => playTone(659, 0.3, 'sine', volume * 0.4), 300);
    },

    // Favor - gift
    favor() {
      playTone(660, 0.1, 'triangle', volume * 0.3);
      setTimeout(() => playTone(880, 0.15, 'triangle', volume * 0.3), 80);
    },

    // Cat combo - meow-ish
    catCombo() {
      playTone(600, 0.15, 'sine', volume * 0.3);
      setTimeout(() => playTone(900, 0.1, 'sine', volume * 0.4), 100);
      setTimeout(() => playTone(700, 0.2, 'sine', volume * 0.3), 180);
    },

    // Player eliminated
    eliminated() {
      playTone(400, 0.2, 'sawtooth', volume * 0.4);
      setTimeout(() => playTone(300, 0.2, 'sawtooth', volume * 0.4), 200);
      setTimeout(() => playTone(200, 0.3, 'sawtooth', volume * 0.3), 400);
      setTimeout(() => playTone(100, 0.5, 'sawtooth', volume * 0.2), 600);
    },

    // Victory fanfare
    victory() {
      const notes = [523, 587, 659, 784, 880, 1047];
      notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.2, 'sine', volume * 0.4), i * 120);
      });
      setTimeout(() => {
        playTone(1047, 0.5, 'sine', volume * 0.5);
        playTone(784, 0.5, 'sine', volume * 0.3);
        playTone(523, 0.5, 'sine', volume * 0.2);
      }, notes.length * 120);
    },

    // Button click
    click() {
      playTone(1000, 0.05, 'sine', volume * 0.2);
    },

    // Turn start notification
    turnStart() {
      playTone(880, 0.1, 'sine', volume * 0.3);
      setTimeout(() => playTone(1100, 0.12, 'sine', volume * 0.3), 80);
    },

    // Tick sound for countdown
    tick() {
      playTone(1000, 0.03, 'sine', volume * 0.2);
    },

    // Vibrate device if supported
    vibrate(pattern = [100]) {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    },

    vibrateExplosion() {
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200, 100, 300]);
      }
    }
  };
})();
