/**
 * NIM-ACh — NIMUI
 * Interacciones compartidas por la home y las páginas interiores:
 *   · Lightbox de galería (flechas, teclado, gestos táctiles, foco atrapado)
 *   · Toasts y copiado al portapapeles (con retroalimentación en el propio botón)
 *   · Destinos de enlaces internos: scroll + resaltado (#proyecto, #persona…)
 *
 * Se carga antes que pages.js / main.js. Sin dependencias.
 */
(function () {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const reduceMotion = () => window.NIMSmart ? NIMSmart.reducedMotion()
    : window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Escapa texto para meterlo en atributos / HTML de plantillas */
  const esc = s => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** ¿Es una URL "de verdad" (no un marcador '#')? */
  const isReal = u => typeof u === 'string' && u.trim() !== '' && u.trim() !== '#';


  /* ───────────────────────── Iconos (línea, monotono) ─────────────────────────
     Reemplazan a los emojis de colores. Heredan `currentColor`.               */
  const ICONS = {
    'activity':    '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    'mountain':    '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
    'leaf':        '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    'heart-pulse': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
    'bar-chart':   '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    'target':      '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'file-text':   '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    'globe':       '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    'map-pin':     '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    'landmark':    '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7"/><path d="M12 2 20 7H4z"/>',
    'users':       '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    'scale':       '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    'wrench':      '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    'flask':       '<path d="M10 2v7.31M14 9.3V1.99M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0M5.52 16h12.96"/>',
    'moon':        '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    'sun':         '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    'refresh':     '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M3 21v-5h5"/>',
    'zap':         '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    'circle-dot':  '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>',
    'network':     '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 7.2v4.3M12 11.5l-6 5.5M12 11.5l6 5.5"/>',
    'instagram':   '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7" fill="currentColor"/>',
    'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  };

  /** SVG de un icono por nombre. Si no existe, devuelve el texto tal cual (p. ej. un emoji). */
  function icon(name, size = 20) {
    const p = ICONS[name];
    if (!p) return name || '';
    return `<svg class="ico-svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
  }

  /** Rellena <span data-icon="nombre" data-size="20"> con su SVG */
  function hydrateIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(el => {
      if (el.dataset.done) return;
      el.innerHTML = icon(el.dataset.icon, +el.dataset.size || 20);
      el.dataset.done = '1';
    });
  }
  document.addEventListener('DOMContentLoaded', () => hydrateIcons());

  /* ───────────────────────── Toasts ───────────────────────── */
  function toast(msg, type = 'info', duration = 3200) {
    let wrap = $('#toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toast-wrap';
      wrap.className = 'toast-wrap';
      wrap.setAttribute('role', 'status');
      wrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => {
      t.classList.add('is-leaving');
      setTimeout(() => t.remove(), 300);
    }, duration);
  }

  /* ───────────────────── Copiar al portapapeles ───────────────────── */
  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* cae al método clásico */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-100px;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  /** Cambia el texto de un botón un momento (✓ Copiado) y lo restaura */
  function flash(btn, text, ms = 1600) {
    if (!btn) return;
    if (!btn.dataset.label) btn.dataset.label = btn.innerHTML;
    btn.innerHTML = text;
    btn.classList.add('is-done');
    clearTimeout(btn._flashT);
    btn._flashT = setTimeout(() => {
      btn.innerHTML = btn.dataset.label;
      btn.classList.remove('is-done');
    }, ms);
  }

  // Botones [data-copy] en cualquier parte (DOI, citas…)
  document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    e.preventDefault();
    const ok = await copy(btn.dataset.copy);
    flash(btn, ok ? '✓ Copiado' : '✗ No se pudo');
    toast(ok ? (btn.dataset.copyMsg || 'Copiado al portapapeles') : 'No se pudo copiar', ok ? 'success' : 'error');
  });

  /* ───────────────────── Destinos de enlaces (#id) ───────────────────── */
  let targetTimer;
  function focusTarget(el) {
    if (!el) return;
    document.querySelectorAll('.is-target').forEach(n => n.classList.remove('is-target'));
    el.scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
    el.classList.add('is-target');
    clearTimeout(targetTimer);
    targetTimer = setTimeout(() => el.classList.remove('is-target'), 3200);
  }

  /** Lleva al elemento indicado en la URL (#id). Llamar tras renderizar contenido dinámico. */
  function handleHash() {
    const id = decodeURIComponent((location.hash || '').slice(1));
    if (!id) return false;
    const el = document.getElementById(id);
    if (!el) return false;
    focusTarget(el);
    return true;
  }
  window.addEventListener('hashchange', handleHash);

  /* ───────────────────────── Lightbox ───────────────────────── */
  const Lightbox = {
    el: null, items: [], i: 0, trigger: null, startX: null,

    build() {
      if (this.el) return;
      const el = document.createElement('div');
      el.className = 'lb';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-label', 'Visor de imágenes');
      el.hidden = true;
      el.innerHTML = `
        <div class="lb-backdrop" data-lb="close"></div>
        <figure class="lb-figure">
          <div class="lb-stage" data-lb="close"></div>
          <figcaption class="lb-caption">
            <strong class="lb-title"></strong>
            <span class="lb-sub"></span>
            <p class="lb-text" hidden></p>
            <a class="lb-link mini-btn" target="_blank" rel="noopener" hidden></a>
          </figcaption>
        </figure>
        <button type="button" class="lb-btn lb-close" data-lb="close" aria-label="Cerrar">✕</button>
        <button type="button" class="lb-btn lb-prev"  data-lb="prev"  aria-label="Anterior">‹</button>
        <button type="button" class="lb-btn lb-next"  data-lb="next"  aria-label="Siguiente">›</button>
        <div class="lb-count" aria-live="polite"></div>`;
      document.body.appendChild(el);
      this.el = el;

      el.addEventListener('click', e => {
        const a = e.target.closest('[data-lb]')?.dataset.lb;
        if (a === 'close') this.close();
        else if (a === 'prev') this.go(-1);
        else if (a === 'next') this.go(1);
      });

      document.addEventListener('keydown', e => {
        if (el.hidden) return;
        if (e.key === 'Escape')      { e.preventDefault(); this.close(); }
        else if (e.key === 'ArrowLeft')  this.go(-1);
        else if (e.key === 'ArrowRight') this.go(1);
        else if (e.key === 'Tab') this.trap(e);
      });

      // Gestos táctiles: deslizar para cambiar
      el.addEventListener('touchstart', e => { this.startX = e.touches[0].clientX; }, { passive: true });
      el.addEventListener('touchend', e => {
        if (this.startX == null) return;
        const dx = e.changedTouches[0].clientX - this.startX;
        this.startX = null;
        if (Math.abs(dx) > 50) this.go(dx < 0 ? 1 : -1);
      }, { passive: true });
    },

    trap(e) {
      const f = [...this.el.querySelectorAll('button:not([hidden]), a[href]:not([hidden])')];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    },

    open(items, index = 0, trigger = null) {
      if (!items.length) return;
      this.build();
      this.items = items;
      this.trigger = trigger;
      this.el.hidden = false;
      document.documentElement.classList.add('lb-open');
      requestAnimationFrame(() => this.el.classList.add('is-open'));
      this.show(index, true);
      $('.lb-close', this.el).focus({ preventScroll: true });
    },

    close() {
      if (!this.el || this.el.hidden) return;
      this.el.classList.remove('is-open');
      document.documentElement.classList.remove('lb-open');
      const done = () => { this.el.hidden = true; };
      reduceMotion() ? done() : setTimeout(done, 200);
      if (this.trigger && this.trigger.focus) this.trigger.focus({ preventScroll: true });
    },

    go(d) {
      this.show((this.i + d + this.items.length) % this.items.length);
    },

    show(i, instant = false) {
      this.i = i;
      const it = this.items[i];
      const stage = $('.lb-stage', this.el);

      stage.classList.remove('is-in');
      stage.className = 'lb-stage' + (it.bg ? ' ' + it.bg : '');
      stage.innerHTML = it.src
        ? `<img src="${esc(it.src)}" alt="${esc(it.alt || it.title)}" class="lb-img" draggable="false">`
        : `<div class="lb-art">${it.svg || ''}</div>`;
      requestAnimationFrame(() => stage.classList.add('is-in'));

      $('.lb-title', this.el).textContent = it.title || '';
      $('.lb-sub', this.el).textContent   = it.sub || '';

      // Texto completo del pie de foto (si es más largo que el título) y enlace al post original
      const txt = $('.lb-text', this.el), lnk = $('.lb-link', this.el);
      const longer = it.caption && it.caption.replace(/…$/, '') !== (it.title || '').replace(/…$/, '') && it.caption.length > (it.title || '').length + 3;
      txt.textContent = longer ? it.caption : '';
      txt.hidden = !longer;
      if (it.link) { lnk.href = it.link; lnk.textContent = 'Ver en Instagram'; lnk.hidden = false; }
      else lnk.hidden = true;

      const many = this.items.length > 1;
      $('.lb-prev', this.el).hidden = !many;
      $('.lb-next', this.el).hidden = !many;
      $('.lb-count', this.el).textContent = many ? `${i + 1} / ${this.items.length}` : '';

      // Precarga de las vecinas
      if (many) [i - 1, i + 1].forEach(n => {
        const nb = this.items[(n + this.items.length) % this.items.length];
        if (nb && nb.src) { const im = new Image(); im.src = nb.src; }
      });
    },
  };

  /** Lee los datos de una tesela .gallery-item del DOM */
  function readItem(node) {
    const inner = node.querySelector('.gallery-item-inner');
    const img   = inner && inner.querySelector('img');
    const bg    = inner ? [...inner.classList].find(c => /^gi-/.test(c)) : '';
    const svg   = inner && inner.querySelector('.gallery-svg');
    return {
      src:   img ? img.currentSrc || img.src : null,
      alt:   img ? img.alt : '',
      bg,
      svg:   svg ? svg.innerHTML : '',
      title: node.querySelector('.gallery-label-title')?.textContent || '',
      sub:   node.querySelector('.gallery-label-sub')?.textContent || '',
      caption: node.dataset.caption || '',
      link:    node.dataset.permalink || '',
    };
  }

  function openFromTile(tile) {
    const grid  = tile.closest('.gallery-grid');
    const tiles = grid ? [...grid.querySelectorAll('.gallery-item')] : [tile];
    Lightbox.open(tiles.map(readItem), tiles.indexOf(tile), tile);
  }

  // Delegación global: sirve aunque las teselas se creen después
  document.addEventListener('click', e => {
    const tile = e.target.closest('.gallery-item');
    if (tile) openFromTile(tile);
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const tile = e.target.closest && e.target.closest('.gallery-item');
    if (tile && e.target === tile) { e.preventDefault(); openFromTile(tile); }
  });

  window.NIMUI = { esc, isReal, icon, hydrateIcons, toast, copy, flash, focusTarget, handleHash, Lightbox };
  window.showToast = toast;                    // compatibilidad con código anterior
})();
