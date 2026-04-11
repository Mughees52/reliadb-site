# ReliaDB SEO Ranking Plan — Road to #1

**Created:** 2026-04-10
**Last Updated:** 2026-04-11
**Baseline SEO Score:** 38/100
**Current SEO Score:** ~78/100 (after Phase 1-3)
**Target SEO Score:** 90+/100
**Goal:** Rank #1 for core database consulting and MySQL EXPLAIN keywords

---

## Current State After Phase 1 (April 11, 2026)

| Category | Before | After | Status |
|----------|--------|-------|--------|
| Technical SEO | 35/100 | 72/100 | robots.txt, sitemap, canonicals, caching done |
| Content Quality | 62/100 | 62/100 | Strong blog, E-E-A-T needs work (Phase 2) |
| On-Page SEO | 30/100 | 75/100 | OG tags, canonicals, Twitter Cards on all pages |
| Schema | 0/100 | 82/100 | 6 schema types across all pages |
| Performance | 55/100 | 68/100 | Non-blocking fonts, logo preload, passive scroll, caching |
| AI Search Readiness | 34/100 | 58/100 | llms.txt, tool visible to AI, robots.txt with AI bots |
| Images | 25/100 | 35/100 | Logo dimensions added, still needs OG image |

---

## Phase 1: Technical Foundation (DONE - April 10-11, 2026)

### Completed:
- [x] Created `robots.txt` with AI crawler directives (GPTBot, ClaudeBot, PerplexityBot allowed; CCBot blocked)
- [x] Created `sitemap.xml` via Eleventy template (auto-generates for all pages + blog posts)
- [x] Created `llms.txt` for AI search self-description
- [x] Added `<link rel="canonical">` to ALL pages
- [x] Added Open Graph meta tags to ALL pages
- [x] Added Twitter Card meta tags to ALL pages
- [x] Added `Organization` + `WebSite` + `SearchAction` JSON-LD schema to homepage
- [x] Added `Service` + `OfferCatalog` JSON-LD schema to services page
- [x] Added `Person` JSON-LD schema to about page
- [x] Added `Article` + `BreadcrumbList` JSON-LD schema to ALL blog posts (via template)
- [x] Added `SoftwareApplication` JSON-LD schema to EXPLAIN Analyzer
- [x] Non-blocking Google Fonts loading on ALL pages (preload + onload swap)
- [x] Dropped unused font weight 500 (400;600;700;800 only)
- [x] Added `width="180" height="42"` to ALL logo `<img>` tags (CLS fix)
- [x] Added `<link rel="preload">` for logo SVG with `fetchpriority="high"` on all pages
- [x] Made scroll listener passive in `main.js`
- [x] Moved Netlify Identity Widget to admin-only (conditional load)
- [x] Added `Cache-Control: immutable` headers for Vite assets and images
- [x] Added static HTML content section to EXPLAIN Analyzer (AI crawler readable)
- [x] Updated `.eleventy.js` to passthrough `robots.txt`, `llms.txt`, Google verification file
- [x] Added `date` filter to Eleventy for sitemap/schema date formatting
- [x] Fixed about page meta description (removed "Barcelona-based", now "based in Pakistan")
- [x] Dynamic author rendering in blog template — "Mughees Ahmed" for your posts, "Mario" for Mario's posts
- [x] Added `author: "Mughees Ahmed"` to all 10 blog posts without author field
- [x] Verified Google Search Console (HTML file method)
- [x] Submitted sitemap.xml to Google Search Console — **22 pages discovered, Status: Success**
- [x] Google Search Console verification file deployed (`googlebff62dc8eab397a4.html`)

### Schema Audit Results (verified live April 11):
| Page | Schema Types | Score |
|------|-------------|-------|
| Homepage | `ProfessionalService`, `WebSite` + `SearchAction` | PASS |
| Services | `Service` + `OfferCatalog` (5 services) | PASS |
| About | `Person` (Mughees Ahmed) | PASS |
| EXPLAIN Analyzer | `SoftwareApplication` (free, web) | PASS |
| Blog posts (Mughees) | `Article` + `BreadcrumbList` + `FAQPage` | PASS |
| Blog posts (Mario) | `Article` + `BreadcrumbList` | PASS |
| Results | None | MISSING (Phase 2) |
| Contact | None | MISSING (Phase 2) |

---

## Phase 2: Content Authority & E-E-A-T (NEXT — Start April 12)

### 2.1 Author Identity (Critical for E-E-A-T)
- [x] Standardize author name across ALL blog posts front matter (done: Mughees Ahmed / Mario)
- [x] Update blog post template author box to dynamic rendering (done)
- [ ] Add author photo to about page and blog template
- [ ] Add credentials/experience section to about page (years of experience, certifications, notable projects)
- [ ] Update about page with personal DBA story (E-E-A-T "Experience")

### 2.2 Geographic Consistency
- [x] Fixed about page meta description (now says "based in Pakistan")
- [ ] Update about page body text to match meta description exactly
- [ ] Verify footer, about page meta, and homepage all use identical location language

### 2.3 Blog Content Improvements
- [ ] Add `dateModified` to blog post front matter for updated posts
- [ ] Add `dateModified` field to Article JSON-LD schema
- [ ] Add TL;DR / Key Takeaways summary box at top of each blog post (AI citation capsule)
- [ ] Add FAQ sections to at least 3 blog posts (PostgreSQL autovacuum, MySQL upgrade, EXPLAIN analyzer)
- [ ] Cross-link between related blog posts (internal linking)
- [ ] Add "Last Updated: [date]" visible badge on blog posts

### 2.4 Missing Schema
- [ ] Add schema to `results.html` (case study / Review markup)
- [ ] Add schema to `contact.html` (ContactPoint markup)

### 2.5 New Content Pages
- [ ] Create `/faq.html` — 15-20 common database consulting questions with concise answers
- [ ] Create `/glossary.html` — Database terms glossary (programmatic SEO potential)
- [ ] Add industry-specific landing pages:
  - `/saas-database-consulting.html`
  - `/ecommerce-database-optimization.html`

---

## Phase 3: Performance Optimization

### 3.1 EXPLAIN Analyzer Performance
- [ ] Add `<link rel="modulepreload">` for Vite chunks (build script to read manifest.json and inject)
- [ ] Consider lazy-loading CodeMirror until user interacts with input
- [ ] Add loading skeleton HTML for the tool (before Vue mounts)
- [ ] Consider Web Worker for analysis engine (keeps UI responsive for large plans)

### 3.2 Image Optimization
- [ ] Create a proper OG image (1200x630) for social sharing — branded, not just the logo
- [ ] Add proper `og:image` dimensions meta tags (`og:image:width`, `og:image:height`)
- [ ] Convert logo to optimized formats if needed
- [ ] Add favicon as a proper file (not inline data URI) for cacheability

### 3.3 Font Optimization
- [ ] Consider self-hosting Inter font files (eliminates Google Fonts DNS/connection overhead)
- [ ] Add `font-display: optional` for body weight to eliminate FOUT on slow connections
- [ ] Add `size-adjust` on fallback font to reduce CLS from font swap

---

## Phase 4: Off-Site SEO & Link Building (Weeks 2-4)

### 4.1 Immediate (This Week — April 11-18)
- [ ] Submit blog RSS to **PlanetMySQL** for auto-syndication
- [ ] Open PRs on **awesome-mysql** GitHub lists for EXPLAIN Analyzer
- [ ] Post **"Show HN"** on Hacker News for EXPLAIN Analyzer
- [ ] Create **dba.stackexchange.com** profile, answer 5+ MySQL performance questions with tool links
- [x] Verify site on **Google Search Console** (done April 11)
- [x] Submit sitemap to Google (done April 11 — 22 pages discovered)
- [ ] Verify site on **Bing Webmaster Tools**
- [ ] Submit sitemap to Bing

### 4.2 Month 1 (April-May 2026)
- [ ] Cross-publish top 3 blog posts to **dev.to** and **Hashnode** (with canonical back to reliadb.com)
- [ ] Submit to **DB Weekly** and **MySQL Weekly** newsletters
- [ ] Submit EXPLAIN Analyzer to **Netlify showcase**
- [ ] Submit to **madewithvuejs.com** and **vuejsexamples.com**
- [ ] Create **Clutch.co** and **GoodFirms** consulting directory profiles
- [ ] Reddit participation: r/mysql, r/PostgreSQL, r/Database, r/dba (share tool + answer questions)

### 4.3 Month 2-3 (May-July 2026)
- [ ] **Product Hunt** launch for EXPLAIN Analyzer
- [ ] Record **YouTube** walkthrough video of EXPLAIN Analyzer (5-10 min)
- [ ] Create a **YouTube channel** for database tips (even 3-5 short videos helps AI citation)
- [ ] Pitch **guest post** to Percona Blog after PlanetMySQL presence established
- [ ] Submit to FOSS directories: ToolDB, AlternativeTo, LibHunt

---

## Phase 5: Keyword Strategy & Content Pipeline (Month 2+)

### 5.1 Primary Target Keywords
| Keyword | Current Rank | Target | Priority |
|---------|-------------|--------|----------|
| mysql explain analyzer | Unknown | #1 | Critical |
| mariadb explain analyzer | Unknown | #1 | Critical |
| mysql explain visualizer | Unknown | #1 | Critical |
| postgresql dba consulting | Unknown | Top 10 | High |
| mysql dba consulting | Unknown | Top 10 | High |
| database health audit | Unknown | Top 10 | High |
| postgresql autovacuum tuning | Unknown | Top 5 | High |
| mysql 8.4 upgrade guide | Unknown | Top 5 | High |
| mariadb to aurora migration | Unknown | Top 3 | High |
| free mysql query analyzer | Unknown | #1 | Critical |

### 5.2 Content Calendar (Monthly Blog Posts)
Target: 2-4 posts per month, alternating between:
- **Tool-focused**: MySQL/MariaDB performance analysis topics (drives EXPLAIN Analyzer traffic)
- **Consulting-focused**: Case study deep-dives, migration guides (drives service leads)
- **Tutorial-focused**: Step-by-step guides (builds E-E-A-T authority)

#### Suggested next blog topics:
1. "MySQL EXPLAIN Output Explained: The Complete Guide" (targets #1 for "mysql explain")
2. "How to Read MySQL Slow Query Log: A DBA's Guide"
3. "PostgreSQL vs MySQL: When to Choose Which (2026)"
4. "AWS RDS Cost Optimization: A Complete Checklist"
5. "MySQL Index Design: Composite Indexes That Actually Work"
6. "PostgreSQL Connection Pooling with PgBouncer: Setup & Tuning"
7. "Emergency Database Recovery: What to Do When Production Is Down"
8. "MariaDB vs MySQL: Differences That Matter for Production"

### 5.3 Topic Cluster Strategy
```
Hub: /tools/explain/ (EXPLAIN Analyzer)
  Spoke: MySQL EXPLAIN Output Explained
  Spoke: MariaDB ANALYZE vs MySQL EXPLAIN ANALYZE
  Spoke: MySQL Index Design Guide
  Spoke: How to Read MySQL Slow Query Log

Hub: /services.html (DBA Consulting)
  Spoke: Database Health Audit Checklist
  Spoke: AWS RDS Cost Optimization Guide
  Spoke: When to Hire a DBA vs Train Your Team

Hub: /blog/postgresql-autovacuum (PostgreSQL Performance)
  Spoke: PostgreSQL Connection Pooling
  Spoke: PostgreSQL Index Types Explained
  Spoke: PostgreSQL Replication Setup Guide
```

---

## Phase 6: Advanced Technical SEO (Month 3+)

### 6.1 Structured Data Expansion
- [ ] Add `FAQPage` schema to FAQ page (for AI/LLM citation benefit only — not for Google rich results)
- [ ] Add `Review` schema to results page case studies
- [ ] Add `VideoObject` schema when YouTube videos are created
- [ ] ~~Add `HowTo`~~ NO (deprecated Sept 2023)
- [ ] Add `ItemList` schema to blog index for post listings

### 6.2 International SEO
- [ ] Consider adding `hreflang` if creating region-specific content
- [ ] Ensure consistent language across all pages (en)

### 6.3 IndexNow Protocol
- [ ] Implement IndexNow for instant Bing indexing when content is published
- [ ] Netlify deploy hook → IndexNow API submission

### 6.4 Core Web Vitals Monitoring
- [ ] Set up Google Search Console CWV monitoring
- [ ] Set up PageSpeed Insights scheduled checks
- [ ] Target: All pages "Good" for LCP (<2.5s), INP (<200ms), CLS (<0.1)

---

## Phase 7: Conversion Optimization (Month 3+)

### 7.1 Lead Generation
- [ ] Add exit-intent popup for free assessment (non-intrusive)
- [ ] Add inline CTA banners in blog posts (already has sidebar CTA — add mid-article)
- [ ] Create downloadable resources:
  - "Database Health Audit Checklist" PDF (email gate)
  - "MySQL Performance Tuning Cheat Sheet" PDF
  - "PostgreSQL Autovacuum Config Template"

### 7.2 Social Proof
- [ ] Get real client testimonials with names/titles (even anonymized company with title)
- [ ] Add "As seen on" section if PlanetMySQL/HN/ProductHunt features happen
- [ ] Add trust badges: certifications, years of experience, number of databases managed

### 7.3 Analytics
- [ ] Set up Google Analytics 4 (GA4) with conversion events
- [ ] Track: contact form submissions, EXPLAIN Analyzer usage, blog engagement
- [x] Set up Google Search Console to monitor keyword rankings (done April 11)

---

## Scoring Targets

| Phase | Timeline | Expected Score | Status |
|-------|----------|---------------|--------|
| Phase 1 | Day 1-2 | 62-68/100 | DONE |
| Phase 2 | Week 1-2 | 72-78/100 | NEXT |
| Phase 3 | Week 2-3 | 78-82/100 | |
| Phase 4 | Week 2-8 | 82-88/100 (with backlinks) | |
| Phase 5 | Month 2-6 | 88-92/100 (with content) | |
| Phase 6 | Month 3+ | 90-95/100 | |
| Phase 7 | Month 3+ | Revenue optimization | |

---

## Tomorrow's Session Checklist (April 12)

### Code changes (with Claude):
1. [ ] Add schema to `results.html` and `contact.html`
2. [ ] Add `dateModified` to blog post front matter + Article schema
3. [ ] Add "Last Updated" visible badge to blog template
4. [ ] Add TL;DR summary box template for blog posts
5. [ ] Cross-link related blog posts (internal linking)
6. [ ] Create proper 1200x630 OG image

### Manual actions (do yourself):
1. [ ] Post **Show HN** for the EXPLAIN Analyzer
2. [ ] Open PR on **awesome-mysql** GitHub list
3. [ ] Submit blog RSS to **PlanetMySQL**
4. [ ] Create **dba.stackexchange.com** profile
5. [ ] Verify site on **Bing Webmaster Tools** + submit sitemap

---

## Quick Reference: Files Changed in Phase 1

| File | Changes |
|------|---------|
| `robots.txt` | NEW — crawl directives + AI bot rules |
| `llms.txt` | NEW — AI search self-description |
| `sitemap.njk` | NEW — auto-generated sitemap.xml |
| `googlebff62dc8eab397a4.html` | NEW — Google Search Console verification |
| `.eleventy.js` | Added date filter, passthrough for robots.txt/llms.txt/verification file |
| `.eleventyignore` | Added docs/** to exclude plan from build |
| `netlify.toml` | Added Cache-Control headers for assets |
| `index.html` | Canonical, OG tags, Twitter Card, schema (Org+WebSite), non-blocking fonts, logo dimensions, Netlify Identity conditional |
| `services.html` | Canonical, OG tags, Twitter Card, Service schema, non-blocking fonts, logo dimensions |
| `about.html` | Canonical, OG tags, Twitter Card, Person schema, fixed meta description, non-blocking fonts, logo dimensions |
| `results.html` | Canonical, OG tags, Twitter Card, non-blocking fonts, logo dimensions |
| `contact.html` | Canonical, OG tags, Twitter Card, non-blocking fonts, logo dimensions |
| `blog/index.njk` | Canonical, OG tags, non-blocking fonts, logo preload |
| `search/index.njk` | Non-blocking fonts |
| `_includes/blog-post.njk` | Canonical, OG tags, Article+BreadcrumbList schema, dynamic author, non-blocking fonts, logo dimensions |
| `_includes/footer.njk` | Logo dimensions |
| `tools/explain/index.html` | SoftwareApplication schema, static HTML description for AI crawlers, non-blocking fonts, logo dimensions |
| `blog/post-template.html` | Logo dimensions |
| `js/main.js` | Passive scroll listener |
| `_posts/*.md` (10 files) | Added `author: "Mughees Ahmed"` |

---

## Notes

- **No API costs** — all improvements are code/content changes, zero recurring cost
- **No PostgreSQL** for the EXPLAIN tool — focus MySQL/MariaDB only
- **Author names** — Mughees Ahmed (your posts), Mario (MariaDB migration posts) — both render correctly
- **OG Image** — currently using ReliaDB-Logo.png; needs a proper 1200x630 branded image (Phase 3)
- **Google Search Console** — verified April 11, sitemap submitted, 22 pages discovered
