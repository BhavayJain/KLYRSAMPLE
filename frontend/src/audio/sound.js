// Synthesized sound: wind ambience, water, UI blips. No audio files.
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = false;
    this.ambNodes = null;
    this.humNodes = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
  }

  noiseBuffer(seconds = 2) {
    const len = this.ctx.sampleRate * seconds;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  setEnabled(on) {
    this.enabled = on;
    if (on) {
      this.init();
      if (!this.ctx) return;
      this.ctx.resume();
      this.startAmbience();
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0.9, this.ctx.currentTime + 0.8);
    } else if (this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
    }
  }

  startAmbience() {
    if (this.ambNodes || !this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(4);
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 320;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start();
    lfo.start();
    this.ambNodes = { src, lfo };
  }

  plink(delay = 0, freq = 900) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.35, t + 0.22);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  waterBurst() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(1.5);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(1400, t);
    bp.frequency.exponentialRampToValueAtTime(360, t + 1.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(t);
    for (let i = 0; i < 6; i++) {
      this.plink(0.1 + Math.random() * 1.0, 500 + Math.random() * 900);
    }
  }

  blip(up = true) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(up ? 620 : 380, t);
    osc.frequency.exponentialRampToValueAtTime(up ? 980 : 240, t + 0.09);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  whoosh() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(3);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(180, t);
    bp.frequency.exponentialRampToValueAtTime(1600, t + 1.4);
    bp.frequency.exponentialRampToValueAtTime(220, t + 2.8);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 1.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.9);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  setHum(on) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    if (on && !this.humNodes) {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.035, t + 1.5);
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 500;
      const o1 = this.ctx.createOscillator();
      o1.frequency.value = 108;
      const o2 = this.ctx.createOscillator();
      o2.frequency.value = 163;
      o1.connect(lp);
      o2.connect(lp);
      lp.connect(g);
      g.connect(this.master);
      o1.start();
      o2.start();
      this.humNodes = { o1, o2, g };
    } else if (!on && this.humNodes) {
      const { o1, o2, g } = this.humNodes;
      g.gain.cancelScheduledValues(t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      o1.stop(t + 1);
      o2.stop(t + 1);
      this.humNodes = null;
    }
  }
}

export const sound = new SoundEngine();
