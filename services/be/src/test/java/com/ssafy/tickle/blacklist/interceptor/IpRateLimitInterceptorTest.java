package com.ssafy.tickle.blacklist.interceptor;

import com.ssafy.tickle.blacklist.application.BlacklistService;
import com.ssafy.tickle.blacklist.presentation.dto.InternalAddBlacklistRequest;
import com.ssafy.tickle.common.interceptor.IpRateLimitInterceptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.QueryTimeoutException;
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
 * IpRateLimitInterceptor 단위 테스트입니다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("IpRateLimitInterceptor 단위 테스트")
class IpRateLimitInterceptorTest {

    @InjectMocks
    private IpRateLimitInterceptor interceptor;

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    @Mock
    private BlacklistService blacklistService;

    @Mock
    private ValueOperations<String, String> valueOps;

    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        request.setRemoteAddr("192.168.1.1");
        given(stringRedisTemplate.opsForValue()).willReturn(valueOps);
    }

    @Nested
    @DisplayName("요청 횟수 제한 이하")
    class UnderLimitTest {

        @Test
        @DisplayName("20회 이하 요청은 블랙리스트에 등록하지 않는다")
        void underLimit_doesNotBlacklist() throws Exception {
            given(valueOps.increment(anyString())).willReturn(10L);

            boolean result = interceptor.preHandle(request, response, null);

            assertThat(result).isTrue();
            then(blacklistService).should(never()).addBlacklistInternal(any());
        }

        @Test
        @DisplayName("첫 번째 요청에서 TTL을 설정한다")
        void firstRequest_setsTtl() throws Exception {
            given(valueOps.increment(anyString())).willReturn(1L);

            interceptor.preHandle(request, response, null);

            then(stringRedisTemplate).should().expire(anyString(), eq(10L), any());
        }

        @Test
        @DisplayName("첫 번째 요청이 아니면 TTL을 재설정하지 않는다")
        void notFirstRequest_doesNotResetTtl() throws Exception {
            given(valueOps.increment(anyString())).willReturn(5L);

            interceptor.preHandle(request, response, null);

            then(stringRedisTemplate).should(never()).expire(anyString(), anyLong(), any());
        }
    }

    @Nested
    @DisplayName("요청 횟수 제한 초과")
    class OverLimitTest {

        @Test
        @DisplayName("21회 초과 시 userId가 있으면 블랙리스트에 등록한다")
        void overLimit_withUserId_blacklists() throws Exception {
            given(valueOps.increment(anyString())).willReturn(21L);
            request.setParameter("userId", "100");

            boolean result = interceptor.preHandle(request, response, null);

            assertThat(result).isTrue();
            ArgumentCaptor<InternalAddBlacklistRequest> captor =
                    ArgumentCaptor.forClass(InternalAddBlacklistRequest.class);
            then(blacklistService).should().addBlacklistInternal(captor.capture());
            assertThat(captor.getValue().userId()).isEqualTo(100L);
            assertThat(captor.getValue().reason()).isEqualTo("IP_RATE_LIMIT");
        }

        @Test
        @DisplayName("21회 초과 시 userId가 없으면 블랙리스트에 등록하지 않는다")
        void overLimit_withoutUserId_doesNotBlacklist() throws Exception {
            given(valueOps.increment(anyString())).willReturn(21L);

            boolean result = interceptor.preHandle(request, response, null);

            assertThat(result).isTrue();
            then(blacklistService).should(never()).addBlacklistInternal(any());
        }

        @Test
        @DisplayName("X-Real-IP 헤더가 있으면 해당 IP를 기준으로 카운트한다")
        void withXRealIp_usesHeaderIp() throws Exception {
            request.addHeader("X-Real-IP", "10.0.0.1");
            given(valueOps.increment("rate:ip:10.0.0.1")).willReturn(5L);

            interceptor.preHandle(request, response, null);

            then(valueOps).should().increment("rate:ip:10.0.0.1");
        }
    }

    @Nested
    @DisplayName("Redis 장애 처리")
    class RedisFailureTest {

        @Test
        @DisplayName("Redis 장애 시에도 요청을 통과시킨다")
        void redisFailure_passesThrough() throws Exception {
            given(valueOps.increment(anyString())).willThrow(new QueryTimeoutException("Redis timeout"));

            boolean result = interceptor.preHandle(request, response, null);

            assertThat(result).isTrue();
            then(blacklistService).should(never()).addBlacklistInternal(any());
        }
    }
}
