import { http, HttpResponse, delay } from 'msw';

export const handlers = [
  // 디테일 페이지 모킹 API
  http.get('/api/detail', async () => {
    // 실제 서버 통신처럼 약간의 지연 시간 추가 (Skeleton 확인용)
    await delay(1000);

    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: {
        imageUrl: 'https://i.namu.wiki/i/u4Jy5i1HH21xCnVvPY0FXyC_jYRlt9rorKH95IMVNFdO5ZiFsd6J8JPuPK-JgRUb2Ngu6M-r6vudsw27aZ8yJJeJRz3SDXYHuM326_zq3LevCttDTg8dujFCCFUE4TMUzD2Waez43-6e2j-DZrf-NA.webp',
        mainTitle: '오페라의 유령',
        subTitle: 'The Phantom of the Opera',
        date: '2024.07.26 ~ 2024.11.16',
        venue: '샤롯데씨어터',
        features: ['Photography', 'Videography', 'Graphic Design', 'Illustration', 'Animation'],
        quote: 'We help you to create the best graphics, photos, videos, animations and illustrations',
        sections: {
          info: {
            title: '공연 정보',
            content: [
              {
                title: '장소',
                descriptions: [
                  '블루스퀘어 신한카드홀',
                  '서울특별시 용산구 이태원로 294',
                ]
              },
              {
                title: '등급',
                descriptions: [
                  '만 13세 이상 관람가'
                ]
              },
              {
                title: '러닝타임',
                descriptions: [
                  '총 러닝타임 약 150분 (인터미션 15분 포함)',
                ]
              },
              {
                title: '기타',
                descriptions: [
                  '주차 및 발렛파킹 불가 (대중교통 이용 권장)',
                  '공연 시작 후 입장 제한'
                ]
              }
            ]
          },
          price: {
            columns: [
              { key: 'seat', header: '좌석 등급', align: 'left' },
              { key: 'price', header: '가격', align: 'right' }
            ],
            data: [
              { seat: 'VIP석', price: '170,000원' },
              { seat: 'R석', price: '140,000원' },
              { seat: 'S석', price: '110,000원' },
              { seat: 'A석', price: '80,000원' }
            ]
          },
          schedule: {
            title: '공연 일정',
            columns: [
              { key: 'date', header: '날짜', align: 'left' },
              { key: 'time', header: '시간', align: 'left' }
            ],
            data: [
              { date: '2026.04.23 (목)', time: '14:00, 19:30' },
              { date: '2026.04.24 (금)', time: '19:30' },
              { date: '2026.04.25 (토)', time: '14:00, 18:00' },
              { date: '2026.04.26 (일)', time: '14:00' },
              { date: '2026.04.28 (화)', time: '19:30' },
              { date: '2026.04.29 (수)', time: '14:00, 19:30' }
            ]
          },
          details: {
            title: '상세 정보',
            imageUrl: 'https://tkfile.yes24.com/Upload2/Board/202310/20231018/45927_18.jpg'
          }
        }
      },
    });
  }),

  // 유저 프로필 모킹 API
  http.get('/api/user/profile', async () => {
    await delay(500); // 아바타 스켈레톤 로딩 확인용
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: {
        avatarUrl: '/images/avatar_placeholder.png',
        name: 'Guest User',
      },
    });
  }),

  // 좌석 상태 조회 모킹 API
  http.get('/api/seats', async () => {
    await delay(600); // 로딩 시뮬레이션

    // 모든 좌석의 예약 가능 상태(true: 예약 가능, false: 시야제한석 등 비활성화)를 명시적으로 정의
    const mockSeats: Record<string, boolean> = {
      // 상단 좌측 블록 (A~C열)
      'A1': true, 'A2': true, 'A3': true, 'A4': true, 'A5': true,
      'B1': true, 'B2': true, 'B3': true, 'B4': true, 'B5': true,
      'C1': true, 'C2': true, 'C3': true, 'C4': true, 'C5': true,

      // 상단 우측 블록 (A~C열)
      'A6': true, 'A7': true, 'A8': true, 'A9': true, 'A10': true,
      'B6': true, 'B7': true, 'B8': true, 'B9': true, 'B10': true,
      'C6': true, 'C7': true, 'C8': true, 'C9': true, 'C10': true,

      // 하단 좌측 블록 (G~P열)
      'G1': true, /* 시야제한 */ 'G2': true, /* 시야제한 */ 'G3': true, 'G4': true, 'G5': true, 'G6': true, 'G7': true,
      'H1': true, 'H2': true, 'H3': true, 'H4': true, 'H5': true, 'H6': true, 'H7': true,
      'I1': true, 'I2': true, 'I3': true, 'I4': true, 'I5': true, 'I6': true, 'I7': true,
      'J1': true, 'J2': true, 'J3': true, 'J4': true, 'J5': true, 'J6': true, 'J7': true,
      'K1': true, /* 시야제한 */ 'K2': true, 'K3': true, 'K4': true, 'K5': true, 'K6': true, 'K7': true, 'K8': true,
      'L1': true, /* 시야제한 */ 'L2': true, 'L3': true, 'L4': true, 'L5': true, 'L6': true, 'L7': true, 'L8': true,
      'M1': true, /* 시야제한 */ 'M2': true, 'M3': true, 'M4': true, 'M5': true, 'M6': true, 'M7': true, 'M8': true,
      'N1': true, 'N2': true, 'N3': true, 'N4': true, 'N5': true, 'N6': true, 'N7': true, 'N8': true,
      'O1': true, 'O2': true, 'O3': true, 'O4': true, 'O5': true, 'O6': true, 'O7': true, 'O8': true,
      'P1': true, 'P2': true, 'P3': true, 'P4': true, 'P5': true, 'P6': true, 'P7': true, 'P8': true, /* 전체 시야제한 */

      // 하단 우측 블록 (G~P열)
      'G8': true, 'G9': true, 'G10': true, 'G11': true, 'G12': true, 'G13': true, 'G14': true,
      'H8': true, 'H9': true, 'H10': true, 'H11': true, 'H12': true, 'H13': true, 'H14': true,
      'I8': true, 'I9': true, 'I10': true, 'I11': true, 'I12': true, 'I13': true, 'I14': true,
      'J8': true, 'J9': true, 'J10': true, 'J11': true, 'J12': true, 'J13': true, 'J14': true,
      'K9': true, 'K10': true, 'K11': true, 'K12': true, 'K13': true, 'K14': true, 'K15': true, 'K16': true, /* 시야제한 */
      'L9': true, 'L10': true, 'L11': true, 'L12': true, 'L13': true, 'L14': true, 'L15': true, 'L16': true, /* 시야제한 */
      'M9': true, 'M10': true, 'M11': true, 'M12': true, 'M13': true, 'M14': true, 'M15': true, 'M16': true, /* 시야제한 */
      'N9': true, 'N10': true, 'N11': true, 'N12': true, 'N13': true, 'N14': true, 'N15': true, 'N16': true, /* N16은 시야제한이 아님 */
      'O9': true, 'O10': true, 'O11': true, 'O12': true, 'O13': true, 'O14': true, 'O15': true, 'O16': true, /* O16은 시야제한이 아님 */
      'P9': true, 'P10': true, 'P11': true, 'P12': true, 'P13': true, 'P14': true, 'P15': true, 'P16': true, /* 전체 시야제한 */
    };

    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: mockSeats
    });
  }),
];
