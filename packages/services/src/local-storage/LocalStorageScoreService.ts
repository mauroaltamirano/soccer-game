import type { ScoreEntry, ScoreServiceInterface } from '../interfaces.ts'

interface StoredGameScores {
  highScore: number
  entries: ScoreEntry[]
}

export class LocalStorageScoreService implements ScoreServiceInterface {
  private readonly storageKeyPrefix = 'soccer-game:scores:'

  private readStoredScores(gameId: string): StoredGameScores {
    const rawValue = localStorage.getItem(this.storageKeyPrefix + gameId)
    if (rawValue === null) {
      return { highScore: 0, entries: [] }
    }
    return JSON.parse(rawValue) as StoredGameScores
  }

  private writeStoredScores(gameId: string, data: StoredGameScores): void {
    localStorage.setItem(this.storageKeyPrefix + gameId, JSON.stringify(data))
  }

  async getHighScore(gameId: string): Promise<number> {
    return this.readStoredScores(gameId).highScore
  }

  async saveScore(gameId: string, score: number): Promise<void> {
    const stored = this.readStoredScores(gameId)
    const newEntry: ScoreEntry = { score, achievedAt: new Date().toISOString() }
    stored.entries.push(newEntry)
    if (score > stored.highScore) {
      stored.highScore = score
    }
    this.writeStoredScores(gameId, stored)
  }

  async getLeaderboard(gameId: string, limit = 10): Promise<ScoreEntry[]> {
    const stored = this.readStoredScores(gameId)
    return [...stored.entries]
      .sort((firstEntry, secondEntry) => secondEntry.score - firstEntry.score)
      .slice(0, limit)
  }
}
