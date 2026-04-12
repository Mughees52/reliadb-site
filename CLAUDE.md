# CLAUDE.md — ReliaDB Site

## WHY

ReliaDB is a PostgreSQL & MySQL DBA consulting business. This website serves three purposes:

1. **Lead generation** — attract engineers/CTOs searching for database help
2. **Authority building** — publish expert-level blog content on MySQL/PostgreSQL
3. **Free tools** — the MySQL & MariaDB EXPLAIN Analyzer drives organic traffic and positions ReliaDB as the database performance experts

The business is run by a solo DBA consultant based in Valencia, Spain, serving EU & US clients. Cost efficiency is critical — everything must run at **$0/month recurring cost**.

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
| `/tools/explain/` | **MySQL & MariaDB EXPLAIN Analyzer** (Vue 3 SPA) |
| `/search/` | Site search (Pagefind UI) |
| `/admin/` | Decap CMS admin panel |

### MySQL & MariaDB EXPLAIN Analyzer (`/tools/explain/`)

A free, web-based tool for visualizing and analyzing MySQL and MariaDB EXPLAIN output. Separate Vue 3 SPA embedded within the Eleventy site. No equivalent open-source tool exists.

**Docs**: `docs/MYSQL-EXPLAIN-ANALYZER-ARCHITECTURE.md`, `docs/MYSQL-OPTIMIZATION-REFERENCE.md`, `docs/MARIADB-OPTIMIZATION-REFERENCE.md`

Key facts:
- **100% client-side** — no backend, no API calls, no database, $0/month
- **All intelligence built-in** as TypeScript rules (not AI API — user explicitly rejected)
- **Tech**: Vue 3 + Vite + TypeScript + Tailwind CSS + D3.js + CodeMirror 6
- **Supports MySQL**: EXPLAIN ANALYZE (tree), FORMAT=JSON, traditional table
- **Supports MariaDB**: ANALYZE table format (r_rows/r_filtered), ANALYZE FORMAT=JSON (r_total_time_ms, filesort.temporary_table nesting), compound access types (eq_ref|filter)
- **Handles pasted terminal output**: auto-strips SQL prompts (`-> SELECT`, `-> GROUP BY`), MySQL/MariaDB result wrappers (`| ... |` borders), `+---+` borders, `N rows in set` lines
- **Analysis engine (all phases complete)**:
  - 49 detection rules (8 critical, 20 warning, 5 info, 7 good, 4 MariaDB-specific, 5 MySQL 8.0+ specific)
  - 33 SQL query hint patterns + 3 function-based detectors
  - 7 query rewrite generators (YEAR→range, subquery→JOIN, NOT IN→LEFT JOIN, GROUP BY fix, SELECT *, OFFSET→keyset, RAND())
  - DDL parser with FK-without-index, redundant index, NOT NULL suggestions
  - Query-aware index advisor: extracts WHERE/GROUP BY/ORDER BY from SQL, resolves table aliases, suggests composite covering indexes, detects suboptimal index choice on range scans, skips GROUP BY index when PK present, deduplicates overlapping recommendations
  - Index impact simulator: predicts structural plan changes per index (access type, row reduction, covering scan, filesort/temp table elimination, join reorder)
  - Scopes all recommendations to plan-relevant tables only
  - Weighted scoring: plan issues full penalty, DDL reduced, good = bonus
  - Tested against 20 real queries on 680K-row MySQL 8.0 + MariaDB 10.11 databases
  - Compared against AI (Claude) analysis — matches or exceeds
- **Visualization (PEV2-inspired)**: Tree with edge thickness = row count, node badges (Slow/Costly/Bad Estimate/Filter), highlight switcher (none/duration/rows/cost) with HSL gradient, hover tooltips, exclusive time, 4 view tabs (Tree/Table/Cost/Est vs Actual), Before/After comparison
- **UI tabs**: Issues | Indexes | Hints | Rewrites | Schema
- **Storage**: URL hash sharing (pako), localStorage history
- **Auto-detects engine**: Shows "MySQL / tree" or "Mariadb / json" in StatsBar

## HOW

### Project Structure

```
reliadb-site/
├── .eleventy.js              # Eleventy config (collections, filters, passthrough)
├── .eleventyignore           # Ignores tools/, CLAUDE.md, CHATLOG.md
├── package.json              # Root: build:explain + eleventy + pagefind
├── netlify.toml              # Build config, headers, SPA redirect for /tools/explain/*
├── _posts/                   # Blog posts (Markdown + YAML front matter)
├── _categories/              # Category metadata
├── _includes/                # Shared partials (blog-post.njk, footer.njk, nav-search-controls.njk)
├── css/style.css             # Site styles (~30KB)
├── js/main.js                # Nav, search, scroll effects
├── tools/explain/            # EXPLAIN Analyzer (Vue 3 SPA)
│   ├── package.json          # Separate deps
│   ├── vite.config.ts        # Base: /tools/explain/, code-split
│   ├── index.html            # SPA shell: site nav + footer + #app
│   ├── src/
│   │   ├── App.vue           # Root: toolbar + 4 views + comparison
│   │   ├── components/       # InputPanel, PlanTree, PlanTable, NodeDetail, IssueList (5 tabs), StatsBar, PlanHistory, CostChart, EstimateVsActual, CompareView
│   │   ├── parsers/
│   │   │   ├── types.ts      # PlanNode with MySQL + MariaDB fields, DatabaseEngine
│   │   │   ├── detect-format.ts # Auto-detect: strips wrappers, distinguishes SQL prompts from tree nodes
│   │   │   ├── tree-parser.ts   # MySQL EXPLAIN ANALYZE tree
│   │   │   ├── json-parser.ts   # MySQL + MariaDB JSON (filesort.temporary_table nesting)
│   │   │   ├── traditional-parser.ts # MySQL + MariaDB table (r_rows, compound types)
│   │   │   ├── ddl-parser.ts    # CREATE TABLE (balanced parens)
│   │   │   └── normalize.ts     # Orchestrator with wrapper stripping
│   │   ├── analysis/
│   │   │   ├── engine.ts        # Orchestrator: rules + DDL + index advisor + hints + rewrites + schema + scoring + dedup
│   │   │   ├── rules.ts         # 44 detection rules (incl MariaDB-specific)
│   │   │   ├── index-advisor.ts # Query-aware, alias-resolving, composite covering, PK-aware GROUP BY
│   │   │   ├── query-hints.ts   # 24 patterns
│   │   │   ├── query-rewriter.ts # 7 executable SQL rewrite generators
│   │   │   ├── index-impact.ts  # Structural impact simulator for index recommendations
│   │   │   └── types.ts
│   │   ├── storage/             # url-codec.ts, history.ts
│   │   ├── utils/               # formatting.ts, samples.ts (5 MySQL + 2 MariaDB)
│   │   └── styles/main.css
│   └── dist/                    # Vite build output (gitignored)
├── docs/
│   ├── MYSQL-EXPLAIN-ANALYZER-ARCHITECTURE.md
│   ├── MYSQL-OPTIMIZATION-REFERENCE.md
│   └── MARIADB-OPTIMIZATION-REFERENCE.md
└── _site/                       # Eleventy output (gitignored)
```

### Build Commands

```bash
npm run build          # Full: explain tool + eleventy + pagefind
npm run dev            # Eleventy dev server
npm run dev:explain    # Vite dev for tool only (localhost:5173)
```

### IMPORTANT: Clean Build

When Vite rebuilds, old asset hashes can remain in `_site/`. Always clean before serving:
```bash
rm -rf _site/tools/explain/assets && npm run build
```

### Navigation

Duplicated across **8 files**: index.html, services.html, results.html, about.html, contact.html, blog/post-template.html, _includes/blog-post.njk, tools/explain/index.html

### Key Design Decisions

1. **No AI API costs** — all intelligence as TypeScript rules, tested against Claude analysis
2. **Client-side everything** — no backend, no functions, no database
3. **Site nav/footer in HTML shell** — Vue only renders `#app`
4. **Separate build** — tool has own package.json, independent of Eleventy
5. **MySQL result wrapper handling** — strips `| ... |`, `+---+`, SQL prompts (`-> SELECT`)
6. **Tree node detection** — distinguishes `-> Nested loop` (tree node) from `-> SELECT` (SQL prompt) via specific keyword patterns with colons/suffixes
7. **Plan-scoped recs** — DDL issues/index recs only for tables in current plan
8. **PK-aware GROUP BY** — skips GROUP BY index when PK is in the GROUP BY clause
9. **Composite covering indexes** — suggests multi-column indexes for range scans with high row counts
10. **Index deduplication** — subset indexes removed in favor of wider covering indexes
11. **MariaDB field normalization** — rRows→actualRows, rTotalTimeMs→actualTimeLast automatically
12. **No PostgreSQL** — user explicitly said skip it, focus MySQL/MariaDB only

### Testing

- **MySQL 8.0.45** on multipass VM `mysql-box` — `advisor_test` database, 680K rows, 20 test queries
- **MariaDB 10.11.14** on multipass VM `mariadb-box` — `advisor_test` database, 530K rows, 6 test queries
- **Local**: `npm run build && python3 -m http.server 8080 -d _site`
- **Engine analysis**: `cd tools/explain && npx tsx -e "import {...} from './src/...'"`

### Deployment

Push to `main` → Netlify auto-builds and deploys.

### Phase Status

- **Phase 1**: Complete — parsing, tree viz, 19 rules, sharing, history
- **Phase 2**: Complete — DDL parser, 37 rules, PEV2 viz, cost chart, comparison, query-aware index advisor
- **Phase 3**: Complete — query rewrite engine, NOT NULL suggestions, index deduplication
- **MariaDB**: Complete — ANALYZE table + JSON parsing, 7 MariaDB rules, wrapper detection
- **MySQL 8.4 tree enhancements**: Complete — 40+ node types (hash joins, window functions, CTEs, skip scans, antijoins, index merge, etc.)
- **Index impact simulator**: Complete — structural plan change predictions per index recommendation
- **Embeddable widget**: Complete — iframe embed mode with `?embed` param, "Get Embed Code" button, powered-by footer
- **Open-source repo**: `github.com/Mughees52/mysql-explain-analyzer` (MIT license, standalone version without site chrome)
- **awesome-mysql listing**: PR #183 submitted to `shlomi-noach/awesome-mysql`
- **Future backlog**: Slow query log parser, export PDF/PNG, saved workspaces, bulk analyzer, PWA

### SEO & Content

- **SEO Plan**: `docs/SEO-RANKING-PLAN.md` — 7-phase roadmap from 38/100 to 90+/100
- **Current SEO score**: ~78/100 (after Phases 1-3)
- **Google Search Console**: Verified, sitemap submitted (22 pages)
- **Schema**: JSON-LD on every page (ProfessionalService, Service, Person, Article, BreadcrumbList, SoftwareApplication, CollectionPage, ContactPage)
- **AI Search**: robots.txt (AI crawlers allowed), llms.txt, static HTML on tool page for crawler visibility
- **Blog**: 16 posts (4 PostgreSQL, 5 MySQL upgrade, 5 MariaDB migration, 1 EXPLAIN guide, 1 Analyzer announcement), all with cover images, Article schema, OG tags, internal cross-links
- **Blog authors**: Mughees Ahmed (your posts), Mario (MariaDB migration posts) — dynamic rendering
- **Cover images**: Unsplash photos (free license), 1200x630 JPEG, stored in `/images/blog/`
- **Performance**: Non-blocking fonts, logo preload, passive scroll, immutable cache headers, modulepreload for Vite chunks, loading skeleton on tool page
- **MySQL Internals Series**: `docs/MYSQL-INTERNALS-SERIES-PLAN.md` — 13 animated posts, 2 done (Architecture, UPDATE)
- **Blog posts must always include**: `coverImage` in front matter, Article schema, OG tags, related posts cross-links

### Interactive Animation Rules (IMPORTANT)

Blog posts with step-by-step animations MUST follow these rules:

1. **Container**: `overflow: clip` (NOT `overflow: hidden` — hidden breaks sticky positioning)
2. **Controls header**: `position: sticky; top: 72px` (72px = navbar height)
3. **No nested scroll areas**: page itself is the ONLY scroll context. Never use `overflow-y: auto` on internal containers.
4. **Scroll JS**: Use `getBoundingClientRect()` + `window.scrollTo()`. Never use `element.offsetTop` (wrong parent reference) or `scrollIntoView({block:'nearest'})` (unreliable).
5. **Interaction**: Step-by-step via Next/Back buttons. Auto-play is optional toggle, not default.
6. **Theme**: Light (#F4F6F8 container, white cards, colored borders) — matches site design.
7. **See `docs/MYSQL-INTERNALS-SERIES-PLAN.md`** for full design system, color scheme, and scroll JS template.

### Brand

- **Colors**: Navy `#1A5276`, Accent `#2980B9`, CTA Orange `#E67E22`
- **Font**: Inter (Google Fonts, 400-800)
- **Domain**: reliadb.com | **Email**: support@reliadb.com
