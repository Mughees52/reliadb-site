---
title: "PostgreSQL Running Slow? A Step-by-Step Diagnostic Guide"
date: 2024-03-15T09:00:00.000Z
description: "Your PostgreSQL database is slow and you don't know why. This guide walks through a systematic diagnosis process — slow queries, EXPLAIN analysis, index auditing, and autovacuum."
category: postgresql
read_time: 12
featured: true
---

Your application is slow. Users are complaining. You've checked the app servers, the network, the CDN — everything seems fine. The database is the suspect, but where do you start?

PostgreSQL performance problems almost always come from a handful of root causes: missing or wrong indexes, table and index bloat, misconfigured autovacuum, connection exhaustion, or poorly-written queries hitting the wrong execution plan.

## Step 1: Check What's Running Right Now

Before digging into historical data, look at what's happening in your database at this moment.

```sql
-- Find long-running queries (over 5 seconds)
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state,
  wait_event_type,
  wait_event
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
  AND state != 'idle'
ORDER BY duration DESC;
```

Pay attention to the `wait_event_type` column. Lock waits mean contention problems. IO waits mean you're hitting disk.

## Step 2: Find Your Slowest Queries with pg_stat_statements

```sql
SELECT
  left(query, 100) AS query_snippet,
  calls,
  round((total_exec_time / calls)::numeric, 2) AS avg_ms,
  round(total_exec_time::numeric, 2) AS total_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

## Step 3: Read the EXPLAIN Output

Run `EXPLAIN (ANALYZE, BUFFERS)` on your slow queries and look for:

- **Seq Scan on large tables** — you're missing an index
- **High "rows removed by filter"** — your index isn't selective enough
- **Nested Loop with many iterations** — missing index on the join column

## Step 4: Check for Bloat

```sql
SELECT
  tablename,
  n_live_tup,
  n_dead_tup,
  round(100 * n_dead_tup::numeric / nullif(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
  last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY dead_pct DESC;
```

Tables with more than 10-20% dead tuples need a `VACUUM ANALYZE`.

## Summary

80% of PostgreSQL performance problems come from two things: missing or wrong indexes, and autovacuum not keeping up with bloat. Fix those and most slowdowns disappear.

If you've worked through this and still can't identify the root cause, [book a free assessment call](/contact.html) — we'll review your specific setup.
