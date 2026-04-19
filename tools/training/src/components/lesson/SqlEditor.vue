<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCodeMirror } from '../../composables/useCodeMirror'
import { useSqlJs } from '../../composables/useSqlJs'
import type { QueryOutput } from '../../types'
import ResultTable from './ResultTable.vue'

const props = withDefaults(defineProps<{
  defaultQuery?: string
  placeholder?: string
  height?: string
  showResults?: boolean
}>(), {
  defaultQuery: '',
  placeholder: '-- Write your SQL here and press Ctrl+Enter to run',
  height: '150px',
  showResults: true,
})

const emit = defineEmits<{
  result: [output: QueryOutput]
}>()

const editorContainer = ref<HTMLElement | null>(null)
const queryResult = ref<QueryOutput | null>(null)
const executionTime = ref(0)
const isRunning = ref(false)

const { execute } = useSqlJs()

function runQuery() {
  const sql = getValue()
  if (!sql.trim()) return

  isRunning.value = true
  const start = performance.now()
  const result = execute(sql)
  executionTime.value = Math.round(performance.now() - start)
  queryResult.value = result
  isRunning.value = false
  emit('result', result)
}

function resetQuery() {
  setValue(props.defaultQuery)
  queryResult.value = null
}

const { getValue, setValue, focus } = useCodeMirror(editorContainer, {
  initialValue: props.defaultQuery,
  placeholder: props.placeholder,
  height: props.height,
  onExecute: runQuery,
})

watch(() => props.defaultQuery, (val) => {
  setValue(val)
  queryResult.value = null
})

defineExpose({ getValue, setValue, runQuery, resetQuery, focus })
</script>

<template>
  <div class="sql-editor">
    <!-- Editor -->
    <div ref="editorContainer" class="mb-2"></div>

    <!-- Controls -->
    <div class="flex items-center gap-2 mb-3">
      <button
        class="px-4 py-1.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-1.5"
        :disabled="isRunning"
        @click="runQuery"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        Run
        <kbd class="ml-1 text-[10px] opacity-70">Ctrl+Enter</kbd>
      </button>
      <button
        class="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
        @click="resetQuery"
      >
        Reset
      </button>
    </div>

    <!-- Results -->
    <ResultTable
      v-if="showResults && queryResult"
      :result="queryResult"
      :execution-time="executionTime"
    />
  </div>
</template>
