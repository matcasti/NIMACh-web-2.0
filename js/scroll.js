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

/* ── ECG loop animation ── */
class ECGAnimation {
  constructor(pathId) {
    this.path = document.getElementById(pathId);
    if (!this.path) return;
    this.run();
  }

  run() {
    const p = this.path;
    p.style.transition = 'none';
    p.style.strokeDashoffset = '1400';

    requestAnimationFrame(() => requestAnimationFrame(() => {
      p.style.transition = 'stroke-dashoffset 2.1s cubic-bezier(.4,0,.2,1)';
      p.style.strokeDashoffset = '0';
      setTimeout(() => setTimeout(() => this.run(), 1800), 2150);
    }));
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
  new ECGAnimation('ecg-path');
  new NavScroll();
  new MobileNav();
  new ActiveSection();
});
