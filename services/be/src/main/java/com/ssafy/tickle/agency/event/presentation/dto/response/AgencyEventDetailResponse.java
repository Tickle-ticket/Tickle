package com.ssafy.tickle.agency.event.presentation.dto.response;

import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.domain.EventSession;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * 기획사 공연 상세 응답입니다.
 *
 * @param eventId 공연 식별자
 * @param basicInfo 공연 기본정보
 * @param pricePolicies 가격 정책 목록
 * @param sessions 회차 목록
 */
public record AgencyEventDetailResponse(
        Long eventId,
        BasicInfo basicInfo,
        List<PricePolicy> pricePolicies,
        List<SessionInfo> sessions
) {

    /**
     * 공연 엔티티와 하위 정보를 상세 응답으로 변환합니다.
     *
     * @param event 공연 엔티티
     * @param pricePolicies 가격 정책 엔티티 목록
     * @param sessions 회차 엔티티 목록
     * @return 공연 상세 응답
     */
    public static AgencyEventDetailResponse from(
            Event event,
            List<EventPricePolicy> pricePolicies,
            List<EventSession> sessions
    ) {
        return new AgencyEventDetailResponse(
                event.getId(),
                BasicInfo.from(event),
                pricePolicies.stream().map(PricePolicy::from).toList(),
                sessions.stream().map(SessionInfo::from).toList()
        );
    }

    /**
     * 기획사 공연 기본정보 응답입니다.
     *
     * @param organizerId 기획사 식별자
     * @param organizerName 기획사명
     * @param venueId 공연장 식별자
     * @param venueName 공연장명
     * @param categoryId 카테고리 식별자
     * @param categoryName 카테고리명
     * @param title 공연명
     * @param eventStartAt 공연 시작 시각
     * @param eventEndAt 공연 종료 시각
     * @param salesStartAt 예매 시작 시각
     * @param salesEndAt 예매 종료 시각
     * @param tags 태그 목록
     * @param notice 공지사항
     * @param status 공연 상태
     */
    public record BasicInfo(
            Long organizerId,
            String organizerName,
            Long venueId,
            String venueName,
            Long categoryId,
            String categoryName,
            String title,
            Instant eventStartAt,
            Instant eventEndAt,
            Instant salesStartAt,
            Instant salesEndAt,
            List<String> tags,
            String notice,
            Event.Status status
    ) {

        /**
         * 공연 엔티티를 기본정보 응답으로 변환합니다.
         *
         * @param event 공연 엔티티
         * @return 공연 기본정보 응답
         */
        public static BasicInfo from(Event event) {
            return new BasicInfo(
                    event.getOrganizer().getId(),
                    event.getOrganizer().getOrganizerName(),
                    event.getVenue().getId(),
                    event.getVenue().getVenueName(),
                    event.getCategory().getId(),
                    event.getCategory().getCategoryName(),
                    event.getTitle(),
                    event.getEventStartAt(),
                    event.getEventEndAt(),
                    event.getSalesStartAt(),
                    event.getSalesEndAt(),
                    event.getMetadata() == null ? List.of() : event.getMetadata().tags(),
                    event.getNotice(),
                    event.getStatus()
            );
        }
    }

    /**
     * 기획사 공연 가격 정책 응답입니다.
     *
     * @param eventPricePolicyId 가격 정책 식별자
     * @param priceGrade 가격 등급
     * @param priceAmount 기본 가격
     * @param discountInfo 할인 정보 목록
     * @param currencyCode 통화 코드
     * @param displayOrder 노출 순서
     */
    public record PricePolicy(
            Long eventPricePolicyId,
            String priceGrade,
            BigDecimal priceAmount,
            List<DiscountInfo> discountInfo,
            String currencyCode,
            Integer displayOrder
    ) {

        /**
         * 가격 정책 엔티티를 응답으로 변환합니다.
         *
         * @param pricePolicy 가격 정책 엔티티
         * @return 가격 정책 응답
         */
        public static PricePolicy from(EventPricePolicy pricePolicy) {
            return new PricePolicy(
                    pricePolicy.getId(),
                    pricePolicy.getPriceGrade().name(),
                    pricePolicy.getPriceAmount(),
                    pricePolicy.getDiscountInfo().stream()
                            .map(DiscountInfo::from)
                            .toList(),
                    pricePolicy.getCurrencyCode(),
                    pricePolicy.getDisplayOrder()
            );
        }
    }

    /**
     * 가격 정책 할인 정보 응답입니다.
     *
     * @param discountName 할인명
     * @param discountRate 할인율
     * @param actualPriceAmount 실제 판매가
     */
    public record DiscountInfo(
            String discountName,
            BigDecimal discountRate,
            BigDecimal actualPriceAmount
    ) {

        /**
         * 가격 정책 할인 정보를 응답으로 변환합니다.
         *
         * @param discountInfo 할인 정보
         * @return 할인 정보 응답
         */
        public static DiscountInfo from(EventPricePolicy.DiscountInfo discountInfo) {
            return new DiscountInfo(
                    discountInfo.discountName(),
                    discountInfo.discountRate(),
                    discountInfo.actualPriceAmount()
            );
        }
    }

    /**
     * 기획사 공연 회차 응답입니다.
     *
     * @param sessionId 회차 식별자
     * @param sessionNo 회차 번호
     * @param startAt 시작 시각
     * @param endAt 종료 시각
     * @param salesOpenAt 예매 오픈 시각
     * @param salesCloseAt 예매 종료 시각
     * @param status 회차 상태
     */
    public record SessionInfo(
            Long sessionId,
            Integer sessionNo,
            Instant startAt,
            Instant endAt,
            Instant salesOpenAt,
            Instant salesCloseAt,
            EventSession.Status status
    ) {

        /**
         * 회차 엔티티를 응답으로 변환합니다.
         *
         * @param session 회차 엔티티
         * @return 회차 응답
         */
        public static SessionInfo from(EventSession session) {
            return new SessionInfo(
                    session.getId(),
                    session.getSessionNo(),
                    session.getStartAt(),
                    session.getEndAt(),
                    session.getSalesOpenAt(),
                    session.getSalesCloseAt(),
                    session.getStatus()
            );
        }
    }
}
