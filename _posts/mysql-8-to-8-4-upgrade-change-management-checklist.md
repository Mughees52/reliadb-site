---
title: "MySQL 8.0 to 8.4 LTS Upgrade Guide — Part 5: Change Management, Troubleshooting, and Complete Checklist"
date: 2026-04-06T14:00:00.000Z
description: "Complete MySQL 8.4 upgrade checklist with 41 items, 8 common troubleshooting scenarios, project timeline estimates, and change management templates for production upgrades."
categories:
  - mysql
  - mysql-upgrade
read_time: 15
featured: false
coverImage: "/images/blog/mysql-8-to-8-4-upgrade-change-management-checklist.jpg"
---

<div class="series-nav">
  <h4>MySQL 8.0 to 8.4 LTS Upgrade Guide &mdash; 5-Part Series</h4>
  <ol>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-pre-upgrade-preparation.html">Part 1: Pre-Upgrade Preparation</a></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-testing.html">Part 2: Upgrade Testing</a></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-execution.html">Part 3: Upgrade Execution</a></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-rollback-validation.html">Part 4: Rollback and Post-Upgrade Validation</a></li>
    <li><span class="current">Part 5: Change Management, Troubleshooting, and Checklist (You Are Here)</span></li>
  </ol>
</div>

A major version upgrade is not just a technical task. Proper change management ensures organizational readiness and reduces risk. This final part covers the operational planning, common pitfalls you'll encounter, and the complete 41-item checklist to track your progress.

<h2 id="change-ticket">Change Ticket Requirements</h2>

Your change ticket (ServiceNow, Jira, or equivalent) should include:

- **Change description:** MySQL major version upgrade from 8.0.37 to 8.4 LTS
- **Business justification:** MySQL 8.0 EOL (April 6, 2026), security patching requirement
- **Risk assessment:** Major version upgrade with potential for application compatibility issues
- **Impact assessment:** Expected downtime window, affected applications, affected users
- **Rollback plan:** Detailed steps with estimated rollback duration
- **Go/No-Go criteria:** Checklist of conditions that must be met before proceeding
- **Communication plan:** Who to notify before, during, and after the upgrade

<h2 id="go-nogo">Go / No-Go Criteria</h2>

Define clear criteria before entering the maintenance window. If any criterion is not met, postpone the upgrade.

<table>
  <thead>
    <tr><th>Criterion</th><th>Required State</th><th>Checked By</th></tr>
  </thead>
  <tbody>
    <tr><td>Backups completed and verified</td><td>Logical + Physical backup, restore tested</td><td>DBA</td></tr>
    <tr><td>Upgrade Checker errors resolved</td><td>Zero errors, warnings reviewed</td><td>DBA</td></tr>
    <tr><td>pt-upgrade testing completed</td><td>No critical query failures</td><td>DBA</td></tr>
    <tr><td>Staging dry-run successful</td><td>Full procedure validated</td><td>DBA</td></tr>
    <tr><td>Application team sign-off</td><td>App testing passed on staging</td><td>App Team Lead</td></tr>
    <tr><td>Rollback procedure tested</td><td>Restore tested with time estimate</td><td>DBA</td></tr>
    <tr><td>Monitoring dashboards ready</td><td>PMM/Grafana configured for 8.4</td><td>DBA / SRE</td></tr>
    <tr><td>Stakeholders notified</td><td>Change window communicated</td><td>Change Manager</td></tr>
  </tbody>
</table>

<h2 id="maintenance-monitoring">Maintenance Window Monitoring</h2>

During the cutover window, monitor these metrics in real-time:

- **Replication lag** (`Seconds_Behind_Source`) on all replicas
- **Active connections count** (`SHOW PROCESSLIST` or performance_schema)
- **Error log** (`tail -f /var/log/mysql/mysqld.log`)
- **Application error rates** from your APM tool
- **Query latency** (p50, p95, p99) from slow query log or PMM
- **InnoDB buffer pool hit ratio** and I/O metrics

<h2 id="communication">Communication Template</h2>

Send notifications at these milestones:

- **Pre-upgrade (1 week before):** Scheduled maintenance notification with date, time, expected duration, and affected services
- **Maintenance start:** "Maintenance window has begun. [Service] may experience brief connectivity interruptions."
- **Cutover complete:** "Database upgrade complete. Services restored. Monitoring for stability."
- **All-clear (24-48 hours later):** "Upgrade verified stable. Maintenance window closed."

<h2 id="project-timeline">Full Upgrade Project Timeline</h2>

Actual times vary significantly based on data size, complexity, team experience, and hardware. The estimates below are based on real-world upgrade projects.

<table>
  <thead>
    <tr><th>Phase</th><th>Activity</th><th>Estimated Hours</th></tr>
  </thead>
  <tbody>
    <tr><td>1. Test Env Setup</td><td>Restore 2 instances from production backup</td><td>15-20</td></tr>
    <tr><td>2. Upgrade Testing</td><td>Slow log collection, pt-upgrade RO/RW tests, analysis, upgrade checker</td><td>20-25</td></tr>
    <tr><td>3. Fix Issues</td><td>Remediate all errors and warnings</td><td>5-15</td></tr>
    <tr><td>4. Staging Dry-Run</td><td>Complete upgrade procedure on staging</td><td>8-12</td></tr>
    <tr><td>5. Architecture Setup</td><td>Restore 8.4 from fresh backup, setup replication, monitoring</td><td>20-25</td></tr>
    <tr><td>6. Cutover</td><td>Cutover planning and execution</td><td>5-10</td></tr>
    <tr><td>7. Post-Upgrade Monitoring</td><td>Monitor production for stability</td><td>8-16</td></tr>
    <tr><td colspan="2"><strong>TOTAL</strong></td><td><strong>81-123</strong></td></tr>
  </tbody>
</table>

<h2 id="time-by-size">Time Estimates by Data Size</h2>

The most variable component is backup/restore time, which is heavily dependent on data size:

<table>
  <thead>
    <tr><th>Database Size</th><th>Logical Backup</th><th>Logical Restore</th><th>XtraBackup</th><th>XtraBackup Restore</th></tr>
  </thead>
  <tbody>
    <tr><td>&lt; 100 GB</td><td>30-60 min</td><td>1-2 hours</td><td>15-30 min</td><td>15-30 min</td></tr>
    <tr><td>100 GB - 1 TB</td><td>1-4 hours</td><td>4-12 hours</td><td>30-90 min</td><td>30-90 min</td></tr>
    <tr><td>1 TB - 5 TB</td><td>4-12 hours</td><td>12-36 hours</td><td>1-4 hours</td><td>1-4 hours</td></tr>
    <tr><td>5 TB - 10 TB+</td><td>12-24+ hours</td><td>24-72+ hours</td><td>4-12+ hours</td><td>4-12+ hours</td></tr>
  </tbody>
</table>

<div class="callout-warning">
  <p><strong>WARNING:</strong> For datasets over 5TB, the rollback window using logical backup restore can exceed 24 hours. This makes the replication-based upgrade approach essential, not optional, for large production databases.</p>
</div>

<h2 id="simplified-timeline">Simplified Timeline (Skipping pt-upgrade)</h2>

If hardware constraints prevent a full compatibility test, the project can be reduced to 40-60 hours. This carries significantly higher risk:

<table>
  <thead>
    <tr><th>Phase</th><th>Estimated Hours</th></tr>
  </thead>
  <tbody>
    <tr><td>Pre-upgrade checks and preparation</td><td>8-12</td></tr>
    <tr><td>Staging dry-run</td><td>5-8</td></tr>
    <tr><td>Upgrade execution</td><td>5-15</td></tr>
    <tr><td>Application testing (customer-led)</td><td>10-20</td></tr>
    <tr><td>Cutover</td><td>5-10</td></tr>
    <tr><td><strong>TOTAL</strong></td><td><strong>33-65</strong></td></tr>
  </tbody>
</table>

<div class="callout-danger">
  <p><strong>CRITICAL:</strong> Skipping pt-upgrade testing means you're accepting the risk that queries may fail or return wrong results in production. For large datasets, this risk includes a rollback that could take 10-20+ hours. This decision must be explicitly acknowledged by stakeholders.</p>
</div>

<h2 id="troubleshooting">Common Pitfalls and Troubleshooting</h2>

<h3 id="pitfall-removed-params">Server Refuses to Start: Removed Parameters in my.cnf</h3>

**Symptom:** mysqld fails to start with "unknown variable" or "unknown option" errors.

**Cause:** Removed parameters (`default_authentication_plugin`, `master_info_repository`, etc.) still present in `my.cnf`.

**Solution:** Remove all parameters listed in [Part 1, Removed Parameters](/blog/mysql-8-to-8-4-upgrade-pre-upgrade-preparation.html#removed-parameters). Check the error log for the specific parameter name causing the failure.

<h3 id="pitfall-redo-log">Redo Log Incompatibility</h3>

**Symptom:** "This redo log was created with MySQL 8.0.x and it appears logically non empty."

**Cause:** MySQL was shut down with `innodb_fast_shutdown = 2` or crashed before upgrade.

<div class="callout-danger">
  <p><strong>CRITICAL:</strong> Do NOT delete redo log files. This causes data loss. You MUST restore from backup.</p>
</div>

**Prevention:** Always set `innodb_fast_shutdown = 0` and perform a clean shutdown before any upgrade.

<h3 id="pitfall-data-dir">Data Directory Deleted on Debian/Ubuntu</h3>

**Symptom:** `/var/lib/mysql` is empty or missing after removing MySQL 8.0 packages.

**Cause:** Used `apt-get purge` instead of `apt-get remove`. Purge removes data directories.

**Solution:** Restore from your pre-upgrade backup. **Prevention:** ALWAYS use `apt-get remove`, never `apt-get purge`.

<h3 id="pitfall-auth">Authentication Failures After Upgrade</h3>

**Symptom:** Applications or users cannot connect after upgrading to 8.4.

**Cause:** `mysql_native_password` plugin is removed in 8.4.

**Immediate fix:** Add `mysql_native_password=ON` to `my.cnf` and restart MySQL. Then migrate users per [Part 1, Authentication Migration](/blog/mysql-8-to-8-4-upgrade-pre-upgrade-preparation.html#auth-migration).

<h3 id="pitfall-innodb">InnoDB Storage Engine Error for System Tables</h3>

**Symptom:** Error 1726 "Storage engine InnoDB Does Not Support System Tables."

**Cause:** `my.cnf` forces `default_storage_engine = MyISAM`. System tables require InnoDB.

**Solution:** Remove `default_storage_engine = MyISAM` from `my.cnf`, or set it to InnoDB.

<h3 id="pitfall-plugins">Deprecated Plugin Errors</h3>

**Symptom:** Errors referencing missing shared libraries (e.g., `query_response_time.so`).

**Cause:** Percona-specific plugins from older versions registered in the data dictionary.

**Solution:**

```sql
DELETE FROM mysql.plugin WHERE name = 'QUERY_RESPONSE_TIME';
DELETE FROM mysql.plugin WHERE name = 'SCALABILITY_METRICS';
```

<h3 id="pitfall-sqlmode">Query Failures from sql_mode Changes</h3>

**Symptom:** Queries that worked in 8.0 return errors like "Expression #N of SELECT list is not in GROUP BY clause."

**Cause:** `ONLY_FULL_GROUP_BY` is enforced in 8.4 default `sql_mode`.

**Immediate fix:** Set `sql_mode` explicitly in `my.cnf` to match your 8.0 mode. **Long-term fix:** Rewrite queries to comply with `ONLY_FULL_GROUP_BY`.

<h3 id="pitfall-views">View and Routine Warnings</h3>

**Symptom:** "View is no more valid to use" warnings in the error log.

**Cause:** Views or stored routines reference deprecated syntax or changed objects.

**Solution:** Identify affected views with `CHECK TABLE`, then recreate them.

<div class="post-cta-inline">
  <h4>Want ReliaDB to handle the entire upgrade?</h4>
  <p>From pre-upgrade preparation through post-upgrade monitoring, our DBA team has executed MySQL major version upgrades for production databases up to 10TB+. Book a free assessment to discuss your upgrade.</p>
  <a href="/contact.html" class="btn">Book Free Assessment &rarr;</a>
</div>

<h2 id="complete-checklist">Complete Upgrade Checklist (41 Items)</h2>

Use this checklist to track progress through each phase of the upgrade.

<h3>Pre-Upgrade Preparation</h3>

<table>
  <thead><tr><th>#</th><th>Task</th><th>Owner</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>Take full logical backup (mysqldump/mydumper) and verify restore</td><td>DBA</td></tr>
    <tr><td>2</td><td>Take full physical backup (XtraBackup/LVM snapshot) and verify restore</td><td>DBA</td></tr>
    <tr><td>3</td><td>Verify sufficient disk space (2.5x datadir free)</td><td>DBA</td></tr>
    <tr><td>4</td><td>Run mysqlcheck --all-databases --check for corruption</td><td>DBA</td></tr>
    <tr><td>5</td><td>Run MySQL Shell Upgrade Checker targeting 8.4.8</td><td>DBA</td></tr>
    <tr><td>6</td><td>Resolve all Upgrade Checker ERRORS</td><td>DBA</td></tr>
    <tr><td>7</td><td>Address all Upgrade Checker WARNINGS</td><td>DBA</td></tr>
    <tr><td>8</td><td>Identify and migrate mysql_native_password users (or plan transitional)</td><td>DBA</td></tr>
    <tr><td>9</td><td>Identify and fix AUTO_INCREMENT on FLOAT/DOUBLE columns</td><td>DBA</td></tr>
    <tr><td>10</td><td>Audit my.cnf: remove all deprecated/removed parameters</td><td>DBA</td></tr>
    <tr><td>11</td><td>Set explicit values for parameters with changed defaults</td><td>DBA</td></tr>
    <tr><td>12</td><td>Review and fix sql_mode-dependent queries (GROUP BY, zero dates)</td><td>DBA / Dev</td></tr>
    <tr><td>13</td><td>Audit all scripts/code for MASTER/SLAVE syntax</td><td>DBA / Dev</td></tr>
    <tr><td>14</td><td>Upgrade ProxySQL to 2.5.4+ (if applicable)</td><td>DBA</td></tr>
    <tr><td>15</td><td>Test auth chain through ProxySQL in staging (if applicable)</td><td>DBA</td></tr>
    <tr><td>16</td><td>Verify all tool versions are 8.4-compatible (PMM, XtraBackup, etc.)</td><td>DBA</td></tr>
  </tbody>
</table>

<h3>Testing</h3>

<table>
  <thead><tr><th>#</th><th>Task</th><th>Owner</th></tr></thead>
  <tbody>
    <tr><td>17</td><td>Set up test environment (8.0 baseline + 8.4 target)</td><td>DBA</td></tr>
    <tr><td>18</td><td>Collect slow query log from production (1-3 hours peak)</td><td>DBA</td></tr>
    <tr><td>19</td><td>Run pt-upgrade read-only test and analyze results</td><td>DBA</td></tr>
    <tr><td>20</td><td>Run pt-upgrade read-write test and analyze results</td><td>DBA</td></tr>
    <tr><td>21</td><td>Run application test suites against 8.4 test instance</td><td>App Team</td></tr>
    <tr><td>22</td><td>Load test 8.4 instance and compare performance</td><td>DBA / QA</td></tr>
    <tr><td>23</td><td>Complete full dry-run upgrade on staging</td><td>DBA</td></tr>
    <tr><td>24</td><td>Canary test with partial traffic (optional)</td><td>DBA / SRE</td></tr>
  </tbody>
</table>

<h3>Change Management</h3>

<table>
  <thead><tr><th>#</th><th>Task</th><th>Owner</th></tr></thead>
  <tbody>
    <tr><td>25</td><td>Create and approve change ticket</td><td>DBA / Manager</td></tr>
    <tr><td>26</td><td>Schedule maintenance window with stakeholders</td><td>Change Mgr</td></tr>
    <tr><td>27</td><td>Send pre-upgrade notification (1 week prior)</td><td>DBA</td></tr>
    <tr><td>28</td><td>Confirm Go/No-Go criteria met</td><td>All</td></tr>
  </tbody>
</table>

<h3>Execution</h3>

<table>
  <thead><tr><th>#</th><th>Task</th><th>Owner</th></tr></thead>
  <tbody>
    <tr><td>29</td><td>Take final pre-upgrade backup</td><td>DBA</td></tr>
    <tr><td>30</td><td>Execute upgrade (replication-based, rolling, or in-place)</td><td>DBA</td></tr>
    <tr><td>31</td><td>Verify MySQL 8.4 starts and runs without errors</td><td>DBA</td></tr>
  </tbody>
</table>

<h3>Post-Upgrade Validation</h3>

<table>
  <thead><tr><th>#</th><th>Task</th><th>Owner</th></tr></thead>
  <tbody>
    <tr><td>32</td><td>Verify version: SELECT VERSION()</td><td>DBA</td></tr>
    <tr><td>33</td><td>Review error log for warnings</td><td>DBA</td></tr>
    <tr><td>34</td><td>Run mysqlcheck on all databases</td><td>DBA</td></tr>
    <tr><td>35</td><td>Run ANALYZE TABLE on key tables</td><td>DBA</td></tr>
    <tr><td>36</td><td>Verify replication health (if applicable)</td><td>DBA</td></tr>
    <tr><td>37</td><td>Run application smoke tests</td><td>App Team</td></tr>
    <tr><td>38</td><td>Monitor performance for 24-48 hours</td><td>DBA / SRE</td></tr>
    <tr><td>39</td><td>Update monitoring, scripts, and documentation</td><td>DBA</td></tr>
    <tr><td>40</td><td>Archive pre-upgrade backups per retention policy</td><td>DBA</td></tr>
    <tr><td>41</td><td>Close change ticket with post-implementation review</td><td>DBA</td></tr>
  </tbody>
</table>

<h2 id="references">References and Resources</h2>

- [MySQL 8.4 Release Notes](https://dev.mysql.com/doc/relnotes/mysql/8.4/en/)
- [MySQL 8.4 What Is New](https://dev.mysql.com/doc/refman/8.4/en/mysql-nutshell.html)
- [MySQL Shell Upgrade Checker](https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-shell-utilities-upgrade.html)
- [Percona Toolkit (pt-upgrade)](https://docs.percona.com/percona-toolkit/pt-upgrade.html)
- [Percona Server for MySQL 8.4 Documentation](https://docs.percona.com/percona-server/8.4/)
- [ProxySQL Documentation](https://proxysql.com/documentation/)
- Percona Support Knowledge Base: MySQL Upgrades articles

<div class="callout">
  <p><strong>Series Complete!</strong> You've reached the end of the MySQL 8.0 to 8.4 LTS Upgrade Guide. With thorough preparation, testing, and a solid rollback plan, your upgrade will go smoothly. If you need hands-on help at any stage, <a href="/contact.html" style="color:#2980B9;">reach out to ReliaDB</a>.</p>
</div>

<div class="series-nav">
  <h4>Complete Series</h4>
  <ol>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-pre-upgrade-preparation.html">Part 1: Pre-Upgrade Preparation</a></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-testing.html">Part 2: Upgrade Testing</a></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-execution.html">Part 3: Upgrade Execution</a></li>
    <li><a href="/blog/mysql-8-to-8-4-upgrade-rollback-validation.html">Part 4: Rollback and Post-Upgrade Validation</a></li>
    <li><span class="current">Part 5: Change Management, Troubleshooting, and Checklist (You Are Here)</span></li>
  </ol>
</div>
