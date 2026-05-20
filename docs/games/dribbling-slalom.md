# Dribbling Slalom

## Concept

Guide the ball through a course of cones and defenders as fast as possible.
The ball has slight momentum lag — it trails your finger, not perfectly tracking it.
Time trial: finish the course to score, time determines stars.

## Controls

| Gesture | Action |
|---|---|
| Drag finger | Steers the ball toward the finger position |
| Release and re-press | Ball drifts to a stop (momentum) |

The ball's position lerps toward the drag target, creating a natural momentum feel
without requiring physics simulation.

## Course structure

- Scrolling vertical course (camera follows ball upward)
- Finish line at the top of the course
- Collision with cones or defenders ends the run immediately

## Obstacles

| Type | Behaviour |
|---|---|
| Cone | Stationary; must steer around it |
| Slow defender | Moves side to side on a fixed path |
| Intercepting defender | Moves toward the ball if it enters proximity range |

## Difficulty scaling

| Difficulty | Course length | Obstacle density | Intercepting defenders |
|---|---|---|---|
| Easy | short | sparse | none |
| Medium | medium | moderate | 2 |
| Hard | long | dense | 4 |

## Scoring

Score is calculated purely from completion time. Collision ends the run — no partial score.

| Time | Stars |
|---|---|
| ≤ 15 s | ★★★ |
| 16–25 s | ★★ |
| 26–45 s | ★ |
| Did not finish | none |

Bonus: +5 pts for zero near-misses (passing within 2px of a cone without touching it).

## Pixel art assets required (16×16 base)

| Asset | Frames | Notes |
|---|---|---|
| `ball.png` | 8 rotation frames | Shared asset |
| `cone.png` | 1 static | Traffic cone |
| `defender-slow.png` | 4 frames | Walk cycle |
| `defender-intercept.png` | 4 frames | Sprint cycle |
| `pitch-tiles.png` | 4 tiles | Tileable pitch sections |
| `finish-line.png` | 1 static | Checkered banner |

## Scene lifecycle

```
create() → spawn ball at bottom of course, draw obstacles
  ↓
player drags → ball follows with momentum lag
  ↓
ball reaches finish → stop timer → calculate stars
  ↓
collision with obstacle → instant game over, 0 stars
  ↓
emitGameOver(stars)
```
