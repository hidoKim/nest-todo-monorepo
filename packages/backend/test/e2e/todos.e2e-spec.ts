import { INestApplication } from "@nestjs/common";
import request from "supertest";
import TestAgent from "supertest/lib/agent";
import { bootstrapTestApp, clearDatabase } from "./bootstrap";
import { getDateOnlyString, getTodayDate } from "../../src/utils/date.util";

const registerAndAgent = async (
  httpServer: ReturnType<INestApplication["getHttpServer"]>,
  email: string,
): Promise<TestAgent> => {
  const agent = request.agent(httpServer);
  await agent
    .post("/api/auth/register")
    .send({ email, password: "pw12345678", name: email })
    .expect(201);
  return agent;
};

describe("Todos (e2e)", () => {
  let app: INestApplication;
  let httpServer: ReturnType<INestApplication["getHttpServer"]>;
  const today = getDateOnlyString(getTodayDate());

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
  // 인증 가드
  // ───────────────────────────────────────────────────────
  describe("Authentication guard", () => {
    it("returns 401 AUTH_NOT_AUTHENTICATED when no cookie", async () => {
      const res = await request(httpServer).get("/todos").expect(401);
      expect(res.body.errorCode).toBe("AUTH_NOT_AUTHENTICATED");
    });
  });

  // ───────────────────────────────────────────────────────
  // POST /todos — 생성 분기
  // ───────────────────────────────────────────────────────
  describe("POST /todos", () => {
    it("creates a todo with today targetDate by default", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");

      const res = await agent
        .post("/todos")
        .send({ title: "오늘 할 일" })
        .expect(201);

      expect(res.body).toMatchObject({
        title: "오늘 할 일",
        targetDate: today,
        tag: null,
      });
    });

    it("creates a todo with tomorrow targetDate when listType=tomorrow", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");

      const res = await agent
        .post("/todos")
        .send({ title: "내일 할 일", listType: "tomorrow" })
        .expect(201);

      // YYYY-MM-DD 형식 검증 + today와 다른 날짜인지
      expect(res.body.targetDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(res.body.targetDate).not.toBe(today);
    });

    it("links a child todo to a parent and inherits targetDate", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      const parent = await agent
        .post("/todos")
        .send({ title: "부모", listType: "tomorrow" })
        .expect(201);

      const child = await agent
        .post("/todos")
        .send({ title: "자식", parentId: parent.body.id })
        .expect(201);

      expect(child.body.parentId).toBe(parent.body.id);
      expect(child.body.targetDate).toBe(parent.body.targetDate);
    });

    it("returns 400 TODO_PARENT_INVALID when parent is in trash", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      const parent = await agent
        .post("/todos")
        .send({ title: "부모" })
        .expect(201);
      await agent.post(`/todos/${parent.body.id}/to-trash`).expect(201);

      const res = await agent
        .post("/todos")
        .send({ title: "자식", parentId: parent.body.id })
        .expect(400);

      expect(res.body.errorCode).toBe("TODO_PARENT_INVALID");
    });

    it("returns 404 TAG_NOT_FOUND when referenced tag does not exist", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");

      const res = await agent
        .post("/todos")
        .send({ title: "task", tag: "없는태그" })
        .expect(404);

      expect(res.body.errorCode).toBe("TAG_NOT_FOUND");
    });

    it("returns 400 VALIDATION_FAILED for empty title", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");

      const res = await agent.post("/todos").send({ title: "" }).expect(400);
      expect(res.body.errorCode).toBe("VALIDATION_FAILED");
    });
  });

  // ───────────────────────────────────────────────────────
  // GET /todos — user-scope 격리
  // ───────────────────────────────────────────────────────
  describe("GET /todos", () => {
    it("returns only the current user's todos", async () => {
      const agentA = await registerAndAgent(httpServer, "a@example.com");
      const agentB = await registerAndAgent(httpServer, "b@example.com");

      await agentA.post("/todos").send({ title: "A1" }).expect(201);
      await agentA.post("/todos").send({ title: "A2" }).expect(201);
      await agentB.post("/todos").send({ title: "B1" }).expect(201);

      const listA = await agentA.get("/todos").expect(200);
      const titlesA = listA.body.map((t: { title: string }) => t.title);

      expect(listA.body).toHaveLength(2);
      expect(titlesA).toContain("A1");
      expect(titlesA).not.toContain("B1");
    });

    it("filters by list=today", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      await agent.post("/todos").send({ title: "오늘" }).expect(201);
      await agent
        .post("/todos")
        .send({ title: "내일", listType: "tomorrow" })
        .expect(201);

      const res = await agent.get("/todos?list=today").expect(200);
      const titles = res.body.map((t: { title: string }) => t.title);

      expect(titles).toContain("오늘");
      expect(titles).not.toContain("내일");
    });
  });

  // ───────────────────────────────────────────────────────
  // GET /todos/:id — 404 통일 정책 검증
  // ───────────────────────────────────────────────────────
  describe("GET /todos/:id", () => {
    it("returns the todo when it belongs to the user", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      const created = await agent
        .post("/todos")
        .send({ title: "task" })
        .expect(201);

      const res = await agent.get(`/todos/${created.body.id}`).expect(200);
      expect(res.body.title).toBe("task");
    });

    it("returns 404 TODO_NOT_FOUND when accessing another user's todo", async () => {
      const agentA = await registerAndAgent(httpServer, "a@example.com");
      const agentB = await registerAndAgent(httpServer, "b@example.com");

      const todoA = await agentA
        .post("/todos")
        .send({ title: "A의 비밀" })
        .expect(201);

      // B가 A의 todo id를 알아도 접근 불가 — 권한 부족이 아닌 NotFound로 통일
      const res = await agentB.get(`/todos/${todoA.body.id}`).expect(404);
      expect(res.body.errorCode).toBe("TODO_NOT_FOUND");
    });

    it("returns 404 TODO_NOT_FOUND for non-existent id", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      const res = await agent.get("/todos/99999").expect(404);
      expect(res.body.errorCode).toBe("TODO_NOT_FOUND");
    });
  });

  // ───────────────────────────────────────────────────────
  // PATCH /todos/:id — 수정 + deleted/trashed 가드
  // ───────────────────────────────────────────────────────
  describe("PATCH /todos/:id", () => {
    it("updates the title", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      const created = await agent
        .post("/todos")
        .send({ title: "old" })
        .expect(201);

      const res = await agent
        .patch(`/todos/${created.body.id}`)
        .send({ title: "new" })
        .expect(200);

      expect(res.body.title).toBe("new");
    });

    it("returns 400 TODO_DELETED_OR_TRASHED when updating a trashed todo", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      const created = await agent
        .post("/todos")
        .send({ title: "task" })
        .expect(201);
      await agent.post(`/todos/${created.body.id}/to-trash`).expect(201);

      const res = await agent
        .patch(`/todos/${created.body.id}`)
        .send({ title: "new" })
        .expect(400);

      expect(res.body.errorCode).toBe("TODO_DELETED_OR_TRASHED");
    });
  });

  // ───────────────────────────────────────────────────────
  // complete / incomplete 라이프사이클
  // ───────────────────────────────────────────────────────
  describe("complete / incomplete", () => {
    it("toggles completedAt", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      const created = await agent
        .post("/todos")
        .send({ title: "task" })
        .expect(201);
      const id = created.body.id;

      const completed = await agent
        .post(`/todos/${id}/complete`)
        .expect(201);
      expect(completed.body.completedAt).not.toBeNull();

      const reverted = await agent
        .post(`/todos/${id}/incomplete`)
        .expect(201);
      expect(reverted.body.completedAt).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────
  // defer-to-tomorrow — today list 외엔 거부
  // ───────────────────────────────────────────────────────
  describe("POST /todos/:id/defer-to-tomorrow", () => {
    it("moves a today-list todo to tomorrow", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      const created = await agent
        .post("/todos")
        .send({ title: "오늘 할 일" })
        .expect(201);

      await agent.post(`/todos/${created.body.id}/defer-to-tomorrow`).expect(201);

      // today 리스트에서 사라지고
      const todayList = await agent.get("/todos?list=today").expect(200);
      expect(
        todayList.body.find((t: { id: number }) => t.id === created.body.id),
      ).toBeUndefined();

      // tomorrow 리스트에 등장
      const tomorrowList = await agent.get("/todos?list=tomorrow").expect(200);
      expect(
        tomorrowList.body.find((t: { id: number }) => t.id === created.body.id),
      ).toBeDefined();
    });

    it("returns 400 TODO_DEFER_TOMORROW_TODAY_ONLY when not in today list", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      const created = await agent
        .post("/todos")
        .send({ title: "내일 일", listType: "tomorrow" })
        .expect(201);

      const res = await agent
        .post(`/todos/${created.body.id}/defer-to-tomorrow`)
        .expect(400);

      expect(res.body.errorCode).toBe("TODO_DEFER_TOMORROW_TODAY_ONLY");
    });
  });

  // ───────────────────────────────────────────────────────
  // 휴지통 전체 라이프사이클
  // ───────────────────────────────────────────────────────
  describe("Trash lifecycle (to-trash → list → restore → permanent)", () => {
    it("flows through trash and back", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      const created = await agent
        .post("/todos")
        .send({ title: "task" })
        .expect(201);
      const id = created.body.id;

      // 1) to-trash
      await agent.post(`/todos/${id}/to-trash`).expect(201);

      // 2) today 리스트에서 사라짐
      const todayList = await agent.get("/todos?list=today").expect(200);
      expect(todayList.body.find((t: { id: number }) => t.id === id))
        .toBeUndefined();

      // 3) trash 리스트엔 있음
      const trash = await agent.get("/todos/trash").expect(200);
      expect(trash.body.find((t: { id: number }) => t.id === id)).toBeDefined();

      // 4) restore
      await agent.post(`/todos/${id}/restore`).expect(201);

      // 5) today 리스트로 복귀
      const restored = await agent.get("/todos?list=today").expect(200);
      expect(restored.body.find((t: { id: number }) => t.id === id)).toBeDefined();
    });

    it("returns 400 TODO_ALREADY_TRASHED when soft-deleting a trashed todo", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      const created = await agent
        .post("/todos")
        .send({ title: "task" })
        .expect(201);
      await agent.post(`/todos/${created.body.id}/to-trash`).expect(201);

      const res = await agent.delete(`/todos/${created.body.id}`).expect(400);
      expect(res.body.errorCode).toBe("TODO_ALREADY_TRASHED");
    });

    it("permanently deletes a todo (DELETE /todos/:id/permanent)", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      const created = await agent
        .post("/todos")
        .send({ title: "task" })
        .expect(201);

      await agent.delete(`/todos/${created.body.id}/permanent`).expect(200);

      // 영구 삭제 후엔 어디서도 찾을 수 없음
      const trash = await agent.get("/todos/trash").expect(200);
      expect(
        trash.body.find((t: { id: number }) => t.id === created.body.id),
      ).toBeUndefined();
      await agent.get(`/todos/${created.body.id}`).expect(404);
    });
  });

  // ───────────────────────────────────────────────────────
  // reorder — 정상 + 타 사용자 id 섞이면 거부
  // ───────────────────────────────────────────────────────
  describe("POST /todos/reorder", () => {
    it("updates order values atomically", async () => {
      const agent = await registerAndAgent(httpServer, "a@example.com");
      const t1 = await agent.post("/todos").send({ title: "A" }).expect(201);
      const t2 = await agent.post("/todos").send({ title: "B" }).expect(201);

      await agent
        .post("/todos/reorder")
        .send({
          items: [
            { id: t1.body.id, order: 5 },
            { id: t2.body.id, order: 3 },
          ],
        })
        .expect(201);

      // GET /todos는 order ASC → 작은 순서가 먼저
      const list = await agent.get("/todos").expect(200);
      expect(list.body[0].id).toBe(t2.body.id); // order: 3
      expect(list.body[1].id).toBe(t1.body.id); // order: 5
    });

    it("returns 404 TODO_REORDER_INVALID when items include another user's todo", async () => {
      const agentA = await registerAndAgent(httpServer, "a@example.com");
      const agentB = await registerAndAgent(httpServer, "b@example.com");

      const todoA = await agentA
        .post("/todos")
        .send({ title: "A" })
        .expect(201);
      const todoB = await agentB
        .post("/todos")
        .send({ title: "B" })
        .expect(201);

      // A가 자기 것과 B 것을 섞어서 reorder 시도 → 일부 매칭 실패 → 404
      const res = await agentA
        .post("/todos/reorder")
        .send({
          items: [
            { id: todoA.body.id, order: 1 },
            { id: todoB.body.id, order: 2 },
          ],
        })
        .expect(404);

      expect(res.body.errorCode).toBe("TODO_REORDER_INVALID");
    });
  });
});
