<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  hints: string[]
  exerciseId: string
}>()

const emit = defineEmits<{
  hintUsed: [count: number]
}>()

const revealedCount = ref(0)

function revealNext() {
  if (revealedCount.value < props.hints.length) {
    revealedCount.value++
    emit('hintUsed', revealedCount.value)
  }
}
</script>

<template>
  <div class="hint-system">
    <button
      v-if="revealedCount < hints.length"
      class="text-sm text-accent hover:underline flex items-center gap-1"
      @click="revealNext"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.5"/></svg>
      Show Hint ({{ revealedCount + 1 }}/{{ hints.length }})
    </button>

    <div v-for="(hint, i) in hints.slice(0, revealedCount)" :key="i" class="mt-2">
      <div class="callout callout-tip text-sm">
        <strong>Hint {{ i + 1 }}:</strong> {{ hint }}
      </div>
    </div>
  </div>
</template>
