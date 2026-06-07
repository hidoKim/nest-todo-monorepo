import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { register } from "../api/auth";

const SignupPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 백엔드 RegisterDto가 비밀번호 8자 이상을 요구한다(400 방지).
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다");
      return;
    }

    setIsLoading(true);
    try {
      // register()는 POST /api/auth/register 호출.
      // 성공 시 Set-Cookie로 access_token이 자동 저장되어 곧장 로그인 상태가 된다.
      await register({ email, password, name: name.trim() || undefined });
      navigate("/today", { replace: true });
    } catch (err) {
      // 409: 이미 가입된 이메일 / 400: 유효성 실패 / 그 외: 일반 에러
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const message =
        status === 409
          ? "이미 가입된 이메일입니다"
          : status === 400
            ? "입력값을 확인해주세요 (이메일 형식 / 비밀번호 8자 이상)"
            : err instanceof Error
              ? err.message
              : "회원가입 중 오류가 발생했습니다";
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
          onClick={() => navigate("/login")}
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
            회원가입
          </h1>
          <p className="text-muji-muted font-light">
            이메일로 새 계정을 만드세요
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

            {/* 이름 입력 (선택) */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-muji-text mb-2"
              >
                이름 <span className="text-muji-muted font-light">(선택)</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-4 py-3 border-2 border-muji-line rounded-xl focus:outline-none focus:border-muji-accent transition-colors bg-white text-muji-text placeholder-muji-muted placeholder:font-light"
              />
            </div>

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
                비밀번호{" "}
                <span className="text-muji-muted font-light">(8자 이상)</span>
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border-2 border-muji-line rounded-xl focus:outline-none focus:border-muji-accent transition-colors bg-white text-muji-text placeholder-muji-muted placeholder:font-light"
                minLength={8}
                required
              />
            </div>

            {/* 가입 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-muji-accent to-muji-muted text-muji-panel rounded-xl py-3 font-semibold transition-all duration-200 hover:shadow-note disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "가입 중..." : "가입하기"}
            </button>
          </form>

          {/* 로그인 링크 */}
          <p className="text-center text-sm text-muji-muted mt-6 font-light">
            이미 계정이 있으신가요?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-muji-accent hover:text-muji-text font-semibold transition-colors bg-none border-none cursor-pointer p-0"
            >
              로그인
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
