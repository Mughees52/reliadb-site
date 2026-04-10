import type { QueryHint } from './types'

interface HintPattern {
  regex: RegExp
  title: string
  description: string
  suggestion: string
  docLink?: string
}

const patterns: HintPattern[] = [
  {
    regex: /\bSELECT\s+\*\s+FROM\b/i,
    title: 'Avoid SELECT *',
    description: 'SELECT * fetches all columns, increasing I/O and preventing covering index optimizations.',
    suggestion: 'List only the columns you need: SELECT col1, col2, col3 ...',
    docLink: 'https://dev.mysql.com/doc/refman/8.0/en/data-size.html',
  },
  {
    regex: /NOT\s+IN\s*\(\s*SELECT/i,
    title: 'Rewrite NOT IN (subquery)',
    description: 'NOT IN with a subquery often produces a dependent subquery that re-executes per row.',
    suggestion: 'Rewrite as: LEFT JOIN ... WHERE joined_col IS NULL',
    docLink: 'https://dev.mysql.com/doc/refman/8.0/en/subquery-optimization.html',
  },
  {
    regex: /WHERE\s+(?:\w+\.)?\w+\s*(?:!=|<>)\s*/i,
    title: 'Inequality in WHERE may prevent index use',
    description: 'Conditions using != or <> often prevent efficient index range scans.',
    suggestion: 'If possible, rewrite with positive conditions or use range conditions.',
  },
  {
    regex: /ORDER\s+BY\s+RAND\s*\(\)/i,
    title: 'ORDER BY RAND() is very slow',
    description: 'ORDER BY RAND() generates a random value for every row, then sorts all rows. O(n log n) on the full table.',
    suggestion: 'Use application-side random offset: SELECT ... LIMIT 1 OFFSET <random_number>',
  },
  {
    regex: /LIKE\s+['"]%/i,
    title: 'Leading wildcard LIKE prevents index use',
    description: 'LIKE \'%value\' or LIKE \'%value%\' cannot use a B-tree index — MySQL must scan every row.',
    suggestion: 'Use a FULLTEXT index, or store reversed strings for suffix search, or use an external search engine.',
    docLink: 'https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html',
  },
  {
    regex: /WHERE[\s\S]*\bYEAR\s*\(\s*(\w+)\s*\)\s*=\s*(\d{4})/i,
    title: 'YEAR() function prevents index use — use range instead',
    description: 'YEAR(column) = value prevents MySQL from using any index on that column, forcing a full table scan even if an index exists.',
    suggestion: 'Rewrite as a range: WHERE column >= \'2024-01-01\' AND column < \'2025-01-01\'. This allows an index range scan.',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/index-btree-hash.html',
  },
  {
    regex: /WHERE[\s\S]*(?:MONTH|DAY|DATE|HOUR|MINUTE|SECOND|UNIX_TIMESTAMP|DATE_FORMAT)\s*\(/i,
    title: 'Date function on column prevents index use',
    description: 'Wrapping a column in a date function (MONTH(), DAY(), DATE(), etc.) prevents MySQL from using the index on that column.',
    suggestion: 'Rewrite to compare the column directly using range conditions. E.g., instead of WHERE MONTH(d) = 3, use WHERE d >= \'2024-03-01\' AND d < \'2024-04-01\'.',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/index-btree-hash.html',
  },
  {
    regex: /WHERE\s+(?:LOWER|UPPER|TRIM|CONCAT|SUBSTRING|LEFT|RIGHT|REPLACE|CAST|CONVERT)\s*\(\s*(?:\w+\.)?\w+/i,
    title: 'Function on column prevents index use',
    description: 'Applying a function to an indexed column in WHERE prevents the index from being used.',
    suggestion: 'Rewrite to avoid the function, or use a generated (virtual) column with an index.',
  },
  {
    regex: /SELECT\s+DISTINCT\b.*\bJOIN\b/is,
    title: 'DISTINCT with JOIN may indicate duplicate rows',
    description: 'Using DISTINCT after a JOIN often means the join is producing duplicates due to a one-to-many relationship.',
    suggestion: 'Check if the JOIN conditions are correct. Consider using EXISTS instead of JOIN + DISTINCT.',
  },
  {
    regex: /\bOR\b.*\bOR\b/i,
    title: 'Multiple OR conditions may prevent index use',
    description: 'Multiple OR conditions in WHERE can prevent MySQL from using a single index efficiently.',
    suggestion: 'Rewrite as UNION ALL of separate queries, or ensure an index_merge optimization is possible.',
  },
  {
    regex: /\bIN\s*\(\s*(?:[^,)]+,\s*){20,}/i,
    title: 'Large IN list',
    description: 'Very large IN (...) lists can be slow and may cause the optimizer to choose a table scan.',
    suggestion: 'For large lists, use a temporary table or JOIN against a subquery instead.',
  },
  {
    regex: /\bLIMIT\s+\d+\s*,\s*\d+/i,
    title: 'OFFSET-based pagination',
    description: 'LIMIT offset, count requires MySQL to read and discard the offset rows before returning results. Slow for large offsets.',
    suggestion: 'Use keyset (cursor) pagination: WHERE id > :last_seen_id ORDER BY id LIMIT :count',
  },
  {
    regex: /\bHAVING\b(?!.*\bGROUP\s+BY\b)/is,
    title: 'HAVING without GROUP BY',
    description: 'HAVING without GROUP BY filters the entire result set after aggregation — this is unusual and possibly a mistake.',
    suggestion: 'Use WHERE for row-level filtering (before aggregation) and HAVING only for aggregate conditions with GROUP BY.',
  },
  {
    regex: /\bFORCE\s+INDEX\b/i,
    title: 'FORCE INDEX detected',
    description: 'FORCE INDEX overrides the optimizer\'s choice. This can cause problems when data distribution changes.',
    suggestion: 'Remove FORCE INDEX and let the optimizer choose, or investigate why it picks the wrong index.',
  },
  {
    regex: /\bSQL_CALC_FOUND_ROWS\b/i,
    title: 'SQL_CALC_FOUND_ROWS is deprecated',
    description: 'SQL_CALC_FOUND_ROWS is deprecated in MySQL 8.0.17+ and slower than a separate COUNT(*) query.',
    suggestion: 'Use two separate queries: one for data and one for COUNT(*).',
    docLink: 'https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_found-rows',
  },
  {
    regex: /\bSELECT\b[^;]*\bUNION\b\s+(?!ALL)/i,
    title: 'UNION (without ALL) implies DISTINCT',
    description: 'UNION without ALL deduplicates results, requiring a sort or hash. If duplicates are acceptable or impossible, use UNION ALL.',
    suggestion: 'Replace UNION with UNION ALL if you don\'t need deduplication.',
  },
  {
    regex: /\bSELECT\b[\s\S]*\(\s*SELECT\b[\s\S]*\bFROM\b[\s\S]*\bWHERE\b/i,
    title: 'Scalar subquery in SELECT — rewrite as LEFT JOIN',
    description: 'A correlated scalar subquery in the SELECT list re-executes for every row of the outer query. This is O(n*m) complexity and the biggest performance killer for this pattern.',
    suggestion: 'Rewrite as: SELECT t1.col, COALESCE(SUM(t2.amount), 0) FROM t1 LEFT JOIN t2 ON t2.fk = t1.id GROUP BY t1.id, t1.col. The LEFT JOIN + COALESCE ensures rows with no match show 0 instead of NULL.',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/correlated-subqueries.html',
  },
  {
    regex: /\bGROUP\s+BY\s+\w+\.(?:name|title|label|description)\b/i,
    title: 'GROUP BY on non-unique name column — potential logic bug',
    description: 'Grouping by a name/title column (not a primary key) will merge rows from different records that happen to share the same name. Two customers named "John Smith" would have their data combined.',
    suggestion: 'GROUP BY the primary key instead: GROUP BY t.id, t.name. This ensures each record is grouped separately while still allowing the name in the SELECT.',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/group-by-handling.html',
  },
  // Phase 2 additions:
  {
    regex: /\bGROUP\s+BY\b(?![\s\S]*\bORDER\s+BY\b)/i,
    title: 'GROUP BY without ORDER BY (MySQL 8.4+)',
    description: 'Since MySQL 8.0.13, GROUP BY no longer implies sorting. In MySQL 8.4 there is no implicit ORDER BY from GROUP BY at all.',
    suggestion: 'If you need sorted output, always add an explicit ORDER BY clause.',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html',
  },
  {
    regex: /\bNOT\s+IN\s*\(\s*SELECT\b/i,
    title: 'NOT IN with subquery — watch for NULLs',
    description: 'If the subquery column is nullable, NOT IN returns UNKNOWN (not FALSE) when a NULL is present, which may return no rows unexpectedly. Also prevents antijoin optimization.',
    suggestion: 'Use NOT EXISTS instead, or ensure the subquery column is NOT NULL.',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/subquery-optimization-with-exists.html',
  },
  {
    regex: /\bORDER\s+BY\b[\s\S]*\bLIMIT\b(?![\s\S]*,[\s\S]*\b(?:id|pk|uuid)\b)/i,
    title: 'ORDER BY + LIMIT without unique tiebreaker',
    description: 'If multiple rows have identical ORDER BY values, MySQL may return them in any order — results can differ between executions.',
    suggestion: 'Add a unique column (e.g., primary key) to ORDER BY for deterministic results: ORDER BY col, id.',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html',
  },
  {
    regex: /\bSTRAIGHT_JOIN\b/i,
    title: 'STRAIGHT_JOIN forces join order',
    description: 'STRAIGHT_JOIN prevents the optimizer from reordering tables and disables semijoin transformations. Use only when you are certain about the optimal order.',
    suggestion: 'Remove STRAIGHT_JOIN and let the optimizer choose. Use EXPLAIN to verify the plan is acceptable without it.',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/join.html',
  },
  {
    regex: /\bSELECT\s+(?:SQL_)?BUFFER_RESULT\b/i,
    title: 'SQL_BUFFER_RESULT forces result buffering',
    description: 'SQL_BUFFER_RESULT forces MySQL to put the result into a temporary table, which releases table locks sooner but uses extra memory.',
    suggestion: 'Only use when you need early lock release on large result sets.',
  },
  {
    regex: /\bORDER\s+BY\b[^;]*\b(?:ASC\b[^;]*\bDESC|DESC\b[^;]*\bASC)\b/i,
    title: 'Mixed ASC/DESC in ORDER BY',
    description: 'Mixed sort directions (e.g., ORDER BY a ASC, b DESC) can only use an index if the index was created with matching directions (MySQL 8.0+ descending indexes).',
    suggestion: 'Create a descending index: CREATE INDEX idx ON tbl (a ASC, b DESC). Or accept filesort if the table is small.',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/descending-indexes.html',
  },
  {
    regex: /\bCOUNT\s*\(\s*DISTINCT\b/i,
    title: 'COUNT(DISTINCT ...) can be expensive',
    description: 'COUNT(DISTINCT) requires deduplication before counting, often using a temporary table. For large datasets this is slow.',
    suggestion: 'Consider using an approximate count (HyperLogLog via application) for analytics, or ensure the DISTINCT columns have an index.',
  },
  // ── New patterns from adversarial testing ──
  {
    regex: /WHERE\s+(?:\w+\.)?(\w+)\s*=\s*'[^']*'/i,
    title: 'Possible implicit type conversion',
    description: 'Comparing a numeric column with a string value forces MySQL to convert every row, preventing index use. Check that the value type matches the column type.',
    suggestion: 'If the column is INT/BIGINT, use a numeric literal: WHERE tenant_id = 100 (not \'100\').',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/type-conversion.html',
  },
  {
    regex: /\bWHERE\b[^;]*\b\w+\s*=\s*'[^']*'\s+OR\s+\w+\s*=\s*'[^']*'/i,
    title: 'OR on different columns — consider UNION',
    description: 'OR conditions on different columns typically prevent MySQL from using any single index. The optimizer may fall back to a full table scan.',
    suggestion: 'Rewrite as UNION ALL of two queries, each using its own index: SELECT ... WHERE col1 = val UNION ALL SELECT ... WHERE col2 = val.',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/index-merge-optimization.html',
  },
  {
    regex: /\bSELECT\s+DISTINCT\b[^;]*\bGROUP\s+BY\b/is,
    title: 'DISTINCT is redundant with GROUP BY',
    description: 'GROUP BY already produces unique groups. Adding DISTINCT does nothing but confuse readers and may add unnecessary overhead.',
    suggestion: 'Remove the DISTINCT keyword — GROUP BY already guarantees unique result rows.',
  },
  {
    regex: /\bLEFT\s+(?:OUTER\s+)?JOIN\b[\s\S]*?\bWHERE\b[\s\S]*?\b(\w+)\.(\w+)\s+IS\s+NOT\s+NULL/i,
    title: 'LEFT JOIN with IS NOT NULL on right table = INNER JOIN',
    description: 'Adding a WHERE condition on the right table of a LEFT JOIN (other than IS NULL) effectively converts it to an INNER JOIN, which is misleading and may confuse the optimizer.',
    suggestion: 'Replace LEFT JOIN with INNER JOIN (or just JOIN) for clarity. If you intended to include non-matching rows, move the condition to the ON clause.',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/outer-join-simplification.html',
  },
  {
    regex: /\bCOUNT\s*\(\s*(?!DISTINCT\b|\*\b)(\w+)\s*\)/i,
    title: 'COUNT(column) excludes NULLs — use COUNT(*) if you want all rows',
    description: 'COUNT(column) skips rows where that column is NULL. If you want to count all rows regardless of NULLs, use COUNT(*) which is also slightly faster.',
    suggestion: 'Use COUNT(*) unless you specifically need to exclude NULL values in that column.',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html#function_count',
  },
  {
    regex: /\bWHERE\b[^;]*(?:\w+\s*[\+\-\*\/]\s*\w+)\s*(?:>|<|>=|<=|=|!=|<>)/i,
    title: 'Arithmetic expression on column prevents index use',
    description: 'Performing arithmetic on a column in the WHERE clause (e.g., amount + tax > 200) prevents MySQL from using an index on that column.',
    suggestion: 'Rewrite to isolate the column: WHERE amount > 200 - tax. This lets MySQL use an index on the isolated column.',
  },
  {
    regex: /\bHAVING\s+(?:\w+\.)?(\w+)\s*(?:>|<|>=|<=|=|!=|<>|LIKE|IN\b|BETWEEN\b)/i,
    title: 'HAVING filters on non-aggregate column — use WHERE instead',
    description: 'HAVING is evaluated after GROUP BY aggregation. Filtering on a non-aggregate column in HAVING means MySQL processes and groups rows unnecessarily before filtering.',
    suggestion: 'Move the condition to WHERE (before GROUP BY) for better performance. HAVING should only filter on aggregate results (SUM, COUNT, etc.).',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/select.html',
  },
  {
    regex: /\bLIMIT\s+\d+\s+OFFSET\s+(\d+)/i,
    title: 'Large OFFSET pagination is slow',
    description: 'LIMIT with a large OFFSET forces MySQL to read and discard all preceding rows. OFFSET 50000 means scanning 50,000 rows before returning any.',
    suggestion: 'Use keyset (cursor) pagination: WHERE id > :last_seen_id ORDER BY id LIMIT :count. This uses the index to skip directly to the right position.',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html',
  },
]

export function analyzeQuery(query: string): QueryHint[] {
  const hints: QueryHint[] = []

  for (const p of patterns) {
    if (p.regex.test(query)) {
      hints.push({
        title: p.title,
        description: p.description,
        pattern: query.match(p.regex)?.[0] ?? '',
        suggestion: p.suggestion,
        docLink: p.docLink,
      })
    }
  }

  // Function-based checks that are too complex for regex

  // Detect unbounded SELECT on large table (no LIMIT)
  detectUnboundedQuery(query, hints)

  // Detect unused JOIN tables — table joined but no column referenced in SELECT
  detectUnusedJoinTables(query, hints)

  // Detect large OFFSET (> 1000)
  detectLargeOffset(query, hints)

  // Detect HAVING on non-aggregate where existing pattern didn't fire
  detectHavingOnNonAggregate(query, hints)

  return hints
}

function detectUnboundedQuery(query: string, hints: QueryHint[]) {
  // SELECT without LIMIT on a non-aggregate query
  const isSelect = /^\s*SELECT\b/i.test(query)
  const hasLimit = /\bLIMIT\b/i.test(query)
  const isAggregate = /\b(?:COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(query)
  const hasGroupBy = /\bGROUP\s+BY\b/i.test(query)

  // Skip aggregates (they naturally return few rows) and GROUP BY (bounded by groups)
  if (!isSelect || hasLimit || isAggregate) return
  // GROUP BY without aggregates is still bounded by group count — skip
  if (hasGroupBy) return

  hints.push({
    title: 'Unbounded SELECT — no LIMIT clause',
    description: 'This query has no LIMIT and could return millions of rows on a large table. Without a LIMIT, the entire result set must be transmitted to the client, consuming memory and network bandwidth.',
    pattern: 'SELECT ... (no LIMIT)',
    suggestion: 'Add a LIMIT clause to bound the result set: SELECT ... LIMIT 1000. For APIs and dashboards, always paginate.',
    docLink: 'https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html',
  })
}

function detectUnusedJoinTables(query: string, hints: QueryHint[]) {
  // Extract joined table aliases
  const joinRegex = /\bJOIN\s+(\w+)\s+(\w+)\b/gi
  const selectMatch = query.match(/\bSELECT\b([\s\S]*?)\bFROM\b/i)
  if (!selectMatch) return

  const selectClause = selectMatch[1]
  let match
  while ((match = joinRegex.exec(query)) !== null) {
    const tableName = match[1]
    const alias = match[2]
    // Check if the alias appears in the SELECT clause
    const aliasInSelect = new RegExp(`\\b${alias}\\.`, 'i').test(selectClause)
    const tableInSelect = new RegExp(`\\b${tableName}\\.`, 'i').test(selectClause)
    // Also check if used in aggregate functions
    const inAggregate = new RegExp(`(?:SUM|COUNT|AVG|MIN|MAX)\\s*\\([^)]*\\b${alias}\\.`, 'i').test(selectClause)

    if (!aliasInSelect && !tableInSelect && !inAggregate) {
      // Check it's not already in the WHERE clause of a useful filter
      const whereMatch = query.match(/\bWHERE\b([\s\S]*?)(?:\bGROUP\b|\bORDER\b|\bLIMIT\b|\bHAVING\b|;|$)/i)
      const aliasInWhere = whereMatch && new RegExp(`\\b${alias}\\.\\w+\\s*(?:=|<|>|!=|LIKE|IN|IS)`, 'i').test(whereMatch[1])

      if (!aliasInWhere) {
        hints.push({
          title: `Unnecessary JOIN — \`${tableName}\` columns not used in SELECT`,
          description: `Table \`${tableName}\` (alias: ${alias}) is joined but none of its columns appear in the SELECT clause or aggregate functions. This inflates the row count without adding data to the result.`,
          pattern: match[0],
          suggestion: `Remove the JOIN on \`${tableName}\` unless it's needed for filtering. If it's used for an EXISTS check, rewrite as: WHERE EXISTS (SELECT 1 FROM ${tableName} WHERE ...).`,
        })
      }
    }
  }
}

function detectLargeOffset(query: string, hints: QueryHint[]) {
  // LIMIT x OFFSET y format
  const offsetMatch = query.match(/\bLIMIT\s+\d+\s+OFFSET\s+(\d+)/i)
  if (offsetMatch && parseInt(offsetMatch[1]) > 1000) {
    // Already handled by regex pattern above
    return
  }
  // LIMIT y, x format (MySQL's LIMIT offset, count)
  const limitMatch = query.match(/\bLIMIT\s+(\d+)\s*,\s*\d+/i)
  if (limitMatch && parseInt(limitMatch[1]) > 1000) {
    if (!hints.some(h => h.title.includes('OFFSET'))) {
      hints.push({
        title: 'Large OFFSET pagination is slow',
        description: `OFFSET ${limitMatch[1]} forces MySQL to read and discard ${parseInt(limitMatch[1]).toLocaleString()} rows before returning results.`,
        pattern: limitMatch[0],
        suggestion: 'Use keyset (cursor) pagination: WHERE id > :last_seen_id ORDER BY id LIMIT :count.',
        docLink: 'https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html',
      })
    }
  }
}

function detectHavingOnNonAggregate(query: string, hints: QueryHint[]) {
  if (!hints.some(h => h.title.includes('HAVING'))) return // Only if HAVING hint already fired

  const havingMatch = query.match(/\bHAVING\s+([\s\S]*?)(?:\bORDER\b|\bLIMIT\b|;|$)/i)
  if (!havingMatch) return

  const havingClause = havingMatch[1]
  // Check if the HAVING clause references any aggregate function
  const hasAggregate = /\b(?:SUM|COUNT|AVG|MIN|MAX)\s*\(/i.test(havingClause)
  if (!hasAggregate) {
    // HAVING without aggregate = should be WHERE
    if (!hints.some(h => h.title.includes('non-aggregate'))) {
      hints.push({
        title: 'HAVING filters on non-aggregate column — use WHERE instead',
        description: 'This HAVING clause doesn\'t reference any aggregate function (SUM, COUNT, etc.). The condition is evaluated after GROUP BY, meaning MySQL groups all rows before filtering.',
        pattern: havingMatch[0],
        suggestion: 'Move the condition to WHERE (before GROUP BY) for better performance.',
        docLink: 'https://dev.mysql.com/doc/refman/8.4/en/select.html',
      })
    }
  }
}
