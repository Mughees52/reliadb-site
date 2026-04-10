---
title: "MariaDB 10.6 to MySQL Aurora 8.0 Migration Guide — Part 1: Pre-Migration Requirements"
date: 2026-04-08T10:00:00.000Z
description: "Pre-migration checklist for migrating from MariaDB 10.6 to Amazon Aurora MySQL 8.0 via AWS DMS. Covers timeout settings, binlog configuration, and target validation."
categories:
  - mysql
  - aws-rds
read_time: 12
featured: true
author: "Mario"
---

<div class="series-nav">
  <h4>MariaDB 10.6 to MySQL Aurora 8.0 Migration Guide &mdash; 5-Part Series</h4>
  <ol>
    <li><span class="current">Part 1: Pre-Migration Requirements (You Are Here)</span></li>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-aws-dms-infrastructure.html">Part 2: AWS DMS Infrastructure Setup</a></li>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-schema-migration.html">Part 3: Schema and User Migration</a></li>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-dms-endpoints-task.html">Part 4: DMS Endpoints, Task Configuration, and Assessments</a></li>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-execution-cutover-cleanup.html">Part 5: Execution, Validation, Cutover, and Cleanup</a></li>
  </ol>
</div>

Migrating from a self-managed or RDS-hosted MariaDB 10.6 instance to Amazon Aurora MySQL 8.0 is a cross-engine migration, not a simple version upgrade. MariaDB and MySQL diverged significantly after MySQL 5.5, accumulating differences in storage engines, replication protocol, SQL syntax, data types, and system tables. AWS Database Migration Service (DMS) bridges the data movement, but getting the source and target correctly configured before the first byte moves is what makes or breaks the migration.

This guide is based on a production migration from an RDS-hosted MariaDB 10.6 instance to Amazon Aurora MySQL 8.0 using AWS DMS with CDC (Change Data Capture) for a near-zero downtime cutover.

<div class="callout">
  <p><strong>Scope:</strong> This series covers RDS-hosted MariaDB as the source. Self-managed MariaDB on EC2 follows the same steps, but binary logging configuration differs — you set <code>log_bin</code> in the parameter group rather than enabling automated backups.</p>
</div>

<h2 id="why-aurora">Why Migrate from MariaDB to Amazon Aurora MySQL?</h2>

The two most common drivers for this migration are:

- **Aurora's performance and reliability tier** — Aurora MySQL uses a distributed, fault-tolerant storage layer with automatic replication across 3 AZs and 6 storage copies. It eliminates most of the operational overhead of managing replication manually.
- **Ecosystem alignment** — Aurora MySQL is wire-compatible with MySQL 8.0, meaning it integrates cleanly with MySQL-native tooling (Percona Toolkit, ProxySQL, MySQL Shell, MySQL Workbench) and avoids MariaDB-specific extensions that can cause portability friction.

The primary trade-off is that MariaDB-specific syntax and functions must be identified and remediated before the migration. Part 3 of this series covers schema compatibility in detail.

<h2 id="migration-approach">Migration Approach Overview</h2>

AWS DMS is the recommended approach for this type of cross-engine migration because it handles protocol translation between MariaDB's binlog format and Aurora MySQL's replication stream. The overall process runs in two phases:

<table>
  <thead>
    <tr><th>Phase</th><th>What Happens</th><th>Covered In</th></tr>
  </thead>
  <tbody>
    <tr><td>Schema Migration</td><td>Export schema from MariaDB, clean incompatible syntax, import to Aurora</td><td>Part 3</td></tr>
    <tr><td>Full Load</td><td>DMS copies all existing rows from source to target</td><td>Part 5</td></tr>
    <tr><td>CDC (Change Data Capture)</td><td>DMS continuously applies changes from MariaDB binlog to Aurora while applications still write to the source</td><td>Part 5</td></tr>
    <tr><td>Cutover</td><td>Stop writes to source, wait for CDC lag to reach zero, redirect application</td><td>Part 5</td></tr>
  </tbody>
</table>

<h2 id="mariadb-requirements">Pre-Migration Requirements: MariaDB (Source)</h2>

DMS reads changes from MariaDB using binary log replication. These settings must be in place before creating DMS endpoints or starting any task.

<h3 id="timeout-settings">Timeout Settings</h3>

Set `net_read_timeout`, `net_write_timeout`, and `wait_timeout` to at least 300 seconds. Without this, long-running DMS operations — particularly during full load of large tables — will hit disconnect errors mid-transfer.

```sql
SHOW VARIABLES LIKE 'net_read_timeout';
SHOW VARIABLES LIKE 'net_write_timeout';
SHOW VARIABLES LIKE 'wait_timeout';
```

If the values are below 300, update them in the RDS parameter group for your MariaDB instance. For RDS, changes to dynamic parameters apply immediately; static parameters require a reboot.

<h3 id="binlog-format">Binary Log Format</h3>

DMS requires `binlog_format=ROW`. Statement-based logging does not provide the row-level change detail that DMS needs for reliable CDC replication.

```sql
SHOW VARIABLES LIKE 'binlog_format';
```

The expected output is `ROW`. If it shows `MIXED` or `STATEMENT`, update the parameter group. For RDS MariaDB, this is a static parameter requiring an instance reboot.

<h3 id="binlog-row-image">Binary Log Row Image</h3>

Set `binlog_row_image` to `FULL`. This ensures the binlog captures the complete before and after image of every changed row. The `MINIMAL` setting, which only logs changed columns, is not supported by DMS.

```sql
SHOW VARIABLES LIKE 'binlog_row_image';
```

<h3 id="binary-logging">Binary Logging Enabled</h3>

On RDS MariaDB, binary logging is enabled by turning on automated backups at the instance level. Verify binary logging is active:

```sql
SHOW VARIABLES LIKE 'log_bin';
```

The output must show `ON`. If automated backups are disabled on the instance, enable them through the RDS console (a brief outage may occur).

<h3 id="binlog-retention">Binary Log Retention</h3>

DMS reads from the binary log continuously. If the log is purged before DMS can read it, the task fails and must restart from a full load. Increase the retention window to at least 26 hours to provide a buffer during maintenance windows or replication lag events:

```sql
CALL mysql.rds_set_configuration('binlog retention hours', 26);
```

<div class="callout-warning">
  <p><strong>Storage impact:</strong> Increasing binlog retention increases storage consumption on the RDS instance proportionally to the write throughput of your workload. Monitor the <code>FreeStorageSpace</code> CloudWatch metric after making this change and ensure you have sufficient headroom.</p>
</div>

<h2 id="aurora-requirements">Pre-Migration Requirements: Aurora MySQL (Target)</h2>

The Aurora MySQL target also requires specific configuration. These settings are applied through the Aurora cluster's parameter group.

<h3 id="aurora-binlog">Binary Log Format (Aurora)</h3>

If you plan to use CDC replication (keeping Aurora in sync with MariaDB during the migration), set `binlog_format=ROW` on the Aurora cluster parameter group as well. This is required if you intend to use Aurora as a replication source for any downstream systems post-migration.

```sql
SHOW VARIABLES LIKE 'binlog_format';
```

<h3 id="timezone">Timezone Alignment</h3>

Ensure the Aurora instance is configured in the same timezone as the MariaDB source. Timezone mismatches cause silent data corruption on `DATETIME` and `TIMESTAMP` columns — DMS does not convert timestamps between timezones.

```sql
SHOW VARIABLES LIKE 'time_zone';
```

Compare the output on both the MariaDB source and Aurora target. They must match.

<h3 id="local-infile">Local Infile</h3>

AWS DMS uses `LOAD DATA LOCAL INFILE` for bulk data loading during the full load phase. This requires `local_infile=1` on the target.

```sql
SHOW VARIABLES LIKE 'local_infile';
```

Set this in the Aurora cluster parameter group if it shows `OFF`.

<h2 id="checklist">Pre-Migration Requirements Checklist</h2>

<table>
  <thead>
    <tr><th>Requirement</th><th>Database</th><th>Check Command</th><th>Required Value</th></tr>
  </thead>
  <tbody>
    <tr><td><code>net_read_timeout</code></td><td>MariaDB</td><td><code>SHOW VARIABLES LIKE 'net_read_timeout'</code></td><td>&ge; 300</td></tr>
    <tr><td><code>net_write_timeout</code></td><td>MariaDB</td><td><code>SHOW VARIABLES LIKE 'net_write_timeout'</code></td><td>&ge; 300</td></tr>
    <tr><td><code>wait_timeout</code></td><td>MariaDB</td><td><code>SHOW VARIABLES LIKE 'wait_timeout'</code></td><td>&ge; 300</td></tr>
    <tr><td><code>binlog_format</code></td><td>MariaDB</td><td><code>SHOW VARIABLES LIKE 'binlog_format'</code></td><td><code>ROW</code></td></tr>
    <tr><td><code>binlog_row_image</code></td><td>MariaDB</td><td><code>SHOW VARIABLES LIKE 'binlog_row_image'</code></td><td><code>FULL</code></td></tr>
    <tr><td><code>log_bin</code></td><td>MariaDB</td><td><code>SHOW VARIABLES LIKE 'log_bin'</code></td><td><code>ON</code></td></tr>
    <tr><td>Binlog retention hours</td><td>MariaDB</td><td><code>CALL mysql.rds_show_configuration()</code></td><td>&ge; 26</td></tr>
    <tr><td><code>binlog_format</code></td><td>Aurora MySQL</td><td><code>SHOW VARIABLES LIKE 'binlog_format'</code></td><td><code>ROW</code></td></tr>
    <tr><td><code>time_zone</code></td><td>Both</td><td><code>SHOW VARIABLES LIKE 'time_zone'</code></td><td>Identical on both</td></tr>
    <tr><td><code>local_infile</code></td><td>Aurora MySQL</td><td><code>SHOW VARIABLES LIKE 'local_infile'</code></td><td><code>ON</code></td></tr>
  </tbody>
</table>

With all pre-migration requirements verified, proceed to Part 2 to set up the AWS DMS infrastructure.
