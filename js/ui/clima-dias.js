"use strict";
// ---------- Clima de días reales (Open-Meteo) ----------
const WX_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-41.96&longitude=-71.53' +
  '&daily=temperature_2m_max,relative_humidity_2m_min,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,precipitation_sum' +
  '&past_days=14&forecast_days=1&timezone=America%2FArgentina%2FBuenos_Aires&wind_speed_unit=kmh';
function windDirFromDeg(deg) {
  // dirección de donde VIENE el viento → la opción más cercana del simulador
  const opts = { E: 90, S: 180, O: 270, NO: 315, N: 360 };
  let best = 'O', bd = 999;
  for (const [k, a] of Object.entries(opts)) { const d = Math.min(Math.abs(deg - a), 360 - Math.abs(deg - a)); if (d < bd) { bd = d; best = k; } }
  return best;
}
function dryFromWeather(temp, rh, rain14) {
  let s = 0;
  s += rain14 < 5 ? 2 : rain14 < 20 ? 1 : 0;
  s += rh < 20 ? 1.5 : rh < 35 ? 0.75 : 0;
  s += temp > 28 ? 1 : temp > 22 ? 0.5 : 0;
  return Math.max(1, Math.min(5, 1 + Math.round(s)));
}
const fmt1 = v => (Math.round(v * 10) / 10).toLocaleString('es-AR');
function applyDay(d, k, live) {
  const eff = (d.wmax + d.gust) / 2;
  const sug = { wind: Math.min(70, Math.round(eff / 5) * 5), windDir: windDirFromDeg(d.dir), dry: dryFromWeather(d.tmax, d.rh, d.rain) };
  Object.assign(params, sug); setControls(); onParamsChange(); markDay(k);
  $('wxBody').innerHTML = `<div class="wx-vals"><span><b>${d.place}</b></span><span>Máx. <b>${fmt1(d.tmax)} °C</b></span><span>Humedad mín. <b>${Math.round(d.rh)}%</b></span>` +
    `<span>Viento máx. ${fmt1(d.wmax)} km/h, ráfagas ${fmt1(d.gust)} → <b>${sug.wind} km/h ${WIND_LABEL[sug.windDir]}</b></span>` +
    `<span>Lluvia 14 días previos: <b>${fmt1(d.rain)} mm</b></span><span>Sequedad: <b>${sug.dry} · ${DRY_LABEL[sug.dry - 1]}</b></span></div>` +
    (live ? 'Pronóstico de hoy en El Bolsón, consultado en vivo a Open-Meteo.' : 'Clima real del día en que empezó el incendio (Open-Meteo, ERA5). Ya está cargado en los controles: apretá ▶ Iniciar.');
}
function markDay(k) { document.querySelectorAll('#realDays button').forEach((b, j) => { b.classList.toggle('on', j === k); b.setAttribute('aria-pressed', j === k); }); }
async function loadToday(k) {
  const box = $('wxBody'); box.textContent = 'Consultando el pronóstico de hoy…';
  try {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(WX_URL, { signal: ctrl.signal }); clearTimeout(to);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const dd = (await r.json()).daily, t = dd.time.length - 1;
    const rain = dd.precipitation_sum.slice(0, t).reduce((a, b) => a + (b || 0), 0);
    applyDay({ place: 'El Bolsón, hoy', tmax: dd.temperature_2m_max[t], rh: dd.relative_humidity_2m_min[t], wmax: dd.wind_speed_10m_max[t], gust: dd.wind_gusts_10m_max[t], dir: dd.wind_direction_10m_dominant[t], rain }, k, true);
  } catch (e) {
    box.textContent = 'No se pudo consultar el clima de hoy (puede que no haya conexión). Los días reales y los controles funcionan igual.';
  }
}
$('realDays').innerHTML = REAL_DAYS.map((d, k) => `<button type="button" aria-pressed="false">${d.label}</button>`).join('') + '<button type="button" aria-pressed="false">Hoy (en vivo)</button>';
document.querySelectorAll('#realDays button').forEach((b, k) => b.addEventListener('click', () => k < REAL_DAYS.length ? applyDay(REAL_DAYS[k], k) : loadToday(k)));
