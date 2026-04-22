# Macro Runner

Playwright 기반 자동 실행 로직입니다.

## 역할

- simulator 또는 향후 실제 웹을 자동으로 조작
- 좌석 선택, captcha 입력, 예매 진행 같은 반복 동작 수행
- `collector_api`의 매크로 제어 UI에서 호출됨

## 파일 설명

- `cli.py`
  매크로 실행의 실제 진입점입니다.
- `../playwright_macro.py`
  기존 실행 명령을 유지하기 위한 호환 래퍼입니다.

## 직접 실행

```bash
cd services/ai/macro/browser_automation
python playwright_macro.py --url http://localhost:5173 --skip-queue --seats B3 B4 --confirm-booking
```

## 메모

- 현재는 demo selector 기준으로 작성되어 있습니다.
- 나중에 다른 웹으로 이식할 때는 selector/flow adapter를 추가하는 방향이 좋습니다.
