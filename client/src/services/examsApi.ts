import axios from "axios";
import { getAuthToken, setAuthToken, clearAuthToken } from "./authToken";

const EXAMS_BASE = import.meta.env.VITE_EXAMS_BASE;

export const examsApi = axios.create({
  baseURL: EXAMS_BASE ? `${EXAMS_BASE}/api/exams` : "/api/exams",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 30000,
});

// Deduplica refrescos concurrentes: si ya hay uno en curso, todos esperan el mismo
let _refreshPromise: Promise<string | null> | null = null;

async function tryRefreshGoogleToken(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async (): Promise<string | null> => {
    try {
      const usuarioStr = localStorage.getItem("usuario");
      if (!usuarioStr) return null;
      const usuario = JSON.parse(usuarioStr);
      if (usuario.loginMethod !== "google") return null;

      const { getApps, getAuth } = await import("firebase/auth");
      const apps = getApps();
      if (!apps.length) return null;

      const firebaseUser = getAuth(apps[0]).currentUser;
      if (!firebaseUser) return null;

      // Forzar refresco del token de Firebase
      const idToken = await firebaseUser.getIdToken(true);

      const USERS_BASE = import.meta.env.DEV
        ? "/api/users"
        : `${import.meta.env.VITE_USERS_BASE}/api/users`;

      // Llamada directa con axios (no usersApi) para evitar loops en interceptores
      const response = await axios.post(
        `${USERS_BASE}/login-google`,
        { firebaseIdToken: idToken },
        { withCredentials: true },
      );

      if (response.data?.token) {
        setAuthToken(response.data.token);
        return response.data.token;
      }
      return null;
    } catch {
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// Interceptor para manejar FormData y adjuntar Bearer token
examsApi.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      config.headers["Content-Type"] = "multipart/form-data";
    }

    const token = getAuthToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error("❌ [EXAMS] Request Error:", error);
    return Promise.reject(error);
  },
);

examsApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error("❌ [EXAMS] Response Error:", {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });

    if (error.response?.status === 401 || error.response?.status === 403) {
      // Intentar refrescar token de Google antes de cerrar sesión
      if (!(error.config as any)?._retry) {
        const newToken = await tryRefreshGoogleToken();
        if (newToken) {
          (error.config as any)._retry = true;
          error.config.headers["Authorization"] = `Bearer ${newToken}`;
          return examsApi(error.config);
        }
      }

      // No se pudo refrescar — cerrar sesión
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
