/**
 * NIM-ACh — GlobeViewer
 * Globo terrestre 3D estilo GitHub con Three.js r128.
 * Muestra puntos de colaboración y arcos animados.
 * Carga Three.js de forma lazy (ya disponible si brain3d lo cargó).
 */
class GlobeViewer {
  constructor(canvasId) {
    this.canvasEl = document.getElementById(canvasId);
    if (!this.canvasEl) return;

    this.frame      = 0;
    this.isDragging = false;
    this.prevMouse  = { x: 0, y: 0 };
    this.rotY       = 1.2;   // vista inicial sobre Sudamérica
    this.rotX       = 0.28;
    this.autoRotate = true;
    this.animId     = null;

    this._arcs = [];   // arcos animados entre puntos
    this._pts  = [];   // meshes de puntos

    this._boot();
  }

  async _boot() {
    if (!window.THREE) {
      await this._loadScript(
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
      );
    }
    await new Promise(r => requestAnimationFrame(r)); // esperar layout
    this._init();
    this._animate();
    this._bindEvents();
  }

  _loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  _init() {
    const T  = window.THREE;
    const el = this.canvasEl;
    const W  = el.offsetWidth  || 520;
    const H  = el.offsetHeight || 520;
    el.width  = W;
    el.height = H;

    // Renderer
    this.renderer = new T.WebGLRenderer({ canvas: el, antialias: true, alpha: true });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    // Scene
    this.scene = new T.Scene();

    // Camera
    this.camera = new T.PerspectiveCamera(42, W / H, 0.1, 100);
    this.camera.position.z = 2.8;

    // Grupo raíz — toda la escena rota aquí
    this.globe = new T.Group();
    this.scene.add(this.globe);

    this._buildLights();
    this._buildSphere();
    this._buildGrid();
    this._buildAtmosphere();
    this._buildPoints();
    this._buildArcs();
  }

  /* ── Iluminación ── */
  _buildLights() {
    const T = window.THREE;
    this.scene.add(new T.AmbientLight(0x1a2a40, 2.0));

    const sun = new T.DirectionalLight(0x7fb3e8, 1.8);
    sun.position.set(5, 3, 4);
    this.scene.add(sun);

    const rim = new T.PointLight(0xe87040, 0.9, 14);
    rim.position.set(-4, -2, -3);
    this.scene.add(rim);
  }

  /* ── Esfera principal ── */
  _buildSphere() {
    const T = window.THREE;

    // Base oscura
    this.sphereMesh = new T.Mesh(
      new T.SphereGeometry(1, 64, 64),
      new T.MeshPhongMaterial({
        color:    0x040e20,
        emissive: 0x010608,
        shininess: 18,
      })
    );
    this.globe.add(this.sphereMesh);

    // Textura de puntos de tierra (dot-matrix style)
    // Generamos un canvas con los continentes aproximados en puntos
    const dotCanvas = this._buildDotTexture(2048, 1024);
    const dotTex    = new T.CanvasTexture(dotCanvas);

    this.globe.add(new T.Mesh(
      new T.SphereGeometry(1.001, 64, 64),
      new T.MeshBasicMaterial({
        map: dotTex, transparent: true, opacity: 1,
        depthWrite: false,
      })
    ));
  }

  /* ── Textura de continentes en puntos ── */
  _buildDotTexture(W, H) {
    const cv  = document.createElement('canvas');
    cv.width  = W; cv.height = H;
    const ctx = cv.getContext('2d');

    // Mapa de tierra simplificado como máscara lat/lon
    // Usamos una función de "¿es tierra?" basada en polígonos simplificados
    const isLand = this._landMask();

    const STEP = 4; // paso de grilla en píxeles
    const DOT  = 1.8;

    for (let y = 0; y < H; y += STEP) {
      for (let x = 0; x < W; x += STEP) {
        const lon = (x / W) * 360 - 180;
        const lat = 90 - (y / H) * 180;
        if (!isLand(lat, lon)) continue;

        // Color base teal/blue con variación sutil
        const bright = 0.28 + Math.random() * 0.14;
        ctx.beginPath();
        ctx.arc(x, y, DOT, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.round(30+bright*40)},${Math.round(100+bright*60)},${Math.round(140+bright*50)},${0.7 + bright * 0.3})`;
        ctx.fill();
      }
    }
    return cv;
  }

  /* ── Máscara tierra simplificada (polígonos principales) ── */
  _landMask() {
    // Rectángulos aproximados de los continentes principales
    // [latMin, latMax, lonMin, lonMax]
    const boxes = [
      // América del Norte
      [25, 72, -168, -52],
      // América Central
      [7, 25, -92, -60],
      // América del Sur
      [-56, 12, -82, -34],
      // Europa Occidental
      [36, 72, -10, 42],
      // África
      [-35, 37, -18, 52],
      // Asia Occidental
      [12, 42, 26, 64],
      // Asia Central y del Sur
      [5, 55, 60, 145],
      // Asia Oriental
      [18, 55, 100, 145],
      // Sudeste Asiático
      [-8, 22, 95, 142],
      // Oceanía
      [-45, -10, 113, 155],
      // Groenlandia
      [60, 83, -58, -15],
      // Antártida
      [-90, -70, -180, 180],
      // Islandia
      [63, 67, -25, -12],
      // Japón (aprox)
      [30, 46, 128, 146],
      // Gran Bretaña
      [50, 59, -6, 2],
      // Escandinavia
      [55, 72, 4, 32],
      // Madagascar
      [-26, -12, 43, 51],
    ];

    return (lat, lon) => {
      return boxes.some(([latMin, latMax, lonMin, lonMax]) =>
        lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax
      );
    };
  }

  /* ── Grilla lat/lon ── */
  _buildGrid() {
    const T = window.THREE;

    // Meridianos (verticales)
    for (let lon = -180; lon < 180; lon += 30) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 2) {
        pts.push(this._latLonToVec3(lat, lon, 1.005));
      }
      this.globe.add(new T.Line(
        new T.BufferGeometry().setFromPoints(pts),
        new T.LineBasicMaterial({ color: 0x0d2840, transparent: true, opacity: 0.4 })
      ));
    }

    // Paralelos (horizontales)
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      for (let lon = -180; lon <= 180; lon += 2) {
        pts.push(this._latLonToVec3(lat, lon, 1.005));
      }
      this.globe.add(new T.Line(
        new T.BufferGeometry().setFromPoints(pts),
        new T.LineBasicMaterial({ color: 0x0d2840, transparent: true, opacity: 0.3 })
      ));
    }
  }

  /* ── Atmósfera / halo ── */
  _buildAtmosphere() {
    const T = window.THREE;
    this.scene.add(new T.Mesh(
      new T.SphereGeometry(1.15, 32, 32),
      new T.MeshBasicMaterial({
        color: 0x0a3060, transparent: true, opacity: 0.13, side: T.BackSide,
      })
    ));
    this.scene.add(new T.Mesh(
      new T.SphereGeometry(1.08, 32, 32),
      new T.MeshBasicMaterial({
        color: 0x112244, transparent: true, opacity: 0.07, side: T.BackSide,
      })
    ));
  }

  /* ── Puntos de colaboración ── */
  _buildPoints() {
    const T      = window.THREE;
    const points = window.NIMACH_DATA?.globePoints || [];

    points.forEach(p => {
      const pos = this._latLonToVec3(p.lat, p.lon, 1.012);

      // Anillo exterior parpadeante
      const ringGeo = new T.RingGeometry(p.r * 0.022, p.r * 0.036, 16);
      const ringMat = new T.MeshBasicMaterial({
        color: parseInt(p.color.replace('#',''), 16),
        transparent: true, opacity: 0.55, side: T.DoubleSide,
      });
      const ring = new T.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(pos.clone().multiplyScalar(2)); // apuntar hacia afuera
      this.globe.add(ring);

      // Punto central
      const dot = new T.Mesh(
        new T.CircleGeometry(p.r * 0.014, 12),
        new T.MeshBasicMaterial({
          color: parseInt(p.color.replace('#',''), 16),
          transparent: true, opacity: p.home ? 1 : 0.85, side: T.DoubleSide,
        })
      );
      dot.position.copy(pos);
      dot.lookAt(pos.clone().multiplyScalar(2));
      this.globe.add(dot);

      // Halo glow
      const halo = new T.Mesh(
        new T.CircleGeometry(p.r * 0.07, 16),
        new T.MeshBasicMaterial({
          color: parseInt(p.color.replace('#',''), 16),
          transparent: true, opacity: 0.08, side: T.DoubleSide,
        })
      );
      halo.position.copy(pos);
      halo.lookAt(pos.clone().multiplyScalar(2));
      this.globe.add(halo);

      this._pts.push({ ring, dot, halo, color: p.color, home: p.home });
    });
  }

  /* ── Arcos entre puntos ── */
  _buildArcs() {
    const T      = window.THREE;
    const points = window.NIMACH_DATA?.globePoints || [];
    const home   = points.find(p => p.home);
    if (!home) return;

    points.filter(p => !p.home).forEach((p, i) => {
      const start = this._latLonToVec3(home.lat, home.lon, 1.012);
      const end   = this._latLonToVec3(p.lat,   p.lon,   1.012);
      const pts   = this._buildArcPoints(start, end, 80);

      const geo = new T.BufferGeometry().setFromPoints(pts);
      const col = parseInt(p.color.replace('#',''), 16);

      const arc = new T.Line(geo, new T.LineBasicMaterial({
        color: col, transparent: true, opacity: 0.0,
      }));
      this.globe.add(arc);

      // Pulso: esfera viajando por el arco
      const pulse = new T.Mesh(
        new T.SphereGeometry(0.015, 6, 6),
        new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0 })
      );
      this.globe.add(pulse);

      this._arcs.push({
        arc, pulse,
        pts,
        t: Math.random(),            // fase inicial aleatoria
        speed: 0.0025 + Math.random() * 0.002,
        col,
        delay: i * 0.18,
      });
    });
  }

  /* ── Interpolación geodésica (great circle arc) ── */
  _buildArcPoints(start, end, segments) {
    const T    = window.THREE;
    const pts  = [];
    const axis = start.clone().cross(end).normalize();
    const angle = start.angleTo(end);

    for (let i = 0; i <= segments; i++) {
      const t   = i / segments;
      const a   = angle * t;
      // Elevar el arco sobre la superficie con una envolvente gaussiana
      const h   = 1.0 + 0.38 * Math.sin(Math.PI * t);
      const v   = start.clone().applyAxisAngle(axis, a).normalize().multiplyScalar(h);
      pts.push(v);
    }
    return pts;
  }

  /* ── Conversión lat/lon → Vector3 ── */
  _latLonToVec3(lat, lon, r = 1) {
    const T   = window.THREE;
    const phi = (90 - lat) * (Math.PI / 180);
    const tht = (lon + 180) * (Math.PI / 180);
    return new T.Vector3(
      -r * Math.sin(phi) * Math.cos(tht),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(tht)
    );
  }

  /* ── Loop de animación ── */
  _animate() {
    this.animId = requestAnimationFrame(() => this._animate());
    this.frame++;
    const t = this.frame * 0.016;

    // Auto-rotación lenta
    if (this.autoRotate) this.rotY += 0.0018;

    this.globe.rotation.y = this.rotY;
    this.globe.rotation.x = this.rotX;

    // Pulso de puntos
    this._pts.forEach((p, i) => {
      const pulse = 0.5 + Math.sin(t * 1.8 + i * 0.7) * 0.5;
      p.ring.material.opacity = 0.3 + pulse * 0.5;
      const s = 1 + pulse * (p.home ? 0.5 : 0.35);
      p.ring.scale.setScalar(s);
      if (p.home) p.dot.material.opacity = 0.8 + pulse * 0.2;
    });

    // Arcos y pulsos viajando
    this._arcs.forEach((a) => {
      a.t += a.speed;
      if (a.t > 1) a.t -= 1;

      const idx = Math.floor(a.t * (a.pts.length - 1));
      a.pulse.position.copy(a.pts[idx]);

      // Fade en extremos
      const fade = Math.min(a.t, 1 - a.t) * 8;
      a.pulse.material.opacity = Math.min(fade, 0.9);
      a.arc.material.opacity   = 0.18 + Math.sin(t * 0.8 + a.delay) * 0.10;
    });

    this.renderer.render(this.scene, this.camera);
  }

  /* ── Eventos de interacción ── */
  _bindEvents() {
    const el = this.canvasEl;
    if (!el) return;

    const onDown = (x, y) => {
      this.isDragging = true;
      this.autoRotate = false;
      this.prevMouse  = { x, y };
    };
    const onMove = (x, y) => {
      if (!this.isDragging) return;
      this.rotY += (x - this.prevMouse.x) * 0.006;
      this.rotX += (y - this.prevMouse.y) * 0.004;
      this.rotX  = Math.max(-0.6, Math.min(0.6, this.rotX));
      this.prevMouse = { x, y };
    };
    const onUp = () => {
      this.isDragging = false;
      setTimeout(() => { this.autoRotate = true; }, 2000);
    };

    el.addEventListener('mousedown',  e => onDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup',   onUp);
    el.addEventListener('touchstart', e => onDown(e.touches[0].clientX, e.touches[0].clientY));
    el.addEventListener('touchmove',  e => {
      onMove(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchend', onUp);

    // Zoom con scroll
    el.addEventListener('wheel', e => {
      this.camera.position.z = Math.max(1.8, Math.min(4.5,
        this.camera.position.z + e.deltaY * 0.003));
      e.preventDefault();
    }, { passive: false });

    // Resize
    window.addEventListener('resize', () => {
      const W = el.offsetWidth, H = el.offsetHeight;
      if (!W || !H) return;
      el.width = W; el.height = H;
      this.renderer.setSize(W, H);
      this.camera.aspect = W / H;
      this.camera.updateProjectionMatrix();
    });
  }
}

window.GlobeViewer = GlobeViewer;
