---
title: "How a MySQL UPDATE Actually Works: InnoDB Internals Animated"
date: 2026-04-12T10:00:00.000Z
description: "Step-by-step animation of what happens inside MySQL when you run an UPDATE. From client packet to redo log fsync — every layer of InnoDB explained with interactive visualization."
categories:
  - mysql
  - database-performance
read_time: 12
featured: true
author: "Mughees Ahmed"
dateModified: "2026-04-12T00:00:00+00:00"
coverImage: "/images/blog/mysql-8-to-8-4-upgrade-execution.jpg"
---

You run `UPDATE orders SET status = 'shipped' WHERE id = 42` and get back "1 row affected" in 2 milliseconds. But what actually happened inside MySQL during those 2 milliseconds?

Understanding the internal execution path is essential for diagnosing lock contention, crash recovery behavior, replication lag, and write performance bottlenecks. This guide walks through every layer — from the TCP packet hitting mysqld to the dirty page being flushed to disk — with an interactive animation you can step through.

<div class="callout">
<strong>Sources:</strong> This walkthrough is cross-referenced against the <a href="https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html">MySQL 8.4 Reference Manual (InnoDB Redo Log)</a>, <a href="https://www.percona.com/blog/how-innodb-handles-redo-logging/">Percona's InnoDB redo logging deep-dive</a>, and <a href="https://www.alibabacloud.com/blog/what-are-the-differences-and-functions-of-the-redo-log-undo-log-and-binlog-in-mysql_598035">Alibaba Cloud's redo/undo/binlog analysis</a>.
</div>

## Interactive Animation

Click **Play** to watch the full UPDATE lifecycle step by step. Each card expands with technical details when active.

<div style="background:#F4F6F8;border-radius:16px;padding:32px 20px 48px;margin:24px 0;overflow:hidden;border:1px solid #DDE3E9;">
<style>
  .upd-flow * { margin: 0; padding: 0; box-sizing: border-box; }
  .upd-flow { font-family: 'Inter', sans-serif; color: #444; max-width: 720px; margin: 0 auto; }
  .upd-progress { height: 3px; background: linear-gradient(90deg, #1A5276, #2980B9, #E67E22); transition: width 0.5s ease; width: 0%; border-radius: 2px; margin-bottom: 24px; }
  .upd-controls { display: flex; justify-content: center; gap: 10px; margin-bottom: 28px; flex-wrap: wrap; }
  .upd-controls button { padding: 8px 20px; border: none; border-radius: 6px; font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .upd-btn-play { background: linear-gradient(135deg, #1E8449, #27AE60); color: #fff; }
  .upd-btn-play:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(30,132,73,0.3); }
  .upd-btn-reset { background: #fff; color: #777; border: 1px solid #DDE3E9 !important; }
  .upd-btn-reset:hover { background: #EAF2F8; color: #444; }
  .upd-btn-speed { background: #fff; color: #1A5276; border: 1px solid #D6EAF8 !important; font-size: 0.8rem; padding: 6px 14px; }
  .upd-btn-speed:hover { background: #EAF2F8; }
  .upd-btn-speed.active { background: #1A5276; color: #fff; }
  .upd-steps { display: flex; flex-direction: column; align-items: center; gap: 0; }
  .upd-conn { width: 2px; height: 28px; background: #DDE3E9; opacity: 0; transition: opacity 0.3s; }
  .upd-conn.vis { opacity: 1; }
  .upd-conn.act { background: #E67E22; box-shadow: 0 0 6px rgba(230,126,34,0.3); }
  .upd-step { opacity: 0; transform: translateY(20px) scale(0.97); transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); width: 100%; }
  .upd-step.vis { opacity: 1; transform: translateY(0) scale(1); }
  .upd-card { border-radius: 10px; padding: 14px 18px; transition: box-shadow 0.4s; }
  .upd-step.act .upd-card { box-shadow: 0 0 16px rgba(230,126,34,0.12), 0 4px 12px rgba(0,0,0,0.06); }
  .upd-num { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; font-weight: 800; font-size: 0.75rem; margin-right: 8px; flex-shrink: 0; }
  .upd-hdr { display: flex; align-items: center; margin-bottom: 4px; }
  .upd-title { font-size: 0.95rem; font-weight: 700; color: #1a1a2e; }
  .upd-desc { color: #777; font-size: 0.82rem; margin-left: 34px; line-height: 1.5; }
  .upd-detail { display: none; background: #fff; border: 1px solid #DDE3E9; border-radius: 8px; padding: 10px 14px; font-size: 0.78rem; color: #666; margin: 8px 0 0 34px; line-height: 1.55; }
  .upd-step.act .upd-detail { display: block; }
  .upd-section { border: 1px solid #DDE3E9; border-radius: 14px; padding: 14px; width: 100%; opacity: 0; transform: translateY(15px); transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); background: #fff; }
  .upd-section.vis { opacity: 1; transform: translateY(0); }
  .upd-section-label { font-weight: 700; font-size: 0.85rem; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
  .upd-section .upd-steps { gap: 0; }
  .upd-par { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
  .upd-par .upd-step { max-width: 100%; }
  .upd-repeat { color: #999; font-size: 0.78rem; font-style: italic; text-align: center; padding: 6px 0; opacity: 0; transition: opacity 0.4s; }
  .upd-repeat.vis { opacity: 1; }
  /* Themes — Light */
  .t-client .upd-card { background: #fff; border: 1px solid #DDE3E9; }
  .t-client .upd-num { background: #1A5276; color: #fff; }
  .t-sql .upd-card { background: #F0F4FF; border: 1px solid #2980B933; }
  .t-sql .upd-num { background: #2980B9; color: #fff; }
  .t-sql-sec { border-color: #2980B933; }
  .t-sql-sec .upd-section-label { color: #2980B9; border-color: #2980B922; }
  .t-exec .upd-card { background: #EAF2F8; border: 1px solid #1A527633; }
  .t-exec .upd-num { background: #1A5276; color: #fff; }
  .t-lock .upd-card { background: #FFF8EC; border: 1px solid #E67E2233; }
  .t-lock .upd-num { background: #E67E22; color: #fff; }
  .t-undo .upd-card { background: #FFF8EC; border: 1px solid #CA6F1E33; }
  .t-undo .upd-num { background: #CA6F1E; color: #fff; }
  .t-buf .upd-card { background: #ECFDF5; border: 1px solid #1E844933; }
  .t-buf .upd-num { background: #1E8449; color: #fff; }
  .t-redo .upd-card { background: #FEF2F2; border: 1px solid #C0392B33; }
  .t-redo .upd-num { background: #C0392B; color: #fff; }
  .t-cb .upd-card { background: #F0FFF4; border: 1px solid #27AE6033; }
  .t-cb .upd-num { background: #27AE60; color: #fff; }
  .t-innodb-sec { border-color: #1E844933; background: #FAFFFE; }
  .t-innodb-sec .upd-section-label { color: #1E8449; border-color: #1E844922; }
  .t-prepare .upd-card { background: #F5F3FF; border: 1px solid #8E44AD33; }
  .t-prepare .upd-num { background: #8E44AD; color: #fff; }
  .t-binlog .upd-card { background: #EAF2F8; border: 1px solid #2980B933; }
  .t-binlog .upd-num { background: #2980B9; color: #fff; }
  .t-commit .upd-card { background: #FEF2F2; border: 1px solid #C0392B44; }
  .t-commit .upd-num { background: #C0392B; color: #fff; }
  .t-commit-sec { border-color: #C0392B22; background: #FFFAFA; }
  .t-commit-sec .upd-section-label { color: #C0392B; border-color: #C0392B22; }
  .t-ok .upd-card { background: #ECFDF5; border: 1px solid #1E844944; }
  .t-ok .upd-num { background: #1E8449; color: #fff; }
  .t-bg .upd-card { background: #F4F6F8; border: 1px solid #DDE3E9; }
  .t-bg .upd-num { background: #777; color: #fff; }
  @media (max-width: 600px) { .upd-par { grid-template-columns: 1fr; } }
</style>

<div class="upd-flow">
  <div class="upd-progress" id="updProgress"></div>
  <div class="upd-controls">
    <button class="upd-btn-play" id="updPlay" onclick="updPlay()">&#9654; Play</button>
    <button class="upd-btn-reset" onclick="updReset()">&#8634; Reset</button>
    <button class="upd-btn-speed" onclick="updSpd(this,2000)">Slow</button>
    <button class="upd-btn-speed active" onclick="updSpd(this,1200)">Normal</button>
    <button class="upd-btn-speed" onclick="updSpd(this,600)">Fast</button>
  </div>

  <div class="upd-steps" id="updSteps">
    <!-- 1: Client -->
    <div class="upd-step t-client" data-s="1">
      <div class="upd-card">
        <div class="upd-hdr"><div class="upd-num">1</div><div class="upd-title">Client sends UPDATE</div></div>
        <div class="upd-desc">Application issues UPDATE over MySQL wire protocol (COM_QUERY packet via TCP/socket).</div>
        <div class="upd-detail">The client library serializes the SQL into a COM_QUERY packet. Connection may be pooled (ProxySQL, HikariCP) or direct. The packet includes the full SQL text.</div>
      </div>
    </div>
    <div class="upd-conn" data-a="1"></div>

    <!-- SQL Layer -->
    <div class="upd-section t-sql-sec" data-sec="sql">
      <div class="upd-section-label">MySQL SQL Layer</div>
      <div class="upd-steps">
        <div class="upd-par">
          <div class="upd-step t-sql" data-s="2">
            <div class="upd-card">
              <div class="upd-hdr"><div class="upd-num">2</div><div class="upd-title">Parser</div></div>
              <div class="upd-desc">Tokenize &rarr; Bison grammar &rarr; AST</div>
              <div class="upd-detail">The tokenizer breaks SQL into tokens. The Bison-generated parser produces an abstract syntax tree. Invalid SQL is rejected here with a syntax error (error 1064).</div>
            </div>
          </div>
          <div class="upd-step t-sql" data-s="2b">
            <div class="upd-card">
              <div class="upd-hdr"><div class="upd-num">3</div><div class="upd-title">Optimizer</div></div>
              <div class="upd-desc">Cost-based: choose index &amp; access path</div>
              <div class="upd-detail">The cost-based optimizer evaluates possible indexes and access paths. For UPDATE, it picks the fastest way to locate the target rows. You can see its decision with EXPLAIN UPDATE.</div>
            </div>
          </div>
        </div>
        <div class="upd-conn" data-a="3"></div>
        <div class="upd-step t-exec" data-s="4">
          <div class="upd-card">
            <div class="upd-hdr"><div class="upd-num">4</div><div class="upd-title">Executor</div></div>
            <div class="upd-desc">Iterate matching rows via handler API, call ha_update_row() for each.</div>
            <div class="upd-detail">The executor uses the handler interface (InnoDB's API) to read qualifying rows one by one. For each match, it calls ha_update_row() which enters the InnoDB storage engine layer.</div>
          </div>
        </div>
      </div>
    </div>
    <div class="upd-conn" data-a="4"></div>

    <!-- InnoDB per-row -->
    <div class="upd-section t-innodb-sec" data-sec="innodb">
      <div class="upd-section-label">InnoDB Storage Engine (per row)</div>
      <div class="upd-steps">
        <div class="upd-par">
          <div class="upd-step t-lock" data-s="5">
            <div class="upd-card">
              <div class="upd-hdr"><div class="upd-num">5</div><div class="upd-title">Acquire row lock</div></div>
              <div class="upd-desc">Exclusive (X) lock + gap/next-key lock</div>
              <div class="upd-detail">InnoDB acquires an exclusive (X) lock on the clustered index record. In REPEATABLE READ (default), a next-key lock (record + gap) prevents phantom reads. Lock waits happen here if another transaction holds the lock.</div>
            </div>
          </div>
          <div class="upd-step t-undo" data-s="5b">
            <div class="upd-card">
              <div class="upd-hdr"><div class="upd-num">6</div><div class="upd-title">Write undo log</div></div>
              <div class="upd-desc">Before-image &rarr; rollback segment</div>
              <div class="upd-detail">The before-image of the row is written to the undo tablespace. This serves two purposes: (1) rollback if the transaction aborts, (2) MVCC — other transactions running consistent reads see this old version via the undo chain.</div>
            </div>
          </div>
        </div>
        <div class="upd-conn" data-a="6"></div>
        <div class="upd-par">
          <div class="upd-step t-buf" data-s="7">
            <div class="upd-card">
              <div class="upd-hdr"><div class="upd-num">7</div><div class="upd-title">Modify in buffer pool</div></div>
              <div class="upd-desc">Load page into memory, update row, mark dirty</div>
              <div class="upd-detail">The clustered index page is read into the buffer pool (if not already cached). The row is updated in-place in memory. The page is flagged as "dirty" and added to the flush list for eventual write to disk.</div>
            </div>
          </div>
          <div class="upd-step t-redo" data-s="7b">
            <div class="upd-card">
              <div class="upd-hdr"><div class="upd-num">8</div><div class="upd-title">Write redo log (WAL)</div></div>
              <div class="upd-desc">Physiological change record + LSN to log buffer</div>
              <div class="upd-detail">A redo log record describing the physical change is written to the redo log buffer within the same mini-transaction (mtr). This is the Write-Ahead Log — the redo record must be durable before the dirty page can be considered committed. The LSN (Log Sequence Number) advances.</div>
            </div>
          </div>
        </div>
        <div class="upd-conn" data-a="8"></div>
        <div class="upd-step t-cb" data-s="9">
          <div class="upd-card">
            <div class="upd-hdr"><div class="upd-num">9</div><div class="upd-title">Change buffer (secondary indexes)</div></div>
            <div class="upd-desc">Defer non-unique secondary index writes if page not in buffer pool.</div>
            <div class="upd-detail">If the UPDATE affects a non-unique secondary index and that index page is NOT in the buffer pool, InnoDB defers the write into the change buffer. This avoids expensive random I/O. The change is merged later when the page is eventually read. Unique indexes cannot use the change buffer (uniqueness check requires reading the page).</div>
          </div>
        </div>
        <div class="upd-repeat" id="updRepeat">&#8635; Repeat steps 5-9 for each matching row, then&hellip;</div>
      </div>
    </div>
    <div class="upd-conn" data-a="9b"></div>

    <!-- Two-Phase Commit -->
    <div class="upd-section t-commit-sec" data-sec="commit">
      <div class="upd-section-label">Two-Phase Commit (when binlog enabled)</div>
      <div class="upd-steps">
        <div class="upd-step t-prepare" data-s="10">
          <div class="upd-card">
            <div class="upd-hdr"><div class="upd-num">10</div><div class="upd-title">InnoDB PREPARE</div></div>
            <div class="upd-desc">Write prepare record to redo log. Transaction is now "prepared" but not committed.</div>
            <div class="upd-detail">InnoDB writes an XA PREPARE record to the redo log. At this point, if MySQL crashes, the transaction can be recovered during restart by checking the binary log. This is the first phase of the two-phase commit (2PC).</div>
          </div>
        </div>
        <div class="upd-conn" data-a="10"></div>
        <div class="upd-step t-binlog" data-s="11">
          <div class="upd-card">
            <div class="upd-hdr"><div class="upd-num">11</div><div class="upd-title">Write binary log</div></div>
            <div class="upd-desc">Server layer writes the statement/row event to binlog. Group commit batches the fsync.</div>
            <div class="upd-detail">The binary log operates at the MySQL server layer (above InnoDB). It records the change for replication and point-in-time recovery. With sync_binlog=1, the binlog is fsynced to disk. Binary Log Group Commit (BLGC) batches multiple transactions into a single fsync for performance.</div>
          </div>
        </div>
        <div class="upd-conn" data-a="11"></div>
        <div class="upd-step t-commit" data-s="12">
          <div class="upd-card">
            <div class="upd-hdr"><div class="upd-num">12</div><div class="upd-title">InnoDB COMMIT</div></div>
            <div class="upd-desc">Write commit record to redo log &rarr; fsync. Transaction is now durable.</div>
            <div class="upd-detail">InnoDB writes a COMMIT record to the redo log and flushes it to disk (when innodb_flush_log_at_trx_commit=1). The transaction is now crash-safe and durable. Locks acquired in step 5 are released. The undo log entry is marked as eligible for purge.</div>
          </div>
        </div>
      </div>
    </div>
    <div class="upd-conn" data-a="12"></div>

    <!-- OK packet -->
    <div class="upd-step t-ok" data-s="13">
      <div class="upd-card">
        <div class="upd-hdr"><div class="upd-num">13</div><div class="upd-title">OK packet &rarr; client</div></div>
        <div class="upd-desc">Server returns OK packet with affected rows count. The application continues.</div>
        <div class="upd-detail">The OK_Packet contains: affected_rows (number of rows changed), last_insert_id (0 for UPDATE), and status flags. The client library receives this and your application's "1 row affected" message comes from here.</div>
      </div>
    </div>
    <div class="upd-conn" data-a="13"></div>

    <!-- Background -->
    <div class="upd-step t-bg" data-s="14">
      <div class="upd-card">
        <div class="upd-hdr"><div class="upd-num">14</div><div class="upd-title">Background flush (async)</div></div>
        <div class="upd-desc">Page cleaner threads flush dirty pages: buffer pool &rarr; doublewrite buffer &rarr; tablespace files.</div>
        <div class="upd-detail">The page cleaner threads periodically flush dirty pages from the buffer pool. Pages are first written to the doublewrite buffer (protects against torn/partial page writes during crashes), then to the actual tablespace .ibd files. The purge thread also cleans up undo log entries that are no longer needed by any active MVCC snapshot.</div>
      </div>
    </div>
  </div>
</div>

<script>
(function(){
  var STEPS=['1','2','2b','4','5','5b','7','7b','9','10','11','12','13','14'];
  var TOTAL=STEPS.length;
  var spd=1200,playing=false,cur=0,tmr=null;

  window.updSpd=function(b,ms){
    spd=ms;
    document.querySelectorAll('.upd-btn-speed').forEach(function(x){x.classList.remove('active')});
    b.classList.add('active');
  };

  function show(s){
    // Show section boxes
    if(s==='2')document.querySelector('[data-sec="sql"]').classList.add('vis');
    if(s==='5')document.querySelector('[data-sec="innodb"]').classList.add('vis');
    if(s==='10')document.querySelector('[data-sec="commit"]').classList.add('vis');

    var el=document.querySelector('[data-s="'+s+'"]');
    if(el){el.classList.add('vis');el.classList.add('act');}

    // Show connector
    var prev={'2':'1','4':'3','5':'4','7':'6','9':'8','10':'9b','11':'10','12':'11','13':'12','14':'13'};
    if(prev[s]){
      document.querySelectorAll('.upd-conn').forEach(function(c){
        if(c.getAttribute('data-a')===prev[s])c.classList.add('vis','act');
      });
    }

    // Deactivate previous
    setTimeout(function(){
      document.querySelectorAll('.upd-step').forEach(function(x){
        if(x.getAttribute('data-s')!==s)x.classList.remove('act');
      });
      document.querySelectorAll('.upd-conn').forEach(function(c){c.classList.remove('act')});
    },spd*0.7);

    // Repeat label after step 9
    if(s==='9')setTimeout(function(){document.getElementById('updRepeat').classList.add('vis')},spd*0.3);

    // Progress
    document.getElementById('updProgress').style.width=((STEPS.indexOf(s)+1)/TOTAL*100)+'%';
  }

  window.updPlay=function(){
    if(playing)return;
    playing=true;
    var btn=document.getElementById('updPlay');
    btn.textContent='Playing...';btn.style.opacity='0.6';
    function next(){
      if(cur>=TOTAL){playing=false;btn.textContent='Complete';btn.style.opacity='1';return;}
      show(STEPS[cur]);cur++;tmr=setTimeout(next,spd);
    }
    next();
  };

  window.updReset=function(){
    playing=false;cur=0;if(tmr)clearTimeout(tmr);
    document.querySelectorAll('.upd-step').forEach(function(x){x.classList.remove('vis','act')});
    document.querySelectorAll('.upd-conn').forEach(function(c){c.classList.remove('vis','act')});
    document.querySelectorAll('.upd-section').forEach(function(x){x.classList.remove('vis')});
    document.getElementById('updRepeat').classList.remove('vis');
    document.getElementById('updProgress').style.width='0%';
    var btn=document.getElementById('updPlay');btn.textContent='\u25B6 Play';btn.style.opacity='1';
  };
})();
</script>
</div>

## The Full Path, Explained

### Step 1: Client Sends the UPDATE

Your application calls something like `conn.execute("UPDATE orders SET status = 'shipped' WHERE id = 42")`. The MySQL client library (libmysqlclient, mysqlclient for Python, JDBC for Java) serializes this SQL text into a **COM_QUERY packet** and sends it over TCP or a Unix socket to the mysqld process.

If you're using a connection pool (ProxySQL, PgBouncer equivalent, or HikariCP), the packet goes through the pool first, which may add microseconds of latency.

### Steps 2-3: SQL Layer — Parser and Optimizer

The **parser** tokenizes the SQL and feeds it into a Bison-generated grammar that produces an Abstract Syntax Tree (AST). Invalid SQL dies here with error 1064.

The **optimizer** then takes over. Even for a simple `WHERE id = 42`, the optimizer evaluates whether to use the primary key, a secondary index, or (worst case) a full table scan. For UPDATE specifically, the optimizer also considers:

- Whether the updated columns are part of any secondary index (affects what needs to be modified)
- Whether a covering index could speed up the row lookup

You can see the optimizer's decision with `EXPLAIN UPDATE orders SET status = 'shipped' WHERE id = 42` — try it in the [EXPLAIN Analyzer](/tools/explain/) to see the access type and key choice.

### Step 4: Executor

The executor uses MySQL's **handler API** — the internal interface between the SQL layer and storage engines. For each row matching the WHERE clause, it calls `ha_update_row()`, which enters InnoDB's storage engine code.

For a single-row UPDATE by primary key, the executor finds one row and calls the handler once. For `UPDATE orders SET status = 'shipped' WHERE created_at < '2024-01-01'`, it iterates through potentially thousands of rows, calling the handler for each one.

### Step 5: Acquire Row Lock

InnoDB acquires an **exclusive (X) lock** on the clustered index record. In the default `REPEATABLE READ` isolation level, this is actually a **next-key lock** — it locks both the record and the gap before it, preventing phantom reads by other transactions.

This is where **lock contention** happens. If another transaction already holds a lock on this row, your UPDATE waits here. You can diagnose this with:

```sql
SELECT * FROM performance_schema.data_locks WHERE LOCK_TYPE = 'RECORD';
```

### Step 6: Write Undo Log

Before modifying the row, InnoDB writes the **before-image** (the old version of the row) to the **undo tablespace**. This serves two critical purposes:

1. **Rollback** — if the transaction is rolled back, InnoDB uses the undo log to restore the original row
2. **MVCC** — other transactions running `SELECT` with a consistent read snapshot see this old version through the undo chain, not your uncommitted change

The undo log lives in the undo tablespace (separate `.ibu` files in MySQL 8.0+) or the system tablespace in older versions. Each transaction gets a pointer to its undo records.

### Steps 7-8: Buffer Pool Modification + Redo Log (WAL)

These happen within the same **mini-transaction (mtr)** — InnoDB's internal mechanism for atomic page operations:

**Step 7:** The clustered index page containing the target row is loaded into the **buffer pool** (if not already cached). The row is updated in-place in memory. The page is marked as **dirty** — meaning its in-memory version differs from the on-disk version.

**Step 8:** A **redo log record** is written to the redo log buffer. This is the **Write-Ahead Log (WAL)** principle — the redo record that describes the change must be durable on disk *before* the transaction can be considered committed. The Log Sequence Number (LSN) advances.

The redo log record is "physiological" — it describes the physical change to a specific page, not the logical SQL. This makes crash recovery fast: InnoDB replays redo records against pages, rather than re-executing SQL.

### Step 9: Change Buffer (Secondary Indexes)

If the UPDATE modifies a column that's part of a **non-unique secondary index**, and that index page is **not currently in the buffer pool**, InnoDB defers the index update into the **change buffer**. This avoids a random I/O read just to update an index entry.

The deferred change is merged later when the secondary index page is eventually read into the buffer pool (e.g., by a subsequent query that uses that index).

**Important:** Unique indexes **cannot** use the change buffer because InnoDB must read the page to check uniqueness constraints.

### Steps 10-12: Two-Phase Commit

When the binary log is enabled (which it is on any production MySQL server), the commit process uses a **two-phase commit (2PC)** to keep the redo log and binlog in sync:

**Step 10 — InnoDB PREPARE:** InnoDB writes a PREPARE record to the redo log. The transaction is now "prepared" — if MySQL crashes after this point but before the binlog write, crash recovery can determine whether to commit or roll back by checking the binary log.

**Step 11 — Write Binary Log:** The MySQL server layer writes the UPDATE event to the binary log. With `sync_binlog=1` (recommended for production), this triggers an fsync. **Binary Log Group Commit (BLGC)** batches multiple transactions into a single fsync — this is why `sync_binlog=1` doesn't kill performance as badly as you'd expect.

**Step 12 — InnoDB COMMIT:** InnoDB writes a COMMIT record to the redo log and flushes it to disk (with `innodb_flush_log_at_trx_commit=1`). The transaction is now **crash-safe and durable**. Row locks from step 5 are released. The undo log entry is marked as eligible for purge.

### Step 13: OK Packet

The server sends an **OK_Packet** back to the client containing:
- `affected_rows`: how many rows were actually changed (not matched — rows where the new value equals the old value are not counted unless `CLIENT_FOUND_ROWS` flag is set)
- `last_insert_id`: 0 for UPDATE
- Status flags indicating autocommit state

### Step 14: Background Flush (Async)

After the OK is sent, dirty pages still sit in the buffer pool. The **page cleaner threads** periodically flush them to disk:

1. Dirty page → **doublewrite buffer** (protects against torn page writes during crash)
2. Doublewrite buffer → actual **tablespace .ibd file**

Separately, the **purge thread** cleans up undo log entries that are no longer needed by any active MVCC read view.

This is why MySQL can acknowledge your UPDATE in 2ms even though the actual data page might not hit disk for seconds or minutes — the redo log guarantees crash safety, and the background flush handles eventual persistence.

## Key Takeaways

| Layer | What Happens | Why It Matters |
|-------|-------------|----------------|
| SQL Layer | Parse → Optimize → Execute | Bad optimizer choices = slow queries (use EXPLAIN) |
| Row Lock | X lock + gap lock | Lock contention = transaction waits |
| Undo Log | Before-image saved | Enables rollback + MVCC reads |
| Buffer Pool | In-memory page update | Dirty pages stay in RAM until flushed |
| Redo Log (WAL) | Change record + LSN | Crash safety — survives power failure |
| Change Buffer | Deferred secondary index writes | Reduces random I/O for non-unique indexes |
| 2PC + Binlog | PREPARE → binlog → COMMIT | Keeps redo log and binlog in sync for replication |
| Background Flush | Doublewrite → tablespace | Eventual persistence of dirty pages |

## Configuration That Controls Each Step

| Parameter | Step | Default | Production Recommendation |
|-----------|------|---------|--------------------------|
| `innodb_flush_log_at_trx_commit` | 12 (commit) | 1 | Keep at 1 (durability). Set to 2 only if you accept 1-second data loss risk. |
| `sync_binlog` | 11 (binlog) | 1 | Keep at 1 for crash safety. Group commit reduces the performance impact. |
| `innodb_buffer_pool_size` | 7 (buffer pool) | 128MB | Set to 70-80% of available RAM on dedicated servers. |
| `innodb_change_buffer_max_size` | 9 (change buffer) | 25% of pool | Reduce if workload is read-heavy; increase for write-heavy with many secondary indexes. |
| `innodb_undo_tablespaces` | 6 (undo) | 2 | Default is fine. Increase for extreme write-heavy workloads. |
| `innodb_page_cleaners` | 14 (flush) | 4 | Match to `innodb_buffer_pool_instances` for parallel flushing. |
| `transaction_isolation` | 5 (lock) | REPEATABLE-READ | READ-COMMITTED reduces gap locking if phantom reads are acceptable. |

<div class="post-cta-inline">
  <h4>Slow UPDATEs in production?</h4>
  <p>Book a free 30-minute assessment and I'll help you diagnose the bottleneck — whether it's lock contention, missing indexes, or I/O configuration.</p>
  <a href="/contact.html" class="btn">Book Free Assessment &rarr;</a>
</div>

<div class="related-posts">
<h3>Related Articles</h3>
<div class="related-grid">
<a class="related-card" href="/blog/mysql-explain-output-complete-guide.html">
<div class="rc-cat">MySQL</div>
<h4>MySQL EXPLAIN Output Explained: The Complete Guide</h4>
</a>
<a class="related-card" href="/blog/mysql-explain-analyzer-free-query-plan-visualizer.html">
<div class="rc-cat">Tools</div>
<h4>We Built a Free MySQL EXPLAIN Analyzer</h4>
</a>
</div>
</div>
