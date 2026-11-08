/**
 * NIM-ACh — ThemeManager
 *
 * Tema inteligente:
 *  1. Si la persona eligió un tema (botón), se respeta y se recuerda.
 *  2. Si no, se usa el del sistema (prefers-color-scheme) y se SIGUE
 *     automáticamente si el sistema cambia (p. ej. modo oscuro nocturno).
 *
 * La clase `dark-mode` se aplica en <html> (la pone un script en el <head>
 * antes del primer pintado, sin parpadeo) y en <body> (reglas legacy).
 */
class ThemeManager {
  constructor() {
    this.KEY = 'nimach-theme';
    this.mq  = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    this.apply(this.resolve(), false);
    this.bindToggle();

    // Si no hay elección explícita, seguir al sistema en vivo
    if (this.mq && this.mq.addEventListener) {
      this.mq.addEventListener('change', () => {
        if (!this.stored()) this.apply(this.resolve(), true);
      });
    }
  }

  stored() {
    try { return localStorage.getItem(this.KEY); } catch (e) { return null; }
  }

  resolve() {
    const s = this.stored();
    if (s === 'dark' || s === 'light') return s;
    return this.mq && this.mq.matches ? 'dark' : 'light';
  }

  apply(theme, animate = true) {
    const body = document.body;
    const dark = theme === 'dark';
    if (animate) body.classList.add('theme-transitioning');

    document.documentElement.classList.toggle('dark-mode', dark);
    body.classList.toggle('dark-mode', dark);
    this.current = theme;

    const icon = document.getElementById('theme-icon');
    const btn  = document.getElementById('theme-toggle');
    // Icono de línea: sol en oscuro (para pasar a claro) y luna en claro
    if (icon) icon.innerHTML = window.NIMUI ? NIMUI.icon(dark ? 'sun' : 'moon', 18) : (dark ? '☀' : '☾');

    // Color de la barra del navegador móvil = fondo de la página
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0e1217' : '#f7f8fa');
    if (btn) {
      btn.setAttribute('aria-label', dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
      btn.setAttribute('aria-pressed', String(dark));
    }

    if (animate) setTimeout(() => body.classList.remove('theme-transitioning'), 350);
  }

  /** Solo el botón guarda la preferencia */
  toggle() {
    const next = this.current === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(this.KEY, next); } catch (e) {}
    this.apply(next);
  }

  bindToggle() {
    // Delegación en document: funciona aunque el botón se inyecte dinámicamente
    if (this._boundHandler) document.removeEventListener('click', this._boundHandler);
    this._boundHandler = e => {
      if (e.target.closest('#theme-toggle')) this.toggle();
    };
    document.addEventListener('click', this._boundHandler);
  }
}

window.ThemeManager = ThemeManager;
