/**
 * NIM-ACh — Pages Engine
 * Construye dinámicamente las páginas interiores desde NIMACH_DATA.
 * Las páginas HTML son shells mínimos; todo el contenido sale de aquí.
 *
 * Uso: <body data-page="publicaciones|personas|herramientas|datasets">
 */

/* ─────────────────────────────────────────
   NAV HTML (paths relativos a pages/)
───────────────────────────────────────── */
class NIMPage {

  static init(pageId) {
    // ThemeManager se aplica inmediatamente (antes de pintar)
    if (window.ThemeManager) new ThemeManager();

    document.getElementById('main-nav').innerHTML  = this._navHTML(pageId);
    document.getElementById('page-main').innerHTML = this._mainHTML(pageId);
    document.getElementById('page-footer').innerHTML = this._footerHTML();

    // Post-render init específico por página
    this._afterRender(pageId);
  }

  /* ══ NAV ══ */
  static _navHTML(active) {
    const links = [
      { label: 'Investigación',  href: '../index.html#investigacion', key: 'investigacion' },
      { label: 'Proyectos',      href: '../index.html#proyectos',     key: 'proyectos'     },
      { label: 'Personas',       href: 'personas.html',               key: 'personas'      },
      { label: 'Herramientas',   href: 'herramientas.html',           key: 'herramientas'  },
      { label: 'Publicaciones',  href: 'publicaciones.html',          key: 'publicaciones' },
      { label: 'Galería',        href: '../index.html#galeria',       key: 'galeria'       },
      { label: 'DEI',            href: '../index.html#dei',           key: 'dei'           },
    ];

    const linksHTML = links.map(l => `
      <a href="${l.href}" class="nav-link${l.key === active ? ' active' : ''}">${l.label}</a>
    `).join('');

    return `
      <a href="../index.html" class="nav-logo">
        <div class="nav-logo-mark">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" stroke="#fff" stroke-width="1.5"/>
            <path d="M5 19Q8 13 12 13Q16 13 19 19"
              stroke="#f5a472" stroke-width="1.5" stroke-linecap="round" fill="none"/>
            <path d="M2 11Q5.5 8 9 11Q12 14 15 11Q18 8 22 11"
              stroke="rgba(255,255,255,.45)" stroke-width="1" stroke-linecap="round" fill="none"/>
          </svg>
        </div>
        <div class="nav-brand">
          <span class="nav-name">NIM-ACh</span>
          <span class="nav-sub">Neurofisiología · UMAG</span>
        </div>
      </a>
      <div class="nav-links">${linksHTML}</div>
      <div class="nav-right">
        <div class="nav-pill">
          <span class="badge-dot" style="background:var(--c-teal)"></span>
          FONDECYT Activo
        </div>
        <button id="theme-toggle" class="theme-toggle" aria-label="Activar modo oscuro">
          <span id="theme-icon">🌙</span>
        </button>
        <a href="../index.html#contacto" class="nav-cta">Contáctanos</a>
      </div>
      <button class="nav-hamburger" aria-label="Menú">
        <span></span><span></span><span></span>
      </button>`;
  }

  /* ══ FOOTER ══ */
  static _footerHTML() {
    const chips = ['MEDIANTAR','HABITAT','CIES','RIES-LAC','FONDECYT'];
    return `
      <div class="footer-left">
        <div class="nav-logo-mark" style="width:28px;height:28px;border-radius:7px;flex-shrink:0;">
          <svg viewBox="0 0 24 24" fill="none" style="width:17px;height:17px;" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" stroke="#fff" stroke-width="1.5"/>
            <path d="M5 19Q8 13 12 13Q16 13 19 19"
              stroke="#f5a472" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          </svg>
        </div>
        <span class="footer-brand">NIM-ACh Group</span>
        <span class="footer-copy">© 2025</span>
      </div>
      <div class="footer-chips">
        ${chips.map(c => `<span class="footer-chip">${c}</span>`).join('')}
      </div>
      <div class="footer-copy">CADI · Universidad de Magallanes · Punta Arenas</div>`;
  }

  /* ══ PAGE HERO ══ */
  static _pageHeroHTML({ label, title, desc, accent = 'blue', backHref, backLabel }) {
    const accentMap = {
      blue:   'var(--c-blue-light)',
      coral:  'var(--c-coral)',
      teal:   'var(--c-teal)',
      purple: 'var(--c-purple)',
    };
    const col = accentMap[accent] || accentMap.blue;

    return `
      <section class="page-hero">
        <div class="page-hero-noise"></div>
        <div class="page-hero-grid"></div>
        <div class="container page-hero-inner">
          <a href="${backHref || '../index.html'}" class="page-back-link">
            ← ${backLabel || 'Inicio'}
          </a>
          <span class="page-hero-label" style="color:${col};">${label}</span>
          <h1 class="page-hero-title">${title}</h1>
          <p class="page-hero-desc">${desc}</p>
        </div>
        <div class="page-hero-bar" style="background:linear-gradient(90deg,${col},transparent)"></div>
      </section>`;
  }

  /* ══ MAIN DISPATCHER ══ */
  static _mainHTML(pageId) {
    switch (pageId) {
      case 'publicaciones': return this._publicacionesHTML();
      case 'personas':      return this._personasHTML();
      case 'herramientas':  return this._herramientasHTML();
      case 'datasets':      return this._datasetsHTML();
      default: return '<p style="padding:80px 32px;color:#8aa0b8;">Página no encontrada.</p>';
    }
  }

  /* ══════════════════════════════════
     PUBLICACIONES
  ══════════════════════════════════ */
  static _publicacionesHTML() {
    const pubs = [...(window.NIMACH_DATA.publications || [])]
      .sort((a, b) => b.year - a.year);

    // Extrae años y tópicos únicos
    const years  = [...new Set(pubs.map(p => p.year))].sort((a, b) => b - a);
    const topics = [...new Set(pubs.flatMap(p => p.topics || []))].sort();

    const pubCount  = pubs.length;
    const q1Count   = pubs.filter(p => p.quartile === 'Q1').length;
    const yearRange = years.length > 1 ? `${years[years.length-1]}–${years[0]}` : years[0] || '—';

    return `
      ${this._pageHeroHTML({
        label:     'Output científico',
        title:     'Publicaciones',
        desc:      'Todas las publicaciones del grupo NIM-ACh. Cargadas desde BibTeX y enriquecidas con métricas de citas en tiempo real vía OpenAlex.',
        accent:    'blue',
        backHref:  '../index.html#publicaciones',
        backLabel: 'Volver a inicio',
      })}

      <!-- Stats strip -->
      <div class="pub-page-stats">
        <div class="container">
          <div class="pub-stat-strip">
            <div class="pub-stat">
              <div class="pub-stat-val" id="ps-total">${pubCount}</div>
              <div class="pub-stat-lbl">Publicaciones</div>
            </div>
            <div class="pub-stat">
              <div class="pub-stat-val" style="color:var(--c-coral);">${q1Count}</div>
              <div class="pub-stat-lbl">Revistas Q1</div>
            </div>
            <div class="pub-stat">
              <div class="pub-stat-val" id="ps-cites">—</div>
              <div class="pub-stat-lbl">Citas totales</div>
            </div>
            <div class="pub-stat">
              <div class="pub-stat-val" id="ps-hindex">—</div>
              <div class="pub-stat-lbl">h-index</div>
            </div>
            <div class="pub-stat">
              <div class="pub-stat-val" style="color:var(--c-teal);">${yearRange}</div>
              <div class="pub-stat-lbl">Período</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter + list -->
      <section class="page-section light-section" style="background:#f6f8fc;">
        <div class="container">

          <!-- Toolbar -->
          <div class="pub-toolbar reveal">
            <div class="pub-filter-group">
              <button class="pub-filter-btn active" data-filter="all" data-type="year">Todos</button>
              ${years.map(y =>
                `<button class="pub-filter-btn" data-filter="${y}" data-type="year">${y}</button>`
              ).join('')}
            </div>
            <div class="pub-filter-group">
              ${topics.map(t =>
                `<button class="pub-topic-btn" data-topic="${t}">${t}</button>`
              ).join('')}
            </div>
            <div class="pub-search-wrap">
              <input id="pub-search" class="pub-search" type="search"
                placeholder="Buscar por título, autor, revista…" />
            </div>
          </div>

          <!-- Cards -->
          <div class="pub-list" id="pub-page-list">
            ${pubs.map((p, i) => this._pubCardHTML(p, i)).join('')}
          </div>

          <!-- BibTeX callout -->
          <div class="pub-bib-note reveal">
            <div class="bib-note-icon">📄</div>
            <div>
              <div class="bib-note-title">Añadir publicaciones</div>
              <div class="bib-note-desc">Agrega entradas al archivo
                <code>data/publications.bib</code> y aparecerán automáticamente aquí,
                con enriquecimiento de citas vía OpenAlex.</div>
            </div>
          </div>

        </div>
      </section>`;
  }

  static _pubCardHTML(p, i) {
    const delay   = ['','delay-1','delay-2','delay-3','delay-4','delay-5'][Math.min(i % 6, 5)];
    const q       = p.quartile ? `<span class="pub-q">${p.quartile}</span>` : '';
    const doi     = p.doi || '';
    const href    = doi.startsWith('10.') ? `https://doi.org/${doi}` : (p.url || '#');
    const topics  = (p.topics || []).join(' ');

    return `
      <article class="pub-card reveal ${delay}"
        data-year="${p.year}"
        data-topic="${topics}"
        data-pub-id="${p.id}"
        ${doi ? `data-doi="${doi}"` : ''}>
        <div class="pub-year">${p.year}</div>
        <div class="pub-body">
          <h4 class="pub-title">${p.title}</h4>
          <p class="pub-authors">${p.authors}</p>
          <div class="pub-journal">
            <a href="${href}" target="_blank" rel="noopener"
              style="color:inherit;text-decoration:none;">↗ ${p.journal}</a>
            ${q}
          </div>
        </div>
      </article>`;
  }

  /* ══════════════════════════════════
     PERSONAS
  ══════════════════════════════════ */
  static _personasHTML() {
    const people = window.NIMACH_DATA.publications
      ? window.NIMACH_DATA.people
      : [];

    return `
      ${this._pageHeroHTML({
        label:     'Nuestro equipo',
        title:     'Personas',
        desc:      'Investigadores, doctorandos y colaboradores que conforman el NIM-ACh. Unidos por la curiosidad sobre el eje cerebro-corazón desde la Patagonia.',
        accent:    'teal',
        backHref:  '../index.html#personas',
        backLabel: 'Volver a inicio',
      })}

      <section class="page-section light-section" style="background:#f6f8fc;">
        <div class="container">

          <!-- Filter tabs -->
          <div class="people-filter-bar reveal">
            <button class="people-tab active" data-cat="all">Todos
              <span class="tab-count">${people.length}</span>
            </button>
            <button class="people-tab" data-cat="pi">Investigadores Principales
              <span class="tab-count">${people.filter(p=>p.role_category==='pi').length}</span>
            </button>
            <button class="people-tab" data-cat="researcher">Investigadores
              <span class="tab-count">${people.filter(p=>p.role_category==='researcher').length}</span>
            </button>
            <button class="people-tab" data-cat="doctoral">Doctorales
              <span class="tab-count">${people.filter(p=>p.role_category==='doctoral').length}</span>
            </button>
          </div>

          <!-- Grid -->
          <div class="people-page-grid" id="people-page-grid">
            ${people.map((p, i) => this._personCardHTML(p, i)).join('')}
          </div>

        </div>
      </section>`;
  }

  static _personCardHTML(p, i) {
    const delay = ['','delay-1','delay-2','delay-3'][Math.min(i % 4, 3)];
    const pubs  = (window.NIMACH_DATA.publications || [])
      .filter(pub => pub.authors && pub.authors.includes(p.name.split(' ')[0]));

    const linksHTML = Object.entries(p.links || {}).map(([k, v]) => {
      const labels = { researchgate:'ResearchGate', orcid:'ORCID',
                       scholar:'Scholar', github:'GitHub' };
      return `<a href="${v}" target="_blank" rel="noopener"
        class="person-link-btn">${labels[k] || k}</a>`;
    }).join('');

    const chipsHTML = (p.chips || []).map(c =>
      `<span class="person-chip">${c}</span>`).join('');

    return `
      <article class="person-page-card reveal ${delay}"
        data-cat="${p.role_category}">
        <div class="person-page-top">
          <div class="avatar-wrap">
            <div class="avatar ${p.avatar}">${p.initials}</div>
            <div class="avatar-ring" style="color:${p.ringColor};"></div>
          </div>
          <div class="person-page-meta">
            <h3 class="person-name">${p.name}</h3>
            <p class="person-role">${p.role}</p>
            ${pubs.length ? `<span class="person-pub-count">${pubs.length} pub${pubs.length!==1?'s':''}</span>` : ''}
          </div>
        </div>
        <p class="person-bio">${p.bio || ''}</p>
        <div class="person-chips">${chipsHTML}</div>
        <div class="person-links">${linksHTML}</div>
      </article>`;
  }

  /* ══════════════════════════════════
     HERRAMIENTAS
  ══════════════════════════════════ */
  static _herramientasHTML() {
    const tools = window.NIMACH_DATA.tools || [];
    const featured = tools.find(t => t.status === 'active');
    const rest     = tools.filter(t => t !== featured);

    return `
      ${this._pageHeroHTML({
        label:     'Software open-source',
        title:     'Herramientas',
        desc:      'Desarrollamos herramientas de acceso libre para el análisis de señales fisiológicas y datos de investigación. Disponibles para la comunidad científica global.',
        accent:    'coral',
        backHref:  '../index.html#herramientas',
        backLabel: 'Volver a inicio',
      })}

      <section class="page-section light-section" style="background:#f6f8fc;">
        <div class="container">

          ${featured ? this._featuredToolHTML(featured) : ''}

          <div class="tools-page-grid">
            ${rest.map((t, i) => this._toolCardHTML(t, i)).join('')}
          </div>

          <!-- Contribute callout -->
          <div class="contribute-callout reveal">
            <div class="contribute-icon">🛠️</div>
            <div class="contribute-body">
              <div class="contribute-title">¿Quieres contribuir?</div>
              <p class="contribute-desc">
                NIM-ACh desarrolla todas sus herramientas con licencia MIT o Apache 2.0.
                Si eres desarrollador/a y quieres colaborar, escríbenos o abre un issue en GitHub.
              </p>
              <a href="../index.html#contacto" class="tool-btn tool-btn-primary">Contáctanos →</a>
            </div>
          </div>

        </div>
      </section>`;
  }

  static _featuredToolHTML(t) {
    const authorData = t.author
      ? (window.NIMACH_DATA.people || []).find(p => p.id === t.author)
      : null;

    const authorHTML = authorData ? `
      <div class="tool-author">
        <div class="avatar ${authorData.avatar}" style="width:28px;height:28px;font-size:11px;">
          ${authorData.initials}
        </div>
        <span>Desarrollado por ${authorData.name}</span>
      </div>` : '';

    const featuresHTML = (t.features || []).map(f =>
      `<div class="tool-feature">✓ ${f}</div>`).join('');

    const tagsHTML = (t.tags || []).map(tg =>
      `<span class="tag">${tg}</span>`).join('');

    return `
      <article class="tool-card tool-featured reveal" style="margin-bottom:20px;">
        <div class="tool-header">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="tool-icon">${t.icon}</div>
            <div>
              <div class="tool-badges">
                <span class="badge badge-active"><span class="badge-dot"></span>En producción</span>
                ${t.version ? `<span class="badge badge-live">${t.version}</span>` : ''}
              </div>
            </div>
          </div>
        </div>
        <h3 class="tool-title">${t.title}</h3>
        <p class="tool-desc">${t.desc}</p>
        <div class="tool-features">${featuresHTML}</div>
        <div class="tool-tags">${tagsHTML}</div>
        ${authorHTML}
        <div class="tool-actions">
          ${t.url  ? `<a href="${t.url}"    target="_blank" rel="noopener" class="tool-btn tool-btn-primary">→ Abrir aplicación</a>` : ''}
          ${t.github ? `<a href="${t.github}" target="_blank" rel="noopener" class="tool-btn tool-btn-ghost">GitHub</a>` : ''}
          ${t.docs   ? `<a href="${t.docs}"   target="_blank" rel="noopener" class="tool-btn tool-btn-ghost">Documentación</a>` : ''}
        </div>
      </article>`;
  }

  static _toolCardHTML(t, i) {
    const delay  = ['delay-1','delay-2','delay-3'][Math.min(i, 2)];
    const statusMap = {
      dev:     { label:'En desarrollo',  cls:'badge-purple' },
      planned: { label:'Planificado',    cls:'badge-purple' },
    };
    const st = statusMap[t.status] || { label: t.status, cls:'' };
    const tagsHTML = (t.tags||[]).map(tg=>`<span class="tag">${tg}</span>`).join('');

    const featuresHTML = (t.features||[]).slice(0,3).map(f=>
      `<div class="tool-feature">✓ ${f}</div>`).join('');

    return `
      <article class="tool-card tool-upcoming reveal ${delay}">
        <div class="tool-header">
          <div class="tool-icon">${t.icon}</div>
          <span class="badge" style="background:rgba(123,82,212,.1);color:var(--c-purple);border:0.5px solid rgba(123,82,212,.2);">
            ${st.label}
          </span>
        </div>
        <h3 class="tool-title">${t.title}</h3>
        <p class="tool-desc">${t.desc}</p>
        <div class="tool-features">${featuresHTML}</div>
        <div class="tool-tags">${tagsHTML}</div>
        <div class="tool-actions">
          ${t.github ? `<a href="${t.github}" target="_blank" rel="noopener" class="tool-btn tool-btn-ghost">GitHub →</a>` : ''}
          ${!t.github ? `<span class="tool-btn tool-btn-ghost" style="opacity:.5;cursor:default;">Próximamente</span>` : ''}
        </div>
      </article>`;
  }

  /* ══════════════════════════════════
     DATASETS
  ══════════════════════════════════ */
  static _datasetsHTML() {
    const ds = window.NIMACH_DATA.datasets || [];
    const totalN = ds.reduce((s, d) => s + (d.n || 0), 0);
    const vars   = [...new Set(ds.flatMap(d => d.variables || []))];

    return `
      ${this._pageHeroHTML({
        label:     'Ciencia abierta',
        title:     'Datasets abiertos',
        desc:      'Compartimos nuestros datos con la comunidad científica bajo licencias CC abiertas. Cita el dataset correspondiente si lo usas en tu investigación.',
        accent:    'teal',
        backHref:  '../index.html#datasets',
        backLabel: 'Volver a inicio',
      })}

      <!-- Open data stats -->
      <div class="pub-page-stats">
        <div class="container">
          <div class="pub-stat-strip">
            <div class="pub-stat">
              <div class="pub-stat-val" style="color:var(--c-teal);">${ds.length}</div>
              <div class="pub-stat-lbl">Datasets públicos</div>
            </div>
            <div class="pub-stat">
              <div class="pub-stat-val">${totalN}</div>
              <div class="pub-stat-lbl">Participantes totales</div>
            </div>
            <div class="pub-stat">
              <div class="pub-stat-val">${vars.length}</div>
              <div class="pub-stat-lbl">Variables únicas</div>
            </div>
            <div class="pub-stat">
              <div class="pub-stat-val" style="color:var(--c-blue-light);">CC</div>
              <div class="pub-stat-lbl">Licencia abierta</div>
            </div>
          </div>
        </div>
      </div>

      <section class="page-section light-section" style="background:#f6f8fc;">
        <div class="container">

          <!-- Grid -->
          <div class="datasets-page-grid">
            ${ds.map((d, i) => this._datasetCardHTML(d, i)).join('')}
          </div>

          <!-- Citation guide -->
          <div class="cite-guide reveal">
            <div class="cite-guide-title">📋 ¿Cómo citar un dataset?</div>
            <code class="cite-example">
              Núñez C., et al. (2024). <em>[Título del dataset]</em>.
              NIM-ACh Research Group, Universidad de Magallanes.
              Zenodo. https://doi.org/10.5281/zenodo.XXXXXXX
            </code>
            <p class="cite-note">
              Si publicas resultados usando datos de NIM-ACh, por favor notifícanos
              en <a href="../index.html#contacto" style="color:var(--c-teal)">contacto</a> —
              nos ayuda a rastrear el impacto de nuestra ciencia abierta.
            </p>
          </div>

        </div>
      </section>`;
  }

  static _datasetCardHTML(d, i) {
    const delay = ['','delay-1','delay-2','delay-3'][Math.min(i, 3)];
    const varsHTML = (d.variables||[]).map(v=>`<span class="tag">${v}</span>`).join('');
    const tagsHTML = (d.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('');

    return `
      <article class="dataset-card reveal ${delay}">
        <div class="ds-header">
          <span class="ds-badge badge-active">
            <span class="badge-dot"></span>${d.status === 'public' ? 'Público' : 'Restringido'}
          </span>
          <div class="ds-format">${d.format} · ${d.size}</div>
        </div>
        <h3 class="ds-title">${d.title}</h3>
        <p class="ds-desc">${d.desc}</p>
        <div class="ds-meta">
          <span><strong>n=</strong>${d.n}</span>
          <span><strong>Licencia:</strong> ${d.license}</span>
        </div>
        <div class="ds-vars">${varsHTML}</div>
        <div class="ds-vars" style="margin-top:4px;">${tagsHTML}</div>
        <div class="ds-actions">
          ${d.zenodo ? `<a href="${d.zenodo}" target="_blank" rel="noopener" class="ds-btn ds-btn-primary">↓ Zenodo</a>` : ''}
          ${d.github ? `<a href="${d.github}" target="_blank" rel="noopener" class="ds-btn ds-btn-ghost">GitHub →</a>` : ''}
          ${d.doi    ? `<button class="ds-btn ds-btn-ghost" data-doi="${d.doi}" style="cursor:pointer;">Copiar DOI</button>` : ''}
        </div>
      </article>`;
  }

  /* ══════════════════════════════════
     POST-RENDER INIT
  ══════════════════════════════════ */
  static _afterRender(pageId) {
    // Re-bind theme toggle (inyectado en el nav)
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn && window.ThemeManager) {
      // ThemeManager ya se instanció; sólo re-bind
      const tm = new ThemeManager();
      // ThemeManager ya llama bindToggle() en constructor; evitar doble bind
    }

    switch (pageId) {
      case 'publicaciones': this._afterPublicaciones(); break;
      case 'personas':      this._afterPersonas();      break;
      case 'datasets':      this._afterDatasets();      break;
    }
  }

  static _afterPublicaciones() {
    // Filtro de publicaciones (reutilizado por bibtex.js también)
    NIMPage._initPubFilter();

    // Búsqueda de texto
    const searchEl = document.getElementById('pub-search');
    if (searchEl) {
      searchEl.addEventListener('input', () => NIMPage._applyPubFilters());
    }

    // OpenAlex enrichment si está disponible
    if (window.PublicationsEnricher) new PublicationsEnricher();

    // BibTeX parser si está disponible
    if (window.BibTeXParser) new BibTeXParser('../data/publications.bib');
  }

  static _initPubFilter() {
    const list = document.getElementById('pub-page-list') ||
                 document.querySelector('.pub-list');
    if (!list) return;

    document.querySelectorAll('.pub-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pub-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        NIMPage._applyPubFilters();
      });
    });

    document.querySelectorAll('.pub-topic-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        NIMPage._applyPubFilters();
      });
    });
  }

  static _applyPubFilters() {
    const list = document.getElementById('pub-page-list') ||
                 document.querySelector('.pub-list');
    if (!list) return;

    const activeYear  = document.querySelector('.pub-filter-btn.active')?.dataset.filter || 'all';
    const activeTopics = [...document.querySelectorAll('.pub-topic-btn.active')]
      .map(b => b.dataset.topic);
    const search = (document.getElementById('pub-search')?.value || '').toLowerCase().trim();

    list.querySelectorAll('.pub-card').forEach(card => {
      const year    = card.dataset.year  || '';
      const topic   = card.dataset.topic || '';
      const text    = card.textContent.toLowerCase();

      const yearOK  = activeYear === 'all' || year === activeYear;
      const topicOK = activeTopics.length === 0 ||
                      activeTopics.some(t => topic.includes(t));
      const searchOK = !search || text.includes(search);

      card.style.display = yearOK && topicOK && searchOK ? '' : 'none';
    });
  }

  static _afterPersonas() {
    document.querySelectorAll('.people-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.people-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const cat = tab.dataset.cat;
        document.querySelectorAll('.person-page-card').forEach(card => {
          const match = cat === 'all' || card.dataset.cat === cat;
          card.style.display = match ? '' : 'none';
        });
      });
    });
  }

  static _afterDatasets() {
    // Copiar DOI al portapapeles
    document.querySelectorAll('[data-doi]').forEach(el => {
      el.addEventListener('click', () => {
        navigator.clipboard.writeText(el.dataset.doi).then(() => {
          const orig = el.textContent;
          el.textContent = '¡Copiado!';
          setTimeout(() => { el.textContent = orig; }, 1800);
        });
      });
    });
  }
}

/* ─────────────────────────────────────────
   Auto-init desde data-page en <body>
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const pageId = document.body.dataset.page;
  if (pageId) NIMPage.init(pageId);
});

/* Shim global para compatibilidad con bibtex.js */
function initPubFilter() { NIMPage._initPubFilter(); }

window.NIMPage = NIMPage;
