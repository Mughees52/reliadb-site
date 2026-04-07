import type { PlanNode, PlanStats } from '../parsers/types'
import type { Issue, Severity } from './types'

type RuleFn = (node: PlanNode, root: PlanNode, stats: PlanStats) => Issue | null

function issue(
  node: PlanNode,
  severity: Severity,
  category: Issue['category'],
  title: string,
  description: string,
  recommendation: string,
  extra?: Partial<Issue>,
): Issue {
  return {
    id: `${category}-${node.id}`,
    severity,
    category,
    title,
    description,
    nodeId: node.id,
    nodeName: node.operation,
    recommendation,
    ...extra,
  }
}

function isTempTable(node: PlanNode): boolean {
  return node.table?.startsWith('<') === true || node.operation.toLowerCase().includes('<temporary>')
}

// ---- CRITICAL RULES ----

const fullTableScanLarge: RuleFn = (node) => {
  if (node.accessType !== 'ALL') return null
  if (isTempTable(node)) return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows <= 100) return null

  return issue(node, 'critical', 'scan',
    `Full table scan on \`${node.table ?? 'unknown'}\``,
    `Scanning ${rows.toLocaleString()} rows. The optimizer cannot use an index to filter rows, so it reads every row in the table.`,
    `Add an index on the columns used in WHERE or JOIN conditions for table \`${node.table}\`.`,
    {
      impact: `Examining ${rows.toLocaleString()} rows instead of a targeted index lookup`,
      docLink: 'https://dev.mysql.com/doc/refman/8.0/en/table-scan-avoidance.html',
    },
  )
}

const filesortLarge: RuleFn = (node) => {
  if (!node.extra?.some(e => /filesort/i.test(e))) return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows <= 1000) return null

  return issue(node, 'critical', 'sort',
    `Filesort on ${rows.toLocaleString()} rows`,
    `MySQL must sort ${rows.toLocaleString()} rows in memory or on disk. This is expensive for large result sets.`,
    `Add an index that matches the ORDER BY columns to avoid sorting.`,
    {
      impact: `Sorting ${rows.toLocaleString()} rows — consider ORDER BY index optimization`,
      docLink: 'https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html',
    },
  )
}

const tempTableLarge: RuleFn = (node) => {
  if (!node.extra?.some(e => /temporary/i.test(e))) return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows <= 500) return null

  return issue(node, 'critical', 'sort',
    `Temporary table with ${rows.toLocaleString()} rows`,
    `MySQL creates a temporary table to process this operation. For large result sets, this may spill to disk.`,
    `Add a composite index matching the GROUP BY columns, or restructure the query.`,
    {
      impact: `Temporary table processing ${rows.toLocaleString()} rows — potential disk I/O`,
      docLink: 'https://dev.mysql.com/doc/refman/8.0/en/internal-temporary-tables.html',
    },
  )
}

const dependentSubquery: RuleFn = (node) => {
  if (!node.selectType?.toUpperCase().includes('DEPENDENT')) return null

  return issue(node, 'critical', 'subquery',
    `Dependent subquery detected`,
    `This subquery is re-executed for every row of the outer query, causing O(n*m) complexity.`,
    `Rewrite as a JOIN or use a derived table to execute the subquery once.`,
    {
      impact: 'Subquery executes once per outer row — exponential slowdown on large tables',
      docLink: 'https://dev.mysql.com/doc/refman/8.0/en/correlated-subqueries.html',
    },
  )
}

const cartesianJoin: RuleFn = (node) => {
  if (node.accessType !== 'ALL') return null
  if (isTempTable(node)) return null
  if (!node.parent) return null
  if (node.condition) return null
  if (node.extra?.some(e => /where/i.test(e))) return null

  // Check if this is an ALL scan inside a join with no condition
  const parentOp = node.parent.operation.toLowerCase()
  if (!parentOp.includes('join') && !parentOp.includes('loop')) return null

  return issue(node, 'critical', 'join',
    `Possible Cartesian join on \`${node.table ?? 'unknown'}\``,
    `Full table scan inside a join with no visible join condition. This produces a cross product of all rows.`,
    `Add a proper JOIN ON condition between the tables.`,
    { impact: 'Cross product — row count multiplies between tables' },
  )
}

const massiveRowMismatch: RuleFn = (node) => {
  if (node.actualRows == null || node.estimatedRows <= 0) return null
  const ratio = node.actualRows / node.estimatedRows
  if (ratio <= 100 && ratio >= 0.01) return null

  return issue(node, 'critical', 'estimate',
    `Massive row estimate mismatch on \`${node.table ?? node.operation}\``,
    `Estimated ${node.estimatedRows.toLocaleString()} rows but actually processed ${node.actualRows.toLocaleString()} (${ratio > 1 ? ratio.toFixed(0) + 'x more' : (1/ratio).toFixed(0) + 'x fewer'}).`,
    `Run \`ANALYZE TABLE ${node.table ?? '...'}\` to update table statistics. Severely wrong estimates cause the optimizer to choose bad plans.`,
    {
      impact: `${ratio > 1 ? 'Under' : 'Over'}-estimate by ${ratio > 1 ? ratio.toFixed(0) : (1/ratio).toFixed(0)}x`,
      docLink: 'https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html',
    },
  )
}

const nestedLoopUnindexed: RuleFn = (node) => {
  if (node.accessType !== 'ALL') return null
  if (isTempTable(node)) return null
  if (!node.parent) return null
  const parentOp = node.parent.operation.toLowerCase()
  if (!parentOp.includes('nested loop') && !parentOp.includes('join')) return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows <= 50) return null

  return issue(node, 'critical', 'join',
    `Unindexed nested loop join on \`${node.table ?? 'unknown'}\``,
    `Table \`${node.table}\` is scanned fully (${rows.toLocaleString()} rows) for each row from the outer table. With ${node.loops ?? '?'} loops, this examines ~${((rows) * (node.loops ?? 1)).toLocaleString()} total rows.`,
    `Add an index on the join column of \`${node.table}\` to convert this full scan into an index lookup.`,
    { impact: `${rows.toLocaleString()} rows × ${node.loops ?? '?'} loops = ~${((rows) * (node.loops ?? 1)).toLocaleString()} total row reads` },
  )
}

// ---- WARNING RULES ----

const rowEstimateMismatch: RuleFn = (node) => {
  if (node.actualRows == null || node.estimatedRows <= 0) return null
  const ratio = node.actualRows / node.estimatedRows
  if (ratio > 100 || ratio < 0.01) return null // handled by massive mismatch
  if (ratio <= 10 && ratio >= 0.1) return null

  return issue(node, 'warning', 'estimate',
    `Row estimate mismatch on \`${node.table ?? node.operation}\``,
    `Estimated ${node.estimatedRows.toLocaleString()} rows, actually ${node.actualRows.toLocaleString()} (${ratio.toFixed(1)}x ${ratio > 1 ? 'more' : 'fewer'}).`,
    `Run \`ANALYZE TABLE ${node.table ?? '...'}\` to refresh statistics.`,
    { docLink: 'https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html' },
  )
}

const noIndexUsed: RuleFn = (node) => {
  if (node.accessType !== 'ALL') return null
  if (isTempTable(node)) return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows > 100) return null // handled by fullTableScanLarge
  if (rows <= 10) return null // too small to matter

  if (node.possibleKeys && node.possibleKeys.length > 0) return null

  return issue(node, 'warning', 'index',
    `No index available for \`${node.table ?? 'unknown'}\``,
    `Table \`${node.table}\` has no applicable index for this query. Scanning ${rows} rows.`,
    `Create an index on the columns used in the WHERE or JOIN condition.`,
  )
}

const fullIndexScan: RuleFn = (node) => {
  if (node.accessType !== 'index') return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows <= 500) return null

  return issue(node, 'warning', 'scan',
    `Full index scan on \`${node.table ?? 'unknown'}\``,
    `Scanning the entire index (${rows.toLocaleString()} entries) rather than seeking to specific rows.`,
    `Add a WHERE condition to narrow the scan, or use a more selective index.`,
    { docLink: 'https://dev.mysql.com/doc/refman/8.0/en/explain-output.html#jointype_index' },
  )
}

const highLoopCount: RuleFn = (node) => {
  if (!node.loops || node.loops <= 100) return null

  return issue(node, 'warning', 'join',
    `High loop count (${node.loops.toLocaleString()}) on \`${node.table ?? node.operation}\``,
    `This operation executes ${node.loops.toLocaleString()} times. Each iteration processes ${(node.actualRows ?? node.estimatedRows).toLocaleString()} rows.`,
    `Check if the outer table can be filtered further to reduce the number of loops.`,
    { impact: `${node.loops.toLocaleString()} iterations × ${(node.actualRows ?? node.estimatedRows).toLocaleString()} rows each` },
  )
}

const filesortSmall: RuleFn = (node) => {
  if (!node.extra?.some(e => /filesort/i.test(e))) return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows > 1000) return null // handled by filesortLarge
  if (rows <= 100) return null // acceptable

  return issue(node, 'warning', 'sort',
    `Filesort on ${rows} rows`,
    `MySQL sorts ${rows} rows using filesort. Acceptable for small sets but may slow down as data grows.`,
    `Consider adding an index matching the ORDER BY columns for future scalability.`,
    { docLink: 'https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html' },
  )
}

const usingJoinBuffer: RuleFn = (node) => {
  if (!node.extra?.some(e => /join buffer/i.test(e))) return null

  return issue(node, 'warning', 'join',
    `Using join buffer on \`${node.table ?? 'unknown'}\``,
    `MySQL uses a join buffer because there is no usable index for the join condition. Rows are buffered in memory and compared.`,
    `Add an index on the join column of table \`${node.table}\`.`,
    { docLink: 'https://dev.mysql.com/doc/refman/8.0/en/nested-loop-joins.html#block-nested-loop-join-algorithm' },
  )
}

const rangeCheckEachRecord: RuleFn = (node) => {
  if (!node.extra?.some(e => /range checked for each record/i.test(e))) return null

  return issue(node, 'warning', 'index',
    `Range checked for each record on \`${node.table ?? 'unknown'}\``,
    `MySQL re-evaluates which index to use for each row from the previous table. This is inefficient.`,
    `Add a proper composite index that covers the join condition.`,
    { docLink: 'https://dev.mysql.com/doc/refman/8.0/en/explain-output.html' },
  )
}

const tempTableSmall: RuleFn = (node) => {
  if (!node.extra?.some(e => /temporary/i.test(e))) return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows > 500) return null // handled by tempTableLarge
  if (rows <= 50) return null

  return issue(node, 'warning', 'sort',
    `Temporary table with ${rows} rows`,
    `A temporary table is created for ${rows} rows. Manageable now, but watch as data grows.`,
    `Consider adding an index matching GROUP BY columns.`,
  )
}

// ---- INFO RULES ----

const smallTableScanOk: RuleFn = (node) => {
  if (node.accessType !== 'ALL') return null
  if (isTempTable(node)) return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows > 100) return null

  return issue(node, 'info', 'scan',
    `Small table scan on \`${node.table ?? 'unknown'}\` (${rows} rows)`,
    `Full table scan on a small table. For very small tables, a full scan can be faster than using an index.`,
    `Acceptable — adding an index may not improve performance for tables this small.`,
  )
}

// ---- GOOD RULES ----

const usingCoveringIndex: RuleFn = (node) => {
  if (!node.extra?.some(e => /^Using index$/i.test(e.trim()))) return null

  return issue(node, 'good', 'index',
    `Covering index on \`${node.table ?? 'unknown'}\``,
    `All required columns are available in the index — MySQL doesn't need to read the actual table rows.`,
    `Optimal — the covering index minimizes I/O.`,
  )
}

const optimalAccess: RuleFn = (node) => {
  if (node.accessType !== 'const' && node.accessType !== 'system' && node.accessType !== 'eq_ref') return null

  const label = node.accessType === 'eq_ref' ? 'unique index join' : 'single-row lookup'

  return issue(node, 'good', 'index',
    `Optimal ${label} on \`${node.table ?? 'unknown'}\``,
    `Access type \`${node.accessType}\` — the most efficient way to retrieve ${node.accessType === 'eq_ref' ? 'joined' : ''} rows.`,
    `No improvement needed.`,
  )
}

const indexConditionPushdown: RuleFn = (node) => {
  if (!node.extra?.some(e => /index condition/i.test(e))) return null

  return issue(node, 'good', 'index',
    `Index Condition Pushdown on \`${node.table ?? 'unknown'}\``,
    `ICP is active — WHERE conditions are evaluated at the storage engine level using the index, reducing row reads.`,
    `Optimal — ICP reduces the amount of data transferred between engine and server.`,
    { docLink: 'https://dev.mysql.com/doc/refman/8.0/en/index-condition-pushdown-optimization.html' },
  )
}

// ---- ALL RULES ----

const allRules: RuleFn[] = [
  // Critical
  fullTableScanLarge,
  filesortLarge,
  tempTableLarge,
  dependentSubquery,
  cartesianJoin,
  massiveRowMismatch,
  nestedLoopUnindexed,
  // Warning
  rowEstimateMismatch,
  noIndexUsed,
  fullIndexScan,
  highLoopCount,
  filesortSmall,
  usingJoinBuffer,
  rangeCheckEachRecord,
  tempTableSmall,
  // Info
  smallTableScanOk,
  // Good
  usingCoveringIndex,
  optimalAccess,
  indexConditionPushdown,
]

export function runRules(node: PlanNode, root: PlanNode, stats: PlanStats): Issue[] {
  const issues: Issue[] = []
  for (const rule of allRules) {
    const result = rule(node, root, stats)
    if (result) {
      issues.push(result)
    }
  }
  return issues
}
