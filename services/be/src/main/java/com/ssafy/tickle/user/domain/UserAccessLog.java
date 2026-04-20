package com.ssafy.tickle.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 사용자 접속 환경과 위치 기반 접속 이력을 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "user_access_logs")
public class UserAccessLog {

    // 접속 로그 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_access_log_id", nullable = false, updatable = false)
    private Long id;

    // 사용자 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 디바이스 fingerprint hash
    @Column(name = "device_fingerprint_hash", nullable = false, length = 64)
    private String deviceFingerprintHash;

    // user agent hash
    @Column(name = "user_agent_hash", nullable = false, length = 64)
    private String userAgentHash;

    // IP 주소
    @Column(name = "ip_address", nullable = false, length = 50)
    private String ipAddress;

    // 국가명
    @Column(name = "country_name", nullable = false, length = 100)
    private String countryName;

    // 국가 코드
    @Column(name = "country_iso_code", nullable = false, length = 2)
    private String countryIsoCode;

    // 도시명
    @Column(name = "city_name", nullable = false, length = 100)
    private String cityName;

    // 통신사
    @Column(name = "isp", length = 100)
    private String isp;

    // 접속 시각
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /**
     * 사용자 접속 로그 엔티티를 생성합니다.
     *
     * @param user 접속 사용자
     * @param deviceFingerprintHash 디바이스 지문 해시
     * @param userAgentHash 사용자 에이전트 해시
     * @param ipAddress IP 주소
     * @param countryName 국가명
     * @param countryIsoCode 국가 ISO 코드
     * @param cityName 도시명
     * @param isp 인터넷 서비스 제공자
     */
    @Builder
    public UserAccessLog(
            User user,
            String deviceFingerprintHash,
            String userAgentHash,
            String ipAddress,
            String countryName,
            String countryIsoCode,
            String cityName,
            String isp
    ) {
        this.user = user;
        this.deviceFingerprintHash = deviceFingerprintHash;
        this.userAgentHash = userAgentHash;
        this.ipAddress = ipAddress;
        this.countryName = countryName;
        this.countryIsoCode = countryIsoCode;
        this.cityName = cityName;
        this.isp = isp;
    }
}
