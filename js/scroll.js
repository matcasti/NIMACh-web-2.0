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
    const collabCount= (D.globePoints  || []).filter(p => !p.home).length
                    || (D.collaborators|| []).length;
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
    this._loop();
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
    this.animId = requestAnimationFrame(() => this._loop());
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

  /* Grid de papel ECG que scrollea sincronizado con la traza */
  _drawGrid() {
    const { ctx, W, H, PPB, offset } = this;

    // Cuadrado grande: PPB/5 px (equivale a 0.2s a velocidad estándar)
    const big   = PPB / 5;
    const small = big  / 5;

    // Líneas pequeñas
    ctx.strokeStyle = 'rgba(232,112,64,0.042)';
    ctx.lineWidth   = 0.3;
    ctx.setLineDash([]);
    const oS = offset % small;
    for (let x = W - oS; x > 0; x -= small) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = small; y < H; y += small) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Líneas grandes
    ctx.strokeStyle = 'rgba(232,112,64,0.088)';
    ctx.lineWidth   = 0.5;
    const oB = offset % big;
    for (let x = W - oB; x > 0; x -= big) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = big; y < H; y += big) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  /* Traza ECG con efecto fósforo: 3 passes de glow + core */
  _drawTrace() {
    const { ctx, W, H, PPB, offset } = this;

    // Línea base al 62% de la altura → espacio para R wave hacia arriba
    const baseline = H * 0.62;
    // Escala: R wave (amp=1.0) ocupa el 80% de la altura disponible sobre baseline
    const scale    = baseline * 0.88;

    // Gradiente de fósforo: izquierda transparente → derecha coral brillante
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0.00, 'rgba(232,112,64,0.00)');
    grad.addColorStop(0.18, 'rgba(232,112,64,0.10)');
    grad.addColorStop(0.48, 'rgba(232,112,64,0.50)');
    grad.addColorStop(0.78, 'rgba(232,112,64,0.88)');
    grad.addColorStop(1.00, 'rgba(232,112,64,1.00)');

    // Construye el path una vez y lo reutiliza (3 passes = 3 × 1 build)
    const buildPath = () => {
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const phase = ((offset + x) / PPB) % 1;
        const py    = baseline - this._sample(phase) * scale;
        x === 0 ? ctx.moveTo(0, py) : ctx.lineTo(x, py);
      }
    };

    ctx.lineCap   = 'round';
    ctx.lineJoin  = 'round';

    // Pass 1 — halo exterior ancho (bloom suave)
    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 7;
    ctx.globalAlpha = 0.13;
    ctx.shadowColor = 'rgba(232,112,64,0.55)';
    ctx.shadowBlur  = 18;
    buildPath(); ctx.stroke();
    ctx.restore();

    // Pass 2 — glow intermedio
    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 3;
    ctx.globalAlpha = 0.50;
    ctx.shadowColor = 'rgba(255,155,70,0.75)';
    ctx.shadowBlur  = 7;
    buildPath(); ctx.stroke();
    ctx.restore();

    // Pass 3 — línea core nítida y brillante
    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 1.0;
    ctx.shadowColor = 'rgba(255,200,140,0.55)';
    ctx.shadowBlur  = 3;
    buildPath(); ctx.stroke();
    ctx.restore();
  }

  /* Cursor luminoso en el extremo derecho (frente de avance) */
  _drawCursor() {
    const { ctx, W, H, PPB, offset } = this;
    const baseline = H * 0.62;
    const scale    = baseline * 0.88;
    const phase    = ((offset + W) / PPB) % 1;
    const py       = baseline - this._sample(phase) * scale;

    // Anillo de pulso exterior
    ctx.save();
    ctx.strokeStyle = 'rgba(255,200,140,0.40)';
    ctx.lineWidth   = 1;
    ctx.shadowColor = 'rgba(255,150,70,0.9)';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(W, py, 5.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Punto core blanco-cálido
    ctx.save();
    ctx.fillStyle   = '#fff8f0';
    ctx.shadowColor = 'rgba(255,130,50,1.0)';
    ctx.shadowBlur  = 18;
    ctx.beginPath();
    ctx.arc(W, py, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}

/* ── Nav scroll behavior ── */
class NavScroll {
  constructor() {
    this.nav = document.querySelector('.nav');
    if (!this.nav) return;
    window.addEventListener('scroll', () => this.update(), { passive: true });
  }

  update() {
    this.nav.classList.toggle('scrolled', window.scrollY > 60);
  }
}

/* ── Mobile nav toggle ── */
class MobileNav {
  constructor() {
    this.btn   = document.querySelector('.nav-hamburger');
    this.links = document.querySelector('.nav-links');
    if (!this.btn || !this.links) return;
    this.btn.addEventListener('click', () => this.toggle());
    document.addEventListener('click', e => {
      if (!e.target.closest('.nav')) this.close();
    });
  }

  toggle() {
    this.links.classList.toggle('open');
  }

  close() {
    this.links.classList.remove('open');
  }
}

/* ── Active nav link on scroll ── */
class ActiveSection {
  constructor() {
    this.links    = document.querySelectorAll('.nav-link[data-section]');
    this.sections = [];
    this.links.forEach(l => {
      const s = document.getElementById(l.dataset.section);
      if (s) this.sections.push({ link: l, section: s });
    });
    if (!this.sections.length) return;
    window.addEventListener('scroll', () => this.update(), { passive: true });
  }

  update() {
    const mid = window.scrollY + window.innerHeight / 2;
    this.sections.forEach(({ link, section }) => {
      const top    = section.offsetTop;
      const bottom = top + section.offsetHeight;
      link.classList.toggle('active', mid >= top && mid < bottom);
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
