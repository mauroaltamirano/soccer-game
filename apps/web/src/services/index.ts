import type { InjectionKey } from 'vue'
import type {
  ScoreServiceInterface,
  ProgressionServiceInterface,
  SettingsServiceInterface,
} from '@soccer-game/services'
import {
  LocalStorageScoreService,
  LocalStorageProgressionService,
  LocalStorageSettingsService,
} from '@soccer-game/services'

export const scoreServiceInjectionKey: InjectionKey<ScoreServiceInterface> =
  Symbol('ScoreServiceInterface')

export const progressionServiceInjectionKey: InjectionKey<ProgressionServiceInterface> =
  Symbol('ProgressionServiceInterface')

export const settingsServiceInjectionKey: InjectionKey<SettingsServiceInterface> =
  Symbol('SettingsServiceInterface')

export function createDefaultServices() {
  return {
    scoreService: new LocalStorageScoreService(),
    progressionService: new LocalStorageProgressionService(),
    settingsService: new LocalStorageSettingsService(),
  }
}
