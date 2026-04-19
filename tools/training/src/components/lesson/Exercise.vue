<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Exercise as ExerciseType, QueryOutput, QueryResult } from '../../types'
import { isQueryError } from '../../types'
import { grade } from '../../composables/useGrader'
import { useProgress } from '../../composables/useProgress'
import SqlEditor from './SqlEditor.vue'
import ResultTable from './ResultTable.vue'
import HintSystem from './HintSystem.vue'

const props = defineProps<{
  exercise: ExerciseType
}>()

const { markExerciseAttempt, isExerciseComplete, getExerciseAttempt } = useProgress()

const editorRef = ref<InstanceType<typeof SqlEditor> | null>(null)
const gradeResult = ref<{ passed: boolean; message: string } | null>(null)
const attempts = ref(getExerciseAttempt(props.exercise.moduleId, props.exercise.id)?.attempts || 0)
const showSolution = ref(false)
const hintsUsed = ref(0)

const completed = computed(() => isExerciseComplete(props.exercise.moduleId, props.exercise.id))

const difficultyClass = computed(() => {
  const map = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' }
  return map[props.exercise.difficulty]
})

function checkAnswer(output: QueryOutput) {
  if (isQueryError(output)) {
    gradeResult.value = { passed: false, message: output.error }
    return
  }

  const result = grade(output as QueryResult, props.exercise.expectedResult, props.exercise.validationMode)
  gradeResult.value = result
  attempts.value++

  markExerciseAttempt(
    props.exercise.moduleId,
    props.exercise.id,
    result.passed,
    hintsUsed.value,
    showSolution.value
  )
}

function revealSolution() {
  showSolution.value = true
  markExerciseAttempt(
    props.exercise.moduleId,
    props.exercise.id,
    false,
    hintsUsed.value,
    true
  )
}

function onHintUsed(count: number) {
  hintsUsed.value = count
}
</script>

<template>
  <div class="exercise-wrapper bg-white rounded-xl border border-border shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="bg-bg-alt px-6 py-4 border-b border-border">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span v-if="completed" class="success-check text-success text-xl">&#10003;</span>
          <span v-else class="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs text-gray-400">?</span>
          <h3 class="text-base font-bold text-primary">{{ exercise.title }}</h3>
        </div>
        <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="difficultyClass">
          {{ exercise.difficulty }}
        </span>
      </div>
    </div>

    <div class="p-6">
      <!-- Description -->
      <div class="prose mb-4" v-html="exercise.description"></div>

      <!-- Expected output -->
      <div class="mb-4">
        <h4 class="text-sm font-semibold text-gray-700 mb-2">Expected Output:</h4>
        <ResultTable
          :result="{ columns: exercise.expectedResult.columns, values: exercise.expectedResult.values }"
          :max-rows="10"
        />
      </div>

      <!-- SQL Editor -->
      <div class="mb-4">
        <h4 class="text-sm font-semibold text-gray-700 mb-2">Your Query:</h4>
        <SqlEditor
          ref="editorRef"
          :default-query="exercise.starterQuery || ''"
          placeholder="-- Write your SQL query here"
          :show-results="false"
          @result="checkAnswer"
        />
      </div>

      <!-- Grade result -->
      <div v-if="gradeResult" class="mb-4">
        <div
          class="rounded-lg p-3 text-sm font-medium"
          :class="gradeResult.passed ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'"
        >
          <span v-if="gradeResult.passed" class="success-check mr-1">&#10003;</span>
          {{ gradeResult.message }}
        </div>
      </div>

      <!-- Hints -->
      <HintSystem
        v-if="exercise.hints.length > 0"
        :hints="exercise.hints"
        :exercise-id="`m${exercise.moduleId}-e${exercise.id}`"
        @hint-used="onHintUsed"
      />

      <!-- Show solution (after 3 failed attempts) -->
      <div v-if="attempts >= 3 && !completed" class="mt-4">
        <button
          v-if="!showSolution"
          class="text-sm text-accent hover:underline"
          @click="revealSolution"
        >
          Show Solution
        </button>
        <div v-else class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">Solution:</h4>
          <pre class="bg-gray-900 text-green-300 p-3 rounded-lg text-sm font-mono overflow-x-auto">{{ exercise.expectedQuery }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
