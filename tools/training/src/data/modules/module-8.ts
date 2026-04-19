import type { Module } from '../../types'

export const module8: Module = {
  id: 8,
  title: 'Performance & EXPLAIN',
  slug: 'performance-explain',
  description: 'Full scan vs index scan, reading EXPLAIN output, index strategies, optimizer hints. Links to our EXPLAIN Analyzer.',
  icon: 'Zap',
  color: '#E67E22',
  lessons: [
    {
      id: 1, moduleId: 8, title: 'Why Queries Are Slow', slug: 'why-queries-slow',
      content: [
        {
          type: 'animation',
          animation: 'ScanCompareAnimation',
        },
        { type: 'text', html: `<h2>The Speed Problem</h2>
<p>A query that takes 50ms on 1,000 rows might take <strong>50 seconds</strong> on 1,000,000 rows. Understanding <em>why</em> queries are slow is the difference between a responsive app and a crashed server.</p>
<h3>The #1 Cause: Full Table Scans</h3>
<p>Without an index, MySQL must read <strong>every single row</strong> to find matches. This is called a <code>Full Table Scan</code> (type=ALL in EXPLAIN).</p>
<p>With an index, MySQL jumps directly to matching rows — like looking up a word in a dictionary vs reading every page.</p>` },
        { type: 'comparison',
          left: { title: 'Full Table Scan (type=ALL)', content: '<strong>1,000,000 rows examined</strong><br>Reads entire table sequentially.<br>Gets slower as table grows.<br>CPU + disk I/O intensive.' },
          right: { title: 'Index Lookup (type=ref)', content: '<strong>1-10 rows examined</strong><br>B+ tree traversal: 3-4 hops.<br>Constant time regardless of table size.<br>Minimal I/O.' },
        },
        { type: 'text', html: `<h3>Other Common Causes</h3>
<ul>
<li><strong>Missing indexes</strong> on WHERE, JOIN, and ORDER BY columns</li>
<li><strong>Functions on indexed columns</strong>: <code>WHERE YEAR(date) = 2024</code> can't use an index on <code>date</code></li>
<li><strong>SELECT *</strong> instead of specific columns (reads more data)</li>
<li><strong>Filesort</strong>: sorting without an index creates a temporary sort operation</li>
<li><strong>Temporary tables</strong>: GROUP BY without proper indexes</li>
<li><strong>N+1 queries</strong>: running a query per row instead of using JOINs</li>
</ul>` },
      ],
    },
    {
      id: 2, moduleId: 8, title: 'Reading EXPLAIN Output', slug: 'reading-explain',
      content: [
        { type: 'text', html: `<h2>MySQL EXPLAIN — Your X-Ray Vision</h2>
<p><code>EXPLAIN</code> shows MySQL's execution plan — how it will run your query. It reveals whether indexes are used, how many rows are examined, and what operations are performed.</p>` },
        { type: 'code', title: 'Usage', sql: `EXPLAIN SELECT * FROM employees WHERE department_id = 1;

-- Or for detailed timing information (MySQL 8.0+):
EXPLAIN ANALYZE SELECT * FROM employees WHERE department_id = 1;` },
        { type: 'text', html: `<h3>Key EXPLAIN Columns</h3>
<table>
<tr><th>Column</th><th>What it tells you</th><th>What to look for</th></tr>
<tr><td><code>type</code></td><td>How MySQL accesses the table</td><td><strong>ALL</strong> = bad (full scan). <strong>ref</strong>, <strong>range</strong>, <strong>const</strong> = good</td></tr>
<tr><td><code>key</code></td><td>Which index MySQL chose</td><td>NULL = no index used (usually bad)</td></tr>
<tr><td><code>rows</code></td><td>Estimated rows to examine</td><td>Should be much smaller than table size</td></tr>
<tr><td><code>Extra</code></td><td>Additional operations</td><td><strong>Using filesort</strong> and <strong>Using temporary</strong> = potential issues</td></tr>
<tr><td><code>filtered</code></td><td>% of rows that pass conditions</td><td>Low values mean lots of wasted work</td></tr>
</table>` },
        { type: 'text', html: `<h3>Access Type Rankings (best to worst)</h3>
<ol>
<li><code>system</code> / <code>const</code> — single row lookup (primary key = value)</li>
<li><code>eq_ref</code> — one row per join (unique index)</li>
<li><code>ref</code> — multiple rows via index (non-unique key)</li>
<li><code>range</code> — index range scan (BETWEEN, >, <)</li>
<li><code>index</code> — full index scan (reads entire index, no table)</li>
<li><code>ALL</code> — <strong>full table scan</strong> (reads every row!)</li>
</ol>` },
        { type: 'callout', calloutType: 'tip', html: `Paste your EXPLAIN output into our <a href="/tools/explain/">MySQL EXPLAIN Analyzer</a> for automatic issue detection, index recommendations, and tree visualization.` },
      ],
    },
    {
      id: 3, moduleId: 8, title: 'Index Strategies', slug: 'index-strategies',
      content: [
        { type: 'text', html: `<h2>Choosing the Right Indexes</h2>
<h3>1. Index WHERE Clause Columns</h3>
<p>If you frequently query <code>WHERE status = 'active'</code>, create an index on <code>status</code>.</p>
<h3>2. Composite Indexes for Multi-Column Queries</h3>
<p>For <code>WHERE department_id = 1 AND salary > 80000</code>, a composite index <code>(department_id, salary)</code> is better than two separate indexes.</p>` },
        { type: 'code', title: 'Composite index', sql: `-- Covers both WHERE conditions efficiently:
CREATE INDEX idx_dept_salary ON employees(department_id, salary);

-- MySQL uses this for:
-- WHERE department_id = 1
-- WHERE department_id = 1 AND salary > 80000
-- WHERE department_id = 1 ORDER BY salary` },
        { type: 'text', html: `<h3>3. Covering Indexes</h3>
<p>If the index contains all columns the query needs, MySQL can answer the query from the index alone without reading the table. This is called a <strong>covering index</strong> (shows "Using index" in EXPLAIN).</p>` },
        { type: 'code', title: 'Covering index example', sql: `-- If your query is:
SELECT department_id, salary FROM employees
WHERE department_id = 1;

-- This index "covers" it (contains both columns):
CREATE INDEX idx_dept_salary ON employees(department_id, salary);
-- MySQL never touches the table — reads everything from the index` },
        { type: 'text', html: `<h3>4. Don't Over-Index</h3>
<ul>
<li>Each index slows down INSERT/UPDATE/DELETE (index must be maintained)</li>
<li>Indexes use disk space and memory</li>
<li>Rule of thumb: index columns you filter, join, or sort by</li>
<li>Remove unused indexes (MySQL 8.0: use <code>sys.schema_unused_indexes</code>)</li>
</ul>` },
        { type: 'callout', calloutType: 'mysql', html: `<strong>MySQL 8.0+ features</strong>: Invisible indexes (<code>ALTER TABLE ... ALTER INDEX idx INVISIBLE</code>) let you "hide" an index from the optimizer to test if it's needed before dropping it. Descending indexes allow efficient DESC ordering.` },
      ],
    },
    {
      id: 4, moduleId: 8, title: 'Query Optimization Patterns', slug: 'optimization-patterns',
      content: [
        { type: 'text', html: `<h2>Common Optimization Patterns</h2>
<h3>1. Avoid Functions on Indexed Columns</h3>` },
        { type: 'comparison',
          left: { title: 'Bad (can\'t use index)', content: '<code>WHERE YEAR(hire_date) = 2023</code><br>MySQL must compute YEAR() for every row.' },
          right: { title: 'Good (uses index)', content: '<code>WHERE hire_date >= \'2023-01-01\' AND hire_date < \'2024-01-01\'</code><br>Direct range scan on the index.' },
        },
        { type: 'text', html: `<h3>2. Rewrite Subqueries as JOINs</h3>` },
        { type: 'comparison',
          left: { title: 'Subquery (may be slower)', content: '<code>WHERE id IN (SELECT emp_id FROM bonuses)</code><br>May execute inner query per row.' },
          right: { title: 'JOIN (usually faster)', content: '<code>INNER JOIN bonuses b ON e.id = b.emp_id</code><br>Single pass with hash/merge join.' },
        },
        { type: 'text', html: `<h3>3. Use LIMIT for Pagination</h3>
<p>Instead of fetching all rows and filtering in your app:</p>` },
        { type: 'comparison',
          left: { title: 'Bad', content: '<code>SELECT * FROM orders</code><br>Fetch all 1M orders, show first 20 in UI.' },
          right: { title: 'Good', content: '<code>SELECT * FROM orders ORDER BY id DESC LIMIT 20</code><br>MySQL returns only 20 rows.' },
        },
        { type: 'text', html: `<h3>4. SELECT Only What You Need</h3>` },
        { type: 'comparison',
          left: { title: 'Bad', content: '<code>SELECT * FROM employees</code><br>Reads all columns including large TEXT/BLOB.' },
          right: { title: 'Good', content: '<code>SELECT name, email FROM employees</code><br>Reads only needed columns. May use covering index.' },
        },
        { type: 'text', html: `<h3>5. MySQL Optimizer Hints</h3>
<p>When the optimizer makes a wrong choice, you can override it:</p>` },
        { type: 'code', title: 'Optimizer hints', sql: `-- Force MySQL to use a specific index:
SELECT * FROM employees FORCE INDEX (idx_dept_salary)
WHERE department_id = 1;

-- Tell MySQL the join order:
SELECT STRAIGHT_JOIN e.name, d.name
FROM departments d
JOIN employees e ON e.department_id = d.id;` },
        { type: 'callout', calloutType: 'tip', html: `<strong>Ready to analyze your own queries?</strong> Our <a href="/tools/explain/">MySQL EXPLAIN Analyzer</a> detects all these issues automatically — full table scans, missing indexes, filesort, temporary tables — and suggests specific fixes with index recommendations.` },
      ],
    },
  ],
  exercises: [
    {
      id: 1, moduleId: 8, title: 'Find the Full Scan',
      description: '<p>Write a query that finds employees hired in 2022 by checking the year. Then write a <strong>better version</strong> that uses a date range instead. Show both — the second query should be your final answer. Show <code>name</code> and <code>hire_date</code>, sorted by hire_date.</p>',
      difficulty: 'medium',
      starterQuery: "-- Optimized: use date range instead of YEAR()\n",
      expectedQuery: "SELECT name, hire_date FROM employees WHERE hire_date >= '2022-01-01' AND hire_date < '2023-01-01' ORDER BY hire_date;",
      expectedResult: {
        columns: ['name', 'hire_date'],
        values: [
          ['Olivia Harris', '2022-01-10'], ['James Stewart', '2022-01-20'],
          ['Amy Baker', '2022-02-01'], ['Victor Young', '2022-02-15'],
          ['Ulrich Cooper', '2022-03-01'], ['Peter Clark', '2022-03-20'],
          ['Elena Campbell', '2022-04-01'], ['Maya Reed', '2022-05-01'],
          ['Felix Parker', '2022-06-15'], ['Ophelia Morgan', '2022-07-15'],
          ['Gina Evans', '2022-08-01'], ['Tara Rivera', '2022-09-01'],
          ['Paul Bell', '2022-10-01'], ['Vera Richardson', '2022-11-01'],
          ['Xena Howard', '2022-12-01'],
        ],
      },
      hints: [
        "Don't use YEAR(hire_date) = 2022 — it prevents index usage",
        "Use a range: hire_date >= '2022-01-01' AND hire_date < '2023-01-01'",
        "SELECT name, hire_date FROM employees WHERE hire_date >= '2022-01-01' AND hire_date < '2023-01-01' ORDER BY hire_date;",
      ],
      validationMode: 'exact',
    },
    {
      id: 2, moduleId: 8, title: 'Optimize with JOIN',
      description: '<p>Rewrite this subquery as a JOIN: <code>SELECT name FROM employees WHERE department_id IN (SELECT id FROM departments WHERE budget > 1000000)</code>. Show <code>name</code> and <code>department</code> name.</p>',
      difficulty: 'medium',
      starterQuery: "-- Rewrite the subquery as a JOIN\n",
      expectedQuery: "SELECT e.name, d.name AS department FROM employees e INNER JOIN departments d ON e.department_id = d.id WHERE d.budget > 1000000;",
      expectedResult: {
        columns: ['name', 'department'],
        values: [
          ['Alice Johnson', 'Engineering'], ['Bob Smith', 'Engineering'], ['Carol Davis', 'Engineering'],
          ['Frank Brown', 'Sales'], ['Grace Lee', 'Sales'], ['Henry Taylor', 'Sales'],
          ['Sam Walker', 'Product'], ['Tina Hall', 'Product'],
          ['Wendy King', 'Engineering'], ['Xavier Wright', 'Engineering'],
          ['Zach Green', 'Sales'], ['Amy Baker', 'Engineering'],
          ['Chloe Turner', 'Sales'], ['Daniel Phillips', 'Product'],
          ['Hugo Edwards', 'Engineering'], ['Leo Rogers', 'Product'],
          ['Maya Reed', 'Sales'], ['Nathan Cook', 'Engineering'],
          ['Vera Richardson', 'Engineering'], ['Will Cox', 'Sales'],
          ['Xena Howard', 'Product'], ['Wendy King', 'Engineering'],
        ],
      },
      hints: [
        'Replace IN (SELECT ...) with INNER JOIN departments d ON ...',
        'Add WHERE d.budget > 1000000',
        'SELECT e.name, d.name AS department FROM employees e INNER JOIN departments d ON e.department_id = d.id WHERE d.budget > 1000000;',
      ],
      validationMode: 'unordered',
    },
    {
      id: 3, moduleId: 8, title: 'Efficient Pagination',
      description: '<p>Get <strong>page 3</strong> of orders (10 orders per page), sorted by <code>order_date DESC</code>. Show <code>id</code>, <code>order_date</code>, <code>total</code>, <code>status</code>.</p>',
      difficulty: 'easy',
      starterQuery: '-- Page 3 of orders (10 per page)\n',
      expectedQuery: 'SELECT id, order_date, total, status FROM orders ORDER BY order_date DESC LIMIT 10 OFFSET 20;',
      expectedResult: {
        columns: ['id', 'order_date', 'total', 'status'],
        values: [
          [20, '2023-12-01', 629.98, 'shipped'],
          [19, '2023-11-20', 89.99, 'shipped'],
          [18, '2023-11-05', 449.99, 'shipped'],
          [17, '2023-10-20', 54.99, 'delivered'],
          [16, '2023-10-01', 179.98, 'delivered'],
          [15, '2023-09-10', 1299.99, 'delivered'],
          [14, '2023-08-25', 84.98, 'delivered'],
          [13, '2023-08-05', 399.99, 'delivered'],
          [12, '2023-07-20', 59.98, 'delivered'],
          [11, '2023-07-01', 479.98, 'delivered'],
        ],
      },
      hints: [
        'Page 3 = skip first 20 rows (2 pages x 10)',
        'LIMIT 10 OFFSET 20',
        'SELECT id, order_date, total, status FROM orders ORDER BY order_date DESC LIMIT 10 OFFSET 20;',
      ],
      validationMode: 'exact',
    },
    {
      id: 4, moduleId: 8, title: 'Selective Columns',
      description: '<p>Write an efficient query that finds the <strong>top 3 most expensive products</strong>. Only select <code>name</code> and <code>price</code> (not SELECT *). Sort by price descending.</p>',
      difficulty: 'easy',
      starterQuery: '-- Top 3 most expensive (no SELECT *)\n',
      expectedQuery: 'SELECT name, price FROM products ORDER BY price DESC LIMIT 3;',
      expectedResult: {
        columns: ['name', 'price'],
        values: [
          ['Laptop Pro 15', 1299.99],
          ['Standing Desk', 599.99],
          ['Monitor 27"', 449.99],
        ],
      },
      hints: [
        'SELECT only name and price, not *',
        'ORDER BY price DESC LIMIT 3',
        'SELECT name, price FROM products ORDER BY price DESC LIMIT 3;',
      ],
      validationMode: 'exact',
    },
    {
      id: 5, moduleId: 8, title: 'Analyze This Query',
      description: '<p>This query finds high-value customers but is poorly written. <strong>Rewrite it efficiently</strong>: Find customers who have spent more than $500 total (all orders). Show <code>customer</code> name and <code>total_spent</code> (rounded to 2 decimals). Sort by total_spent desc.</p><p>Bad version: <code>SELECT * FROM customers WHERE id IN (SELECT customer_id FROM orders GROUP BY customer_id HAVING SUM(total) > 500)</code></p>',
      difficulty: 'hard',
      starterQuery: "-- Rewrite efficiently with JOIN + GROUP BY\n",
      expectedQuery: "SELECT c.name AS customer, ROUND(SUM(o.total), 2) AS total_spent FROM customers c INNER JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.name HAVING SUM(o.total) > 500 ORDER BY total_spent DESC;",
      expectedResult: {
        columns: ['customer', 'total_spent'],
        values: [
          ['Acme Corp', 2854.93],
          ['Pacific Trading', 1749.98],
          ['CloudNine Ltd', 1899.98],
          ['TechStart Inc', 324.94],
          ['Velocity Labs', 1299.99],
          ['Coral Systems', 1299.99],
          ['Pinnacle Group', 629.98],
          ['Global Retail', 639.96],
        ],
      },
      hints: [
        'Replace IN (subquery) with INNER JOIN + GROUP BY + HAVING',
        'JOIN customers to orders, GROUP BY customer, HAVING SUM(total) > 500',
        "SELECT c.name AS customer, ROUND(SUM(o.total), 2) AS total_spent FROM customers c INNER JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.name HAVING SUM(o.total) > 500 ORDER BY total_spent DESC;",
      ],
      validationMode: 'unordered',
    },
    {
      id: 6, moduleId: 8, title: 'Revenue Report',
      description: '<p>Build a comprehensive revenue report: for each <strong>product category</strong>, show <code>category</code>, <code>total_revenue</code> (quantity * unit_price, rounded), <code>orders_count</code> (distinct orders), and <code>avg_order_value</code> (revenue / distinct orders, rounded). Only include non-cancelled orders. Sort by revenue descending.</p>',
      difficulty: 'hard',
      starterQuery: "-- Revenue report by product category\n",
      expectedQuery: "SELECT p.category, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS total_revenue, COUNT(DISTINCT o.id) AS orders_count, ROUND(SUM(oi.quantity * oi.unit_price) / COUNT(DISTINCT o.id), 2) AS avg_order_value FROM order_items oi INNER JOIN products p ON oi.product_id = p.id INNER JOIN orders o ON oi.order_id = o.id WHERE o.status != 'cancelled' GROUP BY p.category ORDER BY total_revenue DESC;",
      expectedResult: {
        columns: ['category', 'total_revenue', 'orders_count', 'avg_order_value'],
        values: [
          ['Electronics', 8879.76, 22, 403.63],
          ['Home', 1671.94, 6, 278.66],
          ['Books', 314.89, 7, 44.98],
          ['Sports', 494.9, 6, 82.48],
          ['Clothing', 439.89, 7, 62.84],
          ['Food', 178.81, 7, 25.54],
        ],
      },
      hints: [
        'Join order_items → products AND order_items → orders',
        "WHERE o.status != 'cancelled', GROUP BY p.category",
        'avg_order_value = SUM(revenue) / COUNT(DISTINCT o.id)',
      ],
      validationMode: 'exact',
    },
  ],
}
