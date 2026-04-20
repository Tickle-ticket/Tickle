# serving/

운영 AI API 서버 (FastAPI). `demo/demo-api/`는 데이터 수집 전용 데모. 여기는 **프로덕션 inference**.

예정 서브 구조:

- `api/` — 엔드포인트 라우터 (/predict, /score 등)
- `dependencies/` — FastAPI DI (모델 로더, 세션 매니저)
- `middleware/` — 인증, 로깅, rate limit, shadow 모드 훅

`pipelines/`를 호출하는 얇은 래퍼 역할. 비즈니스 로직은 pipelines 내부에.
