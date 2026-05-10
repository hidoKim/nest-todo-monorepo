import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";

/**
 * OAuth 콜백 페이지.
 *
 * 흐름:
 * 1. 백엔드의 /auth/google/callback 또는 /auth/kakao/callback이
 *    Set-Cookie로 access_token을 내려준 뒤 이 페이지로 redirect한다.
 * 2. 이 시점에 브라우저엔 이미 쿠키가 저장돼 있으므로
 *    프론트는 토큰을 추출/저장할 일이 없다.
 * 3. /api/auth/me로 한 번 검증한 뒤
 *    - 인증됨 → /today
 *    - 게스트(콜백이 어떤 이유로 실패) → /onboarding
 */
const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const { status } = useCurrentUser();

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/today", { replace: true });
    } else if (status === "guest") {
      navigate("/onboarding", { replace: true });
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-muji-bg via-muji-panel to-muji-bg flex items-center justify-center">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-muji-accent to-muji-muted rounded-2xl flex items-center justify-center shadow-note animate-pulse">
            <svg
              className="w-8 h-8 text-muji-panel"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 012-2 1 1 0 000 2H3v7a2 2 0 002 2h10a2 2 0 002-2V5h-3a1 1 0 000-2 2 2 0 00-2 2v2H6V5a2 2 0 00-2-2zm10 12H6a1 1 0 100 2h8a1 1 0 100-2z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-muji-text mb-3 font-notebook">
          로그인 중...
        </h1>
        <p className="text-muji-muted font-light">잠시만 기다려주세요</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
