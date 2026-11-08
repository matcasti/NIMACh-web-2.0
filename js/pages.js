/**
 * NIMACh — Pages Engine
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
    document.getElementById('main-nav').innerHTML  = this._navHTML(pageId);
    document.getElementById('page-main').innerHTML = this._mainHTML(pageId);
    document.getElementById('page-footer').innerHTML = this._footerHTML();

    // Tema (después de inyectar el nav, para que el botón exista al aplicar el estado)
    if (window.ThemeManager) new ThemeManager();

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
      <a href="${l.href}" class="nav-link${l.key === active ? ' active' : ''}"${l.key === active ? ' aria-current="page"' : ''}>${l.label}</a>
    `).join('') + '<a href="../index.html#contacto" class="nav-link nav-link--cta">Contáctanos</a>';

    return `
      <a href="../index.html" class="nav-logo">
        <div class="nav-logo-mark nav-logo-mark--img">
          <img src="../assets/images/logo.png" alt="NIMACh" class="nav-logo-img">
        </div>
        <div class="nav-brand">
          <span class="nav-name">NIMACh</span>
          <span class="nav-sub">Neurofisiología · UMAG</span>
        </div>
      </a>
      <div class="nav-links" id="nav-links">${linksHTML}</div>
      <div class="nav-right">
        <a class="nav-pill" href="proyectos.html#activos" title="Ver proyectos activos">
          <span class="badge-dot" style="background:var(--c-teal)"></span>
          FONDECYT Activo
        </a>
        <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Cambiar tema">
          <span id="theme-icon" aria-hidden="true"></span>
        </button>
        <a href="../index.html#contacto" class="nav-cta">Contáctanos</a>
        <button class="nav-hamburger" type="button" aria-label="Abrir menú"
                aria-expanded="false" aria-controls="nav-links">
          <span></span><span></span><span></span>
        </button>
      </div>`;
  }

  /* ══ FOOTER ══ */
  static _footerHTML() {
    const chips = ((window.NIMACH_DATA || {}).collaborators || []).filter(c => c.inFooter !== false).map(c => c.name);
    const nav = [
      ['Investigación','investigacion.html'], ['Proyectos','proyectos.html'],
      ['Personas','personas.html'], ['Herramientas','herramientas.html'],
      ['Publicaciones','publicaciones.html'], ['Galería','galeria.html'],
      ['Contacto','../index.html#contacto'],
    ];
    return `
      <div class="footer-top">
        <a href="../index.html" class="footer-left" aria-label="NIMACh — ir al inicio">
          <span class="nav-logo-mark nav-logo-mark--img" style="width:30px;height:30px;border-radius:7px;flex-shrink:0;">
            <img src="../assets/images/logo.png" alt="" class="nav-logo-img">
          </span>
          <span class="footer-brand">NIMACh Group</span>
        </a>
        <nav class="footer-nav" aria-label="Mapa del sitio">
          ${nav.map(([l, h]) => `<a href="${h}">${l}</a>`).join('')}
        </nav>
      </div>
      <div class="footer-bottom">
        <div class="footer-chips">${chips.map(c => `<span class="footer-chip">${c}</span>`).join('')}</div>
        <span class="footer-copy">© ${new Date().getFullYear()} · CADI · Universidad de Magallanes · Punta Arenas</span>
      </div>`;
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
      default: return '<p style="padding:80px 32px;color:var(--text-3);">Página no encontrada.</p>';
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
    const topics = this._topicsByFreq(pubs);

    const pubCount  = pubs.length;
    const q1Count   = pubs.filter(p => p.quartile === 'Q1').length;
    const yearRange = years.length > 1 ? `${years[years.length-1]} – ${years[0]}` : years[0] || ' — ';

    return `
      ${this._pageHeroHTML({
        label:     'Output científico',
        title:     'Publicaciones',
        desc:      'Todas las publicaciones del grupo NIMACh. Cargadas desde BibTeX y enriquecidas con métricas de citas en tiempo real vía OpenAlex.',
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
              <div class="pub-stat-val" id="ps-cites">—</div>
              <div class="pub-stat-lbl">Citas totales</div>
            </div>
            <div class="pub-stat">
              <div class="pub-stat-val" id="ps-hindex">—</div>
              <div class="pub-stat-lbl">h-index</div>
            </div>
            <div class="pub-stat">
              <div class="pub-stat-val" id="ps-oa">—</div>
              <div class="pub-stat-lbl">Open Access</div>
            </div>
            <div class="pub-stat">
              <div class="pub-stat-val" id="ps-period" style="font-size:18px;">${yearRange}</div>
              <div class="pub-stat-lbl">Período</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter + list -->
      <section class="page-section light-section" >
        <div class="container">
        
          <!-- Bibliometric charts (populated after BibTeX + OpenAlex load) -->
          <div class="biblio-charts reveal" id="biblio-charts">
            <div class="biblio-chart-card">
              <span class="label" style="margin-bottom:8px;display:block;">Publicaciones por año</span>
              <div id="chart-pubs-year" style="min-height:110px;"></div>
            </div>
            <div class="biblio-chart-card">
              <span class="label" style="margin-bottom:8px;display:block;">Perfil de citas · h-index</span>
              <div id="chart-citations" style="min-height:110px;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:11px;color:var(--text-3);">Cargando OpenAlex…</span>
              </div>
            </div>
          </div>

          <!-- Barra de herramientas: búsqueda · orden · año · tema -->
          <div class="pub-toolbar reveal" role="search" id="pub-toolbar">
            <div class="pub-toolbar-row">
              <div class="pub-search-wrap" id="pub-search-wrap">
                <input id="pub-search" class="pub-search" type="search" autocomplete="off"
                  placeholder="Buscar por título, autor o revista…" aria-label="Buscar publicaciones" />
                <button type="button" class="pub-search-clear" id="pub-search-clear" aria-label="Borrar búsqueda">✕</button>
                <kbd class="pub-search-kbd" aria-hidden="true">/</kbd>
              </div>
              <div class="seg" role="group" aria-label="Ordenar por" id="pub-sort">
                <button type="button" class="seg-btn active" data-sort="recent" aria-pressed="true">Recientes</button>
                <button type="button" class="seg-btn" data-sort="cites" aria-pressed="false">Más citadas</button>
              </div>
            </div>
            <div class="pub-toolbar-row">
              <span class="pub-toolbar-label">Año</span>
              <div class="pub-filter-group pub-filter-group--scroll" id="pub-years">${this._yearButtonsHTML(years)}</div>
            </div>
            <div class="pub-toolbar-row">
              <span class="pub-toolbar-label">Tema</span>
              <div class="pub-filter-group" id="pub-topics">${this._topicButtonsHTML(topics)}</div>
            </div>
          </div>

          <!-- Resultados + filtros activos -->
          <div class="pub-results" id="pub-results" aria-live="polite"></div>

          <!-- Tarjetas -->
          <div class="pub-list" id="pub-page-list">
            ${pubs.map((p, i) => this._pubCardHTML(p, i)).join('')}
          </div>
          <div class="empty-state" id="pub-empty" hidden>
            <strong>Ninguna publicación coincide</strong>
            Prueba con otra palabra, quita algún filtro o revisa la ortografía.
            <div><button type="button" class="btn-primary" data-pub-reset>Limpiar filtros</button></div>
          </div>

        </div>
      </section>`;
  }

  static _yearButtonsHTML(years) {
    return `<button type="button" class="pub-filter-btn active" data-filter="all" data-type="year" aria-pressed="true">Todos</button>` +
      years.map(y => `<button type="button" class="pub-filter-btn" data-filter="${y}" data-type="year" aria-pressed="false">${y}</button>`).join('');
  }

  /** Temas ordenados por frecuencia (los más usados primero) */
  static _topicsByFreq(pubs) {
    const f = {};
    pubs.forEach(p => (p.topics || []).forEach(t => { f[t] = (f[t] || 0) + 1; }));
    return Object.keys(f).sort((a, b) => f[b] - f[a] || a.localeCompare(b));
  }

  /** Muestra los 10 temas más frecuentes; el resto se despliega con "+N más" */
  static _topicButtonsHTML(topics) {
    const SHOW = 10;
    const btns = topics.map((t, i) =>
      `<button type="button" class="pub-topic-btn${i >= SHOW ? ' is-extra' : ''}" data-topic="${t}" aria-pressed="false">${t}</button>`).join('');
    const more = topics.length > SHOW
      ? `<button type="button" class="pub-topic-btn chip-more" data-more aria-expanded="false">+${topics.length - SHOW} más</button>` : '';
    return btns + more;
  }

  /* ══ Utilidades de publicaciones ══ */
  static _norm(str) {
    return String(str || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[-–]/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /** Nombre de pila + apellidos de una persona, normalizados */
  static _personMatcher(person) {
    const t = this._norm(person.name).split(' ').filter(Boolean);
    return { given: t[0] || '', surnames: t.slice(1).filter(x => x.length > 2) };
  }

  /**
   * ¿Figura esta persona entre los autores? Coincide si el autor tiene el nombre de pila
   * (o su inicial) Y algún apellido, en cualquier orden: "Mabe-Castro, Diego" · "Mabe Castro D."
   * Usa la lista COMPLETA de autores cuando existe (la tarjeta solo muestra 4 + "et al.").
   */
  static _pubHasAuthor(pub, person) {
    const m = person._m || (person._m = this._personMatcher(person));
    if (!m.given || !m.surnames.length) return false;
    const entries = pub.authorList || String(pub.authors || '').split(/,\s+/).filter(x => x && !/et al/i.test(x));
    return entries.some(e => {
      const tk = this._norm(e).split(' ');
      return m.surnames.some(s => tk.includes(s)) && (tk.includes(m.given) || tk.includes(m.given[0]));
    });
  }

  static _pubCite(p) {
    const doi = (p.doi || '').startsWith('10.') ? ` https://doi.org/${p.doi}` : '';
    return `${p.authors} (${p.year}). ${p.title}. ${p.journal || ''}.${doi}`.replace(/\s+/g, ' ').trim();
  }

  static _pubCardHTML(p, i) {
    const E       = window.NIMUI ? NIMUI.esc : (x => x);
    const delay   = ['','delay-1','delay-2','delay-3','delay-4','delay-5'][Math.min(i % 6, 5)];
    const q       = p.quartile ? `<span class="pub-q">${p.quartile}</span>` : '';
    const doi     = p.doi || '';
    const hasDoi  = doi.startsWith('10.');
    const href    = hasDoi ? `https://doi.org/${doi}` : ((window.NIMUI && NIMUI.isReal(p.url)) ? p.url : '');
    const topics  = (p.topics || []).join('|');   // '|' porque hay temas de varias palabras
    const search  = this._norm(`${p.title} ${p.authors} ${p.journal} ${p.year}`);

    // El TÍTULO es el enlace al artículo; la tarjeta entera responde (enlace extendido)
    const title = href
      ? `<a class="card-link" href="${E(href)}" target="_blank" rel="noopener">${p.title}<span class="visually-hidden"> (se abre en una pestaña nueva)</span></a>`
      : p.title;

    return `
      <article class="pub-card${href ? ' is-interactive' : ''} reveal ${delay}"
        data-year="${p.year}"
        data-topic="${E(topics)}"
        data-pub-id="${E(p.id)}"
        data-cites="${p.citations || 0}"
        data-search="${E(search)}"
        ${hasDoi ? `data-doi="${E(doi)}"` : ''}>
        <div class="pub-year">${p.year}</div>
        <div class="pub-body">
          <h4 class="pub-title">${title}</h4>
          <p class="pub-authors">${p.authors}</p>
          <div class="pub-journal"><span>${p.journal || ''}</span>${q}</div>
          <div class="pub-actions">
            ${hasDoi ? `<button type="button" class="mini-btn" data-copy="${E(doi)}" data-copy-msg="DOI copiado">Copiar DOI</button>` : ''}
            <button type="button" class="mini-btn" data-copy="${E(this._pubCite(p))}" data-copy-msg="Cita copiada">Copiar cita</button>
          </div>
        </div>
      </article>`;
  }

  /* ══════════════════════════════════
     PERSONAS
  ══════════════════════════════════ */
  static _personasHTML() {
    const people  = (window.NIMACH_DATA.people  || []).filter(p => p.active !== false);
    const alumni  = window.NIMACH_DATA.alumni   || [];
    const pets    = window.NIMACH_DATA.pets      || [];

    // Contar por categoría (solo activos)
    const cats  = p => Array.isArray(p.role_category) ? p.role_category : [p.role_category];
    const count = cat => people.filter(p => cats(p).includes(cat)).length;

    return `
      ${this._pageHeroHTML({
        label:     'Nuestro equipo',
        title:     'Personas',
        desc:      'Investigadores, doctorandos y colaboradores que conforman el NIMACh. Unidos por la curiosidad sobre el eje cerebro-corazón desde la Patagonia.',
        accent:    'teal',
        backHref:  '../index.html#personas',
        backLabel: 'Volver a inicio',
      })}

      <!-- Miembros activos -->
      <section class="page-section light-section">
        <div class="container">

          <div class="people-filter-bar reveal">
            <button class="people-tab active" data-cat="all">
              Todos <span class="tab-count">${people.length}</span>
            </button>
            ${(NIMACH_DATA.people_categories || [])
              .filter(cat => people.some(p => {
                const cats = Array.isArray(p.role_category) ? p.role_category : [p.role_category];
                return cats.includes(cat.key);
              }))
              .map(cat => `
            <button class="people-tab" data-cat="${cat.key}">
              ${cat.label} <span class="tab-count">${count(cat.key)}</span>
            </button>`).join('')}
          </div>

          <div class="people-page-grid" id="people-page-grid"></div>
          <div id="people-sentinel" style="height:1px;"></div>

        </div>
      </section>

      <!-- NIMAChinos -->
      ${pets.length ? `
      <section class="page-section light-section" id="nimachinos">
        <div class="container">
          <div class="reveal" style="margin-bottom:28px;">
            <span class="label">Los que realmente mandan</span>
            <h2 class="section-title">NIMAChinos</h2>
            <p class="section-desc">Las mascotas del equipo. Co-investigadores no remunerados, expertos en reducción de estrés y en arruinar presentaciones importantes.</p>
          </div>
          <div class="pets-grid">
            ${pets.map((pet, i) => this._petCardHTML(pet, i)).join('')}
          </div>
        </div>
      </section>` : ''}

      <!-- Alumni -->
      ${alumni.length ? `
      <section class="page-section light-section" id="alumni">
        <div class="container">
          <div class="reveal" style="margin-bottom:28px;">
            <span class="label">Parte de nuestra historia</span>
            <h2 class="section-title" style="font-size:18px;">Alumni</h2>
            <p class="section-desc">Exmiembros que formaron parte del grupo y siguen siendo parte de la red NIMACh.</p>
          </div>
          <div class="alumni-grid">
            ${alumni.map((a, i) => this._alumniCardHTML(a, i)).join('')}
          </div>
        </div>
      </section>` : ''}`;
  }
  
  static _avatarInnerHTML(person, size = null, basePath = '../') {
    const sizeStyle = size ? `width:${size}px;height:${size}px;font-size:${Math.round(size*0.35)}px;` : '';
    if (person.photo) {
      return `<div class="avatar ${person.avatar || ''} avatar--photo" style="${sizeStyle}">
        <img src="${basePath}${person.photo}" alt="${person.name}" loading="lazy">
      </div>`;
    }
    return `<div class="avatar ${person.avatar || ''}" style="${sizeStyle}">${person.initials || ''}</div>`;
  }
  
  static _personCardHTML(p, i) {
    const delay = ['','delay-1','delay-2','delay-3'][Math.min(i % 4, 3)];
    const pubs  = (window.NIMACH_DATA.publications || []).filter(pub => NIMPage._pubHasAuthor(pub, p));
    const labels = { researchgate:'ResearchGate', orcid:'ORCID', scholar:'Scholar', github:'GitHub' };

    // Solo enlaces reales: nada de botones que no llevan a ningún sitio
    const linksHTML = Object.entries(p.links || {}).filter(([, v]) => (window.NIMUI ? NIMUI.isReal(v) : v && v !== '#')).map(([k, v]) =>
      `<a href="${v}" target="_blank" rel="noopener" class="person-link-btn">${labels[k] || k}</a>`
    ).join('');

    const chipsHTML = (p.chips || []).map(c => `<span class="person-chip">${c}</span>`).join('');

    return `
      <article class="person-page-card reveal ${delay}" id="${p.id}"
        data-cat="${(Array.isArray(p.role_category) ? p.role_category : [p.role_category]).join(' ')}">
        <div class="person-page-top">
          <div class="avatar-wrap">
            ${NIMPage._avatarInnerHTML(p)}
            <div class="avatar-ring"></div>
          </div>
          <div class="person-page-meta">
            <h3 class="person-name">${p.name}</h3>
            <p class="person-role">${p.role}</p>
            ${pubs.length ? `<a class="person-pub-count" href="publicaciones.html?autor=${p.id}"
                title="Ver las ${pubs.length} publicaciones de ${p.name}">${pubs.length} pub${pubs.length !== 1 ? 's' : ''}</a>` : ''}
          </div>
        </div>
        <p class="person-bio">${p.bio || ''}</p>
        <div class="person-chips">${chipsHTML}</div>
        ${linksHTML ? `<div class="person-links">${linksHTML}</div>` : ''}
      </article>`;
  }
  
  static _petCardHTML(pet, i) {
    const delay = ['','delay-1','delay-2','delay-3'][Math.min(i, 3)];
    const owner = (window.NIMACH_DATA.people || []).find(p => p.id === pet.owner);
    const ownerHTML = owner ? `
      <div class="pet-owner">
        ${NIMPage._avatarInnerHTML(owner, 22)}
        <span>Compañero de ${owner.name.split(' ')[0]}</span>
      </div>` : '';

    const chipsHTML = (pet.chips || []).map(c =>
      `<span class="person-chip">${c}</span>`).join('');

    return `
      <article class="pet-card reveal ${delay}">
        ${pet.photo
          ? `<div class="pet-avatar">
               <img src="../${pet.photo}" alt="${pet.name}" loading="lazy">
             </div>`
          : `<div class="pet-emoji">${pet.emoji}</div>`
        }
        <div class="pet-body">
          <div class="pet-header">
            <h3 class="pet-name">${pet.name}</h3>
            <span class="pet-species">${pet.species} · ${pet.breed}</span>
          </div>
          <p class="pet-bio">${pet.bio}</p>
          ${ownerHTML}
        </div>
      </article>`;
  }

  static _alumniCardHTML(a, i) {
    const delay = ['','delay-1','delay-2','delay-3'][Math.min(i, 3)];
    const labels = { researchgate:'RG', orcid:'ORCID', scholar:'Scholar', github:'GitHub' };
    const linksHTML = Object.entries(a.links || {}).filter(([, v]) => (window.NIMUI ? NIMUI.isReal(v) : v && v !== '#')).map(([k, v]) =>
      `<a href="${v}" target="_blank" rel="noopener" class="person-link-btn">${labels[k] || k}</a>`
    ).join('');

    return `
      <article class="alumni-card reveal ${delay}">
        <div class="alumni-avatar-wrap">
          ${NIMPage._avatarInnerHTML(a, 38)}
        </div>
        <div class="alumni-body">
          <div class="alumni-header">
            <h4 class="alumni-name">${a.name}</h4>
            <span class="alumni-period">${a.period}</span>
          </div>
          <p class="alumni-role">${a.role}</p>
          ${a.currentPosition ? `
          <p class="alumni-current">
            <span class="alumni-current-label">Actualmente en:</span>
            ${a.currentPosition}
          </p>` : ''}
          ${linksHTML ? `<div class="alumni-links">${linksHTML}</div>` : ''}
        </div>
      </article>`;
  }
  /* ══════════════════════════════════
     HOME — People preview
  ══════════════════════════════════ */
  static _homePersonCardHTML(p, i) {
    const delay  = ['','delay-1','delay-2','delay-3'][Math.min(i, 3)];
    const labels = { researchgate:'ResearchGate', orcid:'ORCID', scholar:'Scholar', github:'GitHub' };
    const linksHTML = Object.entries(p.links || {}).filter(([, v]) => (window.NIMUI ? NIMUI.isReal(v) : v && v !== '#')).map(([k, v]) =>
      `<a class="social-btn" href="${v}" target="_blank" rel="noopener">${labels[k] || k}</a>`
    ).join('');
    const chipsHTML = (p.chips || []).map(c => `<span class="person-chip">${c}</span>`).join('');

    return `
      <article class="person-card is-interactive reveal ${delay}">
        <div class="avatar-wrap">
          ${NIMPage._avatarInnerHTML(p, null, '')}
          <div class="avatar-ring"></div>
        </div>
        <h3 class="person-name"><a class="card-link" href="pages/personas.html#${p.id}">${p.name}</a></h3>
        <p class="person-role">${p.role}</p>
        <div class="person-chips">${chipsHTML}</div>
        ${linksHTML ? `<div class="person-social">${linksHTML}</div>` : ''}
        <span class="card-cta" aria-hidden="true">Ver perfil <span class="arrow">→</span></span>
      </article>`;
  }
  
  static _svgByBg() {
    return {
      'gi-1': `<svg viewBox="0 0 200 360" aria-hidden="true">
        <circle cx="100" cy="130" r="55" fill="none" stroke="rgba(var(--accent-rgb),.5)" stroke-width=".8"/>
        <circle cx="100" cy="130" r="6" fill="rgba(var(--accent-rgb),.85)"/>
        <line x1="100" y1="130" x2="58"  y2="96"  stroke="rgba(var(--accent-rgb),.4)" stroke-width=".7"/>
        <line x1="100" y1="130" x2="142" y2="96"  stroke="rgba(var(--accent-rgb),.4)" stroke-width=".7"/>
        <circle cx="58"  cy="96"  r="4" fill="rgba(var(--accent-rgb),.75)"/>
        <circle cx="142" cy="96"  r="4" fill="rgba(var(--accent-rgb),.75)"/>
        <path d="M10 270 L44 270 L48 252 L52 280 L56 236 L60 286 L64 270 L110 270 L114 250 L118 278 L122 232 L128 282 L132 270 L190 270"
          stroke="rgba(var(--accent-rgb),.7)" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      </svg>`,
      'gi-2': `<svg viewBox="0 0 200 180" aria-hidden="true">
        <path d="M20 90 Q60 40 100 90 Q140 140 180 90" stroke="rgba(var(--accent-rgb),.7)" stroke-width="1.2" fill="none"/>
        <circle cx="20"  cy="90" r="4" fill="rgba(var(--accent-rgb),.9)"/>
        <circle cx="100" cy="90" r="5" fill="rgba(var(--accent-rgb),.9)"/>
        <circle cx="180" cy="90" r="4" fill="rgba(var(--accent-rgb),.9)"/>
      </svg>`,
      'gi-3': `<svg viewBox="0 0 200 180" aria-hidden="true">
        <rect x="30" y="40" width="140" height="90" rx="4" fill="none" stroke="rgba(var(--accent-rgb),.4)" stroke-width=".8"/>
        <line x1="30" y1="60" x2="170" y2="60" stroke="rgba(var(--accent-rgb),.3)" stroke-width=".6"/>
        <circle cx="100" cy="100" r="20" fill="none" stroke="rgba(var(--accent-rgb),.6)" stroke-width="1"/>
        <circle cx="100" cy="100" r="4" fill="rgba(var(--accent-rgb),.9)"/>
      </svg>`,
      'gi-4': `<svg viewBox="0 0 200 180" aria-hidden="true">
        <circle cx="100" cy="90" r="48" fill="none" stroke="rgba(var(--accent-rgb),.65)" stroke-width=".9"/>
        <circle cx="100" cy="90" r="24" fill="none" stroke="rgba(var(--accent-rgb),.4)" stroke-width=".6"/>
        <circle cx="100" cy="90" r="4" fill="rgba(var(--accent-rgb),.9)"/>
      </svg>`,
      'gi-5': `<svg viewBox="0 0 200 180" aria-hidden="true">
        <path d="M30 130 Q65 65 100 88 Q135 112 170 38" stroke="rgba(var(--accent-rgb),.7)" stroke-width="1.2" fill="none"/>
        <circle cx="100" cy="88" r="4" fill="rgba(var(--accent-rgb),.95)"/>
      </svg>`,
      'gi-6': `<svg viewBox="0 0 200 180" aria-hidden="true">
        <circle cx="100" cy="80" r="36" fill="none" stroke="rgba(var(--accent-rgb),.55)" stroke-width=".8"/>
        <path d="M64 110 Q80 130 100 125 Q120 130 136 110" fill="none" stroke="rgba(var(--accent-rgb),.6)" stroke-width="1"/>
        <circle cx="100" cy="80" r="4" fill="rgba(var(--accent-rgb),.9)"/>
      </svg>`,
    };
  }

  static _galleryItemHTML(item, i, basePath = '../') {
    const delay   = ['','delay-1','delay-2','delay-3','delay-4','delay-5'][Math.min(i, 5)];
    const svgMap  = this._svgByBg();
    // Las publicaciones de Instagram traen texto libre: se escapa. Los datos propios (data.js) se confían.
    const E       = item.ig ? NIMUI.esc : (x => x);
    const media   = item.photo
      ? `<img src="${basePath}${E(item.photo)}" alt="${E(item.alt || item.title)}"
             style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy" decoding="async">`
      : `<div class="gallery-svg">${svgMap[item.bg] || ''}</div>`;

    return `
      <div class="gallery-item${item.span ? ' g-span-2' : ''}${item.ig ? ' gallery-item--ig' : ''} reveal ${delay}"
           role="button" tabindex="0" aria-label="Ampliar imagen: ${E(item.title)}"
           ${item.ig ? `data-permalink="${E(item.permalink)}" data-caption="${E(item.caption || '')}"` : ''}>
        <div class="gallery-item-inner ${item.photo ? '' : item.bg}">
          ${media}
          <div class="gallery-overlay"></div>
          <div class="gallery-label">
            <div class="gallery-label-title">${E(item.title)}</div>
            <div class="gallery-label-sub">${E(item.sub)}</div>
          </div>
        </div>
      </div>`;
  }

  /* ══════════════════════════════════
     INSTAGRAM  (data/instagram.json, ver docs/INSTAGRAM.md)
  ══════════════════════════════════ */
  /** Lee el feed guardado. Nunca rechaza: devuelve null si no existe o es inválido. */
  static loadInstagram() {
    if (!this._igPromise) {
      const base = location.pathname.includes('/pages/') ? '../' : '';
      this._igPromise = fetch(base + 'data/instagram.json', { cache: 'no-cache' })
        .then(r => (r.ok ? r.json() : null))
        .then(d => (d && Array.isArray(d.posts) ? d : null))
        .catch(() => null);
    }
    return this._igPromise;
  }

  /** Publicaciones → elementos de galería (solo rutas y enlaces con el formato esperado) */
  static _igItems(feed, limit = 12) {
    if (!feed) return [];
    const fmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
    return feed.posts
      .filter(p => p && /^https:\/\/www\.instagram\.com\//.test(p.permalink || '') &&
                   /^assets\/images\/instagram\/[\w.-]+$/.test(p.image || ''))
      .slice(0, limit)
      .map(p => {
        const caption = String(p.caption || '').replace(/\s+/g, ' ').trim();
        const body    = caption.replace(/(\s*#[\p{L}\d_]+)+\s*$/u, '').trim() || caption;   // sin hashtags finales
        let title = body || 'Publicación de Instagram';
        if (title.length > 80) title = title.slice(0, 80).replace(/\s+\S*$/, '') + '…';
        const d = new Date(p.date);
        return { id: 'ig-' + p.id, ig: true, photo: p.image, title, caption, permalink: p.permalink,
                 sub: isNaN(d) ? 'Instagram' : fmt.format(d), alt: title };
      });
  }

  /** Reemplaza el contenido de una cuadrícula por las publicaciones (si hay) */
  static _fillGridFromIG(grid, items, basePath) {
    grid.classList.add('gallery-grid--ig');
    grid.innerHTML = items.map((it, i) => this._galleryItemHTML(it, i, basePath)).join('');
    requestAnimationFrame(() => grid.querySelectorAll('.reveal').forEach(el => {
      if (window._scrollRevealObserver) window._scrollRevealObserver.observe(el);
      else el.classList.add('visible');
    }));
  }

  static _newsItemHTML(n, i) {
    const delay = ['','delay-1','delay-2','delay-3'][Math.min(i % 4, 3)];
    return `
      <div class="timeline-item reveal ${delay}">
        <div class="timeline-dot${n.hot ? ' hot' : ''}"></div>
        <div class="timeline-date">${n.date}</div>
        <p class="timeline-text">${n.html}</p>
        <span class="timeline-tag">${n.tag}</span>
      </div>`;
  }

  static initHomeNews() {
    const wrap = document.getElementById('home-news-timeline');
    if (!wrap || !window.NIMACH_DATA) return;

    const items = (window.NIMACH_DATA.news || [])
      .filter(n => n.featured_home);

    wrap.innerHTML = items
      .map((n, i) => NIMPage._newsItemHTML(n, i))
      .join('');

    // Defer so scroll.js DOMContentLoaded (#3) has registered its observer first
    requestAnimationFrame(() => {
      wrap.querySelectorAll('.reveal').forEach(el => {
        if (window._scrollRevealObserver) window._scrollRevealObserver.observe(el);
        else el.classList.add('visible');
      });
    });
  }

  static initHomeGallery() {
    const grid = document.getElementById('home-gallery-grid');
    if (!grid || !window.NIMACH_DATA) return;

    const placeholders = () => {
      grid.innerHTML = (window.NIMACH_DATA.gallery || []).filter(g => g.featured_home)
        .map((item, i) => NIMPage._galleryItemHTML(item, i, '')).join('');
      requestAnimationFrame(() => grid.querySelectorAll('.reveal').forEach(el => {
        if (window._scrollRevealObserver) window._scrollRevealObserver.observe(el);
        else el.classList.add('visible');
      }));
    };

    grid.setAttribute('aria-busy', 'true');
    NIMPage.loadInstagram().then(feed => {
      const items = NIMPage._igItems(feed, 6);
      items.length ? NIMPage._fillGridFromIG(grid, items, '') : placeholders();
      grid.removeAttribute('aria-busy');
    });
  }

  /* ══════════════════════════════════
     PORTADA dirigida por datos (editables desde el editor del sitio)
  ══════════════════════════════════ */
  static _observeReveal(root) {
    requestAnimationFrame(() => root.querySelectorAll('.reveal').forEach(el => {
      if (window._scrollRevealObserver) window._scrollRevealObserver.observe(el);
      else el.classList.add('visible');
    }));
  }

  static initHomeResearch() {
    const grid = document.getElementById('home-research-grid');
    const lines = (window.NIMACH_DATA || {}).research || [];
    if (!grid) return;
    grid.innerHTML = lines.map((l, i) => `
      <article class="research-card is-interactive reveal delay-${Math.min(i + 1, 3)}">
        <div class="card-icon" aria-hidden="true">${NIMUI.icon(l.icon, 20)}</div>
        <h3 class="card-title"><a class="card-link" href="pages/investigacion.html#${NIMUI.esc(l.id)}">${l.title}</a></h3>
        <p class="card-desc">${l.desc}</p>
        <div class="card-tags">${(l.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
        <span class="card-cta" aria-hidden="true">Explorar línea <span class="arrow">→</span></span>
      </article>`).join('');
    this._observeReveal(grid);
  }

  static initHomeParadigm() {
    const P = (window.NIMACH_DATA || {}).paradigm;
    if (!P) return;
    const txt = document.getElementById('home-paradigm-text');
    if (txt) txt.innerHTML = '«' + NIMLite.toHtml(P.summary || P.quote || '') + '»';
    const box = document.getElementById('home-pillars');
    if (box) box.innerHTML = (P.pillars || []).map((pl, i) => `
      <a class="pb-pillar" href="pages/investigacion.html#pdg-${NIMUI.esc(pl.id)}">
        <span class="pb-icon" aria-hidden="true">${NIMUI.icon(pl.icon, 20)}</span>
        <span class="pb-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="pb-name">${pl.label}</span>
      </a>`).join('');
  }

  /** Hero, DEI, contacto y chips de colaboradores (el HTML trae el texto actual como respaldo) */
  static initHomeTexts() {
    const D = window.NIMACH_DATA || {}, T = D.texts || {};
    const $ = id => document.getElementById(id);
    const lines = s => NIMLite.toHtml(s || '');          // saltos de línea → <br>, texto escapado

    if (T.hero && T.hero.subtitle && $('hero-sub')) $('hero-sub').innerHTML = NIMLite.toHtml(T.hero.subtitle);

    const dei = T.dei;
    if (dei) {
      if (dei.title && $('dei-title')) $('dei-title').textContent = dei.title.replace(/&lt;/g, '<');
      if (dei.lead && $('dei-lead')) $('dei-lead').innerHTML = NIMLite.toHtml(dei.lead);
      if ((dei.cards || []).length && $('dei-grid')) {
        $('dei-grid').innerHTML = dei.cards.map((c, i) => `
          <article class="dei-card reveal delay-${Math.min(i + 1, 3)}">
            <div class="dei-card-icon" aria-hidden="true">${NIMUI.icon(c.icon, 24)}</div>
            <h3 class="dei-card-title">${c.title}</h3>
            <p class="dei-card-text">${c.text}</p>
          </article>`).join('');
        this._observeReveal($('dei-grid'));
      }
    }

    const C = T.contact;
    if (C) {
      if (C.address && $('contact-address')) $('contact-address').innerHTML = lines(C.address);
      if (C.address && $('contact-map')) {
        $('contact-map').href = 'https://www.google.com/maps/search/?api=1&query=' +
          encodeURIComponent(C.address.replace(/\s*\n\s*/g, ', ').replace(/^[^,]*CADI[^,]*,\s*/i, ''));
      }
      if (C.institution && $('contact-institution')) $('contact-institution').innerHTML = lines(C.institution);
      if (C.website && $('contact-website')) $('contact-website').textContent = C.website;
    }

    const collab = D.collaborators || [];
    if ($('contact-chips') && collab.length) $('contact-chips').innerHTML = collab.map(c => this._collabChip(c)).join('');
    if ($('footer-chips') && collab.length) {
      $('footer-chips').innerHTML = collab.filter(c => c.inFooter !== false)
        .map(c => `<span class="footer-chip">${c.name}</span>`).join('');
    }
    if (window.NIMUI) NIMUI.hydrateIcons();
  }

  static _collabChip(c) {
    return c.url
      ? `<a class="collab-chip" href="${NIMUI.esc(c.url)}" target="_blank" rel="noopener">${c.name}</a>`
      : `<span class="collab-chip">${c.name}</span>`;
  }

  static _projectCardHTML(p, i, opts = {}) {
    const delay    = ['','delay-1','delay-2','delay-3'][Math.min(i, 3)];
    const badge    = p.status === 'active'
      ? `<span class="badge badge-active"><span class="badge-dot"></span>En curso</span>`
      : `<span class="badge badge-complete">Finalizado</span>`;
    const tagsHTML = (p.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    // En la home la tarjeta lleva a SU proyecto; en la página de proyectos no se enlaza a sí misma
    const title = opts.href ? `<a class="card-link" href="${opts.href}">${p.title}</a>` : p.title;

    return `
      <article class="project-card${opts.href ? ' is-interactive' : ''} reveal ${delay}" id="${p.id}">
        <div class="project-top">
          ${badge}
          <div class="project-agency">${p.agency}<br>${p.code}</div>
        </div>
        <h3 class="project-title">${title}</h3>
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
        ${opts.href ? `<span class="card-cta" aria-hidden="true">Ver proyecto <span class="arrow">→</span></span>` : ''}
      </article>`;
  }

  static initHomeProjects() {
    const grid = document.getElementById('home-projects-grid');
    if (!grid || !window.NIMACH_DATA) return;

    const projects = (window.NIMACH_DATA.projects || [])
      .filter(p => p.featured_home);

    grid.innerHTML = projects
      .map((p, i) => NIMPage._projectCardHTML(p, i, { href: `pages/proyectos.html#${p.id}` }))
      .join('');

    // Activar barras de progreso
    if (window.ProgressBars) new ProgressBars();
    else {
      setTimeout(() => {
        grid.querySelectorAll('.progress-fill').forEach(el => {
          el.style.width = (el.dataset.width || 0) + '%';
        });
      }, 200);
    }

    // Re-registrar .reveal
    if (window._scrollRevealObserver) {
      grid.querySelectorAll('.reveal').forEach(el =>
        window._scrollRevealObserver.observe(el)
      );
    }
  }
  
  static initHomeTools() {
    const grid = document.getElementById('home-tools-grid');
    if (!grid || !window.NIMACH_DATA) return;

    const tools    = window.NIMACH_DATA.tools || [];
    const featured = tools.find(t => t.featured_home);
    const rest     = tools.filter(t => t !== featured);

    grid.innerHTML = `
      ${featured ? this._featuredToolHTML(featured) : ''}
      ${rest.length
        ? `<div class="tools-side">
             ${rest.map((t, i) => this._toolCardHTML(t, i)).join('')}
           </div>`
        : ''}
    `;

    // Re-registrar elementos .reveal con el observer global
    if (window._scrollRevealObserver) {
      grid.querySelectorAll('.reveal').forEach(el =>
        window._scrollRevealObserver.observe(el)
      );
    }
  }

  static initHomePeople() {
    const grid = document.getElementById('home-people-grid');
    if (!grid || !window.NIMACH_DATA) return;
    const featured = (NIMACH_DATA.people || [])
      .filter(p => p.active !== false && p.featured_home);
    grid.innerHTML = featured.map((p, i) => NIMPage._homePersonCardHTML(p, i)).join('');
  }

  /* ══════════════════════════════════
     HERRAMIENTAS
  ══════════════════════════════════ */
  static _herramientasHTML() {
    const tools = window.NIMACH_DATA.tools || [];
    const featuredTools = tools.filter(t => t.featured_page);
    const rest          = tools.filter(t => !t.featured_page);

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

          ${featuredTools.map(t => this._featuredToolHTML(t)).join('')}

          <div class="tools-page-grid">
            ${rest.map((t, i) => this._toolCardHTML(t, i)).join('')}
          </div>

          <!-- Contribute callout -->
          <div class="contribute-callout reveal">
            <div class="contribute-icon">${NIMUI.icon('wrench', 26)}</div>
            <div class="contribute-body">
              <div class="contribute-title">¿Quieres contribuir?</div>
              <p class="contribute-desc">
                NIMACh desarrolla todas sus herramientas con licencia MIT o Apache 2.0.
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
        <div class="avatar ${authorData.avatar}" style="width:28px;height:28px;font-size:8px;">
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
            <div class="tool-icon">${NIMUI.icon(t.icon, 22)}</div>
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
          <div class="tool-icon">${NIMUI.icon(t.icon, 22)}</div>
          <span class="badge badge-complete">
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
     PARADIGM BLOCK (shared renderer)
  ══════════════════════════════════ */
  static _paradigmHTML() {
    const p = window.NIMACH_DATA.paradigm;
    if (!p) return '';



    const pillarsHTML = p.pillars.map((pl, i) => {
      const delay = ['', 'delay-1', 'delay-2'][i];
      const tagsHTML = pl.tags.map(t => `<span class="tag">${t}</span>`).join('');
      return `
        <div class="pdg-pillar pdg-${pl.color} reveal ${delay}" id="pdg-${pl.id}">
          <div class="pdg-pillar-top">
            <span class="pdg-pillar-icon">${NIMUI.icon(pl.icon, 20)}</span>
            <span class="pdg-pillar-num">${pl.num}</span>
          </div>
          <h3 class="pdg-pillar-name">${pl.label}</h3>
          <p class="pdg-pillar-question">${pl.question}</p>
          <p class="pdg-pillar-desc">${pl.desc}</p>
          <div class="pdg-pillar-tags">${tagsHTML}</div>
        </div>`;
    }).join('');

    return `
      <div class="pdg-header reveal">
        <span class="paradigm-eyebrow">Paradigma central · ¿Para qué investigamos?</span>
        <h2 class="pdg-title">La resiliencia como proceso,<br>no como rasgo</h2>
      </div>

      <div class="pdg-quote-block reveal delay-1">
        <div class="pdg-quote-mark">"</div>
        <blockquote class="pdg-quote-text">${p.quote}</blockquote>
        <div class="pdg-core-badge">
          <span class="pdg-core-icon">⬡</span>
          <span>Autopoiesis · Auto-organización dinámica</span>
        </div>
      </div>

      <div class="pdg-diagram">
        <div class="pdg-diagram-center">
          <div class="pdg-diagram-node">
            <div class="pdg-node-pulse"></div>
            <span class="pdg-node-icon">${NIMUI.icon('network', 22)}</span>
            <span class="pdg-node-label">Resiliencia<br>como proceso</span>
          </div>
          <div class="pdg-diagram-arms">
            <div class="pdg-arm pdg-arm-blue"></div>
            <div class="pdg-arm pdg-arm-coral"></div>
            <div class="pdg-arm pdg-arm-teal"></div>
          </div>
        </div>
        <div class="pdg-pillars-row">
          ${pillarsHTML}
        </div>
      </div>`;
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

    // Tema más frecuente entre las publicaciones de cada línea → enlace "Ver todas"
    const allPubs   = window.NIMACH_DATA.publications || [];
    const topicFor  = id => {
      const tags = (lines.find(l => l.id === id)?.tags || []).map(t => t.toLowerCase());
      const freq = {};
      allPubs.forEach(p => (p.topics || []).forEach(t => {
        if (tags.some(tag => tag.includes(t) || t.includes(tag))) freq[t] = (freq[t] || 0) + 1;
      }));
      return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
    };

    const lineCards = lines.map((l, i) => {
      const delay = ['','delay-1','delay-2'][i] || '';
      const relPubs = pubsByLine(l.id);

      const topic = topicFor(l.id);
      const pubsHTML = relPubs.length ? `
        <div class="rl-pubs">
          <div class="rl-pubs-label">Publicaciones relacionadas</div>
          ${relPubs.map(p => {
            const hasDoi = (p.doi || '').startsWith('10.');
            const t = p.title.length > 75 ? p.title.slice(0, 75) + '…' : p.title;
            const inner = `<span class="rl-pub-year">${p.year}</span><span class="rl-pub-title">${t}</span>`;
            return hasDoi
              ? `<a class="rl-pub-item" href="https://doi.org/${p.doi}" target="_blank" rel="noopener" title="Abrir el artículo">${inner}</a>`
              : `<div class="rl-pub-item">${inner}</div>`;
          }).join('')}
          ${topic ? `<a class="mini-btn rl-more" href="publicaciones.html?tema=${encodeURIComponent(topic)}">Ver todas las publicaciones de esta línea →</a>` : ''}
        </div>` : '';

      const tagsHTML = (l.tags||[]).map(t => `<span class="tag">${t}</span>`).join('');

      return `
        <article class="rl-card ${l.color} reveal ${delay}" id="${l.id}">
          <div class="rl-card-header">
            <div class="card-icon ${l.ic}">${NIMUI.icon(l.icon, 20)}</div>
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
    // Solo se ven como botón los colaboradores con enlace real; el resto son etiquetas
    const collabs = (window.NIMACH_DATA.collaborators||[]).map(c =>
      c.url
        ? `<a href="${c.url}" class="collab-chip" target="_blank" rel="noopener">${c.name}</a>`
        : `<span class="collab-chip">${c.name}</span>`
    ).join('');

    return `
      ${this._pageHeroHTML({
        label:     'Áreas de estudio',
        title:     'Líneas de investigación',
        desc:      'Tres ejes principales articulados por un paradigma común: la resiliencia como proceso dinámico de autopoiesis que conecta la neurofisiología con la realidad clínica y el entorno patagónico.',
        accent:    'blue',
        backHref:  '../index.html#investigacion',
        backLabel: 'Volver a inicio',
      })}
      
      <section class="paradigm-section">
        <div class="container">
          ${this._paradigmHTML()}
        </div>
      </section>

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

    const _card = (p, i) => NIMPage._projectCardHTML(p, i);

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
              <div class="pub-stat-val">${active.length}</div>
              <div class="pub-stat-lbl">Proyectos activos</div>
            </div>
            <div class="pub-stat">
              <div class="pub-stat-val">${projects.length}</div>
              <div class="pub-stat-lbl">Total proyectos</div>
            </div>
            <div class="pub-stat">
              <div class="pub-stat-val">${complete.length}</div>
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
          <div class="proj-section-title reveal" id="activos">
            <span class="label">En desarrollo</span>
            <h3 class="section-title">Proyectos activos</h3>
          </div>
          <div class="projects-grid proj-page-grid">
            ${active.map(_card).join('')}
          </div>` : ''}

          ${complete.length ? `
          <div class="proj-section-title reveal" id="completados" style="margin-top:48px;">
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

    const galleryCards = items.map((item, i) => this._galleryItemHTML(item, i, '../')).join('');
    const newsItems    = news.map((n, i)    => this._newsItemHTML(n, i)).join('');

    return `
      ${this._pageHeroHTML({
        label:     'Registro visual',
        title:     'Galería',
        desc:      'Momentos del trabajo en terreno, seminarios, colaboraciones y vida del grupo NIMACh desde el fin del mundo.',
        accent:    'purple',
        backHref:  '../index.html#galeria',
        backLabel: 'Volver a inicio',
      })}

      <!-- Gallery grid -->
      <section class="page-section light-section" >
        <div class="container">
          <div class="gallery-head reveal">
            <span class="label">Fotografías y eventos</span>
            <a class="see-all" href="https://www.instagram.com/nimach_group/" target="_blank" rel="noopener">
              <span data-icon="instagram" data-size="16" aria-hidden="true"></span> Síguenos en Instagram @nimach_group
            </a>
          </div>
          <div class="gallery-grid" id="page-gallery-grid" style="margin-top:16px;" aria-busy="true">${galleryCards}</div>
          <p class="ig-note" id="ig-note" hidden></p>
        </div>
      </section>

      <!-- Timeline de noticias -->
      <section class="page-section light-section" id="noticias">
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
    
    switch (pageId) {
      case 'publicaciones':  this._afterPublicaciones(); break;
      case 'personas':       this._afterPersonas();      break;
      case 'proyectos':      this._afterProyectos();     break;
      case 'galeria':        this._afterGaleria();       break;
    }

    // Enlaces tipo pagina.html#elemento: llevar al elemento y resaltarlo (ya renderizado)
    if (window.NIMUI) setTimeout(() => NIMUI.handleHash(), 150);
  }
  
  /* ══════════════════════════════════
     BIBLIOMETRIC CHARTS (SVG, no deps)
  ══════════════════════════════════ */

  /** Bar chart: publications per year. Called after BibTeX populates. */
  static _renderPubsByYearChart() {
    const el = document.getElementById('chart-pubs-year');
    if (!el) return;
    const pubs = window.NIMACH_DATA?.publications || [];
    if (!pubs.length) return;

    const yearCounts = {};
    pubs.forEach(p => { yearCounts[p.year] = (yearCounts[p.year] || 0) + 1; });
    const years   = Object.keys(yearCounts).map(Number).sort((a, b) => a - b);
    if (!years.length) return;
    const counts   = years.map(y => yearCounts[y]);
    const maxCount = Math.max(...counts, 1);
    const nowY     = new Date().getFullYear();

    const W = 500, H = 150;
    const pL = 24, pR = 8, pT = 14, pB = 26;
    const cW = W - pL - pR, cH = H - pT - pB;
    const gap  = cW / years.length;
    const barW = Math.max(5, gap * 0.6);

    const bars = years.map((y, i) => {
      const bh   = Math.max(1, (counts[i] / maxCount) * cH);
      const x    = (pL + i * gap + gap / 2 - barW / 2).toFixed(1);
      const yy   = (pT + cH - bh).toFixed(1);
      const isNew = y >= nowY - 2;
      const showLbl = years.length <= 14 || i % 2 === 0 || i === years.length - 1;
      const isMax  = counts[i] === maxCount;
      return `
        <rect x="${x}" y="${yy}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}"
          rx="2" fill="${isNew ? 'var(--accent)' : 'var(--text-3)'}" opacity="${isNew ? 0.95 : 0.4}">
          <title>${y}: ${counts[i]}</title></rect>
        ${showLbl ? `<text x="${(+x + barW / 2).toFixed(1)}" y="${(H - pB + 14).toFixed(1)}"
          text-anchor="middle" font-size="7.5" fill="var(--text-3)">${y}</text>` : ''}
        ${isMax ? `<text x="${(+x + barW / 2).toFixed(1)}" y="${(+yy - 3).toFixed(1)}"
          text-anchor="middle" font-size="8" fill="var(--text-2)">${counts[i]}</text>` : ''}`;
    }).join('');

    // Legend dots
    const legend = `
      <rect x="${pL}" y="2" width="10" height="6" rx="1.5" fill="var(--text-3)" opacity="0.4"/>
      <text x="${pL + 13}" y="9" font-size="8" fill="var(--text-3)">anterior</text>
      <rect x="${pL + 60}" y="2" width="10" height="6" rx="1.5" fill="var(--accent)" opacity="0.95"/>
      <text x="${pL + 73}" y="9" font-size="8" fill="var(--text-3)">últimos 3 años</text>`;

    el.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;">
        <line x1="${pL}" y1="${pT + cH}" x2="${W - pR}" y2="${pT + cH}"
          stroke="var(--line)" stroke-width="0.5"/>
        ${bars}
        ${legend}
      </svg>`;
  }

  /** Ranked bar chart: citations per paper with h-index crosshair. Called after OpenAlex. */
  static _renderCitationsChart() {
    const el = document.getElementById('chart-citations');
    if (!el) return;
    const pubs     = window.NIMACH_DATA?.publications || [];
    const hasCites = pubs.some(p => (p.citations || 0) > 0);

    if (!hasCites) {
      el.innerHTML = `<span style="font-size:11px;color:var(--text-3);">Sin datos aún…</span>`;
      return;
    }

    const sorted   = pubs.map(p => p.citations || 0).sort((a, b) => b - a);
    const maxCites = Math.max(...sorted, 1);
    const h        = window.NIMACH_DATA?.metrics?.h || 0;
    const n        = sorted.length;

    // Same viewBox dimensions as _renderPubsByYearChart → identical rendered height
    const W = 500, H = 150;
    const pL = 30, pR = 10, pT = 12, pB = 18;
    const cW = W - pL - pR, cH = H - pT - pB;
    const gap  = cW / n;
    const barW = Math.max(1, gap * 0.72);

    const bars = sorted.map((c, i) => {
      const bh = Math.max(0.5, (c / maxCites) * cH);
      const x  = (pL + i * gap + gap / 2 - barW / 2).toFixed(1);
      const yy = (pT + cH - bh).toFixed(1);
      return `<rect x="${x}" y="${yy}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}"
        rx="1" fill="${i < h ? 'var(--accent)' : 'var(--text-3)'}" opacity="${i < h ? 0.95 : 0.35}">
        <title>Rank ${i + 1}: ${c} citas</title></rect>`;
    }).join('');

    // h-index crosshair — positioned at the h-th bar
    const hLine = (h > 0 && h <= n) ? (() => {
      const hx = (pL + (h - 0.5) * gap).toFixed(1);
      const hy = (pT + cH - (h / maxCites) * cH).toFixed(1);
      return `
        <line x1="${pL}" y1="${hy}" x2="${W - pR}" y2="${hy}"
          stroke="var(--text-2)" stroke-width="0.8" stroke-dasharray="4,3" opacity="0.8"/>
        <line x1="${hx}" y1="${pT}" x2="${hx}" y2="${pT + cH}"
          stroke="var(--text-2)" stroke-width="0.8" stroke-dasharray="4,3" opacity="0.8"/>
        <text x="${(+hx + 3).toFixed(1)}" y="${(+hy - 3).toFixed(1)}"
          font-size="8" fill="var(--text-2)" font-weight="600">h = ${h}</text>`;
    })() : '';

    // Y-axis ticks (3 values: 0, mid, max)
    const ticks = [0, Math.round(maxCites / 2), maxCites].map(v => {
      const ty = (pT + cH - (v / maxCites) * cH + 3).toFixed(1);
      return `<text x="${pL - 3}" y="${ty}" text-anchor="end"
        font-size="7.5" fill="var(--text-3)">${v}</text>`;
    }).join('');

    // Legend — mirrors year chart legend position (top-left area)
    const legend = `
      <rect x="${pL}" y="2" width="10" height="6" rx="1.5" fill="var(--accent)" opacity="0.95"/>
      <text x="${pL + 13}" y="9" font-size="8" fill="var(--text-3)">h-core</text>
      <rect x="${pL + 58}" y="2" width="10" height="6" rx="1.5" fill="var(--text-3)" opacity="0.35"/>
      <text x="${pL + 71}" y="9" font-size="8" fill="var(--text-3)">resto</text>
      <line x1="${pL + 118}" y1="5" x2="${pL + 133}" y2="5"
        stroke="var(--text-2)" stroke-width="0.8" stroke-dasharray="4,3" opacity="0.8"/>
      <text x="${pL + 136}" y="9" font-size="8" fill="var(--text-3)">h-index</text>`;

    el.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;">
        <line x1="${pL}" y1="${pT}" x2="${pL}" y2="${pT + cH}"
          stroke="var(--line)" stroke-width="0.5"/>
        <line x1="${pL}" y1="${pT + cH}" x2="${W - pR}" y2="${pT + cH}"
          stroke="var(--line)" stroke-width="0.5"/>
        ${ticks}
        ${hLine}
        ${bars}
        ${legend}
      </svg>`;
  }

  static _afterPublicaciones() {
    NIMPage._initPubFilter();
    // Deferred so layout is complete and chart container has width
    setTimeout(() => NIMPage._renderPubsByYearChart(), 150);

    // OpenAlex enrichment (calcula y actualiza todos los stats al terminar)
    if (window.PublicationsEnricher) new PublicationsEnricher();

    // Stats iniciales síncronos desde NIMACH_DATA (antes de OpenAlex)
    const pubs = window.NIMACH_DATA?.publications || [];
    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setEl('ps-total', pubs.length);
    setEl('ps-q1',    pubs.filter(p => p.quartile === 'Q1').length);
    // ps-cites y ps-hindex quedan en "—" hasta que OpenAlex responda

    // BibTeX parser si está disponible
    if (window.BibTeXParser) new BibTeXParser('../data/publications.bib');
  }

  static _initPubFilter() {
    const toolbar = document.getElementById('pub-toolbar');
    const list = document.getElementById('pub-page-list');
    if (!toolbar || !list) return;          // la home no tiene barra de filtros
    if (toolbar.dataset.bound) return;      // delegación: se enlaza una sola vez
    toolbar.dataset.bound = '1';

    this._pubState = this._readPubURL();
    const st = () => this._pubState;

    toolbar.addEventListener('click', e => {
      const more = e.target.closest('[data-more]');
      if (more) {                                   // desplegar / contraer temas
        const g = document.getElementById('pub-topics');
        const open = g.classList.toggle('expanded');
        const n = g.querySelectorAll('.is-extra').length;
        more.textContent = open ? 'Ver menos' : `+${n} más`;
        more.setAttribute('aria-expanded', String(open));
        return;
      }
      const y = e.target.closest('.pub-filter-btn');
      const t = e.target.closest('.pub-topic-btn');
      const o = e.target.closest('[data-sort]');
      if (y) { st().year = y.dataset.filter; }
      else if (t) { const k = t.dataset.topic; st().topics.has(k) ? st().topics.delete(k) : st().topics.add(k); }
      else if (o) { st().sort = o.dataset.sort; }
      else if (e.target.closest('#pub-search-clear')) {
        const i = document.getElementById('pub-search'); i.value = ''; st().q = ''; i.focus();
      } else return;
      this._applyPubFilters();
    });

    // Chips de filtros activos, botón de reinicio y estado vacío (están fuera de la toolbar)
    document.addEventListener('click', e => {
      const rm = e.target.closest('[data-remove]');
      if (rm) {
        const k = rm.dataset.remove;
        if (k === 'year') st().year = 'all';
        else if (k === 'q') { st().q = ''; document.getElementById('pub-search').value = ''; }
        else if (k === 'autor') st().author = null;
        else if (k.startsWith('tema:')) st().topics.delete(k.slice(5));
        this._applyPubFilters();
      } else if (e.target.closest('[data-pub-reset]')) {
        this._pubState = { year: 'all', topics: new Set(), q: '', sort: st().sort, author: null };
        document.getElementById('pub-search').value = '';
        this._applyPubFilters();
        document.getElementById('pub-search').focus();
      }
    });

    const input = document.getElementById('pub-search');
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { st().q = input.value; this._applyPubFilters(); }, 120);
      document.getElementById('pub-search-wrap').classList.toggle('has-value', !!input.value);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape' && input.value) { input.value = ''; st().q = ''; this._applyPubFilters(); }
    });

    // Atajo "/" para buscar (como en GitHub o MDN)
    document.addEventListener('keydown', e => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      e.preventDefault(); input.focus(); input.select();
    });

    input.value = st().q;
    document.getElementById('pub-search-wrap').classList.toggle('has-value', !!input.value);
    this._applyPubFilters(true);
  }

  /** Estado inicial desde la URL: ?q= &tema=a,b &anio= &orden=citas &autor=id */
  static _readPubURL() {
    const sp = new URLSearchParams(location.search);
    return {
      q:      sp.get('q') || '',
      year:   sp.get('anio') || sp.get('year') || 'all',
      topics: new Set((sp.get('tema') || '').split(',').map(x => x.trim()).filter(Boolean)),
      sort:   sp.get('orden') === 'citas' ? 'cites' : 'recent',
      author: sp.get('autor') || null,
    };
  }

  /** Mantiene la URL compartible sin recargar ni ensuciar el historial */
  static _writePubURL() {
    const st = this._pubState, sp = new URLSearchParams();
    if (st.q.trim()) sp.set('q', st.q.trim());
    if (st.year !== 'all') sp.set('anio', st.year);
    if (st.topics.size) sp.set('tema', [...st.topics].join(','));
    if (st.sort === 'cites') sp.set('orden', 'citas');
    if (st.author) sp.set('autor', st.author);
    const qs = sp.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }
  
  /**
   * Reconstruye el toolbar (botones de año y topic) y actualiza los
   * stats del strip a partir del estado actual de NIMACH_DATA.publications.
   * Se llama tras BibTeXParser._render() para reflejar los datos del .bib.
   */
  static _updatePubToolbarAndStats() {
    const pubs = window.NIMACH_DATA?.publications || [];
    if (!pubs.length) return;

    // ── Recomputar derivados ──
    const years     = [...new Set(pubs.map(p => p.year))].sort((a, b) => b - a);
    const topics    = NIMPage._topicsByFreq(pubs);
    const yearRange = years.length > 1
      ? `${years[years.length - 1]} – ${years[0]}`
      : years[0] || '—';

    // ── Actualizar stat strip ──
    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setEl('ps-total',  pubs.length);
    setEl('ps-q1',     pubs.filter(p => p.quartile === 'Q1').length);
    setEl('ps-period', yearRange);

    // ── Reconstruir botones de año y tema con los datos del .bib ──
    const yearGroup  = document.getElementById('pub-years');
    const topicGroup = document.getElementById('pub-topics');
    if (yearGroup)  yearGroup.innerHTML  = NIMPage._yearButtonsHTML(years);
    if (topicGroup && topics.length) topicGroup.innerHTML = NIMPage._topicButtonsHTML(topics);

    // La delegación sobrevive al re-render; solo reaplicamos el estado (URL) a las nuevas tarjetas
    NIMPage._initPubFilter();
    NIMPage._applyPubFilters(true);

    // Re-render year chart now that BibTeX data is available
    NIMPage._renderPubsByYearChart();
  }

  static _applyPubFilters(initial) {
    const list = document.getElementById('pub-page-list');
    if (!list || !this._pubState) return;
    const st = this._pubState;
    const E = NIMUI.esc;

    // ── Sincronizar estado visual de los controles ──
    document.querySelectorAll('.pub-filter-btn').forEach(b => {
      const on = b.dataset.filter === st.year;
      b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
    });
    document.querySelectorAll('.pub-topic-btn').forEach(b => {
      const on = st.topics.has(b.dataset.topic);
      b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
    });
    document.querySelectorAll('[data-sort]').forEach(b => {
      const on = b.dataset.sort === st.sort;
      b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
    });
    const activeYearBtn = document.querySelector('.pub-filter-btn.active');
    if (activeYearBtn && !initial) activeYearBtn.scrollIntoView({ inline: 'nearest', block: 'nearest' });

    // ── Filtrar ──
    const words = this._norm(st.q).split(' ').filter(Boolean);
    const person = st.author ? (NIMACH_DATA.people || []).concat(NIMACH_DATA.alumni || []).find(p => p.id === st.author) : null;
    const byId = new Map((NIMACH_DATA.publications || []).map(p => [String(p.id), p]));
    const cards = [...list.querySelectorAll('.pub-card')];
    let shown = 0;

    cards.forEach(card => {
      const yearOK  = st.year === 'all' || card.dataset.year === st.year;
      const topics  = (card.dataset.topic || '').split('|');
      const topicOK = !st.topics.size || [...st.topics].some(t => topics.includes(t));
      const hay     = card.dataset.search || this._norm(card.textContent);
      const textOK  = words.every(w => hay.includes(w));          // todas las palabras, en cualquier orden
      const authOK  = !person || (byId.get(card.dataset.pubId) && this._pubHasAuthor(byId.get(card.dataset.pubId), person));
      const ok = yearOK && topicOK && textOK && authOK;
      card.hidden = !ok;
      card.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });

    // ── Ordenar (estable) ──
    const idx = new Map(cards.map((c, i) => [c, i]));
    const key = c => st.sort === 'cites'
      ? [-(+c.dataset.cites || 0), -(+c.dataset.year || 0), idx.get(c)]
      : [-(+c.dataset.year || 0), idx.get(c)];
    cards.sort((a, b) => { const A = key(a), B = key(b); for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return A[i] - B[i]; return 0; });
    cards.forEach(c => list.appendChild(c));

    // ── Resultados + chips de filtros activos ──
    const chips = [];
    if (person) chips.push(`<span class="active-chip">Autor: ${E(person.name)}<button type="button" data-remove="autor" aria-label="Quitar filtro de autor">✕</button></span>`);
    if (st.year !== 'all') chips.push(`<span class="active-chip">Año ${E(st.year)}<button type="button" data-remove="year" aria-label="Quitar filtro de año">✕</button></span>`);
    st.topics.forEach(t => chips.push(`<span class="active-chip">${E(t)}<button type="button" data-remove="tema:${E(t)}" aria-label="Quitar tema ${E(t)}">✕</button></span>`));
    if (st.q.trim()) chips.push(`<span class="active-chip">“${E(st.q.trim())}”<button type="button" data-remove="q" aria-label="Quitar búsqueda">✕</button></span>`);

    const res = document.getElementById('pub-results');
    if (res) {
      res.innerHTML = `<span>Mostrando <strong>${shown}</strong> de <strong>${cards.length}</strong> publicaciones</span>` +
        chips.join('') + (chips.length ? `<button type="button" class="link-btn" data-pub-reset>Limpiar todo</button>` : '');
    }
    const empty = document.getElementById('pub-empty');
    if (empty) empty.hidden = shown > 0;

    if (!initial) this._writePubURL();
    else if (chips.length || st.sort === 'cites') { /* ya viene de la URL */ }
  }

  static _afterPersonas() {
    const allPeople = (window.NIMACH_DATA.people || []).filter(p => p.active !== false);
    let loaderHandle = null;

    const applyFilter = (cat) => {
      const subset = cat === 'all'
        ? allPeople
        : allPeople.filter(p => {
            const cats = Array.isArray(p.role_category) ? p.role_category : [p.role_category];
            return cats.includes(cat);
          });

      // Teardown previous loader before touching the DOM
      if (loaderHandle) loaderHandle.disconnect();

      // Clear grid and restore sentinel for the new loader
      const grid     = document.getElementById('people-page-grid');
      const sentinel = document.getElementById('people-sentinel');
      if (grid)     grid.innerHTML = '';
      if (sentinel) sentinel.style.display = 'block';

      loaderHandle = NIMPage._initPeopleLazyLoad(subset, { all: !!location.hash });
    };

    document.querySelectorAll('.people-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.people-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        applyFilter(tab.dataset.cat);
      });
    });

    // Initial render — equivalent to 'all' tab
    applyFilter('all');
  }

  // people: pre-filtered array to render. Returns { disconnect } so the caller
  // can tear down this loader when a filter change clears the grid.
  static _initPeopleLazyLoad(people, opts = {}) {
    const BATCH    = opts.all ? Math.max(people.length, 1) : 6;   // con #persona se carga todo para poder llegar a ella
    const grid     = document.getElementById('people-page-grid');
    const sentinel = document.getElementById('people-sentinel');
    const noop     = { disconnect: () => {} };
    if (!grid || !sentinel) return noop;

    // Empty-state: show a message and leave the sentinel hidden
    if (!people.length) {
      grid.innerHTML = `
        <p style="grid-column:1/-1;text-align:center;padding:40px 20px;
          font-size:13px;color:var(--text-3);">
          No hay miembros en esta categoría.</p>`;
      sentinel.style.display = 'none';
      return noop;
    }

    let loaded = 0;
    const revealObs = window._scrollRevealObserver;

    const loadNext = () => {
      const batch = people.slice(loaded, loaded + BATCH);
      if (!batch.length) {
        sentinel.style.display = 'none';
        observer.disconnect();
        return;
      }

      const frag = document.createDocumentFragment();
      batch.forEach((p, i) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = NIMPage._personCardHTML(p, i % 4); // i%4 keeps delay cycling clean
        const card = tmp.firstElementChild;
        frag.appendChild(card);
        if (revealObs) revealObs.observe(card);
      });

      grid.appendChild(frag);
      loaded += batch.length;

      // Cards that landed in the viewport need an immediate reveal
      requestAnimationFrame(() => {
        grid.querySelectorAll('.person-page-card.reveal:not(.visible)')
          .forEach(c => c.classList.add('visible'));
      });

      if (loaded >= people.length) {
        sentinel.style.display = 'none';
        observer.disconnect();
      }
    };

    // rootMargin bottom lookahead: next batch starts loading before sentinel
    // actually enters the viewport, so cards appear before the user reaches the bottom
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadNext(); },
      { rootMargin: '0px 0px 220px 0px' }
    );

    observer.observe(sentinel);

    // Fire first batch immediately — no scroll required
    loadNext();

    return { disconnect: () => observer.disconnect() };
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
  
  static _afterGaleria() {
    // El visor de imágenes vive en ui.js (NIMUI.Lightbox) y se activa por delegación.
    if (window.NIMUI) NIMUI.hydrateIcons();
    const grid = document.getElementById('page-gallery-grid');
    NIMPage.loadInstagram().then(feed => {
      const items = NIMPage._igItems(feed, 24);
      if (grid && items.length) {
        NIMPage._fillGridFromIG(grid, items, '../');
        const note = document.getElementById('ig-note');
        const d = feed.updated ? new Date(feed.updated) : null;
        if (note) {
          note.innerHTML = `Publicaciones de <a href="${NIMUI.esc(feed.profileUrl || 'https://www.instagram.com/nimach_group/')}" target="_blank" rel="noopener">@${NIMUI.esc(feed.username || 'nimach_group')}</a>` +
            (d && !isNaN(d) ? ` · actualizado el ${d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}` : '');
          note.hidden = false;
        }
      }
      if (grid) grid.removeAttribute('aria-busy');
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
