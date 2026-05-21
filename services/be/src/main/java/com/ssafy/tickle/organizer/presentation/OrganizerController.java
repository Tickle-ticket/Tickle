package com.ssafy.tickle.organizer.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.organizer.application.OrganizerListService;
import com.ssafy.tickle.organizer.presentation.dto.OrganizerListResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 범용 주최자 조회 API를 제공합니다.
 */
@RestController
@RequestMapping("/api/v1/organizers")
@RequiredArgsConstructor
public class OrganizerController implements OrganizerApiDoc {

    private final OrganizerListService organizerListService;

    /**
     * 주최자 목록을 조회합니다.
     *
     * @return 주최자 목록 응답
     */
    @Override
    @GetMapping
    public ResponseEntity<BaseResponse<OrganizerListResponse>> getOrganizers() {
        return ResponseEntity.ok(BaseResponse.success(organizerListService.getOrganizers()));
    }
}
