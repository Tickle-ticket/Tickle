package com.ssafy.tickle.venue.application;

import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import com.ssafy.tickle.venue.presentation.dto.AgencyVenueListResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("AgencyVenueService 통합 테스트")
class AgencyVenueServiceTest {

    @Autowired
    private AgencyVenueService agencyVenueService;

    @Autowired
    private VenueRepository venueRepository;

    @AfterEach
    void tearDown() {
        venueRepository.deleteAllInBatch();
    }

    @Test
    @DisplayName("공연장 이름, 기본 주소, 수용 인원 목록을 조회한다")
    void getVenues_success() {
        venueRepository.save(Venue.builder()
                .venueName("티클 아레나")
                .timezoneCode("Asia/Seoul")
                .countryCode("KR")
                .address("서울시 강남구 테헤란로 100")
                .addressLine2("1층")
                .cityName("서울")
                .capacity(12000)
                .build());

        AgencyVenueListResponse response = agencyVenueService.getVenues();

        assertThat(response.venues()).hasSize(1);
        assertThat(response.venues().get(0).venueName()).isEqualTo("티클 아레나");
        assertThat(response.venues().get(0).address()).isEqualTo("서울시 강남구 테헤란로 100");
        assertThat(response.venues().get(0).capacity()).isEqualTo(12000);
    }
}
