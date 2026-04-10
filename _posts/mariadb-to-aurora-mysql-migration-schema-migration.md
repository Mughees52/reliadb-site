---
title: "MariaDB 10.6 to MySQL Aurora 8.0 Migration Guide — Part 3: Schema and User Migration"
date: 2026-04-08T12:00:00.000Z
description: "Migrate schema and users from MariaDB 10.6 to Aurora MySQL 8.0. Covers mysqldump compatibility pipeline, incompatible object cleanup, index strategy for DMS, and user export with pt-show-grants."
categories:
  - mysql
  - aws-rds
read_time: 18
featured: false
author: "Mario"
---

<div class="series-nav">
  <h4>MariaDB 10.6 to MySQL Aurora 8.0 Migration Guide &mdash; 5-Part Series</h4>
  <ol>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-pre-migration-requirements.html">Part 1: Pre-Migration Requirements</a></li>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-aws-dms-infrastructure.html">Part 2: AWS DMS Infrastructure Setup</a></li>
    <li><span class="current">Part 3: Schema and User Migration (You Are Here)</span></li>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-dms-endpoints-task.html">Part 4: DMS Endpoints, Task Configuration, and Assessments</a></li>
    <li><a href="/blog/mariadb-to-aurora-mysql-migration-execution-cutover-cleanup.html">Part 5: Execution, Validation, Cutover, and Cleanup</a></li>
  </ol>
</div>

Schema migration is the most labor-intensive phase of a MariaDB to Aurora MySQL migration. AWS DMS handles data movement efficiently, but it does not convert schema objects. Tables, indexes, stored procedures, triggers, views, and user grants must be migrated manually — and the compatibility gap between MariaDB 10.6 and MySQL 8.0 syntax means a raw `mysqldump` import will fail.

This part covers the complete schema migration pipeline: exporting from MariaDB with syntax transformations applied, reviewing and cleaning incompatible objects, importing to Aurora, optimizing indexes for DMS throughput, and migrating database users.

<div class="callout-warning">
  <p><strong>Schema migration before data migration:</strong> Complete this entire part before creating DMS endpoints or running any DMS task. DMS needs the target schema — tables and primary keys — to exist before it can load data.</p>
</div>

<h2 id="compatibility-gap">The MariaDB–Aurora MySQL Compatibility Gap</h2>

MariaDB 10.6 and MySQL 8.0 share the same historical root but have diverged significantly. The main incompatibilities you'll encounter in schema dumps:

<table>
  <thead>
    <tr><th>Issue</th><th>MariaDB 10.6 Syntax</th><th>Aurora MySQL 8.0 Equivalent</th></tr>
  </thead>
  <tbody>
    <tr><td>Legacy storage engine syntax</td><td><code>TYPE=InnoDB</code></td><td><code>ENGINE=InnoDB</code></td></tr>
    <tr><td>Integer display width</td><td><code>int(11)</code>, <code>bigint(20)</code></td><td><code>int</code>, <code>bigint</code> (deprecated in MySQL 8)</td></tr>
    <tr><td>Compressed row format</td><td><code>ROW_FORMAT=COMPRESSED</code></td><td><code>ROW_FORMAT=DYNAMIC</code> (COMPRESSED deprecated)</td></tr>
    <tr><td>LOB column constraints</td><td><code>TEXT NOT NULL DEFAULT ''</code></td><td>TEXT/BLOB cannot have NOT NULL or DEFAULT in Aurora</td></tr>
    <tr><td>Zero date defaults</td><td><code>DEFAULT '0000-00-00 00:00:00'</code></td><td>Not allowed in Aurora MySQL strict mode</td></tr>
    <tr><td>Comment parentheses</td><td><code>COMMENT '(DC2Type:datetime_immutable)'</code></td><td>Parentheses in comments cause parse errors in MySQL 8</td></tr>
    <tr><td>Legacy character sets</td><td><code>_utf8mb3</code>, <code>utf8mb3</code></td><td>Use <code>utf8mb4</code></td></tr>
    <tr><td>Unsupported storage engines</td><td><code>ENGINE=Aria</code>, <code>ENGINE=TokuDB</code></td><td>Must be converted to <code>ENGINE=InnoDB</code></td></tr>
  </tbody>
</table>

<h2 id="export-schema">Exporting the Schema</h2>

The export command applies a chain of `sed` transformations at export time to handle the most common incompatibilities automatically. Run this on the jump server with connectivity to the MariaDB source.

There is no single dump command that works for every schema — the right one depends on how your MariaDB instance was configured, what MariaDB version features your schema uses, and how Aurora strict mode handles certain defaults. Two variants are documented below. Start with Variant 1; if the import fails or produces unexpected output, try Variant 2.

<h3 id="variant-1">Variant 1</h3>

```bash
cd /root/tools/aurora_migration/

mysqldump --defaults-file=/root/.<dbidentifier>.cnf \
  --no-data --routines --triggers --skip-comments \
  --compatible=mysql40 \
  --default-character-set=utf8mb4 \
  <schema_name> | \
  sed 's/TYPE=InnoDB/ENGINE=INNODB/g' | \
  sed -E "s/(COMMENT ')[^']*\(([^']*)\)'/\1\2'/g" | \
  sed 's/ROW_FORMAT=COMPRESSED/ROW_FORMAT=DYNAMIC/g' | \
  sed -E 's/\b(int|bigint|tinyint)\([0-9]+\)/\1/gI' | \
  sed -E "/\b(tinytext|text|mediumtext|longtext|tinyblob|blob|mediumblob|longblob)\b/ s/[[:space:]]+NOT[[:space:]]+NULL//Ig" | \
  sed -E "/\b(tinytext|text|mediumtext|longtext|tinyblob|blob|mediumblob|longblob)\b/ s/[[:space:]]+DEFAULT[[:space:]]*\(?('([^']*)'|NULL)\)?//Ig" | \
  sed -E "s/[[:space:]]+,/,/g; s/[[:space:]]+;/;/g" \
  > <schema_name>.schema.$(date +'%Y-%m-%d_%H-%M_%p').sql
```

<h3 id="variant-1-explained">Variant 1 — Pipeline Explained</h3>

<table>
  <thead>
    <tr><th>Step</th><th>What It Does</th><th>Why It's Needed</th></tr>
  </thead>
  <tbody>
    <tr><td><code>--no-data</code></td><td>Exports schema only, no row data</td><td>DMS handles data; schema import must come first</td></tr>
    <tr><td><code>--routines</code></td><td>Includes stored procedures and functions</td><td>Ensures all server-side logic is migrated</td></tr>
    <tr><td><code>--triggers</code></td><td>Includes triggers</td><td>Preserves data integrity logic on the target</td></tr>
    <tr><td><code>--skip-comments</code></td><td>Omits dump header comments</td><td>Avoids version-specific comments that cause parse errors on import</td></tr>
    <tr><td><code>--compatible=mysql40</code></td><td>Formats output for broad MySQL compatibility</td><td>Reduces engine-specific syntax in the output</td></tr>
    <tr><td><code>--default-character-set=utf8mb4</code></td><td>Sets connection charset to utf8mb4</td><td>Ensures multibyte characters are exported correctly</td></tr>
    <tr><td>sed (1): <code>TYPE=InnoDB</code> → <code>ENGINE=INNODB</code></td><td>Replaces legacy storage engine declaration</td><td>MySQL 8 does not accept the <code>TYPE=</code> syntax</td></tr>
    <tr><td>sed (2): Strip parentheses from COMMENT</td><td>Removes <code>(DC2Type:...)</code> wrapping from Doctrine-generated comments</td><td>MySQL 8 parser rejects parentheses in COMMENT values</td></tr>
    <tr><td>sed (3): <code>ROW_FORMAT=COMPRESSED</code> → <code>ROW_FORMAT=DYNAMIC</code></td><td>Replaces deprecated row format</td><td>Aurora MySQL 8 does not support COMPRESSED row format for standard InnoDB tables</td></tr>
    <tr><td>sed (4): Remove integer display width</td><td>Strips <code>(11)</code> from <code>int(11)</code>, <code>(20)</code> from <code>bigint(20)</code>, etc.</td><td>Display widths are deprecated in MySQL 8 and cause warnings on import</td></tr>
    <tr><td>sed (5): Remove NOT NULL from LOB columns</td><td>Strips <code>NOT NULL</code> from any TEXT or BLOB column definition</td><td>Aurora MySQL does not allow NOT NULL constraint on TEXT/BLOB types</td></tr>
    <tr><td>sed (6): Remove DEFAULT from LOB columns</td><td>Strips <code>DEFAULT ''</code>, <code>DEFAULT NULL</code>, <code>DEFAULT 'value'</code> from TEXT/BLOB columns</td><td>Aurora MySQL does not allow DEFAULT values on TEXT/BLOB types</td></tr>
    <tr><td>sed (7): Clean trailing whitespace</td><td>Removes extra spaces before commas and semicolons</td><td>Cosmetic cleanup — prevents formatting artifacts from earlier sed passes</td></tr>
  </tbody>
</table>

<h3 id="variant-2">Variant 2</h3>

If Variant 1 does not produce a clean import, this alternative has worked in cases where the schema uses stricter charset/collation declarations, version-conditional comments, or non-standard column defaults that Variant 1 does not fully cover.

```bash
mysqldump --defaults-file=/root/.<dbidentifier>.cnf \
  --skip-set-charset \
  --skip-tz-utc \
  --no-data --routines --triggers --skip-comments \
  --default-character-set=utf8mb4 \
  <schema_name> | \
  sed 's/TYPE=InnoDB/ENGINE=InnoDB/g' | \
  sed -E "s/(COMMENT ')[^']*\(([^']*)\)'/\1\2'/g" | \
  sed 's/ROW_FORMAT=COMPRESSED/ROW_FORMAT=DYNAMIC/g' | \
  sed -E 's/\b(int|bigint|tinyint)\([0-9]+\)/\1/gI' | \
  sed -E "/\b(tinytext|text|mediumtext|longtext|tinyblob|blob|mediumblob|longblob)\b/ s/[[:space:]]+NOT[[:space:]]+NULL\b//Ig" | \
  sed -E "/\b(tinytext|text|mediumtext|longtext|tinyblob|blob|mediumblob|longblob)\b/ s/[[:space:]]+DEFAULT[[:space:]]*\(?('([^']*)'|NULL)\)?//Ig" | \
  sed -E "s/DEFAULT '([^']*)'/DEFAULT ('\1')/g" | \
  sed -E 's/CHARSET=utf8mb[0-9]+/CHARSET=utf8mb4/gI' | \
  sed -E 's/COLLATE=utf8mb[0-9a-z_]+/COLLATE=utf8mb4_0900_ai_ci/gI' | \
  sed -E '/\/\*![0-9]{5}/d' \
  > <schema_name>.schema.$(date +'%Y-%m-%d_%H-%M_%p').sql
```

<h3 id="variant-2-differences">Variant 2 — Key Differences from Variant 1</h3>

<table>
  <thead>
    <tr><th>Change</th><th>What It Does</th><th>When It Helps</th></tr>
  </thead>
  <tbody>
    <tr><td><code>--skip-set-charset</code></td><td>Omits <code>SET NAMES</code> and <code>SET CHARACTER SET</code> statements from the dump</td><td>Prevents charset directives from overriding the Aurora session charset on import</td></tr>
    <tr><td><code>--skip-tz-utc</code></td><td>Omits the <code>SET TIME_ZONE='+00:00'</code> statement at the top of the dump</td><td>Useful when the source timezone is not UTC and you want to preserve the original DATETIME values as-is</td></tr>
    <tr><td>No <code>--compatible=mysql40</code></td><td>Removes the broad compatibility flag</td><td>Some MariaDB versions produce cleaner output without it; the sed pipeline handles the specific incompatibilities instead</td></tr>
    <tr><td>sed: <code>DEFAULT 'x'</code> → <code>DEFAULT ('x')</code></td><td>Wraps non-LOB string defaults in parentheses</td><td>Required by Aurora MySQL 8 strict mode for certain default value expressions</td></tr>
    <tr><td>sed: normalize <code>CHARSET=</code></td><td>Rewrites any <code>CHARSET=utf8mb3</code> or similar to <code>CHARSET=utf8mb4</code></td><td>Handles schemas with mixed or legacy charset declarations inline, avoiding a separate post-dump cleanup step</td></tr>
    <tr><td>sed: normalize <code>COLLATE=</code></td><td>Rewrites any <code>COLLATE=utf8mb3_*</code> or similar to <code>COLLATE=utf8mb4_0900_ai_ci</code></td><td>Standardizes collation to Aurora MySQL 8's default; avoids collation mismatch errors on import</td></tr>
    <tr><td>sed: remove <code>/*! ... */</code> lines</td><td>Deletes MySQL version-conditional comment blocks (e.g., <code>/*!50013 DEFINER=...</code>)</td><td>These blocks can cause parse errors when the version number in the comment does not match Aurora's reported version</td></tr>
  </tbody>
</table>

<h3 id="build-your-own">If Both Variants Fail — Build Your Own Pipeline</h3>

Both variants are starting points, not universal solutions. Every schema carries its own quirks depending on the MariaDB version, the ORM or tooling that created the tables, and how strictly the application used MySQL-compatible syntax. If neither variant produces a clean import, don't treat them as a black box — treat them as a menu of individual steps.

The approach: run the dump with no `sed` transformations at all, attempt the import, and read the first error MySQL returns. Each error will point to a specific syntax issue. Match that issue to the sed step that handles it from the tables above, add that step to your pipeline, and repeat until the import is clean.

A few practical tips for this process:

- **Import errors are specific** — Aurora MySQL will tell you the exact line number and syntax it rejected. Use that line in the SQL file to identify which transformation is missing.
- **Test on a copy** — run `sed` transformations against the exported file and inspect the output before importing. A quick `grep` for the failing pattern in the output file is faster than re-running the full dump.
- **Order matters** — some `sed` steps depend on earlier ones having already cleaned up the line. If you're combining steps from both variants, follow the same ordering: flags first, then engine/format fixes, then type fixes, then LOB constraints, then charset/collation, then comment removal last.
- **Some issues require manual fixes** — not everything can be handled with a sed one-liner. Zero date defaults, unsupported storage engines, and MariaDB-specific function syntax may need to be edited directly in the SQL file before import. The review section below covers the most common cases.

<h2 id="review-schema">Reviewing the Exported Schema</h2>

The automated pipeline handles the most common issues, but a manual review pass is necessary. Open the exported SQL file and check for:

<h3 id="header-footer">Remove Header and Footer Comment Blocks</h3>

Delete the first and last blocks of lines starting with `--` or `/*`. These are MySQL version-specific comments generated by `mysqldump` that can cause parse errors on import.

<h3 id="partitioning">Partitioning</h3>

If any tables use partition-based maintenance cron jobs (e.g., dropping old partitions on a schedule), disable those jobs before starting the migration. Partition DDL changes on the source during migration will not replicate cleanly through DMS.

<h3 id="character-sets">Character Set and Collation</h3>

Replace any remaining references to the legacy `_utf8mb3` character set (which is an alias for `utf8`) with `utf8mb4`. Use this migration as an opportunity to standardize the default character set and collation across all tables:

```bash
sed -i 's/_utf8mb3/utf8mb4/g; s/ utf8mb3 / utf8mb4 /g' <schema_name>.schema.<date>.sql
```

<h3 id="zero-dates">Zero Date Defaults</h3>

Aurora MySQL runs with `sql_mode` that includes `NO_ZERO_DATE`. Any column with `DEFAULT '0000-00-00 00:00:00'` will fail on import. Replace these with `NULL` or an application-appropriate default.

Search for all occurrences in the dump:

```bash
grep -n "0000-00-00" <schema_name>.schema.<date>.sql
```

<h3 id="default-values">Other Default Value Cleanups</h3>

Aurora MySQL 8 is stricter than MariaDB about column defaults. Watch for:

- `DEFAULT (_utf8mb3'en')` — rewrite as `DEFAULT 'en'`
- Function-based defaults not supported in MySQL 8.0 syntax (MySQL 8.0.13+ supports expressions, but older 8.0 minor versions do not)

<h3 id="unsupported-engines">Unsupported Storage Engines</h3>

Check for non-InnoDB engines that are not available in Aurora MySQL:

```bash
grep -iE "ENGINE=(Aria|TokuDB|MyRocks|MEMORY|CSV|ARCHIVE)" <schema_name>.schema.<date>.sql
```

`Aria` (MariaDB's default for system tables) and `TokuDB` are not available in Aurora. Convert them to `InnoDB`. `MEMORY` tables can remain as `MEMORY` if their use case is appropriate, but note that Aurora does not persist MEMORY table data across instance restarts.

<h3 id="routines-triggers">Stored Procedures and Triggers</h3>

Review all routines and triggers for MariaDB-specific functions that have no MySQL equivalent. Common issues:

- `SLEEP()` behavior differences
- `GET_LOCK()` semantics differ between MariaDB and MySQL
- MariaDB-specific JSON functions (check against MySQL 8 JSON function reference)
- `REGEXP` behavior may differ slightly

<h2 id="import-schema">Importing the Schema to Aurora</h2>

Once the SQL file is reviewed and cleaned, import it to the Aurora MySQL instance:

```bash
mysql -h <aurora-instance-endpoint> -u <username> -p -P 3306 \
  <schema_name> < <schema_name>.schema.<date>.sql
```

<h2 id="drop-secondary-indexes">Secondary Index Strategy</h2>

AWS recommends dropping secondary indexes on the target before the DMS full load, then recreating them afterward. The rationale is that every inserted row triggers index maintenance on all secondary indexes, which can slow a full load significantly on large tables.

That said, this is a recommendation, not a requirement — and it comes with a trade-off: recreating indexes after the full load on a large dataset can itself be time-consuming and resource-intensive, putting pressure on the Aurora instance at a sensitive point in the migration. Whether dropping indexes first is the right call depends on your dataset size, available maintenance window, and how comfortable you are with the index rebuild phase.

<table>
  <thead>
    <tr><th>Approach</th><th>Pros</th><th>Cons</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>Drop indexes before full load</strong> (AWS recommendation)</td><td>Faster full load — no index maintenance overhead per row</td><td>Index rebuild after full load adds time and Aurora I/O pressure; application cannot go live until indexes are back</td></tr>
    <tr><td><strong>Keep indexes during full load</strong></td><td>No post-load rebuild needed; indexes are ready immediately after full load</td><td>Full load will be slower on large tables with many secondary indexes</td></tr>
  </tbody>
</table>

For smaller datasets or schemas with few secondary indexes, keeping them in place is often the simpler path. For very large tables (hundreds of millions of rows) with many indexes, dropping them first can make the full load meaningfully faster — but factor in the rebuild time before committing to that approach.

Whichever approach you choose, **primary keys must always remain in place** — DMS requires them for CDC replication.

If you decide to drop and recreate indexes, generate the scripts upfront so you have them ready:

```sql
SELECT
  CONCAT('ALTER TABLE `', TABLE_SCHEMA, '`.`', TABLE_NAME, '` DROP INDEX `', INDEX_NAME, '`;') AS drop_stmt,
  CONCAT('ALTER TABLE `', TABLE_SCHEMA, '`.`', TABLE_NAME, '` ADD ',
    IF(NON_UNIQUE = 0, 'UNIQUE ', ''), 'INDEX `', INDEX_NAME, '` (',
    GROUP_CONCAT(CONCAT('`', COLUMN_NAME, '`') ORDER BY SEQ_IN_INDEX), ');') AS create_stmt
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = '<schema_name>'
  AND INDEX_NAME != 'PRIMARY'
GROUP BY TABLE_SCHEMA, TABLE_NAME, INDEX_NAME, NON_UNIQUE;
```

Split the output into `drop_indexes.sql` (run on Aurora before the task starts) and `create_indexes.sql` (run after the full load completes, covered in Part 5).

<h2 id="verify-schema">Verifying the Imported Schema</h2>

Use `mysqlcheck` to validate the imported schema on Aurora:

```bash
mysqlcheck --check -u admin -p -h <aurora-instance-endpoint> -P 3306 <schema_name>
```

All tables should report `OK`. Investigate any errors or warnings before proceeding to the DMS setup.

<h2 id="migrate-users">Migrating Database Users</h2>

MariaDB and Aurora MySQL handle user grants differently. MariaDB uses `IDENTIFIED BY PASSWORD` with a native password hash, while Aurora MySQL 8 uses `IDENTIFIED WITH 'mysql_native_password' AS` with the same hash value. The `pt-show-grants` tool from Percona Toolkit handles this translation cleanly.

<h3 id="export-users">Export Users from MariaDB</h3>

Run this from the jump server:

```bash
/usr/bin/pt-show-grants \
  --user=<username> \
  --ask-pass \
  --host=<mariadb-endpoint> \
  --port=3306 \
  | grep -v -E "(root|mariadb\.sys|rdsadmin|rdsrepladmin|rdsproxyadmin|dd_agent_stat|dms_user|proxysql_check)" \
  | sed -E "s/IDENTIFIED BY PASSWORD '(.*)'/IDENTIFIED WITH 'mysql_native_password' AS '\1'/" \
  > /root/tools/aurora_migration/<schema_name>.db.users.$(date +"%Y-%m-%d_%I-%M_%p").sql
```

**What this does:**
- `grep -v -E "..."` — excludes system accounts and the DMS user that was already created in the target
- `sed` — rewrites the password clause from MariaDB format (`IDENTIFIED BY PASSWORD 'hash'`) to MySQL 8 format (`IDENTIFIED WITH 'mysql_native_password' AS 'hash'`)

<div class="callout-warning">
  <p><strong>Review IP whitelisting:</strong> MariaDB users are often created with specific host patterns (e.g., <code>'app_user'@'10.0.1.%'</code>). If the Aurora instance is in a different subnet or the application connects from different IP ranges, update the host part of the <code>CREATE USER</code> statements before importing.</p>
</div>

<h3 id="import-users">Import Users to Aurora</h3>

```bash
mysql -u <username> -p -h <aurora-endpoint> -P 3306 < <schema_name>.db.users.<date>.sql
```

Verify the import by comparing user counts between source and target:

```sql
-- Run on both MariaDB and Aurora, compare output
SELECT user, host FROM mysql.user WHERE user NOT IN ('root','rdsadmin','rdsrepladmin','mysql.sys','mysql.infoschema','mysql.session') ORDER BY user, host;
```

With the schema and users in place on Aurora, proceed to Part 4 to configure DMS endpoints and the migration task.
