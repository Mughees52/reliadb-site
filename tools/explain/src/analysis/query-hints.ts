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

  return hints
}
