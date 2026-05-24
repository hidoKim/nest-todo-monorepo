import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Response } from "express";
import * as bcrypt from "bcryptjs";
import { AuthService } from "../src/auth/auth.service";
import { UsersService } from "../src/users/user.service";
import { User } from "../src/users/user.entity";
import {
  EmailInUseException,
  InvalidCredentialsException,
} from "../src/auth/auth.exceptions";

// bcryptjs는 모듈 전체를 mock으로 대체.
// 실제 해시 계산을 건너뛰어 테스트 속도 + 결정성 확보.
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe("AuthService", () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const localUser: User = {
    id: 1,
    email: "test@example.com",
    name: "Test",
    picture: null,
    provider: "local",
    providerId: null,
    passwordHash: "$2a$10$hashedhash",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findLocalByEmail: jest.fn(),
            createLocal: jest.fn(),
            findById: jest.fn(),
            findOrCreateOAuth: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue("signed.jwt.token") },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("test") },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    usersService = moduleRef.get(UsersService);
    jwtService = moduleRef.get(JwtService);
    jest.clearAllMocks();
  });

  describe("validateLocalUser", () => {
    it("returns the user when credentials match", async () => {
      usersService.findLocalByEmail.mockResolvedValue(localUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateLocalUser(
        "test@example.com",
        "rightpw",
      );

      expect(result).toBe(localUser);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "rightpw",
        localUser.passwordHash,
      );
    });

    // ── enumeration attack 방어 ──
    // 아래 3가지 케이스(사용자 없음 / 해시 null / 비번 불일치) 모두 같은 예외를 던져
    // 외부에서 어느 단계에서 실패했는지 알 수 없게 한다.

    it("throws InvalidCredentialsException when user does not exist", async () => {
      usersService.findLocalByEmail.mockResolvedValue(null);

      await expect(
        service.validateLocalUser("no@example.com", "pw"),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
    });

    it("throws InvalidCredentialsException when passwordHash is null (OAuth-only user)", async () => {
      usersService.findLocalByEmail.mockResolvedValue({
        ...localUser,
        passwordHash: null,
      });

      await expect(
        service.validateLocalUser("test@example.com", "pw"),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
    });

    it("throws InvalidCredentialsException when password mismatch", async () => {
      usersService.findLocalByEmail.mockResolvedValue(localUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateLocalUser("test@example.com", "wrongpw"),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
    });
  });

  describe("register", () => {
    it("hashes password and creates a local user", async () => {
      usersService.findLocalByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("$2a$10$newhash");
      usersService.createLocal.mockResolvedValue(localUser);

      const result = await service.register({
        email: "test@example.com",
        password: "pw12345678",
        name: "Test",
      });

      // salt round는 구체 숫자 대신 any로 — 구현 디테일 변경에 견고
      expect(bcrypt.hash).toHaveBeenCalledWith(
        "pw12345678",
        expect.any(Number),
      );
      expect(usersService.createLocal).toHaveBeenCalledWith({
        email: "test@example.com",
        name: "Test",
        passwordHash: "$2a$10$newhash",
      });
      expect(result).toBe(localUser);
    });

    it("throws EmailInUseException when email already exists", async () => {
      usersService.findLocalByEmail.mockResolvedValue(localUser);

      await expect(
        service.register({ email: "dup@example.com", password: "pw12345678" }),
      ).rejects.toBeInstanceOf(EmailInUseException);
    });
  });

  describe("signToken", () => {
    it("signs minimum payload (sub, email, provider)", () => {
      const token = service.signToken(localUser);

      // JWT payload는 최소 필드만. 만료/회수 영향 범위를 줄이기 위함.
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: localUser.id,
        email: localUser.email,
        provider: localUser.provider,
      });
      expect(token).toBe("signed.jwt.token");
    });
  });

  describe("cookie management", () => {
    // Response를 완전한 mock으로 만들지 않고 필요한 메서드만 부분 mock.
    const mockRes = (): Pick<Response, "cookie" | "clearCookie"> => ({
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    });

    it("setAuthCookie sets httpOnly + sameSite=lax cookie", () => {
      const res = mockRes();
      service.setAuthCookie(res as Response, "tk");

      expect(res.cookie).toHaveBeenCalledWith(
        "access_token",
        "tk",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        }),
      );
    });

    it("clearAuthCookie removes access_token cookie", () => {
      const res = mockRes();
      service.clearAuthCookie(res as Response);

      // 옵션이 setCookie와 일치해야 브라우저가 같은 쿠키로 인식해 제거.
      expect(res.clearCookie).toHaveBeenCalledWith(
        "access_token",
        expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
      );
    });
  });
});
