/**
 * Sintetizador de Audio Procedimental (Web Audio API)
 * Genera efectos mecánicos, electromagnéticos y piezoeléctricos en tiempo real
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.alarmOsc = null;
    this.alarmGain = null;
    this.isAlarmPlaying = false;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  /**
   * Clic de relevador electromagnético para flancos de reloj
   */
  playRelayClick() {
    this.initContext();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.025);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * Servomotor DC operando el brazo de la barrera
   */
  playServoSound() {
    this.initContext();
    const now = this.ctx.currentTime;
    const duration = 0.45;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(180, now + duration * 0.5);
    osc.frequency.linearRampToValueAtTime(120, now + duration);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.12, now + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Sirena de alarma piezoeléctrica industrial activada por el Latch SR
   */
  setAlarm(active) {
    this.initContext();

    if (active && !this.isAlarmPlaying) {
      this.isAlarmPlaying = true;
      const now = this.ctx.currentTime;

      this.alarmOsc = this.ctx.createOscillator();
      this.alarmGain = this.ctx.createGain();

      this.alarmOsc.type = "square";
      this.alarmOsc.frequency.setValueAtTime(950, now);

      // Modulación de frecuencia bitonal (950Hz - 1400Hz)
      const lfo = this.ctx.createOscillator();
      lfo.type = "square";
      lfo.frequency.setValueAtTime(4, now); // 4 pulsos por segundo

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(450, now);

      lfo.connect(this.alarmOsc.frequency);
      this.alarmOsc.connect(this.alarmGain);
      this.alarmGain.connect(this.ctx.destination);

      this.alarmGain.gain.setValueAtTime(0.18, now);

      this.alarmOsc.start(now);
      lfo.start(now);

      this.lfo = lfo;
    } else if (!active && this.isAlarmPlaying) {
      this.isAlarmPlaying = false;
      if (this.alarmGain) {
        const now = this.ctx.currentTime;
        this.alarmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        setTimeout(() => {
          if (this.alarmOsc) {
            this.alarmOsc.stop();
            this.alarmOsc.disconnect();
          }
          if (this.lfo) {
            this.lfo.stop();
            this.lfo.disconnect();
          }
        }, 60);
      }
    }
  }
}
