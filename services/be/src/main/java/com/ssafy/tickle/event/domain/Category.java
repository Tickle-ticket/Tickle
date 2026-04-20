package com.ssafy.tickle.event.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

/**
 * 이벤트 분류 체계를 관리하는 카테고리 엔티티입니다.
 *
 * <p>콘서트, 뮤지컬, 연극과 같은 상위 이벤트 유형을 정의합니다.</p>
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "categories")
public class Category {

    // 카테고리 PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id", nullable = false, updatable = false)
    private Long id;

    // 카테고리명
    @Column(name = "category_name", nullable = false, length = 100)
    private String categoryName;

    // 생성 시각
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // 수정 시각
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * 카테고리 엔티티를 생성합니다.
     *
     * @param categoryName 카테고리명
     */
    @Builder
    public Category(String categoryName) {
        this.categoryName = categoryName;
    }
}
