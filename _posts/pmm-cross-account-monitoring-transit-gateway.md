---
title: "Cross-Account Database Monitoring with PMM and AWS Transit Gateway — Part 1: Architecture and TGW Setup"
date: 2026-04-23T09:00:00.000Z
description: "Set up centralized RDS monitoring across multiple AWS accounts using Percona Monitoring and Management (PMM) and AWS Transit Gateway. Full network, routing, and security group walkthrough."
categories:
  - mysql
  - aws-rds
read_time: 12
featured: false
author: "Mario"
coverImage: "/images/blog/pmm-cross-account-monitoring-tgw.jpg"
---

<div class="series-nav">
  <h4>Cross-Account Database Monitoring with PMM and AWS Transit Gateway &mdash; 5-Part Series</h4>
  <ol>
    <li><span class="current">Part 1: Architecture and TGW Setup (You Are Here)</span></li>
    <li><a href="/blog/pmm-cross-account-monitoring-iam-configuration.html">Part 2: IAM Roles and Users</a></li>
    <li><a href="/blog/pmm-cross-account-monitoring-install-server-client.html">Part 3: Installing PMM Server and Registering Services</a></li>
    <li><a href="/blog/pmm-cross-account-monitoring-alerting-pagerduty-cloudwatch.html">Part 4: Alerting with PagerDuty and CloudWatch</a></li>
    <li><a href="/blog/pmm-cross-account-monitoring-backup-recovery.html">Part 5: Backup, Recovery, and Node Reconfiguration</a></li>
  </ol>
</div>

Monitoring RDS instances that live in multiple AWS accounts from a single Percona Monitoring and Management (PMM) server requires solving a network problem first. Each RDS instance sits in its own VPC, in its own account, with no direct route to the PMM EC2 instance. AWS Transit Gateway (TGW) is the cleanest solution: one central hub that connects every target VPC to the PMM account, without VPC peering sprawl.

This series walks through the full setup, from TGW configuration and IAM permissions to PMM installation, alerting, and disaster recovery. This first part covers the architecture and all network configuration.

<h2 id="architecture">Architecture Overview</h2>

The setup has four key components working together:

<table>
  <thead>
    <tr><th>Component</th><th>Account</th><th>Role</th></tr>
  </thead>
  <tbody>
    <tr><td>PMM EC2 instance</td><td>Source (PMM account)</td><td>Runs PMM Server in Docker, collects metrics from all targets</td></tr>
    <tr><td>Transit Gateway (TGW)</td><td>Source (PMM account)</td><td>Central hub routing traffic between PMM VPC and all RDS VPCs</td></tr>
    <tr><td>RDS instances</td><td>Target accounts</td><td>The databases being monitored (MariaDB RDS and Aurora MySQL)</td></tr>
    <tr><td>CloudWatch</td><td>Target accounts</td><td>Infrastructure-level metrics pulled via cross-account IAM roles</td></tr>
  </tbody>
</table>

Monitoring happens at two levels: application-level (MySQL metrics via PMM agent) and infrastructure-level (CPU, disk, I/O via CloudWatch). The TGW handles application-level connectivity; IAM roles handle CloudWatch access. Both are covered in this series.

<h2 id="tgw-source">Step 1: Create and Share the TGW in the PMM Account</h2>

All TGW work starts in the source account — the account where the PMM EC2 instance runs.

<h3 id="create-tgw">Create the Transit Gateway</h3>

Navigate to **VPC → Transit Gateways → Create Transit Gateway** in the AWS console. The default settings work for most setups. Note the TGW ID once it is created — you'll reference it in the resource share and all subsequent attachments.

<h3 id="share-tgw">Share the TGW via AWS RAM</h3>

The TGW lives in the source account but needs to be reachable from every target account. Use AWS Resource Access Manager (RAM) to share it:

1. Open **RAM → Resource shares → Create resource share**
2. Add the TGW as a resource
3. Add each target account ID as a principal
4. Create the share

Target accounts will receive a RAM invitation they must accept before attaching their VPCs.

<h3 id="attach-pmm-vpc">Attach the PMM VPC to the TGW</h3>

Back in the source account, create a TGW attachment for the PMM VPC:

1. Go to **VPC → Transit Gateway Attachments → Create Transit Gateway Attachment**
2. Select your TGW and the PMM VPC
3. Choose the subnets where the PMM EC2 instance runs
4. Create the attachment

<h2 id="tgw-target">Step 2: Accept the Share and Attach Target VPCs</h2>

Repeat this process in each target account that hosts RDS instances.

<h3 id="accept-share">Accept the RAM Resource Share</h3>

In each target account, navigate to **RAM → Shared with me → Resource shares** and accept the pending invitation from the source account. The TGW will then appear as a shared resource in that account.

<h3 id="fetch-subnets">Fetch RDS Subnets</h3>

Each TGW attachment requires one subnet per Availability Zone. Using Terraform to fetch these dynamically avoids hard-coding subnet IDs and prevents the most common error in this step.

<div class="callout-warning">
  <p><strong>One subnet per AZ:</strong> Attaching more than one subnet from the same AZ to a TGW attachment triggers a <code>Duplicate Subnets for same AZ</code> error. Use <code>flatten()</code> and unique keys in Terraform to deduplicate. Verify the subnet list before applying.</p>
</div>

<h3 id="create-attachment">Create the TGW Attachment in the Target Account</h3>

With the shared TGW visible and subnets identified, create the attachment pointing to the RDS VPC. This attachment is what allows traffic to flow from the PMM EC2 instance through the TGW and into the RDS subnet.

<h2 id="route-tables">Step 3: Configure Route Tables</h2>

A TGW attachment alone doesn't route traffic — route table entries on both sides are required.

<h3 id="routes-pmm">PMM VPC Route Table (Source Account)</h3>

In the route table associated with the PMM EC2 subnet, add one route per target VPC CIDR:

- **Destination**: `<target-vpc-cidr>` (e.g., `10.20.0.0/16`)
- **Target**: the TGW ID

Repeat for every target account VPC that hosts RDS instances.

<h3 id="routes-rds">RDS Subnet Route Tables (Target Accounts)</h3>

In each target account, update the route tables for every RDS subnet:

- **Destination**: `<pmm-vpc-cidr>` (e.g., `10.5.0.0/16`)
- **Target**: the shared TGW ID

This return route is often missed. Without it, the PMM EC2 can reach the RDS endpoint, but the RDS response packets have no path back — resulting in connections that hang rather than refuse.

<h2 id="security-groups">Step 4: Security Group and NACL Setup</h2>

<h3 id="sg-rds">RDS Security Group (Target Accounts)</h3>

Add an inbound rule to the security group attached to each RDS instance:

- **Type**: MySQL/Aurora (TCP 3306)
- **Source**: the CIDR of the PMM EC2 subnet in the source account (e.g., `10.5.32.0/24`)

Using the CIDR rather than a security group ID is necessary here because cross-account security group references aren't supported for inbound rules referencing groups in different accounts.

<h3 id="nacl">Network ACLs</h3>

If your subnets use custom NACLs (the default NACL allows all traffic), verify that:

- **Inbound**: allows TCP 3306 from the PMM subnet CIDR
- **Outbound**: allows the ephemeral port range (1024–65535) back to the PMM subnet CIDR

NACLs are stateless, so both directions must be explicitly permitted.

<h2 id="verify">Step 5: Test Network Connectivity</h2>

Before proceeding to IAM setup, confirm the TGW routing is working. SSH into the PMM EC2 instance and run:

```
telnet <rds-endpoint> 3306
```

A successful connection — where the terminal shows a MySQL server greeting banner — confirms that the TGW, VPC attachments, route tables, and security groups are all correctly configured. If the connection times out, the most common causes are a missing return route in the RDS subnet route table or a NACL blocking the ephemeral port range.

<div class="callout">
  <p><strong>Test before continuing:</strong> IAM configuration and PMM client installation depend on network connectivity. Confirming the telnet test passes now prevents hours of debugging later when the failure mode shifts from network errors to authentication errors.</p>
</div>

<h2 id="terraform">Terraform Reference</h2>

The TGW configuration described in this guide is fully managed as Terraform in production. The snippets below cover the key resources — adapt variable names and values to your environment.

<h3 id="tf-tgw-source">Source Account: TGW and RAM Share</h3>

```hcl
resource "aws_ec2_transit_gateway" "main" {
  description = "Central TGW for cross-account database monitoring"

  tags = {
    Name = "pmm-tgw"
  }
}

resource "aws_ram_resource_share" "tgw" {
  name                      = "pmm-tgw-share"
  allow_external_principals = false
}

resource "aws_ram_resource_association" "tgw" {
  resource_arn       = aws_ec2_transit_gateway.main.arn
  resource_share_arn = aws_ram_resource_share.tgw.arn
}

resource "aws_ram_principal_association" "target_accounts" {
  for_each           = toset(var.target_account_ids)
  principal          = each.value
  resource_share_arn = aws_ram_resource_share.tgw.arn
}
```

<h3 id="tf-tgw-pmm-attach">Source Account: PMM VPC Attachment and Routes</h3>

```hcl
resource "aws_ec2_transit_gateway_vpc_attachment" "pmm" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = var.pmm_vpc_id
  subnet_ids         = var.pmm_subnet_ids

  tags = {
    Name = "pmm-tgw-attachment"
  }
}

# One route per target VPC CIDR pointing to the TGW
resource "aws_route" "pmm_to_target" {
  for_each               = toset(var.target_vpc_cidrs)
  route_table_id         = var.pmm_route_table_id
  destination_cidr_block = each.value
  transit_gateway_id     = aws_ec2_transit_gateway.main.id
}
```

<h3 id="tf-tgw-target-attach">Target Account: VPC Attachment and Return Routes</h3>

```hcl
# Accept the RAM share from the source account
resource "aws_ram_resource_share_accepter" "tgw" {
  share_arn = var.tgw_share_arn
}

resource "aws_ec2_transit_gateway_vpc_attachment" "rds" {
  transit_gateway_id = var.tgw_id
  vpc_id             = var.rds_vpc_id
  subnet_ids         = var.rds_subnet_ids

  tags = {
    Name = "rds-tgw-attachment"
  }
}

# Return routes on every RDS subnet route table back to the PMM CIDR
resource "aws_route" "rds_to_pmm" {
  for_each               = toset(var.rds_route_table_ids)
  route_table_id         = each.value
  destination_cidr_block = var.pmm_vpc_cidr
  transit_gateway_id     = var.tgw_id
}
```

If you'd like the complete module including variable definitions and subnet deduplication logic, <a href="/contact.html">get in touch</a> and we're happy to share it.

<h2 id="notes">Key Notes</h2>

<ul>
  <li>The TGW lives in the PMM (source) account. Target accounts attach their RDS VPCs to it — they don't create their own TGW.</li>
  <li>Each target VPC attachment uses one subnet per AZ. Duplicate subnets within the same AZ will fail at attachment creation time.</li>
  <li>Route table entries are required on both sides. The PMM VPC needs routes to each target CIDR, and each target RDS subnet needs a route back to the PMM CIDR.</li>
  <li>Cross-account security group references don't work for inbound rules across accounts. Use the PMM subnet CIDR as the source instead.</li>
</ul>

<div class="series-nav">
  <h4>Continue the Series</h4>
  <ol>
    <li><span class="current">Part 1: Architecture and TGW Setup (You Are Here)</span></li>
    <li><a href="/blog/pmm-cross-account-monitoring-iam-configuration.html">Part 2: IAM Roles and Users &rarr;</a></li>
  </ol>
</div>
