# Galería de fotos con las publicaciones de Instagram (@nimach_group)

La sección de fotos muestra las publicaciones que **tú elijas** de [@nimach_group](https://www.instagram.com/nimach_group/).
Cada foto abre un visor con su texto y un botón **"Ver en Instagram"** que lleva a la publicación original.

No usa tokens ni cuentas de terceros: solo necesitas **el enlace de la publicación** y **su foto**.

- La **home** muestra las 6 más recientes y la página **Galería** muestra todas (hasta 24).
- Mientras no agregues ninguna, se ven los marcadores de siempre.

## Agregar una publicación (1 minuto)

1. **Foto:** usa el archivo original que subiste (JPG, PNG, WebP o HEIC del iPhone). Si no lo tienes a mano, en
   Instagram web puedes abrir la publicación, hacer clic derecho sobre la foto → *Guardar imagen como…*.
2. **Enlace:** en la publicación pulsa **⋯ → Copiar enlace**. Se ve como `https://www.instagram.com/p/DAbC123xyz/`.
3. En la terminal, dentro de la carpeta del proyecto:

   ```bash
   node scripts/instagram.mjs add "ENLACE" "/ruta/a/la-foto.jpg" "Texto breve de la publicación" --fecha=2025-06-14
   ```

   - El **texto** y la **fecha** son opcionales. Sin fecha se usa hoy; conviene ponerla para que se ordene bien.
   - Pon el enlace y el texto **entre comillas**. Puedes arrastrar la foto a la terminal para que escriba la ruta.
4. Publica el cambio como siempre (commit y push). El comando ya dejó la foto optimizada
   (JPEG de máx. 1080 px, ~100 KB) en `assets/images/instagram/` y actualizó `data/instagram.json`.

### Ejemplo completo

```bash
node scripts/instagram.mjs add "https://www.instagram.com/p/DAbC123xyz/" ~/Descargas/terreno.jpg \
  "Terreno en Magallanes con nadadores de aguas gélidas" --fecha=2025-06-14
```

También sirven enlaces de **reels** (`/reel/…`): se mostrará la foto que tú indiques como portada.

## Otras acciones

| Qué quieres | Comando |
|---|---|
| Ver lo que hay | `node scripts/instagram.mjs list` |
| Corregir el texto o la fecha | Repite `add` con el **mismo enlace**; se reemplaza (si no repites texto o fecha, se conservan) |
| Cambiar la foto | Repite `add` con el mismo enlace y la nueva imagen |
| Quitar una publicación | `node scripts/instagram.mjs remove "ENLACE"` (o el id que muestra `list`) |

## Cómo funciona (por si quieres editar a mano)

Todo vive en `data/instagram.json`; puedes editarlo con cualquier editor:

```json
{
  "username": "nimach_group",
  "profileUrl": "https://www.instagram.com/nimach_group/",
  "posts": [
    {
      "id": "DAbC123xyz",
      "image": "assets/images/instagram/DAbC123xyz.jpg",
      "permalink": "https://www.instagram.com/p/DAbC123xyz/",
      "caption": "Texto de la publicación",
      "date": "2025-06-14T12:00:00.000Z"
    }
  ]
}
```

La web solo acepta enlaces que empiecen por `https://www.instagram.com/` e imágenes dentro de
`assets/images/instagram/`; cualquier otra cosa se ignora. Los textos se muestran siempre como texto plano.

## Privacidad
Muestra solo contenido que el grupo ya publicó en su cuenta. Si una foto no debe aparecer, quítala con
`remove` y publica el cambio.
