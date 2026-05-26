

<div align="center">

# 🎫 Tickle - 공정한 티켓팅 플랫폼

> "매크로가 사라진 자리, **공정한 티켓팅**이 시작됩니다"

</div>

---

## 🎫 프로젝트 소개

티켓팅 전쟁에서 매번 패배하셨나요? 눈 깜짝할 사이 매진되는 티켓, 그 뒤엔 항상 매크로가 있었습니다.
Tickle(티클)은 사용자의 **마우스 움직임, 클릭 패턴, 키보드 입력**을 AI가 실시간으로 분석하여 매크로를 탐지하고 차단하는 **공정한 티켓 예매 플랫폼**입니다.

28개 이상의 행동 특성(Behavioral Feature)을 추출하고, **LightGBM · XGBoost · Random Forest 앙상블 모델**이 실시간으로 봇과 사람을 구분합니다.
탐지 결과에 따라 ALLOW · REVIEW · BLOCK 3단계로 분류하여, 정상 사용자에게는 쾌적한 예매 경험을, 매크로에게는 단호한 차단을 제공합니다.

**Cloudflare Turnstile CAPTCHA**, **대기열 시스템**, **카카오페이 결제**까지 —
예매의 처음부터 끝까지, 공정하고 안전한 티켓팅의 새로운 기준, **Tickle**.

---

## 🎫 프로젝트 기간
2026.04.14 ~ 2026.05.22 (6주)

---

## 👥 팀원 소개

<table>
  <tr>
    <td align="center" width="150">
      <img src="photo/Profile/yang_huiryeong.png" width="100" height="100" style="border-radius: 50%;" /><br />
      <b>양희령</b>
    </td>
    <td align="center" width="150">
      <img src="photo/Profile/jeong_jeonggyo.png" width="100" height="100" style="border-radius: 50%;" /><br />
      <b>정정교</b>
    </td>
    <td align="center" width="150">
      <img src="photo/Profile/lim_chanhyeok.png" width="100" height="100" style="border-radius: 50%;" /><br />
      <b>임찬혁</b>
    </td>
    <td align="center" width="150">
      <img src="photo/Profile/kim_bogyeom.png" width="100" height="100" style="border-radius: 50%;" /><br />
      <b>김보겸</b>
    </td>
    <td align="center" width="150">
      <img src="photo/Profile/kang_youngwook.png" width="100" height="100" style="border-radius: 50%;" /><br />
      <b>강영욱</b>
    </td>
    <td align="center" width="150">
      <img src="photo/Profile/lee_minyeop.png" width="100" height="100" style="border-radius: 50%;" /><br />
      <b>이민엽</b>
    </td>
  </tr>
  <tr>
    <td align="center" width="150">
      PM / BE<br/>Leader
    </td>
    <td align="center" width="150">
      Infra / BE<br/>Developer
    </td>
    <td align="center" width="150">
      AI<br/>Leader
    </td>
    <td align="center" width="150">
      AI<br/>Developer
    </td>
    <td align="center" width="150">
      Frontend<br/>Developer
    </td>
    <td align="center" width="150">
      Frontend<br/>Developer
    </td>
  </tr>
</table>

---

## 🎫 주요 기능
### 1. AI 매크로 탐지 시스템 (AI Bot Detection)
> 핵심 기술: **Kafka, FastAPI, Ensemble ML, PostgreSQL**
- **실시간 행동 분석**
    - 브라우저 JS SDK가 마우스 이동 궤적, 클릭 타이밍, 키보드 입력 패턴 등 **28개 이상의 행동 특성**을 수집
    - **Kafka 메시지 큐**를 통해 대량의 행동 데이터를 비동기로 처리
- **앙상블 ML 예측 엔진**
    - 페이지 유형별(DETAIL · CAPTCHA · BOOKING) **다중 모델 앙상블** 구성
    - LightGBM, XGBoost, Random Forest, Logistic Regression 등 다양한 분류기 활용
    - Soft/Hard Voting 전략으로 탐지 정확도 극대화
- **3단계 판정 시스템**
    - **ALLOW** (p_macro ≤ 0.40): 정상 사용자 → 예매 진행
    - **REVIEW** (0.40 < p_macro < 0.75): 의심 사용자 → 추가 검증(CAPTCHA)
    - **BLOCK** (p_macro ≥ 0.75): 매크로 판정 → 즉시 차단 및 백엔드 콜백

### 2. 공연 예매 시스템 (Ticket Booking)
> 핵심 기술: **SSE, Redis, Cloudflare Turnstile**
- **실시간 대기열 시스템**
    - 대규모 트래픽을 안정적으로 처리하는 **Redis 기반 대기열** 구현
    - **SSE(Server-Sent Events)** 를 통한 실시간 대기 순번 및 상태 안내
- **좌석 선택 및 선점**
    - 실시간 좌석 현황 확인 및 좌석 선점/해제 기능
    - 동시 접근 제어를 통한 중복 예매 방지
- **CAPTCHA 보안 검증**
    - **Cloudflare Turnstile** 기반 봇 차단 CAPTCHA 적용
    - AI 탐지 시스템과 연계한 이중 보안 체계

### 3. 결제 시스템 (Payment)
> 핵심 기술: **카카오페이 API, 무통장 입금**
- **카카오페이 간편결제**
    - 카카오페이 API 연동을 통한 원클릭 간편 결제
    - 결제 승인/취소/실패에 대한 완전한 상태 관리
- **무통장 입금**
    - 계좌 안내 및 입금 확인 프로세스 지원
- **예매 확정 및 취소 환불**
    - 예매번호 발급, 예매 내역 조회, 취소 환불 처리

### 4. 공연 관리 시스템 (Agency & Admin)
> 핵심 기술: **Spring Boot, AWS S3, MySQL**
- **주최사(Agency) 대시보드**
    - 공연 등록/수정/삭제 및 회차(세션) 관리
    - 좌석 배치도 일괄 등록 및 가격 정책 설정
    - 정산 내역 관리
- **관리자(Admin) 대시보드**
    - 매크로 탐지 현황 실시간 모니터링
    - 대기열 관리 및 블랙리스트 관리
    - 서버 상태 모니터링

### 5. 사용자 서비스 (User Service)
> 핵심 기술: **카카오 OAuth, JWT, CoolSMS**
- **소셜 로그인**
    - 카카오 OAuth 기반 간편 회원가입/로그인
- **마이페이지**
    - 예매 내역 조회, 관심 공연 위시리스트, 프로필 관리
    - 취소표 대기(Waitlist) 신청 및 관리
- **SMS 알림**
    - CoolSMS 연동을 통한 예매 확정/취소표 알림 발송

### 6. 공연 검색 및 상세 정보 (Search & Detail)
> 핵심 기술: **Next.js 16, React Query, Framer Motion**
- **통합 검색**
    - 공연명, 주최사, 장르 등 다양한 조건의 통합 검색
- **공연 상세 정보**
    - 공연 정보, 회차별 잔여 좌석, 가격 정보 등 상세 메타데이터 제공
    - 부드러운 UI 애니메이션과 인터랙션

---

## 🎫 기술 스택

### Frontend
| 분류 | 기술 |
| :---: | :--- |
| **Framework** | Next.js 16, React 19 |
| **Language** | TypeScript 5 |
| **State Management** | Zustand 5, TanStack React Query 5 |
| **Styling** | TailwindCSS 4 |
| **Animation** | Framer Motion 12, Lottie React |
| **Chart** | Recharts 3 |
| **Bot Protection** | Cloudflare Turnstile |
| **Testing** | Vitest, Playwright, Storybook 10 |
| **API Mocking** | MSW (Mock Service Worker) |

### Backend
| 분류 | 기술 |
| :---: | :--- |
| **Framework** | Spring Boot (Java) |
| **Database** | MySQL 8.0 |
| **Cache** | Redis 7 |
| **Message Queue** | Apache Kafka (Confluent 7.5.0) |
| **Payment** | 카카오페이 API |
| **SMS** | CoolSMS API |
| **Storage** | AWS S3 |
| **Auth** | JWT, 카카오 OAuth |

### AI
| 분류 | 기술 |
| :---: | :--- |
| **Framework** | FastAPI, Uvicorn |
| **ML Models** | LightGBM, XGBoost, CatBoost, scikit-learn (Random Forest, Logistic Regression) |
| **Data Processing** | pandas, numpy, joblib |
| **Data Pipeline** | Confluent Kafka (Python), Spring Kafka (Java, Ingest) |
| **Database** | PostgreSQL 16 |
| **Visualization** | matplotlib, seaborn, plotly, Jupyter |
| **Macro Simulator** | pyautogui, Playwright, pynput |

### Infra / DevOps
| 분류 | 기술 |
| :---: | :--- |
| **CI/CD** | Jenkins |
| **Container** | Docker, Docker Compose |
| **Monitoring** | Prometheus (Node Exporter), Grafana (Promtail, Loki) |
| **Notification** | Mattermost Webhook |

---

## 📁 Tickle 프로젝트 폴더 구조
<details open>
<summary><b>📦 S14P31A203 (Root)</b></summary>

<pre>
├── 📄 docker-compose.yml
├── 📄 Jenkinsfile
├── 📄 Jenkinsfile.ci
├── 📄 README.md
├── 📁 infra/
├── 📁 services/
└── 📁 view/
</pre>

<details>
<summary><b>📂 view/fe/tickle</b> - 프론트엔드 (Next.js 16)</summary>

<details>
<summary><b>🔹 src/app</b> - 페이지 라우팅</summary>

<pre>
├── page.tsx                  # 메인 홈페이지
├── layout.tsx                # 루트 레이아웃
├── globals.css               # 글로벌 스타일
├── admin/                    # 관리자 대시보드
│   ├── page.tsx
│   ├── bot-detection/        # 매크로 탐지 현황
│   ├── queue/                # 대기열 관리
│   └── server/               # 서버 모니터링
├── agency/                   # 주최사 대시보드
│   ├── page.tsx
│   ├── performances/         # 공연 관리
│   └── settlements/          # 정산 관리
├── detail/                   # 공연 상세 페이지
├── login/                    # 로그인 (카카오 OAuth)
│   ├── page.tsx
│   └── kakao/                # 카카오 콜백
├── signup/                   # 회원가입
├── oauth/                    # OAuth 처리
├── mypage/                   # 마이페이지
├── payment/                  # 결제 (성공/실패/취소)
│   ├── success/
│   ├── fail/
│   └── cancel/
├── blocked/                  # 차단 안내 페이지
├── support/                  # 고객 지원
└── api/                      # API Route Handlers
</pre>
</details>

<details>
<summary><b>🔹 src/features</b> - 기능별 모듈 (FSD 아키텍처)</summary>

<pre>
├── home/                     # 홈 화면
│   ├── api/                  # 홈 관련 API
│   └── ui/
│       └── HomeView.tsx
├── book/                     # 예매 프로세스
│   ├── api/                  # 예매 API
│   ├── hooks/                # 예매 커스텀 훅
│   ├── store/                # 예매 상태 관리
│   └── ui/
│       └── BookView.tsx
├── queue/                    # 대기열
│   └── ui/
│       └── QueueView.tsx
├── detail/                   # 공연 상세
│   ├── api/
│   ├── hooks/
│   └── ui/
│       └── DetailView.tsx
├── search/                   # 검색
│   ├── api/
│   └── ui/
│       └── SearchContent.tsx
├── cancellation/             # 취소표 대기
│   ├── api/
│   └── ui/
│       └── CancellationDetailView.tsx
└── mypage/                   # 마이페이지
    ├── api/
    └── ui/
        ├── MyPageView.tsx
        ├── MyBookingsView.tsx
        ├── BookingDetailView.tsx
        ├── ProfileEditView.tsx
        ├── WaitlistManagementView.tsx
        └── UpcomingWishlistView.tsx
</pre>
</details>

<details>
<summary><b>🔹 src/shared</b> - 공통 모듈</summary>

<pre>
├── api/                      # 공통 API 클라이언트
├── components/               # 공통 UI 컴포넌트
├── config/                   # 환경 설정
├── hooks/                    # 공통 커스텀 훅
├── lib/                      # 유틸리티 라이브러리
├── lottle/                   # Lottie 애니메이션
├── providers/                # React Provider
├── store/                    # 전역 상태 관리
├── tracking/                 # 행동 추적 (AI 연동)
│   ├── TrialCollector.ts     # 행동 데이터 수집기
│   ├── trialTypes.ts         # 행동 데이터 타입 정의
│   ├── useTargetTracker.ts   # 타겟 요소 추적 훅
│   └── useTrialCollector.ts  # 수집기 커스텀 훅
└── utils/                    # 유틸리티 함수
</pre>
</details>

</details>

<details>
<summary><b>📂 services/be</b> - 백엔드 (Spring Boot)</summary>

<pre>
src/main/java/com/ssafy/tickle/
├── admin/                    # 관리자 기능
│   └── application/ presentation/
├── agency/                   # 주최사 (공연 등록/관리)
│   └── event/
│       └── application/ domain/ infrastructure/ presentation/
├── ai/                       # AI 연동 (매크로 탐지 결과 수신)
│   └── application/ infrastructure/ presentation/
├── blacklist/                # 블랙리스트 관리
│   └── application/ domain/ infrastructure/ presentation/
├── cancellation/             # 취소표 대기 시스템
│   └── application/ domain/ infrastructure/ presentation/
├── event/                    # 공연 정보
│   └── application/ config/ domain/ infrastructure/ presentation/
├── organizer/                # 주최사 정보
├── payment/                  # 결제 (카카오페이/무통장)
│   └── application/ domain/ infrastructure/ presentation/
├── queue/                    # 대기열 시스템
│   └── application/ config/ domain/ infrastructure/ presentation/
├── reservation/              # 예매
│   └── application/ domain/ infrastructure/ presentation/
├── seat/                     # 좌석 관리
│   └── application/ domain/ infrastructure/
├── user/                     # 사용자 관리
│   └── application/ domain/ infrastructure/ presentation/
├── venue/                    # 공연장 정보
└── common/                   # 공통 모듈
    ├── config/               # WebCors, WebMvc 설정
    ├── exception/            # 글로벌 예외 처리
    ├── interceptor/          # 인증, 블랙리스트, Rate Limit
    ├── sse/                  # SSE (Server-Sent Events)
    └── util/                 # JWT, Redis Lock Manager
</pre>
</details>

<details>
<summary><b>📂 services/auth</b> - 인증 서비스 (Spring Boot)</summary>

<pre>
src/main/java/
└── (카카오 OAuth, JWT 토큰 발급/검증, 회원가입/로그인)
</pre>
</details>

<details>
<summary><b>📂 services/ai</b> - AI 매크로 탐지 (FastAPI + ML)</summary>

<pre>
├── serving/                  # 프로덕션 서빙 코드
│   ├── main.py               # Kafka Consumer 메인 루프
│   ├── api.py                # FastAPI 내부 API
│   ├── pipeline.py           # 배치 처리 파이프라인
│   ├── macro_predictor.py    # 앙상블 모델 예측 엔진
│   ├── kafka_consumer.py     # Kafka Consumer 설정
│   ├── repository.py         # PostgreSQL 데이터 접근
│   ├── schemas.py            # 데이터 스키마
│   └── be_callback_client.py # 백엔드 콜백 클라이언트
├── models/                   # ML 모델 아티팩트
│   ├── BOOKING/              # 예매 페이지 앙상블
│   ├── CAPTCHA/              # CAPTCHA 페이지 앙상블
│   └── DETAIL/               # 상세 페이지 앙상블
├── ingest/                   # 데이터 수집 (Spring Kafka)
├── train/                    # 모델 학습
│   ├── EDA/                  # 탐색적 데이터 분석
│   └── model_experiment/     # 모델 실험 노트북
├── macro/                    # 매크로 시뮬레이터 (학습 데이터 생성)
│   ├── automouse/            # 자동 마우스 매크로
│   ├── custom_macro/         # GUI 매크로 + OCR CAPTCHA 솔버
│   └── raw/                  # 기본 매크로 스크립트
├── utils/                    # 데이터 전처리 유틸리티
├── shadow_mode/              # 프로덕션 데이터 추출
├── test/                     # 단일 모델 성능 테스트
├── test_ensemble/            # 앙상블 모델 성능 테스트
└── docker/                   # Docker Compose 환경
    └── docker-compose.yml    # 전체 AI 스택 오케스트레이션
</pre>
</details>

<details>
<summary><b>📂 infra</b> - 인프라 설정</summary>

<pre>
├── docker-compose/
│   └── server1-main.yml      # 메인 서버 (MySQL, Redis, BE, Monitoring)
└── redis/                    # Redis 설정
</pre>
</details>

</details>

---

## 산출물

### IA
<img src="photo/artifacts/IA.png">

### ERD
<img src="photo/artifacts/erd.png">

### Infra Architecture
<img src="photo/artifacts/architecture.png">

### API 명세서
[API 명세서](https://rowan-octopus-031.notion.site/API-33665a678df9816bb888f687c9c83690?source=copy_link)

### 기타 산출물
| 산출물 | 링크 |
| :---: | :--- |
| **PRD (기획서)** | [PRD 기획서](https://rowan-octopus-031.notion.site/PRD-33665a678df981febd51d647ea8300f1?source=copy_link) |
| **포팅 매뉴얼** | [포팅 매뉴얼](https://www.notion.so/36765a678df98022ae32dd7d2faeaae3) |
| **최종 발표** | [최종 발표자료](https://canva.link/9zu4gaq7azwe6rg) |
| **중간 발표** | [중간 발표자료](https://canva.link/rt55423gscxmlzg) |

---

## 협업 방식

### 1. Git
- [Git Convention](https://www.notion.so/Git-Convention-33665a678df981c2aa5fc447ed48cbca?source=copy_link) 기반 브랜치 전략
- Git Flow: `main` → `develop` → `develop-fe` / `develop-be` / `develop-ai` → `feature branches`
- Mattermost 웹훅 연동으로 CI/CD 결과 실시간 알림
- 코드 리뷰: Pn 룰 (P1~P5) 기반 리뷰 시스템

#### Git Push 알림
<img src="photo/artifacts/git_push.png" width="600">

#### Merge Request 생성
<img src="photo/artifacts/git_mr.png" width="600">

#### MR Approve
<img src="photo/artifacts/git_approve.png" width="600">

#### MR Merge
<img src="photo/artifacts/git_merge.png" width="600">

#### CI 통과 알림
<img src="photo/artifacts/git_ci.png" width="600">

#### CD 배포 성공 알림
<img src="photo/artifacts/git_cd.png" width="600">

### 2. Jira
- [Jira Convention](https://www.notion.so/Jira-Convention-33665a678df980c3b770cdbe4b5cfb6a?source=copy_link) 기반 작업 관리
- 작업 단위에 따라 `Epic-Story-Task` 분류
- 매주 목표량을 설정하여 Sprint 진행
- Story Point 기반 업무 할당 및 추적

<img src="photo/artifacts/jira.png" width="800">

### 3. Notion
- 회의록 기록 및 보관
- 컨벤션, 트러블 슈팅, 개발 산출물 관리

<img src="photo/artifacts/notion.png" width="300">

### 4. 코드 컨벤션
- [Code Convention](https://www.notion.so/Code-Convention-33665a678df981b7ba71c640a4beeb42?source=copy_link) 기반 코딩 스타일 통일

### 5. 회의
- 데일리 스크럼: 매일 오전 전날 목표 달성량과 당일 업무 브리핑
- 문제 상황 1시간 이상 지속 시 Mattermost를 통한 공유 및 도움 요청

---

## 커밋 컨벤션

```
[{파트}] {티켓번호} {타입}: {commit message}
```

| 타입 | 의미 |
| :---: | :--- |
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 수정 |
| `refactor` | 기능 변화 없는 코드 구조 개선 |
| `style` | 코드 포맷/스타일 변경 |
| `chore` | 기타 설정/빌드/환경 변경 |

**예시:**
```
[FE] 364 fix: 전체 1차 QA 수정
[BE] 273 feat: 예매 확정 API 구현
[AI] 294 feat: Phase B H1+H4 검증 + H1' 신규 가설 등록
```

---

## 브랜치 전략

```
main
  └ develop
      ├ develop-fe
      │   ├ fe-feat-{이슈번호}
      │   └ fe-fix-{이슈번호}
      ├ develop-be
      │   ├ be-feat-{이슈번호}
      │   └ be-fix-{이슈번호}
      └ develop-ai
          ├ ai-feat-{이슈번호}
          └ ai-chore-{이슈번호}
```

---

## 화면 구성

### 1. 홈 · 검색
| 메인 화면 | 공연 목록 & 검색 |
| :---: | :---: |
| <img src="photo/GIF/main_screen.gif" width="400"> | <img src="photo/GIF/performance_search.gif" width="400"> |

| 공연 상세 |
| :---: |
| <img src="photo/GIF/detail.gif" width="400"> |

### 2. 예매 프로세스
| 대기열 진입 | CAPTCHA 검증 |
| :---: | :---: |
| <img src="photo/GIF/queue_entry.gif" width="400"> | <img src="photo/GIF/captcha.gif" width="400"> |

| 일자 선택 | 권종 선택 |
| :---: | :---: |
| <img src="photo/GIF/date_select.gif" width="400"> | <img src="photo/GIF/ticket_type.gif" width="400"> |

| 좌석 선택 |
| :---: |
| <img src="photo/GIF/seat_select.gif" width="400"> |

### 3. 결제
| 약관 동의 | 카카오페이 결제 |
| :---: | :---: |
| <img src="photo/GIF/payment_terms.gif" width="400"> | <img src="photo/GIF/payment_kakaopay.gif" width="400"> |

| 무통장 입금 | 입금 대기 확인 |
| :---: | :---: |
| <img src="photo/GIF/payment_bank_transfer.gif" width="400"> | <img src="photo/GIF/deposit_confirm.gif" width="400"> |

### 4. 취소표 대기
| 취소표 대기 신청 | 취소표 대기 확정 |
| :---: | :---: |
| <img src="photo/GIF/cancel_waitlist.gif" width="400"> | <img src="photo/GIF/cancel_waitlist_confirm.gif" width="400"> |

| 취소표 대기 취소 |
| :---: |
| <img src="photo/GIF/cancel_waitlist_cancel.gif" width="400"> |

### 5. 마이페이지
| 내 예매 조회 | 예매 취소 |
| :---: | :---: |
| <img src="photo/GIF/my_bookings.gif" width="400"> | <img src="photo/GIF/booking_cancel.gif" width="400"> |

| 관심 공연 위시리스트 | 내 취소표 대기열 관리 |
| :---: | :---: |
| <img src="photo/GIF/wishlist.gif" width="400"> | <img src="photo/GIF/my_waitlist.gif" width="400"> |

### 6. 주최사 (Agency)
| 공연 등록 |
| :---: |
| <img src="photo/GIF/register_performance.gif" width="400"> |

### 7. 관리자 (Admin)
| 실시간 모니터링 대시보드 | 기타 관리 정보 |
| :---: | :---: |
| <img src="photo/GIF/admin_monitoring.gif" width="400"> | <img src="photo/GIF/admin_info.gif" width="400"> |