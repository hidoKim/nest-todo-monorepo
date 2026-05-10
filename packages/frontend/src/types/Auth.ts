/**
 * 인증 관련 타입 정의
 * 백엔드의 MeResponseDto와 모양을 맞춘다.
 */

export type AuthProvider = "local" | "google" | "kakao";

/**
 * 현재 인증된 사용자 정보 — GET /api/auth/me 응답.
 * login/register 응답도 같은 모양이다.
 */
export interface CurrentUser {
  id: number;
  email: string | null;
  name: string | null;
  picture: string | null;
  provider: AuthProvider;
}

/**
 * 이메일 로그인 요청 body (POST /api/auth/login)
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * 이메일 회원가입 요청 body (POST /api/auth/register)
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

/**
 * 소셜 로그인 제공자
 */
export type SocialProvider = "google" | "kakao";
