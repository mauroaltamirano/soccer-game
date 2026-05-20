# Adding a New Mini-Game

## Step 1 — Create the scene

Create `packages/game-core/src/scenes/YourGameScene.ts` extending `MiniGameScene`:

```typescript
import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'YourGameScene'

export class YourGameScene extends MiniGameScene {
  constructor() {
    super({ key: SCENE_KEY })
  }

  preload(): void {
    // Load spritesheets, images, tilemaps
    // this.load.spritesheet('ball', 'assets/ball.png', { frameWidth: 16, frameHeight: 16 })
  }

  create(): void {
    this.currentScore = 0
    // Set up game objects, input handlers, physics
    this.emitGameReady()
  }

  update(_time: number, _delta: number): void {
    // Per-frame game logic
  }
}

export { SCENE_KEY as YOUR_GAME_SCENE_KEY }
```

Call `this.emitGameOver(stars)` when the round ends. Stars should be 0–3.

## Step 2 — Register the game

In `packages/game-core/src/registrations.ts`:

```typescript
import { YourGameScene } from './scenes/YourGameScene.ts'

registerGame({
  id: 'your-game',
  title: 'Your Game',
  description: 'One sentence description shown on the selection card.',
  thumbnailTextureKey: 'thumbnail-your-game',
  sceneClass: YourGameScene,
  tags: ['shooting'], // used for future filtering
})
```

## Step 3 — Export from game-core

In `packages/game-core/src/index.ts`, add:

```typescript
export { YourGameScene, YOUR_GAME_SCENE_KEY } from './scenes/YourGameScene.ts'
```

## Step 4 — Add i18n strings

In `apps/web/src/i18n/locales/en.json`, the game title and description are already sourced
from the `GameDefinition` object. If your game's HUD needs custom strings, add them under
a namespace matching your game ID.

## Step 5 — Write a game design spec

Create `docs/games/your-game.md` following the template in any existing game doc.

## Step 6 — Add assets (when ready)

Place sprite sheets in `apps/web/public/assets/`. Name them `<game-id>-<element>.png`.
Use 16×16 pixel sprites. Load them in `preload()` with `this.load.spritesheet(...)`.

## Verification checklist

- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] Dev server shows game card on home screen
- [ ] Tapping card launches scene
- [ ] Score updates appear in HUD
- [ ] Game over triggers post-game overlay
- [ ] Score saves to localStorage and persists on reload
