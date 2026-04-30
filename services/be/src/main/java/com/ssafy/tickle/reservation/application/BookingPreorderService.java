package com.ssafy.tickle.reservation.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.payment.domain.PaymentErrorCode;
import com.ssafy.tickle.payment.config.PaymentConstants;
import com.ssafy.tickle.payment.presentation.dto.PaymentOptionSelectionRequest;
import com.ssafy.tickle.reservation.domain.Booking;
import com.ssafy.tickle.reservation.domain.BookingTicket;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingRepository;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketRepository;
import com.ssafy.tickle.reservation.presentation.dto.BookingPreorderRequest;
import com.ssafy.tickle.reservation.presentation.dto.BookingPreorderResponse;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.seat.infrastructure.redis.SeatHoldKeyStore;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 좌석 hold 이후 권종/할인을 확정하고 예매 초안을 생성하는 서비스입니다.
 *
 * <p>이 서비스는 결제 완료를 처리하지 않는다. 사용자가 좌석별 가격을 확정하면
 * 초안과 티켓을 저장하고, 이후 무통장 입금 준비 단계가 이 초안을 이어받는다.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BookingPreorderService {

    private final EventSessionRepository eventSessionRepository;
    private final UserRepository userRepository;
    private final SessionSeatRepository sessionSeatRepository;
    private final SeatHoldKeyStore seatHoldKeyStore;
    private final BookingRepository bookingRepository;
    private final BookingTicketRepository bookingTicketRepository;

    /**
     * 좌석과 권종 선택값을 기반으로 예매 초안을 생성합니다.
     *
     * <p>선점된 좌석과 선택된 가격을 묶어서 초안을 저장하고,
     * 이후 결제 단계에서 사용할 기준 정보를 만든다.</p>
     *
     * @param request 예매 초안 생성 요청
     * @return 예매 초안 응답
     */
    @Transactional
    public BookingPreorderResponse preorder(BookingPreorderRequest request) {
        EventSession session = getSession(request.eventId(), request.sessionId());

        User user = getUser(request.userId());

        List<Long> seatIds = request.sessionSeatIds();

        validateSeatIds(seatIds);
        validateOptionSelections(seatIds, request.optionSelections());

        // 사용자 - 좌석 홀드 검증
        validateHeldSeats(session.getId(), user.getId(), seatIds);

        List<SessionSeat> seats = sessionSeatRepository.findAllWithPricePolicyBySessionIdAndIdIn(session.getId(), seatIds);
        validateSeats(request.userId(), seatIds, seats);

        Map<Long, PaymentOptionSelectionRequest> selectionBySeatId = request.optionSelections().stream()
                .collect(Collectors.toMap(
                        PaymentOptionSelectionRequest::sessionSeatId,
                        selection -> selection
                ));

        // 같은 사용자/회차에서 요청 좌석이 완전히 같은 DRAFT만 재사용한다.
        Optional<Booking> matchingDraft = findMatchingDraft(user.getId(), session.getId(), seatIds);
        if (matchingDraft.isPresent()) {
            List<BookingTicket> tickets = bookingTicketRepository.findByBookingId(matchingDraft.get().getId());
            return BookingPreorderResponse.from(
                    matchingDraft.get(),
                    tickets,
                    getDiscountNameBySeatId(tickets),
                    holdExpiresAt(session.getId(), user.getId())
            );
        }

        return createPreorder(user, session, seats, selectionBySeatId);
    }

    /**
     * 새로운 예매 초안을 생성합니다.
     *
     * <p>좌석별 티켓 가격, 수수료, 최종 금액을 계산한 뒤
     * DRAFT 예매와 DRAFT 티켓을 함께 저장합니다.</p>
     *
     * @param user 예매 사용자
     * @param session 예매 회차
     * @param seats 예매 대상 좌석 목록
     * @param selectionBySeatId 좌석별 권종 선택 정보
     * @return 생성된 예매 초안 응답
     */
    private BookingPreorderResponse createPreorder(
            User user,
            EventSession session,
            List<SessionSeat> seats,
            Map<Long, PaymentOptionSelectionRequest> selectionBySeatId
    ) {
        // 좌석별 선택값을 먼저 합산해 예매 초안의 총액을 고정한다.
        BigDecimal totalPaymentAmount = seats.stream()
                .map(seat -> calculateSeatFinalPrice(seat, selectionBySeatId.get(seat.getId())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // preorder 단계에서는 결제 대기가 아니라 DRAFT 예매만 만든다.
        Booking booking = bookingRepository.save(
                Booking.draft(generateBookingNo(), user, session, totalPaymentAmount, seats.size())
        );

        List<BookingTicket> tickets = bookingTicketRepository.saveAll(
                seats.stream()
                        .map(seat -> createDraftTicket(booking, seat, selectionBySeatId.get(seat.getId())))
                        .toList()
        );

        // 좌석 hold 만료 시각은 Redis TTL 기준으로 내려준다.
        Instant holdExpiresAt = holdExpiresAt(session.getId(), user.getId());
        return BookingPreorderResponse.from(
                booking,
                tickets,
                getDiscountNameBySeatId(selectionBySeatId),
                holdExpiresAt
        );
    }

    /**
     * 동일 사용자와 회차의 기존 DRAFT 중 요청 좌석과 완전히 같은 초안을 조회합니다.
     *
     * @param userId 사용자 식별자
     * @param sessionId 회차 식별자
     * @param requestedSeatIds 요청 좌석 ID 목록
     * @return 재사용 가능한 DRAFT 예매
     */
    private Optional<Booking> findMatchingDraft(Long userId, Long sessionId, List<Long> requestedSeatIds) {
        Set<Long> requestedSeatSet = new LinkedHashSet<>(requestedSeatIds);
        List<Booking> draftBookings = bookingRepository.findAllByUserIdAndSessionIdAndBookingStatusOrderByIdDesc(
                userId,
                sessionId,
                Booking.Status.DRAFT
        );

        for (Booking draftBooking : draftBookings) {
            // 기존 DRAFT와 요청 좌석 구성이 완전히 같을 때만 재사용한다.
            Set<Long> draftSeatSet = bookingTicketRepository.findByBookingId(draftBooking.getId()).stream()
                    .map(ticket -> ticket.getSessionSeat().getId())
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            if (draftSeatSet.equals(requestedSeatSet)) {
                return Optional.of(draftBooking);
            }
        }

        return Optional.empty();
    }

    /**
     * Redis hold 정보를 기준으로 요청 좌석이 아직 유효하게 선점되어 있는지 검증합니다.
     *
     * @param sessionId 회차 식별자
     * @param userId 사용자 식별자
     * @param seatIds 요청 좌석 ID 목록
     */
    private void validateHeldSeats(Long sessionId, Long userId, List<Long> seatIds) {
        // Redis에는 현재 사용자가 hold 중인 좌석 목록만 저장되어 있다.
        List<Long> heldSeatIds = seatHoldKeyStore.getHeldSeatIds(sessionId, userId);
        Set<Long> heldSeatSet = new LinkedHashSet<>(heldSeatIds);
        Set<Long> requestedSeatSet = new LinkedHashSet<>(seatIds);

        if (heldSeatIds.isEmpty() || !heldSeatSet.equals(requestedSeatSet)) {
            throw new BaseException(GlobalErrorCode.CONFLICT, "유효한 좌석 선점 정보를 찾을 수 없습니다.");
        }
    }

    /**
     * 요청 좌석 ID 목록의 기본 형식을 검증합니다.
     *
     * @param seatIds 요청 좌석 ID 목록
     */
    private void validateSeatIds(List<Long> seatIds) {
        if (seatIds == null || seatIds.isEmpty()) {
            throw new BaseException(PaymentErrorCode.PAYMENT_OPTION_INVALID, "좌석 ID 목록은 비어 있을 수 없습니다.");
        }

        if (seatIds.stream().anyMatch(Objects::isNull)) {
            throw new BaseException(PaymentErrorCode.PAYMENT_OPTION_INVALID, "좌석 ID는 null일 수 없습니다.");
        }

        if (new LinkedHashSet<>(seatIds).size() != seatIds.size()) {
            throw new BaseException(PaymentErrorCode.PAYMENT_OPTION_INVALID, "중복된 좌석 ID가 포함되어 있습니다.");
        }
    }

    /**
     * 좌석 목록과 권종 선택 목록이 정확히 대응되는지 검증합니다.
     *
     * @param seatIds 요청 좌석 ID 목록
     * @param optionSelections 좌석별 권종 선택 정보
     */
    private void validateOptionSelections(
            List<Long> seatIds,
            List<PaymentOptionSelectionRequest> optionSelections
    ) {
        if (optionSelections == null || optionSelections.isEmpty()) {
            throw new BaseException(PaymentErrorCode.PAYMENT_OPTION_INVALID, "좌석별 권종 선택 정보는 비어 있을 수 없습니다.");
        }

        if (optionSelections.stream().anyMatch(Objects::isNull)) {
            throw new BaseException(PaymentErrorCode.PAYMENT_OPTION_INVALID, "좌석별 권종 선택 정보가 누락되었습니다.");
        }

        List<Long> selectedSeatIds = optionSelections.stream()
                .map(PaymentOptionSelectionRequest::sessionSeatId)
                .toList();
        if (selectedSeatIds.stream().anyMatch(Objects::isNull)) {
            throw new BaseException(PaymentErrorCode.PAYMENT_OPTION_INVALID, "권종 선택의 좌석 ID는 null일 수 없습니다.");
        }

        // 순서는 의미 없지만, 좌석 목록과 권종 선택 목록의 원소 집합은 정확히 같아야 한다.
        Set<Long> requestedSeatSet = new LinkedHashSet<>(seatIds);
        Set<Long> selectedSeatSet = new LinkedHashSet<>(selectedSeatIds);

        if (selectedSeatSet.size() != optionSelections.size()) {
            throw new BaseException(PaymentErrorCode.PAYMENT_OPTION_INVALID, "중복된 권종 선택 정보가 포함되어 있습니다.");
        }

        if (!requestedSeatSet.equals(selectedSeatSet)) {
            throw new BaseException(PaymentErrorCode.PAYMENT_OPTION_INVALID, "좌석 목록과 권종 선택 목록이 일치하지 않습니다.");
        }
    }

    /**
     * 좌석에 대해 실제 적용할 티켓 가격을 계산합니다.
     *
     * <p>discountName이 없으면 기본가를 사용하고,
     * 값이 있으면 가격 정책에 등록된 할인/권종 가격만 허용합니다.</p>
     *
     * @param seat 대상 좌석
     * @param selection 좌석별 권종 선택 정보
     * @return 적용할 티켓 가격
     */
    private BigDecimal getSelectedPrice(SessionSeat seat, PaymentOptionSelectionRequest selection) {
        if (selection == null) {
            throw new BaseException(PaymentErrorCode.PAYMENT_OPTION_INVALID, "좌석별 권종 선택 정보가 누락되었습니다.");
        }

        // 할인명이 없으면 선택 권종 없이 기본 티켓 가격으로 예매한다.
        if (selection.discountName() == null) {
            return seat.getEventSeat().getEventPricePolicy().getPriceAmount();
        }

        // 할인명이 있으면 해당 좌석의 가격 정책에 등록된 할인/권종만 허용한다.
        return seat.getEventSeat().getEventPricePolicy().getDiscountInfo().stream()
                .filter(discountInfo -> discountInfo.discountName().equals(selection.discountName()))
                .findFirst()
                .map(EventPricePolicy.DiscountInfo::actualPriceAmount)
                .orElseThrow(() -> new BaseException(
                        PaymentErrorCode.PAYMENT_OPTION_INVALID,
                        "선택한 권종을 찾을 수 없습니다. sessionSeatId=" + seat.getId()
                ));
    }

    /**
     * 티켓 가격 기준으로 5% 수수료를 계산합니다.
     *
     * <p>수수료는 좌석마다 개별 계산하며, KRW 특성상 원 단위로 반올림한다.</p>
     */
    private BigDecimal calculateServiceFee(BigDecimal ticketPriceAmount) {
        return ticketPriceAmount
                .multiply(PaymentConstants.TICKET_SERVICE_FEE_RATE)
                .setScale(0, RoundingMode.DOWN);
    }

    /**
     * 티켓 가격과 수수료를 합산해 최종 결제 금액을 계산합니다.
     */
    private BigDecimal calculateFinalPrice(BigDecimal ticketPriceAmount, BigDecimal serviceFeeAmount) {
        return ticketPriceAmount.add(serviceFeeAmount);
    }

    /**
     * 선택 정보로부터 티켓 가격, 수수료, 최종 금액을 한 번에 계산합니다.
     */
    private BigDecimal calculateSeatFinalPrice(SessionSeat seat, PaymentOptionSelectionRequest selection) {
        // 예매 총액은 좌석별 최종 결제 금액의 합계다.
        BigDecimal ticketPriceAmount = getSelectedPrice(seat, selection);
        BigDecimal serviceFeeAmount = calculateServiceFee(ticketPriceAmount);
        return calculateFinalPrice(ticketPriceAmount, serviceFeeAmount);
    }

    /**
     * DRAFT 예매 티켓을 생성합니다.
     *
     * @param booking 상위 예매
     * @param seat 대상 좌석
     * @param selection 좌석별 권종 선택 정보
     * @return 생성할 DRAFT 티켓
     */
    private BookingTicket createDraftTicket(
            Booking booking,
            SessionSeat seat,
            PaymentOptionSelectionRequest selection
    ) {
        // 티켓 가격은 선택 권종이 있으면 할인 가격, 없으면 기본가다.
        BigDecimal ticketPriceAmount = getSelectedPrice(seat, selection);
        // 수수료는 티켓 가격의 5%를 좌석 단위로 따로 계산한다.
        BigDecimal serviceFeeAmount = calculateServiceFee(ticketPriceAmount);
        // 화면과 결제 모두에서 쓸 수 있도록 좌석 최종 금액을 미리 저장한다.
        BigDecimal finalPriceAmount = calculateFinalPrice(ticketPriceAmount, serviceFeeAmount);

        return BookingTicket.draft(
                booking,
                seat,
                generateTicketNo(),
                ticketPriceAmount,
                serviceFeeAmount,
                finalPriceAmount
        );
    }

    /**
     * 요청 기준 좌석별 권종명을 응답용 맵으로 변환합니다.
     *
     * @param selectionBySeatId 좌석별 권종 선택 정보
     * @return 좌석별 권종명 맵
     */
    private Map<Long, String> getDiscountNameBySeatId(Map<Long, PaymentOptionSelectionRequest> selectionBySeatId) {
        Map<Long, String> discountNameBySeatId = new LinkedHashMap<>();
        selectionBySeatId.forEach((seatId, selection) -> discountNameBySeatId.put(seatId, selection.discountName()));
        return discountNameBySeatId;
    }

    /**
     * 저장된 티켓 목록으로부터 좌석별 권종명을 복원합니다.
     *
     * @param tickets 저장된 예매 티켓 목록
     * @return 좌석별 권종명 맵
     */
    private Map<Long, String> getDiscountNameBySeatId(List<BookingTicket> tickets) {
        Map<Long, String> discountNameBySeatId = new LinkedHashMap<>();
        tickets.forEach(ticket -> discountNameBySeatId.put(ticket.getSessionSeat().getId(), resolveDiscountName(ticket)));
        return discountNameBySeatId;
    }

    /**
     * 저장된 티켓 가격을 기준으로 권종명을 복원합니다.
     *
     * @param ticket 예매 티켓
     * @return 복원된 권종명, 기본가인 경우 null
     */
    private String resolveDiscountName(BookingTicket ticket) {
        EventPricePolicy pricePolicy = ticket.getSessionSeat().getEventSeat().getEventPricePolicy();

        if (pricePolicy.getPriceAmount().compareTo(ticket.getTicketPriceAmount()) == 0) {
            return null;
        }

        return pricePolicy.getDiscountInfo().stream()
                .filter(discountInfo -> discountInfo.actualPriceAmount().compareTo(ticket.getTicketPriceAmount()) == 0)
                .map(EventPricePolicy.DiscountInfo::discountName)
                .findFirst()
                .orElse(null);
    }

    /**
     * 현재 사용자의 좌석 hold 만료 시각을 조회합니다.
     *
     * @param sessionId 회차 식별자
     * @param userId 사용자 식별자
     * @return 좌석 hold 만료 시각
     */
    private Instant holdExpiresAt(Long sessionId, Long userId) {
        // preorder 응답은 아직 결제가 아니므로 좌석 hold TTL을 함께 알려준다.
        return seatHoldKeyStore.getHeldExpiresAt(sessionId, userId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.CONFLICT, "유효한 좌석 선점 정보를 찾을 수 없습니다."));
    }

    /**
     * 외부 노출용 예매 번호를 생성합니다.
     *
     * @return 예매 번호
     */
    private String generateBookingNo() {
        return "BK-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    /**
     * 외부 노출용 티켓 번호를 생성합니다.
     *
     * @return 티켓 번호
     */
    private String generateTicketNo() {
        return "TK-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    /**
     * 공연에 속한 회차를 조회합니다.
     *
     * @param eventId 공연 식별자
     * @param sessionId 회차 식별자
     * @return 조회된 회차
     */
    private EventSession getSession(Long eventId, Long sessionId) {
        return eventSessionRepository.findByIdAndEventId(sessionId, eventId)
                .orElseThrow(() -> new BaseException(
                        GlobalErrorCode.RESOURCE_NOT_FOUND,
                        "공연(%d)에 속하는 회차(%d)를 찾을 수 없습니다.".formatted(eventId, sessionId)
                ));
    }

    /**
     * 사용자를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @return 조회된 사용자
     */
    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BaseException(PaymentErrorCode.PAYMENT_USER_NOT_FOUND));
    }

    /**
     * DB에서 조회한 좌석 목록이 요청과 일치하는지 검증합니다.
     *
     * <p>좌석 개수와 HELD 상태, 선점 사용자까지 함께 확인합니다.</p>
     *
     * @param userId 사용자 식별자
     * @param seatIds 요청 좌석 ID 목록
     * @param seats DB에서 조회한 좌석 목록
     */
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
}
