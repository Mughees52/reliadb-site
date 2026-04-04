---
title: How to Enable Checksums in PostgreSQL
date: 2026-04-03T17:20:00.000+01:00
description: A NetApp study found 400,000+ silent data corruptions across 1.5M
  drives. Learn how to enable PostgreSQL checksums at init, on existing
  clusters, and detect corruption before it reaches your backups.
tags: []
categories:
  - postgresql
  - database-performance
read_time: 12
featured: false
---
PostgreSQL didn't protect your data with checksums by default until version 18 (September 2025). Every earlier version  including the widely deployed PostgreSQL 14, 15, and 16  ships with checksums off. That means a flipped bit on disk, a failing storage controller, or a corrupted page can sit undetected for months  until it propagates into your backups and you've lost the only clean copy.

A study by NetApp and the University of Wisconsin across 1.5 million hard drives over 41 months found more than 400,000 silent data corruptions, with over 30,000 bypassing hardware RAID detection entirely ([Bairavasundaram et al., USENIX FAST '08](https://www.usenix.org/legacy/event/fast08/tech/full_papers/bairavasundaram/bairavasundaram.pdf)). Google's Spanner team reports detecting and preventing silent data corruption events several times per week in their exabyte-scale database system ([Google, 2022](https://research.google/pubs/pub51477/)). Checksums are the only mechanism PostgreSQL provides to catch this class of failure before it does permanent damage.

This guide walks through enabling checksums at every stage  during `initdb`, on running clusters with `pg_checksums`, and verifying detection works. Every command and output shown here was executed on a fresh Ubuntu 24.04 VM running PostgreSQL 16.13, with actual terminal output captured live.

> **Key Takeaways**
> - Enable checksums with `--data-checksums` during `initdb` for zero-downtime setup on new clusters.
> - Use `pg_checksums --enable` on existing clusters  requires downtime but processes a 176 MB data directory in 0.24 seconds.
> - Checksums add roughly 1.7% TPS overhead in pgbench tests ([Command Prompt, 2019](https://www.commandprompt.com/blog/performance-postgresql-data-checksums/)).
> - PostgreSQL 18 enables checksums by default  all earlier versions require manual activation ([PostgreSQL 18 Release Notes](https://www.postgresql.org/docs/release/18.0/)).
> - PostgreSQL immediately detects and logs corrupted pages with WARNING + ERROR on read.

## What Are PostgreSQL Data Checksums?

PostgreSQL data checksums compute a 16-bit CRC over every byte of each 8 KB data page, plus the block address ([PostgreSQL Documentation](https://www.postgresql.org/docs/current/checksums.html)). The checksum is written when the page is modified and verified every time the page is read from disk. Any mismatch means the data on disk doesn't match what PostgreSQL wrote  silent corruption that would otherwise go completely unnoticed.

With 55.6% of developers now using PostgreSQL  up from 48.7% in 2024 ([Stack Overflow Developer Survey, 2025](https://survey.stackoverflow.co/2025/technology))  and deployments growing in scale, checksums aren't optional anymore. They're the minimum viable data integrity layer. PostgreSQL 18 recognized this by making checksums the default for `initdb`  the first time in PostgreSQL's 30-year history ([PostgreSQL 18 Release Notes](https://www.postgresql.org/docs/release/18.0/)).

When enabled, all checksum failures get recorded in the `pg_stat_database` view with the database name, failure count, and timestamp of the last failure. You don't need external monitoring to know corruption happened  PostgreSQL tracks it for you.

<!-- [UNIQUE INSIGHT] -->
> **Why this matters more than you think:** Silent corruption doesn't crash your database. It sits there, gets backed up, gets replicated to standbys, and eventually becomes the only version of your data. By the time you notice, your recovery options are gone. Checksums are the only way PostgreSQL can tell you "this page is wrong" before you act on bad data.

## How Do You Check If Checksums Are Already Enabled?

Before changing anything, verify your cluster's current state. On a running PostgreSQL instance, run the `SHOW` command. Here's the actual output from our test VM running PostgreSQL 16.13 on Ubuntu 24.04:

```
postgres=# SHOW data_checksums;
 data_checksums
----------------
 off
(1 row)
```

The default for PostgreSQL 16 and earlier is `off`. Ubuntu's `apt` packages and PGDG repositories ship with checksums disabled unless you explicitly opt in. PostgreSQL 18+ defaults to `on` during `initdb`, but if you upgraded from an older version, you still have whatever setting the original cluster was initialized with.

For stopped clusters, use `pg_controldata` to inspect the data directory:

```
$ /usr/lib/postgresql/16/bin/pg_controldata /var/lib/postgresql/16/main | grep -i checksum
Data page checksum version:           0
```

A checksum version of `0` means disabled. A value of `1` means enabled. There's no version `2`  it's a boolean encoded as an integer.

You can also check the `pg_stat_database` view. When checksums are off, the `checksum_failures` column returns NULL instead of a number:

```
postgres=# SELECT datname, checksum_failures, checksum_last_failure FROM pg_stat_database;
  datname  | checksum_failures | checksum_last_failure
-----------+-------------------+-----------------------
           |                   |
 postgres  |                   |
 template1 |                   |
 template0 |                   |
(4 rows)
```

Notice the empty values  not zeros, but NULLs. That's how you can distinguish "checksums enabled, zero failures" from "checksums not enabled at all."

## How Do You Enable Checksums During initdb?

The cleanest approach is enabling checksums when you first create the cluster. Add `--data-checksums` (or the short flag `-k`) to your `initdb` command. Here's the full output from our test:

```
$ /usr/lib/postgresql/16/bin/initdb --data-checksums -D /tmp/pg_checksum_test
The files belonging to this database system will be owned by user "postgres".
This user must also own the server process.

The database cluster will be initialized with locale "C.UTF-8".
The default database encoding has accordingly been set to "UTF8".
The default text search configuration will be set to "english".

Data page checksums are enabled.

creating directory /tmp/pg_checksum_test ... ok
creating subdirectories ... ok
selecting dynamic shared memory implementation ... posix
selecting default max_connections ... 100
selecting default shared_buffers ... 128MB
selecting default time zone ... Europe/London
creating configuration files ... ok
running bootstrap script ... ok
performing post-bootstrap initialization ... ok
syncing data to disk ... ok
```

The line "Data page checksums are enabled" confirms it worked. Verify with `pg_controldata`:

```
$ /usr/lib/postgresql/16/bin/pg_controldata /tmp/pg_checksum_test | grep -i checksum
Data page checksum version:           1
```

Version `1`  checksums are active. This is the recommended path for all new clusters. There's zero downtime involved, the initialization takes the same amount of time, and you're protected from the first write.

<!-- [PERSONAL EXPERIENCE] -->
> **Our recommendation:** Every `initdb` command in production should include `--data-checksums`. We've never encountered a workload where the performance cost (covered below) justified leaving corruption undetected. If you're using configuration management (Ansible, Puppet, Chef), add the flag to your `initdb` templates now.

## How Do You Enable Checksums on an Existing Cluster?

Most DBAs don't get to start fresh. If your cluster already has data, the `pg_checksums` utility can enable checksums after the fact  but it requires the database to be fully stopped. No connections, no background processes, no WAL writer.

Here's the complete workflow we ran on our test cluster:

### Step 1: Stop PostgreSQL

```
$ sudo systemctl stop postgresql
$ sudo systemctl status postgresql --no-pager | head -3
○ postgresql.service - PostgreSQL RDBMS
     Loaded: loaded (/usr/lib/systemd/system/postgresql.service; enabled; preset: enabled)
     Active: inactive (dead) since Fri 2026-04-03 13:26:29 BST; 6s ago
```

### Step 2: Verify Checksums Are Currently Disabled

Running `pg_checksums --check` on a cluster without checksums gives a clear error:

```
$ /usr/lib/postgresql/16/bin/pg_checksums --check -D /var/lib/postgresql/16/main
pg_checksums: error: data checksums are not enabled in cluster
```

This confirms you can't verify what doesn't exist. You must enable first, then check.

### Step 3: Enable Checksums

```
$ /usr/lib/postgresql/16/bin/pg_checksums --enable -D /var/lib/postgresql/16/main
Checksum operation completed
Files scanned:   948
Blocks scanned:  2820
Files written:  780
Blocks written: 2820
pg_checksums: syncing data directory
pg_checksums: updating control file
Checksums enabled in cluster
```

Every data page in the cluster was scanned, checksummed, and rewritten. For this 22 MB data directory, it took under a second. On a 176 MB dataset (after loading pgbench data), the `--progress` flag showed:

```
$ time /usr/lib/postgresql/16/bin/pg_checksums --enable --progress -D /var/lib/postgresql/16/main
14/176 MB (8%) computed
176/176 MB (100%) computed
Checksum operation completed
Files scanned:   968
Blocks scanned:  22597
Files written:  16
Blocks written: 17332
pg_checksums: syncing data directory
pg_checksums: updating control file
Checksums enabled in cluster

real    0m0.242s
user    0m0.016s
sys     0m0.070s
```

176 MB in 0.24 seconds. But don't extrapolate linearly  disk I/O becomes the bottleneck on multi-terabyte databases. The `--progress` flag is essential for large clusters so you can estimate remaining time.

### Step 4: Start PostgreSQL and Verify

```
$ sudo systemctl start postgresql
postgres=# SHOW data_checksums;
 data_checksums
----------------
 on
(1 row)
```

Now `pg_stat_database` shows zeros instead of NULLs:

```
postgres=# SELECT datname, checksum_failures, checksum_last_failure FROM pg_stat_database;
  datname  | checksum_failures | checksum_last_failure
-----------+-------------------+-----------------------
           |                 0 |
 postgres  |                 0 |
 template1 |                 0 |
 template0 |                 0 |
(4 rows)
```

Those zeros mean "checksums are active, no failures detected." That's the healthy state you want.

According to a 2019 Command Prompt benchmark, PostgreSQL data checksums impose roughly a 2% CPU overhead in typical workloads, with negligible impact when shared_buffers hit ratios are high ([Command Prompt, 2019](https://www.commandprompt.com/blog/performance-postgresql-data-checksums/)). One managed hosting provider measured approximately 3% lower TPS and 1.4% higher latency even under pure-select traffic ([Hosted Power, 2025](https://www.hosted-power.com/en/blog/postgresql-checksums-performance)).

## How Do You Verify Checksums Offline?

With checksums enabled, `pg_checksums --check` scans every data page and reports mismatches. The database must be stopped:

```
$ /usr/lib/postgresql/16/bin/pg_checksums --check -D /var/lib/postgresql/16/main
Checksum operation completed
Files scanned:   948
Blocks scanned:  2820
Bad checksums:  0
Data checksum version: 1
```

Zero bad checksums  your data directory is clean. Run this as part of your maintenance routine, especially before taking base backups with `pg_basebackup`. A corrupt page that makes it into your backup defeats the purpose of having backups at all.

What does a failure look like? We simulated corruption by writing random bytes to a data file to show you exactly what PostgreSQL reports.

## What Happens When PostgreSQL Detects Corruption?

We deliberately corrupted a single 8 KB page in a test table to demonstrate the full detection chain. This isn't theoretical  these are the actual commands and outputs from our test VM.

### Simulating Corruption

First, we created a table with 1,000 rows and located its physical file:

```
postgres=# CREATE TABLE checksum_test (id serial PRIMARY KEY, data text);
postgres=# INSERT INTO checksum_test (data) SELECT md5(random()::text) FROM generate_series(1, 1000);
postgres=# SELECT pg_relation_filepath('checksum_test');
 pg_relation_filepath
----------------------
 base/5/16385
```

Then we stopped PostgreSQL and wrote random bytes to block 1 of that file:

```
$ sudo systemctl stop postgresql
$ dd if=/dev/urandom of=/var/lib/postgresql/16/main/base/5/16385 bs=8192 count=1 conv=notrunc seek=1
1+0 records in
1+0 records out
8192 bytes (8.2 kB, 8.0 KiB) copied, 4.8087e-05 s, 170 MB/s
```

### Offline Detection with pg_checksums

```
$ /usr/lib/postgresql/16/bin/pg_checksums --check -D /var/lib/postgresql/16/main
pg_checksums: error: checksum verification failed in file "/var/lib/postgresql/16/main/base/5/16385", block 1: calculated checksum B2C7 but block contains 11C7
Checksum operation completed
Files scanned:   954
Blocks scanned:  2845
Bad checksums:  1
Data checksum version: 1
```

The output tells you exactly which file and block is corrupted, what the expected checksum was (`B2C7`), and what the page actually contained (`11C7`). One bad checksum out of 2,845 blocks scanned.

### Online Detection During Queries

After starting PostgreSQL, a query that reads the corrupted page immediately fails:

```
postgres=# SELECT count(*) FROM checksum_test;
WARNING:  page verification failed, calculated checksum 45767 but expected 4551
ERROR:  invalid page in block 1 of relation base/5/16385
```

PostgreSQL refuses to return data from a corrupted page. It doesn't silently give you garbage  it stops and tells you. The PostgreSQL logs recorded the same event:

```
2026-04-03 13:27:27.019 BST [4874] postgres@postgres WARNING:  page verification failed, calculated checksum 45767 but expected 4551
2026-04-03 13:27:27.019 BST [4874] postgres@postgres ERROR:  invalid page in block 1 of relation base/5/16385
2026-04-03 13:27:27.019 BST [4874] postgres@postgres STATEMENT:  SET enable_seqscan = on; SELECT count(*) FROM checksum_test;
```

And `pg_stat_database` updated to record the failure:

```
postgres=# SELECT datname, checksum_failures, checksum_last_failure FROM pg_stat_database WHERE datname = current_database();
 datname  | checksum_failures |     checksum_last_failure
----------+-------------------+-------------------------------
 postgres |                 1 | 2026-04-03 13:27:27.019345+01
```

The Facebook/Meta infrastructure team tested hundreds of thousands of machines over 18+ months and found hundreds of faulty CPUs causing silent data corruption  a systemic issue across CPU generations ([Meta, 2021](https://arxiv.org/abs/2102.11245)). Google's Spanner team detects and prevents corruption events several times per week at exabyte scale ([Google, 2022](https://research.google/pubs/pub51477/)). Alibaba Cloud observed CPUs giving wrong checksum calculation results, misleading applications and triggering repeated requests ([ACM TACO, 2024](https://dl.acm.org/doi/10.1145/3690825)). Without checksums, this kind of corruption propagates silently through your reads and writes.

<figure>
<svg viewBox="0 0 560 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lollipop chart showing silent data corruption findings by organization">
<rect width="560" height="300" fill="transparent" rx="12"/>
<text x="280" y="28" text-anchor="middle" fill="#e2e8f0" font-size="15" font-weight="600">Silent Data Corruption: Real-World Findings</text>
<line x1="160" y1="55" x2="160" y2="240" stroke="#334155" stroke-width="1"/>
<line x1="160" y1="240" x2="520" y2="240" stroke="#334155" stroke-width="1"/>
<text x="150" y="80" text-anchor="end" fill="#94a3b8" font-size="11">NetApp</text>
<line x1="160" y1="76" x2="500" y2="76" stroke="#3b82f6" stroke-width="2" opacity="0.6"/>
<circle cx="500" cy="76" r="6" fill="#3b82f6"/>
<text x="508" y="80" fill="#93c5fd" font-size="10">400K+ corruptions</text>
<text x="150" y="115" text-anchor="end" fill="#94a3b8" font-size="11">CERN</text>
<line x1="160" y1="111" x2="340" y2="111" stroke="#f59e0b" stroke-width="2" opacity="0.6"/>
<circle cx="340" cy="111" r="6" fill="#f59e0b"/>
<text x="348" y="115" fill="#fcd34d" font-size="10">128 MB corrupted / 97 PB</text>
<text x="150" y="150" text-anchor="end" fill="#94a3b8" font-size="11">Meta</text>
<line x1="160" y1="146" x2="380" y2="146" stroke="#ef4444" stroke-width="2" opacity="0.6"/>
<circle cx="380" cy="146" r="6" fill="#ef4444"/>
<text x="388" y="150" fill="#fca5a5" font-size="10">100s of faulty CPUs found</text>
<text x="150" y="185" text-anchor="end" fill="#94a3b8" font-size="11">Google</text>
<line x1="160" y1="181" x2="420" y2="181" stroke="#10b981" stroke-width="2" opacity="0.6"/>
<circle cx="420" cy="181" r="6" fill="#10b981"/>
<text x="428" y="185" fill="#6ee7b7" font-size="10">Multiple events/week at EB scale</text>
<text x="150" y="220" text-anchor="end" fill="#94a3b8" font-size="11">Alibaba</text>
<line x1="160" y1="216" x2="300" y2="216" stroke="#a855f7" stroke-width="2" opacity="0.6"/>
<circle cx="300" cy="216" r="6" fill="#a855f7"/>
<text x="308" y="220" fill="#c4b5fd" font-size="10">Wrong checksum calcs from CPUs</text>
<text x="340" y="270" text-anchor="middle" fill="#64748b" font-size="10">Sources: USENIX FAST '08, CERN 2007, Meta 2021, Google 2022, ACM TACO 2024</text>
</svg>
<figcaption>Source: Multiple research studies, 2007-2024</figcaption>
</figure>

<!-- [ORIGINAL DATA] -->
> **Our test environment:** Ubuntu 24.04 LTS, PostgreSQL 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1), 2 vCPUs, 2 GB RAM, running on Multipass 1.15.1. Every command and output in this article was captured from a live test session, not reconstructed from documentation.

## What's the Real Performance Cost of Checksums?

We ran `pgbench` on our test VM with identical settings  4 clients, 2 threads, 10-second duration, scale factor 10 (1 million rows)  first with checksums on, then off.

**With checksums enabled:**

```
pgbench (16.13 (Ubuntu 16.13-0ubuntu0.24.04.1))
transaction type: <builtin: TPC-B (sort of)>
scaling factor: 10
number of clients: 4
number of threads: 2
duration: 10 s
number of transactions actually processed: 47639
latency average = 0.840 ms
tps = 4762.703133 (without initial connection time)
```

**Without checksums:**

```
pgbench (16.13 (Ubuntu 16.13-0ubuntu0.24.04.1))
transaction type: <builtin: TPC-B (sort of)>
scaling factor: 10
number of clients: 4
number of threads: 2
duration: 10 s
number of transactions actually processed: 48444
latency average = 0.826 ms
tps = 4844.214467 (without initial connection time)
```

<figure>
<svg viewBox="0 0 560 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bar chart comparing PostgreSQL TPS with and without data checksums enabled">
<rect width="560" height="320" fill="transparent" rx="12"/>
<text x="280" y="30" text-anchor="middle" fill="#e2e8f0" font-size="15" font-weight="600">pgbench TPS: Checksums On vs Off</text>
<rect x="100" y="60" width="380" height="1" fill="#334155"/>
<rect x="100" y="260" width="380" height="1" fill="#334155"/>
<rect x="100" y="160" width="380" height="1" fill="#334155" opacity="0.5"/>
<text x="90" y="65" text-anchor="end" fill="#94a3b8" font-size="11">5000</text>
<text x="90" y="165" text-anchor="end" fill="#94a3b8" font-size="11">4500</text>
<text x="90" y="265" text-anchor="end" fill="#94a3b8" font-size="11">4000</text>
<rect x="160" y="87" width="100" height="173" fill="#3b82f6" rx="4" opacity="0.9"/>
<text x="210" y="80" text-anchor="middle" fill="#93c5fd" font-size="13" font-weight="600">4,763</text>
<text x="210" y="290" text-anchor="middle" fill="#94a3b8" font-size="12">Checksums ON</text>
<rect x="310" y="76" width="100" height="184" fill="#10b981" rx="4" opacity="0.9"/>
<text x="360" y="69" text-anchor="middle" fill="#6ee7b7" font-size="13" font-weight="600">4,844</text>
<text x="360" y="290" text-anchor="middle" fill="#94a3b8" font-size="12">Checksums OFF</text>
<text x="280" y="312" text-anchor="middle" fill="#64748b" font-size="10">Source: pgbench, PostgreSQL 16.13, Ubuntu 24.04, Multipass VM (2 vCPU, 2 GB RAM)</text>
</svg>
<figcaption>Source: pgbench benchmark, PostgreSQL 16.13, 2026</figcaption>
</figure>

The difference? **81 TPS, or 1.7%**. Latency increased by 0.014 ms. On a 2 vCPU VM with 2 GB RAM and virtual disk I/O, the overhead is barely measurable. On production hardware with NVMe drives and hardware CRC acceleration, Intel's AVX-512 implementation shows 2.2x to 8.1x speedup for CRC32C operations ([Intel, 2024](https://community.intel.com/t5/Blogs/Tech-Innovation/Data-Center/Intel-AVX-512-Accelerates-PostgreSQL-CRC32C-Checksums/post/1726023)).

Is 1.7% worth catching corruption that could destroy your entire dataset? That's not a real question.

## How Do You Disable Checksums?

You might need to disable checksums during a major migration or to match a vendor's configuration. The process is fast  no full scan required  but the database must be stopped:

```
$ /usr/lib/postgresql/16/bin/pg_checksums --disable -D /var/lib/postgresql/16/main
pg_checksums: syncing data directory
pg_checksums: updating control file
Checksums disabled in cluster
```

Verification:

```
$ /usr/lib/postgresql/16/bin/pg_controldata /var/lib/postgresql/16/main | grep -i checksum
Data page checksum version:           0
```

Disabling is nearly instant because it only updates the control file  it doesn't rewrite data pages. But think carefully before doing this. Once disabled, you lose all corruption detection until you re-enable and rescan.

## How Do You Monitor Checksums in Production?

Set up alerting on `pg_stat_database.checksum_failures`. Any non-zero value demands investigation:

```sql
SELECT datname, checksum_failures, checksum_last_failure
FROM pg_stat_database
WHERE checksum_failures > 0;
```

Wire this into your monitoring stack (Prometheus + postgres_exporter, Zabbix, Datadog, or even a cron job). A single checksum failure could indicate a dying disk, a faulty controller, or memory corruption.

For periodic offline verification, schedule `pg_checksums --check` during maintenance windows. You can't run it on a live database, but it's a thorough scan that catches corruption PostgreSQL hasn't read yet:

```
$ /usr/lib/postgresql/16/bin/pg_checksums --check -D /var/lib/postgresql/16/main
Checksum operation completed
Files scanned:   948
Blocks scanned:  2820
Bad checksums:  0
Data checksum version: 1
```

CERN found that over six months, approximately 128 MB of data across 97 petabytes became permanently corrupted silently in their storage pathway ([CERN/Bernd Panzer-Steindel, 2007](https://indico.cern.ch/event/13797/contributions/1362288/attachments/115080/163419/Data_integrity_v3.pdf)). At database scale, that's enough to lose rows, corrupt indexes, or break foreign key relationships  all without a single error in your logs unless checksums are enabled.

## Can You Enable Checksums Without Downtime?

The standard `pg_checksums` tool requires the database to be stopped. For large databases, this means hours of downtime. There are community approaches to work around this:

PostgresAI documents an approach using `pg_catalog` manipulation on a logical replica  you enable checksums on a standby, let replication catch up, then failover ([PostgresAI, 2023](https://postgres.ai/docs/postgres-howtos/database-administration/maintenance/how-to-enable-data-checksums-without-downtime)). The idea: instead of taking your primary offline, you build a checksummed replica and promote it.

The general workflow:

1. Create a streaming replica of your primary
2. Stop the replica
3. Run `pg_checksums --enable` on the replica's data directory
4. Start the replica and let it catch up
5. Perform a controlled failover (switchover) to the checksummed replica

This avoids downtime on the primary, but you're still planning a failover event. It's not transparent to the application.

PostgreSQL 18 made checksums the default for new clusters, but the standard `pg_checksums` tool still requires a stopped cluster to enable on existing data directories. If you're upgrading to PostgreSQL 18 via `pg_upgrade`, your existing checksum setting carries forward  you don't automatically get checksums just because version 18 defaults to them.

## Frequently Asked Questions

### Do checksums protect against all types of corruption?

No. Checksums detect corruption in data pages on disk  bit flips, storage failures, and I/O errors. They don't protect against logical corruption like bad application queries, bugs in extensions, or in-memory corruption. A NetApp study found over 400,000 silent disk corruptions across 1.5 million drives, and checksums catch exactly that class of failure ([Bairavasundaram et al., USENIX FAST '08](https://www.usenix.org/legacy/event/fast08/tech/full_papers/bairavasundaram/bairavasundaram.pdf)).

### How long does pg_checksums take on a large database?

It depends on data directory size and disk speed. In our test, 176 MB took 0.24 seconds. Command Prompt's 2019 benchmark showed roughly linear scaling  expect approximately 1 GB per second on modern NVMe storage ([Command Prompt, 2019](https://www.commandprompt.com/blog/performance-postgresql-data-checksums/)). A 1 TB database could take 15-20 minutes on spinning disks.

### Can I enable checksums on a replica without affecting the primary?

Yes. Stop the replica, run `pg_checksums --enable` on the replica's data directory, then restart it. Replication will continue normally. This is a common strategy for testing the performance impact before committing to enabling on the primary.

### Do managed PostgreSQL services like RDS enable checksums by default?

AWS RDS for PostgreSQL enables checksums by default on all instances. Azure Database for PostgreSQL also enables them. For self-managed PostgreSQL 17 and earlier, you need to enable them yourself. PostgreSQL 18+ defaults to checksums during `initdb`, but upgraded clusters keep whatever setting they were initialized with ([PostgreSQL 18 Release Notes](https://www.postgresql.org/docs/release/18.0/)).

### Does pg_basebackup preserve the checksum setting?

Yes. `pg_basebackup` creates a byte-for-byte copy of the data directory, including the control file that stores the checksum version. A backup of a checksummed cluster produces a checksummed backup. That's precisely why you want checksums enabled before your backup strategy kicks in.

## Conclusion

Data checksums in PostgreSQL cost you roughly 1.7% TPS and give you the ability to detect silent corruption before it becomes permanent. There's no configuration to tune, no extension to install, and no application changes required. You either run `--data-checksums` at `initdb` or run `pg_checksums --enable` on your existing cluster.

- Enable checksums on every new cluster with `initdb --data-checksums`
- Enable on existing clusters with `pg_checksums --enable` (requires downtime)
- Monitor `pg_stat_database.checksum_failures`  any non-zero value needs investigation
- Run `pg_checksums --check` before base backups to catch unread corruption
- The performance overhead is 1-3% in real workloads  negligible compared to undetected data loss

If you're running PostgreSQL in production without checksums, you're trusting that your storage hardware, controllers, and firmware will never corrupt a single byte. The research says otherwise.
