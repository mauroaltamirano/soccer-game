import Phaser from 'phaser'
import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'DribblingSlalomScene'

const THREE_STAR_TIME_MILLISECONDS = 15_000
const TWO_STAR_TIME_MILLISECONDS = 25_000

const BALL_LERP_SPEED = 0.08
const BALL_RADIUS_FRACTION = 0.03
const COURSE_SCROLL_SPEED = 140 // px/s
const OBSTACLE_CONE_COLUMNS = 2
const CONE_ROWS = 5
const PITCH_TILE_HEIGHT = 120

interface Obstacle {
  graphics: Phaser.GameObjects.Graphics
  worldY: number
  x: number
  radius: number
  type: 'cone' | 'defender'
  velocityX: number
}

export class DribblingSlalomScene extends MiniGameScene {
  private backgroundGraphics!: Phaser.GameObjects.Graphics
  private ballGraphics!: Phaser.GameObjects.Graphics
  private finishLineGraphics!: Phaser.GameObjects.Graphics
  private hudText!: Phaser.GameObjects.Text

  private ballPosition!: Phaser.Math.Vector2
  private targetPosition!: Phaser.Math.Vector2
  private isPointerDown = false

  private elapsedTimeMilliseconds = 0
  private cameraOffsetY = 0
  private courseHeightWorld = 0
  private finishLineWorldY = 0
  private isGameOver = false
  private isFinished = false

  private obstacles: Obstacle[] = []

  constructor() {
    super({ key: SCENE_KEY })
  }

  create(): void {
    const width = this.scale.width
    const height = this.scale.height

    this.elapsedTimeMilliseconds = 0
    this.cameraOffsetY = 0
    this.isGameOver = false
    this.isFinished = false

    const courseScreenLength = height * 6
    this.courseHeightWorld = courseScreenLength
    this.finishLineWorldY = 0 // world Y=0 is the top (finish)

    // Ball starts at the bottom of the visible area
    this.ballPosition = new Phaser.Math.Vector2(width / 2, height * 0.82)
    this.targetPosition = new Phaser.Math.Vector2(width / 2, height * 0.82)

    this.backgroundGraphics = this.add.graphics()
    this.ballGraphics = this.add.graphics()
    this.finishLineGraphics = this.add.graphics()

    this.hudText = this.add
      .text(width / 2, height * 0.03, '', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff' })
      .setOrigin(0.5, 0)

    this.buildObstacles()
    this.drawBackground()
    this.drawBall()

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      this.isPointerDown = true
      this.targetPosition.set(p.x, p.y)
    })
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (this.isPointerDown) this.targetPosition.set(p.x, p.y)
    })
    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.isPointerDown = false
    })

    this.emitGameReady()
  }

  // ─── Course generation ────────────────────────────────────────────────────────

  private buildObstacles(): void {
    const width = this.scale.width
    const height = this.scale.height
    const obstacleRadius = width * 0.035

    for (let row = 0; row < CONE_ROWS; row++) {
      // World Y of this row: distribute cones along course, skip the first 15% (starting area)
      const worldY = this.courseHeightWorld * (0.85 - (row / CONE_ROWS) * 0.75)

      for (let col = 0; col < OBSTACLE_CONE_COLUMNS; col++) {
        const colFraction = (col + 1) / (OBSTACLE_CONE_COLUMNS + 1)
        const xOffset = (Math.random() - 0.5) * width * 0.15
        const obstacleX = width * colFraction + xOffset

        const isDefender = row >= CONE_ROWS - 2
        const velocityX = isDefender ? (Math.random() > 0.5 ? 1 : -1) * 60 : 0

        const obstacleGraphics = this.add.graphics()

        this.obstacles.push({
          graphics: obstacleGraphics,
          worldY,
          x: obstacleX,
          radius: obstacleRadius,
          type: isDefender ? 'defender' : 'cone',
          velocityX,
        })
      }
    }

    this.drawAllObstacles()
  }

  private drawAllObstacles(): void {
    const height = this.scale.height

    for (const obstacle of this.obstacles) {
      const screenY = obstacle.worldY - this.cameraOffsetY + height
      this.drawObstacle(obstacle, screenY)
    }
  }

  private drawObstacle(obstacle: Obstacle, screenY: number): void {
    const g = obstacle.graphics
    g.clear()

    const radius = obstacle.radius
    if (obstacle.type === 'cone') {
      g.fillStyle(0xff6600)
      g.fillTriangle(
        obstacle.x, screenY - radius * 1.5,
        obstacle.x - radius, screenY + radius * 0.5,
        obstacle.x + radius, screenY + radius * 0.5,
      )
      g.fillStyle(0xffffff)
      g.fillRect(obstacle.x - radius * 0.6, screenY - radius * 0.3, radius * 1.2, 3)
    } else {
      g.fillStyle(0xe83030)
      g.fillRect(obstacle.x - radius * 0.6, screenY - radius * 1.4, radius * 1.2, radius * 2.2)
      g.fillStyle(0xf4c098)
      g.fillCircle(obstacle.x, screenY - radius * 1.6, radius * 0.55)
    }
  }

  // ─── Drawing ─────────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const width = this.scale.width
    const height = this.scale.height
    const g = this.backgroundGraphics
    g.clear()
    g.fillStyle(0x22883a).fillRect(0, 0, width, height)
    g.fillStyle(0x1a6b2a)
    const stripeWidth = width / 6
    for (let i = 0; i < 6; i += 2) g.fillRect(i * stripeWidth, 0, stripeWidth, height)

    // Draw lane guides
    g.lineStyle(2, 0xf0f0d0, 0.25)
    const laneX1 = width * 0.15
    const laneX2 = width * 0.85
    g.lineBetween(laneX1, 0, laneX1, height)
    g.lineBetween(laneX2, 0, laneX2, height)
  }

  private drawBall(): void {
    const g = this.ballGraphics
    g.clear()
    const r = this.scale.width * BALL_RADIUS_FRACTION
    g.fillStyle(0x000000, 0.3).fillEllipse(this.ballPosition.x + 2, this.ballPosition.y + 3, r * 2.2, r * 0.7)
    g.fillStyle(0xf4f4f0).fillCircle(this.ballPosition.x, this.ballPosition.y, r)
    g.fillStyle(0x1a1a1a).fillCircle(this.ballPosition.x, this.ballPosition.y - r * 0.4, r * 0.28)
    g.fillCircle(this.ballPosition.x - r * 0.45, this.ballPosition.y + r * 0.3, r * 0.22)
    g.fillCircle(this.ballPosition.x + r * 0.45, this.ballPosition.y + r * 0.3, r * 0.22)
  }

  private drawFinishLine(screenY: number): void {
    const g = this.finishLineGraphics
    g.clear()
    if (screenY < 0 || screenY > this.scale.height) return

    const width = this.scale.width
    const squareSize = 12
    for (let col = 0; col < Math.ceil(width / squareSize); col++) {
      const row = col % 2
      g.fillStyle(row === 0 ? 0xffffff : 0x000000)
      g.fillRect(col * squareSize, screenY - squareSize, squareSize, squareSize)
      g.fillStyle(row === 0 ? 0x000000 : 0xffffff)
      g.fillRect(col * squareSize, screenY, squareSize, squareSize)
    }
  }

  private updateHud(): void {
    const seconds = (this.elapsedTimeMilliseconds / 1000).toFixed(1)
    this.hudText.setText(`Time: ${seconds}s`)
    this.emitScoreUpdate(Math.floor(this.elapsedTimeMilliseconds))
  }

  // ─── Collision ───────────────────────────────────────────────────────────────

  private checkCollisions(): boolean {
    const ballRadius = this.scale.width * BALL_RADIUS_FRACTION
    const height = this.scale.height

    for (const obstacle of this.obstacles) {
      const screenY = obstacle.worldY - this.cameraOffsetY + height
      const dx = this.ballPosition.x - obstacle.x
      const dy = this.ballPosition.y - screenY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < ballRadius + obstacle.radius * 0.9) return true
    }
    return false
  }

  // ─── Update ───────────────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    if (this.isGameOver || this.isFinished) return

    this.elapsedTimeMilliseconds += delta

    // Move camera upward (scroll course down toward player)
    this.cameraOffsetY += COURSE_SCROLL_SPEED * (delta / 1000)

    // Move defender obstacles side to side
    for (const obstacle of this.obstacles) {
      if (obstacle.velocityX !== 0) {
        obstacle.x += obstacle.velocityX * (delta / 1000)
        if (obstacle.x < this.scale.width * 0.1 || obstacle.x > this.scale.width * 0.9) {
          obstacle.velocityX *= -1
        }
      }
    }

    // Lerp ball toward pointer
    if (this.isPointerDown) {
      this.ballPosition.x = Phaser.Math.Linear(this.ballPosition.x, this.targetPosition.x, BALL_LERP_SPEED)
      this.ballPosition.y = Phaser.Math.Linear(this.ballPosition.y, this.targetPosition.y, BALL_LERP_SPEED)
    }

    // Clamp ball to screen edges
    const ballRadius = this.scale.width * BALL_RADIUS_FRACTION
    this.ballPosition.x = Phaser.Math.Clamp(this.ballPosition.x, ballRadius, this.scale.width - ballRadius)
    this.ballPosition.y = Phaser.Math.Clamp(this.ballPosition.y, ballRadius, this.scale.height - ballRadius)

    // Draw
    this.drawAllObstacles()
    this.drawBall()

    // Finish line: the finish is at the top (worldY = 0), camera scrolls up toward it
    const finishScreenY = this.finishLineWorldY - this.cameraOffsetY + this.scale.height
    this.drawFinishLine(finishScreenY)

    this.updateHud()

    // Check if ball reached finish line
    if (this.ballPosition.y < finishScreenY + 20 || this.cameraOffsetY >= this.courseHeightWorld) {
      this.finishCourse()
      return
    }

    // Collision check
    if (this.checkCollisions()) {
      this.triggerCollision()
    }
  }

  private finishCourse(): void {
    this.isFinished = true
    const stars = this.elapsedTimeMilliseconds <= THREE_STAR_TIME_MILLISECONDS
      ? 3
      : this.elapsedTimeMilliseconds <= TWO_STAR_TIME_MILLISECONDS
        ? 2
        : 1
    const finalScore = Math.floor(1000 - this.elapsedTimeMilliseconds / 10)
    this.currentScore = Math.max(finalScore, 10)
    this.emitGameOver(stars)
  }

  private triggerCollision(): void {
    this.isGameOver = true
    this.cameras.main.shake(200, 0.015)
    this.time.delayedCall(300, () => this.emitGameOver(0))
  }
}

export { SCENE_KEY as DRIBBLING_SLALOM_SCENE_KEY }
