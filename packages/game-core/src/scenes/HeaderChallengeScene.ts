import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'HeaderChallengeScene'
const THREE_STAR_SCORE = 10
const TWO_STAR_SCORE = 5

export class HeaderChallengeScene extends MiniGameScene {
  private consecutiveHeaders = 0

  constructor() {
    super({ key: SCENE_KEY })
  }

  preload(): void {
    // TODO: load crossing player, heading player (jump frames), ball, goal spritesheets
  }

  create(): void {
    this.consecutiveHeaders = 0
    this.currentScore = 0
    this.emitGameReady()
  }

  update(_time: number, _delta: number): void {
    // TODO: ball arc cross, tap timing window, direction swipe for corner selection
  }
}

export { SCENE_KEY as HEADER_CHALLENGE_SCENE_KEY }
