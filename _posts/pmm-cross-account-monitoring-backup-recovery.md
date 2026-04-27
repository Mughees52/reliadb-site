---
title: "Cross-Account Database Monitoring with PMM and AWS Transit Gateway — Part 5: Backup, Recovery, and Node Reconfiguration"
date: 2026-04-23T13:00:00.000Z
description: "Configure weekly AWS Backup for the PMM EC2 instance, walk through the full recovery procedure after a failure, and reconfigure PMM client agents on x86_64 and aarch64 nodes after a PMM server IP change."
categories:
  - mysql
  - aws-rds
read_time: 11
featured: false
author: "Mario"
coverImage: "/images/blog/pmm-cross-account-monitoring-backup.jpg"
---

<div class="series-nav">
  <h4>Cross-Account Database Monitoring with PMM and AWS Transit Gateway &mdash; 5-Part Series</h4>
  <ol>
    <li><a href="/blog/pmm-cross-account-monitoring-transit-gateway.html">Part 1: Architecture and TGW Setup</a></li>
    <li><a href="/blog/pmm-cross-account-monitoring-iam-configuration.html">Part 2: IAM Roles and Users</a></li>
    <li><a href="/blog/pmm-cross-account-monitoring-install-server-client.html">Part 3: Installing PMM Server and Registering Services</a></li>
    <li><a href="/blog/pmm-cross-account-monitoring-alerting-pagerduty-cloudwatch.html">Part 4: Alerting with PagerDuty and CloudWatch</a></li>
    <li><span class="current">Part 5: Backup, Recovery, and Node Reconfiguration (You Are Here)</span></li>
  </ol>
</div>

The PMM EC2 instance is a single point of observability for your entire database fleet. If it fails without a recovery plan, you lose monitoring and alerting across every account until you rebuild from scratch — which means re-registering all services, re-adding CloudWatch data sources, and reconfiguring every PMM client agent. A weekly AWS Backup policy eliminates most of that work and reduces recovery time to the duration of a snapshot restore plus a few reconfiguration steps.

This final part covers the AWS Backup configuration, the step-by-step recovery procedure, and how to reconfigure PMM client agents on both x86_64 and aarch64 nodes after a PMM server restore where the IP address changes.

<h2 id="backup-architecture">Backup Architecture</h2>

The backup configuration manages four AWS resources:

<table>
  <thead>
    <tr><th>Resource</th><th>Name</th><th>Purpose</th></tr>
  </thead>
  <tbody>
    <tr><td>Backup Vault</td><td><code>aws-pmm01-backup-vault</code></td><td>Stores EBS snapshots taken by the backup plan</td></tr>
    <tr><td>Backup Plan</td><td><code>aws-pmm01-weekly-backup</code></td><td>Defines schedule, windows, and retention policy</td></tr>
    <tr><td>Backup Selection</td><td><code>aws-pmm01-backup-selection</code></td><td>Targets the specific EC2 instance to back up</td></tr>
    <tr><td>IAM Role</td><td><code>AwsBackupServiceRole</code></td><td>Grants AWS Backup permission to create and manage snapshots</td></tr>
  </tbody>
</table>

<h2 id="backup-vault">Backup Vault</h2>

The backup vault `aws-pmm01-backup-vault` stores all recovery points. Tag it consistently with your environment tagging standard:

<table>
  <thead>
    <tr><th>Tag Key</th><th>Value</th></tr>
  </thead>
  <tbody>
    <tr><td>environment</td><td>prod</td></tr>
    <tr><td>owner</td><td>platform</td></tr>
    <tr><td>service</td><td>backup</td></tr>
    <tr><td>component</td><td>ec2</td></tr>
  </tbody>
</table>

<h2 id="backup-plan">Backup Plan</h2>

The plan `aws-pmm01-weekly-backup` runs on a weekly schedule with the following configuration:

<table>
  <thead>
    <tr><th>Setting</th><th>Value</th><th>Rationale</th></tr>
  </thead>
  <tbody>
    <tr><td>Schedule</td><td>Sundays at 5:00 AM UTC</td><td>Off-peak for most EU/US timezones; minimizes I/O impact on running containers</td></tr>
    <tr><td>Start window</td><td>60 minutes</td><td>Time AWS Backup has to begin the job before it's marked failed</td></tr>
    <tr><td>Completion window</td><td>120 minutes</td><td>Maximum allowed duration for a backup job</td></tr>
    <tr><td>Retention period</td><td>30 days</td><td>Keeps four weekly recovery points available at any time</td></tr>
    <tr><td>Continuous backup</td><td>Disabled</td><td>Point-in-time recovery isn't required for the PMM EC2</td></tr>
  </tbody>
</table>

<h2 id="iam-backup">IAM Configuration for AWS Backup</h2>

<h3 id="service-role">Service Role: <code>AwsBackupServiceRole</code></h3>

AWS Backup requires a service role to create and manage EBS snapshots and perform EC2 restores. The role uses the following configuration:

- **Path**: `/developer/`
- **Permissions boundary**: `arn:aws:iam::<account_id>:policy/iam-maddeveloper-boundary`

<h3 id="role-policies">Policies Attached</h3>

1. **AWS managed policy**: `AWSBackupServiceRolePolicyForBackup` — grants AWS Backup the baseline permissions to create backup jobs and access backup storage

2. **Custom policy** (`backup-service-policy`) covering:

   - **EC2 operations**: create/delete snapshots, create/delete volumes, create/modify tags, start/stop/reboot instances, volume operations, snapshot operations
   - **Backup operations**: full access to AWS Backup operations and backup storage

<h2 id="terraform">Terraform Reference</h2>

The backup vault, plan, IAM role, and selection described in this guide are fully managed as Terraform in production. The snippets below cover the key resources — adapt variable names and values to your environment.

<h3 id="tf-backup-vault-plan">Vault and Backup Plan</h3>

```hcl
resource "aws_backup_vault" "pmm" {
  name = "pmm-backup-vault"

  tags = {
    environment = "prod"
    service     = "backup"
    component   = "ec2"
  }
}

resource "aws_backup_plan" "pmm_weekly" {
  name = "pmm-weekly-backup"

  rule {
    rule_name         = "weekly-sunday-5am-utc"
    target_vault_name = aws_backup_vault.pmm.name
    schedule          = "cron(0 5 ? * SUN *)"
    start_window      = 60   # minutes before job is marked failed
    completion_window = 120  # maximum allowed job duration in minutes

    lifecycle {
      delete_after = 30 # retain 4 weekly recovery points
    }
  }
}
```

<h3 id="tf-backup-iam">IAM Role for AWS Backup</h3>

```hcl
resource "aws_iam_role" "backup_service" {
  name = "AwsBackupServiceRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "backup.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "backup_service_managed" {
  role       = aws_iam_role.backup_service.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy" "backup_service_custom" {
  name = "backup-service-policy"
  role = aws_iam_role.backup_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ec2:CreateSnapshot", "ec2:DeleteSnapshot",
        "ec2:CreateVolume", "ec2:DeleteVolume",
        "ec2:CreateTags", "ec2:ModifySnapshotAttribute",
        "ec2:DescribeVolumes", "ec2:DescribeSnapshots",
        "ec2:StartInstances", "ec2:StopInstances", "ec2:RebootInstances"
      ]
      Resource = "*"
    }]
  })
}
```

<h3 id="tf-backup-selection">Backup Selection</h3>

```hcl
resource "aws_backup_selection" "pmm" {
  name         = "pmm-backup-selection"
  plan_id      = aws_backup_plan.pmm_weekly.id
  iam_role_arn = aws_iam_role.backup_service.arn

  resources = [var.pmm_instance_arn]
}
```

If you'd like the complete module including the full variable definitions, <a href="/contact.html">get in touch</a> and we're happy to share it.

<h2 id="recovery">Recovery Procedure</h2>

The following steps restore the PMM EC2 instance from a backup vault recovery point. Follow them in order — skipping steps, particularly the subnet selection and IAM role attachment, will leave the restored instance unable to communicate via TGW or access CloudWatch.

**Step 1: Disable the PMM Service in PagerDuty**

Before restoring, mute PagerDuty to prevent a flood of stale firing alerts from the old instance state from paging your on-call team during the recovery window.

**Step 2: Open the AWS Backup Console**

Navigate to **AWS Backup → Backup vaults → aws-pmm01-backup-vault**. Select the most recent recovery point and click **Restore**.

**Step 3: Configure Restore Options**

<div class="callout-warning">
  <p><strong>Subnet selection is critical:</strong> Select the <strong>same subnet</strong> as the original PMM EC2 instance. The Transit Gateway attachments and route tables created in Part 1 are scoped to specific subnets. Restoring to a different subnet breaks TGW connectivity and requires updating the TGW attachment and all route tables.</p>
</div>

Additional restore settings:

- **IAM role for restore**: select `AwsBackupServiceRole`
- **IAM role for the restored instance**: do not select one at this point — the backup role does not have permission to restore an instance role. Attach the correct IAM role after the restore completes.
- All other options can remain at their default values.

**Step 4: Monitor Restoration Progress**

Monitor the job in **AWS Backup → Jobs → Restore jobs** until the job status shows `Completed`.

**Step 5: Attach the IAM Role to the Restored Instance**

Once the instance is running:

1. Go to **EC2 → Instances → Actions → Security → Modify IAM role**
2. Select the IAM role: `EC2-Allow-SSM-and-S3`
3. Apply the change
4. Reboot the instance to ensure the instance metadata reflects the updated role

**Step 6: Remove Stale PagerDuty Configuration from PMM UI**

Log into the PMM UI on the restored instance and remove the existing PagerDuty contact point and notification policy. The restored instance retains the previous configuration, but PagerDuty state should be re-validated before re-enabling alerting.

**Step 7: Update the PMM Instance ID in Terraform**

The restored instance has a new EC2 instance ID. Update the TGW configuration in the Terraform repository to reference the new ID:

```
# terraform/aws/prod/50-tgw.tf
# Update the pmm instance ID on line 19 with the new instance ID
```

Run a Terraform plan, create a PR, and merge the changes. This is required to allow the new instance to route traffic through the Transit Gateways.

**Step 8: Reconfigure PMM Client Agents on EC2 Nodes**

If the restored instance received a new private IP address, every PMM client agent in the fleet needs to be reconfigured. See the full procedure in the next section.

**Step 9: Re-enable the PMM Service in PagerDuty**

After verifying that the PMM inventory shows all services as up (check **Inventory → Services → Status**), re-enable the PagerDuty service and restore the contact point and notification policy in the PMM UI.

<h2 id="reconfigure-node">Reconfiguring PMM Client Agents After a PMM IP Change</h2>

When the PMM server IP changes after a restore, each monitored EC2 node needs its PMM client agent reconfigured. The procedure differs between x86_64 and aarch64 architectures.

The first step is the same for all nodes: remove the stale node entry from the PMM inventory to prevent duplicate node registration errors.

**Step 1: Delete the node from PMM Inventory**

Go to **PMM → Inventory → Nodes**, locate the node, click **Delete**, enable **Force mode**, and confirm. Force mode removes the node and all associated services in one operation.

<h3 id="reconfig-x86">Reconfigure x86_64 Nodes (e.g., masterdb02)</h3>

```
pmm-admin config \
  --server-insecure-tls \
  --server-url=https://admin:<your_pmm_password>@<new-pmm-server-ip>:443 \
  <node-ip> generic <node-name> \
  --force

pmm-admin add mysql \
  --username=pmm \
  --password=<your_password> \
  --size-slow-logs=1GiB
```

<h3 id="reconfig-aarch64">Reconfigure aarch64 Nodes (e.g., ec2-go-db-0)</h3>

```
pmm-agent setup \
  --config-file=/usr/local/percona/pmm2/config/pmm-agent.yaml \
  --server-address=<new-pmm-server-ip> \
  --server-insecure-tls \
  --server-username=admin \
  --server-password=<your_pmm_password> \
  <node-ip> generic <node-name> \
  --force

systemctl start pmm-agent@percona
systemctl status pmm-agent@percona
pmm-admin list

pmm-admin add mysql \
  --username=pmm \
  --password=<your_password> \
  --size-slow-logs=1GiB
```

<h3 id="reconfig-proxysql">Reconfigure aarch64 ProxySQL Nodes</h3>

```
pmm-agent setup \
  --config-file=/usr/local/percona/pmm2/config/pmm-agent.yaml \
  --server-address=<new-pmm-server-ip> \
  --server-insecure-tls \
  --server-username=admin \
  --server-password=<your_pmm_password> \
  <node-ip> generic <node-name>

pmm-admin add proxysql \
  --username=admin \
  --password=<your_proxysql_admin_password> \
  --service-name=<node-name> \
  --host=127.0.0.1 \
  --port=6032
```

<div class="callout">
  <p><strong>Order matters:</strong> Always delete the node from the PMM inventory before running <code>pmm-admin config</code> or <code>pmm-agent setup</code>. Attempting to re-register a node that still exists in the inventory produces a duplicate node error even with <code>--force</code>.</p>
</div>

<h2 id="checklist">Recovery Checklist</h2>

<ul class="checklist">
  <li>PagerDuty PMM service disabled before restore</li>
  <li>Recovery point selected from <code>aws-pmm01-backup-vault</code></li>
  <li>Restore subnet matches original PMM instance subnet</li>
  <li>IAM role <code>EC2-Allow-SSM-and-S3</code> attached post-restore</li>
  <li>Instance rebooted after IAM role attachment</li>
  <li>PMM UI accessible and healthy</li>
  <li>Stale PagerDuty configuration removed from PMM UI</li>
  <li>Terraform updated with new EC2 instance ID and merged</li>
  <li>All EC2 PMM client agents reconfigured with new PMM server IP</li>
  <li>PMM Inventory shows all services as Up</li>
  <li>PagerDuty contact point and notification policy restored in PMM</li>
  <li>PagerDuty PMM service re-enabled</li>
</ul>

<div class="series-nav">
  <h4>Series Complete</h4>
  <ol>
    <li><a href="/blog/pmm-cross-account-monitoring-transit-gateway.html">Part 1: Architecture and TGW Setup</a></li>
    <li><a href="/blog/pmm-cross-account-monitoring-iam-configuration.html">Part 2: IAM Roles and Users</a></li>
    <li><a href="/blog/pmm-cross-account-monitoring-install-server-client.html">Part 3: Installing PMM Server and Registering Services</a></li>
    <li><a href="/blog/pmm-cross-account-monitoring-alerting-pagerduty-cloudwatch.html">Part 4: Alerting with PagerDuty and CloudWatch</a></li>
    <li><span class="current">Part 5: Backup, Recovery, and Node Reconfiguration (You Are Here)</span></li>
  </ol>
</div>
