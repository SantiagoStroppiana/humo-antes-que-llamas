"use strict";
// ---------- Proyección 2040 ----------
let projTimer = null, mcToken = 0, mcResult = null, projRows = null;
function scheduleProjection() { clearTimeout(projTimer); projTimer = setTimeout(runMonteCarlo, 350); }
function runMonteCarlo() {
  const token = ++mcToken, p = { ...params };
  const res = { no: [], ai: [] }; let k = 0;
  $('mcProgress').textContent = 'Simulando 30 focos…';
  (function chunk() {
    if (token !== mcToken) return;
    const end = Math.min(MC_IGNITIONS.length, k + 3);
    for (; k < end; k++) {
      res.no.push(runHeadless(p, false, MC_IGNITIONS[k]).burned * CELL_HA);
      res.ai.push(runHeadless(p, true, MC_IGNITIONS[k]).burned * CELL_HA);
    }
    $('mcProgress').textContent = `Simulando focos… ${k}/${MC_IGNITIONS.length}`;
    if (k < MC_IGNITIONS.length) setTimeout(chunk, 0);
    else { mcResult = res; $('mcProgress').textContent = ''; updateProjection(); }
  })();
}
function updateProjection() {
  if (!mcResult) return;
  const focos = +$('focos').value;
  $('o-focos').textContent = focos;
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const mNo = mean(mcResult.no), mAi = mean(mcResult.ai);
  const esc = a => a.filter(v => v > 100).length / a.length;
  projRows = project(mNo, mAi, focos);
  const last = projRows[projRows.length - 1];
  $('k-no').textContent = fmtHa(last.no);
  $('k-ai').textContent = fmtHa(last.ai);
  $('k-no-s').textContent = `${Math.round(last.no / FOREST0 * 100)}% del bosque · ${fmtHa(mNo)} por foco en promedio · ${Math.round(esc(mcResult.no) * 100)}% de los focos supera 100 ha`;
  $('k-ai-s').textContent = `${Math.round(last.ai / FOREST0 * 100)}% del bosque · ${fmtHa(mAi)} por foco en promedio · ${Math.round(esc(mcResult.ai) * 100)}% de los focos supera 100 ha`;
  const diff = last.no - last.ai;
  $('k-diff').textContent = fmtHa(Math.max(0, diff));
  $('growthTxt').textContent = `×${fmt1(climateGrowth(Y1))} focos en 2040 respecto de 2026`;
  $('k-diff-s').textContent = diff > 0 ? `Equivale a unas ${(diff / 3825).toLocaleString('es-AR', { maximumFractionDigits: 1 })} veces el incendio de El Bolsón 2025 (3.825 ha).` : 'Con estos parámetros la IA no hace diferencia.';
  $('projTable').innerHTML = '<thead><tr><th>Año</th><th>Focos</th><th>Sin IA (acum.)</th><th>Con IA (acum.)</th><th>Diferencia</th></tr></thead><tbody>' +
    projRows.map(r => `<tr><td>${r.year}</td><td>${r.focos.toFixed(1).replace('.', ',')}</td><td>${fmtHa(r.no)}</td><td>${fmtHa(r.ai)}</td><td>${fmtHa(r.no - r.ai)}</td></tr>`).join('') + '</tbody>';
  drawChart();
}
$('focos').addEventListener('input', updateProjection);

// ---------- Gráfico ----------
let hoverIdx = -1;
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function niceMax(v) { if (v <= 0) return 1000; const p = 10 ** Math.floor(Math.log10(v)), m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; }
function chartGeom(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const narrow = w < 480;
  return { dpr, w, h, l: narrow ? 52 : 70, r: narrow ? 16 : 70, t: 14, b: 30 };
}
function drawChart() {
  const cv = $('chart'); if (!projRows) return;
  const g = chartGeom(cv), ctx = cv.getContext('2d');
  ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0); ctx.clearRect(0, 0, g.w, g.h);
  const ink2 = cssVar('--ink2'), muted = cssVar('--muted'), line = cssVar('--line'), cNo = cssVar('--noai'), cAi = cssVar('--ai'), surf = cssVar('--surface');
  const max = niceMax(Math.max(...projRows.map(r => r.no)) * 1.05);
  const pw = g.w - g.l - g.r, ph = g.h - g.t - g.b;
  const X = i => g.l + i / (projRows.length - 1) * pw, Y = v => g.t + ph - v / max * ph;
  ctx.font = '12px "JetBrains Mono",Consolas,monospace'; ctx.textBaseline = 'middle';
  for (let k = 0; k <= 4; k++) {
    const v = max * k / 4, y = Y(v);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.l, Math.round(y) + 0.5); ctx.lineTo(g.w - g.r, Math.round(y) + 0.5); ctx.stroke();
    ctx.fillStyle = muted; ctx.textAlign = 'right';
    ctx.fillText(v >= 1000 ? (v / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' mil ha' : Math.round(v) + ' ha', g.l - 8, y);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  projRows.forEach((r, i) => { if ((r.year - Y0) % (g.w < 480 ? 4 : 2) === 0) { ctx.fillStyle = muted; ctx.fillText(r.year, X(i), g.h - g.b + 8); } });
  if (hoverIdx >= 0) { ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Math.round(X(hoverIdx)) + 0.5, g.t); ctx.lineTo(Math.round(X(hoverIdx)) + 0.5, g.t + ph); ctx.stroke(); }
  for (const [key, col] of [['no', cNo], ['ai', cAi]]) {
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
    projRows.forEach((r, i) => i ? ctx.lineTo(X(i), Y(r[key])) : ctx.moveTo(X(i), Y(r[key]))); ctx.stroke();
    const li = hoverIdx >= 0 ? hoverIdx : projRows.length - 1;
    ctx.beginPath(); ctx.arc(X(li), Y(projRows[li][key]), 4, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = surf; ctx.stroke();
  }
  // etiquetas directas al final (solo si hay lugar)
  if (g.r >= 60) {
    const last = projRows[projRows.length - 1];
    let yNo = Y(last.no), yAi = Y(last.ai);
    if (Math.abs(yNo - yAi) < 16) { const m = (yNo + yAi) / 2; yNo = m - 8; yAi = m + 8; }
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = ink2; ctx.font = '600 12px "JetBrains Mono",Consolas,monospace';
    ctx.fillText('Sin IA', g.w - g.r + 10, yNo); ctx.fillText('Con IA', g.w - g.r + 10, yAi);
  }
}
function chartHover(e) {
  if (!projRows) return;
  const cv = $('chart'), r = cv.getBoundingClientRect(), g = chartGeom(cv);
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
  const pw = g.w - g.l - g.r;
  const i = Math.max(0, Math.min(projRows.length - 1, Math.round((x - g.l) / pw * (projRows.length - 1))));
  hoverIdx = i; drawChart();
  const row = projRows[i], tip = $('tip');
  tip.innerHTML = `<b>${row.year}</b> · ${row.focos.toFixed(1).replace('.', ',')} focos<div class="row"><span class="dot" style="background:var(--noai)"></span>Sin IA: <b>${fmtHa(row.no)}</b></div><div class="row"><span class="dot" style="background:var(--ai)"></span>Con IA: <b>${fmtHa(row.ai)}</b></div><div class="row muted">Diferencia: ${fmtHa(row.no - row.ai)}</div>`;
  tip.style.display = 'block';
  const px = g.l + i / (projRows.length - 1) * pw, tw = tip.offsetWidth;
  tip.style.left = Math.max(0, Math.min(g.w - tw, px + 12 > g.w - tw ? px - tw - 12 : px + 12)) + 'px';
  tip.style.top = '10px';
}
function chartLeave() { hoverIdx = -1; $('tip').style.display = 'none'; drawChart(); }
$('chart').addEventListener('mousemove', chartHover);
$('chart').addEventListener('touchstart', chartHover, { passive: true });
$('chart').addEventListener('touchmove', chartHover, { passive: true });
$('chart').addEventListener('mouseleave', chartLeave);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { drawChart(); drawLive(); drawClimate(); });
