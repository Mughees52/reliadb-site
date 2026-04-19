<script setup lang="ts">
import { useProgress } from '../../composables/useProgress'

const { progress } = useProgress()
</script>

<template>
  <div v-if="progress.streakDays > 0" class="flex items-center gap-1.5 text-sm">
    <span class="text-orange-500 text-lg">&#128293;</span>
    <span class="font-semibold text-gray-700">{{ progress.streakDays }} day streak</span>
  </div>
</template>
