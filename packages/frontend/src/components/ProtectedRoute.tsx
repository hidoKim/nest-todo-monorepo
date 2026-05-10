import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * 보호된 라우트.
 * 마운트 시 /api/auth/me를 호출해 쿠키 유효성을 확인한 후,
 *  - 인증됨: children 렌더링
 *  - 게스트: /onboarding으로 리다이렉트
 *  - 로딩: 빈 화면(혹은 spinner)
 *
 * App.tsx에서 보호되어야 할 라우트들의 공통 부모로 한 번만 감싸면
 * 페이지 전환 시 마운트 유지되어 /me 호출이 1회로 끝난다.
 */
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { status } = useCurrentUser();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muji-bg">
        <div className="text-muji-muted font-light">확인 중...</div>
      </div>
    );
  }

  if (status === "guest") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
