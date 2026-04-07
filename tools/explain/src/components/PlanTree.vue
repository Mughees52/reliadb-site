<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import * as d3Hierarchy from 'd3-hierarchy'
import * as d3Selection from 'd3-selection'
import * as d3Zoom from 'd3-zoom'
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

function getNodeColor(node: PlanNode): string {
  if (node.accessType === 'ALL') {
    const rows = node.actualRows ?? node.estimatedRows
    return rows > 100 ? '#E74C3C' : '#E67E22'
  }
  if (node.extra?.some(e => /filesort|temporary/i.test(e))) return '#E67E22'
  if (node.accessType === 'index') return '#F39C12'
  if (node.accessType === 'const' || node.accessType === 'system' || node.accessType === 'eq_ref') return '#2ECC71'
  if (node.accessType === 'ref' || node.accessType === 'range') return '#27AE60'
  return '#3498DB'
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str
}

function renderTree() {
  if (!svgRef.value || !containerRef.value) return

  const svg = d3Selection.select(svgRef.value)
  svg.selectAll('*').remove()

  const container = containerRef.value
  const width = container.clientWidth
  const NODE_W = 220
  const NODE_H = 80
  const H_GAP = 40
  const V_GAP = 30

  const hierarchy = d3Hierarchy.hierarchy(props.root, d => d.children)
  const treeLayout = d3Hierarchy.tree<PlanNode>().nodeSize([NODE_W + H_GAP, NODE_H + V_GAP])
  const treeData = treeLayout(hierarchy)
  const nodes = treeData.descendants()
  const links = treeData.links()

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.x - NODE_W / 2)
    maxX = Math.max(maxX, n.x + NODE_W / 2)
    minY = Math.min(minY, n.y - NODE_H / 2)
    maxY = Math.max(maxY, n.y + NODE_H / 2)
  }

  const treeWidth = maxX - minX + 60
  const treeHeight = maxY - minY + 60
  const height = Math.max(400, treeHeight)

  svg.attr('width', width).attr('height', height)

  const g = svg.append('g')

  const zoom = d3Zoom.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.3, 2])
    .on('zoom', (event) => { g.attr('transform', event.transform) })

  svg.call(zoom)

  const initialScale = Math.min(1, (width - 40) / treeWidth, (height - 40) / treeHeight)
  const tx = (width - treeWidth * initialScale) / 2 - minX * initialScale + 30
  const ty = 30 - minY * initialScale
  svg.call(zoom.transform, d3Zoom.zoomIdentity.translate(tx, ty).scale(initialScale))

  // Links
  g.selectAll('.link')
    .data(links)
    .join('path')
    .attr('class', 'link-path')
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
    .on('click', (_event: any, d: any) => { emit('select', d.data) })

  // Node rect
  nodeGroups.append('rect')
    .attr('class', 'node-rect')
    .attr('width', NODE_W)
    .attr('height', NODE_H)
    .attr('rx', 8)
    .attr('ry', 8)
    .attr('fill', '#ffffff')
    .attr('stroke', (d: any) => getNodeColor(d.data))
    .attr('stroke-width', (d: any) => {
      if (d.data.id === props.selectedId) return 3
      if (d.data.isBottleneck) return 2.5
      return 1.5
    })
    .attr('stroke-dasharray', (d: any) => d.data.id === props.selectedId ? '4,2' : 'none')

  // Severity dot
  nodeGroups.append('circle')
    .attr('cx', 14).attr('cy', 16).attr('r', 5)
    .attr('fill', (d: any) => getNodeColor(d.data))

  // Operation name
  nodeGroups.append('text')
    .attr('x', 26).attr('y', 20)
    .style('font-size', '11px').style('font-weight', '700')
    .attr('fill', '#1A5276')
    .text((d: any) => truncate(d.data.operation, 28))

  // Metrics
  nodeGroups.append('text')
    .attr('x', 10).attr('y', 40)
    .style('font-size', '10.5px')
    .attr('fill', '#777')
    .text((d: any) => {
      const n = d.data as PlanNode
      const parts: string[] = []
      if (n.estimatedCost) parts.push(`cost: ${formatCost(n.estimatedCost)}`)
      const rows = n.actualRows ?? n.estimatedRows
      if (rows) parts.push(`rows: ${formatNumber(rows)}`)
      return parts.join(' | ')
    })

  // Time
  nodeGroups.append('text')
    .attr('x', 10).attr('y', 56)
    .style('font-size', '10.5px')
    .attr('fill', '#777')
    .text((d: any) => {
      const n = d.data as PlanNode
      if (n.actualTimeLast != null) {
        const time = `time: ${formatDuration(n.actualTimeFirst ?? 0)}..${formatDuration(n.actualTimeLast)}`
        return n.loops && n.loops > 1 ? `${time} x${n.loops}` : time
      }
      return ''
    })

  // Cost bar background
  nodeGroups.append('rect')
    .attr('x', 10).attr('y', NODE_H - 14)
    .attr('width', NODE_W - 20).attr('height', 4).attr('rx', 2)
    .attr('fill', '#e2e8f0')

  // Cost bar fill
  nodeGroups.append('rect')
    .attr('x', 10).attr('y', NODE_H - 14)
    .attr('width', (d: any) => Math.max(2, ((d.data.costPercentage ?? 0) / 100) * (NODE_W - 20)))
    .attr('height', 4).attr('rx', 2)
    .attr('fill', (d: any) => getNodeColor(d.data))
}

onMounted(() => renderTree())
watch(() => props.root, () => nextTick(renderTree))
watch(() => props.selectedId, () => nextTick(renderTree))
</script>

<template>
  <div ref="containerRef" class="plan-tree" style="min-height: 400px; overflow: hidden; background: #fff;">
    <svg ref="svgRef" style="width: 100%;" />
  </div>
</template>
