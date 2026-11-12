// Original procedural process audio; noise is generated locally.
const unit = (value, fallback = 0) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;

export class ProcessSound {
  constructor() {
    this.context = null;
    this.enabled = false;
    this.gain = null;
    this.source = null;
    this.pilotFilter = null;
    this.mainFilter = null;
    this.pilotGain = null;
    this.mainGain = null;
    this.stopped = false;
    this.transient = null;
    this.volume = 1;
  }

  async unlock() {
    if (!this.enabled) {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return;
      const context = new Audio();
      this.context = context;
      this.gain = context.createGain();
      this.gain.gain.value = 0;
      this.gain.connect(context.destination);

      const length = Math.max(1, Math.floor(context.sampleRate * 2));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const samples = buffer.getChannelData(0);
      let seed = 2019;
      for (let i = 0; i < length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        samples[i] = (seed / 4294967296) * 2 - 1;
      }
      this.source = context.createBufferSource();
      this.source.buffer = buffer;
      this.source.loop = true;

      this.pilotFilter = context.createBiquadFilter();
      this.pilotFilter.type = 'bandpass';
      this.pilotFilter.frequency.value = 1800;
      this.pilotFilter.Q.value = 0.7;
      this.pilotGain = context.createGain();
      this.pilotGain.gain.value = 0;
      this.source.connect(this.pilotFilter);
      this.pilotFilter.connect(this.pilotGain);
      this.pilotGain.connect(this.gain);

      this.mainFilter = context.createBiquadFilter();
      this.mainFilter.type = 'lowpass';
      this.mainFilter.frequency.value = 500;
      this.mainFilter.Q.value = 0.7;
      this.mainGain = context.createGain();
      this.mainGain.gain.value = 0;
      this.source.connect(this.mainFilter);
      this.mainFilter.connect(this.mainGain);
      this.mainGain.connect(this.gain);
      this.source.start();
      this.enabled = true;
    }
    if (this.stopped) {
      // Do not revive the previous job's flame before its first update.
      const now = this.context.currentTime;
      for (const param of [this.gain.gain, this.pilotGain.gain, this.mainGain.gain]) {
        param.cancelScheduledValues(now);
        param.setValueAtTime(0, now);
      }
    }
    this.stopped = false;
    if (this.context.state !== 'running') await this.context.resume();
  }

  update(state, watching) {
    if (!this.enabled || this.stopped) return;
    state = state || {};
    const now = this.context.currentTime;
    const pilot = !!state.pilotLit;
    const main = !!state.mainLit;
    const heat = unit(state.heatRelease);
    const stability = unit(main ? state.stability : state.pilotStability, 1);
    const instability = 1 - stability;
    const pulse = Math.sin(now * 2 * Math.PI * 5.2);
    const focus = watching ? 1 : 0.38;
    const level = main ? 0.025 + heat * 0.045 : pilot ? 0.009 : 0;
    this.gain.gain.setTargetAtTime(level * focus * unit(this.volume,1), now, 0.06);
    this.pilotGain.gain.setTargetAtTime(pilot ? (main ? 0.12 : 0.55) : 0, now, 0.06);
    this.mainGain.gain.setTargetAtTime(main ? 0.8 * (1 + instability * 0.12 * pulse) : 0, now, 0.06);
    this.mainFilter.frequency.setTargetAtTime(350 + heat * 850 + instability * 120 * pulse, now, 0.08);
    this.pilotFilter.frequency.setTargetAtTime(1700 + instability * 180 * pulse, now, 0.08);
  }

  click() {
    if (!this.enabled || this.stopped || unit(this.volume,1)===0) return;
    if (this.transient) this.clearTransient(this.transient);
    const now = this.context.currentTime;
    const tone = this.context.createOscillator();
    const envelope = this.context.createGain();
    const transient = { tone, envelope, cleaned: false };
    this.transient = transient;
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(250, now);
    tone.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    envelope.gain.setValueAtTime(0.035 * unit(this.volume,1), now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
    tone.connect(envelope);
    envelope.connect(this.context.destination);
    tone.onended = () => this.clearTransient(transient, true);
    tone.start(now);
    tone.stop(now + 0.11);
  }

  clearTransient(transient, ended = false) {
    if (transient.cleaned) return;
    transient.cleaned = true;
    if (this.transient === transient) this.transient = null;
    transient.tone.onended = null;
    if (!ended) {
      try {
        transient.tone.stop();
      } catch (error) {
        if (error.name !== 'InvalidStateError') throw error;
      }
    }
    transient.tone.disconnect();
    transient.envelope.disconnect();
  }

  stop() {
    if (!this.enabled) return;
    this.stopped = true;
    this.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.06);
    if (this.transient) this.clearTransient(this.transient);
  }
}

