package com.ssafy.tickle.admin.presentation;

import com.ssafy.tickle.common.response.BaseResponse;
import com.ssafy.tickle.user.presentation.interceptor.UserAccessLogInterceptor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 시연용 부하 테스트 트리거 API입니다.
 *
 * <p>관리자 대시보드의 "핵발사버튼"이 이 API를 호출합니다.
 * 서버에 설치된 k6로 demo_load.js 시나리오를 실행해
 * 0→500명 점진적 트래픽을 발생시킵니다.</p>
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/load-test")
public class AdminLoadTestController {

    private static final AtomicBoolean running = new AtomicBoolean(false);
    private final StringRedisTemplate stringRedisTemplate;

    /**
     * 시연용 부하 테스트를 시작합니다.
     *
     * <p>k6가 서버에 설치되어 있어야 합니다.
     * 이미 실행 중이면 409를 반환합니다.</p>
     */
    @PostMapping("/start")
    public ResponseEntity<BaseResponse<Map<String, String>>> start() {
        if (running.getAndSet(true)) {
            return ResponseEntity.status(409)
                    .body(BaseResponse.error(409, "이미 부하 테스트가 실행 중입니다."));
        }

        // 이전 테스트의 접속자 ZSet 초기화 — 버튼을 누를 때마다 0명부터 시작
        try {
            stringRedisTemplate.delete(UserAccessLogInterceptor.ACTIVE_USERS_ZSET_KEY);
            log.info("[LoadTest] active_users_zset 초기화 완료");
        } catch (Exception e) {
            log.warn("[LoadTest] active_users_zset 초기화 실패 (무시): {}", e.getMessage());
        }

        String scriptPath = System.getProperty("user.dir") +
                "/performance-tests/scenarios/demo_load.js";
        String baseUrl = "https://tickle-ticket.co.kr";
        String eventId = "6062";
        String email = "k6-perf-test@tickle.com";
        String password = "PerfTest1!";

        ProcessBuilder pb = new ProcessBuilder(
                "k6", "run",
                "--env", "BASE_URL=" + baseUrl,
                "--env", "TEST_USER_EMAIL=" + email,
                "--env", "TEST_USER_PASSWORD=" + password,
                "--env", "TEST_EVENT_ID=" + eventId,
                scriptPath
        );
        pb.redirectErrorStream(true);

        Thread thread = new Thread(() -> {
            try {
                log.info("[LoadTest] 시연 부하 테스트 시작");
                Process process = pb.start();
                process.waitFor();
                log.info("[LoadTest] 시연 부하 테스트 완료");
            } catch (Exception e) {
                log.error("[LoadTest] 실행 실패: {}", e.getMessage(), e);
            } finally {
                running.set(false);
            }
        });
        thread.setDaemon(true);
        thread.start();

        return ResponseEntity.ok(BaseResponse.success(
                Map.of("status", "started", "message", "부하 테스트가 시작됐습니다. 약 4분간 실행됩니다.")
        ));
    }

    /**
     * 현재 부하 테스트 실행 여부를 반환합니다.
     */
    @PostMapping("/status")
    public ResponseEntity<BaseResponse<Map<String, Object>>> status() {
        return ResponseEntity.ok(BaseResponse.success(
                Map.of("running", running.get())
        ));
    }
}
