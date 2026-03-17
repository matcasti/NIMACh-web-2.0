/**
 * NIM-ACh — Main Entry Point
 * Initializes all modules and handles page-level utilities.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── Theme (antes que cualquier render) ──
  new ThemeManager();

  // ── Canvas animations ──
  new NeuralCanvas('hero-canvas', 'hero');
  new ParticleField('dei-canvas');
  
  // ── Globo 3D de colaboraciones ──
  new GlobeViewer('globe-canvas');
  _renderGlobeLegend();

  // ── BibTeX → publicaciones (carga, renderiza y enriquece con OpenAlex) ──
  new BibTeXParser('data/publications.bib');
  // Nota: PublicationsEnricher se instancia dentro de BibTeXParser tras el render.
  // Si no hay archivo bib, el enricher corre igualmente sobre los datos estáticos.
  
  // ── 3D Brain-Heart viewer ──
  new Brain3DViewer();

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
  
  // ── Back to top ──
  const btt = document.getElementById('back-to-top');
  if (btt) {
    window.addEventListener('scroll', () => {
      const show = window.scrollY > 400;
      btt.style.opacity = show ? '1' : '0';
      btt.style.transform = show ? 'translateY(0)' : 'translateY(8px)';
      btt.style.pointerEvents = show ? 'all' : 'none';
    }, { passive: true });
    btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
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

/* ── Contact form (EmailJS multi-destinatario) ──
 *
 * Configuración en emailjs.com:
 *   1. Crea una cuenta y un Email Service (Gmail / Outlook / SMTP)
 *   2. Crea un Email Template con las variables:
 *        {{from_name}}, {{from_inst}}, {{reply_to}},
 *        {{subject}}, {{message}}, {{sent_at}}
 *   3. En el template, agrega múltiples "To emails" separados por coma
 *   4. Reemplaza SERVICE_ID y TEMPLATE_ID abajo con los tuyos.
 */
function initContactForm() {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  const btn = form.querySelector('.form-submit');
  if (!btn) return;

  const SERVICE_ID  = 'service_kr8za2r';   // ← reemplazar
  const TEMPLATE_ID = 'template_issi1g4'; // ← reemplazar

  btn.addEventListener('click', async () => {
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

    // Construir los parámetros del template
    const params = {
      from_name: form.querySelector('[name="from_name"]').value.trim(),
      from_inst:  form.querySelector('[name="from_inst"]').value.trim(),
      reply_to:   form.querySelector('[name="reply_to"]').value.trim(),
      subject:    form.querySelector('[name="subject"]').value.trim(),
      message:    form.querySelector('[name="message"]').value.trim(),
      sent_at:    new Date().toLocaleString('es-CL', { timeZone: 'America/Punta_Arenas' }),
    };

    try {
      if (typeof emailjs === 'undefined') throw new Error('EmailJS no cargado');
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, params);

      btn.textContent = '✓ Mensaje enviado';
      btn.style.background = 'linear-gradient(135deg,#1a6e50,#1db884)';
      inputs.forEach(i => { i.value = ''; i.style.borderColor = ''; });
    } catch (err) {
      console.error('EmailJS error:', err);
      btn.textContent = '✗ Error al enviar — intenta por correo directo';
      btn.style.background = 'linear-gradient(135deg,#c84020,#e06030)';
    } finally {
      setTimeout(() => {
        btn.textContent = 'Enviar mensaje →';
        btn.style.background = '';
        btn.disabled = false;
      }, 4000);
    }
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
        showToast('DOI copiado al portapapeles', 'success');
      });
    });
  });
}

/* ── Utility: debounce ── */
function debounce(fn, delay = 150) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

/* ── Renderiza leyenda del globo desde NIMACH_DATA ── */
function _renderGlobeLegend() {
  const wrap = document.querySelector('.globe-points-legend');
  if (!wrap) return;
  const pts = window.NIMACH_DATA?.globePoints || [];
  wrap.innerHTML = pts.map(p => `
    <div class="globe-legend-item">
      <span class="globe-legend-dot ${p.home ? 'globe-legend-home' : ''}"
        style="background:${p.color};color:${p.color};"></span>
      <span>${p.label}</span>
    </div>`).join('');
}

/* ── Toast system (UX global) ── */
function showToast(msg, type = 'info', duration = 3200) {
  let wrap = document.getElementById('toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toast-wrap';
    wrap.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:400;
      display:flex;flex-direction:column;gap:8px;pointer-events:none;`;
    document.body.appendChild(wrap);
  }
  const colors = { info:'#3b7abf', success:'#1db884', error:'#e87040', warn:'#f5a472' };
  const t = document.createElement('div');
  t.style.cssText = `background:rgba(6,14,30,.96);backdrop-filter:blur(12px);
    color:#e8f0fa;font-size:12px;padding:10px 16px;border-radius:8px;
    border-left:3px solid ${colors[type]||colors.info};
    box-shadow:0 4px 20px rgba(0,0,0,.35);pointer-events:all;
    animation:slide-right .24s var(--ease-out) forwards;font-family:var(--font-sans);
    max-width:300px;line-height:1.5;`;
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .3s';
    setTimeout(() => t.remove(), 320); }, duration);
}

window.showToast = showToast;

window.nimach = { debounce };
