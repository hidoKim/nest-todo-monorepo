// passport-kakao는 공식 @types 패키지가 없어 최소 타입을 보강한다.
// validate 콜백에서 받는 Profile 모양과 Strategy 옵션만 정의.
declare module "passport-kakao" {
  import { Strategy as PassportStrategy } from "passport";

  export interface StrategyOptions {
    clientID: string;
    clientSecret?: string;
    callbackURL: string;
  }

  export interface Profile {
    id: number | string;
    username?: string;
    displayName?: string;
    _json?: {
      kakao_account?: {
        email?: string;
        profile?: {
          nickname?: string;
          profile_image_url?: string;
        };
      };
    };
  }

  export type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: Error | null, user?: unknown) => void,
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyFunction);
    name: string;
  }
}
