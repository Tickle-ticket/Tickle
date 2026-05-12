package com.ssafy.tickle.user.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.common.util.S3Uploader;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.infrastructure.client.AuthInternalClient;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import com.ssafy.tickle.user.presentation.dto.MyInfoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * 사용자 조회 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private static final String PROFILE_IMAGE_DIR = "profiles";

    private final UserRepository userRepository;
    private final S3Uploader s3Uploader;
    private final AuthInternalClient authInternalClient;

    /**
     * 현재 로그인한 사용자의 정보를 조회합니다.
     *
     * @param userId 사용자 식별자
     * @return 내 정보 응답
     */
    public MyInfoResponse getMyInfo(Long userId) {
        validateUserId(userId);
        return MyInfoResponse.from(getAccessibleUser(userId));
    }

    /**
     * 현재 로그인한 사용자의 프로필을 수정합니다.
     *
     * <p>profileImage가 있으면 기존 S3 이미지를 삭제 후 새 이미지를 업로드한다.
     * nickname, phoneNumber는 null이면 변경하지 않는다.</p>
     *
     * @param userId       사용자 식별자
     * @param profileImage 프로필 이미지 파일 (선택)
     * @param nickname     닉네임 (선택)
     * @param phoneNumber  전화번호 (선택)
     * @return 수정된 내 정보 응답
     */
    @Transactional
    public MyInfoResponse updateMyInfo(
            Long userId,
            MultipartFile profileImage,
            String nickname,
            String phoneNumber
    ) {
        validateUserId(userId);
        validateHasAnyChange(profileImage, nickname, phoneNumber);

        User user = getAccessibleUser(userId);

        String profileImageUrl = null;
        if (profileImage != null && !profileImage.isEmpty()) {
            s3Uploader.delete(user.getProfileImageUrl());
            profileImageUrl = s3Uploader.upload(profileImage, PROFILE_IMAGE_DIR);
        }

        user.updateProfile(phoneNumber, nickname, profileImageUrl);
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

        // 1. 인증 서버에 사용자 삭제 요청 (먼저 처리하여 로그인을 막음)
        authInternalClient.deleteUser(userId);

        // 2. 코어 서버에서 사용자 삭제
        userRepository.delete(user);
    }

    private void validateHasAnyChange(MultipartFile profileImage, String nickname, String phoneNumber) {
        boolean hasImage = profileImage != null && !profileImage.isEmpty();
        boolean hasNickname = nickname != null && !nickname.isBlank();
        boolean hasPhone = phoneNumber != null && !phoneNumber.isBlank();
        if (!hasImage && !hasNickname && !hasPhone) {
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
