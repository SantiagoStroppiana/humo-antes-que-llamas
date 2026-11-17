"use strict";
// Colores del terreno, estado de la simulación visible y dibujo de los dos visores.
// ---------- Colores del mapa ----------
const BASE_RGB = [[86, 146, 190], [158, 152, 146], [54, 112, 62], [28, 80, 58], [140, 146, 78], [150, 188, 108], [214, 198, 166]];
const baseColor = new Uint8ClampedArray(N * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, c = BASE_RGB[type[i]];
  const a = elev[Math.max(0, y - 1) * W + Math.max(0, x - 1)], b = elev[Math.min(H - 1, y + 1) * W + Math.min(W - 1, x + 1)];
  let shade = 1 + Math.max(-0.25, Math.min(0.25, (a - b) * 2.2));
  if (type[i] === WATER) shade = 1;
  let r = c[0] * shade, g = c[1] * shade, bl = c[2] * shade;
  if (type[i] === TOWN && (x + y) % 2 === 0) { r = 176; g = 116; bl = 92; }   // techos
  const n = (hash3(i, 1, 1) - 0.5) * 10;
  baseColor[i * 3] = r + n; baseColor[i * 3 + 1] = g + n; baseColor[i * 3 + 2] = bl + n;
}
$('mapLegend').innerHTML = [
  [BASE_RGB[NATIVE], 'Bosque nativo'], [BASE_RGB[PINE], 'Pino implantado'], [BASE_RGB[SHRUB], 'Matorral'], [BASE_RGB[MALLIN], 'Mallín'],
  [BASE_RGB[TOWN], 'Casas (interfaz)'], [BASE_RGB[WATER], 'Agua'], [BASE_RGB[ROCK], 'Roca'],
  [[255, 150, 30], 'Ardiendo'], [[48, 38, 34], 'Quemado'], [[96, 112, 150], 'Apagado por brigada']
].map(([c, t]) => `<span><i style="background:rgb(${c})"></i>${t}</span>`).join('') +
  '<span>Cámara y su radio de visión (solo en «Con IA»)</span>';

// ---------- Estado de la simulación visible ----------
let ignition = 0, simNo, simAi, running = false, frameN = 0;
function pickDefaultIgnition() {
  // foco demostrativo elegido de antemano: bosque nativo a ~1,8 km de las casas, al alcance de una cámara
  if (type[DEMO_IGN] === NATIVE || type[DEMO_IGN] === PINE) return DEMO_IGN;
  let best = -1, bd = 1e9;
  const tx = Math.round(TOWNS[0].x - 14), ty = Math.round(TOWNS[0].y + 3);
  for (let i = 0; i < N; i++) {
    if (type[i] !== NATIVE && type[i] !== PINE) continue;
    const d = (i % W - tx) ** 2 + (((i / W) | 0) - ty) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
function resetSims() {
  simNo = newSim({ ...params }, false, ignition);
  simAi = newSim({ ...params }, true, ignition);
  evReset();
  running = false;
  $('btnPlay').textContent = '▶ Iniciar';
  $('summary').innerHTML = 'Apretá <b>▶ Iniciar</b> para ver qué pasa.';
  logged = false;
  drawAll(); updateStats(); drawLive();
}
let logged = false, runCount = 0;
const runHistory = [];

// ---------- Dibujo ----------
const views = [
  { cv: $('mapNo'), off: document.createElement('canvas'), ai: false },
  { cv: $('mapAi'), off: document.createElement('canvas'), ai: true }
];
for (const v of views) { v.off.width = W; v.off.height = H; v.octx = v.off.getContext('2d'); v.img = v.octx.createImageData(W, H); }

function sizeCanvas(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = Math.round(w * 2 / 3);
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  return dpr;
}
function drawMap(v, s) {
  const d = v.img.data;
  for (let i = 0; i < N; i++) {
    const st = s.state[i], o = i * 4;
    if (st === 1) { const f = hash3(i, frameN >> 2, 1); d[o] = 255; d[o + 1] = 90 + f * 130; d[o + 2] = 20 + f * 30; }
    else if (st === 2) { const n = hash3(i, 2, 2) * 14; d[o] = 44 + n; d[o + 1] = 35 + n; d[o + 2] = 31 + n; }
    else if (st === 3) { d[o] = 96; d[o + 1] = 112; d[o + 2] = 150; }
    else { d[o] = baseColor[i * 3]; d[o + 1] = baseColor[i * 3 + 1]; d[o + 2] = baseColor[i * 3 + 2]; }
    d[o + 3] = 255;
  }
  v.octx.putImageData(v.img, 0, 0);
  const dpr = sizeCanvas(v.cv), ctx = v.cv.getContext('2d'), cw = v.cv.width, ch = v.cv.height, sx = cw / W, sy = ch / H;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(v.off, 0, 0, W, H, 0, 0, cw, ch);

  // cámaras
  if (v.ai) {
    for (let k = 0; k < s.p.cams; k++) {
      const c = CAMS[k], px = (c.x + 0.5) * sx, py = (c.y + 0.5) * sy;
      ctx.beginPath(); ctx.arc(px, py, MODEL.CAM_R * sx, 0, Math.PI * 2);
      ctx.fillStyle = k === s.camIdx ? 'rgba(46,160,67,0.24)' : 'rgba(46,160,67,0.07)'; ctx.fill();
      ctx.setLineDash([4 * dpr, 4 * dpr]); ctx.lineWidth = 1 * dpr; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke(); ctx.setLineDash([]);
    }
    for (let k = 0; k < s.p.cams; k++) {
      const c = CAMS[k], px = (c.x + 0.5) * sx, py = (c.y + 0.5) * sy, r = 6 * dpr;
      ctx.beginPath(); ctx.moveTo(px, py - r); ctx.lineTo(px + r * 0.9, py + r * 0.6); ctx.lineTo(px - r * 0.9, py + r * 0.6); ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 2 * dpr; ctx.strokeStyle = '#2EA043'; ctx.stroke();
    }
  }
  // foco inicial
  const ix = (s.ign % W + 0.5) * sx, iy = (((s.ign / W) | 0) + 0.5) * sy;
  ctx.beginPath(); ctx.arc(ix, iy, 7 * dpr, 0, Math.PI * 2); ctx.lineWidth = 2 * dpr; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.beginPath(); ctx.arc(ix, iy, 9 * dpr, 0, Math.PI * 2); ctx.lineWidth = 1 * dpr; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.stroke();

  // rótulos
  ctx.font = `600 ${11 * dpr}px "JetBrains Mono",Consolas,monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const label = (t, x, y) => { ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText(t, x, y); ctx.fillStyle = '#fff'; ctx.fillText(t, x, y); };
  for (const tw of TOWNS) label(tw.name, tw.x * sx, (tw.y - tw.ry - 1.2) * sy);
  label('Lago', LAKE.x * sx, LAKE.y * sy);

  // viento
  const bx = 10 * dpr, by = 10 * dpr, bw = 92 * dpr, bh = 30 * dpr;
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 6 * dpr) : ctx.rect(bx, by, bw, bh); ctx.fill();
  const ax = bx + 16 * dpr, ay = by + bh / 2, L = 9 * dpr;
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(s.wy, s.wx));
  ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 2 * dpr;
  if (s.p.wind > 0) { ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L - 3 * dpr, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(L - 6 * dpr, -4 * dpr); ctx.lineTo(L - 6 * dpr, 4 * dpr); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = `600 ${11 * dpr}px "JetBrains Mono",Consolas,monospace`;
  ctx.fillText(s.p.wind > 0 ? s.p.wind + ' km/h' : 'calma', bx + 32 * dpr, ay);
}
function drawAll() { drawMap(views[0], simNo); drawMap(views[1], simAi); }

function statText(s) {
  const det = s.detectedAt >= 0 ? `${fmtMin(s.detectedAt * STEP_MIN)} · ${s.detectBy}` : (s.ended ? 'No llegó a verse' : s.t > 0 ? 'Todavía nadie lo vio…' : '—');
  let arr = s.arriveAt >= 0 ? (s.t >= s.arriveAt ? 'Brigada combatiendo desde ' + fmtMin(s.arriveAt * STEP_MIN) : 'Llega a las ' + fmtMin(s.arriveAt * STEP_MIN)) : '—';
  if (s.arriveAt >= 0 && s.faExtra > 0) arr += ` (+${s.faExtra} min: brigada atendiendo falsas alarmas)`;
  let state = 'Listo para empezar';
  if (s.ended) state = s.endReason + (s.endReason === 'Controlado' ? ' a las ' + fmtMin(s.endT * STEP_MIN) : '');
  else if (s.t > 0) state = s.arriveAt >= 0 && s.t >= s.arriveAt ? 'En combate' : 'Avanzando sin control';
  return { ha: fmtHa(s.burned * CELL_HA), det, arr, homes: s.homes.toLocaleString('es-AR'), state };
}
