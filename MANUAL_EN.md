# Tokyo Haneda (RJTT) Flight Landing Simulator Desktop App — User Manual

[日本語取扱説明書はこちら (Japanese User Manual)](./MANUAL_JA.md)

---

## Table of Contents
1. [Overview & Desktop App Features](#1-overview--desktop-app-features)
2. [Installation & Launch (macOS & Windows)](#2-installation--launch-macos--windows)
3. [User Interface & Layout](#3-user-interface--layout)
4. [Controls & Keyboard Shortcuts](#4-controls--keyboard-shortcuts)
5. [Landing Routes & Scenarios](#5-landing-routes--scenarios)
6. [Camera Perspectives (6 Modes)](#6-camera-perspectives-6-modes)
7. [Primary Flight Display (PFD / HUD) & PAPI Guide](#7-primary-flight-display-pfd--hud--papi-guide)
8. [Manual Flight (6-DOF) & Landing Scoring System](#8-manual-flight-6-dof--landing-scoring-system)
9. [Environment & Weather Settings](#9-environment--weather-settings)
10. [Troubleshooting & FAQ](#10-troubleshooting--faq)

---

## 1. Overview & Desktop App Features

**Haneda Flight Landing Desktop** is a native desktop flight simulator delivering an authentic, high-fidelity experience of modern commercial airliner landing procedures at Tokyo International Airport (Haneda - RJTT / HND).

- **Tauri 2.0 Native Engine**: Ultra-fast startup, low system resource usage, and smooth 60+ FPS hardware-accelerated 3D graphics.
- **Surveyed DEM Elevation & Orthophotography**: Accurate terrain meshes and aerial satellite imagery covering Tokyo Bay, the Boso Peninsula, and central Tokyo.
- **Realistic 6-DOF Aerodynamics**: Real-time lift, drag, inertia, ground effect, flaps, landing gear, spoilers, and reverse thrust.
- **Cross-Platform**: Full native support for macOS (Apple Silicon / Intel) and Windows (x86_64).

---

## 2. Installation & Launch (macOS & Windows)

### macOS
1. Double-click the downloaded **`Haneda Flight Landing_1.0.0_aarch64.dmg`** file.
2. Drag and drop the **Haneda Flight Landing** application icon into your **Applications** folder.
3. Launch **Haneda Flight Landing** from Launchpad or the Applications folder.

> [!TIP]
> **If you see "App cannot be opened because it is from an unidentified developer":**
> 1. Right-click (or Control-click) the app icon and select **Open**.
> 2. Click **Open** in the confirmation dialog.
> (Alternatively, go to **System Settings > Privacy & Security** and click **Open Anyway**).

### Windows
1. Double-click the downloaded installer **`Haneda Flight Landing_1.0.0_x64-setup.exe`** (or standalone `.exe` / `.msi`).
2. Follow the setup wizard to complete installation, then launch the app from your Desktop or Start Menu.

> [!TIP]
> **If Windows Defender SmartScreen appears ("Windows protected your PC"):**
> 1. Click **More info**.
> 2. Click the **Run anyway** button.

---

## 3. User Interface & Layout

```
+-------------------------------------------------------------------------+
| [RJTT/HND 34L/34R/16L]           [1:Chase] [2:Cockpit] [3:Wing] ...     | <- Top: Routes & Cameras
+-------------------+---------------------------------+-------------------+
|                   |                                 |                   |
|  [PFD / HUD]      |                                 | [Settings Panel]  |
|  - Horizon (ADI)  |         3D World Viewport       | - Flight Mode     |
|  - Airspeed / Alt |                                 | - Weather & Time  |
|  - PAPI / ILS     |                                 | - Physics Sliders |
|  - VSI / Heading  |                                 |                   |
|                   |                                 |                   |
+-------------------+---------------------------------+-------------------+
| [Telemetry Bar] Altitude / Speed / VSI / Heading / Bank / G-Force / Evaluation |
| [Timeline Dock] (Play/Pause) [====(PH1)==(PH2)==(PH3)====] (1x) (Sound) | <- Bottom: Playback & Audio
+-------------------------------------------------------------------------+
```

- **Left [PFD / HUD]**: Shows real-time attitude, airspeed, barometric altitude, vertical speed, and ILS/PAPI glideslope references.
- **Right [Settings Panel]**: Toggle between Autopilot (Trajectory Replay) and Manual Flight, switch time of day (Day, Sunset, Night), and adjust wind/turbulence.
- **Bottom [Telemetry & Timeline]**: Flight parameters, playback control (play/pause, seek, 0.5x to 4x speed), and audio volume.

---

## 4. Controls & Keyboard Shortcuts

### Camera Perspectives
| Key | Camera Mode | Description |
| :---: | :--- | :--- |
| **`1`** | **Chase View** | Follows closely behind the aircraft for an action perspective. |
| **`2`** | **Cockpit View** | First-person pilot view with clear sight of instruments and runway lights. |
| **`3`** | **Wing / Passenger View** | View from passenger window overlooking the right wing and engine. |
| **`4`** | **Tower View** | View from the top of the 115m Haneda Air Traffic Control tower. |
| **`5`** | **Runway Spotter View** | Positioned right at the threshold lights (ALS/PAPI) at touchdown. |
| **`6`** | **Orbit View** | Click & drag with mouse to freely inspect the aircraft from any angle. |

### Manual Flight Controls (6-DOF)
Switch the control mode in the settings panel to **Manual Mode** or use the following keys directly:

| Action | Keys | Description |
| :--- | :---: | :--- |
| **Elevator (Pitch)** | **`W` / `Up Arrow`** | Pitch Down (Descent / Acceleration) |
| | **`S` / `Down Arrow`** | Pitch Up (Climb / Flare before touchdown) |
| **Aileron (Roll)** | **`A` / `Left Arrow`** | Roll Left |
| | **`D` / `Right Arrow`** | Roll Right |
| **Rudder (Yaw)** | **`Q` / `E`** | Rudder Left / Right (Crosswind alignment) |
| **Throttle** | **`R` / `F`** | Increase / Decrease Engine Thrust |
| **Landing Gear** | **`G`** | Extend / Retract Landing Gear |
| **Flaps** | **`F`** | Cycle Flap settings (0° → 5° → 15° → 30° Full) |
| **Speedbrakes** | **`Space`** | Deploy Wing Spoilers (Rapid deceleration / descent) |
| **Wheel Brakes** | **`B`** | Apply Wheel Brakes after touchdown |
| **Reverse Thrust** | **`X`** | Activate Engine Thrust Reversers |

---

## 5. Landing Routes & Scenarios

1. **RWY 34L Tokyo Bay Curve Approach**: Standard arrival route. Approaches from Boso Peninsula over Tokyo Bay, performs the signature 90° right turn, and aligns with Runway 34L.
2. **RWY 34R Straight ILS Approach**: Direct straight-in ILS approach over Tokyo Bay to Runway 34R.
3. **RWY 16L Tokyo City RNAV Approach**: South-wind good weather route descending directly over Shinjuku, Shibuya, Shinagawa, and Ohi Pier (3.45° steep approach).
4. **TOGA Missed Approach (Go-Around)**: Abort landing at decision height (~150 ft) due to wind gusts. Applies full thrust, climbs out, and safely vectors back over Tokyo Bay.
5. **Bounce & Hard Landing Failure**: Emergency scenario demonstrating excessive sink rate, insufficient flare, bounce, and runway excursion.

---

## 6. Primary Flight Display (PFD / HUD) & PAPI Guide

### PAPI (Precision Approach Path Indicator)
Four lights located to the left of the runway indicate your vertical glide path:

| Lights | Status | Recommended Action |
| :---: | :--- | :--- |
| ⚪ ⚪ ⚪ ⚪ | **Too High** | Lower pitch slightly, reduce throttle to increase descent |
| ⚪ ⚪ ⚪ 🔴 | **Slightly High** | Good. Gently converge onto glideslope |
| ⚪ ⚪ 🔴 🔴 | **On Glide Path (3.0°)** | **Ideal 3.0° descent. Maintain current attitude & power** |
| ⚪ 🔴 🔴 🔴 | **Slightly Low** | Add a small amount of engine power |
| 🔴 🔴 🔴 🔴 | **Too Low / Danger** | Pull up immediately, add full power to avoid undershoot |

---

## 7. Manual Flight (6-DOF) & Landing Scoring System

Upon touching down in Manual Mode, the simulator calculates your performance score (out of 100) and awards a grade (**S / A / B / C / F**):

1. **Touchdown Vertical Speed**: -100 to -200 ft/min for a silky-smooth "Butter Landing".
2. **Approach Airspeed**: Target 135–145 knots.
3. **Centerline Accuracy**: Deviation from the runway centerline.
4. **Touchdown Zone**: Landing within the designated 300–500m threshold zone.

---

## 8. Environment & Weather Settings

From the right settings panel:
- **Time of Day**: Day (bright clear sky), Sunset (golden hour reflections over Tokyo Bay), Night (illuminated runway lights and cityscape).
- **Weather**: Calm (no wind), Gentle Headwind, Crosswind, Turbulence & Gusts.

---

## 9. Troubleshooting & FAQ

- **No Sound / Audio**:
  Check if the sound icon in the bottom timeline or settings panel is muted.
- **Low Framerate / Stuttering**:
  Close background apps and adjust window size if needed.
- **Aircraft Stuck in Roll/Pitch**:
  Release keyboard keys or counter-steer with `A`/`D`/`W`/`S`. Turning Autopilot ON temporarily will re-level the aircraft.
