---
title: "MySQL 8.0 to 8.4 LTS Upgrade Guide — Part 1: Pre-Upgrade Preparation"
date: 2026-04-06T10:00:00.000Z
description: "MySQL 8.0 reached EOL on April 6, 2026. This guide covers every pre-upgrade step — backups, upgrade checker, removed parameters, authentication migration, and schema fixes."
categories:
  - mysql
  - mysql-upgrade
read_time: 18
featured: true
author: "Mughees Ahmed"
dateModified: "2026-04-11T00:00:00+00:00"
---

<!-- Series Navigation -->
<div class="series-nav">
  <h4>MySQL 8.0 to 8.4 LTS Upgrade Guide &mdash; 5-Part Series</h4>
  <ol>
    <li><span class="current">Part 1: Pre-Upgrade Preparation (You Are Here)</span></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-testing.html">Part 2: Upgrade Testing</a></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-execution.html">Part 3: Upgrade Execution</a></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-rollback-validation.html">Part 4: Rollback and Post-Upgrade Validation</a></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-change-management-checklist.html">Part 5: Change Management, Troubleshooting, and Checklist</a></li>
  </ol>
</div>

MySQL 8.0 reached End of Life (EOL) on April 6, 2026. After that date, Oracle no longer provides standard support, security updates, or bug fixes. Upgrading to MySQL 8.4 LTS ensures continued long-term support, security patches, and access to performance improvements.

<div class="callout-danger">
  <p><strong>CRITICAL:</strong> This is a MAJOR version upgrade, not a minor patch. MySQL 8.0 to 8.4 introduces breaking changes in authentication, SQL syntax, configuration parameters, and data type handling. Thorough testing is mandatory.</p>
</div>

This guide is intended for Database Administrators (DBAs) performing the upgrade on self-managed MySQL or Percona Server installations. It covers both Oracle MySQL Community/Enterprise and Percona Server for MySQL. Where package commands differ between the two, both variants are shown explicitly.

<h2 id="key-differences">Key Differences: MySQL 8.0 vs 8.4 LTS</h2>

Before starting any upgrade work, understand the scope of what's changing. The following table summarizes the most impactful differences between MySQL 8.0 and 8.4 LTS.

<table>
  <thead>
    <tr><th>Area</th><th>Change in MySQL 8.4</th><th>Impact</th></tr>
  </thead>
  <tbody>
    <tr><td>Authentication</td><td><code>mysql_native_password</code> plugin removed</td><td>All users must use <code>caching_sha2_password</code> or other supported plugins</td></tr>
    <tr><td>AUTO_INCREMENT</td><td>No longer supported on FLOAT/DOUBLE columns</td><td>Tables using float/double AUTO_INCREMENT must be altered</td></tr>
    <tr><td>Foreign Keys</td><td>Stricter foreign key validation</td><td>Existing FK definitions may fail validation checks</td></tr>
    <tr><td>Reserved Keywords</td><td>New reserved keywords (e.g., MANUAL, QUALIFY, INTERSECT)</td><td>Tables/columns using new keywords need backtick quoting</td></tr>
    <tr><td>SQL Terminology</td><td>MASTER/SLAVE commands fully removed</td><td>Must use SOURCE/REPLICA; old syntax will ERROR, not just warn</td></tr>
    <tr><td>Removed Parameters</td><td><code>default_authentication_plugin</code>, <code>master_info_repository</code>, <code>relay_log_info_repository</code>, <code>binlog_transaction_dependency_tracking</code>, plus others</td><td>Must remove from my.cnf or server will refuse to start</td></tr>
    <tr><td>Default Values</td><td><code>innodb_adaptive_hash_index</code>, <code>innodb_flush_method</code>, <code>innodb_io_capacity</code>, <code>innodb_log_buffer_size</code></td><td>Behavior changes silently if not explicitly set</td></tr>
    <tr><td>sql_mode</td><td>Stricter defaults for SQL mode enforcement</td><td>Queries valid in 8.0 may fail or return different results in 8.4</td></tr>
    <tr><td>GROUP BY</td><td>Implicit sorting by GROUP BY fully removed</td><td>Queries relying on GROUP BY sort order must add explicit ORDER BY</td></tr>
  </tbody>
</table>

<h2 id="backup-strategy">Backup Strategy</h2>

Pre-upgrade preparation is the most critical phase. A well-prepared upgrade dramatically reduces risk and downtime. It all starts with backups.

<div class="callout">
  <p><strong>BEST PRACTICE:</strong> Always take BOTH a logical backup AND a physical backup before any upgrade activity. Test your restore procedure on a separate server before proceeding.</p>
</div>

A reliable, tested backup is your only safety net. Without it, a failed upgrade could result in catastrophic, unrecoverable data loss.

### Logical Backup Options

- **mysqldump:** Full logical dump including routines, triggers, and events
- **mydumper / myloader:** Multi-threaded logical backup and restore for large datasets
- **MySQL Shell Dump Utility (`util.dumpInstance`):** Modern parallel dump with compression

### Physical Backup Options

- **Percona XtraBackup:** Hot, non-blocking backup for InnoDB (use version matching your MySQL)
- **LVM Snapshots:** Instant filesystem-level snapshot (requires clean InnoDB shutdown or flush with lock)
- **File system copy (tar/gzip):** Cold backup after clean shutdown with `innodb_fast_shutdown=0`

### Sample mysqldump Command

```
mysqldump -u root -p --all-databases --single-transaction --routines \
  --triggers --events --set-gtid-purged=OFF > full_backup_pre_upgrade.sql
```

### Sample XtraBackup Commands

```
xtrabackup --backup --target-dir=/backup/full_pre_upgrade \
  --user=root --password=<password>

xtrabackup --prepare --target-dir=/backup/full_pre_upgrade
```

<div class="callout-warning">
  <p><strong>WARNING:</strong> Always verify your backup by performing a test restore on a separate server BEFORE beginning the upgrade. An untested backup is not a backup.</p>
</div>

<h2 id="disk-space">Disk Space Planning</h2>

A major version upgrade requires significant free disk space. Plan for the following:

<table>
  <thead>
    <tr><th>Item</th><th>Space Required</th><th>Notes</th></tr>
  </thead>
  <tbody>
    <tr><td>Logical backup (mysqldump)</td><td>1x database size (uncompressed)</td><td>Compressed: ~30-50% of raw size</td></tr>
    <tr><td>Physical backup (XtraBackup)</td><td>1x database size + redo logs</td><td>Stores raw InnoDB data files</td></tr>
    <tr><td>Data directory copy (in-place upgrade)</td><td>1x datadir size</td><td><code>cp -a /var/lib/mysql</code> for safety copy</td></tr>
    <tr><td>Temporary upgrade space</td><td>10-20% of datadir</td><td>InnoDB DD upgrade, redo log rebuild</td></tr>
    <tr><td>Binary log retention</td><td>Varies</td><td>Ensure <code>binlog_expire_logs_seconds</code> covers rollback window</td></tr>
  </tbody>
</table>

<div class="callout">
  <p><strong>BEST PRACTICE:</strong> As a rule of thumb, ensure at least 2.5x your current datadir size is available as free disk space before starting the upgrade. For a 1TB database, plan for at least 2.5TB free.</p>
</div>

<h2 id="table-integrity">Table Integrity Check</h2>

Identify and repair any corrupted tables before upgrading. Upgrading with corrupted data can cause the new version to fail to start or cause silent data corruption.

### Run Table Checks

```
mysqlcheck -u root -p --all-databases --check
```

### Auto-Repair Corrupted Tables (only after confirming backup)

```
mysqlcheck -u root -p --all-databases --auto-repair
```

### Check for Orphaned Tablespace Files

```sql
-- Check for orphaned tablespace files:
SELECT * FROM information_schema.INNODB_TABLESPACES
WHERE NAME NOT IN (SELECT CONCAT(TABLE_SCHEMA,'/',TABLE_NAME)
  FROM information_schema.TABLES WHERE ENGINE='InnoDB');
```

<div class="callout-warning">
  <p><strong>WARNING:</strong> Large table repairs can be extremely time-consuming and lock the table. Schedule repairs during a maintenance window.</p>
</div>

<h2 id="upgrade-checker">MySQL Shell Upgrade Checker Utility</h2>

The MySQL Shell Upgrade Checker is the single most important pre-upgrade tool. It analyzes your current instance against 24+ compatibility metrics and reports errors, warnings, and notices.

### Run the Upgrade Checker (targeting 8.4.8)

```
mysqlsh -- util checkForServerUpgrade root@localhost:3306 \
  --target-version=8.4.8 \
  --config-path=/etc/mysql/mysql.conf.d/mysqld.cnf
```

### Alternative JavaScript Syntax within MySQL Shell

```
util.checkForServerUpgrade("root@localhost:3306",
  {targetVersion: "8.4.8",
   configPath: "/etc/mysql/mysql.conf.d/mysqld.cnf"})
```

The Upgrade Checker examines:

- Usage of removed or deprecated system variables
- Usage of new reserved keywords as identifiers (table/column names)
- Deprecated `utf8` (`utf8mb3`) character set usage
- Tables with temporal columns in pre-5.6.4 format
- Partitioned tables with unsupported engines
- Foreign key constraint naming conflicts
- Column definitions exceeding maximum lengths
- Zero date/datetime values (`0000-00-00`) violating strict mode
- Authentication plugin compatibility
- Orphan data dictionary entries and inconsistencies

<div class="callout-danger">
  <p><strong>CRITICAL:</strong> All ERRORS reported by the Upgrade Checker MUST be resolved before proceeding. Warnings should also be addressed. Ignoring these will lead to failed upgrades or production outages.</p>
</div>

<div class="callout">
  <p><strong>NOTE:</strong> If you encounter a "No database selected" error, include the database in the connection string: <code>mysqlsh user@localhost:3306/mysql -- util check-for-server-upgrade</code></p>
</div>

<h2 id="removed-parameters">Removed and Changed Configuration Parameters</h2>

MySQL 8.4 removes several parameters that were deprecated in 8.0. If any of these remain in your `my.cnf`, the server will refuse to start.

### Parameters Removed in MySQL 8.4 (must remove from my.cnf)

<table>
  <thead>
    <tr><th>Parameter</th><th>Action Required</th></tr>
  </thead>
  <tbody>
    <tr><td><code>default_authentication_plugin</code></td><td>Remove. Use <code>authentication_policy</code> system variable instead.</td></tr>
    <tr><td><code>master_info_repository</code></td><td>Remove. Always uses TABLE in 8.4.</td></tr>
    <tr><td><code>relay_log_info_repository</code></td><td>Remove. Always uses TABLE in 8.4.</td></tr>
    <tr><td><code>binlog_transaction_dependency_tracking</code></td><td>Remove. No longer available.</td></tr>
    <tr><td><code>avoid_temporal_upgrade</code></td><td>Remove. Temporal columns always use new format.</td></tr>
    <tr><td><code>show_old_temporals</code></td><td>Remove. No longer available.</td></tr>
    <tr><td><code>log_bin_use_v1_row_events</code></td><td>Remove. v2 row events are always used.</td></tr>
    <tr><td><code>expire_logs_days</code></td><td>Remove. Use <code>binlog_expire_logs_seconds</code> instead.</td></tr>
    <tr><td><code>old_alter_table</code></td><td>Remove. No longer available.</td></tr>
    <tr><td><code>group_replication_recovery_complete_at</code></td><td>Remove if using Group Replication.</td></tr>
  </tbody>
</table>

<div class="callout">
  <p><strong>NOTE:</strong> This is not exhaustive. Run the Upgrade Checker (Section above) against your specific my.cnf to get the complete list of incompatible parameters for your configuration.</p>
</div>

### Parameters with Changed Default Values in 8.4

<table>
  <thead>
    <tr><th>Parameter</th><th>8.0 Default</th><th>8.4 Default</th><th>Recommendation</th></tr>
  </thead>
  <tbody>
    <tr><td><code>innodb_adaptive_hash_index</code></td><td>ON</td><td>OFF</td><td>Explicitly set based on your workload benchmarks</td></tr>
    <tr><td><code>innodb_flush_method</code></td><td>fsync</td><td>O_DIRECT</td><td>O_DIRECT is better for most Linux + SSD/NVMe setups; use fsync for ZFS or NFS</td></tr>
    <tr><td><code>innodb_io_capacity</code></td><td>200</td><td>10000</td><td>200 for spinning disks, 2000-5000 for SSD, 10000+ for NVMe</td></tr>
    <tr><td><code>innodb_log_buffer_size</code></td><td>16M</td><td>64M</td><td>64M is fine for most workloads; reduce only if memory-constrained</td></tr>
  </tbody>
</table>

<div class="callout">
  <p><strong>BEST PRACTICE:</strong> Before upgrading, explicitly set any parameters whose defaults change if you rely on the 8.0 behavior. Silent default changes are one of the biggest sources of unexpected post-upgrade performance shifts.</p>
</div>

<h2 id="sql-mode">sql_mode Changes</h2>

MySQL 8.4 enforces stricter `sql_mode` defaults. This is one of the most common sources of silent breakage where queries that worked in 8.0 fail or return different results in 8.4.

### Key sql_mode Changes

- **ONLY_FULL_GROUP_BY is enforced by default:** SELECT columns not in GROUP BY or aggregate functions will error
- **NO_ZERO_IN_DATE and NO_ZERO_DATE:** Dates like `'0000-00-00'` or `'2024-00-15'` are rejected
- **Implicit GROUP BY sorting removed:** Queries relying on GROUP BY producing sorted output must add explicit ORDER BY clauses

### Check Your Current sql_mode

```sql
SELECT @@GLOBAL.sql_mode;
```

### Find Tables with Zero-Date Values

```sql
-- Example for a specific table:
SELECT COUNT(*) FROM your_table
WHERE date_column = '0000-00-00' OR date_column = '0000-00-00 00:00:00';
```

<div class="callout-warning">
  <p><strong>WARNING:</strong> If your application relies on zero-date values or implicit GROUP BY sorting, these must be fixed before upgrading, or you must explicitly set <code>sql_mode</code> in <code>my.cnf</code> to match your 8.0 behavior. However, carrying forward legacy modes is technical debt that should be addressed.</p>
</div>

<h2 id="auth-migration">Authentication Plugin Migration</h2>

<div class="callout-danger">
  <p><strong>CRITICAL:</strong> The <code>mysql_native_password</code> plugin is REMOVED in MySQL 8.4. Any user account still using this plugin will be unable to authenticate after upgrade unless the transitional option is used.</p>
</div>

### Identify Affected Users

```sql
SELECT user, host, plugin, password_expired
FROM mysql.user WHERE plugin = 'mysql_native_password';
```

### Migrate Users to caching_sha2_password

```sql
ALTER USER 'username'@'host' IDENTIFIED WITH caching_sha2_password BY 'new_password';
```

Verify that all application connection libraries and drivers support `caching_sha2_password`. Older MySQL connectors (pre-8.0) may not support the new authentication plugin. Common connectors that need updating:

<table>
  <thead>
    <tr><th>Connector</th><th>Minimum Version Required</th></tr>
  </thead>
  <tbody>
    <tr><td>MySQL Connector/J</td><td>8.0.12+</td></tr>
    <tr><td>MySQL Connector/Python</td><td>8.0.11+</td></tr>
    <tr><td>PHP mysqlnd</td><td>PHP 7.4+ with mysqlnd (native support)</td></tr>
    <tr><td>Go sql driver (go-sql-driver/mysql)</td><td>1.4+</td></tr>
    <tr><td>Node.js mysql2</td><td>1.6+ (note: <code>mysql</code> package does NOT support it)</td></tr>
  </tbody>
</table>

<figure>
  <img src="/assets/images/blog/mysql-upgrade-8.4/image1.png" alt="Authentication migration flow diagram showing Path A (recommended with caching_sha2_password) and Path B (transitional with mysql_native_password)" loading="lazy" decoding="async" />
  <figcaption>Figure 1: Authentication migration flow &mdash; Path A (recommended target state with caching_sha2_password) vs Path B (transitional with mysql_native_password enabled).</figcaption>
</figure>

<h2 id="transitional-auth">Transitional Option: Temporarily Re-enabling mysql_native_password</h2>

If an immediate migration of all users and applications to `caching_sha2_password` isn't feasible, MySQL 8.4 provides a transitional option. Add the following to your `my.cnf`:

```ini
[mysqld]
mysql_native_password = ON
```

This loads the plugin at startup so existing accounts using `mysql_native_password` can still authenticate. It does not make it the default for new accounts. This is strictly a temporary measure to allow a phased migration.

<div class="callout-warning">
  <p><strong>WARNING:</strong> The <code>mysql_native_password</code> plugin is deprecated and will be permanently removed in a future MySQL release. Using the transitional option only buys time. Plan to complete migration to <code>caching_sha2_password</code> within 30 days of upgrade.</p>
</div>

### Recommended Migration Sequence

1. Add `mysql_native_password = ON` to `my.cnf` for the 8.4 upgrade
2. Upgrade MySQL from 8.0.37 to 8.4
3. Verify all applications and users can connect successfully
4. Migrate user accounts to `caching_sha2_password` in batches:
```sql
ALTER USER 'app_user'@'%' IDENTIFIED WITH caching_sha2_password BY 'password';
```
5. After all accounts are migrated, remove `mysql_native_password = ON` from `my.cnf`
6. Restart MySQL and verify all connections still work

<h2 id="proxysql">ProxySQL Considerations</h2>

If your environment uses ProxySQL for connection pooling, load balancing, or query routing, the authentication plugin change requires special attention.

<div class="callout-danger">
  <p><strong>CRITICAL:</strong> ProxySQL version 2.5.4 or later is required for <code>caching_sha2_password</code> support on the backend side. Upgrade ProxySQL BEFORE upgrading MySQL.</p>
</div>

### Key Considerations

- ProxySQL handles frontend (app-to-ProxySQL) and backend (ProxySQL-to-MySQL) authentication separately. Both paths must support `caching_sha2_password`.
- `caching_sha2_password` requires either TLS or RSA public key exchange for the initial handshake. Without TLS between ProxySQL and MySQL, the first authentication will fail.
- Configure `GET_SOURCE_PUBLIC_KEY=1` in ProxySQL `mysql_servers`, or enable TLS between ProxySQL and MySQL backends.

### Recommended Upgrade Order for ProxySQL Environments

1. Upgrade ProxySQL to version 2.5.4+ (no disruption to existing 8.0 traffic)
2. Configure TLS or RSA key exchange between ProxySQL and MySQL backends
3. Test `caching_sha2_password` connectivity through ProxySQL in staging
4. Proceed with MySQL 8.0.37 to 8.4 upgrade (with `mysql_native_password=ON` as transitional)
5. Migrate user accounts to `caching_sha2_password` in batches, validating through ProxySQL
6. Remove `mysql_native_password = ON` from `my.cnf` once fully migrated

<div class="callout">
  <p><strong>BEST PRACTICE:</strong> Always test the full authentication chain (Application &rarr; ProxySQL &rarr; MySQL 8.4) in staging before production cutover. Authentication failures through ProxySQL are one of the most common post-upgrade issues.</p>
</div>

<div class="post-cta-inline">
  <h4>Planning a MySQL 8.4 upgrade?</h4>
  <p>Pre-upgrade preparation is where most teams underestimate the work. If you'd like expert guidance through the compatibility checks, authentication migration, and configuration changes, book a free assessment call.</p>
  <a href="/contact/" class="btn">Book Free Assessment &rarr;</a>
</div>

<h2 id="schema-checks">Schema Compatibility Checks</h2>

### AUTO_INCREMENT on FLOAT/DOUBLE Columns

MySQL 8.4 removes AUTO_INCREMENT support on FLOAT or DOUBLE columns. Identify and alter affected tables:

```sql
SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE
FROM information_schema.COLUMNS
WHERE EXTRA LIKE '%auto_increment%'
  AND DATA_TYPE IN ('float', 'double');
```

Fix by altering the column to INT or BIGINT:

```sql
ALTER TABLE table_name MODIFY COLUMN id BIGINT AUTO_INCREMENT;
```

### New Reserved Keywords

MySQL 8.4 adds reserved keywords including `MANUAL`, `QUALIFY`, `INTERSECT`, and others. If any identifiers use these keywords, they must be backtick-quoted:

```sql
-- This will FAIL in 8.4:
CREATE TABLE manual (id INT);

-- Fix:
CREATE TABLE `manual` (id INT);
```

### Foreign Key Validation

MySQL 8.4 enforces stricter foreign key validation. The Upgrade Checker identifies problematic FK constraints. Common issues include mismatched column types between parent and child tables, and FK names that conflict with reserved identifiers.

### Character Set Considerations (utf8mb3 to utf8mb4)

While not a hard blocker, `utf8` (`utf8mb3`) is deprecated. Converting to `utf8mb4` changes byte widths from 3 to 4 bytes per character, which may violate index length limits (767 bytes for compact/redundant, 3072 for dynamic/compressed). Always check index sizes before converting:

```sql
SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME
FROM information_schema.COLUMNS
WHERE CHARACTER_SET_NAME IN ('utf8', 'utf8mb3');
```

<h2 id="syntax-changes">SQL Syntax and Terminology Changes</h2>

MySQL 8.4 fully removes deprecated replication-related SQL syntax. In 8.0, these produced warnings. In 8.4, they produce ERRORS. All scripts, monitoring tools, and automation must be updated.

<table>
  <thead>
    <tr><th>Removed Syntax (8.0)</th><th>Required Replacement (8.4)</th></tr>
  </thead>
  <tbody>
    <tr><td><code>SHOW SLAVE STATUS</code></td><td><code>SHOW REPLICA STATUS</code></td></tr>
    <tr><td><code>SHOW MASTER STATUS</code></td><td><code>SHOW BINARY LOG STATUS</code></td></tr>
    <tr><td><code>CHANGE MASTER TO ...</code></td><td><code>CHANGE REPLICATION SOURCE TO ...</code></td></tr>
    <tr><td><code>RESET MASTER</code></td><td><code>RESET BINARY LOGS AND GTIDS</code></td></tr>
    <tr><td><code>STOP SLAVE / START SLAVE</code></td><td><code>STOP REPLICA / START REPLICA</code></td></tr>
    <tr><td><code>RESET SLAVE / RESET SLAVE ALL</code></td><td><code>RESET REPLICA / RESET REPLICA ALL</code></td></tr>
  </tbody>
</table>

<div class="callout-warning">
  <p><strong>WARNING:</strong> Audit ALL application code, stored procedures, monitoring scripts (PMM custom queries, Nagios/Zabbix checks, cron jobs), ProxySQL query rules, and automation tools for deprecated syntax. These commands will produce hard errors in MySQL 8.4.</p>
</div>

<h2 id="checklist">Part 1 Quick Checklist</h2>

Use this checklist to verify you've completed all pre-upgrade preparation steps before moving on to testing.

<ul class="checklist">
  <li>Take full logical backup (mysqldump/mydumper) and verify restore</li>
  <li>Take full physical backup (XtraBackup/LVM snapshot) and verify restore</li>
  <li>Verify sufficient disk space (2.5x datadir free)</li>
  <li>Run <code>mysqlcheck --all-databases --check</code> for corruption</li>
  <li>Run MySQL Shell Upgrade Checker targeting 8.4.8</li>
  <li>Resolve all Upgrade Checker ERRORS</li>
  <li>Address all Upgrade Checker WARNINGS</li>
  <li>Identify and migrate <code>mysql_native_password</code> users (or plan transitional)</li>
  <li>Identify and fix AUTO_INCREMENT on FLOAT/DOUBLE columns</li>
  <li>Audit <code>my.cnf</code>: remove all deprecated/removed parameters</li>
  <li>Set explicit values for parameters with changed defaults</li>
  <li>Review and fix <code>sql_mode</code>-dependent queries (GROUP BY, zero dates)</li>
  <li>Audit all scripts/code for MASTER/SLAVE syntax</li>
  <li>Upgrade ProxySQL to 2.5.4+ (if applicable)</li>
  <li>Test auth chain through ProxySQL in staging (if applicable)</li>
  <li>Verify all tool versions are 8.4-compatible (PMM, XtraBackup, etc.)</li>
</ul>

<!-- Series Nav Bottom -->
<div class="series-nav">
  <h4>Continue the Series</h4>
  <ol>
    <li><span class="current">Part 1: Pre-Upgrade Preparation (You Are Here)</span></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-testing.html">Part 2: Upgrade Testing &rarr;</a></li>
  </ol>
</div>

<div class="related-posts">
<h3>Related Articles</h3>
<div class="related-grid">
<a class="related-card" href="/blog/mysql-explain-analyzer-free-query-plan-visualizer.html">
<div class="rc-cat">Tools</div>
<h4>We Built a Free MySQL EXPLAIN Analyzer</h4>
</a>
<a class="related-card" href="/blog/mysql-8-to-8-4-upgrade-testing.html">
<div class="rc-cat">MySQL Upgrade</div>
<h4>MySQL 8.0 to 8.4 LTS Upgrade Guide — Part 2</h4>
</a>
</div>
</div>
