import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { login } from "../api/auth";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // login()은 백엔드에 POST /api/auth/login 호출.
      // 성공 시 응답의 Set-Cookie 헤더로 access_token 쿠키가 자동 저장된다.
      // 응답 body엔 사용자 정보가 들어있지만 여기서는 단순히 navigate만 한다.
      await login({ email, password });
      navigate("/today", { replace: true });
    } catch (err) {
      // 백엔드 401(Invalid credentials) 또는 네트워크 에러 처리.
      const message =
        axios.isAxiosError(err) && err.response?.status === 401
          ? "이메일 또는 비밀번호가 올바르지 않습니다"
          : err instanceof Error
            ? err.message
            : "로그인 중 오류가 발생했습니다";
      setError(message);
    } finally {
      setIsLoading(false);
    }
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
        {/* 헤더 */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muji-muted hover:text-muji-text transition-colors mb-8 font-light"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>돌아가기</span>
        </button>

        {/* 제목 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-muji-text mb-2 tracking-tight font-notebook">
            로그인
          </h1>
          <p className="text-muji-muted font-light">
            이메일로 계정에 접속하세요
          </p>
        </div>

        {/* 카드 */}
        <div className="bg-muji-panel rounded-3xl shadow-note p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-light">
                {error}
              </div>
            )}

            {/* 이메일 입력 */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-muji-text mb-2"
              >
                이메일
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border-2 border-muji-line rounded-xl focus:outline-none focus:border-muji-accent transition-colors bg-white text-muji-text placeholder-muji-muted placeholder:font-light"
                required
              />
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-muji-text mb-2"
              >
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border-2 border-muji-line rounded-xl focus:outline-none focus:border-muji-accent transition-colors bg-white text-muji-text placeholder-muji-muted placeholder:font-light"
                required
              />
            </div>

            {/* 비밀번호 찾기 링크 */}
            <div className="flex justify-end">
              <a
                href="/forgot-password"
                className="text-sm text-muji-accent hover:text-muji-text transition-colors font-light"
              >
                비밀번호를 잊으셨나요?
              </a>
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-muji-accent to-muji-muted text-muji-panel rounded-xl py-3 font-semibold transition-all duration-200 hover:shadow-note disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "로그인 중..." : "계속하기"}
            </button>
          </form>

          {/* 회원가입 링크 */}
          <p className="text-center text-sm text-muji-muted mt-6 font-light">
            계정이 없으신가요?{" "}
            <button
              onClick={() => navigate("/signup")}
              className="text-muji-accent hover:text-muji-text font-semibold transition-colors bg-none border-none cursor-pointer p-0"
            >
              가입하기
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
