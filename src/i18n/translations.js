/**
 * translations.js
 * Comprehensive bilingual (Japanese / English) localization dictionary for Haneda Landing Simulator.
 */

export const translations = {
  ja: {
    // Header
    airportTitle: '羽田空港 (RJTT / HND)',
    runwayTag: 'Runway 34L / 34R / 16L 着陸アプローチ',

    // Camera Views (Short keywords only per rules)
    viewChase: '後方追従',
    viewCockpit: 'コックピット',
    viewWing: '主翼ビュー',
    viewTower: '管制塔',
    viewPapi: '滑走路端/PAPI',
    viewOrbit: '自由回転',

    // Mode Selector (Short keywords only per rules)
    modeAuto: '自動進入',
    modeManual: '手動操縦',

    // Routes / Presets (Short keywords only per rules)
    route34l: '34L 東京湾旋回',
    route34r: '34R ILS進入',
    route16l: '16L 都心進入',
    routeToga: 'TOGA (復行)',
    routeBounce: 'バウンド失敗',

    // Environment (Short keywords only per rules)
    envSunset: '夕景',
    envDay: '昼間',
    envNight: '夜間',

    // Telemetry Labels
    altitude: '高度',
    airspeed: '対気速度',
    groundSpeed: '対地速度',
    heading: '方位',
    bank: 'バンク角',
    gForce: 'Gフォース',
    verticalSpeed: '昇降率',
    glideSlopeDev: 'GS偏差',
    locDev: 'LOC偏差',
    distanceToRwy: '滑走路距離',

    // Phases
    phase1: '初期降下 (東京湾)',
    phase2: '東京湾 90°旋回',
    phase3: 'ファイナル進入 (3° GS)',
    phase4: '接地 & 減速滑走',
    phase5: 'ゴーアラウンド急上昇',
    phase6: 'バウンド急浮揚',
    phase7: '制動限界 & 逸脱',
    phaseManual: '手動アプローチ中',
    phaseFree: '自由飛行中 (東京湾)',

    // Control Panel
    settingsTitle: 'フライト設定',
    routeSelection: '着陸ルート / シナリオ',
    manualRouteSelection: '飛行コース / 着陸滑走路',
    preset34l: '34L 直線',
    preset34r: '34R ILS',
    preset16l: '16L 都心',
    presetFree: '自由飛行',
    flightParams: '飛行力学パラメータ',
    approachSpeed: '進入速度 (kt)',
    glideAngle: '進入角 (°)',
    turnRadius: '旋回半径 (m)',
    environmentTitle: '環境 / 時間帯',
    resetFlight: '飛行リセット',

    // Manual Controls HUD
    manualControlsTitle: '手動操縦コントロール',
    throttle: 'スロットル',
    gear: '着陸脚 (ギア)',
    flaps: 'フラップ',
    brakes: 'ホイールブレーキ',
    spoilers: 'スピードブレーキ',
    reverseThrust: '逆噴射',
    gearDown: 'DOWN',
    gearUp: 'UP',
    brakesOn: 'ON',
    brakesOff: 'OFF',

    // Landing Evaluation
    evalTitle: '着陸評価レポート',
    touchdownRate: '接地降下率',
    touchdownG: '接地Gフォース',
    centerDev: '中心線ズレ',
    touchdownDist: '接地地点',
    overallScore: '総合評価',
    gradeButter: '極上の着陸 (バター)',
    gradeGood: '良好な着陸 (ナイス)',
    gradeHard: '硬い着陸 (ハード)',
    gradeCrash: '着陸失敗 (クラッシュ)',

    // Crash / Go-Around Alerts
    crashTitle: '⚠️ 着陸失敗 / 事故発生',
    crashSubtitle: '着陸事故レポート / 飛行停止',
    crashReasonTerrain: '水面・地形激突 (CFIT)',
    crashReasonStall: '低速失速による墜落',
    crashReasonOverrun: '滑走路オーバーラン',
    crashReasonBounce: 'バウンド破損 & 滑走路逸脱',
    crashReasonGear: 'ギア未展開 (胴体着陸)',
    crashReasonVsi: '過大降下率衝突 (ハードインパクト)',
    crashReasonBank: '翼端接地・横転 (過大バンク)',
    crashReasonExcursion: '滑走路逸脱・機体損壊',
    causeLabel: '事故原因',
    btnReplay: '🔄 リプレイ',
    btnRetry: '✈️ 再試行',
    btnClose: '✖ 閉じる',
    restartBtn: '再試行',

    // Units
    ft: 'ft',
    m: 'm',
    kt: 'kt',
    deg: '°',
    fpm: 'fpm',
  },
  en: {
    // Header
    airportTitle: 'Tokyo Haneda (RJTT / HND)',
    runwayTag: 'Runway 34L / 34R / 16L Landing Approach',

    // Camera Views (Short keywords only per rules)
    viewChase: 'Chase',
    viewCockpit: 'Cockpit',
    viewWing: 'Wing',
    viewTower: 'Tower',
    viewPapi: 'PAPI / Rwy',
    viewOrbit: 'Free Orbit',

    // Mode Selector (Short keywords only per rules)
    modeAuto: 'Auto Route',
    modeManual: 'Manual Flight',

    // Routes / Presets (Short keywords only per rules)
    route34l: '34L Tokyo Bay',
    route34r: '34R Straight ILS',
    route16l: '16L Tokyo City',
    routeToga: 'TOGA Go-Around',
    routeBounce: 'Bounce Failure',

    // Environment (Short keywords only per rules)
    envSunset: 'Sunset',
    envDay: 'Day',
    envNight: 'Night',

    // Telemetry Labels
    altitude: 'Altitude',
    airspeed: 'Airspeed',
    groundSpeed: 'Ground Speed',
    heading: 'Heading',
    bank: 'Bank Angle',
    gForce: 'G-Force',
    verticalSpeed: 'VSI',
    glideSlopeDev: 'GS Dev',
    locDev: 'LOC Dev',
    distanceToRwy: 'Rwy Dist',

    // Phases
    phase1: 'Initial Descent (Bay)',
    phase2: 'Tokyo Bay 90° Turn',
    phase3: 'Final Approach (3° GS)',
    phase4: 'Touchdown & Rollout',
    phase5: 'Go-Around Climb',
    phase6: 'Hard Bounce Arc',
    phase7: 'Runway Excursion',
    phaseManual: 'Manual Approach',
    phaseFree: 'Free Flight (Tokyo Bay)',

    // Control Panel
    settingsTitle: 'Flight Settings',
    routeSelection: 'Route / Scenario',
    manualRouteSelection: 'Flight Course / Runway',
    preset34l: '34L Final',
    preset34r: '34R ILS',
    preset16l: '16L City',
    presetFree: 'Free Flight',
    flightParams: 'Flight Dynamics',
    approachSpeed: 'Approach Speed (kt)',
    glideAngle: 'Glide Angle (°)',
    turnRadius: 'Turn Radius (m)',
    environmentTitle: 'Environment',
    resetFlight: 'Reset Flight',

    // Manual Controls HUD
    manualControlsTitle: 'Manual Controls',
    throttle: 'Throttle',
    gear: 'Landing Gear',
    flaps: 'Flaps',
    brakes: 'Brakes',
    spoilers: 'Speedbrakes',
    reverseThrust: 'Reversers',
    gearDown: 'DOWN',
    gearUp: 'UP',
    brakesOn: 'ON',
    brakesOff: 'OFF',

    // Landing Evaluation
    evalTitle: 'Landing Report',
    touchdownRate: 'Touchdown V/S',
    touchdownG: 'Touchdown G',
    centerDev: 'Centerline Dev',
    touchdownDist: 'TD Zone Dist',
    overallScore: 'Overall Grade',
    gradeButter: 'Butter Smooth Landing',
    gradeGood: 'Good Landing',
    gradeHard: 'Hard Landing',
    gradeCrash: 'Landing Crash',

    // Crash / Go-Around Alerts
    crashTitle: '⚠️ Landing Crash / Incident',
    crashSubtitle: 'Incident Diagnostic / Flight Halted',
    crashReasonTerrain: 'Water / Terrain Impact (CFIT)',
    crashReasonStall: 'Aerodynamic Stall Crash',
    crashReasonOverrun: 'Runway Overrun',
    crashReasonBounce: 'Bounce Damage & Excursion',
    crashReasonGear: 'Gear Up (Belly Landing)',
    crashReasonVsi: 'Excessive Sink Rate (Hard Impact)',
    crashReasonBank: 'Wing Strike / Rollover (Excessive Bank)',
    crashReasonExcursion: 'Runway Excursion & Damage',
    causeLabel: 'Probable Cause',
    btnReplay: '🔄 Replay',
    btnRetry: '✈️ Retry',
    btnClose: '✖ Close',
    restartBtn: 'Try Again',

    // Units
    ft: 'ft',
    m: 'm',
    kt: 'kt',
    deg: '°',
    fpm: 'fpm',
  }
};

class I18nManager {
  constructor() {
    this.currentLang = 'ja';
    this.listeners = [];
  }

  get lang() {
    return this.currentLang;
  }

  t(key) {
    return translations[this.currentLang][key] || translations['en'][key] || key;
  }

  toggleLang() {
    this.currentLang = this.currentLang === 'ja' ? 'en' : 'ja';
    this.notify();
    return this.currentLang;
  }

  setLang(lang) {
    if (translations[lang]) {
      this.currentLang = lang;
      this.notify();
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this.currentLang));
  }
}

export const i18n = new I18nManager();
