<script setup lang="ts">
import { ref } from 'vue'

const step = ref(0)
const isPlaying = ref(false)
let playTimer: ReturnType<typeof setInterval> | null = null

// B+ tree structure: root -> internal -> leaf -> data
const tree = {
  keys: [30, 60],
  children: [
    { keys: [10, 20, 30], leafData: ['Row A', 'Row B', 'Row C'] },
    { keys: [35, 42, 55], leafData: ['Row D', 'Row E', 'Row F'] },
    { keys: [60, 75, 90], leafData: ['Row G', 'Row H', 'Row I'] },
  ],
}

const steps = [
  { title: 'Start', desc: 'Looking for value 42 in a B+ tree index with 9 rows.', highlight: 'none' },
  { title: 'Root Node', desc: 'Compare 42 with root keys [30, 60]. 42 > 30 and 42 < 60, so go to the middle child.', highlight: 'root' },
  { title: 'Leaf Node', desc: 'Reached leaf node [35, 42, 55]. Scan for 42... Found it!', highlight: 'leaf-1' },
  { title: 'Row Pointer', desc: '42 points to Row E. Index lookup complete: 2 hops instead of scanning all 9 rows.', highlight: 'found' },
  { title: 'Comparison', desc: 'Full table scan: 9 rows examined. Index lookup: 2 nodes examined. For 1M rows, this is the difference between seconds and milliseconds.', highlight: 'compare' },
]

const totalSteps = steps.length - 1

function next() { if (step.value < totalSteps) step.value++ }
function prev() { if (step.value > 0) step.value-- }
function reset() { step.value = 0; pause() }

function togglePlay() {
  if (isPlaying.value) { pause() } else { play() }
}

function play() {
  isPlaying.value = true
  playTimer = setInterval(() => {
    if (step.value < totalSteps) { step.value++ } else { pause() }
  }, 2500)
}

function pause() {
  isPlaying.value = false
  if (playTimer) { clearInterval(playTimer); playTimer = null }
}

function nodeClass(id: string) {
  const s = step.value
  if (s === 0) return 'bg-gray-100 border-gray-300'
  if (s === 1 && id === 'root') return 'bg-blue-100 border-blue-500 ring-2 ring-blue-300'
  if (s === 2 && id === 'leaf-1') return 'bg-blue-100 border-blue-500 ring-2 ring-blue-300'
  if (s >= 3 && id === 'found') return 'bg-green-100 border-green-500 ring-2 ring-green-300'
  if (s === 1 && (id === 'leaf-0' || id === 'leaf-2')) return 'bg-gray-50 border-gray-200 opacity-50'
  if (s >= 2 && id === 'root') return 'bg-blue-50 border-blue-300'
  return 'bg-gray-100 border-gray-300'
}

function keyClass(nodeId: string, key: number) {
  if (step.value === 2 && nodeId === 'leaf-1' && key === 42) return 'bg-green-400 text-white font-bold'
  if (step.value >= 3 && nodeId === 'leaf-1' && key === 42) return 'bg-green-500 text-white font-bold'
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
      <span class="text-xs text-muted ml-auto">Step {{ step + 1 }}/{{ totalSteps + 1 }}</span>
    </div>

    <div class="p-6">
      <!-- Step description -->
      <div class="mb-6 text-center">
        <h4 class="text-sm font-bold text-primary">{{ steps[step].title }}</h4>
        <p class="text-sm text-gray-600 mt-1">{{ steps[step].desc }}</p>
      </div>

      <!-- Tree visualization -->
      <div class="flex flex-col items-center gap-6" v-if="step < 4">
        <!-- Root node -->
        <div :class="['border-2 rounded-lg px-4 py-2 transition-all duration-500', nodeClass('root')]">
          <div class="text-[10px] text-gray-400 mb-1">Root</div>
          <div class="flex gap-2">
            <span v-for="k in tree.keys" :key="k" class="px-3 py-1 rounded text-sm font-mono border">{{ k }}</span>
          </div>
        </div>

        <!-- Arrows -->
        <div class="flex justify-center gap-24 text-gray-300">
          <span :class="step >= 1 && step < 4 ? 'text-gray-300' : ''">|</span>
          <span :class="step >= 1 ? 'text-blue-500 font-bold' : 'text-gray-300'">|</span>
          <span :class="step >= 1 && step < 4 ? 'text-gray-300' : ''">|</span>
        </div>

        <!-- Leaf nodes -->
        <div class="flex gap-4 flex-wrap justify-center">
          <div v-for="(child, i) in tree.children" :key="i"
            :class="['border-2 rounded-lg px-3 py-2 transition-all duration-500', nodeClass('leaf-' + i)]">
            <div class="text-[10px] text-gray-400 mb-1">Leaf {{ i + 1 }}</div>
            <div class="flex gap-1">
              <span v-for="k in child.keys" :key="k"
                :class="['px-2 py-0.5 rounded text-xs font-mono border transition-all duration-300', keyClass('leaf-' + i, k)]">
                {{ k }}
              </span>
            </div>
          </div>
        </div>

        <!-- Found row -->
        <div v-if="step >= 3" class="mt-2">
          <div :class="['border-2 rounded-lg px-6 py-3 transition-all duration-500 text-center', nodeClass('found')]">
            <div class="text-[10px] text-gray-400 mb-1">Data Row</div>
            <span class="text-sm font-mono font-bold text-green-700">Row E (id=42)</span>
          </div>
        </div>
      </div>

      <!-- Comparison view -->
      <div v-if="step === 4" class="grid grid-cols-2 gap-6">
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div class="text-3xl mb-2">&#128034;</div>
          <div class="font-bold text-red-700">Full Table Scan</div>
          <div class="text-2xl font-bold text-red-600 mt-2">9 rows</div>
          <div class="text-xs text-red-500 mt-1">Read every single row</div>
        </div>
        <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div class="text-3xl mb-2">&#9889;</div>
          <div class="font-bold text-green-700">B+ Tree Index</div>
          <div class="text-2xl font-bold text-green-600 mt-2">2 nodes</div>
          <div class="text-xs text-green-500 mt-1">Root → Leaf → Done</div>
        </div>
      </div>
    </div>
  </div>
</template>
