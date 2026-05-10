import { useEffect, useState } from "react";
import { getCurrentUser } from "../api/auth";
import type { CurrentUser } from "../types/Auth";

/**
 * useCurrentUser는 컴포넌트 마운트 시 /api/auth/me를 한 번 호출해
 * 현재 로그인된 사용자 정보를 가져오는 훅이다.
 *
 * 반환값:
 * - status === "loading": 아직 결과를 모름 → 로딩 UI를 보여줘야 함
 * - status === "authenticated": user 채워짐
 * - status === "guest": 로그인 안 됨 (401 등)
 *
 * loading 상태를 별도로 다루는 이유:
 * 쿠키 검증은 비동기라 첫 렌더링에서 "로그인 여부"를 즉시 알 수 없다.
 * 로딩 처리 없이 바로 분기하면 새로고침 때마다 화면이 깜빡인다.
 */
export type AuthStatus = "loading" | "authenticated" | "guest";

interface AuthState {
  status: AuthStatus;
  user: CurrentUser | null;
}

export const useCurrentUser = (): AuthState => {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
  });

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setState({ status: "authenticated", user });
        }
      })
      .catch(() => {
        // 401/네트워크 에러 모두 게스트로 취급. 정상적인 흐름이라 콘솔 에러는 띄우지 않는다.
        if (!cancelled) {
          setState({ status: "guest", user: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};
