package com.ssafy.tickle.seat.domain;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.event.domain.EventSession;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 이벤트 회차별 좌석 판매 상태를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "session_seats")
public class SessionSeat {

    // 회차 좌석 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_seat_id", nullable = false, updatable = false)
    private Long id;

    // 회차 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private EventSession session;

    // 좌석 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_seat_id", nullable = false)
    private EventSeat eventSeat;

    // 구역 FK
    @Column(name = "event_section_id")
    private Long eventSectionId;

    // 판매 상태
    @Enumerated(EnumType.STRING)
    @Column(name = "sale_status", nullable = false, columnDefinition = "varchar(30)")
    private SaleStatus saleStatus;

    // 선점 사용자 (HELD 상태인 경우에만 값이 있음. TTL 만료 시 DB 조회에 활용)
    @Column(name = "held_by_user_id")
    private Long heldByUserId;

    // 버전
    @Version
    @Column(name = "version_no", nullable = false)
    private Long versionNo;

    // 수정 시각
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum SaleStatus {
        /** 빈 좌석. 누구나 선점 가능 */
        AVAILABLE,
        /** 선점 중. Redis 분산락 + 15분 TTL. 취소표 대기 신청 불가 */
        HELD,
        /** 입금대기. 무통장 입금 클릭 후 입금 전 상태. 확보 다음날 23:59:59까지 유지. 취소표 대기 신청 가능 */
        PENDING,
        /** 예매 확정. 결제 완료. 취소표 대기 신청 가능 */
        CONFIRMED,
        /** 취소/만료 후 취소표 대기자에게 재배정 중인 좌석. 일반 판매로 바로 풀지 않음 */
        REALLOCATING,
        /** 관리자 지정 차단 좌석 (VIP석, 스태프석 등) */
        BLOCKED,
        /** 물리적 사용 불가 좌석 (기둥 가림, 무대 인접 등) */
        UNAVAILABLE
    }

    /**
     * 회차별 좌석 엔티티를 생성합니다.
     *
     * @param session 대상 회차
     * @param eventSeat 원본 이벤트 좌석
     * @param eventSectionId 이벤트 구역 식별자
     * @param saleStatus 판매 상태
     * @param versionNo 낙관적 락 버전
     */
    @Builder
    public SessionSeat(
            EventSession session,
            EventSeat eventSeat,
            Long eventSectionId,
            SaleStatus saleStatus,
            Long versionNo
    ) {
        this.session = session;
        this.eventSeat = eventSeat;
        this.eventSectionId = eventSectionId;
        this.saleStatus = saleStatus;
        this.versionNo = versionNo;
        this.updatedAt = Instant.now();
    }

    /**
     * 좌석을 선점 상태로 전환합니다.
     *
     * <p>AVAILABLE 상태인 경우에만 HELD로 전환 가능합니다.</p>
     *
     * @param userId 선점 사용자 식별자 (TTL 만료 시 DB 조회에 활용)
     * @throws BaseException 선점 불가 상태인 경우 (SEAT_ALREADY_HELD)
     */
    public void hold(Long userId) {
        if (this.saleStatus != SaleStatus.AVAILABLE) {
            throw new BaseException(SeatErrorCode.SEAT_ALREADY_HELD);
        }
        this.saleStatus = SaleStatus.HELD;
        this.heldByUserId = userId;
        this.updatedAt = Instant.now();
    }

    /**
     * 선점된 좌석을 다시 빈 좌석으로 해제합니다.
     *
     * <p>HELD 상태인 경우에만 AVAILABLE로 복구 가능합니다.
     * 이미 해제됐거나 다른 상태인 경우 조용히 무시합니다 (멱등성).</p>
     */
    public void release() {
        if (this.saleStatus != SaleStatus.HELD && this.saleStatus != SaleStatus.REALLOCATING) {
            return;
        }
        this.saleStatus = SaleStatus.AVAILABLE;
        this.heldByUserId = null;
        this.updatedAt = Instant.now();
    }

    /**
     * 취소표 재배분 중인 좌석을 구매하기 위해 선점 상태로 전환합니다.
     *
     * <p>REALLOCATING 상태인 경우에만 HELD로 전환 가능합니다.</p>
     *
     * @param userId 선점 사용자 식별자
     */
    public void holdForCancellation(Long userId) {
        if (this.saleStatus != SaleStatus.REALLOCATING) {
            throw new BaseException(SeatErrorCode.SEAT_ALREADY_HELD);
        }
        this.saleStatus = SaleStatus.HELD;
        this.heldByUserId = userId;
        this.updatedAt = Instant.now();
    }

    /**
     * 무통장 입금 대기 상태로 좌석을 전환합니다.
     *
     * <p>HELD 상태에서만 PENDING으로 전환 가능합니다.</p>
     */
    public void markPendingPayment() {
        if (this.saleStatus != SaleStatus.HELD) {
            throw new BaseException(SeatErrorCode.SEAT_ALREADY_HELD);
        }
        this.saleStatus = SaleStatus.PENDING;
        this.heldByUserId = null;
        this.updatedAt = Instant.now();
    }

    /**
     * 입금 만료로 좌석을 취소표 재배정 상태로 전환합니다.
     *
     * <p>PENDING 상태가 아니면 조용히 무시합니다.</p>
     */
    public void expirePendingPayment() {
        if (this.saleStatus != SaleStatus.PENDING) {
            return;
        }
        this.saleStatus = SaleStatus.REALLOCATING;
        this.heldByUserId = null;
        this.updatedAt = Instant.now();
    }

    /**
     * 예매 취소로 좌석을 취소표 재배정 상태로 전환합니다.
     *
     * <p>CONFIRMED(예매 확정) 또는 PENDING(입금 대기) 상태에서 전환 가능하며,
     * 그 외 상태는 조용히 무시합니다.</p>
     */
    public void cancelForReallocation() {
        if (this.saleStatus != SaleStatus.CONFIRMED && this.saleStatus != SaleStatus.PENDING) {
            return;
        }
        this.saleStatus = SaleStatus.REALLOCATING;
        this.heldByUserId = null;
        this.updatedAt = Instant.now();
    }

    /**
     * 간편결제 승인 완료 시 좌석을 예매 확정 상태로 전환합니다.
     *
     * <p>간편결제는 사용자가 PG 화면으로 이동하는 동안 좌석을 HELD로 유지하므로
     * HELD 상태에서만 CONFIRMED로 전이합니다.</p>
     */
    public void confirmBooking() {
        if (this.saleStatus != SaleStatus.HELD) {
            throw new BaseException(SeatErrorCode.SEAT_ALREADY_HELD);
        }
        this.saleStatus = SaleStatus.CONFIRMED;
        this.heldByUserId = null;
        this.updatedAt = Instant.now();
    }

    /**
     * 테스트용 목 예매 API에서 현재 상태와 무관하게 좌석을 예매 확정 상태로 전환합니다.
     */
    public void confirmBookingForMock() {
        this.saleStatus = SaleStatus.CONFIRMED;
        this.heldByUserId = null;
        this.updatedAt = Instant.now();
    }

    /**
     * 재배정 중인 좌석을 일반 판매 상태로 완전히 해제합니다.
     * 
     * <p>REALLOCATING 상태인 경우에만 AVAILABLE로 전환 가능합니다.</p>
     */
    public void releaseToAvailable() {
        if (this.saleStatus != SaleStatus.REALLOCATING) {
            return;
        }
        this.saleStatus = SaleStatus.AVAILABLE;
        this.heldByUserId = null;
        this.updatedAt = Instant.now();
    }
}
