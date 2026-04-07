import type { PlanNode, PlanStats } from '../parsers/types'
import type { IndexRecommendation } from './types'

export function generateIndexRecommendations(
  root: PlanNode,
  stats: PlanStats,
  ddl?: string,
): IndexRecommendation[] {
  const recommendations: IndexRecommendation[] = []
  const seen = new Set<string>()

  walkNodes(root, (node) => {
    // Rule 1: Full table scan with a condition -> index on condition columns
    if (node.accessType === 'ALL' && node.table) {
      if (node.table.startsWith('<')) return // skip <temporary> tables
      const rows = node.actualRows ?? node.estimatedRows
      if (rows <= 10) return // too small

      const columns = extractColumnsFromCondition(node.condition)
      if (columns.length > 0) {
        const key = `${node.table}:${columns.join(',')}`
        if (!seen.has(key)) {
          seen.add(key)
          const indexName = `idx_${node.table}_${columns.join('_')}`.slice(0, 64)
          recommendations.push({
            table: node.table,
            columns,
            reason: `Full table scan on \`${node.table}\` with filter on ${columns.map(c => `\`${c}\``).join(', ')}`,
            impact: rows > 1000 ? 'high' : rows > 100 ? 'medium' : 'low',
            ddl: `ALTER TABLE \`${node.table}\` ADD INDEX \`${indexName}\` (${columns.map(c => `\`${c}\``).join(', ')});`,
          })
        }
      }
    }

    // Rule 2: Using filesort -> index on sort columns
    if (node.extra?.some(e => /filesort/i.test(e)) && node.table) {
      // We can't always know the ORDER BY columns from the plan alone,
      // but if there's a condition we can suggest a composite index
      const condCols = extractColumnsFromCondition(node.condition)
      if (condCols.length > 0) {
        const key = `sort:${node.table}:${condCols.join(',')}`
        if (!seen.has(key)) {
          seen.add(key)
          recommendations.push({
            table: node.table,
            columns: condCols,
            reason: `Filesort detected — consider a composite index matching WHERE + ORDER BY columns`,
            impact: 'medium',
            ddl: `-- Add index covering WHERE + ORDER BY columns:\nALTER TABLE \`${node.table}\` ADD INDEX \`idx_${node.table}_sort\` (${condCols.map(c => `\`${c}\``).join(', ')} /*, add ORDER BY columns here */);`,
          })
        }
      }
    }

    // Rule 3: Join buffer used -> index on join column
    if (node.extra?.some(e => /join buffer/i.test(e)) && node.table) {
      const joinCols = extractColumnsFromCondition(node.condition)
      if (joinCols.length > 0) {
        const key = `join:${node.table}:${joinCols.join(',')}`
        if (!seen.has(key)) {
          seen.add(key)
          const indexName = `idx_${node.table}_${joinCols.join('_')}`.slice(0, 64)
          recommendations.push({
            table: node.table,
            columns: joinCols,
            reason: `Join buffer used — adding an index will enable Nested Loop Join instead`,
            impact: 'high',
            ddl: `ALTER TABLE \`${node.table}\` ADD INDEX \`${indexName}\` (${joinCols.map(c => `\`${c}\``).join(', ')});`,
          })
        }
      }
    }

    // Rule 4: Possible keys exist but none used
    if (node.accessType === 'ALL' && node.possibleKeys && node.possibleKeys.length > 0 && !node.index && node.table) {
      const key = `unused:${node.table}`
      if (!seen.has(key)) {
        seen.add(key)
        recommendations.push({
          table: node.table,
          columns: [],
          reason: `MySQL considered indexes [${node.possibleKeys.join(', ')}] but chose none — the indexes may not be selective enough or the query may need rewriting`,
          impact: 'medium',
          ddl: `-- Run to check index stats:\nANALYZE TABLE \`${node.table}\`;\n-- Consider: is the WHERE selective enough?`,
        })
      }
    }
  })

  // Check against DDL if provided
  if (ddl) {
    markExistingIndexes(recommendations, ddl)
  }

  return recommendations
}

function extractColumnsFromCondition(condition?: string): string[] {
  if (!condition) return []

  const columns: string[] = []
  // Match patterns like: table.column, `column`, or bare column names in conditions
  // e.g., "e.department_id = 10" -> ["department_id"]
  // e.g., "`orders`.`customer_id` = `customers`.`id`" -> ["customer_id"]
  const regex = /(?:`?(\w+)`?\.)?`?(\w+)`?\s*(?:=|<|>|<=|>=|<>|!=|LIKE|IN|BETWEEN|IS)/gi
  let match
  while ((match = regex.exec(condition)) !== null) {
    const col = match[2]
    // Skip common non-column words
    if (!['NULL', 'TRUE', 'FALSE', 'AND', 'OR', 'NOT'].includes(col.toUpperCase())) {
      if (!columns.includes(col)) {
        columns.push(col)
      }
    }
  }

  return columns
}

function markExistingIndexes(recommendations: IndexRecommendation[], ddl: string): void {
  // Simple check: see if the recommended columns appear in existing KEY/INDEX definitions
  for (const rec of recommendations) {
    const tableSection = extractTableDDL(ddl, rec.table)
    if (!tableSection) continue

    for (const col of rec.columns) {
      const indexRegex = new RegExp(`(?:KEY|INDEX)\\s+\\S+\\s*\\([^)]*\\b${col}\\b[^)]*\\)`, 'i')
      if (indexRegex.test(tableSection)) {
        rec.ddl = `-- NOTE: An index containing \`${col}\` may already exist on \`${rec.table}\`.\n-- Run: SHOW INDEX FROM \`${rec.table}\`;\n${rec.ddl}`
        rec.reason += ' (index may already exist — check selectivity)'
      }
    }
  }
}

function extractTableDDL(ddl: string, table: string): string | null {
  const regex = new RegExp(`CREATE\\s+TABLE\\s+\`?${table}\`?\\s*\\([\\s\\S]*?\\)\\s*(?:ENGINE|;)`, 'i')
  const match = ddl.match(regex)
  return match ? match[0] : null
}

function walkNodes(node: PlanNode, fn: (node: PlanNode) => void) {
  fn(node)
  for (const child of node.children) {
    walkNodes(child, fn)
  }
}
