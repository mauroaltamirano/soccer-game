import Phaser from 'phaser'
import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'PenaltyKickScene'

const TOTAL_SHOTS = 5
const THREE_STAR_GOALS = 5
const TWO_STAR_GOALS = 3

const GOALKEEPER_REACTION_DELAY_MILLISECONDS = 350
const BALL_FLIGHT_DURATION_MILLISECONDS = 500
const RESULT_DISPLAY_DURATION_MILLISECONDS = 1200

type ShotPhase = 'aiming' | 'flying' | 'result' | 'done'

interface GoalZone {
  x: number
  y: number
  width: number
  height: number
  points: number
  label: string
}

export class PenaltyKickScene extends MiniGameScene {
  private shotsRemaining = TOTAL_SHOTS
  private goalsScored = 0
  private shotPhase: ShotPhase = 'aiming'

  private pitchGraphics!: Phaser.GameObjects.Graphics
  private ballGraphics!: Phaser.GameObjects.Graphics
  private goalGraphics!: Phaser.GameObjects.Graphics
  private goalkeeperGraphics!: Phaser.GameObjects.Graphics
  private aimLineGraphics!: Phaser.GameObjects.Graphics
  private hudText!: Phaser.GameObjects.Text
  private resultText!: Phaser.GameObjects.Text

  private ballPosition!: Phaser.Math.Vector2
  private goalkeeperPosition!: Phaser.Math.Vector2

  private goalLeft = 0
  private goalTop = 0
  private goalWidth = 0
  private goalHeight = 0

  private dragStartPosition: Phaser.Math.Vector2 | null = null

  constructor() {
    super({ key: SCENE_KEY })
  }

  create(): void {
    const width = this.scale.width
    const height = this.scale.height

    this.shotsRemaining = TOTAL_SHOTS
    this.goalsScored = 0
    this.shotPhase = 'aiming'

    this.goalWidth = width * 0.55
    this.goalHeight = height * 0.12
    this.goalLeft = (width - this.goalWidth) / 2
    this.goalTop = height * 0.12

    this.ballPosition = new Phaser.Math.Vector2(width / 2, height * 0.72)
    this.goalkeeperPosition = new Phaser.Math.Vector2(
      width / 2,
      this.goalTop + this.goalHeight * 0.55,
    )

    this.pitchGraphics = this.add.graphics()
    this.goalGraphics = this.add.graphics()
    this.aimLineGraphics = this.add.graphics()
    this.goalkeeperGraphics = this.add.graphics()
    this.ballGraphics = this.add.graphics()

    this.hudText = this.add.text(width / 2, height * 0.04, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5, 0)

    this.resultText = this.add
      .text(width / 2, height * 0.45, '', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#f5d800',
      })
      .setOrigin(0.5)
      .setVisible(false)

    this.drawPitch()
    this.drawGoal()
    this.drawGoalkeeper()
    this.drawBall()
    this.updateHud()

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this)
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this)
    this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this)

    this.emitGameReady()
  }

  // ─── Drawing helpers ─────────────────────────────────────────────────────────

  private drawPitch(): void {
    const width = this.scale.width
    const height = this.scale.height
    const graphics = this.pitchGraphics

    graphics.clear()

    // Sky / crowd
    graphics.fillStyle(0x2a5298)
    graphics.fillRect(0, 0, width, height * 0.08)

    // Pitch
    graphics.fillStyle(0x22883a)
    graphics.fillRect(0, height * 0.08, width, height)

    // Pitch stripes
    graphics.fillStyle(0x1a6b2a)
    const stripeWidth = width / 6
    for (let index = 0; index < 6; index += 2) {
      graphics.fillRect(index * stripeWidth, height * 0.08, stripeWidth, height)
    }

    // Penalty box outline
    const boxWidth = width * 0.7
    const boxHeight = height * 0.38
    const boxLeft = (width - boxWidth) / 2
    const boxTop = this.goalTop + this.goalHeight - 4
    graphics.lineStyle(2, 0xf0f0d0, 0.6)
    graphics.strokeRect(boxLeft, boxTop, boxWidth, boxHeight)

    // Penalty spot
    graphics.fillStyle(0xf0f0d0, 0.8)
    graphics.fillCircle(this.ballPosition.x, this.ballPosition.y, 4)
  }

  private drawGoal(): void {
    const graphics = this.goalGraphics
    graphics.clear()

    // Net background
    graphics.fillStyle(0x000000, 0.4)
    graphics.fillRect(this.goalLeft, this.goalTop, this.goalWidth, this.goalHeight)

    // Net grid lines
    graphics.lineStyle(1, 0xffffff, 0.2)
    const gridSpacing = 12
    for (let x = this.goalLeft; x <= this.goalLeft + this.goalWidth; x += gridSpacing) {
      graphics.lineBetween(x, this.goalTop, x, this.goalTop + this.goalHeight)
    }
    for (let y = this.goalTop; y <= this.goalTop + this.goalHeight; y += gridSpacing) {
      graphics.lineBetween(this.goalLeft, y, this.goalLeft + this.goalWidth, y)
    }

    // Posts and crossbar
    graphics.lineStyle(4, 0xffffff, 1)
    graphics.strokeRect(this.goalLeft, this.goalTop, this.goalWidth, this.goalHeight)
  }

  private drawGoalkeeper(): void {
    const graphics = this.goalkeeperGraphics
    graphics.clear()

    const keeperWidth = this.scale.width * 0.06
    const keeperHeight = this.goalHeight * 0.85

    // Body
    graphics.fillStyle(0x1e90ff)
    graphics.fillRect(
      this.goalkeeperPosition.x - keeperWidth / 2,
      this.goalkeeperPosition.y - keeperHeight / 2,
      keeperWidth,
      keeperHeight,
    )

    // Gloves
    graphics.fillStyle(0xffd700)
    graphics.fillRect(
      this.goalkeeperPosition.x - keeperWidth / 2 - 4,
      this.goalkeeperPosition.y - keeperHeight * 0.1,
      6,
      8,
    )
    graphics.fillRect(
      this.goalkeeperPosition.x + keeperWidth / 2 - 2,
      this.goalkeeperPosition.y - keeperHeight * 0.1,
      6,
      8,
    )
  }

  private drawBall(): void {
    const graphics = this.ballGraphics
    graphics.clear()

    const radius = this.scale.width * 0.025

    // Ball shadow
    graphics.fillStyle(0x000000, 0.3)
    graphics.fillEllipse(this.ballPosition.x + 2, this.ballPosition.y + 3, radius * 2.2, radius * 0.7)

    // Ball body
    graphics.fillStyle(0xf4f4f0)
    graphics.fillCircle(this.ballPosition.x, this.ballPosition.y, radius)

    // Panel markings
    graphics.fillStyle(0x1a1a1a)
    graphics.fillCircle(this.ballPosition.x, this.ballPosition.y - radius * 0.4, radius * 0.28)
    graphics.fillCircle(this.ballPosition.x - radius * 0.45, this.ballPosition.y + radius * 0.3, radius * 0.22)
    graphics.fillCircle(this.ballPosition.x + radius * 0.45, this.ballPosition.y + radius * 0.3, radius * 0.22)
  }

  private drawAimLine(targetX: number, targetY: number): void {
    const graphics = this.aimLineGraphics
    graphics.clear()

    if (this.shotPhase !== 'aiming') return

    const directionX = targetX - this.ballPosition.x
    const directionY = targetY - this.ballPosition.y
    const distance = Math.sqrt(directionX * directionX + directionY * directionY)

    if (distance < 10) return

    const normalizedX = directionX / distance
    const normalizedY = directionY / distance

    const maxPower = this.scale.height * 0.3
    const clampedDistance = Math.min(distance, maxPower)
    const powerRatio = clampedDistance / maxPower

    // Power bar
    const barWidth = this.scale.width * 0.3
    const barHeight = 8
    const barX = this.scale.width / 2 - barWidth / 2
    const barY = this.scale.height * 0.85

    graphics.fillStyle(0x333333, 0.8)
    graphics.fillRect(barX, barY, barWidth, barHeight)
    graphics.fillStyle(powerRatio > 0.7 ? 0xe83030 : 0x30d860)
    graphics.fillRect(barX, barY, barWidth * powerRatio, barHeight)
    graphics.lineStyle(1, 0xffffff, 0.6)
    graphics.strokeRect(barX, barY, barWidth, barHeight)

    // Aim line (dashed)
    const dashLength = 8
    const gapLength = 6
    const totalLength = clampedDistance * 1.4
    let drawn = 0
    let drawing = true

    graphics.lineStyle(2, 0xffffff, 0.5)
    while (drawn < totalLength) {
      const segmentLength = drawing ? dashLength : gapLength
      if (drawing) {
        const startX = this.ballPosition.x + normalizedX * drawn
        const startY = this.ballPosition.y + normalizedY * drawn
        const endLength = Math.min(drawn + segmentLength, totalLength)
        const endX = this.ballPosition.x + normalizedX * endLength
        const endY = this.ballPosition.y + normalizedY * endLength
        graphics.lineBetween(startX, startY, endX, endY)
      }
      drawn += segmentLength
      drawing = !drawing
    }

    // Aim circle at target
    graphics.lineStyle(2, 0xffffff, 0.4)
    graphics.strokeCircle(
      this.ballPosition.x + normalizedX * clampedDistance * 1.4,
      this.ballPosition.y + normalizedY * clampedDistance * 1.4,
      12,
    )
  }

  private updateHud(): void {
    this.hudText.setText(`Shots: ${this.shotsRemaining}  Goals: ${this.goalsScored}`)
    this.emitScoreUpdate(this.goalsScored)
  }

  private showResult(message: string, colorHex: string): void {
    this.resultText.setText(message).setColor(colorHex).setVisible(true)
    this.time.delayedCall(RESULT_DISPLAY_DURATION_MILLISECONDS, () => {
      this.resultText.setVisible(false)
    })
  }

  // ─── Input ───────────────────────────────────────────────────────────────────

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.shotPhase !== 'aiming') return
    this.dragStartPosition = new Phaser.Math.Vector2(pointer.x, pointer.y)
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.shotPhase !== 'aiming' || !this.dragStartPosition) return
    this.drawAimLine(pointer.x, pointer.y)
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.shotPhase !== 'aiming' || !this.dragStartPosition) return

    const directionX = pointer.x - this.ballPosition.x
    const directionY = pointer.y - this.ballPosition.y
    const distance = Math.sqrt(directionX * directionX + directionY * directionY)

    if (distance < 15) {
      this.dragStartPosition = null
      this.aimLineGraphics.clear()
      return
    }

    const maxPower = this.scale.height * 0.3
    const powerRatio = Math.min(distance / maxPower, 1)

    this.shoot(directionX / distance, directionY / distance, powerRatio)
    this.dragStartPosition = null
  }

  // ─── Game logic ──────────────────────────────────────────────────────────────

  private shoot(normalizedDirectionX: number, normalizedDirectionY: number, powerRatio: number): void {
    this.shotPhase = 'flying'
    this.aimLineGraphics.clear()

    const width = this.scale.width
    const height = this.scale.height

    const shotRangeX = width * 0.6
    const shotRangeY = height * 0.65

    const targetX = this.ballPosition.x + normalizedDirectionX * shotRangeX * powerRatio
    const targetY = this.ballPosition.y + normalizedDirectionY * shotRangeY * powerRatio

    const clampedTargetX = Phaser.Math.Clamp(targetX, 0, width)
    const clampedTargetY = Phaser.Math.Clamp(targetY, -height * 0.1, height * 0.9)

    this.time.delayedCall(GOALKEEPER_REACTION_DELAY_MILLISECONDS, () => {
      this.diveGoalkeeper(clampedTargetX)
    })

    this.tweens.add({
      targets: this.ballPosition,
      x: clampedTargetX,
      y: clampedTargetY,
      duration: BALL_FLIGHT_DURATION_MILLISECONDS,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        this.drawBall()
      },
      onComplete: () => {
        this.resolveShotOutcome(clampedTargetX, clampedTargetY)
      },
    })
  }

  private diveGoalkeeper(targetX: number): void {
    const goalCenterX = this.goalLeft + this.goalWidth / 2
    const offsetX = targetX - goalCenterX
    const diveX = Phaser.Math.Clamp(
      goalCenterX + offsetX * 0.7,
      this.goalLeft + 10,
      this.goalLeft + this.goalWidth - 10,
    )

    this.tweens.add({
      targets: this.goalkeeperPosition,
      x: diveX,
      duration: 280,
      ease: 'Back.easeOut',
      onUpdate: () => {
        this.drawGoalkeeper()
      },
    })
  }

  private resolveShotOutcome(targetX: number, targetY: number): void {
    this.shotPhase = 'result'
    this.shotsRemaining--

    const isInsideGoalX =
      targetX >= this.goalLeft && targetX <= this.goalLeft + this.goalWidth
    const isInsideGoalY =
      targetY >= this.goalTop && targetY <= this.goalTop + this.goalHeight

    const isGoal = isInsideGoalX && isInsideGoalY && !this.goalkeeperSaves(targetX)

    if (isGoal) {
      this.goalsScored++
      this.emitScoreUpdate(this.goalsScored)
      const points = this.pointsForPosition(targetX, targetY)
      this.showResult(points >= 5 ? '⭐ GOAL!' : 'GOAL!', '#30d860')
    } else if (isInsideGoalX && isInsideGoalY) {
      this.showResult('SAVED!', '#e83030')
    } else {
      this.showResult('MISS!', '#e87830')
    }

    this.updateHud()

    this.time.delayedCall(RESULT_DISPLAY_DURATION_MILLISECONDS, () => {
      if (this.shotsRemaining <= 0) {
        this.endRound()
      } else {
        this.resetForNextShot()
      }
    })
  }

  private goalkeeperSaves(targetX: number): boolean {
    const keeperReach = this.scale.width * 0.06
    return Math.abs(this.goalkeeperPosition.x - targetX) < keeperReach
  }

  private pointsForPosition(targetX: number, targetY: number): number {
    const horizontalFraction = (targetX - this.goalLeft) / this.goalWidth
    const verticalFraction = (targetY - this.goalTop) / this.goalHeight
    const isCorner = horizontalFraction < 0.2 || horizontalFraction > 0.8
    const isTop = verticalFraction < 0.35
    if (isCorner && isTop) return 5
    if (isCorner || isTop) return 3
    return 1
  }

  private resetForNextShot(): void {
    const width = this.scale.width

    this.ballPosition.set(width / 2, this.scale.height * 0.72)
    this.goalkeeperPosition.set(
      width / 2,
      this.goalTop + this.goalHeight * 0.55,
    )
    this.drawBall()
    this.drawGoalkeeper()
    this.shotPhase = 'aiming'
  }

  private endRound(): void {
    this.shotPhase = 'done'
    const stars = this.calculateStarsFromScore(
      this.goalsScored,
      THREE_STAR_GOALS,
      TWO_STAR_GOALS,
    )
    this.emitGameOver(stars)
  }

  update(_time: number, _delta: number): void {
    // Input handled via pointer events; no per-frame work needed at this stage.
  }
}

export { SCENE_KEY as PENALTY_KICK_SCENE_KEY }
