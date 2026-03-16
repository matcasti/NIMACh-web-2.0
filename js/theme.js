/**
 * NIM-ACh — ThemeManager
 * Toggle dark/light mode con persistencia en localStorage.
 * Reutiliza las variables CSS existentes de variables.css.
 */
class ThemeManager {
  constructor() {
    this.KEY     = 'nimach-theme';
    this.current = localStorage.getItem(this.KEY) || 'light';
    this.apply(this.current, false); // sin transición en carga
    this.bindToggle();
  }

  apply(theme, animate = true) {
    const body = document.body;
    if (animate) body.classList.add('theme-transitioning');

    body.classList.toggle('dark-mode', theme === 'dark');
    localStorage.setItem(this.KEY, theme);
    this.current = theme;

    const icon  = document.getElementById('theme-icon');
    const btn   = document.getElementById('theme-toggle');
    if (icon) icon.textContent = theme === 'dark' ? '☀' : '🌙';
    if (btn)  btn.setAttribute('aria-label',
      theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro');

    if (animate) setTimeout(() => body.classList.remove('theme-transitioning'), 350);
  }

  toggle() { this.apply(this.current === 'dark' ? 'light' : 'dark'); }

  bindToggle() {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', () => this.toggle());
  }
}

window.ThemeManager = ThemeManager;
