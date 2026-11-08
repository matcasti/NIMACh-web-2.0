#!/usr/bin/env node
/**
 * NIM-ACh — Galería de Instagram, modo manual
 *
 * Agrega, quita y lista las publicaciones que muestra la web (data/instagram.json
 * + imágenes en assets/images/instagram/). No usa tokens ni accede a Instagram.
 *
 *   node scripts/instagram.mjs add <enlace-de-la-publicación> <imagen> ["texto"] [--fecha=AAAA-MM-DD]
 *   node scripts/instagram.mjs remove <enlace-o-id>
 *   node scripts/instagram.mjs list
 *
 * Ejemplo:
 *   node scripts/instagram.mjs add https://www.instagram.com/p/DAbC123xyz/ ~/Descargas/terreno.jpg \
 *        "Terreno con nadadores de aguas gélidas" --fecha=2025-06-14
 *
 * Qué hace `add`: valida el enlace, reduce la imagen a 1080 px en JPEG (si el sistema
 * tiene `sips`, como macOS; si no, la copia tal cual), la guarda y actualiza el JSON.
 * Si la publicación ya existe (mismo enlace), la reemplaza. Sin dependencias · Node 18+.
 *
 * Variable opcional: IG_OUT_ROOT (carpeta raíz de salida; por defecto la raíz del repo).
 */
import { mkdir, readFile, writeFile, copyFile, readdir, unlink, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT     = process.env.IG_OUT_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG_DIR  = path.join(ROOT, 'assets', 'images', 'instagram');
const JSON_OUT = path.join(ROOT, 'data', 'instagram.json');
const USER     = 'nimach_group';
const MAX_PX   = 1080;

const fail = msg => { console.error(`✗ ${msg}`); process.exit(1); };
const ok   = msg => console.log(`✓ ${msg}`);

/* ── utilidades ── */
const exists = async p => access(p).then(() => true, () => false);
const expand = p => (p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p);

/** Enlace de Instagram → { id, permalink }. Acepta p/, reel/ y tv/, con o sin parámetros. */
function parseLink(raw) {
  const m = String(raw || '').match(/^https?:\/\/(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  const kind = m[1].toLowerCase() === 'reels' ? 'reel' : m[1].toLowerCase();
  return { id: m[2], permalink: `https://www.instagram.com/${kind}/${m[2]}/` };
}

async function load() {
  try {
    const d = JSON.parse(await readFile(JSON_OUT, 'utf8'));
    d.posts = Array.isArray(d.posts) ? d.posts : [];
    return d;
  } catch {
    return { username: USER, profileUrl: `https://www.instagram.com/${USER}/`, updated: null, posts: [] };
  }
}

async function save(d) {
  d.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  d.updated = new Date().toISOString();
  await mkdir(path.dirname(JSON_OUT), { recursive: true });
  await writeFile(JSON_OUT, JSON.stringify(d, null, 2) + '\n');
}

/** Guarda la imagen reducida (sips) o copiada; devuelve el nombre de archivo final. */
async function storeImage(src, id) {
  await mkdir(IMG_DIR, { recursive: true });
  const dest = path.join(IMG_DIR, `${id}.jpg`);
  try {
    execFileSync('sips', ['-Z', String(MAX_PX), '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', src, '--out', dest],
      { stdio: 'ignore' });
    return { file: `${id}.jpg`, resized: true };
  } catch {
    // Sin sips: se copia conservando la extensión (jpg/png/webp)
    const ext = (path.extname(src).toLowerCase().replace('.', '') || 'jpg').replace('jpeg', 'jpg');
    if (!['jpg', 'png', 'webp'].includes(ext)) fail(`Formato de imagen no admitido (.${ext}). Usa JPG, PNG o WebP.`);
    const copy = path.join(IMG_DIR, `${id}.${ext}`);
    await copyFile(src, copy);
    return { file: `${id}.${ext}`, resized: false };
  }
}

/* ── comandos ── */
async function add(args) {
  const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.slice(2).split('='); return [k, v.join('=')];
  }));
  const pos = args.filter(a => !a.startsWith('--'));
  const [link, img, ...rest] = pos;
  if (!link || !img) fail('Uso: add <enlace-de-la-publicación> <imagen> ["texto"] [--fecha=AAAA-MM-DD]');

  const parsed = parseLink(link);
  if (!parsed) fail('El enlace no parece de Instagram. Debe verse así: https://www.instagram.com/p/XXXXXXXXXXX/');

  const src = path.resolve(expand(img));
  if (!(await exists(src))) fail(`No encuentro la imagen: ${src}`);

  const d = await load();
  const i = d.posts.findIndex(p => p.id === parsed.id);
  const prev = i >= 0 ? d.posts[i] : null;       // al reemplazar se conservan fecha y texto si no se indican

  let date = prev ? new Date(prev.date) : new Date();
  if (flags.fecha) {
    date = new Date(`${flags.fecha}T12:00:00`);
    if (isNaN(date)) fail('La fecha debe tener el formato AAAA-MM-DD (por ejemplo 2025-06-14).');
  }
  const typed   = rest.join(' ').replace(/\s+/g, ' ').trim().slice(0, 600);
  const caption = typed || (prev ? prev.caption : '');

  const { file, resized } = await storeImage(src, parsed.id);
  const entry = { id: parsed.id, type: 'IMAGE', image: `assets/images/instagram/${file}`,
                  permalink: parsed.permalink, caption, date: date.toISOString() };

  if (i >= 0) { d.posts[i] = entry; ok(`Publicación actualizada (${parsed.id}).`); }
  else        { d.posts.push(entry);  ok(`Publicación agregada (${parsed.id}).`); }
  await save(d);
  ok(`Imagen guardada${resized ? ` (reducida a ${MAX_PX}px)` : ''}: ${entry.image}`);
  if (!caption) console.log('  · Sin texto: la web mostrará "Publicación de Instagram". Puedes añadirlo volviendo a ejecutar el comando.');
  console.log(`  · Total en la galería: ${d.posts.length}`);
}

async function remove(args) {
  const key = args[0];
  if (!key) fail('Uso: remove <enlace-o-id>');
  const id = (parseLink(key) || { id: key }).id;
  const d = await load();
  const post = d.posts.find(p => p.id === id);
  if (!post) fail(`No hay ninguna publicación con id ${id}. Usa "list" para ver las que hay.`);
  d.posts = d.posts.filter(p => p.id !== id);
  await save(d);
  const f = path.join(ROOT, post.image);
  if (post.image.startsWith('assets/images/instagram/') && (await exists(f))) await unlink(f);
  ok(`Publicación ${id} eliminada (${d.posts.length} restantes).`);
}

async function list() {
  const d = await load();
  if (!d.posts.length) return console.log('La galería de Instagram está vacía (la web muestra los marcadores).');
  console.log(`${d.posts.length} publicaciones (la más reciente primero):\n`);
  d.posts.forEach((p, i) => {
    const t = p.caption ? p.caption.slice(0, 60) + (p.caption.length > 60 ? '…' : '') : '(sin texto)';
    console.log(`${String(i + 1).padStart(2)}. ${p.date.slice(0, 10)}  ${p.id}  ${t}`);
  });
  console.log('\nLa home muestra las 6 primeras; la página Galería, todas (hasta 24).');
}

const [cmd, ...rest] = process.argv.slice(2);
const commands = { add, remove, list };
if (!commands[cmd]) {
  console.log(`Galería de Instagram (modo manual)

  node scripts/instagram.mjs add <enlace> <imagen> ["texto"] [--fecha=AAAA-MM-DD]
  node scripts/instagram.mjs remove <enlace-o-id>
  node scripts/instagram.mjs list

Guía completa: docs/INSTAGRAM.md`);
  process.exit(cmd ? 1 : 0);
}
await commands[cmd](rest);
