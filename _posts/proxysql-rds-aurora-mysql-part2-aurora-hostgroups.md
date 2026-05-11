---
title: "ProxySQL in Front of AWS RDS & Aurora MySQL — Part 2: Wiring ProxySQL to Aurora MySQL"
date: 2026-05-11T10:00:00.000Z
author: "Mario"
coverImage: "/images/blog/pmm-cross-account-monitoring-install.jpg"
description: "2 errors in 1,485 queries across a live Aurora failover — a 0.1s window vs. Part 1's 60s baseline. Here's the exact ProxySQL config that produced it."
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
    <li><a href="/blog/proxysql-rds-aurora-mysql-part1-why-and-placement.html">Part 1: Why and Where to Place It</a></li>
    <li><span class="current">Part 2: Wiring ProxySQL to Aurora MySQL (You Are Here)</span></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part3-query-rules-rw-split.html">Part 3: Query Routing, Read/Write Split, Multiplexing</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls.html">Part 4: HA, Failover Patterns, and TLS</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part5-monitoring-tuning-troubleshooting.html">Part 5: Monitoring, Tuning, and Troubleshooting</a></li>
  </ol>
</div>

Two errors in 1,485 queries. Both within a 0.1-second window. Then clean traffic again — and the topology had silently changed underneath. That's the result we recorded running a live failover against a real Aurora MySQL cluster with ProxySQL in front of it. The baseline without ProxySQL, using the Aurora reader endpoint alone: roughly 60 seconds of mixed timeouts, stale reads, and connection pool churn.

[Part 1](/blog/proxysql-rds-aurora-mysql-part1-why-and-placement.html) was architecture — where to place ProxySQL, why you'd bother, how the dedicated cluster pair pattern works. Part 2 is the first set of commands. Everything from Part 1 stays the same: the two-node ProxySQL Cluster on Lima VMs, ProxySQL 2.7.3, the same lab infrastructure. What changes is the backends. We swap the three-node MySQL sandbox for a real Aurora MySQL 3.x cluster, and we configure `mysql_aws_aurora_hostgroups` — the table that replaces `mysql_replication_hostgroups` for Aurora-native topology discovery.

<h2 id="why-aurora-hostgroups">Why mysql_aws_aurora_hostgroups, Not mysql_replication_hostgroups</h2>

Standard replication hostgroups poll `read_only` to determine which backend is the writer. Aurora readers do have `read_only=ON`, so you might expect that mechanism to just work. It mostly does — until it doesn't, and the ways it fails are specific to Aurora's promotion model.

The first failure mode is a race condition during failover. When Aurora promotes a reader to writer, there's a brief window where the promoted instance has `read_only=OFF` (it's the new writer) but the old writer's `read_only=ON` update hasn't fully propagated yet. If ProxySQL polls in that window, it can see two `read_only=OFF` instances simultaneously and flip both into the writer hostgroup — or flip and immediately flip back when the old writer's state catches up. This "flapping" is a documented race condition that `mysql_aws_aurora_hostgroups` avoids by reading `SESSION_ID` rather than `read_only`. We didn't trigger this race in the lab, but avoiding it is precisely why `mysql_aws_aurora_hostgroups` exists in the first place — the table was added to ProxySQL specifically because `read_only` polling can't be made reliable on Aurora's failover model.

The second failure mode is replica lag visibility. Aurora tracks replica lag in `INFORMATION_SCHEMA.REPLICA_HOST_STATUS` as `replica_lag_in_milliseconds`. Standard replication hostgroups read lag from `SHOW SLAVE STATUS` (or `SHOW REPLICA STATUS` on 8.0+), which on Aurora returns data that doesn't reflect Aurora's actual internal replication lag. `mysql_aws_aurora_hostgroups` reads directly from `REPLICA_HOST_STATUS`, so lag values are accurate and can drive the `max_lag_ms` threshold that excludes lagging replicas from the reader hostgroup.

The third failure mode is custom endpoint handling. Aurora custom endpoints — commonly used for analytics replicas — can appear with `is_current=0` in `REPLICA_HOST_STATUS` when they're not receiving writes or are otherwise isolated from the replication stream. `mysql_replication_hostgroups` has no mechanism to filter on that field and will route reads to those instances regardless. `mysql_aws_aurora_hostgroups` accounts for this during discovery.

The mechanism that solves all three is the same: `mysql_aws_aurora_hostgroups` queries `REPLICA_HOST_STATUS` directly, identifies the writer by `SESSION_ID=MASTER_SESSION_ID`, and populates writer and reader hostgroups from that ground truth — not from `read_only`. There's no `read_only` poll, no race window, and no dependency on MySQL replication status tables that Aurora doesn't maintain in the standard way.

Key columns you'll configure in the next section:

- `domain_name` — a suffix that all backends in this cluster share. **Must start with a dot.** ProxySQL enforces this with a CHECK constraint; without the leading dot the INSERT fails.
- `writer_hostgroup` / `reader_hostgroup` — which HG numbers receive the writer and readers after each poll cycle.
- `check_interval_ms` — how often ProxySQL polls `REPLICA_HOST_STATUS` on each backend.
- `writer_is_also_reader` — whether the writer instance also appears in the reader hostgroup. Accepts `0` or `1` only in ProxySQL 2.7.3 — more on this below.
- `max_lag_ms` — replicas lagging beyond this threshold are excluded from the reader hostgroup until lag recovers.

<h2 id="aurora-cluster">The Aurora Cluster We Built</h2>

Smallest viable lab cluster: one writer, one reader, `db.t4g.medium` instances, Aurora MySQL 3.12.0 (MySQL 8.0.44 wire protocol), `us-east-1`. The cluster ran in a default VPC with `--publicly-accessible` set on each instance so the Lima VM host could reach Aurora directly over the host machine's public IP. The security group was locked to that single `/32`. In production, Aurora lives inside a VPC with no public access — this configuration exists only so the Lima VMs could connect without a VPN or bastion.

> **Lab provenance:** Tested live on Aurora MySQL 3.12.0 / MySQL 8.0.44 in us-east-1 on 2026-05-08. Cluster destroyed post-capture. Estimated cost: $0.15.

Two CLI commands provision the cluster, followed by one per instance:

```bash
# -- create-db-cluster
# Note: --publicly-accessible is an instance-level flag for aurora-mysql,
# not a cluster-level flag. Passing it here returns InvalidParameterCombination.
aws rds create-db-cluster \
  --db-cluster-identifier proxysql-aurora-EXAMPLE \
  --engine aurora-mysql \
  --engine-version 8.0.mysql_aurora.3.12.0 \
  --master-username admin \
  --master-user-password "<password>" \
  --db-subnet-group-name <subnet-group> \
  --vpc-security-group-ids <sg-id>

# -- create writer instance (--publicly-accessible goes here, not on create-db-cluster)
aws rds create-db-instance \
  --db-instance-identifier proxysql-aurora-EXAMPLE-writer \
  --db-cluster-identifier proxysql-aurora-EXAMPLE \
  --db-instance-class db.t4g.medium \
  --engine aurora-mysql \
  --publicly-accessible

# -- create reader instance
aws rds create-db-instance \
  --db-instance-identifier proxysql-aurora-EXAMPLE-reader \
  --db-cluster-identifier proxysql-aurora-EXAMPLE \
  --db-instance-class db.t4g.medium \
  --engine aurora-mysql \
  --publicly-accessible
```

Once both instances are available, the topology ProxySQL will discover looks like this:

```
             ┌──────────────────────────────────────┐
             │    proxysql-1 / proxysql-2           │
             │    ProxySQL 2.7.3 Cluster            │
             │    HG 100: writer                    │
             │    HG 101: reader                    │
             └────────────────┬─────────────────────┘
                              │
         domain_name match: .EXAMPLE-SUFFIX.us-east-1.rds.amazonaws.com
         ProxySQL polls REPLICA_HOST_STATUS every check_interval_ms
                              │
          ┌───────────────────▼──────────────────────────────────────┐
          │            Aurora MySQL 3.12.0 Cluster                   │
          │  proxysql-aurora-EXAMPLE.cluster-EXAMPLE-SUFFIX...       │
          ├─────────────────────────┬────────────────────────────────┤
          │ WRITER → HG 100         │ READER → HG 101                │
          │ …-writer.EXAMPLE-SUFFIX │ …-reader.EXAMPLE-SUFFIX        │
          │ SESSION_ID =            │ lag_ms = 0                     │
          │   MASTER_SESSION_ID     │                                │
          └─────────────────────────┴────────────────────────────────┘
```

<h2 id="proxysql-configuration">ProxySQL Configuration: The Actual Table Inserts</h2>

Three tables to configure, in order: `mysql_aws_aurora_hostgroups`, `mysql_servers`, `mysql_users`. Each needs a `LOAD ... TO RUNTIME` and `SAVE ... TO DISK` after its changes. That's the complete wiring.

<h3 id="aurora-hostgroups-insert">Step 1 — mysql_aws_aurora_hostgroups</h3>

```sql
-- mysql_aws_aurora_hostgroups: one row tells ProxySQL how to discover this Aurora cluster
INSERT INTO mysql_aws_aurora_hostgroups (
  writer_hostgroup, reader_hostgroup, active,
  aurora_port, domain_name,
  max_lag_ms, check_interval_ms, check_timeout_ms,
  writer_is_also_reader, new_reader_weight,
  comment
) VALUES (
  100, 101, 1,
  3306, '.EXAMPLE-SUFFIX.us-east-1.rds.amazonaws.com',
  600000, 2000, 800,
  0, 1,
  'part2 Aurora cluster'
);
```

Walking each column:

- `writer_hostgroup=100`, `reader_hostgroup=101` — HG numbers for this Aurora cluster. These must not overlap with the Lima MySQL HGs (10/20) already active in this ProxySQL instance.
- `domain_name='.EXAMPLE-SUFFIX.us-east-1.rds.amazonaws.com'` — the leading dot is not optional. ProxySQL matches this suffix against instance hostnames returned by `REPLICA_HOST_STATUS` to scope discovery to this cluster only. Omit the dot and the INSERT fails with a CHECK constraint violation.
- `check_interval_ms=2000` — ProxySQL polls `REPLICA_HOST_STATUS` on each backend every 2 seconds. The floor on detection latency is Aurora's internal promotion time (typically 6–30 seconds depending on instance class and cross-AZ conditions); `check_interval_ms` adds at most one additional polling cycle on top of that floor. Part 5 covers sizing this for production.
- `check_timeout_ms=800` — a poll that takes longer than 800ms is treated as a connection failure. Must be less than `check_interval_ms`.
- `writer_is_also_reader=0` — writes route to HG 100 only; the writer instance does not appear in HG 101 for reads. In ProxySQL 2.7.3, the only valid values are `0` and `1`. Some older ProxySQL documentation references `2` as a valid setting, but the actual CHECK constraint in 2.7.3 rejects it with a constraint error. We confirmed this in the lab.
- `max_lag_ms=600000` — 10 minutes; effectively no lag filtering for this lab. Part 5 covers production tuning.

<h3 id="seed-server-insert">Step 2 — mysql_servers: The Seed Row</h3>

```sql
-- mysql_servers: insert the cluster writer endpoint as a discovery seed
-- ProxySQL bootstraps from this single row and auto-discovers all instances
INSERT INTO mysql_servers (hostgroup_id, hostname, port, comment)
VALUES (
  100,
  'proxysql-aurora-EXAMPLE.cluster-EXAMPLE-SUFFIX.us-east-1.rds.amazonaws.com',
  3306,
  'Aurora cluster writer endpoint (seed for discovery)'
);
```

One row. The cluster endpoint — not an instance endpoint — in HG 100. Once the `mysql_aws_aurora_hostgroups` row is active and loaded to RUNTIME, ProxySQL polls this seed's `REPLICA_HOST_STATUS` and auto-populates the actual writer and reader instance endpoints. You don't enumerate instances manually. More on what happens next in Section 5.

<h3 id="users-query-rules">Step 3 — mysql_users and mysql_query_rules</h3>

```sql
-- mysql_users: point the app user at HG 100 (writer) by default
-- If the user already exists from a previous lab step, use UPDATE instead of INSERT
-- to avoid a UNIQUE constraint error on (username, frontend)
UPDATE mysql_users SET default_hostgroup=100 WHERE username='app';

-- mysql_query_rules: lower rule_id = higher priority; order matters
-- rule_id 10 must come before 11, or SELECT FOR UPDATE would match ^SELECT first
INSERT INTO mysql_query_rules (rule_id, active, match_pattern, destination_hostgroup, comment)
VALUES
  (10, 1, '^SELECT.*FOR UPDATE$', 100, 'SELECT FOR UPDATE → Aurora writer HG 100'),
  (11, 1, '^SELECT',              101, 'all SELECTs → Aurora reader HG 101');
```

<h3 id="load-save">Step 4 — LOAD TO RUNTIME and SAVE TO DISK</h3>

```sql
-- Promote all four config layers to runtime, then persist
LOAD MYSQL SERVERS TO RUNTIME;     SAVE MYSQL SERVERS TO DISK;
LOAD MYSQL USERS TO RUNTIME;       SAVE MYSQL USERS TO DISK;
LOAD MYSQL QUERY RULES TO RUNTIME; SAVE MYSQL QUERY RULES TO DISK;
LOAD MYSQL VARIABLES TO RUNTIME;   SAVE MYSQL VARIABLES TO DISK;
```

Run these on either ProxySQL node. The ProxySQL Cluster syncs runtime state to the peer within approximately 200ms — you apply once, both nodes converge.

After `LOAD MYSQL SERVERS TO RUNTIME`, the monitor thread begins polling immediately. No restart needed. Give it a few seconds, then check `runtime_mysql_servers`.

<h2 id="auto-discovery">Auto-Discovery in Action</h2>

We inserted one `mysql_servers` row. About 2 seconds after LOAD TO RUNTIME, ProxySQL had finished its first poll cycle and discovered the writer and reader. By the time we captured the snapshot below — about 60 seconds in — the picture had stabilized:

```
-- runtime_mysql_servers on proxysql-1 (~60s after LOAD TO RUNTIME)
hostgroup_id  hostname                                                           port  status  comment
100           proxysql-aurora-EXAMPLE-reader.EXAMPLE-SUFFIX.us-east-1...        3306  ONLINE  (auto-discovered — actual writer)
100           proxysql-aurora-EXAMPLE.cluster-EXAMPLE-SUFFIX.us-east-1...       3306  ONLINE  Aurora cluster writer endpoint (seed for discovery)
101           proxysql-aurora-EXAMPLE-writer.EXAMPLE-SUFFIX.us-east-1...        3306  ONLINE  (auto-discovered — actual reader)
```

ProxySQL adds, it doesn't replace. The cluster endpoint we inserted as a seed stays in HG 100 alongside the auto-discovered writer instance endpoint. In production you'd typically remove the seed once discovery is verified, since the cluster endpoint resolves to the current writer's instance endpoint anyway and the duplicate entry serves no useful purpose. For this lab we left it in place.

To watch the polling live, query the Aurora monitor log — which lives in the `monitor` schema, not in `main` or `stats`:

```sql
-- monitor.mysql_server_aws_aurora_log: 3-row excerpt, DESC by time
-- Correct schema is monitor — not main.mysql_server_aurora_log (that table does not exist in 2.7.3)
SELECT check_utc, hostname, is_writer_per_replica_host_status AS writer_detected, lag_ms
FROM monitor.mysql_server_aws_aurora_log
ORDER BY check_utc DESC
LIMIT 3;
```

```
check_utc               hostname (polled)                                         writer_detected                  lag_ms
2026-05-08 10:52:40     proxysql-aurora-EXAMPLE-writer.EXAMPLE-SUFFIX...          proxysql-aurora-EXAMPLE-reader       0
2026-05-08 10:52:38     proxysql-aurora-EXAMPLE-reader.EXAMPLE-SUFFIX...          proxysql-aurora-EXAMPLE-reader       0
2026-05-08 10:52:37     proxysql-aurora-EXAMPLE-reader.EXAMPLE-SUFFIX...          proxysql-aurora-EXAMPLE-reader       0
```

Every ~2 seconds, ProxySQL polls each backend it knows about. From each backend, it queries `INFORMATION_SCHEMA.REPLICA_HOST_STATUS`. The `writer_detected` column shows the instance whose `SESSION_ID=MASTER_SESSION_ID` — the current writer, as Aurora itself reports it. Notice the row at 10:52:40: ProxySQL polled the instance named "writer", but `REPLICA_HOST_STATUS` said the actual writer was the instance named "reader". Why?

<div class="callout">
  <p><strong>NAMES DON'T MATCH TOPOLOGY — AND THAT'S FINE:</strong> During lab setup, a rename operation with <code>apply-immediately</code> triggered an implicit Aurora failover. The instance we had named "writer" became a reader, and the instance named "reader" became the writer. ProxySQL ignored both instance names entirely. It queried <code>INFORMATION_SCHEMA.REPLICA_HOST_STATUS</code> on each backend and looked for <code>SESSION_ID=MASTER_SESSION_ID</code> — that's the only signal it uses to determine topology. It correctly placed the actual writer in HG&nbsp;100 and the actual reader in HG&nbsp;101, without any reconfiguration. Instance names in the AWS console are labels. Topology lives in <code>REPLICA_HOST_STATUS</code>.</p>
</div>

<div class="post-cta-inline">
  <h4>Wiring ProxySQL to a production Aurora cluster?</h4>
  <p>There are more footguns in this setup than the docs let on &mdash; <code>writer_is_also_reader</code> constraints, <code>domain_name</code> leading-dot rules, query rule ordering when you have both local MySQL and Aurora backends active in the same ProxySQL instance. If you want a second pair of eyes on your configuration before it goes live, book a free assessment call.</p>
  <a href="/contact/" class="btn">Book Free Assessment &rarr;</a>
</div>

<h2 id="rw-split-smoke-test">Read/Write Split Smoke Test</h2>

Before triggering a failover, verify that query rules route correctly. Two checks: 50 SELECTs all land on the reader, and 5 INSERTs all land on the writer.

```bash
# -- 50 SELECTs through proxysql-1:6033 — expect all to hit HG 101 (Aurora reader)
for i in $(seq 1 50); do
  mysql -h 192.168.105.7 -P 6033 -u app -p'<password>' \
    -sN -e 'SELECT @@hostname;'
done | sort | uniq -c
```

```
     50 ip-10-1-X-X
```

All 50 returned the same internal hostname — the reader instance — with zero variance. The `^SELECT` rule (rule_id 11) caught every query and sent it to HG 101.

```bash
# -- 5 INSERTs through proxysql-1:6033 — expect all to hit HG 100 (Aurora writer)
for i in $(seq 1 5); do
  mysql -h 192.168.105.7 -P 6033 -u app -p'<password>' \
    -sN -e "INSERT INTO failover_test (payload, hostname)
            VALUES ('write-test', @@hostname);"
done

# -- verify write routing: read the inserted rows back through the reader path
mysql -h 192.168.105.7 -P 6033 -u app -p'<password>' \
  -e "SELECT payload, hostname, COUNT(*) cnt
      FROM failover_test
      WHERE payload='write-test'
      GROUP BY hostname;"
```

```
payload     hostname         cnt
write-test  ip-10-1-X-XXX      5
```

The INSERT wrote `@@hostname` — the current backend's internal IP — directly into each row. The follow-up SELECT (routed to the reader via the `^SELECT` rule) read those rows back and confirmed: all five writes landed on `ip-10-1-X-XXX`, the writer instance, and replicated to the reader. This pattern — write a value, read it back through the proxy's reader path — verifies routing end-to-end, not just that ProxySQL parsed the query rule correctly. It confirms the write actually reached the writer and that the reader returned the replicated result. Use it whenever you need to validate routing through the full path rather than by inspecting ProxySQL internals alone.

<h2 id="failover-timeline">Failover Under Load: The Timeline</h2>

<h3 id="load-generator-setup">Setup</h3>

A Python script ran 10 SELECTs per second through `proxysql-1:6033`, logging each result with a UTC timestamp. Each SELECT routes to HG 101 (Aurora reader) via the `^SELECT` rule.

```python
#!/usr/bin/env python3
# -- load-generator.py — 10 SELECTs/sec through proxysql-1:6033
import subprocess, time, datetime

LOG = "/tmp/failover-traffic.log"
INTERVAL = 0.1  # 10 requests/sec

with open(LOG, "a") as f:
    while True:
        t = datetime.datetime.utcnow().isoformat(timespec="milliseconds")
        try:
            r = subprocess.run(
                ["mysql", "-h", "192.168.105.7", "-P", "6033",
                 "-u", "app", "-p<password>",
                 "--connect-timeout=3", "-e", "SELECT @@hostname;"],
                capture_output=True, text=True, timeout=5
            )
            status = (r.stdout.strip().split()[-1]
                      if r.returncode == 0
                      else f"ERR:{r.stderr.strip()[:60]}")
        except subprocess.TimeoutExpired:
            status = "TIMEOUT"
        f.write(f"{t} {status}\n")
        f.flush()
        time.sleep(INTERVAL)
```

<h3 id="failover-trigger">Trigger</h3>

One command. T0 is the moment the API call returned:

```bash
# -- trigger Aurora cross-AZ failover — T0 = API accepted
aws rds failover-db-cluster --db-cluster-identifier proxysql-aurora-EXAMPLE
```

<h3 id="failover-events">The Timeline</h3>

```
Marker   Elapsed    Event
------   -------    -----
T0       +0.0s      failover-db-cluster API accepted
—        +9.8s      Aurora: "Started cross AZ failover to proxysql-aurora-EXAMPLE-writer"
T1       +10.2s     First application error (connection timeout at ProxySQL)
T2       +10.3s     Last application error — total error window: 0.1s
T3       +15.3s     Queries resume through ProxySQL (new writer now accepting connections)
—        +18.0s     monitor.mysql_server_aws_aurora_log: first successful poll
                    showing new writer (SESSION_ID=MASTER_SESSION_ID flipped)
T4       +19.1s     runtime_mysql_servers updated — HG 101 now routes to new reader
—        +21.4s     Aurora: "Completed customer initiated failover"
—        +44.0s     Cluster status: available
```

Total application-visible errors: **2**. Both within the same 0.1-second window at T1–T2. The remaining 1,483 queries ran without error.

<h3 id="proxysql-ahead">ProxySQL Ahead of AWS</h3>

<div class="callout">
  <p><strong>PROXYSQL UPDATED BEFORE AURORA DECLARED COMPLETE:</strong> ProxySQL updated its hostgroup topology at T0+19.1s. Aurora declared the failover complete at T0+21.4s. ProxySQL knew the topology had changed 2.3 seconds before Aurora's own completion event arrived. It doesn't wait for AWS &mdash; it reads <code>REPLICA_HOST_STATUS</code> directly, on its own polling schedule, on every cycle regardless of what Aurora's control plane is doing.</p>
</div>

<h3 id="detection-math">What the 6-Second Gap Actually Means</h3>

The monitor log shows exactly what happened between T1 and T3:

```
-- monitor.mysql_server_aws_aurora_log — failover detection window
-- Rows filtered to MASTER_SESSION_ID (writer-identifying polls only)
check_utc               hostname (polled)                                    writer_detected
2026-05-08 10:53:06     proxysql-aurora-EXAMPLE.cluster-EXAMPLE-SUFFIX...   proxysql-aurora-EXAMPLE-reader  ← last pre-failover confirmation
2026-05-08 10:53:10     proxysql-aurora-EXAMPLE-reader.EXAMPLE-SUFFIX...    proxysql-aurora-EXAMPLE-reader  ← last poll before the gap

  [gap: 10:53:10 → 10:53:16]
  [Aurora mid-promotion — backends temporarily unreachable]
  [ProxySQL continued polling on schedule; all attempts failed to connect]

2026-05-08 10:53:16     proxysql-aurora-EXAMPLE-writer.EXAMPLE-SUFFIX...    proxysql-aurora-EXAMPLE-writer  ← new writer detected
```

The 6-second gap between 10:53:10 and 10:53:16 was not ProxySQL skipping polling cycles. ProxySQL was polling on schedule — `check_interval_ms=2000` means it attempted a connection every 2 seconds — but Aurora's backends were temporarily unreachable while the promotion was in progress. The endpoints went dark during the promotion and became reachable again once Aurora finished. ProxySQL detected the topology change on its first successful poll after Aurora's internal promotion completed.

The correct model for detection latency:

```
detection latency = (Aurora internal promotion time)
                  + (at most one check_interval_ms cycle)
```

In this lab: approximately 6 seconds of Aurora internal promotion time, plus up to 2 seconds of polling lag, equals roughly 6–8 seconds from when Aurora initiated the promotion to when ProxySQL first read the new topology successfully. Lowering `check_interval_ms` from 2000ms to 500ms would not have produced 4× faster detection here. It would have shaved at most 1.5 seconds off the lag above the promotion floor. The floor is Aurora's promotion time — that's opaque to ProxySQL and set by instance class, workload, and cross-AZ replication state. Part 5 covers production sizing of `check_interval_ms` with that constraint in mind.

<h3 id="post-failover-state">Post-Failover State</h3>

At T0+44s, `runtime_mysql_servers` on proxysql-1 shows the fully inverted topology:

```
-- runtime_mysql_servers on proxysql-1 (post-failover, T0+44s)
hostgroup_id  hostname                                                          port  status
100           proxysql-aurora-EXAMPLE-writer.EXAMPLE-SUFFIX.us-east-1...        3306  ONLINE  (new writer)
101           proxysql-aurora-EXAMPLE-reader.EXAMPLE-SUFFIX.us-east-1...        3306  ONLINE  (new reader)
101           proxysql-aurora-EXAMPLE.cluster-EXAMPLE-SUFFIX.us-east-1...       3306  ONLINE  (seed — still present)
```

HG 100 now holds the promoted instance. HG 101 holds the demoted instance plus the cluster endpoint seed (which now resolves to the new writer, but is still valid for read traffic in HG 101 since all ONLINE instances in a reader hostgroup are eligible).

<h3 id="baseline-comparison">The 60-Second Baseline Revisited</h3>

Part 1 described roughly 60 seconds of pain using the Aurora reader endpoint alone — stale DNS TTLs, connection pool churn, reads landing on a replica still behind the new writer's binlog position. That figure was conservative for the reader endpoint under realistic production conditions: JVM DNS caching, long keepalive intervals, and a connection pool configured for throughput rather than fast reconnect after a backend change.

What ProxySQL changed: instead of waiting for DNS propagation, ProxySQL polls `REPLICA_HOST_STATUS` directly and reroutes at the TCP connection level. There's no DNS layer between ProxySQL and Aurora's instance endpoints. Application clients connected to `proxysql-1:6033` stayed connected to ProxySQL throughout the failover — they never saw the backend change. The 2 errors we recorded were connection timeouts during the brief promotion window when no backend was reachable. Not stale-read errors, not reconnection storms, not silent misrouting. Two timeouts in a 0.1-second window, then normal operation resumed.

<h2 id="whats-not-here">What's Not in This Part</h2>

This part covers one thing: wiring ProxySQL to Aurora and verifying the configuration survives a live failover. Three topics are deferred by design:

- **Query routing depth** — regex anatomy, rule priority ordering, per-user and per-schema routing, `transaction_persistent` behavior under mixed read/write workloads → [Part 3](/blog/proxysql-rds-aurora-mysql-part3-query-rules-rw-split.html)
- **ProxySQL Cluster sync** — how the two-node pair propagates Aurora hostgroup rules, what syncs automatically at runtime versus what requires manual intervention on new nodes → [Part 4](/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls.html)
- **Monitoring and tuning** — querying `mysql_server_aws_aurora_log` in production, sizing `check_interval_ms` based on observed promotion time, alerting on detection gaps → [Part 5](/blog/proxysql-rds-aurora-mysql-part5-monitoring-tuning-troubleshooting.html)

<h2 id="whats-next">What's Next</h2>

In [Part 3](/blog/proxysql-rds-aurora-mysql-part3-query-rules-rw-split.html), we wire the query routing layer. The cluster is connected and survives a failover — now we make the routing configuration production-grade. That means `mysql_query_rules` in depth: regex ordering, per-user routing, per-schema routing, and `transaction_persistent` behavior under sessions that mix reads and writes. If your ORM doesn't always mark transactions explicitly, Part 3 is where the routing gets genuinely interesting.

<!-- Series Nav Bottom -->
<div class="series-nav">
  <h4>Continue the Series</h4>
  <ol>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part1-why-and-placement.html">Part 1: Why and Where to Place It</a></li>
    <li><span class="current">Part 2: Wiring ProxySQL to Aurora MySQL (You Are Here)</span></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part3-query-rules-rw-split.html">Part 3: Query Routing, Read/Write Split, Multiplexing &rarr;</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls.html">Part 4: HA, Failover Patterns, and TLS</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part5-monitoring-tuning-troubleshooting.html">Part 5: Monitoring, Tuning, and Troubleshooting</a></li>
  </ol>
</div>
