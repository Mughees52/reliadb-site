<script setup lang="ts">
import type { PlanNode } from '../parsers/types'
import { formatDuration, formatCost, formatNumber, formatPercentage } from '../utils/formatting'

const props = defineProps<{
  root: PlanNode
  selectedId?: string
}>()

const emit = defineEmits<{
  select: [node: PlanNode]
}>()

function flattenNodes(node: PlanNode): PlanNode[] {
  const result: PlanNode[] = [node]
  for (const child of node.children) {
    result.push(...flattenNodes(child))
  }
  return result
}

function accessTypeClass(type?: string): string {
  if (!type) return ''
  switch (type) {
    case 'ALL': return 'text-severity-critical'
    case 'index': return 'text-severity-warning'
    case 'range':
    case 'ref': return 'text-severity-good'
    case 'eq_ref':
    case 'const':
    case 'system': return 'text-severity-optimal'
    default: return ''
  }
}

function dotClass(node: PlanNode): string {
  if (node.accessType === 'ALL' && (node.actualRows ?? node.estimatedRows) > 100) return 'bg-severity-critical'
  if (node.accessType === 'index' || node.extra?.some((e: string) => /filesort|temporary/i.test(e))) return 'bg-severity-warning'
  if (node.accessType === 'ref' || node.accessType === 'range') return 'bg-severity-good'
  if (node.accessType === 'const' || node.accessType === 'eq_ref' || node.accessType === 'system') return 'bg-severity-optimal'
  return 'dot-neutral'
}
</script>

<template>
  <div class="pt-wrap">
    <table class="pt-table">
      <thead>
        <tr>
          <th>Operation</th>
          <th>Table</th>
          <th>Access</th>
          <th class="text-right">Est. Rows</th>
          <th class="text-right">Act. Rows</th>
          <th class="text-right">Cost</th>
          <th class="text-right">Time</th>
          <th class="text-right">Cost %</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="node in flattenNodes(root)" :key="node.id"
          @click="emit('select', node)"
          :class="{ 'pt-selected': node.id === selectedId }">
          <td>
            <div class="pt-op" :style="{ paddingLeft: `${node.depth * 16}px` }">
              <span class="pt-dot" :class="dotClass(node)"></span>
              <span class="pt-op-text" :title="node.operation">{{ node.operation }}</span>
            </div>
          </td>
          <td class="mono">{{ node.table ?? '-' }}</td>
          <td class="mono" :class="accessTypeClass(node.accessType)">{{ node.accessType ?? '-' }}</td>
          <td class="text-right mono">{{ formatNumber(node.estimatedRows) }}</td>
          <td class="text-right mono" :class="node.rowMismatchRatio && (node.rowMismatchRatio > 10 || node.rowMismatchRatio < 0.1) ? 'text-severity-warning' : ''">
            {{ node.actualRows != null ? formatNumber(node.actualRows) : '-' }}
          </td>
          <td class="text-right mono">{{ formatCost(node.estimatedCost) }}</td>
          <td class="text-right mono">{{ node.actualTimeLast != null ? formatDuration(node.actualTimeLast) : '-' }}</td>
          <td class="text-right mono">{{ node.costPercentage != null ? formatPercentage(node.costPercentage) : '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.pt-wrap { overflow-x: auto; }
.pt-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.pt-table th { text-align: left; padding: 8px 10px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-lt); background: var(--bg-alt); border-bottom: 1px solid var(--border); }
.pt-table td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; color: var(--text); }
.pt-table tr { cursor: pointer; transition: background 0.12s; }
.pt-table tbody tr:hover { background: var(--bg-alt); }
.pt-selected { background: #ebf5fb !important; }
.pt-op { display: flex; align-items: center; gap: 6px; }
.pt-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.dot-neutral { background: #bbb; }
.pt-op-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
.mono { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }
.text-right { text-align: right; }
</style>
