<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const step = ref(0)
const isPlaying = ref(false)
let playTimer: ReturnType<typeof setInterval> | null = null

const steps = [
  { title: 'Initial State', desc: 'Engineering budget: $1,500,000. Design budget: $650,000. Two sessions connected.', eng: 1500000, design: 650000, s1: 'idle', s2: 'idle', s1Action: '', s2Action: '' },
  { title: 'Session 1: BEGIN', desc: 'Session 1 starts a transaction.', eng: 1500000, design: 650000, s1: 'active', s2: 'idle', s1Action: 'BEGIN TRANSACTION;', s2Action: '' },
  { title: 'Session 1: UPDATE', desc: 'Session 1 subtracts $200K from Engineering. Change is visible only inside this transaction.', eng: 1300000, design: 650000, s1: 'active', s2: 'idle', s1Action: "UPDATE departments SET budget = budget - 200000\nWHERE id = 1;", s2Action: '' },
  { title: 'Session 2: SELECT', desc: 'Session 2 reads Engineering budget. With READ COMMITTED isolation, it still sees $1,500,000 (uncommitted change invisible).', eng: 1300000, design: 650000, s1: 'active', s2: 'reading', s1Action: '', s2Action: "SELECT budget FROM departments\nWHERE id = 1;\n-- Returns: $1,500,000" },
  { title: 'Session 1: UPDATE #2', desc: 'Session 1 adds $200K to Design.', eng: 1300000, design: 850000, s1: 'active', s2: 'idle', s1Action: "UPDATE departments SET budget = budget + 200000\nWHERE id = 10;", s2Action: '' },
  { title: 'Session 1: COMMIT', desc: 'Session 1 commits. Both changes are now permanent and visible to all sessions.', eng: 1300000, design: 850000, s1: 'committed', s2: 'idle', s1Action: 'COMMIT;', s2Action: '' },
  { title: 'Session 2: SELECT Again', desc: 'Session 2 now sees the committed changes. ACID guarantees both updates are visible together — never just one.', eng: 1300000, design: 850000, s1: 'done', s2: 'reading', s1Action: '', s2Action: "SELECT budget FROM departments;\n-- Engineering: $1,300,000\n-- Design: $850,000" },
]

const totalSteps = steps.length - 1

function next() { if (step.value < totalSteps) step.value++ }
function prev() { if (step.value > 0) step.value-- }
function reset() { step.value = 0; pause() }
function togglePlay() {
  if (isPlaying.value) { pause() } else {
    isPlaying.value = true
    playTimer = setInterval(() => { if (step.value < totalSteps) step.value++; else pause() }, 2500)
  }
}
function pause() { isPlaying.value = false; if (playTimer) { clearInterval(playTimer); playTimer = null } }
onUnmounted(() => { if (playTimer) clearInterval(playTimer) })

function fmt(n: number) { return '$' + n.toLocaleString() }

function sessionClass(state: string) {
  if (state === 'active') return 'border-blue-400 bg-blue-50'
  if (state === 'committed' || state === 'done') return 'border-green-400 bg-green-50'
  if (state === 'reading') return 'border-purple-400 bg-purple-50'
  return 'border-gray-200 bg-white'
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
      <div class="text-center mb-4">
        <h4 class="text-sm font-bold text-primary">{{ steps[step].title }}</h4>
        <p class="text-sm text-gray-600 mt-1">{{ steps[step].desc }}</p>
      </div>

      <!-- Database state -->
      <div class="flex justify-center gap-6 mb-6">
        <div class="bg-white border-2 border-gray-200 rounded-lg px-4 py-2 text-center transition-all duration-300"
          :class="{ 'border-yellow-400 bg-yellow-50': steps[step].eng !== 1500000 && steps[step].s1 === 'active' }">
          <div class="text-[10px] text-gray-400">Engineering</div>
          <div class="text-lg font-bold font-mono" :class="steps[step].eng !== 1500000 ? 'text-red-600' : 'text-gray-700'">
            {{ fmt(steps[step].eng) }}
          </div>
        </div>
        <div class="bg-white border-2 border-gray-200 rounded-lg px-4 py-2 text-center transition-all duration-300"
          :class="{ 'border-yellow-400 bg-yellow-50': steps[step].design !== 650000 && steps[step].s1 === 'active' }">
          <div class="text-[10px] text-gray-400">Design</div>
          <div class="text-lg font-bold font-mono" :class="steps[step].design !== 650000 ? 'text-green-600' : 'text-gray-700'">
            {{ fmt(steps[step].design) }}
          </div>
        </div>
      </div>

      <!-- Sessions -->
      <div class="grid grid-cols-2 gap-4">
        <div :class="['border-2 rounded-lg p-4 transition-all duration-300', sessionClass(steps[step].s1)]">
          <div class="text-xs font-bold mb-2">Session 1 <span class="text-gray-400">(writes)</span></div>
          <pre v-if="steps[step].s1Action" class="text-xs font-mono bg-gray-900 text-green-300 p-2 rounded whitespace-pre-wrap">{{ steps[step].s1Action }}</pre>
          <div v-else class="text-xs text-gray-400 italic">waiting...</div>
        </div>
        <div :class="['border-2 rounded-lg p-4 transition-all duration-300', sessionClass(steps[step].s2)]">
          <div class="text-xs font-bold mb-2">Session 2 <span class="text-gray-400">(reads)</span></div>
          <pre v-if="steps[step].s2Action" class="text-xs font-mono bg-gray-900 text-green-300 p-2 rounded whitespace-pre-wrap">{{ steps[step].s2Action }}</pre>
          <div v-else class="text-xs text-gray-400 italic">waiting...</div>
        </div>
      </div>
    </div>
  </div>
</template>
