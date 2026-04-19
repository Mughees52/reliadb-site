import type { QueryResult, ExpectedResult } from '../types'

export interface GradeResult {
  passed: boolean
  message: string
  details?: {
    columnMismatch?: { expected: string[]; actual: string[] }
    missingRows?: unknown[][]
    extraRows?: unknown[][]
    rowCountDiff?: { expected: number; actual: number }
  }
}

function normalizeValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  return String(v).trim()
}

function rowToString(row: unknown[]): string {
  return row.map(normalizeValue).join('|')
}

function columnsMatch(expected: string[], actual: string[]): boolean {
  if (expected.length !== actual.length) return false
  return expected.every(
    (col, i) => col.toLowerCase() === actual[i].toLowerCase()
  )
}

export function grade(
  actual: QueryResult,
  expected: ExpectedResult,
  mode: 'exact' | 'unordered' | 'contains'
): GradeResult {
  // Check columns
  if (!columnsMatch(expected.columns, actual.columns)) {
    return {
      passed: false,
      message: `Column mismatch. Expected: ${expected.columns.join(', ')}. Got: ${actual.columns.join(', ')}`,
      details: {
        columnMismatch: { expected: expected.columns, actual: actual.columns },
      },
    }
  }

  const expectedRows = expected.values.map(rowToString)
  const actualRows = actual.values.map(rowToString)

  if (mode === 'exact') {
    if (expectedRows.length !== actualRows.length) {
      return {
        passed: false,
        message: `Expected ${expectedRows.length} rows, got ${actualRows.length}`,
        details: { rowCountDiff: { expected: expectedRows.length, actual: actualRows.length } },
      }
    }
    for (let i = 0; i < expectedRows.length; i++) {
      if (expectedRows[i] !== actualRows[i]) {
        return {
          passed: false,
          message: `Row ${i + 1} doesn't match expected output`,
        }
      }
    }
    return { passed: true, message: 'Correct!' }
  }

  if (mode === 'unordered') {
    const expectedSorted = [...expectedRows].sort()
    const actualSorted = [...actualRows].sort()

    if (expectedSorted.length !== actualSorted.length) {
      return {
        passed: false,
        message: `Expected ${expectedSorted.length} rows, got ${actualSorted.length}`,
        details: { rowCountDiff: { expected: expectedSorted.length, actual: actualSorted.length } },
      }
    }

    for (let i = 0; i < expectedSorted.length; i++) {
      if (expectedSorted[i] !== actualSorted[i]) {
        return {
          passed: false,
          message: 'Results contain different rows than expected',
        }
      }
    }
    return { passed: true, message: 'Correct!' }
  }

  // 'contains' mode: all expected rows must appear in actual
  const actualSet = new Set(actualRows)
  const missing = expectedRows.filter((r) => !actualSet.has(r))
  if (missing.length > 0) {
    return {
      passed: false,
      message: `Missing ${missing.length} expected row(s) from your result`,
      details: {
        missingRows: missing.map((r) => r.split('|')),
      },
    }
  }
  return { passed: true, message: 'Correct!' }
}
