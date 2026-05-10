import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { extractAndStoreToken } from "../utils/auth";

/**
 * OAuth 콜백 페이지
 * Google/Kakao 로그인 후 리다이렉트되는 페이지
 * URL 파라미터에서 토큰을 추출하고 로컬스토리지에 저장
 */
const OAuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = extractAndStoreToken();

    if (token) {
      // 토큰이 있으면 메인 페이지로 이동
      setTimeout(() => {
        navigate("/today");
      }, 1000);
    } else {
      // 토큰이 없으면 로그인 페이지로 돌아가기
      setTimeout(() => {
        navigate("/onboarding", { replace: true });
      }, 2000);
    }
  }, [navigate]);

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
