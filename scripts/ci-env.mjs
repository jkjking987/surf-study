import { writeFileSync, existsSync } from 'node:fs';

const keys = ['ASTRO_DB_REMOTE_URL', 'ASTRO_DB_APP_TOKEN'];

if (existsSync('.env')) {
  console.log('[ci-env] .env exists, leaving it alone.');
  process.exit(0);
}

const missing = keys.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[ci-env] No .env and missing env vars: ${missing.join(', ')}`);
  console.error('[ci-env] On Cloudflare Pages: Settings → Variables and secrets → add for Production.');
  process.exit(1);
}

writeFileSync('.env', keys.map((k) => `${k}=${process.env[k]}`).join('\n') + '\n');
console.log(`[ci-env] Wrote ${keys.length} vars to .env from process.env.`);
