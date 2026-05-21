package com.ssafy.tickle.agency.event.application;

import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.common.util.S3Uploader;
import com.ssafy.tickle.category.domain.Category;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventImage;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.infrastructure.persistence.EventImageRepository;
import com.ssafy.tickle.organizer.domain.Organizer;
import com.ssafy.tickle.category.infrastructure.persistence.CategoryRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventBasicRequest;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventPricePoliciesRequest;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventPricePolicyRequest;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyCreateEventResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * 기획사 공연 기본정보와 가격정책 등록을 담당합니다.
 *
 * <p>공연 기본정보, 가격 정책, 회차, 좌석은 각각 별도 API로 등록합니다.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AgencyEventBasicService {

    private static final String EVENT_POSTER_DIR = "events/poster";
    private static final String EVENT_DETAIL_DIR = "events/detail";
    private static final String DEFAULT_PRICE_INFO_NAME = "일반";
    private static final int MAX_DETAIL_IMAGES = 3;

    private final EventRepository eventRepository;
    private final EventImageRepository eventImageRepository;
    private final EventPricePolicyRepository eventPricePolicyRepository;
    private final CategoryRepository categoryRepository;
    private final VenueRepository venueRepository;
    private final S3Uploader s3Uploader;
    private final AgencyAuthorizationService agencyAuthorizationService;

    /**
     * 공연 기본정보를 등록합니다.
     *
     * <p>포스터 이미지는 필수, 소개 이미지는 최대 3개까지 허용합니다.
     * 파일을 S3에 업로드한 후 URL을 DB에 저장합니다.</p>
     *
     * @param request      공연 기본정보 등록 요청 DTO
     * @param posterImage  포스터 이미지 파일 (필수)
     * @param detailImages 소개 이미지 파일 목록 (선택, 최대 3개)
     * @return 생성된 공연 응답 DTO
     */
    @Transactional
    public AgencyCreateEventResponse createBasicEvent(
            Long userId,
            AgencyCreateEventBasicRequest request,
            MultipartFile posterImage,
            List<MultipartFile> detailImages
    ) {
        validateEventTimeline(request.eventStartAt(), request.eventEndAt());
        validatePosterImage(posterImage);
        validateDetailImages(detailImages);

        Organizer organizer = getOrganizerByUserId(userId);
        Venue venue = getVenue(request.venueId());
        Category category = getCategory(request.categoryId());

        // S3 업로드
        String posterImageUrl = s3Uploader.upload(posterImage, EVENT_POSTER_DIR);
        List<String> detailImageUrls = uploadDetailImages(detailImages);

        Event event = eventRepository.save(Event.builder()
                .organizer(organizer)
                .venue(venue)
                .title(request.title())
                .category(category)
                .eventStartAt(request.eventStartAt())
                .eventEndAt(request.eventEndAt())
                .metadata(new Event.EventMetadata(request.tags()))
                .notice(request.notice())
                .status(Event.Status.PENDING)
                .build());

        saveEventImages(event, posterImageUrl, detailImageUrls);

        return AgencyCreateEventResponse.from(event);
    }

    /**
     * 공연 가격 정책을 등록합니다.
     *
     * @param eventId 공연 식별자
     * @param request 가격 정책 등록 요청 DTO
     */
    @Transactional
    public void createPricePolicies(Long userId, Long eventId, AgencyCreateEventPricePoliciesRequest request) {
        Event event = agencyAuthorizationService.getOwnedEvent(userId, eventId);
        validatePricePoliciesNotRegistered(eventId);
        savePricePolicies(event, request.pricePolicies());
    }

    /**
     * 소개 이미지 파일 목록을 S3에 업로드하고 URL 목록을 반환합니다.
     *
     * @param detailImages 업로드할 소개 이미지 파일 목록
     * @return S3 URL 목록
     */
    private List<String> uploadDetailImages(List<MultipartFile> detailImages) {
        if (detailImages == null || detailImages.isEmpty()) {
            return List.of();
        }
        return detailImages.stream()
                .filter(file -> file != null && !file.isEmpty())
                .map(file -> s3Uploader.upload(file, EVENT_DETAIL_DIR))
                .toList();
    }

    /**
     * 포스터 이미지 파일을 검증합니다.
     *
     * @param posterImage 포스터 이미지 파일
     */
    private void validatePosterImage(MultipartFile posterImage) {
        if (posterImage == null || posterImage.isEmpty()) {
            throw new BaseException(GlobalErrorCode.INVALID_INPUT_VALUE, "포스터 이미지는 필수입니다.");
        }
    }

    /**
     * 소개 이미지 파일 목록을 검증합니다 (최대 3개).
     *
     * @param detailImages 소개 이미지 파일 목록
     */
    private void validateDetailImages(List<MultipartFile> detailImages) {
        if (detailImages != null && detailImages.size() > MAX_DETAIL_IMAGES) {
            throw new BaseException(GlobalErrorCode.INVALID_INPUT_VALUE,
                    "소개 이미지는 최대 " + MAX_DETAIL_IMAGES + "개까지 등록 가능합니다.");
        }
    }

    /**
     * 공연 판매 기간과 공연 진행 기간의 선후관계를 검증합니다.
     */
    private void validateEventTimeline(
            java.time.Instant eventStartAt,
            java.time.Instant eventEndAt
    ) {
        if (!eventStartAt.isBefore(eventEndAt)) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "공연 시작 시각은 종료 시각보다 빨라야 합니다.");
        }
    }

    /**
     * 공연 가격 정책을 등록합니다.
     */
    private void savePricePolicies(
            Event event,
            List<AgencyCreateEventPricePolicyRequest> requests
    ) {
        Set<SeatGrade> priceGrades = new LinkedHashSet<>();
        List<EventPricePolicy> policies = new ArrayList<>();

        for (AgencyCreateEventPricePolicyRequest request : requests) {
            // 같은 가격 등급은 하나만 허용한다.
            if (!priceGrades.add(request.priceGrade())) {
                throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "가격 정책 등급이 중복되었습니다: " + request.priceGrade());
            }

            List<EventPricePolicy.DiscountInfo> discountInfo = createDiscountInfo(request);
            policies.add(EventPricePolicy.builder()
                    .event(event)
                    .priceGrade(request.priceGrade())
                    .priceAmount(request.defaultPriceAmount())
                    .discountInfo(discountInfo)
                    .currencyCode(request.currencyCode())
                    .displayOrder(request.displayOrder())
                    .build());
        }

        eventPricePolicyRepository.saveAll(policies);
    }

    /**
     * 기본 가격을 "일반" 권종으로 추가하고, 요청 할인 정보를 저장용 가격 정보로 변환합니다.
     */
    private List<EventPricePolicy.DiscountInfo> createDiscountInfo(AgencyCreateEventPricePolicyRequest request) {
        Set<String> discountNames = new LinkedHashSet<>();
        List<EventPricePolicy.DiscountInfo> discountInfo = new ArrayList<>();

        // defaultPriceAmount는 결제 옵션에서 선택 가능한 "일반" 권종으로도 저장한다.
        discountNames.add(DEFAULT_PRICE_INFO_NAME);
        discountInfo.add(new EventPricePolicy.DiscountInfo(
                DEFAULT_PRICE_INFO_NAME,
                BigDecimal.ZERO,
                request.defaultPriceAmount()
        ));

        for (AgencyCreateEventPricePolicyRequest.PriceInfoRequest priceInfo : request.priceInfos()) {
            if (!discountNames.add(priceInfo.discountName())) {
                throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "가격 정보 이름이 중복되었습니다: " + priceInfo.discountName());
            }

            discountInfo.add(new EventPricePolicy.DiscountInfo(
                    priceInfo.discountName(),
                    priceInfo.discountRate(),
                    resolveActualPriceAmount(request.defaultPriceAmount(), priceInfo)
            ));
        }

        return discountInfo;
    }

    /**
     * 기본 가격과 할인율로 실제 결제 금액을 계산합니다.
     */
    private BigDecimal resolveActualPriceAmount(
            BigDecimal defaultPriceAmount,
            AgencyCreateEventPricePolicyRequest.PriceInfoRequest priceInfo
    ) {
        // 할인율은 0~100 사이의 퍼센트 값이며, DB 금액 스케일에 맞춰 소수 둘째 자리로 반올림한다.
        return defaultPriceAmount
                .multiply(BigDecimal.valueOf(100).subtract(priceInfo.discountRate()))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    /**
     * 등록 화면에서 전달한 포스터/소개 이미지를 이벤트 이미지로 저장합니다.
     */
    private void saveEventImages(Event event, String posterImageUrl, List<String> detailImageUrls) {
        List<EventImage> images = new ArrayList<>();

        // 포스터는 상세 대표 이미지이면서 목록 썸네일로도 사용한다.
        images.add(EventImage.builder()
                .event(event)
                .imageType(EventImage.ImageType.POSTER)
                .imageUrl(posterImageUrl)
                .displayOrder(0)
                .build());
        images.add(EventImage.builder()
                .event(event)
                .imageType(EventImage.ImageType.THUMBNAIL)
                .imageUrl(posterImageUrl)
                .displayOrder(0)
                .build());

        List<String> detailUrls = detailImageUrls == null ? List.of() : detailImageUrls;
        for (int index = 0; index < detailUrls.size(); index++) {
            images.add(EventImage.builder()
                    .event(event)
                    .imageType(EventImage.ImageType.DETAIL)
                    .imageUrl(detailUrls.get(index))
                    .displayOrder(index)
                    .build());
        }

        eventImageRepository.saveAll(images);
    }

    private void validatePricePoliciesNotRegistered(Long eventId) {
        if (eventPricePolicyRepository.existsByEventId(eventId)) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "이미 가격 정책이 등록된 공연입니다.");
        }
    }

    /**
     * 유저 식별자를 통해 소속 기획사를 조회합니다.
     */
    private Organizer getOrganizerByUserId(Long userId) {
        return agencyAuthorizationService.getOrganizer(userId);
    }

    /**
     * 공연장을 조회합니다.
     */
    private Venue getVenue(Long venueId) {
        return venueRepository.findById(venueId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연장을 찾을 수 없습니다."));
    }

    /**
     * 카테고리를 조회합니다.
     */
    private Category getCategory(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "카테고리를 찾을 수 없습니다."));
    }
}
