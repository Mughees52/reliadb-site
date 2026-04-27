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

- **Destination**: `<target-vpc-cidr>` (e.g., `192.168.1.0/16`)
- **Target**: the TGW ID

Repeat for every target account VPC that hosts RDS instances.

<h3 id="routes-rds">RDS Subnet Route Tables (Target Accounts)</h3>

In each target account, update the route tables for every RDS subnet:

- **Destination**: `<pmm-vpc-cidr>` (e.g., `172.16.0.0/16`)
- **Target**: the shared TGW ID

This return route is often missed. Without it, the PMM EC2 can reach the RDS endpoint, but the RDS response packets have no path back — resulting in connections that hang rather than refuse.

<h2 id="security-groups">Step 4: Security Group and NACL Setup</h2>

<h3 id="sg-rds">RDS Security Group (Target Accounts)</h3>

Add an inbound rule to the security group attached to each RDS instance:

- **Type**: MySQL/Aurora (TCP 3306)
- **Source**: the CIDR of the PMM EC2 subnet in the source account (e.g., `10.0.1.0/24`)

Using the CIDR rather than a security group ID is necessary here because cross-account security group references aren't supported for inbound rules referencing groups in different accounts.

<h3 id="nacl">Network ACLs</h3>

If your subnets use custom NACLs (the default NACL allows all traffic), verify that:

- **Inbound**: allows TCP 3306 from the PMM subnet CIDR
- **Outbound**: allows the ephemeral port range (1024–65535) back to the PMM subnet CIDR

NACLs are stateless, so both directions must be explicitly permitted.

<h2 id="verify">Step 5: Test Network Connectivity</h2>

Before proceeding to IAM setup, confirm the TGW routing is working end-to-end from the PMM EC2 instance. Run the three checks below in order — each one isolates a different layer of the stack.

<h3 id="verify-dns">Check 1: DNS Resolution</h3>

RDS endpoints are DNS names. If DNS doesn't resolve from the PMM VPC, TCP never gets attempted and the error looks identical to a routing failure.

```
nslookup <rds-endpoint>
```

A successful response returns the private IP of the RDS instance within the target VPC. If it returns `NXDOMAIN` or times out, the PMM VPC's DNS resolver can't reach the target — check that DNS resolution and DNS hostnames are enabled on both VPCs (`enableDnsSupport` and `enableDnsHostnames` in the VPC settings).

<h3 id="verify-tcp">Check 2: TCP Port Reachability</h3>

`telnet` is not installed by default on Amazon Linux 2 / AL2023. Use `nc` instead:

```
nc -zv <rds-endpoint> 3306
```

A successful result prints `Connection to <rds-endpoint> 3306 port [tcp/mysql] succeeded!`. This confirms that the TGW, VPC attachments, route tables, and security groups are all correctly configured in both directions.

<h3 id="verify-repeat">Check 3: Repeat for One RDS per Target Account</h3>

Don't stop at the first success. Test connectivity to at least one RDS instance in each target account — routing issues are often account-specific (a missing RAM share acceptance, a missing TGW attachment, or a missing return route in that account's subnet route table).

<h3 id="verify-troubleshoot">Troubleshooting</h3>

If `nc` times out rather than refusing the connection, the packet is being dropped in transit rather than rejected by the database. Work through the following in order:

<table>
  <thead>
    <tr><th>Symptom</th><th>Most likely cause</th><th>Where to check</th></tr>
  </thead>
  <tbody>
    <tr><td>DNS resolves, <code>nc</code> times out</td><td>Missing return route in the RDS subnet route table</td><td>Target account → VPC → Route tables → RDS subnet route table. Look for a route to the PMM VPC CIDR via the TGW.</td></tr>
    <tr><td>DNS resolves, <code>nc</code> times out after adding return route</td><td>NACL blocking ephemeral ports</td><td>Target account → VPC → Network ACLs → outbound rules. Ensure TCP 1024–65535 is allowed outbound to the PMM subnet CIDR.</td></tr>
    <tr><td>DNS does not resolve</td><td>VPC DNS settings or RAM share not accepted</td><td>Confirm the target account accepted the RAM resource share. Confirm <code>enableDnsSupport</code> is enabled on the target VPC.</td></tr>
    <tr><td><code>nc</code> refused (not timed out)</td><td>RDS security group rejecting the source</td><td>Target account → EC2 → Security groups → RDS security group inbound rules. Confirm TCP 3306 is allowed from the PMM subnet CIDR.</td></tr>
  </tbody>
</table>

<div class="callout">
  <p><strong>Test before continuing:</strong> IAM configuration and PMM client installation depend on network connectivity. Confirming all checks pass now prevents hours of debugging later when the failure mode shifts from network errors to authentication errors.</p>
</div>

<h2 id="terraform">Terraform Reference</h2>

The TGW configuration described in this guide is fully managed as Terraform in production. The snippets below cover the key resources — adapt variable names and values to your environment.

<h3 id="tf-providers">Multi-Account Provider Setup</h3>

Rather than maintaining a separate Terraform repo per account, you can centralize the entire setup in the source account's repo using one AWS provider per target account. Each provider uses `assume_role` to act in the target account — no separate state backend or repo required.

```hcl
# Default provider — source account (where the PMM EC2 and TGW live)
provider "aws" {
  region = "us-east-1"
}

# One provider per target account, assuming a role with sufficient permissions
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

Target account resources reference their provider with the `provider` argument. To avoid repeating the resource blocks for every account, wrap the target resources in a module and pass the provider via `providers`:

```hcl
module "tgw_attachment_account_a" {
  source    = "./modules/tgw-target-attachment"
  providers = { aws = aws.target_account_a }

  tgw_id            = aws_ec2_transit_gateway.main.id
  tgw_share_arn     = aws_ram_resource_share.tgw.arn
  rds_vpc_id        = "<vpc-id-account-a>"
  rds_subnet_ids    = ["<subnet-1>", "<subnet-2>"]
  rds_route_table_ids = ["<rtb-1>", "<rtb-2>"]
  pmm_vpc_cidr      = "<pmm-vpc-cidr>"
}

module "tgw_attachment_account_b" {
  source    = "./modules/tgw-target-attachment"
  providers = { aws = aws.target_account_b }

  tgw_id            = aws_ec2_transit_gateway.main.id
  tgw_share_arn     = aws_ram_resource_share.tgw.arn
  rds_vpc_id        = "<vpc-id-account-b>"
  rds_subnet_ids    = ["<subnet-1>", "<subnet-2>"]
  rds_route_table_ids = ["<rtb-1>", "<rtb-2>"]
  pmm_vpc_cidr      = "<pmm-vpc-cidr>"
}
```

Adding a new target account is then just a new provider block and a new module call — no structural changes to existing code.

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
