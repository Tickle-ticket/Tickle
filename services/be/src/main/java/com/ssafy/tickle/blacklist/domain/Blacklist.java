package com.ssafy.tickle.blacklist.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 * 블랙리스트 정보를 관리하는 엔티티입니다.
 *
 * <p>봇 탐지, 매크로 감지, IP 속도 제한 초과 등 다양한 사유로
 * 서비스 이용을 제한해야 하는 사용자를 기록합니다.</p>
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "blacklists")
public class Blacklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "blacklist_id", nullable = false, updatable = false)
    private Long id;

    // 블랙리스트 대상 사용자 ID (FK 제약 없음)
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // 블랙리스트 등록 사유
    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false, columnDefinition = "varchar(30)")
    private Reason reason;

    // 상세 설명 (선택)
    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    // 등록 관리자 ID (자동 탐지 시 null)
    @Column(name = "blocked_by")
    private Long blockedBy;

    // 탐지 당시 IP 주소 (IP_RATE_LIMIT 탐지 시 저장, 그 외 null)
    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    // AI 서버 봇 판별 확률 (0.0~1.0, AI 탐지 시만 저장)
    @Column(name = "bot_score")
    private Double botScore;

    // 블랙리스트 등록 시각
    @Column(name = "created_at", columnDefinition = "DATETIME(6) NOT NULL", updatable = false)
    private Instant createdAt;

    /**
     * 블랙리스트 등록 사유 열거형입니다.
     */
    public enum Reason {
        /** 봇으로 자동 탐지된 경우 */
        BOT_DETECTED,
        /** 프론트엔드에서 매크로 사용이 감지된 경우 */
        MACRO_DETECTED_FE,
        /** IP 속도 제한 초과 */
        IP_RATE_LIMIT,
        /** 의심스러운 패턴 감지 */
        SUSPICIOUS_PATTERN,
        /** 관리자가 수동으로 차단한 경우 */
        MANUAL_BLOCK
    }

    /**
     * 블랙리스트 엔티티를 생성합니다.
     *
     * @param userId     블랙리스트 대상 사용자 ID
     * @param reason     등록 사유
     * @param detail     상세 설명 (nullable)
     * @param blockedBy  등록 관리자 ID (자동 탐지 시 null)
     * @param ipAddress  탐지 당시 IP 주소 (IP_RATE_LIMIT 탐지 시, 그 외 null)
     * @param botScore   AI 서버 봇 판별 확률 (0.0~1.0, AI 탐지 시만 저장)
     */
    @Builder
    public Blacklist(Long userId, Reason reason, String detail, Long blockedBy, String ipAddress, Double botScore) {
        this.userId = userId;
        this.reason = reason;
        this.detail = detail;
        this.blockedBy = blockedBy;
        this.ipAddress = ipAddress;
        this.botScore = botScore;
        this.createdAt = Instant.now();
    }
}
