import Phaser from 'phaser'
import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'KeepieTuppiesScene'

// Ball
const BASE_BALL_SPEED = 300
const SPEED_PER_LEVEL = 22
const MAX_BALL_SPEED = 560
const BALL_RADIUS_FRACTION = 0.025

// Player figure
const PLAYER_BODY_HALF_WIDTH = 16
const PLAYER_BODY_HALF_HEIGHT = 17
const PLAYER_HEAD_RADIUS = 9
const PLAYER_HIT_TOP = PLAYER_BODY_HALF_HEIGHT
const PLAYER_MAX_SPEED = 480  // px/s — capped movement speed when dragging

// Defender mini-figures drawn in grid cells
const DEFENDER_FIG_BW = 9
const DEFENDER_FIG_BH = 10
const DEFENDER_FIG_HR = 5

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

// Combo multiplier thresholds (consecutive defender hits without touching player)
const COMBO_LEVELS: { atHits: number; multiplier: number }[] = [
  { atHits: 10, multiplier: 5 },
  { atHits: 6, multiplier: 3 },
  { atHits: 3, multiplier: 2 },
]

// Referee — appears from level 4, always exactly one
const REFEREE_FIG_BW = 13
const REFEREE_FIG_BH = 14
const REFEREE_FIG_HR = 7
const REFEREE_HITBOX_HALF_WIDTH = 18   // covers body + arms
const REFEREE_HITBOX_HALF_HEIGHT = 27  // covers body + head approximately
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

  private playerX = 0
  private playerY = 0
  private targetPlayerX = 0
  private playerFrozen = false
  private playerFrozenUntilMs = 0

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
    this.playerFrozen = false
    this.ballSpeed = BASE_BALL_SPEED
    this.ballRadius = width * BALL_RADIUS_FRACTION
    this.playerX = width / 2
    this.targetPlayerX = width / 2
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
      if (this.isGameOver || this.playerFrozen) return
      this.setTargetPlayerX(pointer.x)
      if (this.waiting) this.launch()
    })
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver || !pointer.isDown || this.playerFrozen) return
      this.setTargetPlayerX(pointer.x)
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

    if (this.currentLevel < 4) return

    const { width, height } = this.scale
    const speed = Math.min(REFEREE_BASE_SPEED + (this.currentLevel - 4) * REFEREE_SPEED_PER_LEVEL, REFEREE_MAX_SPEED)
    const g = this.add.graphics()
    this.referees.push({ graphics: g, x: width / 2, y: height * 0.62, velocityX: speed })
    this.drawReferee(this.referees[0]!)
  }

  private advanceLevel(): void {
    this.currentLevel++
    this.ballSpeed = Math.min(BASE_BALL_SPEED + (this.currentLevel - 1) * SPEED_PER_LEVEL, MAX_BALL_SPEED)
    this.currentScore += VICTORY_BONUS_PER_LEVEL * (this.currentLevel - 1)
    this.comboCount = 0
    this.playerFrozen = false
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

  // ─── Drawing helpers ──────────────────────────────────────────────────────────

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

  // Shared player-figure drawing used for player, defenders, and referee.
  // cx/cy is the body centre (waist level).
  private drawPlayerFigure(
    g: Phaser.GameObjects.Graphics,
    cx: number, cy: number,
    bw: number, bh: number, hr: number,
    jerseyColor: number, shortsColor: number, hairColor: number,
  ): void {
    const legH = Math.max(3, Math.round(bh * 0.75))
    const legW = Math.max(2, Math.round(bw * 0.65))
    const sockH = Math.max(1, Math.round(legH * 0.4))
    const bootH = Math.max(2, Math.round(bh * 0.35))
    const armW = Math.max(2, Math.round(bw * 0.35))

    // Shorts
    g.fillStyle(shortsColor)
    g.fillRect(cx - bw, cy, bw * 2, bh)

    // Jersey
    g.fillStyle(jerseyColor)
    g.fillRect(cx - bw, cy - bh, bw * 2, bh)

    // Arms
    g.fillRect(cx - bw - armW, cy - bh + Math.round(bh * 0.1), armW, Math.round(bh * 0.7))
    g.fillRect(cx + bw, cy - bh + Math.round(bh * 0.1), armW, Math.round(bh * 0.7))

    // Legs (skin)
    g.fillStyle(0xf4c098)
    g.fillRect(cx - bw + 1, cy + bh, legW, legH)
    g.fillRect(cx + bw - legW - 1, cy + bh, legW, legH)

    // Socks
    g.fillStyle(0xffffff)
    g.fillRect(cx - bw + 1, cy + bh + legH - sockH, legW, sockH)
    g.fillRect(cx + bw - legW - 1, cy + bh + legH - sockH, legW, sockH)

    // Boots
    g.fillStyle(0x111111)
    g.fillRect(cx - bw - 1, cy + bh + legH, legW + 2, bootH)
    g.fillRect(cx + bw - legW - 3, cy + bh + legH, legW + 2, bootH)

    // Head
    g.fillStyle(0xf4c098)
    g.fillCircle(cx, cy - bh - hr, hr)

    // Hair
    g.fillStyle(hairColor)
    g.fillCircle(cx, cy - bh - Math.round(hr * 1.55), Math.round(hr * 0.85))

    // Eyes (only when large enough to be visible)
    if (hr >= 4) {
      g.fillStyle(0x1a1a1a)
      const eyeOff = Math.max(1, Math.round(hr * 0.35))
      const eyeR = Math.max(1, Math.round(hr * 0.2))
      g.fillCircle(cx - eyeOff, cy - bh - hr - 1, eyeR)
      g.fillCircle(cx + eyeOff, cy - bh - hr - 1, eyeR)
    }
  }

  private drawDefenderBlock(block: DefenderBlock): void {
    const g = block.graphics
    g.clear()
    if (!block.alive) return

    const { centerX: cx, centerY: cy, row, health, maxHealth } = block
    const isArmoured = maxHealth === 2
    const isCracked = isArmoured && health === 1

    const jerseyColor = isArmoured
      ? (isCracked ? ARMOURED_CRACKED_COLOR : ARMOURED_COLOR)
      : (ROW_COLORS[row % ROW_COLORS.length] ?? 0xaaaaaa)

    this.drawPlayerFigure(g, cx, cy, DEFENDER_FIG_BW, DEFENDER_FIG_BH, DEFENDER_FIG_HR,
      jerseyColor, 0x1a1a5e, 0x3a2010)

    if (isCracked) {
      g.lineStyle(1, 0x666666, 0.9)
      g.lineBetween(cx - 3, cy - DEFENDER_FIG_BH, cx + 2, cy + DEFENDER_FIG_BH * 0.6)
      g.lineBetween(cx + 2, cy + DEFENDER_FIG_BH * 0.6, cx + 5, cy + DEFENDER_FIG_BH)
    }
  }

  private drawReferee(referee: RefereeObstacle): void {
    const g = referee.graphics
    g.clear()
    const { x: cx, y: cy } = referee
    const bw = REFEREE_FIG_BW
    const bh = REFEREE_FIG_BH
    const hr = REFEREE_FIG_HR

    const legH = Math.max(3, Math.round(bh * 0.75))
    const legW = Math.max(2, Math.round(bw * 0.65))
    const sockH = Math.max(1, Math.round(legH * 0.4))
    const bootH = Math.max(2, Math.round(bh * 0.35))
    const armW = Math.max(2, Math.round(bw * 0.35))

    // Shorts (black)
    g.fillStyle(0x111111)
    g.fillRect(cx - bw, cy, bw * 2, bh)

    // Jersey — vertical black/white stripes
    const nStripes = 4
    const stripeW = Math.round(bw * 2 / nStripes)
    for (let i = 0; i < nStripes; i++) {
      g.fillStyle(i % 2 === 0 ? 0x111111 : 0xffffff)
      g.fillRect(cx - bw + i * stripeW, cy - bh, stripeW, bh)
    }

    // Arms (black)
    g.fillStyle(0x111111)
    g.fillRect(cx - bw - armW, cy - bh + Math.round(bh * 0.1), armW, Math.round(bh * 0.7))
    g.fillRect(cx + bw, cy - bh + Math.round(bh * 0.1), armW, Math.round(bh * 0.7))

    // Legs (skin)
    g.fillStyle(0xf4c098)
    g.fillRect(cx - bw + 1, cy + bh, legW, legH)
    g.fillRect(cx + bw - legW - 1, cy + bh, legW, legH)

    // Socks (white)
    g.fillStyle(0xffffff)
    g.fillRect(cx - bw + 1, cy + bh + legH - sockH, legW, sockH)
    g.fillRect(cx + bw - legW - 1, cy + bh + legH - sockH, legW, sockH)

    // Boots (black)
    g.fillStyle(0x111111)
    g.fillRect(cx - bw - 1, cy + bh + legH, legW + 2, bootH)
    g.fillRect(cx + bw - legW - 3, cy + bh + legH, legW + 2, bootH)

    // Head
    g.fillStyle(0xf4c098)
    g.fillCircle(cx, cy - bh - hr, hr)

    // Hair
    g.fillStyle(0x3a2010)
    g.fillCircle(cx, cy - bh - Math.round(hr * 1.55), Math.round(hr * 0.85))

    // Eyes
    g.fillStyle(0x1a1a1a)
    const eyeOff = Math.max(1, Math.round(hr * 0.35))
    const eyeR = Math.max(1, Math.round(hr * 0.2))
    g.fillCircle(cx - eyeOff, cy - bh - hr - 1, eyeR)
    g.fillCircle(cx + eyeOff, cy - bh - hr - 1, eyeR)

    // Whistle
    g.fillStyle(0xf5d800)
    g.fillRect(cx + 2, cy - bh - 4, 5, 3)
  }

  private drawPlayer(): void {
    const g = this.playerGraphics
    g.clear()

    // Blink when frozen
    g.setAlpha(this.playerFrozen
      ? (Math.floor(this.time.now / 120) % 2 === 0 ? 0.35 : 1.0)
      : 1.0)

    // Shadow
    g.fillStyle(0x000000, 0.18)
    g.fillEllipse(
      this.playerX + 3,
      this.playerY + PLAYER_BODY_HALF_HEIGHT + 22,
      PLAYER_BODY_HALF_WIDTH * 2.5, 8,
    )

    this.drawPlayerFigure(
      g, this.playerX, this.playerY,
      PLAYER_BODY_HALF_WIDTH, PLAYER_BODY_HALF_HEIGHT, PLAYER_HEAD_RADIUS,
      0xf5d800, 0x1a1a5e, 0x3a2010,
    )

    // Jersey number
    g.fillStyle(0x000000, 0.5)
    g.fillRect(this.playerX - 4, this.playerY - PLAYER_BODY_HALF_HEIGHT + 4, 8, 7)
  }

  private drawBall(): void {
    const g = this.ballGraphics
    g.clear()
    const r = this.ballRadius
    const { ballX: bx, ballY: by } = this

    g.fillStyle(0x000000, 0.18)
    g.fillEllipse(bx + 2, by + 3, r * 2.2, r * 0.7)

    g.fillStyle(0xf4f4f0)
    g.fillCircle(bx, by, r)

    g.fillStyle(0x1a1a1a)
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

  private setTargetPlayerX(screenX: number): void {
    this.targetPlayerX = Phaser.Math.Clamp(
      screenX,
      PLAYER_BODY_HALF_WIDTH + 4,
      this.scale.width - PLAYER_BODY_HALF_WIDTH - 4,
    )
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
    // Unfreeze player when timer expires
    if (this.playerFrozen && this.time.now >= this.playerFrozenUntilMs) {
      this.playerFrozen = false
    }

    if (!this.isGameOver) {
      // Move player toward touch target at limited speed
      if (!this.playerFrozen) {
        const dx = this.targetPlayerX - this.playerX
        const maxMove = PLAYER_MAX_SPEED * (deltaMs / 1000)
        this.playerX = Math.abs(dx) <= maxMove
          ? this.targetPlayerX
          : this.playerX + Math.sign(dx) * maxMove
      }

      if (this.waiting) {
        // Ball sits on top of player while waiting to launch
        if (!this.playerFrozen) this.placeBallOnPlayer()
      } else {
        const dt = deltaMs / 1000
        this.ballX += this.ballVelocityX * dt
        this.ballY += this.ballVelocityY * dt
        this.bounceOffWalls()
        this.checkPlayerHit()
        this.checkDefenderHits()
        this.checkRefereeHits()
        this.checkBallLost()
      }

      // Referees always move
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
        this.drawDefenderBlock(block)
        this.currentScore += POINTS_PER_DEFENDER
        this.updateHud()
      }

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
      const inX = this.ballX + r > referee.x - REFEREE_HITBOX_HALF_WIDTH &&
                  this.ballX - r < referee.x + REFEREE_HITBOX_HALF_WIDTH
      const inY = this.ballY + r > referee.y - REFEREE_HITBOX_HALF_HEIGHT &&
                  this.ballY - r < referee.y + REFEREE_HITBOX_HALF_HEIGHT

      if (!inX || !inY) continue

      // Freeze the player (ball keeps moving)
      if (!this.playerFrozen) {
        this.playerFrozen = true
        this.playerFrozenUntilMs = this.time.now + FREEZE_DURATION_MS
        this.tweens.add({
          targets: referee.graphics,
          alpha: 0.2,
          duration: 120,
          yoyo: true,
          repeat: 4,
        })
      }

      // Ball still bounces off the referee
      const overlapTop = this.ballY + r - (referee.y - REFEREE_HITBOX_HALF_HEIGHT)
      const overlapBottom = referee.y + REFEREE_HITBOX_HALF_HEIGHT - (this.ballY - r)
      const overlapLeft = this.ballX + r - (referee.x - REFEREE_HITBOX_HALF_WIDTH)
      const overlapRight = referee.x + REFEREE_HITBOX_HALF_WIDTH - (this.ballX - r)

      if (Math.min(overlapTop, overlapBottom) <= Math.min(overlapLeft, overlapRight)) {
        this.ballVelocityY *= -1
        this.ballY += this.ballVelocityY > 0
          ? (referee.y + REFEREE_HITBOX_HALF_HEIGHT + r - this.ballY)
          : -(this.ballY + r - (referee.y - REFEREE_HITBOX_HALF_HEIGHT))
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
      if (referee.x - REFEREE_HITBOX_HALF_WIDTH < 0) {
        referee.x = REFEREE_HITBOX_HALF_WIDTH
        referee.velocityX = Math.abs(referee.velocityX)
      } else if (referee.x + REFEREE_HITBOX_HALF_WIDTH > width) {
        referee.x = width - REFEREE_HITBOX_HALF_WIDTH
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
    this.playerFrozen = false
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
