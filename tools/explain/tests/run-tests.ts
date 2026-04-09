#!/usr/bin/env npx tsx
/**
 * Automated test runner for the EXPLAIN Analyzer.
 *
 * 1. Runs EXPLAIN ANALYZE on mysql-box for each test query
 * 2. Gets DDL for all tables
 * 3. Feeds to our analyzer
 * 4. Captures: issues, index recs, impact predictions, hints, rewrites
 * 5. Outputs a JSON report + summary table
 *
 * Usage:
 *   cd tools/explain && npx tsx tests/run-tests.ts
 *   cd tools/explain && npx tsx tests/run-tests.ts --query 1,2,3   # run specific queries
 */

import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { TEST_QUERIES, type TestQuery } from './test-queries'
import { parsePlan } from '../src/parsers/normalize'
import { analyze } from '../src/analysis/engine'
import type { AnalysisResult, IndexRecommendation } from '../src/analysis/types'

// ============================================================
// Config
// ============================================================
const MYSQL_CMD = 'multipass exec mysql-box -- sudo mysql -N explain_test'
const REPORT_PATH = './tests/test-report.json'
const SUMMARY_PATH = './tests/test-summary.md'

// ============================================================
// Types
// ============================================================
interface TestResult {
  id: number
  name: string
  tags: string[]
  query: string
  explainOutput: string
  ddl: string
  analysis: {
    score: number
    issues: { severity: string; title: string; description: string }[]
    indexRecommendations: {
      table: string
      columns: string[]
      impact: string
      reason: string
      ddl: string
      simulatedImpact?: {
        summary: string
        changes: { type: string; before: string; after: string; explanation: string }[]
      }
    }[]
    queryHints: { title: string; suggestion: string }[]
    queryRewrites: { title: string; original: string; rewritten: string }[]
    schemaIssues: { table: string; column: string; issue: string }[]
  }
  timing: {
    explainMs: number
    analysisMs: number
  }
  error?: string
}

// ============================================================
// MySQL helpers
// ============================================================
function mysqlExec(sql: string): string {
  try {
    const escaped = sql.replace(/'/g, "'\\''")
    const result = execSync(`${MYSQL_CMD} -e '${escaped}'`, {
      encoding: 'utf-8',
      timeout: 30000,
    })
    return result.trim()
  } catch (e: any) {
    return `ERROR: ${e.message}`
  }
}

function getExplainAnalyze(query: string): string {
  const sql = `EXPLAIN ANALYZE ${query}`
  return mysqlExec(sql)
}

function getDDL(tables: string[]): string {
  const ddls: string[] = []
  for (const table of tables) {
    const result = mysqlExec(`SHOW CREATE TABLE ${table}`)
    if (!result.startsWith('ERROR')) {
      // SHOW CREATE TABLE returns: tablename\tCREATE TABLE ...
      // The -N flag gives tab-separated output with escaped newlines
      const createStmt = result.split('\t').slice(1).join('\t').replace(/\\n/g, '\n')
      ddls.push(createStmt)
    }
  }
  return ddls.join('\n\n')
}

function extractTablesFromQuery(query: string): string[] {
  const tables = new Set<string>()
  // Match FROM/JOIN table patterns
  const regex = /(?:FROM|JOIN)\s+`?(\w+)`?/gi
  let match
  while ((match = regex.exec(query)) !== null) {
    const table = match[1].toLowerCase()
    // Skip subquery aliases and SQL keywords
    if (!['select', 'where', 'group', 'order', 'having', 'limit', 'union'].includes(table)) {
      tables.add(table)
    }
  }
  return [...tables]
}

// ============================================================
// Run tests
// ============================================================
function runTest(tq: TestQuery, allDDL: string): TestResult {
  const result: TestResult = {
    id: tq.id,
    name: tq.name,
    tags: tq.tags,
    query: tq.query,
    explainOutput: '',
    ddl: '',
    analysis: {
      score: 0,
      issues: [],
      indexRecommendations: [],
      queryHints: [],
      queryRewrites: [],
      schemaIssues: [],
    },
    timing: { explainMs: 0, analysisMs: 0 },
  }

  try {
    // Get EXPLAIN ANALYZE
    const t0 = Date.now()
    result.explainOutput = getExplainAnalyze(tq.query)
    result.timing.explainMs = Date.now() - t0

    if (result.explainOutput.startsWith('ERROR')) {
      result.error = result.explainOutput
      return result
    }

    // Get DDL for tables in this query
    const tables = extractTablesFromQuery(tq.query)
    result.ddl = allDDL // Use full DDL for better cross-table analysis

    // Parse + analyze
    const t1 = Date.now()
    const parsed = parsePlan(result.explainOutput)
    const analysis = analyze(parsed.root, parsed.stats, tq.query, result.ddl)
    result.timing.analysisMs = Date.now() - t1

    // Capture results
    result.analysis.score = analysis.summary.score
    result.analysis.issues = analysis.issues.map(i => ({
      severity: i.severity,
      title: i.title,
      description: i.description,
    }))
    result.analysis.indexRecommendations = analysis.indexRecommendations.map(r => ({
      table: r.table,
      columns: r.columns,
      impact: r.impact,
      reason: r.reason,
      ddl: r.ddl,
      simulatedImpact: r.simulatedImpact ? {
        summary: r.simulatedImpact.summary,
        changes: r.simulatedImpact.changes.map(c => ({
          type: c.type,
          before: c.before,
          after: c.after,
          explanation: c.explanation,
        })),
      } : undefined,
    }))
    result.analysis.queryHints = analysis.queryHints.map(h => ({
      title: h.title,
      suggestion: h.suggestion,
    }))
    result.analysis.queryRewrites = analysis.queryRewrites.map(r => ({
      title: r.title,
      original: r.original,
      rewritten: r.rewritten,
    }))
    result.analysis.schemaIssues = analysis.schemaIssues.map(s => ({
      table: s.table,
      column: s.column,
      issue: s.issue,
    }))
  } catch (e: any) {
    result.error = e.message
  }

  return result
}

// ============================================================
// Summary report
// ============================================================
function generateSummary(results: TestResult[]): string {
  const lines: string[] = []
  lines.push('# EXPLAIN Analyzer — Test Report')
  lines.push(``)
  lines.push(`**Date**: ${new Date().toISOString().split('T')[0]}`)
  lines.push(`**Queries**: ${results.length}`)
  lines.push(`**Errors**: ${results.filter(r => r.error).length}`)
  lines.push(``)

  // Stats
  const totalIssues = results.reduce((s, r) => s + r.analysis.issues.length, 0)
  const totalIndexRecs = results.reduce((s, r) => s + r.analysis.indexRecommendations.length, 0)
  const totalHints = results.reduce((s, r) => s + r.analysis.queryHints.length, 0)
  const totalRewrites = results.reduce((s, r) => s + r.analysis.queryRewrites.length, 0)
  const totalImpacts = results.reduce((s, r) =>
    s + r.analysis.indexRecommendations.filter(ir => ir.simulatedImpact && ir.simulatedImpact.changes.length > 0).length, 0)
  const avgScore = Math.round(results.reduce((s, r) => s + r.analysis.score, 0) / results.length)

  lines.push(`## Summary`)
  lines.push(``)
  lines.push(`| Metric | Count |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Issues detected | ${totalIssues} |`)
  lines.push(`| Index recommendations | ${totalIndexRecs} |`)
  lines.push(`| Impact simulations | ${totalImpacts} |`)
  lines.push(`| Query hints | ${totalHints} |`)
  lines.push(`| Query rewrites | ${totalRewrites} |`)
  lines.push(`| Average score | ${avgScore}/100 |`)
  lines.push(``)

  // Per-query table
  lines.push(`## Per-Query Results`)
  lines.push(``)
  lines.push(`| # | Name | Score | Issues | Idx Recs | Impact | Hints | Rewrites |`)
  lines.push(`|---|------|-------|--------|----------|--------|-------|----------|`)
  for (const r of results) {
    const impactCount = r.analysis.indexRecommendations.filter(ir => ir.simulatedImpact && ir.simulatedImpact.changes.length > 0).length
    const errorMark = r.error ? ' ❌' : ''
    lines.push(`| ${r.id} | ${r.name}${errorMark} | ${r.analysis.score} | ${r.analysis.issues.length} | ${r.analysis.indexRecommendations.length} | ${impactCount} | ${r.analysis.queryHints.length} | ${r.analysis.queryRewrites.length} |`)
  }
  lines.push(``)

  // Index recommendations detail
  lines.push(`## Index Recommendations Detail`)
  lines.push(``)
  for (const r of results) {
    if (r.analysis.indexRecommendations.length === 0) continue
    lines.push(`### Q${r.id}: ${r.name}`)
    for (const rec of r.analysis.indexRecommendations) {
      lines.push(`- **${rec.table}**(${rec.columns.join(', ')}) — ${rec.impact}`)
      lines.push(`  ${rec.reason}`)
      if (rec.simulatedImpact && rec.simulatedImpact.changes.length > 0) {
        lines.push(`  **Impact**: ${rec.simulatedImpact.summary}`)
        for (const ch of rec.simulatedImpact.changes) {
          lines.push(`  - ${ch.before} → ${ch.after}`)
        }
      }
    }
    lines.push(``)
  }

  // Queries with zero analysis (potential gaps)
  const zeroAnalysis = results.filter(r =>
    !r.error &&
    r.analysis.issues.length === 0 &&
    r.analysis.indexRecommendations.length === 0 &&
    r.analysis.queryHints.length === 0
  )
  if (zeroAnalysis.length > 0) {
    lines.push(`## ⚠ Queries With Zero Analysis (Potential Gaps)`)
    lines.push(``)
    for (const r of zeroAnalysis) {
      lines.push(`- Q${r.id}: ${r.name} (tags: ${r.tags.join(', ')})`)
    }
    lines.push(``)
  }

  return lines.join('\n')
}

// ============================================================
// Main
// ============================================================
async function main() {
  // Parse args
  const args = process.argv.slice(2)
  let queryIds: number[] | null = null
  const idxArg = args.indexOf('--query')
  if (idxArg >= 0 && args[idxArg + 1]) {
    queryIds = args[idxArg + 1].split(',').map(Number)
  }

  const queries = queryIds
    ? TEST_QUERIES.filter(q => queryIds!.includes(q.id))
    : TEST_QUERIES

  console.log(`\n🔍 Running ${queries.length} test queries against mysql-box...\n`)

  // Get full DDL once
  console.log('📋 Fetching DDL for all tables...')
  const allTables = ['customers', 'products', 'categories', 'orders', 'order_items',
    'payments', 'reviews', 'inventory_log', 'warehouses', 'shipping_events']
  const allDDL = getDDL(allTables)

  const results: TestResult[] = []

  for (const tq of queries) {
    process.stdout.write(`  Q${String(tq.id).padStart(2, '0')}: ${tq.name.padEnd(50, ' ')}`)
    const result = runTest(tq, allDDL)
    results.push(result)

    if (result.error) {
      console.log(`❌ ${result.error.substring(0, 60)}`)
    } else {
      const impactCount = result.analysis.indexRecommendations.filter(
        ir => ir.simulatedImpact && ir.simulatedImpact.changes.length > 0
      ).length
      console.log(`✅ score=${result.analysis.score} issues=${result.analysis.issues.length} idx=${result.analysis.indexRecommendations.length} impact=${impactCount} hints=${result.analysis.queryHints.length}`)
    }
  }

  // Write reports
  writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2))
  console.log(`\n📄 Full report: ${REPORT_PATH}`)

  const summary = generateSummary(results)
  writeFileSync(SUMMARY_PATH, summary)
  console.log(`📊 Summary: ${SUMMARY_PATH}`)

  // Print high-level stats
  const totalIssues = results.reduce((s, r) => s + r.analysis.issues.length, 0)
  const totalRecs = results.reduce((s, r) => s + r.analysis.indexRecommendations.length, 0)
  const totalImpacts = results.reduce((s, r) =>
    s + r.analysis.indexRecommendations.filter(ir => ir.simulatedImpact && ir.simulatedImpact.changes.length > 0).length, 0)
  const avgScore = Math.round(results.reduce((s, r) => s + r.analysis.score, 0) / results.length)
  const errors = results.filter(r => r.error).length

  console.log(`\n═══════════════════════════════════════`)
  console.log(`  Queries: ${results.length}  Errors: ${errors}`)
  console.log(`  Issues: ${totalIssues}  Index Recs: ${totalRecs}  Impacts: ${totalImpacts}`)
  console.log(`  Avg Score: ${avgScore}/100`)
  console.log(`═══════════════════════════════════════\n`)
}

main().catch(console.error)
