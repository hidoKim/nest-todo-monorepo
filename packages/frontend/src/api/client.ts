import axios from "axios";

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
