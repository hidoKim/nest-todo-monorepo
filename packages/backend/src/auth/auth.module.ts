import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UsersModule } from "../users/user.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { GoogleStrategy } from "./strategies/google.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { KakaoStrategy } from "./strategies/kakao.strategy";

// AuthModule은 인증 관련 모든 컴포넌트를 묶는다.
// JwtModule.registerAsync로 JWT_SECRET을 ConfigService에서 주입받아 안전하게 구성.
@Module({
  imports: [
    PassportModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const secret = config.get<string>("JWT_SECRET");
        if (!secret) {
          throw new Error("JWT_SECRET is not configured");
        }
        // @nestjs/jwt v11+는 expiresIn을 ms 라이브러리의 StringValue 리터럴 유니온으로
        // 좁혀 받기 때문에 일반 string은 직접 대입할 수 없다.
        // 환경변수에서 읽은 값이 실제로 잘못된 형식이면 jsonwebtoken이 런타임에 던지므로,
        // 여기서는 타입을 우회해서 통과시킨다.
        const expiresIn = config.get<string>("JWT_EXPIRES_IN") ?? "24h";
        return {
          secret,
          signOptions: { expiresIn } as JwtModuleOptions["signOptions"],
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    KakaoStrategy,
    JwtStrategy,
    // APP_GUARD 토큰으로 등록하면 NestJS가 모든 라우트에 자동 적용한다.
    // @Public()이 붙은 엔드포인트만 면제되어, 가드 부착 누락으로 인한 인증 우회를
    // 원천적으로 차단한다. 컨트롤러 단위 @UseGuards는 더 이상 필요 없다.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
