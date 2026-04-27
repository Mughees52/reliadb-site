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
coverImage: "/images/blog/pmm-cross-account-monitoring-iam.jpg"
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

<h2 id="validate-role">Validate the IAM Role</h2>

PMM isn't installed yet at this stage — that's covered in Part 3. You can validate the trust policy and permissions now from the PMM EC2 instance using the AWS CLI, without needing PMM running.

**Step 1: Verify the role can be assumed**

SSH into the PMM EC2 instance and run:

```
aws sts assume-role \
  --role-arn "arn:aws:iam::<target-account-id>:role/AmazonRDSforPMMrole" \
  --role-session-name pmm-validation-test
```

A successful response returns a JSON block with temporary `AccessKeyId`, `SecretAccessKey`, and `SessionToken` credentials. If it returns an access denied error, the trust policy in the target account doesn't allow the PMM EC2 instance role to assume it — double-check the principal ARN in the trust policy matches the EC2 instance role exactly.

**Step 2: Verify the permissions policy**

Export the temporary credentials from Step 1 and test a CloudWatch call against the target account:

```
export AWS_ACCESS_KEY_ID=<AccessKeyId from Step 1>
export AWS_SECRET_ACCESS_KEY=<SecretAccessKey from Step 1>
export AWS_SESSION_TOKEN=<SessionToken from Step 1>

aws cloudwatch list-metrics --namespace AWS/RDS --region us-east-1
```

A successful response lists RDS CloudWatch metrics from the target account. Unset the environment variables after testing to restore the default instance profile credentials.

<div class="callout">
  <p><strong>CloudWatch data sources in PMM:</strong> Adding the CloudWatch data sources in the PMM UI — one per target account — is covered in <a href="/blog/pmm-cross-account-monitoring-alerting-pagerduty-cloudwatch.html">Part 4</a>, once PMM is installed and running.</p>
</div>

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

<h3 id="validate-iam-user">Validate the IAM User Credentials</h3>

PMM isn't installed yet at this stage. Validate the credentials now from the CLI before continuing to Part 3.

**Step 1: Verify the credentials are active**

```
aws sts get-caller-identity \
  --profile pmm-aurora-test
```

Configure the profile first with `aws configure --profile pmm-aurora-test` using the Access Key ID and Secret Access Key generated above. A successful response returns the user ARN — confirming the credentials are valid and the access key is active.

**Step 2: Verify RDS discovery permissions**

```
aws rds describe-db-instances \
  --profile pmm-aurora-test \
  --region us-east-1
```

This should return the list of RDS instances in the account. An access denied error means the permissions policy wasn't attached correctly.

**Step 3: Verify OS metrics log access**

```
aws logs describe-log-groups \
  --log-group-name-prefix RDSOSMetrics \
  --profile pmm-aurora-test \
  --region us-east-1
```

A successful response confirms the user can read from the `RDSOSMetrics` log group where Enhanced Monitoring publishes OS-level data. An empty result (no log groups returned) means Enhanced Monitoring isn't enabled on any Aurora cluster in this account — the OS tab in PMM will be empty even with correct credentials.

<div class="callout">
  <p><strong>Enhanced Monitoring required for OS tab:</strong> OS-level metrics for Aurora are published to CloudWatch Logs only when Enhanced Monitoring is enabled on the RDS cluster (set at 1s, 5s, 10s, 15s, 30s, or 60s granularity). Without it, the OS tab appears empty even when the IAM credentials are correct.</p>
</div>

<div class="callout">
  <p><strong>Adding Aurora to the PMM inventory:</strong> The PMM UI steps to register an Aurora instance — going to <strong>PMM → Inventory → Add Service → Amazon RDS</strong> and entering these credentials — are covered in <a href="/blog/pmm-cross-account-monitoring-install-server-client.html">Part 3</a>, once PMM is installed and running.</p>
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

The IAM roles and users described in this guide are fully managed as Terraform in production. The snippets below cover the key resources — adapt variable names and values to your environment.

<h3 id="tf-iam-providers">Multi-Account Provider Setup</h3>

As with the TGW configuration in Part 1, all IAM resources across every target account are managed from the same source repo using one aliased provider per account. This avoids duplicating state backends and keeps IAM changes reviewable in a single pull request.

```hcl
# Default provider — source account (where the PMM EC2 lives)
provider "aws" {
  region = "us-east-1"
}

# One provider per target account
provider "aws" {
  alias  = "target_account_a"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::<target-account-a-id>:role/<admin-role>"
  }
}

provider "aws" {
  alias  = "target_account_b"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::<target-account-b-id>:role/<admin-role>"
  }
}
```

Wrap the target account IAM resources in a module and pass the provider via `providers`, so adding a new account requires only a new provider block and module call:

```hcl
module "pmm_iam_account_a" {
  source    = "./modules/pmm-iam-target"
  providers = { aws = aws.target_account_a }

  pmm_account_id     = var.pmm_account_id
  pmm_ec2_role_name  = var.pmm_ec2_role_name
}

module "pmm_iam_account_b" {
  source    = "./modules/pmm-iam-target"
  providers = { aws = aws.target_account_b }

  pmm_account_id     = var.pmm_account_id
  pmm_ec2_role_name  = var.pmm_ec2_role_name
}
```

The module contains the `aws_iam_role` and `aws_iam_role_policy` blocks shown below. The source account policy that grants `sts:AssumeRole` is managed separately outside the module, since it lives in the source account.

<h3 id="tf-iam-target-role">Target Account: Monitoring Role</h3>

```hcl
resource "aws_iam_role" "pmm_rds_monitoring" {
  name = "AmazonRDSforPMMrole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::${var.pmm_account_id}:role/${var.pmm_ec2_role_name}" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "pmm_rds_monitoring" {
  name = "pmm-cloudwatch-rds-access"
  role = aws_iam_role.pmm_rds_monitoring.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DescribeAndMetricsAccess"
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances", "rds:DescribeDBClusters",
          "rds:DescribeDBLogFiles", "rds:DownloadDBLogFilePortion",
          "rds:ListTagsForResource", "cloudwatch:GetMetricStatistics",
          "cloudwatch:GetMetricData", "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      },
      {
        Sid    = "LogAccess"
        Effect = "Allow"
        Action = [
          "logs:DescribeLogGroups", "logs:DescribeLogStreams",
          "logs:GetLogEvents", "logs:FilterLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:RDSOSMetrics:*"
      }
    ]
  })
}
```

<h3 id="tf-iam-source-role">Source Account: Allow PMM EC2 to Assume Target Roles</h3>

```hcl
resource "aws_iam_role_policy" "pmm_assume_target_roles" {
  name = "pmm-assume-rds-monitoring-roles"
  role = var.pmm_ec2_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sts:AssumeRole"
      Resource = [
        for id in var.target_account_ids :
        "arn:aws:iam::${id}:role/AmazonRDSforPMMrole"
      ]
    }]
  })
}
```

<h3 id="tf-iam-user">Aurora Accounts: IAM User for OS Metrics</h3>

Only create this in accounts that host Aurora clusters.

```hcl
resource "aws_iam_user" "pmm_aws_integration" {
  name = "PMMAWSIntegrationUser"
}

resource "aws_iam_user_policy" "pmm_aws_integration" {
  name = "pmm-aurora-os-metrics"
  user = aws_iam_user.pmm_aws_integration.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "RDSAndCloudWatchAccess"
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances", "rds:DescribeDBClusters",
          "rds:DescribeDBLogFiles", "rds:DownloadDBLogFilePortion",
          "rds:ListTagsForResource", "cloudwatch:GetMetricStatistics",
          "cloudwatch:GetMetricData", "cloudwatch:ListMetrics",
          "logs:DescribeLogGroups", "logs:DescribeLogStreams",
          "logs:GetLogEvents"
        ]
        Resource = "*"
      },
      {
        Sid    = "OSMetricsLogAccess"
        Effect = "Allow"
        Action = [
          "logs:DescribeLogGroups", "logs:DescribeLogStreams",
          "logs:GetLogEvents", "logs:FilterLogEvents"
        ]
        Resource = [
          "arn:aws:logs:*:*:log-group:RDSOSMetrics:*",
          "arn:aws:logs:*:*:log-group:RDSOSMetrics:*:log-stream:*"
        ]
      }
    ]
  })
}
```

If you'd like the complete module including access key rotation and permissions boundary wiring, <a href="/contact.html">get in touch</a> and we're happy to share it.

<div class="series-nav">
  <h4>Continue the Series</h4>
  <ol>
    <li><a href="/blog/pmm-cross-account-monitoring-transit-gateway.html">&larr; Part 1: Architecture and TGW Setup</a></li>
    <li><span class="current">Part 2: IAM Roles and Users (You Are Here)</span></li>
    <li><a href="/blog/pmm-cross-account-monitoring-install-server-client.html">Part 3: Installing PMM Server and Registering Services &rarr;</a></li>
  </ol>
</div>
