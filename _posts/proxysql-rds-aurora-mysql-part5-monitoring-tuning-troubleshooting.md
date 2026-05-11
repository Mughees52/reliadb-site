---
title: "ProxySQL in Front of AWS RDS & Aurora MySQL — Part 5: Monitoring, Tuning, and Troubleshooting"
date: 2026-05-11T10:00:00.000Z
author: "Mario"
coverImage: "/images/blog/proxysql-rds-aurora-mysql-part5-monitoring-tuning-troubleshooting.jpg"
description: "ProxySQL + Aurora stack in production: query digest baselines, lag threshold sizing, zero-error rolling upgrade, and monitor-user revocation failure pattern."
categories:
  - mysql
  - aws-rds
  - high-availability
read_time: 17
featured: true
---

<!-- Series Navigation -->
<div class="series-nav">
  <h4>ProxySQL in Front of AWS RDS &amp; Aurora MySQL &mdash; 5-Part Series</h4>
  <ol>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part1-why-and-placement">Part 1: Why and Where to Place It</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part2-aurora-hostgroups">Part 2: Wiring ProxySQL to Aurora MySQL</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part3-query-rules-rw-split">Part 3: Query Routing, Read/Write Split, Multiplexing</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls">Part 4: HA, Failover Patterns, and TLS</a></li>
    <li><span class="current">Part 5: Monitoring, Tuning, and Troubleshooting (You Are Here)</span></li>
  </ol>
</div>

The system is running. ProxySQL in front of Aurora, query rules routing reads to replicas, the two-node cluster syncing config in ~600ms, TLS on the backend leg. Four parts to reach this point. The question shifts now: how do you know it's still working correctly at 3am on a Sunday — and when it isn't, where do you look?

This part covers the operational layer. The same Lima lab topology from Parts 1–4 runs throughout: dbdeployer MySQL 8.0.41 sandbox (master on port 25001, two replicas on 25002 and 25003), ProxySQL 2.7.3 on `proxysql-1` and `proxysql-2`, backends in HG&nbsp;10 (writer) and HG&nbsp;20 (readers). No AWS resources — Part 5 is fully local. The Aurora-specific captures referenced in Section 2 are reused from Parts 2 and 4, cited explicitly.

<h2 id="recap">The System from Parts 1–4 — and What Part 5 Adds</h2>

[Part 1](/blog/proxysql-rds-aurora-mysql-part1-why-and-placement) made the placement decision. [Part 2](/blog/proxysql-rds-aurora-mysql-part2-aurora-hostgroups) wired ProxySQL to Aurora's native topology discovery — `mysql_aws_aurora_hostgroups`, `REPLICA_HOST_STATUS`, 2 errors across 1,485 queries through a live failover. [Part 3](/blog/proxysql-rds-aurora-mysql-part3-query-rules-rw-split) built the query routing layer: `mysql_query_rules`, the ordering rule for `SELECT ... FOR UPDATE`, `transaction_persistent`, and the exact conditions that break multiplexing. [Part 4](/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls) tested the full HA stack under pressure — Aurora at T0+15s, RDS Multi-AZ at T0+64s, TLS footguns in auto-discovery, and NLB health check timing that says 90 seconds in the docs but measured 110 in the lab.

Part 5 adds three things those parts explicitly deferred: the monitoring layer you query to know the system is healthy, the tuning decisions now grounded in observed behavior, and the recovery path for the most common non-obvious production failure mode.

<h2 id="monitoring">The Monitoring Layer: What to Watch and Why</h2>

Three tables cover health at different granularities. Together they answer: is my proxy routing correctly, how loaded is my backend pool, and did my Aurora topology discovery run cleanly?

<h3 id="query-digest"><code>stats_mysql_query_digest</code>: Workload Shape and Latency Baselines</h3>

```sql
-- Tested on Lima VMs, MySQL 8.0.41 via dbdeployer, ProxySQL 2.7.3, 2026-05-10
```

`stats_mysql_query_digest` accumulates per-digest statistics for every query ProxySQL routes. The primary uses are identifying slow queries by total time spent and reading the *shape* of your workload — which hostgroups are receiving traffic and in what proportions.

The two captures below show the same ProxySQL instance under two workload patterns. Both are correct behavior. The point is that monitoring tells you which shape you have; your job is to verify it matches what you expect.

**Shape A — Transactional workload with `transaction_persistent=1`** (Part 5 lab, 20 sysbench threads, 300s `oltp_read_write`):

```sql
-- stats_mysql_query_digest on proxysql-1 — top 5 by sum_time, 300s oltp_read_write load
-- Note: all queries land in HG 10 — see analysis below
hostgroup  schemaname  digest_text                                count_star  avg_time_us
10         lab_test    SELECT c FROM sbtest1 WHERE id=?           193270      1936
10         lab_test    SELECT c FROM sbtest2 WHERE id=?           193150      1929
10         lab_test    SELECT c FROM sbtest4 WHERE id=?           191770      1940
10         lab_test    SELECT c FROM sbtest3 WHERE id=?           192110      1927
10         lab_test    COMMIT                                      77046      4280
```

Every query — including the `SELECT` statements — landed in HG&nbsp;10 (the writer). HG&nbsp;20 (readers) received 644 total executions against 247,593 for HG&nbsp;10. This is not a routing misconfiguration. The `oltp_read_write` workload wraps every statement inside `BEGIN … COMMIT`. With `transaction_persistent=1` set on the `app` user, ProxySQL pins all queries in a detected transaction to the same hostgroup — the writer, where the transaction opened. The reads never had an opportunity to fan out to replicas because the transaction boundary kept them anchored.

The corresponding connection pool snapshot confirms this:

```sql
-- stats_mysql_connection_pool on proxysql-1 (mid-load, 20 sysbench threads)
hostgroup  srv_host       srv_port  status  ConnUsed  ConnFree  ConnOK  Latency_us
10         192.168.105.6  25001     ONLINE  20        0         20      2489
20         192.168.105.6  25002     ONLINE   0        12        12      2556
20         192.168.105.6  25003     ONLINE   0         9         9      2445
```

`ConnUsed=20` on HG&nbsp;10 — one backend connection per sysbench thread, held for the duration of each active transaction. `ConnUsed=0` on both replicas — they're healthy and connected, but receiving no queries.

**Shape B — Idle multiplexing baseline** (from the Part 3 lab, 100 Python threads, `SELECT 1`, no session state — reused for comparison):

```sql
-- stats_mysql_connection_pool on proxysql-1 (T0+10s, 100 idle frontends, no session state)
-- Source: Part 3 A.5 capture — reused for baseline comparison
hostgroup  srv_host       srv_port  ConnUsed  ConnFree
10         192.168.105.6  25001     0         100
20         192.168.105.6  25002     0          42
20         192.168.105.6  25003     0          61
```

One hundred frontend sessions open. Zero backend connections pinned to any of them. After `SELECT 1` completed, ProxySQL returned all connections to the free pool — the frontends are connected, they just don't hold a MySQL thread on the other side.

The diagnostic question these two shapes answer: if you expect reads to distribute across replicas but HG&nbsp;20 shows `ConnUsed=0` and `stats_mysql_query_digest` shows all executions in HG&nbsp;10, check `transaction_persistent` first, then check whether your ORM or application wraps reads inside explicit transactions. Both shapes above represent correct behavior for their respective workloads. The monitoring tells you which one you're looking at.

The two queries to run routinely:

```sql
-- Top 10 queries by total time spent — identifies slow-query candidates
SELECT hostgroup, schemaname, username, digest_text,
       count_star,
       ROUND(sum_time / count_star) AS avg_time_us,
       max_time
FROM stats_mysql_query_digest
ORDER BY sum_time DESC
LIMIT 10;

-- Per-hostgroup execution distribution — reveals workload shape
SELECT hostgroup,
       COUNT(DISTINCT digest)    AS unique_queries,
       SUM(count_star)           AS total_executions
FROM stats_mysql_query_digest
GROUP BY hostgroup
ORDER BY hostgroup;
```

Rising `avg_time_us` on a digest that was previously stable is the early slow-query signal. Unexpected hostgroup skew — all traffic in HG&nbsp;10 when you expect a 70/30 read split — tells you to check `transaction_persistent` or your query rules before blaming the backends.

<h3 id="aurora-monitor-log"><code>mysql_server_aws_aurora_log</code>: Topology Detection and Gap Alerting</h3>

`monitor.mysql_server_aws_aurora_log` is the only table that shows Aurora topology discovery in real time. ProxySQL writes a row every `check_interval_ms` for each backend it polls. It's the authoritative record of whether ProxySQL is successfully reading `INFORMATION_SCHEMA.REPLICA_HOST_STATUS` — and how long each poll took.

```sql
-- monitor.mysql_server_aws_aurora_log — healthy polling pattern (3-row excerpt)
-- Source: Part 2 live Aurora lab capture, 2026-05-08 (reused — no AWS resources in Part 5)
SELECT check_utc, hostname, is_writer_per_replica_host_status AS writer_detected, lag_ms
FROM monitor.mysql_server_aws_aurora_log
ORDER BY check_utc DESC
LIMIT 3;
```

```
check_utc               hostname (polled)                           writer_detected              lag_ms
2026-05-08 10:53:16     proxysql-aurora-EXAMPLE-writer.EXAMPLE...  proxysql-aurora-EXAMPLE-writer   0
2026-05-08 10:53:14     proxysql-aurora-EXAMPLE-reader.EXAMPLE...  proxysql-aurora-EXAMPLE-writer   0
2026-05-08 10:53:12     proxysql-aurora-EXAMPLE-reader.EXAMPLE...  proxysql-aurora-EXAMPLE-writer   0
```

A healthy pattern: rows appear at roughly `check_interval_ms` intervals, `writer_detected` is consistent across all rows in a given window, and `lag_ms` stays low or zero. The 6-second detection gap from the Part 2 and Part 4 failover captures appeared in this table exactly: ProxySQL polled on schedule throughout, but Aurora's backends were unreachable mid-promotion, so no rows appear between `10:53:10` and `10:53:16`. Section 3 covers how to size `check_interval_ms` against that observed promotion floor.

**Detection gap alerting rule:** alert when no successful poll row appears for more than 2&times;`check_interval_ms`. At `check_interval_ms=2000`, that's a 4-second silence. Any gap longer than that means ProxySQL either can't reach the backend or Aurora's control plane is mid-promotion. This is the right threshold to wire into your monitoring system — not a static time value, but a function of your configured polling interval.

<div class="callout">
  <p><strong>SCHEMA NOTE:</strong> <code>mysql_server_aws_aurora_log</code> lives in the <code>monitor</code> schema, not in <code>main</code> or <code>stats</code>. Use <code>SELECT ... FROM monitor.mysql_server_aws_aurora_log</code>. The table <code>main.mysql_server_aurora_log</code> does not exist in ProxySQL 2.7.3. This footgun was documented in <a href="/blog/proxysql-rds-aurora-mysql-part2-aurora-hostgroups">Part 2</a> during the auto-discovery setup.</p>
</div>

<h3 id="connection-pool"><code>stats_mysql_connection_pool</code> and <code>stats_mysql_processlist</code>: Pool Headroom</h3>

`stats_mysql_connection_pool` answers the connection budget question: how close am I to exhausting the backend pool? The `ConnUsed / (ConnUsed + ConnFree)` ratio is the headroom metric. The mid-load capture from the Part 5 lab shows the pattern for a transactional workload:

```sql
-- stats_mysql_connection_pool on proxysql-1 (mid-load, 20 threads, oltp_read_write)
-- Tested on Lima VMs, MySQL 8.0.41 via dbdeployer, ProxySQL 2.7.3, 2026-05-10
hostgroup  srv_host       srv_port  status  ConnUsed  ConnFree  ConnOK  ConnERR  Queries   Latency_us
10         192.168.105.6  25001     ONLINE  20        0         20      0        181493    2489
20         192.168.105.6  25002     ONLINE   0        12        12      2280     116       2556
20         192.168.105.6  25003     ONLINE   0         9         9      2230     83        2445
```

A few readings worth calling out. `ConnERR` of 2,280 and 2,230 on the replicas are artifacts of earlier lab sessions, not live failures — verify by watching whether they increment during active load. If `ConnERR` climbs alongside a `ConnUsed` spike, that's a backend connectivity problem. If it's static, it's historical noise.

`Latency_us` is the proxy-measured round-trip for health checks to each backend. Rising latency on one backend before rising `ConnERR` is the early warning signal: the backend is struggling before it starts failing checks. At 2,489µs on the master and ~2,500µs on the replicas, latency is healthy and symmetric in this capture.

**Pool headroom alert threshold:** flag when `ConnUsed / (ConnUsed + ConnFree) > 0.8` sustained for more than 30 seconds on any hostgroup. Below 0.5 at steady state is healthy. Above 0.8 means you're approaching the connection ceiling — either raise `max_connections` in `mysql_servers`, add a backend, or reduce `transaction_persistent` scope if the workload allows it.

`stats_mysql_processlist` gives the live per-session view — which hostgroup each frontend session is currently assigned to and what command it's running:

```sql
-- stats_mysql_processlist on proxysql-1 (mid-load snapshot)
SELECT SessionID, user, db, hostgroup, command, time_ms, info
FROM stats_mysql_processlist
ORDER BY time_ms DESC
LIMIT 10;
```

During the Part 5 sustained load, all 20 sessions showed `hostgroup=10` with a mix of `Execute` and `Sleep` states. A session in `Sleep` with `time_ms` climbing means it's holding an open backend connection without issuing queries — the cost of `transaction_persistent=1` in a slow-consumer application. Use `processlist` during incidents to see exactly which sessions are holding pool resources and which queries are actively executing.

<h2 id="tuning">Production Sizing: Polling Intervals, Lag Thresholds, Multiplexing</h2>

The right values for these variables don't come from the ProxySQL docs. They come from your own observed promotion time and workload shape. Here's how to derive them from the data Parts 2–4 already captured.

<h3 id="check-interval"><code>check_interval_ms</code>: Sizing Against the Promotion Floor</h3>

The detection latency formula from [Part 2's detection math section](/blog/proxysql-rds-aurora-mysql-part2-aurora-hostgroups#detection-math):

```
detection latency = Aurora internal promotion time (~6s, opaque to ProxySQL)
                  + at most one check_interval_ms cycle
```

Aurora's internal promotion time is the floor — ProxySQL was polling on schedule throughout both the Part 2 and Part 4 failovers, but the backends were simply unreachable while Aurora was mid-promotion. Lowering `check_interval_ms` below 1000ms adds polling load on Aurora's `INFORMATION_SCHEMA` without meaningfully reducing detection latency — the floor is Aurora's promotion time, and that's set by instance class and cross-AZ replication state, not polling frequency.

`check_interval_ms` controls the worst-case additional lag on top of that floor:

<table>
  <thead>
    <tr><th><code>check_interval_ms</code></th><th>Worst-case detection</th><th>Typical use case</th></tr>
  </thead>
  <tbody>
    <tr><td>2000ms (2s)</td><td>~8s</td><td>Most production workloads — low overhead, tight detection</td></tr>
    <tr><td>5000ms (5s)</td><td>~11s</td><td>Cost-sensitive setups; 3s of additional lag vs. 2000ms is acceptable for many apps</td></tr>
    <tr><td>10000ms (10s)</td><td>~16s</td><td>Background or batch Aurora clusters where sub-15s detection isn't required</td></tr>
  </tbody>
</table>

The Part 2 lab used `check_interval_ms=2000`; Part 4 used `5000`. Both labs produced identical detection floors because the constraint was Aurora's ~6-second internal promotion, not polling frequency. Choose based on the detection window your application's connection pool and retry logic can tolerate — not on the assumption that faster polling reduces the floor. `check_timeout_ms` must also remain below `check_interval_ms` and at or below 3000ms (ProxySQL 2.7.3 enforces this with a CHECK constraint; a silent INSERT failure is the symptom if you exceed it, as documented in [Part 4](/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls)).

<h3 id="lag-thresholds">Lag Thresholds: <code>max_replication_lag</code> vs <code>max_lag_ms</code></h3>

These are two different columns in two different tables with different units. Conflating them produces a config that looks correct but either does nothing or clips reads far more aggressively than intended.

<table>
  <thead>
    <tr><th>Column</th><th>Table</th><th>Unit</th><th>Scope</th><th>What it controls</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><code>max_replication_lag</code></td>
      <td><code>mysql_servers</code></td>
      <td><strong>seconds</strong></td>
      <td>Standard MySQL replication</td>
      <td>SHUNNED when <code>Seconds_Behind_Source &gt; max_replication_lag</code></td>
    </tr>
    <tr>
      <td><code>max_lag_ms</code></td>
      <td><code>mysql_aws_aurora_hostgroups</code></td>
      <td><strong>milliseconds</strong></td>
      <td>Aurora only (<code>REPLICA_HOST_STATUS</code>)</td>
      <td>Excludes reader from HG when <code>replica_lag_in_milliseconds &gt; max_lag_ms</code></td>
    </tr>
  </tbody>
</table>

The footgun: `max_lag_ms=600000` in `mysql_aws_aurora_hostgroups` is 600 seconds — a generous lab default from Part 2. Copying that value into `mysql_servers.max_replication_lag` would set a 600,000-**second** threshold (about 7 days) on your replicas. They'd have to lag a week before ProxySQL excluded them from routing.

**Lab result for `max_replication_lag`:** with `max_replication_lag=2` set on replica2 (port 25003) and the replica's SQL thread stopped, `Seconds_Behind_Source` returns NULL. ProxySQL treats NULL as 60 seconds of lag by default — so a stopped SQL thread suddenly looks like a 60-second-lagging replica even though the underlying data is fine. The variable `mysql-monitor_slave_lag_when_null=60` controls this; size it based on how tolerant your application is of reads from a replica whose SQL thread is stopped.

With `slave_lag_when_null=60` and `max_replication_lag=2`, replica2 transitioned to **SHUNNED** within one `monitor_replication_lag_interval` cycle (10 seconds) after the SQL thread was stopped. The status was SHUNNED, not OFFLINE_SOFT — that's the actual ProxySQL 2.7.3 behavior for lag-threshold violations. Reads stopped routing to replica2 immediately; replica1 absorbed them cleanly.

Recovery after `START REPLICA SQL_THREAD`: replica2 returned to ONLINE in approximately 72 seconds — about 7&times; the 10-second `monitor_replication_lag_interval`, as the lag counter drained across multiple polling cycles before ProxySQL confirmed it was clear. Recovery time is bounded by `monitor_replication_lag_interval × monitor_replication_lag_count` polling cycles, not by a fixed timeout.

<h3 id="multiplexing-tuning"><code>transaction_persistent</code> and Multiplexing Variables</h3>

The Part 5 sysbench capture (all traffic in HG&nbsp;10) makes the `transaction_persistent` tradeoff concrete. With `transaction_persistent=1`, queries inside an open transaction stay on the writer. This is correct for application accounts that hold real transactions — the alternative, allowing in-transaction reads to jump to a replica, would route a `SELECT` to a server that doesn't yet have the transaction's uncommitted writes visible, which produces inconsistent reads without any error. Don't set `transaction_persistent=0` for application accounts that use explicit transactions or that issue DML.

Set `transaction_persistent=0` for analytics or reporting accounts that connect, run a read, and disconnect — no open transactions, no consistency hazard. This is the same `analytics` user pattern from [Part 3](/blog/proxysql-rds-aurora-mysql-part3-query-rules-rw-split#per-user).

Two monitor variables worth knowing for the lag and health check rhythm:

- `mysql-monitor_ping_interval=10000` (10s default): how often ProxySQL sends `COM_PING` to each backend on existing connections. With `mysql-monitor_ping_max_failures=3`, three consecutive ping failures trigger SHUNNED — a 30-second window of consistently-failing pings before a backend is excluded.
- `mysql-wait_timeout=28800000` (8 hours): how long ProxySQL keeps backend connections alive. This means a credential change on the MySQL side doesn't immediately invalidate existing ProxySQL connections — they continue using the cached auth until the connections cycle out or a new connection attempt fails. Section 5 covers exactly what this looks like when it's the monitor user whose credentials change.

<h2 id="upgrade">Rolling Upgrade Runbook</h2>

<div class="callout">
  <p><strong>LAB NOTE:</strong> ProxySQL 2.7.3 was the latest available 2.7.x package in our apt repository at time of writing &mdash; there was no newer minor version to upgrade to. The runbook below is the canonical drain/upgrade/restore procedure for any binary upgrade; only the <code>apt-get install proxysql=2.7.X</code> version string changes. We executed the full cycle on both nodes to verify timing and zero-error behavior on a properly-configured client.</p>
</div>

<div class="callout">
  <p><strong>ZERO ERRORS, ~25 SECONDS PER NODE:</strong> A Linux MySQL 8.0 client running queries against both ProxySQL nodes throughout the upgrade window saw 0 errors across 40 requests during post-upgrade verification. Per-node cycle from drain to restored: ~26 seconds on node 1, ~20 seconds on node 2. The surviving node handled all traffic seamlessly during each drain window.<br><small>Note: a macOS MySQL 9.5 client in the test harness produced <code>ERROR 2059 (HY000): Authentication plugin 'mysql_native_password' cannot be loaded</code> errors &mdash; the <code>mysql_native_password.so</code> plugin was removed from MySQL 9.x. These are client-side errors unrelated to ProxySQL behavior, confirmed by parallel testing from the Linux client which saw 0 errors.</small></p>
</div>

**Step 1 — Capture pre-upgrade baseline.** Record the version and connection pool state on both nodes before touching anything. If something goes wrong during the upgrade, this snapshot is your reference point.

```sql
-- Pre-upgrade version baseline on both nodes (proxysql-1 shown)
-- Tested on Lima VMs, ProxySQL 2.7.3, 2026-05-10
SELECT @@version;
-- 2.7.3-12-g50b7f85

SELECT hostgroup, srv_host, srv_port, status, ConnUsed, ConnFree
FROM stats_mysql_connection_pool
ORDER BY hostgroup, srv_port;
```

**Step 2 — Start background traffic.** Run a SELECT loop from your client against both ProxySQL nodes simultaneously. Log every response with a timestamp — this is the evidence trail that quantifies the upgrade's error window. In production, your application's existing traffic serves this purpose; in a maintenance window, an explicit probe script gives you a clean record.

**Step 3 — Drain proxysql-1.** In production: deregister `proxysql-1` from the NLB target group first (NLB default connection draining: 30 seconds). Wait for in-flight connections to finish, then stop the service. The NLB routes all new connections to `proxysql-2` from the moment the target is deregistered. In the lab, where there's no NLB, stopping the service directly simulates this:

```bash
# Drain proxysql-1 (lab simulation of NLB target deregistration + service stop)
# Production: deregister from NLB first, wait for connection draining, then stop
sudo systemctl stop proxysql
```

Verify proxysql-1 is unreachable on port 6033 and proxysql-2 is serving normally before proceeding. [Part 4's NLB section](/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls#nlb-health-checks) covers the 110-second real-world detection window versus the theoretical 90-second threshold — size your drain window accordingly.

**Step 4 — Upgrade the binary.**

```bash
# Upgrade ProxySQL binary (replace 2.7.X with your target version)
sudo apt-get install proxysql=2.7.X
```

**Step 5 — Start the service and verify cluster sync.** After `systemctl start proxysql`, the restarted node bootstraps from its peer automatically — given a populated `proxysql_servers` table and matching cluster credentials, it fetches the current runtime config from `proxysql-2` within the cluster's `check_interval_ms` window (~600ms in our lab from [Part 4](/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls#sync-timings)).

```bash
# Start ProxySQL after upgrade; cluster sync bootstraps from peer automatically
sudo systemctl start proxysql
```

```sql
-- Verify cluster sync on the restarted node: runtime_mysql_servers should match proxysql-2
SELECT hostgroup_id, hostname, port, status
FROM runtime_mysql_servers
ORDER BY hostgroup_id, port;
```

If `runtime_mysql_servers` shows the master (port 25001) in both HG&nbsp;10 and HG&nbsp;20 after restart, that's expected: `mysql-monitor_writer_is_also_reader=true` places the master in both the writer and reader hostgroups. It's not a routing anomaly — it reflects the ProxySQL default that allows reads to land on the writer when both replicas are lagging or SHUNNED.

If `mysql_servers` doesn't arrive on the restarted node, check whether `admin-cluster_mysql_servers_sync_algorithm=1` (delta mode) is set and the node has no sync baseline — the bootstrap footgun from [Part 4](/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls#bootstrap-footgun). Set it to `0` temporarily to force a full pull, then restore `1`.

**Step 6 — Re-register with NLB** (production step) and spot-check traffic through the upgraded node.

**Step 7 — Repeat for proxysql-2.**

Lab timing for both nodes:

<table>
  <thead>
    <tr><th>Step</th><th>proxysql-1</th><th>proxysql-2</th></tr>
  </thead>
  <tbody>
    <tr><td>Service stopped</td><td>21:01:27Z</td><td>21:02:56Z</td></tr>
    <tr><td>Service back online</td><td>21:01:53Z</td><td>21:03:16Z</td></tr>
    <tr><td><strong>Total cycle</strong></td><td><strong>~26s</strong></td><td><strong>~20s</strong></td></tr>
  </tbody>
</table>

The per-node time includes the `apt-get install` step. In a real upgrade where the package download is already cached, the binary swap itself takes under 5 seconds — the remaining time is service start, monitor thread initialization, and cluster sync confirmation.

<h2 id="troubleshooting">Troubleshooting: When Something Goes Wrong</h2>

The most common non-obvious production failure with ProxySQL follows a specific pattern: backends appear SHUNNED or errors start climbing, the instinct is to check Aurora or the MySQL backends directly, but the actual cause lives in a ProxySQL internal table that most DBAs don't check first. Here's the diagnostic sequence that surfaces it quickly.

The worked example is monitor user credential revocation. ProxySQL connects to each backend using the `monitor` user (set via `mysql-monitor_username` and `mysql-monitor_password`) to run health checks — `COM_PING`, `SHOW REPLICA STATUS` for replication lag, `SHOW GLOBAL VARIABLES LIKE 'read_only'` for writer detection. If those credentials break — password rotation without updating ProxySQL, a permission change by someone who didn't know the monitor user was load-bearing — every health check against every backend starts failing simultaneously.

**The troubleshooting flowchart:**

```
Symptom: rising errors or SHUNNED backends in runtime_mysql_servers
                │
                ▼
   Step 1: Check runtime_mysql_servers
   ──────────────────────────────────────────────────────
   All ONLINE?
     YES → backend health is fine → check query rules
           and stats_mysql_query_digest for routing anomalies
     NO (SHUNNED present) → continue ↓
   ──────────────────────────────────────────────────────
                │
                ▼
   Step 2: Check mysql_server_connect_log
   ──────────────────────────────────────────────────────
   SELECT hostname, port, time_start_us,
          connect_success_time_us, connect_error
   FROM monitor.mysql_server_connect_log
   ORDER BY time_start_us DESC LIMIT 20;

   connect_error = NULL?
     YES → connect checks are clean → go to ping_log
     "Access denied for user 'monitor'" → FOUND IT
   ──────────────────────────────────────────────────────
                │
                ▼
   Step 3: Confirm with mysql_server_ping_log
   ──────────────────────────────────────────────────────
   SELECT hostname, port, time_start_us,
          ping_success_time_us, ping_error
   FROM monitor.mysql_server_ping_log
   ORDER BY time_start_us DESC LIMIT 20;

   Same "Access denied" pattern? → confirms monitor credentials
   "Gone away" / timeout? → backend connectivity problem
   ──────────────────────────────────────────────────────
                │
                ▼
   Step 4: Verify the monitor user directly on the backend
   ──────────────────────────────────────────────────────
   mysql -h <backend-host> -P <port> -u monitor -p'<pass>' \
     -e "SHOW REPLICA STATUS\G"

   Access denied → confirm which grant is missing
   ──────────────────────────────────────────────────────
                │
                ▼
   Step 5: Restore
   ──────────────────────────────────────────────────────
   On the MySQL backend (run on master; replicated to replicas):
     GRANT REPLICATION CLIENT ON *.* TO 'monitor'@'%';
     GRANT SELECT ON sys.* TO 'monitor'@'%';
     FLUSH PRIVILEGES;

   If the password changed on the MySQL side, also update ProxySQL:
     SET mysql-monitor_password='<new-pass>';
     LOAD MYSQL VARIABLES TO RUNTIME;
     SAVE MYSQL VARIABLES TO DISK;
   ──────────────────────────────────────────────────────
```

<div class="callout">
  <p><strong>MONITOR-USER REVOCATION: DIAGNOSTIC ORDER</strong></p>
  <ol>
    <li>Check <code>runtime_mysql_servers</code> for SHUNNED backends &mdash; this is the symptom, not the cause.</li>
    <li>Check <code>monitor.mysql_server_connect_log</code> ordered by <code>time_start_us DESC</code>. Look at <code>connect_error</code>. "Access denied for user 'monitor'" on every recent row is the smoking gun.</li>
    <li>Check <code>monitor.mysql_server_ping_log</code> &mdash; the same "Access denied" pattern appears here once existing cached backend connections cycle out.</li>
    <li>Test the monitor user directly from the ProxySQL node: <code>mysql -h &lt;backend&gt; -u monitor -p'&lt;pass&gt;' -e "SHOW REPLICA STATUS\G"</code> &mdash; confirms which specific privilege is missing.</li>
    <li>Restore: <code>GRANT</code> the missing privilege on the MySQL backend, <code>FLUSH PRIVILEGES</code>, and if the password changed on the MySQL side, update <code>mysql-monitor_password</code> in ProxySQL global_variables and <code>LOAD MYSQL VARIABLES TO RUNTIME</code>.</li>
  </ol>
</div>

**What the lab capture shows.** After changing the monitor user's password to an incorrect value on the MySQL backend, `monitor.mysql_server_connect_log` filled with this pattern on the next connect-check cycle:

```sql
-- monitor.mysql_server_connect_log — credential failure in progress
-- connect_interval=60s; errors appear once per cycle on each backend
hostname       port   time_start_us       connect_success_time_us  connect_error
192.168.105.6  25001  1778361407360863    0   Access denied for user 'monitor'@'proxysql-1' (using password: YES)
192.168.105.6  25002  1778361406680516    0   Access denied for user 'monitor'@'proxysql-1' (using password: YES)
192.168.105.6  25003  1778361408042762    0   Access denied for user 'monitor'@'proxysql-1' (using password: YES)
```

All three backends, same error, every connect-check cycle. That pattern — not one backend, not an intermittent error, but every backend on every cycle — points directly at the monitor credentials, not at backend connectivity.

Auth failures don't trigger SHUNNED instantly. The connect check fires every `mysql-monitor_connect_interval` (default 60s), and ProxySQL needs `mysql-monitor_ping_max_failures` consecutive ping failures before it formally SHUNs a backend. What you see first is the connect log filling with "Access denied" entries — one per polling cycle per backend. That window, from first error to formal SHUNNED, is your diagnostic opportunity. The signal is clear and early; the cascade is gradual by design. A credential problem that would cause a full SHUNNED state on all backends gives you several minutes of warning in `mysql_server_connect_log` before client traffic starts seeing widespread errors.

Recovery is equally bounded by the polling cycle. After restoring the correct credentials on the MySQL backend, the connect log showed a clean entry 11 seconds after the `GRANT` was restored — that's wherever in the 60-second polling cycle the next connect check happened to fire. The range is 0 to `mysql-monitor_connect_interval` (60s default); expect recovery on the next monitor poll after the fix is applied.

<div class="post-cta-inline">
  <h4>ProxySQL in production and something doesn't look right?</h4>
  <p>The monitoring layer takes minutes to query and hours to interpret if you don't know what healthy looks like. If you're seeing SHUNNED backends, rising ConnERR, or Aurora detection gaps you can't explain, a 30-minute call usually narrows it to one root cause.</p>
  <a href="/contact/" class="btn">Book Free Assessment &rarr;</a>
</div>

<h2 id="beyond-this-series">What's Not in This Series</h2>

Three topics adjacent to this series are real and important. Each deserves its own treatment.

**Sharding.** ProxySQL supports basic query-level sharding — routing by schema boundary or by a rule that hashes a user ID into a destination hostgroup. For simple cases this works. For production sharding at scale, with consistent cross-shard transactions and managed schema migrations, this is Vitess territory. ProxySQL's sharding support is a routing primitive, not a sharding framework.

**Multi-region Aurora + ProxySQL.** Aurora Global Database places a writer in one region and reader clusters in others, with sub-second replication lag. ProxySQL in front of a Global Database deployment is a different configuration: `mysql_aws_aurora_hostgroups` scoped per-region, topology discovery that stays local while the primary region is healthy, and failover coordination when a secondary region is promoted to writer. This series covers single-region Aurora only.

**PostgreSQL ProxySQL HA.** ProxySQL speaks MySQL wire protocol. For PostgreSQL, the equivalent stack is different: see the [ProxySQL PostgreSQL HA series](/blog/proxysql-postgresql-ha-part1-architecture-replication) which covers the same placement-to-operations arc for PostgreSQL backends.

<h2 id="wrap-up">Across Five Parts</h2>

Across five parts, you've built and operated a production-representative ProxySQL + Aurora MySQL topology: decided where the proxy layer goes and why, wired it to Aurora's native topology discovery, tuned query routing and multiplexing against real workload patterns, tested HA under a live failover with a measured error count, and now have the monitoring queries and runbooks to operate it day-to-day.

Three things adjacent to this series worth exploring from here: the Aurora Performance Insights layer for correlating ProxySQL digest data with query execution inside the database engine itself; the ProxySQL Prometheus exporter for time-series dashboards that alert on `ConnUsed` headroom and detection gaps without manual polling; and slow query log parsing to match ProxySQL's `stats_mysql_query_digest` patterns against Aurora's slow log and identify the same queries from both sides of the proxy.

If you're standing up ProxySQL in front of RDS or Aurora MySQL and want a second pair of eyes before production traffic, <a href="/contact/">book a free assessment</a>.

<!-- Series Nav Bottom -->
<div class="series-nav">
  <h4>Series Complete</h4>
  <ol>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part1-why-and-placement">Part 1: Why and Where to Place It</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part2-aurora-hostgroups">Part 2: Wiring ProxySQL to Aurora MySQL</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part3-query-rules-rw-split">Part 3: Query Routing, Read/Write Split, Multiplexing</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls">Part 4: HA, Failover Patterns, and TLS</a></li>
    <li><span class="current">Part 5: Monitoring, Tuning, and Troubleshooting (You Are Here)</span></li>
  </ol>
</div>
