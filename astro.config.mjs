import { defineConfig } from 'astro/config';

import db from '@astrojs/db';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://surf-study.jkjking987.workers.dev',
  output: 'hybrid',
  adapter: cloudflare({ imageService: 'passthrough' }),

  build: {
    assets: '_assets'
  },

  integrations: [db(), sitemap()]
});