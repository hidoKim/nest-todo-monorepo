import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy, VerifyCallback } from "passport-google-oauth20";
import { UsersService } from "../../users/user.service";
import { User } from "../../users/user.entity";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const clientID = configService.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = configService.get<string>("GOOGLE_CLIENT_SECRET");
    const callbackURL = configService.get<string>("GOOGLE_CALLBACK_URL");

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error(
        "Google OAuth env vars missing (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL)",
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      // email/profile 스코프만 요청. 더 넓은 스코프는 사용자 동의 화면이 무거워지고
      // 보관해야 할 데이터가 늘어나므로 최소 권한 원칙을 따른다.
      scope: ["email", "profile"],
    });
  }

  // validate는 Google이 토큰 교환 후 사용자 프로필을 넘겨줄 때 호출된다.
  // 여기서 우리 DB에 user를 upsert하고, 반환된 user가 req.user에 담긴다.
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const user: User = await this.usersService.findOrCreateOAuth({
        provider: "google",
        providerId: profile.id,
        email: profile.emails?.[0]?.value ?? null,
        name: profile.displayName ?? null,
        picture: profile.photos?.[0]?.value ?? null,
      });
      done(null, user);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
