<script setup lang="ts">
defineProps<{
  moduleId?: number
}>()
</script>

<template>
  <div class="bg-primary/5 rounded-xl border border-primary/20 p-6 mt-8">
    <h3 class="text-lg font-bold text-primary mb-2">Need help with real MySQL performance?</h3>
    <p class="text-sm text-gray-600 mb-4">
      ReliaDB provides expert MySQL consulting — database audits, query optimization, and ongoing support for production systems.
    </p>
    <div class="flex flex-wrap gap-3">
      <a href="/contact.html" class="px-4 py-2 bg-cta text-white text-sm font-semibold rounded-lg hover:bg-cta-dark transition-colors">
        Book Free Assessment
      </a>
      <a
        v-if="moduleId === 8"
        href="/tools/explain/"
        class="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors"
      >
        Try EXPLAIN Analyzer
      </a>
    </div>
  </div>
</template>
