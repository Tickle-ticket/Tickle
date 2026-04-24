package com.ssafy.tickle.event.config;

import java.time.Duration;

/**
 * event 도메인 전용 상수 모음입니다.
 */
public final class EventConstants {

    public static final String EVENT_RANKING_CACHE_KEY_PREFIX = "event:ranking:";
    public static final Duration EVENT_RANKING_CACHE_TTL = Duration.ofMinutes(30);

    private EventConstants() {
    }
}
