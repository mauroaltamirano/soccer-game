# Free Kick

## Concept

Set-piece shooting. Navigate a curling shot past a defensive wall and a goalkeeper.
Two-phase input: aim direction, then set power. Optional curl for extra control.

## Controls

| Phase | Gesture | Action |
|---|---|---|
| Phase 1 — aim | Drag finger from ball | Sets shot direction; drag above / around the wall |
| Phase 2 — power | Hold and release | Duration of hold = power (full hold = max power bar) |
| Optional | Swipe left / right during hold | Adds left / right curl |

A trajectory preview line shows the path through the air during Phase 1.

## Round structure

- 3 kicks per round (one attempt at each of 3 different wall/keeper setups)
- Points awarded per placement zone on each attempt
- Bonus for no-curl (straight power shot) — high risk, high reward

| Goals scored | Stars |
|---|---|
| 15+ points | ★★★ |
| 8–14 points | ★★ |
| 1–7 points | ★ |
| 0 points | none |

## Goal scoring zones

```
┌──────────────────────────┐
│  [5]   [3]   [3]   [5]   │  top corners = 5 pts
│  [3]   [2]   [2]   [3]   │  side panels = 3 pts
│  [2]   [1]   [1]   [2]   │  centre low  = 1–2 pts
└──────────────────────────┘
  knuckleball bonus: +1 pt (straight, no curl)
```

## Defensive wall

- 3–5 defender sprites in a line
- Wall jumps at a set moment after the kick — timing over/under the wall is a key skill
- Jump timing is slightly randomised so the player can't perfectly memorise it

## Goalkeeper

- Same AI system as Penalty Kick scene
- Positioned slightly off-centre (favouring the statistically more common side)
- Reach is smaller than in penalties (further from goal line)

## Difficulty scaling

| Difficulty | Wall height | GK reaction | Curl limits |
|---|---|---|---|
| Easy | low | 500 ms | generous |
| Medium | medium | 300 ms | normal |
| Hard | high + stagger | 150 ms | tight |

## Pixel art assets required (16×16 base)

| Asset | Frames | Notes |
|---|---|---|
| `ball.png` | 8 rotation frames | Shared asset |
| `goal.png` | 1 static | Shared asset |
| `goalkeeper-*.png` | shared set | Shared with penalty-kick |
| `defender-wall.png` | 3 frames | Idle + jump |
| `pitch-bg-freekick.png` | 1 static | Wall line, ball spot |
