// Modelo de simulación: terreno ilustrativo, cámaras y autómata celular de propagación del fuego. Sin DOM.
"use strict";
// ---------- Constantes del modelo ----------
const W = 90, H = 60, N = W * H;          // grilla 90 x 60
const CELL_HA = 4;                         // 200 m x 200 m
const STEP_MIN = 10;                       // cada paso = 10 minutos
const MAX_STEPS = 72 * 60 / STEP_MIN;      // simulamos hasta 72 h

const WATER = 0, ROCK = 1, NATIVE = 2, PINE = 3, SHRUB = 4, MALLIN = 5, TOWN = 6;
const TYPE_NAME = ['Agua', 'Roca / alta montaña', 'Bosque nativo', 'Plantación de pino', 'Matorral', 'Mallín (húmedo)', 'Zona urbana / interfaz'];
const FUEL = [0, 0, 1.0, 1.4, 1.1, 0.35, 0.85];   // inflamabilidad relativa
const BURN = [0, 0, 3, 4, 2, 2, 4];                // pasos que arde cada celda
const HOMES_PER_CELL = 5;

const MODEL = {
  P0: 0.13,                        // probabilidad base de contagio por paso
  DRY: [0.45, 0.65, 0.85, 1.0, 1.2],
  WK: 0.9,                         // peso del viento
  SK: 6,                           // peso de la pendiente
  SPOT: 0.02,                      // probabilidad base de pavesas (con viento >= 25 km/h)
  CAM_R: 16,                       // radio de cámara (celdas = 3,2 km)
  CAM_DELAY: 10,                   // min: IA detecta + operador confirma
  SAT_EVERY: 180,                  // min entre pasadas satelitales útiles
  SAT_MIN_HA: 16,                  // tamaño mínimo para el satélite
  HUMAN_HA: 160,                   // columna de humo visible desde todos lados
  HUMAN_BASE: 30, HUMAN_PER_CELL: 6, HUMAN_MAX: 240,
  CAP0: 5, CAP_GROW: 2, CAP_MAX: 16, // celdas de frente apagadas por paso
  FA_REVIEW: 2,                    // min extra de revisión por cada falsa alarma diaria
  FA_BUSY: 90,                     // min que una falsa alarma tiene ocupada a la brigada
  FA_WAIT: 60                      // min de demora si la brigada está ocupada
};
// Demora (min) que agregan las falsas alarmas: más alertas para revisar y chance de que
// la brigada esté atendiendo una falsa cuando llega la verdadera (valor esperado).
function falseAlarmDelays(fa) {
  const pBusy = 1 - Math.exp(-fa * MODEL.FA_BUSY / 1440);
  return { review: MODEL.FA_REVIEW * fa, busy: Math.round(pBusy * MODEL.FA_WAIT), pBusy };
}

const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, 1, 1, 1, 0, -1, -1, -1];
const DUX = DX.map((x, d) => x / Math.hypot(x, DY[d])), DUY = DY.map((y, d) => y / Math.hypot(DX[d], y));
const WIND_DIRS = { O: [1, 0], NO: [Math.SQRT1_2, Math.SQRT1_2], N: [0, 1], S: [0, -1], E: [-1, 0] };

// ---------- Azar determinístico (mismo azar en ambos escenarios) ----------
function hash3(a, b, c) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x5bd1e995, 0x165667b1) ^ Math.imul((c | 0) + 0x1b873593, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function valueNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = t => t * t * (3 - 2 * t);
  const a = hash3(xi, yi, seed), b = hash3(xi + 1, yi, seed), c = hash3(xi, yi + 1, seed), d = hash3(xi + 1, yi + 1, seed);
  const u = s(xf), v = s(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, seed) {
  let v = 0, amp = 0.5, f = 1, tot = 0;
  for (let o = 0; o < 4; o++) { v += amp * valueNoise(x * f, y * f, seed + o * 17); tot += amp; amp *= 0.5; f *= 2; }
  return v / tot;
}

// ---------- Terreno ilustrativo ----------
const type = new Uint8Array(N), elev = new Float32Array(N);
const riverX = y => Math.round(W * (0.58 + 0.05 * Math.sin(y / H * 5)));
const TOWNS = [{ x: 0.68 * W, y: 0.36 * H, rx: 6.5, ry: 5, name: 'Pueblo' }, { x: 0.74 * W, y: 0.8 * H, rx: 4.5, ry: 3.5, name: 'Paraje' }];
const LAKE = { x: 0.27 * W, y: 0.78 * H, rx: 0.13 * W, ry: 0.13 * H };
(function buildTerrain() {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, nx = x / W;
    const valley = Math.abs(x - riverX(y)) / W;
    let e = 0.22 + valley * 1.25 + (fbm(x / 14, y / 14, 11) - 0.5) * 0.55;
    if (x < riverX(y)) e += valley * 0.35;            // la cordillera, más alta al oeste
    elev[i] = Math.max(0, Math.min(1, e));
    let t = NATIVE;
    if (elev[i] > 0.9) t = ROCK;
    else if (elev[i] > 0.78) t = SHRUB;                // altoandino
    else if (nx > 0.72 && fbm(x / 9, y / 9, 41) > 0.52) t = SHRUB; // estepa/matorral al este
    else if (valley < 0.07 && fbm(x / 6, y / 6, 23) > 0.56) t = MALLIN;
    if ((t === NATIVE || t === SHRUB) && elev[i] > 0.28 && elev[i] < 0.72 && fbm(x / 7, y / 7, 31) > 0.62) t = PINE;
    // lago
    const dl = ((x - LAKE.x) / LAKE.rx) ** 2 + ((y - LAKE.y) / LAKE.ry) ** 2 + (fbm(x / 5, y / 5, 51) - 0.5) * 0.7;
    if (dl < 1) { t = WATER; elev[i] = 0.12; }
    for (const tw of TOWNS) if (((x - tw.x) / tw.rx) ** 2 + ((y - tw.y) / tw.ry) ** 2 + (fbm(x / 3, y / 3, 61) - 0.5) * 0.5 < 1) t = TOWN;
    type[i] = t;
  }
  // río principal (sur → norte) y arroyo desde el lago
  for (let y = 0; y < H; y++) {
    const x0 = riverX(y), x1 = y + 1 < H ? riverX(y + 1) : x0;
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { type[y * W + x] = WATER; }
  }
  const ly = Math.round(LAKE.y);
  for (let x = Math.round(LAKE.x); x < riverX(ly); x++) {
    const yy = ly + Math.round(Math.sin(x / 4) * 1.2);
    if (type[yy * W + x] !== WATER) type[yy * W + x] = WATER;
    const yy2 = ly + Math.round(Math.sin((x + 1) / 4) * 1.2);
    for (let y = Math.min(yy, yy2); y <= Math.max(yy, yy2); y++) type[y * W + x] = WATER;
  }
})();

// distancia (en celdas) a la zona poblada más cercana — BFS
const distTown = new Int16Array(N).fill(-1);
(function () {
  let q = [];
  for (let i = 0; i < N; i++) if (type[i] === TOWN) { distTown[i] = 0; q.push(i); }
  while (q.length) {
    const nq = [];
    for (const i of q) {
      const x = i % W, y = (i / W) | 0;
      for (let d = 0; d < 8; d++) {
        const xx = x + DX[d], yy = y + DY[d];
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (distTown[j] < 0) { distTown[j] = distTown[i] + 1; nq.push(j); }
      }
    }
    q = nq;
  }
})();

// ---------- Ubicación de cámaras: cimas que más bosque ven (greedy) ----------
const CAMS = (function () {
  const R = MODEL.CAM_R, R2 = R * R, covered = new Uint8Array(N), out = [];
  const cands = [];
  for (let y = 2; y < H - 2; y += 2) for (let x = 2; x < W - 2; x += 2) {
    const i = y * W + x;
    if (type[i] !== WATER && type[i] !== TOWN && elev[i] > 0.45) cands.push(i);
  }
  for (let k = 0; k < 12; k++) {
    let best = -1, bestGain = -1;
    for (const c of cands) {
      const cx = c % W, cy = (c / W) | 0;
      let gain = 0;
      for (let y = Math.max(0, cy - R); y <= Math.min(H - 1, cy + R); y++)
        for (let x = Math.max(0, cx - R); x <= Math.min(W - 1, cx + R); x++) {
          const j = y * W + x;
          if (!covered[j] && FUEL[type[j]] > 0 && (x - cx) ** 2 + (y - cy) ** 2 <= R2) gain++;
        }
      gain += elev[c] * 5; // desempata hacia las cimas
      if (gain > bestGain) { bestGain = gain; best = c; }
    }
    out.push({ x: best % W, y: (best / W) | 0 });
    const cx = best % W, cy = (best / W) | 0;
    for (let y = Math.max(0, cy - R); y <= Math.min(H - 1, cy + R); y++)
      for (let x = Math.max(0, cx - R); x <= Math.min(W - 1, cx + R); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= R2) covered[y * W + x] = 1;
  }
  return out;
})();
function cameraFor(i, nCams) {
  const x = i % W, y = (i / W) | 0;
  for (let k = 0; k < nCams; k++) if ((x - CAMS[k].x) ** 2 + (y - CAMS[k].y) ** 2 <= MODEL.CAM_R ** 2) return k;
  return -1;
}

// ---------- Simulación ----------
function newSim(params, ai, ign) {
  const s = {
    p: params, ai, ign, t: 0,
    state: new Uint8Array(N),      // 0 sin quemar, 1 ardiendo, 2 quemado, 3 apagado por brigada
    rem: new Uint8Array(N),
    burning: [ign], burned: 1, homes: type[ign] === TOWN ? HOMES_PER_CELL : 0,
    detectedAt: -1, detectBy: '', camIdx: -1, arriveAt: -1, ended: false, endReason: '', endT: -1,
    cam: ai ? cameraFor(ign, params.cams) : -1,
    satPhase: 20 + Math.floor(hash3(ign, 3, 77) * MODEL.SAT_EVERY),
    humanDelay: Math.min(MODEL.HUMAN_MAX, MODEL.HUMAN_BASE + MODEL.HUMAN_PER_CELL * Math.max(0, distTown[ign]))
  };
  s.state[ign] = 1; s.rem[ign] = BURN[type[ign]];
  s.fa = falseAlarmDelays(params.fa || 0);
  s.hist = [CELL_HA];
  const wd = WIND_DIRS[params.windDir] || WIND_DIRS.O;
  s.wx = wd[0]; s.wy = wd[1];
  return s;
}

function spreadP(s, i, j, d) {
  const P = s.p;
  const cos = DUX[d] * s.wx + DUY[d] * s.wy;
  const wf = Math.exp(MODEL.WK * (P.wind / 30) * cos);
  const sf = Math.exp(MODEL.SK * (elev[j] - elev[i]));
  const diag = (d & 1) ? 0.75 : 1;
  return Math.min(0.95, MODEL.P0 * FUEL[type[j]] * MODEL.DRY[P.dry - 1] * wf * sf * diag);
}

function hasFuelNeighbor(s, i) {
  const x = i % W, y = (i / W) | 0;
  for (let d = 0; d < 8; d++) {
    const xx = x + DX[d], yy = y + DY[d];
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    const j = yy * W + xx;
    if (s.state[j] === 0 && FUEL[type[j]] > 0) return true;
  }
  return false;
}

function ignite(s, j) {
  s.state[j] = 1; s.rem[j] = BURN[type[j]]; s.burned++;
  if (type[j] === TOWN) s.homes += HOMES_PER_CELL;
}

function stepSim(s) {
  if (s.ended) return;
  s.t++;
  const P = s.p, tmin = s.t * STEP_MIN;

  // 1) Detección
  if (s.detectedAt < 0) {
    const ha = s.burned * CELL_HA;
    let by = '', extra = 0;
    if (s.ai) {
      if (s.cam >= 0 && tmin >= MODEL.CAM_DELAY + s.fa.review) { by = 'Cámara ' + (s.cam + 1) + ' con IA'; s.camIdx = s.cam; extra = s.fa.busy; }
      else if (ha >= MODEL.SAT_MIN_HA && tmin >= s.satPhase &&
        Math.floor((tmin - s.satPhase) / MODEL.SAT_EVERY) !== Math.floor((tmin - STEP_MIN - s.satPhase) / MODEL.SAT_EVERY)) { by = 'Satélite (foco de calor)'; extra = s.fa.busy; }
    }
    if (!by && (tmin >= s.humanDelay || ha >= MODEL.HUMAN_HA)) by = ha >= MODEL.HUMAN_HA ? 'Columna de humo visible' : 'Aviso de vecinos';
    if (by) { s.detectedAt = s.t; s.detectBy = by; s.faExtra = extra; s.arriveAt = s.t + Math.round((P.resp + extra) / STEP_MIN); }
  }

  // 2) Combate: la brigada apaga celdas del frente
  if (s.arriveAt >= 0 && s.t >= s.arriveAt) {
    const hrs = (s.t - s.arriveAt) * STEP_MIN / 60;
    let cap = Math.min(MODEL.CAP_MAX, MODEL.CAP0 + Math.floor(hrs * MODEL.CAP_GROW));
    cap = Math.max(1, Math.round(cap * (1 - P.wind / 140)));
    const front = [];
    for (const i of s.burning) if (s.state[i] === 1 && hasFuelNeighbor(s, i)) front.push(i);
    front.sort((a, b) => hash3(a, s.t, 5) - hash3(b, s.t, 5));
    for (let k = 0; k < cap && k < front.length; k++) { s.state[front[k]] = 3; s.rem[front[k]] = 0; }
  }

  // 3) Propagación
  const next = [], newly = [];
  const spotP = P.wind >= 25 ? MODEL.SPOT * (P.wind / 40) ** 2 * MODEL.DRY[P.dry - 1] : 0;
  for (const i of s.burning) {
    if (s.state[i] !== 1) continue;
    const x = i % W, y = (i / W) | 0;
    for (let d = 0; d < 8; d++) {
      const xx = x + DX[d], yy = y + DY[d];
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const j = yy * W + xx;
      if (s.state[j] !== 0 || FUEL[type[j]] === 0) continue;
      if (hash3(j, s.t, d + 11) < spreadP(s, i, j, d)) { ignite(s, j); newly.push(j); }
    }
    // pavesas: brasas que vuelan con el viento
    if (spotP > 0 && (type[i] === PINE || type[i] === NATIVE) && hash3(i, s.t, 99) < spotP * FUEL[type[i]]) {
      const dist = 2 + Math.floor(hash3(i, s.t, 98) * 4);
      const jit = (hash3(i, s.t, 97) - 0.5) * 0.8;
      const ang = Math.atan2(s.wy, s.wx) + jit;
      const xx = Math.round(x + Math.cos(ang) * dist), yy = Math.round(y + Math.sin(ang) * dist);
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) {
        const j = yy * W + xx;
        if (s.state[j] === 0 && FUEL[type[j]] > 0 && hash3(j, s.t, 96) < FUEL[type[j]] * 0.6) { ignite(s, j); newly.push(j); }
      }
    }
    if (--s.rem[i] === 0) s.state[i] = 2; else next.push(i);
  }
  for (const j of newly) next.push(j);
  s.burning = next;
  s.hist.push(s.burned * CELL_HA);

  if (s.burning.length === 0) {
    s.ended = true; s.endT = s.t;
    s.endReason = s.arriveAt >= 0 && s.t >= s.arriveAt ? 'Controlado' : 'Se apagó solo';
  } else if (s.t >= MAX_STEPS) {
    s.ended = true; s.endT = s.t; s.endReason = 'Sigue activo a las 72 h';
  }
}

function runHeadless(params, ai, ign) {
  const s = newSim(params, ai, ign);
  while (!s.ended) stepSim(s);
  return s;
}

// focos de prueba para la proyección (siempre los mismos)
const MC_IGNITIONS = (function () {
  const out = [];
  for (let k = 0; out.length < 30 && k < 5000; k++) {
    const i = Math.floor(hash3(k, 7, 3) * N);
    if (FUEL[type[i]] > 0 && type[i] !== TOWN) out.push(i);
  }
  return out;
})();
