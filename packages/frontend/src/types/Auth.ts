/**
 * 인증 관련 타입 정의
 */

/**
 * 로그인 요청 DTO
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * 로그인 응답 DTO
 */
export interface LoginResponse {
  token: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * 사용자 정보
 */
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: Date;
}

/**
 * OAuth 프로필 정보
 */
export interface OAuthProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: "google" | "kakao";
}

/**
 * 인증 상태
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * 소셜 로그인 제공자
 */
export type SocialProvider = "google" | "kakao";

/**
 * 이메일 로그인 폼 데이터
 */
export interface EmailLoginFormData {
  email: string;
  password: string;
}
