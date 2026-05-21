# Code Convention (Backend)

> 실제 코드베이스(`services/be`) 분석 기반. 기존 코드가 가장 좋은 예시다.

---

## 1. 주석 (Javadoc)

모든 클래스, public 메서드에 Javadoc 필수. 라인 주석은 WHY가 비자명할 때만.

**클래스 주석**
```java
/**
 * 이벤트 조회 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventService { }
```

**메서드 주석**
```java
/**
 * 이벤트 상세 정보를 조회합니다.
 *
 * @param eventId 이벤트 식별자
 * @param userId  사용자 식별자 (null 가능)
 * @return 이벤트 상세 응답
 */
public EventDetailResponse getEventDetail(Long eventId, Long userId) { }
```

**record DTO 주석** — 각 컴포넌트도 @param으로 문서화
```java
/**
 * 이벤트 상세 응답 DTO입니다.
 *
 * @param eventId   이벤트 식별자
 * @param title     이벤트 제목
 * @param isFavorite 찜 여부
 */
public record EventDetailResponse(Long eventId, String title, boolean isFavorite) { }
```

**라인 주석** — 이유가 비자명할 때만
```java
// send().get()으로 브로커 ack까지 확인해야 enter API가 적재 실패를 감지할 수 있다.
kafkaTemplate.send(...).get();
```

---

## 2. 패키지 구조

```
com.ssafy.tickle
├── common
│   ├── config/          # JacksonConfig, RedissonConfig, EventCacheConfig 등
│   ├── exception/
│   │   ├── code/        # ErrorCode(interface), GlobalErrorCode, SuccessCode
│   │   ├── BaseException.java
│   │   └── GlobalExceptionHandler.java
│   ├── response/        # BaseResponse<T>
│   └── util/            # RedisLockManager
└── {domain}             # event, queue, user, seat, reservation, cancellation, payment, venue, favorite, auth
    ├── presentation/
    │   ├── {Domain}ApiDoc.java    # Swagger 어노테이션 전담 인터페이스
    │   ├── {Domain}Controller.java
    │   └── dto/                   # XxxRequest, XxxResponse (record)
    ├── application/               # Service, Scheduler 등 비즈니스 로직
    ├── domain/                    # Entity, Inner Enum, Inner Record
    └── infrastructure/
        ├── persistence/           # JpaRepository, CustomRepo, Impl
        ├── cache/
        │   ├── model/             # Cached{Domain}{Type} (record)
        │   ├── mapper/            # 직렬화 변환 로직
        │   └── store/             # Redis 저장/조회 로직
        └── messaging/
            ├── model/             # {Domain}Message (record)
            ├── mapper/            # JSON 직렬화 변환
            └── producer/          # Kafka 발행
```

- `application/dto`는 사용하지 않는다. 내부 DTO가 실제로 필요해질 때만 추가.
- 도메인별 상수는 `{domain}/config/{Domain}Constants.java`에 분리한다.

---

## 3. 엔티티 (Entity)

### 기본 어노테이션 순서
```java
@Getter
@NoArgsConstructor(access = PROTECTED)   // 직접 생성 방지, Builder만 허용
@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id", nullable = false, updatable = false)
    private Long id;

    // FK는 항상 LAZY
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_id", nullable = false)
    private Organizer organizer;

    // Enum → VARCHAR
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private Status status;

    // 시간 컬럼 → Instant (LocalDateTime 사용 금지)
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // 금액 → BigDecimal
    @Column(name = "price_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal priceAmount;

    // JSON 컬럼
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "json")
    private EventMetadata metadata;

    // Inner Enum — 별도 파일 분리 금지
    public enum Status {
        PENDING, OPENED, CLOSED, FINISHED, CANCELLED
    }

    // Inner Record — 복합 값 표현
    public record EventMetadata(List<String> tags) {
        public EventMetadata {
            tags = tags == null ? List.of() : List.copyOf(tags);
        }
    }

    @Builder
    public Event(Organizer organizer, String title, ...) {
        this.organizer = organizer;
        this.title = title;
        ...
    }
}
```

### 낙관적 락 (Optimistic Lock)
```java
@Version
@Column(name = "version_no", nullable = false)
private Long versionNo;
```

### DB 레벨 Cascade (JPA Cascade 금지)
```java
// JPA cascade = {} 사용 금지
// DB 레벨 ON DELETE CASCADE는 @OnDelete로
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@OnDelete(action = OnDeleteAction.CASCADE)
@JoinColumn(name = "booking_id", nullable = false)
private Booking booking;
```

### 시간/타입 요약
| 타입 | 사용 목적 |
|------|-----------|
| `Instant` | 모든 타임스탬프 (`createdAt`, `updatedAt`, `startAt` 등) |
| `LocalDate` | 날짜만 필요한 경우 (`birthDate` 등) |
| `BigDecimal` | 금액 (precision=18, scale=2) |
| `boolean` | 플래그 필드 (primitive) |

---

## 4. Repository

### 기본 구조
```java
public interface EventRepository extends JpaRepository<Event, Long> {

    /**
     * 상세 조회에 필요한 연관 엔티티를 함께 로딩합니다.
     */
    @EntityGraph(attributePaths = {"organizer", "venue", "category"})
    Optional<Event> findWithDetailsById(Long eventId);

    /**
     * 키워드/카테고리 조건으로 이벤트 목록을 조회합니다.
     */
    @EntityGraph(attributePaths = {"organizer", "venue", "category"})
    @Query("""
            select e from Event e
            where (:keyword is null or lower(e.title) like lower(concat('%', :keyword, '%')))
              and (:categoryId is null or e.category.id = :categoryId)
            """)
    Page<Event> searchEvents(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            Pageable pageable
    );
}
```

### QueryDSL이 필요한 경우 (복잡한 조회)
```
{domain}/infrastructure/persistence/
├── SampleRepository.java          # extends JpaRepository + SampleRepositoryCustom
├── SampleRepositoryCustom.java    # 커스텀 메서드 인터페이스
└── SampleRepositoryImpl.java      # QueryDSL 구현체
```

- N+1 방지는 `@EntityGraph` 우선. 복잡하면 QueryDSL fetch join.
- JPQL은 텍스트 블록(triple-quote) 사용.

---

## 5. Service

```java
/**
 * 이벤트 조회 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)   // 클래스 레벨: 기본 읽기 전용
public class EventService {

    private static final int CATEGORY_RANKING_LIMIT = 5;   // 상수는 static final

    private final EventRepository eventRepository;

    public EventDetailResponse getEventDetail(Long eventId) {
        return getEventDetail(eventId, null);
    }

    /**
     * 이벤트 상세 정보를 조회합니다.
     */
    public EventDetailResponse getEventDetail(Long eventId, Long userId) {
        Event event = eventRepository.findWithDetailsById(eventId)
                .orElseThrow(() -> new BaseException(
                        GlobalErrorCode.RESOURCE_NOT_FOUND,
                        "공연을 찾을 수 없습니다."
                ));
        // ...
    }

    @Transactional   // 쓰기 작업은 메서드 레벨에서 오버라이드
    public MyInfoResponse updateMyInfo(Long userId, UpdateMyInfoRequest request) {
        User user = getAccessibleUser(userId);
        user.updateProfile(request.phoneNumber(), request.nickname(), request.profileImageUrl());
        return MyInfoResponse.from(user);
    }
}
```

---

## 6. Controller & ApiDoc

### ApiDoc 인터페이스 (Swagger 전담)
```java
/**
 * 이벤트 조회 API 문서 인터페이스입니다.
 */
@Tag(name = "Event", description = "공연 조회 API")
public interface EventApiDoc {

    @Operation(summary = "공연 목록 조회", description = "전체 목록, 키워드/카테고리 검색")
    @ApiResponse(responseCode = "200", description = "공연 목록 조회 성공")
    ResponseEntity<BaseResponse<EventListResponse>> getEvents(
            @Parameter(description = "공연 제목 검색어") String keyword,
            @Parameter(description = "카테고리 식별자") Long categoryId,
            @Parameter(description = "페이지 번호", example = "0") int page,
            @Parameter(description = "페이지 크기", example = "20") int size
    );
}
```

### Controller 구현 (비즈니스 로직 없음)
```java
/**
 * 이벤트 조회 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController implements EventApiDoc {

    private final EventService eventService;

    @Override
    @GetMapping
    public ResponseEntity<BaseResponse<EventListResponse>> getEvents(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity
                .ok()
                .body(BaseResponse.success(eventService.getEvents(keyword, categoryId, page, size)));
    }
}
```

---

## 7. DTO 규칙

### record 기본 + static factory `from()`
```java
/**
 * 내 정보 조회 응답 DTO입니다.
 *
 * @param userId  사용자 식별자
 * @param email   이메일
 */
public record MyInfoResponse(Long userId, String email, String nickname) {

    /**
     * 사용자 엔티티를 내 정보 응답 DTO로 변환합니다.
     */
    public static MyInfoResponse from(User user) {
        return new MyInfoResponse(user.getId(), user.getEmail(), user.getNickname());
    }
}
```

### 페이지네이션 응답 패턴
```java
public record EventListResponse(
        List<EventSummaryResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext
) {
    public static EventListResponse from(Page<?> pageResult, List<EventSummaryResponse> items) {
        return new EventListResponse(
                items,
                pageResult.getNumber(),
                pageResult.getSize(),
                pageResult.getTotalElements(),
                pageResult.getTotalPages(),
                pageResult.hasNext()
        );
    }
}
```

### DTO 네이밍 규칙
| 종류 | 패턴 | 예시 |
|------|------|------|
| 응답 | `{Domain}{Operation}Response` | `EventDetailResponse` |
| 요청 | `{Domain}{Operation}Request` 또는 `{Operation}{Domain}Request` | `UpdateMyInfoRequest` |
| Kafka 메시지 | `{Domain}Message` | `QueueEnterMessage` |
| 캐시 모델 | `Cached{Domain}{Type}` | `CachedOpeningSoonEvent` |

---

## 8. 예외 처리

### 도메인별 ErrorCode enum
```java
/**
 * 인증 도메인 에러 코드입니다.
 */
@Getter
@RequiredArgsConstructor
public enum AuthErrorCode implements ErrorCode {

    INVALID_TOKEN(401, "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(401, "만료된 토큰입니다."),
    DUPLICATE_EMAIL(409, "이미 사용 중인 이메일입니다.");

    private final int status;
    private final String message;
}
```

### 사용
```java
// 기본 메시지
throw new BaseException(AuthErrorCode.INVALID_TOKEN);

// 커스텀 메시지 (구체적인 이유 추가 시)
throw new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연을 찾을 수 없습니다.");
```

---

## 9. Redis 캐시 패턴

### Cache Store — try-catch로 graceful degradation 필수
```java
/**
 * 이벤트 랭킹 캐시를 Redis에 저장하고 조회합니다.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class EventRankingCacheStore {

    private final RedisTemplate<String, CachedCategoryRankingResponse> eventRankingRedisTemplate;

    public Optional<CachedCategoryRankingResponse> findByCategoryId(Long categoryId) {
        String cacheKey = key(categoryId);
        try {
            return Optional.ofNullable(eventRankingRedisTemplate.opsForValue().get(cacheKey));
        } catch (SerializationException e) {
            log.warn("이벤트 랭킹 캐시 역직렬화 실패. cacheKey={}", cacheKey, e);
            deleteQuietly(cacheKey);
            return Optional.empty();
        } catch (DataAccessException e) {
            log.warn("이벤트 랭킹 캐시 조회 실패. cacheKey={}", cacheKey, e);
            return Optional.empty();
        }
    }

    public void save(Long categoryId, CachedCategoryRankingResponse response) {
        String cacheKey = key(categoryId);
        try {
            eventRankingRedisTemplate.opsForValue().set(cacheKey, response, EventConstants.CACHE_TTL);
        } catch (SerializationException | DataAccessException e) {
            log.warn("이벤트 랭킹 캐시 저장 실패. cacheKey={}", cacheKey, e);
        }
    }

    private String key(Long categoryId) {
        return EventConstants.RANKING_CACHE_KEY_PREFIX + (categoryId == null ? "ALL" : categoryId);
    }
}
```

### Cache Config — 도메인별 RedisTemplate Bean
```java
@Configuration
public class EventCacheConfig {

    @Bean
    public RedisTemplate<String, CachedCategoryRankingResponse> eventRankingRedisTemplate(
            RedisConnectionFactory redisConnectionFactory,
            ObjectMapper objectMapper
    ) {
        RedisTemplate<String, CachedCategoryRankingResponse> redisTemplate = new RedisTemplate<>();
        redisTemplate.setConnectionFactory(redisConnectionFactory);
        redisTemplate.setKeySerializer(new StringRedisSerializer());
        redisTemplate.setValueSerializer(
                new Jackson2JsonRedisSerializer<>(objectMapper, CachedCategoryRankingResponse.class)
        );
        redisTemplate.afterPropertiesSet();
        return redisTemplate;
    }
}
```

---

## 10. Kafka 패턴

### Message record
```java
public record QueueEnterMessage(String requestId, Long userId, Long sessionId, Instant requestedAt) { }
```

### Producer — 중요 경로는 `.get()`으로 ack 확인
```java
@Component
@RequiredArgsConstructor
public class QueueEnterProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final QueueEnterMessageMapper queueEnterMessageMapper;

    public void publish(QueueEnterMessage message) {
        try {
            // send().get()으로 브로커 ack까지 확인해야 enter API가 적재 실패를 감지할 수 있다.
            kafkaTemplate.send(
                    QueueConstants.ENTER_REQUEST_TOPIC,
                    message.sessionId().toString(),
                    queueEnterMessageMapper.toPayload(message)
            ).get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("대기열 진입 요청 Kafka 적재가 인터럽트되었습니다.", e);
        } catch (ExecutionException e) {
            throw new IllegalStateException("대기열 진입 요청 Kafka 적재에 실패했습니다.", e);
        }
    }
}
```

### Mapper — JSON 직렬화 책임 분리
```java
@Component
@RequiredArgsConstructor
public class QueueEnterMessageMapper {

    private final ObjectMapper objectMapper;

    public String toPayload(QueueEnterMessage message) {
        try {
            return objectMapper.writeValueAsString(message);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("대기열 진입 요청 직렬화에 실패했습니다.", e);
        }
    }
}
```

---

## 11. 응답 포맷 (BaseResponse)

```java
// 기본 성공 (200 OK)
return ResponseEntity.ok().body(BaseResponse.success(data));

// SuccessCode 지정
return ResponseEntity.status(201).body(BaseResponse.success(SuccessCode.CREATED, data));

// 에러 — GlobalExceptionHandler가 자동 처리
throw new BaseException(SomeDomainErrorCode.NOT_FOUND);
```

---

## 12. 코드 스타일

- IntelliJ IDEA 내장 Formatter (`Ctrl + Alt + L` 생활화)
- 별도 커스텀 포맷 규칙 없음
- Lombok: `@Getter`, `@NoArgsConstructor(access = PROTECTED)`, `@Builder`, `@RequiredArgsConstructor`, `@Slf4j`
- 생성자 주입만 사용 (`@RequiredArgsConstructor` + `final` 필드)
- 모든 관계는 `FetchType.LAZY` (N+1은 @EntityGraph 또는 QueryDSL로 해결)
- JPA CASCADE 사용 금지, DB 레벨 cascade 필요시 `@OnDelete(action = OnDeleteAction.CASCADE)` 사용
