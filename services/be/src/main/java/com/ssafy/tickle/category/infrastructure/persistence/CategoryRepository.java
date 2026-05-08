package com.ssafy.tickle.category.infrastructure.persistence;

import com.ssafy.tickle.category.domain.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

/**
 * 카테고리 엔티티를 조회하고 저장하는 JPA 리포지토리입니다.
 */
public interface CategoryRepository extends JpaRepository<Category, Long> {

    /**
     * 카테고리 이름을 기준으로 정렬된 목록을 조회합니다.
     *
     * @return 정렬된 카테고리 목록
     */
    @Query("select c from Category c order by lower(c.categoryName) asc, c.id asc")
    List<Category> findAllOrderByCategoryName();
}
