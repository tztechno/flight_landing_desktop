# Haneda Airport Flight Landing Simulator (Desktop)

A realistic Haneda Airport 3D Flight Landing Simulator built with **Three.js** and **Tauri 2.0**.

## Features
- **3D Airport & Terrain Simulation**: Haneda Airport Runway 34L approach with elevation and satellite textures.
- **Flight Physics & Autopilot / Manual Control**: Realistic aerodynamics, ILS glideslope tracking, and landing evaluations.
- **Cross-Platform**: Native desktop application for macOS and Windows.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

## Build

```bash
# Build macOS DMG
npm run tauri build -- --bundles dmg

# Build Windows EXE / NSIS
npm run tauri build -- --bundles nsis,msi
```

## CI/CD (GitHub Actions)
- Automated Windows (`.exe` / `.msi`) installer builds on push/PR via GitHub Actions.
- Automated release creation for macOS (`.dmg`) and Windows when tagging with `v*`.
