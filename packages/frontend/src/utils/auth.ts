/**
 * 소셜 로그인 핸들러 함수
 * Google 및 Kakao OAuth 로그인 처리
 */

export type SocialProvider = "google" | "kakao";

/**
 * 소셜 로그인 URL 가져오기
 * @param provider - 소셜 제공자 ("google" | "kakao")
 * @returns 리다이렉트 URL
 */
export const getSocialLoginUrl = (provider: SocialProvider): string => {
  const baseUrl =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_API_URL ||
    window.location.origin;

  const endpoints = {
    google: `${baseUrl}/auth/google`,
    kakao: `${baseUrl}/auth/kakao`,
  };

  return endpoints[provider];
};

/**
 * 소셜 로그인 핸들러
 * @param provider - 소셜 제공자
 */
export const handleSocialLogin = (provider: SocialProvider): void => {
  const url = getSocialLoginUrl(provider);
  window.location.href = url;
};

/**
 * URL 파라미터에서 토큰 추출 및 저장
 * OAuth 콜백 페이지에서 사용
 */
export const extractAndStoreToken = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (token) {
    localStorage.setItem("authToken", token);
    // 토큰 저장 후 URL에서 제거
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  return token;
};

/**
 * 인증 토큰 가져오기
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken");
};

/**
 * 인증 토큰 제거 (로그아웃)
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem("authToken");
};

/**
 * 인증 토큰 존재 여부 확인
 */
export const hasAuthToken = (): boolean => {
  return !!localStorage.getItem("authToken");
};

/**
 * 인증 헤더 생성
 */
export const getAuthHeader = (): Record<string, string> => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
