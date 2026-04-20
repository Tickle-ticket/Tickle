package com.ssafy.tickle.venue.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 이벤트가 진행되는 공연장 기본 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "venues")
public class Venue {

    // 공연장 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "venue_id", nullable = false, updatable = false)
    private Long id;

    // 공연장 이름
    @Column(name = "venue_name", nullable = false, length = 200)
    private String venueName;

    // 타임존
    @Column(name = "timezone_code", nullable = false, length = 50)
    private String timezoneCode;

    // 국가코드
    @Column(name = "country_code", nullable = false, length = 2)
    private String countryCode;

    // 주소1
    @Column(name = "address", nullable = false, length = 255)
    private String address;

    // 주소2
    @Column(name = "address_line2", length = 255)
    private String addressLine2;

    // 도시명
    @Column(name = "city_name", nullable = false, length = 100)
    private String cityName;

    // 총 좌석수
    @Column(name = "capacity", nullable = false)
    private Integer capacity;

    // 생성 시각
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // 수정 시각
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * 공연장 엔티티를 생성합니다.
     *
     * @param venueName 공연장명
     * @param timezoneCode 타임존 코드
     * @param countryCode 국가 코드
     * @param address 기본 주소
     * @param addressLine2 상세 주소
     * @param cityName 도시명
     * @param capacity 수용 인원
     */
    @Builder
    public Venue(
            String venueName,
            String timezoneCode,
            String countryCode,
            String address,
            String addressLine2,
            String cityName,
            Integer capacity
    ) {
        this.venueName = venueName;
        this.timezoneCode = timezoneCode;
        this.countryCode = countryCode;
        this.address = address;
        this.addressLine2 = addressLine2;
        this.cityName = cityName;
        this.capacity = capacity;
    }
}
