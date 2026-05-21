package com.ssafy.tickle.cancellation.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 취소표 재배분 관련 자동화 작업을 수행하는 스케줄러입니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CancellationRedistributionScheduler {

    private final CancellationRedistributionService redistributionService;

    /**
     * 1분마다 만료된 취소표 제안을 체크하고 다음 대기자에게 승계합니다.
     */
    @Scheduled(fixedDelay = 60_000L) // 1분
    public void checkExpiredOffers() {
        log.debug("만료된 취소표 제안 체크 스케줄러 시작");
        try {
            redistributionService.processExpiredOffers();
        } catch (Exception e) {
            log.error("취소표 만료 처리 중 오류 발생", e);
        }
    }
}
