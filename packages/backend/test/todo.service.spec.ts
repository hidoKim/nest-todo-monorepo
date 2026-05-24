import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TodosService } from "../src/todos/todo.service";
import { TagsService } from "../src/tags/tag.service";
import { Todo } from "../src/todos/todo.entity";
import { Tag } from "../src/tags/tag.entity";
import {
  TodoAlreadyTrashedException,
  TodoDeferTomorrowTodayOnlyException,
  TodoDeletedOrTrashedException,
  TodoNotFoundException,
  TodoParentInvalidException,
  TodoReorderInvalidException,
} from "../src/todos/todo.exceptions";
import { TagNotFoundException } from "../src/tags/tag.exceptions";
import { getDateOnlyString, getTodayDate } from "../src/utils/date.util";

// 가장 큰 service라 테스트도 가장 많다.
// 핵심 검증 축:
//  1) user-scope: where 절에 항상 userId가 함께 걸리는지
//  2) 도메인 예외: 정확한 클래스가 정확한 조건에서 던져지는지
//  3) 가드 로직: deleted/trashed 상태에서 mutation 거부
//  4) 404 통일: 본인 소유 아닌 todo와 없는 todo의 응답이 같은지
describe("TodosService", () => {
  let service: TodosService;
  let todoRepository: jest.Mocked<Repository<Todo>>;
  let tagsService: jest.Mocked<TagsService>;

  const userId = 1;
  const todayString = getDateOnlyString(getTodayDate());

  // 한 줄로 Todo 객체를 만들어주는 헬퍼.
  // 각 시나리오에서 필요한 필드만 override하면 됨.
  const buildTodo = (overrides: Partial<Todo> = {}): Todo =>
    ({
      id: 1,
      userId,
      title: "task",
      content: null,
      completedAt: null,
      deletedAt: null,
      trashedAt: null,
      parentId: null,
      parent: null,
      children: [],
      order: 0,
      dueDate: null,
      targetDate: todayString,
      tagId: null,
      tag: null,
      user: undefined,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      ...overrides,
    }) as Todo;

  beforeEach(async () => {
    // QueryBuilder mock: 체이닝 메서드는 모두 mockReturnThis().
    // findAll/getTrash/purgeOldTrash에서 사용되지만 본 테스트는 단순 호출만 검증.
    const queryBuilderMock = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TodosService,
        {
          provide: getRepositoryToken(Todo),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn(),
            create: jest.fn((payload) => payload),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
            // reorder 트랜잭션 검증용
            manager: {
              transaction: jest
                .fn()
                .mockImplementation(async (cb) => cb({ update: jest.fn() })),
            },
          },
        },
        {
          provide: TagsService,
          useValue: { findByName: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(TodosService);
    todoRepository = moduleRef.get(getRepositoryToken(Todo));
    tagsService = moduleRef.get(TagsService);
  });

  // ───────────────────────────────────────────────────────
  // findOne — user-scope + 404 통일
  // ───────────────────────────────────────────────────────
  describe("findOne", () => {
    it("queries with both id and userId in where clause", async () => {
      todoRepository.findOne.mockResolvedValue(buildTodo());

      await service.findOne(userId, 1);

      // user-scope의 핵심: id 단독 조회가 아닌 (id, userId) 조합
      expect(todoRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, userId },
        relations: { tag: true },
      });
    });

    it("throws TodoNotFoundException when todo does not exist or belongs to another user", async () => {
      todoRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(userId, 999)).rejects.toBeInstanceOf(
        TodoNotFoundException,
      );
    });

    it("throws TodoNotFoundException when todo is soft-deleted (404 통일)", async () => {
      // 정책: deleted/trashed는 사용자 입장에선 "존재하지 않는 것" → NotFound로 통일
      todoRepository.findOne.mockResolvedValue(
        buildTodo({ deletedAt: new Date() }),
      );
      await expect(service.findOne(userId, 1)).rejects.toBeInstanceOf(
        TodoNotFoundException,
      );
    });

    it("throws TodoNotFoundException when todo is in trash (404 통일)", async () => {
      todoRepository.findOne.mockResolvedValue(
        buildTodo({ trashedAt: new Date() }),
      );
      await expect(service.findOne(userId, 1)).rejects.toBeInstanceOf(
        TodoNotFoundException,
      );
    });
  });

  // ───────────────────────────────────────────────────────
  // create — listType / parent / tag 분기
  // ───────────────────────────────────────────────────────
  describe("create", () => {
    it("creates a todo with today targetDate by default", async () => {
      todoRepository.save.mockResolvedValue(buildTodo());
      todoRepository.findOne.mockResolvedValue(buildTodo());

      await service.create(userId, { title: "task" });

      expect(todoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId, targetDate: todayString }),
      );
    });

    it("inherits targetDate from parent", async () => {
      const parent = buildTodo({ id: 10, targetDate: "2030-12-31" });
      todoRepository.findOne
        .mockResolvedValueOnce(parent) // getExistingTodo(parent)
        .mockResolvedValueOnce(buildTodo({ id: 11, parentId: 10 })); // load created
      todoRepository.save.mockResolvedValue(buildTodo({ id: 11, parentId: 10 }));

      await service.create(userId, { title: "child", parentId: 10 });

      expect(todoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ targetDate: "2030-12-31", parentId: 10 }),
      );
    });

    it("throws TodoParentInvalidException when parent is in trash", async () => {
      todoRepository.findOne.mockResolvedValue(
        buildTodo({ trashedAt: new Date() }),
      );

      await expect(
        service.create(userId, { title: "child", parentId: 1 }),
      ).rejects.toBeInstanceOf(TodoParentInvalidException);
    });

    it("throws TagNotFoundException when referenced tag does not exist for the user", async () => {
      tagsService.findByName.mockResolvedValue(null);

      await expect(
        service.create(userId, { title: "task", tag: "no-such-tag" }),
      ).rejects.toBeInstanceOf(TagNotFoundException);

      // 다른 사용자의 같은 이름 태그 매칭 방지를 위해 user-scope로 조회되었는지
      expect(tagsService.findByName).toHaveBeenCalledWith(userId, "no-such-tag");
    });

    it("resolves tag to its id when found", async () => {
      tagsService.findByName.mockResolvedValue({ id: 99, name: "집안일" } as Tag);
      todoRepository.save.mockResolvedValue(buildTodo({ tagId: 99 }));
      todoRepository.findOne.mockResolvedValue(buildTodo({ tagId: 99 }));

      await service.create(userId, { title: "task", tag: "집안일" });

      expect(todoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ tagId: 99 }),
      );
    });
  });

  // ───────────────────────────────────────────────────────
  // update — deleted/trashed mutation 가드
  // ───────────────────────────────────────────────────────
  describe("update", () => {
    it("throws TodoDeletedOrTrashedException when updating deleted todo", async () => {
      todoRepository.findOne.mockResolvedValue(
        buildTodo({ deletedAt: new Date() }),
      );
      await expect(
        service.update(userId, 1, { title: "changed" }),
      ).rejects.toBeInstanceOf(TodoDeletedOrTrashedException);
    });

    it("clears tag when tag is set to empty string", async () => {
      todoRepository.findOne
        .mockResolvedValueOnce(buildTodo({ tagId: 5 }))
        .mockResolvedValueOnce(buildTodo({ tagId: null }));
      todoRepository.save.mockResolvedValue(buildTodo({ tagId: null }));

      const result = await service.update(userId, 1, { tag: "  " });
      expect(result.tag).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────
  // complete / incomplete — 같은 가드 패턴 한 케이스로 대표
  // ───────────────────────────────────────────────────────
  describe("complete / incomplete", () => {
    it("rejects complete on trashed todo", async () => {
      todoRepository.findOne.mockResolvedValue(
        buildTodo({ trashedAt: new Date() }),
      );
      await expect(service.complete(userId, 1)).rejects.toBeInstanceOf(
        TodoDeletedOrTrashedException,
      );
    });

    it("sets completedAt to a Date when called on active todo", async () => {
      todoRepository.findOne
        .mockResolvedValueOnce(buildTodo())
        .mockResolvedValueOnce(buildTodo({ completedAt: new Date() }));
      todoRepository.save.mockResolvedValue(
        buildTodo({ completedAt: new Date() }),
      );

      const result = await service.complete(userId, 1);
      expect(result.completedAt).not.toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────
  // deferToTomorrow — 정확히 today 리스트만 허용
  // ───────────────────────────────────────────────────────
  describe("deferToTomorrow", () => {
    it("moves subtree targetDate forward by 1 day", async () => {
      todoRepository.findOne.mockResolvedValue(buildTodo());

      const result = await service.deferToTomorrow(userId, 1);

      // update 호출에 userId 함께 걸리는지(이중 안전장치)
      expect(todoRepository.update).toHaveBeenCalledWith(
        { id: expect.anything(), userId },
        expect.objectContaining({ targetDate: expect.any(String) }),
      );
      expect(result.message).toContain("tomorrow");
    });

    it("throws TodoDeferTomorrowTodayOnlyException when not in today list", async () => {
      todoRepository.findOne.mockResolvedValue(
        buildTodo({ targetDate: "2030-01-01" }),
      );

      await expect(service.deferToTomorrow(userId, 1)).rejects.toBeInstanceOf(
        TodoDeferTomorrowTodayOnlyException,
      );
    });

    it("rejects defer on deleted/trashed todo", async () => {
      todoRepository.findOne.mockResolvedValue(
        buildTodo({ deletedAt: new Date() }),
      );
      await expect(service.deferToTomorrow(userId, 1)).rejects.toBeInstanceOf(
        TodoDeletedOrTrashedException,
      );
    });
  });

  // ───────────────────────────────────────────────────────
  // softDelete / restore / toTrash
  // ───────────────────────────────────────────────────────
  describe("softDelete", () => {
    it("sets deletedAt with userId scope", async () => {
      todoRepository.findOne.mockResolvedValue(buildTodo());

      await service.softDelete(userId, 1);

      expect(todoRepository.update).toHaveBeenCalledWith(
        { id: expect.anything(), userId },
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    it("throws TodoAlreadyTrashedException when already in trash", async () => {
      todoRepository.findOne.mockResolvedValue(
        buildTodo({ trashedAt: new Date() }),
      );
      await expect(service.softDelete(userId, 1)).rejects.toBeInstanceOf(
        TodoAlreadyTrashedException,
      );
    });
  });

  describe("toTrash & restore", () => {
    it("toTrash sets both deletedAt and trashedAt", async () => {
      todoRepository.findOne.mockResolvedValue(buildTodo());
      await service.toTrash(userId, 1);

      expect(todoRepository.update).toHaveBeenCalledWith(
        { id: expect.anything(), userId },
        expect.objectContaining({
          deletedAt: expect.any(Date),
          trashedAt: expect.any(Date),
        }),
      );
    });

    it("restore clears both deletedAt and trashedAt", async () => {
      todoRepository.findOne.mockResolvedValue(
        buildTodo({ deletedAt: new Date(), trashedAt: new Date() }),
      );
      await service.restore(userId, 1);

      expect(todoRepository.update).toHaveBeenCalledWith(
        { id: expect.anything(), userId },
        { deletedAt: null, trashedAt: null },
      );
    });
  });

  // ───────────────────────────────────────────────────────
  // reorder — 부분 매칭 거부 + inactive 거부
  // ───────────────────────────────────────────────────────
  describe("reorder", () => {
    it("throws TodoReorderInvalidException when some ids belong to other users", async () => {
      // 요청은 3개 id인데 user-scope로 조회된 결과는 2개 → 매칭 실패
      todoRepository.find.mockResolvedValue([
        { id: 1, deletedAt: null, trashedAt: null },
        { id: 2, deletedAt: null, trashedAt: null },
      ] as Todo[]);

      await expect(
        service.reorder(userId, {
          items: [
            { id: 1, order: 0 },
            { id: 2, order: 1 },
            { id: 3, order: 2 },
          ],
        }),
      ).rejects.toBeInstanceOf(TodoReorderInvalidException);
    });

    it("throws TodoReorderInvalidException when items include deleted/trashed", async () => {
      todoRepository.find.mockResolvedValue([
        { id: 1, deletedAt: null, trashedAt: null },
        { id: 2, deletedAt: new Date(), trashedAt: null },
      ] as Todo[]);

      await expect(
        service.reorder(userId, {
          items: [
            { id: 1, order: 0 },
            { id: 2, order: 1 },
          ],
        }),
      ).rejects.toBeInstanceOf(TodoReorderInvalidException);
    });

    it("runs updates inside a transaction when all checks pass", async () => {
      todoRepository.find.mockResolvedValue([
        { id: 1, deletedAt: null, trashedAt: null },
        { id: 2, deletedAt: null, trashedAt: null },
      ] as Todo[]);

      const result = await service.reorder(userId, {
        items: [
          { id: 1, order: 0 },
          { id: 2, order: 1 },
        ],
      });

      // manager.transaction이 한 번 호출되어 모든 update가 원자적으로 실행
      expect(todoRepository.manager.transaction).toHaveBeenCalledTimes(1);
      expect(result.message).toContain("order updated");
    });
  });
});
