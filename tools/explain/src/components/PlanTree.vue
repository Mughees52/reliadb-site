<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import * as d3Hierarchy from 'd3-hierarchy'
import * as d3Selection from 'd3-selection'
import * as d3Zoom from 'd3-zoom'
// d3-shape not needed for tree rendering
import type { PlanNode } from '../parsers/types'
import { formatDuration, formatCost, formatNumber } from '../utils/formatting'

const props = defineProps<{
  root: PlanNode
  selectedId?: string
}>()

const emit = defineEmits<{
  select: [node: PlanNode]
}>()

const svgRef = ref<SVGSVGElement>()
const containerRef = ref<HTMLDivElement>()
const highlightMode = ref<'none' | 'duration' | 'rows' | 'cost'>('duration')
const tooltipRef = ref<HTMLDivElement>()
const tooltipContent = ref('')
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)



// HSL gradient: green (good) → yellow → orange → red (bad)
function percentToHsl(pct: number): string {
  const hue = ((100 - Math.min(pct, 100)) * 1.2) // 120 (green) → 0 (red)
  return `hsl(${hue}, 85%, 45%)`
}

function getSeverityColor(node: PlanNode): string {
  if (node.accessType === 'ALL' && !node.table?.startsWith('<')) {
    const rows = node.actualRows ?? node.estimatedRows
    return rows > 100 ? '#E74C3C' : '#E67E22'
  }
  if (node.extra?.some(e => /filesort|temporary/i.test(e))) return '#E67E22'
  if (node.accessType === 'index') return '#F39C12'
  if (node.accessType === 'const' || node.accessType === 'system' || node.accessType === 'eq_ref') return '#2ECC71'
  if (node.accessType === 'ref' || node.accessType === 'range') return '#27AE60'
  return '#3498DB'
}

// Subtle background tint based on severity — makes bottlenecks visible at a glance
function getSeverityFill(node: PlanNode): string {
  if (node.accessType === 'ALL' && !node.table?.startsWith('<')) {
    const rows = node.actualRows ?? node.estimatedRows
    return rows > 100 ? '#fef2f2' : '#fffbeb'
  }
  if (node.extra?.some(e => /filesort|temporary/i.test(e))) return '#fffbeb'
  if (node.accessType === 'index') return '#fffbeb'
  if (node.accessType === 'const' || node.accessType === 'system' || node.accessType === 'eq_ref') return '#f0fff4'
  if (node.accessType === 'ref' || node.accessType === 'range') return '#f0fff4'
  return '#f0f7ff'
}

// Badge checks
function isSlow(node: PlanNode): boolean {
  return (node.timePercentage ?? 0) > 10
}
function isCostly(node: PlanNode): boolean {
  return (node.costPercentage ?? 0) > 40
}
function hasBadEstimate(node: PlanNode): boolean {
  if (!node.rowMismatchRatio) return false
  return node.rowMismatchRatio > 10 || node.rowMismatchRatio < 0.1
}
function hasFilterRemoval(node: PlanNode): boolean {
  return (node.rowsRemovedByFilter ?? 0) > 0
}

function getHighlightValue(node: PlanNode): { value: number; max: number; label: string } | null {
  if (highlightMode.value === 'none') return null
  switch (highlightMode.value) {
    case 'duration': return node.exclusiveTime != null
      ? { value: node.exclusiveTime, max: maxExclusiveTime.value, label: formatDuration(node.exclusiveTime) }
      : null
    case 'rows': return { value: node.actualRows ?? node.estimatedRows, max: maxRows.value, label: formatNumber(node.actualRows ?? node.estimatedRows) + ' rows' }
    case 'cost': return { value: node.estimatedCost, max: maxCost.value, label: formatCost(node.estimatedCost) + ' cost' }
  }
}

function estimationLabel(node: PlanNode): string {
  if (node.actualRows == null || node.estimatedRows <= 0) return ''
  const ratio = node.rowMismatchRatio ?? 1
  if (ratio >= 0.8 && ratio <= 1.2) return ''
  if (ratio > 1) return `\u2191${ratio.toFixed(1)}x`
  return `\u2193${(1/ratio).toFixed(1)}x`
}

const maxRows = ref(1)
const maxCost = ref(1)
const maxExclusiveTime = ref(0.001)

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '\u2026' : s
}

function showTooltip(node: PlanNode, event: MouseEvent) {
  const lines: string[] = [
    `<b>${node.operation}</b>`,
  ]
  if (node.table) lines.push(`Table: ${node.table}`)
  if (node.accessType) lines.push(`Access: ${node.accessType}`)
  if (node.index) lines.push(`Index: ${node.index}`)
  lines.push(`Cost: ${formatCost(node.estimatedCost)}${node.costPercentage ? ` (${node.costPercentage.toFixed(0)}%)` : ''}`)

  const est = node.estimatedRows
  const act = node.actualRows
  if (act != null) {
    lines.push(`Rows: ${formatNumber(act)} actual / ${formatNumber(est)} est`)
    if (node.rowMismatchRatio && (node.rowMismatchRatio > 2 || node.rowMismatchRatio < 0.5)) {
      lines.push(`Estimation: ${node.rowMismatchRatio > 1 ? node.rowMismatchRatio.toFixed(1) + 'x under' : (1/node.rowMismatchRatio).toFixed(1) + 'x over'}-estimated`)
    }
  } else {
    lines.push(`Rows (est): ${formatNumber(est)}`)
  }

  if (node.actualTimeLast != null) {
    lines.push(`Time: ${formatDuration(node.actualTimeFirst ?? 0)}..${formatDuration(node.actualTimeLast)}${node.loops && node.loops > 1 ? ` x${node.loops} loops` : ''}`)
  }
  if (node.exclusiveTime != null && node.exclusiveTime > 0) {
    lines.push(`Exclusive: ${formatDuration(node.exclusiveTime)}${node.timePercentage ? ` (${node.timePercentage.toFixed(0)}% of total)` : ''}`)
  }
  if (node.rowsRemovedByFilter) {
    lines.push(`Rows removed by filter: ~${formatNumber(node.rowsRemovedByFilter)}`)
  }
  if (node.extra?.length) {
    lines.push(`Extra: ${node.extra.join(', ')}`)
  }

  tooltipContent.value = lines.join('<br>')
  tooltipX.value = event.clientX + 12
  tooltipY.value = event.clientY - 10
  tooltipVisible.value = true
}

function hideTooltip() {
  tooltipVisible.value = false
}

function renderTree() {
  if (!svgRef.value || !containerRef.value) return

  const svg = d3Selection.select(svgRef.value)
  svg.selectAll('*').remove()

  const container = containerRef.value
  const width = container.clientWidth
  const NODE_W = 250
  const NODE_H = 100
  const H_GAP = 40
  const V_GAP = 36

  // Compute max values for highlighting
  let mRows = 1, mCost = 1, mTime = 0.001
  function walkMax(n: PlanNode) {
    mRows = Math.max(mRows, n.actualRows ?? n.estimatedRows)
    mCost = Math.max(mCost, n.estimatedCost)
    if (n.exclusiveTime != null) mTime = Math.max(mTime, n.exclusiveTime)
    for (const c of n.children) walkMax(c)
  }
  walkMax(props.root)
  maxRows.value = mRows
  maxCost.value = mCost
  maxExclusiveTime.value = mTime

  const hierarchy = d3Hierarchy.hierarchy(props.root, d => d.children)
  const treeLayout = d3Hierarchy.tree<PlanNode>().nodeSize([NODE_W + H_GAP, NODE_H + V_GAP])
  const treeData = treeLayout(hierarchy)
  const nodes = treeData.descendants()
  const links = treeData.links()

  let minX = Infinity, maxX2 = -Infinity, minY = Infinity, maxY2 = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.x - NODE_W / 2)
    maxX2 = Math.max(maxX2, n.x + NODE_W / 2)
    minY = Math.min(minY, n.y - NODE_H / 2)
    maxY2 = Math.max(maxY2, n.y + NODE_H / 2)
  }

  const treeWidth = maxX2 - minX + 60
  const treeHeight = maxY2 - minY + 60
  const height = Math.max(520, treeHeight)

  svg.attr('width', width).attr('height', height)

  // Defs for drop shadow
  const defs = svg.append('defs')
  const filter = defs.append('filter').attr('id', 'node-shadow').attr('x', '-10%').attr('y', '-10%').attr('width', '130%').attr('height', '130%')
  filter.append('feDropShadow').attr('dx', '0').attr('dy', '2').attr('stdDeviation', '3').attr('flood-color', 'rgba(0,0,0,0.08)')

  const g = svg.append('g')

  const zoom = d3Zoom.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.25, 2.5])
    .on('zoom', (event) => { g.attr('transform', event.transform) })
  svg.call(zoom)

  const initialScale = Math.min(1, (width - 40) / treeWidth, (height - 40) / treeHeight)
  const tx = (width - treeWidth * initialScale) / 2 - minX * initialScale + 30
  const ty = 30 - minY * initialScale
  svg.call(zoom.transform, d3Zoom.zoomIdentity.translate(tx, ty).scale(initialScale))

  // Links — thickness proportional to row count
  const maxLinkRows = Math.max(...links.map(l => (l.target.data as PlanNode).actualRows ?? (l.target.data as PlanNode).estimatedRows ?? 1), 1)
  const strokeScale = (rows: number) => Math.max(1.5, Math.min(12, (rows / maxLinkRows) * 12))

  g.selectAll('.link')
    .data(links)
    .join('path')
    .attr('fill', 'none')
    .attr('stroke', '#b0bec5')
    .attr('stroke-width', (d: any) => {
      const rows = d.target.data.actualRows ?? d.target.data.estimatedRows ?? 1
      return strokeScale(rows)
    })
    .attr('stroke-opacity', 0.5)
    .attr('d', (d: any) => {
      const sx = d.source.x, sy = d.source.y + NODE_H / 2
      const tx2 = d.target.x, ty2 = d.target.y - NODE_H / 2
      const my = (sy + ty2) / 2
      return `M${sx},${sy} C${sx},${my} ${tx2},${my} ${tx2},${ty2}`
    })

  // Nodes
  const nodeGroups = g.selectAll('.node')
    .data(nodes)
    .join('g')
    .attr('class', 'node-group')
    .attr('transform', (d: any) => `translate(${d.x - NODE_W / 2},${d.y - NODE_H / 2})`)
    .style('cursor', 'pointer')
    .on('click', (_event: any, d: any) => { emit('select', d.data) })
    .on('mouseover', (event: any, d: any) => { showTooltip(d.data, event) })
    .on('mousemove', (event: any, d: any) => { tooltipX.value = event.clientX + 12; tooltipY.value = event.clientY - 10 })
    .on('mouseout', () => { hideTooltip() })

  // Card background with severity tint
  nodeGroups.append('rect')
    .attr('width', NODE_W).attr('height', NODE_H)
    .attr('rx', 10).attr('ry', 10)
    .attr('fill', (d: any) => getSeverityFill(d.data))
    .attr('filter', 'url(#node-shadow)')
    .attr('stroke', (d: any) => {
      if (d.data.id === props.selectedId) return '#2980B9'
      return getSeverityColor(d.data)
    })
    .attr('stroke-width', (d: any) => d.data.id === props.selectedId ? 2.5 : 1.5)

  // Top color bar (severity indicator)
  nodeGroups.append('rect')
    .attr('width', NODE_W).attr('height', 4)
    .attr('rx', 10).attr('ry', 10)
    .attr('fill', (d: any) => getSeverityColor(d.data))

  // Top-right corner overlap fix
  nodeGroups.append('rect')
    .attr('y', 4).attr('width', NODE_W).attr('height', 2)
    .attr('fill', (d: any) => getSeverityFill(d.data))

  // Operation name (line 1)
  nodeGroups.append('text')
    .attr('x', 10).attr('y', 22)
    .style('font-size', '11.5px').style('font-weight', '700').style('font-family', 'Inter, sans-serif')
    .attr('fill', '#1A5276')
    .text((d: any) => truncate(d.data.operation, 32))

  // Table + Index (line 2)
  nodeGroups.append('text')
    .attr('x', 10).attr('y', 37)
    .style('font-size', '10px').style('font-family', "'JetBrains Mono', monospace")
    .attr('fill', '#777')
    .text((d: any) => {
      const n = d.data as PlanNode
      const parts: string[] = []
      if (n.table && !n.table.startsWith('<')) parts.push(n.table)
      if (n.index) parts.push(`idx:${n.index}`)
      return parts.join(' | ')
    })

  // Metrics line 3: cost | rows (est→act) | estimation factor
  nodeGroups.append('text')
    .attr('x', 10).attr('y', 52)
    .style('font-size', '10px').style('font-family', "'JetBrains Mono', monospace")
    .attr('fill', '#555')
    .text((d: any) => {
      const n = d.data as PlanNode
      const parts: string[] = []
      if (n.estimatedCost) parts.push(`cost:${formatCost(n.estimatedCost)}`)
      const rows = n.actualRows ?? n.estimatedRows
      if (rows != null) {
        let rowStr = `rows:${formatNumber(rows)}`
        if (n.actualRows != null && n.estimatedRows > 0) {
          const est = estimationLabel(n)
          if (est) rowStr += ` (${est})`
        }
        parts.push(rowStr)
      }
      return parts.join(' | ')
    })

  // Time line 4
  nodeGroups.append('text')
    .attr('x', 10).attr('y', 65)
    .style('font-size', '10px').style('font-family', "'JetBrains Mono', monospace")
    .attr('fill', '#777')
    .text((d: any) => {
      const n = d.data as PlanNode
      if (n.actualTimeLast == null) return ''
      let t = `time:${formatDuration(n.actualTimeLast)}`
      if (n.loops && n.loops > 1) t += ` x${n.loops}`
      if (n.exclusiveTime != null && n.exclusiveTime > 0.001) t += ` (self:${formatDuration(n.exclusiveTime)})`
      return t
    })

  // Badge icons (right side)
  nodeGroups.each(function(d: any) {
    const n = d.data as PlanNode
    const group = d3Selection.select(this as SVGGElement)
    let bx = NODE_W - 12
    const by = 18

    // Slow badge
    if (isSlow(n)) {
      group.append('circle').attr('cx', bx).attr('cy', by).attr('r', 6).attr('fill', '#E74C3C')
      group.append('text').attr('x', bx).attr('y', by + 3.5).attr('text-anchor', 'middle')
        .style('font-size', '8px').style('font-weight', '800').attr('fill', '#fff').text('S')
      bx -= 16
    }
    // Costly badge
    if (isCostly(n)) {
      group.append('circle').attr('cx', bx).attr('cy', by).attr('r', 6).attr('fill', '#E67E22')
      group.append('text').attr('x', bx).attr('y', by + 3.5).attr('text-anchor', 'middle')
        .style('font-size', '8px').style('font-weight', '800').attr('fill', '#fff').text('$')
      bx -= 16
    }
    // Bad estimation badge
    if (hasBadEstimate(n)) {
      group.append('circle').attr('cx', bx).attr('cy', by).attr('r', 6).attr('fill', '#8E44AD')
      group.append('text').attr('x', bx).attr('y', by + 3.5).attr('text-anchor', 'middle')
        .style('font-size', '8px').style('font-weight', '800').attr('fill', '#fff').text('E')
      bx -= 16
    }
    // Filter badge
    if (hasFilterRemoval(n)) {
      group.append('circle').attr('cx', bx).attr('cy', by).attr('r', 6).attr('fill', '#3498DB')
      group.append('text').attr('x', bx).attr('y', by + 3.5).attr('text-anchor', 'middle')
        .style('font-size', '8px').style('font-weight', '800').attr('fill', '#fff').text('F')
    }
  })

  // Highlight bar (bottom of card)
  const barY = NODE_H - 16
  const barW = NODE_W - 20
  const barH = 6

  // Bar background
  nodeGroups.append('rect')
    .attr('x', 10).attr('y', barY)
    .attr('width', barW).attr('height', barH).attr('rx', 3)
    .attr('fill', '#eee')

  // Bar fill (HSL gradient based on highlight mode)
  nodeGroups.append('rect')
    .attr('x', 10).attr('y', barY)
    .attr('height', barH).attr('rx', 3)
    .attr('width', (d: any) => {
      const hv = getHighlightValue(d.data)
      if (!hv || hv.max === 0) return 0
      return Math.max(2, (hv.value / hv.max) * barW)
    })
    .attr('fill', (d: any) => {
      const hv = getHighlightValue(d.data)
      if (!hv || hv.max === 0) return '#ccc'
      return percentToHsl((hv.value / hv.max) * 100)
    })

  // Highlight value label
  nodeGroups.append('text')
    .attr('x', NODE_W - 10).attr('y', NODE_H - 3)
    .attr('text-anchor', 'end')
    .style('font-size', '8.5px').style('font-family', "'JetBrains Mono', monospace")
    .attr('fill', '#999')
    .text((d: any) => {
      const hv = getHighlightValue(d.data)
      return hv ? hv.label : ''
    })
}

onMounted(() => renderTree())
watch(() => props.root, () => nextTick(renderTree))
watch(() => props.selectedId, () => nextTick(renderTree))
watch(highlightMode, () => nextTick(renderTree))
</script>

<template>
  <div ref="containerRef" class="plan-tree-container">
    <!-- Highlight Mode Switcher -->
    <div class="highlight-switcher">
      <span class="highlight-label">Highlight:</span>
      <button v-for="mode in (['none', 'duration', 'rows', 'cost'] as const)" :key="mode"
        @click="highlightMode = mode"
        :class="['highlight-btn', highlightMode === mode ? 'highlight-active' : '']">
        {{ mode }}
      </button>

      <!-- Badge Legend -->
      <span class="badge-legend">
        <span class="badge-item"><span class="badge-dot" style="background:#E74C3C"></span>Slow</span>
        <span class="badge-item"><span class="badge-dot" style="background:#E67E22"></span>Costly</span>
        <span class="badge-item"><span class="badge-dot" style="background:#8E44AD"></span>Bad Est.</span>
        <span class="badge-item"><span class="badge-dot" style="background:#3498DB"></span>Filter</span>
      </span>
    </div>

    <svg ref="svgRef" class="plan-tree-svg" />

    <!-- Tooltip -->
    <div ref="tooltipRef"
      v-show="tooltipVisible"
      class="plan-tooltip"
      :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
      v-html="tooltipContent" />
  </div>
</template>

<style scoped>
.plan-tree-container {
  position: relative;
  min-height: 520px;
  max-height: 80vh;
  overflow: hidden;
  background: #fff;
}
.plan-tree-svg {
  width: 100%;
  cursor: grab;
}
.plan-tree-svg:active {
  cursor: grabbing;
}

.highlight-switcher {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255,255,255,0.92);
  border: 1px solid var(--border, #DDE3E9);
  border-radius: 6px;
  padding: 4px 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.highlight-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-lt, #777);
  margin-right: 2px;
}
.highlight-btn {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: var(--text, #444);
  cursor: pointer;
  font-family: inherit;
  text-transform: capitalize;
  transition: all 0.15s;
}
.highlight-btn:hover { border-color: var(--accent, #2980B9); color: var(--accent); }
.highlight-active { background: var(--primary, #1A5276); color: #fff; border-color: var(--primary); }
.highlight-active:hover { background: var(--accent, #2980B9); color: #fff; }

.badge-legend {
  display: flex;
  gap: 8px;
  margin-left: 10px;
  padding-left: 10px;
  border-left: 1px solid #ddd;
}
.badge-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.65rem;
  color: var(--text-lt, #777);
  font-weight: 500;
}
.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.plan-tooltip {
  position: fixed;
  z-index: 100;
  background: rgba(26, 42, 58, 0.95);
  color: #f0f0f0;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.78rem;
  line-height: 1.6;
  max-width: 360px;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  font-family: 'JetBrains Mono', monospace;
}
.plan-tooltip :deep(b) {
  color: #fff;
  font-family: 'Inter', sans-serif;
}

@media (max-width: 768px) {
  .badge-legend { display: none; }
  .highlight-switcher { flex-wrap: wrap; }
}
</style>
