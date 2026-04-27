import type { Module } from '../../types'

export const module10: Module = {
  id: 10,
  title: 'SQL Injection & Best Practices',
  slug: 'sql-injection',
  description: 'SQL injection attacks, parameterized queries, prepared statements, and security best practices for production.',
  icon: 'Shield',
  color: '#C0392B',
  lessons: [
    {
      id: 1, moduleId: 10, title: 'What is SQL Injection?', slug: 'sql-injection-intro',
      content: [
        {
          type: 'text',
          html: `<h2>SQL Injection — The #1 Web Security Vulnerability</h2>
<p>SQL injection (SQLi) happens when user input is inserted directly into a SQL query string, allowing an attacker to modify the query's logic. It's been the #1 web application vulnerability for over two decades.</p>
<h3>How It Works</h3>
<p>Imagine a login form that builds a query like this:</p>`,
        },
        {
          type: 'code', title: 'Vulnerable code (NEVER do this)',
          sql: `-- Backend code builds this query from user input:
-- username = "admin"
-- password = "' OR '1'='1"

SELECT * FROM users
WHERE username = 'admin'
AND password = '' OR '1'='1';

-- The OR '1'='1' is always true!
-- Attacker logs in without knowing the password.`,
        },
        {
          type: 'text',
          html: `<h3>What Attackers Can Do</h3>
<ul>
<li><strong>Bypass authentication</strong> — log in as any user</li>
<li><strong>Read all data</strong> — dump entire tables (UNION-based injection)</li>
<li><strong>Modify data</strong> — UPDATE/DELETE records</li>
<li><strong>Drop tables</strong> — destroy data completely</li>
<li><strong>Execute system commands</strong> — in some configurations</li>
</ul>`,
        },
        {
          type: 'sandbox', description: 'See how injection works — the second query bypasses the password check:',
          defaultQuery: `-- Normal query: checks both username and password
SELECT * FROM employees WHERE name = 'Alice Johnson' AND department_id = 1;

-- Injected: the OR 1=1 makes it return ALL rows
SELECT * FROM employees WHERE name = 'Alice Johnson' OR 1=1;`,
        },
        {
          type: 'callout', calloutType: 'warning',
          html: `<strong>Real-world impact</strong>: SQL injection has caused massive breaches — Yahoo (3 billion accounts), Equifax (147 million), Sony, LinkedIn, and thousands more. It's preventable with parameterized queries.`,
        },
      ],
    },
    {
      id: 2, moduleId: 10, title: 'Preventing SQL Injection', slug: 'preventing-injection',
      content: [
        {
          type: 'text',
          html: `<h2>The Fix: Parameterized Queries</h2>
<p>Never concatenate user input into SQL strings. Use <strong>parameterized queries</strong> (also called prepared statements) where user input is passed as parameters, not embedded in the SQL text.</p>`,
        },
        {
          type: 'comparison',
          left: {
            title: 'VULNERABLE (string concatenation)',
            content: '<pre>query = "SELECT * FROM users WHERE name = \'" + username + "\'";</pre><br>User input becomes part of the SQL syntax.',
          },
          right: {
            title: 'SAFE (parameterized query)',
            content: '<pre>query = "SELECT * FROM users WHERE name = ?";\ndb.execute(query, [username]);</pre><br>User input is always treated as data, never SQL.',
          },
        },
        {
          type: 'code', title: 'Parameterized queries in different languages',
          sql: `-- MySQL Prepared Statement (native SQL)
PREPARE stmt FROM 'SELECT * FROM users WHERE email = ?';
SET @email = 'user@example.com';
EXECUTE stmt USING @email;

-- Python (mysql-connector)
-- cursor.execute("SELECT * FROM users WHERE email = %s", (email,))

-- Node.js (mysql2)
-- connection.execute("SELECT * FROM users WHERE email = ?", [email])

-- PHP (PDO)
-- $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email");
-- $stmt->execute(['email' => $email]);

-- Java (JDBC)
-- PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE email = ?");
-- ps.setString(1, email);`,
        },
        {
          type: 'callout', calloutType: 'tip',
          html: `<strong>Rule of thumb</strong>: If you see string concatenation building a SQL query in any codebase, it's almost certainly a security vulnerability. Parameterized queries are the only reliable defense.`,
        },
        {
          type: 'text',
          html: `<h3>Additional Defenses (Defense in Depth)</h3>
<ul>
<li><strong>Input validation</strong> — reject unexpected characters (but don't rely on this alone)</li>
<li><strong>Least privilege</strong> — app database user should only have SELECT/INSERT/UPDATE, never DROP or ALTER</li>
<li><strong>WAF</strong> — Web Application Firewall can block common injection patterns</li>
<li><strong>ORM</strong> — Object-Relational Mappers (like SQLAlchemy, Hibernate, Eloquent) use parameterized queries by default</li>
<li><strong>Escape output</strong> — even if data is compromised, escape it when displaying (prevents XSS)</li>
</ul>`,
        },
      ],
    },
    {
      id: 3, moduleId: 10, title: 'Production SQL Best Practices', slug: 'best-practices',
      content: [
        {
          type: 'text',
          html: `<h2>Writing Production-Quality SQL</h2>
<h3>1. Always Use Transactions for Multi-Statement Operations</h3>
<p>If your operation involves multiple INSERTs or UPDATEs that must succeed together, wrap them in a transaction.</p>

<h3>2. Test WHERE Before UPDATE/DELETE</h3>
<p>Run a SELECT with the same WHERE clause first. Verify it returns the rows you expect before running the destructive statement.</p>`,
        },
        {
          type: 'code', title: 'Safe UPDATE pattern',
          sql: `-- Step 1: Verify what will be affected
SELECT id, name, salary FROM employees WHERE department_id = 3;
-- Check: is this the right set of rows?

-- Step 2: Run the UPDATE
UPDATE employees SET salary = salary * 1.1 WHERE department_id = 3;

-- Step 3: Verify the result
SELECT id, name, salary FROM employees WHERE department_id = 3;`,
        },
        {
          type: 'text',
          html: `<h3>3. Use LIMIT with DELETE</h3>
<p>When deleting many rows, use LIMIT to batch the operation. This prevents long-running locks:</p>`,
        },
        {
          type: 'code', title: 'Batched DELETE',
          sql: `-- Delete in batches of 1000 to avoid locking the table
DELETE FROM logs WHERE created_at < '2023-01-01' LIMIT 1000;
-- Repeat until 0 rows affected`,
        },
        {
          type: 'text',
          html: `<h3>4. Never SELECT * in Production Code</h3>
<p>Always name your columns. <code>SELECT *</code> is slow (reads unnecessary data), fragile (breaks if columns are added/removed), and unclear (what columns does this query return?).</p>

<h3>5. Add Indexes Before They're Needed</h3>
<p>Index columns you filter (<code>WHERE</code>), join (<code>ON</code>), or sort (<code>ORDER BY</code>) by. Adding an index to a large production table can take minutes to hours.</p>

<h3>6. Monitor Slow Queries</h3>`,
        },
        {
          type: 'code', title: 'MySQL slow query log',
          sql: `-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- Log queries over 1 second

-- Find slow queries
-- Check /var/lib/mysql/hostname-slow.log
-- Or use: SHOW FULL PROCESSLIST;`,
        },
        {
          type: 'callout', calloutType: 'tip',
          html: `Use our <a href="/tools/explain/">MySQL EXPLAIN Analyzer</a> to find performance issues before they hit production. Paste your EXPLAIN output and get automatic optimization recommendations.`,
        },
      ],
    },
    {
      id: 4, moduleId: 10, title: 'Backup & Recovery', slug: 'backup-recovery',
      content: [
        {
          type: 'text',
          html: `<h2>Protecting Your Data</h2>
<h3>MySQL Backup Methods</h3>
<ul>
<li><strong>mysqldump</strong> — logical backup (SQL statements). Simple, portable, slow on large databases.</li>
<li><strong>MySQL Enterprise Backup / Percona XtraBackup</strong> — physical backup (copy data files). Fast, supports hot backups.</li>
<li><strong>Replication</strong> — real-time copy to a secondary server. Not a backup (deletes replicate too!).</li>
<li><strong>Point-in-time recovery</strong> — binary logs let you replay transactions to any point.</li>
</ul>`,
        },
        {
          type: 'code', title: 'mysqldump basics',
          sql: `-- Backup a single database
-- $ mysqldump -u root -p mydb > backup.sql

-- Backup all databases
-- $ mysqldump -u root -p --all-databases > full_backup.sql

-- Backup with compression
-- $ mysqldump -u root -p mydb | gzip > backup.sql.gz

-- Restore
-- $ mysql -u root -p mydb < backup.sql`,
        },
        {
          type: 'text',
          html: `<h3>Backup Best Practices</h3>
<ul>
<li><strong>Test your restores</strong> — a backup you've never restored is not a backup</li>
<li><strong>Automate</strong> — schedule backups with cron, never rely on manual runs</li>
<li><strong>3-2-1 rule</strong> — 3 copies, 2 different media, 1 offsite</li>
<li><strong>Monitor</strong> — alert if backups fail or are older than expected</li>
<li><strong>Encrypt</strong> — especially for offsite/cloud backups</li>
</ul>`,
        },
        {
          type: 'callout', calloutType: 'mysql',
          html: `<strong>Need help with MySQL backups?</strong> ReliaDB provides automated backup solutions, replication setup, and disaster recovery planning. <a href="/contact.html">Book a free assessment</a>.`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 1, moduleId: 10, title: 'Spot the Injection',
      description: `<p>This query is vulnerable to SQL injection: <code>SELECT * FROM employees WHERE name = '&lt;input&gt;'</code>. If the input is <code>' OR 1=1 --</code>, the attacker bypasses the filter. Run the pre-filled query to see what happens.</p>`,
      difficulty: 'easy',
      starterQuery: "-- Run the injected query to see the damage\nSELECT * FROM employees WHERE name = '' OR 1=1;",
      expectedQuery: "SELECT * FROM employees WHERE name = '' OR 1=1;",
      expectedResult: {
        columns: ['id', 'name', 'email', 'department_id', 'salary', 'hire_date', 'manager_id'],
        values: [], // will have 50 rows
      },
      hints: [
        "The injected query returns ALL employees because OR 1=1 is always true",
        "Just run the pre-filled query to see the result",
        "SELECT * FROM employees WHERE name = '' OR 1=1;",
      ],
      validationMode: 'contains',
    },
    {
      id: 2, moduleId: 10, title: 'Safe UPDATE Pattern',
      description: '<p>Practice the safe UPDATE pattern: first SELECT to verify, then UPDATE. Give all <strong>Design department (id=10)</strong> employees a <strong>$5,000 raise</strong>. Show the <code>name</code> and new <code>salary</code> after the update.</p>',
      difficulty: 'medium',
      starterQuery: "-- Step 1: Verify (run this first to check)\n-- SELECT name, salary FROM employees WHERE department_id = 10;\n\n-- Step 2: Update\nUPDATE employees SET salary = salary + 5000 WHERE department_id = 10;\n\n-- Step 3: Verify result\nSELECT name, salary FROM employees WHERE department_id = 10;",
      expectedQuery: "UPDATE employees SET salary = salary + 5000 WHERE department_id = 10; SELECT name, salary FROM employees WHERE department_id = 10;",
      expectedResult: {
        columns: ['name', 'salary'],
        values: [
          ['Uma Allen', 95000], ['Victor Young', 90000], ['Isla Collins', 93000], ['Tara Rivera', 92000],
        ],
      },
      hints: [
        'UPDATE employees SET salary = salary + 5000 WHERE department_id = 10',
        'Follow with SELECT to verify the results',
        'UPDATE employees SET salary = salary + 5000 WHERE department_id = 10; SELECT name, salary FROM employees WHERE department_id = 10;',
      ],
      validationMode: 'unordered',
    },
    {
      id: 3, moduleId: 10, title: 'Delete with Verification',
      description: `<p>Practice safe deletion: delete all <strong>cancelled orders</strong> and their order items. First delete the order_items (FK dependency), then the orders. Finally, show the remaining order count as <code>remaining_orders</code>.</p>`,
      difficulty: 'medium',
      starterQuery: "-- Safe delete: items first, then orders\n",
      expectedQuery: "DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled'); DELETE FROM orders WHERE status = 'cancelled'; SELECT COUNT(*) AS remaining_orders FROM orders;",
      expectedResult: {
        columns: ['remaining_orders'],
        values: [[37]],
      },
      hints: [
        "Delete order_items first because they reference orders (FK)",
        "WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled')",
        "DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled'); DELETE FROM orders WHERE status = 'cancelled'; SELECT COUNT(*) AS remaining_orders FROM orders;",
      ],
      validationMode: 'exact',
    },
    {
      id: 4, moduleId: 10, title: 'Transaction Rollback',
      description: `<p>Start a transaction, set Engineering (id=1) budget to <strong>$0</strong>, then <strong>ROLLBACK</strong>. Verify the budget is still $1,500,000. Show <code>budget</code> from departments where id=1.</p>`,
      difficulty: 'medium',
      starterQuery: "-- Transaction with rollback\n",
      expectedQuery: "BEGIN TRANSACTION; UPDATE departments SET budget = 0 WHERE id = 1; ROLLBACK; SELECT budget FROM departments WHERE id = 1;",
      expectedResult: {
        columns: ['budget'],
        values: [[1500000]],
      },
      hints: [
        'BEGIN TRANSACTION starts, ROLLBACK undoes all changes',
        'After ROLLBACK, the budget should be unchanged',
        "BEGIN TRANSACTION; UPDATE departments SET budget = 0 WHERE id = 1; ROLLBACK; SELECT budget FROM departments WHERE id = 1;",
      ],
      validationMode: 'exact',
    },
    {
      id: 5, moduleId: 10, title: 'Verify Before DELETE',
      description: `<p>Practice the safe pattern: first run a SELECT to check which rows will be affected, then run the DELETE. Delete employees from the <strong>Support department (id=7)</strong> who earn <strong>less than $65,000</strong>. Show the remaining Support employees (<code>name</code> and <code>salary</code>).</p>`,
      difficulty: 'hard',
      starterQuery: "-- Step 1: Check what will be deleted\n-- SELECT name, salary FROM employees WHERE department_id = 7 AND salary < 65000;\n\n-- Step 2: Delete\n",
      expectedQuery: "DELETE FROM employees WHERE department_id = 7 AND salary < 65000; SELECT name, salary FROM employees WHERE department_id = 7 ORDER BY salary DESC;",
      expectedResult: {
        columns: ['name', 'salary'],
        values: [
          ['Olivia Harris', 65000],
        ],
      },
      hints: [
        'DELETE FROM employees WHERE department_id = 7 AND salary < 65000',
        'Peter Clark ($62K), Steve Bailey ($63K), and Gina Evans ($64K) should be deleted',
        "DELETE FROM employees WHERE department_id = 7 AND salary < 65000; SELECT name, salary FROM employees WHERE department_id = 7 ORDER BY salary DESC;",
      ],
      validationMode: 'exact',
    },
  ],
}
