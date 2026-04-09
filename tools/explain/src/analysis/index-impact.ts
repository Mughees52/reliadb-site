import type { PlanNode, PlanStats } from '../parsers/types'
import type { IndexRecommendation, IndexImpact, ImpactChange } from './types'

/**
 * Index Impact Simulator
 *
 * Predicts structural changes to an EXPLAIN plan if recommended indexes
 * were added. Based on MySQL optimizer guarantees — not guesswork.
 *
 * Rules:
 * - Index on join column → ALL becomes ref/eq_ref
 * - Covering index → eliminates table data reads
 * - WHERE + GROUP BY composite → eliminates temporary table
 * - WHERE + ORDER BY composite → eliminates filesort
 * - Index on filter column → ALL becomes ref/range
 */
export function simulateIndexImpact(
  root: PlanNode,
  stats: PlanStats,
  recommendations: IndexRecommendation[],
  query?: string,
): IndexImpact[] {
  return recommendations.map(rec => simulateOne(root, stats, rec, query))
}

function simulateOne(
  root: PlanNode,
  stats: PlanStats,
  rec: IndexRecommendation,
  query?: string,
): IndexImpact {
  const changes: ImpactChange[] = []

  // Find nodes that match this recommendation's table
  const affectedNodes = findNodesForTable(root, rec.table, query)

  for (const node of affectedNodes) {
    // 1. Access type change
    simulateAccessTypeChange(node, rec, changes)

    // 2. Row reduction
    simulateRowReduction(node, rec, changes)

    // 3. Covering index — eliminates table lookups
    simulateCoveringIndex(node, rec, changes)
  }

  // 4. Filesort elimination (query-level, not node-level)
  simulateFilesortElimination(root, rec, query, changes)

  // 5. Temporary table elimination
  simulateTempTableElimination(root, rec, query, changes)

  // 6. Join order optimization
  simulateJoinOrderChange(root, rec, affectedNodes, query, changes)

  return {
    recommendation: rec,
    changes,
    summary: buildSummary(changes),
  }
}

function simulateAccessTypeChange(
  node: PlanNode,
  rec: IndexRecommendation,
  changes: ImpactChange[],
) {
  if (node.accessType !== 'ALL' && node.accessType !== 'index') return

  const rows = node.actualRows ?? node.estimatedRows

  const firstCol = rec.columns[0]
  if (!firstCol) return

  // Gather all conditions: node's own, parent filter, and ancestor conditions
  const allConditions = [
    node.condition,
    node.parent?.condition,
    node.parent?.parent?.condition,
  ].filter(Boolean).join(' ')

  // Check if this table's index column is used in a join somewhere in the plan
  // e.g., another node has condition "id=r.premium_id" referencing this column
  const isJoinColumn = isColumnUsedInJoin(node, firstCol)

  // Check if condition has equality on first index column
  const isEquality = new RegExp(`\\b${firstCol}\\b\\s*=`, 'i').test(allConditions)

  let newAccessType: string
  if (isJoinColumn) {
    newAccessType = 'ref'
  } else if (isEquality) {
    newAccessType = 'ref'
  } else {
    newAccessType = 'range'
  }

  changes.push({
    type: 'access_type',
    icon: '→',
    before: `Full table scan (${node.accessType})`,
    after: `Index lookup (${newAccessType})`,
    explanation: `Index \`${rec.columns.join(', ')}\` enables ${newAccessType} access instead of scanning all ${formatRows(rows)} rows`,
  })
}

/** Check if a column from this node's table is referenced in another node's join condition */
function isColumnUsedInJoin(node: PlanNode, column: string): boolean {
  let root = node
  while (root.parent) root = root.parent

  let found = false
  walkNodes(root, (n) => {
    if (n === node || !n.condition) return
    // Look for the column in an equality condition that involves a table reference
    // Patterns: "id=r.premium_id", "r.premium_id = p.id", "t1.col = t2.col"
    const colPattern = new RegExp(`\\b${column}\\b`, 'i')
    // Join condition: has at least one table.column reference and an equals sign
    const hasTableRef = /\w+\.\w+/.test(n.condition)
    const hasEquals = /=/.test(n.condition)
    if (colPattern.test(n.condition) && hasTableRef && hasEquals) {
      found = true
    }
  })
  return found
}

function simulateRowReduction(
  node: PlanNode,
  rec: IndexRecommendation,
  changes: ImpactChange[],
) {
  const currentRows = node.actualRows ?? node.estimatedRows
  if (currentRows <= 1) return

  // Only relevant for full scans that will become index lookups
  if (node.accessType !== 'ALL' && node.accessType !== 'index') return

  const firstCol = rec.columns[0]
  if (!firstCol) return

  // Check if this column is used as a join key (another node does lookups using it)
  const isJoinKey = isColumnUsedInJoin(node, firstCol)

  if (isJoinKey) {
    // This is a driving table scanned fully, then joined to another table
    // With an index, MySQL may flip the join: drive from the other table and do index lookups here
    // Or keep the same order but use the index for IS NOT NULL filter
    changes.push({
      type: 'rows',
      icon: '↓',
      before: `${formatRows(currentRows)} rows scanned in full table scan`,
      after: `Index lookup per join key — only matching rows read`,
      explanation: `With an index on \`${firstCol}\`, MySQL can use index lookups instead of scanning the entire table`,
    })
    return
  }

  // Filter: check if parent filter shows rows being discarded
  if (node.parent?.operation?.toLowerCase().includes('filter')) {
    const parentNode = node.parent
    const afterFilter = parentNode.actualRows ?? parentNode.estimatedRows
    if (afterFilter < currentRows) {
      changes.push({
        type: 'rows',
        icon: '↓',
        before: `${formatRows(currentRows)} rows scanned, ${formatRows(afterFilter)} kept`,
        after: `~${formatRows(afterFilter)} rows read directly from index`,
        explanation: `Index narrows the scan to only matching rows — no post-filter discard`,
      })
    }
  }
}

function simulateCoveringIndex(
  node: PlanNode,
  rec: IndexRecommendation,
  changes: ImpactChange[],
) {
  // A covering index contains ALL columns the query needs from this table
  // We can detect this if the recommendation has more columns than just the filter
  if (rec.columns.length < 2) return

  const rows = node.actualRows ?? node.estimatedRows
  if (rows <= 10) return

  // Check if "covering" appears in the reason or if the rec has agg/select columns
  const isCovering = rec.reason.toLowerCase().includes('covering') ||
    rec.reason.toLowerCase().includes('index-only') ||
    rec.ddl.toLowerCase().includes('covering')

  if (isCovering) {
    changes.push({
      type: 'covering',
      icon: '⚡',
      before: 'Index lookup + table data read (random I/O)',
      after: 'Index-only scan (no table access)',
      explanation: `All needed columns (${rec.columns.map(c => '\`' + c + '\`').join(', ')}) are in the index — MySQL never touches the table data`,
    })
  }
}

function simulateFilesortElimination(
  root: PlanNode,
  rec: IndexRecommendation,
  query: string | undefined,
  changes: ImpactChange[],
) {
  if (!query) return

  // Check if the plan currently has a filesort
  const hasFilesort = hasNodeMatching(root, n =>
    n.operation?.toLowerCase().includes('sort') ||
    n.extra?.some(e => /filesort/i.test(e)) || false
  )
  if (!hasFilesort) return

  // Check if the index covers WHERE equality + ORDER BY columns in order
  const orderMatch = query.match(/\bORDER\s+BY\s+([\s\S]*?)(?:\bLIMIT\b|;|$)/i)
  if (!orderMatch) return

  const orderCols = extractSimpleColumns(orderMatch[1])
  if (orderCols.length === 0) return

  // Check if the recommended index has WHERE cols first, then ORDER BY cols
  const whereMatch = query.match(/\bWHERE\s+([\s\S]*?)(?:\bGROUP\b|\bORDER\b|\bLIMIT\b|\bHAVING\b|;|$)/i)
  const whereCols = whereMatch ? extractSimpleColumns(whereMatch[1]) : []

  // The index must have: [WHERE equality cols...] [ORDER BY cols...]
  const expectedOrder = [...whereCols.filter(c => rec.columns.includes(c)), ...orderCols.filter(c => rec.columns.includes(c))]
  const indexMatchesOrder = expectedOrder.length >= 2 && expectedOrder.every((col, i) => {
    const idx = rec.columns.indexOf(col)
    return idx >= 0 && (i === 0 || rec.columns.indexOf(expectedOrder[i - 1]) < idx)
  })

  if (indexMatchesOrder) {
    changes.push({
      type: 'filesort',
      icon: '✓',
      before: 'Filesort required (rows sorted in memory/disk)',
      after: 'Index delivers rows in sorted order',
      explanation: `Index column order (${rec.columns.map(c => '\`' + c + '\`').join(' → ')}) matches WHERE + ORDER BY — MySQL skips the sort step`,
    })
  }
}

function simulateTempTableElimination(
  root: PlanNode,
  rec: IndexRecommendation,
  query: string | undefined,
  changes: ImpactChange[],
) {
  if (!query) return

  // Check if the plan uses a temporary table for aggregation
  const hasTempTable = hasNodeMatching(root, n =>
    n.operation?.toLowerCase().includes('temporary') ||
    n.extra?.some(e => /temporary/i.test(e)) || false
  )
  if (!hasTempTable) return

  // Check if the index covers WHERE equality + GROUP BY columns
  const groupMatch = query.match(/\bGROUP\s+BY\s+([\s\S]*?)(?:\bORDER\b|\bLIMIT\b|\bHAVING\b|;|$)/i)
  if (!groupMatch) return

  const groupCols = extractSimpleColumns(groupMatch[1])
  if (groupCols.length === 0) return

  const whereMatch = query.match(/\bWHERE\s+([\s\S]*?)(?:\bGROUP\b|\bORDER\b|\bLIMIT\b|\bHAVING\b|;|$)/i)
  const whereCols = whereMatch ? extractSimpleColumns(whereMatch[1]) : []

  // Index must have WHERE equality cols first, then GROUP BY cols
  const indexHasWhere = whereCols.every(c => rec.columns.includes(c))
  const indexHasGroup = groupCols.every(c => rec.columns.includes(c))
  const whereBeforeGroup = indexHasWhere && indexHasGroup && whereCols.every(wc => {
    const wi = rec.columns.indexOf(wc)
    return groupCols.every(gc => {
      const gi = rec.columns.indexOf(gc)
      return wi < gi || wc === gc
    })
  })

  if (whereBeforeGroup) {
    changes.push({
      type: 'temp_table',
      icon: '✓',
      before: 'Temporary table needed for GROUP BY',
      after: 'Grouped via index (ordered stream)',
      explanation: `Index (${rec.columns.map(c => '\`' + c + '\`').join(', ')}) delivers rows pre-grouped — MySQL aggregates in a single pass without materialization`,
    })
  }
}

function simulateJoinOrderChange(
  root: PlanNode,
  rec: IndexRecommendation,
  affectedNodes: PlanNode[],
  query: string | undefined,
  changes: ImpactChange[],
) {
  // If the recommended index is on a join column of a table that's currently the driving table
  // (scanned first), MySQL may flip the join order to use it as the inner table
  for (const node of affectedNodes) {
    if (node.accessType !== 'ALL') continue
    if (!node.loops || node.loops > 1) continue // already inner table

    // This is a driving table (loops=1, scanned fully)
    // Check if there's a filter on this table that the index covers
    const parentFilter = node.parent
    if (!parentFilter?.condition) continue

    const filterCol = rec.columns[0]
    if (!filterCol) continue
    const hasFilterOnIndex = new RegExp(`\\b${filterCol}\\b\\s*=`, 'i').test(parentFilter.condition)

    if (hasFilterOnIndex) {
      const totalRows = node.actualRows ?? node.estimatedRows
      const filteredRows = parentFilter.actualRows ?? parentFilter.estimatedRows

      if (filteredRows < totalRows * 0.5) {
        changes.push({
          type: 'join_order',
          icon: '↻',
          before: `\`${rec.table}\` scanned fully as driving table (${formatRows(totalRows)} rows)`,
          after: `Optimizer can drive from \`${rec.table}\` WHERE ${filterCol} first (~${formatRows(filteredRows)} rows)`,
          explanation: `With the index, MySQL can start from the filtered subset and look up matching rows in other tables — processing far fewer rows overall`,
        })
      }
    }
  }
}

// --- Helpers ---

function findNodesForTable(root: PlanNode, tableName: string, query?: string): PlanNode[] {
  const nodes: PlanNode[] = []
  const tableNameLower = tableName.toLowerCase()
  walkNodes(root, (node) => {
    if (!node.table || node.table.startsWith('<')) return
    // Match by resolved name or alias
    if (node.table.toLowerCase() === tableNameLower) {
      nodes.push(node)
      return
    }
    // Try alias resolution
    if (query) {
      const resolved = resolveAlias(query, node.table)
      if (resolved.toLowerCase() === tableNameLower) {
        nodes.push(node)
      }
    }
  })
  return nodes
}

function findParentFilter(node: PlanNode): PlanNode | null {
  let current = node.parent
  while (current) {
    if (current.operation?.toLowerCase().includes('filter')) return current
    current = current.parent
  }
  return null
}

function hasNodeMatching(root: PlanNode, predicate: (n: PlanNode) => boolean): boolean {
  let found = false
  walkNodes(root, (n) => { if (predicate(n)) found = true })
  return found
}

function extractSimpleColumns(clause: string): string[] {
  const cols: string[] = []
  // Match table.column or bare column
  const regex = /(?:\w+\.)?(\w+)/g
  const SQL_KEYWORDS = new Set(['AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'ASC', 'DESC',
    'SUM', 'COUNT', 'MAX', 'MIN', 'AVG', 'YEAR', 'MONTH', 'DATE', 'AS',
    'FROM', 'WHERE', 'GROUP', 'ORDER', 'BY', 'HAVING', 'LIMIT', 'BETWEEN', 'LIKE',
    'TRUE', 'FALSE', 'SELECT', 'JOIN', 'ON', 'LEFT', 'RIGHT', 'INNER', 'ACTIVE'])
  let match
  while ((match = regex.exec(clause)) !== null) {
    const col = match[1]
    if (!SQL_KEYWORDS.has(col.toUpperCase()) && !cols.includes(col) && !/^\d+$/.test(col)) {
      cols.push(col)
    }
  }
  return cols
}

function formatRows(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function buildSummary(changes: ImpactChange[]): string {
  const count = changes.length
  if (count === 0) return 'Minimal structural impact expected'

  const types = new Set(changes.map(c => c.type))
  const parts: string[] = []
  if (types.has('access_type')) parts.push('eliminates full scan')
  if (types.has('rows')) parts.push('reduces rows read')
  if (types.has('covering')) parts.push('index-only scan')
  if (types.has('filesort')) parts.push('eliminates filesort')
  if (types.has('temp_table')) parts.push('eliminates temp table')
  if (types.has('join_order')) parts.push('enables join reorder')

  return parts.length > 0 ? parts.join(', ') : `${count} structural change${count > 1 ? 's' : ''}`
}

function resolveAlias(query: string, alias: string): string {
  const regex = new RegExp(`\\b(?:FROM|JOIN)\\s+\`?(\\w+)\`?\\s+(?:AS\\s+)?${alias}\\b`, 'i')
  const match = query.match(regex)
  return match ? match[1] : alias
}

function walkNodes(node: PlanNode, fn: (node: PlanNode) => void) {
  fn(node)
  for (const child of node.children) {
    walkNodes(child, fn)
  }
}
