import type { PlanNode, PlanStats } from '../parsers/types'
import type { AnalysisResult, AnalysisContext, Issue, IndexRecommendation, QueryHint } from './types'
import { runRules } from './rules'
import { generateIndexRecommendations } from './index-advisor'
import { analyzeQuery } from './query-hints'

export function analyze(
  root: PlanNode,
  stats: PlanStats,
  query?: string,
  ddl?: string,
): AnalysisResult {
  const context: AnalysisContext = { root, query, ddl }

  // Run all detection rules against every node
  const issues: Issue[] = []
  walkNodes(root, (node) => {
    const nodeIssues = runRules(node, root, stats)
    issues.push(...nodeIssues)
  })

  // Sort: critical first, then warning, then info, then good
  const severityOrder = { critical: 0, warning: 1, info: 2, good: 3 }
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // Generate index recommendations
  const indexRecommendations = generateIndexRecommendations(root, stats, ddl)

  // Analyze query patterns
  const queryHints = query ? analyzeQuery(query) : []

  // Calculate summary
  const critical = issues.filter(i => i.severity === 'critical').length
  const warnings = issues.filter(i => i.severity === 'warning').length
  const info = issues.filter(i => i.severity === 'info').length
  const good = issues.filter(i => i.severity === 'good').length

  // Score: 100 = perfect, minus points for issues
  let score = 100
  score -= critical * 20
  score -= warnings * 8
  score -= info * 2
  score = Math.max(0, Math.min(100, score))

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
