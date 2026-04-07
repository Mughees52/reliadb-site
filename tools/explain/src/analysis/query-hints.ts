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
    regex: /SELECT\s+\*/i,
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
    regex: /WHERE\s+(?:YEAR|MONTH|DAY|DATE|HOUR|MINUTE|SECOND|UNIX_TIMESTAMP|DATE_FORMAT)\s*\(/i,
    title: 'Function on indexed column prevents index use',
    description: 'Wrapping a column in a function (YEAR(), DATE(), etc.) prevents MySQL from using the index on that column.',
    suggestion: 'Rewrite to compare the column directly. E.g., instead of WHERE YEAR(created_at) = 2024, use WHERE created_at >= \'2024-01-01\' AND created_at < \'2025-01-01\'',
    docLink: 'https://dev.mysql.com/doc/refman/8.0/en/index-btree-hash.html',
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
