package com.ssafy.tickle.event.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventImage;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventImageRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import com.ssafy.tickle.event.presentation.dto.EventDetailResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 이벤트 상세 조회 유스케이스를 처리하는 서비스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventService {

    private final EventRepository eventRepository;
    private final EventImageRepository eventImageRepository;
    private final EventSessionRepository eventSessionRepository;
    private final EventPricePolicyRepository eventPricePolicyRepository;

    /**
     * 이벤트 상세 정보를 조회합니다.
     *
     * @param eventId 이벤트 식별자
     * @return 이벤트 상세 응답
     */
    public EventDetailResponse getEventDetail(Long eventId) {
        Event event = eventRepository.findWithDetailsById(eventId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연을 찾을 수 없습니다."));

        List<EventImage> images = eventImageRepository.findByEvent_IdOrderByDisplayOrderAsc(eventId);
        List<EventSession> sessions = eventSessionRepository.findByEvent_IdOrderByStartAtAsc(eventId);
        List<EventPricePolicy> pricePolicies = eventPricePolicyRepository.findByEvent_IdOrderByDisplayOrderAsc(eventId);

        return EventDetailResponse.from(event, images, sessions, pricePolicies);
    }
}
