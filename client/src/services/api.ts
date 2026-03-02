import axios from "axios";
import { clearAuthToken } from "./authToken";

// Detecta automático: dev = proxy, prod = Railway
const isDev = import.meta.env.DEV;

const USERS_BASE = isDev
  ? "/api/users" // Proxy Vite local
  : `${import.meta.env.VITE_USERS_BASE}/api/users`;

export const usersApi = axios.create({
  baseURL: USERS_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000,
});

const ATTEMPTS_BASE = import.meta.env.VITE_ATTEMPTS_BASE;

export const examsAttemptsApi = axios.create({
  baseURL: ATTEMPTS_BASE ? `${ATTEMPTS_BASE}/api/exam` : "/api/exam",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000,
});

// Interceptores globales
[usersApi, examsAttemptsApi].forEach((api) => {
  api.interceptors.request.use(
    (config) => config,
    (error) => {
      console.error("❌ Request Error:", error);
      return Promise.reject(error);
    },
  );

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error(
        "❌ Response Error:",
        error.response?.status,
        error.config?.url,
      );

      if (error.response?.status === 401 || error.response?.status === 403) {
        clearAuthToken();
        localStorage.removeItem("usuario");

        const currentPath = window.location.pathname;
        if (
          !currentPath.includes("/login") &&
          !currentPath.includes("/register")
        ) {
          window.location.href = "/login";
        }
      }

      return Promise.reject(error);
    },
  );
});
