/**
 * main.js
 * Main entry point and orchestrator for Tokyo Haneda (RJTT) Landing Flight Simulator.
 * Integrates 3D Scene, Auto Trajectories, 6-DOF Manual Flight, Primary Flight Display (PFD),
 * Web Audio Synthesizer, and Telemetry & Control UI.
 */

import * as THREE from 'three';
import { FlightTrajectory } from './sim/FlightTrajectory.js';
import { FreeFlightSim } from './sim/FreeFlightSim.js';
import { FlightAudio } from './sim/FlightAudio.js';
import { FlightInstruments } from './sim/FlightInstruments.js';
import { AirportScene } from './scene/AirportScene.js';
import { CameraController } from './scene/CameraController.js';
import { ControlPanel } from './ui/ControlPanel.js';
import { TelemetryUI } from './ui/TelemetryUI.js';
import { ViewSelector } from './ui/ViewSelector.js';
import { i18n } from './i18n/translations.js';

class HanedaLandingApp {
  constructor() {
    this.container = document.getElementById('viewport-container');
    this.pfdCanvas = document.getElementById('pfd-canvas');
    this.langToggleBtn = document.getElementById('lang-toggle-btn');

    // Simulation State
    this.flightMode = 'auto'; // 'auto' (Trajectory playback) or 'manual' (6-DOF manual landing)
    this.manualPreset = 'rwy34l_short';
    this.currentTime = 0;
    this.isPlaying = true;
    this.playbackSpeed = 1.0;
    this.isLooping = true;
    this.keysDown = {};

    this.initSimulation();
    this.initScene();
    this.initUI();
    this.initAudio();

    if (this.langToggleBtn) {
      this.langToggleBtn.addEventListener('click', () => {
        i18n.toggleLang();
        this.updateAppLanguage();
      });
    }

    this.updateAppLanguage();

    this.lastTimestamp = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  initSimulation() {
    this.trajectory = new FlightTrajectory({ route: 'rwy34l' });
    this.freeFlightSim = new FreeFlightSim();
  }

  initScene() {
    this.airportScene = new AirportScene(this.container);
    this.cameraController = new CameraController(this.container);

    // Build 3D Trajectory ribbon line
    this.airportScene.updateTrajectoryVisuals(this.trajectory);
  }

  initUI() {
    // 1. Primary Flight Display Canvas HUD
    this.pfd = new FlightInstruments(this.pfdCanvas);
    this.pfd.resize();

    // 2. Camera View Selector Toolbar
    const viewContainer = document.getElementById('view-selector-container');
    this.viewSelector = new ViewSelector(viewContainer, {
      onViewChange: (viewId) => {
        this.cameraController.setMode(viewId);
      },
    });

    // 3. Right Control Panel
    const controlContainer = document.getElementById('control-panel-container');
    this.controlPanel = new ControlPanel(controlContainer, {
      onParamsChange: (newParams) => {
        this.trajectory.setParameters(newParams);
        this.airportScene.updateTrajectoryVisuals(this.trajectory);
        this.telemetryUI.setPhaseMarkers(this.trajectory);
        this.resetFlight();
      },
      onManualPresetChange: (preset) => {
        this.manualPreset = preset;
        this.freeFlightSim.reset(preset);
        this.airportScene.buildGuidanceHighway(this.freeFlightSim.getGuidanceGates(preset));
        this.resetFlight();
      },
      onEnvChange: (envMode) => {
        this.airportScene.setEnvironmentMode(envMode);
      },
      onModeChange: (mode) => {
        this.setFlightMode(mode);
      },
      onManualInputChange: (inputs) => {
        if (inputs.throttle !== undefined) this.freeFlightSim.setThrottle(inputs.throttle * 100);
        if (inputs.toggleGear) this.freeFlightSim.toggleGear();
        if (inputs.cycleFlaps) this.freeFlightSim.cycleFlaps();
        if (inputs.toggleBrakes) this.freeFlightSim.toggleBrakes();
        if (inputs.toggleReverse) this.freeFlightSim.toggleReverse();
      },
      onReset: () => {
        this.resetFlight();
      },
    });

    // 4. Bottom Telemetry & Timeline Dock
    const telemetryContainer = document.getElementById('telemetry-container');
    this.telemetryUI = new TelemetryUI(telemetryContainer, {
      onPlayPause: (playing) => {
        this.isPlaying = playing;
      },
      onSpeedChange: (speed) => {
        this.playbackSpeed = speed;
      },
      onLoopToggle: (looping) => {
        this.isLooping = looping;
      },
      onAudioToggle: () => {
        this.audio.toggleMute();
      },
      onSeek: (progressRatio) => {
        if (this.flightMode === 'auto') {
          this.currentTime = progressRatio * (this.trajectory.totalDuration || 1);
        }
      },
      onReplay: () => {
        this.currentTime = 0;
        this.isPlaying = true;
        this.crashSoundPlayed = false;
        this.scoreShown = false;
        const playBtn = document.getElementById('btn-play-pause');
        if (playBtn) playBtn.textContent = '⏸';
      },
      onReset: () => {
        this.resetFlight();
      },
      onCloseScore: () => {
        // Keep stopped at the end or current position
      },
    });

    this.telemetryUI.setPhaseMarkers(this.trajectory);
  }

  initAudio() {
    this.audio = new FlightAudio();
    // Start audio context on first user interaction
    const initAudioHandler = () => {
      this.audio.init();
      window.removeEventListener('click', initAudioHandler);
      window.removeEventListener('keydown', initAudioHandler);
    };
    window.addEventListener('click', initAudioHandler);
    window.addEventListener('keydown', initAudioHandler);
  }

  setFlightMode(mode) {
    this.flightMode = mode;
    if (mode === 'manual') {
      this.airportScene.buildGuidanceHighway(this.freeFlightSim.getGuidanceGates(this.manualPreset));
    } else {
      this.airportScene.buildGuidanceHighway(null);
      this.airportScene.updateTrajectoryVisuals(this.trajectory);
    }
    this.resetFlight();
  }

  resetFlight() {
    this.currentTime = 0;
    this.isPlaying = true;
    this.crashSoundPlayed = false;
    this.scoreShown = false;

    if (this.flightMode === 'manual') {
      this.freeFlightSim.reset(this.manualPreset);
      this.airportScene.buildGuidanceHighway(this.freeFlightSim.getGuidanceGates(this.manualPreset));
    }
    
    if (this.telemetryUI) {
      this.telemetryUI.hideLandingScore();
    }
    const playBtn = document.getElementById('btn-play-pause');
    if (playBtn) playBtn.textContent = '⏸';
  }

  onKeyDown(e) {
    this.keysDown[e.code] = true;

    // Camera shortcuts (1-6)
    if (e.key === '1') this.setCameraView('chase');
    else if (e.key === '2') this.setCameraView('cockpit');
    else if (e.key === '3') this.setCameraView('wing');
    else if (e.key === '4') this.setCameraView('tower');
    else if (e.key === '5') this.setCameraView('papi');
    else if (e.key === '6') this.setCameraView('orbit');

    // Space: Pause/Play in Auto mode, Spoilers in Manual mode
    if (e.code === 'Space') {
      if (this.flightMode === 'auto') {
        this.isPlaying = !this.isPlaying;
        const btn = document.getElementById('btn-play-pause');
        if (btn) btn.textContent = this.isPlaying ? '⏸' : '▶';
      } else {
        this.freeFlightSim.toggleSpoilers();
      }
    }

    // Manual Flight Hotkeys
    if (this.flightMode === 'manual') {
      if (e.code === 'KeyG') this.freeFlightSim.toggleGear();
      if (e.code === 'KeyF') this.freeFlightSim.cycleFlaps();
      if (e.code === 'KeyB') this.freeFlightSim.toggleBrakes();
      if (e.code === 'KeyX') this.freeFlightSim.toggleReverse();
    }
  }

  onKeyUp(e) {
    this.keysDown[e.code] = false;
  }

  setCameraView(viewId) {
    this.cameraController.setMode(viewId);
    this.viewSelector.setActive(viewId);
  }

  updateAppLanguage() {
    const rwyTag = document.getElementById('header-runway-tag');
    if (rwyTag) rwyTag.textContent = i18n.t('runwayTag');

    const brandTitle = document.getElementById('header-title');
    if (brandTitle) brandTitle.textContent = i18n.t('airportTitle');
  }

  onWindowResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.airportScene.resize(w, h);
    this.cameraController.resize(w, h);
    this.pfd.resize();
  }

  animate(now) {
    requestAnimationFrame(this.animate);

    const dt = Math.min(0.1, (now - this.lastTimestamp) * 0.001);
    this.lastTimestamp = now;

    let telemetryData = {};

    if (this.flightMode === 'auto') {
      // Auto Route Trajectory Playback
      if (this.isPlaying) {
        this.currentTime += dt * this.playbackSpeed;
        if (this.currentTime >= this.trajectory.totalDuration) {
          // Reached end of trajectory
          this.currentTime = this.trajectory.totalDuration;
          this.isPlaying = false; // Auto-pause to prevent abrupt screen reset
          const playBtn = document.getElementById('btn-play-pause');
          if (playBtn) playBtn.textContent = '▶';

          // Show landing evaluation or crash incident report
          const report = this.trajectory.getLandingReport();
          if (report && !this.scoreShown) {
            this.scoreShown = true;
            this.telemetryUI.showLandingScore(report);
            if (report.score === 'crash' && !this.crashSoundPlayed) {
              this.crashSoundPlayed = true;
              this.audio.playCrashSound();
            }
          }
        }
      }

      const frame = this.trajectory.getFrameAtTime(this.currentTime);
      if (frame) {
        // Trigger Crash sound on entering crash phase (Phase 7 or failure)
        if (frame.isCrash && !this.crashSoundPlayed) {
          this.crashSoundPlayed = true;
          this.audio.playCrashSound();
        }

        // Position Aircraft
        this.airportScene.aircraft.mesh.position.copy(frame.position);
        this.airportScene.aircraft.mesh.quaternion.copy(frame.quaternion);

        // Animate Control Surfaces & Lights
        this.airportScene.aircraft.updateAnimation({
          gear: frame.gear,
          flaps: frame.flaps,
          spoilers: frame.spoilers,
        });

        // Trigger Touchdown Smoke
        if (frame.phase === 4 && this.currentTime < this.trajectory.tPhase3 + 0.3) {
          this.airportScene.aircraft.triggerTouchdownSmoke();
          this.audio.playTouchdown();
        }

        // Camera Update
        this.cameraController.update(frame.position, frame.quaternion, frame.forward);

        // Telemetry
        const altFt = frame.position.y * 3.28084;
        const spdKt = frame.airspeed * 1.94384;
        const vsFpm = frame.verticalSpeed * 196.85;

        telemetryData = {
          altitudeFt: altFt,
          airspeedKt: spdKt,
          verticalSpeedFpm: vsFpm,
          headingDeg: frame.headingDeg,
          pitchDeg: frame.pitchDeg,
          bankDeg: frame.bankDeg,
          gForce: frame.gForce,
          phase: frame.phase,
          progress: frame.progress,
          currentTime: this.currentTime,
          totalTime: this.trajectory.totalDuration,
          isManual: false,
          isCrash: frame.isCrash,
          papi: { p1: 'white', p2: 'white', p3: 'red', p4: 'red' },
          ils: { loc: 0.0, gs: 0.0 },
          fmaText: frame.phase === 7 ? 'CRASH STOP' : (frame.phase === 4 ? 'ROLLOUT' : (frame.phase === 5 ? 'TOGA CLB' : 'ILS 34L APP')),
        };
      }

    } else {
      // 6-DOF Manual Flight Mode
      // Gather keyboard inputs
      let elev = 0, ail = 0, rud = 0;
      if (this.keysDown['KeyW'] || this.keysDown['ArrowUp']) elev += 1.0;
      if (this.keysDown['KeyS'] || this.keysDown['ArrowDown']) elev -= 1.0;
      if (this.keysDown['KeyA'] || this.keysDown['ArrowLeft']) ail -= 1.0;
      if (this.keysDown['KeyD'] || this.keysDown['ArrowRight']) ail += 1.0;
      if (this.keysDown['KeyQ']) rud -= 1.0;
      if (this.keysDown['KeyE']) rud += 1.0;
      if (this.keysDown['KeyR']) this.freeFlightSim.setThrottle(this.freeFlightSim.throttle * 100 + 15 * dt);
      if (this.keysDown['KeyF']) this.freeFlightSim.setThrottle(this.freeFlightSim.throttle * 100 - 15 * dt);

      // Terrain elevation lookup
      const terrainY = this.airportScene.terrain.getElevationAt(
        this.freeFlightSim.position.x,
        this.freeFlightSim.position.z
      );

      this.freeFlightSim.update(dt, {
        elevator: elev,
        aileron: ail,
        rudder: rud,
      }, terrainY);

      // Position aircraft in 3D scene
      this.airportScene.aircraft.mesh.position.copy(this.freeFlightSim.position);

      const hdgRad = (this.freeFlightSim.heading * Math.PI) / 180.0;
      const pitchRad = (this.freeFlightSim.pitch * Math.PI) / 180.0;
      const bankRad = (this.freeFlightSim.bank * Math.PI) / 180.0;

      const fwd = new THREE.Vector3(
        Math.sin(hdgRad) * Math.cos(pitchRad),
        Math.sin(pitchRad),
        -Math.cos(hdgRad) * Math.cos(pitchRad)
      ).normalize();

      const r0 = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
      if (r0.lengthSq() < 1e-4) r0.set(1, 0, 0);
      else r0.normalize();

      const u0 = new THREE.Vector3().crossVectors(r0, fwd).normalize();
      const rBanked = new THREE.Vector3().copy(r0).multiplyScalar(Math.cos(bankRad)).addScaledVector(u0, Math.sin(bankRad));
      const uBanked = new THREE.Vector3().copy(r0).multiplyScalar(-Math.sin(bankRad)).addScaledVector(u0, Math.cos(bankRad));
      const dBack = new THREE.Vector3().copy(fwd).negate();

      const rotMatrix = new THREE.Matrix4().makeBasis(rBanked, uBanked, dBack);
      const quat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);
      this.airportScene.aircraft.mesh.quaternion.copy(quat);

      this.airportScene.aircraft.updateAnimation({
        gear: this.freeFlightSim.gear,
        flaps: this.freeFlightSim.flapsLevel,
        spoilers: this.freeFlightSim.spoilers,
      });

      this.cameraController.update(this.freeFlightSim.position, quat, fwd);

      // Check Guidance Highway gate passing
      const justPassed = this.airportScene.updateGuidanceHighway(this.freeFlightSim.position, fwd);
      if (justPassed) {
        this.audio.playGatePassChime();
      }

      // PAPI & ILS guidance
      const papiStatus = this.freeFlightSim.getPapiStatus('34L');
      const ilsStatus = this.freeFlightSim.getIlsDeviation();

      if (this.freeFlightSim.touchdownRecorded && this.freeFlightSim.landingReport) {
        if (!this.scoreShown) {
          this.scoreShown = true;
          this.telemetryUI.showLandingScore(this.freeFlightSim.landingReport);
          if (this.freeFlightSim.landingReport.score === 'crash' && !this.crashSoundPlayed) {
            this.crashSoundPlayed = true;
            this.audio.playCrashSound();
          }
        }
      }

      const isFree = this.manualPreset === 'free_flight';
      telemetryData = {
        altitudeFt: this.freeFlightSim.position.y * 3.28084,
        airspeedKt: this.freeFlightSim.speed * 1.94384,
        verticalSpeedFpm: this.freeFlightSim.verticalSpeed * 196.85,
        headingDeg: this.freeFlightSim.heading,
        pitchDeg: this.freeFlightSim.pitch,
        bankDeg: this.freeFlightSim.bank,
        gForce: this.freeFlightSim.gForce,
        phase: isFree ? 'Free' : 'Manual',
        progress: 1.0,
        currentTime: this.freeFlightSim.elapsedTime,
        totalTime: 0,
        isManual: true,
        isCrash: !!this.freeFlightSim.isCrashed,
        papi: papiStatus,
        ils: ilsStatus,
        fmaText: this.freeFlightSim.isCrashed ? 'CRASH STOP' : (isFree ? 'FREE CRUISE' : (this.freeFlightSim.isGrounded ? 'ROLLOUT' : 'MANUAL APP')),
        throttle: this.freeFlightSim.actualThrustRatio,
      };
    }

    // Update PFD Canvas HUD
    this.pfd.render(telemetryData);

    // Update Telemetry Dock
    this.telemetryUI.update(telemetryData);

    // Update Web Audio engine
    this.audio.update(telemetryData);

    // Render 3D Scene
    this.airportScene.render(this.cameraController.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new HanedaLandingApp();
});
