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
      { label: 'Investigación', href: 'investigacion.html', key: 'investigacion' },
      { label: 'Proyectos',     href: 'proyectos.html',     key: 'proyectos'     },
      { label: 'Personas',      href: 'personas.html',      key: 'personas'      },
      { label: 'Herramientas',  href: 'herramientas.html',  key: 'herramientas'  },
      { label: 'Publicaciones', href: 'publicaciones.html', key: 'publicaciones' },
      { label: 'Galería',       href: 'galeria.html',       key: 'galeria'       },
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
      case 'publicaciones':  return this._publicacionesHTML();
      case 'personas':       return this._personasHTML();
      case 'herramientas':   return this._herramientasHTML();
      case 'investigacion':  return this._investigacionHTML();
      case 'proyectos':      return this._proyectosHTML();
      case 'galeria':        return this._galeriaHTML();
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
      <section class="page-section light-section" >
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

      <section class="page-section light-section" >
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

      <section class="page-section light-section" >
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
     INVESTIGACIÓN
  ══════════════════════════════════ */
  static _investigacionHTML() {
    const lines = window.NIMACH_DATA.research || [];

    // Publicaciones por línea (match por tags/topics)
    const pubsByLine = id => (window.NIMACH_DATA.publications || [])
      .filter(p => (p.topics||[]).some(t =>
        lines.find(l => l.id === id)?.tags?.some(tag =>
          tag.toLowerCase().includes(t) || t.includes(tag.toLowerCase())
        )
      )).slice(0, 3);

    const lineCards = lines.map((l, i) => {
      const delay = ['','delay-1','delay-2'][i] || '';
      const relPubs = pubsByLine(l.id);

      const pubsHTML = relPubs.length ? `
        <div class="rl-pubs">
          <div class="rl-pubs-label">Publicaciones relacionadas</div>
          ${relPubs.map(p => `
            <div class="rl-pub-item">
              <span class="rl-pub-year">${p.year}</span>
              <span class="rl-pub-title">${p.title.slice(0,75)}…</span>
            </div>`).join('')}
        </div>` : '';

      const tagsHTML = (l.tags||[]).map(t => `<span class="tag">${t}</span>`).join('');

      return `
        <article class="rl-card ${l.color} reveal ${delay}">
          <div class="rl-card-header">
            <div class="card-icon ${l.ic}">${l.icon}</div>
            <div class="rl-card-meta">
              <h2 class="rl-card-title">${l.title}</h2>
            </div>
          </div>
          <p class="rl-card-desc">${l.desc}</p>
          <div class="rl-tags">${tagsHTML}</div>
          ${pubsHTML}
        </article>`;
    }).join('');

    // Colaboradores
    const collabs = (window.NIMACH_DATA.collaborators||[]).map(c =>
      `<a href="${c.url}" class="collab-chip" target="_blank" rel="noopener">${c.name}</a>`
    ).join('');

    return `
      ${this._pageHeroHTML({
        label:     'Áreas de estudio',
        title:     'Líneas de investigación',
        desc:      'Tres ejes principales que conectan la neurofisiología contemporánea con la realidad clínica y el entorno único de la Patagonia chilena.',
        accent:    'blue',
        backHref:  '../index.html#investigacion',
        backLabel: 'Volver a inicio',
      })}

      <section class="page-section light-section" >
        <div class="container">
          <div class="rl-grid">${lineCards}</div>

          <div class="rl-network reveal">
            <span class="label">Red de colaboración activa</span>
            <h3 class="section-title" style="margin-bottom:16px;">Instituciones colaboradoras</h3>
            <div class="collab-chips" style="margin-top:0;">${collabs}</div>
          </div>
        </div>
      </section>`;
  }

  /* ══════════════════════════════════
     PROYECTOS
  ══════════════════════════════════ */
  static _proyectosHTML() {
    const projects = window.NIMACH_DATA.projects || [];
    const active   = projects.filter(p => p.status === 'active');
    const complete = projects.filter(p => p.status === 'complete');
    const funding  = projects.reduce((s, p) => s + (p.amount?.includes('CLP')
      ? parseInt(p.amount.replace(/[^0-9]/g,'')) || 0 : 0), 0);

    const _card = (p, i) => {
      const delay = ['','delay-1','delay-2','delay-3'][Math.min(i,3)];
      const badge = p.status === 'active'
        ? `<span class="badge badge-active"><span class="badge-dot"></span>En curso</span>`
        : `<span class="badge badge-complete">Finalizado</span>`;
      const tagsHTML = (p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('');

      return `
        <article class="project-card reveal ${delay}">
          <div class="project-top">
            ${badge}
            <div class="project-agency">${p.agency}<br>${p.code}</div>
          </div>
          <h3 class="project-title">${p.title}</h3>
          <p class="project-pi">${p.pi}</p>
          <div class="project-meta">
            <div class="project-meta-item">
              <span class="meta-label">Período</span>
              <span class="meta-value">${p.period}</span>
            </div>
            <div class="project-meta-item">
              <span class="meta-label">Financiamiento</span>
              <span class="meta-value">${p.amount}</span>
            </div>
            <div class="project-meta-item">
              <span class="meta-label">Tipo</span>
              <span class="meta-value">${p.type}</span>
            </div>
          </div>
          <div class="progress-wrap">
            <div class="progress-header">
              <span>Progreso</span><span>${p.progress}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${p.barColor}" data-width="${p.progress}"></div>
            </div>
          </div>
          <div class="project-tags">${tagsHTML}</div>
        </article>`;
    };

    return `
      ${this._pageHeroHTML({
        label:     'Portfolio de financiamiento',
        title:     'Proyectos',
        desc:      'Historial completo de proyectos de investigación financiados. Desde FONDECYT hasta redes internacionales ERASMUS+ y ANID-REDES.',
        accent:    'coral',
        backHref:  '../index.html#proyectos',
        backLabel: 'Volver a inicio',
      })}

      <!-- KPIs -->
      <div class="pub-page-stats">
        <div class="container">
          <div class="pub-stat-strip">
            <div class="pub-stat">
              <div class="pub-stat-val" style="color:var(--c-teal);">${active.length}</div>
              <div class="pub-stat-lbl">Proyectos activos</div>
            </div>
            <div class="pub-stat">
              <div class="pub-stat-val">${projects.length}</div>
              <div class="pub-stat-lbl">Total proyectos</div>
            </div>
            <div class="pub-stat">
              <div class="pub-stat-val" style="color:var(--c-coral);">${complete.length}</div>
              <div class="pub-stat-lbl">Completados</div>
            </div>
            <div class="pub-stat">
              <div class="pub-stat-val" style="font-size:18px;">ANID · UE</div>
              <div class="pub-stat-lbl">Fuentes de financiamiento</div>
            </div>
          </div>
        </div>
      </div>

      <section class="page-section light-section" >
        <div class="container">

          ${active.length ? `
          <div class="proj-section-title reveal">
            <span class="label">En desarrollo</span>
            <h3 class="section-title">Proyectos activos</h3>
          </div>
          <div class="projects-grid proj-page-grid">
            ${active.map(_card).join('')}
          </div>` : ''}

          ${complete.length ? `
          <div class="proj-section-title reveal" style="margin-top:48px;">
            <span class="label">Historial</span>
            <h3 class="section-title">Proyectos completados</h3>
          </div>
          <div class="projects-grid proj-page-grid" style="opacity:.78;">
            ${complete.map((p,i) => _card(p, i)).join('')}
          </div>` : ''}

        </div>
      </section>`;
  }

  /* ══════════════════════════════════
     GALERÍA
  ══════════════════════════════════ */
  static _galeriaHTML() {
    const items = window.NIMACH_DATA.gallery || [];
    const news  = window.NIMACH_DATA.news    || [];

    // SVGs representativos para cada bg class (reutiliza los del index)
    const svgByBg = {
      'gi-1': `<svg viewBox="0 0 200 360" aria-hidden="true">
        <circle cx="100" cy="130" r="55" fill="none" stroke="rgba(127,179,232,.5)" stroke-width=".8"/>
        <circle cx="100" cy="130" r="6" fill="rgba(127,179,232,.85)"/>
        <line x1="100" y1="130" x2="58"  y2="96"  stroke="rgba(127,179,232,.4)" stroke-width=".7"/>
        <line x1="100" y1="130" x2="142" y2="96"  stroke="rgba(127,179,232,.4)" stroke-width=".7"/>
        <circle cx="58"  cy="96"  r="4" fill="rgba(232,112,64,.75)"/>
        <circle cx="142" cy="96"  r="4" fill="rgba(232,112,64,.75)"/>
        <path d="M10 270 L44 270 L48 252 L52 280 L56 236 L60 286 L64 270 L110 270 L114 250 L118 278 L122 232 L128 282 L132 270 L190 270"
          stroke="rgba(232,112,64,.7)" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      </svg>`,
      'gi-2': `<svg viewBox="0 0 200 180" aria-hidden="true">
        <path d="M20 90 Q60 40 100 90 Q140 140 180 90" stroke="rgba(127,179,232,.7)" stroke-width="1.2" fill="none"/>
        <circle cx="20"  cy="90" r="4" fill="rgba(232,112,64,.9)"/>
        <circle cx="100" cy="90" r="5" fill="rgba(29,184,132,.9)"/>
        <circle cx="180" cy="90" r="4" fill="rgba(127,179,232,.9)"/>
      </svg>`,
      'gi-3': `<svg viewBox="0 0 200 180" aria-hidden="true">
        <rect x="30" y="40" width="140" height="90" rx="4" fill="none" stroke="rgba(127,179,232,.4)" stroke-width=".8"/>
        <line x1="30" y1="60" x2="170" y2="60" stroke="rgba(127,179,232,.3)" stroke-width=".6"/>
        <circle cx="100" cy="100" r="20" fill="none" stroke="rgba(232,112,64,.6)" stroke-width="1"/>
        <circle cx="100" cy="100" r="4" fill="rgba(232,112,64,.9)"/>
      </svg>`,
      'gi-4': `<svg viewBox="0 0 200 180" aria-hidden="true">
        <circle cx="100" cy="90" r="48" fill="none" stroke="rgba(123,82,212,.65)" stroke-width=".9"/>
        <circle cx="100" cy="90" r="24" fill="none" stroke="rgba(123,82,212,.4)" stroke-width=".6"/>
        <circle cx="100" cy="90" r="4" fill="rgba(123,82,212,.9)"/>
      </svg>`,
      'gi-5': `<svg viewBox="0 0 200 180" aria-hidden="true">
        <path d="M30 130 Q65 65 100 88 Q135 112 170 38" stroke="rgba(59,170,191,.7)" stroke-width="1.2" fill="none"/>
        <circle cx="100" cy="88" r="4" fill="rgba(59,170,191,.95)"/>
      </svg>`,
      'gi-6': `<svg viewBox="0 0 200 180" aria-hidden="true">
        <circle cx="100" cy="80" r="36" fill="none" stroke="rgba(29,184,132,.55)" stroke-width=".8"/>
        <path d="M64 110 Q80 130 100 125 Q120 130 136 110" fill="none" stroke="rgba(29,184,132,.6)" stroke-width="1"/>
        <circle cx="100" cy="80" r="4" fill="rgba(29,184,132,.9)"/>
      </svg>`,
    };

    const galleryCards = items.map((item, i) => {
      const delay = ['','delay-1','delay-2','delay-3','delay-4','delay-5'][Math.min(i,5)];
      return `
        <div class="gallery-item${item.span ? ' g-span-2' : ''} reveal ${delay}">
          <div class="gallery-item-inner ${item.bg}">
            <div class="gallery-svg">${svgByBg[item.bg] || ''}</div>
            <div class="gallery-overlay"></div>
            <div class="gallery-label">
              <div class="gallery-label-title">${item.title}</div>
              <div class="gallery-label-sub">${item.sub}</div>
            </div>
          </div>
        </div>`;
    }).join('');

    const newsItems = news.map((n, i) => {
      const delay = ['','delay-1','delay-2','delay-3'][Math.min(i%4,3)];
      return `
        <div class="timeline-item reveal ${delay}">
          <div class="timeline-dot${n.hot?' hot':''}"></div>
          <div class="timeline-date">${n.date}</div>
          <p class="timeline-text">${n.html}</p>
          <span class="timeline-tag">${n.tag}</span>
        </div>`;
    }).join('');

    return `
      ${this._pageHeroHTML({
        label:     'Registro visual',
        title:     'Galería',
        desc:      'Momentos del trabajo en terreno, seminarios, colaboraciones y vida del grupo NIM-ACh desde el fin del mundo.',
        accent:    'purple',
        backHref:  '../index.html#galeria',
        backLabel: 'Volver a inicio',
      })}

      <!-- Gallery grid -->
      <section class="page-section light-section" >
        <div class="container">
          <span class="label reveal">Fotografías y eventos</span>
          <div class="gallery-grid" style="margin-top:16px;">${galleryCards}</div>
        </div>
      </section>

      <!-- Timeline de noticias -->
      <section class="page-section light-section">
        <div class="container">
          <div class="reveal">
            <span class="label">Actividad del grupo</span>
            <h2 class="section-title" style="margin-bottom:24px;">Noticias y hitos</h2>
          </div>
          <div class="timeline">${newsItems}</div>
        </div>
      </section>`;
  }

  /* ══════════════════════════════════
     POST-RENDER INIT
  ══════════════════════════════════ */
  static _afterRender(pageId) {
    // Reading progress bar (en todas las páginas interiores)
    const bar = document.createElement('div');
    bar.id = 'reading-progress';
    document.body.prepend(bar);
    window.addEventListener('scroll', () => {
      const h = document.documentElement;
      const pct = (window.scrollY / (h.scrollHeight - h.clientHeight)) * 100;
      bar.style.width = Math.min(pct, 100) + '%';
    }, { passive: true });
    
    // Re-bind theme toggle (inyectado en el nav)
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn && window.ThemeManager) {
      // ThemeManager ya se instanció; sólo re-bind
      const tm = new ThemeManager();
      // ThemeManager ya llama bindToggle() en constructor; evitar doble bind
    }

    switch (pageId) {
      case 'publicaciones':  this._afterPublicaciones(); break;
      case 'personas':       this._afterPersonas();      break;
      case 'proyectos':      this._afterProyectos();     break;
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
  
  static _afterProyectos() {
    // Activa las barras de progreso (reutiliza ProgressBars de scroll.js)
    if (window.ProgressBars) new ProgressBars();
    else {
      // Fallback inline
      setTimeout(() => {
        document.querySelectorAll('.progress-fill').forEach(el => {
          el.style.width = (el.dataset.width || 0) + '%';
        });
      }, 200);
    }
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
