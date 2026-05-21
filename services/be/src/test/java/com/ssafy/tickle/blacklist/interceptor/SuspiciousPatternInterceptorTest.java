package com.ssafy.tickle.blacklist.interceptor;

import com.ssafy.tickle.blacklist.application.BlacklistService;
import com.ssafy.tickle.blacklist.presentation.dto.InternalAddBlacklistRequest;
import com.ssafy.tickle.common.interceptor.SuspiciousPatternInterceptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

/**
 * SuspiciousPatternInterceptor 단위 테스트입니다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("SuspiciousPatternInterceptor 단위 테스트")
class SuspiciousPatternInterceptorTest {

    @InjectMocks
    private SuspiciousPatternInterceptor interceptor;

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    @Mock
    private BlacklistService blacklistService;

    @Mock
    private SetOperations<String, String> setOps;

    @Mock
    private ValueOperations<String, String> valueOps;

    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        request.setRemoteAddr("192.168.1.1");
        request.setParameter("userId", "100");
    }

    @Nested
    @DisplayName("userId 없는 요청")
    class NoUserIdTest {

        @Test
        @DisplayName("userId 파라미터가 없으면 탐지를 건너뛴다")
        void noUserId_skipsDetection() throws Exception {
            MockHttpServletRequest noUserRequest = new MockHttpServletRequest();

            boolean result = interceptor.preHandle(noUserRequest, response, null);

            assertThat(result).isTrue();
            then(stringRedisTemplate).shouldHaveNoInteractions();
        }
    }

    @Nested
    @DisplayName("Multi-IP 탐지")
    class MultiIpTest {

        @BeforeEach
        void setUpRedis() {
            given(stringRedisTemplate.opsForSet()).willReturn(setOps);
            given(stringRedisTemplate.opsForValue()).willReturn(valueOps);
            given(valueOps.increment(anyString())).willReturn(0L);
        }

        @Test
        @DisplayName("IP 수가 임계값 이하면 블랙리스트에 등록하지 않는다")
        void underThreshold_doesNotBlacklist() throws Exception {
            given(setOps.add(anyString(), anyString())).willReturn(1L);
            given(setOps.size(anyString())).willReturn(2L);

            interceptor.preHandle(request, response, null);

            then(blacklistService).should(never()).addBlacklistInternal(any());
        }

        @Test
        @DisplayName("IP 수가 3개 초과하면 SUSPICIOUS_PATTERN으로 블랙리스트에 등록한다")
        void overThreshold_blacklistsWithSuspiciousPattern() throws Exception {
            given(setOps.add(anyString(), anyString())).willReturn(1L);
            given(setOps.size(anyString())).willReturn(4L);

            interceptor.preHandle(request, response, null);

            ArgumentCaptor<InternalAddBlacklistRequest> captor =
                    ArgumentCaptor.forClass(InternalAddBlacklistRequest.class);
            then(blacklistService).should().addBlacklistInternal(captor.capture());
            assertThat(captor.getValue().userId()).isEqualTo(100L);
            assertThat(captor.getValue().reason()).isEqualTo("SUSPICIOUS_PATTERN");
        }

        @Test
        @DisplayName("첫 번째 IP 추가 시 60초 TTL을 설정한다")
        void firstIp_setsTtl() throws Exception {
            given(setOps.add(anyString(), anyString())).willReturn(1L);
            given(setOps.size(anyString())).willReturn(1L);

            interceptor.preHandle(request, response, null);

            then(stringRedisTemplate).should().expire(contains("suspicious:ips:"), eq(60L), any());
        }
    }

    @Nested
    @DisplayName("좌석 선점 해제 반복 탐지")
    class HoldReleaseRepeatTest {

        @BeforeEach
        void setUpRedis() {
            given(stringRedisTemplate.opsForSet()).willReturn(setOps);
            given(stringRedisTemplate.opsForValue()).willReturn(valueOps);
            given(setOps.add(anyString(), anyString())).willReturn(1L);
            given(setOps.size(anyString())).willReturn(1L);
        }

        @Test
        @DisplayName("DELETE /seats/hold 요청이 아니면 카운트하지 않는다")
        void notDeleteHoldRequest_doesNotCount() throws Exception {
            request.setMethod("GET");
            request.setRequestURI("/api/v1/events/1/schedules/1/seats");

            interceptor.preHandle(request, response, null);

            then(valueOps).should(never()).increment(contains("hold-release"));
        }

        @Test
        @DisplayName("DELETE /seats/hold 5회 미만은 블랙리스트에 등록하지 않는다")
        void underThreshold_doesNotBlacklist() throws Exception {
            request.setMethod("DELETE");
            request.setRequestURI("/api/v1/events/1/schedules/1/seats/hold");
            given(valueOps.increment(contains("hold-release"))).willReturn(4L);

            interceptor.preHandle(request, response, null);

            then(blacklistService).should(never()).addBlacklistInternal(any());
        }

        @Test
        @DisplayName("DELETE /seats/hold 5회 이상이면 SUSPICIOUS_PATTERN으로 블랙리스트에 등록한다")
        void overThreshold_blacklists() throws Exception {
            request.setMethod("DELETE");
            request.setRequestURI("/api/v1/events/1/schedules/1/seats/hold");
            given(valueOps.increment(contains("hold-release"))).willReturn(5L);

            interceptor.preHandle(request, response, null);

            ArgumentCaptor<InternalAddBlacklistRequest> captor =
                    ArgumentCaptor.forClass(InternalAddBlacklistRequest.class);
            then(blacklistService).should().addBlacklistInternal(captor.capture());
            assertThat(captor.getValue().reason()).isEqualTo("SUSPICIOUS_PATTERN");
            assertThat(captor.getValue().detail()).contains("5회");
        }
    }

    @Nested
    @DisplayName("Redis 장애 처리")
    class RedisFailureTest {

        @Test
        @DisplayName("Redis 장애 시에도 요청을 통과시킨다")
        void redisFailure_passesThrough() throws Exception {
            given(stringRedisTemplate.opsForSet()).willThrow(new QueryTimeoutException("timeout"));

            boolean result = interceptor.preHandle(request, response, null);

            assertThat(result).isTrue();
            then(blacklistService).should(never()).addBlacklistInternal(any());
        }
    }
}
