import type { BiomeId, LightMode } from './sim/types';

// Fully procedural soundscape (no audio files), following the design bible:
// - an adaptive "wash" of filtered noise breathing with the biome
// - granular synthesis: short noise/glass grains scattered in time and stereo
// - a Markov-chain melody over biome-specific modes, played on soft FM bells
// - a threat pulse that rises as danger approaches
// Everything runs through an underwater low-pass, a generated reverb and a
// gentle compressor. Browsers require a user gesture before audio can start.

type Scale = { root: number; steps: number[]; tempo: number; density: number };

const SCALES: Record<BiomeId, Scale> = {
  shallows: { root: 261.63, steps: [0, 2, 4, 7, 9, 12, 14, 16], tempo: 0.42, density: 0.75 }, // major pentatonic
  biofilm: { root: 220, steps: [0, 2, 3, 5, 7, 9, 10, 12], tempo: 0.5, density: 0.6 }, // dorian
  bloom: { root: 207.65, steps: [0, 1, 3, 5, 7, 8, 10, 12], tempo: 0.46, density: 0.55 }, // phrygian
  abyss: { root: 146.83, steps: [0, 3, 5, 7, 10, 12, 15], tempo: 0.7, density: 0.35 }, // minor pentatonic
  rift: { root: 196, steps: [0, 1, 4, 5, 7, 8, 11, 12], tempo: 0.36, density: 0.7 }, // double harmonic
};

// First-order Markov transitions over scale-degree intervals: mostly steps,
// sometimes leaps, gravitating back toward the tonic.
const INTERVAL_WEIGHTS: Array<[number, number]> = [[-2, 0.12], [-1, 0.3], [0, 0.06], [1, 0.3], [2, 0.12], [3, 0.05], [-3, 0.05]];

export type SfxBus = 'sfx' | 'ui';

export class Soundscape {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbSend: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private glass: AudioBuffer | null = null;
  private washFilter: BiquadFilterNode | null = null;
  private washGain: GainNode | null = null;
  private droneA: OscillatorNode | null = null;
  private droneB: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private pulseGain: GainNode | null = null;
  private timer: number | null = null;
  private nextNote = 0;
  private nextGrain = 0;
  private nextPulse = 0;
  private degree = 0;
  private biome: BiomeId = 'shallows';
  private intensity = 0;
  private muted = false;
  private paused = false;
  volumes = { master: 0.8, music: 0.7, sfx: 0.85 };

  get ready() {
    return this.ctx !== null;
  }

  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.buildGraph();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private buildGraph() {
    const ctx = this.ctx!;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volumes.master;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 2600;
    this.filter.Q.value = 0.5;
    this.master.connect(this.filter);
    this.filter.connect(comp);
    comp.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.volumes.music;
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.volumes.sfx;
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);

    // Generated plate-like reverb: decaying stereo noise.
    this.reverb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 3.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.reverb.buffer = ir;
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.55;
    this.reverbSend.connect(this.reverb);
    this.reverb.connect(this.master);

    // Pink-ish noise for the wash and grains; a glassy tone buffer for grains.
    const nlen = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < nlen; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029591;
      b1 = 0.985 * b1 + w * 0.032534;
      b2 = 0.95 * b2 + w * 0.048056;
      nd[i] = (b0 + b1 + b2 + w * 0.05) * 0.9;
    }
    const glen = Math.floor(ctx.sampleRate * 0.6);
    this.glass = ctx.createBuffer(1, glen, ctx.sampleRate);
    const gd = this.glass.getChannelData(0);
    for (let i = 0; i < glen; i++) {
      const t = i / ctx.sampleRate;
      gd[i] = (Math.sin(t * 2 * Math.PI * 880) * 0.5 + Math.sin(t * 2 * Math.PI * 1318.5) * 0.3 + Math.sin(t * 2 * Math.PI * 2093) * 0.2) * Math.exp(-t * 4);
    }

    // Ambient wash.
    const wash = ctx.createBufferSource();
    wash.buffer = this.noise;
    wash.loop = true;
    this.washFilter = ctx.createBiquadFilter();
    this.washFilter.type = 'bandpass';
    this.washFilter.frequency.value = 380;
    this.washFilter.Q.value = 0.7;
    this.washGain = ctx.createGain();
    this.washGain.gain.value = 0.05;
    wash.connect(this.washFilter);
    this.washFilter.connect(this.washGain);
    this.washGain.connect(this.musicBus);
    this.washGain.connect(this.reverbSend);
    wash.start();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 160;
    lfo.connect(lfoAmt);
    lfoAmt.connect(this.washFilter.frequency);
    lfo.start();

    // Drone.
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.045;
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 420;
    this.droneA = ctx.createOscillator();
    this.droneA.type = 'triangle';
    this.droneB = ctx.createOscillator();
    this.droneB.type = 'sine';
    this.droneA.connect(droneFilter);
    this.droneB.connect(droneFilter);
    droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.musicBus);
    this.droneGain.connect(this.reverbSend);
    this.droneA.start();
    this.droneB.start();
    const breath = ctx.createOscillator();
    breath.frequency.value = 0.05;
    const breathAmt = ctx.createGain();
    breathAmt.gain.value = 0.02;
    breath.connect(breathAmt);
    breathAmt.connect(this.droneGain.gain);
    breath.start();

    this.pulseGain = ctx.createGain();
    this.pulseGain.gain.value = 0;
    this.pulseGain.connect(this.musicBus);

    this.applyBiome(true);
    this.nextNote = ctx.currentTime + 0.5;
    this.nextGrain = ctx.currentTime + 0.2;
    this.nextPulse = ctx.currentTime + 1;
    this.timer = window.setInterval(() => this.schedule(), 60);
  }

  private applyBiome(immediate = false) {
    const ctx = this.ctx;
    if (!ctx || !this.droneA || !this.droneB || !this.washFilter) return;
    const sc = SCALES[this.biome];
    const t = ctx.currentTime;
    const tc = immediate ? 0.01 : 2.5;
    this.droneA.frequency.setTargetAtTime(sc.root / 4, t, tc);
    this.droneB.frequency.setTargetAtTime((sc.root / 4) * 1.5 * 1.003, t, tc);
    const washCenter = { shallows: 520, biofilm: 340, bloom: 600, abyss: 220, rift: 420 }[this.biome];
    this.washFilter.frequency.setTargetAtTime(washCenter, t, tc);
  }

  setBiome(biome: BiomeId) {
    if (biome === this.biome) return;
    this.biome = biome;
    this.applyBiome();
  }

  setIntensity(v: number) {
    this.intensity = Math.max(0, Math.min(1, v));
  }

  setLightMode(mode: LightMode) {
    const ctx = this.ctx;
    if (!ctx || !this.filter) return;
    // Darkfield and fluorescence feel more hushed and glassy.
    const f = mode === 'bright' ? 2600 : mode === 'dark' ? 1700 : 3600;
    this.filter.frequency.setTargetAtTime(f, ctx.currentTime, 0.3);
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.applyGain();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyGain();
  }

  setVolumes(v: Partial<{ master: number; music: number; sfx: number }>) {
    this.volumes = { ...this.volumes, ...v };
    const ctx = this.ctx;
    if (!ctx) return;
    this.musicBus?.gain.setTargetAtTime(this.volumes.music, ctx.currentTime, 0.05);
    this.sfxBus?.gain.setTargetAtTime(this.volumes.sfx, ctx.currentTime, 0.05);
    this.applyGain();
  }

  private applyGain() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const target = this.muted ? 0 : this.volumes.master * (this.paused ? 0.35 : 1);
    this.master.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
  }

  // Lookahead scheduler for melody, grains and the threat pulse.
  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const ahead = ctx.currentTime + 0.25;
    const sc = SCALES[this.biome];
    while (this.nextNote < ahead) {
      if (Math.random() < sc.density * (this.paused ? 0.4 : 1)) {
        const weights = INTERVAL_WEIGHTS.map(([iv, w]) => {
          const target = this.degree + iv;
          // Gravity toward the tonic region keeps phrases grounded.
          const pull = target < 0 || target >= sc.steps.length ? 0 : 1 + (target === 0 || target === 5 ? 0.6 : 0);
          return [iv, w * pull] as [number, number];
        });
        const total = weights.reduce((s, [, w]) => s + w, 0);
        let roll = Math.random() * total;
        for (const [iv, w] of weights) {
          roll -= w;
          if (roll <= 0) {
            this.degree = Math.max(0, Math.min(sc.steps.length - 1, this.degree + iv));
            break;
          }
        }
        const freq = sc.root * Math.pow(2, sc.steps[this.degree] / 12) * (this.biome === 'abyss' ? 0.5 : 1);
        this.bell(this.nextNote, freq, 0.05 + Math.random() * 0.03, (Math.random() - 0.5) * 0.8);
        if (Math.random() < 0.18) this.bell(this.nextNote + sc.tempo * 0.5, freq * 1.5, 0.025, (Math.random() - 0.5) * 0.8);
      }
      const beats = [1, 1, 1, 2, 2, 0.5][Math.floor(Math.random() * 6)];
      this.nextNote += sc.tempo * beats * (1 - this.intensity * 0.3);
    }
    while (this.nextGrain < ahead) {
      this.grain(this.nextGrain);
      this.nextGrain += 0.05 + Math.random() * (0.35 - this.intensity * 0.2);
    }
    if (this.intensity > 0.08) {
      while (this.nextPulse < ahead) {
        this.heartbeat(this.nextPulse, this.intensity);
        this.nextPulse += 1.1 - this.intensity * 0.45;
      }
    } else {
      this.nextPulse = ctx.currentTime + 0.5;
    }
    this.washGain?.gain.setTargetAtTime(0.04 + this.intensity * 0.05, ctx.currentTime, 0.8);
  }

  private bell(t: number, freq: number, gain: number, pan: number) {
    const ctx = this.ctx!;
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const env = ctx.createGain();
    const panner = ctx.createStereoPanner();
    car.frequency.value = freq;
    mod.frequency.value = freq * 3.5;
    modGain.gain.setValueAtTime(freq * 1.6, t);
    modGain.gain.exponentialRampToValueAtTime(freq * 0.05, t + 1.2);
    mod.connect(modGain);
    modGain.connect(car.frequency);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    panner.pan.value = pan;
    car.connect(env);
    env.connect(panner);
    panner.connect(this.musicBus!);
    panner.connect(this.reverbSend!);
    car.start(t);
    mod.start(t);
    car.stop(t + 2.3);
    mod.stop(t + 2.3);
  }

  private grain(t: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    const glassy = Math.random() < 0.25;
    src.buffer = glassy ? this.glass : this.noise;
    src.playbackRate.value = glassy ? 0.5 + Math.random() * 1.5 : 0.4 + Math.random() * 1.2;
    const dur = 0.04 + Math.random() * 0.12;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(glassy ? 0.02 : 0.05, t + dur * 0.4);
    env.gain.linearRampToValueAtTime(0, t + dur);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 300 + Math.random() * 2400;
    bp.Q.value = 3;
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.random() * 2 - 1;
    src.connect(bp);
    bp.connect(env);
    env.connect(panner);
    panner.connect(this.reverbSend!);
    panner.connect(this.musicBus!);
    const offset = Math.random() * (src.buffer!.duration - dur);
    src.start(t, Math.max(0, offset), dur);
  }

  private heartbeat(t: number, k: number) {
    const ctx = this.ctx!;
    for (const [dt, g] of [[0, 1], [0.18, 0.7]] as const) {
      const o = ctx.createOscillator();
      const env = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(70, t + dt);
      o.frequency.exponentialRampToValueAtTime(40, t + dt + 0.18);
      env.gain.setValueAtTime(0.0001, t + dt);
      env.gain.exponentialRampToValueAtTime(0.16 * k * g, t + dt + 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.25);
      o.connect(env);
      env.connect(this.musicBus!);
      o.start(t + dt);
      o.stop(t + dt + 0.3);
    }
  }

  // --- One-shot effects -----------------------------------------------------

  private tone(opts: {
    type?: OscillatorType; from: number; to?: number; dur: number; gain: number; attack?: number; pan?: number; delay?: number; reverb?: number;
  }) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const o = ctx.createOscillator();
    const env = ctx.createGain();
    const panner = ctx.createStereoPanner();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(opts.from, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + opts.dur);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(opts.gain, t + (opts.attack ?? 0.008));
    env.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    panner.pan.value = Math.max(-1, Math.min(1, opts.pan ?? 0));
    o.connect(env);
    env.connect(panner);
    panner.connect(this.sfxBus!);
    if (opts.reverb) {
      const send = ctx.createGain();
      send.gain.value = opts.reverb;
      panner.connect(send);
      send.connect(this.reverbSend!);
    }
    o.start(t);
    o.stop(t + opts.dur + 0.05);
  }

  private noiseHit(opts: { freq: number; to?: number; q?: number; dur: number; gain: number; type?: BiquadFilterType; pan?: number; delay?: number }) {
    const ctx = this.ctx;
    if (!ctx || this.muted || !this.noise) return;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.setValueAtTime(opts.freq, t);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + opts.dur);
    f.Q.value = opts.q ?? 1;
    const env = ctx.createGain();
    env.gain.setValueAtTime(opts.gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, opts.pan ?? 0));
    src.connect(f);
    f.connect(env);
    env.connect(panner);
    panner.connect(this.sfxBus!);
    src.start(t, Math.random() * 1.5, opts.dur + 0.05);
  }

  private chord(freqs: number[], gain: number, spread = 0.06, dur = 1.4) {
    freqs.forEach((f, i) => this.tone({ type: 'triangle', from: f, dur, gain, delay: i * spread, reverb: 0.6, attack: 0.02 }));
  }

  // Glucose: bright pops rising through a pentatonic run as you chain them.
  pop(combo: number, pan = 0) {
    const sc = SCALES[this.biome];
    const step = sc.steps[Math.min(sc.steps.length - 1, combo % sc.steps.length)];
    const f = sc.root * 2 * Math.pow(2, step / 12);
    this.tone({ from: f, to: f * 1.5, dur: 0.12, gain: 0.09, pan, reverb: 0.2 });
  }

  gulp(size: number, pan = 0) {
    const f = 240 / Math.max(0.6, Math.sqrt(size / 8));
    this.tone({ type: 'triangle', from: f, to: f * 0.45, dur: 0.22, gain: 0.16, pan });
    this.noiseHit({ freq: 600, to: 160, dur: 0.18, gain: 0.05, pan });
  }

  digest(pan = 0) {
    this.tone({ from: 520, to: 780, dur: 0.1, gain: 0.04, pan, reverb: 0.3 });
  }

  hit(strength: number, pan = 0) {
    this.noiseHit({ freq: 700, to: 90, dur: 0.3, gain: 0.25 * Math.min(1.5, strength), type: 'lowpass', pan });
    this.tone({ from: 160, to: 60, dur: 0.25, gain: 0.12, pan });
  }

  kill(size: number, pan = 0) {
    this.noiseHit({ freq: 1400, to: 200, dur: 0.35, gain: 0.12, pan });
    this.tone({ type: 'square', from: 300 / Math.sqrt(Math.max(1, size / 10)), to: 50, dur: 0.3, gain: 0.05, pan });
  }

  attach(pan = 0) {
    this.tone({ type: 'square', from: 1400, to: 900, dur: 0.05, gain: 0.04, pan });
    this.tone({ type: 'square', from: 1100, to: 700, dur: 0.05, gain: 0.03, pan, delay: 0.06 });
  }

  shake() {
    this.noiseHit({ freq: 2000, to: 500, dur: 0.15, gain: 0.08, q: 2 });
  }

  infection() {
    this.tone({ type: 'sawtooth', from: 180, to: 70, dur: 0.8, gain: 0.08, attack: 0.08, reverb: 0.4 });
    this.tone({ type: 'sawtooth', from: 190, to: 74, dur: 0.8, gain: 0.06, attack: 0.08 });
  }

  misfold() {
    this.tone({ type: 'sine', from: 600, to: 320, dur: 0.6, gain: 0.07, reverb: 0.6 });
    this.tone({ type: 'sine', from: 636, to: 300, dur: 0.6, gain: 0.05, reverb: 0.6 });
  }

  cure() {
    this.chord([523.25, 659.25, 783.99, 1046.5], 0.05, 0.05, 0.9);
  }

  burst() {
    this.noiseHit({ freq: 300, to: 60, dur: 0.9, gain: 0.35, type: 'lowpass' });
    this.tone({ type: 'sawtooth', from: 110, to: 35, dur: 0.9, gain: 0.12 });
  }

  dash() {
    this.noiseHit({ freq: 400, to: 2400, dur: 0.22, gain: 0.09, q: 0.8 });
  }

  lysosome() {
    for (let i = 0; i < 8; i++) {
      const f = 400 + Math.random() * 1400;
      this.tone({ from: f, to: f * 1.6, dur: 0.08, gain: 0.04, delay: i * 0.025 + Math.random() * 0.02, pan: Math.random() * 2 - 1 });
    }
    this.noiseHit({ freq: 900, to: 200, dur: 0.5, gain: 0.12 });
  }

  dart() {
    this.tone({ type: 'square', from: 1800, to: 600, dur: 0.07, gain: 0.04 });
  }

  rnai() {
    this.tone({ type: 'sine', from: 900, to: 1800, dur: 0.35, gain: 0.07, reverb: 0.5 });
    this.tone({ type: 'sine', from: 1200, to: 2400, dur: 0.35, gain: 0.04, delay: 0.05, reverb: 0.5 });
  }

  encyst() {
    this.noiseHit({ freq: 200, to: 120, dur: 0.6, gain: 0.15, type: 'lowpass' });
    this.tone({ type: 'triangle', from: 220, to: 110, dur: 0.5, gain: 0.08 });
  }

  build() {
    this.tone({ type: 'triangle', from: 330, to: 660, dur: 0.12, gain: 0.08 });
    this.chord([659.25, 987.77], 0.05, 0.08, 0.6);
  }

  endosymbiosis() {
    this.chord([392, 493.88, 587.33, 783.99, 987.77], 0.055, 0.09, 2.2);
  }

  divideStart() {
    this.tone({ type: 'sine', from: 200, to: 400, dur: 3, gain: 0.06, attack: 0.5, reverb: 0.8 });
  }

  divided() {
    this.chord([261.63, 329.63, 392, 523.25, 659.25, 783.99], 0.06, 0.07, 2.6);
  }

  discover() {
    this.chord([880, 1174.66, 1318.51], 0.035, 0.07, 1);
  }

  objective() {
    this.chord([523.25, 783.99, 1046.5], 0.05, 0.1, 1.2);
  }

  event(kind: string) {
    if (kind === 'glucoseBloom' || kind === 'phageBurst' || kind === 'virophageSwarm') this.chord([392, 587.33, 783.99], 0.04, 0.12, 1.4);
    else if (kind === 'neoplasm') {
      this.tone({ type: 'sawtooth', from: 80, to: 40, dur: 1.6, gain: 0.14, attack: 0.3, reverb: 0.6 });
      this.tone({ type: 'sawtooth', from: 82, to: 41, dur: 1.6, gain: 0.12, attack: 0.3 });
    } else {
      this.tone({ type: 'triangle', from: 220, to: 180, dur: 0.9, gain: 0.08, reverb: 0.6 });
      this.tone({ type: 'triangle', from: 233, to: 190, dur: 0.9, gain: 0.06, reverb: 0.6, delay: 0.12 });
    }
  }

  captured() {
    this.tone({ type: 'sawtooth', from: 120, to: 60, dur: 0.5, gain: 0.12 });
    this.noiseHit({ freq: 300, to: 120, dur: 0.6, gain: 0.2, type: 'lowpass' });
  }

  escaped() {
    this.tone({ from: 300, to: 900, dur: 0.25, gain: 0.08 });
  }

  tardigrade() {
    this.chord([196, 246.94, 293.66], 0.05, 0.05, 1.2);
  }

  modeSwitch(mode: LightMode) {
    this.tone({ type: 'square', from: 2400, to: 2400, dur: 0.03, gain: 0.03 });
    this.tone({ from: mode === 'bright' ? 600 : mode === 'dark' ? 300 : 900, dur: 0.2, gain: 0.04, delay: 0.03, reverb: 0.4 });
  }

  ui() {
    this.tone({ type: 'triangle', from: 880, to: 990, dur: 0.06, gain: 0.03 });
  }

  death() {
    this.tone({ type: 'sine', from: 140, to: 35, dur: 2.4, gain: 0.25, attack: 0.1, reverb: 0.8 });
    this.chord([220, 207.65, 164.81], 0.04, 0.3, 2.5);
  }

  victory() {
    this.chord([261.63, 329.63, 392, 493.88, 587.33, 783.99, 1046.5], 0.06, 0.12, 3.5);
  }

  dispose() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
  }
}
