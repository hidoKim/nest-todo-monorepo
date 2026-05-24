import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Todo } from "../src/todos/todo.entity";
import { Tag } from "../src/tags/tag.entity";
import { TagsService } from "../src/tags/tag.service";
import {
  TagDuplicateException,
  TagNameInUseException,
  TagNotFoundException,
} from "../src/tags/tag.exceptions";

// Mock Repository 패턴:
// - jest.fn()으로 메서드 stub만 두고, 각 it 안에서 mockResolvedValue로 반환값 주입.
// - jest.Mocked<Repository<Tag>>로 타입을 좁혀 자동완성/타입 체크가 동작.
describe("TagsService", () => {
  let service: TagsService;
  let tagRepository: jest.Mocked<Repository<Tag>>;
  let todoRepository: jest.Mocked<Repository<Todo>>;

  const userId = 1;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn((payload) => payload),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Todo),
          useValue: { update: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(TagsService);
    tagRepository = moduleRef.get(getRepositoryToken(Tag));
    todoRepository = moduleRef.get(getRepositoryToken(Todo));
  });

  describe("create", () => {
    it("creates a tag scoped to the user", async () => {
      tagRepository.findOne.mockResolvedValue(null);
      tagRepository.save.mockResolvedValue({
        id: 1,
        userId,
        name: "집안일",
      } as Tag);

      const result = await service.create(userId, { name: "집안일" });

      // user-scope 검증: where 절에 userId가 함께 포함되는지
      expect(tagRepository.findOne).toHaveBeenCalledWith({
        where: { userId, name: "집안일" },
      });
      expect(tagRepository.create).toHaveBeenCalledWith({
        name: "집안일",
        userId,
      });
      expect(result.name).toBe("집안일");
    });

    it("throws TagDuplicateException when name already exists for the same user", async () => {
      tagRepository.findOne.mockResolvedValue({
        id: 1,
        userId,
        name: "집안일",
      } as Tag);

      await expect(
        service.create(userId, { name: "집안일" }),
      ).rejects.toBeInstanceOf(TagDuplicateException);
    });
  });

  describe("update", () => {
    it("updates tag name when no conflict", async () => {
      tagRepository.findOne
        .mockResolvedValueOnce({ id: 1, userId, name: "집안일" } as Tag) // 초기 조회
        .mockResolvedValueOnce(null); // 중복 검사 (없음)
      tagRepository.save.mockResolvedValue({
        id: 1,
        userId,
        name: "준비물",
      } as Tag);

      const result = await service.update(userId, 1, { name: "준비물" });
      expect(result.name).toBe("준비물");
    });

    it("throws TagNotFoundException when tag does not belong to user", async () => {
      tagRepository.findOne.mockResolvedValue(null);
      await expect(
        service.update(userId, 999, { name: "foo" }),
      ).rejects.toBeInstanceOf(TagNotFoundException);
    });

    it("throws TagNameInUseException when new name collides with another tag", async () => {
      tagRepository.findOne
        .mockResolvedValueOnce({ id: 1, userId, name: "집안일" } as Tag)
        .mockResolvedValueOnce({ id: 2, userId, name: "준비물" } as Tag);

      await expect(
        service.update(userId, 1, { name: "준비물" }),
      ).rejects.toBeInstanceOf(TagNameInUseException);
    });
  });

  describe("remove", () => {
    it("clears tagId on user-owned todos before deleting the tag", async () => {
      const tag = { id: 1, userId, name: "집안일" } as Tag;
      tagRepository.findOne.mockResolvedValue(tag);

      await service.remove(userId, 1);

      // userId 함께 걸어 다른 사용자 todo에 영향이 가지 않게 함
      expect(todoRepository.update).toHaveBeenCalledWith(
        { tagId: 1, userId },
        { tagId: null },
      );
      expect(tagRepository.remove).toHaveBeenCalledWith(tag);
    });

    it("throws TagNotFoundException when removing other user's tag", async () => {
      tagRepository.findOne.mockResolvedValue(null);
      await expect(service.remove(userId, 1)).rejects.toBeInstanceOf(
        TagNotFoundException,
      );
    });
  });

  describe("seedDefaultsForUser", () => {
    it("creates all 6 default tags for a fresh user", async () => {
      tagRepository.find.mockResolvedValue([]);
      tagRepository.save.mockResolvedValue([] as never);

      await service.seedDefaultsForUser(userId);

      expect(tagRepository.save).toHaveBeenCalledTimes(1);
      const savedArr = tagRepository.save.mock.calls[0][0] as unknown as Tag[];
      expect(savedArr).toHaveLength(6);
      expect(savedArr.every((t) => t.userId === userId)).toBe(true);
    });

    it("skips defaults that already exist", async () => {
      tagRepository.find.mockResolvedValue([
        { name: "집안일" } as Tag,
        { name: "준비물" } as Tag,
      ]);
      tagRepository.save.mockResolvedValue([] as never);

      await service.seedDefaultsForUser(userId);

      const savedArr = tagRepository.save.mock.calls[0][0] as unknown as Tag[];
      expect(savedArr).toHaveLength(4);
    });

    it("does not save when all defaults already exist", async () => {
      tagRepository.find.mockResolvedValue([
        { name: "집안일" },
        { name: "준비물" },
        { name: "학업" },
        { name: "직장" },
        { name: "기념일" },
        { name: "기타" },
      ] as Tag[]);

      await service.seedDefaultsForUser(userId);
      expect(tagRepository.save).not.toHaveBeenCalled();
    });
  });
});
