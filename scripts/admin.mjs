#!/usr/bin/env node
/**
 * NIM-ACh — Editor del sitio (servidor local)
 *
 *   node scripts/admin.mjs [--port 4321] [--no-open] [--root <carpeta>]
 *
 * Abre una página en tu navegador para editar TODA la data del sitio (equipo, proyectos,
 * noticias, publicaciones, Instagram…) sin tocar código. Los cambios se guardan directo
 * en los archivos del proyecto; después se publican con el botón "Publicar" del editor.
 *
 * Seguridad (el servidor puede escribir archivos, así que se cierra al máximo):
 *   · escucha SOLO en 127.0.0.1 (nadie más en tu red puede conectarse)
 *   · valida el encabezado Host (frena ataques de "DNS rebinding")
 *   · cada sesión tiene un token secreto; toda la API lo exige
 *   · solo JSON / imágenes con firma verificada; sin CORS; rutas confinadas a la carpeta
 *
 * Sin dependencias · Node 18+.
 */
import http from 'node:http';
import { readFile, writeFile, mkdir, readdir, stat, unlink, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile, execFileSync, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { paths, readSite, writeSite } from './lib/site-io.mjs';
import { cleanSite, cleanInstagram, ValidationError } from './lib/validate.mjs';
import { parseBib, setField, removeEntry, appendEntry, crossrefToBib, texToText } from './lib/bib.mjs';
import { slug, IMG_FOLDERS } from '../admin/schema.mjs';

/* ───────────── requisitos ───────────── */
if (parseInt(process.versions.node, 10) < 18) {
  console.error(`✗ Este editor necesita Node.js 18 o superior (tienes ${process.versions.node}). Descarga la versión LTS en https://nodejs.org`);
  process.exit(1);
}

/* ───────────── argumentos ───────────── */
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const ROOT = path.resolve(opt('root', path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')));
const START_PORT = parseInt(opt('port', '4321'), 10);
const NO_OPEN = argv.includes('--no-open');
const TOKEN = crypto.randomBytes(24).toString('hex');
const P = paths(ROOT);

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.bib': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const DENY_DIRS = new Set(['scripts', 'docs', 'node_modules']);

/* ───────────── utilidades ───────────── */
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
};
const json = (res, data, status = 200) => send(res, status, JSON.stringify(data), { 'Content-Type': 'application/json; charset=utf-8' });

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limit) { reject(new HttpError(413, 'El archivo es demasiado grande.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const readJson = async (req, limit = 8 * 1024 * 1024) => {
  const ct = String(req.headers['content-type'] || '');
  if (!ct.startsWith('application/json')) throw new HttpError(415, 'Se esperaba JSON.');
  try { return JSON.parse((await readBody(req, limit)).toString('utf8') || '{}'); }
  catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(400, 'JSON inválido.'); }
};

const exists = async p => stat(p).then(() => true, () => false);
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

async function backupFile(file, prefix, ext, keep = 30) {
  try {
    await mkdir(P.backups, { recursive: true });
    await copyFile(file, path.join(P.backups, `${prefix}-${stamp()}.${ext}`));
    const re = new RegExp(`^${prefix}-.*\\.${ext}$`);
    const all = (await readdir(P.backups)).filter(f => re.test(f)).sort();
    for (const f of all.slice(0, Math.max(0, all.length - keep))) await unlink(path.join(P.backups, f));
  } catch { /* nada que respaldar */ }
}

/* ───────────── imágenes ───────────── */
const SIZES = { team: 800, pets: 800, instagram: 1080, gallery: 1280 };
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (buf.slice(4, 8).toString() === 'ftyp' && /^(heic|heix|hevc|heim|heis|mif1|msf1)/.test(buf.slice(8, 12).toString())) return 'heic';
  return null;
}
let sipsOk = null;
function hasSips() {
  if (sipsOk === null) { try { execFileSync('sips', ['--version'], { stdio: 'ignore' }); sipsOk = true; } catch { sipsOk = false; } }
  return sipsOk;
}

async function handleUpload(req, res, q) {
  const folder = q.get('folder');
  if (!IMG_FOLDERS.includes(folder)) throw new HttpError(400, 'Carpeta de imágenes no válida.');
  const buf = await readBody(req, 30 * 1024 * 1024);
  const kind = sniff(buf);
  if (!kind) throw new HttpError(415, 'Ese archivo no parece una imagen (usa JPG, PNG, WebP o HEIC).');
  // Doble guion: marca inequívoca de "subida desde el editor" (los nombres normales nunca lo llevan)
  const base = `${slug(q.get('name')) || 'imagen'}--${Date.now().toString(36)}`;
  const dir = path.join(ROOT, 'assets', 'images', folder);
  await mkdir(dir, { recursive: true });
  const tmp = path.join(os.tmpdir(), `nimach-${crypto.randomBytes(6).toString('hex')}.${kind}`);
  await writeFile(tmp, buf);
  let file, resized = false;
  try {
    if (hasSips()) {
      file = `${base}.jpg`;
      execFileSync('sips', ['-Z', String(SIZES[folder]), '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', tmp, '--out', path.join(dir, file)], { stdio: 'ignore' });
      resized = true;
    }
  } catch { file = null; }
  if (!file) {
    if (kind === 'heic') { await unlink(tmp).catch(() => {}); throw new HttpError(415, 'Este equipo no puede convertir fotos HEIC. Expórtala como JPG y vuelve a subirla.'); }
    file = `${base}.${kind}`;
    await copyFile(tmp, path.join(dir, file));
  }
  await unlink(tmp).catch(() => {});
  const size = (await stat(path.join(dir, file))).size;
  json(res, { path: `assets/images/${folder}/${file}`, bytes: size, resized });
}

/** Imágenes en las carpetas gestionadas que ningún dato referencia */
async function findOrphans() {
  const site = await readSite(ROOT);
  let insta = { posts: [] };
  try { insta = JSON.parse(await readFile(P.insta, 'utf8')); } catch { /* sin archivo */ }
  const used = new Set();
  (function scan(v) {
    if (typeof v === 'string') { if (v.startsWith('assets/images/')) used.add(v); }
    else if (v && typeof v === 'object') Object.values(v).forEach(scan);
  })([site, insta]);
  const out = [];
  for (const f of IMG_FOLDERS) {
    const dir = path.join(ROOT, 'assets', 'images', f);
    if (!(await exists(dir))) continue;
    for (const name of await readdir(dir)) {
      if (!/\.(jpe?g|png|webp)$/i.test(name)) continue;
      const rel = `assets/images/${f}/${name}`;
      // `mine`: la subió el editor (nombre con "--" + sufijo de fecha). Las demás ya existían en el proyecto
      // (p. ej. fotos de personas que aún no están en los datos): nunca se preseleccionan para borrar.
      if (!used.has(rel)) out.push({ path: rel, bytes: (await stat(path.join(dir, name))).size, mine: /--[a-z0-9]{6,9}\.(jpe?g|png|webp)$/i.test(name) });
    }
  }
  return out;
}

/* ───────────── git (solo archivos de contenido) ───────────── */
const CONTENT = ['data', 'js/site-data.js', 'assets/images'];
const git = args => new Promise((resolve, reject) => execFile('git', args, { cwd: ROOT, timeout: 90_000, maxBuffer: 8 * 1024 * 1024 },
  (err, stdout, stderr) => err ? reject(Object.assign(err, { stdout, stderr })) : resolve({ stdout, stderr })));
const contentPaths = () => CONTENT.filter(p => existsSync(path.join(ROOT, p)));

async function gitStatus() {
  try { await git(['rev-parse', '--is-inside-work-tree']); } catch { return { available: false }; }
  const { stdout } = await git(['status', '--porcelain=v1', '-uall', '--', ...contentPaths()]);
  const changed = stdout.split('\n').filter(Boolean).map(l => {
    const code = l.slice(0, 2).trim(); const p = l.slice(3).replace(/^"|"$/g, '');
    return { state: code === '??' || code === 'A' ? 'nuevo' : code === 'D' ? 'eliminado' : 'modificado', path: p };
  });
  let branch = '', remote = '';
  try { branch = (await git(['rev-parse', '--abbrev-ref', 'HEAD'])).stdout.trim(); } catch {}
  try { remote = (await git(['remote'])).stdout.trim().split('\n')[0] || ''; } catch {}
  return { available: true, branch, remote, changed };
}

async function gitPublish(message) {
  const msg = String(message || '').replace(/\s+/g, ' ').trim().slice(0, 200) || 'Actualizar contenido del sitio';
  const steps = [];
  const run = async (label, args) => {
    try { const r = await git(args); steps.push({ label, ok: true, out: (r.stdout + r.stderr).trim() }); return true; }
    catch (e) { steps.push({ label, ok: false, out: ((e.stdout || '') + (e.stderr || '') || e.message).trim() }); return false; }
  };
  if (!await run('Preparar archivos', ['add', '--', ...contentPaths()])) return { ok: false, steps };
  let pending = true;
  try { await git(['diff', '--cached', '--quiet', '--', ...contentPaths()]); pending = false; } catch { pending = true; }
  if (!pending) return { ok: true, nothing: true, steps };
  if (!await run('Guardar cambios (commit)', ['commit', '-m', msg, '--', ...contentPaths()])) return { ok: false, steps };
  const pushed = await run('Subir a GitHub (push)', ['push']);
  return { ok: pushed, committed: true, steps };
}

/* ───────────── rutas de la API ───────────── */
async function api(req, res, url) {
  const q = url.searchParams;
  const route = `${req.method} ${url.pathname}`;

  if (route === 'GET /api/state') {
    const site = await readSite(ROOT);
    let insta = { posts: [] };
    try { insta = JSON.parse(await readFile(P.insta, 'utf8')); } catch { /* aún no existe */ }
    return json(res, { site, instagram: insta, canResize: hasSips(), root: path.basename(ROOT) });
  }
  if (route === 'PUT /api/site') {
    const clean = cleanSite(await readJson(req));
    await writeSite(ROOT, clean);
    return json(res, { ok: true, site: clean });
  }
  if (route === 'PUT /api/instagram') {
    const clean = cleanInstagram(await readJson(req));
    await mkdir(path.dirname(P.insta), { recursive: true });
    await writeFile(P.insta, JSON.stringify(clean, null, 2) + '\n');
    return json(res, { ok: true, instagram: clean });
  }

  /* ── publicaciones (.bib) ── */
  const summary = e => ({ key: e.key, type: e.type, title: texToText(e.title), author: texToText(e.author), journal: texToText(e.journal), year: e.year,
    doi: e.doi, keywords: texToText(e.keywords), quartile: (e.note.match(/Q[1-4]/) || [''])[0] });
  const bibText = async () => readFile(P.bib, 'utf8');
  const bibWrite = async text => { await backupFile(P.bib, 'publications', 'bib', 15); await writeFile(P.bib, text); };

  if (route === 'GET /api/bib') return json(res, { entries: parseBib(await bibText()).map(summary) });

  if (route === 'POST /api/bib/doi') {
    const b = await readJson(req);
    const doi = String(b.doi || '').trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
    if (!/^10\.\d{4,9}\/\S+$/.test(doi)) throw new HttpError(400, 'Ese DOI no parece válido (debe verse como 10.1234/abcd).');
    const text = await bibText(); const entries = parseBib(text);
    if (entries.some(e => e.doi.toLowerCase() === doi.toLowerCase())) throw new HttpError(409, 'Esa publicación ya está en la lista.');
    let msg;
    try {
      const r = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'nimach-site-editor' } });
      if (r.status === 404) throw new HttpError(404, 'Crossref no conoce ese DOI. Revísalo o agrega la publicación manualmente.');
      if (!r.ok) throw new HttpError(502, `Crossref respondió con un error (${r.status}). Intenta de nuevo en un momento.`);
      msg = (await r.json()).message;
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(502, 'No se pudo consultar Crossref (¿hay conexión a internet?).');
    }
    const quartile = /^Q[1-4]$/.test(b.quartile || '') ? b.quartile : '';
    const { key, raw } = crossrefToBib(msg, new Set(entries.map(e => e.key)), { keywords: String(b.keywords || ''), quartile });
    await bibWrite(appendEntry(text, raw));
    return json(res, { ok: true, key, entries: parseBib(await bibText()).map(summary) });
  }

  if (route === 'POST /api/bib/raw') {
    const b = await readJson(req);
    const added = parseBib(String(b.raw || ''));
    if (!added.length) throw new HttpError(400, 'No encontré ninguna entrada BibTeX válida (debe empezar con @article{clave, …}).');
    let text = await bibText(); const have = new Set(parseBib(text).map(e => e.key));
    for (const e of added) {
      if (!e.title) throw new HttpError(400, `La entrada "${e.key}" no tiene título.`);
      if (have.has(e.key)) throw new HttpError(409, `Ya existe una entrada con la clave "${e.key}".`);
      have.add(e.key); text = appendEntry(text, e.raw);
    }
    await bibWrite(text);
    return json(res, { ok: true, added: added.length, entries: parseBib(await bibText()).map(summary) });
  }

  if (route === 'PUT /api/bib/entry') {
    const b = await readJson(req);
    const text = await bibText();
    const e = parseBib(text).find(x => x.key === b.key);
    if (!e) throw new HttpError(404, 'No encuentro esa publicación.');
    const f = b.fields || {};
    let raw = e.raw;
    const set = (name, v) => { if (v !== undefined) raw = setField(raw, name, v); };
    set('title', f.title); set('author', f.author); set('year', f.year); set('doi', f.doi); set('keywords', f.keywords);
    if (f.journal !== undefined) set(/booktitle\s*=/i.test(e.raw) && !/journal\s*=/i.test(e.raw) ? 'booktitle' : 'journal', f.journal);
    if (f.quartile !== undefined) {
      const note = e.note || '';
      const q = /^Q[1-4]$/.test(f.quartile) ? f.quartile : '';
      let nn = /Q[1-4]/.test(note) ? note.replace(/Q[1-4]/, q).replace(/\s{2,}/g, ' ').trim() : [note, q].filter(Boolean).join(' ');
      set('note', nn);
    }
    const again = parseBib(raw)[0];
    if (!again || again.key !== e.key) throw new HttpError(500, 'La edición dejó la entrada inválida; no se guardó nada.');
    await bibWrite(text.replace(e.raw, () => raw));
    return json(res, { ok: true, entries: parseBib(await bibText()).map(summary) });
  }

  if (route === 'POST /api/bib/delete') {
    const b = await readJson(req);
    const out = removeEntry(await bibText(), String(b.key || ''));
    if (out === null) throw new HttpError(404, 'No encuentro esa publicación.');
    await bibWrite(out);
    return json(res, { ok: true, entries: parseBib(await bibText()).map(summary) });
  }

  if (route === 'GET /api/bib/file') return json(res, { text: await bibText() });
  if (route === 'PUT /api/bib/file') {
    const b = await readJson(req, 12 * 1024 * 1024);
    const text = String(b.text || '');
    const E = parseBib(text);
    if (!E.length) throw new HttpError(400, 'El archivo no tiene ninguna entrada válida; no se guardó.');
    const dup = E.find((e, i) => E.findIndex(x => x.key === e.key) !== i);
    if (dup) throw new HttpError(400, `La clave "${dup.key}" está repetida; no se guardó.`);
    await bibWrite(text.replace(/\s*$/, '\n'));
    return json(res, { ok: true, entries: E.length });
  }

  /* ── imágenes ── */
  if (route === 'POST /api/upload') return handleUpload(req, res, q);
  if (route === 'GET /api/orphans') return json(res, { files: await findOrphans() });
  if (route === 'POST /api/orphans/delete') {
    const b = await readJson(req);
    const allowed = new Map((await findOrphans()).map(o => [o.path, o]));
    let n = 0;
    for (const p of b.paths || []) if (allowed.has(p)) { await unlink(path.join(ROOT, p)).catch(() => {}); n++; }
    return json(res, { ok: true, deleted: n });
  }

  /* ── copias de seguridad ── */
  if (route === 'GET /api/backups') {
    const files = (await exists(P.backups) ? await readdir(P.backups) : []).filter(f => /^site-.*\.json$/.test(f)).sort().reverse();
    return json(res, { backups: files.map(f => ({ name: f, at: f.replace(/^site-/, '').replace(/\.json$/, '').replace(/T(\d\d)-(\d\d)-(\d\d)-\d+Z/, 'T$1:$2:$3Z') })) });
  }
  if (route === 'POST /api/backups/restore') {
    const b = await readJson(req);
    if (!/^site-[\w.-]+\.json$/.test(b.name || '')) throw new HttpError(400, 'Nombre de copia no válido.');
    const clean = cleanSite(JSON.parse(await readFile(path.join(P.backups, b.name), 'utf8')));
    await writeSite(ROOT, clean);                                   // respalda el estado actual antes de reemplazarlo
    return json(res, { ok: true, site: clean });
  }

  /* ── publicar ── */
  if (route === 'GET /api/git') return json(res, await gitStatus());
  if (route === 'POST /api/git/publish') {
    const b = await readJson(req);
    const st = await gitStatus();
    if (!st.available) throw new HttpError(400, 'Esta carpeta no es un repositorio de Git.');
    return json(res, await gitPublish(b.message));
  }

  throw new HttpError(404, 'Ruta de API desconocida.');
}

/* ───────────── archivos estáticos (el editor y la vista previa del sitio) ───────────── */
async function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Método no permitido.');
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { throw new HttpError(400, 'Ruta inválida.'); }
  if (rel.includes('\0')) throw new HttpError(400, 'Ruta inválida.');
  if (rel === '/admin') return send(res, 302, '', { Location: '/admin/' });
  if (rel.endsWith('/')) rel += 'index.html';
  const parts = rel.split('/').filter(Boolean);
  if (parts.some(s => s.startsWith('.') || s === '..') || DENY_DIRS.has(parts[0])) throw new HttpError(404, 'No encontrado.');
  const file = path.resolve(ROOT, '.' + rel);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) throw new HttpError(404, 'No encontrado.');
  let st; try { st = await stat(file); } catch { throw new HttpError(404, 'No encontrado.'); }
  if (!st.isFile()) throw new HttpError(404, 'No encontrado.');
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext]; if (!type) throw new HttpError(404, 'No encontrado.');
  let body = await readFile(file);
  if (rel === '/admin/index.html') body = Buffer.from(body.toString('utf8').replace('@@ADMIN_TOKEN@@', TOKEN));
  send(res, 200, req.method === 'HEAD' ? '' : body, { 'Content-Type': type });
}

/* ───────────── servidor ───────────── */
function createServer(port) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      const host = String(req.headers.host || '');
      if (host !== `localhost:${port}` && host !== `127.0.0.1:${port}`) throw new HttpError(403, 'Host no permitido.');
      if (url.pathname.startsWith('/api/')) {
        if (req.headers['x-admin-token'] !== TOKEN) throw new HttpError(401, 'Sesión no válida: recarga la página del editor.');
        const o = req.headers.origin;
        if (o && o !== `http://localhost:${port}` && o !== `http://127.0.0.1:${port}`) throw new HttpError(403, 'Origen no permitido.');
        return await api(req, res, url);
      }
      await serveStatic(req, res, url);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : e instanceof ValidationError ? 400 : 500;
      if (status === 500) console.error(e);
      if (res.headersSent) return res.end();
      const accept = String(req.headers.accept || '');
      if (req.url.startsWith('/api/') || accept.includes('json')) return json(res, { error: e.message || 'Error inesperado' }, status);
      send(res, status, e.message || 'Error', { 'Content-Type': 'text/plain; charset=utf-8' });
    }
  });
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
  try { spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref(); } catch { /* sin navegador */ }
}

if (!existsSync(P.site)) {
  console.error(`✗ No encuentro data/site.json en ${ROOT}\n  Ejecuta primero: node scripts/build-data.mjs`);
  process.exit(1);
}

let port = START_PORT;
(function listen() {
  const srv = createServer(port);
  srv.once('error', e => {
    if (e.code === 'EADDRINUSE' && port < START_PORT + 20) { port++; listen(); }
    else { console.error('✗ No se pudo iniciar el servidor:', e.message); process.exit(1); }
  });
  srv.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}/admin/`;
    console.log(`\n  Editor del sitio NIM-ACh\n  ────────────────────────\n  Abierto en:  ${url}\n  Carpeta:     ${ROOT}\n\n  Déjalo abierto mientras editas. Para terminar, cierra esta ventana o pulsa Ctrl+C.\n`);
    if (!NO_OPEN) openBrowser(url);
  });
})();
