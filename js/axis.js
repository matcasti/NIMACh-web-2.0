/**
 * NIM-ACh — AxisViewer
 * Diagrama interactivo del eje cerebro–corazón (reemplaza al visor 3D).
 * Esquema simplificado con fines divulgativos: red autonómica central →
 * tronco encefálico → nervio vago / cadena simpática → nodo sinoauricular.
 *
 * Se abre desde #btn-3d. Teclado: Tab / Enter / Esc. Sin dependencias.
 */
class AxisViewer {
  constructor(triggerSel = '#btn-3d') {
    this.trigger = document.querySelector(triggerSel);
    if (!this.trigger) return;
    this.el = null;
    this.sel = null;          // id de nodo seleccionado
    this.mode = 'all';        // all | vagal | symp | aff
    this.trigger.addEventListener('click', () => this.open());
  }

  /* ───────── contenido ───────── */

  static NODES = [
    { id: 'vmpfc', label: 'vmPFC', x: 90,  y: 60,  zone: 'Red autonómica central · cortical',
      text: 'Corteza prefrontal ventromedial. Ejerce control descendente sobre la amígdala y el hipotálamo; se asocia a mayor actividad vagal y a mayor variabilidad cardíaca en reposo.' },
    { id: 'acc',   label: 'ACC',   x: 230, y: 60,  zone: 'Red autonómica central · cortical',
      text: 'Corteza cingulada anterior. Integra emoción, atención y esfuerzo con la respuesta cardiovascular y ajusta la frecuencia cardíaca ante nuevas demandas.' },
    { id: 'ins',   label: 'Ínsula', x: 370, y: 60, zone: 'Red autonómica central · cortical',
      text: 'Recibe señales interoceptivas del corazón y construye la representación del estado corporal que guía la regulación autonómica.' },
    { id: 'amy',   label: 'Amígdala', x: 90, y: 170, zone: 'Red autonómica central · subcortical',
      text: 'Evalúa amenaza y relevancia emocional. Cuando detecta peligro aumenta el impulso simpático y reduce el tono vagal.' },
    { id: 'hyp',   label: 'Hipotálamo', x: 230, y: 170, zone: 'Red autonómica central · subcortical',
      text: 'Integra señales autonómicas, neuroendocrinas e inmunes. Coordina la respuesta global al estrés y proyecta al tronco encefálico.' },
    { id: 'pag',   label: 'PAG',   x: 370, y: 170, zone: 'Red autonómica central · subcortical',
      text: 'Sustancia gris periacueductal. Organiza las respuestas defensivas y sus correlatos cardiovasculares.' },
    { id: 'rvlm',  label: 'RVLM',  x: 110, y: 290, zone: 'Tronco encefálico',
      text: 'Bulbo ventrolateral rostral. Principal origen del tono simpático que llega al corazón y a los vasos sanguíneos.' },
    { id: 'nts',   label: 'NTS / DMV', x: 350, y: 290, zone: 'Tronco encefálico',
      text: 'Núcleo del tracto solitario y núcleo motor dorsal del vago. El NTS recibe las aferencias del vago y los barorreceptores; de aquí parte la eferencia vagal hacia el corazón.' },
    { id: 'sa',    label: 'Nodo SA', x: 270, y: 470, zone: 'Corazón',
      text: 'Marcapasos natural. El equilibrio entre influencia simpática y vagal modula su descarga y genera la variabilidad latido a latido (HRV), el marcador central de nuestra investigación.' },
    { id: 'av',    label: 'Nodo AV · His', x: 222, y: 530, zone: 'Corazón',
      text: 'El nodo auriculoventricular y el haz de His conducen el impulso a los ventrículos; también reciben modulación autonómica.' },
  ];

  /* Conexiones: from → to, tipo (desc: descendente · vag: vagal eferente · aff: aferente · symp · cond) */
  static LINKS = [
    ['vmpfc', 'acc', 'desc'], ['acc', 'ins', 'desc'], ['amy', 'hyp', 'desc'], ['hyp', 'pag', 'desc'],
    ['vmpfc', 'amy', 'desc'], ['acc', 'hyp', 'desc'], ['ins', 'pag', 'desc'],
    ['amy', 'rvlm', 'desc'], ['hyp', 'rvlm', 'desc'], ['hyp', 'nts', 'desc'], ['pag', 'nts', 'desc'],
    ['sa', 'av', 'cond'],
  ];

  static MODES = {
    all:   { label: 'Todo el eje',   text: 'El cerebro regula al corazón y el corazón informa al cerebro: un circuito de ida y vuelta.' },
    vagal: { label: 'Vago (parasimpático)', text: 'Eferencia del nervio vago (X par): frena la frecuencia cardíaca y favorece la variabilidad (HRV).' },
    symp:  { label: 'Simpático',     text: 'Cadena simpática T1–T4: eleva la frecuencia cardíaca y la contractilidad ante la demanda.' },
    aff:   { label: 'Aferencias',    text: 'Señales del corazón y de los barorreceptores suben por el vago hasta el NTS, la ínsula y la corteza.' },
  };

  /* ───────── construcción ───────── */

  _node(id) { return AxisViewer.NODES.find(n => n.id === id); }

  _pillW(n) { return Math.round(n.label.length * 7.4 + 34); }

  _svg() {
    const N = AxisViewer.NODES, E = NIMUI.esc;
    const lines = AxisViewer.LINKS.map(([a, b, t]) => {
      const A = this._node(a), B = this._node(b);
      return `<line class="ax-link ax-${t}" data-a="${a}" data-b="${b}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
    }).join('');

    // Rutas curvas del nervio vago (eferente y aferente) y de la cadena simpática
    const paths = `
      <path id="ax-vagE" class="ax-path ax-vag"  d="M350 290 C 398 348, 340 405, 278 460"/>
      <path id="ax-vagA" class="ax-path ax-aff"  d="M288 458 C 346 406, 408 346, 360 296"/>
      <path id="ax-symp" class="ax-path ax-symp" d="M110 290 C 52 380, 150 452, 250 470"/>`;

    const pulses = `
      <circle class="ax-pulse ax-p-vag"  r="3.4"><animateMotion dur="3.2s" repeatCount="indefinite" rotate="auto"><mpath href="#ax-vagE"/></animateMotion></circle>
      <circle class="ax-pulse ax-p-vag"  r="3.4"><animateMotion dur="3.2s" begin="-1.6s" repeatCount="indefinite"><mpath href="#ax-vagE"/></animateMotion></circle>
      <circle class="ax-pulse ax-p-aff"  r="2.8"><animateMotion dur="3.8s" repeatCount="indefinite"><mpath href="#ax-vagA"/></animateMotion></circle>
      <circle class="ax-pulse ax-p-symp" r="3"><animateMotion dur="3.6s" repeatCount="indefinite"><mpath href="#ax-symp"/></animateMotion></circle>`;

    const nodes = N.map(n => {
      const w = this._pillW(n), h = 34;
      return `<g class="ax-node" data-id="${n.id}" tabindex="0" role="button" aria-label="${E(n.label)}: ${E(n.zone)}" transform="translate(${n.x} ${n.y})">
        <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}"/>
        <text y="1" text-anchor="middle" dominant-baseline="middle">${E(n.label)}</text>
      </g>`;
    }).join('');

    return `
    <svg class="ax-svg" viewBox="0 0 460 620" role="group" aria-label="Diagrama del eje cerebro-corazón">
      <text class="ax-zone" x="4" y="18">CEREBRO</text>
      <text class="ax-zone" x="4" y="250">TRONCO ENCEFÁLICO</text>
      <text class="ax-zone" x="4" y="414">CORAZÓN</text>
      <line class="ax-rule" x1="4" x2="456" y1="226" y2="226"/>
      <line class="ax-rule" x1="4" x2="456" y1="392" y2="392"/>
      <path class="ax-heart" transform="translate(134 424) scale(8.2)" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      ${lines}${paths}
      <text class="ax-lbl" x="400" y="384" text-anchor="middle">N. vago (X)</text>
      <text class="ax-lbl" x="58" y="392" text-anchor="middle">T1–T4</text>
      ${pulses}${nodes}
    </svg>`;
  }

  _build() {
    if (this.el) return;
    const M = AxisViewer.MODES;
    const el = document.createElement('div');
    el.className = 'axis';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'axis-title');
    el.hidden = true;
    el.innerHTML = `
      <div class="axis-backdrop" data-axis="close"></div>
      <div class="axis-card">
        <header class="axis-head">
          <div>
            <span class="label">Esquema interactivo</span>
            <h2 id="axis-title">Eje cerebro–corazón</h2>
          </div>
          <button type="button" class="axis-x" data-axis="close" aria-label="Cerrar">✕</button>
        </header>

        <div class="axis-modes" role="group" aria-label="Vías">
          ${Object.entries(M).map(([k, v]) => `<button type="button" class="seg-btn${k === 'all' ? ' active' : ''}" data-mode="${k}" aria-pressed="${k === 'all'}">${v.label}</button>`).join('')}
        </div>

        <div class="axis-body">
          <div class="axis-figure">${this._svg()}</div>
          <aside class="axis-panel" aria-live="polite">
            <div class="axis-info"></div>
            <ul class="axis-key" aria-label="Leyenda">
              <li><i class="k k-vag"></i>Eferencia vagal</li>
              <li><i class="k k-symp"></i>Eferencia simpática</li>
              <li><i class="k k-aff"></i>Aferencia al cerebro</li>
              <li><i class="k k-desc"></i>Vías descendentes</li>
            </ul>
            <p class="axis-note">Esquema simplificado con fines divulgativos.</p>
          </aside>
        </div>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    this.svg = el.querySelector('.ax-svg');

    el.addEventListener('click', e => {
      if (e.target.closest('[data-axis="close"]')) return this.close();
      const m = e.target.closest('button[data-mode]');
      if (m) return this.setMode(m.dataset.mode);
      const n = e.target.closest('.ax-node');
      if (n) this.select(this.sel === n.dataset.id ? null : n.dataset.id);
    });
    this.svg.addEventListener('pointerover', e => { const n = e.target.closest('.ax-node'); if (n && !this.sel) this._preview(n.dataset.id); });
    this.svg.addEventListener('pointerleave', () => { if (!this.sel) this._preview(null); });
    this.svg.addEventListener('focusin', e => { const n = e.target.closest('.ax-node'); if (n && !this.sel) this._preview(n.dataset.id); });
    this.svg.addEventListener('keydown', e => {
      const n = e.target.closest('.ax-node');
      if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.select(this.sel === n.dataset.id ? null : n.dataset.id); }
    });
    document.addEventListener('keydown', e => {
      if (el.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if (e.key === 'Tab') this._trap(e);
    });

    this._render();
  }

  /* ───────── estado ───────── */

  setMode(m) {
    this.mode = m; this.sel = null;
    this.el.querySelectorAll('button[data-mode]').forEach(b => {
      const on = b.dataset.mode === m;
      b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
    });
    this._render();
  }

  select(id) { this.sel = id; this._render(); }
  _preview(id) { this._render(id); }

  /** Nodos asociados a cada vía (para resaltar) */
  _modeNodes() {
    return ({
      all: null,
      vagal: ['nts', 'sa'],
      symp:  ['rvlm', 'sa', 'av'],
      aff:   ['sa', 'nts', 'ins', 'acc', 'vmpfc'],
    })[this.mode];
  }

  _render(preview) {
    const focus = this.sel || preview || null;
    const modeSet = this._modeNodes();
    const linked = new Set();
    if (focus) {
      linked.add(focus);
      AxisViewer.LINKS.forEach(([a, b]) => { if (a === focus) linked.add(b); if (b === focus) linked.add(a); });
      if (focus === 'nts' || focus === 'sa') { linked.add('nts'); linked.add('sa'); }
      if (focus === 'rvlm') linked.add('sa');
    }

    this.svg.dataset.mode = this.mode;
    this.svg.querySelectorAll('.ax-node').forEach(g => {
      const id = g.dataset.id;
      g.classList.toggle('is-sel', id === this.sel);
      g.classList.toggle('is-dim', focus ? !linked.has(id) : (modeSet ? !modeSet.includes(id) : false));
      g.setAttribute('aria-pressed', String(id === this.sel));
    });
    this.svg.querySelectorAll('.ax-link').forEach(l => {
      const on = focus && (l.dataset.a === focus || l.dataset.b === focus);
      l.classList.toggle('is-on', !!on);
      l.classList.toggle('is-dim', focus ? !on : this.mode !== 'all');
    });

    // Panel
    const info = this.el.querySelector('.axis-info');
    const n = focus && this._node(focus);
    if (n) {
      const nb = [...linked].filter(i => i !== focus).map(i => this._node(i).label);
      info.innerHTML = `<span class="ax-tag">${NIMUI.esc(n.zone)}</span>
        <h3>${NIMUI.esc(n.label)}</h3><p>${NIMUI.esc(n.text)}</p>
        ${nb.length ? `<p class="ax-conn"><strong>Conecta con:</strong> ${nb.map(NIMUI.esc).join(' · ')}</p>` : ''}`;
    } else {
      const M = AxisViewer.MODES[this.mode];
      info.innerHTML = `<span class="ax-tag">${NIMUI.esc(M.label)}</span><h3>Toca un elemento</h3><p>${NIMUI.esc(M.text)}</p>`;
    }
  }

  /* ───────── diálogo ───────── */

  open() {
    this._build();
    this._opener = document.activeElement;
    this.el.hidden = false;
    document.documentElement.classList.add('lb-open');
    requestAnimationFrame(() => this.el.classList.add('is-open'));
    if (NIMSmart.reducedMotion() && this.svg.pauseAnimations) this.svg.pauseAnimations();
    this.el.querySelector('.axis-x').focus({ preventScroll: true });
  }

  close() {
    if (!this.el || this.el.hidden) return;
    this.el.classList.remove('is-open');
    document.documentElement.classList.remove('lb-open');
    const done = () => { this.el.hidden = true; };
    NIMSmart.reducedMotion() ? done() : setTimeout(done, 200);
    if (this._opener && this._opener.focus) this._opener.focus({ preventScroll: true });
  }

  _trap(e) {
    const f = [...this.el.querySelectorAll('button, [tabindex="0"]')].filter(x => x.offsetParent !== null || x instanceof SVGElement);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

window.AxisViewer = AxisViewer;
