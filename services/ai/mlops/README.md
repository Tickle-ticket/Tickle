# mlops/

운영 단계 자동화 + 모니터링.

**범위 1: 학습 자동화**
- 재학습 트리거 (데이터 누적량, 성능 드리프트 기반)
- 스케줄러 (cron, Airflow, Prefect 등)
- 학습 파이프라인 orchestration

**범위 2: 모델 모니터링**
- 프로덕션 모델 성능 추적 (precision/recall drift)
- 입력 분포 드리프트 감지 (feature distribution shift)
- 알림 (Slack, 이메일)

모델이 첫 배포된 이후 본격 작성. 그 전엔 비워둠.
