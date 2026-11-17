// Servidor local mínimo para desarrollar (sin dependencias).
// Uso: node scripts/serve.mjs [puerto]   →   http://localhost:5173
// No hace falta para usar la página: index.html también funciona con doble clic.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { root } from './lib/secrets.mjs';

const PORT = Number(process.argv[2]) || 5173;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
// Nunca servir secretos ni archivos internos
const BLOCKED = /(^|[\\/])(\.firms_key|\.env|\.git|\.cache|node_modules)([\\/]|$)/;

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = normalize(join(root, path.endsWith('/') ? path + 'index.html' : path));
  if (!file.startsWith(root) || BLOCKED.test(file.slice(root.length))) { res.writeHead(403).end('Prohibido'); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch { res.writeHead(404).end('No encontrado'); }
}).listen(PORT, () => console.log(`Sirviendo en http://localhost:${PORT}`));
