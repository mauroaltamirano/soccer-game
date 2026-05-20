<script setup lang="ts">
import StarRatingDisplay from './StarRatingDisplay.vue'

interface Props {
  gameId: string
  title: string
  description: string
  stars: number
  isLocked?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLocked: false,
})

const emit = defineEmits<{
  select: [gameId: string]
}>()

function handleCardClick(): void {
  if (!props.isLocked) {
    emit('select', props.gameId)
  }
}
</script>

<template>
  <button
    class="game-selection-card"
    :class="{ 'game-selection-card--locked': isLocked }"
    :aria-label="isLocked ? $t('gameCard.lockedAriaLabel', { title }) : $t('gameCard.playAriaLabel', { title })"
    :disabled="isLocked"
    @click="handleCardClick"
  >
    <div class="game-selection-card__thumbnail-area">
      <div v-if="isLocked" class="game-selection-card__lock-icon" aria-hidden="true">🔒</div>
    </div>

    <div class="game-selection-card__info">
      <span class="game-selection-card__title">{{ title }}</span>
      <span class="game-selection-card__description">{{ description }}</span>
      <StarRatingDisplay :stars="stars" />
    </div>
  </button>
</template>

<style scoped>
.game-selection-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: var(--color-ui-surface);
  border: 2px solid var(--color-ui-border);
  color: var(--color-ui-text-primary);
  font-family: var(--font-family-ui);
  cursor: pointer;
  min-height: var(--touch-target-min);
  text-align: left;
  padding: 0;
  transition: border-color 0.1s;
}

.game-selection-card:hover:not(:disabled) {
  border-color: var(--color-accent-yellow);
}

.game-selection-card--locked {
  opacity: 0.5;
  cursor: default;
}

.game-selection-card__thumbnail-area {
  width: 100%;
  aspect-ratio: 16 / 9;
  background-color: var(--color-pitch-green-dark);
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-selection-card__lock-icon {
  font-size: 2rem;
}

.game-selection-card__info {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
}

.game-selection-card__title {
  font-size: var(--font-size-base);
  color: var(--color-accent-yellow);
}

.game-selection-card__description {
  font-size: var(--font-size-small);
  color: var(--color-ui-text-secondary);
  line-height: 1.6;
}
</style>
