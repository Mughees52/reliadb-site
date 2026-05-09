---
title: "ProxySQL in Front of AWS RDS & Aurora MySQL — Part 3: Query Routing, Read/Write Split, and Multiplexing"
date: 2026-05-12T10:00:00.000Z
author: "Mario"
# TODO: cover image needed before publish — asset path below is a placeholder
coverImage: "/images/blog/proxysql-rds-aurora-mysql-part3-query-rules-rw-split.jpg"
description: "How ProxySQL's query rules route by pattern, user, schema, and digest — and why SET @user_var, not HikariCP's defaults, is what breaks multiplexing."
categories:
  - mysql
  - aws-rds
  - high-availability
read_time: 17
featured: true
---

<!-- Series Navigation -->
<div class="series-nav">
  <h4>ProxySQL in Front of AWS RDS &amp; Aurora MySQL &mdash; 5-Part Series</h4>
  <ol>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part1-why-and-placement">Part 1: Why and Where to Place It</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part2-aurora-hostgroups">Part 2: Wiring ProxySQL to Aurora MySQL</a></li>
    <li><span class="current">Part 3: Query Routing, Read/Write Split, and Multiplexing (You Are Here)</span></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls">Part 4: HA, Failover Patterns, and TLS</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part5-monitoring-tuning-troubleshooting">Part 5: Monitoring, Tuning, and Troubleshooting</a></li>
  </ol>
</div>

The Aurora cluster from Part 2 is torn down. Its lesson — 2 errors in 1,485 queries across a live failover — cost $0.15 and is documented. Part 3 is back to the Lima lab: the dbdeployer sandbox on `mysql-backends` (master on port 25001, two replicas on 25002 and 25003), ProxySQL 2.7.3 on `proxysql-1` and `proxysql-2`, backends in HG&nbsp;10 (writer) and HG&nbsp;20 (readers) exactly as Part 1 left them.

The query routing and connection multiplexing mechanics covered here don't depend on Aurora's topology discovery — they work identically whether the backends are Aurora reader instances or vanilla MySQL replicas. Every rule and variable in this part carries forward unchanged when you point the same ProxySQL instance at an Aurora cluster. ProxySQL doesn't know which kind of MySQL is behind it. The rule evaluation engine doesn't either.

Part 2 confirmed that routing survives a failover and that ProxySQL detects topology changes before Aurora's own control plane announces them. Part 3 asks what happens to the SQL once it arrives at the proxy: how does it get routed, how can it be rewritten, and what determines whether that backend connection can be shared with the next client or must stay pinned to this one?

<h2 id="anatomy">Anatomy of mysql_query_rules</h2>

```sql
-- Tested on Lima VMs, MySQL 8.0.41 via dbdeployer, ProxySQL 2.7.3, 2026-05-09
```

`mysql_query_rules` is a SQLite-backed table with around 30 columns. Six of them drive the vast majority of production configurations.

**`rule_id`** is the evaluation priority. ProxySQL sorts the full active rule set by `rule_id` ascending at `LOAD MYSQL QUERY RULES TO RUNTIME`. There's no concept of insertion order — only the number matters. A rule at `rule_id=1` evaluates before one at `rule_id=100`, always.

**`active`** is a 0/1 gate. An inactive rule exists in the MEMORY layer but is invisible at RUNTIME. This makes it the right tool for staging a rule before you commit to it — insert with `active=0`, inspect via `SELECT ... FROM mysql_query_rules`, flip to `active=1` and LOAD when ready.

**`match_pattern`** and **`match_digest`** are two independent matching surfaces. `match_pattern` runs a regex against the raw query text as received from the client, case-insensitive by default. `match_digest` runs a regex against the normalized digest — the version of the query where all literals have been replaced with `?` and whitespace normalized, the same form you see in `stats_mysql_query_digest`. A rule can specify both; both must match for the rule to fire. They serve different purposes: `match_pattern` handles structural rewrites and locking reads; `match_digest` targets known query shapes by their normalized form.

**`destination_hostgroup`** is where the matched query goes. Setting it to `NULL` means "don't change the hostgroup for this query, but continue to the next rule" — useful for applying a side effect like `flagOUT` without overriding routing.

**`apply`** is the short-circuit switch. `apply=1` stops rule evaluation the moment the rule fires: route the query, done. `apply=0` fires the rule's other effects (hostgroup override, `flagOUT` marker, `replace_pattern`) but continues evaluating. Every terminal routing rule should have `apply=1`. The only reason to use `apply=0` is to build a multi-stage chain with `flagIN`/`flagOUT`.

**`replace_pattern`** rewrites the query before it reaches the backend. It requires `match_pattern` — there's a CHECK constraint enforcing this. Section 5 covers rewriting in detail.

**`multiplex`** controls whether matching this rule affects the session's multiplexing state: `0` disables multiplexing for the session, `1` forces it on (overriding session state that would normally pin the connection), `2` leaves the state unchanged (the default).

The evaluation flow looks like this:

```
mysql_query_rules evaluation flow
──────────────────────────────────────────────────────────────
  Incoming query from frontend
        │
        ▼
  Sort active rules by rule_id ASC  (done at LOAD TO RUNTIME)
        │
        ▼
  Rule N: does query match? (username, schemaname, match_pattern, match_digest)
   ├── NO  → advance to rule N+1
   └── YES → apply destination_hostgroup + replace_pattern + multiplex
               │
               ├── apply=1 → STOP. Send query. Evaluation ends here.
               │
               └── apply=0 → continue to rule N+1
                             (flagOUT may set a chain marker for later rules)
        │
        ▼
  No matching rule → route to user's default_hostgroup
──────────────────────────────────────────────────────────────
```

In practice, a standard read/write split is two rules:

```sql
-- mysql_query_rules: minimal read/write split
-- rule_id 1 must be lower than 2 — specific before greedy (see Section 3)
INSERT INTO mysql_query_rules (rule_id, active, match_pattern, destination_hostgroup, apply)
VALUES
  (1, 1, '^SELECT.*FOR UPDATE$', 10, 1),  -- locking reads → writer HG 10
  (2, 1, '^SELECT',              20, 1);  -- all other SELECTs → readers HG 20

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

Changes in MEMORY are invisible at RUNTIME until explicitly promoted. Always verify the active rule set via `SELECT ... FROM runtime_mysql_query_rules` before promoting to production traffic.

<h2 id="rule-ordering">Rule Ordering and the Priority Bug</h2>

This is what your application sees when query rule order is wrong:

```
-- client output through proxysql-1:6033 (wrong-order rules active)
ERROR 1290 (HY000): The MySQL server is running with the --super-read-only option
                    so it cannot execute this statement
```

That error came from `SELECT * FROM t1 WHERE id=1 FOR UPDATE` — a locking read that should have gone to the writer. It didn't. It landed on a replica. The replica rejected it with `super-read-only`. In production, that error surfaces as an application exception mid-transaction.

Here's the rule configuration that produced it:

```sql
-- runtime_mysql_query_rules on proxysql-1 (WRONG ORDER — rule_id=10 fires before 11)
rule_id  active  match_pattern          destination_hostgroup  apply
10       1       ^SELECT                20                     1   ← greedy, fires first
11       1       ^SELECT.*FOR UPDATE    10                     1   ← specific, never reached
```

ProxySQL evaluates by `rule_id` ascending. Rule 10 fires first. `SELECT * FROM t1 WHERE id=1 FOR UPDATE` starts with `SELECT`, so it matches rule 10 immediately — routed to HG&nbsp;20, a replica. Rule 11 never evaluates. The `^SELECT.*FOR UPDATE` pattern exists in the table but is effectively dead.

`stats_mysql_query_digest` is the confirmation:

```sql
-- stats_mysql_query_digest: SELECT FOR UPDATE routed to HG 20 (replica) — pre-fix
hostgroup  digest_text                                     count_star
20         SELECT * FROM t1 WHERE id=? FOR UPDATE         1
```

Hostgroup 20 is a replica. This locking read should be in hostgroup 10. The fix is to swap the `rule_id` values so the specific pattern evaluates first:

```sql
-- runtime_mysql_query_rules on proxysql-1 (CORRECT ORDER)
rule_id  active  match_pattern          destination_hostgroup  apply
10       1       ^SELECT.*FOR UPDATE    10                     1   ← specific, fires first
11       1       ^SELECT                20                     1   ← greedy, catches the rest
```

After the fix, the same query lands correctly:

```sql
-- stats_mysql_query_digest: SELECT FOR UPDATE on HG 10 (master) — post-fix
hostgroup  digest_text                                     count_star
10         SELECT * FROM t1 WHERE id=? FOR UPDATE         1
```

The rule to internalize: always order specific patterns before greedy ones. `rule_id=10` evaluates before `rule_id=11` because ProxySQL sorts by `rule_id` at load time — the number is the priority, full stop. The same ordering principle governs rewrite rules, which we'll hit again in Section 5.

<h2 id="routing-by-context">Routing by Context: User, Schema, Digest</h2>

`match_pattern` and `match_digest` aren't the only dimensions. Rules can also filter on the connecting user, the current schema, or both — and `default_hostgroup` on the user itself routes traffic without any rule at all. These three routing contexts compose: a rule can require a matching user AND schema AND digest, and it's still evaluated in `rule_id` order like any other rule.

<h3 id="per-user">Per-User Routing</h3>

User-level routing requires no query rules. `mysql_users.default_hostgroup` is the destination when no rule matches, and `transaction_persistent` controls whether that assignment sticks for the duration of an open transaction.

In the lab, the `app` user has `default_hostgroup=10` and `transaction_persistent=1` — it follows query rules for routing and holds hostgroup affinity through open transactions. The `analytics` user has `default_hostgroup=20` and `transaction_persistent=0`:

```sql
-- mysql_users: per-user routing configuration
username   default_hostgroup  transaction_persistent
app        10                 1
analytics  20                 0
```

The same `SELECT @@hostname, @@port` from two users returns different backends:

```sql
-- stats_mysql_query_digest: per-user routing proof
hostgroup  username   digest_text               count_star
20         analytics  SELECT @@hostname,@@port  1
20         app        SELECT @@hostname,@@port  1
10         app        INSERT INTO t1(val)...    1
10         app        DELETE FROM t1 WHERE...   1
```

`analytics` routes to HG&nbsp;20 for every query — no rules needed, no rules to mis-order. The `app` user's writes land on HG&nbsp;10 via a write-routing rule. The primary use case for per-user routing is exactly this: analytics or reporting accounts that must never touch the writer get a `default_hostgroup` pointing at a dedicated reader and `transaction_persistent=0`. The routing enforcement lives in one row of `mysql_users`, not in application code.

<h3 id="per-schema">Per-Schema Routing</h3>

The `schemaname` column in `mysql_query_rules` scopes a rule to a specific database. Queries issued against any other schema skip the rule entirely.

```sql
-- runtime_mysql_query_rules: schemaname filter
rule_id  active  schemaname    match_pattern  destination_hostgroup  apply
3        1       analytics_db  NULL           20                     1
```

This rule has no `match_pattern`. It fires on any query issued against `analytics_db`, regardless of statement type, and routes it to HG&nbsp;20. An `app` user connecting to `analytics_db` goes to a replica. The same user connecting to `lab_test` follows the normal pattern rules. One row in `mysql_query_rules` separates two traffic streams at the schema boundary, without touching application code or the database schema itself.

The production pattern: a dedicated analytics database pinned to a read-only replica, a transactional database following the standard write/read split. Multi-tenant deployments use the same mechanism to keep per-tenant schemas on specific infrastructure without changes to application routing logic.

<h3 id="per-digest">Per-Digest Routing</h3>

`match_digest` targets the normalized query shape — literals replaced with `?`, whitespace normalized — rather than the raw text. This makes it more stable than `match_pattern` for ORMs that emit structurally identical queries with different parameter values: the normalized form is the same regardless of which user ID or date range the ORM substituted in.

The most common production use case for `match_digest` is not what you'd expect. It isn't routing by query type — pattern rules handle that cleanly. It's quarantine: pinning a known-heavy or known-problematic digest to a specific hostgroup until you can fix the underlying issue.

Imagine a reporting tool that just discovered the replicas and is now hammering them with a specific aggregation pattern that's slowing OLTP reads. Or an ORM-generated query causing replication lag while the application team works on a fix. Or a compliance query that needs writer-fresh data but was accidentally configured to read from a replica. `match_digest` handles all three cases: find the offending pattern in `stats_mysql_query_digest`, copy the `digest_text`, escape the regex metacharacters, drop it into a `match_digest` rule with the target hostgroup. The rule fires on that normalized shape regardless of parameter values and leaves everything else untouched.

```sql
-- runtime_mysql_query_rules: match_digest quarantine rule
rule_id  active  match_digest                   destination_hostgroup  apply
8        1       ^SELECT COUNT\(\*\) FROM        10                     1
```

```sql
-- stats_mysql_query_digest: digest-matched routing proof
hostgroup  digest                digest_text                           count_star
10         0xB154770BDBDAC823    SELECT COUNT(*) FROM t1              1
10         0xF676D3098284E26A    SELECT COUNT(*) FROM t1 WHERE id>?   1
```

Both queries, different parameter sets, same normalized shape — both redirected by one rule. `stats_mysql_query_digest` is the authoritative source for the right pattern: run the offending query through ProxySQL, read the `digest_text`, and that's what goes into `match_digest`.

<h2 id="query-rewriting">Query Rewriting</h2>

ProxySQL can rewrite a query before it reaches MySQL. The `replace_pattern` column substitutes a new query text whenever `match_pattern` fires. The backend sees the rewritten form; the client receives results from the rewritten query, not the original.

Rewriting is a surgical tool, not a first resort. Before using it, ask whether the application can be fixed instead. A rewritten query is invisible to developers running the statement in isolation — the behavior they see in a MySQL client won't match what the application gets through the proxy, and the discrepancy is silent. It's a maintenance burden that compounds over time.

With that caveat stated, the textbook case is fully demonstrable. The `big_table` table in the lab has 1,000 rows. An unbounded `SELECT *` against it would return all of them. A rewrite rule intercepts it first:

```sql
-- mysql_query_rules: inject LIMIT 100 on unbounded table scan
-- rule_id=4 must come before the greedy ^SELECT rule at rule_id=11
INSERT INTO mysql_query_rules (
  rule_id, active, match_pattern, replace_pattern,
  destination_hostgroup, apply
) VALUES (
  4, 1,
  '^SELECT \* FROM big_table$',
  'SELECT * FROM big_table LIMIT 100',
  20, 1
);
```

Through the proxy, the client receives exactly 100 rows. The backend received `SELECT * FROM big_table LIMIT 100`. `stats_mysql_query_digest` is the proof:

```sql
-- stats_mysql_query_digest: rewrite proof — unbounded form absent, only LIMIT ? present
hostgroup  digest_text                          count_star
20         SELECT * FROM big_table LIMIT ?      1
```

There is no entry for `SELECT * FROM big_table` without the `LIMIT`. Because ProxySQL rewrote the query before forwarding it, the unbounded form never reached MySQL — and ProxySQL only records queries after the rewrite. That absence in the digest is the clearest confirmation the intercept happened at the proxy and not on the backend.

Rewriting and routing share the same priority pecking order. A rewrite rule placed after a greedy `^SELECT` never fires — we hit this in the lab when we initially inserted the rewrite at `rule_id=15`. The catch-all `^SELECT` at `rule_id=11` matched first and forwarded the original unbounded query. The digest showed the unrewritten form still reaching the backend. Moving the rule to `rule_id=4`, ahead of the catch-all, fixed it immediately. The section ordering bug from Section 3 isn't unique to routing rules — it bites rewrite rules in exactly the same way.

Two additional production warnings. First, `replace_pattern` only works with `match_pattern`, never with `match_digest` — a CHECK constraint enforces this. Second, treat the `comment` column as a required field for rewrite rules: document what the rule does, why it exists, and when it can be removed. Schema migrations and ORM upgrades routinely invalidate rewrites that made sense at the time, and a `comment` is the only in-band record of intent.

<h2 id="multiplexing">Connection Multiplexing — What Breaks It</h2>

After a query completes, ProxySQL decides whether the backend connection that served it can go back into the free pool for other frontends to use, or whether it must stay assigned to this specific frontend. That decision is the multiplexing check.

If the session is clean — no active transaction, no user-defined variables, no temporary tables, no advisory locks — the backend connection is released. The frontend stays connected to ProxySQL; the backend is free. The next query from this frontend may land on any available connection in the pool. From the backend's perspective, many client sessions arrive as a much smaller number of MySQL threads.

The numbers from the lab make this concrete. One hundred Python threads each connect to proxysql-1, run `SELECT 1`, and then hold the frontend connection open but idle for 45 seconds. During that idle window:

```
-- stats_mysql_connection_pool on proxysql-1 (T0+10s, 100 idle frontends, no session state)
-- ProxySQL 2.7.3 / MySQL 8.0.41 / Lima lab / 2026-05-09
hostgroup  srv_host       srv_port  ConnUsed  ConnFree
10         192.168.105.6  25001     0         100
20         192.168.105.6  25002     0          42
20         192.168.105.6  25003     0          61
```

`ConnUsed` is zero across all three backends. One hundred frontend sessions are open. Zero backend connections are pinned to any of them. After `SELECT 1` completed, ProxySQL returned all 100 backend connections to the free pool. The frontends are still connected — they just don't hold a reserved MySQL thread on the other side.

<div class="callout">
  <p><strong>MULTIPLEXING ON, MULTIPLEXING OFF:</strong> 100 idle frontend connections held against ProxySQL &rarr; 0 backend connections held against MySQL. Add one <code>SET @user_var = 1</code> per session and the same workload pins 100 backend connections &mdash; one per frontend. Multiplexing is the default; user-defined variables turn it off.</p>
</div>

The four pinning patterns below — user-defined variable, explicit transaction, temporary table, advisory lock — all collapse to the same 100/100 outcome. They are four doors to the same broken state.

```
Multiplexing state — five scenarios (proxysql-1, HG 10, T0+10s after 100 connections)
────────────────────────────────────────────────────────────────────────────────────────
Scenario                              Frontend  HG10 ConnUsed  Multiplexing
────────────────────────────────────────────────────────────────────────────────────────
Baseline: SELECT 1, no session state  100       0              ✓ Active
SET @user_var = idx                   100       100            ✗ Pinned
BEGIN (explicit transaction)          100       100            ✗ Pinned
CREATE TEMPORARY TABLE tmp (id INT)   100       100            ✗ Pinned
SELECT GET_LOCK('mylock_N', 0)        100       100            ✗ Pinned
────────────────────────────────────────────────────────────────────────────────────────
MySQL 8.0.41 / ProxySQL 2.7.3 / Lima lab / 2026-05-09
```

Each pattern pins for a different structural reason.

**User-defined variables** (`SET @user_var = value`) create session-scoped state in MySQL's UDV store on that specific backend connection. ProxySQL cannot replay a UDV on a different connection — the variable name and value are opaque to it, unlike tracked session attributes. The backend connection must stay assigned to this frontend so that subsequent queries can read the variable back.

**Explicit transactions** (`BEGIN` or `START TRANSACTION`) bind an in-progress transaction's undo log to one backend connection. Moving an open transaction to a different backend mid-flight is impossible — you'd need to replay every statement from the beginning, and the new backend's state wouldn't match. ProxySQL holds the connection until `COMMIT` or `ROLLBACK` arrives.

**Temporary tables** exist in MySQL's in-memory storage, scoped to the connection that created them. Returning the backend to the pool destroys the table. ProxySQL pins the connection for the session's lifetime.

**Advisory locks** (`GET_LOCK()`) are connection-scoped named locks in MySQL. Returning the backend to the pool silently releases the lock, breaking any application-level serialization that depends on it. ProxySQL holds the connection until the lock is explicitly released.

A fifth lever is `mysql_users.transaction_persistent`. Setting it to `1` (the default) pins all queries in a detected transaction to the same *hostgroup* — not the same backend connection. This is hostgroup affinity, not multiplexing: it ensures reads during an open transaction stay on the writer rather than jumping to a replica, but it doesn't prevent ProxySQL from handing different backend connections within HG&nbsp;10 to successive queries in the transaction. Setting it to `0` allows per-query routing even inside a transaction, which is useful for analytics users that never hold open transactions but risky for application users that do.

<div class="post-cta-inline">
  <h4>Multiplexing not doing what you expected on RDS or Aurora?</h4>
  <p>Connection pool behavior through ProxySQL changes in specific, identifiable ways. If your backend thread count is tracking 1:1 with your frontend connection pool and you can't find why, a 30-minute assessment call usually surfaces the culprit.</p>
  <a href="/contact/" class="btn">Book Free Assessment &rarr;</a>
</div>

<h2 id="hikaricp">The HikariCP/JDBC Pinning Problem — and What Actually Causes It</h2>

Despite what older guides say, your HikariCP defaults are probably not breaking multiplexing in modern ProxySQL. The thing actually hurting you is somewhere else — and your audit middleware probably put it there.

<h3 id="standard-sets-are-safe">Standard HikariCP Initialization Is Safe in ProxySQL 2.7.3</h3>

When HikariCP acquires a connection from the pool, it runs an initialization sequence before handing the connection to application code. The sequence looks like this:

```sql
-- HikariCP standard initialization sequence (per connection acquisition)
SET autocommit=1;
SET sql_mode='STRICT_TRANS_TABLES';
SET time_zone='+00:00';
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT 1;  -- HikariCP validation query
```

In the lab, 50 Python threads each issue exactly this sequence, run three `SELECT COUNT(*)` queries, then hold the connection idle for 45 seconds. The pool state during that idle window:

```
-- stats_mysql_connection_pool on proxysql-1 (T0+10s, 50 frontends, standard HikariCP SETs)
hostgroup  srv_host       srv_port  ConnUsed  ConnFree
10         192.168.105.6  25001     0         100
```

`ConnUsed` is zero. Fifty frontend connections are open. Zero backend connections are pinned. The standard HikariCP initialization sequence does not break multiplexing in ProxySQL 2.7.3.

The reason: ProxySQL tracks the *values* of these session attributes — `sql_mode`, `time_zone`, transaction isolation level, `autocommit` — and can replay them transparently when handing a backend connection to a new frontend session. The SET statement itself doesn't pin the connection; the value is portable across backend connections. ProxySQL reads the current value after each SET, remembers it on the connection object, and re-applies it when that connection gets reused by a different frontend. From the backend's point of view, the session state is consistent. From the application's point of view, the connection behaves as initialized.

One important precision here. The SET statements are replayable because they only express a *configuration intent*, not a *stateful operation*. The moment a transaction actually opens — started by `BEGIN`, or by any DML statement after `SET autocommit=0` — the situation changes entirely. An in-flight transaction's state cannot be migrated to a different backend mid-flight. So `SET autocommit=0` issued in isolation is replayable; `SET autocommit=0` followed by `INSERT INTO orders ...` pins, because that `INSERT` opened an implicit transaction on a specific backend whose undo log now holds the pending write. The HikariCP default is `autocommit=1` — which means individual statements autocommit and no implicit transactions accumulate. That's precisely why the standard HikariCP sequence is safe.

<h3 id="the-actual-culprit">The Actual Culprit: SET @user_var</h3>

Add one line to the same initialization sequence and the picture changes immediately:

```sql
-- HikariCP sequence + one UDV line (common Spring/audit middleware pattern)
SET autocommit=1;
SET sql_mode='STRICT_TRANS_TABLES';
SET time_zone='+00:00';
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET @app_request_id = 'req-47-1746741602';  -- ← this line
SELECT 1;
```

Same 50-connection workload. Same idle period. Pool state during the idle window:

```
-- stats_mysql_connection_pool on proxysql-1 (T0+10s, 50 frontends, HikariCP + UDV)
hostgroup  srv_host       srv_port  ConnUsed  ConnFree
10         192.168.105.6  25001     50        50
```

`ConnUsed` is 50. One backend connection per frontend, held for the duration of the session. The UDV is the pin.

User-defined variables are opaque to ProxySQL. It can't know what `@app_request_id` holds or whether the application will read it back later. It has no choice but to keep the backend connection attached to that frontend until the session ends — because if it released the connection and the application issued `SELECT @app_request_id` next, the query might land on a backend that never saw the `SET`, and would return `NULL` with no error. Silent data loss.

Where UDVs appear in real codebases:

- **Distributed tracing context.** OpenTelemetry and Zipkin middleware that propagates trace IDs to MySQL's performance schema or audit logs by writing them into session variables on every connection acquisition.
- **ORM interceptors.** Request-metadata written into session variables by a connection interceptor, then read inside stored procedures or triggers for audit-table population.
- **MyBatis plugin patterns.** Per-request state stored in `@` variables by a MyBatis plugin for access inside SQL maps that reference `@variable_name` directly.
- **Vestigial debug code.** A `SET @debug_user = ?` line added during an incident three years ago, never removed from the connection initialization hook, now running on every connection in every environment.

<h3 id="mitigations">Mitigations</h3>

Three options, in order of preference.

**App-level (the correct fix).** Audit your HikariCP `initSQL` and every connection interceptor. For each `SET @` statement, answer: does the application read this variable back in a subsequent query? If not, remove it. Most UDVs in connection init hooks are vestigial — they were added for a debug session, never cleaned up, and have been multiplexing-pinning every connection in production ever since. Removing them takes minutes and has no application-visible effect.

**ProxySQL-level (secondary, with an explicit caveat).** Add a query rule targeting the UDV pattern with `multiplex=1`:

```sql
-- mysql_query_rules: multiplex=1 mitigation for write-only UDV
-- SAFE ONLY IF the application does not read back @app_request_id in the same session
INSERT INTO mysql_query_rules (
  rule_id, active, match_pattern, destination_hostgroup, multiplex, apply, comment
) VALUES (
  1, 1, '^SET @app_request_id', 10, 1, 1,
  'UDV is write-only (tracing); force multiplex=1 — do not use if app reads this var back'
);
LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

`multiplex=1` tells ProxySQL: process this SET, but do not disable multiplexing for the session. With this rule active, `ConnUsed` drops back to zero — same 50 frontends, same UDV, same workload, multiplexing restored.

The caveat is real and must be stated clearly: this mitigation works only when the UDV is write-only. If the application later issues `SELECT @app_request_id` in the same session, ProxySQL may route that query to a backend that never received the SET. The result is `NULL`. There is no error, no log entry, no visible failure — just a missing value. If your tracing middleware writes `@app_request_id` on every connection and never reads it back, this rule is safe. If anything in the request path reads it, the app-level fix is the only correct answer.

**User-level.** Set `transaction_persistent=0` for service accounts that don't hold open transactions. This doesn't eliminate UDV pinning, but it narrows the blast radius — the pinned connection stays on one backend rather than holding hostgroup affinity across an entire transaction.

<h2 id="whats-not-here">What's Not in This Part</h2>

Three topics are deferred intentionally.

**Query mirroring** — cloning live traffic to a secondary hostgroup for validation under real load, without affecting the critical path or modifying application code. It pairs naturally with Part 4's HA validation story, where we use mirroring to test the second ProxySQL node under the same query patterns the first node is serving.

**`stats_mysql_query_digest` as an operational tool** — slow query identification by digest, per-user query profiling, alerting on rewritten-query rate spikes, and using digest data to drive index decisions. Part 5 covers this in depth alongside the full monitoring stack.

**`mysql-monitor_*` global variable tuning** — `check_interval_ms`, `connect_timeout_ms`, `ping_interval_server_ms`, and how to size them against observed Aurora promotion times vs. vanilla replication lag characteristics. Also Part 5.

**TLS on backend connections** — encrypting the ProxySQL&nbsp;&rarr;&nbsp;MySQL leg for in-transit data protection. Part 4.

<h2 id="whats-next">What's Next</h2>

In [Part 4](/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls), we wire the ProxySQL Cluster sync layer. Every query rule, user definition, and hostgroup configuration in this part lives on `proxysql-1`. Part 4 demonstrates how the cluster propagates them to `proxysql-2` automatically — and what failure modes exist when it doesn't. We also add TLS on the backend connections, test the full two-node HA stack under a live Aurora promotion, and work through the NLB health-check configuration that determines which ProxySQL node receives traffic after a cluster event. Everything built in Part 3 becomes the baseline that Part 4 puts under pressure.

<!-- Series Nav Bottom -->
<div class="series-nav">
  <h4>Continue the Series</h4>
  <ol>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part1-why-and-placement">Part 1: Why and Where to Place It</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part2-aurora-hostgroups">Part 2: Wiring ProxySQL to Aurora MySQL</a></li>
    <li><span class="current">Part 3: Query Routing, Read/Write Split, and Multiplexing (You Are Here)</span></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part4-ha-failover-tls">Part 4: HA, Failover Patterns, and TLS &rarr;</a></li>
    <li><a href="/blog/proxysql-rds-aurora-mysql-part5-monitoring-tuning-troubleshooting">Part 5: Monitoring, Tuning, and Troubleshooting</a></li>
  </ol>
</div>
