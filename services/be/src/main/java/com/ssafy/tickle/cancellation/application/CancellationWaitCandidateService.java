package com.ssafy.tickle.cancellation.application;

import com.ssafy.tickle.cancellation.domain.CancellationCandidate;
import com.ssafy.tickle.cancellation.domain.CancellationErrorCode;
import com.ssafy.tickle.cancellation.domain.CancellationWaitSeatChangedEvent;
import com.ssafy.tickle.cancellation.infrastructure.persistence.CancellationCandidateRepository;
import com.ssafy.tickle.cancellation.infrastructure.persistence.CancellationOfferRepository;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateCreateRequest;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateCreateResponse;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateListResponse;
import com.ssafy.tickle.cancellation.presentation.dto.CancellationWaitCandidateSummaryResponse;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.common.util.RedisLockManager;
import com.ssafy.tickle.queue.application.service.QueueStatusService;
import com.ssafy.tickle.queue.domain.QueueScope;
import com.ssafy.tickle.seat.domain.SessionSeat;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
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

    private final CancellationWaitCandidateRegisterService cancellationWaitCandidateRegisterService;
    private final CancellationCandidateRepository cancellationCandidateRepository;
    private final CancellationOfferRepository cancellationOfferRepository;
    private final CancellationRedistributionService cancellationRedistributionService;
    private final ApplicationEventPublisher eventPublisher;

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
        queueStatusService.validateAdmitToken(QueueScope.CANCELLATION_WAIT, eventId, userId, admitToken);

        // 같은 요청 안의 중복 좌석은 동일 좌석에 여러 순번을 만들 수 있으므로 먼저 제거하지 않고 거부합니다.
        List<Long> requestedSeatIds = validateAndNormalizeSeatIds(request.sessionSeatIds());

        // 좌석 선점과 같은 회차 단위 락으로 동시에 들어온 신청의 4매 제한/순번 계산을 직렬화합니다.
        String sessionLockKey = SESSION_LOCK_KEY_PREFIX + scheduleId;
        if (!redisLockManager.tryLock(sessionLockKey)) {
            throw new BaseException(CancellationErrorCode.CANDIDATE_LOCK_FAILED);
        }

        try {
            return cancellationWaitCandidateRegisterService.registerCandidates(
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
     * 사용자의 활성 예매 대기 신청 목록을 조회합니다.
     *
     * @param userId 사용자 식별자
     * @return 예매 대기 신청 목록
     */
    @Transactional(readOnly = true)
    public CancellationWaitCandidateListResponse getMyCandidates(Long userId) {
        List<CancellationWaitCandidateSummaryResponse> candidates = cancellationCandidateRepository
                .findAllByUserIdAndStatusWithDetails(userId, CancellationCandidate.Status.WAITING)
                .stream()
                // 저장된 waitingRank는 이력 순번이므로 현재 남은 WAITING 기준 순위로 다시 계산합니다.
                .map(candidate -> CancellationWaitCandidateSummaryResponse.of(candidate, currentRank(candidate)))
                .toList();

        return new CancellationWaitCandidateListResponse(candidates);
    }

    /**
     * 사용자의 예매 대기 신청을 취소합니다.
     *
     * <p>이미 취소표 제안을 받은 예매 대기 신청은 제안 만료 여부와 관계없이 취소할 수 없습니다.</p>
     *
     * @param candidateId 예매 대기 신청 식별자
     * @param userId 사용자 식별자
     */
    @Transactional
    public void cancelCandidate(Long candidateId, Long userId) {
        CancellationCandidate candidate = getOwnedCandidate(candidateId, userId);
        validateCancellable(candidate);
        // 제안을 받은 이력이 있으면 만료 여부와 관계없이 사용자 취소 대상에서 제외합니다.
        if (cancellationOfferRepository.existsByCancellationCandidateId(candidateId)) {
            throw new BaseException(CancellationErrorCode.CANDIDATE_NOT_CANCELLABLE);
        }

        candidate.cancel(Instant.now());

        Long scheduleId = candidate.getSessionSeat().getSession().getId();
        Long sessionSeatId = candidate.getSessionSeat().getId();
        eventPublisher.publishEvent(new CancellationWaitSeatChangedEvent(this, scheduleId, List.of(sessionSeatId)));

        // 재배분 중인 좌석에서 앞 순번 취소가 발생하면 다음 WAITING 대상 또는 일반 판매 전환을 이어갑니다.
        if (candidate.getSessionSeat().getSaleStatus() == SessionSeat.SaleStatus.REALLOCATING) {
            cancellationRedistributionService.processRedistribution(candidate.getSessionSeat());
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

    /**
     * 본인 소유 예매 대기 신청을 상세 정보와 함께 조회합니다.
     *
     * @param candidateId 예매 대기 신청 식별자
     * @param userId 사용자 식별자
     * @return 예매 대기 신청
     */
    private CancellationCandidate getOwnedCandidate(Long candidateId, Long userId) {
        CancellationCandidate candidate = cancellationCandidateRepository.findByIdWithDetails(candidateId)
                .orElseThrow(() -> new BaseException(CancellationErrorCode.CANDIDATE_NOT_FOUND));
        if (!candidate.getUser().getId().equals(userId)) {
            throw new BaseException(GlobalErrorCode.ACCESS_DENIED, "자신의 예매 대기 신청만 접근할 수 있습니다.");
        }

        return candidate;
    }

    /**
     * 예매 대기 신청이 취소 가능한 상태인지 검증합니다.
     *
     * @param candidate 예매 대기 신청
     */
    private void validateCancellable(CancellationCandidate candidate) {
        if (candidate.getStatus() == CancellationCandidate.Status.CANCELLED) {
            throw new BaseException(CancellationErrorCode.CANDIDATE_ALREADY_CANCELLED);
        }
        if (candidate.getStatus() != CancellationCandidate.Status.WAITING) {
            throw new BaseException(CancellationErrorCode.CANDIDATE_NOT_CANCELLABLE);
        }
    }

    /**
     * 현재 활성 대기자 기준 순위를 계산합니다.
     *
     * @param candidate 예매 대기 신청
     * @return 현재 순위
     */
    private int currentRank(CancellationCandidate candidate) {
        // 앞 순번 중 CANCELLED/OFFERED는 현재 대기열에서 빠졌으므로 WAITING만 순위에 반영합니다.
        long aheadCount = cancellationCandidateRepository.countBeforeRankBySessionSeatIdAndStatus(
                candidate.getSessionSeat().getId(),
                candidate.getWaitingRank(),
                CancellationCandidate.Status.WAITING
        );

        return Math.toIntExact(aheadCount + 1);
    }
}
