/**
 * FlightAudio.js
 * High-fidelity Web Audio API Sound Synthesizer for Jet Turbofans, Wind Noise,
 * GPWS Voice Callouts ("500", "100", "50", "40", "30", "20", "10", "RETARD", "PULL UP", "SINK RATE"),
 * Touchdown Tire Smoke Skids, and Cockpit Alert Chimes.
 */

export class FlightAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.initialized = false;

    // Callout trackers
    this.calledAltitudes = new Set();
    this.lastPullUpTime = 0;
    this.lastSinkRateTime = 0;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // 1. Jet Engine Rumble (Pink/Brown noise filter)
      this.initEngineSound();

      // 2. Wind Noise
      this.initWindSound();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  initEngineSound() {
    // Noise buffer for jet exhaust rumble
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.05;
      b1 = 0.95 * b1 + white * 0.1;
      b2 = 0.90 * b2 + white * 0.15;
      output[i] = b0 + b1 + b2;
    }

    this.engineNoise = this.ctx.createBufferSource();
    this.engineNoise.buffer = noiseBuffer;
    this.engineNoise.loop = true;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(220, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    this.engineNoise.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    this.engineNoise.start();

    // High turbine whine oscillator
    this.turbineOsc = this.ctx.createOscillator();
    this.turbineOsc.type = 'sine';
    this.turbineOsc.frequency.setValueAtTime(1400, this.ctx.currentTime);

    this.turbineGain = this.ctx.createGain();
    this.turbineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    this.turbineOsc.connect(this.turbineGain);
    this.turbineGain.connect(this.masterGain);
    this.turbineOsc.start();
  }

  initWindSound() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.windNoise = this.ctx.createBufferSource();
    this.windNoise.buffer = noiseBuffer;
    this.windNoise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(600, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.05, this.ctx.currentTime);

    this.windNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    this.windNoise.start();
  }

  update(telemetry = {}) {
    if (!this.initialized || this.isMuted || !this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const throttle = telemetry.throttle !== undefined ? telemetry.throttle : 0.5;
    const speedKt = telemetry.airspeedKt || 140;
    const altFt = telemetry.altitudeFt || 1000;
    const vsFpm = telemetry.verticalSpeedFpm || 0;

    // Engine Pitch & Volume
    const baseFreq = 160 + throttle * 280;
    const turbineFreq = 1200 + throttle * 1600;
    const engVol = 0.1 + throttle * 0.35;

    this.engineFilter.frequency.setTargetAtTime(baseFreq, t, 0.1);
    this.turbineOsc.frequency.setTargetAtTime(turbineFreq, t, 0.1);
    this.engineGain.gain.setTargetAtTime(engVol, t, 0.1);
    this.turbineGain.gain.setTargetAtTime(engVol * 0.25, t, 0.1);

    // Wind Volume
    const windVol = Math.max(0.01, Math.min(0.25, (speedKt / 250.0) * 0.2));
    this.windGain.gain.setTargetAtTime(windVol, t, 0.1);
    this.windFilter.frequency.setTargetAtTime(400 + (speedKt / 200.0) * 800, t, 0.1);

    // GPWS Callouts
    this.checkGpwsCallouts(altFt, vsFpm);
  }

  checkGpwsCallouts(altFt, vsFpm) {
    const thresholds = [500, 400, 300, 200, 100, 50, 40, 30, 20, 10];
    for (const th of thresholds) {
      if (altFt <= th && altFt > th - 15 && !this.calledAltitudes.has(th)) {
        this.calledAltitudes.add(th);
        this.speak(`${th}`);
        if (th === 20) {
          setTimeout(() => this.speak('RETARD'), 450);
        }
      }
    }

    // Reset thresholds if aircraft climbs above 600ft
    if (altFt > 650) {
      this.calledAltitudes.clear();
    }

    // GPWS "SINK RATE" Warning (V/S < -1800 fpm below 1000ft)
    const now = Date.now();
    if (altFt < 1000 && vsFpm < -1800 && now - this.lastSinkRateTime > 3500) {
      this.lastSinkRateTime = now;
      this.speak('SINK RATE');
    }

    // GPWS "PULL UP" Warning (V/S < -2400 fpm below 800ft)
    if (altFt < 800 && vsFpm < -2400 && now - this.lastPullUpTime > 3000) {
      this.lastPullUpTime = now;
      this.playWhoop();
      setTimeout(() => this.speak('PULL UP'), 400);
    }
  }

  speak(text) {
    if (this.isMuted || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 1.15;
      u.pitch = 0.95;
      u.volume = 0.85;
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  playWhoop() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.25);
    g.gain.setValueAtTime(0.3, t);
    g.gain.linearRampToValueAtTime(0.01, t + 0.3);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playTouchdown() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Tire squeal oscillator
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.linearRampToValueAtTime(1200, t + 0.4);

    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.5);

    // Tire thud burst
    const thud = this.ctx.createOscillator();
    const thudG = this.ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(90, t);
    thud.frequency.exponentialRampToValueAtTime(30, t + 0.3);

    thudG.gain.setValueAtTime(0.5, t);
    thudG.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    thud.connect(thudG);
    thudG.connect(this.masterGain);
    thud.start(t);
    thud.stop(t + 0.35);
  }

  playTogaChime() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    [660, 880].forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.12);
      g.gain.setValueAtTime(0.2, t + idx * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 0.25);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.25);
    });
  }

  playGatePassChime() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1318.5, t); // E6
    osc.frequency.exponentialRampToValueAtTime(1760.0, t + 0.08); // A6
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  playCrashSound() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. Heavy low-frequency metal impact / explosion
    const boom = this.ctx.createOscillator();
    const boomG = this.ctx.createGain();
    boom.type = 'triangle';
    boom.frequency.setValueAtTime(110, t);
    boom.frequency.exponentialRampToValueAtTime(25, t + 0.8);

    boomG.gain.setValueAtTime(0.85, t);
    boomG.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    boom.connect(boomG);
    boomG.connect(this.masterGain);
    boom.start(t);
    boom.stop(t + 0.9);

    // 2. High-energy metal screech / noise burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.6);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const crashFilter = this.ctx.createBiquadFilter();
    crashFilter.type = 'bandpass';
    crashFilter.frequency.setValueAtTime(1200, t);
    crashFilter.Q.setValueAtTime(3.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.linearRampToValueAtTime(0.01, t + 0.6);

    noiseSource.connect(crashFilter);
    crashFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseSource.start(t);

    this.playMasterWarning();
  }

  playMasterWarning() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    // Two-tone urgent master warning beeps
    [0, 0.22, 0.44].forEach((offset) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, t + offset);
      osc.frequency.setValueAtTime(1046.5, t + offset + 0.08);

      g.gain.setValueAtTime(0.25, t + offset);
      g.gain.linearRampToValueAtTime(0.01, t + offset + 0.18);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t + offset);
      osc.stop(t + offset + 0.18);
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0.0 : 0.5, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}
