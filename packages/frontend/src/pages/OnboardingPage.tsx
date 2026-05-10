import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { handleSocialLogin } from "../utils/auth";

const OnboardingPage = () => {
  const navigate = useNavigate();

  // 로컬스토리지에서 토큰 확인 - 있으면 홈으로 리다이렉트
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      navigate("/today");
    }
  }, [navigate]);

  const handleEmailLogin = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muji-bg via-muji-panel to-muji-bg flex items-center justify-center p-4">
      {/* 배경 장식 요소 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-muji-accent rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float"></div>
        <div
          className="absolute bottom-10 left-10 w-72 h-72 bg-muji-line rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="relative z-10 w-full max-w-md">
        {/* 헤더 섹션 */}
        <div className="text-center mb-12">
          {/* 로고 영역 */}
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-muji-accent to-muji-muted rounded-2xl flex items-center justify-center shadow-note">
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

          {/* 제목 */}
          <h1 className="text-4xl font-bold text-muji-text mb-3 tracking-tight font-notebook">
            TodoList
          </h1>

          {/* 부제목 */}
          <p className="text-lg text-muji-muted leading-relaxed font-light">
            스마트하고 직관적인
            <br />
            일정 관리 서비스
          </p>
        </div>

        {/* 카드 컨테이너 */}
        <div className="bg-muji-panel rounded-3xl shadow-note p-8 space-y-6">
          {/* 소셜 로그인 섹션 */}
          <div className="space-y-3">
            {/* 구글 로그인 버튼 */}
            <button
              onClick={() => handleSocialLogin("google")}
              className="w-full bg-white hover:bg-gray-50 border-2 border-muji-line text-muji-text rounded-xl py-3 px-4 font-semibold transition-all duration-200 flex items-center justify-center gap-3 hover:shadow-note"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                ></path>
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                ></path>
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                ></path>
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                ></path>
              </svg>
              <span>Google로 계속하기</span>
            </button>

            {/* 카카오 로그인 버튼 */}
            <button
              onClick={() => handleSocialLogin("kakao")}
              className="w-full bg-yellow-350 hover:bg-yellow-400 text-gray-900 rounded-xl py-3 px-4 font-semibold transition-all duration-200 flex items-center justify-center gap-3 hover:shadow-note"
              style={{ backgroundColor: "#FFE812" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 5.64 2 10c0 2.84 1.86 5.32 4.65 6.77-.2 1.59-.92 3.95-2.04 4.94.63-.15 3.31-.72 5.5-2.33.85.12 1.73.18 2.63.18 5.52 0 10-3.64 10-8 0-4.36-4.48-8-10-8z"></path>
              </svg>
              <span>Kakao로 계속하기</span>
            </button>
          </div>

          {/* 구분선 */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-muji-line"></div>
            <span className="text-sm text-muji-muted font-light">또는</span>
            <div className="flex-1 h-px bg-muji-line"></div>
          </div>

          {/* 이메일 로그인 링크 */}
          <button
            onClick={handleEmailLogin}
            className="text-muji-accent hover:text-muji-text font-semibold underline underline-offset-4 transition-colors duration-200 text-base"
          >
            이메일로 로그인
          </button>
        </div>

        {/* 약관 안내 */}
        <p className="text-center text-xs text-muji-muted mt-8 leading-relaxed font-light">
          계속하면 저희{" "}
          <a
            href="/terms"
            className="underline hover:text-muji-text transition-colors"
          >
            이용약관
          </a>
          과{" "}
          <a
            href="/privacy"
            className="underline hover:text-muji-text transition-colors"
          >
            개인정보처리방침
          </a>
          에 동의합니다.
        </p>
      </div>
    </div>
  );
};

export default OnboardingPage;
