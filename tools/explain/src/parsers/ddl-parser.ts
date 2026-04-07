/**
 * Parse MySQL CREATE TABLE statements to extract schema information.
 * Used for cross-referencing with EXPLAIN analysis to provide
 * smarter index recommendations.
 */

export interface ParsedColumn {
  name: string
  type: string
  nullable: boolean
  autoIncrement: boolean
}

export interface ParsedIndex {
  name: string
  columns: string[]
  unique: boolean
  primary: boolean
  type: 'btree' | 'hash' | 'fulltext' | 'spatial'
}

export interface ParsedForeignKey {
  name?: string
  columns: string[]
  refTable: string
  refColumns: string[]
}

export interface ParsedTable {
  name: string
  columns: ParsedColumn[]
  indexes: ParsedIndex[]
  foreignKeys: ParsedForeignKey[]
  engine?: string
  charset?: string
}

export function parseDDL(input: string): ParsedTable[] {
  const tables: ParsedTable[] = []

  // Find each CREATE TABLE statement using balanced paren matching
  const headerRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s*\(/gi
  let headerMatch

  while ((headerMatch = headerRegex.exec(input)) !== null) {
    const tableName = headerMatch[1]
    const bodyStart = headerMatch.index + headerMatch[0].length

    // Find the matching closing paren (balanced)
    let depth = 1
    let i = bodyStart
    while (i < input.length && depth > 0) {
      if (input[i] === '(') depth++
      if (input[i] === ')') depth--
      if (depth > 0) i++
    }
    const body = input.slice(bodyStart, i)
    const afterBody = input.slice(i + 1, i + 100)

    // Extract ENGINE and CHARSET from what follows the closing paren
    const engineMatch = afterBody.match(/ENGINE\s*=\s*(\w+)/i)
    const charsetMatch = afterBody.match(/(?:DEFAULT\s+)?CHARSET\s*=\s*(\w+)/i)

    const table: ParsedTable = {
      name: tableName,
      columns: [],
      indexes: [],
      foreignKeys: [],
      engine: engineMatch?.[1],
      charset: charsetMatch?.[1],
    }

    // Split body into definitions, respecting parentheses
    const defs = splitDefinitions(body)

    for (const def of defs) {
      const trimmed = def.trim()
      if (!trimmed) continue

      const upper = trimmed.toUpperCase()

      if (upper.startsWith('PRIMARY KEY')) {
        const idx = parsePrimaryKey(trimmed)
        if (idx) table.indexes.push(idx)
      } else if (upper.startsWith('UNIQUE') && (upper.includes('KEY') || upper.includes('INDEX'))) {
        const idx = parseIndexDef(trimmed, true)
        if (idx) table.indexes.push(idx)
      } else if (upper.startsWith('KEY') || upper.startsWith('INDEX')) {
        const idx = parseIndexDef(trimmed, false)
        if (idx) table.indexes.push(idx)
      } else if (upper.startsWith('FULLTEXT')) {
        const idx = parseIndexDef(trimmed, false)
        if (idx) { idx.type = 'fulltext'; table.indexes.push(idx) }
      } else if (upper.startsWith('SPATIAL')) {
        const idx = parseIndexDef(trimmed, false)
        if (idx) { idx.type = 'spatial'; table.indexes.push(idx) }
      } else if (upper.startsWith('FOREIGN KEY') || upper.startsWith('CONSTRAINT')) {
        const fk = parseForeignKey(trimmed)
        if (fk) table.foreignKeys.push(fk)
      } else {
        // Column definition
        const col = parseColumnDef(trimmed)
        if (col) {
          table.columns.push(col)
          // Inline PRIMARY KEY
          if (/\bPRIMARY\s+KEY\b/i.test(trimmed)) {
            table.indexes.push({
              name: 'PRIMARY',
              columns: [col.name],
              unique: true,
              primary: true,
              type: 'btree',
            })
          }
          // Inline UNIQUE
          if (/\bUNIQUE\b/i.test(trimmed) && !/\bPRIMARY\b/i.test(trimmed)) {
            table.indexes.push({
              name: `uniq_${col.name}`,
              columns: [col.name],
              unique: true,
              primary: false,
              type: 'btree',
            })
          }
        }
      }
    }

    tables.push(table)
  }

  return tables
}

function splitDefinitions(body: string): string[] {
  const defs: string[] = []
  let depth = 0
  let current = ''

  for (const char of body) {
    if (char === '(') depth++
    if (char === ')') depth--
    if (char === ',' && depth === 0) {
      defs.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) defs.push(current.trim())

  return defs
}

function parseColumnDef(def: string): ParsedColumn | null {
  // `column_name` TYPE(size) [NOT NULL] [AUTO_INCREMENT] ...
  const match = def.match(/^`?(\w+)`?\s+(\w+(?:\([^)]*\))?(?:\s+UNSIGNED)?)/i)
  if (!match) return null

  return {
    name: match[1],
    type: match[2].toUpperCase(),
    nullable: !/\bNOT\s+NULL\b/i.test(def),
    autoIncrement: /\bAUTO_INCREMENT\b/i.test(def),
  }
}

function parsePrimaryKey(def: string): ParsedIndex | null {
  const colsMatch = def.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i)
  if (!colsMatch) return null

  return {
    name: 'PRIMARY',
    columns: extractColumnNames(colsMatch[1]),
    unique: true,
    primary: true,
    type: 'btree',
  }
}

function parseIndexDef(def: string, isUnique: boolean): ParsedIndex | null {
  // KEY `idx_name` (`col1`, `col2`) or INDEX idx_name (col1, col2)
  const match = def.match(/(?:UNIQUE\s+)?(?:KEY|INDEX|FULLTEXT|SPATIAL)\s+`?(\w+)`?\s*\(([^)]+)\)/i)
  if (!match) return null

  return {
    name: match[1],
    columns: extractColumnNames(match[2]),
    unique: isUnique,
    primary: false,
    type: 'btree',
  }
}

function parseForeignKey(def: string): ParsedForeignKey | null {
  // FOREIGN KEY (`col`) REFERENCES `table` (`col`)
  // CONSTRAINT `name` FOREIGN KEY (`col`) REFERENCES `table` (`col`)
  const match = def.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+`?(\w+)`?\s*\(([^)]+)\)/i)
  if (!match) return null

  const nameMatch = def.match(/CONSTRAINT\s+`?(\w+)`?/i)

  return {
    name: nameMatch?.[1],
    columns: extractColumnNames(match[1]),
    refTable: match[2],
    refColumns: extractColumnNames(match[3]),
  }
}

function extractColumnNames(str: string): string[] {
  return str.split(',').map(s => s.trim().replace(/`/g, '').replace(/\(\d+\)/, ''))
}

// --- Cross-referencing utilities ---

export function findTable(tables: ParsedTable[], name: string): ParsedTable | undefined {
  return tables.find(t => t.name.toLowerCase() === name.toLowerCase())
}

export function findIndexesForColumn(table: ParsedTable, column: string): ParsedIndex[] {
  return table.indexes.filter(idx =>
    idx.columns.some(c => c.toLowerCase() === column.toLowerCase())
  )
}

export function findIndexWithPrefix(table: ParsedTable, columns: string[]): ParsedIndex | undefined {
  return table.indexes.find(idx => {
    if (idx.columns.length < columns.length) return false
    return columns.every((col, i) => idx.columns[i]?.toLowerCase() === col.toLowerCase())
  })
}

export function isColumnNullable(tables: ParsedTable[], tableName: string, colName: string): boolean | undefined {
  const table = findTable(tables, tableName)
  if (!table) return undefined
  const col = table.columns.find(c => c.name.toLowerCase() === colName.toLowerCase())
  if (!col) return undefined
  return col.nullable
}

export function getForeignKeysWithoutIndex(table: ParsedTable): ParsedForeignKey[] {
  return table.foreignKeys.filter(fk => {
    const hasIndex = table.indexes.some(idx =>
      fk.columns.length <= idx.columns.length &&
      fk.columns.every((col, i) => idx.columns[i]?.toLowerCase() === col.toLowerCase())
    )
    return !hasIndex
  })
}

export function getRedundantIndexes(table: ParsedTable): { redundant: ParsedIndex; coveredBy: ParsedIndex }[] {
  const results: { redundant: ParsedIndex; coveredBy: ParsedIndex }[] = []

  for (const idx of table.indexes) {
    if (idx.primary) continue
    for (const other of table.indexes) {
      if (other === idx) continue
      if (other.columns.length <= idx.columns.length) continue
      // Check if idx is a prefix of other
      const isPrefix = idx.columns.every((col, i) =>
        other.columns[i]?.toLowerCase() === col.toLowerCase()
      )
      if (isPrefix) {
        results.push({ redundant: idx, coveredBy: other })
      }
    }
  }

  return results
}
