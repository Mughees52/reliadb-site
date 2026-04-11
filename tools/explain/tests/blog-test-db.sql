-- ============================================================
-- Fresh schema for blog examples — SaaS billing domain
-- Tool has NEVER seen these tables or queries
-- ============================================================

DROP DATABASE IF EXISTS blog_demo;
CREATE DATABASE blog_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE blog_demo;

-- 1. tenants — multi-tenant SaaS
CREATE TABLE tenants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    plan ENUM('starter','growth','enterprise') NOT NULL DEFAULT 'starter',
    mrr DECIMAL(10,2) NOT NULL DEFAULT 0,
    region ENUM('us-east','us-west','eu-west','ap-south') NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    signup_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. users — belongs to tenant
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('admin','editor','viewer') NOT NULL DEFAULT 'viewer',
    last_login_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id)
);

-- 3. subscriptions — billing records
CREATE TABLE subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    plan ENUM('starter','growth','enterprise') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    status ENUM('active','past_due','cancelled','trialing') NOT NULL DEFAULT 'active',
    started_at DATETIME NOT NULL,
    cancelled_at DATETIME,
    INDEX idx_tenant (tenant_id),
    INDEX idx_status (status)
);

-- 4. invoices — monthly invoices
CREATE TABLE invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    subscription_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    tax DECIMAL(8,2) NOT NULL DEFAULT 0,
    status ENUM('draft','sent','paid','overdue','void') NOT NULL DEFAULT 'draft',
    due_date DATE NOT NULL,
    paid_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_subscription (subscription_id),
    INDEX idx_tenant (tenant_id),
    INDEX idx_status (status)
);

-- 5. usage_events — metered usage
CREATE TABLE usage_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    feature VARCHAR(50) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_recorded (recorded_at)
);

-- 6. support_tickets
CREATE TABLE support_tickets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
    status ENUM('open','in_progress','waiting','resolved','closed') NOT NULL DEFAULT 'open',
    subject VARCHAR(300),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    INDEX idx_tenant (tenant_id),
    INDEX idx_status (status)
);

-- ============================================================
-- DATA GENERATION — 300K+ rows total
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET autocommit = 0;

-- Tenants (5K)
DELIMITER //
CREATE PROCEDURE gen_tenants()
BEGIN
    DECLARE i INT DEFAULT 0;
    WHILE i < 5000 DO
        INSERT INTO tenants (name, plan, mrr, region, is_active, signup_at)
        VALUES (
            CONCAT('Company-', i),
            ELT(1 + (i % 6), 'starter','starter','starter','growth','growth','enterprise'),
            ROUND(29 + RAND() * 971, 2),
            ELT(1 + (i % 4), 'us-east','us-west','eu-west','ap-south'),
            IF(i % 15 = 0, 0, 1),
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 1095) DAY)
        );
        SET i = i + 1;
        IF i % 2000 = 0 THEN COMMIT; END IF;
    END WHILE;
    COMMIT;
END//
DELIMITER ;
CALL gen_tenants();
DROP PROCEDURE gen_tenants;

-- Users (80K)
DELIMITER //
CREATE PROCEDURE gen_users()
BEGIN
    DECLARE i INT DEFAULT 0;
    WHILE i < 80000 DO
        INSERT INTO users (tenant_id, email, role, last_login_at, created_at)
        VALUES (
            1 + FLOOR(RAND() * 5000),
            CONCAT('user', i, '@', ELT(1 + (i % 4), 'work.com','corp.io','biz.co','team.dev')),
            ELT(1 + (i % 5), 'admin','editor','editor','viewer','viewer'),
            IF(RAND() < 0.7, DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 90) DAY), NULL),
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 730) DAY)
        );
        SET i = i + 1;
        IF i % 5000 = 0 THEN COMMIT; END IF;
    END WHILE;
    COMMIT;
END//
DELIMITER ;
CALL gen_users();
DROP PROCEDURE gen_users;

-- Subscriptions (8K)
DELIMITER //
CREATE PROCEDURE gen_subscriptions()
BEGIN
    DECLARE i INT DEFAULT 0;
    WHILE i < 8000 DO
        INSERT INTO subscriptions (tenant_id, plan, amount, currency, status, started_at, cancelled_at)
        VALUES (
            1 + FLOOR(RAND() * 5000),
            ELT(1 + (i % 6), 'starter','starter','starter','growth','growth','enterprise'),
            ROUND(29 + RAND() * 971, 2),
            ELT(1 + (i % 3), 'USD','EUR','GBP'),
            ELT(1 + (i % 8), 'active','active','active','active','active','past_due','cancelled','trialing'),
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 730) DAY),
            IF(i % 8 = 6, DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 180) DAY), NULL)
        );
        SET i = i + 1;
        IF i % 2000 = 0 THEN COMMIT; END IF;
    END WHILE;
    COMMIT;
END//
DELIMITER ;
CALL gen_subscriptions();
DROP PROCEDURE gen_subscriptions;

-- Invoices (60K)
DELIMITER //
CREATE PROCEDURE gen_invoices()
BEGIN
    DECLARE i INT DEFAULT 0;
    WHILE i < 60000 DO
        INSERT INTO invoices (subscription_id, tenant_id, amount, tax, status, due_date, paid_at, created_at)
        VALUES (
            1 + FLOOR(RAND() * 8000),
            1 + FLOOR(RAND() * 5000),
            ROUND(29 + RAND() * 500, 2),
            ROUND(RAND() * 50, 2),
            ELT(1 + (i % 10), 'paid','paid','paid','paid','paid','paid','sent','overdue','draft','void'),
            DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 365) DAY),
            IF(i % 10 < 6, DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 365) DAY), NULL),
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 365) DAY)
        );
        SET i = i + 1;
        IF i % 5000 = 0 THEN COMMIT; END IF;
    END WHILE;
    COMMIT;
END//
DELIMITER ;
CALL gen_invoices();
DROP PROCEDURE gen_invoices;

-- Usage Events (150K)
DELIMITER //
CREATE PROCEDURE gen_usage()
BEGIN
    DECLARE i INT DEFAULT 0;
    WHILE i < 150000 DO
        INSERT INTO usage_events (tenant_id, feature, quantity, recorded_at)
        VALUES (
            1 + FLOOR(RAND() * 5000),
            ELT(1 + (i % 6), 'api_calls','storage_gb','emails_sent','seats','reports','exports'),
            1 + FLOOR(RAND() * 100),
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 180) DAY)
        );
        SET i = i + 1;
        IF i % 10000 = 0 THEN COMMIT; END IF;
    END WHILE;
    COMMIT;
END//
DELIMITER ;
CALL gen_usage();
DROP PROCEDURE gen_usage;

-- Support Tickets (30K)
DELIMITER //
CREATE PROCEDURE gen_tickets()
BEGIN
    DECLARE i INT DEFAULT 0;
    WHILE i < 30000 DO
        INSERT INTO support_tickets (tenant_id, user_id, priority, status, subject, created_at, resolved_at)
        VALUES (
            1 + FLOOR(RAND() * 5000),
            1 + FLOOR(RAND() * 80000),
            ELT(1 + (i % 8), 'low','low','medium','medium','medium','high','high','urgent'),
            ELT(1 + (i % 10), 'open','open','in_progress','in_progress','waiting','resolved','resolved','resolved','closed','closed'),
            CONCAT(ELT(1 + (i % 5), 'Cannot','How to','Error in','Help with','Issue with'), ' ', ELT(1 + (i % 4), 'billing','login','export','integration')),
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 365) DAY),
            IF(i % 10 >= 5, DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 180) DAY), NULL)
        );
        SET i = i + 1;
        IF i % 5000 = 0 THEN COMMIT; END IF;
    END WHILE;
    COMMIT;
END//
DELIMITER ;
CALL gen_tickets();
DROP PROCEDURE gen_tickets;

SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
SET autocommit = 1;

ANALYZE TABLE tenants, users, subscriptions, invoices, usage_events, support_tickets;

SELECT 'tenants' AS tbl, COUNT(*) AS cnt FROM tenants
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'usage_events', COUNT(*) FROM usage_events
UNION ALL SELECT 'support_tickets', COUNT(*) FROM support_tickets;
