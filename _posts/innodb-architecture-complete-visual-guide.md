---
title: "InnoDB Architecture: The Complete Visual Guide"
date: 2026-04-12T08:00:00.000Z
description: "Interactive visual guide to every InnoDB component — buffer pool, redo log, undo log, change buffer, doublewrite, and tablespaces. Step through the architecture and see how data flows between memory and disk."
categories:
  - mysql
  - database-performance
read_time: 15
featured: true
author: "Mughees Ahmed"
dateModified: "2026-04-12T00:00:00+00:00"
coverImage: "/images/blog/mysql-8-to-8-4-upgrade-pre-upgrade-preparation.jpg"
---

Every query you run in MySQL passes through the InnoDB storage engine — the default engine since MySQL 5.5. InnoDB manages how your data is stored in memory, written to disk, recovered after crashes, and kept consistent across concurrent transactions.

Understanding InnoDB's architecture is the foundation for everything else: query performance, crash recovery, replication, locking, and capacity planning. This guide gives you an interactive map of every component and how they connect.

<div class="callout">
<strong>Source:</strong> This guide is based on the <a href="https://dev.mysql.com/doc/refman/9.6/en/innodb-architecture.html">MySQL 9.6 Reference Manual — InnoDB Architecture</a> and cross-referenced with <a href="https://dev.mysql.com/doc/refman/8.4/en/innodb-in-memory-structures.html">InnoDB In-Memory Structures</a> and <a href="https://dev.mysql.com/doc/refman/8.4/en/innodb-on-disk-structures.html">InnoDB On-Disk Structures</a>.
</div>

## Interactive Architecture Explorer

Click **Next** to explore each InnoDB component. Connections between components light up as you step through.

<div style="background:#F4F6F8;border-radius:16px;margin:24px 0;overflow:clip;border:1px solid #DDE3E9;">
<style>
  .arch * { margin:0;padding:0;box-sizing:border-box; }
  .arch { font-family:'Inter',sans-serif;color:#444;max-width:800px;margin:0 auto;padding:0 20px 40px; }
  .arch-header { position:sticky;top:72px;z-index:10;background:#F4F6F8;padding:20px 0 0; }
  .arch-progress { height:3px;background:linear-gradient(90deg,#1A5276,#2980B9,#E67E22);transition:width 0.5s;width:0%;border-radius:2px;margin-bottom:16px; }
  .arch-controls { display:flex;justify-content:center;gap:10px;margin-bottom:0;flex-wrap:wrap;align-items:center;padding:0 0 14px;border-bottom:1px solid #DDE3E9; }
  .arch-controls button { padding:8px 20px;border:none;border-radius:6px;font-family:inherit;font-size:0.85rem;font-weight:600;cursor:pointer;transition:all 0.2s; }
  .arch-btn-next { background:linear-gradient(135deg,#1A5276,#2980B9);color:#fff;padding:10px 28px;font-size:0.9rem; }
  .arch-btn-next:hover { transform:translateY(-1px);box-shadow:0 4px 12px rgba(26,82,118,0.3); }
  .arch-btn-next:disabled { opacity:0.4;cursor:default;transform:none;box-shadow:none; }
  .arch-btn-prev { background:#fff;color:#1A5276;border:1px solid #D6EAF8 !important; }
  .arch-btn-prev:hover { background:#EAF2F8; }
  .arch-btn-prev:disabled { opacity:0.3;cursor:default; }
  .arch-btn-reset { background:#fff;color:#777;border:1px solid #DDE3E9 !important; }
  .arch-btn-reset:hover { background:#EAF2F8;color:#444; }
  .arch-counter { font-size:0.82rem;color:#777;font-weight:600;min-width:70px;text-align:center; }

  /* Architecture layout */
  .arch-diagram { display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px; }
  .arch-panel { border-radius:12px;padding:16px;border:1px solid #DDE3E9;background:#fff; }
  .arch-panel-title { font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #eee; }
  .arch-mem .arch-panel-title { color:#2980B9; }
  .arch-disk .arch-panel-title { color:#1E8449; }

  /* Component cards */
  .arch-comp { border-radius:10px;padding:12px 14px;margin-bottom:8px;opacity:0.35;transition:all 0.5s cubic-bezier(0.16,1,0.3,1);border:1px solid transparent;cursor:default; }
  .arch-comp.vis { opacity:1; }
  .arch-comp.act { border-color:#E67E22;box-shadow:0 0 12px rgba(230,126,34,0.1),0 2px 8px rgba(0,0,0,0.05); }
  .arch-comp-name { font-size:0.9rem;font-weight:700;color:#1a1a2e;display:flex;align-items:center;gap:8px; }
  .arch-comp-icon { width:22px;height:22px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:800;color:#fff;flex-shrink:0; }
  .arch-comp-desc { font-size:0.78rem;color:#777;margin-top:4px;line-height:1.5; }
  .arch-comp-detail { display:none;font-size:0.76rem;color:#666;margin-top:8px;padding:10px 12px;background:#F4F6F8;border-radius:6px;line-height:1.55;border:1px solid #eee; }
  .arch-comp.act .arch-comp-detail { display:block; }
  .arch-comp-config { font-size:0.72rem;color:#2980B9;font-weight:600;margin-top:6px; }

  /* Memory component colors */
  .c-bp { background:#ECFDF5; } .c-bp .arch-comp-icon { background:#1E8449; }
  .c-ahi { background:#F0F4FF; } .c-ahi .arch-comp-icon { background:#2980B9; }
  .c-cb { background:#F0FFF4; } .c-cb .arch-comp-icon { background:#27AE60; }
  .c-lb { background:#FEF2F2; } .c-lb .arch-comp-icon { background:#C0392B; }

  /* Disk component colors */
  .c-sys { background:#F4F6F8; } .c-sys .arch-comp-icon { background:#777; }
  .c-fpt { background:#EAF2F8; } .c-fpt .arch-comp-icon { background:#1A5276; }
  .c-undo { background:#FFF8EC; } .c-undo .arch-comp-icon { background:#CA6F1E; }
  .c-redo { background:#FEF2F2; } .c-redo .arch-comp-icon { background:#C0392B; }
  .c-dw { background:#F5F3FF; } .c-dw .arch-comp-icon { background:#8E44AD; }
  .c-tmp { background:#F4F6F8; } .c-tmp .arch-comp-icon { background:#999; }

  /* Flow arrows */
  .arch-flows { background:#fff;border-radius:10px;padding:14px;border:1px solid #DDE3E9;margin-bottom:12px; }
  .arch-flows-title { font-size:0.75rem;font-weight:700;color:#E67E22;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px; }
  .arch-flow { display:flex;align-items:center;gap:6px;font-size:0.76rem;color:#999;padding:4px 0;transition:all 0.4s;opacity:0.3; }
  .arch-flow.vis { opacity:1;color:#444; }
  .arch-flow.act { color:#E67E22;font-weight:600; }
  .arch-flow-arrow { color:#DDE3E9;font-weight:700;transition:color 0.4s; }
  .arch-flow.act .arch-flow-arrow { color:#E67E22; }

  /* Summary card */
  .arch-summary { background:#fff;border:1px solid #DDE3E9;border-radius:10px;padding:14px;opacity:0;transition:opacity 0.5s; }
  .arch-summary.vis { opacity:1; }
  .arch-summary-title { font-size:0.85rem;font-weight:700;color:#1A5276;margin-bottom:8px; }
  .arch-summary p { font-size:0.8rem;color:#666;line-height:1.6; }

  @media(max-width:640px){.arch-diagram{grid-template-columns:1fr;}}
</style>

<div class="arch">
  <div class="arch-header">
    <div class="arch-progress" id="archProgress"></div>
    <div class="arch-controls">
      <button class="arch-btn-prev" id="archPrev" onclick="archPrev()" disabled>&larr; Back</button>
      <button class="arch-btn-next" id="archNext" onclick="archNext()">Start Exploring &rarr;</button>
      <span class="arch-counter" id="archCounter">0 / 12</span>
      <button class="arch-btn-reset" onclick="archReset()">&#8634; Reset</button>
    </div>
  </div>
  <div style="padding-top:20px;">

  <div class="arch-diagram">
    <!-- In-Memory -->
    <div class="arch-panel arch-mem">
      <div class="arch-panel-title">In-Memory Structures</div>
      <div class="arch-comp c-bp" data-c="bp">
        <div class="arch-comp-name"><span class="arch-comp-icon">BP</span> Buffer Pool</div>
        <div class="arch-comp-desc">Caches data and index pages in memory</div>
        <div class="arch-comp-detail">
          The buffer pool is the most important InnoDB memory structure. It caches frequently accessed table and index data as 16KB pages. On a dedicated database server, set it to <strong>70-80% of available RAM</strong>. A buffer pool hit ratio below 95% indicates the pool is too small.
          <div class="arch-comp-config">innodb_buffer_pool_size = 70-80% of RAM</div>
        </div>
      </div>
      <div class="arch-comp c-ahi" data-c="ahi">
        <div class="arch-comp-name"><span class="arch-comp-icon">AH</span> Adaptive Hash Index</div>
        <div class="arch-comp-desc">Auto-built hash index on hot B-tree pages</div>
        <div class="arch-comp-detail">
          InnoDB automatically builds an in-memory hash index on frequently accessed index pages. This turns B-tree lookups into O(1) hash lookups for hot data. Can be disabled if it causes contention (check <code>SHOW ENGINE INNODB STATUS</code> for AHI hit ratio).
          <div class="arch-comp-config">innodb_adaptive_hash_index = ON (default)</div>
        </div>
      </div>
      <div class="arch-comp c-cb" data-c="cb">
        <div class="arch-comp-name"><span class="arch-comp-icon">CB</span> Change Buffer</div>
        <div class="arch-comp-desc">Buffers secondary index writes to reduce random I/O</div>
        <div class="arch-comp-detail">
          When an INSERT, UPDATE, or DELETE modifies a <strong>non-unique secondary index</strong> and the target page is not in the buffer pool, InnoDB defers the write into the change buffer. The change is merged later when the page is read. This avoids expensive random disk reads. <strong>Unique indexes cannot use the change buffer</strong> (uniqueness check requires reading the page).
          <div class="arch-comp-config">innodb_change_buffer_max_size = 25 (% of buffer pool)</div>
        </div>
      </div>
      <div class="arch-comp c-lb" data-c="lb">
        <div class="arch-comp-name"><span class="arch-comp-icon">LB</span> Log Buffer</div>
        <div class="arch-comp-desc">Holds redo log entries before flushing to disk</div>
        <div class="arch-comp-detail">
          The log buffer holds redo log records in memory before they are written to the redo log files on disk. It is flushed to disk at transaction commit (or when the buffer fills). A larger log buffer allows large transactions to run without flushing to disk before commit.
          <div class="arch-comp-config">innodb_log_buffer_size = 64MB (default)</div>
        </div>
      </div>
    </div>

    <!-- On-Disk -->
    <div class="arch-panel arch-disk">
      <div class="arch-panel-title">On-Disk Structures</div>
      <div class="arch-comp c-sys" data-c="sys">
        <div class="arch-comp-name"><span class="arch-comp-icon">SY</span> System Tablespace</div>
        <div class="arch-comp-desc">ibdata1 — data dictionary, doublewrite, change buffer on disk</div>
        <div class="arch-comp-detail">
          The system tablespace (<code>ibdata1</code>) contains the InnoDB data dictionary, doublewrite buffer storage, change buffer, and undo logs (in older MySQL versions). Since MySQL 5.6, table data is stored in file-per-table tablespaces by default, keeping ibdata1 smaller.
          <div class="arch-comp-config">innodb_data_file_path = ibdata1:12M:autoextend</div>
        </div>
      </div>
      <div class="arch-comp c-fpt" data-c="fpt">
        <div class="arch-comp-name"><span class="arch-comp-icon">TB</span> File-Per-Table (.ibd)</div>
        <div class="arch-comp-desc">One file per table — your actual data lives here</div>
        <div class="arch-comp-detail">
          Each InnoDB table gets its own <code>.ibd</code> file containing table data and indexes. This is the default since MySQL 5.6 (<code>innodb_file_per_table=ON</code>). Benefits: independent table management, easier backups, <code>OPTIMIZE TABLE</code> reclaims space. Each file contains 16KB pages organized as a B-tree (clustered index).
          <div class="arch-comp-config">innodb_file_per_table = ON (always keep on)</div>
        </div>
      </div>
      <div class="arch-comp c-undo" data-c="undo">
        <div class="arch-comp-name"><span class="arch-comp-icon">UN</span> Undo Tablespaces</div>
        <div class="arch-comp-desc">Before-images for rollback and MVCC</div>
        <div class="arch-comp-detail">
          Undo tablespaces store the before-images of rows modified by transactions. Two purposes: (1) rollback uncommitted transactions, (2) provide consistent read snapshots for MVCC. Since MySQL 8.0, undo logs are stored in separate <code>.ibu</code> files (not ibdata1). Long-running transactions prevent undo purge and cause tablespace growth.
          <div class="arch-comp-config">innodb_undo_tablespaces = 2 (default)</div>
        </div>
      </div>
      <div class="arch-comp c-redo" data-c="redo">
        <div class="arch-comp-name"><span class="arch-comp-icon">RL</span> Redo Log</div>
        <div class="arch-comp-desc">Write-ahead log for crash recovery</div>
        <div class="arch-comp-detail">
          The redo log records every change to InnoDB data. It is the Write-Ahead Log (WAL) — changes are logged here <strong>before</strong> the transaction is considered committed. During crash recovery, InnoDB replays the redo log to reconstruct committed transactions whose dirty pages hadn't been flushed to tablespace files yet. This is what makes InnoDB crash-safe.
          <div class="arch-comp-config">innodb_redo_log_capacity = 100MB (MySQL 8.0.30+)</div>
        </div>
      </div>
      <div class="arch-comp c-dw" data-c="dw">
        <div class="arch-comp-name"><span class="arch-comp-icon">DW</span> Doublewrite Buffer</div>
        <div class="arch-comp-desc">Protects against torn page writes during crash</div>
        <div class="arch-comp-detail">
          When dirty pages are flushed from the buffer pool, they are first written to the doublewrite buffer, then to their actual tablespace location. If a crash occurs mid-write (torn page), InnoDB recovers the good copy from the doublewrite buffer. This costs 2x write I/O but is essential for data integrity. <strong>Never disable this.</strong>
          <div class="arch-comp-config">innodb_doublewrite = ON (never disable)</div>
        </div>
      </div>
      <div class="arch-comp c-tmp" data-c="tmp">
        <div class="arch-comp-name"><span class="arch-comp-icon">TM</span> Temp Tablespace</div>
        <div class="arch-comp-desc">Temporary tables for sorts, GROUP BY, joins</div>
        <div class="arch-comp-detail">
          InnoDB creates temporary tables for operations that exceed memory limits: large sorts, GROUP BY with many groups, complex JOINs. Session temporary tablespace handles per-connection temp tables. The global temporary tablespace handles rollback segments for temp tables. These auto-extend and shrink on restart.
          <div class="arch-comp-config">innodb_temp_tablespaces_dir = ./#innodb_temp/</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Data Flow -->
  <div class="arch-flows">
    <div class="arch-flows-title">Data Flow Paths</div>
    <div class="arch-flow" data-f="read"><span>SELECT</span> <span class="arch-flow-arrow">&rarr;</span> <span>Buffer Pool</span> <span class="arch-flow-arrow">&rarr;</span> <span>Tablespace (.ibd)</span> <span style="color:#aaa;font-size:0.7rem;margin-left:4px">(on miss)</span></div>
    <div class="arch-flow" data-f="write"><span>INSERT/UPDATE</span> <span class="arch-flow-arrow">&rarr;</span> <span>Buffer Pool</span> <span class="arch-flow-arrow">+</span> <span>Log Buffer</span> <span class="arch-flow-arrow">&rarr;</span> <span>Redo Log</span></div>
    <div class="arch-flow" data-f="undo"><span>Before-image</span> <span class="arch-flow-arrow">&rarr;</span> <span>Undo Tablespace</span> <span style="color:#aaa;font-size:0.7rem;margin-left:4px">(for rollback + MVCC)</span></div>
    <div class="arch-flow" data-f="flush"><span>Dirty page</span> <span class="arch-flow-arrow">&rarr;</span> <span>Doublewrite</span> <span class="arch-flow-arrow">&rarr;</span> <span>Tablespace (.ibd)</span> <span style="color:#aaa;font-size:0.7rem;margin-left:4px">(background)</span></div>
    <div class="arch-flow" data-f="sec"><span>Secondary idx</span> <span class="arch-flow-arrow">&rarr;</span> <span>Change Buffer</span> <span class="arch-flow-arrow">&rarr;</span> <span>Merge later</span></div>
  </div>

  <!-- Summary (shown at the end) -->
  <div class="arch-summary" id="archSummary">
    <div class="arch-summary-title">The Complete Picture</div>
    <p>Every query flows through these components. <strong>Reads</strong> go through the buffer pool (and hit disk only on cache miss). <strong>Writes</strong> modify the buffer pool page, record the change in the redo log for crash safety, save a before-image in the undo log for rollback/MVCC, and optionally defer secondary index updates in the change buffer. <strong>Commits</strong> flush the log buffer to the redo log on disk. <strong>Background threads</strong> flush dirty pages through the doublewrite buffer to tablespace files.</p>
  </div>
  </div>
</div>

<script>
(function(){
  var COMPS=['bp','ahi','cb','lb','sys','fpt','undo','redo','dw','tmp'];
  var FLOWS={
    bp:['read','write'],ahi:['read'],cb:['sec','write'],lb:['write'],
    sys:[],fpt:['read','flush'],undo:['undo'],redo:['write'],dw:['flush'],tmp:[]
  };
  var TOTAL=COMPS.length+2; // +1 for intro, +1 for summary
  var cur=0;

  function updateUI(){
    document.getElementById('archCounter').textContent=cur+' / '+TOTAL;
    document.getElementById('archPrev').disabled=(cur===0);
    var nb=document.getElementById('archNext');
    if(cur>=TOTAL){nb.textContent='\u2713 Complete';nb.disabled=true;}
    else if(cur===0){nb.textContent='Start Exploring \u2192';}
    else{nb.textContent='Next Component \u2192';nb.disabled=false;}
    document.getElementById('archProgress').style.width=(cur/TOTAL*100)+'%';
  }

  function showComp(idx){
    if(idx===0) return; // intro step — just dims everything
    if(idx===TOTAL-1){
      // Summary step — show all + summary
      COMPS.forEach(function(c){
        var el=document.querySelector('[data-c="'+c+'"]');
        if(el){el.classList.add('vis');el.classList.remove('act');}
      });
      document.querySelectorAll('.arch-flow').forEach(function(f){f.classList.add('vis');f.classList.remove('act')});
      document.getElementById('archSummary').classList.add('vis');
      return;
    }
    var c=COMPS[idx-1];
    var el=document.querySelector('[data-c="'+c+'"]');
    if(el){el.classList.add('vis','act');}
    // Deactivate others
    COMPS.forEach(function(cc){
      if(cc!==c){var e=document.querySelector('[data-c="'+cc+'"]');if(e)e.classList.remove('act');}
    });
    // Show relevant flows
    document.querySelectorAll('.arch-flow').forEach(function(f){f.classList.remove('act')});
    var flows=FLOWS[c]||[];
    flows.forEach(function(fl){
      var f=document.querySelector('[data-f="'+fl+'"]');
      if(f){f.classList.add('vis','act');}
    });
    // Scroll into view
    if(el){
      setTimeout(function(){
        var header=document.querySelector('.arch-header');
        var headerBottom=header?header.getBoundingClientRect().bottom:132;
        var rect=el.getBoundingClientRect();
        if(rect.top<headerBottom||rect.bottom>window.innerHeight){
          var scrollTarget=rect.top+window.scrollY-headerBottom-10;
          window.scrollTo({top:scrollTarget,behavior:'smooth'});
        }
      },50);
    }
  }

  function hideComp(idx){
    if(idx===TOTAL-1){document.getElementById('archSummary').classList.remove('vis');return;}
    if(idx===0)return;
    var c=COMPS[idx-1];
    var el=document.querySelector('[data-c="'+c+'"]');
    if(el){el.classList.remove('vis','act');}
    // Hide flows
    var flows=FLOWS[c]||[];
    flows.forEach(function(fl){
      var f=document.querySelector('[data-f="'+fl+'"]');
      if(f){f.classList.remove('vis','act');}
    });
    // Re-activate previous
    if(cur>1){
      var pc=COMPS[cur-2];
      var pe=document.querySelector('[data-c="'+pc+'"]');
      if(pe)pe.classList.add('act');
      var pf=FLOWS[pc]||[];
      pf.forEach(function(fl){var f=document.querySelector('[data-f="'+fl+'"]');if(f)f.classList.add('act')});
    }
  }

  window.archNext=function(){
    if(cur>=TOTAL)return;
    showComp(cur);cur++;updateUI();
  };
  window.archPrev=function(){
    if(cur<=0)return;
    cur--;hideComp(cur);updateUI();
  };
  window.archReset=function(){
    cur=0;
    document.querySelectorAll('.arch-comp').forEach(function(x){x.classList.remove('vis','act')});
    document.querySelectorAll('.arch-flow').forEach(function(f){f.classList.remove('vis','act')});
    document.getElementById('archSummary').classList.remove('vis');
    updateUI();
  };
  updateUI();
})();
</script>
</div>

## The Components Explained

### In-Memory Structures

#### Buffer Pool — The Heart of InnoDB

The buffer pool is where InnoDB does most of its work. It caches table data and index pages as 16KB pages in memory. When a query needs to read a row, InnoDB first checks the buffer pool. If the page is there (cache hit), the read completes in microseconds. If not (cache miss), InnoDB reads the page from the `.ibd` file on disk — milliseconds slower.

**Sizing rule:** Set `innodb_buffer_pool_size` to **70-80% of available RAM** on dedicated database servers. A buffer pool hit ratio below 95% means you're hitting disk too often.

```sql
-- Check your hit ratio
SHOW STATUS LIKE 'Innodb_buffer_pool_read%';
-- Hit ratio = 1 - (Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests)
```

#### Adaptive Hash Index (AHI)

InnoDB monitors which index pages are accessed most frequently and automatically builds an in-memory hash index on top of the B-tree. This turns O(log n) B-tree lookups into O(1) hash lookups for hot data. It's fully automatic — you don't create or manage it.

**When to disable:** If you see high contention on the AHI semaphore in `SHOW ENGINE INNODB STATUS`, disable it with `innodb_adaptive_hash_index=OFF`.

#### Change Buffer

When an INSERT, UPDATE, or DELETE modifies a **non-unique secondary index** and the target index page is not in the buffer pool, InnoDB doesn't read the page from disk just to update it. Instead, it records the change in the change buffer and merges it later when the page is eventually read.

This is a major performance optimization for write-heavy workloads with many secondary indexes. **Unique indexes cannot use the change buffer** because InnoDB must read the page to verify uniqueness.

#### Log Buffer

The log buffer holds redo log records in memory before they are written to the redo log files on disk. At transaction commit (with `innodb_flush_log_at_trx_commit=1`), the log buffer is flushed and fsynced to the redo log.

A larger log buffer allows transactions that generate many redo records (large bulk INSERTs) to run without multiple disk flushes before commit.

### On-Disk Structures

#### File-Per-Table Tablespaces (.ibd files)

Each table gets its own `.ibd` file on disk. This file contains:
- The **clustered index** (B-tree organized by primary key) — your actual row data
- All **secondary indexes** as separate B-trees
- **16KB pages** organized into 1MB extents

This is the default since MySQL 5.6. Always keep `innodb_file_per_table=ON`.

#### Undo Tablespaces

Undo tablespaces store the **before-images** of rows modified by active transactions. Two critical purposes:

1. **Rollback** — if you `ROLLBACK`, InnoDB uses the undo log to restore rows to their original state
2. **MVCC** — other transactions running `SELECT` with a consistent read snapshot see old row versions through the undo chain, not your uncommitted changes

Since MySQL 8.0, undo logs are stored in separate `.ibu` files (no longer in the system tablespace).

**Watch out:** Long-running transactions prevent undo purge, causing the undo tablespace to grow continuously.

#### Redo Log — The Crash Safety Guarantee

The redo log is InnoDB's **Write-Ahead Log (WAL)**. Every change to data is recorded here before the transaction commits. If MySQL crashes, InnoDB replays the redo log during recovery to reconstruct all committed transactions whose dirty pages hadn't been flushed to disk yet.

This is why MySQL doesn't lose committed data even on a power failure — the redo log survives because it's fsynced to disk at commit time.

```sql
-- Check redo log usage
SHOW STATUS LIKE 'Innodb_redo_log%';
```

#### Doublewrite Buffer

When dirty pages are flushed from the buffer pool to disk, they pass through the doublewrite buffer first:

1. Dirty page → **doublewrite buffer** (sequential write)
2. Doublewrite buffer → **tablespace .ibd file** (random write)

If a crash occurs during step 2 (torn page — only half the 16KB was written), InnoDB recovers the intact copy from the doublewrite buffer. This costs 2x write I/O but is essential for data integrity on hardware that doesn't guarantee atomic 16KB writes.

**Never disable this** unless you're running on a filesystem that guarantees atomic page writes (like ZFS).

#### System Tablespace (ibdata1)

The system tablespace contains the InnoDB data dictionary, the on-disk change buffer storage, and (in older MySQL versions) the undo logs. Since MySQL 5.6+ with `innodb_file_per_table=ON`, table data is not stored here.

**Best practice:** Keep ibdata1 small. If it has grown large from old undo logs, the only way to shrink it is a logical dump and reload.

## How Data Flows Through the Architecture

| Operation | Path |
|-----------|------|
| **SELECT (cache hit)** | Query → Buffer Pool → return rows |
| **SELECT (cache miss)** | Query → Tablespace .ibd (disk read) → Buffer Pool → return rows |
| **INSERT/UPDATE/DELETE** | Modify page in Buffer Pool + write redo to Log Buffer → on COMMIT: flush Log Buffer to Redo Log (fsync) |
| **Rollback** | Read before-images from Undo Tablespace → restore rows in Buffer Pool |
| **MVCC read** | Follow undo chain from Buffer Pool page → Undo Tablespace → find correct version |
| **Background flush** | Page cleaner: dirty page → Doublewrite Buffer → Tablespace .ibd |
| **Secondary index (deferred)** | DML → Change Buffer (memory) → merge when page is read later |

## Configuration Quick Reference

| Parameter | Component | Default | Production |
|-----------|-----------|---------|------------|
| `innodb_buffer_pool_size` | Buffer Pool | 128MB | 70-80% of RAM |
| `innodb_buffer_pool_instances` | Buffer Pool | 8 | Match to CPU cores (if pool >1GB) |
| `innodb_adaptive_hash_index` | AHI | ON | Disable if high AHI contention |
| `innodb_change_buffer_max_size` | Change Buffer | 25% | Reduce for read-heavy workloads |
| `innodb_log_buffer_size` | Log Buffer | 64MB | Increase for bulk operations |
| `innodb_redo_log_capacity` | Redo Log | 100MB | 1-2GB for write-heavy |
| `innodb_file_per_table` | Tablespaces | ON | Always keep ON |
| `innodb_undo_tablespaces` | Undo | 2 | Default is fine |
| `innodb_doublewrite` | Doublewrite | ON | Never disable |

## What's Next in This Series

This is **Post 0** of the MySQL Internals Animated series. Now that you know the architecture, dive into how each operation uses these components:

<div class="post-cta-inline">
  <h4>Explore the Series</h4>
  <p>Each post has an interactive animation showing exactly how data flows through InnoDB's components.</p>
  <a href="/blog/how-mysql-update-works-innodb-internals.html" class="btn">Next: How UPDATE Works &rarr;</a>
</div>

<div class="related-posts">
<h3>Related Articles</h3>
<div class="related-grid">
<a class="related-card" href="/blog/how-mysql-update-works-innodb-internals.html">
<div class="rc-cat">MySQL Internals</div>
<h4>How a MySQL UPDATE Actually Works: InnoDB Internals Animated</h4>
</a>
<a class="related-card" href="/blog/mysql-explain-output-complete-guide.html">
<div class="rc-cat">MySQL</div>
<h4>MySQL EXPLAIN Output Explained: The Complete Guide</h4>
</a>
</div>
</div>
