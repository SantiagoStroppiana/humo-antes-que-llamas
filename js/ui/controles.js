"use strict";
// Controles, retos guiados y link para compartir el escenario.
// ---------- Controles ----------
function syncOutputs() {
  $('o-cams').textContent = params.cams;
  $('o-resp').textContent = fmtMin(params.resp);
  $('o-wind').textContent = params.wind + ' km/h';
  $('o-dry').textContent = params.dry + ' · ' + DRY_LABEL[params.dry - 1];
  $('o-fa').textContent = params.fa + ' por día';
  $('paramsLine').textContent = `Parámetros: ${params.cams} cámaras · respuesta ${fmtMin(params.resp)} · viento ${params.wind} km/h ${WIND_LABEL[params.windDir]} · sequedad ${DRY_LABEL[params.dry - 1].toLowerCase()} · ${params.fa} falsas alarmas/día`;
}
function setControls() {
  $('cams').value = params.cams; $('resp').value = params.resp; $('wind').value = params.wind; $('windDir').value = params.windDir; $('dry').value = params.dry; $('fa').value = params.fa;
}
function setReto(k) {
  activeReto = k;
  document.querySelectorAll('#retos button').forEach((b, j) => { b.classList.toggle('on', j === k); b.setAttribute('aria-pressed', j === k); });
  $('retoText').textContent = k >= 0 ? 'Reto activo: ' + RETOS[k].t.replace(/^\d · /, '') + '. Mirá qué pasa en los dos mapas y leé la lección al final.' : 'Elegí un reto: configura todo solo y te deja una lección al final.';
}
function onParamsChange() { setReto(-1); markDay(-1); caseNote = null; syncOutputs(); resetSims(); scheduleProjection(); }
for (const id of ['cams', 'resp', 'wind', 'dry', 'fa']) $(id).addEventListener('input', e => { params[id] = +e.target.value; onParamsChange(); });
$('windDir').addEventListener('change', e => { params.windDir = e.target.value; onParamsChange(); });

// ---------- Retos guiados ----------
$('retos').innerHTML = RETOS.map((r, k) => `<button type="button" data-reto="${k}" aria-pressed="false">${r.t}</button>`).join('');
document.querySelectorAll('#retos button').forEach(b => b.addEventListener('click', () => {
  const k = +b.dataset.reto, r = RETOS[k];
  Object.assign(params, r.p); setControls(); syncOutputs(); scheduleProjection();
  ignition = r.ign; resetSims(); setReto(k);
  running = true; $('btnPlay').textContent = '⏸ Pausa';
}));

// ---------- Compartir escenario (parámetros en la URL) ----------
function scenarioURL() {
  const q = new URLSearchParams({ c: params.cams, r: params.resp, w: params.wind, d: params.windDir, s: params.dry, fa: params.fa, f: ignition });
  return location.href.split('#')[0] + '#esc&' + q.toString();
}
function readScenarioFromURL() {
  if (!location.hash.startsWith('#esc&')) return false;
  const q = new URLSearchParams(location.hash.slice(5));
  const num = (k, lo, hi, def) => { const v = parseInt(q.get(k), 10); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def; };
  params.cams = num('c', 0, 12, params.cams); params.resp = num('r', 15, 180, params.resp);
  params.wind = num('w', 0, 70, params.wind); params.dry = num('s', 1, 5, params.dry); params.fa = num('fa', 0, 10, params.fa);
  if (WIND_DIRS[q.get('d')]) params.windDir = q.get('d');
  const f = num('f', 0, N - 1, -1);
  if (f >= 0 && FUEL[type[f]] > 0) ignition = f;
  return true;
}
$('btnShare').addEventListener('click', () => {
  const url = scenarioURL(), btn = $('btnShare');
  const done = () => { btn.textContent = 'Link copiado'; setTimeout(() => btn.textContent = 'Compartir', 2000); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, () => window.prompt('Copiá este link:', url));
  else window.prompt('Copiá este link:', url);
});
