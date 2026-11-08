/**
 * NIM-ACh — Site Data (lógica)
 *
 * Los DATOS ya no viven aquí: están en data/site.json y se publican en js/site-data.js
 * (archivo generado). Edítalos con el editor del sitio ("Editar sitio.command" o
 * `node scripts/admin.mjs`); ver docs/EDITOR.md.
 *
 * Este archivo solo toma esos datos y deriva lo que la web necesita:
 *   · oculta enlaces pendientes ('#')            → NIMACH_DATA.pendingLinks
 *   · deja solo los puntos activos del mapa      → NIMACH_DATA.globePoints
 *   · calcula los países colaboradores           → NIMACH_DATA.collabCountries
 */
const NIMACH_DATA = window.__SITE_DATA__ || {};
if (!window.__SITE_DATA__) console.error('[NIM-ACh] Falta js/site-data.js (ejecuta: node scripts/build-data.mjs)');
NIMACH_DATA.publications = NIMACH_DATA.publications || [];   // se llena en vivo desde data/publications.bib

/* ─── Enlaces pendientes ───────────────────────────────────────────
   Los '#' son marcadores de "URL por completar". En vez de mostrar botones
   que no llevan a ningún sitio, se ocultan hasta que se escriba la URL real.
   Para ver qué falta: NIMACH_DATA.pendingLinks (en la consola del navegador). */
(function (D) {
  const bad = v => !v || v === '#';
  const pending = [];
  [...(D.people || []), ...(D.alumni || [])].forEach(p => {
    Object.keys(p.links || {}).forEach(k => {
      if (bad(p.links[k])) { pending.push(`${p.name} → ${k}`); delete p.links[k]; }
    });
  });
  (D.tools || []).forEach(t => ['url', 'github', 'docs'].forEach(k => {
    if (k in t && bad(t[k])) { pending.push(`${t.title} → ${k}`); delete t[k]; }
  }));
  (D.collaborators || []).forEach(c => {
    if (bad(c.url)) { pending.push(`Colaborador ${c.name} → url`); delete c.url; }
  });
  D.pendingLinks = pending;

  // Países colaboradores: UNA sola fuente para el hero, las métricas y el mapa
  D.globePoints = (D.globePoints || []).filter(p => p.active !== false);
  D.collabCountries = [...new Set(
    D.globePoints.filter(p => !p.home && p.country && p.country !== D.homeCountry).map(p => p.country)
  )];
})(NIMACH_DATA);

window.NIMACH_DATA = NIMACH_DATA;
