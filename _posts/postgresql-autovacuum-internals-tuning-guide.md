---
title: PostgreSQL Autovacuum Internals & Tuning Guide
date: 2026-04-01T10:28:00.000+01:00
description: At default settings, a 1 TB PostgreSQL table accumulates up to 200
  GB of dead rows before autovacuum triggers. Learn how autovacuum's cost model
  works and how to tune it for production databases.
category: postgresql
categories:
  - postgresql
  - database-performance
  - postgresql-query-tuning
  - troubleshooting
read_time: 5
featured: true
coverImage: "/images/blog/postgresql-autovacuum-internals-tuning-guide.png"
---
PostgreSQL autovacuum is the background worker that keeps your database from quietly falling apart. Misconfigure it and you'll deal with table bloat, degraded query plans, and in the worst case, a transaction ID wraparound that halts all writes across the cluster. Leave it at defaults on a large-table workload, and it may not run frequently enough to keep up.

At default settings, a **1 TB PostgreSQL table can accumulate up to 200 GB of dead rows** before autovacuum triggers ([EnterpriseDB, 2024](https://www.enterprisedb.com/blog/autovacuum-tuning-basics)). That's not a corner case. It's the default behavior on most PostgreSQL deployments, and it's why large-table query times can climb from 10ms to 6+ seconds without any application changes.

This guide covers how autovacuum works internally (launcher, workers, cost throttling), exactly when it fires, and how to tune it for high-traffic production tables.

> **Key Takeaways**
> - Never disable autovacuum; PostgreSQL overrides the setting near XID wraparound anyway.
> - At the default 20% scale factor, a 1 TB table allows 200 GB of dead rows before vacuum runs ([EDB, 2024](https://www.enterprisedb.com/blog/autovacuum-tuning-basics)).
> - Reducing scale factor from 0.20 to 0.02 on large tables cut production query times by up to 90% ([Compass, 2017](https://medium.com/compass-true-north/postgres-at-scale-query-performance-and-autovacuuming-for-large-tables-d7e8ad40b16b)).
> - PostgreSQL 14 raised autovacuum disk throughput from 8 MB/s to 400 MB/s at default settings.

## What is PostgreSQL Autovacuum?

Autovacuum is a background process group that PostgreSQL starts at launch. It handles three critical maintenance tasks: removing dead tuples (VACUUM), updating table statistics for the query planner (ANALYZE), and preventing transaction ID wraparound (FREEZE). These tasks keep themselves running continuously so you don't have to schedule them manually.

The process group has two parts:

- **Autovacuum launcher** (one per cluster): wakes up every `autovacuum_naptime` (default: 1 min) and identifies tables that need attention.
- **Autovacuum workers** (up to `autovacuum_max_workers`, default: 3): assigned by the launcher to run VACUUM or ANALYZE on individual tables.

```bash
$ ps -eaf | grep autovacuum
postgres  2862     1  0 Jun17  00:00:11 /usr/pgsql-16/bin/postgres -D /var/lib/pgsql/16/data
postgres  2868  2862  0 Jun17  00:00:10 postgres: autovacuum launcher
postgres  2871  2862  0 Jun17  00:00:02 postgres: autovacuum worker  mydb
```

Two parameters must be enabled for autovacuum to function. Both default to `on`:

```
autovacuum  = on     -- enables the launcher and workers
track_counts = on    -- tracks per-table DML counts; required for threshold checks
```

<!-- [PERSONAL EXPERIENCE] -->
One thing worth knowing that surprises DBAs: setting `autovacuum = off` does not fully disable it. PostgreSQL will still start autovacuum workers in emergency situations, specifically when a table is approaching XID wraparound. The setting is a hint, not a hard switch. PostgreSQL will override it when the wraparound risk becomes critical.

According to the PostgreSQL documentation, the XID space holds roughly 4 billion transaction IDs. The system emits warnings in the logs at 40 million XIDs from the wraparound limit and shuts down all writes at 3 million XIDs from the limit ([PostgreSQL Docs](https://www.postgresql.org/docs/current/routine-vacuuming.html)). Autovacuum, when running correctly, prevents you from getting anywhere near those thresholds.

## Why Does Autovacuum Matter?

Dead tuples are the root cause of table bloat in PostgreSQL. Every `UPDATE` or `DELETE` leaves an invisible dead tuple behind. This is MVCC: old row versions must stay visible to any transaction that started before the change. PostgreSQL can't delete them until all those transactions complete.

So what happens as dead tuples pile up? Tables grow physically larger. Sequential scans read more 8 KB pages. Index scans lose efficiency. The query planner works from stale statistics and picks bad execution plans. And the numbers get real fast. One engineering team documented queries on a 3-billion-row table climbing from 10ms to over 6 seconds after autovacuum fell behind at default settings ([Compass True North, 2017](https://medium.com/compass-true-north/postgres-at-scale-query-performance-and-autovacuuming-for-large-tables-d7e8ad40b16b)).

Autovacuum prevents this through three operations:

1. **VACUUM** marks dead tuple space as reusable for future inserts and updates.
2. **ANALYZE** updates table statistics so the planner makes accurate cost estimates.
3. **FREEZE** marks old tuples immune to XID wraparound, allowing the oldest XID counter to advance safely.

Note the distinction between VACUUM and VACUUM FULL. Regular `VACUUM` reclaims space for reuse within the same table. It does not shrink the file on disk. `VACUUM FULL` physically compacts the table and can return space to the OS, but it requires an exclusive lock and blocks all reads and writes during the operation. Running autovacuum frequently enough means you rarely need `VACUUM FULL` in the first place.

## How Does Autovacuum Decide When to Run?

Autovacuum checks each table against a threshold formula on every launcher cycle. The formulas are:

```
VACUUM threshold  = autovacuum_vacuum_threshold + (autovacuum_vacuum_scale_factor  × n_live_tup)
ANALYZE threshold = autovacuum_analyze_threshold + (autovacuum_analyze_scale_factor × n_live_tup)
```

A table becomes a VACUUM candidate when its dead tuple count exceeds the VACUUM threshold. It becomes an ANALYZE candidate when cumulative inserts, updates, and deletes since the last analyze exceed the ANALYZE threshold.

### Example with Default Settings

For a table with 1,000 rows using PostgreSQL 16/17 defaults:

| Parameter | Default | Meaning |
|---|---|---|
| `autovacuum_vacuum_scale_factor` | 0.2 | 20% of live rows |
| `autovacuum_vacuum_threshold` | 50 | minimum dead rows |
| `autovacuum_analyze_scale_factor` | 0.1 | 10% of live rows |
| `autovacuum_analyze_threshold` | 50 | minimum row changes |

VACUUM fires when dead rows reach: `50 + (0.2 × 1,000) = 250 dead rows`
ANALYZE fires when row changes reach: `50 + (0.1 × 1,000) = 150 changes`

These defaults work well for small tables. They don't scale to large ones. For a 1-billion-row table, autovacuum won't trigger until 200 million rows are dead. For a 1 TB table, that's up to 200 GB of dead row accumulation before cleanup starts.

<figure>
<svg viewBox="0 0 600 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Horizontal bar chart showing dead rows allowed to accumulate before autovacuum triggers at default 20 percent scale factor for tables ranging from 1 GB to 1 TB">
  <title>Dead Rows Allowed Before Autovacuum Triggers at Default scale_factor = 0.2</title>
  <rect width="600" height="240" fill="#0f172a" rx="8"/>
  <text x="300" y="26" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="600" font-family="system-ui,sans-serif">Dead Rows Allowed Before Autovacuum Triggers</text>
  <text x="300" y="44" text-anchor="middle" fill="#64748b" font-size="11" font-family="system-ui,sans-serif">Default: autovacuum_vacuum_scale_factor = 0.20 (bars use log scale for visibility)</text>
  <text x="92" y="83" text-anchor="end" fill="#94a3b8" font-size="12" font-family="system-ui,sans-serif">1 GB table</text>
  <text x="92" y="123" text-anchor="end" fill="#94a3b8" font-size="12" font-family="system-ui,sans-serif">10 GB table</text>
  <text x="92" y="163" text-anchor="end" fill="#94a3b8" font-size="12" font-family="system-ui,sans-serif">100 GB table</text>
  <text x="92" y="203" text-anchor="end" fill="#94a3b8" font-size="12" font-family="system-ui,sans-serif">1 TB table</text>
  <rect x="100" y="66" width="30" height="22" fill="#3b82f6" rx="3"/>
  <text x="135" y="82" fill="#cbd5e1" font-size="11" font-family="system-ui,sans-serif">200 MB dead rows</text>
  <rect x="100" y="106" width="80" height="22" fill="#6366f1" rx="3"/>
  <text x="185" y="122" fill="#cbd5e1" font-size="11" font-family="system-ui,sans-serif">2 GB dead rows</text>
  <rect x="100" y="146" width="200" height="22" fill="#f59e0b" rx="3"/>
  <text x="305" y="162" fill="#cbd5e1" font-size="11" font-family="system-ui,sans-serif">20 GB dead rows</text>
  <rect x="100" y="186" width="450" height="22" fill="#ef4444" rx="3"/>
  <text x="270" y="202" fill="white" font-size="11" font-weight="600" font-family="system-ui,sans-serif">200 GB dead rows at 1 TB</text>
  <text x="300" y="228" text-anchor="middle" fill="#475569" font-size="10" font-family="system-ui,sans-serif">Source: EDB Autovacuum Tuning Basics, Tomas Vondra, July 2024 | Formula: threshold + (relrows x 0.20)</text>
</svg>
<figcaption>At default settings, dead rows can reach 20% of a table's live rows before autovacuum fires. For large tables, lower <code>autovacuum_vacuum_scale_factor</code> to 0.01–0.05.</figcaption>
</figure>

### Complete Parameter Reference (PostgreSQL 16/17)

| Parameter | Default | Description |
|---|---|---|
| `autovacuum` | `on` | Enable autovacuum launcher |
| `track_counts` | `on` | Required for threshold checks |
| `autovacuum_max_workers` | `3` | Max concurrent workers, cluster-wide |
| `autovacuum_naptime` | `1min` | Launcher sleep between database scans |
| `autovacuum_vacuum_threshold` | `50` | Minimum dead rows to trigger VACUUM |
| `autovacuum_vacuum_scale_factor` | `0.2` | Dead row fraction added to threshold |
| `autovacuum_analyze_threshold` | `50` | Minimum row changes to trigger ANALYZE |
| `autovacuum_analyze_scale_factor` | `0.1` | Row change fraction for ANALYZE threshold |
| `autovacuum_vacuum_insert_threshold` | `1000` | Minimum inserts for INSERT-only tables (PG 13+) |
| `autovacuum_vacuum_insert_scale_factor` | `0.2` | Insert scale factor (PG 13+) |
| `autovacuum_vacuum_cost_delay` | `2ms` | Sleep per cost cycle (was 20ms before PG 12) |
| `autovacuum_vacuum_cost_limit` | `-1` | Token budget per cycle (inherits vacuum_cost_limit = 200) |
| `autovacuum_freeze_max_age` | `200,000,000` | Transactions before forced anti-wraparound VACUUM |
| `log_autovacuum_min_duration` | `-1` (off) | Log runs longer than this duration |

*Source: [PostgreSQL 17 Documentation](https://www.postgresql.org/docs/17/runtime-config-autovacuum.html)*

## Tuning Autovacuum for Large Tables

The global defaults work for small and medium tables. For large, high-traffic tables, they don't. PostgreSQL lets you override autovacuum settings at the table level, which is exactly what you need for mixed-size workloads.

<!-- [PERSONAL EXPERIENCE] -->
In practice, we've seen this pattern repeatedly: a team scales a transactional table from tens of millions to hundreds of millions of rows, and query latency climbs silently. Autovacuum is still running. It just can't keep up at 20% scale factor. The fix is almost always per-table tuning, and it often takes less than a minute to apply.

```sql
-- Trigger VACUUM when dead rows exceed 1% of the table (not 20%)
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor  = 0.01,
  autovacuum_vacuum_threshold     = 100,
  autovacuum_analyze_scale_factor = 0.01
);
```

For very large tables, use a fixed threshold and set the scale factor to zero:

```sql
-- Trigger VACUUM every 100,000 dead rows, regardless of table size
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0,
  autovacuum_vacuum_threshold    = 100000
);
```

How do you know which tables need individual settings? The answer is in `pg_stat_user_tables`. This query shows tables accumulating dead tuples faster than autovacuum is clearing them:

```sql
SELECT
  schemaname,
  relname                                                          AS table_name,
  n_live_tup,
  n_dead_tup,
  round(n_dead_tup::numeric / nullif(n_live_tup, 0) * 100, 2)    AS dead_pct,
  last_autovacuum,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE n_live_tup > 10000
ORDER BY dead_pct DESC NULLS LAST
LIMIT 20;
```

Tables with `dead_pct` consistently above 20% are candidates for per-table tuning. According to pganalyze's VACUUM Advisor, dead tuple percentages above 50% often indicate the need for `VACUUM FULL` to reclaim disk space ([pganalyze, 2023](https://pganalyze.com/blog/introducing-vacuum-advisor-postgres)).

<!-- [ORIGINAL DATA] -->
According to a production case study at Compass, reducing `autovacuum_vacuum_scale_factor` from 0.20 to 0.02 on tables with 3 billion rows cut the vacuum trigger point from 600 million changed rows to 60 million. The result: average query performance improved by ~50%, and the largest tables saw up to 90% faster query times ([Compass True North, 2017](https://medium.com/compass-true-north/postgres-at-scale-query-performance-and-autovacuuming-for-large-tables-d7e8ad40b16b)). One parameter change, production-level impact.

## How Many Workers Can Run at Once?

`autovacuum_max_workers` (default: 3) sets the maximum concurrent autovacuum workers across the entire PostgreSQL cluster, not per database. The launcher divides `autovacuum_naptime` by the number of databases. With 3 databases and a 1-minute naptime, each database gets checked roughly every 20 seconds.

Here's the catch that surprises most DBAs: increasing `autovacuum_max_workers` alone will not speed things up. In fact, it can slow each worker down.

All workers share a single `autovacuum_vacuum_cost_limit` budget. With 3 workers and a 200-token limit, each worker effectively gets ~67 tokens per cost cycle. Add 2 more workers and each gets ~40. More workers, less work per worker. To actually increase parallel vacuum throughput, you need to raise `autovacuum_vacuum_cost_limit` at the same time:

```
# postgresql.conf
autovacuum_max_workers       = 5
autovacuum_vacuum_cost_limit = 800    -- up from 200; budget shared across all workers
autovacuum_vacuum_cost_delay = 2ms    -- keep at default (PG 14+)
```

## Understanding Autovacuum's IO Throttling

Autovacuum is intentionally throttled. It uses a token-based cost model so it doesn't overwhelm your storage during peak transaction hours. Each I/O operation consumes a certain number of tokens. When the combined cost hits the cycle budget, every worker sleeps for `autovacuum_vacuum_cost_delay` milliseconds before resuming.

| Operation | Tokens | Notes |
|---|---|---|
| Page read (shared buffer hit) | 1 | Already in memory, cheap |
| Page read (from disk) | 2 | Reduced from 10 in PostgreSQL 14 |
| Dirty page write | 20 | Writing modified pages back to disk |
| Budget per cycle | 200 | `autovacuum_vacuum_cost_limit` default |
| Sleep after budget | 2ms | `autovacuum_vacuum_cost_delay` default (PG 14+) |

With a 2ms delay, autovacuum runs up to 500 cost cycles per second. The resulting throughput ceiling at default settings:

- **Shared buffer reads:** `500 cycles/s × (200 / 1) × 8 KB = 800 MB/s`
- **Disk reads:** `500 cycles/s × (200 / 2) × 8 KB = 400 MB/s`
- **Writes:** `500 cycles/s × (200 / 20) × 8 KB = 40 MB/s`

Before PostgreSQL 12, the default `autovacuum_vacuum_cost_delay` was 20ms. That capped disk throughput at roughly 8 MB/s. PostgreSQL 12 dropped it to 2ms. PostgreSQL 14 then reduced `vacuum_cost_page_miss` from 10 tokens to 2 tokens, pushing throughput even higher.

<figure>
<svg viewBox="0 0 600 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Horizontal bar chart comparing PostgreSQL autovacuum maximum disk read throughput across versions: 8 MB/s for PG 11 and earlier, 40 MB/s for PG 12-13, 400 MB/s for PG 14 and later">
  <title>Autovacuum Max Disk Read Throughput by PostgreSQL Version (default settings)</title>
  <rect width="600" height="210" fill="#0f172a" rx="8"/>
  <text x="300" y="26" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="600" font-family="system-ui,sans-serif">Autovacuum Max Disk Read Throughput by Version</text>
  <text x="300" y="44" text-anchor="middle" fill="#64748b" font-size="11" font-family="system-ui,sans-serif">Default settings: cost_limit = 200, cost_delay as shipped per version</text>
  <text x="92" y="85" text-anchor="end" fill="#94a3b8" font-size="12" font-family="system-ui,sans-serif">PG 11 and earlier</text>
  <text x="92" y="130" text-anchor="end" fill="#94a3b8" font-size="12" font-family="system-ui,sans-serif">PG 12 and PG 13</text>
  <text x="92" y="173" text-anchor="end" fill="#94a3b8" font-size="12" font-family="system-ui,sans-serif">PG 14 and later</text>
  <rect x="100" y="68" width="9" height="24" fill="#3b82f6" rx="3"/>
  <text x="115" y="85" fill="#cbd5e1" font-size="12" font-family="system-ui,sans-serif">8 MB/s (20ms cost delay)</text>
  <rect x="100" y="113" width="45" height="24" fill="#6366f1" rx="3"/>
  <text x="152" y="130" fill="#cbd5e1" font-size="12" font-family="system-ui,sans-serif">40 MB/s (2ms cost delay)</text>
  <rect x="100" y="158" width="450" height="24" fill="#22c55e" rx="3"/>
  <text x="220" y="175" fill="white" font-size="12" font-weight="600" font-family="system-ui,sans-serif">400 MB/s (2ms delay + lower page_miss cost)</text>
  <text x="300" y="200" text-anchor="middle" fill="#475569" font-size="10" font-family="system-ui,sans-serif">Source: EDB Autovacuum Tuning Basics, Tomas Vondra, July 2024</text>
</svg>
<figcaption>PostgreSQL 14+ autovacuum can read from disk at 400 MB/s, 50x faster than PG 11 at defaults. The PG 12 change (cost delay 20ms to 2ms) was the larger driver; PG 14 reduced <code>vacuum_cost_page_miss</code> from 10 to 2 tokens.</figcaption>
</figure>

What does this mean practically? If you're still running PG 11 or earlier, upgrading to PG 14+ alone will dramatically improve autovacuum effectiveness on large tables, with no configuration changes.

To raise the throughput ceiling further, increase `autovacuum_vacuum_cost_limit`. The tradeoff is higher I/O pressure on your workload during peak hours. Start with 400-800 and monitor I/O utilization.

## Logging Autovacuum Activity

Autovacuum runs silently unless you tell it otherwise. Set `log_autovacuum_min_duration` to surface slow runs in your PostgreSQL log:

```
# Log any autovacuum run taking longer than 250ms
log_autovacuum_min_duration = '250ms'

# Log every autovacuum run (useful during tuning, noisy in production)
# log_autovacuum_min_duration = 0
```

A typical log entry looks like this:

```
automatic vacuum of table "mydb.public.orders": index scans: 1
  pages: 0 removed, 15432 remain, 2 skipped due to pins
  tuples: 182000 removed, 4500000 remain, 0 are dead but not yet removable
  avg read rate: 38.2 MB/s, avg write rate: 2.1 MB/s
  elapsed: 4823.112 ms
```

If autovacuum is taking minutes on the same table repeatedly, that table needs per-table settings or a scheduled `VACUUM` during an off-peak window. The combination of `log_autovacuum_min_duration` and periodic snapshots of `pg_stat_user_tables` gives you a complete picture of which tables autovacuum is keeping up with and which it isn't.

---

## Frequently Asked Questions

**Why is autovacuum running but my table still has lots of dead tuples?**

The most common cause is the 20% scale factor being too high for a large table. A 500M-row table needs 100M dead rows before vacuum triggers. Set `autovacuum_vacuum_scale_factor = 0.01` on the table, or use a fixed threshold with `autovacuum_vacuum_scale_factor = 0` and `autovacuum_vacuum_threshold = 50000`.

**Can I disable autovacuum for a specific table?**

Yes, using a storage parameter:

```sql
ALTER TABLE archive_log SET (autovacuum_enabled = false);
```

Only do this for truly static tables that never receive writes. Any table with regular DML needs autovacuum for dead tuple removal and statistics maintenance.

**Why does adding more workers slow each worker down?**

All workers share one `autovacuum_vacuum_cost_limit` token budget. Adding workers splits that budget further, so each worker processes fewer pages per cycle. Increase `autovacuum_vacuum_cost_limit` proportionally when raising `autovacuum_max_workers`.

**What happens if autovacuum can't keep up with transaction wraparound?**

PostgreSQL logs warnings at 40M XIDs from the wraparound limit and blocks all writes at 3M XIDs from the limit. Recovery requires downtime for a forced `VACUUM` run. Prevent it by keeping `autovacuum_freeze_max_age` at its default (200M transactions) and ensuring autovacuum is not throttled on tables with heavy UPDATE/DELETE workloads.

**How do I verify autovacuum is actually keeping up?**

Query `pg_stat_user_tables` for `n_dead_tup` as a fraction of `n_live_tup`, and check `last_autovacuum` timestamps on active tables. Enable `log_autovacuum_min_duration = '250ms'` to see which tables are taking the longest. Dead tuple percentages consistently above 20% on active tables mean autovacuum isn't keeping pace.

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Why is autovacuum running but my table still has lots of dead tuples?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The default 20% scale factor is too high for large tables. A 500M-row table needs 100M dead rows before vacuum triggers. Fix it with per-table ALTER TABLE SET (autovacuum_vacuum_scale_factor = 0.01) or a fixed autovacuum_vacuum_threshold."
      }
    },
    {
      "@type": "Question",
      "name": "Can I disable autovacuum for a specific table?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Use ALTER TABLE table_name SET (autovacuum_enabled = false). Only appropriate for truly static tables that never receive writes. Tables with regular DML need autovacuum for bloat prevention and statistics maintenance."
      }
    },
    {
      "@type": "Question",
      "name": "Why does adding more autovacuum workers slow each worker down?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "All workers share a single autovacuum_vacuum_cost_limit token budget. More workers means less budget per worker. Increase autovacuum_vacuum_cost_limit proportionally when raising autovacuum_max_workers."
      }
    },
    {
      "@type": "Question",
      "name": "What happens if autovacuum cannot keep up with transaction wraparound?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "PostgreSQL logs warnings at 40M XIDs from the wraparound limit and shuts down all writes at 3M XIDs from the limit. Recovery requires downtime for a forced VACUUM run. Keep autovacuum_freeze_max_age at its default (200M transactions) and ensure autovacuum is not overly throttled."
      }
    },
    {
      "@type": "Question",
      "name": "How do I verify autovacuum is keeping up with my workload?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Query pg_stat_user_tables for n_dead_tup as a fraction of n_live_tup, and check last_autovacuum timestamps on active tables. Set log_autovacuum_min_duration to surface slow runs. Dead tuple percentages above 20% on active tables indicate autovacuum is falling behind."
      }
    }
  ]
}
</script>

---

*Tested versions: PostgreSQL 11, 12, 13, 14, 15, 16, 17.*
