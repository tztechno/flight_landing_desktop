/**
 * FlightTrajectory.js
 * Calculates 3D flight trajectories for Tokyo Haneda Airport (RJTT) Landing Approaches.
 * Features a single unified Tokyo Bay arrival fix for all routes (34L LDA Dogleg, 34R Straight ILS,
 * 16L Downwind-to-Base Traffic Pattern, TOGA Go-Around, and Bounce Landing),
 * continuous C1 Hermite spline transitions, coordinated roll banking, and full 3D orthonormal
 * orientation quaternion generation with zero gimbal lock.
 */

import * as THREE from 'three';

// Hermite Spline utility for C1 continuous path segments
function hermiteInterpolate(p0, t0, p1, t1, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  const dist = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
  const scale = dist * 0.8;

  return [
    h00 * p0[0] + h10 * t0[0] * scale + h01 * p1[0] + h11 * t1[0] * scale,
    h00 * p0[1] + h10 * t0[1] * scale + h01 * p1[1] + h11 * t1[1] * scale,
    h00 * p0[2] + h10 * t0[2] * scale + h01 * p1[2] + h11 * t1[2] * scale,
  ];
}

export class FlightTrajectory {
  constructor(params = {}) {
    this.setParameters(params);
  }

  setParameters(params = {}) {
    this.route = params.route || 'rwy34l'; // 'rwy34l', 'rwy34r', 'rwy16l', 'toga', 'bounce'
    this.speed = params.speed !== undefined ? params.speed : 70.0; // m/s (~136 kt)
    this.fps = params.fps !== undefined ? params.fps : 60; // 60 FPS temporal resolution
    this.glideSlopeDeg = params.glideSlopeDeg !== undefined ? params.glideSlopeDeg : 3.0; // Standard 3.0° glide slope
    this.rTurn = params.rTurn !== undefined ? params.rTurn : 1500.0; // Turn radius (m)
    this.targetHeadingDeg = params.targetHeadingDeg !== undefined ? params.targetHeadingDeg : 334.0; // RWY 34L heading

    this.compute();
  }

  compute() {
    if (this.route === 'rwy34l') {
      this._computeRwy34l();
    } else if (this.route === 'rwy34r') {
      this._computeRwy34r();
    } else if (this.route === 'rwy16l') {
      this._computeRwy16l();
    } else if (this.route === 'toga') {
      this._computeToga();
    } else if (this.route === 'bounce') {
      this._computeBounce();
    } else {
      this._computeRwy34l();
    }

    this.totalDuration = this.positions.length / this.fps;
    this._computeTrajectoryFrames();
  }

  _computeRwy34l() {
    const rwy34lHdg = this.targetHeadingDeg * Math.PI / 180.0;
    const uX = Math.sin(rwy34lHdg); // -0.43837
    const uZ = -Math.cos(rwy34lHdg); // -0.89879
    const pX = Math.cos(rwy34lHdg);  // +0.89879
    const pZ = Math.sin(rwy34lHdg);  // -0.43837

    const rTurn = this.rTurn;
    const dFinal = 3200.0;
    const dTurnArc = 0.5 * Math.PI * rTurn; // ~2356m
    const dStraightBay = 2200.0;
    const dCommonInbound = 2200.0;
    const rolloutDist = 1600.0;
    const altTouchdown = 6.5;

    const tanGs = Math.tan(this.glideSlopeDeg * Math.PI / 180.0);
    const zFinalStart = altTouchdown + dFinal * tanGs; // 174.2m
    const zTurnStart = zFinalStart + dTurnArc * tanGs; // 297.6m
    const zStraightStart = zTurnStart + dStraightBay * tanGs; // 412.9m
    const zCommonStart = zStraightStart + dCommonInbound * tanGs; // 528.2m

    // Key Waypoints
    const pFinalStart = [0.0 - uX * dFinal, zFinalStart, 0.0 - uZ * dFinal]; // (+1402.8, 174.2, +2876.1)
    const pTurnCenter = [pFinalStart[0] + pX * rTurn, 0.0, pFinalStart[2] + pZ * rTurn]; // (+2751.0, 0, +2218.6)

    const inHdg = 244.0 * Math.PI / 180.0;
    const inX = Math.sin(inHdg); // -0.89879
    const inZ = -Math.cos(inHdg); // +0.43837
    const pTurnStart = [pTurnCenter[0] - uX * rTurn, zTurnStart, pTurnCenter[2] - uZ * rTurn]; // (+3408.6, 297.6, +3566.8)
    const pStraightStart = [pTurnStart[0] - inX * dStraightBay, zStraightStart, pTurnStart[2] - inZ * dStraightBay];

    // Common Start Point (Tokyo Bay Arrival Gate)
    const pCommonStart = [5500.0, zCommonStart, 6000.0];
    const commonHdg = 270.0 * Math.PI / 180.0;
    const tCommon = [Math.sin(commonHdg), -tanGs, -Math.cos(commonHdg)];
    const tInbound = [inX, -tanGs, inZ];

    const positions = [];
    const phases = [];
    const banks = [];

    // 0. Transition from Common Start into Straight Bay Approach (Hermite C1)
    const n0 = Math.max(2, Math.floor(dCommonInbound / this.speed * this.fps));
    for (let i = 0; i < n0; i++) {
      const t = i / n0;
      const pt = hermiteInterpolate(pCommonStart, tCommon, pStraightStart, tInbound, t);
      positions.push(pt);
      phases.push(1);
      banks.push(0.0);
    }

    // 1. Phase 1: Straight Bay Approach (Heading 244°)
    const n1 = Math.max(2, Math.floor(dStraightBay / this.speed * this.fps));
    for (let i = 0; i < n1; i++) {
      const t = i / n1;
      const x = pStraightStart[0] + t * (pTurnStart[0] - pStraightStart[0]);
      const y = pStraightStart[1] + t * (pTurnStart[1] - pStraightStart[1]);
      const z = pStraightStart[2] + t * (pTurnStart[2] - pStraightStart[2]);
      positions.push([x, y, z]);
      phases.push(1);
      banks.push(0.0);
    }

    // 2. Phase 2: 90° Coordinated Right Turn (244° -> 334°)
    const n2 = Math.max(2, Math.floor(dTurnArc / this.speed * this.fps));
    const angleStart = Math.atan2(pTurnStart[2] - pTurnCenter[2], pTurnStart[0] - pTurnCenter[0]);
    for (let i = 0; i < n2; i++) {
      const t = i / n2;
      const theta = t * (0.5 * Math.PI);
      const angle = angleStart + theta;
      const x = pTurnCenter[0] + rTurn * Math.cos(angle);
      const z = pTurnCenter[2] + rTurn * Math.sin(angle);
      const y = zTurnStart + t * (zFinalStart - zTurnStart);
      positions.push([x, y, z]);
      phases.push(2);

      let b = -22.5; // Negative = right bank
      if (t < 0.18) b *= (1.0 - Math.cos(Math.PI * (t / 0.18))) * 0.5;
      else if (t > 0.82) b *= (1.0 + Math.cos(Math.PI * ((t - 0.82) / 0.18))) * 0.5;
      banks.push(b);
    }

    // 3. Phase 3: Final Straight Approach (Heading 334°, 3° Glide Slope)
    const n3 = Math.max(2, Math.floor(dFinal / this.speed * this.fps));
    const flareFrac = 0.08;
    for (let i = 0; i < n3; i++) {
      const t = i / n3;
      const x = pFinalStart[0] + t * (0.0 - pFinalStart[0]);
      const z = pFinalStart[2] + t * (0.0 - pFinalStart[2]);
      let y = zFinalStart + t * (altTouchdown - zFinalStart);

      if (t > (1.0 - flareFrac)) {
        const blend = (t - (1.0 - flareFrac)) / flareFrac;
        const smoothBlend = blend * blend * (3.0 - 2.0 * blend);
        y = y * (1.0 - smoothBlend) + altTouchdown * smoothBlend;
      }
      positions.push([x, y, z]);
      phases.push(3);
      banks.push(0.0);
    }

    // 4. Phase 4: Touchdown & Rollout on 34L
    const n4 = Math.max(2, Math.floor(rolloutDist / (this.speed * 0.55) * this.fps));
    for (let i = 0; i <= n4; i++) {
      const t = i / n4;
      const dist = rolloutDist * (1.0 - Math.pow(1.0 - t, 2.2));
      const x = 0.0 + uX * dist;
      const z = 0.0 + uZ * dist;
      positions.push([x, altTouchdown, z]);
      phases.push(4);
      banks.push(0.0);
    }

    this.tPhase1 = (n0 + n1) / this.fps;
    this.tPhase2 = (n0 + n1 + n2) / this.fps;
    this.tPhase3 = (n0 + n1 + n2 + n3) / this.fps;

    this.positions = positions;
    this.phases = phases;
    this.banks = banks;
  }

  _computeRwy34r() {
    const rwy34rHdg = this.targetHeadingDeg * Math.PI / 180.0;
    const uX = Math.sin(rwy34rHdg);
    const uZ = -Math.cos(rwy34rHdg);

    const td34r = [1520.0, 6.5, 420.0];
    const dFinal = 7500.0;
    const dTransition = 2500.0;
    const rolloutDist = 1600.0;
    const tanGs = Math.tan(this.glideSlopeDeg * Math.PI / 180.0);
    const zFinalStart = 6.5 + dFinal * tanGs; // ~400m
    const zCommonStart = zFinalStart + dTransition * tanGs; // ~531m

    const pFinalStart = [td34r[0] - uX * dFinal, zFinalStart, td34r[2] - uZ * dFinal];
    const pCommonStart = [5500.0, zCommonStart, 6000.0];

    const commonHdg = 270.0 * Math.PI / 180.0;
    const tCommon = [Math.sin(commonHdg), -tanGs, -Math.cos(commonHdg)];
    const tFinal = [uX, -tanGs, uZ];

    const positions = [];
    const phases = [];
    const banks = [];

    // 0. Smooth Hermite transition from Common Start to 34R Centerline
    const n0 = Math.max(2, Math.floor(dTransition / this.speed * this.fps));
    for (let i = 0; i < n0; i++) {
      const t = i / n0;
      const pt = hermiteInterpolate(pCommonStart, tCommon, pFinalStart, tFinal, t);
      positions.push(pt);
      phases.push(1);

      let b = 12.0 * Math.sin(t * Math.PI); // Gentle turn-on bank
      banks.push(b);
    }

    // Straight Final Approach on 34R
    const nFinal = Math.max(2, Math.floor(dFinal / this.speed * this.fps));
    const flareFrac = 0.08;
    for (let i = 0; i < nFinal; i++) {
      const t = i / nFinal;
      const x = pFinalStart[0] + t * (td34r[0] - pFinalStart[0]);
      const z = pFinalStart[2] + t * (td34r[2] - pFinalStart[2]);
      let y = pFinalStart[1] + t * (td34r[1] - pFinalStart[1]);
      if (t > (1.0 - flareFrac)) {
        const blend = (t - (1.0 - flareFrac)) / flareFrac;
        const smoothBlend = blend * blend * (3.0 - 2.0 * blend);
        y = y * (1.0 - smoothBlend) + td34r[1] * smoothBlend;
      }
      positions.push([x, y, z]);
      phases.push(3);
      banks.push(0.0);
    }

    // Rollout on 34R
    const nRoll = Math.max(2, Math.floor(rolloutDist / (this.speed * 0.55) * this.fps));
    for (let i = 0; i <= nRoll; i++) {
      const t = i / nRoll;
      const dist = rolloutDist * (1.0 - Math.pow(1.0 - t, 2.2));
      positions.push([td34r[0] + uX * dist, 6.5, td34r[2] + uZ * dist]);
      phases.push(4);
      banks.push(0.0);
    }

    this.tPhase1 = n0 / this.fps;
    this.tPhase2 = n0 / this.fps;
    this.tPhase3 = (n0 + nFinal) / this.fps;

    this.positions = positions;
    this.phases = phases;
    this.banks = banks;
  }

  _computeRwy16l() {
    const rwy34rHdg = 334.0 * Math.PI / 180.0;
    const uX = Math.sin(rwy34rHdg); // -0.43837
    const uZ = -Math.cos(rwy34rHdg); // -0.89879

    const rwy16lHdg = 154.0 * Math.PI / 180.0;
    const u16X = Math.sin(rwy16lHdg); // +0.43837
    const u16Z = -Math.cos(rwy16lHdg); // +0.89879
    const perp16X = Math.cos(rwy16lHdg); // +0.89879
    const perp16Z = Math.sin(rwy16lHdg); // -0.43837

    const td16l = [1520.0 + uX * 3360.0, 6.5, 420.0 + uZ * 3360.0]; // (+47.1, 6.5, -2600.0)

    const rBaseTurn = 1600.0;
    const dFinal16L = 3800.0;
    const dTurnArc = Math.PI * rBaseTurn; // ~5026m
    const dDownwind = 7200.0;

    const tanGs = Math.tan(3.0 * Math.PI / 180.0);
    const zFinal16L = 6.5 + dFinal16L * tanGs; // ~205.8m
    const zTurnStart = 380.0;
    const zDownwind = 500.0;

    // Final Fix for 16L
    const pFinalFix = [td16l[0] - u16X * dFinal16L, zFinal16L, td16l[2] - u16Z * dFinal16L]; // (-1618.7, 205.8, -6015.3)

    // Base Turn Center (1600m East of 16L centerline)
    const pTurnCenter = [pFinalFix[0] + perp16X * rBaseTurn, 0, pFinalFix[2] + perp16Z * rBaseTurn]; // (-180.6, 0, -6716.7)

    // Downwind End (Start of 180° turn, heading 334°)
    const pDownwindEnd = [pFinalFix[0] + perp16X * (2 * rBaseTurn), zTurnStart, pFinalFix[2] + perp16Z * (2 * rBaseTurn)]; // (+1257.4, 380, -7418.1)

    // Common Start Point
    const pCommonStart = [5500.0, zDownwind, 6000.0];
    const commonHdg = 320.0 * Math.PI / 180.0;
    const tCommon = [Math.sin(commonHdg), -0.015, -Math.cos(commonHdg)];
    const tDownwind = [uX, -0.015, uZ];

    const positions = [];
    const phases = [];
    const banks = [];

    // 1. Downwind Leg: Smooth Hermite transition from Common Start to Downwind End
    const nDown = Math.max(2, Math.floor(dDownwind / this.speed * this.fps));
    for (let i = 0; i < nDown; i++) {
      const t = i / nDown;
      const pt = hermiteInterpolate(pCommonStart, tCommon, pDownwindEnd, tDownwind, t);
      positions.push(pt);
      phases.push(1);
      banks.push(0.0);
    }

    // 2. 180° Left Base Turn (Heading 334° -> 154°)
    const nTurn = Math.max(2, Math.floor(dTurnArc / this.speed * this.fps));
    const angleStart = Math.atan2(pDownwindEnd[2] - pTurnCenter[2], pDownwindEnd[0] - pTurnCenter[0]);
    for (let i = 0; i < nTurn; i++) {
      const t = i / nTurn;
      const theta = t * Math.PI;
      const angle = angleStart + theta;
      const x = pTurnCenter[0] + rBaseTurn * Math.cos(angle);
      const z = pTurnCenter[2] + rBaseTurn * Math.sin(angle);
      const y = zTurnStart + t * (zFinal16L - zTurnStart);
      positions.push([x, y, z]);
      phases.push(2);

      let b = 22.5; // Positive = left bank
      if (t < 0.15) b *= (1.0 - Math.cos(Math.PI * (t / 0.15))) * 0.5;
      else if (t > 0.85) b *= (1.0 + Math.cos(Math.PI * ((t - 0.85) / 0.15))) * 0.5;
      banks.push(b);
    }

    // 3. Final Approach on 16L (Heading 154°)
    const nFinal = Math.max(2, Math.floor(dFinal16L / this.speed * this.fps));
    const flareFrac = 0.08;
    for (let i = 0; i < nFinal; i++) {
      const t = i / nFinal;
      const x = pFinalFix[0] + t * (td16l[0] - pFinalFix[0]);
      const z = pFinalFix[2] + t * (td16l[2] - pFinalFix[2]);
      let y = pFinalFix[1] + t * (td16l[1] - pFinalFix[1]);
      if (t > (1.0 - flareFrac)) {
        const blend = (t - (1.0 - flareFrac)) / flareFrac;
        const smoothBlend = blend * blend * (3.0 - 2.0 * blend);
        y = y * (1.0 - smoothBlend) + td16l[1] * smoothBlend;
      }
      positions.push([x, y, z]);
      phases.push(3);
      banks.push(0.0);
    }

    // 4. Rollout on 16L
    const nRoll = Math.max(2, Math.floor(1600.0 / (this.speed * 0.55) * this.fps));
    for (let i = 0; i <= nRoll; i++) {
      const t = i / nRoll;
      const dist = 1600.0 * (1.0 - Math.pow(1.0 - t, 2.2));
      positions.push([td16l[0] + u16X * dist, 6.5, td16l[2] + u16Z * dist]);
      phases.push(4);
      banks.push(0.0);
    }

    this.tPhase1 = nDown / this.fps;
    this.tPhase2 = (nDown + nTurn) / this.fps;
    this.tPhase3 = (nDown + nTurn + nFinal) / this.fps;

    this.positions = positions;
    this.phases = phases;
    this.banks = banks;
  }

  _computeToga() {
    this._computeRwy34l();
    let cutoffIdx = 0;
    for (let i = 0; i < this.positions.length; i++) {
      if (this.phases[i] === 3 && this.positions[i][1] <= 45.0) {
        cutoffIdx = i;
        break;
      }
    }
    if (cutoffIdx === 0) cutoffIdx = Math.floor(this.positions.length * 0.65);

    const newPositions = this.positions.slice(0, cutoffIdx);
    const newPhases = this.phases.slice(0, cutoffIdx);
    const newBanks = this.banks.slice(0, cutoffIdx);

    const climbFrames = Math.floor(20.0 * this.fps);
    const climbTan = Math.tan(11.0 * Math.PI / 180.0);
    const tanGs = Math.tan(this.glideSlopeDeg * Math.PI / 180.0);
    const ds = this.speed * 1.15 * (1.0 / this.fps);
    const rwyHdg = 334.0 * Math.PI / 180.0;
    const rampFrames = Math.floor(1.8 * this.fps);

    for (let i = 1; i < climbFrames; i++) {
      const t = i / climbFrames;
      const rampT = Math.min(1.0, i / rampFrames);
      const smoothRamp = rampT * rampT * (3.0 - 2.0 * rampT);
      const curClimbTan = THREE.MathUtils.lerp(-tanGs, climbTan, smoothRamp);

      const turnT = Math.max(0.0, (t - 0.15) / 0.85);
      const smoothTurn = turnT * turnT * (3.0 - 2.0 * turnT);
      const curHdg = rwyHdg + smoothTurn * (91.0 * Math.PI / 180.0);

      const dx = Math.sin(curHdg) * ds;
      const dz = -Math.cos(curHdg) * ds;
      const dy = ds * curClimbTan;

      const prev = newPositions[newPositions.length - 1];
      newPositions.push([prev[0] + dx, prev[1] + dy, prev[2] + dz]);
      newPhases.push(5);

      let b = -26.0;
      if (turnT < 0.2) b *= turnT / 0.2;
      else if (turnT > 0.85) b *= (1.0 - (turnT - 0.85) / 0.15);
      newBanks.push(b);
    }

    this.positions = newPositions;
    this.phases = newPhases;
    this.banks = newBanks;
  }

  _computeBounce() {
    this._computeRwy34l();
    const tdIdx = this.phases.indexOf(4);
    if (tdIdx < 0) return;

    const newPositions = this.positions.slice(0, tdIdx);
    const newPhases = this.phases.slice(0, tdIdx);
    const newBanks = this.banks.slice(0, tdIdx);

    const tdPos = this.positions[tdIdx];
    const bounceFrames = Math.floor(6.0 * this.fps);
    const rolloutFrames = Math.floor(10.0 * this.fps);

    const rwyHdg = 334.0 * Math.PI / 180.0;
    const uX = Math.sin(rwyHdg);
    const uZ = -Math.cos(rwyHdg);
    const pX = Math.cos(rwyHdg);
    const pZ = Math.sin(rwyHdg);

    // 1. First Touchdown & Hard Bounce Arc into the air
    for (let i = 0; i < bounceFrames; i++) {
      const t = i / bounceFrames;
      const dist = i * (this.speed * 0.9 / this.fps);
      const bounceAlt = 6.5 + 18.0 * Math.pow(Math.sin(t * Math.PI), 2.0);
      newPositions.push([tdPos[0] + uX * dist, bounceAlt, tdPos[2] + uZ * dist]);
      newPhases.push(6);
      newBanks.push(9.0 * Math.sin(t * Math.PI * 2.0));
    }

    // 2. Second Hard Impact, Landing Gear Collapse & Runway Excursion
    const secondTd = newPositions[newPositions.length - 1];
    for (let i = 1; i <= rolloutFrames; i++) {
      const t = i / rolloutFrames;
      const dist = 600.0 * (1.0 - Math.pow(1.0 - t, 2.8));
      const lateralDrift = Math.pow(t, 1.4) * 32.0;
      const groundAlt = 5.2; // Fuselage scrape elevation
      newPositions.push([
        secondTd[0] + uX * dist + pX * lateralDrift,
        groundAlt,
        secondTd[2] + uZ * dist + pZ * lateralDrift
      ]);
      newPhases.push(7);
      newBanks.push(-6.5 * Math.min(1.0, t * 2.0));
    }

    this.positions = newPositions;
    this.phases = newPhases;
    this.banks = newBanks;
  }

  _computeTrajectoryFrames() {
    this.frames = [];
    const n = this.positions.length;
    const wUp = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < n; i++) {
      const pos = new THREE.Vector3(this.positions[i][0], this.positions[i][1], this.positions[i][2]);
      let fwdVec = new THREE.Vector3();

      if (i > 0 && i < n - 1) {
        fwdVec.subVectors(
          new THREE.Vector3(this.positions[i + 1][0], this.positions[i + 1][1], this.positions[i + 1][2]),
          new THREE.Vector3(this.positions[i - 1][0], this.positions[i - 1][1], this.positions[i - 1][2])
        );
      } else if (i === 0) {
        fwdVec.subVectors(
          new THREE.Vector3(this.positions[1][0], this.positions[1][1], this.positions[1][2]),
          pos
        );
      } else {
        fwdVec.subVectors(
          pos,
          new THREE.Vector3(this.positions[n - 2][0], this.positions[n - 2][1], this.positions[n - 2][2])
        );
      }

      if (fwdVec.lengthSq() < 1e-4) {
        if (this.frames.length > 0) {
          fwdVec.copy(this.frames[this.frames.length - 1].forward);
        } else {
          fwdVec.set(0, 0, -1);
        }
      } else {
        fwdVec.normalize();
      }

      const phase = this.phases[i];
      const bankDeg = this.banks[i] || 0.0;
      const bankRad = (bankDeg * Math.PI) / 180.0;

      // Realistic angle of attack pitch attitude (+2.5° during flight, +3.5° during flare)
      let pitchAttitudeOffset = 0.0;
      if (phase === 1 || phase === 2 || phase === 3) {
        pitchAttitudeOffset = 2.5; // deg AoA
        if (phase === 3 && pos.y < 20.0) {
          const flareFrac = Math.max(0.0, (20.0 - pos.y) / 13.5);
          pitchAttitudeOffset += flareFrac * 2.5; // Flare up to ~5.0° pitch at touchdown
        }
      } else if (phase === 5) {
        pitchAttitudeOffset = 3.5;
      }

      // Compute Orthonormal 3D Orientation Basis & Quaternion
      const r0 = new THREE.Vector3().crossVectors(fwdVec, wUp);
      if (r0.lengthSq() < 1e-4) r0.set(1, 0, 0);
      else r0.normalize();

      const u0 = new THREE.Vector3().crossVectors(r0, fwdVec).normalize();

      const cosB = Math.cos(bankRad);
      const sinB = Math.sin(bankRad);
      const rBanked = new THREE.Vector3().copy(r0).multiplyScalar(cosB).addScaledVector(u0, sinB);
      const uBanked = new THREE.Vector3().copy(r0).multiplyScalar(-sinB).addScaledVector(u0, cosB);
      const dBack = new THREE.Vector3().copy(fwdVec).negate();

      const rotMatrix = new THREE.Matrix4().makeBasis(rBanked, uBanked, dBack);
      const quat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);

      if (pitchAttitudeOffset !== 0.0) {
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (pitchAttitudeOffset * Math.PI) / 180.0);
        quat.multiply(pitchQuat);
      }

      let headingDeg = (Math.atan2(fwdVec.x, -fwdVec.z) * 180.0 / Math.PI + 360.0) % 360.0;
      let pitchDeg = Math.asin(Math.max(-1.0, Math.min(1.0, fwdVec.y))) * 180.0 / Math.PI + pitchAttitudeOffset;

      let airspeed = this.speed;
      if (phase === 4 || phase === 7) {
        airspeed = Math.max(12.0, this.speed * (1.0 - (i - this.phases.indexOf(phase)) / 350.0));
      } else if (phase === 5) {
        airspeed = this.speed * 1.18;
      }

      this.frames.push({
        position: pos,
        forward: fwdVec,
        quaternion: quat,
        phase: phase,
        airspeed: airspeed,
        verticalSpeed: fwdVec.y * this.speed,
        headingDeg: headingDeg,
        pitchDeg: pitchDeg,
        bankDeg: bankDeg,
        gForce: phase === 2 ? 1.12 : (phase === 6 ? 2.85 : 1.0),
        gear: (phase === 1 && pos.y > 400) ? 0.0 : ((phase === 7 && i > this.phases.indexOf(7) + 20) ? 0.2 : 1.0),
        flaps: (phase === 1 && pos.y > 400) ? 1 : ((phase === 2) ? 2 : 3),
        spoilers: (phase === 4 || phase === 7) ? 1.0 : 0.0,
        reversers: (phase === 4 || phase === 7) ? 1.0 : 0.0,
        isCrash: phase === 7,
      });
    }
  }

  getLandingReport() {
    if (this.route === 'bounce') {
      return {
        verticalSpeedFpm: 840,
        gForce: '2.85',
        centerlineDevM: 32,
        speedKt: Math.round(this.speed * 1.94384),
        score: 'crash',
        crashReasonKey: 'crashReasonBounce',
      };
    } else if (this.route === 'rwy34l') {
      return {
        verticalSpeedFpm: 115,
        gForce: '1.08',
        centerlineDevM: 1.5,
        speedKt: Math.round(this.speed * 1.94384),
        score: 'butter',
        crashReasonKey: null,
      };
    } else if (this.route === 'rwy34r') {
      return {
        verticalSpeedFpm: 165,
        gForce: '1.18',
        centerlineDevM: 3.2,
        speedKt: Math.round(this.speed * 1.94384),
        score: 'good',
        crashReasonKey: null,
      };
    } else if (this.route === 'rwy16l') {
      return {
        verticalSpeedFpm: 195,
        gForce: '1.24',
        centerlineDevM: 4.8,
        speedKt: Math.round(this.speed * 1.94384),
        score: 'good',
        crashReasonKey: null,
      };
    } else if (this.route === 'toga') {
      return null; // Go-Around climb out
    }
    return {
      verticalSpeedFpm: 140,
      gForce: '1.12',
      centerlineDevM: 2.0,
      speedKt: Math.round(this.speed * 1.94384),
      score: 'butter',
      crashReasonKey: null,
    };
  }

  getFrameAtTime(tSeconds) {
    if (!this.frames || this.frames.length === 0) return null;
    const clampedT = Math.max(0.0, Math.min(this.totalDuration, tSeconds));
    const exactIndex = (clampedT / this.totalDuration) * (this.frames.length - 1);
    const idx0 = Math.floor(exactIndex);
    const idx1 = Math.min(this.frames.length - 1, idx0 + 1);
    const alpha = exactIndex - idx0;

    const f0 = this.frames[idx0];
    const f1 = this.frames[idx1];

    const pos = new THREE.Vector3().lerpVectors(f0.position, f1.position, alpha);
    const fwd = new THREE.Vector3().lerpVectors(f0.forward, f1.forward, alpha).normalize();
    const quat = new THREE.Quaternion().slerpQuaternions(f0.quaternion, f1.quaternion, alpha);

    let dHdg = ((f1.headingDeg - f0.headingDeg + 540) % 360) - 180;
    let headingDeg = (f0.headingDeg + dHdg * alpha + 360) % 360;

    return {
      position: pos,
      forward: fwd,
      quaternion: quat,
      phase: f0.phase,
      airspeed: THREE.MathUtils.lerp(f0.airspeed, f1.airspeed, alpha),
      verticalSpeed: THREE.MathUtils.lerp(f0.verticalSpeed, f1.verticalSpeed, alpha),
      headingDeg: headingDeg,
      pitchDeg: THREE.MathUtils.lerp(f0.pitchDeg, f1.pitchDeg, alpha),
      bankDeg: THREE.MathUtils.lerp(f0.bankDeg, f1.bankDeg, alpha),
      gForce: THREE.MathUtils.lerp(f0.gForce, f1.gForce, alpha),
      gear: f0.gear,
      flaps: f0.flaps,
      spoilers: f0.spoilers,
      reversers: f0.reversers,
      isCrash: f0.isCrash || f1.isCrash,
      progress: clampedT / this.totalDuration,
    };
  }
}
