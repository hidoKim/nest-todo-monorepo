# Nest Todo List API

간단한 Todo 리스트를 위한 NestJS + TypeORM 기반 REST API입니다.

## 핵심 설계

- 리스트 분류는 **플래그 저장이 아닌 날짜 기반 동적 계산** 방식을 사용합니다.
- 각 Todo는 내부 컬럼 `targetDate`(YYYY-MM-DD)를 가지며, API 요청 시 현재 날짜 기준으로 아래 리스트를 계산합니다.
  - `today`: `targetDate == 오늘`
  - `tomorrow`: `targetDate == 내일`
  - `this-week`: 이번주 월~일 범위
  - `next-week`: 다음주 월~일 범위
- 이 방식은 날짜가 바뀌어도 별도 배치 없이 자동으로 목록이 갱신됩니다.
- 휴지통 하드 삭제는 `@nestjs/schedule` 크론(매일 03:00)으로 `trashedAt` 30일 경과 데이터를 정리합니다.

## 요구 환경

- Node.js 20+
- npm 10+

## 설치

```bash
npm install
```

## 환경 변수

```env
PORT=3000
DB_TYPE=sqlite
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=todo_db
SQLITE_DB=todo.sqlite
DB_SYNCHRONIZE=true
```

- `DB_TYPE=sqlite`이면 `SQLITE_DB` 사용
- `DB_TYPE=postgres`이면 PostgreSQL 연결 정보 사용

## 실행

```bash
npm run start:dev
```

## Swagger(OpenAPI)

- 문서 URL: `http://localhost:3000/api-docs`
- 앱 실행 후 브라우저에서 확인 가능

## 빌드 / 테스트

```bash
npm run build
npm test
```

## 마이그레이션

현재 기본값은 `DB_SYNCHRONIZE=true`로 빠른 개발을 위해 자동 스키마 동기화를 사용합니다.

운영 환경에서는 아래 전략을 권장합니다.

1. `DB_SYNCHRONIZE=false` 설정
2. TypeORM migration 사용
3. 배포 파이프라인에서 migration 실행

## 주요 API

### Todos

- `GET /todos`
  - query: `list=today|tomorrow|this-week|next-week`, `tag`, `keyword`
- `GET /todos/today`
- `GET /todos/tomorrow`
- `GET /todos/this-week`
- `GET /todos/next-week`
- `GET /todos/:id`
- `POST /todos`
- `PATCH /todos/:id`
- `POST /todos/:id/complete`
- `POST /todos/:id/incomplete`
- `POST /todos/:id/defer-to-tomorrow`
- `POST /todos/:id/defer-to-next-week`
- `DELETE /todos/:id` (soft delete)
- `POST /todos/:id/restore`
- `POST /todos/:id/to-trash`
- `GET /todos/trash`
- `DELETE /todos/:id/permanent`
- `POST /todos/reorder`

### Tags

- `GET /tags`
- `POST /tags`
- `PUT /tags/:id`
- `DELETE /tags/:id`

태그 삭제 전략: 삭제 시 Todo는 유지하고 태그만 `null`로 해제합니다.
# nestJS-todo-list
