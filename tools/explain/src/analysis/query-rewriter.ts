/**
 * Query Rewrite Engine — generates executable SQL rewrites for common anti-patterns.
 * Returns concrete before/after SQL that DBAs can copy and test.
 */

export interface QueryRewrite {
  title: string
  description: string
  original: string
  rewritten: string
  reason: string
}

export function generateRewrites(query: string): QueryRewrite[] {
  if (!query.trim()) return []
  const rewrites: QueryRewrite[] = []

  rewriteYearFunction(query, rewrites)
  rewriteScalarSubquery(query, rewrites)
  rewriteNotInSubquery(query, rewrites)
  rewriteGroupByName(query, rewrites)
  rewriteSelectStar(query, rewrites)
  rewriteOffsetPagination(query, rewrites)
  rewriteOrderByRand(query, rewrites)

  return rewrites
}

/** YEAR(col) = N → col >= 'N-01-01' AND col < 'N+1-01-01' */
function rewriteYearFunction(query: string, rewrites: QueryRewrite[]) {
  const match = query.match(/\bYEAR\s*\(\s*(?:(\w+)\.)?(\w+)\s*\)\s*=\s*(\d{4})/i)
  if (!match) return

  const tablePrefix = match[1] ? `${match[1]}.` : ''
  const column = match[2]
  const year = parseInt(match[3])
  const nextYear = year + 1

  const original = match[0]
  const rewritten = `${tablePrefix}${column} >= '${year}-01-01' AND ${tablePrefix}${column} < '${nextYear}-01-01'`

  const newQuery = query.replace(
    new RegExp(`\\bYEAR\\s*\\(\\s*(?:${match[1] ? match[1] + '\\.' : ''})?${column}\\s*\\)\\s*=\\s*${year}`, 'i'),
    rewritten
  )

  rewrites.push({
    title: 'Replace YEAR() with range condition',
    description: `YEAR(${column}) prevents index usage. A range condition enables index range scan.`,
    original: query.trim(),
    rewritten: newQuery.trim(),
    reason: 'Allows MySQL to use an index on the date column instead of scanning every row',
  })
}

/** Scalar subquery → LEFT JOIN + COALESCE + GROUP BY */
function rewriteScalarSubquery(query: string, rewrites: QueryRewrite[]) {
  // Match: SELECT ... (SELECT AGG(col) FROM table WHERE fk = outer.id) ... FROM outer
  const match = query.match(
    /SELECT\s+([\s\S]*?)\(\s*SELECT\s+(SUM|COUNT|AVG|MAX|MIN)\s*\((\w+(?:\.\w+)?)\)\s+FROM\s+(\w+)\s+(\w+)\s+WHERE\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)\s*\)\s*(?:AS\s+(\w+))?([\s\S]*?)FROM\s+(\w+)\s+(\w+)/is
  )
  if (!match) return

  const selectBefore = match[1].trim()
  const aggFunc = match[2].toUpperCase()
  const aggCol = match[3]
  const subTable = match[4]
  const subAlias = match[5]
  const subFkAlias = match[6]
  const subFkCol = match[7]
  const outerAlias = match[8]
  const outerPkCol = match[9]
  const aliasName = match[10] || 'agg_value'
  const selectAfter = match[11].trim()
  const outerTable = match[12]
  const outerAliasName = match[13]

  // Build the rewritten query
  const selectCols = selectBefore.replace(/,\s*$/, '').trim()
  const coalesce = aggFunc === 'COUNT' ? `COALESCE(${aggFunc}(${subAlias}.${aggCol.includes('.') ? aggCol.split('.')[1] : aggCol}), 0)` :
    `COALESCE(${aggFunc}(${subAlias}.${aggCol.includes('.') ? aggCol.split('.')[1] : aggCol}), 0)`

  const rewritten = `SELECT ${selectCols}, ${coalesce} AS ${aliasName}
FROM ${outerTable} ${outerAliasName}
LEFT JOIN ${subTable} ${subAlias} ON ${subAlias}.${subFkCol} = ${outerAliasName}.${outerPkCol}
GROUP BY ${outerAliasName}.${outerPkCol}${selectCols.includes(outerAliasName + '.') ? ', ' + selectCols.split(',').map(s => s.trim()).filter(s => s.startsWith(outerAliasName + '.')).join(', ') : ''}`

  rewrites.push({
    title: 'Rewrite correlated subquery as LEFT JOIN',
    description: `The scalar subquery executes once per row. A LEFT JOIN + GROUP BY runs in a single pass.`,
    original: query.trim(),
    rewritten: rewritten.trim() + ';',
    reason: 'Eliminates O(n*m) dependent subquery — single-pass aggregation with LEFT JOIN',
  })
}

/** NOT IN (SELECT ...) → LEFT JOIN ... IS NULL */
function rewriteNotInSubquery(query: string, rewrites: QueryRewrite[]) {
  const match = query.match(
    /SELECT\s+([\s\S]*?)FROM\s+(\w+)(?:\s+(\w+))?\s+WHERE\s+(?:(\w+)\.)?(\w+)\s+NOT\s+IN\s*\(\s*SELECT\s+(?:DISTINCT\s+)?(?:(\w+)\.)?(\w+)\s+FROM\s+(\w+)(?:\s+(\w+))?/is
  )
  if (!match) return

  const selectList = match[1].trim()
  const outerTable = match[2]
  const outerAlias = match[3] || outerTable
  const colPrefix = match[4] || outerAlias
  const outerCol = match[5]
  const _innerPrefix = match[6]
  const innerCol = match[7]
  const innerTable = match[8]
  const innerAlias = match[9] || innerTable

  const newInnerAlias = innerAlias === outerAlias ? innerTable.charAt(0) + '2' : innerAlias

  const rewritten = `SELECT ${selectList}FROM ${outerTable} ${outerAlias}
LEFT JOIN ${innerTable} ${newInnerAlias} ON ${newInnerAlias}.${innerCol} = ${outerAlias}.${outerCol}
WHERE ${newInnerAlias}.${innerCol} IS NULL`

  rewrites.push({
    title: 'Rewrite NOT IN as LEFT JOIN ... IS NULL',
    description: 'NOT IN with a subquery can be slow and has NULL-handling gotchas. LEFT JOIN + IS NULL is clearer and often faster.',
    original: query.trim(),
    rewritten: rewritten.trim() + ';',
    reason: 'Avoids dependent subquery execution and NULL-related UNKNOWN results',
  })
}

/** GROUP BY name → GROUP BY id, name */
function rewriteGroupByName(query: string, rewrites: QueryRewrite[]) {
  const match = query.match(/\bGROUP\s+BY\s+(\w+)\.(name|title|label|description|full_name|username)\b(?!\s*,\s*\w+\.(?:id|pk))/i)
  if (!match) return

  const alias = match[1]
  const col = match[2]

  const rewritten = query.replace(
    new RegExp(`GROUP\\s+BY\\s+${alias}\\.${col}\\b`, 'i'),
    `GROUP BY ${alias}.id, ${alias}.${col}`
  )

  rewrites.push({
    title: 'Add primary key to GROUP BY',
    description: `GROUP BY ${alias}.${col} will merge different records with the same ${col}. Always include the primary key.`,
    original: query.trim(),
    rewritten: rewritten.trim(),
    reason: `Two records named "John Smith" would be incorrectly merged without the id column`,
  })
}

/** SELECT * → SELECT specific columns */
function rewriteSelectStar(query: string, rewrites: QueryRewrite[]) {
  if (!/\bSELECT\s+\*\s+FROM\b/i.test(query)) return

  rewrites.push({
    title: 'Replace SELECT * with specific columns',
    description: 'SELECT * fetches all columns including BLOBs and prevents covering index optimization.',
    original: query.trim(),
    rewritten: query.replace(/\bSELECT\s+\*\b/i, 'SELECT id, /* list only needed columns */').trim(),
    reason: 'Enables covering indexes and reduces I/O by reading only required columns',
  })
}

/** LIMIT offset, count → keyset pagination */
function rewriteOffsetPagination(query: string, rewrites: QueryRewrite[]) {
  const match = query.match(/\bLIMIT\s+(\d+)\s*,\s*(\d+)/i)
  if (!match) return
  const offset = parseInt(match[1])
  if (offset < 1000) return // Only for high offsets

  const count = match[2]

  // Try to find ORDER BY column
  const orderMatch = query.match(/ORDER\s+BY\s+(?:(\w+)\.)?(\w+)/i)
  const orderCol = orderMatch ? (orderMatch[1] ? `${orderMatch[1]}.${orderMatch[2]}` : orderMatch[2]) : 'id'

  const rewritten = query.replace(
    /\bLIMIT\s+\d+\s*,\s*\d+/i,
    `-- Replace with keyset pagination:\n-- WHERE ${orderCol} < :last_seen_value\n-- ORDER BY ${orderCol} DESC\nLIMIT ${count}`
  )

  rewrites.push({
    title: 'Replace OFFSET with keyset pagination',
    description: `LIMIT ${offset}, ${count} forces MySQL to read and discard ${offset} rows. Keyset pagination skips them via WHERE.`,
    original: query.trim(),
    rewritten: rewritten.trim(),
    reason: `Offset ${offset} requires scanning ${offset} rows before returning ${count} — scales linearly with page number`,
  })
}

/** ORDER BY RAND() → application-side random */
function rewriteOrderByRand(query: string, rewrites: QueryRewrite[]) {
  if (!/ORDER\s+BY\s+RAND\s*\(\)/i.test(query)) return

  const rewritten = query.replace(
    /ORDER\s+BY\s+RAND\s*\(\)\s*/i,
    '-- Replace ORDER BY RAND() with:\n-- WHERE id >= (SELECT FLOOR(RAND() * (SELECT MAX(id) FROM table_name)))\nORDER BY id '
  )

  rewrites.push({
    title: 'Replace ORDER BY RAND()',
    description: 'ORDER BY RAND() generates a random value for every row then sorts all of them. O(n log n) on the full table.',
    original: query.trim(),
    rewritten: rewritten.trim(),
    reason: 'Random offset lookup is O(1) instead of O(n log n)',
  })
}
