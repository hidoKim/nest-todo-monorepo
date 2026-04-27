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

브라우저에서 `http://localhost:3001` 접속 후 SPA 라우트로 사용합니다.

- `/today`: 오늘 할 일
- `/tomorrow`: 내일 할 일
- `/trash`: 휴지통

## 빌드

```bash
npm run build
```

## 데이터베이스 설정

백엔드 환경변수는 `packages/backend/.env`에서 설정합니다.

```env
PORT=3000
CORS_ORIGIN=http://localhost:3001
APP_TIMEZONE=Asia/Seoul
DB_TYPE=sqlite
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=todo_db
SQLITE_DB=todo.sqlite
DB_SYNCHRONIZE=true
```

- `CORS_ORIGIN`: API 호출을 허용할 origin. 쉼표(,)로 여러 origin 지정 가능.
- `APP_TIMEZONE`: "오늘/내일/이번주" 산출 기준 timezone (IANA 식별자).

- `DB_TYPE=sqlite`: `SQLITE_DB` 파일 사용
- `DB_TYPE=postgres`: PostgreSQL 연결 정보 사용

개발 환경에서는 `DB_SYNCHRONIZE=true`로 자동 스키마 동기화를 사용합니다.
운영 환경에서는 `DB_SYNCHRONIZE=false` + TypeORM migration 사용을 권장합니다.

## 프론트 환경변수

`packages/frontend/.env`

```env
PORT=3001
REACT_APP_API_BASE_URL=http://localhost:3000
```

## UI/기술 스택

- Monorepo workspaces (`root`, `packages/backend`, `packages/frontend`)
- Backend: NestJS + TypeORM + SQLite/PostgreSQL
- Frontend: React + TypeScript + Tailwind CSS + Axios
