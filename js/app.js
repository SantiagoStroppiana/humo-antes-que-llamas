"use strict";
// Punto de entrada: caso real del encabezado e inicio de la página.
// ---------- Caso real desde el encabezado ----------
$('btnCase').addEventListener('click', () => {
  ignition = DEMO_IGN;
  applyDay(REAL_DAYS[2], 2);   // 30/1/2025, Mallín Ahogado: clima real de Open-Meteo
  caseNote = 'el 30/01/2025 en Mallín Ahogado hubo 29 °C, 14% de humedad y ráfagas de 53 km/h tras dos semanas casi sin lluvia: un día extremo. Con ese clima, detectar antes reduce el daño pero no evita un incendio grande. El incendio real afectó unas 3.825 ha.';
  $('speed').value = '3';
  $('simulacion').scrollIntoView({ behavior: 'smooth' });
  running = true; $('btnPlay').textContent = '⏸ Pausa';
});

if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawAll(); drawChart(); drawLive(); drawClimate(); drawFirms(); });

// ---------- Inicio ----------
ignition = pickDefaultIgnition();
const fromURL = readScenarioFromURL();
setControls(); syncOutputs(); resetSims(); scheduleProjection(); initClimate(); initEonet(); initFirms();
if (fromURL) { $('mapHint').textContent = 'Abriste un escenario compartido. Apretá ▶ Iniciar para verlo.'; setTimeout(() => $('simulacion').scrollIntoView(), 50); }
requestAnimationFrame(loop);
