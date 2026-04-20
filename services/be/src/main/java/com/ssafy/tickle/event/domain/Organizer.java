package com.ssafy.tickle.event.domain;

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
 * 이벤트를 주관하는 주최자 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "organizers")
public class Organizer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "organizer_id", nullable = false, updatable = false)
    private Long id;

    @Column(name = "organizer_name", nullable = false, length = 200)
    private String organizerName;

    @Column(name = "business_no", length = 50)
    private String businessNo;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private Status status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum Status {
        ACTIVE,
        INACTIVE
    }

    /**
     * 주최자 엔티티를 생성합니다.
     *
     * @param organizerName 주최자명
     * @param businessNo 사업자 등록번호
     * @param contactEmail 연락 이메일
     * @param contactPhone 연락처
     * @param status 주최자 상태
     */
    @Builder
    public Organizer(
            String organizerName,
            String businessNo,
            String contactEmail,
            String contactPhone,
            Status status
    ) {
        this.organizerName = organizerName;
        this.businessNo = businessNo;
        this.contactEmail = contactEmail;
        this.contactPhone = contactPhone;
        this.status = status;
    }
}
