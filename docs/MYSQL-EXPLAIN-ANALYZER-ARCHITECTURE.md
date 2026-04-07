# MySQL EXPLAIN Analyzer — Architecture Design

**Project**: ReliaDB MySQL EXPLAIN Analyzer
**Date**: 2026-04-07
**Status**: Architecture Design Phase
**Comparable**: [explain.dalibo.com](https://explain.dalibo.com/) (PostgreSQL) — no MySQL equivalent exists
**Cost Model**: ZERO recurring costs — 100% client-side, no API calls, no backend

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Cost & Hosting Strategy](#2-cost--hosting-strategy)
3. [System Architecture](#3-system-architecture)
4. [Feature Breakdown (MVP vs Advanced)](#4-feature-breakdown)
5. [Tech Stack](#5-tech-stack)
6. [Data Flow & Parsing Logic](#6-data-flow--parsing-logic)
7. [MySQL EXPLAIN Format Analysis](#7-mysql-explain-format-analysis)
8. [Parsing Engine Design](#8-parsing-engine-design)
9. [Built-In Intelligence Engine](#9-built-in-intelligence-engine)
10. [UI/UX Design](#10-uiux-design)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Future Extensibility](#12-future-extensibility)
13. [Implementation Roadmap](#13-implementation-roadmap)

---

## 1. Executive Summary

### The Problem
MySQL DBAs and engineers lack a dedicated, web-based tool to visualize and analyze `EXPLAIN ANALYZE` output. Unlike PostgreSQL (which has PEV2/explain.dalibo.com), MySQL users are forced to:
- Read raw text/JSON output manually
- Use IDE-locked tools (MySQL Workbench, DataGrip) that can't be shared
- Rely on closed-source SaaS (mysqlexplain.com) with no self-hosting option

### The Solution
**ReliaDB EXPLAIN Analyzer** — a free, web-based tool hosted at `reliadb.com/tools/explain` that:
- Parses MySQL EXPLAIN ANALYZE output (text tree + JSON formats)
- Renders interactive visual execution plan trees
- Identifies performance bottlenecks using a built-in rule engine (no AI API calls)
- Provides actionable MySQL-specific tuning recommendations
- Enables plan sharing via URL encoding (no backend needed)
- Costs **$0/month** to operate — everything runs in the user's browser

### Strategic Value for ReliaDB
- **Lead generation**: Engineers using the tool discover ReliaDB's consulting services
- **SEO**: Tool pages rank for "mysql explain analyzer", "mysql query optimization"
- **Authority**: Positions ReliaDB as the MySQL performance experts
- **Community**: Free tool builds developer trust and brand recognition
- **Zero cost**: No API bills, no database, no server compute — pure static files

---

## 2. Cost & Hosting Strategy

### Design Principle: Zero Recurring Cost

Every architectural decision optimizes for **$0/month operational cost**:

| Decision | Why |
|----------|-----|
| **100% client-side parsing** | No server compute needed |
| **Built-in rule engine (not AI API)** | No per-request API costs |
| **URL hash sharing (not database)** | No storage costs |
| **localStorage for history** | No backend persistence |
| **Static file deployment** | Free hosting on Netlify or Hostinger |
| **No user accounts** | No auth infrastructure |

### What This Means
- **No Claude API calls** — intelligence is baked into TypeScript rules that ship with the app
- **No Netlify Functions** — no serverless compute
- **No database** — plans are encoded in URLs or saved in browser localStorage
- **No Netlify Blobs** — no storage layer
- The entire tool is a bundle of HTML + CSS + JS files. That's it.

### Hosting Options

| Option | Cost | Pros | Cons |
|--------|------|------|------|
| **Netlify (current site)** | Free tier | Already deployed, CI/CD, CDN, HTTPS | 100GB bandwidth/month free (plenty) |
| **Hostinger (existing)** | Already paid | More bandwidth, PHP if ever needed | Manual deploy or FTP, no auto CI/CD |
| **Both** | $0 extra | Netlify for main site + tool, Hostinger as backup/mirror | Extra maintenance |

**Recommended**: Deploy on **Netlify** alongside the existing site (zero extra config). Use Hostinger as a fallback or for a standalone version at a subdomain like `tools.reliadb.com` if Netlify bandwidth limits are ever hit.

### Bandwidth Estimate

The tool is a static SPA. Estimated bundle:
- HTML: ~5KB
- CSS: ~30KB (Tailwind, purged)
- JS: ~120KB gzipped (Vue + D3 + CodeMirror + parsers)
- **Total per visit: ~155KB**

At Netlify's free 100GB/month: **~645,000 visits/month** before any cost. More than enough.

---

## 3. System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                   reliadb.com (Netlify — Free Tier)                   │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │              Eleventy Static Site (existing)                    │   │
│  │  ┌──────┐ ┌──────────┐ ┌──────┐ ┌───────┐ ┌──────────────┐   │   │
│  │  │ Home │ │ Services │ │ Blog │ │ About │ │ Contact      │   │   │
│  │  └──────┘ └──────────┘ └──────┘ └───────┘ └──────────────┘   │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │         /tools/explain — EXPLAIN Analyzer (Static SPA)         │   │
│  │                  100% Client-Side — No Backend                 │   │
│  │                                                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐  │   │
│  │  │ Input Panel │→│ Parse Engine │→│ Visualization + Analysis│  │   │
│  │  │  (Vue 3)    │  │ (TypeScript)│  │  (D3.js + Vue 3)      │  │   │
│  │  └─────────────┘  └─────────────┘  └───────────────────────┘  │   │
│  │                                                                │   │
│  │  ┌───────────────────────────────────────────────────────────┐ │   │
│  │  │              Built-In Intelligence Engine                  │ │   │
│  │  │  30+ detection rules │ Index advisor │ Query rewrite hints │ │   │
│  │  │  All TypeScript — runs in browser — zero API calls        │ │   │
│  │  └───────────────────────────────────────────────────────────┘ │   │
│  │                                                                │   │
│  │  ┌───────────────────────────────────────────────────────────┐ │   │
│  │  │              Client-Side Storage                           │ │   │
│  │  │  URL hash encoding (share) │ localStorage (history)       │ │   │
│  │  │  No database — no backend — no cost                       │ │   │
│  │  └───────────────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘

                        ┌────────────────────┐
                        │  Hostinger (backup) │
                        │  Manual deploy or   │
                        │  tools.reliadb.com  │
                        └────────────────────┘
```

### Why 100% Client-Side?

| Concern | Client-Side (Chosen) | Server-Side (Rejected) |
|---------|---------------------|------------------------|
| **Cost** | $0/month | API calls + compute = $$$  |
| **Privacy** | Plan data never leaves browser | Data sent to server |
| **Latency** | Instant parsing, no round-trip | Network latency per analysis |
| **Scalability** | Infinite — runs on user's browser | Must scale and pay for server |
| **Offline** | Works without internet | Requires connectivity |
| **Hosting** | Static files anywhere | Needs backend infrastructure |
| **Maintenance** | Zero ops | Server monitoring, uptime, etc. |

### Component Breakdown

```
┌─────────────────────────────────────────────────┐
│                Frontend (Vue 3 SPA)              │
│          Everything below runs in browser        │
│                                                   │
│  ┌───────────────────────────────────────────┐   │
│  │              Input Module                  │   │
│  │  ┌─────────────────────────────────────┐  │   │
│  │  │ DDL Editor (CodeMirror, SQL mode)   │  │   │
│  │  ├─────────────────────────────────────┤  │   │
│  │  │ Query Editor (CodeMirror, SQL mode) │  │   │
│  │  ├─────────────────────────────────────┤  │   │
│  │  │ EXPLAIN Output Editor (auto-detect) │  │   │
│  │  └─────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────┘   │
│                       │                           │
│                       ▼                           │
│  ┌───────────────────────────────────────────┐   │
│  │           Parsing Engine                   │   │
│  │  ┌──────────────┐  ┌──────────────────┐   │   │
│  │  │ Tree Format  │  │ JSON Format      │   │   │
│  │  │ Parser       │  │ Parser           │   │   │
│  │  └──────┬───────┘  └────────┬─────────┘   │   │
│  │         └─────────┬─────────┘             │   │
│  │                   ▼                        │   │
│  │         ┌──────────────────┐              │   │
│  │         │ Normalized Plan  │              │   │
│  │         │ (Internal AST)   │              │   │
│  │         └──────────────────┘              │   │
│  └───────────────────────────────────────────┘   │
│                       │                           │
│              ┌────────┴────────┐                  │
│              ▼                 ▼                  │
│  ┌────────────────┐  ┌────────────────────────┐  │
│  │ Visualization  │  │ Intelligence Engine    │  │
│  │                │  │ (Built-In Rules)       │  │
│  │ - Tree View    │  │                        │  │
│  │ - Table View   │  │ - 30+ Detection Rules  │  │
│  │ - Stats Panel  │  │ - Index Advisor        │  │
│  │ - Cost Chart   │  │ - Query Rewrite Hints  │  │
│  │                │  │ - DDL Cross-Reference   │  │
│  └────────────────┘  └────────────────────────┘  │
│                                                   │
│  ┌───────────────────────────────────────────┐   │
│  │           Storage (Browser-Only)           │   │
│  │  - URL hash: share plans via link         │   │
│  │  - localStorage: save plan history        │   │
│  │  - No server, no database, no cost        │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 4. Feature Breakdown

### MVP (Phase 1) — The Core Tool

| Feature | Description | Cost |
|---------|-------------|------|
| **EXPLAIN Input** | Paste EXPLAIN ANALYZE output (text tree format) | $0 |
| **JSON Input** | Paste EXPLAIN FORMAT=JSON output | $0 |
| **Query Input** | Paste original SQL query (optional) | $0 |
| **DDL Input** | Paste CREATE TABLE statements (optional) | $0 |
| **Format Auto-Detection** | Detect tree vs JSON vs table format automatically | $0 |
| **Tree Visualization** | Interactive tree view of execution plan | $0 |
| **Node Details** | Click node to see cost, rows, time, etc. | $0 |
| **Color Coding** | Red/yellow/green based on performance | $0 |
| **Issue Detection** | 30+ built-in rules detect scans, filesort, temp tables | $0 |
| **Index Recommendations** | Suggest CREATE INDEX statements | $0 |
| **Query Hints** | Suggest rewrites based on pattern matching | $0 |
| **Table Summary** | Tabular view of all operations + metrics | $0 |
| **URL Sharing** | Encode plan in URL hash (compressed) — no backend | $0 |
| **Dark Mode** | Toggle light/dark theme | $0 |
| **Sample Plans** | Pre-loaded examples for demo | $0 |
| **Responsive Design** | Works on tablet+ | $0 |
| **Monthly cost** | | **$0** |

### Phase 2 — Enhanced Analysis

| Feature | Description | Cost |
|---------|-------------|------|
| **DDL-Aware Analysis** | Parse DDL to check if recommended indexes already exist | $0 |
| **Before/After Compare** | Side-by-side plan comparison view | $0 |
| **Estimate vs Actual** | Highlight rows where estimate >> actual | $0 |
| **Cost Breakdown Chart** | Pie/bar chart of cost distribution | $0 |
| **Timeline View** | Gantt-style view showing operation timing | $0 |
| **Plan History** | localStorage-based history of analyzed plans | $0 |
| **Export** | Download plan as PNG/SVG | $0 |
| **Monthly cost** | | **$0** |

### Phase 3 — Ecosystem

| Feature | Description | Cost |
|---------|-------------|------|
| **PostgreSQL Support** | Extend parsers for PostgreSQL EXPLAIN | $0 |
| **MariaDB Support** | Handle MariaDB-specific EXPLAIN differences | $0 |
| **Embeddable Widget** | Standalone `<script>` embed for other sites | $0 |
| **Offline PWA** | Service worker for full offline support | $0 |
| **Slow Query Log Parser** | Parse slow query log entries into plans | $0 |
| **Monthly cost** | | **$0** |

---

## 5. Tech Stack

### Frontend (The Entire App)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Vue 3 (Composition API) | Same as PEV2 (proven for this use case), reactive, lightweight |
| **Build Tool** | Vite | Fast HMR, tree-shaking, modern bundling |
| **Language** | TypeScript | Type safety for complex parser + rule engine logic |
| **Code Editor** | CodeMirror 6 | SQL syntax highlighting, lightweight, extensible |
| **Tree Rendering** | D3.js (tree layout) | Industry standard for hierarchical data visualization |
| **Charts** | Inline SVG (hand-rolled) | Zero dependency, smaller bundle than Chart.js |
| **Styling** | Tailwind CSS | Utility-first, dark mode built-in, purge unused CSS |
| **State** | Vue reactivity (ref/reactive) | Simple enough — no Vuex/Pinia needed |
| **Icons** | Lucide Icons (tree-shaken) | Clean, consistent, only import what's used |
| **Compression** | pako (zlib) | Compress plans for URL hash sharing |
| **SQL Formatting** | sql-formatter (lightweight) | Pretty-print SQL in the query panel |

### What We Don't Need (Cost Savings)

| Removed | Was | Saved |
|---------|-----|-------|
| ~~Claude API~~ | AI optimization | ~$50-500/month at scale |
| ~~Netlify Functions~~ | Serverless backend | $0 (but complexity) |
| ~~Netlify Blobs~~ | Plan storage | Per-read/write costs |
| ~~nanoid~~ | Short URL generation | Not needed without backend |
| ~~Database~~ | Plan persistence | DB hosting costs |
| ~~Auth~~ | User accounts | Auth service costs |

### Backend: None

The entire app is static files. No server, no functions, no database.

### Project Structure

```
reliadb-site/
├── .eleventy.js                    # Add passthrough for tools/explain/
├── tools/
│   └── explain/
│       ├── index.html              # SPA entry point (static shell + Vue mount)
│       ├── package.json            # Deps: vue, vite, d3, codemirror, tailwind, pako
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── tailwind.config.js
│       ├── src/
│       │   ├── main.ts                      # Vue app entry
│       │   ├── App.vue                      # Root component
│       │   ├── components/
│       │   │   ├── InputPanel.vue           # DDL + Query + EXPLAIN editors
│       │   │   ├── PlanTree.vue             # D3-based tree visualization
│       │   │   ├── PlanTable.vue            # Tabular operation list
│       │   │   ├── NodeDetail.vue           # Selected node deep-dive
│       │   │   ├── IssueList.vue            # Detected issues + recommendations
│       │   │   ├── StatsBar.vue             # Top-level plan statistics
│       │   │   ├── CostChart.vue            # Cost distribution (inline SVG)
│       │   │   ├── ShareControls.vue        # Copy URL button
│       │   │   ├── PlanHistory.vue          # localStorage history list
│       │   │   ├── CompareView.vue          # Before/after comparison (Phase 2)
│       │   │   ├── ThemeToggle.vue          # Light/dark mode
│       │   │   └── SamplePlans.vue          # Demo data loader
│       │   ├── parsers/
│       │   │   ├── types.ts                 # PlanNode, PlanStats interfaces
│       │   │   ├── detect-format.ts         # Auto-detect text vs JSON vs table
│       │   │   ├── tree-parser.ts           # Parse EXPLAIN ANALYZE text tree
│       │   │   ├── json-parser.ts           # Parse EXPLAIN FORMAT=JSON
│       │   │   ├── traditional-parser.ts    # Parse traditional EXPLAIN table
│       │   │   ├── ddl-parser.ts            # Parse CREATE TABLE statements
│       │   │   └── normalize.ts             # Convert all formats → internal AST
│       │   ├── analysis/
│       │   │   ├── types.ts                 # Issue, Recommendation interfaces
│       │   │   ├── engine.ts                # Main analysis orchestrator
│       │   │   ├── rules/
│       │   │   │   ├── full-scan.ts             # Full table scan detection
│       │   │   │   ├── filesort.ts              # Using filesort detection
│       │   │   │   ├── temp-table.ts            # Using temporary detection
│       │   │   │   ├── row-mismatch.ts          # Estimated vs actual rows
│       │   │   │   ├── join-order.ts            # Suboptimal join detection
│       │   │   │   ├── index-usage.ts           # Missing/unused index
│       │   │   │   ├── select-type.ts           # Dependent subquery
│       │   │   │   ├── cost-outlier.ts          # Disproportionate cost
│       │   │   │   ├── high-loops.ts            # Excessive loop iterations
│       │   │   │   ├── covering-index.ts        # Could use covering index
│       │   │   │   ├── implicit-conversion.ts   # Type mismatch in joins
│       │   │   │   ├── like-leading-wildcard.ts  # LIKE '%foo' patterns
│       │   │   │   ├── select-star.ts           # SELECT * detection
│       │   │   │   ├── no-limit.ts              # Missing LIMIT on large scans
│       │   │   │   ├── cartesian-join.ts        # Missing join condition
│       │   │   │   └── redundant-sort.ts        # Sort on already-sorted data
│       │   │   ├── index-advisor.ts         # Generate CREATE INDEX DDL
│       │   │   ├── query-hints.ts           # Pattern-based rewrite suggestions
│       │   │   └── ddl-cross-ref.ts         # Check existing indexes from DDL
│       │   ├── visualization/
│       │   │   ├── tree-layout.ts           # D3 tree layout computation
│       │   │   ├── colors.ts                # Performance-based color scales
│       │   │   └── cost-chart.ts            # SVG cost breakdown
│       │   ├── storage/
│       │   │   ├── url-codec.ts             # Encode/decode plan in URL hash
│       │   │   └── history.ts               # localStorage plan history
│       │   ├── utils/
│       │   │   ├── formatting.ts            # Number/duration formatting
│       │   │   └── sql-formatter.ts         # Pretty-print SQL
│       │   └── styles/
│       │       └── main.css                 # Tailwind directives + custom styles
│       └── public/
│           └── favicon.svg
└── docs/
    └── MYSQL-EXPLAIN-ANALYZER-ARCHITECTURE.md  # This document
```

---

## 6. Data Flow & Parsing Logic

### End-to-End Data Flow (All In-Browser)

```
User Input                    Parsing                         Analysis & Display
───────────                   ───────                         ──────────────────

┌──────────────┐
│ EXPLAIN       │
│ ANALYZE       │──┐
│ Output        │  │
└──────────────┘  │     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                   ├────→│ Format       │────→│ Format-      │────→│ Normalized   │
┌──────────────┐  │     │ Detector     │     │ Specific     │     │ Plan AST     │
│ SQL Query     │──┤     │              │     │ Parser       │     │              │
│ (optional)    │  │     │ - Text tree? │     │              │     │ PlanNode[]   │
└──────────────┘  │     │ - JSON?      │     │ - tree-      │     │ with metrics │
                   │     │ - Table?     │     │   parser.ts  │     └──────┬───────┘
┌──────────────┐  │     └──────────────┘     │ - json-      │            │
│ DDL / Schema  │──┘                          │   parser.ts  │     ┌──────┴───────┐
│ (optional)    │                             │ - table-     │     │              │
└──────────────┘                              │   parser.ts  │     ▼              ▼
                                              └──────────────┘  ┌──────────┐ ┌──────────┐
                                                                │Built-In  │ │ Visual-  │
                                                                │Intel     │ │ ization  │
                                                                │Engine    │ │ Engine   │
                                                                │          │ │          │
                                                                │ 30+ rules│ │ - Tree   │
                                                                │ Index    │ │ - Table  │
                                                                │  advisor │ │ - Stats  │
                                                                │ Query    │ │ - Chart  │
                                                                │  hints   │ │          │
                                                                └──────────┘ └──────────┘
                                                                       │          │
                                                                       ▼          ▼
                                                                ┌─────────────────────┐
                                                                │  Output Panel        │
                                                                │  - Issue list        │
                                                                │  - Recommendations   │
                                                                │  - Index DDL         │
                                                                │  - Query hints       │
                                                                └─────────────────────┘
                                                                       │
                                                                       ▼
                                                                ┌─────────────────────┐
                                                                │  Storage (Browser)   │
                                                                │  - URL hash share    │
                                                                │  - localStorage save │
                                                                └─────────────────────┘
```

### URL-Based Sharing (Zero Backend)

```
1. User pastes EXPLAIN output → app parses and displays
2. User clicks "Share"
3. App compresses plan + query + DDL using pako (zlib)
4. Encodes as base64url → appends to URL hash fragment
   e.g., reliadb.com/tools/explain/#p=eJxNj8EKwjAQ...
5. Recipient opens URL → app reads hash → decompresses → renders

Compression: pako (zlib) → base64url encoding
Typical plan: ~2-5KB text → ~500B-1.5KB compressed → fits in URL
Large plans: If >2000 chars, show "Plan too large to share via URL" + offer copy-to-clipboard
```

### localStorage History

```
Key: reliadb-explain-history
Value: [
  {
    id: "1712505600000",           // timestamp as ID
    title: "User-entered or auto-generated title",
    explain: "-> Nested loop...",
    query: "SELECT ...",
    ddl: "CREATE TABLE ...",
    format: "tree",
    createdAt: "2026-04-07T12:00:00Z",
    issueCount: 3
  },
  ...
]
Max entries: 50 (FIFO eviction)
Max total size: ~5MB (localStorage limit)
```

---

## 7. MySQL EXPLAIN Format Analysis

### Supported Input Formats

#### Format 1: EXPLAIN ANALYZE (Tree Format) — Primary Target

```
-> Nested loop inner join  (cost=1.05 rows=3) (actual time=0.132..0.147 rows=3 loops=1)
    -> Filter: (e.department_id = 10)  (cost=0.55 rows=3) (actual time=0.098..0.107 rows=3 loops=1)
        -> Table scan on e  (cost=0.55 rows=5) (actual time=0.089..0.095 rows=5 loops=1)
    -> Single-row index lookup on d using PRIMARY (id=e.department_id)  (cost=0.27 rows=1) (actual time=0.010..0.011 rows=1 loops=3)
```

**Available since MySQL 8.0.18. Contains both estimated AND actual metrics. Most useful format.**

#### Format 2: EXPLAIN FORMAT=JSON

```json
{
  "query_block": {
    "select_id": 1,
    "cost_info": { "query_cost": "1.05" },
    "nested_loop": [
      {
        "table": {
          "table_name": "e",
          "access_type": "ALL",
          "rows_examined_per_scan": 5,
          "rows_produced_per_join": 3,
          "filtered": "60.00",
          "cost_info": { "read_cost": "0.25", "eval_cost": "0.30" },
          "used_columns": ["id", "name", "department_id"],
          "attached_condition": "(`db`.`e`.`department_id` = 10)"
        }
      }
    ]
  }
}
```

**Structured JSON — easy to parse. Includes cost breakdown. Available since MySQL 5.6.**

#### Format 3: Traditional EXPLAIN (Table Format)

```
+----+-------------+-------+------+---------------+------+---------+------+------+-------------+
| id | select_type | table | type | possible_keys | key  | key_len | ref  | rows | Extra       |
+----+-------------+-------+------+---------------+------+---------+------+------+-------------+
|  1 | SIMPLE      | e     | ALL  | NULL          | NULL | NULL    | NULL |    5 | Using where |
|  1 | SIMPLE      | d     | ref  | PRIMARY       | PRIMARY | 4   | e.id |    1 | NULL        |
+----+-------------+-------+------+---------------+------+---------+------+------+-------------+
```

**Most basic format. Flat table, no tree structure. Still widely used.**

### Format Detection Logic

```typescript
function detectFormat(input: string): 'tree' | 'json' | 'table' | 'unknown' {
  const trimmed = input.trim();

  // JSON format
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';

  // Tree format: lines start with ->
  if (/^\s*->/.test(trimmed)) return 'tree';

  // Table format: pipe-separated or +--- borders
  if (trimmed.startsWith('+--') || /^\|\s*id\s*\|/.test(trimmed)) return 'table';

  return 'unknown';
}
```

---

## 8. Parsing Engine Design

### Internal Data Model (Normalized AST)

All input formats are parsed into a common internal representation:

```typescript
interface PlanNode {
  id: string;                      // Unique node identifier
  operation: string;               // e.g., "Nested loop inner join", "Table scan"
  table?: string;                  // Table name if applicable
  accessType?: AccessType;         // ALL, index, range, ref, eq_ref, const, system
  index?: string;                  // Index used (if any)
  possibleKeys?: string[];         // Indexes MySQL considered

  // Estimated metrics (from optimizer)
  estimatedRows: number;
  estimatedCost: number;
  filtered?: number;               // % of rows after WHERE filter

  // Actual metrics (from EXPLAIN ANALYZE only)
  actualTimeFirst?: number;        // Time to first row (ms)
  actualTimeLast?: number;         // Time to last row (ms)
  actualRows?: number;             // Actual rows returned
  loops?: number;                  // Number of loop iterations

  // Derived metrics (calculated by our engine)
  totalActualTime?: number;        // actualTimeLast * loops
  rowMismatchRatio?: number;       // actualRows / estimatedRows
  costPercentage?: number;         // This node's cost as % of total
  isBottleneck: boolean;           // Flagged by analysis engine

  // Metadata
  condition?: string;              // WHERE / ON condition
  extra?: string[];                // "Using filesort", "Using temporary", etc.
  usedColumns?: string[];          // Columns accessed
  keyLength?: number;              // Key length in bytes

  // Tree structure
  children: PlanNode[];
  parent?: PlanNode;
  depth: number;
}

type AccessType =
  | 'system'      // Single row (system table) — best
  | 'const'       // Single row (primary key / unique)
  | 'eq_ref'      // One row per join key (unique index)
  | 'ref'         // Multiple rows per join key (non-unique index)
  | 'fulltext'    // Fulltext index
  | 'ref_or_null' // Like ref + NULL lookup
  | 'index_merge' // Multiple index merge
  | 'range'       // Index range scan
  | 'index'       // Full index scan
  | 'ALL';        // Full table scan — worst

interface PlanStats {
  totalCost: number;
  totalTime?: number;              // Only with ANALYZE
  totalRows: number;
  nodeCount: number;
  maxDepth: number;
  tablesAccessed: string[];
  indexesUsed: string[];
  hasFilesort: boolean;
  hasTempTable: boolean;
  hasFullScan: boolean;
  bottleneckNode?: PlanNode;       // Slowest/most expensive node
}
```

### Tree Format Parser

```typescript
function parseTreeFormat(input: string): PlanNode {
  const lines = input.split('\n').filter(line => line.trim());
  const root: PlanNode = createEmptyNode();
  const stack: { node: PlanNode; indent: number }[] = [];

  for (const line of lines) {
    const indent = line.search(/\S/);
    const content = line.trim();
    if (!content.startsWith('->')) continue;

    const node = parseTreeLine(content);
    node.depth = indent / 4;

    // Find parent: pop stack until we find a node with less indent
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      Object.assign(root, node);
    } else {
      stack[stack.length - 1].node.children.push(node);
      node.parent = stack[stack.length - 1].node;
    }

    stack.push({ node, indent });
  }

  return root;
}

function parseTreeLine(line: string): Partial<PlanNode> {
  // -> Operation (cost=X rows=Y) (actual time=A..B rows=C loops=D)
  const regex = /^->\s+(.+?)\s+\(cost=([0-9.]+)\s+rows=(\d+)\)(?:\s+\(actual time=([0-9.]+)\.\.([0-9.]+)\s+rows=(\d+)\s+loops=(\d+)\))?/;
  const match = line.match(regex);
  if (!match) return { operation: line.replace(/^->\s+/, '') };

  return {
    operation: match[1],
    estimatedCost: parseFloat(match[2]),
    estimatedRows: parseInt(match[3]),
    actualTimeFirst: match[4] ? parseFloat(match[4]) : undefined,
    actualTimeLast: match[5] ? parseFloat(match[5]) : undefined,
    actualRows: match[6] ? parseInt(match[6]) : undefined,
    loops: match[7] ? parseInt(match[7]) : undefined,
  };
}
```

### DDL Parser (for Schema Awareness)

```typescript
interface ParsedDDL {
  tableName: string;
  columns: { name: string; type: string; nullable: boolean }[];
  primaryKey: string[];
  indexes: { name: string; columns: string[]; unique: boolean }[];
  foreignKeys: { columns: string[]; refTable: string; refColumns: string[] }[];
  engine: string;
}

// Regex-based — not a full SQL parser, just enough for CREATE TABLE
function parseDDL(input: string): ParsedDDL[] { ... }
```

---

## 9. Built-In Intelligence Engine

### Design Philosophy

Instead of calling an AI API (expensive, per-request cost), all intelligence is **compiled into the app as TypeScript rules**. This is actually how most production DBA tools work (pt-query-digest, MySQLTuner, etc.) — decades of DBA knowledge encoded as deterministic rules.

**Advantages over AI API:**
- **Deterministic**: Same input always produces same output (no hallucinations)
- **Instant**: No network latency, no API timeouts
- **Free**: Zero marginal cost per analysis
- **Offline**: Works without internet
- **Trustworthy**: DBAs can read and verify every rule
- **Transparent**: Each recommendation links to MySQL docs

### Rule Engine Architecture

```typescript
interface Issue {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'good';
  category: 'scan' | 'sort' | 'join' | 'subquery' | 'index' | 'estimate' | 'general';
  title: string;
  description: string;                    // DBA-friendly explanation
  node: PlanNode;                         // Which node triggered this
  recommendation: string;                 // What to do about it
  ddl?: string;                           // Generated ALTER TABLE / CREATE INDEX
  docLink?: string;                       // Link to MySQL docs
  impact: string;                         // "Scanning 500K rows instead of ~100"
}

interface AnalysisRule {
  id: string;
  name: string;
  description: string;
  check(node: PlanNode, context: AnalysisContext): Issue | null;
}

interface AnalysisContext {
  allNodes: PlanNode[];                   // All nodes in the plan
  stats: PlanStats;                       // Plan-level statistics
  ddl?: ParsedDDL[];                      // Parsed DDL (if provided)
  query?: string;                         // Original SQL query (if provided)
}
```

### Complete Rule Catalog (30+ Rules)

#### Critical Issues (Red)

| # | Rule | Trigger | Recommendation |
|---|------|---------|----------------|
| 1 | **Full Table Scan (Large)** | `accessType = ALL` AND `rows > 1000` | Add index on filtered/joined columns |
| 2 | **Filesort on Large Set** | Extra = "Using filesort" AND `rows > 10000` | Add index matching ORDER BY |
| 3 | **Temp Table for GROUP BY** | Extra = "Using temporary" | Add composite index for GROUP BY |
| 4 | **Dependent Subquery** | `select_type = DEPENDENT SUBQUERY` | Rewrite as JOIN |
| 5 | **Cartesian Join** | `type = ALL` with no condition between tables | Add proper JOIN condition |
| 6 | **Massive Row Mismatch** | `actualRows / estimatedRows > 100` | ANALYZE TABLE + check data distribution |
| 7 | **Nested Loop on Unindexed** | Nested loop with inner `type = ALL` | Index the join column on inner table |

#### Warnings (Orange/Yellow)

| # | Rule | Trigger | Recommendation |
|---|------|---------|----------------|
| 8 | **Row Estimate Mismatch** | Ratio > 10x or < 0.1x | Run ANALYZE TABLE |
| 9 | **No Index Used** | `possible_keys = NULL` AND `type = ALL` | Create index for WHERE columns |
| 10 | **Full Index Scan** | `type = index` (scanning entire index) | Add WHERE conditions or use range |
| 11 | **High Loop Count** | `loops > 100` on inner operations | Filter outer table first |
| 12 | **Index Not Covering** | Index used but extra columns fetched | Consider covering index |
| 13 | **Leading Wildcard LIKE** | Condition has `LIKE '%value'` | Use fulltext index or reverse column |
| 14 | **Implicit Type Conversion** | Join on columns with different types | Match column types |
| 15 | **Select Star Detected** | Query uses `SELECT *` | Select only needed columns |
| 16 | **No LIMIT on Large Scan** | Full scan returning many rows, no LIMIT | Add LIMIT clause |
| 17 | **Redundant Sort** | ORDER BY on already-indexed column | Index already provides order |
| 18 | **Using Join Buffer** | Extra = "Using join buffer" | Index join column |
| 19 | **Range Check for Each Record** | Extra = "Range checked for each record" | Add a proper index |
| 20 | **OR Condition Not Optimized** | OR in WHERE without index_merge | Rewrite as UNION or add indexes |

#### Informational (Blue/Green)

| # | Rule | Trigger | Recommendation |
|---|------|---------|----------------|
| 21 | **Using Covering Index** | Extra = "Using index" | Good — index covers all columns |
| 22 | **Optimal Access (const)** | `type = const` or `system` | Optimal — single row lookup |
| 23 | **Efficient Join (eq_ref)** | `type = eq_ref` | Good — unique index join |
| 24 | **Index Condition Pushdown** | Extra = "Using index condition" | ICP active — filtering at storage engine |
| 25 | **MRR Optimization** | Extra = "Using MRR" | Multi-Range Read active |
| 26 | **Small Table Scan OK** | `type = ALL` but `rows < 100` | Full scan acceptable for tiny tables |

#### DDL-Aware Rules (When Schema Provided)

| # | Rule | Trigger | Recommendation |
|---|------|---------|----------------|
| 27 | **Suggested Index Exists** | Analysis suggests index, but DDL shows it already exists | Check index selectivity / ANALYZE TABLE |
| 28 | **Redundant Index** | DDL has indexes with overlapping prefixes | Drop the shorter prefix index |
| 29 | **Missing FK Index** | Foreign key column has no index | Add index on FK column |
| 30 | **Wrong Column Order** | Index exists but column order doesn't match query | Reorder index columns |

### Index Advisor (Built-In)

```typescript
interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'btree' | 'fulltext';
  reason: string;
  estimatedImpact: 'high' | 'medium' | 'low';
  ddl: string;              // Ready-to-use ALTER TABLE or CREATE INDEX
  existsInDDL: boolean;     // Cross-referenced with provided DDL
}

function generateIndexRecommendations(
  plan: PlanNode,
  ddl?: ParsedDDL[]
): IndexRecommendation[] {
  // Walk the plan tree, for each problematic node:
  // 1. Extract columns from WHERE/JOIN conditions
  // 2. Determine optimal column order (equality first, then range, then ORDER BY)
  // 3. Check if index already exists in DDL
  // 4. Generate CREATE INDEX statement
  // 5. Estimate impact based on access type change (ALL → ref = high)
}
```

### Query Rewrite Hints (Pattern-Based)

Instead of AI, use deterministic pattern matching on the SQL query:

```typescript
interface QueryHint {
  title: string;
  description: string;
  before: string;          // Pattern found in query
  after: string;           // Suggested rewrite
  confidence: 'high' | 'medium';
  docLink: string;
}

// Pattern catalog:
const QUERY_PATTERNS = [
  {
    // SELECT * → SELECT specific columns
    pattern: /SELECT\s+\*/i,
    hint: "Replace SELECT * with specific columns to reduce I/O",
  },
  {
    // NOT IN (subquery) → LEFT JOIN ... IS NULL
    pattern: /NOT\s+IN\s*\(\s*SELECT/i,
    hint: "Rewrite NOT IN (subquery) as LEFT JOIN ... WHERE col IS NULL",
  },
  {
    // WHERE function(column) → direct comparison
    pattern: /WHERE\s+\w+\(\s*\w+\.\w+\s*\)/i,
    hint: "Avoid wrapping indexed columns in functions — prevents index usage",
  },
  {
    // DISTINCT with JOIN → check if DISTINCT is needed
    pattern: /SELECT\s+DISTINCT.*JOIN/i,
    hint: "DISTINCT with JOIN often means duplicate rows — check join conditions",
  },
  {
    // ORDER BY RAND()
    pattern: /ORDER\s+BY\s+RAND\(\)/i,
    hint: "ORDER BY RAND() scans full table — use application-level random selection",
  },
  {
    // LIKE '%value%'
    pattern: /LIKE\s+'%[^']+'/i,
    hint: "Leading wildcard LIKE prevents index usage — consider FULLTEXT index",
  },
  // ... 20+ more patterns
];
```

---

## 10. UI/UX Design

### Layout Wireframe

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [ReliaDB Logo]    Tools    Blog    Services    About    Contact   [🔍] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  MySQL EXPLAIN Analyzer                              [☀/🌙] [Sample ▾]  │
│  Free tool — Visualize, analyze, and optimize MySQL query plans          │
│  Runs 100% in your browser. Your data never leaves your machine.        │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  [EXPLAIN Output*]  │  [SQL Query]  │  [Table Schema (DDL)]       │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │                                                                    │  │
│  │  -- Paste your EXPLAIN ANALYZE output here                        │  │
│  │  -> Nested loop inner join  (cost=1.05 rows=3)                    │  │
│  │      -> Filter: (e.dept = 10)  (cost=0.55 rows=3)                │  │
│  │          -> Table scan on e  (cost=0.55 rows=5) ...               │  │
│  │                                                                    │  │
│  │  Detected format: EXPLAIN ANALYZE (Tree)  ✓                       │  │
│  │                                              [▶ Analyze]          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ Summary Bar ─────────────────────────────────────────────────────┐  │
│  │ Total Cost: 1.05 │ Exec Time: 0.147ms │ Rows: 3 │ Tables: 2     │  │
│  │ ● 1 Critical  ● 1 Warning  ● 2 Suggestions  ● 1 Good            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Plan View ──────[Tree] [Table] [Cost Chart]──────────────────────┐  │
│  │                                                                    │  │
│  │         ┌──────────────────────────┐                              │  │
│  │         │  Nested Loop Inner Join  │                              │  │
│  │         │  cost: 1.05 | rows: 3   │                              │  │
│  │         │  time: 0.132..0.147ms   │                              │  │
│  │         └────────┬─────────────────┘                              │  │
│  │              ┌───┴────────────────┐                               │  │
│  │              ▼                    ▼                                │  │
│  │    ┌──────────────────┐  ┌──────────────────┐                    │  │
│  │    │  ● Filter        │  │  ● Index Lookup  │                    │  │
│  │    │  (Table Scan!)   │  │  d.PRIMARY       │                    │  │
│  │    │  cost: 0.55      │  │  cost: 0.27      │                    │  │
│  │    │  5→3 rows        │  │  1 row × 3 loops │                    │  │
│  │    │ ████████░░ 52%   │  │ ████░░░░░░ 26%   │                    │  │
│  │    └──────────────────┘  └──────────────────┘                    │  │
│  │                                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Analysis ──────[Issues] [Recommendations] [Details]──────────────┐  │
│  │                                                                    │  │
│  │  ● CRITICAL: Full Table Scan on `e` (5 rows examined)            │  │
│  │  The optimizer scans every row in table `e` to find rows          │  │
│  │  matching `department_id = 10`.                                   │  │
│  │                                                                    │  │
│  │  Recommendation: Add an index on the filter column                │  │
│  │  ┌──────────────────────────────────────────────────┐             │  │
│  │  │ ALTER TABLE e ADD INDEX idx_dept (department_id); │  [Copy]    │  │
│  │  └──────────────────────────────────────────────────┘             │  │
│  │                                                                    │  │
│  │  Expected: Table scan (ALL) → Index lookup (ref)                  │  │
│  │  📖 MySQL Docs: dev.mysql.com/doc/refman/8.0/en/table-scan...    │  │
│  │                                                                    │  │
│  │  ● WARNING: Row estimate mismatch (5 estimated, 3 actual)        │  │
│  │  Run ANALYZE TABLE e; to update table statistics.                 │  │
│  │                                                                    │  │
│  │  ● GOOD: Using PRIMARY key on `d` (eq_ref) — optimal access      │  │
│  │                                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Actions ─────────────────────────────────────────────────────────┐  │
│  │  [📋 Share Link]  [📂 Save to History]  [📥 Export PNG]           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ History ─────────────────────────────────────────────────────────┐  │
│  │  Saved plans (browser storage):                                   │  │
│  │  • "Orders join optimization" — 3 issues — 2 min ago             │  │
│  │  • "User search query" — 1 issue — yesterday                     │  │
│  │  [Clear History]                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  Need expert help optimizing your MySQL queries? → reliadb.com/services │
│  (c) ReliaDB 2026 │ Privacy │ Terms                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

### Privacy Banner (Trust Signal)

Prominently displayed above the input area:

```
🔒 Your data stays private — this tool runs entirely in your browser.
   No data is sent to any server. Works offline too.
```

### Color Coding System

| Level | Color | Node Border | Badge | Access Types |
|-------|-------|-------------|-------|--------------|
| **Critical** | `#E74C3C` (red) | 3px red | Red dot | ALL (large), filesort (large) |
| **Warning** | `#E67E22` (orange) | 2px orange | Orange dot | ALL (small), index, index_merge |
| **Good** | `#27AE60` (green) | 1px green | Green dot | ref, range (selective) |
| **Optimal** | `#2ECC71` (bright green) | 1px bright green | Green check | const, eq_ref, system |

### Responsive Behavior

| Viewport | Layout |
|----------|--------|
| Desktop (>1200px) | Side-by-side: tree left, analysis right |
| Tablet (768-1200px) | Stacked: tree top, analysis bottom |
| Mobile (<768px) | Table view only + issue list (tree too complex) |

---

## 11. Deployment Architecture

### Build Pipeline

```
┌──────────────────────────────────────────────────────┐
│                    Build Process                       │
│                                                        │
│  1. cd tools/explain && npm run build                 │
│     └── Vite builds Vue app → tools/explain/dist/     │
│                                                        │
│  2. npm run build (root)                              │
│     ├── Eleventy builds static site → _site/          │
│     ├── Copies tools/explain/dist/ → _site/tools/explain/ │
│     └── Pagefind indexes _site/                       │
│                                                        │
│  3. Netlify deploys _site/                            │
│     (or manually FTP to Hostinger)                    │
└──────────────────────────────────────────────────────┘

Zero server processes. Zero functions. Zero databases.
Just static files on a CDN.
```

### Updated Root `package.json` Scripts

```json
{
  "scripts": {
    "build:explain": "cd tools/explain && npm install && npm run build",
    "build": "npm run build:explain && eleventy && pagefind --site _site",
    "dev": "eleventy --serve",
    "dev:explain": "cd tools/explain && npm run dev"
  }
}
```

### Updated `.eleventy.js`

```javascript
// Add passthrough for built tool
eleventyConfig.addPassthroughCopy({ "tools/explain/dist": "tools/explain" });
```

### Netlify Config Addition

```toml
# SPA routing for the explain tool
[[redirects]]
  from = "/tools/explain/*"
  to = "/tools/explain/index.html"
  status = 200
```

### Hostinger Deployment Option

If deploying to Hostinger (e.g., `tools.reliadb.com`):

```bash
# Build locally
npm run build

# Upload _site/ contents to Hostinger via:
# Option A: FTP/SFTP
# Option B: Hostinger Git integration (push to deploy)
# Option C: Hostinger file manager

# Point tools.reliadb.com subdomain to Hostinger
# Enable SSL via Hostinger (free Let's Encrypt)
```

### Performance Budget

| Metric | Target | Notes |
|--------|--------|-------|
| **Initial JS bundle** | < 150KB gzipped | Vue + D3 + CodeMirror + parsers + rules |
| **Total page weight** | < 200KB gzipped | Everything needed to run |
| **Time to Interactive** | < 2s on 3G | Usable quickly |
| **Parse + Analyze** | < 50ms | All client-side, no network |
| **Lighthouse Score** | > 90 | SEO + performance |

### Bundle Size Estimates

| Package | Gzipped Size | Notes |
|---------|-------------|-------|
| Vue 3 (runtime) | ~16KB | Core framework |
| D3 (tree only) | ~12KB | Only import d3-hierarchy + d3-shape |
| CodeMirror 6 | ~40KB | Core + SQL language + theme |
| Tailwind CSS | ~10KB | Purged, only used classes |
| pako (zlib) | ~14KB | URL compression |
| Our code (parsers + rules + UI) | ~30KB | TypeScript compiled |
| **Total** | **~122KB** | Well under 150KB target |

---

## 12. Future Extensibility

### Multi-Database Parser Architecture

```
parsers/
├── types.ts              # Shared PlanNode interface (database-agnostic)
├── detect-format.ts      # Detect database + format
├── mysql/
│   ├── tree-parser.ts
│   ├── json-parser.ts
│   └── table-parser.ts
├── postgresql/           # Phase 3
│   ├── text-parser.ts
│   └── json-parser.ts
└── mariadb/              # Phase 3
    ├── tree-parser.ts
    └── json-parser.ts
```

### Embeddable Widget (Phase 3)

```html
<!-- Anyone can embed the viewer on their site -->
<script src="https://reliadb.com/tools/explain/embed.js"></script>
<div id="explain-viewer" data-plan="..."></div>
```

### Offline PWA (Phase 3)

```javascript
// Service worker for full offline support
// Tool works even without internet — perfect for on-site DBA work
```

---

## 13. Implementation Roadmap

### Phase 1: MVP (4-6 weeks)

```
Week 1-2: Foundation
├── Set up Vue 3 + Vite + TypeScript in tools/explain/
├── Integrate with Eleventy build pipeline
├── Build InputPanel with CodeMirror (3 tabs: EXPLAIN, Query, DDL)
├── Implement format auto-detection
├── Implement tree format parser
└── Implement JSON format parser

Week 3-4: Visualization & Intelligence
├── Build PlanTree component with D3.js
├── Implement color-coded nodes
├── Build NodeDetail panel
├── Implement 15+ core analysis rules
├── Build IssueList + recommendations panel
├── Index advisor with DDL generation
└── Build StatsBar

Week 5-6: Polish & Ship
├── URL hash sharing (pako compression)
├── Dark mode
├── Sample plans (4-5 real-world examples)
├── localStorage history
├── Privacy banner + trust signals
├── Responsive layout
├── SEO meta tags + landing page copy
├── Test with 20+ real MySQL EXPLAIN outputs
└── Deploy to reliadb.com/tools/explain
```

### Phase 2: Enhanced (3-4 weeks)

```
├── DDL parser + schema cross-referencing
├── Before/After plan comparison view
├── Traditional EXPLAIN table format parser
├── Cost breakdown chart (inline SVG)
├── Estimate vs Actual visualization
├── Query pattern hints (20+ patterns)
├── Export as PNG/SVG
└── Expanded rule catalog (30+ rules)
```

### Phase 3: Ecosystem (4-6 weeks)

```
├── PostgreSQL EXPLAIN support
├── MariaDB EXPLAIN support
├── Timeline (Gantt) visualization
├── Embeddable widget / npm package
├── Offline PWA with service worker
├── Slow query log parser
└── Hostinger mirror deployment
```

---

## Appendix A: Competitive Advantage

| Feature | ReliaDB Analyzer | mysqlexplain.com | MySQL Workbench | PEV2 (PG only) |
|---------|-----------------|------------------|-----------------|-----------------|
| Free & open source | Yes | No | Partial | Yes |
| Web-based | Yes | Yes | No (IDE) | Yes |
| Self-hostable | Yes | No | N/A | Yes |
| No API costs | Yes ($0) | Unknown | N/A | Yes |
| MySQL support | Yes | Yes | Yes | No |
| PostgreSQL support | Phase 3 | No | No | Yes |
| EXPLAIN ANALYZE tree | Yes | Yes | Limited | N/A |
| JSON format | Yes | Yes | Yes | Yes |
| 30+ detection rules | Yes | Basic | No | No |
| Index recommendations | Yes (with DDL) | No | No | No |
| Query rewrite hints | Yes | No | No | No |
| Share via URL | Yes (no backend) | Yes | No | Yes |
| Plan history | Yes (localStorage) | No | No | No |
| Works offline | Yes | No | Yes (desktop) | Yes |
| Embeddable | Phase 3 | No | No | Yes |
| Privacy (no data sent) | Yes | No (server) | Yes (local) | Optional |

## Appendix B: Cost Comparison

### This Architecture: $0/month

```
Netlify free tier:  100GB bandwidth    → $0
Static files:       No compute         → $0
No API calls:       No Claude/OpenAI   → $0
No database:        No storage fees    → $0
No functions:       No serverless      → $0
Hostinger:          Already paid       → $0 extra
─────────────────────────────────────────
Total monthly cost:                       $0
```

### If We Had Used AI API (Rejected)

```
Claude API:         ~$3/1M input tokens
                    ~$15/1M output tokens
At 1000 analyses/day:
  ~2K tokens/request × 30K requests/month = 60M tokens
  Estimated cost: $50-300/month and growing
Plus: Netlify Functions, error handling, rate limiting, etc.
```

**Decision: Built-in intelligence at $0 beats AI API at $50-300/month, especially for a free tool.**

## Appendix C: MySQL EXPLAIN ANALYZE Reference

### Version Availability
- `EXPLAIN ANALYZE`: MySQL 8.0.18+
- `EXPLAIN ANALYZE FORMAT=TREE`: MySQL 8.0.18+ (default)
- `EXPLAIN FORMAT=JSON`: MySQL 5.6+
- `EXPLAIN` (traditional): All versions

### Key Metrics

| Metric | Source | Analysis Value |
|--------|--------|---------------|
| `cost` | Optimizer estimate | Compare relative cost between nodes |
| `rows` (estimated) | Optimizer | Compare with actual to detect stat issues |
| `rows` (actual) | ANALYZE | True row count |
| `actual time` | ANALYZE | Wall-clock time |
| `loops` | ANALYZE | How many times operation ran |
| `access_type` | All formats | Key performance indicator |
| `possible_keys` | JSON/table | What indexes were considered |
| `key` | JSON/table | Index actually used |
| `Extra` | Table format | Filesort, temporary, Using index |
| `filtered` | JSON/table | % of rows after WHERE |

---

*This architecture document is a living document. Update as design decisions evolve during implementation.*
*Last updated: 2026-04-07*
