package com.ssafy.tickle.event.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 * 이벤트에 노출되는 이미지 정보를 관리하는 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "event_images")
public class EventImage {

    // 공연 이미지 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_image_id", nullable = false, updatable = false)
    private Long id;

    // 공연 FK
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    // 이미지 유형
    @Enumerated(EnumType.STRING)
    @Column(name = "image_type", nullable = false, length = 30)
    private ImageType imageType;

    // 이미지 URL
    @Column(name = "image_url", nullable = false, length = 1000)
    private String imageUrl;

    // 노출 순서
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    // 생성 시각
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // 수정 시각
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum ImageType {
        POSTER,
        THUMBNAIL,
        MAIN,
        DETAIL
    }

    /**
     * 이벤트 이미지 엔티티를 생성합니다.
     *
     * @param event 이미지가 속한 이벤트
     * @param imageType 이미지 유형
     * @param imageUrl 이미지 URL
     * @param displayOrder 노출 순서
     */
    @Builder
    public EventImage(Event event, ImageType imageType, String imageUrl, Integer displayOrder) {
        this.event = event;
        this.imageType = imageType;
        this.imageUrl = imageUrl;
        this.displayOrder = displayOrder;
    }
}
