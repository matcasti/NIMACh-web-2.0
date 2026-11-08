/**
 * Validación y saneamiento de todo lo que el editor guarda.
 * El sitio inserta estos datos como HTML, así que aquí se garantiza que:
 *   · los enlaces solo sean http(s)  · las imágenes estén dentro de assets/images/…
 *   · el texto no pueda introducir etiquetas  · las noticias solo conserven <a>, <em>, <strong>, <br>
 */
import { createRequire } from 'node:module';
import { HTML_FIELDS, URL_KEYS, IMG_KEYS, IMG_FOLDERS } from '../../admin/schema.mjs';

const Lite = createRequire(import.meta.url)('../../js/lite.js');

export class ValidationError extends Error {}
const bad = (where, msg) => { throw new ValidationError(`${where ? where + ': ' : ''}${msg}`); };

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
const IMG_RE = new RegExp(`^assets/images/(${IMG_FOLDERS.join('|')})/[\\w.-]+$`);

const human = path => path.replace(/\.(\d+)(\.|$)/g, (_, n, t) => ` #${+n + 1}${t === '.' ? ' → ' : ''}`).replace(/\./g, ' → ');

function walk(v, path, key) {
  if (Array.isArray(v)) return v.map((x, i) => walk(x, path ? `${path}.${i}` : String(i), key));
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) {
      if (FORBIDDEN.has(k)) bad(human(path), `clave no permitida (${k})`);
      out[k] = walk(v[k], path ? `${path}.${k}` : k, k);
    }
    return out;
  }
  if (typeof v === 'string') {
    if (HTML_FIELDS.some(r => r.test(path))) return Lite.sanitizeHtml(v);
    if (IMG_KEYS.has(key)) {
      if (v === '') return '';
      if (!IMG_RE.test(v) || v.includes('..')) bad(human(path), 'ruta de imagen no válida');
      return v;
    }
    if (URL_KEYS.has(key)) {
      const u = v.trim();
      if (u === '' || u === '#') return '';
      if (!Lite.isHttp(u)) bad(human(path), 'el enlace debe empezar con http:// o https://');
      return u;
    }
    return v.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  if (v === null && IMG_KEYS.has(key)) return '';
  return v;
}

const LIST_KEYS = ['people_categories', 'people', 'alumni', 'pets', 'projects', 'research', 'collaborators', 'globePoints', 'gallery', 'tools', 'news'];
const ID_KEYS = { people_categories: 'key' };

export function cleanSite(site) {
  if (!site || typeof site !== 'object' || Array.isArray(site)) bad('', 'los datos del sitio no tienen el formato esperado');
  const out = walk(site, '', '');
  for (const k of LIST_KEYS) {
    if (!Array.isArray(out[k])) bad(k, 'debe ser una lista');
    out[k].forEach((it, i) => { if (!it || typeof it !== 'object') bad(`${k} #${i + 1}`, 'elemento inválido'); });
    const idk = ID_KEYS[k] || 'id';
    if (out[k].length && out[k].every(x => idk in x)) {
      const seen = new Set();
      for (const it of out[k]) { if (seen.has(it[idk])) bad(k, `hay dos elementos con el mismo identificador "${it[idk]}"`); seen.add(it[idk]); }
    }
  }
  if (!out.paradigm || !Array.isArray(out.paradigm.pillars)) bad('paradigm', 'faltan los pilares');
  out.projects.forEach((p, i) => {
    p.progress = Math.min(100, Math.max(0, Number(p.progress) || 0));
    if (!p.title) bad(`projects #${i + 1}`, 'falta el título');
  });
  out.globePoints.forEach((p, i) => {
    p.lat = Number(p.lat); p.lon = Number(p.lon);
    if (!Number.isFinite(p.lat) || p.lat < -90 || p.lat > 90) bad(`Mapa → ${p.label || '#' + (i + 1)}`, 'la latitud debe estar entre -90 y 90');
    if (!Number.isFinite(p.lon) || p.lon < -180 || p.lon > 180) bad(`Mapa → ${p.label || '#' + (i + 1)}`, 'la longitud debe estar entre -180 y 180');
  });
  if (out.globePoints.filter(p => p.home).length > 1) bad('Mapa', 'solo una ciudad puede ser la sede');
  return out;
}

export function cleanInstagram(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.posts)) bad('instagram', 'formato inválido');
  const posts = walk(d.posts, 'posts', '');
  const seen = new Set();
  posts.forEach((p, i) => {
    const w = `Instagram #${i + 1}`;
    if (!p.id || !/^[\w-]+$/.test(p.id)) bad(w, 'identificador inválido');
    if (seen.has(p.id)) bad(w, 'publicación repetida');
    seen.add(p.id);
    if (!p.image) bad(w, 'falta la foto');
    if (!/^assets\/images\/instagram\/[\w.-]+$/.test(p.image)) bad(w, 'la foto debe estar en assets/images/instagram/');
    if (!/^https:\/\/www\.instagram\.com\/(?:[\w.]+\/)?(?:p|reel|tv)\/[\w-]+/.test(p.permalink || '')) bad(w, 'el enlace debe ser de una publicación de Instagram');
    if (isNaN(new Date(p.date))) bad(w, 'fecha inválida');
    p.caption = String(p.caption || '').slice(0, 800);
    p.type = p.type || 'IMAGE';
  });
  return { username: 'nimach_group', profileUrl: 'https://www.instagram.com/nimach_group/', updated: new Date().toISOString(), posts };
}
