<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const step = ref(0)
const isPlaying = ref(false)
let playTimer: ReturnType<typeof setInterval> | null = null

const tableRows = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  value: [15, 22, 8, 42, 55, 31, 67, 42, 19, 73, 42, 5][i],
}))

const targetValue = 42
const totalRows = tableRows.length
const matchIndices = [3, 7, 10] // indices where value=42

const steps = [
  { title: 'Setup', desc: `Find all rows where value = ${targetValue}. Compare full scan vs index scan.`, scanPos: -1, indexDone: false },
  { title: 'Scanning...', desc: 'Full scan: row 1-3 (no match yet). Index: already found all 3 matches.', scanPos: 2, indexDone: true },
  { title: 'Scanning...', desc: 'Full scan: row 4 — match! But must keep scanning. Index: done.', scanPos: 4, indexDone: true },
  { title: 'Scanning...', desc: 'Full scan: rows 5-7, no match. Still going...', scanPos: 6, indexDone: true },
  { title: 'Scanning...', desc: 'Full scan: row 8 — match! Still must check remaining rows.', scanPos: 8, indexDone: true },
  { title: 'Scanning...', desc: 'Full scan: rows 9-10, checking...', scanPos: 9, indexDone: true },
  { title: 'Scanning...', desc: 'Full scan: row 11 — match! Almost done...', scanPos: 10, indexDone: true },
  { title: 'Complete', desc: `Full scan: examined ALL ${totalRows} rows. Index scan: examined 3 rows directly. Same result, vastly different cost.`, scanPos: 11, indexDone: true },
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
    }, 1500)
  }
}
function pause() { isPlaying.value = false; if (playTimer) { clearInterval(playTimer); playTimer = null } }

onUnmounted(() => { if (playTimer) clearInterval(playTimer) })

function scanRowClass(i: number) {
  const pos = steps[step.value].scanPos
  if (pos < 0) return 'bg-white border-gray-200'
  if (i === pos) return 'bg-yellow-100 border-yellow-400'
  if (i < pos && matchIndices.includes(i)) return 'bg-green-100 border-green-400'
  if (i <= pos) return 'bg-gray-50 border-gray-200'
  return 'bg-white border-gray-200'
}

function indexRowClass(i: number) {
  if (!steps[step.value].indexDone) return 'bg-white border-gray-200'
  if (matchIndices.includes(i)) return 'bg-green-100 border-green-400'
  return 'bg-white border-gray-200 opacity-20'
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
      <p class="text-sm text-gray-600 text-center mb-4">{{ steps[step].desc }}</p>

      <div class="grid grid-cols-2 gap-8">
        <!-- Full scan -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-red-600 uppercase tracking-wide">Full Table Scan</span>
            <span v-if="step > 0" class="text-xs text-red-500">{{ Math.min(steps[step].scanPos + 1, totalRows) }}/{{ totalRows }} examined</span>
          </div>
          <div class="grid grid-cols-4 gap-1">
            <div v-for="(row, i) in tableRows" :key="i"
              :class="['border rounded px-2 py-1 text-center text-xs font-mono transition-all duration-200', scanRowClass(i)]">
              {{ row.value }}
            </div>
          </div>
          <div v-if="step === totalSteps" class="mt-2 text-center text-xs font-bold text-red-600">
            {{ totalRows }} rows examined &#128034;
          </div>
        </div>

        <!-- Index scan -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-green-600 uppercase tracking-wide">Index Lookup</span>
            <span v-if="steps[step].indexDone" class="text-xs text-green-500">3 rows found instantly</span>
          </div>
          <div class="grid grid-cols-4 gap-1">
            <div v-for="(row, i) in tableRows" :key="i"
              :class="['border rounded px-2 py-1 text-center text-xs font-mono transition-all duration-200', indexRowClass(i)]">
              {{ row.value }}
            </div>
          </div>
          <div v-if="step === totalSteps" class="mt-2 text-center text-xs font-bold text-green-600">
            3 rows examined &#9889;
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
