// e2e 테스트 부팅 전에 환경변수를 강제로 오버라이드한다.
// jest-e2e.config.ts의 setupFiles로 등록되어 모든 spec보다 먼저 1회 실행.
//
// 주의: AppModule이 ConfigModule.forRoot()로 .env를 읽기 전에 이 파일이 실행되어야
// process.env 값이 우선 적용된다. setupFiles는 그 타이밍을 보장한다.

// in-memory SQLite — 매 부팅마다 새 DB. 파일 잔재 없음.
process.env.DB_TYPE = "sqlite";
process.env.SQLITE_DB = ":memory:";
process.env.DB_SYNCHRONIZE = "true";

// 보안 관련 — 부팅 실패 방지용 더미 값
process.env.JWT_SECRET = "e2e-test-jwt-secret-not-used-in-production";
process.env.JWT_EXPIRES_IN = "1h";

// OAuth 더미 값 (e2e에선 실제 호출 안 함, 부팅만 통과시키면 됨)
process.env.GOOGLE_CLIENT_ID = "dummy";
process.env.GOOGLE_CLIENT_SECRET = "dummy";
process.env.GOOGLE_CALLBACK_URL = "http://localhost:3000/auth/google/callback";
process.env.KAKAO_CLIENT_ID = "dummy";
process.env.KAKAO_CALLBACK_URL = "http://localhost:3000/auth/kakao/callback";

process.env.FRONTEND_URL = "http://localhost:3001";
process.env.CORS_ORIGIN = "http://localhost:3001";
process.env.NODE_ENV = "test";
