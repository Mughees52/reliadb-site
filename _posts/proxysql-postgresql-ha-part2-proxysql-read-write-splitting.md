---
title: "ProxySQL PostgreSQL Read/Write Splitting Setup (Part 2)"
date: 2026-04-23T12:00:00.000Z
author: "Mughees Ahmed"
description: "Configure ProxySQL 3.0.6 for PostgreSQL read/write splitting, health monitoring, and query routing. Tested on live VMs."
categories:
  - postgresql
  - high-availability
read_time: 18
featured: false
coverImage: "/images/blog/proxysql-postgresql-read-write-splitting.jpg"
---

<!-- Series Navigation -->
<div class="series-nav">
  <h4>PostgreSQL HA with ProxySQL &amp; Orchestrator &mdash; 4-Part Series</h4>
  <ol>
    <li><a href="/blog/proxysql-postgresql-ha-part1-architecture-replication.html">Part 1: Architecture &amp; Streaming Replication</a></li>
    <li><span class="current">Part 2: ProxySQL &mdash; Read/Write Splitting (You Are Here)</span></li>
    <li><a href="/blog/proxysql-postgresql-ha-part3-orchestrator-failover.html">Part 3: Orchestrator &mdash; Topology Discovery &amp; Failover</a></li>
    <li><a href="/blog/proxysql-postgresql-ha-part4-integration-failover-scenarios.html">Part 4: End-to-End Integration &amp; Failover Scenarios</a></li>
  </ol>
</div>

In <a href="/blog/proxysql-postgresql-ha-part1-architecture-replication.html">Part 1</a>, we built a 3-node PostgreSQL streaming replication cluster on Multipass VMs. Applications can connect directly to each node, but that forces them to know which is the primary and which are replicas. ProxySQL eliminates that complexity.

<a href="https://proxysql.com/blog/proxysql-expands-database-support-to-postgresql-in-version-3-0-0-alpha/">ProxySQL 3.0</a> added native PostgreSQL protocol support — the same connection pooling, query routing, and health monitoring MySQL DBAs have relied on for years, now available for PostgreSQL. The <a href="https://github.com/sysown/proxysql/releases">latest stable release</a> is 3.0.6. In this part, we install ProxySQL 3.0.6 on the `proxy-orch` VM and configure automatic read/write splitting.

<div class="callout">
  <p><strong>WHAT WE'LL ACHIEVE:</strong> Applications connect to a single ProxySQL endpoint (port 6133). Writes go to the primary, reads go to replicas, and ProxySQL automatically detects role changes via <code>pg_is_in_recovery()</code>.</p>
</div>

<h2 id="proxysql-ports">ProxySQL Port Layout</h2>

ProxySQL 3.x exposes both MySQL and PostgreSQL interfaces:

<table>
  <thead>
    <tr><th>Port</th><th>Protocol</th><th>Purpose</th></tr>
  </thead>
  <tbody>
    <tr><td>6032</td><td>MySQL</td><td>Admin interface (MySQL protocol)</td></tr>
    <tr><td>6033</td><td>MySQL</td><td>Application traffic (MySQL)</td></tr>
    <tr><td><strong>6132</strong></td><td><strong>PostgreSQL</strong></td><td><strong>Admin interface (PostgreSQL protocol)</strong></td></tr>
    <tr><td><strong>6133</strong></td><td><strong>PostgreSQL</strong></td><td><strong>Application traffic (PostgreSQL)</strong></td></tr>
  </tbody>
</table>

We use **port 6132** for all admin commands via `psql`, and applications connect to **port 6133**.

<h2 id="install-proxysql">Step 1: Install ProxySQL 3.x</h2>

SSH into the `proxy-orch` VM and install ProxySQL 3.0.6 (the stable tier release):

```bash
# Download the .deb for your architecture
# For ARM64 (Apple Silicon Macs):
multipass exec proxy-orch -- sudo bash -c '
  apt-get update -qq
  apt-get install -y -qq wget postgresql-client

  wget -q https://github.com/sysown/proxysql/releases/download/v3.0.6/proxysql_3.0.6-ubuntu24_arm64.deb \
    -O /tmp/proxysql.deb

  dpkg -i /tmp/proxysql.deb
  systemctl start proxysql
  systemctl is-active proxysql
'
```

For x86_64 systems, replace `arm64` with `amd64` in the download URL.

Verify the installation:

```bash
multipass exec proxy-orch -- proxysql --version
```

Expected output:

```
ProxySQL version 3.0.6-921-g3803f11, codename Truls
```

<h2 id="admin-access">Step 2: Connect to the Admin Interface</h2>

ProxySQL's admin interface speaks the PostgreSQL wire protocol on port 6132. Connect with `psql`:

```bash
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin
```

Default credentials are `admin`/`admin`. All configuration commands run through this interface.

<div class="callout">
  <p><strong>THREE-LAYER CONFIG:</strong> ProxySQL has three configuration layers: <strong>MEMORY</strong> (editing tables), <strong>RUNTIME</strong> (active config), and <strong>DISK</strong> (survives restart). After changing any table, you must <code>LOAD ... TO RUNTIME</code> to activate and <code>SAVE ... TO DISK</code> to persist.</p>
</div>

<h2 id="add-backends">Step 3: Register PostgreSQL Backends</h2>

Add all three PostgreSQL nodes to the `pgsql_servers` table. We assign the primary to hostgroup 10 (writers) and replicas to hostgroup 20 (readers):

```bash
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin << 'EOF'
INSERT INTO pgsql_servers (hostgroup_id, hostname, port, max_connections, comment)
VALUES
  (10, 'pg-primary',  5432, 100, 'primary - writer'),
  (20, 'pg-replica1', 5432, 100, 'replica1 - reader'),
  (20, 'pg-replica2', 5432, 100, 'replica2 - reader');

SELECT hostgroup_id, hostname, port, status, comment FROM pgsql_servers;

LOAD PGSQL SERVERS TO RUNTIME;
SAVE PGSQL SERVERS TO DISK;
EOF
```

Expected output:

```
 hostgroup_id |  hostname   | port | status |      comment
--------------+-------------+------+--------+-------------------
 10           | pg-primary  | 5432 | ONLINE | primary - writer
 20           | pg-replica1 | 5432 | ONLINE | replica1 - reader
 20           | pg-replica2 | 5432 | ONLINE | replica2 - reader
```

<h2 id="configure-monitoring">Step 4: Configure Health Monitoring</h2>

ProxySQL runs a background monitor that continuously checks every backend. It does three things:

1. **Ping check** — is the server alive? (every 2 seconds)
2. **Connect check** — can we establish a full connection? (every 2 seconds)
3. **Read-only check** — is this a primary or replica? Uses `pg_is_in_recovery()` (every 1 second)

The read-only check is the critical one for routing. If `pg_is_in_recovery()` returns `false`, the server is a primary (writer). If `true`, it's a replica (reader). ProxySQL moves servers between hostgroups automatically based on this.

Configure the monitoring credentials (these must match the `monitor` user we created on PostgreSQL in Part 1):

```bash
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin << 'EOF'
UPDATE global_variables SET variable_value = 'monitor'
  WHERE variable_name = 'pgsql-monitor_username';
UPDATE global_variables SET variable_value = 'monitor_pass_2026'
  WHERE variable_name = 'pgsql-monitor_password';
UPDATE global_variables SET variable_value = '2000'
  WHERE variable_name = 'pgsql-monitor_connect_interval';
UPDATE global_variables SET variable_value = '2000'
  WHERE variable_name = 'pgsql-monitor_ping_interval';
UPDATE global_variables SET variable_value = '1000'
  WHERE variable_name = 'pgsql-monitor_read_only_interval';
UPDATE global_variables SET variable_value = 'true'
  WHERE variable_name = 'pgsql-monitor_enabled';

LOAD PGSQL VARIABLES TO RUNTIME;
SAVE PGSQL VARIABLES TO DISK;
EOF
```

**Key monitoring variables:**

<table>
  <thead>
    <tr><th>Variable</th><th>Value</th><th>Purpose</th></tr>
  </thead>
  <tbody>
    <tr><td><code>pgsql-monitor_ping_interval</code></td><td>2000 ms</td><td>How often to check if a backend is alive</td></tr>
    <tr><td><code>pgsql-monitor_connect_interval</code></td><td>2000 ms</td><td>How often to test full connection establishment</td></tr>
    <tr><td><code>pgsql-monitor_read_only_interval</code></td><td>1000 ms</td><td>How often to call <code>pg_is_in_recovery()</code></td></tr>
    <tr><td><code>pgsql-monitor_ping_max_failures</code></td><td>3 (default)</td><td>Failed pings before shunning a server</td></tr>
  </tbody>
</table>

Verify monitoring is working:

```bash
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin << 'EOF'
-- Check ping results (should show all healthy, no errors)
SELECT hostname, port, ping_success_time_us, ping_error
FROM monitor.pgsql_server_ping_log
ORDER BY time_start_us DESC LIMIT 6;
EOF
```

Expected output — all pings successful with sub-millisecond latency:

```
  hostname   | port | ping_success_time_us | ping_error
-------------+------+----------------------+------------
 pg-primary  | 5432 | 2755                 |
 pg-replica1 | 5432 | 2350                 |
 pg-replica2 | 5432 | 1873                 |
 pg-replica2 | 5432 | 3217                 |
 pg-replica1 | 5432 | 1469                 |
 pg-primary  | 5432 | 1519                 |
```

<h2 id="replication-hostgroups">Step 5: Set Up Replication Hostgroups</h2>

This is the critical step that enables automatic read/write splitting. The `pgsql_replication_hostgroups` table tells ProxySQL which hostgroups form a writer/reader pair and how to detect roles:

```bash
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin << 'EOF'
INSERT INTO pgsql_replication_hostgroups
  (writer_hostgroup, reader_hostgroup, check_type, comment)
VALUES
  (10, 20, 'read_only', 'PG HA cluster');

SELECT * FROM pgsql_replication_hostgroups;

LOAD PGSQL SERVERS TO RUNTIME;
SAVE PGSQL SERVERS TO DISK;
EOF
```

With `check_type = 'read_only'`, ProxySQL calls `pg_is_in_recovery()` on every backend at the `pgsql-monitor_read_only_interval` interval:
- If `pg_is_in_recovery()` returns **false** → the server is a **primary** → assigned to **hostgroup 10** (writer)
- If `pg_is_in_recovery()` returns **true** → the server is a **replica** → assigned to **hostgroup 20** (reader)

Verify the read-only monitor is correctly identifying roles:

```bash
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin << 'EOF'
SELECT hostname, port, read_only, error
FROM monitor.pgsql_server_read_only_log
ORDER BY time_start_us DESC LIMIT 6;
EOF
```

Expected output:

```
  hostname   | port | read_only | error
-------------+------+-----------+-------
 pg-replica2 | 5432 | 1         |
 pg-replica1 | 5432 | 1         |
 pg-primary  | 5432 | 0         |
 pg-replica2 | 5432 | 1         |
 pg-primary  | 5432 | 0         |
 pg-replica1 | 5432 | 1         |
```

The primary (`read_only = 0`) and replicas (`read_only = 1`) are correctly identified.

<h2 id="add-users">Step 6: Add Application Users</h2>

ProxySQL needs to know which users can connect through it. Add the `appuser` we created on PostgreSQL:

```bash
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin << 'EOF'
INSERT INTO pgsql_users (username, password, default_hostgroup, active)
VALUES ('appuser', 'app_pass_2026', 10, 1);

SELECT username, active, default_hostgroup FROM pgsql_users;

LOAD PGSQL USERS TO RUNTIME;
SAVE PGSQL USERS TO DISK;
EOF
```

The `default_hostgroup = 10` means queries from this user go to the writer hostgroup by default, unless a query rule redirects them.

<h2 id="query-rules">Step 7: Configure Query Routing Rules</h2>

<img src="/images/blog/svg-pg-ha-query-routing.svg" alt="ProxySQL query routing flowchart showing SELECT routing to reader hostgroup 20 and writes to writer hostgroup 10" style="width:100%;max-width:800px;margin:1.5em auto;display:block;" />

Query rules tell ProxySQL how to route different query types. We set up two rules:
1. `SELECT ... FOR UPDATE` → writer (hostgroup 10), because it takes locks
2. All other `SELECT` → reader (hostgroup 20)

```bash
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin << 'EOF'
-- Rule 100: SELECT FOR UPDATE must go to the writer (takes locks)
INSERT INTO pgsql_query_rules
  (rule_id, active, match_digest, destination_hostgroup, apply, comment)
VALUES
  (100, 1, '^SELECT.*FOR UPDATE', 10, 1, 'SELECT FOR UPDATE -> writer');

-- Rule 200: All other SELECTs go to readers
INSERT INTO pgsql_query_rules
  (rule_id, active, match_digest, destination_hostgroup, apply, comment)
VALUES
  (200, 1, '^SELECT', 20, 1, 'SELECT -> readers');

SELECT rule_id, active, match_digest, destination_hostgroup, comment
FROM pgsql_query_rules ORDER BY rule_id;

LOAD PGSQL QUERY RULES TO RUNTIME;
SAVE PGSQL QUERY RULES TO DISK;
EOF
```

Expected output:

```
 rule_id | active |    match_digest     | destination_hostgroup |           comment
---------+--------+---------------------+-----------------------+-----------------------------
 100     | 1      | ^SELECT.*FOR UPDATE | 10                    | SELECT FOR UPDATE -> writer
 200     | 1      | ^SELECT             | 20                    | SELECT -> readers
```

<div class="callout">
  <p><strong>RULE EVALUATION ORDER:</strong> Rules are evaluated by ascending <code>rule_id</code>. <code>apply = 1</code> stops further evaluation. Rule 100 catches <code>SELECT FOR UPDATE</code> first; rule 200 catches all remaining <code>SELECT</code>s. Everything else (INSERT, UPDATE, DELETE, DDL) falls through to the user's <code>default_hostgroup</code> (10 = writer).</p>
</div>

**How each query type gets routed:**

<table>
  <thead>
    <tr><th>Query</th><th>Matches Rule</th><th>Goes To</th><th>Server</th></tr>
  </thead>
  <tbody>
    <tr><td><code>SELECT * FROM orders;</code></td><td>Rule 200 (<code>^SELECT</code>)</td><td>Hostgroup 20</td><td>pg-replica1 or pg-replica2 (round-robin)</td></tr>
    <tr><td><code>SELECT * FROM orders FOR UPDATE;</code></td><td>Rule 100 (<code>^SELECT.*FOR UPDATE</code>)</td><td>Hostgroup 10</td><td>pg-primary (takes locks)</td></tr>
    <tr><td><code>INSERT INTO orders VALUES (...);</code></td><td>No rule matches</td><td>Default HG 10</td><td>pg-primary</td></tr>
    <tr><td><code>UPDATE orders SET status = 'shipped';</code></td><td>No rule matches</td><td>Default HG 10</td><td>pg-primary</td></tr>
    <tr><td><code>DELETE FROM orders WHERE id = 5;</code></td><td>No rule matches</td><td>Default HG 10</td><td>pg-primary</td></tr>
  </tbody>
</table>

<h2 id="test-routing">Step 8: Test Read/Write Splitting</h2>

Now let's verify this routing works. Connect through ProxySQL on port 6133 and run both writes and reads:

```bash
# Write through ProxySQL (goes to hostgroup 10 = primary)
multipass exec proxy-orch -- PGPASSWORD=app_pass_2026 psql \
  -h 127.0.0.1 -p 6133 -U appuser -d appdb \
  -c "INSERT INTO replication_test (message) VALUES ('Written via ProxySQL!');"

# Read through ProxySQL (goes to hostgroup 20 = replicas)
multipass exec proxy-orch -- PGPASSWORD=app_pass_2026 psql \
  -h 127.0.0.1 -p 6133 -U appuser -d appdb \
  -c "SELECT * FROM replication_test;"
```

Now verify that ProxySQL routed queries to the correct hostgroups:

```bash
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin << 'EOF'
-- Query digest shows which hostgroup handled each query
SELECT hostgroup hg, digest_text, count_star, sum_time
FROM stats_pgsql_query_digest
ORDER BY count_star DESC;
EOF
```

Expected output — **proof of read/write splitting**:

```
 hg |                    digest_text                     | count_star | sum_time
----+----------------------------------------------------+------------+----------
 20 | SELECT * FROM replication_test;                    | 3          | 12417
 10 | INSERT INTO replication_test (message) VALUES (?); | 2          | 8669
```

- **Hostgroup 20** (readers): handled all `SELECT` queries
- **Hostgroup 10** (writer): handled all `INSERT` queries

<h2 id="connection-pool">Step 9: Check Connection Pool Stats</h2>

ProxySQL maintains a connection pool to each backend, reusing connections across application requests. A healthy pool looks like this: `ConnERR = 0` (no connection failures), `Latency_us` under 5000 (sub-5ms), and queries distributed across replicas in hostgroup 20.

```bash
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin << 'EOF'
SELECT hostgroup, srv_host, status, ConnUsed, ConnFree, ConnOK, ConnERR, Queries, Latency_us
FROM stats_pgsql_connection_pool
ORDER BY hostgroup;
EOF
```

Expected output:

```
 hostgroup |  srv_host   | status | ConnUsed | ConnFree | ConnOK | ConnERR | Queries | Latency_us
-----------+-------------+--------+----------+----------+--------+---------+---------+------------
 10        | pg-primary  | ONLINE | 1        | 0        | 1      | 0       | 2       | 2594
 20        | pg-replica1 | ONLINE | 1        | 0        | 1      | 0       | 2       | 2750
 20        | pg-replica2 | ONLINE | 1        | 0        | 1      | 0       | 1       | 1372
```

ProxySQL distributes reads across both replicas (2 queries to replica1, 1 to replica2). The `ConnERR = 0` confirms no connection failures.

<h2 id="runtime-state">Step 10: Verify Runtime Server State</h2>

The `runtime_pgsql_servers` table shows the currently active routing configuration:

```bash
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin << 'EOF'
SELECT hostgroup_id, hostname, port, status
FROM runtime_pgsql_servers
ORDER BY hostgroup_id, hostname;
EOF
```

Expected output:

```
 hostgroup_id |  hostname   | port | status
--------------+-------------+------+--------
 10           | pg-primary  | 5432 | ONLINE
 20           | pg-replica1 | 5432 | ONLINE
 20           | pg-replica2 | 5432 | ONLINE
```

<h2 id="server-status">Understanding Server Status Values</h2>

ProxySQL uses four status values to manage server health:

<table>
  <thead>
    <tr><th>Status</th><th>Behavior</th><th>When It Happens</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><code>ONLINE</code></td>
      <td>Fully accepting connections and traffic</td>
      <td>Healthy server passing all monitor checks</td>
    </tr>
    <tr>
      <td><code>SHUNNED</code></td>
      <td>No new traffic; kept for periodic re-checks</td>
      <td>Server exceeds <code>ping_max_failures</code> or has too many connection errors</td>
    </tr>
    <tr>
      <td><code>OFFLINE_SOFT</code></td>
      <td>Graceful drain; existing connections finish</td>
      <td>Manually set for planned maintenance</td>
    </tr>
    <tr>
      <td><code>OFFLINE_HARD</code></td>
      <td>Immediate disconnect; no drain</td>
      <td>Manually set for emergency removal</td>
    </tr>
  </tbody>
</table>

<div class="callout">
  <p><strong>AUTOMATIC SHUNNING AND RECOVERY:</strong> When a server goes down, ProxySQL automatically shuns it (no new traffic). When it comes back online and passes health checks, ProxySQL automatically brings it back to ONLINE — no manual intervention needed.</p>
</div>

<h2 id="writer-also-reader">Writer-Is-Also-Reader Setting</h2>

By default, `pgsql-monitor_writer_is_also_reader = true`, meaning the primary appears in both hostgroup 10 (writer) and hostgroup 20 (reader). This ensures the primary also serves reads, which is useful for small clusters.

To make replicas handle all reads exclusively:

```sql
-- On the ProxySQL admin interface (port 6132)
UPDATE global_variables SET variable_value = 'false'
  WHERE variable_name = 'pgsql-monitor_writer_is_also_reader';
LOAD PGSQL VARIABLES TO RUNTIME;
SAVE PGSQL VARIABLES TO DISK;
```

<h2 id="pre-checks">Pre-Checks Before Moving to Part 3</h2>

Verify every component is working before adding Orchestrator. Each check maps to a failure we hit during testing.

```bash
echo "=== ProxySQL Pre-Check Suite ==="

echo "1. All backends ONLINE:"
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin \
  -c "SELECT hostgroup_id, hostname, port, status FROM runtime_pgsql_servers ORDER BY hostgroup_id;"

echo "2. Monitor pings healthy (no errors):"
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin \
  -c "SELECT hostname, port, ping_error FROM monitor.pgsql_server_ping_log WHERE ping_error != '' ORDER BY time_start_us DESC LIMIT 5;"

echo "3. Read-only monitor correct (primary=0, replicas=1):"
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin \
  -c "SELECT hostname, port, read_only FROM monitor.pgsql_server_read_only_log ORDER BY time_start_us DESC LIMIT 6;"

echo "4. Primary in hostgroup 10, replicas in hostgroup 20:"
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin \
  -c "SELECT hostgroup_id, hostname FROM runtime_pgsql_servers WHERE hostgroup_id = 10;"

echo "5. Query rules loaded:"
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin \
  -c "SELECT rule_id, match_digest, destination_hostgroup FROM pgsql_query_rules ORDER BY rule_id;"

echo "6. Write through ProxySQL succeeds:"
multipass exec proxy-orch -- PGPASSWORD=app_pass_2026 psql -h 127.0.0.1 -p 6133 -U appuser -d appdb \
  -c "INSERT INTO replication_test (message) VALUES ('pre-check write');" 2>&1

echo "7. Read through ProxySQL succeeds:"
multipass exec proxy-orch -- PGPASSWORD=app_pass_2026 psql -h 127.0.0.1 -p 6133 -U appuser -d appdb \
  -c "SELECT count(*) FROM replication_test;" 2>&1

echo "8. Routing stats show split (SELECTs on hg20, writes on hg10):"
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin \
  -c "SELECT hostgroup hg, digest_text, count_star FROM stats_pgsql_query_digest ORDER BY count_star DESC LIMIT 5;"

echo "=== All ProxySQL pre-checks complete ==="
```

<table>
  <thead>
    <tr><th>#</th><th>Check</th><th>Failure Means</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>All backends ONLINE</td><td>Monitor can't reach a backend — check <code>pg_hba.conf</code> and monitor credentials</td></tr>
    <tr><td>2</td><td>No ping errors</td><td>Network issue or PostgreSQL not listening on <code>*</code> — check <code>listen_addresses</code></td></tr>
    <tr><td>3</td><td>Correct read_only values</td><td>Monitor user lacks <code>pg_monitor</code> role or wrong credentials configured</td></tr>
    <tr><td>4</td><td>Primary in hostgroup 10</td><td>Replication hostgroups not loaded — run <code>LOAD PGSQL SERVERS TO RUNTIME</code></td></tr>
    <tr><td>5</td><td>Query rules present</td><td>Rules not loaded — run <code>LOAD PGSQL QUERY RULES TO RUNTIME</code></td></tr>
    <tr><td>6</td><td>Write succeeds</td><td>App user lacks table GRANTs — run <code>GRANT ALL ON ALL TABLES IN SCHEMA public TO appuser</code></td></tr>
    <tr><td>7</td><td>Read succeeds</td><td>Same as above, or replicas not in sync</td></tr>
    <tr><td>8</td><td>Routing split visible</td><td>Query rules not matching — check <code>match_digest</code> patterns</td></tr>
  </tbody>
</table>

<h2 id="troubleshooting">Troubleshooting</h2>

<table>
  <thead>
    <tr><th>Symptom</th><th>Check</th><th>Fix</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Monitor pings show errors</td>
      <td><code>SELECT * FROM monitor.pgsql_server_ping_log</code></td>
      <td>Verify <code>pg_hba.conf</code> allows monitor user from ProxySQL's IP</td>
    </tr>
    <tr>
      <td>All servers in hostgroup 20, none in 10</td>
      <td><code>SELECT * FROM monitor.pgsql_server_read_only_log</code></td>
      <td>Check monitor credentials match the PostgreSQL <code>monitor</code> user</td>
    </tr>
    <tr>
      <td><code>permission denied for table</code> through ProxySQL</td>
      <td>Connect directly to PostgreSQL and check GRANTs</td>
      <td><code>GRANT ALL ON ALL TABLES IN SCHEMA public TO appuser;</code></td>
    </tr>
    <tr>
      <td>Queries not being split (all to hostgroup 10)</td>
      <td><code>SELECT * FROM pgsql_query_rules</code></td>
      <td>Verify rules are loaded: <code>LOAD PGSQL QUERY RULES TO RUNTIME</code></td>
    </tr>
    <tr>
      <td>Cannot connect via psql to port 6132</td>
      <td><code>ss -tlnp | grep proxysql</code></td>
      <td>Confirm ProxySQL is running: <code>systemctl status proxysql</code></td>
    </tr>
  </tbody>
</table>

<h2 id="next-steps">What's Next</h2>

ProxySQL is now handling read/write splitting, connection pooling, and health monitoring. Applications connect to a single endpoint and queries are transparently routed. But ProxySQL doesn't make promotion decisions — it only detects role changes.

In <a href="/blog/proxysql-postgresql-ha-part3-orchestrator-failover.html">Part 3</a>, we install Orchestrator on the same `proxy-orch` VM and configure:

- Topology discovery via `pg_stat_replication`
- Automated failure detection
- Replica promotion with `pg_promote()`
- Post-failover hooks to notify ProxySQL

Together, ProxySQL and Orchestrator create a fully automated HA solution: Orchestrator detects failures and promotes replicas, ProxySQL detects the role change and reroutes traffic.

<div class="callout">
  <p><strong>SAVE YOUR STATE:</strong> Run <code>multipass stop --all</code> to pause VMs. Everything persists across restarts.</p>
</div>
