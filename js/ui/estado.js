// Utilidades, parámetros, escenarios y retos de la interfaz.
"use strict";
const $ = id => document.getElementById(id);
const fmtHa = v => Math.round(v).toLocaleString('es-AR') + ' ha';
const fmtMin = m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
const DRY_LABEL = ['Húmeda', 'Moderada', 'Seca', 'Muy seca', 'Extrema'];
const WIND_LABEL = { O: 'del Oeste', NO: 'del Noroeste', N: 'del Norte', S: 'del Sur', E: 'del Este' };

const params = { cams: 6, resp: 60, wind: 30, windDir: 'O', dry: 4, fa: 2 };
const PRESETS = {
  tipico: { cams: 6, resp: 60, wind: 30, windDir: 'O', dry: 4, fa: 2 },
  extremo: { cams: 6, resp: 60, wind: 60, windDir: 'NO', dry: 5, fa: 2 },
  favorable: { cams: 6, resp: 45, wind: 10, windDir: 'O', dry: 2, fa: 2 },
  sinCam: { cams: 0, resp: 60, wind: 30, windDir: 'O', dry: 4, fa: 2 }
};
const DEMO_IGN = 64 + 39 * W;    // bosque nativo a ~1,2 km del pueblo, visto por una cámara
const BLIND_IGN = 64 + 10 * W;   // al norte, fuera del alcance de las 2 primeras cámaras
const RETOS = [
  { t: '1 · La IA en su mejor día', p: PRESETS.tipico, ign: DEMO_IGN,
    lesson: 'Con una cámara que ve el foco y una brigada a una hora, el fuego se apaga chico. Ese es el mejor caso de la detección temprana.' },
  { t: '2 · La brigada tarda', p: { ...PRESETS.tipico, resp: 150 }, ign: DEMO_IGN,
    lesson: 'La cámara detectó igual de rápido, pero con 2 h 30 min de respuesta el fuego ya era grande al llegar la brigada. Sin brigadas cerca, la IA solo avisa antes de algo que no se puede frenar.' },
  { t: '3 · Viento extremo', p: PRESETS.extremo, ign: DEMO_IGN,
    lesson: 'Con viento fuerte y bosque seco, el frente crece más rápido de lo que una brigada lo puede apagar, con o sin IA. Por eso la prevención y el manejo del combustible son tan importantes como la tecnología.' },
  { t: '4 · Punto ciego', p: { ...PRESETS.tipico, cams: 2 }, ign: BLIND_IGN,
    lesson: 'Con pocas cámaras, este foco quedó fuera de su alcance y el sistema dependió del satélite o de los vecinos. Dónde se ponen las torres importa tanto como cuántas hay.' },
  { t: '5 · Demasiadas falsas alarmas', p: { ...PRESETS.tipico, fa: 10 }, ign: DEMO_IGN,
    lesson: 'Con 10 falsas alarmas por día, el operador tarda más en confirmar y la brigada a veces está atendiendo una falsa. La ventaja de la IA casi desaparece: la precisión del modelo importa tanto como su velocidad.' }
];
let activeReto = -1, caseNote = null;
