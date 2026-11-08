# NIM-ACh Website

Sitio web del grupo de investigación NIM-ACh (Neurofisiología e Integración Motora-Autónoma Cerebro-Corazón), Universidad de Magallanes, Punta Arenas, Chile.

---

## Estructura del proyecto

```
├── index.html               ← Home (landing completo)
├── pages/                   ← Páginas interiores (shells mínimos; el contenido lo genera js/pages.js)
│   ├── investigacion.html · proyectos.html · personas.html
│   └── herramientas.html · publicaciones.html · galeria.html
├── css/
│   ├── variables.css        ← Tokens: colores, tipografía fluida, espaciado, modo oscuro
│   ├── base.css             ← Reset, tipografía, contenedor, escala de la raíz (rem)
│   ├── animations.css       ← Keyframes, scroll-reveal
│   ├── nav.css              ← Navegación (escritorio + panel móvil + smart-hide)
│   ├── hero.css             ← Hero, stats, ECG
│   ├── components.css       ← Tarjetas, galería, timeline, formulario, globo…
│   ├── pages.css            ← Páginas interiores
│   ├── refine.css           ← Capa de pulido: un solo lenguaje visual + accesibilidad
│   ├── ui.css               ← Botones, chips, tarjetas clicables, filtros, lightbox
│   ├── mono.css             ← Capa final v3: diseño minimal monotono (se carga la última)
│   └── responsive.css       ← Solo cambios ESTRUCTURALES (N → 1 columnas), ultra-tiny, print
├── js/
│   ├── smart.js             ← Utilidades "inteligentes" (movimiento reducido, bajo consumo, visibilidad)
│   ├── data.js              ← Lógica de los datos (los datos están en data/site.json)
│   ├── pages.js             ← Genera páginas interiores y secciones de la home
│   ├── ui.js                ← Iconos de línea, toast, copiar, lightbox, destinos (#id)
│   ├── network.js · land-mask.js ← Mapa de puntos de la red de colaboración (canvas 2D)
│   ├── axis.js              ← Diagrama interactivo del eje cerebro–corazón
│   ├── canvas.js · scroll.js · theme.js · main.js
│   └── bibtex.js · publications.js   ← .bib → publicaciones + citas (OpenAlex, por lotes, caché 24 h)
├── Editar sitio.command / .bat       ← DOBLE CLIC: abre el editor del sitio (ver docs/EDITOR.md)
├── admin/                            ← Editor del sitio (interfaz + esquema de todos los campos)
├── scripts/admin.mjs                 ← Servidor local del editor · build-data.mjs · instagram.mjs (por terminal)
├── data/site.json                    ← TODA la data editable (equipo, proyectos, noticias…)
├── js/site-data.js                   ← Generado a partir de site.json (no editar a mano)
├── docs/EDITOR.md · docs/INSTAGRAM.md ← Guías de uso
└── data/publications.bib
```

### Cómo funciona el diseño responsivo (v2)

El diseño es **intrínseco**: casi nada depende de media queries.

- `html { font-size: clamp(100%, 62.5% + .5vw, 175%) }` y todo el texto/contenedor en `rem`
  → la interfaz completa escala en pantallas grandes (1920px ≈ 19.6px, 2560px ≈ 22.8px).
- Tokens fluidos en `variables.css` (`--gutter`, `--section-y`, `--fs-*`, `--card-pad`).
- Grids con `minmax(min(100%, X), 1fr)`: nunca desbordan, ni a 280px.
- Solo hay unos pocos cortes estructurales (ver cabecera de `responsive.css`).
- Para probar: ancho 280px a 3840px sin scroll horizontal.

### "Inteligencia" del sitio

- **Tema**: respeta la elección guardada; si no hay, usa el del sistema y lo sigue en vivo.
- **Rendimiento**: los canvas (hero, ECG, DEI, globo) solo animan si están a la vista y la
  pestaña está activa; Three.js solo se descarga al acercarse al globo; menos partículas en
  móviles/equipos modestos; con "reducir movimiento" no hay animación.
- **Citas (OpenAlex)**: consulta por lotes (≈3 peticiones en vez de ~90) y caché de 24 h.
- **Navegación**: se oculta al bajar y reaparece al subir; enlace activo por sección visible.

### Sistema de diseño v3 (monotono)

- **Un fondo por modo.** Claro `#f7f8fa` / oscuro `#0e1217`, sin franjas ni bloques del otro tono;
  las secciones se separan con líneas finas. Escala de grises fríos + **un solo acento** (azul acero).
- Todo el color vive en `css/variables.css` (`--bg`, `--surface`, `--text*`, `--accent*`, y los
  componentes `--ink-rgb / --bg-rgb / --accent-rgb` para `rgba(var(--x-rgb), .1)`). Los nombres antiguos
  (`--c-coral`, `--c-teal`, `--c-navy`…) siguen existiendo pero apuntan a esta paleta.
- Para cambiar el acento basta con editar `--accent` y `--accent-rgb` (claro y oscuro).
- Iconos: línea monotona (`NIMUI.icon('nombre')`, set en `js/ui.js`); sin emojis de colores.
- Botón primario = tinta sólida (texto invertido); secundarios = contorno.
- Los canvas (hero, ECG, mapa) leen la paleta con `NIMSmart.palette()` y se redibujan al cambiar de tema.

### Datos con fuente única

- **Países colaboradores**: se derivan de `NIMACH_DATA.globePoints[].country` → `NIMACH_DATA.collabCountries`
  (hero, métricas y mapa muestran el mismo número). `active:false` oculta un punto sin borrarlo
  (París está así: no tiene red asociada; el "5" = MEDIANTAR + RIES-LAC).
- **Palabras clave** de publicaciones: se limpian al leer el `.bib` (`BibTeXParser.TOPIC_ALIASES` en
  `js/bibtex.js`); para unificar un término nuevo basta añadir `'variante': 'término'`.

### Galería con publicaciones de Instagram (modo manual)

La galería muestra las publicaciones de **@nimach_group** que elijas, sin tokens ni servicios externos.
Se agregan con un comando (foto + enlace de la publicación) y cada foto enlaza a su post original:

```bash
node scripts/instagram.mjs add "https://www.instagram.com/p/XXXX/" ~/foto.jpg "Texto" --fecha=2025-06-14
node scripts/instagram.mjs list      # ver lo que hay
node scripts/instagram.mjs remove "https://www.instagram.com/p/XXXX/"
```

Guía completa: [`docs/INSTAGRAM.md`](docs/INSTAGRAM.md). Mientras no haya publicaciones se muestran los marcadores.

### Convenciones de interacción

> Lo que parece clicable **hace algo lógico**; lo que no, no lo aparenta.

- **Tarjetas clicables** (`.is-interactive`): el título lleva un `<a class="card-link">` y su `::after`
  extiende el clic a toda la tarjeta. Cada una va a **su** destino (`investigacion.html#neuromodulation`,
  `proyectos.html#<id>`, `personas.html#<id>`); el destino se desplaza a la vista y se resalta.
- **Publicaciones**: el título abre el artículo (DOI); botones "Copiar DOI" / "Copiar cita". Filtros por
  texto, año, tema y orden (recientes / más citadas), compartibles por URL:
  `publicaciones.html?autor=<id>&tema=hrv,exercise&anio=2024&orden=citas&q=texto`. Atajo `/` para buscar.
- **Mapa de red y eje cerebro–corazón**: reemplazan al globo 3D y al visor 3D (ya no se carga Three.js).
- **Galería**: visor con flechas, teclado (← → Esc), deslizar en táctil y foco atrapado (`NIMUI.Lightbox`).
- **Enlaces pendientes**: los `'#'` en los datos se ocultan en vez de mostrar botones muertos. Para ver
  qué falta por completar: `NIMACH_DATA.pendingLinks` en la consola del navegador.
- Componentes compartidos: `js/ui.js` (toast, copiar, lightbox, destinos) y `css/ui.css` (botones, chips,
  tarjetas, filtros).

---

## Inicio rápido

No se necesita build step. Abre `index.html` directamente en un navegador, o usa un servidor local:

```bash
# opción 1 — Python
python -m http.server 8080

# opción 2 — Node
npx serve .

# opción 3 — VS Code
# Instala la extensión "Live Server" y haz clic en "Go Live"
```

---

## Cómo actualizar el contenido

**Usa el editor del sitio**: doble clic en `Editar sitio.command` (Mac) o `Editar sitio.bat` (Windows).
Permite agregar, editar, ordenar y eliminar todo el contenido (equipo, proyectos, publicaciones, noticias,
fotos de Instagram, herramientas, colaboradores, mapa…) y publicarlo con un botón.
Guía completa: [`docs/EDITOR.md`](docs/EDITOR.md).

Si prefieres editar a mano: la data está en `data/site.json`; tras modificarla ejecuta
`node scripts/build-data.mjs` para regenerar `js/site-data.js`. Las publicaciones están en
`data/publications.bib`.

---

## Guía de estilos

### Variables de color

Todos los colores están en `css/variables.css`:

```css
--c-navy:        #060e1e   /* Fondo oscuro principal */
--c-blue:        #3b7abf   /* Azul institucional */
--c-blue-light:  #7fb3e8   /* Azul claro (neurológico) */
--c-coral:       #e87040   /* Naranja-coral (cardíaco) */
--c-teal:        #1db884   /* Verde (activo, éxito) */
--c-purple:      #7b52d4   /* Morado (años activos) */
```

Para cambiar la paleta, solo edita estas variables.

### Tipografía

El sitio usa **Sora** (títulos) + **DM Sans** (lectura) vía Google Fonts. Para cambiar:

1. Edita el `<link>` de Google Fonts en el `<head>` de cada HTML
2. Actualiza `--font-display` / `--font-body` en `css/variables.css`

### Agregar una sección nueva

1. Crea el HTML con la clase `section-pad light-section` (o `dark-section`)
2. Añade `reveal` a los elementos que deben animarse al hacer scroll
3. Agrega `delay-1` a `delay-5` para escalonar las animaciones
4. Registra el ID en el nav con `data-section="tu-id"`

---

## Animaciones

| Módulo | Descripción |
|--------|-------------|
| `NeuralCanvas` | Red neuronal interactiva con mouse en el hero. 70 nodos en 3 capas de profundidad, nodos "cardíacos" en naranja con glow. |
| `ParticleField` | Campo de partículas sutil para la sección DEI. |
| `ScrollReveal` | Fade + slide-up al entrar en viewport (IntersectionObserver). |
| `StatAnimator` | Anillos SVG y contadores numéricos animados. |
| `ProgressBars` | Barras de progreso de proyectos animadas al hacer scroll. |
| `ECGAnimation` | Línea ECG que recorre el hero en loop. |

---

## Próximas páginas a desarrollar

- `pages/investigacion.html` — Detalle completo de cada línea de investigación
- `pages/proyectos.html` — Vista completa con filtros por estado/agencia
- `pages/personas.html` — Perfiles completos con bio, publicaciones por autor
- `pages/publicaciones.html` — Lista filtrable por año, topic, quartile
- `pages/galeria.html` — Galería completa con lightbox nativo
- `pages/dei.html` — Statement DEI expandido

---

## Deploy

El sitio es 100% estático. Se puede desplegar directamente en:

- **Netlify** — arrastrar la carpeta `nimach/` al dashboard
- **GitHub Pages** — push a rama `gh-pages`
- **Vercel** — conectar el repositorio
- **Servidor propio** — subir los archivos por FTP/SFTP

No hay dependencias npm, no hay bundler, no hay backend requerido.

---

## Créditos

Diseño y desarrollo: NIM-ACh Group · Universidad de Magallanes · 2025
