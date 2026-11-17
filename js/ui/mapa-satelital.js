"use strict";
// ---------- Incendios satelitales (NASA EONET) ----------
const PLACES = [['Bariloche', -41.133, -71.31], ['El Bolsón', -41.964, -71.533], ['Lago Puelo', -42.067, -71.6, 'L'], ['El Hoyo', -42.066, -71.519], ['Epuyén', -42.226, -71.367], ['Cholila', -42.51, -71.447], ['Esquel', -42.911, -71.32]];
// Mapa con proporción real a 42° S: 124 km de ancho × 238 km de alto → 240 × 460 unidades.
const EO_BOX = { lon0: -72.45, lon1: -70.95, lat0: -40.95, lat1: -43.1 };
const eoX = lon => 10 + (lon - EO_BOX.lon0) / (EO_BOX.lon1 - EO_BOX.lon0) * 240, eoY = lat => 10 + (lat - EO_BOX.lat0) / (EO_BOX.lat1 - EO_BOX.lat0) * 460;
function nearestPlace(lat, lon) {
  let best = null, bd = 1e9;
  for (const [n, la, lo] of PLACES) { const dx = (lon - lo) * 111.32 * Math.cos(lat * Math.PI / 180), dy = (lat - la) * 110.57, d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = n; } }
  return bd < 4 ? best : `${Math.round(bd)} km de ${best}`;
}
const fmtDate = s => s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
function eoCircles(evs, cls) {
  return evs.map((e, k) => {
    const r = e.ha ? 3 + Math.sqrt(e.ha) / 17 : 3.5;
    return `<circle data-k="${k}" class="${cls}" cx="${eoX(e.lon).toFixed(1)}" cy="${eoY(e.lat).toFixed(1)}" r="${r.toFixed(1)}" fill="${e.ha ? '#e8541c' : '#fff'}" fill-opacity="${e.ha ? 0.55 : 0.85}" stroke="#b5300b" stroke-width="1.3"><title>${fmtDate(e.d)} · ${e.ha ? e.ha.toLocaleString('es-AR') + ' ha' : 'superficie sin dato'}</title></circle>`;
  }).join('');
}
// Relieve sombreado: colores por altura + sombra de luz desde el noroeste
function reliefDataURL() {
  const W2 = 480, H2 = 920, c = document.createElement('canvas'); c.width = W2; c.height = H2;
  const g = c.getContext('2d'), img = g.createImageData(W2, H2), d = img.data, nx = ELEV.nx, ny = ELEV.ny, E = ELEV.v;
  const at = (i, j) => E[Math.min(ny - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))];
  const bil = (fx, fy) => { const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j; return at(i, j) * (1 - u) * (1 - v) + at(i + 1, j) * u * (1 - v) + at(i, j + 1) * (1 - u) * v + at(i + 1, j + 1) * u * v; };
  const STOPS = [[0, [196, 220, 180]], [450, [178, 206, 152]], [800, [208, 206, 160]], [1200, [204, 184, 146]], [1650, [180, 162, 142]], [2100, [238, 236, 232]]];
  const col = e => { for (let k = 1; k < STOPS.length; k++) if (e <= STOPS[k][0]) { const [e0, c0] = STOPS[k - 1], [e1, c1] = STOPS[k], t = (e - e0) / (e1 - e0); return c0.map((v, m) => v + (c1[m] - v) * t); } return STOPS[STOPS.length - 1][1]; };
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    const fx = x / (W2 - 1) * (nx - 1), fy = y / (H2 - 1) * (ny - 1), e = bil(fx, fy);
    const gx = (bil(fx + 0.5, fy) - bil(fx - 0.5, fy)) / 1035, gy = (bil(fx, fy + 0.5) - bil(fx, fy - 0.5)) / 1390;
    const sh = Math.max(0.6, Math.min(1.3, 1 + 1.1 * (gx + gy)));
    const c0 = col(Math.max(0, e)), o = (y * W2 + x) * 4;
    d[o] = c0[0] * sh; d[o + 1] = c0[1] * sh; d[o + 2] = c0[2] * sh; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}
function initEonet() {
  const svg = $('eoMap');
  const lab = (x, y, t, cls, anchor) => `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}"${anchor ? ` text-anchor="${anchor}"` : ''}>${t}</text>`;
  let s = `<defs><clipPath id="eoClip"><rect x="10" y="10" width="240" height="460" rx="5"/></clipPath></defs><g clip-path="url(#eoClip)">`;
  s += `<image href="${reliefDataURL()}" x="10" y="10" width="240" height="460" preserveAspectRatio="none"/>`;
  s += `<path d="${GEO.lakes}" fill="#8cbbe0" stroke="#5f95c4" stroke-width=".5" fill-rule="evenodd"/>`;
  s += `<path d="${GEO.roads}" fill="none" stroke="#7d6c58" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/>`;
  s += `<path d="${GEO.roads}" fill="none" stroke="#fffaf0" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="${GEO.border}" fill="none" stroke="#6d4c9c" stroke-width="1.3" stroke-dasharray="4 2.5"/>`;
  s += '<g id="firmsG"></g>';
  s += lab(40, 330, 'CHILE', 'eo-country') + lab(205, 160, 'ARGENTINA', 'eo-country', 'middle');
  for (const [n, x, y, a] of GEO.labels) s += lab(x, y, n, 'eo-lake', a || 'middle');
  s += PLACES.map(([n, la, lo, side]) => `<rect x="${(eoX(lo) - 2).toFixed(1)}" y="${(eoY(la) - 2).toFixed(1)}" width="4" height="4" fill="#23221f" stroke="#fff" stroke-width=".8"/>` +
    lab(eoX(lo) + (side ? -4.5 : 4.5), eoY(la) + 2.6, n, 'eo-town', side ? 'end' : '')).join('');
  s += eoCircles(EONET_EVENTS, 'eo') + '<g id="eoLiveG"></g></g>';
  // marco, escala (20 km), norte y atribución
  const km20 = 20 * 240 / 124.1;
  s += `<rect x="10" y="10" width="240" height="460" rx="5" fill="none" stroke="var(--line)"/>`;
  s += `<g transform="translate(18 452)"><rect x="-3" y="-9" width="${(km20 + 26).toFixed(1)}" height="14" rx="3" fill="#fff" fill-opacity=".8"/><path d="M0 0H${km20.toFixed(1)}" stroke="#23221f" stroke-width="1.6"/><path d="M0 -3V2M${km20.toFixed(1)} -3V2" stroke="#23221f" stroke-width="1"/>` + lab(km20 + 3, 2.5, '20 km', 'eo-small') + '</g>';
  s += `<g transform="translate(236 30)"><path d="M0 -12L5 2L0 -1L-5 2Z" fill="#23221f"/>` + lab(0, 10, 'N', 'eo-small', 'middle') + '</g>';
  s += `<text class="eo-attr" x="10" y="482">Relieve: Copernicus DEM (Open-Meteo) y SRTM (OpenTopoData) · Lagos, límites y rutas: © OpenStreetMap</text>`;
  svg.innerHTML = s;
  $('eoTable').innerHTML = '<thead><tr><th>Inicio</th><th>Dónde</th><th>Superficie</th><th>Fuente</th></tr></thead><tbody>' +
    EONET_EVENTS.map((e, k) => `<tr data-k="${k}"><td>${fmtDate(e.d)}</td><td style="text-align:left">${e.name || nearestPlace(e.lat, e.lon)}</td><td>${e.ha ? e.ha.toLocaleString('es-AR') + ' ha' : '—'}</td><td>${e.url ? `<a href="${e.url}" target="_blank" rel="noopener">${e.src}</a>` : e.src}</td></tr>`).join('') + '</tbody>';
  const sel = k => {
    document.querySelectorAll('#eoTable tbody tr').forEach(tr => tr.classList.toggle('eo-row-sel', +tr.dataset.k === k));
    document.querySelectorAll('#eoMap circle.eo').forEach(c => c.setAttribute('stroke-width', +c.dataset.k === k ? 3 : 1.3));
  };
  document.querySelectorAll('#eoTable tbody tr').forEach(tr => { tr.addEventListener('mouseenter', () => sel(+tr.dataset.k)); tr.addEventListener('mouseleave', () => sel(-1)); });
  const season = EONET_EVENTS.filter(e => e.d >= '2025-07-01' && e.ha);
  $('eoSum').innerHTML = `Solo en la temporada 2025-26, GDACS registró <b>${season.length} incendios</b> en esta zona que suman <b>${season.reduce((a, e) => a + e.ha, 0).toLocaleString('es-AR')} ha</b>. Son estimaciones satelitales gruesas, pero muestran la escala del problema.`;
}
$('btnEoLive').addEventListener('click', async () => {
  const out = $('eoLive'); out.textContent = 'Consultando NASA EONET…';
  try {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&bbox=-72.5,-40.5,-70.5,-43.5', { signal: ctrl.signal }); clearTimeout(to);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const all = (await r.json()).events.map(e => { const g = e.geometry[e.geometry.length - 1]; return { d: g.date.slice(0, 10), ha: g.magnitudeValue, lat: g.coordinates[1], lon: g.coordinates[0] }; });
    // EONET a veces deja eventos viejos sin cerrar: solo contamos como activos los de los últimos 30 días
    const recent = all.filter(e => Date.now() - Date.parse(e.d) < 30 * 864e5), stale = all.length - recent.length;
    $('eoLiveG').innerHTML = eoCircles(recent, 'eolive');
    const where = e => { const p = nearestPlace(e.lat, e.lon); return p.includes(' km ') ? 'a ' + p : 'en ' + p; };
    out.innerHTML = (recent.length
      ? `Hay <b>${recent.length}</b> incendio(s) activo(s) registrado(s) en la zona: ` + recent.map(e => `desde el ${fmtDate(e.d)} ${where(e)}${e.ha ? ' (' + e.ha.toLocaleString('es-AR') + ' ha)' : ''}`).join('; ') + '.'
      : 'En este momento NASA EONET no registra incendios activos recientes en la zona.') +
      (stale ? ` <span class="muted">(Además figura${stale > 1 ? 'n' : ''} ${stale} evento${stale > 1 ? 's' : ''} viejo${stale > 1 ? 's' : ''} sin cerrar en la base, que no contamos.)</span>` : '') +
      ` <span class="muted">Consultado: ${new Date().toLocaleString('es-AR')}.</span>`;
  } catch (e) { out.textContent = 'No se pudo consultar NASA EONET (puede que no haya conexión). Los datos guardados de arriba siguen disponibles.'; }
});
