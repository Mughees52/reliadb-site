import { detect, stripWrapper } from './detect-format'
import { parseTreeFormat } from './tree-parser'
import { parseJsonFormat } from './json-parser'
import { parseTableFormat } from './traditional-parser'
import { computeStats, type ParseResult } from './types'

export function parsePlan(input: string): ParseResult {
  const { format, engine } = detect(input)
  // Use unwrapped input for JSON parsing (strips | ... | borders)
  const cleanInput = stripWrapper(input)
  const warnings: string[] = []

  if (format === 'unknown') {
    return {
      root: { id: 'error', operation: 'Could not parse', estimatedRows: 0, estimatedCost: 0, isBottleneck: false, children: [], depth: 0 },
      stats: { totalCost: 0, totalRows: 0, nodeCount: 0, maxDepth: 0, tablesAccessed: [], indexesUsed: [], hasFilesort: false, hasTempTable: false, hasFullScan: false },
      format: 'unknown',
      engine: 'unknown',
      warnings: ['Could not detect EXPLAIN format. Supported formats: MySQL EXPLAIN ANALYZE (tree), EXPLAIN FORMAT=JSON, traditional EXPLAIN table, and MariaDB ANALYZE / ANALYZE FORMAT=JSON.'],
    }
  }

  let root

  try {
    switch (format) {
      case 'tree':
        root = parseTreeFormat(input)
        break
      case 'json':
        root = parseJsonFormat(cleanInput)
        break
      case 'table':
        root = parseTableFormat(input)
        if (engine === 'mariadb') {
          warnings.push('MariaDB ANALYZE table format detected. For richer analysis, use ANALYZE FORMAT=JSON.')
        } else {
          warnings.push('Traditional EXPLAIN format has limited information. Use EXPLAIN ANALYZE or EXPLAIN FORMAT=JSON for better analysis.')
        }
        break
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return {
      root: { id: 'error', operation: 'Parse Error', estimatedRows: 0, estimatedCost: 0, isBottleneck: false, children: [], depth: 0 },
      stats: { totalCost: 0, totalRows: 0, nodeCount: 0, maxDepth: 0, tablesAccessed: [], indexesUsed: [], hasFilesort: false, hasTempTable: false, hasFullScan: false },
      format,
      engine,
      warnings: [`Failed to parse ${format} format: ${msg}`],
    }
  }

  const stats = computeStats(root)

  return { root, stats, format, engine, warnings }
}
