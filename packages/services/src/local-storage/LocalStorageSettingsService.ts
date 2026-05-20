import type { SettingsServiceInterface } from '../interfaces.ts'

export class LocalStorageSettingsService implements SettingsServiceInterface {
  private readonly storageKeyPrefix = 'soccer-game:settings:'

  async get<SettingValue>(key: string, defaultValue: SettingValue): Promise<SettingValue> {
    const rawValue = localStorage.getItem(this.storageKeyPrefix + key)
    if (rawValue === null) {
      return defaultValue
    }
    return JSON.parse(rawValue) as SettingValue
  }

  async set<SettingValue>(key: string, value: SettingValue): Promise<void> {
    localStorage.setItem(this.storageKeyPrefix + key, JSON.stringify(value))
  }
}
