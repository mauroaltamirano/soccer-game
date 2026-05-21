<script setup lang="ts">
import Phaser from 'phaser'
import { ref, onMounted, onUnmounted, shallowRef } from 'vue'

interface Props {
  sceneClasses: (typeof Phaser.Scene)[]
  initialSceneKey: string
  pixelScale?: number
}

const props = withDefaults(defineProps<Props>(), {
  pixelScale: 4,
})

const canvasContainerElement = ref<HTMLDivElement | null>(null)
const phaserGameInstance = shallowRef<Phaser.Game | null>(null)

function getActiveScene(): Phaser.Scene | undefined {
  const sceneManager = phaserGameInstance.value?.scene
  if (!sceneManager) return undefined
  return sceneManager.getScene(props.initialSceneKey) ?? undefined
}

defineExpose({ getActiveScene })

onMounted(() => {
  if (!canvasContainerElement.value) return

  const containerWidth = canvasContainerElement.value.clientWidth
  const containerHeight = canvasContainerElement.value.clientHeight

  phaserGameInstance.value = new Phaser.Game({
    type: Phaser.AUTO,
    width: Math.floor(containerWidth / props.pixelScale) * props.pixelScale,
    height: Math.floor(containerHeight / props.pixelScale) * props.pixelScale,
    parent: canvasContainerElement.value,
    backgroundColor: '#0f0f1a',
    pixelArt: true,
    scene: props.sceneClasses,
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  })
})

onUnmounted(() => {
  phaserGameInstance.value?.destroy(true)
  phaserGameInstance.value = null
})
</script>

<template>
  <div ref="canvasContainerElement" class="phaser-game-canvas-container" />
</template>

<style scoped>
.phaser-game-canvas-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--color-ui-bg);
}

.phaser-game-canvas-container :deep(canvas) {
  display: block;
  image-rendering: pixelated;
}
</style>
