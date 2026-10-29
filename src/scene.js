import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export class ParkingScene {
  constructor(canvas) {
    this.canvas = canvas;

    // Distribución física ampliada
    this.totalBays = 7;
    this.baySpacing = 3.8;
    this.bayStartX = -((this.totalBays - 1) * this.baySpacing) / 2;
    this.bayZ = -11.0;
    this.drivewayZ = 1.0;

    // Dos Garitas independientes y Avenida de Doble Carril
    this.laneInX = -18.5;
    this.boothInX = -15.0;
    this.laneOutX = 18.5;
    this.boothOutX = 15.0;
    this.tollZ = 9.5;
    this.avenueZ = 18.4; // Carril interno (Oeste -> Este, conecta con garitas)
    this.avenueCenterZ = 20.1; // Doble línea amarilla divisoria
    this.avenueOuterZ = 21.8; // Carril externo (Este -> Oeste, tráfico continuo)

    // Puertas corredizas
    this.doorL = null;
    this.doorR = null;
    this.doorCurrentOpen = 0;

    // Elementos interactivos
    this.baySensors = [];
    this.entranceGate = null;
    this.exitGate = null;
    this.alarmBeacons = [];
    this.alarmLights = [];
    this.boothGuards = [];

    // Tótem Electrónico 3D
    this.totemCanvas = null;
    this.totemCtx = null;
    this.totemTex = null;
    this.totemLight = null;

    // Peatones
    this.pedestrians = [];
    this.maxPedestrians = 22;

    this.alarmActive = false;
    this.beaconAngle = 0;
    this.guardClock = 0;
    this.currentCameraView = "isometric";
    this.tempVec = new THREE.Vector3();

    this.initEngine();
    this.initProceduralTextures();
    this.loadSkyDome();
    this.initLighting();
    this.buildPavementAndWalkways();
    this.buildSambilitoFacade();
    this.buildBothControlBooths();
    this.buildEntranceDisplayTotem();
    this.buildPerimeterEnclosure();
    this.buildBaysAndSensors();
    this.buildBarriers();
    this.buildRoadSignage();
    this.buildParkingDecorations();
    this.initPedestrianSystem();
  }

  initEngine() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
      stencil: false,
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa5c4e8);
    this.scene.fog = new THREE.FogExp2(0xa5c4e8, 0.0028);

    this.camera = new THREE.PerspectiveCamera(
      38,
      window.innerWidth / window.innerHeight,
      0.5,
      240,
    );

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 135;

    this.setCameraView("isometric");

    window.addEventListener("resize", () => this.onWindowResize());
  }

  /**
   * Generador de Texturas Procedimentales PBR en memoria (0 peticiones de red, 60+ FPS)
   */
  initProceduralTextures() {
    this.textures = {};

    // 1. Textura de Follaje Orgánico (Hojas y relieve para árboles y setos)
    const folCanvas = document.createElement("canvas");
    folCanvas.width = 256;
    folCanvas.height = 256;
    const fCtx = folCanvas.getContext("2d");
    fCtx.fillStyle = "#15803d";
    fCtx.fillRect(0, 0, 256, 256);
    const leafColors = ["#166534", "#15803d", "#16a34a", "#22c55e", "#14532d"];
    for (let i = 0; i < 4500; i++) {
      fCtx.fillStyle = leafColors[i % leafColors.length];
      const lx = Math.random() * 256;
      const ly = Math.random() * 256;
      const r = 2 + Math.random() * 5;
      fCtx.beginPath();
      fCtx.ellipse(
        lx,
        ly,
        r,
        r * 0.65,
        Math.random() * Math.PI,
        0,
        Math.PI * 2,
      );
      fCtx.fill();
    }
    const foliageTex = new THREE.CanvasTexture(folCanvas);
    foliageTex.wrapS = THREE.RepeatWrapping;
    foliageTex.wrapT = THREE.RepeatWrapping;
    foliageTex.repeat.set(3, 3);
    foliageTex.colorSpace = THREE.SRGBColorSpace;
    this.textures.foliage = foliageTex;

    const hedgeTex = foliageTex.clone();
    hedgeTex.needsUpdate = true;
    hedgeTex.repeat.set(12, 2);
    this.textures.hedge = hedgeTex;

    // 2. Textura de Corteza de Árbol (Troncos y ramas)
    const barkCanvas = document.createElement("canvas");
    barkCanvas.width = 256;
    barkCanvas.height = 256;
    const bCtx = barkCanvas.getContext("2d");
    bCtx.fillStyle = "#4a3222";
    bCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1200; i++) {
      bCtx.fillStyle = i % 2 === 0 ? "#3b2618" : "#5c402d";
      bCtx.fillRect(
        Math.random() * 256,
        Math.random() * 256,
        2 + Math.random() * 3,
        14 + Math.random() * 28,
      );
    }
    const barkTex = new THREE.CanvasTexture(barkCanvas);
    barkTex.wrapS = THREE.RepeatWrapping;
    barkTex.wrapT = THREE.RepeatWrapping;
    barkTex.repeat.set(2, 4);
    barkTex.colorSpace = THREE.SRGBColorSpace;
    this.textures.bark = barkTex;

    // 3. Textura de Madera Arquitectónica (Paneles Sambilito y bancas)
    const woodCanvas = document.createElement("canvas");
    woodCanvas.width = 256;
    woodCanvas.height = 256;
    const wCtx = woodCanvas.getContext("2d");
    wCtx.fillStyle = "#a15217";
    wCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      wCtx.fillStyle =
        i % 3 === 0 ? "rgba(65, 28, 6, 0.25)" : "rgba(215, 125, 50, 0.2)";
      wCtx.fillRect(
        Math.random() * 256,
        Math.random() * 256,
        2 + Math.random() * 2,
        35 + Math.random() * 60,
      );
    }
    const woodTex = new THREE.CanvasTexture(woodCanvas);
    woodTex.wrapS = THREE.RepeatWrapping;
    woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(4, 2);
    woodTex.colorSpace = THREE.SRGBColorSpace;
    this.textures.wood = woodTex;

    // 4. Textura de Hormigón / Concreto Arquitectónico (Islas, bordillos y muros)
    const concCanvas = document.createElement("canvas");
    concCanvas.width = 256;
    concCanvas.height = 256;
    const cCtx = concCanvas.getContext("2d");
    cCtx.fillStyle = "#cfd8dc";
    cCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 12000; i++) {
      const shade = 190 + Math.floor(Math.random() * 45);
      cCtx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 8})`;
      cCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    const concreteTex = new THREE.CanvasTexture(concCanvas);
    concreteTex.wrapS = THREE.RepeatWrapping;
    concreteTex.wrapT = THREE.RepeatWrapping;
    concreteTex.repeat.set(6, 6);
    concreteTex.colorSpace = THREE.SRGBColorSpace;
    this.textures.concrete = concreteTex;

    // 5. Textura de Paneles Metálicos Modulares (Fachada del edificio)
    const cladCanvas = document.createElement("canvas");
    cladCanvas.width = 256;
    cladCanvas.height = 256;
    const clCtx = cladCanvas.getContext("2d");
    clCtx.fillStyle = "#18202c";
    clCtx.fillRect(0, 0, 256, 256);
    clCtx.strokeStyle = "#0f141d";
    clCtx.lineWidth = 3;
    for (let x = 0; x <= 256; x += 64) {
      clCtx.beginPath();
      clCtx.moveTo(x, 0);
      clCtx.lineTo(x, 256);
      clCtx.stroke();
    }
    for (let y = 0; y <= 256; y += 64) {
      clCtx.beginPath();
      clCtx.moveTo(0, y);
      clCtx.lineTo(256, y);
      clCtx.stroke();
    }
    const claddingTex = new THREE.CanvasTexture(cladCanvas);
    claddingTex.wrapS = THREE.RepeatWrapping;
    claddingTex.wrapT = THREE.RepeatWrapping;
    claddingTex.repeat.set(18, 3);
    claddingTex.colorSpace = THREE.SRGBColorSpace;
    this.textures.cladding = claddingTex;
  }

  loadSkyDome() {
    const skyUrl =
      "https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?auto=format&fit=crop&w=2048&q=80";
    const loader = new THREE.TextureLoader();

    loader.load(skyUrl, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      this.scene.background = texture;
      this.scene.environment = texture;
      this.scene.environmentIntensity = 0.85;
    });
  }

  initLighting() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.22);
    this.scene.add(hemiLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.68);
    fillLight.position.set(-30, 35, -30);
    this.scene.add(fillLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbf0, 2.5);
    this.sunLight.position.set(32, 48, 30);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 140;
    this.sunLight.shadow.camera.left = -45;
    this.sunLight.shadow.camera.right = 45;
    this.sunLight.shadow.camera.top = 38;
    this.sunLight.shadow.camera.bottom = -38;
    this.sunLight.shadow.bias = -0.00025;
    this.scene.add(this.sunLight);
  }

  buildPavementAndWalkways() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#20242c";
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 45000; i++) {
      const v = Math.floor(Math.random() * 26);
      ctx.fillStyle = `rgba(${36 + v}, ${42 + v}, ${52 + v}, 0.35)`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    const asphaltTex = new THREE.CanvasTexture(canvas);
    asphaltTex.wrapS = THREE.RepeatWrapping;
    asphaltTex.wrapT = THREE.RepeatWrapping;
    asphaltTex.repeat.set(26, 20);
    asphaltTex.anisotropy = 4;

    const groundMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.85,
      metalness: 0.08,
      bumpMap: asphaltTex,
      bumpScale: 0.02,
    });

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(110, 76), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 2);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Doble línea amarilla divisoria central de la avenida (Z = 20.1)
    const yellowLineMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.4,
      emissive: 0xfacc15,
      emissiveIntensity: 0.08,
    });
    const lineGeo = new THREE.PlaneGeometry(106, 0.15);
    for (const offset of [-0.14, 0.14]) {
      const dLine = new THREE.Mesh(lineGeo, yellowLineMat);
      dLine.rotation.x = -Math.PI / 2;
      dLine.position.set(0, 0.012, this.avenueCenterZ + offset);
      this.scene.add(dLine);
    }

    // Líneas blancas discontinuas en los carriles de la avenida para mayor realismo vial
    const dashMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.45,
    });
    const dashGeo = new THREE.PlaneGeometry(2.2, 0.1);
    for (let dx = -48; dx <= 48; dx += 6.5) {
      const dash1 = new THREE.Mesh(dashGeo, dashMat);
      dash1.rotation.x = -Math.PI / 2;
      dash1.position.set(dx, 0.011, 16.95);
      this.scene.add(dash1);

      const dash2 = new THREE.Mesh(dashGeo, dashMat);
      dash2.rotation.x = -Math.PI / 2;
      dash2.position.set(dx, 0.011, 23.35);
      this.scene.add(dash2);
    }

    // Textura de baldosas arquitectónicas con relieve
    const tileCanvas = document.createElement("canvas");
    tileCanvas.width = 256;
    tileCanvas.height = 256;
    const tCtx = tileCanvas.getContext("2d");
    tCtx.fillStyle = "#d5dde5";
    tCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
      tCtx.fillStyle =
        i % 2 === 0 ? "rgba(255,255,255,0.15)" : "rgba(100,116,139,0.12)";
      tCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    tCtx.strokeStyle = "#b0bec5";
    tCtx.lineWidth = 3;
    for (let x = 0; x <= 256; x += 64) {
      tCtx.beginPath();
      tCtx.moveTo(x, 0);
      tCtx.lineTo(x, 256);
      tCtx.stroke();
      tCtx.beginPath();
      tCtx.moveTo(0, x);
      tCtx.lineTo(256, x);
      tCtx.stroke();
    }
    const tileTex = new THREE.CanvasTexture(tileCanvas);
    tileTex.wrapS = THREE.RepeatWrapping;
    tileTex.wrapT = THREE.RepeatWrapping;
    tileTex.repeat.set(16, 2);

    this.sidewalkMat = new THREE.MeshStandardMaterial({
      map: tileTex,
      bumpMap: tileTex,
      bumpScale: 0.01,
      roughness: 0.68,
    });

    const curbMat = new THREE.MeshStandardMaterial({
      map: this.textures.concrete,
      bumpMap: this.textures.concrete,
      bumpScale: 0.012,
      roughness: 0.65,
    });

    // 1. Acera principal frente al Sambilito (Norte)
    const northSidewalk = new THREE.Mesh(
      new RoundedBoxGeometry(82, 0.24, 4.8, 4, 0.04),
      this.sidewalkMat,
    );
    northSidewalk.position.set(0, 0.12, -16.8);
    northSidewalk.receiveShadow = true;
    this.scene.add(northSidewalk);

    // 2. Bulevares Peatonales Laterales (Oeste y Este)
    const westWalkway = new THREE.Mesh(
      new RoundedBoxGeometry(3.8, 0.24, 31.6, 4, 0.04),
      curbMat,
    );
    westWalkway.position.set(-38.0, 0.12, 0.2);
    westWalkway.receiveShadow = true;
    this.scene.add(westWalkway);

    const eastWalkway = new THREE.Mesh(
      new RoundedBoxGeometry(3.8, 0.24, 31.6, 4, 0.04),
      curbMat,
    );
    eastWalkway.position.set(38.0, 0.12, 0.2);
    eastWalkway.receiveShadow = true;
    this.scene.add(eastWalkway);

    // 3. Aceras Norte de la Avenida (Z = 15.6)
    const aveWalkLeft = new THREE.Mesh(
      new RoundedBoxGeometry(18.5, 0.24, 2.4, 3, 0.04),
      curbMat,
    );
    aveWalkLeft.position.set(-31.5, 0.12, 15.6);
    aveWalkLeft.receiveShadow = true;
    this.scene.add(aveWalkLeft);

    const aveWalkCenter = new THREE.Mesh(
      new RoundedBoxGeometry(26.0, 0.24, 2.4, 3, 0.04),
      curbMat,
    );
    aveWalkCenter.position.set(0, 0.12, 15.6);
    aveWalkCenter.receiveShadow = true;
    this.scene.add(aveWalkCenter);

    const aveWalkRight = new THREE.Mesh(
      new RoundedBoxGeometry(18.5, 0.24, 2.4, 3, 0.04),
      curbMat,
    );
    aveWalkRight.position.set(31.5, 0.12, 15.6);
    aveWalkRight.receiveShadow = true;
    this.scene.add(aveWalkRight);

    // 4. Acera Sur de la Avenida Exterior (Z = 25.6)
    const southSidewalk = new THREE.Mesh(
      new RoundedBoxGeometry(104, 0.26, 4.2, 3, 0.04),
      this.sidewalkMat,
    );
    southSidewalk.position.set(0, 0.13, 25.6);
    southSidewalk.receiveShadow = true;
    this.scene.add(southSidewalk);
  }

  buildSambilitoFacade() {
    const mallGroup = new THREE.Group();

    const wallMat = new THREE.MeshStandardMaterial({
      map: this.textures.cladding,
      bumpMap: this.textures.cladding,
      bumpScale: 0.015,
      roughness: 0.38,
      metalness: 0.22,
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.22,
    });
    const silverMetalMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.82,
      roughness: 0.2,
    });
    const goldLedMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

    // 1. Cuerpo arquitectónico principal con paneles texturizados
    const mainBuilding = new THREE.Mesh(
      new RoundedBoxGeometry(82, 10.4, 5.2, 4, 0.14),
      wallMat,
    );
    mainBuilding.position.set(0, 5.2, -21.8);
    mainBuilding.castShadow = true;
    mainBuilding.receiveShadow = true;
    mallGroup.add(mainBuilding);

    const upperTier = new THREE.Mesh(
      new RoundedBoxGeometry(46, 2.8, 4.4, 4, 0.12),
      darkMetalMat,
    );
    upperTier.position.set(0, 11.4, -21.6);
    upperTier.castShadow = true;
    mallGroup.add(upperTier);

    const upperGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.22,
      roughness: 0.08,
      metalness: 0.2,
      transmission: 0.65,
      transparent: true,
      opacity: 0.9,
    });
    const upperWindow = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 1.8),
      upperGlassMat,
    );
    upperWindow.position.set(0, 11.5, -19.38);
    mallGroup.add(upperWindow);

    // Domo central de cristal
    const domeGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      emissive: 0xfef3c7,
      emissiveIntensity: 0.25,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.78,
      transparent: true,
      opacity: 0.88,
    });
    const vaultGeo = new THREE.CylinderGeometry(
      7.5,
      7.5,
      5.0,
      32,
      1,
      false,
      0,
      Math.PI,
    );
    vaultGeo.rotateZ(Math.PI / 2);
    vaultGeo.rotateY(Math.PI / 2);
    const glassVault = new THREE.Mesh(vaultGeo, domeGlassMat);
    glassVault.scale.set(1.2, 0.55, 1.0);
    glassVault.position.set(0, 12.6, -21.6);
    mallGroup.add(glassVault);

    const ribGeo = new THREE.CylinderGeometry(
      7.62,
      7.62,
      0.18,
      32,
      1,
      false,
      0,
      Math.PI,
    );
    ribGeo.rotateZ(Math.PI / 2);
    ribGeo.rotateY(Math.PI / 2);
    for (const rz of [-23.6, -21.6, -19.6]) {
      const rib = new THREE.Mesh(ribGeo, silverMetalMat);
      rib.scale.set(1.2, 0.56, 1.0);
      rib.position.set(0, 12.6, rz);
      mallGroup.add(rib);
    }

    const cornice = new THREE.Mesh(
      new RoundedBoxGeometry(82.8, 0.55, 5.6, 3, 0.06),
      darkMetalMat,
    );
    cornice.position.set(0, 10.35, -21.8);
    cornice.castShadow = true;
    mallGroup.add(cornice);

    const corniceLed = new THREE.Mesh(
      new THREE.BoxGeometry(82.4, 0.08, 0.1),
      goldLedMat,
    );
    corniceLed.position.set(0, 10.05, -19.05);
    mallGroup.add(corniceLed);

    const pilasterGeo = new RoundedBoxGeometry(0.9, 10.2, 0.55, 3, 0.05);
    const ledStripGeo = new THREE.BoxGeometry(0.1, 9.4, 0.58);
    for (const px of [-38, -28.5, -15.5, -6.2, 6.2, 15.5, 28.5, 38]) {
      const pilaster = new THREE.Mesh(pilasterGeo, darkMetalMat);
      pilaster.position.set(px, 5.1, -19.25);
      pilaster.castShadow = true;
      mallGroup.add(pilaster);

      const strip = new THREE.Mesh(ledStripGeo, goldLedMat);
      strip.position.set(px, 5.1, -19.24);
      mallGroup.add(strip);
    }

    // 2. Paneles de madera con textura de veta natural y Louvers 3D
    const woodMat = new THREE.MeshStandardMaterial({
      map: this.textures.wood,
      bumpMap: this.textures.wood,
      bumpScale: 0.015,
      roughness: 0.42,
      metalness: 0.1,
    });
    const panelGeo = new RoundedBoxGeometry(11.8, 8.8, 0.25, 3, 0.04);
    for (const wx of [-22, 22]) {
      const woodPanel = new THREE.Mesh(panelGeo, woodMat);
      woodPanel.position.set(wx, 4.8, -19.22);
      woodPanel.castShadow = true;
      mallGroup.add(woodPanel);
    }

    const louverMat = new THREE.MeshStandardMaterial({
      map: this.textures.wood,
      color: 0xe08e45,
      roughness: 0.35,
      metalness: 0.12,
    });
    const louverGeo = new RoundedBoxGeometry(0.12, 8.5, 0.18, 2, 0.02);
    const slatsPerSide = 26;
    const louverInstanced = new THREE.InstancedMesh(
      louverGeo,
      louverMat,
      slatsPerSide * 2,
    );
    const dummy = new THREE.Object3D();
    let lIdx = 0;
    for (const baseX of [-22, 22]) {
      for (let s = 0; s < slatsPerSide; s++) {
        const sx = baseX - 5.5 + s * (11.0 / (slatsPerSide - 1));
        dummy.position.set(sx, 4.8, -19.08);
        dummy.updateMatrix();
        louverInstanced.setMatrixAt(lIdx++, dummy.matrix);
      }
    }
    louverInstanced.instanceMatrix.needsUpdate = true;
    mallGroup.add(louverInstanced);

    // 3. Vitrinas Comerciales
    this.createShopFront(mallGroup, -33.2, "MODA & HOGAR", 0xe11d48);
    this.createShopFront(mallGroup, -22.0, "CAFE & DELI", 0xd97706);
    this.createShopFront(mallGroup, -10.8, "CINEMA 3D", 0x2563eb);
    this.createShopFront(mallGroup, 10.8, "BOUTIQUE", 0x059669);
    this.createShopFront(mallGroup, 22.0, "TECH HUB", 0x6366f1);
    this.createShopFront(mallGroup, 33.2, "SPORT ZONE", 0x0891b2);

    // 4. Pórtico central y vestíbulo interior
    const portalFrame = new THREE.Mesh(
      new RoundedBoxGeometry(11.4, 5.4, 0.95, 4, 0.06),
      darkMetalMat,
    );
    portalFrame.position.set(0, 2.7, -19.2);
    mallGroup.add(portalFrame);

    const lobbyFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(10.4, 4.2),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.15,
        metalness: 0.1,
      }),
    );
    lobbyFloor.rotation.x = -Math.PI / 2;
    lobbyFloor.position.set(0, 0.25, -21.0);
    mallGroup.add(lobbyFloor);

    const lobbyBackWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10.4, 4.8),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: 0xffedd5,
        emissiveIntensity: 0.28,
      }),
    );
    lobbyBackWall.position.set(0, 2.5, -22.8);
    mallGroup.add(lobbyBackWall);

    const innerWelcome = new THREE.Mesh(
      new RoundedBoxGeometry(3.8, 1.8, 0.15, 2, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xfef3c7 }),
    );
    innerWelcome.position.set(0, 2.4, -22.6);
    mallGroup.add(innerWelcome);

    this.doorL = this.createDetailedSlidingDoor();
    this.doorL.position.set(-1.85, 2.05, -19.05);
    mallGroup.add(this.doorL);

    this.doorR = this.createDetailedSlidingDoor();
    this.doorR.position.set(1.85, 2.05, -19.05);
    mallGroup.add(this.doorR);

    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.2,
    });
    const canopy = new THREE.Mesh(
      new RoundedBoxGeometry(14.8, 0.44, 5.4, 4, 0.08),
      canopyMat,
    );
    canopy.position.set(0, 5.2, -16.7);
    canopy.castShadow = true;
    mallGroup.add(canopy);

    const canopyFascia = new THREE.Mesh(
      new RoundedBoxGeometry(15.0, 0.18, 5.5, 3, 0.03),
      darkMetalMat,
    );
    canopyFascia.position.set(0, 5.42, -16.7);
    mallGroup.add(canopyFascia);

    const canopyGlow = new THREE.Mesh(
      new RoundedBoxGeometry(13.8, 0.06, 4.6, 2, 0.01),
      new THREE.MeshBasicMaterial({ color: 0xfef3c7 }),
    );
    canopyGlow.position.set(0, 4.96, -16.7);
    mallGroup.add(canopyGlow);

    const colGeo = new THREE.CylinderGeometry(0.16, 0.16, 5.0, 24);
    const colBaseGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.45, 24);
    for (const x of [-6.4, 6.4]) {
      const col = new THREE.Mesh(colGeo, silverMetalMat);
      col.position.set(x, 2.6, -14.7);
      col.castShadow = true;
      mallGroup.add(col);

      const colBase = new THREE.Mesh(colBaseGeo, darkMetalMat);
      colBase.position.set(x, 0.35, -14.7);
      mallGroup.add(colBase);
    }

    // 5. Rótulo Principal
    const signBack = new THREE.Mesh(
      new RoundedBoxGeometry(18.6, 2.25, 0.48, 4, 0.08),
      darkMetalMat,
    );
    signBack.position.set(0, 7.65, -18.95);
    signBack.castShadow = true;
    mallGroup.add(signBack);

    const textCanvas = document.createElement("canvas");
    textCanvas.width = 1024;
    textCanvas.height = 256;
    const tCtx = textCanvas.getContext("2d");
    tCtx.fillStyle = "#090d16";
    tCtx.fillRect(0, 0, 1024, 256);

    tCtx.strokeStyle = "#f59e0b";
    tCtx.lineWidth = 10;
    tCtx.strokeRect(14, 14, 996, 228);

    tCtx.fillStyle = "#ffffff";
    tCtx.font = 'bold 122px "Google Sans", sans-serif';
    tCtx.textAlign = "center";
    tCtx.textBaseline = "middle";
    tCtx.letterSpacing = "12px";
    tCtx.fillText("SAMBILITO", 512, 110);

    tCtx.font = '700 34px "Google Sans", sans-serif';
    tCtx.fillStyle = "#fbbf24";
    tCtx.letterSpacing = "18px";
    tCtx.fillText("SHOPPING MALL", 512, 188);

    const signTex = new THREE.CanvasTexture(textCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.15,
      metalness: 0.1,
      emissive: 0xffffff,
      emissiveMap: signTex,
      emissiveIntensity: 0.38,
    });
    const signBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(17.8, 1.92),
      signMat,
    );
    signBoard.position.set(0, 7.65, -18.7);
    mallGroup.add(signBoard);

    // 6. Jardineras texturizadas adosadas a la fachada
    const potGeo = new RoundedBoxGeometry(2.2, 0.58, 0.72, 4, 0.08);
    const potMat = new THREE.MeshStandardMaterial({
      map: this.textures.bark,
      color: 0x9a3412,
      roughness: 0.6,
    });
    const bushMat = new THREE.MeshStandardMaterial({
      map: this.textures.foliage,
      bumpMap: this.textures.foliage,
      bumpScale: 0.03,
      roughness: 0.75,
    });

    for (const x of [-28.5, -15.5, 15.5, 28.5]) {
      const pot = new THREE.Mesh(potGeo, potMat);
      pot.position.set(x, 0.48, -18.45);
      pot.castShadow = true;
      mallGroup.add(pot);

      const bushBase = new THREE.Mesh(
        new RoundedBoxGeometry(1.95, 0.45, 0.55, 3, 0.12),
        bushMat,
      );
      bushBase.position.set(x, 0.88, -18.45);
      mallGroup.add(bushBase);

      for (const bx of [-0.55, 0, 0.55]) {
        const crown = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.34, 1),
          bushMat,
        );
        crown.position.set(x + bx, 1.08, -18.45);
        mallGroup.add(crown);
      }
    }

    this.scene.add(mallGroup);
  }

  createDetailedSlidingDoor() {
    const doorGroup = new THREE.Group();

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.88,
      roughness: 0.18,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transmission: 0.78,
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.72,
    });

    const glass = new THREE.Mesh(
      new RoundedBoxGeometry(3.5, 3.7, 0.08, 2, 0.02),
      glassMat,
    );
    doorGroup.add(glass);

    const barH = new THREE.BoxGeometry(3.62, 0.12, 0.12);
    const topBar = new THREE.Mesh(barH, frameMat);
    topBar.position.y = 1.85;
    doorGroup.add(topBar);

    const botBar = new THREE.Mesh(barH, frameMat);
    botBar.position.y = -1.85;
    doorGroup.add(botBar);

    const handleBar = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.06, 0.14),
      frameMat,
    );
    handleBar.position.y = -0.08;
    doorGroup.add(handleBar);

    return doorGroup;
  }

  createShopFront(parentGroup, x, labelText, accentColor) {
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.65,
      roughness: 0.28,
    });
    const frame = new THREE.Mesh(
      new RoundedBoxGeometry(7.6, 4.4, 0.38, 3, 0.05),
      frameMat,
    );
    frame.position.set(x, 2.4, -19.2);
    parentGroup.add(frame);

    const shopBack = new THREE.Mesh(
      new THREE.PlaneGeometry(6.9, 3.6),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: accentColor,
        emissiveIntensity: 0.15,
      }),
    );
    shopBack.position.set(x, 2.3, -19.12);
    parentGroup.add(shopBack);

    const displayMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
    });
    for (const dx of [-1.6, 0, 1.6]) {
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, 1.1, 12),
        displayMat,
      );
      stand.position.set(x + dx, 1.1, -19.06);
      parentGroup.add(stand);

      const bust = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.14, 0.35, 6, 10),
        new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4 }),
      );
      bust.position.set(x + dx, 1.85, -19.06);
      parentGroup.add(bust);
    }

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.05,
      metalness: 0.15,
      transmission: 0.65,
      transparent: true,
      opacity: 0.78,
    });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 3.6), glassMat);
    glass.position.set(x, 2.3, -18.98);
    parentGroup.add(glass);

    const awningMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.45,
    });
    const awning = new THREE.Mesh(
      new RoundedBoxGeometry(7.4, 0.22, 1.1, 3, 0.04),
      awningMat,
    );
    awning.rotation.x = 0.18;
    awning.position.set(x, 4.25, -18.65);
    awning.castShadow = true;
    parentGroup.add(awning);

    const sCanvas = document.createElement("canvas");
    sCanvas.width = 512;
    sCanvas.height = 96;
    const sCtx = sCanvas.getContext("2d");
    sCtx.fillStyle = "#0f172a";
    sCtx.fillRect(0, 0, 512, 96);
    sCtx.strokeStyle = `#${accentColor.toString(16).padStart(6, "0")}`;
    sCtx.lineWidth = 6;
    sCtx.strokeRect(6, 6, 500, 84);
    sCtx.fillStyle = "#ffffff";
    sCtx.font = 'bold 42px "Google Sans", sans-serif';
    sCtx.textAlign = "center";
    sCtx.textBaseline = "middle";
    sCtx.letterSpacing = "4px";
    sCtx.fillText(labelText, 256, 50);

    const sTex = new THREE.CanvasTexture(sCanvas);
    sTex.colorSpace = THREE.SRGBColorSpace;
    const signMat = new THREE.MeshStandardMaterial({
      map: sTex,
      emissive: 0xffffff,
      emissiveMap: sTex,
      emissiveIntensity: 0.28,
      roughness: 0.2,
    });
    const sign = new THREE.Mesh(
      new RoundedBoxGeometry(7.2, 0.78, 0.22, 2, 0.03),
      signMat,
    );
    sign.position.set(x, 4.92, -19.0);
    parentGroup.add(sign);
  }

  buildBothControlBooths() {
    const islandMat = new THREE.MeshStandardMaterial({
      map: this.textures.concrete,
      bumpMap: this.textures.concrete,
      bumpScale: 0.012,
      roughness: 0.68,
    });
    const hazardYellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.4,
    });
    const boothWallMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.28,
      metalness: 0.08,
    });
    const darkFrameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.82,
      roughness: 0.24,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.75,
      roughness: 0.25,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      transmission: 0.86,
      transparent: true,
      opacity: 0.42,
      roughness: 0.04,
      metalness: 0.08,
    });

    const createBoothSignTex = (title) => {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 96;
      const cx = c.getContext("2d");
      cx.fillStyle = "#090d16";
      cx.fillRect(0, 0, 512, 96);
      cx.strokeStyle = "#38bdf8";
      cx.lineWidth = 6;
      cx.strokeRect(6, 6, 500, 84);
      cx.fillStyle = "#ffffff";
      cx.font = 'bold 40px "Google Sans", sans-serif';
      cx.textAlign = "center";
      cx.textBaseline = "middle";
      cx.fillText(title, 256, 50);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const createSecurityGuard = (isEntrance) => {
      const guardRoot = new THREE.Group();

      const uniformMat = new THREE.MeshStandardMaterial({
        color: 0x172554,
        roughness: 0.5,
      });
      const skinMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.4,
      });
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        metalness: 0.9,
        roughness: 0.15,
      });
      const tieMat = new THREE.MeshStandardMaterial({
        color: 0x991b1b,
        roughness: 0.5,
      });

      const torso = new THREE.Mesh(
        new RoundedBoxGeometry(0.42, 0.54, 0.26, 4, 0.06),
        uniformMat,
      );
      torso.position.y = 1.08;
      guardRoot.add(torso);

      const tie = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.28, 0.02),
        tieMat,
      );
      tie.position.set(0, 1.12, 0.135);
      guardRoot.add(tie);

      const badge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.02, 8),
        goldMat,
      );
      badge.rotation.x = Math.PI / 2;
      badge.position.set(0.11, 1.2, 0.135);
      guardRoot.add(badge);

      const headGroup = new THREE.Group();
      headGroup.position.y = 1.52;
      guardRoot.add(headGroup);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 18, 18),
        skinMat,
      );
      headGroup.add(head);

      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      for (const ex of [-0.068, 0.068]) {
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 10, 10),
          eyeMat,
        );
        eye.position.set(ex, 0.02, 0.15);
        headGroup.add(eye);

        const pupil = new THREE.Mesh(
          new THREE.SphereGeometry(0.022, 8, 8),
          pupilMat,
        );
        pupil.position.set(ex, 0.02, 0.195);
        headGroup.add(pupil);
      }

      const capCrown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.19, 0.12, 20),
        uniformMat,
      );
      capCrown.position.set(0, 0.16, 0);
      headGroup.add(capCrown);

      const capVisor = new THREE.Mesh(
        new RoundedBoxGeometry(0.32, 0.03, 0.18, 2, 0.01),
        new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.2 }),
      );
      capVisor.position.set(0, 0.11, 0.14);
      headGroup.add(capVisor);

      const capEmblem = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 8, 8),
        goldMat,
      );
      capEmblem.position.set(0, 0.16, 0.2);
      headGroup.add(capEmblem);

      const armWavePivot = new THREE.Group();
      const waveSide = isEntrance ? 1 : -1;
      armWavePivot.position.set(waveSide * 0.25, 1.28, 0);

      const armMesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.05, 0.34, 8, 12),
        uniformMat,
      );
      armMesh.position.y = -0.16;
      armWavePivot.add(armMesh);

      const handMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 10, 10),
        skinMat,
      );
      handMesh.position.y = -0.36;
      armWavePivot.add(handMesh);
      guardRoot.add(armWavePivot);

      const armRestPivot = new THREE.Group();
      armRestPivot.position.set(-waveSide * 0.25, 1.28, 0);
      const armRestMesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.05, 0.34, 8, 12),
        uniformMat,
      );
      armRestMesh.position.y = -0.16;
      armRestPivot.add(armRestMesh);
      armRestPivot.rotation.x = -0.55;
      guardRoot.add(armRestPivot);

      guardRoot.rotation.y = isEntrance ? -Math.PI / 2 : Math.PI / 2;

      return {
        root: guardRoot,
        headGroup,
        armWavePivot,
        isEntrance,
      };
    };

    const createBoothUnit = (boothX, laneX, isEntrance) => {
      const group = new THREE.Group();

      const island = new THREE.Mesh(
        new RoundedBoxGeometry(3.2, 0.28, 9.8, 4, 0.06),
        islandMat,
      );
      island.position.set(boothX, 0.14, this.tollZ);
      island.castShadow = true;
      island.receiveShadow = true;
      group.add(island);

      const hazardNose = new THREE.Mesh(
        new RoundedBoxGeometry(3.24, 0.29, 0.7, 3, 0.04),
        hazardYellowMat,
      );
      hazardNose.position.set(boothX, 0.145, this.tollZ + 4.6);
      group.add(hazardNose);

      const curbOffset = isEntrance ? -2.4 : 2.4;
      const curbOuter = new THREE.Mesh(
        new RoundedBoxGeometry(1.1, 0.28, 8.6, 4, 0.06),
        islandMat,
      );
      curbOuter.position.set(laneX + curbOffset, 0.14, this.tollZ);
      curbOuter.castShadow = true;
      group.add(curbOuter);

      const basePlinth = new THREE.Mesh(
        new RoundedBoxGeometry(2.4, 0.95, 3.6, 4, 0.06),
        boothWallMat,
      );
      basePlinth.position.set(boothX, 0.6, this.tollZ);
      basePlinth.castShadow = true;
      basePlinth.receiveShadow = true;
      group.add(basePlinth);

      const beltStrip = new THREE.Mesh(
        new RoundedBoxGeometry(2.44, 0.18, 3.64, 2, 0.02),
        darkFrameMat,
      );
      beltStrip.position.set(boothX, 0.98, this.tollZ);
      group.add(beltStrip);

      const cornerGeo = new THREE.BoxGeometry(0.16, 2.1, 0.16);
      for (const cx of [-1.08, 1.08]) {
        for (const cz of [-1.68, 1.68]) {
          const post = new THREE.Mesh(cornerGeo, darkFrameMat);
          post.position.set(boothX + cx, 2.05, this.tollZ + cz);
          post.castShadow = true;
          group.add(post);
        }
      }

      const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 2.1, 0.14),
        boothWallMat,
      );
      backWall.position.set(boothX, 2.05, this.tollZ - 1.68);
      group.add(backWall);

      const sideGlassGeo = new THREE.PlaneGeometry(3.2, 1.95);
      const glassLeft = new THREE.Mesh(sideGlassGeo, glassMat);
      glassLeft.rotation.y = -Math.PI / 2;
      glassLeft.position.set(boothX - 1.12, 2.05, this.tollZ);
      group.add(glassLeft);

      const glassRight = new THREE.Mesh(sideGlassGeo, glassMat);
      glassRight.rotation.y = Math.PI / 2;
      glassRight.position.set(boothX + 1.12, 2.05, this.tollZ);
      group.add(glassRight);

      const glassFront = new THREE.Mesh(
        new THREE.PlaneGeometry(2.1, 1.95),
        glassMat,
      );
      glassFront.position.set(boothX, 2.05, this.tollZ + 1.72);
      group.add(glassFront);

      const desk = new THREE.Mesh(
        new RoundedBoxGeometry(0.65, 0.08, 2.2, 2, 0.02),
        darkFrameMat,
      );
      const deskX = boothX + (isEntrance ? -0.55 : 0.55);
      desk.position.set(deskX, 1.12, this.tollZ);
      group.add(desk);

      const monitorScreenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      for (const mz of [-0.42, 0.42]) {
        const monCase = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.34, 0.52),
          darkFrameMat,
        );
        monCase.position.set(deskX, 1.32, this.tollZ + mz);
        monCase.rotation.y = isEntrance ? 0.15 : -0.15;
        group.add(monCase);

        const monScreen = new THREE.Mesh(
          new THREE.PlaneGeometry(0.46, 0.28),
          monitorScreenMat,
        );
        monScreen.rotation.y = isEntrance
          ? Math.PI / 2 + 0.15
          : -Math.PI / 2 - 0.15;
        monScreen.position.set(
          deskX + (isEntrance ? 0.035 : -0.035),
          1.32,
          this.tollZ + mz,
        );
        group.add(monScreen);
      }

      const ceilingPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 2.4),
        new THREE.MeshBasicMaterial({ color: 0xfef3c7 }),
      );
      ceilingPanel.rotation.x = Math.PI / 2;
      ceilingPanel.position.set(boothX, 3.01, this.tollZ);
      group.add(ceilingPanel);

      const guard = createSecurityGuard(isEntrance);
      guard.root.position.set(
        boothX + (isEntrance ? 0.15 : -0.15),
        0.15,
        this.tollZ,
      );
      group.add(guard.root);
      this.boothGuards.push(guard);

      const roof = new THREE.Mesh(
        new RoundedBoxGeometry(3.5, 0.28, 4.5, 4, 0.06),
        roofMat,
      );
      roof.position.set(boothX, 3.16, this.tollZ);
      roof.castShadow = true;
      group.add(roof);

      const hvacUnit = new THREE.Mesh(
        new RoundedBoxGeometry(0.95, 0.38, 1.1, 3, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4 }),
      );
      hvacUnit.position.set(boothX, 3.45, this.tollZ - 0.9);
      group.add(hvacUnit);

      const signTex = createBoothSignTex(
        isEntrance ? "CONTROL ENTRADA" : "CONTROL SALIDA",
      );
      const signMat = new THREE.MeshStandardMaterial({
        map: signTex,
        emissive: 0xffffff,
        emissiveMap: signTex,
        emissiveIntensity: 0.35,
      });
      const signMesh = new THREE.Mesh(
        new RoundedBoxGeometry(2.6, 0.46, 0.14, 2, 0.02),
        signMat,
      );
      signMesh.position.set(boothX, 3.48, this.tollZ + 2.15);
      group.add(signMesh);

      const beaconBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.26, 0.18, 24),
        darkFrameMat,
      );
      beaconBase.position.set(boothX, 3.38, this.tollZ + 0.4);
      group.add(beaconBase);

      const beaconDomeMat = new THREE.MeshPhysicalMaterial({
        color: 0xdc2626,
        emissive: 0xdc2626,
        emissiveIntensity: 0.2,
        roughness: 0.08,
        transmission: 0.68,
        transparent: true,
        opacity: 0.95,
      });
      const alarmBeacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.17, 0.34, 24),
        beaconDomeMat,
      );
      alarmBeacon.position.set(boothX, 3.58, this.tollZ + 0.4);
      group.add(alarmBeacon);

      const alarmLight = new THREE.PointLight(0xef4444, 0, 18, 2);
      alarmLight.position.set(boothX, 3.8, this.tollZ + 0.4);
      group.add(alarmLight);

      this.alarmBeacons.push(alarmBeacon);
      this.alarmLights.push(alarmLight);

      const bollardGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.85, 16);
      const bollardGlowGeo = new THREE.CylinderGeometry(0.082, 0.082, 0.14, 16);
      const bollardGlowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      for (const bx of [-1.25, 1.25]) {
        for (const bz of [-4.2, 4.2]) {
          const bol = new THREE.Mesh(bollardGeo, darkFrameMat);
          bol.position.set(boothX + bx, 0.56, this.tollZ + bz);
          group.add(bol);

          const bGlow = new THREE.Mesh(bollardGlowGeo, bollardGlowMat);
          bGlow.position.set(boothX + bx, 0.88, this.tollZ + bz);
          group.add(bGlow);
        }
      }

      this.scene.add(group);
    };

    createBoothUnit(this.boothInX, this.laneInX, true);
    createBoothUnit(this.boothOutX, this.laneOutX, false);
  }

  buildEntranceDisplayTotem() {
    const totemGroup = new THREE.Group();

    this.totemCanvas = document.createElement("canvas");
    this.totemCanvas.width = 512;
    this.totemCanvas.height = 512;
    this.totemCtx = this.totemCanvas.getContext("2d");
    this.totemTex = new THREE.CanvasTexture(this.totemCanvas);
    this.totemTex.colorSpace = THREE.SRGBColorSpace;

    const baseMat = new THREE.MeshStandardMaterial({
      map: this.textures.concrete,
      roughness: 0.7,
    });
    const base = new THREE.Mesh(
      new RoundedBoxGeometry(1.65, 0.38, 1.25, 4, 0.06),
      baseMat,
    );
    base.position.y = 0.19;
    base.castShadow = true;
    totemGroup.add(base);

    const mastMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
    });
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.19, 2.2, 24),
      mastMat,
    );
    mast.position.y = 1.35;
    mast.castShadow = true;
    totemGroup.add(mast);

    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      metalness: 0.85,
      roughness: 0.22,
    });
    const screenBox = new THREE.Mesh(
      new RoundedBoxGeometry(2.48, 2.48, 0.38, 4, 0.08),
      boxMat,
    );
    screenBox.position.y = 3.6;
    screenBox.castShadow = true;
    totemGroup.add(screenBox);

    const screenMat = new THREE.MeshStandardMaterial({
      map: this.totemTex,
      roughness: 0.1,
      metalness: 0.05,
      emissive: 0xffffff,
      emissiveMap: this.totemTex,
      emissiveIntensity: 0.35,
    });
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.24, 2.24),
      screenMat,
    );
    screen.position.set(0, 3.6, 0.2);
    totemGroup.add(screen);

    this.totemLight = new THREE.PointLight(0x22c55e, 1.1, 6.5);
    this.totemLight.position.set(0, 3.6, 0.65);
    totemGroup.add(this.totemLight);

    totemGroup.position.set(this.laneInX - 2.6, 0, 12.6);
    totemGroup.rotation.y = 0.15;

    this.scene.add(totemGroup);
    this.updateDisplayTotem(0, false);
  }

  updateDisplayTotem(count, isAlarm) {
    if (!this.totemCtx) return;
    const ctx = this.totemCtx;
    const w = 512;
    const h = 512;

    ctx.fillStyle = "#0a0e17";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = isAlarm ? "#ef4444" : "#22c55e";
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold 36px "Google Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("SAMBILITO", w / 2, 60);

    ctx.fillStyle = "#94a3b8";
    ctx.font = '500 22px "Google Sans", sans-serif';
    ctx.fillText("ESTACIONAMIENTO", w / 2, 95);

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 115);
    ctx.lineTo(w - 40, 115);
    ctx.stroke();

    ctx.fillStyle = "#020617";
    ctx.fillRect(80, 135, w - 160, 210);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 4;
    ctx.strokeRect(80, 135, w - 160, 210);

    ctx.fillStyle = isAlarm ? "#ef4444" : "#22c55e";
    ctx.font = 'bold 160px "Google Sans", sans-serif';
    ctx.textBaseline = "middle";
    ctx.fillText(String(count), w / 2, 240);

    ctx.textBaseline = "alphabetic";
    if (isAlarm || count >= 7) {
      ctx.fillStyle = "#ef4444";
      ctx.font = 'bold 32px "Google Sans", sans-serif';
      ctx.fillText("¡COMPLETO!", w / 2, 395);
      ctx.font = '500 22px "Google Sans", sans-serif';
      ctx.fillStyle = "#fca5a5";
      ctx.fillText("SOBRECUPO ACTIVADO", w / 2, 435);
    } else {
      const free = 7 - count;
      ctx.fillStyle = "#22c55e";
      ctx.font = 'bold 30px "Google Sans", sans-serif';
      ctx.fillText(`${free} PUESTOS LIBRES`, w / 2, 395);
      ctx.font = '500 22px "Google Sans", sans-serif';
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`OCUPADOS: ${count} DE 7`, w / 2, 435);
    }

    ctx.fillStyle = "#64748b";
    ctx.font = '500 16px "Google Sans", sans-serif';
    ctx.fillText("BIENVENIDO", w / 2, 480);

    this.totemTex.needsUpdate = true;

    if (this.totemLight) {
      const col = isAlarm ? 0xef4444 : 0x22c55e;
      this.totemLight.color.setHex(col);
    }
  }

  buildPerimeterEnclosure() {
    const enclosureGroup = new THREE.Group();

    const curbMat = new THREE.MeshStandardMaterial({
      map: this.textures.concrete,
      bumpMap: this.textures.concrete,
      bumpScale: 0.015,
      roughness: 0.72,
    });
    const hedgeMat = new THREE.MeshStandardMaterial({
      map: this.textures.hedge,
      bumpMap: this.textures.hedge,
      bumpScale: 0.04,
      roughness: 0.82,
    });
    const steelPostMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.25,
    });
    const steelRailMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3,
    });

    const frontFenceZ = 14.3;
    const segmentsData = [
      [-40.5, -14.5, -40.5, frontFenceZ],
      [-35.5, frontFenceZ, this.laneInX - 3.6, frontFenceZ],
      [this.boothInX + 2.2, frontFenceZ, this.boothOutX - 2.2, frontFenceZ],
      [this.laneOutX + 3.6, frontFenceZ, 35.5, frontFenceZ],
      [40.5, frontFenceZ, 40.5, -14.5],
    ];

    const postMatrices = [];
    const barMatrices = [];
    const dummy = new THREE.Object3D();

    for (const [x1, z1, x2, z2] of segmentsData) {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.hypot(dx, dz);
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;
      const angle = Math.atan2(dx, dz);

      const segment = new THREE.Group();
      segment.position.set(midX, 0, midZ);
      segment.rotation.y = angle;

      const curb = new THREE.Mesh(
        new RoundedBoxGeometry(0.46, 0.34, length, 3, 0.05),
        curbMat,
      );
      curb.position.y = 0.17;
      curb.castShadow = true;
      curb.receiveShadow = true;
      segment.add(curb);

      const hedge = new THREE.Mesh(
        new RoundedBoxGeometry(0.55, 0.72, length * 0.98, 4, 0.14),
        hedgeMat,
      );
      hedge.position.set(0, 0.64, 0);
      hedge.castShadow = true;
      segment.add(hedge);

      const railTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, length),
        steelRailMat,
      );
      railTop.position.set(0, 1.42, 0);
      segment.add(railTop);

      const railBottom = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, length),
        steelRailMat,
      );
      railBottom.position.set(0, 0.94, 0);
      segment.add(railBottom);

      enclosureGroup.add(segment);

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const postCount = Math.max(2, Math.floor(length / 2.8) + 1);
      for (let i = 0; i < postCount; i++) {
        const localZ = -length / 2 + (length / (postCount - 1)) * i;
        dummy.position.set(midX + localZ * sinA, 0.77, midZ + localZ * cosA);
        dummy.rotation.set(0, angle, 0);
        dummy.updateMatrix();
        postMatrices.push(dummy.matrix.clone());
      }

      const barCount = Math.floor(length / 0.4);
      for (let j = 0; j < barCount; j++) {
        const localZ = -length / 2 + 0.2 + j * 0.4;
        if (localZ < length / 2 - 0.1) {
          dummy.position.set(midX + localZ * sinA, 1.18, midZ + localZ * cosA);
          dummy.rotation.set(0, angle, 0);
          dummy.updateMatrix();
          barMatrices.push(dummy.matrix.clone());
        }
      }
    }

    const postGeo = new RoundedBoxGeometry(0.13, 1.54, 0.13, 2, 0.02);
    const instancedPosts = new THREE.InstancedMesh(
      postGeo,
      steelPostMat,
      postMatrices.length,
    );
    instancedPosts.castShadow = true;
    postMatrices.forEach((mat, idx) => instancedPosts.setMatrixAt(idx, mat));
    instancedPosts.instanceMatrix.needsUpdate = true;
    enclosureGroup.add(instancedPosts);

    const barGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.56, 8);
    const instancedBars = new THREE.InstancedMesh(
      barGeo,
      steelRailMat,
      barMatrices.length,
    );
    barMatrices.forEach((mat, idx) => instancedBars.setMatrixAt(idx, mat));
    instancedBars.instanceMatrix.needsUpdate = true;
    enclosureGroup.add(instancedBars);

    this.scene.add(enclosureGroup);
  }

  buildBaysAndSensors() {
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
    });
    const stopperMat = new THREE.MeshStandardMaterial({
      map: this.textures.concrete,
      color: 0xfacc15,
      roughness: 0.5,
    });
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.7,
      roughness: 0.28,
    });

    const beam = new THREE.Mesh(
      new RoundedBoxGeometry(
        this.totalBays * this.baySpacing + 2.2,
        0.18,
        0.18,
        3,
        0.03,
      ),
      trussMat,
    );
    beam.position.set(0, 4.3, this.bayZ);
    beam.castShadow = true;
    this.scene.add(beam);

    const supportZ = -14.7;
    const postLeftX = this.bayStartX - 1.6;
    const postRightX = -this.bayStartX + 1.6;

    for (const px of [postLeftX, postRightX]) {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.15, 4.3, 20),
        trussMat,
      );
      col.position.set(px, 2.15, supportZ);
      col.castShadow = true;
      this.scene.add(col);

      const cantilever = new THREE.Mesh(
        new RoundedBoxGeometry(
          0.15,
          0.15,
          Math.abs(this.bayZ - supportZ),
          2,
          0.02,
        ),
        trussMat,
      );
      cantilever.position.set(px, 4.3, (this.bayZ + supportZ) / 2);
      cantilever.castShadow = true;
      this.scene.add(cantilever);
    }

    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const gCtx = glowCanvas.getContext("2d");
    const grad = gCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.55)");
    grad.addColorStop(0.5, "rgba(255, 255, 255, 0.18)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, 128, 128);
    const glowTex = new THREE.CanvasTexture(glowCanvas);

    const createBayNumberTex = (numStr) => {
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 128;
      const cx = c.getContext("2d");
      cx.clearRect(0, 0, 128, 128);
      cx.strokeStyle = "rgba(255,255,255,0.35)";
      cx.lineWidth = 4;
      cx.strokeRect(14, 24, 100, 80);
      cx.fillStyle = "rgba(255,255,255,0.65)";
      cx.font = 'bold 52px "Google Sans", sans-serif';
      cx.textAlign = "center";
      cx.textBaseline = "middle";
      cx.fillText(numStr, 64, 66);
      return new THREE.CanvasTexture(c);
    };

    const lineGeo = new THREE.PlaneGeometry(0.16, 5.8);
    const stopperGeo = new RoundedBoxGeometry(2.1, 0.16, 0.28, 3, 0.04);
    const sensorBodyGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.24, 20);
    const sensorBodyMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.7,
      roughness: 0.3,
    });
    const ledGeo = new THREE.SphereGeometry(0.11, 16, 16);
    const floorGlowGeo = new THREE.PlaneGeometry(2.6, 2.6);
    const numPlaneGeo = new THREE.PlaneGeometry(1.4, 1.4);

    for (let i = 0; i < this.totalBays; i++) {
      const x = this.bayStartX + i * this.baySpacing;

      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x - this.baySpacing / 2, 0.009, this.bayZ);
      line.receiveShadow = true;
      this.scene.add(line);

      if (i === this.totalBays - 1) {
        const lastLine = new THREE.Mesh(lineGeo, lineMat);
        lastLine.rotation.x = -Math.PI / 2;
        lastLine.position.set(x + this.baySpacing / 2, 0.009, this.bayZ);
        lastLine.receiveShadow = true;
        this.scene.add(lastLine);
      }

      const numTex = createBayNumberTex(`0${i + 1}`);
      const numMesh = new THREE.Mesh(
        numPlaneGeo,
        new THREE.MeshBasicMaterial({
          map: numTex,
          transparent: true,
          depthWrite: false,
        }),
      );
      numMesh.rotation.x = -Math.PI / 2;
      numMesh.position.set(x, 0.011, this.bayZ + 1.85);
      this.scene.add(numMesh);

      const stopper = new THREE.Mesh(stopperGeo, stopperMat);
      stopper.position.set(x, 0.08, this.bayZ - 2.45);
      stopper.castShadow = true;
      stopper.receiveShadow = true;
      this.scene.add(stopper);

      const sensorBody = new THREE.Mesh(sensorBodyGeo, sensorBodyMat);
      sensorBody.position.set(x, 4.18, this.bayZ);
      this.scene.add(sensorBody);

      const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(x, 4.04, this.bayZ);
      this.scene.add(led);

      const floorGlowMat = new THREE.MeshBasicMaterial({
        map: glowTex,
        color: 0x22c55e,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      });
      const floorGlow = new THREE.Mesh(floorGlowGeo, floorGlowMat);
      floorGlow.rotation.x = -Math.PI / 2;
      floorGlow.position.set(x, 0.015, this.bayZ);
      this.scene.add(floorGlow);

      this.baySensors.push({
        led,
        ledMat,
        floorGlowMat,
        occupied: false,
      });
    }
  }

  /**
   * ÁRBOLES CON CORTEZA Y FOLLAJE TEXTURIZADO MULTICAPA + MOBILIARIO URBANO
   */
  buildParkingDecorations() {
    const decoGroup = new THREE.Group();

    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.25,
    });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    const trunkMat = new THREE.MeshStandardMaterial({
      map: this.textures.bark,
      bumpMap: this.textures.bark,
      bumpScale: 0.03,
      roughness: 0.88,
    });
    const leafMatDark = new THREE.MeshStandardMaterial({
      map: this.textures.foliage,
      bumpMap: this.textures.foliage,
      bumpScale: 0.04,
      color: 0x15803d,
      roughness: 0.78,
    });
    const leafMatMid = new THREE.MeshStandardMaterial({
      map: this.textures.foliage,
      bumpMap: this.textures.foliage,
      bumpScale: 0.04,
      color: 0x22c55e,
      roughness: 0.75,
    });
    const leafMatLight = new THREE.MeshStandardMaterial({
      map: this.textures.foliage,
      bumpMap: this.textures.foliage,
      bumpScale: 0.04,
      color: 0x4ade80,
      roughness: 0.72,
    });

    // 1. Farolas LED arquitectónicas
    const createStreetLight = (x, z, rotY) => {
      const lamp = new THREE.Group();
      lamp.position.set(x, 0, z);
      lamp.rotation.y = rotY;

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, 0.4, 16),
        poleMat,
      );
      base.position.y = 0.2;
      lamp.add(base);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 5.6, 16),
        poleMat,
      );
      pole.position.y = 3.0;
      pole.castShadow = true;
      lamp.add(pole);

      const arm = new THREE.Mesh(
        new RoundedBoxGeometry(0.12, 0.1, 1.4, 2, 0.02),
        poleMat,
      );
      arm.position.set(0, 5.75, 0.55);
      lamp.add(arm);

      const head = new THREE.Mesh(
        new RoundedBoxGeometry(0.38, 0.08, 0.65, 2, 0.02),
        poleMat,
      );
      head.position.set(0, 5.73, 1.15);
      lamp.add(head);

      const led = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.52), bulbMat);
      led.rotation.x = Math.PI / 2;
      led.position.set(0, 5.68, 1.15);
      lamp.add(led);

      decoGroup.add(lamp);
    };

    createStreetLight(-35.2, -10.0, Math.PI / 2);
    createStreetLight(-35.2, 4.0, Math.PI / 2);
    createStreetLight(35.2, -10.0, -Math.PI / 2);
    createStreetLight(35.2, 4.0, -Math.PI / 2);
    createStreetLight(-6.5, 13.5, Math.PI);
    createStreetLight(6.5, 13.5, Math.PI);

    // 2. Árboles detallados con raíces, ramas y follaje facetado orgánico
    const crownGeo = new THREE.IcosahedronGeometry(1.0, 2);
    const soilMat = new THREE.MeshStandardMaterial({
      map: this.textures.bark,
      color: 0x3f2e21,
      roughness: 0.95,
    });
    const ringMat = new THREE.MeshStandardMaterial({
      map: this.textures.concrete,
      roughness: 0.7,
    });

    const createOrnamentalTree = (x, z, scale = 1.0) => {
      const tree = new THREE.Group();
      tree.position.set(x, 0, z);
      tree.scale.set(scale, scale, scale);

      // Alcorque de concreto y tierra orgánica
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 1.02, 0.28, 24),
        ringMat,
      );
      ring.position.y = 0.14;
      tree.add(ring);

      const soil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.82, 0.82, 0.3, 20),
        soilMat,
      );
      soil.position.y = 0.15;
      tree.add(soil);

      // Tronco principal con corteza texturizada
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.28, 2.4, 16),
        trunkMat,
      );
      trunk.position.y = 1.25;
      trunk.castShadow = true;
      tree.add(trunk);

      // Ramas secundarias visibles bajo el follaje
      for (const [bx, bz, rotZ, rotX] of [
        [0.28, 0.12, -0.55, 0.2],
        [-0.26, -0.15, 0.52, -0.22],
        [0.1, -0.25, -0.2, -0.5],
      ]) {
        const branch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.11, 0.9, 10),
          trunkMat,
        );
        branch.position.set(bx, 2.15, bz);
        branch.rotation.set(rotX, 0, rotZ);
        tree.add(branch);
      }

      // 6 racimos de follaje orgánico con texturas de hojas y relieve
      const clusters = [
        { pos: [0, 2.85, 0], s: [1.35, 1.05, 1.35], mat: leafMatDark },
        { pos: [0.65, 2.65, 0.45], s: [0.95, 0.85, 0.95], mat: leafMatMid },
        { pos: [-0.65, 2.7, -0.4], s: [1.0, 0.88, 0.95], mat: leafMatMid },
        { pos: [-0.45, 2.68, 0.58], s: [0.88, 0.8, 0.88], mat: leafMatDark },
        { pos: [0.5, 2.75, -0.55], s: [0.9, 0.82, 0.9], mat: leafMatMid },
        { pos: [0, 3.45, 0.08], s: [1.02, 0.88, 1.02], mat: leafMatLight },
      ];

      for (const cl of clusters) {
        const mesh = new THREE.Mesh(crownGeo, cl.mat);
        mesh.position.set(...cl.pos);
        mesh.scale.set(...cl.s);
        mesh.rotation.set(
          Math.random() * 1.5,
          Math.random() * 1.5,
          Math.random() * 1.5,
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        tree.add(mesh);
      }

      decoGroup.add(tree);
    };

    createOrnamentalTree(-33.5, -12.5, 1.05);
    createOrnamentalTree(33.5, -12.5, 1.05);
    createOrnamentalTree(-33.5, 11.8, 0.95);
    createOrnamentalTree(33.5, 11.8, 0.95);
    createOrnamentalTree(0, 12.6, 1.0);
    // Árboles en la acera exterior sur de la avenida
    createOrnamentalTree(-24.0, 26.2, 0.95);
    createOrnamentalTree(0.0, 26.2, 1.05);
    createOrnamentalTree(24.0, 26.2, 0.95);

    // 3. Bancas con textura de madera real
    const benchWoodMat = new THREE.MeshStandardMaterial({
      map: this.textures.wood,
      bumpMap: this.textures.wood,
      bumpScale: 0.015,
      roughness: 0.48,
    });
    const createBench = (x, z, rotY) => {
      const bench = new THREE.Group();
      bench.position.set(x, 0.24, z);
      bench.rotation.y = rotY;

      const seat = new THREE.Mesh(
        new RoundedBoxGeometry(1.6, 0.08, 0.5, 2, 0.02),
        benchWoodMat,
      );
      seat.position.y = 0.42;
      seat.castShadow = true;
      bench.add(seat);

      const back = new THREE.Mesh(
        new RoundedBoxGeometry(1.6, 0.42, 0.07, 2, 0.02),
        benchWoodMat,
      );
      back.position.set(0, 0.66, -0.22);
      back.rotation.x = -0.15;
      bench.add(back);

      for (const lx of [-0.65, 0.65]) {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.42, 0.46),
          poleMat,
        );
        leg.position.set(lx, 0.21, 0);
        bench.add(leg);
      }

      decoGroup.add(bench);
    };

    createBench(-36.5, -6.0, Math.PI / 2);
    createBench(-36.5, 2.0, Math.PI / 2);
    createBench(36.5, -6.0, -Math.PI / 2);
    createBench(36.5, 2.0, -Math.PI / 2);

    // 4. Reductores de velocidad
    const bumpMatY = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.5,
    });
    const bumpMatB = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.6,
    });
    const bumpStripeGeo = new RoundedBoxGeometry(0.42, 0.07, 0.45, 2, 0.02);

    for (const laneX of [this.laneInX, this.laneOutX]) {
      for (let k = -3; k <= 3; k++) {
        const stripe = new THREE.Mesh(
          bumpStripeGeo,
          k % 2 === 0 ? bumpMatY : bumpMatB,
        );
        stripe.position.set(laneX + k * 0.44, 0.02, 12.2);
        decoGroup.add(stripe);
      }
    }

    this.scene.add(decoGroup);
  }

  buildBarriers() {
    this.entranceGate = this.createBarrier(
      this.boothInX - 1.2,
      0,
      this.tollZ,
      -1,
    );
    this.exitGate = this.createBarrier(this.boothOutX + 1.2, 0, this.tollZ, 1);
  }

  createBarrier(x, y, z, dirSign) {
    const group = new THREE.Group();

    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
      metalness: 0.1,
    });
    const darkCapMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.25,
    });

    const base = new THREE.Mesh(
      new RoundedBoxGeometry(0.5, 1.28, 0.5, 4, 0.06),
      baseMat,
    );
    base.position.set(0, 0.64, 0);
    base.castShadow = true;
    group.add(base);

    const cap = new THREE.Mesh(
      new RoundedBoxGeometry(0.54, 0.14, 0.54, 3, 0.04),
      darkCapMat,
    );
    cap.position.set(0, 1.3, 0);
    group.add(cap);

    const pivot = new THREE.Group();
    pivot.position.set(0, 1.12, 0);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.54, 20),
      darkCapMat,
    );
    hub.rotation.x = Math.PI / 2;
    pivot.add(hub);

    const armLength = 2.85;
    const armMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
    });
    const arm = new THREE.Mesh(
      new RoundedBoxGeometry(armLength, 0.12, 0.09, 3, 0.02),
      armMat,
    );
    arm.position.set((armLength / 2) * dirSign, 0, 0);
    arm.castShadow = true;
    pivot.add(arm);

    const stripMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const strip = new THREE.Mesh(
      new RoundedBoxGeometry(armLength * 0.94, 0.045, 0.1, 2, 0.01),
      stripMat,
    );
    strip.position.set((armLength / 2) * dirSign, 0, 0);
    pivot.add(strip);

    group.add(pivot);
    group.position.set(x, y, z);
    this.scene.add(group);

    return {
      pivot,
      stripMat,
      dirSign,
      currentAngle: 0,
      targetAngle: 0,
      velocity: 0,
    };
  }

  buildRoadSignage() {
    const createArrowTexture = (pointsNorth) => {
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 256;
      const cx = c.getContext("2d");
      cx.clearRect(0, 0, 128, 256);
      cx.fillStyle = "#ffffff";

      cx.beginPath();
      if (pointsNorth) {
        cx.moveTo(64, 20);
        cx.lineTo(110, 95);
        cx.lineTo(78, 95);
        cx.lineTo(78, 230);
        cx.lineTo(50, 230);
        cx.lineTo(50, 95);
        cx.lineTo(18, 95);
      } else {
        cx.moveTo(64, 236);
        cx.lineTo(110, 161);
        cx.lineTo(78, 161);
        cx.lineTo(78, 26);
        cx.lineTo(50, 26);
        cx.lineTo(50, 161);
        cx.lineTo(18, 161);
      }
      cx.closePath();
      cx.fill();

      return new THREE.CanvasTexture(c);
    };

    const arrowGeo = new THREE.PlaneGeometry(1.6, 3.2);

    const inTex = createArrowTexture(true);
    const inMat = new THREE.MeshBasicMaterial({
      map: inTex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const arrowIn = new THREE.Mesh(arrowGeo, inMat);
    arrowIn.rotation.x = -Math.PI / 2;
    arrowIn.position.set(this.laneInX, 0.014, 14.2);
    this.scene.add(arrowIn);

    const outTex = createArrowTexture(false);
    const outMat = new THREE.MeshBasicMaterial({
      map: outTex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const arrowOut = new THREE.Mesh(arrowGeo, outMat);
    arrowOut.rotation.x = -Math.PI / 2;
    arrowOut.position.set(this.laneOutX, 0.014, 14.2);
    this.scene.add(arrowOut);
  }

  initPedestrianSystem() {
    const simpsonYellow = 0xfacc15;
    this.skinMat = new THREE.MeshStandardMaterial({
      color: simpsonYellow,
      roughness: 0.4,
    });
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.shoeMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
    });
    this.soleMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.5,
    });

    this.pedGeo = {
      head: new THREE.SphereGeometry(0.185, 20, 20),
      ear: new THREE.SphereGeometry(0.04, 10, 10),
      eye: new THREE.SphereGeometry(0.052, 12, 12),
      pupil: new THREE.SphereGeometry(0.022, 10, 10),
      hair: new THREE.SphereGeometry(0.195, 18, 18),
      neck: new THREE.CylinderGeometry(0.065, 0.075, 0.12, 14),
      torso: new RoundedBoxGeometry(0.38, 0.5, 0.24, 4, 0.07),
      hips: new RoundedBoxGeometry(0.36, 0.14, 0.23, 3, 0.05),
      leg: new THREE.CapsuleGeometry(0.068, 0.52, 8, 14),
      shoe: new RoundedBoxGeometry(0.14, 0.08, 0.24, 3, 0.03),
      sole: new RoundedBoxGeometry(0.145, 0.03, 0.25, 2, 0.01),
      arm: new THREE.CapsuleGeometry(0.048, 0.34, 8, 12),
      hand: new THREE.SphereGeometry(0.052, 12, 12),
    };

    this.shirtPalette = [
      0xffffff, 0xea580c, 0x84cc16, 0xdc2626, 0xec4899, 0x06b6d4, 0x8b5cf6,
      0x10b981, 0xf59e0b, 0x3b82f6,
    ];
    this.pantsPalette = [
      0x2563eb, 0x0284c7, 0x1e293b, 0x334155, 0x475569, 0x1f2937, 0x78350f,
      0x3f3f46,
    ];
    this.hairPalette = [
      0x92400e, 0xfacc15, 0x1d4ed8, 0x451a03, 0x1e293b, 0x78350f, 0x0f172a,
      0x581c87,
    ];

    for (let i = 0; i < this.maxPedestrians; i++) {
      const agent = this.buildCharacterMesh();
      this.scene.add(agent.root);
      this.respawnAgent(agent, true);
      this.pedestrians.push(agent);
    }
  }

  buildCharacterMesh() {
    const root = new THREE.Group();
    const g = this.pedGeo;

    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.65,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.65,
    });

    const upperBody = new THREE.Group();
    upperBody.position.y = 0.78;
    root.add(upperBody);

    const torso = new THREE.Mesh(g.torso, shirtMat);
    torso.position.y = 0.27;
    torso.castShadow = true;
    upperBody.add(torso);

    const neck = new THREE.Mesh(g.neck, this.skinMat);
    neck.position.y = 0.56;
    upperBody.add(neck);

    const headGroup = new THREE.Group();
    headGroup.position.y = 0.7;
    upperBody.add(headGroup);

    const head = new THREE.Mesh(g.head, this.skinMat);
    head.castShadow = true;
    headGroup.add(head);

    for (const earX of [-0.18, 0.18]) {
      const ear = new THREE.Mesh(g.ear, this.skinMat);
      ear.position.set(earX, 0, 0);
      headGroup.add(ear);
    }

    for (const eyeX of [-0.068, 0.068]) {
      const eye = new THREE.Mesh(g.eye, this.eyeMat);
      eye.position.set(eyeX, 0.02, 0.145);
      headGroup.add(eye);

      const pupil = new THREE.Mesh(g.pupil, this.pupilMat);
      pupil.position.set(eyeX, 0.02, 0.19);
      headGroup.add(pupil);
    }

    const hair = new THREE.Mesh(g.hair, hairMat);
    hair.position.set(0, 0.055, -0.035);
    headGroup.add(hair);

    const armLeftPivot = new THREE.Group();
    armLeftPivot.position.set(-0.24, 0.46, 0);
    const armLeft = new THREE.Mesh(g.arm, shirtMat);
    armLeft.position.y = -0.18;
    armLeft.castShadow = true;
    armLeftPivot.add(armLeft);
    const handLeft = new THREE.Mesh(g.hand, this.skinMat);
    handLeft.position.y = -0.4;
    armLeftPivot.add(handLeft);
    upperBody.add(armLeftPivot);

    const armRightPivot = new THREE.Group();
    armRightPivot.position.set(0.24, 0.46, 0);
    const armRight = new THREE.Mesh(g.arm, shirtMat);
    armRight.position.y = -0.18;
    armRight.castShadow = true;
    armRightPivot.add(armRight);
    const handRight = new THREE.Mesh(g.hand, this.skinMat);
    handRight.position.y = -0.4;
    armRightPivot.add(handRight);
    upperBody.add(armRightPivot);

    const hips = new THREE.Mesh(g.hips, pantsMat);
    hips.position.y = 0.76;
    root.add(hips);

    const createLegAssembly = (offsetX) => {
      const pivot = new THREE.Group();
      pivot.position.set(offsetX, 0.74, 0);

      const leg = new THREE.Mesh(g.leg, pantsMat);
      leg.position.y = -0.34;
      leg.castShadow = true;
      pivot.add(leg);

      const shoe = new THREE.Mesh(g.shoe, this.shoeMat);
      shoe.position.set(0, -0.68, 0.035);
      shoe.castShadow = true;
      pivot.add(shoe);

      const sole = new THREE.Mesh(g.sole, this.soleMat);
      sole.position.set(0, -0.72, 0.035);
      pivot.add(sole);

      return pivot;
    };

    const legLeftPivot = createLegAssembly(-0.105);
    const legRightPivot = createLegAssembly(0.105);
    root.add(legLeftPivot);
    root.add(legRightPivot);

    return {
      root,
      upperBody,
      headGroup,
      shirtMat,
      pantsMat,
      hairMat,
      legLeftPivot,
      legRightPivot,
      armLeftPivot,
      armRightPivot,
      waypoints: [],
      currentLeg: 0,
      pos: new THREE.Vector3(),
      speed: 1.5,
      walkCycle: 0,
    };
  }

  respawnAgent(agent, initialScatter = false) {
    const shirtColor =
      this.shirtPalette[Math.floor(Math.random() * this.shirtPalette.length)];
    const pantsColor =
      this.pantsPalette[Math.floor(Math.random() * this.pantsPalette.length)];
    const hairColor =
      this.hairPalette[Math.floor(Math.random() * this.hairPalette.length)];

    agent.shirtMat.color.setHex(shirtColor);
    agent.pantsMat.color.setHex(pantsColor);
    agent.hairMat.color.setHex(hairColor);

    const scale = 0.9 + Math.random() * 0.2;
    agent.root.scale.set(scale, scale, scale);

    agent.speed = 1.45 + Math.random() * 0.55;
    agent.walkCycle = Math.random() * Math.PI * 2;

    const sidewalkY = 0.24;
    const mallZ = -16.4 + (Math.random() * 1.1 - 0.55);
    const doorZ = -21.2;
    const doorX = Math.random() * 2.2 - 1.1;
    const westX = -38.0 + (Math.random() * 1.0 - 0.5);
    const eastX = 38.0 + (Math.random() * 1.0 - 0.5);
    const streetNorthZ = 15.6 + (Math.random() * 0.6 - 0.3);
    const streetSouthZ = 25.1 + (Math.random() * 0.8 - 0.4);

    const routeType = Math.floor(Math.random() * 8);
    const waypoints = [];

    if (routeType === 0) {
      waypoints.push(new THREE.Vector3(-45, sidewalkY, streetNorthZ));
      waypoints.push(new THREE.Vector3(westX, sidewalkY, streetNorthZ));
      waypoints.push(new THREE.Vector3(westX, sidewalkY, mallZ));
      waypoints.push(new THREE.Vector3(doorX, sidewalkY, mallZ));
      waypoints.push(new THREE.Vector3(doorX, sidewalkY, doorZ));
    } else if (routeType === 1) {
      waypoints.push(new THREE.Vector3(45, sidewalkY, streetNorthZ));
      waypoints.push(new THREE.Vector3(eastX, sidewalkY, streetNorthZ));
      waypoints.push(new THREE.Vector3(eastX, sidewalkY, mallZ));
      waypoints.push(new THREE.Vector3(doorX, sidewalkY, mallZ));
      waypoints.push(new THREE.Vector3(doorX, sidewalkY, doorZ));
    } else if (routeType === 2) {
      waypoints.push(new THREE.Vector3(doorX, sidewalkY, doorZ));
      waypoints.push(new THREE.Vector3(doorX, sidewalkY, mallZ));
      waypoints.push(new THREE.Vector3(westX, sidewalkY, mallZ));
      waypoints.push(new THREE.Vector3(westX, sidewalkY, streetNorthZ));
      waypoints.push(new THREE.Vector3(-45, sidewalkY, streetNorthZ));
    } else if (routeType === 3) {
      waypoints.push(new THREE.Vector3(doorX, sidewalkY, doorZ));
      waypoints.push(new THREE.Vector3(doorX, sidewalkY, mallZ));
      waypoints.push(new THREE.Vector3(eastX, sidewalkY, mallZ));
      waypoints.push(new THREE.Vector3(eastX, sidewalkY, streetNorthZ));
      waypoints.push(new THREE.Vector3(45, sidewalkY, streetNorthZ));
    } else if (routeType === 4) {
      waypoints.push(new THREE.Vector3(westX, sidewalkY, streetNorthZ));
      waypoints.push(new THREE.Vector3(westX, sidewalkY, mallZ));
      waypoints.push(new THREE.Vector3(eastX, sidewalkY, mallZ));
      waypoints.push(new THREE.Vector3(eastX, sidewalkY, streetNorthZ));
    } else if (routeType === 5) {
      waypoints.push(new THREE.Vector3(eastX, sidewalkY, streetNorthZ));
      waypoints.push(new THREE.Vector3(eastX, sidewalkY, mallZ));
      waypoints.push(new THREE.Vector3(westX, sidewalkY, mallZ));
      waypoints.push(new THREE.Vector3(westX, sidewalkY, streetNorthZ));
    } else if (routeType === 6) {
      waypoints.push(new THREE.Vector3(-48, sidewalkY, streetSouthZ));
      waypoints.push(new THREE.Vector3(48, sidewalkY, streetSouthZ));
    } else {
      waypoints.push(new THREE.Vector3(48, sidewalkY, streetSouthZ));
      waypoints.push(new THREE.Vector3(-48, sidewalkY, streetSouthZ));
    }

    agent.waypoints = waypoints;
    agent.currentLeg = 0;

    if (initialScatter) {
      const randomLeg = Math.floor(Math.random() * (waypoints.length - 1));
      agent.currentLeg = randomLeg;
      const pA = waypoints[randomLeg];
      const pB = waypoints[randomLeg + 1];
      agent.pos.lerpVectors(pA, pB, Math.random());
    } else {
      agent.pos.copy(waypoints[0]);
    }

    agent.root.position.copy(agent.pos);
  }

  updatePedestrians(delta) {
    const sidewalkY = 0.24;
    let someoneNearDoor = false;

    for (const p of this.pedestrians) {
      if (p.currentLeg >= p.waypoints.length - 1) {
        this.respawnAgent(p);
        continue;
      }

      const pB = p.waypoints[p.currentLeg + 1];
      this.tempVec.subVectors(pB, p.pos);
      this.tempVec.y = 0;
      const dist = this.tempVec.length();

      if (dist < 0.22) {
        p.currentLeg++;
        if (p.currentLeg >= p.waypoints.length - 1) {
          this.respawnAgent(p);
          continue;
        }
      } else {
        this.tempVec.normalize();
        const step = Math.min(dist, p.speed * delta);
        p.pos.addScaledVector(this.tempVec, step);
        p.root.position.x = p.pos.x;
        p.root.position.z = p.pos.z;

        const targetRot = Math.atan2(this.tempVec.x, this.tempVec.z);
        let diff = targetRot - p.root.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        p.root.rotation.y += diff * Math.min(delta * 10.5, 1.0);
      }

      p.walkCycle += delta * p.speed * 7.8;
      const sinC = Math.sin(p.walkCycle);
      const cosC = Math.cos(p.walkCycle);

      const legSwing = sinC * 0.52;
      p.legLeftPivot.rotation.x = legSwing;
      p.legRightPivot.rotation.x = -legSwing;

      p.armLeftPivot.rotation.x = -legSwing * 0.78;
      p.armRightPivot.rotation.x = legSwing * 0.78;
      p.armLeftPivot.rotation.z = 0.06;
      p.armRightPivot.rotation.z = -0.06;

      p.upperBody.rotation.y = -sinC * 0.11;
      p.upperBody.rotation.z = cosC * 0.035;
      p.headGroup.rotation.y = sinC * 0.07;

      const stepBob = Math.abs(sinC) * 0.032;
      p.root.position.y = sidewalkY + stepBob;

      const distToDoor = Math.hypot(p.pos.x, p.pos.z - -19.05);
      if (distToDoor < 3.8) {
        someoneNearDoor = true;
      }
    }

    const targetDoorOpen = someoneNearDoor ? 1.0 : 0.0;
    this.doorCurrentOpen +=
      (targetDoorOpen - this.doorCurrentOpen) * Math.min(delta * 9.0, 1.0);

    if (this.doorL && this.doorR) {
      this.doorL.position.x = -1.85 - this.doorCurrentOpen * 2.2;
      this.doorR.position.x = 1.85 + this.doorCurrentOpen * 2.2;
    }
  }

  setBayOccupied(index, occupied) {
    if (index < 0 || index >= this.baySensors.length) return;
    const sensor = this.baySensors[index];
    sensor.occupied = occupied;

    const color = occupied ? 0xef4444 : 0x22c55e;
    sensor.ledMat.color.setHex(color);
    sensor.floorGlowMat.color.setHex(color);
  }

  setEntranceBarrier(open) {
    this.entranceGate.targetAngle = open ? -Math.PI / 2.15 : 0;
    this.entranceGate.stripMat.color.setHex(open ? 0x22c55e : 0xdc2626);
  }

  setExitBarrier(open) {
    this.exitGate.targetAngle = open ? Math.PI / 2.15 : 0;
    this.exitGate.stripMat.color.setHex(open ? 0x22c55e : 0xdc2626);
  }

  setAlarmBeacon(active) {
    this.alarmActive = active;
    if (!active) {
      this.alarmLights.forEach((l) => (l.intensity = 0));
    }
  }

  /**
   * Adapta automáticamente el ángulo y distancia de cámara en pantallas móviles verticales
   */
  setCameraView(viewName) {
    this.currentCameraView = viewName;
    const isMobilePortrait =
      window.innerWidth <= 768 && window.innerHeight > window.innerWidth;

    const positions = {
      isometric: isMobilePortrait
        ? { pos: [0, 38, 56], target: [0, -1, 2] }
        : { pos: [0, 30, 42], target: [0, 0, 1] },
      "gate-in": isMobilePortrait
        ? { pos: [-31, 9.5, 25], target: [-17, 1.5, 9.5] }
        : { pos: [-28, 7, 20], target: [-17, 2, 9.5] },
      "gate-out": isMobilePortrait
        ? { pos: [31, 9.5, 25], target: [17, 1.5, 9.5] }
        : { pos: [28, 7, 20], target: [17, 2, 9.5] },
      top: isMobilePortrait
        ? { pos: [0, 68, 3], target: [0, 0, 2] }
        : { pos: [0, 52, 2], target: [0, 0, 2] },
    };

    const config = positions[viewName] || positions["isometric"];
    this.camera.position.set(...config.pos);
    if (this.controls) {
      this.controls.target.set(...config.target);
      this.controls.update();
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  updateBarrierSpring(gate, delta) {
    if (!gate) return;
    const stiffness = 130;
    const damping = 16;
    const force = (gate.targetAngle - gate.currentAngle) * stiffness;
    gate.velocity += (force - gate.velocity * damping) * delta;
    gate.currentAngle += gate.velocity * delta;
    gate.pivot.rotation.z = gate.currentAngle;
  }

  updateGuards(delta) {
    this.guardClock += delta * 2.2;
    for (const g of this.boothGuards) {
      g.headGroup.rotation.y = Math.sin(this.guardClock) * 0.35;

      const gateOpen = g.isEntrance
        ? Math.abs(this.entranceGate?.targetAngle || 0) > 0.1
        : Math.abs(this.exitGate?.targetAngle || 0) > 0.1;

      const targetArmX = gateOpen ? -2.2 : 0.0;
      g.armWavePivot.rotation.x = THREE.MathUtils.lerp(
        g.armWavePivot.rotation.x,
        targetArmX,
        0.15,
      );
    }
  }

  update(delta) {
    this.controls.update();

    this.updatePedestrians(delta);
    this.updateGuards(delta);

    this.updateBarrierSpring(this.entranceGate, delta);
    this.updateBarrierSpring(this.exitGate, delta);

    if (this.alarmActive && this.alarmBeacons.length) {
      this.beaconAngle += delta * 14;
      const flash = (Math.sin(this.beaconAngle * 2) + 1) * 0.5;
      const intensity = flash > 0.4 ? 6.5 : 0.4;

      this.alarmBeacons.forEach((b) => (b.rotation.y = this.beaconAngle));
      this.alarmLights.forEach((l) => (l.intensity = intensity));
    }

    this.renderer.render(this.scene, this.camera);
  }
}
