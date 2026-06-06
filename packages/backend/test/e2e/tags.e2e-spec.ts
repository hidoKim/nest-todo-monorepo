import { INestApplication } from "@nestjs/common";
import request from "supertest";
import TestAgent from "supertest/lib/agent";
import { bootstrapTestApp, clearDatabase } from "./bootstrap";

// 인증된 agent 한 명을 만드는 헬퍼.
// register는 자동으로 Set-Cookie를 내려주므로, 같은 agent로 후속 요청을 보내면
// 별도 처리 없이 인증 상태가 유지된다.
const registerAndAgent = async (
  httpServer: ReturnType<INestApplication["getHttpServer"]>,
  email: string,
  name?: string,
): Promise<TestAgent> => {
  const agent = request.agent(httpServer);
  await agent
    .post("/api/auth/register")
    .send({ email, password: "pw12345678", name: name ?? email })
    .expect(201);
  return agent;
};

describe("Tags (e2e)", () => {
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
    await clearDatabase(app);
  });

  // ───────────────────────────────────────────────────────
  // 인증 가드 검증 — 글로벌 JwtAuthGuard가 실제 HTTP 레벨에서 동작하는지
  // ───────────────────────────────────────────────────────
  describe("Authentication guard", () => {
    it("returns 401 AUTH_NOT_AUTHENTICATED when no cookie", async () => {
      const res = await request(httpServer).get("/tags").expect(401);
      expect(res.body.errorCode).toBe("AUTH_NOT_AUTHENTICATED");
    });
  });

  // ───────────────────────────────────────────────────────
  // GET /tags — 디폴트 시드 + user-scope 격리
  // ───────────────────────────────────────────────────────
  describe("GET /tags", () => {
    it("returns the 6 default tags seeded on registration", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");

      const res = await agent.get("/tags").expect(200);

      // UsersService.createLocal에서 seedDefaultsForUser가 자동 호출되는지 검증
      expect(res.body).toHaveLength(6);
      const names = res.body.map((t: { name: string }) => t.name).sort();
      expect(names).toEqual(
        ["기념일", "기타", "준비물", "직장", "집안일", "학업"].sort(),
      );
    });

    it("isolates tags per user (User A cannot see User B's tags)", async () => {
      const agentA = await registerAndAgent(httpServer, "a@example.com", "A");
      const agentB = await registerAndAgent(httpServer, "b@example.com", "B");

      await agentA.post("/tags").send({ name: "A전용태그" }).expect(201);
      await agentB.post("/tags").send({ name: "B전용태그" }).expect(201);

      const resA = await agentA.get("/tags").expect(200);
      const namesA = resA.body.map((t: { name: string }) => t.name);

      // A는 본인의 7번째 태그까지만 보여야 함 (기본 6 + A전용)
      expect(namesA).toContain("A전용태그");
      expect(namesA).not.toContain("B전용태그");
      expect(resA.body).toHaveLength(7);
    });
  });

  // ───────────────────────────────────────────────────────
  // POST /tags — 정상 / 중복 / 다른 사용자 동명 / validation
  // ───────────────────────────────────────────────────────
  describe("POST /tags", () => {
    it("creates a tag scoped to the current user", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");

      const res = await agent.post("/tags").send({ name: "독서" }).expect(201);

      expect(res.body).toMatchObject({ name: "독서" });
      expect(res.body.id).toEqual(expect.any(Number));
    });

    it("returns 400 TAG_DUPLICATE when same user creates the same name twice", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      await agent.post("/tags").send({ name: "독서" }).expect(201);

      const res = await agent.post("/tags").send({ name: "독서" }).expect(400);

      expect(res.body.errorCode).toBe("TAG_DUPLICATE");
    });

    it("allows two different users to use the same tag name", async () => {
      const agentA = await registerAndAgent(httpServer, "a@example.com", "A");
      const agentB = await registerAndAgent(httpServer, "b@example.com", "B");

      // (userId, name) 복합 유니크라 다른 사용자끼리는 충돌하지 않아야 함
      await agentA.post("/tags").send({ name: "독서" }).expect(201);
      await agentB.post("/tags").send({ name: "독서" }).expect(201);
    });

    it("returns 400 VALIDATION_FAILED for empty name", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");

      const res = await agent.post("/tags").send({ name: "" }).expect(400);
      expect(res.body.errorCode).toBe("VALIDATION_FAILED");
    });

    it("returns 400 VALIDATION_FAILED for name longer than 50 chars", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");

      const res = await agent
        .post("/tags")
        .send({ name: "a".repeat(51) })
        .expect(400);
      expect(res.body.errorCode).toBe("VALIDATION_FAILED");
    });
  });

  // ───────────────────────────────────────────────────────
  // PUT /tags/:id — 정상 / 다른 사용자 소유 / 이름 충돌
  // ───────────────────────────────────────────────────────
  describe("PUT /tags/:id", () => {
    it("updates the tag name", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      const created = await agent
        .post("/tags")
        .send({ name: "독서" })
        .expect(201);

      const res = await agent
        .put(`/tags/${created.body.id}`)
        .send({ name: "독서클럽" })
        .expect(200);

      expect(res.body.name).toBe("독서클럽");
    });

    it("returns 404 TAG_NOT_FOUND when updating another user's tag (정보 노출 차단)", async () => {
      const agentA = await registerAndAgent(httpServer, "a@example.com", "A");
      const agentB = await registerAndAgent(httpServer, "b@example.com", "B");

      const tagA = await agentA
        .post("/tags")
        .send({ name: "A의태그" })
        .expect(201);

      // B가 A의 태그 id를 알아도 접근 불가 — 권한 부족이 아닌 NotFound로 통일
      const res = await agentB
        .put(`/tags/${tagA.body.id}`)
        .send({ name: "탈취시도" })
        .expect(404);

      expect(res.body.errorCode).toBe("TAG_NOT_FOUND");
    });

    it("returns 400 TAG_NAME_IN_USE when new name collides with another tag", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      const tag1 = await agent.post("/tags").send({ name: "독서" }).expect(201);
      await agent.post("/tags").send({ name: "운동" }).expect(201);

      // tag1을 이미 존재하는 "운동"으로 바꾸려 하면 충돌
      const res = await agent
        .put(`/tags/${tag1.body.id}`)
        .send({ name: "운동" })
        .expect(400);

      expect(res.body.errorCode).toBe("TAG_NAME_IN_USE");
    });
  });

  // ───────────────────────────────────────────────────────
  // DELETE /tags/:id — 정상 + todo 연관 정리 + 다른 사용자 차단
  // ───────────────────────────────────────────────────────
  describe("DELETE /tags/:id", () => {
    it("deletes the tag and clears tagId on todos that referenced it", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");

      // 1) 태그 만들고
      const tag = await agent
        .post("/tags")
        .send({ name: "독서" })
        .expect(201);

      // 2) 그 태그를 사용하는 todo 만들고
      const todo = await agent
        .post("/todos")
        .send({ title: "책 읽기", tag: "독서" })
        .expect(201);
      expect(todo.body.tag).toBe("독서");

      // 3) 태그 삭제
      const delRes = await agent.delete(`/tags/${tag.body.id}`).expect(200);
      expect(delRes.body.message).toContain("deleted");

      // 4) todo는 살아있고 tag만 null로 정리됨
      const after = await agent.get(`/todos/${todo.body.id}`).expect(200);
      expect(after.body.tag).toBeNull();
    });

    it("returns 404 TAG_NOT_FOUND when deleting another user's tag", async () => {
      const agentA = await registerAndAgent(httpServer, "a@example.com", "A");
      const agentB = await registerAndAgent(httpServer, "b@example.com", "B");

      const tagA = await agentA
        .post("/tags")
        .send({ name: "A의태그" })
        .expect(201);

      const res = await agentB.delete(`/tags/${tagA.body.id}`).expect(404);
      expect(res.body.errorCode).toBe("TAG_NOT_FOUND");

      // 그리고 실제로 A의 태그는 여전히 살아있는지 확인 (이중 안전장치 검증)
      const listA = await agentA.get("/tags").expect(200);
      expect(listA.body.some((t: { id: number }) => t.id === tagA.body.id)).toBe(
        true,
      );
    });
  });
});
