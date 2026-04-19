import type { Module } from '../../types'

export const module4: Module = {
  id: 4,
  title: 'JOINs — The Core Skill',
  slug: 'joins',
  description: 'INNER JOIN, LEFT/RIGHT JOIN, self joins, multi-table joins, and how MySQL executes them.',
  icon: 'GitMerge',
  color: '#E74C3C',
  lessons: [
    {
      id: 1,
      moduleId: 4,
      title: 'Why JOINs Matter',
      slug: 'why-joins',
      content: [
        {
          type: 'text',
          html: `<h2>Combining Data from Multiple Tables</h2>
<p>In a relational database, data is split across tables to avoid duplication. The <code>employees</code> table stores a <code>department_id</code> number, not the department name. To get the name, you <strong>JOIN</strong> the two tables together.</p>
<p>JOINs are the most important SQL skill. You'll use them in almost every real-world query.</p>`,
        },
        {
          type: 'comparison',
          left: {
            title: 'Without JOIN (just IDs)',
            content: '<code>SELECT name, department_id FROM employees;</code><br>Shows "Alice Johnson, 1" — but what is department 1?',
          },
          right: {
            title: 'With JOIN (readable data)',
            content: '<code>SELECT e.name, d.name FROM employees e JOIN departments d ON ...</code><br>Shows "Alice Johnson, Engineering"',
          },
        },
        {
          type: 'sandbox',
          description: 'Compare — without JOIN vs with JOIN:',
          defaultQuery: `-- Without JOIN: just IDs
SELECT name, department_id FROM employees LIMIT 5;`,
        },
        {
          type: 'sandbox',
          description: 'Now with JOIN — much more useful:',
          defaultQuery: `SELECT e.name, d.name AS department, e.salary
FROM employees e
INNER JOIN departments d ON e.department_id = d.id
LIMIT 5;`,
        },
        {
          type: 'callout',
          calloutType: 'tip',
          html: `<strong>Table aliases</strong>: <code>employees e</code> creates a short alias "e" so you can write <code>e.name</code> instead of <code>employees.name</code>. Essential when joining multiple tables.`,
        },
      ],
    },
    {
      id: 2,
      moduleId: 4,
      title: 'INNER JOIN',
      slug: 'inner-join',
      content: [
        {
          type: 'text',
          html: `<h2>INNER JOIN — Matching Rows Only</h2>
<p><code>INNER JOIN</code> returns only rows that have a match in <strong>both</strong> tables. If an employee's <code>department_id</code> doesn't match any department, that employee is excluded.</p>
<p>Watch how INNER JOIN matches rows:</p>`,
        },
        {
          type: 'animation',
          animation: 'JoinAnimation',
          props: { joinType: 'inner' },
        },
        {
          type: 'code',
          title: 'Syntax',
          sql: `SELECT columns
FROM table_a
INNER JOIN table_b ON table_a.column = table_b.column;`,
        },
        {
          type: 'sandbox',
          description: 'All employees with their department names:',
          defaultQuery: `SELECT
  e.name AS employee,
  d.name AS department,
  d.location
FROM employees e
INNER JOIN departments d ON e.department_id = d.id
ORDER BY d.name, e.name;`,
        },
        {
          type: 'text',
          html: `<h3>JOIN with Aggregates</h3>
<p>JOINs become really powerful when combined with GROUP BY:</p>`,
        },
        {
          type: 'sandbox',
          description: 'Employee count and average salary per department:',
          defaultQuery: `SELECT
  d.name AS department,
  COUNT(*) AS headcount,
  ROUND(AVG(e.salary), 0) AS avg_salary
FROM employees e
INNER JOIN departments d ON e.department_id = d.id
GROUP BY d.name
ORDER BY avg_salary DESC;`,
        },
      ],
    },
    {
      id: 3,
      moduleId: 4,
      title: 'LEFT JOIN',
      slug: 'left-join',
      content: [
        {
          type: 'text',
          html: `<h2>LEFT JOIN — Keep All Left Rows</h2>
<p><code>LEFT JOIN</code> returns <strong>all rows from the left table</strong>, plus matching rows from the right table. If there's no match, the right-side columns are filled with <code>NULL</code>.</p>
<p>This is essential when you want to find rows that <em>don't</em> have a match — like customers with no orders.</p>
<p>Watch how LEFT JOIN keeps unmatched rows with NULL:</p>`,
        },
        {
          type: 'animation',
          animation: 'JoinAnimation',
          props: { joinType: 'left' },
        },
        {
          type: 'sandbox',
          description: 'All customers, even those with no orders:',
          defaultQuery: `SELECT
  c.name AS customer,
  COUNT(o.id) AS order_count,
  COALESCE(ROUND(SUM(o.total), 2), 0) AS total_spent
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name
ORDER BY total_spent DESC
LIMIT 15;`,
        },
        {
          type: 'text',
          html: `<h3>Finding Missing Relationships</h3>
<p>The most powerful LEFT JOIN pattern: find rows with <strong>no match</strong> by checking for NULL in the right table.</p>`,
        },
        {
          type: 'sandbox',
          description: 'Customers who have never placed an order:',
          defaultQuery: `SELECT c.name, c.city, c.country
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.id IS NULL
ORDER BY c.name;`,
        },
        {
          type: 'callout',
          calloutType: 'tip',
          html: `<strong>Pattern to remember</strong>: <code>LEFT JOIN ... WHERE right_table.id IS NULL</code> = "find rows with no match". This is one of the most common SQL patterns in production code.`,
        },
      ],
    },
    {
      id: 4,
      moduleId: 4,
      title: 'Self JOIN',
      slug: 'self-join',
      content: [
        {
          type: 'text',
          html: `<h2>Self JOIN — Joining a Table to Itself</h2>
<p>A self join joins a table to <strong>itself</strong>. This is how you query hierarchical data like employee-manager relationships, where <code>manager_id</code> references another row in the same <code>employees</code> table.</p>`,
        },
        {
          type: 'sandbox',
          description: 'Show each employee with their manager name:',
          defaultQuery: `SELECT
  e.name AS employee,
  m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id
ORDER BY m.name, e.name
LIMIT 20;`,
        },
        {
          type: 'callout',
          calloutType: 'info',
          html: `We use <code>LEFT JOIN</code> here because top-level managers have <code>manager_id = NULL</code>. An INNER JOIN would exclude them.`,
        },
        {
          type: 'text',
          html: `<h3>Who Reports to Whom?</h3>
<p>You can reverse the self join to find direct reports:</p>`,
        },
        {
          type: 'sandbox',
          description: 'Count direct reports for each manager:',
          defaultQuery: `SELECT
  m.name AS manager,
  COUNT(e.id) AS direct_reports
FROM employees m
INNER JOIN employees e ON e.manager_id = m.id
GROUP BY m.id, m.name
ORDER BY direct_reports DESC;`,
        },
      ],
    },
    {
      id: 5,
      moduleId: 4,
      title: 'Multi-Table JOINs',
      slug: 'multi-table-joins',
      content: [
        {
          type: 'text',
          html: `<h2>Joining 3+ Tables</h2>
<p>Real-world queries often join many tables. Each JOIN adds another table to the result. The key is to follow the <strong>foreign key chain</strong>.</p>`,
        },
        {
          type: 'code',
          title: 'Chain: orders → customers → order_items → products',
          sql: `SELECT ...
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id;`,
        },
        {
          type: 'sandbox',
          description: 'Full order details — customer, product, quantity, price:',
          defaultQuery: `SELECT
  o.id AS order_id,
  c.name AS customer,
  p.name AS product,
  oi.quantity,
  oi.unit_price,
  o.order_date
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id
INNER JOIN order_items oi ON oi.order_id = o.id
INNER JOIN products p ON oi.product_id = p.id
ORDER BY o.order_date DESC
LIMIT 15;`,
        },
        {
          type: 'text',
          html: `<h3>Revenue by Product Category</h3>
<p>Joining multiple tables with aggregation — a common analytics query:</p>`,
        },
        {
          type: 'sandbox',
          description: 'Revenue breakdown by product category:',
          defaultQuery: `SELECT
  p.category,
  COUNT(DISTINCT o.id) AS orders,
  SUM(oi.quantity) AS units_sold,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
FROM order_items oi
INNER JOIN products p ON oi.product_id = p.id
INNER JOIN orders o ON oi.order_id = o.id
WHERE o.status != 'cancelled'
GROUP BY p.category
ORDER BY revenue DESC;`,
        },
      ],
    },
    {
      id: 6,
      moduleId: 4,
      title: 'JOIN Algorithms',
      slug: 'join-algorithms',
      content: [
        {
          type: 'text',
          html: `<h2>How MySQL Executes JOINs</h2>
<p>Understanding how MySQL actually runs JOINs helps you write faster queries. MySQL uses two main algorithms:</p>

<h3>Nested Loop Join (default)</h3>
<p>For each row in the <strong>outer table</strong>, MySQL scans the <strong>inner table</strong> for matches. Like a double for-loop:</p>
<pre>for each row in employees:
    for each row in departments:
        if employee.dept_id == department.id:
            output the combined row</pre>
<p>With an index on the join column, the inner scan becomes an index lookup — much faster.</p>

<h3>Hash Join (MySQL 8.0.18+)</h3>
<p>MySQL builds a hash table from the smaller table, then probes it for each row of the larger table. Faster for large tables without indexes.</p>

<h3>Why Indexes on JOIN Columns Matter</h3>
<p>Without an index on <code>department_id</code>, MySQL must scan <strong>all</strong> department rows for every employee. With an index, it jumps directly to the matching row. That's the difference between O(n*m) and O(n*log(m)).</p>`,
        },
        {
          type: 'callout',
          calloutType: 'mysql',
          html: `<strong>Performance tip</strong>: Always ensure foreign key columns have indexes. MySQL automatically creates an index on FK columns, but if you add a JOIN column without a FK constraint, you need to create the index manually.`,
        },
        {
          type: 'callout',
          calloutType: 'tip',
          html: `Want to see how MySQL executes your JOINs? Use our free <a href="/tools/explain/">EXPLAIN Analyzer</a> to visualize the query plan and see which join algorithm MySQL chose.`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 1,
      moduleId: 4,
      title: 'Employee Departments',
      description: '<p>Show each employee\'s <code>name</code> and their <code>department</code> name (from the departments table). Use an INNER JOIN.</p>',
      difficulty: 'easy',
      starterQuery: '-- Show employee names with department names\nSELECT e.name, d.name AS department\nFROM employees e\n',
      expectedQuery: 'SELECT e.name, d.name AS department FROM employees e INNER JOIN departments d ON e.department_id = d.id;',
      expectedResult: {
        columns: ['name', 'department'],
        values: [
          ['Alice Johnson', 'Engineering'], ['Bob Smith', 'Engineering'], ['Carol Davis', 'Engineering'],
          ['David Wilson', 'Marketing'], ['Eva Martinez', 'Marketing'],
          ['Frank Brown', 'Sales'], ['Grace Lee', 'Sales'], ['Henry Taylor', 'Sales'],
          ['Iris Chen', 'HR'], ['Jack Anderson', 'HR'],
          ['Kate Thomas', 'Finance'], ['Liam Moore', 'Finance'],
          ['Mia Jackson', 'Operations'], ['Noah White', 'Operations'],
          ['Olivia Harris', 'Support'], ['Peter Clark', 'Support'],
          ['Quinn Lewis', 'Legal'], ['Rachel Robinson', 'Legal'],
          ['Sam Walker', 'Product'], ['Tina Hall', 'Product'],
          ['Uma Allen', 'Design'], ['Victor Young', 'Design'],
          ['Wendy King', 'Engineering'], ['Xavier Wright', 'Engineering'],
          ['Yara Scott', 'Marketing'], ['Zach Green', 'Sales'],
          ['Amy Baker', 'Engineering'], ['Brian Adams', 'Finance'],
          ['Chloe Turner', 'Sales'], ['Daniel Phillips', 'Product'],
          ['Elena Campbell', 'Marketing'], ['Felix Parker', 'Operations'],
          ['Gina Evans', 'Support'], ['Hugo Edwards', 'Engineering'],
          ['Isla Collins', 'Design'], ['James Stewart', 'HR'],
          ['Kelly Morris', 'Finance'], ['Leo Rogers', 'Product'],
          ['Maya Reed', 'Sales'], ['Nathan Cook', 'Engineering'],
          ['Ophelia Morgan', 'Marketing'], ['Paul Bell', 'Operations'],
          ['Rosa Murphy', 'Legal'], ['Steve Bailey', 'Support'],
          ['Tara Rivera', 'Design'], ['Ulrich Cooper', 'Finance'],
          ['Vera Richardson', 'Engineering'], ['Will Cox', 'Sales'],
          ['Xena Howard', 'Product'], ['Yuri Ward', 'HR'],
        ],
      },
      hints: [
        'JOIN departments d ON e.department_id = d.id',
        'INNER JOIN matches employees to departments by department_id',
        'SELECT e.name, d.name AS department FROM employees e INNER JOIN departments d ON e.department_id = d.id;',
      ],
      validationMode: 'unordered',
    },
    {
      id: 2,
      moduleId: 4,
      title: 'Customers Without Orders',
      description: '<p>Find customers who have <strong>never placed an order</strong>. Show their <code>name</code> and <code>city</code>. Use a LEFT JOIN.</p>',
      difficulty: 'medium',
      starterQuery: '-- Find customers with no orders\n',
      expectedQuery: 'SELECT c.name, c.city FROM customers c LEFT JOIN orders o ON c.id = o.customer_id WHERE o.id IS NULL;',
      expectedResult: {
        columns: ['name', 'city'],
        values: [
          ['Alpine Solutions', 'Zurich'], ['Nordic Software', 'Stockholm'],
          ['BrightPath AI', 'Toronto'], ['Velocity Labs', 'Singapore'],
          ['FreshMart', 'Paris'], ['SkyBridge Corp', 'Dubai'],
          ['Pinnacle Group', 'New York'], ['Eastern Dynamics', 'Shanghai'],
          ['Atlas Logistics', 'Berlin'], ['River Valley Inc', 'Toronto'],
          ['Coral Systems', 'Sydney'], ['Summit Partners', 'New York'],
          ['Cascade Data', 'Madrid'], ['Prism Analytics', 'Singapore'],
          ['Horizon Media', 'Tokyo'], ['Quantum Edge', 'Paris'],
          ['Blue Ocean Ltd', 'Dubai'], ['FireStorm Tech', 'Berlin'],
          ['Maple Systems', 'Toronto'], ['Opal Networks', 'Stockholm'],
        ],
      },
      hints: [
        'Use LEFT JOIN to keep all customers, even without orders',
        'WHERE o.id IS NULL filters to only those without matches',
        'SELECT c.name, c.city FROM customers c LEFT JOIN orders o ON c.id = o.customer_id WHERE o.id IS NULL;',
      ],
      validationMode: 'unordered',
    },
    {
      id: 3,
      moduleId: 4,
      title: 'Employee and Manager',
      description: '<p>Show each employee\'s <code>name</code> and their <strong>manager\'s name</strong>. If an employee has no manager, show <code>NULL</code>. Name the columns <code>employee</code> and <code>manager</code>.</p>',
      difficulty: 'medium',
      starterQuery: '-- Show employees with their managers\n',
      expectedQuery: 'SELECT e.name AS employee, m.name AS manager FROM employees e LEFT JOIN employees m ON e.manager_id = m.id;',
      expectedResult: {
        columns: ['employee', 'manager'],
        values: [
          ['Alice Johnson', null], ['Bob Smith', 'Alice Johnson'], ['Carol Davis', 'Alice Johnson'],
          ['David Wilson', null], ['Eva Martinez', 'David Wilson'],
          ['Frank Brown', null], ['Grace Lee', 'Frank Brown'], ['Henry Taylor', 'Frank Brown'],
          ['Iris Chen', null], ['Jack Anderson', 'Iris Chen'],
          ['Kate Thomas', null], ['Liam Moore', 'Kate Thomas'],
          ['Mia Jackson', null], ['Noah White', 'Mia Jackson'],
          ['Olivia Harris', null], ['Peter Clark', 'Olivia Harris'],
          ['Quinn Lewis', null], ['Rachel Robinson', 'Quinn Lewis'],
          ['Sam Walker', null], ['Tina Hall', 'Sam Walker'],
          ['Uma Allen', null], ['Victor Young', 'Uma Allen'],
          ['Wendy King', 'Alice Johnson'], ['Xavier Wright', 'Alice Johnson'],
          ['Yara Scott', 'David Wilson'], ['Zach Green', 'Frank Brown'],
          ['Amy Baker', 'Bob Smith'], ['Brian Adams', 'Kate Thomas'],
          ['Chloe Turner', 'Frank Brown'], ['Daniel Phillips', 'Sam Walker'],
          ['Elena Campbell', 'David Wilson'], ['Felix Parker', 'Mia Jackson'],
          ['Gina Evans', 'Olivia Harris'], ['Hugo Edwards', 'Alice Johnson'],
          ['Isla Collins', 'Uma Allen'], ['James Stewart', 'Iris Chen'],
          ['Kelly Morris', 'Kate Thomas'], ['Leo Rogers', 'Sam Walker'],
          ['Maya Reed', 'Frank Brown'], ['Nathan Cook', 'Bob Smith'],
          ['Ophelia Morgan', 'David Wilson'], ['Paul Bell', 'Mia Jackson'],
          ['Rosa Murphy', 'Quinn Lewis'], ['Steve Bailey', 'Olivia Harris'],
          ['Tara Rivera', 'Uma Allen'], ['Ulrich Cooper', 'Kate Thomas'],
          ['Vera Richardson', 'Bob Smith'], ['Will Cox', 'Frank Brown'],
          ['Xena Howard', 'Sam Walker'], ['Yuri Ward', 'Iris Chen'],
        ],
      },
      hints: [
        'This is a self join — join employees to employees',
        'LEFT JOIN employees m ON e.manager_id = m.id',
        'SELECT e.name AS employee, m.name AS manager FROM employees e LEFT JOIN employees m ON e.manager_id = m.id;',
      ],
      validationMode: 'unordered',
    },
    {
      id: 4,
      moduleId: 4,
      title: 'Order Details',
      description: '<p>Show all orders with the <strong>customer name</strong> and the <strong>number of items</strong> in each order. Columns: <code>order_id</code>, <code>customer</code>, <code>item_count</code>, <code>total</code>. Sort by total descending. Limit to 10.</p>',
      difficulty: 'medium',
      starterQuery: '-- Order details with customer names and item counts\n',
      expectedQuery: 'SELECT o.id AS order_id, c.name AS customer, COUNT(oi.id) AS item_count, o.total FROM orders o INNER JOIN customers c ON o.customer_id = c.id INNER JOIN order_items oi ON oi.order_id = o.id GROUP BY o.id, c.name, o.total ORDER BY o.total DESC LIMIT 10;',
      expectedResult: {
        columns: ['order_id', 'customer', 'item_count', 'total'],
        values: [
          [8, 'Pacific Trading', 2, 1749.98],
          [1, 'Acme Corp', 2, 1329.98],
          [15, 'Velocity Labs', 1, 1299.99],
          [25, 'Coral Systems', 1, 1299.99],
          [39, 'CloudNine Ltd', 1, 1299.99],
          [20, 'Pinnacle Group', 3, 629.98],
          [6, 'CloudNine Ltd', 1, 599.99],
          [30, 'Horizon Media', 1, 599.99],
          [11, 'Global Retail', 3, 479.98],
          [3, 'DataFlow GmbH', 1, 449.99],
        ],
      },
      hints: [
        'You need two JOINs: orders→customers AND orders→order_items',
        'GROUP BY o.id to count items per order',
        'SELECT o.id AS order_id, c.name AS customer, COUNT(oi.id) AS item_count, o.total FROM orders o INNER JOIN customers c ON o.customer_id = c.id INNER JOIN order_items oi ON oi.order_id = o.id GROUP BY o.id, c.name, o.total ORDER BY o.total DESC LIMIT 10;',
      ],
      validationMode: 'exact',
    },
    {
      id: 5,
      moduleId: 4,
      title: 'Revenue by Department',
      description: '<p>This is unrelated to orders — calculate the <strong>total salary cost</strong> per department. Show <code>department</code> name and <code>total_salary</code>. Sort by total_salary descending.</p>',
      difficulty: 'easy',
      starterQuery: '-- Total salary per department\n',
      expectedQuery: 'SELECT d.name AS department, SUM(e.salary) AS total_salary FROM employees e INNER JOIN departments d ON e.department_id = d.id GROUP BY d.name ORDER BY total_salary DESC;',
      expectedResult: {
        columns: ['department', 'total_salary'],
        values: [
          ['Engineering', 971000], ['Sales', 629000], ['Finance', 500000],
          ['Product', 512000], ['Marketing', 401000], ['Legal', 375000],
          ['Design', 350000], ['Operations', 289000], ['HR', 279000],
          ['Support', 254000],
        ],
      },
      hints: [
        'JOIN employees to departments, then GROUP BY department name',
        'SUM(e.salary) gives total salary per group',
        'SELECT d.name AS department, SUM(e.salary) AS total_salary FROM employees e INNER JOIN departments d ON e.department_id = d.id GROUP BY d.name ORDER BY total_salary DESC;',
      ],
      validationMode: 'exact',
    },
    {
      id: 6,
      moduleId: 4,
      title: 'Top Spending Customers',
      description: '<p>Find the <strong>top 5 customers by total spending</strong> (only counting delivered orders). Show <code>customer</code>, <code>orders</code> (count), and <code>total_spent</code> (rounded to 2 decimals).</p>',
      difficulty: 'hard',
      starterQuery: "-- Top 5 customers by spending (delivered only)\n",
      expectedQuery: "SELECT c.name AS customer, COUNT(o.id) AS orders, ROUND(SUM(o.total), 2) AS total_spent FROM customers c INNER JOIN orders o ON c.id = o.customer_id WHERE o.status = 'delivered' GROUP BY c.id, c.name ORDER BY total_spent DESC LIMIT 5;",
      expectedResult: {
        columns: ['customer', 'orders', 'total_spent'],
        values: [
          ['Pacific Trading', 1, 1749.98],
          ['Acme Corp', 4, 1654.95],
          ['Velocity Labs', 1, 1299.99],
          ['CloudNine Ltd', 1, 599.99],
          ['Global Retail', 1, 479.98],
        ],
      },
      hints: [
        "Filter with WHERE o.status = 'delivered' before grouping",
        'JOIN customers to orders, GROUP BY customer',
        "SELECT c.name AS customer, COUNT(o.id) AS orders, ROUND(SUM(o.total), 2) AS total_spent FROM customers c INNER JOIN orders o ON c.id = o.customer_id WHERE o.status = 'delivered' GROUP BY c.id, c.name ORDER BY total_spent DESC LIMIT 5;",
      ],
      validationMode: 'exact',
    },
    {
      id: 7,
      moduleId: 4,
      title: 'Best-Selling Products',
      description: '<p>Find the <strong>top 5 products</strong> by total quantity sold. Show <code>product</code>, <code>category</code>, <code>total_sold</code>. Exclude cancelled orders.</p>',
      difficulty: 'hard',
      starterQuery: "-- Top 5 best-selling products\n",
      expectedQuery: "SELECT p.name AS product, p.category, SUM(oi.quantity) AS total_sold FROM order_items oi INNER JOIN products p ON oi.product_id = p.id INNER JOIN orders o ON oi.order_id = o.id WHERE o.status != 'cancelled' GROUP BY p.id, p.name, p.category ORDER BY total_sold DESC LIMIT 5;",
      expectedResult: {
        columns: ['product', 'category', 'total_sold'],
        values: [
          ['Mechanical Keyboard', 'Electronics', 7],
          ['Laptop Pro 15', 'Electronics', 5],
          ['Wireless Mouse', 'Electronics', 5],
          ['Monitor 27"', 'Electronics', 4],
          ['Green Tea Box', 'Food', 4],
        ],
      },
      hints: [
        'Join order_items → products AND order_items → orders',
        "WHERE o.status != 'cancelled' excludes cancelled orders",
        "SELECT p.name AS product, p.category, SUM(oi.quantity) AS total_sold FROM order_items oi INNER JOIN products p ON oi.product_id = p.id INNER JOIN orders o ON oi.order_id = o.id WHERE o.status != 'cancelled' GROUP BY p.id, p.name, p.category ORDER BY total_sold DESC LIMIT 5;",
      ],
      validationMode: 'exact',
    },
    {
      id: 8,
      moduleId: 4,
      title: 'Direct Reports Count',
      description: '<p>For each manager, show their <code>name</code> and <code>direct_reports</code> count. Only show managers with <strong>3 or more</strong> direct reports. Sort by count descending.</p>',
      difficulty: 'hard',
      starterQuery: '-- Managers with 3+ direct reports\n',
      expectedQuery: 'SELECT m.name, COUNT(e.id) AS direct_reports FROM employees m INNER JOIN employees e ON e.manager_id = m.id GROUP BY m.id, m.name HAVING COUNT(e.id) >= 3 ORDER BY direct_reports DESC;',
      expectedResult: {
        columns: ['name', 'direct_reports'],
        values: [
          ['Frank Brown', 6],
          ['Alice Johnson', 5],
          ['David Wilson', 4],
          ['Kate Thomas', 4],
          ['Sam Walker', 4],
          ['Uma Allen', 3],
          ['Mia Jackson', 3],
          ['Olivia Harris', 3],
          ['Iris Chen', 3],
          ['Bob Smith', 3],
        ],
      },
      hints: [
        'Self join: employees m INNER JOIN employees e ON e.manager_id = m.id',
        'Use HAVING COUNT(e.id) >= 3 to filter',
        'SELECT m.name, COUNT(e.id) AS direct_reports FROM employees m INNER JOIN employees e ON e.manager_id = m.id GROUP BY m.id, m.name HAVING COUNT(e.id) >= 3 ORDER BY direct_reports DESC;',
      ],
      validationMode: 'exact',
    },
  ],
}
