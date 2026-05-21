import Phaser from 'phaser'
import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'PenaltyGoalkeepingScene'

const TOTAL_SHOTS = 5
const THREE_STAR_SAVES = 5
const TWO_STAR_SAVES = 3

const WIND_UP_DURATION_MILLISECONDS = 900
const SHOT_TELL_VISIBLE_MILLISECONDS = 300
const BALL_FLIGHT_MILLISECONDS = 420
const RESULT_DISPLAY_MILLISECONDS = 1000

type RoundPhase = 'waiting' | 'windup' | 'deciding' | 'flying' | 'result' | 'done'

type DiveDirection = 'left' | 'right' | 'up' | 'centre'

interface PlannedShot {
  targetX: number
  targetY: number
  direction: DiveDirection
}

export class PenaltyGoalkeepingScene extends MiniGameScene {
  private savesCount = 0
  private shotsRemaining = TOTAL_SHOTS
  private roundPhase: RoundPhase = 'waiting'

  private backgroundGraphics!: Phaser.GameObjects.Graphics
  private goalGraphics!: Phaser.GameObjects.Graphics
  private shooterGraphics!: Phaser.GameObjects.Graphics
  private ballGraphics!: Phaser.GameObjects.Graphics
  private keeperGraphics!: Phaser.GameObjects.Graphics
  private hudText!: Phaser.GameObjects.Text
  private resultText!: Phaser.GameObjects.Text
  private instructionText!: Phaser.GameObjects.Text

  private goalLeft = 0
  private goalTop = 0
  private goalWidth = 0
  private goalHeight = 0

  private keeperPosition!: Phaser.Math.Vector2
  private ballPosition!: Phaser.Math.Vector2

  private plannedShot: PlannedShot | null = null
  private playerDiveDirection: DiveDirection | null = null
  private swipeStartX = 0
  private swipeStartY = 0

  constructor() {
    super({ key: SCENE_KEY })
  }

  create(): void {
    const width = this.scale.width
    const height = this.scale.height

    this.savesCount = 0
    this.shotsRemaining = TOTAL_SHOTS
    this.roundPhase = 'waiting'

    // Goal fills most of the screen — keeper view perspective
    this.goalWidth = width * 0.85
    this.goalHeight = height * 0.5
    this.goalLeft = (width - this.goalWidth) / 2
    this.goalTop = height * 0.08

    this.keeperPosition = new Phaser.Math.Vector2(width / 2, this.goalTop + this.goalHeight * 0.5)
    this.ballPosition = new Phaser.Math.Vector2(width / 2, height * 0.88)

    this.backgroundGraphics = this.add.graphics()
    this.goalGraphics = this.add.graphics()
    this.keeperGraphics = this.add.graphics()
    this.shooterGraphics = this.add.graphics()
    this.ballGraphics = this.add.graphics()

    this.hudText = this.add
      .text(width / 2, height * 0.03, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0)

    this.resultText = this.add
      .text(width / 2, height * 0.62, '', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#30d860',
      })
      .setOrigin(0.5)
      .setVisible(false)

    this.instructionText = this.add
      .text(width / 2, height * 0.94, 'SWIPE to dive  •  TAP to stay', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#9090b0',
      })
      .setOrigin(0.5)

    this.drawBackground()
    this.drawGoal()
    this.drawKeeper()
    this.drawShooter()
    this.drawBall()
    this.updateHud()

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this)
    this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this)

    this.emitGameReady()
    this.beginNextShot()
  }

  // ─── Drawing ─────────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const width = this.scale.width
    const height = this.scale.height
    const g = this.backgroundGraphics
    g.fillStyle(0x5ba4d8).fillRect(0, 0, width, height * 0.65)
    g.fillStyle(0x22883a).fillRect(0, height * 0.65, width, height)
    // Pitch markings
    g.lineStyle(2, 0xf0f0d0, 0.4)
    // D-arc approximation
    g.strokeCircle(width / 2, height * 1.1, height * 0.5)
  }

  private drawGoal(): void {
    const g = this.goalGraphics
    g.clear()

    // Net
    g.fillStyle(0x000000, 0.35)
    g.fillRect(this.goalLeft, this.goalTop, this.goalWidth, this.goalHeight)

    g.lineStyle(1, 0xffffff, 0.2)
    const gridSize = 16
    for (let x = this.goalLeft; x <= this.goalLeft + this.goalWidth; x += gridSize) {
      g.lineBetween(x, this.goalTop, x, this.goalTop + this.goalHeight)
    }
    for (let y = this.goalTop; y <= this.goalTop + this.goalHeight; y += gridSize) {
      g.lineBetween(this.goalLeft, y, this.goalLeft + this.goalWidth, y)
    }

    // Frame
    g.lineStyle(5, 0xffffff, 1)
    g.strokeRect(this.goalLeft, this.goalTop, this.goalWidth, this.goalHeight)
  }

  private drawKeeper(): void {
    const g = this.keeperGraphics
    g.clear()

    const keeperWidth = this.goalWidth * 0.12
    const keeperHeight = this.goalHeight * 0.7

    g.fillStyle(0x1e90ff)
    g.fillRect(
      this.keeperPosition.x - keeperWidth / 2,
      this.keeperPosition.y - keeperHeight / 2,
      keeperWidth,
      keeperHeight,
    )
    g.fillStyle(0xffd700)
    g.fillRect(
      this.keeperPosition.x - keeperWidth / 2 - 6,
      this.keeperPosition.y - keeperHeight * 0.15,
      8,
      10,
    )
    g.fillRect(
      this.keeperPosition.x + keeperWidth / 2 - 2,
      this.keeperPosition.y - keeperHeight * 0.15,
      8,
      10,
    )
  }

  private drawShooter(): void {
    const g = this.shooterGraphics
    g.clear()
    const width = this.scale.width
    const height = this.scale.height

    g.fillStyle(0xe83030)
    g.fillRect(width / 2 - 10, height * 0.75, 20, 32)
    g.fillStyle(0xf4c098)
    g.fillCircle(width / 2, height * 0.72, 10)
  }

  private drawBall(): void {
    const g = this.ballGraphics
    g.clear()

    const radius = this.scale.width * 0.022
    g.fillStyle(0x000000, 0.3)
    g.fillEllipse(this.ballPosition.x + 2, this.ballPosition.y + 3, radius * 2.2, radius * 0.7)
    g.fillStyle(0xf4f4f0)
    g.fillCircle(this.ballPosition.x, this.ballPosition.y, radius)
    g.fillStyle(0x1a1a1a)
    g.fillCircle(this.ballPosition.x, this.ballPosition.y - radius * 0.4, radius * 0.28)
  }

  // ─── Round flow ──────────────────────────────────────────────────────────────

  private beginNextShot(): void {
    this.playerDiveDirection = null
    this.plannedShot = this.generateShot()
    this.roundPhase = 'windup'

    this.drawShooter()
    this.updateHud()

    // Show lean tell briefly, then hide it
    this.showShooterLean(this.plannedShot.direction)
    this.time.delayedCall(SHOT_TELL_VISIBLE_MILLISECONDS, () => {
      this.drawShooter()
    })

    // After wind-up, shoot
    this.time.delayedCall(WIND_UP_DURATION_MILLISECONDS, () => {
      this.roundPhase = 'flying'
      this.flyBall()
    })
  }

  private generateShot(): PlannedShot {
    const width = this.scale.width
    const directions: DiveDirection[] = ['left', 'right', 'up', 'centre']
    const direction = directions[Math.floor(Math.random() * directions.length)] as DiveDirection

    let targetX: number
    let targetY: number

    switch (direction) {
      case 'left':
        targetX = this.goalLeft + this.goalWidth * (0.1 + Math.random() * 0.2)
        targetY = this.goalTop + this.goalHeight * (0.3 + Math.random() * 0.4)
        break
      case 'right':
        targetX = this.goalLeft + this.goalWidth * (0.7 + Math.random() * 0.2)
        targetY = this.goalTop + this.goalHeight * (0.3 + Math.random() * 0.4)
        break
      case 'up':
        targetX = this.goalLeft + this.goalWidth * (0.3 + Math.random() * 0.4)
        targetY = this.goalTop + this.goalHeight * 0.15
        break
      default:
        targetX = width / 2 + (Math.random() - 0.5) * this.goalWidth * 0.2
        targetY = this.goalTop + this.goalHeight * 0.5
    }

    return { targetX, targetY, direction }
  }

  private showShooterLean(direction: DiveDirection): void {
    const g = this.shooterGraphics
    g.clear()
    const width = this.scale.width
    const height = this.scale.height
    const leanOffsetX = direction === 'left' ? -6 : direction === 'right' ? 6 : 0

    g.fillStyle(0xe83030)
    g.fillRect(width / 2 - 10 + leanOffsetX, height * 0.75, 20, 32)
    g.fillStyle(0xf4c098)
    g.fillCircle(width / 2 + leanOffsetX, height * 0.72, 10)
  }

  private flyBall(): void {
    if (!this.plannedShot) return
    const { targetX, targetY } = this.plannedShot

    this.tweens.add({
      targets: this.ballPosition,
      x: targetX,
      y: targetY,
      duration: BALL_FLIGHT_MILLISECONDS,
      ease: 'Sine.easeIn',
      onUpdate: () => this.drawBall(),
      onComplete: () => this.resolveOutcome(),
    })
  }

  private resolveOutcome(): void {
    if (!this.plannedShot) return
    this.roundPhase = 'result'
    this.shotsRemaining--

    const saved = this.playerDiveDirection !== null && this.diveCoversShot(this.playerDiveDirection, this.plannedShot)

    if (saved) {
      this.savesCount++
      this.emitScoreUpdate(this.savesCount)
      this.showResult('SAVED!', '#30d860')
    } else {
      this.showResult('GOAL!', '#e83030')
    }

    this.updateHud()

    this.time.delayedCall(RESULT_DISPLAY_MILLISECONDS, () => {
      if (this.shotsRemaining <= 0) {
        this.endRound()
      } else {
        this.resetPositions()
        this.beginNextShot()
      }
    })
  }

  private diveCoversShot(dive: DiveDirection, shot: PlannedShot): boolean {
    if (dive === 'centre' && shot.direction === 'centre') return true
    if (dive === 'left' && shot.direction === 'left') return true
    if (dive === 'right' && shot.direction === 'right') return true
    if (dive === 'up' && shot.direction === 'up') return true
    // Partial coverage: e.g. left dive might reach centre shot
    if (dive === 'left' && shot.direction === 'centre') return Math.random() < 0.35
    if (dive === 'right' && shot.direction === 'centre') return Math.random() < 0.35
    return false
  }

  private resetPositions(): void {
    const width = this.scale.width
    this.keeperPosition.set(width / 2, this.goalTop + this.goalHeight * 0.5)
    this.ballPosition.set(width / 2, this.scale.height * 0.88)
    this.drawKeeper()
    this.drawBall()
    this.drawShooter()
  }

  private showResult(message: string, color: string): void {
    this.resultText.setText(message).setColor(color).setVisible(true)
    this.time.delayedCall(RESULT_DISPLAY_MILLISECONDS, () => {
      this.resultText.setVisible(false)
    })
  }

  private updateHud(): void {
    this.hudText.setText(`Saves: ${this.savesCount}  Shots left: ${this.shotsRemaining}`)
  }

  private endRound(): void {
    this.roundPhase = 'done'
    const stars = this.calculateStarsFromScore(this.savesCount, THREE_STAR_SAVES, TWO_STAR_SAVES)
    this.emitGameOver(stars)
  }

  // ─── Input ───────────────────────────────────────────────────────────────────

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.swipeStartX = pointer.x
    this.swipeStartY = pointer.y
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.roundPhase !== 'windup' && this.roundPhase !== 'flying') return
    if (this.playerDiveDirection !== null) return

    const deltaX = pointer.x - this.swipeStartX
    const deltaY = pointer.y - this.swipeStartY
    const swipeDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    if (swipeDistance < 20) {
      this.playerDiveDirection = 'centre'
    } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
      this.playerDiveDirection = deltaX < 0 ? 'left' : 'right'
    } else {
      this.playerDiveDirection = deltaY < 0 ? 'up' : 'centre'
    }

    this.diveKeeperVisually(this.playerDiveDirection)
  }

  private diveKeeperVisually(direction: DiveDirection): void {
    const goalCenterX = this.goalLeft + this.goalWidth / 2
    const targetX =
      direction === 'left'
        ? this.goalLeft + this.goalWidth * 0.15
        : direction === 'right'
          ? this.goalLeft + this.goalWidth * 0.85
          : goalCenterX

    const targetY =
      direction === 'up'
        ? this.goalTop + this.goalHeight * 0.15
        : this.goalTop + this.goalHeight * 0.55

    this.tweens.add({
      targets: this.keeperPosition,
      x: targetX,
      y: targetY,
      duration: 220,
      ease: 'Back.easeOut',
      onUpdate: () => this.drawKeeper(),
    })
  }

  update(_time: number, _delta: number): void {
    // All logic driven by timers and tweens.
  }
}

export { SCENE_KEY as PENALTY_GOALKEEPING_SCENE_KEY }
