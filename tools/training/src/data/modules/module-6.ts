import type { Module } from '../../types'

export const module6: Module = {
  id: 6,
  title: 'Data Modification',
  slug: 'data-modification',
  description: 'INSERT, UPDATE, DELETE, transactions, and MySQL-specific UPSERT patterns.',
  icon: 'PenTool',
  color: '#1ABC9C',
  lessons: [
    {
      id: 1, moduleId: 6, title: 'INSERT', slug: 'insert',
      content: [
        {
          type: 'text',
          html: `<h2>Adding Data with INSERT</h2>
<p><code>INSERT</code> adds new rows to a table. There are several forms:</p>`,
        },
        { type: 'code', title: 'Single row', sql: `INSERT INTO departments (id, name, budget, location)
VALUES (11, 'Research', 550000, 'Boston');` },
        {
          type: 'sandbox', description: 'Try inserting a new department and querying it:',
          defaultQuery: `INSERT INTO departments VALUES (11, 'Research', 550000, 'Boston');
SELECT * FROM departments WHERE id = 11;`,
        },
        {
          type: 'callout', calloutType: 'tip',
          html: `Data changes in the sandbox are <strong>temporary</strong> — they only live in your browser's memory. Refreshing the page or clicking "Reset Database" restores the original data.`,
        },
        { type: 'text', html: `<h3>Bulk INSERT</h3><p>Insert multiple rows in one statement for better performance:</p>` },
        {
          type: 'sandbox', description: 'Insert multiple products at once:',
          defaultQuery: `INSERT INTO products VALUES
  (21, 'Webcam HD', 'Electronics', 69.99, 150),
  (22, 'Desk Organizer', 'Home', 19.99, 300),
  (23, 'Notebook Set', 'Books', 14.99, 500);

SELECT * FROM products WHERE id > 20;`,
        },
      ],
    },
    {
      id: 2, moduleId: 6, title: 'UPDATE', slug: 'update',
      content: [
        {
          type: 'text',
          html: `<h2>Modifying Data with UPDATE</h2>
<p><code>UPDATE</code> changes existing row values. <strong>Always use a WHERE clause</strong> — without it, every row gets updated!</p>`,
        },
        { type: 'code', title: 'Syntax', sql: `UPDATE table SET column = value WHERE condition;` },
        {
          type: 'callout', calloutType: 'warning',
          html: `<strong>Danger!</strong> <code>UPDATE employees SET salary = 0;</code> without WHERE sets <em>everyone's</em> salary to zero. Always test your WHERE clause with a SELECT first.`,
        },
        {
          type: 'sandbox', description: 'Give Engineering (dept 1) a 10% raise:',
          defaultQuery: `-- Check before:
SELECT name, salary FROM employees WHERE department_id = 1;

-- Apply raise:
-- UPDATE employees SET salary = salary * 1.1 WHERE department_id = 1;

-- Check after (uncomment UPDATE above to try):
-- SELECT name, salary FROM employees WHERE department_id = 1;`,
        },
        { type: 'text', html: `<h3>UPDATE with Expressions</h3><p>You can use calculations, functions, and even subqueries in SET:</p>` },
        {
          type: 'sandbox', description: 'Update product stock after a sale:',
          defaultQuery: `SELECT name, stock FROM products WHERE id = 2;

UPDATE products SET stock = stock - 5 WHERE id = 2;

SELECT name, stock FROM products WHERE id = 2;`,
        },
      ],
    },
    {
      id: 3, moduleId: 6, title: 'DELETE', slug: 'delete',
      content: [
        {
          type: 'text',
          html: `<h2>Removing Data with DELETE</h2>
<p><code>DELETE</code> removes rows from a table. Like UPDATE, <strong>always use WHERE</strong>.</p>`,
        },
        { type: 'code', title: 'Syntax', sql: `DELETE FROM table WHERE condition;` },
        {
          type: 'comparison',
          left: { title: 'DELETE', content: 'Removes specific rows.<br>Can use WHERE clause.<br>Can be rolled back in a transaction.<br>Fires triggers.' },
          right: { title: 'TRUNCATE', content: 'Removes ALL rows instantly.<br>No WHERE clause.<br>Cannot be rolled back (DDL).<br>Does not fire triggers.<br>Resets AUTO_INCREMENT.' },
        },
        {
          type: 'sandbox', description: 'Delete cancelled orders:',
          defaultQuery: `-- Check how many cancelled orders exist:
SELECT COUNT(*) AS cancelled_count FROM orders WHERE status = 'cancelled';

-- Delete them:
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled');
DELETE FROM orders WHERE status = 'cancelled';

-- Verify:
SELECT COUNT(*) AS remaining FROM orders;`,
        },
        {
          type: 'callout', calloutType: 'warning',
          html: `<strong>Foreign key constraint</strong>: You can't delete a row if other rows reference it. Delete the referencing rows first (order_items before orders), or use <code>ON DELETE CASCADE</code> in the FK definition.`,
        },
      ],
    },
    {
      id: 4, moduleId: 6, title: 'Transactions', slug: 'transactions',
      content: [
        {
          type: 'animation',
          animation: 'TransactionAnimation',
        },
        {
          type: 'text',
          html: `<h2>Transactions — All or Nothing</h2>
<p>A <strong>transaction</strong> groups multiple statements into a single atomic unit. Either <em>all</em> succeed, or <em>none</em> do. This prevents partial updates that leave data in an inconsistent state.</p>
<h3>ACID Properties</h3>
<ul>
<li><strong>Atomicity</strong> — all changes commit together, or all roll back</li>
<li><strong>Consistency</strong> — database moves from one valid state to another</li>
<li><strong>Isolation</strong> — concurrent transactions don't interfere</li>
<li><strong>Durability</strong> — committed changes survive crashes</li>
</ul>`,
        },
        { type: 'code', title: 'Transaction syntax', sql: `BEGIN TRANSACTION;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;  -- or ROLLBACK; to undo everything` },
        {
          type: 'sandbox', description: 'Transaction example — transfer budget between departments:',
          defaultQuery: `-- Transfer $100K from Engineering to Design
BEGIN TRANSACTION;

UPDATE departments SET budget = budget - 100000 WHERE id = 1;
UPDATE departments SET budget = budget + 100000 WHERE id = 10;

COMMIT;

SELECT name, budget FROM departments WHERE id IN (1, 10);`,
        },
        {
          type: 'callout', calloutType: 'mysql',
          html: `<strong>MySQL/InnoDB</strong>: Every single statement is implicitly a transaction (autocommit mode). Use <code>START TRANSACTION</code> (or <code>BEGIN</code>) to group multiple statements. InnoDB also supports <code>SAVEPOINT</code> for partial rollbacks.`,
        },
        { type: 'text', html: `<h3>MySQL-Specific: ON DUPLICATE KEY UPDATE</h3>
<p>MySQL's "upsert" — insert a row, but if the primary key already exists, update it instead:</p>` },
        { type: 'code', title: 'MySQL UPSERT syntax', sql: `-- MySQL syntax (not available in our SQLite sandbox):
INSERT INTO products (id, name, category, price, stock)
VALUES (1, 'Laptop Pro 15', 'Electronics', 1349.99, 145)
ON DUPLICATE KEY UPDATE
  price = VALUES(price),
  stock = VALUES(stock);` },
        {
          type: 'callout', calloutType: 'mysql',
          html: `<code>ON DUPLICATE KEY UPDATE</code> is MySQL-specific. PostgreSQL uses <code>ON CONFLICT ... DO UPDATE</code>. SQLite uses <code>INSERT OR REPLACE</code>. The concept is the same — atomically insert or update.`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 1, moduleId: 6, title: 'Insert a Department',
      description: '<p>Insert a new department: id=<strong>11</strong>, name=<strong>"Research"</strong>, budget=<strong>750000</strong>, location=<strong>"Boston"</strong>. Then SELECT all columns from departments where id = 11.</p>',
      difficulty: 'easy',
      starterQuery: "-- Insert Research department, then query it\n",
      expectedQuery: "INSERT INTO departments VALUES (11, 'Research', 750000, 'Boston'); SELECT * FROM departments WHERE id = 11;",
      expectedResult: {
        columns: ['id', 'name', 'budget', 'location'],
        values: [[11, 'Research', 750000, 'Boston']],
      },
      hints: [
        "INSERT INTO departments VALUES (id, 'name', budget, 'location')",
        'Run both statements: INSERT then SELECT',
        "INSERT INTO departments VALUES (11, 'Research', 750000, 'Boston'); SELECT * FROM departments WHERE id = 11;",
      ],
      validationMode: 'exact',
    },
    {
      id: 2, moduleId: 6, title: 'Give a Raise',
      description: '<p>Give all employees in the <strong>Support department (id=7)</strong> a <strong>15% raise</strong>. Then show their <code>name</code> and new <code>salary</code>.</p>',
      difficulty: 'medium',
      starterQuery: '-- 15% raise for Support, then show results\n',
      expectedQuery: 'UPDATE employees SET salary = salary * 1.15 WHERE department_id = 7; SELECT name, salary FROM employees WHERE department_id = 7;',
      expectedResult: {
        columns: ['name', 'salary'],
        values: [
          ['Olivia Harris', 74750.0], ['Peter Clark', 71300.0],
          ['Gina Evans', 73600.0], ['Steve Bailey', 72450.0],
        ],
      },
      hints: [
        'UPDATE employees SET salary = salary * 1.15 WHERE ...',
        'department_id = 7 is the Support department',
        'UPDATE employees SET salary = salary * 1.15 WHERE department_id = 7; SELECT name, salary FROM employees WHERE department_id = 7;',
      ],
      validationMode: 'unordered',
    },
    {
      id: 3, moduleId: 6, title: 'Delete Cancelled Orders',
      description: '<p>Delete all <strong>cancelled</strong> orders (and their order items first). Then show the <code>COUNT</code> of remaining orders as <code>remaining_orders</code>.</p>',
      difficulty: 'medium',
      starterQuery: "-- Delete cancelled orders and their items\n",
      expectedQuery: "DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled'); DELETE FROM orders WHERE status = 'cancelled'; SELECT COUNT(*) AS remaining_orders FROM orders;",
      expectedResult: {
        columns: ['remaining_orders'],
        values: [[37]],
      },
      hints: [
        "Delete order_items first (foreign key), then orders",
        "WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled')",
        "DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled'); DELETE FROM orders WHERE status = 'cancelled'; SELECT COUNT(*) AS remaining_orders FROM orders;",
      ],
      validationMode: 'exact',
    },
    {
      id: 4, moduleId: 6, title: 'Budget Transfer',
      description: '<p>Transfer <strong>$200,000</strong> from Engineering (id=1) to Design (id=10) using a transaction. Then show both departments\' <code>name</code> and <code>budget</code>.</p>',
      difficulty: 'medium',
      starterQuery: "-- Transfer budget using a transaction\n",
      expectedQuery: "BEGIN TRANSACTION; UPDATE departments SET budget = budget - 200000 WHERE id = 1; UPDATE departments SET budget = budget + 200000 WHERE id = 10; COMMIT; SELECT name, budget FROM departments WHERE id IN (1, 10);",
      expectedResult: {
        columns: ['name', 'budget'],
        values: [['Engineering', 1300000], ['Design', 850000]],
      },
      hints: [
        'BEGIN TRANSACTION; ... COMMIT; wraps the updates',
        'Subtract from id=1, add to id=10',
        'BEGIN TRANSACTION; UPDATE departments SET budget = budget - 200000 WHERE id = 1; UPDATE departments SET budget = budget + 200000 WHERE id = 10; COMMIT; SELECT name, budget FROM departments WHERE id IN (1, 10);',
      ],
      validationMode: 'exact',
    },
  ],
}
