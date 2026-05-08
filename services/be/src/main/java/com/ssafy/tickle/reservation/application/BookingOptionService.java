package com.ssafy.tickle.reservation.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.reservation.presentation.dto.BookingOptionsRequest;
import com.ssafy.tickle.reservation.presentation.dto.BookingOptionsResponse;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.seat.infrastructure.redis.SeatHoldKeyStore;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * 권종 선택 단계의 옵션 조회를 처리하는 서비스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BookingOptionService {

    private final EventSessionRepository eventSessionRepository;
    private final SessionSeatRepository sessionSeatRepository;
    private final SeatHoldKeyStore seatHoldKeyStore;

    /**
     * 좌석별 선택 가능한 권종 옵션을 조회합니다.
     *
     * @param request 권종 옵션 조회 요청
     * @return 권종 옵션 응답
     */
    public BookingOptionsResponse getBookingOptions(Long userId, BookingOptionsRequest request) {
        EventSession session = getSession(request.eventId(), request.sessionId());

        List<SessionSeat> seats = sessionSeatRepository.findAllWithPricePolicyBySessionIdAndIdIn(
                session.getId(),
                request.seatIds()
        );

        validateSeats(userId, request.seatIds(), seats);

        String currencyCode = getCurrencyCode(seats);
        BigDecimal totalTicketPriceAmount = calculateTotalTicketPrice(seats);

        return BookingOptionsResponse.from(
                request.eventId(),
                request.sessionId(),
                userId,
                currencyCode,
                totalTicketPriceAmount,
                seats.stream()
                        .map(BookingOptionsResponse.BookingSeatOptionResponse::from)
                        .toList()
        );
    }

    private BigDecimal calculateTotalTicketPrice(List<SessionSeat> seats) {
        return seats.stream()
                .map(seat -> seat.getEventSeat().getEventPricePolicy().getPriceAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void validateSeats(Long userId, List<Long> seatIds, List<SessionSeat> seats) {
        if (seats.size() != seatIds.size()) {
            throw new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "요청한 좌석을 모두 찾을 수 없습니다.");
        }

        for (SessionSeat seat : seats) {
            if (seat.getSaleStatus() != SessionSeat.SaleStatus.HELD
                    || !userId.equals(seat.getHeldByUserId())) {
                throw new BaseException(GlobalErrorCode.CONFLICT, "유효한 좌석 선점 정보를 찾을 수 없습니다.");
            }
        }
    }

    private String getCurrencyCode(List<SessionSeat> seats) {
        return seats.getFirst().getEventSeat().getEventPricePolicy().getCurrencyCode();
    }

    private EventSession getSession(Long eventId, Long sessionId) {
        return eventSessionRepository.findByIdAndEventId(sessionId, eventId)
                .orElseThrow(() -> new BaseException(
                        GlobalErrorCode.RESOURCE_NOT_FOUND,
                        "공연(%d)에 속하는 회차(%d)를 찾을 수 없습니다.".formatted(eventId, sessionId)
                ));
    }
}
