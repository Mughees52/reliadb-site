---
title: "PostgreSQL Failover Testing: Real Scenarios (Part 4)"
date: 2026-04-23T16:00:00.000Z
author: "Mughees Ahmed"
description: "Test automatic and manual PostgreSQL failover. Kill the primary, watch Orchestrator promote, verify ProxySQL reroutes. Real outputs."
categories:
  - postgresql
  - high-availability
read_time: 25
featured: false
coverImage: "/images/blog/proxysql-postgresql-failover-scenarios.jpg"
---

<!-- Series Navigation -->
<div class="series-nav">
  <h4>PostgreSQL HA with ProxySQL &amp; Orchestrator &mdash; 4-Part Series</h4>
  <ol>
    <li><a href="/blog/proxysql-postgresql-ha-part1-architecture-replication.html">Part 1: Architecture &amp; Streaming Replication</a></li>
    <li><a href="/blog/proxysql-postgresql-ha-part2-proxysql-read-write-splitting.html">Part 2: ProxySQL &mdash; Read/Write Splitting</a></li>
    <li><a href="/blog/proxysql-postgresql-ha-part3-orchestrator-failover.html">Part 3: Orchestrator &mdash; Topology Discovery &amp; Failover</a></li>
    <li><span class="current">Part 4: Failover Scenarios &amp; Recovery (You Are Here)</span></li>
  </ol>
</div>

This is where we break things on purpose. In the previous parts we built a 3-node PostgreSQL cluster, configured ProxySQL for read/write splitting, and set up Orchestrator for topology discovery. Now we simulate real failures and verify the system recovers correctly.

Every test in this article was run on live Multipass VMs with real PostgreSQL 17.9, ProxySQL 3.0.6, and Orchestrator 4.30.2. The outputs shown are real.

<h2 id="pre-checks">Pre-Failover Checklist</h2>

Before breaking anything, verify the entire stack is healthy. We split this into three groups — one per layer. Every check maps to a real failure mode we discovered during testing.

**PostgreSQL layer** — is replication healthy and are permissions correct?

```bash
# 1. All VMs running
multipass list | grep -E 'pg-primary|pg-replica|proxy-orch'

# 2. Both replicas streaming (expect: 2)
multipass exec pg-primary -- sudo -u postgres psql -tAc \
  "SELECT count(*) FROM pg_stat_replication WHERE state = 'streaming';"

# 3. Replication slots active (expect: 2)
multipass exec pg-primary -- sudo -u postgres psql -tAc \
  "SELECT count(*) FROM pg_replication_slots WHERE active = true;"

# 4. Orchestrator user is SUPERUSER (expect: t)
multipass exec pg-primary -- sudo -u postgres psql -tAc \
  "SELECT usesuper FROM pg_user WHERE usename = 'orchestrator';"

# 5. primary_conninfo uses IPs, not quoted hostnames
for vm in pg-replica1 pg-replica2; do
  multipass exec $vm -- sudo -u postgres \
    grep 'host=' /var/lib/postgresql/17/main/postgresql.auto.conf | tail -1
done
# If you see host=''pg-primary'' (with quotes), fix it — this breaks Orchestrator topology
```

**ProxySQL layer** — is routing working?

```bash
# 6. Primary in hostgroup 10, replicas in hostgroup 20
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin -c \
  "SELECT hostgroup_id, hostname, status FROM runtime_pgsql_servers ORDER BY hostgroup_id;"
# Expect: 1 ONLINE in hg 10, 2+ ONLINE in hg 20

# 7. No recent ping errors
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin -tAc \
  "SELECT count(*) FROM monitor.pgsql_server_ping_log WHERE ping_error != '' AND time_start_us > (SELECT max(time_start_us) - 10000000 FROM monitor.pgsql_server_ping_log);"
# Expect: 0

# 8. Write + read through ProxySQL works
multipass exec proxy-orch -- PGPASSWORD=app_pass_2026 psql -h 127.0.0.1 -p 6133 -U appuser -d appdb \
  -tAc "INSERT INTO replication_test (message) VALUES ('pre-failover-check') RETURNING id;"
# Expect: a row ID returned
```

**Orchestrator layer** — is it ready to handle a failover?

```bash
# 9. Orchestrator topology (single cluster, 1 primary + 2 replicas)
multipass exec proxy-orch -- bash -c '
  export ORCHESTRATOR_API="http://localhost:3098/api"
  orchestrator-client -c topology -i 192.168.2.6:5432
'
# Expect:
#   192.168.2.6:5432   [0s,ok,17.9,rw,>>]
#   + 192.168.2.7:5432 [null,ok,17.9,ro,>>]
#   + 192.168.2.8:5432 [null,ok,17.9,ro,>>]

# 10. Recovery mode
# Two layers: config filter + runtime toggle. Both must allow recovery.
# With RecoverMasterClusterFilters: ["_do_not_match_"], no cluster matches
# even if the runtime toggle is "enabled" — so auto-recovery is blocked.
multipass exec proxy-orch -- bash -c '
  export ORCHESTRATOR_API="http://localhost:3098/api"
  orchestrator-client -c check-global-recoveries
'
# Expect: enabled (this is the runtime toggle — safe because the config
# filter "_do_not_match_" prevents any cluster from auto-recovering)

# 11. No replication problems detected
multipass exec proxy-orch -- bash -c '
  export ORCHESTRATOR_API="http://localhost:3098/api"
  orchestrator-client -c replication-analysis
'
# Expect: empty output (no problems)
```

<div class="callout-danger">
  <p><strong>STOP if any check fails.</strong> The three silent killers for automated failover are: (1) <code>primary_conninfo</code> with quoted hostnames → topology split → Orchestrator sees <code>DeadMasterWithoutReplicas</code>, (2) orchestrator user missing SUPERUSER → <code>pg_promote()</code> returns <code>permission denied</code>, (3) stale recovery history blocks new recoveries for <code>RecoveryPeriodBlockSeconds</code>.</p>
</div>

<h2 id="pre-failover-state">Step 1: Capture the Pre-Failover State</h2>

Before breaking anything, document the healthy state across all three layers. This gives us a baseline to compare against after each failover.

```bash
# PostgreSQL replication
multipass exec pg-primary -- sudo -u postgres psql -c \
  "SELECT client_addr, state, sync_state FROM pg_stat_replication;"
```

```
 client_addr |   state   | sync_state
-------------+-----------+------------
 192.168.2.7 | streaming | async
 192.168.2.8 | streaming | async
```

```bash
# ProxySQL routing
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin \
  -c "SELECT hostgroup_id, hostname, port, status FROM runtime_pgsql_servers ORDER BY hostgroup_id;"
```

```
 hostgroup_id |  hostname   | port | status
--------------+-------------+------+--------
 10           | pg-primary  | 5432 | ONLINE
 20           | pg-replica1 | 5432 | ONLINE
 20           | pg-replica2 | 5432 | ONLINE
```

```bash
# Orchestrator topology — the key view to check before and after every failover
multipass exec proxy-orch -- bash -c \
  'export ORCHESTRATOR_API="http://localhost:3098/api"; orchestrator-client -c topology -i 192.168.2.6:5432'
```

```
192.168.2.6:5432   [0s,ok,17.9,rw,>>]
+ 192.168.2.7:5432 [null,ok,17.9,ro,>>]
+ 192.168.2.8:5432 [null,ok,17.9,ro,>>]
```

Primary is `rw` (read-write), both replicas are `ro` (read-only), all checks `ok`.

```bash
# Insert test data for data-loss verification
multipass exec proxy-orch -- PGPASSWORD=app_pass_2026 psql \
  -h 127.0.0.1 -p 6133 -U appuser -d appdb \
  -c "INSERT INTO replication_test (message) VALUES ('Pre-failover write');"

multipass exec proxy-orch -- PGPASSWORD=app_pass_2026 psql \
  -h 127.0.0.1 -p 6133 -U appuser -d appdb \
  -c "SELECT count(*) FROM replication_test;"
```

Note the row count — we expect at least this many rows after recovery.

<h2 id="scenario1-manual-failover">Scenario 1: Manual Failover (Recommended for PostgreSQL)</h2>

This is the recommended approach for PostgreSQL. Orchestrator detects the failure and alerts you, but waits for you to verify the primary is truly dead before promoting. This avoids unnecessary promotions from network glitches — which is critical because **Orchestrator cannot rejoin an old primary as a replica in PostgreSQL** (unlike MySQL where `CHANGE REPLICATION SOURCE TO` works on any running instance).

<div class="callout">
  <p><strong>WHY MANUAL IS THE DEFAULT:</strong> If auto-failover mis-fires on a network blip, you end up with two primaries (split-brain). The old primary cannot be demoted via Orchestrator — you must run a full <code>pg_basebackup</code> to rejoin it, which can take minutes to hours on large databases. Manual mode lets you verify before promoting.</p>
</div>

<h3 id="kill-the-vm">1a. Kill the Primary VM</h3>

```bash
multipass stop pg-primary
```

This is equivalent to pulling the power cable on a physical server. PostgreSQL doesn't get a clean shutdown.

<h3 id="observe-detection">1b. Observe Failure Detection</h3>

Both ProxySQL and Orchestrator detect the failure independently. Check ProxySQL first:

```bash
# Wait for detection (monitor_ping_interval = 2000ms, max_failures = 3)
sleep 10

# Check ProxySQL's view
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin << 'EOF'
-- Ping log shows the failure
SELECT hostname, port, ping_success_time_us, ping_error
FROM monitor.pgsql_server_ping_log
ORDER BY time_start_us DESC LIMIT 9;
EOF
```

Expected output — primary ping fails while replicas stay healthy:

```
  hostname   | port | ping_success_time_us |     ping_error
-------------+------+----------------------+---------------------
 pg-replica2 | 5432 | 410                  |
 pg-primary  | 5432 | 0                    | Operation timed out
 pg-replica1 | 5432 | 2125                 |
 pg-replica2 | 5432 | 1146                 |
 pg-primary  | 5432 | 0                    | Operation timed out
 pg-primary  | 5432 | 0                    | Operation timed out
 pg-replica1 | 5432 | 1287                 |
```

Check the runtime server state:

```bash
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin \
  -c "SELECT hostgroup_id, hostname, port, status FROM runtime_pgsql_servers ORDER BY hostgroup_id;"
```

```
 hostgroup_id |  hostname   | port | status
--------------+-------------+------+---------
 20           | pg-primary  | 5432 | SHUNNED
 20           | pg-replica1 | 5432 | ONLINE
 20           | pg-replica2 | 5432 | ONLINE
```

**What happened automatically:**
1. ProxySQL's monitor detected `pg-primary` is unreachable (3 consecutive ping failures)
2. ProxySQL **shunned** `pg-primary` — no new traffic routed to it
3. Since there's no server with `read_only = 0` (no reachable primary), hostgroup 10 (writer) is now empty
4. Replicas continue serving reads in hostgroup 20

<div class="callout">
  <p><strong>IMPACT:</strong> Reads continue working. Writes fail until a new primary is promoted. This is the expected behavior — ProxySQL detects the failure but doesn't make promotion decisions.</p>
</div>

Check the Orchestrator topology — it now shows the primary as unreachable:

```bash
# Orchestrator's view during failure
multipass exec proxy-orch -- bash -c \
  'export ORCHESTRATOR_API="http://localhost:3098/api"; orchestrator-client -c topology -i 192.168.2.6:5432'
```

```
192.168.2.6:5432   [unknown,invalid,17.9,rw,>>]
+ 192.168.2.7:5432 [null,ok,17.9,ro,>>]
+ 192.168.2.8:5432 [null,ok,17.9,ro,>>]
```

The primary shows `invalid` — Orchestrator can't reach it. Replicas still `ok`.

Also check the replication analysis for the diagnosis:

```bash
multipass exec proxy-orch -- bash -c \
  'export ORCHESTRATOR_API="http://localhost:3098/api"; orchestrator-client -c replication-analysis'
```

```
192.168.2.6:5432 (cluster 192.168.2.6:5432): DeadPrimary
```

<h3 id="verify-and-promote">1c. Verify the Failure Is Real, Then Promote</h3>

Orchestrator detected `DeadPrimary` but did **not** auto-promote (manual mode is the default). Confirm it's waiting for you:

```bash
multipass exec proxy-orch -- grep "NOT Recovering" /tmp/orchestrator.log | tail -2
```

```
CheckAndRecover: Analysis: DeadPrimary, InstanceKey: 192.168.2.6:5432:
  NOT Recovering host (disabled globally)
```

Good — detection works, but no promotion yet. Now verify the primary is truly dead (not just a network blip):

```bash
multipass exec proxy-orch -- bash -c \
  'PGPASSWORD=monitor_pass_2026 psql -h 192.168.2.6 -U monitor -d postgres -c "SELECT 1;" 2>&1'
```

If this returns `Connection refused` or times out, the primary is genuinely down. Promote:

```bash
multipass exec proxy-orch -- bash -c '
  export ORCHESTRATOR_API="http://localhost:3098/api"
  orchestrator-client -c recover -i 192.168.2.6:5432
'
```

```
192.168.2.7:5432
```

Orchestrator selected `192.168.2.7` (the most caught-up replica) and called `pg_promote()`. Verify:

```bash
multipass exec pg-replica1 -- sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
```

```
 pg_is_in_recovery
-------------------
 f
```

Acknowledge the recovery to unblock future failovers:

```bash
multipass exec proxy-orch -- bash -c '
  export ORCHESTRATOR_API="http://localhost:3098/api"
  orchestrator-client -c ack-all-recoveries --reason "verified dead primary"
'
```

<div class="callout">
  <p><strong>CRITICAL PREREQUISITE:</strong> The <code>orchestrator</code> PostgreSQL user must have SUPERUSER privileges to call <code>pg_promote()</code>. Without this, the <code>recover</code> command fails with <code>permission denied for function pg_promote</code>. This is set up in <a href="/blog/proxysql-postgresql-ha-part1-architecture-replication.html">Part 1</a> when creating the user.</p>
</div>

<h3 id="auto-detection">1d. Watch ProxySQL Auto-Detect the New Primary</h3>

ProxySQL's read-only monitor checks `pg_is_in_recovery()` every 1000ms. Within seconds of the promotion, it detects that `pg-replica1` now returns `false`:

```bash
sleep 5

multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin << 'EOF'
-- ProxySQL automatically moved pg-replica1 to hostgroup 10 (writer)
SELECT hostgroup_id, hostname, port, status
FROM runtime_pgsql_servers ORDER BY hostgroup_id;

-- Read-only monitor confirms the role change
SELECT hostname, port, read_only
FROM monitor.pgsql_server_read_only_log
ORDER BY time_start_us DESC LIMIT 6;
EOF
```

Expected output:

```
 hostgroup_id |  hostname   | port | status
--------------+-------------+------+---------
 10           | pg-replica1 | 5432 | ONLINE
 20           | pg-primary  | 5432 | SHUNNED
 20           | pg-replica1 | 5432 | ONLINE
 20           | pg-replica2 | 5432 | ONLINE

  hostname   | port | read_only
-------------+------+-----------
 pg-replica2 | 5432 | 1
 pg-replica1 | 5432 | 0
 pg-replica2 | 5432 | 1
 pg-replica1 | 5432 | 0
 pg-replica2 | 5432 | 1
 pg-replica1 | 5432 | 0
```

**ProxySQL automatically:**
- Moved `pg-replica1` to hostgroup 10 (writer) because `read_only = 0`
- Kept `pg-replica1` in hostgroup 20 too (because `writer_is_also_reader = true`)
- Kept `pg-primary` shunned (still unreachable)
- `pg-replica2` remains a reader

<h3 id="verify-through-proxy">1e. Verify End-to-End Through ProxySQL</h3>

```bash
# Write through ProxySQL (goes to pg-replica1, the new primary)
multipass exec proxy-orch -- PGPASSWORD=app_pass_2026 psql \
  -h 127.0.0.1 -p 6133 -U appuser -d appdb \
  -c "INSERT INTO replication_test (message) VALUES ('Post-failover write via ProxySQL');"

sleep 1

# Read through ProxySQL (goes to replicas)
multipass exec proxy-orch -- PGPASSWORD=app_pass_2026 psql \
  -h 127.0.0.1 -p 6133 -U appuser -d appdb \
  -c "SELECT * FROM replication_test ORDER BY id;"

# Verify query routing
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin \
  -c "SELECT hostgroup hg, digest_text, count_star FROM stats_pgsql_query_digest ORDER BY count_star DESC;"
```

Writes go to hostgroup 10 (new primary), reads go to hostgroup 20 — routing is correct.

Check the Orchestrator topology after the automatic promotion:

```bash
multipass exec proxy-orch -- bash -c \
  'export ORCHESTRATOR_API="http://localhost:3098/api"; orchestrator-client -c topology -i 192.168.2.7:5432'
```

```
192.168.2.7:5432   [0s,ok,17.9,rw,>>]
+ 192.168.2.8:5432 [null,ok,17.9,ro,>>]
```

The promoted replica is now the `rw` primary.

<h2 id="scenario2-auto-failover">Scenario 2: Automatic Failover (Optional)</h2>

If you accept the risk of false-positive promotions and prefer faster recovery over safety, you can test automatic failover. The difference from Scenario 1: you skip step 1c (manual promote) — Orchestrator calls `pg_promote()` for you within seconds.

<div class="callout-danger">
  <p><strong>UNDERSTAND THE RISK:</strong> If auto-failover triggers on a network glitch, the old primary cannot be rejoined via Orchestrator. You'll need a full <code>pg_basebackup</code> to demote it back to a replica. Only enable this if your network is stable and you accept that cost.</p>
</div>

To test automatic mode, first rebuild a clean cluster (see Phase 1), then:

**2a. Enable auto-recovery in the config:**

```bash
# On proxy-orch: edit config to match all clusters
multipass exec proxy-orch -- sudo sed -i \
  's/"_do_not_match_"/".*"/g' /usr/local/orchestrator/orchestrator.conf.json
```

Restart Orchestrator for the config change to take effect:

```bash
multipass exec proxy-orch -- sudo bash -c '
  killall orchestrator; sleep 2
  rm -f /usr/local/orchestrator/orchestrator.sqlite3
  nohup /usr/local/orchestrator/orchestrator \
    -config /usr/local/orchestrator/orchestrator.conf.json http > /tmp/orchestrator.log 2>&1 &
'
```

Wait 8 seconds, discover the topology, then verify:

```bash
multipass exec proxy-orch -- bash -c '
  export ORCHESTRATOR_API="http://localhost:3098/api"
  sleep 8
  orchestrator-client -c discover -i 192.168.2.6:5432
  sleep 8
  orchestrator-client -c topology -i 192.168.2.6:5432
'
```

**2b. Kill the primary and wait:**

```bash
multipass stop pg-primary
```

Wait 25 seconds. Orchestrator detects `DeadPrimary` and promotes automatically — no `recover` command needed.

**2c. Verify auto-promotion happened:**

```bash
multipass exec proxy-orch -- cat /tmp/orchestrator-recovery.log
```

You should see:
```
Detected DeadPrimary on 192.168.2.6:5432. Affected replicas: 2
Master failover complete. Failed: 192.168.2.6:5432; Promoted: 192.168.2.7:5432
```

**2d. Revert to manual mode after testing:**

```bash
multipass exec proxy-orch -- sudo sed -i \
  's/"\.\*"/"_do_not_match_"/g' /usr/local/orchestrator/orchestrator.conf.json
```

Restart Orchestrator to pick up the config change.

<h2 id="scenario3-rewire-replica">Scenario 3: Rewire the Surviving Replica</h2>

After promoting `pg-replica1`, `pg-replica2` is still connected to the old primary (which is down). We need to point it to the new primary.

<h3 id="re-basebackup">3a. Re-Basebackup from the New Primary</h3>

A simple `ALTER SYSTEM SET primary_conninfo` is not enough — the replication slot is tied to the old primary. The cleanest approach is a fresh `pg_basebackup`:

```bash
# Create a replication slot for replica2 on the new primary
multipass exec pg-replica1 -- sudo -u postgres psql \
  -c "SELECT pg_create_physical_replication_slot('replica2_slot');"

# Re-basebackup replica2 from the new primary
multipass exec pg-replica2 -- sudo bash -c '
  systemctl stop postgresql
  sudo -u postgres rm -rf /var/lib/postgresql/17/main/*

  sudo -u postgres PGPASSWORD=repl_pass_2026 pg_basebackup \
    -h pg-replica1 \
    -U replicator \
    -D /var/lib/postgresql/17/main \
    -Fp -Xs -P -R \
    -S replica2_slot

  systemctl start postgresql
'
```

<h3 id="verify-rewire">3b. Verify Replication from the New Primary</h3>

```bash
# Check the new primary's replication status
multipass exec pg-replica1 -- sudo -u postgres psql \
  -c "SELECT client_addr, state, sync_state FROM pg_stat_replication;"
```

Expected output:

```
 client_addr |   state   | sync_state
-------------+-----------+------------
 192.168.2.8 | streaming | async
```

```bash
# Verify replica2 has all the data (including post-failover writes)
multipass exec pg-replica2 -- sudo -u postgres psql -d appdb \
  -c "SELECT * FROM replication_test ORDER BY id;"
```

All rows should be present, including rows written after the failover.

<h2 id="scenario4-rejoin-old-primary">Scenario 4: Rejoin the Old Primary as a Replica</h2>

The old primary can't simply start up and resume — its timeline has diverged. We rejoin it as a replica of the new primary.

<div class="callout-danger">
  <p><strong>CAN ORCHESTRATOR REJOIN FOR YOU?</strong> No. We tested every Orchestrator method — <code>relocate</code>, <code>move-below</code>, <code>repoint</code>, <code>move-gtid</code>, <code>set-read-only</code>, <code>start-replica</code> — both via CLI and HTTP API. All fail for PostgreSQL:</p>
  <ul>
    <li><code>relocate</code> → <code>Identical server id: both have 0</code> (PostgreSQL has no server_id)</li>
    <li><code>move-below</code> / <code>repoint</code> → <code>instance is not replicating</code> (old primary is standalone)</li>
    <li><code>set-read-only</code> → <code>invalid connection</code> (PostgreSQL uses <code>pg_is_in_recovery()</code>, not <code>SET GLOBAL read_only</code>)</li>
  </ul>
  <p>This is a fundamental difference from MySQL where <code>CHANGE REPLICATION SOURCE TO</code> works on any running instance. In PostgreSQL, rejoining requires <strong><code>pg_rewind</code></strong> (fast, requires <code>wal_log_hints=on</code>) or <strong><code>pg_basebackup</code></strong> (slower, always works). Both are PostgreSQL-native tools.</p>
</div>

<h3 id="start-and-basebackup">4a. Start the VM and Re-Basebackup</h3>

```bash
# Start the old primary VM
multipass start pg-primary

# Wait for it to boot
sleep 10

# Re-add /etc/hosts (may be lost after VM restart)
multipass exec pg-primary -- sudo bash -c 'cat >> /etc/hosts << EOF
192.168.2.6  pg-primary
192.168.2.7  pg-replica1
192.168.2.8  pg-replica2
192.168.2.9  proxy-orch
EOF'

# Create a replication slot on the new primary
multipass exec pg-replica1 -- sudo -u postgres psql \
  -c "SELECT pg_create_physical_replication_slot('replica1_slot');"

# Re-basebackup the old primary as a new replica
multipass exec pg-primary -- sudo bash -c '
  systemctl stop postgresql
  sudo -u postgres rm -rf /var/lib/postgresql/17/main/*

  sudo -u postgres PGPASSWORD=repl_pass_2026 pg_basebackup \
    -h pg-replica1 \
    -U replicator \
    -D /var/lib/postgresql/17/main \
    -Fp -Xs -P -R \
    -S replica1_slot

  systemctl start postgresql
'
```

<h3 id="verify-rejoin">4b. Verify the Old Primary Is Now a Replica</h3>

```bash
# Should return 't' — it's now in recovery mode (a replica)
multipass exec pg-primary -- sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
```

```
 pg_is_in_recovery
-------------------
 t
```

```bash
# Should show all data including post-failover writes
multipass exec pg-primary -- sudo -u postgres psql -d appdb \
  -c "SELECT * FROM replication_test ORDER BY id;"

# New primary should show 2 replicas streaming
multipass exec pg-replica1 -- sudo -u postgres psql \
  -c "SELECT client_addr, state, sync_state FROM pg_stat_replication;"
```

Expected output:

```
 client_addr |   state   | sync_state
-------------+-----------+------------
 192.168.2.6 | streaming | async
 192.168.2.8 | streaming | async
```

<h3 id="proxysql-auto-recovers">4c. ProxySQL Automatically Detects the Rejoined Server</h3>

Within a few monitor cycles, ProxySQL detects that `pg-primary` is back online and serving as a reader:

```bash
sleep 10

multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin \
  -c "SELECT hostgroup_id, hostname, port, status FROM runtime_pgsql_servers ORDER BY hostgroup_id;"
```

Expected output:

```
 hostgroup_id |  hostname   | port | status
--------------+-------------+------+--------
 10           | pg-replica1 | 5432 | ONLINE
 20           | pg-primary  | 5432 | ONLINE
 20           | pg-replica1 | 5432 | ONLINE
 20           | pg-replica2 | 5432 | ONLINE
```

`pg-primary` moves from SHUNNED to ONLINE in hostgroup 20 — automatically, with zero manual intervention.

<h2 id="final-topology">Final Topology After Recovery</h2>

<img src="/images/blog/svg-pg-ha-topology-change.svg" alt="PostgreSQL topology before and after failover showing primary promotion and replica rewiring" style="width:100%;max-width:900px;margin:1.5em auto;display:block;" />

```
                  ┌─────────────────┐
                  │   pg-replica1   │
                  │  (NEW PRIMARY)  │
                  │   .2.7:5432     │
                  └────────┬────────┘
                           │ WAL streaming
                ┌──────────┴──────────┐
                │                     │
        ┌───────┴────────┐   ┌───────┴────────┐
        │  pg-primary    │   │  pg-replica2   │
        │  (NOW REPLICA) │   │  (REPLICA)     │
        │  .2.6:5432     │   │  .2.8:5432     │
        └────────────────┘   └────────────────┘
```

<h2 id="failover-timeline">Failover Timeline</h2>

Based on our actual test, here's how long each phase took:

<table>
  <thead>
    <tr><th>Phase</th><th>Duration</th><th>What Happens</th></tr>
  </thead>
  <tbody>
    <tr><td>Primary failure</td><td>0s</td><td>VM stopped (simulated crash)</td></tr>
    <tr><td>ProxySQL detects failure</td><td>~6s</td><td>3 failed pings × 2s interval = shunned</td></tr>
    <tr><td>Reads impact</td><td>None</td><td>Replicas continue serving in hostgroup 20</td></tr>
    <tr><td>Writes impact</td><td>Until promotion</td><td>Hostgroup 10 empty — writes fail</td></tr>
    <tr><td>Replica promotion</td><td>&lt;1s</td><td><code>pg_promote()</code> returns instantly</td></tr>
    <tr><td>ProxySQL detects new primary</td><td>~1-3s</td><td>Read-only monitor detects <code>pg_is_in_recovery() = false</code></td></tr>
    <tr><td>Writes restored</td><td>~7-9s total</td><td>New primary accepting writes through ProxySQL</td></tr>
    <tr><td>Replica rewiring</td><td>~30s</td><td><code>pg_basebackup</code> + restart</td></tr>
    <tr><td>Old primary rejoin</td><td>~30s</td><td><code>pg_basebackup</code> + restart</td></tr>
    <tr><td>Full recovery</td><td>~90s</td><td>All 3 nodes healthy, ProxySQL routing correct</td></tr>
  </tbody>
</table>

<h2 id="data-loss-check">Data Loss Verification</h2>

Critical question: did we lose any data?

```bash
multipass exec proxy-orch -- PGPASSWORD=app_pass_2026 psql \
  -h 127.0.0.1 -p 6133 -U appuser -d appdb \
  -c "SELECT * FROM replication_test ORDER BY id;"
```

```
 id |                message                |          created_at
----+---------------------------------------+-------------------------------
  1 | Hello from primary                    | 2026-04-23 08:41:02.588863+00
  2 | Replication works!                    | 2026-04-23 08:41:02.590394+00
  3 | Written via ProxySQL!                 | 2026-04-23 08:45:36.376164+00
  4 | Pre-failover write                    | 2026-04-23 08:48:21.700161+00
 37 | Written after failover to replica1!   | 2026-04-23 08:52:30.178877+00
 38 | Post-failover write via ProxySQL      | 2026-04-23 08:56:42.402886+00
 39 | Final test - topology fully recovered | 2026-04-23 09:00:42.18468+00
```

**Zero data loss.** All rows written before, during, and after the failover are present.

<div class="callout">
  <p><strong>WHY NO DATA LOSS:</strong> With asynchronous replication, there's a theoretical window where committed writes on the primary haven't reached replicas. In our test, the system was idle when we killed the primary, so all WAL was already replicated. In production with write-heavy workloads, consider synchronous replication (<code>synchronous_commit = on</code>) if zero data loss is mandatory.</p>
</div>

<h2 id="issues-found">Issues and Gotchas Found During Testing</h2>

We hit 6 real issues during failover testing. **Issues 1-2 are critical** — they silently prevent automated failover with no error visible to the application. Issues 3-6 are recovery complications you'll encounter during replica rewiring and node rejoining.

We hit several real problems during failover testing. These are the kind of issues you'll encounter in production — and the fixes aren't always obvious.

<h3 id="issue-orchestrator-hostname">Issue 1: Orchestrator Topology Split (Hostname Quoting Bug)</h3>

When Orchestrator discovered the replicas, it read their `primary_conninfo` and saw the hostname with escaped quotes. PostgreSQL's `pg_basebackup -R` generates connection strings like:

```
primary_conninfo = '...host=''pg-primary''...'
```

Those double single quotes caused Orchestrator to register the primary as `'pg-primary':5432` (with quotes) for the replicas' cluster, while the primary itself was registered as `pg-primary:5432` (without quotes). This created **two separate clusters**:

```
Cluster: 'pg-primary':5432   Members: 2   ← replicas
Cluster: pg-primary:5432     Members: 1   ← primary alone
```

When the primary failed, Orchestrator classified it as `DeadMasterWithoutReplicas` — it couldn't find replicas because they were in a different cluster. **Automated failover did not trigger.**

<div class="callout-danger">
  <p><strong>FIX:</strong> Use IP addresses instead of hostnames in <code>primary_conninfo</code>. After <code>pg_basebackup -R</code>, edit <code>postgresql.auto.conf</code> on each replica to replace the hostname with an IP. Also seed the topology using <code>/api/discover/&lt;primary-ip&gt;/5432</code> (IP, not hostname). Once we did this, Orchestrator saw a single clean cluster and automated failover worked correctly.</p>
</div>

<h3 id="issue-orchestrator-permissions">Issue 2: Orchestrator User Needs SUPERUSER for pg_promote()</h3>

On our first failover attempt after fixing the topology split, Orchestrator correctly detected `DeadPrimary` and tried to promote a replica — but the promotion failed:

```
PostgreSQLPromoteStandby: pg_promote() failed on 192.168.2.6:5432:
  pq: permission denied for function pg_promote (42501)
```

The `orchestrator` user had `pg_monitor` role (read-only access to system views), but `pg_promote()` requires **SUPERUSER** or the `pg_checkpoint` role (PostgreSQL 16+). Orchestrator kept retrying every second, but every attempt failed with the same permission error.

**Fix:** Grant SUPERUSER to the orchestrator user on the primary (replicates to all replicas):

```sql
ALTER USER orchestrator WITH SUPERUSER;
```

After fixing this, the next failover test worked perfectly — Orchestrator called `pg_promote()` automatically and the promoted replica became the new primary within seconds.

<h3 id="issue-replication-slot">Issue 3: ALTER SYSTEM primary_conninfo Is Not Enough After Failover</h3>

After promoting `pg-replica1`, we first tried the "quick" approach to rewire `pg-replica2`:

```sql
-- This did NOT work
ALTER SYSTEM SET primary_conninfo = 'user=replicator password=repl_pass_2026 host=pg-replica1 port=5432';
SELECT pg_reload_conf();
```

After restarting PostgreSQL, `pg-replica2` came up but served **stale data** — only 4 rows instead of the 6 that existed on the new primary. The replication slot (`replica2_slot`) was created on the old primary and doesn't exist on the new primary. The WAL timeline had also diverged.

**Fix:** A full `pg_basebackup` from the new primary is required. Create a new replication slot on the new primary first, then re-basebackup:

```bash
# On new primary
SELECT pg_create_physical_replication_slot('replica2_slot');

# On the replica - full re-sync
pg_basebackup -h pg-replica1 -U replicator -D /var/lib/postgresql/17/main -Fp -Xs -P -R -S replica2_slot
```

<h3 id="issue-etc-hosts">Issue 4: /etc/hosts Lost After VM Restart</h3>

When we restarted the old primary VM (`multipass start pg-primary`), the `/etc/hosts` entries we'd added were preserved on disk but DNS resolution failed temporarily. The first `pg_basebackup` attempt to rejoin the old primary as a replica failed:

```
pg_basebackup: error: could not translate host name "pg-replica1"
to address: Temporary failure in name resolution
```

**Fix:** Re-add `/etc/hosts` entries after VM restart, or use a proper DNS setup. In production, use DNS with low TTLs rather than `/etc/hosts` files. Cloud environments (AWS, GCP) provide internal DNS that survives reboots.

<h3 id="issue-permissions">Issue 5: Table Permissions Not Granted to Application User</h3>

The first write through ProxySQL failed with:

```
ERROR: permission denied for table replication_test
```

The test table was created by the `postgres` superuser during replication verification, but `appuser` had no grants. This is easy to miss when you test directly as `postgres` and then switch to the application user through ProxySQL.

**Fix:** Grant permissions explicitly, and set default privileges for future tables:

```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO appuser;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser;
```

<h3 id="issue-write-gap">Issue 6: Write Unavailability Window</h3>

Between the primary dying and the new primary being promoted, **hostgroup 10 (writer) was completely empty** in ProxySQL. Any application writes during this window fail with a connection error. Reads continued uninterrupted on hostgroup 20.

The window was approximately **7-9 seconds** in our test:
- ~6 seconds for ProxySQL to shun the primary (3 failed pings × 2s interval)
- ~1 second for `pg_promote()` to complete
- ~1-2 seconds for ProxySQL's read-only monitor to detect the new primary

**Mitigation options:**
- Reduce `pgsql-monitor_ping_interval` to 1000ms and `ping_max_failures` to 2 for faster detection (~3-4s window)
- Use application-level retry logic with short backoff for write failures
- Implement synchronous replication to guarantee the promoted replica has all committed data

<h2 id="production-checklist">Production Hardening Checklist</h2>

Our lab setup works but isn't production-ready. Here's what to add:

<table>
  <thead>
    <tr><th>Priority</th><th>Area</th><th>Lab Setting</th><th>Production Recommendation</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>Critical</strong></td><td>SSL</td><td>Disabled</td><td>Enable <code>PostgreSQLSSLMode: require</code> for Orchestrator, SSL on ProxySQL</td></tr>
    <tr><td><strong>Critical</strong></td><td>Authentication</td><td>Passwords in config</td><td>Use <code>.pgpass</code> files, environment variables, or a secrets manager</td></tr>
    <tr><td><strong>Critical</strong></td><td>Orchestrator HA</td><td>Single node + SQLite</td><td>3-node Raft cluster with MySQL/PostgreSQL backend</td></tr>
    <tr><td><strong>High</strong></td><td>Alerting</td><td>Log files</td><td>Orchestrator hooks → PagerDuty/Slack/email</td></tr>
    <tr><td><strong>High</strong></td><td>Backup</td><td>None</td><td>pgBackRest or Barman for continuous WAL archiving</td></tr>
    <tr><td><strong>High</strong></td><td>ProxySQL HA</td><td>Single instance</td><td>ProxySQL Cluster (native replication between instances)</td></tr>
    <tr><td><strong>High</strong></td><td>Network</td><td><code>/etc/hosts</code></td><td>Proper DNS with low TTL for failover</td></tr>
    <tr><td>Medium</td><td>Sync replication</td><td>Async</td><td>Consider <code>synchronous_standby_names = 'ANY 1 (...)'</code> for zero RPO</td></tr>
    <tr><td>Medium</td><td>Monitoring</td><td>Orchestrator UI</td><td>Export to Prometheus/Grafana via metrics endpoint</td></tr>
    <tr><td>Medium</td><td>WAL archiving</td><td>None</td><td><code>archive_mode = on</code> + pgBackRest for point-in-time recovery</td></tr>
    <tr><td>Medium</td><td>Connection limits</td><td>Default</td><td>Size based on workload; ProxySQL multiplexing reduces backend load</td></tr>
  </tbody>
</table>

<h2 id="cleanup">Lab Cleanup</h2>

When you're done testing, clean up the VMs:

```bash
# Stop all VMs (preserves state for future use)
multipass stop pg-primary pg-replica1 pg-replica2 proxy-orch

# Or delete everything permanently
multipass delete pg-primary pg-replica1 pg-replica2 proxy-orch
multipass purge
```

<h2 id="key-takeaways">Key Takeaways</h2>

1. **ProxySQL's read-only monitor is the linchpin.** By polling `pg_is_in_recovery()` every second, ProxySQL detects role changes within 1-3 seconds of a promotion — often before any hook script runs.

2. **Manual failover is the right default for PostgreSQL.** Unlike MySQL, PostgreSQL has no way to rejoin an old primary via Orchestrator (`relocate`, `move-below`, `repoint` all fail). If auto-failover triggers on a network glitch, you're stuck with a full `pg_basebackup` to rejoin the old primary. Manual mode (`orchestrator-client -c recover`) lets you verify the failure is real first.

3. **Orchestrator promotes via `pg_promote()`, just like MySQL.** The promotion itself works identically — Orchestrator selects the most caught-up replica and promotes it. Two prerequisites: (a) use IP addresses in `primary_conninfo` to avoid the hostname quoting bug, and (b) grant the orchestrator user SUPERUSER for `pg_promote()` access.

4. **Re-basebackup is required after failover.** You can't simply change `primary_conninfo` on a replica — the replication slot and timeline are tied to the old primary. A fresh `pg_basebackup` from the new primary is the cleanest approach. Orchestrator cannot do this for you.

5. **Zero-downtime reads, brief write outage.** Reads continued uninterrupted during the entire failover. Writes were unavailable until the operator verified and promoted (~1-2 minutes of investigation + seconds for promotion).

6. **ProxySQL auto-heals.** When a shunned server comes back online and passes health checks, ProxySQL automatically moves it to ONLINE — no manual intervention needed.

<h2 id="series-summary">Series Summary</h2>

Across four parts, we built a fully functional PostgreSQL HA stack:

<table>
  <thead>
    <tr><th>Part</th><th>What We Built</th><th>Key Outcome</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/blog/proxysql-postgresql-ha-part1-architecture-replication.html">Part 1</a></td>
      <td>3-node PostgreSQL streaming replication</td>
      <td>1 primary + 2 replicas with replication slots</td>
    </tr>
    <tr>
      <td><a href="/blog/proxysql-postgresql-ha-part2-proxysql-read-write-splitting.html">Part 2</a></td>
      <td>ProxySQL 3.0.6 read/write splitting</td>
      <td>Automatic query routing via <code>pg_is_in_recovery()</code></td>
    </tr>
    <tr>
      <td><a href="/blog/proxysql-postgresql-ha-part3-orchestrator-failover.html">Part 3</a></td>
      <td>Orchestrator 4.30.2 topology management</td>
      <td>Discovery, health monitoring, failover hooks</td>
    </tr>
    <tr>
      <td>Part 4 (this post)</td>
      <td>Failover testing and recovery</td>
      <td>Zero data loss, ~9s write downtime, automatic routing recovery</td>
    </tr>
  </tbody>
</table>

**Software versions tested:**
- PostgreSQL 17.9 (Ubuntu 17.9-1.pgdg24.04+1)
- ProxySQL 3.0.6 (codename Truls)
- Orchestrator 4.30.2 (ProxySQL fork, Apache 2.0)
- Ubuntu 24.04 LTS on Multipass 1.15.1

<div class="callout">
  <p><strong>WANT HELP SETTING THIS UP IN PRODUCTION?</strong> ReliaDB provides PostgreSQL HA consulting — architecture design, deployment, and 24/7 support. <a href="/contact.html">Get in touch</a>.</p>
</div>
