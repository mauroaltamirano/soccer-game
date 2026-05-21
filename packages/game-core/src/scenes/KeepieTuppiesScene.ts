import Phaser from 'phaser'
import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'KeepieTuppiesScene'

// Ball
const BALL_SPEED = 340
const BALL_RADIUS_FRACTION = 0.025

// Paddle
const PADDLE_WIDTH_FRACTION = 0.26
const PADDLE_HEIGHT_FRACTION = 0.022

// Defender grid
const DEFENDER_ROWS = 4
const DEFENDER_COLS = 7
const DEFENDER_MARGIN_FRACTION = 0.04
const DEFENDER_ROW_GAP = 5
const DEFENDER_COL_GAP = 4

// Scoring
const POINTS_PER_DEFENDER = 10
const VICTORY_BONUS = 150
const THREE_STAR_SCORE = 380
const TWO_STAR_SCORE = 180

const MAX_LIVES = 3

const ROW_COLORS: readonly number[] = [0xe83030, 0xf5a623, 0x22bb66, 0x5ba4d8]

interface DefenderBlock {
  graphics: Phaser.GameObjects.Graphics
  centerX: number
  centerY: number
  halfWidth: number
  halfHeight: number
  row: number
  alive: boolean
}

export class KeepieTuppiesScene extends MiniGameScene {
  private backgroundGraphics!: Phaser.GameObjects.Graphics
  private paddleGraphics!: Phaser.GameObjects.Graphics
  private ballGraphics!: Phaser.GameObjects.Graphics
  private hudText!: Phaser.GameObjects.Text
  private promptText!: Phaser.GameObjects.Text

  private ballX = 0
  private ballY = 0
  private ballVelocityX = 0
  private ballVelocityY = 0
  private ballRadius = 0

  private paddleX = 0
  private paddleHalfWidth = 0
  private paddleY = 0
  private paddleHalfHeight = 0

  private defenders: DefenderBlock[] = []
  private defendersAlive = 0
  private lives = MAX_LIVES
  private waiting = true
  private isGameOver = false

  constructor() {
    super({ key: SCENE_KEY })
  }

  create(): void {
    const { width, height } = this.scale

    this.defenders = []
    this.lives = MAX_LIVES
    this.currentScore = 0
    this.waiting = true
    this.isGameOver = false

    this.ballRadius = width * BALL_RADIUS_FRACTION
    this.paddleHalfWidth = (width * PADDLE_WIDTH_FRACTION) / 2
    this.paddleHalfHeight = (height * PADDLE_HEIGHT_FRACTION) / 2
    this.paddleX = width / 2
    this.paddleY = height * 0.87

    this.backgroundGraphics = this.add.graphics()
    this.drawBackground()

    this.buildDefenders()

    this.paddleGraphics = this.add.graphics()
    this.ballGraphics = this.add.graphics()

    this.hudText = this.add
      .text(width / 2, 10, '', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff' })
      .setOrigin(0.5, 0)

    this.promptText = this.add
      .text(width / 2, height * 0.68, 'TAP TO LAUNCH', { fontFamily: 'monospace', fontSize: '13px', color: '#f5d800' })
      .setOrigin(0.5)

    this.placeBallOnPaddle()
    this.drawPaddle()
    this.drawBall()
    this.updateHud()

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return
      this.movePaddleTo(pointer.x)
      if (this.waiting) this.launch()
    })
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver || !pointer.isDown) return
      this.movePaddleTo(pointer.x)
      if (this.waiting) this.placeBallOnPaddle()
    })

    this.emitGameReady()
  }

  // ─── Setup ───────────────────────────────────────────────────────────────────

  private buildDefenders(): void {
    const { width, height } = this.scale
    const marginX = width * DEFENDER_MARGIN_FRACTION
    const availableWidth = width - marginX * 2
    const halfWidth = (availableWidth - DEFENDER_COL_GAP * (DEFENDER_COLS - 1)) / DEFENDER_COLS / 2
    const halfHeight = height * 0.034
    const startY = height * 0.10 + halfHeight

    this.defendersAlive = 0

    for (let row = 0; row < DEFENDER_ROWS; row++) {
      const centerY = startY + row * (halfHeight * 2 + DEFENDER_ROW_GAP)
      for (let col = 0; col < DEFENDER_COLS; col++) {
        const centerX = marginX + col * (halfWidth * 2 + DEFENDER_COL_GAP) + halfWidth
        const g = this.add.graphics()
        const block: DefenderBlock = { graphics: g, centerX, centerY, halfWidth, halfHeight, row, alive: true }
        this.defenders.push(block)
        this.drawDefenderBlock(block)
        this.defendersAlive++
      }
    }
  }

  private drawDefenderBlock(block: DefenderBlock): void {
    const g = block.graphics
    g.clear()
    if (!block.alive) return

    const { centerX: cx, centerY: cy, halfWidth: hw, halfHeight: hh, row } = block
    const color = ROW_COLORS[row] ?? 0xaaaaaa

    g.fillStyle(color)
    g.fillRect(cx - hw, cy - hh, hw * 2, hh * 2)
    // highlight top
    g.fillStyle(0xffffff, 0.3)
    g.fillRect(cx - hw, cy - hh, hw * 2, 3)
    // shadow bottom
    g.fillStyle(0x000000, 0.25)
    g.fillRect(cx - hw, cy + hh - 3, hw * 2, 3)
    // little head on top
    g.fillStyle(0xf4c098)
    g.fillCircle(cx, cy - hh - 5, 5)
  }

  // ─── Paddle & ball helpers ────────────────────────────────────────────────────

  private movePaddleTo(screenX: number): void {
    this.paddleX = Phaser.Math.Clamp(
      screenX,
      this.paddleHalfWidth,
      this.scale.width - this.paddleHalfWidth,
    )
  }

  private placeBallOnPaddle(): void {
    this.ballX = this.paddleX
    this.ballY = this.paddleY - this.paddleHalfHeight - this.ballRadius - 2
    this.ballVelocityX = 0
    this.ballVelocityY = 0
  }

  private launch(): void {
    this.waiting = false
    this.promptText.setVisible(false)
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3)
    this.ballVelocityX = Math.cos(angle) * BALL_SPEED
    this.ballVelocityY = Math.sin(angle) * BALL_SPEED
  }

  // ─── Drawing ─────────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const { width, height } = this.scale
    const g = this.backgroundGraphics
    g.clear()

    // Sky / crowd strip
    g.fillStyle(0x5ba4d8)
    g.fillRect(0, 0, width, height * 0.10)

    // Goal post outline
    g.lineStyle(4, 0xffffff)
    g.strokeRect(width * 0.06, 2, width * 0.88, height * 0.10)

    // Pitch surface
    g.fillStyle(0x22883a)
    g.fillRect(0, height * 0.10, width, height)

    // Pitch stripes
    g.fillStyle(0x1e7d35, 0.5)
    const stripeWidth = width / 8
    for (let i = 0; i < 8; i += 2) g.fillRect(i * stripeWidth, height * 0.10, stripeWidth, height)

    // Goal line
    g.lineStyle(2, 0xf0f0d0, 0.4)
    g.lineBetween(0, height * 0.10, width, height * 0.10)
  }

  private drawPaddle(): void {
    const g = this.paddleGraphics
    g.clear()
    const { paddleX: cx, paddleY: cy, paddleHalfWidth: hw, paddleHalfHeight: hh } = this

    // shadow
    g.fillStyle(0x000000, 0.25)
    g.fillRoundedRect(cx - hw + 2, cy - hh + 3, hw * 2, hh * 2, 6)
    // body
    g.fillStyle(0xf5d800)
    g.fillRoundedRect(cx - hw, cy - hh, hw * 2, hh * 2, 6)
    // shine
    g.fillStyle(0xffffff, 0.35)
    g.fillRoundedRect(cx - hw + 4, cy - hh + 2, hw * 2 - 8, 4, 2)
    // player head
    g.fillStyle(0xf4c098)
    g.fillCircle(cx, cy - hh - 8, 7)
    g.fillStyle(0x1a1a1a)
    g.fillCircle(cx - 2, cy - hh - 9, 1.5)
    g.fillCircle(cx + 2, cy - hh - 9, 1.5)
  }

  private drawBall(): void {
    const g = this.ballGraphics
    g.clear()
    const r = this.ballRadius
    const { ballX: bx, ballY: by } = this

    g.fillStyle(0x000000, 0.2)
    g.fillEllipse(bx + 2, by + 3, r * 2.2, r * 0.7)
    g.fillStyle(0xf4f4f0)
    g.fillCircle(bx, by, r)
    g.fillStyle(0x1a1a1a)
    g.fillCircle(bx, by - r * 0.35, r * 0.28)
    g.fillCircle(bx - r * 0.42, by + r * 0.28, r * 0.22)
    g.fillCircle(bx + r * 0.42, by + r * 0.28, r * 0.22)
  }

  private updateHud(): void {
    this.hudText.setText(`Score: ${this.currentScore}   Lives: ${this.lives}`)
    this.emitScoreUpdate(this.currentScore)
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  update(_time: number, deltaMs: number): void {
    if (!this.isGameOver && !this.waiting) {
      const dt = deltaMs / 1000
      this.ballX += this.ballVelocityX * dt
      this.ballY += this.ballVelocityY * dt

      this.bounceOffWalls()
      this.checkPaddleHit()
      this.checkDefenderHits()
      this.checkBallLost()
    }

    this.drawPaddle()
    this.drawBall()
  }

  // ─── Physics ─────────────────────────────────────────────────────────────────

  private bounceOffWalls(): void {
    const { width } = this.scale
    const r = this.ballRadius

    if (this.ballX - r < 0) {
      this.ballX = r
      this.ballVelocityX = Math.abs(this.ballVelocityX)
    } else if (this.ballX + r > width) {
      this.ballX = width - r
      this.ballVelocityX = -Math.abs(this.ballVelocityX)
    }

    if (this.ballY - r < 0) {
      this.ballY = r
      this.ballVelocityY = Math.abs(this.ballVelocityY)
    }
  }

  private checkPaddleHit(): void {
    const { paddleX: cx, paddleY: cy, paddleHalfWidth: hw, paddleHalfHeight: hh } = this
    const r = this.ballRadius

    const ballMovingDown = this.ballVelocityY > 0
    const ballOverlapsHorizontally = this.ballX + r > cx - hw && this.ballX - r < cx + hw
    const ballOverlapsVertically = this.ballY + r > cy - hh && this.ballY - r < cy + hh

    if (ballMovingDown && ballOverlapsHorizontally && ballOverlapsVertically) {
      // Map hit position to bounce angle: centre = straight up, edges = 60° off-vertical
      const hitFraction = (this.ballX - cx) / hw
      const bounceAngle = Phaser.Math.Clamp(hitFraction, -1, 1) * (Math.PI / 3)
      this.ballVelocityX = Math.sin(bounceAngle) * BALL_SPEED
      this.ballVelocityY = -Math.abs(Math.cos(bounceAngle) * BALL_SPEED)
      this.ballY = cy - hh - r
    }
  }

  private checkDefenderHits(): void {
    const r = this.ballRadius

    for (const block of this.defenders) {
      if (!block.alive) continue

      const closestX = Phaser.Math.Clamp(this.ballX, block.centerX - block.halfWidth, block.centerX + block.halfWidth)
      const closestY = Phaser.Math.Clamp(this.ballY, block.centerY - block.halfHeight, block.centerY + block.halfHeight)
      const dx = this.ballX - closestX
      const dy = this.ballY - closestY

      if (dx * dx + dy * dy >= r * r) continue

      block.alive = false
      block.graphics.clear()
      this.defendersAlive--
      this.currentScore += POINTS_PER_DEFENDER
      this.updateHud()

      // Reflect off the axis with less overlap (closest to a face)
      const overlapTop = (this.ballY + r) - (block.centerY - block.halfHeight)
      const overlapBottom = (block.centerY + block.halfHeight) - (this.ballY - r)
      const overlapLeft = (this.ballX + r) - (block.centerX - block.halfWidth)
      const overlapRight = (block.centerX + block.halfWidth) - (this.ballX - r)
      const minVertical = Math.min(overlapTop, overlapBottom)
      const minHorizontal = Math.min(overlapLeft, overlapRight)

      if (minVertical <= minHorizontal) {
        this.ballVelocityY *= -1
      } else {
        this.ballVelocityX *= -1
      }

      this.cameras.main.shake(35, 0.005)

      if (this.defendersAlive === 0) {
        this.endGame(true)
        return
      }
    }
  }

  private checkBallLost(): void {
    if (this.ballY - this.ballRadius <= this.scale.height) return

    this.lives--
    this.updateHud()

    if (this.lives <= 0) {
      this.endGame(false)
    } else {
      this.waiting = true
      this.placeBallOnPaddle()
      this.promptText.setText('TAP TO CONTINUE').setVisible(true)
    }
  }

  private endGame(victory: boolean): void {
    this.isGameOver = true
    this.time.delayedCall(500, () => {
      if (victory) this.currentScore += VICTORY_BONUS
      const stars = this.calculateStarsFromScore(this.currentScore, THREE_STAR_SCORE, TWO_STAR_SCORE)
      this.emitGameOver(stars)
    })
  }
}

export { SCENE_KEY as KEEPIE_TUPPIES_SCENE_KEY }
