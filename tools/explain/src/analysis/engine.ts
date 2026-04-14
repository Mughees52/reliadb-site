import type { PlanNode, PlanStats } from '../parsers/types'
import type { AnalysisResult, AnalysisContext, Issue, IndexRecommendation, QueryHint, SchemaIssue } from './types'
import { runRules } from './rules'
import { generateIndexRecommendations } from './index-advisor'
import { analyzeQuery } from './query-hints'
import { generateRewrites } from './query-rewriter'
import { simulateIndexImpact } from './index-impact'
import { generateNarrative } from './narrative'
import { parseDDL, getForeignKeysWithoutIndex, getRedundantIndexes, isColumnNullable, type ParsedTable } from '../parsers/ddl-parser'

export function analyze(
  root: PlanNode,
  stats: PlanStats,
  query?: string,
  ddl?: string,
): AnalysisResult {
  const context: AnalysisContext = { root, query, ddl }

  // Parse DDL if provided
  let tables: ParsedTable[] = []
  if (ddl) {
    try { tables = parseDDL(ddl) } catch { /* ignore parse errors */ }
  }

  // Run all detection rules against every node
  const issues: Issue[] = []
  walkNodes(root, (node) => {
    const nodeIssues = runRules(node, root, stats)
    issues.push(...nodeIssues)
  })

  // DDL-aware issues — only for tables actually referenced in this plan
  const planTables = new Set<string>()
  walkNodes(root, (n) => {
    if (n.table && !n.table.startsWith('<')) {
      planTables.add(n.table.toLowerCase())
      if (query) {
        const resolved = resolveAlias(query, n.table)
        planTables.add(resolved.toLowerCase())
      }
    }
  })

  if (tables.length > 0) {
    for (const table of tables) {
      if (!planTables.has(table.name.toLowerCase())) continue

      const fksWithoutIndex = getForeignKeysWithoutIndex(table)
      for (const fk of fksWithoutIndex) {
        issues.push({
          id: `ddl-fk-${table.name}-${fk.columns.join(',')}`,
          severity: 'warning',
          category: 'index',
          title: `Foreign key without index on \`${table.name}\``,
          description: `Column(s) ${fk.columns.map(c => `\`${c}\``).join(', ')} have a FOREIGN KEY to \`${fk.refTable}\` but no index. JOINs on this FK will require full table scans.`,
          nodeId: '',
          nodeName: table.name,
          recommendation: `Add an index: ALTER TABLE \`${table.name}\` ADD INDEX \`idx_${fk.columns.join('_')}\` (${fk.columns.map(c => `\`${c}\``).join(', ')});`,
          ddl: `ALTER TABLE \`${table.name}\` ADD INDEX \`idx_${fk.columns.join('_')}\` (${fk.columns.map(c => `\`${c}\``).join(', ')});`,
          docLink: 'https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html',
        })
      }

      const redundant = getRedundantIndexes(table)
      for (const { redundant: idx, coveredBy } of redundant) {
        issues.push({
          id: `ddl-redundant-${table.name}-${idx.name}`,
          severity: 'info',
          category: 'index',
          title: `Redundant index \`${idx.name}\` on \`${table.name}\``,
          description: `Index \`${idx.name}\` (${idx.columns.join(', ')}) is a prefix of \`${coveredBy.name}\` (${coveredBy.columns.join(', ')}). The longer index already covers all lookups the shorter one would serve.`,
          nodeId: '',
          nodeName: table.name,
          recommendation: `Consider dropping: ALTER TABLE \`${table.name}\` DROP INDEX \`${idx.name}\`;`,
          ddl: `ALTER TABLE \`${table.name}\` DROP INDEX \`${idx.name}\`;`,
        })
      }
    }
  }

  // Sort issues by severity
  const severityOrder = { critical: 0, warning: 1, info: 2, good: 3 }
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // Generate index recommendations + deduplicate overlapping indexes
  const rawRecs = generateIndexRecommendations(root, stats, ddl, query)
  const indexRecommendations = deduplicateIndexes(rawRecs)

  // Simulate structural impact of each recommended index
  const impacts = simulateIndexImpact(root, stats, indexRecommendations, query)
  for (const impact of impacts) {
    const rec = indexRecommendations.find(r => r.table === impact.recommendation.table && r.columns.join(',') === impact.recommendation.columns.join(','))
    if (rec) rec.simulatedImpact = impact
  }

  // Analyze query patterns
  const queryHints = query ? analyzeQuery(query) : []

  // Generate query rewrites
  const queryRewrites = query ? generateRewrites(query) : []

  // NOT NULL suggestions from DDL cross-referencing
  const schemaIssues = generateSchemaIssues(root, tables, query)

  // Calculate summary
  const critical = issues.filter(i => i.severity === 'critical').length
  const warnings = issues.filter(i => i.severity === 'warning').length
  const info = issues.filter(i => i.severity === 'info').length
  const good = issues.filter(i => i.severity === 'good').length

  let score = 100
  for (const iss of issues) {
    const isDDL = !iss.nodeId
    switch (iss.severity) {
      case 'critical': score -= isDDL ? 8 : 18; break
      case 'warning':  score -= isDDL ? 2 : 5; break
      case 'info':     score -= 1; break
      case 'good':     score += 2; break
    }
  }
  score = Math.max(0, Math.min(100, Math.round(score)))

  const partialResult = {
    issues,
    indexRecommendations,
    queryHints,
    queryRewrites,
    schemaIssues,
    summary: { critical, warnings, info, good, score },
  }

  // Generate AI-quality narrative analysis
  const narrative = generateNarrative(
    partialResult as any,
    root,
    stats,
  )

  return {
    ...partialResult,
    narrative,
  }
}

/**
 * Deduplicate overlapping index recommendations.
 * If (product_id) and (product_id, quantity) are both suggested,
 * keep only the wider (product_id, quantity).
 */
function deduplicateIndexes(recs: IndexRecommendation[]): IndexRecommendation[] {
  const byTable = new Map<string, IndexRecommendation[]>()
  for (const rec of recs) {
    const key = rec.table.toLowerCase()
    if (!byTable.has(key)) byTable.set(key, [])
    byTable.get(key)!.push(rec)
  }

  const result: IndexRecommendation[] = []

  for (const [_table, tableRecs] of byTable) {
    // Sort by column count descending (wider indexes first)
    tableRecs.sort((a, b) => b.columns.length - a.columns.length)

    const kept: IndexRecommendation[] = []
    for (const rec of tableRecs) {
      if (rec.columns.length === 0) {
        kept.push(rec) // non-index recs (ANALYZE TABLE, etc.)
        continue
      }

      // Check if this rec is a prefix of an already-kept wider rec
      const isSubset = kept.some(wider => {
        if (wider.columns.length <= rec.columns.length) return false
        return rec.columns.every((col, i) =>
          wider.columns[i]?.toLowerCase() === col.toLowerCase()
        )
      })

      if (!isSubset) {
        kept.push(rec)
      }
    }

    result.push(...kept)
  }

  // Sort: high impact first, then medium, then low
  const impactOrder = { high: 0, medium: 1, low: 2 }
  result.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact])

  return result
}

/**
 * Generate NOT NULL constraint suggestions.
 * Flags nullable columns that are used in WHERE/JOIN/GROUP BY conditions.
 */
function generateSchemaIssues(root: PlanNode, tables: ParsedTable[], query?: string): SchemaIssue[] {
  const issues: SchemaIssue[] = []
  if (tables.length === 0) return issues

  // Collect all column references from the plan conditions and query
  const usedCols = new Set<string>() // "table.column"

  walkNodes(root, (node) => {
    if (!node.condition) return
    const tableName = node.table ?? ''
    // Extract column names from conditions
    const colRegex = /(?:(\w+)\.)?(\w+)\s*(?:=|<|>|!=|<>|IS\b)/gi
    let m
    while ((m = colRegex.exec(node.condition)) !== null) {
      const t = m[1] || tableName
      const c = m[2]
      if (t && c && !['NULL', 'TRUE', 'FALSE', 'NOT'].includes(c.toUpperCase())) {
        const resolved = query ? resolveAlias(query, t) : t
        usedCols.add(`${resolved.toLowerCase()}.${c.toLowerCase()}`)
      }
    }
  })

  // Also extract from query WHERE/JOIN/GROUP BY
  if (query) {
    const colRegex = /(\w+)\.(\w+)/g
    let m
    while ((m = colRegex.exec(query)) !== null) {
      const resolved = resolveAlias(query, m[1])
      usedCols.add(`${resolved.toLowerCase()}.${m[2].toLowerCase()}`)
    }
  }

  // Check each used column against DDL for nullable
  const seen = new Set<string>()
  for (const ref of usedCols) {
    const [tableName, colName] = ref.split('.')
    if (!tableName || !colName) continue

    const table = tables.find(t => t.name.toLowerCase() === tableName)
    if (!table) continue

    const col = table.columns.find(c => c.name.toLowerCase() === colName)
    if (!col || !col.nullable) continue
    if (col.autoIncrement) continue // auto-increment is fine nullable

    // Skip columns that are PKs or have defaults
    const isPK = table.indexes.some(idx => idx.primary && idx.columns.some(c => c.toLowerCase() === colName))
    if (isPK) continue

    const key = `${tableName}.${colName}`
    if (seen.has(key)) continue
    seen.add(key)

    // Determine if this column should logically be NOT NULL
    const isFK = table.foreignKeys.some(fk => fk.columns.some(c => c.toLowerCase() === colName))
    const isInWhere = query ? new RegExp(`\\b${colName}\\s*(?:=|>|<|!=|BETWEEN|LIKE|IN)`, 'i').test(query) : false
    const isInJoin = query ? new RegExp(`\\bON\\b[^\\n]*\\b${colName}\\b`, 'i').test(query) : false
    const isInGroupBy = query ? new RegExp(`\\bGROUP\\s+BY\\b[^\\n]*\\b${colName}\\b`, 'i').test(query) : false

    if (isFK || isInWhere || isInJoin || isInGroupBy) {
      const reasons: string[] = []
      if (isFK) reasons.push('foreign key')
      if (isInWhere) reasons.push('WHERE filter')
      if (isInJoin) reasons.push('JOIN condition')
      if (isInGroupBy) reasons.push('GROUP BY')

      issues.push({
        table: table.name,
        column: col.name,
        issue: `\`${table.name}\`.\`${col.name}\` is nullable but used in ${reasons.join(', ')}. NULL values can cause unexpected results (e.g., NOT IN with NULLs returns no rows).`,
        ddl: `ALTER TABLE \`${table.name}\` MODIFY \`${col.name}\` ${col.type} NOT NULL;`,
      })
    }
  }

  return issues
}

function walkNodes(node: PlanNode, fn: (node: PlanNode) => void) {
  fn(node)
  for (const child of node.children) {
    walkNodes(child, fn)
  }
}

function resolveAlias(query: string, alias: string): string {
  const regex = new RegExp(`\\b(?:FROM|JOIN)\\s+\`?(\\w+)\`?\\s+(?:AS\\s+)?${alias}\\b`, 'i')
  const match = query.match(regex)
  return match ? match[1] : alias
}
