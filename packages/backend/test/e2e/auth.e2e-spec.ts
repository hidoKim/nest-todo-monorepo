import { INestApplication } from "@nestjs/common";
// supertest는 namespace export라 `import * as`로 받으면 호출 불가능한 namespace로 인식.
// esModuleInterop=true + default import 형태로 가져온다. (cookie-parser와 동일한 함정)
import request from "supertest";
import { bootstrapTestApp, clearDatabase } from "./bootstrap";

// 인증 흐름 통합 검증.
// 단위 테스트와 달리 실제 HTTP 요청 → 가드 → controller → service → DB → 응답까지
// 모두 실제로 흐른다. 가장 큰 가치는 "각 부품이 다 모였을 때 의도대로 동작하는가".
//
// supertest.agent는 응답의 Set-Cookie를 자동으로 받아 다음 요청에 동봉한다.
// 덕분에 로그인 → 보호 엔드포인트 호출 흐름을 자연스럽게 표현할 수 있다.
describe("Auth (e2e)", () => {
  let app: INestApplication;
  let httpServer: ReturnType<INestApplication["getHttpServer"]>;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // 매 it마다 DB를 비워 테스트 간 격리.
    await clearDatabase(app);
  });

  describe("POST /api/auth/register", () => {
    it("creates a user, sets auth cookie, and returns user info", async () => {
      const res = await request(httpServer)
        .post("/api/auth/register")
        .send({ email: "a@example.com", password: "pw12345678", name: "A" })
        .expect(201);

      // 응답 body는 MeResponseDto 모양
      expect(res.body).toMatchObject({
        email: "a@example.com",
        name: "A",
        provider: "local",
      });
      // Set-Cookie 헤더에 access_token이 HttpOnly로 내려와야 함
      const setCookie = res.headers["set-cookie"] as unknown as string[];
      expect(setCookie).toBeDefined();
      expect(setCookie.some((c) => c.startsWith("access_token="))).toBe(true);
      expect(setCookie.some((c) => c.toLowerCase().includes("httponly"))).toBe(
        true,
      );
    });

    it("returns 409 AUTH_EMAIL_IN_USE when email already exists", async () => {
      await request(httpServer)
        .post("/api/auth/register")
        .send({ email: "dup@example.com", password: "pw12345678" })
        .expect(201);

      const res = await request(httpServer)
        .post("/api/auth/register")
        .send({ email: "dup@example.com", password: "pw12345678" })
        .expect(409);

      // 표준 에러 응답 모양 검증 — ErrorResponseDto
      expect(res.body).toMatchObject({
        statusCode: 409,
        errorCode: "AUTH_EMAIL_IN_USE",
        path: "/api/auth/register",
      });
      expect(res.body.timestamp).toEqual(expect.any(String));
    });

    it("returns 400 VALIDATION_FAILED for short password", async () => {
      // RegisterDto는 password @MinLength(8) 검증
      const res = await request(httpServer)
        .post("/api/auth/register")
        .send({ email: "short@example.com", password: "123" })
        .expect(400);

      expect(res.body.errorCode).toBe("VALIDATION_FAILED");
      expect(res.body.message).toContain("password");
    });

    it("returns 400 VALIDATION_FAILED for invalid email format", async () => {
      const res = await request(httpServer)
        .post("/api/auth/register")
        .send({ email: "not-an-email", password: "pw12345678" })
        .expect(400);

      expect(res.body.errorCode).toBe("VALIDATION_FAILED");
      expect(res.body.message).toContain("email");
    });
  });

  describe("POST /api/auth/login", () => {
    // 로그인 테스트는 사전에 사용자가 있어야 함. beforeEach 안에서 register 호출.
    const credentials = { email: "login@example.com", password: "pw12345678" };

    beforeEach(async () => {
      await request(httpServer).post("/api/auth/register").send(credentials);
    });

    it("succeeds with correct credentials and sets a fresh cookie", async () => {
      const res = await request(httpServer)
        .post("/api/auth/login")
        .send(credentials)
        .expect(200);

      expect(res.body.email).toBe(credentials.email);
      const setCookie = res.headers["set-cookie"] as unknown as string[];
      expect(setCookie.some((c) => c.startsWith("access_token="))).toBe(true);
    });

    it("returns 401 AUTH_INVALID_CREDENTIALS for unknown email", async () => {
      const res = await request(httpServer)
        .post("/api/auth/login")
        .send({ email: "nobody@example.com", password: "whatever12" })
        .expect(401);

      expect(res.body.errorCode).toBe("AUTH_INVALID_CREDENTIALS");
    });

    it("returns 401 AUTH_INVALID_CREDENTIALS for wrong password", async () => {
      const res = await request(httpServer)
        .post("/api/auth/login")
        .send({ email: credentials.email, password: "wrongpassword" })
        .expect(401);

      // enumeration 방어: 알 수 없는 이메일과 같은 코드/메시지
      expect(res.body.errorCode).toBe("AUTH_INVALID_CREDENTIALS");
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns 401 AUTH_NOT_AUTHENTICATED when no cookie is sent", async () => {
      const res = await request(httpServer).get("/api/auth/me").expect(401);
      expect(res.body.errorCode).toBe("AUTH_NOT_AUTHENTICATED");
    });

    it("returns 200 with user info when cookie is valid", async () => {
      // agent는 쿠키 jar를 갖는다 — register 응답의 Set-Cookie를 자동 저장 후
      // 같은 agent의 후속 요청에 동봉한다.
      const agent = request.agent(httpServer);
      await agent
        .post("/api/auth/register")
        .send({ email: "me@example.com", password: "pw12345678", name: "Me" })
        .expect(201);

      const res = await agent.get("/api/auth/me").expect(200);

      expect(res.body).toMatchObject({
        email: "me@example.com",
        name: "Me",
        provider: "local",
      });
    });
  });

  describe("POST /api/auth/logout", () => {
    it("clears the cookie and subsequent /me returns 401", async () => {
      const agent = request.agent(httpServer);

      await agent
        .post("/api/auth/register")
        .send({ email: "out@example.com", password: "pw12345678" })
        .expect(201);

      // 로그인 상태 확인 (sanity)
      await agent.get("/api/auth/me").expect(200);

      // 로그아웃 — Set-Cookie로 access_token을 만료시킴(maxAge=0 또는 expires=과거)
      await agent.post("/api/auth/logout").expect(204);

      // 같은 agent로 다시 /me → 쿠키 만료됐으므로 401
      const res = await agent.get("/api/auth/me").expect(401);
      expect(res.body.errorCode).toBe("AUTH_NOT_AUTHENTICATED");
    });

    it("works without a prior session (idempotent)", async () => {
      // 쿠키 없이 호출해도 안전하게 204 반환 — 정책: 로그아웃은 @Public
      await request(httpServer).post("/api/auth/logout").expect(204);
    });
  });
});
