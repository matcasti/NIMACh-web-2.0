# Editor del sitio — guía rápida

Una página que se abre en tu navegador para **actualizar todo el contenido del sitio sin tocar código**:
equipo, exalumnos, mascotas, proyectos, líneas de investigación, paradigma, publicaciones, noticias,
fotos de Instagram, herramientas, colaboradores, mapa de colaboración y los textos de la portada.

## Abrirlo

| Sistema | Cómo |
|---|---|
| **Mac** | Doble clic en **`Editar sitio.command`** (la primera vez: clic derecho → *Abrir* → *Abrir*) |
| **Windows** | Doble clic en **`Editar sitio.bat`** |
| Cualquiera | En la terminal: `node scripts/admin.mjs` |

Se abre una ventana negra (déjala abierta mientras editas) y, en el navegador, el editor.
Requiere [Node.js](https://nodejs.org) (versión LTS, gratis); si falta, el lanzador te lo indica.
Para terminar, cierra esa ventana.

## Cómo se usa

1. Elige una sección en el menú de la izquierda (Personas, Proyectos, Noticias…).
2. **Agregar** → llena el formulario → *Guardar*. **✎** edita, **🗑** elimina, **▲ ▼** cambian el orden.
3. Las **fotos** se suben arrastrándolas o con el botón; se optimizan solas.
4. Cada guardado queda de inmediato en los archivos del proyecto (arriba verás "Guardado"). Con **Ver el sitio**
   revisas el resultado en tu computador.
5. Cuando estés conforme: **Publicar en la web**. Muestra qué se va a subir, tú pones una descripción y el
   editor hace el commit y el push. GitHub tarda 1–2 minutos en actualizar la página.

> El botón *Publicar* solo sube **datos e imágenes** (`data/`, `js/site-data.js`, `assets/images/`); nunca
> el código del sitio. Si prefieres otra herramienta (GitHub Desktop…), también puedes usarla.

### Secciones con particularidades

- **Publicaciones**: se leen de `data/publications.bib`. Para agregar una, lo más fácil es **+ Agregar por DOI**
  (se completan título, autores, revista y año desde Crossref). También puedes **pegar BibTeX** (p. ej. de
  Zotero) o editar el archivo completo en modo avanzado. Los **temas** son los filtros de la página
  Publicaciones: elige entre los existentes para no duplicarlos. Las citas se actualizan solas.
- **Fotos de Instagram**: cada foto (la original que subiste a Instagram) + el enlace de su publicación.
  La portada muestra las 6 más recientes y la página Galería todas. Ver también `docs/INSTAGRAM.md`.
- **Noticias**: para un enlace escribe `[texto](https://…)`; para énfasis, `*texto*`. Pon la más nueva arriba.
- **Mapa de colaboración**: cada ciudad con su latitud y longitud (en Google Maps, clic derecho sobre el lugar
  copia las coordenadas). El número de "países colaboradores" se calcula solo y **no cuenta el país sede**.
  Una ciudad con "Mostrar en el mapa y contar el país" desactivado queda guardada pero oculta.
- **Textos de la portada**: subtítulo de inicio, sección de Diversidad e Inclusión y datos de contacto.

## Si algo sale mal

- **Mantenimiento → Versiones anteriores**: cada guardado conserva una copia; *Restaurar* vuelve atrás
  (y guarda también la versión actual, así que se puede deshacer).
- **Mantenimiento → Imágenes sin usar**: lista las fotos que ningún dato usa. Solo vienen marcadas las subidas
  desde el editor; las que ya estaban en el proyecto se dejan sin marcar para que no pierdas material.
- Si el editor dice *"Sesión no válida"* o *"No hay conexión"*, vuelve a abrir el lanzador y recarga la página.
- Los errores de guardado se explican en el propio formulario (p. ej. un enlace que no empieza con `https://`).

## Detalles técnicos (para quien mantenga el proyecto)

- La data vive en **`data/site.json`** (más `data/instagram.json` y `data/publications.bib`). El editor también
  genera **`js/site-data.js`**, que es lo que carga la web; **no se edita a mano**. Si modificas
  `site.json` manualmente, ejecuta `node scripts/build-data.mjs`.
- **`admin/schema.mjs`** describe todas las secciones y campos: es el único lugar que hay que tocar para
  agregar un campo (y luego mostrarlo en el sitio). Lo usan el editor (formularios) y el servidor (validación).
- Seguridad: el servidor escucha solo en `127.0.0.1`, valida el encabezado *Host*, exige un token por
  sesión y revisa cada dato antes de guardarlo (enlaces solo `http(s)`, imágenes confinadas a
  `assets/images/`, texto sin etiquetas HTML; en noticias solo se conservan enlaces, énfasis y saltos de línea).
- `admin/`, `scripts/` y `docs/` no se publican en GitHub Pages (`_config.yml`).
- Copias de seguridad: `.admin-backups/` (ignorada por Git), últimas 30 de los datos y 15 del `.bib`.
