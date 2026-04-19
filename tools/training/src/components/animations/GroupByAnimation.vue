<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref(0)
const isPlaying = ref(false)
let playTimer: ReturnType<typeof setInterval> | null = null

const rows = [
  { name: 'Alice', dept: 'Engineering', salary: 120000 },
  { name: 'Bob', dept: 'Marketing', salary: 85000 },
  { name: 'Carol', dept: 'Engineering', salary: 105000 },
  { name: 'David', dept: 'Sales', salary: 92000 },
  { name: 'Eva', dept: 'Marketing', salary: 78000 },
  { name: 'Frank', dept: 'Sales', salary: 88000 },
]

const buckets = computed(() => {
  const b: Record<string, { names: string[]; salaries: number[]; color: string }> = {
    Engineering: { names: [], salaries: [], color: '#2980B9' },
    Marketing: { names: [], salaries: [], color: '#8E44AD' },
    Sales: { names: [], salaries: [], color: '#E74C3C' },
  }
  const limit = Math.min(step.value, rows.length)
  for (let i = 0; i < limit; i++) {
    const r = rows[i]
    b[r.dept].names.push(r.name)
    b[r.dept].salaries.push(r.salary)
  }
  return b
})

const showAggregates = computed(() => step.value > rows.length)

const steps = [
  'Start: 6 unsorted rows. GROUP BY department will sort them into buckets.',
  'Alice (Engineering, $120K) → Engineering bucket',
  'Bob (Marketing, $85K) → Marketing bucket',
  'Carol (Engineering, $105K) → Engineering bucket',
  'David (Sales, $92K) → Sales bucket',
  'Eva (Marketing, $78K) → Marketing bucket',
  'Frank (Sales, $88K) → Sales bucket',
  'All rows bucketed. Now apply COUNT(*) and AVG(salary) to each bucket.',
]

const totalSteps = steps.length - 1

function next() { if (step.value < totalSteps) step.value++ }
function prev() { if (step.value > 0) step.value-- }
function reset() { step.value = 0; pause() }
function togglePlay() {
  if (isPlaying.value) { pause() } else {
    isPlaying.value = true
    playTimer = setInterval(() => {
      if (step.value < totalSteps) step.value++; else pause()
    }, 1800)
  }
}
function pause() { isPlaying.value = false; if (playTimer) { clearInterval(playTimer); playTimer = null } }

function rowClass(i: number) {
  if (step.value === 0) return 'bg-white border-gray-200'
  if (i === step.value - 1) return 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-200'
  if (i < step.value) return 'bg-gray-50 border-gray-200 opacity-40'
  return 'bg-white border-gray-200'
}
</script>

<template>
  <div class="animation-container">
    <div class="animation-controls">
      <button @click="prev" :disabled="step === 0" class="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40">Back</button>
      <button @click="togglePlay" class="px-3 py-1 text-sm bg-accent text-white rounded-lg hover:bg-accent/90">{{ isPlaying ? 'Pause' : 'Play' }}</button>
      <button @click="next" :disabled="step === totalSteps" class="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40">Next</button>
      <button @click="reset" class="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">Reset</button>
      <span class="text-xs text-muted ml-auto">Step {{ step + 1 }}/{{ totalSteps + 1 }}</span>
    </div>

    <div class="p-6">
      <p class="text-sm text-gray-600 text-center mb-4">{{ steps[step] }}</p>

      <div class="grid grid-cols-2 gap-6">
        <!-- Source rows -->
        <div>
          <div class="text-xs font-bold text-primary mb-2 uppercase tracking-wide">Source Rows</div>
          <div class="space-y-1">
            <div v-for="(row, i) in rows" :key="i"
              :class="['border rounded-lg px-3 py-1.5 text-xs font-mono transition-all duration-300', rowClass(i)]">
              {{ row.name }} | {{ row.dept }} | ${{ (row.salary / 1000).toFixed(0) }}K
            </div>
          </div>
        </div>

        <!-- Buckets -->
        <div>
          <div class="text-xs font-bold text-primary mb-2 uppercase tracking-wide">GROUP BY department</div>
          <div class="space-y-3">
            <div v-for="(bucket, dept) in buckets" :key="dept"
              class="border-2 rounded-lg p-3 transition-all duration-300"
              :style="{ borderColor: bucket.color + '60', backgroundColor: bucket.color + '10' }">
              <div class="text-xs font-bold mb-1" :style="{ color: bucket.color }">{{ dept }}</div>
              <div v-if="bucket.names.length === 0" class="text-xs text-gray-400 italic">empty</div>
              <div v-else class="text-xs font-mono space-y-0.5">
                <div v-for="(n, i) in bucket.names" :key="i">{{ n }} (${{ (bucket.salaries[i] / 1000).toFixed(0) }}K)</div>
              </div>
              <!-- Aggregates -->
              <div v-if="showAggregates && bucket.names.length > 0" class="mt-2 pt-2 border-t text-xs font-bold" :style="{ borderColor: bucket.color + '40' }">
                COUNT: {{ bucket.names.length }} |
                AVG: ${{ Math.round(bucket.salaries.reduce((a, b) => a + b, 0) / bucket.names.length / 1000) }}K
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
