---
title: "We Built a Free MySQL EXPLAIN Analyzer — Here's What It Catches That You're Missing"
date: 2026-04-09T10:00:00.000Z
description: "Free MySQL & MariaDB EXPLAIN ANALYZE visualizer with 49 detection rules, smart index recommendations, and impact simulation. Tested against AI analysis on 50 unseen queries. 100% client-side."
categories:
  - mysql
  - tools
read_time: 14
featured: true
author: "Mughees Ahmed"
dateModified: "2026-04-12T00:00:00+00:00"
---

Most MySQL performance problems hide in plain sight. The query runs, returns results, and nobody looks at the execution plan until the database is on fire at 3 AM.

I've spent years as a DBA consultant staring at EXPLAIN output for clients across the EU and US. The same patterns repeat: a missing composite index turns a 50ms query into a 5-second table scan. A `YEAR()` function call on an indexed column defeats the index entirely. A three-table JOIN creates a temporary table with thousands of rows because the optimizer picked the wrong driving table.

MySQL's raw EXPLAIN output tells you all of this — if you know where to look. But reading nested tree output or JSON plans isn't intuitive, and the traditional tabular EXPLAIN format hides critical details.

So I built a tool that does the reading for you.

<h2 id="what-is-it">What Is the ReliaDB EXPLAIN Analyzer?</h2>

It's a free, browser-based tool that takes your MySQL or MariaDB EXPLAIN output and gives you:

- **Interactive tree visualization** with color-coded nodes showing where time and rows are spent
- **49 detection rules** that flag full scans, filesort operations, temporary tables, bad row estimates, and more
- **Smart composite index recommendations** — merges WHERE + JOIN + GROUP BY + ORDER BY columns into one optimal index with the correct column order
- **Impact simulation** showing the structural plan changes each index would produce
- **Query rewrite suggestions** with executable SQL alternatives
- **DDL schema analysis** that cross-references your table definitions with the plan

Everything runs in your browser. No backend, no API calls, no data sent anywhere. Your query plans stay on your machine.

<a href="/tools/explain/" class="btn btn-primary" style="margin: 1.5rem 0; display: inline-block;">Try the EXPLAIN Analyzer &rarr;</a>

<h2 id="how-to-use">How to Use It (3 Steps)</h2>

1. **Run EXPLAIN ANALYZE** on your query in MySQL: `EXPLAIN ANALYZE SELECT ...`
2. **Paste the output** into the EXPLAIN Output box — paste it exactly as MySQL prints it, including borders and prompts. The tool strips them automatically.
3. **Add your SQL query and DDL** (optional but recommended) — paste the original SQL in the "SQL Query" tab and your `CREATE TABLE` statements in the "Table Schema" tab. This unlocks composite index recommendations, query rewrites, and schema analysis.

That's it. The tool parses, visualizes, and analyzes in under a second.

<h2 id="real-example">Real Example: Enterprise Feature Usage Report</h2>

Every claim in this blog post is verified against a real MySQL 8.0.45 database. I created a fresh SaaS billing schema with 6 tables and 333,000 rows that this tool has never been trained on — then ran these queries and pasted the raw output.

Here's a feature usage report for enterprise tenants. This is the kind of query that runs on a SaaS dashboard and silently gets slower as your data grows:

```sql
SELECT t.name, t.plan, ue.feature,
       SUM(ue.quantity) AS total_usage
FROM usage_events ue
JOIN tenants t ON t.id = ue.tenant_id
WHERE ue.recorded_at >= '2026-01-01'
  AND t.plan = 'enterprise'
GROUP BY t.name, t.plan, ue.feature
ORDER BY total_usage DESC
```

This query joins 150,000 usage events against 5,000 tenants, filters by plan and date, groups by three columns, and sorts. The analyzer scores it **31 out of 100** — here's why:

<div style="margin: 2rem 0;">
<iframe src="/tools/explain/?embed#p=eJydVGuPmkAU_Ss3fhETdzIg6mrrJqyyu7SKG8S2JiZkKlNLq-Aywz7S9L_3guBj0aZbQ3SQM_ece84dflV4pVu5uIJJFMsuyEiylZcItuQwMCd9AIUtZMJWIIM176kNnRD8gjh6Ej291dZgFUUb0VNr8xDwg4Vc9nXFQSxYCFEI7yVfb6KYxS9XpVqNtFbjbK28nrFcxnzJJIdEBOESdgVBZkz_UTWvbHMhuZ89hyAMeQw_ogBByiISstfo6EUZTW-327VjIo2oqRdaDlEbbV0_Q5XT3QQryeMuKJJsVuhOD6o8xH82cSB4tVbwNmkzL9lqvSalhDbayErUzhZziRLPk55MRJaImpTSE0S6Sggll53OHvWPDSacxHwRxT73PSbhqgeuNTInrjG6r2pUa11QFS-gtJtd-941SvLZQnM7JU0q1VJJqr5ziDRzSWjEeQOs0OfPKfBnskktSIpZCvxnT_KQhRJTyX69wO9JEvgnJGkdUs5jJykHNeiBoEq98oCna2IOzb4LkoRszeuwjb-OKsg3zmQS43-T6Sh17SFBCYF8qYExOTqLN854BNnS4484NSLt4cPYsmErW2CsY7xB5ThXWGnXDXy-Mx0TypEcJFEFwx7AybGEW2c8vYfr2V_kw9gZmE6GefX6QAN8NKDvmIZrgmtcD82dYGUbFyq8tm4t2wVj6o49y0bwyMTbe8caGc4MPpqz-haa8sMnw-nfGY6ipTNrj12wp8NhDsj0mzZ6WRWSxdhEtV5dYi7yOy6ODluxE2XeGNOhC_sd21rrOMZnfdQwVFRa105soTkUX09BVBAn4oIzIZEPV088W_GkWLHNhYgSlFPSHggPJyt45HhW7Bn6oagnKNUcLYJlmGzSJAfobHq6ytj-1HHQSG939uZh7d08nIdHcRwN1dsz2c9ZvuNVW8WIFLE1y6kVQw-H20sdH07vG3rOd1v2wPxy-rjXSpCCCpQD0lrqXuX3H3ChGuc" width="100%" height="700" frameborder="0" style="border:1px solid #e0e0e0;border-radius:8px;" loading="lazy" title="MySQL EXPLAIN Analysis — Enterprise feature usage query"></iframe>
</div>

**Three critical issues stacked on top of each other:**

1. **Full table scan on `tenants`** (5,000 rows) — no index on `plan`, so MySQL scans every tenant and filters to 833 enterprise ones. That's scanning 6x more rows than needed.

2. **Temporary table with 4,672 rows** — the GROUP BY on three columns forces MySQL to materialize all joined results before aggregating.

3. **Filesort on 4,672 rows** — after grouping, MySQL sorts again for the ORDER BY.

**What the tool recommends (click the Indexes tab above to see):**

The analyzer generates two index recommendations with ready-to-copy DDL:

- **`tenants(plan, name, id)`** — a covering index. `plan` first for the WHERE filter, `name` for the GROUP BY, and `id` trailing so MySQL never touches the table data. The impact simulator confirms: eliminates the full scan, enables join reorder (driving from 833 enterprise tenants instead of 5,000), and provides an index-only scan.

- **`usage_events(recorded_at, tenant_id, feature, quantity)`** — a composite covering index that merges WHERE + JOIN + GROUP BY + aggregate columns into one index. `recorded_at` for the date filter, `tenant_id` for the join, `feature` for the GROUP BY, and `quantity` for the SUM — all from the index, no table access needed.

That second recommendation is the kind of insight that separates a real index advisor from one that just says "add an index on `recorded_at`." The tool understands that the WHERE, JOIN, GROUP BY, and SELECT columns all belong in one carefully ordered composite.

<h2 id="join-aware">JOIN-Aware Covering Indexes</h2>

Most index tools recommend indexes for single tables based on the WHERE clause. They miss that the inner side of a nested loop join benefits enormously from a covering index that includes the join column, filter columns, AND the selected columns.

Here's a support dashboard query that joins tickets to users:

```sql
SELECT st.priority, COUNT(*) AS total,
       AVG(TIMESTAMPDIFF(HOUR, st.created_at, st.resolved_at))
         AS avg_resolution_hours
FROM support_tickets st
JOIN users u ON u.id = st.user_id
WHERE u.role = 'admin'
GROUP BY st.priority
```

<div style="margin: 2rem 0;">
<iframe src="/tools/explain/?embed#p=eJytVGtP20AQ_CurfLFdBcvOAwhtkEziQNrEQY5Di4RkTHwKB44vvTsTUNX_3vUz5NFKVRuJ3J1vd2Y9M-FHjdTOakfn4AUPEQExD2JgMXySZLliPOBv5wBqMJdJEIGkS9LttPRjXU-_gbO16LYgYmwluqZ2FwN-EMpaLDhZBJJAImi8gAoLZEbyd4AFqEOEJGF2BzSOCYcnRrFAnTMhu81js2Hm_aZhGKfaNkdDbzaRA5e8pt0xGwdoCqptKYSsSMzjor9pGI3WDoepn7Z13WzpnarGMH5PMqCRJPwM1ES_5ywi99AFJQiXNFa0ktDQO53THM3AN2juMBo6joGc-WqWhWbnpKDNRtihLuinaExEjrAF1QzJa9rxnKzSF04K267d4dhyb0GlYVdIPRGE-zQ8NJx5aLDmSTFZs6zamqpWr33H5E3tkd3zUGR9xSnjVL7VoTeZOZ76QQNrCpLJIKqDdXOpesOxPfWs8XV_OBioV5OZW0_75pxg1EI_kNmRE8Gil-ysZQjBy8LPHiaSsth_ZAkXJUfPmtrw9cp20k4hA5mI1Aa2IrECXvrcBNvpZzhC0ijy0ysYuJMxiGSFqZa-pPNnIkWak8-ToQOpTgJFnOBWpyHibcRLuVwbn6eObwyHS3cyu4aL2_c6oEAhCtRzbcuzwbMuRvYep5p7i8AXw8uh44E18yb-0MGmsY3H0sIv9m09L5UkDmLpbzqcCf7NRqPivhz08G05G4oyG6tKxNZKXVmSkCZL3DzSxSMuCV-QWGKKy2bo2wNrNvKgKs3RCsFzrEzzukJjf8UZ_v8QAk_rgEqMIu5KW3E7j5jAzSH8HKRATx6eyFzCjeX2rixXxdhpxdUmMtBHcdNg7YP1Zq6LGvpV7IrmdwGruourodO3v6Ebr34uM6iV3NpeSfH2ar7ir1T7eBffxVt-51n6_y6TZUCjSplGu63tVmQBzZ3JM1pX0DvJOG5eKFkTftCA4qoAiQIh_Ygt0NR9sf7JhD8pnSpZ-_kLGuMO2g" width="100%" height="650" frameborder="0" style="border:1px solid #e0e0e0;border-radius:8px;" loading="lazy" title="MySQL EXPLAIN Analysis — Support response time by priority"></iframe>
</div>

MySQL scans all 30,000 support tickets, then for each one looks up the user via PK and checks if they're an admin. Only 5,912 rows survive the filter — MySQL examined 5x more rows than needed.

**The tool recommends two indexes that work together:**

- **`users(role)`** — lets MySQL drive from admin users first (score: high impact)
- **`support_tickets(user_id, priority)`** — a JOIN-aware composite. `user_id` first for the nested loop lookup, `priority` second for the GROUP BY. This means MySQL can join and group from the index alone.

This is the cross-clause merging intelligence at work. The tool sees that `user_id` is the JOIN column and `priority` is the GROUP BY column, and combines them into one composite instead of recommending two separate single-column indexes.

<h2 id="revenue-leakage">Three-Table LEFT JOIN: Revenue Leakage Detection</h2>

Real billing systems need reconciliation queries. This one finds subscriptions where what's been paid doesn't match what's expected — joining tenants, subscriptions, and invoices:

```sql
SELECT t.name, t.region, s.plan,
       s.amount AS expected,
       COALESCE(SUM(i.amount), 0) AS actually_paid,
       s.amount - COALESCE(SUM(i.amount), 0) AS gap
FROM tenants t
JOIN subscriptions s ON s.tenant_id = t.id
LEFT JOIN invoices i ON i.subscription_id = s.id
  AND i.status = 'paid'
WHERE s.status = 'active'
GROUP BY t.name, t.region, s.plan, s.amount, s.id
HAVING gap > 10
ORDER BY gap DESC LIMIT 100
```

<div style="margin: 2rem 0;">
<iframe src="/tools/explain/?embed#p=eJylVm1vo0YQ_isjfzGWMMI4NklaRyI2SWgxjjC-NlIkjjN77rYYKLvkElX9752F9TvNy50_mDU8M_Ps88ws_qdFWpet7hW4dE35JfR0HYrsm8I6AEq05GWUAKdrMur1zzQNv8RTNhKwJMtyXHUeU8APpphnBWZYRTlM7Pn4g_Eyxw1NOCkuQRFprpDOKY_-Xh6zZzbkkbmC6EtCgC2jFLIUfuZknWdFVLxcNafs1ykHeiO3vbzWalWQVcQJlIymK9gmBl5V_IHssoJHGCdxhYOEfOXwZ0YRqywzxkdn_eFQr7P1TdMwO0f1tGEPC-rnNcQwhsbFGxUbqtI0JcVBWcMwjd0ejorqWt_EbQ618_fvc6-yk8bkWcD_KnPhFZPK0vg5ZDziJQOlvo7aWJY-kXZnw2tgvEpreKFphnZx_j205sghIV2MRD0OGXLJ8N53ppb_AAqNR0zjJI1SHtJ4y07XjIFs-SNuw0GfdIeomSmuEiO5VVt51avtnFDtc63MZxhBO49ovJPG1AZSG1wNTrTReybWx6sEnQn4uwj8j21037byC1sWNOcUHyj7v8JKqj2N3qZ5VtHsXQy2sAOlWmrrbzzF5rZrjwPgWhqtiYpXnFKspwLT8iSqrtE6K1MO1hzIc06W2O4qjGeWi-eVrcwXU5SzhnRUwGZCXM0leQmFtHspum_EifPrxp9Noe4Jhh3zy8zxYF8Jho0-w1u7vkEPOUoDrn0T1HiaPmV0SRiKi1CqHSmJAUJLsLyJeFjPyqYR4Lc727cRsLsvpwdu_dniHq4f3qGWWle4sz453i1szmWY-RPbFxm2B77rTJ1AvEHQjxj9GPu2FdgQWNeuvZVBqbsKE147t44XgLUIZqHjIXhq48_NQP1qP6g1VPCDT5Y_vrN8xRAz7s0C8BauKwGCLtgeutDGjRY4F221vcJO4X_ggqR4Iy8oE2fGJhIJ31gLN4BdRJ1rXRT4bIwcXKWnq0ZDiC6htV6ycMm6JGIc6-HqG6lWpNysorzLshLpnHCnLKwtgcDxHlAPpddQsifRjK7SMg8jDhNUNnCm9il2vPB9FDIUT-eBNb1_TDs_PaaP6YEdh234cVN2HSsjftwTGSnnq9kEiVmWRUHS5QtUPdFv8nUxn2w8ld1fs5EDoOKEMB7GpVjiP4QlSRIS45oXNErwEGtslk3wNi9uLG60Q0Icb2L_Xp2HtWCg7F4RJ5DDN12n0bftcfBxy45Pjmbj3jL2Pfbw6HkLOH91hg6siYvoq5gWhu1RGUSFIdkTKWqbcOdxoy0ysE6J2DAWf86EJydtiTn3_Tr14LXX1qll3-dq69__AJNcWvQ" width="100%" height="700" frameborder="0" style="border:1px solid #e0e0e0;border-radius:8px;" loading="lazy" title="MySQL EXPLAIN Analysis — Revenue leakage detection"></iframe>
</div>

This 134ms query creates a temporary table with 5,000 rows and examines 22,629 rows through the LEFT JOIN (7.5 invoice lookups per subscription × 5,000 active subscriptions).

The analyzer generates **four recommendations** — click the Indexes tab above:

1. **`subscriptions(status, tenant_id, plan, amount)`** — WHERE + JOIN + GROUP BY columns merged into one composite. MySQL can filter active subscriptions AND join to tenants AND group, all from the index.

2. **`invoices(subscription_id, amount)`** — JOIN-aware covering index. The join column first, then the SUM column as trailing. MySQL reads invoice amounts directly from the index without touching the table.

3. **`subscriptions(status, plan, amount, tenant_id, id)`** — a wider covering alternative that eliminates all table lookups for subscriptions.

4. **`tenants(name, region)`** — GROUP BY composite for the tenants side.

The tool also flags three query hints: the `HAVING` clause references a column alias (potential issue), the GROUP BY uses a non-unique `name` column (could produce unexpected results if tenant names collide), and ORDER BY + LIMIT without a unique tiebreaker means inconsistent pagination.

<h2 id="query-rewrites">Query Rewrite Suggestions With Executable SQL</h2>

Some performance problems can't be fixed with indexes. The query itself needs to change. Here's a common one — using `YEAR()` on an indexed date column:

```sql
SELECT COUNT(*) FROM invoices WHERE YEAR(due_date) = 2025
```

<div style="margin: 2rem 0;">
<iframe src="/tools/explain/?embed#p=eJyNUn-Lm0AU_CoP_8laUlGbMz-OHHjJppWqKd7KNVCQPd0LQm5Ndb27Uvrd-6yaHKaFLujTffNmdkZ_akJbaO9vwN3vS7HnSiwgLWqpiKkDkLSo1NKyzbkDZfFSLS0dCE9VzQ-g8iexnBlXjmE0964Ph6I4NrhvEnAh8SY_KFEugPwQvCS5fC7yVFRGVoskQzkdlmCb9tVJzTFnk5bMMS17KGgaljM1jKlhz1vQ5MN0Mh-odsqMPxwEVCmXUEjolf9fB51NjKndg3CddLSx9h1zu6M-XTFYbeOQkXc6uHeQSgWbaBuc9e4_0YjCjroRGZpGmgxpVhF1GQXm3vr0PEdaM3kGt95HL2TgxmybeCGiA4qvXyIvcKMdfKa7cQut6ocqLfOjyguZnOfCLV6x73coJSSX6t99_tR8f1jTFfL7xDLHtn7BwV9PgNnbPu5u3NhnYPZnUlzVFdAwDsgoK_mjGo1HlZBNOfI8w1I8ixKTwSd0no3-QtYPtpR9irBuUhucrOFMuPrTY15Au20vXNOvmOVr8jYkIIPI9At4mxaQU2qXkM4iaSv-g_q19us3N3H84g" width="100%" height="500" frameborder="0" style="border:1px solid #e0e0e0;border-radius:8px;" loading="lazy" title="MySQL EXPLAIN Analysis — YEAR() non-sargable pattern"></iframe>
</div>

The `YEAR()` function wraps the indexed column `due_date`, preventing MySQL from using the index for range filtering. MySQL scans all 60,000 rows and applies the function to each one. The analyzer flags this (score: 77) and generates the rewrite:

```sql
-- Before (full table scan, 60K rows examined):
WHERE YEAR(due_date) = 2025

-- After (index range scan, only matching rows):
WHERE due_date >= '2025-01-01' AND due_date < '2026-01-01'
```

The tool detects 7 rewrite patterns total: YEAR() → range, subquery → JOIN, NOT IN → LEFT JOIN, unnecessary GROUP BY fix, SELECT * elimination, OFFSET → keyset pagination, and ORDER BY RAND() alternatives.

<h2 id="detection-rules">49 Rules That Catch What You'd Miss at 3 AM</h2>

The analyzer applies 49 detection rules organized by severity:

<table>
  <thead>
    <tr><th>Severity</th><th>Count</th><th>Examples</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><strong style="color:#E74C3C">Critical</strong></td>
      <td>8</td>
      <td>Full table scan on large table, filesort on 10K+ rows, temporary table materialization, Cartesian join</td>
    </tr>
    <tr>
      <td><strong style="color:#E67E22">Warning</strong></td>
      <td>20</td>
      <td>Bad row estimate (&gt;10x off), join buffer used, high-cost node (&gt;50% of plan), non-unique index with high fan-out</td>
    </tr>
    <tr>
      <td><strong style="color:#3498DB">Info</strong></td>
      <td>5</td>
      <td>Small table scan (&lt;100 rows), index condition pushdown, subquery materialization</td>
    </tr>
    <tr>
      <td><strong style="color:#27AE60">Good</strong></td>
      <td>7</td>
      <td>Optimal eq_ref join, covering index used, index range scan</td>
    </tr>
    <tr>
      <td><strong style="color:#8E44AD">MariaDB</strong></td>
      <td>4</td>
      <td>Rowid filter active, FirstMatch/LooseScan semi-join, hash join detected</td>
    </tr>
    <tr>
      <td><strong style="color:#2C3E50">MySQL 8.0+</strong></td>
      <td>5</td>
      <td>Hash join, parallel scan, skip scan, index merge</td>
    </tr>
  </tbody>
</table>

Each rule explains *why* it matters and provides a specific recommendation with copyable DDL.

<h2 id="index-impact">Index Impact Simulator</h2>

After getting an index recommendation, the hardest question is: "will this actually help?" The impact simulator answers this with **structural predictions based on MySQL optimizer guarantees** — not guesswork:

<table>
  <thead>
    <tr><th>Current State</th><th>With Recommended Index</th><th>Why It's Guaranteed</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Full table scan (ALL)</td>
      <td>Index lookup (ref)</td>
      <td>MySQL always uses an index on join/filter columns when available</td>
    </tr>
    <tr>
      <td>Scans all rows, filters most out</td>
      <td>Index-only scan (no table access)</td>
      <td>Covering index has all needed columns — MySQL reads only the index B-tree</td>
    </tr>
    <tr>
      <td>Temporary table for GROUP BY</td>
      <td>Grouped via index (ordered stream)</td>
      <td>WHERE equality + GROUP BY in index order = single-pass aggregation</td>
    </tr>
    <tr>
      <td>Filesort (sort in memory/disk)</td>
      <td>Index delivers sorted order</td>
      <td>Index column order matches WHERE + ORDER BY = sort step eliminated</td>
    </tr>
    <tr>
      <td>Table scanned as driving table</td>
      <td>Optimizer flips join order</td>
      <td>Filtered driving table has fewer rows = fewer inner lookups</td>
    </tr>
  </tbody>
</table>

Click the **Indexes** tab on any embedded analysis, then expand **Estimated Impact** to see the simulation.

<h2 id="ai-comparison">Tested Against AI: Tool vs. Senior DBA Analysis</h2>

I compared the analyzer's output against independent senior DBA analysis on 5 queries from a SaaS billing database the tool had never seen. Here's how they compare:

<table>
  <thead>
    <tr><th>Category</th><th>Tool</th><th>AI/DBA</th></tr>
  </thead>
  <tbody>
    <tr><td>Issues detected</td><td>23</td><td>23</td></tr>
    <tr><td>Index recommendations matching</td><td colspan="2" style="text-align:center">90% overlap</td></tr>
    <tr><td>Wrong recommendations</td><td>0</td><td>0</td></tr>
    <tr><td>Impact simulation</td><td style="color:#27AE60"><strong>Yes</strong> — structural predictions</td><td>No</td></tr>
    <tr><td>Executable query rewrites</td><td style="color:#27AE60"><strong>Yes</strong> — copy-paste SQL</td><td>Conceptual only</td></tr>
    <tr><td>Query hints (HAVING misuse, etc.)</td><td style="color:#27AE60"><strong>Yes</strong> — automated</td><td>Sometimes</td></tr>
    <tr><td>JOIN-aware covering indexes</td><td style="color:#27AE60"><strong>Yes</strong></td><td style="color:#27AE60"><strong>Yes</strong></td></tr>
    <tr><td>Cross-clause composite merging</td><td style="color:#27AE60"><strong>Yes</strong></td><td style="color:#27AE60"><strong>Yes</strong></td></tr>
    <tr><td>PK-aware (skips redundant indexes)</td><td style="color:#27AE60"><strong>Yes</strong></td><td style="color:#27AE60"><strong>Yes</strong></td></tr>
  </tbody>
</table>

The tool matches a senior DBA's analysis on 90% of findings and beats it on automation: impact simulation, executable rewrites, and automated query pattern detection. The 10% gap is in niche areas like recognizing that `ORDER BY DATEDIFF()` is monotonically equivalent to `ORDER BY date` — edge cases that rarely affect real-world optimization.

The full comparison across all 50 test queries is documented in the <a href="https://github.com/Mughees52/mysql-explain-analyzer" target="_blank" rel="noopener">project repository</a>.

<h2 id="smart-features">What Makes the Index Advisor Smart</h2>

The index advisor isn't a simple "column mentioned in WHERE → add index" engine. It has several intelligence layers that prevent bad recommendations:

- **Cross-clause merging** — WHERE, JOIN, GROUP BY, ORDER BY, and aggregate columns for the same table get merged into one optimal composite index instead of separate single-column recommendations
- **PK-aware** — never recommends an index starting with a primary key column (InnoDB's clustered index already covers it) or a composite that duplicates an existing index
- **DDL validation** — validates recommended columns actually exist in the table schema, filtering out SQL aliases like `revenue` or `total_usage` that appear in ORDER BY but aren't real columns
- **Subquery isolation** — parses only the outer query's GROUP BY/ORDER BY, not inner subquery clauses
- **Existing index awareness** — checks DDL for indexes that already cover the recommendation and skips them

<h2 id="formats">Works With Whatever MySQL Throws At You</h2>

The tool handles every EXPLAIN format MySQL and MariaDB produce:

- **EXPLAIN ANALYZE** — the tree format with actual execution times (MySQL 8.0.18+)
- **EXPLAIN FORMAT=JSON** — the detailed JSON output with cost breakdowns
- **Traditional EXPLAIN** — the classic tabular format with type, key, rows, Extra columns
- **MariaDB ANALYZE** — table format with r_rows, r_filtered actual metrics
- **MariaDB ANALYZE FORMAT=JSON** — JSON with r_total_time_ms, filesort nesting

Paste it straight from your terminal — the tool auto-strips `mysql>` prompts, `+---+` borders, `| ... |` wrappers, continuation lines (`-> SELECT`, `-> GROUP BY`), and `N rows in set` footers. No cleanup needed.

<h2 id="share-embed">Share and Embed Your Analysis</h2>

- **Copy Share Link** — generates a URL with the full plan, query, and DDL compressed in the hash. Anyone with the link sees exactly what you see.
- **Embed** — generates an `<iframe>` snippet you can paste into blog posts, runbooks, Confluence pages, or internal docs. Every embedded analysis in this blog post is a live instance of the tool — you can interact with them.

<h2 id="privacy">Your Data Stays Private</h2>

This tool runs 100% in your browser. There's no backend, no API calls, no analytics on your queries, no database that stores your plans. The source code is TypeScript rules — not a language model, not an AI API call.

Query plans often contain table names, column names, and row counts that reveal your application's data model. That information shouldn't leave your machine just to visualize an EXPLAIN plan.

<h2 id="open-source">Now Open Source</h2>

The EXPLAIN Analyzer is now open source under the MIT license. You can browse the full source code, run it locally, or contribute:

<a href="https://github.com/Mughees52/mysql-explain-analyzer" target="_blank" rel="noopener" class="btn btn-outline" style="margin: 1rem 0; display: inline-block;">View on GitHub &rarr;</a>

**What's in the repo:**

- Complete Vue 3 + TypeScript source code
- All 49 detection rules, index advisor, query rewriter, and impact simulator
- All parsers (MySQL EXPLAIN ANALYZE tree, FORMAT=JSON, traditional table, MariaDB ANALYZE)
- Test suite with 50 queries against a 680K-row MySQL 8.0 database
- Test database setup scripts so you can reproduce every result

**Why open source?** We built this tool because no equivalent existed for MySQL. The PostgreSQL community has [explain.dalibo.com](https://explain.dalibo.com) and [PEV2](https://github.com/dalibo/pev2) — MySQL had nothing comparable. Making it open source means the MySQL community can use it, improve it, and trust that their query plans aren't being sent to any server.

The tool is also listed on [awesome-mysql](https://github.com/shlomi-noach/awesome-mysql) — the curated list of open-source MySQL tools.

You can run it locally in three commands:

```bash
git clone https://github.com/Mughees52/mysql-explain-analyzer.git
cd mysql-explain-analyzer
npm install && npm run dev
```

Or just use the hosted version at [reliadb.com/tools/explain/](https://reliadb.com/tools/explain/) — same code, zero setup.

<h2 id="try-it">Try It Now</h2>

Open the <a href="/tools/explain/">EXPLAIN Analyzer</a>, paste your `EXPLAIN ANALYZE` output, and see what it catches. Add your SQL query and table DDL for the full analysis — composite index recommendations, impact simulation, query rewrites, and schema checks.

If you're dealing with a performance problem that needs a deeper look, <a href="/contact.html">book a free assessment</a> and I'll review your slowest queries with you.

<a href="/tools/explain/" class="btn btn-primary" style="margin: 1.5rem 0; display: inline-block;">Open the EXPLAIN Analyzer &rarr;</a>

## Frequently Asked Questions

<h3 id="faq-cost">Does the tool cost anything?</h3>

No. The EXPLAIN Analyzer is completely free with no usage limits, no sign-up, and no premium tier. It runs as a client-side application in your browser — there's no server cost to offset.

<h3 id="faq-mariadb">Does it work with MariaDB?</h3>

Yes. The tool supports MariaDB `ANALYZE` table format (with r_rows, r_filtered) and `ANALYZE FORMAT=JSON` (with r_total_time_ms). It auto-detects whether the input is MySQL or MariaDB and applies engine-specific rules — including MariaDB-specific patterns like rowid filtering, FirstMatch semi-joins, and hash joins.

<h3 id="faq-data">Is my data safe?</h3>

Your data never leaves your browser. There's no backend server, no API calls, no telemetry. You can verify this in your browser's Network tab — the only requests are for static assets.

<h3 id="faq-ai">Is this using AI to analyze queries?</h3>

No. The analysis engine uses 49 hand-written detection rules, a query-aware index advisor, and a structural impact simulator — all deterministic TypeScript code. It was tested against Claude AI analysis on 50 real queries from a database it had never seen, and it matches or exceeds the AI's recommendations while being faster, deterministic, and completely private.

<h3 id="faq-embed">Can I embed the analysis in my documentation?</h3>

Yes. Click the **Embed** button in the Actions section after analyzing a plan. It generates an `<iframe>` code snippet with your analysis pre-loaded. The embedded view shows a clean, focused analysis with a "Powered by ReliaDB" footer.

<div class="related-posts">
<h3>Related Articles</h3>
<div class="related-grid">
<a class="related-card" href="/blog/mysql-8-to-8-4-upgrade-pre-upgrade-preparation.html">
<div class="rc-cat">MySQL Upgrade</div>
<h4>MySQL 8.0 to 8.4 LTS Upgrade Guide — Part 1</h4>
</a>
<a class="related-card" href="/blog/mariadb-to-aurora-mysql-migration-pre-migration-requirements.html">
<div class="rc-cat">MySQL</div>
<h4>MariaDB 10.6 to MySQL Aurora 8.0 Migration Guide — Part 1</h4>
</a>
</div>
</div>
