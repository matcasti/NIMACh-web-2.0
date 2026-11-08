#!/usr/bin/env node
/**
 * Regenera js/site-data.js a partir de data/site.json (valida y sanea en el camino).
 * Úsalo si editaste data/site.json a mano:   node scripts/build-data.mjs
 * (El editor del sitio ya lo hace solo cada vez que guardas.)
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSite, writeSite } from './lib/site-io.mjs';
import { cleanSite } from './lib/validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const site = cleanSite(await readSite(ROOT));
  await writeSite(ROOT, site);
  console.log('✓ js/site-data.js regenerado desde data/site.json');
} catch (e) {
  console.error('✗', e.message);
  process.exit(1);
}
