<script setup lang="ts">
import { computed } from 'vue'
import type { PlanNode } from '../parsers/types'
import { formatNumber } from '../utils/formatting'

const props = defineProps<{
  root: PlanNode
}>()

interface RowItem {
  label: string
  table?: string
  estimated: number
  actual: number
  ratio: number
  severity: 'good' | 'warning' | 'critical'
}

const items = computed<RowItem[]>(() => {
  const result: RowItem[] = []
  collectMismatches(props.root, result)
  result.sort((a, b) => Math.abs(Math.log(b.ratio)) - Math.abs(Math.log(a.ratio)))
  return result
})

function collectMismatches(node: PlanNode, result: RowItem[]) {
  if (node.actualRows != null && node.estimatedRows > 0 && !node.table?.startsWith('<')) {
    const ratio = node.actualRows / node.estimatedRows
    result.push({
      label: node.operation.slice(0, 50),
      table: node.table,
      estimated: node.estimatedRows,
      actual: node.actualRows,
      ratio,
      severity: (ratio > 10 || ratio < 0.1) ? 'critical' : (ratio > 3 || ratio < 0.33) ? 'warning' : 'good',
    })
  }
  for (const child of node.children) {
    collectMismatches(child, result)
  }
}

function ratioLabel(ratio: number): string {
  if (ratio >= 0.9 && ratio <= 1.1) return 'accurate'
  if (ratio > 1) return `${ratio.toFixed(1)}x more`
  return `${(1 / ratio).toFixed(1)}x fewer`
}

function barWidth(val: number, max: number): string {
  return `${Math.max(2, (val / max) * 100)}%`
}

const maxVal = computed(() => Math.max(...items.value.flatMap(i => [i.estimated, i.actual]), 1))

const hasData = computed(() => items.value.length > 0)
</script>

<template>
  <div class="card eva">
    <div class="eva-header">
      <h3 class="eva-title">Estimated vs Actual Rows</h3>
    </div>
    <div class="eva-body">
      <div v-if="!hasData" class="eva-empty">No EXPLAIN ANALYZE data — only available with actual execution metrics.</div>
      <template v-else>
        <div class="eva-legend">
          <span class="eva-legend-item"><span class="eva-legend-bar est"></span>Estimated</span>
          <span class="eva-legend-item"><span class="eva-legend-bar act"></span>Actual</span>
        </div>
        <div v-for="(item, i) in items" :key="i" class="eva-row">
          <div class="eva-label">
            <span class="eva-name">{{ item.table ?? item.label }}</span>
            <span class="eva-ratio" :class="'eva-' + item.severity">{{ ratioLabel(item.ratio) }}</span>
          </div>
          <div class="eva-bars">
            <div class="eva-bar-group">
              <div class="eva-bar est" :style="{ width: barWidth(item.estimated, maxVal) }">
                <span class="eva-bar-val">{{ formatNumber(item.estimated) }}</span>
              </div>
            </div>
            <div class="eva-bar-group">
              <div class="eva-bar act" :class="'eva-bar-' + item.severity" :style="{ width: barWidth(item.actual, maxVal) }">
                <span class="eva-bar-val">{{ formatNumber(item.actual) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.eva-header { padding: 12px 16px; border-bottom: 1px solid var(--border); }
.eva-title { font-size: 0.85rem; font-weight: 700; color: var(--primary); margin: 0; }
.eva-body { padding: 12px 16px; }
.eva-empty { text-align: center; color: var(--text-lt); font-size: 0.82rem; padding: 16px; }
.eva-legend { display: flex; gap: 16px; margin-bottom: 12px; }
.eva-legend-item { display: flex; align-items: center; gap: 4px; font-size: 0.72rem; color: var(--text-lt); }
.eva-legend-bar { width: 16px; height: 8px; border-radius: 4px; }
.eva-legend-bar.est { background: #85C1E9; }
.eva-legend-bar.act { background: #1A5276; }
.eva-row { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.eva-row:last-child { border-bottom: none; }
.eva-label { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.eva-name { font-size: 0.78rem; font-family: 'JetBrains Mono', monospace; color: var(--text); }
.eva-ratio { font-size: 0.72rem; font-weight: 600; }
.eva-good { color: #27AE60; }
.eva-warning { color: #E67E22; }
.eva-critical { color: #E74C3C; }
.eva-bars { display: flex; flex-direction: column; gap: 2px; }
.eva-bar-group { height: 14px; background: var(--bg-alt); border-radius: 4px; overflow: hidden; }
.eva-bar { height: 100%; border-radius: 4px; min-width: 2px; display: flex; align-items: center; justify-content: flex-end; padding-right: 4px; transition: width 0.3s; }
.eva-bar.est { background: #85C1E9; }
.eva-bar.act { background: #1A5276; }
.eva-bar-warning { background: #E67E22 !important; }
.eva-bar-critical { background: #E74C3C !important; }
.eva-bar-val { font-size: 0.62rem; font-weight: 600; color: #fff; white-space: nowrap; }
</style>
