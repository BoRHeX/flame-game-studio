const cue = (waveform, frequency, endFrequency, duration, gain, offsetSeconds = 0) =>
  Object.freeze({ waveform, frequency, endFrequency, duration, gain, offsetSeconds });

export const EVENT_CUES = Object.freeze({
  'footstep': cue('triangle', 145, 72, 0.075, 0.018),
  'ladder.step': cue('square', 520, 290, 0.055, 0.009),
  'inspect.raise': cue('sine', 620, 850, 0.12, 0.008),
  'valve.rotate': cue('triangle', 410, 190, 0.065, 0.014),
  'recoil': cue('triangle', 180, 48, 0.19, 0.025),
  'pilot.spark.begin': cue('square', 1900, 1250, 0.035, 0.008),
  'pilot.ignite': cue('sine', 420, 780, 0.16, 0.018),
  'main_flame.attach': cue('triangle', 115, 235, 0.28, 0.027),
  'combustion.puff': cue('sine', 125, 42, 0.24, 0.04),
  'chamber.overheat': cue('sawtooth', 660, 490, 0.45, 0.025),
  'mission.stable': cue('sine', 523, 784, 0.42, 0.022),
  'mission.fail': cue('triangle', 330, 165, 0.48, 0.024),
  'biome.wind_gust': cue('sine', 240, 110, 0.6, 0.009),
  'repair.complete': cue('triangle', 740, 980, 0.17, 0.015)
});

export function cueForEvent(name) {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(EVENT_CUES, name)
    ? { ...EVENT_CUES[name] }
    : null;
}
