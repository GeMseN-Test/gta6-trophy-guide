// Leonida Ledger dev server — serves app/ on localhost only, no build step.
// Usage: node serve.ts [--port 8091]
// It answers only files inside app/, sends the MIME type a browser needs for each
// extension, and refuses anything that would walk out of app/ (403) or is missing (404).
// Nothing here is for the internet: bind is loopback, no logging, no directory listing.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

function pickPort(argv: string[]): number {
  const i = argv.indexOf('--port');
  const raw = i === -1 ? NaN : Number(argv[i + 1]);
  return Number.isInteger(raw) && raw > 0 && raw < 65536 ? raw : 8091;
}

const mimeFor = (file: string): string => {
  switch (extname(file).toLowerCase()) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': case '.mjs': return 'text/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.ico': return 'image/x-icon';
    case '.woff2': return 'font/woff2';
    default: return 'application/octet-stream';
  }
};

function safePath(urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.endsWith('/')) decoded += 'index.html';
  const resolved = resolve(join(appRoot, normalize(decoded)));
  if (resolved !== appRoot && !resolved.startsWith(appRoot + sep)) return null;
  return resolved;
}

const server = createServer((req, res) => {
  const target = new URL(req.url ?? '/', 'http://localhost').pathname;
  const file = safePath(target);
  if (file === null) {
    res.writeHead(403).end('forbidden');
    return;
  }
  let bytes: number;
  try {
    const st = statSync(file);
    if (!st.isFile()) throw new Error('not a file');
    bytes = st.size;
  } catch {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': mimeFor(file),
    'content-length': bytes,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

const port = pickPort(process.argv.slice(2));
server.listen(port, '127.0.0.1', () => {
  console.log(`Leonida Ledger app/ is on http://localhost:${port}`);
});
