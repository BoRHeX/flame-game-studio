// Player coordinates are top-left world pixels; platform collision is one-way.
const WIDTH = 28;
const HEIGHT = 52;
const RUN_SPEED = 210;
const CLIMB_SPEED = 160;
const GRAVITY = 1100;
const JUMP_SPEED = 420;
const MAX_STEP = 1 / 120;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export class PlatformPlayer {
  constructor(scene) {
    this.setScene(scene);
  }

  setScene(scene) {
    this.state = {
      x: scene.spawn.x, y: scene.spawn.y, w: WIDTH, h: HEIGHT,
      vx: 0, vy: 0, grounded: false, climbing: false,
      facing: 1, walkPhase: 0
    };
    this._jumpHeld = false;
    this._ladder = null;
  }

  update(dt, input, scene) {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('invalid timestep');
    if (dt === 0) return this.state;

    const s = this.state;
    const horizontal = Number.isFinite(input?.x) ? clamp(input.x, -1, 1) : 0;
    const vertical = Number.isFinite(input?.y) ? clamp(input.y, -1, 1) : 0;
    const jump = Boolean(input?.jump);
    let jumpPressed = jump && !this._jumpHeld;
    this._jumpHeld = jump;

    // Subdivision prevents tunnelling while the caller owns the fixed-step clock.
    let remaining = dt;
    while (remaining > 0) {
      const step = Math.min(remaining, MAX_STEP);
      remaining -= step;
      const feet = s.y + s.h;
      const center = s.x + s.w / 2;
      if (horizontal) s.facing = Math.sign(horizontal);

      let ladder = s.climbing ? this._ladder : null;
      if (ladder && !scene.ladders.includes(ladder)) ladder = null;
      if (!ladder && vertical !== 0 && !jumpPressed) {
        ladder = scene.ladders.find(l =>
          center >= l.x && center <= l.x + l.w &&
          feet >= l.y && s.y <= l.y + l.h &&
          !(vertical < 0 && feet <= l.y) &&
          !(vertical > 0 && feet >= l.y + l.h)
        ) || null;
        if (ladder) {
          s.climbing = true;
          s.grounded = false;
          s.vy = 0;
        }
      }
      this._ladder = ladder;

      if (s.climbing && !ladder) s.climbing = false;
      if (s.climbing && jumpPressed) {
        s.climbing = false;
        this._ladder = null;
        s.vy = -JUMP_SPEED;
      } else if (s.climbing && horizontal !== 0) {
        // Walking off a ladder is a physical dismount, not a position snap.
        s.climbing = false;
        this._ladder = null;
        s.vy = 0;
      } else if (s.climbing) {
        s.vx = 0;
        s.vy = vertical * CLIMB_SPEED;
        s.y = clamp(s.y + s.vy * step, ladder.y - s.h, ladder.y + ladder.h - s.h);
        if ((vertical < 0 && s.y === ladder.y - s.h) ||
            (vertical > 0 && s.y === ladder.y + ladder.h - s.h)) s.vy = 0;
        if (vertical) s.walkPhase += Math.abs(vertical) * step * 9;
      }

      if (!s.climbing) {
        if (jumpPressed && s.grounded) {
          s.vy = -JUMP_SPEED;
          s.grounded = false;
        }
        s.vx = horizontal * RUN_SPEED;
        s.x = clamp(s.x + s.vx * step, 0, Math.max(0, scene.width - s.w));
        const oldFeet = s.y + s.h;
        s.vy += GRAVITY * step;
        let nextY = s.y + s.vy * step;
        s.grounded = false;
        if (s.vy >= 0) {
          let landing = Infinity;
          for (const platform of scene.platforms) {
            if (s.x + s.w > platform.x && s.x < platform.x + platform.w &&
                oldFeet <= platform.y && nextY + s.h >= platform.y && platform.y < landing) {
              landing = platform.y;
            }
          }
          if (landing !== Infinity) {
            nextY = landing - s.h;
            s.vy = 0;
            s.grounded = true;
          }
        }
        if (nextY < 0) {
          nextY = 0;
          if (s.vy < 0) s.vy = 0;
        }
        const bottom = Math.max(0, scene.height - s.h);
        if (nextY >= bottom) {
          nextY = bottom;
          if (s.vy > 0) s.vy = 0;
          s.grounded = true;
        }
        s.y = nextY;
        if (horizontal && s.grounded) s.walkPhase += Math.abs(horizontal) * step * 9;
      }
      jumpPressed = false;
    }
    return s;
  }

  restorePosition(position,scene){
    if(!Number.isFinite(position?.x)||!Number.isFinite(position?.y))return false;
    const s=this.state;s.x=clamp(position.x,0,scene.width-s.w);s.y=clamp(position.y,0,scene.height-s.h);s.vx=0;s.vy=0;s.facing=position.facing===-1?-1:1;
    this._ladder=position.climbing===true?scene.ladders.find(l=>s.x+s.w/2>=l.x&&s.x+s.w/2<=l.x+l.w&&s.y+s.h>=l.y&&s.y<=l.y+l.h)??null:null;
    s.climbing=!!this._ladder;s.grounded=!s.climbing&&scene.platforms.some(p=>Math.abs(s.y+s.h-p.y)<4&&s.x+s.w>p.x&&s.x<p.x+p.w);this._jumpHeld=false;return true;
  }

  camera(scene, viewport) {
    const s = this.state;
    return {
      x: clamp(s.x + s.w / 2 - viewport.width / 2, 0, Math.max(0, scene.width - viewport.width)),
      y: clamp(s.y + s.h / 2 - viewport.height / 2, 0, Math.max(0, scene.height - viewport.height)),
      width: viewport.width,
      height: viewport.height
    };
  }

  nearby(scene, radius = 112) {
    if (!Number.isFinite(radius) || radius < 0) return null;
    const x = this.state.x + this.state.w / 2;
    const y = this.state.y + this.state.h / 2;
    let closest = null;
    let best = radius * radius;
    for (const interaction of scene.interactions) {
      const dx = interaction.x - x;
      const dy = interaction.y - y;
      const distance = dx * dx + dy * dy;
      if (distance <= best && (closest === null || distance < best)) {
        closest = interaction;
        best = distance;
      }
    }
    return closest;
  }
}

