# Header Challenge

## Concept

Crosses come in from the side. Tap at the right moment when the ball reaches the
sweet spot above the player's head. Timing is everything.
Consecutive headers score a streak bonus. The timing window shrinks as the streak grows.

## Controls

| Gesture | Action |
|---|---|
| Tap (any location) | Header — times the jump |
| Swipe left / right (within 200ms of tap) | Directs header to left / right corner |

If no direction swipe is given, the header goes to the centre of the goal (lower score).

## Round structure

- 8 crosses per round
- Each scored header awards points; bonus for corners
- Streak multiplier applies from the 3rd consecutive goal

| Headers scored | Stars |
|---|---|
| 7–8 / 8 | ★★★ |
| 4–6 / 8 | ★★ |
| 1–3 / 8 | ★ |
| 0 / 8 | none |

## Scoring zones

| Shot direction | Points |
|---|---|
| Corner (directed swipe) | 3 pts |
| Centre (no swipe) | 1 pt |
| Miss (wrong timing) | 0 pts |

## Timing mechanic

The ball arcs in from the crossing player on the side of the screen. A visual sweet-spot
indicator (glowing ring or shadow) shows the ideal tap zone. The indicator is large at
first and shrinks with each consecutive successful header.

| Streak | Window size |
|---|---|
| 0–2 | 400 ms |
| 3–5 | 250 ms |
| 6+ | 150 ms |

Tapping outside the window causes the player to jump too early or too late — miss animation plays.

## Difficulty scaling

| Difficulty | Cross speed | Window at streak 0 | Goalkeeper |
|---|---|---|---|
| Easy | slow | 500 ms | none |
| Medium | normal | 400 ms | reactive GK |
| Hard | fast + variable | 300 ms | GK with jump |

## Pixel art assets required (16×16 base)

| Asset | Frames | Notes |
|---|---|---|
| `header-player-idle.png` | 2 frames | Standing, waiting |
| `header-player-jump.png` | 4 frames | Run and leap |
| `header-player-head.png` | 2 frames | Contact + follow-through |
| `crossing-player.png` | 4 frames | Wind-up + kick |
| `ball.png` | 8 rotation frames | Shared asset |
| `goal.png` | 1 static | Shared asset |
| `goalkeeper-*.png` | shared set | Medium / Hard only |

## Scene lifecycle

```
create() → position header player centre-penalty-area, crossing player off-screen side
  ↓
crossing player kicks → ball arcs on parabolic path across penalty box
  ↓
sweet-spot window opens (indicator visible)
  ↓
player taps → header animation → optional direction swipe
  ↓
goal / miss resolved → emitScoreUpdate
  ↓
next cross or game over
  ↓
emitGameOver(stars)
```
