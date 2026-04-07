# MariaDB Query Optimization — Complete Reference

Source: mariadb.com/docs + mariadb.com/kb
Extracted: 2026-04-07

## Key Differences from MySQL

### MariaDB-Only Optimizations
1. **Table Elimination** — removes unused LEFT JOIN tables (MySQL lacks this)
2. **Subquery Cache** — caches correlated subquery results by parameter (MySQL lacks this)
3. **EXISTS-to-IN** — converts EXISTS to IN for materialization (MySQL can't)
4. **Condition Pushdown into Derived** — pushes WHERE into GROUP BY derived tables
5. **Rowid Filtering** — secondary index pre-filters rowids (`type=eq_ref|filter`)
6. **Sargable YEAR/DATE** (11.1+) — auto-rewrites `YEAR(col)=N` to range (MySQL requires manual rewrite)
7. **Sargable UPPER** (11.3+) — `UPPER(col)='ABC'` becomes `col='ABC'` with general_ci
8. **Charset Narrowing** — UTF8MB3/MB4 cross-join optimization
9. **Large IN → subquery** (10.3+) — auto-converts IN(1000+ values) to temp table
10. **LIMIT ROWS EXAMINED** — row-based query termination (MySQL has time-based only)

### ANALYZE Statement (Not EXPLAIN ANALYZE)
- Syntax: `ANALYZE SELECT ...` (not `EXPLAIN ANALYZE`)
- `ANALYZE FORMAT=JSON SELECT ...` for JSON runtime stats
- Adds `r_rows` and `r_filtered` columns to table format
- JSON adds: `r_loops`, `r_total_time_ms`, `r_buffer_size`, `r_engine_stats`
- WARNING: `ANALYZE UPDATE/DELETE` actually executes the DML

### Unique EXPLAIN Values
- Access type: `eq_ref|filter` (pipe-delimited compound with rowid filtering)
- select_type: `MATERIALIZED`, `LATERAL DERIVED`
- Extra: `Using rowid filter`, `FirstMatch(tbl)`, `LooseScan`, `Start/End temporary`
- Extra: `Using join buffer (flat/incremental, BNL/BNLH/BKA/BKAH join)`

### JSON Format Differences
- No `cost_info` object (MariaDB uses `rows` directly)
- `rows` instead of `rows_examined_per_scan`/`rows_produced_per_join`
- `r_*` prefixed runtime fields in ANALYZE FORMAT=JSON
- `filesort` as wrapper node (not inline Extra)
- `block-nl-join`, `expression-cache` nodes
- `"lateral": 1` marker
- `rowid_filter` object with selectivity data
- `r_engine_stats` with InnoDB page-level metrics (10.6.15+)

### 27+ MariaDB-Only Optimizer Switches
exists_to_in, subquery_cache, table_elimination, extended_keys, join_cache_hashed,
join_cache_bka, join_cache_incremental, optimize_join_buffer_size, orderby_uses_equalities,
outer_join_with_cache, partial_match_rowid_merge, partial_match_table_scan,
semijoin_with_cache, condition_pushdown_for_derived, condition_pushdown_for_subquery,
condition_pushdown_from_having, split_materialized, rowid_filter, not_null_range_scan,
index_merge_sort_intersection, cset_narrowing, sargable_casefold, hash_join_cardinality,
in_to_exists, mrr_sort_keys, duplicateweedout, reorder_outer_joins

## Rules Applicable to Analyzer

### Already Implemented
- Full table scan detection
- Filesort / temp table detection
- Row estimate mismatch (r_rows vs rows)
- Low r_filtered detection
- Rowid filter (good) detection
- Compound access type parsing (eq_ref|filter)

### Future Rules to Consider
- Table elimination detection (table missing from EXPLAIN = good)
- Subquery cache detection (from EXPLAIN EXTENDED or JSON)
- Sargable YEAR hint (MariaDB 11.1+ doesn't need manual rewrite)
- Large IN list warning with MariaDB-specific threshold info
- BNLH/BKAH join detection (MariaDB hash join variants)
- Engine stats analysis (pages_accessed, pages_read_time_ms)
