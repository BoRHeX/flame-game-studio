// Original procedural pixel art. Presentation and process modifiers are independent
// of scene geometry and the authoritative burner state.
const layer = (kind, speedX, speedY, color, spacing) =>
  Object.freeze({kind, speedX, speedY, color, spacing});
const biome = (weather, palette, layers) => Object.freeze({
  weather,
  palette: Object.freeze(palette),
  layers: Object.freeze(layers)
});

export const BIOMES = Object.freeze({
  hub: biome('dust', {
    sky:'#293d4b', haze:'#405462', shadow:'#26383d', trim:'#82918a', light:'#ffe1a0'
  }, [
    layer('roof', .08, .05, '#283842', 240),
    layer('windows', .20, .12, '#364d56', 190),
    layer('pipes', .36, .22, '#52656a', 280)
  ]),
  backyard: biome('wind', {
    sky:'#536774', haze:'#819096', shadow:'#344a4b', trim:'#a3a99a', light:'#ffe5a3'
  }, [
    layer('chimneys', .10, .06, '#45575b', 180),
    layer('sheds', .25, .14, '#596b69', 230),
    layer('fence', .42, .25, '#728078', 120)
  ]),
  warehouse: biome('dust', {
    sky:'#222d39', haze:'#394755', shadow:'#202e35', trim:'#84908a', light:'#c6b78c'
  }, [
    layer('trusses', .06, .04, '#263440', 250),
    layer('bays', .17, .10, '#3b4a51', 210),
    layer('ducts', .31, .19, '#58645f', 260)
  ]),
  'heat-hold': biome('haze', {
    sky:'#322f3d', haze:'#594c52', shadow:'#302e36', trim:'#a28d7b', light:'#ffd5a0'
  }, [
    layer('stacks', .09, .05, '#3b363e', 220),
    layer('vessels', .22, .13, '#56494a', 250),
    layer('coils', .38, .23, '#76625b', 180)
  ])
});

function checkedBiome(id, time) {
  if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(BIOMES, id))
    throw new RangeError('Unknown biome');
  if (typeof time !== 'number' || !Number.isFinite(time) || time < 0)
    throw new RangeError('Invalid environment time');
  return BIOMES[id];
}

// Consumers may use the returned wind as the deterministic gust signal. Event
// scheduling and audio are owned by the integrator, not this drawing module.
export function environmentAt(sceneId, time) {
  const b = checkedBiome(sceneId, time);
  if (sceneId === 'hub')
    return {wind:0, airflowFactor:1, draftFactor:1, heatLossFactor:1, weather:b.weather};
  if (sceneId === 'backyard') {
    // Both gust frequencies complete whole cycles over this common period.
    const phase = time % (200 * Math.PI);
    const wind = .35 + .22 * Math.sin(phase * .27) + .10 * Math.sin(phase * .71);
    return {wind, airflowFactor:1 + wind * .08, draftFactor:1 + wind * .10,
      heatLossFactor:1 + wind * .12, weather:b.weather};
  }
  if (sceneId === 'warehouse')
    return {wind:0, airflowFactor:.94, draftFactor:.88, heatLossFactor:.98, weather:b.weather};
  return {wind:.08, airflowFactor:1, draftFactor:1.02, heatLossFactor:1.12, weather:b.weather};
}

const mod = (n, m) => ((n % m) + m) % m;

// Protection is checked against the actual integer rectangle sent to Canvas.
function paint(ctx, color, x, y, w, h, protectedAreas) {
  x = Math.round(x); y = Math.round(y);
  w = Math.round(w); h = Math.round(h);
  if (w <= 0 || h <= 0) return;
  if (protectedAreas && protectedAreas.some(a =>
      x < a.x + a.w && x + w > a.x && y < a.y + a.h && y + h > a.y)) return;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function infrastructure(ctx, id, camera, b) {
  const w = camera.width, h = camera.height, p = b.palette;
  paint(ctx, p.sky, 0, 0, w, h);
  paint(ctx, p.haze, 0, h * .38, w, h * .62);
  if (id === 'backyard') {
    paint(ctx, '#c6b995', w * .73 - camera.x * .03, h * .10 - camera.y * .02, 58, 58);
    paint(ctx, p.haze, w * .71 - camera.x * .03, h * .15 - camera.y * .02, 78, 14);
  }
  for (let n = 0; n < b.layers.length; n++) {
    const l = b.layers[n];
    const offset = mod(camera.x * l.speedX, l.spacing);
    const base = h * (.42 + n * .14) - camera.y * l.speedY;
    const count = Math.ceil(w / l.spacing) + 3;
    for (let i = -1; i < count; i++) {
      const x = i * l.spacing - offset;
      const y = base - (mod(i, 3) * 25);
      if (id === 'backyard') {
        if (n === 0) {
          paint(ctx, l.color, x, y, 120, h - y + 200);
          paint(ctx, l.color, x + 30, y - 90, 24, 90);
          paint(ctx, p.trim, x + 26, y - 94, 32, 5);
          for (let k = 0; k < 4; k++) paint(ctx, p.haze, x + 12 + k * 25, y + 28, 9, 4);
        } else if (n === 1) {
          paint(ctx, l.color, x, y, 195, h - y + 200);
          paint(ctx, p.shadow, x - 5, y - 7, 205, 9);
          for (let k = 0; k < 4; k++) {
            paint(ctx, p.shadow, x + 16 + k * 42, y + 24, 28, 46);
            paint(ctx, p.trim, x + 20 + k * 42, y + 28, 20, 4);
          }
        } else {
          paint(ctx, l.color, x, y, 7, 125);
          paint(ctx, p.shadow, x, y + 22, l.spacing, 5);
          paint(ctx, p.shadow, x, y + 75, l.spacing, 5);
          for (let k = 0; k < 5; k++) paint(ctx, p.trim, x + 12 + k * 21, y + 24, 2, 50);
        }
      } else if (id === 'hub') {
        if (n === 0) {
          paint(ctx, l.color, x, y - 80, 220, 150);
          paint(ctx, p.trim, x + 8, y - 76, 180, 6);
          paint(ctx, p.shadow, x + 155, y - 130, 32, 55);
        } else if (n === 1) {
          paint(ctx, l.color, x, y, 175, 200);
          paint(ctx, p.shadow, x + 22, y + 22, 120, 92);
          paint(ctx, '#9c916f', x + 28, y + 28, 108, 80);
          paint(ctx, p.shadow, x + 78, y + 28, 7, 80);
          paint(ctx, p.shadow, x + 28, y + 65, 108, 6);
        } else {
          paint(ctx, l.color, x, y, 240, 20);
          paint(ctx, p.trim, x, y + 3, 240, 3);
          paint(ctx, l.color, x + 60, y - 75, 20, 90);
          paint(ctx, p.light, x + 130, y + 34, 20, 7);
          paint(ctx, 'rgba(255,211,137,0.08)', x + 110, y + 41, 60, 70);
        }
      } else if (id === 'warehouse') {
        if (n === 0) {
          paint(ctx, l.color, x, y - 100, 220, 18);
          paint(ctx, l.color, x + 15, y - 100, 12, 150);
          paint(ctx, p.trim, x + 20, y - 73, 120, 4);
          paint(ctx, p.shadow, x + 130, y - 94, 10, 85);
        } else if (n === 1) {
          paint(ctx, l.color, x, y, 190, 220);
          paint(ctx, p.shadow, x + 12, y + 14, 166, 150);
          for (let k = 0; k < 6; k++) paint(ctx, p.trim, x + 20, y + 28 + k * 20, 150, 3);
          paint(ctx, l.color, x + 90, y + 14, 6, 150);
        } else {
          paint(ctx, l.color, x, y, 230, 32);
          paint(ctx, p.trim, x, y + 4, 230, 4);
          paint(ctx, p.shadow, x + 80, y - 4, 12, 40);
          paint(ctx, l.color, x + 130, y + 30, 28, 120);
          paint(ctx, p.shadow, x + 124, y + 75, 40, 10);
        }
      } else {
        if (n === 0) {
          paint(ctx, l.color, x + 45, y - 125, 65, 210);
          paint(ctx, p.shadow, x + 37, y - 130, 82, 12);
          paint(ctx, p.trim, x + 52, y - 110, 6, 155);
        } else if (n === 1) {
          paint(ctx, p.shadow, x + 16, y - 25, 180, 220);
          paint(ctx, l.color, x + 23, y - 18, 166, 206);
          for (let k = 0; k < 4; k++) {
            paint(ctx, p.trim, x + 23, y + 12 + k * 44, 166, 5);
            paint(ctx, p.shadow, x + 35, y + 20 + k * 44, 5, 5);
          }
          paint(ctx, p.light, x + 84, y + 63, 38, 8);
        } else {
          paint(ctx, l.color, x, y, 150, 16);
          paint(ctx, l.color, x + 136, y, 14, 90);
          paint(ctx, l.color, x + 25, y + 75, 125, 15);
          paint(ctx, p.trim, x + 8, y + 3, 120, 3);
          paint(ctx, p.shadow, x + 56, y - 5, 9, 26);
        }
      }
    }
  }
}

function protectedRects(options) {
  if (options.protectedAreas === undefined) return [];
  if (!Array.isArray(options.protectedAreas)) throw new TypeError('Invalid protected areas');
  for (const a of options.protectedAreas) {
    if (!a || ![a.x, a.y, a.w, a.h].every(Number.isFinite) ||
        a.w < 0 || a.h < 0 || !Number.isFinite(a.x + a.w) || !Number.isFinite(a.y + a.h))
      throw new RangeError('Invalid protected area');
  }
  // Empty rectangles do not cover pixels. Keep the caller's array untouched.
  return options.protectedAreas.filter(a => a.w > 0 && a.h > 0);
}

function weather(ctx, id, camera, time, options, areas) {
  const w = camera.width, h = camera.height;
  if (w <= 0 || h <= 0) return;
  // Camera parallax remains active; all time-dependent motion and gust shape
  // are frozen at the same authored phase when reduced motion is requested.
  const t = options.reducedMotion ? 0 : time;
  const wind = id === 'backyard' ? environmentAt(id, t).wind : 0;
  const gust = wind > .48;
  const count = id === 'backyard' ? 36 : id === 'heat-hold' ? 24 : 20;
  // Reduce time before multiplying so even very large finite times stay finite.
  const drift = t % 1000000;
  for (let i = 0; i < count; i++) {
    const x = mod(i * 127 + drift * (id === 'backyard' ? 24 : 4) - camera.x * .2, w);
    const y = mod(i * 83 + drift * (id === 'backyard' ? 12 : -3) - camera.y * .1, h);
    if (id === 'backyard') {
      paint(ctx, 'rgba(218,224,207,0.35)', x, y, 12 + i % 9 + (gust ? 12 : 0), 2, areas);
      paint(ctx, 'rgba(218,224,207,0.22)', x + 5, y + 3, 5 + (gust ? 8 : 0), 2, areas);
      if (gust && i % 6 === 0)
        paint(ctx, 'rgba(235,235,215,0.32)', x + 16, y - 4, 24, 2, areas);
    } else if (id === 'heat-hold') {
      // Broken translucent bands suggest rising, refractive heater haze.
      paint(ctx, 'rgba(241,169,112,0.10)', x, y, 30 + i % 16, 8, areas);
      paint(ctx, 'rgba(255,210,160,0.10)', x + 5, y + 8, 20, 3, areas);
      paint(ctx, 'rgba(241,169,112,0.08)', x - 3, y + 11, 26, 5, areas);
    } else {
      // Individually lit motes read as dust in the two indoor spaces.
      paint(ctx, id === 'hub' ? 'rgba(255,220,158,0.28)' : 'rgba(184,196,190,0.22)',
        x, y, 2 + i % 2, 2 + i % 2, areas);
    }
  }
}

export function drawParallax(ctx, sceneId, camera, time, options = {}) {
  const b = checkedBiome(sceneId, time);
  if (!camera || ![camera.x, camera.y, camera.width, camera.height].every(Number.isFinite) ||
      camera.width < 0 || camera.height < 0) throw new RangeError('Invalid camera');
  if (!options || typeof options !== 'object') throw new TypeError('Invalid options');
  const areas = options.foreground ? protectedRects(options) : null;
  ctx.save();
  try {
    if (options.foreground) weather(ctx, sceneId, camera, time, options, areas);
    else infrastructure(ctx, sceneId, camera, b);
  } finally {
    ctx.restore();
  }
}

