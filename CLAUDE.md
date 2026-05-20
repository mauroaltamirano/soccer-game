# Soccer Mini-Games — Developer Context

## Repository structure

```
soccer-game/
├── apps/
│   ├── web/         Vite + Vue 3 SPA (primary entry point for web and Capacitor)
│   └── mobile/      Capacitor wrapper — iOS and Android native shells
├── packages/
│   ├── game-core/   Phaser 4 scenes, GameEventBus, GameRegistry, MiniGameScene base
│   ├── services/    Async service interfaces + localStorage implementations
│   └── ui/          Shared Vue components + CSS design tokens
└── docs/            Architecture, service layer, per-game design specs
```

## Tech stack

- **Vue 3** (Composition API, `<script setup>`) — UI shell, navigation, HUD overlays
- **Phaser 4** — game engine (canvas, physics, input, sprites)
- **TypeScript 6** — strict mode, `allowImportingTsExtensions`
- **Vite 8** — build tool for `apps/web`
- **Pinia 3** — reactive state (game store, etc.)
- **Vue Router 5** — routing
- **vue-i18n 11** — all user-facing strings; English only for now
- **vite-plugin-pwa** — PWA support (offline, installable)
- **Capacitor 8** — mobile wrapper
- **pnpm 10** workspaces — monorepo

## Common commands

```bash
pnpm install                    # install all workspace dependencies
pnpm dev                        # start apps/web dev server
pnpm build                      # full production build of apps/web
pnpm typecheck                  # TypeScript check across all packages

# Target a specific package
pnpm --filter web dev
pnpm --filter @soccer-game/game-core typecheck

# Mobile (from apps/mobile)
pnpm cap:sync                   # sync web build to native projects
pnpm cap:run:ios                # run on iOS simulator
pnpm cap:run:android            # run on Android emulator
```

## Naming conventions

- **Interfaces**: `ScoreServiceInterface`, `ProgressionServiceInterface` — descriptive suffix, no `I` prefix
- **Classes**: `LocalStorageScoreService`, `PenaltyKickScene` — long and explicit
- **Vue components**: `PhaserGameCanvas`, `HudOverlay`, `GameSelectionCard`, `StarRatingDisplay`
- **Stores (Pinia)**: `useGameStore`, `useScoreStore` — composable-style naming
- **No abbreviations** — write `elapsedTimeMilliseconds`, not `elapsedMs` or `dt`

## Adding a new mini-game

1. Create `packages/game-core/src/scenes/YourGameScene.ts` extending `MiniGameScene`
2. Implement `preload()`, `create()`, `update()` and call `emitGameOver()` when done
3. Register it in `packages/game-core/src/registrations.ts` with `registerGame()`
4. Export the scene and key from `packages/game-core/src/index.ts`
5. Write a game design spec in `docs/games/your-game.md`

## Vue ↔ Phaser communication

Phaser scenes run inside a `<canvas>` managed by `PhaserGameCanvas.vue`. Communication is
via `gameEventBus` (typed EventEmitter3 instance from `@soccer-game/game-core`):

```
Scene  →  gameEventBus.emit('score:update', payload)  →  HudOverlay.vue
Scene  →  gameEventBus.emit('game:over', payload)     →  GameView.vue → services
Vue    →  scene.someMethod()                          →  via getActiveScene() ref
```

## Service injection

Services are injected via Vue's `provide/inject` at app root (`apps/web/src/main.ts`).
Inject in components using the typed keys from `apps/web/src/services/index.ts`:

```typescript
const scoreService = inject(scoreServiceInjectionKey)
await scoreService?.saveScore('penalty-kick', 42)
```

Default implementations write to `localStorage`. Swap to a backend by providing a
different implementation class — consumers are unaffected.

## Pixel art conventions

- Base sprite size: **16×16 pixels**
- Canvas rendered at **4× upscale** (Phaser `pixelArt: true`, CSS `image-rendering: pixelated`)
- Palette defined in `packages/ui/src/styles/design-tokens.css`
- Never use anti-aliasing on sprites or the canvas element
