package com.ssafy.tickle.agency.event.application;

import com.ssafy.tickle.common.domain.SeatGrade;
import com.ssafy.tickle.agency.event.presentation.dto.request.AgencyCreateEventSeatGroupRequest;
import com.ssafy.tickle.agency.event.application.dto.CreatedEventSeat;
import com.ssafy.tickle.agency.event.application.dto.EventSeatInsertCommand;
import com.ssafy.tickle.agency.event.application.dto.SessionSeatInsertCommand;
import com.ssafy.tickle.common.exception.BaseException;
import com.ssafy.tickle.common.exception.code.GlobalErrorCode;
import com.ssafy.tickle.event.domain.Event;
import com.ssafy.tickle.event.domain.EventPricePolicy;
import com.ssafy.tickle.event.domain.EventSession;
import com.ssafy.tickle.event.infrastructure.persistence.EventPricePolicyRepository;
import com.ssafy.tickle.event.infrastructure.persistence.EventRepository;
import com.ssafy.tickle.seat.domain.EventSection;
import com.ssafy.tickle.seat.infrastructure.persistence.EventSectionRepository;
import com.ssafy.tickle.venue.domain.VenueSeat;
import com.ssafy.tickle.venue.domain.VenueSection;
import com.ssafy.tickle.venue.infrastructure.persistence.VenueSeatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 기획사 공연 등록에서 좌석/회차좌석 대량 생성을 담당합니다.
 *
 * <p>공연장 좌석을 공연 좌석으로 복제하고, 그 결과를 다시 회차 좌석으로 복제합니다.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AgencyEventSeatBatchService {

    private final EventRepository eventRepository;
    private final EventPricePolicyRepository eventPricePolicyRepository;
    private final VenueSeatRepository venueSeatRepository;
    private final EventSectionRepository eventSectionRepository;
    private final JdbcTemplate jdbcTemplate;

    /**
     * 공연장 좌석을 기준으로 공연 좌석을 생성합니다.
     */
    @Transactional
    public List<CreatedEventSeat> createEventSeats(
            Long eventId,
            List<AgencyCreateEventSeatGroupRequest> requests
    ) {
        Event event = getEventOrThrow(eventId);
        Long venueId = event.getVenue().getId();
        Map<SeatGrade, EventPricePolicy> pricePolicyByGrade = getPricePolicyByGrade(eventId);

        Set<Long> venueSeatIds = new LinkedHashSet<>();
        Set<SeatGrade> seatGroupPriceGrades = new LinkedHashSet<>();
        for (AgencyCreateEventSeatGroupRequest request : requests) {
            // 가격 정책 그룹 중복 확인
            validateDuplicatePricePolicyGroup(seatGroupPriceGrades, request.priceGrade());

            for (Long venueSeatId : request.seatIds()) {
                // 한 좌석은 하나의 가격 정책 그룹에만 매핑되어야 한다.
                validateDuplicateVenueSeat(venueSeatIds, venueSeatId);
            }
        }

        List<VenueSeat> venueSeats = getVenueSeatsOrThrow(venueSeatIds);

        Map<Long, VenueSeat> venueSeatById = new LinkedHashMap<>();
        for (VenueSeat venueSeat : venueSeats) {
            // 다른 공연장 좌석이 섞이면 이벤트 좌석 복제가 잘못된다.
            validateVenueSeatBelongsToVenue(venueId, venueSeat);
            venueSeatById.put(venueSeat.getId(), venueSeat);
        }

        // 실제 선택된 공연장 구역만 공연 구역으로 복제한다.
        Map<Long, EventSection> eventSectionByVenueSectionId = createEventSections(event, venueId, venueSeats);
        List<EventSeatInsertCommand> commands = new ArrayList<>();

        for (AgencyCreateEventSeatGroupRequest request : requests) {
            EventPricePolicy pricePolicy = getPricePolicy(pricePolicyByGrade, request.priceGrade());
            for (Long venueSeatId : request.seatIds()) {
                VenueSeat venueSeat = venueSeatById.get(venueSeatId);

                // 공연 좌석은 공연장 좌석의 위치와 모양을 그대로 복제한다.
                commands.add(EventSeatInsertCommand.from(
                        eventSectionByVenueSectionId.get(venueSeat.getSection().getId()).getId(),
                        pricePolicy,
                        venueId,
                        venueSeat
                ));
            }
        }

        List<Long> eventSeatIds = batchInsertEventSeats(commands);
        List<CreatedEventSeat> createdEventSeats = new ArrayList<>(eventSeatIds.size());
        for (int i = 0; i < eventSeatIds.size(); i++) {
            // 생성된 식별자와 공연 구역만 다음 회차 복제 단계에 넘긴다.
            createdEventSeats.add(new CreatedEventSeat(eventSeatIds.get(i), commands.get(i).eventSectionId()));
        }
        return createdEventSeats;
    }

    /**
     * 회차별 좌석을 생성합니다.
     */
    @Transactional
    public void createSessionSeats(List<EventSession> sessions, List<CreatedEventSeat> eventSeats) {
        List<SessionSeatInsertCommand> commands = new ArrayList<>();

        for (EventSession session : sessions) {
            for (CreatedEventSeat eventSeat : eventSeats) {
                // 회차 좌석은 공연 좌석을 그대로 복제하고 판매 상태만 초기화한다.
                commands.add(SessionSeatInsertCommand.of(session.getId(), eventSeat));
            }
        }

        batchInsertSessionSeats(commands);
    }

    private Map<Long, EventSection> createEventSections(Event event, Long venueId, List<VenueSeat> venueSeats) {
        Map<Long, VenueSection> venueSectionById = new LinkedHashMap<>();
        for (VenueSeat venueSeat : venueSeats) {
            venueSectionById.putIfAbsent(venueSeat.getSection().getId(), venueSeat.getSection());
        }

        List<EventSection> eventSections = venueSectionById.values().stream()
                .map(section -> EventSection.builder()
                        .event(event)
                        .venueId(venueId)
                        .sectionName(section.getSectionName())
                        .displayOrder(section.getDisplayOrder())
                        .build())
                .toList();

        List<EventSection> savedSections = eventSectionRepository.saveAll(eventSections);
        Map<Long, EventSection> eventSectionByVenueSectionId = new LinkedHashMap<>();
        int index = 0;
        for (Long venueSectionId : venueSectionById.keySet()) {
            // 공연장 구역과 생성된 공연 구역을 같은 순서로 다시 연결한다.
            eventSectionByVenueSectionId.put(venueSectionId, savedSections.get(index++));
        }
        return eventSectionByVenueSectionId;
    }

    private Map<SeatGrade, EventPricePolicy> getPricePolicyByGrade(Long eventId) {
        List<EventPricePolicy> pricePolicies = eventPricePolicyRepository.findByEventIdOrderByDisplayOrderAsc(eventId);
        Map<SeatGrade, EventPricePolicy> pricePolicyByGrade = new LinkedHashMap<>();
        for (EventPricePolicy pricePolicy : pricePolicies) {
            if (pricePolicyByGrade.putIfAbsent(pricePolicy.getPriceGrade(), pricePolicy) != null) {
                throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "가격 정책 등급이 중복되었습니다: " + pricePolicy.getPriceGrade());
            }
        }
        return pricePolicyByGrade;
    }

    private List<Long> batchInsertEventSeats(List<EventSeatInsertCommand> commands) {
        if (commands.isEmpty()) {
            return List.of();
        }

        String sql = "INSERT INTO event_seats (event_section_id, event_price_policy_id, venue_id, row_label, seat_number, seat_label, seat_type, created_at, updated_at) VALUES "
                + String.join(", ", commands.stream().map(command -> "(?,?,?,?,?,?,?,?,?)").toList());

        return jdbcTemplate.execute((ConnectionCallback<List<Long>>) con -> {
            try (PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                int index = 1;
                for (EventSeatInsertCommand command : commands) {
                    ps.setLong(index++, command.eventSectionId());
                    ps.setLong(index++, command.eventPricePolicyId());
                    ps.setLong(index++, command.venueId());
                    ps.setString(index++, command.rowLabel());
                    ps.setString(index++, command.seatNumber());
                    ps.setString(index++, command.seatLabel());
                    ps.setString(index++, command.seatGrade().name());
                    ps.setTimestamp(index++, Timestamp.from(command.createdAt()));
                    ps.setTimestamp(index++, Timestamp.from(command.updatedAt()));
                }

                ps.executeUpdate();

                List<Long> generatedIds = new ArrayList<>(commands.size());
                try (ResultSet rs = ps.getGeneratedKeys()) {
                    while (rs.next()) {
                        generatedIds.add(rs.getLong(1));
                    }
                }
                // 배치 insert 결과가 하나라도 누락되면 후속 회차 좌석 매핑이 깨진다.
                if (generatedIds.size() != commands.size()) {
                    throw new BaseException(GlobalErrorCode.INTERNAL_SERVER_ERROR, "공연 좌석 배치 저장에 실패했습니다.");
                }
                return generatedIds;
            }
        });
    }

    private void batchInsertSessionSeats(List<SessionSeatInsertCommand> commands) {
        if (commands.isEmpty()) {
            return;
        }

        jdbcTemplate.batchUpdate(
                "INSERT INTO session_seats (session_id, event_seat_id, event_section_id, sale_status, version_no, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                new BatchPreparedStatementSetter() {
                    @Override
                    public void setValues(PreparedStatement ps, int i) throws SQLException {
                        SessionSeatInsertCommand command = commands.get(i);
                        ps.setLong(1, command.sessionId());
                        ps.setLong(2, command.eventSeatId());
                        ps.setLong(3, command.eventSectionId());
                        ps.setString(4, command.saleStatus().name());
                        ps.setLong(5, command.versionNo());
                        ps.setTimestamp(6, Timestamp.from(command.updatedAt()));
                    }

                    @Override
                    public int getBatchSize() {
                        return commands.size();
                    }
                }
        );
    }

    private Set<Long> validateVenueSeatIds(Set<Long> venueSeatIds, Long venueSeatId) {
        if (!venueSeatIds.add(venueSeatId)) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "좌석이 중복되었습니다: " + venueSeatId);
        }
        return venueSeatIds;
    }

    private void validateDuplicatePricePolicyGroup(
            Set<SeatGrade> seatGroupPriceGrades,
            SeatGrade priceGrade
    ) {
        // 같은 가격 정책 등급은 한 번만 허용한다.
        if (!seatGroupPriceGrades.add(priceGrade)) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "좌석 가격 정책 등급이 중복되었습니다: " + priceGrade);
        }
    }

    private List<VenueSeat> getVenueSeatsOrThrow(Set<Long> venueSeatIds) {
        List<VenueSeat> venueSeats = venueSeatRepository.findByIdIn(venueSeatIds);
        // 요청한 좌석 수와 조회된 좌석 수가 다르면 누락된 좌석이 있다.
        if (venueSeats.size() != venueSeatIds.size()) {
            throw new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "일부 공연장 좌석을 찾을 수 없습니다.");
        }
        return venueSeats;
    }

    private void validateDuplicateVenueSeat(Set<Long> venueSeatIds, Long venueSeatId) {
        validateVenueSeatIds(venueSeatIds, venueSeatId);
    }

    private void validateVenueSeatBelongsToVenue(Long venueId, VenueSeat venueSeat) {
        // 다른 공연장 좌석이 섞이면 이벤트 좌석 복제가 잘못된다.
        if (!venueId.equals(venueSeat.getVenueId())) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "다른 공연장의 좌석이 포함되어 있습니다.");
        }
    }

    private Event getEventOrThrow(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new BaseException(GlobalErrorCode.RESOURCE_NOT_FOUND, "공연을 찾을 수 없습니다."));
    }

    private EventPricePolicy getPricePolicy(
            Map<SeatGrade, EventPricePolicy> pricePolicyByGrade,
            SeatGrade priceGrade
    ) {
        EventPricePolicy pricePolicy = pricePolicyByGrade.get(priceGrade);
        // 좌석에 연결할 가격 정책이 없으면 등록을 중단한다.
        if (pricePolicy == null) {
            throw new BaseException(GlobalErrorCode.INVALID_REQUEST, "좌석에 연결할 가격 정책을 찾을 수 없습니다.");
        }
        return pricePolicy;
    }
}
