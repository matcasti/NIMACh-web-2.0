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
      // Reconstruir toolbar + stats con datos reales del .bib
      if (window.NIMPage) NIMPage._updatePubToolbarAndStats();
      else initPubFilter();          // fallback para index.html (sin NIMPage activo)
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

    // Acepta "2021", "Nov 2021", "2021-11"…: toma el primer número de 4 cifras
    const ym       = String(e.year || '').match(/(?:19|20)\d{2}/);
    const year     = ym ? parseInt(ym[0], 10) : new Date().getFullYear();
    const journal  = e.journal || e.booktitle || e.publisher || 'Preprint';
    const authors  = this._formatAuthors(e.author || '');
    const topics   = this._cleanTopics(e.keywords || '');
    const quartile = (e.note || '').match(/Q[1-4]/i)?.[0]?.toUpperCase() || '';
    const doi      = e.doi?.replace(/^https?:\/\/doi\.org\//i, '') || '';

    return {
      id:       `bib-${e.key}`,
      year,
      title:    e.title,
      authors,
      authorList: this._authorList(e.author || ''),   // lista COMPLETA (la tarjeta solo muestra 4 + "et al.")
      journal,
      quartile,
      doi,
      url:      e.url || (doi ? `https://doi.org/${doi}` : ''),
      topics,
      _fromBib: true,
    };
  }

  /* ── Palabras clave: limpia, unifica variantes y elimina duplicados ──
     Para unificar un término nuevo, basta con añadir una línea aquí:
     'variante' → 'término canónico' (en minúsculas, con tildes).            */
  static TOPIC_ALIASES = {
    'cognitivo':   'cognición',
    'cognitiva':   'cognición',
    'estudianes':  'estudiantes',   // errata
    'estudiante':  'estudiantes',
    'aging':       'envejecimiento',
    'ageing':      'envejecimiento',
    'cold':        'frío',
    'antartica':   'antártica',
    'covid':       'covid-19',
    'hrv':         'hrv',
  };

  _cleanTopics(raw) {
    const fold = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const out = [];
    String(raw).split(/[,;]/).forEach(k => {
      k = k.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/[.\s]+$/, '');
      if (!k || k.length > 32 || /[%()=]/.test(k)) return;          // restos de comentarios/ruido
      k = BibTeXParser.TOPIC_ALIASES[k] || BibTeXParser.TOPIC_ALIASES[fold(k)] || k;
      if (!out.includes(k)) out.push(k);
    });
    return out;
  }

  /* ── Lista completa de autores ("Apellido Nombre") para búsquedas por persona ── */
  _authorList(raw) {
    if (!raw) return [];
    return raw.split(/\s+and\s+/i).map(n => {
      n = n.trim();
      if (n.includes(',')) { const [l, f = ''] = n.split(',').map(s => s.trim()); return `${l} ${f}`.trim(); }
      return n;
    });
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
      else if (p.authorList) dup.authorList = p.authorList;
    });
  }

  /* ── Renderiza cards en #pub-list ── */
  _render(pubs) {
    const list = document.querySelector('.pub-list');
    if (!list) return;

    // Ordena por año desc y aplica límite si el contenedor lo declara
    const limit = parseInt(list.dataset.limit, 10) || Infinity;
    const all   = [...window.NIMACH_DATA.publications]
      .sort((a, b) => b.year - a.year)
      .slice(0, limit);

    list.innerHTML = all.map((p, i) => NIMPage._pubCardHTML(p, i)).join('\n');

    // Re-observar los nuevos elementos .reveal.
    // Double-rAF: garantiza que el browser completa layout + paint
    // antes de que el IntersectionObserver dispare, evitando el bug
    // de compositing en mobile (elementos invisibles hasta zoom).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (window._scrollRevealObserver) {
          list.querySelectorAll('.reveal').forEach(el =>
            window._scrollRevealObserver.observe(el)
          );
        } else {
          list.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
        }
      });
    });

    // Actualizar estadísticos ahora que el store tiene todos los papers del .bib
    if (window.PublicationsEnricher) {
      new PublicationsEnricher();
    }
  }
}

window.BibTeXParser = BibTeXParser;
