import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UsersService } from "../src/users/user.service";
import { TagsService } from "../src/tags/tag.service";
import { User } from "../src/users/user.entity";

describe("UsersService", () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;
  let tagsService: jest.Mocked<TagsService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn((payload) => payload),
          },
        },
        {
          // TagsService는 부분 mock — UsersService가 호출하는 메서드만 stub.
          // 신규 사용자 생성 시 seedDefaultsForUser가 호출되는지 검증할 것이다.
          provide: TagsService,
          useValue: { seedDefaultsForUser: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    userRepository = moduleRef.get(getRepositoryToken(User));
    tagsService = moduleRef.get(TagsService);
  });

  describe("findOrCreateOAuth", () => {
    const profile = {
      provider: "google" as const,
      providerId: "g-123",
      email: "foo@example.com",
      name: "Foo",
      picture: "https://...",
    };

    it("creates a new user and seeds default tags when (provider, providerId) not found", async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.save.mockResolvedValue({ ...profile, id: 7 } as User);

      const result = await service.findOrCreateOAuth(profile);

      // OAuth 사용자 식별 키는 (provider, providerId) 복합 → 이메일이 아님
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { provider: "google", providerId: "g-123" },
      });
      expect(tagsService.seedDefaultsForUser).toHaveBeenCalledWith(7);
      expect(result.id).toBe(7);
    });

    it("returns existing user without save when profile unchanged", async () => {
      const existing = { ...profile, id: 1, passwordHash: null } as User;
      userRepository.findOne.mockResolvedValue(existing);

      const result = await service.findOrCreateOAuth(profile);

      // 변경점 없으면 불필요한 DB write 회피
      expect(userRepository.save).not.toHaveBeenCalled();
      // 기존 사용자에겐 시드 재호출 X — 디폴트 태그 중복 처리는 seed 자체가 막지만 호출 자체 회피가 깔끔
      expect(tagsService.seedDefaultsForUser).not.toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it("persists profile drift (name changed) but does not re-seed tags", async () => {
      const existing = {
        ...profile,
        id: 1,
        name: "Old Name",
        passwordHash: null,
      } as User;
      userRepository.findOne.mockResolvedValue(existing);
      userRepository.save.mockImplementation(async (u) => u as User);

      await service.findOrCreateOAuth(profile);

      // provider 쪽에서 이름이 바뀐 경우 최신값 반영을 위해 save 호출
      expect(userRepository.save).toHaveBeenCalled();
      expect(tagsService.seedDefaultsForUser).not.toHaveBeenCalled();
    });
  });

  describe("createLocal", () => {
    it("creates a local user and seeds default tags", async () => {
      userRepository.save.mockResolvedValue({
        id: 5,
        email: "a@a.com",
        name: "A",
        passwordHash: "hash",
        provider: "local",
        providerId: null,
        picture: null,
      } as User);

      const result = await service.createLocal({
        email: "a@a.com",
        name: "A",
        passwordHash: "hash",
      });

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "a@a.com",
          provider: "local",
          providerId: null,
          passwordHash: "hash",
        }),
      );
      expect(tagsService.seedDefaultsForUser).toHaveBeenCalledWith(5);
      expect(result.id).toBe(5);
    });
  });

  describe("findLocalByEmail", () => {
    it("queries by email AND provider=local", async () => {
      await service.findLocalByEmail("foo@a.com");

      // provider 필터 없이 email만으로 찾으면 OAuth 사용자가 잘못 매칭될 위험
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: "foo@a.com", provider: "local" },
      });
    });
  });

  describe("findById", () => {
    it("delegates to repository.findOne with id", async () => {
      await service.findById(42);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 42 } });
    });
  });
});
