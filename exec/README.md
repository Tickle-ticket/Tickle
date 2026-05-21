# Tickle 포팅 매뉴얼

본 폴더는 GitLab 소스 클론 이후 프로젝트를 빌드/배포하기 위한 포팅 문서와 외부 서비스 연동 정보를 정리한 폴더입니다.

## 문서 목록

| 파일 | 내용 |
|------|------|
| [시연_시나리오.md](./시연_시나리오.md) | 서비스 소개, 부하테스트, 예매 플로우, 봇 탐지 순서에 따른 제출용 시연 시나리오 |
| [be/[BE]포팅매뉴얼.md](<./be/[BE]포팅매뉴얼.md>) | BE 개발/빌드/배포 환경, 환경 변수, DB 및 주요 설정 파일 목록 |
| [be/[BE]외부_서비스_연결_문서.md](<./be/[BE]외부_서비스_연결_문서.md>) | BE에서 사용하는 카카오 OAuth, 카카오페이, CoolSMS, AWS S3, Cloudflare Turnstile, AI 서버, GitLab/Jenkins 등 외부 서비스 정보 |
| [be/.env.example](./be/.env.example) | BE/Auth 빌드/실행/배포 환경 변수 예시와 주석 설명 |
| [fe/[FE]포팅매뉴얼.md](<./fe/[FE]포팅매뉴얼.md>) | FE 개발/빌드/배포 환경, 환경 변수, 배포 절차, 주요 설정 파일 목록 |
| [fe/[FE]외부_서비스_연결_문서.md](<./fe/[FE]외부_서비스_연결_문서.md>) | FE에서 연동하는 Core/Auth/AI API, 카카오 OAuth, 카카오페이, Turnstile, 이미지 CDN, Jenkins 등 외부 서비스 정보 |
| [ai/[AI]포팅매뉴얼.md](<./ai/[AI]포팅매뉴얼.md>) | AI Ingest/Worker/Internal API 개발/빌드/배포 환경, 환경 변수, DB 및 주요 설정 파일 목록 |
| [ai/[AI]외부_서비스_연결_문서.md](<./ai/[AI]외부_서비스_연결_문서.md>) | AI에서 사용하는 Kafka, PostgreSQL, BE callback, PyPI/Maven Central 등 외부/연동 서비스 정보 |

## DB Dump 목록

| 파일 | 내용 |
|------|------|
| [db_dump/be/be_core_dump_20260520.sql](./db_dump/be/be_core_dump_20260520.sql) | Core BE MySQL DB dump |
| [db_dump/be/be_auth_dump_20260520.sql](./db_dump/be/be_auth_dump_20260520.sql) | Auth MySQL DB dump |
| [db_dump/ai/ai_dump_20260520.sql](./db_dump/ai/ai_dump_20260520.sql) | AI PostgreSQL DB dump |

## 주의사항

- 실제 운영 비밀번호, API Key, JWT Secret 등은 Git에 커밋하지 않습니다.
- 배포 서버에서는 루트 `.env` 또는 각 서비스별 `.env`에 값을 주입한 뒤 Docker Compose를 실행합니다.
- `exec/be/.env.example`, 각 서비스의 `.env.example`은 변수 목록 확인용 예시 파일입니다.
- DB dump 파일은 초기 데이터 복원 또는 시연 데이터 확인 용도로 사용합니다. 운영 비밀번호나 외부 API Key가 포함되지 않았는지 제출 전 확인합니다.
