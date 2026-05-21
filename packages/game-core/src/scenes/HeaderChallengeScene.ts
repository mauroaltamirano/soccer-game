import Phaser from 'phaser'
import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'HeaderChallengeScene'

const TOTAL_CROSSES = 8
const THREE_STAR_SCORE = 7
const TWO_STAR_SCORE = 4

const CROSS_FLIGHT_MILLISECONDS = 1400
const SWEET_SPOT_BASE_WINDOW_MILLISECONDS = 400
const WINDOW_SHRINK_PER_STREAK = 30
const MINIMUM_WINDOW_MILLISECONDS = 150
const RESULT_DISPLAY_MILLISECONDS = 900
const SWIPE_DIRECTION_WINDOW_MILLISECONDS = 200

type RoundPhase = 'waiting' | 'crossing' | 'window' | 'result' | 'done'

export class HeaderChallengeScene extends MiniGameScene {
  private crossesRemaining = TOTAL_CROSSES
  private consecutiveGoals = 0
  private roundPhase: RoundPhase = 'waiting'

  private backgroundGraphics!: Phaser.GameObjects.Graphics
  private goalGraphics!: Phaser.GameObjects.Graphics
  private keeperGraphics!: Phaser.GameObjects.Graphics
  private playerGraphics!: Phaser.GameObjects.Graphics
  private crossingPlayerGraphics!: Phaser.GameObjects.Graphics
  private ballGraphics!: Phaser.GameObjects.Graphics
  private sweetSpotGraphics!: Phaser.GameObjects.Graphics
  private hudText!: Phaser.GameObjects.Text
  private resultText!: Phaser.GameObjects.Text

  private goalLeft = 0
  private goalTop = 0
  private goalWidth = 0
  private goalHeight = 0

  private playerPosition!: Phaser.Math.Vector2
  private ballPosition!: Phaser.Math.Vector2
  private crossingPlayerX = 0

  private windowOpenTime = 0
  private windowDurationMilliseconds = SWEET_SPOT_BASE_WINDOW_MILLISECONDS
  private sweetSpotActive = false
  private headerAttempted = false
  private lastTapTime = 0
  private swipeDirection: 'left' | 'right' | 'centre' = 'centre'
  private pointerDownX = 0

  constructor() {
    super({ key: SCENE_KEY })
  }

  create(): void {
    const width = this.scale.width
    const height = this.scale.height

    this.crossesRemaining = TOTAL_CROSSES
    this.consecutiveGoals = 0
    this.currentScore = 0
    this.roundPhase = 'waiting'

    this.goalWidth = width * 0.5
    this.goalHeight = height * 0.2
    this.goalLeft = (width - this.goalWidth) / 2
    this.goalTop = height * 0.05

    this.playerPosition = new Phaser.Math.Vector2(width / 2, height * 0.55)
    this.ballPosition = new Phaser.Math.Vector2(-40, height * 0.3)
    this.crossingPlayerX = -50

    this.backgroundGraphics = this.add.graphics()
    this.goalGraphics = this.add.graphics()
    this.keeperGraphics = this.add.graphics()
    this.crossingPlayerGraphics = this.add.graphics()
    this.sweetSpotGraphics = this.add.graphics()
    this.playerGraphics = this.add.graphics()
    this.ballGraphics = this.add.graphics()

    this.hudText = this.add
      .text(width / 2, height * 0.03, '', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff' })
      .setOrigin(0.5, 0)

    this.resultText = this.add
      .text(width / 2, height * 0.42, '', { fontFamily: 'monospace', fontSize: '20px', color: '#30d860' })
      .setOrigin(0.5)
      .setVisible(false)

    this.drawBackground()
    this.drawGoal()
    this.drawKeeper()
    this.drawPlayer(false)

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this)
    this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this)

    this.updateHud()
    this.emitGameReady()
    this.time.delayedCall(600, () => this.beginNextCross())
  }

  // ─── Drawing ─────────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const w = this.scale.width
    const h = this.scale.height
    const g = this.backgroundGraphics
    g.fillStyle(0x5ba4d8).fillRect(0, 0, w, h * 0.1)
    g.fillStyle(0x22883a).fillRect(0, h * 0.1, w, h)
    g.fillStyle(0x1a6b2a)
    const sw = w / 5
    for (let i = 0; i < 5; i += 2) g.fillRect(i * sw, h * 0.1, sw, h)
    g.lineStyle(2, 0xf0f0d0, 0.4)
    g.strokeRect((w - w * 0.75) / 2, h * 0.1, w * 0.75, h * 0.65)
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

  private drawKeeper(): void {
    const g = this.keeperGraphics
    g.clear()
    const keeperX = this.goalLeft + this.goalWidth / 2
    const keeperY = this.goalTop + this.goalHeight * 0.55
    const w = this.goalWidth * 0.1
    const h = this.goalHeight * 0.8
    g.fillStyle(0x1e90ff).fillRect(keeperX - w / 2, keeperY - h / 2, w, h)
  }

  private drawPlayer(jumping: boolean): void {
    const g = this.playerGraphics
    g.clear()
    const px = this.playerPosition.x
    const py = this.playerPosition.y + (jumping ? -this.scale.height * 0.06 : 0)
    const bodyH = this.scale.height * 0.1

    g.fillStyle(0x22aa44).fillRect(px - 10, py - bodyH * 0.55, 20, bodyH * 1.1)
    g.fillStyle(0xf4c098).fillCircle(px, py - bodyH * 0.6, 10)

    if (jumping) {
      // Arms raised
      g.fillStyle(0x22aa44)
      g.fillRect(px - 22, py - bodyH * 0.5, 12, 6)
      g.fillRect(px + 10, py - bodyH * 0.5, 12, 6)
    }
  }

  private drawCrossingPlayer(): void {
    const g = this.crossingPlayerGraphics
    g.clear()
    const h = this.scale.height
    if (this.crossingPlayerX < -30) return
    g.fillStyle(0xe83030).fillRect(this.crossingPlayerX - 9, h * 0.62, 18, 30)
    g.fillStyle(0xf4c098).fillCircle(this.crossingPlayerX, h * 0.59, 9)
  }

  private drawBall(): void {
    const g = this.ballGraphics
    g.clear()
    if (this.ballPosition.x < -20) return
    const r = this.scale.width * 0.022
    g.fillStyle(0x000000, 0.25).fillEllipse(this.ballPosition.x + 2, this.ballPosition.y + 3, r * 2.2, r * 0.7)
    g.fillStyle(0xf4f4f0).fillCircle(this.ballPosition.x, this.ballPosition.y, r)
    g.fillStyle(0x1a1a1a).fillCircle(this.ballPosition.x, this.ballPosition.y - r * 0.4, r * 0.28)
  }

  private drawSweetSpotIndicator(alpha: number): void {
    const g = this.sweetSpotGraphics
    g.clear()
    if (!this.sweetSpotActive) return
    const px = this.playerPosition.x
    const py = this.playerPosition.y - this.scale.height * 0.05
    const radius = 28
    g.lineStyle(3, 0xf5d800, alpha)
    g.strokeCircle(px, py, radius)
    g.lineStyle(1, 0xffffff, alpha * 0.5)
    g.strokeCircle(px, py, radius * 0.6)
  }

  // ─── Round logic ─────────────────────────────────────────────────────────────

  private beginNextCross(): void {
    this.roundPhase = 'crossing'
    this.headerAttempted = false
    this.sweetSpotActive = false
    this.swipeDirection = 'centre'
    this.crossingPlayerX = -50
    this.ballPosition.set(-40, this.scale.height * 0.3)

    this.windowDurationMilliseconds = Math.max(
      SWEET_SPOT_BASE_WINDOW_MILLISECONDS - this.consecutiveGoals * WINDOW_SHRINK_PER_STREAK,
      MINIMUM_WINDOW_MILLISECONDS,
    )

    // Crossing player slides in from left
    this.tweens.add({
      targets: { value: -50 },
      value: this.scale.width * 0.05,
      duration: 400,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const target = tween.targets[0] as { value: number }
        this.crossingPlayerX = target.value
        this.drawCrossingPlayer()
      },
      onComplete: () => {
        // Ball flies along a parabolic arc toward the header zone
        const peakX = this.playerPosition.x
        const peakY = this.playerPosition.y - this.scale.height * 0.08

        this.tweens.add({
          targets: this.ballPosition,
          x: peakX,
          y: peakY,
          duration: CROSS_FLIGHT_MILLISECONDS,
          ease: 'Sine.easeOut',
          onUpdate: () => this.drawBall(),
          onComplete: () => this.openHeaderWindow(),
        })
      },
    })
  }

  private openHeaderWindow(): void {
    this.roundPhase = 'window'
    this.sweetSpotActive = true
    this.windowOpenTime = this.time.now
    this.drawPlayer(true)

    // Pulse the sweet spot indicator
    this.tweens.add({
      targets: { alpha: 1 },
      alpha: 0.2,
      duration: this.windowDurationMilliseconds / 2,
      yoyo: true,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const target = tween.targets[0] as { alpha: number }
        this.drawSweetSpotIndicator(target.alpha)
      },
    })

    // Window closes after duration
    this.time.delayedCall(this.windowDurationMilliseconds, () => {
      if (!this.headerAttempted) this.resolveHeader(false)
    })
  }

  private resolveHeader(successful: boolean): void {
    if (this.roundPhase === 'result' || this.roundPhase === 'done') return
    this.roundPhase = 'result'
    this.headerAttempted = true
    this.sweetSpotActive = false
    this.sweetSpotGraphics.clear()
    this.crossesRemaining--

    if (successful) {
      this.consecutiveGoals++
      this.currentScore++
      this.emitScoreUpdate(this.currentScore, this.consecutiveGoals > 2 ? this.consecutiveGoals : undefined)
      const dirLabel = this.swipeDirection === 'left' ? ' LEFT' : this.swipeDirection === 'right' ? ' RIGHT' : ''
      this.showResult(`GOAL!${dirLabel}`, '#30d860')
    } else {
      this.consecutiveGoals = 0
      this.showResult('MISSED!', '#e83030')
    }

    this.drawPlayer(false)
    this.updateHud()

    this.time.delayedCall(RESULT_DISPLAY_MILLISECONDS, () => {
      if (this.crossesRemaining <= 0) {
        this.endRound()
      } else {
        this.ballPosition.set(-40, this.scale.height * 0.3)
        this.drawBall()
        this.crossingPlayerX = -50
        this.drawCrossingPlayer()
        this.time.delayedCall(400, () => this.beginNextCross())
      }
    })
  }

  private showResult(message: string, color: string): void {
    this.resultText.setText(message).setColor(color).setVisible(true)
    this.time.delayedCall(RESULT_DISPLAY_MILLISECONDS, () => this.resultText.setVisible(false))
  }

  private updateHud(): void {
    const windowMs = this.windowDurationMilliseconds
    this.hudText.setText(
      `Goals: ${this.currentScore}/${TOTAL_CROSSES}  Window: ${windowMs}ms`
    )
  }

  private endRound(): void {
    this.roundPhase = 'done'
    const stars = this.calculateStarsFromScore(this.currentScore, THREE_STAR_SCORE, TWO_STAR_SCORE)
    this.emitGameOver(stars)
  }

  // ─── Input ───────────────────────────────────────────────────────────────────

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.pointerDownX = pointer.x
    this.lastTapTime = this.time.now
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.roundPhase !== 'window') return
    if (this.headerAttempted) return

    const swipeDelta = pointer.x - this.pointerDownX
    const elapsed = this.time.now - this.lastTapTime

    if (Math.abs(swipeDelta) > 25 && elapsed < SWIPE_DIRECTION_WINDOW_MILLISECONDS) {
      this.swipeDirection = swipeDelta < 0 ? 'left' : 'right'
    } else {
      this.swipeDirection = 'centre'
    }

    const timeSinceWindowOpen = this.time.now - this.windowOpenTime
    const successfulHeader = timeSinceWindowOpen <= this.windowDurationMilliseconds

    this.resolveHeader(successfulHeader)
  }

  update(_time: number, _delta: number): void {
    // All state driven by tweens and timers.
  }
}

export { SCENE_KEY as HEADER_CHALLENGE_SCENE_KEY }
