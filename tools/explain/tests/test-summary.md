# EXPLAIN Analyzer — Test Report

**Date**: 2026-04-09
**Queries**: 50
**Errors**: 0

## Summary

| Metric | Count |
|--------|-------|
| Issues detected | 102 |
| Index recommendations | 53 |
| Impact simulations | 23 |
| Query hints | 40 |
| Query rewrites | 8 |
| Average score | 86/100 |

## Per-Query Results

| # | Name | Score | Issues | Idx Recs | Impact | Hints | Rewrites |
|---|------|-------|--------|----------|--------|-------|----------|
| 1 | Full scan with low-selectivity filter | 95 | 1 | 0 | 0 | 1 | 1 |
| 2 | Full scan with range filter on unindexed column | 77 | 2 | 1 | 1 | 1 | 1 |
| 3 | Full scan with LIKE prefix pattern | 77 | 2 | 1 | 1 | 0 | 0 |
| 4 | Full scan on large table no WHERE | 77 | 2 | 0 | 0 | 1 | 1 |
| 5 | Filter on non-indexed column | 95 | 1 | 1 | 0 | 0 | 0 |
| 6 | Simple two-table join | 97 | 2 | 1 | 0 | 0 | 0 |
| 7 | Three-table join with aggregation | 82 | 1 | 2 | 0 | 1 | 0 |
| 8 | Join with filter on both tables | 97 | 2 | 2 | 1 | 0 | 0 |
| 9 | Left join with NULL check | 94 | 4 | 0 | 0 | 0 | 0 |
| 10 | Multi-join order pipeline | 79 | 3 | 3 | 0 | 1 | 0 |
| 11 | GROUP BY without composite index | 82 | 1 | 1 | 0 | 1 | 0 |
| 12 | GROUP BY with HAVING | 90 | 2 | 1 | 1 | 2 | 0 |
| 13 | GROUP BY on non-indexed column | 82 | 1 | 1 | 0 | 1 | 0 |
| 14 | GROUP BY with ORDER BY different column | 95 | 1 | 1 | 1 | 0 | 0 |
| 15 | GROUP BY date function (non-sargable) | 84 | 2 | 0 | 0 | 1 | 0 |
| 16 | ORDER BY on non-indexed column | 95 | 1 | 1 | 1 | 1 | 0 |
| 17 | ORDER BY with large offset | 89 | 3 | 1 | 1 | 1 | 0 |
| 18 | ORDER BY RAND() | 89 | 3 | 1 | 1 | 2 | 1 |
| 19 | Multi-column ORDER BY | 59 | 3 | 1 | 1 | 0 | 0 |
| 20 | ORDER BY with expression | 95 | 1 | 0 | 0 | 1 | 0 |
| 21 | Correlated subquery in WHERE | 84 | 4 | 0 | 0 | 1 | 0 |
| 22 | Subquery with IN | 72 | 3 | 1 | 1 | 1 | 0 |
| 23 | NOT IN subquery (anti-join pattern) | 86 | 5 | 1 | 1 | 3 | 1 |
| 24 | Scalar subquery in SELECT | 97 | 2 | 0 | 0 | 1 | 0 |
| 25 | EXISTS subquery | 72 | 3 | 1 | 1 | 1 | 0 |
| 26 | Join needing covering index | 82 | 1 | 2 | 0 | 1 | 0 |
| 27 | Lookup with extra columns | 95 | 1 | 1 | 0 | 1 | 0 |
| 28 | Count with filter — covering candidate | 100 | 0 | 1 | 0 | 1 | 0 |
| 29 | Date range scan | 77 | 2 | 0 | 0 | 0 | 0 |
| 30 | BETWEEN on non-indexed column | 77 | 2 | 1 | 1 | 0 | 0 |
| 31 | Range + equality composite | 77 | 2 | 2 | 1 | 0 | 0 |
| 32 | SELECT * with join | 97 | 2 | 1 | 0 | 1 | 1 |
| 33 | SELECT * from large table with filter | 77 | 2 | 2 | 2 | 1 | 1 |
| 34 | Revenue by country — full pipeline | 79 | 3 | 2 | 0 | 1 | 0 |
| 35 | Top products by review score | 82 | 1 | 2 | 0 | 2 | 0 |
| 36 | Customer lifetime value with tiers | 76 | 3 | 1 | 0 | 3 | 0 |
| 37 | Inventory health — low stock products | 90 | 2 | 1 | 1 | 0 | 0 |
| 38 | Order fulfillment time analysis | 82 | 1 | 1 | 1 | 0 | 0 |
| 39 | Abandoned cart pattern — pending old orders | 99 | 3 | 1 | 0 | 1 | 0 |
| 40 | Payment reconciliation — mismatched amounts | 82 | 1 | 2 | 0 | 2 | 0 |
| 41 | YEAR() on indexed column | 89 | 3 | 0 | 0 | 1 | 1 |
| 42 | LOWER() on column | 71 | 4 | 0 | 0 | 1 | 0 |
| 43 | Arithmetic on column in WHERE | 77 | 2 | 1 | 1 | 0 | 0 |
| 44 | DISTINCT with GROUP BY (redundant) | 89 | 3 | 2 | 2 | 1 | 0 |
| 45 | UNION vs UNION ALL | 95 | 1 | 1 | 0 | 1 | 0 |
| 46 | Bad estimate — skewed data distribution | 95 | 1 | 1 | 0 | 0 | 0 |
| 47 | Join with filtered rows — estimate test | 97 | 2 | 2 | 1 | 0 | 0 |
| 48 | Deeply nested join — 5 tables | 97 | 2 | 3 | 0 | 0 | 0 |
| 49 | Self-referencing category tree | 77 | 2 | 0 | 0 | 0 | 0 |
| 50 | Cross-table aggregation with CASE | 82 | 1 | 1 | 1 | 0 | 0 |

## Index Recommendations Detail

### Q2: Full scan with range filter on unindexed column
- **orders**(total_amount) — high
  Full table scan on `orders` (50.5K rows) with filter on `total_amount`
  **Impact**: eliminates full scan
  - Full table scan (ALL) → Index lookup (range)

### Q3: Full scan with LIKE prefix pattern
- **customers**(last_name) — high
  Full table scan on `customers` (3,334 rows) with filter on `last_name`
  **Impact**: eliminates full scan
  - Full table scan (ALL) → Index lookup (range)

### Q5: Filter on non-indexed column
- **products**(brand, is_active) — high
  Composite index: WHERE on `brand`, `is_active` — eliminates scan and avoids temporary table/filesort

### Q6: Simple two-table join
- **orders**(status, customer_id) — high
  Composite index: WHERE on `status` + JOIN on `customer_id` — eliminates scan and avoids temporary table/filesort

### Q7: Three-table join with aggregation
- **payments**(status, order_id) — high
  Composite index: WHERE on `status` + JOIN on `order_id` — eliminates scan and avoids temporary table/filesort
- **orders**(customer_id, total_amount) — high
  Composite index: JOIN on `customer_id` + covers `id`, `total_amount` for index-only scan — eliminates scan and avoids temporary table/filesort

### Q8: Join with filter on both tables
- **orders**(quantity, id, status) — high
  `idx_status` reads 24.7K rows — a composite covering index (`quantity`, `id`, `status`) would be more selective and avoid table lookups
  **Impact**: index-only scan
  - Index lookup + table data read (random I/O) → Index-only scan (no table access)
- **order_items**(quantity, order_id) — high
  Composite index: WHERE on `quantity` + JOIN on `order_id` — eliminates scan and avoids temporary table/filesort

### Q10: Multi-join order pipeline
- **orders**(status, customer_id) — high
  Composite index: WHERE on `status` + JOIN on `customer_id` — eliminates scan and avoids temporary table/filesort
- **payments**(status, order_id) — high
  Composite index: WHERE on `status` + JOIN on `order_id` — eliminates scan and avoids temporary table/filesort
- **shipping_events**(order_id, event_at) — high
  Composite index: JOIN on `order_id` + ORDER BY on `event_at` — eliminates scan and avoids temporary table/filesort

### Q11: GROUP BY without composite index
- **orders**(status, customer_id, total_amount) — high
  Composite index: WHERE on `status` + GROUP BY on `customer_id` + covers `total_amount` for index-only scan — eliminates scan and avoids temporary table/filesort

### Q12: GROUP BY with HAVING
- **reviews**(product_id, rating) — high
  Composite index: GROUP BY on `product_id` + covers `rating` for index-only scan — eliminates scan and avoids temporary table/filesort
  **Impact**: eliminates full scan, index-only scan
  - Full table scan (index) → Index lookup (range)
  - Index lookup + table data read (random I/O) → Index-only scan (no table access)

### Q13: GROUP BY on non-indexed column
- **customers**(status, country_code) — high
  Composite index: WHERE on `status` + GROUP BY on `country_code` — eliminates scan and avoids temporary table/filesort

### Q14: GROUP BY with ORDER BY different column
- **products**(is_active, brand) — high
  Composite index: WHERE on `is_active` + GROUP BY on `brand` — eliminates scan and avoids temporary table/filesort
  **Impact**: eliminates full scan
  - Full table scan (index) → Index lookup (ref)

### Q16: ORDER BY on non-indexed column
- **customers**(status, created_at) — high
  Composite index: WHERE on `status` + ORDER BY on `created_at` — eliminates scan and avoids temporary table/filesort
  **Impact**: eliminates filesort
  - Filesort required (rows sorted in memory/disk) → Index delivers rows in sorted order

### Q17: ORDER BY with large offset
- **products**(is_active, price) — high
  Composite index: WHERE on `is_active` + ORDER BY on `price` — eliminates scan and avoids temporary table/filesort
  **Impact**: eliminates full scan, eliminates filesort
  - Full table scan (ALL) → Index lookup (ref)
  - Filesort required (rows sorted in memory/disk) → Index delivers rows in sorted order

### Q18: ORDER BY RAND()
- **products**(is_active) — high
  Column `is_active` used in filter/join on `products` has no index
  **Impact**: eliminates full scan
  - Full table scan (ALL) → Index lookup (ref)

### Q19: Multi-column ORDER BY
- **orders**(shipping_country, status) — high
  Covering index for `orders` — filter on `shipping_country` + covers `status` without table lookup
  **Impact**: eliminates full scan, index-only scan, eliminates filesort
  - Full table scan (ALL) → Index lookup (ref)
  - Index lookup + table data read (random I/O) → Index-only scan (no table access)
  - Filesort required (rows sorted in memory/disk) → Index delivers rows in sorted order

### Q22: Subquery with IN
- **products**(quantity) — high
  Full table scan on `products` (9,929 rows) with filter on `quantity`
  **Impact**: eliminates full scan
  - Full table scan (ALL) → Index lookup (range)

### Q23: NOT IN subquery (anti-join pattern)
- **customers**(customer_id) — high
  Column `customer_id` used in filter/join on `customers` has no index
  **Impact**: eliminates full scan
  - Full table scan (index) → Index lookup (range)

### Q25: EXISTS subquery
- **products**(rating) — high
  Full table scan on `p` (6,960 rows) with filter on `rating`
  **Impact**: eliminates full scan
  - Full table scan (ALL) → Index lookup (ref)

### Q26: Join needing covering index
- **orders**(status, ordered_at) — high
  Composite index: WHERE on `status` + GROUP BY on `ordered_at` — eliminates scan and avoids temporary table/filesort
- **order_items**(order_id, line_total) — high
  Composite index: JOIN on `order_id` + covers `line_total` for index-only scan — eliminates scan and avoids temporary table/filesort

### Q27: Lookup with extra columns
- **inventory_log**(warehouse_id, reason, product_id, change_qty) — high
  Composite index: WHERE on `warehouse_id`, `reason` + GROUP BY on `product_id` + covers `change_qty` for index-only scan — eliminates scan and avoids temporary table/filesort

### Q28: Count with filter — covering candidate
- **orders**(payment_method, status, customer_id) — high
  Composite index: WHERE on `payment_method`, `status` + GROUP BY on `customer_id` — eliminates scan and avoids temporary table/filesort

### Q30: BETWEEN on non-indexed column
- **products**(price) — high
  Full table scan on `products` (1,980 rows) with filter on `price`
  **Impact**: eliminates full scan
  - Full table scan (ALL) → Index lookup (range)

### Q31: Range + equality composite
- **payments**(status, amount, paid_at) — high
  Composite index: WHERE on `status`, `amount` + ORDER BY on `paid_at` — eliminates scan and avoids temporary table/filesort
  **Impact**: eliminates filesort
  - Filesort required (rows sorted in memory/disk) → Index delivers rows in sorted order
- **payments**(amount) — medium
  Filesort detected — consider a composite index matching WHERE + ORDER BY columns

### Q32: SELECT * with join
- **orders**(status, customer_id) — high
  Composite index: WHERE on `status` + JOIN on `customer_id` — eliminates scan and avoids temporary table/filesort

### Q33: SELECT * from large table with filter
- **shipping_events**(carrier, event_type) — high
  Full table scan on `shipping_events` (4,286 rows) with filter on `carrier`, `event_type`
  **Impact**: eliminates full scan
  - Full table scan (ALL) → Index lookup (ref)
- **shipping_events**(event_type) — high
  Column `event_type` used in filter/join on `shipping_events` has no index
  **Impact**: eliminates full scan
  - Full table scan (ALL) → Index lookup (ref)

### Q34: Revenue by country — full pipeline
- **payments**(status, order_id, amount) — high
  Composite index: WHERE on `status` + JOIN on `order_id` + covers `amount` for index-only scan — eliminates scan and avoids temporary table/filesort
- **orders**(ordered_at, shipping_country) — high
  Composite index: WHERE on `ordered_at` + GROUP BY on `shipping_country` + covers `id` for index-only scan — eliminates scan and avoids temporary table/filesort

### Q35: Top products by review score
- **products**(is_active, name, brand) — high
  Composite index: WHERE on `is_active` + GROUP BY on `name`, `brand` — eliminates scan and avoids temporary table/filesort
- **reviews**(product_id, rating) — high
  Composite index: JOIN on `product_id` + covers `rating`, `id` for index-only scan — eliminates scan and avoids temporary table/filesort

### Q36: Customer lifetime value with tiers
- **customers**(tier) — high
  Composite index: GROUP BY on `tier` + covers `id` for index-only scan — eliminates scan and avoids temporary table/filesort

### Q37: Inventory health — low stock products
- **products**(is_active, stock_qty, name) — high
  Composite index: WHERE on `is_active`, `stock_qty` + GROUP BY on `name`, `stock_qty` — eliminates scan and avoids temporary table/filesort
  **Impact**: eliminates filesort
  - Filesort required (rows sorted in memory/disk) → Index delivers rows in sorted order

### Q38: Order fulfillment time analysis
- **orders**(status, delivered_at, shipping_country) — high
  Composite index: WHERE on `status`, `delivered_at` + GROUP BY on `shipping_country` — eliminates scan and avoids temporary table/filesort
  **Impact**: eliminates filesort
  - Filesort required (rows sorted in memory/disk) → Index delivers rows in sorted order

### Q39: Abandoned cart pattern — pending old orders
- **orders**(status, ordered_at, customer_id) — high
  Composite index: WHERE on `status`, `ordered_at` + JOIN on `customer_id` + ORDER BY on `ordered_at` — eliminates scan and avoids temporary table/filesort

### Q40: Payment reconciliation — mismatched amounts
- **payments**(status, order_id, amount) — high
  Composite index: WHERE on `status` + JOIN on `order_id` + covers `amount` for index-only scan — eliminates scan and avoids temporary table/filesort
- **orders**(total_amount) — high
  Composite index: GROUP BY on `total_amount` — eliminates scan and avoids temporary table/filesort

### Q43: Arithmetic on column in WHERE
- **products**(cost) — high
  Composite index: WHERE on `cost` — eliminates scan and avoids temporary table/filesort
  **Impact**: eliminates full scan
  - Full table scan (ALL) → Index lookup (range)

### Q44: DISTINCT with GROUP BY (redundant)
- **orders**(cost, rows) — high
  `idx_customer` reads 43.2K rows — a composite covering index (`cost`, `rows`) would be more selective and avoid table lookups
  **Impact**: eliminates full scan, index-only scan
  - Full table scan (index) → Index lookup (ref)
  - Index lookup + table data read (random I/O) → Index-only scan (no table access)
- **orders**(rows) — high
  Column `rows` used in filter/join on `orders` has no index
  **Impact**: eliminates full scan
  - Full table scan (index) → Index lookup (ref)

### Q45: UNION vs UNION ALL
- **customers**(tier) — high
  Composite index: WHERE on `tier` — eliminates scan and avoids temporary table/filesort

### Q46: Bad estimate — skewed data distribution
- **orders**(status, payment_method) — high
  Composite index: WHERE on `status`, `payment_method` — eliminates scan and avoids temporary table/filesort

### Q47: Join with filtered rows — estimate test
- **orders**(discount_pct, id, status) — high
  `idx_status` reads 1,054 rows — a composite covering index (`discount_pct`, `id`, `status`) would be more selective and avoid table lookups
  **Impact**: index-only scan
  - Index lookup + table data read (random I/O) → Index-only scan (no table access)
- **order_items**(discount_pct, order_id) — high
  Composite index: WHERE on `discount_pct` + JOIN on `order_id` — eliminates scan and avoids temporary table/filesort

### Q48: Deeply nested join — 5 tables
- **customers**(tier) — high
  Composite index: WHERE on `tier` — eliminates scan and avoids temporary table/filesort
- **orders**(status, customer_id) — high
  Composite index: WHERE on `status` + JOIN on `customer_id` — eliminates scan and avoids temporary table/filesort
- **order_items**(order_id, product_id) — high
  Composite index: JOIN on `order_id`, `product_id` — eliminates scan and avoids temporary table/filesort

### Q50: Cross-table aggregation with CASE
- **products**(is_active, brand) — high
  Composite index: WHERE on `is_active` + GROUP BY on `brand` — eliminates scan and avoids temporary table/filesort
  **Impact**: eliminates temp table
  - Temporary table needed for GROUP BY → Grouped via index (ordered stream)
