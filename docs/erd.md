# Tickle ERD (tickle_core)

> 최종 업데이트: 2026-04-28

## users
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| user_id | BIGINT | ✅ PK | |
| user_no | VARCHAR(50) | ✅ | 외부 노출 사용자 번호 |
| email | VARCHAR(255) | ❌ | |
| phone_number | VARCHAR(30) | ❌ | |
| profile_image_url | VARCHAR(1000) | ❌ | |
| name | VARCHAR(100) | ✅ | |
| nickname | VARCHAR(50) | ✅ | |
| birth_date | DATE | ❌ | |
| organizer_name | VARCHAR(100) | ❌ | AGENCY 권한인 경우 필수 |
| role | VARCHAR(30) | ✅ | USER, AGENCY, ADMIN |
| status | VARCHAR(30) | ✅ | DEFAULT 'ACTIVE' / ACTIVE, INACTIVE, SUSPENDED, DELETED |
| last_login_at | TIMESTAMP | ❌ | |
| created_at | TIMESTAMP | ✅ | |
| updated_at | TIMESTAMP | ✅ | |

> ⚠️ oauth_provider / oauth_provider_user_id 컬럼 없음 — 자체 회원가입 기반 설계 (tickle_auth DB로 분리)
> ⚠️ deleted_at 없음 — status = 'DELETED'로 소프트 삭제

## categories
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| category_id | BIGINT | ✅ PK | |
| category_name | VARCHAR(30) | ✅ | |
| created_at | TIMESTAMP | ✅ | |
| updated_at | TIMESTAMP | ✅ | |

## events
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| event_id | BIGINT | ✅ PK | |
| category_id | BIGINT | ✅ FK | |
| organizer_id | BIGINT | ✅ FK | |
| venue_id | BIGINT | ✅ FK | |
| title | VARCHAR(255) | ✅ | |
| event_start_at | TIMESTAMP | ✅ | |
| event_end_at | TIMESTAMP | ✅ | |
| sales_start_at | TIMESTAMP | ❌ | |
| sales_end_at | TIMESTAMP | ❌ | |
| metadata | TEXT | ❌ | |
| notice | TEXT | ❌ | |
| status | VARCHAR(30) | ✅ | DEFAULT 'PENDING' / PENDING, OPENED, CLOSED, FINISHED, CANCELLED |
| created_at | TIMESTAMP | ✅ | |
| updated_at | TIMESTAMP | ✅ | |

## event_sessions
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| event_session_id | BIGINT | ✅ PK | |
| event_id | BIGINT | ✅ FK | |
| session_no | INT | ✅ | 회차 번호 |
| start_at | TIMESTAMP | ✅ | |
| end_at | TIMESTAMP | ✅ | |
| sales_open_at | TIMESTAMP | ✅ | |
| sales_close_at | TIMESTAMP | ✅ | |
| status | VARCHAR(30) | ✅ | DEFAULT 'PENDING' / PENDING, OPENED, CLOSED, FINISHED, CANCELLED |
| created_at | TIMESTAMP | ✅ | |
| updated_at | TIMESTAMP | ✅ | |

## event_sections
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| event_section_id | BIGINT | ✅ PK | |
| event_id | BIGINT | ✅ FK | |
| venue_id | BIGINT | ❌ | 조회 성능용 비정규화 |
| section_name | VARCHAR(100) | ✅ | |
| display_order | INT | ✅ | DEFAULT 0 |
| created_at | TIMESTAMP | ✅ | |
| updated_at | TIMESTAMP | ✅ | |

## event_seats
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| event_seat_id | BIGINT | ✅ PK | |
| event_section_id | BIGINT | ✅ FK | |
| event_price_policy_id | BIGINT | ✅ FK | ⚠️ 구버전 ERD 대비 추가 |
| venue_id | BIGINT | ❌ | 조회 성능용 비정규화 |
| row_label | VARCHAR(30) | ✅ | |
| seat_number | VARCHAR(30) | ✅ | |
| seat_label | VARCHAR(50) | ✅ | |
| seat_type | VARCHAR(30) | ✅ | DEFAULT 'REGULAR' / REGULAR, VIP, R, S, A, RESTRICTED_VIEW |
| created_at | TIMESTAMP | ✅ | |
| updated_at | TIMESTAMP | ✅ | |

## event_price_policies
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| event_price_policy_id | BIGINT | ✅ PK | |
| event_id | BIGINT | ✅ FK | |
| price_grade | VARCHAR(30) | ✅ | VIP, R, S, A, B 등 |
| price_amount | DECIMAL(18,2) | ✅ | |
| discount_info | JSON | ✅ | |
| currency_code | CHAR(3) | ✅ | DEFAULT 'KRW' |
| display_order | INT | ✅ | DEFAULT 0 |
| created_at | TIMESTAMP | ✅ | |
| updated_at | TIMESTAMP | ✅ | |

## session_seats
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| session_seat_id | BIGINT | ✅ PK | |
| session_id | BIGINT | ✅ FK | |
| event_seat_id | BIGINT | ✅ FK | |
| event_section_id | BIGINT | ❌ | 조회 성능용 비정규화 |
| sale_status | VARCHAR(30) | ✅ | DEFAULT 'AVAILABLE' / AVAILABLE, HELD, BOOKED, BLOCKED, UNAVAILABLE, BANNED |
| held_by_user_id | BIGINT | ❌ | 선점한 유저 (Redis와 별개로 DB 저장) |
| version_no | BIGINT | ✅ | DEFAULT 1 (낙관적 락) |
| updated_at | TIMESTAMP | ✅ | |

> ⚠️ event_price_policy_id 제거됨 (event_seats로 이동)

## bookings
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| booking_id | BIGINT | ✅ PK | |
| booking_no | VARCHAR(50) | ✅ | |
| user_id | BIGINT | ✅ FK | |
| session_id | BIGINT | ✅ FK | |
| booking_status | VARCHAR(30) | ✅ | DEFAULT 'PENDING_PAYMENT' |
| total_paid_amount | DECIMAL(18,2) | ✅ | |
| ticket_count | INT | ✅ | |
| created_at | TIMESTAMP | ✅ | ⚠️ 구버전의 booked_at → created_at 변경 |
| updated_at | TIMESTAMP | ✅ | |

## booking_tickets
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| booking_ticket_id | BIGINT | ✅ PK | |
| booking_id | BIGINT | ✅ FK | |
| session_seat_id | BIGINT | ✅ FK | |
| ticket_status | VARCHAR(30) | ✅ | DEFAULT 'BOOKED' / BOOKED, CANCELLED, USED, EXPIRED |
| ticket_no | VARCHAR(50) | ✅ | |
| actual_price_amount | DECIMAL(18,2) | ✅ | 실제 티켓 가격 |
| service_fee_amount | DECIMAL(18,2) | ✅ | 예매 수수료 |
| final_price_amount | DECIMAL(18,2) | ✅ | 최종 결제 금액 |
| cancelled_at | TIMESTAMP | ❌ | |
| created_at | TIMESTAMP | ✅ | ⚠️ 구버전 ERD 대비 추가 |
| updated_at | TIMESTAMP | ✅ | |

## booking_ticket_status_histories
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| booking_ticket_status_history_id | BIGINT | ✅ PK | |
| booking_ticket_id | BIGINT | ✅ FK | ⚠️ 구버전의 booking_id → booking_ticket_id 변경 |
| from_status | VARCHAR(30) | ❌ | |
| to_status | VARCHAR(30) | ✅ | |
| created_at | TIMESTAMP | ✅ | |

## payments
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| payment_id | BIGINT | ✅ PK | |
| booking_id | BIGINT | ✅ FK | |
| payment_status | VARCHAR(30) | ✅ | READY, PENDING, APPROVED, FAILED, CANCELLED, PARTIAL_REFUNDED, REFUNDED |
| payment_method_type | VARCHAR(50) | ✅ | CREDIT_CARD, BANK_TRANSFER, VBANK, SIMPLE_PAY, MOBILE |
| order_amount | DECIMAL(18,2) | ✅ | |
| currency_code | CHAR(3) | ✅ | DEFAULT 'KRW' |
| approved_amount | DECIMAL(18,2) | ❌ | |
| provider_name | VARCHAR(50) | ✅ | |
| provider_transaction_id | VARCHAR(100) | ❌ | |
| approved_at | TIMESTAMP | ❌ | |
| failed_at | TIMESTAMP | ❌ | |
| created_at | TIMESTAMP | ✅ | |
| updated_at | TIMESTAMP | ❌ | |

## payment_transactions
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| payment_transaction_id | BIGINT | ✅ PK | |
| payment_id | BIGINT | ✅ FK | |
| transaction_type | VARCHAR(30) | ✅ | |
| transaction_status | VARCHAR(30) | ✅ | |
| amount | DECIMAL(18,2) | ✅ | |
| currency_code | CHAR(3) | ✅ | |
| provider_name | VARCHAR(50) | ✅ | |
| provider_transaction_id | VARCHAR(100) | ❌ | |
| provider_approval_no | VARCHAR(50) | ❌ | |
| provider_event_id | VARCHAR(100) | ❌ | |
| request_id | VARCHAR(100) | ❌ | |
| idempotency_key | VARCHAR(100) | ❌ | |
| transacted_at | TIMESTAMP | ❌ | |
| processed_at | TIMESTAMP | ❌ | |
| failure_code | VARCHAR(50) | ❌ | |
| failure_message | VARCHAR(255) | ❌ | |
| raw_response_json | TEXT | ❌ | |
| created_at | TIMESTAMP | ✅ | |

## cancellation_candidates
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| cancellation_candidate_id | BIGINT | ✅ PK | |
| session_seat_id | BIGINT | ✅ FK | |
| user_id | BIGINT | ✅ FK | |
| waiting_rank | INT | ✅ | |
| cancelled_at | TIMESTAMP | ❌ | |
| created_at | TIMESTAMP | ✅ | ⚠️ 구버전의 queued_at → created_at |
| updated_at | TIMESTAMP | ✅ | |

## cancellation_offers
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| cancellation_offer_id | BIGINT | ✅ PK | |
| cancellation_candidate_id | BIGINT | ✅ FK | |
| offered_at | TIMESTAMP | ✅ | |
| offer_expires_at | TIMESTAMP | ✅ | |
| offer_status | VARCHAR(30) | ✅ | DEFAULT 'UNACCEPTED' / UNACCEPTED, ACCEPTED, PASSED, EXPIRED |
| accepted_at | TIMESTAMP | ❌ | |
| passed_at | TIMESTAMP | ❌ | |
| created_at | TIMESTAMP | ❌ | |
| updated_at | TIMESTAMP | ✅ | |

## cancellation_requests
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| cancellation_request_id | BIGINT | ✅ PK | |
| booking_ticket_id | BIGINT | ✅ FK | |
| cancellation_status | VARCHAR(30) | ✅ | DEFAULT 'REQUESTED' / REQUESTED, APPROVED, REJECTED, COMPLETED |
| created_at | TIMESTAMP | ✅ | |

## venues / venue_sections / venue_seats (생략 — 기존과 동일)

## organizers / event_images (생략 — 기존과 동일)

## user_access_logs
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| user_access_log_id | BIGINT | ✅ PK | ⚠️ 구버전 한글 컬럼명 → 영문으로 변경 |
| user_id | BIGINT | ✅ FK | |
| device_fingerprint_hash | CHAR(64) | ✅ | |
| user_agent_hash | CHAR(64) | ✅ | |
| ip_address | VARCHAR(50) | ✅ | |
| country_name | VARCHAR(100) | ✅ | |
| country_iso_code | CHAR(2) | ✅ | |
| city_name | VARCHAR(100) | ✅ | |
| isp | VARCHAR(100) | ❌ | |
| created_at | TIMESTAMP | ✅ | |

## blacklist
| 컬럼 | 타입 | NOT NULL | 비고 |
|------|------|----------|------|
| blacklist_id | BIGINT | ✅ PK AUTO_INCREMENT | |
| user_id | BIGINT | ✅ | users.user_id 참조 (FK 미적용) |
| reason | VARCHAR(30) | ✅ | BOT_DETECTED, MACRO_DETECTED_FE, IP_RATE_LIMIT, SUSPICIOUS_PATTERN, MANUAL_BLOCK |
| detail | TEXT | ❌ | 상세 사유 |
| blocked_by | BIGINT | ❌ | 차단한 어드민 userId (자동 감지 시 NULL) |
| created_at | DATETIME(6) | ✅ | 마이크로초 정밀도 (동시 등록 순서 보장) |

> ⚠️ DATETIME(6): 취소표 대기열 등 동시 등록 상황에서 마이크로초 단위 정렬 보장
