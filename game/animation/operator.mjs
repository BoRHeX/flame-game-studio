const frame = (bob, leg, arm, lean, events = []) =>
  Object.freeze({bob, leg, arm, lean, events: Object.freeze(events)});

const clip = (loop, frames) => Object.freeze({
  fps: 18,
  loop,
  frames: Object.freeze(frames)
});

export const CLIPS = Object.freeze({
  idle: clip(true, [
    frame(0, 0, 0, 0),
    frame(-1, 0, 0, 0),
    frame(-1, 0, 1, 0),
    frame(0, 0, 1, 0),
    frame(0, 0, 0, 1),
    frame(1, 0, 0, 1),
    frame(0, 0, 0, 0),
    frame(0, 0, -1, 0)
  ]),
  walk: clip(true, [
    frame(0, 4, -3, 1, ['footstep']),
    frame(-1, 3, -2, 1),
    frame(-2, 1, -1, 0),
    frame(-1, -2, 2, 0),
    frame(0, -4, 3, 1, ['footstep']),
    frame(-1, -3, 2, 1),
    frame(-2, -1, 1, 0),
    frame(-1, 2, -2, 0)
  ]),
  climb: clip(true, [
    frame(0, 3, -4, 1, ['ladder.step']),
    frame(-1, 2, -3, 1),
    frame(-2, 0, -1, 2),
    frame(-3, -2, 2, 2),
    frame(-4, -3, 4, 1, ['ladder.step']),
    frame(-3, -2, 3, 1),
    frame(-2, 0, 1, 2),
    frame(-1, 2, -2, 2)
  ]),
  observe: clip(false, [
    frame(0, 0, 0, 0),
    frame(0, 0, -1, 1),
    frame(-1, 0, -3, 2, ['inspect.raise']),
    frame(-1, 0, -5, 3),
    frame(-1, 0, -6, 3),
    frame(0, 0, -6, 3)
  ]),
  valve: clip(true, [
    frame(0, 0, -2, 1),
    frame(-1, 0, -4, 2),
    frame(-1, 1, -5, 3, ['valve.rotate']),
    frame(0, 1, -3, 3),
    frame(1, 0, -1, 2),
    frame(0, -1, 1, 1),
    frame(-1, -1, 0, 1),
    frame(0, 0, -1, 1)
  ]),
  recoil: clip(false, [
    frame(0, 0, 0, 0),
    frame(1, -2, 3, -3, ['recoil']),
    frame(2, -4, 5, -6),
    frame(1, -3, 4, -5),
    frame(0, -2, 2, -3),
    frame(-1, -1, 1, -1),
    frame(0, 0, 0, 0)
  ])
});

function getClip(action) {
  return typeof action === 'string' && Object.prototype.hasOwnProperty.call(CLIPS, action)
    ? CLIPS[action] : CLIPS.idle;
}

function validTime(time) {
  return typeof time === 'number' && Number.isFinite(time) && time >= 0;
}

export function samplePose(action, time) {
  if (!validTime(time)) throw new RangeError('Invalid animation time');
  const c = getClip(action);
  const index = c.loop
    ? Math.floor((time % (c.frames.length / c.fps)) * c.fps) % c.frames.length
    : Math.min(Math.floor(time * c.fps), c.frames.length - 1);
  const f = c.frames[index];
  return {bob: f.bob, leg: f.leg, arm: f.arm, lean: f.lean, events: [...f.events]};
}

export function animationEvents(action, from, to) {
  if (!validTime(from) || !validTime(to) || to < from || to - from > 2) {
    throw new RangeError('Invalid animation event range');
  }
  const c = getClip(action);
  const result = [];
  if (from === to) return result;
  if (!c.loop) {
    for (let i = 0; i < c.frames.length; i++) {
      const time = i / c.fps;
      if (time > from && time <= to) {
        for (const name of c.frames[i].events) result.push({name, time});
      }
    }
    return result;
  }
  // Check a small fixed window, including one frame before the rounded start.
  // Computing marker times from absolute frame indices keeps split queries stable.
  const start = Math.max(0, Math.floor(from * c.fps) - 1);
  for (let offset = 0; offset <= 38; offset++) {
    const index = start + offset;
    const time = index / c.fps;
    if (time > to) break;
    if (time > from) {
      for (const name of c.frames[index % c.frames.length].events) {
        result.push({name, time});
      }
    }
  }
  return result;
}
