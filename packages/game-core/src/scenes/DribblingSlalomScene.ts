import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'DribblingSlalomScene'
const THREE_STAR_TIME_MILLISECONDS = 15_000
const TWO_STAR_TIME_MILLISECONDS = 25_000

export class DribblingSlalomScene extends MiniGameScene {
  private elapsedTimeMilliseconds = 0
  private collisionCount = 0

  constructor() {
    super({ key: SCENE_KEY })
  }

  preload(): void {
    // TODO: load ball, cone, defender, pitch tile spritesheets
  }

  create(): void {
    this.elapsedTimeMilliseconds = 0
    this.collisionCount = 0
    this.currentScore = 0
    this.emitGameReady()
  }

  update(_time: number, delta: number): void {
    this.elapsedTimeMilliseconds += delta
    // TODO: drag-to-steer with momentum, obstacle collision detection
  }

  private calculateScoreFromTime(): number {
    if (this.elapsedTimeMilliseconds <= THREE_STAR_TIME_MILLISECONDS) return 100
    if (this.elapsedTimeMilliseconds <= TWO_STAR_TIME_MILLISECONDS) return 60
    return 30
  }
}

export { SCENE_KEY as DRIBBLING_SLALOM_SCENE_KEY }
