import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class ParkingScene {
  constructor(canvas) {
    this.canvas = canvas;

    // Distribución física ampliada
    this.totalBays = 7;
    this.baySpacing = 3.8;
    this.bayStartX = -((this.totalBays - 1) * this.baySpacing) / 2;
    this.bayZ = -11.0;
    this.drivewayZ = 1.0;

    // Dos Garitas independientes
    this.laneInX = -18.5;
    this.boothInX = -15.0;
    this.laneOutX = 18.5;
    this.boothOutX = 15.0;
    this.tollZ = 9.5;
    this.avenueZ = 19.5;

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

    // Tótem Electrónico 3D
    this.totemCanvas = null;
    this.totemCtx = null;
    this.totemTex = null;
    this.totemLight = null;

    // Peatones
    this.pedestrians = [];
    this.maxPedestrians = 15;

    this.alarmActive = false;
    this.beaconAngle = 0;
    this.tempVec = new THREE.Vector3();

    this.initEngine();
    this.loadSkyDome();
    this.initLighting();
    this.buildPavementAndAvenue();
    this.buildSambilitoFacade();
    this.buildBothControlBooths();
    this.buildEntranceDisplayTotem();
    this.buildPerimeterEnclosure();
    this.buildBaysAndSensors();
    this.buildBarriers();
    this.buildRoadSignage();
    this.initPedestrianSystem();
  }

  initEngine() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa5c4e8);
    this.scene.fog = new THREE.FogExp2(0xa5c4e8, 0.0035);

    this.camera = new THREE.PerspectiveCamera(
      38,
      window.innerWidth / window.innerHeight,
      0.5,
      240,
    );
    this.setCameraView("isometric");

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.minDistance = 14;
    this.controls.maxDistance = 120;
    this.controls.target.set(0, 0, 1.5);

    window.addEventListener("resize", () => this.onWindowResize());
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
    });
  }

  initLighting() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.15);
    this.scene.add(hemiLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.6);
    fillLight.position.set(-30, 35, -30);
    this.scene.add(fillLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbf0, 2.4);
    this.sunLight.position.set(34, 46, 32);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 150;
    this.sunLight.shadow.camera.left = -44;
    this.sunLight.shadow.camera.right = 44;
    this.sunLight.shadow.camera.top = 38;
    this.sunLight.shadow.camera.bottom = -38;
    this.sunLight.shadow.bias = -0.0003;
    this.scene.add(this.sunLight);
  }

  buildPavementAndAvenue() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#23272f";
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 35000; i++) {
      const v = Math.floor(Math.random() * 20);
      ctx.fillStyle = `rgba(${42 + v}, ${48 + v}, ${58 + v}, 0.3)`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    const asphaltTex = new THREE.CanvasTexture(canvas);
    asphaltTex.wrapS = THREE.RepeatWrapping;
    asphaltTex.wrapT = THREE.RepeatWrapping;
    asphaltTex.repeat.set(22, 18);

    const groundMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.88,
      metalness: 0.08,
    });

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(96, 70), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 2);
    ground.receiveShadow = true;
    this.scene.add(ground);

    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    for (const offset of [-0.14, 0.14]) {
      const dLine = new THREE.Mesh(
        new THREE.PlaneGeometry(94, 0.16),
        yellowLineMat,
      );
      dLine.rotation.x = -Math.PI / 2;
      dLine.position.set(0, 0.012, this.avenueZ + offset);
      this.scene.add(dLine);
    }

    const curbMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      roughness: 0.75,
    });
    const southSidewalk = new THREE.Mesh(
      new THREE.BoxGeometry(96, 0.25, 4.0),
      curbMat,
    );
    southSidewalk.position.set(0, 0.125, this.avenueZ + 6.0);
    southSidewalk.castShadow = true;
    southSidewalk.receiveShadow = true;
    this.scene.add(southSidewalk);
  }

  buildRoadSignage() {
    const createArrowTexture = (pointsNorth) => {
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 256;
      const cx = c.getContext("2d");
      cx.clearRect(0, 0, 128, 256);
      cx.fillStyle = "#ffffff";

      if (pointsNorth) {
        cx.beginPath();
        cx.moveTo(64, 20);
        cx.lineTo(110, 95);
        cx.lineTo(78, 95);
        cx.lineTo(78, 230);
        cx.lineTo(50, 230);
        cx.lineTo(50, 95);
        cx.lineTo(18, 95);
        cx.closePath();
        cx.fill();
      } else {
        cx.beginPath();
        cx.moveTo(64, 236);
        cx.lineTo(110, 161);
        cx.lineTo(78, 161);
        cx.lineTo(78, 26);
        cx.lineTo(50, 26);
        cx.lineTo(50, 161);
        cx.lineTo(18, 161);
        cx.closePath();
        cx.fill();
      }

      return new THREE.CanvasTexture(c);
    };

    const inTex = createArrowTexture(true);
    const inMat = new THREE.MeshBasicMaterial({
      map: inTex,
      transparent: true,
      opacity: 0.95,
    });
    const arrowIn = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2), inMat);
    arrowIn.rotation.x = -Math.PI / 2;
    arrowIn.position.set(this.laneInX, 0.012, 13.5);
    this.scene.add(arrowIn);

    const outTex = createArrowTexture(false);
    const outMat = new THREE.MeshBasicMaterial({
      map: outTex,
      transparent: true,
      opacity: 0.95,
    });
    const arrowOut = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2), outMat);
    arrowOut.rotation.x = -Math.PI / 2;
    arrowOut.position.set(this.laneOutX, 0.012, 13.5);
    this.scene.add(arrowOut);
  }

  buildSambilitoFacade() {
    const mallGroup = new THREE.Group();

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e2430,
      roughness: 0.45,
    });
    const mainBuilding = new THREE.Mesh(
      new THREE.BoxGeometry(78, 9.5, 4.5),
      wallMat,
    );
    mainBuilding.position.set(0, 4.75, -21.5);
    mainBuilding.castShadow = true;
    mainBuilding.receiveShadow = true;
    mallGroup.add(mainBuilding);

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xa15217,
      roughness: 0.55,
      metalness: 0.05,
    });
    const woodL = new THREE.Mesh(new THREE.BoxGeometry(16, 8.2, 0.25), woodMat);
    woodL.position.set(-22, 4.5, -19.2);
    woodL.castShadow = true;
    mallGroup.add(woodL);

    const woodR = new THREE.Mesh(new THREE.BoxGeometry(16, 8.2, 0.25), woodMat);
    woodR.position.set(22, 4.5, -19.2);
    woodR.castShadow = true;
    mallGroup.add(woodR);

    this.createShopFront(mallGroup, -22, "CAFE & DELI", 0xb45309);
    this.createShopFront(mallGroup, -10, "CINEMA 3D", 0x3b82f6);
    this.createShopFront(mallGroup, 10, "BOUTIQUE", 0x059669);
    this.createShopFront(mallGroup, 22, "TECH HUB", 0x6366f1);

    const portalFrameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
    });
    const portalFrame = new THREE.Mesh(
      new THREE.BoxGeometry(9.0, 4.8, 0.8),
      portalFrameMat,
    );
    portalFrame.position.set(0, 2.4, -19.2);
    mallGroup.add(portalFrame);

    const doorGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x64748b,
      transmission: 0.7,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });

    this.doorL = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 3.8, 0.12),
      doorGlassMat,
    );
    this.doorL.position.set(-1.8, 2.0, -19.15);
    mallGroup.add(this.doorL);

    this.doorR = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 3.8, 0.12),
      doorGlassMat,
    );
    this.doorR.position.set(1.8, 2.0, -19.15);
    mallGroup.add(this.doorR);

    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.75,
      roughness: 0.25,
    });
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(13.5, 0.35, 5.0),
      canopyMat,
    );
    canopy.position.set(0, 4.9, -16.8);
    canopy.castShadow = true;
    mallGroup.add(canopy);

    for (const x of [-5.9, 5.9]) {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 4.9, 16),
        canopyMat,
      );
      col.position.set(x, 2.45, -14.6);
      col.castShadow = true;
      mallGroup.add(col);
    }

    const signBackMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.25,
      metalness: 0.8,
    });
    const signBack = new THREE.Mesh(
      new THREE.BoxGeometry(16.5, 1.8, 0.35),
      signBackMat,
    );
    signBack.position.set(0, 7.0, -19.0);
    mallGroup.add(signBack);

    // Textura tipográfica frontal en Google Sans
    const textCanvas = document.createElement("canvas");
    textCanvas.width = 1024;
    textCanvas.height = 256;
    const tCtx = textCanvas.getContext("2d");
    tCtx.fillStyle = "#0b0f19";
    tCtx.fillRect(0, 0, 1024, 256);

    tCtx.strokeStyle = "#f59e0b";
    tCtx.lineWidth = 6;
    tCtx.strokeRect(16, 16, 992, 224);

    tCtx.fillStyle = "#ffffff";
    tCtx.font = 'bold 118px "Google Sans", sans-serif';
    tCtx.textAlign = "center";
    tCtx.textBaseline = "middle";
    tCtx.letterSpacing = "12px";
    tCtx.fillText("SAMBILITO", 512, 115);

    tCtx.font = '600 32px "Google Sans", sans-serif';
    tCtx.fillStyle = "#f59e0b";
    tCtx.letterSpacing = "18px";
    tCtx.fillText("SHOPPING MALL", 512, 185);

    const signTex = new THREE.CanvasTexture(textCanvas);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.2,
      metalness: 0.1,
    });
    const signBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(15.5, 1.55),
      signMat,
    );
    signBoard.position.set(0, 7.0, -18.81);
    mallGroup.add(signBoard);

    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      roughness: 0.8,
    });
    const sidewalk = new THREE.Mesh(
      new THREE.BoxGeometry(78, 0.22, 4.6),
      sidewalkMat,
    );
    sidewalk.position.set(0, 0.11, -16.8);
    sidewalk.receiveShadow = true;
    mallGroup.add(sidewalk);

    for (const x of [-30, -16, 16, 30]) {
      const pot = new THREE.Mesh(
        new THREE.BoxGeometry(3.0, 0.65, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 }),
      );
      pot.position.set(x, 0.42, -16.4);
      pot.castShadow = true;
      mallGroup.add(pot);

      const bush = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.55, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.9 }),
      );
      bush.position.set(x, 0.85, -16.4);
      mallGroup.add(bush);
    }

    this.scene.add(mallGroup);
  }

  createShopFront(parentGroup, x, label, accentColor) {
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e2430,
      metalness: 0.4,
      roughness: 0.4,
    });
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(8.5, 4.2, 0.3),
      frameMat,
    );
    frame.position.set(x, 2.3, -19.2);
    parentGroup.add(frame);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.5,
      transparent: true,
      opacity: 0.85,
    });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 3.4), glassMat);
    glass.position.set(x, 2.2, -19.02);
    parentGroup.add(glass);

    const signMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.3,
    });
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 0.65, 0.15),
      signMat,
    );
    sign.position.set(x, 4.65, -19.05);
    parentGroup.add(sign);
  }

  buildBothControlBooths() {
    const createBoothUnit = (boothX, laneX, isEntrance) => {
      const group = new THREE.Group();
      const islandMat = new THREE.MeshStandardMaterial({
        color: 0xcfd8dc,
        roughness: 0.75,
      });

      const island = new THREE.Mesh(
        new THREE.BoxGeometry(3.0, 0.25, 9.5),
        islandMat,
      );
      island.position.set(boothX, 0.125, this.tollZ);
      island.castShadow = true;
      island.receiveShadow = true;
      group.add(island);

      const curbOffset = isEntrance ? -2.4 : 2.4;
      const curbOuter = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.25, 9.5),
        islandMat,
      );
      curbOuter.position.set(laneX + curbOffset, 0.125, this.tollZ);
      curbOuter.castShadow = true;
      group.add(curbOuter);

      const boothMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.35,
      });
      const booth = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 2.9, 3.4),
        boothMat,
      );
      booth.position.set(boothX, 1.55, this.tollZ);
      booth.castShadow = true;
      booth.receiveShadow = true;
      group.add(booth);

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x93c5fd,
        transmission: 0.8,
        transparent: true,
        opacity: 0.9,
        roughness: 0.05,
      });
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1.15, 2.2),
        glassMat,
      );
      glass.position.set(
        boothX + (isEntrance ? -1.11 : 1.11),
        1.75,
        this.tollZ,
      );
      group.add(glass);

      const roofMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.7,
        roughness: 0.3,
      });
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 0.2, 4.4),
        roofMat,
      );
      roof.position.set(boothX, 3.05, this.tollZ);
      roof.castShadow = true;
      group.add(roof);

      const beaconBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.26, 0.18, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 }),
      );
      beaconBase.position.set(boothX, 3.22, this.tollZ);
      group.add(beaconBase);

      const beaconDomeMat = new THREE.MeshPhysicalMaterial({
        color: 0xdc2626,
        roughness: 0.1,
        transmission: 0.65,
        transparent: true,
        opacity: 0.95,
      });
      const alarmBeacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.32, 16),
        beaconDomeMat,
      );
      alarmBeacon.position.set(boothX, 3.44, this.tollZ);
      group.add(alarmBeacon);

      const alarmLight = new THREE.PointLight(0xef4444, 0, 16, 2);
      alarmLight.position.set(boothX, 3.65, this.tollZ);
      group.add(alarmLight);

      this.alarmBeacons.push(alarmBeacon);
      this.alarmLights.push(alarmLight);

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
      color: 0xcfd8dc,
      roughness: 0.75,
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 1.2), baseMat);
    base.position.y = 0.175;
    base.castShadow = true;
    totemGroup.add(base);

    const mastMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3,
    });
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 2.2, 16),
      mastMat,
    );
    mast.position.y = 1.35;
    mast.castShadow = true;
    totemGroup.add(mast);

    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      metalness: 0.85,
      roughness: 0.25,
    });
    const screenBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.4, 0.35),
      boxMat,
    );
    screenBox.position.y = 3.6;
    screenBox.castShadow = true;
    totemGroup.add(screenBox);

    const screenMat = new THREE.MeshStandardMaterial({
      map: this.totemTex,
      roughness: 0.1,
      metalness: 0.05,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), screenMat);
    screen.position.set(0, 3.6, 0.18);
    totemGroup.add(screen);

    this.totemLight = new THREE.PointLight(0x22c55e, 1.2, 6);
    this.totemLight.position.set(0, 3.6, 0.6);
    totemGroup.add(this.totemLight);

    totemGroup.position.set(this.laneInX - 2.8, 0, 13.0);
    totemGroup.rotation.y = 0.15;

    this.scene.add(totemGroup);
    this.updateDisplayTotem(0, false);
  }

  /**
   * Pantalla digital del tótem renderizada en Google Sans
   */
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

    // Encabezado Google Sans
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

    // Número digital principal en Google Sans
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
      color: 0xcfd8dc,
      roughness: 0.8,
    });
    const hedgeMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.9,
    });
    const steelPostMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.3,
    });
    const steelRailMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.35,
    });

    const createBoundary = (x1, z1, x2, z2) => {
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
        new THREE.BoxGeometry(0.45, 0.32, length),
        curbMat,
      );
      curb.position.y = 0.16;
      curb.castShadow = true;
      curb.receiveShadow = true;
      segment.add(curb);

      const hedge = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.75, length * 0.99),
        hedgeMat,
      );
      hedge.position.set(0, 0.65, 0);
      hedge.castShadow = true;
      segment.add(hedge);

      const railTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, length),
        steelRailMat,
      );
      railTop.position.set(0, 1.45, 0);
      segment.add(railTop);

      const railBottom = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, length),
        steelRailMat,
      );
      railBottom.position.set(0, 0.95, 0);
      segment.add(railBottom);

      const postCount = Math.max(2, Math.floor(length / 2.8) + 1);
      for (let i = 0; i < postCount; i++) {
        const pz = -length / 2 + (length / (postCount - 1)) * i;
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 1.55, 0.12),
          steelPostMat,
        );
        post.position.set(0, 0.775, pz);
        post.castShadow = true;
        segment.add(post);
      }

      const barCount = Math.floor(length / 0.4);
      const barGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.58, 8);
      for (let j = 0; j < barCount; j++) {
        const bz = -length / 2 + 0.2 + j * 0.4;
        if (bz < length / 2 - 0.1) {
          const bar = new THREE.Mesh(barGeo, steelRailMat);
          bar.position.set(0, 1.2, bz);
          segment.add(bar);
        }
      }

      enclosureGroup.add(segment);
    };

    const frontFenceZ = 14.5;

    createBoundary(-41.0, -16.8, -41.0, frontFenceZ);
    createBoundary(-41.0, frontFenceZ, this.laneInX - 2.8, frontFenceZ);
    createBoundary(
      this.boothInX + 1.6,
      frontFenceZ,
      this.boothOutX - 1.6,
      frontFenceZ,
    );
    createBoundary(this.laneOutX + 2.8, frontFenceZ, 41.0, frontFenceZ);
    createBoundary(41.0, frontFenceZ, 41.0, -16.8);

    const createPlanter = (x, z) => {
      const pot = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.6, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 }),
      );
      pot.position.set(x, 0.3, z);
      pot.castShadow = true;
      enclosureGroup.add(pot);

      const shrub = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 12, 12),
        hedgeMat,
      );
      shrub.position.set(x, 0.75, z);
      shrub.castShadow = true;
      enclosureGroup.add(shrub);
    };

    createPlanter(this.laneInX - 2.8, frontFenceZ);
    createPlanter(this.boothInX + 1.6, frontFenceZ);
    createPlanter(this.boothOutX - 1.6, frontFenceZ);
    createPlanter(this.laneOutX + 2.8, frontFenceZ);

    this.scene.add(enclosureGroup);
  }

  buildBaysAndSensors() {
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
    });
    const stopperMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.7,
    });
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.6,
      roughness: 0.35,
    });

    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(this.totalBays * this.baySpacing + 2, 0.16, 0.16),
      trussMat,
    );
    beam.position.set(0, 4.3, this.bayZ);
    beam.castShadow = true;
    this.scene.add(beam);

    const supportZ = -15.0;
    const postLeftX = this.bayStartX - 1.6;
    const postRightX = -this.bayStartX + 1.6;

    for (const px of [postLeftX, postRightX]) {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 4.3, 16),
        trussMat,
      );
      col.position.set(px, 2.15, supportZ);
      col.castShadow = true;
      this.scene.add(col);

      const cantilever = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, Math.abs(this.bayZ - supportZ)),
        trussMat,
      );
      cantilever.position.set(px, 4.3, (this.bayZ + supportZ) / 2);
      cantilever.castShadow = true;
      this.scene.add(cantilever);
    }

    for (let i = 0; i < this.totalBays; i++) {
      const x = this.bayStartX + i * this.baySpacing;

      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 5.8), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x - this.baySpacing / 2, 0.008, this.bayZ);
      line.receiveShadow = true;
      this.scene.add(line);

      if (i === this.totalBays - 1) {
        const lastLine = new THREE.Mesh(
          new THREE.PlaneGeometry(0.16, 5.8),
          lineMat,
        );
        lastLine.rotation.x = -Math.PI / 2;
        lastLine.position.set(x + this.baySpacing / 2, 0.008, this.bayZ);
        lastLine.receiveShadow = true;
        this.scene.add(lastLine);
      }

      const stopper = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.16, 0.28),
        stopperMat,
      );
      stopper.position.set(x, 0.08, this.bayZ - 2.5);
      stopper.castShadow = true;
      stopper.receiveShadow = true;
      this.scene.add(stopper);

      const sensorBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.22, 16),
        new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 }),
      );
      sensorBody.position.set(x, 4.2, this.bayZ);
      sensorBody.castShadow = true;
      this.scene.add(sensorBody);

      const ledMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), ledMat);
      led.position.set(x, 4.06, this.bayZ);
      this.scene.add(led);

      const pointLight = new THREE.PointLight(0x16a34a, 0.7, 3.2);
      pointLight.position.set(x, 3.95, this.bayZ);
      this.scene.add(pointLight);

      this.baySensors.push({ led, ledMat, pointLight, occupied: false });
    }
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
      roughness: 0.35,
    });
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 1.25, 0.48),
      baseMat,
    );
    base.position.set(0, 0.625, 0);
    base.castShadow = true;
    group.add(base);

    const pivot = new THREE.Group();
    pivot.position.set(0, 1.15, 0);

    const armLength = 2.8;
    const armMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
    });
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(armLength, 0.11, 0.08),
      armMat,
    );
    arm.position.set((armLength / 2) * dirSign, 0, 0);
    arm.castShadow = true;
    pivot.add(arm);

    const stripMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(armLength * 0.95, 0.04, 0.09),
      stripMat,
    );
    strip.position.set((armLength / 2) * dirSign, 0, 0);
    pivot.add(strip);

    group.add(pivot);
    group.position.set(x, y, z);
    this.scene.add(group);

    return { pivot, stripMat, dirSign, currentAngle: 0, targetAngle: 0 };
  }

  initPedestrianSystem() {
    const simpsonYellow = 0xfacc15;
    this.skinMat = new THREE.MeshStandardMaterial({
      color: simpsonYellow,
      roughness: 0.45,
    });
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.shoeMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.8,
    });

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

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      this.skinMat,
    );
    head.position.y = 1.48;
    head.castShadow = true;
    root.add(head);

    for (const eyeX of [-0.07, 0.07]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 8, 8),
        this.eyeMat,
      );
      eye.position.set(eyeX, 1.5, 0.14);
      root.add(eye);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 6, 6),
        this.pupilMat,
      );
      pupil.position.set(eyeX, 1.5, 0.185);
      root.add(pupil);
    }

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.7,
    });
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 10, 10),
      hairMat,
    );
    hair.position.set(0, 1.54, -0.04);
    root.add(hair);

    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.6,
    });
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.52, 0.24),
      shirtMat,
    );
    torso.position.y = 1.05;
    torso.castShadow = true;
    root.add(torso);

    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.7,
    });

    const legLeftPivot = new THREE.Group();
    legLeftPivot.position.set(-0.11, 0.76, 0);
    const legLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.72, 0.16),
      pantsMat,
    );
    legLeft.position.y = -0.36;
    legLeft.castShadow = true;
    legLeftPivot.add(legLeft);

    const shoeL = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.08, 0.22),
      this.shoeMat,
    );
    shoeL.position.set(0, -0.72, 0.03);
    shoeL.castShadow = true;
    legLeftPivot.add(shoeL);
    root.add(legLeftPivot);

    const legRightPivot = new THREE.Group();
    legRightPivot.position.set(0.11, 0.76, 0);
    const legRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.72, 0.16),
      pantsMat,
    );
    legRight.position.y = -0.36;
    legRight.castShadow = true;
    legRightPivot.add(legRight);

    const shoeR = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.08, 0.22),
      this.shoeMat,
    );
    shoeR.position.set(0, -0.72, 0.03);
    shoeR.castShadow = true;
    legRightPivot.add(shoeR);
    root.add(legRightPivot);

    const armLeftPivot = new THREE.Group();
    armLeftPivot.position.set(-0.24, 1.25, 0);
    const armLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.42, 0.1),
      shirtMat,
    );
    armLeft.position.y = -0.21;
    armLeftPivot.add(armLeft);
    const handLeft = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      this.skinMat,
    );
    handLeft.position.y = -0.44;
    armLeftPivot.add(handLeft);
    root.add(armLeftPivot);

    const armRightPivot = new THREE.Group();
    armRightPivot.position.set(0.24, 1.25, 0);
    const armRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.42, 0.1),
      shirtMat,
    );
    armRight.position.y = -0.21;
    armRightPivot.add(armRight);
    const handRight = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      this.skinMat,
    );
    handRight.position.y = -0.44;
    armRightPivot.add(handRight);
    root.add(armRightPivot);

    return {
      root,
      torso,
      hair,
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

    const scale = 0.88 + Math.random() * 0.22;
    agent.root.scale.set(scale, scale, scale);

    agent.speed = 1.35 + Math.random() * 0.55;
    agent.walkCycle = Math.random() * Math.PI * 2;

    const sidewalkY = 0.22;
    const sidewalkZ = -16.6 + (Math.random() * 1.6 - 0.8);
    const doorZ = -20.2;
    const doorX = Math.random() * 2.2 - 1.1;

    const routeType = Math.floor(Math.random() * 4);
    const waypoints = [];

    if (routeType === 0) {
      waypoints.push(new THREE.Vector3(-38, sidewalkY, sidewalkZ));
      waypoints.push(new THREE.Vector3(38, sidewalkY, sidewalkZ));
    } else if (routeType === 1) {
      waypoints.push(new THREE.Vector3(38, sidewalkY, sidewalkZ));
      waypoints.push(new THREE.Vector3(-38, sidewalkY, sidewalkZ));
    } else if (routeType === 2) {
      const startX = Math.random() > 0.5 ? -38 : 38;
      waypoints.push(new THREE.Vector3(startX, sidewalkY, sidewalkZ));
      waypoints.push(new THREE.Vector3(doorX, sidewalkY, sidewalkZ));
      waypoints.push(new THREE.Vector3(doorX, sidewalkY, doorZ));
    } else {
      const exitX = Math.random() > 0.5 ? 38 : -38;
      waypoints.push(new THREE.Vector3(doorX, sidewalkY, doorZ));
      waypoints.push(new THREE.Vector3(doorX, sidewalkY, sidewalkZ));
      waypoints.push(new THREE.Vector3(exitX, sidewalkY, sidewalkZ));
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
    const sidewalkY = 0.22;
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

      if (dist < 0.2) {
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
        p.root.rotation.y += diff * Math.min(delta * 12.0, 1.0);
      }

      p.walkCycle += delta * p.speed * 8.2;
      const legSwing = Math.sin(p.walkCycle) * 0.52;
      p.legLeftPivot.rotation.x = legSwing;
      p.legRightPivot.rotation.x = -legSwing;
      p.armLeftPivot.rotation.x = -legSwing * 0.8;
      p.armRightPivot.rotation.x = legSwing * 0.8;

      const stepBob = Math.abs(Math.sin(p.walkCycle)) * 0.03;
      p.root.position.y = sidewalkY + stepBob;

      const distToDoor = Math.hypot(p.pos.x, p.pos.z - -19.2);
      if (distToDoor < 3.8) {
        someoneNearDoor = true;
      }
    }

    const targetDoorOpen = someoneNearDoor ? 1.0 : 0.0;
    this.doorCurrentOpen += (targetDoorOpen - this.doorCurrentOpen) * 0.15;

    if (this.doorL && this.doorR) {
      this.doorL.position.x = -1.8 - this.doorCurrentOpen * 2.2;
      this.doorR.position.x = 1.8 + this.doorCurrentOpen * 2.2;
    }
  }

  setBayOccupied(index, occupied) {
    if (index < 0 || index >= this.baySensors.length) return;
    const sensor = this.baySensors[index];
    sensor.occupied = occupied;

    const color = occupied ? 0xdc2626 : 0x16a34a;
    sensor.ledMat.color.setHex(color);
    sensor.pointLight.color.setHex(color);
    sensor.pointLight.intensity = occupied ? 0.9 : 0.7;
  }

  setEntranceBarrier(open) {
    this.entranceGate.targetAngle = open ? -Math.PI / 2.2 : 0;
    this.entranceGate.stripMat.color.setHex(open ? 0x16a34a : 0xdc2626);
  }

  setExitBarrier(open) {
    this.exitGate.targetAngle = open ? Math.PI / 2.2 : 0;
    this.exitGate.stripMat.color.setHex(open ? 0x16a34a : 0xdc2626);
  }

  setAlarmBeacon(active) {
    this.alarmActive = active;
    if (!active) {
      this.alarmLights.forEach((l) => (l.intensity = 0));
    }
  }

  setCameraView(viewName) {
    const positions = {
      isometric: { pos: [0, 30, 42], target: [0, 0, 1] },
      "gate-in": { pos: [-28, 7, 20], target: [-17, 2, 9.5] },
      "gate-out": { pos: [28, 7, 20], target: [17, 2, 9.5] },
      top: { pos: [0, 52, 2], target: [0, 0, 2] },
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

  update(delta) {
    this.controls.update();

    this.updatePedestrians(delta);

    if (this.entranceGate) {
      this.entranceGate.currentAngle +=
        (this.entranceGate.targetAngle - this.entranceGate.currentAngle) * 0.14;
      this.entranceGate.pivot.rotation.z = this.entranceGate.currentAngle;
    }
    if (this.exitGate) {
      this.exitGate.currentAngle +=
        (this.exitGate.targetAngle - this.exitGate.currentAngle) * 0.14;
      this.exitGate.pivot.rotation.z = this.exitGate.currentAngle;
    }

    if (this.alarmActive && this.alarmBeacons.length) {
      this.beaconAngle += delta * 14;
      const flash = (Math.sin(this.beaconAngle * 2) + 1) * 0.5;
      const intensity = flash > 0.4 ? 6.0 : 0.4;

      this.alarmBeacons.forEach((b) => (b.rotation.y = this.beaconAngle));
      this.alarmLights.forEach((l) => (l.intensity = intensity));
    }

    this.renderer.render(this.scene, this.camera);
  }
}
