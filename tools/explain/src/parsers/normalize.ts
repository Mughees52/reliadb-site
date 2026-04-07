import { detectFormat } from './detect-format'
import { parseTreeFormat } from './tree-parser'
import { parseJsonFormat } from './json-parser'
import { parseTableFormat } from './traditional-parser'
import { computeStats, type ParseResult } from './types'

export function parsePlan(input: string): ParseResult {
  const format = detectFormat(input)
  const warnings: string[] = []

  if (format === 'unknown') {
    return {
      root: { id: 'error', operation: 'Could not parse', estimatedRows: 0, estimatedCost: 0, isBottleneck: false, children: [], depth: 0 },
      stats: { totalCost: 0, totalRows: 0, nodeCount: 0, maxDepth: 0, tablesAccessed: [], indexesUsed: [], hasFilesort: false, hasTempTable: false, hasFullScan: false },
      format: 'unknown',
      warnings: ['Could not detect EXPLAIN format. Supported formats: EXPLAIN ANALYZE (tree), EXPLAIN FORMAT=JSON, traditional EXPLAIN table.'],
    }
  }

  let root

  try {
    switch (format) {
      case 'tree':
        root = parseTreeFormat(input)
        break
      case 'json':
        root = parseJsonFormat(input)
        break
      case 'table':
        root = parseTableFormat(input)
        warnings.push('Traditional EXPLAIN format has limited information. Use EXPLAIN ANALYZE or EXPLAIN FORMAT=JSON for better analysis.')
        break
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return {
      root: { id: 'error', operation: 'Parse Error', estimatedRows: 0, estimatedCost: 0, isBottleneck: false, children: [], depth: 0 },
      stats: { totalCost: 0, totalRows: 0, nodeCount: 0, maxDepth: 0, tablesAccessed: [], indexesUsed: [], hasFilesort: false, hasTempTable: false, hasFullScan: false },
      format,
      warnings: [`Failed to parse ${format} format: ${msg}`],
    }
  }

  const stats = computeStats(root)

  return { root, stats, format, warnings }
}
