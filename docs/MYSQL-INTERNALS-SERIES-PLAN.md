# MySQL Internals Animated — Blog Series Plan

**Created:** 2026-04-12
**Concept:** Interactive, animated deep-dives into how MySQL works internally. Each post has a step-by-step animation showing data flow through MySQL's layers, with detailed explanations and production configuration advice.
**Unique value:** No one else has interactive animated MySQL internals content. Text + static diagrams exist (Percona, MySQL docs), but animated step-through visualizations don't.

---

## Series Overview

| # | Title | Animation Focus | Target Keyword | Priority |
|---|-------|----------------|----------------|----------|
| 0 | InnoDB Architecture: The Complete Visual Guide | All components: memory + disk, how they connect | innodb architecture explained | NEXT |
| 1 | How a MySQL UPDATE Actually Works | Write path: client → SQL → InnoDB → commit | mysql update internals | DONE |
| 2 | How a MySQL SELECT Actually Works | Read path: client → SQL → buffer pool → response | mysql select internals | HIGH |
| 3 | InnoDB Buffer Pool: What Happens in Memory | LRU pages, young/old sublist, eviction, dirty flush | innodb buffer pool explained | HIGH |
| 4 | MySQL Crash Recovery: From Power Failure to Fully Recovered | Redo log replay, undo rollback, doublewrite | mysql crash recovery internals | HIGH |
| 5 | MVCC in MySQL: How InnoDB Handles Concurrent Reads and Writes | Read views, undo chain, snapshot isolation | mysql mvcc explained | HIGH |
| 6 | How MySQL Replication Works: Source to Replica | Binlog → IO thread → relay log → SQL thread | mysql replication internals | MEDIUM |
| 7 | MySQL Locking Explained: From Row Locks to Deadlocks | X/S locks, gap locks, next-key, deadlock detection | mysql innodb locking | MEDIUM |
| 8 | How a MySQL INSERT Works Internally | Insert buffer, auto-increment, clustered index split | mysql insert internals | MEDIUM |
| 9 | How a MySQL DELETE Works Internally | Delete mark, purge thread, space reclamation | mysql delete internals | MEDIUM |
| 10 | How MySQL JOINs Execute: Nested Loops to Hash Joins | NLJ, BNL, hash join (8.0+), join buffer | mysql join internals | LOW |
| 11 | InnoDB Tablespace Architecture: Where Your Data Lives on Disk | Pages, extents, segments, system tablespace, file-per-table | innodb tablespace | LOW |
| 12 | How MySQL Handles Transactions: BEGIN to COMMIT | Isolation levels, savepoints, implicit commit, 2PC | mysql transaction internals | LOW |

**Series order:** Post 0 (Architecture overview) is the entry point. It introduces every component and links to the deep-dive posts. Readers start here, then follow the path they're interested in.

---

## Post 0: InnoDB Architecture — The Complete Visual Guide (NEXT)

**Status:** Building now.
**Concept:** Interactive architecture diagram — NOT a flowchart like the other posts. This is a component explorer. Each InnoDB component is a clickable/steppable card. When activated, it highlights its connections to other components and shows data flow paths.

**Animation type:** Component explorer with two panels:
- Left: In-Memory Structures (4 components)
- Right: On-Disk Structures (5 component groups)
- Center: data flow arrows that light up showing how data moves between components

**Steps (12):**
1. Overview: show all components dimmed, "Click Next to explore each component"
2. **Buffer Pool** — the centerpiece. Caches data + index pages. 70-80% of RAM. Show it as a grid of page slots.
3. **Adaptive Hash Index** — auto-built hash on hot B-tree pages. Show arrow from buffer pool → AHI.
4. **Change Buffer** — buffers secondary index changes. Show arrow: DML → change buffer → (later) secondary index pages.
5. **Log Buffer** — holds redo log entries in memory before flush. Show arrow: transaction → log buffer → redo log.
6. **System Tablespace** (ibdata1) — data dictionary, doublewrite buffer, change buffer, undo logs (legacy). Show on-disk box.
7. **File-Per-Table Tablespaces** (.ibd files) — one file per table. Show multiple .ibd boxes.
8. **Undo Tablespaces** — before-images for rollback + MVCC. Show arrow: buffer pool modification → undo tablespace.
9. **Redo Log** — WAL for crash recovery. Show arrow: log buffer → redo log files on disk.
10. **Doublewrite Buffer** — torn page protection. Show arrow: buffer pool dirty page → doublewrite → tablespace.
11. **Temporary Tablespace** — temp tables for sorts, GROUP BY. Show arrow: executor → temp tablespace.
12. **Full picture** — all arrows light up showing the complete data flow: query → buffer pool → redo log → commit → background flush → tablespace.

**Key concepts per component:**
- Buffer Pool: page size (16KB), LRU algorithm, hit ratio, sizing
- AHI: automatic, can be disabled, monitoring via SHOW ENGINE INNODB STATUS
- Change Buffer: only non-unique secondary indexes, max_size setting
- Log Buffer: innodb_log_buffer_size, flushed at commit
- System Tablespace: ibdata1, avoid storing table data here (use file-per-table)
- File-Per-Table: default since MySQL 5.6, innodb_file_per_table=ON
- Undo Tablespaces: separate since MySQL 8.0, innodb_undo_tablespaces=2
- Redo Log: crash recovery, innodb_redo_log_capacity (MySQL 8.0.30+)
- Doublewrite: innodb_doublewrite=ON, 2x write cost but essential for safety
- Temp Tablespace: session temp + global temp, auto-extending

**Configuration quick reference table:**
| Parameter | Component | Default | Notes |
|-----------|-----------|---------|-------|
| innodb_buffer_pool_size | Buffer Pool | 128MB | Set to 70-80% of RAM |
| innodb_buffer_pool_instances | Buffer Pool | 8 (if >1GB) | Reduces contention |
| innodb_adaptive_hash_index | AHI | ON | Disable if high contention |
| innodb_change_buffer_max_size | Change Buffer | 25 | % of buffer pool |
| innodb_log_buffer_size | Log Buffer | 64MB | Increase for large transactions |
| innodb_redo_log_capacity | Redo Log | 100MB | Increase for write-heavy |
| innodb_file_per_table | Tablespaces | ON | Always keep ON |
| innodb_undo_tablespaces | Undo | 2 | Default is fine |
| innodb_doublewrite | Doublewrite | ON | Never disable |

**Source:** [MySQL 9.6 Reference Manual — InnoDB Architecture](https://dev.mysql.com/doc/refman/9.6/en/innodb-architecture.html)

---

## Post 1: How a MySQL UPDATE Actually Works (DONE)

**Status:** Written and committed.
**Animation:** 14 steps, step-by-step interaction (Next/Back/Auto/Reset).
**Path:** Client → Parser → Optimizer → Executor → InnoDB per-row (lock, undo, buffer pool, redo, change buffer) → Two-Phase Commit (PREPARE, binlog, COMMIT) → OK → background flush.
**Sources:** MySQL 8.4 docs, Percona redo logging, Alibaba Cloud redo/undo/binlog analysis.

---

## Post 2: How a MySQL SELECT Actually Works

**Animation steps (10):**
1. Client sends SELECT (COM_QUERY)
2. Parser: tokenize → AST
3. Optimizer: cost-based plan (index choice, join order, covering index decision)
4. Executor: open handler, begin iteration
5. InnoDB: check buffer pool for target page
6. Buffer pool HIT → read from memory (fast path, show green)
7. Buffer pool MISS → read from tablespace .ibd file → load into buffer pool (slow path, show orange)
8. Apply WHERE filter at InnoDB level (Index Condition Pushdown if applicable)
9. Return result set rows to SQL layer → wire protocol encoding
10. OK/EOF packet → client (with row count, execution time)

**Key concepts to explain:**
- Buffer pool hit ratio and why it matters (>95% target)
- Index Condition Pushdown (ICP) — pushed to storage engine vs server layer filtering
- Covering index — when InnoDB never touches the clustered index
- Adaptive Hash Index — InnoDB's automatic in-memory hash for frequent lookups
- Read-ahead: linear vs random prefetch
- MVCC read view: how SELECT sees a consistent snapshot without locks

**Configuration table:**
- `innodb_buffer_pool_size` — sizing for read performance
- `innodb_adaptive_hash_index` — enable/disable AHI
- `innodb_read_ahead_threshold` — linear read-ahead trigger
- `innodb_random_read_ahead` — random prefetch
- `optimizer_switch` — ICP, MRR, BKA flags

**Animation style:** Show buffer pool as a grid of colored page slots. Green = hit, orange = miss (I/O). Pages slide in from disk on miss. Covering index shows skipping the clustered index entirely.

---

## Post 3: InnoDB Buffer Pool — What Happens in Memory

**Animation steps (12):**
1. Show empty buffer pool as a grid of empty slots
2. First query arrives — page loaded from disk → inserted at midpoint (old sublist)
3. Second access to same page → page promoted to young sublist head
4. Multiple queries fill the pool — show pages flowing in
5. Pool reaches capacity — show free list empty
6. New page needed — LRU eviction: oldest page in old sublist evicted
7. Show a sequential scan (table scan) — pages flood in but stay in old sublist (midpoint insertion protects hot pages)
8. Dirty page detection — page modified by UPDATE, marked red/dirty
9. Dirty page added to flush list
10. Page cleaner wakes up — flushes dirty page via doublewrite buffer
11. Doublewrite buffer → tablespace write (show 2-step write)
12. Adaptive flushing — show flush rate adjusting based on redo log fill level

**Key concepts:**
- LRU with midpoint insertion (3/8 old, 5/8 young split)
- Why table scans don't destroy the buffer pool (midpoint protection)
- `innodb_old_blocks_pct` and `innodb_old_blocks_time`
- Dirty page percentage and checkpoint age
- Adaptive flushing and `innodb_io_capacity`
- Multiple buffer pool instances for concurrency
- Buffer pool dump/load on restart (`innodb_buffer_pool_dump_at_shutdown`)

**Animation style:** Grid visualization of buffer pool pages. Color-code by state: blue = clean/young, cyan = clean/old, red = dirty, gray = free. Animated page movement between sublists. Flush animation shows pages writing to disk.

---

## Post 4: MySQL Crash Recovery — From Power Failure to Fully Recovered

**Animation steps (10):**
1. Normal operation: transactions writing redo log, dirty pages in buffer pool
2. CRASH! (dramatic visual — screen glitch effect)
3. MySQL restarts — InnoDB initializes
4. Read redo log from last checkpoint LSN
5. Roll-forward: replay redo records for committed transactions (show pages being reconstructed)
6. Identify uncommitted transactions (no COMMIT record in redo log)
7. Roll-back: use undo log to reverse uncommitted changes
8. Check doublewrite buffer for torn pages — replace corrupted pages
9. Crash recovery complete — InnoDB online
10. Background: purge undo, clean up, resume normal operation

**Key concepts:**
- Checkpoint LSN — what was already safely on disk
- Why redo log guarantees no data loss (WAL principle)
- Doublewrite buffer protecting against torn pages
- XA recovery: checking binlog for prepared transactions
- `innodb_force_recovery` levels (1-6) for extreme cases
- How long crash recovery takes (proportional to redo log to replay)

**Animation style:** Timeline view. Show redo log as a horizontal stream with LSN markers. Crash event as a dramatic break. Recovery replays from last checkpoint forward. Use red/green to show uncommitted (rollback) vs committed (keep).

---

## Post 5: MVCC — How InnoDB Handles Concurrent Reads and Writes

**Animation steps (12):**
1. Transaction T1 starts: `BEGIN` — gets a read view (snapshot)
2. T1 reads row X → sees version V1
3. Transaction T2 starts: `BEGIN` + `UPDATE row X to V2`
4. InnoDB writes V1 to undo log, updates row to V2 in buffer pool
5. T1 reads row X again → follows undo chain → still sees V1 (consistent read!)
6. T2 commits
7. T1 reads row X again → still sees V1 (REPEATABLE READ isolation)
8. Transaction T3 starts after T2 committed → reads row X → sees V2 (new snapshot)
9. Show the undo chain: V2 → (undo pointer) → V1
10. T1 commits → read view released
11. Purge thread checks: no active read view needs V1 → undo record purged
12. Show clean state: only V2 remains

**Key concepts:**
- Read view: list of active transaction IDs at snapshot time
- Undo chain: how InnoDB walks back through versions
- Visibility rules: trx_id < read_view.low_limit AND not in active list
- REPEATABLE READ vs READ COMMITTED (when snapshot is taken)
- Why long-running transactions prevent undo purge (undo tablespace growth)
- Non-locking consistent reads (SELECT without FOR UPDATE)
- Locking reads: SELECT FOR UPDATE/SHARE skip MVCC, read latest version

**Animation style:** Two parallel transaction timelines (T1 and T2) side by side. Show a row "card" with version indicator. Undo chain shown as linked cards. Dotted lines show which version each transaction sees. Color: green = visible, red = invisible to that transaction.

---

## Post 6: How MySQL Replication Works

**Animation steps (10):**
1. Source server: transaction commits, event written to binary log
2. Binary log file rotates when reaching `max_binlog_size`
3. Replica: IO receiver thread connects to source's binlog dump thread
4. Source streams binlog events over TCP
5. IO thread writes events to relay log on replica
6. SQL applier thread reads from relay log
7. Applier executes the event against replica's InnoDB (same per-row path as UPDATE post)
8. Applier updates replication metadata (position tracking)
9. Show lag: applier falls behind receiver (relay log grows)
10. Multi-threaded replication: multiple applier workers process in parallel

**Key concepts:**
- Binlog formats: STATEMENT vs ROW vs MIXED
- GTID vs position-based replication
- Semi-synchronous replication (wait for at least one replica ACK)
- Parallel replication: `replica_parallel_workers`, `replica_parallel_type=LOGICAL_CLOCK`
- Replication lag: `Seconds_Behind_Source` and why it's unreliable
- Binary log group commit and how it enables parallel apply
- Crash-safe replication with `relay_log_recovery=ON`

**Animation style:** Source and replica as two server boxes with a network pipe between them. Binlog events flow as colored packets. Show the three threads (dump, IO, SQL) as labeled arrows. Lag visualization as growing relay log buffer.

---

## Post 7: MySQL Locking Explained

**Animation steps (14):**
1. Show a table with rows and indexes (visual B-tree)
2. Transaction T1: `SELECT ... FOR UPDATE WHERE id = 5` → X lock on record 5
3. Transaction T2: `SELECT ... FOR UPDATE WHERE id = 5` → WAIT (lock queue)
4. T1 commits → lock released → T2 proceeds
5. Gap lock demo: T1 reads `WHERE id BETWEEN 3 AND 7` in REPEATABLE READ
6. Show gap locks between existing records (3,5,7) — locks the gaps
7. T2 tries `INSERT id = 4` → blocked by gap lock (phantom prevention)
8. Next-key lock = record lock + gap lock combined (show visually)
9. Index locking: show that locks are on INDEX records, not table rows
10. Secondary index lock → then clustered index lock (two locks for one UPDATE)
11. Deadlock scenario: T1 locks A then waits for B, T2 locks B then waits for A
12. InnoDB deadlock detection: wait-for graph cycle detected
13. Victim selection: rollback the cheaper transaction
14. Show `SHOW ENGINE INNODB STATUS\G` deadlock section

**Key concepts:**
- Lock types: S (shared), X (exclusive), IS, IX (intention locks)
- Record locks, gap locks, next-key locks, insert intention locks
- Why REPEATABLE READ needs gap locking but READ COMMITTED doesn't
- Index-based locking: no index = table lock escalation
- Deadlock detection algorithm (wait-for graph)
- `innodb_lock_wait_timeout` vs deadlock detection
- `performance_schema.data_locks` for diagnosing live

**Animation style:** B-tree visualization with records as nodes. Lock indicators as colored badges on records and gaps. Two transaction timelines showing lock acquisition order. Deadlock shown as circular arrows in the wait-for graph.

---

## Post 8: How a MySQL INSERT Works

**Animation steps (10):**
1. Client sends INSERT
2. Parser → Optimizer (minimal for INSERT)
3. Auto-increment: acquire AUTO-INC lock, assign value
4. InnoDB: find correct leaf page in clustered index B-tree
5. Page has space → insert directly into sorted position
6. Page full → B-tree page split (show page splitting in half)
7. Secondary indexes: for each secondary index, insert entry
8. Change buffer: if secondary index page not in pool, buffer the insert
9. Write redo log for all changes (clustered + secondary)
10. Commit: redo fsync, binlog write, OK packet

**Key concepts:**
- Clustered index and why INSERT order matters (sequential vs random PKs)
- UUID PKs and page split storms (B-tree fragmentation)
- Auto-increment lock modes (0, 1, 2) and `innodb_autoinc_lock_mode`
- Bulk insert optimizations (`INSERT ... SELECT`, `LOAD DATA`)
- Change buffer efficiency for INSERT-heavy workloads
- `INSERT ... ON DUPLICATE KEY UPDATE` internal path

---

## Post 9: How a MySQL DELETE Works

**Animation steps (8):**
1. Client sends DELETE
2. Optimizer: find rows (same as SELECT path)
3. InnoDB: acquire X lock on each matching row
4. Delete mark: set delete flag on record (NOT physically removed yet)
5. Write undo log (before-image for rollback)
6. Write redo log
7. Commit
8. Background: purge thread physically removes delete-marked records and reclaims space

**Key concepts:**
- Delete marking vs physical deletion (two-phase)
- Why DELETE doesn't immediately free disk space
- `OPTIMIZE TABLE` to reclaim space after large DELETEs
- Purge lag and `innodb_max_purge_lag`
- DELETE + MVCC: other transactions still see the row via undo chain until purge

---

## Post 10: How MySQL JOINs Execute

**Animation steps (10):**
1. Two-table JOIN query arrives
2. Optimizer: evaluate join order (table A driving, table B inner)
3. Nested Loop Join (NLJ): for each row in A, lookup in B
4. Show loop: row from A → index probe in B → match → output
5. Block Nested Loop (BNL, pre-8.0.18): join buffer fills, batch probe
6. Hash Join (MySQL 8.0.18+): build hash table from smaller table
7. Build phase: scan table A, hash each row into buckets
8. Probe phase: scan table B, hash-probe against buckets
9. Show memory usage: hash table in join buffer
10. Multi-table: cascading joins, optimizer reorder

**Key concepts:**
- Why join order matters (smaller driving table = fewer inner lookups)
- Index Nested Loop Join vs BNL vs Hash Join
- `join_buffer_size` and when it matters
- Optimizer hints: `STRAIGHT_JOIN`, `JOIN_ORDER`
- Batched Key Access (BKA) + Multi-Range Read (MRR)

---

## Post 11: InnoDB Tablespace Architecture

**Animation steps (8):**
1. Zoom into a .ibd file on disk
2. Show page structure: 16KB pages with header + data + trailer
3. Page types: data page, index page, undo page, system page
4. Extent = 64 consecutive pages (1MB)
5. Segment = collection of extents for one index
6. Tablespace = collection of segments
7. Show B-tree structure: root page → internal pages → leaf pages
8. File-per-table vs system tablespace vs general tablespace

---

## Post 12: How MySQL Handles Transactions

**Animation steps (10):**
1. `BEGIN` — transaction starts, no locks yet
2. First read: MVCC read view created (REPEATABLE READ)
3. First write: locks acquired, undo written
4. `SAVEPOINT sp1` — mark position for partial rollback
5. More writes...
6. `ROLLBACK TO sp1` — undo the writes after savepoint
7. `COMMIT` — two-phase commit, locks released
8. Autocommit mode: each statement is its own transaction
9. Implicit commit: DDL statements force commit of active transaction
10. Distributed transactions: XA PREPARE / XA COMMIT

---

## Animation Design System (Consistent Across Series)

### Color Scheme (matches ReliaDB site theme — light background, not dark)

**Base:** Light background (#F4F6F8) with white cards, matching the EXPLAIN Analyzer tool style.

| Component | Card BG | Border | Badge/Number | Hex |
|-----------|---------|--------|--------------|-----|
| Animation container | #F4F6F8 | — | — | Site bg-alt |
| Client/Application | #FFFFFF | #DDE3E9 | #1A5276 (navy) | Site primary |
| SQL Layer section | #FFFFFF | #2980B933 | — | Accent border |
| Parser/Optimizer | #F0F4FF | #2980B944 | #2980B9 (blue) | Site accent |
| Executor | #EAF2F8 | #1A527644 | #1A5276 (navy) | accent-lt |
| InnoDB section | #FFFFFF | #1E844933 | — | Success border |
| Row Lock | #FFF8EC | #E67E2244 | #E67E22 (orange) | Site CTA |
| Undo Log | #FFF8EC | #CA6F1E33 | #CA6F1E (dark orange) | cta-dark |
| Buffer Pool | #ECFDF5 | #1E844944 | #1E8449 (green) | Site success |
| Redo Log | #FDF2F8 | #C0392B44 | #C0392B (red) | Danger |
| Change Buffer | #F0FFF4 | #27AE6044 | #27AE60 (lime) | Light green |
| Binary Log | #EAF2F8 | #2980B944 | #2980B9 (blue) | Accent |
| Commit section | #FFFFFF | #C0392B33 | — | Danger border |
| InnoDB PREPARE | #F5F3FF | #8E44AD44 | #8E44AD (purple) | Purple |
| InnoDB COMMIT | #FEF2F2 | #C0392B44 | #C0392B (red) | Danger |
| OK/Success | #ECFDF5 | #1E844966 | #1E8449 (green) | Success |
| Background/Async | #F4F6F8 | #DDE3E9 | #777 (gray) | text-lt |
| Active step glow | — | — | #E67E22 shadow | CTA glow |
| Connectors | #DDE3E9 default, #E67E22 active | | | |
| Progress bar | linear-gradient(90deg, #1A5276, #2980B9, #E67E22) | | | Brand gradient |

### Animation Patterns
- **Step reveal:** opacity 0 → 1 with translateY(20px → 0), cubic-bezier easing
- **Active glow:** subtle orange box-shadow pulse on the current step's card
- **Connectors:** vertical lines (#DDE3E9), glow orange (#E67E22) when active, with arrow
- **Parallel steps:** side-by-side grid (2 columns)
- **Section boxes:** grouped steps within a labeled border (light bg, colored border)
- **Progress bar:** brand gradient (navy → blue → orange)
- **Controls:** Play (green), Reset (gray), Speed (navy pills)
- **Detail tips:** expandable box with #F4F6F8 bg, visible only on active step
- **Container background:** #F4F6F8 (site bg-alt) — matches blog post body, NOT dark

### Template Structure
Each post follows this pattern:
1. Opening hook (2-3 sentences about why this matters)
2. Source attribution callout box
3. **Interactive animation** (dark embedded section)
4. Detailed prose explanation of each step
5. Key Takeaways summary table
6. Configuration reference table
7. CTA to free assessment or EXPLAIN Analyzer
8. Related articles cross-links

---

## Publishing Schedule

| Week | Post | Status |
|------|------|--------|
| Week 1 (Apr 12) | Post 1: How UPDATE Works | DONE |
| Week 1-2 | Post 2: How SELECT Works | NEXT |
| Week 2-3 | Post 3: Buffer Pool Deep Dive | |
| Week 3-4 | Post 5: MVCC Explained | |
| Week 4-5 | Post 4: Crash Recovery | |
| Week 5-6 | Post 7: Locking Explained | |
| Week 6-7 | Post 6: Replication Internals | |
| Week 7-8 | Post 8: How INSERT Works | |
| Month 3 | Post 9-12 | Based on traffic from first 8 |

---

## SEO Strategy for the Series

### Hub Page
Create `/blog/mysql-internals/` as a series hub page listing all posts with:
- Series description and progress tracker
- Visual table of contents with post thumbnails
- "Start from the beginning" CTA
- Schema: `ItemList` with each post as `ListItem`

### Internal Linking
- Each post links to the previous and next in the series
- Each post links to the hub page
- UPDATE post links to SELECT post (read vs write path comparison)
- MVCC post links to Locking post (complementary concepts)
- Crash Recovery links to UPDATE post (redo/undo context)

### Keyword Targeting
The "mysql [operation] internals" keyword family has low competition and moderate search volume. No competitor has animated/interactive content for these topics. First-mover advantage is significant.

### Cross-Promotion
- Link to EXPLAIN Analyzer from SELECT and JOIN posts
- Link to services from crash recovery and replication posts (production incidents)
- Embed EXPLAIN Analyzer iframes in SELECT and JOIN posts

---

## Research Sources (Verified)

- [MySQL 8.4 Reference Manual — InnoDB Redo Log](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html)
- [MySQL 8.4 Reference Manual — Buffer Pool](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html)
- [MySQL 8.4 Reference Manual — InnoDB Multi-Versioning](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)
- [MySQL 8.4 Reference Manual — Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- [MySQL 8.4 Reference Manual — InnoDB Recovery](https://dev.mysql.com/doc/refman/8.4/en/innodb-recovery.html)
- [MySQL 8.4 Reference Manual — Replication Threads](https://dev.mysql.com/doc/refman/8.4/en/replication-threads.html)
- [Percona — How InnoDB Handles Redo Logging](https://www.percona.com/blog/how-innodb-handles-redo-logging/)
- [Percona — How Does MySQL Replication Really Work?](https://www.percona.com/blog/how-does-mysql-replication-really-work/)
- [Alibaba Cloud — Redo Log, Undo Log, and Binlog](https://www.alibabacloud.com/blog/what-are-the-differences-and-functions-of-the-redo-log-undo-log-and-binlog-in-mysql_598035)
- [Alibaba Cloud — In-Depth Analysis of REDO Logs](https://www.alibabacloud.com/blog/an-in-depth-analysis-of-redo-logs-in-innodb_598965)
- [Red Gate — Exploring MVCC and InnoDB's Multi-Versioning](https://www.red-gate.com/simple-talk/databases/mysql/exploring-mvcc-and-innodbs-multi-versioning-technique/)
- [Arpit Bhayani — MySQL Replication Internals](https://arpitbhayani.me/blogs/mysql-replication-internals/)
- [DeepWiki — InnoDB Transaction and Locking System](https://deepwiki.com/mysql/mysql-server/2.1.1-innodb-transaction-and-locking-system)
