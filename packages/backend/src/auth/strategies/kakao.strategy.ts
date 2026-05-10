import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
// passport-kakao는 공식 타입이 없어 src/types/passport-kakao.d.ts에 declare module로 보강한다.
import { Profile, Strategy } from "passport-kakao";
import { UsersService } from "../../users/user.service";
import { User } from "../../users/user.entity";

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, "kakao") {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const clientID = configService.get<string>("KAKAO_CLIENT_ID");
    const callbackURL = configService.get<string>("KAKAO_CALLBACK_URL");

    if (!clientID || !callbackURL) {
      throw new Error(
        "Kakao OAuth env vars missing (KAKAO_CLIENT_ID, KAKAO_CALLBACK_URL)",
      );
    }

    super({
      clientID,
      // Kakao는 client secret이 선택사항이라 환경변수에 있으면 추가, 없으면 생략.
      clientSecret: configService.get<string>("KAKAO_CLIENT_SECRET") ?? "",
      callbackURL,
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: Error | null, user?: User) => void,
  ): Promise<void> {
    try {
      // Kakao 프로필은 _json에 원본이 들어있다.
      // kakao_account.email은 사용자 동의 여부에 따라 비어있을 수 있음.
      const kakaoAccount = profile._json?.kakao_account ?? {};
      const email: string | null = kakaoAccount.email ?? null;
      const nickname: string | null =
        kakaoAccount.profile?.nickname ?? profile.displayName ?? null;
      const picture: string | null =
        kakaoAccount.profile?.profile_image_url ?? null;

      const user = await this.usersService.findOrCreateOAuth({
        provider: "kakao",
        providerId: String(profile.id),
        email,
        name: nickname,
        picture,
      });
      done(null, user);
    } catch (err) {
      done(err as Error);
    }
  }
}
