package com.ssafy.tickle.queue.infrastructure.persistence;

import com.ssafy.tickle.queue.domain.QueueHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface QueueHistoryRepository extends JpaRepository<QueueHistory, Long> {
    
    // 특정 이벤트의 특정 기간 동안의 히스토리 조회 (기본 정렬: 기록 시간순)
    List<QueueHistory> findByEventIdAndRecordedAtBetweenOrderByRecordedAtAsc(Long eventId, Instant from, Instant to);

}
