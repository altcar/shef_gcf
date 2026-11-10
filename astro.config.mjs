// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://gcf.hheylau.workers.dev',
  output: 'server',
  adapter: cloudflare({
    // Static assets are served straight from the Workers assets binding.
    imageService: 'passthrough',
    platformProxy: { enabled: true },
  }),
});
