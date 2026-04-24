---
title: "Orchestrator PostgreSQL Failover Configuration (Part 3)"
date: 2026-04-23T14:00:00.000Z
author: "Mughees Ahmed"
description: "Install Orchestrator 4.30.2 for PostgreSQL. Configure topology discovery, automatic and manual failover with pg_promote()."
categories:
  - postgresql
  - high-availability
read_time: 20
featured: false
coverImage: "/images/blog/proxysql-orchestrator-postgresql-failover.jpg"
---

<!-- Series Navigation -->
<div class="series-nav">
  <h4>PostgreSQL HA with ProxySQL &amp; Orchestrator &mdash; 4-Part Series</h4>
  <ol>
    <li><a href="/blog/proxysql-postgresql-ha-part1-architecture-replication.html">Part 1: Architecture &amp; Streaming Replication</a></li>
    <li><a href="/blog/proxysql-postgresql-ha-part2-proxysql-read-write-splitting.html">Part 2: ProxySQL &mdash; Read/Write Splitting</a></li>
    <li><span class="current">Part 3: Orchestrator &mdash; Topology Discovery &amp; Failover (You Are Here)</span></li>
    <li><a href="/blog/proxysql-postgresql-ha-part4-integration-failover-scenarios.html">Part 4: End-to-End Integration &amp; Failover Scenarios</a></li>
  </ol>
</div>

ProxySQL handles traffic routing and detects role changes automatically (as we saw in <a href="/blog/proxysql-postgresql-ha-part2-proxysql-read-write-splitting.html">Part 2</a>), but it doesn't make promotion decisions. When the primary fails, something needs to promote a replica and rewire the remaining replicas to follow the new primary.

That's Orchestrator's job. The ProxySQL team <a href="https://proxysql.com/blog/announcing-proxysql-takes-over-orchestrator/">forked Orchestrator</a> and added PostgreSQL streaming replication support — topology discovery via <a href="https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW">pg_stat_replication</a>, failure detection, and automated promotion via <a href="https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-RECOVERY-CONTROL">pg_promote()</a>. Version 4.30+ supports PostgreSQL 15, 16, and 17.

<h2 id="what-orchestrator-does">What Orchestrator Does for PostgreSQL</h2>

<table>
  <thead>
    <tr><th>Capability</th><th>How It Works</th></tr>
  </thead>
  <tbody>
    <tr><td>Topology discovery</td><td>Queries <code>pg_stat_replication</code> on the primary to find connected replicas</td></tr>
    <tr><td>Health monitoring</td><td>Polls every instance at <code>InstancePollSeconds</code> intervals</td></tr>
    <tr><td>Failure detection</td><td>Classifies failures (DeadMaster, UnreachableMaster, etc.)</td></tr>
    <tr><td>Automated promotion</td><td>Calls <code>pg_promote()</code> on the best replica candidate</td></tr>
    <tr><td>Replica rewiring</td><td>Updates <code>primary_conninfo</code> on surviving replicas</td></tr>
    <tr><td>Hook execution</td><td>Runs post-failover scripts to notify ProxySQL</td></tr>
    <tr><td>Web UI</td><td>Visual topology on port 3098</td></tr>
    <tr><td>REST API</td><td>Full API for discovery, recovery, and topology management</td></tr>
  </tbody>
</table>

<h2 id="install-orchestrator">Step 1: Install Orchestrator 4.30</h2>

Download and install the Orchestrator deb package on the `proxy-orch` VM:

```bash
# For ARM64 (Apple Silicon):
multipass exec proxy-orch -- sudo bash -c '
  wget -q https://github.com/ProxySQL/orchestrator/releases/download/v4.30.2/orchestrator_4.30.2_arm64.deb \
    -O /tmp/orchestrator.deb
  dpkg -i /tmp/orchestrator.deb
'

# For x86_64, replace arm64 with amd64 in the URL
```

The binary installs to `/usr/local/orchestrator/orchestrator`.

Also install `orchestrator-client` — a lightweight bash CLI that wraps the HTTP API. It gives you clean, scriptable access to topology and failover commands without writing `curl | python3` pipelines:

```bash
# For ARM64 (Apple Silicon):
multipass exec proxy-orch -- sudo bash -c '
  wget -q https://github.com/ProxySQL/orchestrator/releases/download/v4.30.2/orchestrator-client_4.30.2_arm64.deb \
    -O /tmp/orch-client.deb
  dpkg -i /tmp/orch-client.deb
'

# For x86_64, replace arm64 with amd64
```

Set the API endpoint (add this to `.bashrc` for persistence):

```bash
multipass exec proxy-orch -- bash -c '
  echo "export ORCHESTRATOR_API=http://localhost:3098/api" >> ~/.bashrc
  export ORCHESTRATOR_API="http://localhost:3098/api"
  orchestrator-client -c help | head -5
'
```

<h2 id="configure-orchestrator">Step 2: Create the PostgreSQL Configuration</h2>

Orchestrator's PostgreSQL support is activated by setting `ProviderType` to `postgresql`. The config file has four sections:

1. **Connection** — how Orchestrator connects to PostgreSQL backends
2. **Polling** — how often it checks each instance
3. **Recovery** — what to do when a primary dies (auto-promote or not)
4. **Hooks** — shell commands to run at each failover stage

Create the configuration file:

```bash
multipass exec proxy-orch -- sudo bash -c 'cat > /usr/local/orchestrator/orchestrator.conf.json << EOFCONFIG
{
  "Debug": true,
  "EnableSyslog": false,
  "ListenAddress": ":3098",

  "ProviderType": "postgresql",
  "PostgreSQLTopologyUser": "orchestrator",
  "PostgreSQLTopologyPassword": "orch_pass_2026",
  "PostgreSQLSSLMode": "disable",

  "DefaultInstancePort": 5432,
  "BackendDB": "sqlite",
  "SQLite3DataFile": "/usr/local/orchestrator/orchestrator.sqlite3",
  "InstancePollSeconds": 3,

  "UnseenInstanceForgetHours": 240,
  "SnapshotTopologiesIntervalHours": 0,
  "HostnameResolveMethod": "default",

  "ReasonableReplicationLagSeconds": 10,
  "ReasonableMaintenanceReplicationLagSeconds": 20,

  "FailureDetectionPeriodBlockMinutes": 1,
  "RecoveryPeriodBlockSeconds": 60,
  "RecoverMasterClusterFilters": ["_do_not_match_"],
  "RecoverIntermediateMasterClusterFilters": ["_do_not_match_"],

  "OnFailureDetectionProcesses": [
    "echo \"Detected {failureType} on {failureCluster}. Affected replicas: {countSlaves}\" >> /tmp/orchestrator-recovery.log"
  ],
  "PreFailoverProcesses": [
    "echo \"Will recover from {failureType} on {failureCluster}\" >> /tmp/orchestrator-recovery.log"
  ],
  "PostFailoverProcesses": [
    "echo \"Recovered from {failureType} on {failureCluster}. Failed: {failedHost}:{failedPort}; Successor: {successorHost}:{successorPort}\" >> /tmp/orchestrator-recovery.log"
  ],
  "PostMasterFailoverProcesses": [
    "echo \"Master failover complete. Failed: {failedHost}:{failedPort}; Promoted: {successorHost}:{successorPort}\" >> /tmp/orchestrator-recovery.log"
  ],

  "StatusEndpoint": "/api/status",
  "StatusSimpleHealth": true,
  "HTTPAuthUser": "",
  "HTTPAuthPassword": "",
  "PowerAuthUsers": ["*"],
  "ReadOnly": false
}
EOFCONFIG'
```

**Key configuration explained:**

<table>
  <thead>
    <tr><th>Setting</th><th>Value</th><th>Purpose</th></tr>
  </thead>
  <tbody>
    <tr><td><code>ProviderType</code></td><td><code>postgresql</code></td><td>Activates the PostgreSQL code path (uses libpq protocol)</td></tr>
    <tr><td><code>PostgreSQLTopologyUser</code></td><td><code>orchestrator</code></td><td>User with <code>pg_monitor</code> role for reading topology and <strong>SUPERUSER</strong> for calling <code>pg_promote()</code> during failover</td></tr>
    <tr><td><code>PostgreSQLSSLMode</code></td><td><code>disable</code></td><td>No SSL for lab VMs (use <code>require</code> in production)</td></tr>
    <tr><td><code>InstancePollSeconds</code></td><td>3</td><td>Check each instance every 3 seconds</td></tr>
    <tr><td><code>FailureDetectionPeriodBlockMinutes</code></td><td>1</td><td>Minimum 1 minute between failover detections (prevents flapping)</td></tr>
    <tr><td><code>RecoveryPeriodBlockSeconds</code></td><td>60</td><td>Block duplicate recovery for 60 seconds after a failover</td></tr>
    <tr><td><code>RecoverMasterClusterFilters</code></td><td><code>["_do_not_match_"]</code></td><td><strong>Manual mode.</strong> No cluster name matches this regex, so auto-recovery never triggers. Detection and alerting still work. Promotion requires <code>orchestrator-client -c recover</code>. Note: <code>check-global-recoveries</code> is a separate runtime toggle that defaults to <code>enabled</code> — both the toggle AND a matching filter are required for auto-recovery.</td></tr>
    <tr><td><code>BackendDB</code></td><td><code>sqlite</code></td><td>Uses local SQLite for state storage (sufficient for single-node Orchestrator)</td></tr>
  </tbody>
</table>

<h2 id="start-orchestrator">Step 3: Start Orchestrator</h2>

```bash
multipass exec proxy-orch -- sudo bash -c '
  nohup /usr/local/orchestrator/orchestrator \
    -config /usr/local/orchestrator/orchestrator.conf.json \
    http > /tmp/orchestrator.log 2>&1 &

  sleep 3
  pgrep -f orchestrator && echo "Orchestrator running" || echo "FAILED"
'
```

Check the startup log:

```bash
multipass exec proxy-orch -- tail -5 /tmp/orchestrator.log
```

Expected output:

```
INFO continuous discovery: using PostgreSQL provider
INFO continuous discovery: starting
```

<h2 id="discover-topology">Step 4: Discover the Topology</h2>

Seed Orchestrator with the primary instance. It will automatically discover replicas by querying `pg_stat_replication`:

```bash
multipass exec proxy-orch -- curl -s http://localhost:3098/api/discover/pg-primary/5432
```

Expected response (truncated):

```json
{
  "Code": "OK",
  "Message": "Instance discovered: pg-primary:5432",
  "Details": {
    "Key": {"Hostname": "pg-primary", "Port": 5432},
    "Version": "17.9",
    "ReadOnly": false,
    "Replicas": [
      {"Hostname": "192.168.2.7", "Port": 5432},
      {"Hostname": "192.168.2.8", "Port": 5432}
    ],
    "ProviderType": "postgresql"
  }
}
```

Orchestrator found the primary running PostgreSQL 17.9 and both replicas. Within a few seconds, it polls the replicas too and builds the full topology tree.

<h2 id="verify-topology">Step 5: Verify the Topology</h2>

Check the cluster information:

```bash
multipass exec proxy-orch -- curl -s http://localhost:3098/api/clusters-info | python3 -m json.tool
```

Expected output:

```json
[
  {
    "ClusterName": "pg-primary:5432",
    "ClusterAlias": "pg-primary:5432",
    "CountInstances": 3
  }
]
```

Check individual instance details:

```bash
# Via the API
multipass exec proxy-orch -- curl -s "http://localhost:3098/api/cluster/pg-primary:5432" | \
  python3 -c "
import json, sys
for inst in json.load(sys.stdin):
    key = inst['Key']
    role = 'PRIMARY' if not inst['ReadOnly'] else 'REPLICA'
    depth = inst['ReplicationDepth']
    print(f\"  {key['Hostname']}:{key['Port']} [{role}] depth={depth}\")
"
```

Expected output:

```
  pg-primary:5432 [PRIMARY] depth=0
  192.168.2.7:5432 [REPLICA] depth=1
  192.168.2.8:5432 [REPLICA] depth=1
```

<h2 id="health-check">Step 6: Check the Health Endpoint</h2>

Orchestrator exposes a health API useful for monitoring and Kubernetes liveness probes:

```bash
multipass exec proxy-orch -- curl -s http://localhost:3098/api/health | python3 -m json.tool
```

Key fields in the response:

```json
{
  "Code": "OK",
  "Message": "Application node is healthy",
  "Details": {
    "Healthy": true,
    "Hostname": "proxy-orch",
    "IsActiveNode": true,
    "AvailableNodes": [
      {
        "Hostname": "proxy-orch",
        "AppVersion": "4.30.2",
        "DBBackend": "/usr/local/orchestrator/orchestrator.sqlite3"
      }
    ]
  }
}
```

<h2 id="web-ui">Step 7: Access the Web UI</h2>

Orchestrator provides a visual topology on port 3098. From your Mac:

```bash
# Get the proxy-orch VM IP
multipass info proxy-orch | grep IPv4
```

Then open `http://<proxy-orch-ip>:3098` in your browser. The web UI shows a draggable topology tree with the primary at the top and replicas below.

<div class="callout">
  <p><strong>TOPOLOGY DISCOVERY LIMITATION:</strong> Orchestrator discovers replicas by walking <code>pg_stat_replication</code> downward from the primary. Since this view doesn't include replica listening ports, Orchestrator uses <code>DefaultInstancePort</code> (5432). If your replicas run on non-standard ports, you must seed them explicitly via <code>/api/discover/hostname/port</code>.</p>
</div>

<h2 id="useful-api-endpoints">Useful API Endpoints</h2>

<table>
  <thead>
    <tr><th>Endpoint</th><th>Purpose</th></tr>
  </thead>
  <tbody>
    <tr><td><code>GET /api/discover/:host/:port</code></td><td>Seed a new instance for discovery</td></tr>
    <tr><td><code>GET /api/instances</code></td><td>List all known instances</td></tr>
    <tr><td><code>GET /api/clusters-info</code></td><td>List all clusters with member count</td></tr>
    <tr><td><code>GET /api/cluster/:clusterName</code></td><td>Get all instances in a cluster</td></tr>
    <tr><td><code>GET /api/instance/:host/:port</code></td><td>Get details for one instance</td></tr>
    <tr><td><code>GET /api/health</code></td><td>Health check (for monitoring/k8s probes)</td></tr>
    <tr><td><code>GET /api/audit-recovery</code></td><td>List past recovery operations</td></tr>
    <tr><td><code>GET /api/recover/:host/:port</code></td><td>Trigger manual recovery</td></tr>
    <tr><td><code>GET /api/graceful-master-takeover/:clusterName/:host/:port</code></td><td>Planned switchover</td></tr>
  </tbody>
</table>

<h2 id="orchestrator-client">Step 8: Using orchestrator-client (CLI)</h2>

While the HTTP API works, `orchestrator-client` is faster for day-to-day operations and scripting. It wraps every API call into a clean command with formatted output. Here are the commands you'll use most often, with real output from our cluster.

**View the topology tree:**

```bash
export ORCHESTRATOR_API="http://localhost:3098/api"
orchestrator-client -c topology -i 192.168.2.6:5432
```

```
192.168.2.6:5432   [0s,ok,17.9,rw,>>]
+ 192.168.2.7:5432 [null,ok,17.9,ro,>>]
+ 192.168.2.8:5432 [null,ok,17.9,ro,>>]
```

The output reads as: `host:port [replication_lag, check_status, pg_version, rw_or_ro, gtid_hint]`. The `+` prefix means "replica of the line above."

**List clusters and find the master:**

```bash
orchestrator-client -c clusters
```

```
192.168.2.6:5432
```

```bash
orchestrator-client -c which-cluster-master -i 192.168.2.6:5432
```

```
192.168.2.6:5432
```

**List replicas of a given instance:**

```bash
orchestrator-client -c which-replicas -i 192.168.2.6:5432
```

```
192.168.2.7:5432
192.168.2.8:5432
```

**Check for replication problems:**

```bash
orchestrator-client -c replication-analysis
```

When the cluster is healthy, this returns nothing. During a failure, it shows:

```
192.168.2.6:5432 (cluster 192.168.2.6:5432): DeadPrimary
```

**Control automatic vs manual recovery:**

```bash
# Disable automatic promotion
orchestrator-client -c disable-global-recoveries

# Check current mode
orchestrator-client -c check-global-recoveries
```

```
disabled
```

```bash
# Trigger manual recovery
orchestrator-client -c recover -i 192.168.2.6:5432

# Re-enable automatic mode
orchestrator-client -c enable-global-recoveries

# Acknowledge past recoveries (unblock future ones)
orchestrator-client -c ack-all-recoveries --reason "tested failover"
```

**Full command reference:**

<table>
  <thead>
    <tr><th>Command</th><th>Purpose</th><th>Works with PG?</th></tr>
  </thead>
  <tbody>
    <tr><td><code>topology -i host:port</code></td><td>ASCII tree of replication topology</td><td>Yes</td></tr>
    <tr><td><code>clusters</code></td><td>List all cluster names</td><td>Yes</td></tr>
    <tr><td><code>which-cluster-master -i host:port</code></td><td>Show the primary of a cluster</td><td>Yes</td></tr>
    <tr><td><code>which-replicas -i host:port</code></td><td>List replicas of a given instance</td><td>Yes</td></tr>
    <tr><td><code>which-cluster-instances -i host:port</code></td><td>List all members of a cluster</td><td>Yes</td></tr>
    <tr><td><code>all-clusters-masters</code></td><td>List all writable masters across all clusters</td><td>Yes</td></tr>
    <tr><td><code>replication-analysis</code></td><td>Show detected problems (DeadPrimary, etc.)</td><td>Yes</td></tr>
    <tr><td><code>discover -i host:port</code></td><td>Seed a new instance for discovery</td><td>Yes</td></tr>
    <tr><td><code>recover -i host:port</code></td><td>Trigger manual failover/recovery</td><td>Yes</td></tr>
    <tr><td><code>disable-global-recoveries</code></td><td>Switch to manual mode</td><td>Yes</td></tr>
    <tr><td><code>enable-global-recoveries</code></td><td>Switch back to automatic mode</td><td>Yes</td></tr>
    <tr><td><code>check-global-recoveries</code></td><td>Show current recovery mode</td><td>Yes</td></tr>
    <tr><td><code>ack-all-recoveries --reason "text"</code></td><td>Clear recovery blocking period</td><td>Yes</td></tr>
    <tr><td><code>graceful-master-takeover -i host:port</code></td><td>Planned switchover</td><td><strong>No</strong> — fails with <code>Identical server id</code> (PG lacks MySQL's server_id)</td></tr>
  </tbody>
</table>

<div class="callout-danger">
  <p><strong>KNOWN LIMITATION:</strong> <code>graceful-master-takeover</code> does not work with PostgreSQL as of Orchestrator 4.30.2. It attempts to relocate replicas using MySQL's <code>server_id</code> concept, which PostgreSQL doesn't have. Use <code>recover</code> for unplanned failover and manual <code>pg_promote()</code> + replica rewiring for planned switchovers.</p>
</div>

<h2 id="recovery-modes">Step 9: Why Manual Failover Is the Default</h2>

Our configuration uses `RecoverMasterClusterFilters: ["_do_not_match_"]` — this means Orchestrator **detects** failures and **alerts** you, but does **not** automatically promote a replica. You trigger promotion manually when you're ready.

<img src="/images/blog/svg-pg-ha-failover-modes.svg" alt="Comparison of automatic vs manual PostgreSQL failover timelines showing detection, promotion, and recovery phases" style="width:100%;max-width:900px;margin:1.5em auto;display:block;" />

<h3 id="why-manual">Why Not Automatic?</h3>

In MySQL, automatic failover is common because Orchestrator can rejoin the old primary as a replica using `CHANGE REPLICATION SOURCE TO` — a simple SQL command on a running server. If auto-failover mis-fires on a network glitch, the damage is recoverable.

**PostgreSQL is different.** We tested every Orchestrator rejoin method — `relocate`, `move-below`, `repoint`, `move-gtid`, `set-read-only` — both via CLI and HTTP API. **All fail.** PostgreSQL has no equivalent of `CHANGE REPLICATION SOURCE TO`. Once a replica is promoted, the old primary cannot be rejoined via Orchestrator. You must run a full `pg_basebackup` (which wipes the data directory and copies everything from scratch) or `pg_rewind` (which requires `wal_log_hints=on` to be configured in advance).

This means if automatic failover triggers on a **network glitch** (the primary is actually fine, just briefly unreachable):

1. Orchestrator promotes a replica → now you have **two primaries** (split-brain)
2. The old primary cannot be automatically demoted back to a replica
3. You must stop the old primary, wipe its data, and `pg_basebackup` from the new primary
4. On a large database, this takes minutes to hours

**Manual mode avoids this entirely.** Orchestrator still detects the failure instantly and fires alert hooks. You verify the primary is truly dead, then run one command to promote.

<h3 id="manual-workflow">The Manual Failover Workflow</h3>

When a primary fails, Orchestrator logs the detection but does not act:

```
CheckAndRecover: Analysis: DeadPrimary, InstanceKey: 192.168.2.6:5432:
  NOT Recovering host (disabled globally)
```

The `OnFailureDetectionProcesses` hooks still fire — use these for Slack/PagerDuty alerts. You investigate, confirm the primary is dead, then promote:

```bash
export ORCHESTRATOR_API="http://localhost:3098/api"

# Check what Orchestrator sees
orchestrator-client -c replication-analysis
```

```
192.168.2.6:5432 (cluster 192.168.2.6:5432): DeadPrimary
```

```bash
# Verify the primary is truly unreachable (not just a network blip)
PGPASSWORD=monitor_pass_2026 psql -h 192.168.2.6 -U monitor -d postgres -c "SELECT 1;" 2>&1
```

If connection fails, the primary is genuinely down. Promote:

```bash
orchestrator-client -c recover -i 192.168.2.6:5432
```

```
192.168.2.7:5432
```

Orchestrator selects the most caught-up replica and calls `pg_promote()`. ProxySQL detects the new primary within seconds and reroutes traffic.

After recovery, acknowledge to unblock future failovers:

```bash
orchestrator-client -c ack-all-recoveries --reason "verified dead primary, promoted replica"
```

<h3 id="enable-automatic">Enabling Automatic Mode (If You Choose To)</h3>

If your network is stable and you accept the risk, you can enable automatic recovery. This requires **both** layers to allow it:

1. **Config filter** — change `RecoverMasterClusterFilters` so your cluster name matches
2. **Runtime toggle** — must be `enabled` (it is by default)

With our default config (`["_do_not_match_"]`), the runtime toggle is already `enabled` but no cluster matches the filter — so auto-recovery is blocked. To enable auto-recovery, change the config filter:

Change `RecoverMasterClusterFilters` in `/usr/local/orchestrator/orchestrator.conf.json` and restart Orchestrator:

```json
"RecoverMasterClusterFilters": [".*"]
```

Or scope to specific clusters only:

```json
"RecoverMasterClusterFilters": ["production-critical-.*"]
```

You can also use the runtime toggle as a temporary kill switch (no restart needed):

```bash
# Temporarily block all auto-recovery (e.g. during maintenance)
orchestrator-client -c disable-global-recoveries

# Re-enable
orchestrator-client -c enable-global-recoveries

# Check current state
orchestrator-client -c check-global-recoveries
```

<div class="callout-danger">
  <p><strong>IF YOU ENABLE AUTOMATIC MODE:</strong> Understand that a false-positive failover requires a full <code>pg_basebackup</code> to rejoin the old primary. On a 500 GB database, that could take 30+ minutes. Manual mode costs you a few minutes of write downtime while you verify. Automatic mode risks hours of recovery work if the trigger was a network glitch.</p>
</div>

<h2 id="failover-hooks">Step 10: Understanding Failover Hooks</h2>

Orchestrator runs configurable processes at each failover stage. In our config, we log to `/tmp/orchestrator-recovery.log`. In production, you'd use these hooks to:

1. **Pre-failover**: Drain the old primary in ProxySQL (`OFFLINE_SOFT`)
2. **Post-failover**: Update ProxySQL's `pgsql_servers` to reflect the new topology
3. **Notification**: Alert via Slack, PagerDuty, etc.

Example production hook for ProxySQL integration:

```bash
#!/bin/bash
# /usr/local/bin/proxysql-failover-hook.sh
# Called by Orchestrator's PostMasterFailoverProcesses

NEW_PRIMARY="$1"
OLD_PRIMARY="$2"

PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin << EOF
-- Move old primary to reader hostgroup
UPDATE pgsql_servers SET hostgroup_id = 20 WHERE hostname = '${OLD_PRIMARY}';
-- Move new primary to writer hostgroup
UPDATE pgsql_servers SET hostgroup_id = 10 WHERE hostname = '${NEW_PRIMARY}';
LOAD PGSQL SERVERS TO RUNTIME;
SAVE PGSQL SERVERS TO DISK;
EOF
```

<div class="callout">
  <p><strong>PROXYSQL AUTO-DETECTION:</strong> In practice, ProxySQL's read-only monitor often detects the role change before the hook runs. The hook provides an explicit, immediate update — a belt-and-suspenders approach. Both methods work; using both means faster failover.</p>
</div>

<h2 id="troubleshooting">Troubleshooting</h2>

<table>
  <thead>
    <tr><th>Symptom</th><th>Check</th><th>Fix</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Orchestrator starts but shows "Not elected as active node"</td>
      <td>This is normal for the first 10 seconds</td>
      <td>Wait for the election period to pass; it will become active</td>
    </tr>
    <tr>
      <td>Discovery fails with "connection refused"</td>
      <td>Check <code>pg_hba.conf</code> for the orchestrator user</td>
      <td>Add <code>host postgres orchestrator &lt;subnet&gt; scram-sha-256</code></td>
    </tr>
    <tr>
      <td>Replicas not discovered</td>
      <td>Check <code>pg_stat_replication</code> on primary</td>
      <td>Ensure replicas are connected and streaming</td>
    </tr>
    <tr>
      <td>"DeadMasterWithoutReplicas" on failover</td>
      <td><code>primary_conninfo</code> contains escaped-quote hostnames (<code>host=''pg-primary''</code>) causing Orchestrator to split the topology into two clusters</td>
      <td>Use IP addresses in <code>primary_conninfo</code> instead of hostnames. After <code>pg_basebackup -R</code>, edit <code>postgresql.auto.conf</code> to replace quoted hostnames with IPs. Seed Orchestrator via <code>/api/discover/&lt;primary-ip&gt;/5432</code>.</td>
    </tr>
    <tr>
      <td>Web UI not loading</td>
      <td><code>curl http://localhost:3098/api/health</code></td>
      <td>Check Orchestrator process is running and port 3098 is not blocked</td>
    </tr>
  </tbody>
</table>

<h2 id="pre-checks">Pre-Checks Before Moving to Part 4</h2>

Part 4 will kill the primary and expect automated recovery. Every check below must pass or the failover will fail silently or produce confusing errors.

```bash
echo "=== Orchestrator Pre-Check Suite ==="

echo "1. Orchestrator process running:"
multipass exec proxy-orch -- pgrep -c orchestrator

echo "2. Health endpoint responds OK:"
multipass exec proxy-orch -- curl -s http://localhost:3098/api/health | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(f'  Healthy: {d[\"Details\"][\"Healthy\"]}, Active: {d[\"Details\"][\"IsActiveNode\"]}')"

echo "3. Single cluster with 3 members:"
multipass exec proxy-orch -- curl -s http://localhost:3098/api/clusters-info | python3 -c \
  "import json,sys; [print(f'  {c[\"ClusterName\"]}: {c[\"CountInstances\"]} members, AutoRecovery={c[\"HasAutomatedMasterRecovery\"]}') for c in json.load(sys.stdin)]"

echo "4. Topology correct (1 PRIMARY + 2 REPLICA):"
multipass exec proxy-orch -- curl -s "http://localhost:3098/api/cluster/$(multipass exec proxy-orch -- curl -s http://localhost:3098/api/clusters-info | python3 -c 'import json,sys;print(json.load(sys.stdin)[0][\"ClusterName\"])')" | python3 -c \
  "import json,sys; [print(f'  {i[\"Key\"][\"Hostname\"]}:{i[\"Key\"][\"Port\"]} [{\"PRIMARY\" if not i[\"ReadOnly\"] else \"REPLICA\"}]') for i in json.load(sys.stdin)]"

echo "5. HasAutomatedMasterRecovery = true:"
multipass exec proxy-orch -- curl -s http://localhost:3098/api/clusters-info | python3 -c \
  "import json,sys; c=json.load(sys.stdin)[0]; print(f'  AutoRecovery: {c[\"HasAutomatedMasterRecovery\"]}')"

echo "6. No stale recovery blocks:"
multipass exec proxy-orch -- curl -s http://localhost:3098/api/audit-recovery | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(f'  Pending recoveries: {len(d)}')"

echo "7. Orchestrator user can call pg_promote():"
multipass exec pg-primary -- sudo -u postgres psql -tAc \
  "SELECT usesuper FROM pg_user WHERE usename = 'orchestrator';"

echo "8. ProxySQL still routing correctly:"
multipass exec proxy-orch -- PGPASSWORD=admin psql -h 127.0.0.1 -p 6132 -U admin -d admin \
  -c "SELECT hostgroup_id, hostname, status FROM runtime_pgsql_servers ORDER BY hostgroup_id;"

echo "=== All Orchestrator pre-checks complete ==="
```

<table>
  <thead>
    <tr><th>#</th><th>Check</th><th>If It Fails</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>Process running</td><td>Start Orchestrator — <code>nohup /usr/local/orchestrator/orchestrator -config ... http &amp;</code></td></tr>
    <tr><td>2</td><td>Health OK + Active</td><td>Wait 10 seconds after startup for leader election</td></tr>
    <tr><td>3</td><td>Single cluster, 3 members</td><td>If multiple clusters appear, you have the <b>hostname quoting bug</b> — use IP addresses in <code>primary_conninfo</code> and re-seed</td></tr>
    <tr><td>4</td><td>1 PRIMARY + 2 REPLICA</td><td>Check <code>pg_stat_replication</code> on primary and re-discover</td></tr>
    <tr><td>5</td><td>AutoRecovery = true</td><td>Check <code>RecoverMasterClusterFilters: [".*"]</code> in config</td></tr>
    <tr><td>6</td><td>No stale recoveries</td><td>Acknowledge old recoveries: <code>curl /api/ack-all-recoveries/reset</code></td></tr>
    <tr><td>7</td><td>SUPERUSER = t</td><td>Grant it: <code>ALTER USER orchestrator WITH SUPERUSER;</code> — without this, <code>pg_promote()</code> fails with <code>permission denied</code></td></tr>
    <tr><td>8</td><td>ProxySQL routing correct</td><td>Primary should be in hostgroup 10 — if not, check read-only monitor</td></tr>
  </tbody>
</table>

<div class="callout-danger">
  <p><strong>CRITICAL:</strong> Check #3 (single cluster) and #7 (SUPERUSER) are the two issues that silently prevent automated failover. If you see multiple clusters, Orchestrator reports <code>DeadMasterWithoutReplicas</code> instead of <code>DeadPrimary</code> and does nothing. If SUPERUSER is missing, Orchestrator detects the failure but every <code>pg_promote()</code> call fails with <code>permission denied</code>.</p>
</div>

<h2 id="next-steps">What's Next</h2>

Orchestrator is running, discovering the topology, and ready to handle failures. In <a href="/blog/proxysql-postgresql-ha-part4-integration-failover-scenarios.html">Part 4</a>, we put everything together and run real failover scenarios:

- Kill the primary VM and watch automatic recovery
- Planned switchover using Orchestrator's graceful takeover API
- Rejoin a failed primary as a replica
- End-to-end verification through ProxySQL after each failover
- Production hardening checklist

<div class="callout">
  <p><strong>KEEP VMs RUNNING:</strong> Part 4 tests failover scenarios on the live cluster. Keep all VMs running for the next part.</p>
</div>
