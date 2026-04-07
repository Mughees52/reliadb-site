<script setup lang="ts">
import type { HistoryEntry } from '../storage/history'
import { timeAgo } from '../utils/formatting'

defineProps<{
  entries: HistoryEntry[]
}>()

const emit = defineEmits<{
  load: [entry: HistoryEntry]
  remove: [id: string]
  clear: []
}>()

function scoreColor(score: number): string {
  if (score >= 80) return 'text-severity-good'
  if (score >= 50) return 'text-severity-warning'
  return 'text-severity-critical'
}
</script>

<template>
  <div class="card ph">
    <div class="ph-header">
      <h3 class="ph-title">Plan History</h3>
      <button v-if="entries.length" @click="$emit('clear')" class="ph-clear">Clear All</button>
    </div>

    <div v-if="entries.length === 0" class="ph-empty">
      No saved plans yet. Plans are auto-saved when you analyze.
    </div>

    <div v-else class="ph-list">
      <div v-for="entry in entries" :key="entry.id" class="ph-item" @click="emit('load', entry)">
        <div class="ph-item-body">
          <div class="ph-item-name">{{ entry.title }}</div>
          <div class="ph-item-meta">
            <span>{{ timeAgo(entry.createdAt) }}</span>
            <span>{{ entry.format }}</span>
            <span v-if="entry.issueCount" class="text-severity-warning">{{ entry.issueCount }} issues</span>
            <span :class="scoreColor(entry.score)">Score: {{ entry.score }}</span>
          </div>
        </div>
        <button @click.stop="emit('remove', entry.id)" class="ph-remove" title="Remove">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 2l8 8M10 2l-8 8"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ph-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--bg-alt); }
.ph-title { font-size: 0.85rem; font-weight: 700; color: var(--primary); margin: 0; }
.ph-clear { font-size: 0.75rem; color: var(--text-lt); cursor: pointer; background: none; border: none; font-family: inherit; }
.ph-clear:hover { color: #c0392b; }
.ph-empty { padding: 24px; text-align: center; color: var(--text-lt); font-size: 0.82rem; }
.ph-list { max-height: 260px; overflow-y: auto; }
.ph-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.15s; gap: 8px; }
.ph-item:hover { background: var(--bg-alt); }
.ph-item:last-child { border-bottom: none; }
.ph-item-body { flex: 1; min-width: 0; }
.ph-item-name { font-size: 0.85rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ph-item-meta { display: flex; gap: 8px; font-size: 0.72rem; color: var(--text-lt); margin-top: 2px; }
.ph-remove { background: none; border: none; cursor: pointer; color: var(--text-lt); padding: 4px; line-height: 0; }
.ph-remove:hover { color: #c0392b; }
</style>
