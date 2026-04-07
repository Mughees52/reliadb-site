<script setup lang="ts">
import type { PlanNode } from '../parsers/types'
import { formatDuration, formatCost, formatNumber, formatPercentage } from '../utils/formatting'

const props = defineProps<{
  node: PlanNode
  totalCost: number
}>()

function mismatchLabel(ratio?: number): string {
  if (ratio == null) return ''
  if (ratio > 10) return `${ratio.toFixed(1)}x more than estimated`
  if (ratio < 0.1) return `${(1/ratio).toFixed(1)}x fewer than estimated`
  if (ratio > 2) return `${ratio.toFixed(1)}x more`
  if (ratio < 0.5) return `${(1/ratio).toFixed(1)}x fewer`
  return 'close to estimate'
}

function mismatchClass(ratio?: number): string {
  if (ratio == null) return ''
  if (ratio > 10 || ratio < 0.1) return 'text-severity-warning'
  return ''
}

function accessClass(type?: string): string {
  if (!type) return ''
  if (type === 'ALL') return 'text-severity-critical'
  if (type === 'index') return 'text-severity-warning'
  if (['ref', 'range'].includes(type)) return 'text-severity-good'
  if (['const', 'eq_ref', 'system'].includes(type)) return 'text-severity-optimal'
  return ''
}

function extraClass(e: string): string {
  if (/filesort|temporary|Full table scan/i.test(e)) return 'extra-bad'
  if (/^Using index$/i.test(e.trim())) return 'extra-good'
  return 'extra-neutral'
}
</script>

<template>
  <div class="card node-detail">
    <div class="nd-header">
      <div>
        <h3 class="nd-title">Node Details</h3>
        <p class="nd-op">{{ node.operation }}</p>
      </div>
      <span v-if="node.isBottleneck" class="badge-critical">Bottleneck</span>
    </div>

    <div class="nd-grid">
      <div v-if="node.table"><span class="nd-label">Table</span><span class="nd-val mono">{{ node.table }}</span></div>
      <div v-if="node.accessType"><span class="nd-label">Access Type</span><span class="nd-val mono" :class="accessClass(node.accessType)">{{ node.accessType }}</span></div>
      <div v-if="node.index"><span class="nd-label">Index</span><span class="nd-val mono">{{ node.index }}</span></div>
      <div><span class="nd-label">Estimated Rows</span><span class="nd-val">{{ formatNumber(node.estimatedRows) }}</span></div>
      <div v-if="node.actualRows != null">
        <span class="nd-label">Actual Rows</span>
        <span class="nd-val">
          {{ formatNumber(node.actualRows) }}
          <small v-if="node.rowMismatchRatio" :class="mismatchClass(node.rowMismatchRatio)">({{ mismatchLabel(node.rowMismatchRatio) }})</small>
        </span>
      </div>
      <div>
        <span class="nd-label">Cost</span>
        <span class="nd-val">
          {{ formatCost(node.estimatedCost) }}
          <small v-if="node.costPercentage != null" style="color: var(--text-lt)">({{ formatPercentage(node.costPercentage) }})</small>
        </span>
      </div>
      <div v-if="node.actualTimeFirst != null"><span class="nd-label">Time (first..last)</span><span class="nd-val">{{ formatDuration(node.actualTimeFirst) }}..{{ formatDuration(node.actualTimeLast!) }}</span></div>
      <div v-if="node.loops != null && node.loops > 1"><span class="nd-label">Loops</span><span class="nd-val">{{ formatNumber(node.loops) }}</span></div>
      <div v-if="node.totalActualTime != null"><span class="nd-label">Total Time</span><span class="nd-val">{{ formatDuration(node.totalActualTime) }}</span></div>
      <div v-if="node.filtered != null"><span class="nd-label">Filtered</span><span class="nd-val">{{ node.filtered }}%</span></div>
      <div v-if="node.keyLength"><span class="nd-label">Key Length</span><span class="nd-val">{{ node.keyLength }} bytes</span></div>
    </div>

    <div v-if="node.condition" class="nd-section">
      <span class="nd-label">Condition</span>
      <code class="nd-code">{{ node.condition }}</code>
    </div>

    <div v-if="node.possibleKeys?.length" class="nd-section">
      <span class="nd-label">Possible Keys</span>
      <div class="nd-tags">
        <span v-for="k in node.possibleKeys" :key="k" class="nd-tag">{{ k }}</span>
      </div>
    </div>

    <div v-if="node.extra?.length" class="nd-section">
      <span class="nd-label">Extra</span>
      <div class="nd-tags">
        <span v-for="e in node.extra" :key="e" class="nd-tag" :class="extraClass(e)">{{ e }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.node-detail { padding: 16px; }
.nd-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.nd-title { font-size: 0.85rem; font-weight: 700; color: var(--primary); margin: 0; }
.nd-op { font-size: 0.78rem; color: var(--text-lt); margin-top: 2px; }
.nd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.nd-grid > div { display: flex; flex-direction: column; gap: 1px; }
.nd-label { font-size: 0.72rem; color: var(--text-lt); text-transform: uppercase; font-weight: 600; letter-spacing: 0.03em; }
.nd-val { font-size: 0.85rem; font-weight: 600; color: var(--text); }
.nd-val small { font-size: 0.75rem; margin-left: 4px; }
.mono { font-family: 'JetBrains Mono', monospace; }
.nd-section { margin-top: 12px; }
.nd-code { display: block; font-size: 0.78rem; background: var(--bg-alt); padding: 8px 10px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; color: var(--text); word-break: break-all; margin-top: 4px; }
.nd-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.nd-tag { padding: 2px 8px; font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; border-radius: 4px; background: var(--bg-alt); color: var(--text); }
.nd-tag.extra-bad { background: #fadbd8; color: #c0392b; font-weight: 600; }
.nd-tag.extra-good { background: #d5f5e3; color: #1e8449; font-weight: 600; }
.nd-tag.extra-neutral { background: var(--bg-alt); color: var(--text); }
</style>
