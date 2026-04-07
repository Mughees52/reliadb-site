# CHATLOG.md — Session Log

## Session: 2026-04-07 — MySQL EXPLAIN Analyzer (Phase 1 + Phase 2)

### What Was Done

Built the complete MySQL EXPLAIN Analyzer from architecture through Phase 2, with robust AI-comparison testing.

---

### Phase 1: Architecture + MVP Build

- Researched explain.dalibo.com (PostgreSQL) and competitive landscape
- Found **no open-source, web-based MySQL EXPLAIN visualization tool exists**
- Initially designed with Claude API — **user rejected** due to recurring costs
- Redesigned as 100% client-side with built-in TypeScript rule engine
- Architecture doc: `docs/MYSQL-EXPLAIN-ANALYZER-ARCHITECTURE.md`

**Built:**
- Vue 3 + Vite + TypeScript project at `tools/explain/`
- 3 parsers: tree (EXPLAIN ANALYZE), JSON (FORMAT=JSON), traditional table
- 19 detection rules, 15 query hint patterns
- D3.js tree visualization, table view, node detail panel
- URL hash sharing (pako), localStorage history, 5 sample plans
- Integrated with Eleventy site (passthrough copy, SPA redirect)
- Added "EXPLAIN Analyzer" nav link across all 8 page templates

**Bugs fixed during Phase 1 testing:**
- MySQL result wrapper (`| -> ... |`) not being stripped — added `stripMySQLWrapper()`
- Decimal row counts (`rows=0.25`) failing integer-only regex
- Nested filter conditions with multi-level parens — added balanced paren parser
- `Select #2 (subquery; dependent)` not parsed as dependent subquery
- `extractIndex()` matching "temporary" from "Aggregate using temporary table"
- `<temporary>` table scans triggering false-positive index recommendations
- Vue SPA had its own header/footer that didn't match the site — moved nav/footer to HTML shell

**Committed:** `4d2e062` — 50 files, 8,333 lines (not yet pushed)

---

### Phase 2: Enhanced Analysis

**New components (3):**
- `CostChart.vue` — horizontal bar chart showing cost distribution per node
- `EstimateVsActual.vue` — side-by-side bar comparison with mismatch highlighting
- `CompareView.vue` — paste "after" plan to compare metrics

**DDL Parser** (`parsers/ddl-parser.ts`):
- Parses CREATE TABLE with balanced paren matching (handles DECIMAL(10,2), nested FK refs)
- Extracts columns, indexes, foreign keys, engine
- Cross-ref: `getForeignKeysWithoutIndex()`, `getRedundantIndexes()`, `findIndexWithPrefix()`
- Fixed: initial regex approach failed on nested parens, rewrote with balanced paren scanner

**Analysis rules expanded: 19 → 37** (+18 new):
- `zeroRowJoin` (CRITICAL) — detects referential integrity issues when all join lookups return 0
- `functionOnColumn` — YEAR(), LOWER() etc. preventing index use
- `indexNotUsedDespiteAvailable` — possible_keys exist but scan chosen
- `lowFilteredPercentage` — <25% filter ratio = wasted reads
- `highCostNode` — single node >70% of total cost
- `fullScanOnNullKey` — NULL outer expr triggers full scan in subquery
- `refOrNull` — ref_or_null access from nullable subquery
- `sortMergePasses` — large slow filesort (>10K rows, >500ms)
- `expensiveSubqueryMaterialization` — materialized subquery >1K rows
- `highRowMismatchInJoin` — join fan-out (est 1, actual >> 1)
- `missingJoinIndex` — non-unique index with high fan-out
- `coveringIndexScan` (INFO) — full index scan but covering
- `indexMergeUsed` (INFO) — suggest composite index instead
- `efficientRangeScan` (GOOD) — small range scan with selective index
- FK without index (DDL-aware)
- Redundant index (DDL-aware)

**Query hints expanded: 15 → 24** (+9 new):
- Scalar subquery → LEFT JOIN rewrite (with example SQL)
- GROUP BY on non-unique name column (logic bug detection)
- YEAR() → range rewrite (specific pattern)
- GROUP BY without ORDER BY (MySQL 8.4+)
- NOT IN with nullable columns
- ORDER BY + LIMIT without tiebreaker
- STRAIGHT_JOIN warning
- Mixed ASC/DESC ORDER BY
- COUNT(DISTINCT) performance

**Index advisor upgraded:**
- Query-aware: extracts WHERE, GROUP BY, ORDER BY columns from SQL
- Resolves table aliases (`o` → `orders`)
- Handles bare column names (no table prefix)
- Handles function-wrapped columns (YEAR(order_date) → order_date)
- Generates composite index DDL for WHERE conditions
- Generates GROUP BY indexes for Loose Index Scan optimization
- Covering index suggestions for join + aggregate patterns
- Deduplicates recommendations across plan-level, DDL-level, and query-level

**Bugs fixed during Phase 2:**
- `massiveRowMismatch` showing "Infinityx" when actual rows = 0 — now skips (deferred to `zeroRowJoin`)
- `SELECT *` regex matching multiplication `*` in `SUM(qty * price)` — changed to `/SELECT\s+\*\s+FROM/`
- DDL parser missing DECIMAL(10,2) columns — replaced regex with balanced paren scanner
- DDL parser not capturing FOREIGN KEY — same fix
- Duplicate index recommendations — normalized `seen` set keys
- Missing composite index for Q1 `(status, order_date)` — added single-table WHERE inference

---

### Robust Testing: Tool vs AI

Ran all 5 real MySQL EXPLAIN plans through our tool and compared against Claude AI analysis.

**Test schema:** customers, orders, order_items, products (with FKs)

**Results:**

| Query | AI Findings | Our Tool Catches | Verdict |
|-------|:-:|:-:|:-:|
| Q1: WHERE + YEAR() | 5 issues | 5/5 + composite index DDL | Match |
| Q2: JOIN + GROUP BY name | 6 issues | 5/6 + GROUP BY logic bug | Match |
| Q3: GROUP BY + ORDER BY + LIMIT | 4 issues | 4/4 + product_id index | Match |
| Q4: 4-table JOIN (0-row integrity) | 7 issues | 7/7 + data audit SQL | Match |
| Q5: Dependent subquery | 4 issues | 4/4 + JOIN rewrite hint | Match |

**Our tool catches things AI missed:**
- MySQL 8.4 implicit GROUP BY sorting removed
- Non-deterministic ORDER BY + LIMIT without tiebreaker
- GROUP BY on non-unique name column (logic bug)

**Remaining gaps for Phase 3:**
- AI suggests richer covering indexes (e.g., `(customer_id, total_amount)` not just `(customer_id)`)
- AI generates actual rewritten SQL; our tool gives hints but not executable rewrites
- AI flags missing NOT NULL constraints

---

### Key Decisions

1. **No AI API** — all intelligence compiled as TypeScript rules, $0 cost
2. **Hostinger available** — backup hosting already paid for
3. **Nav consistency** — site nav/footer hardcoded in HTML shell, Vue only renders `#app`
4. **"EXPLAIN Analyzer"** — user chose this over "Tools" as nav label
5. **No dark mode** — matches main site (no dark mode)
6. **MySQL result wrapper** — tool auto-strips `| ... |` borders from pasted mysql CLI output
7. **`<temporary>` tables** — all scan rules skip internal temp tables to avoid false positives
8. **Zero-row joins** — flagged as data integrity (not stale stats) — "Run ANALYZE TABLE" is wrong advice when rows don't exist

### Build Output (Phase 2)

```
dist/index.html                       6.3KB  (gzip: 2.2KB)
dist/assets/index-*.css               26.8KB (gzip: 5.7KB)
dist/assets/d3-*.js                   51.6KB (gzip: 17.5KB)
dist/assets/index-*.js               198.6KB (gzip: 67.0KB)
dist/assets/codemirror-*.js          303.2KB (gzip: 100.3KB)
Monthly cost: $0
```

### Status at End of Session

- Phase 1 committed (`4d2e062`), not pushed
- Phase 2 code complete, built, type-checked, tested — not yet committed
- All 37 rules + 24 hints + DDL parser + 3 new views working
- Tested against 5 real MySQL plans with AI comparison
- Phase 3 gaps documented in memory for next session
- `CLAUDE.md` and `CHATLOG.md` up to date
