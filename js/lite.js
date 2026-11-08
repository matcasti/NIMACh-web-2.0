/**
 * NIM-ACh — Marcado simple (NIMLite)
 *
 * Permite escribir texto con formato sin tocar HTML:
 *     [texto del enlace](https://…)   → enlace
 *     *énfasis*  /  **negrita**       → <em> / <strong>
 *     salto de línea                  → <br>
 *
 *   NIMLite.toHtml(texto)    marcado simple → HTML seguro
 *   NIMLite.fromHtml(html)   HTML antiguo (a, em, strong, br) → marcado simple
 *   NIMLite.sanitizeHtml(h)  deja solo <a href http(s)>, <em>, <strong>, <br> (todo lo demás se elimina)
 *
 * Es un módulo "universal": se usa en el navegador (window.NIMLite) y en Node (require).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NIMLite = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const escHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const unEnt = s => String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0*39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  const isHttp = u => /^https?:\/\/[^\s"'<>]+$/i.test(u);

  function toHtml(text) {
    let h = escHtml(text == null ? '' : text);
    h = h.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    return h.replace(/\r?\n/g, '<br>');
  }

  function fromHtml(html) {
    let s = String(html == null ? '' : html);
    s = s.replace(/<a\b[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi,
      (_, a, b, t) => { const u = unEnt(a || b || ''); return isHttp(u) ? `[${t.replace(/<[^>]+>/g, '')}](${u})` : t; });
    s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
         .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
         .replace(/<br\s*\/?>/gi, '\n')
         .replace(/<[^>]+>/g, '');
    return unEnt(s);
  }

  function sanitizeHtml(html) {
    const out = [];
    let openA = 0;
    String(html == null ? '' : html).split(/(<\/?[a-zA-Z][^>]*>)/g).forEach((part, i) => {
      if (i % 2 === 0) { out.push(part.replace(/</g, '&lt;').replace(/>/g, '&gt;')); return; }   // texto
      const m = part.match(/^<(\/?)([a-zA-Z][\w-]*)([^>]*)>$/); if (!m) return;
      const close = m[1] === '/', tag = m[2].toLowerCase(), attrs = m[3];
      if (tag === 'em' || tag === 'strong') out.push(`<${close ? '/' : ''}${tag}>`);
      else if (tag === 'b' || tag === 'i') out.push(`<${close ? '/' : ''}${tag === 'b' ? 'strong' : 'em'}>`);
      else if (tag === 'br' && !close) out.push('<br>');
      else if (tag === 'a') {
        if (close) { if (openA > 0) { openA--; out.push('</a>'); } }
        else {
          const h = attrs.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
          const u = h ? unEnt(h[1] || h[2] || '') : '';
          if (isHttp(u)) { openA++; out.push(`<a href="${escHtml(u)}" target="_blank" rel="noopener">`); }
        }
      }
    });
    while (openA-- > 0) out.push('</a>');
    return out.join('');
  }

  return { toHtml, fromHtml, sanitizeHtml, escHtml, unEnt, isHttp };
});
