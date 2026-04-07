import type { ExplainFormat } from './types'

export function detectFormat(input: string): ExplainFormat {
  const trimmed = input.trim()
  if (!trimmed) return 'unknown'

  // JSON format: starts with { or [
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch {
      // malformed JSON, fall through
    }
  }

  // Tree format: contains lines with -> operator
  // Handles both raw tree and MySQL result-wrapped tree (| -> ... |)
  const lines = trimmed.split('\n')
  if (lines.some(line => /^\s*->/.test(line) || /\|\s*->/.test(line))) {
    return 'tree'
  }

  // Table format: +---+ borders or pipe-separated columns with id
  // But NOT if it's a tree wrapped in pipes (already caught above)
  if (
    /^\|\s*id\s*\|/m.test(trimmed) ||
    /^\s*id\s+select_type\s+table/m.test(trimmed)
  ) {
    return 'table'
  }

  // Also detect if +---+ borders with EXPLAIN header (MySQL result wrapper for tree)
  if (trimmed.startsWith('+--') && /^\|\s*EXPLAIN\s*\|/m.test(trimmed)) {
    return 'tree'
  }

  // Plain table format
  if (trimmed.startsWith('+--') && /\|\s*id\s*\|/m.test(trimmed)) {
    return 'table'
  }

  return 'unknown'
}
