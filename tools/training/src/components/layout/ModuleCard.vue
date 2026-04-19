<script setup lang="ts">
import { computed } from 'vue'
import type { Module } from '../../types'
import { useProgress } from '../../composables/useProgress'

const props = defineProps<{
  module: Module
}>()

const { getModuleProgress } = useProgress()

const progress = computed(() =>
  getModuleProgress(props.module.id, props.module.lessons.length, props.module.exercises.length)
)

const statusLabel = computed(() => {
  if (progress.value.percent === 100) return 'Completed'
  if (progress.value.percent > 0) return 'In Progress'
  return 'Start'
})

const statusClass = computed(() => {
  if (progress.value.percent === 100) return 'bg-success text-white'
  if (progress.value.percent > 0) return 'bg-cta text-white'
  return 'bg-accent text-white'
})
</script>

<template>
  <router-link
    :to="{ name: 'module', params: { moduleId: module.id } }"
    class="module-card block bg-white rounded-xl border border-border shadow-sm overflow-hidden no-underline"
  >
    <!-- Color accent bar -->
    <div class="h-1" :style="{ backgroundColor: module.color }"></div>

    <div class="p-6">
      <!-- Header -->
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
          <span
            class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
            :style="{ backgroundColor: module.color }"
          >
            {{ module.id }}
          </span>
          <h3 class="text-lg font-bold text-primary leading-tight">{{ module.title }}</h3>
        </div>
      </div>

      <!-- Description -->
      <p class="text-sm text-gray-600 leading-relaxed mb-4">{{ module.description }}</p>

      <!-- Stats -->
      <div class="flex items-center gap-4 text-xs text-muted mb-4">
        <span>{{ module.lessons.length }} lessons</span>
        <span>{{ module.exercises.length }} exercises</span>
      </div>

      <!-- Progress bar -->
      <div class="mb-3">
        <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="progress-fill h-full rounded-full"
            :style="{ width: progress.percent + '%', backgroundColor: module.color }"
          ></div>
        </div>
      </div>

      <!-- Status -->
      <div class="flex items-center justify-between">
        <span class="text-xs text-muted">{{ progress.completed }}/{{ progress.total }} completed</span>
        <span class="text-xs font-semibold px-3 py-1 rounded-full" :class="statusClass">
          {{ statusLabel }}
        </span>
      </div>
    </div>
  </router-link>
</template>
