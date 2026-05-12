package com.ssafy.tickle.user.application;

import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.common.util.S3Uploader;
import com.ssafy.tickle.blacklist.infrastructure.persistence.BlacklistRepository;
import com.ssafy.tickle.cancellation.domain.CancellationCandidate;
import com.ssafy.tickle.cancellation.infrastructure.persistence.CancellationCandidateRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.organizer.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.reservation.domain.Booking;
import com.ssafy.tickle.reservation.infrastructure.persistence.BookingRepository;
import com.ssafy.tickle.user.domain.UserRole;
import com.ssafy.tickle.user.domain.User;
import com.ssafy.tickle.user.infrastructure.client.AuthInternalClient;
import com.ssafy.tickle.user.infrastructure.persistence.UserRepository;
import com.ssafy.tickle.user.presentation.dto.MyInfoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

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
    private final EventRepository eventRepository;
    private final BookingRepository bookingRepository;
    private final CancellationCandidateRepository cancellationCandidateRepository;
    private final OrganizerRepository organizerRepository;
    private final BlacklistRepository blacklistRepository;

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

        // 탈퇴 불가 조건 검증
        if (user.getRole() == UserRole.ADMIN) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "관리자는 탈퇴할 수 없습니다.");
        }
        
        if (user.getRole() == UserRole.ORGANIZER) {
            if (eventRepository.existsByOrganizerId(user.getOrganizerId())) {
                throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "등록한 공연이 있어 탈퇴할 수 없습니다.");
            }
        }
        
        if (user.getRole() == UserRole.USER) {
            boolean hasActiveBooking = bookingRepository.existsByUserIdAndBookingStatusIn(
                    userId,
                    List.of(Booking.Status.PENDING_PAYMENT, Booking.Status.CONFIRMED)
            );
            if (hasActiveBooking) {
                throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "진행 중인 예매 내역이 있어 탈퇴할 수 없습니다.");
            }
            
            boolean hasActiveCancellation = cancellationCandidateRepository.existsByUserIdAndStatusIn(
                    userId,
                    List.of(CancellationCandidate.Status.WAITING, CancellationCandidate.Status.OFFERED)
            );
            if (hasActiveCancellation) {
                throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "진행 중인 취소표 대기 내역이 있어 탈퇴할 수 없습니다.");
            }
        }

        // 1. 연관 데이터 중 자동 CASCADE 삭제되지 않는 항목 수동 삭제
        Long organizerId = user.getOrganizerId();
        blacklistRepository.deleteByUserId(userId);

        // 2. 인증 서버에 사용자 삭제 요청 (먼저 처리하여 로그인을 막음)
        authInternalClient.deleteUser(userId);

        // 3. 코어 서버에서 사용자 삭제 (JPA CASCADE로 Booking, Favorite, UserAccessLog 등 자동 삭제)
        userRepository.delete(user);
        
        // 4. 기획사 정보 삭제 (사용자 레코드 삭제 후 FK 제약 무관하게 삭제 가능)
        if (organizerId != null && user.getRole() == UserRole.ORGANIZER) {
            organizerRepository.deleteById(organizerId);
        }
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
