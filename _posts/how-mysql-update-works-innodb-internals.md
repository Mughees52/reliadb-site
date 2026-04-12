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

Step through each phase of the UPDATE lifecycle using the diagram below. Components reveal as you progress, with animated data packets flowing between layers.

<div class="upd-outer" style="background:#F4F6F8;border-radius:16px;margin:24px 0;border:1px solid #DDE3E9;overflow:clip;">
<style>
  .upd-anim *{margin:0;padding:0;box-sizing:border-box}
  .upd-anim{font-family:'Inter',sans-serif;color:#444;max-width:960px;margin:0 auto;padding:0 20px 32px}
  .upd-anim-header{position:sticky;top:72px;z-index:10;background:#F4F6F8;padding:16px 0 0}
  .upd-prog{height:3px;background:linear-gradient(90deg,#1A5276,#2980B9,#E67E22);transition:width .5s ease;width:0%;border-radius:2px;margin-bottom:14px}
  .upd-ctrls{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;align-items:center;padding:0 0 14px;border-bottom:1px solid #DDE3E9}
  .upd-ctrls button{padding:8px 20px;border:none;border-radius:6px;font-family:inherit;font-size:.85rem;font-weight:600;cursor:pointer;transition:all .2s}
  .upd-ctrls .ubn{background:linear-gradient(135deg,#1A5276,#2980B9);color:#fff;padding:10px 28px;font-size:.9rem}
  .upd-ctrls .ubn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(26,82,118,.3)}
  .upd-ctrls .ubn:disabled{opacity:.4;cursor:default;transform:none;box-shadow:none}
  .upd-ctrls .ubk{background:#fff;color:#1A5276;border:1px solid #D6EAF8!important}
  .upd-ctrls .ubk:hover{background:#EAF2F8}
  .upd-ctrls .ubk:disabled{opacity:.3;cursor:default}
  .upd-ctrls .uba{background:#fff;color:#1E8449;border:1px solid #1E844933!important;font-size:.8rem}
  .upd-ctrls .uba:hover{background:#ECFDF5}
  .upd-ctrls .uba.playing{background:#1E8449;color:#fff}
  .upd-ctrls .ubr{background:#fff;color:#777;border:1px solid #DDE3E9!important}
  .upd-ctrls .ubr:hover{background:#EAF2F8;color:#444}
  .upd-sc{font-size:.82rem;color:#777;font-weight:600;min-width:70px;text-align:center}
  .upd-narr{background:#fff;border:1px solid #DDE3E9;border-radius:10px;padding:16px 20px;margin:16px 0 8px;min-height:68px}
  .upd-narr-label{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px}
  .upd-narr-text{font-size:.88rem;line-height:1.7;color:#555}
  .upd-narr-text strong{color:#1a1a2e}
  .upd-narr-text code{font-family:'JetBrains Mono',monospace;font-size:.78rem;background:#EAF2F8;padding:1px 5px;border-radius:3px;color:#1A5276}
  .upd-dia{width:100%;height:auto;display:block;margin:8px 0}
  .ub{rx:10;ry:10;transition:all .5s cubic-bezier(.16,1,.3,1);cursor:pointer}
  .ub-h{opacity:0;transform:translateY(8px)}
  .ub-v{opacity:1;transform:translateY(0)}
  .ub-l{font-family:'Inter',sans-serif;font-weight:700;pointer-events:none;transition:opacity .5s}
  .ub-s{font-family:'Inter',sans-serif;font-weight:400;pointer-events:none;transition:opacity .5s}
  .ub-ht{opacity:0}
  .uc{fill:none;stroke-width:2;stroke-dasharray:6 4;opacity:0;transition:opacity .5s}
  .uc-v{opacity:.5}
  .uc-a{opacity:1;stroke-dasharray:none;stroke-width:2.5}
  .upkt{r:5;opacity:0;filter:url(#updGlow)}
  .upkt-a{opacity:1}
  @keyframes updPulse{0%,100%{opacity:.6}50%{opacity:1}}
  .ub-pulse{animation:updPulse 1.5s ease-in-out infinite}
  .upd-det{background:#F4F6F8;border:1px solid #DDE3E9;border-radius:10px;padding:0;max-height:0;overflow:hidden;transition:max-height .4s ease,padding .3s,margin .3s;margin:0}
  .upd-det.open{max-height:400px;padding:14px 18px;margin:8px 0 0}
  .upd-det .udt{font-size:.78rem;font-weight:700;color:#1a1a2e;margin-bottom:6px}
  .upd-det .udd{font-size:.8rem;color:#666;line-height:1.6}
  .upd-det .udd code{font-family:'JetBrains Mono',monospace;font-size:.75rem;background:#E8EEF4;padding:1px 5px;border-radius:3px;color:#1A5276}
</style>

<div class="upd-anim">
  <div class="upd-anim-header">
    <div class="upd-prog" id="updProg2"></div>
    <div class="upd-ctrls">
      <button class="ubk" id="updBack2" disabled>&larr; Back</button>
      <button class="ubn" id="updNext2">Next Step &rarr;</button>
      <span class="upd-sc" id="updSc2">0 / 18</span>
      <button class="uba" id="updAuto2">&#9654; Auto</button>
      <button class="ubr" id="updReset2">&#8634; Reset</button>
    </div>
  </div>

  <div class="upd-narr" id="updNarr2">
    <div class="upd-narr-label" id="updNL2" style="color:#2980B9">Ready</div>
    <div class="upd-narr-text" id="updNT2">Click <strong>Next Step</strong> to follow the UPDATE statement through every layer of InnoDB — from the TCP packet arriving at mysqld all the way to the dirty page being flushed to your <code>.ibd</code> file on disk.</div>
  </div>

  <svg viewBox="0 0 920 720" class="upd-dia" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="updGlow"><feGaussianBlur stdDeviation="3" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <marker id="updAh" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#AAB4C2"/></marker>
      <marker id="updAhA" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#E67E22"/></marker>
    </defs>

    <!-- Background zones -->
    <rect x="10" y="5" width="440" height="710" rx="16" fill="#F4F6F8" stroke="#DDE3E9" stroke-width="1"/>
    <text x="230" y="30" text-anchor="middle" fill="#AAB4C2" font-size="11" font-weight="700" letter-spacing=".08em" font-family="Inter">IN-MEMORY</text>

    <rect x="470" y="5" width="440" height="710" rx="16" fill="#F0F0F8" stroke="#DDE3E9" stroke-width="1"/>
    <text x="690" y="30" text-anchor="middle" fill="#AAB4C2" font-size="11" font-weight="700" letter-spacing=".08em" font-family="Inter">ON-DISK</text>

    <!-- Connection paths -->
    <path id="uc-cl-pa" class="uc" d="M230,85 L230,130" stroke="#AAB4C2" marker-end="url(#updAh)"/>
    <path id="uc-pa-op" class="uc" d="M230,170 L230,210" stroke="#AAB4C2" marker-end="url(#updAh)"/>
    <path id="uc-op-ex" class="uc" d="M230,250 L230,290" stroke="#AAB4C2" marker-end="url(#updAh)"/>
    <path id="uc-ex-bp" class="uc" d="M230,330 L230,385" stroke="#2980B9" marker-end="url(#updAh)"/>
    <path id="uc-bp-un" class="uc" d="M310,420 L490,550" stroke="#C0392B" marker-end="url(#updAh)"/>
    <path id="uc-bp-lb" class="uc" d="M150,470 L150,540" stroke="#CA6F1E" marker-end="url(#updAh)"/>
    <path id="uc-lb-re" class="uc" d="M260,580 L490,630" stroke="#E67E22" marker-end="url(#updAh)"/>
    <path id="uc-bp-cb" class="uc" d="M310,460 L370,510" stroke="#27AE60" marker-end="url(#updAh)"/>
    <path id="uc-bp-dw" class="uc" d="M370,420 L490,350" stroke="#8E44AD" marker-end="url(#updAh)"/>
    <path id="uc-dw-tb" class="uc" d="M700,350 L700,280" stroke="#1A5276" marker-end="url(#updAh)"/>
    <path id="uc-ok-cl" class="uc" d="M370,680 L370,85 L310,85" stroke="#1E8449" marker-end="url(#updAh)"/>

    <!-- Component boxes -->
    <!-- Client -->
    <rect id="ub-cl" class="ub ub-h" x="130" y="48" width="200" height="40" fill="#fff" stroke="#1A5276"/>
    <text id="ut-cl" class="ub-l ub-ht" x="230" y="73" text-anchor="middle" fill="#1A5276" font-size="13">Client (app)</text>

    <!-- Parser -->
    <rect id="ub-pa" class="ub ub-h" x="130" y="128" width="200" height="44" fill="#EFF4FF" stroke="#2980B9" stroke-opacity=".5"/>
    <text id="ut-pa" class="ub-l ub-ht" x="230" y="148" text-anchor="middle" fill="#2980B9" font-size="12">Parser</text>
    <text id="us-pa" class="ub-s ub-ht" x="230" y="163" text-anchor="middle" fill="#888" font-size="9">SQL &#x2192; parse tree</text>

    <!-- Optimizer -->
    <rect id="ub-op" class="ub ub-h" x="130" y="208" width="200" height="44" fill="#EFF4FF" stroke="#2980B9" stroke-opacity=".5"/>
    <text id="ut-op" class="ub-l ub-ht" x="230" y="228" text-anchor="middle" fill="#2980B9" font-size="12">Optimizer</text>
    <text id="us-op" class="ub-s ub-ht" x="230" y="243" text-anchor="middle" fill="#888" font-size="9">choose index &amp; plan</text>

    <!-- Executor -->
    <rect id="ub-ex" class="ub ub-h" x="130" y="288" width="200" height="44" fill="#EAF2F8" stroke="#1A5276" stroke-opacity=".5"/>
    <text id="ut-ex" class="ub-l ub-ht" x="230" y="308" text-anchor="middle" fill="#1A5276" font-size="12">Executor</text>
    <text id="us-ex" class="ub-s ub-ht" x="230" y="323" text-anchor="middle" fill="#888" font-size="9">handler API &#x2192; InnoDB</text>

    <!-- Buffer Pool -->
    <rect id="ub-bp" class="ub ub-h" x="40" y="378" width="380" height="100" fill="#ECFDF5" stroke="#1E8449" stroke-opacity=".5"/>
    <text id="ut-bp" class="ub-l ub-ht" x="230" y="402" text-anchor="middle" fill="#1E8449" font-size="13">Buffer Pool</text>
    <text id="us-bp" class="ub-s ub-ht" x="230" y="418" text-anchor="middle" fill="#5A8060" font-size="9">page loaded, row modified in-memory, marked dirty</text>
    <!-- X Lock badge -->
    <rect id="ub-lk" class="ub ub-h" x="52" y="432" width="110" height="36" rx="6" fill="#FFF8EC" stroke="#E67E22" stroke-opacity=".5"/>
    <text id="ut-lk" class="ub-l ub-ht" x="107" y="455" text-anchor="middle" fill="#E67E22" font-size="10">X Lock</text>

    <!-- Undo Tablespace -->
    <rect id="ub-un" class="ub ub-h" x="490" y="520" width="200" height="54" fill="#FEF2F2" stroke="#C0392B" stroke-opacity=".4"/>
    <text id="ut-un" class="ub-l ub-ht" x="590" y="544" text-anchor="middle" fill="#C0392B" font-size="12">Undo Tablespace</text>
    <text id="us-un" class="ub-s ub-ht" x="590" y="560" text-anchor="middle" fill="#885050" font-size="9">old row &#x2192; rollback / MVCC</text>

    <!-- Log Buffer -->
    <rect id="ub-lb" class="ub ub-h" x="50" y="540" width="220" height="50" fill="#FFF8EC" stroke="#CA6F1E" stroke-opacity=".4"/>
    <text id="ut-lb" class="ub-l ub-ht" x="160" y="563" text-anchor="middle" fill="#CA6F1E" font-size="12">Log Buffer</text>
    <text id="us-lb" class="ub-s ub-ht" x="160" y="578" text-anchor="middle" fill="#887050" font-size="9">redo record written to memory</text>

    <!-- Change Buffer -->
    <rect id="ub-cb" class="ub ub-h" x="290" y="500" width="140" height="44" fill="#F0FFF4" stroke="#27AE60" stroke-opacity=".4"/>
    <text id="ut-cb" class="ub-l ub-ht" x="360" y="520" text-anchor="middle" fill="#27AE60" font-size="11">Change Buffer</text>
    <text id="us-cb" class="ub-s ub-ht" x="360" y="534" text-anchor="middle" fill="#508060" font-size="8">secondary idx deferred</text>

    <!-- Redo Log -->
    <rect id="ub-re" class="ub ub-h" x="490" y="610" width="200" height="54" fill="#FEF2F2" stroke="#C0392B" stroke-opacity=".4"/>
    <text id="ut-re" class="ub-l ub-ht" x="590" y="634" text-anchor="middle" fill="#C0392B" font-size="12">Redo Log (WAL)</text>
    <text id="us-re" class="ub-s ub-ht" x="590" y="650" text-anchor="middle" fill="#885050" font-size="9">fsync &#x2192; crash-safe</text>

    <!-- Commit badge -->
    <rect id="ub-cm" class="ub ub-h" x="100" y="630" width="160" height="40" fill="#FEF2F2" stroke="#C0392B" stroke-opacity=".5"/>
    <text id="ut-cm" class="ub-l ub-ht" x="180" y="655" text-anchor="middle" fill="#C0392B" font-size="13">COMMIT</text>

    <!-- Doublewrite Buffer -->
    <rect id="ub-dw" class="ub ub-h" x="490" y="320" width="220" height="54" fill="#F5F3FF" stroke="#8E44AD" stroke-opacity=".4"/>
    <text id="ut-dw" class="ub-l ub-ht" x="600" y="344" text-anchor="middle" fill="#8E44AD" font-size="12">Doublewrite Buffer</text>
    <text id="us-dw" class="ub-s ub-ht" x="600" y="360" text-anchor="middle" fill="#705080" font-size="9">torn-page safety net</text>

    <!-- Tablespace .ibd -->
    <rect id="ub-tb" class="ub ub-h" x="530" y="220" width="180" height="54" fill="#EAF2F8" stroke="#1A5276" stroke-opacity=".4"/>
    <text id="ut-tb" class="ub-l ub-ht" x="620" y="244" text-anchor="middle" fill="#1A5276" font-size="12">Tablespace (.ibd)</text>
    <text id="us-tb" class="ub-s ub-ht" x="620" y="260" text-anchor="middle" fill="#506880" font-size="9">orders.ibd on disk</text>

    <!-- OK Packet -->
    <rect id="ub-ok" class="ub ub-h" x="300" y="665" width="160" height="38" fill="#ECFDF5" stroke="#1E8449" stroke-opacity=".5"/>
    <text id="ut-ok" class="ub-l ub-ht" x="380" y="689" text-anchor="middle" fill="#1E8449" font-size="12">OK &#x2192; Client</text>

    <!-- BG flush label -->
    <text id="ut-bg" class="ub-s ub-ht" x="460" y="420" text-anchor="start" fill="#AAB4C2" font-size="9" font-style="italic">async page cleaner</text>

    <!-- Data packets -->
    <circle id="upkt1" class="upkt" cx="230" cy="85" fill="#1A5276"/>
    <circle id="upkt2" class="upkt" cx="230" cy="400" fill="#1E8449"/>
    <circle id="upkt3" class="upkt" cx="310" cy="420" fill="#C0392B"/>
    <circle id="upkt4" class="upkt" cx="150" cy="470" fill="#CA6F1E"/>
    <circle id="upkt5" class="upkt" cx="260" cy="580" fill="#E67E22"/>
    <circle id="upkt6" class="upkt" cx="370" cy="420" fill="#8E44AD"/>
    <circle id="upkt7" class="upkt" cx="370" cy="680" fill="#1E8449"/>
  </svg>

  <div class="upd-det" id="updDet2">
    <div class="udt" id="updDT2"></div>
    <div class="udd" id="updDD2"></div>
  </div>
</div>

<script>
(function(){
var STEPS=[
  {show:['ub-cl','ut-cl'],conns:[],label:'Phase 1 \u00b7 Client',color:'#1A5276',
   text:'Your application sends <strong>UPDATE orders SET status=\'shipped\' WHERE id=42</strong> over a TCP connection (or Unix socket) as a <code>COM_QUERY</code> packet. The MySQL server receives it.',
   detail:{t:'Client \u2192 mysqld',c:'The client library (mysqlclient, JDBC, etc.) serializes the SQL into a COM_QUERY packet. Connection may come through a pool (ProxySQL, HikariCP).'}},
  {show:['ub-pa','ut-pa','us-pa'],conns:['uc-cl-pa'],
   pkt:{id:'upkt1',path:[[230,85],[230,130]],color:'#2980B9'},
   label:'Phase 1 \u00b7 Parser',color:'#2980B9',
   text:'The <strong>Parser</strong> tokenizes the SQL and builds a parse tree (AST). It validates syntax \u2014 a typo like <code>UPDTE</code> would die here with error 1064.',
   detail:{t:'Parser',c:'Bison-generated grammar produces an AST. The parse tree identifies this as an UPDATE on table <code>orders</code>, column <code>status</code>, with a WHERE on <code>id</code>.'}},
  {show:['ub-op','ut-op','us-op'],conns:['uc-pa-op'],
   pkt:{id:'upkt1',path:[[230,170],[230,210]],color:'#2980B9'},
   label:'Phase 1 \u00b7 Optimizer',color:'#2980B9',
   text:'The <strong>Optimizer</strong> decides HOW to find id=42. It evaluates indexes: primary key lookup (best), secondary index, or full table scan (worst). For <code>WHERE id=42</code> on a PK, it picks a single B-tree descent \u2014 O(log n).',
   detail:{t:'Cost-Based Optimizer',c:'Checks statistics, evaluates access paths. For this UPDATE: clustered index lookup on PK. You can see the plan with <code>EXPLAIN UPDATE orders SET status=\'shipped\' WHERE id=42</code>.'}},
  {show:['ub-ex','ut-ex','us-ex'],conns:['uc-op-ex'],
   pkt:{id:'upkt1',path:[[230,250],[230,290]],color:'#1A5276'},
   label:'Phase 1 \u00b7 Executor',color:'#1A5276',
   text:'The <strong>Executor</strong> runs the plan. It calls InnoDB via the <strong>handler API</strong> \u2014 specifically <code>ha_update_row()</code>. This is the boundary between the SQL layer and the storage engine. From here, we enter InnoDB.',
   detail:{t:'Executor \u2192 handler API',c:'The executor iterates matching rows using the handler interface. For each row matching WHERE id=42, it calls <code>ha_update_row(old_row, new_row)</code> which enters InnoDB\'s storage engine code.'}},
  {show:['ub-bp','ut-bp','us-bp'],conns:['uc-ex-bp'],
   pkt:{id:'upkt2',path:[[230,330],[230,385]],color:'#1E8449'},
   label:'Phase 2 \u00b7 Buffer Pool',color:'#1E8449',
   text:'InnoDB loads the page containing id=42 into the <strong>Buffer Pool</strong> (if not already cached). The 16 KB page is read from <code>orders.ibd</code> on disk and placed in the LRU list. Now the row is accessible in RAM.',
   detail:{t:'Buffer Pool \u2014 Page Load',c:'The buffer pool is typically 70-80% of server RAM. Pages are managed in an LRU with young/old sublists. A cache hit avoids disk I/O entirely. <code>innodb_buffer_pool_size</code> controls the total size.'}},
  {show:['ub-lk','ut-lk'],conns:[],pulse:'ub-lk',
   label:'Phase 2 \u00b7 Row Locking',color:'#E67E22',
   text:'<strong>X (exclusive) lock</strong> acquired on the row id=42. In REPEATABLE READ (default), InnoDB also takes a <strong>gap lock</strong> or <strong>next-key lock</strong> to prevent phantom reads. Other transactions trying to update the same row will block here.',
   detail:{t:'Row Locking',c:'InnoDB uses record-level locking, not page or table locks. The X lock prevents concurrent writes. Gap locks prevent inserts in the locked range. You can see locks with <code>SELECT * FROM performance_schema.data_locks</code>.'}},
  {show:['ub-un','ut-un','us-un'],conns:['uc-bp-un'],
   pkt:{id:'upkt3',path:[[310,420],[490,550]],color:'#C0392B'},
   label:'Phase 2 \u00b7 Undo Log',color:'#C0392B',
   text:'The <strong>old row version</strong> (status=\'pending\') is written to the <strong>Undo Tablespace</strong>. This serves two purposes: <strong>ROLLBACK</strong> (undo the change if the transaction aborts) and <strong>MVCC</strong> (other transactions can still read the old version without blocking).',
   detail:{t:'Undo Log \u2192 Undo Tablespace',c:'The before-image goes into a rollback segment inside undo_001 or undo_002. The undo record forms a version chain: each old version points to the next older version. This is how MVCC consistent reads work without locking.'}},
  {show:[],conns:[],pulse:'ub-bp',
   label:'Phase 2 \u00b7 In-Memory Modify',color:'#1E8449',
   text:'The row is <strong>modified in the buffer pool</strong>: status changes from \'pending\' to \'shipped\'. The page is now <strong>marked dirty</strong> \u2014 it differs from the on-disk version. The actual disk write happens later, asynchronously.',
   detail:{t:'Dirty Page',c:'The modification happens entirely in RAM. The page is added to the flush list (dirty pages awaiting write-back). The page cleaner threads will eventually flush it. This is why writes are fast \u2014 no synchronous disk I/O for the data page.'}},
  {show:['ub-lb','ut-lb','us-lb'],conns:['uc-bp-lb'],
   pkt:{id:'upkt4',path:[[150,470],[150,540]],color:'#CA6F1E'},
   label:'Phase 2 \u00b7 Log Buffer',color:'#CA6F1E',
   text:'A <strong>redo log record</strong> is written to the <strong>Log Buffer</strong> in memory. This record says: "on page X, at offset Y, change these bytes from A to B." It\'s a physical change record with a Log Sequence Number (LSN).',
   detail:{t:'Log Buffer \u2014 Redo Record',c:'The redo record is a compact physiological record (physical to the page, logical to the row). Written within a mini-transaction (mtr). <code>innodb_log_buffer_size</code> defaults to 16 MB.'}},
  {show:['ub-cb','ut-cb','us-cb'],conns:['uc-bp-cb'],
   label:'Phase 2 \u00b7 Change Buffer',color:'#27AE60',
   text:'If the UPDATE affects a <strong>non-unique secondary index</strong> (e.g., an index on <code>status</code>) and that index page isn\'t in the buffer pool, the change is <strong>buffered</strong> in the Change Buffer instead of doing a random disk read. Merged later when the page is eventually loaded.',
   detail:{t:'Change Buffer',c:'Only for non-unique secondary indexes. If the status column has a secondary index, updating it from \'pending\' to \'shipped\' requires updating that index. The change buffer avoids the random I/O. <code>innodb_change_buffering=all</code> by default.'}},
  {show:['ub-re','ut-re','us-re'],conns:['uc-lb-re'],
   pkt:{id:'upkt5',path:[[260,580],[490,630]],color:'#E67E22'},
   label:'Phase 3 \u00b7 Redo Log Flush',color:'#C0392B',
   text:'At <strong>COMMIT</strong>, the log buffer is <strong>flushed (fsync)</strong> to the <strong>Redo Log</strong> files on disk. This is the critical durability point \u2014 once the redo record is on disk, the transaction is crash-safe even if the server dies before the dirty page is written.',
   detail:{t:'WAL \u2014 Write-Ahead Log',c:'This is the Write-Ahead Log protocol: the redo log must be durable BEFORE the transaction is acknowledged. <code>innodb_flush_log_at_trx_commit=1</code> means fsync every commit (safest). Group commit batches multiple transactions\' fsyncs for efficiency.'}},
  {show:['ub-cm','ut-cm'],conns:[],pulse:'ub-cm',
   label:'Phase 3 \u00b7 COMMIT',color:'#C0392B',
   text:'The transaction is now <strong>COMMITTED</strong>. The redo log is durable on disk. Even if the server crashes right now, InnoDB will replay the redo log on restart and reconstruct the change. The dirty page in the buffer pool hasn\'t been written to the tablespace yet \u2014 and that\'s fine.',
   detail:{t:'Transaction Committed',c:'In MySQL\'s two-phase commit, InnoDB first writes a PREPARE record to the redo log, then MySQL writes to the binary log (for replication), then InnoDB writes the final COMMIT record. This ensures redo log and binlog stay in sync.'}},
  {show:['ub-ok','ut-ok'],conns:['uc-ok-cl'],
   pkt:{id:'upkt7',path:[[370,680],[370,85]],color:'#1E8449'},
   label:'Phase 3 \u00b7 Response',color:'#1E8449',
   text:'<strong>OK packet</strong> sent back to the client: <code>Query OK, 1 row affected</code>. The application can proceed. The row lock is released (unless inside a larger transaction). But the story isn\'t over \u2014 the dirty page still needs to reach disk.',
   detail:{t:'OK Packet \u2192 Client',c:'The OK packet includes the affected row count and any warnings. The client library receives it and returns control to the application code. The row\'s X lock is released at this point (for autocommit transactions).'}},
  {show:['ub-dw','ut-dw','us-dw','ut-bg'],conns:['uc-bp-dw'],
   pkt:{id:'upkt6',path:[[370,420],[490,350]],color:'#8E44AD'},
   label:'Phase 4 \u00b7 Doublewrite',color:'#8E44AD',
   text:'<strong>Asynchronously</strong>, the page cleaner thread picks up the dirty page. Before writing it to the tablespace, it goes through the <strong>Doublewrite Buffer</strong> \u2014 a sequential write area that protects against torn pages (half-written 16 KB pages if a crash happens mid-flush).',
   detail:{t:'Doublewrite Buffer \u2014 Torn Page Protection',c:'InnoDB pages are 16 KB but the OS writes 4 KB blocks. A crash during flush can leave a page half-old/half-new. The doublewrite buffer writes the clean page first. On recovery, if a tablespace page is torn, InnoDB restores it from the doublewrite copy.'}},
  {show:['ub-tb','ut-tb','us-tb'],conns:['uc-dw-tb'],
   pkt:{id:'upkt6',path:[[700,350],[700,280]],color:'#1A5276'},
   label:'Phase 4 \u00b7 Tablespace Write',color:'#1A5276',
   text:'Finally, the clean page is written to the <strong>tablespace file</strong> (<code>orders.ibd</code>) on disk. The page is no longer dirty. The corresponding redo log entries can now be recycled. This is the end of the UPDATE\'s journey.',
   detail:{t:'Tablespace \u2014 orders.ibd',c:'With <code>innodb_file_per_table=ON</code> (default), each table has its own .ibd file. The page is written using O_DIRECT (bypassing OS page cache) to its permanent location. The redo log checkpoint advances past this LSN.'}},
  {show:[],conns:[],
   label:'Timeline \u00b7 Summary',color:'#2980B9',
   text:'<strong>Synchronous path</strong> (what the client waits for): Parse \u2192 Optimize \u2192 Execute \u2192 Load page \u2192 Lock \u2192 Undo \u2192 Modify \u2192 Redo to log buffer \u2192 fsync redo log \u2192 COMMIT \u2192 OK. This is typically <strong>1-5 ms</strong> for a PK lookup UPDATE.',
   highlightSync:true},
  {show:[],conns:[],
   label:'Timeline \u00b7 Summary',color:'#8E44AD',
   text:'<strong>Asynchronous path</strong> (happens after OK): Page cleaner wakes up \u2192 writes dirty page through doublewrite buffer \u2192 writes to tablespace .ibd \u2192 checkpoint advances \u2192 redo entries recycled. This can happen <strong>seconds to minutes</strong> later.',
   highlightAsync:true},
  {show:[],conns:[],
   label:'Complete \u00b7 All Paths',color:'#E67E22',
   text:'You\'ve followed the complete lifecycle! The key insight: <strong>InnoDB never makes the client wait for the data page to hit disk.</strong> The WAL (redo log) guarantees crash safety, so the actual page flush can be deferred. This is why InnoDB is fast \u2014 the synchronous path is just memory operations + one sequential fsync.',
   highlightAll:true}
];

var cur=0,revealed=new Set(),revConns=new Set(),autoInt=null;

function sEl(id){var e=document.getElementById(id);if(!e)return;e.classList.remove('ub-h','ub-ht');e.classList.add('ub-v');revealed.add(id)}
function sConn(id){var e=document.getElementById(id);if(!e)return;e.classList.add('uc-v');revConns.add(id)}
function aConn(id){var e=document.getElementById(id);if(!e)return;e.classList.add('uc-a');e.setAttribute('marker-end','url(#updAhA)');setTimeout(function(){e.classList.remove('uc-a');e.setAttribute('marker-end','url(#updAh)')},1500)}
function aPkt(d){if(!d)return;var e=document.getElementById(d.id);if(!e)return;e.setAttribute('fill',d.color);var p=d.path,dur=600,st=performance.now();e.classList.add('upkt-a');function t(n){var f=Math.min(1,(n-st)/dur),ez=1-Math.pow(1-f,3);e.setAttribute('cx',p[0][0]+(p[1][0]-p[0][0])*ez);e.setAttribute('cy',p[0][1]+(p[1][1]-p[0][1])*ez);if(f<1)requestAnimationFrame(t);else setTimeout(function(){e.classList.remove('upkt-a')},300)}requestAnimationFrame(t)}
function pBox(id){var e=document.getElementById(id);if(!e)return;e.classList.add('ub-pulse');setTimeout(function(){e.classList.remove('ub-pulse')},2500)}

function updUI(){
  document.getElementById('updSc2').textContent=cur+' / '+STEPS.length;
  document.getElementById('updBack2').disabled=cur===0;
  var nb=document.getElementById('updNext2');
  nb.disabled=cur>=STEPS.length;
  nb.textContent=cur>=STEPS.length?'\u2713 Complete':'Next Step \u2192';
  document.getElementById('updProg2').style.width=(cur/STEPS.length*100)+'%';
}

function goNext(){
  if(cur>=STEPS.length)return;
  var s=STEPS[cur];
  s.show.forEach(sEl);
  s.conns.forEach(function(id){sConn(id);aConn(id)});
  if(s.pkt)aPkt(s.pkt);
  if(s.pulse)pBox(s.pulse);
  if(s.highlightSync){['ub-cl','ub-pa','ub-op','ub-ex','ub-bp','ub-lk','ub-un','ub-lb','ub-re','ub-cm','ub-ok'].forEach(function(id){var e=document.getElementById(id);if(e&&revealed.has(id)){e.classList.add('ub-pulse');setTimeout(function(){e.classList.remove('ub-pulse')},3000)}})}
  if(s.highlightAsync){['ub-dw','ub-tb'].forEach(function(id){var e=document.getElementById(id);if(e&&revealed.has(id)){e.classList.add('ub-pulse');setTimeout(function(){e.classList.remove('ub-pulse')},3000)}})}
  if(s.highlightAll){document.querySelectorAll('.ub-v').forEach(function(e){e.classList.add('ub-pulse');setTimeout(function(){e.classList.remove('ub-pulse')},3000)})}
  document.getElementById('updNL2').style.color=s.color;
  document.getElementById('updNL2').textContent=s.label;
  document.getElementById('updNT2').innerHTML=s.text;
  if(s.detail){document.getElementById('updDT2').textContent=s.detail.t;document.getElementById('updDD2').innerHTML=s.detail.c;document.getElementById('updDet2').classList.add('open')}
  else{document.getElementById('updDet2').classList.remove('open')}
  cur++;updUI();
  setTimeout(function(){var nb=document.getElementById('updNarr2');var r=nb.getBoundingClientRect();var ch=document.querySelector('.upd-anim-header');var chb=ch?ch.getBoundingClientRect().bottom:132;if(r.top<chb){window.scrollTo({top:window.scrollY+r.top-chb-8,behavior:'smooth'})}},100);
}

function goBack(){
  if(cur<=0)return;cur--;
  var s=STEPS[cur];
  s.show.forEach(function(id){var e=document.getElementById(id);if(e){e.classList.add('ub-h','ub-ht');e.classList.remove('ub-v','ub-pulse');revealed.delete(id)}});
  s.conns.forEach(function(id){var e=document.getElementById(id);if(e){e.classList.remove('uc-v','uc-a');revConns.delete(id)}});
  if(cur>0){var p=STEPS[cur-1];document.getElementById('updNL2').style.color=p.color;document.getElementById('updNL2').textContent=p.label;document.getElementById('updNT2').innerHTML=p.text;if(p.detail){document.getElementById('updDT2').textContent=p.detail.t;document.getElementById('updDD2').innerHTML=p.detail.c;document.getElementById('updDet2').classList.add('open')}else{document.getElementById('updDet2').classList.remove('open')}}
  else{document.getElementById('updNL2').style.color='#2980B9';document.getElementById('updNL2').textContent='Ready';document.getElementById('updNT2').innerHTML='Click <strong>Next Step</strong> to begin.';document.getElementById('updDet2').classList.remove('open')}
  updUI();
}

function resetAll(){
  stopAuto();cur=0;revealed.clear();revConns.clear();
  document.querySelectorAll('.ub').forEach(function(e){e.classList.add('ub-h');e.classList.remove('ub-v','ub-pulse')});
  document.querySelectorAll('.ub-l,.ub-s').forEach(function(e){e.classList.add('ub-ht')});
  document.querySelectorAll('.uc').forEach(function(e){e.classList.remove('uc-v','uc-a')});
  document.querySelectorAll('.upkt').forEach(function(e){e.classList.remove('upkt-a')});
  document.getElementById('updDet2').classList.remove('open');
  document.getElementById('updNL2').style.color='#2980B9';
  document.getElementById('updNL2').textContent='Ready';
  document.getElementById('updNT2').innerHTML='Click <strong>Next Step</strong> to follow the UPDATE statement through every layer of InnoDB \u2014 from the TCP packet arriving at mysqld all the way to the dirty page being flushed to your <code>.ibd</code> file on disk.';
  updUI();window.scrollTo({top:0,behavior:'smooth'});
}

function toggleAuto(){
  if(autoInt){stopAuto();return}
  var btn=document.getElementById('updAuto2');btn.classList.add('playing');btn.textContent='\u23F8 Pause';
  autoInt=setInterval(function(){if(cur>=STEPS.length){stopAuto();return}goNext()},2800);
}
function stopAuto(){clearInterval(autoInt);autoInt=null;var btn=document.getElementById('updAuto2');btn.classList.remove('playing');btn.textContent='\u25B6 Auto'}

document.getElementById('updNext2').addEventListener('click',goNext);
document.getElementById('updBack2').addEventListener('click',goBack);
document.getElementById('updAuto2').addEventListener('click',toggleAuto);
document.getElementById('updReset2').addEventListener('click',resetAll);
document.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();goNext()}if(e.key==='ArrowLeft'){e.preventDefault();goBack()}if(e.key==='r')resetAll()});
updUI();
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
