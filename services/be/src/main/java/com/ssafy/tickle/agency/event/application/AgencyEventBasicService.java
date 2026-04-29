package com.ssafy.tickle.agency.event.application;

import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventBasicRequest;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventPricePoliciesRequest;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventPricePolicyRequest;
import com.ssafy.tickle.agency.event.presentation.dto.response.AgencyCreateEventResponse;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.category.domain.Category;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventImage;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.infrastructure.persistence.EventImageRepository;
import com.ssafy.tickle.organizer.domain.Organizer;
import com.ssafy.tickle.category.infrastructure.persistence.CategoryRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.organizer.infrastructure.persistence.OrganizerRepository;
import com.ssafy.tickle.venue.domain.Venue;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private final EventRepository eventRepository;
    private final EventImageRepository eventImageRepository;
    private final EventPricePolicyRepository eventPricePolicyRepository;
    private final OrganizerRepository organizerRepository;
    private final CategoryRepository categoryRepository;
    private final VenueRepository venueRepository;

    /**
     * 공연 기본정보를 등록합니다.
     *
     * @param request 공연 기본정보 등록 요청 DTO
     * @return 생성된 공연 응답 DTO
     */
    @Transactional
    public AgencyCreateEventResponse createBasicEvent(AgencyCreateEventBasicRequest request) {
        validateEventTimeline(request.eventStartAt(), request.eventEndAt());

        Organizer organizer = getOrganizer(request.organizerId());
        Venue venue = getVenue(request.venueId());
        Category category = getCategory(request.categoryId());

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

        saveEventImages(event, request.posterImageUrl(), request.detailImageUrls());

        return AgencyCreateEventResponse.from(event);
    }

    /**
     * 공연 가격 정책을 등록합니다.
     *
     * @param eventId 공연 식별자
     * @param request 가격 정책 등록 요청 DTO
     */
    @Transactional
    public void createPricePolicies(Long eventId, AgencyCreateEventPricePoliciesRequest request) {
        Event event = getEvent(eventId);
        validatePricePoliciesNotRegistered(eventId);
        savePricePolicies(event, request.pricePolicies());
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

            // 등록 화면의 할인 정보 요청을 엔티티 JSON 모델로 그대로 옮긴다.
            policies.add(EventPricePolicy.builder()
                    .event(event)
                    .priceGrade(request.priceGrade())
                    .priceAmount(request.priceAmount())
                    .discountInfo(request.discountInfo().stream()
                            .map(discountInfo -> new EventPricePolicy.DiscountInfo(
                                    discountInfo.discountName(),
                                    discountInfo.discountRate(),
                                    discountInfo.actualPriceAmount()
                            ))
                            .toList())
                    .currencyCode(request.currencyCode())
                    .displayOrder(request.displayOrder())
                    .build());
        }

        eventPricePolicyRepository.saveAll(policies);
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

    private Event getEvent(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연을 찾을 수 없습니다."));
    }

    /**
     * 기획사를 조회합니다.
     */
    private Organizer getOrganizer(Long organizerId) {
        return organizerRepository.findById(organizerId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "기획사를 찾을 수 없습니다."));
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
