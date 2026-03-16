# NIM-ACh Website

Sitio web del grupo de investigación NIM-ACh (Neurofisiología e Integración Motora-Autónoma Cerebro-Corazón), Universidad de Magallanes, Punta Arenas, Chile.

---

## Estructura del proyecto

```
nimach/
├── index.html               ← Homepage (landing completo)
│
├── pages/                   ← Páginas individuales (próximamente)
│   ├── investigacion.html
│   ├── proyectos.html
│   ├── personas.html
│   ├── publicaciones.html
│   ├── galeria.html
│   └── dei.html
│
├── css/
│   ├── variables.css        ← Design tokens (colores, spacing, tipografía)
│   ├── base.css             ← Reset, tipografía, helpers globales
│   ├── animations.css       ← Keyframes, scroll-reveal, transiciones
│   ├── nav.css              ← Estilos de navegación
│   ├── hero.css             ← Sección hero + ECG + stat rings
│   └── components.css       ← Todos los componentes: cards, galería, etc.
│
├── js/
│   ├── data.js              ← Datos centralizados (personas, publicaciones, etc.)
│   ├── canvas.js            ← NeuralCanvas + ParticleField (animaciones canvas)
│   ├── scroll.js            ← ScrollReveal, StatAnimator, ECGAnimation, NavScroll
│   └── main.js              ← Entry point, lightbox, formulario, utilidades
│
└── assets/
    └── images/              ← Fotos reales (reemplazar GradientPlaceholders)
```

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

Todo el contenido está centralizado en `js/data.js`. **Solo necesitas editar ese archivo** para actualizar publicaciones, proyectos, noticias y personas.

### Agregar una publicación

```js
// En js/data.js → publications[]
{
  id:      'pub-2025-nueva',
  year:    2025,
  title:   'Título completo del artículo',
  authors: 'Apellido A., Apellido B. et al.',
  journal: 'Nombre de la Revista',
  quartile:'Q1',
  doi:     '10.XXXX/journal.2025.XXXXX',
  topics:  ['hrv', 'exercise'],  // para el filtro
},
```

Luego agrega el bloque HTML correspondiente en `index.html` dentro de `.pub-list`.

### Agregar un proyecto

```js
// En js/data.js → projects[]
{
  id:      'proj-nuevo-2025',
  status:  'active',          // 'active' | 'complete'
  agency:  'ANID · FONDECYT Regular',
  code:    'Nº 1XXXXXX',
  title:   'Título del proyecto',
  pi:      'Dr. Nombre Apellido',
  period:  '2025–2028',
  amount:  '$100M CLP',
  type:    'Regular',
  progress: 10,               // 0–100
  barColor: 'pf-teal',        // pf-teal | pf-blue | pf-coral | pf-purple
  tags:    ['HRV', 'Cold'],
},
```

### Agregar un integrante

Edita `people[]` en `data.js` y agrega el bloque HTML en `index.html` dentro de `.people-grid`.

Las iniciales del avatar (`CN`, `MC`, etc.) se renderizan automáticamente. Cuando haya foto real, reemplaza el div `.avatar` por un `<img>`.

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

El sitio usa **Sora** (display) + **DM Sans** (cuerpo) vía Google Fonts. Para cambiar:

1. Edita la `@import` en `css/base.css`
2. Actualiza `--font-sans` en `css/variables.css`

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
