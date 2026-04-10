---
title: "MariaDB 10.6 to MySQL Aurora 8.0 Migration Guide — Part 2: AWS DMS Infrastructure Setup"
date: 2026-04-08T11:00:00.000Z
description: "Set up AWS DMS for MariaDB to Aurora MySQL migration. Step-by-step guide to IAM roles, replication instance sizing, VPC configuration, and security group rules."
categories:
  - mysql
  - aws-rds
read_time: 14
featured: false
author: "Mario"
---

<div class="series-nav">
  <h4>MariaDB 10.6 to MySQL Aurora 8.0 Migration Guide &mdash; 5-Part Series</h4>
  <ol>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-pre-migration-requirements.html">Part 1: Pre-Migration Requirements</a></li>
    <li><span class="current">Part 2: AWS DMS Infrastructure Setup (You Are Here)</span></li>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-schema-migration.html">Part 3: Schema and User Migration</a></li>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-dms-endpoints-task.html">Part 4: DMS Endpoints, Task Configuration, and Assessments</a></li>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-execution-cutover-cleanup.html">Part 5: Execution, Validation, Cutover, and Cleanup</a></li>
  </ol>
</div>

With source and target database requirements verified, the next step is provisioning the AWS DMS infrastructure. This consists of three components: IAM roles that grant DMS the permissions it needs, a replication instance that runs the migration process, and security group rules that allow the replication instance to reach both databases.

Getting the infrastructure right before creating endpoints saves significant troubleshooting time. Most DMS endpoint test failures trace back to security group rules or missing IAM permissions, not the database configuration itself.

<h2 id="iam-roles">IAM Roles for AWS DMS</h2>

AWS DMS requires specific IAM roles to manage VPC resources and publish CloudWatch logs. These roles use a trust policy that authorizes the DMS service principal to assume them.

<h3 id="dms-vpc-role">Create the <code>dms-vpc-role</code></h3>

This role grants DMS permission to create and manage network interfaces within your VPC. It is required before creating any replication instance.

1. Go to the **IAM Console** → **Roles** → **Create Role**
2. Select **AWS Service** as the trusted entity type
3. Under **Use cases for other AWS services**, select **DMS**
4. Attach the following managed policies:
   - `AmazonDMSVPCManagementRole` — allows DMS to manage ENIs and security groups within the VPC
   - `AmazonDMSCloudWatchLogsRole` — enables CloudWatch logging for replication instances
5. Name the role exactly `dms-vpc-role` (DMS looks for this exact name)
6. Create the role

<div class="callout">
  <p><strong>Exact name required:</strong> The role must be named <code>dms-vpc-role</code>. AWS DMS looks for this specific role name during replication instance creation. If the role exists under a different name, the console will fail silently when attempting to create a replication instance in a VPC.</p>
</div>

<h3 id="dms-cloudwatch-role">Create the <code>dms-cloudwatch-logs-role</code> (Optional)</h3>

This role allows DMS to publish task-level logs to Amazon CloudWatch Logs. It is optional but strongly recommended — CloudWatch logs are the primary debugging tool when a migration task encounters errors.

Follow the same steps as `dms-vpc-role`, attaching the `AmazonDMSCloudWatchLogsRole` managed policy. Name the role `dms-cloudwatch-logs-role`.

<h2 id="replication-instance">Create a Replication Instance</h2>

The replication instance is the compute resource that runs DMS. It connects to both the source and target databases simultaneously and handles data transformation between the two engines.

<h3 id="instance-class">Choosing the Instance Class</h3>

The right instance class depends on your dataset size, write throughput, and whether your tables have LOB (Large Object) columns.

<table>
  <thead>
    <tr><th>Instance Family</th><th>Use Case</th><th>Notes</th></tr>
  </thead>
  <tbody>
    <tr><td><code>t3</code></td><td>Staging and development</td><td>Burstable CPU — suitable for low-throughput workloads and testing. Not recommended for production.</td></tr>
    <tr><td><code>c7i</code></td><td>Production (compute-optimized)</td><td>Good for high-throughput migrations without significant LOB columns.</td></tr>
    <tr><td><code>r7i</code></td><td>Production with LOB columns</td><td>Memory-optimized — recommended when migrating tables with <code>BLOB</code>, <code>TEXT</code>, <code>MEDIUMBLOB</code>, or <code>LONGTEXT</code> columns. LOB processing is memory-intensive.</td></tr>
  </tbody>
</table>

<div class="callout-warning">
  <p><strong>LOB columns and instance sizing:</strong> If your schema contains LOB columns and you use Full LOB mode (required for complete fidelity), DMS loads each LOB individually after inserting the row. This pattern is memory-intensive and significantly slower than standard row processing. Use <code>r7i</code> instances for workloads with LOBs.</p>
</div>

For detailed instance class specifications, refer to the [AWS DMS replication instance types documentation](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.Types.html).

<h3 id="instance-configuration">Instance Configuration</h3>

In the DMS console, navigate to **Replication instances** → **Create replication instance** and configure:

- **Engine version** — use the default unless you have a specific reason to pin a version
- **Multi-AZ** — enable for production to avoid replication instance failure during AZ outage
- **Storage** — the default allocation is sufficient for most migrations; DMS uses local storage as a temporary buffer during CDC operations
- **VPC** — select the same VPC as your MariaDB and Aurora instances. If they are in different VPCs, configure VPC peering before proceeding
- **Public accessibility** — leave unchecked. The replication instance should only communicate within the VPC
- **VPC security groups** — assign the security group associated with the Aurora cluster (this avoids creating temporary rules and is covered in the next section)
- **Automatic version upgrade** — disable to prevent unexpected version changes during an active migration

<h2 id="security-groups">Security Group Configuration</h2>

The replication instance must be able to establish TCP connections to port 3306 on both the MariaDB source and the Aurora MySQL target.

<h3 id="sg-mariadb">MariaDB Source Security Group</h3>

Locate the security group attached to the MariaDB RDS instance and add an inbound rule:

- **Type**: MySQL/Aurora (TCP 3306)
- **Source**: The security group ID of the DMS replication instance

Also verify the **outbound rules** of the replication instance's security group allow traffic to the MariaDB instance. By default, AWS security groups allow all outbound traffic, but custom outbound rules may block this.

<h3 id="sg-aurora">Aurora MySQL Target Security Group</h3>

Apply the same inbound rule to the Aurora cluster's security group:

- **Type**: MySQL/Aurora (TCP 3306)
- **Source**: The security group ID of the DMS replication instance

Additionally, add an inbound rule allowing access from the jump server's security group on port 3306. This is needed for the schema import step in Part 3 and for running validation queries during cutover.

<div class="callout">
  <p><strong>Why a jump server?</strong> RDS and Aurora instances are typically deployed in private subnets with no direct internet access — this is the recommended security posture for production databases. A jump server (also called a bastion host) is an EC2 instance in a public subnet that you SSH into, then connect to the database from there. If your project does not have a jump server in place, you have a few alternatives: launch a temporary EC2 bastion in the same VPC, use <a href="https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html" style="color:#2980B9;">AWS Systems Manager Session Manager</a> to tunnel without a public instance, or use AWS Cloud9. Whichever method you use, its security group needs the inbound rule on port 3306 added to the Aurora SG.</p>
</div>

<h3 id="sg-summary">Security Group Rule Summary</h3>

<table>
  <thead>
    <tr><th>Security Group</th><th>Rule Direction</th><th>Protocol / Port</th><th>Source / Destination</th></tr>
  </thead>
  <tbody>
    <tr><td>MariaDB SG</td><td>Inbound</td><td>TCP 3306</td><td>DMS replication instance SG</td></tr>
    <tr><td>Aurora SG</td><td>Inbound</td><td>TCP 3306</td><td>DMS replication instance SG</td></tr>
    <tr><td>Aurora SG</td><td>Inbound</td><td>TCP 3306</td><td>Jump server SG</td></tr>
    <tr><td>DMS SG</td><td>Outbound</td><td>TCP 3306</td><td>MariaDB SG (verify not blocked)</td></tr>
    <tr><td>DMS SG</td><td>Outbound</td><td>TCP 3306</td><td>Aurora SG (verify not blocked)</td></tr>
  </tbody>
</table>

<div class="callout">
  <p><strong>Testing connectivity before continuing:</strong> Before proceeding to endpoint creation in Part 4, verify that the replication instance can reach both databases. Use the endpoint connection test built into the DMS console — it surfaces security group and network issues early, before a failed migration task consumes time troubleshooting mid-run.</p>
</div>

With the replication instance provisioned and security groups in place, proceed to Part 3 to handle schema and user migration before any DMS data tasks run.
