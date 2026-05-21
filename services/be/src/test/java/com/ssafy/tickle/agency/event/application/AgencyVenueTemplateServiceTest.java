package com.ssafy.tickle.agency.event.application;

import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyVenueTemplateResponse;
import com.ssafy.tickle.category.domain.Category;
import com.ssafy.tickle.category.infrastructure.persistence.CategoryRepository;
import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.organizer.domain.Organizer;
import com.ssafy.tickle.organizer.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.domain.VenueSeat;
import com.ssafy.tickle.venue.domain.VenueSection;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueSeatRepository;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueSectionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("AgencyVenueTemplateService 통합 테스트")
class AgencyVenueTemplateServiceTest {

    @Autowired
    private AgencyVenueTemplateService agencyVenueTemplateService;

    @Autowired
    private OrganizerRepository organizerRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private VenueSectionRepository venueSectionRepository;

    @Autowired
    private VenueSeatRepository venueSeatRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private Venue venue;

    @BeforeEach
    void setUp() {
        Organizer organizer = organizerRepository.save(createOrganizer("테스트 기획사"));
        venue = venueRepository.save(createVenue("테스트 공연장"));
        Category category = categoryRepository.save(createCategory("콘서트"));
        VenueSection vipSection = venueSectionRepository.save(createVenueSection(venue, "VIP", 1));
        VenueSection rSection = venueSectionRepository.save(createVenueSection(venue, "R", 2));

        venueSeatRepository.save(createVenueSeat(vipSection, venue.getId(), "A", "1", "A1", SeatGrade.VIP));
        venueSeatRepository.save(createVenueSeat(vipSection, venue.getId(), "A", "2", "A2", SeatGrade.VIP));
        venueSeatRepository.save(createVenueSeat(rSection, venue.getId(), "B", "1", "B1", SeatGrade.R));
        venueSeatRepository.save(createVenueSeat(rSection, venue.getId(), "B", "2", "B2", SeatGrade.R));
    }

    @AfterEach
    void tearDown() {
        venueSeatRepository.deleteAllInBatch();
        venueSectionRepository.deleteAllInBatch();
        venueRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();
        organizerRepository.deleteAllInBatch();
    }

    @Test
    @DisplayName("공연장 구역과 좌석을 구역 순서대로 묶어서 반환한다")
    void getVenueTemplate_success() {
        AgencyVenueTemplateResponse response = agencyVenueTemplateService.getVenueTemplate(venue.getId());

        assertThat(response.venueId()).isEqualTo(venue.getId());
        assertThat(response.venueName()).isEqualTo("테스트 공연장");
        assertThat(response.sections()).hasSize(2);
        assertThat(response.sections().get(0).sectionName()).isEqualTo("VIP");
        assertThat(response.sections().get(0).seats())
                .extracting(seat -> seat.seatLabel())
                .containsExactly("A1", "A2");
        assertThat(response.sections().get(0).seats())
                .extracting(seat -> seat.seatGrade())
                .containsExactly(SeatGrade.VIP, SeatGrade.VIP);
        assertThat(response.sections().get(1).sectionName()).isEqualTo("R");
        assertThat(response.sections().get(1).seats())
                .extracting(seat -> seat.seatLabel())
                .containsExactly("B1", "B2");
    }

    @Test
    @DisplayName("존재하지 않는 공연장을 조회하면 예외가 발생한다")
    void getVenueTemplate_notFound() {
        assertThatThrownBy(() -> agencyVenueTemplateService.getVenueTemplate(Long.MAX_VALUE))
                .isInstanceOf(BaseException.class)
                .extracting("errorCode")
                .isEqualTo(GlobalErrorCode.RESOURCE_NOT_FOUND);
    }

    private Organizer createOrganizer(String organizerName) {
        return Organizer.builder()
                .organizerName(organizerName)
                .businessNo("123-45-67890")
                .contactEmail("organizer@test.com")
                .contactPhone("010-1234-5678")
                .status(Organizer.Status.ACTIVE)
                .build();
    }

    private Venue createVenue(String venueName) {
        return Venue.builder()
                .venueName(venueName)
                .timezoneCode("Asia/Seoul")
                .countryCode("KR")
                .address("서울 송파구 올림픽로 25")
                .addressLine2("101호")
                .cityName("서울")
                .capacity(15_000)
                .build();
    }

    private Category createCategory(String categoryName) {
        return Category.builder()
                .categoryName(categoryName)
                .build();
    }

    private VenueSection createVenueSection(Venue venue, String sectionName, int displayOrder) {
        return VenueSection.builder()
                .venue(venue)
                .sectionName(sectionName)
                .displayOrder(displayOrder)
                .build();
    }

    private VenueSeat createVenueSeat(
            VenueSection section,
            Long venueId,
            String rowLabel,
            String seatNumber,
            String seatLabel,
            SeatGrade seatGrade
    ) {
        return VenueSeat.builder()
                .section(section)
                .venueId(venueId)
                .rowLabel(rowLabel)
                .seatNumber(seatNumber)
                .seatLabel(seatLabel)
                .seatGrade(seatGrade)
                .build();
    }
}
