import { writeFileSync } from 'node:fs';

writeFileSync('dist/.assetsignore', '_worker.js\n');
console.log('[post-build] Wrote dist/.assetsignore (keeps _worker.js out of public assets).');
