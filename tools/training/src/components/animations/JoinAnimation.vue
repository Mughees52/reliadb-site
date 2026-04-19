<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  joinType?: 'inner' | 'left'
}>(), { joinType: 'inner' })

const step = ref(0)
const isPlaying = ref(false)
let playTimer: ReturnType<typeof setInterval> | null = null

const leftTable = [
  { id: 1, name: 'Alice', dept_id: 1 },
  { id: 2, name: 'Bob', dept_id: 2 },
  { id: 3, name: 'Carol', dept_id: 1 },
  { id: 4, name: 'David', dept_id: 4 },
]
const rightTable = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Marketing' },
  { id: 3, name: 'Sales' },
]

interface ResultRow { emp: string; dept: string | null; matched: boolean }
const resultRows: ResultRow[] = [
  { emp: 'Alice', dept: 'Engineering', matched: true },
  { emp: 'Bob', dept: 'Marketing', matched: true },
  { emp: 'Carol', dept: 'Engineering', matched: true },
  ...(props.joinType === 'left' ? [{ emp: 'David', dept: null, matched: false }] : []),
]

const steps = [
  { title: 'Setup', desc: `${props.joinType === 'inner' ? 'INNER' : 'LEFT'} JOIN employees ON dept_id = departments.id`, outerIdx: -1, innerIdx: -1, resultCount: 0 },
  { title: 'Row 1: Alice (dept_id=1)', desc: 'Scan departments for id=1 → Found Engineering!', outerIdx: 0, innerIdx: 0, resultCount: 1 },
  { title: 'Row 2: Bob (dept_id=2)', desc: 'Scan departments for id=2 → Found Marketing!', outerIdx: 1, innerIdx: 1, resultCount: 2 },
  { title: 'Row 3: Carol (dept_id=1)', desc: 'Scan departments for id=1 → Found Engineering!', outerIdx: 2, innerIdx: 0, resultCount: 3 },
  {
    title: 'Row 4: David (dept_id=4)',
    desc: props.joinType === 'left' ? 'Scan departments for id=4 → No match. LEFT JOIN keeps the row with NULL.' : 'Scan departments for id=4 → No match. INNER JOIN excludes this row.',
    outerIdx: 3, innerIdx: -1, resultCount: props.joinType === 'left' ? 4 : 3
  },
  { title: 'Complete', desc: `${resultRows.length} rows in result. ${props.joinType === 'inner' ? 'INNER JOIN dropped David (no matching department).' : 'LEFT JOIN kept David with NULL department.'}`, outerIdx: -1, innerIdx: -1, resultCount: resultRows.length },
]

const totalSteps = steps.length - 1

function next() { if (step.value < totalSteps) step.value++ }
function prev() { if (step.value > 0) step.value-- }
function reset() { step.value = 0; pause() }

function togglePlay() {
  if (isPlaying.value) { pause() } else {
    isPlaying.value = true
    playTimer = setInterval(() => {
      if (step.value < totalSteps) { step.value++ } else { pause() }
    }, 2000)
  }
}

function pause() {
  isPlaying.value = false
  if (playTimer) { clearInterval(playTimer); playTimer = null }
}

function leftRowClass(i: number) {
  if (steps[step.value].outerIdx === i) return 'bg-blue-100 border-blue-400 ring-2 ring-blue-200'
  if (step.value > 0 && i < steps[step.value].outerIdx) return 'bg-gray-50 opacity-60'
  return 'bg-white'
}

function rightRowClass(i: number) {
  if (steps[step.value].innerIdx === i) return 'bg-green-100 border-green-400 ring-2 ring-green-200'
  return 'bg-white'
}
</script>

<template>
  <div class="animation-container">
    <div class="animation-controls">
      <button @click="prev" :disabled="step === 0" class="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40">Back</button>
      <button @click="togglePlay" class="px-3 py-1 text-sm bg-accent text-white rounded-lg hover:bg-accent/90">{{ isPlaying ? 'Pause' : 'Play' }}</button>
      <button @click="next" :disabled="step === totalSteps" class="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40">Next</button>
      <button @click="reset" class="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">Reset</button>
      <span class="text-xs text-muted ml-auto">{{ joinType === 'inner' ? 'INNER' : 'LEFT' }} JOIN &mdash; Step {{ step + 1 }}/{{ totalSteps + 1 }}</span>
    </div>

    <div class="p-6">
      <div class="mb-4 text-center">
        <h4 class="text-sm font-bold text-primary">{{ steps[step].title }}</h4>
        <p class="text-sm text-gray-600 mt-1">{{ steps[step].desc }}</p>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <!-- Left table (employees) -->
        <div>
          <div class="text-xs font-bold text-primary mb-2 uppercase tracking-wide">Employees</div>
          <div class="space-y-1">
            <div v-for="(row, i) in leftTable" :key="row.id"
              :class="['border rounded-lg px-3 py-1.5 text-xs font-mono transition-all duration-300', leftRowClass(i)]">
              {{ row.name }} <span class="text-gray-400">(dept={{ row.dept_id }})</span>
            </div>
          </div>
        </div>

        <!-- Right table (departments) -->
        <div>
          <div class="text-xs font-bold text-primary mb-2 uppercase tracking-wide">Departments</div>
          <div class="space-y-1">
            <div v-for="(row, i) in rightTable" :key="row.id"
              :class="['border rounded-lg px-3 py-1.5 text-xs font-mono transition-all duration-300', rightRowClass(i)]">
              {{ row.id }}: {{ row.name }}
            </div>
          </div>
        </div>

        <!-- Result table -->
        <div>
          <div class="text-xs font-bold text-green-700 mb-2 uppercase tracking-wide">Result ({{ steps[step].resultCount }} rows)</div>
          <div class="space-y-1">
            <div v-for="(row, i) in resultRows.slice(0, steps[step].resultCount)" :key="i"
              class="border border-green-200 bg-green-50 rounded-lg px-3 py-1.5 text-xs font-mono transition-all duration-300">
              {{ row.emp }} &mdash; {{ row.dept ?? 'NULL' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
