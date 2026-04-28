package com.ssafy.tickle.agency.event.application;

import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventSessionRequest;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventSessionsRequest;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * 기획사 공연 회차 등록을 담당합니다.
 *
 * <p>기본정보가 저장된 공연에 회차 목록만 추가합니다.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AgencyEventSessionService {

    private final EventRepository eventRepository;
    private final EventSessionRepository eventSessionRepository;

    /**
     * 공연의 회차를 등록합니다.
     */
    @Transactional
    public List<EventSession> createSessions(Long eventId, AgencyCreateEventSessionsRequest request) {
        Event event = getEvent(eventId);
        List<AgencyCreateEventSessionRequest> sessionRequests = new ArrayList<>(request.sessions());
        sessionRequests.sort(Comparator.comparing(AgencyCreateEventSessionRequest::startAt));
        List<EventSession> sessions = new ArrayList<>(sessionRequests.size());

        for (int i = 0; i < sessionRequests.size(); i++) {
            AgencyCreateEventSessionRequest sessionRequest = sessionRequests.get(i);
            validateSessionTimeline(sessionRequest);

            sessions.add(EventSession.builder()
                    .event(event)
                    .sessionNo(i + 1)
                    .startAt(sessionRequest.startAt())
                    .endAt(sessionRequest.endAt())
                    .salesOpenAt(sessionRequest.salesOpenAt())
                    .salesCloseAt(sessionRequest.salesCloseAt())
                    .status(EventSession.Status.PENDING)
                    .build());
        }

        return eventSessionRepository.saveAll(sessions);
    }

    private void validateSessionTimeline(AgencyCreateEventSessionRequest request) {
        // 회차 진행 시작 시각은 종료 시각보다 앞서야 한다.
        if (!request.startAt().isBefore(request.endAt())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "회차 시작 시각은 종료 시각보다 빨라야 합니다.");
        }
        // 예매 오픈 시각도 예매 종료 시각보다 앞서야 한다.
        if (!request.salesOpenAt().isBefore(request.salesCloseAt())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "회차 예매 시작 시각은 종료 시각보다 빨라야 합니다.");
        }
    }

    private Event getEvent(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연을 찾을 수 없습니다."));
    }
}
