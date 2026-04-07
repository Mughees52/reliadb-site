import type { PlanNode, PlanStats } from '../parsers/types'
import type { IndexRecommendation } from './types'
import { parseDDL, findTable, findIndexWithPrefix, type ParsedTable } from '../parsers/ddl-parser'
import { formatNumber } from '../utils/formatting'

export function generateIndexRecommendations(
  root: PlanNode,
  stats: PlanStats,
  ddl?: string,
  query?: string,
): IndexRecommendation[] {
  const recommendations: IndexRecommendation[] = []
  const seen = new Set<string>()

  let tables: ParsedTable[] = []
  if (ddl) {
    try { tables = parseDDL(ddl) } catch { /* ignore */ }
  }

  walkNodes(root, (node) => {
    // Resolve table alias to real name for DDL generation
    const resolvedTable = (node.table && query) ? resolveTableAlias(query, node.table) : node.table

    // Rule 1: Full table scan with a condition -> index on condition columns
    // Also check parent Filter node for conditions (tree format puts filter on parent)
    if (node.accessType === 'ALL' && node.table && !node.table.startsWith('<')) {
      const rows = node.actualRows ?? node.estimatedRows
      if (rows <= 10) return
      const tableName = resolvedTable ?? node.table

      const filterCondition = node.parent?.condition ?? node.condition
      const columns = extractColumnsFromCondition(filterCondition)
      if (columns.length > 0) {
        addRecommendation(recommendations, seen, tables, {
          table: tableName,
          columns,
          reason: `Full table scan on \`${node.table}\` (${formatNumber(rows)} rows) with filter on ${columns.map(c => `\`${c}\``).join(', ')}`,
          impact: rows > 1000 ? 'high' : rows > 100 ? 'medium' : 'low',
        })

        // Suggest covering index if we can identify aggregate/select columns from query
        // The covering index should be: [filter cols, join cols, aggregate cols]
        if (query && rows > 500) {
          const resolved = resolveTableAlias(query, node.table)
          const tableColRegex = new RegExp(`\\b${node.table}\\.(\\w+)\\b`, 'gi')
          const selectCols: string[] = []
          let m
          while ((m = tableColRegex.exec(query)) !== null) {
            if (!columns.includes(m[1]) && !selectCols.includes(m[1])) selectCols.push(m[1])
          }
          if (selectCols.length > 0) {
            const coveringCols = [...columns, ...selectCols]
            const key = `${resolved}:covering:${coveringCols.join(',')}`
            if (!seen.has(key) && coveringCols.length <= 6) {
              seen.add(key)
              const idxName = `idx_${resolved}_covering`.slice(0, 64)
              recommendations.push({
                table: resolved,
                columns: coveringCols,
                reason: `Covering index for \`${resolved}\` — range scan on ${columns.map(c => `\`${c}\``).join(', ')} + covers ${selectCols.map(c => `\`${c}\``).join(', ')} without table lookup`,
                impact: 'high',
                ddl: `-- Covering index: filter/range cols first, then join/select cols\nALTER TABLE \`${resolved}\` ADD INDEX \`${idxName}\` (${coveringCols.map(c => `\`${c}\``).join(', ')});`,
              })
            }
          }
        }
      }
    }

    // Rule 2: Filesort -> suggest ORDER BY index
    if (node.extra?.some(e => /filesort/i.test(e)) && node.table && !node.table.startsWith('<')) {
      const condCols = extractColumnsFromCondition(node.condition)
      if (condCols.length > 0) {
        addRecommendation(recommendations, seen, tables, {
          table: resolvedTable ?? node.table!,
          columns: condCols,
          reason: `Filesort detected — consider a composite index matching WHERE + ORDER BY columns`,
          impact: 'medium',
          note: 'Add ORDER BY columns after the WHERE columns in the index',
        })
      }
    }

    // Rule 3: Join buffer used -> index on join column
    if (node.extra?.some(e => /join buffer/i.test(e)) && node.table && !node.table.startsWith('<')) {
      const joinCols = extractColumnsFromCondition(node.condition)
      if (joinCols.length > 0) {
        addRecommendation(recommendations, seen, tables, {
          table: resolvedTable ?? node.table!,
          columns: joinCols,
          reason: `Join buffer used — adding an index will enable Nested Loop Join instead`,
          impact: 'high',
        })
      }
    }

    // Rule 4: Non-unique index lookup with high fan-out -> covering index
    if (node.index && node.loops && node.loops > 1 && node.table && !node.table.startsWith('<')) {
      const rowsPerLoop = node.actualRows ?? node.estimatedRows
      if (rowsPerLoop > 1 && node.accessType !== 'eq_ref') {
        const usedCols = node.usedColumns ?? []
        const indexCols = [node.index]
        // If we know the used columns, suggest a covering index
        if (usedCols.length > 0) {
          const key = `covering:${node.table}:${usedCols.sort().join(',')}`
          if (!seen.has(key)) {
            seen.add(key)
            const allCols = [...new Set([...extractColumnsFromCondition(node.condition), ...usedCols])]
            if (allCols.length > 1 && allCols.length <= 6) {
              recommendations.push({
                table: resolvedTable ?? node.table!,
                columns: allCols,
                reason: `Non-unique lookup on \`${node.table}\` returns ~${rowsPerLoop} rows × ${node.loops} loops. A covering index avoids table row reads.`,
                impact: 'medium',
                ddl: `-- Covering index (adjust column order: equality cols first, then range, then SELECT cols):\nALTER TABLE \`${node.table}\` ADD INDEX \`idx_${node.table}_covering\` (${allCols.map(c => `\`${c}\``).join(', ')});`,
              })
            }
          }
        }
      }
    }

    // Rule 5: Zero-row join -> missing FK or data integrity issue
    if (node.actualRows === 0 && node.loops && node.loops > 1 && node.table && !node.table.startsWith('<')) {
      const joinCols = extractColumnsFromCondition(node.condition)
      if (joinCols.length > 0) {
        const key = `integrity:${node.table}:${joinCols.join(',')}`
        if (!seen.has(key)) {
          seen.add(key)
          recommendations.push({
            table: resolvedTable ?? node.table!,
            columns: joinCols,
            reason: `All ${node.loops} lookups on \`${node.table}\` returned 0 rows — likely orphaned foreign key values. Fix data integrity first, then add index.`,
            impact: 'high',
            ddl: `-- 1. Find orphaned rows:\nSELECT DISTINCT ${joinCols[0]} FROM source_table WHERE ${joinCols[0]} NOT IN (SELECT id FROM \`${node.table}\`);\n\n-- 2. After fixing data, add FK constraint:\n-- ALTER TABLE source_table ADD CONSTRAINT fk_${node.table} FOREIGN KEY (${joinCols[0]}) REFERENCES \`${node.table}\`(id);`,
          })
        }
      }
    }

    // Rule 6: Possible keys exist but none used
    if (node.accessType === 'ALL' && node.possibleKeys && node.possibleKeys.length > 0 && !node.index && node.table && !node.table.startsWith('<')) {
      const key = `unused:${node.table}`
      if (!seen.has(key)) {
        seen.add(key)
        recommendations.push({
          table: resolvedTable ?? node.table!,
          columns: [],
          reason: `MySQL considered indexes [${node.possibleKeys.join(', ')}] but chose none — the indexes may not be selective enough`,
          impact: 'medium',
          ddl: `ANALYZE TABLE \`${node.table}\`;\n-- If the problem persists, check index selectivity with:\nSHOW INDEX FROM \`${node.table}\`;`,
        })
      }
    }
  })

  // DDL-based recommendations: FK columns without indexes (only for plan-relevant tables)
  const planTableNames = new Set<string>()
  walkNodes(root, (n) => {
    if (n.table && !n.table.startsWith('<')) {
      planTableNames.add(n.table.toLowerCase())
      if (query) planTableNames.add(resolveTableAlias(query, n.table).toLowerCase())
    }
  })

  if (tables.length > 0) {
    for (const table of tables) {
      if (!planTableNames.has(table.name.toLowerCase())) continue
      for (const fk of table.foreignKeys) {
        const hasIndex = table.indexes.some(idx =>
          fk.columns.length <= idx.columns.length &&
          fk.columns.every((col, i) => idx.columns[i]?.toLowerCase() === col.toLowerCase())
        )
        if (!hasIndex) {
          addRecommendation(recommendations, seen, tables, {
            table: table.name,
            columns: fk.columns,
            reason: `Foreign key to \`${fk.refTable}\` has no index — JOINs on this column require full table scans`,
            impact: 'high',
          })
        }
      }
    }

    // DDL-based: suggest indexes for columns used in joins but lacking indexes
    walkNodes(root, (node) => {
      if (!node.table || node.table.startsWith('<')) return
      if (node.accessType === 'ALL' || node.accessType === 'index') {
        const resolved2 = query ? resolveTableAlias(query, node.table) : node.table
        const table = findTable(tables, resolved2) ?? findTable(tables, node.table)
        if (!table) return

        const condCols = extractColumnsFromCondition(node.condition)
        for (const col of condCols) {
          const hasIdx = table.indexes.some(idx => idx.columns[0]?.toLowerCase() === col.toLowerCase())
          if (!hasIdx) {
            addRecommendation(recommendations, seen, tables, {
              table: table.name,
              columns: [col],
              reason: `Column \`${col}\` used in filter/join on \`${node.table}\` has no index`,
              impact: 'high',
            })
          }
        }
      }
    })
  }

  // Query-level analysis: extract WHERE, GROUP BY, ORDER BY columns from SQL
  if (query) {
    const queryRecs = analyzeQueryForIndexes(query, tables, seen)
    recommendations.push(...queryRecs)

    // Suggest covering indexes for tables with joins + aggregations
    const coveringRecs = suggestCoveringIndexes(query, root, tables, seen)
    recommendations.push(...coveringRecs)
  }

  return recommendations
}

function analyzeQueryForIndexes(query: string, tables: ParsedTable[], seen: Set<string>): IndexRecommendation[] {
  const recs: IndexRecommendation[] = []

  // Extract WHERE columns with their table context
  const whereMatch = query.match(/\bWHERE\s+([\s\S]*?)(?:\bGROUP\b|\bORDER\b|\bLIMIT\b|\bHAVING\b|;|$)/i)
  const whereClause = whereMatch?.[1] ?? ''

  // Extract GROUP BY columns
  const groupMatch = query.match(/\bGROUP\s+BY\s+([\s\S]*?)(?:\bORDER\b|\bLIMIT\b|\bHAVING\b|;|$)/i)
  const groupCols = groupMatch ? extractColumnRefs(groupMatch[1]) : []

  // Extract ORDER BY columns
  const orderMatch = query.match(/\bORDER\s+BY\s+([\s\S]*?)(?:\bLIMIT\b|;|$)/i)
  const orderCols = orderMatch ? extractColumnRefs(orderMatch[1]) : []

  // Extract WHERE column refs
  const whereCols = whereClause ? extractColumnRefs(whereClause) : []

  // For each table scan in the plan, suggest composite indexes based on query structure
  // WHERE columns: suggest composite index (equality cols first, then range, then GROUP BY, then ORDER BY)
  if (whereCols.length > 0) {
    // Group by table
    const byTable = new Map<string, string[]>()
    for (const ref of whereCols) {
      const t = ref.table || '_unknown'
      if (!byTable.has(t)) byTable.set(t, [])
      if (!byTable.get(t)!.includes(ref.column)) byTable.get(t)!.push(ref.column)
    }

    for (const [tableName, cols] of byTable) {
      let resolved: string
      if (tableName === '_unknown') {
        // Try to infer table from single-table queries: "FROM tablename WHERE ..."
        const singleTable = query.match(/\bFROM\s+`?(\w+)`?(?:\s+WHERE\b)/i)
        if (singleTable) {
          resolved = singleTable[1]
        } else {
          continue
        }
      } else {
        resolved = resolveTableAlias(query, tableName)
      }
      const table = tables.find(t => t.name.toLowerCase() === resolved.toLowerCase())
      if (!table) continue

      // Check if a useful composite index exists
      const hasIndex = table.indexes.some(idx =>
        cols.every(c => idx.columns.some(ic => ic.toLowerCase() === c.toLowerCase()))
      )
      if (!hasIndex && cols.length > 0) {
        const key = `${resolved}:${cols.join(',')}`
        if (!seen.has(key)) {
          seen.add(key)
          const idxName = `idx_${resolved}_${cols.join('_')}`.slice(0, 64)
          recs.push({
            table: resolved,
            columns: cols,
            reason: `WHERE clause filters on ${cols.map(c => `\`${c}\``).join(', ')} — a composite index would eliminate the full table scan`,
            impact: 'high',
            ddl: `ALTER TABLE \`${resolved}\` ADD INDEX \`${idxName}\` (${cols.map(c => `\`${c}\``).join(', ')});`,
          })
        }
      }
    }
  }

  // GROUP BY index suggestion
  if (groupCols.length > 0) {
    const byTable = new Map<string, string[]>()
    for (const ref of groupCols) {
      const t = ref.table || '_unknown'
      if (!byTable.has(t)) byTable.set(t, [])
      if (!byTable.get(t)!.includes(ref.column)) byTable.get(t)!.push(ref.column)
    }

    for (const [tableName, cols] of byTable) {
      if (tableName === '_unknown') {
        // Try to match unaliased columns against tables
        for (const table of tables) {
          for (const col of cols) {
            const hasCol = table.columns.some(c => c.name.toLowerCase() === col.toLowerCase())
            const hasIdx = table.indexes.some(idx => idx.columns[0]?.toLowerCase() === col.toLowerCase())
            if (hasCol && !hasIdx) {
              const key = `${table.name}:${col}`
              if (!seen.has(key)) {
                seen.add(key)
                recs.push({
                  table: table.name,
                  columns: [col],
                  reason: `GROUP BY uses \`${col}\` — an index enables Loose Index Scan and avoids temporary table`,
                  impact: 'medium',
                  ddl: `ALTER TABLE \`${table.name}\` ADD INDEX \`idx_${table.name}_${col}\` (\`${col}\`);`,
                })
              }
            }
          }
        }
        continue
      }

      const resolved = resolveTableAlias(query, tableName)
      const table = tables.find(t => t.name.toLowerCase() === resolved.toLowerCase())
      if (!table) continue

      for (const col of cols) {
        const hasIdx = table.indexes.some(idx => idx.columns[0]?.toLowerCase() === col.toLowerCase())
        if (!hasIdx) {
          const key = `${resolved}:${col}`
          if (!seen.has(key)) {
            seen.add(key)
            recs.push({
              table: resolved,
              columns: [col],
              reason: `GROUP BY uses \`${resolved}\`.\`${col}\` — an index enables Loose Index Scan and avoids temporary table`,
              impact: 'medium',
              ddl: `ALTER TABLE \`${resolved}\` ADD INDEX \`idx_${resolved}_${col}\` (\`${col}\`);`,
            })
          }
        }
      }
    }
  }

  return recs
}

interface ColumnRef {
  table?: string
  column: string
}

function extractColumnRefs(clause: string): ColumnRef[] {
  const refs: ColumnRef[] = []
  const SQL_KEYWORDS = new Set(['AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'BETWEEN', 'ASC', 'DESC',
    'SUM', 'COUNT', 'MAX', 'MIN', 'AVG', 'YEAR', 'MONTH', 'DATE', 'DAY', 'HOUR',
    'CONCAT', 'LOWER', 'UPPER', 'TRIM', 'CAST', 'CONVERT', 'IF', 'CASE', 'WHEN',
    'THEN', 'ELSE', 'END', 'AS', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'BY', 'HAVING',
    'LIMIT', 'SELECT', 'JOIN', 'ON', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'TRUE', 'FALSE'])

  // Match table.column patterns
  const qualifiedRegex = /\b(\w+)\.(\w+)\b/g
  let match
  while ((match = qualifiedRegex.exec(clause)) !== null) {
    const table = match[1]
    const col = match[2]
    if (SQL_KEYWORDS.has(table.toUpperCase())) continue
    if (!refs.some(r => r.table === table && r.column === col)) {
      refs.push({ table, column: col })
    }
  }

  // Match bare columns in WHERE: column = value, column > value, etc.
  const whereColRegex = /\b(\w+)\s*(?:=|<|>|<=|>=|<>|!=|LIKE|IN\b|BETWEEN\b)/gi
  while ((match = whereColRegex.exec(clause)) !== null) {
    const col = match[1]
    if (SQL_KEYWORDS.has(col.toUpperCase())) continue
    if (!refs.some(r => r.column === col)) {
      refs.push({ column: col })
    }
  }

  // Match columns inside functions: YEAR(column), LOWER(column)
  const funcColRegex = /\b(?:YEAR|MONTH|DAY|DATE|HOUR|LOWER|UPPER|TRIM|LENGTH)\s*\(\s*(?:(\w+)\.)?(\w+)\s*\)/gi
  while ((match = funcColRegex.exec(clause)) !== null) {
    const table = match[1]
    const col = match[2]
    if (SQL_KEYWORDS.has(col.toUpperCase())) continue
    if (!refs.some(r => r.column === col)) {
      refs.push({ table, column: col })
    }
  }

  // Match bare columns in GROUP BY / ORDER BY: col1, col2 ASC
  const bareRegex = /(?:^|,)\s*`?(\w+)`?\s*(?:ASC|DESC)?(?:\s*,|\s*$)/gi
  while ((match = bareRegex.exec(clause)) !== null) {
    const col = match[1]
    if (SQL_KEYWORDS.has(col.toUpperCase())) continue
    if (!refs.some(r => r.column === col)) {
      refs.push({ column: col })
    }
  }

  return refs
}

function resolveTableAlias(query: string, alias: string): string {
  // Find "FROM tablename alias" or "JOIN tablename alias"
  const regex = new RegExp(`\\b(?:FROM|JOIN)\\s+(\\w+)\\s+(?:AS\\s+)?${alias}\\b`, 'i')
  const match = query.match(regex)
  return match ? match[1] : alias
}

function suggestCoveringIndexes(
  query: string,
  root: PlanNode,
  tables: ParsedTable[],
  seen: Set<string>,
): IndexRecommendation[] {
  const recs: IndexRecommendation[] = []

  // For each table accessed with a non-eq_ref join and multiple loops,
  // suggest a covering index with join col + aggregated/selected cols
  walkNodes(root, (node) => {
    if (!node.table || node.table.startsWith('<')) return
    if (!node.index) return
    if (node.accessType === 'eq_ref' || node.accessType === 'const') return
    if (!node.loops || node.loops <= 1) return

    const resolved = resolveTableAlias(query, node.table)
    const table = tables.find(t => t.name.toLowerCase() === resolved.toLowerCase())
    if (!table) return

    // Find what columns this table contributes to the query
    // Look for table.col patterns in SELECT and WHERE/ON
    const tableColRegex = new RegExp(`\\b${node.table}\\.(\w+)\\b`, 'gi')
    const usedCols: string[] = []
    let m
    while ((m = tableColRegex.exec(query)) !== null) {
      const col = m[1]
      if (!usedCols.includes(col)) usedCols.push(col)
    }

    // Also include the join column (from the index being used)
    if (node.index && !usedCols.includes(node.index)) {
      usedCols.unshift(node.index)
    }

    // Add condition columns
    const condCols = extractColumnsFromCondition(node.condition)
    for (const c of condCols) {
      if (!usedCols.includes(c)) usedCols.push(c)
    }

    if (usedCols.length >= 2 && usedCols.length <= 6) {
      const key = `${resolved}:covering:${usedCols.sort().join(',')}`
      if (!seen.has(key)) {
        // Check if a covering index already exists
        const existing = table.indexes.some(idx =>
          usedCols.every(c => idx.columns.some(ic => ic.toLowerCase() === c.toLowerCase()))
        )
        if (!existing) {
          seen.add(key)
          // Put join/equality columns first, then SELECT columns
          const joinCols = condCols.length > 0 ? condCols : [node.index!]
          const selectCols = usedCols.filter(c => !joinCols.includes(c))
          const orderedCols = [...joinCols, ...selectCols]

          recs.push({
            table: resolved,
            columns: orderedCols,
            reason: `Covering index for \`${resolved}\` — eliminates table row lookups by including all columns needed (${orderedCols.map(c => `\`${c}\``).join(', ')})`,
            impact: 'medium',
            ddl: `-- Covering index (join cols first, then SELECT cols):\nALTER TABLE \`${resolved}\` ADD INDEX \`idx_${resolved}_covering\` (${orderedCols.map(c => `\`${c}\``).join(', ')});`,
          })
        }
      }
    }
  })

  return recs
}

interface RecInput {
  table: string
  columns: string[]
  reason: string
  impact: 'high' | 'medium' | 'low'
  note?: string
  ddl?: string
}

function addRecommendation(
  recommendations: IndexRecommendation[],
  seen: Set<string>,
  tables: ParsedTable[],
  input: RecInput,
) {
  const key = `${input.table}:${input.columns.join(',')}`
  if (seen.has(key)) return
  seen.add(key)

  // Check if index already exists in DDL
  let ddl = input.ddl
  let reason = input.reason

  if (!ddl && input.columns.length > 0) {
    const table = findTable(tables, input.table)
    if (table) {
      const existing = findIndexWithPrefix(table, input.columns)
      if (existing) {
        reason += ` (NOTE: index \`${existing.name}\` already covers this — check selectivity with ANALYZE TABLE)`
        ddl = `ANALYZE TABLE \`${input.table}\`;`
      }
    }

    if (!ddl) {
      const indexName = `idx_${input.table}_${input.columns.join('_')}`.slice(0, 64)
      ddl = `ALTER TABLE \`${input.table}\` ADD INDEX \`${indexName}\` (${input.columns.map(c => `\`${c}\``).join(', ')});`
      if (input.note) {
        ddl = `-- ${input.note}\n${ddl}`
      }
    }
  }

  recommendations.push({
    table: input.table,
    columns: input.columns,
    reason,
    impact: input.impact,
    ddl: ddl ?? '',
  })
}

const EXCLUDE_WORDS = new Set([
  'null', 'true', 'false', 'and', 'or', 'not', 'is',
  'cache', 'now', 'interval', 'day', 'month', 'year', 'hour', 'minute', 'second',
  'current_timestamp', 'curdate', 'curtime', 'sysdate',
  'select', 'from', 'where', 'join', 'on', 'in', 'between', 'like', 'exists',
  'as', 'asc', 'desc', 'limit', 'offset', 'having', 'group', 'order', 'by',
])

function extractColumnsFromCondition(condition?: string): string[] {
  if (!condition) return []

  const columns: string[] = []
  const regex = /(?:`?(\w+)`?\.)?`?(\w+)`?\s*(?:=|<|>|<=|>=|<>|!=|LIKE|IN\b|BETWEEN\b|IS\b)/gi
  let match
  while ((match = regex.exec(condition)) !== null) {
    const col = match[2]
    if (!EXCLUDE_WORDS.has(col.toLowerCase())) {
      if (!columns.includes(col)) {
        columns.push(col)
      }
    }
  }

  return columns
}

function walkNodes(node: PlanNode, fn: (node: PlanNode) => void) {
  fn(node)
  for (const child of node.children) {
    walkNodes(child, fn)
  }
}
