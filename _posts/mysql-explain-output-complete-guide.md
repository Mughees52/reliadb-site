---
title: "MySQL EXPLAIN Output Explained: The Complete Guide (2026)"
date: 2026-04-11T10:00:00.000Z
description: "Every column of MySQL EXPLAIN output decoded with real examples from a 680K-row production database. Learn what each access type means, when to worry, and how to fix the slow ones."
categories:
  - mysql
  - database-performance
read_time: 18
featured: true
author: "Mughees Ahmed"
dateModified: "2026-04-11T00:00:00+00:00"
coverImage: "/images/blog/mysql-explain-output-complete-guide.jpg"
---

Every slow query in MySQL starts with one command: `EXPLAIN`. It tells you exactly how the optimizer plans to execute your query — which tables it reads first, which indexes it picks, how many rows it expects to scan, and whether it resorts to expensive operations like filesorts or temporary tables.

The problem is that `EXPLAIN` output looks cryptic if you don't know what each column means. This guide breaks down every column, every access type, and every `Extra` flag with real examples from a 680K-row MySQL 8.0.45 test database (100K orders, 50K users, 250K order items, 80K reviews) — the same database we used to validate the [ReliaDB EXPLAIN Analyzer](/tools/explain/).

## How to Run EXPLAIN

MySQL supports three output formats. Each has different strengths:

```sql
-- Traditional table format (default)
EXPLAIN SELECT * FROM orders WHERE status = 'pending';

-- JSON format (includes cost estimates)
EXPLAIN FORMAT=JSON SELECT * FROM orders WHERE status = 'pending';

-- Tree format with actual execution times (MySQL 8.0.18+)
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'pending';
```

**`EXPLAIN ANALYZE`** is the most useful — it actually runs the query and shows you real row counts and timing, not just estimates. Use this when diagnosing slow queries. The traditional `EXPLAIN` only shows the optimizer's plan, not what actually happened.

<div class="callout">
<strong>Tip:</strong> You can paste any of these formats into the <a href="/tools/explain/">ReliaDB EXPLAIN Analyzer</a> to get a visual tree, automatic issue detection, and index recommendations.
</div>

## The EXPLAIN Columns (Traditional Format)

Here's what each column means, ordered by how often it matters:

| Column | What It Tells You | When to Worry |
|--------|-------------------|---------------|
| `type` | How MySQL accesses the table | `ALL` or `index` on large tables |
| `rows` | Estimated rows to examine | High numbers with low result sets |
| `key` | Index actually chosen | `NULL` on tables with WHERE conditions |
| `Extra` | Additional operation details | `Using filesort`, `Using temporary` |
| `filtered` | % of rows that pass the WHERE | Low values (< 20%) mean excessive scanning |
| `possible_keys` | Indexes the optimizer considered | Many candidates but poor choice |
| `key_len` | Bytes of index used | Short length = partial index usage |
| `ref` | What's compared to the index | `NULL` means the index isn't used for lookups |
| `id` | Query block identifier | Multiple values = subqueries |
| `select_type` | Type of SELECT | `DEPENDENT SUBQUERY` is almost always bad |
| `table` | Table being accessed | `<temporary>`, `<derived>` = materialized results |
| `partitions` | Partitions scanned | All partitions = partition pruning failed |

## Access Types (`type` Column) — From Best to Worst

The `type` column is the single most important thing to check. It tells you how MySQL finds rows in each table:

### `system` and `const` — Best possible

The table has at most one matching row. MySQL reads it once during optimization and treats it as a constant.

```sql
EXPLAIN SELECT * FROM orders WHERE id = 42;
```

| type | key | rows | Extra |
|------|-----|------|-------|
| const | PRIMARY | 1 | NULL |

**When you see it:** Primary key or unique index lookup with a constant value. This is as fast as it gets — O(1).

### `eq_ref` — Excellent for JOINs

For each row from the previous table, MySQL reads exactly one row from this table using a primary key or unique index.

```sql
EXPLAIN SELECT o.id, u.email
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'pending';
```

| table | type | possible_keys | key | ref | rows | filtered | Extra |
|-------|------|---------------|-----|-----|------|----------|-------|
| o | ref | idx_user,idx_status | idx_status | const | 10,000 | 100.00 | Using index condition |
| u | eq_ref | PRIMARY | PRIMARY | advisor_test.o.user_id | 1 | 100.00 | NULL |

**What's happening:** MySQL first finds orders with `status = 'pending'` using the `idx_status` index (10,000 rows). For each one, it looks up exactly one user by primary key (`eq_ref`). The `users` side is optimal — one row per lookup, every time.

### `ref` — Good index lookup

MySQL uses a non-unique index to find matching rows. Multiple rows may match.

```sql
EXPLAIN SELECT * FROM orders WHERE user_id = 100;
```

| type | key | rows | Extra |
|------|-----|------|-------|
| ref | idx_user | 2 | NULL |

**When it's fine:** The `rows` value is small relative to the table size. Here, 2 rows out of 100K — excellent selectivity.

**When it's a problem:** If `rows` is a large fraction of the table (e.g., 25K out of 100K), the index isn't selective enough. Consider a composite index.

### `range` — Bounded index scan

MySQL scans a portion of the index using `>`, `<`, `BETWEEN`, `IN()`, or `LIKE 'prefix%'`.

```sql
EXPLAIN SELECT * FROM orders
WHERE order_date BETWEEN '2024-01-01' AND '2024-03-31';
```

| type | key | rows | filtered | Extra |
|------|-----|------|----------|-------|
| range | idx_date | 1 | 100.00 | Using index condition |

With a narrow date range the estimate is small. But widen it:

```sql
EXPLAIN SELECT * FROM orders
WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'
AND status = 'delivered';
```

| type | possible_keys | key | rows | filtered | Extra |
|------|---------------|-----|------|----------|-------|
| ref | idx_date,idx_status | idx_status | 49,981 | 50.00 | Using index condition; Using where |

**Key insight:** MySQL chose `idx_status` over `idx_date` because the date range covers too many rows. The optimizer picks the more selective index. The `filtered: 50.00` tells you half the rows from `idx_status` are then discarded by the date filter — a signal that a composite index on `(status, order_date)` would be better.

### `index` — Full index scan (warning sign)

MySQL reads the entire index from start to finish. Better than a full table scan because the index is smaller than the table, but still reads every entry.

```sql
EXPLAIN SELECT user_id, COUNT(*) as order_count
FROM orders GROUP BY user_id ORDER BY order_count DESC;
```

| type | key | rows | Extra |
|------|-----|------|-------|
| index | idx_user | 99,962 | Using index; Using temporary; Using filesort |

**Why it happens:** MySQL reads all 99,962 entries from the `idx_user` index to group by `user_id`. It's a covering index scan (`Using index` — no table data read), but it still touches every entry.

**When to fix:** If you see `index` type without `Using index` in Extra, MySQL is doing a full index scan AND reading table data for each row. That's worse than a full table scan.

### `ALL` — Full table scan (critical on large tables)

MySQL reads every row in the table. This is the worst access type for large tables.

```sql
EXPLAIN SELECT * FROM orders WHERE total_amount > 500;
```

| type | possible_keys | key | rows | filtered | Extra |
|------|---------------|-----|------|----------|-------|
| ALL | NULL | NULL | 99,962 | 33.33 | Using where |

**Real impact:** MySQL scans all 99,962 rows and discards 67% of them (`filtered: 33.33`). There's no index on `total_amount`, so the optimizer has no choice. With `EXPLAIN ANALYZE`, you can see the actual cost:

```
-> Filter: (orders.total_amount > 500.00)  (cost=10084 rows=33317)
       (actual time=0.0167..28.6 rows=50503 loops=1)
    -> Table scan on orders  (cost=10084 rows=99962)
       (actual time=0.0153..22.5 rows=100000 loops=1)
```

28.6ms to scan 100K rows — acceptable on a small table, but this scales linearly. At 10M rows, you're looking at ~3 seconds.

**Fix:** Add an index on `total_amount`:
```sql
ALTER TABLE orders ADD INDEX idx_total_amount (total_amount);
```

After adding the index, the same query uses a `range` scan — reading only the matching rows instead of every row in the table.

## The `Extra` Column — Hidden Performance Killers

The `Extra` column reveals operations that don't show up anywhere else. These are the ones that matter most:

### `Using filesort`

MySQL must sort the result set. Despite the name, this happens in memory when the result fits — it doesn't always hit disk.

```sql
EXPLAIN SELECT * FROM orders
WHERE status = 'pending'
ORDER BY total_amount DESC
LIMIT 10;
```

| type | key | rows | Extra |
|------|-----|------|-------|
| ref | idx_status | 10,000 | Using index condition; Using filesort |

With `EXPLAIN ANALYZE`, you see the real cost:
```
-> Limit: 10 row(s)  (actual time=7.5..7.5 rows=10 loops=1)
    -> Sort: total_amount DESC, limit input to 10 row(s) per chunk
       (actual time=7.5..7.5 rows=10 loops=1)
        -> Index lookup on orders using idx_status (status='pending')
           (actual time=0.0161..6.07 rows=10000 loops=1)
```

**Why it's bad:** MySQL fetches 10,000 rows (6ms), sorts all of them (1.4ms), then returns only 10. The sort is O(n log n) on the full result set — 7.5ms total for just 10 rows.

**Fix:** A composite index on `(status, total_amount)` lets MySQL read the rows in sorted order:
```sql
ALTER TABLE orders ADD INDEX idx_status_amount (status, total_amount);
```

Now the EXPLAIN shows no filesort — MySQL reads from the index in the right order and stops after 10 rows.

### `Using temporary`

MySQL creates an internal temporary table to process the query. Common with `GROUP BY`, `DISTINCT`, and `UNION`.

```sql
EXPLAIN SELECT user_id, COUNT(*) as order_count
FROM orders
GROUP BY user_id
ORDER BY order_count DESC;
```

| type | key | rows | Extra |
|------|-----|------|-------|
| index | idx_user | 99,962 | Using index; Using temporary; Using filesort |

**What's happening:** MySQL groups by `user_id` using the index (temporary table to accumulate counts), then sorts by the count (filesort). Two expensive operations on 100K rows.

**Fix:** If you only need `GROUP BY` without a different `ORDER BY`, an index on the `GROUP BY` column eliminates the temporary table. But when `ORDER BY` is on an aggregated column like `COUNT(*)`, the temporary table is unavoidable — focus on reducing the input rows with better filtering.

### `Using where`

MySQL applies a `WHERE` filter after reading rows. This is normal and usually fine, but watch the ratio of rows examined vs. rows returned.

### `Using index` (covering index)

MySQL satisfies the query entirely from the index without reading the actual table rows. This is a performance win — always.

```sql
EXPLAIN SELECT customer_id, status FROM orders
WHERE status = 'pending';
```

If there's an index on `(status, customer_id)`:

| type | key | rows | Extra |
|------|-----|------|-------|
| ref | idx_status_custid | 10,105 | Using index |

**Why it matters:** Reading from an index is significantly faster than reading from the table. The index is smaller, more compact, and more likely to be in the buffer pool.

### `Using index condition` (Index Condition Pushdown)

MySQL evaluates part of the `WHERE` condition at the storage engine level instead of the server level. This reduces the number of full row reads.

```sql
EXPLAIN SELECT * FROM orders
WHERE customer_id = 100 AND total_amount > 500;
```

| type | key | rows | Extra |
|------|-----|------|-------|
| ref | idx_customer_id | 15 | Using index condition |

**Translation:** MySQL uses the index to find rows for `customer_id = 100`, then checks `total_amount > 500` at the engine level before sending rows to the server. Without ICP, it would read all 15 rows fully, then filter.

## EXPLAIN ANALYZE — The Real Story

Traditional `EXPLAIN` shows estimates. `EXPLAIN ANALYZE` shows what actually happened:

```sql
EXPLAIN ANALYZE
SELECT u.email, COUNT(o.id) AS order_count, SUM(o.total_amount) AS lifetime_value
FROM users u
JOIN orders o ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'delivered'
GROUP BY u.email;
```

```
-> Table scan on <temporary>  (actual time=174..175 rows=15000 loops=1)
    -> Aggregate using temporary table  (actual time=174..174 rows=15000 loops=1)
        -> Nested loop inner join  (cost=121717 rows=126041)
               (actual time=10.4..138 rows=75000 loops=1)
            -> Nested loop inner join  (cost=59057 rows=49981)
                   (actual time=9.89..79.4 rows=30000 loops=1)
                -> Index lookup on o using idx_status (status='delivered')
                       (actual time=9.44..39.2 rows=30000 loops=1)
                -> Single-row index lookup on u using PRIMARY (id=o.user_id)
                       (actual time=0.00123..0.00125 rows=1 loops=30000)
            -> Covering index lookup on oi using idx_order (order_id=o.id)
                   (actual time=0.00153..0.0018 rows=2.5 loops=30000)
```

### How to Read EXPLAIN ANALYZE Output

Each line has this structure:
```
-> Operation  (cost=X rows=Y) (actual time=first..last rows=Z loops=N)
```

| Field | Meaning |
|-------|---------|
| `cost` | Optimizer's estimated cost (arbitrary units) |
| `rows` (estimate) | How many rows the optimizer expected |
| `actual time` | Real wall-clock time in milliseconds (first row..last row) |
| `rows` (actual) | How many rows were actually processed |
| `loops` | How many times this operation executed |

**The most important thing to check:** Compare estimated `rows` with actual `rows`. In the example above, the optimizer estimated 49,981 rows for `idx_status` lookup but actually found 30,000. A 1.6x mismatch — acceptable, but worth running `ANALYZE TABLE` if it gets worse.

### Spotting Bottlenecks

Look at `actual time` — the node with the highest `last` time relative to its children is your bottleneck. In the example:
- Index lookup on `o` (status='delivered'): **39.2ms** — reads 30K rows from the index
- PK lookup on `u`: 0.00125ms × 30,000 loops = **37.5ms** total — many tiny lookups add up
- Covering index lookup on `oi`: 0.0018ms × 30,000 loops = **54ms** total
- Temporary table aggregate: **174ms** total (includes all child time)

The temporary table aggregation dominates at 174ms. But breaking it down, the raw data retrieval (39 + 37 + 54 = 130ms) is the real cost. The aggregation itself only adds ~44ms. To optimize this, you'd focus on reducing the 30K rows from the status filter — perhaps by adding a composite index on `(status, user_id)` to narrow the join.

## The `select_type` Column — Subquery Red Flags

| select_type | What It Means | Performance |
|-------------|---------------|-------------|
| `SIMPLE` | No subqueries or UNIONs | Good |
| `PRIMARY` | Outermost SELECT | Neutral |
| `SUBQUERY` | Non-dependent subquery in WHERE/SELECT | Usually OK (runs once) |
| `DEPENDENT SUBQUERY` | Correlated subquery | Almost always bad |
| `DERIVED` | Subquery in FROM clause | Materialized as temp table |
| `UNION` | Second or later SELECT in a UNION | Neutral |
| `UNION RESULT` | Result of a UNION | Neutral |

### DEPENDENT SUBQUERY — The Silent Killer

```sql
EXPLAIN SELECT u.full_name,
       (SELECT SUM(o.total_amount)
        FROM orders o
        WHERE o.user_id = u.id) as total_spent
FROM users u;
```

| id | select_type | table | type | rows |
|----|-------------|-------|------|------|
| 1 | PRIMARY | u | ALL | 49,873 |
| 2 | DEPENDENT SUBQUERY | o | ref | 2 |

**What's happening:** The subquery runs once per user row. With 49,873 users and ~2 orders per subquery execution: 49,873 × 2 = **~100K total row reads**. The `EXPLAIN ANALYZE` confirms:

```
-> Table scan on u  (actual time=0.0612..0.0717 rows=100 loops=1)
-> Select #2 (subquery in projection; dependent)
    -> Aggregate: sum(o.total_amount)  (actual time=0.00349..0.00351 rows=1 loops=100)
        -> Index lookup on o using idx_user (user_id=u.id)
           (actual time=0.00251..0.00274 rows=2 loops=100)
```

Each subquery execution is fast (0.003ms), but 50K of them adds up to ~175ms.

**Fix:** Rewrite as a JOIN:
```sql
SELECT u.full_name, SUM(o.total_amount) as total_spent
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.full_name;
```

The JOIN version reads each table once and groups in a single pass.

## The `filtered` Column — How Much Work is Wasted

The `filtered` column shows the percentage of rows that survive the `WHERE` condition. A value of `100.00` means all rows pass. A value of `10.00` means 90% of rows are read and discarded.

```sql
EXPLAIN SELECT * FROM orders
WHERE status = 'pending' AND total_amount > 1000;
```

| type | key | rows | filtered | Extra |
|------|-----|------|----------|-------|
| ref | idx_status | 10,000 | 33.33 | Using index condition; Using where |

**Translation:** MySQL uses the `idx_status` index to find 10,000 rows with `status = 'pending'`, then discards 67% of them because `total_amount > 1000` isn't covered by the index.

**Fix:** A composite index on `(status, total_amount)` pushes both conditions into the index:
```sql
ALTER TABLE orders ADD INDEX idx_status_amount (status, total_amount);
```

Now `filtered` shows `100.00` — every row MySQL reads passes the filter.

## Real-World Patterns and Fixes

### Pattern 1: Function on Column Prevents Index Usage

```sql
-- Bad: YEAR() prevents index usage on order_date
SELECT * FROM orders
WHERE YEAR(order_date) = 2024 AND status = 'delivered';
```

On our 100K-row `orders` table with an index on `order_date`, the EXPLAIN shows:

| type | possible_keys | key | rows | Extra |
|------|---------------|-----|------|-------|
| ref | idx_status | idx_status | 49,981 | Using index condition; Using where |

MySQL ignores `idx_date` entirely because `YEAR()` wraps the column, making it non-sargable. It falls back to `idx_status` and scans ~50K rows.

**Fix:** Rewrite as a range condition:
```sql
SELECT * FROM orders
WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'
AND status = 'delivered';
```

Now MySQL can consider both `idx_date` and `idx_status` — the optimizer picks the more selective one.

### Pattern 2: NOT IN with Subquery

```sql
-- Slow: NOT IN re-checks for every row
SELECT * FROM users
WHERE id NOT IN (SELECT user_id FROM orders);
```

**Fix:** Rewrite as a LEFT JOIN:
```sql
SELECT u.* FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL;
```

MySQL 8.0+ often transforms `NOT IN` to an antijoin automatically, but the explicit `LEFT JOIN ... IS NULL` pattern is clearer and guarantees the optimization.

### Pattern 3: ORDER BY with Large OFFSET

```sql
-- Slow: MySQL reads and discards 10,000 rows
SELECT * FROM orders ORDER BY order_date DESC LIMIT 10 OFFSET 10000;
```

**Fix:** Use keyset pagination:
```sql
-- Fast: index seek, no wasted reads
SELECT * FROM orders
WHERE order_date < '2024-06-15 10:30:00'
ORDER BY order_date DESC LIMIT 10;
```

### Pattern 4: SELECT * When You Don't Need All Columns

```sql
-- Bad: reads all columns, can't use covering index
SELECT * FROM orders WHERE status = 'pending';

-- Better: only reads the columns you need
SELECT id, user_id, total_amount FROM orders WHERE status = 'pending';
```

With the right composite index, the second query can become a covering index scan (`Using index` in Extra) — no table data reads at all.

## Automate Your EXPLAIN Analysis

Reading EXPLAIN output manually works for simple queries. For complex joins, subqueries, and multi-table operations, use the [ReliaDB EXPLAIN Analyzer](/tools/explain/) to:

- **Visualize** the query plan as an interactive tree
- **Detect** 49 patterns including full scans, bad estimates, filesorts, and anti-patterns
- **Get index recommendations** with composite covering indexes tailored to your query
- **See impact simulation** — how each recommended index would change the plan
- **Generate rewrites** — automatic query rewrites for common anti-patterns

Paste your `EXPLAIN ANALYZE`, `EXPLAIN FORMAT=JSON`, or traditional `EXPLAIN` output directly. Everything runs in your browser — your query plans never leave your machine.

<div class="post-cta-inline">
  <h4>Try the EXPLAIN Analyzer</h4>
  <p>Paste your EXPLAIN output and get instant analysis with index recommendations.</p>
  <a href="/tools/explain/" class="btn">Analyze Your Query Plan →</a>
</div>

## Quick Reference: EXPLAIN Cheat Sheet

### Access Types (best to worst)
1. **system/const** — single row lookup (PK/unique with constant)
2. **eq_ref** — one row per join iteration (PK/unique join)
3. **ref** — index lookup, multiple rows possible
4. **range** — bounded index scan (BETWEEN, >, <, IN)
5. **index** — full index scan (all entries)
6. **ALL** — full table scan (all rows)

### Red Flags in Extra
- `Using filesort` on >1,000 rows — add ORDER BY index
- `Using temporary` on >500 rows — optimize GROUP BY or add composite index
- `Using where` with low `filtered` — index doesn't cover all WHERE columns
- No `Using index` on a query that only reads indexed columns — check index coverage

### Quick Fixes
| Problem | Fix |
|---------|-----|
| `type: ALL` with WHERE | Add index on WHERE columns |
| `type: ALL` in JOIN (inner table) | Add index on JOIN column |
| `Using filesort` | Add index matching ORDER BY |
| `Using temporary` with GROUP BY | Add index matching GROUP BY columns |
| `DEPENDENT SUBQUERY` | Rewrite as JOIN |
| Low `filtered` (< 20%) | Add composite index covering all WHERE columns |
| Large `rows` estimate mismatch | Run `ANALYZE TABLE` |

<div class="post-cta-inline" style="background: #f0f7ff; border-left: 4px solid #2980B9;">
  <h4>Learn EXPLAIN Hands-On</h4>
  <p>Practice reading EXPLAIN output with our free interactive MySQL training. Module 8 covers performance optimization, index strategies, and query analysis with a live SQL sandbox.</p>
  <a href="/training/#/module/8" class="btn">Start Module 8: Performance & EXPLAIN &rarr;</a>
</div>

<div class="related-posts">
<h3>Related Articles</h3>
<div class="related-grid">
<a class="related-card" href="/blog/mysql-explain-analyzer-free-query-plan-visualizer.html">
<div class="rc-cat">Tools</div>
<h4>We Built a Free MySQL EXPLAIN Analyzer — Here's What It Catches That You're Missing</h4>
</a>
<a class="related-card" href="/blog/mysql-8-to-8-4-upgrade-pre-upgrade-preparation.html">
<div class="rc-cat">MySQL Upgrade</div>
<h4>MySQL 8.0 to 8.4 LTS Upgrade Guide — Part 1: Pre-Upgrade Preparation</h4>
</a>
</div>
</div>
