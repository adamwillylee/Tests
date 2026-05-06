# Neon Comet Defender

A single-file browser arcade game built with HTML, CSS, and vanilla JavaScript. Pilot a neon interceptor, shoot incoming comets, collect energy cores, and keep the city shield alive through escalating waves.

## Play

Open `tee-ballz.html` in any modern browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000/tee-ballz.html>.

## Controls

- `WASD` or arrow keys: move
- `Space`: fire pulse cannon
- `Shift`: dash
- `P`: pause or resume
- `Enter`: start from the overlay

## Features

- Responsive 16:9 canvas layout
- Procedural starfield and neon city backdrop
- Escalating enemy waves
- Combo scoring and best-score persistence via `localStorage`
- Collectible shield-repair energy cores
- Particle effects, screen shake, and pause/restart flow
