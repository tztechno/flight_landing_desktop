/**
 * FreeFlightSim.js
 * 6-DOF Aerodynamic Flight Simulation Engine for Haneda Airport Manual Landing.
 * Features realistic aerodynamics, ground effect flare physics, PAPI guidance calculation,
 * ILS glideslope & localizer tracking, wheel braking, reverse thrust, and landing evaluation scoring.
 */

import * as THREE from 'three';

export class FreeFlightSim {
  constructor() {
    this.reset('rwy34l_short');
  }

  reset(spawnPreset = 'rwy34l_short') {
    this.spawnPreset = spawnPreset;

    // Aircraft State
    if (spawnPreset === 'free_flight') {
      // Free Flight: Cruise over Tokyo Bay at 2000ft, 160kt, Gear UP, Flaps 0
      this.position = new THREE.Vector3(4500.0, 610.0, 4500.0);
      this.heading = 310.0; // Heading towards Tokyo / Haneda
      this.pitch = 1.0;
      this.bank = 0.0;
      this.speed = 82.0; // ~160 kt
      this.gear = 0.0;
      this.flapsLevel = 0; // Clean config
      this.verticalSpeed = 0.0;
      this.gamma = 0.0;
      this.throttle = 0.55;
      this.actualThrustRatio = 0.55;
    } else if (spawnPreset === 'rwy34r_final') {
      // 4km out on RWY 34R ILS
      const rwyRad = 334.0 * Math.PI / 180.0;
      const fwdX = Math.sin(rwyRad);
      const fwdZ = -Math.cos(rwyRad);
      this.position = new THREE.Vector3(
        1520.0 - fwdX * 4000.0,
        6.5 + 4000.0 * Math.tan(3.0 * Math.PI / 180.0),
        420.0 - fwdZ * 4000.0
      );
      this.heading = 334.0;
      this.pitch = -3.0;
      this.bank = 0.0;
      this.speed = 70.0;
      this.gear = 1.0;
      this.flapsLevel = 3;
      this.verticalSpeed = -3.6;
      this.gamma = -0.052;
      this.throttle = 0.46;
      this.actualThrustRatio = 0.46;
    } else if (spawnPreset === 'rwy16l_final') {
      // 3.5km out on RWY 16L Tokyo City Approach (Heading 154°)
      const rwyRad = 154.0 * Math.PI / 180.0;
      const fwdX = Math.sin(rwyRad);
      const fwdZ = -Math.cos(rwyRad);
      this.position = new THREE.Vector3(
        1520.0 - fwdX * 3500.0,
        6.5 + 3500.0 * Math.tan(3.0 * Math.PI / 180.0),
        -1800.0 - fwdZ * 3500.0
      );
      this.heading = 154.0;
      this.pitch = -3.0;
      this.bank = 0.0;
      this.speed = 68.0;
      this.gear = 1.0;
      this.flapsLevel = 3;
      this.verticalSpeed = -3.5;
      this.gamma = -0.052;
      this.throttle = 0.45;
      this.actualThrustRatio = 0.45;
    } else {
      // RWY 34L Short Final (3.2km out, lined up on 34L)
      const dist = 3200.0;
      const rwyRad = 334.0 * Math.PI / 180.0;
      const fwdX = Math.sin(rwyRad);
      const fwdZ = -Math.cos(rwyRad);
      this.position = new THREE.Vector3(
        0.0 - fwdX * dist,
        6.5 + dist * Math.tan(3.0 * Math.PI / 180.0),
        0.0 - fwdZ * dist
      );
      this.heading = 334.0;
      this.pitch = -3.0;
      this.bank = 0.0;
      this.speed = 68.0; // ~132 kt
      this.gear = 1.0;
      this.flapsLevel = 3; // Flaps 30° (Landing config)
      this.verticalSpeed = -3.5; // m/s
      this.gamma = -0.05; // Flight path angle
      this.throttle = 0.45;
      this.actualThrustRatio = 0.45;
    }

    // Control Inputs
    this.elevatorInput = 0.0;
    this.aileronInput = 0.0;
    this.rudderInput = 0.0;
    this.brakes = false;
    this.spoilers = 0.0;
    this.reversers = false;

    // Aircraft Physical Properties (Boeing 737-800 class)
    this.mass = 62000.0; // kg (Landing weight)
    this.wingArea = 125.0; // m^2
    this.maxThrust = 240000.0; // N (2x 120 kN turbofans)
    this.rho = 1.225; // kg/m^3
    this.g = 9.80665; // m/s^2

    // Status
    this.isGrounded = false;
    this.touchdownRecorded = false;
    this.isCrashed = false;
    this.landingReport = null;
    this.gForce = 1.0;
    this.elapsedTime = 0.0;
    this.stallWarning = false;
    this.groundElevation = 6.5; // Standard Haneda elevation
  }

  getGuidanceGates(preset = this.spawnPreset) {
    if (preset === 'free_flight') return [];

    let tdX = 0, tdZ = 0, hdgDeg = 334.0, maxDist = 3200.0;
    if (preset === 'rwy34r_final') {
      tdX = 1520.0;
      tdZ = 420.0;
      hdgDeg = 334.0;
      maxDist = 4000.0;
    } else if (preset === 'rwy16l_final') {
      tdX = 1520.0;
      tdZ = -1800.0;
      hdgDeg = 154.0;
      maxDist = 3500.0;
    }

    const rwyRad = hdgDeg * Math.PI / 180.0;
    const fwdX = Math.sin(rwyRad);
    const fwdZ = -Math.cos(rwyRad);
    const tanGs = Math.tan(3.0 * Math.PI / 180.0);

    const gates = [];
    const step = 280.0; // gate spacing
    const numGates = Math.floor(maxDist / step);

    for (let i = 1; i <= numGates; i++) {
      const dist = i * step;
      const x = tdX - fwdX * dist;
      const z = tdZ - fwdZ * dist;
      const y = 6.5 + dist * tanGs;
      const width = Math.max(22.0, Math.min(48.0, 18.0 + (dist / maxDist) * 30.0));
      const height = width * 0.55;

      gates.push({
        id: i,
        position: new THREE.Vector3(x, y, z),
        headingDeg: hdgDeg,
        pitchDeg: -3.0,
        width: width,
        height: height,
        distToRwy: dist,
        passed: false,
      });
    }

    return {
      runway: preset,
      touchdownPos: new THREE.Vector3(tdX, 6.5, tdZ),
      headingDeg: hdgDeg,
      gates: gates,
    };
  }

  setThrottle(valPercent) {
    this.throttle = Math.max(0.0, Math.min(100.0, valPercent)) / 100.0;
  }

  toggleGear() {
    if (!this.isGrounded) {
      this.gear = this.gear > 0.5 ? 0.0 : 1.0;
    }
  }

  cycleFlaps() {
    this.flapsLevel = (this.flapsLevel + 1) % 4; // 0=0°, 1=5°, 2=15°, 3=30°
  }

  toggleBrakes() {
    this.brakes = !this.brakes;
  }

  toggleReverse() {
    if (this.isGrounded) {
      this.reversers = !this.reversers;
      if (this.reversers) {
        this.throttle = 0.8; // Apply reverse power
      }
    }
  }

  toggleSpoilers() {
    this.spoilers = this.spoilers > 0.5 ? 0.0 : 1.0;
  }

  update(dt, inputs = {}, terrainElev = 6.5) {
    dt = Math.max(0.001, Math.min(dt, 0.1));
    this.elapsedTime += dt;
    this.groundElevation = Math.max(0.0, terrainElev);

    // Apply inputs
    if (inputs.elevator !== undefined) this.elevatorInput = inputs.elevator;
    if (inputs.aileron !== undefined) this.aileronInput = inputs.aileron;
    if (inputs.rudder !== undefined) this.rudderInput = inputs.rudder;
    if (inputs.throttle !== undefined) this.throttle = Math.max(0.0, Math.min(1.0, inputs.throttle));
    if (inputs.brakes !== undefined) this.brakes = inputs.brakes;
    if (inputs.spoilers !== undefined) this.spoilers = inputs.spoilers;

    // Engine Spool
    const spoolRate = 0.6 * dt;
    if (this.actualThrustRatio < this.throttle) {
      this.actualThrustRatio = Math.min(this.throttle, this.actualThrustRatio + spoolRate);
    } else if (this.actualThrustRatio > this.throttle) {
      this.actualThrustRatio = Math.max(this.throttle, this.actualThrustRatio - spoolRate * 1.2);
    }

    let netThrust = this.actualThrustRatio * this.maxThrust;
    if (this.reversers && this.isGrounded) {
      netThrust = -this.actualThrustRatio * this.maxThrust * 0.6; // Reverse thrust
    }

    // Aerodynamic Coefficients
    const flapData = [
      { deg: 0, cL: 0.28, cD: 0.022 },
      { deg: 5, cL: 0.55, cD: 0.030 },
      { deg: 15, cL: 0.85, cD: 0.045 },
      { deg: 30, cL: 1.35, cD: 0.080 }, // Landing flaps
    ][this.flapsLevel];

    // Dynamic Pressure q = 0.5 * rho * V^2
    const q = 0.5 * this.rho * this.speed * this.speed;

    const toRad = (d) => d * Math.PI / 180.0;
    const toDeg = (r) => r * 180.0 / Math.PI;

    if (this.isGrounded) {
      // Ground Roll Dynamics
      this.gear = 1.0;
      this.bank = 0.0;
      this.pitch = Math.max(-0.5, Math.min(6.0, this.pitch + this.elevatorInput * 12.0 * dt));

      // Yaw on ground via rudder/nosewheel
      this.heading -= this.rudderInput * 25.0 * dt * Math.min(1.0, this.speed / 15.0);

      // Deceleration: Rolling friction + Wheel Brakes + Aero Drag + Reverse Thrust
      let frictionCoeff = 0.025;
      if (this.brakes) frictionCoeff += 0.35; // Heavy braking
      if (this.spoilers > 0.5) frictionCoeff += 0.12;

      const frictionForce = frictionCoeff * this.mass * this.g;
      const aeroDrag = q * this.wingArea * (flapData.cD + 0.04 * this.gear + (this.spoilers > 0.5 ? 0.06 : 0.0));
      const totalDecel = (frictionForce + aeroDrag - netThrust) / this.mass;

      this.speed = Math.max(0.0, this.speed - totalDecel * dt);
      this.verticalSpeed = 0.0;
      this.position.y = this.groundElevation;
      this.gForce = 1.0;

      // Move along heading
      const hdgRad = toRad(this.heading);
      this.position.x += Math.sin(hdgRad) * this.speed * dt;
      this.position.z += -Math.cos(hdgRad) * this.speed * dt;

    } else {
      // Airborne Flight Dynamics
      // Effective Angle of Attack (AoA)
      const aoa = this.pitch - toDeg(this.gamma);

      // Ground Effect (Flare cushioning when altitude < 25m)
      const altAboveGround = Math.max(0.0, this.position.y - this.groundElevation);
      let groundEffectLiftMult = 1.0;
      let groundEffectDragMult = 1.0;
      if (altAboveGround < 20.0) {
        const hB = Math.max(0.1, altAboveGround / 35.0); // Wingspan ~35m
        groundEffectLiftMult = 1.0 + 0.25 * Math.exp(-hB * 3.5);
        groundEffectDragMult = Math.max(0.5, 1.0 - 0.4 * Math.exp(-hB * 3.5));
      }

      // Lift Coefficient
      let cL = (flapData.cL + 0.095 * aoa) * groundEffectLiftMult;
      if (aoa > 16.0 || aoa < -10.0) {
        this.stallWarning = true;
        cL = Math.max(0.2, cL * 0.5); // Stall lift loss
      } else {
        this.stallWarning = false;
      }

      const lift = q * this.wingArea * cL;

      // Drag Coefficient (Parasitic + Induced + Gear + Spoilers)
      const inducedDrag = (cL * cL) / (Math.PI * 8.5 * 0.82) * groundEffectDragMult;
      const totalCD = flapData.cD + inducedDrag + 0.035 * this.gear + (this.spoilers > 0.5 ? 0.05 : 0.0);
      const drag = q * this.wingArea * totalCD;

      // Flight Controls
      const controlAuthority = Math.min(1.5, this.speed / 45.0);
      const pitchRate = this.elevatorInput * 18.0 * controlAuthority;
      const rollRate = -this.aileronInput * 35.0 * controlAuthority;
      const yawRate = -this.rudderInput * 14.0 * controlAuthority;

      this.pitch += pitchRate * dt;
      this.bank += rollRate * dt;
      this.bank = Math.max(-50.0, Math.min(50.0, this.bank));

      // Aerodynamic turn from bank angle
      const turnRate = (this.g * Math.tan(toRad(this.bank))) / Math.max(15.0, this.speed);
      this.heading += (toDeg(turnRate) + yawRate) * dt;
      this.heading = (this.heading + 360.0) % 360.0;

      // Accelerations along & perpendicular to flight path
      const dV = (netThrust * Math.cos(toRad(aoa)) - drag - this.mass * this.g * Math.sin(this.gamma)) / this.mass;
      this.speed = Math.max(10.0, this.speed + dV * dt);

      // Vertical flight path change
      const dGamma = (lift * Math.cos(toRad(this.bank)) + netThrust * Math.sin(toRad(aoa)) - this.mass * this.g * Math.cos(this.gamma)) / (this.mass * Math.max(15.0, this.speed));
      this.gamma += dGamma * dt;
      this.verticalSpeed = this.speed * Math.sin(this.gamma);

      this.gForce = (lift / (this.mass * this.g)) * Math.cos(toRad(this.bank));

      // Position update
      const hdgRad = toRad(this.heading);
      const horizSpeed = this.speed * Math.cos(this.gamma);
      this.position.x += Math.sin(hdgRad) * horizSpeed * dt;
      this.position.z += -Math.cos(hdgRad) * horizSpeed * dt;
      this.position.y += this.verticalSpeed * dt;

      // Touchdown Check
      if (this.position.y <= this.groundElevation + 0.1) {
        this.position.y = this.groundElevation;
        this.isGrounded = true;

        if (!this.touchdownRecorded) {
          this.recordTouchdown();
        }
      }
    }
  }

  recordTouchdown() {
    this.touchdownRecorded = true;
    const vsFpm = Math.abs(this.verticalSpeed * 196.85); // m/s to fpm
    const gVal = Math.max(1.0, this.gForce + Math.abs(this.verticalSpeed) * 0.4);

    // Lateral deviation from RWY 34L centerline
    // RWY 34L passes through (0, 0) with heading 334°
    const rwyRad = 334.0 * Math.PI / 180.0;
    const perpX = Math.cos(rwyRad);
    const perpZ = Math.sin(rwyRad);
    const latDev = Math.abs(this.position.x * perpX + this.position.z * perpZ);
    const bankAbs = Math.abs(this.bank);

    let score = 'good';
    let crashReasonKey = null;

    // 1. Crash conditions (checked FIRST for highest severity)
    if (this.gear < 0.5) {
      score = 'crash';
      crashReasonKey = 'crashReasonGear';
    } else if (vsFpm > 850) {
      score = 'crash';
      crashReasonKey = 'crashReasonVsi';
    } else if (gVal > 3.0) {
      score = 'crash';
      crashReasonKey = 'crashReasonVsi';
    } else if (bankAbs > 14.0) {
      score = 'crash';
      crashReasonKey = 'crashReasonBank';
    } else if (latDev > 35.0) {
      score = 'crash';
      crashReasonKey = 'crashReasonExcursion';
    } else if (this.position.y < 3.0) {
      // Impacted water/sea wall before runway
      score = 'crash';
      crashReasonKey = 'crashReasonTerrain';
    }
    // 2. Hard landing conditions
    else if (vsFpm > 450 || gVal > 2.0) {
      score = 'hard';
    }
    // 3. Butter landing conditions
    else if (vsFpm < 150 && gVal < 1.35 && latDev < 12.0) {
      score = 'butter';
    }

    this.isCrashed = score === 'crash';
    this.landingReport = {
      verticalSpeedFpm: Math.round(vsFpm),
      gForce: gVal.toFixed(2),
      centerlineDevM: Math.round(latDev),
      speedKt: Math.round(this.speed * 1.94384),
      score: score,
      crashReasonKey: crashReasonKey,
    };
  }

  getPapiStatus(targetRwy = '34L') {
    // 34L Touchdown zone (0, 6.5, 0)
    // PAPI nominal glide slope is 3.0 degrees
    const rwyRad = 334.0 * Math.PI / 180.0;
    const fwdX = Math.sin(rwyRad);
    const fwdZ = -Math.cos(rwyRad);

    // Distance to threshold along runway axis
    const dx = 0.0 - this.position.x;
    const dz = 0.0 - this.position.z;
    const distToThreshold = dx * fwdX + dz * fwdZ;

    if (distToThreshold <= 50.0) {
      return { p1: 'white', p2: 'white', p3: 'red', p4: 'red', onGlide: true };
    }

    const currentAngleDeg = Math.atan2(this.position.y - 6.5, distToThreshold) * 180.0 / Math.PI;
    const delta = currentAngleDeg - 3.0;

    // 4 PAPI Lights:
    // delta > 0.5°: W W W W (Too High)
    // 0.2° < delta <= 0.5°: W W W R (Slightly High)
    // -0.2° <= delta <= 0.2°: W W R R (On Glidepath 3.0°)
    // -0.5° <= delta < -0.2°: W R R R (Slightly Low)
    // delta < -0.5°: R R R R (Too Low / Dangerous)
    if (delta > 0.5) return { p1: 'white', p2: 'white', p3: 'white', p4: 'white', onGlide: false };
    if (delta > 0.18) return { p1: 'white', p2: 'white', p3: 'white', p4: 'red', onGlide: false };
    if (delta >= -0.18) return { p1: 'white', p2: 'white', p3: 'red', p4: 'red', onGlide: true };
    if (delta >= -0.5) return { p1: 'white', p2: 'red', p3: 'red', p4: 'red', onGlide: false };
    return { p1: 'red', p2: 'red', p3: 'red', p4: 'red', onGlide: false };
  }

  getIlsDeviation() {
    // Return normalized glideslope and localizer deviation [-1.0, 1.0]
    const rwyRad = 334.0 * Math.PI / 180.0;
    const fwdX = Math.sin(rwyRad);
    const fwdZ = -Math.cos(rwyRad);
    const perpX = Math.cos(rwyRad);
    const perpZ = Math.sin(rwyRad);

    const dx = this.position.x;
    const dz = this.position.z;
    const dist = -(dx * fwdX + dz * fwdZ);
    const latOffset = dx * perpX + dz * perpZ;

    const locDev = Math.max(-1.0, Math.min(1.0, latOffset / 250.0));

    const nominalAlt = 6.5 + dist * Math.tan(3.0 * Math.PI / 180.0);
    const altDiff = this.position.y - nominalAlt;
    const gsDev = Math.max(-1.0, Math.min(1.0, altDiff / 60.0));

    return { loc: locDev, gs: gsDev, distM: Math.max(0, dist) };
  }
}
