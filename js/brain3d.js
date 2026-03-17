/**
 * NIM-ACh — Brain3D v2.0
 * Visualización fisiológica del eje cerebro-corazón.
 *
 * Estructuras:
 *   CAN cortical  : vmPFC · ACC · Ínsula (bilateral)
 *   CAN subcortical: Amígdala (bilateral) · Hipotálamo · PAG
 *   Tronco enc.   : NTS/DMV · RVLM (bilateral)
 *   Vías eferentes: Nervio vago (X par) · Cadena simpática T1–T4
 *   Ganglio estrellado · Plexo cardíaco intrínseco
 *   Corazón       : 4 cámaras · Nodo SA · Nodo AV · Haz de His
 *                   Arterias coronarias · Grandes vasos
 */
class Brain3DViewer {

  /* ══════════ constructor ══════════ */

  constructor() {
    this.overlay     = null;
    this.webglCanvas = null;
    this.lblCanvas   = null;   // 2D overlay para etiquetas
    this.lblCtx      = null;
    this.renderer    = null;
    this.scene       = null;
    this.sceneGroup  = null;   // grupo raíz que recibe rotación
    this.camera      = null;
    this.animId      = null;

    this.isDragging  = false;
    this.prevMouse   = { x: 0, y: 0 };
    this.rotation    = { x: 0.12, y: 0.35 };
    this.autoRotate  = true;
    this.frame       = 0;

    this.pulses      = [];   // señales viajando por vías
    this._curves     = {};   // CatmullRomCurve3 reutilizables
    this._labels     = [];   // { _localPos, _groupRef, text, color, size }
    this._escHandler = null;

    this.bindTrigger();
  }

  /* ══════════ trigger ══════════ */

  bindTrigger() {
    const btn = document.getElementById('btn-3d');
    if (btn) btn.addEventListener('click', () => this.open());
  }

  /* ══════════ open / close ══════════ */

  async open() {
    if (!window.THREE) {
      await this.loadScript(
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
      );
    }
    const isFirst = !this.overlay;
    this.buildOverlay();

    if (!isFirst) {
      if (!this.animId) this.animate();
      return;
    }
    // Esperar 2 frames para layout del overlay antes de medir canvas
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    this.initScene();
    this.animate();
  }

  loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  close() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = null;
    if (this.overlay) this.overlay.style.display = 'none';
    document.body.style.overflow = '';
    if (this._escHandler) document.removeEventListener('keydown', this._escHandler);
  }

  destroy() { this.close(); if (this.renderer) this.renderer.dispose(); }

  /* ══════════ DOM / overlay ══════════ */

  buildOverlay() {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      return;
    }

    this.overlay = document.createElement('div');
    this.overlay.id = 'brain3d-overlay';
    Object.assign(this.overlay.style, {
      position: 'fixed', inset: '0',
      background: 'rgba(3,8,18,0.97)',
      backdropFilter: 'blur(22px)',
      zIndex: '500',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Sora, sans-serif',
    });

    const legend = [
      ['#7fb3e8', 'CAN cortical'],
      ['#b07fd4', 'CAN subcortical'],
      ['#1db884', 'N. vago (X par) — parasimpático'],
      ['#f5a472', 'Cadena simpática — adrenérgico'],
      ['#ffd080', 'Sistema de conducción'],
      ['#e87040', 'Anatomía cardíaca'],
    ].map(([c, t]) => `
      <span style="display:flex;align-items:center;gap:6px;
        font-size:10px;color:rgba(232,240,250,.55);letter-spacing:.05em;">
        <span style="width:7px;height:7px;border-radius:50%;
          background:${c};flex-shrink:0;box-shadow:0 0 6px ${c}88;"></span>${t}
      </span>`).join('');

    this.overlay.innerHTML = `
      <div id="b3d-wrap" style="position:relative;width:min(780px,96vw);">
        <canvas id="brain3d-canvas"
          style="width:100%;border-radius:16px;display:block;background:transparent;"></canvas>

        <!-- Canvas 2D para etiquetas (mismo tamaño, sobre WebGL) -->
        <canvas id="brain3d-lbl"
          style="position:absolute;top:0;left:0;width:100%;height:100%;
          border-radius:16px;pointer-events:none;"></canvas>

        <button id="brain3d-close" style="
          position:absolute;top:-48px;right:0;
          background:rgba(255,255,255,.07);border:0.5px solid rgba(255,255,255,.12);
          color:#e8f0fa;width:36px;height:36px;border-radius:50%;
          font-size:15px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;">✕</button>

        <div style="display:flex;justify-content:center;flex-wrap:wrap;
          gap:16px;margin-top:16px;">${legend}</div>

        <p style="text-align:center;font-size:10px;margin-top:8px;
          color:rgba(122,155,191,.35);letter-spacing:.05em;">
          Arrastra para rotar · Scroll para zoom</p>
      </div>`;

    document.body.appendChild(this.overlay);
    document.body.style.overflow = 'hidden';

    document.getElementById('brain3d-close')
      .addEventListener('click', () => this.close());
    this.overlay.addEventListener('click',
      e => { if (e.target === this.overlay) this.close(); });
    this._escHandler = e => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this._escHandler);

    this.initMouseInteraction();
  }

  /* ══════════ Scene init ══════════ */

  initScene() {
    const T = window.THREE;

    this.webglCanvas = document.getElementById('brain3d-canvas');
    this.lblCanvas   = document.getElementById('brain3d-lbl');
    this.lblCtx      = this.lblCanvas.getContext('2d');

    const W = this.webglCanvas.offsetWidth  || 780;
    const H = Math.round(W * 0.68);
    this.webglCanvas.width = this.lblCanvas.width  = this._W = W;
    this.webglCanvas.height = this.lblCanvas.height = this._H = H;

    // Renderer
    this.renderer = new T.WebGLRenderer({
      canvas: this.webglCanvas, antialias: true, alpha: true,
    });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Scene + niebla atmosférica
    this.scene = new T.Scene();
    this.scene.fog = new T.FogExp2(0x030810, 0.10);

    // Camera
    this.camera = new T.PerspectiveCamera(46, W / H, 0.1, 60);
    this.camera.position.set(0, 0.1, 5.8);

    // Grupo raíz (toda la escena rota aquí)
    this.sceneGroup = new T.Group();
    this.scene.add(this.sceneGroup);

    this._buildLighting();
    this._buildBackground();
    this._buildBrain();
    this._buildBrainstem();
    this._buildPathways();
    this._buildHeart();
  }

  /* ══════════ Iluminación ══════════ */

  _buildLighting() {
    const T = window.THREE;
    const g = this.sceneGroup;

    g.add(new T.AmbientLight(0x060e20, 1.4));

    const blueKey = new T.PointLight(0x3a7acc, 3.0, 16);
    blueKey.position.set(4, 4, 4);
    g.add(blueKey);

    const coralFill = new T.PointLight(0xe87040, 1.4, 14);
    coralFill.position.set(-3, -4, 2);
    g.add(coralFill);

    const tealRim = new T.PointLight(0x1db884, 1.0, 12);
    tealRim.position.set(0, 0, -5);
    g.add(tealRim);

    const topDir = new T.DirectionalLight(0x7799cc, 0.7);
    topDir.position.set(0, 6, 2);
    g.add(topDir);
  }

  /* ══════════ Partículas de fondo ══════════ */

  _buildBackground() {
    const T = window.THREE;
    const geo = new T.BufferGeometry();
    const v = new Float32Array(500 * 3);
    for (let i = 0; i < v.length; i++) v[i] = (Math.random() - 0.5) * 20;
    geo.setAttribute('position', new T.BufferAttribute(v, 3));
    this.sceneGroup.add(new T.Points(geo, new T.PointsMaterial({
      color: 0x0e2040, size: 0.022, transparent: true, opacity: 0.55,
    })));
  }

  /* ══════════ CEREBRO — cortex + nucleos CAN ══════════ */

  _buildBrain() {
    const T = window.THREE;

    // Grupo anclado en y=1.35 (espacio sceneGroup)
    this.brainGroup = new T.Group();
    this.brainGroup.position.set(0, 1.35, 0);
    this.sceneGroup.add(this.brainGroup);

    /* ── Corteza: esfera distorsionada con ruido ── */
    const cortGeo = new T.SphereGeometry(1.08, 52, 40);
    const cp = cortGeo.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i);
      const len = Math.sqrt(x*x + y*y + z*z) || 1;
      const n =  Math.sin(x * 5.3) * 0.058
              +  Math.sin(y * 6.2 + 1.4) * 0.050
              +  Math.sin(z * 4.9 + 2.8) * 0.040
              +  Math.sin(x * 2.6 + y * 3.2) * 0.034
              +  Math.sin(y * 2.9 + z * 2.3) * 0.028;
      cp.setXYZ(i, x + (x/len)*n, y + (y/len)*n, z + (z/len)*n);
    }
    cortGeo.computeVertexNormals();

    // Superficie translúcida (interior visible)
    this.cortexMesh = new T.Mesh(cortGeo, new T.MeshPhongMaterial({
      color: 0x0a2240, emissive: 0x050f20,
      transparent: true, opacity: 0.50, shininess: 10,
    }));
    this.brainGroup.add(this.cortexMesh);

    // Wireframe (giros/surcos)
    this.brainGroup.add(new T.Mesh(cortGeo.clone(), new T.MeshBasicMaterial({
      wireframe: true, color: 0x164880, transparent: true, opacity: 0.16,
    })));

    // Halo exterior
    this.brainGroup.add(new T.Mesh(
      new T.SphereGeometry(1.17, 20, 20),
      new T.MeshBasicMaterial({
        color: 0x1a4488, transparent: true, opacity: 0.05, side: T.BackSide,
      })
    ));

    /* ── Núcleos CAN ── */
    // Posiciones en espacio LOCAL de brainGroup
    const canDefs = [
      // Cortical (azul)
      { id:'vmPFC', pos:[ 0.00,  0.78,  0.76], color:0x7fb3e8, r:0.105, label:'vmPFC',     grp:'c' },
      { id:'ACC',   pos:[ 0.00,  0.64,  0.54], color:0x5590d8, r:0.095, label:'ACC',       grp:'c' },
      { id:'insL',  pos:[-0.94,  0.20,  0.12], color:0x4a86c4, r:0.090, label:'Ínsula L',  grp:'c' },
      { id:'insR',  pos:[ 0.94,  0.20,  0.12], color:0x4a86c4, r:0.090, label:'Ínsula R',  grp:'c' },
      // Subcortical (morado)
      { id:'amyL',  pos:[-0.68, -0.38,  0.30], color:0x9a6aca, r:0.100, label:'Amígdala L',grp:'s' },
      { id:'amyR',  pos:[ 0.68, -0.38,  0.30], color:0x9a6aca, r:0.100, label:'Amígdala R',grp:'s' },
      { id:'hyp',   pos:[ 0.00, -0.56,  0.33], color:0xb07fd4, r:0.112, label:'Hipotálamo',grp:'s' },
      { id:'PAG',   pos:[ 0.00, -0.80, -0.16], color:0x8a58b8, r:0.080, label:'PAG',       grp:'s' },
    ];

    this._canMeshes = {};
    canDefs.forEach(n => {
      const mesh = new T.Mesh(
        new T.SphereGeometry(n.r, 14, 14),
        new T.MeshPhongMaterial({
          color: n.color, emissive: n.color,
          emissiveIntensity: 0.55, shininess: 55,
          transparent: true, opacity: 0.92,
        })
      );
      mesh.position.set(...n.pos);
      this.brainGroup.add(mesh);
      this._canMeshes[n.id] = mesh;

      // Halo
      const halo = new T.Mesh(
        new T.SphereGeometry(n.r * 2.8, 8, 8),
        new T.MeshBasicMaterial({ color: n.color, transparent: true, opacity: 0.065 })
      );
      halo.position.set(...n.pos);
      this.brainGroup.add(halo);

      // Etiqueta
      this._labels.push({
        _localPos: new T.Vector3(...n.pos),
        _groupRef: this.brainGroup,
        text: n.label,
        color: n.grp === 'c' ? '#7fb3e8' : '#b07fd4',
        size: 10,
      });
    });

    /* ── Conexiones internas CAN ── */
    [
      ['vmPFC','ACC'], ['ACC','hyp'], ['ACC','amyL'], ['ACC','amyR'],
      ['insL','amyL'], ['insR','amyR'],
      ['amyL','hyp'], ['amyR','hyp'], ['hyp','PAG'],
    ].forEach(([a, b]) => {
      const nA = canDefs.find(n => n.id === a);
      const nB = canDefs.find(n => n.id === b);
      if (!nA || !nB) return;
      const geo = new T.BufferGeometry().setFromPoints([
        new T.Vector3(...nA.pos), new T.Vector3(...nB.pos),
      ]);
      this.brainGroup.add(new T.LineSegments(geo,
        new T.LineBasicMaterial({ color: 0x1e4888, transparent: true, opacity: 0.32 })
      ));
    });
  }

  /* ══════════ TRONCO ENCEFÁLICO + núcleos medulares ══════════ */

  _buildBrainstem() {
    const T = window.THREE;

    // Cilindro afilado (mesencéfalo → bulbo raquídeo)
    // Coordenadas en espacio sceneGroup (y=0.62 ± 0.55)
    const bsGeo = new T.CylinderGeometry(0.22, 0.30, 1.10, 18);
    const bsMat = new T.MeshPhongMaterial({
      color: 0x0c2240, emissive: 0x060f20,
      transparent: true, opacity: 0.72, shininess: 8,
    });
    const bsMesh = new T.Mesh(bsGeo, bsMat);
    bsMesh.position.set(0, 0.62, -0.04);
    this.sceneGroup.add(bsMesh);

    // Wireframe del tronco
    const bsWire = new T.Mesh(bsGeo.clone(), new T.MeshBasicMaterial({
      wireframe: true, color: 0x164880, transparent: true, opacity: 0.13,
    }));
    bsWire.position.copy(bsMesh.position);
    this.sceneGroup.add(bsWire);

    // Médula espinal cervical (stub)
    const scGeo = new T.CylinderGeometry(0.13, 0.15, 0.55, 10);
    const scMesh = new T.Mesh(scGeo, bsMat.clone());
    scMesh.position.set(0, -0.38, -0.04);
    this.sceneGroup.add(scMesh);

    /* ── Núcleos medulares ── */
    // En espacio sceneGroup
    const medDefs = [
      { id:'NTS',   pos:[ 0.00,  0.08, -0.05], color:0x1db884, r:0.092, label:'NTS / DMV' },
      { id:'RVLML', pos:[-0.19, -0.06, -0.02], color:0xf5a472, r:0.070, label:'RVLM'      },
      { id:'RVLMR', pos:[ 0.19, -0.06, -0.02], color:0xf5a472, r:0.070, label:''           },
    ];
    this._medMeshes = {};
    medDefs.forEach(n => {
      const mesh = new T.Mesh(
        new T.SphereGeometry(n.r, 12, 12),
        new T.MeshPhongMaterial({
          color: n.color, emissive: n.color,
          emissiveIntensity: 0.62, transparent: true, opacity: 0.93,
        })
      );
      mesh.position.set(...n.pos);
      this.sceneGroup.add(mesh);
      this._medMeshes[n.id] = mesh;

      if (n.label) {
        this._labels.push({
          _localPos: new T.Vector3(...n.pos),
          _groupRef: this.sceneGroup,
          text: n.label,
          color: n.id === 'NTS' ? '#1db884' : '#f5a472',
          size: 10,
        });
      }
    });

    /* ── Ganglios estrellados (bilateral) ── */
    // T1, unión de fibras simpáticas cervicales + T1 → plexo cardíaco
    [[-0.42, 0.18], [0.42, 0.18]].forEach(([x, z], i) => {
      const sg = new T.Mesh(
        new T.SphereGeometry(0.068, 10, 10),
        new T.MeshPhongMaterial({
          color: 0xf5a472, emissive: 0xf5a472,
          emissiveIntensity: 0.52, transparent: true, opacity: 0.90,
        })
      );
      sg.position.set(x, -0.62, z);
      this.sceneGroup.add(sg);
      this._medMeshes[`sg${i}`] = sg;

      if (i === 0) {
        this._labels.push({
          _localPos: new T.Vector3(x - 0.08, -0.62, z),
          _groupRef: this.sceneGroup,
          text: 'Ganglio estrellado',
          color: '#f5a472', size: 9,
        });
      }
    });
  }

  /* ══════════ VÍAS AUTONÓMICAS ══════════ */

  _buildPathways() {
    const T = window.THREE;

    /* ── Vago izquierdo (X par craneal) — eferente parasimpático ── */
    // NTS → cervical → torácico → plexo cardíaco → nodo SA
    // Coordenadas en espacio sceneGroup
    const vagLPts = [
      new T.Vector3( 0.00,  0.08, -0.05),  // NTS/DMV
      new T.Vector3(-0.07, -0.12,  0.10),  // Salida medular
      new T.Vector3(-0.11, -0.30,  0.22),  // Región cervical
      new T.Vector3(-0.09, -0.58,  0.19),  // Torácico superior (T1)
      new T.Vector3(-0.04, -0.88,  0.15),  // Nivel arco aórtico
      new T.Vector3( 0.04, -1.15,  0.11),  // Plexo cardíaco
      new T.Vector3( 0.13, -1.38,  0.09),  // Ramas cardíacas
      new T.Vector3( 0.30,  0.14,  0.10),  // Nodo SA (heartGroup local → ver nota*)
    ];
    // *Último punto se ajusta al nodo SA en espacio sceneGroup: heartGroup.pos + saNode.pos
    // heartGroup.pos = (0.08, -1.70, 0) → SA world = (0.38, -1.56, 0.10)
    vagLPts[vagLPts.length - 1] = new T.Vector3(0.38, -1.56, 0.10);
    const vagLC = new T.CatmullRomCurve3(vagLPts);
    this._curves.vagL = vagLC;
    this.sceneGroup.add(new T.Mesh(
      new T.TubeGeometry(vagLC, 90, 0.022, 8, false),
      new T.MeshPhongMaterial({
        color: 0x1db884, emissive: 0x0a6040,
        emissiveIntensity: 0.65, transparent: true, opacity: 0.78, shininess: 38,
      })
    ));

    /* ── Vago derecho (más delgado) ── */
    const vagRPts = [
      new T.Vector3( 0.00,  0.08, -0.05),
      new T.Vector3( 0.08, -0.14,  0.10),
      new T.Vector3( 0.13, -0.32,  0.22),
      new T.Vector3( 0.11, -0.60,  0.18),
      new T.Vector3( 0.06, -0.90,  0.14),
      new T.Vector3( 0.02, -1.14,  0.10),
      new T.Vector3(-0.06, -1.37,  0.08),
      new T.Vector3(-0.10, -1.58,  0.09),  // LA / plexo posterior
    ];
    const vagRC = new T.CatmullRomCurve3(vagRPts);
    this._curves.vagR = vagRC;
    this.sceneGroup.add(new T.Mesh(
      new T.TubeGeometry(vagRC, 90, 0.016, 8, false),
      new T.MeshPhongMaterial({
        color: 0x1db884, emissive: 0x0a5838,
        emissiveIntensity: 0.40, transparent: true, opacity: 0.55,
      })
    ));

    /* ── Cadena simpática izquierda ── */
    // RVLM → IML espinal → ganglio estrellado → nervio cardíaco → corazón
    const sympLPts = [
      new T.Vector3(-0.19, -0.06, -0.02),  // RVLM izq
      new T.Vector3(-0.24, -0.26, -0.02),  // Columna intermediolateral (IML)
      new T.Vector3(-0.38, -0.44,  0.08),  // Fibras preganglionares
      new T.Vector3(-0.42, -0.62,  0.18),  // Ganglio estrellado
      new T.Vector3(-0.38, -0.88,  0.22),  // Nervio cardíaco torácico
      new T.Vector3(-0.28, -1.18,  0.18),  // Plexo cardíaco
      new T.Vector3(-0.18, -1.45,  0.13),  // Ramas epicárdicas
      new T.Vector3(-0.06, -1.65,  0.06),  // Ventrículo izquierdo
    ];
    const sympLC = new T.CatmullRomCurve3(sympLPts);
    this._curves.sympL = sympLC;
    this.sceneGroup.add(new T.Mesh(
      new T.TubeGeometry(sympLC, 90, 0.020, 8, false),
      new T.MeshPhongMaterial({
        color: 0xf5a472, emissive: 0x803200,
        emissiveIntensity: 0.55, transparent: true, opacity: 0.74, shininess: 32,
      })
    ));

    /* ── Cadena simpática derecha ── */
    const sympRPts = [
      new T.Vector3( 0.19, -0.06, -0.02),
      new T.Vector3( 0.24, -0.26, -0.02),
      new T.Vector3( 0.38, -0.44,  0.08),
      new T.Vector3( 0.42, -0.62,  0.18),
      new T.Vector3( 0.38, -0.90,  0.22),
      new T.Vector3( 0.28, -1.20,  0.18),
      new T.Vector3( 0.22, -1.48,  0.14),
      new T.Vector3( 0.32, -1.65,  0.13),  // Ventrículo derecho
    ];
    const sympRC = new T.CatmullRomCurve3(sympRPts);
    this._curves.sympR = sympRC;
    this.sceneGroup.add(new T.Mesh(
      new T.TubeGeometry(sympRC, 90, 0.015, 8, false),
      new T.MeshPhongMaterial({
        color: 0xf5a472, emissive: 0x6a2800,
        emissiveIntensity: 0.35, transparent: true, opacity: 0.55,
      })
    ));

    /* ── Vías descendentes CAN → tronco encefálico ── */
    // ACC (world) → Hipotálamo → PAG → NTS
    // [ACC world = brainGroup.pos + local] = (0, 1.35+0.64, 0.54) = (0, 1.99, 0.54)
    const descPaths = [
      [
        new T.Vector3( 0.00,  1.99,  0.54),  // ACC
        new T.Vector3( 0.00,  0.79,  0.33),  // Hipotálamo
        new T.Vector3( 0.00,  0.55, -0.16),  // PAG
        new T.Vector3( 0.00,  0.08, -0.05),  // NTS
      ],
      [
        new T.Vector3(-0.94,  1.55,  0.12),  // Ínsula L
        new T.Vector3(-0.44,  0.60,  0.09),  // Intermedio
        new T.Vector3( 0.00,  0.08, -0.05),  // NTS
      ],
      [
        new T.Vector3( 0.94,  1.55,  0.12),  // Ínsula R
        new T.Vector3( 0.44,  0.60,  0.09),
        new T.Vector3( 0.00,  0.08, -0.05),  // NTS
      ],
    ];
    descPaths.forEach(pts => {
      const c = new T.CatmullRomCurve3(pts);
      this.sceneGroup.add(new T.Mesh(
        new T.TubeGeometry(c, 40, 0.012, 6, false),
        new T.MeshBasicMaterial({ color: 0x224477, transparent: true, opacity: 0.38 })
      ));
    });

    /* ── Señales viajando por las vías ── */
    // vagal eferente (descendente), aferente vagal (ascendente), simpático
    const pulseDefs = [
      { c:'vagL',  color:0x1db884, speed: 0.0058, t:0.00, r:0.048 },
      { c:'vagL',  color:0x1db884, speed: 0.0058, t:0.48, r:0.036 },
      { c:'vagR',  color:0x1db884, speed: 0.0058, t:0.26, r:0.032 },
      // Aferente (info cardíaca → NTS): viaja en sentido inverso
      { c:'vagL',  color:0x7fb3e8, speed:-0.0042, t:0.95, r:0.030, rev:true },
      // Simpáticas
      { c:'sympL', color:0xf5a472, speed: 0.0068, t:0.00, r:0.044 },
      { c:'sympL', color:0xf5a472, speed: 0.0068, t:0.55, r:0.034 },
      { c:'sympR', color:0xf5a472, speed: 0.0068, t:0.30, r:0.036 },
    ];
    pulseDefs.forEach(d => {
      const mesh = new T.Mesh(
        new T.SphereGeometry(d.r, 8, 8),
        new T.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 1 })
      );
      this.sceneGroup.add(mesh);
      this.pulses.push({ mesh, curveName: d.c, t: d.t, speed: d.speed, rev: !!d.rev });
    });

    /* ── Etiquetas de vías ── */
    this._labels.push({
      _localPos: new T.Vector3(-0.09, -0.58, 0.19),
      _groupRef: this.sceneGroup,
      text: 'N. vago (X)', color: '#1db884', size: 10,
    });
    this._labels.push({
      _localPos: new T.Vector3(-0.55, -0.70, 0.28),
      _groupRef: this.sceneGroup,
      text: 'Cadena simpática', color: '#f5a472', size: 10,
    });
  }

  /* ══════════ CORAZÓN ══════════ */

  _buildHeart() {
    const T = window.THREE;

    this.heartGroup = new T.Group();
    this.heartGroup.position.set(0.08, -1.70, 0);
    this.sceneGroup.add(this.heartGroup);

    /* ── Pericardio (shell exterior) ── */
    const perGeo = new T.SphereGeometry(0.62, 22, 22);
    // Deformación leve para forma cónica inferior (ápex)
    const perPos = perGeo.attributes.position;
    for (let i = 0; i < perPos.count; i++) {
      const y = perPos.getY(i);
      if (y < 0) {
        const sc = 1 + Math.abs(y) * 0.12;
        perPos.setXYZ(i, perPos.getX(i) * sc, y, perPos.getZ(i) * sc);
      }
    }
    perGeo.computeVertexNormals();
    this.heartGroup.add(new T.Mesh(perGeo, new T.MeshBasicMaterial({
      color: 0xe87040, transparent: true, opacity: 0.055, side: T.BackSide,
    })));

    /* ── Cámaras cardíacas ── */
    // Aurícula derecha (RA)
    this.heartGroup.add(this._chamber(T, [ 0.28,  0.22,  0.09], 0.185, 0xc05828, 0.80));
    // Aurícula izquierda (LA)
    this.heartGroup.add(this._chamber(T, [-0.20,  0.20, -0.04], 0.175, 0xcc6030, 0.74));
    // Ventrículo derecho (RV)
    this.heartGroup.add(this._chamber(T, [ 0.23, -0.11,  0.09], 0.235, 0xb84820, 0.84));
    // Ventrículo izquierdo (LV) — dominante
    this.heartGroup.add(this._chamber(T, [-0.13, -0.15, -0.06], 0.280, 0xd85c28, 0.90));

    // Septum interventricular (sugerido)
    const sep = new T.Mesh(
      new T.BoxGeometry(0.04, 0.33, 0.22),
      new T.MeshPhongMaterial({ color: 0x882015, transparent: true, opacity: 0.52 })
    );
    sep.position.set(0.04, -0.13, 0);
    this.heartGroup.add(sep);

    /* ── Grandes vasos ── */
    // Aorta ascendente (desde LV, sube y curva a la derecha)
    const aoC = new T.CatmullRomCurve3([
      new T.Vector3(-0.10,  0.13, -0.04),
      new T.Vector3(-0.04,  0.34,  0.01),
      new T.Vector3( 0.06,  0.50,  0.05),
      new T.Vector3( 0.16,  0.57,  0.10),
    ]);
    this.heartGroup.add(new T.Mesh(
      new T.TubeGeometry(aoC, 20, 0.064, 10, false),
      new T.MeshPhongMaterial({
        color: 0xcc5025, emissive: 0x5a1406, shininess: 42,
        transparent: true, opacity: 0.80,
      })
    ));

    // Arteria pulmonar (desde RV, hacia izquierda-arriba)
    const paC = new T.CatmullRomCurve3([
      new T.Vector3( 0.23,  0.13,  0.10),
      new T.Vector3( 0.18,  0.32,  0.12),
      new T.Vector3( 0.08,  0.48,  0.08),
      new T.Vector3(-0.04,  0.55,  0.04),
    ]);
    this.heartGroup.add(new T.Mesh(
      new T.TubeGeometry(paC, 20, 0.050, 10, false),
      new T.MeshPhongMaterial({
        color: 0x4a70b0, emissive: 0x162850, shininess: 36,
        transparent: true, opacity: 0.72,
      })
    ));

    // Vena cava superior (VCS → RA)
    const vcs = new T.Mesh(
      new T.CylinderGeometry(0.038, 0.038, 0.30, 10),
      new T.MeshPhongMaterial({ color: 0x3d608a, transparent: true, opacity: 0.66 })
    );
    vcs.position.set(0.30, 0.40, 0.09);
    this.heartGroup.add(vcs);

    /* ── Arterias coronarias ── */
    const corDefs = [
      // LAD (descendente anterior izquierda)
      [
        new T.Vector3(-0.06,  0.20,  0.18),
        new T.Vector3(-0.11,  0.02,  0.24),
        new T.Vector3(-0.15, -0.20,  0.20),
        new T.Vector3(-0.17, -0.40,  0.14),
      ],
      // RCA (coronaria derecha)
      [
        new T.Vector3( 0.23,  0.20,  0.14),
        new T.Vector3( 0.33,  0.06,  0.18),
        new T.Vector3( 0.29, -0.19,  0.18),
        new T.Vector3( 0.18, -0.38,  0.12),
      ],
      // Circunfleja (Cx) — rama de coronaria izq.
      [
        new T.Vector3(-0.06,  0.20,  0.18),
        new T.Vector3(-0.22,  0.14,  0.16),
        new T.Vector3(-0.30,  0.02,  0.12),
        new T.Vector3(-0.26, -0.18,  0.08),
      ],
    ];
    corDefs.forEach(pts => {
      this.heartGroup.add(new T.Mesh(
        new T.TubeGeometry(new T.CatmullRomCurve3(pts), 20, 0.017, 6, false),
        new T.MeshPhongMaterial({
          color: 0xffaa44, emissive: 0x7a3200,
          transparent: true, opacity: 0.62,
        })
      ));
    });

    /* ── Nodo SA (sinoauricular) ── */
    this.saNode = new T.Mesh(
      new T.SphereGeometry(0.058, 12, 12),
      new T.MeshPhongMaterial({
        color: 0xffd080, emissive: 0xffd080,
        emissiveIntensity: 1.0, transparent: true, opacity: 0.96,
      })
    );
    this.saNode.position.set(0.30, 0.14, 0.10);
    this.heartGroup.add(this.saNode);

    this.saGlow = new T.Mesh(
      new T.SphereGeometry(0.14, 8, 8),
      new T.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.09 })
    );
    this.saGlow.position.copy(this.saNode.position);
    this.heartGroup.add(this.saGlow);

    /* ── Nodo AV (auriculoventricular) ── */
    this.avNode = new T.Mesh(
      new T.SphereGeometry(0.044, 10, 10),
      new T.MeshPhongMaterial({
        color: 0xffaa40, emissive: 0xffaa40,
        emissiveIntensity: 0.85, transparent: true, opacity: 0.93,
      })
    );
    this.avNode.position.set(0.10, -0.05, 0.09);
    this.heartGroup.add(this.avNode);

    /* ── Haz de His / ramas Purkinje ── */
    [
      [new T.Vector3(0.10,-0.05,0.09), new T.Vector3( 0.12,-0.28,0.11)],  // rama derecha
      [new T.Vector3(0.10,-0.05,0.09), new T.Vector3(-0.06,-0.30,-0.04)], // rama izquierda
      [new T.Vector3(0.12,-0.28,0.11), new T.Vector3( 0.18,-0.40,0.14)],  // fibra Purkinje D
      [new T.Vector3(-0.06,-0.30,-0.04), new T.Vector3(-0.12,-0.38,-0.06)], // fibra Purkinje I
    ].forEach(([a, b]) => {
      this.heartGroup.add(new T.LineSegments(
        new T.BufferGeometry().setFromPoints([a, b]),
        new T.LineBasicMaterial({ color: 0xffaa40, transparent: true, opacity: 0.48 })
      ));
    });

    /* ── Plexo cardíaco intrínseco ── */
    // Convergencia de vagal + simpático sobre el corazón
    const plexOrigin = new T.Vector3(0.06, 0.48, 0.10);
    [
      [0.28, 0.14, 0.10],  // → nodo SA
      [-0.20, 0.20,-0.04], // → LA
      [ 0.23,-0.11, 0.09], // → RV
      [-0.13,-0.15,-0.06], // → LV
    ].forEach(t => {
      this.heartGroup.add(new T.LineSegments(
        new T.BufferGeometry().setFromPoints([plexOrigin, new T.Vector3(...t)]),
        new T.LineBasicMaterial({ color: 0x1db884, transparent: true, opacity: 0.38 })
      ));
    });

    /* ── Etiquetas cardíacas ── */
    [
      { pos:[0.38, 0.14, 0.10], text:'Nodo SA',        color:'#ffd080', size:10 },
      { pos:[0.20,-0.05, 0.09], text:'Nodo AV',         color:'#ffaa40', size: 9 },
      { pos:[-0.40,-0.15,-0.06],text:'Ventrículo izq.',  color:'#e87040', size: 9 },
      { pos:[0.06, 0.54, 0.10], text:'Plexo cardíaco',  color:'#1db884', size: 9 },
      { pos:[0.16, 0.57, 0.10], text:'Aorta',           color:'#cc5025', size: 9 },
    ].forEach(lb => {
      this._labels.push({
        _localPos: new T.Vector3(...lb.pos),
        _groupRef: this.heartGroup,
        text: lb.text, color: lb.color, size: lb.size,
      });
    });
  }

  /* Helper: crea esfera de cámara cardíaca */
  _chamber(T, pos, r, color, opacity) {
    const mesh = new T.Mesh(
      new T.SphereGeometry(r, 16, 16),
      new T.MeshPhongMaterial({
        color, emissive: color, emissiveIntensity: 0.18,
        shininess: 32, transparent: true, opacity,
      })
    );
    mesh.position.set(...pos);
    return mesh;
  }

  /* ══════════ Loop de animación ══════════ */

  animate() {
    this.animId = requestAnimationFrame(() => this.animate());
    this.frame++;

    // ── Rotación auto-orbital ──
    if (this.autoRotate) this.rotation.y += 0.0028;
    this.sceneGroup.rotation.y = this.rotation.y;
    this.sceneGroup.rotation.x = this.rotation.x;

    // ── Cerebro: float suave ──
    if (this.brainGroup) {
      this.brainGroup.position.y = 1.35 + Math.sin(this.frame * 0.008) * 0.016;
      this.cortexMesh.material.opacity = 0.46 + Math.sin(this.frame * 0.012) * 0.08;
    }

    // ── Nucleos CAN: pulso individual por región ──
    if (this._canMeshes) {
      Object.values(this._canMeshes).forEach((m, i) => {
        const p = 0.50 + Math.sin(this.frame * 0.016 + i * 0.72) * 0.35;
        m.material.emissiveIntensity = 0.38 + p * 0.44;
        m.scale.setScalar(1 + Math.sin(this.frame * 0.013 + i * 0.9) * 0.055);
      });
    }

    // ── Nucleos medulares ──
    if (this._medMeshes) {
      Object.values(this._medMeshes).forEach((m, i) => {
        m.material.emissiveIntensity = 0.45 + Math.sin(this.frame * 0.024 + i) * 0.35;
      });
    }

    // ── Latido cardíaco: ~70 bpm → período ≈ 51 frames a 60fps ──
    // sin²(πt) genera onda con morfología sistólica
    const hbPhase = (this.frame * 0.070) % Math.PI;
    const hb      = Math.max(0, Math.sin(hbPhase)) ** 2;   // pico sistólico
    const hb2     = Math.max(0, Math.sin(hbPhase * 1.9)) * 0.25; // muesca dicrótica

    // Nodo SA — marcapasos primario
    if (this.saNode) {
      this.saNode.material.emissiveIntensity = 0.65 + hb * 1.35;
      this.saNode.scale.setScalar(1 + hb * 0.40);
      if (this.saGlow) {
        this.saGlow.material.opacity = 0.05 + hb * 0.22;
        this.saGlow.scale.setScalar(1 + hb * 0.55);
      }
    }

    // Nodo AV — retraso PR ≈ 120 ms → ~7 frames
    if (this.avNode) {
      const avPhase = ((this.frame - 7) * 0.070) % Math.PI;
      const avHb = Math.max(0, Math.sin(avPhase)) ** 2;
      this.avNode.material.emissiveIntensity = 0.55 + avHb * 1.10;
      this.avNode.scale.setScalar(1 + avHb * 0.30);
    }

    // Corazón global: escala sistólica
    if (this.heartGroup) {
      this.heartGroup.scale.setScalar(1 + hb * 0.032 + hb2 * 0.008);
    }

    // ── Pulsos de señal ──
    this._updatePulses();

    // ── Render ──
    this.renderer.render(this.scene, this.camera);

    // ── Etiquetas 2D (después del render para matrices actualizadas) ──
    this._updateLabels();
  }

  /* ══════════ Señales viajando ══════════ */

  _updatePulses() {
    this.pulses.forEach(p => {
      p.t += p.speed;
      if (p.rev) { if (p.t < 0) p.t = 1.0; }
      else       { if (p.t > 1) p.t = 0.0; }

      const ct    = Math.max(0.001, Math.min(0.999, p.t));
      const curve = this._curves[p.curveName];
      if (!curve) return;

      p.mesh.position.copy(curve.getPoint(ct));

      // Fade en extremos
      const fade = Math.min(ct, 1 - ct) * 6;
      p.mesh.material.opacity = Math.min(fade, 1);
    });
  }

  /* ══════════ Etiquetas 2D proyectadas ══════════ */

  _updateLabels() {
    const ctx = this.lblCtx;
    if (!ctx) return;
    const W = this._W, H = this._H;
    ctx.clearRect(0, 0, W, H);

    this._labels.forEach(lb => {
      // Posición world: applyMatrix4 del grupo padre (matrixWorld actualizado tras render)
      const wp = lb._localPos.clone();
      if (lb._groupRef) {
        lb._groupRef.updateWorldMatrix(true, false);
        wp.applyMatrix4(lb._groupRef.matrixWorld);
      }

      // Proyección NDC → píxeles
      const ndc = wp.clone().project(this.camera);
      if (ndc.z > 1 || ndc.z < -1) return; // fuera del frustum

      const sx = (ndc.x *  0.5 + 0.5) * W;
      const sy = (ndc.y * -0.5 + 0.5) * H;
      if (sx < -60 || sx > W + 60 || sy < -20 || sy > H + 20) return;

      // Opacidad basada en profundidad
      const depth  = (ndc.z + 1) * 0.5; // 0=near, 1=far
      const alpha  = Math.max(0.25, 1 - depth * 0.85);
      const fs     = lb.size || 10;

      ctx.font = `${fs}px Sora, sans-serif`;
      ctx.textAlign = 'left';

      // Punto de anclaje
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = lb.color;
      ctx.globalAlpha = alpha;
      ctx.fill();

      // Fondo del texto
      const tw = ctx.measureText(lb.text).width;
      ctx.fillStyle = 'rgba(3,8,18,0.75)';
      ctx.fillRect(sx + 5, sy - fs + 2, tw + 8, fs + 2);

      // Texto
      ctx.fillStyle = lb.color;
      ctx.fillText(lb.text, sx + 9, sy);
      ctx.globalAlpha = 1;
    });
  }

  /* ══════════ Interacción mouse / touch ══════════ */

  initMouseInteraction() {
    // Se enlaza al canvas WebGL (el label canvas tiene pointer-events:none)
    const getCanvas = () => document.getElementById('brain3d-canvas');

    const onDown = (x, y) => {
      this.isDragging = true;
      this.autoRotate = false;
      this.prevMouse  = { x, y };
    };
    const onMove = (x, y) => {
      if (!this.isDragging) return;
      this.rotation.y += (x - this.prevMouse.x) * 0.006;
      this.rotation.x += (y - this.prevMouse.y) * 0.006;
      this.rotation.x = Math.max(-0.72, Math.min(0.72, this.rotation.x));
      this.prevMouse  = { x, y };
    };
    const onUp = () => {
      this.isDragging = false;
      setTimeout(() => { this.autoRotate = true; }, 2500);
    };

    // Mouse
    const c = getCanvas();
    if (!c) return;
    c.addEventListener('mousedown', e => onDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onUp);

    c.addEventListener('wheel', e => {
      if (!this.camera) return;
      this.camera.position.z = Math.max(3.0, Math.min(9.0,
        this.camera.position.z + e.deltaY * 0.004));
      e.preventDefault();
    }, { passive: false });

    // Touch
    c.addEventListener('touchstart', e => onDown(e.touches[0].clientX, e.touches[0].clientY));
    c.addEventListener('touchmove', e => {
      onMove(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }, { passive: false });
    c.addEventListener('touchend', onUp);
  }
}

window.Brain3DViewer = Brain3DViewer;
