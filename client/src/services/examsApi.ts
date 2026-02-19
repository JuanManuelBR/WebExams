import axios from "axios";
import { getAuthToken } from "./authToken";

const EXAMS_BASE = import.meta.env.VITE_EXAMS_BASE;

export const examsApi = axios.create({
  baseURL: EXAMS_BASE ? `${EXAMS_BASE}/api/exams` : "/api/exams",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 30000,
});

// Interceptor para manejar FormData
examsApi.interceptors.request.use(
  (config) => {
    // Si es FormData, cambiar el Content-Type
    if (config.data instanceof FormData) {
      config.headers["Content-Type"] = "multipart/form-data";
    }

    // Adjuntar Bearer token para auth cross-domain
    const token = getAuthToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    console.log(
      "📤 [EXAMS] Request:",
      config.method?.toUpperCase(),
      config.url,
    );
    console.log("   🍪 Cookies:", document.cookie);
    return config;
  },
  (error) => {
    console.error("❌ [EXAMS] Request Error:", error);
    return Promise.reject(error);
  },
);

examsApi.interceptors.response.use(
  (response) => {
    console.log("✅ [EXAMS] Response:", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error("❌ [EXAMS] Response Error:", {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });

    // Redirigir a login si es 401 o 403
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log("🚪 Sesión expirada en EXAMS API");
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
