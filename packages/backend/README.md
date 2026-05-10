# Nest Todo List API

간단한 Todo 리스트를 위한 NestJS + TypeORM 기반 REST API입니다.

## 핵심 설계

- **인증**: httpOnly 쿠키 + JWT. `JwtAuthGuard`를 `APP_GUARD`로 글로벌 등록해 모든 라우트 기본 보호. `@Public()`이 붙은 엔드포인트만 면제.
- **User-scoping**: todo/tag 엔티티에 `userId` NOT NULL 컬럼. 모든 service 메서드 첫 인자로 `userId`를 받아 본인 소유 데이터만 조회/수정/삭제. 다른 사용자 리소스 접근 시도는 모두 404로 통일(존재 여부 정보 노출 차단).
- **리스트 분류**: 플래그 저장이 아닌 **날짜 기반 동적 계산**.
  - `targetDate` (YYYY-MM-DD) 컬럼 + 현재 날짜 기준 동적 매칭
  - `today`, `tomorrow`, `this-week`, `next-week` 모두 별도 배치 없이 자동 갱신
- **휴지통**: `@nestjs/schedule` cron(매일 03:00)으로 `trashedAt` 30일 경과 데이터 정리.

## 요구 환경

- Node.js 20+
- npm 10+

## 설치

```bash
npm install
```

## 환경 변수

루트 `README.md`의 환경변수 섹션 참고.

## 실행

```bash
npm run start:dev
```

## Swagger(OpenAPI)

- 문서 URL: `http://localhost:3000/api-docs`
- 모든 보호 엔드포인트에 401 응답이 일괄 명시됨
- 응답 스키마는 `TodoResponseDto`/`TagResponseDto`/`MeResponseDto`로 명시 — 엔티티 직접 노출 X
- 쿠키 인증 테스트: `withCredentials: true`로 켜져있어 Swagger UI 자체에서 쿠키 흐름 검증 가능

## 빌드 / 테스트

```bash
npm run build
npm test
```

## 마이그레이션

기본값 `DB_SYNCHRONIZE=true`로 빠른 개발용 자동 스키마 동기화 사용.

운영 환경:

1. `DB_SYNCHRONIZE=false` 설정
2. TypeORM migration 사용
3. 배포 파이프라인에서 migration 실행

## 주요 API

### Auth

- `GET /auth/google` — Google OAuth 진입 (`@Public`)
- `GET /auth/google/callback` — Google OAuth 콜백 (Set-Cookie 후 `FRONTEND_URL/auth/callback`으로 redirect)
- `GET /auth/kakao` — Kakao OAuth 진입 (`@Public`)
- `GET /auth/kakao/callback` — Kakao OAuth 콜백
- `POST /api/auth/register` — 이메일 회원가입 + 자동 로그인 (`@Public`)
- `POST /api/auth/login` — 이메일 로그인 (`@Public`)
- `POST /api/auth/logout` — 쿠키 clear (`@Public`)
- `GET /api/auth/me` — 현재 인증된 사용자 정보 (보호)

신규 사용자 생성 시 `TagsService.seedDefaultsForUser`가 호출되어 기본 태그 6개(집안일/준비물/학업/직장/기념일/기타)가 자동 생성됨.

### Todos (모두 인증 필요)

- `GET /todos` — query: `list=today|tomorrow|this-week|next-week`, `tag`, `keyword`
- `GET /todos/today` / `tomorrow` / `this-week` / `next-week` / `trash`
- `GET /todos/:id`
- `POST /todos`
- `PATCH /todos/:id`
- `POST /todos/:id/complete` / `incomplete`
- `POST /todos/:id/defer-to-tomorrow` / `defer-to-next-week`
- `DELETE /todos/:id` (soft delete)
- `POST /todos/:id/restore` / `to-trash`
- `DELETE /todos/:id/permanent`
- `POST /todos/reorder`

### Tags (모두 인증 필요)

- `GET /tags`
- `POST /tags`
- `PUT /tags/:id`
- `DELETE /tags/:id`

태그 삭제 전략: 삭제 시 Todo는 유지하고 태그만 `null`로 해제. `(userId, name)` 복합 유니크라 사용자별로 같은 이름 태그 가능.
