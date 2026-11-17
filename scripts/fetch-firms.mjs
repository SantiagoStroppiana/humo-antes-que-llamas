// Descarga los focos de calor VIIRS de NASA FIRMS para la zona de la comarca andina
// y genera js/data/firms.js (datos compactos que usa la página).
//
// Uso:  node scripts/fetch-firms.mjs [desde AAAA-MM-DD] [hasta AAAA-MM-DD]
// Clave: variable FIRMS_MAP_KEY, archivo .env o archivo .firms_key (nunca se sube al repo).
// API: https://firms.modaps.eosdis.nasa.gov/api/area/  (ventanas de hasta 5 días)

import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { firmsKey, redact, root } from './lib/secrets.mjs';

const SOURCE = 'VIIRS_SNPP_SP';                 // procesamiento estándar, serie homogénea desde 2012
const BBOX = '-72.45,-43.1,-70.95,-40.95';      // oeste,sur,este,norte: mismo recuadro que el mapa
const FROM = process.argv[2] || '2012-01-20';
const TO = process.argv[3] || '2026-07-31';
if (![FROM, TO].every(d => /^\d{4}-\d{2}-\d{2}$/.test(d))) throw new Error('Fechas inválidas: usá el formato AAAA-MM-DD.');
const DAYS = 5;                                  // la API acepta de 1 a 5 días por consulta
const CACHE = join(root, '.cache', 'firms');    // respuestas crudas, ignoradas por git
const OUT = join(root, 'js', 'data', 'firms.js');

const key = firmsKey();
mkdirSync(CACHE, { recursive: true });
const day = d => new Date(d + 'T00:00:00Z');
const iso = t => new Date(t).toISOString().slice(0, 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Cupo de FIRMS: 5000 transacciones cada 10 minutos (cada consulta de 5 días cuenta 10).
// Al agotarse, la API responde "Invalid MAP_KEY", así que se consulta el estado real del cupo.
let okOnce = false;   // si la clave ya funcionó en esta corrida, un 401 es cupo agotado, no clave inválida
async function quotaExhausted() {
  try {
    const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/mapserver/mapkey_status/?MAP_KEY=${key}`);
    const s = await r.json();
    return s.current_transactions + 10 > s.transaction_limit || okOnce;
  } catch { return false; }
}

async function window(start) {
  const file = join(CACHE, `${SOURCE}_${start}.csv`);
  if (existsSync(file)) return readFileSync(file, 'utf8');
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${SOURCE}/${BBOX}/${DAYS}/${start}`;
  for (let t = 0; t < 20; t++) {
    let wait = 5000 * Math.min(t + 1, 6);
    try {
      const r = await fetch(url);
      const text = await r.text();
      if (r.ok && text.startsWith('latitude')) { okOnce = true; writeFileSync(file, text); return text; }
      if (/transaction limit/i.test(text) || (/Invalid MAP_KEY/i.test(text) && await quotaExhausted())) {
        // FIRMS limita las consultas por clave cada 10 minutos: esperar a que se renueve el cupo
        wait = 90000;
        console.log(`\n  ${start}: límite de consultas de FIRMS alcanzado, espero 90 s…`);
      } else {
        if (r.status === 400) throw new Error(redact(text, key).slice(0, 200));
        console.log(`  reintento ${start}: HTTP ${r.status} ${redact(text, key).slice(0, 100)}`);
      }
    } catch (e) { if (/day range|Invalid/.test(e.message)) throw e; console.log(`  reintento ${start}: ${redact(e.message, key)}`); }
    await sleep(wait);
  }
  throw new Error('No se pudo descargar la ventana ' + start);
}

const rows = [];
for (let t = day(FROM).getTime(); t <= day(TO).getTime(); t += DAYS * 864e5) {
  const start = iso(t), csv = await window(start);
  const [head, ...lines] = csv.trim().split('\n');
  const cols = head.split(',');
  const at = name => cols.indexOf(name);
  const iLat = at('latitude'), iLon = at('longitude'), iDate = at('acq_date'), iFrp = at('frp'), iConf = at('confidence'), iDn = at('daynight');
  for (const line of lines) {
    if (!line) continue;
    const c = line.split(',');
    if (c[iDate] > TO) continue;
    if (c[iConf] === 'l') continue;              // se descartan las detecciones de confianza baja
    rows.push([+(+c[iLat]).toFixed(3), +(+c[iLon]).toFixed(3), c[iDate], +(+c[iFrp]).toFixed(1), c[iConf], c[iDn]]);
  }
  process.stdout.write(`\r${start}  focos acumulados: ${rows.length}   `);
  await sleep(250);
}

// Formato compacto: [lat, lon, días desde 2012-01-01, potencia radiativa (MW), confianza l/n/h, d/n]
const EPOCH = day('2012-01-01').getTime();
rows.sort((a, b) => a[2] < b[2] ? -1 : 1);
const compact = rows.map(r => [r[0], r[1], Math.round((day(r[2]).getTime() - EPOCH) / 864e5), r[3], r[4], r[5]]);
const header = `// Focos de calor VIIRS (Suomi NPP, procesamiento estándar) de NASA FIRMS.
// Zona: ${BBOX} (oeste, sur, este, norte). Período: ${FROM} a ${TO}. ${compact.length} focos (sin los de confianza baja).
// Generado por scripts/fetch-firms.mjs el ${iso(Date.now())}. Datos: NASA FIRMS (https://firms.modaps.eosdis.nasa.gov/).
// Columnas: [latitud, longitud, días desde 2012-01-01, potencia radiativa del fuego en MW, confianza (l/n/h), día/noche (D/N)]
`;
mkdirSync(join(root, 'js', 'data'), { recursive: true });
writeFileSync(OUT, header + `const FIRMS = { epoch: '2012-01-01', from: '${FROM}', to: '${TO}', source: '${SOURCE}', rows: ${JSON.stringify(compact)} };\n`);
console.log(`\nListo: ${compact.length} focos en ${OUT}`);
