/**
 * NIM-ACh — NetworkMap
 * Mapa de puntos de la red de colaboración: continentes en cuadrícula,
 * arcos desde la sede y puntos interactivos. Monotono, sin dependencias
 * (reemplaza al globo 3D de Three.js).
 *
 * Datos:  NIMACH_DATA.globePoints  (lat, lon, label, sub, home)
 * Tierra: window.NIM_LAND          (js/land-mask.js)
 */
class NetworkMap {
  constructor(canvasId, listId) {
    this.canvas = document.getElementById(canvasId);
    this.list   = document.getElementById(listId);
    this.stage  = this.canvas && this.canvas.parentElement;
    this.pts    = (window.NIMACH_DATA && NIMACH_DATA.globePoints) || [];
    if (!this.canvas || !window.NIM_LAND || !this.pts.length) return;

    this.ctx    = this.canvas.getContext('2d');
    this.home   = this.pts.find(p => p.home) || this.pts[0];
    this.hover  = -1;
    this.sel    = -1;
    this.t0     = performance.now();
    this.running = false;
    this.static  = false;

    this.tip = document.createElement('div');
    this.tip.className = 'netmap-tip';
    this.tip.hidden = true;
    this.stage.appendChild(this.tip);

    this._decodeLand();
    this._fitBounds();
    this._renderList();
    this._bind();
    this.resize();

    NIMSmart.onTheme(() => { this._buildLand(); if (!this.running) this.draw(0); });
    NIMSmart.whenVisible(this.stage, () => this._start(), () => this._stop(),
      { rootMargin: '80px', once: () => { this.static = true; this.draw(0); } });
  }

  /* ───────── datos ───────── */

  _decodeLand() {
    const L = window.NIM_LAND;
    this.land = [];                                   // [lon, lat] de celdas con tierra
    L.rows.forEach((enc, r) => {
      let lon = L.lon0, land = false;
      enc.split(',').forEach(n => {
        n = +n;
        if (land) for (let i = 0; i < n; i++) this.land.push([lon + i * L.step, L.lat0 - r * L.step]);
        lon += n * L.step; land = !land;
      });
    });
  }

  /** Encuadra automáticamente los puntos con margen (sirve si se agregan colaboradores) */
  _fitBounds() {
    const lons = this.pts.map(p => p.lon), lats = this.pts.map(p => p.lat);
    let lon0 = Math.min(...lons) - 20, lon1 = Math.max(...lons) + 20;
    let lat0 = Math.min(...lats) - 14, lat1 = Math.max(...lats) + 16;
    lat0 = Math.max(lat0, -60); lat1 = Math.min(lat1, 80);
    lon0 = Math.max(lon0, -180); lon1 = Math.min(lon1, 180);
    this.b = { lon0, lon1, lat0, lat1 };
  }

  /* ───────── lienzo ───────── */

  resize() {
    const w = Math.max(this.stage.clientWidth, 220);
    const { lon0, lon1, lat0, lat1 } = this.b;
    this.ppd = w / (lon1 - lon0);                      // píxeles por grado
    this.W = w;
    this.H = Math.round((lat1 - lat0) * this.ppd);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width  = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.canvas.style.height = this.H + 'px';
    this.dpr = dpr;
    this.xy = this.pts.map(p => this._proj(p.lon, p.lat));
    this._buildArcs();
    this._buildLand();
    this.draw(performance.now() - this.t0);
  }

  _proj(lon, lat) {
    return [(lon - this.b.lon0) * this.ppd, (this.b.lat1 - lat) * this.ppd];
  }

  /** La tierra (estática) se pinta una sola vez en un lienzo aparte */
  _buildLand() {
    const P = NIMSmart.palette();
    const c = this._landCv || (this._landCv = document.createElement('canvas'));
    c.width = this.canvas.width; c.height = this.canvas.height;
    const g = c.getContext('2d');
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const r = Math.max(.7, this.ppd * 2 * .27);
    const { lon0, lon1, lat0, lat1 } = this.b;
    g.fillStyle = `rgba(${P.ink}, .2)`;
    this.land.forEach(([lo, la]) => {
      if (lo < lon0 || lo > lon1 || la < lat0 || la > lat1) return;
      const [x, y] = this._proj(lo, la);
      g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
    });
  }

  /** Arcos: curva cuadrática que se eleva sobre la línea recta */
  _buildArcs() {
    const [hx, hy] = this._proj(this.home.lon, this.home.lat);
    this.arcs = this.pts.map((p, i) => {
      if (p === this.home) return null;
      const [x, y] = this.xy[i];
      const dx = x - hx, dy = y - hy, d = Math.hypot(dx, dy);
      let nx = -dy / d, ny = dx / d;
      if (ny > 0) { nx = -nx; ny = -ny; }              // siempre curva hacia arriba
      const lift = Math.min(d * .32, this.H * .45);
      const cx = (hx + x) / 2 + nx * lift, cy = (hy + y) / 2 + ny * lift;
      const s = [];
      for (let k = 0; k <= 56; k++) {
        const t = k / 56, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
        s.push([a * hx + b * cx + c * x, a * hy + b * cy + c * y]);
      }
      return s;
    });
  }

  /* ───────── dibujo ───────── */

  draw(ms) {
    const ctx = this.ctx, P = NIMSmart.palette();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.drawImage(this._landCv, 0, 0, this.W, this.H);

    const active = this.sel >= 0 ? this.sel : this.hover;
    const sec = ms / 1000;

    // arcos
    this.arcs.forEach((s, i) => {
      if (!s) return;
      const on = active === i, dim = active >= 0 && !on;
      ctx.beginPath();
      s.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.strokeStyle = `rgba(${P.accent}, ${on ? .85 : dim ? .1 : .3})`;
      ctx.lineWidth = on ? 1.6 : 1;
      ctx.stroke();

      if (!this.static && !dim) {                       // pulso que viaja por el arco
        const len = s.length, ph = ((sec * .22 + i * .17) % 1);
        const a = Math.floor(ph * (len - 1)), b = Math.min(len - 1, a + 9);
        ctx.beginPath();
        for (let k = a; k <= b; k++) k === a ? ctx.moveTo(s[k][0], s[k][1]) : ctx.lineTo(s[k][0], s[k][1]);
        ctx.strokeStyle = `rgba(${P.accent}, ${on ? 1 : .75})`;
        ctx.lineWidth = on ? 2.2 : 1.6;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    });

    // puntos
    this.pts.forEach((p, i) => {
      const [x, y] = this.xy[i];
      const on = active === i, dim = active >= 0 && !on && p !== this.home;
      const home = p === this.home;
      const r = home ? 4.6 : 3.2;

      if (home && !this.static) {                       // ondas desde la sede
        for (let k = 0; k < 2; k++) {
          const ph = ((sec * .45 + k * .5) % 1);
          ctx.beginPath(); ctx.arc(x, y, r + ph * 15, 0, 6.2832);
          ctx.strokeStyle = `rgba(${P.accent}, ${(1 - ph) * .45})`;
          ctx.lineWidth = 1; ctx.stroke();
        }
      }
      if (on) {
        ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 6.2832);
        ctx.strokeStyle = `rgba(${P.accent}, .55)`; ctx.lineWidth = 1.2; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(x, y, r + 1.8, 0, 6.2832);
      ctx.fillStyle = `rgba(${P.bg}, .9)`; ctx.fill();            // halo del color de fondo
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
      ctx.fillStyle = home || on ? `rgb(${P.accent})` : `rgba(${P.ink}, ${dim ? .35 : .85})`;
      ctx.fill();
    });
  }

  _loop = () => {
    if (!this.running) return;
    this.draw(performance.now() - this.t0);
    this._raf = requestAnimationFrame(this._loop);
  };
  _start() { if (this.running) return; this.static = false; this.running = true; this._raf = requestAnimationFrame(this._loop); }
  _stop()  { this.running = false; cancelAnimationFrame(this._raf); }

  /* ───────── interacción ───────── */

  _renderList() {
    if (!this.list) return;
    const E = NIMUI.esc;
    this.list.innerHTML = this.pts.map((p, i) => `
      <li><button type="button" class="netmap-item${p.home ? ' is-home' : ''}" data-i="${i}" aria-pressed="false">
        <span class="netmap-dot" aria-hidden="true"></span>
        <span class="netmap-name">${E(p.label)}<small>${E(p.sub || p.country || '')}</small></span>
      </button></li>`).join('');

    this.list.addEventListener('pointerover', e => { const b = e.target.closest('[data-i]'); if (b) this._setHover(+b.dataset.i); });
    this.list.addEventListener('pointerleave', () => this._setHover(-1));
    this.list.addEventListener('focusin',  e => { const b = e.target.closest('[data-i]'); if (b) this._setHover(+b.dataset.i); });
    this.list.addEventListener('focusout', () => this._setHover(-1));
    this.list.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) this._toggleSel(+b.dataset.i); });
  }

  _bind() {
    const hit = e => {
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      let best = -1, bd = 18;
      this.xy.forEach(([px, py], i) => { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = i; } });
      return best;
    };
    this.canvas.addEventListener('pointermove', e => { const i = hit(e); this._setHover(i); this.canvas.style.cursor = i >= 0 ? 'pointer' : 'default'; });
    this.canvas.addEventListener('pointerleave', () => this._setHover(-1));
    this.canvas.addEventListener('click', e => { const i = hit(e); if (i >= 0) this._toggleSel(i); else this._toggleSel(this.sel); });
    new ResizeObserver(NIMSmart.debounce(() => this.resize(), 100)).observe(this.stage);
  }

  _setHover(i) {
    if (i === this.hover) return;
    this.hover = i;
    this._syncUI();
  }

  _toggleSel(i) {
    this.sel = (this.sel === i || i < 0) ? -1 : i;
    this._syncUI();
  }

  _syncUI() {
    const active = this.sel >= 0 ? this.sel : this.hover;
    if (this.list) this.list.querySelectorAll('.netmap-item').forEach(b => {
      const i = +b.dataset.i;
      b.classList.toggle('is-active', i === active);
      b.setAttribute('aria-pressed', String(i === this.sel));
    });
    if (active >= 0) {
      const p = this.pts[active], [x, y] = this.xy[active];
      this.tip.innerHTML = `<strong>${NIMUI.esc(p.label)}</strong><span>${NIMUI.esc(p.sub || p.country || '')}</span>`;
      this.tip.hidden = false;
      const tw = this.tip.offsetWidth, th = this.tip.offsetHeight;
      this.tip.style.left = Math.min(Math.max(x - tw / 2, 4), this.W - tw - 4) + 'px';
      this.tip.style.top  = (y - th - 14 < 0 ? y + 14 : y - th - 14) + 'px';
    } else this.tip.hidden = true;
    if (!this.running) this.draw(0);
  }
}

window.NetworkMap = NetworkMap;
