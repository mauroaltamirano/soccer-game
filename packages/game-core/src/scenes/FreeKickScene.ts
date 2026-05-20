import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'FreeKickScene'
const THREE_STAR_SCORE = 15
const TWO_STAR_SCORE = 8

export class FreeKickScene extends MiniGameScene {
  constructor() {
    super({ key: SCENE_KEY })
  }

  preload(): void {
    // TODO: load ball, goal, goalkeeper, defensive wall spritesheets
  }

  create(): void {
    this.currentScore = 0
    this.emitGameReady()
  }

  update(_time: number, _delta: number): void {
    // TODO: two-phase input — aim drag, then power hold/release; optional curl swipe
  }
}

export { SCENE_KEY as FREE_KICK_SCENE_KEY }
