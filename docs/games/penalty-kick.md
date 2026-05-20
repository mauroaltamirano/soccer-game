# Penalty Kick

## Concept

Classic penalty shootout. Drag to aim and set power, release to shoot. Score as many
as possible in a fixed number of attempts.

## Controls (touch / mouse)

| Gesture | Action |
|---|---|
| Drag from ball outward | Sets direction and power (distance = power) |
| Swipe curve at end of drag | Adds spin / curl |
| Release | Shoots |

An aim indicator (dotted arc) previews the trajectory while dragging.

## Round structure

- 5 shots per round
- Each scored goal awards points based on placement zone
- Bonus points for corner/top-corner placement
- Stars awarded based on total goals scored out of 5

| Goals scored | Stars |
|---|---|
| 5 / 5 | ★★★ |
| 3–4 / 5 | ★★ |
| 1–2 / 5 | ★ |
| 0 / 5 | none |

## Goalkeeper AI

- Random tendency per shot: biased toward one side but not guaranteed
- Reacts to ball direction after a short delay (reaction window shrinks with difficulty)
- Higher difficulty: larger reach, better timing, occasional double-bluff

## Difficulty scaling

| Difficulty | Shots | GK reaction delay | GK reach |
|---|---|---|---|
| Easy | 5 | 400 ms | normal |
| Medium | 5 | 250 ms | normal + 20% |
| Hard | 5 | 120 ms | normal + 40% |

## Scoring zones (goal face)

```
┌──────────────────────┐
│  [5]  [3]  [3]  [5]  │  top corners = 5 pts
│  [3]  [2]  [2]  [3]  │  sides = 3 pts
│  [2]  [1]  [1]  [2]  │  centre = 1–2 pts
└──────────────────────┘
```

## Pixel art assets required (16×16 base)

| Asset | Frames | Notes |
|---|---|---|
| `ball.png` | 8 rotation frames | Spin animation |
| `goal.png` | 1 static | Net with posts |
| `goalkeeper-idle.png` | 2 frames | Slight sway |
| `goalkeeper-dive-left.png` | 4 frames | Full dive animation |
| `goalkeeper-dive-right.png` | 4 frames | Mirror of left |
| `goalkeeper-dive-up.png` | 4 frames | Top-corner save |
| `pitch-bg.png` | 1 static | Penalty spot, D-arc |
| `crowd-tiles.png` | 4 tiles | Tileable crowd row |

## Scene lifecycle

```
create() → show field, ball at spot, input enabled
  ↓
drag starts → show aim indicator
  ↓
release → ball flight animation (Phaser tween + arcade physics)
  ↓
goal / save / miss → brief result message (emitHudMessage)
  ↓
shotsRemaining-- → next shot or game over
  ↓
emitGameOver(stars)
```
