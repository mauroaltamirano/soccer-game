<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <main class="settings-view">
    <header class="settings-view__header">
      <button class="settings-view__back-button" @click="router.back()">← Back</button>
      <h1 class="settings-view__title">{{ $t('settings.title') }}</h1>
    </header>

    <section class="settings-view__body">
      <!-- Settings content goes here in a future iteration -->
    </section>
  </main>
</template>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-ui-bg);
  padding: var(--space-4);
  font-family: var(--font-family-ui);
  color: var(--color-ui-text-primary);
}

.settings-view__header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-ui-border);
}

.settings-view__back-button {
  background: none;
  border: none;
  color: var(--color-accent-yellow);
  font-family: var(--font-family-ui);
  font-size: var(--font-size-small);
  cursor: pointer;
  min-height: var(--touch-target-min);
}

.settings-view__title {
  font-size: var(--font-size-large);
  color: var(--color-accent-yellow);
}
</style>
