# Architecture

## Package dependency graph

```
apps/web
  ├── @soccer-game/game-core   (Phaser scenes, event bus, registry)
  ├── @soccer-game/services    (async service interfaces + localStorage impls)
  └── @soccer-game/ui          (Vue components, design tokens)
        └── @soccer-game/game-core  (HudOverlay listens to gameEventBus)

apps/mobile
  └── (no workspace deps — Capacitor wraps apps/web dist output)
```

## Request flow: launching a game

1. User taps a `GameSelectionCard` in `HomeView.vue`
2. Router navigates to `/play/:gameId`
3. `GameView.vue` reads `gameId`, calls `findRegisteredGameById(gameId)` from `@soccer-game/game-core`
4. `PhaserGameCanvas.vue` mounts, creates a `new Phaser.Game(...)` with the scene class
5. Phaser runs `preload → create → update` loop inside the `<canvas>`
6. `HudOverlay.vue` sits in an absolute-positioned layer over the canvas, listening to `gameEventBus`
7. On `game:over`, `GameView.vue` calls `scoreService.saveScore()` and `progressionService.saveStars()`

## Vue ↔ Phaser bridge

```
┌──────────────────────────────────────────────────────────────────┐
│  Vue layer (DOM)                                                 │
│  ┌──────────────────────────────────────┐  ┌──────────────────┐ │
│  │  HudOverlay.vue                      │  │  GameView.vue    │ │
│  │  (listens: score:update, hud:message)│  │  (listens: over) │ │
│  └───────────────┬──────────────────────┘  └────────┬─────────┘ │
│                  │ gameEventBus (EventEmitter3)       │           │
│  ┌───────────────┴───────────────────────────────────┘           │
│  │ PhaserGameCanvas.vue                                          │
│  │  ┌─────────────────────────────────────────────────────────┐  │
│  │  │  <canvas> — Phaser 4                                    │  │
│  │  │   MiniGameScene subclass                                │  │
│  │  │     preload / create / update                           │  │
│  │  │     emits events via gameEventBus                       │  │
│  │  └─────────────────────────────────────────────────────────┘  │
│  └────────────────────────────────────────────────────────────── │
└──────────────────────────────────────────────────────────────────┘
```

**Phaser → Vue**: scenes call helper methods on `MiniGameScene` (`emitScoreUpdate`, `emitGameOver`, `emitHudMessage`) which emit typed events on `gameEventBus`.

**Vue → Phaser**: `GameView.vue` can access the active scene via `phaserCanvas.getActiveScene()` and call public methods on it (e.g. `scene.pause()`, `scene.resume()`).

## Service layer

All three services are async interfaces. The default implementations write to `localStorage`. This means the entire codebase can be upgraded to a real backend by swapping implementations at app startup — no consumer code changes needed.

See `docs/service-layer.md` for interface definitions and instructions for implementing a backend adapter.

## PWA and offline

`vite-plugin-pwa` generates a service worker that pre-caches all built assets. The app works fully offline after first load. The PWA manifest is configured in `apps/web/vite.config.ts`.

## Mobile (Capacitor)

`apps/mobile` holds only the Capacitor configuration. It has no game logic — it points `webDir` at `apps/web/dist`. To build for mobile:

```bash
pnpm build                    # build apps/web
pnpm --filter mobile cap:sync # copy dist into native projects
pnpm --filter mobile cap:run:ios
```
