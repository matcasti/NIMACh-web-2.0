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
  
  // ── Mapa de la red de colaboración (canvas 2D, sin librerías externas) ──
  const D = window.NIMACH_DATA;
  const sum = document.getElementById('net-summary');
  if (sum) sum.textContent = `${D.collabCountries.length} países colaboradores · sede en ${D.globePoints.find(p => p.home)?.label || 'Punta Arenas'}`;
  NIMSmart.lazyInit(document.getElementById('net-canvas'), () => new NetworkMap('net-canvas', 'net-list'), '300px');

  // ── BibTeX → publicaciones (carga, renderiza y enriquece con OpenAlex) ──
  new BibTeXParser('data/publications.bib');
  // Nota: PublicationsEnricher se instancia dentro de BibTeXParser tras el render.
  // Si no hay archivo bib, el enricher corre igualmente sobre los datos estáticos.
  
  // ── Diagrama interactivo del eje cerebro–corazón ──
  new AxisViewer('#btn-3d');

  // ── Contact form ──
  initContactForm();

  // ── Países colaboradores (misma fuente que el hero) ──
  const mc = document.getElementById('metric-countries');
  if (mc) mc.textContent = (NIMACH_DATA.collabCountries || []).length;

  // ── Año del pie ──
  const fy = document.getElementById('footer-year');
  if (fy) fy.textContent = new Date().getFullYear();

  // ── Page entrance ──
  document.body.classList.add('page-enter');
  
  // ── Back to top (aparece tras 1.2 pantallas de scroll) ──
  const btt = document.getElementById('back-to-top');
  if (btt) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        btt.classList.toggle('show', window.scrollY > window.innerHeight * 1.2);
        ticking = false;
      });
    }, { passive: true });
    btt.addEventListener('click', () => window.scrollTo({
      top: 0, behavior: NIMSmart.reducedMotion() ? 'auto' : 'smooth' }));
  }
});

/* ── Scroll a anclas: lo resuelve el navegador (html { scroll-padding-top } + scroll-behavior en CSS) ── */

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

  const SERVICE_ID  = 'service_kr8za2r';
  const TEMPLATE_ID = 'template_issi1g4';
  const PUBLIC_KEY  = 'YP6iPMMZXPwjyDn4z';   // clave pública de EmailJS (es pública por diseño)
  const SDK         = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';

  // El SDK solo se descarga cuando alguien interactúa con el formulario (o se acerca a él)
  let sdkReady = null;
  const ensureSDK = () => sdkReady || (sdkReady = NIMSmart.loadScript(SDK)
    .then(() => emailjs.init({ publicKey: PUBLIC_KEY }))
    .catch(err => { sdkReady = null; throw err; }));
  form.addEventListener('focusin', () => ensureSDK().catch(() => {}), { once: true });
  NIMSmart.lazyInit(form, () => ensureSDK().catch(() => {}), '300px');

  const status = form.querySelector('.form-status');
  const say = (text, kind) => {
    if (!status) return;
    status.textContent = text;
    status.className = 'form-status' + (kind ? ' is-' + kind : '');
  };

  // Quitar el aviso de error apenas se corrige el campo
  form.addEventListener('input', e => {
    if (e.target.matches('.form-input')) e.target.setAttribute('aria-invalid', 'false');
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (btn.disabled) return;

    const inputs = [...form.querySelectorAll('.form-input')];
    let valid = true;
    inputs.forEach(input => {
      const bad = !input.value.trim() || (input.type === 'email' && !input.checkValidity());
      input.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad) valid = false;
    });

    if (!valid) {
      say('Revisa los campos marcados en rojo.', 'err');
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    btn.disabled = true;
    btn.classList.add('is-loading');
    say('Enviando tu mensaje…');

    const val = n => form.querySelector(`[name="${n}"]`).value.trim();
    const params = {
      from_name: val('from_name'), from_inst: val('from_inst'), reply_to: val('reply_to'),
      subject: val('subject'), message: val('message'),
      sent_at: new Date().toLocaleString('es-CL', { timeZone: 'America/Punta_Arenas' }),
    };

    try {
      await ensureSDK();
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, params);
      inputs.forEach(i => { i.value = ''; i.removeAttribute('aria-invalid'); });
      say('✓ ¡Mensaje enviado! Te responderemos pronto.', 'ok');
      NIMUI.toast('Mensaje enviado', 'success');
    } catch (err) {
      console.error('EmailJS error:', err);
      say('No se pudo enviar. Inténtalo de nuevo en unos minutos.', 'err');
    } finally {
      btn.disabled = false;
      btn.classList.remove('is-loading');
    }
  });
}

/* ── Utility: debounce ── */
function debounce(fn, delay = 150) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

window.nimach = { debounce };
