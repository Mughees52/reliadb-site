---
title: "Cross-Account Database Monitoring with PMM and AWS Transit Gateway — Part 3: Installing PMM Server and Registering Services"
date: 2026-04-23T11:00:00.000Z
description: "Install PMM Server on Docker, deploy PMM clients on x86_64 and aarch64 nodes, create monitoring users, and register MySQL, ProxySQL, and MariaDB RDS services at scale."
categories:
  - mysql
  - aws-rds
read_time: 15
featured: false
author: "Mario"
coverImage: "/images/blog/pmm-cross-account-monitoring.jpg"
---

<div class="series-nav">
  <h4>Cross-Account Database Monitoring with PMM and AWS Transit Gateway &mdash; 5-Part Series</h4>
  <ol>
    <li><a href="/blog/pmm-cross-account-monitoring-transit-gateway.html">Part 1: Architecture and TGW Setup</a></li>
    <li><a href="/blog/pmm-cross-account-monitoring-iam-configuration.html">Part 2: IAM Roles and Users</a></li>
    <li><span class="current">Part 3: Installing PMM Server and Registering Services (You Are Here)</span></li>
    <li><a href="/blog/pmm-cross-account-monitoring-alerting-pagerduty-cloudwatch.html">Part 4: Alerting with PagerDuty and CloudWatch</a></li>
    <li><a href="/blog/pmm-cross-account-monitoring-backup-recovery.html">Part 5: Backup, Recovery, and Node Reconfiguration</a></li>
  </ol>
</div>

With the network (TGW) and permissions (IAM) in place, this part covers the software layer: deploying the PMM Server container, installing the PMM client on each monitored node, creating the MySQL monitoring user, and registering all services — MySQL, ProxySQL, and MariaDB RDS — in the PMM inventory. For environments with dozens of MariaDB RDS instances spread across multiple accounts, the final section provides a Python script that automates the bulk registration.

<h2 id="requirements">System and Software Requirements</h2>

<table>
  <thead>
    <tr><th>Category</th><th>Requirement</th></tr>
  </thead>
  <tbody>
    <tr><td>Storage</td><td>50 GB per monitored database node (default 30-day retention)</td></tr>
    <tr><td>Memory</td><td>Minimum 8 GB RAM per monitored database node</td></tr>
    <tr><td>CPU</td><td>2 cores recommended for basic monitoring</td></tr>
    <tr><td>Ports</td><td>TCP 443 open for PMM Server; TCP 3306 open between PMM agent and database</td></tr>
    <tr><td>Docker</td><td>Required for PMM Server installation</td></tr>
    <tr><td>Percona Release Tool</td><td>Required for PMM Client on RPM or DEB-based systems</td></tr>
  </tbody>
</table>

<h2 id="install-server">Installing PMM Server on Docker</h2>

All PMM Server deployments use a containerized architecture running in rootless mode. The steps below use PMM 2.44.0.

**Step 1:** Pull the PMM Server Docker image:

```
docker pull percona/pmm-server:2.44.0
```

**Step 2:** Create the persistent data volume:

```
docker volume create pmm-data
```

**Step 3:** Run the PMM Server container:

```
docker run --detach --restart always \
  --publish 443:443 \
  -v pmm-data:/srv \
  --name pmm-server \
  percona/pmm-server:2.44.0
```

**Step 4:** Verify the container is running and healthy:

```
docker ps -a
```

Expected output:

```
CONTAINER ID   IMAGE                       COMMAND                CREATED        STATUS                 PORTS                                           NAMES
406c9a02a1a5   percona/pmm-server:2.44.0   "/opt/entrypoint.sh"   4 months ago   Up 4 weeks (healthy)   80/tcp, 0.0.0.0:443->443/tcp, :::443->443/tcp   pmm-server
```

The PMM UI is available at `https://<pmm-ec2-ip>` once the container reports `healthy`.

<h2 id="install-client-x86">Installing the PMM Client — x86_64 (RPM)</h2>

Install the PMM client on each EC2 instance or server running a MySQL or ProxySQL instance that you want to monitor.

**Step 1:** Download the PMM client RPM:

```
wget https://downloads.percona.com/downloads/pmm2/2.44.0/binary/redhat/9/x86_64/pmm2-client-2.44.0-6.el9.x86_64.rpm
```

**Step 2:** Install the package:

```
rpm -ivh pmm2-client-2.44.0-6.el9.x86_64.rpm
```

**Step 3:** Register the node with the PMM Server. Replace the IP addresses and node name with your values:

```
pmm-admin config \
  --server-insecure-tls \
  --server-url=https://admin:<your_pmm_password>@<pmm-server-ip>:443 \
  <node-ip> generic <node-name>
```

<h2 id="install-client-aarch64">Installing the PMM Client — aarch64 (Tarball)</h2>

For ARM64-based instances (common for cost-optimized compute like ProxySQL nodes), the RPM package isn't available. Use the tarball installation method instead.

**Step 1:** Download and extract the aarch64 tarball:

```
wget https://downloads.percona.com/downloads/pmm2/2.44.0/binary/tarball/pmm2-client-2.44.0-aarch64.tar.gz
tar -xvzf pmm2-client-2.44.0-aarch64.tar.gz
```

**Step 2:** Create the required directories:

```
mkdir -p /usr/local/percona/pmm2/config/
```

**Step 3:** Run the installer:

```
export PMM_DIR=/usr/local/percona/pmm2
cd pmm2-client-2.44.0/
./install_tarball
```

**Step 4:** Add the PMM binaries to the PATH in `.bashrc`:

```
export PATH=$PATH:/usr/local/percona/pmm2/bin
source .bashrc
```

**Step 5:** Create the systemd service file at `/etc/systemd/system/pmm-agent@.service`:

```
[Unit]
Description=pmm-agent
After=time-sync.target network.target

[Service]
Type=simple
EnvironmentFile=/etc/default/%i-pmm-agent
ExecStart=/usr/local/percona/pmm2/bin/pmm-agent --config-file=/usr/local/percona/pmm2/config/pmm-agent.yaml
User=root
Restart=always
RestartSec=2s

[Install]
WantedBy=multi-user.target
```

Create the environment file at `/etc/default/percona-pmm-agent`:

```
PMM_AGENT_LOG_LEVEL=info
```

Reload systemd:

```
sudo systemctl daemon-reload
```

**Step 6:** Register the node with the PMM Server:

```
pmm-agent setup \
  --config-file=/usr/local/percona/pmm2/config/pmm-agent.yaml \
  --server-address=<pmm-server-ip> \
  --server-insecure-tls \
  --server-username=admin \
  --server-password=<your_pmm_password> \
  <node-ip> generic <node-name>
```

<h2 id="mysql-user">Create the PMM Monitoring User in MySQL</h2>

Before adding a MySQL or MariaDB instance to PMM, create a dedicated monitoring user. The required privileges differ slightly between MySQL versions.

**For MySQL 8.0:**

```sql
CREATE USER 'pmm'@'127.0.0.1' IDENTIFIED BY '<your_password>' WITH MAX_USER_CONNECTIONS 10;
GRANT SELECT, PROCESS, REPLICATION CLIENT, RELOAD, BACKUP_ADMIN ON *.* TO 'pmm'@'127.0.0.1';
```

**For MySQL 5.7:**

```sql
CREATE USER 'pmm'@'127.0.0.1' IDENTIFIED BY '<your_password>' WITH MAX_USER_CONNECTIONS 10;
GRANT SELECT, PROCESS, REPLICATION CLIENT, RELOAD, SUPER ON *.* TO 'pmm'@'127.0.0.1';
```

**For RDS instances** (bind address is `%` because the PMM agent connects remotely):

```sql
CREATE USER 'pmm'@'%' IDENTIFIED BY '<your_password>';
GRANT SELECT, PROCESS, REPLICATION CLIENT ON *.* TO 'pmm'@'%';
ALTER USER 'pmm'@'%' WITH MAX_USER_CONNECTIONS 10;
GRANT SELECT, UPDATE, DELETE, DROP ON performance_schema.* TO 'pmm'@'%';
```

<h2 id="add-mysql">Register a MySQL Service in PMM</h2>

With the monitoring user created and the PMM client running on the node, add the MySQL service:

```
pmm-admin add mysql --query-source=perfschema --username=pmm --password=<your_password>
```

The `--query-source=perfschema` option uses Performance Schema for query analytics. This is the recommended source for MySQL 8.0 and MariaDB 10.5+.

<h2 id="add-proxysql">Register a ProxySQL Service in PMM</h2>

ProxySQL exposes its admin interface on port 6032. Register it using the admin credentials:

```
pmm-admin add proxysql \
  --username=admin \
  --password=<your_proxysql_admin_password> \
  --service-name=<node-name> \
  --host=127.0.0.1 \
  --port=6032
```

<h2 id="add-rds-ui">Register an RDS Instance via the PMM UI</h2>

For individual RDS instances, use the PMM web interface:

1. Go to **Configuration → PMM Inventory → Add Instance**
2. Select **MySQL – Add a remote instance**
3. Fill in the **Main details** section:
   - **Hostname**: the RDS endpoint DNS name
   - **Service name**: a short descriptive name used in PMM dashboards
   - **Port**: `3306`
   - **Username / Password**: the `pmm` user credentials created above
4. Fill in the **Labels** section with environment, region, and AZ
5. Click **Add service**

The IAM role and user required for CloudWatch integration are configured separately as data sources, as described in Part 2.

<h2 id="bulk-mariadb">Bulk-Register MariaDB RDS Instances via Script</h2>

In environments with many MariaDB RDS instances spread across multiple AWS accounts, registering each one through the UI is impractical. The Python script below automates discovery and registration using the PMM API and AWS SDK.

<h3 id="script-prereqs">Prerequisites</h3>

Install the required Python packages:

```
boto3
requests
json
os
sys
```

<h3 id="script">The Registration Script</h3>

Save the following as `add_mariadb_to_pmm.py`. Update the `PMM_API_ENDPOINT`, credentials, and `profiles` list for your environment before running:

```python
import boto3
import requests
import json
import os
import sys
from base64 import b64encode
from urllib3 import disable_warnings
from urllib3.exceptions import InsecureRequestWarning

disable_warnings(InsecureRequestWarning)

PMM_API_ENDPOINT = "https://localhost:8443/v1"
PMM_USER = "admin"
PMM_PASS = "<your_pmm_password>"
DB_USER = "pmm"
DB_PASS = "<your_db_password>"
REGION = "us-east-1"
ENGINE = "mariadb"

pmmauthencoded = b64encode(bytes(f'{PMM_USER}:{PMM_PASS}', encoding='ascii')).decode('ascii')
HEADERS = {
    'accept': 'application/json',
    'authorization': 'Basic ' + pmmauthencoded,
    'Content-Type': 'application/json'
}

def get_existing_services():
    try:
        r = requests.get(f"{PMM_API_ENDPOINT}/management/Services/List", headers=HEADERS, verify=False)
        r.raise_for_status()
        data = r.json()
        return set(service['service_name'] for service in data.get('services', []))
    except Exception as e:
        print(f"[ERROR] Failed to get existing services from PMM: {e}")
        return set()

def clean_name(identifier):
    return identifier.split('.')[0] if '.' in identifier else identifier

def add_mariadb_instance(i, awsaccount, awsprofile):
    identifier = i['DBInstanceIdentifier']
    address = i['Endpoint']['Address']
    node_name = clean_name(identifier)

    dataload = {
        "add_node": {
            "node_type": "REMOTE_NODE",
            "node_name": node_name,
            "node_model": i["DBInstanceClass"],
            "region": awsprofile
        },
        "service_name": node_name,
        "address": address,
        "port": "3306",
        "pmm_agent_id": "pmm-server",
        "environment": "prod",
        "username": DB_USER,
        "password": DB_PASS,
        "qan_mysql_perfschema": True,
        "qan_mysql_slowlog": False,
        "disable_query_examples": False,
        "custom_labels": {
            "aws_account": awsaccount,
            "storage_type": i.get("StorageType", ""),
            "public_access": str(i.get("PubliclyAccessible", "")),
            "multiaz": str(i.get("MultiAZ", ""))
        },
        "skip_connection_check": False,
        "tls": False,
        "tls_skip_verify": True,
        "metrics_mode": "AUTO"
    }

    try:
        r = requests.post(
            f"{PMM_API_ENDPOINT}/management/MySQL/Add",
            headers=HEADERS,
            data=json.dumps(dataload),
            verify=False
        )
        r.raise_for_status()
        print(f"[INFO] Successfully added {node_name} to PMM")
    except Exception as e:
        print(f"[ERROR] Failed to add {node_name} to PMM: {e}")

def main():
    existing_services = get_existing_services()

    profiles = [
        "cmp-dwh", "jucy", "bdvr-components", "biz-hub-test", "cmp-mailer",
        "wh-components", "bdvr-prod", "oct-ss-legacy", "shared-hosting",
        "cmp-manycomponents", "wh-prod", "rd-ketobody", "bdvr-dev", "oct-ss-components"
    ]

    for profile in profiles:
        awsaccount = boto3.session.Session(profile_name=profile).client('sts').get_caller_identity()['Account']
        boto3.setup_default_session(profile_name=profile)
        rdsclient = boto3.client('rds', region_name=REGION)

        paginator = rdsclient.get_paginator('describe_db_instances')
        pages = paginator.paginate(Filters=[{'Name': 'engine', 'Values': [ENGINE]}])

        for page in pages:
            for i in page['DBInstances']:
                identifier = i['DBInstanceIdentifier']
                if not identifier.startswith("prod-"):
                    continue

                tags = rdsclient.list_tags_for_resource(ResourceName=i['DBInstanceArn'])['TagList']
                skip = any(
                    t['Key'].lower() == 'environment' and t['Value'].lower() in ['test', 'stage']
                    for t in tags
                )
                if skip:
                    continue

                short_name = clean_name(identifier)
                if short_name in existing_services:
                    print(f"[SKIP] Service {short_name} already exists in PMM")
                    continue

                if i['DBInstanceStatus'] == 'available':
                    add_mariadb_instance(i, awsaccount, profile)

if __name__ == "__main__":
    main()
```

<h3 id="script-run">Run the Script</h3>

Execute from the PMM EC2 instance after opening an SSM port-forward session to the PMM API:

```
python Scripts/add_mariadb_to_pmm.py
```

Expected output per account:

```
Processing AWS profile: oct-ss-components
Added to PMM: prod-billing-hub-db
Added to PMM: prod-rr-billing-hub-db
```

The script skips instances that already exist in the PMM inventory, so it's safe to re-run after adding new accounts to the `profiles` list.

<div class="callout">
  <p><strong>Filtering logic:</strong> The script only registers instances whose identifier starts with <code>prod-</code> and skips any instance tagged with <code>environment=test</code> or <code>environment=stage</code>. Adjust these filters to match your tagging convention before running in production.</p>
</div>

<div class="series-nav">
  <h4>Continue the Series</h4>
  <ol>
    <li><a href="/blog/pmm-cross-account-monitoring-iam-configuration.html">&larr; Part 2: IAM Roles and Users</a></li>
    <li><span class="current">Part 3: Installing PMM Server and Registering Services (You Are Here)</span></li>
    <li><a href="/blog/pmm-cross-account-monitoring-alerting-pagerduty-cloudwatch.html">Part 4: Alerting with PagerDuty and CloudWatch &rarr;</a></li>
  </ol>
</div>
