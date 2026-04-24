import type { Module } from '../../types'

export const module5: Module = {
  id: 5,
  title: 'Subqueries & CTEs',
  slug: 'subqueries-ctes',
  description: 'Scalar subqueries, correlated subqueries, EXISTS vs IN, and Common Table Expressions.',
  icon: 'Layers',
  color: '#F39C12',
  lessons: [
    {
      id: 1, moduleId: 5, title: 'Subquery Basics', slug: 'subquery-basics',
      content: [
        {
          type: 'text',
          html: `<h2>What is a Subquery?</h2>
<p>A <strong>subquery</strong> is a query nested inside another query. The inner query runs first, and its result is used by the outer query. Think of it as a question-within-a-question.</p>`,
        },
        {
          type: 'code', title: 'Subquery in WHERE',
          sql: `-- Find employees earning above average
SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);`,
        },
        {
          type: 'sandbox', description: 'Employees earning above the company average:',
          defaultQuery: `SELECT name, salary,
  ROUND(salary - (SELECT AVG(salary) FROM employees), 0) AS above_avg
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees)
ORDER BY salary DESC;`,
        },
        {
          type: 'callout', calloutType: 'info',
          html: `<strong>Scalar subquery</strong>: Returns a single value (one row, one column). Used with comparison operators like <code>=</code>, <code>></code>, <code><</code>.`,
        },
      ],
    },
    {
      id: 2, moduleId: 5, title: 'IN and EXISTS', slug: 'in-exists',
      content: [
        {
          type: 'text',
          html: `<h2>Subqueries that Return Multiple Rows</h2>
<h3>IN — match against a list</h3>
<p>When a subquery returns multiple rows, use <code>IN</code> instead of <code>=</code>:</p>`,
        },
        {
          type: 'sandbox', description: 'Employees in departments located in New York:',
          defaultQuery: `SELECT name, department_id
FROM employees
WHERE department_id IN (
  SELECT id FROM departments WHERE location = 'New York'
);`,
        },
        {
          type: 'text',
          html: `<h3>EXISTS — check if rows exist</h3>
<p><code>EXISTS</code> returns true if the subquery returns <strong>any</strong> rows. It's often faster than <code>IN</code> for large datasets because it stops at the first match.</p>`,
        },
        {
          type: 'sandbox', description: 'Customers who have placed at least one order:',
          defaultQuery: `SELECT c.name
FROM customers c
WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.id
)
ORDER BY c.name;`,
        },
        {
          type: 'comparison',
          left: { title: 'IN', content: 'Runs inner query once, compares all values.<br>Better for small inner result sets.<br>Can be rewritten as a JOIN.' },
          right: { title: 'EXISTS', content: 'Runs inner query per outer row, stops at first match.<br>Better for large inner tables with indexes.<br>More efficient for "has any" checks.' },
        },
      ],
    },
    {
      id: 3, moduleId: 5, title: 'Correlated Subqueries', slug: 'correlated',
      content: [
        {
          type: 'text',
          html: `<h2>Correlated Subqueries</h2>
<p>A <strong>correlated subquery</strong> references a column from the outer query. It runs once per outer row — like a nested loop. Powerful but can be slow on large tables.</p>`,
        },
        {
          type: 'sandbox', description: 'Employees earning more than their department average:',
          defaultQuery: `SELECT e.name, e.salary, e.department_id
FROM employees e
WHERE e.salary > (
  SELECT AVG(e2.salary)
  FROM employees e2
  WHERE e2.department_id = e.department_id
)
ORDER BY e.department_id, e.salary DESC;`,
        },
        {
          type: 'callout', calloutType: 'warning',
          html: `<strong>Performance</strong>: Correlated subqueries run once per outer row. For 1000 employees, the inner query executes 1000 times. Consider rewriting as a JOIN for large tables.`,
        },
      ],
    },
    {
      id: 4, moduleId: 5, title: 'Common Table Expressions (CTEs)', slug: 'ctes',
      content: [
        {
          type: 'text',
          html: `<h2>CTEs — Named Subqueries</h2>
<p>A <code>WITH</code> clause (Common Table Expression) lets you name a subquery and reference it like a table. CTEs make complex queries readable.</p>`,
        },
        {
          type: 'code', title: 'CTE Syntax',
          sql: `WITH cte_name AS (
  SELECT ... FROM ...
)
SELECT ... FROM cte_name WHERE ...;`,
        },
        {
          type: 'sandbox', description: 'Department stats using a CTE:',
          defaultQuery: `WITH dept_stats AS (
  SELECT
    department_id,
    COUNT(*) AS headcount,
    ROUND(AVG(salary), 0) AS avg_salary
  FROM employees
  GROUP BY department_id
)
SELECT d.name, ds.headcount, ds.avg_salary
FROM dept_stats ds
INNER JOIN departments d ON ds.department_id = d.id
WHERE ds.headcount >= 4
ORDER BY ds.avg_salary DESC;`,
        },
        {
          type: 'callout', calloutType: 'mysql',
          html: `CTEs were added in <strong>MySQL 8.0</strong> (2018). If you're on MySQL 5.7, you must use subqueries or temporary tables instead.`,
        },
        {
          type: 'text',
          html: `<h3>Multiple CTEs</h3>
<p>You can chain multiple CTEs separated by commas:</p>`,
        },
        {
          type: 'sandbox', description: 'Customer spending tiers:',
          defaultQuery: `WITH customer_spending AS (
  SELECT
    c.id, c.name,
    COALESCE(SUM(o.total), 0) AS total_spent
  FROM customers c
  LEFT JOIN orders o ON c.id = o.customer_id
    AND o.status = 'delivered'
  GROUP BY c.id, c.name
),
tiers AS (
  SELECT *,
    CASE
      WHEN total_spent >= 1000 THEN 'Gold'
      WHEN total_spent >= 100 THEN 'Silver'
      WHEN total_spent > 0 THEN 'Bronze'
      ELSE 'Inactive'
    END AS tier
  FROM customer_spending
)
SELECT tier, COUNT(*) AS customers, ROUND(AVG(total_spent), 2) AS avg_spent
FROM tiers
GROUP BY tier
ORDER BY avg_spent DESC;`,
        },
      ],
    },
    {
      id: 5, moduleId: 5, title: 'Subquery vs JOIN', slug: 'subquery-vs-join',
      content: [
        {
          type: 'text',
          html: `<h2>When to Use Subqueries vs JOINs</h2>
<p>Many subqueries can be rewritten as JOINs, and vice versa. Here's when to use which:</p>`,
        },
        {
          type: 'comparison',
          left: { title: 'Use Subqueries when...', content: '<ul><li>You need a single aggregate value</li><li>You\'re checking existence (EXISTS)</li><li>Readability is more important than micro-optimization</li><li>CTEs make the logic clearer</li></ul>' },
          right: { title: 'Use JOINs when...', content: '<ul><li>You need columns from both tables in the output</li><li>Performance matters on large tables</li><li>You\'re replacing IN with a large subquery</li><li>MySQL optimizer handles JOINs better (usually)</li></ul>' },
        },
        {
          type: 'sandbox', description: 'Same result — subquery vs JOIN:',
          defaultQuery: `-- Subquery approach:
SELECT name FROM employees
WHERE department_id IN (
  SELECT id FROM departments WHERE location = 'New York'
);

-- Equivalent JOIN (often faster):
-- SELECT e.name FROM employees e
-- INNER JOIN departments d ON e.department_id = d.id
-- WHERE d.location = 'New York';`,
        },
      ],
    },
    {
      id: 6, moduleId: 5, title: 'ANY, ALL, and SELECT INTO', slug: 'any-all',
      content: [
        {
          type: 'text',
          html: `<h2>ANY and ALL Operators</h2>
<p><code>ANY</code> and <code>ALL</code> compare a value against a set of values returned by a subquery.</p>
<ul>
<li><code>ANY</code> — returns true if the comparison is true for <strong>at least one</strong> value</li>
<li><code>ALL</code> — returns true if the comparison is true for <strong>every</strong> value</li>
</ul>`,
        },
        {
          type: 'sandbox', description: 'Employees earning more than ANY Finance employee:',
          defaultQuery: `-- salary > ANY means "salary > the minimum Finance salary"
SELECT name, salary, department_id
FROM employees
WHERE salary > ALL (
  SELECT salary FROM employees WHERE department_id = 4
)
ORDER BY salary
LIMIT 10;`,
        },
        {
          type: 'callout', calloutType: 'tip',
          html: `<code>> ANY(subquery)</code> is equivalent to <code>> MIN(subquery)</code>. <code>> ALL(subquery)</code> is equivalent to <code>> MAX(subquery)</code>. Most developers prefer MIN/MAX for clarity.`,
        },
        {
          type: 'text',
          html: `<h2>INSERT INTO ... SELECT</h2>
<p>Copy data from one table to another using a SELECT statement:</p>`,
        },
        {
          type: 'code', title: 'MySQL syntax',
          sql: `-- Copy high-earner data into a new table
CREATE TABLE high_earners AS
SELECT name, salary, department_id
FROM employees
WHERE salary > 100000;

-- Or insert into an existing table:
INSERT INTO archived_orders
SELECT * FROM orders WHERE status = 'cancelled';`,
        },
        {
          type: 'sandbox', description: 'Create a table from a query:',
          defaultQuery: `CREATE TABLE dept_summary AS
SELECT department_id, COUNT(*) AS headcount, ROUND(AVG(salary), 0) AS avg_salary
FROM employees
GROUP BY department_id;

SELECT * FROM dept_summary ORDER BY avg_salary DESC;`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 1, moduleId: 5, title: 'Above Average Salary',
      description: '<p>Find all employees whose salary is <strong>above the company average</strong>. Show <code>name</code> and <code>salary</code>. Sort by salary descending.</p>',
      difficulty: 'easy',
      starterQuery: '-- Employees above average salary\n',
      expectedQuery: 'SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees) ORDER BY salary DESC;',
      expectedResult: {
        columns: ['name', 'salary'],
        values: [
          ['Quinn Lewis', 130000], ['Rachel Robinson', 125000], ['Alice Johnson', 120000], ['Rosa Murphy', 120000],
          ['Hugo Edwards', 118000], ['Bob Smith', 115000], ['Xavier Wright', 112000], ['Kate Thomas', 110000],
          ['Sam Walker', 108000], ['Nathan Cook', 108000], ['Carol Davis', 105000], ['Brian Adams', 105000],
          ['Leo Rogers', 105000], ['Tina Hall', 102000], ['Daniel Phillips', 100000], ['Vera Richardson', 100000],
          ['Liam Moore', 98000], ['Wendy King', 98000], ['Xena Howard', 97000], ['Henry Taylor', 95000],
          ['Amy Baker', 95000], ['Kelly Morris', 95000], ['Frank Brown', 92000], ['Ulrich Cooper', 92000],
        ],
      },
      hints: [
        'The subquery is: (SELECT AVG(salary) FROM employees)',
        'WHERE salary > (subquery)',
        'SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees) ORDER BY salary DESC;',
      ],
      validationMode: 'exact',
    },
    {
      id: 2, moduleId: 5, title: 'New York Employees',
      description: '<p>Find employees in departments located in <strong>New York</strong>. Use an <code>IN</code> subquery on the departments table. Show <code>name</code> and <code>department_id</code>.</p>',
      difficulty: 'easy',
      starterQuery: "-- Employees in New York departments\n",
      expectedQuery: "SELECT name, department_id FROM employees WHERE department_id IN (SELECT id FROM departments WHERE location = 'New York');",
      expectedResult: {
        columns: ['name', 'department_id'],
        values: [
          ['Alice Johnson', 1], ['Bob Smith', 1], ['Carol Davis', 1], ['Frank Brown', 3], ['Grace Lee', 3],
          ['Henry Taylor', 3], ['Wendy King', 1], ['Xavier Wright', 1], ['Zach Green', 3],
          ['Amy Baker', 1], ['Chloe Turner', 3], ['Hugo Edwards', 1], ['Maya Reed', 3],
          ['Nathan Cook', 1], ['Vera Richardson', 1], ['Will Cox', 3],
        ],
      },
      hints: [
        "Inner query: SELECT id FROM departments WHERE location = 'New York'",
        'WHERE department_id IN (inner query)',
        "SELECT name, department_id FROM employees WHERE department_id IN (SELECT id FROM departments WHERE location = 'New York');",
      ],
      validationMode: 'unordered',
    },
    {
      id: 3, moduleId: 5, title: 'Highest Paid Per Department',
      description: '<p>Find the <strong>highest-paid employee in each department</strong> using a correlated subquery. Show <code>name</code>, <code>department_id</code>, and <code>salary</code>.</p>',
      difficulty: 'hard',
      starterQuery: '-- Highest paid in each department\n',
      expectedQuery: 'SELECT name, department_id, salary FROM employees e WHERE salary = (SELECT MAX(salary) FROM employees e2 WHERE e2.department_id = e.department_id);',
      expectedResult: {
        columns: ['name', 'department_id', 'salary'],
        values: [
          ['Alice Johnson', 1, 120000], ['David Wilson', 2, 85000], ['Henry Taylor', 3, 95000],
          ['Iris Chen', 4, 72000], ['Kate Thomas', 5, 110000], ['Mia Jackson', 6, 75000],
          ['Olivia Harris', 7, 65000], ['Quinn Lewis', 8, 130000], ['Sam Walker', 9, 108000],
          ['Uma Allen', 10, 90000],
        ],
      },
      hints: [
        'Correlated subquery: reference outer table in inner WHERE',
        'WHERE salary = (SELECT MAX(salary) FROM employees e2 WHERE e2.department_id = e.department_id)',
        'SELECT name, department_id, salary FROM employees e WHERE salary = (SELECT MAX(salary) FROM employees e2 WHERE e2.department_id = e.department_id);',
      ],
      validationMode: 'unordered',
    },
    {
      id: 4, moduleId: 5, title: 'Department Stats CTE',
      description: '<p>Using a CTE, find departments where the <strong>average salary exceeds $90,000</strong>. Show <code>department</code> name, <code>headcount</code>, and <code>avg_salary</code> (rounded). Sort by avg_salary descending.</p>',
      difficulty: 'medium',
      starterQuery: '-- Departments with avg salary > 90K\nWITH dept_stats AS (\n',
      expectedQuery: 'WITH dept_stats AS (SELECT department_id, COUNT(*) AS headcount, ROUND(AVG(salary), 0) AS avg_salary FROM employees GROUP BY department_id) SELECT d.name AS department, ds.headcount, ds.avg_salary FROM dept_stats ds INNER JOIN departments d ON ds.department_id = d.id WHERE ds.avg_salary > 90000 ORDER BY ds.avg_salary DESC;',
      expectedResult: {
        columns: ['department', 'headcount', 'avg_salary'],
        values: [
          ['Legal', 3, 125000.0],
          ['Engineering', 9, 107889.0],
          ['Product', 5, 102400.0],
          ['Finance', 5, 100000.0],
        ],
      },
      hints: [
        'CTE should GROUP BY department_id with AVG and COUNT',
        'Join CTE to departments for the name, filter WHERE avg_salary > 90000',
        'WITH dept_stats AS (SELECT department_id, COUNT(*) AS headcount, ROUND(AVG(salary), 0) AS avg_salary FROM employees GROUP BY department_id) SELECT d.name AS department, ds.headcount, ds.avg_salary FROM dept_stats ds INNER JOIN departments d ON ds.department_id = d.id WHERE ds.avg_salary > 90000 ORDER BY ds.avg_salary DESC;',
      ],
      validationMode: 'exact',
    },
    {
      id: 5, moduleId: 5, title: 'Customers With Orders (EXISTS)',
      description: '<p>Using <code>EXISTS</code>, find customers who have placed <strong>at least one delivered order</strong>. Show <code>name</code> and <code>city</code>. Sort by name.</p>',
      difficulty: 'medium',
      starterQuery: "-- Customers with delivered orders using EXISTS\n",
      expectedQuery: "SELECT c.name, c.city FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'delivered') ORDER BY c.name;",
      expectedResult: {
        columns: ['name', 'city'],
        values: [
          ['Acme Corp', 'New York'], ['Blue Ocean Ltd', 'Dubai'], ['CloudNine Ltd', 'London'],
          ['DataFlow GmbH', 'Berlin'], ['FireStorm Tech', 'Berlin'], ['Global Retail', 'New York'],
          ['GreenTech Ltd', 'London'], ['Pacific Trading', 'Sydney'], ['TechStart Inc', 'London'],
          ['Velocity Labs', 'Singapore'],
        ],
      },
      hints: [
        "EXISTS (SELECT 1 FROM orders WHERE ... AND status = 'delivered')",
        'The subquery references c.id from the outer query',
        "SELECT c.name, c.city FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'delivered') ORDER BY c.name;",
      ],
      validationMode: 'exact',
    },
  ],
}
