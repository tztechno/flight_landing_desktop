/**
 * TerrainGenerator.js
 * Builds realistic 3D terrain using real GeoTIFF elevation DEM (/data/elevation.bin)
 * and high-resolution aerial satellite orthoimagery from GSI (/textures/haneda_ortho.jpg).
 * Accurately models Tokyo Haneda Airport (RJTT), Runway 16R/34L, 16L/34R, 04/22, 05/23 (D Runway Pier),
 * PAPI & ALS approach lighting, Terminals 1/2/3, Control Tower (115m), Tokyo Gate Bridge, and Aqua-Line Tower of Wind.
 */

import * as THREE from 'three';

export class TerrainGenerator {
  constructor(scene) {
    this.scene = scene;
    this.elevationData = null;
    this.meta = null;
    this.groundMesh = null;
    this.lights = [];
  }

  async build() {
    const group = new THREE.Group();
    group.name = 'TerrainGroup';

    // 1. Load elevation metadata & binary grid
    await this.loadElevationData();

    // 2. Build Realistic 3D Terrain Mesh with High-Resolution Aerial Orthophoto
    this.buildDemTerrain(group);

    // 3. Water Surface (Tokyo Bay, Tama River, Tokyo Port)
    this.buildTokyoBayWater(group);

    // 4. Haneda Airport Base & Pavement
    this.buildAirportBase(group);

    // 5. Runways (34L/16R, 34R/16L, 04/22, 05/23 D Pier)
    this.buildRunways(group);

    // 6. Airport Terminals, Control Tower & Landmarks
    this.buildAirportStructures(group);

    // 7. Approach Lights (ALS, PAPI, Runway Edge & Centerline Lights)
    this.buildAirportLights(group);

    this.scene.add(group);
    return group;
  }

  async loadElevationData() {
    try {
      const metaRes = await fetch('/data/elevation_meta.json');
      if (metaRes.ok) {
        this.meta = await metaRes.json();
      }

      const binRes = await fetch('/data/elevation.bin');
      if (binRes.ok) {
        const buffer = await binRes.arrayBuffer();
        this.elevationData = new Float32Array(buffer);
        console.log('Loaded GeoTIFF DEM elevation data:', this.meta);
      }
    } catch (e) {
      console.warn('Could not load elevation binary, falling back to procedural terrain:', e);
    }
  }

  getElevationAt(worldX, worldZ) {
    if (!this.elevationData || !this.meta) {
      // Haneda airport base elevation fallback
      if (Math.abs(worldX) < 4000 && Math.abs(worldZ) < 4000) {
        return 6.5;
      }
      return 0.0;
    }

    const { x_min, x_max, z_min, z_max, width, height } = this.meta;
    if (worldX < x_min || worldX > x_max || worldZ < z_min || worldZ > z_max) {
      return 0.0;
    }

    const u = (worldX - x_min) / (x_max - x_min);
    const v = (worldZ - z_min) / (z_max - z_min);

    const px = Math.min(width - 1, Math.max(0, Math.floor(u * (width - 1))));
    const py = Math.min(height - 1, Math.max(0, Math.floor(v * (height - 1))));

    const elev = this.elevationData[py * width + px] || 0.0;
    // In immediate vicinity of Haneda runways, ensure flat runway elevation (6.5m)
    if (Math.abs(worldX) < 2500 && Math.abs(worldZ) < 3500) {
      return Math.max(6.5, elev);
    }
    return elev;
  }

  buildDemTerrain(parent) {
    const texLoader = new THREE.TextureLoader();
    const orthoTex = texLoader.load('/textures/haneda_ortho.jpg');
    orthoTex.wrapS = THREE.ClampToEdgeWrapping;
    orthoTex.wrapT = THREE.ClampToEdgeWrapping;
    orthoTex.generateMipmaps = true;
    orthoTex.minFilter = THREE.LinearMipmapLinearFilter;
    orthoTex.magFilter = THREE.LinearFilter;
    orthoTex.anisotropy = 16;
    orthoTex.colorSpace = THREE.SRGBColorSpace;

    const totalW = this.meta ? this.meta.total_width_m : 155000;
    const totalD = this.meta ? this.meta.total_depth_m : 101000;
    const centerX = this.meta ? this.meta.center_x : 20700;
    const centerZ = this.meta ? this.meta.center_z : 7900;

    // High fidelity terrain geometry (384 x 384)
    const segmentsX = 384;
    const segmentsZ = 384;
    const groundGeo = new THREE.PlaneGeometry(totalW, totalD, segmentsX, segmentsZ);
    groundGeo.rotateX(-Math.PI / 2);

    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const localX = pos.getX(i);
      const localZ = pos.getZ(i);

      const worldX = localX + centerX;
      const worldZ = localZ + centerZ;

      const elev = this.getElevationAt(worldX, worldZ);
      pos.setY(i, elev);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      map: orthoTex,
      roughness: 0.8,
      metalness: 0.05,
    });

    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.position.set(centerX, 0, centerZ);
    this.groundMesh.receiveShadow = true;
    parent.add(this.groundMesh);
  }

  buildTokyoBayWater(parent) {
    // Subtle ocean shimmer
    const waterGeo = new THREE.PlaneGeometry(160000, 110000);
    waterGeo.rotateX(-Math.PI / 2);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0e2638,
      roughness: 0.15,
      metalness: 0.85,
      transparent: true,
      opacity: 0.6,
    });

    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(20700, 0.5, 7900);
    parent.add(waterMesh);
  }

  buildAirportBase(parent) {
    // Haneda Airport Artificial Island Concrete Apron Base
    const apronMat = new THREE.MeshStandardMaterial({
      color: 0x22262a,
      roughness: 0.9,
      metalness: 0.1,
    });

    const airportPolyGeo = new THREE.BoxGeometry(5200, 1.0, 6200);
    const airportMesh = new THREE.Mesh(airportPolyGeo, apronMat);
    airportMesh.position.set(600, 6.2, 1000);
    parent.add(airportMesh);

    // D Runway Offshore Pier (Runway 05/23 Steel Jacket Island)
    const dPierMat = new THREE.MeshStandardMaterial({
      color: 0x2e3338,
      roughness: 0.8,
      metalness: 0.2,
    });
    const dPierGeo = new THREE.BoxGeometry(3200, 4.0, 1000);
    const dPierMesh = new THREE.Mesh(dPierGeo, dPierMat);
    dPierMesh.rotation.y = -Math.PI / 4.0;
    dPierMesh.position.set(1600, 6.2, -1800);
    parent.add(dPierMesh);
  }

  buildRunways(parent) {
    const rwyMat = new THREE.MeshStandardMaterial({
      color: 0x14181c,
      roughness: 0.7,
      metalness: 0.2,
    });

    const markingMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    // 1. Runway 34L / 16R (A Runway: Length 3,000m x Width 60m, Heading 334° / 154°)
    // Touchdown zone at (0, 6.6, 0)
    const rwy34LGeo = new THREE.BoxGeometry(60, 0.4, 3000);
    const rwy34LMesh = new THREE.Mesh(rwy34LGeo, rwyMat);
    const rad34L = 334.0 * Math.PI / 180.0;
    rwy34LMesh.rotation.y = -rad34L;
    // Center of runway is 1500m ahead of threshold along heading 334°
    const fwdX = Math.sin(rad34L); // -0.43837 (West)
    const fwdZ = -Math.cos(rad34L); // -0.89879 (North)
    const perpX = Math.cos(rad34L); // +0.89879 (East)
    const perpZ = Math.sin(rad34L); // -0.43837 (South)

    rwy34LMesh.position.set(fwdX * 1500, 6.6, fwdZ * 1500);
    parent.add(rwy34LMesh);

    // Runway 34L Centerline Stripes
    const stripeGeo = new THREE.PlaneGeometry(2.5, 30);
    stripeGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 40; i++) {
      const stripe = new THREE.Mesh(stripeGeo, markingMat);
      stripe.rotation.y = -rad34L;
      const dist = 100 + i * 70;
      stripe.position.set(fwdX * dist, 6.85, fwdZ * dist);
      parent.add(stripe);
    }

    // Threshold Piano Keys (34L)
    const keyGeo = new THREE.PlaneGeometry(2.0, 30);
    keyGeo.rotateX(-Math.PI / 2);
    for (let k = -6; k <= 6; k++) {
      if (k === 0) continue;
      const key = new THREE.Mesh(keyGeo, markingMat);
      key.rotation.y = -rad34L;
      key.position.set(perpX * (k * 3.5), 6.85, perpZ * (k * 3.5));
      parent.add(key);
    }

    // 2. Runway 34R / 16L (C Runway: Length 3,360m x Width 60m)
    // Offset (1520m, 420m)
    const rwy34RGeo = new THREE.BoxGeometry(60, 0.4, 3360);
    const rwy34RMesh = new THREE.Mesh(rwy34RGeo, rwyMat);
    rwy34RMesh.rotation.y = -rad34L;
    rwy34RMesh.position.set(1520 + fwdX * 1680, 6.6, 420 + fwdZ * 1680);
    parent.add(rwy34RMesh);

    // 3. Runway 04 / 22 (B Runway: Length 2,500m x Width 60m, Heading 044°)
    const rad04 = 44.0 * Math.PI / 180.0;
    const rwy04Geo = new THREE.BoxGeometry(60, 0.4, 2500);
    const rwy04Mesh = new THREE.Mesh(rwy04Geo, rwyMat);
    rwy04Mesh.rotation.y = -rad04;
    rwy04Mesh.position.set(-600, 6.6, 1200);
    parent.add(rwy04Mesh);

    // 4. Runway 05 / 23 (D Runway: Length 2,500m x Width 60m, Heading 050°)
    const rad05 = 50.0 * Math.PI / 180.0;
    const rwy05Geo = new THREE.BoxGeometry(60, 0.4, 2500);
    const rwy05Mesh = new THREE.Mesh(rwy05Geo, rwyMat);
    rwy05Mesh.rotation.y = -rad05;
    rwy05Mesh.position.set(1600, 6.6, -1800);
    parent.add(rwy05Mesh);
  }

  buildAirportStructures(parent) {
    const bldgMat = new THREE.MeshStandardMaterial({
      color: 0x6a7582,
      roughness: 0.5,
      metalness: 0.3,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1b405e,
      roughness: 0.2,
      metalness: 0.8,
    });

    // Terminal 1 (JAL Domestic)
    const t1Geo = new THREE.BoxGeometry(200, 25, 750);
    const t1Mesh = new THREE.Mesh(t1Geo, bldgMat);
    t1Mesh.position.set(700, 19.0, 1500);
    parent.add(t1Mesh);

    // Terminal 2 (ANA Domestic)
    const t2Geo = new THREE.BoxGeometry(220, 28, 850);
    const t2Mesh = new THREE.Mesh(t2Geo, bldgMat);
    t2Mesh.position.set(1100, 20.5, 1800);
    parent.add(t2Mesh);

    // Terminal 3 (International Terminal)
    const t3Geo = new THREE.BoxGeometry(350, 30, 450);
    const t3Mesh = new THREE.Mesh(t3Geo, glassMat);
    t3Mesh.position.set(-800, 21.5, 800);
    parent.add(t3Mesh);

    // Haneda Control Tower (Height 115m)
    const towerShaftGeo = new THREE.CylinderGeometry(8, 14, 110, 16);
    const towerCabGeo = new THREE.CylinderGeometry(18, 12, 12, 16);

    const towerShaft = new THREE.Mesh(towerShaftGeo, bldgMat);
    towerShaft.position.set(850, 61.5, 1200);

    const towerCab = new THREE.Mesh(towerCabGeo, glassMat);
    towerCab.position.set(850, 120.0, 1200);

    parent.add(towerShaft);
    parent.add(towerCab);

    // Tokyo Gate Bridge (Landmark ~6km North-East)
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x3d6b99, metalness: 0.6, roughness: 0.4 });
    const bridgeGeo = new THREE.BoxGeometry(20, 60, 2600);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridgeMesh.position.set(4500, 36.5, 5800);
    parent.add(bridgeMesh);

    // Aqua-Line Tower of Wind (Kaze no To - Landmark in Tokyo Bay ~4km South)
    const kazeGeo = new THREE.CylinderGeometry(40, 45, 90, 32);
    const kazeMat = new THREE.MeshStandardMaterial({ color: 0xdde4ec, roughness: 0.3 });
    const kazeMesh = new THREE.Mesh(kazeGeo, kazeMat);
    kazeMesh.position.set(1200, 45.0, -4200);
    parent.add(kazeMesh);
  }

  buildAirportLights(parent) {
    const rad34L = 334.0 * Math.PI / 180.0;
    const fwdX = Math.sin(rad34L);
    const fwdZ = -Math.cos(rad34L);
    const perpX = Math.cos(rad34L);
    const perpZ = Math.sin(rad34L);

    // 1. Approach Light System (ALS) Strobe sequence extending 900m into Tokyo Bay
    const alsMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const alsGeo = new THREE.SphereGeometry(1.2, 8, 8);

    for (let d = 60; d <= 900; d += 30) {
      const light = new THREE.Mesh(alsGeo, alsMat);
      // Lead-in lights are behind threshold (-fwdX * d)
      light.position.set(-fwdX * d, 6.8, -fwdZ * d);
      parent.add(light);
    }

    // 2. Threshold Lights (Green)
    const threshGreenMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
    for (let k = -10; k <= 10; k++) {
      const gLight = new THREE.Mesh(alsGeo, threshGreenMat);
      gLight.position.set(perpX * (k * 3), 6.8, perpZ * (k * 3));
      parent.add(gLight);
    }

    // 3. PAPI Lights (Runway 34L Left side, 300m past threshold)
    const papiMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const papiOffset = 300;
    for (let p = 0; p < 4; p++) {
      const papiLight = new THREE.Mesh(alsGeo, papiMat);
      const px = fwdX * papiOffset - perpX * (45 + p * 8);
      const pz = fwdZ * papiOffset - perpZ * (45 + p * 8);
      papiLight.position.set(px, 7.0, pz);
      parent.add(papiLight);
    }

    // 4. Runway Edge Lights (White along 3000m runway)
    const edgeLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let d = 0; d <= 3000; d += 60) {
      const l1 = new THREE.Mesh(alsGeo, edgeLightMat);
      l1.position.set(fwdX * d + perpX * 32, 6.8, fwdZ * d + perpZ * 32);
      parent.add(l1);

      const l2 = new THREE.Mesh(alsGeo, edgeLightMat);
      l2.position.set(fwdX * d - perpX * 32, 6.8, fwdZ * d - perpZ * 32);
      parent.add(l2);
    }
  }
}
