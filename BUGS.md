# 🐛 Todo Monorepo — 버그 및 잠재 문제 리포트

작성일: 2026-04-27
대상: `packages/backend` (NestJS + TypeORM), `packages/frontend` (React + TS), 모노레포 루트

---

## 📊 요약

| 심각도 | 개수 | 핵심 항목 |
|--------|------|-----------|
| 🔴 Critical | 3 (3 ✅) | ~~SQLite `datetime` 비호환~~ ✅, ~~TypeORM 관계 update 오용~~ ✅, ~~타임존 처리~~ ✅ |
| 🟠 High | 4 (4 ✅) | ~~CORS 와일드카드~~ ✅, ~~FE 환경변수~~ ✅, ~~태그 삭제 에러 무시~~ ✅, ~~`prompt()` UX~~ ✅ |
| 🟡 Medium | 3 | FE/BE 날짜 불일치, 낙관적 업데이트 부재, 드래그 reorder race |
| 🟢 Low | 4 | `.git` 구조 이상, 빌드 직렬화, sqlite/`.env` 추적, jest 설정 중복 |

권장 처리 순서: ① SQLite datetime → ② CORS → ③ 환경변수 → ④ TypeORM 관계 update → ⑤ 타임존 통일.

---

## 🔴 Critical

### 1. SQLite에서 `datetime` 타입 컬럼이 정상 동작하지 않음 ✅ 해결됨 (2026-04-27)
- **파일**: `packages/backend/src/todos/todo.entity.ts`
- **문제**: `completedAt`, `deletedAt`, `trashedAt` 컬럼이 `type: 'datetime'`로 선언됨. 현재 `.env`는 `DB_TYPE=sqlite`이고, SQLite 드라이버에서 `datetime`은 표준 타입이 아니어서 TEXT로 저장되어 Date 객체와 비교 시 결과가 일관되지 않음.
- **영향**: 주간 범위 비교 (`< thisWeek.end` 등) 쿼리 결과가 어긋남. FE에서 `completedAt` 타입이 `string | Date` 사이를 오감.
- **해결 방식**: TypeORM **column transformer**로 ISO 8601 문자열 ↔ Date 변환을 강제.
  - 컬럼 underlying 타입을 `varchar`로 통일 → SQLite/Postgres 모두 동일 동작 보장.
  - 읽기 시 항상 `Date` 객체로 변환되어 JS-side 비교(`todo.trashedAt < threshold`)가 정상.
  - ISO 8601의 사전순 = 시간순이므로 SQL `ORDER BY todo.trashedAt` 같은 쿼리도 정상.
  - 기존 sqlite 데이터(`YYYY-MM-DD HH:MM:SS` 형식)는 `new Date()`가 파싱 가능 → 데이터 손실 없음.
  - `synchronize: true` 환경에서 `datetime` → `varchar` 스키마 변경은 SQLite TEXT 저장이 그대로라 안전.
- **수정한 파일**: `packages/backend/src/todos/todo.entity.ts`
- **변경된 코드 핵심**:
  ```ts
  const isoDateTransformer = {
    to: (value: Date | null | undefined): string | null => {
      if (value === null || value === undefined) return null;
      return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
    },
    from: (value: string | null): Date | null => (value ? new Date(value) : null),
  };

  @Column({ type: 'varchar', nullable: true, transformer: isoDateTransformer })
  completedAt!: Date | null;
  // (deletedAt, trashedAt 동일)
  ```
- **남은 후속 작업 (선택)**:
  - 운영 시 PostgreSQL로 전환할 경우 native `timestamp with time zone`으로 마이그레이션 검토 (인덱스/범위쿼리 효율).

### 2. TypeORM `update()` 호출에서 관계 필드(`tag`)에 직접 쓰기 ✅ 해결됨 (2026-04-27)
- **파일**: `packages/backend/src/tags/tag.service.ts`
- **문제**: `await this.todoRepository.update({ tagId: id }, { tagId: null, tag: null })` — `tag`는 ManyToOne 관계의 가상 필드라 `update()`로 직접 갱신 불가. 드라이버에 따라 무시되거나 예외 발생.
- **영향**: 태그 삭제 후 일부 todos의 `tag` 캐시가 정합되지 않을 수 있음. PG/SQLite 사이 동작 비대칭.
- **해결 방식**: `tag: null` 제거하고 FK 컬럼인 `tagId: null`만 업데이트. 엔티티 `@ManyToOne` 관계가 `onDelete: 'SET NULL'`로 선언돼 있어 FK만 끊으면 관계가 자동 해제됨.
- **수정한 파일**: `packages/backend/src/tags/tag.service.ts`
- **변경된 코드**:
  ```ts
  // 가상 relation 필드(tag)는 update()로 못 건드리므로 FK(tagId)만 갱신.
  await this.todoRepository.update({ tagId: id }, { tagId: null });
  ```

### 3. 타임존 미통일로 자정 전후 todos가 잘못된 리스트에 노출 ✅ 해결됨 (2026-04-27)
- **파일**: `packages/backend/src/utils/date.util.ts`, `packages/backend/src/todos/todo.service.ts`, `packages/backend/.env`, `packages/backend/.env.example`
- **문제**: `new Date(\`${todo.targetDate}T00:00:00\`)` — Z 미지정으로 LOCAL TZ 파싱. 또한 `date.util.ts`의 모든 `setHours`/`getDay`/`getFullYear` 등이 서버 로컬 TZ에 의존. 서버가 UTC면 KST 사용자 자정 ±9시간 어긋남.
- **영향**: 자정 근처에서 "오늘" → "내일"로 점프하거나 사라지는 todos. "미루기"가 다른 날로 이동.
- **해결 방식**: `date.util.ts`를 **timezone-aware**로 재작성. 서버 process TZ 의존 제거.
  - `APP_TIMEZONE` env (default `Asia/Seoul`)로 timezone 단일 진실 소스 확립.
  - 현재 시각의 calendar 날짜를 `Intl.DateTimeFormat({ timeZone: APP_TZ })`로 해당 TZ에서 추출.
  - 모든 내부 Date 앵커는 **UTC 자정**으로 통일 → `setUTCDate`/`getUTC*` 기반 산술이 timezone-agnostic.
  - 주(week) 계산도 `Intl`로 APP_TZ의 요일을 구해 Monday 오프셋 계산.
  - `parseDateOnlyString(value)` 헬퍼 추가 — `YYYY-MM-DD`를 UTC 자정으로 안전 파싱.
  - `todo.service.ts:346`의 fragile한 `new Date(\`${todo.targetDate}T00:00:00\`)`을 `parseDateOnlyString(todo.targetDate)`로 교체.
  - `APP_TZ`는 함수 호출 시점에 읽도록 lazy 처리(NestJS `ConfigModule`/dotenv가 모듈 import 시점보다 늦게 `.env`를 로드하기 때문).
  - 기존 export 시그니처(`getTodayDate`/`getThisWeekRange`/`addDays`/`isWithinRange` 등) 그대로 유지 → 호출부 변경 최소화.
  - 기존 테스트(`test/date.util.spec.ts`)는 형식·순서만 검증하므로 그대로 통과.
- **수정한 파일**:
  - `packages/backend/src/utils/date.util.ts` (전체 재작성)
  - `packages/backend/src/todos/todo.service.ts` (line 346 영역, `parseDateOnlyString` import 추가)
  - `packages/backend/.env` (`APP_TIMEZONE=Asia/Seoul` 추가)
  - `packages/backend/.env.example` (가이드 주석 + 기본값 추가)
- **변경된 코드 핵심**:
  ```ts
  // date.util.ts — TZ 단일 소스
  const getAppTz = (): string => process.env.APP_TIMEZONE ?? 'Asia/Seoul';

  const getCalendarPartsInTz = (instant: Date = new Date()) => {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: getAppTz(),
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const parts = fmt.formatToParts(instant);
    const get = (k: 'year' | 'month' | 'day') =>
      Number(parts.find((p) => p.type === k)?.value);
    return { year: get('year'), month: get('month'), day: get('day') };
  };

  export const getTodayDate = (): Date =>
    new Date(Date.UTC(p.year, p.month - 1, p.day)); // UTC 앵커

  export const parseDateOnlyString = (value: string): Date =>
    new Date(`${value}T00:00:00Z`); // 명시적 UTC 파싱
  ```
  ```ts
  // todo.service.ts — fragile parse 제거
  const targetDate = parseDateOnlyString(todo.targetDate);
  ```
- **남은 후속 작업 (선택)**:
  - **FE 타임존 통일**: `TomorrowPage.tsx` 등이 `new Date()`로 로컬 표시. 다중 TZ 사용자 지원 시 FE도 `Intl`로 KST 표시 또는 BE에서 표시용 문자열을 함께 내려보내기. (별도 리포트 #8)
  - 운영 시 BE process에 `TZ` env까지 추가로 맞추면 로그 timestamp 등 부수 효과까지 KST 통일 가능. 코드는 이미 process TZ에 의존하지 않으므로 선택사항.

---

## 🟠 High

### 4. CORS가 와일드카드(allow-all)로 열림 ✅ 해결됨 (2026-04-27)
- **파일**: `packages/backend/src/main.ts`, `packages/backend/.env`, `packages/backend/.env.example`
- **문제**: `app.enableCors()`만 호출 → 옵션 없으면 모든 origin 허용. 프로덕션 보안 위험.
- **영향**: 임의 사이트에서 API 직접 호출 가능, CSRF 표면 확대.
- **해결 방식**:
  - `CORS_ORIGIN` 환경변수로 허용 origin 명시. 쉼표(`,`)로 여러 origin 지정 가능 → 운영/스테이징 동시 지원.
  - 미설정 시 `http://localhost:3001`(FE dev 포트)로 기본값 → 로컬 개발은 그대로 동작.
  - `credentials: true`로 쿠키/인증 헤더 허용 (향후 인증 도입 대비).
  - `ConfigModule.forRoot({ isGlobal: true })`가 `app.module.ts`에 이미 있어, `NestFactory.create(AppModule)` 시점에 `.env`가 `process.env`로 로드 완료된 후 CORS 설정이 읽힘.
- **수정한 파일**:
  - `packages/backend/src/main.ts` (CORS 옵션 분기)
  - `packages/backend/.env` (`CORS_ORIGIN=http://localhost:3001` 추가)
  - `packages/backend/.env.example` (가이드 주석 + 기본값 추가)
- **변경된 코드**:
  ```ts
  const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3001")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  ```
- **남은 후속 작업 (선택)**:
  - 운영 배포 시 CI 환경변수에 운영 도메인을 명시적으로 export. 예: `CORS_ORIGIN=https://app.example.com`.
  - 정규식/와일드카드 서브도메인이 필요해지면 `origin: (origin, cb) => ...` 콜백 형태로 확장.

### 5. FE 환경변수 미정의 시 하드코드된 `localhost:3000` 사용 ✅ 해결됨 (2026-04-27)
- **파일**: `packages/frontend/src/api/client.ts:1-16`
- **문제**: `baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:3000"`. CRA는 빌드타임 치환이라 프로덕션 빌드에서 `.env.production`이 없으면 그대로 박힘.
- **영향**: 배포 후 모든 API 호출이 사용자의 localhost를 가리켜 100% 실패.
- **해결 방식 (방법 A — fail loud)**:
  - `client.ts`의 `||` fallback 제거. `REACT_APP_API_BASE_URL`이 빌드 타임에 없으면 모듈 로드 시점에 throw. → 운영에 localhost가 박혀 배포되는 사고 차단.
  - `packages/frontend/.env.example` 신규 추가. 팀원이 클론 후 `cp .env.example .env`로 즉시 dev 환경 구성 가능.
  - `packages/frontend/.env`(dev)는 변경 없음 — 기존대로 `http://localhost:3000`.
  - `.env.production`은 운영 도메인이 정해질 때 생성하거나 CI에서 `REACT_APP_API_BASE_URL=...` export 후 `npm run build`. 누락 시 빌드 산출물이 첫 로드에서 throw하므로 안전.
- **수정한 파일**:
  - `packages/frontend/src/api/client.ts` (수정)
  - `packages/frontend/.env.example` (신규)
- **변경된 코드**:
  ```ts
  const baseURL = process.env.REACT_APP_API_BASE_URL;
  if (!baseURL) {
    throw new Error(
      "REACT_APP_API_BASE_URL is not defined. Set it in packages/frontend/.env (dev) or .env.production / CI env (build).",
    );
  }
  export const apiClient = axios.create({
    baseURL,
    headers: { "Content-Type": "application/json" },
  });
  ```
- **남은 후속 작업**:
  - 운영 도메인 확정 시 `.env.production` 생성 또는 CI 변수 등록.
  - (선택) 환경별 산출물을 한 번에 굽기 싫다면 추후 방법 C(런타임 `window.__CONFIG__` 주입)로 확장.

### 6. 태그 삭제 실패가 조용히 무시됨 ✅ 해결됨 (2026-04-27)
- **파일**: `packages/frontend/src/hooks/useTags.ts`, `packages/frontend/src/pages/TagsPage.tsx`
- **문제**: `removeTag`에 try/catch 없음. `deleteTag` 실패해도 `fetchTags()`로 흘러가 사용자에게 에러를 노출하지 않음. 점검 중 `addTag`/`editTag`도 같은 패턴(silent fail) 임을 확인했고, `useTags`가 노출하는 `error` 상태가 `TagsPage`에서 렌더링되지 않아 set 해도 화면에 보이지 않는 추가 결함도 발견.
- **영향**: 네트워크/권한 오류가 silent fail. 사용자가 "삭제했는데 왜 그대로지?" 상태에 빠짐.
- **해결 방식**:
  - `useTags`에 `useTodos`와 동일한 `runMutation` + `getErrorMessage` 헬퍼 도입.
  - `addTag` / `editTag` / `removeTag` 셋 모두 `runMutation`로 감싸 일관 처리. (같은 파일·같은 원인이라 셋을 한 번에 수정)
  - `TagsPage.tsx`에 `tags.error` 표시 영역 추가. 다른 페이지(`Today/Tomorrow/ThisWeek/NextWeek`)는 이미 `error={todos.error || tags.error}`로 흘려보내고 있어 별도 수정 불필요.
  - 에러 표시 스타일은 기존 `TrashPage`와 동일한 Tailwind 클래스(`text-sm text-red-700`) 사용.
- **수정한 파일**:
  - `packages/frontend/src/hooks/useTags.ts` (전체 재작성: 헬퍼·`runMutation` 추가, 3개 mutation 일관 적용)
  - `packages/frontend/src/pages/TagsPage.tsx` (TagList 위에 에러 표시 추가)
- **변경된 코드 핵심**:
  ```ts
  // useTags.ts
  const runMutation = useCallback(
    async (action: () => Promise<void>, fallbackMessage: string) => {
      setError(null);
      try {
        await action();
        await fetchTags();
      } catch (err) {
        setError(getErrorMessage(err, fallbackMessage));
      }
    },
    [fetchTags],
  );

  const removeTag = useCallback(
    async (id: number) => {
      await runMutation(async () => {
        await deleteTag(id);
      }, "태그를 삭제하지 못했습니다.");
    },
    [runMutation],
  );
  ```
  ```tsx
  // TagsPage.tsx
  {tags.error ? <p className="text-sm text-red-700">{tags.error}</p> : null}
  ```
- **남은 후속 작업 (선택)**:
  - `getErrorMessage` 헬퍼가 `useTodos`와 `useTags` 두 곳에 중복 — 추후 한 번 더 사용하는 hook이 생기면 `src/utils/getErrorMessage.ts`로 추출 검토.

### 7. `window.prompt()`로 인라인 편집 — UX/접근성/취소 처리 미흡 ✅ 해결됨 (2026-04-27)
- **파일**: `packages/frontend/src/components/TodoItem.tsx`, `packages/frontend/src/components/TagList.tsx`
- **문제**: `window.prompt`는 모바일/스크린리더 친화도 낮고, 취소 시 `null` vs 빈 문자열 분기를 명시하지 않음. 또한 제목 외 다른 필드(content/dueDate)는 편집 불가.
- **영향**: 모바일 UX 저하, 스크린리더 사용자 차단, BE에서 지원하는 필드를 UI에서 활용 못함.
- **해결 방식 (인라인 편집 전환)**:
  - "수정" 버튼 클릭 시 같은 자리의 텍스트가 `<input>`으로 토글되고, 옆에 "저장" / "취소" 버튼이 노출되도록 변경.
  - 키보드 UX: **Enter = 저장**, **Escape = 취소**, `autoFocus`로 즉시 입력 가능.
  - 빈 문자열 또는 변경 없음 시 자동 취소 (no-op).
  - 접근성: `aria-label`로 입력 필드 의미 명시, label/checkbox 클릭과 input 클릭이 충돌하지 않도록 편집 중에는 태그 pill을 숨김.
  - `TodoItem`은 편집 중에는 `TagInput`/삭제 버튼 등 다른 액션을 숨겨 "편집 모드" 의도를 명확히.
  - `TagList`는 단일 `editingId` + `draftName` 상태로 행 단위 편집(여러 행 동시 편집 방지).
  - **content / dueDate 등 추가 필드 편집 UI는 이번 범위에서 제외** (별도 리포트 12번에서 다룸).
- **수정한 파일**:
  - `packages/frontend/src/components/TodoItem.tsx` (편집 상태 + 키보드 핸들러 + 조건부 렌더링)
  - `packages/frontend/src/components/TagList.tsx` (행 단위 편집 상태 도입, 전체 재작성)
- **변경된 코드 핵심 (TodoItem)**:
  ```tsx
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(todo.title);

  const saveEdit = async () => {
    const next = draftTitle.trim();
    if (next === "" || next === todo.title) { cancelEdit(); return; }
    await onEdit(todo.id, { title: next });
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); void saveEdit(); }
    else if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
  };
  ```
- **남은 후속 작업 (선택)**:
  - 별도 리포트 #12(부분 업데이트 미지원)와 함께 `content`/`dueDate` 인라인 편집 UI 추가 검토.
  - 입력값 변경 없이 blur 시 어떻게 처리할지(자동 취소 vs 자동 저장) 정책 결정 — 현재는 명시 액션(Enter/저장/Escape/취소)만 처리.

---

## 🟡 Medium

### 8. FE 표시 날짜와 BE 계산 기준 불일치
- **파일**: `packages/frontend/src/pages/TomorrowPage.tsx:8-10`
- **문제**: FE는 `new Date()` 로컬 기준으로 "내일"을 산출하지만, BE는 서버 로컬 기준 `targetDate`를 비교. 시차 환경에서 표시·결과가 어긋남.
- **수정**: 항목 3과 함께 타임존 정책을 한 곳에서 결정.

### 9. 낙관적 업데이트(optimistic UI) 부재 — 모든 mutation 후 전체 리스트 refetch
- **파일**: `packages/frontend/src/hooks/useTodos.ts:92-94` (그리고 다른 mutations)
- **문제**: 작은 변경마다 fetch 전체 호출 → 네트워크 RTT만큼 입력 반영 지연.
- **수정**: API 응답을 로컬 상태에 머지, 실패 시 롤백.

### 10. 드래그 reorder가 `void`로 비동기 무시 — race & 롤백 없음
- **파일**: `packages/frontend/src/components/TodoList.tsx:90-107`
- **문제**: `void onReorder(reorderItems)`로 결과를 기다리지 않음. 빠른 연속 드래그에서 순서 꼬임 가능, API 실패 시 UI 상태와 DB 상태 불일치.
- **수정**: `await onReorder(...)`, 실패 시 이전 상태로 setState 롤백.

---

## 🟢 Low

### 11. `packages/backend/.git` 디렉토리 존재 — 모노레포 git 구조 이상
- **위치**: `packages/backend/.git/` (존재), 루트 `.git` 없음.
- **문제**: 루트는 git 저장소가 아닌데 backend만 단독 저장소. CI/배포·로그·블레임이 패키지별로 갈려 모노레포 의미 상실.
- **수정**: 루트에서 `git init` 후 backend의 `.git` 제거하거나, 의도된 분리 저장소라면 모노레포 README/문서로 명시.

### 12. 루트 `build` 스크립트가 `concurrently` 미사용 (직렬)
- **파일**: `package.json:11`
- **문제**: backend 빌드가 끝나야 frontend 시작. dev에서는 `concurrently`를 쓰면서 build에서는 안 씀.
- **수정**:
  ```json
  "build": "concurrently \"npm -w packages/backend run build\" \"npm -w packages/frontend run build\""
  ```
  workspace 플래그(`-w`)로 cd 체이닝도 제거.

### 13. SQLite DB 파일과 `.env`가 저장소에 포함될 위험
- **파일**: `packages/backend/todo.sqlite`, `packages/backend/.env`
- **문제**: 루트 `.gitignore`에 `.env`는 있지만 `*.sqlite`/`*.db`는 없음. backend가 별도 git 저장소라 그쪽 .gitignore 정책에 따라 이미 추적 중일 수 있음.
- **수정**: `.gitignore`에 `*.sqlite`, `*.db`, `*.sqlite-journal` 추가. 이미 추적 중이라면 `git rm --cached`.

### 14. Jest 설정 파일 중복 (`jest.config.ts` + `jest.config.js`)
- **파일**: `packages/backend/jest.config.ts`, `packages/backend/jest.config.js`
- **문제**: 두 형식이 공존하면 어떤 게 적용되는지 모호 (대개 `.js`가 우선). `ts` 쪽 의도가 무시될 수 있음.
- **수정**: 하나만 남기고 다른 하나 삭제.

---

## 🔍 추가로 확인 권장 항목

- `DB_SYNCHRONIZE=true`가 운영 환경에 노출되지 않도록 부트스트랩에서 `NODE_ENV` 가드 추가.
- ValidationPipe `forbidNonWhitelisted: true`는 좋으나, FE에서 보내는 페이로드 키와 DTO의 필드명이 정확히 일치하는지 통합 테스트 권장.
- `parent`/`children` 셀프 조인의 `onDelete: 'CASCADE'` — 휴지통(soft delete) 정책과의 상호작용 점검 (부모를 휴지통으로 보냈을 때 자식이 같이 사라지는지/유지되는지 명확화).
- Swagger 엔드포인트(`/api-docs`)가 운영에 그대로 열리면 스키마 노출. 환경별 토글 권장.
- Axios 클라이언트에 인터셉터로 401/네트워크 오류 공통 처리 부재 — 추후 인증 도입 시 필요.

---

> 이 리포트는 정적 분석 기반이며 실제 동작은 환경(서버 TZ, DB 종류, 빌드 모드)에 따라 차이가 있을 수 있습니다. ① ② ③항은 데이터 정합성·보안·배포 가능성에 직결되므로 우선 처리 권장.
