/**
 * 소셜 로그인 핸들러.
 * httpOnly 쿠키 방식 전환 후로는 토큰 저장/조회 로직이 모두 백엔드와 브라우저 책임이라
 * 프론트는 OAuth 진입 URL로 보내는 기능만 담는다.
 */

import type { SocialProvider } from "../types/Auth";

/**
 * 소셜 로그인 진입 URL을 생성한다.
 * 클릭 시 이 URL로 location.href 이동 → 백엔드 → provider → 콜백 → /auth/callback.
 */
export const getSocialLoginUrl = (provider: SocialProvider): string => {
  const baseUrl =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_API_URL ||
    window.location.origin;

  const endpoints: Record<SocialProvider, string> = {
    google: `${baseUrl}/auth/google`,
    kakao: `${baseUrl}/auth/kakao`,
  };

  return endpoints[provider];
};

export const handleSocialLogin = (provider: SocialProvider): void => {
  window.location.href = getSocialLoginUrl(provider);
};
