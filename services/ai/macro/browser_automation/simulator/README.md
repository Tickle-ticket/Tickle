# Simulator

예매 흐름을 흉내 내는 프론트엔드입니다.

## 역할

- 예매 시작 / 대기열 / captcha / 좌석 선택 화면 제공
- 사용자의 raw event 수집 시작과 종료 제어
- 수집된 trial payload를 `collector_api`로 전송

## 코드 구조

- `src/pages/booking_demo.jsx`
  화면 조합과 단계 전환을 담당합니다.
- `src/tracking/core.js`
  seat 생성, session 구조, metric 계산 같은 추적 로직을 담당합니다.
- `src/api/trials.js`
  `collector_api`와 통신하는 fetch 함수를 모아둡니다.
- `src/styles/index.css`
  전역 스타일만 담당합니다.

## 실행

```bash
cd services/ai/macro/browser_automation/simulator
npm run dev
```

## 메모

- 실제 서비스로 옮길 때는 `pages`는 바뀌더라도 `tracking`, `api`는 재사용 가능하도록 분리해 두었습니다.
