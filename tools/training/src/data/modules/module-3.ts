import type { Module } from '../../types'

export const module3: Module = {
  id: 3,
  title: 'Aggregation & Grouping',
  slug: 'aggregation',
  description: 'COUNT, SUM, AVG, GROUP BY, HAVING, GROUP_CONCAT, and WITH ROLLUP.',
  icon: 'BarChart',
  color: '#8E44AD',
  lessons: [
    {
      id: 1,
      moduleId: 3,
      title: 'Aggregate Functions',
      slug: 'aggregate-functions',
      content: [
        {
          type: 'text',
          html: `<h2>Summarizing Data with Aggregates</h2>
<p>Aggregate functions process multiple rows and return a single result. They're how you answer questions like "how many?", "what's the total?", and "what's the average?".</p>
<h3>The Big Five</h3>
<ul>
<li><code>COUNT(*)</code> — count all rows</li>
<li><code>COUNT(column)</code> — count non-NULL values</li>
<li><code>SUM(column)</code> — add up all values</li>
<li><code>AVG(column)</code> — calculate the average</li>
<li><code>MIN(column)</code> / <code>MAX(column)</code> — find smallest/largest value</li>
</ul>`,
        },
        {
          type: 'sandbox',
          description: 'Try all five aggregates on the employees table:',
          defaultQuery: `SELECT
  COUNT(*) AS total_employees,
  ROUND(AVG(salary), 2) AS avg_salary,
  MIN(salary) AS min_salary,
  MAX(salary) AS max_salary,
  SUM(salary) AS total_payroll
FROM employees;`,
        },
        {
          type: 'callout',
          calloutType: 'warning',
          html: `<strong>COUNT(*) vs COUNT(column)</strong>: <code>COUNT(*)</code> counts all rows including NULLs. <code>COUNT(column)</code> only counts rows where that column is not NULL. This matters!`,
        },
        {
          type: 'sandbox',
          description: 'See the difference — count all employees vs count those with managers:',
          defaultQuery: `SELECT
  COUNT(*) AS all_employees,
  COUNT(manager_id) AS has_manager
FROM employees;`,
        },
        {
          type: 'text',
          html: `<h3>Aggregates with WHERE</h3>
<p>You can filter rows <strong>before</strong> aggregating by adding a <code>WHERE</code> clause:</p>`,
        },
        {
          type: 'sandbox',
          description: 'Average salary in Engineering (department 1):',
          defaultQuery: `SELECT
  COUNT(*) AS eng_count,
  ROUND(AVG(salary), 2) AS eng_avg_salary
FROM employees
WHERE department_id = 1;`,
        },
      ],
    },
    {
      id: 2,
      moduleId: 3,
      title: 'GROUP BY',
      slug: 'group-by',
      content: [
        {
          type: 'text',
          html: `<h2>Grouping Rows</h2>
<p><code>GROUP BY</code> splits rows into groups based on column values, then applies aggregate functions to each group separately. This is how you answer "per-category" questions.</p>
<p>Watch how GROUP BY sorts rows into buckets:</p>`,
        },
        {
          type: 'animation',
          animation: 'GroupByAnimation',
        },
        {
          type: 'code',
          title: 'Syntax',
          sql: `SELECT column, AGGREGATE(other_column)
FROM table
GROUP BY column;`,
        },
        {
          type: 'sandbox',
          description: 'How many employees in each department?',
          defaultQuery: `SELECT department_id, COUNT(*) AS employee_count
FROM employees
GROUP BY department_id
ORDER BY employee_count DESC;`,
        },
        {
          type: 'callout',
          calloutType: 'warning',
          html: `<strong>Rule</strong>: Every column in your <code>SELECT</code> must either be in the <code>GROUP BY</code> clause or inside an aggregate function. You can't select <code>name</code> if you're grouping by <code>department_id</code> — which name would MySQL pick from each group?`,
        },
        {
          type: 'text',
          html: `<h3>Multiple Grouping Columns</h3>
<p>You can group by multiple columns to create finer-grained groups:</p>`,
        },
        {
          type: 'sandbox',
          description: 'Orders by status and year:',
          defaultQuery: `SELECT
  status,
  SUBSTR(order_date, 1, 4) AS year,
  COUNT(*) AS order_count,
  ROUND(SUM(total), 2) AS revenue
FROM orders
GROUP BY status, SUBSTR(order_date, 1, 4)
ORDER BY year, status;`,
        },
      ],
    },
    {
      id: 3,
      moduleId: 3,
      title: 'HAVING vs WHERE',
      slug: 'having-vs-where',
      content: [
        {
          type: 'text',
          html: `<h2>Filtering Groups with HAVING</h2>
<p><code>WHERE</code> filters individual rows <strong>before</strong> grouping. <code>HAVING</code> filters groups <strong>after</strong> aggregation. This is a critical distinction.</p>`,
        },
        {
          type: 'comparison',
          left: {
            title: 'WHERE (filters rows)',
            content: 'Runs <strong>before</strong> GROUP BY.<br>Can reference table columns.<br>Cannot use aggregate functions.',
          },
          right: {
            title: 'HAVING (filters groups)',
            content: 'Runs <strong>after</strong> GROUP BY.<br>Can use aggregate functions.<br>Filters based on group results.',
          },
        },
        {
          type: 'code',
          title: 'Execution order',
          sql: `-- MySQL processes clauses in this order:
-- 1. FROM    → pick the table
-- 2. WHERE   → filter individual rows
-- 3. GROUP BY → form groups
-- 4. HAVING  → filter groups
-- 5. SELECT  → compute output columns
-- 6. ORDER BY → sort results
-- 7. LIMIT   → restrict row count`,
        },
        {
          type: 'sandbox',
          description: 'Find departments with more than 5 employees:',
          defaultQuery: `SELECT department_id, COUNT(*) AS emp_count
FROM employees
GROUP BY department_id
HAVING COUNT(*) > 5
ORDER BY emp_count DESC;`,
        },
        {
          type: 'text',
          html: `<h3>Combining WHERE and HAVING</h3>
<p>You can use both: <code>WHERE</code> filters rows first, then <code>HAVING</code> filters the resulting groups.</p>`,
        },
        {
          type: 'sandbox',
          description: 'Departments with more than 3 employees earning over $80K:',
          defaultQuery: `SELECT department_id, COUNT(*) AS high_earners
FROM employees
WHERE salary > 80000
GROUP BY department_id
HAVING COUNT(*) > 3;`,
        },
      ],
    },
    {
      id: 4,
      moduleId: 3,
      title: 'Conditional Aggregation',
      slug: 'conditional-aggregation',
      content: [
        {
          type: 'text',
          html: `<h2>Aggregating with Conditions</h2>
<p>Sometimes you want to count or sum only specific rows within a group. Instead of multiple queries, use <code>CASE</code> inside aggregate functions.</p>`,
        },
        {
          type: 'sandbox',
          description: 'Count orders by status in a single query:',
          defaultQuery: `SELECT
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered,
  COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS shipped,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled
FROM orders;`,
        },
        {
          type: 'callout',
          calloutType: 'tip',
          html: `This "pivot" technique is incredibly useful for reporting. Instead of running 4 separate queries, you get all counts in a single pass over the data.`,
        },
        {
          type: 'text',
          html: `<h3>SUM with CASE</h3>
<p>You can also use <code>SUM(CASE WHEN ... THEN value END)</code> to sum different subsets:</p>`,
        },
        {
          type: 'sandbox',
          description: 'Revenue by order status:',
          defaultQuery: `SELECT
  ROUND(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 2) AS delivered_revenue,
  ROUND(SUM(CASE WHEN status = 'pending' THEN total ELSE 0 END), 2) AS pending_revenue,
  ROUND(SUM(total), 2) AS total_revenue
FROM orders;`,
        },
      ],
    },
    {
      id: 5,
      moduleId: 3,
      title: 'GROUP_CONCAT and Advanced Aggregates',
      slug: 'group-concat',
      content: [
        {
          type: 'text',
          html: `<h2>MySQL-Specific: GROUP_CONCAT</h2>
<p><code>GROUP_CONCAT()</code> concatenates values from multiple rows into a single string. It's a MySQL-specific function that's extremely useful for reports.</p>`,
        },
        {
          type: 'callout',
          calloutType: 'mysql',
          html: `<code>GROUP_CONCAT</code> is MySQL-specific. PostgreSQL uses <code>STRING_AGG()</code>. Our sandbox uses SQLite's <code>GROUP_CONCAT()</code> which works the same way.`,
        },
        {
          type: 'sandbox',
          description: 'List all employee names per department:',
          defaultQuery: `SELECT
  department_id,
  GROUP_CONCAT(name, ', ') AS employees
FROM employees
GROUP BY department_id
ORDER BY department_id;`,
        },
        {
          type: 'text',
          html: `<h3>Useful Aggregate Patterns</h3>
<p>Here are patterns you'll use constantly in production MySQL:</p>`,
        },
        {
          type: 'sandbox',
          description: 'Comprehensive department report:',
          defaultQuery: `SELECT
  department_id,
  COUNT(*) AS headcount,
  ROUND(AVG(salary), 0) AS avg_salary,
  MIN(hire_date) AS first_hire,
  MAX(hire_date) AS last_hire,
  GROUP_CONCAT(name) AS team
FROM employees
GROUP BY department_id
ORDER BY headcount DESC;`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 1,
      moduleId: 3,
      title: 'Total Payroll',
      description: '<p>Calculate the <strong>total salary</strong> of all employees. Name the result column <code>total_payroll</code>.</p>',
      difficulty: 'easy',
      starterQuery: '-- Calculate total payroll\n',
      expectedQuery: 'SELECT SUM(salary) AS total_payroll FROM employees;',
      expectedResult: {
        columns: ['total_payroll'],
        values: [[4614000]],
      },
      hints: [
        'Use SUM() to add up all values in a column',
        'SELECT SUM(salary) AS total_payroll FROM ...',
        'SELECT SUM(salary) AS total_payroll FROM employees;',
      ],
      validationMode: 'exact',
    },
    {
      id: 2,
      moduleId: 3,
      title: 'Employees Per Department',
      description: '<p>Count the number of employees in <strong>each department</strong>. Show <code>department_id</code> and <code>employee_count</code>. Sort by count descending.</p>',
      difficulty: 'easy',
      starterQuery: '-- Count employees per department\n',
      expectedQuery: 'SELECT department_id, COUNT(*) AS employee_count FROM employees GROUP BY department_id ORDER BY employee_count DESC;',
      expectedResult: {
        columns: ['department_id', 'employee_count'],
        values: [
          [1, 9], [3, 7], [5, 5], [9, 5], [2, 5],
          [10, 4], [6, 4], [4, 4], [7, 4], [8, 3],
        ],
      },
      hints: [
        'Use GROUP BY department_id',
        'COUNT(*) counts rows in each group',
        'SELECT department_id, COUNT(*) AS employee_count FROM employees GROUP BY department_id ORDER BY employee_count DESC;',
      ],
      validationMode: 'exact',
    },
    {
      id: 3,
      moduleId: 3,
      title: 'Big Departments',
      description: '<p>Find departments that have <strong>5 or more employees</strong>. Show <code>department_id</code> and <code>headcount</code>.</p>',
      difficulty: 'medium',
      starterQuery: '-- Find departments with 5+ employees\n',
      expectedQuery: 'SELECT department_id, COUNT(*) AS headcount FROM employees GROUP BY department_id HAVING COUNT(*) >= 5;',
      expectedResult: {
        columns: ['department_id', 'headcount'],
        values: [[1, 9], [2, 5], [3, 7], [5, 5], [9, 5]],
      },
      hints: [
        'Use HAVING to filter groups (not WHERE)',
        'HAVING COUNT(*) >= 5',
        'SELECT department_id, COUNT(*) AS headcount FROM employees GROUP BY department_id HAVING COUNT(*) >= 5;',
      ],
      validationMode: 'unordered',
    },
    {
      id: 4,
      moduleId: 3,
      title: 'Product Category Stats',
      description: '<p>For each product <code>category</code>, show the <strong>number of products</strong>, <strong>average price</strong> (rounded to 2 decimals), and <strong>total stock</strong>. Name the columns <code>category</code>, <code>product_count</code>, <code>avg_price</code>, <code>total_stock</code>.</p>',
      difficulty: 'medium',
      starterQuery: '-- Product stats per category\n',
      expectedQuery: 'SELECT category, COUNT(*) AS product_count, ROUND(AVG(price), 2) AS avg_price, SUM(stock) AS total_stock FROM products GROUP BY category;',
      expectedResult: {
        columns: ['category', 'product_count', 'avg_price', 'total_stock'],
        values: [
          ['Books', 3, 46.66, 1000],
          ['Clothing', 3, 56.66, 930],
          ['Electronics', 5, 383.99, 1250],
          ['Food', 3, 18.99, 1400],
          ['Home', 3, 348.66, 465],
          ['Sports', 3, 59.99, 800],
        ],
      },
      hints: [
        'GROUP BY category, use COUNT, AVG, SUM',
        'ROUND(AVG(price), 2) for 2 decimal places',
        'SELECT category, COUNT(*) AS product_count, ROUND(AVG(price), 2) AS avg_price, SUM(stock) AS total_stock FROM products GROUP BY category;',
      ],
      validationMode: 'unordered',
    },
    {
      id: 5,
      moduleId: 3,
      title: 'Order Status Pivot',
      description: '<p>Create a single-row summary showing the count of orders for each status. Columns: <code>delivered</code>, <code>shipped</code>, <code>pending</code>, <code>cancelled</code>. Use conditional aggregation (CASE inside COUNT).</p>',
      difficulty: 'hard',
      starterQuery: "-- Pivot order counts by status\nSELECT\n  COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered,\n",
      expectedQuery: "SELECT COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered, COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS shipped, COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending, COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled FROM orders;",
      expectedResult: {
        columns: ['delivered', 'shipped', 'pending', 'cancelled'],
        values: [[21, 9, 7, 3]],
      },
      hints: [
        "Use COUNT(CASE WHEN status = 'value' THEN 1 END) for each status",
        'You need 4 COUNT(CASE...) expressions in one SELECT',
        "SELECT COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered, COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS shipped, COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending, COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled FROM orders;",
      ],
      validationMode: 'exact',
    },
  ],
}
