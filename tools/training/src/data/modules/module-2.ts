import type { Module } from '../../types'

export const module2: Module = {
  id: 2,
  title: 'Filtering & Sorting',
  slug: 'filtering-sorting',
  description: 'WHERE clauses, comparison operators, pattern matching, ORDER BY, LIMIT, and NULL handling.',
  icon: 'Filter',
  color: '#27AE60',
  lessons: [
    {
      id: 1,
      moduleId: 2,
      title: 'WHERE Clause Basics',
      slug: 'where-basics',
      content: [
        {
          type: 'text',
          html: `<h2>Filtering Rows with WHERE</h2>
<p>The <code>WHERE</code> clause filters rows based on a condition. Only rows where the condition is <strong>true</strong> appear in the result.</p>`,
        },
        {
          type: 'code',
          title: 'Syntax',
          sql: 'SELECT columns FROM table WHERE condition;',
        },
        {
          type: 'sandbox',
          description: 'Find employees in department 1 (Engineering):',
          defaultQuery: "SELECT name, salary FROM employees WHERE department_id = 1;",
        },
        {
          type: 'text',
          html: `<h3>Comparison Operators</h3>
<ul>
<li><code>=</code> — equals</li>
<li><code>!=</code> or <code>&lt;&gt;</code> — not equals</li>
<li><code>&gt;</code> — greater than</li>
<li><code>&lt;</code> — less than</li>
<li><code>&gt;=</code> — greater than or equal</li>
<li><code>&lt;=</code> — less than or equal</li>
</ul>`,
        },
        {
          type: 'sandbox',
          description: 'Find employees earning more than $100,000:',
          defaultQuery: "SELECT name, salary FROM employees WHERE salary > 100000 ORDER BY salary DESC;",
        },
      ],
    },
    {
      id: 2,
      moduleId: 2,
      title: 'AND, OR, and NOT',
      slug: 'logical-operators',
      content: [
        {
          type: 'text',
          html: `<h2>Combining Conditions</h2>
<p>Use <code>AND</code>, <code>OR</code>, and <code>NOT</code> to combine multiple conditions.</p>
<ul>
<li><code>AND</code> — both conditions must be true</li>
<li><code>OR</code> — at least one condition must be true</li>
<li><code>NOT</code> — reverses a condition</li>
</ul>`,
        },
        {
          type: 'sandbox',
          description: 'Engineers earning over $100K:',
          defaultQuery: "SELECT name, salary\nFROM employees\nWHERE department_id = 1 AND salary > 100000;",
        },
        {
          type: 'sandbox',
          description: 'Employees in Engineering OR Marketing:',
          defaultQuery: "SELECT name, department_id\nFROM employees\nWHERE department_id = 1 OR department_id = 2;",
        },
        {
          type: 'callout',
          calloutType: 'warning',
          html: `<strong>Operator precedence</strong>: <code>AND</code> is evaluated before <code>OR</code>. Use parentheses to make your intent clear!<br><code>WHERE (dept = 1 OR dept = 2) AND salary > 100000</code> is different from<br><code>WHERE dept = 1 OR dept = 2 AND salary > 100000</code>`,
        },
      ],
    },
    {
      id: 3,
      moduleId: 2,
      title: 'IN, BETWEEN, and LIKE',
      slug: 'range-pattern',
      content: [
        {
          type: 'text',
          html: `<h2>Range and Pattern Operators</h2>
<h3>IN — match any value in a list</h3>
<p>Shorter than writing multiple <code>OR</code> conditions:</p>`,
        },
        {
          type: 'sandbox',
          description: 'Employees in Engineering, Sales, or Product:',
          defaultQuery: "SELECT name, department_id\nFROM employees\nWHERE department_id IN (1, 3, 9);",
        },
        {
          type: 'text',
          html: `<h3>BETWEEN — match a range (inclusive)</h3>`,
        },
        {
          type: 'sandbox',
          description: 'Employees with salaries between $80K and $100K:',
          defaultQuery: "SELECT name, salary\nFROM employees\nWHERE salary BETWEEN 80000 AND 100000\nORDER BY salary;",
        },
        {
          type: 'text',
          html: `<h3>LIKE — pattern matching</h3>
<p>Two wildcards: <code>%</code> matches any sequence of characters, <code>_</code> matches exactly one character.</p>`,
        },
        {
          type: 'sandbox',
          description: 'Find employees whose name starts with "A":',
          defaultQuery: "SELECT name FROM employees WHERE name LIKE 'A%';",
        },
        {
          type: 'callout',
          calloutType: 'tip',
          html: `Common patterns: <code>'%son'</code> (ends with "son"), <code>'%an%'</code> (contains "an"), <code>'_o%'</code> (second letter is "o").`,
        },
      ],
    },
    {
      id: 4,
      moduleId: 2,
      title: 'ORDER BY and LIMIT',
      slug: 'order-limit',
      content: [
        {
          type: 'text',
          html: `<h2>Sorting Results</h2>
<p><code>ORDER BY</code> sorts results. Default is ascending (<code>ASC</code>). Use <code>DESC</code> for descending.</p>`,
        },
        {
          type: 'sandbox',
          description: 'Top 5 highest-paid employees:',
          defaultQuery: "SELECT name, salary\nFROM employees\nORDER BY salary DESC\nLIMIT 5;",
        },
        {
          type: 'text',
          html: `<h3>Sorting by Multiple Columns</h3>
<p>You can sort by multiple columns. The second column breaks ties in the first.</p>`,
        },
        {
          type: 'sandbox',
          description: 'Sort by department, then by salary (highest first):',
          defaultQuery: "SELECT name, department_id, salary\nFROM employees\nORDER BY department_id ASC, salary DESC\nLIMIT 15;",
        },
        {
          type: 'text',
          html: `<h3>LIMIT with OFFSET</h3>
<p><code>LIMIT count OFFSET skip</code> is used for pagination. Skip the first N rows, then return count rows.</p>`,
        },
        {
          type: 'sandbox',
          description: 'Page 2 of results (rows 6-10):',
          defaultQuery: "SELECT name, salary\nFROM employees\nORDER BY salary DESC\nLIMIT 5 OFFSET 5;",
        },
      ],
    },
    {
      id: 5,
      moduleId: 2,
      title: 'NULL — The Tricky Value',
      slug: 'null-handling',
      content: [
        {
          type: 'text',
          html: `<h2>Understanding NULL</h2>
<p><code>NULL</code> means "unknown" or "no value". It's <strong>not</strong> the same as 0, empty string, or false. NULL is the absence of any value.</p>`,
        },
        {
          type: 'callout',
          calloutType: 'warning',
          html: `<strong>The #1 NULL trap</strong>: <code>NULL = NULL</code> is <strong>not true</strong>! You must use <code>IS NULL</code> or <code>IS NOT NULL</code> instead of <code>=</code> or <code>!=</code>.`,
        },
        {
          type: 'sandbox',
          description: 'Find employees who have no manager (top-level managers):',
          defaultQuery: "SELECT name, department_id\nFROM employees\nWHERE manager_id IS NULL;",
        },
        {
          type: 'comparison',
          left: {
            title: 'Correct',
            content: '<code>WHERE manager_id IS NULL</code><br>Returns employees with no manager.',
          },
          right: {
            title: 'Wrong (returns nothing!)',
            content: '<code>WHERE manager_id = NULL</code><br>NULL = NULL evaluates to NULL (not true), so no rows match.',
          },
        },
        {
          type: 'text',
          html: `<h3>COALESCE — Replace NULL with a Default</h3>
<p><code>COALESCE(value, default)</code> returns the first non-NULL argument. In MySQL you can also use <code>IFNULL(value, default)</code>.</p>`,
        },
        {
          type: 'sandbox',
          description: 'Show "None" instead of NULL for manager_id:',
          defaultQuery: "SELECT name, COALESCE(manager_id, 0) AS manager_id\nFROM employees\nWHERE manager_id IS NULL;",
        },
      ],
    },
    {
      id: 6,
      moduleId: 2,
      title: 'CASE WHEN — Conditional Logic',
      slug: 'case-when',
      content: [
        {
          type: 'text',
          html: `<h2>CASE WHEN — SQL's If/Else</h2>
<p><code>CASE WHEN</code> lets you add conditional logic to your queries. It's like if/else for SQL.</p>`,
        },
        {
          type: 'code', title: 'Syntax',
          sql: `CASE
  WHEN condition1 THEN result1
  WHEN condition2 THEN result2
  ELSE default_result
END`,
        },
        {
          type: 'sandbox', description: 'Categorize employees by salary level:',
          defaultQuery: `SELECT
  name, salary,
  CASE
    WHEN salary >= 120000 THEN 'Executive'
    WHEN salary >= 100000 THEN 'Senior'
    WHEN salary >= 80000 THEN 'Mid-level'
    ELSE 'Junior'
  END AS level
FROM employees
ORDER BY salary DESC
LIMIT 15;`,
        },
        {
          type: 'sandbox', description: 'Categorize orders by size:',
          defaultQuery: `SELECT
  id, total,
  CASE
    WHEN total >= 1000 THEN 'Large'
    WHEN total >= 200 THEN 'Medium'
    ELSE 'Small'
  END AS order_size,
  status
FROM orders
ORDER BY total DESC
LIMIT 12;`,
        },
        {
          type: 'callout', calloutType: 'tip',
          html: `<code>CASE</code> is incredibly versatile. You can use it in SELECT, WHERE, ORDER BY, GROUP BY, and inside aggregate functions (as we'll see in Module 3).`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 1,
      moduleId: 2,
      title: 'High Earners',
      description: '<p>Find all employees with a salary <strong>greater than $100,000</strong>. Show their <code>name</code> and <code>salary</code>.</p>',
      difficulty: 'easy',
      starterQuery: '-- Find high earners\n',
      expectedQuery: 'SELECT name, salary FROM employees WHERE salary > 100000;',
      expectedResult: {
        columns: ['name', 'salary'],
        values: [
          ['Alice Johnson', 120000], ['Bob Smith', 115000], ['Carol Davis', 105000],
          ['Kate Thomas', 110000], ['Quinn Lewis', 130000], ['Rachel Robinson', 125000],
          ['Sam Walker', 108000], ['Tina Hall', 102000], ['Xavier Wright', 112000],
          ['Brian Adams', 105000], ['Hugo Edwards', 118000], ['Leo Rogers', 105000],
          ['Daniel Phillips', 100000], ['Nathan Cook', 108000], ['Rosa Murphy', 120000],
          ['Vera Richardson', 100000],
        ],
      },
      hints: [
        'Use WHERE salary > 100000',
        'SELECT name, salary FROM employees WHERE ...',
        'SELECT name, salary FROM employees WHERE salary > 100000;',
      ],
      validationMode: 'unordered',
    },
    {
      id: 2,
      moduleId: 2,
      title: 'London Customers',
      description: '<p>Find all customers located in <strong>London</strong>. Show their <code>name</code> and <code>country</code>.</p>',
      difficulty: 'easy',
      starterQuery: '-- Find London customers\n',
      expectedQuery: "SELECT name, country FROM customers WHERE city = 'London';",
      expectedResult: {
        columns: ['name', 'country'],
        values: [
          ['TechStart Inc', 'UK'], ['CloudNine Ltd', 'UK'], ['GreenTech Ltd', 'UK'], ['Redwood Labs', 'UK'],
        ],
      },
      hints: [
        "String values need quotes: WHERE city = 'London'",
        "SELECT name, country FROM customers WHERE ...",
        "SELECT name, country FROM customers WHERE city = 'London';",
      ],
      validationMode: 'unordered',
    },
    {
      id: 3,
      moduleId: 2,
      title: 'Delivered Orders',
      description: '<p>Find all <strong>delivered</strong> orders placed in <strong>2023</strong>. Show <code>id</code>, <code>order_date</code>, and <code>total</code>. Sort by total descending.</p>',
      difficulty: 'medium',
      starterQuery: '-- Find delivered orders from 2023\n',
      expectedQuery: "SELECT id, order_date, total FROM orders WHERE status = 'delivered' AND order_date >= '2023-01-01' AND order_date < '2024-01-01' ORDER BY total DESC;",
      expectedResult: {
        columns: ['id', 'order_date', 'total'],
        values: [
          [8, '2023-05-10', 1749.98], [1, '2023-01-15', 1329.98], [15, '2023-09-10', 1299.99],
          [6, '2023-04-01', 599.99], [11, '2023-07-01', 479.98], [3, '2023-02-10', 449.99],
          [13, '2023-08-05', 399.99], [16, '2023-10-01', 179.98], [5, '2023-03-15', 154.98],
          [9, '2023-05-25', 119.99], [10, '2023-06-15', 94.98], [4, '2023-02-28', 89.99],
          [14, '2023-08-25', 84.98], [2, '2023-01-20', 79.98], [12, '2023-07-20', 59.98],
          [17, '2023-10-20', 54.99], [7, '2023-04-20', 39.99],
        ],
      },
      hints: [
        "Combine conditions with AND: status = 'delivered' AND date conditions",
        "Filter dates with: order_date >= '2023-01-01' AND order_date < '2024-01-01'",
        "SELECT id, order_date, total FROM orders WHERE status = 'delivered' AND order_date >= '2023-01-01' AND order_date < '2024-01-01' ORDER BY total DESC;",
      ],
      validationMode: 'exact',
    },
    {
      id: 4,
      moduleId: 2,
      title: 'Product Search',
      description: '<p>Find all products in the <strong>Electronics</strong> or <strong>Books</strong> categories with a price <strong>under $50</strong>. Show <code>name</code>, <code>category</code>, and <code>price</code>.</p>',
      difficulty: 'medium',
      starterQuery: '-- Find affordable electronics and books\n',
      expectedQuery: "SELECT name, category, price FROM products WHERE category IN ('Electronics', 'Books') AND price < 50;",
      expectedResult: {
        columns: ['name', 'category', 'price'],
        values: [
          ['Wireless Mouse', 'Electronics', 29.99],
          ['USB-C Hub', 'Electronics', 49.99],
          ['SQL Mastery Guide', 'Books', 39.99],
          ['Database Design Patterns', 'Books', 44.99],
        ],
      },
      hints: [
        "Use IN ('Electronics', 'Books') instead of multiple OR",
        'Combine with AND price < 50',
        "SELECT name, category, price FROM products WHERE category IN ('Electronics', 'Books') AND price < 50;",
      ],
      validationMode: 'unordered',
    },
    {
      id: 5,
      moduleId: 2,
      title: 'Top-Level Managers',
      description: '<p>Find all employees who have <strong>no manager</strong> (manager_id is NULL). Show their <code>name</code> and <code>department_id</code>, sorted by name.</p>',
      difficulty: 'easy',
      starterQuery: '-- Find top-level managers\n',
      expectedQuery: 'SELECT name, department_id FROM employees WHERE manager_id IS NULL ORDER BY name;',
      expectedResult: {
        columns: ['name', 'department_id'],
        values: [
          ['Alice Johnson', 1], ['David Wilson', 2], ['Frank Brown', 3],
          ['Iris Chen', 4], ['Kate Thomas', 5], ['Mia Jackson', 6],
          ['Olivia Harris', 7], ['Quinn Lewis', 8], ['Sam Walker', 9],
          ['Uma Allen', 10],
        ],
      },
      hints: [
        'Use IS NULL, not = NULL',
        'WHERE manager_id IS NULL',
        'SELECT name, department_id FROM employees WHERE manager_id IS NULL ORDER BY name;',
      ],
      validationMode: 'exact',
    },
  ],
}
