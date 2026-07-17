# HANA-X // AGENTIC OS — Cinematic 3D Scroll Site

A living demonstration of the Hana-X agentic AI operating system: a scroll-scrubbed
hero cinematic, zero-latency module preview loops, and a velocity-reactive HUD —
matte black, concrete gray, one piercing acid-green accent.

## Run locally

```bash
node server.mjs          # → http://localhost:4173
# or
npm start
```

The dev server is zero-dependency and supports HTTP Range requests, which the
`<video>` frame-scrubbing requires. (Plain `python3 -m http.server` will NOT
scrub smoothly — it lacks Range support.)

## Architecture

| Piece | Approach |
|---|---|
| Scroll-scrub hero | GSAP ScrollTrigger pins the hero for 420vh and maps scroll progress → `video.currentTime`, lerp-smoothed in a rAF loop |
| Horizon marquee | Periodic 4-span track, seamless `xPercent` loop, `timeScale` driven by live scroll velocity |
| Pillar grid | 1:1 module loops, decoder pre-warmed after boot so hover-to-play is zero-latency; pointer-tilt in 3D perspective |
| Manifesto | 16:9 interface-macro loop under scroll-revealed doctrine lines, parallax drift |
| HUD | Live millisecond uptime tracker, scroll telemetry, custom cursor, boot preloader |

All libraries (GSAP 3.12.7 + ScrollTrigger) and fonts (Anton, JetBrains Mono) are
vendored — the site is fully self-contained, no external requests at runtime.

## Visual assets

Generated with Higgsfield MCP / Seedance 2.0 (1080p, silent):

- `assets/video/hero.mp4` — 16:9 rooftop → data-center operator cinematic (scroll-scrubbed)
- `assets/video/module-rag.mp4` — 1:1 RAG / vector-flow obsidian core loop
- `assets/video/module-infra.mp4` — 1:1 idempotent-execution gear-lock loop
- `assets/video/module-context.mp4` — 1:1 context-engine matrix loop
- `assets/video/macro.mp4` — 16:9 interface macro (manifesto background)

`.github/workflows/fetch-assets.yml` re-fetches generated media into the repo
(the dev container's egress policy blocks the CDN, GitHub runners don't).
