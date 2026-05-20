import Phaser from 'phaser'
import { gameEventBus } from './GameEventBus.ts'

export abstract class MiniGameScene extends Phaser.Scene {
  protected currentScore = 0

  protected emitScoreUpdate(score: number, combo?: number): void {
    this.currentScore = score
    gameEventBus.emit('score:update', { score, combo })
  }

  protected emitGameOver(stars: number): void {
    gameEventBus.emit('game:over', { finalScore: this.currentScore, stars })
  }

  protected emitHudMessage(message: string): void {
    gameEventBus.emit('hud:message', { message })
  }

  protected emitGameReady(): void {
    gameEventBus.emit('game:ready')
  }

  protected calculateStarsFromScore(score: number, threeStarThreshold: number, twoStarThreshold: number): number {
    if (score >= threeStarThreshold) return 3
    if (score >= twoStarThreshold) return 2
    if (score > 0) return 1
    return 0
  }
}
