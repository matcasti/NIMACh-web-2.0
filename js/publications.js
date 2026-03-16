/**
 * NIM-ACh — PublicationsEnricher
 * Consulta OpenAlex (gratuito, sin API key) para enriquecer
 * las publicaciones de NIMACH_DATA con citas reales.
 * Cache en sessionStorage para evitar requests redundantes.
 */
class PublicationsEnricher {
  constructor() {
    this.BASE = 'https://api.openalex.org/works/https://doi.org/';
    // Placeholder DOIs no se consultan
    this.SKIP = /^10\.XXXX/;
    this.enrich();
  }

  async enrich() {
    const pubs = window.NIMACH_DATA.publications.filter(
      p => p.doi && !this.SKIP.test(p.doi)
    );
    if (!pubs.length) return;

    const results = await Promise.allSettled(pubs.map(p => this.fetch(p.doi)));

    results.forEach((res, i) => {
      if (res.status !== 'fulfilled' || !res.value) return;
      const data = res.value;
      const pub  = pubs[i];

      pub.citations = data.cited_by_count ?? 0;
      pub.oa_url    = data.open_access?.oa_url  ?? null;
      pub.pdf_url   = data.best_oa_location?.pdf_url ?? null;

      this.updateCard(pub);
    });

    this.renderMetrics();
  }

  async fetch(doi) {
    const key    = `oa:${doi}`;
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached);

    try {
      const res  = await fetch(`${this.BASE}${doi}`, {
        headers: { 'User-Agent': 'NIM-ACh/1.0 (nimach.org)' }
      });
      if (!res.ok) return null;
      const data = await res.json();
      sessionStorage.setItem(key, JSON.stringify(data));
      return data;
    } catch { return null; }
  }

  updateCard(pub) {
    // Encuentra la card por título
    document.querySelectorAll('.pub-card').forEach(card => {
      const titleEl = card.querySelector('.pub-title');
      if (!titleEl || !titleEl.textContent.includes(pub.title.slice(0, 30))) return;

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
        const body   = card.querySelector('.pub-body');
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
    const counts = window.NIMACH_DATA.publications
      .map(p => p.citations ?? 0)
      .sort((a, b) => b - a);

    // h-index
    let h = 0;
    counts.forEach((c, i) => { if (c >= i + 1) h = i + 1; });

    const total = counts.reduce((s, c) => s + c, 0);

    // Actualizar elementos del dashboard (Feature I.2)
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) this.animateCount(el, val);
    };
    set('metric-hindex',     h);
    set('metric-citations',  total);
    set('metric-pub-count',  window.NIMACH_DATA.publications.length);

    // Exponer en data global para otros módulos
    window.NIMACH_DATA.metrics = { h, total, counts };
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
