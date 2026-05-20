import { ref } from 'vue'
import { defineStore } from 'pinia'
import { gameEventBus } from '@soccer-game/game-core'
import type { GameOverEventPayload } from '@soccer-game/game-core'

export const useGameStore = defineStore('game', () => {
  const activeGameId = ref<string | undefined>(undefined)
  const isGameRunning = ref(false)
  const lastGameOverResult = ref<GameOverEventPayload | undefined>(undefined)

  function startGame(gameId: string): void {
    activeGameId.value = gameId
    isGameRunning.value = true
    lastGameOverResult.value = undefined
  }

  function stopGame(): void {
    isGameRunning.value = false
    activeGameId.value = undefined
  }

  gameEventBus.on('game:over', (payload: GameOverEventPayload) => {
    isGameRunning.value = false
    lastGameOverResult.value = payload
  })

  return {
    activeGameId,
    isGameRunning,
    lastGameOverResult,
    startGame,
    stopGame,
  }
})
