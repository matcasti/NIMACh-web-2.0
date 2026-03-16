/**
 * NIM-ACh — Brain3D
 * Visualización 3D interactiva del eje cerebro-corazón.
 * Reutiliza la paleta de colores de variables.css.
 * Activado desde el botón #btn-3d en el hero.
 */
class Brain3DViewer {
  constructor() {
    this.overlay  = null;
    this.renderer = null;
    this.scene    = null;
    this.camera   = null;
    this.animId   = null;
    this.isDragging = false;
    this.prevMouse  = { x: 0, y: 0 };
    this.rotation   = { x: .3, y: 0 };
    this.autoRotate = true;
    this.frame      = 0;

    this.bindTrigger();
  }

  bindTrigger() {
    const btn = document.getElementById('btn-3d');
    if (btn) btn.addEventListener('click', () => this.open());
  }

  async open() {
    // Carga Three.js desde CDN sólo cuando se abre el viewer
    if (!window.THREE) {
      await this.loadScript(
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
      );
    }
    this.buildOverlay();
    this.initScene();
    this.animate();
  }

  loadScript(src) {
    return new Promise((res, rej) => {
      const s  = document.createElement('script');
      s.src    = src;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  buildOverlay() {
    // Reutiliza overlay si ya existe
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      return;
    }

    this.overlay = document.createElement('div');
    this.overlay.id = 'brain3d-overlay';
    this.overlay.style.cssText = `
      position:fixed;inset:0;
      background:rgba(6,14,30,.96);
      backdrop-filter:blur(16px);
      z-index:500;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
    `;

    this.overlay.innerHTML = `
      <div style="position:relative;width:min(640px,96vw);">
        <canvas id="brain3d-canvas" style="width:100%;border-radius:16px;display:block;"></canvas>
        <button id="brain3d-close" style="
          position:absolute;top:-44px;right:0;
          background:rgba(255,255,255,.08);border:none;
          color:#e8f0fa;width:36px;height:36px;border-radius:50%;
          font-size:18px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;
        ">✕</button>
        <div style="margin-top:18px;text-align:center;">
          <p style="font-size:13px;color:#7a9bbf;line-height:1.6;">
            El eje <em style="color:#e87040;">cerebro</em>–<em style="color:#7fb3e8;">corazón</em>
            como sistema integrado de regulación autonómica.<br>
            <span style="font-size:10px;opacity:.6;">Arrastra para rotar · Scroll para zoom</span>
          </p>
        </div>
        <div id="brain3d-labels" style="
          display:flex;justify-content:center;gap:24px;
          margin-top:12px;flex-wrap:wrap;
        ">
          <span style="font-size:11px;color:#7fb3e8;display:flex;align-items:center;gap:5px;">
            <span style="width:8px;height:8px;border-radius:50%;background:#7fb3e8;display:inline-block;"></span>
            Red neuronal cortical
          </span>
          <span style="font-size:11px;color:#e87040;display:flex;align-items:center;gap:5px;">
            <span style="width:8px;height:8px;border-radius:50%;background:#e87040;display:inline-block;"></span>
            Nodo cardíaco
          </span>
          <span style="font-size:11px;color:#1db884;display:flex;align-items:center;gap:5px;">
            <span style="width:8px;height:8px;border-radius:50%;background:#1db884;display:inline-block;"></span>
            Eje vago (X par craneal)
          </span>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    document.body.style.overflow = 'hidden';

    document.getElementById('brain3d-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', e => {
      if (e.target === this.overlay) this.close();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.close();
    });

    this.initMouseInteraction();
  }

  initScene() {
    const { THREE } = window;
    const canvas    = document.getElementById('brain3d-canvas');
    const W = canvas.offsetWidth  || 640;
    const H = Math.round(W * .65);
    canvas.width  = W;
    canvas.height = H;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, W / H, .1, 100);
    this.camera.position.z = 4.5;

    // Lights
    const ambient = new THREE.AmbientLight(0x223355, .8);
    const point1  = new THREE.PointLight(0x3b7abf, 1.4, 20);
    const point2  = new THREE.PointLight(0xe87040, 1.0, 20);
    point1.position.set( 3,  4, 3);
    point2.position.set(-3, -4, 3);
    this.scene.add(ambient, point1, point2);

    // ── CEREBRO: esfera de partículas ──
    const brainGroup = new THREE.Group();
    const brainGeo   = new THREE.SphereGeometry(1.1, 24, 24);
    const brainPos   = brainGeo.attributes.position;
    const brainMat   = new THREE.PointsMaterial({
      color: 0x7fb3e8,
      size:  .04,
      transparent: true,
      opacity: .75,
    });
    this.brain = new THREE.Points(brainGeo, brainMat);
    brainGroup.position.y = .7;
    brainGroup.add(this.brain);
    this.scene.add(brainGroup);

    // Red de conexiones corticales
    const connGeo = new THREE.BufferGeometry();
    const connVerts = [];
    const count = brainPos.count;
    for (let i = 0; i < 120; i++) {
      const a = Math.floor(Math.random() * count);
      const b = Math.floor(Math.random() * count);
      connVerts.push(
        brainPos.getX(a), brainPos.getY(a), brainPos.getZ(a),
        brainPos.getX(b), brainPos.getY(b), brainPos.getZ(b)
      );
    }
    connGeo.setAttribute('position', new THREE.Float32BufferAttribute(connVerts, 3));
    const connMat = new THREE.LineSegments(connGeo, new THREE.LineBasicMaterial({
      color: 0x3b7abf, transparent: true, opacity: .22
    }));
    brainGroup.add(connMat);
    this.brainGroup = brainGroup;

    // ── CORAZÓN: toro pulsante ──
    this.heartGroup = new THREE.Group();
    this.heartGroup.position.y = -.9;

    // Toro principal
    const torusGeo = new THREE.TorusGeometry(.38, .14, 16, 60);
    const torusMat = new THREE.MeshPhongMaterial({
      color: 0xe87040,
      emissive: 0x5a1500,
      shininess: 80,
      transparent: true,
      opacity: .88,
    });
    this.torus = new THREE.Mesh(torusGeo, torusMat);
    this.torus.rotation.x = Math.PI / 2.2;
    this.heartGroup.add(this.torus);

    // Glow del corazón
    const glowGeo = new THREE.SphereGeometry(.52, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xe87040, transparent: true, opacity: .06, wireframe: false
    });
    this.heartGlow = new THREE.Mesh(glowGeo, glowMat);
    this.heartGroup.add(this.heartGlow);

    this.scene.add(this.heartGroup);

    // ── EJE VAGO: curva conectora ──
    const vagusPoints = [];
    for (let t = 0; t <= 1; t += .02) {
      const y = -.9 + t * 1.6;
      const x = Math.sin(t * Math.PI * 2) * .18;
      vagusPoints.push(new THREE.Vector3(x, y, 0));
    }
    const vagusCurve = new THREE.CatmullRomCurve3(vagusPoints);
    const vagusGeo   = new THREE.TubeGeometry(vagusCurve, 80, .018, 8, false);
    const vagusMat   = new THREE.MeshBasicMaterial({
      color: 0x1db884, transparent: true, opacity: .7
    });
    this.vagus = new THREE.Mesh(vagusGeo, vagusMat);
    this.scene.add(this.vagus);

    // ── PULSO: esfera viajera sobre el vago ──
    const pulseGeo = new THREE.SphereGeometry(.06, 8, 8);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0x1db884 });
    this.pulseBall = new THREE.Mesh(pulseGeo, pulseMat);
    this.scene.add(this.pulseBall);
    this._vagusCurve = vagusCurve;

    // ── Partículas flotantes de fondo ──
    const bgGeo  = new THREE.BufferGeometry();
    const bgVert = new Float32Array(300 * 3);
    for (let i = 0; i < bgVert.length; i++) bgVert[i] = (Math.random() - .5) * 8;
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgVert, 3));
    const bgMat = new THREE.PointsMaterial({
      color: 0x2a4a6a, size: .03, transparent: true, opacity: .6
    });
    this.scene.add(new THREE.Points(bgGeo, bgMat));
  }

  animate() {
    this.animId = requestAnimationFrame(() => this.animate());
    const { THREE } = window;
    this.frame++;
    const t = this.frame * .012;

    // Auto-rotate
    if (this.autoRotate) {
      this.rotation.y += .005;
    }

    // Aplica rotación a toda la escena
    this.scene.rotation.y = this.rotation.y;
    this.scene.rotation.x = this.rotation.x;

    // Pulso del cerebro
    if (this.brain) {
      this.brain.material.opacity = .6 + Math.sin(t * 1.5) * .15;
    }

    // Pulso del corazón (simula sístole)
    if (this.torus) {
      const heartbeat = .9 + .12 * Math.abs(Math.sin(t * 2.2)) +
                        .05 * Math.abs(Math.sin(t * 2.2 * 2));
      this.torus.scale.setScalar(heartbeat);
      this.torus.material.emissiveIntensity = .4 + heartbeat * .3;
    }

    if (this.heartGlow) {
      const gp = .9 + Math.abs(Math.sin(t * 2.2)) * .15;
      this.heartGlow.scale.setScalar(gp);
      this.heartGlow.material.opacity = .04 + Math.abs(Math.sin(t * 2.2)) * .08;
    }

    // Pulso viajando por el vago
    if (this.pulseBall && this._vagusCurve) {
      const progress = (t * .5 * 2.2 % Math.PI) / Math.PI; // sync con corazón
      const pt = this._vagusCurve.getPoint(Math.min(progress, .99));
      this.pulseBall.position.copy(pt);
      this.pulseBall.material.opacity = .5 + Math.sin(progress * Math.PI) * .5;
    }

    this.renderer.render(this.scene, this.camera);
  }

  initMouseInteraction() {
    const canvas = document.getElementById('brain3d-canvas');
    if (!canvas) return;

    canvas.addEventListener('mousedown', e => {
      this.isDragging = true;
      this.autoRotate = false;
      this.prevMouse  = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', e => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouse.x;
      const dy = e.clientY - this.prevMouse.y;
      this.rotation.y += dx * .007;
      this.rotation.x += dy * .007;
      this.rotation.x  = Math.max(-.8, Math.min(.8, this.rotation.x));
      this.prevMouse   = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      setTimeout(() => { this.autoRotate = true; }, 2500);
    });

    canvas.addEventListener('wheel', e => {
      if (!this.camera) return;
      this.camera.position.z = Math.max(2.5,
        Math.min(8, this.camera.position.z + e.deltaY * .005));
      e.preventDefault();
    }, { passive: false });

    // Touch
    canvas.addEventListener('touchstart', e => {
      this.isDragging = true;
      this.autoRotate = false;
      this.prevMouse  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });
    canvas.addEventListener('touchmove', e => {
      if (!this.isDragging) return;
      const dx = e.touches[0].clientX - this.prevMouse.x;
      const dy = e.touches[0].clientY - this.prevMouse.y;
      this.rotation.y += dx * .007;
      this.rotation.x += dy * .007;
      this.prevMouse   = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
      setTimeout(() => { this.autoRotate = true; }, 2500);
    });
  }

  close() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = null;
    if (this.overlay) this.overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  destroy() {
    this.close();
    if (this.renderer) this.renderer.dispose();
  }
}

window.Brain3DViewer = Brain3DViewer;
