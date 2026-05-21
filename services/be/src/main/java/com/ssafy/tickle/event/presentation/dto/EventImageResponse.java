package com.ssafy.tickle.event.presentation.dto;

import com.ssafy.tickle.event.domain.EventImage;

/**
 * 이벤트 이미지 응답 DTO입니다.
 *
 * @param eventImageId 이미지 식별자
 * @param imageType 이미지 유형
 * @param imageUrl 이미지 URL
 * @param displayOrder 노출 순서
 */
public record EventImageResponse(
        Long eventImageId,
        EventImage.ImageType imageType,
        String imageUrl,
        Integer displayOrder
) {

    /**
     * 이벤트 이미지를 응답 DTO로 변환합니다.
     *
     * @param eventImage 이벤트 이미지 엔티티
     * @return 이벤트 이미지 응답
     */
    public static EventImageResponse from(EventImage eventImage) {
        return new EventImageResponse(
                eventImage.getId(),
                eventImage.getImageType(),
                eventImage.getImageUrl(),
                eventImage.getDisplayOrder()
        );
    }
}
