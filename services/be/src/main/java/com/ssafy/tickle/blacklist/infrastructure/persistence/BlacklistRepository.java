package com.ssafy.tickle.blacklist.infrastructure.persistence;

import com.ssafy.tickle.blacklist.domain.Blacklist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

/**
 * 블랙리스트 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface BlacklistRepository extends JpaRepository<Blacklist, Long> {

    /**
     * 해당 사용자가 블랙리스트에 등록되어 있는지 확인합니다.
     *
     * @param userId 사용자 식별자
     * @return 블랙리스트 등록 여부
     */
    boolean existsByUserId(Long userId);

    /**
     * 해당 사용자의 블랙리스트 항목을 조회합니다.
     *
     * @param userId 사용자 식별자
     * @return 블랙리스트 항목 (없으면 empty)
     */
    Optional<Blacklist> findByUserId(Long userId);

    /**
     * 블랙리스트 전체 목록을 페이지네이션하여 조회합니다.
     *
     * @param pageable 페이지 정보
     * @return 블랙리스트 페이지
     */
    Page<Blacklist> findAll(Pageable pageable);

    /**
     * 사유별 블랙리스트 수를 한 번의 쿼리로 조회합니다.
     *
     * @return [reason, count] 형태의 Object 배열 리스트
     */
    @Query("SELECT b.reason, COUNT(b) FROM Blacklist b GROUP BY b.reason")
    List<Object[]> countGroupByReason();
}
