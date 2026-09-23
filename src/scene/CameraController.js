/**
 * CameraController.js
 * Multi-camera management supporting 6 cinematic viewing perspectives:
 * 1. Chase: Third-person behind airliner
 * 2. Cockpit: Pilot's first-person HUD cockpit view
 * 3. Wing: Passenger over-wing camera looking at engines & flaps
 * 4. Tower: Haneda Airport control tower (115m) tracking camera
 * 5. PAPI / Runway: Spotter camera at RWY 34L threshold
 * 6. Free Orbit: Full 360° mouse drag orbital inspection
 */

import * as THREE from 'three';

export class CameraController {
  constructor(domElement) {
    this.domElement = domElement;
    this.mode = 'chase'; // 'chase', 'cockpit', 'wing', 'tower', 'papi', 'orbit'

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1.0, 200000);
    this.currentPos = new THREE.Vector3(0, 50, 150);
    this.currentTarget = new THREE.Vector3(0, 10, 0);

    // Orbit controls state
    this.isDragging = false;
    this.prevMouse = { x: 0, y: 0 };
    this.orbitTheta = 0.0;
    this.orbitPhi = Math.PI / 4.0;
    this.orbitRadius = 80.0;

    this.initMouseListeners();
  }

  setMode(mode) {
    this.mode = mode;
  }

  initMouseListeners() {
    if (!this.domElement) return;

    this.domElement.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouse.x;
      const dy = e.clientY - this.prevMouse.y;
      this.prevMouse = { x: e.clientX, y: e.clientY };

      this.orbitTheta -= dx * 0.005;
      this.orbitPhi = Math.max(0.05, Math.min(Math.PI / 2 - 0.05, this.orbitPhi + dy * 0.005));
    });

    this.domElement.addEventListener('wheel', (e) => {
      this.orbitRadius = Math.max(15.0, Math.min(500.0, this.orbitRadius + e.deltaY * 0.1));
    });
  }

  update(aircraftPosition, aircraftQuaternion, forwardVec) {
    if (!aircraftPosition) return;

    const pos = aircraftPosition;
    const quat = aircraftQuaternion || new THREE.Quaternion();
    const fwd = forwardVec ? forwardVec.clone().normalize() : new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
    const right = new THREE.Vector3().crossVectors(fwd, up).normalize();

    let targetCamPos = new THREE.Vector3();
    let targetLookAt = new THREE.Vector3();

    if (this.mode === 'chase') {
      // Behind and slightly above aircraft
      targetCamPos.copy(pos).addScaledVector(fwd, -85.0).addScaledVector(up, 22.0);
      targetLookAt.copy(pos).addScaledVector(fwd, 40.0);
      this.camera.fov = 55;

    } else if (this.mode === 'cockpit') {
      // Cockpit nose position (x=0, y=1.2, z=-15.0 inside aircraft local frame)
      const cockpitOffset = new THREE.Vector3(0, 1.3, -14.5).applyQuaternion(quat);
      targetCamPos.copy(pos).add(cockpitOffset);
      targetLookAt.copy(targetCamPos).addScaledVector(fwd, 200.0).addScaledVector(up, -3.0);
      this.camera.fov = 60;

    } else if (this.mode === 'wing') {
      // Passenger wing view (x=10.0, y=0.5, z=2.0)
      const wingOffset = new THREE.Vector3(9.5, 0.8, 1.5).applyQuaternion(quat);
      targetCamPos.copy(pos).add(wingOffset);
      targetLookAt.copy(pos).addScaledVector(fwd, 80.0).addScaledVector(right, -10.0);
      this.camera.fov = 50;

    } else if (this.mode === 'tower') {
      // Haneda Control Tower position (x=850, y=125, z=1200)
      targetCamPos.set(850, 125, 1200);
      targetLookAt.copy(pos);
      // Dynamic zoom based on distance
      const dist = targetCamPos.distanceTo(pos);
      this.camera.fov = Math.max(15, Math.min(50, dist / 80.0));

    } else if (this.mode === 'papi') {
      // Spotter camera next to RWY 34L threshold
      targetCamPos.set(-70, 8.5, -120);
      targetLookAt.copy(pos);
      const dist = targetCamPos.distanceTo(pos);
      this.camera.fov = Math.max(20, Math.min(55, dist / 60.0));

    } else if (this.mode === 'orbit') {
      // Spherical orbital camera centered on aircraft
      const ox = this.orbitRadius * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta);
      const oy = this.orbitRadius * Math.cos(this.orbitPhi);
      const oz = this.orbitRadius * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta);

      targetCamPos.copy(pos).add(new THREE.Vector3(ox, oy, oz));
      targetLookAt.copy(pos);
      this.camera.fov = 55;
    }

    // Smooth camera damping
    const lerpFactor = this.mode === 'cockpit' ? 0.9 : 0.15;
    this.currentPos.lerp(targetCamPos, lerpFactor);
    this.currentTarget.lerp(targetLookAt, lerpFactor);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentTarget);
    this.camera.updateProjectionMatrix();
  }

  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
