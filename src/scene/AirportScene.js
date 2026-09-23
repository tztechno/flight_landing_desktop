/**
 * AirportScene.js
 * Master 3D scene builder and renderer for Haneda Airport (RJTT).
 * Manages Three.js WebGLRenderer, dynamic daylight / sunset / night sky lighting,
 * atmospheric fog, cloud layers, 3D trajectory ribbons, terrain, and aircraft.
 */

import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator.js';
import { AircraftModel } from './AircraftModel.js';

export class AirportScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.environmentMode = 'sunset'; // 'sunset', 'day', 'night'

    this.initRenderer();
    this.initLighting();
    this.initEnvironment();

    // 1. Terrain & Airport
    this.terrain = new TerrainGenerator(this.scene);
    this.terrain.build();

    // 2. Commercial Airliner Model
    this.aircraft = new AircraftModel();
    this.scene.add(this.aircraft.mesh);

    // 3. 3D Trajectory Ribbon Line
    this.trajectoryRibbon = null;

    // 4. 3D Landing Guidance Highway (Highway in the Sky)
    this.highwayGroup = new THREE.Group();
    this.highwayGroup.name = 'GuidanceHighway';
    this.scene.add(this.highwayGroup);
    this.highwayGates = [];
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);
  }

  initLighting() {
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    this.sunLight.position.set(-15000, 8000, -12000);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 500;
    this.sunLight.shadow.camera.far = 50000;
    const d = 8000;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0x223344, 0.4);
    this.scene.add(this.ambientLight);
  }

  initEnvironment() {
    this.setEnvironmentMode('sunset');
  }

  setEnvironmentMode(mode) {
    this.environmentMode = mode;
    if (mode === 'sunset') {
      // Golden Hour over Tokyo Bay & Mt. Fuji
      this.scene.background = new THREE.Color(0xf68954);
      this.scene.fog = new THREE.FogExp2(0xf08050, 0.000015);

      this.hemiLight.color.setHex(0xffaa77);
      this.hemiLight.groundColor.setHex(0x332211);
      this.hemiLight.intensity = 1.2;

      this.sunLight.color.setHex(0xff7733);
      this.sunLight.position.set(-20000, 3000, -15000);
      this.sunLight.intensity = 2.4;

      this.renderer.toneMappingExposure = 1.15;

    } else if (mode === 'day') {
      // Clear Blue Daylight
      this.scene.background = new THREE.Color(0x7ec0ee);
      this.scene.fog = new THREE.FogExp2(0x9bc8ee, 0.000012);

      this.hemiLight.color.setHex(0xffffff);
      this.hemiLight.groundColor.setHex(0x556677);
      this.hemiLight.intensity = 1.0;

      this.sunLight.color.setHex(0xffffff);
      this.sunLight.position.set(-10000, 15000, -8000);
      this.sunLight.intensity = 2.0;

      this.renderer.toneMappingExposure = 1.0;

    } else if (mode === 'night') {
      // Tokyo Night Runway Lights & City Glow
      this.scene.background = new THREE.Color(0x050914);
      this.scene.fog = new THREE.FogExp2(0x081020, 0.00002);

      this.hemiLight.color.setHex(0x112233);
      this.hemiLight.groundColor.setHex(0x050810);
      this.hemiLight.intensity = 0.3;

      this.sunLight.color.setHex(0x223355);
      this.sunLight.position.set(5000, 10000, 5000);
      this.sunLight.intensity = 0.2;

      this.renderer.toneMappingExposure = 1.4;
    }
  }

  buildGuidanceHighway(highwayData) {
    // Clear previous highway
    while (this.highwayGroup.children.length > 0) {
      const child = this.highwayGroup.children[0];
      this.highwayGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    this.highwayGates = [];

    if (!highwayData || !highwayData.gates || highwayData.gates.length === 0) {
      return;
    }

    const { gates, touchdownPos, headingDeg } = highwayData;
    const rwyRad = (headingDeg * Math.PI) / 180.0;

    // 1. Build Landing Highway Gates (Rectangle neon rings in the sky)
    gates.forEach((gate, idx) => {
      const gateGroup = new THREE.Group();
      gateGroup.position.copy(gate.position);
      gateGroup.rotation.y = -rwyRad + Math.PI;

      const w = gate.width;
      const h = gate.height;

      // Outer glowing rectangular frame
      const framePts = [
        new THREE.Vector3(-w * 0.5, -h * 0.5, 0),
        new THREE.Vector3(w * 0.5, -h * 0.5, 0),
        new THREE.Vector3(w * 0.5, h * 0.5, 0),
        new THREE.Vector3(-w * 0.5, h * 0.5, 0),
        new THREE.Vector3(-w * 0.5, -h * 0.5, 0),
      ];
      const frameGeo = new THREE.BufferGeometry().setFromPoints(framePts);
      const frameMat = new THREE.LineBasicMaterial({
        color: idx < 3 ? 0x00ffaa : 0x00f0ff,
        linewidth: 2.5,
        transparent: true,
        opacity: 0.85,
      });
      const frameLine = new THREE.Line(frameGeo, frameMat);
      gateGroup.add(frameLine);

      // Corner tick marks
      const tickGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, h * 0.5, 0),
        new THREE.Vector3(0, h * 0.5 + 4, 0),
        new THREE.Vector3(0, -h * 0.5, 0),
        new THREE.Vector3(0, -h * 0.5 - 4, 0),
      ]);
      const tickMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.6,
      });
      const tickLine = new THREE.LineSegments(tickGeo, tickMat);
      gateGroup.add(tickLine);

      this.highwayGroup.add(gateGroup);
      this.highwayGates.push({
        id: gate.id,
        group: gateGroup,
        frameMat: frameMat,
        distToRwy: gate.distToRwy,
        position: gate.position.clone(),
        passed: false,
      });
    });

    // 2. Touchdown Target Zone Box on runway
    if (touchdownPos) {
      const tdGroup = new THREE.Group();
      tdGroup.position.copy(touchdownPos);
      tdGroup.rotation.y = -rwyRad + Math.PI;

      const tdBoxGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-22, 0.4, -60),
        new THREE.Vector3(22, 0.4, -60),
        new THREE.Vector3(22, 0.4, 60),
        new THREE.Vector3(-22, 0.4, 60),
        new THREE.Vector3(-22, 0.4, -60),
      ]);
      const tdBoxMat = new THREE.LineBasicMaterial({
        color: 0x00ff88,
        linewidth: 3,
        transparent: true,
        opacity: 0.9,
      });
      const tdBox = new THREE.Line(tdBoxGeo, tdBoxMat);
      tdGroup.add(tdBox);

      // Centerline touch indicator
      const centerPipGeo = new THREE.RingGeometry(2.5, 4.0, 16);
      centerPipGeo.rotateX(-Math.PI / 2);
      const centerPipMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide });
      const centerPip = new THREE.Mesh(centerPipGeo, centerPipMat);
      centerPip.position.set(0, 0.5, 0);
      tdGroup.add(centerPip);

      this.highwayGroup.add(tdGroup);
    }
  }

  updateGuidanceHighway(aircraftPos, fwdVec) {
    if (!this.highwayGates || this.highwayGates.length === 0 || !aircraftPos) return false;

    let justPassedGate = false;

    this.highwayGates.forEach((gate) => {
      if (gate.passed) return;

      const dVec = new THREE.Vector3().subVectors(gate.position, aircraftPos);
      const dist = dVec.length();

      // Check if aircraft has passed this gate (dot product with forward vector)
      if ((fwdVec && dVec.dot(fwdVec) < -5.0) || dist < 25.0) {
        gate.passed = true;
        justPassedGate = true;
        gate.frameMat.color.setHex(0x00ff44); // Glow bright green
        gate.frameMat.opacity = 0.25;
      } else if (dist < 400.0) {
        gate.frameMat.opacity = 0.95;
      }
    });

    return justPassedGate;
  }

  updateTrajectoryVisuals(trajectory) {
    if (this.trajectoryRibbon) {
      this.scene.remove(this.trajectoryRibbon);
      this.trajectoryRibbon.geometry.dispose();
      this.trajectoryRibbon.material.dispose();
      this.trajectoryRibbon = null;
    }

    if (!trajectory || !trajectory.positions || trajectory.positions.length < 2) return;

    const points = [];
    const colors = [];

    const n = trajectory.positions.length;
    for (let i = 0; i < n; i++) {
      const p = trajectory.positions[i];
      points.push(new THREE.Vector3(p[0], p[1], p[2]));

      // Color code by flight phase:
      // Phase 1 (Initial Bay descent): Cyan (0x00f0ff)
      // Phase 2 (90° Right Turn): Orange (0xff9900)
      // Phase 3 (Final Glide Path): Magenta (0xff00ff)
      // Phase 4 (Rollout): Green (0x00ff66)
      // Phase 5 (TOGA Go-Around): Yellow (0xffff00)
      // Phase 6/7 (Bounce/Excursion): Red (0xff2244)
      const phase = trajectory.phases[i];
      const c = new THREE.Color();
      if (phase === 1) c.setHex(0x00f0ff);
      else if (phase === 2) c.setHex(0xff9900);
      else if (phase === 3) c.setHex(0xff00ff);
      else if (phase === 4) c.setHex(0x00ff66);
      else if (phase === 5) c.setHex(0xffff00);
      else c.setHex(0xff2244);

      colors.push(c.r, c.g, c.b);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 3,
      transparent: true,
      opacity: 0.85,
    });

    this.trajectoryRibbon = new THREE.Line(geometry, material);
    this.scene.add(this.trajectoryRibbon);
  }

  render(camera) {
    this.renderer.render(this.scene, camera);
  }

  resize(width, height) {
    this.renderer.setSize(width, height);
  }
}
