import Phaser from 'phaser'
import { MiniGameScene } from '../MiniGameScene.ts'

const SCENE_KEY = 'PuzzleBobbleScene'

const GRID_COLS_EVEN = 8
const GRID_COLS_ODD = 7
const INITIAL_ROWS = 7
const BALL_SPEED = 400
const BALL_COLORS: readonly number[] = [0xdd3333, 0x3399ee, 0xeebb00, 0x22bb66]
const MIN_MATCH = 3
const THREE_STAR_SHOTS = 20
const TWO_STAR_SHOTS = 35

interface GridBall {
  color: number
  graphics: Phaser.GameObjects.Graphics
  x: number
  y: number
}

interface FlyingBall {
  x: number
  y: number
  velX: number
  velY: number
  color: number
}

export class PuzzleBobbleScene extends MiniGameScene {
  private backgroundGraphics!: Phaser.GameObjects.Graphics
  private shooterGraphics!: Phaser.GameObjects.Graphics
  private flyingBallGraphics!: Phaser.GameObjects.Graphics
  private trajectoryGraphics!: Phaser.GameObjects.Graphics
  private hudText!: Phaser.GameObjects.Text

  private grid = new Map<string, GridBall>()
  private flyingBall: FlyingBall | null = null

  private ballRadius = 0
  private rowHeight = 0
  private gridMarginX = 0
  private gridTopY = 0
  private shooterX = 0
  private shooterY = 0
  private wallLeft = 0
  private wallRight = 0

  private currentColor = BALL_COLORS[0]!
  private nextColor = BALL_COLORS[0]!
  private aimX = 0
  private aimY = 0
  private shotsFired = 0
  private isGameOver = false
  private isWaiting = false

  constructor() {
    super({ key: SCENE_KEY })
  }

  create(): void {
    const { width, height } = this.scale

    this.isGameOver = false
    this.isWaiting = false
    this.shotsFired = 0
    this.grid.clear()
    this.flyingBall = null
    this.currentScore = 0

    this.ballRadius = Math.floor(width / (GRID_COLS_EVEN * 2 + 2))
    this.rowHeight = Math.round(this.ballRadius * Math.sqrt(3))
    this.gridMarginX = Math.floor((width - GRID_COLS_EVEN * this.ballRadius * 2) / 2)
    this.gridTopY = 28
    this.shooterX = width / 2
    this.shooterY = height * 0.88
    this.wallLeft = this.gridMarginX
    this.wallRight = width - this.gridMarginX
    this.aimX = width / 2
    this.aimY = 0

    this.currentColor = this.randomColor()
    this.nextColor = this.randomColor()

    this.backgroundGraphics = this.add.graphics()
    this.trajectoryGraphics = this.add.graphics()
    this.drawBackground()

    this.buildGrid()

    this.shooterGraphics = this.add.graphics()
    this.flyingBallGraphics = this.add.graphics()

    this.hudText = this.add
      .text(width / 2, 8, '', { fontFamily: 'monospace', fontSize: '11px', color: '#ffffff' })
      .setOrigin(0.5, 0)

    this.drawShooter()
    this.drawTrajectory()
    this.updateHud()

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (this.isGameOver || this.isWaiting) return
      this.aimX = p.x
      this.aimY = p.y
      this.drawShooter()
      this.drawTrajectory()
    })
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (this.isGameOver || this.isWaiting || p.y >= this.shooterY) return
      this.aimX = p.x
      this.aimY = p.y
      this.shoot()
    })

    this.emitGameReady()
  }

  // ─── Grid ─────────────────────────────────────────────────────────────────────

  private buildGrid(): void {
    for (let row = 0; row < INITIAL_ROWS; row++) {
      const cols = this.colCount(row)
      for (let col = 0; col < cols; col++) {
        if (row >= 5 && Math.random() < 0.3) continue
        this.addGridBall(row, col, this.randomColor())
      }
    }
  }

  private addGridBall(row: number, col: number, color: number): void {
    const { x, y } = this.gridToScreen(row, col)
    const g = this.add.graphics()
    this.drawSoccerBall(g, x, y, this.ballRadius, color)
    this.grid.set(`${row},${col}`, { color, graphics: g, x, y })
  }

  private gridToScreen(row: number, col: number): { x: number; y: number } {
    const x = this.gridMarginX + this.ballRadius * (row % 2 === 0 ? (2 * col + 1) : (2 * col + 2))
    const y = this.gridTopY + row * this.rowHeight
    return { x, y }
  }

  private screenToGrid(sx: number, sy: number): { row: number; col: number } {
    const row = Math.max(0, Math.round((sy - this.gridTopY) / this.rowHeight))
    const isOdd = row % 2 === 1
    const col = Math.max(0, Math.round(
      (sx - this.gridMarginX) / (this.ballRadius * 2) - (isOdd ? 1 : 0.5),
    ))
    return { row, col: Math.min(col, this.colCount(row) - 1) }
  }

  private colCount(row: number): number {
    return row % 2 === 0 ? GRID_COLS_EVEN : GRID_COLS_ODD
  }

  private getNeighbors(row: number, col: number): Array<[number, number]> {
    const pairs: Array<[number, number]> = row % 2 === 0
      ? [[row, col - 1], [row, col + 1], [row - 1, col - 1], [row - 1, col], [row + 1, col - 1], [row + 1, col]]
      : [[row, col - 1], [row, col + 1], [row - 1, col], [row - 1, col + 1], [row + 1, col], [row + 1, col + 1]]
    return pairs.filter(([r, c]) => r >= 0 && c >= 0 && c < this.colCount(r))
  }

  private findLandingCell(sx: number, sy: number): { row: number; col: number } | null {
    const primary = this.screenToGrid(sx, sy)
    const candidates: Array<[number, number]> = [
      [primary.row, primary.col],
      ...this.getNeighbors(primary.row, primary.col),
    ]
    let best: { row: number; col: number } | null = null
    let bestDist = Infinity
    for (const [r, c] of candidates) {
      if (r < 0 || c < 0 || c >= this.colCount(r)) continue
      if (this.grid.has(`${r},${c}`)) continue
      const pos = this.gridToScreen(r, c)
      const d = (sx - pos.x) ** 2 + (sy - pos.y) ** 2
      if (d < bestDist) { bestDist = d; best = { row: r, col: c } }
    }
    return best
  }

  // ─── Match logic ──────────────────────────────────────────────────────────────

  private floodFill(startRow: number, startCol: number, color: number): string[] {
    const visited = new Set<string>()
    const queue = [`${startRow},${startCol}`]
    while (queue.length > 0) {
      const key = queue.shift()!
      if (visited.has(key)) continue
      const ball = this.grid.get(key)
      if (!ball || ball.color !== color) continue
      visited.add(key)
      const [r, c] = key.split(',').map(Number) as [number, number]
      for (const [nr, nc] of this.getNeighbors(r, c)) {
        if (!visited.has(`${nr},${nc}`)) queue.push(`${nr},${nc}`)
      }
    }
    return [...visited]
  }

  private removeDisconnected(): number {
    const connected = new Set<string>()
    const queue: string[] = []
    for (const key of this.grid.keys()) {
      if (parseInt(key.split(',')[0]!) === 0) { connected.add(key); queue.push(key) }
    }
    while (queue.length > 0) {
      const key = queue.shift()!
      const [r, c] = key.split(',').map(Number) as [number, number]
      for (const [nr, nc] of this.getNeighbors(r, c)) {
        const nk = `${nr},${nc}`
        if (!connected.has(nk) && this.grid.has(nk)) { connected.add(nk); queue.push(nk) }
      }
    }
    let count = 0
    for (const key of [...this.grid.keys()]) {
      if (!connected.has(key)) {
        this.grid.get(key)!.graphics.destroy()
        this.grid.delete(key)
        count++
      }
    }
    return count
  }

  private processLanding(row: number, col: number, color: number): void {
    const matched = this.floodFill(row, col, color)

    if (matched.length >= MIN_MATCH) {
      for (const key of matched) { this.grid.get(key)!.graphics.destroy(); this.grid.delete(key) }
      this.currentScore += matched.length * 10
      this.cameras.main.shake(40, 0.005)
      const cascaded = this.removeDisconnected()
      this.currentScore += cascaded * 15
    }
    this.updateHud()

    if (this.grid.size === 0) { this.triggerGameOver(true); return }

    // Any ball dangerously close to shooter
    for (const ball of this.grid.values()) {
      if (ball.y >= this.shooterY - this.ballRadius * 5) { this.triggerGameOver(false); return }
    }

    this.time.delayedCall(200, () => { this.loadNextBall() })
  }

  // ─── Game flow ────────────────────────────────────────────────────────────────

  private randomColor(): number {
    return BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)]!
  }

  private loadNextBall(): void {
    this.currentColor = this.nextColor
    this.nextColor = this.randomColor()
    this.isWaiting = false
    this.drawShooter()
    this.drawTrajectory()
  }

  private shoot(): void {
    if (this.flyingBall) return
    const angle = this.getAimAngle()
    this.flyingBall = {
      x: this.shooterX,
      y: this.shooterY - this.ballRadius,
      velX: Math.cos(angle) * BALL_SPEED,
      velY: Math.sin(angle) * BALL_SPEED,
      color: this.currentColor,
    }
    this.shotsFired++
    this.isWaiting = true
    this.trajectoryGraphics.clear()
    this.shooterGraphics.clear()
    this.updateHud()
  }

  private getAimAngle(): number {
    const dx = this.aimX - this.shooterX
    const dy = this.aimY - this.shooterY
    const raw = Math.atan2(dy, dx)
    return Phaser.Math.Clamp(raw, -Math.PI + 0.25, -0.25)
  }

  private triggerGameOver(won: boolean): void {
    this.isGameOver = true
    const stars = won
      ? (this.shotsFired <= THREE_STAR_SHOTS ? 3 : this.shotsFired <= TWO_STAR_SHOTS ? 2 : 1)
      : 0
    this.time.delayedCall(600, () => { this.emitGameOver(stars) })
  }

  // ─── Drawing ─────────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const { width, height } = this.scale
    const g = this.backgroundGraphics
    g.clear()

    // Stadium night sky
    g.fillStyle(0x1a1a3e)
    g.fillRect(0, 0, width, height)

    // Crowd stands
    g.fillStyle(0x353560)
    g.fillRect(0, height * 0.68, width, height * 0.10)
    for (let i = 0; i < 28; i++) {
      g.fillStyle(i % 3 === 0 ? 0x5566aa : i % 3 === 1 ? 0xaa4444 : 0x557755, 0.8)
      g.fillCircle(Math.floor(i * (width / 28)) + 4, height * 0.68 + (i % 2) * 7 + 5, 3)
    }

    // Pitch
    g.fillStyle(0x22883a)
    g.fillRect(0, height * 0.78, width, height * 0.22)
    g.fillStyle(0x1e7d35, 0.5)
    const sw = width / 6
    for (let i = 0; i < 6; i += 2) g.fillRect(i * sw, height * 0.78, sw, height * 0.22)
    g.lineStyle(2, 0x55aa66, 0.6)
    g.lineBetween(0, height * 0.78, width, height * 0.78)

    // Separator between grid area and shooting area
    g.lineStyle(1, 0x445577, 0.6)
    g.lineBetween(0, height * 0.68, width, height * 0.68)
  }

  private drawSoccerBall(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number): void {
    // Shadow
    g.fillStyle(0x000000, 0.25)
    g.fillEllipse(x + 1, y + 2, r * 2.1, r * 0.65)

    // Base color
    g.fillStyle(color)
    g.fillCircle(x, y, r)

    // Highlight
    g.fillStyle(0xffffff, 0.38)
    g.fillCircle(x - r * 0.28, y - r * 0.3, r * 0.38)

    // Black pentagon patches
    g.fillStyle(0x111111, 0.85)
    g.fillCircle(x, y, r * 0.26)
    g.fillCircle(x + r * 0.46, y - r * 0.27, r * 0.17)
    g.fillCircle(x - r * 0.46, y - r * 0.27, r * 0.17)
    g.fillCircle(x - r * 0.41, y + r * 0.33, r * 0.16)
    g.fillCircle(x + r * 0.41, y + r * 0.33, r * 0.16)
  }

  private drawShooter(): void {
    const g = this.shooterGraphics
    g.clear()
    const cx = this.shooterX
    const cy = this.shooterY
    const r = this.ballRadius

    // Platform base
    g.fillStyle(0x2a2a4a)
    g.fillRect(cx - r * 3, cy + r * 1.1, r * 6, r * 1.2)
    g.lineStyle(1, 0x4455aa)
    g.strokeRect(cx - r * 3, cy + r * 1.1, r * 6, r * 1.2)

    // Aim direction indicator
    const angle = this.getAimAngle()
    g.lineStyle(1, 0xffffff, 0.4)
    g.lineBetween(cx, cy - r, cx + Math.cos(angle) * r * 2.8, cy - r + Math.sin(angle) * r * 2.8)

    // Current ball
    this.drawSoccerBall(g, cx, cy, r, this.currentColor)

    // Next ball preview (right side)
    this.drawSoccerBall(g, cx + r * 3.8, cy + r * 0.2, Math.round(r * 0.65), this.nextColor)

    // "NEXT" micro label
    g.fillStyle(0xaaaacc)
    // (skip text, the smaller ball speaks for itself)
  }

  private drawTrajectory(): void {
    const g = this.trajectoryGraphics
    g.clear()
    if (this.isWaiting || this.isGameOver) return

    const angle = this.getAimAngle()
    let x = this.shooterX
    let y = this.shooterY - this.ballRadius
    let cvx = Math.cos(angle) * BALL_SPEED
    let cvy = Math.sin(angle) * BALL_SPEED
    const r = this.ballRadius
    const dt = 0.016

    g.fillStyle(0xffffff, 0.45)

    outer: for (let step = 0; step < 300; step++) {
      x += cvx * dt
      y += cvy * dt

      if (x - r < this.wallLeft) { x = this.wallLeft + r; cvx = Math.abs(cvx) }
      else if (x + r > this.wallRight) { x = this.wallRight - r; cvx = -Math.abs(cvx) }

      if (step % 4 === 0) g.fillCircle(x, y, 1.5)

      for (const ball of this.grid.values()) {
        if ((x - ball.x) ** 2 + (y - ball.y) ** 2 < (r * 1.9) ** 2) break outer
      }
      if (y - r <= this.gridTopY) break
    }
  }

  private drawFlyingBall(): void {
    const g = this.flyingBallGraphics
    g.clear()
    if (!this.flyingBall) return
    this.drawSoccerBall(g, this.flyingBall.x, this.flyingBall.y, this.ballRadius, this.flyingBall.color)
  }

  private updateHud(): void {
    this.hudText.setText(`Score: ${this.currentScore}   Shots: ${this.shotsFired}`)
    this.emitScoreUpdate(this.currentScore)
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  update(_time: number, deltaMs: number): void {
    if (this.isGameOver || !this.flyingBall) {
      this.drawFlyingBall()
      return
    }

    const dt = deltaMs / 1000
    const ball = this.flyingBall
    const r = this.ballRadius

    ball.x += ball.velX * dt
    ball.y += ball.velY * dt

    // Wall bounce
    if (ball.x - r < this.wallLeft) { ball.x = this.wallLeft + r; ball.velX = Math.abs(ball.velX) }
    else if (ball.x + r > this.wallRight) { ball.x = this.wallRight - r; ball.velX = -Math.abs(ball.velX) }

    // Grid collision
    let landed = false
    for (const gridBall of this.grid.values()) {
      const dx = ball.x - gridBall.x
      const dy = ball.y - gridBall.y
      if (dx * dx + dy * dy < (r * 1.95) ** 2) { landed = true; break }
    }

    // Top wall
    if (ball.y - r <= this.gridTopY) {
      ball.y = this.gridTopY + r
      landed = true
    }

    if (landed) {
      const savedColor = ball.color
      const savedX = ball.x
      const savedY = ball.y
      this.flyingBall = null
      this.drawFlyingBall()

      const cell = this.findLandingCell(savedX, savedY)
      if (cell) {
        this.addGridBall(cell.row, cell.col, savedColor)
        this.processLanding(cell.row, cell.col, savedColor)
      } else {
        // No free cell found — just load next ball
        this.time.delayedCall(200, () => { this.loadNextBall() })
      }
      return
    }

    // Fell off bottom — load next ball
    if (ball.y > this.scale.height + r * 2) {
      this.flyingBall = null
      this.loadNextBall()
    }

    this.drawFlyingBall()
  }
}

export { SCENE_KEY as PUZZLE_BOBBLE_SCENE_KEY }
