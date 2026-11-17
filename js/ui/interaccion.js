"use strict";
// Botones de la simulación, clic en los visores y redimensionado.
$('btnPlay').addEventListener('click', () => {
  if (simNo.ended && simAi.ended) resetSims();
  running = !running;
  $('btnPlay').textContent = running ? '⏸ Pausa' : '▶ Seguir';
});
$('btnReset').addEventListener('click', resetSims);
$('btnRandom').addEventListener('click', () => {
  let i;
  do { i = Math.floor(Math.random() * N); } while (FUEL[type[i]] === 0 || type[i] === TOWN);
  ignition = i; resetSims(); running = true; $('btnPlay').textContent = '⏸ Pausa';
});
function cellFromEvent(cv, e) {
  const r = cv.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left) / r.width * W), y = Math.floor((e.clientY - r.top) / r.height * H);
  if (x < 0 || y < 0 || x >= W || y >= H) return -1;
  return y * W + x;
}
for (const v of views) {
  v.cv.addEventListener('click', e => {
    const i = cellFromEvent(v.cv, e);
    if (i < 0) return;
    if (FUEL[type[i]] === 0) { $('mapHint').textContent = `Ahí hay ${TYPE_NAME[type[i]].toLowerCase()}: no hay nada que arda. Elegí otro punto.`; return; }
    ignition = i; resetSims(); running = true; $('btnPlay').textContent = '⏸ Pausa';
    $('mapHint').textContent = `Foco en ${TYPE_NAME[type[i]].toLowerCase()}. Tocá otro punto para probar de nuevo.`;
  });
  v.cv.addEventListener('mousemove', e => {
    const i = cellFromEvent(v.cv, e);
    if (i >= 0 && !running) $('mapHint').textContent = `${TYPE_NAME[type[i]]} · a ${(distTown[i] * 0.2).toFixed(1).replace('.', ',')} km de las casas` + (v.ai ? (cameraFor(i, params.cams) >= 0 ? ' · visible por una cámara' : ' · fuera del alcance de las cámaras') : '');
  });
  v.cv.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('btnPlay').click(); } });
}
window.addEventListener('resize', () => { drawAll(); drawChart(); drawLive(); drawClimate(); drawFirms(); });
