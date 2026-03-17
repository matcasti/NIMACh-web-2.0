/**
 * NIM-ACh — GlobeViewer v2
 *
 * Mejoras vs v1:
 *  ✦ Continentes reales — polígonos simplificados + ray casting
 *  ✦ Dots con glow tri-capa (outer haze · mid ring · solid core)
 *  ✦ Campo estelar — 2 000 puntos con variación de tamaño
 *  ✦ Atmósfera Fresnel — 3 esferas BackSide (azul · teal · exterior)
 *  ✦ Grilla lat/lon + trópicos y círculos polares destacados
 *  ✦ Anillo de escaneo pulsante sobre el ecuador
 *  ✦ Rings decorativos en polos
 *  ✦ Marcadores: spike + 3 anillos concéntricos + halo
 *  ✦ Arcos: TubeGeometry + tubo glow + trail de 3 esferas
 */

class GlobeViewer {

  /* ══════════ constructor ══════════ */

  constructor(canvasId) {
    this.canvasEl   = document.getElementById(canvasId);
    if (!this.canvasEl) return;
    this.frame      = 0;
    this.isDragging = false;
    this.prevMouse  = { x: 0, y: 0 };
    this.rotY       = 1.5;   // vista inicial centrada en las Américas
    this.rotX       = 0.22;
    this.autoRotate = true;
    this.animId     = null;
    this._arcs      = [];
    this._pts       = [];
    this._scanRing  = null;
    this._scanLine  = null;
    this._boot();
  }

  /* ══════════ boot ══════════ */

  async _boot() {
    if (!window.THREE) {
      await this._loadScript(
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
      );
    }
    // 2 frames para layout antes de medir offsetWidth
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
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

  /* ══════════ init ══════════ */

  _init() {
    const T  = window.THREE;
    const el = this.canvasEl;
    const W  = el.offsetWidth  || 520;
    const H  = el.offsetHeight || 520;
    el.width = W; el.height = H;

    this.renderer = new T.WebGLRenderer({ canvas: el, antialias: true, alpha: true });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    this.scene  = new T.Scene();
    this.camera = new T.PerspectiveCamera(42, W / H, 0.1, 200);
    this.camera.position.z = 4.6;

    // Grupo raíz — toda la geometría del globo rota aquí
    this.globe = new T.Group();
    this.scene.add(this.globe);

    this._buildLights();
    this._buildStars();
    this._buildSphere();      // base oscura + textura de dots
    this._buildGrid();         // lat/lon + trópicos
    this._buildAtmosphere();   // halos multi-capa
    this._buildScanRing();     // anillo ecuatorial animado
    this._buildPoints();       // marcadores de colaboración
    this._buildArcs();         // arcos de conexión
  }

  /* ══════════ iluminación ══════════ */

  _buildLights() {
    const T = window.THREE;

    // Ambiente oscuro azul-marino
    this.scene.add(new T.AmbientLight(0x0a1828, 2.0));

    // Sol (key light) — blanco-azulado, desde arriba-derecha
    const sun = new T.DirectionalLight(0x88bbdd, 2.4);
    sun.position.set(5, 3, 4);
    this.scene.add(sun);

    // Rim light — coral desde abajo-izquierda (borde caliente)
    const rim = new T.PointLight(0xe87040, 1.0, 20);
    rim.position.set(-5, -3, -3);
    this.scene.add(rim);

    // Fill — azul frío desde arriba-atrás
    const fill = new T.PointLight(0x2255aa, 0.7, 20);
    fill.position.set(0, 5, -4);
    this.scene.add(fill);
  }

  /* ══════════ estrellas ══════════ */

  _buildStars() {
    const T    = window.THREE;
    const dark = document.body.classList.contains('dark-mode') ||
                 localStorage.getItem('nimach-theme') === 'dark';

    // En modo claro las estrellas son muy sutiles (el canvas se embebe sobre blanco)
    const starOpacity = dark ? 0.85 : 0.18;
    const starColor   = dark ? 0xaaccff : 0x8899cc;

    const N    = 2000;
    const verts = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r     = 55 + Math.random() * 45;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      verts[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      verts[i*3+1] = r * Math.cos(phi);
      verts[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    }

    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(verts, 3));
    this._starsMat1 = new T.PointsMaterial({
      color: starColor, size: 0.07, transparent: true, opacity: starOpacity,
      sizeAttenuation: true,
    });
    this.scene.add(new T.Points(geo, this._starsMat1));

    const geo2 = new T.BufferGeometry();
    const v2   = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      const r     = 80 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      v2[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      v2[i*3+1] = r * Math.cos(phi);
      v2[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    }
    geo2.setAttribute('position', new T.BufferAttribute(v2, 3));
    this._starsMat2 = new T.PointsMaterial({
      color: 0xffffff, size: 0.12, transparent: true, opacity: starOpacity * 0.55,
      sizeAttenuation: true,
    });
    this.scene.add(new T.Points(geo2, this._starsMat2));
  }

  /* ══════════ esfera principal ══════════ */

  _buildSphere() {
    const T = window.THREE;

    // Base — océano oscuro con especular sutil
    this.sphereMesh = new T.Mesh(
      new T.SphereGeometry(1, 64, 64),
      new T.MeshPhongMaterial({
        color:     0x020c1a,
        emissive:  0x010508,
        shininess: 28,
        specular:  0x0e2244,
      })
    );
    this.globe.add(this.sphereMesh);

    // Capa de dots (continentes) — generada en canvas 2D
    const dotCanvas = this._buildDotTexture(1024, 512);
    const dotTex    = new T.CanvasTexture(dotCanvas);

    this.globe.add(new T.Mesh(
      new T.SphereGeometry(1.002, 64, 64),
      new T.MeshBasicMaterial({
        map: dotTex, transparent: true, opacity: 1, depthWrite: false,
      })
    ));
  }

  /* ══════════ textura de dots ══════════ */

  _buildDotTexture(W, H) {
    const cv  = document.createElement('canvas');
    cv.width  = W; cv.height = H;
    const ctx = cv.getContext('2d');

    const isLand = this._makeLandFn();
    const STEP   = 3.8; // px entre dots

    for (let py = 0; py < H; py += STEP) {
      for (let px = 0; px < W; px += STEP) {
        const lon = (px / W) * 360 - 180;
        const lat = 90 - (py / H) * 180;
        if (!isLand(lat, lon)) continue;

        // Color: teal-cyan en latitudes bajas, azul-claro en altas
        const norm = Math.abs(lat) / 90;   // 0 = ecuador, 1 = polo
        const r = Math.round(28  + norm * 22);
        const g = Math.round(140 - norm * 45);
        const b = Math.round(185 - norm * 25);

        // Halo exterior (bloom)
        ctx.beginPath();
        ctx.arc(px, py, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.10)`;
        ctx.fill();

        // Anillo medio
        ctx.beginPath();
        ctx.arc(px, py, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.30)`;
        ctx.fill();

        // Core sólido
        ctx.beginPath();
        ctx.arc(px, py, 1.0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
        ctx.fill();
      }
    }

    return cv;
  }

  /* ══════════ máscara de tierra — polígonos reales ══════════ */

  _makeLandFn() {
    /**
     * Polígonos simplificados [lat, lon] basados en Natural Earth.
     * Suficientemente precisos para la densidad de dots usada.
     */
    const continents = [

      /* ── Sudamérica ── */
      [[12,-73],[11,-64],[9,-63],[7,-61],[5,-57],[4,-51],[2,-51],
       [1,-50],[0,-50],[-2,-52],[-5,-35],[-9,-37],[-16,-39],
       [-23,-43],[-24,-47],[-26,-49],[-30,-51],[-33,-53],
       [-34,-57],[-36,-57],[-38,-57],[-39,-62],[-42,-65],
       [-48,-65],[-51,-69],[-53,-69],[-55,-65],[-56,-68],
       [-54,-71],[-50,-69],[-44,-66],[-39,-62],[-43,-74],
       [-38,-73],[-30,-72],[-22,-70],[-16,-72],[-12,-77],
       [-4,-81],[-1,-78],[1,-77],[4,-67],[7,-62],[9,-62],[12,-73]],

      /* ── Norteamérica (continental) ── */
      [[71,-141],[72,-157],[65,-168],[58,-164],[56,-160],
       [58,-137],[48,-124],[38,-123],[32,-117],[24,-110],
       [18,-90],[16,-87],[10,-84],[16,-87],[24,-79],
       [30,-81],[35,-76],[42,-70],[45,-63],[50,-66],
       [58,-64],[65,-65],[68,-74],[70,-95],[73,-85],
       [72,-78],[74,-88],[72,-100],[70,-115],[71,-141]],

      /* ── Alaska ── */
      [[72,-141],[72,-157],[65,-168],[58,-164],[56,-160],
       [57,-136],[60,-140],[65,-140],[68,-140],[72,-141]],

      /* ── Groenlandia ── */
      [[60,-45],[65,-55],[70,-52],[76,-56],[80,-60],
       [83,-45],[83,-25],[78,-18],[73,-22],[66,-38],[60,-45]],

      /* ── Europa (continental) ── */
      [[36,-9],[36,-5],[39,0],[43,3],[42,8],[44,12],[46,12],
       [41,20],[42,28],[41,29],[43,35],[47,39],[54,21],
       [57,8],[55,8],[51,2],[47,-2],[43,-9],[36,-9]],

      /* ── Escandinavia ── */
      [[55,8],[57,8],[63,14],[65,14],[70,17],[72,25],
       [71,28],[70,28],[65,25],[60,25],[58,22],[57,8],[55,8]],

      /* ── Islandia ── */
      [[63,-25],[65,-24],[65,-13],[63,-13],[63,-25]],

      /* ── Gran Bretaña + Irlanda ── */
      [[50,-6],[58,-6],[58,2],[50,2],[50,-6]],

      /* ── África ── */
      [[37,-6],[37,12],[32,32],[22,37],[12,44],[11,51],
       [0,42],[-12,40],[-26,33],[-35,18],[-34,26],
       [-28,32],[-10,40],[0,30],[5,8],[4,9],[8,2],
       [5,-5],[5,-17],[10,-16],[16,-17],
       [22,-17],[34,-5],[37,-6]],

      /* ── Africa interior (Golfo de Guinea) ── */
      [[-6,10],[-5,20],[-10,25],[0,30],[5,8],[0,5],[-5,10],[-6,10]],

      /* ── Península Arábiga ── */
      [[30,36],[22,37],[12,44],[12,51],[22,59],
       [26,57],[30,48],[32,36],[30,36]],

      /* ── Asia Occidental ── */
      [[37,36],[47,39],[43,35],[42,28],[41,29],[37,27],[37,36]],

      /* ── Asia Central ── */
      [[47,39],[57,60],[62,75],[55,75],[45,60],[35,58],[25,55],[37,50],[47,39]],

      /* ── India ── */
      [[22,68],[28,72],[28,88],[22,88],[15,80],[8,76],[8,80],[15,74],[20,70],[22,68]],

      /* ── Asia Oriental / China ── */
      [[55,75],[55,90],[55,105],[50,120],[38,120],
       [25,120],[18,110],[10,104],[5,100],[18,96],
       [22,90],[22,88],[27,70],[35,75],[45,75],[55,75]],

      /* ── Sureste asiático ── */
      [[22,90],[22,88],[18,96],[16,100],[5,103],[0,108],
       [5,103],[10,98],[16,100],[22,96],[22,90]],

      /* ── Borneo ── */
      [[7,109],[7,118],[1,117],[-4,116],[-4,108],[1,109],[7,109]],

      /* ── Sumatra ── */
      [[5,96],[5,106],[0,106],[-6,105],[-5,96],[0,96],[5,96]],

      /* ── Java ── */
      [[-7,105],[-6,108],[-8,114],[-8,110],[-7,105]],

      /* ── Japón (Honshū) ── */
      [[34,131],[38,141],[40,140],[44,141],[43,144],
       [41,141],[38,141],[33,131],[34,131]],

      /* ── Corea ── */
      [[35,126],[38,128],[42,130],[40,130],[35,126]],

      /* ── Australia ── */
      [[-40,144],[-32,115],[-22,114],[-14,126],
       [-12,136],[-10,142],[-12,144],[-15,145],
       [-22,150],[-28,153],[-38,146],[-40,144]],

      /* ── Nueva Zelanda — Isla Norte ── */
      [[-34,172],[-38,176],[-41,175],[-37,174],[-34,172]],

      /* ── Nueva Zelanda — Isla Sur ── */
      [[-40,172],[-45,167],[-46,170],[-43,173],[-40,172]],

      /* ── Madagascar ── */
      [[-12,44],[-26,44],[-26,51],[-12,51],[-12,44]],

      /* ── Sri Lanka ── */
      [[6,80],[10,80],[10,82],[6,82],[6,80]],

      /* ── Filipinas ── */
      [[18,120],[12,123],[7,122],[7,126],[10,126],[14,122],[18,122],[18,120]],

      /* ── Centroamérica ── */
      [[22,-87],[16,-87],[9,-83],[9,-75],[12,-72],[15,-83],[22,-87]],

      /* ── Cuba ── */
      [[22,-84],[22,-75],[20,-75],[20,-84],[22,-84]],

      /* ── Antártida ── */
      [[-67,-180],[-67,-90],[-68,-45],[-70,0],[-67,45],
       [-67,90],[-67,135],[-67,180],[-80,180],
       [-90,0],[-80,-180],[-67,-180]],
    ];

    // Pre-compute bounding boxes para early-exit
    const bboxes = continents.map(poly => {
      const lats = poly.map(p => p[0]);
      const lons = poly.map(p => p[1]);
      return {
        minLat: Math.min(...lats), maxLat: Math.max(...lats),
        minLon: Math.min(...lons), maxLon: Math.max(...lons),
      };
    });

    // Ray casting — point in polygon
    const pip = (lat, lon, poly) => {
      let inside = false;
      const n = poly.length;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [yi, xi] = poly[i];
        const [yj, xj] = poly[j];
        if (((yi > lat) !== (yj > lat)) &&
            lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      return inside;
    };

    return (lat, lon) => continents.some((c, i) => {
      const b = bboxes[i];
      if (lat < b.minLat || lat > b.maxLat ||
          lon < b.minLon || lon > b.maxLon) return false;
      return pip(lat, lon, c);
    });
  }

  /* ══════════ grilla lat/lon ══════════ */

  _buildGrid() {
    const T   = window.THREE;
    const SEG = 3;  // grado entre puntos de la línea

    const matMer = new T.LineBasicMaterial({
      color: 0x0b2240, transparent: true, opacity: 0.38,
    });
    const matPar = new T.LineBasicMaterial({
      color: 0x0b2240, transparent: true, opacity: 0.28,
    });
    const matTropic = new T.LineBasicMaterial({
      color: 0x163860, transparent: true, opacity: 0.55,
    });

    // Meridianos cada 30°
    for (let lon = -180; lon < 180; lon += 30) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += SEG)
        pts.push(this._ll2v(lat, lon, 1.006));
      this.globe.add(new T.Line(
        new T.BufferGeometry().setFromPoints(pts), matMer
      ));
    }

    // Paralelos cada 30°
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      for (let lon = -180; lon <= 180; lon += SEG)
        pts.push(this._ll2v(lat, lon, 1.006));
      this.globe.add(new T.Line(
        new T.BufferGeometry().setFromPoints(pts), matPar
      ));
    }

    // Trópicos y círculos polares destacados
    for (const lat of [23.5, -23.5, 66.5, -66.5]) {
      const pts = [];
      for (let lon = -180; lon <= 180; lon += SEG)
        pts.push(this._ll2v(lat, lon, 1.006));
      this.globe.add(new T.Line(
        new T.BufferGeometry().setFromPoints(pts), matTropic
      ));
    }
  }

  /* ══════════ atmósfera Fresnel ══════════ */

  _buildAtmosphere() {
    const T = window.THREE;

    // Halo exterior (más grande, muy tenue)
    this.scene.add(new T.Mesh(
      new T.SphereGeometry(1.24, 32, 32),
      new T.MeshBasicMaterial({
        color: 0x081830, transparent: true, opacity: 0.07, side: T.BackSide,
      })
    ));

    // Capa media — azul
    this.scene.add(new T.Mesh(
      new T.SphereGeometry(1.14, 32, 32),
      new T.MeshBasicMaterial({
        color: 0x0e3268, transparent: true, opacity: 0.13, side: T.BackSide,
      })
    ));

    // Capa interior — teal brillante (limbo del globo)
    this.scene.add(new T.Mesh(
      new T.SphereGeometry(1.065, 32, 32),
      new T.MeshBasicMaterial({
        color: 0x1a5888, transparent: true, opacity: 0.11, side: T.BackSide,
      })
    ));

    // Bruma superficial — uniforme, muy sutil
    this.globe.add(new T.Mesh(
      new T.SphereGeometry(1.004, 32, 32),
      new T.MeshBasicMaterial({
        color: 0x0a2840, transparent: true, opacity: 0.07,
      })
    ));
  }

  /* ══════════ anillo de escaneo + rings polares ══════════ */

  _buildScanRing() {
    const T = window.THREE;

    // Torus ecuatorial principal
    const scanGeo = new T.TorusGeometry(1.016, 0.004, 6, 128);

    this.scanRing = new T.Mesh(scanGeo, new T.MeshBasicMaterial({
      color: 0x2277bb, transparent: true, opacity: 0.28,
    }));
    // El TorusGeometry se crea en el plano XY; rotar 90° para estar en XZ (ecuador)
    this.scanRing.rotation.x = Math.PI / 2;
    this.globe.add(this.scanRing);

    // Línea de escaneo (más fina, más brillante)
    this.scanLine = new T.Mesh(
      new T.TorusGeometry(1.016, 0.0018, 4, 128),
      new T.MeshBasicMaterial({ color: 0x44aaee, transparent: true, opacity: 0.65 })
    );
    this.scanLine.rotation.x = Math.PI / 2;
    this.globe.add(this.scanLine);

    // Rings decorativos en los polos
    for (const lat of [90, -90]) {
      for (const [rSize, op] of [[0.06, 0.40],[0.13, 0.28],[0.22, 0.18]]) {
        const ring = new T.Mesh(
          new T.TorusGeometry(rSize, 0.003, 4, 64),
          new T.MeshBasicMaterial({
            color: 0x2277aa, transparent: true, opacity: op,
          })
        );
        const pos = this._ll2v(lat, 0, 1.0);
        ring.position.copy(pos);
        ring.lookAt(new T.Vector3(0, 0, 0));
        this.globe.add(ring);
      }
    }
  }

  /* ══════════ marcadores de colaboración ══════════ */

  _buildPoints() {
    const T      = window.THREE;
    const points = window.NIMACH_DATA?.globePoints || [];

    points.forEach(p => {
      const pos = this._ll2v(p.lat, p.lon, 1.016);
      const dir = pos.clone().normalize();
      const col = parseInt(p.color.replace('#', ''), 16);
      const sc  = p.home ? 1.0 : 0.72;

      /* ── Spike (columna desde la superficie) ── */
      const sH = p.home ? 0.11 : 0.07;
      const spike = new T.Mesh(
        new T.CylinderGeometry(0.0025, 0.001, sH, 6),
        new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.80 })
      );
      spike.position.copy(pos.clone().add(dir.clone().multiplyScalar(sH / 2)));
      spike.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      this.globe.add(spike);

      /* ── Cap (esfera en la punta del spike) ── */
      const cap = new T.Mesh(
        new T.SphereGeometry(p.home ? 0.018 : 0.013, 8, 8),
        new T.MeshBasicMaterial({ color: col, transparent: true, opacity: p.home ? 1 : 0.88 })
      );
      cap.position.copy(pos.clone().add(dir.clone().multiplyScalar(sH)));
      this.globe.add(cap);

      /* ── 3 anillos concéntricos ── */
      const rings = [];
      const RING_PARAMS = [
        { rBase: 0.024 * sc, op: 0.72 },
        { rBase: 0.042 * sc, op: 0.45 },
        { rBase: 0.066 * sc, op: 0.22 },
      ];
      RING_PARAMS.forEach(({ rBase, op }, ri) => {
        const ring = new T.Mesh(
          new T.RingGeometry(rBase * 0.65, rBase, 32),
          new T.MeshBasicMaterial({
            color: col, transparent: true, opacity: op, side: T.DoubleSide,
          })
        );
        ring.position.copy(pos);
        ring.lookAt(pos.clone().add(dir));
        this.globe.add(ring);
        rings.push({ mesh: ring, rBase, baseOp: op, phase: ri * Math.PI * 0.67 });
      });

      /* ── Halo ── */
      const halo = new T.Mesh(
        new T.SphereGeometry(0.055 * sc, 10, 10),
        new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.07 })
      );
      halo.position.copy(pos);
      this.globe.add(halo);

      this._pts.push({ cap, rings, halo, dir, pos, col, home: p.home });
    });
  }

  /* ══════════ arcos de conexión ══════════ */

  _buildArcs() {
    const T      = window.THREE;
    const points = window.NIMACH_DATA?.globePoints || [];
    const home   = points.find(p => p.home);
    if (!home) return;

    points.filter(p => !p.home).forEach((p, i) => {
      const start = this._ll2v(home.lat, home.lon, 1.02);
      const end   = this._ll2v(p.lat,   p.lon,   1.02);
      const pts   = this._arcPoints(start, end, 100);
      const curve = new T.CatmullRomCurve3(pts);
      const col   = parseInt(p.color.replace('#', ''), 16);

      /* Tubo principal */
      const arcMesh = new T.Mesh(
        new T.TubeGeometry(curve, 80, 0.006, 5, false),
        new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0 })
      );
      this.globe.add(arcMesh);

      /* Tubo glow (más ancho, más transparente) */
      const glowMesh = new T.Mesh(
        new T.TubeGeometry(curve, 80, 0.014, 5, false),
        new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0 })
      );
      this.globe.add(glowMesh);

      /* Trail: 3 esferas — principal + 2 tras ella */
      const trail = [0, -0.04, -0.09].map((offset, idx) => {
        const r = 0.015 * (1 - idx * 0.28);
        const m = new T.Mesh(
          new T.SphereGeometry(r, 8, 8),
          new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0 })
        );
        this.globe.add(m);
        return { mesh: m, offset, trailFactor: 1 - idx * 0.35 };
      });

      this._arcs.push({
        arcMesh, glowMesh, trail, pts, curve,
        t:     Math.random(),
        speed: 0.0022 + Math.random() * 0.0016,
        col,
        phaseOff: i * 0.45,
      });
    });
  }

  /* ══════════ helpers geométricos ══════════ */

  /** Great-circle interpolation con altura gaussiana */
  _arcPoints(start, end, segments) {
    const T    = window.THREE;
    const pts  = [];
    const axis = start.clone().cross(end).normalize();
    const ang  = start.angleTo(end);
    const maxH = 0.34 + start.distanceTo(end) * 0.18;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const h = 1 + maxH * Math.sin(Math.PI * t);
      pts.push(
        start.clone()
          .applyAxisAngle(axis, ang * t)
          .normalize()
          .multiplyScalar(h)
      );
    }
    return pts;
  }

  /** lat/lon → THREE.Vector3 */
  _ll2v(lat, lon, r = 1) {
    const T   = window.THREE;
    const phi = (90 - lat) * (Math.PI / 180);
    const tht = (lon + 180) * (Math.PI / 180);
    return new T.Vector3(
      -r * Math.sin(phi) * Math.cos(tht),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(tht)
    );
  }

  /* ══════════ loop de animación ══════════ */

  _animate() {
    this.animId = requestAnimationFrame(() => this._animate());
    this.frame++;
    const t = this.frame * 0.016;

    /* Auto-rotación */
    if (this.autoRotate) this.rotY += 0.0018;
    this.globe.rotation.y = this.rotY;
    this.globe.rotation.x = this.rotX;

    /* Scan ring — oscila levemente en inclinación + pulsa opacidad */
    if (this.scanRing) {
      const tilt = Math.sin(t * 0.28) * 0.32;
      this.scanRing.rotation.z = tilt;
      this.scanLine.rotation.z = tilt + 0.05;
      this.scanLine.material.opacity = 0.38 + Math.sin(t * 1.8) * 0.28;
      this.scanRing.material.opacity = 0.16 + Math.sin(t * 0.9) * 0.10;
    }

    /* Marcadores */
    this._pts.forEach((p, i) => {
      const pulse = (Math.sin(t * 2.4 + i * 0.85) + 1) * 0.5; // 0..1

      p.rings.forEach(({ mesh, rBase, baseOp, phase }, ri) => {
        const exp = 1 + pulse * [0.38, 0.62, 0.92][ri];
        mesh.scale.setScalar(exp);
        mesh.material.opacity = baseOp * (1 - pulse * 0.45);
      });

      p.halo.material.opacity      = 0.04 + pulse * 0.11;
      p.cap.material.opacity       = (p.home ? 0.88 : 0.72) + pulse * 0.12;
    });

    /* Arcos + trail */
    this._arcs.forEach(a => {
      a.t += a.speed;
      if (a.t > 1) a.t -= 1;

      // Opacidad del tubo — pulsa suavemente
      const vis = (Math.sin(t * 0.55 + a.phaseOff) + 1) * 0.5;
      a.arcMesh.material.opacity  = 0.14 + vis * 0.28;
      a.glowMesh.material.opacity = 0.04 + vis * 0.08;

      // Trail spheres
      a.trail.forEach(({ mesh, offset, trailFactor }) => {
        let pos = ((a.t + offset) % 1 + 1) % 1;
        mesh.position.copy(a.curve.getPoint(Math.min(pos, 0.999)));

        // Fade cerca de los extremos (entrada/salida del arco)
        const edgeFade = Math.min(pos, 1 - pos) * 7;
        mesh.material.opacity = Math.min(edgeFade, 1) * trailFactor * 0.95;
      });
    });
    
    // Adaptar opacidad de estrellas al tema activo
    const dark = document.body.classList.contains('dark-mode');
    if (this._starsMat1) {
      this._starsMat1.opacity = dark ? 0.85 : 0.18;
      this._starsMat2.opacity = dark ? 0.47 : 0.09;
      this._starsMat1.color.set(dark ? 0xaaccff : 0x8899cc);
    }

    this.renderer.render(this.scene, this.camera);
  }

  /* ══════════ eventos ══════════ */

  _bindEvents() {
    const el = this.canvasEl;
    if (!el) return;

    const onDown = (x, y) => {
      this.isDragging = true; this.autoRotate = false;
      this.prevMouse  = { x, y };
    };
    const onMove = (x, y) => {
      if (!this.isDragging) return;
      this.rotY += (x - this.prevMouse.x) * 0.006;
      this.rotX += (y - this.prevMouse.y) * 0.004;
      this.rotX  = Math.max(-0.62, Math.min(0.62, this.rotX));
      this.prevMouse = { x, y };
    };
    const onUp = () => {
      this.isDragging = false;
      setTimeout(() => { this.autoRotate = true; }, 2000);
    };

    el.addEventListener('mousedown',     e => onDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup',   onUp);

    el.addEventListener('touchstart', e => onDown(
      e.touches[0].clientX, e.touches[0].clientY
    ));
    el.addEventListener('touchmove', e => {
      onMove(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchend', onUp);

    el.addEventListener('wheel', e => {
      this.camera.position.z = Math.max(1.9, Math.min(4.6,
        this.camera.position.z + e.deltaY * 0.003));
      e.preventDefault();
    }, { passive: false });

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
