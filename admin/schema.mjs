/**
 * Esquema del editor: describe TODA la data editable del sitio.
 * Lo usan dos lados (por eso es JavaScript puro, sin DOM):
 *   · el editor (admin/admin.js) → genera los formularios
 *   · el servidor (scripts/admin.mjs) → valida y sanea lo que se guarda
 *
 * Para añadir un campo nuevo a algo existente basta con agregarlo a `fields` de su sección
 * (y mostrarlo en el sitio). Tipos de campo:
 *   text · textarea · number · select · multi · tags · lines · bool · image · links · url
 *   (bool: `dflt` = valor cuando el dato no existe, p. ej. `active` se considera verdadero si falta)
 *   date · lite (texto con [enlaces](url) y *énfasis*) · items (lista anidada)
 */

export const ICONS = {
  'activity': 'Pulso / actividad', 'mountain': 'Montaña', 'leaf': 'Hoja', 'heart-pulse': 'Corazón con pulso',
  'bar-chart': 'Gráfico de barras', 'target': 'Diana', 'file-text': 'Documento', 'globe': 'Globo',
  'map-pin': 'Ubicación', 'landmark': 'Institución', 'users': 'Personas', 'scale': 'Balanza',
  'wrench': 'Herramienta', 'flask': 'Matraz', 'network': 'Red', 'refresh': 'Ciclo', 'zap': 'Rayo',
  'circle-dot': 'Círculo',
};
const iconOptions = Object.entries(ICONS).map(([value, label]) => ({ value, label }));

export const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

/** Iniciales (máx. 3) de un nombre, ignorando partículas */
export function initials(name) {
  const skip = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'do', 'van', 'von']);
  return String(name || '').split(/[\s-]+/).filter(w => w && !skip.has(w.toLowerCase()))
    .map(w => w[0].toUpperCase()).slice(0, 3).join('');
}

const LINKS_PERSON = [
  { k: 'orcid', label: 'ORCID' }, { k: 'scholar', label: 'Google Académico' },
  { k: 'researchgate', label: 'ResearchGate' }, { k: 'github', label: 'GitHub' },
];

/* ───────────────────────── Secciones ───────────────────────── */
export const SECTIONS = [
  /* ═══ Equipo ═══ */
  {
    id: 'people', group: 'Equipo', label: 'Personas', icon: 'users', path: 'people', itemName: 'persona',
    help: 'Integrantes del grupo. Aparecen en la página Personas y (si marcas "Mostrar en la portada") en la portada.',
    idFrom: 'name',
    defaults: () => ({ active: true, featured_home: false, role_category: [], chips: [], links: {}, photo: '', bio: '' }),
    derive: (it, i) => {
      it.initials = it.initials || initials(it.name);
      it.avatar = it.avatar || `av${(i % 6) + 1}`;
      it.ringColor = it.ringColor || '#3b7abf';
    },
    card: it => ({ title: it.name, sub: it.role, image: it.photo,
      badges: [it.active === false && 'Inactivo', it.featured_home && 'En portada'].filter(Boolean) }),
    refs: (site, it) => [
      ...(site.pets || []).filter(p => p.owner === it.id).map(p => `la mascota "${p.name}" (dueño/a)`),
      ...(site.tools || []).filter(t => t.author === it.id).map(t => `la herramienta "${t.title}" (autor/a)`),
    ],
    fields: [
      { k: 'name', t: 'text', label: 'Nombre completo', required: true, ph: 'Ej.: Ana Pérez Soto' },
      { k: 'role', t: 'text', label: 'Cargo o rol', ph: 'Ej.: Investigadora Posdoctoral' },
      { k: 'role_category', t: 'multi', label: 'Categoría(s)', from: 'people_categories', help: 'Define en qué pestaña de la página Personas aparece.' },
      { k: 'photo', t: 'image', folder: 'team', label: 'Foto', help: 'Se reduce automáticamente. Mejor una foto cuadrada o vertical, con la cara centrada.' },
      { k: 'bio', t: 'textarea', label: 'Biografía breve', rows: 4 },
      { k: 'chips', t: 'tags', label: 'Áreas de trabajo', ph: 'Escribe y presiona Enter' },
      { k: 'links', t: 'links', label: 'Perfiles académicos', keys: LINKS_PERSON, help: 'Deja vacío lo que no tenga: solo se muestran los que completes.' },
      { k: 'active', t: 'bool', dflt: true, label: 'Es miembro activo', help: 'Si lo desmarcas deja de aparecer en el equipo.' },
      { k: 'featured_home', t: 'bool', label: 'Mostrar en la portada' },
    ],
  },
  {
    id: 'alumni', group: 'Equipo', label: 'Exalumnos', icon: 'users', path: 'alumni', itemName: 'exalumno/a',
    help: 'Personas que pasaron por el grupo. Aparecen al final de la página Personas.',
    idFrom: 'name',
    defaults: () => ({ chips: [], links: {}, photo: '', currentPosition: '' }),
    derive: (it, i) => { it.initials = it.initials || initials(it.name); it.avatar = it.avatar || `av${(i % 6) + 1}`; it.ringColor = it.ringColor || '#3b7abf'; },
    card: it => ({ title: it.name, sub: [it.role, it.period].filter(Boolean).join(' · '), image: it.photo }),
    fields: [
      { k: 'name', t: 'text', label: 'Nombre completo', required: true },
      { k: 'role', t: 'text', label: 'Rol que tuvo', ph: 'Ej.: Kinesióloga' },
      { k: 'period', t: 'text', label: 'Período', ph: 'Ej.: 2019-2022' },
      { k: 'currentPosition', t: 'text', label: 'Actualmente en', ph: 'Ej.: Universidad de Chile' },
      { k: 'photo', t: 'image', folder: 'team', label: 'Foto' },
      { k: 'chips', t: 'tags', label: 'Áreas de trabajo' },
      { k: 'links', t: 'links', label: 'Perfiles académicos', keys: LINKS_PERSON },
    ],
  },
  {
    id: 'pets', group: 'Equipo', label: 'Nimachinos (mascotas)', icon: 'leaf', path: 'pets', itemName: 'mascota',
    help: 'Las mascotas del laboratorio, en la página Personas.',
    idFrom: 'name', idPrefix: 'pet-',
    defaults: () => ({ species: '', breed: '', photo: '', bio: '', owner: '', joined: '' }),
    card: it => ({ title: it.name, sub: [it.species, it.breed].filter(Boolean).join(' · '), image: it.photo }),
    fields: [
      { k: 'name', t: 'text', label: 'Nombre', required: true },
      { k: 'species', t: 'text', label: 'Especie', ph: 'Gato, Perro…' },
      { k: 'breed', t: 'text', label: 'Raza / descripción', ph: 'Ej.: Pelaje largo' },
      { k: 'owner', t: 'select', label: 'Compañero/a de', from: 'people', empty: '— nadie en particular —' },
      { k: 'bio', t: 'textarea', label: 'Presentación', rows: 3 },
      { k: 'photo', t: 'image', folder: 'pets', label: 'Foto' },
      { k: 'joined', t: 'text', label: 'Año en que llegó', ph: '2024' },
    ],
  },

  /* ═══ Investigación ═══ */
  {
    id: 'projects', group: 'Investigación', label: 'Proyectos', icon: 'bar-chart', path: 'projects', itemName: 'proyecto',
    help: 'Proyectos con financiamiento. Los "En curso" salen primero en la página Proyectos.',
    idFrom: 'title', idPrefix: 'proj-',
    defaults: () => ({ status: 'active', featured_home: false, tags: [], progress: 0, barColor: 'pf-teal' }),
    card: it => ({ title: it.title, sub: [it.agency, it.period].filter(Boolean).join(' · '),
      badges: [it.status === 'active' ? 'En curso' : 'Finalizado', it.featured_home && 'En portada'].filter(Boolean) }),
    fields: [
      { k: 'title', t: 'textarea', rows: 2, label: 'Título del proyecto', required: true },
      { k: 'status', t: 'select', label: 'Estado', options: [{ value: 'active', label: 'En curso' }, { value: 'complete', label: 'Finalizado' }] },
      { k: 'agency', t: 'text', label: 'Agencia / fondo', ph: 'Ej.: ANID · FONDECYT Regular' },
      { k: 'code', t: 'text', label: 'Código', ph: 'Ej.: Nº 1250474' },
      { k: 'pi', t: 'text', label: 'Investigador/a responsable', ph: 'Dr. …' },
      { k: 'period', t: 'text', label: 'Período', ph: '2025–2029' },
      { k: 'amount', t: 'text', label: 'Financiamiento', ph: '$241.1M CLP' },
      { k: 'type', t: 'text', label: 'Tipo', ph: 'Regular, Iniciación…' },
      { k: 'progress', t: 'number', min: 0, max: 100, unit: '%', label: 'Avance', help: 'Porcentaje del proyecto ya ejecutado.' },
      { k: 'tags', t: 'tags', label: 'Etiquetas' },
      { k: 'featured_home', t: 'bool', label: 'Mostrar en la portada' },
    ],
  },
  {
    id: 'research', group: 'Investigación', label: 'Líneas de investigación', icon: 'activity', path: 'research', itemName: 'línea',
    help: 'Los grandes ejes del grupo. Salen en la portada y en la página Investigación.',
    idFrom: 'title',
    defaults: () => ({ icon: 'activity', color: 'rc-blue', ic: 'ic-blue', tags: [] }),
    card: it => ({ title: it.title, sub: (it.tags || []).join(' · '), icon: it.icon }),
    fields: [
      { k: 'title', t: 'text', label: 'Título', required: true },
      { k: 'desc', t: 'textarea', rows: 4, label: 'Descripción' },
      { k: 'icon', t: 'select', label: 'Icono', options: iconOptions },
      { k: 'tags', t: 'tags', label: 'Etiquetas', help: 'También sirven para relacionar la línea con las publicaciones.' },
    ],
  },
  {
    id: 'paradigm', group: 'Investigación', label: 'Paradigma central', icon: 'target', kind: 'form', root: 'paradigm',
    help: 'La idea que articula al grupo: la cita de la página Investigación, el resumen de la portada y los tres pilares.',
    fields: [
      { k: 'quote', t: 'textarea', rows: 4, label: 'Cita completa (página Investigación)' },
      { k: 'summary', t: 'lite', rows: 3, label: 'Resumen (portada)', help: 'Usa *asteriscos* para dar énfasis a una palabra.' },
      { k: 'pillars', t: 'items', label: 'Pilares', itemName: 'pilar', max: 6,
        defaults: () => ({ icon: 'circle-dot', color: 'blue', tags: [] }),
        derive: (it, i) => { it.num = String(i + 1).padStart(2, '0'); it.id = it.id || slug(it.label) || `pilar-${i + 1}`; },
        title: it => it.label,
        fields: [
          { k: 'label', t: 'text', label: 'Nombre', required: true },
          { k: 'question', t: 'text', label: 'Pregunta que responde' },
          { k: 'desc', t: 'textarea', rows: 3, label: 'Descripción' },
          { k: 'icon', t: 'select', label: 'Icono', options: iconOptions },
          { k: 'tags', t: 'tags', label: 'Etiquetas' },
        ] },
    ],
  },
  { id: 'publications', group: 'Investigación', label: 'Publicaciones', icon: 'file-text', kind: 'bib',
    help: 'Se leen del archivo data/publications.bib. Las citas se actualizan solas desde OpenAlex.' },

  /* ═══ Difusión ═══ */
  {
    id: 'news', group: 'Difusión', label: 'Noticias', icon: 'file-text', path: 'news', itemName: 'noticia', addFirst: true,
    help: 'Línea de tiempo de novedades. La más nueva debe ir arriba (usa las flechas para ordenar).',
    defaults: () => ({ hot: false, featured_home: true, html: '', tag: '' }),
    card: it => ({ title: it.date, sub: it.html, subHtml: true, badges: [it.tag, it.hot && 'Destacada'].filter(Boolean) }),
    fields: [
      { k: 'date', t: 'text', label: 'Fecha', required: true, ph: 'Ej.: Dic 2025' },
      { k: 'html', t: 'lite', store: 'html', rows: 3, label: 'Texto', required: true, help: 'Para un enlace: [texto](https://…). Para énfasis: *texto*.' },
      { k: 'tag', t: 'text', label: 'Etiqueta', ph: 'Congreso, Publicación…', datalist: 'news.tag' },
      { k: 'hot', t: 'bool', label: 'Destacada (punto de color)' },
      { k: 'featured_home', t: 'bool', label: 'Mostrar en la portada' },
    ],
  },
  {
    id: 'instagram', group: 'Difusión', label: 'Fotos de Instagram', icon: 'globe', store: 'instagram', path: 'posts', itemName: 'foto', addFirst: true,
    help: 'La galería muestra estas publicaciones de @nimach_group. Cada foto enlaza a su publicación original. La portada muestra las 6 más recientes.',
    defaults: () => ({ type: 'IMAGE', caption: '', image: '', permalink: '', date: new Date().toISOString().slice(0, 10) }),
    card: it => ({ title: it.caption || '(sin texto)', sub: String(it.date || '').slice(0, 10), image: it.image }),
    fields: [
      { k: 'image', t: 'image', folder: 'instagram', label: 'Foto', required: true, help: 'La foto original que subiste a Instagram (JPG, PNG, WebP o HEIC).' },
      { k: 'permalink', t: 'url', label: 'Enlace de la publicación', required: true, ph: 'https://www.instagram.com/p/…', pattern: /^https:\/\/www\.instagram\.com\/(?:[\w.]+\/)?(?:p|reel|tv)\/[\w-]+/,
        help: 'En Instagram: ⋯ → Copiar enlace.' , patternMsg: 'Debe ser un enlace de Instagram, por ejemplo https://www.instagram.com/p/XXXXXXXX/' },
      { k: 'caption', t: 'textarea', rows: 3, label: 'Texto de la publicación' },
      { k: 'date', t: 'date', label: 'Fecha', help: 'Ordena las fotos: la más reciente primero.' },
    ],
  },
  {
    id: 'tools', group: 'Difusión', label: 'Herramientas', icon: 'wrench', path: 'tools', itemName: 'herramienta',
    help: 'Software y aplicaciones del grupo.',
    idFrom: 'title',
    defaults: () => ({ icon: 'wrench', status: 'active', featured_home: true, featured_page: true, features: [], tags: [], version: '' }),
    card: it => ({ title: it.title, sub: it.version, icon: it.icon,
      badges: [{ active: 'En producción', dev: 'En desarrollo', planned: 'Planificada' }[it.status]].filter(Boolean) }),
    fields: [
      { k: 'title', t: 'text', label: 'Nombre', required: true },
      { k: 'desc', t: 'textarea', rows: 3, label: 'Descripción' },
      { k: 'icon', t: 'select', label: 'Icono', options: iconOptions },
      { k: 'status', t: 'select', label: 'Estado', options: [{ value: 'active', label: 'En producción' }, { value: 'dev', label: 'En desarrollo' }, { value: 'planned', label: 'Planificada' }] },
      { k: 'version', t: 'text', label: 'Versión', ph: 'v1.0.0' },
      { k: 'features', t: 'lines', label: 'Características', help: 'Una por línea.' },
      { k: 'tags', t: 'tags', label: 'Etiquetas' },
      { k: 'author', t: 'select', label: 'Desarrollada por', from: 'people', empty: '— nadie en particular —' },
      { k: 'url', t: 'url', label: 'Enlace a la aplicación', ph: 'https://…' },
      { k: 'github', t: 'url', label: 'Enlace a GitHub', ph: 'https://github.com/…' },
      { k: 'docs', t: 'url', label: 'Enlace a la documentación', ph: 'https://…' },
      { k: 'featured_home', t: 'bool', label: 'Mostrar en la portada' },
      { k: 'featured_page', t: 'bool', label: 'Destacar en la página Herramientas' },
    ],
  },
  {
    id: 'gallery', group: 'Difusión', label: 'Galería de respaldo', icon: 'globe', path: 'gallery', itemName: 'imagen',
    help: 'Solo se muestra mientras no haya fotos de Instagram. Puedes ignorarla si usas Instagram.',
    idFrom: 'title', idPrefix: 'g-',
    defaults: () => ({ bg: 'gi-1', span: false, photo: '', featured_home: true }),
    card: it => ({ title: it.title, sub: it.sub, image: it.photo }),
    fields: [
      { k: 'title', t: 'text', label: 'Título', required: true },
      { k: 'sub', t: 'text', label: 'Descripción corta', ph: 'Lugar · fecha' },
      { k: 'photo', t: 'image', folder: 'gallery', label: 'Foto', help: 'Si no subes foto se muestra un dibujo decorativo.' },
      { k: 'featured_home', t: 'bool', label: 'Mostrar en la portada' },
    ],
  },

  /* ═══ Red ═══ */
  {
    id: 'collaborators', group: 'Red', label: 'Colaboradores', icon: 'network', path: 'collaborators', itemName: 'colaborador',
    help: 'Instituciones y redes. Aparecen en Contacto, en la página Investigación y en el pie.',
    defaults: () => ({ url: '', inFooter: true }),
    card: it => ({ title: it.name, sub: it.url || 'sin enlace', badges: [it.inFooter !== false && 'En el pie'].filter(Boolean) }),
    fields: [
      { k: 'name', t: 'text', label: 'Nombre', required: true },
      { k: 'url', t: 'url', label: 'Enlace al sitio web', ph: 'https://…', help: 'Si lo dejas vacío se muestra solo el nombre.' },
      { k: 'inFooter', t: 'bool', dflt: true, label: 'Mostrar en el pie de página' },
    ],
  },
  {
    id: 'globePoints', group: 'Red', label: 'Mapa de colaboración', icon: 'map-pin', path: 'globePoints', itemName: 'ciudad',
    help: 'Puntos del mapa "Red internacional". El número de países colaboradores se calcula solo (excluye el país sede).',
    defaults: () => ({ home: false, active: true, network: '', sub: '' }),
    card: it => ({ title: it.label, sub: [it.country, it.sub].filter(Boolean).join(' · '),
      badges: [it.home && 'Sede', it.active === false && 'Oculto'].filter(Boolean) }),
    fields: [
      { k: 'label', t: 'text', label: 'Ciudad', required: true },
      { k: 'country', t: 'text', label: 'País', required: true },
      { k: 'sub', t: 'text', label: 'Detalle', ph: 'Ej.: MEDIANTAR · ERASMUS+' },
      { k: 'lat', t: 'number', step: 'any', min: -90, max: 90, label: 'Latitud', required: true, help: 'Sur es negativo. Ej.: Punta Arenas = -53.16. Tip: clic derecho sobre el lugar en Google Maps copia las coordenadas.' },
      { k: 'lon', t: 'number', step: 'any', min: -180, max: 180, label: 'Longitud', required: true, help: 'Oeste es negativo. Ej.: Punta Arenas = -70.91' },
      { k: 'network', t: 'text', label: 'Red o programa', ph: 'MEDIANTAR, RIES-LAC…' },
      { k: 'home', t: 'bool', label: 'Es la sede del grupo' },
      { k: 'active', t: 'bool', dflt: true, label: 'Mostrar en el mapa y contar el país' },
    ],
  },

  /* ═══ Textos del sitio ═══ */
  {
    id: 'texts', group: 'Textos', label: 'Textos de la portada', icon: 'file-text', kind: 'form', root: 'texts',
    help: 'Subtítulo de inicio, sección de Diversidad e Inclusión y datos de contacto.',
    fields: [
      { k: 'hero.subtitle', t: 'textarea', rows: 4, label: 'Subtítulo de inicio' },
      { k: 'dei.title', t: 'text', label: 'Diversidad e Inclusión · título' },
      { k: 'dei.lead', t: 'textarea', rows: 3, label: 'Diversidad e Inclusión · introducción' },
      { k: 'dei.cards', t: 'items', label: 'Diversidad e Inclusión · tarjetas', itemName: 'tarjeta', max: 6,
        defaults: () => ({ icon: 'users' }), title: it => it.title,
        fields: [
          { k: 'title', t: 'text', label: 'Título', required: true },
          { k: 'text', t: 'textarea', rows: 3, label: 'Texto' },
          { k: 'icon', t: 'select', label: 'Icono', options: iconOptions },
        ] },
      { k: 'contact.address', t: 'textarea', rows: 3, label: 'Contacto · dirección', help: 'Una línea por renglón. Con ella se arma el enlace a Google Maps.' },
      { k: 'contact.institution', t: 'textarea', rows: 2, label: 'Contacto · institución' },
      { k: 'contact.website', t: 'text', label: 'Contacto · sitio web', ph: 'nimach.org' },
    ],
  },
  {
    id: 'settings', group: 'Textos', label: 'Ajustes', icon: 'wrench', kind: 'form', root: '',
    help: 'Opciones generales.',
    fields: [
      { k: 'homeCountry', t: 'text', label: 'País sede', help: 'No se cuenta como "país colaborador".' },
    ],
  },
  {
    id: 'people_categories', group: 'Textos', label: 'Categorías del equipo', icon: 'users', path: 'people_categories', itemName: 'categoría',
    help: 'Las pestañas de la página Personas (Investigadores, Estudiantes, etc.).',
    idFrom: 'label', idKey: 'key',
    defaults: () => ({}),
    card: it => ({ title: it.label, sub: it.key }),
    refs: (site, it) => (site.people || []).filter(p => [].concat(p.role_category || []).includes(it.key)).map(p => `la persona "${p.name}"`),
    fields: [{ k: 'label', t: 'text', label: 'Nombre de la categoría', required: true }],
  },
  { id: 'maintenance', group: 'Herramientas', label: 'Mantenimiento', icon: 'wrench', kind: 'maintenance',
    help: 'Recuperar versiones anteriores y limpiar imágenes que ya no se usan.' },
];

/* ─────────── Utilidades compartidas por editor y servidor ─────────── */
export const getPath = (o, p) => (p === '' ? o : p.split('.').reduce((a, k) => (a == null ? a : a[k]), o));
export function setPath(o, p, v) {
  const ks = p.split('.'); const last = ks.pop();
  const t = ks.reduce((a, k) => (a[k] == null || typeof a[k] !== 'object' ? (a[k] = {}) : a[k]), o);
  t[last] = v;
}

/** Calcula un id único y estable para un elemento nuevo */
export function makeId(section, item, existing) {
  const base = (section.idPrefix || '') + (slug(item[section.idFrom]) || 'nuevo');
  let id = base, n = 2;
  const taken = new Set(existing.map(x => x[section.idKey || 'id']));
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

/** Campos que contienen HTML permitido (el resto se trata como texto plano) */
export const HTML_FIELDS = [/^news\.\d+\.html$/];
/** Claves cuyo valor es una URL (solo http/https) y claves cuyo valor es una ruta de imagen */
export const URL_KEYS = new Set(['url', 'github', 'docs', 'permalink', 'researchgate', 'orcid', 'scholar']);
export const IMG_KEYS = new Set(['photo', 'image']);
export const IMG_FOLDERS = ['team', 'pets', 'instagram', 'gallery'];
