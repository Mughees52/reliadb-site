# MySQL 8.4 SELECT Optimization — Complete Reference

Source: https://dev.mysql.com/doc/refman/8.4/en/select-optimization.html
Extracted: 2026-04-07

This document captures all optimization knowledge needed for the EXPLAIN Analyzer's Phase 2 intelligence engine.

---

## 1. WHERE Clause Optimization

### Automatic Optimizer Transformations
1. **Removes unnecessary parentheses**
2. **Constant folding**: `(a<b AND b=c) AND a=5` → `b>5 AND b=c AND a=5`
3. **Constant condition removal** (during preparation): `(b>=5 AND b=5) OR (b=6 AND 5=5) OR (b=7 AND 5=6)` → `b=5 OR b=6`
4. **Single evaluation of constant expressions** used by indexes
5. **Numeric type constant folding**: invalid/out-of-range comparisons detected at compile time
6. **COUNT(\*)** on single table without WHERE: retrieved from table metadata (MyISAM/MEMORY)
7. **Early detection** of impossible constant expressions → returns empty immediately
8. **HAVING merged with WHERE** when no GROUP BY or aggregates
9. **Per-table WHERE simplification** for fast evaluation/row skipping

### Constant Tables (Read First)
- Empty table or table with one row
- Table with WHERE on PRIMARY KEY or UNIQUE NOT NULL index, all parts compared to constants

### Very Fast Query Patterns
```sql
SELECT COUNT(*) FROM tbl_name;
SELECT MIN(key_part1), MAX(key_part1) FROM tbl_name;
SELECT MAX(key_part2) FROM tbl_name WHERE key_part1=constant;
SELECT ... FROM tbl_name ORDER BY key_part1,key_part2,... LIMIT 10;
```

### Covering Index Queries (Index-Only, No Table Read)
```sql
SELECT key_part1,key_part2 FROM tbl_name WHERE key_part1=val;
SELECT COUNT(*) FROM tbl_name WHERE key_part1=val1 AND key_part2=val2;
SELECT MAX(key_part2) FROM tbl_name GROUP BY key_part1;
```

---

## 2. Range Optimization

### Range Conditions
- BTREE + HASH: `=`, `<=>`, `IN()`, `IS NULL`, `IS NOT NULL`
- BTREE only: `>`, `<`, `>=`, `<=`, `BETWEEN`, `!=`, `<>`, `LIKE 'pattern'` (no leading wildcard)

### Multi-Part Index Range Rules
- HASH: ALL parts must be equality conditions
- BTREE: uses key parts left-to-right; stops after first non-equality operator (`>`, `<`, `BETWEEN`, `LIKE`)
- Example: `key1 = 'foo' AND key2 >= 10 AND key3 > 10` → uses key1 + key2, NOT key3

### `eq_range_index_dive_limit`
- Controls when optimizer switches from index dives (accurate) to index statistics (fast but less accurate)
- Set to 0 = always use index dives
- Run `ANALYZE TABLE` for best estimates

### Skip Scan Range Access
- Allows range scan when no condition on first index part
- Scans each distinct value of first part, applies range on later parts
- EXPLAIN: `Using index for skip scan`
- Requires: single table, compound index, no GROUP BY/DISTINCT, conjunctive WHERE

### Memory Limit
- `range_optimizer_max_mem_size`: if exceeded, falls back to full scan
- ~230 bytes per OR predicate, ~125 bytes per AND
- `IN(M) AND IN(N)` = M×N OR predicates

---

## 3. Index Merge Optimization

### Three Algorithms

| Algorithm | Combines | EXPLAIN Extra |
|-----------|----------|---------------|
| Intersection | AND conditions on different indexes | `Using intersect(idx1,idx2)` |
| Union | OR conditions on different indexes | `Using union(idx1,idx2)` |
| Sort-Union | OR conditions (when Union doesn't apply) | `Using sort_union(idx1,idx2)` |

- EXPLAIN `type`: `index_merge`
- Each condition must cover ALL parts of its index with equality (for Intersection/Union)
- InnoDB PK range condition can participate in Intersection
- Not applicable to fulltext indexes

---

## 4. Index Condition Pushdown (ICP)

### How It Works
Without ICP: read index → read full row → test WHERE
With ICP: read index → test WHERE parts using index columns → skip row if false → read full row only if true

### When ICP Applies
- Access methods: `range`, `ref`, `eq_ref`, `ref_or_null`
- InnoDB: secondary indexes only (clustered index already has full row)
- NOT for: subqueries, stored functions, triggered conditions, virtual columns

### EXPLAIN: `Using index condition`

### Classic Example
Index `(zipcode, lastname, firstname)`:
```sql
WHERE zipcode='95054' AND lastname LIKE '%etrunia%'
```
Without ICP: reads all rows for zipcode=95054, then filters lastname
With ICP: checks lastname against index before reading rows

---

## 5. Nested-Loop Joins

### Simple Nested-Loop Join
```
for each row in t1 matching range {
  for each row in t2 matching reference key {
    for each row in t3 {
      if row satisfies join conditions, send to client
    }
  }
}
```

### Outer Join Execution
- Uses boolean flags per inner table loop
- Flag off → no match found → generate NULL-complemented row
- Outer table loops must precede inner table loops

---

## 6. Outer Join Optimization

### Conversion to Inner Join (NULL-Rejection)
If WHERE condition is always false for NULL-complemented rows:
```sql
SELECT * FROM t1 LEFT JOIN t2 ON (...) WHERE t2.column2=5;
-- Converted to inner join (t2.column2=5 rejects NULLs)
```

### LEFT JOIN + IS NULL Pattern
```sql
SELECT * FROM t1 LEFT JOIN t2 ON (...) WHERE t2.id IS NULL;
```
MySQL stops searching for more B rows after finding one ON match.

---

## 7. ORDER BY Optimization

### When Index CAN Be Used
- ORDER BY matches index prefix: `ORDER BY key_part1, key_part2`
- Gap filled by WHERE equality: `WHERE key_part1 = const ORDER BY key_part2`
- All DESC: `ORDER BY key_part1 DESC, key_part2 DESC`
- Range on first part: `WHERE key_part1 > const ORDER BY key_part1`

### When Index CANNOT Be Used
- Different indexes: `ORDER BY key1, key2`
- Non-consecutive parts: `WHERE key2=const ORDER BY key1_part1, key1_part3`
- Mixed ASC/DESC not matching index direction
- Expression: `ORDER BY ABS(key)`
- Multi-table join, ORDER BY not from first non-constant table
- Different ORDER BY and GROUP BY expressions
- Prefix-only index on ORDER BY column

### filesort Modes
1. `<sort_key, rowid>`: sort + re-read rows
2. `<sort_key, additional_fields>`: sort + carry all columns (fixed-length)
3. `<sort_key, packed_additional_fields>`: sort + carry all columns (packed)

### MySQL 8.4: GROUP BY No Longer Sorts Implicitly
Always use explicit ORDER BY if sorted output is needed.

---

## 8. GROUP BY Optimization

### Loose Index Scan (Best)
- EXPLAIN: `Using index for group-by`
- Single table, GROUP BY = leftmost index prefix
- Only MIN()/MAX() aggregates on column immediately after GROUP BY columns
- Full column values indexed (no prefix indexes)

### Tight Index Scan
- Full or range index scan, avoids temporary table
- Gaps in GROUP BY columns filled by WHERE equality constants

---

## 9. LIMIT Optimization

- **ORDER BY + LIMIT**: stops sorting after finding first N rows (if index used)
- **DISTINCT + LIMIT**: stops after N unique rows
- **GROUP BY + LIMIT**: avoids calculating unnecessary groups
- **LIMIT 0**: returns empty set immediately (useful for validation)
- **prefer_ordering_index**: optimizer_switch flag, prefers ordered index when LIMIT present

### Nondeterministic Order
Identical ORDER BY values → server may return rows in any order. Add unique tiebreaker column.

---

## 10. DISTINCT Optimization

- Equivalent to GROUP BY on all selected columns → all GROUP BY optimizations apply
- DISTINCT + LIMIT: stops after N unique rows
- Multi-table DISTINCT: stops scanning unused tables after first match

---

## 11. Subquery Optimization

### Semijoin Strategies (IN/EXISTS)
1. **Table Pullout**: subquery table pulled into outer join
2. **Duplicate Weedout**: join + temp table dedup (`Start temporary`/`End temporary`)
3. **FirstMatch**: shortcut on first match (`FirstMatch(tbl)`)
4. **LooseScan**: scan index, one value per group (`LooseScan(m..n)`)
5. **Materialization**: temp table with hash index (`MATERIALIZED`/`<subqueryN>`)

### Semijoin Eligibility (ALL required)
- IN, = ANY, or EXISTS at top level of WHERE/ON
- Single SELECT (no UNION), no HAVING, no aggregates, no LIMIT
- Combined tables < join table limit

### Antijoin Forms
- `NOT IN (SELECT ...)`, `NOT EXISTS (SELECT ...)`
- `IN (SELECT ...) IS NOT TRUE/FALSE`

### Subquery Materialization
- Generates temp table (memory, falls back to disk)
- Hash index added for dedup + fast lookup
- Applies when IN result UNKNOWN = FALSE (common in WHERE context)
- NOT for BLOB inner expressions

### EXISTS Strategy (IN → EXISTS Rewrite)
- Works for nullable outer expressions
- `ref_or_null` access when inner expr nullable
- `Full scan on NULL key` when outer expr is NULL at runtime
- **Recommendation**: declare columns NOT NULL to avoid NULL execution paths

---

## 12. Derived Table Optimization

### Merge vs Materialize
- **Merge**: derived table folded into outer query (no temp table)
- **Materialize**: internal temp table created

### Constructs That Prevent Merging
- Aggregate/window functions, DISTINCT, GROUP BY, HAVING, LIMIT
- UNION/UNION ALL, subqueries in select list, user variable assignments

### CTE Optimization
- Materialized once, reusable across multiple references
- Optimizer may add multiple indexes for different references
- Recursive CTEs always materialized

---

## Key Rules for the Analyzer Engine

### Rules to Add in Phase 2

1. **Function on indexed column** → prevents index use (YEAR(), DATE(), LOWER(), etc.)
2. **Mixed ASC/DESC ORDER BY** → check if index supports the direction pattern
3. **ORDER BY from different table than first join table** → forces filesort
4. **GROUP BY not matching leftmost index prefix** → can't use Loose Index Scan
5. **Gaps in composite index usage** → key_len shows how many parts used
6. **HAVING without GROUP BY** → merged with WHERE (usually a mistake)
7. **Nullable columns in subquery** → triggers expensive NULL handling (ref_or_null, full scan on NULL key)
8. **NOT IN with nullable columns** → antijoin may not apply
9. **Derived table with LIMIT/DISTINCT/GROUP BY** → forces materialization
10. **CTE referenced multiple times** → materialized once (good), check if merge would be better
11. **eq_range_index_dive_limit** → large IN lists may use less accurate statistics
12. **range_optimizer_max_mem_size** → complex OR conditions may exceed memory and fall back to scan
13. **ORDER BY + LIMIT without unique tiebreaker** → nondeterministic results
14. **Implicit GROUP BY sorting removed in 8.4** → must use explicit ORDER BY
15. **Semijoin eligibility** → check if subquery meets all criteria for optimization
16. **Index Merge missed** → try rewriting AND/OR distribution for better optimization
17. **Skip Scan possible** → compound index with missing first-part condition
18. **Covering index opportunity** → all referenced columns in index, no table read needed
19. **Constant table detection** → PK/UNIQUE lookup with all-constant comparisons
20. **LEFT JOIN → inner join conversion** → WHERE rejects NULLs from inner table
