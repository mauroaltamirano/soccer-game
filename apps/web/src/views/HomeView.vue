<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { getAllRegisteredGames } from '@soccer-game/game-core'
import type { GameDefinition } from '@soccer-game/game-core'
import { GameSelectionCard } from '@soccer-game/ui'
import { progressionServiceInjectionKey } from '@/services/index.ts'

const router = useRouter()
const progressionService = inject(progressionServiceInjectionKey)

const allGames = getAllRegisteredGames()
const starsByGameId = ref<Record<string, number>>({})

onMounted(async () => {
  if (!progressionService) return
  const starResults = await Promise.all(
    allGames.map(async (game: GameDefinition) => ({
      gameId: game.id,
      stars: await progressionService.getStars(game.id),
    }))
  )
  starsByGameId.value = Object.fromEntries(
    starResults.map(({ gameId, stars }) => [gameId, stars])
  )
})

function handleGameSelected(gameId: string): void {
  router.push({ name: 'play', params: { gameId } })
}
</script>

<template>
  <main class="home-view">
    <header class="home-view__header">
      <h1 class="home-view__title">{{ $t('app.title') }}</h1>
      <p class="home-view__subtitle">{{ $t('home.subheadline') }}</p>
    </header>

    <section class="home-view__game-grid" :aria-label="$t('home.headline')">
      <GameSelectionCard
        v-for="game in allGames"
        :key="game.id"
        :game-id="game.id"
        :title="game.title"
        :description="game.description"
        :stars="starsByGameId[game.id] ?? 0"
        :is-locked="false"
        @select="handleGameSelected"
      />
    </section>
  </main>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  background-color: var(--color-ui-bg);
  padding: var(--space-4);
  gap: var(--space-6);
}

.home-view__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  text-align: center;
  padding-top: var(--space-4);
}

.home-view__title {
  font-size: var(--font-size-title);
  color: var(--color-accent-yellow);
}

.home-view__subtitle {
  font-size: var(--font-size-small);
  color: var(--color-ui-text-secondary);
}

.home-view__game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}
</style>
