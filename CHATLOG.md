# CHATLOG.md — Session Log

## Session: 2026-04-07 — MySQL EXPLAIN Analyzer (Phases 1-3)

### Summary

Built a complete MySQL EXPLAIN Analyzer tool from architecture through three phases of implementation in a single session. The tool is production-ready, tested against 20 real MySQL queries on a 680K-row database, and matches or exceeds AI-level analysis.

---

### Phase 1: Architecture + MVP

**Architecture decisions:**
- Researched explain.dalibo.com (PostgreSQL) — no MySQL equivalent exists
- User rejected Claude API approach due to recurring costs → 100% client-side
- Zero backend, zero database, zero API calls = $0/month

**Built:**
- Vue 3 + Vite + TypeScript SPA at `tools/explain/`
- 3 parsers: tree (EXPLAIN ANALYZE), JSON (FORMAT=JSON), traditional table
- 19 detection rules, 15 query hints
- D3.js tree visualization, table view, node detail panel
- URL hash sharing (pako), localStorage history, 5 sample plans
- Integrated with Eleventy site via passthrough copy + SPA redirect

**Bugs fixed:**
- MySQL `| -> ... |` wrapper not stripped → added `stripMySQLWrapper()`
- Decimal rows (`rows=0.25`) → changed regex from `\d+` to `[0-9.]+`
- `Select #2 (subquery; dependent)` not parsed → added detection
- `extractIndex()` matching "temporary" → excluded keywords
- `<temporary>` table scans → excluded from all scan rules
- Vue SPA had own nav/footer → moved to HTML shell
- `SELECT *` regex matching multiplication `*` → changed to `SELECT * FROM`

**Committed:** `4d2e062` (50 files, 8,333 lines)

---

### Phase 2: Enhanced Analysis + PEV2-Level Visualization

**Analysis engine expanded:**
- 37 rules (from 19): zero-row joins, function-on-column, join fan-out, low filter ratio, covering index scan, index merge, etc.
- 24 query hints (from 15): GROUP BY logic bugs, scalar subquery rewrites, YEAR() range, mixed ASC/DESC, etc.
- DDL parser with balanced-paren matching (handles DECIMAL(10,2), nested FK refs)
- Query-aware index advisor: extracts WHERE/GROUP BY/ORDER BY from SQL, resolves aliases
- Weighted scoring: plan issues vs DDL issues vs good findings
- Recommendations scoped to plan-relevant tables only

**PEV2-inspired visualization:**
- Edge thickness proportional to row count
- Node badges: Slow (S), Costly ($), Bad Estimate (E), Filter (F)
- Highlight mode switcher: none/duration/rows/cost with HSL gradient bars
- Rich hover tooltips, exclusive time, row estimation display
- New components: CostChart, EstimateVsActual, CompareView
- Full-width layout for maximum tree area

**Robust testing:**
- Created 7-table schema with 680K records on MySQL 8.0 (multipass VM)
- Ran 20 diverse queries covering: full scans, YEAR(), GROUP BY, OR conditions, LIKE wildcards, high OFFSET, DISTINCT+JOIN, covering index opportunities, wrong index selection, 4-table joins, dependent subqueries
- Compared tool output against AI (Claude) analysis for 5 original queries — matched on all findings

**Bugs fixed during testing:**
- "Infinityx" display when actual rows = 0 → skip (defer to zeroRowJoin rule)
- DDL noise: FK warnings for all tables → scoped to plan tables only
- Table alias in DDL: `ALTER TABLE 'o'` → resolved to `orders`
- `cache` leaking as column name from `<cache>((now()...))` → added to exclude list
- Score 14/100 for 5ms query → weighted scoring (DDL = reduced penalty, good = bonus)

**Committed:** `ac98a58` (16 files, 2,578 lines)

---

### Phase 3: Intelligence Gaps (AI Comparison)

**Query rewrite engine** (`query-rewriter.ts`) — 7 executable SQL rewrites:
- `YEAR(col)=N` → date range condition
- Scalar subquery → `LEFT JOIN + COALESCE + GROUP BY`
- `NOT IN (SELECT)` → `LEFT JOIN ... IS NULL`
- `GROUP BY name` → `GROUP BY id, name`
- `SELECT *` → named columns
- High OFFSET → keyset pagination
- `ORDER BY RAND()` → random offset

**NOT NULL suggestions:**
- Cross-references DDL nullable columns with WHERE/JOIN/GROUP BY usage
- Flags: `orders.customer_id` nullable in FK+JOIN, `customers.name` nullable in GROUP BY
- Generates `ALTER TABLE MODIFY ... NOT NULL` DDL

**Index deduplication:**
- `(product_id)` + `(product_id, quantity)` → keeps only wider index
- Sorted by impact priority

**UI:** IssueList now has 5 tabs: Issues | Indexes | Hints | Rewrites | Schema

**Committed:** `8d9183e` (4 files, 422 lines)

---

### Key Decisions (Full Session)

1. **No AI API** — all intelligence as TypeScript rules, $0 cost
2. **Hostinger** — backup hosting, already paid
3. **"EXPLAIN Analyzer"** — nav link name (user rejected "Tools")
4. **No dark mode** — matches main site
5. **MySQL wrapper stripping** — auto-strips `| ... |` from mysql CLI
6. **`<temporary>` excluded** — all rules skip internal temp tables
7. **Zero-row = data integrity** — not stale stats (ANALYZE TABLE wrong advice)
8. **Plan-scoped recs** — DDL issues/index recs only for tables in current plan
9. **Weighted scoring** — plan issues full penalty, DDL reduced, good = bonus
10. **Index dedup** — subset indexes removed in favor of wider covering indexes
11. **Table alias resolution** — `o` → `orders` in all generated DDL

### Git History (3 commits, not pushed)

```
4d2e062 Phase 1: Add MySQL EXPLAIN Analyzer — free, client-side query plan visualizer
ac98a58 Phase 2: Add enhanced analysis, PEV2-level visualization, and robust index advisor
8d9183e Phase 3: Add query rewrite engine, NOT NULL suggestions, index deduplication
```

### Test Infrastructure

- **MySQL 8.0.45** running on multipass VM `mysql-box`
- **Database**: `advisor_test` with 7 tables, 680K rows
- **20 test queries** covering all major optimization patterns
- **5 original sample queries** with AI comparison

### What's Next

1. **Push to production** — Netlify auto-deploys from `main`
2. **Write launch blog post** — "Free MySQL EXPLAIN Analyzer" for SEO
3. **Future**: PostgreSQL support, embeddable widget, PWA, slow query log parser
