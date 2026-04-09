/**
 * 50 test queries covering every analyzer pattern.
 * Each query has a category tag so we can validate the right rules fire.
 */
export interface TestQuery {
  id: number
  name: string
  /** What analyzer pattern(s) this should trigger */
  tags: string[]
  query: string
  ddl?: string // Optional extra DDL context for this specific query
}

export const TEST_QUERIES: TestQuery[] = [
  // ============================================================
  // GROUP 1: Full Table Scans (should trigger index recommendations)
  // ============================================================
  {
    id: 1,
    name: 'Full scan with low-selectivity filter',
    tags: ['full_scan', 'index_rec'],
    query: `SELECT * FROM customers WHERE status = 'suspended'`,
  },
  {
    id: 2,
    name: 'Full scan with range filter on unindexed column',
    tags: ['full_scan', 'index_rec', 'select_star'],
    query: `SELECT * FROM orders WHERE total_amount > 500 AND total_amount < 1000`,
  },
  {
    id: 3,
    name: 'Full scan with LIKE prefix pattern',
    tags: ['full_scan'],
    query: `SELECT id, first_name, last_name FROM customers WHERE last_name LIKE 'Smith%'`,
  },
  {
    id: 4,
    name: 'Full scan on large table no WHERE',
    tags: ['full_scan', 'select_star'],
    query: `SELECT * FROM order_items`,
  },
  {
    id: 5,
    name: 'Filter on non-indexed column',
    tags: ['full_scan', 'index_rec'],
    query: `SELECT id, name, price FROM products WHERE brand = 'BrandA' AND is_active = 1`,
  },

  // ============================================================
  // GROUP 2: JOIN patterns
  // ============================================================
  {
    id: 6,
    name: 'Simple two-table join',
    tags: ['join'],
    query: `SELECT o.id, o.total_amount, c.email
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending'`,
  },
  {
    id: 7,
    name: 'Three-table join with aggregation',
    tags: ['join', 'group_by', 'temp_table'],
    query: `SELECT c.email, COUNT(o.id) AS order_count, SUM(o.total_amount) AS lifetime_value
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN payments p ON p.order_id = o.id
WHERE p.status = 'completed'
GROUP BY c.email`,
  },
  {
    id: 8,
    name: 'Join with filter on both tables',
    tags: ['join', 'index_rec'],
    query: `SELECT o.id, oi.product_id, oi.quantity, oi.line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'shipped' AND oi.quantity > 3`,
  },
  {
    id: 9,
    name: 'Left join with NULL check',
    tags: ['join'],
    query: `SELECT c.id, c.email
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL AND c.status = 'active'`,
  },
  {
    id: 10,
    name: 'Multi-join order pipeline',
    tags: ['join', 'multi_join'],
    query: `SELECT o.id, c.email, p.amount, se.event_type, se.event_at
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN payments p ON p.order_id = o.id
JOIN shipping_events se ON se.order_id = o.id
WHERE o.status = 'shipped'
AND p.status = 'completed'
ORDER BY se.event_at DESC
LIMIT 100`,
  },

  // ============================================================
  // GROUP 3: GROUP BY / Aggregation (temp table / filesort)
  // ============================================================
  {
    id: 11,
    name: 'GROUP BY without composite index',
    tags: ['group_by', 'temp_table', 'index_rec'],
    query: `SELECT customer_id, COUNT(*) AS cnt, SUM(total_amount) AS total
FROM orders
WHERE status = 'delivered'
GROUP BY customer_id`,
  },
  {
    id: 12,
    name: 'GROUP BY with HAVING',
    tags: ['group_by', 'having'],
    query: `SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
FROM reviews
GROUP BY product_id
HAVING COUNT(*) >= 5 AND AVG(rating) < 3`,
  },
  {
    id: 13,
    name: 'GROUP BY on non-indexed column',
    tags: ['group_by', 'temp_table', 'index_rec'],
    query: `SELECT country_code, tier, COUNT(*) AS cnt
FROM customers
WHERE status = 'active'
GROUP BY country_code, tier`,
  },
  {
    id: 14,
    name: 'GROUP BY with ORDER BY different column',
    tags: ['group_by', 'filesort', 'temp_table'],
    query: `SELECT brand, SUM(price * stock_qty) AS inventory_value
FROM products
WHERE is_active = 1
GROUP BY brand
ORDER BY inventory_value DESC`,
  },
  {
    id: 15,
    name: 'GROUP BY date function (non-sargable)',
    tags: ['group_by', 'non_sargable', 'hint_year'],
    query: `SELECT YEAR(ordered_at) AS yr, MONTH(ordered_at) AS mo, COUNT(*) AS cnt
FROM orders
GROUP BY YEAR(ordered_at), MONTH(ordered_at)`,
  },

  // ============================================================
  // GROUP 4: ORDER BY / Filesort
  // ============================================================
  {
    id: 16,
    name: 'ORDER BY on non-indexed column',
    tags: ['filesort', 'index_rec'],
    query: `SELECT id, email, created_at
FROM customers
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 20`,
  },
  {
    id: 17,
    name: 'ORDER BY with large offset',
    tags: ['filesort', 'hint_offset'],
    query: `SELECT id, name, price
FROM products
WHERE is_active = 1
ORDER BY price DESC
LIMIT 20 OFFSET 5000`,
  },
  {
    id: 18,
    name: 'ORDER BY RAND()',
    tags: ['filesort', 'hint_rand'],
    query: `SELECT id, name, price FROM products WHERE is_active = 1 ORDER BY RAND() LIMIT 10`,
  },
  {
    id: 19,
    name: 'Multi-column ORDER BY',
    tags: ['filesort'],
    query: `SELECT id, status, total_amount, ordered_at
FROM orders
WHERE shipping_country = 'US'
ORDER BY status, ordered_at DESC`,
  },
  {
    id: 20,
    name: 'ORDER BY with expression',
    tags: ['filesort', 'non_sargable'],
    query: `SELECT id, total_amount, discount_amount, (total_amount - discount_amount) AS net
FROM orders
WHERE status = 'delivered'
ORDER BY (total_amount - discount_amount) DESC
LIMIT 50`,
  },

  // ============================================================
  // GROUP 5: Subqueries
  // ============================================================
  {
    id: 21,
    name: 'Correlated subquery in WHERE',
    tags: ['subquery', 'hint_subquery'],
    query: `SELECT c.id, c.email
FROM customers c
WHERE (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) > 5`,
  },
  {
    id: 22,
    name: 'Subquery with IN',
    tags: ['subquery'],
    query: `SELECT id, name, price
FROM products
WHERE id IN (SELECT product_id FROM order_items WHERE quantity >= 5)`,
  },
  {
    id: 23,
    name: 'NOT IN subquery (anti-join pattern)',
    tags: ['subquery', 'hint_not_in', 'rewrite_not_in'],
    query: `SELECT id, email FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders WHERE status = 'delivered')`,
  },
  {
    id: 24,
    name: 'Scalar subquery in SELECT',
    tags: ['subquery', 'hint_subquery'],
    query: `SELECT o.id, o.total_amount,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
FROM orders o
WHERE o.status = 'pending'
LIMIT 100`,
  },
  {
    id: 25,
    name: 'EXISTS subquery',
    tags: ['subquery'],
    query: `SELECT p.id, p.name
FROM products p
WHERE EXISTS (SELECT 1 FROM reviews r WHERE r.product_id = p.id AND r.rating = 5)`,
  },

  // ============================================================
  // GROUP 6: Covering index opportunities
  // ============================================================
  {
    id: 26,
    name: 'Join needing covering index',
    tags: ['covering', 'index_rec'],
    query: `SELECT o.id, o.ordered_at, SUM(oi.line_total) AS order_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'processing'
GROUP BY o.id, o.ordered_at`,
  },
  {
    id: 27,
    name: 'Lookup with extra columns',
    tags: ['covering'],
    query: `SELECT product_id, SUM(change_qty) AS net_change
FROM inventory_log
WHERE warehouse_id = 1 AND reason = 'purchase'
GROUP BY product_id`,
  },
  {
    id: 28,
    name: 'Count with filter — covering candidate',
    tags: ['covering', 'index_rec'],
    query: `SELECT customer_id, COUNT(*) AS cnt
FROM orders
WHERE payment_method = 'paypal' AND status = 'completed'
GROUP BY customer_id`,
  },

  // ============================================================
  // GROUP 7: Range scans / Inequality
  // ============================================================
  {
    id: 29,
    name: 'Date range scan',
    tags: ['range'],
    query: `SELECT id, customer_id, total_amount
FROM orders
WHERE ordered_at >= '2025-01-01' AND ordered_at < '2025-07-01'`,
  },
  {
    id: 30,
    name: 'BETWEEN on non-indexed column',
    tags: ['range', 'index_rec'],
    query: `SELECT id, name, price FROM products WHERE price BETWEEN 100 AND 200`,
  },
  {
    id: 31,
    name: 'Range + equality composite',
    tags: ['range', 'index_rec'],
    query: `SELECT id, amount, paid_at
FROM payments
WHERE status = 'completed' AND amount > 200
ORDER BY paid_at DESC`,
  },

  // ============================================================
  // GROUP 8: SELECT * anti-pattern
  // ============================================================
  {
    id: 32,
    name: 'SELECT * with join',
    tags: ['select_star', 'hint_select_star'],
    query: `SELECT * FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'pending'`,
  },
  {
    id: 33,
    name: 'SELECT * from large table with filter',
    tags: ['select_star', 'hint_select_star'],
    query: `SELECT * FROM shipping_events WHERE carrier = 'fedex' AND event_type = 'delivered'`,
  },

  // ============================================================
  // GROUP 9: Complex real-world queries
  // ============================================================
  {
    id: 34,
    name: 'Revenue by country — full pipeline',
    tags: ['join', 'group_by', 'temp_table', 'index_rec'],
    query: `SELECT o.shipping_country, COUNT(DISTINCT o.id) AS orders, SUM(p.amount) AS revenue
FROM orders o
JOIN payments p ON p.order_id = o.id
WHERE p.status = 'completed'
AND o.ordered_at >= '2025-01-01'
GROUP BY o.shipping_country
ORDER BY revenue DESC`,
  },
  {
    id: 35,
    name: 'Top products by review score',
    tags: ['join', 'group_by', 'having', 'filesort'],
    query: `SELECT p.name, p.brand, AVG(r.rating) AS avg_rating, COUNT(r.id) AS reviews
FROM products p
JOIN reviews r ON r.product_id = p.id
WHERE p.is_active = 1
GROUP BY p.id, p.name, p.brand
HAVING COUNT(r.id) >= 3
ORDER BY avg_rating DESC, reviews DESC
LIMIT 50`,
  },
  {
    id: 36,
    name: 'Customer lifetime value with tiers',
    tags: ['join', 'group_by', 'index_rec'],
    query: `SELECT c.tier, COUNT(DISTINCT c.id) AS customers, AVG(sub.ltv) AS avg_ltv
FROM customers c
JOIN (
    SELECT customer_id, SUM(total_amount) AS ltv
    FROM orders
    WHERE status IN ('delivered','shipped')
    GROUP BY customer_id
) sub ON sub.customer_id = c.id
GROUP BY c.tier`,
  },
  {
    id: 37,
    name: 'Inventory health — low stock products',
    tags: ['join', 'group_by', 'having'],
    query: `SELECT p.id, p.name, p.stock_qty,
    COALESCE(SUM(CASE WHEN il.reason = 'purchase' THEN il.change_qty ELSE 0 END), 0) AS sold_30d
FROM products p
LEFT JOIN inventory_log il ON il.product_id = p.id
    AND il.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
WHERE p.is_active = 1 AND p.stock_qty < 20
GROUP BY p.id, p.name, p.stock_qty
ORDER BY sold_30d DESC`,
  },
  {
    id: 38,
    name: 'Order fulfillment time analysis',
    tags: ['join', 'group_by', 'filesort'],
    query: `SELECT o.shipping_country,
    AVG(DATEDIFF(o.delivered_at, o.ordered_at)) AS avg_delivery_days,
    MAX(DATEDIFF(o.delivered_at, o.ordered_at)) AS max_delivery_days,
    COUNT(*) AS cnt
FROM orders o
WHERE o.status = 'delivered' AND o.delivered_at IS NOT NULL
GROUP BY o.shipping_country
ORDER BY avg_delivery_days DESC`,
  },
  {
    id: 39,
    name: 'Abandoned cart pattern — pending old orders',
    tags: ['range', 'index_rec'],
    query: `SELECT o.id, c.email, o.total_amount, o.ordered_at
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending'
AND o.ordered_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY o.ordered_at
LIMIT 100`,
  },
  {
    id: 40,
    name: 'Payment reconciliation — mismatched amounts',
    tags: ['join', 'index_rec'],
    query: `SELECT o.id AS order_id, o.total_amount, SUM(p.amount) AS paid_total,
    o.total_amount - SUM(p.amount) AS difference
FROM orders o
JOIN payments p ON p.order_id = o.id
WHERE p.status = 'completed'
GROUP BY o.id, o.total_amount
HAVING ABS(o.total_amount - SUM(p.amount)) > 0.01`,
  },

  // ============================================================
  // GROUP 10: Non-sargable / Function on column
  // ============================================================
  {
    id: 41,
    name: 'YEAR() on indexed column',
    tags: ['non_sargable', 'hint_year', 'rewrite_year'],
    query: `SELECT COUNT(*) FROM orders WHERE YEAR(ordered_at) = 2025`,
  },
  {
    id: 42,
    name: 'LOWER() on column',
    tags: ['non_sargable'],
    query: `SELECT id, email FROM customers WHERE LOWER(email) = 'user100@gmail.com'`,
  },
  {
    id: 43,
    name: 'Arithmetic on column in WHERE',
    tags: ['non_sargable'],
    query: `SELECT id, price, cost FROM products WHERE price - cost > 100`,
  },

  // ============================================================
  // GROUP 11: DISTINCT / UNION patterns
  // ============================================================
  {
    id: 44,
    name: 'DISTINCT with GROUP BY (redundant)',
    tags: ['hint_distinct'],
    query: `SELECT DISTINCT customer_id, COUNT(*) AS cnt
FROM orders
GROUP BY customer_id`,
  },
  {
    id: 45,
    name: 'UNION vs UNION ALL',
    tags: ['hint_union'],
    query: `SELECT id, email FROM customers WHERE tier = 'gold'
UNION
SELECT id, email FROM customers WHERE tier = 'platinum'`,
  },

  // ============================================================
  // GROUP 12: Estimation accuracy tests
  // ============================================================
  {
    id: 46,
    name: 'Bad estimate — skewed data distribution',
    tags: ['estimate'],
    query: `SELECT id, total_amount FROM orders WHERE status = 'refunded' AND payment_method = 'crypto'`,
  },
  {
    id: 47,
    name: 'Join with filtered rows — estimate test',
    tags: ['estimate', 'join'],
    query: `SELECT o.id, oi.quantity
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'cancelled' AND oi.discount_pct > 15`,
  },

  // ============================================================
  // GROUP 13: Edge cases
  // ============================================================
  {
    id: 48,
    name: 'Deeply nested join — 5 tables',
    tags: ['multi_join', 'join'],
    query: `SELECT c.email, o.id, oi.product_id, p.name, r.rating
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
LEFT JOIN reviews r ON r.product_id = p.id AND r.customer_id = c.id
WHERE c.tier = 'platinum' AND o.status = 'delivered'
LIMIT 50`,
  },
  {
    id: 49,
    name: 'Self-referencing category tree',
    tags: ['join'],
    query: `SELECT c.name AS category, p.name AS parent
FROM categories c
LEFT JOIN categories p ON p.id = c.parent_id
WHERE c.parent_id IS NOT NULL`,
  },
  {
    id: 50,
    name: 'Cross-table aggregation with CASE',
    tags: ['group_by', 'join', 'temp_table'],
    query: `SELECT p.brand,
    SUM(CASE WHEN r.rating >= 4 THEN 1 ELSE 0 END) AS positive,
    SUM(CASE WHEN r.rating <= 2 THEN 1 ELSE 0 END) AS negative,
    COUNT(*) AS total
FROM products p
JOIN reviews r ON r.product_id = p.id
WHERE p.is_active = 1
GROUP BY p.brand
ORDER BY total DESC`,
  },
]
