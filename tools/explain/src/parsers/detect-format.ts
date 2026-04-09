import type { ExplainFormat, DatabaseEngine } from './types'

export interface DetectionResult {
  format: ExplainFormat
  engine: DatabaseEngine
}

export function detectFormat(input: string): ExplainFormat {
  return detect(input).format
}

export function detect(input: string): DetectionResult {
  const trimmed = input.trim()
  if (!trimmed) return { format: 'unknown', engine: 'unknown' }

  // Step 1: Strip MySQL/MariaDB result wrapper if present (| ... | with +---+ borders)
  // This allows detecting JSON/tree content inside the wrapper
  const unwrapped = stripResultWrapper(trimmed)

  // JSON format: starts with { or [
  const jsonCandidate = unwrapped.trim()
  if (jsonCandidate.startsWith('{') || jsonCandidate.startsWith('[')) {
    try {
      const json = JSON.parse(jsonCandidate)
      const engine = detectJsonEngine(json)
      return { format: 'json', engine }
    } catch {
      // malformed JSON, fall through
    }
  }

  // Tree format: contains lines with -> followed by EXPLAIN ANALYZE node content
  // Must distinguish from MariaDB/MySQL CLI continuation prompts like "    -> SELECT"
  // EXPLAIN ANALYZE nodes look like: "-> Nested loop inner join", "-> Table scan on t", "-> Filter:"
  const lines = unwrapped.split('\n')
  // Tree node patterns always have specific structure after the keyword:
  // "-> Limit: 100 row(s)", "-> Table scan on t", "-> Filter: (condition)"
  // SQL continuation: "-> LIMIT 100;", "-> SELECT ..." — followed by SQL, not plan syntax
  // Key difference: tree nodes have "(cost=..." or "(actual time=..." or "on tablename" or ":"
  const treeNodePattern = /^\s*->\s+(?:Nested loop|Table scan|Index (?:lookup|range|scan|skip)|Filter:|Sort[: ]|Limit[:/]|Aggregate|Single-row|Covering index|Hash (?:join|semi|anti)|Inner hash|Left hash|Materialize|Group aggregate|Group \(no|Duplicates|Select #|Window|Stream|Remove duplicate|Zero rows|Constant row|Scan new|Count rows|Rows fetched|Batched key|Full-text|Multi-range|Sample scan|Distance scan|Skip scan|Weedout|Invalidate|Delete from|Update)/i
  const wrappedTreePattern = /\|\s*->\s+(?:Nested loop|Table scan|Index (?:lookup|range|scan|skip)|Filter:|Sort[: ]|Limit[:/]|Aggregate|Single-row|Covering index|Hash (?:join|semi|anti)|Inner hash|Left hash|Materialize|Group aggregate|Group \(no|Duplicates|Select #|Window|Stream|Remove duplicate|Zero rows|Constant row|Scan new|Count rows|Rows fetched|Batched key|Full-text|Multi-range|Sample scan|Distance scan|Skip scan|Weedout|Invalidate|Delete from|Update)/i
  if (lines.some(line => treeNodePattern.test(line) || wrappedTreePattern.test(line))) {
    return { format: 'tree', engine: 'mysql' }
  }

  // Table format: +---+ borders or pipe-separated columns with id
  if (
    /^\|\s*id\s*\|/m.test(trimmed) ||
    /^\s*id\s+select_type\s+table/m.test(trimmed)
  ) {
    const engine = detectTableEngine(trimmed)
    return { format: 'table', engine }
  }

  // +---+ borders with EXPLAIN/ANALYZE header — check inner content
  if (trimmed.startsWith('+--') && /^\|\s*(?:EXPLAIN|ANALYZE)\s*\|/m.test(trimmed)) {
    // Already handled by unwrapped check above for JSON/tree
    // If we get here, it's an unrecognized wrapper format
    return { format: 'tree', engine: 'mysql' }
  }

  // Plain table with +---+ borders
  if (trimmed.startsWith('+--') && /\|\s*id\s*\|/m.test(trimmed)) {
    const engine = detectTableEngine(trimmed)
    return { format: 'table', engine }
  }

  return { format: 'unknown', engine: 'unknown' }
}

/**
 * Strip MySQL/MariaDB result set wrapper.
 * Removes +---+ borders, | EXPLAIN | headers, and | ... | pipe wrappers.
 */
export function stripWrapper(input: string): string {
  return stripResultWrapper(input)
}

function stripResultWrapper(input: string): string {
  const lines = input.split('\n')
  const contentLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Skip border lines: +---+
    if (/^\+[-+]+\+$/.test(trimmed)) continue
    // Skip header lines: | EXPLAIN | or | ANALYZE |
    if (/^\|\s*(?:EXPLAIN|ANALYZE)\s*\|$/i.test(trimmed)) continue
    // Skip mysql/mariadb prompt lines and SQL continuation prompts
    if (/^(?:mysql|MariaDB)\s*[\[>]/.test(trimmed)) continue
    if (/^(?:EXPLAIN|ANALYZE|SELECT|INSERT|UPDATE|DELETE|FROM|JOIN|WHERE|GROUP|ORDER|LIMIT|HAVING|SET)\b/i.test(trimmed)) continue
    // MariaDB/MySQL CLI continuation prompt: "    -> SELECT ...", "    -> u.user_id,"
    // Only skip these when they DON'T look like EXPLAIN ANALYZE tree nodes
    // Tree nodes always have: "-> Limit:" (colon), "-> Table scan on", "-> Filter: (", etc.
    if (/^\s*->\s/.test(trimmed) && !/^\s*->\s+(?:Nested loop|Table scan|Index (?:lookup|range|scan|skip)|Filter:|Sort[: ]|Limit[:/]|Aggregate|Single-row|Covering index|Hash (?:join|semi|anti)|Inner hash|Left hash|Materialize|Group aggregate|Group \(no|Duplicates|Select #|Window|Stream|Remove duplicate|Zero rows|Constant row|Scan new|Count rows|Rows fetched|Batched key|Full-text|Multi-range|Sample scan|Distance scan|Skip scan|Weedout|Invalidate|Delete from|Update)/i.test(trimmed)) continue
    if (/^\d+\s+rows?\s+in\s+set/.test(trimmed)) continue
    if (/^\d+\s+rows?\s+affected/.test(trimmed)) continue
    if (/^\d+\s+warnings?/.test(trimmed)) continue
    if (/^;/.test(trimmed)) continue

    // For multi-line cells: strip leading "| " and trailing " |"
    // The first content line starts with "| {" and the last ends with "} |"
    let content = trimmed
    if (content.startsWith('|')) {
      content = content.slice(1) // remove leading |
    }
    // Only strip trailing | if it's the cell border (not inside JSON)
    // Detect: line ends with " |" and the content before it is valid (not a JSON value containing |)
    if (content.endsWith('|') && !content.endsWith('||')) {
      const beforePipe = content.slice(0, -1).trimEnd()
      // If it looks like JSON closing or whitespace before pipe, strip it
      if (beforePipe.endsWith('}') || beforePipe.endsWith('"') || beforePipe.endsWith(']') || beforePipe === '' || /^\s*$/.test(beforePipe)) {
        content = beforePipe
      }
    }

    contentLines.push(content)
  }

  return contentLines.join('\n').trim()
}

/**
 * Detect engine from JSON EXPLAIN output.
 * MariaDB JSON has r_rows, r_filtered, r_total_time_ms fields and no cost_info.
 * MySQL JSON has cost_info, rows_examined_per_scan, rows_produced_per_join.
 */
function detectJsonEngine(json: any): DatabaseEngine {
  const block = json.query_block ?? json

  // Check for MariaDB-specific fields
  if (hasMariaDBJsonFields(block)) return 'mariadb'

  // Check for MySQL-specific fields
  if (hasMySQLJsonFields(block)) return 'mysql'

  return 'unknown'
}

function hasMariaDBJsonFields(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false
  // MariaDB ANALYZE FORMAT=JSON uses r_ prefixed runtime fields
  if ('r_rows' in obj || 'r_filtered' in obj || 'r_total_time_ms' in obj || 'r_loops' in obj) return true
  // MariaDB-specific nodes
  if ('block-nl-join' in obj || 'expression-cache' in obj) return true
  // Recurse into nested structures
  if (obj.table && hasMariaDBJsonFields(obj.table)) return true
  if (obj.nested_loop) {
    for (const item of obj.nested_loop) {
      if (item.table && hasMariaDBJsonFields(item.table)) return true
    }
  }
  if (obj.ordering_operation && hasMariaDBJsonFields(obj.ordering_operation)) return true
  return false
}

function hasMySQLJsonFields(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false
  // MySQL uses cost_info, rows_examined_per_scan
  if (obj.cost_info) return true
  if (obj.table && (obj.table.cost_info || obj.table.rows_examined_per_scan)) return true
  if (obj.nested_loop) {
    for (const item of obj.nested_loop) {
      if (item.table && (item.table.cost_info || item.table.rows_examined_per_scan)) return true
    }
  }
  return false
}

/**
 * Detect engine from table format EXPLAIN output.
 * MariaDB ANALYZE has r_rows and r_filtered columns.
 */
function detectTableEngine(input: string): DatabaseEngine {
  // MariaDB ANALYZE output has r_rows and r_filtered columns
  if (/\br_rows\b/i.test(input) || /\br_filtered\b/i.test(input)) return 'mariadb'

  // Can't tell from table format alone — default to mysql
  return 'mysql'
}
