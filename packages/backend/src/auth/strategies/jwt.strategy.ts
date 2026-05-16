import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsersService } from "../../users/user.service";
import { UserNotFoundException } from "../auth.exceptions";

// JwtPayload는 우리가 발급한 JWT 안에 들어있는 정보의 모양이다.
// sub는 JWT 표준 클레임으로 user id를 담는다.
export interface JwtPayload {
  sub: number;
  email: string | null;
  provider: "local" | "google" | "kakao";
}

// cookieExtractor는 요청의 access_token 쿠키에서 JWT를 꺼내는 함수다.
// passport-jwt는 기본적으로 Authorization 헤더에서 꺼내지만,
// 우리는 httpOnly 쿠키 방식이라 직접 추출 함수를 작성한다.
const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies && typeof req.cookies["access_token"] === "string") {
    return req.cookies["access_token"];
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret = configService.get<string>("JWT_SECRET");
    if (!secret) {
      // 환경변수가 비어있으면 부팅 시점에 즉시 실패시켜야 한다.
      // 그렇지 않으면 약한 기본값으로 토큰을 검증해 보안 사고로 이어짐.
      throw new Error("JWT_SECRET is not configured");
    }

    super({
      // jwtFromRequest는 여러 추출기를 fallback으로 둘 수 있다.
      // 학습 목적상 쿠키 1개만 사용. Authorization 헤더는 받지 않는다.
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // validate는 JWT 서명/만료 검증이 통과한 뒤 호출된다.
  // 반환값이 req.user에 담긴다.
  // 토큰이 유효해도 사용자가 삭제됐을 수 있으므로 DB 조회 한 번 더.
  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UserNotFoundException();
    }
    return user;
  }
}
