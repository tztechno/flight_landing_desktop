/**
 * TelemetryUI.js
 * Bottom Dock telemetry display, timeline seeker with phase markers,
 * landing evaluation scorecard, and audio/speed controls.
 */

import { i18n } from '../i18n/translations.js';

export class TelemetryUI {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.isPlaying = true;
    this.playbackSpeed = 1.0;
    this.isMuted = false;
    this.isLooping = true;
    this.isDraggingSeek = false;

    this.render();
    i18n.subscribe(() => this.updateText());
  }

  render() {
    this.container.innerHTML = `
      <div class="telemetry-dock" id="telemetry-dock">
        <!-- Telemetry Data Grid -->
        <div class="telem-grid">
          <div class="telem-item">
            <span class="telem-lbl" id="lbl-alt">${i18n.t('altitude')}</span>
            <span class="telem-val" id="val-alt">0 <span class="unit">ft</span></span>
          </div>
          <div class="telem-item">
            <span class="telem-lbl" id="lbl-spd">${i18n.t('airspeed')}</span>
            <span class="telem-val" id="val-spd">0 <span class="unit">kt</span></span>
          </div>
          <div class="telem-item">
            <span class="telem-lbl" id="lbl-vs">${i18n.t('verticalSpeed')}</span>
            <span class="telem-val" id="val-vs">0 <span class="unit">fpm</span></span>
          </div>
          <div class="telem-item">
            <span class="telem-lbl" id="lbl-hdg">${i18n.t('heading')}</span>
            <span class="telem-val" id="val-hdg">334°</span>
          </div>
          <div class="telem-item">
            <span class="telem-lbl" id="lbl-bank">${i18n.t('bank')}</span>
            <span class="telem-val" id="val-bank">0.0°</span>
          </div>
          <div class="telem-item">
            <span class="telem-lbl" id="lbl-g">${i18n.t('gForce')}</span>
            <span class="telem-val" id="val-g">1.00 G</span>
          </div>
          <div class="telem-item telem-phase-box">
            <span class="telem-lbl">PHASE</span>
            <span class="telem-phase-badge" id="val-phase">${i18n.t('phase1')}</span>
          </div>
        </div>

        <!-- Timeline & Playback Bar -->
        <div class="timeline-row">
          <button class="dock-btn" id="btn-play-pause">⏸</button>
          
          <div class="seeker-container" id="seeker-container">
            <div class="seeker-track" id="seeker-track">
              <div class="seeker-fill" id="seeker-fill"></div>
              <div class="seeker-thumb" id="seeker-thumb"></div>
              <div class="phase-markers" id="phase-markers"></div>
            </div>
          </div>

          <span class="time-display" id="time-display">00:00 / 00:00</span>

          <div class="dock-actions">
            <button class="dock-btn" id="btn-speed" title="Playback Speed">1.0x</button>
            <button class="dock-btn ${this.isLooping ? 'active' : ''}" id="btn-loop" title="Loop">🔁</button>
            <button class="dock-btn" id="btn-audio" title="Mute Audio">🔊</button>
          </div>
        </div>
      </div>

      <!-- Landing Evaluation Modal / Scorecard -->
      <div class="landing-modal" id="landing-modal" style="display:none;">
        <div class="landing-card" id="landing-card">
          <h2 class="landing-score-title" id="landing-modal-title">${i18n.t('evalTitle')}</h2>
          
          <div class="score-badge" id="score-grade-badge">BUTTER SMOOTH</div>

          <!-- Crash / Incident Cause Box -->
          <div class="score-reason-box" id="score-reason-box" style="display:none;">
            <span class="score-reason-lbl" id="score-reason-lbl">${i18n.t('causeLabel')}</span>
            <span id="score-reason-text">CFIT</span>
          </div>

          <div class="score-details-grid">
            <div class="score-item">
              <span class="score-lbl" id="score-lbl-vs">${i18n.t('touchdownRate')}</span>
              <span class="score-val" id="score-val-vs">-120 fpm</span>
            </div>
            <div class="score-item">
              <span class="score-lbl" id="score-lbl-g">${i18n.t('touchdownG')}</span>
              <span class="score-val" id="score-val-g">1.12 G</span>
            </div>
            <div class="score-item">
              <span class="score-lbl" id="score-lbl-dev">${i18n.t('centerDev')}</span>
              <span class="score-val" id="score-val-dev">2.5 m</span>
            </div>
            <div class="score-item">
              <span class="score-lbl" id="score-lbl-spd">${i18n.t('airspeed')}</span>
              <span class="score-val" id="score-val-spd">132 kt</span>
            </div>
          </div>

          <!-- 1-Line Compact Action Buttons -->
          <div class="modal-btn-row">
            <button class="modal-action-btn btn-primary-action" id="btn-modal-replay">${i18n.t('btnReplay')}</button>
            <button class="modal-action-btn" id="btn-modal-retry">${i18n.t('btnRetry')}</button>
            <button class="modal-action-btn" id="btn-modal-close">${i18n.t('btnClose')}</button>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const playPauseBtn = document.getElementById('btn-play-pause');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        this.isPlaying = !this.isPlaying;
        playPauseBtn.textContent = this.isPlaying ? '⏸' : '▶';
        if (this.callbacks.onPlayPause) this.callbacks.onPlayPause(this.isPlaying);
      });
    }

    const speedBtn = document.getElementById('btn-speed');
    if (speedBtn) {
      const speeds = [0.5, 1.0, 2.0, 4.0];
      speedBtn.addEventListener('click', () => {
        const nextIdx = (speeds.indexOf(this.playbackSpeed) + 1) % speeds.length;
        this.playbackSpeed = speeds[nextIdx];
        speedBtn.textContent = `${this.playbackSpeed.toFixed(1)}x`;
        if (this.callbacks.onSpeedChange) this.callbacks.onSpeedChange(this.playbackSpeed);
      });
    }

    const loopBtn = document.getElementById('btn-loop');
    if (loopBtn) {
      loopBtn.addEventListener('click', () => {
        this.isLooping = !this.isLooping;
        loopBtn.classList.toggle('active', this.isLooping);
        if (this.callbacks.onLoopToggle) this.callbacks.onLoopToggle(this.isLooping);
      });
    }

    const audioBtn = document.getElementById('btn-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        this.isMuted = !this.isMuted;
        audioBtn.textContent = this.isMuted ? '🔇' : '🔊';
        if (this.callbacks.onAudioToggle) this.callbacks.onAudioToggle(this.isMuted);
      });
    }

    // Seeker Drag & Click
    const track = document.getElementById('seeker-track');
    if (track) {
      const handleSeek = (e) => {
        const rect = track.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (this.callbacks.onSeek) this.callbacks.onSeek(ratio);
      };

      track.addEventListener('mousedown', (e) => {
        this.isDraggingSeek = true;
        handleSeek(e);
      });

      window.addEventListener('mousemove', (e) => {
        if (this.isDraggingSeek) handleSeek(e);
      });

      window.addEventListener('mouseup', () => {
        this.isDraggingSeek = false;
      });
    }

    // Modal Action Buttons
    const replayBtn = document.getElementById('btn-modal-replay');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        this.hideLandingScore();
        if (this.callbacks.onReplay) this.callbacks.onReplay();
      });
    }

    const retryBtn = document.getElementById('btn-modal-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.hideLandingScore();
        if (this.callbacks.onReset) this.callbacks.onReset();
      });
    }

    const closeScoreBtn = document.getElementById('btn-modal-close');
    if (closeScoreBtn) {
      closeScoreBtn.addEventListener('click', () => {
        this.hideLandingScore();
        if (this.callbacks.onCloseScore) this.callbacks.onCloseScore();
      });
    }
  }

  setPhaseMarkers(trajectory) {
    const markersContainer = document.getElementById('phase-markers');
    if (!markersContainer || !trajectory) return;

    markersContainer.innerHTML = '';
    const total = trajectory.totalDuration || 1;
    const p1R = (trajectory.tPhase1 || 0) / total;
    const p2R = (trajectory.tPhase2 || 0) / total;
    const p3R = (trajectory.tPhase3 || 0) / total;

    [p1R, p2R, p3R].forEach((r) => {
      if (r > 0 && r < 1) {
        const dot = document.createElement('div');
        dot.className = 'phase-marker-dot';
        dot.style.left = `${r * 100}%`;
        markersContainer.appendChild(dot);
      }
    });
  }

  update(telemetry = {}) {
    // 1. Numbers
    const altFt = Math.round(telemetry.altitudeFt || 0);
    const spdKt = Math.round(telemetry.airspeedKt || 0);
    const vsFpm = Math.round(telemetry.verticalSpeedFpm || 0);
    const hdg = Math.round(telemetry.headingDeg || 334);
    const bank = (telemetry.bankDeg || 0).toFixed(1);
    const gVal = (telemetry.gForce || 1.0).toFixed(2);

    const elAlt = document.getElementById('val-alt');
    if (elAlt) elAlt.innerHTML = `${altFt} <span class="unit">ft</span>`;

    const elSpd = document.getElementById('val-spd');
    if (elSpd) elSpd.innerHTML = `${spdKt} <span class="unit">kt</span>`;

    const elVs = document.getElementById('val-vs');
    if (elVs) {
      const vsClass = vsFpm < -1500 ? 'text-warn' : '';
      elVs.innerHTML = `<span class="${vsClass}">${vsFpm}</span> <span class="unit">fpm</span>`;
    }

    const elHdg = document.getElementById('val-hdg');
    if (elHdg) elHdg.textContent = `${hdg}°`;

    const elBank = document.getElementById('val-bank');
    if (elBank) elBank.textContent = `${bank}°`;

    const elG = document.getElementById('val-g');
    if (elG) elG.textContent = `${gVal} G`;

    // Phase badge
    const elPhase = document.getElementById('val-phase');
    if (elPhase) {
      let phText = i18n.t(`phase${telemetry.phase || 1}`) || `Phase ${telemetry.phase}`;
      if (telemetry.phase === 'Free') phText = i18n.t('phaseFree');
      else if (telemetry.isManual) phText = i18n.t('phaseManual');
      elPhase.textContent = phText;
    }

    // Seeker bar
    const progress = Math.max(0, Math.min(1, telemetry.progress || 0));
    const fill = document.getElementById('seeker-fill');
    const thumb = document.getElementById('seeker-thumb');
    if (fill) fill.style.width = `${progress * 100}%`;
    if (thumb) thumb.style.left = `${progress * 100}%`;

    // Time display
    const curTime = telemetry.currentTime || 0;
    const totalTime = telemetry.totalTime || 1;
    const formatTime = (s) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };
    const timeDisp = document.getElementById('time-display');
    if (timeDisp) timeDisp.textContent = `${formatTime(curTime)} / ${formatTime(totalTime)}`;
  }

  showLandingScore(report) {
    if (!report) return;
    this.currentReport = report;

    const modal = document.getElementById('landing-modal');
    const card = document.getElementById('landing-card');
    const modalTitle = document.getElementById('landing-modal-title');
    const badge = document.getElementById('score-grade-badge');
    const vs = document.getElementById('score-val-vs');
    const g = document.getElementById('score-val-g');
    const dev = document.getElementById('score-val-dev');
    const spd = document.getElementById('score-val-spd');
    const reasonBox = document.getElementById('score-reason-box');
    const reasonText = document.getElementById('score-reason-text');
    const crashOverlay = document.getElementById('crash-overlay');

    const isCrash = report.score === 'crash';

    if (crashOverlay) {
      crashOverlay.style.display = isCrash ? 'block' : 'none';
    }

    if (card) {
      card.classList.toggle('card-crash', isCrash);
    }

    if (modalTitle) {
      modalTitle.textContent = isCrash ? i18n.t('crashTitle') : i18n.t('evalTitle');
    }

    if (badge) {
      if (report.score === 'butter') {
        badge.textContent = i18n.t('gradeButter');
        badge.className = 'score-badge score-butter';
      } else if (report.score === 'good') {
        badge.textContent = i18n.t('gradeGood');
        badge.className = 'score-badge score-good';
      } else if (report.score === 'hard') {
        badge.textContent = i18n.t('gradeHard');
        badge.className = 'score-badge score-hard';
      } else {
        badge.textContent = i18n.t('gradeCrash');
        badge.className = 'score-badge score-crash';
      }
    }

    if (reasonBox && reasonText) {
      if (isCrash && report.crashReasonKey) {
        reasonBox.style.display = 'flex';
        reasonText.textContent = i18n.t(report.crashReasonKey) || report.crashReasonKey;
      } else {
        reasonBox.style.display = 'none';
      }
    }

    if (vs) vs.textContent = `-${report.verticalSpeedFpm} fpm`;
    if (g) g.textContent = `${report.gForce} G`;
    if (dev) dev.textContent = `${report.centerlineDevM} m`;
    if (spd) spd.textContent = `${report.speedKt} kt`;

    if (modal) modal.style.display = 'flex';
  }

  hideLandingScore() {
    const modal = document.getElementById('landing-modal');
    if (modal) modal.style.display = 'none';
    const crashOverlay = document.getElementById('crash-overlay');
    if (crashOverlay) crashOverlay.style.display = 'none';
  }

  updateText() {
    const lblAlt = document.getElementById('lbl-alt');
    if (lblAlt) lblAlt.textContent = i18n.t('altitude');
    const lblSpd = document.getElementById('lbl-spd');
    if (lblSpd) lblSpd.textContent = i18n.t('airspeed');
    const lblVs = document.getElementById('lbl-vs');
    if (lblVs) lblVs.textContent = i18n.t('verticalSpeed');
    const lblHdg = document.getElementById('lbl-hdg');
    if (lblHdg) lblHdg.textContent = i18n.t('heading');
    const lblBank = document.getElementById('lbl-bank');
    if (lblBank) lblBank.textContent = i18n.t('bank');
    const lblG = document.getElementById('lbl-g');
    if (lblG) lblG.textContent = i18n.t('gForce');
    
    const reasonLbl = document.getElementById('score-reason-lbl');
    if (reasonLbl) reasonLbl.textContent = i18n.t('causeLabel');

    const btnReplay = document.getElementById('btn-modal-replay');
    if (btnReplay) btnReplay.textContent = i18n.t('btnReplay');
    const btnRetry = document.getElementById('btn-modal-retry');
    if (btnRetry) btnRetry.textContent = i18n.t('btnRetry');
    const btnClose = document.getElementById('btn-modal-close');
    if (btnClose) btnClose.textContent = i18n.t('btnClose');

    if (this.currentReport) {
      this.showLandingScore(this.currentReport);
    }
  }
}
