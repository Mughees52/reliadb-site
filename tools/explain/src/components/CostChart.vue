<script setup lang="ts">
import { computed } from 'vue'
import type { PlanNode } from '../parsers/types'
import { formatCost, formatPercentage } from '../utils/formatting'

const props = defineProps<{
  root: PlanNode
}>()

interface ChartItem {
  label: string
  table?: string
  cost: number
  percentage: number
  color: string
}

const items = computed<ChartItem[]>(() => {
  const nodes: ChartItem[] = []
  collectLeafCosts(props.root, nodes)
  nodes.sort((a, b) => b.cost - a.cost)
  return nodes.slice(0, 12) // Top 12
})

function collectLeafCosts(node: PlanNode, result: ChartItem[]) {
  // Collect nodes with cost that are leaves or have direct table access
  if (node.table && !node.table.startsWith('<') && node.estimatedCost > 0) {
    result.push({
      label: truncate(node.operation, 40),
      table: node.table,
      cost: node.estimatedCost,
      percentage: node.costPercentage ?? 0,
      color: getColor(node),
    })
  }
  for (const child of node.children) {
    collectLeafCosts(child, result)
  }
}

function getColor(node: PlanNode): string {
  if (node.accessType === 'ALL') return '#E74C3C'
  if (node.accessType === 'index') return '#F39C12'
  if (node.extra?.some(e => /filesort|temporary/i.test(e))) return '#E67E22'
  if (node.accessType === 'const' || node.accessType === 'eq_ref' || node.accessType === 'system') return '#2ECC71'
  if (node.accessType === 'ref' || node.accessType === 'range') return '#27AE60'
  return '#3498DB'
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '...' : s
}

const maxCost = computed(() => Math.max(...items.value.map(i => i.cost), 1))
</script>

<template>
  <div class="card cc">
    <div class="cc-header">
      <h3 class="cc-title">Cost Breakdown</h3>
    </div>
    <div class="cc-body">
      <div v-if="items.length === 0" class="cc-empty">No cost data available.</div>
      <div v-for="(item, i) in items" :key="i" class="cc-row">
        <div class="cc-label">
          <span class="cc-dot" :style="{ background: item.color }"></span>
          <span class="cc-name" :title="item.label">{{ item.table ?? item.label }}</span>
          <span class="cc-pct">{{ formatPercentage(item.percentage) }}</span>
        </div>
        <div class="cc-bar-wrap">
          <div class="cc-bar" :style="{ width: `${(item.cost / maxCost) * 100}%`, background: item.color }"></div>
        </div>
        <div class="cc-cost">{{ formatCost(item.cost) }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cc-header { padding: 12px 16px; border-bottom: 1px solid var(--border); }
.cc-title { font-size: 0.85rem; font-weight: 700; color: var(--primary); margin: 0; }
.cc-body { padding: 12px 16px; }
.cc-empty { text-align: center; color: var(--text-lt); font-size: 0.82rem; padding: 16px; }
.cc-row { display: grid; grid-template-columns: 140px 1fr 50px; gap: 8px; align-items: center; padding: 4px 0; }
.cc-label { display: flex; align-items: center; gap: 6px; min-width: 0; }
.cc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.cc-name { font-size: 0.78rem; color: var(--text); font-family: 'JetBrains Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cc-pct { font-size: 0.68rem; color: var(--text-lt); flex-shrink: 0; }
.cc-bar-wrap { height: 12px; background: var(--bg-alt); border-radius: 6px; overflow: hidden; }
.cc-bar { height: 100%; border-radius: 6px; min-width: 2px; transition: width 0.3s; }
.cc-cost { font-size: 0.72rem; font-family: 'JetBrains Mono', monospace; color: var(--text-lt); text-align: right; }
</style>
