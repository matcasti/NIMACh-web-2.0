/**
 * NIM-ACh — BibTeXParser
 * Lee un archivo .bib y popula NIMACH_DATA.publications,
 * renderiza pub-cards y reconecta el filtro + OpenAlex enricher.
 *
 * Uso desde main.js:
 *   new BibTeXParser('data/publications.bib');
 *
 * Campos BibTeX reconocidos → schema interno:
 *   year, title, author, journal/booktitle, doi, url,
 *   keywords (comma-sep → topics[]), note (quartile: Q1/Q2/Q3)
 */
class BibTeXParser {

  constructor(bibUrl) {
    this.bibUrl = bibUrl;
    this.load();
  }

  /* ── Carga y parsea ── */
  async load() {
    try {
      const res  = await fetch(this.bibUrl);
      if (!res.ok) throw new Error(`BibTeX fetch failed: ${res.status}`);
      const text = await res.text();
      const pubs = this.parse(text);
      this._mergeToDATAStore(pubs);
      this._render(pubs);
      // Reconectar filtro (los botones ya están en DOM)
      initPubFilter();
      // Reconectar OpenAlex enricher
      new PublicationsEnricher();
    } catch (e) {
      console.warn('[BibTeXParser]', e.message);
    }
  }

  /* ── Parser principal ── */
  parse(text) {
    const entries = [];
    // Divide en bloques @TYPE{...}
    const blockRe = /@(\w+)\s*\{\s*([^,]+)\s*,([^@]*)\}/gs;
    let m;
    while ((m = blockRe.exec(text)) !== null) {
      const type = m[1].toLowerCase();
      if (type === 'preamble' || type === 'string' || type === 'comment') continue;
      const key    = m[2].trim();
      const body   = m[3];
      const fields = this._parseFields(body);
      entries.push({ type, key, ...fields });
    }
    return entries.map(e => this._toSchema(e)).filter(Boolean);
  }

  /* ── Extrae campos clave = valor ── */
  _parseFields(body) {
    const out = {};
    // field = {value} o field = "value" o field = number
    const fieldRe = /(\w+)\s*=\s*(?:\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|"([^"]*)"|(\d+))/gi;
    let m;
    while ((m = fieldRe.exec(body)) !== null) {
      const key = m[1].toLowerCase();
      const val = (m[2] ?? m[3] ?? m[4] ?? '').trim();
      out[key] = this._cleanLatex(val);
    }
    return out;
  }

  /* ── Limpia comandos LaTeX comunes ── */
  _cleanLatex(str) {
    return str
      .replace(/\\&/g, '&')
      .replace(/\\'([aeiouAEIOU])/g, (_, v) => v)  // acentos simples
      .replace(/\\~n/g, 'ñ')
      .replace(/\{\\~\{n\}\}/g, 'ñ')
      .replace(/\\[`'^"~=.]\{?(\w)\}?/g, '$1')      // otros diacríticos
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ── Mapea entrada BibTeX al schema de NIMACH_DATA ── */
  _toSchema(e) {
    if (!e.title) return null;

    const year     = parseInt(e.year, 10) || new Date().getFullYear();
    const journal  = e.journal || e.booktitle || e.publisher || 'Preprint';
    const authors  = this._formatAuthors(e.author || '');
    const topics   = (e.keywords || '')
      .split(/[,;]/)
      .map(k => k.trim().toLowerCase())
      .filter(Boolean);
    const quartile = (e.note || '').match(/Q[1-4]/i)?.[0]?.toUpperCase() || '';
    const doi      = e.doi?.replace(/^https?:\/\/doi\.org\//i, '') || '';

    return {
      id:       `bib-${e.key}`,
      year,
      title:    e.title,
      authors,
      journal,
      quartile,
      doi,
      url:      e.url || (doi ? `https://doi.org/${doi}` : ''),
      topics,
      _fromBib: true,
    };
  }

  /* ── Formatea "Last, First and Last2, First2 ..." ── */
  _formatAuthors(raw) {
    if (!raw) return '';
    const names = raw.split(/\s+and\s+/i).map(n => {
      n = n.trim();
      // "Last, First" → "Last F."
      if (n.includes(',')) {
        const [last, first = ''] = n.split(',').map(s => s.trim());
        const initials = first.split(/\s+/).map(w => w[0] ? w[0] + '.' : '').join(' ');
        return `${last} ${initials}`.trim();
      }
      // "First Last" → "Last F."
      const parts = n.split(/\s+/);
      if (parts.length < 2) return n;
      const last = parts.pop();
      const initials = parts.map(w => w[0] ? w[0] + '.' : '').join(' ');
      return `${last} ${initials}`.trim();
    });
    const shown = names.slice(0, 4);
    return shown.join(', ') + (names.length > 4 ? ' et al.' : '');
  }

  /* ── Agrega al store global (sin duplicar por DOI o título) ── */
  _mergeToDATAStore(pubs) {
    const store = window.NIMACH_DATA.publications;
    pubs.forEach(p => {
      const dup = store.find(s =>
        (p.doi && s.doi === p.doi) ||
        s.title.slice(0, 40) === p.title.slice(0, 40)
      );
      if (!dup) store.push(p);
    });
  }

  /* ── Renderiza cards en #pub-list ── */
  _render(pubs) {
    const list = document.querySelector('.pub-list');
    if (!list) return;

    // Ordena por año desc
    const all = [...window.NIMACH_DATA.publications]
      .sort((a, b) => b.year - a.year);

    list.innerHTML = all.map((p, i) => {
      const delay  = ['', 'delay-1', 'delay-2', 'delay-3', 'delay-4', 'delay-5'][Math.min(i, 5)];
      const qBadge = p.quartile ? `<span class="pub-q">${p.quartile}</span>` : '';
      const topics = (p.topics || []).join(' ');
      const doiTag = p.doi ? `data-doi="${p.doi}"` : '';
      const href   = p.doi
        ? `https://doi.org/${p.doi}`
        : (p.url || '#');

      return `
      <article class="pub-card reveal ${delay}"
        data-year="${p.year}"
        data-topic="${topics}"
        data-pub-id="${p.id}"
        ${doiTag}>
        <div class="pub-year">${p.year}</div>
        <div class="pub-body">
          <h4 class="pub-title">${p.title}</h4>
          <p class="pub-authors">${p.authors}</p>
          <div class="pub-journal">
            <a href="${href}" target="_blank" rel="noopener"
              style="color:inherit;text-decoration:none;">
              ↗ ${p.journal}
            </a>
            ${qBadge}
          </div>
        </div>
      </article>`.trim();
    }).join('\n');

    // Re-observar los nuevos elementos .reveal
    if (window._scrollRevealObserver) {
      list.querySelectorAll('.reveal').forEach(el =>
        window._scrollRevealObserver.observe(el)
      );
    } else {
      list.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    }
  }
}

window.BibTeXParser = BibTeXParser;
