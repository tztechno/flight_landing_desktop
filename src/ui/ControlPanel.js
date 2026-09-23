/**
 * ControlPanel.js
 * Interactive Control Panel for route selection, flight dynamics tuning,
 * environment switching, and manual 6-DOF flight controls.
 * Strictly complies with strict option height and summary-only keyword rules.
 */

import { i18n } from '../i18n/translations.js';

export class ControlPanel {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.currentMode = 'auto'; // 'auto' or 'manual'
    this.currentRoute = 'rwy34l';
    this.currentEnv = 'sunset';

    this.params = {
      speed: 70.0, // m/s
      glideSlopeDeg: 3.0,
      rTurn: 1500.0,
    };

    this.manualState = {
      throttle: 45,
      gear: 1,
      flaps: 3,
      brakes: false,
      reversers: false,
      spoilers: 0,
    };

    this.render();
    i18n.subscribe(() => this.updateText());
  }

  render() {
    this.container.innerHTML = `
      <div class="ctrl-card" id="ctrl-panel-card">
        <!-- Panel Header -->
        <div class="ctrl-header">
          <span class="ctrl-title" id="ctrl-title">${i18n.t('settingsTitle')}</span>
          <div class="mode-toggle-group">
            <button class="mode-btn ${this.currentMode === 'auto' ? 'active' : ''}" data-mode="auto" id="btn-mode-auto">${i18n.t('modeAuto')}</button>
            <button class="mode-btn ${this.currentMode === 'manual' ? 'active' : ''}" data-mode="manual" id="btn-mode-manual">${i18n.t('modeManual')}</button>
          </div>
        </div>

        <!-- Section 1: Route Presets (Auto Mode) -->
        <div class="ctrl-section" id="section-routes" style="${this.currentMode === 'auto' ? '' : 'display:none;'}">
          <div class="section-label" id="lbl-route">${i18n.t('routeSelection')}</div>
          <div class="opt-btn-grid" id="route-btn-grid">
            <button class="opt-btn ${this.currentRoute === 'rwy34l' ? 'active' : ''}" data-route="rwy34l" id="btn-route-34l">${i18n.t('route34l')}</button>
            <button class="opt-btn ${this.currentRoute === 'rwy34r' ? 'active' : ''}" data-route="rwy34r" id="btn-route-34r">${i18n.t('route34r')}</button>
            <button class="opt-btn ${this.currentRoute === 'rwy16l' ? 'active' : ''}" data-route="rwy16l" id="btn-route-16l">${i18n.t('route16l')}</button>
            <button class="opt-btn ${this.currentRoute === 'toga' ? 'active' : ''}" data-route="toga" id="btn-route-toga">${i18n.t('routeToga')}</button>
            <button class="opt-btn ${this.currentRoute === 'bounce' ? 'active' : ''}" data-route="bounce" id="btn-route-bounce">${i18n.t('routeBounce')}</button>
          </div>
        </div>

        <!-- Section 2: Manual Flight Controls (Manual Mode) -->
        <div class="ctrl-section" id="section-manual" style="${this.currentMode === 'manual' ? '' : 'display:none;'}">
          <!-- Manual Route / Runway Selector -->
          <div class="section-label" id="lbl-manual-route">${i18n.t('manualRouteSelection')}</div>
          <div class="opt-btn-grid" id="manual-preset-grid">
            <button class="opt-btn ${this.currentManualPreset === 'rwy34l_short' ? 'active' : ''}" data-preset="rwy34l_short" id="btn-mpreset-34l">${i18n.t('preset34l')}</button>
            <button class="opt-btn ${this.currentManualPreset === 'rwy34r_final' ? 'active' : ''}" data-preset="rwy34r_final" id="btn-mpreset-34r">${i18n.t('preset34r')}</button>
            <button class="opt-btn ${this.currentManualPreset === 'rwy16l_final' ? 'active' : ''}" data-preset="rwy16l_final" id="btn-mpreset-16l">${i18n.t('preset16l')}</button>
            <button class="opt-btn ${this.currentManualPreset === 'free_flight' ? 'active' : ''}" data-preset="free_flight" id="btn-mpreset-free">${i18n.t('presetFree')}</button>
          </div>

          <div class="section-label" id="lbl-manual" style="margin-top:4px;">${i18n.t('manualControlsTitle')}</div>
          <div class="manual-throttle-wrap">
            <span class="param-name" id="lbl-throttle">${i18n.t('throttle')}</span>
            <input type="range" class="param-slider" id="slider-throttle" min="0" max="100" value="${this.manualState.throttle}">
            <span class="param-val" id="val-throttle">${this.manualState.throttle}%</span>
          </div>

          <div class="opt-btn-grid" id="manual-btn-grid">
            <button class="opt-btn ${this.manualState.gear ? 'active' : ''}" id="btn-gear">GEAR: ${this.manualState.gear ? i18n.t('gearDown') : i18n.t('gearUp')}</button>
            <button class="opt-btn" id="btn-flaps">FLAPS: ${this.manualState.flaps * 10}°</button>
            <button class="opt-btn ${this.manualState.brakes ? 'active' : ''}" id="btn-brakes">BRAKE: ${this.manualState.brakes ? i18n.t('brakesOn') : i18n.t('brakesOff')}</button>
            <button class="opt-btn ${this.manualState.reversers ? 'active' : ''}" id="btn-reverse">REV THRUST</button>
          </div>
        </div>

        <!-- Section 3: Sliders (Flight Dynamics) -->
        <div class="ctrl-section" id="section-sliders">
          <div class="section-label" id="lbl-dynamics">${i18n.t('flightParams')}</div>
          
          <div class="param-row">
            <span class="param-name" id="lbl-speed">${i18n.t('approachSpeed')}</span>
            <input type="range" class="param-slider" id="slider-speed" min="110" max="170" value="${Math.round(this.params.speed * 1.94384)}">
            <span class="param-val" id="val-speed">${Math.round(this.params.speed * 1.94384)} kt</span>
          </div>

          <div class="param-row">
            <span class="param-name" id="lbl-glide">${i18n.t('glideAngle')}</span>
            <input type="range" class="param-slider" id="slider-glide" min="2.5" max="4.0" step="0.1" value="${this.params.glideSlopeDeg}">
            <span class="param-val" id="val-glide">${this.params.glideSlopeDeg.toFixed(1)}°</span>
          </div>

          <div class="param-row">
            <span class="param-name" id="lbl-radius">${i18n.t('turnRadius')}</span>
            <input type="range" class="param-slider" id="slider-radius" min="1000" max="2500" step="100" value="${this.params.rTurn}">
            <span class="param-val" id="val-radius">${this.params.rTurn} m</span>
          </div>
        </div>

        <!-- Section 4: Environment Time Selector -->
        <div class="ctrl-section">
          <div class="section-label" id="lbl-env">${i18n.t('environmentTitle')}</div>
          <div class="opt-btn-grid">
            <button class="opt-btn ${this.currentEnv === 'sunset' ? 'active' : ''}" data-env="sunset" id="btn-env-sunset">${i18n.t('envSunset')}</button>
            <button class="opt-btn ${this.currentEnv === 'day' ? 'active' : ''}" data-env="day" id="btn-env-day">${i18n.t('envDay')}</button>
            <button class="opt-btn ${this.currentEnv === 'night' ? 'active' : ''}" data-env="night" id="btn-env-night">${i18n.t('envNight')}</button>
          </div>
        </div>

        <!-- Bottom Action: Reset Flight -->
        <button class="reset-btn" id="btn-reset-flight">${i18n.t('resetFlight')}</button>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    // Mode Buttons
    const modeBtns = this.container.querySelectorAll('.mode-btn');
    modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        modeBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMode = btn.dataset.mode;

        document.getElementById('section-routes').style.display = this.currentMode === 'auto' ? '' : 'none';
        document.getElementById('section-manual').style.display = this.currentMode === 'manual' ? '' : 'none';

        if (this.callbacks.onModeChange) {
          this.callbacks.onModeChange(this.currentMode);
        }
      });
    });

    // Auto Route Buttons
    const routeBtns = this.container.querySelectorAll('#route-btn-grid .opt-btn');
    routeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        routeBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentRoute = btn.dataset.route;

        if (this.callbacks.onParamsChange) {
          this.callbacks.onParamsChange({ ...this.params, route: this.currentRoute });
        }
      });
    });

    // Manual Flight Preset Buttons
    const manualPresetBtns = this.container.querySelectorAll('#manual-preset-grid .opt-btn');
    manualPresetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        manualPresetBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentManualPreset = btn.dataset.preset;

        if (this.callbacks.onManualPresetChange) {
          this.callbacks.onManualPresetChange(this.currentManualPreset);
        }
      });
    });

    // Environment Buttons
    const envBtns = this.container.querySelectorAll('[data-env]');
    envBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        envBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentEnv = btn.dataset.env;

        if (this.callbacks.onEnvChange) {
          this.callbacks.onEnvChange(this.currentEnv);
        }
      });
    });

    // Sliders
    const speedSlider = document.getElementById('slider-speed');
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        const kt = parseFloat(e.target.value);
        this.params.speed = kt / 1.94384;
        document.getElementById('val-speed').textContent = `${Math.round(kt)} kt`;
        this.triggerParamsChange();
      });
    }

    const glideSlider = document.getElementById('slider-glide');
    if (glideSlider) {
      glideSlider.addEventListener('input', (e) => {
        this.params.glideSlopeDeg = parseFloat(e.target.value);
        document.getElementById('val-glide').textContent = `${this.params.glideSlopeDeg.toFixed(1)}°`;
        this.triggerParamsChange();
      });
    }

    const radiusSlider = document.getElementById('slider-radius');
    if (radiusSlider) {
      radiusSlider.addEventListener('input', (e) => {
        this.params.rTurn = parseFloat(e.target.value);
        document.getElementById('val-radius').textContent = `${this.params.rTurn} m`;
        this.triggerParamsChange();
      });
    }

    // Manual Flight Inputs
    const throttleSlider = document.getElementById('slider-throttle');
    if (throttleSlider) {
      throttleSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        this.manualState.throttle = val;
        document.getElementById('val-throttle').textContent = `${val}%`;
        if (this.callbacks.onManualInputChange) {
          this.callbacks.onManualInputChange({ throttle: val / 100.0 });
        }
      });
    }

    const gearBtn = document.getElementById('btn-gear');
    if (gearBtn) {
      gearBtn.addEventListener('click', () => {
        this.manualState.gear = this.manualState.gear ? 0 : 1;
        gearBtn.classList.toggle('active', !!this.manualState.gear);
        gearBtn.textContent = `GEAR: ${this.manualState.gear ? i18n.t('gearDown') : i18n.t('gearUp')}`;
        if (this.callbacks.onManualInputChange) {
          this.callbacks.onManualInputChange({ toggleGear: true });
        }
      });
    }

    const flapsBtn = document.getElementById('btn-flaps');
    if (flapsBtn) {
      flapsBtn.addEventListener('click', () => {
        this.manualState.flaps = (this.manualState.flaps + 1) % 4;
        flapsBtn.textContent = `FLAPS: ${this.manualState.flaps * 10}°`;
        if (this.callbacks.onManualInputChange) {
          this.callbacks.onManualInputChange({ cycleFlaps: true });
        }
      });
    }

    const brakesBtn = document.getElementById('btn-brakes');
    if (brakesBtn) {
      brakesBtn.addEventListener('click', () => {
        this.manualState.brakes = !this.manualState.brakes;
        brakesBtn.classList.toggle('active', this.manualState.brakes);
        brakesBtn.textContent = `BRAKE: ${this.manualState.brakes ? i18n.t('brakesOn') : i18n.t('brakesOff')}`;
        if (this.callbacks.onManualInputChange) {
          this.callbacks.onManualInputChange({ toggleBrakes: true });
        }
      });
    }

    const revBtn = document.getElementById('btn-reverse');
    if (revBtn) {
      revBtn.addEventListener('click', () => {
        this.manualState.reversers = !this.manualState.reversers;
        revBtn.classList.toggle('active', this.manualState.reversers);
        if (this.callbacks.onManualInputChange) {
          this.callbacks.onManualInputChange({ toggleReverse: true });
        }
      });
    }

    // Reset Button
    const resetBtn = document.getElementById('btn-reset-flight');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (this.callbacks.onReset) this.callbacks.onReset();
      });
    }
  }

  triggerParamsChange() {
    if (this.callbacks.onParamsChange) {
      this.callbacks.onParamsChange({ ...this.params, route: this.currentRoute });
    }
  }

  updateText() {
    const title = document.getElementById('ctrl-title');
    if (title) title.textContent = i18n.t('settingsTitle');

    const btnAuto = document.getElementById('btn-mode-auto');
    if (btnAuto) btnAuto.textContent = i18n.t('modeAuto');

    const btnManual = document.getElementById('btn-mode-manual');
    if (btnManual) btnManual.textContent = i18n.t('modeManual');

    const lblRoute = document.getElementById('lbl-route');
    if (lblRoute) lblRoute.textContent = i18n.t('routeSelection');

    const b34l = document.getElementById('btn-route-34l');
    if (b34l) b34l.textContent = i18n.t('route34l');

    const b34r = document.getElementById('btn-route-34r');
    if (b34r) b34r.textContent = i18n.t('route34r');

    const b16l = document.getElementById('btn-route-16l');
    if (b16l) b16l.textContent = i18n.t('route16l');

    const btoga = document.getElementById('btn-route-toga');
    if (btoga) btoga.textContent = i18n.t('routeToga');

    const bbounce = document.getElementById('btn-route-bounce');
    if (bbounce) bbounce.textContent = i18n.t('routeBounce');

    const lblManualRoute = document.getElementById('lbl-manual-route');
    if (lblManualRoute) lblManualRoute.textContent = i18n.t('manualRouteSelection');

    const bmp34l = document.getElementById('btn-mpreset-34l');
    if (bmp34l) bmp34l.textContent = i18n.t('preset34l');

    const bmp34r = document.getElementById('btn-mpreset-34r');
    if (bmp34r) bmp34r.textContent = i18n.t('preset34r');

    const bmp16l = document.getElementById('btn-mpreset-16l');
    if (bmp16l) bmp16l.textContent = i18n.t('preset16l');

    const bmpFree = document.getElementById('btn-mpreset-free');
    if (bmpFree) bmpFree.textContent = i18n.t('presetFree');

    const lblDynamics = document.getElementById('lbl-dynamics');
    if (lblDynamics) lblDynamics.textContent = i18n.t('flightParams');

    const lblSpeed = document.getElementById('lbl-speed');
    if (lblSpeed) lblSpeed.textContent = i18n.t('approachSpeed');

    const lblGlide = document.getElementById('lbl-glide');
    if (lblGlide) lblGlide.textContent = i18n.t('glideAngle');

    const lblRadius = document.getElementById('lbl-radius');
    if (lblRadius) lblRadius.textContent = i18n.t('turnRadius');

    const lblEnv = document.getElementById('lbl-env');
    if (lblEnv) lblEnv.textContent = i18n.t('environmentTitle');

    const btnSunset = document.getElementById('btn-env-sunset');
    if (btnSunset) btnSunset.textContent = i18n.t('envSunset');

    const btnDay = document.getElementById('btn-env-day');
    if (btnDay) btnDay.textContent = i18n.t('envDay');

    const btnNight = document.getElementById('btn-env-night');
    if (btnNight) btnNight.textContent = i18n.t('envNight');

    const resetBtn = document.getElementById('btn-reset-flight');
    if (resetBtn) resetBtn.textContent = i18n.t('resetFlight');
  }
}
