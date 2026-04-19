<script setup lang="ts">
import { computed } from 'vue'
import type { QueryOutput } from '../../types'
import { isQueryError } from '../../types'

const props = defineProps<{
  result: QueryOutput
  executionTime?: number
  maxRows?: number
}>()

const maxDisplay = computed(() => props.maxRows || 100)

const displayValues = computed(() => {
  if (isQueryError(props.result)) return []
  return props.result.values.slice(0, maxDisplay.value)
})

const truncated = computed(() => {
  if (isQueryError(props.result)) return false
  return props.result.values.length > maxDisplay.value
})
</script>

<template>
  <div class="result-container">
    <!-- Error state -->
    <div v-if="isQueryError(result)" class="bg-red-50 border border-red-200 rounded-lg p-3">
      <p class="text-red-700 text-sm font-mono">{{ result.error }}</p>
    </div>

    <!-- Empty result -->
    <div v-else-if="result.columns.length === 0" class="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <p class="text-gray-500 text-sm">Query executed successfully. No rows returned.</p>
      <p v-if="executionTime !== undefined" class="text-xs text-muted mt-1">{{ executionTime }}ms</p>
    </div>

    <!-- Results table -->
    <div v-else>
      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="result-table">
          <thead>
            <tr>
              <th v-for="col in result.columns" :key="col">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in displayValues" :key="i">
              <td v-for="(cell, j) in row" :key="j">
                <span v-if="cell === null" class="text-gray-400 italic">NULL</span>
                <span v-else>{{ cell }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between mt-1.5 text-xs text-muted">
        <span>
          {{ result.values.length }} row{{ result.values.length !== 1 ? 's' : '' }}
          <span v-if="truncated"> (showing {{ maxDisplay }})</span>
        </span>
        <span v-if="executionTime !== undefined">{{ executionTime }}ms</span>
      </div>
    </div>
  </div>
</template>
