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

        // Suggest covering index: [filter cols, GROUP BY cols, ORDER BY cols, remaining SELECT/agg cols]
        if (query && rows > 500) {
          const resolved = resolveTableAlias(query, node.table)
          const alias = node.table
          const tableColRegex = new RegExp(`\\b${alias}\\.(\\w+)\\b`, 'gi')
          const allQueryCols: string[] = []
          let m
          while ((m = tableColRegex.exec(query)) !== null) {
            if (!allQueryCols.includes(m[1])) allQueryCols.push(m[1])
          }

          // Extract GROUP BY and ORDER BY columns for this table to order them correctly
          const groupByMatch = query.match(/\bGROUP\s+BY\s+([\s\S]*?)(?:\bORDER\b|\bLIMIT\b|\bHAVING\b|;|$)/i)
          const orderByMatch = query.match(/\bORDER\s+BY\s+([\s\S]*?)(?:\bLIMIT\b|;|$)/i)
          const groupByCols = groupByMatch ? extractTableColumns(groupByMatch[1], alias) : []
          const orderByCols = orderByMatch ? extractTableColumns(orderByMatch[1], alias) : []

          // Build optimal column order: filter → GROUP BY → ORDER BY → remaining
          const orderedCols = [...columns]
          for (const c of groupByCols) if (!orderedCols.includes(c)) orderedCols.push(c)
          for (const c of orderByCols) if (!orderedCols.includes(c)) orderedCols.push(c)
          for (const c of allQueryCols) if (!orderedCols.includes(c)) orderedCols.push(c)

          const coveringCols = orderedCols.filter(c => !EXCLUDE_WORDS.has(c.toLowerCase()))
          if (coveringCols.length > columns.length && coveringCols.length <= 6) {
            const key = `${resolved}:covering:${coveringCols.join(',')}`
            if (!seen.has(key)) {
              seen.add(key)
              const idxName = `idx_${resolved}_covering`.slice(0, 64)
              recommendations.push({
                table: resolved,
                columns: coveringCols,
                reason: `Covering index for \`${resolved}\` — filter on ${columns.map(c => `\`${c}\``).join(', ')} + covers ${coveringCols.filter(c => !columns.includes(c)).map(c => `\`${c}\``).join(', ')} without table lookup`,
                impact: 'high',
                ddl: `-- Covering index: filter cols first, then GROUP BY/ORDER BY, then SELECT cols\nALTER TABLE \`${resolved}\` ADD INDEX \`${idxName}\` (${coveringCols.map(c => `\`${c}\``).join(', ')});`,
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
                ddl: `-- Covering index (adjust column order: equality cols first, then range, then SELECT cols):\nALTER TABLE \`${resolvedTable ?? node.table}\` ADD INDEX \`idx_${resolvedTable ?? node.table}_covering\` (${allCols.map(c => `\`${c}\``).join(', ')});`,
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
            ddl: `-- 1. Find orphaned rows:\nSELECT DISTINCT ${joinCols[0]} FROM source_table WHERE ${joinCols[0]} NOT IN (SELECT id FROM \`${resolvedTable ?? node.table}\`);\n\n-- 2. After fixing data, add FK constraint:\n-- ALTER TABLE source_table ADD CONSTRAINT fk_${resolvedTable ?? node.table} FOREIGN KEY (${joinCols[0]}) REFERENCES \`${resolvedTable ?? node.table}\`(id);`,
          })
        }
      }
    }

    // Rule 6: Range/ref scan reading many rows — suggest better composite index
    // When the optimizer uses an index but still reads many rows, a composite index
    // covering WHERE + JOIN + aggregate columns would be more efficient
    if (node.index && node.table && !node.table.startsWith('<') &&
        (node.accessType === 'range' || node.accessType === 'ref' || node.accessType === 'index') &&
        (node.actualRows ?? node.estimatedRows) > 1000) {
      const tableName = resolvedTable ?? node.table
      const filterCondition = node.parent?.condition ?? node.condition
      const filterCols = extractColumnsFromCondition(filterCondition)

      // Get columns this table contributes to the query (for covering index)
      const queryCols: string[] = []
      if (query) {
        const alias = node.table
        const colRegex = new RegExp(`\\b${alias}\\.(\\w+)\\b`, 'gi')
        let m2
        while ((m2 = colRegex.exec(query)) !== null) {
          if (!queryCols.includes(m2[1]) && !filterCols.includes(m2[1])) queryCols.push(m2[1])
        }
      }

      // Build optimal composite: [WHERE equality cols, WHERE range cols, JOIN cols, SELECT/aggregate cols]
      const allCols = [...filterCols, ...queryCols].filter(c =>
        !EXCLUDE_WORDS.has(c.toLowerCase()) && c !== node.index
      )

      // Build composite: filter columns first (these narrow the scan), then query/aggregate cols
      // Don't use node.index (that's the index name, not column name)
      const compositeCols = [...new Set([...filterCols, ...queryCols])]
        .filter(c => !EXCLUDE_WORDS.has(c.toLowerCase()))
        .slice(0, 5) // max 5 columns

      if (compositeCols.length >= 2) {
        const key = `${tableName}:composite:${compositeCols.join(',')}`
        if (!seen.has(key)) {
          seen.add(key)
          const idxName = `idx_${tableName}_composite`.slice(0, 64)
          const rows = node.actualRows ?? node.estimatedRows
          recommendations.push({
            table: tableName,
            columns: compositeCols,
            reason: `\`${node.index}\` reads ${formatNumber(rows)} rows — a composite covering index (${compositeCols.map(c => `\`${c}\``).join(', ')}) would be more selective and avoid table lookups`,
            impact: 'high',
            ddl: `-- Composite covering index: current index + WHERE + JOIN + aggregate columns\nALTER TABLE \`${tableName}\` ADD INDEX \`${idxName}\` (${compositeCols.map(c => `\`${c}\``).join(', ')});`,
          })
        }
      }
    }

    // Rule 7: Possible keys exist but none used
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

  return deduplicateRecommendations(recommendations)
}

function analyzeQueryForIndexes(query: string, tables: ParsedTable[], seen: Set<string>): IndexRecommendation[] {
  const recs: IndexRecommendation[] = []

  // Extract clauses
  const whereMatch = query.match(/\bWHERE\s+([\s\S]*?)(?:\bGROUP\b|\bORDER\b|\bLIMIT\b|\bHAVING\b|;|$)/i)
  const whereClause = whereMatch?.[1] ?? ''
  const groupMatch = query.match(/\bGROUP\s+BY\s+([\s\S]*?)(?:\bORDER\b|\bLIMIT\b|\bHAVING\b|;|$)/i)
  const groupClause = groupMatch?.[1] ?? ''
  const orderMatch = query.match(/\bORDER\s+BY\s+([\s\S]*?)(?:\bLIMIT\b|;|$)/i)
  const orderClause = orderMatch?.[1] ?? ''

  // Extract column refs per clause
  const whereCols = whereClause ? extractColumnRefs(whereClause) : []
  const groupCols = groupClause ? extractColumnRefs(groupClause) : []
  const orderCols = orderClause ? extractColumnRefs(orderClause) : []

  // Extract aggregate columns from SELECT for covering indexes
  const aggCols = extractAggregateColumns(query)

  // Group all columns by resolved table name
  interface TableCols {
    where: string[]
    group: string[]
    order: string[]
    agg: string[]
  }
  const byTable = new Map<string, TableCols>()

  function getEntry(resolved: string): TableCols {
    if (!byTable.has(resolved)) byTable.set(resolved, { where: [], group: [], order: [], agg: [] })
    return byTable.get(resolved)!
  }

  function addCol(tableName: string, col: string, clause: keyof TableCols) {
    const resolved = resolveTableAlias(query, tableName)
    const entry = getEntry(resolved)
    if (!entry[clause].includes(col)) entry[clause].push(col)
  }

  // Resolve unaliased columns: try single-table FROM or DDL column matching
  function resolveUnaliased(col: string, clause: keyof TableCols) {
    const singleTable = query.match(/\bFROM\s+`?(\w+)`?(?:\s+WHERE\b)/i)
    if (singleTable) {
      addCol(singleTable[1], col, clause)
      return
    }
    for (const t of tables) {
      if (t.columns.some(c => c.name.toLowerCase() === col.toLowerCase())) {
        addCol(t.name, col, clause)
      }
    }
  }

  for (const ref of whereCols) {
    if (ref.table) addCol(ref.table, ref.column, 'where')
    else resolveUnaliased(ref.column, 'where')
  }
  for (const ref of groupCols) {
    if (ref.table) addCol(ref.table, ref.column, 'group')
    else resolveUnaliased(ref.column, 'group')
  }
  for (const ref of orderCols) {
    if (ref.table) addCol(ref.table, ref.column, 'order')
    else resolveUnaliased(ref.column, 'order')
  }
  for (const ref of aggCols) {
    if (ref.table) addCol(ref.table, ref.column, 'agg')
    else resolveUnaliased(ref.column, 'agg')
  }

  // For each table, build optimal composite index:
  // [WHERE equality cols] + [GROUP BY cols] + [ORDER BY cols] + [aggregate cols for covering]
  for (const [tableName, cols] of byTable) {
    const table = tables.find(t => t.name.toLowerCase() === tableName.toLowerCase())

    // Skip GROUP BY columns if PK is already in GROUP BY
    let groupToUse = cols.group
    if (table) {
      const pk = table.indexes.find(idx => idx.primary)
      if (pk && cols.group.some(c => pk.columns.some(pc => pc.toLowerCase() === c.toLowerCase()))) {
        groupToUse = []
      }
    }

    // Build composite: WHERE → GROUP BY → ORDER BY → aggregate (covering)
    const composite: string[] = []
    for (const c of cols.where) if (!composite.includes(c)) composite.push(c)
    for (const c of groupToUse) if (!composite.includes(c)) composite.push(c)
    for (const c of cols.order) if (!composite.includes(c)) composite.push(c)
    for (const c of cols.agg) if (!composite.includes(c)) composite.push(c)

    if (composite.length === 0) continue
    // Aggregate-only columns don't warrant a standalone index — they only help as trailing
    // columns in a composite with WHERE/GROUP BY/ORDER BY
    if (cols.where.length === 0 && groupToUse.length === 0 && cols.order.length === 0) continue
    if (composite.length > 6) composite.length = 6

    // Check if a suitable index already exists (prefix match)
    if (table) {
      const hasIndex = table.indexes.some(idx =>
        composite.length <= idx.columns.length &&
        composite.every((c, i) => idx.columns[i]?.toLowerCase() === c.toLowerCase())
      )
      if (hasIndex) continue
    }

    const key = `${tableName}:composite:${composite.join(',')}`
    if (seen.has(key)) continue
    seen.add(key)

    const idxName = `idx_${tableName}_${composite.join('_')}`.slice(0, 64)

    // Build descriptive reason
    const parts: string[] = []
    if (cols.where.length > 0) parts.push(`WHERE on ${cols.where.map(c => `\`${c}\``).join(', ')}`)
    if (groupToUse.length > 0) parts.push(`GROUP BY on ${groupToUse.map(c => `\`${c}\``).join(', ')}`)
    if (cols.order.length > 0) parts.push(`ORDER BY on ${cols.order.map(c => `\`${c}\``).join(', ')}`)
    if (cols.agg.length > 0) parts.push(`covers ${cols.agg.map(c => `\`${c}\``).join(', ')} for index-only scan`)

    recs.push({
      table: tableName,
      columns: composite,
      reason: `Composite index: ${parts.join(' + ')} — eliminates scan and avoids temporary table/filesort`,
      impact: 'high',
      ddl: `ALTER TABLE \`${tableName}\` ADD INDEX \`${idxName}\` (${composite.map(c => `\`${c}\``).join(', ')});`,
    })
  }

  return recs
}

/** Extract columns for a specific table alias from a clause string */
function extractTableColumns(clause: string, alias: string): string[] {
  const cols: string[] = []
  const regex = new RegExp(`\\b${alias}\\.(\\w+)\\b`, 'gi')
  let match
  while ((match = regex.exec(clause)) !== null) {
    if (!cols.includes(match[1]) && !EXCLUDE_WORDS.has(match[1].toLowerCase())) cols.push(match[1])
  }
  // Also match bare column names (unqualified)
  const bareRegex = /(?:^|,)\s*`?(\w+)`?\s*(?:ASC|DESC)?(?:\s*,|\s*$)/gi
  while ((match = bareRegex.exec(clause)) !== null) {
    const col = match[1]
    if (!cols.includes(col) && !EXCLUDE_WORDS.has(col.toLowerCase())) cols.push(col)
  }
  return cols
}

/** Extract columns from aggregate functions: SUM(t.col), COUNT(t.col), etc. */
function extractAggregateColumns(query: string): ColumnRef[] {
  const refs: ColumnRef[] = []
  const aggRegex = /\b(?:SUM|COUNT|AVG|MIN|MAX)\s*\(\s*(?:DISTINCT\s+)?(?:(\w+)\.)?(\w+)\s*\)/gi
  let match
  while ((match = aggRegex.exec(query)) !== null) {
    const table = match[1]
    const col = match[2]
    if (col === '*') continue
    if (!refs.some(r => r.table === table && r.column === col)) {
      refs.push({ table, column: col })
    }
  }
  return refs
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

/** Remove indexes that are a prefix of a wider index on the same table */
function deduplicateRecommendations(recs: IndexRecommendation[]): IndexRecommendation[] {
  return recs.filter((rec, i) => {
    if (rec.columns.length === 0) return true
    return !recs.some((other, j) =>
      i !== j &&
      other.table.toLowerCase() === rec.table.toLowerCase() &&
      rec.columns.length < other.columns.length &&
      rec.columns.every((col, idx) => other.columns[idx]?.toLowerCase() === col.toLowerCase())
    )
  })
}

function walkNodes(node: PlanNode, fn: (node: PlanNode) => void) {
  fn(node)
  for (const child of node.children) {
    walkNodes(child, fn)
  }
}
