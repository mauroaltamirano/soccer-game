import Phaser from 'phaser'
import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'KeepieTuppiesScene'

const THREE_STAR_SCORE = 50
const TWO_STAR_SCORE = 20

const INITIAL_GRAVITY = 600
const TAP_IMPULSE = -520
const BALL_RADIUS_FRACTION = 0.04

const COMBO_THRESHOLDS = [
  { atTaps: 20, multiplier: 5 },
  { atTaps: 10, multiplier: 3 },
  { atTaps: 5, multiplier: 2 },
]

const DIFFICULTY_STAGES = [
  { afterSeconds: 120, gravityBonus: 300, windStrength: 80 },
  { afterSeconds: 60, gravityBonus: 200, windStrength: 50 },
  { afterSeconds: 30, gravityBonus: 100, windStrength: 25 },
]

export class KeepieTuppiesScene extends MiniGameScene {
  private ball!: Phaser.Physics.Arcade.Image
  private ballGraphics!: Phaser.GameObjects.Graphics
  private groundGraphics!: Phaser.GameObjects.Graphics
  private backgroundGraphics!: Phaser.GameObjects.Graphics
  private hudText!: Phaser.GameObjects.Text
  private comboText!: Phaser.GameObjects.Text

  private consecutiveTaps = 0
  private elapsedTimeSeconds = 0
  private windVelocityX = 0
  private currentMultiplier = 1
  private isGameOver = false

  constructor() {
    super({ key: SCENE_KEY })
  }

  create(): void {
    const width = this.scale.width
    const height = this.scale.height

    this.consecutiveTaps = 0
    this.currentScore = 0
    this.elapsedTimeSeconds = 0
    this.windVelocityX = 0
    this.isGameOver = false

    this.physics.world.gravity.y = INITIAL_GRAVITY

    this.backgroundGraphics = this.add.graphics()
    this.groundGraphics = this.add.graphics()
    this.drawBackground()
    this.drawGround()

    // Use a transparent circle as the physics body for the ball
    const ballRadius = width * BALL_RADIUS_FRACTION
    const ballTexture = this.createBallTexture(ballRadius)

    this.ball = this.physics.add
      .image(width / 2, height * 0.4, ballTexture)
      .setCircle(ballRadius)

    const body = this.ball.body as Phaser.Physics.Arcade.Body
    body.setMaxVelocityY(900)
    body.setBounce(0.2)

    // Ground collider
    const groundY = height * 0.88
    const ground = this.physics.add.staticImage(width / 2, groundY + 20, '__DEFAULT')
    ground.setDisplaySize(width, 40).refreshBody()

    this.physics.add.collider(this.ball, ground, () => {
      if (!this.isGameOver) this.endGame()
    })

    this.ballGraphics = this.add.graphics()

    this.hudText = this.add
      .text(width / 2, height * 0.04, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0)

    this.comboText = this.add
      .text(width / 2, height * 0.18, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#f5d800',
      })
      .setOrigin(0.5)
      .setVisible(false)

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handleTap, this)

    this.updateHud()
    this.emitGameReady()
  }

  // ─── Texture factory ─────────────────────────────────────────────────────────

  private createBallTexture(radius: number): string {
    const key = 'ball-placeholder'
    if (this.textures.exists(key)) return key

    const size = Math.ceil(radius * 2) + 4
    const g = this.add.graphics()

    g.fillStyle(0xf4f4f0)
    g.fillCircle(size / 2, size / 2, radius)
    g.fillStyle(0x1a1a1a)
    g.fillCircle(size / 2, size / 2 - radius * 0.4, radius * 0.28)
    g.fillCircle(size / 2 - radius * 0.45, size / 2 + radius * 0.3, radius * 0.22)
    g.fillCircle(size / 2 + radius * 0.45, size / 2 + radius * 0.3, radius * 0.22)

    g.generateTexture(key, size, size)
    g.destroy()
    return key
  }

  // ─── Drawing ─────────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const width = this.scale.width
    const height = this.scale.height
    const graphics = this.backgroundGraphics

    graphics.fillStyle(0x5ba4d8)
    graphics.fillRect(0, 0, width, height * 0.55)
    graphics.fillStyle(0x22883a)
    graphics.fillRect(0, height * 0.55, width, height)

    // Crowd silhouette
    graphics.fillStyle(0x1e2030)
    for (let index = 0; index < 8; index++) {
      const headX = (width / 8) * index + width / 16
      graphics.fillCircle(headX, height * 0.52, 10)
      graphics.fillRect(headX - 8, height * 0.52, 16, 16)
    }
  }

  private drawGround(): void {
    const width = this.scale.width
    const height = this.scale.height
    const graphics = this.groundGraphics

    graphics.fillStyle(0x1a6b2a)
    graphics.fillRect(0, height * 0.87, width, height * 0.13)
    graphics.lineStyle(2, 0xf0f0d0, 0.5)
    graphics.lineBetween(0, height * 0.87, width, height * 0.87)
  }

  // ─── Input ───────────────────────────────────────────────────────────────────

  private handleTap(): void {
    if (this.isGameOver) return

    const body = this.ball.body as Phaser.Physics.Arcade.Body
    body.setVelocityY(TAP_IMPULSE)

    this.consecutiveTaps++
    this.currentMultiplier = this.getMultiplierForTaps(this.consecutiveTaps)

    const points = 1 * this.currentMultiplier
    this.currentScore += points
    this.emitScoreUpdate(this.currentScore, this.currentMultiplier)

    this.showComboFeedback()
    this.updateHud()

    // Visual tap pulse on ball
    this.tweens.add({
      targets: this.ball,
      scaleX: 1.3,
      scaleY: 0.8,
      duration: 60,
      yoyo: true,
      ease: 'Sine.easeOut',
    })
  }

  private getMultiplierForTaps(taps: number): number {
    for (const threshold of COMBO_THRESHOLDS) {
      if (taps >= threshold.atTaps) return threshold.multiplier
    }
    return 1
  }

  private showComboFeedback(): void {
    if (this.currentMultiplier <= 1) {
      this.comboText.setVisible(false)
      return
    }
    this.comboText.setText(`×${this.currentMultiplier} COMBO!`).setVisible(true)
    this.tweens.add({
      targets: this.comboText,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        this.comboText.setAlpha(1).setVisible(false)
      },
    })
  }

  // ─── Difficulty progression ───────────────────────────────────────────────────

  private applyDifficultyForTime(elapsedSeconds: number): void {
    for (const stage of DIFFICULTY_STAGES) {
      if (elapsedSeconds >= stage.afterSeconds) {
        this.physics.world.gravity.y = INITIAL_GRAVITY + stage.gravityBonus
        this.windVelocityX = (Math.random() > 0.5 ? 1 : -1) * stage.windStrength
        return
      }
    }
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────────

  private updateHud(): void {
    this.hudText.setText(
      `Taps: ${this.consecutiveTaps}  Score: ${this.currentScore}  ×${this.currentMultiplier}`,
    )
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  private endGame(): void {
    this.isGameOver = true
    this.physics.world.gravity.y = INITIAL_GRAVITY

    const stars = this.calculateStarsFromScore(this.currentScore, THREE_STAR_SCORE, TWO_STAR_SCORE)
    this.emitGameOver(stars)
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return

    this.elapsedTimeSeconds += delta / 1000
    this.applyDifficultyForTime(this.elapsedTimeSeconds)

    // Apply wind drift
    if (this.windVelocityX !== 0) {
      const body = this.ball.body as Phaser.Physics.Arcade.Body
      const currentVelocityX = body.velocity.x
      const targetVelocityX = Phaser.Math.Linear(currentVelocityX, this.windVelocityX, 0.02)
      body.setVelocityX(targetVelocityX)
    }

    // Keep ball within horizontal bounds
    const ballRadius = this.scale.width * BALL_RADIUS_FRACTION
    if (this.ball.x < ballRadius) {
      const body = this.ball.body as Phaser.Physics.Arcade.Body
      body.setVelocityX(Math.abs(body.velocity.x))
    } else if (this.ball.x > this.scale.width - ballRadius) {
      const body = this.ball.body as Phaser.Physics.Arcade.Body
      body.setVelocityX(-Math.abs(body.velocity.x))
    }
  }
}

export { SCENE_KEY as KEEPIE_TUPPIES_SCENE_KEY }
