-- ============================================================
-- ReliaDB EXPLAIN Analyzer — Test Database Schema
-- 10 tables, e-commerce domain, 50-100K rows each
-- ============================================================

DROP DATABASE IF EXISTS explain_test;
CREATE DATABASE explain_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE explain_test;

-- ============================================================
-- 1. customers — 50K rows
-- ============================================================
CREATE TABLE customers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
    tier ENUM('free','silver','gold','platinum') NOT NULL DEFAULT 'free',
    country_code CHAR(2),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_status (status)
);

-- 2. products — 10K rows
CREATE TABLE products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category_id BIGINT,
    brand VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    stock_qty INT NOT NULL DEFAULT 0,
    weight_kg DECIMAL(6,2),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category_id),
    INDEX idx_brand (brand)
);

-- 3. categories — 200 rows
CREATE TABLE categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id BIGINT,
    slug VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    UNIQUE INDEX idx_slug (slug),
    INDEX idx_parent (parent_id)
);

-- 4. orders — 100K rows
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    status ENUM('pending','processing','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    shipping_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
    payment_method ENUM('card','paypal','bank_transfer','crypto') NOT NULL DEFAULT 'card',
    shipping_country CHAR(2),
    notes TEXT,
    ordered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    shipped_at DATETIME,
    delivered_at DATETIME,
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_ordered_at (ordered_at)
);

-- 5. order_items — 250K rows
CREATE TABLE order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(12,2) NOT NULL,
    INDEX idx_order (order_id),
    INDEX idx_product (product_id)
);

-- 6. payments — 80K rows
CREATE TABLE payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    status ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
    provider VARCHAR(50),
    provider_ref VARCHAR(100),
    paid_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order (order_id),
    INDEX idx_status (status)
);

-- 7. reviews — 60K rows
CREATE TABLE reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    rating TINYINT NOT NULL,
    title VARCHAR(200),
    body TEXT,
    is_verified TINYINT(1) NOT NULL DEFAULT 0,
    helpful_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product (product_id),
    INDEX idx_customer (customer_id),
    INDEX idx_rating (rating)
);

-- 8. inventory_log — 100K rows
CREATE TABLE inventory_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    warehouse_id BIGINT NOT NULL,
    change_qty INT NOT NULL,
    reason ENUM('purchase','return','adjustment','restock','damaged') NOT NULL,
    reference_id BIGINT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product (product_id),
    INDEX idx_warehouse (warehouse_id),
    INDEX idx_created (created_at)
);

-- 9. warehouses — 50 rows
CREATE TABLE warehouses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country_code CHAR(2) NOT NULL,
    city VARCHAR(100),
    capacity INT NOT NULL DEFAULT 10000,
    is_active TINYINT(1) NOT NULL DEFAULT 1
);

-- 10. shipping_events — 150K rows
CREATE TABLE shipping_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    event_type ENUM('label_created','picked_up','in_transit','out_for_delivery','delivered','exception','returned') NOT NULL,
    location VARCHAR(200),
    carrier VARCHAR(50),
    tracking_number VARCHAR(100),
    event_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order (order_id),
    INDEX idx_tracking (tracking_number),
    INDEX idx_event_at (event_at)
);

-- ============================================================
-- DATA GENERATION
-- ============================================================

-- Disable checks for faster inserts
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET autocommit = 0;

-- Helper: generate random data using recursive CTEs and cross joins

-- 3. Categories (200 rows)
INSERT INTO categories (name, parent_id, slug, sort_order)
WITH RECURSIVE nums AS (
    SELECT 1 AS n UNION ALL SELECT n+1 FROM nums WHERE n < 200
)
SELECT
    CONCAT('Category-', n),
    IF(n <= 20, NULL, FLOOR(RAND() * 20) + 1),
    CONCAT('cat-', n),
    n
FROM nums;

-- 9. Warehouses (50 rows)
INSERT INTO warehouses (name, country_code, city, capacity, is_active)
WITH RECURSIVE nums AS (
    SELECT 1 AS n UNION ALL SELECT n+1 FROM nums WHERE n < 50
)
SELECT
    CONCAT('Warehouse-', n),
    ELT(1 + (n % 10), 'US','UK','DE','FR','JP','AU','CA','BR','IN','SG'),
    ELT(1 + (n % 10), 'New York','London','Berlin','Paris','Tokyo','Sydney','Toronto','Sao Paulo','Mumbai','Singapore'),
    5000 + FLOOR(RAND() * 45000),
    IF(n <= 45, 1, 0)
FROM nums;

-- 1. Customers (50K rows) — batch insert
DELIMITER //
CREATE PROCEDURE gen_customers()
BEGIN
    DECLARE i INT DEFAULT 0;
    WHILE i < 50000 DO
        INSERT INTO customers (email, first_name, last_name, phone, status, tier, country_code, created_at)
        VALUES (
            CONCAT('user', i, '@', ELT(1 + (i % 5), 'gmail.com','yahoo.com','outlook.com','company.com','mail.com')),
            ELT(1 + (i % 20), 'James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','David','Barbara','William','Elizabeth','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Christopher','Karen'),
            ELT(1 + (i % 15), 'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Wilson','Anderson','Taylor','Thomas','Moore'),
            CONCAT('+1-555-', LPAD(i % 10000, 4, '0')),
            ELT(1 + (i % 10), 'active','active','active','active','active','active','active','inactive','inactive','suspended'),
            ELT(1 + (i % 8), 'free','free','free','free','silver','silver','gold','platinum'),
            ELT(1 + (i % 12), 'US','US','US','UK','UK','DE','FR','CA','AU','JP','IN','BR'),
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 1095) DAY)
        );
        SET i = i + 1;
        IF i % 5000 = 0 THEN COMMIT; END IF;
    END WHILE;
    COMMIT;
END//
DELIMITER ;
CALL gen_customers();
DROP PROCEDURE gen_customers;

-- 2. Products (10K rows)
DELIMITER //
CREATE PROCEDURE gen_products()
BEGIN
    DECLARE i INT DEFAULT 0;
    WHILE i < 10000 DO
        INSERT INTO products (sku, name, category_id, brand, price, cost, stock_qty, weight_kg, is_active, created_at)
        VALUES (
            CONCAT('SKU-', LPAD(i, 6, '0')),
            CONCAT(ELT(1 + (i % 10), 'Premium','Basic','Pro','Ultra','Eco','Classic','Modern','Elite','Standard','Deluxe'), ' ', ELT(1 + (i % 8), 'Widget','Gadget','Device','Tool','Kit','Pack','Set','Unit')),
            1 + (i % 200),
            ELT(1 + (i % 12), 'BrandA','BrandB','BrandC','BrandD','BrandE','BrandF','BrandG','BrandH','BrandI','BrandJ','BrandK','BrandL'),
            ROUND(5 + RAND() * 495, 2),
            ROUND(2 + RAND() * 200, 2),
            FLOOR(RAND() * 500),
            ROUND(0.1 + RAND() * 25, 2),
            IF(i % 20 = 0, 0, 1),
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 730) DAY)
        );
        SET i = i + 1;
        IF i % 5000 = 0 THEN COMMIT; END IF;
    END WHILE;
    COMMIT;
END//
DELIMITER ;
CALL gen_products();
DROP PROCEDURE gen_products;

-- 4. Orders (100K rows)
DELIMITER //
CREATE PROCEDURE gen_orders()
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE ord_date DATETIME;
    WHILE i < 100000 DO
        SET ord_date = DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 730) DAY);
        INSERT INTO orders (customer_id, status, total_amount, discount_amount, shipping_amount, payment_method, shipping_country, ordered_at, shipped_at, delivered_at)
        VALUES (
            1 + FLOOR(RAND() * 50000),
            ELT(1 + (i % 12), 'pending','processing','processing','shipped','shipped','shipped','delivered','delivered','delivered','delivered','cancelled','refunded'),
            ROUND(10 + RAND() * 990, 2),
            ROUND(RAND() * 50, 2),
            ROUND(5 + RAND() * 25, 2),
            ELT(1 + (i % 6), 'card','card','card','paypal','paypal','bank_transfer'),
            ELT(1 + (i % 10), 'US','US','US','UK','UK','DE','FR','CA','AU','JP'),
            ord_date,
            IF(i % 12 >= 3, DATE_ADD(ord_date, INTERVAL FLOOR(1 + RAND() * 5) DAY), NULL),
            IF(i % 12 >= 6, DATE_ADD(ord_date, INTERVAL FLOOR(5 + RAND() * 10) DAY), NULL)
        );
        SET i = i + 1;
        IF i % 5000 = 0 THEN COMMIT; END IF;
    END WHILE;
    COMMIT;
END//
DELIMITER ;
CALL gen_orders();
DROP PROCEDURE gen_orders;

-- 5. Order Items (250K rows — ~2.5 per order)
DELIMITER //
CREATE PROCEDURE gen_order_items()
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE qty INT;
    DECLARE uprice DECIMAL(10,2);
    DECLARE disc DECIMAL(5,2);
    WHILE i < 250000 DO
        SET qty = 1 + FLOOR(RAND() * 5);
        SET uprice = ROUND(5 + RAND() * 200, 2);
        SET disc = IF(RAND() < 0.2, ROUND(RAND() * 20, 2), 0);
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount_pct, line_total)
        VALUES (
            1 + FLOOR(RAND() * 100000),
            1 + FLOOR(RAND() * 10000),
            qty,
            uprice,
            disc,
            ROUND(qty * uprice * (1 - disc/100), 2)
        );
        SET i = i + 1;
        IF i % 10000 = 0 THEN COMMIT; END IF;
    END WHILE;
    COMMIT;
END//
DELIMITER ;
CALL gen_order_items();
DROP PROCEDURE gen_order_items;

-- 6. Payments (80K rows)
DELIMITER //
CREATE PROCEDURE gen_payments()
BEGIN
    DECLARE i INT DEFAULT 0;
    WHILE i < 80000 DO
        INSERT INTO payments (order_id, amount, currency, status, provider, provider_ref, paid_at, created_at)
        VALUES (
            1 + FLOOR(RAND() * 100000),
            ROUND(10 + RAND() * 500, 2),
            ELT(1 + (i % 5), 'USD','USD','USD','EUR','GBP'),
            ELT(1 + (i % 8), 'completed','completed','completed','completed','completed','pending','failed','refunded'),
            ELT(1 + (i % 4), 'stripe','paypal','square','adyen'),
            CONCAT('PAY-', UUID()),
            IF(i % 8 < 5, DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 730) DAY), NULL),
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 730) DAY)
        );
        SET i = i + 1;
        IF i % 5000 = 0 THEN COMMIT; END IF;
    END WHILE;
    COMMIT;
END//
DELIMITER ;
CALL gen_payments();
DROP PROCEDURE gen_payments;

-- 7. Reviews (60K rows)
DELIMITER //
CREATE PROCEDURE gen_reviews()
BEGIN
    DECLARE i INT DEFAULT 0;
    WHILE i < 60000 DO
        INSERT INTO reviews (product_id, customer_id, rating, title, body, is_verified, helpful_count, created_at)
        VALUES (
            1 + FLOOR(RAND() * 10000),
            1 + FLOOR(RAND() * 50000),
            1 + FLOOR(RAND() * 5),
            CONCAT(ELT(1 + (i % 6), 'Great','Good','Average','Poor','Excellent','Okay'), ' product'),
            CONCAT('Review body text for product review #', i),
            IF(RAND() < 0.6, 1, 0),
            FLOOR(RAND() * 50),
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 365) DAY)
        );
        SET i = i + 1;
        IF i % 5000 = 0 THEN COMMIT; END IF;
    END WHILE;
    COMMIT;
END//
DELIMITER ;
CALL gen_reviews();
DROP PROCEDURE gen_reviews;

-- 8. Inventory Log (100K rows)
DELIMITER //
CREATE PROCEDURE gen_inventory_log()
BEGIN
    DECLARE i INT DEFAULT 0;
    WHILE i < 100000 DO
        INSERT INTO inventory_log (product_id, warehouse_id, change_qty, reason, reference_id, created_at)
        VALUES (
            1 + FLOOR(RAND() * 10000),
            1 + FLOOR(RAND() * 50),
            IF(RAND() < 0.7, FLOOR(1 + RAND() * 100), -FLOOR(1 + RAND() * 20)),
            ELT(1 + (i % 5), 'purchase','return','adjustment','restock','damaged'),
            IF(RAND() < 0.5, 1 + FLOOR(RAND() * 100000), NULL),
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 365) DAY)
        );
        SET i = i + 1;
        IF i % 5000 = 0 THEN COMMIT; END IF;
    END WHILE;
    COMMIT;
END//
DELIMITER ;
CALL gen_inventory_log();
DROP PROCEDURE gen_inventory_log;

-- 10. Shipping Events (150K rows)
DELIMITER //
CREATE PROCEDURE gen_shipping_events()
BEGIN
    DECLARE i INT DEFAULT 0;
    WHILE i < 150000 DO
        INSERT INTO shipping_events (order_id, event_type, location, carrier, tracking_number, event_at, created_at)
        VALUES (
            1 + FLOOR(RAND() * 100000),
            ELT(1 + (i % 7), 'label_created','picked_up','in_transit','in_transit','out_for_delivery','delivered','exception'),
            ELT(1 + (i % 8), 'New York, US','London, UK','Berlin, DE','Tokyo, JP','Sydney, AU','Toronto, CA','Paris, FR','Mumbai, IN'),
            ELT(1 + (i % 5), 'fedex','ups','dhl','usps','royal_mail'),
            CONCAT('TRK-', LPAD(FLOOR(i / 3), 8, '0')),
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 365) DAY),
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 365) DAY)
        );
        SET i = i + 1;
        IF i % 10000 = 0 THEN COMMIT; END IF;
    END WHILE;
    COMMIT;
END//
DELIMITER ;
CALL gen_shipping_events();
DROP PROCEDURE gen_shipping_events;

-- Re-enable checks
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
SET autocommit = 1;

-- Update table statistics
ANALYZE TABLE customers, products, categories, orders, order_items, payments, reviews, inventory_log, warehouses, shipping_events;

-- Verify row counts
SELECT
    'customers' AS tbl, COUNT(*) AS cnt FROM customers
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL SELECT 'inventory_log', COUNT(*) FROM inventory_log
UNION ALL SELECT 'warehouses', COUNT(*) FROM warehouses
UNION ALL SELECT 'shipping_events', COUNT(*) FROM shipping_events;
