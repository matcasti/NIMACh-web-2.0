/**
 * NIM-ACh — PublicationsEnricher
 * Consulta OpenAlex (gratuito, sin API key) para enriquecer
 * las publicaciones de NIMACH_DATA con citas reales.
 * Consulta por lotes (≈2 peticiones para ~90 DOIs) y cachea 24 h
 * en localStorage; si la API falla, usa la última copia guardada.
 */
class PublicationsEnricher {
  constructor() {
    this.API   = 'https://api.openalex.org/works';
    this.CACHE = 'nimach:openalex:v2';
    this.TTL   = 24 * 60 * 60 * 1000;     // 24 h
    this.BATCH = 40;                      // DOIs por petición
    // Placeholder DOIs no se consultan
    this.SKIP = /^10\.XXXX/;
    this.enrich();
  }

  /** Normaliza un DOI (con o sin https://doi.org/) a minúsculas */
  norm(doi) {
    return String(doi || '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim().toLowerCase();
  }

  readCache() {
    try {
      const c = JSON.parse(localStorage.getItem(this.CACHE) || 'null');
      return c && c.data ? c : null;
    } catch { return null; }
  }

  writeCache(data) {
    try { localStorage.setItem(this.CACHE, JSON.stringify({ ts: Date.now(), data })); } catch {}
  }

  async enrich() {
    // Siempre actualizar los contadores síncronos (total, Q1)
    // independientemente de si hay DOIs válidos.
    this.renderMetrics();

    const pubs = window.NIMACH_DATA.publications.filter(
      p => p.doi && !this.SKIP.test(p.doi)
    );
    if (!pubs.length) return; // sin DOIs reales → citas y h-index quedan en 0

    const dois  = [...new Set(pubs.map(p => this.norm(p.doi)))];
    const cache = this.readCache();
    const fresh = cache && (Date.now() - cache.ts) < this.TTL &&
                  dois.every(d => d in cache.data);

    // Caché vigente → 0 peticiones. Si no, lotes de 40 (≈2 peticiones en vez de ~80).
    let data = fresh ? cache.data : await this.fetchAll(dois);
    // Sin red / API saturada → usar lo último que tengamos, aunque esté vencido
    if (!Object.keys(data).length && cache) data = cache.data;
    if (!fresh && Object.keys(data).length) this.writeCache({ ...(cache ? cache.data : {}), ...data });

    pubs.forEach(pub => {
      const d = data[this.norm(pub.doi)];
      if (!d) return;
      pub.citations = d.c ?? 0;
      pub.oa_url    = d.oa  || null;
      pub.pdf_url   = d.pdf || null;
      this.updateCard(pub);
    });

    // Segunda pasada con citas reales ya asignadas
    this.renderMetrics();

    // Si la página tiene filtros/orden, reaplicarlos ahora que hay citas (p. ej. "Más citadas")
    if (window.NIMPage && document.getElementById('pub-page-list')) NIMPage._applyPubFilters(true);
  }

  /** Consulta OpenAlex por lotes. Varias instancias simultáneas comparten UNA sola consulta. */
  fetchAll(dois) {
    const key = dois.join(',');
    const p = PublicationsEnricher._pending;
    if (p && p.key === key) return p.promise;
    const promise = this._fetchBatches(dois).finally(() => { PublicationsEnricher._pending = null; });
    PublicationsEnricher._pending = { key, promise };
    return promise;
  }

  /** filter=doi:a|b|c en lotes de BATCH */
  async _fetchBatches(dois) {
    const out = {};
    for (let i = 0; i < dois.length; i += this.BATCH) {
      const chunk = dois.slice(i, i + this.BATCH);
      const filter = 'doi:' + chunk.map(encodeURIComponent).join('|');
      const url = `${this.API}?filter=${filter}&per-page=${this.BATCH}` +
                  '&select=doi,cited_by_count,open_access,best_oa_location';
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const json = await res.json();
        (json.results || []).forEach(w => {
          out[this.norm(w.doi)] = {
            c:   w.cited_by_count ?? 0,
            oa:  w.open_access?.oa_url ?? null,
            pdf: w.best_oa_location?.pdf_url ?? null,
          };
        });
      } catch { /* sin red: seguimos con lo que haya */ }
    }
    return out;
  }

  updateCard(pub) {
    // Encuentra la card por título
    document.querySelectorAll('.pub-card').forEach(card => {
      const titleEl = card.querySelector('.pub-title');
      if (!titleEl || !titleEl.textContent.includes(pub.title.slice(0, 30))) return;

      card.dataset.cites = pub.citations || 0;   // permite ordenar por "Más citadas"

      // Añadir badge de citas si no existe
      const journalEl = card.querySelector('.pub-journal');
      if (journalEl && pub.citations !== undefined && !card.querySelector('.pub-cites')) {
        const badge = document.createElement('span');
        badge.className = 'pub-cites';
        badge.textContent = `${pub.citations} cit.`;
        badge.title = 'Citas según OpenAlex';
        journalEl.appendChild(badge);
      }

      // Enlace OA
      if (pub.oa_url && !card.querySelector('.pub-oa')) {
        const body   = card.querySelector('.pub-actions') || card.querySelector('.pub-body');
        const link   = document.createElement('a');
        link.className = 'pub-oa';
        link.href      = pub.pdf_url || pub.oa_url;
        link.target    = '_blank';
        link.rel       = 'noopener';
        link.textContent = '↓ PDF abierto';
        body.appendChild(link);
      }
    });
  }

  /** Calcula h-index y actualiza el dashboard de métricas */
  renderMetrics() {
    const pubs   = window.NIMACH_DATA.publications || [];
    const counts = pubs.map(p => p.citations ?? 0).sort((a, b) => b - a);

    // h-index
    let h = 0;
    counts.forEach((c, i) => { if (c >= i + 1) h = i + 1; });
    const total   = counts.reduce((s, c) => s + c, 0);
    const pubLen  = pubs.length;
    const q1Count = pubs.filter(p => p.quartile === 'Q1').length;

    // Exponer en data global
    window.NIMACH_DATA.metrics = { h, total, counts, pubLen, q1Count };

    // IDs compartidos entre index.html, #metricas y pages/publicaciones.html
    const targets = [
      ['metric-hindex',     h],
      ['metric-citations',  total],
      ['metric-pub-count',  pubLen],
      // Página publicaciones.html
      ['ps-total',          pubLen],
      ['ps-cites',          total],
      ['ps-hindex',         h],
      ['ps-q1',             q1Count],
    ];

    targets.forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) this.animateCount(el, val);
    });

    // Open-access count (derived from OpenAlex enrichment)
    const oaCount = pubs.filter(p => p.oa_url).length;
    const oaEl = document.getElementById('ps-oa');
    if (oaEl) this.animateCount(oaEl, oaCount);

    // Trigger citations h-index chart now that OpenAlex data is ready
    if (window.NIMPage && typeof NIMPage._renderCitationsChart === 'function') {
      NIMPage._renderCitationsChart();
    }

    // También forzar actualización del StatAnimator (hero rings)
    // si ya se triggereó (el observer desconectó), re-run con datos frescos
    if (window._nimachStatAnimator?.triggered) {
      window._nimachStatAnimator.run();
    }
  }

  animateCount(el, target) {
    const start = performance.now();
    const dur   = 1000;
    const step  = ts => {
      const p = Math.min((ts - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(e * target);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

window.PublicationsEnricher = PublicationsEnricher;
