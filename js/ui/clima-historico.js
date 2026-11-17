"use strict";
// ---------- Clima histórico: KPIs, gráfico y tabla ----------
const CLIM_METRICS = [
  { col: 1, t: 'Temperatura máxima', unit: '°C', dec: 1, zero: false, note: 'Promedio de las máximas diarias de diciembre a febrero.' },
  { col: 3, t: 'Días de 30 °C o más', unit: 'días', dec: 0, zero: true, note: 'Cantidad de días del verano con máxima de 30 °C o más.' },
  { col: 4, t: 'Días de peligro', unit: 'días', dec: 0, zero: true, note: 'Días con máxima de 27 °C o más y humedad mínima de 25% o menos: calor y aire seco al mismo tiempo.' },
  { col: 2, t: 'Lluvia del verano', unit: 'mm', dec: 0, zero: true, note: 'Lluvia total de diciembre a febrero. Varía mucho de un año a otro y su tendencia es débil.' }
];
const FIRE_SEASONS = { 2021: 'Las Golondrinas', 2025: 'El Bolsón y Epuyén', 2026: 'récord de focos FIRMS' };
let climMetric = 0, climHover = -1;
const seasonLabel = s => `${s - 1}-${String(s).slice(2)}`;
function decadeAvg(col, a, b) { const r = CLIMATE.filter(x => x[0] >= a && x[0] <= b); return r.reduce((s, x) => s + x[col], 0) / r.length; }
function initClimate() {
  const kp = (id, col, unit, dec) => {
    const a = decadeAvg(col, 1981, 1990), b = decadeAvg(col, 2017, 2026), fit = linreg(CLIMATE.map(r => r[0]), CLIMATE.map(r => r[col]));
    const f = v => v.toLocaleString('es-AR', { maximumFractionDigits: dec, minimumFractionDigits: dec });
    $(id).textContent = `${f(a)} → ${f(b)}${unit === '°C' ? ' °C' : ''}`;
    $(id + '-s').textContent = unit === '°C'
      ? `+${f(b - a)} °C entre 1981–90 y 2017–26 · tendencia +${fmt1(fit.b * 10)} °C por década`
      : `×${fmt1(b / a)} entre 1981–90 y 2017–26 · tendencia +${fmt1(fit.b * 10)} días por década`;
  };
  kp('ck-tx', 1, '°C', 1); kp('ck-d30', 3, 'días', 1); kp('ck-risk', 4, 'días', 1);
  $('climTabs').innerHTML = CLIM_METRICS.map((m, k) => `<button type="button" role="tab" aria-selected="${k === 0}">${m.t}</button>`).join('');
  document.querySelectorAll('#climTabs button').forEach((b, k) => b.addEventListener('click', () => {
    climMetric = k; document.querySelectorAll('#climTabs button').forEach((x, j) => x.setAttribute('aria-selected', j === k)); drawClimate();
  }));
  $('climTable').innerHTML = '<thead><tr><th>Verano</th><th>Temp. máx. media</th><th>Lluvia</th><th>Días ≥ 30 °C</th><th>Días de peligro</th></tr></thead><tbody>' +
    CLIMATE.map(r => `<tr><td>${seasonLabel(r[0])}</td><td>${fmt1(r[1])} °C</td><td>${r[2]} mm</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('') + '</tbody>';
  const cv = $('climChart');
  const hover = e => {
    const r = cv.getBoundingClientRect(), x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const g = climGeom(cv), i = Math.max(0, Math.min(CLIMATE.length - 1, Math.round((x - g.l) / (g.w - g.l - g.r) * (CLIMATE.length - 1))));
    climHover = i; drawClimate();
    const m = CLIM_METRICS[climMetric], row = CLIMATE[i], tip = $('climTip');
    tip.innerHTML = `<b>Verano ${seasonLabel(row[0])}</b><div>${m.t}: <b>${m.dec ? fmt1(row[m.col]) : row[m.col]} ${m.unit}</b></div>` + (FIRE_SEASONS[row[0]] ? `<div class="muted">${FIRE_SEASONS[row[0]]}</div>` : '');
    tip.style.display = 'block';
    const px = g.l + i / (CLIMATE.length - 1) * (g.w - g.l - g.r), tw = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(g.w - tw, px + 12 > g.w - tw ? px - tw - 12 : px + 12)) + 'px'; tip.style.top = '8px';
  };
  cv.addEventListener('mousemove', hover); cv.addEventListener('touchstart', hover, { passive: true }); cv.addEventListener('touchmove', hover, { passive: true });
  cv.addEventListener('mouseleave', () => { climHover = -1; $('climTip').style.display = 'none'; drawClimate(); });
  drawClimate();
}
function climGeom(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  return { dpr, w, h, l: 52, r: 16, t: 22, b: 28 };
}
function drawClimate() {
  const cv = $('climChart'); if (!cv.clientWidth) return;
  const g = climGeom(cv), ctx = cv.getContext('2d'), m = CLIM_METRICS[climMetric];
  ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0); ctx.clearRect(0, 0, g.w, g.h);
  const muted = cssVar('--muted'), line = cssVar('--line'), ink2 = cssVar('--ink2'), col = cssVar('--fire'), surf = cssVar('--surface');
  const xs = CLIMATE.map(r => r[0]), ys = CLIMATE.map(r => r[m.col]);
  let lo = m.zero ? 0 : Math.floor(Math.min(...ys)), hi = m.zero ? niceMax(Math.max(...ys) * 1.08) : Math.ceil(Math.max(...ys) + 0.3);
  const pw = g.w - g.l - g.r, ph = g.h - g.t - g.b;
  const X = i => g.l + i / (xs.length - 1) * pw, Y = v => g.t + ph - (v - lo) / (hi - lo) * ph;
  ctx.font = '12px "JetBrains Mono",Consolas,monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
  const nT = m.zero ? 4 : hi - lo;
  for (let k = 0; k <= nT; k++) {
    const v = lo + (hi - lo) * k / nT, y = Math.round(Y(v)) + 0.5;
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.l, y); ctx.lineTo(g.w - g.r, y); ctx.stroke();
    ctx.fillStyle = muted; ctx.fillText((m.dec ? fmt1(v) : Math.round(v)) + (m.unit === '°C' ? '°' : ''), g.l - 8, y);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  xs.forEach((s, i) => { if (s % (g.w < 480 ? 10 : 5) === 0) { ctx.fillStyle = muted; ctx.fillText(s, X(i), g.h - g.b + 8); } });
  // tendencia
  const fit = linreg(xs, ys);
  ctx.setLineDash([5, 4]); ctx.strokeStyle = ink2; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.moveTo(X(0), Y(fit.a + fit.b * xs[0])); ctx.lineTo(X(xs.length - 1), Y(fit.a + fit.b * xs[xs.length - 1])); ctx.stroke(); ctx.setLineDash([]);
  // serie
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
  ys.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))); ctx.stroke();
  // veranos con grandes incendios
  ctx.textBaseline = 'bottom'; ctx.font = '600 11px "JetBrains Mono",Consolas,monospace';
  xs.forEach((s, i) => {
    if (!FIRE_SEASONS[s] && i !== climHover) return;
    ctx.beginPath(); ctx.arc(X(i), Y(ys[i]), FIRE_SEASONS[s] ? 5 : 4, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = surf; ctx.stroke();
    if (FIRE_SEASONS[s] && g.w >= 480 && s !== 2026) { ctx.fillStyle = ink2; ctx.textAlign = 'center'; ctx.fillText(s, X(i), Y(ys[i]) - 8); }
  });
  if (climHover >= 0) { ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Math.round(X(climHover)) + 0.5, g.t); ctx.lineTo(Math.round(X(climHover)) + 0.5, g.t + ph); ctx.stroke(); }
  $('climNote').innerHTML = `${m.note} Línea punteada: tendencia lineal (${fit.b >= 0 ? '+' : ''}${fmt1(fit.b * 10)} ${m.unit} por década). Puntos marcados = veranos con grandes incendios en la comarca.`;
}
