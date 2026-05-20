# Keepie-Uppies

## Concept

Tap the ball before it hits the ground. Keep the rally going as long as possible.
Combo multipliers reward consecutive taps. Endless high-score chaser.

## Controls

| Gesture | Action |
|---|---|
| Tap on ball | Kick — adds upward impulse |
| Tap off ball | Miss — counts as a dropped ball |

## Physics

- Phaser Arcade physics with gravity pulling the ball down
- Each successful tap applies an upward velocity impulse
- Horizontal position has slight drift (wind effect at higher difficulty)
- Ball spins visually on each kick (rotation frame cycles)

## Scoring

- +1 point per tap
- Combo multiplier activates at 5, 10, 20 consecutive taps (×2, ×3, ×5)
- Combo resets on a dropped ball

## Difficulty scaling (time-based escalation within a single run)

| Time elapsed | Change |
|---|---|
| 0–30 s | Normal gravity, no wind |
| 30–60 s | Gravity +10%, slight wind drift |
| 60–120 s | Gravity +20%, moderate wind gusts |
| 120 s+ | Gravity +30%, strong unpredictable wind |

## Win / loss condition

- **Loss**: ball hits the ground
- **No upper limit** — endless run, score as high as possible
- Stars awarded based on score at end of run

| Score | Stars |
|---|---|
| 50+ | ★★★ |
| 20–49 | ★★ |
| 5–19 | ★ |
| 0–4 | none |

## Pixel art assets required (16×16 base)

| Asset | Frames | Notes |
|---|---|---|
| `ball.png` | 8 rotation frames | Shared asset |
| `player-feet.png` | 4 frames | Boot kick animation |
| `ground-tile.png` | 1 tile | Tileable grass |
| `sky-bg.png` | 1 static | Stadium sky backdrop |

## Scene lifecycle

```
create() → spawn ball at centre, medium height
  ↓
ball falls under gravity
  ↓
player taps ball → impulse applied, score++, combo tracked
  ↓
ball hits ground → game over
  ↓
emitGameOver(stars)
```
