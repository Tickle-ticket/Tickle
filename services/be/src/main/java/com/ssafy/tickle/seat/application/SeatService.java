package com.ssafy.tickle.seat.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.common.util.RedisLockManager;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.seat.domain.EventSection;
import com.ssafy.tickle.seat.domain.SeatErrorCode;
import com.ssafy.tickle.seat.domain.SeatStatusChangedEvent;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.seat.infrastructure.redis.SeatHoldKeyStore;
import com.ssafy.tickle.seat.presentation.dto.SeatHoldRequest;
import com.ssafy.tickle.seat.presentation.dto.SeatHoldResponse;
import com.ssafy.tickle.seat.presentation.dto.SeatItemResponse;
import com.ssafy.tickle.seat.presentation.dto.SeatMapResponse;
import com.ssafy.tickle.seat.presentation.dto.SeatSectionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 좌석 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeatService {

    private static final String LOCK_KEY_PREFIX = "seat-hold:";
    private static final int HOLD_MINUTES = 15;

    private final EventSessionRepository eventSessionRepository;
    private final SessionSeatRepository sessionSeatRepository;
    private final RedisLockManager redisLockManager;
    private final SeatHoldKeyStore seatHoldKeyStore;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 공연 회차의 전체 좌석 배치도(상태)를 구역별로 조회합니다.
     *
     * <p>FE 하드코딩 배치도(좌표)와 합산하여 렌더링하기 위한 상태 정보만 반환합니다.
     * 최초 1회 호출 후 이후 변경분은 WebSocket Push로 수신합니다.</p>
     */
    public SeatMapResponse getSeatMap(Long eventId, Long scheduleId) {
        validateSession(eventId, scheduleId);

        List<SessionSeat> sessionSeats = sessionSeatRepository.findBySessionIdWithDetails(scheduleId);

        Map<EventSection, List<SeatItemResponse>> seatsBySection = sessionSeats.stream()
                .collect(Collectors.groupingBy(
                        ss -> ss.getEventSeat().getEventSection(),
                        LinkedHashMap::new,
                        Collectors.mapping(SeatItemResponse::from, Collectors.toList())
                ));

        List<SeatSectionResponse> sections = seatsBySection.entrySet().stream()
                .map(entry -> SeatSectionResponse.of(entry.getKey(), entry.getValue()))
                .toList();

        return new SeatMapResponse(sections);
    }

    /**
     * FE에서 좌석 선택 후 "선택완료" 클릭 시 선택한 좌석 전체를 일괄 선점합니다 (All-or-Nothing).
     *
     * <h3>처리 흐름</h3>
     * <ol>
     *   <li>세션 단위 분산 락 획득 — 동시 "선택완료" 요청 직렬화 (밀리초 단위)</li>
     *   <li>요청 좌석 전체를 단일 쿼리로 조회</li>
     *   <li>하나라도 AVAILABLE이 아니면 전체 실패 (All-or-Nothing)</li>
     *   <li>전체 HELD 전환 후 Redis TTL 키 등록 (15분)</li>
     *   <li>트랜잭션 커밋 후 WebSocket 브로드캐스트</li>
     * </ol>
     *
     * <p>락은 "선택완료" 클릭 시 밀리초 단위로만 보유합니다.
     * FE에서 좌석을 클릭하는 동안(선택 단계)은 서버 락이 없으므로
     * 수천 명이 동시에 배치도를 보고 자유롭게 선택할 수 있습니다.</p>
     *
     * @param eventId    공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId     선점 사용자 식별자
     * @param request    선점 요청 (sessionSeatId 목록, 최대 4개)
     * @return 선점 완료된 좌석 ID 목록과 만료 시각
     */
    @Transactional
    public SeatHoldResponse holdSeats(Long eventId, Long scheduleId, Long userId, SeatHoldRequest request) {
        validateSession(eventId, scheduleId);

        String lockKey = LOCK_KEY_PREFIX + scheduleId;
        if (!redisLockManager.tryLock(lockKey)) {
            throw new BaseException(SeatErrorCode.SEAT_LOCK_FAILED);
        }

        try {
            List<SessionSeat> seats = loadSeats(request.sessionSeatIds());

            // All-or-Nothing: 모든 좌석 선점 시도 (AVAILABLE 아니면 내부에서 예외 발생)
            seats.forEach(seat -> seat.hold(userId));
            sessionSeatRepository.saveAll(seats);

            // Redis TTL 키 등록 (15분)
            Instant expiresAt = Instant.now().plus(HOLD_MINUTES, ChronoUnit.MINUTES);
            seatHoldKeyStore.registerHeld(scheduleId, userId, request.sessionSeatIds());

            // 트랜잭션 커밋 후 WebSocket 브로드캐스트
            eventPublisher.publishEvent(
                    new SeatStatusChangedEvent(this, scheduleId, request.sessionSeatIds(), SessionSeat.SaleStatus.HELD)
            );

            return new SeatHoldResponse(request.sessionSeatIds(), expiresAt);
        } catch (ObjectOptimisticLockingFailureException e) {
            // 락-커밋 타이밍 갭에서 @Version 충돌 발생 시 409로 변환
            throw new BaseException(SeatErrorCode.SEAT_LOCK_FAILED);
        } finally {
            redisLockManager.unlock(lockKey);
        }
    }

    /**
     * 사용자가 선점한 좌석 전체를 해제합니다.
     *
     * <p>Redis 키가 만료된 상태에서도 정확하게 동작하도록
     * DB의 {@code heldByUserId} 컬럼을 기준으로 조회합니다.
     * 이미 해제된 경우 멱등성을 보장하여 조용히 반환합니다.</p>
     */
    @Transactional
    public void releaseSeats(Long eventId, Long scheduleId, Long userId) {
        validateSession(eventId, scheduleId);

        List<SessionSeat> seats = sessionSeatRepository.findAllBySessionIdAndHeldByUserIdAndSaleStatus(
                scheduleId, userId, SessionSeat.SaleStatus.HELD
        );

        if (seats.isEmpty()) {
            return;
        }

        seats.forEach(SessionSeat::release);
        sessionSeatRepository.saveAll(seats);
        seatHoldKeyStore.deleteHeld(scheduleId, userId);

        List<Long> releasedIds = seats.stream().map(SessionSeat::getId).toList();
        eventPublisher.publishEvent(
                new SeatStatusChangedEvent(this, scheduleId, releasedIds, SessionSeat.SaleStatus.AVAILABLE)
        );
    }

    private void validateSession(Long eventId, Long scheduleId) {
        eventSessionRepository.findByIdAndEventId(scheduleId, eventId)
                .orElseThrow(() -> new BaseException(
                        GlobalErrorCode.RESOURCE_NOT_FOUND,
                        "공연(%d)에 속하는 회차(%d)를 찾을 수 없습니다.".formatted(eventId, scheduleId)
                ));
    }

    private List<SessionSeat> loadSeats(List<Long> seatIds) {
        List<SessionSeat> seats = sessionSeatRepository.findAllByIdIn(seatIds);
        if (seats.size() != seatIds.size()) {
            throw new BaseException(SeatErrorCode.SEAT_NOT_FOUND);
        }
        return seats;
    }
}
