/**
 * NIM-ACh — Scroll Reveal & Observers
 * IntersectionObserver-based animations for
 * scroll-reveal, stat rings, progress bars, ECG.
 */

class ScrollReveal {
  constructor() {
    this.observer = new IntersectionObserver(
      entries => this.onIntersect(entries),
      { threshold: .08, rootMargin: '0px 0px -24px 0px' }
    );
    this.init();
  }

  init() {
    window._scrollRevealObserver = this.observer; // exponer para módulos dinámicos
    document.querySelectorAll('.reveal').forEach(el => {
      this.observer.observe(el);
    });
  }

  onIntersect(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        this.observer.unobserve(entry.target);
      }
    });
  }
}

/* ── Stat ring + counter ── */
class StatAnimator {
  constructor() {
    this.triggered = false;
    window._nimachStatAnimator = this; // exponer para re-run desde publications.js
    const target = document.querySelector('.hero-stats');
    if (!target) return;

    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !this.triggered) {
        this.triggered = true;
        this.run();
        obs.disconnect();
      }
    }, { threshold: .3 });

    obs.observe(target);
    // Also run on load if visible
    setTimeout(() => {
      if (!this.triggered) { this.triggered = true; this.run(); }
    }, 600);
  }

  run() {
    const CIRC = 113; // 2π × r(18) ≈ 113
    const D    = window.NIMACH_DATA || {};

    // Valores derivados de los datos reales
    const pubCount   = (D.publications || []).length;
    const peopleCount= (D.people       || []).filter(p => p.active !== false).length;
    const collabCount= (D.collabCountries || []).length;   // única fuente (data.js)
    const years      = (() => {
      const pubs = D.publications || [];
      if (!pubs.length) return 8;
      const minY = Math.min(...pubs.map(p => p.year));
      return new Date().getFullYear() - minY + 1;
    })();

    // Porcentajes de los anillos escalados a 100%
    const maxPubs = Math.max(pubCount, 1);
    const stats = [
      { ring:'ring1', cnt:'cnt1', target: pubCount,    suffix:'+', pct: Math.min(Math.round(pubCount / 20 * 100), 95) },
      { ring:'ring2', cnt:'cnt2', target: peopleCount, suffix:'',  pct: Math.min(Math.round(peopleCount / 10 * 100), 90) },
      { ring:'ring3', cnt:'cnt3', target: collabCount, suffix:'',  pct: Math.min(Math.round(collabCount / 8 * 100), 85) },
      { ring:'ring4', cnt:'cnt4', target: years,       suffix:'',  pct: Math.min(Math.round(years / 10 * 100), 88) },
    ];

    stats.forEach(({ ring, cnt, target, suffix, pct }) => {
      const ringEl = document.getElementById(ring);
      const cntEl  = document.getElementById(cnt);
      if (ringEl) ringEl.style.strokeDashoffset = CIRC - (CIRC * pct / 100);

      if (!cntEl) return;
      const start = performance.now();
      const dur   = 1300;
      const step  = ts => {
        const p = Math.min((ts - start) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
        cntEl.textContent = Math.round(ease * target) + (p >= 1 ? suffix : '');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
}

/* ── Project progress bars ── */
class ProgressBars {
  constructor() {
    const grid = document.querySelector('.projects-grid');
    if (!grid) return;

    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        document.querySelectorAll('.progress-fill').forEach(el => {
          el.style.width = el.dataset.width + '%';
        });
        obs.disconnect();
      }
    }, { threshold: .25 });

    obs.observe(grid);
  }
}

/**
 * ECGRenderer — Osciloscopio de fósforo con ECG realista Lead II
 *
 * Modelo fisiológico: suma de Gaussianas calibradas para Lead II
 *   P wave    (depolarización auricular)     — onda pequeña positiva
 *   Q         (deflexión septal)             — pequeña negativa
 *   R wave    (depolarización ventricular)   — pico dominante
 *   S         (depolarización basal)         — negativa post-R
 *   T wave    (repolarización ventricular)   — onda positiva amplia
 *   U wave    (repolarización de Purkinje)   — muy sutil
 *
 * Efecto visual:
 *   · Traza scrollante de izquierda a derecha (estilo monitor UCI)
 *   · Gradiente de fósforo: transparente en extremo izquierdo → coral brillante en el frente
 *   · 3 passes: halo ancho, medio glow, línea core nítida
 *   · Grid de papel ECG que scrollea sincronizado con la traza
 *   · Cursor brillante en el punto de avance
 *   · HRV sutil: ligera variación del intervalo RR entre latidos
 */
class ECGRenderer {
  constructor(canvasId) {
    this.canvas   = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx      = this.canvas.getContext('2d');
    this.offset   = 0;          // desplazamiento acumulado en píxeles
    this.animId   = null;
    this.frame    = 0;

    // ── Parámetros fisiológicos ──
    this.BPM      = 68;         // frecuencia cardíaca en reposo
    this.HRV      = 0.038;      // variabilidad RR: ±3.8%
    this.beatVar  = 1.0;        // multiplicador actual del período
    this.nextBeat = 0;          // offset en el que cambia el beatVar

    // ── LUT: precomputa un ciclo completo con 2000 muestras ──
    this.LUT_N    = 2000;
    this.lut      = this._buildLUT();

    this._resize();
    window.addEventListener('resize', () => this._resize());

    // Solo anima cuando el hero está en pantalla (ahorra batería y CPU)
    this.running = false;
    NIMSmart.onTheme(() => { if (!this.running) this._draw(); });
    if (window.NIMSmart) {
      NIMSmart.whenVisible(this.canvas,
        () => this._start(), () => this._stop(),
        { once: () => { this.running = false; this._loop(); } });
    } else { this._start(); }
  }

  _start() {
    if (this.running) return;
    this.running = true;
    cancelAnimationFrame(this.animId);
    this._loop();
  }

  _stop() {
    this.running = false;
    cancelAnimationFrame(this.animId);
  }

  /* ─── Modelo sum-of-Gaussians Lead II ─────────────────────────── */

  _buildLUT() {
    const a = new Float32Array(this.LUT_N);
    for (let i = 0; i < this.LUT_N; i++) a[i] = this._ecgAt(i / this.LUT_N);
    return a;
  }

  _ecgAt(t) {
    // t ∈ [0, 1]: un intervalo RR completo (isoelectrico → P → QRS → T → U → isoelectrico)
    const g = (amp, mu, sig) =>
      amp * Math.exp(-((t - mu) * (t - mu)) / (2 * sig * sig));

    return (
      g( 0.18,  0.100, 0.027) +   // P  — onda de activación auricular
      g(-0.07,  0.225, 0.009) +   // Q  — deflexión septal
      g( 1.00,  0.255, 0.013) +   // R  — vector ventricular izquierdo (dominante en D-II)
      g(-0.18,  0.295, 0.011) +   // S  — activación basal ventricular derecha
      g( 0.30,  0.432, 0.055) +   // T  — repolarización ventricular (upstroke)
      g(-0.04,  0.478, 0.025) +   // T  — corrección downslope (asimetría fisiológica)
      g( 0.028, 0.565, 0.028)     // U  — repolarización de fibras de Purkinje
    );
  }

  _sample(phase) {
    // Interpolación lineal en la LUT
    const p  = ((phase % 1) + 1) % 1;   // [0, 1] garantizado
    const fp = p * this.LUT_N;
    const i0 = fp | 0;                   // floor rápido con bitwise OR
    const i1 = (i0 + 1) % this.LUT_N;
    return this.lut[i0] + (fp - i0) * (this.lut[i1] - this.lut[i0]);
  }

  /* ─── Setup y resize ───────────────────────────────────────────── */

  _resize() {
    const el  = this.canvas;
    const W   = el.offsetWidth  || 900;
    const H   = el.offsetHeight || 96;
    const dpr = Math.min(devicePixelRatio || 1, 2);

    el.width  = W * dpr;
    el.height = H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.W = W;
    this.H = H;

    // Mostrar 3.2 latidos completos a lo ancho del canvas
    // → pixeles por latido = W / 3.2
    // → velocidad = PPB / (duración_en_frames del latido)
    const BEATS_VIS  = 3.2;
    const BEAT_SECS  = 60 / this.BPM;       // s por latido a 68bpm = 0.882s
    this.PPB         = W / BEATS_VIS;        // píxeles por latido
    this.SPEED       = this.PPB / (BEAT_SECS * 60); // px/frame a 60fps

    this.nextBeat    = this.offset + this.PPB;
  }

  /* ─── Loop principal ────────────────────────────────────────────── */

  _loop() {
    if (this.running) this.animId = requestAnimationFrame(() => this._loop());
    this.frame++;

    // Avanza offset (velocidad modulada por HRV)
    this.offset += this.SPEED * this.beatVar;

    // Al cruzar el umbral del siguiente latido, sortear nuevo HRV
    if (this.offset >= this.nextBeat) {
      this.beatVar  = 1 + (Math.random() - 0.5) * this.HRV * 2;
      this.nextBeat = this.offset + this.PPB * this.beatVar;
    }

    this._draw();
  }

  /* ─── Render ────────────────────────────────────────────────────── */

  _draw() {
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);
    this._drawGrid();
    this._drawTrace();
    this._drawCursor();
  }

  /* Cuadrícula finísima que scrollea sincronizada con la traza */
  _drawGrid() {
    const { ctx, W, H, PPB, offset } = this;
    const P = NIMSmart.palette();
    const big = PPB / 5;

    ctx.strokeStyle = `rgba(${P.ink}, 0.07)`;
    ctx.lineWidth   = 0.5;
    ctx.setLineDash([]);
    const oB = offset % big;
    for (let x = W - oB; x > 0; x -= big) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = big; y < H; y += big) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  /* Traza limpia: una sola línea que se desvanece hacia la izquierda */
  _drawTrace() {
    const { ctx, W, H, PPB, offset } = this;
    const P = NIMSmart.palette();

    const baseline = H * 0.62;
    const scale    = baseline * 0.88;

    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0.00, `rgba(${P.accent}, 0)`);
    grad.addColorStop(0.30, `rgba(${P.accent}, 0.18)`);
    grad.addColorStop(0.75, `rgba(${P.accent}, 0.65)`);
    grad.addColorStop(1.00, `rgba(${P.accent}, 0.95)`);

    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 1.4;
    ctx.beginPath();
    for (let x = 0; x <= W; x++) {
      const phase = ((offset + x) / PPB) % 1;
      const py    = baseline - this._sample(phase) * scale;
      x === 0 ? ctx.moveTo(0, py) : ctx.lineTo(x, py);
    }
    ctx.stroke();
  }

  /* Punto en el extremo de avance */
  _drawCursor() {
    const { ctx, W, H, PPB, offset } = this;
    const P = NIMSmart.palette();
    const baseline = H * 0.62;
    const scale    = baseline * 0.88;
    const phase    = ((offset + W) / PPB) % 1;
    const py       = baseline - this._sample(phase) * scale;

    ctx.strokeStyle = `rgba(${P.accent}, 0.35)`;
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.arc(W - 3, py, 6, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = `rgb(${P.accent})`;
    ctx.beginPath(); ctx.arc(W - 3, py, 2.6, 0, Math.PI * 2); ctx.fill();
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}

/* ── Nav: estado "scrolled" + smart hide (baja → se oculta · sube → reaparece) ── */
class NavScroll {
  constructor() {
    this.nav = document.querySelector('.nav');
    if (!this.nav) return;
    this.lastY = window.scrollY;
    this.ticking = false;
    window.addEventListener('scroll', () => {
      if (this.ticking) return;
      this.ticking = true;
      requestAnimationFrame(() => { this.update(); this.ticking = false; });
    }, { passive: true });
    this.update();
  }

  update() {
    const y = window.scrollY;
    const dy = y - this.lastY;
    this.nav.classList.toggle('scrolled', y > 24);

    const pinned = this.nav.classList.contains('nav--open') ||
                   this.nav.contains(document.activeElement);
    if (y < 120 || pinned || dy < -4)      this.nav.classList.remove('nav--hidden');
    else if (dy > 8 && y > 240)            this.nav.classList.add('nav--hidden');

    if (Math.abs(dy) > 4) this.lastY = y;
  }
}

/* ── Menú móvil: accesible, cierra con Esc / enlace / clic fuera / al agrandar ── */
class MobileNav {
  constructor() {
    this.nav   = document.querySelector('.nav');
    this.btn   = document.querySelector('.nav-hamburger');
    this.links = document.querySelector('.nav-links');
    if (!this.nav || !this.btn || !this.links) return;

    this.btn.addEventListener('click', () => this.toggle());
    this.links.addEventListener('click', e => { if (e.target.closest('a')) this.close(); });
    document.addEventListener('click', e => { if (!e.target.closest('.nav')) this.close(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isOpen()) { this.close(); this.btn.focus(); }
    });
    window.matchMedia('(min-width: 1080px)').addEventListener('change', e => { if (e.matches) this.close(); });
  }

  isOpen() { return this.links.classList.contains('open'); }

  toggle() { this.isOpen() ? this.close() : this.open(); }

  open() {
    this.links.classList.add('open');
    this.nav.classList.add('nav--open');
    this.btn.setAttribute('aria-expanded', 'true');
    this.btn.setAttribute('aria-label', 'Cerrar menú');
  }

  close() {
    this.links.classList.remove('open');
    this.nav.classList.remove('nav--open');
    this.btn.setAttribute('aria-expanded', 'false');
    this.btn.setAttribute('aria-label', 'Abrir menú');
  }
}

/* ── Enlace activo según la sección que cruza el centro de la pantalla ── */
class ActiveSection {
  constructor() {
    const links = [...document.querySelectorAll('.nav-link[data-section]')];
    this.map = new Map();
    links.forEach(l => {
      const s = document.getElementById(l.dataset.section);
      if (s) this.map.set(s, l);
    });
    if (!this.map.size || !('IntersectionObserver' in window)) return;

    // banda delgada en el centro del viewport: la sección que la cruza es la activa
    this.io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) this.set(this.map.get(en.target));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    this.map.forEach((_, s) => this.io.observe(s));

    // arriba del todo (hero) no hay sección activa
    const hero = document.getElementById('hero');
    if (hero) new IntersectionObserver(([e]) => { if (e.isIntersecting) this.set(null); },
      { rootMargin: '-45% 0px -50% 0px' }).observe(hero);
  }

  set(link) {
    this.map.forEach(l => {
      const on = l === link;
      l.classList.toggle('active', on);
      if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
    });
  }
}

// Init all on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  new ScrollReveal();
  new StatAnimator();
  new ProgressBars();
  new ECGRenderer('hero-ecg-canvas');
  new NavScroll();
  new MobileNav();
  new ActiveSection();
});
