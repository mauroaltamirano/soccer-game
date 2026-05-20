# Service Layer

## Design principle

All services are async interfaces, even though the current implementations use `localStorage`
(which is synchronous). This means switching to a backend — REST API, Supabase, Firebase, etc. —
only requires providing a new implementation class. No consumer code changes are needed.

## Interfaces

```typescript
// ScoreServiceInterface
getHighScore(gameId: string): Promise<number>
saveScore(gameId: string, score: number): Promise<void>
getLeaderboard(gameId: string, limit?: number): Promise<ScoreEntry[]>

// ProgressionServiceInterface
isGameUnlocked(gameId: string): Promise<boolean>
unlockGame(gameId: string): Promise<void>
getStars(gameId: string): Promise<number>    // 0–3
saveStars(gameId: string, stars: number): Promise<void>

// SettingsServiceInterface
get<T>(key: string, defaultValue: T): Promise<T>
set<T>(key: string, value: T): Promise<void>
```

Full source: `packages/services/src/interfaces.ts`

## Current implementations

| Interface | Implementation | Storage |
|---|---|---|
| `ScoreServiceInterface` | `LocalStorageScoreService` | `localStorage` key `soccer-game:scores:<gameId>` |
| `ProgressionServiceInterface` | `LocalStorageProgressionService` | `localStorage` key `soccer-game:progression` |
| `SettingsServiceInterface` | `LocalStorageSettingsService` | `localStorage` key `soccer-game:settings:<key>` |

## Injection pattern

Services are provided at the Vue app root in `apps/web/src/main.ts`:

```typescript
application.provide(scoreServiceInjectionKey, new LocalStorageScoreService())
```

Consumed in any component or store:

```typescript
const scoreService = inject(scoreServiceInjectionKey)
await scoreService?.saveScore('penalty-kick', 100)
```

The injection keys are typed (`InjectionKey<ScoreServiceInterface>`), so TypeScript enforces
correct usage at every call site.

## Writing a backend implementation

1. Create a new class in a new package (e.g. `packages/services-http/`) implementing the interface:

```typescript
import type { ScoreServiceInterface, ScoreEntry } from '@soccer-game/services'

export class HttpScoreService implements ScoreServiceInterface {
  constructor(private readonly baseUrl: string) {}

  async getHighScore(gameId: string): Promise<number> {
    const response = await fetch(`${this.baseUrl}/scores/${gameId}/high`)
    const data = await response.json()
    return data.highScore as number
  }
  // ...
}
```

2. In `apps/web/src/main.ts`, swap the injected implementation:

```typescript
application.provide(scoreServiceInjectionKey, new HttpScoreService('https://api.example.com'))
```

No other files change.
