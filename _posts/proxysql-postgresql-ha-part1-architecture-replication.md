---
title: "PostgreSQL HA Setup: Streaming Replication Guide (Part 1)"
date: 2026-04-23T10:00:00.000Z
author: "Mughees Ahmed"
description: "Build a 3-node PostgreSQL 17 streaming replication cluster on Multipass VMs. Step 1 of a ProxySQL + Orchestrator HA series."
categories:
  - postgresql
  - high-availability
read_time: 20
featured: true
coverImage: "/images/blog/proxysql-postgresql-ha-architecture.jpg"
---

<!-- Series Navigation -->
<div class="series-nav">
  <h4>PostgreSQL HA with ProxySQL &amp; Orchestrator &mdash; 4-Part Series</h4>
  <ol>
    <li><span class="current">Part 1: Architecture &amp; Streaming Replication (You Are Here)</span></li>
    <li><a href="/blog/proxysql-postgresql-ha-part2-proxysql-read-write-splitting.html">Part 2: ProxySQL &mdash; Read/Write Splitting</a></li>
    <li><a href="/blog/proxysql-postgresql-ha-part3-orchestrator-failover.html">Part 3: Orchestrator &mdash; Topology Discovery &amp; Failover</a></li>
    <li><a href="/blog/proxysql-postgresql-ha-part4-integration-failover-scenarios.html">Part 4: End-to-End Integration &amp; Failover Scenarios</a></li>
  </ol>
</div>

ProxySQL 3.0 introduced native <a href="https://proxysql.com/documentation/proxysql-configuration-postgresql/">PostgreSQL protocol support</a>, bringing the same connection pooling, query routing, and read/write splitting that MySQL DBAs have relied on for years. Meanwhile, the ProxySQL team <a href="https://github.com/ProxySQL/orchestrator">forked Orchestrator</a> and added PostgreSQL streaming replication support — topology discovery, failure detection, and automated failover via <a href="https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-RECOVERY-CONTROL">pg_promote()</a>.

This series builds the complete stack from scratch: 3 PostgreSQL nodes, ProxySQL for traffic management, and Orchestrator for automated failover. Everything runs on local Multipass VMs so you can test and break things safely.

<div class="callout">
  <p><strong>WHAT YOU'LL BUILD:</strong> A production-representative PostgreSQL HA topology with automated read/write splitting and failover — all running locally at zero cost.</p>
</div>

<h2 id="architecture-overview">Architecture Overview</h2>

<img src="/images/blog/svg-pg-ha-architecture.svg" alt="PostgreSQL HA architecture diagram showing Application, ProxySQL, Orchestrator, and 3 database nodes with read/write splitting" style="width:100%;max-width:900px;margin:1.5em auto;display:block;" />

The final architecture has four layers:

<table>
  <thead>
    <tr><th>Layer</th><th>Component</th><th>Role</th></tr>
  </thead>
  <tbody>
    <tr><td>Application</td><td>psql / your app</td><td>Connects to ProxySQL on port 6133</td></tr>
    <tr><td>Proxy</td><td>ProxySQL 3.x</td><td>Connection pooling, read/write splitting, health monitoring</td></tr>
    <tr><td>Orchestration</td><td>Orchestrator 4.30+</td><td>Topology discovery, failure detection, automated promotion</td></tr>
    <tr><td>Database</td><td>PostgreSQL 17 (×3)</td><td>1 primary + 2 streaming replicas</td></tr>
  </tbody>
</table>

**How the components interact:**

1. **Applications** connect to ProxySQL on a single endpoint (port 6133). They never talk to PostgreSQL directly.
2. **ProxySQL** routes writes to the primary (hostgroup 10) and reads to replicas (hostgroup 20). Its built-in monitor calls `pg_is_in_recovery()` on each backend to detect role changes.
3. **Orchestrator** continuously polls `pg_stat_replication` to map the topology. When the primary fails, it promotes the most up-to-date replica and rewires the surviving replica to follow the new primary.
4. **Post-failover hooks** notify ProxySQL to update its hostgroup assignments, completing the failover in under 2 seconds.

<h2 id="vm-layout">VM Layout and Network Plan</h2>

We use Multipass to spin up four Ubuntu 24.04 VMs. Each gets a static-enough IP from the Multipass bridge network.

<table>
  <thead>
    <tr><th>VM Name</th><th>Role</th><th>Key Ports</th></tr>
  </thead>
  <tbody>
    <tr><td><code>pg-primary</code></td><td>PostgreSQL primary</td><td>5432</td></tr>
    <tr><td><code>pg-replica1</code></td><td>PostgreSQL replica 1</td><td>5432</td></tr>
    <tr><td><code>pg-replica2</code></td><td>PostgreSQL replica 2</td><td>5432</td></tr>
    <tr><td><code>proxy-orch</code></td><td>ProxySQL + Orchestrator</td><td>6132 (admin), 6133 (app), 3098 (orch UI)</td></tr>
  </tbody>
</table>

<div class="callout">
  <p><strong>WHY SEPARATE VMs?</strong> Containers work fine for quick demos, but Multipass VMs behave like real servers — systemd services, persistent storage, network interfaces. When you test failover, you want to simulate actual machine failures (<code>multipass stop pg-primary</code>), not just kill a container process.</p>
</div>

<h2 id="launch-vms">Step 1: Launch the Multipass VMs</h2>

Multipass is a lightweight VM manager that creates isolated Ubuntu instances in seconds. Each VM behaves like a real server with its own IP, systemd, and persistent storage — so when you `multipass stop pg-primary` later, it simulates a real server crash.

Install Multipass if you don't have it:

```bash
# macOS
brew install multipass

# Ubuntu
sudo snap install multipass
```

Launch all four VMs with 2 GB RAM and 10 GB disk each:

```bash
multipass launch 24.04 --name pg-primary  --cpus 2 --memory 2G --disk 10G
multipass launch 24.04 --name pg-replica1 --cpus 2 --memory 2G --disk 10G
multipass launch 24.04 --name pg-replica2 --cpus 2 --memory 2G --disk 10G
multipass launch 24.04 --name proxy-orch  --cpus 2 --memory 2G --disk 10G
```

Get the IP addresses — you'll need these throughout the series:

```bash
multipass list
```

Sample output:

```
Name          State    IPv4             Image
pg-primary    Running  192.168.64.2     Ubuntu 24.04 LTS
pg-replica1   Running  192.168.64.3     Ubuntu 24.04 LTS
pg-replica2   Running  192.168.64.4     Ubuntu 24.04 LTS
proxy-orch    Running  192.168.64.5     Ubuntu 24.04 LTS
```

<div class="callout-danger">
  <p><strong>NOTE YOUR IPs:</strong> Multipass assigns IPs dynamically. Replace the example IPs throughout this guide with your actual values. Consider adding entries to <code>/etc/hosts</code> on each VM for convenience.</p>
</div>

Set up hostname resolution so VMs can reach each other by name instead of IP. This is essential — replication, monitoring, and failover all use hostnames. Replace the IPs below with your actual values:

```bash
# Run on each VM — adjust IPs to match your multipass list output
for vm in pg-primary pg-replica1 pg-replica2 proxy-orch; do
  multipass exec $vm -- sudo bash -c 'cat >> /etc/hosts << EOF
192.168.64.2  pg-primary
192.168.64.3  pg-replica1
192.168.64.4  pg-replica2
192.168.64.5  proxy-orch
EOF'
done
```

<h2 id="install-postgresql">Step 2: Install PostgreSQL 17 on All Three Database VMs</h2>

Run the following on `pg-primary`, `pg-replica1`, and `pg-replica2`:

```bash
# Add the PostgreSQL APT repository
multipass exec pg-primary -- sudo bash -c '
  apt-get update
  apt-get install -y curl ca-certificates
  install -d /usr/share/postgresql-common/pgdg
  curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
    --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
    https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update
  apt-get install -y postgresql-17
'
```

Repeat for the other two nodes:

```bash
for vm in pg-replica1 pg-replica2; do
  multipass exec $vm -- sudo bash -c '
    apt-get update
    apt-get install -y curl ca-certificates
    install -d /usr/share/postgresql-common/pgdg
    curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
      --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
    echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
      https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list
    apt-get update
    apt-get install -y postgresql-17
  '
done
```

Verify installation on each node:

```bash
multipass exec pg-primary -- sudo -u postgres psql -c "SELECT version();"
```

You should see PostgreSQL 17.x in the output.

<h2 id="configure-primary">Step 3: Configure the Primary Node</h2>

All configuration happens on `pg-primary`.

<h3 id="create-replication-user">3a. Create Users for Each Component</h3>

We need four separate users, each with only the permissions it needs. This follows the principle of least privilege — if any credential is compromised, the blast radius is limited.

<table>
  <thead>
    <tr><th>User</th><th>Purpose</th><th>Key Privilege</th></tr>
  </thead>
  <tbody>
    <tr><td><code>replicator</code></td><td>WAL streaming between primary and replicas</td><td><code>REPLICATION</code></td></tr>
    <tr><td><code>monitor</code></td><td>ProxySQL health checks (<code>pg_is_in_recovery()</code>)</td><td><code>pg_monitor</code></td></tr>
    <tr><td><code>orchestrator</code></td><td>Topology discovery + automated promotion</td><td><code>SUPERUSER</code> (required for <code>pg_promote()</code>)</td></tr>
    <tr><td><code>appuser</code></td><td>Application queries through ProxySQL</td><td>Database owner</td></tr>
  </tbody>
</table>

```bash
multipass exec pg-primary -- sudo -u postgres psql << 'EOF'
-- Replication user for streaming replication
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'repl_pass_2026';

-- Monitoring user for ProxySQL and Orchestrator
CREATE USER monitor WITH ENCRYPTED PASSWORD 'monitor_pass_2026';
GRANT pg_monitor TO monitor;
GRANT CONNECT ON DATABASE postgres TO monitor;

-- Orchestrator user (needs pg_monitor + SUPERUSER for pg_promote())
CREATE USER orchestrator WITH SUPERUSER ENCRYPTED PASSWORD 'orch_pass_2026';
GRANT pg_monitor TO orchestrator;

-- Application user for testing
CREATE USER appuser WITH ENCRYPTED PASSWORD 'app_pass_2026';
CREATE DATABASE appdb OWNER appuser;
EOF
```

<div class="callout">
  <p><strong>CHANGE THESE PASSWORDS:</strong> The passwords shown here (<code>repl_pass_2026</code>, etc.) are for lab use only. In production, use <code>.pgpass</code> files or a secrets manager. Never commit credentials to version control.</p>
</div>

<h3 id="configure-postgresql-conf">3b. Configure postgresql.conf</h3>

Edit the primary's configuration:

```bash
multipass exec pg-primary -- sudo bash -c 'cat >> /etc/postgresql/17/main/postgresql.conf << EOF

# --- Replication Settings ---
listen_addresses = '"'"'*'"'"'
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
hot_standby = on
wal_keep_size = 256MB

# Synchronous replication (optional — comment out for async)
# synchronous_standby_names = '"'"'ANY 1 (pg_replica1, pg_replica2)'"'"'
# synchronous_commit = on

# Logging for visibility
log_connections = on
log_disconnections = on
log_replication_commands = on
EOF'
```

**Key parameters explained:**

<table>
  <thead>
    <tr><th>Parameter</th><th>Value</th><th>Why</th></tr>
  </thead>
  <tbody>
    <tr><td><code>wal_level</code></td><td><code>replica</code></td><td>Enables WAL shipping for streaming replication</td></tr>
    <tr><td><code>max_wal_senders</code></td><td>10</td><td>Allows up to 10 concurrent replication connections (2 replicas + headroom)</td></tr>
    <tr><td><code>max_replication_slots</code></td><td>10</td><td>Prevents WAL recycling before replicas consume it</td></tr>
    <tr><td><code>hot_standby</code></td><td><code>on</code></td><td>Allows read queries on replicas</td></tr>
    <tr><td><code>wal_keep_size</code></td><td>256MB</td><td>Keeps extra WAL segments for replicas that fall behind</td></tr>
  </tbody>
</table>

<h3 id="configure-pg-hba">3c. Configure pg_hba.conf for Replication Access</h3>

Allow the replication user, monitor, and orchestrator to connect from the VM network:

```bash
multipass exec pg-primary -- sudo bash -c 'cat >> /etc/postgresql/17/main/pg_hba.conf << EOF

# Replication connections from replicas
host    replication     replicator      192.168.64.0/24     scram-sha-256

# Monitoring connections from ProxySQL
host    postgres        monitor         192.168.64.0/24     scram-sha-256

# Orchestrator connections
host    postgres        orchestrator    192.168.64.0/24     scram-sha-256

# Application connections via ProxySQL
host    appdb           appuser         192.168.64.0/24     scram-sha-256
host    all             all             192.168.64.0/24     scram-sha-256
EOF'
```

<div class="callout-danger">
  <p><strong>ADJUST THE SUBNET:</strong> Replace <code>192.168.64.0/24</code> with the actual subnet of your Multipass VMs. Check with <code>multipass list</code>.</p>
</div>

<h3 id="create-replication-slots">3d. Create Replication Slots</h3>

Replication slots prevent the primary from recycling WAL segments before replicas have consumed them:

```bash
multipass exec pg-primary -- sudo -u postgres psql << 'EOF'
SELECT pg_create_physical_replication_slot('replica1_slot');
SELECT pg_create_physical_replication_slot('replica2_slot');

-- Verify
SELECT slot_name, slot_type, active FROM pg_replication_slots;
EOF
```

Expected output:

```
   slot_name    | slot_type | active
----------------+-----------+--------
 replica1_slot  | physical  | f
 replica2_slot  | physical  | f
```

<h3 id="restart-primary">3e. Restart the Primary</h3>

```bash
multipass exec pg-primary -- sudo systemctl restart postgresql
multipass exec pg-primary -- sudo systemctl status postgresql
```

<h2 id="configure-replicas">Step 4: Set Up Streaming Replicas</h2>

Each replica starts as a base backup of the primary, then continuously streams WAL changes.

<h3 id="replica1-setup">4a. Configure Replica 1</h3>

First, stop PostgreSQL and remove the default data directory:

```bash
multipass exec pg-replica1 -- sudo systemctl stop postgresql
multipass exec pg-replica1 -- sudo -u postgres bash -c '
  rm -rf /var/lib/postgresql/17/main/*
'
```

Take a base backup from the primary:

```bash
multipass exec pg-replica1 -- sudo -u postgres bash -c '
  PGPASSWORD=repl_pass_2026 pg_basebackup \
    -h pg-primary \
    -U replicator \
    -D /var/lib/postgresql/17/main \
    -Fp -Xs -P -R \
    -S replica1_slot
'
```

The `-R` flag automatically creates `standby.signal` and adds `primary_conninfo` to `postgresql.auto.conf`. Verify:

```bash
multipass exec pg-replica1 -- sudo -u postgres cat /var/lib/postgresql/17/main/postgresql.auto.conf
```

You should see something like:

```
primary_conninfo = 'user=replicator password=repl_pass_2026 host=pg-primary port=5432 sslmode=prefer'
primary_slot_name = 'replica1_slot'
```

Add the same listen and hot_standby settings:

```bash
multipass exec pg-replica1 -- sudo bash -c 'cat >> /etc/postgresql/17/main/postgresql.conf << EOF

# --- Replica Settings ---
listen_addresses = '"'"'*'"'"'
hot_standby = on
log_connections = on
log_disconnections = on
EOF'
```

Configure `pg_hba.conf` for monitoring and application access:

```bash
multipass exec pg-replica1 -- sudo bash -c 'cat >> /etc/postgresql/17/main/pg_hba.conf << EOF

# Monitoring from ProxySQL
host    postgres        monitor         192.168.64.0/24     scram-sha-256

# Orchestrator
host    postgres        orchestrator    192.168.64.0/24     scram-sha-256

# Application connections via ProxySQL
host    appdb           appuser         192.168.64.0/24     scram-sha-256
host    all             all             192.168.64.0/24     scram-sha-256

# Allow replication (needed if this replica gets promoted)
host    replication     replicator      192.168.64.0/24     scram-sha-256
EOF'
```

Start the replica:

```bash
multipass exec pg-replica1 -- sudo systemctl start postgresql
multipass exec pg-replica1 -- sudo systemctl status postgresql
```

<h3 id="replica2-setup">4b. Configure Replica 2</h3>

Same process for the second replica:

```bash
multipass exec pg-replica2 -- sudo systemctl stop postgresql
multipass exec pg-replica2 -- sudo -u postgres bash -c '
  rm -rf /var/lib/postgresql/17/main/*
'

multipass exec pg-replica2 -- sudo -u postgres bash -c '
  PGPASSWORD=repl_pass_2026 pg_basebackup \
    -h pg-primary \
    -U replicator \
    -D /var/lib/postgresql/17/main \
    -Fp -Xs -P -R \
    -S replica2_slot
'
```

Add replica configuration:

```bash
multipass exec pg-replica2 -- sudo bash -c 'cat >> /etc/postgresql/17/main/postgresql.conf << EOF

# --- Replica Settings ---
listen_addresses = '"'"'*'"'"'
hot_standby = on
log_connections = on
log_disconnections = on
EOF'

multipass exec pg-replica2 -- sudo bash -c 'cat >> /etc/postgresql/17/main/pg_hba.conf << EOF

# Monitoring from ProxySQL
host    postgres        monitor         192.168.64.0/24     scram-sha-256

# Orchestrator
host    postgres        orchestrator    192.168.64.0/24     scram-sha-256

# Application connections via ProxySQL
host    appdb           appuser         192.168.64.0/24     scram-sha-256
host    all             all             192.168.64.0/24     scram-sha-256

# Allow replication (needed if this replica gets promoted)
host    replication     replicator      192.168.64.0/24     scram-sha-256
EOF'

multipass exec pg-replica2 -- sudo systemctl start postgresql
```

<h2 id="verify-replication">Step 5: Verify Streaming Replication</h2>

<h3 id="check-primary-status">5a. Check the Primary's Replication Status</h3>

```bash
multipass exec pg-primary -- sudo -u postgres psql << 'EOF'
-- Check connected replicas
SELECT
  client_addr,
  state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  sync_state
FROM pg_stat_replication;
EOF
```

Expected output — both replicas connected and streaming:

```
  client_addr   |   state   |  sent_lsn  | write_lsn  | flush_lsn  | replay_lsn | sync_state
----------------+-----------+------------+------------+------------+------------+------------
 192.168.64.3   | streaming | 0/5000148  | 0/5000148  | 0/5000148  | 0/5000148  | async
 192.168.64.4   | streaming | 0/5000148  | 0/5000148  | 0/5000148  | 0/5000148  | async
```

<h3 id="check-replication-slots">5b. Check Replication Slots Are Active</h3>

```bash
multipass exec pg-primary -- sudo -u postgres psql -c \
  "SELECT slot_name, active, restart_lsn FROM pg_replication_slots;"
```

Both slots should show `active = t`:

```
   slot_name    | active | restart_lsn
----------------+--------+-------------
 replica1_slot  | t      | 0/5000148
 replica2_slot  | t      | 0/5000148
```

<h3 id="check-replica-status">5c. Verify Replicas Are in Recovery Mode</h3>

```bash
multipass exec pg-replica1 -- sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
multipass exec pg-replica2 -- sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
```

Both should return `t` (true) — confirming they're running as standbys.

<h3 id="test-replication">5d. Test Data Replication</h3>

Write data on the primary and verify it appears on both replicas:

```bash
# Create a test table and insert data on the primary
multipass exec pg-primary -- sudo -u postgres psql -d appdb << 'EOF'
CREATE TABLE replication_test (
  id serial PRIMARY KEY,
  message text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO replication_test (message) VALUES ('Hello from primary');
INSERT INTO replication_test (message) VALUES ('Replication works!');
EOF

# Read from replica 1
multipass exec pg-replica1 -- sudo -u postgres psql -d appdb -c \
  "SELECT * FROM replication_test;"

# Read from replica 2
multipass exec pg-replica2 -- sudo -u postgres psql -d appdb -c \
  "SELECT * FROM replication_test;"
```

Both replicas should return the same two rows. If they do, streaming replication is working.

<h3 id="check-replication-lag">5e. Check Replication Lag</h3>

On each replica, check how far behind it is:

```bash
multipass exec pg-replica1 -- sudo -u postgres psql << 'EOF'
SELECT
  now() - pg_last_xact_replay_timestamp() AS replication_lag,
  pg_last_wal_receive_lsn() AS received_lsn,
  pg_last_wal_replay_lsn() AS replayed_lsn,
  pg_is_in_recovery() AS is_replica;
EOF
```

With a quiet system, replication lag should be near zero (a few milliseconds).

<h2 id="test-write-rejection">Step 6: Verify Replicas Reject Writes</h2>

Confirm that replicas are truly read-only:

```bash
multipass exec pg-replica1 -- sudo -u postgres psql -d appdb -c \
  "INSERT INTO replication_test (message) VALUES ('Should fail');"
```

Expected error:

```
ERROR:  cannot execute INSERT in a read-only transaction
```

This is exactly the behavior ProxySQL relies on — replicas are safe to route `SELECT` queries to, while all writes must go to the primary.

<h2 id="monitoring-user-test">Step 7: Verify the Monitoring User</h2>

The `monitor` user will be used by ProxySQL's health checks. Verify it can connect and check recovery status from an external node:

```bash
# Test from the proxy-orch VM
multipass exec proxy-orch -- bash -c '
  sudo apt-get update && sudo apt-get install -y postgresql-client

  # Test connection to primary
  PGPASSWORD=monitor_pass_2026 psql -h pg-primary -U monitor -d postgres -c \
    "SELECT pg_is_in_recovery();"

  # Test connection to replica1
  PGPASSWORD=monitor_pass_2026 psql -h pg-replica1 -U monitor -d postgres -c \
    "SELECT pg_is_in_recovery();"

  # Test connection to replica2
  PGPASSWORD=monitor_pass_2026 psql -h pg-replica2 -U monitor -d postgres -c \
    "SELECT pg_is_in_recovery();"
'
```

Expected results:
- **pg-primary**: `pg_is_in_recovery = f` (false — it's the primary)
- **pg-replica1**: `pg_is_in_recovery = t` (true — it's a replica)
- **pg-replica2**: `pg_is_in_recovery = t` (true — it's a replica)

This is how ProxySQL determines which hostgroup each backend belongs to.

<h2 id="topology-summary">Current Topology</h2>

At this point, your cluster looks like this:

```
                  ┌─────────────────┐
                  │   pg-primary    │
                  │   (read/write)  │
                  │   .64.2:5432    │
                  └────────┬────────┘
                           │ WAL streaming
                ┌──────────┴──────────┐
                │                     │
        ┌───────┴────────┐   ┌───────┴────────┐
        │  pg-replica1   │   │  pg-replica2   │
        │  (read-only)   │   │  (read-only)   │
        │  .64.3:5432    │   │  .64.4:5432    │
        └────────────────┘   └────────────────┘
```

You have:
- **1 primary** accepting reads and writes
- **2 streaming replicas** with near-zero lag, rejecting writes
- **Replication slots** preventing WAL loss if a replica disconnects
- **Dedicated users** for monitoring, orchestration, replication, and application access
- **A proxy-orch VM** ready for ProxySQL and Orchestrator installation (Part 2 and Part 3)

<h2 id="pre-checks">Pre-Checks Before Moving to Part 2</h2>

Before proceeding to ProxySQL setup, run every check in this table. Each one maps to a real issue we hit during testing — skipping any of these will cause failures later in the series.

<table>
  <thead>
    <tr><th>#</th><th>Check</th><th>Command</th><th>Expected Result</th><th>Why It Matters</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>Both replicas streaming</td>
      <td><code>SELECT client_addr, state FROM pg_stat_replication;</code> (on primary)</td>
      <td>2 rows, both <code>state = streaming</code></td>
      <td>ProxySQL and Orchestrator rely on connected replicas</td>
    </tr>
    <tr>
      <td>2</td>
      <td>Replication slots active</td>
      <td><code>SELECT slot_name, active FROM pg_replication_slots;</code> (on primary)</td>
      <td>Both slots <code>active = t</code></td>
      <td>Inactive slots mean WAL will pile up and replicas will fall behind</td>
    </tr>
    <tr>
      <td>3</td>
      <td>Replicas in recovery mode</td>
      <td><code>SELECT pg_is_in_recovery();</code> (on each replica)</td>
      <td>Returns <code>t</code> on both replicas</td>
      <td>ProxySQL uses this function to determine read-only vs read-write routing</td>
    </tr>
    <tr>
      <td>4</td>
      <td>Replicas reject writes</td>
      <td><code>INSERT INTO replication_test (message) VALUES ('test');</code> (on replica)</td>
      <td><code>ERROR: cannot execute INSERT in a read-only transaction</code></td>
      <td>Confirms hot_standby is working — replicas are safe for read traffic</td>
    </tr>
    <tr>
      <td>5</td>
      <td>Monitor user can connect from proxy-orch</td>
      <td><code>PGPASSWORD=monitor_pass_2026 psql -h pg-primary -U monitor -d postgres -c "SELECT pg_is_in_recovery();"</code> (from proxy-orch)</td>
      <td>Returns <code>f</code> for primary, <code>t</code> for replicas</td>
      <td>ProxySQL health checks use this user — if it can't connect, monitoring fails silently</td>
    </tr>
    <tr>
      <td>6</td>
      <td>Orchestrator user has SUPERUSER</td>
      <td><code>SELECT usename, usesuper FROM pg_user WHERE usename = 'orchestrator';</code></td>
      <td><code>usesuper = t</code></td>
      <td>Without SUPERUSER, Orchestrator cannot call <code>pg_promote()</code> — automated failover fails with <code>permission denied</code></td>
    </tr>
    <tr>
      <td>7</td>
      <td>Application user has table permissions</td>
      <td><code>PGPASSWORD=app_pass_2026 psql -h pg-primary -U appuser -d appdb -c "SELECT 1;"</code></td>
      <td>Returns <code>1</code> without error</td>
      <td>ProxySQL routes queries as this user — permission errors appear as application failures</td>
    </tr>
    <tr>
      <td>8</td>
      <td><code>primary_conninfo</code> uses IP addresses</td>
      <td><code>cat postgresql.auto.conf</code> (on each replica)</td>
      <td><code>host=192.168.x.x</code> — no quoted hostnames like <code>host=''pg-primary''</code></td>
      <td>Quoted hostnames cause Orchestrator to split the topology into multiple clusters, breaking automated failover</td>
    </tr>
    <tr>
      <td>9</td>
      <td><code>pg_hba.conf</code> includes replication line on replicas</td>
      <td><code>grep replication /etc/postgresql/17/main/pg_hba.conf</code> (on each replica)</td>
      <td><code>host replication replicator &lt;subnet&gt; scram-sha-256</code></td>
      <td>If a replica gets promoted to primary, it must accept replication connections from other nodes</td>
    </tr>
    <tr>
      <td>10</td>
      <td><code>/etc/hosts</code> consistent on all VMs</td>
      <td><code>ping -c1 pg-primary && ping -c1 pg-replica1 && ping -c1 pg-replica2</code> (on each VM)</td>
      <td>All 3 resolve and respond</td>
      <td>VM restarts can lose <code>/etc/hosts</code> entries — DNS failures break replication reconnection</td>
    </tr>
  </tbody>
</table>

Run the checks in three groups — replication health, user permissions, and configuration safety.

**Replication health (checks 1-4):**

```bash
# 1. Both replicas streaming
multipass exec pg-primary -- sudo -u postgres psql -c \
  "SELECT client_addr, state, sync_state FROM pg_stat_replication;"
# Expect: 2 rows, both state = streaming

# 2. Replication slots active
multipass exec pg-primary -- sudo -u postgres psql -c \
  "SELECT slot_name, active FROM pg_replication_slots;"
# Expect: both active = t

# 3. Replicas in recovery mode
for vm in pg-replica1 pg-replica2; do
  echo "$vm: $(multipass exec $vm -- sudo -u postgres psql -tAc 'SELECT pg_is_in_recovery();')"
done
# Expect: both return t

# 4. Replicas reject writes
multipass exec pg-replica1 -- sudo -u postgres psql -d appdb -c \
  "INSERT INTO replication_test (message) VALUES ('pre-check');" 2>&1
# Expect: ERROR: cannot execute INSERT in a read-only transaction
```

**User permissions and connectivity (checks 5-7):**

```bash
# 5. Monitor user connects from proxy-orch
for host in pg-primary pg-replica1 pg-replica2; do
  result=$(multipass exec proxy-orch -- bash -c \
    "PGPASSWORD=monitor_pass_2026 psql -h $host -U monitor -d postgres -tAc 'SELECT pg_is_in_recovery();'" 2>&1)
  echo "$host: $result"
done
# Expect: pg-primary=f, replicas=t

# 6. Orchestrator user has SUPERUSER
multipass exec pg-primary -- sudo -u postgres psql -tAc \
  "SELECT usesuper FROM pg_user WHERE usename = 'orchestrator';"
# Expect: t (required for pg_promote)

# 7. App user can connect
multipass exec proxy-orch -- bash -c \
  "PGPASSWORD=app_pass_2026 psql -h pg-primary -U appuser -d appdb -tAc 'SELECT 1;'"
# Expect: 1
```

**Configuration safety (checks 8-10):**

```bash
# 8. primary_conninfo uses IP addresses (not quoted hostnames)
for vm in pg-replica1 pg-replica2; do
  echo "$vm: $(multipass exec $vm -- sudo -u postgres bash -c \
    "grep 'host=' /var/lib/postgresql/17/main/postgresql.auto.conf | grep -o 'host=[^ ]*'")"
done
# Expect: host=192.168.x.x (NOT host=''pg-primary'')

# 9. Replication line in pg_hba.conf on replicas
for vm in pg-replica1 pg-replica2; do
  echo "$vm: $(multipass exec $vm -- grep replication /etc/postgresql/17/main/pg_hba.conf | head -1)"
done
# Expect: host replication replicator <subnet> scram-sha-256

# 10. DNS resolution across all VMs
for vm in pg-primary pg-replica1 pg-replica2 proxy-orch; do
  result=$(multipass exec $vm -- ping -c1 -W1 pg-primary 2>&1 >/dev/null && echo "OK" || echo "FAIL")
  echo "$vm: $result"
done
# Expect: all OK
```

<div class="callout-danger">
  <p><strong>DO NOT PROCEED</strong> to Part 2 if any pre-check fails. Each one corresponds to a real issue we encountered during failover testing. Fix the failing check first — the troubleshooting table below covers each scenario.</p>
</div>

<h2 id="troubleshooting">Troubleshooting</h2>

<table>
  <thead>
    <tr><th>Symptom</th><th>Check</th><th>Fix</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><code>pg_basebackup</code> hangs or times out</td>
      <td><code>pg_hba.conf</code> on primary — is the replication line present?</td>
      <td>Add the <code>host replication</code> line, reload with <code>SELECT pg_reload_conf();</code></td>
    </tr>
    <tr>
      <td>Replica starts but <code>pg_stat_replication</code> shows nothing</td>
      <td>Check <code>primary_conninfo</code> in <code>postgresql.auto.conf</code> on the replica</td>
      <td>Verify hostname, port, user, password. Check <code>standby.signal</code> file exists.</td>
    </tr>
    <tr>
      <td>Replica shows <code>state = startup</code> instead of <code>streaming</code></td>
      <td>Check replica logs: <code>journalctl -u postgresql -n 50</code></td>
      <td>Usually a WAL gap — re-run <code>pg_basebackup</code> from scratch</td>
    </tr>
    <tr>
      <td>Monitor user gets <code>FATAL: password authentication failed</code></td>
      <td>Verify <code>pg_hba.conf</code> allows the user from the correct subnet</td>
      <td>Add/fix the <code>host</code> line, reload config</td>
    </tr>
    <tr>
      <td>Replication lag keeps growing</td>
      <td><code>SELECT * FROM pg_stat_replication;</code> — compare <code>sent_lsn</code> vs <code>replay_lsn</code></td>
      <td>Check replica disk I/O and CPU. Increase <code>wal_keep_size</code> if needed.</td>
    </tr>
  </tbody>
</table>

<h2 id="next-steps">What's Next</h2>

The PostgreSQL replication foundation is in place. In <a href="/blog/proxysql-postgresql-ha-part2-proxysql-read-write-splitting.html">Part 2</a>, we install ProxySQL 3.x on the `proxy-orch` VM and configure:

- Backend server registration in `pgsql_servers`
- Read/write splitting with `pgsql_replication_hostgroups`
- Connection pooling and monitoring
- Query routing rules for automatic read/write separation
- Health check verification using the `monitor` user

The application will connect to a single ProxySQL endpoint while queries are transparently routed to the correct backend based on their type.

<div class="callout">
  <p><strong>CLEAN SHUTDOWN:</strong> To pause your lab, run <code>multipass stop --all</code>. Resume later with <code>multipass start --all</code> — replication reconnects automatically.</p>
</div>
