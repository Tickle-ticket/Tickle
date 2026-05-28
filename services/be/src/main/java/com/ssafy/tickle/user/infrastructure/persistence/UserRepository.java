package com.ssafy.tickle.user.infrastructure.persistence;

import com.ssafy.tickle.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

/**
 * 사용자 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * 사용자 식별자와 상태를 기준으로 존재 여부를 확인합니다.
     *
     * @param id     사용자 식별자
     * @param status 사용자 상태
     * @return 존재 여부
     */
    boolean existsByIdAndStatus(Long id, User.Status status);

    /**
     * 사용자 식별자 목록으로 사용자를 일괄 조회합니다.
     *
     * @param ids 사용자 식별자 목록
     * @return 조회된 사용자 목록
     */
    List<User> findAllByIdIn(Collection<Long> ids);

    /**
     * 이메일 접미사로 사용자 식별자 목록을 조회합니다.
     *
     * <p>시연용 부하 테스트 계정(demo*@k6test.com) 정리 용도로 사용합니다.</p>
     *
     * @param emailSuffix 이메일 접미사 (예: "@k6test.com")
     * @return 해당 이메일을 가진 사용자 식별자 목록
     */
    @Query("SELECT u.id FROM User u WHERE u.email LIKE %:emailSuffix")
    List<Long> findIdsByEmailEndingWith(@Param("emailSuffix") String emailSuffix);

    /**
     * 사용자 식별자와 이메일 prefix를 기준으로 존재 여부를 확인합니다.
     *
     * <p>시연용 부하 테스트 계정(demo*)의 JWT 만료 예외 처리 용도로 사용합니다.</p>
     *
     * @param id 사용자 식별자
     * @param emailPrefix 이메일 prefix (예: "demo")
     * @return 존재 여부
     */
    boolean existsByIdAndEmailStartingWith(Long id, String emailPrefix);
}
