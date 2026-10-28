import * as THREE from "three";

export class VehicleManager {
  constructor(scene, parkingScene) {
    this.scene = scene;
    this.parkingScene = parkingScene;

    this.parkedVehicles = new Array(7).fill(null);
    this.activeTransitions = [];

    this.paintColors = [
      0x2563eb, // Azul Cobalto
      0xdc2626, // Rojo Carmesí
      0xf8fafc, // Blanco Perla
      0xd97706, // Ámbar Deportivo
      0x0284c7, // Azul Glaciar
      0x64748b, // Gris Titanio
      0x16a34a, // Verde Esmeralda
    ];
  }

  createCarMesh(colorHex) {
    const carGroup = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.82,
      roughness: 0.18,
    });

    const lowerBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.65, 4.4),
      bodyMat,
    );
    lowerBody.position.y = 0.52;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    carGroup.add(lowerBody);

    const cabinMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      roughness: 0.08,
      metalness: 0.2,
      transmission: 0.55,
      transparent: true,
      opacity: 0.92,
    });
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.6, 2.3),
      cabinMat,
    );
    cabin.position.set(0, 1.05, -0.2);
    cabin.castShadow = true;
    carGroup.add(cabin);

    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.15,
    });

    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.26, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const wheelPositions = [
      [-0.98, 0.35, 1.3],
      [0.98, 0.35, 1.3],
      [-0.98, 0.35, -1.3],
      [0.98, 0.35, -1.3],
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.position.set(x, y, z);
      tire.castShadow = true;

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.28, 12),
        rimMat,
      );
      rim.rotateZ(Math.PI / 2);
      rim.position.set(x, y, z);

      carGroup.add(tire);
      carGroup.add(rim);
    });

    const headLightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
    });
    const hlL = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.12, 0.05),
      headLightMat,
    );
    hlL.position.set(-0.65, 0.6, 2.2);
    const hlR = hlL.clone();
    hlR.position.set(0.65, 0.6, 2.2);
    carGroup.add(hlL);
    carGroup.add(hlR);

    const tailLightMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.2,
    });
    const tlL = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.1, 0.05),
      tailLightMat,
    );
    tlL.position.set(-0.65, 0.65, -2.2);
    const tlR = tlL.clone();
    tlR.position.set(0.65, 0.65, -2.2);
    carGroup.add(tlL);
    carGroup.add(tlR);

    return carGroup;
  }

  /**
   * Entrada fluida por la garita izquierda (x = -18.5) hacia el puesto
   */
  parkCarInBay(bayIndex, hooks = {}) {
    if (bayIndex < 0 || bayIndex >= 7 || this.parkedVehicles[bayIndex]) return;

    const color = this.paintColors[bayIndex % this.paintColors.length];
    const car = this.createCarMesh(color);

    const targetX =
      this.parkingScene.bayStartX + bayIndex * this.parkingScene.baySpacing;
    const targetZ = this.parkingScene.bayZ;
    const laneInX = this.parkingScene.laneInX;
    const drivewayZ = this.parkingScene.drivewayZ;
    const avenueZ = this.parkingScene.avenueZ;
    const tollZ = this.parkingScene.tollZ;

    const waypoints = [
      new THREE.Vector3(-42, 0, avenueZ), // 0: Viene por la avenida
      new THREE.Vector3(laneInX - 3.0, 0, avenueZ), // 1: Frena y se alinea
      new THREE.Vector3(laneInX, 0, avenueZ - 3.5), // 2: Enfila al carril de entrada -> Abre barrera
      new THREE.Vector3(laneInX, 0, tollZ), // 3: Pasa por la garita izquierda
      new THREE.Vector3(laneInX, 0, tollZ - 3.8), // 4: Pasó la barrera -> Cierra barrera
      new THREE.Vector3(laneInX, 0, drivewayZ + 2.0), // 5: Entra al pasillo amplio
      new THREE.Vector3(laneInX + 3.2, 0, drivewayZ), // 6: Gira hacia el este
      new THREE.Vector3(targetX, 0, drivewayZ), // 7: Se alinea frente a la bahía
      new THREE.Vector3(targetX, 0, targetZ), // 8: Entra y se estaciona
    ];

    car.position.copy(waypoints[0]);
    car.rotation.y = Math.PI / 2;
    this.scene.add(car);

    this.parkedVehicles[bayIndex] = car;

    const waypointEvents = {
      2: () => hooks.onApproachGate?.(),
      4: () => hooks.onPassedGate?.(),
    };

    this.activeTransitions.push({
      car,
      waypoints,
      waypointEvents,
      currentLeg: 0,
      t: 0,
      speed: 1.45,
      isParking: true,
      bayIndex,
      onComplete: () => {
        this.parkingScene.setBayOccupied(bayIndex, true);
        hooks.onComplete?.();
      },
    });
  }

  /**
   * Salida fluida: reversa recta -> giro hacia la DERECHA -> salida por la garita derecha
   */
  removeCarFromBay(bayIndex, hooks = {}) {
    if (bayIndex < 0 || bayIndex >= 7 || !this.parkedVehicles[bayIndex]) return;

    const car = this.parkedVehicles[bayIndex];
    this.parkedVehicles[bayIndex] = null;
    this.parkingScene.setBayOccupied(bayIndex, false);

    const startX =
      this.parkingScene.bayStartX + bayIndex * this.parkingScene.baySpacing;
    const laneOutX = this.parkingScene.laneOutX;
    const drivewayZ = this.parkingScene.drivewayZ;
    const avenueZ = this.parkingScene.avenueZ;
    const tollZ = this.parkingScene.tollZ;

    // Trayectoria unidireccional: sale hacia el ESTE sin curvas forzadas
    const waypoints = [
      car.position.clone(), // 0: En la bahía (Z = -11.0)
      new THREE.Vector3(startX, 0, drivewayZ - 1.0), // 1: Retrocede derecho hacia el pasillo
      new THREE.Vector3(startX + 3.0, 0, drivewayZ), // 2: Gira con calma hacia la derecha (Este)
      new THREE.Vector3(laneOutX - 3.2, 0, drivewayZ), // 3: Avanza en línea recta hacia la garita derecha
      new THREE.Vector3(laneOutX, 0, drivewayZ + 2.8), // 4: Enfila a la salida sur -> Abre barrera derecha
      new THREE.Vector3(laneOutX, 0, tollZ), // 5: Pasa por la garita de salida
      new THREE.Vector3(laneOutX, 0, tollZ + 3.8), // 6: Pasó la barrera -> Cierra barrera derecha
      new THREE.Vector3(laneOutX, 0, avenueZ - 2.5), // 7: Llega al cruce con la avenida
      new THREE.Vector3(laneOutX + 3.5, 0, avenueZ), // 8: Gira al este hacia la avenida
      new THREE.Vector3(48, 0, avenueZ), // 9: Desaparece en el horizonte
    ];

    const waypointEvents = {
      4: () => hooks.onApproachGate?.(),
      6: () => hooks.onPassedGate?.(),
    };

    this.activeTransitions.push({
      car,
      waypoints,
      waypointEvents,
      currentLeg: 0,
      t: 0,
      speed: 1.55,
      isParking: false,
      bayIndex,
      onComplete: () => {
        this.scene.remove(car);
        hooks.onComplete?.();
      },
    });
  }

  update(delta) {
    for (let i = this.activeTransitions.length - 1; i >= 0; i--) {
      const trans = this.activeTransitions[i];
      const pA = trans.waypoints[trans.currentLeg];
      const pB = trans.waypoints[trans.currentLeg + 1];

      const legDist = pA.distanceTo(pB);
      trans.t += (delta * trans.speed * 8.5) / Math.max(legDist, 0.1);

      if (trans.t >= 1) {
        trans.t = 0;
        trans.currentLeg++;

        if (trans.waypointEvents && trans.waypointEvents[trans.currentLeg]) {
          trans.waypointEvents[trans.currentLeg]();
        }

        if (trans.currentLeg >= trans.waypoints.length - 1) {
          trans.car.position.copy(trans.waypoints[trans.waypoints.length - 1]);
          if (trans.onComplete) trans.onComplete();
          this.activeTransitions.splice(i, 1);
          continue;
        }
      } else {
        const smoothT = THREE.MathUtils.smoothstep(trans.t, 0, 1);
        trans.car.position.lerpVectors(pA, pB, smoothT);

        const isReversing = !trans.isParking && trans.currentLeg === 0;

        if (isReversing) {
          trans.car.rotation.y = Math.PI;
        } else {
          const dir = new THREE.Vector3().subVectors(pB, pA).normalize();
          if (dir.lengthSq() > 0.001) {
            const targetAngle = Math.atan2(dir.x, dir.z);
            let diff = targetAngle - trans.car.rotation.y;
            diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            trans.car.rotation.y += diff * 0.15;
          }
        }
      }
    }
  }
}
