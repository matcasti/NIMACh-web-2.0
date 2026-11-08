/**
 * Lectura y escritura de la data del sitio.
 *   data/site.json     ← fuente editable (la usa el editor)
 *   js/site-data.js    ← GENERADO a partir del JSON; es lo que carga la web
 */
import { readFile, writeFile, mkdir, readdir, copyFile, unlink } from 'node:fs/promises';
import path from 'node:path';

export const paths = root => ({
  site:    path.join(root, 'data', 'site.json'),
  js:      path.join(root, 'js', 'site-data.js'),
  insta:   path.join(root, 'data', 'instagram.json'),
  bib:     path.join(root, 'data', 'publications.bib'),
  backups: path.join(root, '.admin-backups'),
});

export const HEADER = `/* ARCHIVO GENERADO — no lo edites a mano.
   Se crea a partir de data/site.json cada vez que guardas en el editor del sitio
   (doble clic en "Editar sitio.command" / "Editar sitio.bat", o: node scripts/admin.mjs).
   Para regenerarlo sin el editor: node scripts/build-data.mjs */
`;

export function renderSiteData(site) {
  // "</script" y los separadores de línea Unicode no pueden aparecer crudos dentro de un <script>
  const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
  const json = JSON.stringify(site, null, 2)
    .replace(/<\/(script)/gi, '<\\/$1')
    .split(LS).join('\\u2028').split(PS).join('\\u2029');
  return `${HEADER}window.__SITE_DATA__ = ${json};\n`;
}

export async function readSite(root) {
  return JSON.parse(await readFile(paths(root).site, 'utf8'));
}

/** Guarda una copia del estado anterior (últimas 30) y escribe JSON + js generado */
export async function writeSite(root, site) {
  const p = paths(root);
  await mkdir(p.backups, { recursive: true });
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await copyFile(p.site, path.join(p.backups, `site-${stamp}.json`));
    const olds = (await readdir(p.backups)).filter(f => /^site-.*\.json$/.test(f)).sort();
    for (const f of olds.slice(0, Math.max(0, olds.length - 30))) await unlink(path.join(p.backups, f));
  } catch { /* primera vez: no hay nada que respaldar */ }
  await mkdir(path.dirname(p.site), { recursive: true });
  await writeFile(p.site, JSON.stringify(site, null, 2) + '\n');
  await writeFile(p.js, renderSiteData(site));
}
