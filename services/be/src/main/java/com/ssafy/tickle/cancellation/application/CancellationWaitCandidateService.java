package com.ssafy.tickle.cancellation.application;

import com.ssafy.tickle.cancellation.domain.CancellationErrorCode;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateCreateRequest;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateCreateResponse;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.common.util.RedisLockManager;
import com.ssafy.tickle.queue.application.service.QueueStatusService;
import com.ssafy.tickle.queue.domain.QueueScope;
import lombok.RequiredArgsConstructor;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;

/**
 * 좌석 단위 예매 대기 신청의 큐 검증과 락 수명을 관리하는 서비스 클래스입니다.
 */
@Service
@RequiredArgsConstructor
public class CancellationWaitCandidateService {

    private static final String SESSION_LOCK_KEY_PREFIX = "cancellation-wait:session:";

    private final QueueStatusService queueStatusService;
    private final RedisLockManager redisLockManager;
    private final CancellationWaitCandidateTxService cancellationWaitCandidateTxService;

    /**
     * 좌석 단위 예매 대기 신청을 생성합니다.
     *
     * <p>예매 대기 큐 입장 토큰을 검증한 뒤, 확정 예매 수와 활성 예매 대기 수를 합산해
     * 회차 기준 4매 제한을 적용합니다. 좌석 선점과 동일하게 회차 단위 락 안에서 중복 신청 검증과
     * 대기 순번 부여를 처리합니다.</p>
     *
     * @param eventId 공연 식별자
     * @param scheduleId 회차 식별자
     * @param userId 사용자 식별자
     * @param admitToken 예매 대기 큐 입장 토큰
     * @param request 예매 대기 신청 요청
     * @return 생성된 예매 대기 신청 정보
     */
    public CancellationWaitCandidateCreateResponse createCandidates(
            Long eventId,
            Long scheduleId,
            Long userId,
            String admitToken,
            CancellationWaitCandidateCreateRequest request
    ) {
        // 예매 대기 페이지 입장과 같은 scope의 admitToken인지 재검증해 직접 호출을 차단합니다.
        queueStatusService.validateAdmitToken(QueueScope.CANCELLATION_WAIT, scheduleId, userId, admitToken);

        // 같은 요청 안의 중복 좌석은 동일 좌석에 여러 순번을 만들 수 있으므로 먼저 제거하지 않고 거부합니다.
        List<Long> requestedSeatIds = validateAndNormalizeSeatIds(request.sessionSeatIds());

        // 좌석 선점과 같은 회차 단위 락으로 동시에 들어온 신청의 4매 제한/순번 계산을 직렬화합니다.
        String sessionLockKey = SESSION_LOCK_KEY_PREFIX + scheduleId;
        if (!redisLockManager.tryLock(sessionLockKey)) {
            throw new BaseException(CancellationErrorCode.CANDIDATE_LOCK_FAILED);
        }

        try {
            return cancellationWaitCandidateTxService.createCandidatesInTransaction(
                    eventId,
                    scheduleId,
                    userId,
                    requestedSeatIds
            );
        } catch (ObjectOptimisticLockingFailureException e) {
            // 회차 락 이후 커밋 전후의 낙관락 충돌은 좌석 선점과 동일하게 재시도 가능한 409로 변환합니다.
            throw new BaseException(CancellationErrorCode.CANDIDATE_LOCK_FAILED);
        } finally {
            redisLockManager.unlock(sessionLockKey);
        }
    }

    /**
     * 요청 좌석 목록의 중복을 검증하고 순서를 유지한 고유 목록을 반환합니다.
     *
     * @param seatIds 요청 좌석 식별자 목록
     * @return 중복이 제거된 좌석 식별자 목록
     */
    private List<Long> validateAndNormalizeSeatIds(List<Long> seatIds) {
        LinkedHashSet<Long> uniqueSeatIds = new LinkedHashSet<>(seatIds);
        if (uniqueSeatIds.size() != seatIds.size()) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "중복된 좌석이 포함되어 있습니다.");
        }

        return List.copyOf(uniqueSeatIds);
    }
}
