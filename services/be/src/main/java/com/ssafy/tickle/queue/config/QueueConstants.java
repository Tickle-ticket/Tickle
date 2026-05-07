package com.ssafy.tickle.queue.config;

import java.time.Duration;

/**
 * queue 도메인 전용 상수 모음입니다.
 */
public final class QueueConstants {

    public static final long SLOT_LIMIT = 100L;
    public static final long SSE_TIMEOUT_MILLIS = 30L * 60L * 1000L;
    public static final long DEFAULT_ADMISSION_RATE_PER_MINUTE = 30L;

    public static final Duration REQUEST_TTL = Duration.ofMinutes(5);
    public static final Duration QUEUE_TOKEN_TTL = Duration.ofHours(3);
    public static final Duration ADMIT_TOKEN_TTL = Duration.ofMinutes(10);
    public static final Duration TERMINAL_STATUS_TTL = Duration.ofMinutes(10);
    public static final Duration ETA_WINDOW = Duration.ofMinutes(3);

    public static final String ENTER_REQUEST_TOPIC = "queue.enter-request";
    public static final String ADMISSION_LOCK_KEY_PREFIX = "lock:queue:admission:";
    public static final String EVENT_KEY_PREFIX = "queue:event:";
    public static final String ENTER_KEY_PREFIX = "queue:enter:";
    public static final String ENTER_REFERENCE_KEY_PREFIX = "queue:enter:reference:";
    public static final String STATUS_KEY_PREFIX = "queue:status:";
    public static final String WAITING_KEY_PREFIX = "queue:waiting:";
    public static final String ADMITTED_KEY_PREFIX = "queue:admitted:";
    public static final String ADMISSION_HISTORY_KEY_PREFIX = "queue:admission:history:";
    public static final String ADMIT_TOKEN_KEY_PREFIX = "queue:token:admit:";
    public static final String QUEUE_TOKEN_REQUEST_KEY_PREFIX = "queue:token:request:";
    public static final String WAITING_EVENTS_KEY = "queue:events:waiting";
    public static final String ADMITTED_EVENTS_KEY = "queue:events:admitted";

    private QueueConstants() {
    }
}
