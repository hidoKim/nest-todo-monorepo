import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
// bcryptjs: 순수 JS 구현. native 빌드(@nodejs gyp) 없이 동작해 macOS/Windows 환경 마찰이 적다.
// API는 bcrypt와 동일(hash, compare). 학습/개발 환경에 충분.
import * as bcrypt from "bcryptjs";
import { Response } from "express";
import { UsersService } from "../users/user.service";
import { User } from "../users/user.entity";
import {
  EmailInUseException,
  InvalidCredentialsException,
} from "./auth.exceptions";
import { JwtPayload } from "./strategies/jwt.strategy";

// bcrypt salt round는 학습용 기본값. 프로덕션은 12 이상 권장.
const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // signToken은 user 엔티티로부터 JWT를 발급한다.
  // payload는 최소한으로 유지: 만료/회수 시 영향 범위를 줄이기 위함.
  signToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      provider: user.provider,
    };
    return this.jwtService.sign(payload);
  }

  // setAuthCookie는 응답에 access_token httpOnly 쿠키를 심는다.
  // OAuth 콜백, 로그인, 회원가입 직후 호출된다.
  setAuthCookie(res: Response, token: string): void {
    const isProd = this.configService.get<string>("NODE_ENV") === "production";
    res.cookie("access_token", token, {
      httpOnly: true,                    // JS 접근 차단 → XSS 토큰 탈취 방지
      secure: isProd,                    // production은 HTTPS만 허용
      sameSite: "lax",                   // CSRF 1차 방어 + OAuth redirect 호환
      maxAge: 24 * 60 * 60 * 1000,       // 24시간
      path: "/",
    });
  }

  // clearAuthCookie는 로그아웃 시 쿠키를 제거한다.
  // 옵션이 setCookie와 일치해야 브라우저가 동일 쿠키로 인식하고 지운다.
  clearAuthCookie(res: Response): void {
    const isProd = this.configService.get<string>("NODE_ENV") === "production";
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
    });
  }

  // validateLocalUser는 이메일/비밀번호로 사용자를 검증한다.
  // 사용자 없거나 비밀번호 불일치면 모두 같은 메시지로 401.
  // (어떤 쪽이 틀렸는지 구별 가능하면 enumeration attack 가능)
  async validateLocalUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findLocalByEmail(email);
    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsException();
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new InvalidCredentialsException();
    }
    return user;
  }

  // register는 이메일/비밀번호 회원가입을 처리한다.
  async register(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<User> {
    const exists = await this.usersService.findLocalByEmail(input.email);
    if (exists) {
      throw new EmailInUseException();
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
    return this.usersService.createLocal({
      email: input.email,
      name: input.name ?? null,
      passwordHash,
    });
  }
}
