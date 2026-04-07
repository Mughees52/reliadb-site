---
title: "MySQL 8.0 to 8.4 LTS Upgrade Guide — Part 3: Upgrade Execution"
date: 2026-04-06T12:00:00.000Z
description: "Three MySQL upgrade approaches compared — replication-based, in-place, and rolling replica. Step-by-step commands, configuration templates, and time estimates for each method."
categories:
  - mysql
  - mysql-upgrade
read_time: 16
featured: false
---

<div class="series-nav">
  <h4>MySQL 8.0 to 8.4 LTS Upgrade Guide &mdash; 5-Part Series</h4>
  <ol>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-pre-upgrade-preparation.html">Part 1: Pre-Upgrade Preparation</a></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-testing.html">Part 2: Upgrade Testing</a></li>
    <li><span class="current">Part 3: Upgrade Execution (You Are Here)</span></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-rollback-validation.html">Part 4: Rollback and Post-Upgrade Validation</a></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-change-management-checklist.html">Part 5: Change Management, Troubleshooting, and Checklist</a></li>
  </ol>
</div>

Three primary approaches exist for performing the MySQL 8.0 to 8.4 upgrade. Each has different trade-offs for downtime, rollback complexity, and hardware requirements. Use the decision flowchart below to choose the right one for your environment.

<h2 id="choosing-approach">Choosing Your Upgrade Approach</h2>

<table>
  <thead>
    <tr><th>Approach</th><th>Downtime</th><th>Rollback</th><th>Hardware</th><th>Best For</th></tr>
  </thead>
  <tbody>
    <tr><td>Replication-Based</td><td>Minutes (cutover only)</td><td>Instant (redirect to 8.0)</td><td>Requires extra server</td><td>Production-critical, large datasets</td></tr>
    <tr><td>Rolling Replica</td><td>Minutes per node</td><td>Un-upgraded source available</td><td>Uses existing replicas</td><td>Replicated topologies</td></tr>
    <tr><td>In-Place</td><td>Hours (full duration)</td><td>Restore from backup (hours)</td><td>No extra hardware</td><td>Dev/QA, small datasets, budget-constrained</td></tr>
  </tbody>
</table>

<figure>
  <img src="/assets/images/blog/mysql-upgrade-8.4/image2.png" alt="Decision flowchart for selecting the right MySQL upgrade approach based on available hardware and existing topology" loading="lazy" decoding="async" />
  <figcaption>Figure 1: Decision flowchart for selecting the right MySQL upgrade approach based on available hardware and existing topology.</figcaption>
</figure>

<h2 id="replication-based">Approach 1: Replication-Based Upgrade (Recommended)</h2>

The replication-based approach provides minimal downtime, a natural testing period, and a straightforward rollback path. It requires additional hardware.

<figure>
  <img src="/assets/images/blog/mysql-upgrade-8.4/image3.png" alt="Replication-based upgrade showing Phase 1 sync via replication and Phase 2 cutover with traffic redirect" loading="lazy" decoding="async" />
  <figcaption>Figure 2: Replication-based upgrade &mdash; Phase 1 (sync via replication) and Phase 2 (cutover with traffic redirect).</figcaption>
</figure>

### Step-by-Step Procedure

**Step 1:** Install MySQL 8.4.8 on a new dedicated server.

**Step 2:** Configure the 8.4 server with cleaned-up `my.cnf`.

**Step 3:** Take a consistent backup from the MySQL 8.0 source:

```
# Using XtraBackup:
xtrabackup --backup --target-dir=/backup/for_84 --user=root --password=<pw>

# Or using mysqldump:
mysqldump --all-databases --single-transaction --routines --triggers \
  --events --source-data=2 > backup_for_84.sql
```

**Step 4:** Restore the backup on the MySQL 8.4 server.

**Step 5:** Set up replication from 8.0 (source) to 8.4 (replica).

For GTID-based replication (recommended):

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '8.0_source_ip',
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'repl_password',
  SOURCE_AUTO_POSITION = 1,
  GET_SOURCE_PUBLIC_KEY = 1;

START REPLICA;
```

For binary log position-based replication:

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '8.0_source_ip',
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'repl_password',
  SOURCE_LOG_FILE = 'binlog.000XXX',
  SOURCE_LOG_POS = XXXXXXX,
  GET_SOURCE_PUBLIC_KEY = 1;

START REPLICA;
```

**Step 6:** Monitor replication lag until `Seconds_Behind_Source = 0`.

**Step 7:** Run application validation tests against the 8.4 replica.

**Step 8:** Schedule maintenance window for cutover.

**Step 9:** During cutover:

1. Set 8.0 source to read-only to drain writes gracefully:
```sql
SET GLOBAL read_only = 1;
SET GLOBAL super_read_only = 1;
```
2. Verify 8.4 replica is fully caught up (`Seconds_Behind_Source = 0`)
3. Stop replication on the 8.4 server: `STOP REPLICA;`
4. Redirect application connections to the MySQL 8.4 server
5. Verify application functionality with smoke tests

### Estimated Time by Phase

<table>
  <thead>
    <tr><th>Phase</th><th>Estimated Hours</th></tr>
  </thead>
  <tbody>
    <tr><td>Install and configure MySQL 8.4</td><td>3-5</td></tr>
    <tr><td>Backup and restore from 8.0 to 8.4</td><td>5-15 (depends on data size)</td></tr>
    <tr><td>Setup replication and sync</td><td>2-4</td></tr>
    <tr><td>Monitoring and validation period</td><td>8-24</td></tr>
    <tr><td>Cutover activity</td><td>2-5</td></tr>
    <tr><td>Post-cutover monitoring</td><td>4-8</td></tr>
  </tbody>
</table>

<h2 id="in-place">Approach 2: In-Place Upgrade</h2>

The in-place upgrade replaces MySQL binaries on the same server. This requires less hardware but carries higher risk and longer downtime.

<div class="callout-warning">
  <p><strong>WARNING:</strong> In-place upgrades have NO easy rollback. If the upgrade fails, you must restore from backup, which for large datasets can take 10-20+ hours.</p>
</div>

<figure>
  <img src="/assets/images/blog/mysql-upgrade-8.4/image4.png" alt="In-place upgrade timeline showing each step with estimated duration, point of no return, and rollback path" loading="lazy" decoding="async" />
  <figcaption>Figure 3: In-place upgrade timeline showing each step, estimated duration, point of no return, and rollback path.</figcaption>
</figure>

### Step-by-Step Procedure

**Step 1:** Take full backup (both logical and physical) and verify restore works.

**Step 2:** Ensure binary log retention covers your rollback window:

```sql
SET GLOBAL binlog_expire_logs_seconds = 259200;  -- 3 days
```

**Step 3:** Record the current binary log position and GTID state.

**Step 4:** Stop MySQL 8.0 cleanly:

```sql
SET GLOBAL innodb_fast_shutdown = 0;  -- Clean shutdown (CRITICAL)
```

```bash
systemctl stop mysqld
```

**Step 5:** Back up the configuration file and data directory:

```bash
cp /etc/my.cnf /etc/my.cnf.bak_8037

# Option A: LVM snapshot (preferred for large datasets):
lvcreate --size 100G --snapshot --name mysql_snap /dev/vg0/mysql_data

# Option B: File copy (slower, requires disk space):
cp -a /var/lib/mysql /var/lib/mysql.bak_8037
```

**Step 6:** Remove MySQL 8.0 packages:

For Percona Server:

```bash
# RHEL/CentOS:
yum remove percona-server-server percona-server-client

# Debian/Ubuntu (use remove, NEVER purge):
apt-get remove percona-server-server percona-server-client
```

For Oracle MySQL:

```bash
# RHEL/CentOS:
yum remove mysql-community-server mysql-community-client

# Debian/Ubuntu (use remove, NEVER purge):
apt-get remove mysql-server mysql-client
```

<div class="callout-danger">
  <p><strong>CRITICAL:</strong> On Debian/Ubuntu, NEVER use <code>apt-get purge</code> instead of <code>apt-get remove</code>. Purge deletes configuration files AND can trigger data directory cleanup, destroying your data. Always use <code>remove</code> and verify <code>/var/lib/mysql</code> is intact before proceeding.</p>
</div>

**Step 7:** Install MySQL 8.4 packages:

For Percona Server repo:

```bash
# RHEL/CentOS:
yum install percona-server-server percona-server-common percona-server-client

# Debian/Ubuntu:
apt install -y percona-server-server percona-server-common percona-server-client

dpkg -l |grep percona |grep '8.4'
```

For Oracle MySQL rpm:

```bash
# RHEL/CentOS:
sudo yum install mysql-community-{server,client,client-plugins,icu-data-files,common,libs}-*

rpm -qa | grep mysql

# Debian/Ubuntu:
sudo dpkg -i mysql-{common,community-client-plugins,community-client-core,community-client,client,community-server-core,community-server,server}_*.deb
```

**Step 8:** Update `my.cnf`: remove all deprecated parameters, set explicit defaults.

**Step 9:** Start MySQL 8.4 with the existing data directory:

```bash
systemctl start mysqld
```

**Step 10:** Review the error log for upgrade messages and any issues:

```bash
tail -500 /var/log/mysql/mysqld.log
```

The server automatically upgrades the data dictionary and system tables on first start.

<div class="callout-danger">
  <p><strong>CRITICAL:</strong> Always set <code>innodb_fast_shutdown = 0</code> before stopping MySQL 8.0. Using <code>innodb_fast_shutdown = 2</code> leaves redo logs in a crash-like state. MySQL 8.4 cannot safely process these logs and will refuse to start. Recovery requires a full restore from backup.</p>
</div>

<div class="post-cta-inline">
  <h4>Want a DBA team to handle your upgrade?</h4>
  <p>A MySQL major version upgrade is high-stakes work. If you'd rather have experienced DBAs execute it while you focus on your applications, book a free assessment call.</p>
  <a href="/contact/" class="btn">Book Free Assessment &rarr;</a>
</div>

<h2 id="rolling-replica">Approach 3: Rolling Replica Upgrade</h2>

For environments with an existing source-replica replication topology, upgrade replicas first, then failover. This combines the benefits of minimal downtime with no extra hardware requirement.

<figure>
  <img src="/assets/images/blog/mysql-upgrade-8.4/image5.png" alt="Rolling replica upgrade showing four stages from initial state through failover and source upgrade" loading="lazy" decoding="async" />
  <figcaption>Figure 4: Rolling replica upgrade &mdash; four stages from initial state through failover and source upgrade.</figcaption>
</figure>

### Procedure

1. **Upgrade Replica 1:** Stop replication, perform in-place upgrade to 8.4 (per the In-Place procedure above), restart replication
2. **Monitor Replica 1** for stability, replication health, and query correctness (24-48 hours)
3. **Upgrade Replica 2** using the same procedure
4. Once all replicas are on 8.4 and stable, **perform a planned failover:** promote an 8.4 replica as the new source
5. **Upgrade the old source** (now demoted to replica) to 8.4

<div class="callout">
  <p><strong>NOTE:</strong> During the rolling upgrade, the un-upgraded source remains your rollback point. If any upgraded replica shows issues, you can remove it from the pool and rebuild. Only after promoting an 8.4 replica to source is the rollback path more complex.</p>
</div>

<h2 id="config-template">Configuration File Template for MySQL 8.4</h2>

Below is a recommended baseline `my.cnf` template, cleaned of all removed parameters and with explicit values for changed defaults. Adjust all values to match your hardware and workload.

```ini
[mysqld]
# ── Basic Settings ──
datadir                = /var/lib/mysql
port                   = 3306
server-id              = 1001
log-error              = /var/log/mysql/mysqld.log

# ── InnoDB (set explicitly to avoid silent default changes) ──
innodb_adaptive_hash_index = OFF     # 8.4 default; set ON only if benchmarks justify
innodb_flush_method        = O_DIRECT # 8.4 default; use fsync for ZFS/NFS
innodb_io_capacity         = 5000     # SSDs: 2000-5000, NVMe: 10000+, HDD: 200
innodb_log_buffer_size     = 64M      # 8.4 default; reduce if memory-constrained
innodb_page_cleaners       = 4

# ── Binary Logging ──
binlog_expire_logs_seconds = 259200   # 3 days; set to cover rollback window

# ── Authentication ──
# Transitional: uncomment to temporarily allow legacy auth during migration
# mysql_native_password = ON

# ── REMOVED in 8.4 - DO NOT INCLUDE ──
# default_authentication_plugin  (use authentication_policy)
# master_info_repository         (always TABLE)
# relay_log_info_repository      (always TABLE)
# binlog_transaction_dependency_tracking
# expire_logs_days               (use binlog_expire_logs_seconds)
# avoid_temporal_upgrade
# show_old_temporals
```

<h2 id="checklist">Part 3 Quick Checklist</h2>

<ul class="checklist">
  <li>Choose upgrade approach based on hardware and risk tolerance</li>
  <li>Take final pre-upgrade backup</li>
  <li>Execute upgrade using chosen approach</li>
  <li>Verify MySQL 8.4 starts and runs without errors</li>
  <li>Review error log for warnings</li>
  <li>Apply cleaned <code>my.cnf</code> configuration template</li>
</ul>

<div class="series-nav">
  <h4>Continue the Series</h4>
  <ol>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-testing.html">&larr; Part 2: Upgrade Testing</a></li>
    <li><span class="current">Part 3: Upgrade Execution (You Are Here)</span></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-rollback-validation.html">Part 4: Rollback and Post-Upgrade Validation &rarr;</a></li>
  </ol>
</div>
