import { defineConfig } from 'astro/config';

import db from '@astrojs/db';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://surf-study.pages.dev',
  output: 'hybrid',
  adapter: cloudflare(),

  build: {
    assets: '_assets'
  },

  integrations: [db()]
});