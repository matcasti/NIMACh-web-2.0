/**
 * NIM-ACh — Main Entry Point
 * Initializes all modules and handles page-level utilities.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── Canvas animations ──
  new NeuralCanvas('hero-canvas', 'hero');
  new ParticleField('dei-canvas');

  // ── Publications filter ──
  initPubFilter();

  // ── Gallery lightbox ──
  initGalleryLightbox();

  // ── Smooth anchor scroll ──
  initAnchorScroll();

  // ── Contact form ──
  initContactForm();

  // ── Copy DOI on click ──
  initCopyDOI();

  // ── Page entrance ──
  document.body.classList.add('page-enter');
});

/* ── Publications: live filter by year / topic ── */
function initPubFilter() {
  const filterBtns = document.querySelectorAll('[data-pub-filter]');
  const pubCards   = document.querySelectorAll('.pub-card');
  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.pubFilter;

      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      pubCards.forEach(card => {
        const year  = card.dataset.year  || '';
        const topic = card.dataset.topic || '';
        const show  = filter === 'all' || year === filter || topic.includes(filter);
        card.style.display = show ? '' : 'none';
      });
    });
  });
}

/* ── Gallery lightbox ── */
function initGalleryLightbox() {
  const items = document.querySelectorAll('.gallery-item');
  if (!items.length) return;

  // Create lightbox DOM
  const lb = document.createElement('div');
  lb.id = 'lightbox';
  lb.style.cssText = `
    position:fixed;inset:0;background:rgba(6,14,30,.95);
    z-index:1000;display:none;align-items:center;justify-content:center;
    backdrop-filter:blur(12px);cursor:pointer;
  `;
  lb.innerHTML = `
    <div style="max-width:820px;width:90%;position:relative;">
      <div id="lb-img" style="
        width:100%;height:480px;border-radius:16px;
        overflow:hidden;position:relative;
      "></div>
      <div id="lb-title" style="color:#e8f0fa;font-size:16px;font-weight:500;margin-top:16px;"></div>
      <div id="lb-sub"   style="color:#7a9bbf;font-size:13px;margin-top:4px;"></div>
      <button id="lb-close" style="
        position:absolute;top:-44px;right:0;
        background:rgba(255,255,255,.1);border:none;color:#e8f0fa;
        width:36px;height:36px;border-radius:50%;font-size:18px;
        cursor:pointer;display:flex;align-items:center;justify-content:center;
      ">✕</button>
    </div>
  `;
  document.body.appendChild(lb);

  items.forEach(item => {
    item.addEventListener('click', () => {
      const inner = item.querySelector('.gallery-item-inner');
      const title = item.querySelector('.gallery-label-title')?.textContent || '';
      const sub   = item.querySelector('.gallery-label-sub')?.textContent   || '';
      const bg    = window.getComputedStyle(inner).background;

      document.getElementById('lb-img').style.background = bg;
      // Copy any SVG from gallery
      const svg = inner.querySelector('.gallery-svg');
      const lbImg = document.getElementById('lb-img');
      lbImg.innerHTML = svg ? svg.outerHTML : '';

      document.getElementById('lb-title').textContent = title;
      document.getElementById('lb-sub').textContent   = sub;

      lb.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    });
  });

  function closeLb() {
    lb.style.display = 'none';
    document.body.style.overflow = '';
  }

  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  document.getElementById('lb-close').addEventListener('click', closeLb);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); });
}

/* ── Smooth scroll for anchor links ── */
function initAnchorScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = 70; // nav height
      window.scrollTo({
        top:      target.offsetTop - offset,
        behavior: 'smooth',
      });
    });
  });

  // Nav links with data-section attr
  document.querySelectorAll('.nav-link[data-section]').forEach(link => {
    link.addEventListener('click', () => {
      const section = document.getElementById(link.dataset.section);
      if (!section) return;
      window.scrollTo({
        top:      section.offsetTop - 70,
        behavior: 'smooth',
      });
    });
  });
}

/* ── Contact form ── */
function initContactForm() {
  const form = document.querySelector('.contact-form');
  if (!form) return;

  const btn = form.querySelector('.form-submit');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const inputs = form.querySelectorAll('.form-input');
    let valid = true;

    inputs.forEach(input => {
      const empty = !input.value.trim();
      input.style.borderColor = empty ? '#e87040' : '';
      if (empty) valid = false;
    });

    if (!valid) {
      btn.textContent = 'Por favor, completa todos los campos';
      btn.style.background = 'linear-gradient(135deg,#c84020,#e06030)';
      setTimeout(() => {
        btn.textContent = 'Enviar mensaje →';
        btn.style.background = '';
      }, 2500);
      return;
    }

    btn.textContent = 'Enviando…';
    btn.disabled = true;

    // Simulate send (replace with real API call)
    setTimeout(() => {
      btn.textContent = '✓ Mensaje enviado';
      btn.style.background = 'linear-gradient(135deg,#1a6e50,#1db884)';
      inputs.forEach(i => i.value = '');
      setTimeout(() => {
        btn.textContent = 'Enviar mensaje →';
        btn.style.background = '';
        btn.disabled = false;
      }, 3500);
    }, 1400);
  });
}

/* ── Copy DOI to clipboard ── */
function initCopyDOI() {
  document.querySelectorAll('[data-doi]').forEach(el => {
    el.style.cursor = 'pointer';
    el.setAttribute('data-tooltip', 'Copiar DOI');
    el.addEventListener('click', e => {
      e.stopPropagation();
      navigator.clipboard.writeText(el.dataset.doi).then(() => {
        el.setAttribute('data-tooltip', '¡Copiado!');
        setTimeout(() => el.setAttribute('data-tooltip', 'Copiar DOI'), 1800);
      });
    });
  });
}

/* ── Utility: debounce ── */
function debounce(fn, delay = 150) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

window.nimach = { debounce };
