<script setup lang="ts">
interface Props {
  stars: number
  maxStars?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxStars: 3,
})
</script>

<template>
  <div class="star-rating-display" :aria-label="$t('starRating.ariaLabel', { stars, maxStars })">
    <span
      v-for="starIndex in maxStars"
      :key="starIndex"
      class="star-rating-display__star"
      :class="{ 'star-rating-display__star--filled': starIndex <= stars }"
      aria-hidden="true"
    >
      ★
    </span>
  </div>
</template>

<style scoped>
.star-rating-display {
  display: flex;
  gap: var(--space-1);
}

.star-rating-display__star {
  font-size: var(--font-size-base);
  color: var(--color-star-empty);
}

.star-rating-display__star--filled {
  color: var(--color-star-filled);
}
</style>
