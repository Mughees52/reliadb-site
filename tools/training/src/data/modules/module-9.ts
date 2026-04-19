import type { Module } from '../../types'

export const module9: Module = {
  id: 9,
  title: 'Window Functions & Advanced SQL',
  slug: 'window-functions',
  description: 'ROW_NUMBER, RANK, LEAD/LAG, running totals, UNION, Views, stored procedures, and JSON functions.',
  icon: 'Layers',
  color: '#9B59B6',
  lessons: [
    {
      id: 1, moduleId: 9, title: 'What Are Window Functions?', slug: 'window-intro',
      content: [
        {
          type: 'text',
          html: `<h2>Window Functions — Aggregates Without Collapsing Rows</h2>
<p><code>GROUP BY</code> collapses rows into groups. But what if you want to calculate an aggregate <strong>while keeping every row</strong>? That's what window functions do.</p>
<p>A window function computes a value across a set of rows related to the current row — the "window" — without reducing the number of rows in the output.</p>`,
        },
        {
          type: 'code', title: 'Window function syntax',
          sql: `SELECT
  name, department_id, salary,
  AVG(salary) OVER (PARTITION BY department_id) AS dept_avg
FROM employees;
-- Every row kept, but dept_avg shows the department average`,
        },
        {
          type: 'comparison',
          left: { title: 'GROUP BY (collapses rows)', content: '<code>SELECT department_id, AVG(salary)<br>FROM employees<br>GROUP BY department_id;</code><br><br>Returns <strong>10 rows</strong> (one per department).' },
          right: { title: 'Window Function (keeps rows)', content: '<code>SELECT name, department_id, salary,<br>AVG(salary) OVER (PARTITION BY department_id)<br>FROM employees;</code><br><br>Returns <strong>50 rows</strong> (one per employee) + dept avg on each.' },
        },
        {
          type: 'sandbox', description: 'Compare each employee salary to their department average:',
          defaultQuery: `SELECT
  name, department_id, salary,
  ROUND(AVG(salary) OVER (PARTITION BY department_id), 0) AS dept_avg,
  salary - ROUND(AVG(salary) OVER (PARTITION BY department_id), 0) AS diff
FROM employees
ORDER BY department_id, salary DESC;`,
        },
        {
          type: 'callout', calloutType: 'mysql',
          html: `Window functions were added in <strong>MySQL 8.0</strong> (2018). If you're on MySQL 5.7, you must use correlated subqueries or self-joins instead (much slower).`,
        },
      ],
    },
    {
      id: 2, moduleId: 9, title: 'ROW_NUMBER, RANK, DENSE_RANK', slug: 'ranking',
      content: [
        {
          type: 'text',
          html: `<h2>Ranking Functions</h2>
<p>These assign a position number to each row within a partition.</p>
<ul>
<li><code>ROW_NUMBER()</code> — unique sequential number (1, 2, 3, 4...)</li>
<li><code>RANK()</code> — allows ties with gaps (1, 2, 2, 4...)</li>
<li><code>DENSE_RANK()</code> — allows ties without gaps (1, 2, 2, 3...)</li>
</ul>`,
        },
        {
          type: 'sandbox', description: 'Rank employees by salary within each department:',
          defaultQuery: `SELECT
  name, department_id, salary,
  ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS row_num,
  RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rank,
  DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS dense_rank
FROM employees
WHERE department_id IN (1, 3)
ORDER BY department_id, salary DESC;`,
        },
        {
          type: 'text',
          html: `<h3>Top-N Per Group Pattern</h3>
<p>The most common use: get the top N rows per group. Use ROW_NUMBER in a CTE, then filter:</p>`,
        },
        {
          type: 'sandbox', description: 'Top 3 highest-paid employees per department:',
          defaultQuery: `WITH ranked AS (
  SELECT
    name, department_id, salary,
    ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn
  FROM employees
)
SELECT name, department_id, salary
FROM ranked
WHERE rn <= 3
ORDER BY department_id, salary DESC;`,
        },
        {
          type: 'callout', calloutType: 'tip',
          html: `<strong>Interview favorite</strong>: "Get the top N per group" is the #1 most asked SQL interview question. Use <code>ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)</code> in a CTE, then <code>WHERE rn <= N</code>.`,
        },
      ],
    },
    {
      id: 3, moduleId: 9, title: 'LEAD, LAG, and Running Totals', slug: 'lead-lag',
      content: [
        {
          type: 'text',
          html: `<h2>Accessing Other Rows</h2>
<h3>LAG — Look at the Previous Row</h3>
<p><code>LAG(column, offset)</code> returns the value from a previous row. Perfect for "compare to previous" calculations.</p>
<h3>LEAD — Look at the Next Row</h3>
<p><code>LEAD(column, offset)</code> returns the value from a following row.</p>`,
        },
        {
          type: 'sandbox', description: 'Order-to-order revenue change:',
          defaultQuery: `SELECT
  id,
  order_date,
  total,
  LAG(total, 1) OVER (ORDER BY order_date) AS prev_total,
  ROUND(total - LAG(total, 1) OVER (ORDER BY order_date), 2) AS change
FROM orders
WHERE status = 'delivered'
ORDER BY order_date
LIMIT 12;`,
        },
        {
          type: 'text',
          html: `<h3>Running Totals with SUM() OVER</h3>
<p>A running total accumulates values row by row. Use <code>SUM() OVER (ORDER BY ...)</code>:</p>`,
        },
        {
          type: 'sandbox', description: 'Cumulative revenue over time:',
          defaultQuery: `SELECT
  order_date,
  total,
  SUM(total) OVER (ORDER BY order_date) AS running_total
FROM orders
WHERE status = 'delivered'
ORDER BY order_date
LIMIT 15;`,
        },
        {
          type: 'text',
          html: `<h3>Moving Average</h3>
<p>Use a frame specification to calculate averages over a sliding window:</p>`,
        },
        {
          type: 'sandbox', description: '3-order moving average:',
          defaultQuery: `SELECT
  order_date,
  total,
  ROUND(AVG(total) OVER (
    ORDER BY order_date
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ), 2) AS moving_avg_3
FROM orders
WHERE status = 'delivered'
ORDER BY order_date
LIMIT 15;`,
        },
      ],
    },
    {
      id: 4, moduleId: 9, title: 'UNION and Set Operations', slug: 'union',
      content: [
        {
          type: 'text',
          html: `<h2>Combining Result Sets</h2>
<h3>UNION — Combine and Deduplicate</h3>
<p><code>UNION</code> stacks results from two queries vertically. Removes duplicates by default.</p>
<h3>UNION ALL — Combine Without Deduplication</h3>
<p><code>UNION ALL</code> is faster because it skips the deduplication step. Use it when you know there won't be duplicates or don't care.</p>`,
        },
        {
          type: 'sandbox', description: 'Combine employee cities with customer cities:',
          defaultQuery: `-- All unique cities from both employees (via departments) and customers
SELECT d.location AS city, 'Office' AS source
FROM departments d
UNION
SELECT c.city, 'Customer'
FROM customers c
ORDER BY city;`,
        },
        {
          type: 'callout', calloutType: 'warning',
          html: `<strong>Rules</strong>: Both queries in a UNION must have the same number of columns, and the columns must have compatible types. Column names come from the first query.`,
        },
        {
          type: 'text',
          html: `<h3>INTERSECT and EXCEPT</h3>
<p><code>INTERSECT</code> returns rows that appear in <strong>both</strong> queries. <code>EXCEPT</code> returns rows in the first query that are <strong>not</strong> in the second.</p>`,
        },
        {
          type: 'sandbox', description: 'Cities where we have both offices and customers:',
          defaultQuery: `SELECT location AS city FROM departments
INTERSECT
SELECT city FROM customers
ORDER BY city;`,
        },
        {
          type: 'sandbox', description: 'Customer cities where we have NO office:',
          defaultQuery: `SELECT DISTINCT city FROM customers
EXCEPT
SELECT location FROM departments
ORDER BY city;`,
        },
      ],
    },
    {
      id: 5, moduleId: 9, title: 'Views', slug: 'views',
      content: [
        {
          type: 'text',
          html: `<h2>Views — Saved Queries</h2>
<p>A <code>VIEW</code> is a named, saved query that acts like a virtual table. It doesn't store data — it runs the underlying query each time you select from it.</p>`,
        },
        {
          type: 'code', title: 'Creating a view',
          sql: `CREATE VIEW employee_details AS
SELECT
  e.id, e.name, e.salary,
  d.name AS department, d.location
FROM employees e
JOIN departments d ON e.department_id = d.id;

-- Now use it like a table:
SELECT * FROM employee_details WHERE department = 'Engineering';`,
        },
        {
          type: 'sandbox', description: 'Create and query a view:',
          defaultQuery: `CREATE VIEW dept_summary AS
SELECT
  d.id, d.name,
  COUNT(e.id) AS headcount,
  ROUND(AVG(e.salary), 0) AS avg_salary,
  SUM(e.salary) AS total_salary
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.id, d.name;

SELECT * FROM dept_summary ORDER BY headcount DESC;`,
        },
        {
          type: 'text',
          html: `<h3>When to Use Views</h3>
<ul>
<li><strong>Simplify complex queries</strong> — wrap a 10-line JOIN into a simple table name</li>
<li><strong>Security</strong> — expose only certain columns to specific users</li>
<li><strong>Consistency</strong> — ensure everyone uses the same business logic</li>
<li><strong>Don't use for performance</strong> — views aren't materialized in MySQL (no caching)</li>
</ul>`,
        },
        {
          type: 'callout', calloutType: 'mysql',
          html: `MySQL views are not materialized — they re-execute the underlying query each time. For cached/precomputed results, use a materialized view pattern: a real table + a scheduled refresh query or trigger.`,
        },
      ],
    },
    {
      id: 6, moduleId: 9, title: 'MySQL JSON Functions', slug: 'json-functions',
      content: [
        {
          type: 'text',
          html: `<h2>JSON in MySQL</h2>
<p>MySQL 5.7+ has a native <code>JSON</code> data type with built-in functions for querying and manipulating JSON data. This lets you combine relational and document-style storage.</p>`,
        },
        {
          type: 'code', title: 'MySQL JSON syntax (reference)',
          sql: `-- MySQL JSON column and queries:
CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data JSON NOT NULL
);

INSERT INTO events (data) VALUES ('{"type":"click","page":"/home","user_id":42}');

-- Extract values:
SELECT data->>'$.type' AS event_type,       -- ->> extracts as text
       data->'$.user_id' AS uid             -- -> extracts as JSON
FROM events;

-- Search in JSON:
SELECT * FROM events
WHERE JSON_EXTRACT(data, '$.type') = '"click"';

-- Useful functions:
-- JSON_EXTRACT(doc, '$.key')
-- JSON_SET(doc, '$.key', value)
-- JSON_ARRAY_LENGTH(doc->'$.items')
-- JSON_CONTAINS(doc, '"value"', '$.tags')`,
        },
        {
          type: 'sandbox', description: 'Our sandbox uses SQLite JSON (similar syntax):',
          defaultQuery: `-- SQLite JSON works similarly to MySQL
SELECT
  json_object('name', name, 'salary', salary, 'dept', department_id) AS employee_json
FROM employees
LIMIT 5;`,
        },
        {
          type: 'callout', calloutType: 'mysql',
          html: `<strong>When to use JSON</strong>: For flexible/variable attributes (settings, metadata, event payloads). <strong>Don't use</strong> for data you'll frequently filter/join on — relational columns with indexes are much faster for that.`,
        },
      ],
    },
    {
      id: 7, moduleId: 9, title: 'Stored Procedures & Triggers', slug: 'stored-procedures',
      content: [
        {
          type: 'text',
          html: `<h2>Stored Procedures</h2>
<p>A <strong>stored procedure</strong> is a saved block of SQL that runs on the server. Call it by name instead of sending raw SQL from your application.</p>`,
        },
        {
          type: 'code', title: 'MySQL stored procedure',
          sql: `DELIMITER //
CREATE PROCEDURE give_raise(
  IN dept_id INT,
  IN raise_pct DECIMAL(5,2)
)
BEGIN
  UPDATE employees
  SET salary = salary * (1 + raise_pct / 100)
  WHERE department_id = dept_id;

  SELECT CONCAT('Raise applied: ', raise_pct, '% to dept ', dept_id) AS result;
END //
DELIMITER ;

-- Call it:
CALL give_raise(1, 10);  -- 10% raise for Engineering`,
        },
        {
          type: 'text',
          html: `<h3>Triggers</h3>
<p>A <strong>trigger</strong> runs automatically before or after INSERT, UPDATE, or DELETE on a table.</p>`,
        },
        {
          type: 'code', title: 'MySQL trigger',
          sql: `CREATE TRIGGER before_order_delete
BEFORE DELETE ON orders
FOR EACH ROW
BEGIN
  INSERT INTO order_audit (order_id, action, deleted_at)
  VALUES (OLD.id, 'DELETE', NOW());
END;`,
        },
        {
          type: 'text',
          html: `<h3>Stored Functions</h3>
<p>Like procedures but return a single value. Can be used inside SELECT:</p>`,
        },
        {
          type: 'code', title: 'MySQL function',
          sql: `CREATE FUNCTION tax_amount(price DECIMAL(10,2))
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
  RETURN price * 0.21;  -- 21% VAT
END;

-- Use in queries:
SELECT name, price, tax_amount(price) AS tax
FROM products;`,
        },
        {
          type: 'callout', calloutType: 'warning',
          html: `<strong>Stored procedures are controversial</strong>: They move business logic into the database, making it harder to version control, test, and deploy. Many modern teams prefer keeping logic in application code. Use them for performance-critical operations that need to minimize network round-trips.`,
        },
      ],
    },
    {
      id: 8, moduleId: 9, title: 'Permissions & Security', slug: 'permissions',
      content: [
        {
          type: 'text',
          html: `<h2>MySQL Users & Permissions</h2>
<p>MySQL has a built-in permission system. Each user can be granted specific privileges on specific databases, tables, or even columns.</p>`,
        },
        {
          type: 'code', title: 'User management',
          sql: `-- Create a user
CREATE USER 'app_user'@'%' IDENTIFIED BY 'secure_password';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON mydb.* TO 'app_user'@'%';

-- Read-only user
GRANT SELECT ON mydb.* TO 'readonly'@'10.0.0.%';

-- Revoke permissions
REVOKE DELETE ON mydb.* FROM 'app_user'@'%';

-- Show grants
SHOW GRANTS FOR 'app_user'@'%';`,
        },
        {
          type: 'text',
          html: `<h3>Permission Best Practices</h3>
<ul>
<li><strong>Least privilege</strong> — only grant what's needed. App users don't need DROP or ALTER.</li>
<li><strong>Separate users</strong> — different users for app, admin, backup, monitoring.</li>
<li><strong>Host restrictions</strong> — <code>'app'@'10.0.0.%'</code> limits connections to your network.</li>
<li><strong>No root for apps</strong> — never connect your application as root.</li>
<li><strong>Audit</strong> — use the MySQL audit plugin in production.</li>
</ul>`,
        },
        {
          type: 'callout', calloutType: 'mysql',
          html: `Common permission levels: <code>ALL PRIVILEGES</code> (everything), <code>SELECT</code> (read), <code>INSERT/UPDATE/DELETE</code> (write), <code>CREATE/ALTER/DROP</code> (DDL), <code>GRANT OPTION</code> (can grant to others). Use <code>FLUSH PRIVILEGES</code> after direct grants table edits.`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 1, moduleId: 9, title: 'Salary Rank Per Department',
      description: '<p>Rank all employees by salary within their department (highest first). Show <code>name</code>, <code>department_id</code>, <code>salary</code>, and <code>salary_rank</code> using <code>RANK()</code>. Only show departments 1 and 3. Order by department_id, then rank.</p>',
      difficulty: 'medium',
      starterQuery: '-- Rank employees by salary within department\n',
      expectedQuery: "SELECT name, department_id, salary, RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS salary_rank FROM employees WHERE department_id IN (1, 3) ORDER BY department_id, salary_rank;",
      expectedResult: {
        columns: ['name', 'department_id', 'salary', 'salary_rank'],
        values: [
          ['Alice Johnson', 1, 120000, 1], ['Hugo Edwards', 1, 118000, 2], ['Bob Smith', 1, 115000, 3],
          ['Xavier Wright', 1, 112000, 4], ['Nathan Cook', 1, 108000, 5], ['Carol Davis', 1, 105000, 6],
          ['Vera Richardson', 1, 100000, 7], ['Wendy King', 1, 98000, 8], ['Amy Baker', 1, 95000, 9],
          ['Henry Taylor', 3, 95000, 1], ['Frank Brown', 3, 92000, 2], ['Maya Reed', 3, 91000, 3],
          ['Zach Green', 3, 90000, 4], ['Grace Lee', 3, 88000, 5], ['Chloe Turner', 3, 87000, 6],
          ['Will Cox', 3, 86000, 7],
        ],
      },
      hints: [
        'Use RANK() OVER (PARTITION BY department_id ORDER BY salary DESC)',
        'Filter departments with WHERE, not in the window function',
        "SELECT name, department_id, salary, RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS salary_rank FROM employees WHERE department_id IN (1, 3) ORDER BY department_id, salary_rank;",
      ],
      validationMode: 'exact',
    },
    {
      id: 2, moduleId: 9, title: 'Top 2 Per Department',
      description: '<p>Find the <strong>top 2 highest-paid employees in each department</strong>. Show <code>name</code>, <code>department_id</code>, <code>salary</code>. Use ROW_NUMBER in a CTE. Order by department_id, salary desc.</p>',
      difficulty: 'hard',
      starterQuery: "-- Top 2 per department using ROW_NUMBER\nWITH ranked AS (\n",
      expectedQuery: "WITH ranked AS (SELECT name, department_id, salary, ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn FROM employees) SELECT name, department_id, salary FROM ranked WHERE rn <= 2 ORDER BY department_id, salary DESC;",
      expectedResult: {
        columns: ['name', 'department_id', 'salary'],
        values: [
          ['Alice Johnson', 1, 120000], ['Hugo Edwards', 1, 118000],
          ['David Wilson', 2, 85000], ['Yara Scott', 2, 82000],
          ['Henry Taylor', 3, 95000], ['Frank Brown', 3, 92000],
          ['Iris Chen', 4, 72000], ['James Stewart', 4, 70000],
          ['Kate Thomas', 5, 110000], ['Brian Adams', 5, 105000],
          ['Mia Jackson', 6, 75000], ['Felix Parker', 6, 73000],
          ['Olivia Harris', 7, 65000], ['Gina Evans', 7, 64000],
          ['Quinn Lewis', 8, 130000], ['Rachel Robinson', 8, 125000],
          ['Sam Walker', 9, 108000], ['Leo Rogers', 9, 105000],
          ['Uma Allen', 10, 90000], ['Isla Collins', 10, 88000],
        ],
      },
      hints: [
        'ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn',
        'Put it in a CTE, then WHERE rn <= 2',
        "WITH ranked AS (SELECT name, department_id, salary, ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn FROM employees) SELECT name, department_id, salary FROM ranked WHERE rn <= 2 ORDER BY department_id, salary DESC;",
      ],
      validationMode: 'exact',
    },
    {
      id: 3, moduleId: 9, title: 'Running Revenue Total',
      description: '<p>Show delivered orders with a <strong>running total</strong> of revenue. Columns: <code>order_date</code>, <code>total</code>, <code>running_total</code>. Order by order_date.</p>',
      difficulty: 'medium',
      starterQuery: "-- Running total of delivered order revenue\n",
      expectedQuery: "SELECT order_date, total, SUM(total) OVER (ORDER BY order_date) AS running_total FROM orders WHERE status = 'delivered' ORDER BY order_date;",
      expectedResult: {
        columns: ['order_date', 'total', 'running_total'],
        values: [
          ['2023-01-15', 1329.98, 1329.98], ['2023-01-20', 79.98, 1409.96],
          ['2023-02-10', 449.99, 1859.95], ['2023-02-28', 89.99, 1949.94],
          ['2023-03-15', 154.98, 2104.92], ['2023-04-01', 599.99, 2704.91],
          ['2023-04-20', 39.99, 2744.9], ['2023-05-10', 1749.98, 4494.88],
          ['2023-05-25', 119.99, 4614.87], ['2023-06-15', 94.98, 4709.85],
          ['2023-07-01', 479.98, 5189.83], ['2023-07-20', 59.98, 5249.81],
          ['2023-08-05', 399.99, 5649.8], ['2023-08-25', 84.98, 5734.78],
          ['2023-09-10', 1299.99, 7034.77], ['2023-10-01', 179.98, 7214.75],
          ['2023-10-20', 54.99, 7269.74],
          ['2024-06-01', 179.98, 7449.72], ['2024-06-15', 45.99, 7495.71],
          ['2024-07-01', 99.98, 7595.69], ['2024-07-15', 54.99, 7650.68],
        ],
      },
      hints: [
        'SUM(total) OVER (ORDER BY order_date) creates a running total',
        "Filter with WHERE status = 'delivered'",
        "SELECT order_date, total, SUM(total) OVER (ORDER BY order_date) AS running_total FROM orders WHERE status = 'delivered' ORDER BY order_date;",
      ],
      validationMode: 'exact',
    },
    {
      id: 4, moduleId: 9, title: 'UNION: All Locations',
      description: '<p>Combine department <code>location</code>s and customer <code>city</code>s into one list of unique cities. Show columns <code>city</code> and <code>source</code> ("Office" or "Customer"). Sort by city.</p>',
      difficulty: 'easy',
      starterQuery: "-- All unique locations from offices and customers\n",
      expectedQuery: "SELECT location AS city, 'Office' AS source FROM departments UNION SELECT city, 'Customer' FROM customers ORDER BY city;",
      expectedResult: {
        columns: ['city', 'source'],
        values: [
          ['Berlin', 'Office'], ['Berlin', 'Customer'], ['Boston', 'Customer'],
          ['Dubai', 'Customer'], ['London', 'Office'], ['London', 'Customer'],
          ['Madrid', 'Office'], ['Madrid', 'Customer'],
          ['New York', 'Office'], ['New York', 'Customer'],
          ['Paris', 'Office'], ['Paris', 'Customer'],
          ['Shanghai', 'Customer'],
          ['Singapore', 'Office'], ['Singapore', 'Customer'],
          ['Stockholm', 'Office'], ['Stockholm', 'Customer'],
          ['Sydney', 'Office'], ['Sydney', 'Customer'],
          ['Tokyo', 'Office'], ['Tokyo', 'Customer'],
          ['Toronto', 'Office'], ['Toronto', 'Customer'],
          ['Zurich', 'Customer'],
        ],
      },
      hints: [
        "First SELECT: location AS city, 'Office' AS source FROM departments",
        'UNION combines and deduplicates',
        "SELECT location AS city, 'Office' AS source FROM departments UNION SELECT city, 'Customer' FROM customers ORDER BY city;",
      ],
      validationMode: 'unordered',
    },
    {
      id: 5, moduleId: 9, title: 'Create and Query a View',
      description: '<p>Create a view called <code>order_summary</code> that shows each order with customer name, item count, and total. Then query it for orders over $500. Show <code>customer</code>, <code>item_count</code>, <code>total</code>.</p>',
      difficulty: 'medium',
      starterQuery: "-- Create order_summary view, then query it\n",
      expectedQuery: "CREATE VIEW order_summary AS SELECT o.id, c.name AS customer, COUNT(oi.id) AS item_count, o.total FROM orders o INNER JOIN customers c ON o.customer_id = c.id INNER JOIN order_items oi ON oi.order_id = o.id GROUP BY o.id, c.name, o.total; SELECT customer, item_count, total FROM order_summary WHERE total > 500 ORDER BY total DESC;",
      expectedResult: {
        columns: ['customer', 'item_count', 'total'],
        values: [
          ['Pacific Trading', 2, 1749.98],
          ['Acme Corp', 2, 1329.98],
          ['Velocity Labs', 1, 1299.99],
          ['Coral Systems', 1, 1299.99],
          ['CloudNine Ltd', 1, 1299.99],
          ['Pinnacle Group', 3, 629.98],
          ['CloudNine Ltd', 1, 599.99],
          ['Horizon Media', 1, 599.99],
        ],
      },
      hints: [
        'CREATE VIEW order_summary AS SELECT ... with JOINs',
        'Join orders → customers → order_items, GROUP BY order',
        'Then SELECT from order_summary WHERE total > 500',
      ],
      validationMode: 'exact',
    },
    {
      id: 6, moduleId: 9, title: 'Previous Order Comparison',
      description: '<p>For each delivered order, show the <code>order_date</code>, <code>total</code>, and the <strong>previous order total</strong> (using LAG). Name it <code>prev_total</code>. Order by order_date. Limit to 10.</p>',
      difficulty: 'medium',
      starterQuery: "-- Compare each order to the previous one\n",
      expectedQuery: "SELECT order_date, total, LAG(total, 1) OVER (ORDER BY order_date) AS prev_total FROM orders WHERE status = 'delivered' ORDER BY order_date LIMIT 10;",
      expectedResult: {
        columns: ['order_date', 'total', 'prev_total'],
        values: [
          ['2023-01-15', 1329.98, null], ['2023-01-20', 79.98, 1329.98],
          ['2023-02-10', 449.99, 79.98], ['2023-02-28', 89.99, 449.99],
          ['2023-03-15', 154.98, 89.99], ['2023-04-01', 599.99, 154.98],
          ['2023-04-20', 39.99, 599.99], ['2023-05-10', 1749.98, 39.99],
          ['2023-05-25', 119.99, 1749.98], ['2023-06-15', 94.98, 119.99],
        ],
      },
      hints: [
        'LAG(total, 1) OVER (ORDER BY order_date) gets the previous row value',
        "Filter with WHERE status = 'delivered'",
        "SELECT order_date, total, LAG(total, 1) OVER (ORDER BY order_date) AS prev_total FROM orders WHERE status = 'delivered' ORDER BY order_date LIMIT 10;",
      ],
      validationMode: 'exact',
    },
  ],
}
