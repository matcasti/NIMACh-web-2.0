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

    // Config
    this.NODE_COUNT = 70;
    this.MAX_DIST   = 145;
    this.HEART_RATIO = 0.18; // fraction of orange "cardiac" nodes

    this.init();
    this.bindEvents();
    this.draw();
  }

  resize() {
    this.W = this.canvas.width  = this.container.offsetWidth;
    this.H = this.canvas.height = this.container.offsetHeight;
    this.buildNodes();
  }

  buildNodes() {
    this.nodes = Array.from({ length: this.NODE_COUNT }, () => ({
      x:      Math.random() * this.W,
      y:      Math.random() * this.H,
      vx:     (Math.random() - .5) * .42,
      vy:     (Math.random() - .5) * .42,
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
        n.vx += (dx / d) * .016;
        n.vy += (dy / d) * .016;
      }

      // cap speed
      const spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (spd > .9) { n.vx /= spd * 1.1; n.vy /= spd * 1.1; }
    });
  }

  drawLines() {
    const ctx = this.ctx;
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d > this.MAX_DIST) continue;

        const alpha   = (1 - d / this.MAX_DIST) * .38;
        const isHeart = a.heart || b.heart;
        ctx.beginPath();
        ctx.strokeStyle = isHeart
          ? `rgba(232,112,64,${alpha})`
          : `rgba(59,122,191,${alpha})`;
        ctx.lineWidth = isHeart ? .75 : .48;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  drawNodes() {
    const ctx = this.ctx;
    this.nodes.forEach(n => {
      const p     = .75 + Math.sin(n.pulse) * .25;
      const alpha = [.28, .52, .82][n.layer];

      if (n.heart) {
        // radial glow
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 5);
        g.addColorStop(0, `rgba(232,112,64,${.14 * p})`);
        g.addColorStop(1, 'rgba(232,112,64,0)');
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 5, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * p, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232,112,64,${alpha})`;
        ctx.fill();
      } else {
        if (n.layer === 2) {
          const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3);
          g.addColorStop(0, `rgba(127,179,232,${.12 * p})`);
          g.addColorStop(1, 'rgba(127,179,232,0)');
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * p, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(127,179,232,${alpha * p})`;
        ctx.fill();
      }
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.W, this.H);
    this.frame++;
    this.update();
    this.drawLines();
    this.drawNodes();
    this.animId = requestAnimationFrame(() => this.draw());
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
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}

// DEI section — lighter particle field
class ParticleField {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.pts = [];
    this.init();
    this.draw();
    window.addEventListener('resize', () => this.init());
  }

  init() {
    const c = this.canvas;
    this.W = c.width  = c.offsetWidth;
    this.H = c.height = c.offsetHeight;
    this.pts = Array.from({ length: 30 }, () => ({
      x:  Math.random() * this.W,
      y:  Math.random() * this.H,
      vx: (Math.random() - .5) * .16,
      vy: (Math.random() - .5) * .16,
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
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fill();
    });
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d > 115) continue;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,255,255,${(1 - d / 115) * .22})`;
        ctx.lineWidth = .38;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    requestAnimationFrame(() => this.draw());
  }
}

/**
 * CollabMap — Mapa de colaboraciones internacionales
 * SVG-path simplificado de Sudamérica/Europa con nodos animados.
 */
class CollabMap {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.frame = 0;

    // Coordenadas normalizadas [x%,y%] sobre el canvas
    // proyección simple equirectangular recortada al área relevante
    this.nodes = [
      { x:.12, y:.72, label:'Punta Arenas',     color:'#e87040', r:7, home:true  },
      { x:.13, y:.38, label:'Santiago',          color:'#7fb3e8', r:4, home:false },
      { x:.22, y:.30, label:'Brasil · MEDIANTAR',color:'#7fb3e8', r:5, home:false },
      { x:.20, y:.20, label:'México · RIES-LAC', color:'rgba(127,179,232,.6)', r:4, home:false },
      { x:.67, y:.18, label:'España · ERASMUS+', color:'#7fb3e8', r:5, home:false },
      { x:.59, y:.15, label:'Francia',           color:'rgba(127,179,232,.5)', r:3, home:false },
      { x:.72, y:.21, label:'Italia',            color:'rgba(127,179,232,.5)', r:3, home:false },
    ];

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.draw();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.W = this.canvas.width  = rect.width  || 900;
    this.H = this.canvas.height = 260;
  }

  draw() {
    const { ctx, W, H } = this;
    this.frame++;
    ctx.clearRect(0, 0, W, H);

    // Fondo sutil
    ctx.fillStyle = 'rgba(59,122,191,.03)';
    ctx.fillRect(0, 0, W, H);

    // Líneas de conexión pulsantes desde sede
    const home = this.nodes[0];
    const hx = home.x * W, hy = home.y * H;

    this.nodes.slice(1).forEach((n, i) => {
      const nx = n.x * W, ny = n.y * H;
      const pulse = .4 + Math.sin(this.frame * .03 + i * .8) * .3;

      // Línea curva
      ctx.beginPath();
      ctx.strokeStyle = n.color.includes('rgba')
        ? n.color
        : `rgba(127,179,232,${pulse * .5})`;
      ctx.lineWidth = .8;
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = -this.frame * .4;

      // Bezier curva para simular arco de globo
      const mx = (hx + nx) / 2;
      const my = Math.min(hy, ny) - Math.abs(nx - hx) * .25;
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(mx, my, nx, ny);
      ctx.stroke();
      ctx.setLineDash([]);

      // Punto parpadeante en destino
      const glow = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r * 3);
      glow.addColorStop(0, `rgba(127,179,232,${pulse * .2})`);
      glow.addColorStop(1, 'rgba(127,179,232,0)');
      ctx.beginPath();
      ctx.arc(nx, ny, n.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(nx, ny, n.r * (.8 + Math.sin(this.frame * .05 + i) * .2), 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.fill();

      // Label
      ctx.fillStyle = 'rgba(122,155,191,.8)';
      ctx.font      = '9px Sora, sans-serif';
      ctx.textAlign = nx > W / 2 ? 'right' : 'left';
      const offX    = nx > W / 2 ? -n.r - 4 : n.r + 4;
      ctx.fillText(n.label, nx + offX, ny + 3);
    });

    // Nodo sede (más grande, siempre encima)
    const pulseHome = 1 + Math.sin(this.frame * .06) * .15;
    const gHome = ctx.createRadialGradient(hx, hy, 0, hx, hy, home.r * 4);
    gHome.addColorStop(0, 'rgba(232,112,64,.25)');
    gHome.addColorStop(1, 'rgba(232,112,64,0)');
    ctx.beginPath();
    ctx.arc(hx, hy, home.r * 4, 0, Math.PI * 2);
    ctx.fillStyle = gHome;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(hx, hy, home.r * pulseHome, 0, Math.PI * 2);
    ctx.fillStyle = home.color;
    ctx.fill();

    ctx.fillStyle = '#e8f0fa';
    ctx.font = 'bold 9px Sora, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Punta Arenas', hx + home.r + 4, hy + 3);

    requestAnimationFrame(() => this.draw());
  }
}

// Export for use in main.js
window.CollabMap = CollabMap;
window.NeuralCanvas   = NeuralCanvas;
window.ParticleField  = ParticleField;
