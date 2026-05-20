export interface ScoreEntry {
  score: number
  achievedAt: string // ISO 8601
}

export interface ScoreServiceInterface {
  getHighScore(gameId: string): Promise<number>
  saveScore(gameId: string, score: number): Promise<void>
  getLeaderboard(gameId: string, limit?: number): Promise<ScoreEntry[]>
}

export interface ProgressionServiceInterface {
  isGameUnlocked(gameId: string): Promise<boolean>
  unlockGame(gameId: string): Promise<void>
  getStars(gameId: string): Promise<number>
  saveStars(gameId: string, stars: number): Promise<void>
}

export interface SettingsServiceInterface {
  get<SettingValue>(key: string, defaultValue: SettingValue): Promise<SettingValue>
  set<SettingValue>(key: string, value: SettingValue): Promise<void>
}
