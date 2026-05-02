package com.ssafy.tickle.payment.application;

import com.ssafy.tickle.category.domain.Category;
import com.ssafy.tickle.category.infrastructure.persistence.CategoryRepository;
import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.organizer.domain.Organizer;
import com.ssafy.tickle.organizer.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.payment.config.PaymentConstants;
import com.ssafy.tickle.payment.domain.Payment;
import com.ssafy.tickle.payment.infrastructure.persistence.PaymentRepository;
import com.ssafy.tickle.payment.infrastructure.persistence.PaymentTransactionRepository;
import com.ssafy.tickle.payment.presentation.dto.PaymentOptionSelectionRequest;
import com.ssafy.tickle.payment.presentation.dto.BankTransferPrepareRequest;
import com.ssafy.tickle.payment.presentation.dto.BankTransferPrepareResponse;
import com.ssafy.tickle.reservation.application.BookingPreorderService;
import com.ssafy.tickle.reservation.domain.Booking;
import com.ssafy.tickle.reservation.domain.BookingTicket;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingRepository;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketRepository;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingTicketStatusHistoryRepository;
import com.ssafy.tickle.reservation.presentation.dto.BookingPreorderRequest;
import com.ssafy.tickle.reservation.presentation.dto.BookingPreorderResponse;
import com.ssafy.tickle.seat.application.SeatService;
import com.ssafy.tickle.seat.domain.EventSeat;
import com.ssafy.tickle.seat.domain.EventSection;
import com.ssafy.tickle.seat.domain.SessionSeat;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSeatRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSectionRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import com.ssafy.tickle.seat.infrastructure.redis.SeatHoldKeyStore;
import com.ssafy.tickle.seat.presentation.dto.SeatHoldRequest;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.domain.UserRole;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Payment 결제 유스케이스 통합 테스트입니다.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("Payment 결제 유스케이스 통합 테스트")
class PaymentServiceTest {

    @Autowired private BankTransferPaymentService bankTransferPaymentService;
    @Autowired private BankTransferPaymentExpireService bankTransferPaymentExpireService;
    @Autowired private BookingPreorderService bookingPreorderService;
    @Autowired private SeatService seatService;
    @Autowired private SeatHoldKeyStore seatHoldKeyStore;

    @Autowired private UserRepository userRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private EventSessionRepository eventSessionRepository;
    @Autowired private OrganizerRepository organizerRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private VenueRepository venueRepository;
    @Autowired private EventPricePolicyRepository eventPricePolicyRepository;
    @Autowired private EventSectionRepository eventSectionRepository;
    @Autowired private EventSeatRepository eventSeatRepository;
    @Autowired private SessionSeatRepository sessionSeatRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private BookingTicketRepository bookingTicketRepository;
    @Autowired private BookingTicketStatusHistoryRepository bookingTicketStatusHistoryRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private PaymentTransactionRepository paymentTransactionRepository;

    private User user;
    private Organizer organizer;
    private Venue venue;
    private Category category;
    private Event event;
    private EventSession session;
    private EventPricePolicy pricePolicy;

    @BeforeEach
    void setUp() {
        user = userRepository.save(createUser());
        organizer = organizerRepository.save(createOrganizer());
        venue = venueRepository.save(createVenue());
        category = categoryRepository.save(createCategory());
        event = eventRepository.save(createEvent());
        pricePolicy = eventPricePolicyRepository.save(createPricePolicy(event));
        session = eventSessionRepository.save(createSession(event));
    }

    @AfterEach
    void tearDown() {
        paymentTransactionRepository.deleteAllInBatch();
        bookingTicketStatusHistoryRepository.deleteAllInBatch();
        paymentRepository.deleteAllInBatch();
        bookingTicketRepository.deleteAllInBatch();
        bookingRepository.deleteAllInBatch();
        sessionSeatRepository.deleteAllInBatch();
        eventSeatRepository.deleteAllInBatch();
        eventSectionRepository.deleteAllInBatch();
        eventPricePolicyRepository.deleteAllInBatch();
        eventSessionRepository.deleteAllInBatch();
        eventRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();
        venueRepository.deleteAllInBatch();
        organizerRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
    }

    @Nested
    @DisplayName("무통장 입금 확정")
    class ConfirmBankTransferPayment {

        @Test
        @DisplayName("좌석 hold가 유효하면 무통장 입금을 확정하고 입금 안내를 반환한다")
        void confirmBankTransferPayment_success() {
            // given
            SessionSeat seat = createAndHoldSeat("A", "1");
            BookingPreorderResponse preorder = createPreorder(seat, "일반예매");
            assertThat(bookingRepository.findById(preorder.bookingId()).orElseThrow().getBookingStatus())
                    .isEqualTo(Booking.Status.DRAFT);
            assertThat(bookingTicketRepository.findByBookingId(preorder.bookingId()).getFirst().getTicketStatus())
                    .isEqualTo(BookingTicket.Status.DRAFT);

            // when
            BankTransferPrepareResponse response = bankTransferPaymentService.confirmBankTransferPayment(
                    event.getId(),
                    session.getId(),
                    user.getId(),
                    new BankTransferPrepareRequest(preorder.bookingId())
            );

            // then
            Payment payment = paymentRepository.findDetailById(response.paymentId()).orElseThrow();
            SessionSeat updatedSeat = sessionSeatRepository.findById(seat.getId()).orElseThrow();
            BookingTicket ticket = bookingTicketRepository.findByBookingId(response.bookingId()).getFirst();
            Instant expectedDeadline = payment.getCreatedAt()
                    .atZone(PaymentConstants.PAYMENT_DEADLINE_ZONE_ID)
                    .plusDays(1)
                    .with(PaymentConstants.BANK_TRANSFER_DEADLINE_TIME)
                    .toInstant();

            assertThat(response.paymentStatus()).isEqualTo(Payment.Status.PENDING);
            assertThat(response.bookingStatus()).isEqualTo(Booking.Status.PENDING_PAYMENT);
            assertThat(response.depositDeadline()).isEqualTo(expectedDeadline);
            assertThat(response.orderAmount()).isEqualByComparingTo("157500");
            assertThat(ticket.getTicketStatus()).isEqualTo(BookingTicket.Status.PENDING_PAYMENT);
            assertThat(response.seats().getFirst().ticketPriceAmount()).isEqualByComparingTo("150000");
            assertThat(response.seats().getFirst().serviceFeeAmount()).isEqualByComparingTo("7500");
            assertThat(response.seats().getFirst().finalPriceAmount()).isEqualByComparingTo("157500");
            assertThat(updatedSeat.getSaleStatus()).isEqualTo(SessionSeat.SaleStatus.PENDING);
            assertThat(seatHoldKeyStore.getHeldSeatIds(session.getId(), user.getId())).isEmpty();
        }

        @Test
        @DisplayName("discountName이 공백이면 무통장 입금 확정에 실패한다")
        void confirmBankTransferPayment_failsWhenDiscountNameBlank() {
            SessionSeat seat = createAndHoldSeat("A", "1");
            assertThatThrownBy(() -> createPreorder(seat, " "))
                    .isInstanceOf(BaseException.class);
        }

        @Test
        @DisplayName("같은 pending 결제가 있으면 기존 결제를 재사용한다")
        void confirmBankTransferPayment_reusesExistingPendingPayment() {
            // given
            SessionSeat seat = createAndHoldSeat("A", "1");
            BookingPreorderResponse preorder = createPreorder(seat, "일반예매");

            BankTransferPrepareResponse first = bankTransferPaymentService.confirmBankTransferPayment(
                    event.getId(),
                    session.getId(),
                    user.getId(),
                    new BankTransferPrepareRequest(preorder.bookingId())
            );

            // when
            BankTransferPrepareResponse second = bankTransferPaymentService.confirmBankTransferPayment(
                    event.getId(),
                    session.getId(),
                    user.getId(),
                    new BankTransferPrepareRequest(preorder.bookingId())
            );

            // then
            assertThat(second.paymentId()).isEqualTo(first.paymentId());
            assertThat(paymentRepository.count()).isEqualTo(1);
        }

        @Test
        @DisplayName("hold가 없으면 무통장 입금 확정에 실패한다")
        void confirmBankTransferPayment_failsWhenHoldMissing() {
            // given
            EventSection section = eventSectionRepository.save(createSection(event, "A구역", 1));
            EventSeat eventSeat = eventSeatRepository.save(createEventSeat(section, "A", "1"));
            SessionSeat seat = sessionSeatRepository.save(
                    createSessionSeat(session, eventSeat, section.getId(), SessionSeat.SaleStatus.HELD)
            );
            ReflectionTestUtils.setField(seat, "heldByUserId", user.getId());
            sessionSeatRepository.save(seat);
            Booking booking = bookingRepository.save(
                    Booking.draft("BK-MISSING-HOLD", user, session, new BigDecimal("150000"), 1)
            );
            bookingTicketRepository.save(
                    BookingTicket.draft(
                            booking,
                            seat,
                            "TK-MISSING-HOLD",
                            new BigDecimal("150000"),
                            BigDecimal.ZERO,
                            new BigDecimal("150000")
                    )
            );

            // when & then
            assertThatThrownBy(() -> bankTransferPaymentService.confirmBankTransferPayment(
                    event.getId(),
                    session.getId(),
                    user.getId(),
                    new BankTransferPrepareRequest(booking.getId())
            )).isInstanceOf(BaseException.class);
        }
    }

    @Nested
    @DisplayName("입금 만료")
    class ExpireBankTransfer {

        @Test
        @DisplayName("입금 마감 시간이 지나면 결제를 만료하고 좌석을 재배정 상태로 전환한다")
        void expirePendingBankTransferPayment_success() {
            // given
            SessionSeat seat = createAndHoldSeat("A", "1");
            BookingPreorderResponse preorder = createPreorder(seat, "일반예매");
            BankTransferPrepareResponse prepared = bankTransferPaymentService.confirmBankTransferPayment(
                    event.getId(),
                    session.getId(),
                    user.getId(),
                    new BankTransferPrepareRequest(preorder.bookingId())
            );
            Payment payment = paymentRepository.findById(prepared.paymentId()).orElseThrow();
            ZonedDateTime expiredBaseTime = ZonedDateTime.now(PaymentConstants.PAYMENT_DEADLINE_ZONE_ID)
                    .minusDays(2)
                    .withHour(10)
                    .withMinute(0)
                    .withSecond(0)
                    .withNano(0);
            ReflectionTestUtils.setField(payment, "createdAt", expiredBaseTime.toInstant());
            paymentRepository.save(payment);

            // when
            boolean expired = bankTransferPaymentService.expirePendingBankTransferPayment(payment.getId());

            // then
            Payment expiredPayment = paymentRepository.findDetailById(payment.getId()).orElseThrow();
            Booking booking = expiredPayment.getBooking();
            SessionSeat updatedSeat = sessionSeatRepository.findById(seat.getId()).orElseThrow();
            BookingTicket ticket = bookingTicketRepository.findByBookingId(booking.getId()).getFirst();

            assertThat(expired).isTrue();
            assertThat(expiredPayment.getPaymentStatus()).isEqualTo(Payment.Status.CANCELLED);
            assertThat(booking.getBookingStatus()).isEqualTo(Booking.Status.PAYMENT_EXPIRED);
            assertThat(ticket.getTicketStatus()).isEqualTo(BookingTicket.Status.EXPIRED);
            assertThat(updatedSeat.getSaleStatus()).isEqualTo(SessionSeat.SaleStatus.REALLOCATING);
        }

        @Test
        @DisplayName("배치 만료는 마감 시각이 지난 pending 무통장 입금만 처리한다")
        void expirePendingBankTransferPayments_processesOnlyExpiredPayments() {
            // given
            SessionSeat expiredSeat = createAndHoldSeat("A", "1");
            BookingPreorderResponse expiredPreorder = createPreorder(expiredSeat, "일반예매");
            BankTransferPrepareResponse expiredPrepared = bankTransferPaymentService.confirmBankTransferPayment(
                    event.getId(),
                    session.getId(),
                    user.getId(),
                    new BankTransferPrepareRequest(expiredPreorder.bookingId())
            );

            SessionSeat activeSeat = createAndHoldSeat("A", "2");
            BookingPreorderResponse activePreorder = createPreorder(activeSeat, "일반예매");
            BankTransferPrepareResponse activePrepared = bankTransferPaymentService.confirmBankTransferPayment(
                    event.getId(),
                    session.getId(),
                    user.getId(),
                    new BankTransferPrepareRequest(activePreorder.bookingId())
            );

            Payment expiredPayment = paymentRepository.findById(expiredPrepared.paymentId()).orElseThrow();
            Payment activePayment = paymentRepository.findById(activePrepared.paymentId()).orElseThrow();
            ZonedDateTime expiredBaseTime = ZonedDateTime.now(PaymentConstants.PAYMENT_DEADLINE_ZONE_ID)
                    .minusDays(2)
                    .withHour(10)
                    .withMinute(0)
                    .withSecond(0)
                    .withNano(0);
            ReflectionTestUtils.setField(expiredPayment, "createdAt", expiredBaseTime.toInstant());
            paymentRepository.save(expiredPayment);

            // when
            int expiredCount = bankTransferPaymentExpireService.expirePendingBankTransferPayments();

            // then
            Payment cancelledPayment = paymentRepository.findDetailById(expiredPayment.getId()).orElseThrow();
            Payment pendingPayment = paymentRepository.findDetailById(activePayment.getId()).orElseThrow();
            SessionSeat reallocatedSeat = sessionSeatRepository.findById(expiredSeat.getId()).orElseThrow();
            SessionSeat pendingSeat = sessionSeatRepository.findById(activeSeat.getId()).orElseThrow();

            assertThat(expiredCount).isEqualTo(1);
            assertThat(cancelledPayment.getPaymentStatus()).isEqualTo(Payment.Status.CANCELLED);
            assertThat(cancelledPayment.getBooking().getBookingStatus()).isEqualTo(Booking.Status.PAYMENT_EXPIRED);
            assertThat(reallocatedSeat.getSaleStatus()).isEqualTo(SessionSeat.SaleStatus.REALLOCATING);
            assertThat(pendingPayment.getPaymentStatus()).isEqualTo(Payment.Status.PENDING);
            assertThat(pendingPayment.getBooking().getBookingStatus()).isEqualTo(Booking.Status.PENDING_PAYMENT);
            assertThat(pendingSeat.getSaleStatus()).isEqualTo(SessionSeat.SaleStatus.PENDING);
        }
    }

    private SessionSeat createAndHoldSeat(String rowLabel, String number) {
        EventSection section = eventSectionRepository.save(createSection(event, "A구역", 1));
        EventSeat eventSeat = eventSeatRepository.save(createEventSeat(section, rowLabel, number));
        SessionSeat seat = sessionSeatRepository.save(
                createSessionSeat(session, eventSeat, section.getId(), SessionSeat.SaleStatus.AVAILABLE)
        );
        seatService.holdSeats(
                event.getId(),
                session.getId(),
                user.getId(),
                new SeatHoldRequest(List.of(seat.getId()))
        );
        return seat;
    }

    private BookingPreorderResponse createPreorder(SessionSeat seat, String discountName) {
        return bookingPreorderService.preorder(
                new BookingPreorderRequest(
                        event.getId(),
                        session.getId(),
                        user.getId(),
                        List.of(seat.getId()),
                        List.of(new PaymentOptionSelectionRequest(seat.getId(), discountName))
                )
        );
    }

    private User createUser() {
        return User.builder()
                .id(1001L)
                .userNo("USER-0001")
                .email("pay-user@test.com")
                .phoneNumber("010-1111-2222")
                .name("테스트유저")
                .nickname("결제테스터")
                .birthDate(LocalDate.of(1998, 1, 1))
                .role(UserRole.USER)
                .status(User.Status.ACTIVE)
                .build();
    }

    private Organizer createOrganizer() {
        Organizer o = Organizer.builder()
                .organizerName("테스트 주최사")
                .businessNo("123-45-67890")
                .contactEmail("test@tickle.com")
                .contactPhone("010-1234-5678")
                .status(Organizer.Status.ACTIVE)
                .build();
        setAuditFields(o);
        return o;
    }

    private Venue createVenue() {
        Venue v = Venue.builder()
                .venueName("테스트 공연장")
                .timezoneCode("Asia/Seoul")
                .countryCode("KR")
                .address("서울시 강남구")
                .cityName("서울")
                .capacity(5000)
                .build();
        setAuditFields(v);
        return v;
    }

    private Category createCategory() {
        Category c = Category.builder()
                .categoryName("콘서트")
                .build();
        setAuditFields(c);
        return c;
    }

    private Event createEvent() {
        Instant now = Instant.now();
        Event e = Event.builder()
                .organizer(organizer)
                .venue(venue)
                .category(category)
                .title("결제 테스트 공연")
                .salesStartAt(now.minusSeconds(86_400))
                .salesEndAt(now.plusSeconds(86_400))
                .eventStartAt(now.plusSeconds(172_800))
                .eventEndAt(now.plusSeconds(180_000))
                .metadata(new Event.EventMetadata(List.of("테스트")))
                .notice("공지사항")
                .status(Event.Status.OPENED)
                .build();
        setAuditFields(e);
        return e;
    }

    private EventSession createSession(Event e) {
        Instant now = Instant.now();
        EventSession s = EventSession.builder()
                .event(e)
                .sessionNo(1)
                .startAt(now.plusSeconds(172_800))
                .endAt(now.plusSeconds(180_000))
                .salesOpenAt(now.minusSeconds(86_400))
                .salesCloseAt(now.plusSeconds(86_400))
                .status(EventSession.Status.OPENED)
                .build();
        setAuditFields(s);
        return s;
    }

    private EventPricePolicy createPricePolicy(Event e) {
        EventPricePolicy pp = EventPricePolicy.builder()
                .event(e)
                .priceGrade(SeatGrade.R)
                .priceAmount(new BigDecimal("150000"))
                .discountInfo(List.of(
                        new EventPricePolicy.DiscountInfo("일반예매", BigDecimal.ZERO, new BigDecimal("150000")),
                        new EventPricePolicy.DiscountInfo("조기예매", new BigDecimal("10.0"), new BigDecimal("135000"))
                ))
                .currencyCode("KRW")
                .displayOrder(1)
                .build();
        setAuditFields(pp);
        return pp;
    }

    private EventSection createSection(Event e, String name, int displayOrder) {
        EventSection sec = EventSection.builder()
                .event(e)
                .venueId(venue.getId())
                .sectionName(name)
                .displayOrder(displayOrder)
                .build();
        setAuditFields(sec);
        return sec;
    }

    private EventSeat createEventSeat(EventSection section, String rowLabel, String number) {
        EventSeat es = EventSeat.builder()
                .eventSection(section)
                .eventPricePolicy(pricePolicy)
                .venueId(venue.getId())
                .rowLabel(rowLabel)
                .seatNumber(number)
                .seatLabel(rowLabel + "-" + number)
                .seatGrade(SeatGrade.R)
                .build();
        setAuditFields(es);
        return es;
    }

    private SessionSeat createSessionSeat(
            EventSession sess,
            EventSeat eventSeat,
            Long eventSectionId,
            SessionSeat.SaleStatus status
    ) {
        SessionSeat ss = SessionSeat.builder()
                .session(sess)
                .eventSeat(eventSeat)
                .eventSectionId(eventSectionId)
                .saleStatus(status)
                .versionNo(0L)
                .build();
        ReflectionTestUtils.setField(ss, "updatedAt", Instant.now());
        return ss;
    }

    private void setAuditFields(Object target) {
        Instant now = Instant.now();
        try {
            ReflectionTestUtils.setField(target, "createdAt", now);
        } catch (IllegalArgumentException ignored) {
        }
        ReflectionTestUtils.setField(target, "updatedAt", now);
    }
}
