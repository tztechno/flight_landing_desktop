/**
 * FlightInstruments.js
 * Renders a high-fidelity Primary Flight Display (PFD / HUD) on HTML5 Canvas.
 * Displays Attitude Director Indicator (ADI), Airspeed Tape, Altitude Tape,
 * Vertical Speed Indicator (VSI), Horizontal Situation Indicator (HSI),
 * ILS Localizer & Glide Slope diamond needles, PAPI indicators, and Flight Mode Annunciators (FMA).
 */

export class FlightInstruments {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.canvas.width = rect.width * (window.devicePixelRatio || 1);
      this.canvas.height = rect.height * (window.devicePixelRatio || 1);
      this.width = this.canvas.width;
      this.height = this.canvas.height;
    }
  }

  render(telemetry = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const pitch = telemetry.pitchDeg || 0;
    const bank = telemetry.bankDeg || 0;
    const airspeedKt = telemetry.airspeedKt || 140;
    const altFt = telemetry.altitudeFt || 1000;
    const vsFpm = telemetry.verticalSpeedFpm || 0;
    const heading = telemetry.headingDeg || 334;
    const ils = telemetry.ils || { loc: 0, gs: 0 };
    const papi = telemetry.papi || { p1: 'white', p2: 'white', p3: 'red', p4: 'red' };
    const fma = telemetry.fmaText || 'APPROACH 34L';

    const cx = w * 0.5;
    const cy = h * 0.45;
    const adiRadius = Math.min(w * 0.38, h * 0.38);

    // 1. Attitude Director Indicator (ADI) Sphere
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, adiRadius, 0, Math.PI * 2);
    ctx.clip();

    // Rotate for Bank Angle
    ctx.translate(cx, cy);
    ctx.rotate((-bank * Math.PI) / 180.0);

    // Sky & Ground
    const pixelsPerDegree = adiRadius / 25.0;
    const pitchOffset = pitch * pixelsPerDegree;

    // Sky
    ctx.fillStyle = '#1e5799';
    ctx.fillRect(-w, -h * 2 + pitchOffset, w * 2, h * 2);

    // Ground
    ctx.fillStyle = '#6b4c2a';
    ctx.fillRect(-w, pitchOffset, w * 2, h * 2);

    // Horizon Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w, pitchOffset);
    ctx.lineTo(w, pitchOffset);
    ctx.stroke();

    // Pitch Ladder
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let p = -30; p <= 30; p += 5) {
      if (p === 0) continue;
      const y = pitchOffset - p * pixelsPerDegree;
      const ladderW = Math.abs(p) % 10 === 0 ? 36 : 20;

      ctx.beginPath();
      ctx.moveTo(-ladderW, y);
      ctx.lineTo(ladderW, y);
      ctx.stroke();

      if (Math.abs(p) % 10 === 0) {
        ctx.fillText(`${Math.abs(p)}`, -ladderW - 12, y);
        ctx.fillText(`${Math.abs(p)}`, ladderW + 12, y);
      }
    }

    ctx.restore(); // Restore ADI clip

    // ADI Border
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, adiRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Fixed Aircraft Symbol (Yellow / Cyan Wing Cross)
    ctx.strokeStyle = '#00f0ff';
    ctx.fillStyle = '#00f0ff';
    ctx.lineWidth = 3;

    // Left Wing
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy);
    ctx.lineTo(cx - 15, cy);
    ctx.lineTo(cx - 15, cy + 6);
    ctx.stroke();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(cx + 15, cy + 6);
    ctx.lineTo(cx + 15, cy);
    ctx.lineTo(cx + 40, cy);
    ctx.stroke();

    // Center Pip
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // 2. ILS Localizer & Glide Slope Diamond Bars
    if (telemetry.showIls !== false) {
      // Localizer Needle (Horizontal movement)
      const locPx = cx - ils.loc * (adiRadius * 0.8);
      ctx.fillStyle = '#ff00ff'; // Magenta
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(locPx, cy + adiRadius - 10);
      ctx.lineTo(locPx - 5, cy + adiRadius - 3);
      ctx.lineTo(locPx + 5, cy + adiRadius - 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glide Slope Diamond (Vertical movement)
      const gsPx = cy - ils.gs * (adiRadius * 0.8);
      ctx.beginPath();
      ctx.moveTo(cx + adiRadius - 10, gsPx);
      ctx.lineTo(cx + adiRadius - 3, gsPx - 5);
      ctx.lineTo(cx + adiRadius + 4, gsPx);
      ctx.lineTo(cx + adiRadius - 3, gsPx + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 3. Airspeed Tape (Left)
    const tapeW = 44;
    const tapeH = adiRadius * 1.8;
    const tapeX = cx - adiRadius - tapeW - 6;
    const tapeY = cy - tapeH * 0.5;

    ctx.fillStyle = 'rgba(10, 18, 30, 0.75)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.fillRect(tapeX, tapeY, tapeW, tapeH);
    ctx.strokeRect(tapeX, tapeY, tapeW, tapeH);

    // Speed Ticks
    const speedPxPerKt = tapeH / 60.0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';

    for (let s = Math.floor(airspeedKt / 10) * 10 - 30; s <= airspeedKt + 30; s += 10) {
      if (s < 0) continue;
      const y = cy - (s - airspeedKt) * speedPxPerKt;
      if (y >= tapeY && y <= tapeY + tapeH) {
        ctx.beginPath();
        ctx.moveTo(tapeX + tapeW - 8, y);
        ctx.lineTo(tapeX + tapeW, y);
        ctx.stroke();
        ctx.fillText(`${s}`, tapeX + tapeW - 12, y + 3);
      }
    }

    // Current Airspeed Box
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(tapeX - 4, cy - 10, tapeW + 8, 20);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(airspeedKt)}`, tapeX + tapeW * 0.5, cy + 4);

    // 4. Altitude Tape (Right)
    const altTapeX = cx + adiRadius + 6;
    ctx.fillStyle = 'rgba(10, 18, 30, 0.75)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
    ctx.fillRect(altTapeX, tapeY, tapeW + 10, tapeH);
    ctx.strokeRect(altTapeX, tapeY, tapeW + 10, tapeH);

    // Alt Ticks (every 100ft)
    const altPxPer100Ft = tapeH / 10.0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';

    const baseAlt = Math.floor(altFt / 100) * 100;
    for (let a = baseAlt - 500; a <= baseAlt + 500; a += 100) {
      if (a < 0) continue;
      const y = cy - ((a - altFt) / 100.0) * altPxPer100Ft;
      if (y >= tapeY && y <= tapeY + tapeH) {
        ctx.beginPath();
        ctx.moveTo(altTapeX, y);
        ctx.lineTo(altTapeX + 8, y);
        ctx.stroke();
        ctx.fillText(`${a}`, altTapeX + 12, y + 3);
      }
    }

    // Current Alt Box
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(altTapeX - 2, cy - 10, tapeW + 14, 20);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(altFt)}`, altTapeX + (tapeW + 10) * 0.5, cy + 4);

    // 5. Vertical Speed Indicator (Far Right)
    const vsiX = altTapeX + tapeW + 18;
    const vsiH = tapeH * 0.8;
    const vsiY = cy - vsiH * 0.5;

    ctx.fillStyle = 'rgba(10, 18, 30, 0.6)';
    ctx.fillRect(vsiX, vsiY, 16, vsiH);
    ctx.strokeRect(vsiX, vsiY, 16, vsiH);

    // VSI Needle
    const clampedVs = Math.max(-2000, Math.min(2000, vsFpm));
    const vsiNeedleY = cy - (clampedVs / 2000.0) * (vsiH * 0.48);
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(vsiX, cy);
    ctx.lineTo(vsiX + 14, vsiNeedleY);
    ctx.stroke();

    // 6. Compass / Heading Rose (Bottom)
    const compassY = h - 22;
    ctx.fillStyle = 'rgba(10, 18, 30, 0.85)';
    ctx.fillRect(cx - 80, compassY - 14, 160, 24);
    ctx.strokeRect(cx - 80, compassY - 14, 160, 24);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    const hdgStr = `${Math.round(heading)}°`.padStart(4, '0');
    ctx.fillText(`HDG: ${hdgStr}`, cx, compassY + 3);

    // 7. PAPI Indicator Box (Top Right of ADI)
    const papiX = cx + adiRadius - 40;
    const papiY = cy - adiRadius - 18;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(papiX - 4, papiY - 4, 48, 16);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.strokeRect(papiX - 4, papiY - 4, 48, 16);

    const colors = [papi.p1, papi.p2, papi.p3, papi.p4];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colors[i] === 'red' ? '#ff2222' : '#ffffff';
      ctx.beginPath();
      ctx.arc(papiX + i * 11 + 4, papiY + 4, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. Flight Mode Annunciator (Top Header)
    const isCrash = !!telemetry.isCrash;
    ctx.fillStyle = isCrash ? '#ff2244' : '#00f0ff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isCrash ? '⚠️ CRASH / INCIDENT' : fma, cx, cy - adiRadius - 8);

    // 9. Central Crash / Incident Warning Banner on ADI
    if (isCrash) {
      const bannerW = adiRadius * 1.6;
      const bannerH = 26;
      ctx.fillStyle = 'rgba(230, 20, 50, 0.85)';
      ctx.fillRect(cx - bannerW * 0.5, cy - bannerH * 0.5, bannerW, bannerH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - bannerW * 0.5, cy - bannerH * 0.5, bannerW, bannerH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ CRASH / FLIGHT HALTED', cx, cy + 4);
    }

    ctx.restore();
  }
}
