---
title: "MariaDB 10.6 to MySQL Aurora 8.0 Migration Guide — Part 5: Execution, Validation, Cutover, and Cleanup"
date: 2026-04-08T14:00:00.000Z
description: "Run the AWS DMS migration task, enable data validation, perform the cutover from MariaDB to Aurora MySQL, recreate indexes, and clean up all temporary AWS resources."
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
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-dms-endpoints-task.html">Part 4: DMS Endpoints, Task Configuration, and Assessments</a></li>
    <li><span class="current">Part 5: Execution, Validation, Cutover, and Cleanup (You Are Here)</span></li>
  </ol>
</div>

With the schema imported, endpoints tested, and the migration task configured, the final phase covers starting the migration, monitoring its progress, validating data consistency, performing the cutover, and removing all temporary AWS resources created for the migration.

<h2 id="final-checks">Final Checks Before Starting</h2>

Before starting the migration task, verify these items are in place:

<table>
  <thead>
    <tr><th>Item</th><th>Location</th><th>Required State</th></tr>
  </thead>
  <tbody>
    <tr><td>Schema imported to Aurora</td><td>Aurora target</td><td>All tables present, verified with <code>mysqlcheck</code></td></tr>
    <tr><td>Secondary indexes dropped on target</td><td>Aurora target</td><td><code>drop_indexes.sql</code> executed, only PRIMARY KEYs remain</td></tr>
    <tr><td>Foreign key checks disabled on target endpoint</td><td>DMS target endpoint</td><td><code>Initstmt=SET FOREIGN_KEY_CHECKS=0;</code> in extra connection attributes</td></tr>
    <tr><td>Pre-migration assessments passed</td><td>DMS console</td><td>No Error severity findings</td></tr>
    <tr><td>CloudWatch logging enabled on task</td><td>DMS task settings</td><td>On</td></tr>
    <tr><td>Data Validation disabled</td><td>DMS task settings</td><td>Disabled (will be enabled after full load)</td></tr>
    <tr><td>Task startup configuration</td><td>DMS task settings</td><td>Manual start</td></tr>
  </tbody>
</table>

<h2 id="start-task">Start the Migration Task</h2>

Select the migration task in the DMS console and click **Actions** → **Restart/Resume**. The task enters the **Full load** phase immediately.

Monitor progress from the **Table statistics** tab of the task details. Key columns:

- **Full load rows** — rows loaded so far for each table
- **Inserts / Updates / Deletes** — CDC changes applied (will be 0 until full load completes)
- **Validation state** — will show `Not enabled` until you enable validation

<h2 id="monitoring">Monitoring the Migration</h2>

<h3 id="cloudwatch-logs">CloudWatch Logs</h3>

Navigate to CloudWatch Logs → Log groups → find the log group for your DMS task (named `/aws/dms/tasks/<task-id>`). Monitor for:

- `[ERROR]` entries — indicate failed row operations or connectivity issues
- `LOB` warnings — if DMS cannot retrieve a LOB value, it logs the table, row, and column
- Latency metrics — available in the DMS **CloudWatch metrics** tab of the task

<h3 id="replication-lag">Replication Lag During CDC</h3>

Once the full load completes, DMS switches automatically to CDC mode and begins applying binlog events from the source. Monitor the **CDCLatencySource** and **CDCLatencyTarget** CloudWatch metrics on the replication instance. These values should trend toward zero as CDC catches up with the current position on the source.

A sustained increase in latency indicates the replication instance is under-sized for the write throughput of the source, or the target is a bottleneck (check Aurora CloudWatch metrics for CPU and write IOPS).

<h2 id="data-validation">Enable Data Validation</h2>

Once the **Full load** percentage reaches 100% in the task overview, enable data validation. Do not enable it during the full load — validation runs queries against both source and target simultaneously, which adds load and slows the migration.

To enable validation:
1. Stop the task temporarily (Actions → Stop)
2. Edit the task settings → enable **Data validation**
3. Restart the task

DMS data validation compares row counts and checksums between source and target tables. View results in the **Table statistics** tab under the **Validation state** column:

- `Validated` — row counts and checksums match
- `Validation errors` — discrepancies found, requires investigation
- `Validation suspended` — DMS skipped validation for a table (usually due to unsupported data types or missing primary keys)

Any `Validation errors` findings must be investigated before proceeding with cutover. The [AWS DMS data validation documentation](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Validating.html) covers resolution steps for common discrepancy types.

<h2 id="batch-apply">Enable Batch Apply</h2>

Once data validation shows all tables as `Validated`, enable Batch Apply mode on the CDC replication. Batch Apply groups multiple row-level events per table and applies them as bulk `INSERT`, `UPDATE`, or `DELETE` sets per transaction rather than one row at a time. This reduces commit frequency by up to 90% and significantly lowers write latency on the Aurora target.

To enable Batch Apply:
1. Edit the migration task
2. Under **Advanced task settings**, find **CDC batch apply mode** and enable it

<div class="callout">
  <p><strong>Batch Apply and LOBs:</strong> Batch Apply cannot be used together with Full LOB mode. If your migration uses Full LOB mode, skip Batch Apply and instead monitor CDC lag directly — Aurora's distributed storage handles the write load well for most workloads.</p>
</div>

<h2 id="cutover">Cutover Procedure</h2>

Cutover is the moment you stop writing to MariaDB and redirect application traffic to Aurora MySQL. The goal is to minimize the window between stopping writes on the source and resuming writes on the target.

<h3 id="cutover-steps">Step-by-Step Cutover</h3>

1. **Choose a low-traffic window.** Identify a period where application write rates are at their daily minimum. This reduces the time needed for CDC lag to reach zero.

2. **Stop the application from writing to MariaDB.** This is application-specific — options include:
   - Putting the application into maintenance mode
   - Redirecting traffic to a holding page
   - Disabling background jobs and cron tasks that write to the database

3. **Wait for CDC lag to reach zero.** Watch the **CDCLatencySource** metric in CloudWatch. It should drop to 0 seconds, indicating DMS has consumed all pending binlog events. Allow at least 2–3 minutes at zero lag before proceeding to confirm stability.

4. **Run final validation queries.** On both MariaDB and Aurora, compare row counts for critical tables:

   ```sql
   -- Run on both databases and compare
   SELECT table_name, table_rows
   FROM information_schema.TABLES
   WHERE table_schema = '<schema_name>'
   ORDER BY table_name;
   ```

   Note that `table_rows` in `information_schema` is an estimate. For exact counts on critical tables, run `SELECT COUNT(*)` directly.

5. **Create secondary indexes on Aurora.** Now that the full load is complete and CDC has caught up, rebuild the secondary indexes that were dropped before the migration:

   ```bash
   mysql -h <aurora-endpoint> -u admin -p -P 3306 <schema_name> < create_indexes.sql
   ```

   Monitor index creation progress in Aurora — on large tables this can take significant time. You can monitor progress in a separate session:

   ```sql
   SHOW PROCESSLIST;
   ```

6. **Redirect the application to Aurora MySQL.** Update the application's database connection string to point to the Aurora cluster endpoint. Aurora's cluster endpoint automatically routes to the current writer instance and handles failovers transparently.

7. **Verify the application.** Run smoke tests on the critical application paths. Check application logs for database errors.

8. **Disable or stop the DMS migration task.** Once the application is verified on Aurora, the DMS task is no longer needed.

<h2 id="post-migration">Post-Migration Validation</h2>

After the cutover, run a thorough validation of the Aurora target:

- Compare table counts between MariaDB and Aurora for all tables in the migrated schema
- Test all stored procedures and functions that are critical to application functionality
- Verify scheduled events and triggers fire as expected
- Check application error rates in your APM tool for the first 30–60 minutes after cutover

If critical issues are discovered post-cutover, the rollback path is to redirect the application connection string back to the original MariaDB instance. The MariaDB source remains untouched throughout this process — DMS reads from it but never writes to it.

<h2 id="cleanup">Cleanup</h2>

After successful cutover and a validation period (typically 24–48 hours), clean up all resources created for the migration.

<h3 id="cleanup-dms">Remove DMS Resources</h3>

Remove DMS resources in this order (dependencies must be removed first):

1. **Stop and delete migration tasks** — select each task, Actions → Stop, then Actions → Delete
2. **Delete both endpoints** — source (MariaDB) and target (Aurora) endpoints
3. **Delete the replication instance** — go to Replication instances and delete

<h3 id="cleanup-cert">Delete DMS Certificate</h3>

Go to **DMS** → **Certificates** and delete the imported CA certificate.

<h3 id="cleanup-users">Revoke DMS User Privileges</h3>

Remove the `dms_user` accounts from both databases once the migration task is deleted:

```sql
-- On MariaDB source
DROP USER 'dms_user'@'<replication_instance_ip>';
FLUSH PRIVILEGES;

-- On Aurora MySQL target
DROP USER 'dms_user'@'<replication_instance_ip>';
FLUSH PRIVILEGES;
```

<h3 id="cleanup-sg">Remove Temporary Security Group Rules</h3>

Remove any inbound rules added to the MariaDB and Aurora security groups specifically for the DMS replication instance. If you reused an existing security group for the replication instance, ensure the rules for port 3306 still make sense for the remaining resources that use that security group.

<h3 id="cleanup-iam">Delete IAM Roles and Policies</h3>

Delete the IAM resources created for DMS:

- Role: `dms-vpc-role`
- Role: `dms-cloudwatch-logs-role`
- Role: `DMSS3AccessRole-*` (the S3 access role created during premigration assessments)
- Policy: `DMSS3BucketPolicy-DMSS3AccessRole-*`

<h3 id="cleanup-s3">Delete the S3 Bucket</h3>

If the S3 bucket created for migration logs is no longer needed, delete it:

1. Empty the bucket first (required by S3 before deletion)
2. Delete the bucket from the S3 console

<h2 id="final-checklist">Complete Migration Checklist</h2>

<table>
  <thead>
    <tr><th>#</th><th>Task</th><th>Part</th><th>Status</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>MariaDB timeout settings &ge; 300s</td><td>Part 1</td><td></td></tr>
    <tr><td>2</td><td>MariaDB <code>binlog_format=ROW</code></td><td>Part 1</td><td></td></tr>
    <tr><td>3</td><td>MariaDB <code>binlog_row_image=FULL</code></td><td>Part 1</td><td></td></tr>
    <tr><td>4</td><td>MariaDB binary logging enabled</td><td>Part 1</td><td></td></tr>
    <tr><td>5</td><td>MariaDB binlog retention &ge; 26 hours</td><td>Part 1</td><td></td></tr>
    <tr><td>6</td><td>Aurora <code>binlog_format=ROW</code></td><td>Part 1</td><td></td></tr>
    <tr><td>7</td><td>Timezone identical on source and target</td><td>Part 1</td><td></td></tr>
    <tr><td>8</td><td>Aurora <code>local_infile=1</code></td><td>Part 1</td><td></td></tr>
    <tr><td>9</td><td>IAM role <code>dms-vpc-role</code> created</td><td>Part 2</td><td></td></tr>
    <tr><td>10</td><td>IAM role <code>dms-cloudwatch-logs-role</code> created</td><td>Part 2</td><td></td></tr>
    <tr><td>11</td><td>DMS replication instance created</td><td>Part 2</td><td></td></tr>
    <tr><td>12</td><td>Security groups configured for DMS access</td><td>Part 2</td><td></td></tr>
    <tr><td>13</td><td>Schema exported with compatibility pipeline</td><td>Part 3</td><td></td></tr>
    <tr><td>14</td><td>Schema reviewed for incompatible objects</td><td>Part 3</td><td></td></tr>
    <tr><td>15</td><td>Schema imported to Aurora, <code>mysqlcheck</code> clean</td><td>Part 3</td><td></td></tr>
    <tr><td>16</td><td>Secondary indexes dropped on Aurora target</td><td>Part 3</td><td></td></tr>
    <tr><td>17</td><td>DB users migrated to Aurora</td><td>Part 3</td><td></td></tr>
    <tr><td>18</td><td>DMS user created on MariaDB source</td><td>Part 4</td><td></td></tr>
    <tr><td>19</td><td>DMS user created on Aurora target</td><td>Part 4</td><td></td></tr>
    <tr><td>20</td><td>Source endpoint created and tested</td><td>Part 4</td><td></td></tr>
    <tr><td>21</td><td>Target endpoint created and tested (FK checks disabled)</td><td>Part 4</td><td></td></tr>
    <tr><td>22</td><td>Migration task created (Full Load + CDC)</td><td>Part 4</td><td></td></tr>
    <tr><td>23</td><td>Pre-migration assessments run, errors resolved</td><td>Part 4</td><td></td></tr>
    <tr><td>24</td><td>Migration task started</td><td>Part 5</td><td></td></tr>
    <tr><td>25</td><td>Full load reached 100%</td><td>Part 5</td><td></td></tr>
    <tr><td>26</td><td>Data validation enabled and all tables Validated</td><td>Part 5</td><td></td></tr>
    <tr><td>27</td><td>CDC lag at zero before cutover</td><td>Part 5</td><td></td></tr>
    <tr><td>28</td><td>Application writes stopped on MariaDB</td><td>Part 5</td><td></td></tr>
    <tr><td>29</td><td>Secondary indexes recreated on Aurora</td><td>Part 5</td><td></td></tr>
    <tr><td>30</td><td>Application redirected to Aurora</td><td>Part 5</td><td></td></tr>
    <tr><td>31</td><td>Post-migration validation passed</td><td>Part 5</td><td></td></tr>
    <tr><td>32</td><td>DMS tasks, endpoints, and replication instance deleted</td><td>Part 5</td><td></td></tr>
    <tr><td>33</td><td>DMS user revoked from both databases</td><td>Part 5</td><td></td></tr>
    <tr><td>34</td><td>Temporary security group rules removed</td><td>Part 5</td><td></td></tr>
    <tr><td>35</td><td>IAM roles and policies deleted</td><td>Part 5</td><td></td></tr>
    <tr><td>36</td><td>S3 migration bucket deleted</td><td>Part 5</td><td></td></tr>
  </tbody>
</table>
