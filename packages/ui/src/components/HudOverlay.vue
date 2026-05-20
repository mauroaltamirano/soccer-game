<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { gameEventBus } from '@soccer-game/game-core'

const currentScore = ref(0)
const currentCombo = ref<number | undefined>(undefined)
const hudMessage = ref<string | undefined>(undefined)
let hudMessageTimeoutId: ReturnType<typeof setTimeout> | undefined

function onScoreUpdate(payload: { score: number; combo?: number }): void {
  currentScore.value = payload.score
  currentCombo.value = payload.combo
}

function onHudMessage(payload: { message: string }): void {
  hudMessage.value = payload.message
  clearTimeout(hudMessageTimeoutId)
  hudMessageTimeoutId = setTimeout(() => {
    hudMessage.value = undefined
  }, 2000)
}

onMounted(() => {
  gameEventBus.on('score:update', onScoreUpdate)
  gameEventBus.on('hud:message', onHudMessage)
})

onUnmounted(() => {
  gameEventBus.off('score:update', onScoreUpdate)
  gameEventBus.off('hud:message', onHudMessage)
  clearTimeout(hudMessageTimeoutId)
})
</script>

<template>
  <div class="hud-overlay">
    <div class="hud-score-display">
      <span class="hud-score-label">{{ $t('hud.score') }}</span>
      <span class="hud-score-value">{{ currentScore }}</span>
      <span v-if="currentCombo && currentCombo > 1" class="hud-combo-indicator">
        ×{{ currentCombo }}
      </span>
    </div>

    <Transition name="hud-message-fade">
      <div v-if="hudMessage" class="hud-message-banner">
        {{ hudMessage }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.hud-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  font-family: var(--font-family-ui);
  color: var(--color-ui-text-primary);
}

.hud-score-display {
  position: absolute;
  top: var(--space-4);
  left: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background-color: rgba(0, 0, 0, 0.6);
  padding: var(--space-2) var(--space-3);
}

.hud-score-label {
  font-size: var(--font-size-small);
  color: var(--color-ui-text-secondary);
  text-transform: uppercase;
}

.hud-score-value {
  font-size: var(--font-size-large);
  color: var(--color-accent-yellow);
}

.hud-combo-indicator {
  font-size: var(--font-size-base);
  color: var(--color-accent-green);
}

.hud-message-banner {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-large);
  text-align: center;
  white-space: nowrap;
}

.hud-message-fade-enter-active,
.hud-message-fade-leave-active {
  transition: opacity 0.3s ease;
}

.hud-message-fade-enter-from,
.hud-message-fade-leave-to {
  opacity: 0;
}
</style>
