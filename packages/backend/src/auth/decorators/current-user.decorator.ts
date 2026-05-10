import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Request } from "express";
import { User } from "../../users/user.entity";

// CurrentUser는 컨트롤러 파라미터에 req.user를 주입하는 커스텀 데코레이터다.
// JwtAuthGuard 통과 후엔 req.user가 항상 User 엔티티로 채워져 있다.
//
// 사용 예:
//   @Get("me")
//   @UseGuards(JwtAuthGuard)
//   me(@CurrentUser() user: User) { ... }
//
// 인자 없이 호출하면 User 전체, 키 이름을 주면 그 필드만 꺼낼 수 있다.
//   @CurrentUser("id") userId: number
export const CurrentUser = createParamDecorator(
  <K extends keyof User>(key: K | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as User | undefined;
    if (!user) {
      // 가드가 정상 동작했으면 도달할 수 없는 분기.
      // 가드 없이 데코레이터만 쓴 경우를 즉시 잡아내기 위함.
      throw new Error("CurrentUser used without an authenticated request");
    }
    return key ? user[key] : user;
  },
);
