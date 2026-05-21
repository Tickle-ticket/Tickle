SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Databases
CREATE DATABASE IF NOT EXISTS tickle_core CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS tickle_auth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE tickle_core;

-- ---------------------------------------------------------
-- DDL Section (정확한 컬럼명 및 타입 반영)
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS venues (
    venue_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    venue_name VARCHAR(200) NOT NULL,
    address VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    capacity INT NOT NULL,
    city_name VARCHAR(100) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    timezone_code VARCHAR(50) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
    category_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(30) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS organizers (
    organizer_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organizer_name VARCHAR(200) NOT NULL,
    business_no VARCHAR(50),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(30),
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS events (
    event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT NOT NULL,
    organizer_id BIGINT NOT NULL,
    venue_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    status ENUM('PENDING', 'OPENED', 'CLOSED', 'FINISHED', 'CANCELLED') NOT NULL,
    event_start_at DATETIME(6) NOT NULL,
    event_end_at DATETIME(6) NOT NULL,
    sales_start_at DATETIME(6),
    sales_end_at DATETIME(6),
    notice TEXT,
    metadata JSON,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event_sessions (
    event_session_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT NOT NULL,
    session_no INT NOT NULL,
    start_at DATETIME(6) NOT NULL,
    end_at DATETIME(6) NOT NULL,
    sales_open_at DATETIME(6) NOT NULL,
    sales_close_at DATETIME(6) NOT NULL,
    status ENUM('PENDING', 'OPENED', 'CLOSED', 'FINISHED', 'CANCELLED') NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event_price_policies (
    event_price_policy_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT NOT NULL,
    price_grade ENUM('VIP', 'R', 'S', 'A', 'B', 'RESTRICTED_VIEW') NOT NULL,
    price_amount DECIMAL(18,2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    display_order INT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event_sections (
    event_section_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT NOT NULL,
    venue_id BIGINT,
    section_name VARCHAR(100) NOT NULL,
    display_order INT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event_seats (
    event_seat_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_section_id BIGINT NOT NULL,
    event_price_policy_id BIGINT NOT NULL,
    venue_id BIGINT,
    row_label VARCHAR(30) NOT NULL,
    seat_number VARCHAR(30) NOT NULL,
    seat_label VARCHAR(50) NOT NULL,
    seat_grade ENUM('VIP', 'R', 'S', 'A', 'B', 'RESTRICTED_VIEW') NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS session_seats (
    session_seat_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    event_seat_id BIGINT NOT NULL,
    event_section_id BIGINT,
    held_by_user_id BIGINT,
    sale_status ENUM('AVAILABLE', 'BLOCKED', 'CONFIRMED', 'HELD', 'PENDING', 'REALLOCATING', 'UNAVAILABLE') NOT NULL,
    version_no BIGINT NOT NULL DEFAULT 1,
    updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- DML Section (정확한 기초 데이터 삽입)
-- ---------------------------------------------------------

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE venues;
TRUNCATE TABLE categories;
TRUNCATE TABLE organizers;
TRUNCATE TABLE events;
TRUNCATE TABLE event_sessions;
TRUNCATE TABLE event_price_policies;
TRUNCATE TABLE event_sections;
TRUNCATE TABLE event_seats;
TRUNCATE TABLE session_seats;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Venue: KSPO DOME
INSERT INTO venues (venue_id, venue_name, address, capacity, city_name, country_code, timezone_code, created_at, updated_at)
VALUES (1, 'KSPO DOME (올림픽체조경기장)', '서울특별시 송파구 올림픽로 424', 15000, 'Seoul', 'KR', 'Asia/Seoul', NOW(), NOW());

-- 2. Category & Organizer
INSERT INTO categories (category_id, category_name, created_at, updated_at) 
VALUES (1, '콘서트', NOW(), NOW());

INSERT INTO organizers (organizer_id, organizer_name, status, created_at, updated_at) 
VALUES (1, '물고기뮤직', 'ACTIVE', NOW(), NOW());

-- 3. Event: 임영웅 콘서트 [IM HERO]
INSERT INTO events (event_id, category_id, organizer_id, venue_id, title, status, event_start_at, event_end_at, sales_start_at, sales_end_at, notice, created_at, updated_at)
VALUES (1, 1, 1, 1, '2026 임영웅 콘서트 [IM HERO] Tour - 서울', 'OPENED', 
        '2026-06-01 19:00:00', '2026-06-01 22:00:00', 
        '2026-05-01 20:00:00', '2026-05-31 23:59:59', 
        '본 공연은 전석 지정석으로 운영되며, 1인 2매까지 예매 가능합니다.', NOW(), NOW());

-- 4. Event Session (1회차)
INSERT INTO event_sessions (event_session_id, event_id, session_no, start_at, end_at, sales_open_at, sales_close_at, status, created_at, updated_at)
VALUES (1, 1, 1, '2026-06-01 19:00:00', '2026-06-01 22:00:00', 
        '2026-05-01 20:00:00', '2026-05-31 23:59:59', 'OPENED', NOW(), NOW());

-- 5. Price Policy (VIP, R, S)
INSERT INTO event_price_policies (event_price_policy_id, event_id, price_grade, price_amount, currency_code, display_order, created_at, updated_at)
VALUES 
(1, 1, 'VIP', 187000.00, 'KRW', 1, NOW(), NOW()),
(2, 1, 'R', 165000.00, 'KRW', 2, NOW(), NOW()),
(3, 1, 'S', 143000.00, 'KRW', 3, NOW(), NOW());

-- 6. Sections (P1, P2, 1구역, 2구역)
INSERT INTO event_sections (event_section_id, event_id, venue_id, section_name, display_order, created_at, updated_at)
VALUES 
(1, 1, 1, 'FLOOR-P1', 1, NOW(), NOW()),
(2, 1, 1, 'FLOOR-P2', 2, NOW(), NOW()),
(3, 1, 1, '1층-1구역', 3, NOW(), NOW()),
(4, 1, 1, '1층-2구역', 4, NOW(), NOW());

-- 7. Seats (총 20개 좌석 세팅)
-- 구역 1 (P1): 1열 1~5번
INSERT INTO event_seats (event_seat_id, event_section_id, event_price_policy_id, venue_id, row_label, seat_number, seat_label, seat_grade, created_at, updated_at) VALUES
(1, 1, 1, 1, 'A', '1', 'P1-A-1', 'VIP', NOW(), NOW()),
(2, 1, 1, 1, 'A', '2', 'P1-A-2', 'VIP', NOW(), NOW()),
(3, 1, 1, 1, 'A', '3', 'P1-A-3', 'VIP', NOW(), NOW()),
(4, 1, 1, 1, 'A', '4', 'P1-A-4', 'VIP', NOW(), NOW()),
(5, 1, 1, 1, 'A', '5', 'P1-A-5', 'VIP', NOW(), NOW());

-- 구역 2 (P2): 1열 1~5번
INSERT INTO event_seats (event_seat_id, event_section_id, event_price_policy_id, venue_id, row_label, seat_number, seat_label, seat_grade, created_at, updated_at) VALUES
(6, 2, 1, 1, 'A', '1', 'P2-A-1', 'VIP', NOW(), NOW()),
(7, 2, 1, 1, 'A', '2', 'P2-A-2', 'VIP', NOW(), NOW()),
(8, 2, 1, 1, 'A', '3', 'P2-A-3', 'VIP', NOW(), NOW()),
(9, 2, 1, 1, 'A', '4', 'P2-A-4', 'VIP', NOW(), NOW()),
(10, 2, 1, 1, 'A', '5', 'P2-A-5', 'VIP', NOW(), NOW());

-- 구역 3 (1층-1구역): 10열 1~5번
INSERT INTO event_seats (event_seat_id, event_section_id, event_price_policy_id, venue_id, row_label, seat_number, seat_label, seat_grade, created_at, updated_at) VALUES
(11, 3, 2, 1, '10', '1', '1F-1-10-1', 'R', NOW(), NOW()),
(12, 3, 2, 1, '10', '2', '1F-1-10-2', 'R', NOW(), NOW()),
(13, 3, 2, 1, '10', '3', '1F-1-10-3', 'R', NOW(), NOW()),
(14, 3, 2, 1, '10', '4', '1F-1-10-4', 'R', NOW(), NOW()),
(15, 3, 2, 1, '10', '5', '1F-1-10-5', 'R', NOW(), NOW());

-- 구역 4 (1층-2구역): 12열 1~5번
INSERT INTO event_seats (event_seat_id, event_section_id, event_price_policy_id, venue_id, row_label, seat_number, seat_label, seat_grade, created_at, updated_at) VALUES
(16, 4, 2, 1, '12', '1', '1F-2-12-1', 'R', NOW(), NOW()),
(17, 4, 2, 1, '12', '2', '1F-2-12-2', 'R', NOW(), NOW()),
(18, 4, 2, 1, '12', '3', '1F-2-12-3', 'R', NOW(), NOW()),
(19, 4, 2, 1, '12', '4', '1F-2-12-4', 'R', NOW(), NOW()),
(20, 4, 2, 1, '12', '5', '1F-2-12-5', 'R', NOW(), NOW());

-- 8. Session Seats (최종 상태 동기화)
INSERT INTO session_seats (session_seat_id, session_id, event_seat_id, event_section_id, sale_status, version_no, updated_at) VALUES
(1, 1, 1, 1, 'AVAILABLE', 1, NOW()),
(2, 1, 2, 1, 'AVAILABLE', 1, NOW()),
(3, 1, 3, 1, 'HELD', 1, NOW()),      -- 선점 테스트용
(4, 1, 4, 1, 'AVAILABLE', 1, NOW()),
(5, 1, 5, 1, 'AVAILABLE', 1, NOW()),
(6, 1, 6, 2, 'AVAILABLE', 1, NOW()),
(7, 1, 7, 2, 'AVAILABLE', 1, NOW()),
(8, 1, 8, 2, 'CONFIRMED', 1, NOW()),  -- 예매완료 테스트용
(9, 1, 9, 2, 'AVAILABLE', 1, NOW()),
(10, 1, 10, 2, 'AVAILABLE', 1, NOW()),
(11, 1, 11, 3, 'AVAILABLE', 1, NOW()),
(12, 1, 12, 3, 'AVAILABLE', 1, NOW()),
(13, 1, 13, 3, 'AVAILABLE', 1, NOW()),
(14, 1, 14, 3, 'AVAILABLE', 1, NOW()),
(15, 1, 15, 3, 'AVAILABLE', 1, NOW()),
(16, 1, 16, 4, 'AVAILABLE', 1, NOW()),
(17, 1, 17, 4, 'UNAVAILABLE', 1, NOW()), -- 판매불가 테스트용
(18, 1, 18, 4, 'AVAILABLE', 1, NOW()),
(19, 1, 19, 4, 'AVAILABLE', 1, NOW()),
(20, 1, 20, 4, 'AVAILABLE', 1, NOW());
