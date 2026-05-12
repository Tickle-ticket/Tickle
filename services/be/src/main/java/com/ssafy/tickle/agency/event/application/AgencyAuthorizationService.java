package com.ssafy.tickle.agency.event.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.organizer.domain.Organizer;
import com.ssafy.tickle.organizer.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.domain.UserRole;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AgencyAuthorizationService {

    private final UserRepository userRepository;
    private final OrganizerRepository organizerRepository;
    private final EventRepository eventRepository;

    public Organizer getOrganizer(Long userId) {
        User user = getOrganizerUser(userId);
        return organizerRepository.findById(user.getOrganizerId())
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "소속 기획사를 찾을 수 없습니다."));
    }

    public Event getOwnedEvent(Long userId, Long eventId) {
        User user = getOrganizerUser(userId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연을 찾을 수 없습니다."));

        if (!event.getOrganizer().getId().equals(user.getOrganizerId())) {
            throw new BaseException(GlobalErrorCode.ACCESS_DENIED, "소속 기획사의 공연이 아닙니다.");
        }

        return event;
    }

    private User getOrganizerUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "사용자를 찾을 수 없습니다."));

        if (user.getRole() != UserRole.ORGANIZER || user.getOrganizerId() == null) {
            throw new BaseException(GlobalErrorCode.ACCESS_DENIED, "기획사 권한이 없는 사용자입니다.");
        }

        return user;
    }
}
