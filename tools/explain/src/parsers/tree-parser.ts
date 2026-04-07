import { createNode, type PlanNode } from './types'

/**
 * Parse MySQL EXPLAIN ANALYZE tree format output.
 *
 * Handles:
 * - Raw tree output (lines starting with ->)
 * - MySQL result-wrapped output (| -> ... | with +---+ borders)
 * - Dependent subquery markers (Select #N)
 * - Decimal row counts (rows=0.25)
 * - Lines without cost info (e.g., Aggregate, Sort, Limit)
 */
export function parseTreeFormat(input: string): PlanNode {
  const cleaned = stripMySQLWrapper(input)
  const lines = cleaned.split('\n').filter(line => line.trim().length > 0)
  const stack: { node: PlanNode; indent: number }[] = []
  let root: PlanNode | null = null

  for (const line of lines) {
    // Handle "Select #N (subquery ...)" lines — marks dependent subqueries
    // Can appear as "Select #2 (...)" or "-> Select #2 (...)"
    const selectMatch = line.match(/^(\s*)(?:->\s*)?Select\s+#\d+\s*\((.+)\)/)
    if (selectMatch) {
      const indent = selectMatch[1].length
      const desc = selectMatch[2]
      const isDependent = /dependent/i.test(desc)
      const node = createNode({
        id: `tree-select-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        operation: `Subquery: ${desc}`,
        selectType: isDependent ? 'DEPENDENT SUBQUERY' : 'SUBQUERY',
        depth: 0,
      })

      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop()
      }

      if (stack.length === 0) {
        if (root) {
          // Subquery is a sibling of root — wrap both
          const wrapper = createNode({ operation: 'Query', depth: 0 })
          root.parent = wrapper
          root.depth = 1
          wrapper.children.push(root)
          node.parent = wrapper
          node.depth = 1
          wrapper.children.push(node)
          root = wrapper
        } else {
          root = node
        }
      } else {
        const parent = stack[stack.length - 1].node
        parent.children.push(node)
        node.parent = parent
        node.depth = parent.depth + 1
      }

      stack.push({ node, indent })
      continue
    }

    const arrowIdx = line.indexOf('->')
    if (arrowIdx === -1) continue

    const indent = arrowIdx
    const content = line.slice(arrowIdx).trim()
    const node = parseTreeLine(content, stack.length)

    // Find parent
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }

    if (stack.length === 0) {
      root = node
    } else {
      const parent = stack[stack.length - 1].node
      parent.children.push(node)
      node.parent = parent
      node.depth = parent.depth + 1
    }

    stack.push({ node, indent })
  }

  return root ?? createNode({ operation: 'Empty Plan' })
}

/**
 * Strip MySQL result wrapper:
 * +---...---+
 * | EXPLAIN |
 * +---...---+
 * | -> ...  |
 * +---...---+
 *
 * Also handles pasted output with "mysql>" prompts and "N rows in set" lines.
 */
function stripMySQLWrapper(input: string): string {
  const lines = input.split('\n')
  const result: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip border lines
    if (/^\+[-+]+\+$/.test(trimmed)) continue

    // Skip header rows like "| EXPLAIN |"
    if (/^\|\s*EXPLAIN\s*\|$/.test(trimmed)) continue

    // Skip mysql prompt lines
    if (/^mysql>/.test(trimmed)) continue

    // Skip "N row(s) in set" lines
    if (/^\d+\s+rows?\s+in\s+set/.test(trimmed)) continue

    // Skip continuation prompt lines
    if (/^\s*->(?:\s|$)/.test(trimmed) && !trimmed.includes('(') && trimmed.length < 5) continue

    // Strip pipe wrappers: "| -> content |" → "-> content"
    const pipeMatch = trimmed.match(/^\|\s*(.*?)\s*\|$/)
    if (pipeMatch) {
      result.push(pipeMatch[1])
    } else {
      result.push(line)
    }
  }

  return result.join('\n')
}

function parseTreeLine(line: string, index: number): PlanNode {
  // Remove leading ->
  let content = line.replace(/^->\s*/, '')

  // Extract actual metrics: (actual time=A..B rows=C loops=D)
  // rows can be decimal (e.g., rows=0.25)
  let actualTimeFirst: number | undefined
  let actualTimeLast: number | undefined
  let actualRows: number | undefined
  let loops: number | undefined

  const actualRegex = /\(actual time=([0-9.]+)\.\.([0-9.]+)\s+rows=([0-9.]+)\s+loops=(\d+)\)/
  const actualMatch = content.match(actualRegex)
  if (actualMatch) {
    actualTimeFirst = parseFloat(actualMatch[1])
    actualTimeLast = parseFloat(actualMatch[2])
    actualRows = parseFloat(actualMatch[3])  // can be fractional
    loops = parseInt(actualMatch[4])
    content = content.replace(actualRegex, '').trim()
  }

  // Handle (never executed) marker
  const neverExec = /\(never executed\)/.test(content)
  if (neverExec) {
    content = content.replace(/\(never executed\)/, '').trim()
    actualTimeFirst = 0
    actualTimeLast = 0
    actualRows = 0
    loops = 0
  }

  // Extract estimated metrics: (cost=X rows=Y)
  // rows can be decimal (e.g., rows=1.6)
  let estimatedCost = 0
  let estimatedRows = 0

  const costRegex = /\(cost=([0-9.]+)\s+rows=([0-9.]+)\)/
  const costMatch = content.match(costRegex)
  if (costMatch) {
    estimatedCost = parseFloat(costMatch[1])
    estimatedRows = parseFloat(costMatch[2])
    content = content.replace(costRegex, '').trim()
  }

  // Clean up extra info like "limit input to 10 row(s) per chunk"
  content = content.replace(/,\s*limit input to \d+ row\(s\) per chunk/, '').trim()

  // Extract operation name and details
  const operation = content.trim()

  const table = extractTable(operation)
  const index2 = extractIndex(operation)
  const accessType = inferAccessType(operation)
  const condition = extractCondition(operation)
  const extra = inferExtra(operation)

  return createNode({
    id: `tree-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    operation,
    table,
    index: index2,
    accessType,
    condition,
    extra,
    estimatedCost,
    estimatedRows,
    actualTimeFirst,
    actualTimeLast,
    actualRows,
    loops,
    depth: 0,
  })
}

function extractTable(op: string): string | undefined {
  // "Table scan on orders" -> "orders"
  // "Index lookup on oi using order_id" -> "oi"
  // "Single-row index lookup on c using PRIMARY" -> "c"
  // "Covering index scan on o using customer_id" -> "o"
  // "Table scan on <temporary>" -> "<temporary>"
  const onMatch = op.match(/\bon\s+(<?\w+>?)/i)
  return onMatch ? onMatch[1] : undefined
}

function extractIndex(op: string): string | undefined {
  // "using PRIMARY" -> "PRIMARY"
  // "using customer_id" -> "customer_id"
  // "using order_id (order_id=o.id)" -> "order_id"
  // But NOT: "using temporary table", "using filesort", "using join buffer"
  const usingMatch = op.match(/\busing\s+(\w+)/i)
  if (!usingMatch) return undefined
  const word = usingMatch[1].toLowerCase()
  if (['temporary', 'filesort', 'join', 'index', 'where', 'mrr'].includes(word)) return undefined
  return usingMatch[1]
}

function inferAccessType(op: string): PlanNode['accessType'] {
  const lower = op.toLowerCase()

  if (lower.includes('table scan')) return 'ALL'
  if (lower.includes('full index scan')) return 'index'
  if (lower.includes('covering index scan')) return 'index'
  if (lower.includes('index scan on')) return 'index'
  if (lower.includes('index range scan')) return 'range'
  if (lower.includes('single-row index lookup')) return 'eq_ref'
  if (lower.includes('single-row covering')) return 'eq_ref'
  if (lower.includes('index lookup')) return 'ref'
  if (lower.includes('covering index lookup')) return 'ref'
  if (lower.includes('fulltext index')) return 'fulltext'

  return undefined
}

function extractCondition(op: string): string | undefined {
  // "Filter: ((orders.`status` = 'delivered') and (year(orders.order_date) = 2024))"
  // Need to handle nested parentheses — find "Filter: " then grab balanced parens
  const filterIdx = op.indexOf('Filter:')
  if (filterIdx !== -1) {
    const rest = op.slice(filterIdx + 7).trim()
    if (rest.startsWith('(')) {
      // Find balanced closing paren
      let depth = 0
      for (let i = 0; i < rest.length; i++) {
        if (rest[i] === '(') depth++
        if (rest[i] === ')') depth--
        if (depth === 0) {
          return rest.slice(1, i) // strip outer parens
        }
      }
      return rest.slice(1, -1) // fallback: strip first/last
    }
  }

  // Conditions in parentheses after "using INDEX (col=expr)"
  const condMatch = op.match(/\busing\s+\w+\s+\(([^)]*=\s*[^)]+)\)/)
  if (condMatch) return condMatch[1]

  return undefined
}

function inferExtra(op: string): string[] {
  const extras: string[] = []
  const lower = op.toLowerCase()

  if (lower.includes('filesort') || lower.startsWith('sort:') || lower.startsWith('sort ')) extras.push('Using filesort')
  if (lower.includes('temporary table') || lower.includes('aggregate using temporary')) extras.push('Using temporary')
  if (lower.includes('table scan') && !lower.includes('<temporary>')) extras.push('Full table scan')
  if (lower.includes('covering index')) extras.push('Using index')
  if (lower.includes('index condition')) extras.push('Using index condition')
  if (lower.includes('mrr')) extras.push('Using MRR')
  if (lower.includes('join buffer')) extras.push('Using join buffer')

  return extras
}
