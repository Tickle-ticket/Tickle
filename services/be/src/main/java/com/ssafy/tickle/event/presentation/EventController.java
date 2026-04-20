package com.ssafy.tickle.event.presentation;

import com.ssafy.tickle.common.exception.code.SuccessCode;
import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.event.application.EventService;
import com.ssafy.tickle.event.presentation.dto.EventDetailResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 이벤트 상세 조회 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController implements EventApiDoc {

    private final EventService eventService;

    /**
     * 이벤트 상세 정보를 조회합니다.
     *
     * @param eventId 이벤트 식별자
     * @return 이벤트 상세 응답
     */
    @Override
    @GetMapping("/{eventId}")
    public ResponseEntity<BaseResponse<EventDetailResponse>> getEventDetail(@PathVariable Long eventId) {
        return ResponseEntity
                .status(SuccessCode.OK.getStatus())
                .body(BaseResponse.success(SuccessCode.OK, eventService.getEventDetail(eventId)));
    }
}
