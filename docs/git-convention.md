# Git Convention

## Branch 전략

```
main
  └── develop
        ├── develop-ai
        │     ├── ai-feat-{이슈번호}
        │     └── ai-chore-{이슈번호}
        ├── develop-fe
        │     ├── fe-feat-{이슈번호}
        │     └── fe-refactor-{이슈번호}
        └── develop-be
              ├── be-feat-{이슈번호}
              └── be-docs-{이슈번호}
```

## Commit Convention

형식: `[{BE/FE/INFRA/DOCS/ETC}] {티켓번호} {타입}: {commit message}`

예시:
```
[DOCS] 26 docs: git컨벤션 작성
[BE] 30 feat: 로그인 기능 CRUD구현
[FE] 34 feat: 로그인 기능 UI구현
```

| 타입 | 의미 |
|------|------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 수정 |
| `refactor` | 기능 변화 없는 코드 구조 개선 |
| `style` | 코드 포맷/스타일 또는 UI 스타일(CSS) 변경 |
| `chore` | 기타 설정/빌드/환경 변경 (더미데이터 포함) |

규칙:
- 타입은 영문 소문자
- 커밋 본문 50자 이내
- 하나의 커밋에 한 가지 작업만 포함

## Git Rebase 사용법

1. feature 브랜치 작업 완료
2. `git checkout develop-{파트}` → `git pull`
3. `git checkout feature/xxx`
4. `git rebase develop-{파트}`
5. `git push --force-with-lease` (feat 브랜치에서만, develop 브랜치에서 force push 금지)
6. GitLab MR 작성

## Merge Request

- 모든 변경 사항은 MR을 통해 병합
- 코드리뷰: 해당 분야 잘 아는 사람 1인 Approve + merge
- 병합 후 브랜치 즉시 삭제

MR 제목: `[feat] 로그인 구현`

MR 본문 템플릿:
```
# 📄 Work Description
- 설명

# 📷 Screenshot
- 동영상, 사진, 로그 등

# 💬 To Reviewers
리뷰어들에게 하고 싶은 말

# 🔗 Reference
참고 사이트/코드 링크
```
