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
  const accessType = normalizeAccessType(table.access_type)
  const extra = extractExtraFromTable(table)

  let cost = 0
  if (table.cost_info) {
    cost = parseFloat(table.cost_info.read_cost ?? '0') +
      parseFloat(table.cost_info.eval_cost ?? '0') +
      parseFloat(table.cost_info.sort_cost ?? '0')
  }

  const rows = table.rows_examined_per_scan ?? table.rows_produced_per_join ?? 0

  let operation = `${accessType === 'ALL' ? 'Table scan' : 'Index lookup'} on ${table.table_name}`
  if (table.key) {
    operation += ` using ${table.key}`
  }

  return createNode({
    operation,
    table: table.table_name,
    accessType,
    index: table.key ?? undefined,
    possibleKeys: table.possible_keys ? Object.keys(table.possible_keys) :
      (Array.isArray(table.possible_keys) ? table.possible_keys : undefined),
    estimatedRows: rows,
    estimatedCost: cost,
    filtered: table.filtered ? parseFloat(table.filtered) : undefined,
    condition: table.attached_condition,
    extra,
    usedColumns: table.used_columns,
    keyLength: table.key_length ? parseInt(table.key_length) : undefined,
    selectType: table.select_type,
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
