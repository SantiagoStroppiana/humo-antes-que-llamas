"use strict";
// Consola de eventos, diferencia en vivo, estadísticas, historial y gráfico en el tiempo.
// ---------- Consola de eventos (datos reales de la simulación) ----------
let evCount = 0;
const tstamp = m => 'T+' + String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
function evReset() { evCount = 0; const L = $('evlog'); if (L) { L.innerHTML = '<div class="empty">Esperando inicio…</div>'; $('evCount').textContent = '0'; } }
function evPush(min, src, level, msg) {
  const L = $('evlog'); if (!L) return;
  if (!evCount) L.innerHTML = '';
  evCount++; $('evCount').textContent = evCount;
  const d = document.createElement('div'); d.className = 'ev ' + level;
  d.innerHTML = `<span class="t">${tstamp(min)}</span><span class="src">${src}</span><span class="msg">${msg}</span>`;
  L.appendChild(d); L.scrollTop = L.scrollHeight;
}
function evCheck(s, src) {
  const L = s.evl || (s.evl = {});
  if (src === 'SIN IA' && !L.ign && s.t >= 1) { L.ign = 1; evPush(0, 'AMBOS', 'crit', `IGNICIÓN · CELDA ${s.ign % W},${(s.ign / W) | 0} · ${TYPE_NAME[type[s.ign]].toUpperCase()}`); }
  if (!L.det && s.detectedAt >= 0) { L.det = 1; evPush(s.detectedAt * STEP_MIN, src, 'warn', 'DETECCIÓN · ' + s.detectBy.toUpperCase()); }
  if (!L.arr && s.arriveAt >= 0 && s.t >= s.arriveAt) { L.arr = 1; evPush(s.arriveAt * STEP_MIN, src, 'ok', 'BRIGADA EN EL FRENTE' + (s.faExtra ? ` · +${s.faExtra} MIN POR FALSAS ALARMAS` : '')); }
  for (const th of [100, 1000]) { const key = 'h' + th; if (!L[key] && s.burned * CELL_HA >= th) { L[key] = 1; evPush(s.t * STEP_MIN, src, 'crit', `SUPERA ${th.toLocaleString('es-AR')} HA`); } }
  if (!L.home && s.homes > 0) { L.home = 1; evPush(s.t * STEP_MIN, src, 'crit', 'FUEGO EN ZONA DE VIVIENDAS'); }
  if (!L.end && s.ended) { L.end = 1; const esc = s.endReason.startsWith('Sigue'); evPush(s.endT * STEP_MIN, src, esc ? 'crit' : 'ok', `${s.endReason.toUpperCase()} · ${(s.burned * CELL_HA).toLocaleString('es-AR')} HA`); }
}
function updateDelta() {
  if (!simNo || !$('d-ha')) return;
  if (!simNo.t) { ['d-ha', 'd-pct', 'd-det', 'd-homes'].forEach(id => $(id).textContent = '—'); return; }
  const a = simNo.burned * CELL_HA, b = simAi.burned * CELL_HA, diff = a - b;
  $('d-ha').textContent = diff > 0 ? fmtHa(diff) : '0 ha';
  $('d-pct').textContent = a ? (diff > 0 ? '−' : '') + Math.round(Math.abs(diff) / a * 100) + '%' : '—';
  const dm = s => s.detectedAt >= 0 ? s.detectedAt * STEP_MIN + "'" : '…';
  $('d-det').textContent = dm(simNo) + ' / ' + dm(simAi);
  $('d-homes').textContent = Math.max(0, simNo.homes - simAi.homes).toLocaleString('es-AR');
}
function updateStats() {
  updateDelta();
  for (const [s, p] of [[simNo, 'no'], [simAi, 'ai']]) {
    const t = statText(s);
    $(p + '-ha').textContent = t.ha; $(p + '-det').textContent = t.det; $(p + '-arr').textContent = t.arr;
    $(p + '-homes').textContent = t.homes; $(p + '-state').textContent = t.state;
  }
  $('clock').textContent = 'T + ' + fmtMin(Math.max(simNo.t, simAi.t) * STEP_MIN);
  if (simNo.ended && simAi.ended && simNo.t > 0) {
    const a = simNo.burned * CELL_HA, b = simAi.burned * CELL_HA, diff = a - b;
    const dNo = simNo.detectedAt * STEP_MIN, dAi = simAi.detectedAt * STEP_MIN;
    let msg;
    if (simNo.endReason === 'Se apagó solo' && simAi.endReason === 'Se apagó solo') msg = 'Este foco se apagó solo antes de crecer: cayó en un lugar con poco combustible o el azar no lo ayudó. Probá con otro punto o con más sequedad.';
    else if (Math.abs(diff) < a * 0.05) msg = `Casi el mismo resultado (diferencia de ${fmtHa(Math.abs(diff))}). ` + (simAi.cam < 0
      ? 'El foco quedó fuera del alcance de las cámaras y el sistema dependió del satélite o de los vecinos.'
      : 'En estas condiciones, detectar antes no alcanzó para frenar el fuego.');
    else if (diff > 0) msg = `Con IA el foco se detectó en <b>${fmtMin(dAi)}</b> (contra ${fmtMin(dNo)} sin IA) y se quemaron <b>${fmtHa(diff)} menos</b> (−${Math.round(diff / a * 100)}%). Son ${Math.round(diff / 100).toLocaleString('es-AR')} km² de bosque en pie` + (simNo.homes > simAi.homes ? ` y ${(simNo.homes - simAi.homes).toLocaleString('es-AR')} viviendas menos alcanzadas.` : '.');
    else if (diff === 0) msg = simAi.cam < 0 && simAi.detectBy.indexOf('Satélite') < 0
      ? 'Mismo resultado: el foco quedó fuera del alcance de las cámaras. Probá sumar cámaras o elegir otro lugar.'
      : 'Mismo resultado: en estas condiciones detectar antes no cambió el final.';
    else msg = 'Con IA se quemó un poco más esta vez: en un modelo con azar, adelantar el combate no siempre gana. Probá otro foco.';
    if (simAi.endReason.startsWith('Sigue')) msg += ' Aun con IA el fuego se escapó: con viento y sequía extremos, la detección temprana sola no alcanza.';
    if (activeReto >= 0 && simNo.ign === RETOS[activeReto].ign) msg += `<div class="lesson"><b>Lección del reto ${activeReto + 1}:</b> ${RETOS[activeReto].lesson}</div>`;
    if (caseNote && simNo.ign === DEMO_IGN) msg += `<div class="lesson"><b>Caso real:</b> ${caseNote}</div>`;
    $('summary').innerHTML = msg;
    if (!logged) { logged = true; logRun(a, b); }
    $('mapDesc').textContent = `Resultado. Sin IA: ${fmtHa(a)} quemadas, ${simNo.homes} viviendas alcanzadas, ${statText(simNo).state}. Con IA: ${fmtHa(b)} quemadas, ${simAi.homes} viviendas alcanzadas, ${statText(simAi).state}.`;
  }
  for (const [s, v] of [[simNo, views[0]], [simAi, views[1]]]) {
    const t = statText(s);
    v.cv.setAttribute('aria-label', `Mapa ${v.ai ? 'con' : 'sin'} IA. Superficie quemada ${t.ha}. Detección: ${t.det}. Estado: ${t.state}.`);
  }
}

function logRun(a, b) {
  runCount++;
  const where = activeReto >= 0 && simNo.ign === RETOS[activeReto].ign ? 'Reto ' + (activeReto + 1) : 'Foco en ' + TYPE_NAME[type[simNo.ign]].toLowerCase();
  const p = simNo.p;
  runHistory.unshift({ n: runCount, desc: `${where} · ${p.cams} cám. · resp. ${fmtMin(p.resp)} · viento ${p.wind} km/h · ${DRY_LABEL[p.dry - 1].toLowerCase()} · ${p.fa} falsas/día`, a, b });
  if (runHistory.length > 12) runHistory.pop();
  $('histTable').tBodies[0].innerHTML = runHistory.map(h => `<tr><td>${h.n}</td><td>${h.desc}</td><td>${fmtHa(h.a)}</td><td>${fmtHa(h.b)}</td><td>${Math.abs(h.a - h.b) < h.a * 0.01 ? '≈ igual' : h.a > h.b ? '−' + Math.round((h.a - h.b) / h.a * 100) + '%' : '+' + fmtHa(h.b - h.a)}</td></tr>`).join('');
}
$('btnClearHist').addEventListener('click', () => {
  runHistory.length = 0;
  $('histTable').tBodies[0].innerHTML = '<tr><td colspan="5" class="muted" style="text-align:left">Cada simulación que termines aparece acá para comparar.</td></tr>';
});

// ---------- Gráfico en vivo (ha vs tiempo) ----------
function drawLive() {
  const cv = $('liveChart'); if (!cv || !simNo) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (!w) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const muted = cssVar('--muted'), line = cssVar('--line'), ink2 = cssVar('--ink2'), surf = cssVar('--surface');
  const series = [[simNo, cssVar('--noai'), 'Sin IA'], [simAi, cssVar('--ai'), 'Con IA']];
  const n = Math.max(simNo.hist.length, simAi.hist.length, 13);   // al menos 2 h de eje
  const max = niceMax(Math.max(40, ...simNo.hist, ...simAi.hist) * 1.05);
  const l = 64, r = w < 480 ? 12 : 60, t = 10, b = 26, pw = w - l - r, ph = h - t - b;
  const X = i => l + i / (n - 1) * pw, Y = v => t + ph - v / max * ph;
  ctx.font = '12px "JetBrains Mono",Consolas,monospace'; ctx.textBaseline = 'middle';
  const lead = max / 10 ** Math.floor(Math.log10(max)), ticks = (lead === 2.5 || lead === 5) ? 5 : 4;
  for (let k = 0; k <= ticks; k++) {
    const v = max * k / ticks, y = Math.round(Y(v)) + 0.5;
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l, y); ctx.lineTo(w - r, y); ctx.stroke();
    ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.fillText(Math.round(v).toLocaleString('es-AR') + ' ha', l - 8, y);
  }
  const hours = (n - 1) * STEP_MIN / 60, every = hours <= 6 ? 1 : hours <= 24 ? 4 : 12;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let hr = 0; hr <= hours; hr += every) { ctx.fillStyle = muted; ctx.fillText(hr + ' h', X(hr * 60 / STEP_MIN), h - b + 8); }
  for (const [s, col] of series) {
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
    s.hist.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))); ctx.stroke();
    const mark = (i, tri) => {
      if (i < 0 || i >= s.hist.length) return;
      const x = X(i), y = Y(s.hist[i]);
      ctx.beginPath();
      if (tri) { ctx.moveTo(x, y - 6); ctx.lineTo(x + 5, y + 3); ctx.lineTo(x - 5, y + 3); ctx.closePath(); } else ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = surf; ctx.stroke();
    };
    mark(s.detectedAt, true); mark(s.arriveAt, false);
  }
  if (r >= 50) {
    let y1 = Y(simNo.hist[simNo.hist.length - 1]), y2 = Y(simAi.hist[simAi.hist.length - 1]);
    if (Math.abs(y1 - y2) < 15) { const m = (y1 + y2) / 2; y1 = m - 8; y2 = m + 8; }
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = ink2; ctx.font = '600 12px "JetBrains Mono",Consolas,monospace';
    ctx.fillText('Sin IA', w - r + 8, y1); ctx.fillText('Con IA', w - r + 8, y2);
  }
}

function loop() {
  frameN++;
  if (running) {
    const k = +$('speed').value;
    for (let i = 0; i < k; i++) { stepSim(simNo); stepSim(simAi); evCheck(simNo, 'SIN IA'); evCheck(simAi, 'CON IA'); }
    if (simNo.ended && simAi.ended) { running = false; $('btnPlay').textContent = '▶ Repetir'; }
    updateStats(); drawLive();
  }
  if (running || frameN % 6 === 0) drawAll();
  requestAnimationFrame(loop);
}
