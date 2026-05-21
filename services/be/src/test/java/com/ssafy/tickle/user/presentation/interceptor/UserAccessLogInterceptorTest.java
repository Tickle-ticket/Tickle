package com.ssafy.tickle.user.presentation.interceptor;

import com.ssafy.tickle.common.util.JwtProvider;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.domain.UserAccessLog;
import com.ssafy.tickle.user.infrastructure.persistence.UserAccessLogRepository;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserAccessLogInterceptorTest {

    @InjectMocks
    private UserAccessLogInterceptor userAccessLogInterceptor;

    @Mock
    private JwtProvider jwtProvider;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserAccessLogRepository userAccessLogRepository;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Test
    @DisplayName("로그인하지 않은 사용자는 로깅을 건너뛰고 정상 통과한다")
    void preHandle_NoUserId() throws Exception {
        // given
        when(request.getMethod()).thenReturn("GET");
        when(jwtProvider.extractUserIdFromRequest(request)).thenReturn(Optional.empty());

        // when
        boolean result = userAccessLogInterceptor.preHandle(request, response, new Object());

        // then
        assertThat(result).isTrue();
        verifyNoInteractions(redisTemplate);
        verifyNoInteractions(userAccessLogRepository);
    }

    @Test
    @DisplayName("정상 로그인 사용자가 첫 접속 시 로깅을 수행한다")
    void preHandle_FirstVisit() throws Exception {
        // given
        Long userId = 1L;
        String ipAddress = "192.168.0.1";
        
        when(request.getMethod()).thenReturn("GET");
        when(jwtProvider.extractUserIdFromRequest(request)).thenReturn(Optional.of(userId));
        when(request.getHeader("X-Forwarded-For")).thenReturn(null);
        when(request.getHeader("Proxy-Client-IP")).thenReturn(null);
        when(request.getHeader("WL-Proxy-Client-IP")).thenReturn(null);
        when(request.getHeader("HTTP_CLIENT_IP")).thenReturn(null);
        when(request.getHeader("HTTP_X_FORWARDED_FOR")).thenReturn(null);
        when(request.getRemoteAddr()).thenReturn(ipAddress);
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), eq("1"), any(Duration.class))).thenReturn(true);

        User mockUser = mock(User.class);
        when(userRepository.getReferenceById(userId)).thenReturn(mockUser);

        // when
        boolean result = userAccessLogInterceptor.preHandle(request, response, new Object());

        // then
        assertThat(result).isTrue();
        verify(userAccessLogRepository, times(1)).save(any(UserAccessLog.class));
    }

    @Test
    @DisplayName("정상 로그인 사용자가 같은 날 동일 IP로 중복 접속 시 로깅을 생략한다")
    void preHandle_DuplicateVisit() throws Exception {
        // given
        Long userId = 1L;
        String ipAddress = "192.168.0.1";

        when(request.getMethod()).thenReturn("GET");
        when(jwtProvider.extractUserIdFromRequest(request)).thenReturn(Optional.of(userId));
        when(request.getHeader("X-Forwarded-For")).thenReturn(null);
        when(request.getHeader("Proxy-Client-IP")).thenReturn(null);
        when(request.getHeader("WL-Proxy-Client-IP")).thenReturn(null);
        when(request.getHeader("HTTP_CLIENT_IP")).thenReturn(null);
        when(request.getHeader("HTTP_X_FORWARDED_FOR")).thenReturn(null);
        when(request.getRemoteAddr()).thenReturn(ipAddress);

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        // setIfAbsent가 false를 반환하면 이미 접속한 것
        when(valueOperations.setIfAbsent(anyString(), eq("1"), any(Duration.class))).thenReturn(false);

        // when
        boolean result = userAccessLogInterceptor.preHandle(request, response, new Object());

        // then
        assertThat(result).isTrue();
        verifyNoInteractions(userAccessLogRepository);
    }
}
