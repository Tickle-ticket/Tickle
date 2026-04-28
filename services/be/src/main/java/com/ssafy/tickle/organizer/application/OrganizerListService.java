package com.ssafy.tickle.organizer.application;

import com.ssafy.tickle.event.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.organizer.presentation.dto.OrganizerListItemResponse;
import com.ssafy.tickle.organizer.presentation.dto.OrganizerListResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 범용 주최자 목록 조회를 담당합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizerListService {

    private final OrganizerRepository organizerRepository;

    /**
     * 주최자 목록을 조회합니다.
     *
     * @return 주최자 목록 응답 DTO
     */
    public OrganizerListResponse getOrganizers() {
        return OrganizerListResponse.from(
                organizerRepository.findAllOrderByOrganizerName().stream()
                        .map(OrganizerListItemResponse::from)
                        .toList()
        );
    }
}
