package com.ssafy.tickle.event.config;

import java.time.Duration;

/**
 * event 도메인 전용 상수 모음입니다.
 */
public final class EventConstants {

    public static final String EVENT_RANKING_CACHE_KEY_PREFIX = "event:ranking:";
    public static final Duration EVENT_RANKING_CACHE_TTL = Duration.ofMinutes(30);
    public static final String EVENT_OPENING_SOON_CACHE_KEY = "event:opening-soon";
    public static final Duration EVENT_OPENING_SOON_CACHE_TTL = Duration.ofMinutes(10);
    public static final String EVENT_SESSIONS_CACHE_KEY_PREFIX = "event:sessions:";
    public static final Duration CANCELLATION_WAIT_OPEN_DELAY = Duration.ofMinutes(10);

    private EventConstants() {
    }
}
