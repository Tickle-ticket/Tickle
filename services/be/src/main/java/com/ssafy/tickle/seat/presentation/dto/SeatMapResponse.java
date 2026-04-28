package com.ssafy.tickle.seat.presentation.dto;

import java.util.List;

/**
 * 공연 회차 전체 좌석 배치도 응답 DTO입니다.
 *
 * <p>FE는 이 응답의 상태(saleStatus)와 하드코딩된 좌석 위치(좌표)를 합산하여 배치도를 렌더링한다.</p>
 *
 * @param sections 구역별 좌석 목록 (displayOrder 오름차순)
 */
public record SeatMapResponse(List<SeatSectionResponse> sections) {
}
