import type { Module } from '../../types'

export const module7: Module = {
  id: 7,
  title: 'Schema Design',
  slug: 'schema-design',
  description: 'CREATE TABLE, primary keys, foreign keys, indexes, normalization, and utf8mb4.',
  icon: 'Layout',
  color: '#2C3E50',
  lessons: [
    {
      id: 1, moduleId: 7, title: 'CREATE TABLE', slug: 'create-table',
      content: [
        { type: 'text', html: `<h2>Creating Tables</h2>
<p>Tables are created with <code>CREATE TABLE</code>. Each column gets a name, a data type, and optional constraints.</p>` },
        { type: 'code', title: 'MySQL syntax', sql: `CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'editor', 'viewer') DEFAULT 'viewer',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);` },
        { type: 'sandbox', description: 'Create a table and insert data:', defaultQuery: `CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK(role IN ('admin', 'editor', 'viewer')),
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO users (id, email, name, role) VALUES
  (1, 'admin@example.com', 'Admin User', 'admin'),
  (2, 'editor@example.com', 'Content Editor', 'editor'),
  (3, 'viewer@example.com', 'Basic User', 'viewer');

SELECT * FROM users;` },
        { type: 'callout', calloutType: 'mysql', html: `<strong>MySQL vs SQLite</strong>: MySQL uses <code>AUTO_INCREMENT</code> and <code>ENUM</code>. Our sandbox uses SQLite equivalents: <code>INTEGER PRIMARY KEY</code> (auto-increments) and <code>CHECK</code> constraints.` },
      ],
    },
    {
      id: 2, moduleId: 7, title: 'Primary Keys & AUTO_INCREMENT', slug: 'primary-keys',
      content: [
        { type: 'text', html: `<h2>Primary Keys</h2>
<p>A <strong>primary key</strong> uniquely identifies each row. No two rows can share the same PK value, and it can never be NULL.</p>
<h3>AUTO_INCREMENT</h3>
<p>MySQL automatically generates a unique integer for each new row. You don't specify the value on INSERT — MySQL handles it.</p>` },
        { type: 'code', title: 'MySQL AUTO_INCREMENT', sql: `CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body TEXT
);

-- MySQL generates id automatically:
INSERT INTO posts (title, body) VALUES ('Hello', 'First post');
INSERT INTO posts (title, body) VALUES ('World', 'Second post');` },
        { type: 'callout', calloutType: 'warning', html: `<strong>AUTO_INCREMENT gaps</strong>: If you delete row id=5, MySQL does NOT reuse that number. IDs can have gaps after deletions, failed inserts, or transaction rollbacks. Never assume IDs are sequential.` },
        { type: 'text', html: `<h3>Composite Primary Keys</h3>
<p>Sometimes two columns together form the primary key — common in junction/pivot tables:</p>` },
        { type: 'code', title: 'Composite PK', sql: `CREATE TABLE course_enrollments (
  student_id INT,
  course_id INT,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, course_id)  -- combination must be unique
);` },
      ],
    },
    {
      id: 3, moduleId: 7, title: 'Foreign Keys', slug: 'foreign-keys',
      content: [
        { type: 'text', html: `<h2>Foreign Keys — Enforcing Relationships</h2>
<p>A <strong>foreign key</strong> ensures a value in one table references a valid row in another table. It prevents "orphan" records.</p>` },
        { type: 'code', title: 'Foreign key definition', sql: `CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  total DECIMAL(10,2),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT     -- prevent deleting a customer with orders
    ON UPDATE CASCADE      -- update customer_id if customer.id changes
);` },
        { type: 'text', html: `<h3>CASCADE Options</h3>
<ul>
<li><code>RESTRICT</code> (default) — prevent the delete/update</li>
<li><code>CASCADE</code> — automatically delete/update child rows</li>
<li><code>SET NULL</code> — set the FK column to NULL</li>
<li><code>NO ACTION</code> — same as RESTRICT in InnoDB</li>
</ul>` },
        { type: 'sandbox', description: 'See how foreign keys work in our database:', defaultQuery: `-- This would fail in MySQL with FK enforcement:
-- DELETE FROM departments WHERE id = 1;
-- Error: Cannot delete because employees reference this department

-- Check which employees reference department 1:
SELECT name FROM employees WHERE department_id = 1;` },
        { type: 'callout', calloutType: 'mysql', html: `<strong>Performance tip</strong>: MySQL/InnoDB automatically creates an index on foreign key columns. This speeds up JOIN queries and FK checks on INSERT/UPDATE.` },
      ],
    },
    {
      id: 4, moduleId: 7, title: 'Indexes — How They Work', slug: 'indexes',
      content: [
        {
          type: 'animation',
          animation: 'BTreeAnimation',
        },
        { type: 'text', html: `<h2>Indexes — The #1 Performance Tool</h2>
<p>An <strong>index</strong> is a data structure (B+ tree in InnoDB) that lets MySQL find rows without scanning the entire table. Like a book's index — jump to the right page instead of reading every page.</p>
<h3>Without an index (Full Table Scan)</h3>
<p>MySQL reads every single row to find matches. Fine for 100 rows, disastrous for 10 million.</p>
<h3>With an index (B+ Tree Lookup)</h3>
<p>MySQL traverses a tree structure: root → internal → leaf → row. Typically 3-4 hops regardless of table size.</p>` },
        { type: 'code', title: 'Creating indexes', sql: `-- Single column index
CREATE INDEX idx_email ON employees(email);

-- Composite index (multi-column)
CREATE INDEX idx_dept_salary ON employees(department_id, salary);

-- Unique index (also enforces uniqueness)
CREATE UNIQUE INDEX idx_email_unique ON employees(email);` },
        { type: 'text', html: `<h3>The Leftmost Prefix Rule</h3>
<p>A composite index on <code>(a, b, c)</code> can satisfy queries on <code>a</code>, <code>(a, b)</code>, or <code>(a, b, c)</code> — but NOT just <code>b</code> or <code>c</code> alone. Think of it like a phone book sorted by last name, then first name.</p>` },
        { type: 'comparison',
          left: { title: 'Uses the index (a, b, c)', content: '<code>WHERE a = 1</code><br><code>WHERE a = 1 AND b = 2</code><br><code>WHERE a = 1 AND b = 2 AND c = 3</code><br><code>WHERE a = 1 ORDER BY b</code>' },
          right: { title: 'Cannot use the index', content: '<code>WHERE b = 2</code> (skips leftmost)<br><code>WHERE c = 3</code> (skips leftmost)<br><code>WHERE b = 2 AND c = 3</code> (no "a")' },
        },
        { type: 'callout', calloutType: 'tip', html: `Want to see if your query uses an index? Use our <a href="/tools/explain/">EXPLAIN Analyzer</a> — it shows the access type (ALL = full scan, ref/range = index used).` },
      ],
    },
    {
      id: 5, moduleId: 7, title: 'Normalization', slug: 'normalization',
      content: [
        { type: 'text', html: `<h2>Normalization — Reducing Redundancy</h2>
<p>Normalization organizes tables to minimize data duplication. Each "normal form" eliminates a specific type of redundancy.</p>
<h3>1NF — No Repeating Groups</h3>
<p>Each cell contains a single value (no arrays, no comma-separated lists).</p>` },
        { type: 'comparison',
          left: { title: 'Violates 1NF', content: '<code>skills: "Python, SQL, Java"</code><br>Can\'t easily query "find employees who know SQL".' },
          right: { title: 'Correct (1NF)', content: 'Separate <code>employee_skills</code> table with one row per skill.<br>Easy to query and index.' },
        },
        { type: 'text', html: `<h3>2NF — No Partial Dependencies</h3>
<p>Every non-key column depends on the <em>entire</em> primary key, not just part of it. Only relevant for composite keys.</p>
<h3>3NF — No Transitive Dependencies</h3>
<p>Non-key columns depend on the primary key, not on other non-key columns.</p>` },
        { type: 'comparison',
          left: { title: 'Violates 3NF', content: 'employees table with:<br><code>department_id, department_name, department_location</code><br>department_name depends on department_id, not employee id.' },
          right: { title: 'Correct (3NF)', content: 'employees has <code>department_id</code>.<br>departments table has <code>name, location</code>.<br>No redundancy — department name stored once.' },
        },
        { type: 'callout', calloutType: 'tip', html: `<strong>In practice</strong>: Aim for 3NF as your starting point. Denormalize strategically only when performance requires it (e.g., adding a redundant column to avoid a costly JOIN in a hot query path).` },
      ],
    },
  ],
  exercises: [
    {
      id: 1, moduleId: 7, title: 'Create a Tags Table',
      description: '<p>Create a table called <code>tags</code> with columns: <code>id</code> (integer primary key), <code>name</code> (text, not null, unique). Then insert 3 tags: "mysql", "performance", "indexing". Finally, SELECT all from tags.</p>',
      difficulty: 'easy',
      starterQuery: "-- Create tags table, insert data, query it\n",
      expectedQuery: "CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE); INSERT INTO tags VALUES (1, 'mysql'), (2, 'performance'), (3, 'indexing'); SELECT * FROM tags;",
      expectedResult: {
        columns: ['id', 'name'],
        values: [[1, 'mysql'], [2, 'performance'], [3, 'indexing']],
      },
      hints: [
        'CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE)',
        "INSERT INTO tags VALUES (1, 'mysql'), (2, 'performance'), (3, 'indexing')",
        "CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE); INSERT INTO tags VALUES (1, 'mysql'), (2, 'performance'), (3, 'indexing'); SELECT * FROM tags;",
      ],
      validationMode: 'exact',
    },
    {
      id: 2, moduleId: 7, title: 'Find Tables Without Indexes',
      description: '<p>List all indexes in our database using <code>SELECT * FROM sqlite_master WHERE type = \'index\'</code>. Show columns <code>name</code> and <code>tbl_name</code>.</p>',
      difficulty: 'easy',
      starterQuery: "-- List all indexes\n",
      expectedQuery: "SELECT name, tbl_name FROM sqlite_master WHERE type = 'index';",
      expectedResult: {
        columns: ['name', 'tbl_name'],
        values: [],
      },
      hints: [
        "sqlite_master contains metadata about all database objects",
        "WHERE type = 'index' filters to just indexes",
        "SELECT name, tbl_name FROM sqlite_master WHERE type = 'index';",
      ],
      validationMode: 'unordered',
    },
    {
      id: 3, moduleId: 7, title: 'Create a Junction Table',
      description: '<p>Create a many-to-many relationship: a <code>post_tags</code> junction table with <code>post_id</code> (integer) and <code>tag_id</code> (integer), with a composite primary key on both columns. Insert 3 rows: (1,1), (1,2), (2,1). Then SELECT all rows.</p>',
      difficulty: 'medium',
      starterQuery: "-- Create junction table with composite PK\n",
      expectedQuery: "CREATE TABLE post_tags (post_id INTEGER, tag_id INTEGER, PRIMARY KEY (post_id, tag_id)); INSERT INTO post_tags VALUES (1,1), (1,2), (2,1); SELECT * FROM post_tags;",
      expectedResult: {
        columns: ['post_id', 'tag_id'],
        values: [[1, 1], [1, 2], [2, 1]],
      },
      hints: [
        'PRIMARY KEY (post_id, tag_id) creates a composite key',
        'INSERT INTO post_tags VALUES (1,1), (1,2), (2,1)',
        "CREATE TABLE post_tags (post_id INTEGER, tag_id INTEGER, PRIMARY KEY (post_id, tag_id)); INSERT INTO post_tags VALUES (1,1), (1,2), (2,1); SELECT * FROM post_tags;",
      ],
      validationMode: 'exact',
    },
    {
      id: 4, moduleId: 7, title: 'Design Challenge: Blog Schema',
      description: '<p>Create 3 tables for a blog: <code>authors</code> (id, name), <code>posts</code> (id, author_id FK, title, published_at), <code>comments</code> (id, post_id FK, author_name, body). Insert 1 author, 1 post, 2 comments. Then query all comments with their post title using a JOIN.</p>',
      difficulty: 'hard',
      starterQuery: "-- Design a blog schema\n",
      expectedQuery: "CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT NOT NULL); CREATE TABLE posts (id INTEGER PRIMARY KEY, author_id INTEGER REFERENCES authors(id), title TEXT NOT NULL, published_at TEXT); CREATE TABLE comments (id INTEGER PRIMARY KEY, post_id INTEGER REFERENCES posts(id), author_name TEXT NOT NULL, body TEXT NOT NULL); INSERT INTO authors VALUES (1, 'Jane'); INSERT INTO posts VALUES (1, 1, 'Hello World', '2024-01-01'); INSERT INTO comments VALUES (1, 1, 'Bob', 'Great post!'), (2, 1, 'Alice', 'Thanks for sharing'); SELECT c.author_name, c.body, p.title FROM comments c INNER JOIN posts p ON c.post_id = p.id;",
      expectedResult: {
        columns: ['author_name', 'body', 'title'],
        values: [
          ['Bob', 'Great post!', 'Hello World'],
          ['Alice', 'Thanks for sharing', 'Hello World'],
        ],
      },
      hints: [
        'Create tables in order: authors first (no FKs), then posts (FK to authors), then comments (FK to posts)',
        'INSERT data into each table, then JOIN comments to posts',
        "See solution for full SQL",
      ],
      validationMode: 'exact',
    },
  ],
}
