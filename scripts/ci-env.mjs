import { writeFileSync, existsSync } from 'node:fs';

if (!process.env.CF_PAGES) {
  process.exit(0);
}

const keys = ['ASTRO_DB_REMOTE_URL', 'ASTRO_DB_APP_TOKEN'];
const missing = keys.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[ci-env] Missing required env vars: ${missing.join(', ')}`);
  console.error('[ci-env] Set them in Cloudflare Pages → Settings → Variables and secrets.');
  process.exit(1);
}

const lines = keys.map((k) => `${k}=${process.env[k]}`);
writeFileSync('.env', lines.join('\n') + '\n');
console.log(`[ci-env] Wrote ${keys.length} vars to .env (CF Pages build).`);
