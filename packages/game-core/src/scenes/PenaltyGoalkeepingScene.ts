import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'PenaltyGoalkeepingScene'
const TOTAL_SHOTS_TO_FACE = 5
const THREE_STAR_SCORE = 5
const TWO_STAR_SCORE = 3

export class PenaltyGoalkeepingScene extends MiniGameScene {
  private shotsRemaining = TOTAL_SHOTS_TO_FACE

  constructor() {
    super({ key: SCENE_KEY })
  }

  preload(): void {
    // TODO: load goalkeeper, shooter, ball, goal spritesheets
  }

  create(): void {
    this.shotsRemaining = TOTAL_SHOTS_TO_FACE
    this.currentScore = 0
    this.emitGameReady()
  }

  update(_time: number, _delta: number): void {
    // TODO: game loop
  }
}

export { SCENE_KEY as PENALTY_GOALKEEPING_SCENE_KEY }
