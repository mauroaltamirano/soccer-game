import Phaser from 'phaser'
import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'FreeKickScene'

const TOTAL_KICKS = 3
const THREE_STAR_SCORE = 15
const TWO_STAR_SCORE = 8

const WALL_JUMP_DELAY_MILLISECONDS = 220
const BALL_FLIGHT_MILLISECONDS = 550
const RESULT_DISPLAY_MILLISECONDS = 1200

type KickPhase = 'aiming' | 'power' | 'flying' | 'result' | 'done'

export class FreeKickScene extends MiniGameScene {
  private kicksRemaining = TOTAL_KICKS
  private kickPhase: KickPhase = 'aiming'

  private backgroundGraphics!: Phaser.GameObjects.Graphics
  private goalGraphics!: Phaser.GameObjects.Graphics
  private wallGraphics!: Phaser.GameObjects.Graphics
  private keeperGraphics!: Phaser.GameObjects.Graphics
  private ballGraphics!: Phaser.GameObjects.Graphics
  private aimGraphics!: Phaser.GameObjects.Graphics
  private hudText!: Phaser.GameObjects.Text
  private resultText!: Phaser.GameObjects.Text
  private instructionText!: Phaser.GameObjects.Text

  private goalLeft = 0
  private goalTop = 0
  private goalWidth = 0
  private goalHeight = 0

  private wallY = 0
  private wallDefenderCount = 3

  private ballPosition!: Phaser.Math.Vector2
  private keeperPosition!: Phaser.Math.Vector2
  private wallJumped = false

  private aimTargetX = 0
  private aimTargetY = 0
  private powerRatio = 0
  private powerBarActive = false
  private powerBarStartTime = 0

  private curlDirection = 0 // -1 left, 0 none, +1 right
  private swipeStartX = 0

  constructor() {
    super({ key: SCENE_KEY })
  }

  create(): void {
    const width = this.scale.width
    const height = this.scale.height

    this.kicksRemaining = TOTAL_KICKS
    this.currentScore = 0
    this.kickPhase = 'aiming'

    this.goalWidth = width * 0.55
    this.goalHeight = height * 0.13
    this.goalLeft = (width - this.goalWidth) / 2
    this.goalTop = height * 0.1

    this.wallY = height * 0.45
    this.wallDefenderCount = 3

    this.ballPosition = new Phaser.Math.Vector2(width / 2, height * 0.75)
    this.keeperPosition = new Phaser.Math.Vector2(
      width / 2,
      this.goalTop + this.goalHeight * 0.55,
    )

    this.backgroundGraphics = this.add.graphics()
    this.goalGraphics = this.add.graphics()
    this.wallGraphics = this.add.graphics()
    this.keeperGraphics = this.add.graphics()
    this.aimGraphics = this.add.graphics()
    this.ballGraphics = this.add.graphics()

    this.hudText = this.add
      .text(width / 2, height * 0.03, '', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff' })
      .setOrigin(0.5, 0)

    this.resultText = this.add
      .text(width / 2, height * 0.47, '', { fontFamily: 'monospace', fontSize: '20px', color: '#f5d800' })
      .setOrigin(0.5)
      .setVisible(false)

    this.instructionText = this.add
      .text(width / 2, height * 0.94, 'DRAG to aim  •  HOLD & RELEASE to shoot', {
        fontFamily: 'monospace', fontSize: '9px', color: '#9090b0',
      })
      .setOrigin(0.5)

    this.drawBackground()
    this.drawGoal()
    this.drawWall(false)
    this.drawKeeper()
    this.drawBall()
    this.updateHud()

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this)
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this)
    this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this)

    this.emitGameReady()
  }

  // ─── Drawing ─────────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const w = this.scale.width
    const h = this.scale.height
    const g = this.backgroundGraphics
    g.fillStyle(0x5ba4d8).fillRect(0, 0, w, h * 0.07)
    g.fillStyle(0x22883a).fillRect(0, h * 0.07, w, h)
    g.fillStyle(0x1a6b2a)
    const stripe = w / 6
    for (let i = 0; i < 6; i += 2) g.fillRect(i * stripe, h * 0.07, stripe, h)
  }

  private drawGoal(): void {
    const g = this.goalGraphics
    g.clear()
    g.fillStyle(0x000000, 0.4).fillRect(this.goalLeft, this.goalTop, this.goalWidth, this.goalHeight)
    g.lineStyle(1, 0xffffff, 0.2)
    for (let x = this.goalLeft; x <= this.goalLeft + this.goalWidth; x += 12)
      g.lineBetween(x, this.goalTop, x, this.goalTop + this.goalHeight)
    for (let y = this.goalTop; y <= this.goalTop + this.goalHeight; y += 12)
      g.lineBetween(this.goalLeft, y, this.goalLeft + this.goalWidth, y)
    g.lineStyle(4, 0xffffff, 1).strokeRect(this.goalLeft, this.goalTop, this.goalWidth, this.goalHeight)
  }

  private drawWall(jumped: boolean): void {
    const g = this.wallGraphics
    g.clear()
    const width = this.scale.width
    const defenderWidth = 16
    const defenderHeight = jumped ? 42 : 30
    const totalWallWidth = this.wallDefenderCount * (defenderWidth + 2)
    const wallStartX = width / 2 - totalWallWidth / 2
    const baseY = jumped ? this.wallY - 14 : this.wallY

    for (let index = 0; index < this.wallDefenderCount; index++) {
      const defenderX = wallStartX + index * (defenderWidth + 2)
      g.fillStyle(0xe83030)
      g.fillRect(defenderX, baseY - defenderHeight, defenderWidth, defenderHeight)
      g.fillStyle(0xf4c098)
      g.fillCircle(defenderX + defenderWidth / 2, baseY - defenderHeight - 6, 6)
    }
  }

  private drawKeeper(): void {
    const g = this.keeperGraphics
    g.clear()
    const w = this.scale.width * 0.06
    const h = this.goalHeight * 0.85
    g.fillStyle(0x1e90ff)
    g.fillRect(this.keeperPosition.x - w / 2, this.keeperPosition.y - h / 2, w, h)
  }

  private drawBall(): void {
    const g = this.ballGraphics
    g.clear()
    const r = this.scale.width * 0.024
    g.fillStyle(0x000000, 0.3).fillEllipse(this.ballPosition.x + 2, this.ballPosition.y + 3, r * 2.2, r * 0.7)
    g.fillStyle(0xf4f4f0).fillCircle(this.ballPosition.x, this.ballPosition.y, r)
    g.fillStyle(0x1a1a1a).fillCircle(this.ballPosition.x, this.ballPosition.y - r * 0.4, r * 0.28)
  }

  private drawAimIndicator(): void {
    if (this.kickPhase !== 'aiming') return
    const g = this.aimGraphics
    g.clear()
    const dx = this.aimTargetX - this.ballPosition.x
    const dy = this.aimTargetY - this.ballPosition.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 5) return

    const nx = dx / dist
    const ny = dy / dist
    const lineLen = Math.min(dist, this.scale.height * 0.35)

    g.lineStyle(2, 0xffffff, 0.45)
    let drawn = 0
    let isDash = true
    while (drawn < lineLen) {
      const seg = isDash ? 8 : 5
      if (isDash) {
        const sx = this.ballPosition.x + nx * drawn
        const sy = this.ballPosition.y + ny * drawn
        const ex = this.ballPosition.x + nx * Math.min(drawn + seg, lineLen)
        const ey = this.ballPosition.y + ny * Math.min(drawn + seg, lineLen)
        g.lineBetween(sx, sy, ex, ey)
      }
      drawn += seg
      isDash = !isDash
    }
  }

  private drawPowerBar(): void {
    if (!this.powerBarActive) return
    const elapsed = this.time.now - this.powerBarStartTime
    this.powerRatio = Math.min(elapsed / 1200, 1)

    const g = this.aimGraphics
    g.clear()
    const barW = this.scale.width * 0.3
    const barH = 10
    const barX = this.scale.width / 2 - barW / 2
    const barY = this.scale.height * 0.86
    g.fillStyle(0x333333, 0.8).fillRect(barX, barY, barW, barH)
    g.fillStyle(this.powerRatio > 0.75 ? 0xe83030 : 0x30d860).fillRect(barX, barY, barW * this.powerRatio, barH)
    g.lineStyle(1, 0xffffff, 0.6).strokeRect(barX, barY, barW, barH)
  }

  private updateHud(): void {
    this.hudText.setText(`Kicks: ${this.kicksRemaining}  Score: ${this.currentScore}`)
    this.emitScoreUpdate(this.currentScore)
  }

  // ─── Input ───────────────────────────────────────────────────────────────────

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.kickPhase === 'aiming') {
      this.aimTargetX = pointer.x
      this.aimTargetY = pointer.y
      this.drawAimIndicator()
    } else if (this.kickPhase === 'power') {
      this.powerBarActive = true
      this.powerBarStartTime = this.time.now
      this.swipeStartX = pointer.x
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.kickPhase === 'aiming') {
      this.aimTargetX = pointer.x
      this.aimTargetY = pointer.y
      this.drawAimIndicator()
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.kickPhase === 'aiming') {
      this.kickPhase = 'power'
      this.aimGraphics.clear()
      this.instructionText.setText('HOLD to charge  •  RELEASE to shoot')
    } else if (this.kickPhase === 'power' && this.powerBarActive) {
      const swipeDelta = pointer.x - this.swipeStartX
      this.curlDirection = Math.abs(swipeDelta) > 20 ? Math.sign(swipeDelta) : 0
      this.powerBarActive = false
      this.kick()
    }
  }

  // ─── Game logic ──────────────────────────────────────────────────────────────

  private kick(): void {
    this.kickPhase = 'flying'
    this.aimGraphics.clear()
    this.wallJumped = false

    const dx = this.aimTargetX - this.ballPosition.x
    const dy = this.aimTargetY - this.ballPosition.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = dx / dist
    const ny = dy / dist

    const range = this.scale.height * 0.75 * this.powerRatio
    const curlOffset = this.curlDirection * this.scale.width * 0.12

    const rawTargetX = this.ballPosition.x + nx * range + curlOffset
    const rawTargetY = this.ballPosition.y + ny * range

    const targetX = Phaser.Math.Clamp(rawTargetX, 0, this.scale.width)
    const targetY = Phaser.Math.Clamp(rawTargetY, -20, this.scale.height * 0.9)

    // Wall jump after delay
    this.time.delayedCall(WALL_JUMP_DELAY_MILLISECONDS, () => {
      this.wallJumped = true
      this.drawWall(true)
      this.time.delayedCall(200, () => this.drawWall(false))
    })

    // Goalkeeper reaction
    this.time.delayedCall(300, () => {
      const goalCenterX = this.goalLeft + this.goalWidth / 2
      const diveX = Phaser.Math.Clamp(
        goalCenterX + (targetX - goalCenterX) * 0.65,
        this.goalLeft + 8,
        this.goalLeft + this.goalWidth - 8,
      )
      this.tweens.add({
        targets: this.keeperPosition,
        x: diveX,
        duration: 260,
        ease: 'Back.easeOut',
        onUpdate: () => this.drawKeeper(),
      })
    })

    this.tweens.add({
      targets: this.ballPosition,
      x: targetX,
      y: targetY,
      duration: BALL_FLIGHT_MILLISECONDS,
      ease: 'Sine.easeIn',
      onUpdate: () => this.drawBall(),
      onComplete: () => this.resolveOutcome(targetX, targetY),
    })
  }

  private resolveOutcome(targetX: number, targetY: number): void {
    this.kickPhase = 'result'
    this.kicksRemaining--

    const inGoalX = targetX >= this.goalLeft && targetX <= this.goalLeft + this.goalWidth
    const inGoalY = targetY >= this.goalTop && targetY <= this.goalTop + this.goalHeight
    const keeperSaves = Math.abs(this.keeperPosition.x - targetX) < this.scale.width * 0.06

    let message = 'MISS!'
    let messageColor = '#e87830'

    if (inGoalX && inGoalY && !keeperSaves) {
      const points = this.pointsForPosition(targetX, targetY)
      this.currentScore += points
      this.emitScoreUpdate(this.currentScore)
      message = points >= 5 ? '★ GOAL! +5' : `GOAL! +${points}`
      messageColor = '#30d860'
    } else if (inGoalX && inGoalY) {
      message = 'SAVED!'
      messageColor = '#e83030'
    }

    this.resultText.setText(message).setColor(messageColor).setVisible(true)
    this.time.delayedCall(RESULT_DISPLAY_MILLISECONDS, () => {
      this.resultText.setVisible(false)
      if (this.kicksRemaining <= 0) {
        this.endRound()
      } else {
        this.resetForNextKick()
      }
    })

    this.updateHud()
  }

  private pointsForPosition(targetX: number, targetY: number): number {
    const hFrac = (targetX - this.goalLeft) / this.goalWidth
    const vFrac = (targetY - this.goalTop) / this.goalHeight
    const isCorner = hFrac < 0.2 || hFrac > 0.8
    const isTop = vFrac < 0.35
    if (isCorner && isTop) return 5
    if (isCorner || isTop) return 3
    return 1
  }

  private resetForNextKick(): void {
    const width = this.scale.width
    this.ballPosition.set(width / 2, this.scale.height * 0.75)
    this.keeperPosition.set(width / 2, this.goalTop + this.goalHeight * 0.55)
    this.drawBall()
    this.drawKeeper()
    this.drawWall(false)
    this.kickPhase = 'aiming'
    this.powerRatio = 0
    this.curlDirection = 0
    this.powerBarActive = false
    this.instructionText.setText('DRAG to aim  •  HOLD & RELEASE to shoot')
  }

  private endRound(): void {
    this.kickPhase = 'done'
    const stars = this.calculateStarsFromScore(this.currentScore, THREE_STAR_SCORE, TWO_STAR_SCORE)
    this.emitGameOver(stars)
  }

  update(_time: number, _delta: number): void {
    if (this.powerBarActive) this.drawPowerBar()
  }
}

export { SCENE_KEY as FREE_KICK_SCENE_KEY }
