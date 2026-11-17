// Descarga el clima diario de El Bolsón (Open-Meteo Historical Weather API, reanálisis ERA5)
// y lo resume por verano (diciembre a febrero) en js/data/clima.js.
// Uso: node scripts/fetch-clima.mjs      (no necesita clave)
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './lib/secrets.mjs';

const URL = 'https://archive-api.open-meteo.com/v1/archive?latitude=-41.96&longitude=-71.53' +
  '&start_date=1980-12-01&end_date=2026-02-28' +
  '&daily=temperature_2m_max,precipitation_sum,relative_humidity_2m_min,wind_speed_10m_max,et0_fao_evapotranspiration' +
  '&timezone=America%2FArgentina%2FBuenos_Aires&wind_speed_unit=kmh';

const r = await fetch(URL);
if (!r.ok) throw new Error('Open-Meteo respondió ' + r.status);
const d = (await r.json()).daily;
const S = {};
for (let i = 0; i < d.time.length; i++) {
  const [y, m] = d.time[i].split('-').map(Number);
  if (!(m === 12 || m <= 2)) continue;
  const s = m === 12 ? y + 1 : y;                       // el verano lleva el año de enero
  const o = S[s] || (S[s] = { n: 0, tx: 0, p: 0, d30: 0, risk: 0, def: 0 });
  const tx = d.temperature_2m_max[i], rh = d.relative_humidity_2m_min[i], p = d.precipitation_sum[i];
  o.n++; o.tx += tx; o.p += p; if (tx >= 30) o.d30++;
  if (tx >= 27 && rh <= 25) o.risk++;                   // "día de peligro": calor y aire seco
  o.def += d.et0_fao_evapotranspiration[i] - p;
}
const rows = Object.entries(S).map(([s, o]) => [+s, +(o.tx / o.n).toFixed(2), Math.round(o.p), o.d30, o.risk, Math.round(o.def)]);
const out = `"use strict";
// ---------- Datos reales: veranos (dic–feb) de El Bolsón, 1981–2026 ----------
// Fuente: Open-Meteo Historical Weather API (reanálisis ERA5), lat -41.96, lon -71.53,
// ${d.time.length.toLocaleString('es-AR')} días diarios procesados. Columnas: [verano (año de enero), temp. máx. media °C,
// lluvia total mm, días con máx ≥ 30 °C, días de peligro (máx ≥ 27 °C y humedad mín ≤ 25%), déficit hídrico mm]
// Generado por scripts/fetch-clima.mjs.
const CLIMATE = ${JSON.stringify(rows)};
`;
writeFileSync(join(root, 'js', 'data', 'clima.js'), out);
console.log(`Listo: ${rows.length} veranos a partir de ${d.time.length} días.`);
