export type AccessType =
  | 'system'
  | 'const'
  | 'eq_ref'
  | 'ref'
  | 'fulltext'
  | 'ref_or_null'
  | 'index_merge'
  | 'unique_subquery'
  | 'index_subquery'
  | 'range'
  | 'index'
  | 'ALL'

export const ACCESS_TYPE_RANK: Record<AccessType, number> = {
  system: 0,
  const: 1,
  eq_ref: 2,
  ref: 3,
  fulltext: 4,
  ref_or_null: 5,
  index_merge: 6,
  unique_subquery: 7,
  index_subquery: 8,
  range: 9,
  index: 10,
  ALL: 11,
}

export interface PlanNode {
  id: string
  operation: string
  table?: string
  accessType?: AccessType
  index?: string
  possibleKeys?: string[]

  estimatedRows: number
  estimatedCost: number
  filtered?: number

  actualTimeFirst?: number
  actualTimeLast?: number
  actualRows?: number
  loops?: number

  totalActualTime?: number
  rowMismatchRatio?: number
  costPercentage?: number
  isBottleneck: boolean

  condition?: string
  extra?: string[]
  usedColumns?: string[]
  keyLength?: number
  selectType?: string

  children: PlanNode[]
  parent?: PlanNode
  depth: number
}

export interface PlanStats {
  totalCost: number
  totalTime?: number
  totalRows: number
  nodeCount: number
  maxDepth: number
  tablesAccessed: string[]
  indexesUsed: string[]
  hasFilesort: boolean
  hasTempTable: boolean
  hasFullScan: boolean
  bottleneckNode?: PlanNode
}

export type ExplainFormat = 'tree' | 'json' | 'table' | 'unknown'

export interface ParseResult {
  root: PlanNode
  stats: PlanStats
  format: ExplainFormat
  warnings: string[]
}

export function createNode(partial: Partial<PlanNode> = {}): PlanNode {
  return {
    id: partial.id ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
    operation: partial.operation ?? 'Unknown',
    table: partial.table,
    accessType: partial.accessType,
    index: partial.index,
    possibleKeys: partial.possibleKeys,
    estimatedRows: partial.estimatedRows ?? 0,
    estimatedCost: partial.estimatedCost ?? 0,
    filtered: partial.filtered,
    actualTimeFirst: partial.actualTimeFirst,
    actualTimeLast: partial.actualTimeLast,
    actualRows: partial.actualRows,
    loops: partial.loops,
    totalActualTime: partial.totalActualTime,
    rowMismatchRatio: partial.rowMismatchRatio,
    costPercentage: partial.costPercentage,
    isBottleneck: partial.isBottleneck ?? false,
    condition: partial.condition,
    extra: partial.extra,
    usedColumns: partial.usedColumns,
    keyLength: partial.keyLength,
    selectType: partial.selectType,
    children: partial.children ?? [],
    parent: partial.parent,
    depth: partial.depth ?? 0,
  }
}

export function computeStats(root: PlanNode): PlanStats {
  const stats: PlanStats = {
    totalCost: root.estimatedCost,
    totalTime: root.actualTimeLast != null && root.loops != null
      ? root.actualTimeLast * root.loops
      : root.actualTimeLast,
    totalRows: 0,
    nodeCount: 0,
    maxDepth: 0,
    tablesAccessed: [],
    indexesUsed: [],
    hasFilesort: false,
    hasTempTable: false,
    hasFullScan: false,
  }

  let maxTime = 0

  function walk(node: PlanNode) {
    stats.nodeCount++
    stats.maxDepth = Math.max(stats.maxDepth, node.depth)
    stats.totalRows += node.actualRows ?? node.estimatedRows

    if (node.table && !stats.tablesAccessed.includes(node.table)) {
      stats.tablesAccessed.push(node.table)
    }
    if (node.index && !stats.indexesUsed.includes(node.index)) {
      stats.indexesUsed.push(node.index)
    }

    if (node.extra?.some(e => /filesort/i.test(e))) stats.hasFilesort = true
    if (node.extra?.some(e => /temporary/i.test(e))) stats.hasTempTable = true
    if (node.accessType === 'ALL' && (node.estimatedRows > 100 || (node.actualRows != null && node.actualRows > 100))) {
      stats.hasFullScan = true
    }

    // Compute derived fields
    if (node.actualTimeLast != null && node.loops != null) {
      node.totalActualTime = node.actualTimeLast * node.loops
    }
    if (node.actualRows != null && node.estimatedRows > 0) {
      node.rowMismatchRatio = node.actualRows / node.estimatedRows
    }
    if (stats.totalCost > 0) {
      node.costPercentage = (node.estimatedCost / stats.totalCost) * 100
    }

    const nodeTime = node.totalActualTime ?? node.actualTimeLast ?? 0
    if (nodeTime > maxTime) {
      maxTime = nodeTime
      stats.bottleneckNode = node
    }

    for (const child of node.children) {
      walk(child)
    }
  }

  walk(root)

  if (stats.bottleneckNode) {
    stats.bottleneckNode.isBottleneck = true
  }

  return stats
}
