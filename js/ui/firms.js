"use strict";
// ---------- Focos de calor de NASA FIRMS (VIIRS 375 m) ----------
// Datos en js/data/firms.js (generados por scripts/fetch-firms.mjs).
// Temporada = 1 de julio a 30 de junio. Se excluyen las detecciones de confianza baja.

const FIRMS_DAY0 = Date.parse((typeof FIRMS !== 'undefined' ? FIRMS.epoch : '2012-01-01') + 'T00:00:00Z');
const firmsDate = d => new Date(FIRMS_DAY0 + d * 864e5);
const firmsSeasonOf = d => { const t = firmsDate(d); return t.getUTCMonth() >= 6 ? t.getUTCFullYear() + 1 : t.getUTCFullYear(); };
const firmsSeasonLabel = s => `${s - 1}-${String(s).slice(2)}`;
let FIRMS_SEASONS = [], firmsSel = -1, firmsHover = -1;

function initFirms() {
  if (typeof FIRMS === 'undefined' || !FIRMS.rows.length || !$('firmsChart')) return;
  const first = firmsSeasonOf(Date.parse(FIRMS.from) / 864e5 - FIRMS_DAY0 / 864e5);
  const last = firmsSeasonOf(Date.parse(FIRMS.to) / 864e5 - FIRMS_DAY0 / 864e5);
  const map = new Map();
  for (const r of FIRMS.rows) {
    if (r[4] === 'l') continue;                                  // sin confianza baja
    const s = firmsSeasonOf(r[2]);
    const o = map.get(s) || { s, n: 0, frp: 0, days: new Set(), pts: [] };
    o.n++; o.frp += r[3]; o.days.add(r[2]); o.pts.push(r); map.set(s, o);
  }
  // solo temporadas completas (julio a junio dentro del período descargado)
  const fromSeason = Date.parse(FIRMS.from) <= Date.parse(`${first - 1}-07-01`) ? first : first + 1;
  const toSeason = Date.parse(FIRMS.to) >= Date.parse(`${last}-06-30`) ? last : last - 1;
  FIRMS_SEASONS = [];
  for (let s = fromSeason; s <= toSeason; s++) FIRMS_SEASONS.push(map.get(s) || { s, n: 0, frp: 0, days: new Set(), pts: [] });
  if (!FIRMS_SEASONS.length) return;
  const total = FIRMS_SEASONS.reduce((a, o) => a + o.n, 0);
  const max = FIRMS_SEASONS.reduce((a, o) => o.n > a.n ? o : a, FIRMS_SEASONS[0]);
  $('firmsMeta').textContent = `${total.toLocaleString('es-AR')} focos en ${FIRMS_SEASONS.length} temporadas (${firmsSeasonLabel(FIRMS_SEASONS[0].s)} a ${firmsSeasonLabel(FIRMS_SEASONS.at(-1).s)}). La mayor: ${firmsSeasonLabel(max.s)}, con ${max.n.toLocaleString('es-AR')} focos.`;
  const cv = $('firmsChart');
  const pick = e => {
    const r = cv.getBoundingClientRect(), x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left, g = firmsGeom(cv);
    return Math.max(0, Math.min(FIRMS_SEASONS.length - 1, Math.floor((x - g.l) / ((g.w - g.l - g.r) / FIRMS_SEASONS.length))));
  };
  cv.addEventListener('mousemove', e => { firmsHover = pick(e); drawFirms(); firmsTip(); });
  cv.addEventListener('mouseleave', () => { firmsHover = -1; $('firmsTip').style.display = 'none'; drawFirms(); });
  cv.addEventListener('click', e => selectFirms(pick(e)));
  cv.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') selectFirms(Math.max(0, firmsSel - 1));
    if (e.key === 'ArrowRight') selectFirms(Math.min(FIRMS_SEASONS.length - 1, firmsSel + 1));
  });
  selectFirms(FIRMS_SEASONS.length - 1);
}
function firmsTip() {
  const o = FIRMS_SEASONS.at(firmsHover), tip = $('firmsTip'); if (!o) return;
  tip.innerHTML = `<b>Temporada ${firmsSeasonLabel(o.s)}</b><div>${o.n.toLocaleString('es-AR')} focos · ${o.days.size} días con focos</div><div class="muted">Clic para verlos en el mapa</div>`;
  tip.style.display = 'block';
  const g = firmsGeom($('firmsChart')), bw = (g.w - g.l - g.r) / FIRMS_SEASONS.length, px = g.l + (firmsHover + 0.5) * bw, tw = tip.offsetWidth;
  tip.style.left = Math.max(0, Math.min(g.w - tw, px - tw / 2)) + 'px'; tip.style.top = '4px';
}
function selectFirms(i) {
  firmsSel = i; const o = FIRMS_SEASONS.at(i); if (!o) return;
  $('firmsSel').textContent = 'Temporada ' + firmsSeasonLabel(o.s);
  const big = o.pts.filter(r => r[3] >= 50).length;
  $('firmsNote').textContent = `${firmsSeasonLabel(o.s)}: ${o.n.toLocaleString('es-AR')} focos en ${o.days.size} días · ${big.toLocaleString('es-AR')} con potencia de 50 MW o más. Los puntos rojos del mapa son estos focos.`;
  drawFirms(); drawFirmsPoints(o.pts);
}
function firmsGeom(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  return { dpr, w, h, l: 60, r: w < 520 ? 26 : 12, t: 18, b: 26 };
}
function drawFirms() {
  const cv = $('firmsChart'); if (!cv || !cv.clientWidth || !FIRMS_SEASONS.length) return;
  const g = firmsGeom(cv), ctx = cv.getContext('2d');
  ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0); ctx.clearRect(0, 0, g.w, g.h);
  const muted = cssVar('--muted'), line = cssVar('--line'), ink = cssVar('--ink'), crit = cssVar('--crit'), grey = cssVar('--line2');
  const max = niceMax(Math.max(...FIRMS_SEASONS.map(o => o.n)) * 1.08), pw = g.w - g.l - g.r, ph = g.h - g.t - g.b, bw = pw / FIRMS_SEASONS.length;
  const Y = v => g.t + ph - v / max * ph;
  ctx.font = '11px "JetBrains Mono",Consolas,monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let k = 0; k <= 4; k++) {
    const v = max * k / 4, y = Math.round(Y(v)) + 0.5;
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.l, y); ctx.lineTo(g.w - g.r, y); ctx.stroke();
    ctx.fillStyle = muted; ctx.fillText(v >= 1000 ? (v / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' mil' : Math.round(v), g.l - 6, y);
  }
  FIRMS_SEASONS.forEach((o, i) => {
    const x = g.l + i * bw + 2, w = Math.max(2, bw - 4), y = Y(o.n);
    ctx.fillStyle = i === firmsSel ? crit : (i === firmsHover ? muted : grey);
    ctx.fillRect(x, y, w, g.t + ph - y);
    if (i === firmsSel) { ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(o.n.toLocaleString('es-AR'), x + w / 2, y - 3); }
    const every = g.w < 520 ? 3 : 2;
    if ((FIRMS_SEASONS.length - 1 - i) % every === 0) { ctx.fillStyle = i === firmsSel ? ink : muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(g.w < 520 ? `${String(o.s - 1).slice(2)}-${String(o.s).slice(2)}` : firmsSeasonLabel(o.s), x + w / 2, g.h - g.b + 8); }
  });
}
// Dibuja los focos de la temporada sobre el mapa satelital (capa raster debajo de los eventos EONET)
function drawFirmsPoints(pts) {
  const layer = $('firmsG'); if (!layer) return;
  const W2 = 480, H2 = 920, c = document.createElement('canvas'); c.width = W2; c.height = H2;
  const g = c.getContext('2d');
  for (const r of pts) {
    const x = (eoX(r[1]) - 10) * 2, y = (eoY(r[0]) - 10) * 2, hot = r[3] >= 50;
    g.fillStyle = hot ? 'rgba(229,72,77,0.95)' : 'rgba(229,72,77,0.6)';
    g.beginPath(); g.arc(x, y, hot ? 2.6 : 1.8, 0, Math.PI * 2); g.fill();
  }
  layer.innerHTML = `<image href="${c.toDataURL('image/png')}" x="10" y="10" width="240" height="460" preserveAspectRatio="none"/>`;
}
