<script setup lang="ts">
import { computed, inject, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { findRegisteredGameById, gameEventBus } from '@soccer-game/game-core'
import { PhaserGameCanvas, HudOverlay } from '@soccer-game/ui'
import { useGameStore } from '@/stores/useGameStore.ts'
import { scoreServiceInjectionKey, progressionServiceInjectionKey } from '@/services/index.ts'
import type { GameOverEventPayload } from '@soccer-game/game-core'

const props = defineProps<{ gameId: string }>()

const router = useRouter()
const gameStore = useGameStore()
const scoreService = inject(scoreServiceInjectionKey)
const progressionService = inject(progressionServiceInjectionKey)

const gameDefinition = computed(() => findRegisteredGameById(props.gameId))

if (gameDefinition.value) {
  gameStore.startGame(props.gameId)
}

async function handleGameOver(payload: GameOverEventPayload): Promise<void> {
  await scoreService?.saveScore(props.gameId, payload.finalScore)
  await progressionService?.saveStars(props.gameId, payload.stars)
}

gameEventBus.on('game:over', handleGameOver)

onUnmounted(() => {
  gameEventBus.off('game:over', handleGameOver)
  gameStore.stopGame()
})

function handleBackToMenu(): void {
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="game-view">
    <template v-if="gameDefinition">
      <div class="game-view__canvas-area">
        <PhaserGameCanvas
          :scene-classes="[gameDefinition.sceneClass]"
          :initial-scene-key="gameDefinition.id"
        />
        <HudOverlay class="game-view__hud" />
      </div>

      <div v-if="gameStore.lastGameOverResult" class="game-view__game-over-overlay">
        <div class="game-view__game-over-panel">
          <h2>{{ $t('gameOver.title') }}</h2>
          <p>{{ $t('gameOver.finalScore') }}: {{ gameStore.lastGameOverResult.finalScore }}</p>
          <button class="game-view__action-button" @click="router.go(0)">
            {{ $t('gameOver.playAgain') }}
          </button>
          <button class="game-view__action-button" @click="handleBackToMenu">
            {{ $t('gameOver.backToMenu') }}
          </button>
        </div>
      </div>
    </template>

    <div v-else class="game-view__not-found">
      <p>Game not found.</p>
      <button @click="handleBackToMenu">{{ $t('gameOver.backToMenu') }}</button>
    </div>
  </div>
</template>

<style scoped>
.game-view {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: var(--color-ui-bg);
}

.game-view__canvas-area {
  position: relative;
  width: 100%;
  height: 100%;
}

.game-view__hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.game-view__game-over-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.75);
  font-family: var(--font-family-ui);
}

.game-view__game-over-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-8);
  background-color: var(--color-ui-surface);
  border: 2px solid var(--color-ui-border);
  text-align: center;
}

.game-view__game-over-panel h2 {
  font-size: var(--font-size-large);
  color: var(--color-accent-yellow);
}

.game-view__action-button {
  min-height: var(--touch-target-min);
  padding: var(--space-3) var(--space-6);
  background-color: var(--color-accent-yellow);
  color: var(--color-ui-bg);
  border: none;
  font-family: var(--font-family-ui);
  font-size: var(--font-size-base);
  cursor: pointer;
}

.game-view__action-button:hover {
  background-color: var(--color-accent-green);
}

.game-view__not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--space-4);
  font-family: var(--font-family-ui);
  color: var(--color-ui-text-secondary);
}
</style>
