<script setup lang="ts">
defineProps<{
  percent: number
  color?: string
  size?: 'sm' | 'md'
}>()
</script>

<template>
  <div class="h-2 bg-gray-100 rounded-full overflow-hidden" :class="{ 'h-1.5': size === 'sm' }">
    <div
      class="progress-fill h-full rounded-full"
      :style="{ width: percent + '%', backgroundColor: color || '#2980B9' }"
    ></div>
  </div>
</template>
