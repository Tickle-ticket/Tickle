```bash
ai/
├── demo/                      # 웹 이벤트 수집 + feature 검증용
│   ├── front-demo/
│   └── demo-api/
│       ├── routers/
│       ├── services/
│       └── schemas/
│
├── pipelines/                # 실시간 inference 흐름 (핵심)
│   ├── preprocess/
│   ├── feature/
│   ├── routing/
│   └── decision/
│
├── models/                   # 모델 정의
│   ├── anomaly/
│   ├── classifier/
│   ├── high_classifier/
│   └── common/
│
├── offline_analysis/         # 오프라인 분석 + 재학습 데이터 생성
│   ├── clustering/
│   ├── anomaly_detection/
│   ├── similarity/
│   └── feedback/
│
├── training/                 # 학습
│   └── datasets/
│
├── evaluation/               # 성능 평가 + 실험 기록
│   ├── metrics/
│   ├── threshold/
│   └── experiments/
│       ├── classifier/
│       ├── anomaly/
│       └── high_classifier/
│
├── serving/                  # API 서버
│   ├── api/
│   ├── dependencies/
│   └── middleware/
│
├── shadow_mode/              # shadow 검증
│   ├── analyzer/
│   └── (runner / comparator 등)
│
├── integrations/             # Redis / DB
│   ├── redis/
│   └── db/
│
├── configs/                  # 설정값
├── schemas/                  # 데이터 구조
├── utils/                    # 공통 유틸
└── tests/                    # 테스트
    ├── test_pipelines/
    ├── test_models/
    ├── test_integrations/
    └── test_serving/

```