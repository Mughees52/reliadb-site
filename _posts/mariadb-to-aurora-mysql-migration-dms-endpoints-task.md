---
title: "MariaDB 10.6 to MySQL Aurora 8.0 Migration Guide — Part 4: DMS Endpoints, Task Configuration, and Assessments"
date: 2026-04-08T13:00:00.000Z
description: "Configure AWS DMS source and target endpoints, set up DMS users, create the migration task with correct LOB and table mapping settings, and run pre-migration assessments."
categories:
  - mysql
  - aws-rds
read_time: 16
featured: false
author: "Mario"
---

<div class="series-nav">
  <h4>MariaDB 10.6 to MySQL Aurora 8.0 Migration Guide &mdash; 5-Part Series</h4>
  <ol>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-pre-migration-requirements.html">Part 1: Pre-Migration Requirements</a></li>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-aws-dms-infrastructure.html">Part 2: AWS DMS Infrastructure Setup</a></li>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-schema-migration.html">Part 3: Schema and User Migration</a></li>
    <li><span class="current">Part 4: DMS Endpoints, Task Configuration, and Assessments (You Are Here)</span></li>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-execution-cutover-cleanup.html">Part 5: Execution, Validation, Cutover, and Cleanup</a></li>
  </ol>
</div>

With the AWS DMS replication instance running and the target schema imported, the next step is wiring up the migration: creating dedicated DMS database users on both sides, registering source and target endpoints in DMS, configuring the migration task, and running the pre-migration assessments that catch configuration problems before the actual data movement begins.

<h2 id="dms-users">Create DMS Database Users</h2>

DMS connects to both databases using dedicated database users. These users should have the minimum privileges required — no more. The private IP of the replication instance is used for host-based access control.

To find the replication instance private IP: go to **DMS** → **Replication instances** → select your instance → note the **Private IP address**.

<h3 id="dms-user-mariadb">MariaDB (Source) DMS User</h3>

```sql
GRANT SELECT ON <schema_name>.* TO 'dms_user'@'<replication_instance_ip>' IDENTIFIED BY '<password>' REQUIRE SSL;
GRANT RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'dms_user'@'<replication_instance_ip>';
GRANT SELECT ON mysql.user TO 'dms_user'@'<replication_instance_ip>';
GRANT SELECT ON mysql.db TO 'dms_user'@'<replication_instance_ip>';
GRANT SELECT ON mysql.tables_priv TO 'dms_user'@'<replication_instance_ip>';
FLUSH PRIVILEGES;
```

The `REPLICATION SLAVE` and `REPLICATION CLIENT` grants are required for DMS to read binary logs during the CDC phase.

<h3 id="dms-user-aurora">Aurora MySQL (Target) DMS User</h3>

The Aurora DMS user needs write access to the schema being migrated, replication privileges for CDC metadata, and full access to the `awsdms_control` database that DMS uses internally for task state management.

```sql
CREATE USER IF NOT EXISTS 'dms_user'@'<replication_instance_ip>' IDENTIFIED BY '<password>' REQUIRE SSL;
GRANT ALTER, CREATE, DROP, INDEX, INSERT, UPDATE, DELETE, SELECT ON <schema_name>.* TO 'dms_user'@'<replication_instance_ip>';
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'dms_user'@'<replication_instance_ip>';
GRANT ALL PRIVILEGES ON awsdms_control.* TO 'dms_user'@'<replication_instance_ip>';
GRANT SELECT ON mysql.user TO 'dms_user'@'<replication_instance_ip>';
GRANT SELECT ON mysql.db TO 'dms_user'@'<replication_instance_ip>';
GRANT SELECT ON mysql.tables_priv TO 'dms_user'@'<replication_instance_ip>';
GRANT SELECT ON mysql.role_edges TO 'dms_user'@'<replication_instance_ip>';
FLUSH PRIVILEGES;
```

<div class="callout">
  <p><strong><code>awsdms_control</code> database:</strong> DMS automatically creates this database on the target during the first task run. It stores task state, watermarks, and CDC checkpoint data. Granting <code>ALL PRIVILEGES</code> on it is required — DMS creates and drops tables in this schema during normal operation.</p>
</div>

<h2 id="ssl-certificate">Import SSL Certificate (Optional)</h2>

If you require SSL verification for the DMS connections (recommended for production), import the CA certificate before creating endpoints.

1. In the DMS console, go to **Certificates** → **Import certificate**
2. Provide a name for the certificate
3. Upload the CA certificate file (`.pem` format)
4. Click **Import Certificate**

This certificate will be selected during endpoint creation.

<h2 id="source-endpoint">Create the Source Endpoint (MariaDB)</h2>

In the DMS console, go to **Endpoints** → **Create endpoint**:

- **Endpoint type**: Source
- **Endpoint identifier**: a descriptive name (e.g., `mariadb-source-prod`)
- **Source engine**: MariaDB
- **Choose the RDS instance**: select your MariaDB RDS instance from the list
- **Provide access information manually**:
  - Port: `3306`
  - User name: `dms_user`
  - Password: (the password set above)
  - SSL mode: `verify-ca` (if using the imported certificate)
- **Certificate**: select the certificate imported in the previous step (if applicable)
- **Replication instance**: select the replication instance created in Part 2

Click **Test endpoint connection**. The test must pass before saving. If it fails, verify:
- The `dms_user` exists on MariaDB with the correct host IP
- The MariaDB security group allows inbound TCP 3306 from the replication instance SG
- The replication instance private IP matches the host used in the GRANT statements

Once the test passes, click **Create endpoint**.

<h2 id="target-endpoint">Create the Target Endpoint (Aurora MySQL)</h2>

- **Endpoint type**: Target
- **Endpoint identifier**: a descriptive name (e.g., `aurora-mysql-target-prod`)
- **Target engine**: Amazon Aurora MySQL
- **Choose the RDS instance**: select your Aurora cluster from the list
- **Provide access information manually**:
  - Port: `3306`
  - User name: `dms_user`
  - Password: (the password set above)
  - SSL mode: `verify-ca` (if using the imported certificate)
- **Certificate**: select the imported certificate (if applicable)

**Extra connection attributes — disable foreign key checks:**

In the **Extra connection attributes** field, add:

```
Initstmt=SET FOREIGN_KEY_CHECKS=0;
```

This disables foreign key validation during the full load phase. Without it, DMS may fail on tables that have foreign key dependencies if the parent rows haven't been loaded yet. Foreign keys are re-validated automatically when the connection setting is cleared after the full load completes.

Select the replication instance, test the connection, and create the endpoint.

<h2 id="migration-task">Create the Migration Task</h2>

<h3 id="s3-bucket">S3 Bucket for Migration Logs</h3>

Create an S3 bucket to store pre-migration assessment results and any error output from the migration task:

- Block all public access
- Enable versioning (optional but useful for debugging)

<h3 id="task-configuration">Task Configuration</h3>

In the DMS console, go to **Database migration tasks** → **Create task**:

- **Replication instance**: select your instance
- **Source endpoint**: the MariaDB endpoint
- **Target endpoint**: the Aurora MySQL endpoint
- **Migration type**: choose based on your requirements:
  - **Migrate existing data**: one-time full load only, no ongoing replication
  - **Migrate existing data and replicate ongoing changes**: full load followed by CDC, required for near-zero downtime cutover

<h3 id="task-settings">Task Settings</h3>

In the **Task settings** section, configure:

- **Target table preparation mode**: `Do nothing` — the schema was already imported in Part 3. Do not use `Drop tables on target` or `Truncate` as these will destroy your imported schema.
- **Stop task after full load completes**: `Don't stop` — allows CDC to begin automatically after the full load finishes
- **LOB column settings**: `Full LOB mode` — required for complete fidelity on tables with BLOB, TEXT, MEDIUMTEXT, or LONGTEXT columns. Full LOB mode loads the main row first, then fetches each LOB value individually. This is slower but guarantees no data truncation.

<div class="callout-warning">
  <p><strong>LOB mode trade-offs:</strong> If you select <code>Don't include LOB columns</code>, DMS skips all LOB-type columns entirely — including <code>TINYTEXT</code>, <code>MEDIUMTEXT</code>, and <code>LONGTEXT</code>. Use this only if you are certain those columns are not used or can be populated separately. <code>Limited LOB mode</code> truncates values that exceed the configured size limit.</p>
</div>

- **Data Validation**: `Disable` during the full load. Enable it after the full load is 100% complete (covered in Part 5). Running validation during full load generates additional queries on both databases and can slow the migration significantly.
- **CloudWatch logging**: enable — required for debugging task errors
- **Log context**: enable at `Error` level for the task manager; add `Info` for the Task Manager component if you need verbose output

<h3 id="table-mappings">Table Mappings</h3>

Table mappings define which schemas and tables to include. Use JSON rules:

```json
{
  "rules": [
    {
      "rule-type": "selection",
      "rule-id": "1",
      "rule-name": "IncludeAllTables",
      "object-locator": {
        "schema-name": "<schema_name>",
        "table-name": "%"
      },
      "rule-action": "include",
      "filters": []
    }
  ]
}
```

<h3 id="lob-per-table">Per-Table LOB Size Limits</h3>

If specific tables contain LOB columns that are known to be small (e.g., short description fields stored as TEXT), you can override Full LOB mode for those tables to use Limited LOB mode with a size cap. This speeds up migration for those tables without risking truncation on other tables.

Example: limit a specific table to 256KB per LOB value while using Full LOB mode for everything else:

```json
{
  "rules": [
    {
      "rule-type": "selection",
      "rule-id": "1",
      "rule-name": "IncludeAllTables",
      "object-locator": {
        "schema-name": "<schema_name>",
        "table-name": "%"
      },
      "rule-action": "include"
    },
    {
      "rule-type": "table-settings",
      "rule-id": "2",
      "rule-name": "LimitLOBForSpecificTable",
      "object-locator": {
        "schema-name": "<schema_name>",
        "table-name": "<table_name>"
      },
      "rule-action": "include",
      "lob-settings": {
        "lob-mode": "limited",
        "inline-lob-max-size": 256,
        "max-lob-size": 256
      }
    }
  ]
}
```

<h3 id="premigration-config">Pre-Migration Assessment Settings</h3>

In the task creation wizard, **turn off premigration assessments**. Create them separately in the next step. If you attach assessments during task creation, DMS may associate incompatible assessment types with your migration type, causing the assessment run to fail.

**Migration task startup configuration**: set to **Manually later**. Don't start the task until the pre-migration assessments have been reviewed.

<h2 id="premigration-assessments">Run Pre-Migration Assessments</h2>

Pre-migration assessments check your source database, task configuration, and target for known issues before any data moves. Run them after creating the task but before starting it.

**To create an assessment run:**

1. Select the migration task and click **Create premigration assessment**
2. Create and assign a new IAM role if prompted (DMS needs permission to write results to S3)
3. Select all assessments **except** the following two, which produce false positives in this migration type:

<table>
  <thead>
    <tr><th>Assessment to Unselect</th><th>Why It Can Be Skipped</th></tr>
  </thead>
  <tbody>
    <tr><td>Check if binary log retention time is set properly</td><td>Even with <code>log_bin=ON</code> and retention &gt; 24 hours configured, this check often fails due to how it reads RDS MariaDB configuration. Manually verified in Part 1.</td></tr>
    <tr><td>Source table with LOBs but without primary keys or unique constraints</td><td>DMS includes system schemas (<code>mysql</code>, <code>sys</code>, <code>information_schema</code>) in this check, which have LOB columns without PKs by design. These are irrelevant to your migration.</td></tr>
  </tbody>
</table>

Review the assessment results. Not every warning requires action — some are informational about features DMS cannot automatically handle. Address any **Error** severity findings before proceeding to Part 5.

With endpoints tested, task configured, and assessments passing, proceed to Part 5 to start the migration.
