package com.ssafy.tickle.event.infrastructure.persistence;

import com.ssafy.tickle.event.domain.EventImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 이벤트 이미지 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface EventImageRepository extends JpaRepository<EventImage, Long> {

    /**
     * 단일 이벤트의 이미지를 노출 순서대로 조회합니다.
     *
     * @param eventId 이벤트 식별자
     * @return 이미지 목록
     */
    List<EventImage> findByEventIdOrderByDisplayOrderAsc(Long eventId);

    /**
     * 여러 이벤트의 특정 타입 이미지를 이벤트별, 노출 순서별로 조회합니다.
     *
     * @param eventIds 이벤트 식별자 목록
     * @param imageType 이미지 타입
     * @return 이미지 목록
     */
    List<EventImage> findByEventIdInAndImageTypeOrderByEventIdAscDisplayOrderAsc(
            List<Long> eventIds,
            EventImage.ImageType imageType
    );
}
