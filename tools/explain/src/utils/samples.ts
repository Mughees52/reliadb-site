export interface Sample {
  name: string
  description: string
  explain: string
  query: string
  ddl: string
}

const SHARED_DDL = `CREATE TABLE customers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    email VARCHAR(100),
    country VARCHAR(50),
    created_at DATETIME
);

CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id BIGINT,
    order_date DATETIME,
    status VARCHAR(20),
    total_amount DECIMAL(10,2),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT,
    product_id BIGINT,
    quantity INT,
    price DECIMAL(10,2),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    category VARCHAR(50),
    price DECIMAL(10,2)
);`

export const samples: Sample[] = [
  {
    name: 'Full Table Scan + Function on Column',
    description: 'WHERE with YEAR() prevents index usage on order_date',
    explain: `-> Filter: ((orders.\`status\` = 'delivered') and (year(orders.order_date) = 2024))  (cost=1.85 rows=1.6) (actual time=0.118..0.118 rows=0 loops=1)
    -> Table scan on orders  (cost=1.85 rows=16) (actual time=0.0607..0.0722 rows=16 loops=1)`,
    query: `SELECT *
FROM orders
WHERE status = 'delivered'
AND YEAR(order_date) = 2024;`,
    ddl: SHARED_DDL,
  },
  {
    name: 'JOIN with Temporary Table (GROUP BY)',
    description: 'Aggregation creates a temporary table to group results',
    explain: `-> Table scan on <temporary>  (actual time=0.249..0.251 rows=13 loops=1)
    -> Aggregate using temporary table  (actual time=0.248..0.248 rows=13 loops=1)
        -> Nested loop inner join  (cost=7.45 rows=16) (actual time=0.122..0.158 rows=16 loops=1)
            -> Filter: (o.customer_id is not null)  (cost=1.85 rows=16) (actual time=0.0533..0.0638 rows=16 loops=1)
                -> Table scan on o  (cost=1.85 rows=16) (actual time=0.0515..0.0604 rows=16 loops=1)
            -> Single-row index lookup on c using PRIMARY (id=o.customer_id)  (cost=0.256 rows=1) (actual time=0.00276..0.0028 rows=1 loops=16)`,
    query: `SELECT c.name, SUM(o.total_amount)
FROM customers c
JOIN orders o ON c.id = o.customer_id
GROUP BY c.name;`,
    ddl: SHARED_DDL,
  },
  {
    name: 'Filesort + Temporary Table (GROUP BY + ORDER BY)',
    description: 'ORDER BY on aggregated result forces a sort after grouping',
    explain: `-> Limit: 10 row(s)  (actual time=2.92..2.93 rows=10 loops=1)
    -> Sort: total_sold DESC, limit input to 10 row(s) per chunk  (actual time=2.92..2.92 rows=10 loops=1)
        -> Table scan on <temporary>  (actual time=2.78..2.82 rows=255 loops=1)
            -> Aggregate using temporary table  (actual time=2.77..2.77 rows=255 loops=1)
                -> Table scan on order_items  (cost=25.9 rows=256) (actual time=0.0949..0.189 rows=256 loops=1)`,
    query: `SELECT product_id, SUM(quantity) as total_sold
FROM order_items
GROUP BY product_id
ORDER BY total_sold DESC
LIMIT 10;`,
    ddl: SHARED_DDL,
  },
  {
    name: '4-Table JOIN with Covering Index',
    description: 'Complex join across customers, orders, order_items, and products',
    explain: `-> Table scan on <temporary>  (actual time=5.46..5.46 rows=0 loops=1)
    -> Aggregate using temporary table  (actual time=5.45..5.45 rows=0 loops=1)
        -> Nested loop inner join  (cost=18.6 rows=16) (actual time=5.43..5.43 rows=0 loops=1)
            -> Nested loop inner join  (cost=13 rows=16) (actual time=0.154..3.49 rows=256 loops=1)
                -> Nested loop inner join  (cost=7.45 rows=16) (actual time=0.0807..0.257 rows=16 loops=1)
                    -> Filter: (o.customer_id is not null)  (cost=1.85 rows=16) (actual time=0.0561..0.115 rows=16 loops=1)
                        -> Covering index scan on o using customer_id  (cost=1.85 rows=16) (actual time=0.0541..0.0668 rows=16 loops=1)
                    -> Single-row index lookup on c using PRIMARY (id=o.customer_id)  (cost=0.256 rows=1) (actual time=0.00802..0.00812 rows=1 loops=16)
                -> Filter: (oi.product_id is not null)  (cost=0.256 rows=1) (actual time=0.161..0.198 rows=16 loops=16)
                    -> Index lookup on oi using order_id (order_id=o.id)  (cost=0.256 rows=1) (actual time=0.161..0.193 rows=16 loops=16)
            -> Single-row index lookup on p using PRIMARY (id=oi.product_id)  (cost=0.256 rows=1) (actual time=0.00719..0.00719 rows=0 loops=256)`,
    query: `SELECT c.country, p.category, SUM(oi.quantity * oi.price)
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
GROUP BY c.country, p.category;`,
    ddl: SHARED_DDL,
  },
  {
    name: 'Dependent Subquery in Projection',
    description: 'Correlated subquery re-executes for every row in customers',
    explain: `-> Table scan on c  (cost=6.65 rows=64) (actual time=0.0545..0.0746 rows=64 loops=1)
-> Select #2 (subquery in projection; dependent)
    -> Aggregate: sum(o.total_amount)  (cost=0.45 rows=1) (actual time=0.00245..0.00249 rows=1 loops=64)
        -> Index lookup on o using customer_id (customer_id=c.id)  (cost=0.35 rows=1) (actual time=0.00196..0.00205 rows=0.25 loops=64)`,
    query: `SELECT c.name,
       (SELECT SUM(o.total_amount)
        FROM orders o
        WHERE o.customer_id = c.id) as total_spent
FROM customers c;`,
    ddl: SHARED_DDL,
  },
  // MariaDB samples
  {
    name: 'MariaDB: ANALYZE Table Format',
    description: 'MariaDB ANALYZE output with r_rows and r_filtered columns',
    explain: `+----+-------------+--------+------+---------------+----------+---------+--------------------+------+--------+----------+------------+----------------------------------------------------+
| id | select_type | table  | type | possible_keys | key      | key_len | ref                | rows | r_rows | filtered | r_filtered | Extra                                              |
+----+-------------+--------+------+---------------+----------+---------+--------------------+------+--------+----------+------------+----------------------------------------------------+
|  1 | SIMPLE      | orders | ALL  | idx_user      | NULL     | NULL    | NULL               | 1000 |   1000 |    10.00 |       5.20 | Using where; Using temporary; Using filesort       |
|  1 | SIMPLE      | users  | ref  | PRIMARY       | PRIMARY  | 4       | db.orders.user_id  |    1 |      1 |   100.00 |     100.00 | NULL                                               |
+----+-------------+--------+------+---------------+----------+---------+--------------------+------+--------+----------+------------+----------------------------------------------------+`,
    query: `SELECT u.name, SUM(o.total_amount) AS total
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'delivered'
GROUP BY u.name
ORDER BY total DESC;`,
    ddl: `CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  email VARCHAR(100)
);
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  status VARCHAR(20),
  total_amount DECIMAL(10,2),
  order_date DATETIME,
  INDEX idx_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);`,
  },
  {
    name: 'MariaDB: ANALYZE FORMAT=JSON',
    description: 'MariaDB JSON format with runtime r_ fields',
    explain: `{
  "query_block": {
    "select_id": 1,
    "r_loops": 1,
    "r_total_time_ms": 45.2,
    "nested_loop": [
      {
        "table": {
          "table_name": "orders",
          "access_type": "ALL",
          "rows": 5000,
          "r_rows": 5000,
          "filtered": 100,
          "r_filtered": 10.5,
          "attached_condition": "orders.status = 'pending'"
        }
      },
      {
        "table": {
          "table_name": "customers",
          "access_type": "eq_ref",
          "possible_keys": ["PRIMARY"],
          "key": "PRIMARY",
          "key_length": "4",
          "ref": ["db.orders.customer_id"],
          "rows": 1,
          "r_rows": 1,
          "filtered": 100,
          "r_filtered": 100
        }
      }
    ]
  }
}`,
    query: `SELECT c.name, o.total_amount
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending';`,
    ddl: SHARED_DDL,
  },
]
