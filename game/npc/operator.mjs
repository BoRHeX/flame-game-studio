// ADR-0005 operator decision interface. This module never operates equipment,
// advances clocks, spends cash, or changes mission state. Direct player controls
// must remain available regardless of the result of a request.
//
// Integration gap: ADR-0005 does not specify command type names, role/authority
// vocabulary, or an effect schema. The local vocabulary below is provisional:
// main and mission owners must review it before connecting operator requests.
// No effect is emitted until an authoritative effect contract is agreed.
//
// Recovery: move within 112 world pixels, provide the operator role and operate
// authority, correct the command/job, or retry when available. A busy operator
// gives at most three consecutive deferrals for the same request; the next busy
// response is a refusal. The player can operate equipment directly at any time.
// Retry times use context.elapsed, in mission-clock seconds. Without a valid
// elapsed value retryAt is null; the caller can retry on the next update.

const DEVICES = new Set(['pilotFuel', 'pilotAir', 'mainFuel', 'mainAir', 'draft']);
const STATES = new Set(['idle', 'accepted', 'refused', 'deferred']);
const MAX_DEFERRALS = 3;
const RETRY_SECONDS = 1;

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export class OperatorAI {
  constructor() {
    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.pendingId = null;
    this.deferrals = 0;
  }

  request(command, context = {}) {
    const c = record(command) ? command : {};
    const ctx = record(context) ? context : {};
    const respond = (status, reason, cue, retryAt = null) => {
      this.state = status;
      if (status !== 'deferred') {
        this.pendingId = null;
        this.deferrals = 0;
      }
      return {status, reason, retryAt, cue};
    };

    if (typeof c.id !== 'string' || !c.id || c.id.length > 128 ||
        (c.type !== 'setDevice' && c.type !== 'ignite')) {
      return respond('refused', 'unsupported-command', 'refuse');
    }
    if (c.type === 'setDevice' &&
        (!DEVICES.has(c.deviceId) || typeof c.value !== 'number' ||
         !Number.isFinite(c.value) || c.value < 0 || c.value > 1)) {
      return respond('refused', 'invalid-device-command', 'refuse');
    }
    if (c.jobId !== undefined &&
        (typeof c.jobId !== 'string' || c.jobId !== ctx.jobId)) {
      return respond('refused', 'job-mismatch', 'refuse');
    }
    if (ctx.missionStatus !== undefined && ctx.missionStatus !== 'active') {
      return respond('refused', 'mission-inactive', 'refuse');
    }
    if (typeof ctx.distancePx !== 'number' || !Number.isFinite(ctx.distancePx) ||
        ctx.distancePx < 0 || ctx.distancePx > 112) {
      return respond('refused', 'out-of-range', 'approach');
    }
    if (ctx.actorRole !== 'operator') {
      return respond('refused', 'wrong-role', 'refuse');
    }
    if (!Array.isArray(ctx.authority) || !ctx.authority.includes('operate')) {
      return respond('refused', 'insufficient-authority', 'refuse');
    }
    if (ctx.available === false) {
      if (this.pendingId !== c.id) {
        this.pendingId = c.id;
        this.deferrals = 0;
      }
      if (this.deferrals >= MAX_DEFERRALS) {
        return respond('refused', 'unavailable', 'manual');
      }
      this.deferrals += 1;
      const elapsed = ctx.elapsed;
      const retryAt = typeof elapsed === 'number' && Number.isFinite(elapsed) &&
        elapsed >= 0 && Number.isFinite(elapsed + RETRY_SECONDS)
        ? elapsed + RETRY_SECONDS : null;
      return respond('deferred', 'unavailable', 'wait', retryAt);
    }
    return respond('accepted', 'permitted', 'acknowledge');
  }

  snapshot() {
    // Pending requests and retry counters are transient, never persisted.
    return {version: 1, flags: {}, state: STATES.has(this.state) ? this.state : 'idle'};
  }

  restore(data) {
    // State is informational only: restored terminal outcomes do not block a
    // new request. Unknown versions and malformed values normalize to idle.
    this.reset();
    if (record(data) && data.version === 1 && STATES.has(data.state)) {
      this.state = data.state;
    }
    return this.snapshot();
  }
}
