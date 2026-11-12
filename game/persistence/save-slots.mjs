// ADR-0005 persistence boundary. No game, DOM, economy, or simulation mutation.
// Loads return a snapshot; listSlots returns metadata. Saves return {ok:true}
// when promotion is verified, {ok:false,error} before promotion, or
// {ok:true,committed:true,verified:false,error} when promotion succeeded but
// its subsequent read failed or mismatched. The latter must not be retried as
// an uncommitted write; reload and resolve the uncertainty instead.
// Autosave triggers and capturing/restoring authoritative state belong to main.mjs.
// Workshop task, asset, material, rate and proceeds contracts are not supplied.
// This module provides bounded time allowance only; it never awards proceeds.
// Integration must atomically persist approved credit and its checkpoint.
//
// Independent deterministic QA is still required: inject failures at stage
// write/read, backup write/read, promotion and post-promotion verification;
// check committed values and prior-save recovery. Check slot/autosave isolation,
// primary -> backup -> new-game recovery and list metadata; v0 migration, v1
// boundaries, future versions, plain data, timestamps and timezone bounds; clock
// reversal and caps with no proceeds; controlled Date/Intl behavior; and
// non-mutating round trips including optional fields. No tests ran here.

export const SAVE_SCHEMA_VERSION = 1;
export const SLOT_IDS = Object.freeze([1, 2, 3]);
export const MAX_OFFLINE_MS = 24 * 60 * 60 * 1000;
const PREFIX = 'ice.save.v1.';
const FIELDS = ['player', 'economy', 'progression', 'scene', 'controls', 'operator', 'workshop'];

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

// Reject values JSON would silently discard or change, including non-finite numbers.
function plain(value, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || seen.has(value)) return false;
  if (!Array.isArray(value) && !record(value)) return false;
  seen.add(value);
  const keys = Reflect.ownKeys(value);
  if (keys.some(key => typeof key !== 'string' ||
    (Array.isArray(value) && key !== 'length' && !/^(0|[1-9]\d*)$/.test(key)))) return false;
  for (const key of keys) {
    if (Array.isArray(value) && key === 'length') continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor) || !plain(descriptor.value, seen)) return false;
  }
  if (Array.isArray(value) && keys.length !== value.length + 1) return false;
  seen.delete(value);
  return true;
}

function canonicalUtc(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

export function deviceTime(now = Date.now()) {
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) throw new TypeError('invalid device time');
  let timezone = null;
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (_) { /* optional metadata */ }
  return { savedAtUtc: date.toISOString(), timezoneOffsetMinutes: date.getTimezoneOffset(), timezone };
}

export function newGameSnapshot() {
  return { schemaVersion: SAVE_SCHEMA_VERSION, ...deviceTime(), player: {}, economy: {},
    progression: {}, scene: {}, controls: {}, mission: null, operator: {}, workshop: {} };
}

// Version 0 is the explicitly supported legacy form: the same named fields with
// schemaVersion 0, optionally missing fields. No unversioned format is assumed.
export function migrateSnapshot(input) {
  if (!record(input) || !plain(input)) throw new TypeError('snapshot must be plain JSON data');
  const data = JSON.parse(JSON.stringify(input));
  if (data.schemaVersion === 0) {
    data.schemaVersion = 1;
    const metadata = deviceTime();
    if (data.savedAtUtc === undefined) data.savedAtUtc = metadata.savedAtUtc;
    if (data.timezoneOffsetMinutes === undefined) data.timezoneOffsetMinutes = metadata.timezoneOffsetMinutes;
    for (const field of FIELDS) if (data[field] === undefined) data[field] = {};
    if (data.mission === undefined) data.mission = null;
  }
  if (data.schemaVersion !== SAVE_SCHEMA_VERSION) throw new TypeError('unsupported schema version');
  if (!canonicalUtc(data.savedAtUtc) ||
      !Number.isInteger(data.timezoneOffsetMinutes) || Math.abs(data.timezoneOffsetMinutes) > 840) {
    throw new TypeError('invalid time metadata');
  }
  for (const field of FIELDS) if (!record(data[field])) throw new TypeError('invalid ' + field);
  if (data.mission !== null && !record(data.mission)) throw new TypeError('invalid mission');
  return data;
}

// Device time can be manipulated. The allowance is not an entitlement or payment.
// A backward clock grants nothing. Callers must use a persisted, monotonic
// checkpoint and never advance it backwards; discard excess time above the cap.
export function offlineWorkshopAllowance(checkpointUtc, now = Date.now(), capMs = MAX_OFFLINE_MS) {
  if (!canonicalUtc(checkpointUtc) || !Number.isFinite(now) || !Number.isFinite(new Date(now).getTime()) ||
      !Number.isFinite(capMs) || capMs < 0) throw new TypeError('invalid offline time');
  const previous = Date.parse(checkpointUtc);
  const elapsedMs = Math.min(Math.max(0, now - previous), Math.min(capMs, MAX_OFFLINE_MS));
  return { elapsedMs, checkpointUtc: new Date(Math.max(previous, now)).toISOString() };
}

function slotName(id) {
  if (!SLOT_IDS.includes(id)) throw new RangeError('slot id must be 1, 2, or 3');
  return 'slot.' + id;
}

function defaultStorage() {
  try { return globalThis.localStorage || null; } catch (_) { return null; }
}

function decode(raw, validator = null) {
  if (raw === null || raw === undefined) return null;
  const snapshot=migrateSnapshot(JSON.parse(raw));
  if(validator&&!validator(snapshot))throw new TypeError('invalid game state');
  return snapshot;
}

export class SaveStore {
  constructor(storage = defaultStorage(), validator = null) { this.storage = storage; this.validator=validator; }

  _read(name) {
    let primary = null, backup = null, primaryRaw = null, backupRaw = null;
    let primaryError = false, backupError = false;
    if (!this.storage) return { snapshot: newGameSnapshot(), source: 'new', unavailable: true };
    try {
      primaryRaw = this.storage.getItem(PREFIX + name);
      backupRaw = this.storage.getItem(PREFIX + name + '.backup');
    } catch (_) { return { snapshot: newGameSnapshot(), source: 'new', unavailable: true }; }
    try { primary = decode(primaryRaw,this.validator); } catch (_) { primaryError = true; }
    try { backup = decode(backupRaw,this.validator); } catch (_) { backupError = true; }
    if (primary) return { snapshot: primary, source: 'primary' };
    if (backup) return { snapshot: backup, source: 'backup', corrupt: primaryError };
    return { snapshot: newGameSnapshot(), source: 'new', corrupt: primaryError || backupError };
  }

  listSlots() {
    return SLOT_IDS.map(id => {
      const result = this._read(slotName(id));
      return { id, source: result.source, occupied: result.source !== 'new',
        corrupt: !!result.corrupt, unavailable: !!result.unavailable,
        savedAtUtc: result.source === 'new' ? null : result.snapshot.savedAtUtc,
        sceneId: result.source === 'new' ? null : result.snapshot.scene?.id??null,
        funds: result.source === 'new' ? null : result.snapshot.economy?.funds??null };
    });
  }

  loadSlot(id) { return this._read(slotName(id)).snapshot; }
  loadAutosave() { return this._read('autosave').snapshot; }
  readAutosave() { return this._read('autosave'); }

  _save(name, snapshot) {
    if (!this.storage) return { ok: false, error: 'storage unavailable' };
    const key = PREFIX + name;
    const stage = key + '.stage';
    let staged;
    try {
      // Metadata describes the actual write, not the caller's stale capture time.
      const candidate = migrateSnapshot(snapshot);
      if(this.validator&&!this.validator(candidate))throw new TypeError('invalid game state');
      Object.assign(candidate, deviceTime());
      const encoded = JSON.stringify(candidate);
      this.storage.setItem(stage, encoded);
      staged = this.storage.getItem(stage);
      if (staged !== encoded) throw new Error('staging verification failed');
      decode(staged,this.validator);
      const old = this.storage.getItem(key);
      if (old !== null) {
        // Never replace a valid backup with corrupt or unsupported primary data.
        let valid = false;
        try { valid = !!decode(old,this.validator); } catch (_) { /* retain existing backup */ }
        if (valid) {
          this.storage.setItem(key + '.backup', old);
          if (this.storage.getItem(key + '.backup') !== old) throw new Error('backup verification failed');
        } else {
          // Preserve unknown future versions instead of silently overwriting them.
          try {
            const parsed = JSON.parse(old);
            if (record(parsed) && Number.isInteger(parsed.schemaVersion) && parsed.schemaVersion > SAVE_SCHEMA_VERSION)
              throw new Error('newer save version');
          } catch (error) { if (error.message === 'newer save version') throw error; }
        }
      }
      // localStorage setItem replaces one key atomically; staging is never loaded
      // as committed data. A failed promotion leaves the previous primary intact.
      this.storage.setItem(key, staged);
    } catch (error) {
      return { ok: false, error: error && error.message ? String(error.message) : 'save failed' };
    }
    // Successful setItem is the commit point. A failed read cannot undo it or
    // establish the current value, so report commitment and uncertainty together.
    try {
      if (this.storage.getItem(key) !== staged) throw new Error('promotion verification failed');
    } catch (error) {
      return { ok: true, committed: true, verified: false,
        error: error && error.message ? String(error.message) : 'promotion verification failed' };
    }
    try { this.storage.removeItem(stage); } catch (_) { /* committed; stale stage is ignored */ }
    return { ok: true };
  }

  saveSlot(id, snapshot) { return this._save(slotName(id), snapshot); }
  saveAutosave(snapshot) { return this._save('autosave', snapshot); }
}

export function createSaveStore(storage) { return new SaveStore(storage); }

