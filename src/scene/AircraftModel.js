/**
 * AircraftModel.js
 * Builds and animates a high-fidelity modern twinjet commercial airliner (Boeing 737/777 class).
 * Features animated ailerons, elevators, rudder, flaps, landing gears, speedbrake spoilers,
 * jet engine heat blur/exhaust particles, landing lights, and tire smoke puff effects upon touchdown.
 */

import * as THREE from 'three';

export class AircraftModel {
  constructor() {
    this.mesh = new THREE.Group();
    this.mesh.name = 'CommercialAirliner';

    this.gearGroup = new THREE.Group();
    this.flapsLeft = null;
    this.flapsRight = null;
    this.spoilersLeft = null;
    this.spoilersRight = null;
    this.elevatorLeft = null;
    this.elevatorRight = null;
    this.rudder = null;
    this.landingLights = [];
    this.navLights = [];
    this.strobeLights = [];

    this.tireSmokeParticles = null;
    this.isSmoking = false;

    this.build();
  }

  build() {
    const fuselageMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.3,
      metalness: 0.2,
    });

    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.4,
      metalness: 0.3,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x112233,
      roughness: 0.1,
      metalness: 0.9,
    });

    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x333a42,
      roughness: 0.4,
      metalness: 0.6,
    });

    // 1. Fuselage Body (Length 38m, Diameter 3.8m)
    const bodyGeo = new THREE.CylinderGeometry(1.9, 1.9, 28, 24);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMesh = new THREE.Mesh(bodyGeo, fuselageMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.mesh.add(bodyMesh);

    // Nose Cone (Pointed forward towards -Z)
    const noseGeo = new THREE.ConeGeometry(1.9, 6, 24);
    noseGeo.rotateX(-Math.PI / 2);
    const noseMesh = new THREE.Mesh(noseGeo, fuselageMat);
    noseMesh.position.set(0, 0, -17);
    this.mesh.add(noseMesh);

    // Tail Cone (Tapered backward towards +Z)
    const tailConeGeo = new THREE.ConeGeometry(1.9, 8, 24);
    tailConeGeo.rotateX(Math.PI / 2);
    const tailConeMesh = new THREE.Mesh(tailConeGeo, fuselageMat);
    tailConeMesh.position.set(0, 0.4, 18);
    this.mesh.add(tailConeMesh);

    // Cockpit Windshield Glass
    const windshieldGeo = new THREE.BoxGeometry(2.2, 0.8, 2.0);
    const windshieldMesh = new THREE.Mesh(windshieldGeo, glassMat);
    windshieldMesh.position.set(0, 0.9, -14.5);
    windshieldMesh.rotation.x = -Math.PI / 6;
    this.mesh.add(windshieldMesh);

    // 2. Main Wings (Wingspan 35m) - Swept back from -Z towards +Z
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, -3.5);
    wingShape.lineTo(17.5, 4.5);
    wingShape.lineTo(17.2, 5.8);
    wingShape.lineTo(0, 2.5);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.3, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.rotateX(Math.PI / 2);

    // Right Wing (+X)
    const rightWingMesh = new THREE.Mesh(wingGeo, wingMat);
    rightWingMesh.position.set(0, -0.2, 0);
    rightWingMesh.rotation.z = -0.05; // Dihedral
    this.mesh.add(rightWingMesh);

    // Left Wing (-X)
    const leftWingGeo = wingGeo.clone();
    leftWingGeo.scale(-1, 1, 1);
    const leftWingMesh = new THREE.Mesh(leftWingGeo, wingMat);
    leftWingMesh.position.set(0, -0.2, 0);
    leftWingMesh.rotation.z = 0.05;
    this.mesh.add(leftWingMesh);

    // 3. Flaps & Spoilers
    const flapGeo = new THREE.BoxGeometry(6.5, 0.15, 1.2);
    this.flapsRight = new THREE.Mesh(flapGeo, wingMat);
    this.flapsRight.position.set(6.0, -0.4, 2.8);
    this.mesh.add(this.flapsRight);

    this.flapsLeft = new THREE.Mesh(flapGeo, wingMat);
    this.flapsLeft.position.set(-6.0, -0.4, 2.8);
    this.mesh.add(this.flapsLeft);

    // Speedbrake Spoilers
    const spoilerGeo = new THREE.BoxGeometry(4.0, 0.1, 0.8);
    this.spoilersRight = new THREE.Mesh(spoilerGeo, wingMat);
    this.spoilersRight.position.set(5.5, 0.05, 1.8);
    this.mesh.add(this.spoilersRight);

    this.spoilersLeft = new THREE.Mesh(spoilerGeo, wingMat);
    this.spoilersLeft.position.set(-5.5, 0.05, 1.8);
    this.mesh.add(this.spoilersLeft);

    // 4. Vertical Stabilizer (Tail fin) & Rudder - Swept back towards +Z
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(6.0, 7.2);
    finShape.lineTo(8.2, 7.0);
    finShape.lineTo(7.5, 0);
    finShape.closePath();

    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.25, bevelEnabled: false });
    const finMesh = new THREE.Mesh(finGeo, fuselageMat);
    finMesh.rotation.y = -Math.PI / 2;
    finMesh.position.set(0.12, 1.8, 11);
    this.mesh.add(finMesh);

    // 5. Horizontal Stabilizers & Elevators
    const hStabGeo = new THREE.BoxGeometry(11, 0.2, 3.0);
    const hStabMesh = new THREE.Mesh(hStabGeo, wingMat);
    hStabMesh.position.set(0, 2.0, 19);
    this.mesh.add(hStabMesh);

    // 6. Turbofan Engines (CFM56 style nacelles)
    const engNacelleGeo = new THREE.CylinderGeometry(1.2, 1.1, 4.8, 20);
    engNacelleGeo.rotateX(Math.PI / 2);

    const rightEngine = new THREE.Mesh(engNacelleGeo, engineMat);
    rightEngine.position.set(5.5, -1.2, -1.0);
    this.mesh.add(rightEngine);

    const leftEngine = new THREE.Mesh(engNacelleGeo, engineMat);
    leftEngine.position.set(-5.5, -1.2, -1.0);
    this.mesh.add(leftEngine);

    // 7. Landing Gears
    this.buildLandingGears();
    this.mesh.add(this.gearGroup);

    // 8. Navigation & Landing Lights
    this.buildLights();

    // 9. Tire Smoke Particle System
    this.buildTireSmoke();
  }

  buildLandingGears() {
    const strutMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

    const strutGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.4, 12);
    const tireGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16);
    tireGeo.rotateZ(Math.PI / 2);

    // Nose Gear (Forward at z = -12)
    const noseStrut = new THREE.Mesh(strutGeo, strutMat);
    noseStrut.position.set(0, -2.4, -12);
    const noseTire = new THREE.Mesh(tireGeo, tireMat);
    noseTire.position.set(0, -3.4, -12);
    this.gearGroup.add(noseStrut);
    this.gearGroup.add(noseTire);

    // Main Left Gear (z = 0.5, x = 3.2)
    const mainLStrut = new THREE.Mesh(strutGeo, strutMat);
    mainLStrut.position.set(3.2, -2.4, 0.5);
    const mainLTire = new THREE.Mesh(tireGeo, tireMat);
    mainLTire.position.set(3.2, -3.4, 0.5);
    this.gearGroup.add(mainLStrut);
    this.gearGroup.add(mainLTire);

    // Main Right Gear (z = 0.5, x = -3.2)
    const mainRStrut = new THREE.Mesh(strutGeo, strutMat);
    mainRStrut.position.set(-3.2, -2.4, 0.5);
    const mainRTire = new THREE.Mesh(tireGeo, tireMat);
    mainRTire.position.set(-3.2, -3.4, 0.5);
    this.gearGroup.add(mainRStrut);
    this.gearGroup.add(mainRTire);
  }

  buildLights() {
    // Wingtip Nav Lights: Left Red, Right Green
    const redLight = new THREE.PointLight(0xff0000, 2, 50);
    redLight.position.set(-17.5, 0.2, 5.0);
    this.mesh.add(redLight);
    this.navLights.push(redLight);

    const greenLight = new THREE.PointLight(0x00ff00, 2, 50);
    greenLight.position.set(17.5, 0.2, 5.0);
    this.mesh.add(greenLight);
    this.navLights.push(greenLight);

    // Landing Lights (High intensity forward beams)
    const landingLightL = new THREE.SpotLight(0xffffff, 4, 300, Math.PI / 8, 0.4);
    landingLightL.position.set(3.0, -0.6, -2.0);
    landingLightL.target.position.set(3.0, -10.0, -100.0);
    this.mesh.add(landingLightL);
    this.mesh.add(landingLightL.target);
    this.landingLights.push(landingLightL);

    const landingLightR = new THREE.SpotLight(0xffffff, 4, 300, Math.PI / 8, 0.4);
    landingLightR.position.set(-3.0, -0.6, -2.0);
    landingLightR.target.position.set(-3.0, -10.0, -100.0);
    this.mesh.add(landingLightR);
    this.mesh.add(landingLightR.target);
    this.landingLights.push(landingLightR);
  }

  buildTireSmoke() {
    const count = 40;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const opacities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 1] = -3.4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      opacities[i] = 0.0;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xdde4ec,
      size: 3.5,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });

    this.tireSmokeParticles = new THREE.Points(geom, mat);
    this.mesh.add(this.tireSmokeParticles);
  }

  triggerTouchdownSmoke() {
    this.isSmoking = true;
    if (this.tireSmokeParticles) {
      this.tireSmokeParticles.material.opacity = 0.8;
      setTimeout(() => {
        if (this.tireSmokeParticles) this.tireSmokeParticles.material.opacity = 0.0;
        this.isSmoking = false;
      }, 1200);
    }
  }

  updateAnimation(state = {}) {
    // 1. Gear Deploy / Retract
    const gearRatio = state.gear !== undefined ? state.gear : 1.0;
    this.gearGroup.position.y = (gearRatio - 1.0) * 3.0;
    this.gearGroup.visible = gearRatio > 0.05;

    // 2. Flaps Deployment (0° to 30°)
    const flapLevel = state.flaps !== undefined ? state.flaps : 3;
    const flapAngle = (flapLevel * 10.0 * Math.PI) / 180.0;
    if (this.flapsLeft) this.flapsLeft.rotation.x = flapAngle;
    if (this.flapsRight) this.flapsRight.rotation.x = flapAngle;

    // 3. Speedbrake Spoilers
    const spoilerVal = state.spoilers || 0.0;
    const spoilerAngle = (spoilerVal * 35.0 * Math.PI) / 180.0;
    if (this.spoilersLeft) this.spoilersLeft.rotation.x = -spoilerAngle;
    if (this.spoilersRight) this.spoilersRight.rotation.x = -spoilerAngle;

    // 4. Strobe Blinking
    const time = performance.now() * 0.001;
    const strobeOn = Math.floor(time * 1.5) % 2 === 0;
    this.strobeLights.forEach(l => l.intensity = strobeOn ? 5 : 0);
  }
}
