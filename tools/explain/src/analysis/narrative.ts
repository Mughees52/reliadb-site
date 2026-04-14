import type { PlanNode, PlanStats } from '../parsers/types'
import type { Issue, IndexRecommendation, AnalysisResult } from './types'

// ============================================================
// AI-quality narrative analysis — no API, pure TypeScript
// ============================================================

export interface PlanNarrative {
  /** Plain English step-by-step explanation of what MySQL does */
  walkthrough: string[]
  /** Root cause chain: what's really causing the slowness */
  rootCauses: RootCause[]
  /** Prioritized action plan: what to fix and in what order */
  actionPlan: ActionStep[]
  /** One-line verdict */
  verdict: string
}

export interface RootCause {
  title: string
  explanation: string
  /** Node IDs involved in this causal chain */
  nodeIds: string[]
}

export interface ActionStep {
  priority: number
  action: string
  reason: string
  estimatedImpact: string
  ddl?: string
}

// ── Operation descriptions for plain English ──

const operationDescriptions: Record<string, string> = {
  'table scan': 'reads every row in the table',
  'index scan': 'walks through the entire index',
  'index lookup': 'looks up rows using an index',
  'unique index lookup': 'fetches exactly one row via a unique index',
  'range scan': 'scans a portion of the index matching a range condition',
  'nested loop': 'for each row from the first table, looks up matching rows in the next table',
  'hash join': 'builds a hash table from one input and probes it with the other',
  'sort': 'sorts the result set',
  'filesort': 'sorts rows in memory (or on disk if too large)',
  'aggregate': 'computes aggregate values (COUNT, SUM, etc.)',
  'group': 'groups rows by the specified columns',
  'filter': 'discards rows that don\'t match the condition',
  'materialize': 'stores the subquery result in a temporary table',
  'temporary table': 'creates a temporary table to process intermediate results',
  'union': 'combines results from multiple queries',
  'limit': 'returns only the first N rows',
  'stream': 'streams rows through without buffering',
  'window': 'computes window function values across partitions',
}

function describeAccess(node: PlanNode): string {
  const table = node.table ? `\`${node.table}\`` : 'a derived table'
  const rows = node.actualRows ?? node.estimatedRows
  const rowStr = rows.toLocaleString()

  switch (node.accessType) {
    case 'ALL':
      return node.table?.startsWith('<')
        ? `scans a temporary table (${rowStr} rows)`
        : `performs a full table scan on ${table}, reading all ${rowStr} rows`
    case 'index':
      return `walks the entire index on ${table} (${rowStr} entries)`
    case 'range':
      return `uses index \`${node.index}\` to range-scan ${rowStr} rows from ${table}`
    case 'ref':
      return `uses index \`${node.index}\` to look up ~${rowStr} matching rows in ${table}`
    case 'eq_ref':
      return `fetches exactly one row from ${table} via unique index \`${node.index}\``
    case 'const':
    case 'system':
      return `reads a single constant row from ${table}`
    case 'ref_or_null':
      return `looks up rows in ${table} via index \`${node.index}\`, including NULL values`
    case 'index_merge':
      return `merges multiple index scans on ${table} to find ${rowStr} rows`
    case 'fulltext':
      return `uses a FULLTEXT index on ${table}`
    default:
      return `accesses ${table} (${rowStr} rows)`
  }
}

function describeOperation(node: PlanNode): string {
  const op = node.operation.toLowerCase()
  const rows = node.actualRows ?? node.estimatedRows

  if (op.includes('nested loop')) {
    return `joins the results using a nested loop`
  }
  if (op.includes('hash join')) {
    return `joins the results using a hash join (${rows.toLocaleString()} rows)`
  }
  if (op.includes('sort') || op.includes('filesort')) {
    return `sorts ${rows.toLocaleString()} rows`
  }
  if (op.includes('aggregate')) {
    return `computes aggregate values`
  }
  if (op.includes('group')) {
    return `groups rows`
  }
  if (op.includes('filter')) {
    const cond = node.condition ? ` where ${node.condition.slice(0, 60)}${node.condition.length > 60 ? '...' : ''}` : ''
    return `filters rows${cond}`
  }
  if (op.includes('materialize')) {
    return `materializes subquery result into a temporary table (${rows.toLocaleString()} rows)`
  }
  if (op.includes('temporary')) {
    return `creates a temporary table (${rows.toLocaleString()} rows)`
  }
  if (op.includes('union')) {
    return `combines results from multiple branches`
  }
  if (op.includes('limit')) {
    return `limits output to ${rows} rows`
  }
  if (op.includes('window')) {
    return `computes window function values`
  }
  if (op.includes('stream')) {
    return `streams rows through`
  }

  // Fall back to access type description if it's a table access node
  if (node.accessType && node.table) {
    return describeAccess(node)
  }

  return `performs ${node.operation} (${rows.toLocaleString()} rows)`
}

// ── Plan walkthrough generator ──

function generateWalkthrough(root: PlanNode): string[] {
  const steps: string[] = []
  let stepNum = 1

  function walk(node: PlanNode, depth: number) {
    // Process children first (bottom-up execution)
    for (const child of node.children) {
      walk(child, depth + 1)
    }

    // Skip very generic wrapper nodes
    const op = node.operation.toLowerCase()
    if (op === 'query block' || op === 'result' || op === 'rows fetched before execution') {
      return
    }

    const desc = describeOperation(node)
    const timeStr = node.actualTimeLast != null ? ` (${node.actualTimeLast.toFixed(1)}ms)` : ''
    const loopStr = node.loops && node.loops > 1 ? ` — repeated ${node.loops.toLocaleString()} times` : ''

    steps.push(`${stepNum}. MySQL ${desc}${timeStr}${loopStr}`)
    stepNum++
  }

  walk(root, 0)
  return steps
}

// ── Root cause analysis ──

interface NodeMetrics {
  node: PlanNode
  totalRows: number  // actualRows * loops
  exclusiveTime: number
  isBottleneck: boolean
}

function findBottleneckChain(root: PlanNode, issues: Issue[]): RootCause[] {
  const causes: RootCause[] = []

  // Collect all nodes with metrics
  const metrics: NodeMetrics[] = []
  walkNodes(root, (node) => {
    const rows = node.actualRows ?? node.estimatedRows
    const loops = node.loops ?? 1
    metrics.push({
      node,
      totalRows: rows * loops,
      exclusiveTime: node.exclusiveTime ?? 0,
      isBottleneck: (node.timePercentage ?? 0) > 15 || (node.costPercentage ?? 0) > 40,
    })
  })

  // Sort by impact (time first, then total rows)
  metrics.sort((a, b) => b.exclusiveTime - a.exclusiveTime || b.totalRows - a.totalRows)

  // Pattern 1: Full scan feeding into a sort
  const fullScans = metrics.filter(m =>
    m.node.accessType === 'ALL' && !m.node.table?.startsWith('<') && m.totalRows > 100
  )
  for (const scan of fullScans) {
    // Check if a parent/sibling has a filesort or temp table
    const sortNode = findAncestorWith(scan.node, n =>
      n.extra?.some(e => /filesort/i.test(e)) === true
    )
    if (sortNode) {
      causes.push({
        title: `Full table scan on \`${scan.node.table}\` forces expensive sort`,
        explanation: `MySQL scans all ${scan.totalRows.toLocaleString()} rows from \`${scan.node.table}\` because no index narrows the result. This large intermediate result then requires a filesort. Adding an index on the filter/join columns would reduce both the scan and the sort.`,
        nodeIds: [scan.node.id, sortNode.id],
      })
    }
  }

  // Pattern 2: Join fan-out causing row explosion
  const fanOuts = metrics.filter(m => {
    const n = m.node
    return n.loops != null && n.loops > 1 &&
           n.actualRows != null && n.estimatedRows > 0 &&
           n.actualRows / n.estimatedRows > 5 &&
           m.totalRows > 500
  })
  for (const fo of fanOuts) {
    const n = fo.node
    const ratio = n.actualRows! / n.estimatedRows
    causes.push({
      title: `Join fan-out: \`${n.table ?? n.operation}\` returns ${ratio.toFixed(0)}x more rows than expected`,
      explanation: `The optimizer expected ${n.estimatedRows} row(s) per lookup but got ${n.actualRows}. Over ${n.loops} loops this produces ${fo.totalRows.toLocaleString()} rows instead of ${(n.estimatedRows * (n.loops ?? 1)).toLocaleString()}. This row explosion cascades through all downstream operations (sorts, aggregations, temp tables). Run ANALYZE TABLE to update statistics.`,
      nodeIds: [n.id],
    })
  }

  // Pattern 3: Dependent subquery
  const depSub = issues.filter(i => i.category === 'subquery' && i.severity === 'critical')
  for (const issue of depSub) {
    const subNode = findNodeById(root, issue.nodeId)
    if (subNode) {
      const parentRows = subNode.parent ?
        (subNode.parent.actualRows ?? subNode.parent.estimatedRows) : 0
      causes.push({
        title: `Dependent subquery re-executes for every outer row`,
        explanation: `The subquery runs once per row from the outer query (~${parentRows.toLocaleString()} times). This creates O(n*m) complexity. Rewriting as a JOIN executes the inner query once and joins the results, reducing to O(n+m).`,
        nodeIds: [issue.nodeId],
      })
    }
  }

  // Pattern 4: Missing index on join column
  const joinScans = metrics.filter(m => {
    const n = m.node
    return n.accessType === 'ALL' && !n.table?.startsWith('<') &&
           n.loops != null && n.loops > 1 && m.totalRows > 100
  })
  for (const js of joinScans) {
    if (fullScans.some(fs => fs.node.id === js.node.id)) continue // already reported
    causes.push({
      title: `Missing join index on \`${js.node.table}\``,
      explanation: `For each of the ${js.node.loops} rows from the driving table, MySQL scans all ${(js.node.actualRows ?? js.node.estimatedRows).toLocaleString()} rows of \`${js.node.table}\`. Adding an index on the join column would replace this full scan with an index lookup, reducing from ${js.totalRows.toLocaleString()} total row reads to ~${js.node.loops} lookups.`,
      nodeIds: [js.node.id],
    })
  }

  // Pattern 5: Large temp table from GROUP BY without index
  const tempNodes = metrics.filter(m =>
    m.node.extra?.some(e => /temporary/i.test(e)) && m.totalRows > 500
  )
  for (const tn of tempNodes) {
    const hasGroupBy = tn.node.extra?.some(e => /group/i.test(e))
    if (hasGroupBy) {
      causes.push({
        title: `GROUP BY creates temporary table with ${tn.totalRows.toLocaleString()} rows`,
        explanation: `MySQL creates a temporary table to process the GROUP BY because no index matches the grouping columns. For large result sets this may spill to disk. An index on the GROUP BY columns (in order) would allow MySQL to stream groups without buffering.`,
        nodeIds: [tn.node.id],
      })
    }
  }

  // Deduplicate by nodeId
  const seen = new Set<string>()
  return causes.filter(c => {
    const key = c.nodeIds.sort().join(',')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Prioritized action plan ──

function generateActionPlan(
  issues: Issue[],
  indexRecs: IndexRecommendation[],
  rootCauses: RootCause[],
  root: PlanNode,
  stats: PlanStats,
): ActionStep[] {
  const steps: ActionStep[] = []
  let priority = 1

  // 1. Index recommendations (highest impact first — they already come sorted)
  for (const rec of indexRecs) {
    if (rec.impact !== 'high' && priority > 3) continue // only top recs

    const impactDesc = rec.simulatedImpact
      ? rec.simulatedImpact.summary
      : `Improves access on \`${rec.table}\``

    steps.push({
      priority: priority++,
      action: `Add index on \`${rec.table}\` (${rec.columns.map(c => `\`${c}\``).join(', ')})`,
      reason: rec.reason,
      estimatedImpact: impactDesc,
      ddl: rec.ddl,
    })
  }

  // 2. Critical issues that aren't covered by index recs
  const criticalIssues = issues.filter(i =>
    i.severity === 'critical' &&
    !steps.some(s => i.nodeName && s.action.includes(i.nodeName))
  )
  for (const issue of criticalIssues) {
    if (issue.category === 'subquery') {
      steps.push({
        priority: priority++,
        action: `Rewrite dependent subquery as a JOIN`,
        reason: issue.description,
        estimatedImpact: 'Eliminates O(n*m) re-execution — often 10-100x faster',
      })
    } else if (issue.category === 'estimate') {
      steps.push({
        priority: priority++,
        action: `Run ANALYZE TABLE on affected tables`,
        reason: issue.description,
        estimatedImpact: 'Updated statistics help the optimizer choose better plans',
        ddl: issue.ddl,
      })
    } else if (issue.category === 'join' && issue.title.includes('Cartesian')) {
      steps.push({
        priority: priority++,
        action: `Add missing JOIN condition`,
        reason: issue.description,
        estimatedImpact: 'Eliminates cross product — row count drops dramatically',
      })
    } else if (issue.category === 'scan' && issue.title.includes('Full table scan')) {
      // Extract table name from title: "Full table scan on `tablename`"
      const tableMatch = issue.title.match(/`([^`]+)`/)
      const tableName = tableMatch ? tableMatch[1] : issue.nodeName
      steps.push({
        priority: priority++,
        action: `Add an index on \`${tableName}\` for the WHERE/JOIN columns`,
        reason: issue.description,
        estimatedImpact: 'Converts full table scan to index lookup — typically 90-99% fewer rows read',
      })
    } else if (issue.category === 'sort' && issue.title.includes('Filesort')) {
      steps.push({
        priority: priority++,
        action: `Add an index matching the ORDER BY columns`,
        reason: issue.description,
        estimatedImpact: 'Eliminates filesort — rows returned in index order',
      })
    }
  }

  // 3. ANALYZE TABLE if there are estimation mismatches
  const estimateIssues = issues.filter(i => i.category === 'estimate' && i.severity !== 'good')
  if (estimateIssues.length > 0 && !steps.some(s => s.action.includes('ANALYZE TABLE'))) {
    const tables = new Set(estimateIssues.map(i => i.nodeName).filter(Boolean))
    steps.push({
      priority: priority++,
      action: `Run ANALYZE TABLE to update statistics`,
      reason: `${estimateIssues.length} estimation mismatches detected. Stale statistics cause the optimizer to choose wrong plans.`,
      estimatedImpact: 'Better estimates → better plan choices',
      ddl: [...tables].map(t => `ANALYZE TABLE \`${t}\`;`).join('\n'),
    })
  }

  return steps
}

// ── Verdict ──

function generateVerdict(result: AnalysisResult, root: PlanNode, rootCauses: RootCause[]): string {
  const s = result.summary
  const totalTime = root.actualTimeLast

  if (s.critical === 0 && s.warnings === 0) {
    if (s.good > 0) {
      return `This query plan looks good. ${s.good} optimization${s.good > 1 ? 's' : ''} active (covering indexes, efficient access types). No issues detected.`
    }
    return `This query plan looks clean. No performance issues detected.`
  }

  if (s.critical >= 3) {
    const mainCause = rootCauses[0]?.title ?? 'multiple critical bottlenecks'
    return `This query has serious performance problems. The main issue is: ${mainCause}. ${s.critical} critical and ${s.warnings} warning issues found.`
  }

  if (s.critical >= 1) {
    const timeStr = totalTime != null ? ` (${totalTime.toFixed(1)}ms)` : ''
    return `This query has ${s.critical} critical issue${s.critical > 1 ? 's' : ''} that should be fixed${timeStr}. Score: ${s.score}/100.`
  }

  return `This query has ${s.warnings} warning${s.warnings > 1 ? 's' : ''} worth investigating. Score: ${s.score}/100.`
}

// ── Main entry point ──

export function generateNarrative(
  result: AnalysisResult,
  root: PlanNode,
  stats: PlanStats,
): PlanNarrative {
  const walkthrough = generateWalkthrough(root)
  const rootCauses = findBottleneckChain(root, result.issues)
  const actionPlan = generateActionPlan(result.issues, result.indexRecommendations, rootCauses, root, stats)
  const verdict = generateVerdict(result, root, rootCauses)

  return { walkthrough, rootCauses, actionPlan, verdict }
}

// ── Helpers ──

function walkNodes(node: PlanNode, fn: (node: PlanNode) => void) {
  fn(node)
  for (const child of node.children) walkNodes(child, fn)
}

function findAncestorWith(node: PlanNode, predicate: (n: PlanNode) => boolean): PlanNode | null {
  let current = node.parent
  while (current) {
    if (predicate(current)) return current
    current = current.parent
  }
  return null
}

function findNodeById(root: PlanNode, id: string): PlanNode | null {
  if (root.id === id) return root
  for (const child of root.children) {
    const found = findNodeById(child, id)
    if (found) return found
  }
  return null
}
