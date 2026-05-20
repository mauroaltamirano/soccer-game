# Penalty Goalkeeping

## Concept

You are the goalkeeper. Read the shooter's body language and dive to save penalties.
Reaction and pattern recognition over pure reflexes.

## Controls (touch / mouse)

| Gesture | Action |
|---|---|
| Swipe left | Dive left |
| Swipe right | Dive right |
| Swipe up | Dive to top (full stretch) |
| Tap | Stay central (no dive — punish obvious middle shots) |

## Round structure

- 5 shots per round
- Each save scores points; consecutive saves add a streak bonus
- Stars awarded based on saves made

| Saves | Stars |
|---|---|
| 5 / 5 | ★★★ |
| 3–4 / 5 | ★★ |
| 1–2 / 5 | ★ |
| 0 / 5 | none |

## Shooter AI and tells

The shooter's animation contains subtle directional tells before the kick:
- **Plant foot angle** — very slight lean toward intended side
- **Body rotation** — minor shoulder turn
- **Run-up curve** — straight run-up vs. curved approach hints at power/side

Tells become subtler at higher difficulty.

## Difficulty scaling

| Difficulty | Input window | Tell strength | Fake tells |
|---|---|---|---|
| Easy | 800 ms | obvious | none |
| Medium | 500 ms | subtle | occasional |
| Hard | 300 ms | minimal | frequent |

## Pixel art assets required (16×16 base)

| Asset | Frames | Notes |
|---|---|---|
| `goalkeeper-player-idle.png` | 2 frames | Slight sway |
| `goalkeeper-player-dive-left.png` | 4 frames | |
| `goalkeeper-player-dive-right.png` | 4 frames | Mirror |
| `goalkeeper-player-dive-up.png` | 4 frames | |
| `shooter-idle.png` | 2 frames | |
| `shooter-runup.png` | 6 frames | |
| `shooter-kick.png` | 4 frames | |
| `ball.png` | 8 rotation frames | Shared with penalty-kick |
| `goal.png` | 1 static | Shared with penalty-kick |

## Scene lifecycle

```
create() → show field, GK at line, shooter at spot
  ↓
shooter wind-up animation plays (input window opens)
  ↓
player swipes → GK dive animation
  ↓
ball trajectory resolves → save / goal
  ↓
result message → next shot or game over
  ↓
emitGameOver(stars)
```
