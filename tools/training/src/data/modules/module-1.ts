import type { Module } from '../../types'

export const module1: Module = {
  id: 1,
  title: 'MySQL Foundations',
  slug: 'foundations',
  description: 'What is MySQL, how tables work, data types, and your first SELECT queries.',
  icon: 'Database',
  color: '#2980B9',
  lessons: [
    {
      id: 1,
      moduleId: 1,
      title: 'What is MySQL?',
      slug: 'what-is-mysql',
      content: [
        {
          type: 'text',
          html: `<h2>Welcome to MySQL</h2>
<p>MySQL is the world's most popular open-source relational database. It powers companies like Facebook, Twitter, YouTube, and Netflix. If you're building a web application, chances are MySQL is behind it.</p>
<p>A <strong>relational database</strong> stores data in <strong>tables</strong> — structured collections of rows and columns, similar to a spreadsheet. The "relational" part means tables can reference each other through relationships.</p>`,
        },
        {
          type: 'callout',
          calloutType: 'mysql',
          html: `<strong>InnoDB</strong> is MySQL's default storage engine. It provides ACID transactions, row-level locking, and crash recovery. Almost every MySQL table you'll work with uses InnoDB.`,
        },
        {
          type: 'text',
          html: `<h3>Key Concepts</h3>
<ul>
<li><strong>Database</strong> — a container for related tables (like a folder)</li>
<li><strong>Table</strong> — a structured collection of data with defined columns</li>
<li><strong>Row</strong> — a single record in a table (also called a "record" or "tuple")</li>
<li><strong>Column</strong> — a field in a table with a specific data type (also called an "attribute")</li>
<li><strong>Primary Key</strong> — a column (or columns) that uniquely identifies each row</li>
</ul>`,
        },
        {
          type: 'text',
          html: `<h3>Our Practice Database</h3>
<p>Throughout this training, you'll work with a realistic database containing 6 tables:</p>
<ul>
<li><strong>employees</strong> — 50 employees with names, salaries, departments, and managers</li>
<li><strong>departments</strong> — 10 departments (Engineering, Marketing, Sales, etc.)</li>
<li><strong>customers</strong> — 30 business customers from around the world</li>
<li><strong>products</strong> — 20 products across 7 categories</li>
<li><strong>orders</strong> — 40 orders with statuses (pending, shipped, delivered, cancelled)</li>
<li><strong>order_items</strong> — 60 line items connecting orders to products</li>
</ul>`,
        },
        {
          type: 'sandbox',
          description: 'Try running a query! Type the SQL below and press Ctrl+Enter (or click Run):',
          defaultQuery: "SELECT name, email FROM employees LIMIT 5;",
        },
      ],
    },
    {
      id: 2,
      moduleId: 1,
      title: 'Tables, Rows, and Columns',
      slug: 'tables-rows-columns',
      content: [
        {
          type: 'text',
          html: `<h2>Understanding Table Structure</h2>
<p>Every table in MySQL has a fixed set of <strong>columns</strong> (defined when the table is created) and a variable number of <strong>rows</strong> (added as data is inserted).</p>
<p>Think of it like a spreadsheet:</p>
<ul>
<li>Columns are the headers (name, email, salary)</li>
<li>Rows are the data entries (one per employee)</li>
<li>Each cell holds a single value of a specific type</li>
</ul>`,
        },
        {
          type: 'text',
          html: `<h3>Exploring Table Structure</h3>
<p>In MySQL, you'd use <code>DESCRIBE employees;</code> or <code>SHOW COLUMNS FROM employees;</code> to see a table's structure. In our sandbox, you can use <code>PRAGMA table_info(employees);</code> which serves the same purpose.</p>`,
        },
        {
          type: 'sandbox',
          description: 'Explore the employees table structure:',
          defaultQuery: "PRAGMA table_info(employees);",
        },
        {
          type: 'text',
          html: `<h3>Counting Rows</h3>
<p>To see how much data is in a table, use <code>SELECT COUNT(*) FROM table_name;</code></p>`,
        },
        {
          type: 'sandbox',
          description: 'How many employees do we have?',
          defaultQuery: "SELECT COUNT(*) AS total_employees FROM employees;",
        },
        {
          type: 'callout',
          calloutType: 'tip',
          html: `The <code>AS</code> keyword creates an <strong>alias</strong> — a custom name for a column in the output. <code>COUNT(*) AS total_employees</code> makes the result column named "total_employees" instead of "COUNT(*)".`,
        },
      ],
    },
    {
      id: 3,
      moduleId: 1,
      title: 'MySQL Data Types',
      slug: 'data-types',
      content: [
        {
          type: 'text',
          html: `<h2>Data Types in MySQL</h2>
<p>Every column in a MySQL table has a <strong>data type</strong> that defines what kind of values it can store. Choosing the right type matters for storage efficiency and query performance.</p>`,
        },
        {
          type: 'text',
          html: `<h3>Numeric Types</h3>
<ul>
<li><code>INT</code> / <code>INTEGER</code> — whole numbers (-2 billion to 2 billion)</li>
<li><code>BIGINT</code> — very large whole numbers</li>
<li><code>DECIMAL(M,D)</code> — exact decimal numbers (e.g., money: <code>DECIMAL(10,2)</code>)</li>
<li><code>FLOAT</code> / <code>DOUBLE</code> — approximate decimal numbers (for science, not money)</li>
</ul>

<h3>String Types</h3>
<ul>
<li><code>VARCHAR(N)</code> — variable-length string up to N characters (most common)</li>
<li><code>TEXT</code> — long text (up to 65KB)</li>
<li><code>CHAR(N)</code> — fixed-length string, always N characters</li>
<li><code>ENUM('a','b','c')</code> — one value from a predefined list (MySQL-specific)</li>
</ul>

<h3>Date & Time Types</h3>
<ul>
<li><code>DATE</code> — date only (2024-01-15)</li>
<li><code>DATETIME</code> — date and time (2024-01-15 14:30:00)</li>
<li><code>TIMESTAMP</code> — like DATETIME but converts to UTC</li>
</ul>`,
        },
        {
          type: 'callout',
          calloutType: 'mysql',
          html: `<strong>MySQL-specific types</strong>: <code>ENUM</code> and <code>SET</code> are unique to MySQL. <code>JSON</code> type (MySQL 5.7+) stores structured JSON data with validation. These don't exist in most other databases.`,
        },
        {
          type: 'comparison',
          left: {
            title: 'Good: Use DECIMAL for money',
            content: '<code>price DECIMAL(10,2)</code><br>Stores exact values: 19.99 is always 19.99',
          },
          right: {
            title: 'Bad: Use FLOAT for money',
            content: '<code>price FLOAT</code><br>Approximate: 19.99 might become 19.989999...',
          },
        },
        {
          type: 'sandbox',
          description: 'See what types of data are in our tables:',
          defaultQuery: "SELECT id, name, salary, hire_date FROM employees LIMIT 3;",
        },
      ],
    },
    {
      id: 4,
      moduleId: 1,
      title: 'Your First SELECT',
      slug: 'first-select',
      content: [
        {
          type: 'text',
          html: `<h2>The SELECT Statement</h2>
<p><code>SELECT</code> is the most important SQL statement — it retrieves data from tables. You'll use it in almost every query.</p>`,
        },
        {
          type: 'code',
          title: 'Basic syntax',
          sql: 'SELECT column1, column2 FROM table_name;',
        },
        {
          type: 'text',
          html: `<h3>Select All Columns</h3>
<p>Use <code>*</code> to select all columns. Handy for exploration, but avoid it in production code (it's slower and fragile).</p>`,
        },
        {
          type: 'sandbox',
          description: 'Select all columns from the departments table:',
          defaultQuery: "SELECT * FROM departments;",
        },
        {
          type: 'text',
          html: `<h3>Select Specific Columns</h3>
<p>Always prefer naming your columns. It's faster, clearer, and won't break if the table structure changes.</p>`,
        },
        {
          type: 'sandbox',
          description: 'Select just names and salaries:',
          defaultQuery: "SELECT name, salary FROM employees LIMIT 10;",
        },
        {
          type: 'callout',
          calloutType: 'tip',
          html: `<code>LIMIT N</code> restricts the output to N rows. Essential when exploring large tables — you don't want to dump millions of rows!`,
        },
        {
          type: 'text',
          html: `<h3>Column Aliases</h3>
<p>Use <code>AS</code> to rename columns in the output:</p>`,
        },
        {
          type: 'sandbox',
          description: 'Aliases make output more readable:',
          defaultQuery: "SELECT name AS employee_name, salary AS annual_salary\nFROM employees\nLIMIT 5;",
        },
      ],
    },
    {
      id: 5,
      moduleId: 1,
      title: 'DISTINCT and Expressions',
      slug: 'distinct-expressions',
      content: [
        {
          type: 'text',
          html: `<h2>Removing Duplicates with DISTINCT</h2>
<p><code>SELECT DISTINCT</code> removes duplicate rows from the result. Useful for finding unique values in a column.</p>`,
        },
        {
          type: 'sandbox',
          description: 'What countries do our customers come from?',
          defaultQuery: "SELECT DISTINCT country FROM customers ORDER BY country;",
        },
        {
          type: 'text',
          html: `<h3>Expressions in SELECT</h3>
<p>You can use calculations and expressions in your SELECT. MySQL evaluates them for each row.</p>`,
        },
        {
          type: 'sandbox',
          description: 'Calculate monthly salary from annual salary:',
          defaultQuery: "SELECT name, salary, ROUND(salary / 12, 2) AS monthly_salary\nFROM employees\nLIMIT 5;",
        },
        {
          type: 'text',
          html: `<h3>String Concatenation</h3>
<p>In MySQL, use <code>CONCAT()</code> to join strings together:</p>`,
        },
        {
          type: 'sandbox',
          description: 'Combine name and department_id:',
          defaultQuery: "SELECT name || ' (Dept ' || department_id || ')' AS employee_info\nFROM employees\nLIMIT 5;",
        },
        {
          type: 'callout',
          calloutType: 'mysql',
          html: `In MySQL you'd write <code>CONCAT(name, ' (Dept ', department_id, ')')</code>. Our sandbox uses SQLite's <code>||</code> operator for concatenation, which also works in many databases. MySQL supports <code>||</code> too if <code>PIPES_AS_CONCAT</code> mode is enabled.`,
        },
      ],
    },
    {
      id: 6,
      moduleId: 1,
      title: 'String Functions',
      slug: 'string-functions',
      content: [
        {
          type: 'text',
          html: `<h2>Working with Text</h2>
<p>MySQL provides many functions for manipulating strings:</p>
<ul>
<li><code>UPPER(str)</code> / <code>LOWER(str)</code> — change case</li>
<li><code>LENGTH(str)</code> — number of characters</li>
<li><code>TRIM(str)</code> — remove leading/trailing spaces</li>
<li><code>SUBSTR(str, start, len)</code> — extract a substring</li>
<li><code>REPLACE(str, from, to)</code> — replace occurrences</li>
<li><code>INSTR(str, search)</code> — find position of substring</li>
</ul>`,
        },
        {
          type: 'sandbox', description: 'Try string functions:',
          defaultQuery: `SELECT
  name,
  UPPER(name) AS upper_name,
  LENGTH(name) AS name_len,
  SUBSTR(name, 1, INSTR(name, ' ') - 1) AS first_name
FROM employees
LIMIT 5;`,
        },
        {
          type: 'sandbox', description: 'Extract email domain:',
          defaultQuery: `SELECT
  email,
  SUBSTR(email, INSTR(email, '@') + 1) AS domain
FROM employees
LIMIT 5;`,
        },
      ],
    },
    {
      id: 7,
      moduleId: 1,
      title: 'Date & Numeric Functions',
      slug: 'date-numeric-functions',
      content: [
        {
          type: 'text',
          html: `<h2>Date Functions</h2>
<p>MySQL has powerful date manipulation functions:</p>
<ul>
<li><code>DATE('2024-01-15 14:30:00')</code> — extract date part</li>
<li><code>STRFTIME('%Y', date)</code> — format/extract (SQLite) / <code>YEAR(date)</code>, <code>MONTH(date)</code> in MySQL</li>
<li><code>DATE(date, '+1 month')</code> — date arithmetic (SQLite) / <code>DATE_ADD(date, INTERVAL 1 MONTH)</code> in MySQL</li>
<li><code>julianday(d2) - julianday(d1)</code> — days between (SQLite) / <code>DATEDIFF(d2, d1)</code> in MySQL</li>
</ul>`,
        },
        {
          type: 'sandbox', description: 'Employee tenure in years:',
          defaultQuery: `SELECT
  name,
  hire_date,
  ROUND((julianday('2026-04-19') - julianday(hire_date)) / 365.25, 1) AS years_employed
FROM employees
ORDER BY hire_date
LIMIT 10;`,
        },
        {
          type: 'text',
          html: `<h2>Numeric Functions</h2>
<ul>
<li><code>ROUND(n, decimals)</code> — round to N decimal places</li>
<li><code>CEIL(n)</code> / <code>FLOOR(n)</code> — round up / down</li>
<li><code>ABS(n)</code> — absolute value</li>
<li><code>n % m</code> or <code>MOD(n, m)</code> — modulo (remainder)</li>
</ul>`,
        },
        {
          type: 'sandbox', description: 'Numeric function examples:',
          defaultQuery: `SELECT
  price,
  ROUND(price, 0) AS rounded,
  CAST(price AS INTEGER) AS truncated,
  ABS(price - 50) AS dist_from_50,
  price * 1.21 AS with_vat,
  ROUND(price * 1.21, 2) AS vat_rounded
FROM products
LIMIT 8;`,
        },
        {
          type: 'callout', calloutType: 'mysql',
          html: `<strong>MySQL date functions</strong> differ from SQLite. MySQL uses <code>YEAR()</code>, <code>MONTH()</code>, <code>DATEDIFF()</code>, <code>DATE_ADD()</code>, <code>DATE_FORMAT()</code>. SQLite uses <code>STRFTIME()</code> and <code>julianday()</code>. The concepts are identical — only syntax differs.`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 1,
      moduleId: 1,
      title: 'Select Employee Names',
      description: '<p>Write a query to get all employee <strong>names</strong> from the <code>employees</code> table.</p>',
      difficulty: 'easy',
      starterQuery: '-- Get all employee names\nSELECT ',
      expectedQuery: 'SELECT name FROM employees;',
      expectedResult: {
        columns: ['name'],
        values: [
          ['Alice Johnson'], ['Bob Smith'], ['Carol Davis'], ['David Wilson'], ['Eva Martinez'],
          ['Frank Brown'], ['Grace Lee'], ['Henry Taylor'], ['Iris Chen'], ['Jack Anderson'],
          ['Kate Thomas'], ['Liam Moore'], ['Mia Jackson'], ['Noah White'], ['Olivia Harris'],
          ['Peter Clark'], ['Quinn Lewis'], ['Rachel Robinson'], ['Sam Walker'], ['Tina Hall'],
          ['Uma Allen'], ['Victor Young'], ['Wendy King'], ['Xavier Wright'], ['Yara Scott'],
          ['Zach Green'], ['Amy Baker'], ['Brian Adams'], ['Chloe Turner'], ['Daniel Phillips'],
          ['Elena Campbell'], ['Felix Parker'], ['Gina Evans'], ['Hugo Edwards'], ['Isla Collins'],
          ['James Stewart'], ['Kelly Morris'], ['Leo Rogers'], ['Maya Reed'], ['Nathan Cook'],
          ['Ophelia Morgan'], ['Paul Bell'], ['Rosa Murphy'], ['Steve Bailey'], ['Tara Rivera'],
          ['Ulrich Cooper'], ['Vera Richardson'], ['Will Cox'], ['Xena Howard'], ['Yuri Ward'],
        ],
      },
      hints: [
        'Use SELECT column_name FROM table_name',
        'The column you need is called "name"',
        'SELECT name FROM employees;',
      ],
      validationMode: 'unordered',
    },
    {
      id: 2,
      moduleId: 1,
      title: 'Department List',
      description: '<p>Write a query to show the <strong>name</strong> and <strong>location</strong> of all departments.</p>',
      difficulty: 'easy',
      starterQuery: '-- Get department names and locations\n',
      expectedQuery: 'SELECT name, location FROM departments;',
      expectedResult: {
        columns: ['name', 'location'],
        values: [
          ['Engineering', 'New York'], ['Marketing', 'London'], ['Sales', 'New York'],
          ['HR', 'Berlin'], ['Finance', 'Tokyo'], ['Operations', 'Madrid'],
          ['Support', 'Toronto'], ['Legal', 'Paris'], ['Product', 'Singapore'],
          ['Design', 'Sydney'],
        ],
      },
      hints: [
        'Select two columns from the departments table',
        'SELECT name, location FROM ...',
        'SELECT name, location FROM departments;',
      ],
      validationMode: 'unordered',
    },
    {
      id: 3,
      moduleId: 1,
      title: 'Unique Countries',
      description: '<p>Write a query to list all <strong>unique countries</strong> where our customers are located. Use <code>DISTINCT</code> to remove duplicates.</p>',
      difficulty: 'easy',
      starterQuery: '-- Get unique customer countries\n',
      expectedQuery: 'SELECT DISTINCT country FROM customers;',
      expectedResult: {
        columns: ['country'],
        values: [
          ['USA'], ['UK'], ['Germany'], ['Japan'], ['Switzerland'],
          ['Australia'], ['Sweden'], ['Spain'], ['Canada'], ['Singapore'],
          ['France'], ['UAE'], ['China'],
        ],
      },
      hints: [
        'Use SELECT DISTINCT to remove duplicates',
        'The column is "country" in the "customers" table',
        'SELECT DISTINCT country FROM customers;',
      ],
      validationMode: 'unordered',
    },
  ],
}
