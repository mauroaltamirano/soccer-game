import Phaser from 'phaser'
import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'KeepieTuppiesScene'

// Ball
const BASE_BALL_SPEED = 300
const SPEED_PER_LEVEL = 22
const MAX_BALL_SPEED = 560
const BALL_RADIUS_FRACTION = 0.025

// Player figure — fixed pixel sizes (scene runs at near-native resolution)
const PLAYER_BODY_HALF_WIDTH = 16
const PLAYER_BODY_HALF_HEIGHT = 17
const PLAYER_HEAD_RADIUS = 9
// Top of body (where the ball bounces)
const PLAYER_HIT_TOP = PLAYER_BODY_HALF_HEIGHT

// Defender grid
const BASE_DEFENDER_ROWS = 4
const MAX_DEFENDER_ROWS = 6
const DEFENDER_COLS = 7
const DEFENDER_MARGIN_FRACTION = 0.04
const DEFENDER_ROW_GAP = 5
const DEFENDER_COL_GAP = 4

// Scoring
const POINTS_PER_DEFENDER = 10
const VICTORY_BONUS_PER_LEVEL = 100
const THREE_STAR_SCORE = 500
const TWO_STAR_SCORE = 220

// Combo — multiplier thresholds by consecutive hits without touching the paddle
const COMBO_LEVELS: { atHits: number; multiplier: number }[] = [
  { atHits: 10, multiplier: 5 },
  { atHits: 6, multiplier: 3 },
  { atHits: 3, multiplier: 2 },
]

// Referee obstacle
const REFEREE_HALF_WIDTH = 24
const REFEREE_HALF_HEIGHT = 11
const REFEREE_BASE_SPEED = 70
const REFEREE_SPEED_PER_LEVEL = 12
const REFEREE_MAX_SPEED = 220
const FREEZE_DURATION_MS = 1500

const MAX_LIVES = 3

const ROW_COLORS: readonly number[] = [0xe83030, 0xf5a623, 0x22bb66, 0x5ba4d8]
const ARMOURED_COLOR = 0x9e9e9e
const ARMOURED_CRACKED_COLOR = 0xc0c0c0

interface DefenderBlock {
  graphics: Phaser.GameObjects.Graphics
  centerX: number
  centerY: number
  halfWidth: number
  halfHeight: number
  row: number
  alive: boolean
  health: number
  maxHealth: number
}

interface RefereeObstacle {
  graphics: Phaser.GameObjects.Graphics
  x: number
  y: number
  velocityX: number
}

export class KeepieTuppiesScene extends MiniGameScene {
  private backgroundGraphics!: Phaser.GameObjects.Graphics
  private playerGraphics!: Phaser.GameObjects.Graphics
  private ballGraphics!: Phaser.GameObjects.Graphics
  private hudText!: Phaser.GameObjects.Text
  private comboText!: Phaser.GameObjects.Text
  private promptText!: Phaser.GameObjects.Text

  private ballX = 0
  private ballY = 0
  private ballVelocityX = 0
  private ballVelocityY = 0
  private ballRadius = 0
  private ballFrozen = false
  private frozenUntilMs = 0

  private playerX = 0
  private playerY = 0

  private defenders: DefenderBlock[] = []
  private defendersAlive = 0
  private referees: RefereeObstacle[] = []

  private currentLevel = 1
  private ballSpeed = BASE_BALL_SPEED
  private lives = MAX_LIVES
  private waiting = true
  private isGameOver = false
  private comboCount = 0

  constructor() {
    super({ key: SCENE_KEY })
  }

  create(): void {
    const { width, height } = this.scale

    this.currentLevel = 1
    this.lives = MAX_LIVES
    this.currentScore = 0
    this.comboCount = 0
    this.waiting = true
    this.isGameOver = false
    this.ballFrozen = false
    this.ballSpeed = BASE_BALL_SPEED
    this.ballRadius = width * BALL_RADIUS_FRACTION
    this.playerX = width / 2
    this.playerY = height * 0.86
    this.defenders = []
    this.referees = []

    this.backgroundGraphics = this.add.graphics()
    this.drawBackground()

    this.buildDefenders()
    this.buildReferees()

    this.playerGraphics = this.add.graphics()
    this.ballGraphics = this.add.graphics()

    this.hudText = this.add
      .text(width / 2, 8, '', { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff' })
      .setOrigin(0.5, 0)

    this.comboText = this.add
      .text(width / 2, height * 0.73, '', { fontFamily: 'monospace', fontSize: '14px', color: '#f5d800' })
      .setOrigin(0.5)
      .setVisible(false)

    this.promptText = this.add
      .text(width / 2, height * 0.73, 'TAP TO LAUNCH', { fontFamily: 'monospace', fontSize: '12px', color: '#f5d800' })
      .setOrigin(0.5)

    this.placeBallOnPlayer()
    this.drawPlayer()
    this.drawBall()
    this.updateHud()

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return
      this.movePlayerTo(pointer.x)
      if (this.waiting) this.launch()
    })
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver || !pointer.isDown) return
      this.movePlayerTo(pointer.x)
      if (this.waiting) this.placeBallOnPlayer()
    })

    this.emitGameReady()
  }

  // ─── Level management ─────────────────────────────────────────────────────────

  private buildDefenders(): void {
    for (const block of this.defenders) block.graphics.destroy()
    this.defenders = []

    const { width, height } = this.scale
    const marginX = width * DEFENDER_MARGIN_FRACTION
    const halfWidth = (width - marginX * 2 - DEFENDER_COL_GAP * (DEFENDER_COLS - 1)) / DEFENDER_COLS / 2
    const halfHeight = height * 0.033
    const startY = height * 0.10 + halfHeight

    const rowCount = Math.min(BASE_DEFENDER_ROWS + Math.floor((this.currentLevel - 1) / 2), MAX_DEFENDER_ROWS)
    const armouredRowCount = this.currentLevel >= 6 ? 2 : this.currentLevel >= 4 ? 1 : 0

    this.defendersAlive = 0

    for (let row = 0; row < rowCount; row++) {
      const centerY = startY + row * (halfHeight * 2 + DEFENDER_ROW_GAP)
      const isArmoured = row >= rowCount - armouredRowCount
      for (let col = 0; col < DEFENDER_COLS; col++) {
        const centerX = marginX + col * (halfWidth * 2 + DEFENDER_COL_GAP) + halfWidth
        const g = this.add.graphics()
        const block: DefenderBlock = {
          graphics: g,
          centerX, centerY, halfWidth, halfHeight,
          row, alive: true,
          health: isArmoured ? 2 : 1,
          maxHealth: isArmoured ? 2 : 1,
        }
        this.defenders.push(block)
        this.drawDefenderBlock(block)
        this.defendersAlive++
      }
    }
  }

  private buildReferees(): void {
    for (const ref of this.referees) ref.graphics.destroy()
    this.referees = []

    if (this.currentLevel < 2) return

    const { width, height } = this.scale
    const count = this.currentLevel >= 5 ? 2 : 1
    const speed = Math.min(REFEREE_BASE_SPEED + (this.currentLevel - 2) * REFEREE_SPEED_PER_LEVEL, REFEREE_MAX_SPEED)
    const refereeY = height * 0.62

    for (let i = 0; i < count; i++) {
      const startX = count === 1 ? width / 2 : (i === 0 ? width * 0.28 : width * 0.72)
      const g = this.add.graphics()
      const referee: RefereeObstacle = {
        graphics: g,
        x: startX,
        y: refereeY,
        velocityX: (i % 2 === 0 ? 1 : -1) * speed,
      }
      this.referees.push(referee)
      this.drawReferee(referee)
    }
  }

  private advanceLevel(): void {
    this.currentLevel++
    this.ballSpeed = Math.min(BASE_BALL_SPEED + (this.currentLevel - 1) * SPEED_PER_LEVEL, MAX_BALL_SPEED)
    this.currentScore += VICTORY_BONUS_PER_LEVEL * (this.currentLevel - 1)
    this.comboCount = 0
    this.ballFrozen = false
    this.updateHud()

    this.buildDefenders()
    this.buildReferees()

    const { width, height } = this.scale
    const flashText = this.add
      .text(width / 2, height / 2, `LEVEL ${this.currentLevel}!`, {
        fontFamily: 'monospace', fontSize: '20px', color: '#f5d800',
      })
      .setOrigin(0.5)

    this.tweens.add({
      targets: flashText,
      alpha: 0,
      y: height * 0.38,
      duration: 1400,
      ease: 'Power2',
      onComplete: () => { flashText.destroy() },
    })

    this.waiting = true
    this.placeBallOnPlayer()
    this.promptText.setText('TAP TO CONTINUE').setVisible(true)
    this.comboText.setVisible(false)
  }

  // ─── Drawing ─────────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const { width, height } = this.scale
    const g = this.backgroundGraphics
    g.clear()

    g.fillStyle(0x5ba4d8)
    g.fillRect(0, 0, width, height * 0.10)

    g.lineStyle(4, 0xffffff)
    g.strokeRect(width * 0.06, 2, width * 0.88, height * 0.10)

    g.fillStyle(0x22883a)
    g.fillRect(0, height * 0.10, width, height)

    g.fillStyle(0x1e7d35, 0.5)
    const sw = width / 8
    for (let i = 0; i < 8; i += 2) g.fillRect(i * sw, height * 0.10, sw, height)

    g.lineStyle(2, 0xf0f0d0, 0.35)
    g.lineBetween(0, height * 0.10, width, height * 0.10)
  }

  private drawDefenderBlock(block: DefenderBlock): void {
    const g = block.graphics
    g.clear()
    if (!block.alive) return

    const { centerX: cx, centerY: cy, halfWidth: hw, halfHeight: hh, row, health, maxHealth } = block
    const isArmoured = maxHealth === 2
    const isCracked = isArmoured && health === 1

    const fillColor = isArmoured
      ? (isCracked ? ARMOURED_CRACKED_COLOR : ARMOURED_COLOR)
      : (ROW_COLORS[row] ?? 0xaaaaaa)

    g.fillStyle(fillColor)
    g.fillRect(cx - hw, cy - hh, hw * 2, hh * 2)
    g.fillStyle(0xffffff, 0.25)
    g.fillRect(cx - hw, cy - hh, hw * 2, 3)
    g.fillStyle(0x000000, 0.2)
    g.fillRect(cx - hw, cy + hh - 3, hw * 2, 3)

    if (isCracked) {
      g.lineStyle(1, 0x666666, 0.9)
      g.lineBetween(cx - hw * 0.2, cy - hh, cx + hw * 0.3, cy + hh * 0.6)
      g.lineBetween(cx + hw * 0.3, cy + hh * 0.6, cx + hw * 0.6, cy + hh)
    }

    // Little head
    g.fillStyle(0xf4c098)
    g.fillCircle(cx, cy - hh - 5, 5)
  }

  private drawReferee(referee: RefereeObstacle): void {
    const g = referee.graphics
    g.clear()
    const { x, y } = referee
    const hw = REFEREE_HALF_WIDTH
    const hh = REFEREE_HALF_HEIGHT

    // Black and white stripes
    const stripeW = hw * 2 / 4
    for (let i = 0; i < 4; i++) {
      g.fillStyle(i % 2 === 0 ? 0x111111 : 0xffffff)
      g.fillRect(x - hw + i * stripeW, y - hh, stripeW, hh * 2)
    }
    // Border
    g.lineStyle(1, 0x444444)
    g.strokeRect(x - hw, y - hh, hw * 2, hh * 2)
    // Head
    g.fillStyle(0xf4c098)
    g.fillCircle(x, y - hh - 6, 6)
    // Whistle hint
    g.fillStyle(0xf5d800)
    g.fillRect(x + 2, y - hh - 5, 5, 3)
  }

  private drawPlayer(): void {
    const g = this.playerGraphics
    g.clear()
    const { playerX: cx, playerY: cy } = this
    const bw = PLAYER_BODY_HALF_WIDTH
    const bh = PLAYER_BODY_HALF_HEIGHT
    const hr = PLAYER_HEAD_RADIUS

    // Shadow
    g.fillStyle(0x000000, 0.18)
    g.fillEllipse(cx + 3, cy + bh + 22, bw * 2.5, 8)

    // Shorts (dark, bottom half of body)
    g.fillStyle(0x1a1a5e)
    g.fillRect(cx - bw, cy, bw * 2, bh)

    // Jersey (yellow, top half of body)
    g.fillStyle(0xf5d800)
    g.fillRect(cx - bw, cy - bh, bw * 2, bh)

    // Jersey number
    g.fillStyle(0x000000, 0.5)
    g.fillRect(cx - 4, cy - bh + 4, 8, 7)

    // Left arm
    g.fillStyle(0xf5d800)
    g.fillRect(cx - bw - 5, cy - bh + 2, 6, bh * 0.8)

    // Right arm
    g.fillRect(cx + bw, cy - bh + 2, 6, bh * 0.8)

    // Left leg (skin)
    g.fillStyle(0xf4c098)
    g.fillRect(cx - bw + 2, cy + bh, 10, 13)

    // Right leg
    g.fillRect(cx + bw - 12, cy + bh, 10, 13)

    // Left sock (white)
    g.fillStyle(0xffffff)
    g.fillRect(cx - bw + 2, cy + bh + 10, 10, 5)

    // Right sock
    g.fillRect(cx + bw - 12, cy + bh + 10, 10, 5)

    // Left boot (black)
    g.fillStyle(0x111111)
    g.fillRect(cx - bw, cy + bh + 14, 14, 6)

    // Right boot
    g.fillRect(cx + bw - 14, cy + bh + 14, 14, 6)

    // Head
    g.fillStyle(0xf4c098)
    g.fillCircle(cx, cy - bh - hr, hr)

    // Hair
    g.fillStyle(0x3a2010)
    g.fillCircle(cx, cy - bh - hr * 1.55, hr * 0.85)

    // Eyes
    g.fillStyle(0x1a1a1a)
    g.fillCircle(cx - 3, cy - bh - hr - 1, 1.5)
    g.fillCircle(cx + 3, cy - bh - hr - 1, 1.5)
  }

  private drawBall(): void {
    const g = this.ballGraphics
    g.clear()
    const r = this.ballRadius
    const { ballX: bx, ballY: by } = this

    // Blink when frozen
    const alpha = this.ballFrozen
      ? (Math.floor(this.time.now / 120) % 2 === 0 ? 0.3 : 1.0)
      : 1.0

    g.fillStyle(0x000000, 0.18 * alpha)
    g.fillEllipse(bx + 2, by + 3, r * 2.2, r * 0.7)

    g.fillStyle(0xf4f4f0, alpha)
    g.fillCircle(bx, by, r)

    g.fillStyle(0x1a1a1a, alpha)
    g.fillCircle(bx, by - r * 0.35, r * 0.28)
    g.fillCircle(bx - r * 0.42, by + r * 0.28, r * 0.22)
    g.fillCircle(bx + r * 0.42, by + r * 0.28, r * 0.22)
  }

  private updateHud(): void {
    const multiplier = this.getComboMultiplier()
    const comboSuffix = multiplier > 1 ? `  x${multiplier}` : ''
    this.hudText.setText(`Lv.${this.currentLevel}  Score:${this.currentScore}  Lives:${this.lives}${comboSuffix}`)
    this.emitScoreUpdate(this.currentScore)
  }

  // ─── Input & movement ─────────────────────────────────────────────────────────

  private movePlayerTo(screenX: number): void {
    this.playerX = Phaser.Math.Clamp(screenX, PLAYER_BODY_HALF_WIDTH + 4, this.scale.width - PLAYER_BODY_HALF_WIDTH - 4)
  }

  private placeBallOnPlayer(): void {
    this.ballX = this.playerX
    this.ballY = this.playerY - PLAYER_HIT_TOP - this.ballRadius - 2
    this.ballVelocityX = 0
    this.ballVelocityY = 0
  }

  private launch(): void {
    this.waiting = false
    this.promptText.setVisible(false)
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3)
    this.ballVelocityX = Math.cos(angle) * this.ballSpeed
    this.ballVelocityY = Math.sin(angle) * this.ballSpeed
  }

  // ─── Combo ───────────────────────────────────────────────────────────────────

  private getComboMultiplier(): number {
    for (const level of COMBO_LEVELS) {
      if (this.comboCount >= level.atHits) return level.multiplier
    }
    return 1
  }

  private resetCombo(): void {
    this.comboCount = 0
    this.comboText.setVisible(false)
    this.updateHud()
  }

  private incrementCombo(): void {
    this.comboCount++
    const multiplier = this.getComboMultiplier()
    this.updateHud()
    if (multiplier > 1) {
      this.comboText.setText(`x${multiplier} COMBO!`).setVisible(true)
    }
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  update(_time: number, deltaMs: number): void {
    if (!this.isGameOver && !this.waiting) {
      // Unfreeze when timer expires
      if (this.ballFrozen && this.time.now >= this.frozenUntilMs) {
        this.ballFrozen = false
      }

      if (!this.ballFrozen) {
        const dt = deltaMs / 1000
        this.ballX += this.ballVelocityX * dt
        this.ballY += this.ballVelocityY * dt
        this.bounceOffWalls()
        this.checkPlayerHit()
        this.checkDefenderHits()
        this.checkRefereeHits()
        this.checkBallLost()
      }

      // Referees move even while ball is frozen
      this.updateReferees(deltaMs / 1000)
    }

    this.drawReferees()
    this.drawPlayer()
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

  private checkPlayerHit(): void {
    const cx = this.playerX
    const topOfBody = this.playerY - PLAYER_HIT_TOP
    const r = this.ballRadius

    const withinWidth = this.ballX + r > cx - PLAYER_BODY_HALF_WIDTH && this.ballX - r < cx + PLAYER_BODY_HALF_WIDTH
    const withinHeight = this.ballY + r > topOfBody && this.ballY - r < this.playerY + PLAYER_BODY_HALF_HEIGHT
    const movingDown = this.ballVelocityY > 0

    if (movingDown && withinWidth && withinHeight) {
      const hitFraction = (this.ballX - cx) / PLAYER_BODY_HALF_WIDTH
      const bounceAngle = Phaser.Math.Clamp(hitFraction, -1, 1) * (Math.PI / 3)
      this.ballVelocityX = Math.sin(bounceAngle) * this.ballSpeed
      this.ballVelocityY = -Math.abs(Math.cos(bounceAngle) * this.ballSpeed)
      this.ballY = topOfBody - r
      this.resetCombo()
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

      block.health--
      this.incrementCombo()

      if (block.health <= 0) {
        block.alive = false
        block.graphics.clear()
        this.defendersAlive--
        this.currentScore += POINTS_PER_DEFENDER * this.getComboMultiplier()
        this.updateHud()
        this.cameras.main.shake(30, 0.004)
      } else {
        // First hit on armoured block — redraw cracked
        this.drawDefenderBlock(block)
        this.currentScore += POINTS_PER_DEFENDER
        this.updateHud()
      }

      // Reflect off the closest face
      const overlapTop = this.ballY + r - (block.centerY - block.halfHeight)
      const overlapBottom = block.centerY + block.halfHeight - (this.ballY - r)
      const overlapLeft = this.ballX + r - (block.centerX - block.halfWidth)
      const overlapRight = block.centerX + block.halfWidth - (this.ballX - r)

      if (Math.min(overlapTop, overlapBottom) <= Math.min(overlapLeft, overlapRight)) {
        this.ballVelocityY *= -1
      } else {
        this.ballVelocityX *= -1
      }

      if (this.defendersAlive === 0) {
        this.time.delayedCall(400, () => { this.advanceLevel() })
        return
      }
    }
  }

  private checkRefereeHits(): void {
    const r = this.ballRadius

    for (const referee of this.referees) {
      const inX = this.ballX + r > referee.x - REFEREE_HALF_WIDTH && this.ballX - r < referee.x + REFEREE_HALF_WIDTH
      const inY = this.ballY + r > referee.y - REFEREE_HALF_HEIGHT && this.ballY - r < referee.y + REFEREE_HALF_HEIGHT

      if (!inX || !inY) continue

      // Freeze the ball
      if (!this.ballFrozen) {
        this.ballFrozen = true
        this.frozenUntilMs = this.time.now + FREEZE_DURATION_MS

        // Flash the referee
        this.tweens.add({
          targets: referee.graphics,
          alpha: 0.2,
          duration: 120,
          yoyo: true,
          repeat: 4,
        })
      }

      // Still bounce off it so the ball doesn't clip through
      const overlapTop = this.ballY + r - (referee.y - REFEREE_HALF_HEIGHT)
      const overlapBottom = referee.y + REFEREE_HALF_HEIGHT - (this.ballY - r)
      const overlapLeft = this.ballX + r - (referee.x - REFEREE_HALF_WIDTH)
      const overlapRight = referee.x + REFEREE_HALF_WIDTH - (this.ballX - r)

      if (Math.min(overlapTop, overlapBottom) <= Math.min(overlapLeft, overlapRight)) {
        this.ballVelocityY *= -1
        this.ballY += this.ballVelocityY > 0 ? (referee.y + REFEREE_HALF_HEIGHT - (this.ballY - r)) : -(this.ballY + r - (referee.y - REFEREE_HALF_HEIGHT))
      } else {
        this.ballVelocityX *= -1
      }
      break
    }
  }

  private updateReferees(dt: number): void {
    const { width } = this.scale
    for (const referee of this.referees) {
      referee.x += referee.velocityX * dt
      if (referee.x - REFEREE_HALF_WIDTH < 0) {
        referee.x = REFEREE_HALF_WIDTH
        referee.velocityX = Math.abs(referee.velocityX)
      } else if (referee.x + REFEREE_HALF_WIDTH > width) {
        referee.x = width - REFEREE_HALF_WIDTH
        referee.velocityX = -Math.abs(referee.velocityX)
      }
    }
  }

  private drawReferees(): void {
    for (const referee of this.referees) this.drawReferee(referee)
  }

  private checkBallLost(): void {
    if (this.ballY - this.ballRadius <= this.scale.height) return

    this.lives--
    this.comboCount = 0
    this.ballFrozen = false
    this.updateHud()

    if (this.lives <= 0) {
      this.isGameOver = true
      this.time.delayedCall(500, () => {
        const stars = this.calculateStarsFromScore(this.currentScore, THREE_STAR_SCORE, TWO_STAR_SCORE)
        this.emitGameOver(stars)
      })
    } else {
      this.waiting = true
      this.placeBallOnPlayer()
      this.promptText.setText('TAP TO CONTINUE').setVisible(true)
      this.comboText.setVisible(false)
    }
  }
}

export { SCENE_KEY as KEEPIE_TUPPIES_SCENE_KEY }
