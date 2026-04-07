import { createNode, type PlanNode, type AccessType } from './types'

/**
 * Parse traditional MySQL EXPLAIN table format output.
 *
 * Handles both bordered format:
 * +----+-------------+-------+------+...
 * | id | select_type | table | type |...
 *
 * And tab/space-separated format:
 * id  select_type  table  type  ...
 */
export function parseTableFormat(input: string): PlanNode {
  const rows = parseRows(input)
  if (rows.length === 0) {
    return createNode({ operation: 'Empty Plan' })
  }

  // Group by select id for subqueries
  const groups = new Map<number, typeof rows>()
  for (const row of rows) {
    const id = row.id ?? 1
    if (!groups.has(id)) groups.set(id, [])
    groups.get(id)!.push(row)
  }

  // Build tree: each id group becomes a level
  const rootChildren: PlanNode[] = []
  let totalCost = 0

  for (const [_id, groupRows] of groups) {
    for (const row of groupRows) {
      const node = rowToNode(row)
      totalCost += node.estimatedCost
      rootChildren.push(node)
    }
  }

  if (rootChildren.length === 1) {
    return rootChildren[0]
  }

  // Multiple tables = join
  const root = createNode({
    operation: inferJoinType(rows),
    estimatedCost: totalCost,
    estimatedRows: rootChildren[0]?.estimatedRows ?? 0,
    children: rootChildren,
    depth: 0,
  })

  rootChildren.forEach((child, i) => {
    child.parent = root
    child.depth = 1
  })

  return root
}

interface ExplainRow {
  id: number
  selectType: string
  table: string
  partitions?: string
  type: string
  accessModifier?: string  // MariaDB: "filter" from "eq_ref|filter"
  possibleKeys?: string[]
  key?: string
  keyLen?: number
  ref?: string
  rows: number
  filtered?: number
  extra?: string
  // MariaDB ANALYZE columns
  rRows?: number
  rFiltered?: number
}

function parseRows(input: string): ExplainRow[] {
  const lines = input.trim().split('\n').filter(l => l.trim())
  const rows: ExplainRow[] = []

  // Detect format: bordered (pipes) or plain
  const isBordered = lines.some(l => l.trim().startsWith('|'))

  if (isBordered) {
    // Find header line
    const headerIdx = lines.findIndex(l => /\|\s*id\s*\|/.test(l))
    if (headerIdx === -1) return rows

    const headers = parseTableLine(lines[headerIdx])

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith('+')) continue // border
      if (!line.startsWith('|')) continue

      const values = parseTableLine(line)
      if (values.length >= headers.length) {
        const row = mapToRow(headers, values)
        if (row) rows.push(row)
      }
    }
  } else {
    // Tab/space-separated
    const headerIdx = lines.findIndex(l => /^\s*id\s+(select_type|selectType)/i.test(l))
    if (headerIdx === -1) return rows

    const headers = lines[headerIdx].trim().split(/\s{2,}|\t/)

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const values = lines[i].trim().split(/\s{2,}|\t/)
      if (values.length >= 4) {
        const row = mapToRow(headers, values)
        if (row) rows.push(row)
      }
    }
  }

  return rows
}

function parseTableLine(line: string): string[] {
  return line
    .split('|')
    .filter((_v, i, arr) => i > 0 && i < arr.length - 1) // remove empty first/last
    .map(v => v.trim())
}

function mapToRow(headers: string[], values: string[]): ExplainRow | null {
  const get = (name: string): string => {
    const idx = headers.findIndex(h => h.toLowerCase().replace(/[_\s]/g, '') === name.toLowerCase().replace(/[_\s]/g, ''))
    return idx >= 0 && idx < values.length ? values[idx] : ''
  }

  const id = parseInt(get('id'))
  if (isNaN(id)) return null

  const possibleKeysStr = get('possible_keys') || get('possiblekeys')
  const possibleKeys = possibleKeysStr && possibleKeysStr !== 'NULL'
    ? possibleKeysStr.split(',').map(k => k.trim())
    : undefined

  const key = get('key')
  const keyLen = parseInt(get('key_len') || get('keylen'))

  // Handle MariaDB compound access type: "eq_ref|filter"
  const rawType = get('type') || 'ALL'
  let type = rawType
  let accessModifier: string | undefined
  if (rawType.includes('|')) {
    const parts = rawType.split('|')
    type = parts[0]
    accessModifier = parts.slice(1).join('|')
  }

  // MariaDB ANALYZE columns
  const rRowsStr = get('r_rows') || get('rrows')
  const rFilteredStr = get('r_filtered') || get('rfiltered')
  const rRows = rRowsStr ? parseFloat(rRowsStr) : undefined
  const rFiltered = rFilteredStr ? parseFloat(rFilteredStr) : undefined

  return {
    id,
    selectType: get('select_type') || get('selecttype') || 'SIMPLE',
    table: get('table'),
    partitions: get('partitions') || undefined,
    type,
    accessModifier,
    possibleKeys,
    key: key && key !== 'NULL' ? key : undefined,
    keyLen: isNaN(keyLen) ? undefined : keyLen,
    ref: get('ref') || undefined,
    rows: parseInt(get('rows')) || 0,
    filtered: parseFloat(get('filtered')) || undefined,
    extra: get('Extra') || get('extra') || undefined,
    rRows,
    rFiltered,
  }
}

function rowToNode(row: ExplainRow): PlanNode {
  const accessType = row.type as AccessType | undefined
  const extra = row.extra
    ? row.extra.split(/;\s*/).map(e => e.trim()).filter(Boolean)
    : []

  let operation = ''
  if (accessType === 'ALL') {
    operation = `Table scan on ${row.table}`
  } else if (row.key) {
    operation = `${accessType ?? 'Index'} lookup on ${row.table} using ${row.key}`
  } else {
    operation = `${accessType ?? 'Scan'} on ${row.table}`
  }

  const condition = extra.find(e => e.startsWith('Using where'))
    ? 'Using where'
    : undefined

  return createNode({
    operation,
    table: row.table,
    accessType: accessType && ['system', 'const', 'eq_ref', 'ref', 'fulltext', 'ref_or_null', 'index_merge', 'unique_subquery', 'index_subquery', 'range', 'index', 'ALL'].includes(accessType)
      ? accessType as AccessType
      : undefined,
    index: row.key,
    possibleKeys: row.possibleKeys,
    estimatedRows: row.rows,
    estimatedCost: row.rows, // Traditional format has no cost; use rows as proxy
    filtered: row.filtered,
    extra,
    keyLength: row.keyLen,
    selectType: row.selectType,
    condition,
    // MariaDB ANALYZE fields
    rRows: row.rRows,
    rFiltered: row.rFiltered,
    actualRows: row.rRows, // MariaDB r_rows = actual rows
    accessModifier: row.accessModifier,
    rowidFilter: row.accessModifier === 'filter' || extra.some(e => /rowid filter/i.test(e)),
    depth: 0,
  })
}

function inferJoinType(rows: ExplainRow[]): string {
  const types = rows.map(r => r.selectType.toUpperCase())
  if (types.some(t => t.includes('UNION'))) return 'Union'
  if (types.some(t => t.includes('SUBQUERY'))) return 'Query with Subquery'
  return 'Nested Loop Join'
}
