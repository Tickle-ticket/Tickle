```bash
ai/
├── configs/                  # 환경설정, threshold, feature flag
├── demo/                     # 웹 이벤트 수집 + feature 검증용
│   ├── front-demo/
│   └── demo-api/
│       ├── routers/
│       ├── services/
│       └── schemas/
├── evaluation/               # 모델 성능 평가 + 실험 기록
│   ├── metrics/
│   ├── threshold/
│   └── experiments/
│       ├── anomaly/
│       ├── classifier/
│       └── high_classifier/
├── integrations/             # Redis / DB 외부 시스템 연동
│   ├── db/
│   └── redis/
├── macro/                    # 매크로 시뮬레이션 / 데이터 생성 (공격 패턴)
│   ├── browser_automation/
│   └── mouse_automation/
├── models/                   # 모델 정의 (anomaly / 1차 / 2차)
│   ├── anomaly/
│   ├── classifier/
│   ├── common/
│   └── high_classifier/
├── offline_analysis/         # 오프라인 분석 + 클러스터링 + 재학습 데이터 생성
│   ├── anomaly_detection/
│   ├── clustering/
│   ├── feedback/
│   └── similarity/
├── pipelines/                # 실시간 inference 흐름 (핵심)
│   ├── decision/
│   ├── feature/
│   ├── preprocess/
│   └── routing/
├── schemas/                  # 데이터 구조 정의 (input / feature / response)
├── serving/                  # 운영 AI API 서버 (FastAPI)
│   ├── api/
│   ├── dependencies/
│   └── middleware/
├── shadow_mode/              # shadow 모델 검증 (prod 비교, diff 분석)
│   ├── analyzer/
│   └── (runner / comparator 등)
├── tests/                    # 코드 동작 검증 (unit / integration)
│   ├── test_integrations/
│   ├── test_models/
│   ├── test_pipelines/
│   └── test_serving/
├── training/                 # 모델 학습 및 dataset 생성
│   └── datasets/
├── utils/                    # 공통 유틸 (logger, time, io 등)
└── README.md                 # 전체 AI 시스템 개요 및 사용 방법

```