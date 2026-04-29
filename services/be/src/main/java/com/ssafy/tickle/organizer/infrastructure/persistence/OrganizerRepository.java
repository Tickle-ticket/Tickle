package com.ssafy.tickle.organizer.infrastructure.persistence;

import com.ssafy.tickle.organizer.domain.Organizer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

/**
 * 주최자 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface OrganizerRepository extends JpaRepository<Organizer, Long> {

    /**
     * 주최자 이름을 기준으로 정렬된 목록을 조회합니다.
     *
     * @return 정렬된 주최자 목록
     */
    @Query("select o from Organizer o order by lower(o.organizerName) asc, o.id asc")
    List<Organizer> findAllOrderByOrganizerName();
}
