# CLAUDE.md — ReliaDB Site

## WHY

ReliaDB is a PostgreSQL & MySQL DBA consulting business. This website serves three purposes:

1. **Lead generation** — attract engineers/CTOs searching for database help
2. **Authority building** — publish expert-level blog content on MySQL/PostgreSQL
3. **Free tools** — the MySQL EXPLAIN Analyzer drives organic traffic and positions ReliaDB as the MySQL performance experts

The business is run by a solo DBA consultant based in Pakistan, serving EU & US clients. Cost efficiency is critical — everything must run at **$0/month recurring cost**.

## WHAT

### Site Overview

- **Domain**: reliadb.com
- **Stack**: Eleventy 3 (static site generator) + Nunjucks templates + plain CSS/JS
- **Hosting**: Netlify (free tier, auto-deploy from `main` branch)
- **Backup hosting**: Hostinger (already paid for, available as fallback)
- **CMS**: Decap CMS (Git Gateway backend) at `/admin/`
- **Search**: Pagefind (client-side WASM, built at compile time)

### Key Pages

| Route | Purpose |
|-------|---------|
| `/` | Homepage — hero, services overview, social proof |
| `/services.html` | Detailed service offerings (audit, support, emergency) |
| `/results.html` | Case studies and results |
| `/about.html` | About the consultant |
| `/blog/` | Blog index with category filtering |
| `/blog/{slug}.html` | Individual blog posts (from `_posts/*.md`) |
| `/contact.html` | Contact form (Formspree backend) |
| `/tools/explain/` | **MySQL EXPLAIN Analyzer** (Vue 3 SPA) |
| `/search/` | Site search (Pagefind UI) |
| `/admin/` | Decap CMS admin panel |

### MySQL EXPLAIN Analyzer (`/tools/explain/`)

A free, web-based tool for visualizing and analyzing MySQL EXPLAIN ANALYZE output. This is a **separate Vue 3 SPA** embedded within the Eleventy site. Comparable to explain.dalibo.com for PostgreSQL — no equivalent exists for MySQL.

**Architecture doc**: `docs/MYSQL-EXPLAIN-ANALYZER-ARCHITECTURE.md`
**MySQL optimization reference**: `docs/MYSQL-OPTIMIZATION-REFERENCE.md`

Key facts:
- **100% client-side** — no backend, no API calls, no database
- **Zero cost** — all intelligence is built-in TypeScript rules (not AI API)
- **Tech**: Vue 3 + Vite + TypeScript + Tailwind CSS + D3.js + CodeMirror 6
- **Parsing**: Supports EXPLAIN ANALYZE (tree), FORMAT=JSON, traditional table format, and MySQL result-wrapped output (`| -> ... |`)
- **Analysis (Phase 2 current)**:
  - 37 detection rules (8 critical, 20 warning, 3 info, 4 good)
  - 24 SQL query hint patterns
  - DDL parser with schema cross-referencing (FK without index, redundant index detection)
  - Query-aware index advisor (extracts WHERE, GROUP BY, ORDER BY columns from SQL)
  - Handles: zero-row joins (data integrity), join fan-out, function-on-column, covering index scans, dependent subqueries, row estimate mismatches, and more
- **Visualization**: Tree view (D3.js), Table view, Cost Breakdown chart, Estimate vs Actual comparison
- **Comparison**: Before/After plan comparison with metric diff table
- **Storage**: URL hash sharing (pako compression), localStorage history
- **Integration**: Site nav/footer are in the HTML shell (`tools/explain/index.html`), Vue renders only the tool content in `#app`
- **Build**: `tools/explain/` has its own `package.json`; Vite builds to `dist/`, Eleventy copies via passthrough
- **Tested against AI analysis** — tool matches or exceeds Claude-level recommendations across 5 real MySQL query plans

## HOW

### Project Structure

```
reliadb-site/
├── .eleventy.js              # Eleventy config (collections, filters, passthrough)
├── .eleventyignore           # Ignores tools/, CLAUDE.md, CHATLOG.md from Eleventy
├── package.json              # Root scripts: build:explain + eleventy + pagefind
├── netlify.toml              # Build config, headers, redirects (incl SPA redirect for /tools/explain/*)
├── _posts/                   # Blog posts (Markdown + YAML front matter)
├── _categories/              # Category metadata
├── _includes/                # Shared partials (blog-post.njk, footer.njk, nav-search-controls.njk)
├── blog/                     # Blog index + category pages
├── css/style.css             # All site styles (~30KB, no preprocessor)
├── js/main.js                # Nav, search, scroll effects, contact form
├── images/                   # Logo SVG/PNG, uploads
├── admin/                    # Decap CMS config + entry point
├── tools/explain/            # MySQL EXPLAIN Analyzer (Vue 3 SPA)
│   ├── package.json          # Separate deps (vue, d3, codemirror, pako, tailwind)
│   ├── vite.config.ts        # Base path: /tools/explain/, code-split chunks
│   ├── index.html            # SPA shell with site nav + footer + #app mount
│   ├── src/
│   │   ├── main.ts           # Vue app entry
│   │   ├── App.vue           # Root component (toolbar + 4 view tabs + comparison)
│   │   ├── components/
│   │   │   ├── InputPanel.vue      # 3-tab CodeMirror editor (EXPLAIN, Query, DDL)
│   │   │   ├── PlanTree.vue        # D3.js interactive tree, color-coded, zoomable
│   │   │   ├── PlanTable.vue       # Tabular operation list
│   │   │   ├── NodeDetail.vue      # Selected node deep-dive
│   │   │   ├── IssueList.vue       # Issues + Index Recommendations + Query Hints tabs
│   │   │   ├── StatsBar.vue        # Summary dashboard with score
│   │   │   ├── PlanHistory.vue     # localStorage history
│   │   │   ├── CostChart.vue       # Horizontal bar cost breakdown (Phase 2)
│   │   │   ├── EstimateVsActual.vue # Est vs Actual rows comparison (Phase 2)
│   │   │   └── CompareView.vue     # Before/After plan comparison (Phase 2)
│   │   ├── parsers/
│   │   │   ├── types.ts            # PlanNode AST, AccessType, computeStats()
│   │   │   ├── detect-format.ts    # Auto-detect tree vs JSON vs table (incl MySQL wrapper)
│   │   │   ├── tree-parser.ts      # EXPLAIN ANALYZE tree (handles wrappers, decimals, subqueries)
│   │   │   ├── json-parser.ts      # EXPLAIN FORMAT=JSON
│   │   │   ├── traditional-parser.ts # Traditional EXPLAIN table
│   │   │   ├── ddl-parser.ts       # CREATE TABLE parser (Phase 2)
│   │   │   └── normalize.ts        # Orchestrator
│   │   ├── analysis/
│   │   │   ├── engine.ts           # Orchestrates rules + DDL cross-ref + index advisor + hints
│   │   │   ├── rules.ts            # 37 detection rules
│   │   │   ├── index-advisor.ts    # Query-aware index recommendations with covering index suggestions
│   │   │   ├── query-hints.ts      # 24 SQL anti-pattern detectors
│   │   │   └── types.ts            # Issue, QueryHint, IndexRecommendation interfaces
│   │   ├── storage/                # url-codec.ts (pako), history.ts (localStorage)
│   │   ├── utils/                  # formatting.ts, samples.ts (5 real MySQL samples)
│   │   └── styles/main.css         # Tailwind + tool-specific styles matching site design
│   └── dist/                       # Vite build output (gitignored)
├── docs/
│   ├── MYSQL-EXPLAIN-ANALYZER-ARCHITECTURE.md  # Full architecture design
│   └── MYSQL-OPTIMIZATION-REFERENCE.md         # MySQL 8.4 optimization knowledge base
└── _site/                    # Eleventy build output (gitignored)
```

### Build Commands

```bash
npm run build          # Full build: explain tool + eleventy + pagefind
npm run dev            # Eleventy dev server (no explain tool hot reload)
npm run dev:explain    # Vite dev server for explain tool only (http://localhost:5173/tools/explain/)
npm run build:explain  # Build explain tool only
```

### Build Pipeline

1. `npm run build:explain` — `cd tools/explain && npm install && npm run build` (vue-tsc + Vite → `tools/explain/dist/`)
2. `eleventy` — builds static site to `_site/`, copies `tools/explain/dist/` → `_site/tools/explain/` via passthrough
3. `pagefind` — indexes `_site/` for search

### Navigation

The nav is **duplicated across 8 files** (not extracted to a single include for the non-blog pages):
- `index.html`, `services.html`, `results.html`, `about.html`, `contact.html`
- `blog/post-template.html`, `_includes/blog-post.njk`
- `tools/explain/index.html` (hardcoded, not Nunjucks)

The footer is a single source of truth: `_includes/footer.njk` (used by all Eleventy pages). The explain tool has its own copy in `tools/explain/index.html`.

### Key Design Decisions

1. **No AI API costs** — all analysis intelligence is compiled into TypeScript rules, not external API calls. The user explicitly rejected Claude API integration due to recurring costs. Tool was tested against AI (Claude) analysis and matches or exceeds its recommendations.
2. **Client-side everything** — no backend, no serverless functions, no database. Plans shared via URL hash encoding.
3. **Site nav/footer in HTML shell** — the Vue SPA's `index.html` contains the actual site nav and footer HTML (copy of main site). Vue only renders the `#app` div between them. This keeps the tool visually consistent with the rest of the site.
4. **Separate build** — the explain tool has its own `package.json` and Vite build, completely independent of Eleventy. Eleventy just copies the dist output.
5. **Tailwind scoped to tool** — the main site uses plain CSS (`css/style.css`). Only the explain tool uses Tailwind, scoped to its own styles. Both CSS files load on the tool page.
6. **MySQL result wrapper handling** — parser strips `+---+` borders, `| EXPLAIN |` headers, and `| ... |` pipe wrappers so users can paste directly from the mysql CLI.
7. **No dark mode** — matches main site which has no dark mode. Removed from tool for consistency.

### Common Tasks

**Adding a blog post**: Create `_posts/your-slug.md` with front matter (title, date, description, categories, tags, read_time). Or use Decap CMS at `/admin/`.

**Adding an analysis rule**: Add a `RuleFn` function to `tools/explain/src/analysis/rules.ts` following the existing pattern. Add it to the `allRules` array in the correct severity section.

**Adding a query hint pattern**: Add a regex + hint object to `tools/explain/src/analysis/query-hints.ts` in the `patterns` array. Test the regex carefully — e.g., `SELECT *` regex must not match multiplication `*`.

**Adding index recommendations**: Modify `tools/explain/src/analysis/index-advisor.ts`. Plan-level recs come from walking the PlanNode tree; query-level recs come from SQL parsing in `analyzeQueryForIndexes()`.

**Updating the nav**: Must be updated in all 8 files listed above (7 Eleventy pages + the explain tool's `index.html`).

**Testing locally**: `npm run build && python3 -m http.server 8080 -d _site`

### Deployment

Push to `main` → Netlify auto-builds and deploys. No manual steps needed.

### Current Phase Status

- **Phase 1 (MVP)**: Complete — parsing, tree viz, 19 rules, sharing, history
- **Phase 2 (Enhanced)**: Complete — DDL parser, 37 rules, 24 hints, cost chart, est vs actual, comparison view, query-aware index advisor
- **Phase 3 (Planned)**: Covering index intelligence (multi-column), query rewrite engine (generate actual SQL), NOT NULL suggestions, index deduplication, PostgreSQL/MariaDB support, embeddable widget, PWA

### Brand

- **Colors**: Navy `#1A5276`, Accent `#2980B9`, CTA Orange `#E67E22`
- **Font**: Inter (Google Fonts, 400-800 weights)
- **Tone**: Professional DBA consulting, technical but approachable
- **Domain**: reliadb.com
- **Email**: support@reliadb.com
