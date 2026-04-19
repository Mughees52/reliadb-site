import { ref, readonly } from 'vue'
import type { QueryOutput } from '../types'
import schemaSQL from '../data/schema.sql?raw'
import seedSQL from '../data/seed.sql?raw'

interface SqlJsDatabase {
  run(sql: string): void
  exec(sql: string): { columns: string[]; values: unknown[][] }[]
  close(): void
}

interface SqlJsStatic {
  Database: new () => SqlJsDatabase
}

let db: SqlJsDatabase | null = null
const isReady = ref(false)
const isLoading = ref(false)
const initError = ref<string | null>(null)

async function initialize(): Promise<void> {
  if (db || isLoading.value) return

  isLoading.value = true
  initError.value = null

  try {
    // Dynamically import sql.js to avoid Vite bundling issues with WASM
    const initSqlJs = (await import('sql.js')).default
    const SQL: SqlJsStatic = await initSqlJs({
      locateFile: () => new URL('/training/sql-wasm.wasm', window.location.origin).href,
    })
    db = new SQL.Database()
    db.run(schemaSQL)
    db.run(seedSQL)
    isReady.value = true
  } catch (e) {
    initError.value = e instanceof Error ? e.message : 'Failed to initialize SQL engine'
  } finally {
    isLoading.value = false
  }
}

function execute(sql: string): QueryOutput {
  if (!db) {
    return { error: 'Database not initialized' }
  }

  try {
    const results = db.exec(sql)
    if (results.length === 0) {
      return { columns: [], values: [] }
    }
    const last = results[results.length - 1]
    return { columns: last.columns, values: last.values }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Query execution failed' }
  }
}

async function resetDatabase(): Promise<void> {
  if (!db) return

  try {
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")
    if (tables.length > 0) {
      for (const row of tables[0].values) {
        db.run(`DROP TABLE IF EXISTS "${row[0]}"`)
      }
    }
    db.run(schemaSQL)
    db.run(seedSQL)
  } catch (e) {
    initError.value = e instanceof Error ? e.message : 'Failed to reset database'
  }
}

export function useSqlJs() {
  return {
    isReady: readonly(isReady),
    isLoading: readonly(isLoading),
    initError: readonly(initError),
    initialize,
    execute,
    resetDatabase,
  }
}
