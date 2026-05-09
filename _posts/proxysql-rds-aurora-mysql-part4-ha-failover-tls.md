---
title: "ProxySQL in Front of AWS RDS & Aurora MySQL — Part 4: HA, Failover Patterns, and TLS"
date: 2026-05-12T10:00:00.000Z
author: "Mario"
coverImage: "/images/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls.jpg"
description: "Aurora topology flip: 15s. RDS Multi-AZ failover: 64s. Dual-node ProxySQL cluster sync timings, NLB detection gaps, backend TLS — all measured live on AWS."
categories:
  - mysql
  - aws-rds
  - high-availability
read_time: 19
featured: true
---

<!-- Series Navigation -->
<div class="series-nav">
  <h4>ProxySQL in Front of AWS RDS &amp; Aurora MySQL &mdash; 5-Part Series</h4>
  <ol>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part1-why-and-placement">Part 1: Why and Where to Place It</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part2-aurora-hostgroups">Part 2: Wiring ProxySQL to Aurora MySQL</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part3-query-rules-rw-split">Part 3: Query Routing, Read/Write Split, Multiplexing</a></li>
    <li><span class="current">Part 4: HA, Failover Patterns, and TLS (You Are Here)</span></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part5-monitoring-tuning-troubleshooting">Part 5: Monitoring, Tuning, and Troubleshooting</a></li>
  </ol>
</div>

Two API calls, same region, same lab session. Aurora writer failover: ProxySQL marked the writer SHUNNED at T0+8.7 seconds. Topology fully inverted at T0+15 seconds. Three errors across 2,020 queries through two ProxySQL nodes — the same order of magnitude as [Part 2](/blog/proxysql-rds-aurora-mysql-part2-aurora-hostgroups)'s 2-in-1,485 result from a single node. RDS Multi-AZ failover: 64 seconds from the same API trigger to AWS "completed." No ProxySQL topology change required, because there's no topology to change — the standby isn't readable, and the endpoint is DNS-based.

The 4× gap between 15 seconds and 64 seconds isn't a sizing difference or an artifact of how the failover was triggered. It's structural. Aurora's ProxySQL integration reads `INFORMATION_SCHEMA.REPLICA_HOST_STATUS` directly, on its own polling schedule, independent of the AWS control plane. RDS Multi-AZ failover goes through DNS — and DNS propagation through resolver caches takes as long as it takes, regardless of what ProxySQL is doing.

Parts 1–3 built to this point: the placement decision, the Aurora wiring, and the query routing layer. This part is where the HA system is tested under pressure. ProxySQL Cluster sync timing and footguns, NLB health check reality versus the theoretical window, Aurora dual-node failover, RDS Multi-AZ as the baseline comparison, backend TLS with a footgun hiding in auto-discovery, and query mirroring's measured latency impact. Everything here comes from a live AWS lab session.

> **Lab provenance:** Tested live on Aurora MySQL 3.12.0 / MySQL 8.0.44 and RDS MySQL 8.0.x (Multi-AZ), ProxySQL 2.7.3 in us-east-1 on 2026-05-09. All AWS resources destroyed post-capture. Estimated cost: ~$0.65.

<h2 id="cluster-sync">ProxySQL Cluster Sync: Timings, Footguns, and Limits</h2>

The ProxySQL Cluster propagates configuration automatically between peers — it's the mechanism that lets you apply a query rule change to one node and have it arrive on the other without a manual push. But the sync model has specific failure modes under fresh nodes and concurrent edits that are worth understanding before you rely on it during an incident.

<h3 id="sync-timings">What Syncs and How Fast</h3>

Three variables control sync cadence: `admin-cluster_check_interval_ms` sets how often each node polls its peers for config checksums; `admin-cluster_mysql_query_rules_diffs_before_sync` (and the equivalent for `mysql_servers`, `mysql_users`, and `global_variables`) sets how many consecutive checksum differences must be detected before sync fires. With `check_interval_ms=200` and `diffs_before_sync=3`, the minimum propagation window is 3 × 200ms = 600ms.

Lab measurements, inserting a new query rule on proxysql-1 and polling proxysql-2 for arrival:

<table>
  <thead>
    <tr><th>Config type</th><th>Measured latency</th><th>Notes</th></tr>
  </thead>
  <tbody>
    <tr><td><code>mysql_query_rules</code></td><td>614ms</td><td></td></tr>
    <tr><td><code>mysql_servers</code></td><td>620ms</td><td></td></tr>
    <tr><td>global variable (<code>mysql-monitor_ping_interval</code>)</td><td>597ms</td><td></td></tr>
    <tr><td><code>mysql_users</code></td><td>~600ms</td><td>see note</td></tr>
  </tbody>
</table>

The `mysql_users` row warrants a note. `runtime_mysql_users` stores every user twice — one frontend row (for client authentication against ProxySQL) and one backend row (for ProxySQL's own authentication against MySQL backends). A correctness check expecting `COUNT(*)=1` after sync would always fail, because the synced state is `COUNT(*)=2`. That's the correct count, not a sync failure. Verify sync by comparing the count on the peer against the count on the source node — they should match.

Disk persistence works per-node. Each node writes its runtime state to its own sqlite3 database when `SAVE ... TO DISK` is called. Cluster sync operates at the runtime layer only — it doesn't sync disk state between nodes. If proxysql-2's sqlite3 is wiped and proxysql-2 restarts, it comes back with an empty config regardless of what proxysql-1's disk contains.

<h3 id="bootstrap-footgun">The Bootstrap Footgun: algorithm=1 Skips Fresh Nodes</h3>

`admin-cluster_mysql_servers_sync_algorithm=1` is the right setting for steady-state operation. It propagates only deltas — the diff between the current table state and the last state recorded from each peer. Efficient, low-overhead, and correct under normal conditions.

The failure mode is specific: a fresh node that has never seen any state has no baseline. There are no deltas to compute against nothing. The sync mechanism produces nothing, and the fresh node stays empty indefinitely.

Lab result: wiped proxysql-2's sqlite3 while keeping `proxysql_servers` intact so the cluster could still communicate. With algorithm=1, `mysql_query_rules` synced at 592ms — the cluster had tracked that table across prior sessions and had a baseline to diff against. `mysql_servers` never arrived on proxysql-2, even after 60+ seconds of polling. ProxySQL's diff engine had no previous state to compare against for `mysql_servers` on the fresh node, so it computed no changes and pushed nothing.

Fix: set `admin-cluster_mysql_servers_sync_algorithm=0` on both nodes and reload. Full-pull mode disregards the diff baseline and copies the complete table from the peer with the highest epoch. Proxysql-2 had a populated `mysql_servers` within 3 seconds. Once you verify `runtime_mysql_servers` is correct on the bootstrapped node, restore algorithm=1.

```sql
-- Tested: ProxySQL 2.7.3, Lima VMs, 2026-05-09
-- Temporary fix for bootstrapping a fresh or wiped node
SET admin-cluster_mysql_servers_sync_algorithm=0;
LOAD ADMIN VARIABLES TO RUNTIME;

-- After confirming the fresh node has synced (check runtime_mysql_servers):
SET admin-cluster_mysql_servers_sync_algorithm=1;
LOAD ADMIN VARIABLES TO RUNTIME;
SAVE ADMIN VARIABLES TO DISK;
```

**algorithm=0 for initial bootstrap; algorithm=1 for steady-state.** Not both at once, not neither.

<h3 id="conflict-resolution">Concurrent Writes Don't Converge Cleanly</h3>

The cluster's conflict resolution model is last-epoch-wins: each config change increments the epoch counter on the node that made it, and peers adopt the config from whichever peer reports the highest epoch. For changes separated in time — the normal case — this works without issue.

What happens when two changes hit different nodes within the same check_interval window? Lab result: changed the same query rule row simultaneously on proxysql-1 (destination_hostgroup=10 at T0+50ms) and proxysql-2 (destination_hostgroup=20 at T0+102ms). Both changes fell inside a single 200ms polling cycle. After 5 seconds, neither node had adopted the other's value. Config checksums had diverged and stayed diverged — proxysql-1 at 0x82176C666CE36C22, proxysql-2 at 0x23250DE02EC63EED.

The root issue: when both nodes increment their epochs within the same check cycle, neither sees the other as definitively higher before committing its own change. The split-brain persisted well past the "a few hundred milliseconds" convergence that the docs describe for normal propagation.

The operational fix is architectural, not a tuning parameter. Pick one ProxySQL node as the exclusive target for all config changes. Apply changes there, let cluster sync carry them to the peer, and confirm arrival before proceeding. Never write conflicting changes to both nodes simultaneously and rely on sync to reconcile the result.

<h2 id="nlb-health-checks">NLB Health Checks: Why Your Runbook Says 90 Seconds But Should Say 110</h2>

An NLB in front of the ProxySQL pair routes around a failed node once its health checks reach the `unhealthy_threshold`. Standard configuration for this topology: TCP target group on port 6033, `unhealthy_threshold=3`, `interval=30s`. The theoretical detection window: 3 × 30s = 90 seconds.

The measured result was 110 seconds. The extra 20 seconds isn't NLB slowness — it's EC2 shutdown time. When an EC2 instance stops, there's a graceful shutdown sequence before the OS releases the network stack and the TCP port becomes unreachable. The NLB's health check timer starts only once connections are actively refused — it can't detect "instance is shutting down," only "TCP connection failed." The additional 20-second gap between "shutdown initiated" and "connections refused" doesn't shorten regardless of how you tune the health check thresholds.

Budget 110–120 seconds in your runbooks and alert thresholds, not 90. If your application has connect timeouts shorter than the actual detection window, you'll see errors before the NLB reroutes. If they're longer, the reroute happens first and the error disappears silently. The 110-second real-world number is the right one to design against.

Once the NLB marks a target unhealthy, all new TCP connections route to the surviving ProxySQL node. That node needs no configuration change — it already holds its share of backend connections and continues routing normally. Applications using connection pools with retry logic reconnect within one cycle. The surviving node handles the increased load without any config intervention.

<h2 id="aurora-failover">Aurora Dual-Node Failover: 4&times; Faster Than RDS Multi-AZ</h2>

<table>
  <thead>
    <tr>
      <th>Scenario</th>
      <th>ProxySQL detection</th>
      <th>Full resolution</th>
      <th>AWS &ldquo;completed&rdquo; event</th>
      <th>Traffic errors</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Aurora + dual ProxySQL</td>
      <td>T0+8.7s (SHUNNED)</td>
      <td>T0+15s (topology flip)</td>
      <td>T0+22s</td>
      <td>~3&nbsp;/&nbsp;2,020 queries</td>
    </tr>
    <tr>
      <td>RDS Multi-AZ (single ProxySQL HG)</td>
      <td>n/a &mdash; DNS-based</td>
      <td>T0+64s</td>
      <td>T0+64s</td>
      <td>not captured <sup>&dagger;</sup></td>
    </tr>
  </tbody>
</table>

<p><small><sup>&dagger;</sup> AWS event timestamps drive the RDS comparison. Per-second client error counts for the RDS leg require manual inspection of the raw traffic log &mdash; the automated analysis script did not extract them. The 64-second figure comes directly from AWS event timestamps and is the reliable number.</small></p>

Aurora resolves approximately 4× faster — 15 seconds versus 64 seconds — and without touching DNS. ProxySQL reads `INFORMATION_SCHEMA.REPLICA_HOST_STATUS` directly and reroutes at the TCP connection level. There's no resolver cache between ProxySQL and the Aurora instance endpoints.

<h3 id="aurora-config">Aurora ProxySQL Configuration for Dual Nodes</h3>

The `mysql_aws_aurora_hostgroups` configuration adds a dedicated HG pair (200/201) for Aurora alongside the existing Lima MySQL hostgroups (HG 10/20). The key values and their constraints:

```sql
-- Tested: ProxySQL 2.7.3, Aurora MySQL 3.12.0 / MySQL 8.0.44, us-east-1, 2026-05-09
INSERT INTO mysql_aws_aurora_hostgroups (
  writer_hostgroup, reader_hostgroup, active,
  aurora_port, domain_name,
  max_lag_ms, check_interval_ms, check_timeout_ms,
  writer_is_also_reader, new_reader_weight,
  comment
) VALUES (
  200, 201, 1,
  3306, '.CLUSTER-EXAMPLE.us-east-1.rds.amazonaws.com',
  60000, 5000, 3000,
  1, 100,
  'part4-aurora'
);
```

Two values are worth flagging from experience. `check_timeout_ms=3000` is the enforced upper bound — ProxySQL 2.7.3 has a CHECK constraint requiring `80 <= check_timeout_ms <= 3000`. Exceeding it produces a silent failure: the INSERT returns success but the row isn't accepted and the Aurora monitor thread never starts. If discovery isn't happening, verify your `check_timeout_ms` first. Second: `domain_name` must start with a dot (`.CLUSTER-EXAMPLE...`, not `CLUSTER-EXAMPLE...`). The same constraint enforces this; INSERT without the leading dot fails with a constraint error.

After `LOAD MYSQL SERVERS TO RUNTIME`, the monitor thread polls the seed endpoint and auto-discovers the writer and reader within two polling cycles:

```
-- runtime_mysql_servers on proxysql-1 (~10s after LOAD TO RUNTIME)
hostgroup_id  hostname                                              port  status
200           reliadb-blog-part4-aurora-writer.CLUSTER-EXAMPLE...  3306  ONLINE
200           reliadb-blog-part4-aurora.cluster-CLUSTER-EXAMPLE... 3306  ONLINE  ← seed
201           reliadb-blog-part4-aurora-reader.CLUSTER-EXAMPLE...  3306  ONLINE
```

Both proxysql-1 and proxysql-2 show identical topology within seconds of configuration. The reason isn't what you might expect.

<div class="callout">
  <p><strong>CLUSTER SYNC ISN'T WHAT MAKES BOTH NODES CONVERGE.</strong> Both ProxySQL nodes reached identical Aurora topology at T0+15s. That looks like cluster sync working. It isn't. Each ProxySQL node runs its own independent Aurora monitor thread that queries <code>INFORMATION_SCHEMA.REPLICA_HOST_STATUS</code> on its own polling schedule. Both threads read the same Aurora metadata &mdash; the same <code>SESSION_ID=MASTER_SESSION_ID</code> flip &mdash; and independently update their own <code>runtime_mysql_servers</code>. No config change was propagated between nodes during the failover. The convergence is emergent from two monitors reading the same source of truth, not from ProxySQL cluster propagation.</p>
  <p>This matters in production: Aurora topology detection works correctly even when cluster sync is degraded or lagging behind. The Aurora monitor subsystem and the ProxySQL Cluster sync subsystem are orthogonal &mdash; they share no state and don't depend on each other. Design your monitoring with that distinction in mind.</p>
</div>

<h3 id="failover-timeline">The Failover Timeline</h3>

Triggered with a single AWS CLI command. T0 is the moment the API accepted the request:

```bash
# -- Trigger Aurora cross-AZ failover -- T0 = API accepted (15:32:07 CEST)
aws rds failover-db-cluster --db-cluster-identifier reliadb-blog-part4-aurora
```

```
Marker   Elapsed   Event
------   -------   -----
T0       +0.0s     failover-db-cluster API accepted
         +3.1s     Aurora: "Started cross AZ failover to aurora-reader"
         +8.7s     Writer endpoints SHUNNED on both proxysql-1 and proxysql-2
         +15.0s    Topology flip: aurora-reader → HG 200 ONLINE, old writer → HG 201
         +22.2s    Aurora: "Completed customer initiated failover to aurora-reader"
```

Two milestones, not one. ProxySQL marked the old writer SHUNNED at T0+8.7s — it knew the writer was unreachable. The full topology flip — old writer demoted to HG 201, new writer promoted to HG 200 — landed at T0+15s, on the next successful poll of `REPLICA_HOST_STATUS` after Aurora completed the internal promotion. SHUNNED means "I can't reach this backend right now." The topology flip means "I've confirmed, from Aurora's own metadata, who the new writer is." The gap between them is Aurora's internal promotion time — the same floor discussed in [Part 2's detection math section](/blog/proxysql-rds-aurora-mysql-part2-aurora-hostgroups#detection-math). ProxySQL was polling on schedule throughout; the backends were simply unreachable while Aurora was mid-promotion.

The SHUNNED state explains why errors appeared at ~T0+6s, before SHUNNED was recorded at T0+8.7s. ProxySQL routes a query to a backend before detecting its failure — the SHUNNED state is set after a health check fails, not preemptively. Queries that attempted new handshakes in the window between when the writer became unreachable and when ProxySQL formally recorded it got the handshake failure directly.

<h3 id="traffic">Three Errors Across 2,020 Queries</h3>

Two load generators ran simultaneously — one through proxysql-1:6033, one through proxysql-2:6033 — at 5 SELECTs/second each throughout the failover window.

Proxysql-1: 1 error. Proxysql-2: 2 errors. All three were `ERROR 2013 (HY000): Lost connection to server at 'handshake: reading initial communication packet'` — new connection attempts during the SHUNNED window that hit an Aurora backend mid-promotion. Queries running on existing multiplexed backend connections continued without error. ProxySQL's connection multiplexing kept those backend connections alive through the SHUNNED window; only new handshakes failed.

The comparison to Part 2: that run used a single ProxySQL node and recorded 2 errors in 1,485 queries (~0.13% error rate). This run used two nodes and recorded ~3 errors across 2,020 queries (~0.15% error rate). Adding a second ProxySQL node didn't change the error ratio in any meaningful way. The bottleneck isn't the proxy layer — it's Aurora's internal promotion window, which is identical regardless of how many ProxySQL nodes are in front of it.

<h3 id="rds-multiaz">RDS Multi-AZ: The 64-Second Baseline</h3>

The RDS Multi-AZ configuration in ProxySQL is simpler than Aurora's: one hostgroup (HG 300), one server row, no topology discovery table. The endpoint DNS is the failover mechanism — after the standby promotes, the same DNS name resolves to the new primary. ProxySQL doesn't need to change anything.

```sql
-- HG 300 for RDS Multi-AZ — single endpoint, no topology discovery needed
INSERT INTO mysql_servers (hostgroup_id, hostname, port, comment)
VALUES (
  300,
  'reliadb-blog-part4-rds-multiaz.CLUSTER-EXAMPLE.us-east-1.rds.amazonaws.com',
  3306,
  'rds-multiaz'
);
LOAD MYSQL SERVERS TO RUNTIME; SAVE MYSQL SERVERS TO DISK;
```

Failover triggered via `reboot-db-instance --force-failover`. T0 is the moment the API accepted:

```
Marker   Elapsed   Event
------   -------   -----
T0       +0s       reboot-db-instance --force-failover (15:37:16 CEST)
         +10s      AWS: "Multi-AZ failover started"
         +25s      AWS: "DB instance restarted"
         +64s      AWS: "Multi-AZ instance failover completed"
```

Post-failover, `runtime_mysql_servers` shows HG 300 ONLINE again with the same hostname and port. From ProxySQL's perspective, the backend went unavailable and came back. No hostgroup changes, no topology flip, no epoch updates required.

Two limitations worth naming explicitly. First, the standby isn't readable during normal operation. You pay for a full second instance — same CPU, memory, and storage class — and receive zero read capacity in return. ProxySQL can distribute reads across Aurora reader instances; it can't read from an RDS Multi-AZ standby because Aurora's architecture makes it deliberately inaccessible. Second, the 64-second resolution window goes through DNS — ProxySQL isn't aware of the topology change until the DNS TTL expires and the endpoint resolves to the new primary. The 4× failover gap and the zero read capacity are the two concrete reasons to prefer Aurora when active read scaling and fast application-visible failover both matter.

<h2 id="tls-backend">TLS on ProxySQL-to-Aurora Backend Connections</h2>

<h3 id="aurora-tls-defaults">What Aurora MySQL Actually Enforces</h3>

Aurora MySQL 3 supports TLS and most clients negotiate it automatically — the default cipher from the Lima VMs was TLSv1.3 / TLS_AES_256_GCM_SHA384. But "supports by default" is not "enforces by default." In this lab cluster, `require_secure_transport=OFF` is the factory setting, and a connection opened with `--ssl-mode=DISABLED` succeeded with an empty `Ssl_cipher`. Enforcement requires `require_secure_transport=ON` set explicitly at the cluster parameter group level. Don't assume Aurora encrypts backend connections without checking the parameter group.

<h3 id="proxysql-tls-config">Configuring ProxySQL for Backend TLS</h3>

Two ProxySQL settings control proxy-to-server TLS. `mysql-have_ssl=true` enables TLS capability on backend connections where TLS can be negotiated. `mysql-ssl_p2s_ca` provides the CA bundle ProxySQL uses to verify the server certificate. Together they give you encrypted, certificate-verified backend connections.

Aurora provides a CA bundle containing all AWS certificate authorities. Download it and copy it to the ProxySQL VM:

```bash
# Download the AWS RDS global CA bundle (162KB, 108 CAs as of May 2026)
curl -o /tmp/aurora-global-bundle.pem \
  https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

sudo mkdir -p /etc/proxysql/certs
sudo cp /tmp/aurora-global-bundle.pem /etc/proxysql/certs/
```

```sql
-- Configure backend TLS on proxysql-1 (cluster sync carries it to proxysql-2)
SET mysql-have_ssl=true;
SET mysql-ssl_p2s_ca='/etc/proxysql/certs/aurora-global-bundle.pem';
LOAD MYSQL VARIABLES TO RUNTIME;
SAVE MYSQL VARIABLES TO DISK;
```

Per-server TLS is also controlled by `use_ssl` in `mysql_servers`: setting `use_ssl=1` on a row tells ProxySQL to use TLS for that specific backend. The interaction with Aurora's auto-discovery is where it gets complicated — and where the footgun lives.

<h3 id="verify-ca">Certificate Verification Behavior</h3>

Direct-connection tests to Aurora to verify behavior before relying on ProxySQL config:

<table>
  <thead>
    <tr><th>Test</th><th><code>ssl-mode</code> flag</th><th>CA bundle</th><th>Result</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Default TLS</td>
      <td><em>none</em></td>
      <td><em>none</em></td>
      <td>TLSv1.3 / TLS_AES_256_GCM_SHA384</td>
    </tr>
    <tr>
      <td>TLS disabled</td>
      <td><code>--ssl-mode=DISABLED</code></td>
      <td><em>none</em></td>
      <td>Accepted — <code>Ssl_cipher</code> empty</td>
    </tr>
    <tr>
      <td>VERIFY_CA — correct bundle</td>
      <td><code>--ssl-mode=VERIFY_CA</code></td>
      <td><code>aurora-global-bundle.pem</code></td>
      <td>SUCCESS — TLSv1.3</td>
    </tr>
    <tr>
      <td>VERIFY_CA — wrong CA</td>
      <td><code>--ssl-mode=VERIFY_CA</code></td>
      <td>system CAs (no AWS roots)</td>
      <td>ERROR 2026: certificate verify failed</td>
    </tr>
  </tbody>
</table>

<div class="callout-warning">
  <p><strong>AUTO-DISCOVERY DEFEATS PER-SERVER TLS SETTINGS &mdash; VERIFY IN runtime_mysql_servers.</strong> When <code>mysql_aws_aurora_hostgroups</code> is active, the Aurora monitor thread populates <code>runtime_mysql_servers</code> with rows for every discovered endpoint. Those auto-discovered rows are created with <code>use_ssl=0</code>, regardless of any <code>use_ssl=1</code> you set in <code>mysql_servers</code> for manually-inserted entries.</p>
  <p>Lab evidence: after <code>UPDATE mysql_servers SET use_ssl=1 WHERE hostgroup_id IN (200,201); LOAD MYSQL SERVERS TO RUNTIME;</code>, the static cluster endpoint seed kept <code>use_ssl=1</code> in the runtime table. The auto-discovered reader and writer endpoints appeared with <code>use_ssl=0</code>. The Aurora monitor thread owns those rows and resets them on each discovery cycle.</p>
  <p>The reliable enforcement path is <code>mysql-have_ssl=true</code> combined with <code>mysql-ssl_p2s_ca</code>. These are global defaults that apply to all backend connections capable of negotiating TLS, including auto-discovered endpoints. Per-server <code>use_ssl</code> is not the enforcement mechanism when Aurora auto-discovery is active. After any Aurora configuration change, verify with:</p>
<pre><code>SELECT hostgroup_id, hostname, port, use_ssl
FROM runtime_mysql_servers
WHERE hostgroup_id IN (200, 201)
ORDER BY hostgroup_id, hostname;</code></pre>
  <p>A row showing <code>use_ssl=0</code> on an auto-discovered endpoint isn't unencrypted if <code>mysql-have_ssl=true</code> is set &mdash; it means TLS is negotiated via the global setting, not the per-server flag. But if <code>mysql-have_ssl</code> is false or unset, that same row is sending plaintext and won't tell you.</p>
</div>

<div class="post-cta-inline">
  <h4>Running Aurora MySQL behind ProxySQL in production?</h4>
  <p>The TLS footgun in auto-discovery is one of several configuration details that fail silently without surfacing an error. If you want a second pair of eyes on your ProxySQL configuration before it handles production Aurora failovers, book a free assessment call.</p>
  <a href="/contact/" class="btn">Book Free Assessment &rarr;</a>
</div>

<h2 id="query-mirroring">Query Mirroring: No Measurable Impact on the Primary Path</h2>

Query mirroring in ProxySQL routes each matched query to a secondary hostgroup simultaneously — fire-and-forget, results discarded, the calling application never knows. The `mirror_hostgroup` column in `mysql_query_rules` activates it per rule. This section is the latency measurement.

100 queries with mirroring active to a secondary hostgroup: 3,907ms total / 39ms average. 100 queries without mirroring: 4,081ms total / 40ms average. Delta: −174ms total, −1ms per query — within measurement noise and not a meaningful latency penalty.

ProxySQL sends mirrored queries from a separate goroutine. The primary query's result is returned to the client immediately; the mirror is dispatched independently with no serialization point on the primary path. If the mirror hostgroup is unavailable, the primary path is unaffected. Enabling mirroring to a staging Aurora cluster or a new version under evaluation doesn't require a performance conversation with your application team. The only cost is backend resources on the mirror target itself.

<h2 id="whats-not-here">What's Not in This Part</h2>

Three topics are deferred to Part 5 by design:

- **Production monitoring** — querying `stats_mysql_query_digest` for latency baselines, alerting on Aurora detection gaps via `mysql_server_aws_aurora_log`, and dashboards for connection pool headroom &rarr; [Part 5](/blog/proxysql-rds-aurora-mysql-part5-monitoring-tuning-troubleshooting)
- **`check_interval_ms` production sizing** — this part used `check_interval_ms=5000`; Part 5 covers sizing it based on observed Aurora promotion time from your own event history &rarr; [Part 5](/blog/proxysql-rds-aurora-mysql-part5-monitoring-tuning-troubleshooting)
- **Rolling upgrade runbook** — how to upgrade the ProxySQL binary on one node without taking the proxy layer offline, including NLB drain sequencing &rarr; [Part 5](/blog/proxysql-rds-aurora-mysql-part5-monitoring-tuning-troubleshooting)

<h2 id="whats-next">What's Next</h2>

In [Part 5](/blog/proxysql-rds-aurora-mysql-part5-monitoring-tuning-troubleshooting), the system from Parts 1–4 is running and has been through a failover. Part 5 is about knowing it's healthy: `stats_mysql_query_digest` for query latency baselining, `mysql_server_aws_aurora_log` for Aurora detection gap alerting, `max_lag_ms` tuning for excluding lagging readers under replication pressure, the rolling ProxySQL upgrade sequence, and the production-sizing decisions for `check_interval_ms` and multiplexing variables that weren't worth making until the system had been under load.

<!-- Series Nav Bottom -->
<div class="series-nav">
  <h4>Continue the Series</h4>
  <ol>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part1-why-and-placement">Part 1: Why and Where to Place It</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part2-aurora-hostgroups">Part 2: Wiring ProxySQL to Aurora MySQL</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part3-query-rules-rw-split">Part 3: Query Routing, Read/Write Split, Multiplexing</a></li>
    <li><span class="current">Part 4: HA, Failover Patterns, and TLS (You Are Here)</span></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part5-monitoring-tuning-troubleshooting">Part 5: Monitoring, Tuning, and Troubleshooting &rarr;</a></li>
  </ol>
</div>
