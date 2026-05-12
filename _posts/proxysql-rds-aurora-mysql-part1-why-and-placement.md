---
title: "ProxySQL in Front of AWS RDS & Aurora MySQL — Part 1: Why and Where to Place It"
date: 2026-05-11T10:00:00.000Z
author: "Mario"
coverImage: "/images/blog/proxysql-postgresql-ha-architecture.jpg"
description: "Why put ProxySQL in front of RDS or Aurora MySQL? Placement trade-offs, alternatives comparison, and the lab topology that carries through this 5-part series."
categories:
  - mysql
  - aws-rds
  - high-availability
read_time: 18
featured: true
---

<!-- Series Navigation -->
<div class="series-nav">
  <h4>ProxySQL in Front of AWS RDS &amp; Aurora MySQL &mdash; 5-Part Series</h4>
  <ol>
    <li><span class="current">Part 1: Why and Where to Place It (You Are Here)</span></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part2-aurora-hostgroups.html">Part 2: Wiring ProxySQL to Aurora MySQL</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part3-query-rules-rw-split.html">Part 3: Query Routing, Read/Write Split, Multiplexing</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls.html">Part 4: HA, Failover Patterns, and TLS</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part5-monitoring-tuning-troubleshooting.html">Part 5: Monitoring, Tuning, and Troubleshooting</a></li>
  </ol>
</div>

At 14:32 on a Tuesday, a writer failover hit an Aurora MySQL cluster in production. Aurora did its job: within about 30 seconds, a reader had been promoted, the cluster endpoint had been updated, and replication was running in reverse. From the database's perspective, the failover was clean.

From the application's perspective, it was messy. The reader endpoint kept serving connections — sort of. For roughly 60 seconds, a portion of connections returned `ETIMEDOUT`, others silently fetched data from a replica that was still several seconds behind the new writer, and the connection pool on the now-promoted writer climbed past 900 as every idle connection in every app tier tried to reconnect simultaneously. No data was lost. The failover was technically successful. But that 60-second window caused real downstream pain: cache misses, stale reads that bypassed business-logic checks, and an alert storm that took another 20 minutes to quiet.

AWS managed MySQL is genuinely excellent at operating a database. It handles patching, replication, storage scaling, and failover without you touching the binaries. What it does not do — and was never designed to do — is solve the proxy layer. That problem is still yours.

This five-part series is about exactly that problem: deploying ProxySQL in front of RDS and Aurora MySQL, from the first architectural decision all the way to operating it in production. Part 1 is conceptual. It covers the why, the where, and the decision framework. No shell commands here — those start in Part 2.

<div class="callout">
  <p><strong>WHAT YOU'LL BUILD:</strong> A production-representative ProxySQL topology sitting in front of Aurora MySQL &mdash; connection multiplexing, read/write splitting with query-level rules, a ProxySQL Cluster for config HA, and Aurora-native topology discovery. The same lab topology runs unchanged across all five parts so you can follow each step end-to-end.</p>
</div>

<h2 id="endpoint-limitations">The Problem with RDS and Aurora Endpoints Alone</h2>

Before reaching for any proxy, it's worth naming the specific problems you're trying to solve. RDS and Aurora expose several endpoint types — cluster endpoint, reader endpoint, instance endpoints — and they cover a lot of ground. But each has a hard limit that surfaces when your workload grows or your topology changes under pressure.

<h3 id="aurora-reader-endpoint">The Aurora Reader Endpoint and Its Limits</h3>

The reader endpoint distributes connections across all reader instances in the cluster via DNS-based round-robin. It works, and for many workloads it's entirely sufficient. The limits emerge when you need more than "roughly even distribution."

The first limit is routing intelligence: it has none. The reader endpoint routes TCP connections, not SQL. It doesn't know what query is being sent. You can't direct long-running analytics queries to a larger reader instance while keeping the smaller one for OLTP reads. Every connection gets identical treatment regardless of what it does next.

The second limit is failover behavior. When Aurora promotes a reader to writer, the cluster endpoint updates within seconds. The reader endpoint takes longer to settle because it reflects the current set of available readers, and clients that already have a DNS answer are holding a cached TTL. Depending on your connection pool's DNS TTL handling and JVM settings, reads can land on the old writer — now a reader — or on replicas that haven't fully caught up to the new writer's binlog position yet. Two consecutive reads in the same application session can hit different replicas with different replication lag, which produces read-your-own-writes violations that are difficult to reproduce and infuriating to debug in production.

<h3 id="rds-multiaz">RDS Multi-AZ: HA You Can't Read From</h3>

RDS Multi-AZ keeps a synchronous standby in a separate Availability Zone. That standby absorbs the failover cleanly — RDS flips the CNAME, the old primary becomes the new standby, and writes resume. It's a solid HA story.

The limitation is that the standby is not readable. You pay for a full second instance — same CPU, same memory, same storage class — and get exactly zero read capacity in return. All read traffic still runs through the primary. If your goal is to distribute read load, Multi-AZ does nothing for you.

The failover experience also has a rough edge. The DNS flip typically takes 60–120 seconds to propagate through resolver caches. During that window, apps that don't aggressively detect dead connections will queue or block against the old endpoint. Connection pools configured with long keepalive intervals or no TCP keepalive will sit on dead sockets without noticing. And there's no graceful drain — in-flight transactions die the moment the standby promotes. Any retry logic is entirely on the application side.

<h3 id="connection-limits">The Connection Multiplexing Gap</h3>

Every client connection to RDS or Aurora is a real MySQL thread on the backend server. There's no pooling at the managed endpoint layer. A single connection pool with 500 connections means 500 threads on the writer, each holding allocated memory, regardless of whether any of them are actively executing a query at that moment.

This matters at steady state, but it bites hardest during recovery. After a failover, all connections across all your app tiers try to reconnect at roughly the same moment — the thundering herd. Aurora's `max_connections` is derived from the instance class: a `db.r6g.large` supports around 1,000 connections. Three app tiers with 200 connections each, plus monitoring tools and any administrative overhead, and you're approaching that ceiling before the reconnect storm hits. The instinctive response — upsize the instance — is expensive and doesn't change the underlying reconnect pattern.

<h3 id="no-query-intelligence">No Query-Level Intelligence at the Endpoint Layer</h3>

The RDS and Aurora endpoint layer is connection-aware, not query-aware. Once a TCP connection is established, what travels over it is invisible to AWS. This means you have no mechanism at the managed layer to block a `SELECT *` without a `WHERE` clause from a poorly-written ORM, mirror production traffic to a staging replica to validate a schema change under real load, throttle an analytics query that's crowding out OLTP reads, or enforce per-application connection limits so one service can't exhaust the pool for everyone else. These are DBA problems. The managed endpoint layer doesn't solve them, and it's not going to.

<div class="callout-warning">
  <p><strong>SYMPTOMS YOU'VE PROBABLY SEEN:</strong> Thundering herd on the writer immediately after failover as all connection pools reconnect simultaneously. Stale reads surfaced by a sticky-session bug when a load balancer pins a user to a lagging replica. Connection storms during blue-green deploys when both environments briefly hold a full connection pool against the same writer endpoint.</p>
</div>

<h2 id="what-proxysql-gives-you">What ProxySQL Gives You (in 90 Seconds)</h2>

ProxySQL is a MySQL-protocol proxy. It sits between your application and your MySQL backends, speaking the MySQL client/server protocol on both sides — the application thinks it's talking to MySQL directly, and the MySQL backends think ProxySQL is just another client. Nothing changes at either end. You don't modify your driver, your connection string format (beyond hostname and port), or your SQL. The proxy layer is fully transparent to the application.

What changes is what happens in the middle.

**The three-layer config model** is the first thing to internalize, because it's unlike every other proxy you've probably used. ProxySQL maintains three distinct layers: MEMORY (a staging scratchpad), RUNTIME (the live, actively-used configuration), and DISK (the persisted sqlite3 database). You stage changes in MEMORY, validate them, then explicitly promote to RUNTIME with a `LOAD ... TO RUNTIME` command. You persist to DISK separately with `SAVE ... TO DISK`. There's no config file reload, no signal to send, no service restart. Changes are atomic and deliberate by design.

**Hostgroups** are ProxySQL's abstraction over backend servers. You assign each MySQL instance to a hostgroup — writer in HG 10, readers in HG 20 — and ProxySQL handles routing between them. It monitors backend health by polling `read_only` on standard MySQL replication. For Aurora clusters, Part 2 will show how `mysql_aws_aurora_hostgroups` tells ProxySQL to query `INFORMATION_SCHEMA.REPLICA_HOST_STATUS` instead, giving it true Aurora-native topology awareness that survives Aurora-specific failover events.

**Query rules** map SQL patterns to hostgroups. A rule matching `^SELECT` routes reads to HG 20; a rule matching `^SELECT.*FOR UPDATE` sends locking reads to HG 10. Rules can be stacked, prioritized, weighted, and scoped by user or schema. Part 3 covers query rules in depth — the point here is that routing happens per statement, not per connection.

**Connection multiplexing** lets N frontend connections share M backend connections, where M is much smaller than N. ProxySQL tracks per-session state — `autocommit` status, active transactions, `SET` variable assignments, temporary tables, advisory locks — to determine when a backend connection is safe to hand to a different frontend client. For workloads with many idle or short-lived connections, this can collapse backend thread counts by an order of magnitude.

**Query mirroring** clones traffic from the production hostgroup to a secondary hostgroup — a staging replica, a new Aurora cluster version, a read replica under evaluation. Mirrored queries are fire-and-forget: results are discarded, application latency is unaffected, and the calling code never knows the traffic was duplicated. It's the cleanest way to validate infrastructure changes under real production query patterns without touching the critical path.

**Native MySQL protocol** means no driver changes and no protocol translation overhead. Applications see ProxySQL as a standard MySQL endpoint; the authentication handshake is transparent. If you've used pgBouncer for PostgreSQL connection pooling, ProxySQL multiplexing solves the same connection-count problem at the MySQL protocol layer — but with per-statement query awareness layered on top.

<h2 id="placement-options">Placement Options on AWS</h2>

Where you deploy ProxySQL on AWS is the most consequential architectural decision in this series. Get it wrong and you'll be managing config drift, single-AZ blast radius, or hidden latency for as long as the deployment lives. There are four viable patterns, each a legitimate choice, and none universally correct.

<h3 id="sidecar-per-host">App-Side Sidecar (Per-EC2 or Per-ECS Task)</h3>

In the sidecar pattern, a ProxySQL process runs on every application server or alongside the application container in every ECS task. The app connects to `127.0.0.1:6033` — a loopback address. There's zero extra network hop between the application and the proxy. For latency-sensitive workloads where even sub-millisecond overhead matters, this is the right answer.

The operational challenge matches the latency advantage: you now have N ProxySQL instances to keep aligned. If your fleet has 40 EC2 instances and you push a query rule change, that change needs to land on all 40 — or you'll have instances routing traffic differently from each other, in a way that's hard to reproduce during an incident. Config drift across instances is the primary failure mode of this pattern. It doesn't surface immediately; it bites you three months later when you discover eight instances are running a config from six weeks ago.

You can manage this cleanly with automation: ProxySQL config delivered via SSM Parameter Store and applied at instance launch, AWS AppConfig for runtime pushes, or Ansible/Chef. Without that automation in place before you adopt this pattern, the pattern will work against you. AZ resilience is inherited from your application tier — if your app runs across three AZs, so do your sidecar ProxySQL instances.

**Best for:** teams with mature, tested config automation; workloads where sub-millisecond proxy latency matters; single-application environments connecting to a single cluster.

<h3 id="centralized-nlb">Centralized Fleet Behind NLB</h3>

In the centralized pattern, two or more ProxySQL EC2 instances run in an Auto Scaling Group in private subnets, fronted by an AWS Network Load Balancer. Applications point at the NLB DNS name. The NLB handles health checks and distributes incoming TCP connections across the ProxySQL fleet.

The latency addition is real but small: an NLB in the same Availability Zone as the application typically adds under 0.5ms of round-trip time. Cross-AZ adds 1–2ms. For the vast majority of database workloads — even high-frequency OLTP — this is noise that won't appear in your P99 latency graphs.

The operational win is significant: one config surface for every application connected to the database layer. Push a query rule change to two ProxySQL instances and every application sees it within seconds, with no per-host coordination. Rolling upgrades work cleanly via ASG instance refresh — drain one node, upgrade, re-add, repeat. The risk is blast radius: a misconfiguration that reaches RUNTIME on a centralized fleet affects all applications simultaneously. Mitigate this with a promotion discipline: apply to MEMORY on one node, smoke-test, then promote across the fleet. Part 5 covers a practical runbook for this.

**Best for:** environments with multiple applications sharing the same cluster; ops teams who want a single "database layer" to reason about; teams without mature per-host config automation.

<h3 id="kubernetes-sidecar">Kubernetes Sidecar (EKS)</h3>

On EKS, the sidecar pattern maps naturally to Kubernetes: ProxySQL runs as a container in the same pod as the application container, sharing the pod's network namespace. The app connects to `localhost:6033` — same zero-hop benefit as the EC2 sidecar.

Configuration arrives via a ConfigMap or Secret, with ProxySQL reloading on change via an init container, a lifecycle hook, or a purpose-built controller. The proxy lifecycle is tied to the pod: when a pod scales up, a new ProxySQL instance comes with it; when the pod terminates, so does the proxy. No orphaned state to clean up.

One metric demands attention from the start: the connection count arriving at Aurora. At 500 application pods with a ProxySQL sidecar each holding ~10 backend connections after multiplexing, you can land 5,000 MySQL threads on the writer. Multiplexing helps inside each sidecar — it doesn't help across them. Aurora's `max_connections` sees those 5,000 threads regardless of where they originate. Size your multiplexing configuration and your Aurora instance class together, and monitor `max_connections` headroom continuously.

**Best for:** EKS-native shops already running the sidecar pattern; environments where the application deployment model should own the proxy lifecycle.

<h3 id="dedicated-cluster-pair">Dedicated ProxySQL Cluster Pair</h3>

Two ProxySQL instances configured as a ProxySQL Cluster, placed in separate Availability Zones, fronted by an NLB or round-robin DNS. This is what this series builds in the lab, and it's the pattern we recommend for most production MySQL deployments.

The defining capability is automatic config synchronization. Configure the two nodes as a cluster via the `proxysql_servers` table, and any runtime config change applied to either node — new query rules, backend changes, user additions, global variable updates — propagates to the peer automatically, typically within a few hundred milliseconds. You apply a change once, and both nodes converge. No per-host coordination, no push scripts, no drift.

The upgrade story is clean: remove one node from NLB rotation, upgrade its ProxySQL binary, reconnect, then do the same for the second node. You never take the proxy layer entirely offline. AZ resilience comes from placing the two nodes in different Availability Zones — if one AZ becomes unavailable, the NLB routes all traffic to the surviving node.

This is the topology the lab runs throughout this series. Part 4 covers the complete HA and failover story for this pattern, including NLB health check configuration and Aurora-specific event handling.

<table>
  <thead>
    <tr>
      <th>Deployment Model</th>
      <th>Latency Add</th>
      <th>Config Sync</th>
      <th>Upgrade Path</th>
      <th>AZ Resilience</th>
      <th>Best For</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>App-side sidecar</td>
      <td>0 ms</td>
      <td>Per-host automation required</td>
      <td>Rolling per instance</td>
      <td>Inherits app tier spread</td>
      <td>Low-latency, single app, mature config automation</td>
    </tr>
    <tr>
      <td>Centralized + NLB</td>
      <td>&lt; 0.5 ms intra-AZ</td>
      <td>Centralized (one config surface)</td>
      <td>ASG instance refresh</td>
      <td>Multi-AZ ASG + NLB</td>
      <td>Multi-app environments, ops-centric teams</td>
    </tr>
    <tr>
      <td>K8s sidecar (EKS)</td>
      <td>0 ms</td>
      <td>ConfigMap / Secret push</td>
      <td>Rolling pod restart</td>
      <td>Inherits pod spread</td>
      <td>EKS-native teams, pod-lifecycle ownership</td>
    </tr>
    <tr>
      <td>Dedicated cluster pair</td>
      <td>&lt; 0.5 ms intra-AZ</td>
      <td>Auto-sync via <code>proxysql_servers</code></td>
      <td>Rolling node-by-node, zero downtime</td>
      <td>2 nodes in different AZs</td>
      <td>Production default; this series' model</td>
    </tr>
  </tbody>
</table>

<h2 id="proxysql-cluster">ProxySQL Cluster: Why You Always Run Two Nodes</h2>

A single ProxySQL node is a single point of failure in two distinct ways, and both matter.

The first is the obvious one: one node means one traffic failure point. If that instance goes down — kernel panic, OOM kill, network partition, or emergency maintenance — your application loses the proxy layer entirely. You could re-point apps directly at Aurora as a fallback, but that immediately eliminates the routing rules and multiplexing configuration your application has been relying on.

The second failure mode is less obvious: a single ProxySQL node is also a single point of config change failure. If you apply a config change that breaks routing and need to roll it back immediately, you need the node to be responsive. If the problem is the node itself, you have nothing to fall back to.

Two nodes in a ProxySQL Cluster solve both problems. The `proxysql_servers` table on each node lists the other as a peer. When you apply a config change — any `LOAD ... TO RUNTIME` paired with `SAVE ... TO DISK` — ProxySQL propagates that change to all configured peers automatically. What syncs between peers: `mysql_servers`, `mysql_users`, `mysql_query_rules`, and `global_variables`. Each node maintains its own disk state; cluster sync operates at the runtime layer only. When a new node joins, it auto-bootstraps from existing peers — given a populated `proxysql_servers` table and matching cluster credentials, the new node fetches the latest runtime config from the peer with the highest epoch on startup. The disk file is local; the cluster state is recoverable.

In the lab for this series, proxysql-1 at `192.168.105.7` and proxysql-2 at `192.168.105.8` are configured as a cluster and propagate changes at approximately 200ms under normal conditions. Smoke test `04-cluster-sync.sh` validates this by applying a config change to proxysql-1 and verifying it arrives on proxysql-2 before timing out. Part 4 adds the NLB health-check configuration and Aurora-specific failover hooks that complete this foundation.

<h2 id="alternatives">Alternatives: When Not to Use ProxySQL</h2>

ProxySQL adds a component to your infrastructure that requires operational attention — upgrades, monitoring, understanding failure modes, training the team. Before committing to it, it's worth being honest about whether you actually need what it provides. Several alternatives are simpler, and the right call for many RDS/Aurora environments is not ProxySQL.

<h3 id="reader-endpoint-alone">The Aurora Reader Endpoint Alone</h3>

If your read workload is uniform — all reads have roughly the same profile, target the same tables, and don't require per-query routing — the Aurora reader endpoint is likely sufficient. It distributes connections across readers, integrates with Aurora's native topology discovery, and costs nothing to operate beyond the reader instances themselves. The ~30–60s failover window is acceptable for most applications if the connection pool has sensible retry logic and a short TCP keepalive.

If the reason you're looking at ProxySQL is that the reader endpoint does round-robin and you want "smarter" distribution, stop and ask whether the routing problem is real. If your readers are the same instance class and the load is uniform, round-robin is close to optimal. Adding ProxySQL for that case alone is operational overhead solving a problem that doesn't exist.

<h3 id="haproxy-nlb">HAProxy or NLB Alone</h3>

HAProxy is battle-tested, handles high connection rates efficiently, and is simpler to operate than ProxySQL. For MySQL, it works at Layer 4: it routes TCP connections, not SQL queries. You can configure health checks against the MySQL port and distribute connections across backend pools, but routing decisions are based on the connection, not the query traveling over it.

If your only need is to spread connections across multiple read replicas with no SQL-layer intelligence, HAProxy or an NLB with IP target groups is a reasonable choice. You give up multiplexing, query rules, and the query digest, but if you don't need those features, you also avoid the complexity of maintaining them. This is a legitimate trade-off, not a compromise.

<h3 id="rds-proxy">RDS Proxy</h3>

RDS Proxy is AWS's managed connection pooler for RDS and Aurora. It handles pooling at the managed layer, integrates with IAM authentication and AWS Secrets Manager for credential rotation, and requires no infrastructure to provision or maintain. For teams that want connection pooling without running their own proxy fleet, it's worth evaluating seriously.

RDS Proxy added read/write splitting via session-aware routing in 2024, so the basic split is solved. The gap relative to ProxySQL sits in everything beyond that. As of mid-2026, RDS Proxy does not support user-defined query routing rules — you can't write a rule that sends a specific query pattern to a specific instance. It doesn't support query mirroring. It doesn't support query rewriting. The per-statement observability that ProxySQL exposes via `stats_mysql_query_digest` has no equivalent. And the pricing model — charged per vCPU of the underlying database instance — becomes meaningful at scale.

<table>
  <thead>
    <tr>
      <th>Feature</th>
      <th>RDS Proxy</th>
      <th>ProxySQL</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Query routing rules</td>
      <td>No</td>
      <td>Yes — regex/digest, per-user, per-schema</td>
    </tr>
    <tr>
      <td>Connection multiplexing</td>
      <td>Yes (managed, opaque)</td>
      <td>Yes (configurable, observable)</td>
    </tr>
    <tr>
      <td>Query mirroring</td>
      <td>No</td>
      <td>Yes</td>
    </tr>
    <tr>
      <td>Per-statement query digest</td>
      <td>No</td>
      <td>Yes (<code>stats_mysql_query_digest</code>)</td>
    </tr>
    <tr>
      <td>IAM authentication</td>
      <td>Yes (native)</td>
      <td>No (requires workaround)</td>
    </tr>
    <tr>
      <td>Operational overhead</td>
      <td>Low — fully managed</td>
      <td>Medium — self-managed fleet</td>
    </tr>
    <tr>
      <td>Cost model</td>
      <td>Per vCPU of DB instance</td>
      <td>EC2 instance + NLB (~$16&ndash;20/mo)</td>
    </tr>
  </tbody>
</table>

<h3 id="connector-side">Connector-Side Load Balancing</h3>

MySQL Connector/J's replication protocol, the AWS JDBC Driver's reader/writer splitting, and similar connector-side solutions route queries at the application layer. The driver inspects whether the current context is read-only and routes accordingly. This works — and it works without any proxy infrastructure.

The trade-off is that routing policy lives in application code. If you have five services connecting to the same Aurora cluster and you want to change which queries go to readers, you need to update five codebases and deploy five services. There's no central audit trail, no place to add a rule that captures all traffic regardless of which service is sending it, and no way for the database team to adjust routing without going through a development cycle. For stable, simple routing that genuinely never changes, this is fine. For anything more dynamic, it's the wrong layer to own the policy.

The honest summary: if your workload is simple and stable, RDS Proxy or connector-side routing covers the common case with significantly less operational overhead than ProxySQL. ProxySQL is the right tool when you need SQL-layer control that neither of those options provides — and when you're willing to own the operational cost that comes with it.

<div class="post-cta-inline">
  <h4>Running RDS or Aurora MySQL and feeling the limits?</h4>
  <p>ProxySQL setup and tuning is one of the most impactful changes a DBA can make for a scaling MySQL environment. If you want expert guidance on placement, query routing, or failover design before committing to an architecture, book a free assessment call.</p>
  <a href="/contact/" class="btn">Book Free Assessment &rarr;</a>
</div>

<h2 id="lab-topology">The Lab Topology You'll See Across This Series</h2>

<div class="callout">
  <p><strong>TESTED ON LIVE VMs:</strong> All configurations and outputs across this series come from a Lima VM lab running on macOS &mdash; MySQL 8.0.41 managed by dbdeployer (master + 2 replicas), ProxySQL 2.7.3 (two-node cluster), end-to-end smoke-tested before publication. Four smoke tests cover read/write split, replica shunning, multiplexing, and cluster config sync.</p>
</div>

Every part of this series builds on the same four-VM lab. Understanding the topology now means you won't need to re-orient each time a new part adds configuration on top of it.

```
                    ┌──────────────────┐
                    │    client-vm     │
                    │  192.168.105.9   │
                    │ sysbench / mysql │
                    └────────┬─────────┘
                             │  MySQL protocol :6033
               ┌─────────────┴─────────────┐
               │                           │
  ┌────────────▼──────────┐   ┌────────────▼──────────┐
  │      proxysql-1       │◄──►│      proxysql-2       │
  │   192.168.105.7       │   │   192.168.105.8       │
  │   ProxySQL 2.7.3      │   │   ProxySQL 2.7.3      │
  │   HG 10: writer       │   │   HG 10: writer       │
  │   HG 20: readers      │   │   HG 20: readers      │
  │   admin :6032         │   │   admin :6032         │
  └────────────┬──────────┘   └────────────┬──────────┘
               │    ProxySQL Cluster sync   │
               │         (~200 ms)          │
               └─────────────┬─────────────┘
                             │  MySQL protocol
                    ┌────────▼─────────┐
                    │  mysql-backends  │
                    │  192.168.105.6   │
                    ├──────────────────┤
                    │ master   :25001  │  ← HG 10 (writer)
                    │ replica1 :25002  │  ← HG 20 (reader)
                    │ replica2 :25003  │  ← HG 20 (reader)
                    └──────────────────┘
```

<table>
  <thead>
    <tr><th>VM Name</th><th>IP</th><th>Role</th><th>Services</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><code>mysql-backends</code></td>
      <td>192.168.105.6</td>
      <td>MySQL master + 2 replicas</td>
      <td>mysqld &times;3 (ports 25001 / 25002 / 25003)</td>
    </tr>
    <tr>
      <td><code>proxysql-1</code></td>
      <td>192.168.105.7</td>
      <td>ProxySQL 2.7.3 (primary)</td>
      <td>proxysql :6032 (admin) :6033 (app)</td>
    </tr>
    <tr>
      <td><code>proxysql-2</code></td>
      <td>192.168.105.8</td>
      <td>ProxySQL 2.7.3 (cluster peer)</td>
      <td>proxysql :6032 (admin) :6033 (app)</td>
    </tr>
    <tr>
      <td><code>client-vm</code></td>
      <td>192.168.105.9</td>
      <td>Client / load generator</td>
      <td>mysql-client, sysbench</td>
    </tr>
  </tbody>
</table>

<div class="callout">
  <p><strong>PRODUCTION SUBSTITUTION:</strong> In the lab, all three MySQL backends run on a single VM managed by dbdeployer — three mysqld processes on different ports on the same host. In production, you'd replace those three endpoints with your Aurora cluster's individual instance endpoints (not the cluster endpoint or reader endpoint), or your RDS writer endpoint plus read replica instance endpoints. ProxySQL 2.7.3 is binary-compatible with Aurora MySQL 2, which tracks the 8.0.x lineage. Part 2 makes this substitution concrete: we connect to a real Aurora cluster and configure <code>mysql_aws_aurora_hostgroups</code> for Aurora-native topology discovery.</p>
</div>

<h2 id="decision-framework">Should You Put ProxySQL in Front of Your RDS/Aurora?</h2>

Before spending time on the rest of this series, work through these six questions honestly. They're designed to help you make the right call, not to steer you toward ProxySQL.

<ul>
  <li><strong>Do you need per-query routing rules</strong> — sending analytics queries to a dedicated replica, blocking specific patterns from reaching the writer, routing by schema or user context? ProxySQL is the only option in the RDS/Aurora ecosystem that gives you this at the proxy layer, independent of application code.</li>
  <li><strong>Do you need to mirror production traffic</strong> to a staging or canary endpoint without modifying application code? ProxySQL query mirroring is the cleanest path. No alternative in this space provides it.</li>
  <li><strong>Do you need to throttle, queue, or reject specific query patterns</strong> at the infrastructure layer rather than the application layer? ProxySQL query rules with <code>max_connections_per_user</code>, error injection, or active/passive rule switching handle this without a code deploy or application-team involvement.</li>
  <li><strong>Are you hitting Aurora's max_connections ceiling on the writer</strong> and the instinct to upsize the instance isn't solving the pattern — either because cost is prohibitive or because connection count scales with pod/instance count? ProxySQL multiplexing is the right lever. It collapses hundreds of idle application connections into a fraction of that number on the backend, without changing any application code.</li>
  <li><strong>Is your only requirement to spread reads across the Aurora reader endpoint</strong>, with no routing rules, no per-query control, and no multiplexing tuning? The reader endpoint handles this natively. Adding ProxySQL for this case alone is overhead in search of a problem.</li>
  <li><strong>Is your only requirement basic read/write split with no custom routing?</strong> Try RDS Proxy or a connector-side driver first. They provide this capability with less operational overhead than a self-managed ProxySQL deployment, and they're easier to hand to a team that hasn't run ProxySQL before.</li>
</ul>

If you answered yes to any of the first four, ProxySQL is worth the investment. If your situation fits only the last two, the simpler option is probably the right one. ProxySQL adds a real operational component — a binary to upgrade, a config layer to understand, failure modes to train for. That overhead pays for itself when the workload demands what ProxySQL provides. It doesn't pay for itself when you just need round-robin reads.

<h2 id="whats-next">What's Next: Wiring ProxySQL to Aurora MySQL</h2>

In <a href="/blog/proxysql-rds-aurora-mysql-part2-aurora-hostgroups.html">Part 2</a>, we move from architecture to configuration. We'll connect ProxySQL to a real Aurora MySQL cluster using <code>mysql_aws_aurora_hostgroups</code> — the Aurora-native table that directs ProxySQL to query <code>INFORMATION_SCHEMA.REPLICA_HOST_STATUS</code> for topology discovery, rather than relying on the <code>read_only</code> polling used for standard MySQL replication. With this configuration, ProxySQL auto-discovers the writer and all reader instances, adapts when Aurora promotes a reader during a failover event, and routes traffic correctly through the cluster-level changes that would trip up a replication hostgroup configured for vanilla MySQL. The lab and production configurations live side by side throughout so you can follow both paths.

<!-- Series Nav Bottom -->
<div class="series-nav">
  <h4>Continue the Series</h4>
  <ol>
    <li><span class="current">Part 1: Why and Where to Place It (You Are Here)</span></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part2-aurora-hostgroups.html">Part 2: Wiring ProxySQL to Aurora MySQL &rarr;</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part3-query-rules-rw-split.html">Part 3: Query Routing, Read/Write Split, Multiplexing</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls.html">Part 4: HA, Failover Patterns, and TLS</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part5-monitoring-tuning-troubleshooting.html">Part 5: Monitoring, Tuning, and Troubleshooting</a></li>
  </ol>
</div>
