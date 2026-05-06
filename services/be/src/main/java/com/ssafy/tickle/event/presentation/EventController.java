package com.ssafy.tickle.event.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.event.application.EventService;
import com.ssafy.tickle.event.presentation.dto.CategoryRankingResponse;
import com.ssafy.tickle.event.presentation.dto.EventDetailResponse;
import com.ssafy.tickle.event.presentation.dto.EventListResponse;
import com.ssafy.tickle.event.presentation.dto.EventSessionsResponse;
import com.ssafy.tickle.event.presentation.dto.OpeningSoonEventsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
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
     * 이벤트 목록을 키워드/조건 기반 검색 합니다.
     *
     * @param keyword 제목 검색어
     * @param categoryId 카테고리 식별자
     * @param page 페이지 번호
     * @param size 페이지 크기
     * @return 이벤트 목록 응답
     */
    @Override
    @GetMapping
    public ResponseEntity<BaseResponse<EventListResponse>> getEvents(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(eventService.getEvents(keyword, categoryId, page, size, userId)));
    }

    /**
     * 랭킹 TOP5를 조회합니다.
     *
     * @param categoryId 카테고리 식별자(없으면 전체)
     * @return 랭킹 응답
     */
    @Override
    @GetMapping("/ranking")
    public ResponseEntity<BaseResponse<CategoryRankingResponse>> getRanking(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long userId
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(eventService.getRanking(categoryId, userId)));
    }

    /**
     * 오픈 임박 공연 목록을 조회합니다.
     *
     * @return 오픈 임박 공연 목록 응답
     */
    @Override
    @GetMapping("/opening-soon")
    public ResponseEntity<BaseResponse<OpeningSoonEventsResponse>> getOpeningSoonEvents(
            @RequestParam(required = false) Long userId
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(eventService.getOpeningSoonEvents(userId)));
    }

    /**
     * 이벤트 상세 정보를 조회합니다.
     *
     * @param eventId 이벤트 식별자
     * @return 이벤트 상세 응답
     */
    @Override
    @GetMapping("/{eventId}")
    public ResponseEntity<BaseResponse<EventDetailResponse>> getEventDetail(
            @PathVariable Long eventId,
            @RequestParam(required = false) Long userId
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(eventService.getEventDetail(eventId, userId)));
    }

    /**
     * 특정 공연의 회차 목록을 조회합니다.
     *
     * @param eventId 공연 식별자
     * @return 공연 회차 목록 응답
     */
    @Override
    @GetMapping("/{eventId}/sessions")
    public ResponseEntity<BaseResponse<EventSessionsResponse>> getEventSessions(
            @PathVariable Long eventId
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(eventService.getEventSessions(eventId)));
    }
}
