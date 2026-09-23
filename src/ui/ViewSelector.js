/**
 * ViewSelector.js
 * Header-integrated compact camera view switcher toolbar.
 * Strictly adheres to summary-only short keyword rule.
 */

import { i18n } from '../i18n/translations.js';

export class ViewSelector {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.currentView = 'chase';
    this.render();

    i18n.subscribe(() => this.updateText());
  }

  render() {
    this.container.innerHTML = `
      <div class="view-btn-group" id="view-btn-group">
        <button class="view-btn active" data-view="chase" id="view-btn-chase">1:${i18n.t('viewChase')}</button>
        <button class="view-btn" data-view="cockpit" id="view-btn-cockpit">2:${i18n.t('viewCockpit')}</button>
        <button class="view-btn" data-view="wing" id="view-btn-wing">3:${i18n.t('viewWing')}</button>
        <button class="view-btn" data-view="tower" id="view-btn-tower">4:${i18n.t('viewTower')}</button>
        <button class="view-btn" data-view="papi" id="view-btn-papi">5:${i18n.t('viewPapi')}</button>
        <button class="view-btn" data-view="orbit" id="view-btn-orbit">6:${i18n.t('viewOrbit')}</button>
      </div>
    `;

    const buttons = this.container.querySelectorAll('.view-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentView = btn.dataset.view;
        if (this.callbacks.onViewChange) {
          this.callbacks.onViewChange(this.currentView);
        }
      });
    });
  }

  setActive(viewId) {
    this.currentView = viewId;
    const buttons = this.container.querySelectorAll('.view-btn');
    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });
  }

  updateText() {
    const chaseBtn = document.getElementById('view-btn-chase');
    const cockpitBtn = document.getElementById('view-btn-cockpit');
    const wingBtn = document.getElementById('view-btn-wing');
    const towerBtn = document.getElementById('view-btn-tower');
    const papiBtn = document.getElementById('view-btn-papi');
    const orbitBtn = document.getElementById('view-btn-orbit');

    if (chaseBtn) chaseBtn.textContent = `1:${i18n.t('viewChase')}`;
    if (cockpitBtn) cockpitBtn.textContent = `2:${i18n.t('viewCockpit')}`;
    if (wingBtn) wingBtn.textContent = `3:${i18n.t('viewWing')}`;
    if (towerBtn) towerBtn.textContent = `4:${i18n.t('viewTower')}`;
    if (papiBtn) papiBtn.textContent = `5:${i18n.t('viewPapi')}`;
    if (orbitBtn) orbitBtn.textContent = `6:${i18n.t('viewOrbit')}`;
  }
}
