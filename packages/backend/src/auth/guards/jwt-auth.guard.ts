import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

// JwtAuthGuard는 AuthModule에서 APP_GUARD 토큰으로 전역 등록된다.
// 모든 라우트가 기본적으로 인증을 요구하고, @Public()이 붙은 엔드포인트만 면제된다.
// 이 패턴은 "가드 깜빡 누락" 같은 사고를 원천 차단해 보안 안전망 역할을 한다.
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // getAllAndOverride는 메서드 → 클래스 순으로 메타데이터를 찾고
    // 더 가까운(메서드) 쪽 값을 우선한다.
    // 이 덕분에 클래스 전체에 @Public()을 걸고 특정 메서드만 보호하거나,
    // 반대로 클래스는 보호하면서 일부만 공개하는 패턴이 가능하다.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    // 비공개 라우트는 기존대로 passport-jwt 검증을 거친다.
    return super.canActivate(context);
  }
}
