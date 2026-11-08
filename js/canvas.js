/**
 * NIM-ACh — Neural Network Canvas
 * Multi-layer particle network with mouse interaction.
 * Represents the brain-heart axis visually.
 */

class NeuralCanvas {
  constructor(canvasId, containerId) {
    this.canvas = document.getElementById(canvasId);
    this.container = document.getElementById(containerId);
    if (!this.canvas || !this.container) return;

    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.mouse = { x: -999, y: -999 };
    this.frame = 0;
    this.animId = null;

    // Config — la densidad se adapta a la pantalla y a la capacidad del equipo
    this.NODE_COUNT = window.NIMSmart ? NIMSmart.scale(70, { min: 22 }) : 70;
    this.MAX_DIST   = window.innerWidth < 640 ? 105 : 145;
    this.HEART_RATIO = 0.15; // fraction of orange "cardiac" nodes
    this.running = false;

    this.bindEvents();
    NIMSmart.onTheme(() => { if (!this.running) this.renderOnce(); });

    // Solo anima mientras el hero se ve y la pestaña está activa;
    // con "reducir movimiento" dibuja un único cuadro estático.
    if (window.NIMSmart) {
      NIMSmart.whenVisible(this.container, () => this.start(), () => this.stop(),
        { once: () => this.renderOnce() });
    } else {
      this.start();
    }
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);   // nítido en pantallas retina
    this.W = this.container.offsetWidth;
    this.H = this.container.offsetHeight;
    this.canvas.width  = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.buildNodes();
    if (!this.running) this.renderOnce();
  }

  start() {
    if (this.running) return;
    this.running = true;
    cancelAnimationFrame(this.animId);
    this.draw();
  }

  stop() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = null;
  }

  renderOnce() {
    this.ctx.clearRect(0, 0, this.W, this.H);
    this.drawLines();
    this.drawNodes();
  }

  buildNodes() {
    this.nodes = Array.from({ length: this.NODE_COUNT }, () => ({
      x:      Math.random() * this.W,
      y:      Math.random() * this.H,
      vx:     (Math.random() - .5) * 50,
      vy:     (Math.random() - .5) * 50,
      r:       Math.random() * 2.2 + 1.2,
      heart:   Math.random() < this.HEART_RATIO,
      pulse:   Math.random() * Math.PI * 2,
      ps:      .018 + Math.random() * .022,
      layer:   Math.floor(Math.random() * 3), // 0=back 1=mid 2=front
    }));
  }

  update() {
    this.nodes.forEach(n => {
      n.pulse += n.ps;
      const speed = [.45, .9, 1.5][n.layer];
      n.x += n.vx * speed;
      n.y += n.vy * speed;

      // wrap around edges
      if (n.x < -12) n.x = this.W + 12;
      if (n.x > this.W + 12) n.x = -12;
      if (n.y < -12) n.y = this.H + 12;
      if (n.y > this.H + 12) n.y = -12;

      // gentle mouse attraction
      const dx = this.mouse.x - n.x;
      const dy = this.mouse.y - n.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 30000 && d2 > 0) {
        const d = Math.sqrt(d2);
        n.vx += (dx / d) * .16;
        n.vy += (dy / d) * .16;
      }

      // cap speed
      const spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (spd > 1.9) { n.vx /= spd * 1.3; n.vy /= spd * 1.3; }
    });
  }

  drawLines() {
    const ctx = this.ctx, P = NIMSmart.palette();
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d > this.MAX_DIST) continue;

        const k       = 1 - d / this.MAX_DIST;
        const isHeart = a.heart || b.heart;      // los nodos "cardíacos" se tiñen con el acento
        ctx.beginPath();
        ctx.strokeStyle = isHeart ? `rgba(${P.accent}, ${k * .34})` : `rgba(${P.ink}, ${k * .13})`;
        ctx.lineWidth = isHeart ? .8 : .6;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  drawNodes() {
    const ctx = this.ctx, P = NIMSmart.palette();
    this.nodes.forEach(n => {
      const p     = .8 + Math.sin(n.pulse) * .2;
      const alpha = [.16, .3, .5][n.layer];
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * p, 0, Math.PI * 2);
      ctx.fillStyle = n.heart ? `rgba(${P.accent}, ${alpha + .25})` : `rgba(${P.ink}, ${alpha * .8})`;
      ctx.fill();
      if (n.heart) {                                   // anillo tenue, sin brillos
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 2.6 * p, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${P.accent}, .16)`;
        ctx.lineWidth = .8;
        ctx.stroke();
      }
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.W, this.H);
    this.frame++;
    this.update();
    this.drawLines();
    this.drawNodes();
    if (this.running) this.animId = requestAnimationFrame(() => this.draw());
  }

  bindEvents() {
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.x = -999;
      this.mouse.y = -999;
    });
    window.addEventListener('resize',
      window.NIMSmart ? NIMSmart.debounce(() => this.resize(), 120) : () => this.resize());
    this.resize();
  }

  destroy() {
    this.stop();
  }
}

// DEI section — lighter particle field
class ParticleField {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.pts = [];
    this.running = false;
    this.init();
    window.addEventListener('resize',
      window.NIMSmart ? NIMSmart.debounce(() => this.init(), 120) : () => this.init());
    if (window.NIMSmart) {
      NIMSmart.whenVisible(this.canvas,
        () => { this.running = true; cancelAnimationFrame(this.raf); this.draw(); },
        () => { this.running = false; cancelAnimationFrame(this.raf); },
        { once: () => { this.running = false; this.draw(); } });
    } else { this.running = true; this.draw(); }
  }

  init() {
    const c = this.canvas;
    this.W = c.width  = c.offsetWidth;
    this.H = c.height = c.offsetHeight;
    this.pts = Array.from({ length: window.NIMSmart ? NIMSmart.scale(30, { min: 10 }) : 30 }, () => ({
      x:  Math.random() * this.W,
      y:  Math.random() * this.H,
      vx: (Math.random() - .5) * .26,
      vy: (Math.random() - .5) * .26,
    }));
  }

  draw() {
    const { ctx, W, H, pts } = this;
    ctx.clearRect(0, 0, W, H);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${NIMSmart.palette().ink}, .35)`;
      ctx.fill();
    });
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d > 115) continue;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${NIMSmart.palette().ink}, ${(1 - d / 115) * .12})`;
        ctx.lineWidth = .38;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    if (this.running) this.raf = requestAnimationFrame(() => this.draw());
  }
}

window.NeuralCanvas   = NeuralCanvas;
window.ParticleField  = ParticleField;
