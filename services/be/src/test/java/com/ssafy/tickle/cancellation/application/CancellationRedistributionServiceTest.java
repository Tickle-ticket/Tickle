package com.ssafy.tickle.cancellation.application;

import com.ssafy.tickle.cancellation.domain.CancellationCandidate;
import com.ssafy.tickle.cancellation.domain.CancellationOffer;
import com.ssafy.tickle.cancellation.infrastructure.persistence.CancellationOfferRepository;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.payment.domain.Payment;
import com.ssafy.tickle.payment.infrastructure.persistence.PaymentRepository;
import com.ssafy.tickle.payment.infrastructure.persistence.PaymentTransactionRepository;
import com.ssafy.tickle.payment.presentation.dto.BankTransferPrepareResponse;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingRepository;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketRepository;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketStatusHistoryRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.user.domain.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CancellationRedistributionServiceTest {

    @InjectMocks
    private CancellationRedistributionService service;

    @Mock
    private CancellationOfferRepository offerRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private BookingTicketRepository bookingTicketRepository;
    @Mock
    private BookingTicketStatusHistoryRepository bookingTicketStatusHistoryRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;
    @Mock
    private SessionSeatRepository sessionSeatRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private SmsNotificationService smsNotificationService;

    @Test
    @DisplayName("notifyCandidate 호출 시 문자 발송 및 타이머가 시작된다")
    void notifyCandidate() {
        // given
        User user = mock(User.class);
        given(user.getPhoneNumber()).willReturn("010-1234-5678");

        CancellationCandidate candidate = mock(CancellationCandidate.class);
        given(candidate.getUser()).willReturn(user);

        CancellationOffer offer = new CancellationOffer(candidate, null, null, null, null, null);
        given(offerRepository.findByIdWithDetails(1L)).willReturn(Optional.of(offer));

        // when
        service.notifyCandidate(1L);

        // then
        assertThat(offer.getOfferStatus()).isEqualTo(CancellationOffer.OfferStatus.UNACCEPTED);
        assertThat(offer.getOfferedAt()).isNotNull();
        assertThat(offer.getOfferExpiresAt()).isNotNull();
        verify(smsNotificationService).sendCancellationNotifyMessage("010-1234-5678", null);
    }

    @Test
    @DisplayName("1시간이 지난 취소표를 구매하려 하면 예외가 발생한다")
    void purchaseCancellation_expired() {
        // given
        User user = mock(User.class);
        given(user.getId()).willReturn(1L);

        CancellationCandidate candidate = mock(CancellationCandidate.class);
        given(candidate.getUser()).willReturn(user);

        Instant past = Instant.now().minus(61, ChronoUnit.MINUTES);
        CancellationOffer offer = new CancellationOffer(candidate, past, past.plus(1, ChronoUnit.HOURS), CancellationOffer.OfferStatus.UNACCEPTED, null, null);
        
        given(offerRepository.findByIdWithDetails(1L)).willReturn(Optional.of(offer));

        // when & then
        assertThatThrownBy(() -> service.purchaseCancellation(1L, 1L))
                .isInstanceOf(BaseException.class)
                .hasMessageContaining("취소표 구매 가능 시간");
    }

    @Test
    @DisplayName("자신의 취소표가 아니면 구매 시 예외가 발생한다")
    void purchaseCancellation_forbidden() {
        // given
        User user = mock(User.class);
        given(user.getId()).willReturn(1L);

        CancellationCandidate candidate = mock(CancellationCandidate.class);
        given(candidate.getUser()).willReturn(user);

        Instant now = Instant.now();
        CancellationOffer offer = new CancellationOffer(candidate, now, now.plus(1, ChronoUnit.HOURS), CancellationOffer.OfferStatus.UNACCEPTED, null, null);
        
        given(offerRepository.findByIdWithDetails(1L)).willReturn(Optional.of(offer));

        // when & then
        assertThatThrownBy(() -> service.purchaseCancellation(1L, 2L)) // 다른 userId
                .isInstanceOf(BaseException.class)
                .hasMessageContaining("자신의 취소표만 구매할 수 있습니다.");
    }
}
