# Collector API App

`collector_api/app`은 저장 API와 매크로 실행 API의 핵심 로직을 담고 있습니다.

## 파일 설명

- `main.py`
  FastAPI 엔드포인트 정의
- `schemas.py`
  요청/응답 데이터 구조 정의
- `storage.py`
  trial JSON 및 JSONL 저장
- `macro_jobs.py`
  Playwright 매크로를 백그라운드 작업으로 실행

## 데이터 흐름

1. simulator가 `/api/trials`로 trial payload를 전송
2. `main.py`가 payload를 받아 라벨 보정
3. `storage.py`가 원본 JSON과 JSONL 집계 파일로 저장
4. 매크로 제어 UI는 `/api/macro/run`을 호출
5. `macro_jobs.py`가 `macro_runner/cli.py`를 별도 프로세스로 실행
