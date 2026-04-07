<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { EditorView, keymap, placeholder as phPlugin } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sql, MySQL } from '@codemirror/lang-sql'
import { defaultKeymap } from '@codemirror/commands'
import { detectFormat } from '../parsers/detect-format'

const props = defineProps<{
  explain: string
  query: string
  ddl: string
  hasResult: boolean
}>()

const emit = defineEmits<{
  'update:explain': [value: string]
  'update:query': [value: string]
  'update:ddl': [value: string]
  analyze: []
  reset: []
}>()

const activeTab = ref<'explain' | 'query' | 'ddl'>('explain')
const detectedFormat = ref('')

const explainRef = ref<HTMLDivElement>()
const queryRef = ref<HTMLDivElement>()
const ddlRef = ref<HTMLDivElement>()

let explainEditor: EditorView | null = null
let queryEditor: EditorView | null = null
let ddlEditor: EditorView | null = null

function createEditor(
  parent: HTMLElement,
  value: string,
  placeholderText: string,
  onChange: (val: string) => void,
): EditorView {
  const extensions = [
    keymap.of(defaultKeymap),
    sql({ dialect: MySQL }),
    phPlugin(placeholderText),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString())
      }
    }),
    EditorView.lineWrapping,
    EditorView.theme({
      '&': { height: '200px' },
      '.cm-scroller': { overflow: 'auto' },
    }),
  ]

  return new EditorView({
    state: EditorState.create({ doc: value, extensions }),
    parent,
  })
}

onMounted(() => {
  if (explainRef.value) {
    explainEditor = createEditor(
      explainRef.value,
      props.explain,
      '-- Paste your EXPLAIN ANALYZE output here\n-- Supports: EXPLAIN ANALYZE (tree), FORMAT=JSON, traditional table',
      (val) => {
        emit('update:explain', val)
        detectedFormat.value = detectFormat(val) === 'unknown' ? '' : detectFormat(val)
      },
    )
  }
  if (queryRef.value) {
    queryEditor = createEditor(
      queryRef.value,
      props.query,
      '-- Paste your SQL query here (optional)\n-- Used for query pattern analysis and rewrite hints',
      (val) => emit('update:query', val),
    )
  }
  if (ddlRef.value) {
    ddlEditor = createEditor(
      ddlRef.value,
      props.ddl,
      '-- Paste your CREATE TABLE statements here (optional)\n-- Used for smarter index recommendations',
      (val) => emit('update:ddl', val),
    )
  }
})

watch(() => props.explain, (val) => {
  if (explainEditor && explainEditor.state.doc.toString() !== val) {
    explainEditor.dispatch({ changes: { from: 0, to: explainEditor.state.doc.length, insert: val } })
    detectedFormat.value = detectFormat(val) === 'unknown' ? '' : detectFormat(val)
  }
})
watch(() => props.query, (val) => {
  if (queryEditor && queryEditor.state.doc.toString() !== val) {
    queryEditor.dispatch({ changes: { from: 0, to: queryEditor.state.doc.length, insert: val } })
  }
})
watch(() => props.ddl, (val) => {
  if (ddlEditor && ddlEditor.state.doc.toString() !== val) {
    ddlEditor.dispatch({ changes: { from: 0, to: ddlEditor.state.doc.length, insert: val } })
  }
})

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    emit('analyze')
  }
}
</script>

<template>
  <div class="card ip" @keydown="handleKeydown">
    <!-- Tabs -->
    <div class="ip-tabs">
      <button v-for="tab in (['explain', 'query', 'ddl'] as const)" :key="tab"
        @click="activeTab = tab"
        :class="activeTab === tab ? 'tab-active' : 'tab-inactive'"
        class="ip-tab">
        <span v-if="tab === 'explain'">EXPLAIN Output <span class="ip-req">*</span></span>
        <span v-else-if="tab === 'query'">SQL Query</span>
        <span v-else>Table Schema (DDL)</span>
      </button>
    </div>

    <!-- Editors -->
    <div v-show="activeTab === 'explain'" ref="explainRef" class="ip-editor"></div>
    <div v-show="activeTab === 'query'" ref="queryRef" class="ip-editor"></div>
    <div v-show="activeTab === 'ddl'" ref="ddlRef" class="ip-editor"></div>

    <!-- Footer -->
    <div class="ip-footer">
      <div class="ip-footer-left">
        <span v-if="detectedFormat" class="ip-format-badge">Detected: {{ detectedFormat }}</span>
        <span class="ip-hint">Ctrl+Enter to analyze</span>
      </div>
      <div class="ip-footer-right">
        <button v-if="hasResult" @click="$emit('reset')" class="btn-tool">Clear</button>
        <button @click="$emit('analyze')" class="btn btn-primary btn-sm">Analyze Plan</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ip-tabs { display: flex; background: var(--bg-alt); border-bottom: 1px solid var(--border); }
.ip-tab { padding: 10px 16px; font-size: 0.82rem; font-weight: 600; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px; cursor: pointer; color: var(--text-lt); font-family: inherit; transition: all 0.15s; }
.ip-tab:hover { color: var(--primary); }
.ip-tab.tab-active { color: var(--primary); border-bottom-color: var(--primary); background: #fff; }
.ip-req { color: #c0392b; }
.ip-editor { border-bottom: 1px solid var(--border); }
.ip-footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: var(--bg-alt); }
.ip-footer-left { display: flex; align-items: center; gap: 10px; }
.ip-format-badge { display: inline-flex; padding: 2px 10px; background: #d6eaf8; color: #2471a3; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.ip-hint { font-size: 0.75rem; color: var(--text-lt); }
.ip-footer-right { display: flex; align-items: center; gap: 8px; }
@media (max-width: 640px) {
  .ip-hint { display: none; }
}
</style>
