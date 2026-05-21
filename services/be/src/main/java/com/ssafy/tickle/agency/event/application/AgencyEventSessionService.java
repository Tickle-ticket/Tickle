package com.ssafy.tickle.agency.event.application;

import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventSessionRequest;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventSessionsRequest;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
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

    private final EventSessionRepository eventSessionRepository;
    private final AgencyAuthorizationService agencyAuthorizationService;

    /**
     * 공연의 회차를 등록합니다.
     */
    @Transactional
    public List<EventSession> createSessions(Long userId, Long eventId, AgencyCreateEventSessionsRequest request) {
        Event event = agencyAuthorizationService.getOwnedEvent(userId, eventId);
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

        List<EventSession> savedSessions = eventSessionRepository.saveAll(sessions);
        updateEventSalesPeriod(event);
        return savedSessions;
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

    private void updateEventSalesPeriod(Event event) {
        List<EventSession> sessions = eventSessionRepository.findByEventIdOrderByStartAtAsc(event.getId());

        if (sessions.isEmpty()) {
            return;
        }

        Instant firstSalesOpenAt = sessions.stream()
                .map(EventSession::getSalesOpenAt)
                .min(Comparator.naturalOrder())
                .orElseThrow(() -> new BaseException(GlobalErrorCode.INTERNAL_SERVER_ERROR, "회차 예매 시작 시각이 없습니다."));

        Instant lastSalesCloseAt = sessions.stream()
                .map(EventSession::getSalesCloseAt)
                .max(Comparator.naturalOrder())
                .orElseThrow(() -> new BaseException(GlobalErrorCode.INTERNAL_SERVER_ERROR, "회차 예매 종료 시각이 없습니다."));

        event.updateSalesPeriod(firstSalesOpenAt, lastSalesCloseAt);
    }
}
