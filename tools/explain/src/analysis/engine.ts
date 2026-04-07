import type { PlanNode, PlanStats } from '../parsers/types'
import type { AnalysisResult, AnalysisContext, Issue, IndexRecommendation, QueryHint } from './types'
import { runRules } from './rules'
import { generateIndexRecommendations } from './index-advisor'
import { analyzeQuery } from './query-hints'
import { parseDDL, getForeignKeysWithoutIndex, getRedundantIndexes, type ParsedTable } from '../parsers/ddl-parser'

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
      // Also resolve alias to real name if query provided
      if (query) {
        const resolved = resolveAlias(query, n.table)
        planTables.add(resolved.toLowerCase())
      }
    }
  })

  if (tables.length > 0) {
    for (const table of tables) {
      // Only check tables used in this plan
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

      // Check for redundant indexes (only for plan tables)
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

  // Sort: critical first, then warning, then info, then good
  const severityOrder = { critical: 0, warning: 1, info: 2, good: 3 }
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // Generate index recommendations
  const indexRecommendations = generateIndexRecommendations(root, stats, ddl, query)

  // Analyze query patterns
  const queryHints = query ? analyzeQuery(query) : []

  // Calculate summary
  const critical = issues.filter(i => i.severity === 'critical').length
  const warnings = issues.filter(i => i.severity === 'warning').length
  const info = issues.filter(i => i.severity === 'info').length
  const good = issues.filter(i => i.severity === 'good').length

  // Score: 100 = perfect, with weighted penalties
  // Plan-specific issues (detected from EXPLAIN nodes) get full weight
  // DDL/schema-level issues (nodeId is empty) get reduced weight
  // Good findings provide a small bonus to avoid over-penalizing
  let score = 100

  for (const iss of issues) {
    const isDDL = !iss.nodeId // DDL-level issues have no nodeId
    switch (iss.severity) {
      case 'critical': score -= isDDL ? 8 : 18; break
      case 'warning':  score -= isDDL ? 2 : 5; break
      case 'info':     score -= 1; break
      case 'good':     score += 2; break
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  return {
    issues,
    indexRecommendations,
    queryHints,
    summary: { critical, warnings, info, good, score },
  }
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
