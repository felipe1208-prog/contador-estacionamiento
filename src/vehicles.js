import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export class VehicleManager {
  constructor(scene, parkingScene) {
    this.scene = scene;
    this.parkingScene = parkingScene;

    // Estados independientes por bahía: 'FREE' | 'ENTERING' | 'PARKED'
    this.bayStates = new Array(7).fill("FREE");
    this.bayCars = new Array(7).fill(null);

    // Cola FIFO de puestos que YA están estacionados
    this.parkedOrder = [];

    this.activeTransitions = [];
    this.ambientTraffic = [];
    this.colorCursor = 0;

    this.paintColors = [
      0x2563eb, // Azul Cobalto Metálico
      0xdc2626, // Rojo Carmesí Deportivo
      0xf8fafc, // Blanco Perla Tricapa
      0xd97706, // Ámbar Dorado
      0x0284c7, // Azul Glaciar
      0x475569, // Gris Titanio
      0x16a34a, // Verde Esmeralda
    ];

    this.streetPalette = [
      0xeab308, // Amarillo Taxi
      0x0f172a, // Negro Obsidiana
      0x94a3b8, // Plata Metalizado
      0x7c3aed, // Violeta Oscuro
      0x0d9488, // Verde Azulado
      0xbe123c, // Vino Tinto
      0xffffff, // Blanco Puro
      0xea580c, // Naranja Cobre
      0x1d4ed8, // Azul Marino
    ];

    this.tempPos = new THREE.Vector3();
    this.tempTangent = new THREE.Vector3();

    this.initSharedAssets();
    this.initAmbientTraffic();
  }

  initSharedAssets() {
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-2.15, 0.28);
    bodyShape.lineTo(2.15, 0.28);
    bodyShape.lineTo(2.22, 0.56);
    bodyShape.quadraticCurveTo(2.15, 0.76, 1.9, 0.8);
    bodyShape.lineTo(1.05, 0.86);
    bodyShape.quadraticCurveTo(0.55, 1.38, 0.25, 1.42);
    bodyShape.lineTo(-0.88, 1.42);
    bodyShape.quadraticCurveTo(-1.25, 1.38, -1.62, 0.88);
    bodyShape.lineTo(-2.12, 0.84);
    bodyShape.quadraticCurveTo(-2.22, 0.74, -2.2, 0.42);
    bodyShape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: 1.72,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.12,
      bevelSegments: 5,
    };

    const rawAeroGeo = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
    rawAeroGeo.center();
    rawAeroGeo.rotateY(Math.PI / 2);
    rawAeroGeo.computeVertexNormals();

    const glassShape = new THREE.Shape();
    glassShape.moveTo(1.02, 0.84);
    glassShape.quadraticCurveTo(0.52, 1.35, 0.22, 1.38);
    glassShape.lineTo(-0.85, 1.38);
    glassShape.quadraticCurveTo(-1.22, 1.34, -1.58, 0.86);
    glassShape.closePath();

    const glassExtrude = {
      steps: 1,
      depth: 1.54,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 4,
    };
    const rawGlassGeo = new THREE.ExtrudeGeometry(glassShape, glassExtrude);
    rawGlassGeo.center();
    rawGlassGeo.rotateY(Math.PI / 2);

    this.sharedGeo = {
      aeroBody: rawAeroGeo,
      cabinGlass: rawGlassGeo,
      lowerSkirt: new RoundedBoxGeometry(2.08, 0.26, 4.46, 4, 0.06),
      bumperF: new RoundedBoxGeometry(2.06, 0.24, 0.36, 4, 0.08),
      bumperR: new RoundedBoxGeometry(2.06, 0.26, 0.38, 4, 0.08),
      grille: new RoundedBoxGeometry(1.18, 0.22, 0.08, 2, 0.02),
      fender: new THREE.CylinderGeometry(
        0.43,
        0.43,
        0.24,
        24,
        1,
        false,
        0,
        Math.PI,
      ),
      spoilerWing: new RoundedBoxGeometry(1.78, 0.06, 0.26, 3, 0.02),
      spoilerStrut: new THREE.BoxGeometry(0.06, 0.14, 0.16),
      mirrorArm: new RoundedBoxGeometry(0.18, 0.05, 0.06, 2, 0.01),
      mirrorCap: new RoundedBoxGeometry(0.18, 0.12, 0.1, 3, 0.03),
      headlight: new RoundedBoxGeometry(0.38, 0.13, 0.1, 3, 0.03),
      taillight: new RoundedBoxGeometry(0.44, 0.13, 0.1, 3, 0.03),
      reverseLight: new THREE.BoxGeometry(0.18, 0.06, 0.11),
      plate: new RoundedBoxGeometry(0.46, 0.12, 0.04, 2, 0.01),
      tire: new THREE.CylinderGeometry(0.35, 0.35, 0.26, 28),
      rim: new THREE.CylinderGeometry(0.22, 0.22, 0.27, 20),
      hub: new THREE.CylinderGeometry(0.07, 0.07, 0.29, 12),
      spoke: new THREE.BoxGeometry(0.29, 0.042, 0.38),
    };

    this.sharedGeo.tire.rotateZ(Math.PI / 2);
    this.sharedGeo.rim.rotateZ(Math.PI / 2);
    this.sharedGeo.hub.rotateZ(Math.PI / 2);
    this.sharedGeo.fender.rotateZ(Math.PI / 2);

    this.sharedMat = {
      darkTrim: new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.4,
        metalness: 0.5,
      }),
      cabinGlass: new THREE.MeshPhysicalMaterial({
        color: 0x0f172a,
        roughness: 0.06,
        metalness: 0.15,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        transmission: 0.45,
        transparent: true,
        opacity: 0.94,
      }),
      tire: new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.85,
        metalness: 0.1,
      }),
      rim: new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.92,
        roughness: 0.15,
      }),
      headlight: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xe0f2fe,
        emissiveIntensity: 0.85,
        roughness: 0.1,
      }),
      plate: new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.3,
      }),
    };
  }

  createCarMesh(colorHex) {
    const carRoot = new THREE.Group();
    const chassis = new THREE.Group();
    carRoot.add(chassis);

    const g = this.sharedGeo;
    const m = this.sharedMat;

    const paintMat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      metalness: 0.72,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    });

    const lowerSkirt = new THREE.Mesh(g.lowerSkirt, m.darkTrim);
    lowerSkirt.position.y = 0.34;
    lowerSkirt.castShadow = true;
    lowerSkirt.receiveShadow = true;
    chassis.add(lowerSkirt);

    const aeroBody = new THREE.Mesh(g.aeroBody, paintMat);
    aeroBody.position.set(0, 0.78, 0);
    aeroBody.castShadow = true;
    aeroBody.receiveShadow = true;
    chassis.add(aeroBody);

    const cabin = new THREE.Mesh(g.cabinGlass, m.cabinGlass);
    cabin.position.set(0, 1.06, -0.14);
    cabin.castShadow = true;
    chassis.add(cabin);

    const bumperF = new THREE.Mesh(g.bumperF, paintMat);
    bumperF.position.set(0, 0.38, 2.15);
    chassis.add(bumperF);

    const bumperR = new THREE.Mesh(g.bumperR, m.darkTrim);
    bumperR.position.set(0, 0.39, -2.15);
    chassis.add(bumperR);

    const grille = new THREE.Mesh(g.grille, m.darkTrim);
    grille.position.set(0, 0.54, 2.26);
    chassis.add(grille);

    const fenderCoords = [
      [-0.96, 0.38, 1.32],
      [0.96, 0.38, 1.32],
      [-0.96, 0.38, -1.32],
      [0.96, 0.38, -1.32],
    ];
    for (const [fx, fy, fz] of fenderCoords) {
      const fender = new THREE.Mesh(g.fender, m.darkTrim);
      fender.position.set(fx, fy, fz);
      chassis.add(fender);
    }

    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(g.mirrorArm, m.darkTrim);
      arm.position.set(side * 1.02, 0.92, 0.58);
      chassis.add(arm);

      const cap = new THREE.Mesh(g.mirrorCap, paintMat);
      cap.position.set(side * 1.12, 0.95, 0.56);
      chassis.add(cap);
    }

    const spoilerWing = new THREE.Mesh(g.spoilerWing, paintMat);
    spoilerWing.position.set(0, 0.98, -2.08);
    chassis.add(spoilerWing);

    for (const sx of [-0.55, 0.55]) {
      const strut = new THREE.Mesh(g.spoilerStrut, m.darkTrim);
      strut.position.set(sx, 0.89, -2.06);
      chassis.add(strut);
    }

    for (const lx of [-0.68, 0.68]) {
      const hl = new THREE.Mesh(g.headlight, m.headlight);
      hl.position.set(lx, 0.62, 2.22);
      chassis.add(hl);
    }

    const brakeMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xdc2626,
      emissiveIntensity: 0.35,
      roughness: 0.15,
    });
    const revMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.0,
      roughness: 0.2,
    });

    for (const lx of [-0.68, 0.68]) {
      const tl = new THREE.Mesh(g.taillight, brakeMat);
      tl.position.set(lx, 0.68, -2.22);
      chassis.add(tl);

      const rl = new THREE.Mesh(g.reverseLight, revMat);
      rl.position.set(lx * 0.82, 0.68, -2.23);
      chassis.add(rl);
    }

    const plateF = new THREE.Mesh(g.plate, m.plate);
    plateF.position.set(0, 0.38, 2.34);
    chassis.add(plateF);

    const plateR = new THREE.Mesh(g.plate, m.plate);
    plateR.position.set(0, 0.45, -2.35);
    chassis.add(plateR);

    const frontWheelSteerPivots = [];
    const wheelRollPivots = [];

    const wheelSpecs = [
      { x: -0.98, y: 0.35, z: 1.32, isFront: true },
      { x: 0.98, y: 0.35, z: 1.32, isFront: true },
      { x: -0.98, y: 0.35, z: -1.32, isFront: false },
      { x: 0.98, y: 0.35, z: -1.32, isFront: false },
    ];

    for (const spec of wheelSpecs) {
      const steerPivot = new THREE.Group();
      steerPivot.position.set(spec.x, spec.y, spec.z);

      const rollPivot = new THREE.Group();
      steerPivot.add(rollPivot);

      const tire = new THREE.Mesh(g.tire, m.tire);
      tire.castShadow = true;
      rollPivot.add(tire);

      const rim = new THREE.Mesh(g.rim, m.rim);
      rollPivot.add(rim);

      const hub = new THREE.Mesh(g.hub, m.darkTrim);
      rollPivot.add(hub);

      for (let s = 0; s < 3; s++) {
        const spoke = new THREE.Mesh(g.spoke, m.rim);
        spoke.rotation.x = (s * Math.PI) / 3;
        rollPivot.add(spoke);
      }

      carRoot.add(steerPivot);
      wheelRollPivots.push(rollPivot);
      if (spec.isFront) {
        frontWheelSteerPivots.push(steerPivot);
      }
    }

    carRoot.userData = {
      chassis,
      paintMat,
      frontWheelSteerPivots,
      wheelRollPivots,
      brakeMat,
      revMat,
    };

    return carRoot;
  }

  initAmbientTraffic() {
    const innerZ = this.parkingScene.avenueZ;
    const outerZ = this.parkingScene.avenueOuterZ;

    const initialSlots = [
      { dir: 1, z: innerZ, x: -38 },
      { dir: 1, z: innerZ, x: 4 },
      { dir: 1, z: innerZ, x: 36 },
      { dir: -1, z: outerZ, x: 40 },
      { dir: -1, z: outerZ, x: 2 },
      { dir: -1, z: outerZ, x: -34 },
    ];

    for (let i = 0; i < initialSlots.length; i++) {
      const slot = initialSlots[i];
      const color =
        this.streetPalette[
          Math.floor(Math.random() * this.streetPalette.length)
        ];
      const car = this.createCarMesh(color);

      car.position.set(slot.x, 0, slot.z);
      car.rotation.y = slot.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      this.scene.add(car);

      const baseSpeed = 11.5 + Math.random() * 4.5;

      this.ambientTraffic.push({
        car,
        dir: slot.dir,
        laneZ: slot.z,
        baseSpeed,
        currentSpeed: baseSpeed,
      });
    }
  }

  updateAmbientTraffic(delta) {
    const boundX = 56;

    for (let i = 0; i < this.ambientTraffic.length; i++) {
      const amb = this.ambientTraffic[i];
      const car = amb.car;
      const ud = car.userData;

      let blockedAhead = false;

      for (let j = 0; j < this.ambientTraffic.length; j++) {
        if (i === j) continue;
        const other = this.ambientTraffic[j];
        if (other.dir !== amb.dir) continue;

        const distAhead = (other.car.position.x - car.position.x) * amb.dir;
        if (distAhead > 0 && distAhead < 9.5) {
          blockedAhead = true;
          break;
        }
      }

      if (!blockedAhead && amb.dir === 1) {
        for (const trans of this.activeTransitions) {
          const tPos = trans.car.position;
          if (tPos.z > 13.0) {
            const dx = tPos.x - car.position.x;
            if (dx > -1.5 && dx < 10.5) {
              blockedAhead = true;
              break;
            }
          }
        }
      }

      const targetSpeed = blockedAhead ? 0 : amb.baseSpeed;
      amb.currentSpeed = THREE.MathUtils.lerp(
        amb.currentSpeed,
        targetSpeed,
        Math.min(delta * 6.5, 1.0),
      );

      const stepX = amb.currentSpeed * amb.dir * delta;
      car.position.x += stepX;

      const wheelAngle = Math.abs(stepX) / 0.35;
      for (const rollPivot of ud.wheelRollPivots) {
        rollPivot.rotation.x += wheelAngle;
      }

      const isBraking = blockedAhead || amb.currentSpeed < amb.baseSpeed * 0.7;
      ud.brakeMat.emissiveIntensity = isBraking ? 1.5 : 0.3;
      const targetPitch = isBraking ? 0.024 : -0.006;
      ud.chassis.rotation.x = THREE.MathUtils.lerp(
        ud.chassis.rotation.x,
        targetPitch,
        0.18,
      );

      if (amb.dir === 1 && car.position.x > boundX) {
        car.position.x = -boundX - Math.random() * 10;
        this.randomizeStreetCar(amb);
      } else if (amb.dir === -1 && car.position.x < -boundX) {
        car.position.x = boundX + Math.random() * 10;
        this.randomizeStreetCar(amb);
      }
    }
  }

  randomizeStreetCar(amb) {
    const newColor =
      this.streetPalette[Math.floor(Math.random() * this.streetPalette.length)];
    amb.car.userData.paintMat.color.setHex(newColor);
    amb.baseSpeed = 11.5 + Math.random() * 5.0;
  }

  /**
   * Busca automáticamente el primer puesto libre (0..6).
   * Si avoidBayIndex >= 0, prefiere otro puesto libre distinto al que se está desocupando.
   */
  parkNewCar(hooks = {}, avoidBayIndex = -1) {
    let freeBayIndex = this.bayStates.findIndex(
      (st, idx) => st === "FREE" && idx !== avoidBayIndex,
    );
    if (freeBayIndex === -1) {
      freeBayIndex = this.bayStates.findIndex((st) => st === "FREE");
    }
    if (freeBayIndex === -1) return;
    this.parkCarInBay(freeBayIndex, hooks);
  }

  parkCarInBay(bayIndex, hooks = {}) {
    if (bayIndex < 0 || bayIndex >= 7 || this.bayStates[bayIndex] !== "FREE") {
      return;
    }

    const color = this.paintColors[this.colorCursor % this.paintColors.length];
    this.colorCursor++;
    const car = this.createCarMesh(color);

    this.bayStates[bayIndex] = "ENTERING";
    this.bayCars[bayIndex] = car;

    const targetX =
      this.parkingScene.bayStartX + bayIndex * this.parkingScene.baySpacing;
    const targetZ = this.parkingScene.bayZ;
    const laneInX = this.parkingScene.laneInX;
    const drivewayZ = this.parkingScene.drivewayZ;
    const avenueZ = this.parkingScene.avenueZ;
    const tollZ = this.parkingScene.tollZ;

    const entryCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-46, 0, avenueZ),
        new THREE.Vector3(laneInX - 4.2, 0, avenueZ),
        new THREE.Vector3(laneInX - 0.6, 0, avenueZ - 1.4),
        new THREE.Vector3(laneInX, 0, tollZ + 3.5),
        new THREE.Vector3(laneInX, 0, tollZ - 3.5),
        new THREE.Vector3(laneInX + 0.5, 0, drivewayZ + 2.2),
        new THREE.Vector3(laneInX + 4.2, 0, drivewayZ),
        new THREE.Vector3(targetX - 2.6, 0, drivewayZ),
        new THREE.Vector3(targetX, 0, drivewayZ - 2.2),
        new THREE.Vector3(targetX, 0, targetZ),
      ],
      false,
      "catmullrom",
      0.35,
    );

    car.position.set(-46, 0, avenueZ);
    car.rotation.y = Math.PI / 2;
    this.scene.add(car);

    this.activeTransitions.push({
      car,
      bayIndex,
      type: "ENTRY",
      phases: [
        {
          curve: entryCurve,
          length: entryCurve.getLength(),
          reverse: false,
          speed: 13.0,
          events: [
            { u: 0.16, fired: false, cb: () => hooks.onApproachGate?.() },
            { u: 0.44, fired: false, cb: () => hooks.onPassedGate?.() },
          ],
        },
      ],
      phaseIdx: 0,
      u: 0,
      prevPos: new THREE.Vector3(-46, 0, avenueZ),
      prevYaw: Math.PI / 2,
      onComplete: () => {
        car.rotation.set(0, Math.PI, 0);
        car.userData.chassis.rotation.set(0, 0, 0);
        car.userData.brakeMat.emissiveIntensity = 0.2;
        car.userData.frontWheelSteerPivots.forEach((p) => (p.rotation.y = 0));

        this.bayStates[bayIndex] = "PARKED";
        if (!this.parkedOrder.includes(bayIndex)) {
          this.parkedOrder.push(bayIndex);
        }
        this.parkingScene.setBayOccupied(bayIndex, true);
        hooks.onComplete?.();
      },
    });
  }

  /**
   * Recorrido continuo de entrada y salida inmediata cuando el estacionamiento está en 0/7
   * y se dispara un pulso con Ein = 1 y Eout = 1.
   */
  passThroughCar(hooks = {}) {
    const color = this.paintColors[this.colorCursor % this.paintColors.length];
    this.colorCursor++;
    const car = this.createCarMesh(color);

    const laneInX = this.parkingScene.laneInX;
    const laneOutX = this.parkingScene.laneOutX;
    const drivewayZ = this.parkingScene.drivewayZ;
    const avenueZ = this.parkingScene.avenueZ;
    const tollZ = this.parkingScene.tollZ;

    const passCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-46, 0, avenueZ),
        new THREE.Vector3(laneInX - 4.2, 0, avenueZ),
        new THREE.Vector3(laneInX - 0.6, 0, avenueZ - 1.4),
        new THREE.Vector3(laneInX, 0, tollZ + 3.5),
        new THREE.Vector3(laneInX, 0, tollZ - 3.5),
        new THREE.Vector3(laneInX + 1.2, 0, drivewayZ + 1.8),
        new THREE.Vector3(0, 0, drivewayZ),
        new THREE.Vector3(laneOutX - 1.2, 0, drivewayZ + 1.8),
        new THREE.Vector3(laneOutX, 0, tollZ - 3.5),
        new THREE.Vector3(laneOutX, 0, tollZ + 3.5),
        new THREE.Vector3(laneOutX + 0.6, 0, avenueZ - 1.4),
        new THREE.Vector3(laneOutX + 4.5, 0, avenueZ),
        new THREE.Vector3(52, 0, avenueZ),
      ],
      false,
      "catmullrom",
      0.35,
    );

    car.position.set(-46, 0, avenueZ);
    car.rotation.y = Math.PI / 2;
    this.scene.add(car);

    this.activeTransitions.push({
      car,
      bayIndex: -1,
      type: "PASSTHROUGH",
      phases: [
        {
          curve: passCurve,
          length: passCurve.getLength(),
          reverse: false,
          speed: 14.0,
          events: [
            { u: 0.14, fired: false, cb: () => hooks.onApproachInGate?.() },
            { u: 0.32, fired: false, cb: () => hooks.onPassedInGate?.() },
            { u: 0.64, fired: false, cb: () => hooks.onApproachOutGate?.() },
            { u: 0.82, fired: false, cb: () => hooks.onPassedOutGate?.() },
          ],
        },
      ],
      phaseIdx: 0,
      u: 0,
      prevPos: new THREE.Vector3(-46, 0, avenueZ),
      prevYaw: Math.PI / 2,
      onComplete: () => {
        this.scene.remove(car);
        hooks.onComplete?.();
      },
    });
  }

  /**
   * Prioriza sacar siempre un vehículo que YA esté estacionado (PARKED).
   * Retorna el índice del puesto liberado.
   */
  removeParkedCar(hooks = {}) {
    if (this.parkedOrder.length > 0) {
      const bayToEmpty = this.parkedOrder.shift();
      this.removeCarFromBay(bayToEmpty, hooks);
      return bayToEmpty;
    }

    const enteringIdx = this.activeTransitions.findIndex(
      (t) => t.type === "ENTRY",
    );
    if (enteringIdx !== -1) {
      const trans = this.activeTransitions[enteringIdx];
      const bayIndex = trans.bayIndex;
      const car = trans.car;

      for (const ev of trans.phases[0].events) {
        if (!ev.fired) ev.cb();
      }

      this.activeTransitions.splice(enteringIdx, 1);
      this.bayStates[bayIndex] = "FREE";
      this.bayCars[bayIndex] = null;
      this.parkingScene.setBayOccupied(bayIndex, false);

      this.redirectEnteringCarToExit(car, hooks);
      return bayIndex;
    }

    return -1;
  }

  redirectEnteringCarToExit(car, hooks = {}) {
    const laneOutX = this.parkingScene.laneOutX;
    const drivewayZ = this.parkingScene.drivewayZ;
    const avenueZ = this.parkingScene.avenueZ;
    const tollZ = this.parkingScene.tollZ;
    const curPos = car.position.clone();

    const redirectCurve = new THREE.CatmullRomCurve3(
      [
        curPos,
        new THREE.Vector3(Math.max(curPos.x + 4.0, -10.0), 0, drivewayZ),
        new THREE.Vector3(laneOutX - 3.6, 0, drivewayZ),
        new THREE.Vector3(laneOutX - 0.5, 0, drivewayZ + 2.2),
        new THREE.Vector3(laneOutX, 0, tollZ - 3.2),
        new THREE.Vector3(laneOutX, 0, tollZ + 3.6),
        new THREE.Vector3(laneOutX + 0.6, 0, avenueZ - 1.4),
        new THREE.Vector3(laneOutX + 4.5, 0, avenueZ),
        new THREE.Vector3(52, 0, avenueZ),
      ],
      false,
      "catmullrom",
      0.35,
    );

    this.activeTransitions.push({
      car,
      bayIndex: -1,
      type: "EXIT",
      phases: [
        {
          curve: redirectCurve,
          length: redirectCurve.getLength(),
          reverse: false,
          speed: 13.8,
          events: [
            { u: 0.34, fired: false, cb: () => hooks.onApproachGate?.() },
            { u: 0.62, fired: false, cb: () => hooks.onPassedGate?.() },
          ],
        },
      ],
      phaseIdx: 0,
      u: 0,
      prevPos: curPos.clone(),
      prevYaw: car.rotation.y,
      onComplete: () => {
        this.scene.remove(car);
        hooks.onComplete?.();
      },
    });
  }

  removeCarFromBay(bayIndex, hooks = {}) {
    if (bayIndex < 0 || bayIndex >= 7 || !this.bayCars[bayIndex]) return;

    const car = this.bayCars[bayIndex];
    this.bayCars[bayIndex] = null;
    this.bayStates[bayIndex] = "FREE";

    const orderPos = this.parkedOrder.indexOf(bayIndex);
    if (orderPos !== -1) {
      this.parkedOrder.splice(orderPos, 1);
    }

    this.parkingScene.setBayOccupied(bayIndex, false);

    const startX =
      this.parkingScene.bayStartX + bayIndex * this.parkingScene.baySpacing;
    const laneOutX = this.parkingScene.laneOutX;
    const drivewayZ = this.parkingScene.drivewayZ;
    const avenueZ = this.parkingScene.avenueZ;
    const tollZ = this.parkingScene.tollZ;

    const reverseCurve = new THREE.CatmullRomCurve3(
      [
        car.position.clone(),
        new THREE.Vector3(startX, 0, this.parkingScene.bayZ + 4.2),
        new THREE.Vector3(startX - 0.6, 0, drivewayZ - 1.5),
        new THREE.Vector3(startX - 2.4, 0, drivewayZ),
      ],
      false,
      "catmullrom",
      0.4,
    );

    const forwardCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(startX - 2.4, 0, drivewayZ),
        new THREE.Vector3(startX + 2.5, 0, drivewayZ),
        new THREE.Vector3(laneOutX - 3.6, 0, drivewayZ),
        new THREE.Vector3(laneOutX - 0.5, 0, drivewayZ + 2.2),
        new THREE.Vector3(laneOutX, 0, tollZ - 3.2),
        new THREE.Vector3(laneOutX, 0, tollZ + 3.6),
        new THREE.Vector3(laneOutX + 0.6, 0, avenueZ - 1.4),
        new THREE.Vector3(laneOutX + 4.5, 0, avenueZ),
        new THREE.Vector3(52, 0, avenueZ),
      ],
      false,
      "catmullrom",
      0.35,
    );

    this.activeTransitions.push({
      car,
      bayIndex,
      type: "EXIT",
      phases: [
        {
          curve: reverseCurve,
          length: reverseCurve.getLength(),
          reverse: true,
          speed: 7.5,
          events: [],
        },
        {
          curve: forwardCurve,
          length: forwardCurve.getLength(),
          reverse: false,
          speed: 13.8,
          events: [
            { u: 0.34, fired: false, cb: () => hooks.onApproachGate?.() },
            { u: 0.62, fired: false, cb: () => hooks.onPassedGate?.() },
          ],
        },
      ],
      phaseIdx: 0,
      u: 0,
      prevPos: car.position.clone(),
      prevYaw: car.rotation.y,
      onComplete: () => {
        this.scene.remove(car);
        hooks.onComplete?.();
      },
    });
  }

  update(delta) {
    // 1. Actualizar el tráfico urbano aleatorio de la avenida
    this.updateAmbientTraffic(delta);

    // 2. Actualizar los vehículos que entran o salen del estacionamiento
    for (let i = this.activeTransitions.length - 1; i >= 0; i--) {
      const trans = this.activeTransitions[i];
      const phase = trans.phases[trans.phaseIdx];
      const car = trans.car;
      const ud = car.userData;

      const edgeFactor = Math.sin(
        Math.min(Math.max(trans.u, 0.04), 0.96) * Math.PI,
      );
      const speedMultiplier = 0.55 + 0.65 * edgeFactor;
      const currentSpeed = phase.speed * speedMultiplier;

      trans.u += (currentSpeed * delta) / Math.max(phase.length, 0.1);

      for (const ev of phase.events) {
        if (!ev.fired && trans.u >= ev.u) {
          ev.fired = true;
          ev.cb();
        }
      }

      if (trans.u >= 1.0) {
        trans.u = 0;
        trans.phaseIdx++;

        if (trans.phaseIdx >= trans.phases.length) {
          const finalPt = phase.curve.getPointAt(1.0);
          car.position.copy(finalPt);
          trans.onComplete?.();
          this.activeTransitions.splice(i, 1);
          continue;
        }
        continue;
      }

      phase.curve.getPointAt(trans.u, this.tempPos);
      phase.curve.getTangentAt(trans.u, this.tempTangent);

      const distStep = this.tempPos.distanceTo(trans.prevPos);
      car.position.copy(this.tempPos);
      trans.prevPos.copy(this.tempPos);

      let targetYaw = Math.atan2(this.tempTangent.x, this.tempTangent.z);
      if (phase.reverse) {
        targetYaw += Math.PI;
      }

      let yawDiff = targetYaw - car.rotation.y;
      yawDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff));
      car.rotation.y += yawDiff * Math.min(delta * 12.0, 1.0);

      let turnRate = (car.rotation.y - trans.prevYaw) / Math.max(delta, 0.001);
      turnRate = THREE.MathUtils.clamp(turnRate, -3.5, 3.5);
      trans.prevYaw = car.rotation.y;

      const steerAngle = THREE.MathUtils.clamp(
        turnRate * (phase.reverse ? -0.22 : 0.22),
        -0.45,
        0.45,
      );
      for (const pivot of ud.frontWheelSteerPivots) {
        pivot.rotation.y = THREE.MathUtils.lerp(
          pivot.rotation.y,
          steerAngle,
          0.25,
        );
      }

      const spinDir = phase.reverse ? -1 : 1;
      const wheelDeltaAngle = (distStep / 0.35) * spinDir;
      for (const rollPivot of ud.wheelRollPivots) {
        rollPivot.rotation.x += wheelDeltaAngle;
      }

      const targetRoll = THREE.MathUtils.clamp(turnRate * 0.028, -0.06, 0.06);
      const isBraking = trans.u > 0.8;
      const targetPitch = isBraking
        ? phase.reverse
          ? -0.022
          : 0.022
        : phase.reverse
          ? 0.012
          : -0.012;

      ud.chassis.rotation.z = THREE.MathUtils.lerp(
        ud.chassis.rotation.z,
        targetRoll,
        0.15,
      );
      ud.chassis.rotation.x = THREE.MathUtils.lerp(
        ud.chassis.rotation.x,
        targetPitch,
        0.15,
      );

      ud.brakeMat.emissiveIntensity = isBraking ? 1.4 : 0.35;
      ud.revMat.emissiveIntensity = phase.reverse ? 1.2 : 0.0;
    }
  }
}
