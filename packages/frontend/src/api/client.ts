import axios from "axios";

// 배포(Vercel)에서는 vercel.json rewrites로 /api·/todos·/tags를 백엔드로 프록시한다.
// baseURL을 비워 same-origin 상대경로로 요청하면 응답 쿠키가 vercel.app(=first-party)에
// 저장되어 서드파티 쿠키 차단을 우회한다.
// 로컬 개발은 packages/frontend/.env의 REACT_APP_API_BASE_URL=http://localhost:3000을 사용.
const baseURL = process.env.REACT_APP_API_BASE_URL ?? "";

// withCredentials: true → 모든 요청에 자동으로 쿠키 동봉.
// 백엔드가 httpOnly 쿠키로 access_token을 발급하므로 JS에서 토큰을 다룰 일이 없다.
// (이전 Bearer 방식의 Authorization 헤더 인터셉터는 제거됐다.)
export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// 응답 인터셉터: 401 처리.
// 만료/누락 쿠키일 때 axios 호출 지점에서 직접 다루지 않아도 자동으로 온보딩으로 이동.
// 단, /api/auth/me 호출 자체의 401은 ProtectedRoute가 자체 분기에서 처리하므로
// 무한 리다이렉트를 막기 위해 여기서는 그 경로만 예외.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? "";
    if (status === 401 && !url.includes("/api/auth/me")) {
      window.location.href = "/onboarding";
    }
    return Promise.reject(error);
  },
);
