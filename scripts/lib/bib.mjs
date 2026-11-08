/**
 * Lectura y edición mínima de data/publications.bib (sin dependencias).
 * No reescribe el archivo completo: solo agrega, modifica o elimina entradas,
 * así los comentarios y el formato de las demás se conservan intactos.
 */

/** Cierra una llave abierta en `i` (cuenta llaves, ignora \{ y \}). Devuelve el índice de la de cierre o -1. */
function matchBrace(t, i) {
  let d = 0;
  for (let j = i; j < t.length; j++) {
    const c = t[j];
    if (c === '\\') { j++; continue; }
    if (c === '{') d++;
    else if (c === '}' && --d === 0) return j;
  }
  return -1;
}

/** Lee los campos de una entrada ya delimitada. Devuelve [{name, vStart, vEnd, value}] con posiciones relativas a `raw`. */
function parseFields(raw) {
  const out = [];
  const open = raw.indexOf('{');
  const firstComma = raw.indexOf(',', open);
  if (firstComma < 0) return out;
  let i = firstComma + 1;
  const end = raw.length - 1;                      // posición de la llave de cierre
  while (i < end) {
    while (i < end && /[\s,]/.test(raw[i])) i++;
    const m = /^([A-Za-z][\w:-]*)\s*=\s*/.exec(raw.slice(i, end));
    if (!m) break;
    const name = m[1].toLowerCase();
    let vs = i + m[0].length, ve;
    if (raw[vs] === '{') { const close = matchBrace(raw, vs); if (close < 0) break; ve = close + 1; }
    else if (raw[vs] === '"') { let j = vs + 1; while (j < end && !(raw[j] === '"' && raw[j - 1] !== '\\')) j++; ve = j + 1; }
    else { let j = vs; while (j < end && raw[j] !== ',' ) j++; ve = j; }
    let value = raw.slice(vs, ve).trim();
    if (/^[{"]/.test(value)) value = value.slice(1, -1);
    out.push({ name, vStart: vs, vEnd: ve, value: value.replace(/\s+/g, ' ').trim() });
    i = ve;
  }
  return out;
}

/** Devuelve las entradas del archivo con su posición. Ignora comentarios (% y @comment/@preamble/@string). */
export function parseBib(text) {
  const entries = [];
  const re = /^@([A-Za-z]+)\s*\{/gm;
  let m;
  while ((m = re.exec(text))) {
    const type = m[1].toLowerCase();
    const open = m.index + m[0].length - 1;
    const close = matchBrace(text, open);
    if (close < 0) break;
    re.lastIndex = close + 1;
    if (['comment', 'preamble', 'string'].includes(type)) continue;
    const raw = text.slice(m.index, close + 1);
    const key = raw.slice(raw.indexOf('{') + 1, raw.indexOf(',')).trim();
    const fields = parseFields(raw);
    const f = n => (fields.find(x => x.name === n) || {}).value || '';
    entries.push({ type, key, start: m.index, end: close + 1, raw, fields,
      title: f('title'), author: f('author'), journal: f('journal') || f('booktitle'), year: f('year'),
      doi: f('doi').replace(/^https?:\/\/(dx\.)?doi\.org\//i, ''), keywords: f('keywords'), note: f('note') });
  }
  return entries;
}

/** Asigna/crea un campo dentro del texto crudo de una entrada. `value === ''` elimina el campo. */
export function setField(raw, name, value) {
  const f = parseFields(raw).find(x => x.name === name);
  const safe = String(value).replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
  if (f) {
    if (!safe) {                                     // eliminar la línea completa del campo
      const lineStart = raw.lastIndexOf('\n', f.vStart) + 1;
      let lineEnd = raw.indexOf('\n', f.vEnd); lineEnd = lineEnd < 0 ? raw.length - 1 : lineEnd + 1;
      let out = raw.slice(0, lineStart) + raw.slice(lineEnd);
      return out.replace(/,\s*\n(\s*)\}$/, '\n}');
    }
    return raw.slice(0, f.vStart) + `{${safe}}` + raw.slice(f.vEnd);
  }
  if (!safe) return raw;
  const body = raw.slice(0, -1).replace(/\s+$/, '');
  return `${body}${body.endsWith(',') ? '' : ','}\n  ${name} = {${safe}}\n}`;
}

export function removeEntry(text, key) {
  const e = parseBib(text).find(x => x.key === key);
  if (!e) return null;
  return (text.slice(0, e.start) + text.slice(e.end)).replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '\n');
}

export function appendEntry(text, raw) {
  return text.replace(/\s*$/, '') + '\n\n' + raw.trim() + '\n';
}

/** Clave estilo "castillo2025effects" sin colisiones */
export function makeKey(author, year, title, taken) {
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const fam = fold(String(author || '').split(/\s+and\s+/i)[0].split(',')[0]) || 'ref';
  const stop = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'for', 'and', 'with', 'to', 'de', 'la', 'el', 'en', 'los', 'las', 'un', 'una', 'del', 'por']);
  const w = String(title || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).find(x => x.length > 3 && !stop.has(x)) || '';
  const base = `${fam}${year || ''}${w}`;
  let key = base, n = 2;
  while (taken.has(key)) key = `${base}${n++}`;
  return key;
}

const bibEsc = s => String(s).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();

/** Crossref → texto BibTeX. `extra` = { keywords, quartile } */
export function crossrefToBib(msg, taken, extra = {}) {
  const typeMap = { 'journal-article': 'article', 'proceedings-article': 'inproceedings', 'book-chapter': 'incollection', book: 'book' };
  const type = typeMap[msg.type] || 'misc';
  const title = bibEsc((msg.title || [])[0] || '');
  if (!title) throw new Error('Crossref no devolvió título para ese DOI.');
  const authors = (msg.author || []).map(a => a.family ? `${bibEsc(a.family)}, ${bibEsc(a.given || '')}`.replace(/, $/, '') : bibEsc(a.name || '')).filter(Boolean).join(' and ');
  const dp = (msg.issued || msg['published-print'] || msg['published-online'] || {})['date-parts'];
  const year = dp && dp[0] && dp[0][0] ? String(dp[0][0]) : '';
  const key = makeKey(authors, year, title, taken);
  const L = [`@${type}{${key},`, `  title={${title}},`];
  if (authors) L.push(`  author={${authors}},`);
  const j = bibEsc((msg['container-title'] || [])[0] || '');
  if (j) L.push(`  ${type === 'inproceedings' || type === 'incollection' ? 'booktitle' : 'journal'}={${j}},`);
  if (msg.volume) L.push(`  volume={${bibEsc(msg.volume)}},`);
  if (msg.issue) L.push(`  number={${bibEsc(msg.issue)}},`);
  if (msg.page) L.push(`  pages={${bibEsc(msg.page).replace(/-+/g, '--')}},`);
  if (year) L.push(`  year={${year}},`);
  if (msg.publisher) L.push(`  publisher={${bibEsc(msg.publisher)}},`);
  if (msg.DOI) L.push(`  doi={${bibEsc(msg.DOI)}},`);
  if (extra.keywords) L.push(`  keywords = {${bibEsc(extra.keywords)}},`);
  if (extra.quartile) L.push(`  note = {${bibEsc(extra.quartile)}},`);
  L[L.length - 1] = L[L.length - 1].replace(/,$/, '');
  L.push('}');
  return { key, raw: L.join('\n') };
}

/** Escapes de LaTeX → texto normal, solo para MOSTRAR (\& → &, N{\'u}{\~n}ez → Núñez). No modifica el archivo. */
export function texToText(v) {
  const COMB = { '`': '\u0300', "'": '\u0301', '^': '\u0302', '~': '\u0303', '"': '\u0308' };
  return String(v || '')
    .replace(/\\\\/g, ' ')                                                          // \\ (salto) → espacio
    .replace(/\\c\s*\{?([cC])\}?/g, (_, c) => (c === 'c' ? 'ç' : 'Ç'))          // cedilla: \c{c}
    .replace(/\\~\s*\{\}|\\~(?![A-Za-z{\\])/g, ' ')                                          // "\~ " = espacio fino
    .replace(/\\([`'^~"])\s*\{?\\?(\\i|[A-Za-z])\}?/g, (_, m, c) => (c === '\\i' ? 'i' : c) + COMB[m])
    .replace(/\{\\([a-zA-Z]{1,2})\}/g, (_, c) => ({ ss: 'ß', o: 'ø', O: 'Ø', ae: 'æ', AE: 'Æ', l: 'ł', L: 'Ł', aa: 'å', AA: 'Å' }[c] || c))
    .replace(/\\([&%_#$])/g, '$1')
    .replace(/[{}]/g, '')
    .normalize('NFC')
    .replace(/\s+/g, ' ').trim();
}
