import type { ProgressionServiceInterface } from '../interfaces.ts'

interface StoredProgressionData {
  unlockedGameIds: string[]
  starsByGameId: Record<string, number>
}

export class LocalStorageProgressionService implements ProgressionServiceInterface {
  private readonly storageKey = 'soccer-game:progression'

  private readStoredProgression(): StoredProgressionData {
    const rawValue = localStorage.getItem(this.storageKey)
    if (rawValue === null) {
      return { unlockedGameIds: [], starsByGameId: {} }
    }
    return JSON.parse(rawValue) as StoredProgressionData
  }

  private writeStoredProgression(data: StoredProgressionData): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data))
  }

  async isGameUnlocked(gameId: string): Promise<boolean> {
    const stored = this.readStoredProgression()
    return stored.unlockedGameIds.includes(gameId)
  }

  async unlockGame(gameId: string): Promise<void> {
    const stored = this.readStoredProgression()
    if (!stored.unlockedGameIds.includes(gameId)) {
      stored.unlockedGameIds.push(gameId)
      this.writeStoredProgression(stored)
    }
  }

  async getStars(gameId: string): Promise<number> {
    const stored = this.readStoredProgression()
    return stored.starsByGameId[gameId] ?? 0
  }

  async saveStars(gameId: string, stars: number): Promise<void> {
    const stored = this.readStoredProgression()
    const currentStars = stored.starsByGameId[gameId] ?? 0
    if (stars > currentStars) {
      stored.starsByGameId[gameId] = stars
      this.writeStoredProgression(stored)
    }
  }
}
