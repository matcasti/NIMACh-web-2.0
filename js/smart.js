/**
 * NIM-ACh — Smart helpers
 *
 * Utilidades compartidas para que el sitio se adapte al dispositivo y al
 * contexto del visitante. Se carga ANTES que el resto de los scripts.
 *
 *   NIMSmart.reducedMotion()              → ¿el usuario pidió menos movimiento?
 *   NIMSmart.lowPower                     → ahorro de datos, poca RAM o pocos núcleos
 *   NIMSmart.scale(n)                     → reduce cantidades (partículas…) según pantalla/equipo
 *   NIMSmart.whenVisible(el, start, stop) → corre animaciones solo si el elemento se ve
 *                                           y la pestaña está activa
 *   NIMSmart.lazyInit(el, fn)             → ejecuta fn() recién cuando el elemento se acerca
 *   NIMSmart.loadScript(src)              → carga un script externo una sola vez
 */
(function () {
  'use strict';

  const mm = q => (window.matchMedia ? window.matchMedia(q) : { matches: false });
  const reduced = mm('(prefers-reduced-motion: reduce)');

  const conn = navigator.connection || {};
  const lowPower = !!(
    conn.saveData ||
    /(^|-)2g$/.test(conn.effectiveType || '') ||
    (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)
  );

  /** Reduce una cantidad según ancho de pantalla y capacidad del equipo. */
  function scale(n, { min = 12 } = {}) {
    let f = 1;
    const w = window.innerWidth;
    if (w < 480)      f = 0.4;
    else if (w < 768) f = 0.6;
    else if (w < 1100) f = 0.8;
    if (lowPower) f *= 0.6;
    return Math.max(min, Math.round(n * f));
  }

  /**
   * start()/stop() según visibilidad del elemento y de la pestaña.
   * Con movimiento reducido llama a opts.once() (un solo cuadro estático).
   */
  function whenVisible(el, start, stop, opts = {}) {
    if (!el) return;
    const { rootMargin = '120px', once } = opts;
    let inView = false;
    let running = false;

    const sync = () => {
      if (reduced.matches && once) {
        if (running) { stop(); running = false; }
        if (inView) once();
        return;
      }
      const shouldRun = inView && !document.hidden;
      if (shouldRun && !running) { running = true; start(); }
      else if (!shouldRun && running) { running = false; stop(); }
    };

    if (!('IntersectionObserver' in window)) { inView = true; sync(); return; }

    new IntersectionObserver(entries => {
      inView = entries[entries.length - 1].isIntersecting;
      sync();
    }, { rootMargin }).observe(el);

    document.addEventListener('visibilitychange', sync);
    if (reduced.addEventListener) reduced.addEventListener('change', sync);
  }

  /** Ejecuta fn() una sola vez, cuando el elemento está a `rootMargin` de la pantalla. */
  function lazyInit(el, fn, rootMargin = '500px') {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { rootMargin });
    io.observe(el);
  }

  const _scripts = {};
  function loadScript(src) {
    if (_scripts[src]) return _scripts[src];
    return (_scripts[src] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = res; s.onerror = () => { delete _scripts[src]; rej(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    }));
  }

  /** Debounce con rAF-friendly por defecto. */
  function debounce(fn, ms = 150) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  /* ── Paleta del tema (para canvas): lee los tokens CSS y avisa cuando cambia el modo ── */
  const readPalette = () => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n, d) => (cs.getPropertyValue(n) || '').trim() || d;
    return { ink: v('--ink-rgb', '15,23,32'), accent: v('--accent-rgb', '38,84,132'), bg: v('--bg-rgb', '247,248,250') };
  };
  let _pal = readPalette();
  const _themeCbs = new Set();
  const palette = () => _pal;
  const onTheme = cb => { _themeCbs.add(cb); return () => _themeCbs.delete(cb); };
  new MutationObserver(() => { _pal = readPalette(); _themeCbs.forEach(f => f(_pal)); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  window.NIMSmart = {
    palette, onTheme,
    reducedMotion: () => reduced.matches,
    lowPower, scale, whenVisible, lazyInit, loadScript, debounce,
  };
})();
