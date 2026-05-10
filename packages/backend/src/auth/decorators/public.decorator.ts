import { SetMetadata } from "@nestjs/common";

// IS_PUBLIC_KEY는 라우트 핸들러에 "이 엔드포인트는 공개"라는 메타데이터를 심을 때 쓰는 키다.
// JwtAuthGuard는 이 키를 Reflector로 읽어, true면 인증을 건너뛴다.
// 메타데이터 키를 상수로 export해 가드와 데코레이터가 같은 키를 공유하게 한다.
export const IS_PUBLIC_KEY = "isPublic";

// Public()은 컨트롤러/메서드 위에 올려 글로벌 JwtAuthGuard를 면제시키는 데코레이터다.
// 사용 예:
//   @Public()
//   @Post("login")
//   login() { ... }
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
