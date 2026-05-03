package com.ssafy.tickle.payment.application;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.payment.config.PaymentConstants;
import com.ssafy.tickle.payment.domain.Payment;
import com.ssafy.tickle.payment.domain.PaymentErrorCode;
import com.ssafy.tickle.payment.domain.PaymentTransaction;
import com.ssafy.tickle.payment.infrastructure.persistence.PaymentRepository;
import com.ssafy.tickle.payment.infrastructure.persistence.PaymentTransactionRepository;
import com.ssafy.tickle.payment.presentation.dto.KakaoPayReadyRequest;
import com.ssafy.tickle.payment.presentation.dto.KakaoPayReadyResponse;
import com.ssafy.tickle.reservation.domain.Booking;
import com.ssafy.tickle.reservation.domain.BookingTicket;
import com.ssafy.tickle.reservation.domain.BookingTicketStatusHistory;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingRepository;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketRepository;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketStatusHistoryRepository;
import com.ssafy.tickle.seat.domain.SeatStatusChangedEvent;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.seat.infrastructure.redis.SeatHoldKeyStore;
import com.ssafy.tickle.user.domain.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * 카카오페이 결제 준비, 승인, 실패/취소 콜백 유스케이스를 처리합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class KakaoPayPaymentService {

    private final BookingRepository bookingRepository;
    private final BookingTicketRepository bookingTicketRepository;
    private final BookingTicketStatusHistoryRepository bookingTicketStatusHistoryRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final SessionSeatRepository sessionSeatRepository;
    private final SeatHoldKeyStore seatHoldKeyStore;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    @Value("${kakaopay.base-url}")
    private String baseUrl;

    @Value("${kakaopay.secret-key}")
    private String secretKey;

    @Value("${kakaopay.cid}")
    private String cid;

    @Value("${kakaopay.approval-url}")
    private String approvalUrl;

    @Value("${kakaopay.fail-url}")
    private String failUrl;

    @Value("${kakaopay.cancel-url}")
    private String cancelUrl;

    @Value("${kakaopay.success-redirect-url}")
    private String successRedirectUrl;

    @Value("${kakaopay.method-selection-redirect-url}")
    private String methodSelectionRedirectUrl;

    /**
     * 카카오페이 단건 결제 준비를 요청합니다.
     *
     * <p>예매 초안 기준으로 내부 결제를 먼저 생성한 뒤, paymentId를
     * `partner_order_id`로 사용해 카카오페이 ready API를 호출합니다.</p>
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId 사용자 식별자
     * @param request 카카오페이 결제 준비 요청
     * @return 카카오페이 리다이렉트 정보
     */
    @Transactional
    public KakaoPayReadyResponse readyKakaoPay(
            Long eventId,
            Long scheduleId,
            Long userId,
            KakaoPayReadyRequest request
    ) {
        Booking booking = getBooking(request.bookingId());
        validateBookingOwnership(booking, userId, scheduleId);

        // 카카오페이 결제 시도 기준이 되는 티켓 스냅샷을 먼저 조회한다.
        List<BookingTicket> tickets = bookingTicketRepository.findByBookingId(booking.getId());

        // partnerOrderId를 paymentId로 보내기 위해 내부 결제를 먼저 만든다.
        Payment payment = paymentRepository.save(
                Payment.readyKakaoPay(
                        booking,
                        booking.getTotalPaymentAmount(),
                        PaymentConstants.CURRENCY_KRW,
                        PaymentConstants.KAKAOPAY_PROVIDER
                )
        );

        KakaoPayReadyResponse.KakaoPayReadyApiResponse response = RestClient.create(baseUrl)
                .post()
                .uri("/online/v1/payment/ready")
                .header("Authorization", "SECRET_KEY " + secretKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(new KakaoPayReadyApiRequest(
                        cid,
                        payment.getId().toString(),
                        String.valueOf(userId),
                        booking.getSession().getEvent().getTitle(),
                        booking.getTicketCount(),
                        booking.getTotalPaymentAmount().intValueExact(),
                        getTotalServiceFeeAmount(tickets).intValueExact(),
                        0,
                        appendPaymentId(approvalUrl, payment.getId()),
                        appendPaymentId(failUrl, payment.getId()),
                        appendPaymentId(cancelUrl, payment.getId())
                ))
                .retrieve()
                .body(KakaoPayReadyResponse.KakaoPayReadyApiResponse.class);

        if (response == null) {
            throw new BaseException(PaymentErrorCode.PAYMENT_INVALID_STATE, "카카오페이 결제 준비 응답이 비어 있습니다.");
        }

        // approve 단계에서 바로 참조할 수 있도록 현재 활성 tid를 Payment에도 함께 기록한다.
        payment.recordProviderTransactionId(response.tid());
        paymentRepository.save(payment);

        // 거래 이력에도 tid를 남겨 ready 요청 기록을 추적 가능하게 한다.
        paymentTransactionRepository.save(
                PaymentTransaction.requestedReady(
                        payment,
                        UUID.randomUUID().toString(),
                        response.tid()
                )
        );

        return KakaoPayReadyResponse.from(payment.getId(), response);
    }

    /**
     * 카카오페이 승인 성공 콜백을 처리하고 예매 확정 페이지로 리다이렉트할 URL을 반환합니다.
     *
     * <p>이미 승인된 결제는 멱등하게 성공 페이지로 다시 보냅니다.
     * 최초 승인인 경우 카카오 approve API를 호출한 뒤 결제, 예매, 티켓, 좌석 상태를 함께 확정합니다.</p>
     *
     * @param paymentId 내부 결제 식별자
     * @param pgToken 카카오페이 승인 토큰
     * @return 최종 예매 확정 페이지 URL
     */
    @Transactional
    public String approveKakaoPay(Long paymentId, String pgToken) {
        Payment payment = paymentRepository.findDetailById(paymentId)
                .orElseThrow(() -> new BaseException(PaymentErrorCode.PAYMENT_NOT_FOUND));

        validateKakaoPay(payment);

        if (payment.getPaymentStatus() == Payment.Status.APPROVED) {
            return buildSuccessRedirectUrl(payment);
        }

        // 현재 활성 외부 거래 ID는 Payment가 직접 들고 있는 값을 사용한다.
        String tid = payment.getProviderTransactionId();
        if (tid == null || tid.isBlank()) {
            throw new BaseException(PaymentErrorCode.PAYMENT_INVALID_STATE, "카카오페이 거래 ID를 찾을 수 없습니다.");
        }

        KakaoPayApproveApiResponse response = RestClient.create(baseUrl)
                .post()
                .uri("/online/v1/payment/approve")
                .header("Authorization", "SECRET_KEY " + secretKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(new KakaoPayApproveApiRequest(
                        cid,
                        tid,
                        payment.getId().toString(),
                        String.valueOf(payment.getBooking().getUser().getId()),
                        pgToken
                ))
                .retrieve()
                .body(KakaoPayApproveApiResponse.class);

        if (response == null) {
            throw new BaseException(PaymentErrorCode.PAYMENT_INVALID_STATE, "카카오페이 승인 응답이 비어 있습니다.");
        }

        // 카카오페이는 ready 시점에 좌석을 HELD로 유지하므로 승인 성공 시점에 한 번에 확정한다.
        List<BookingTicket> tickets = bookingTicketRepository.findByBookingId(payment.getBooking().getId());
        List<SessionSeat> heldSeats = tickets.stream()
                .map(BookingTicket::getSessionSeat)
                .sorted(Comparator.comparing(SessionSeat::getId))
                .toList();

        processApproveTransition(payment, tickets, heldSeats, tid, response);

        seatHoldKeyStore.deleteHeld(payment.getBooking().getSession().getId(), payment.getBooking().getUser().getId());
        publishSeatStatusChanged(payment.getBooking().getSession().getId(), heldSeats, SessionSeat.SaleStatus.CONFIRMED);

        return buildSuccessRedirectUrl(payment);
    }

    /**
     * 카카오페이 실패 콜백을 처리하고 결제 수단 선택 페이지로 리다이렉트할 URL을 반환합니다.
     *
     * <p>예매 초안과 좌석 선점은 유지한 채 결제 시도만 실패 이력으로 남깁니다.</p>
     *
     * @param paymentId 내부 결제 식별자
     * @return 결제 수단 선택 페이지 URL
     */
    @Transactional
    public String failKakaoPay(Long paymentId) {
        Payment payment = paymentRepository.findDetailById(paymentId)
                .orElseThrow(() -> new BaseException(PaymentErrorCode.PAYMENT_NOT_FOUND));

        validateKakaoPayFailureCallback(payment);

        if (payment.getPaymentStatus() == Payment.Status.FAILED || payment.getPaymentStatus() == Payment.Status.CANCELLED) {
            return buildMethodSelectionRedirectUrl(payment);
        }
        if (payment.getPaymentStatus() == Payment.Status.APPROVED) {
            return buildSuccessRedirectUrl(payment);
        }

        // 실패 콜백은 결제 시도 이력만 남기고 예매 초안과 좌석 선점은 그대로 유지한다.
        payment.fail();
        paymentRepository.save(payment);
        paymentTransactionRepository.save(
                com.ssafy.tickle.payment.domain.PaymentTransaction.failedSale(
                        payment,
                        "KAKAOPAY_FAIL_CALLBACK",
                        "카카오페이 결제 실패 콜백이 수신되었습니다."
                )
        );

        return buildMethodSelectionRedirectUrl(payment);
    }

    /**
     * 카카오페이 취소 콜백을 처리하고 결제 수단 선택 페이지로 리다이렉트할 URL을 반환합니다.
     *
     * <p>사용자가 결제를 중단한 경우 예매 초안과 좌석 선점은 유지하고 결제만 취소 상태로 남깁니다.</p>
     *
     * @param paymentId 내부 결제 식별자
     * @return 결제 수단 선택 페이지 URL
     */
    @Transactional
    public String cancelKakaoPay(Long paymentId) {
        Payment payment = paymentRepository.findDetailById(paymentId)
                .orElseThrow(() -> new BaseException(PaymentErrorCode.PAYMENT_NOT_FOUND));

        validateKakaoPayFailureCallback(payment);

        if (payment.getPaymentStatus() == Payment.Status.CANCELLED || payment.getPaymentStatus() == Payment.Status.FAILED) {
            return buildMethodSelectionRedirectUrl(payment);
        }
        if (payment.getPaymentStatus() == Payment.Status.APPROVED) {
            return buildSuccessRedirectUrl(payment);
        }

        // 취소 콜백도 초안과 좌석 선점은 유지하고, 결제만 취소 상태로 남긴다.
        payment.cancel();
        paymentRepository.save(payment);
        paymentTransactionRepository.save(
                com.ssafy.tickle.payment.domain.PaymentTransaction.cancelledSale(
                        payment,
                        "사용자가 카카오페이 결제를 취소했습니다."
                )
        );

        return buildMethodSelectionRedirectUrl(payment);
    }

    /**
     * 결제 준비 대상 예매 초안을 조회합니다.
     *
     * @param bookingId 예매 식별자
     * @return 조회된 예매 초안
     */
    private Booking getBooking(Long bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "예매 초안을 찾을 수 없습니다."));
    }

    /**
     * 카카오페이 결제 준비 대상 예매 초안이 현재 사용자와 회차에 속한 초안인지 검증합니다.
     *
     * @param booking 검증 대상 예매
     * @param userId 사용자 식별자
     * @param sessionId 회차 식별자
     */
    private void validateBookingOwnership(Booking booking, Long userId, Long sessionId) {
        User bookingUser = booking.getUser();
        if (!bookingUser.getId().equals(userId) || !booking.getSession().getId().equals(sessionId)) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "예매 초안과 사용자/회차 정보가 일치하지 않습니다.");
        }
        // 카카오페이 준비는 초안 예매에 대해서만 허용한다.
        if (booking.getBookingStatus() != Booking.Status.DRAFT) {
            throw new BaseException(PaymentErrorCode.PAYMENT_INVALID_STATE);
        }
    }

    /**
     * 카카오페이 요청에 실을 총 수수료 금액을 계산합니다.
     *
     * @param tickets 결제 대상 티켓 목록
     * @return 총 수수료 금액
     */
    private BigDecimal getTotalServiceFeeAmount(List<BookingTicket> tickets) {
        return tickets.stream()
                .map(BookingTicket::getServiceFeeAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * 카카오페이 승인 성공에 따라 결제, 예매, 티켓, 좌석 상태를 함께 확정합니다.
     *
     * @param payment 승인 완료 결제
     * @param tickets 확정할 티켓 목록
     * @param heldSeats 확정할 좌석 목록
     * @param tid 카카오페이 거래 ID
     * @param response 카카오페이 승인 원본 응답
     */
    @SneakyThrows
    private void processApproveTransition(
            Payment payment,
            List<BookingTicket> tickets,
            List<SessionSeat> heldSeats,
            String tid,
            KakaoPayApproveApiResponse response
    ) {
        Booking booking = payment.getBooking();
        List<BookingTicketStatusHistory> statusHistories = new ArrayList<>();

        // 상위 결제가 승인되면 예매도 최종 확정 상태로 함께 전이한다.
        payment.approve(payment.getOrderAmount());
        booking.confirm();

        // 상태 이력은 실제 이전 상태를 기준으로 남겨야 하므로 전이 전에 fromStatus를 확보한다.
        for (BookingTicket ticket : tickets) {
            String previousStatus = ticket.getTicketStatus().name();
            ticket.confirmBooking();
            statusHistories.add(
                    BookingTicketStatusHistory.builder()
                            .bookingTicket(ticket)
                            .fromStatus(previousStatus)
                            .toStatus(BookingTicket.Status.BOOKED.name())
                            .build()
            );
        }
        heldSeats.forEach(SessionSeat::confirmBooking);

        paymentRepository.save(payment);
        bookingRepository.save(booking);
        bookingTicketRepository.saveAll(tickets);
        sessionSeatRepository.saveAll(heldSeats);

        // 승인 이력에는 카카오 tid, 승인번호, 원본 응답을 함께 남겨 추적 가능하게 한다.
        paymentTransactionRepository.save(
                com.ssafy.tickle.payment.domain.PaymentTransaction.succeededApprove(
                        payment,
                        tid,
                        response.aid(),
                        objectMapper.writeValueAsString(response)
                )
        );
        bookingTicketStatusHistoryRepository.saveAll(statusHistories);
    }

    /**
     * 현재 결제가 카카오페이 승인 대상인지 검증합니다.
     *
     * @param payment 검증 대상 결제
     */
    private void validateKakaoPay(Payment payment) {
        if (payment.getPaymentMethodType() != Payment.MethodType.KAKAOPAY
                || !PaymentConstants.KAKAOPAY_PROVIDER.equals(payment.getProviderName())) {
            throw new BaseException(PaymentErrorCode.PAYMENT_INVALID_STATE);
        }
        if (payment.getPaymentStatus() != Payment.Status.READY && payment.getPaymentStatus() != Payment.Status.APPROVED) {
            throw new BaseException(PaymentErrorCode.PAYMENT_INVALID_STATE);
        }
    }

    /**
     * 카카오페이 실패/취소 콜백 대상 결제인지 검증합니다.
     *
     * @param payment 검증 대상 결제
     */
    private void validateKakaoPayFailureCallback(Payment payment) {
        if (payment.getPaymentMethodType() != Payment.MethodType.KAKAOPAY
                || !PaymentConstants.KAKAOPAY_PROVIDER.equals(payment.getProviderName())) {
            throw new BaseException(PaymentErrorCode.PAYMENT_INVALID_STATE);
        }
    }

    /**
     * 카카오 콜백 URL에 내부 결제 식별자를 포함합니다.
     *
     * @param baseUrl 기본 콜백 URL
     * @param paymentId 내부 결제 식별자
     * @return paymentId 쿼리 파라미터가 포함된 URL
     */
    private String appendPaymentId(String baseUrl, Long paymentId) {
        return UriComponentsBuilder.fromUriString(baseUrl)
                .queryParam("paymentId", paymentId)
                .toUriString();
    }

    /**
     * 결제 승인 완료 후 FE 예매 확정 페이지 URL을 생성합니다.
     *
     * @param payment 승인 완료 결제
     * @return FE 리다이렉트 URL
     */
    private String buildSuccessRedirectUrl(Payment payment) {
        return UriComponentsBuilder.fromUriString(successRedirectUrl)
                .queryParam("bookingId", payment.getBooking().getId())
                .queryParam("paymentId", payment.getId())
                .toUriString();
    }

    /**
     * 결제 실패 또는 취소 후 결제 수단 선택 페이지 URL을 생성합니다.
     *
     * @param payment 실패 또는 취소된 결제
     * @return FE 결제 수단 선택 페이지 URL
     */
    private String buildMethodSelectionRedirectUrl(Payment payment) {
        return UriComponentsBuilder.fromUriString(methodSelectionRedirectUrl)
                .queryParam("bookingId", payment.getBooking().getId())
                .queryParam("paymentId", payment.getId())
                .toUriString();
    }

    /**
     * 좌석 상태 변경 이벤트를 발행합니다.
     *
     * @param sessionId 회차 식별자
     * @param seats 상태가 바뀐 좌석 목록
     * @param saleStatus 변경 후 좌석 상태
     */
    private void publishSeatStatusChanged(Long sessionId, List<SessionSeat> seats, SessionSeat.SaleStatus saleStatus) {
        eventPublisher.publishEvent(
                new SeatStatusChangedEvent(
                        this,
                        sessionId,
                        seats.stream().map(SessionSeat::getId).toList(),
                        saleStatus
                )
        );
    }

    /**
     * 카카오페이 ready API 요청 DTO입니다.
     *
     * @param cid 가맹점 코드
     * @param partnerOrderId 가맹점 주문 번호
     * @param partnerUserId 가맹점 회원 ID
     * @param itemName 상품명
     * @param quantity 수량
     * @param totalAmount 총 결제 금액
     * @param vatAmount 부가세 금액
     * @param taxFreeAmount 비과세 금액
     * @param approvalUrl 결제 성공 시 리다이렉트 URL
     * @param failUrl 결제 실패 시 리다이렉트 URL
     * @param cancelUrl 결제 취소 시 리다이렉트 URL
     */
    private record KakaoPayReadyApiRequest(
            String cid,
            @JsonProperty("partner_order_id")
            String partnerOrderId,
            @JsonProperty("partner_user_id")
            String partnerUserId,
            @JsonProperty("item_name")
            String itemName,
            Integer quantity,
            @JsonProperty("total_amount")
            Integer totalAmount,
            @JsonProperty("vat_amount")
            Integer vatAmount,
            @JsonProperty("tax_free_amount")
            Integer taxFreeAmount,
            @JsonProperty("approval_url")
            String approvalUrl,
            @JsonProperty("fail_url")
            String failUrl,
            @JsonProperty("cancel_url")
            String cancelUrl
    ) {
    }

    /**
     * 카카오페이 approve API 요청 DTO입니다.
     *
     * @param cid 가맹점 코드
     * @param tid 카카오페이 거래 ID
     * @param partner_order_id 내부 결제 식별자 기반 주문 번호
     * @param partner_user_id 내부 사용자 식별자
     * @param pg_token 카카오페이 승인 토큰
     */
    private record KakaoPayApproveApiRequest(
            String cid,
            String tid,
            @JsonProperty("partner_order_id")
            String partnerOrderId,
            @JsonProperty("partner_user_id")
            String partnerUserId,
            @JsonProperty("pg_token")
            String pgToken
    ) {
    }

    /**
     * 카카오페이 approve API 원본 응답 DTO입니다.
     *
     * @param aid 카카오페이 승인 번호
     * @param tid 카카오페이 거래 ID
     * @param cid 가맹점 코드
     * @param partnerOrderId 내부 주문 번호
     * @param partnerUserId 내부 사용자 식별자
     */
    private record KakaoPayApproveApiResponse(
            String aid,
            String tid,
            String cid,
            @JsonProperty("partner_order_id")
            String partnerOrderId,
            @JsonProperty("partner_user_id")
            String partnerUserId
    ) {
    }
}
