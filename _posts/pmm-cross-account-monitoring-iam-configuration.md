---
title: "Cross-Account Database Monitoring with PMM and AWS Transit Gateway — Part 2: IAM Roles and Users"
date: 2026-04-23T10:00:00.000Z
description: "Configure cross-account IAM roles for PMM CloudWatch access and IAM users for Aurora OS metrics. Includes full trust policy, permissions policy, and Terraform references."
categories:
  - mysql
  - aws-rds
read_time: 9
featured: false
author: "Mario"
coverImage: "/images/blog/pmm-cross-account-monitoring.jpg"
---

<div class="series-nav">
  <h4>Cross-Account Database Monitoring with PMM and AWS Transit Gateway &mdash; 5-Part Series</h4>
  <ol>
    <li><a href="/blog/pmm-cross-account-monitoring-transit-gateway.html">Part 1: Architecture and TGW Setup</a></li>
    <li><span class="current">Part 2: IAM Roles and Users (You Are Here)</span></li>
    <li><a href="/blog/pmm-cross-account-monitoring-install-server-client.html">Part 3: Installing PMM Server and Registering Services</a></li>
    <li><a href="/blog/pmm-cross-account-monitoring-alerting-pagerduty-cloudwatch.html">Part 4: Alerting with PagerDuty and CloudWatch</a></li>
    <li><a href="/blog/pmm-cross-account-monitoring-backup-recovery.html">Part 5: Backup, Recovery, and Node Reconfiguration</a></li>
  </ol>
</div>

With the Transit Gateway routing verified, the next step is granting the PMM server permission to read CloudWatch metrics and RDS metadata from target accounts. This requires two distinct IAM configurations: an IAM role assumed by the PMM EC2 instance to access CloudWatch data sources for dashboards and alerts, and an IAM user used exclusively for Aurora RDS instances that expose full Operating System metrics.

<h2 id="iam-role-target">IAM Role in the Target Account (RDS Hosting Account)</h2>

Create this role in every AWS account that hosts RDS instances you want to monitor. It allows the PMM EC2 instance to assume the role and read CloudWatch metrics and RDS metadata from that account.

<h3 id="create-role">Create the Role: <code>AmazonRDSforPMMrole</code></h3>

1. Go to **IAM → Roles → Create Role**
2. Select **Custom trust policy** as the trusted entity type
3. Paste the trust policy below, replacing the placeholders with your values:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<PMM_ACCOUNT_ID>:role/<PMM-EC2-ROLE>"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

This trust policy allows the instance profile attached to the PMM EC2 to call `sts:AssumeRole` and act as this role within the target account.

<h3 id="permissions-policy">Attach the Permissions Policy</h3>

Create a custom inline or managed policy with the following permissions and attach it to the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DescribeAndMetricsAccess",
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters",
        "rds:DescribeDBLogFiles",
        "rds:DownloadDBLogFilePortion",
        "rds:ListTagsForResource",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:GetMetricData",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    },
    {
      "Sid": "LogAccess",
      "Effect": "Allow",
      "Action": [
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:GetLogEvents",
        "logs:FilterLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:RDSOSMetrics:*"
    }
  ]
}
```

The `RDSOSMetrics` log group is where RDS Enhanced Monitoring publishes OS-level data. The `logs:*` permissions scoped to that group are what PMM uses to display the OS tab for RDS instances.

<h2 id="pmm-ec2-role">IAM Permissions for the PMM EC2 Instance (Source Account)</h2>

The instance profile attached to the PMM EC2 must have permission to call `sts:AssumeRole` for each target account role. Update the EC2 instance role policy to include:

```json
{
  "Effect": "Allow",
  "Action": "sts:AssumeRole",
  "Resource": [
    "arn:aws:iam::<TARGET_ACCOUNT_1>:role/AmazonRDSforPMMrole",
    "arn:aws:iam::<TARGET_ACCOUNT_2>:role/AmazonRDSforPMMrole"
  ]
}
```

Add one ARN per target account. The role name must match exactly what was created in each target account.

<h2 id="validate-role">Validate the IAM Role in PMM</h2>

Once the roles are in place:

1. Open the PMM UI and navigate to **Configuration → Data Sources**
2. Add a new **CloudWatch** data source
3. Select **Use IAM Role** as the authentication method
4. Enter the full role ARN from the target account

If the configuration is correct, the data source test passes and you can build dashboards and alert rules sourced from that account's CloudWatch metrics.

<h2 id="iam-user">IAM User for Aurora OS Metrics</h2>

IAM roles cover CloudWatch data sources for all RDS instance types. However, adding **Aurora RDS instances** to the PMM inventory with full OS tab metrics (CPU graphs, disk I/O, context switches) requires an IAM user rather than a role. This is a PMM limitation — the Amazon RDS inventory integration uses access key credentials, not role assumption.

Only create IAM users in accounts that host Aurora clusters.

<h3 id="create-user">Create the User: <code>PMMAWSIntegrationUser</code></h3>

1. Go to **IAM → Users → Create User**
2. Name the user `PMMAWSIntegrationUser`
3. Select **Programmatic access** to generate an Access Key ID and Secret Access Key
4. Store the credentials securely — they cannot be retrieved again after initial creation

<h3 id="user-policy">Attach the IAM Policy</h3>

Attach the following policy to the user. It mirrors the role permissions but also grants access to OS metrics log streams:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Stmt1508404837000",
      "Action": [
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters",
        "rds:DescribeDBLogFiles",
        "rds:DownloadDBLogFilePortion",
        "rds:ListTagsForResource",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:GetMetricData",
        "cloudwatch:ListMetrics",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:GetLogEvents"
      ],
      "Effect": "Allow",
      "Resource": ["*"]
    },
    {
      "Sid": "Stmt1508410723001",
      "Action": [
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:GetLogEvents",
        "logs:FilterLogEvents"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:logs:*:*:log-group:RDSOSMetrics:*",
        "arn:aws:logs:*:*:log-group:RDSOSMetrics:*:log-stream:*"
      ]
    }
  ]
}
```

<h3 id="add-aurora-pmm">Add the Aurora Instance to PMM</h3>

With the user credentials in hand:

1. Go to **PMM → Inventory → Add Service → Amazon RDS**
2. Enter the **Access Key ID** and **Secret Access Key**
3. PMM will discover the Aurora cluster in that account

If Enhanced Monitoring is enabled on the Aurora cluster, the instance will appear in the PMM inventory with `rds_exporter` under Metrics Sources and the OS tab will show CPU, disk I/O, and context switches.

<div class="callout">
  <p><strong>Enhanced Monitoring required for OS tab:</strong> OS-level metrics for Aurora are published to CloudWatch Logs only when Enhanced Monitoring is enabled on the RDS cluster (set at 1s, 5s, 10s, 15s, 30s, or 60s granularity). Without it, the OS tab appears empty even when the IAM credentials are correct.</p>
</div>

<h2 id="service-type-note">Which PMM Service Type to Use</h2>

The way you add a service to the PMM inventory depends on the RDS engine:

<table>
  <thead>
    <tr><th>Engine</th><th>PMM Service Type</th><th>Reason</th></tr>
  </thead>
  <tbody>
    <tr><td>MariaDB RDS</td><td>MySQL</td><td>MariaDB is added as a MySQL remote instance via the PMM agent</td></tr>
    <tr><td>Aurora MySQL</td><td>Amazon RDS</td><td>Only this method enables the OS tab metrics via <code>rds_exporter</code></td></tr>
  </tbody>
</table>

Adding an Aurora instance as a generic MySQL service misses the OS-level metrics entirely. Use Amazon RDS service type with IAM user credentials for Aurora.

<h2 id="notes">Key Notes</h2>

<ul>
  <li>The IAM role (<code>AmazonRDSforPMMrole</code>) must be created in every target account, not just once.</li>
  <li>The IAM user (<code>PMMAWSIntegrationUser</code>) is only needed in accounts with Aurora clusters.</li>
  <li>Rotate IAM user credentials regularly. Apply least-privilege — the policies above are already scoped to read-only RDS and CloudWatch operations.</li>
  <li>The IAM role is used for CloudWatch data sources (dashboards and alerts). The IAM user is used for inventory discovery with OS metrics.</li>
</ul>

<h2 id="terraform">Terraform Reference</h2>

The IAM role and user are managed as Terraform in production:

- IAM Role setup: `terraform/shared-terraform/20-iam_PMMAwsIntegration.tf`
- IAM Role policy: `terraform/shared-terraform/templates/IAM/pmm_integration.json`
- IAM User module: `terraform/shared-terraform/modules/iam_bots`
- IAM User policy: `terraform/accounts/<account_id>/bots.yaml`

<div class="series-nav">
  <h4>Continue the Series</h4>
  <ol>
    <li><a href="/blog/pmm-cross-account-monitoring-transit-gateway.html">&larr; Part 1: Architecture and TGW Setup</a></li>
    <li><span class="current">Part 2: IAM Roles and Users (You Are Here)</span></li>
    <li><a href="/blog/pmm-cross-account-monitoring-install-server-client.html">Part 3: Installing PMM Server and Registering Services &rarr;</a></li>
  </ol>
</div>
