import { createNode, type PlanNode, type AccessType } from './types'

/**
 * Parse MySQL EXPLAIN FORMAT=JSON output.
 */
export function parseJsonFormat(input: string): PlanNode {
  const json = JSON.parse(input)

  // MySQL wraps everything in query_block
  const queryBlock = json.query_block ?? json
  return processQueryBlock(queryBlock, 0)
}

function processQueryBlock(block: any, depth: number): PlanNode {
  const children: PlanNode[] = []
  let operation = 'Query Block'
  let totalCost = 0

  if (block.cost_info?.query_cost) {
    totalCost = parseFloat(block.cost_info.query_cost)
  }

  // Process nested_loop
  if (block.nested_loop) {
    operation = 'Nested Loop'
    for (const item of block.nested_loop) {
      if (item.table) {
        children.push(processTable(item.table, depth + 1))
      }
    }
  }

  // Process ordering_operation
  if (block.ordering_operation) {
    const sortNode = processOrderingOperation(block.ordering_operation, depth + 1)
    children.push(sortNode)
  }

  // Process grouping_operation
  if (block.grouping_operation) {
    const groupNode = processGroupingOperation(block.grouping_operation, depth + 1)
    children.push(groupNode)
  }

  // Process duplicates_removal
  if (block.duplicates_removal) {
    const dedupNode = processDuplicatesRemoval(block.duplicates_removal, depth + 1)
    children.push(dedupNode)
  }

  // MariaDB: block-nl-join node
  if (block['block-nl-join']) {
    const bnl = block['block-nl-join']
    const bnlNode = createNode({
      operation: 'Block Nested Loop Join',
      extra: ['Using join buffer'],
      depth: depth + 1,
    })
    if (bnl.table) bnlNode.children.push(processTable(bnl.table, depth + 2))
    if (bnl.nested_loop) {
      for (const item of bnl.nested_loop) {
        if (item.table) bnlNode.children.push(processTable(item.table, depth + 2))
      }
    }
    children.push(bnlNode)
  }

  // MariaDB: filesort as a wrapper node
  // Structure: filesort → temporary_table → nested_loop → [tables]
  // Or: filesort → query_block / table
  if (block.filesort) {
    const fs = block.filesort
    const fsNode = createNode({
      operation: `Sort: ${fs.sort_key ?? 'filesort'}`,
      extra: ['Using filesort'],
      depth: depth + 1,
    })

    // filesort.temporary_table.nested_loop (most common MariaDB pattern)
    const tempTable = fs.temporary_table
    if (tempTable) {
      const tmpNode = createNode({
        operation: 'Aggregate using temporary table',
        extra: ['Using temporary'],
        depth: depth + 2,
      })

      if (tempTable.nested_loop) {
        for (const item of tempTable.nested_loop) {
          if (item.table) tmpNode.children.push(processTable(item.table, depth + 3))
        }
      }
      if (tempTable.table) {
        tmpNode.children.push(processTable(tempTable.table, depth + 3))
      }
      if (tempTable.query_block) {
        tmpNode.children.push(processQueryBlock(tempTable.query_block, depth + 3))
      }

      fsNode.children.push(tmpNode)
    }

    // filesort.query_block (direct)
    if (fs.query_block) {
      fsNode.children.push(processQueryBlock(fs.query_block, depth + 2))
    }
    // filesort.table (direct)
    if (fs.table) {
      fsNode.children.push(processTable(fs.table, depth + 2))
    }
    // filesort.nested_loop (without temporary_table wrapper)
    if (fs.nested_loop && !tempTable) {
      for (const item of fs.nested_loop) {
        if (item.table) fsNode.children.push(processTable(item.table, depth + 2))
      }
    }

    children.push(fsNode)
  }

  // MariaDB: materialized subquery
  if (block.materialized) {
    const matBlock = block.materialized.query_block ?? block.materialized
    const matNode = processQueryBlock(matBlock, depth + 1)
    matNode.operation = block.materialized.lateral ? 'Lateral Derived' : 'Materialized'
    matNode.selectType = block.materialized.lateral ? 'LATERAL DERIVED' : 'MATERIALIZED'
    children.push(matNode)
  }

  // Process table directly on query_block (simple queries)
  if (block.table) {
    children.push(processTable(block.table, depth + 1))
  }

  // Process subqueries
  if (block.optimized_away_subqueries) {
    for (const sq of block.optimized_away_subqueries) {
      if (sq.query_block) {
        const subNode = processQueryBlock(sq.query_block, depth + 1)
        subNode.operation = 'Optimized Away Subquery'
        subNode.selectType = 'SUBQUERY'
        children.push(subNode)
      }
    }
  }

  if (block.attached_subqueries) {
    for (const sq of block.attached_subqueries) {
      if (sq.query_block) {
        const subNode = processQueryBlock(sq.query_block, depth + 1)
        subNode.operation = sq.dependent ? 'Dependent Subquery' : 'Subquery'
        subNode.selectType = sq.dependent ? 'DEPENDENT SUBQUERY' : 'SUBQUERY'
        children.push(subNode)
      }
    }
  }

  // If only one child and root is just a wrapper, flatten
  if (children.length === 1 && operation === 'Query Block') {
    const child = children[0]
    child.estimatedCost = child.estimatedCost || totalCost
    child.depth = depth
    return child
  }

  return createNode({
    operation,
    estimatedCost: totalCost,
    estimatedRows: block.select_id ?? 0,
    selectType: block.select_type,
    children,
    depth,
  })
}

function processTable(table: any, depth: number): PlanNode {
  // Handle MariaDB compound access type: "eq_ref|filter"
  let rawAccessType = table.access_type ?? ''
  let accessModifier: string | undefined
  if (rawAccessType.includes('|')) {
    const parts = rawAccessType.split('|')
    rawAccessType = parts[0]
    accessModifier = parts.slice(1).join('|')
  }
  const accessType = normalizeAccessType(rawAccessType)
  const extra = extractExtraFromTable(table)

  // Cost: MySQL uses cost_info object, MariaDB may not have it
  let cost = 0
  if (table.cost_info) {
    cost = parseFloat(table.cost_info.read_cost ?? '0') +
      parseFloat(table.cost_info.eval_cost ?? '0') +
      parseFloat(table.cost_info.sort_cost ?? '0')
  }

  // Rows: MySQL uses rows_examined_per_scan/rows_produced_per_join, MariaDB uses flat "rows"
  const rows = table.rows_examined_per_scan ?? table.rows_produced_per_join ?? table.rows ?? 0

  let operation = `${accessType === 'ALL' ? 'Table scan' : 'Index lookup'} on ${table.table_name}`
  if (table.key) {
    operation += ` using ${table.key}`
  }

  // MariaDB ANALYZE FORMAT=JSON runtime fields
  const rRows = table.r_rows != null ? parseFloat(table.r_rows) : undefined
  const rFiltered = table.r_filtered != null ? parseFloat(table.r_filtered) : undefined
  const rLoops = table.r_loops != null ? parseInt(table.r_loops) : undefined
  const rTotalTimeMs = table.r_total_time_ms != null ? parseFloat(table.r_total_time_ms) : undefined

  // MariaDB rowid filter
  const rowidFilter = !!table.rowid_filter || accessModifier === 'filter'
  if (table.rowid_filter) {
    extra.push('Using rowid filter')
  }

  // possible_keys: MySQL may use object keys, MariaDB uses array
  let possibleKeys: string[] | undefined
  if (table.possible_keys) {
    possibleKeys = Array.isArray(table.possible_keys)
      ? table.possible_keys
      : Object.keys(table.possible_keys)
  }

  return createNode({
    operation,
    table: table.table_name,
    accessType,
    accessModifier,
    index: table.key ?? undefined,
    possibleKeys,
    estimatedRows: rows,
    estimatedCost: cost,
    filtered: table.filtered ? parseFloat(table.filtered) : undefined,
    condition: table.attached_condition,
    extra,
    usedColumns: table.used_columns,
    keyLength: table.key_length ? parseInt(table.key_length) : undefined,
    selectType: table.select_type,
    rRows,
    rFiltered,
    rLoops,
    rTotalTimeMs,
    rowidFilter,
    depth,
  })
}

function processOrderingOperation(op: any, depth: number): PlanNode {
  const children: PlanNode[] = []

  if (op.nested_loop) {
    for (const item of op.nested_loop) {
      if (item.table) {
        children.push(processTable(item.table, depth + 1))
      }
    }
  }

  if (op.query_block) {
    children.push(processQueryBlock(op.query_block, depth + 1))
  }

  if (op.grouping_operation) {
    children.push(processGroupingOperation(op.grouping_operation, depth + 1))
  }

  const extra: string[] = []
  if (op.using_filesort) extra.push('Using filesort')
  if (op.using_temporary_table) extra.push('Using temporary')

  return createNode({
    operation: 'Sort' + (op.using_filesort ? ' (filesort)' : ''),
    extra,
    estimatedCost: op.cost_info ? parseFloat(op.cost_info.sort_cost ?? '0') : 0,
    children,
    depth,
  })
}

function processGroupingOperation(op: any, depth: number): PlanNode {
  const children: PlanNode[] = []

  if (op.nested_loop) {
    for (const item of op.nested_loop) {
      if (item.table) {
        children.push(processTable(item.table, depth + 1))
      }
    }
  }

  if (op.ordering_operation) {
    children.push(processOrderingOperation(op.ordering_operation, depth + 1))
  }

  const extra: string[] = []
  if (op.using_temporary_table) extra.push('Using temporary')
  if (op.using_filesort) extra.push('Using filesort')

  return createNode({
    operation: 'Group' + (op.using_temporary_table ? ' (temporary table)' : ''),
    extra,
    children,
    depth,
  })
}

function processDuplicatesRemoval(op: any, depth: number): PlanNode {
  const children: PlanNode[] = []

  if (op.nested_loop) {
    for (const item of op.nested_loop) {
      if (item.table) {
        children.push(processTable(item.table, depth + 1))
      }
    }
  }

  return createNode({
    operation: 'Duplicates Removal',
    extra: ['Using temporary'],
    children,
    depth,
  })
}

function normalizeAccessType(type: string | undefined): AccessType | undefined {
  if (!type) return undefined
  const map: Record<string, AccessType> = {
    system: 'system',
    const: 'const',
    eq_ref: 'eq_ref',
    ref: 'ref',
    fulltext: 'fulltext',
    ref_or_null: 'ref_or_null',
    index_merge: 'index_merge',
    unique_subquery: 'unique_subquery',
    index_subquery: 'index_subquery',
    range: 'range',
    index: 'index',
    ALL: 'ALL',
  }
  return map[type] ?? undefined
}

function extractExtraFromTable(table: any): string[] {
  const extra: string[] = []

  if (table.using_index) extra.push('Using index')
  if (table.using_index_condition) extra.push('Using index condition')
  if (table.using_MRR) extra.push('Using MRR')
  if (table.using_join_buffer) extra.push('Using join buffer')
  if (table.using_filesort) extra.push('Using filesort')
  if (table.using_temporary_table) extra.push('Using temporary')
  if (table.distinct) extra.push('Distinct')
  if (table.access_type === 'ALL') extra.push('Full table scan')

  return extra
}
