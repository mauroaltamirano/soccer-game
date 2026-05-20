import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'PenaltyKickScene'
const TOTAL_SHOTS = 5
const THREE_STAR_SCORE = 5
const TWO_STAR_SCORE = 3

export class PenaltyKickScene extends MiniGameScene {
  private shotsRemaining = TOTAL_SHOTS

  constructor() {
    super({ key: SCENE_KEY })
  }

  preload(): void {
    // TODO: load 16x16 ball, goal, goalkeeper spritesheets
  }

  create(): void {
    this.shotsRemaining = TOTAL_SHOTS
    this.currentScore = 0
    this.emitGameReady()
  }

  update(_time: number, _delta: number): void {
    // TODO: game loop
  }
}

export { SCENE_KEY as PENALTY_KICK_SCENE_KEY }
