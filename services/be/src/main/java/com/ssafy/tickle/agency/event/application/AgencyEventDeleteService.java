package com.ssafy.tickle.agency.event.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.infrastructure.persistence.EventImageRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.favorite.infrastructure.persistence.FavoriteRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSeatRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSectionRepository;
import com.ssafy.tickle.seat.infrastructure.persistence.SessionSeatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * 기획사 공연 삭제를 담당합니다.
 *
 * <p>예매 시작 전인 공연만 삭제할 수 있으며,
 * 등록 과정에서 생성된 회차/좌석/가격정책/이미지/찜 데이터도 함께 hard delete 합니다.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AgencyEventDeleteService {

    private final EventRepository eventRepository;
    private final FavoriteRepository favoriteRepository;
    private final EventImageRepository eventImageRepository;
    private final SessionSeatRepository sessionSeatRepository;
    private final EventSeatRepository eventSeatRepository;
    private final EventSectionRepository eventSectionRepository;
    private final EventSessionRepository eventSessionRepository;
    private final EventPricePolicyRepository eventPricePolicyRepository;

    @Transactional
    public void deleteEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연을 찾을 수 없습니다."));

        validateDeletable(event);

        favoriteRepository.deleteByEvent_Id(eventId);
        eventImageRepository.deleteByEventId(eventId);
        sessionSeatRepository.deleteByEventId(eventId);
        eventSeatRepository.deleteByEventId(eventId);
        eventSectionRepository.deleteByEventId(eventId);
        eventSessionRepository.deleteByEventId(eventId);
        eventPricePolicyRepository.deleteByEventId(eventId);

        eventRepository.delete(event);
    }

    private void validateDeletable(Event event) {
        Instant salesStartAt = event.getSalesStartAt();
        if (salesStartAt != null && !Instant.now().isBefore(salesStartAt)) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "예매 시작 전인 공연만 삭제할 수 있습니다.");
        }
    }
}
