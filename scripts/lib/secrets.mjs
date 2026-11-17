// Lee la clave de NASA FIRMS sin mostrarla nunca en pantalla ni guardarla en el repo.
// Orden: variable de entorno FIRMS_MAP_KEY (GitHub Actions) → archivo .env → archivo .firms_key.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function firmsKey() {
  if (process.env.FIRMS_MAP_KEY) return process.env.FIRMS_MAP_KEY.trim();
  const env = join(root, '.env');
  if (existsSync(env)) {
    const m = readFileSync(env, 'utf8').match(/^FIRMS_MAP_KEY=(.+)$/m);
    if (m && !m[1].includes('pegá')) return m[1].trim();
  }
  const file = join(root, '.firms_key');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  throw new Error('Falta la clave de FIRMS: definí FIRMS_MAP_KEY o creá .firms_key (ver .env.example).');
}

// Para mensajes de error: reemplaza la clave por asteriscos si aparece en un texto.
export function redact(text, key) { return key ? String(text).split(key).join('****') : String(text); }
export { root };
