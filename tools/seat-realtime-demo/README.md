# Seat Realtime Demo

백엔드 좌석 조회/선점/해제/SSE Push API를 FE 디렉토리와 분리해서 시연하기 위한 정적 페이지입니다.

## 실행

`services/be` 서버를 먼저 `localhost:8080`에서 실행한 뒤, 이 디렉토리를 `localhost:3000`으로 서빙합니다.

```bash
cd tools/seat-realtime-demo
python3 -m http.server 3000
```

브라우저에서 엽니다.

```text
http://localhost:3000
```

## 시연 흐름

1. `eventId`, `scheduleId`, `userId`를 입력합니다.
2. `좌석 조회`를 누릅니다.
3. `SSE 연결`을 누릅니다.
4. 같은 페이지를 다른 탭에서도 열고 `userId`만 다르게 설정합니다.
5. 한 탭에서 AVAILABLE 좌석을 선택해 `선택 좌석 선점`을 누릅니다.
6. 다른 탭에서 좌석 색상과 SSE 로그가 즉시 바뀌는지 확인합니다.

## 사용하는 API

- `GET /api/v1/events/{eventId}/schedules/{scheduleId}/seats`
- `GET /api/v1/events/{eventId}/schedules/{scheduleId}/seats/stream`
- `POST /api/v1/events/{eventId}/schedules/{scheduleId}/seats/hold?userId={userId}`
- `DELETE /api/v1/events/{eventId}/schedules/{scheduleId}/seats/hold?userId={userId}`
