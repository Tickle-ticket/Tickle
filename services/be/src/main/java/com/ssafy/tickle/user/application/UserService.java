package com.ssafy.tickle.user.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import com.ssafy.tickle.user.presentation.dto.MyInfoResponse;
import com.ssafy.tickle.user.presentation.dto.UpdateMyInfoRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사용자 조회 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    /**
     * 현재 로그인한 사용자의 정보를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @return 내 정보 응답
     */
    public MyInfoResponse getMyInfo(Long userId) {
        validateUserId(userId);
        User user = getAccessibleUser(userId);

        return MyInfoResponse.from(user);
    }

    /**
     * 현재 로그인한 사용자의 정보를 부분 수정합니다.
     *
     * @param userId 사용자 식별자
     * @param request 내 정보 수정 요청
     * @return 수정된 내 정보 응답
     */
    @Transactional
    public MyInfoResponse updateMyInfo(Long userId, UpdateMyInfoRequest request) {
        validateUserId(userId);
        validateUpdateRequest(request);

        User user = getAccessibleUser(userId);

        user.updateProfile(
                request.phoneNumber(),
                request.nickname(),
                request.profileImageUrl()
        );

        return MyInfoResponse.from(user);
    }

    /**
     * 현재 로그인한 사용자를 탈퇴 처리합니다.
     *
     * @param userId 사용자 식별자
     */
    @Transactional
    public void withdrawMyInfo(Long userId) {
        validateUserId(userId);
        User user = getAccessibleUser(userId);
        userRepository.delete(user);
    }

    private void validateUpdateRequest(UpdateMyInfoRequest request) {
        if (request == null || request.hasNoChanges()) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "수정할 값이 하나 이상 필요합니다.");
        }
    }

    private void validateUserId(Long userId) {
        if (userId == null) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "userId 쿼리 파라미터는 필수입니다.");
        }
    }

    private User getAccessibleUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "사용자를 찾을 수 없습니다."));
    }
}
