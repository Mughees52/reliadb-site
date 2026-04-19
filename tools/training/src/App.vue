<script setup lang="ts">
import { onMounted } from 'vue'
import { useSqlJs } from './composables/useSqlJs'

const { isReady, isLoading, initError, initialize } = useSqlJs()

onMounted(() => {
  initialize()
})
</script>

<template>
  <div class="training-app">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center">
        <div class="inline-block w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin mb-4"></div>
        <p class="text-muted text-sm">Loading SQL engine...</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="initError" class="max-w-lg mx-auto mt-24 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
      <p class="text-red-800 font-semibold mb-2">Failed to initialize SQL engine</p>
      <p class="text-red-600 text-sm">{{ initError }}</p>
      <button
        class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
        @click="initialize()"
      >
        Retry
      </button>
    </div>

    <!-- App ready -->
    <router-view v-else-if="isReady" />
  </div>
</template>
