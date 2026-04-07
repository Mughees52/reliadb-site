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

/** Get max rows from child nodes (for wrapper nodes with 0 rows) */
function maxChildRows(node: PlanNode): number {
  let max = 0
  for (const child of node.children) {
    const r = child.actualRows ?? child.estimatedRows
    if (r > max) max = r
    const childMax = maxChildRows(child)
    if (childMax > max) max = childMax
  }
  return max
}

// ============================================================
// CRITICAL RULES (7)
// ============================================================

const fullTableScanLarge: RuleFn = (node) => {
  if (node.accessType !== 'ALL') return null
  if (isTempTable(node)) return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows <= 100) return null

  // Try to find condition columns from parent Filter node for specific recommendation
  const filterCondition = node.parent?.condition ?? node.condition
  const condCols = filterCondition ? extractConditionColumns(filterCondition) : []
  const tableName = node.table ?? 'unknown'

  const recommendation = condCols.length > 0
    ? `Add a composite index on the filtered columns: ${condCols.map(c => `\`${c}\``).join(', ')}. This converts the full table scan into an index range scan. See the Indexes tab for DDL.`
    : `Add an index on the columns used in WHERE or JOIN conditions for table \`${tableName}\`. See the Indexes tab for DDL.`

  return issue(node, 'critical', 'scan',
    `Full table scan on \`${tableName}\``,
    `Scanning ${rows.toLocaleString()} rows. The optimizer cannot use an index to filter rows, so it reads every row in the table.`,
    recommendation,
    {
      impact: `Examining ${rows.toLocaleString()} rows instead of a targeted index lookup`,
      docLink: 'https://dev.mysql.com/doc/refman/8.4/en/table-scan-avoidance.html',
    },
  )
}

/** Extract column names from a condition string, handling table.column and function wrapping */
function extractConditionColumns(condition: string): string[] {
  const exclude = new Set(['null', 'true', 'false', 'and', 'or', 'not', 'is',
    'cache', 'now', 'interval', 'day', 'month', 'year', 'hour', 'minute', 'second',
    'current_timestamp', 'curdate', 'sysdate', 'select', 'from', 'where', 'in', 'between', 'like', 'exists'])
  const cols: string[] = []
  const regex = /(?:\w+\.)?(\w+)\s*(?:>|<|>=|<=|=|!=|<>|LIKE\b|IN\b|BETWEEN\b|IS\b)/gi
  let match
  while ((match = regex.exec(condition)) !== null) {
    const col = match[1]
    if (!exclude.has(col.toLowerCase()) && !cols.includes(col)) {
      cols.push(col)
    }
  }
  return cols
}

const filesortLarge: RuleFn = (node) => {
  if (!node.extra?.some(e => /filesort/i.test(e))) return null
  let rows = node.actualRows ?? node.estimatedRows
  // For wrapper nodes (like MariaDB JSON filesort) with 0 rows, use max from children
  if (rows === 0 && node.children.length > 0) {
    rows = maxChildRows(node)
  }
  if (rows <= 1000) return null

  return issue(node, 'critical', 'sort',
    `Filesort on ${rows.toLocaleString()} rows`,
    `MySQL must sort ${rows.toLocaleString()} rows in memory or on disk. This is expensive for large result sets.`,
    `Add an index that matches the ORDER BY columns to avoid sorting.`,
    {
      impact: `Sorting ${rows.toLocaleString()} rows — consider ORDER BY index optimization`,
      docLink: 'https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html',
    },
  )
}

const tempTableLarge: RuleFn = (node) => {
  if (!node.extra?.some(e => /temporary/i.test(e))) return null
  let rows = node.actualRows ?? node.estimatedRows
  if (rows === 0 && node.children.length > 0) rows = maxChildRows(node)
  if (rows <= 500) return null

  return issue(node, 'critical', 'sort',
    `Temporary table with ${rows.toLocaleString()} rows`,
    `MySQL creates a temporary table to process this operation. For large result sets, this may spill to disk.`,
    `Add a composite index matching the GROUP BY columns, or restructure the query.`,
    {
      impact: `Temporary table processing ${rows.toLocaleString()} rows — potential disk I/O`,
      docLink: 'https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html',
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
      docLink: 'https://dev.mysql.com/doc/refman/8.4/en/correlated-subqueries.html',
    },
  )
}

const cartesianJoin: RuleFn = (node) => {
  if (node.accessType !== 'ALL') return null
  if (isTempTable(node)) return null
  if (!node.parent) return null
  if (node.condition) return null
  if (node.extra?.some(e => /where/i.test(e))) return null

  const parentOp = node.parent.operation.toLowerCase()
  if (!parentOp.includes('join') && !parentOp.includes('loop')) return null

  // Don't flag the driving (first) table of a join — it's expected to scan fully.
  // Only flag inner (non-first) tables that have no join condition.
  const siblings = node.parent.children
  if (siblings.length > 0 && siblings[0] === node) return null
  // Also skip if this is the first child deep in the tree (driving table of nested join)
  if (siblings.length > 0 && siblings[0].children.length > 0 && containsNode(siblings[0], node)) return null

  return issue(node, 'critical', 'join',
    `Possible Cartesian join on \`${node.table ?? 'unknown'}\``,
    `Full table scan inside a join with no visible join condition. This produces a cross product of all rows.`,
    `Add a proper JOIN ON condition between the tables.`,
    { impact: 'Cross product — row count multiplies between tables' },
  )
}

function containsNode(parent: PlanNode, target: PlanNode): boolean {
  if (parent === target) return true
  return parent.children.some(c => containsNode(c, target))
}

const massiveRowMismatch: RuleFn = (node) => {
  if (node.actualRows == null || node.estimatedRows <= 0) return null

  // Skip when actual = 0 — this is a data integrity issue (zeroRowJoin handles it),
  // not a statistics problem. "Run ANALYZE TABLE" won't help when rows don't exist.
  if (node.actualRows === 0) return null

  const ratio = node.actualRows / node.estimatedRows
  if (ratio <= 100 && ratio >= 0.01) return null

  const label = ratio > 1
    ? `${ratio.toFixed(0)}x more than estimated`
    : `${(1 / ratio).toFixed(0)}x fewer than estimated`

  return issue(node, 'critical', 'estimate',
    `Massive row estimate mismatch on \`${node.table ?? node.operation}\``,
    `Estimated ${node.estimatedRows.toLocaleString()} rows but actually processed ${node.actualRows.toLocaleString()} (${label}).`,
    `Run \`ANALYZE TABLE ${node.table ?? '...'}\` to update table statistics. Severely wrong estimates cause the optimizer to choose bad plans.`,
    {
      impact: `${ratio > 1 ? 'Under' : 'Over'}-estimate by ${ratio > 1 ? ratio.toFixed(0) : (1 / ratio).toFixed(0)}x`,
      docLink: 'https://dev.mysql.com/doc/refman/8.4/en/analyze-table.html',
    },
  )
}

const nestedLoopUnindexed: RuleFn = (node) => {
  if (node.accessType !== 'ALL') return null
  if (isTempTable(node)) return null
  if (!node.parent) return null
  const parentOp = node.parent.operation.toLowerCase()
  if (!parentOp.includes('nested loop') && !parentOp.includes('join')) return null
  // Don't flag the driving (first/outer) table — it's expected to scan
  const siblings = node.parent.children
  if (siblings.length > 0 && siblings[0] === node) return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows <= 50) return null

  return issue(node, 'critical', 'join',
    `Unindexed nested loop join on \`${node.table ?? 'unknown'}\``,
    `Table \`${node.table}\` is scanned fully (${rows.toLocaleString()} rows) for each row from the outer table. With ${node.loops ?? '?'} loops, this examines ~${((rows) * (node.loops ?? 1)).toLocaleString()} total rows.`,
    `Add an index on the join column of \`${node.table}\` to convert this full scan into an index lookup.`,
    { impact: `${rows.toLocaleString()} rows × ${node.loops ?? '?'} loops = ~${((rows) * (node.loops ?? 1)).toLocaleString()} total row reads` },
  )
}

// ============================================================
// WARNING RULES (17)
// ============================================================

const rowEstimateMismatch: RuleFn = (node) => {
  if (node.actualRows == null || node.estimatedRows <= 0) return null
  if (node.actualRows === 0) return null // handled by zeroRowJoin
  const ratio = node.actualRows / node.estimatedRows
  if (ratio > 100 || ratio < 0.01) return null
  if (ratio <= 10 && ratio >= 0.1) return null

  return issue(node, 'warning', 'estimate',
    `Row estimate mismatch on \`${node.table ?? node.operation}\``,
    `Estimated ${node.estimatedRows.toLocaleString()} rows, actually ${node.actualRows.toLocaleString()} (${ratio.toFixed(1)}x ${ratio > 1 ? 'more' : 'fewer'}).`,
    `Run \`ANALYZE TABLE ${node.table ?? '...'}\` to refresh statistics.`,
    { docLink: 'https://dev.mysql.com/doc/refman/8.4/en/analyze-table.html' },
  )
}

const noIndexUsed: RuleFn = (node) => {
  if (node.accessType !== 'ALL') return null
  if (isTempTable(node)) return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows > 100) return null
  if (rows <= 10) return null
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
    { docLink: 'https://dev.mysql.com/doc/refman/8.4/en/explain-output.html#jointype_index' },
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
  if (rows > 1000) return null
  if (rows <= 100) return null

  return issue(node, 'warning', 'sort',
    `Filesort on ${rows} rows`,
    `MySQL sorts ${rows} rows using filesort. Acceptable for small sets but may slow down as data grows.`,
    `Consider adding an index matching the ORDER BY columns for future scalability.`,
    { docLink: 'https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html' },
  )
}

const usingJoinBuffer: RuleFn = (node) => {
  if (!node.extra?.some(e => /join buffer/i.test(e))) return null

  return issue(node, 'warning', 'join',
    `Using join buffer on \`${node.table ?? 'unknown'}\``,
    `MySQL uses a join buffer because there is no usable index for the join condition. Rows are buffered in memory and compared.`,
    `Add an index on the join column of table \`${node.table}\`.`,
    { docLink: 'https://dev.mysql.com/doc/refman/8.4/en/nested-loop-joins.html' },
  )
}

const rangeCheckEachRecord: RuleFn = (node) => {
  if (!node.extra?.some(e => /range checked for each record/i.test(e))) return null

  return issue(node, 'warning', 'index',
    `Range checked for each record on \`${node.table ?? 'unknown'}\``,
    `MySQL re-evaluates which index to use for each row from the previous table. This is inefficient.`,
    `Add a proper composite index that covers the join condition.`,
    { docLink: 'https://dev.mysql.com/doc/refman/8.4/en/explain-output.html' },
  )
}

const tempTableSmall: RuleFn = (node) => {
  if (!node.extra?.some(e => /temporary/i.test(e))) return null
  let rows = node.actualRows ?? node.estimatedRows
  if (rows === 0 && node.children.length > 0) rows = maxChildRows(node)
  if (rows > 500) return null
  if (rows <= 50) return null

  return issue(node, 'warning', 'sort',
    `Temporary table with ${rows} rows`,
    `A temporary table is created for ${rows} rows. Manageable now, but watch as data grows.`,
    `Consider adding an index matching GROUP BY columns.`,
  )
}

// NEW Phase 2 warning rules:

const functionOnColumn: RuleFn = (node) => {
  if (!node.condition) return null
  // Detect YEAR(), MONTH(), DATE(), LOWER(), UPPER(), etc. wrapping columns
  const funcPattern = /\b(?:year|month|day|date|hour|minute|second|unix_timestamp|date_format|lower|upper|trim|concat|substring|left|right|replace|cast|convert|md5|sha1|sha2|length|char_length|abs|floor|ceil|round)\s*\(/i
  if (!funcPattern.test(node.condition)) return null
  if (isTempTable(node)) return null

  return issue(node, 'warning', 'index',
    `Function on column in condition`,
    `The filter "${node.condition.slice(0, 80)}${node.condition.length > 80 ? '...' : ''}" wraps a column in a function. This prevents MySQL from using any index on that column.`,
    `Rewrite the condition to compare the column directly. E.g., instead of \`WHERE YEAR(created_at) = 2024\`, use \`WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'\`.`,
    {
      impact: 'Index on the wrapped column cannot be used — falls back to full scan',
      docLink: 'https://dev.mysql.com/doc/refman/8.4/en/index-btree-hash.html',
    },
  )
}

const indexNotUsedDespiteAvailable: RuleFn = (node) => {
  if (node.accessType !== 'ALL') return null
  if (isTempTable(node)) return null
  if (!node.possibleKeys || node.possibleKeys.length === 0) return null
  if (!node.index) {
    const rows = node.actualRows ?? node.estimatedRows
    return issue(node, 'warning', 'index',
      `Index available but not used on \`${node.table ?? 'unknown'}\``,
      `MySQL considered ${node.possibleKeys.join(', ')} but chose a full table scan (${rows.toLocaleString()} rows). The index may not be selective enough, or statistics may be stale.`,
      `Run \`ANALYZE TABLE ${node.table}\` to update statistics. If the table is small, the optimizer may correctly prefer a scan.`,
      { docLink: 'https://dev.mysql.com/doc/refman/8.4/en/where-optimization.html' },
    )
  }
  return null
}

const lowFilteredPercentage: RuleFn = (node) => {
  if (node.filtered == null) return null
  if (node.filtered > 25) return null
  if (isTempTable(node)) return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows <= 10) return null

  return issue(node, 'warning', 'scan',
    `Low filtered ratio (${node.filtered}%) on \`${node.table ?? 'unknown'}\``,
    `Only ${node.filtered}% of rows examined by this access method satisfy the WHERE condition. The remaining ${(100 - node.filtered).toFixed(0)}% are discarded.`,
    `Add a more selective index or composite index that covers the WHERE columns to reduce wasted row reads.`,
    { impact: `Reading ~${Math.round(rows / (node.filtered / 100)).toLocaleString()} rows to find ${rows.toLocaleString()} matches` },
  )
}

const highCostNode: RuleFn = (node, _root, stats) => {
  if (!node.costPercentage || node.costPercentage < 70) return null
  if (node.children.length > 0) return null // Only flag leaf-ish nodes
  if (isTempTable(node)) return null

  return issue(node, 'warning', 'general',
    `High cost node: ${node.costPercentage.toFixed(0)}% of total`,
    `This operation accounts for ${node.costPercentage.toFixed(0)}% of the total query cost. It is the primary bottleneck.`,
    `Focus optimization efforts on this node — improving its access method will have the largest impact.`,
    { impact: `${node.costPercentage.toFixed(0)}% of total cost = ${node.estimatedCost.toFixed(1)} out of ${stats.totalCost.toFixed(1)}` },
  )
}

const fullScanOnNullKey: RuleFn = (node) => {
  if (!node.extra?.some(e => /full scan on null key/i.test(e))) return null

  return issue(node, 'warning', 'subquery',
    `Full scan on NULL key`,
    `When the outer expression is NULL, MySQL falls back to a full table scan inside the subquery. This can be very slow for large inner tables.`,
    `Ensure the outer column is NOT NULL, or guard with IS NOT NULL: \`WHERE col IS NOT NULL AND col IN (SELECT ...)\`.`,
    { docLink: 'https://dev.mysql.com/doc/refman/8.4/en/subquery-optimization-with-exists.html' },
  )
}

const refOrNull: RuleFn = (node) => {
  if (node.accessType !== 'ref_or_null') return null

  return issue(node, 'warning', 'index',
    `ref_or_null access on \`${node.table ?? 'unknown'}\``,
    `MySQL uses ref_or_null because the subquery inner expression can be NULL. This adds an extra IS NULL check to every index lookup.`,
    `Declare the column as NOT NULL if possible to eliminate the NULL check overhead.`,
    { docLink: 'https://dev.mysql.com/doc/refman/8.4/en/subquery-optimization-with-exists.html' },
  )
}

const sortMergePasses: RuleFn = (node) => {
  // Detect sort operations processing very large row sets
  if (!node.extra?.some(e => /filesort/i.test(e))) return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows <= 10000) return null

  // If time is available and seems slow relative to rows
  if (node.actualTimeLast != null && node.actualTimeLast > 500) {
    return issue(node, 'warning', 'sort',
      `Potentially disk-based filesort (${rows.toLocaleString()} rows, ${node.actualTimeLast.toFixed(0)}ms)`,
      `Sorting ${rows.toLocaleString()} rows took ${node.actualTimeLast.toFixed(0)}ms — this may indicate the sort spilled to disk. Check Sort_merge_passes status variable.`,
      `Increase \`sort_buffer_size\` or add an index on the ORDER BY columns to avoid sorting entirely.`,
      { docLink: 'https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html' },
    )
  }
  return null
}

const expensiveSubqueryMaterialization: RuleFn = (node) => {
  const lower = node.operation.toLowerCase()
  if (!lower.includes('materialize') && node.selectType !== 'MATERIALIZED') return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows <= 1000) return null

  return issue(node, 'warning', 'subquery',
    `Large materialized subquery (${rows.toLocaleString()} rows)`,
    `The subquery result is materialized into a temporary table with ${rows.toLocaleString()} rows. This happens once, but large materializations consume memory and may spill to disk.`,
    `If the subquery is correlated, consider rewriting as a JOIN. If uncorrelated, materialization is generally acceptable.`,
    { docLink: 'https://dev.mysql.com/doc/refman/8.4/en/subquery-materialization.html' },
  )
}

const zeroRowJoin: RuleFn = (node) => {
  // Detect when a join lookup returns 0 rows consistently — indicates referential integrity issue
  if (node.actualRows == null) return null
  if (node.actualRows !== 0) return null
  if (!node.loops || node.loops < 2) return null
  if (isTempTable(node)) return null
  if (!node.table) return null
  // Must be inside a join (has loops > 1 and a parent join)
  const op = node.operation.toLowerCase()
  if (!op.includes('lookup') && !op.includes('scan')) return null

  return issue(node, 'critical', 'join',
    `Join to \`${node.table}\` returns 0 rows (${node.loops} lookups)`,
    `${node.loops} lookups against \`${node.table}\` all returned 0 rows. This usually means the referenced rows don't exist — a referential integrity problem. Check for orphaned foreign key values in the joining table.`,
    `Audit the data: find rows in the source table where the join column has no match in \`${node.table}\`. Add or fix the FOREIGN KEY constraint to prevent future orphans.`,
    {
      impact: `All ${node.loops} join lookups wasted — entire result set is empty due to missing referenced rows`,
      docLink: 'https://dev.mysql.com/doc/refman/8.4/en/constraint-foreign-key.html',
    },
  )
}

const highRowMismatchInJoin: RuleFn = (node) => {
  // Detect when estimated rows=1 but actual rows >> 1 inside a nested loop (exploding join)
  if (node.actualRows == null || node.estimatedRows <= 0) return null
  if (!node.loops || node.loops <= 1) return null
  if (isTempTable(node)) return null
  const ratio = node.actualRows / node.estimatedRows
  if (ratio <= 5) return null

  const totalRows = node.actualRows * node.loops
  if (totalRows <= 100) return null

  return issue(node, 'warning', 'estimate',
    `Join fan-out: estimated ${node.estimatedRows} rows but got ${node.actualRows} per loop on \`${node.table ?? node.operation}\``,
    `The optimizer expected ${node.estimatedRows} row(s) per lookup but got ${node.actualRows}. Over ${node.loops} loops, this produces ${totalRows.toLocaleString()} total rows instead of the expected ${(node.estimatedRows * node.loops).toLocaleString()}.`,
    `Run \`ANALYZE TABLE ${node.table ?? '...'}\` to update statistics. If this is a one-to-many relationship, ensure the query handles the fan-out correctly.`,
    {
      impact: `${node.actualRows}x fan-out × ${node.loops} loops = ${totalRows.toLocaleString()} total row reads`,
      docLink: 'https://dev.mysql.com/doc/refman/8.4/en/analyze-table.html',
    },
  )
}

const missingJoinIndex: RuleFn = (node) => {
  // Detect index lookup with high loops but low selectivity
  if (!node.index) return null
  if (!node.loops || node.loops <= 10) return null
  if (isTempTable(node)) return null
  if (node.accessType === 'eq_ref' || node.accessType === 'const') return null // already optimal

  const rowsPerLoop = node.actualRows ?? node.estimatedRows
  if (rowsPerLoop <= 1) return null

  const totalRows = rowsPerLoop * node.loops
  if (totalRows <= 500) return null

  return issue(node, 'warning', 'index',
    `Non-unique index lookup with high fan-out on \`${node.table ?? 'unknown'}\``,
    `Index \`${node.index}\` returns ~${rowsPerLoop} rows per lookup × ${node.loops} loops = ${totalRows.toLocaleString()} total row reads. A more selective or covering index could reduce this.`,
    `Consider a composite covering index that includes all columns needed by this query to eliminate table row fetches.`,
    {
      impact: `${totalRows.toLocaleString()} row reads from ${node.loops} loops`,
    },
  )
}

// ============================================================
// INFO RULES (3)
// ============================================================

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

const coveringIndexScan: RuleFn = (node) => {
  if (node.accessType !== 'index') return null
  if (!node.extra?.some(e => /^Using index$/i.test(e.trim()))) return null

  return issue(node, 'info', 'index',
    `Covering index scan on \`${node.table ?? 'unknown'}\``,
    `Full index scan but all required columns are in the index (covering). No table row reads needed.`,
    `Acceptable — this is an efficient full scan when all data is in the index.`,
    { docLink: 'https://dev.mysql.com/doc/refman/8.4/en/explain-output.html' },
  )
}

const indexMergeUsed: RuleFn = (node) => {
  if (node.accessType !== 'index_merge') return null

  return issue(node, 'info', 'index',
    `Index merge on \`${node.table ?? 'unknown'}\``,
    `MySQL merges multiple index scans to satisfy the query. This is better than a full table scan but less efficient than a single composite index.`,
    `Consider creating a composite index that covers the combined WHERE conditions to avoid the merge overhead.`,
    { docLink: 'https://dev.mysql.com/doc/refman/8.4/en/index-merge-optimization.html' },
  )
}

// ============================================================
// GOOD RULES (4)
// ============================================================

const usingCoveringIndex: RuleFn = (node) => {
  if (!node.extra?.some(e => /^Using index$/i.test(e.trim()))) return null
  if (node.accessType === 'index') return null // handled by coveringIndexScan

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
    { docLink: 'https://dev.mysql.com/doc/refman/8.4/en/index-condition-pushdown-optimization.html' },
  )
}

const efficientRangeScan: RuleFn = (node) => {
  if (node.accessType !== 'range') return null
  const rows = node.actualRows ?? node.estimatedRows
  if (rows > 10000) return null // large range scans are not "good"

  return issue(node, 'good', 'index',
    `Efficient range scan on \`${node.table ?? 'unknown'}\``,
    `Index range scan using \`${node.index ?? 'index'}\` — only reads rows matching the range condition.`,
    `Good — range scans efficiently skip non-matching rows via the index.`,
  )
}

// ============================================================
// MARIADB-SPECIFIC RULES
// ============================================================

const rowidFilterActive: RuleFn = (node) => {
  if (!node.rowidFilter) return null

  return issue(node, 'good', 'index',
    `Rowid filtering on \`${node.table ?? 'unknown'}\``,
    `MariaDB's rowid filtering optimization is active — using a secondary index to pre-filter row IDs before the primary lookup, reducing unnecessary reads.`,
    `Good — rowid filtering improves performance when the secondary index is selective.`,
    { docLink: 'https://mariadb.com/kb/en/rowid-filtering-optimization/' },
  )
}

const mariadbActualVsEstimate: RuleFn = (node) => {
  // Use MariaDB's r_rows vs estimated rows for mismatch detection
  if (node.rRows == null || node.estimatedRows <= 0) return null
  if (node.actualRows != null) return null // MySQL fields already handled by other rules
  if (node.rRows === 0) return null
  const ratio = node.rRows / node.estimatedRows
  if (ratio <= 10 && ratio >= 0.1) return null

  return issue(node, 'warning', 'estimate',
    `Row estimate mismatch on \`${node.table ?? node.operation}\` (MariaDB)`,
    `Estimated ${node.estimatedRows.toLocaleString()} rows, actually ${node.rRows.toLocaleString()} (r_rows). The ${ratio > 1 ? ratio.toFixed(0) + 'x under' : (1/ratio).toFixed(0) + 'x over'}-estimate may cause a suboptimal plan.`,
    `Run \`ANALYZE TABLE ${node.table ?? '...'}\` to update statistics.`,
    { docLink: 'https://mariadb.com/kb/en/analyze-table/' },
  )
}

const mariadbLowRFiltered: RuleFn = (node) => {
  if (node.rFiltered == null) return null
  if (node.filtered != null) return null // MySQL filtered already handled
  if (node.rFiltered > 50) return null
  if (isTempTable(node)) return null
  const rows = node.rRows ?? node.estimatedRows
  if (rows <= 10) return null

  return issue(node, 'warning', 'scan',
    `Low actual filter ratio (${node.rFiltered.toFixed(1)}%) on \`${node.table ?? 'unknown'}\` (MariaDB)`,
    `Only ${node.rFiltered.toFixed(1)}% of rows examined actually satisfy the WHERE condition (r_filtered). The rest are discarded after being read.`,
    `Add a more selective index or composite index to reduce wasted row reads.`,
  )
}

const mariadbFirstMatch: RuleFn = (node) => {
  if (!node.extra?.some(e => /FirstMatch/i.test(e))) return null

  return issue(node, 'good', 'join',
    `Semi-join FirstMatch on \`${node.table ?? 'unknown'}\``,
    `MariaDB's FirstMatch strategy stops scanning after the first matching row, avoiding duplicate work in semi-joins.`,
    `Good — this is an efficient semi-join execution strategy.`,
    { docLink: 'https://mariadb.com/kb/en/firstmatch-strategy/' },
  )
}

const mariadbLooseScan: RuleFn = (node) => {
  if (!node.extra?.some(e => /LooseScan/i.test(e))) return null

  return issue(node, 'good', 'join',
    `Semi-join LooseScan on \`${node.table ?? 'unknown'}\``,
    `MariaDB's LooseScan strategy uses an index to pick one row per group of duplicates, efficiently executing the semi-join.`,
    `Good — LooseScan avoids duplicate processing via index grouping.`,
    { docLink: 'https://mariadb.com/kb/en/loosescan-strategy/' },
  )
}

const mariadbDuplicateWeedout: RuleFn = (node) => {
  if (!node.extra?.some(e => /Start temporary|End temporary/i.test(e))) return null

  return issue(node, 'info', 'join',
    `DuplicateWeedout on \`${node.table ?? 'unknown'}\``,
    `MariaDB runs the semi-join as an inner join and removes duplicates via a temporary table. This is a fallback strategy — other strategies (FirstMatch, LooseScan, Materialization) are usually faster.`,
    `Consider rewriting the subquery as a JOIN with DISTINCT, or ensure the subquery column has an index for LooseScan.`,
    { docLink: 'https://mariadb.com/kb/en/duplicateweedout-strategy/' },
  )
}

const mariadbHashJoin: RuleFn = (node) => {
  if (!node.extra?.some(e => /BNLH|BKAH/i.test(e))) return null

  return issue(node, 'info', 'join',
    `Hash join on \`${node.table ?? 'unknown'}\``,
    `MariaDB is using a hash-based join strategy (BNLH/BKAH). This is generally efficient for large joins without indexes but uses memory for the hash table.`,
    `If the join is slow, adding an index on the join column may allow a more efficient nested loop join.`,
    { docLink: 'https://mariadb.com/kb/en/block-based-join-algorithms/' },
  )
}

// ============================================================
// ALL RULES (44 total)
// ============================================================

const allRules: RuleFn[] = [
  // Critical (8)
  fullTableScanLarge,
  filesortLarge,
  tempTableLarge,
  dependentSubquery,
  cartesianJoin,
  massiveRowMismatch,
  nestedLoopUnindexed,
  zeroRowJoin,
  // Warning (20)
  rowEstimateMismatch,
  noIndexUsed,
  fullIndexScan,
  highLoopCount,
  filesortSmall,
  usingJoinBuffer,
  rangeCheckEachRecord,
  tempTableSmall,
  functionOnColumn,
  indexNotUsedDespiteAvailable,
  lowFilteredPercentage,
  highCostNode,
  fullScanOnNullKey,
  refOrNull,
  sortMergePasses,
  expensiveSubqueryMaterialization,
  highRowMismatchInJoin,
  missingJoinIndex,
  // Info (3)
  smallTableScanOk,
  coveringIndexScan,
  indexMergeUsed,
  // MariaDB-specific (7)
  mariadbActualVsEstimate,
  mariadbLowRFiltered,
  mariadbDuplicateWeedout,
  mariadbHashJoin,
  // Good (7)
  usingCoveringIndex,
  optimalAccess,
  indexConditionPushdown,
  efficientRangeScan,
  rowidFilterActive,
  mariadbFirstMatch,
  mariadbLooseScan,
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
