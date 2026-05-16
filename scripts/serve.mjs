#!/usr/bin/env node
/**
 * Simple static file server for the dist/ directory.
 * Usage: node scripts/serve.mjs [port]
 */
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const PORT = parseInt(process.argv[2] || '3456', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url.endsWith('/')) url += 'index.html';
  if (!extname(url)) url += '.html';

  const filePath = join(DIST, url);

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    // Try without .html extension (for /bali/uluwatu → /bali/uluwatu.html)
    const altPath = filePath.replace(/\.html$/, '') + '/index.html';
    if (existsSync(altPath)) {
      const content = readFileSync(altPath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1><p>Page not found</p>');
    return;
  }

  const ext = extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  const content = readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': mime });
  res.end(content);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  ⚡ Surf Study serving at http://localhost:${PORT}\n`);
  console.log(`  Pages:`);
  console.log(`    http://localhost:${PORT}/              — Landing`);
  console.log(`    http://localhost:${PORT}/bali/          — Bali Issue`);
  console.log(`    http://localhost:${PORT}/hainan/        — Hainan Issue`);
  console.log(`    http://localhost:${PORT}/boards/        — Board Lab`);
  console.log(`    http://localhost:${PORT}/bali/uluwatu   — Entry page example`);
  console.log(`\n  Press Ctrl+C to stop.\n`);
});
