/**
 * Editor del sitio NIM-ACh — interfaz.
 * Todo se genera a partir de admin/schema.mjs: para agregar un campo o una sección basta con
 * editar ese archivo. Cada guardado se escribe de inmediato en los archivos del proyecto.
 */
import { SECTIONS, getPath, setPath, makeId } from './schema.mjs';

const TOKEN = window.__ADMIN_TOKEN__;
const Lite = window.NIMLite;
const $ = (s, r = document) => r.querySelector(s);

/* ───────────────────────── utilidades ───────────────────────── */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (['checked', 'disabled', 'hidden', 'selected'].includes(k)) el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(2).forEach(c => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return el;
}
const iconEl = (name, size = 18) => { const s = h('span', { class: 'ico', 'aria-hidden': 'true' }); s.innerHTML = NIMUI.icon(name, size); return s; };
const un = s => (typeof s === 'string' ? s.replace(/&lt;/g, '<').replace(/&gt;/g, '>') : s);      // el servidor guarda < y > escapados
const clone = o => structuredClone(o);
const plain = html => Lite.fromHtml(html || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*+/g, '');

async function api(method, url, body) {
  const opt = { method, headers: { 'X-Admin-Token': TOKEN } };
  if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  let r;
  try { r = await fetch(url, opt); } catch { throw new Error('No hay conexión con el editor. ¿Cerraste la ventana de terminal?'); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
  return data;
}

function toast(msg, kind = '') {
  const t = h('div', { class: `toast ${kind}`, role: 'status' }, msg);
  $('#toasts').append(t);
  setTimeout(() => t.remove(), kind === 'err' ? 8000 : 3500);
}
function setStatus(s, msg) {
  const el = $('#status');
  el.dataset.s = s;
  $('span', el).textContent = msg;
}

/** Diálogo modal genérico. `build(close)` devuelve {title, body, foot?}. Devuelve la caja <dialog>. */
function modal({ title, body, foot, narrow, onClose }) {
  const dlg = h('dialog', { class: narrow ? 'dlg-narrow' : '' },
    h('div', { class: 'dlg-head' }, h('h2', { text: title }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Cerrar', onclick: () => dlg.close() }, '✕')),
    h('div', { class: 'dlg-body' }, body),
    foot ? h('div', { class: 'dlg-foot' }, foot) : null);
  dlg.addEventListener('close', () => { dlg.remove(); onClose && onClose(); });
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

function ask({ title, text, ok = 'Aceptar', danger = false, info = false }) {
  return new Promise(resolve => {
    let answer = false;
    const dlg = modal({
      title, narrow: true, onClose: () => resolve(answer),
      body: (Array.isArray(text) ? text : [text]).map(t => h('p', { style: 'margin:0 0 .6rem;white-space:pre-line' }, t)),
      foot: [
        h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, info ? 'Entendido' : 'Cancelar'),
        info ? null : h('button', { class: `btn ${danger ? 'btn-solid-danger' : 'btn-primary'}`, type: 'button', onclick: () => { answer = true; dlg.close(); } }, ok),
      ],
    });
  });
}

/* ───────────────────────── estado ───────────────────────── */
const S = { site: null, insta: null, bib: null, current: 'people', canResize: false };
const sec = id => SECTIONS.find(s => s.id === id);

const collection = s => (s.store === 'instagram' ? S.insta.posts : getPath(S.site, s.path));

async function putSite(next) {
  setStatus('saving', 'Guardando…');
  try { const r = await api('PUT', '/api/site', next); S.site = r.site; setStatus('saved', `Guardado ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`); refreshGit(); return r; }
  catch (e) { setStatus('error', 'No se pudo guardar'); throw e; }
}
async function putInsta(next) {
  setStatus('saving', 'Guardando…');
  next.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  try { const r = await api('PUT', '/api/instagram', next); S.insta = r.instagram; setStatus('saved', `Guardado ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`); refreshGit(); return r; }
  catch (e) { setStatus('error', 'No se pudo guardar'); throw e; }
}
/** Aplica una mutación sobre una copia de la colección y guarda (si falla, nada cambia en memoria) */
async function mutate(section, fn) {
  if (section.store === 'instagram') { const n = clone(S.insta); fn(n.posts); return putInsta(n); }
  const n = clone(S.site); fn(getPath(n, section.path)); return putSite(n);
}

/* ───────────────────────── campos del formulario ───────────────────────── */
function optionsFor(def) {
  if (def.options) return def.options;
  if (def.from === 'people') return S.site.people.map(p => ({ value: p.id, label: un(p.name) }));
  if (def.from === 'people_categories') return S.site.people_categories.map(c => ({ value: c.key, label: un(c.label) }));
  return [];
}

function wrapField(def, control, extra = {}) {
  const err = h('div', { class: 'err', 'aria-live': 'polite' });
  const id = `f-${Math.random().toString(36).slice(2, 8)}`;
  const isBool = def.t === 'bool';
  const wrap = h('div', { class: 'field' },
    isBool ? null : h('label', { for: id }, def.label, def.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, '*') : null),
    control,
    def.help ? h('div', { class: 'help' }, def.help) : null,
    err);
  if (!isBool) { const input = control.matches?.('input,select,textarea') ? control : $('input,select,textarea', control); if (input) input.id = id; }
  return {
    el: wrap,
    setError(msg) { err.textContent = msg || ''; wrap.classList.toggle('invalid', !!msg); },
    focus() { ($('input,select,textarea,button', wrap) || wrap).focus(); },
    ...extra,
  };
}

function makeField(def, value, ctx) {
  const emptyReq = v => (def.required && (v === '' || v == null || (Array.isArray(v) && !v.length)) ? 'Este campo es obligatorio.' : '');
  let w;

  switch (def.t) {
    case 'text': case 'url': {
      const input = h('input', { type: def.t === 'url' ? 'url' : 'text', value: un(value || ''), placeholder: def.ph || '', autocomplete: 'off', spellcheck: def.t === 'url' ? 'false' : 'true' });
      if (def.datalist) {
        const [col, key] = def.datalist.split('.');
        const dl = h('datalist', { id: `dl-${col}-${key}` }, [...new Set((S.site[col] || []).map(x => un(x[key])).filter(Boolean))].map(v => h('option', { value: v })));
        input.setAttribute('list', dl.id); w = wrapField(def, h('div', null, input, dl));
      } else w = wrapField(def, input);
      w.get = () => input.value.trim();
      w.validate = () => {
        const v = w.get(); if (emptyReq(v)) return emptyReq(v);
        if (def.t === 'url' && v) {
          if (!/^https?:\/\/[^\s"'<>]+$/i.test(v)) return 'El enlace debe empezar con http:// o https://';
          if (def.pattern && !def.pattern.test(v)) return def.patternMsg || 'El enlace no tiene el formato esperado.';
        }
        return '';
      };
      break;
    }
    case 'textarea': case 'lite': {
      const store = def.store === 'html';
      const initial = def.t === 'lite' ? (store ? Lite.fromHtml(value || '') : un(value || '')) : un(value || '');
      const ta = h('textarea', { rows: def.rows || 3, placeholder: def.ph || '' }, initial);
      const prev = def.t === 'lite' ? h('div', { class: 'lite-prev' }) : null;
      const upd = () => { if (prev) prev.innerHTML = ta.value.trim() ? Lite.toHtml(ta.value) : ''; };
      if (prev) { ta.addEventListener('input', upd); upd(); }
      w = wrapField(def, h('div', null, ta, prev));
      w.get = () => { const v = ta.value.trim(); return def.t === 'lite' && store ? Lite.toHtml(v) : v; };
      w.validate = () => emptyReq(ta.value.trim());
      break;
    }
    case 'number': {
      const input = h('input', { type: 'number', value: value ?? '', min: def.min, max: def.max, step: def.step || 1, inputmode: 'decimal' });
      w = wrapField(def, def.unit ? h('div', { class: 'with-unit' }, input, h('span', null, def.unit)) : input);
      w.get = () => (input.value === '' ? null : Number(input.value));
      w.validate = () => {
        const v = w.get();
        if (v == null) return def.required ? 'Este campo es obligatorio.' : '';
        if (def.min != null && v < def.min) return `Debe ser al menos ${def.min}.`;
        if (def.max != null && v > def.max) return `Debe ser como máximo ${def.max}.`;
        return '';
      };
      break;
    }
    case 'select': {
      const sel = h('select', null,
        def.empty != null ? h('option', { value: '' }, def.empty) : null,
        optionsFor(def).map(o => h('option', { value: o.value, selected: o.value === value }, o.label)));
      if (value && !optionsFor(def).some(o => o.value === value)) sel.append(h('option', { value, selected: true }, `${value} (ya no existe)`));
      w = wrapField(def, sel);
      w.get = () => sel.value;
      w.validate = () => emptyReq(sel.value);
      break;
    }
    case 'multi': {
      const cur = new Set([].concat(value || []));
      const boxes = optionsFor(def).map(o => h('label', { class: 'pill' }, h('input', { type: 'checkbox', value: o.value, checked: cur.has(o.value) }), o.label));
      w = wrapField(def, h('div', { class: 'pills', role: 'group' }, boxes));
      w.get = () => boxes.map(b => $('input', b)).filter(i => i.checked).map(i => i.value);
      w.validate = () => emptyReq(w.get());
      break;
    }
    case 'bool': {
      // Si el dato no existe se usa `dflt` (el sitio trata `active` ausente como verdadero)
      const input = h('input', { type: 'checkbox', checked: value == null ? !!def.dflt : !!value });
      w = wrapField(def, h('label', { class: 'switch' }, input, def.label));
      w.get = () => input.checked;
      w.validate = () => '';
      break;
    }
    case 'tags': w = tagsField(def, value, ctx); break;
    case 'lines': {
      const ta = h('textarea', { rows: 4, placeholder: def.ph || '' }, (value || []).map(un).join('\n'));
      w = wrapField(def, ta);
      w.get = () => ta.value.split('\n').map(s => s.trim()).filter(Boolean);
      w.validate = () => emptyReq(w.get());
      break;
    }
    case 'date': {
      const v = value ? String(value).slice(0, 10) : '';
      const input = h('input', { type: 'date', value: v });
      w = wrapField(def, input);
      w.get = () => (input.value ? `${input.value}T12:00:00.000Z` : '');
      w.validate = () => emptyReq(input.value);
      break;
    }
    case 'links': {
      const cur = value || {};
      const inputs = def.keys.map(k => ({ k: k.k, input: h('input', { type: 'url', value: cur[k.k] || '', placeholder: 'https://…', spellcheck: 'false' }), label: k.label }));
      w = wrapField(def, h('div', { class: 'links-grid' }, inputs.map(i => h('label', null, i.label, i.input))));
      w.get = () => Object.fromEntries(inputs.map(i => [i.k, i.input.value.trim()]).filter(([, v]) => v));
      w.validate = () => (inputs.some(i => i.input.value.trim() && !/^https?:\/\/[^\s"'<>]+$/i.test(i.input.value.trim())) ? 'Cada enlace debe empezar con http:// o https://' : '');
      w.el.querySelector('.field > label')?.removeAttribute('for');
      break;
    }
    case 'image': w = imageField(def, value, ctx); break;
    case 'items': w = itemsField(def, value, ctx); break;
    default: throw new Error(`Tipo de campo desconocido: ${def.t}`);
  }
  w.def = def;
  return w;
}

function tagsField(def, value, ctx) {
  let tags = (value || []).map(un);
  const input = h('input', { type: 'text', placeholder: def.ph || 'Escribe y presiona Enter', autocomplete: 'off', list: def.suggest ? `dl-${def.k}` : null });
  const box = h('div', { class: 'tags', onclick: () => input.focus() });
  const draw = () => {
    box.replaceChildren(...tags.map((t, i) => h('span', { class: 'tag' }, t,
      h('button', { type: 'button', 'aria-label': `Quitar ${t}`, onclick: e => { e.stopPropagation(); tags.splice(i, 1); draw(); box.dispatchEvent(new Event('input', { bubbles: true })); } }, '×'))), input);
  };
  const add = () => {
    input.value.split(',').map(s => s.trim()).filter(Boolean).forEach(t => { if (!tags.some(x => x.toLowerCase() === t.toLowerCase())) tags.push(t); });
    input.value = ''; draw(); box.dispatchEvent(new Event('input', { bubbles: true }));
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
    else if (e.key === 'Backspace' && !input.value && tags.length) { tags.pop(); draw(); }
  });
  input.addEventListener('blur', () => { if (input.value.trim()) add(); });
  draw();
  const extra = ctx && ctx.suggestions && def.suggest ? h('datalist', { id: `dl-${def.k}` }, ctx.suggestions.map(s => h('option', { value: s }))) : null;
  const w = wrapField(def, h('div', null, box, extra));
  w.get = () => { if (input.value.trim()) add(); return [...tags]; };
  w.validate = () => (def.required && !tags.length ? 'Agrega al menos un elemento.' : '');
  return w;
}

function imageField(def, value, ctx) {
  let path = value || '';
  const prev = h('div', { class: 'img-prev' });
  const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic', hidden: true });
  const info = h('div', { class: 'help' });
  const btnUp = h('button', { class: 'btn btn-sm', type: 'button', onclick: () => file.click() });
  const btnRm = h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { path = ''; draw(); box.dispatchEvent(new Event('input', { bubbles: true })); } }, 'Quitar foto');
  const box = h('div', { class: 'img-field' }, prev, h('div', { class: 'img-actions' }, btnUp, btnRm, info), file);
  function draw() {
    prev.replaceChildren(path ? h('img', { src: `/${path}`, alt: '' }) : 'Sin foto');
    btnUp.textContent = path ? 'Cambiar foto…' : 'Subir foto…';
    btnRm.hidden = !path;
  }
  async function upload(f) {
    if (!f) return;
    info.textContent = 'Subiendo y optimizando…'; btnUp.disabled = true;
    try {
      const name = (ctx && ctx.nameHint && ctx.nameHint()) || def.folder;
      const r = await fetch(`/api/upload?folder=${def.folder}&name=${encodeURIComponent(name)}`, { method: 'POST', headers: { 'X-Admin-Token': TOKEN, 'Content-Type': 'application/octet-stream' }, body: f });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'No se pudo subir la imagen.');
      path = data.path; info.textContent = `Lista (${Math.round(data.bytes / 1024)} KB${data.resized ? ', optimizada' : ''}).`;
      draw(); box.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (e) { info.textContent = ''; toast(e.message, 'err'); }
    btnUp.disabled = false; file.value = '';
  }
  file.addEventListener('change', () => upload(file.files[0]));
  ['dragenter', 'dragover'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.remove('drag'); }));
  box.addEventListener('drop', e => upload(e.dataTransfer.files[0]));
  draw();
  const w = wrapField(def, box);
  w.get = () => path;
  w.validate = () => (def.required && !path ? 'Falta la foto.' : '');
  w.el.querySelector('.field > label')?.removeAttribute('for');
  return w;
}

function itemsField(def, value, ctx) {
  const list = h('div', { class: 'items' });
  const entries = [];
  const addBtn = h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { addEntry(def.defaults ? def.defaults() : {}); relabel(); changed(); } }, `+ Agregar ${def.itemName}`);
  const changed = () => list.dispatchEvent(new Event('input', { bubbles: true }));
  const relabel = () => {
    entries.forEach((en, i) => {
      $('strong', en.el).textContent = `${def.itemName[0].toUpperCase()}${def.itemName.slice(1)} ${i + 1}`;
      $('[data-up]', en.el).disabled = i === 0; $('[data-down]', en.el).disabled = i === entries.length - 1;
    });
    addBtn.hidden = def.max && entries.length >= def.max;
  };
  function addEntry(orig) {
    const widgets = def.fields.map(f => makeField(f, getPath(orig, f.k), { ...ctx, nameHint: () => '' }));
    const en = { orig, widgets };
    en.el = h('div', { class: 'item-card' },
      h('div', { class: 'item-head' }, h('strong'),
        h('span', null,
          h('button', { class: 'icon-btn', type: 'button', 'data-up': '', 'aria-label': 'Subir', onclick: () => move(en, -1) }, '▲'),
          h('button', { class: 'icon-btn', type: 'button', 'data-down': '', 'aria-label': 'Bajar', onclick: () => move(en, 1) }, '▼'),
          h('button', { class: 'icon-btn danger', type: 'button', 'aria-label': 'Quitar', onclick: () => { entries.splice(entries.indexOf(en), 1); en.el.remove(); relabel(); changed(); } }, '✕'))),
      h('div', { class: 'item-body' }, widgets.map(x => x.el)));
    entries.push(en); list.append(en.el);
  }
  function move(en, d) {
    const i = entries.indexOf(en), j = i + d;
    if (j < 0 || j >= entries.length) return;
    [entries[i], entries[j]] = [entries[j], entries[i]];
    entries.forEach(e => list.append(e.el)); relabel(); changed();
  }
  (value || []).forEach(v => addEntry(v));
  relabel();
  const w = wrapField(def, h('div', null, list, h('div', { style: 'margin-top:.6rem' }, addBtn)));
  w.get = () => entries.map((en, i) => {
    const out = { ...en.orig };
    en.widgets.forEach(x => setPath(out, x.def.k, x.get()));
    def.derive && def.derive(out, i);
    return out;
  });
  w.validate = () => {
    let first = '';
    entries.forEach(en => en.widgets.forEach(x => { const m = x.validate(); x.setError(m); if (m && !first) first = 'Revisa los campos marcados.'; }));
    return first;
  };
  w.el.querySelector('.field > label')?.removeAttribute('for');
  return w;
}

/** Valida, marca errores y devuelve true si todo está bien */
function validateAll(widgets) {
  let firstBad = null;
  for (const w of widgets) {
    const m = w.validate();
    w.setError(m);
    if (m && !firstBad) firstBad = w;
  }
  if (firstBad) firstBad.focus();
  return !firstBad;
}

/* ───────────────────────── vistas de sección ───────────────────────── */
function thumbFor(c) {
  const t = h('div', { class: 'thumb' });
  if (c.image) t.append(h('img', { src: `/${c.image}`, alt: '', loading: 'lazy' }));
  else if (c.icon) t.append(iconEl(c.icon));
  else t.append(String(c.title || '?').trim().slice(0, 1).toUpperCase());
  return t;
}

function renderList(s, main) {
  const list = collection(s);
  const nav = $(`[data-nav="${s.id}"] small`); if (nav) nav.textContent = list.length;
  const searchBox = list.length > 6 ? h('input', { class: 'search', type: 'search', placeholder: 'Buscar…', 'aria-label': 'Buscar', oninput: e => filter(e.target.value) }) : null;
  const rows = h('div', { class: 'rows' });
  main.append(
    h('div', { class: 'sec-head' },
      h('div', null, h('h1', { text: s.label }), h('p', { text: s.help })),
      h('div', { class: 'sec-tools' }, searchBox, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => openItem(s, -1) }, `+ Agregar ${s.itemName}`))),
    rows);

  const fixedOrder = s.store === 'instagram';
  const filterable = [];
  function draw() {
    rows.replaceChildren();
    filterable.length = 0;
    if (!list.length) { rows.append(h('div', { class: 'empty' }, `Todavía no hay ${s.label.toLowerCase()}. Usa «Agregar ${s.itemName}».`)); return; }
    list.forEach((it, i) => {
      const c = s.card(it);
      const sub = c.subHtml ? plain(c.sub) : un(c.sub || '');
      const row = h('div', { class: 'row' },
        thumbFor({ ...c, title: un(c.title) }),
        h('button', { class: 'row-main', type: 'button', onclick: () => openItem(s, i), 'aria-label': `Editar ${un(c.title)}` },
          h('div', { class: 'row-title' }, un(c.title) || '(sin título)'),
          sub ? h('div', { class: 'row-sub' }, sub) : null,
          c.badges && c.badges.length ? h('div', { class: 'badges' }, c.badges.map(b => h('span', { class: 'badge' }, b))) : null),
        h('div', { class: 'row-actions' },
          fixedOrder ? null : h('button', { class: 'icon-btn', type: 'button', title: 'Subir', 'aria-label': 'Subir', disabled: i === 0, onclick: () => move(i, -1) }, '▲'),
          fixedOrder ? null : h('button', { class: 'icon-btn', type: 'button', title: 'Bajar', 'aria-label': 'Bajar', disabled: i === list.length - 1, onclick: () => move(i, 1) }, '▼'),
          h('button', { class: 'icon-btn', type: 'button', title: 'Editar', 'aria-label': 'Editar', onclick: () => openItem(s, i) }, '✎'),
          h('button', { class: 'icon-btn danger', type: 'button', title: 'Eliminar', 'aria-label': 'Eliminar', onclick: () => remove(i) }, '🗑')));
      filterable.push({ row, text: `${un(c.title)} ${sub} ${(c.badges || []).join(' ')}`.toLowerCase() });
      rows.append(row);
    });
  }
  function filter(q) { const t = q.trim().toLowerCase(); filterable.forEach(f => { f.row.hidden = !!t && !f.text.includes(t); }); }
  async function move(i, d) {
    try { await mutate(s, l => { const [x] = l.splice(i, 1); l.splice(i + d, 0, x); }); rerender(); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function remove(i) {
    const it = list[i], c = s.card(it);
    const refs = (s.refs && s.refs(S.site, it)) || [];
    if (refs.length && s.id === 'people_categories') {
      return ask({ title: 'No se puede eliminar', text: [`La categoría "${un(c.title)}" está en uso por ${refs.join(', ')}.`, 'Cámbiales la categoría primero.'], info: true });
    }
    const ok = await ask({ title: `¿Eliminar ${s.itemName}?`, danger: true, ok: 'Eliminar',
      text: [`"${un(c.title)}" se quitará del sitio.`, refs.length ? `Atención: también se menciona en ${refs.join(', ')} (quedarán sin esa referencia).` : 'Puedes recuperarlo desde Mantenimiento → Versiones anteriores.'] });
    if (!ok) return;
    try { await mutate(s, l => l.splice(i, 1)); toast('Eliminado', 'ok'); rerender(); } catch (e) { toast(e.message, 'err'); }
  }
  draw();
}

/* ── Diálogo de edición de un elemento ── */
function openItem(s, index) {
  const list = collection(s);
  const isNew = index < 0;
  const orig = isNew ? s.defaults() : list[index];
  const ctx = { nameHint: () => { const f = s.fields.find(x => x.t === 'text' || x.t === 'textarea'); const w = widgets.find(x => x.def === f); return (w && w.get()) || s.id; },
                suggestions: [] };
  const widgets = s.fields.map(f => makeField(f, getPath(orig, f.k), ctx));
  const msg = h('span', { class: 'msg' });
  const form = h('form', { class: 'form', novalidate: true }, widgets.map(w => w.el));
  const save = h('button', { class: 'btn btn-primary', type: 'submit', form: 'item-form' }, isNew ? `Agregar ${s.itemName}` : 'Guardar cambios');
  form.id = 'item-form';
  const dlg = modal({
    title: `${isNew ? 'Agregar' : 'Editar'} ${s.itemName}`, body: form,
    foot: [msg, h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Cancelar'), save],
  });
  setTimeout(() => $('input[type=text],textarea', form)?.focus(), 30);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    msg.textContent = '';
    if (!validateAll(widgets)) { msg.textContent = 'Revisa los campos marcados en rojo.'; return; }
    const item = { ...orig };
    widgets.forEach(w => setPath(item, w.def.k, w.get()));

    if (s.store === 'instagram') {
      const m = String(item.permalink).match(/\/(?:p|reel|tv)\/([\w-]+)/);
      item.id = m ? m[1] : item.id;
      item.permalink = `https://www.instagram.com/${/\/reel\//.test(item.permalink) ? 'reel' : /\/tv\//.test(item.permalink) ? 'tv' : 'p'}/${item.id}/`;
      if (list.some((p, i) => p.id === item.id && i !== index)) { msg.textContent = 'Esa publicación ya está en la galería.'; return; }
    } else if (isNew && s.idFrom) item[s.idKey || 'id'] = makeId(s, item, list);
    s.derive && s.derive(item, isNew ? list.length : index);

    save.disabled = true; const label = save.textContent; save.textContent = 'Guardando…';
    try {
      await mutate(s, l => { if (isNew) (s.addFirst ? l.unshift(item) : l.push(item)); else l[index] = item; });
      dlg.close(); toast(isNew ? 'Agregado' : 'Cambios guardados', 'ok'); rerender();
    } catch (err) { msg.textContent = err.message; save.disabled = false; save.textContent = label; }
  });
}

/* ── Secciones tipo formulario (paradigma, textos, ajustes) ── */
function renderForm(s, main) {
  const root = s.root === '' ? S.site : getPath(S.site, s.root);
  const widgets = s.fields.map(f => makeField(f, getPath(root, f.k), { nameHint: () => '' }));
  const btn = h('button', { class: 'btn btn-primary', type: 'submit', disabled: true }, 'Guardar cambios');
  const msg = h('span', { class: 'help' });
  const form = h('form', { class: 'form', novalidate: true }, widgets.map(w => w.el),
    h('div', { style: 'display:flex;gap:1rem;align-items:center' }, btn, msg));
  form.addEventListener('input', () => { btn.disabled = false; msg.textContent = ''; });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateAll(widgets)) return;
    const next = clone(S.site);
    const r = s.root === '' ? next : (getPath(next, s.root) || (setPath(next, s.root, {}), getPath(next, s.root)));
    widgets.forEach(w => setPath(r, w.def.k, w.get()));
    btn.disabled = true; btn.textContent = 'Guardando…';
    try { await putSite(next); toast('Cambios guardados', 'ok'); rerender(); }
    catch (err) { msg.textContent = err.message; msg.style.color = 'var(--err)'; btn.disabled = false; btn.textContent = 'Guardar cambios'; }
  });
  main.append(h('div', { class: 'sec-head' }, h('div', null, h('h1', { text: s.label }), h('p', { text: s.help }))), form);
}

/* ── Publicaciones (.bib) ── */
async function renderBib(s, main) {
  main.append(h('div', { class: 'sec-head' }, h('div', null, h('h1', { text: s.label }), h('p', { text: s.help }))));
  const holder = h('div', null, h('p', null, h('span', { class: 'spinner' }), ' Cargando…'));
  main.append(holder);
  try { S.bib = (await api('GET', '/api/bib')).entries; } catch (e) { holder.replaceChildren(h('div', { class: 'note warn' }, e.message)); return; }

  let q = '', shown = 40;
  const nav = $('[data-nav="publications"] small');
  const topics = () => { const f = {}; S.bib.forEach(e => e.keywords.split(',').map(x => x.trim().toLowerCase()).filter(Boolean).forEach(k => { f[k] = (f[k] || 0) + 1; })); return Object.keys(f).sort((a, b) => f[b] - f[a]); };

  const search = h('input', { class: 'search', type: 'search', placeholder: 'Buscar por título, autor, año…', oninput: e => { q = e.target.value.toLowerCase(); shown = 40; draw(); } });
  const list = h('div', { class: 'rows' });
  const more = h('button', { class: 'btn more', type: 'button', onclick: () => { shown += 40; draw(); } }, 'Mostrar más');
  const count = h('p', { class: 'help', style: 'margin:.2rem 0 .8rem' });
  holder.replaceChildren(
    h('div', { class: 'sec-tools', style: 'margin-bottom:1rem' }, search,
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => addByDoi() }, '+ Agregar por DOI'),
      h('button', { class: 'btn', type: 'button', onclick: () => pasteBib() }, 'Pegar BibTeX'),
      h('button', { class: 'btn', type: 'button', onclick: () => rawEdit() }, 'Editar archivo (avanzado)')),
    count, list, more);

  function draw() {
    if (nav) nav.textContent = S.bib.length;
    const items = S.bib.filter(e => !q || `${e.title} ${e.author} ${e.year} ${e.keywords} ${e.journal}`.toLowerCase().includes(q))
      .sort((a, b) => (parseInt((b.year.match(/\d{4}/) || [0])[0]) - parseInt((a.year.match(/\d{4}/) || [0])[0])));
    count.textContent = `${items.length} de ${S.bib.length} publicaciones`;
    list.replaceChildren(...items.slice(0, shown).map(e => {
      const yr = (e.year.match(/\d{4}/) || [''])[0];
      return h('div', { class: 'pub' },
        h('div', { class: `yr ${/^\d{4}$/.test(e.year) ? '' : 'odd'}`, title: /^\d{4}$/.test(e.year) ? '' : `El año está escrito como "${e.year}"` }, yr || '—'),
        h('div', null, h('div', { class: 'pub-t' }, e.title), h('div', { class: 'pub-s' }, [e.author.split(' and ')[0], e.journal].filter(Boolean).join(' · ')),
          h('div', { class: 'badges' }, e.quartile ? h('span', { class: 'badge' }, e.quartile) : null, e.keywords.split(',').map(k => k.trim()).filter(Boolean).map(k => h('span', { class: 'badge' }, k)))),
        h('div', { class: 'row-actions' },
          h('button', { class: 'icon-btn', type: 'button', title: 'Editar', 'aria-label': 'Editar', onclick: () => editPub(e) }, '✎'),
          h('button', { class: 'icon-btn danger', type: 'button', title: 'Eliminar', 'aria-label': 'Eliminar', onclick: () => delPub(e) }, '🗑')));
    }));
    if (!items.length) list.append(h('div', { class: 'empty' }, 'Ninguna publicación coincide con la búsqueda.'));
    more.hidden = items.length <= shown;
  }
  const refresh = entries => { S.bib = entries; draw(); refreshGit(); };

  function editPub(e) {
    const defs = [
      { k: 'title', t: 'textarea', rows: 2, label: 'Título', required: true },
      { k: 'author', t: 'textarea', rows: 3, label: 'Autores', help: 'Formato: Apellido, Nombre and Apellido, Nombre …' },
      { k: 'journal', t: 'text', label: 'Revista o congreso' },
      { k: 'year', t: 'text', label: 'Año', required: true, help: 'Cuatro cifras, por ejemplo 2024.' },
      { k: 'doi', t: 'text', label: 'DOI', ph: '10.1234/abcd', help: 'Sin https://doi.org/. Con el DOI se obtienen las citas automáticamente.' },
      { k: 'keywords', t: 'tags', label: 'Temas', suggest: true, help: 'Sirven para los filtros de la página Publicaciones. Elige entre los existentes para no duplicar.' },
      { k: 'quartile', t: 'select', label: 'Cuartil de la revista', empty: '— sin clasificar —', options: ['Q1', 'Q2', 'Q3', 'Q4'].map(v => ({ value: v, label: v })) },
    ];
    const orig = { ...e, keywords: e.keywords.split(',').map(x => x.trim()).filter(Boolean) };
    const ws = defs.map(d => makeField(d, orig[d.k], { suggestions: topics() }));
    const form = h('form', { class: 'form', id: 'pub-form', novalidate: true }, ws.map(w => w.el));
    const msg = h('span', { class: 'msg' }); const save = h('button', { class: 'btn btn-primary', type: 'submit', form: 'pub-form' }, 'Guardar cambios');
    const dlg = modal({ title: 'Editar publicación', body: form, foot: [msg, h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Cancelar'), save] });
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (!validateAll(ws)) return;
      const fields = {};
      ws.forEach(w => {
        let v = w.get(); if (w.def.k === 'keywords') v = v.join(', ');
        if (String(v) !== String(w.def.k === 'keywords' ? orig.keywords.join(', ') : orig[w.def.k] || '')) fields[w.def.k] = v;
      });
      if (!Object.keys(fields).length) return dlg.close();
      save.disabled = true;
      try { refresh((await api('PUT', '/api/bib/entry', { key: e.key, fields })).entries); dlg.close(); toast('Publicación actualizada', 'ok'); setStatus('saved', 'Guardado'); }
      catch (err) { msg.textContent = err.message; save.disabled = false; }
    });
  }
  async function delPub(e) {
    if (!await ask({ title: '¿Eliminar publicación?', danger: true, ok: 'Eliminar', text: [`"${e.title}"`, 'Se quitará de la lista. Se guarda una copia del archivo anterior.'] })) return;
    try { refresh((await api('POST', '/api/bib/delete', { key: e.key })).entries); toast('Eliminada', 'ok'); } catch (err) { toast(err.message, 'err'); }
  }
  function addByDoi() {
    const ws = [
      makeField({ k: 'doi', t: 'text', label: 'DOI de la publicación', required: true, ph: '10.1234/abcd', help: 'Pega el DOI o el enlace https://doi.org/… Los datos (título, autores, revista, año) se completan solos desde Crossref.' }, ''),
      makeField({ k: 'keywords', t: 'tags', label: 'Temas', suggest: true, help: 'Para los filtros. Elige entre los existentes cuando puedas.' }, [], { suggestions: topics() }),
      makeField({ k: 'quartile', t: 'select', label: 'Cuartil de la revista', empty: '— sin clasificar —', options: ['Q1', 'Q2', 'Q3', 'Q4'].map(v => ({ value: v, label: v })) }, ''),
    ];
    const form = h('form', { class: 'form', id: 'doi-form', novalidate: true }, ws.map(w => w.el));
    const msg = h('span', { class: 'msg' }); const go = h('button', { class: 'btn btn-primary', type: 'submit', form: 'doi-form' }, 'Buscar y agregar');
    const dlg = modal({ title: 'Agregar publicación por DOI', body: form, foot: [msg, h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Cancelar'), go] });
    form.addEventListener('submit', async ev => {
      ev.preventDefault(); msg.textContent = '';
      if (!validateAll(ws)) return;
      go.disabled = true; go.replaceChildren(h('span', { class: 'spinner' }), ' Buscando…');
      try {
        const r = await api('POST', '/api/bib/doi', { doi: ws[0].get(), keywords: ws[1].get().join(', '), quartile: ws[2].get() });
        refresh(r.entries); dlg.close(); toast('Publicación agregada. Revisa que los datos sean correctos.', 'ok'); search.value = ''; q = ''; draw();
      } catch (err) { msg.textContent = err.message; go.disabled = false; go.textContent = 'Buscar y agregar'; }
    });
  }
  function pasteBib() {
    const ta = h('textarea', { class: 'mono', rows: 12, placeholder: '@article{clave2025,\n  title={…},\n  author={Apellido, Nombre and …},\n  journal={…},\n  year={2025},\n  doi={10.…},\n  keywords={HRV, Ejercicio}\n}' });
    const msg = h('span', { class: 'msg' }); const go = h('button', { class: 'btn btn-primary', type: 'button' }, 'Agregar');
    const dlg = modal({ title: 'Pegar BibTeX', body: [h('p', { class: 'help', style: 'margin-top:0' }, 'Pega una o varias entradas (por ejemplo, exportadas desde Zotero o Google Académico).'), ta], foot: [msg, h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Cancelar'), go] });
    go.addEventListener('click', async () => {
      go.disabled = true; msg.textContent = '';
      try { const r = await api('POST', '/api/bib/raw', { raw: ta.value }); refresh(r.entries); dlg.close(); toast(`${r.added} publicación(es) agregada(s)`, 'ok'); }
      catch (err) { msg.textContent = err.message; go.disabled = false; }
    });
  }
  async function rawEdit() {
    const { text } = await api('GET', '/api/bib/file');
    const ta = h('textarea', { class: 'mono', rows: 22, spellcheck: 'false' }, text);
    const msg = h('span', { class: 'msg' }); const go = h('button', { class: 'btn btn-primary', type: 'button' }, 'Guardar archivo');
    const dlg = modal({ title: 'Editar publications.bib', body: [h('div', { class: 'note warn', style: 'margin-bottom:.8rem' }, 'Modo avanzado: edita el archivo BibTeX completo. Se valida antes de guardar y se conserva una copia del anterior.'), ta],
      foot: [msg, h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Cancelar'), go] });
    go.addEventListener('click', async () => {
      go.disabled = true; msg.textContent = '';
      try { await api('PUT', '/api/bib/file', { text: ta.value }); S.bib = (await api('GET', '/api/bib')).entries; dlg.close(); draw(); refreshGit(); toast('Archivo guardado', 'ok'); }
      catch (err) { msg.textContent = err.message; go.disabled = false; }
    });
  }
  draw();
}

/* ── Mantenimiento ── */
async function renderMaintenance(s, main) {
  main.append(h('div', { class: 'sec-head' }, h('div', null, h('h1', { text: s.label }), h('p', { text: s.help }))));
  const back = h('div', { class: 'card' }, h('h2', { text: 'Versiones anteriores' }), h('p', null, 'Cada vez que guardas se conserva una copia de los datos anteriores (las últimas 30). Si algo sale mal, puedes volver atrás.'), h('div', null, h('span', { class: 'spinner' })));
  const orph = h('div', { class: 'card' }, h('h2', { text: 'Imágenes sin usar' }), h('p', null, 'Fotos subidas que ningún dato usa (por ejemplo, después de cambiar o quitar una foto). Borrarlas libera espacio en el repositorio.'), h('div', null, h('span', { class: 'spinner' })));
  main.append(back, orph, h('div', { class: 'note' }, `Carpeta del proyecto: ${S.root}. `, S.canResize ? 'Las fotos se reducen automáticamente al subirlas.' : 'Este equipo no puede reducir fotos automáticamente: sube imágenes ya livianas (≈ 800 px).'));

  try {
    const { backups } = await api('GET', '/api/backups');
    const holder = back.lastChild;
    holder.replaceChildren(backups.length ? h('ul', { class: 'list-plain' }, backups.slice(0, 12).map(b => {
      const d = new Date(b.at);
      return h('li', null, isNaN(d) ? b.name : d.toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' }),
        h('button', { class: 'btn btn-sm', type: 'button', onclick: async () => {
          if (!await ask({ title: '¿Restaurar esta versión?', ok: 'Restaurar', text: ['Los datos volverán a como estaban en ese momento.', 'La versión actual también se guarda, así que puedes deshacerlo.'] })) return;
          try { setStatus('saving', 'Restaurando…'); const r = await api('POST', '/api/backups/restore', { name: b.name }); S.site = r.site; setStatus('saved', 'Versión restaurada'); toast('Versión restaurada', 'ok'); refreshGit(); renderNav(); rerender(); }
          catch (e) { setStatus('error', 'No se pudo restaurar'); toast(e.message, 'err'); }
        } }, 'Restaurar'));
    })) : h('p', { class: 'help' }, 'Todavía no hay copias: se crean al guardar por primera vez.'));
  } catch (e) { back.lastChild.replaceChildren(h('div', { class: 'note warn' }, e.message)); }

  async function loadOrph() {
    const holder = orph.lastChild;
    const { files } = await api('GET', '/api/orphans');
    if (!files.length) { holder.replaceChildren(h('div', { class: 'note ok' }, '✓ No hay imágenes sin usar.')); return; }
    const checks = new Map();
    const grid = h('div', { class: 'orph-grid' }, files.map(f => {
      const cb = h('input', { type: 'checkbox', checked: f.mine, 'aria-label': `Eliminar ${f.path.split('/').pop()}` });
      checks.set(f.path, cb);
      return h('label', { class: 'orph' }, h('img', { src: `/${f.path}`, alt: '', loading: 'lazy' }), cb,
        h('span', null, f.path.split('/').pop()), h('small', null, f.mine ? 'subida desde el editor' : 'ya estaba en el proyecto'));
    }));
    const btn = h('button', { class: 'btn btn-danger', type: 'button' });
    const sync = () => { const n = [...checks.values()].filter(c => c.checked).length; btn.textContent = n ? `Eliminar ${n} seleccionada(s)` : 'Selecciona imágenes para eliminar'; btn.disabled = !n; };
    grid.addEventListener('change', sync); sync();
    btn.addEventListener('click', async () => {
      const sel = [...checks].filter(([, c]) => c.checked).map(([p]) => p);
      const old = sel.filter(p => !files.find(f => f.path === p).mine).length;
      const bytes = files.filter(f => sel.includes(f.path)).reduce((a, f) => a + f.bytes, 0);
      if (!await ask({ title: `¿Eliminar ${sel.length} imagen(es)?`, danger: true, ok: 'Eliminar',
        text: [`Se liberarán ${(bytes / 1048576).toFixed(2)} MB. Ningún dato del sitio usa estas imágenes.`,
               old ? `Atención: ${old} ya estaba(n) en el proyecto antes del editor (puede ser material que quieras conservar). Seguirán disponibles en el historial de Git, pero revísalas antes de borrar.` : 'Todas fueron subidas desde el editor.'] })) return;
      try { const r = await api('POST', '/api/orphans/delete', { paths: sel }); toast(`${r.deleted} imagen(es) eliminada(s)`, 'ok'); refreshGit(); await loadOrph(); }
      catch (e) { toast(e.message, 'err'); }
    });
    holder.replaceChildren(
      h('div', { class: 'note', style: 'margin-bottom:.9rem' }, `${files.length} imagen(es) sin usar. Solo las subidas desde el editor vienen marcadas; las que ya estaban en el proyecto (por ejemplo, fotos de personas que aún no agregaste al equipo) se dejan sin marcar para que no pierdas material por error.`),
      grid, h('div', { style: 'margin-top:1rem' }, btn));
  }
  loadOrph().catch(e => orph.lastChild.replaceChildren(h('div', { class: 'note warn' }, e.message)));
}

/* ───────────────────────── navegación ───────────────────────── */
function renderNav() {
  const side = $('#side'); side.replaceChildren();
  let group = null;
  SECTIONS.forEach(s => {
    if (s.group !== group) { group = s.group; side.append(h('h2', { text: group })); }
    const n = s.kind ? '' : collection(s).length;
    side.append(h('button', { class: 'nav-item', type: 'button', 'data-nav': s.id, 'aria-current': s.id === S.current ? 'page' : null, onclick: () => { location.hash = `#/${s.id}`; } },
      h('span', null, s.label), h('small', { text: s.id === 'publications' && S.bib ? S.bib.length : n })));
  });
}

function rerender() { render(S.current); }
function render(id) {
  const s = sec(id) || sec('people');
  S.current = s.id;
  document.title = `${s.label} · Editor del sitio`;
  document.querySelectorAll('.nav-item').forEach(b => b.setAttribute('aria-current', b.dataset.nav === s.id ? 'page' : 'false'));
  const main = $('#main'); main.replaceChildren();
  if (s.kind === 'form') renderForm(s, main);
  else if (s.kind === 'bib') renderBib(s, main);
  else if (s.kind === 'maintenance') renderMaintenance(s, main);
  else renderList(s, main);
  renderNavCounts();
}
function renderNavCounts() {
  SECTIONS.forEach(s => { const el = $(`[data-nav="${s.id}"] small`); if (el && !s.kind) el.textContent = collection(s).length; });
}

/* ───────────────────────── publicar ───────────────────────── */
const FRIENDLY = p => p === 'data/site.json' ? 'Datos del sitio (equipo, proyectos, noticias…)'
  : p === 'js/site-data.js' ? 'Datos listos para la web (automático)'
  : p === 'data/instagram.json' ? 'Fotos de Instagram'
  : p === 'data/publications.bib' ? 'Publicaciones'
  : p.startsWith('assets/images/') ? `Imagen: ${p.split('/').slice(-1)[0]}` : p;

async function refreshGit() {
  try {
    const g = await api('GET', '/api/git');
    S.git = g;
    const n = g.available ? g.changed.length : 0;
    const c = $('#pub-count'); c.hidden = !n; c.textContent = n;
  } catch { /* no bloquea */ }
}

async function openPublish() {
  let g; try { g = await api('GET', '/api/git'); } catch (e) { return toast(e.message, 'err'); }
  S.git = g;
  if (!g.available) return ask({ title: 'No se puede publicar desde aquí', info: true, text: ['Esta carpeta no es un repositorio de Git, así que el editor no sabe cómo subir los cambios.', 'Puedes publicar con tu herramienta habitual (GitHub Desktop, terminal…).'] });
  const body = h('div', null);
  const msg = h('input', { type: 'text', value: `Actualizar contenido del sitio (${new Date().toLocaleDateString('es-CL')})`, maxlength: 200 });
  const out = h('div', null);
  const go = h('button', { class: 'btn btn-primary', type: 'button' }, 'Publicar ahora');
  const dlg = modal({ title: 'Publicar en la web', body: [body, out], foot: [h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Cerrar'), go] });
  if (!g.changed.length) { body.append(h('div', { class: 'note ok' }, '✓ No hay cambios pendientes: la web ya está al día.')); go.hidden = true; return; }
  const states = { nuevo: 'Nuevo', modificado: 'Modificado', eliminado: 'Eliminado' };
  body.append(
    h('p', { style: 'margin-top:0' }, `Se van a publicar ${g.changed.length} cambio(s) en la rama "${g.branch}"${g.remote ? '' : ' (sin repositorio remoto configurado)'}:`),
    h('ul', { class: 'list-plain', style: 'max-height:14rem;overflow:auto;margin-bottom:1rem' }, g.changed.map(c => h('li', null, h('span', { class: 'chg' }, h('b', null, states[c.state] || c.state), FRIENDLY(c.path))))),
    h('div', { class: 'field' }, h('label', { for: 'pm' }, 'Descripción del cambio'), Object.assign(msg, { id: 'pm' }), h('div', { class: 'help' }, 'Queda registrada en el historial del proyecto.')),
    h('p', { class: 'help', style: 'margin-bottom:0' }, 'Solo se publican datos e imágenes; el código del sitio no se toca. GitHub tarda 1–2 minutos en actualizar la página.'));
  go.addEventListener('click', async () => {
    go.disabled = true; go.replaceChildren(h('span', { class: 'spinner' }), ' Publicando…'); out.replaceChildren();
    try {
      const r = await api('POST', '/api/git/publish', { message: msg.value });
      out.append(h('ul', { class: 'steps' }, r.steps.map(s => h('li', null, `${s.ok ? '✓' : '✗'} ${s.label}`, s.out && !s.ok ? h('pre', null, s.out) : null))));
      if (r.ok) {
        out.prepend(h('div', { class: 'note ok', style: 'margin-top:1rem' }, r.nothing ? 'No había nada nuevo que publicar.' : '✓ Publicado. La página se actualizará en 1–2 minutos.'));
        go.hidden = true; refreshGit(); setStatus('saved', 'Publicado');
      } else {
        out.prepend(h('div', { class: 'note warn', style: 'margin-top:1rem' }, r.committed ? 'Los cambios quedaron guardados en tu computador, pero no se pudieron subir a GitHub. Revisa tu conexión o tus credenciales de Git e inténtalo de nuevo.' : 'No se pudo publicar. Revisa el detalle abajo.'));
        go.disabled = false; go.textContent = 'Reintentar';
      }
    } catch (e) { out.replaceChildren(h('div', { class: 'note warn', style: 'margin-top:1rem' }, e.message)); go.disabled = false; go.textContent = 'Reintentar'; }
  });
}

/* ───────────────────────── arranque ───────────────────────── */
async function boot() {
  try {
    const st = await api('GET', '/api/state');
    S.site = st.site; S.insta = st.instagram; S.canResize = st.canResize; S.root = st.root;
  } catch (e) {
    setStatus('error', 'Sin conexión');
    $('#main').replaceChildren(h('div', { class: 'note warn' }, `${e.message} Si cerraste la ventana de terminal, vuelve a abrir el editor.`));
    return;
  }
  setStatus('saved', 'Todo guardado');
  renderNav();
  const route = () => render((location.hash.match(/^#\/(\w+)/) || [])[1] || 'people');
  window.addEventListener('hashchange', () => { route(); $('#main').focus(); window.scrollTo(0, 0); });
  $('#btn-publish').addEventListener('click', openPublish);
  route();
  refreshGit();
}
boot();
