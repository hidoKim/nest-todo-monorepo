import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { hasAuthToken } from "../utils/auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * 보호된 라우트 컴포넌트
 * 인증된 사용자만 접근 가능하며, 미인증 사용자는 온보딩 페이지로 리다이렉트
 */
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  if (!hasAuthToken()) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
