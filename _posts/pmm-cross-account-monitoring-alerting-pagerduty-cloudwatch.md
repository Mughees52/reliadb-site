---
title: "Cross-Account Database Monitoring with PMM and AWS Transit Gateway — Part 4: Alerting with PagerDuty and CloudWatch"
date: 2026-04-23T12:00:00.000Z
description: "Configure PMM alerting end-to-end: custom MetricsQL alert templates, PagerDuty contact points, notification policies, CloudWatch data sources via IAM role assumption, and amtool for silence management."
categories:
  - mysql
  - aws-rds
read_time: 13
featured: false
author: "Mario"
coverImage: "/images/blog/pmm-cross-account-monitoring-alerting.jpg"
---

<div class="series-nav">
  <h4>Cross-Account Database Monitoring with PMM and AWS Transit Gateway &mdash; 5-Part Series</h4>
  <ol>
    <li><a href="/blog/pmm-cross-account-monitoring-transit-gateway.html">Part 1: Architecture and TGW Setup</a></li>
    <li><a href="/blog/pmm-cross-account-monitoring-iam-configuration.html">Part 2: IAM Roles and Users</a></li>
    <li><a href="/blog/pmm-cross-account-monitoring-install-server-client.html">Part 3: Installing PMM Server and Registering Services</a></li>
    <li><span class="current">Part 4: Alerting with PagerDuty and CloudWatch (You Are Here)</span></li>
    <li><a href="/blog/pmm-cross-account-monitoring-backup-recovery.html">Part 5: Backup, Recovery, and Node Reconfiguration</a></li>
  </ol>
</div>

With PMM collecting metrics from every RDS instance and EC2 node across all accounts, the next step is turning those metrics into actionable alerts. PMM's alerting stack is built on Grafana Alerting and Alertmanager, which means you can use MetricsQL (backward-compatible with PromQL) for alert expressions and integrate with any webhook-based notification target. This part covers the full alerting configuration: custom alert templates, a PagerDuty contact point with a custom notification template, notification routing policies, adding CloudWatch data sources via cross-account role assumption, and managing silences with `amtool`.

<h2 id="alert-templates">Alert Templates</h2>

PMM alert templates are YAML files that define the expression and parameters for an alert rule. They serve as the source framework — you create one template and derive multiple rules from it (for example, separate rules for warning and critical thresholds, or for production versus staging).

<h3 id="template-format">Template Format</h3>

Every custom template requires the following fields:

<table>
  <thead>
    <tr><th>Field</th><th>Required</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td><code>name</code></td><td>Yes</td><td>Unique identifier. No spaces or special characters.</td></tr>
    <tr><td><code>version</code></td><td>Yes</td><td>Template format version (use <code>1</code>).</td></tr>
    <tr><td><code>summary</code></td><td>Yes</td><td>Human-readable description.</td></tr>
    <tr><td><code>expr</code></td><td>Yes</td><td>MetricsQL query string with parameter placeholders.</td></tr>
    <tr><td><code>params</code></td><td>No</td><td>Parameter definitions (name, type, range, default value).</td></tr>
    <tr><td><code>for</code></td><td>Yes</td><td>How long the expression must be true before firing.</td></tr>
    <tr><td><code>severity</code></td><td>Yes</td><td>Default alert severity: <code>critical</code>, <code>warning</code>, or <code>notice</code>.</td></tr>
    <tr><td><code>labels</code></td><td>No</td><td>Additional labels attached to fired alerts (e.g., runbook URL).</td></tr>
    <tr><td><code>annotations</code></td><td>No</td><td>Additional annotations (e.g., summary, description text).</td></tr>
  </tbody>
</table>

<h3 id="template-example">Template Example: High CPU Load</h3>

```yaml
{% raw %}
templates:
    - name: NodeCpuUtilization
      version: 1
      summary: NodeCpuUtilization
      expr: >
        (1 - sum(rate(node_cpu_seconds_total{mode='idle'}[1m])) by (node_name)
        / count(node_cpu_seconds_total{mode='idle'}) by (node_name)) * 100
        > [[ .threshold ]]
      params:
        - name: threshold
          summary: A percentage from configured maximum
          unit: '%'
          type: float
          range: [0, 100]
          value: 90
      for: 5m
      severity: critical
      labels:
        runbook: https://localhost/runbooks/#NodeCpuUtilization
        service: generic
      annotations:
        description: Check if a process is not using too much CPU
        summary: "CRITICAL - CPU Usage - {{ $labels.node_name }}"
{% endraw %}
```

The `[[ .threshold ]]` placeholder is replaced with the configured parameter value at rule creation time. This lets you reuse the same template for a 90% critical threshold and an 80% warning threshold without duplicating the expression.

<h3 id="create-rule">Create an Alert Rule from a Template</h3>

1. Go to **Alerting → Alert Rules → New alert rule**
2. Select the **Percona templated alert** option
3. In **Template details**, choose your template — the Name, Duration, and Severity fields populate automatically
4. Add **Filters** to scope the rule (e.g., `service_name=prod-billing-hub-db`). Multiple filters use AND logic.
5. Select a **Folder** for the rule
6. Click **Save and Exit**

<div class="callout">
  <p><strong>Filter label matching:</strong> Label names in filters must be exact matches. Use the <strong>Explore</strong> menu in PMM to browse available labels for your registered services before writing filter expressions.</p>
</div>

<h2 id="pagerduty">PagerDuty Integration</h2>

<h3 id="pd-key">Step 1: Get the PagerDuty Integration Key</h3>

1. Log into PagerDuty and open the target service
2. Go to the **Integrations** tab → **Add Integration**
3. Select **Events API v2**
4. Name it (e.g., "PMM Alerts") and click **Add Integration**
5. Copy the **Integration Key** — you'll paste it into PMM in the next step

<h3 id="pd-template">Step 2: Create the PagerDuty Notification Template</h3>

PMM uses Grafana's notification templating. Create a template named `pagerduty` to control the alert title sent to PagerDuty:

1. Go to **Alerting → Contact Points → Notification templates**
2. Set the template name to `pagerduty`
3. Paste the following in the template body:

```
{% raw %}
{{ define "pagerduty" }}
  {{ index .CommonLabels "alertname"}} - {{ index .CommonAnnotations "summary"}}
{{ end }}
{% endraw %}
```

This template surfaces the alert name and summary annotation as the PagerDuty incident title, making incidents immediately readable in the PagerDuty timeline.

<h3 id="pd-contact-point">Step 3: Create the PagerDuty Contact Point</h3>

1. Go to **Alerting → Contact Points → New contact point**
2. Set:
   - **Name**: `pagerduty`
   - **Type**: PagerDuty
   - **Integration Key**: paste the key from Step 1
   - **Severity**: leave at default or set as appropriate
3. In the **Summary** field, enter: `{% raw %}{{ template "pagerduty" . }}{% endraw %}`
4. Click **Save contact point**

<h2 id="notification-policy">Notification Policy</h2>

Notification policies define which alerts route to which contact points. The root policy applies a default contact point to all alerts. Specific policies let you override routing based on label matchers.

1. Go to **Alerting → Notification policies → New specific policy**
2. In **Matching labels**, add label matchers to scope the policy. Leave it empty to match all alerts.
3. Select `pagerduty` as the contact point
4. Optional settings:
   - **Continue matching subsequent sibling nodes** — useful for sending to a catch-all contact point in addition to the matched one
   - **Override grouping** — disables root policy grouping for this branch
   - **Override general timings** — sets a custom group wait interval for new alert groups
   - **Mute timing** — suppresses notifications on a recurring schedule (e.g., weekends for low-severity alerts)
5. Save the policy

<h2 id="cloudwatch-datasource">Add CloudWatch Data Sources via IAM Role Assumption</h2>

CloudWatch data sources power the infrastructure-level dashboards (CPU, disk I/O, storage) and can be used as the data source for alert rules targeting RDS metrics. Adding one data source per target account is required; the script below automates this.

<h3 id="aws-config">Prerequisites: AWS Configuration</h3>

The PMM EC2 instance must have its AWS profiles configured to assume the correct roles. Verify the configuration:

```
cat ~/.aws/config
```

Expected structure:

```
[profile default]
sso_start_url = https://your-org.awsapps.com/start
sso_account_id = <pmm-account-id>
sso_region = us-east-1
sso_role_name = <your-sso-role>

[profile cmp-dwh]
role_arn = arn:aws:iam::<account-id>:role/MadAdministrator
source_profile = default
```

<h3 id="ssm-tunnel">Connect to PMM via SSM Port Forwarding</h3>

The PMM API is accessible only within the VPC. Use SSM to tunnel the API port to your local machine:

```
aws ssm start-session \
    --profile <your-profile> \
    --target <pmm-instance-id> \
    --region us-east-1 \
    --document-name AWS-StartPortForwardingSession \
    --parameters '{"portNumber":["443"],"localPortNumber":["8443"]}'
```

<h3 id="datasource-script">Bulk-Add CloudWatch Data Sources</h3>

The script below adds one CloudWatch data source per account, using cross-account role assumption. It checks for existing data sources to avoid duplicates on re-runs:

```bash
#!/bin/bash

PMM_URL="https://localhost:8443"
API_KEY="<your_pmm_api_key>"
ROLE_NAME="AmazonRDSforPMMrole"
REGION="us-east-1"

account_names=(
  "oct-ss-components"
  "cmp-jucy"
  "wh-prod"
  "bdvr-prod"
  "bdvr-components"
  "cmp-mailer"
  "cmp-manycomponents"
  "rd-ketobody"
  "shared-hosting"
  "wh-components"
  "cmp-dwh"
)

account_ids=(
  153281781315
  966746064837
  210683788275
  796844153911
  961248379432
  861516613539
  346209794437
  195104288847
  380566252609
  800906568488
  738135556174
)

existing_data=$(curl -k -s -H "Authorization: Bearer $API_KEY" "$PMM_URL/graph/api/datasources")

for i in "${!account_ids[@]}"; do
  name="${account_names[$i]}"
  account_id="${account_ids[$i]}"
  arn="arn:aws:iam::${account_id}:role/${ROLE_NAME}"

  exists=$(echo "$existing_data" | jq -r ".[] | select(.type==\"cloudwatch\") | .jsonData.assumeRoleArn" | grep -F "$arn")

  if [[ -n "$exists" ]]; then
    echo "Skipping $name — already exists with ARN: $arn"
    continue
  fi

  response=$(curl -k -s -X POST "$PMM_URL/graph/api/datasources" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d @- <<EOF
{
  "name": "$name",
  "type": "cloudwatch",
  "access": "proxy",
  "isDefault": false,
  "jsonData": {
    "authType": "default",
    "defaultRegion": "$REGION",
    "assumeRoleArn": "$arn"
  }
}
EOF
  )

  echo "$response"
  echo "Created data source for $name ($account_id)"
done
```

Run the script from the machine where the SSM tunnel is active.

<h2 id="amtool">Managing Silences with amtool</h2>

`amtool` is the Alertmanager CLI tool. It allows you to query active alerts and manage silences from the command line — useful during maintenance windows or when acknowledging known flapping alerts without opening the PMM UI.

<h3 id="amtool-install">Install amtool</h3>

Requires Go 1.22 or later on the PMM node:

```
go install github.com/prometheus/alertmanager/cmd/amtool@latest
```

Add the Go bin directory to PATH in `.bashrc`:

```
export PATH=$PATH:/root/go/bin
```

<h3 id="amtool-config">Configure amtool</h3>

Create an API key in PMM (**Configuration → API Keys → Add API Key**) with:
- Name: `amtool`
- Role: Editor
- Time to live: leave empty (no expiry)

Create the configuration directory and files:

```
mkdir -p ~/.config/amtool/
```

`~/.config/amtool/config.yml`:

```yaml
alertmanager.url: "https://localhost/graph/api/alertmanager/grafana/"
version-check: false
http.config.file: "/root/.config/amtool/http.conf"
```

`~/.config/amtool/http.conf`:

```yaml
authorization:
  type: Bearer
  credentials: <your_amtool_api_key>
tls_config:
  insecure_skip_verify: True
```

<div class="callout">
  <p><strong>Remote access:</strong> If configuring <code>amtool</code> on a laptop rather than the PMM node, replace <code>localhost</code> in <code>alertmanager.url</code> with the PMM server's IP address or DNS name.</p>
</div>

<h3 id="amtool-usage">Common amtool Commands</h3>

**View active alerts:**

```
amtool alert
```

Example output:

```
Alertname                           Starts At                Summary                                                     State
MySQLPrimaryReadOnly Alerting Rule  2025-05-01 11:49:00 UTC  CRITICAL - MySQL Primary ReadOnly - prod-rr-billing-hub-db  active
```

**Silence an alert for a specific service:**

```
amtool silence add service_name=<service-name>-mysql alertname=<alertname> --duration=16h --comment "maintenance window"
```

**View active silences:**

```
amtool silence query
```

**Expire a specific silence by ID:**

```
amtool silence expire <ID>
```

**Expire all active silences at once:**

```
amtool silence expire $(amtool silence query -q)
```

<div class="series-nav">
  <h4>Continue the Series</h4>
  <ol>
    <li><a href="/blog/pmm-cross-account-monitoring-install-server-client.html">&larr; Part 3: Installing PMM Server and Registering Services</a></li>
    <li><span class="current">Part 4: Alerting with PagerDuty and CloudWatch (You Are Here)</span></li>
    <li><a href="/blog/pmm-cross-account-monitoring-backup-recovery.html">Part 5: Backup, Recovery, and Node Reconfiguration &rarr;</a></li>
  </ol>
</div>
