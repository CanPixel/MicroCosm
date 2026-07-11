// Fully procedural Web Audio soundscape — no asset files. Everything is
// synthesized on the client, wrapped in an "underwater" low-pass so the whole
// mix feels muffled and submerged, matching the microscopic setting.
//
// Browsers block audio until a user gesture, so nothing is created until
// unlock() is called from the first pointer/key event.

export class Soundscape {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private lowpass: BiquadFilterNode | null = null;
  private ambientGain: GainNode | null = null;
  private muted = false;
  private noiseBuffer: AudioBuffer | null = null;

  get ready() {
    return this.ctx !== null;
  }

  // Create/resume the audio graph. Safe to call repeatedly.
  unlock() {
    if (this.muted) return;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.buildGraph();
      this.startAmbient();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(muted ? 0 : 0.9, t, 0.05);
  }

  private buildGraph() {
    const ctx = this.ctx!;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;

    // The underwater character: roll off highs hard.
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 900;
    this.lowpass.Q.value = 0.6;

    this.master.connect(this.lowpass);
    this.lowpass.connect(ctx.destination);

    // Pre-render a second of pink-ish noise for reuse (currents, thuds).
    const len = ctx.sampleRate;
    this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }

  // A slow, breathing drone bed — two detuned oscillators plus a filtered
  // noise "current", all very quiet.
  private startAmbient() {
    const ctx = this.ctx!;
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0.05;
    this.ambientGain.connect(this.master!);

    const droneA = ctx.createOscillator();
    droneA.type = 'sine';
    droneA.frequency.value = 55;
    const droneB = ctx.createOscillator();
    droneB.type = 'sine';
    droneB.frequency.value = 55.4; // slight detune -> slow beating
    droneA.connect(this.ambientGain);
    droneB.connect(this.ambientGain);
    droneA.start();
    droneB.start();

    // A slow LFO breathes the ambient volume.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(this.ambientGain.gain);
    lfo.start();

    // Gentle current: looping noise through a low bandpass.
    if (this.noiseBuffer) {
      const current = ctx.createBufferSource();
      current.buffer = this.noiseBuffer;
      current.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 220;
      bp.Q.value = 0.5;
      const g = ctx.createGain();
      g.gain.value = 0.015;
      current.connect(bp);
      bp.connect(g);
      g.connect(this.ambientGain);
      current.start();
    }
  }

  // A rising "pop" when absorbing a nutrient; pitch scales with sugar size.
  absorptionPop(pitchScale = 1) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const base = 300 / Math.max(0.6, pitchScale); // bigger sugar -> lower, fatter pop
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 2, t + 0.09);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  // A meatier, lower gulp when devouring a whole organism.
  devour() {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.18);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain);
    gain.connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.24);
  }

  // A dull noise thud on taking damage.
  damageThud() {
    const ctx = this.ctx;
    if (!ctx || this.muted || !this.noiseBuffer) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.25);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master!);
    src.start(t);
    src.stop(t + 0.32);
  }

  // A bright two-note chime when unlocking an organelle ability.
  collectChime() {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    [523.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = t + i * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(this.master!);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  // An ominous descending tone when infected.
  infectionStart() {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.7);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc.connect(gain);
    gain.connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.82);
  }

  // A clean rising shimmer when cured.
  cure() {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.3);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.13, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.42);
  }

  // A long low swell on death.
  death() {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 1.6);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.28, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    osc.connect(gain);
    gain.connect(this.master!);
    osc.start(t);
    osc.stop(t + 1.85);
  }

  dispose() {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
