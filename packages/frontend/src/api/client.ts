import axios from "axios";
import { getAuthToken } from "../utils/auth";

const baseURL = process.env.REACT_APP_API_BASE_URL;

if (!baseURL) {
  throw new Error(
    "REACT_APP_API_BASE_URL is not defined. Set it in packages/frontend/.env (dev) or .env.production / CI env (build).",
  );
}

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 요청 인터셉터: 모든 요청에 인증 토큰 추가
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * 응답 인터셉터: 401 에러 처리
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰이 만료되었거나 유효하지 않은 경우
      localStorage.removeItem("authToken");
      window.location.href = "/onboarding";
    }
    return Promise.reject(error);
  },
);
