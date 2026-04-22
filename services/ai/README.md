```bash
ai/
├── configs/                         # 매크로/로깅 전역 설정 및 시나리오 타깃(YAML)
│   ├── macro.yaml                   # 매크로 공통 설정(해상도/로깅 경로 등)
│   └── macro_targets/               # 타깃 시나리오(예: local_login.yaml)
│
├── docs/                            # 문서 및 PoC 코드
│   ├── schema_macro_log.md           # 매크로 로그 스키마 문서
│   └── poc/                          # 프로토타입/실험용 코드 묶음
│       └── mouse/                    # 마우스 이벤트/훅 관련 PoC
│
├── evaluation/                      # 실험/평가 결과 보관(placeholder, .gitkeep 중심)
│   ├── metrics/                      # 지표 산출 결과
│   ├── threshold/                    # threshold 튜닝/기록
│   └── experiments/                  # 실험 단위 폴더
│       ├── anomaly/
│       ├── classifier/
│       └── high_classifier/
│
├── integrations/                    # 외부 시스템 연동(placeholder)
│   ├── db/                           # DB 연동
│   └── redis/                        # Redis 연동
│
├── macro/                           # 매크로 실행/수집 관련 코드
│   ├── base.py                       # BaseMacro: 세션 생명주기 + 타깃 YAML 로드 + 이벤트 로깅 공통화
│   ├── _config.py                    # configs/*.yaml 로더(load_config/load_target) + 기준 해상도 유틸
│   │
│   ├── automouse/                    # 오토마우스 스타일 GUI(무한클릭/시퀀스 매크로)
│   │   └── automouse.py              # Tkinter 기반 실행 파일
│   │
│   ├── browser_automation/           # Playwright 기반 브라우저 행동 수집/매크로 실험 워크스페이스
│   │   ├── README.md                 # 구성/실행 순서(collector_api, simulator, runner, analysis)
│   │   ├── requirements-windows.txt  # Windows 실험 환경 의존성(Playwright 등)
│   │   ├── playwright_macro_gui.py   # Playwright 매크로 GUI 실행 진입점(macro_runner.gui 호출)
│   │   │
│   │   ├── collector_api/            # 수집 API + 매크로 제어 UI(FastAPI)
│   │   │   ├── README.md             # 실행 방법/저장 파일 안내
│   │   │   ├── app/                  # FastAPI 앱(main.py) + 스키마/스토리지
│   │   │   └── data/                 # 수집된 trial/event 저장(예: event_rows.jsonl)
│   │   ├── simulator/                # 예매 흐름을 흉내내는 React UI(행동 이벤트 발생원)
│   │   │
│   │   ├── macro_runner/             # Playwright로 simulator를 자동 조작(CLI + GUI)
│   │   │   ├── cli.py                # Playwright 실행 플로우(좌석선택/캡차/대기 등) CLI
│   │   │   └── gui.py                # 랜덤/프리셋 기반 실행 GUI(collector_api 연동 포함)
│   │   └── analysis/                 # 수집 데이터 분석 노트북/문서
│   │
│   └── mouse_automation/             # PyAutoGUI 기반 마우스 매크로(좌표 클릭/이동)
│       ├── pyautogui_lv1.py          # 고정좌표/직선 이동 위주(단순)
│       ├── pyautogui_lv2.py          # 사람 유사 이동(베지어/노이즈/딜레이 등)
│       └── mouse_utils.py            # 마우스 이동/좌표/딜레이 유틸
│
├── models/                          # 모델 폴더(placeholder)
│   ├── anomaly/
│   ├── classifier/
│   ├── common/
│   └── high_classifier/
│
├── offline_analysis/                # 오프라인 분석/클러스터링(placeholder)
│   ├── anomaly_detection/
│   ├── clustering/
│   ├── feedback/
│   └── similarity/
│
├── serving/                         # 운영 API 서버 영역(placeholder)
│   ├── api/
│   ├── dependencies/
│   └── middleware/
│
├── shadow_mode/                     # shadow 검증 파이프라인(placeholder)
│   ├── analyzer/
│   ├── comparator/
│   └── runner/
│
├── training/                        # 학습/데이터셋 영역(placeholder)
│   └── datasets/
│
├── utils/                           # 공통 유틸
│   └── logging/                     # 세션/이벤트 로깅(파일 저장 등)
│       ├── session.py               # Session: 세션 ID/시작-종료/소요시간 관리
│       └── event_logger.py          # EventLogger: jsonl 등으로 이벤트 기록/flush
│
├── requirements.txt                 # Python 공통 의존성(서빙/매크로 실험용)
├── run_macro.py                     # 매크로 실행 CLI(현재 PyAutoGUI 중심; Playwright는 browser_automation/macro_runner 사용)
├── summarize_sessions.py            # jsonl 세션 파일을 배치 단위로 요약 통계 출력
├── .gitignore                       # ai 워크스페이스 로컬 무시 규칙
└── README.md                        # 코드 구조 문서화
```
