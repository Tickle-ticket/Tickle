package com.ssafy.tickle.blacklist.infrastructure.persistence;

import com.ssafy.tickle.blacklist.domain.Blacklist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
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
     * 해당 사용자의 모든 블랙리스트 기록을 삭제합니다.
     *
     * @param userId 사용자 식별자
     */
    void deleteByUserId(Long userId);

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

    /**
     * 특정 시각 이후 등록된 블랙리스트 수를 조회합니다. (최근 N시간 탐지 건수용)
     *
     * @param since 기준 시각
     * @return 해당 기간 내 등록 건수
     */
    long countByCreatedAtAfter(Instant since);

    /**
     * 블랙리스트에 저장된 고유 IP 주소 수를 조회합니다.
     *
     * @return 고유 IP 주소 수
     */
    @Query("SELECT COUNT(DISTINCT b.ipAddress) FROM Blacklist b WHERE b.ipAddress IS NOT NULL")
    long countDistinctIpAddress();

    /**
     * botScore 구간(0.0~0.2, 0.2~0.4, 0.4~0.6, 0.6~0.8, 0.8~1.0)별 건수를 조회합니다.
     *
     * <p>AI 탐지 건(botScore NOT NULL)에 대해서만 집계합니다.</p>
     *
     * @return [scoreRange, count] 형태의 Object 배열 리스트
     */
    @Query("""
            SELECT
              CASE
                WHEN b.botScore < 0.2 THEN '0.0-0.2'
                WHEN b.botScore < 0.4 THEN '0.2-0.4'
                WHEN b.botScore < 0.6 THEN '0.4-0.6'
                WHEN b.botScore < 0.8 THEN '0.6-0.8'
                ELSE '0.8-1.0'
              END,
              COUNT(b)
            FROM Blacklist b
            WHERE b.botScore IS NOT NULL
            GROUP BY
              CASE
                WHEN b.botScore < 0.2 THEN '0.0-0.2'
                WHEN b.botScore < 0.4 THEN '0.2-0.4'
                WHEN b.botScore < 0.6 THEN '0.4-0.6'
                WHEN b.botScore < 0.8 THEN '0.6-0.8'
                ELSE '0.8-1.0'
              END
            """)
    List<Object[]> countByScoreRange();
}

