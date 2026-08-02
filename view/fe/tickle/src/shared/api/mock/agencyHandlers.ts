import { delay, http, HttpResponse } from 'msw';

const mockOrganizers = [
  {
    organizerId: 1,
    organizerName: 'SSAFY 18',
  },
  {
    organizerId: 2,
    organizerName: 'Tikkle Stage',
  },
  {
    organizerId: 3,
    organizerName: 'Blue Square Partners',
  },
  {
    organizerId: 4,
    organizerName: 'Seoul Art Company',
  },
];

const mockVenueTemplate = {
  venueId: 4001,
  venueName: '티클 아레나',
  sections: [
    {
      venueSectionId: 4101,
      sectionName: 'A구역',
      displayOrder: 1,
      seats: [
        { venueSeatId: 5001, rowLabel: 'A', seatNumber: '1', seatLabel: 'A-1', seatGrade: 'VIP' },
        { venueSeatId: 5002, rowLabel: 'A', seatNumber: '2', seatLabel: 'A-2', seatGrade: 'VIP' },
        { venueSeatId: 5003, rowLabel: 'A', seatNumber: '3', seatLabel: 'A-3', seatGrade: 'VIP' },
        { venueSeatId: 5004, rowLabel: 'A', seatNumber: '4', seatLabel: 'A-4', seatGrade: 'VIP' },
        { venueSeatId: 5005, rowLabel: 'A', seatNumber: '5', seatLabel: 'A-5', seatGrade: 'VIP' },
        { venueSeatId: 5006, rowLabel: 'A', seatNumber: '6', seatLabel: 'A-6', seatGrade: 'R' },
        { venueSeatId: 5007, rowLabel: 'A', seatNumber: '7', seatLabel: 'A-7', seatGrade: 'R' },
        { venueSeatId: 5008, rowLabel: 'A', seatNumber: '8', seatLabel: 'A-8', seatGrade: 'R' },
      ],
    },
  ],
};


/**
 * 기획사가 등록한 공연 목록.
 *
 * <p>모듈 스코프에 두어 등록·삭제가 실제로 반영되게 한다. 등록을 마치면 목록에
 * 나타나고 삭제하면 사라진다.</p>
 */
let agencyEvents = [
  {
    eventId: 3001,
    eventName: '오페라의 유령',
    venueName: '샤롯데씨어터',
    eventStartAt: '2026-09-15T19:30:00Z',
    eventEndAt: '2026-11-16T21:30:00Z',
    salesStartAt: '2026-08-01T10:00:00Z',
    reservationRate: 62,
  },
  {
    eventId: 3002,
    eventName: '맘마미아',
    venueName: 'LG아트센터 서울',
    eventStartAt: '2026-10-01T19:00:00Z',
    eventEndAt: '2026-12-28T21:00:00Z',
    salesStartAt: null,
    reservationRate: 0,
  },
];

let nextAgencyEventId = 3100;

export const agencyHandlers = [
  http.get('*/api/v1/organizers', async () => {
    await delay(300);

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: {
        organizers: mockOrganizers,
      },
    });
  }),
  http.get('*/api/v1/agency/venues/:venueId/template', async () => {
    await delay(200);

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: mockVenueTemplate,
    });
  }),

  // 기획사 공연 목록
  http.get('*/api/v1/agency/events', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '0');
    const size = Number(url.searchParams.get('size') ?? '10');
    const start = page * size;
    const items = agencyEvents.slice(start, start + size);

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: {
        items,
        page,
        size,
        totalElements: agencyEvents.length,
        totalPages: Math.max(1, Math.ceil(agencyEvents.length / size)),
        hasNext: start + size < agencyEvents.length,
      },
    });
  }),

  // 공연 등록 (1단계) — 기본 정보와 이미지
  //
  // 실제 요청은 multipart라 본문을 읽지 않는다. 새 eventId를 만들어 돌려주면
  // 이후 단계(가격·회차·좌석)가 그 번호로 이어진다.
  http.post('*/api/v1/agency/events', async () => {
    await delay(500);
    const eventId = nextAgencyEventId;
    nextAgencyEventId += 1;

    agencyEvents = [
      {
        eventId,
        eventName: '새로 등록한 공연',
        venueName: '샤롯데씨어터',
        eventStartAt: new Date().toISOString(),
        eventEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        salesStartAt: null,
        reservationRate: 0,
      },
      ...agencyEvents,
    ];

    return HttpResponse.json({
      status: 201,
      code: 'CREATED',
      message: 'success',
      data: { eventId, title: '새로 등록한 공연' },
    });
  }),

  // 공연 삭제
  http.delete('*/api/v1/agency/events/:eventId', async ({ params }) => {
    await delay(300);
    const eventId = Number(params.eventId);
    agencyEvents = agencyEvents.filter((event) => event.eventId !== eventId);

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: null,
    });
  }),

  // 공연 등록 2~4단계 — 가격 정책·회차·좌석
  //
  // 서버는 성공만 알려주고 본문을 돌려주지 않는다(ApiResponse<void>).
  http.post('*/api/v1/agency/events/:eventId/price-policies', async () => {
    await delay(300);
    return HttpResponse.json({ status: 200, code: 'OK', message: 'success', data: null });
  }),

  http.post('*/api/v1/agency/events/:eventId/sessions', async () => {
    await delay(300);
    return HttpResponse.json({ status: 200, code: 'OK', message: 'success', data: null });
  }),

  http.post('*/api/v1/agency/events/:eventId/seats', async () => {
    await delay(300);
    return HttpResponse.json({ status: 200, code: 'OK', message: 'success', data: null });
  }),
];
