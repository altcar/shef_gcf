/**
 * Wrangler uploads everything in `dist` as static assets, which would publish
 * the SSR bundle (`_worker.js`) and `_routes.json`. Keep them out of the asset
 * manifest so only real client files are public.
 */
import { writeFileSync } from 'node:fs';

writeFileSync(new URL('../dist/.assetsignore', import.meta.url), '_worker.js\n_routes.json\n');
console.log('wrote dist/.assetsignore');
