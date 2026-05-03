# CLAUDE.md — ai-macro-detection (AI 파트 전용)

본 문서는 Claude Code 가 본 리포에서 작업할 때 따라야 할 컨벤션과 작업 규칙을 정의합니다. 매 세션 시작 시 자동 로딩됩니다.

본 리포는 SSAFY 14기 A203 팀 프로젝트 "tickle" 의 AI 파트 작업 리포지토리입니다. AI 파트 전용으로 사용되므로 본 문서는 AI 양식 중심으로 작성됩니다. 다른 파트 (BE/FE/INFRA/DOCS/ETC) 양식은 별도 리포 / 별도 컨벤션 문서를 참조하십시오.

---

## Commit 양식

### 형식

```
[AI] {티켓번호} {타입}: {commit message}
```

노션 정본의 `[{BE/FE/INFRA/DOCS/ETC}] {티켓번호} {타입}: {commit message}` 양식에서 파트 표시 자리에 자기 파트명을 넣는 규칙. AI 파트이므로 `[AI]` 사용.

### 예시

```
[AI] 294 feat: Phase B H1+H4 검증 + H1' 신규 가설 등록
[AI] 294 docs: Phase B H3/H6 모순 정리 (curvature vs straightness)
[AI] 294 chore: 산출물 PNG 를 이슈 번호 폴더로 분리
[AI] 295 feat: XGBoost 베이스라인 학습 결과 기록
```

### 타입 (노션 정본 Commit Convention 기준)

| 타입 | 의미 |
| --- | --- |
| `feat` | 새로운 기능 추가 (사용자 관점에서 새 기능이 생길 때) |
| `fix` | 버그 수정 (의도와 다르게 동작하는 문제를 정상 동작으로 되돌릴 때) |
| `docs` | 문서 수정 (코드가 아닌 문서 / 설명 / 가이드 변경) |
| `refactor` | 기능 변화 없는 코드 구조 개선 |
| `style` | 코드 포맷 / 스타일 또는 UI 스타일 변경 (동작에 영향 없음) |
| `chore` | 기타 설정 / 빌드 / 환경 변경 (더미데이터 포함) |

위 6개 타입만 사용합니다. 그 외 타입 사용 금지.

### 작성 규칙

- 타입은 영문 소문자
- 본문은 영한 혼용 가능
- 커밋 본문은 50자 이내
- 하나의 커밋에는 한 가지 작업만 포함 (기능 단위)
- 왜 이 변경이 필요한지 / 무엇을 변경했는지 / 필요 시 이슈 맥락

---

## Branch 명명 양식

### 형식

```
ai-{타입}-{이슈번호}
```

### 예시

```
ai-feat-294
ai-feat-295
ai-chore-23
ai-refactor-42
```

타입은 commit 양식의 타입과 동일한 6개 (feat / fix / docs / refactor / style / chore) 만 사용.

### Git Flow

```
main
  └ develop
      └ develop-ai
          ├ ai-feat-{이슈번호}
          ├ ai-chore-{이슈번호}
          └ ai-{타입}-{이슈번호}
```

- `main`: 배포 브랜치
- `develop`: 개발 브랜치
- `develop-ai`: AI 파트 개발 브랜치
- `ai-{타입}-{이슈번호}`: AI 세부 작업 브랜치

---

## Rebase 워크플로우

`develop-ai` 기준 rebase 후 push.

### 절차

1. 자신의 feature 브랜치 작업 완료
2. `git checkout develop-ai` — 업데이트된 develop-ai 로 이동
3. `git pull` — develop-ai 최신화
4. `git checkout ai-{타입}-{이슈번호}` — 자신의 feature 브랜치로 복귀
5. `git rebase develop-ai` — develop-ai 위로 rebase
6. `git push --force-with-lease` — feature 브랜치 원격 갱신
7. GitLab MR 작성

`develop-ai` 또는 `develop` 브랜치에서 `push --force` 금지.

---

## Merge Request

### 원칙

- 모든 변경은 MR 을 통해 병합
- 코드 리뷰는 기획 확정 이전에는 1인 Approve + merge 로 진행, 기획 확정 후 개발 단계에서 재논의
- 병합 후 브랜치는 즉시 삭제

### MR 제목

```
[{타입}] 내용
```

예시: `[feat] 로그인 구현`

### MR 본문 양식

```
# 📄 Work Description
- 설명

# 📷 Screenshot
- 동영상, 사진, 로그 등
- ex) 학습 결과 캡처, 노트북 출력, metric 표

# 💬 To Reviewers
리뷰어들에게 하고 싶은 말

# 🔗 Reference
참고 자료, 코드 링크
```

---

## Code Review — Pn 룰

| 등급 | 의미 | 작성자 의무 |
| --- | --- | --- |
| **P1** | 꼭 반영해주세요 (Request changes) | 반영 또는 합리적 의견으로 설득 |
| **P2** | 적극적으로 고려해주세요 (Request changes) | 수용 또는 토론 |
| **P3** | 웬만하면 반영해 주세요 (Comment) | 수용 또는 사유 / 다음 반영 계획 명시 |
| **P4** | 반영해도 좋고 넘어가도 좋습니다 (Approve) | 무시 가능, 검토 권장 |
| **P5** | 그냥 사소한 의견입니다 (Approve) | 무시 가능 |

---

## Issue 양식

```
# ⚙️ ISSUE
- 어떤 이슈인지 설명

# 📄 To-Do
- [ ] 세부 todo
```

---

## 작업 흐름 규칙

### Plan-first

- 자명하지 않은 작업은 plan 먼저 제시 후 사용자 승인받고 진행
- `tasks/todo.md` 체크리스트 기반 작업
- 동작 검증 없이 완료 표시 금지
- 패턴 / 트러블슈팅은 `tasks/lessons.md` 에 누적

### Working tree 규율

- 브랜치 전환 전 working tree clean 필수
- 임시 스크립트는 작업 후 즉시 삭제
- 의도하지 않은 파일이 commit 에 섞이지 않도록 명시 staging (`git add <path>`) 사용

### 작업 분리 / 단위

- 새 작업 시작 시 적절한 브랜치로 이동
- 한 commit 한 작업
- 다른 작업이 섞일 가능성 있으면 stash 또는 별도 브랜치로 분리

---

## 협업 컨텍스트

### 디렉토리 구조 (전체 tickle 프로젝트)

```
tickle/
├── view/
│   ├── fe/
│   └── admin/
├── services/
│   ├── be/      (Spring Boot BE)
│   ├── auth/    (인증 Spring Boot)
│   └── ai/      (FastAPI · 본 리포의 작업 영역)
├── infra/
│   └── docker-compose/
├── .env.example
├── Jenkinsfile
└── README.md
```

본 리포 (ai-macro-detection) 의 작업은 `services/ai/` 하위에 집중됩니다.

### 다른 파트 양식 (참고)

다른 파트 (BE / FE / INFRA / DOCS / ETC) 양식이 필요한 경우 노션 팀 컨벤션 문서를 참조하십시오. 본 리포에서는 [AI] 양식만 사용합니다.

---

## 메모리 / 문서 분리

- **CLAUDE.md** (본 문서) = 컨벤션 / 규칙 (불변, "어떻게 해야 하는가") — git 추적, 팀 공유
- **tasks/lessons.md** = 학습 누적 (가변, "이전에 무슨 일이 있었나") — git 추적, 팀 공유
- **tasks/todo.md** = 현재 진행 작업 todo — git 추적
