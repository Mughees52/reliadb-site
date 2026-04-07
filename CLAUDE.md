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
- **Analysis (Phase 3 complete)**:
  - 37 detection rules (8 critical, 20 warning, 3 info, 4 good)
  - 24 SQL query hint patterns
  - 7 query rewrite generators (YEAR→range, subquery→JOIN, NOT IN→LEFT JOIN, GROUP BY fix, SELECT *, OFFSET→keyset, RAND())
  - DDL parser with schema cross-referencing (FK without index, redundant index, NOT NULL suggestions)
  - Query-aware index advisor with covering index intelligence and deduplication
  - Resolves table aliases (o→orders) for correct DDL
  - Scopes all recommendations to plan-relevant tables only
  - Handles: zero-row joins (data integrity), join fan-out, function-on-column, covering index scans, dependent subqueries, row estimate mismatches, and more
  - Tested against 20 real queries on 680K-row MySQL 8.0 database
  - Compared against AI (Claude) analysis — matches or exceeds on all test cases
- **Visualization (PEV2-inspired)**:
  - Tree view with edge thickness = row count, node badges (Slow/Costly/Bad Estimate/Filter)
  - Highlight mode switcher (none/duration/rows/cost) with HSL gradient bars
  - Rich hover tooltips, exclusive time calculation, row estimation display
  - Table view, Cost Breakdown chart, Estimate vs Actual comparison
  - Before/After plan comparison with metric diff table
- **UI tabs**: Issues | Indexes | Hints | Rewrites | Schema
- **Storage**: URL hash sharing (pako compression), localStorage history
- **Integration**: Site nav/footer in HTML shell, Vue renders only `#app`
- **Build**: Separate `package.json` + Vite; Eleventy copies dist via passthrough

## HOW

### Project Structure

```
reliadb-site/
├── .eleventy.js              # Eleventy config (collections, filters, passthrough)
├── .eleventyignore           # Ignores tools/, CLAUDE.md, CHATLOG.md
├── package.json              # Root scripts: build:explain + eleventy + pagefind
├── netlify.toml              # Build config, headers, redirects (SPA redirect for /tools/explain/*)
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
│   │   ├── App.vue           # Root: toolbar + 4 view tabs + comparison
│   │   ├── components/
│   │   │   ├── InputPanel.vue        # 3-tab CodeMirror (EXPLAIN, Query, DDL)
│   │   │   ├── PlanTree.vue          # D3.js tree: badges, HSL bars, tooltips, highlight modes
│   │   │   ├── PlanTable.vue         # Tabular operation list
│   │   │   ├── NodeDetail.vue        # Selected node deep-dive
│   │   │   ├── IssueList.vue         # 5 tabs: Issues, Indexes, Hints, Rewrites, Schema
│   │   │   ├── StatsBar.vue          # Summary dashboard with score
│   │   │   ├── PlanHistory.vue       # localStorage history
│   │   │   ├── CostChart.vue         # Horizontal bar cost breakdown
│   │   │   ├── EstimateVsActual.vue  # Est vs Actual bars
│   │   │   └── CompareView.vue       # Before/After comparison
│   │   ├── parsers/
│   │   │   ├── types.ts              # PlanNode AST with exclusiveTime, timePercentage, rowsRemovedByFilter
│   │   │   ├── detect-format.ts      # Auto-detect (incl MySQL wrapper)
│   │   │   ├── tree-parser.ts        # EXPLAIN ANALYZE tree (wrappers, decimals, subqueries)
│   │   │   ├── json-parser.ts        # EXPLAIN FORMAT=JSON
│   │   │   ├── traditional-parser.ts # Traditional EXPLAIN table
│   │   │   ├── ddl-parser.ts         # CREATE TABLE (balanced parens, FK, indexes)
│   │   │   └── normalize.ts          # Orchestrator
│   │   ├── analysis/
│   │   │   ├── engine.ts             # Orchestrator: rules + DDL + index advisor + hints + rewrites + schema + scoring + dedup
│   │   │   ├── rules.ts              # 37 detection rules
│   │   │   ├── index-advisor.ts      # Query-aware with alias resolution + covering indexes
│   │   │   ├── query-hints.ts        # 24 SQL anti-pattern detectors
│   │   │   ├── query-rewriter.ts     # 7 executable SQL rewrite generators
│   │   │   └── types.ts              # Issue, QueryHint, IndexRec, QueryRewrite, SchemaIssue
│   │   ├── storage/                  # url-codec.ts (pako), history.ts (localStorage)
│   │   ├── utils/                    # formatting.ts, samples.ts (5 real MySQL samples)
│   │   └── styles/main.css           # Tailwind + tool styles matching site design
│   └── dist/                         # Vite build output (gitignored)
├── docs/
│   ├── MYSQL-EXPLAIN-ANALYZER-ARCHITECTURE.md
│   └── MYSQL-OPTIMIZATION-REFERENCE.md
└── _site/                            # Eleventy build output (gitignored)
```

### Build Commands

```bash
npm run build          # Full build: explain tool + eleventy + pagefind
npm run dev            # Eleventy dev server (no explain tool hot reload)
npm run dev:explain    # Vite dev server for explain tool only (localhost:5173)
npm run build:explain  # Build explain tool only
```

### Build Pipeline

1. `npm run build:explain` — vue-tsc + Vite → `tools/explain/dist/`
2. `eleventy` — builds site to `_site/`, copies dist via passthrough
3. `pagefind` — indexes `_site/` for search

### Navigation

Duplicated across **8 files** (not extracted to a single include):
- `index.html`, `services.html`, `results.html`, `about.html`, `contact.html`
- `blog/post-template.html`, `_includes/blog-post.njk`
- `tools/explain/index.html` (hardcoded, not Nunjucks)

Footer: `_includes/footer.njk` (single source for Eleventy pages). Tool has its own copy.

### Key Design Decisions

1. **No AI API costs** — all intelligence compiled as TypeScript rules. Tested against Claude analysis — matches or exceeds.
2. **Client-side everything** — no backend, no functions, no database.
3. **Site nav/footer in HTML shell** — Vue only renders `#app`.
4. **Separate build** — tool has own `package.json`, independent of Eleventy.
5. **Tailwind scoped to tool** — main site uses plain CSS.
6. **MySQL result wrapper handling** — auto-strips `| ... |` borders.
7. **No dark mode** — matches main site.
8. **Plan-scoped recommendations** — DDL issues and index recs only for tables in the current plan.
9. **Weighted scoring** — plan issues get full penalty, DDL issues reduced, good findings give bonus.
10. **Index deduplication** — overlapping recs merged into wider indexes.

### Common Tasks

**Adding a blog post**: Create `_posts/your-slug.md` or use Decap CMS at `/admin/`.

**Adding an analysis rule**: Add `RuleFn` to `rules.ts`, add to `allRules` array.

**Adding a query hint**: Add regex + hint to `query-hints.ts` `patterns` array. Test regex carefully.

**Adding a query rewrite**: Add function to `query-rewriter.ts`, call from `generateRewrites()`.

**Adding index recommendation logic**: Modify `index-advisor.ts`. Plan-level in `walkNodes`, query-level in `analyzeQueryForIndexes()`.

**Updating the nav**: Update all 8 files listed above.

**Testing locally**: `npm run build && python3 -m http.server 8080 -d _site`

**Testing analysis engine**: `cd tools/explain && npx tsx -e "import {...} from './src/...'"`

### Deployment

Push to `main` → Netlify auto-builds and deploys.

### Phase Status

- **Phase 1**: Complete — parsing, tree viz, 19 rules, sharing, history
- **Phase 2**: Complete — DDL parser, 37 rules, 24 hints, PEV2-level viz, cost chart, est vs actual, comparison, query-aware index advisor
- **Phase 3**: Complete — query rewrite engine (7 rewrites), NOT NULL suggestions, index deduplication
- **Future**: PostgreSQL support, MariaDB support, embeddable widget, PWA, slow query log parser, launch blog post

### Brand

- **Colors**: Navy `#1A5276`, Accent `#2980B9`, CTA Orange `#E67E22`
- **Font**: Inter (Google Fonts, 400-800)
- **Domain**: reliadb.com | **Email**: support@reliadb.com
