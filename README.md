# Todo Monorepo (NestJS + React)

## 구조

- `packages/backend`: NestJS REST API
- `packages/frontend`: React 클라이언트

## 설치

```bash
npm install
```

## 개발 실행 (서버 + 클라이언트 동시)

```bash
npm run dev
```

- Backend: `http://localhost:3000`
- Swagger: `http://localhost:3000/api-docs`
- Frontend: `http://localhost:3001`

## 라우트

### 공개

- `/onboarding`: 온보딩 (Google/Kakao 진입 + 이메일 로그인 링크)
- `/login`: 이메일 로그인
- `/auth/callback`: OAuth 콜백 (백엔드가 쿠키 set 후 리다이렉트하는 곳)

### 보호 (`ProtectedRoute`로 감싸짐 — `/api/auth/me` 검증 통과 시에만 접근)

- `/today`, `/tomorrow`, `/this-week`, `/next-week`, `/trash`

## 인증 모델

- **httpOnly 쿠키 + JWT**. JS는 토큰을 직접 다루지 않는다 (XSS 토큰 탈취 불가).
- 프론트의 axios는 `withCredentials: true`로 모든 요청에 쿠키 자동 동봉.
- 모든 todos/tags 데이터는 user-scope. (todo/tag 엔티티에 `userId` NOT NULL 컬럼)
- `JwtAuthGuard`는 `APP_GUARD`로 글로벌 등록 — 라우트 기본 보호. 공개는 `@Public()`로 명시.

## 빌드

```bash
npm run build
```

## 백엔드 환경변수 (`packages/backend/.env`)

```env
# 서버
PORT=3000
CORS_ORIGIN=http://localhost:3001
APP_TIMEZONE=Asia/Seoul
FRONTEND_URL=http://localhost:3001

# DB
DB_TYPE=sqlite
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=todo_db
SQLITE_DB=todo.sqlite
DB_SYNCHRONIZE=true

# JWT
JWT_SECRET=<openssl rand -base64 32 으로 생성한 강한 랜덤 값>
JWT_EXPIRES_IN=24h

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Kakao OAuth
KAKAO_CLIENT_ID=
KAKAO_CALLBACK_URL=http://localhost:3000/auth/kakao/callback
```

- `CORS_ORIGIN`: API 호출을 허용할 origin. 쉼표(,)로 여러 origin 지정 가능. **httpOnly 쿠키 흐름이 동작하려면 와일드카드(`*`) 불가, 정확한 도메인 필요.**
- `FRONTEND_URL`: OAuth 콜백 후 redirect 대상.
- `APP_TIMEZONE`: "오늘/내일/이번주" 산출 기준 timezone (IANA 식별자).
- `JWT_SECRET`: 비어있으면 부팅 실패. 약한 기본값으로 묵묵히 동작하는 것을 막기 위함.

개발 환경에서는 `DB_SYNCHRONIZE=true`로 자동 스키마 동기화를 사용합니다.
운영 환경에서는 `DB_SYNCHRONIZE=false` + TypeORM migration 사용을 권장합니다.

## 프론트 환경변수 (`packages/frontend/.env`)

```env
PORT=3001
REACT_APP_API_BASE_URL=http://localhost:3000
```

## UI/기술 스택

- Monorepo workspaces (`root`, `packages/backend`, `packages/frontend`)
- Backend: NestJS + TypeORM + SQLite/PostgreSQL + Passport(JWT/Google/Kakao) + bcryptjs + cookie-parser
- Frontend: React + TypeScript + Tailwind CSS + Axios (withCredentials)
