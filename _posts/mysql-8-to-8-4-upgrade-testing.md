---
title: "MySQL 8.0 to 8.4 LTS Upgrade Guide — Part 2: Upgrade Testing"
date: 2026-04-06T11:00:00.000Z
description: "Learn how to test your MySQL 8.0 to 8.4 upgrade using pt-upgrade, dry-run procedures, application compatibility checks, and canary testing before touching production."
categories:
  - mysql
  - mysql-upgrade
read_time: 12
featured: false
author: "Mughees Ahmed"
dateModified: "2026-04-11T00:00:00+00:00"
---

<!-- Series Navigation -->
<div class="series-nav">
  <h4>MySQL 8.0 to 8.4 LTS Upgrade Guide &mdash; 5-Part Series</h4>
  <ol>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-pre-upgrade-preparation.html">Part 1: Pre-Upgrade Preparation</a></li>
    <li><span class="current">Part 2: Upgrade Testing (You Are Here)</span></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-execution.html">Part 3: Upgrade Execution</a></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-rollback-validation.html">Part 4: Rollback and Post-Upgrade Validation</a></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-change-management-checklist.html">Part 5: Change Management, Troubleshooting, and Checklist</a></li>
  </ol>
</div>

Testing is the most time-consuming but most valuable phase of the upgrade process. Skipping testing for a major version upgrade carries extreme risk. For large datasets (multi-terabyte), a failed untested upgrade could result in 10-20+ hours of downtime for rollback alone.

This part covers setting up a test environment, running pt-upgrade for query compatibility, performing a full dry-run, verifying tool compatibility, and optional canary testing.

<h2 id="test-environment">Test Environment Setup</h2>

Set up a test environment that mirrors production as closely as possible. You need two instances for pt-upgrade comparison testing:

<table>
  <thead>
    <tr><th>Instance</th><th>Version</th><th>Purpose</th></tr>
  </thead>
  <tbody>
    <tr><td>Test Instance A</td><td>MySQL 8.0.37</td><td>Baseline matching production (control)</td></tr>
    <tr><td>Test Instance B</td><td>MySQL 8.4.8</td><td>Upgrade target (test candidate)</td></tr>
  </tbody>
</table>

### Setup Steps

1. Restore both instances from a recent production backup
2. Ensure both instances have identical data at the same point-in-time
3. Configure the 8.4 instance with your planned `my.cnf` (cleaned of removed parameters)
4. Apply binary logs to both so data matches the start of your slow query log capture window
5. Verify both instances are healthy and serving queries

**Estimated Time:** 15-20 hours

<h2 id="pt-upgrade">Query Compatibility Testing with pt-upgrade</h2>

`pt-upgrade` (Percona Toolkit) replays your actual production workload against both MySQL versions side-by-side and reports differences in query results, errors, or performance.

### Step-by-Step Process

**Step 1:** Enable slow query logging on the production source to capture workload:

```sql
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 0;  -- Capture ALL queries
```

**Step 2:** Collect 1-3 hours of production traffic during peak hours.

**Step 3:** Disable slow query logging and copy the log:

```sql
SET GLOBAL slow_query_log = OFF;
cp /var/lib/mysql/*-slow.log /root/pt-upgrade-workload.log
```

**Step 4:** Create a query digest for structured replay:

```bash
pt-query-digest /root/pt-upgrade-workload.log --output slowlog \
  > /root/pt-upgrade-digest.out
```

**Step 5:** Run pt-upgrade (read-only test):

```bash
pt-upgrade h=test_80_host,u=user,p=pass \
  h=test_84_host,u=user,p=pass \
  --max-examples=1 /root/pt-upgrade-digest.out \
  1> pt-upgrade_RO.out 2> pt-upgrade_RO.err
```

**Step 6:** Run pt-upgrade (read-write test):

```bash
pt-upgrade h=test_80_host,u=user,p=pass \
  h=test_84_host,u=user,p=pass \
  --no-read-only --max-examples=1 /root/pt-upgrade-digest.out \
  1> pt-upgrade_RW.out 2> pt-upgrade_RW.err
```

**Step 7:** Analyze results for query failures, row count differences, and performance regressions.

**Estimated Time:** 20-25 hours (including collection, RO test, RW test, and analysis)

<div class="callout">
  <p><strong>BEST PRACTICE:</strong> Percona strongly recommends performing both compatibility checks and pt-upgrade testing. The risk of skipping testing on large datasets is a failed upgrade requiring 10-20+ hours of rollback downtime, far exceeding the testing investment.</p>
</div>

<h2 id="dry-run">Full Dry-Run Upgrade</h2>

Beyond query testing, perform the entire upgrade procedure end-to-end on a staging replica before touching production. This validates:

- The complete upgrade procedure works without errors
- The `my.cnf` changes are correct and MySQL starts cleanly
- The upgrade duration matches your maintenance window estimates
- Your rollback procedure works if needed
- Your monitoring and alerting detects the upgraded instance correctly

<div class="callout">
  <p><strong>BEST PRACTICE:</strong> A dry-run on staging is standard DBA practice for major version upgrades. It catches issues that query-level testing cannot, such as package dependency conflicts, file permission problems, and systemd service configuration changes.</p>
</div>

<!-- Inline CTA -->
<div class="post-cta-inline">
  <h4>Need help setting up your test environment?</h4>
  <p>Building a proper test environment with pt-upgrade, staging replicas, and canary routing takes time and expertise. If you'd like a DBA team to handle this, book a free assessment call.</p>
  <a href="/contact/" class="btn">Book Free Assessment &rarr;</a>
</div>

<h2 id="tool-compatibility">Application and Tool Compatibility Testing</h2>

Verify that all ecosystem components work with MySQL 8.4:

<table>
  <thead>
    <tr><th>Component</th><th>Minimum Version for 8.4</th><th>Verification Steps</th></tr>
  </thead>
  <tbody>
    <tr><td>Percona Toolkit (pt-*)</td><td>3.5+</td><td>Run pt-table-checksum and pt-online-schema-change on test</td></tr>
    <tr><td>PMM</td><td>Latest release</td><td>Verify metrics collection from 8.4 instance</td></tr>
    <tr><td>ProxySQL</td><td>2.5.4+</td><td>Test auth chain and query routing</td></tr>
    <tr><td>Percona XtraBackup</td><td>8.4.x matching target</td><td>Take and restore a test backup on 8.4</td></tr>
    <tr><td>MySQL Shell</td><td>8.4.x</td><td>Run upgrade checker and dump utilities</td></tr>
    <tr><td>Orchestrator</td><td>Verify SOURCE/REPLICA support</td><td>Test failover on staging</td></tr>
    <tr><td>Application Connectors</td><td>See <a href="/blog/mysql-8-to-8-4-upgrade-pre-upgrade-preparation.html#auth-migration">Part 1, Section 2.7</a></td><td>End-to-end CRUD tests</td></tr>
  </tbody>
</table>

<h2 id="canary-testing">Canary Testing (Optional but Recommended)</h2>

For critical production databases, consider canary testing before full cutover:

1. Set up the 8.4 instance as a replica receiving real production traffic
2. Configure ProxySQL or your load balancer to route a small percentage (5-10%) of read traffic to the 8.4 replica
3. Monitor error rates, query latency, and result correctness for 24-48 hours
4. Gradually increase traffic percentage if no issues are found
5. Proceed to full cutover once confident

This approach catches subtle issues under real production load patterns that synthetic testing may miss.

<h2 id="checklist">Part 2 Quick Checklist</h2>

<ul class="checklist">
  <li>Set up test environment (8.0 baseline + 8.4 target)</li>
  <li>Collect slow query log from production (1-3 hours peak)</li>
  <li>Run pt-upgrade read-only test and analyze results</li>
  <li>Run pt-upgrade read-write test and analyze results</li>
  <li>Run application test suites against 8.4 test instance</li>
  <li>Load test 8.4 instance and compare performance</li>
  <li>Complete full dry-run upgrade on staging</li>
  <li>Canary test with partial traffic (optional)</li>
</ul>

<!-- Series Nav Bottom -->
<div class="series-nav">
  <h4>Continue the Series</h4>
  <ol>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-pre-upgrade-preparation.html">&larr; Part 1: Pre-Upgrade Preparation</a></li>
    <li><span class="current">Part 2: Upgrade Testing (You Are Here)</span></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-execution.html">Part 3: Upgrade Execution &rarr;</a></li>
  </ol>
</div>
