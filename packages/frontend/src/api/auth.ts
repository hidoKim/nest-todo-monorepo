import { apiClient } from "./client";
import type {
  CurrentUser,
  LoginRequest,
  RegisterRequest,
} from "../types/Auth";

/**
 * 이메일/비밀번호 로그인.
 * 성공 시 백엔드가 Set-Cookie로 access_token을 내려줘 브라우저가 자동 저장한다.
 * 응답 body엔 사용자 정보만 담겨있다.
 */
export const login = async (input: LoginRequest): Promise<CurrentUser> => {
  const { data } = await apiClient.post<CurrentUser>("/api/auth/login", input);
  return data;
};

/**
 * 이메일 회원가입. 성공 시 자동으로 로그인 상태가 된다.
 */
export const register = async (
  input: RegisterRequest,
): Promise<CurrentUser> => {
  const { data } = await apiClient.post<CurrentUser>(
    "/api/auth/register",
    input,
  );
  return data;
};

/**
 * 로그아웃. 백엔드가 쿠키를 clear한다.
 */
export const logout = async (): Promise<void> => {
  await apiClient.post("/api/auth/logout");
};

/**
 * 현재 로그인된 사용자 정보. 401이면 axios가 throw한다.
 * ProtectedRoute / useCurrentUser 훅이 사용한다.
 */
export const getCurrentUser = async (): Promise<CurrentUser> => {
  const { data } = await apiClient.get<CurrentUser>("/api/auth/me");
  return data;
};
