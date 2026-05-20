import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'KeepieTuppiesScene'
const THREE_STAR_SCORE = 50
const TWO_STAR_SCORE = 20

export class KeepieTuppiesScene extends MiniGameScene {
  private consecutiveTaps = 0

  constructor() {
    super({ key: SCENE_KEY })
  }

  preload(): void {
    // TODO: load ball (rotation frames), player feet, ground, background spritesheets
  }

  create(): void {
    this.consecutiveTaps = 0
    this.currentScore = 0
    this.emitGameReady()
  }

  update(_time: number, _delta: number): void {
    // TODO: game loop — ball falls under gravity, tap adds upward impulse
  }
}

export { SCENE_KEY as KEEPIE_TUPPIES_SCENE_KEY }
